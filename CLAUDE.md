# organicWeb — Química orgánica para ESO

Static web app: draw an acyclic hydrocarbon or a hydrocarbon with one ring, get its IUPAC name in Spanish with
a step-by-step explanation, and optionally redraw it so the main chain is clear.

- **User-facing text: Spanish (Spain), ESO level.** Code, comments and docs: English.
- **Nomenclature: IUPAC 2013 recommendations** (longest chain first, then
  unsaturation; `hex-2-eno` style). Full rules and decisions: `docs/design.md`.
- User decision: the `–CH(CH₃)₂` group is named `isopropil` by default; the
  app also shows the `propan-2-il` (IUPAC preferred) and `1-metiletil` forms.
- Scope: v1 (acyclic hydrocarbons) is done; v2 is in progress, adding rings and
  functional groups (ESO + 1º Bachillerato) per `docs/design.md` §13, phases
  I-21…I-41. Out of scope: stereo (E/Z, cis/trans, R/S), charges, salts,
  heterocycles, polycycles, orto/meta/para. Systematic name first;
  traditional names go under "Otras formas válidas".
- Tech: vanilla JavaScript ES modules, no framework, no runtime dependencies.
  Tests: `npm test` (`node --test`), static checks: `npm run check`,
  end-to-end: `npm run e2e` (Playwright; runs every spec on the dev server
  and on `dist/index.html` via `file://`), OPSIN cross-check (dev only, needs
  Java): `npm run oracle` (`scripts/oracle/README.md`). Dev server: `npm run serve`.
  Single-file build: `npm run build` → `dist/index.html`. Deployment to
  Fastmail Files: `npm run deploy` — a manual user step; agents may only run
  it with `--dry-run` (README "Deployment", design §10.1).
- The naming engine (`src/naming/`) is pure: it never reads atom coordinates or the DOM.
- Never use `alert`/`confirm`/`prompt`; use in-page dialogs.
- Work is planned in `docs/design.md` and delivered through the autoclaude inbox
  (`autoclaude/inbox/`).
