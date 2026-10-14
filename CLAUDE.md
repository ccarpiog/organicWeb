# organicWeb — Química orgánica para ESO

Static web app: draw an acyclic hydrocarbon or a hydrocarbon with one ring (or a halogen derivative, alcohol, aldehyde, ketone, carboxylic acid, ether, ester, amine, amide or nitrile of one; an ester may have a ring on each side; a benzene may carry two to six substituents), get its IUPAC name in Spanish with
a step-by-step explanation, and optionally redraw it so the main chain is clear.

- **User-facing text: Spanish (Spain), ESO level.** Code, comments and docs: English.
- **Nomenclature: IUPAC 2013 recommendations** (longest chain first, then
  unsaturation; `hex-2-eno` style). Full rules and decisions: `docs/design.md`.
- User decision: the `–CH(CH₃)₂` group is named `isopropil` by default; the
  app also shows the `propan-2-il` (IUPAC preferred) and `1-metiletil` forms.
- Scope: v1 (acyclic hydrocarbons), v2 (rings and functional groups, ESO +
  1º Bachillerato, `docs/design.md` §13, phases I-21…I-41) and v3
  (polysubstituted benzenes, §14, phases I-42a…I-46) are all done —
  benzenes with two to six branch, halogen or alkoxy prefixes are named, also
  beside one or several identical principal groups on the ring — OH, amine,
  –COOH, –CHO, –C≡N or amide — with junior groups as prefixes (`4-metilfenol`,
  `4-metilbencen-1-amina`, `ácido 4-hidroxibenzoico`, `3-cianobenzamida`,
  `3-etilbenceno-1,2-diol`, `ácido benceno-1,3-dicarboxílico`), and such a
  benzene with prefixes is also a substituted phenyl, phenoxy or benzoyl
  prefix of a chain parent (`1-(4-metilfenil)etan-1-ona`,
  `2-(4-metilfenoxi)etan-1-ol`, `ácido 2-(4-metilbenzoil)butanoico`) or
  either ring of an ester (`4-metilbenzoato de etilo`, `etanoato de
  4-metilfenilo`, `4-metilbenzoato de 4-clorofenilo`).
  v4 (from the name to the drawing, built from tiles: «¿Cómo se dibuja?»,
  §15) is in progress: the engine is pure modules in `src/reverse/` — tiles,
  parser, assembler and tokenizer for open-chain hydrocarbon names, and
  `readName()`, which interprets, builds and judges them (correct,
  alternative, otherName, outOfScope, invalid with structural errors) and
  searches the locants a name leaves out (`search.js`: missingLocants,
  ambiguous, and incomplete when the search budget runs out); the dialog
  (`src/ui/name-builder.js`, DOM-free state in `name-builder-state.js`:
  tile rows, selectable name line, editing, failures shown in the dialog)
  and «Dibujar» (`src/ui/draw-name.js`: the layout checked before the
  canvas is touched, the molecule loaded as one undoable edit and centred,
  then `results.js` `showVerdict()`: the ordered drawing and the verdict
  block above «Se llama:») are done, with the Ayuda section «Del nombre al
  dibujo»; `diagnose.js` names the main mistake of an `otherName` verdict
  (R-3, eleven rules in order, chain rules read from the engine's trace in
  the student's prefix style, recognised by the branches' structure;
  `readName()` attaches it as `diagnosis`, with its explain() step id —
  of the explanation of the naming in that style, `diagnosisExplanation()`
  — and the student's chain beside the parent), and the results panel
  shows it (`showVerdict()`: the message between the verdict's two
  sentences, the student's chain striped under the parent with a legend,
  «Ver el paso» opening the stepper — the explanation in the student's
  style — at its step). Next is R-4 (phase I-50): rings and the retained
  aromatic templates.
  Out of scope: stereo (E/Z, cis/trans, R/S), charges, salts, heterocycles,
  polycycles, and benzenes with functional groups on the ring and on a side
  chain (or on two side chains) or an ester beside another ring group.
  Systematic name first; traditional names and the old orto/meta/para forms
  go under "Otras formas válidas".
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
