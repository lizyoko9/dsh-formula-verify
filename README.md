# dsh-formula-verify

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) skill for **verifying paper formulas with executable checks** instead of trusting chat prose.

It turns a formula into:

- a SymPy symbolic check (`simplify(lhs - rhs) == 0`),
- numeric samples at deterministic points,
- a reusable formula card plus a `pytest` file.

The skill is model-invocable and user-invocable. It ships a self-bootstrapping Python CLI; the first run creates a private SymPy environment under `$DSH_HOME/formula-verify/venv`.

## Install

### As a DSH bundle

Install from the **Plugins** page with:

```text
git+https://github.com/lizyoko9/dsh-formula-verify
```

### As a plain filesystem skill

Copy `assets/` to `~/.dsh/skills/formula-verify/`, renaming `assets/formula-verify.md` to `SKILL.md` and replacing `{{RESOURCE_DIR}}` with that directory's absolute path:

```bash
mkdir -p ~/.dsh/skills/formula-verify
cp -R assets/scripts assets/templates ~/.dsh/skills/formula-verify/
sed 's#{{RESOURCE_DIR}}#'"$HOME"'/.dsh/skills/formula-verify#g' \
  assets/formula-verify.md > ~/.dsh/skills/formula-verify/SKILL.md
```

DSH's filesystem skill provider watches `~/.dsh/skills`; the skill appears in the next catalog without a restart.

## Use

Ask the agent to verify a formula, or run the CLI directly:

```bash
python3 ~/.dsh/skills/formula-verify/scripts/formula_check.py check \
  --lhs '\sin(x)^2 + \cos(x)^2' --rhs '1' --json
```

Commands:

| Command | Use |
|---|---|
| `check --lhs ... --rhs ...` | identity / equivalence |
| `check --expr ...` | check that an expression is zero |
| `diff --expr ... --var x` | derivative |
| `integrate --expr ... --var x [--lower a --upper b]` | indefinite/definite integral |
| `eval --expr ... --values 'x=2' --digits 30` | high-precision evaluation |
| `simplify --expr ...` | canonical simplification |
| `latex --expr ...` | render to LaTeX |
| `test --path formulas/` | run formula-card pytest in the private environment |
| `setup` | prewarm the private SymPy environment |

`check` returns:

- `verdict: "symbolic"` — SymPy proved the difference is zero;
- `verdict: "numeric"` — samples agreed, but this is **not a proof**;
- `verdict: "failed"` — at least one check disagreed (exit code 1).

## Formula cards

For a paper, keep the check:

```text
formulas/
  eq13.md
  eq13.py
  test_eq13.py
```

Templates live in `assets/templates/`. Run:

```bash
python3 ~/.dsh/skills/formula-verify/scripts/formula_check.py test --path formulas/
```

`test` runs pytest inside the private environment, so the project does not need its own pytest or SymPy install.

## From a paper (TeX or PDF)

```bash
python3 ~/.dsh/skills/formula-verify/scripts/formula_check.py paper extract \
  --input paper.tex --out formulas --json
python3 ~/.dsh/skills/formula-verify/scripts/formula_check.py paper report --dir formulas
```

- TeX is the reliable source: `equation`, `align`, `gather`, `multline`, `eqnarray`, `$$...$$` and `\[...\]` are extracted with section, source line, label and context.
- PDF is a fallback: candidate lines are extracted with pypdf and marked `needs-latex`; convert them to LaTeX before trusting.
- `paper extract` also accepts `.md`, `.markdown` and `.mmd` from Mathpix, MinerU or Nougat.
- To convert a PDF first:

  ```bash
  # Mathpix (requires MATHPIX_APP_ID / MATHPIX_APP_KEY; uploads the PDF)
  python3 ~/.dsh/skills/formula-verify/scripts/formula_check.py paper convert \
    --input paper.pdf --out paper.md --backend mathpix

  # or an external converter such as MinerU / Nougat
  python3 ~/.dsh/skills/formula-verify/scripts/formula_check.py paper convert \
    --input paper.pdf --out paper.md --backend command \
    --command 'mineru -p {input} -o {outdir}'

  python3 ~/.dsh/skills/formula-verify/scripts/formula_check.py paper extract \
    --input paper.md --out formulas
  ```
  Mathpix uploads the PDF to `api.mathpix.com`; `--backend command` runs a shell command, so only use converters you trust.
- The extractor writes `eq-*.md`, `test_eq_*.py` stubs, `index.md`, a section-grouped `report.md` and `report.json`.
- Auto-probe statuses: `verified-symbolic`, `numeric-evidence`, `probe-failed`, `definition`, `needs-modeling`, `unparsed`, `needs-latex`.
- Extraction is a draft: review, fill assumptions, replace the skipped pytest stub with the real model, then run `test`.

## Limits

- SymPy is not a proof assistant. `symbolic` is strong evidence, not a formal proof.
- The LaTeX parser handles common paper syntax; unsupported constructs can be passed in SymPy form (`Integral(exp(-x**2), (x, 0, oo))`).
- Numeric checks use real, mostly positive sample points; domain edges must be checked explicitly.
- Units/dimensions are not checked by the CLI; add a unit library or a manual check for physical formulas.
- Logic, protocols and algorithms need a truth table, SAT/SMT, TLA+, Alloy or Lean; the skill says when to escalate.

## License

MIT.
