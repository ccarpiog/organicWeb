# PROGRESS — organicWeb

Live checkpoint for the autoclaude loop. Plan: `PLAN.md` → phases are the
inbox items `autoclaude/inbox/010-*.md` … `120-*.md`, executed in filename
order, each queued as an `I-n` phase when triaged. Spec: `docs/design.md`.

## Phases

| id | title | spec | status | risk / worker | review |
|---|---|---|---|---|---|
| I-1 | Project scaffold | `autoclaude/processed/010-scaffold.md` | done — `docs/progress-archive/i-1.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-1.md` |
| I-2 | Molecule model, validation, SMILES subset | `autoclaude/processed/020-model.md` | done — `docs/progress-archive/i-2.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-2.md` |
| I-3 | Naming engine I: contracts, lexicon, unbranched chains | `autoclaude/processed/030-naming-linear.md` | done — `docs/progress-archive/i-3.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-3.md` |
| I-4 | Naming engine II: parent selection and numbering | `autoclaude/processed/040-naming-parent.md` | done — `docs/progress-archive/i-4.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-4.md` |
| I-5 | Naming engine III: recursive preferred substituents | `autoclaude/processed/050-naming-substituents.md` | done — `docs/progress-archive/i-5.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-5.md` |
| I-6 | Naming engine IV: iliden substituents and fixture set | `autoclaude/processed/060-naming-iliden-fixtures.md` | done — `docs/progress-archive/i-6.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-6.md` |
| I-7 | OPSIN oracle and graph-invariance checks | `autoclaude/processed/070-oracle.md` | done — `docs/progress-archive/i-7.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-7.md` |
| I-8 | Editor core | `autoclaude/processed/080-editor-core.md` | done — `docs/progress-archive/i-8.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-8.md` |
| I-9 | Editor extras | `autoclaude/processed/090-editor-extras.md` | done — `docs/progress-archive/i-9.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-9.md` |
| I-10 | Explanations and results panel | `autoclaude/processed/100-explain-results.md` | done — `docs/progress-archive/i-10.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-10.md` |
| I-11 | Redraw and examples | `autoclaude/processed/110-redraw-examples.md` | done — `docs/progress-archive/i-11.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-11.md` |
| I-12 | Polish and release build | `autoclaude/processed/120-polish-release.md` | done — `docs/progress-archive/i-12.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-12.md` |
| I-13 | Visible carbon dots in skeletal mode | `autoclaude/processed/130-visible-carbons.md` | done — `docs/progress-archive/i-13.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-13.md` |
| I-14 | Single-bond drag grows a chain | `autoclaude/processed/140-drag-chain-single-bond.md` | done — `docs/progress-archive/i-14.md` | routine / opus | Codex ship, 0 findings — `docs/reviews/I-14.md` |
| I-15 | 90° condensed-formula view toggle | `autoclaude/processed/150-right-angles.md` | done — `docs/progress-archive/i-15.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-15.md` |

All phases are done: the twelve original plan items and three user-feedback
items (I-13…I-15) queued from the inbox.

## Inbox

- 2026-09-27 pickup 1: `010-scaffold.md`, `020-model.md`,
  `030-naming-linear.md` → queued as I-1, I-2, I-3 (in plan order).
- 2026-09-27 pickup 2 (after I-1): `040-naming-parent.md`,
  `050-naming-substituents.md`, `060-naming-iliden-fixtures.md` → queued as
  I-4, I-5, I-6.
- 2026-09-27 pickup 3 (after I-2): `070-oracle.md`, `080-editor-core.md`,
  `090-editor-extras.md` → queued as I-7, I-8, I-9.
- 2026-09-27 pickup 4 (after I-3): `100-explain-results.md`,
  `110-redraw-examples.md`, `120-polish-release.md` → queued as I-10, I-11, I-12.
- 2026-09-27 pickup 5 (after I-12): `130-visible-carbons.md`,
  `140-drag-chain-single-bond.md`, `150-right-angles.md` → queued as I-13,
  I-14, I-15. I-15 (90° view) must also define how I-14's chain drag behaves
  while the 90° view is on.

## Next action

None — the plan is finished and the inbox is empty. New work arrives as
inbox items (`autoclaude/inbox/`); triage them per the autoclaude workflow.

## Key paths

- Bundler: `scripts/build.mjs` — read its header for supported module syntax
  before adding code to `src/` (no circular imports, no `import()`, no
  multi-declarator or destructuring exports, bindings copied not live).
- Tests: `tests/unit/*.test.js` (node --test), `tests/e2e/*.spec.js`.
- Naming: `src/naming/{structure,lexicon.es,render,parent,numbering,substituent,index}.js`;
  fixtures `tests/fixtures/names.tsv` (§4.8 format, `#` section lines).
- Oracle: `npm run oracle -- --count 1000 --seed 1` (`scripts/oracle/`, OPSIN 2.9.0
  jar in gitignored `scripts/oracle/vendor/`, `--download` fetches it).
