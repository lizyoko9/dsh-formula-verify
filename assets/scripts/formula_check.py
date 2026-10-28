#!/usr/bin/env python3
"""Formula verification CLI for DeepSeek Harness.

The first run creates a private virtual environment under ``$DSH_HOME`` and
installs SymPy + latex2sympy2 there. Nothing is written to the project or to
the DSH runtime; later runs reuse the cache.

Examples:
  formula_check.py check --lhs '\\sin(x)^2+\\cos(x)^2' --rhs '1' --json
  formula_check.py check --expr '(x+1)^2 - (x^2+2*x+1)' --json
  formula_check.py diff --expr 'x^3' --var x --json
  formula_check.py integrate --expr 'x^2' --var x --lower 0 --upper 1 --json
  formula_check.py eval --expr '\\sqrt{x}' --values 'x=2' --digits 30 --json
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

DSH_HOME = Path(os.environ.get("DSH_HOME", Path.home() / ".dsh"))
CACHE = DSH_HOME / "formula-verify"
VENV = CACHE / "venv"
RUNTIME = VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")


# ---------------------------------------------------------------------------
# bootstrap


def ensure_runtime() -> None:
    """Re-exec inside a venv that has SymPy, creating it on first use."""
    if os.environ.get("FORMULA_VERIFY_READY") == "1":
        return
    try:
        import sympy  # noqa: F401
        return
    except Exception:
        pass

    if not RUNTIME.exists():
        print(
            "formula-verify: first run, creating a private SymPy environment "
            f"at {VENV} (about a minute)...",
            file=sys.stderr,
        )
        try:
            VENV.parent.mkdir(parents=True, exist_ok=True)
            subprocess.check_call([sys.executable, "-m", "venv", str(VENV)])
            subprocess.check_call(
                [
                    str(RUNTIME),
                    "-m",
                    "pip",
                    "install",
                    "--quiet",
                    "--disable-pip-version-check",
                    "--no-input",
                    "sympy",
                    "latex2sympy2",
                    "pytest",
                    "pypdf",
                ]
            )
        except Exception as error:
            print(
                "formula-verify: could not prepare SymPy. "
                "Install it manually with:\n"
                f"  {sys.executable} -m pip install sympy latex2sympy2\n"
                f"error: {error}",
                file=sys.stderr,
            )
            raise SystemExit(2)

    env = dict(os.environ)
    env["FORMULA_VERIFY_READY"] = "1"
    os.execve(str(RUNTIME), [str(RUNTIME), __file__, *sys.argv[1:]], env)


# ---------------------------------------------------------------------------
# parsing


def _latex_fallback(text: str) -> str:
    """Best-effort LaTeX -> Python for the cases latex2sympy2 rejects."""
    value = text.strip().strip("$")
    value = re.sub(r"\\(left|right|,|!|;|:|quad|qquad|displaystyle)", "", value)
    value = re.sub(r"\\(cdot|times)", "*", value)
    value = re.sub(r"\\pi\b", "pi", value)
    value = re.sub(r"\\infty\b", "oo", value)
    value = re.sub(r"\\sqrt\{([^{}]+)\}", r"sqrt(\1)", value)
    # nested \frac{a}{b} is handled one level at a time
    frac = re.compile(r"\\frac\{([^{}]*)\}\{([^{}]*)\}")
    while frac.search(value):
        value = frac.sub(r"((\1)/(\2))", value)
    value = re.sub(r"\\(alpha|beta|gamma|delta|theta|lambda|mu|sigma|phi|omega|tau|rho|eta|chi|psi|epsilon|zeta|kappa|nu|xi)\b", r"\1", value)
    value = value.replace("^", "**")
    value = value.replace("{", "(").replace("}", ")")
    return value


def parse_expression(text: str, assumptions: dict[str, dict] | None = None):
    import sympy as sp
    from sympy.parsing.sympy_parser import (
        implicit_multiplication_application,
        parse_expr,
        standard_transformations,
    )

    raw = text.strip().strip("$")
    expression = None
    if "\\" in raw or (raw.count("{") and raw.count("}")):
        try:
            from latex2sympy2 import latex2sympy

            expression = latex2sympy(raw)
        except Exception:
            expression = None
    if expression is None:
        transformations = standard_transformations + (implicit_multiplication_application,)
        try:
            expression = parse_expr(raw, transformations=transformations, evaluate=True)
        except Exception:
            try:
                expression = parse_expr(_latex_fallback(raw), transformations=transformations, evaluate=True)
            except Exception as error:
                raise SystemExit(f"formula-verify: cannot parse {text!r}: {error}")

    # SymPy's E is exp(1); a lone uppercase E in a paper is usually energy.
    try:
        import sympy as sp

        if expression.has(sp.E):
            expression = expression.subs(sp.E, sp.Symbol("E", real=True))
    except Exception:
        pass

    if assumptions:
        for symbol in list(expression.free_symbols):
            facts = assumptions.get(symbol.name)
            if facts:
                expression = expression.subs(symbol, sp.Symbol(symbol.name, **facts))
    return expression


def parse_assumptions(text: str) -> tuple[dict[str, dict], list[str]]:
    mapping: dict[str, dict] = {}
    notes: list[str] = []
    if not text:
        return mapping, notes
    for part in re.split(r",|\band\b", text):
        item = part.strip()
        if not item:
            continue
        relation = re.match(r"^([A-Za-z_]\w*)\s*(>=|<=|!=|>|<)\s*(0|zero)$", item)
        if relation:
            name, operator = relation.group(1), relation.group(2)
            fact = {
                ">": "positive",
                ">=": "nonnegative",
                "<": "negative",
                "<=": "nonpositive",
                "!=": "nonzero",
            }[operator]
            mapping.setdefault(name, {})[fact] = True
            continue
        kind = re.match(r"^([A-Za-z_]\w*)\s+(real|integer|positive|negative|nonzero|nonnegative|nonpositive)$", item, re.I)
        if kind:
            mapping.setdefault(kind.group(1), {})[kind.group(2).lower()] = True
            continue
        notes.append(f"ignored assumption: {item}")
    return mapping, notes


def parse_number(text: str):
    import sympy as sp

    item = text.strip()
    if item in ("oo", "+oo", "inf", "+inf"):
        return sp.oo
    if item in ("-oo", "-inf"):
        return -sp.oo
    return parse_expression(item)


# ---------------------------------------------------------------------------
# checks


SAMPLE_POSITIVE = (0.7, 1.3, 2.1, 3.4, 5.2)
SAMPLE_REAL = (-2.3, -0.7, 0.4, 1.9, 3.1)


def numeric_check(lhs, rhs, assumptions: dict[str, dict], samples: int):
    import sympy as sp

    symbols = sorted(lhs.free_symbols | rhs.free_symbols, key=lambda item: item.name)
    points: list[dict] = []
    for index in range(max(1, samples)):
        point = {}
        for symbol in symbols:
            facts = assumptions.get(symbol.name, {})
            pool = SAMPLE_REAL if facts.get("real") and not (facts.get("positive") or facts.get("nonnegative")) else SAMPLE_POSITIVE
            point[symbol] = sp.Float(pool[index % len(pool)])
        points.append(point)

    rows = []
    worst = 0.0
    passed = True
    for point in points:
        try:
            left = sp.N(lhs.subs(point), 40)
            right = sp.N(rhs.subs(point), 40)
            left_complex = complex(left)
            right_complex = complex(right)
        except Exception as error:
            rows.append({"point": {str(k): str(v) for k, v in point.items()}, "error": str(error)})
            continue
        if abs(left_complex.imag) > 1e-10 or abs(right_complex.imag) > 1e-10:
            rows.append({"point": {str(k): str(v) for k, v in point.items()}, "error": "non-real value"})
            continue
        scale = max(1.0, abs(left_complex), abs(right_complex))
        error = abs(left_complex - right_complex) / scale
        worst = max(worst, error)
        row = {
            "point": {str(k): float(sp.N(v, 15)) for k, v in point.items()},
            "lhs": str(sp.N(left, 15)),
            "rhs": str(sp.N(right, 15)),
            "relative_error": error,
        }
        rows.append(row)
        if error > 1e-9:
            passed = False

    evaluated = [row for row in rows if "relative_error" in row]
    if not evaluated:
        passed = False
    return {
        "passed": passed,
        "samples": len(evaluated),
        "max_relative_error": worst,
        "tolerance": 1e-9,
        "rows": rows,
    }


def symbolic_check(lhs, rhs):
    import sympy as sp

    difference = lhs - rhs
    methods = [
        ("simplify", lambda value: sp.simplify(value)),
        ("trigsimp", lambda value: sp.trigsimp(value)),
        ("expand", lambda value: sp.expand(value)),
        ("factor", lambda value: sp.factor(value)),
        ("cancel", lambda value: sp.cancel(value)),
        ("radsimp", lambda value: sp.radsimp(value)),
    ]
    for name, method in methods:
        try:
            candidate = method(difference)
        except Exception:
            continue
        if candidate == 0:
            return {"zero": True, "method": name, "difference": "0"}
        difference = candidate
    return {"zero": False, "method": None, "difference": str(difference)}


def check(args):
    if args.lhs is None and args.expr is None:
        return {"ok": False, "error": "give --lhs/--rhs or --expr"}, 2
    assumptions, notes = parse_assumptions(args.assumptions)
    lhs = parse_expression(args.lhs if args.lhs is not None else args.expr, assumptions)
    rhs = parse_expression(args.rhs if args.rhs is not None else "0", assumptions)

    symbolic = symbolic_check(lhs, rhs)
    numeric = numeric_check(lhs, rhs, assumptions, args.samples)
    if symbolic["zero"]:
        verdict = "symbolic"
    elif numeric["passed"]:
        verdict = "numeric"
    else:
        verdict = "failed"

    result = {
        "ok": verdict != "failed",
        "verdict": verdict,
        "lhs": str(lhs),
        "rhs": str(rhs),
        "difference": symbolic["difference"],
        "symbolic": symbolic,
        "numeric": numeric,
        "assumptions": assumptions,
        "assumption_notes": notes,
    }
    return result, 0 if result["ok"] else 1


# ---------------------------------------------------------------------------
# other commands


def resolve_symbol(expression, name):
    import sympy as sp

    for symbol in expression.free_symbols:
        if symbol.name == name:
            return symbol
    return sp.Symbol(name, real=True)


def command_diff(args):
    expression = parse_expression(args.expr, parse_assumptions(args.assumptions)[0])
    symbol = resolve_symbol(expression, args.var)
    result = {
        "ok": True,
        "expression": str(expression),
        "variable": str(symbol),
        "order": args.order,
        "result": str(__import__("sympy").diff(expression, symbol, args.order)),
    }
    result["latex"] = __import__("sympy").latex(__import__("sympy").sympify(result["result"]))
    return result, 0


def command_integrate(args):
    import sympy as sp

    expression = parse_expression(args.expr, parse_assumptions(args.assumptions)[0])
    symbol = resolve_symbol(expression, args.var)
    if args.lower is None and args.upper is None:
        integrated = sp.integrate(expression, symbol)
    elif args.lower is not None and args.upper is not None:
        integrated = sp.integrate(expression, (symbol, parse_number(args.lower), parse_number(args.upper)))
    else:
        return {"ok": False, "error": "give both --lower and --upper, or neither"}, 2
    return {
        "ok": True,
        "expression": str(expression),
        "variable": str(symbol),
        "result": str(integrated),
        "latex": sp.latex(integrated),
    }, 0


def command_eval(args):
    import sympy as sp

    expression = parse_expression(args.expr, parse_assumptions(args.assumptions)[0])
    values = {}
    symbols = {symbol.name: symbol for symbol in expression.free_symbols}
    for part in args.values.split(","):
        if not part.strip():
            continue
        name, _, raw = part.partition("=")
        key = name.strip()
        values[symbols.get(key, sp.Symbol(key, real=True))] = parse_number(raw.strip())
    result = sp.N(expression.subs(values), args.digits)
    return {"ok": True, "expression": str(expression), "values": {str(k): str(v) for k, v in values.items()}, "result": str(result)}, 0


def command_simplify(args):
    import sympy as sp

    expression = parse_expression(args.expr, parse_assumptions(args.assumptions)[0])
    result = sp.simplify(expression)
    return {"ok": True, "expression": str(expression), "result": str(result), "latex": sp.latex(result)}, 0


def command_latex(args):
    import sympy as sp

    expression = parse_expression(args.expr, parse_assumptions(args.assumptions)[0])
    return {"ok": True, "expression": str(expression), "latex": sp.latex(expression)}, 0


def command_test(args):
    """Run pytest inside the private environment that has SymPy."""
    import pytest

    argv = [args.path, "-q", *args.pytest_args]
    code = pytest.main(argv)
    return {"ok": code == 0, "path": args.path, "exit_code": int(code), "pytest_args": args.pytest_args}, 0 if code == 0 else 1


# ---------------------------------------------------------------------------
# paper extraction


TEX_ENVIRONMENTS = (
    "equation",
    "equation*",
    "align",
    "align*",
    "gather",
    "gather*",
    "multline",
    "multline*",
    "eqnarray",
    "eqnarray*",
    "displaymath",
)
TEX_MULTI_ROW = {"align", "align*", "gather", "gather*", "eqnarray", "eqnarray*"}


def strip_tex_comments(text: str) -> str:
    lines = []
    for line in text.splitlines():
        chunk = []
        for index, char in enumerate(line):
            if char == "%" and (index == 0 or line[index - 1] != "\\"):
                break
            chunk.append(char)
        lines.append("".join(chunk))
    return "\n".join(lines)


def clean_tex_fragment(value: str) -> str:
    value = re.sub(r"\\(label|nonumber|notag)\{[^}]*\}", "", value)
    value = value.replace("&", " ").replace("\\\\", " ")
    value = re.sub(r"\\(tag|intertext)\{[^}]*\}", "", value)
    value = re.sub(r"\\q?quad\b", " ", value)
    return re.sub(r"\s+", " ", value).strip()


def section_at(sections, position: int) -> str:
    current = ""
    for start, name in sections:
        if start <= position:
            current = name
        else:
            break
    return current


def context_at(text: str, start: int, end: int) -> str:
    snippet = text[max(0, start - 400):start] + " " + text[end:end + 180]
    snippet = re.sub(r"\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^{}]*\})?", " ", snippet)
    snippet = re.sub(r"\s+", " ", snippet)
    return snippet.strip()[:500]


def make_identifier(label: str, index: int, used: set) -> str:
    identifier = f"eq-{index:03d}"
    if label:
        cleaned = re.sub(r"^eq[:.-]+", "", label.strip())
        cleaned = re.sub(r"[^A-Za-z0-9_.-]+", "-", cleaned).strip("-")
        if cleaned:
            identifier = f"eq-{cleaned}"
    candidate = identifier
    suffix = 2
    while candidate in used:
        candidate = f"{identifier}-{suffix}"
        suffix += 1
    used.add(candidate)
    return candidate


def tex_rows(body: str, environment: str):
    if environment in TEX_MULTI_ROW:
        body = re.sub(r"\\\\\s*\[[^\]]*\]", "\n", body)
        body = body.replace("\\\\", "\n")
        return [row for row in body.splitlines() if row.strip()]
    return [body]


def extract_tex_items(path: Path):
    raw = path.read_text(errors="replace")
    text = strip_tex_comments(raw)
    sections = [(match.start(), match.group(1).strip()) for match in re.finditer(r"\\section\*?\{([^{}]*)\}", text)]
    found = []
    env_pattern = re.compile(
        r"\\begin\{(" + "|".join(re.escape(item) for item in TEX_ENVIRONMENTS) + r")\}(.*?)\\end\{\1\}",
        re.S,
    )
    for match in env_pattern.finditer(text):
        environment = match.group(1)
        body = match.group(2)
        for row in tex_rows(body, environment):
            label_match = re.search(r"\\label\{([^}]*)\}", row)
            label = label_match.group(1) if label_match else ""
            latex = clean_tex_fragment(row)
            if not latex:
                continue
            found.append({
                "pos": match.start(),
                "latex": latex,
                "label": label,
                "kind": environment,
                "section": section_at(sections, match.start()),
                "source_line": text[:match.start()].count("\n") + 1,
                "context": context_at(text, match.start(), match.end()),
            })
    for pattern in (re.compile(r"\$\$(.+?)\$\$", re.S), re.compile(r"\\\[(.+?)\\\]", re.S)):
        for match in pattern.finditer(text):
            latex = clean_tex_fragment(match.group(1))
            if not latex:
                continue
            found.append({
                "pos": match.start(),
                "latex": latex,
                "label": "",
                "kind": "display-math",
                "section": section_at(sections, match.start()),
                "source_line": text[:match.start()].count("\n") + 1,
                "context": context_at(text, match.start(), match.end()),
            })
    found.sort(key=lambda item: item["pos"])
    return found


def looks_like_pdf_equation(line: str) -> bool:
    if "=" not in line or len(line) < 8 or len(line) > 300:
        return False
    if line.count(" ") > len(line) * 0.55:
        return False
    math_hint = "∫∑√±×·≤≥≠≈∞^_αβγθλμσπΔ∂∇"
    return any(char in line for char in math_hint) or bool(re.search(r"\d", line))


def extract_pdf_items(path: Path):
    try:
        from pypdf import PdfReader
    except Exception as error:
        raise SystemExit(f"formula-verify: PDF support needs pypdf: {error}")
    reader = PdfReader(str(path))
    found = []
    for page_number, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        lines = [line.strip() for line in text.splitlines()]
        for index, line in enumerate(lines):
            if not looks_like_pdf_equation(line):
                continue
            context = " ".join(lines[max(0, index - 2):index + 3])
            found.append({
                "pos": page_number,
                "latex": line,
                "label": "",
                "kind": "pdf-line",
                "section": f"PDF page {page_number}",
                "source_line": page_number,
                "context": re.sub(r"\s+", " ", context)[:500],
            })
    return found


def split_equation(latex: str):
    text = re.sub(r"\\(label|nonumber|notag)\{[^}]*\}", "", latex)
    text = text.replace("&", " ").replace("\\\\", " ")
    depth = 0
    positions = []
    for index, char in enumerate(text):
        if char in "({[":
            depth += 1
        elif char in ")}]":
            depth = max(0, depth - 1)
        elif char == "=" and depth == 0:
            previous = text[index - 1] if index else ""
            following = text[index + 1] if index + 1 < len(text) else ""
            if previous in "<>!:=" or following == "=":
                continue
            positions.append(index)
    if len(positions) != 1:
        return None
    return text[:positions[0]].strip(), text[positions[0] + 1:].strip()


def probe_equation(latex: str):
    import sympy as sp

    parts = split_equation(latex)
    if parts is None:
        return {"status": "needs-modeling", "reason": "not a single top-level equality"}
    lhs_text, rhs_text = parts
    try:
        lhs = parse_expression(lhs_text)
        rhs = parse_expression(rhs_text)
    except SystemExit as error:
        return {"status": "unparsed", "reason": str(error)}
    except Exception as error:
        return {"status": "unparsed", "reason": str(error)}
    if lhs.is_Symbol or lhs.is_Function:
        return {"status": "definition", "lhs": str(lhs), "rhs": str(rhs)}
    try:
        symbolic = symbolic_check(lhs, rhs)
        numeric = numeric_check(lhs, rhs, {}, 3)
    except Exception as error:
        return {"status": "probe-failed", "error": str(error)}
    if symbolic["zero"]:
        status = "verified-symbolic"
    elif numeric["passed"]:
        status = "numeric-evidence"
    else:
        status = "probe-failed"
    return {
        "status": status,
        "lhs": str(lhs),
        "rhs": str(rhs),
        "symbolic": symbolic,
        "numeric": {
            "passed": numeric["passed"],
            "samples": numeric["samples"],
            "max_relative_error": numeric["max_relative_error"],
        },
    }


def yaml_string(value: str) -> str:
    return json.dumps(str(value), ensure_ascii=False)


def write_card(directory: Path, item: dict) -> None:
    probe = item.get("probe")
    probe_block = ""
    if probe:
        probe_block = (
            f"**Auto probe.** `{probe.get('status', 'unknown')}`\n\n"
            "```json\n" + json.dumps(probe, ensure_ascii=False, indent=2, default=str) + "\n```\n\n"
        )
    card = f"""---
