# Example

```bash
python3 ~/.dsh/skills/formula-verify/scripts/formula_check.py paper extract \
  --input examples/paper.tex --out /tmp/paper-formulas --json
cat /tmp/paper-formulas/report.md
```

The result has two auto-verified identities, one definition and one identity; open the cards, fill in assumptions, then replace the `pytest.skip` stubs with real models and run `test --path /tmp/paper-formulas`.
