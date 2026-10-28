---
name: formula-verify
description: Verify paper formulas, identities, derivations, limits and logical claims by turning them into executable SymPy checks and reusable formula cards. Use when the user asks whether a formula or derivation is correct, wants to check an integral/derivative/limit, or wants a paper's math made reproducible.
whenToUse: The user asks to verify a formula, identity, derivation, bound, limit, dimensional consistency, or wants a reusable verification artifact for a paper. Also use when a chat answer would otherwise end with "the formula looks correct" without executable evidence.
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