id: {yaml_string(item['id'])}
title: {yaml_string(item['title'])}
source: {yaml_string(item['source'])}
section: {yaml_string(item['section'])}
kind: {yaml_string(item['kind'])}
status: {yaml_string(item['status'])}
---

## {item['title']}

Source: `{item['source']}` · {item['section']}

~~~latex
{item['latex']}
~~~

**Context.** {item['context'] or '(none extracted)'}

{probe_block}**Checks** (TODO)

- [ ] symbols, domains and units
- [ ] symbolic equivalence
- [ ] numeric samples and edge cases
- [ ] what remains unproven
"""
    (directory / f"{item['id']}.md").write_text(card)
    stub = (
        f'"""Auto-extracted from {item["source"]}. Fill in the model before relying on it."""\n\n'
        "import pytest\nimport sympy as sp\n\n"
        "# TODO: define symbols with domains, then model the equation in the card.\n\n\n"
        "def test_identity():\n"
        f'    pytest.skip("TODO: model {item["id"]}")\n'
    )
    module_name = re.sub(r"[^A-Za-z0-9_]", "_", item["id"])
    (directory / f"test_{module_name}.py").write_text(stub)


def read_card_fields(path: Path) -> dict:
    text = path.read_text(errors="replace")
    match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not match:
        return {}
    fields = {}
    for line in match.group(1).splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        value = value.strip()
        try:
            fields[key.strip()] = json.loads(value)
        except Exception:
            fields[key.strip()] = value.strip('"')
    return fields


def write_index(directory: Path, items: list) -> None:
    rows = ["# Formula index", "", "| ID | Section | Source | Status |", "|---|---|---|---|"]
    for item in items:
        rows.append(
            f"| [{item['id']}]({item['id']}.md) | {item['section'] or '-'} | `{item['source']}` | `{item['status']}` |"
        )
    (directory / "index.md").write_text("\n".join(rows) + "\n")


def write_report(directory: Path) -> dict:
    cards = [(path, read_card_fields(path)) for path in sorted(directory.glob("eq-*.md"))]
    counts = {}
    rows = ["# Formula verification report", "", f"Cards: {len(cards)}", "", "| ID | Status | Section | Source |", "|---|---|---|---|"]
    for path, fields in cards:
        status = fields.get("status", "unknown")
        counts[status] = counts.get(status, 0) + 1
        rows.append(
            f"| [{fields.get('id', path.stem)}]({path.name}) | `{status}` | {fields.get('section', '-')} | `{fields.get('source', '-')}` |"
        )
    summary = ", ".join(f"{key}: {value}" for key, value in sorted(counts.items())) or "no cards"
    rows.insert(3, f"Statuses: {summary}")
    if any(fields.get("kind") == "pdf-line" for _, fields in cards):
        rows.insert(4, "> PDF extraction is lossy: convert each candidate to LaTeX before relying on it.")
    (directory / "report.md").write_text("\n".join(rows) + "\n")
    return {"cards": len(cards), "statuses": counts}


def command_paper(args):
    if args.action == "extract":
        source = Path(args.input)
        if not source.exists():
            return {"ok": False, "error": f"input not found: {source}"}, 2
        suffix = source.suffix.lower()
        if suffix == ".tex":
            raw_items = extract_tex_items(source)
        elif suffix == ".pdf":
            raw_items = extract_pdf_items(source)
        else:
            return {"ok": False, "error": "input must be .tex or .pdf"}, 2
        raw_items = raw_items[: args.max]
        directory = Path(args.out)
        directory.mkdir(parents=True, exist_ok=True)
        used = set()
        items = []
        for index, raw in enumerate(raw_items, start=1):
            identifier = make_identifier(raw.get("label", ""), index, used)
            item = {
                **raw,
                "id": identifier,
                "title": f"Eq. {index}" + (f" ({raw['label']})" if raw.get("label") else ""),
                "source": f"{source.name}:{raw.get('source_line', '?')}",
                "status": "extracted" if suffix == ".tex" else "needs-latex",
            }
            if suffix == ".tex" and not args.no_probe:
                item["probe"] = probe_equation(item["latex"])
                item["status"] = item["probe"].get("status", "extracted")
            write_card(directory, item)
            items.append(item)
        write_index(directory, items)
        report = write_report(directory)
        return {
            "ok": True,
            "input": str(source),
            "out": str(directory),
            "equations": len(items),
            "report": report,
        }, 0

    if args.action == "report":
        directory = Path(args.dir)
        if not directory.exists():
            return {"ok": False, "error": f"directory not found: {directory}"}, 2
        report = write_report(directory)
        return {"ok": True, "dir": str(directory), **report}, 0

    return {"ok": False, "error": "paper needs an extract or report action"}, 2


# ---------------------------------------------------------------------------
# CLI


def build_parser():
    parser = argparse.ArgumentParser(description="Verify paper formulas with SymPy")
    sub = parser.add_subparsers(dest="command")

    setup = sub.add_parser("setup", help="prepare the private SymPy environment")
    setup.set_defaults(handler=None)

    check_parser = sub.add_parser("check", help="check lhs == rhs (or expr == 0)")
    check_parser.add_argument("--lhs")
    check_parser.add_argument("--rhs")
    check_parser.add_argument("--expr", help="difference expression, treated as lhs - 0")
    check_parser.add_argument("--assumptions", default="", help="e.g. 'x>0, n integer'")
    check_parser.add_argument("--samples", type=int, default=5)
    check_parser.add_argument("--json", action="store_true")
    check_parser.set_defaults(handler=check)

    diff_parser = sub.add_parser("diff", help="differentiate an expression")
    diff_parser.add_argument("--expr", required=True)
    diff_parser.add_argument("--var", default="x")
    diff_parser.add_argument("--order", type=int, default=1)
    diff_parser.add_argument("--assumptions", default="")
    diff_parser.add_argument("--json", action="store_true")
    diff_parser.set_defaults(handler=command_diff)

    integrate_parser = sub.add_parser("integrate", help="integrate an expression")
    integrate_parser.add_argument("--expr", required=True)
    integrate_parser.add_argument("--var", default="x")
    integrate_parser.add_argument("--lower")
    integrate_parser.add_argument("--upper")
    integrate_parser.add_argument("--assumptions", default="")
    integrate_parser.add_argument("--json", action="store_true")
    integrate_parser.set_defaults(handler=command_integrate)

    eval_parser = sub.add_parser("eval", help="substitute values and evaluate numerically")
    eval_parser.add_argument("--expr", required=True)
    eval_parser.add_argument("--values", required=True, help="e.g. 'x=1, y=2'")
    eval_parser.add_argument("--digits", type=int, default=30)
    eval_parser.add_argument("--assumptions", default="")
    eval_parser.add_argument("--json", action="store_true")
    eval_parser.set_defaults(handler=command_eval)

    simplify_parser = sub.add_parser("simplify", help="simplify an expression")
    simplify_parser.add_argument("--expr", required=True)
    simplify_parser.add_argument("--assumptions", default="")
    simplify_parser.add_argument("--json", action="store_true")
    simplify_parser.set_defaults(handler=command_simplify)

    latex_parser = sub.add_parser("latex", help="render an expression as LaTeX")
    latex_parser.add_argument("--expr", required=True)
    latex_parser.add_argument("--assumptions", default="")
    latex_parser.add_argument("--json", action="store_true")
    latex_parser.set_defaults(handler=command_latex)

    test_parser = sub.add_parser("test", help="run pytest for formula cards")
    test_parser.add_argument("--path", default="formulas")
    test_parser.add_argument("--json", action="store_true")
    test_parser.add_argument("pytest_args", nargs=argparse.REMAINDER)
    test_parser.set_defaults(handler=command_test)

    paper_parser = sub.add_parser("paper", help="extract formula cards from a TeX/PDF paper")
    paper_sub = paper_parser.add_subparsers(dest="action")
    extract_parser = paper_sub.add_parser("extract", help="extract cards from .tex or .pdf")
    extract_parser.add_argument("--input", required=True)
    extract_parser.add_argument("--out", default="formulas")
    extract_parser.add_argument("--max", type=int, default=80)
    extract_parser.add_argument("--no-probe", action="store_true", help="skip automatic symbolic/numeric probes")
    extract_parser.add_argument("--json", action="store_true")
    extract_parser.set_defaults(handler=command_paper)
    report_parser = paper_sub.add_parser("report", help="regenerate index.md and report.md from cards")
    report_parser.add_argument("--dir", default="formulas")
    report_parser.add_argument("--json", action="store_true")
    report_parser.set_defaults(handler=command_paper)
    paper_parser.set_defaults(handler=command_paper, action=None)

    return parser


def print_human(result):
    if "equations" in result:
        print(f"paper: {result['input']} -> {result['out']}")
        print(f"equations: {result['equations']}")
        print(f"statuses: {result['report']['statuses']}")
        return
    if "cards" in result and "statuses" in result:
        print(f"cards: {result['cards']}")
        print(f"statuses: {result['statuses']}")
        return
    if result.get("command") == "check" or "verdict" in result:
        print(f"ok: {result['ok']} ({result['verdict']})")
        print(f"lhs: {result['lhs']}")
        print(f"rhs: {result['rhs']}")
        print(f"difference: {result['difference']}")
        numeric = result["numeric"]
        print(f"numeric: {numeric['samples']} samples, max relative error {numeric['max_relative_error']:.3e}")
        return
    for key in ("expression", "result", "latex", "error"):
        if key in result:
            print(f"{key}: {result[key]}")


def main(argv=None):
    args_list = list(sys.argv[1:] if argv is None else argv)
    if not args_list:
        build_parser().print_help()
        return 0
    if args_list[0] == "setup":
        ensure_runtime()
        import sympy

        print(f"formula-verify ready: sympy {sympy.__version__}")
        return 0
    ensure_runtime()
    parser = build_parser()
    args = parser.parse_args(args_list)
    if args.command is None:
        parser.print_help()
        return 0
    result, code = args.handler(args)
    result["command"] = args.command
    if getattr(args, "json", False):
        print(json.dumps(result, ensure_ascii=False, indent=2, default=str))
    else:
        print_human(result)
    return code


if __name__ == "__main__":
    raise SystemExit(main())
