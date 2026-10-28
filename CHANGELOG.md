# Changelog

## 0.4.3 — 2026-10-28

- Render the formula in each card as a Markdown display-math block (`$$...$$`) instead of a `latex` code fence, so the document preview can typeset it.
- Keep the raw LaTeX in the generated `test_eq_*.py` TODO and in the source line metadata.

## 0.4.2 — 2026-10-28

- Do not split the right Sidebar when opening a card or report; the preview opens as a normal tab in the same pane.
- Keep `keepMounted` on the Formula Lab tab, so the report state survives switching to the preview tab and back.

## 0.4.1 — 2026-10-28

- Keep the Formula Lab panel mounted across tab switches (`keepMounted`), so opening a card/report no longer resets the extracted result.
- Open cards, `report.md` and `index.md` with `preferNewPane`, so the report and the document preview can sit side by side when the sidebar has room.

## 0.4.0 — 2026-10-28

- Add the Formula Lab client panel: pick a workspace paper, run conversion/extraction, and browse the section-grouped report without typing commands.
- Add a host route (`/formula-lab`) protected by a per-process token injected into the DSH index; the route runs the bundled Python CLI.
- The panel supports TeX/Markdown/PDF sources, optional Mathpix or external-command conversion, auto-probe, and opens cards/report/index in the document preview.
- Declare the package's client half (`client.js`) and mount the panel as a right-Sidebar tab type with a guide card.

## 0.3.0 — 2026-10-28

- Add `paper convert` with two backends: Mathpix (`MATHPIX_APP_ID` / `MATHPIX_APP_KEY`) and an external `--command` converter such as MinerU/Nougat.
- Accept `.md`, `.markdown` and `.mmd` sources in `paper extract`, so converted papers feed the same card pipeline.
- Replace the flat report with a section-grouped `report.md` using ✅ symbolic / 🟡 numeric only / ❌ failed / ⏳ pending markers, and add `report.json`.
- Add card `order`, so section order follows the paper.

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
