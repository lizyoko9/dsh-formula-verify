---
name: formula-verify
description: Verify paper formulas, identities, derivations, limits and logical claims by turning them into executable SymPy checks and reusable formula cards. Use when the user asks whether a formula or derivation is correct, wants to check an integral/derivative/limit, wants a paper's math made reproducible, or hands over a TeX/PDF paper to extract and verify.
whenToUse: The user asks to verify a formula, identity, derivation, bound, limit, dimensional consistency, or wants a reusable verification artifact for a paper. Also use when the user provides a .tex or .pdf paper and wants the equations extracted into cards. Also use when a chat answer would otherwise end with "the formula looks correct" without executable evidence.
---

# Formula verification

**Do not treat prose as evidence.** A formula is verified only when a command ran and its output is reported. Keep the human-readable statement and the executable check in the same artifact.

## Quick check

Run the bundled CLI from the project root:

```bash
python3 {{RESOURCE_DIR}}/scripts/formula_check.py check \
  --lhs '\sin(x)^2 + \cos(x)^2' --rhs '1' --json
```

- First run creates a private SymPy environment under `$DSH_HOME/formula-verify/venv` (about a minute). Use `--setup` to prewarm it and a longer bash timeout.
- `check` accepts LaTeX or SymPy syntax. If the LaTeX parser rejects a construct, pass the SymPy form, e.g. `Integral(exp(-x**2), (x, 0, oo))`.
- Exit code is `0` when the verdict is symbolic or numeric, `1` when it fails.

| Command | Use |
|---|---|
| `check --lhs ... --rhs ...` | identity / equivalence |
| `check --expr ...` | check that an expression is zero |
| `diff --expr ... --var x` | derivative |
| `integrate --expr ... --var x [--lower a --upper b]` | indefinite/definite integral |
| `eval --expr ... --values 'x=2,y=3'` | high-precision numeric evaluation |
| `simplify --expr ...` | canonical simplification |
| `latex --expr ...` | render back to LaTeX |
| `test --path formulas/` | run formula-card pytest in the private environment |

Always pass `--json` when you need to parse the result. Read `verdict`: `symbolic` means SymPy proved the difference zero; `numeric` means samples agreed but it is **not a proof**; `failed` means at least one check disagreed.

## Persist the check as a formula card

A quick CLI call is evidence for this turn. For a paper, write a card so the check is reusable and can run in CI:

```text
formulas/
  eq13.md        # statement, symbols, assumptions, derivation, expected checks
  eq13.py        # SymPy definitions and check()
  test_eq13.py   # pytest: symbolic, numeric, edge cases
```

Start from the bundled templates:

- `{{RESOURCE_DIR}}/templates/card.md`
- `{{RESOURCE_DIR}}/templates/test.py`

Copy them into the project's `formulas/` directory and edit. Run:

```bash
python3 {{RESOURCE_DIR}}/scripts/formula_check.py test --path formulas/
```

`test` runs pytest inside the private SymPy environment, so the project does not need its own pytest/SymPy install.

## From a paper (TeX or PDF)

To turn a whole paper into reviewable cards and a Markdown report:

```bash
python3 {{RESOURCE_DIR}}/scripts/formula_check.py paper extract \
  --input paper.tex --out formulas --json
python3 {{RESOURCE_DIR}}/scripts/formula_check.py paper report --dir formulas
```

- **`.tex` is the reliable path.** The extractor reads `equation`, `equation*`, `align`, `gather`, `multline`, `eqnarray`, `$$...$$` and `\[...\]`, keeps the section/source line and nearby context, and records labels as card IDs.
- **PDF only?** Convert first, then extract the converted Markdown/TeX:

  ```bash
  # Mathpix (set MATHPIX_APP_ID / MATHPIX_APP_KEY; uploads the PDF to Mathpix)
  python3 {{RESOURCE_DIR}}/scripts/formula_check.py paper convert \
    --input paper.pdf --out paper.md --backend mathpix

  # or any external converter, e.g. MinerU / Nougat
  python3 {{RESOURCE_DIR}}/scripts/formula_check.py paper convert \
    --input paper.pdf --out paper.md --backend command \
    --command 'mineru -p {input} -o {outdir}'

  python3 {{RESOURCE_DIR}}/scripts/formula_check.py paper extract \
    --input paper.md --out formulas
  ```
  Mathpix uploads the PDF to `api.mathpix.com`; `--backend command` runs a shell command, so only use converters you trust.
- **`.pdf` is a fallback.** It extracts candidate lines with pypdf and marks every card `needs-latex`; convert each candidate to LaTeX before trusting it. Prefer the paper's TeX source when available.
- `paper extract` also accepts `.md`, `.markdown` and `.mmd`; use this for Mathpix, MinerU or Nougat output.
- `--no-probe` skips the automatic checks; `--max N` caps the number of cards.
- `index.md` is the review queue. `report.md` is grouped by section with ✅ symbolic / 🟡 numeric only / ❌ failed / ⏳ pending markers; `report.json` is the machine-readable version.
- **Extraction is a draft, not a verdict.** Delete non-claims and definitions, add assumptions/domains/units, replace the skipped pytest stub with the real model, then run `test`.

Auto-probe statuses:

| Status | Meaning |
|---|---|
| `verified-symbolic` | SymPy proved the extracted equality |
| `numeric-evidence` | samples agree; not a proof |
| `probe-failed` | a check disagreed, or the equation is not modeled yet |
| `definition` | left side is a single symbol/function; needs modeling, not an identity check |
| `needs-modeling` | not a single top-level equality (inequality, approximation, chain) |
| `unparsed` | the LaTeX parser failed; pass the SymPy form or rewrite the card |
| `needs-latex` | extracted from PDF; convert to LaTeX first |

## What to check

1. **Symbols and assumptions** — every symbol has a type/domain (real, positive, integer), units if applicable, and a definition. State them before the formula.
2. **Symbolic equivalence** — `simplify(lhs - rhs) == 0`; try `trigsimp`, `expand`, `factor`, `cancel`.
3. **Numeric samples** — deterministic points plus at least one boundary/limit point. Numeric agreement is evidence, not proof.
4. **Edge cases** — zero, one, infinity, singular matrices, division by zero, log/sqrt domains, degenerate distributions.
5. **Units/dimensions** — if the paper has physical units, check them separately; the CLI does not do dimensional analysis.
6. **Counterexample search** — for a claimed inequality or implication, try to find one violating point; a found counterexample is more useful than another "pass".

## Reporting format

Report, in this order:

- **Verdict**: symbolic / numeric only / failed.
- **Assumptions** used, and anything left unproven.
- **Evidence**: the exact command and the key output (difference, max relative error, failing point).
- **Files written**: the card and pytest path, if any.
- **Caveats**: numeric-only agreement, parser limitations, or checks not run.

Never write "verified" when only numeric samples passed; write "numeric evidence, not a proof".

## When to escalate

- **Logic / protocols / algorithms**: SymPy is the wrong tool. Use a truth table or SAT/SMT (Z3) for finite claims; TLA+ or Alloy for system models; Lean/Coq for a machine-checked proof.
- **Full formalization**: only for the few theorems that carry the paper; do not formalize every equation.
- **Heavy integrals/series**: give SymPy a timeout and fall back to high-precision numeric checks; do not let one slow simplification block the whole verification.