- Editor: `src/editor/{editor,geometry,history,render}.js` — DOM-free
  `createEditorCore()` + `createEditor(svg)`; test API `window.__editor`
  (see `editor.js` header); `onEdit({reason, kind})` with kind `chemical` /
  `coordinates`. UI glue `src/ui/{app,toolbar,feedback,canvasbar,autosave,results}.js`.
- Explanation: pure `explain()` in `src/explain/explain.js`; snapshots
  `tests/fixtures/explain-snapshots.json` (`UPDATE_SNAPSHOTS=1 npm test`).
- Model: `src/model/{molecule,graph,validate,smiles}.js` — `canonicalTreeKey`
  in graph.js; `validateStructure` / `validateForNaming` in validate.js.
- Help / a11y: `src/ui/help.js` (Ayuda dialog); aria-live region and tooltips
  in `src/ui/results.js`; e2e projects `source` and `dist` in
  `playwright.config.js` (`tests/e2e/global-setup.js` rebuilds dist).
- Carbon dots: `showsCarbonDots()` / `atomLabelPosition()` in
  `src/editor/render.js`; lone-label hit box `onLoneLabel()` in `geometry.js`.
- Layout: pure `canonicalLayout()` in `src/layout/canonical.js`; examples list
  `src/ui/examples.js`; editor `setCoordinates()` / `animateCoordinates()`.
- 90° view: pure projection in `src/layout/rightangle.js`; editor
  `shownMolecule()` / `isReadOnly()` / `refresh()` in `src/editor/editor.js`;
  toggle in `src/ui/canvasbar.js` (localStorage `organicWeb.rightAngles`).

## Verification (last phase, I-15)

- `npm test` 0 (393 pass) · `npm run check` 0 · `npm run build` 0 ·
  `npm run e2e` 0 (99 pass, source + dist). Oracle not rerun (naming engine
  untouched).

## Open risks / deviations

- Commits `21b918a` and `add6d93` carry a `Co-Authored-By: Claude` trailer,
  against the user's rule of no AI references in commits. Already pushed, not
  rewritten; later commits omit it.

- I-5 decisions (see `docs/progress-archive/i-5.md`): `di(propan-2-il)` not
  `bis(...)` for simple parenthesised prefixes (spec wording superseded);
  substituent rule order FV → ene/yne locants → most substituents; new N5
  whole-name alphabetical tie-break; `propil`/`tert-butil` IUPAC findings from
  memory, not checked online (I-7's OPSIN oracle should confirm).

- I-5/I-6 decisions from memory (isopropiliden, eteniliden, propiliden,
  tert-butil, di(propan-2-il), nested iliden): I-7's OPSIN oracle confirmed
  them *structurally*; their *preference* rests on fixture justifications
  (OPSIN cannot judge preference). ~37 000 molecules, no naming bugs. I-6 review
  finding (N4 must compare one flattened citation-order locant sequence) fixed.

- I-8: Borrar on a bond now keeps both carbons (design §6.1 changed to
  match; see `docs/progress-archive/i-8.md`). Drag from empty space makes a
  two-carbon fragment (spec silent).

- I-9: restore validates structure only (loose fragments allowed), is not an
  undo step, and recentres the view. Pinch zoom has no e2e test. Review's two
  should-fix findings fixed with regressions (`docs/progress-archive/i-9.md`).

- I-10: numbering options are "Opción A/B" (no coordinates); name button
  always enabled; Spanish explanation texts not yet reviewed by a teacher.
  Review's three should-fix findings fixed (`docs/progress-archive/i-10.md`).

- I-11: layouts that still fail clearance/crossing checks after restarts
  leave the drawing unchanged with a message (~1/800 random molecules up to
  40 C; none up to 20 C). Review's blocker and should-fix fixed with
  regressions (`docs/progress-archive/i-11.md`).

- I-12: review's two should-fix findings (help focus on phones, Esc on a
  hovered tooltip) fixed with e2e regressions (`docs/progress-archive/i-12.md`).
  Spanish help text not yet reviewed by a teacher.

- I-13: CH₄ label sits below its dot in Esqueleto; `hitTest()` maps the
  label box to the carbon (review should-fix, fixed). A bond drag snapping onto
  that box joins methane (`docs/progress-archive/i-13.md`).

- I-14: Cadena tool removed (`h` selects Enlace simple); release over an
  atom is always a one-bond drag to it; double/triple drags make one bond.
  Preview jumps from straight bond to zigzag at the chain threshold
  (`docs/progress-archive/i-14.md`).

- I-15: 90° view is a display-only projection, read-only only while shown;
  fallbacks (empty, loose pieces, unplaceable) stay editable. Review should-fix
  (Mover live preview lost) fixed with an e2e regression
  (`docs/progress-archive/i-15.md`).

- Bundler regex-literal detection is heuristic; duplicate `export *` names:
  first wins. See `docs/progress-archive/i-1.md`.

## Git state

- I-14 `66280ae`, pushed. I-15 committed and pushed right after this
  checkpoint (see `git log`).
