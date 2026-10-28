/**
 * Bundled `formula-verify` skill provider.
 *
 * The skill body is a static asset; `{{RESOURCE_DIR}}` is replaced with the
 * absolute assets directory so the agent can call the bundled CLI from any
 * working directory.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const PROVIDER_NAME = "formula-verify";
const SKILL_BODY_URL = new URL("../assets/formula-verify.md", import.meta.url);
const RESOURCE_PATH = fileURLToPath(new URL("../assets/", import.meta.url)).replace(/[\\/]+$/, "");
const RESOURCE_BASE = {
  kind: "directory",
  path: RESOURCE_PATH
};
const CANDIDATE = {
  name: "formula-verify",
  description:
    "Verify paper formulas, identities, derivations, limits and logical claims by turning them into executable SymPy checks and reusable formula cards. Use when the user asks whether a formula or derivation is correct, wants to check an integral/derivative/limit, wants a paper's math made reproducible, or hands over a TeX/PDF paper to extract and verify. Extracts cards from TeX, Markdown or PDF, optionally converting PDFs with Mathpix or an external command, and writes a section-grouped report.",
  invocation: { modelInvocable: true, userInvocable: true },
  provider: PROVIDER_NAME,
  source: "bundled",
  resourceBase: RESOURCE_BASE,
  rank: 600,
  locator: SKILL_BODY_URL
};

const provider = {
  name: PROVIDER_NAME,
  list: () => Promise.resolve([CANDIDATE]),
  async get(_candidate) {
    const body = await readFile(SKILL_BODY_URL, "utf8");
    return {
      name: CANDIDATE.name,
      description: CANDIDATE.description,
      invocation: CANDIDATE.invocation,
      provider: CANDIDATE.provider,
      source: CANDIDATE.source,
      resourceBase: RESOURCE_BASE,
      content: body.replaceAll("{{RESOURCE_DIR}}", RESOURCE_PATH)
    };
  }
};

export const name = "formula-verify";
export const inject = ["skills"];

export function apply(ctx) {
  ctx.skills.registerProvider(() => provider);
}
