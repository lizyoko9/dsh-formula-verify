# Changelog

## 0.2.0 — 2026-10-28

- Add `paper extract` for `.tex` and `.pdf` sources: generates `eq-*.md` cards, pytest stubs, `index.md` and `report.md`.
- TeX extraction covers `equation`, `align`, `gather`, `multline`, `eqnarray`, `$$...$$` and `\[...\]`, preserving section, source line, label and context.
- PDF extraction uses pypdf and marks candidates `needs-latex`; it is a fallback, not a TeX substitute.
- Add automatic probes for simple equalities (`verified-symbolic`, `numeric-evidence`, `probe-failed`, `definition`, `needs-modeling`, `unparsed`).
- Add `test` command that runs formula-card pytest inside the private SymPy environment.
- Add `--max` and `--no-probe` controls.

## 0.1.1 — 2026-10-28

- Fix `check --expr` when no right-hand side is given.
- Add the `test` command.

## 0.1.0 — 2026-10-28

- Initial formula-verify skill with SymPy/latex2sympy2 CLI and formula-card templates.
