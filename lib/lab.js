/**
 * Host half of the Formula Lab panel.
 *
 * The panel is a normal client plugin; this module owns the route it calls.
 * The route is protected by a per-process token injected into the DSH index,
 * so a random local page cannot invoke the Python CLI.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const SCRIPT = fileURLToPath(new URL("../assets/scripts/formula_check.py", import.meta.url));
const PREFIX = "/formula-lab";
const TOKEN = randomBytes(18).toString("hex");
const PAPER_EXTENSIONS = /\.(tex|pdf|md|markdown|mmd)$/i;
const SKIP_DIRECTORIES = new Set(["node_modules", ".git", ".dsh", "out", "dist", "build", ".venv", "venv", "formulas"]);

export const LAB_TOKEN = TOKEN;

function cors(res) {
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("access-control-allow-headers", "content-type, x-formula-lab-token");
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("cache-control", "no-store");
}

function send(res, status, payload) {
  cors(res);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function authorized(req) {
  const actual = req.headers["x-formula-lab-token"];
  if (typeof actual !== "string" || actual.length !== TOKEN.length) return false;
  try {
    return timingSafeEqual(Buffer.from(actual), Buffer.from(TOKEN));
  } catch {
    return false;
  }
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let bytes = 0;
    req.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes > 1024 * 1024) {
        reject(new Error("request body is too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function listFiles(root) {
  const found = [];
  async function walk(directory, depth) {
    if (depth < 0) return;
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") || SKIP_DIRECTORIES.has(entry.name)) continue;
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(full, depth - 1);
      } else if (PAPER_EXTENSIONS.test(entry.name)) {
        try {
          const info = await stat(full);
          found.push({ path: path.relative(root, full).split(path.sep).join("/"), size: info.size });
        } catch {
          /* ignore an entry that disappeared during the walk */
        }
      }
    }
  }
  await walk(root, 4);
  found.sort((left, right) => left.path.localeCompare(right.path));
  return found;
}

async function readReport(directory) {
  const report = {};
  try {
    report.json = JSON.parse(await readFile(path.join(directory, "report.json"), "utf8"));
  } catch {
    /* not generated yet */
  }
  try {
    report.markdown = await readFile(path.join(directory, "report.md"), "utf8");
  } catch {
    /* not generated yet */
  }
  return report;
}

function pythonCommand() {
  return process.env.DSH_FORMULA_PYTHON || "python3";
}

async function runCli(args, cwd) {
  try {
    const { stdout, stderr } = await execFileAsync(pythonCommand(), [SCRIPT, ...args], {
      cwd,
      timeout: 15 * 60 * 1000,
      maxBuffer: 20 * 1024 * 1024,
      env: process.env
    });
    let result;
    try {
      result = JSON.parse(stdout);
    } catch {
      result = { ok: false, error: "formula CLI did not return JSON", stdout: stdout.slice(0, 4000) };
    }
    return { result, stderr: stderr.slice(0, 4000) };
  } catch (error) {
    return {
      result: { ok: false, error: error instanceof Error ? error.message : String(error) },
      stderr: error && typeof error === "object" && "stderr" in error ? String(error.stderr).slice(0, 4000) : ""
    };
  }
}

async function handleRun(req, res) {
  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (error) {
    send(res, 400, { ok: false, error: `bad request: ${error instanceof Error ? error.message : String(error)}` });
    return;
  }
  const root = path.resolve(String(body.cwd || ""));
  try {
    if (!(await stat(root)).isDirectory()) throw new Error("cwd is not a directory");
  } catch {
    send(res, 400, { ok: false, error: `cwd is not a directory: ${root}` });
    return;
  }
  const outDir = path.resolve(root, String(body.out || "formulas"));
  if (!inside(root, outDir)) {
    send(res, 400, { ok: false, error: "output directory must stay inside the workspace" });
    return;
  }
  const action = String(body.action || "pipeline");
  const max = Number.isSafeInteger(body.max) ? Math.max(1, Math.min(200, body.max)) : 80;
  const noProbe = body.noProbe === true;
  if (action === "report") {
    await mkdir(outDir, { recursive: true });
    const { result, stderr } = await runCli(["paper", "report", "--dir", outDir, "--json"], root);
    send(res, result.ok ? 200 : 400, { ...result, report: await readReport(outDir), stderr });
    return;
  }

  const input = String(body.input || "");
  const inputPath = path.resolve(root, input);
  if (!inside(root, inputPath)) {
    send(res, 400, { ok: false, error: "input must stay inside the workspace" });
    return;
  }
  try {
    if (!(await stat(inputPath)).isFile()) throw new Error("not a file");
  } catch {
    send(res, 400, { ok: false, error: `input file not found: ${inputPath}` });
    return;
  }
  await mkdir(outDir, { recursive: true });

  const backend = String(body.backend || "none");
  let extractInput = inputPath;
  if (action === "pipeline" && inputPath.toLowerCase().endsWith(".pdf") && backend !== "none") {
    const converted = path.join(outDir, "paper.md");
    const convertArgs = ["paper", "convert", "--input", inputPath, "--out", converted, "--backend", backend, "--json"];
    if (backend === "command") convertArgs.push("--command", String(body.command || ""));
    const convertedResult = await runCli(convertArgs, root);
    if (!convertedResult.result.ok) {
      send(res, 400, { ...convertedResult.result, stderr: convertedResult.stderr });
      return;
    }
    extractInput = converted;
  }

  const args = ["paper", "extract", "--input", extractInput, "--out", outDir, "--max", String(max), "--json"];
  if (noProbe) args.push("--no-probe");
  const { result, stderr } = await runCli(args, root);
  send(res, result.ok ? 200 : 400, { ...result, report: await readReport(outDir), stderr });
}

async function handle(req, res) {
  cors(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (!authorized(req)) {
    send(res, 401, { ok: false, error: "missing or invalid formula-lab token" });
    return;
  }
  const url = new URL(req.url || "/", "http://formula-lab.invalid");
  const route = url.pathname.startsWith(PREFIX) ? url.pathname.slice(PREFIX.length) : url.pathname;
  try {
    if (route === "/files" && req.method === "GET") {
      const root = path.resolve(url.searchParams.get("cwd") || "");
      if (!(await stat(root)).isDirectory()) {
        send(res, 400, { ok: false, error: "cwd is not a directory" });
        return;
      }
      send(res, 200, { ok: true, files: await listFiles(root) });
      return;
    }
    if (route === "/run" && req.method === "POST") {
      await handleRun(req, res);
      return;
    }
    send(res, 404, { ok: false, error: "unknown formula-lab route" });
  } catch (error) {
    send(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

/** Mount the panel's route and the index token on the composed Web server. */
export function installLab(ctx) {
  if (typeof ctx.inject !== "function") return;
  ctx.inject(["webServer"], (child) => {
    child.effect(
      () =>
        child.on("webserver/index-inject", (rows) => {
          let origin = "";
          try {
            origin = child.webServer.getOrigin();
          } catch {
            /* listener not bound yet; the relative endpoint still works over HTTP */
          }
          rows.push({
            kind: "global",
            name: "__FORMULA_LAB__",
            value: { token: TOKEN, endpoint: PREFIX, origin }
          });
        }),
      "formula-lab: token injection"
    );
    child.effect(
      () => child.webServer.register({ kind: "prefix", path: PREFIX, handler: (req, res) => handle(req, res) }),
      "formula-lab: routes"
    );
  });
}
