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
| I-16 | Toggle to hide stepper highlights | `autoclaude/processed/160-hide-highlights.md` | done — `docs/progress-archive/i-16.md` | routine / opus | Codex ship, 0 findings — `docs/reviews/I-16.md` |
| I-17 | Editing in the 90° view | `autoclaude/processed/170-edit-in-carbons-view.md` | done — `docs/progress-archive/i-17.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-17.md` |
| I-18 | Author credit footer | `autoclaude/processed/180-author-credit.md` | done — `docs/progress-archive/i-18.md` | routine / opus | Codex ship, 0 findings — `docs/reviews/I-18.md` |
| I-19 | Undo after "Ordenar dibujo" (bug) | `autoclaude/processed/190-undo-ordenar-dibujo.md` | done — `docs/progress-archive/i-19.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-19.md` |
| I-20 | `npm run deploy` to Fastmail Files + docs | `autoclaude/processed/200-deploy-fastmail.md` | done — `docs/progress-archive/i-20.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-20.md` |

| I-21 | v2.1 Multi-element model (+ v2 plan into design.md, scope lift in CLAUDE.md) | `autoclaude/processed/215-rings-functional-groups-confirmed.md` §3.1 | done — `docs/progress-archive/i-21.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-21.md` |
| I-22 | v2.2 Multi-element SMILES and oracle | same, §3.2 | done — `docs/progress-archive/i-22.md` | routine / opus | Codex ship, 0 findings — `docs/reviews/I-22.md` |
| I-23 | v2.3 Element palette | same, §3.3 | done — `docs/progress-archive/i-23.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-23.md` |
| I-24 | v2.4 Ring infrastructure | same, §3.4 | done — `docs/progress-archive/i-24.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-24.md` |
| I-25 | v2.5 Simple cycloalkanes | same, §3.5 | done — `docs/progress-archive/i-25.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-25.md` |
| I-26 | v2.6 Substituted and unsaturated rings | same, §3.6 | done — `docs/progress-archive/i-26.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-26.md` |
| I-27a | v2.7a Ring templates and inner double-bond lines (split from I-27) | same, §3.7 | done — `docs/progress-archive/i-27a.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-27a.md` |
| I-27b | v2.7b Ordenar dibujo for rings (split from I-27) | same, §3.7 | done — `docs/progress-archive/i-27b.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-27b.md` |
| I-28 | v2.8 Benzene and hydrocarbon derivatives | same, §3.8 | done — `docs/progress-archive/i-28.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-28.md` |
| I-29 | v2.9 Functional groups and seniority | same, §3.9 | done — `docs/progress-archive/i-29.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-29.md` |
| I-30 | v2.10 Halogen derivatives | same, §3.10 | done — `docs/progress-archive/i-30.md` | high / opus | Codex ship-with-fixes, 1 fixed, 1 declined — `docs/reviews/I-30.md` |
| I-31 | v2.11 Alcohols | same, §3.11 | done — `docs/progress-archive/i-31.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-31.md` |
| I-32 | v2.12 Aldehydes and ketones | same, §3.12 | done — `docs/progress-archive/i-32.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-32.md` |
| I-33 | v2.13 Carboxylic acids | same, §3.13 | done — `docs/progress-archive/i-33.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-33.md` |
| I-34 | v2.14 Ethers | same, §3.14 | done — `docs/progress-archive/i-34.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-34.md` |
| I-35 | v2.15 Esters | same, §3.15 | done — `docs/progress-archive/i-35.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-35.md` |
| I-36 | v2.16 Amines | same, §3.16 | done — `docs/progress-archive/i-36.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-36.md` |
| I-37 | v2.17 Amides | same, §3.17 | done — `docs/progress-archive/i-37.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-37.md` |
| I-38 | v2.18 Nitriles | same, §3.18 | done — `docs/progress-archive/i-38.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-38.md` |
| I-39a | v2.19a `ciano-` prefix (split from I-39) | same, §3.19 | done — `docs/progress-archive/i-39a.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-39a.md` |
| I-39b | v2.19b Acyl prefixes `formil-`/`acetil-` (split from I-39) | same, §3.19 | done — `docs/progress-archive/i-39b.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-39b.md` |
| I-39c | v2.19c Ester prefixes and diesters (split from I-39) | same, §3.19 | done — `docs/progress-archive/i-39c.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-39c.md` |
| I-39d | v2.19d Amide prefixes and pair matrix (split from I-39c) | same, §3.19 | done — `docs/progress-archive/i-39d.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-39d.md` |
| I-40a | v2.20a Rings as substituents of a functional chain (split from I-40) | same, §3.20 | done — `docs/progress-archive/i-40a.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-40a.md` |
| I-40b | v2.20b Acids, aldehydes, nitriles, amides with a ring (split from I-40) | same, §3.20 | queued | — | — |
| I-40c | v2.20c Ring esters (split from I-40) | same, §3.20 | queued | — | — |
| I-41 | v2.21 Condensed formulas and wrap-up | same, §3.21 | queued | — | — |

The twelve original plan items and user-feedback items I-13…I-20 are done.
v2 plan (user-confirmed scope): I-21…I-40a done; I-40b, I-40c, I-41 queued in order
(I-27 split into I-27a editor drawing and I-27b Ordenar dibujo; I-39 into I-39a `ciano-`,
I-39b acyl prefixes, I-39c ester prefixes + diesters, I-39d amide prefixes + pair matrix;
I-40 into I-40a ring prefixes on a functional chain, I-40b acids/aldehydes/nitriles/amides
with a ring, I-40c ring esters);
phases may be split as they are selected. The v2 plan now lives in
`docs/design.md` §13.

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
- 2026-09-27 pickup 6 (after I-15): `160-hide-highlights.md`,
  `170-edit-in-carbons-view.md` → queued as I-16, I-17. `180-author-credit.md`
  was not ready (still settling); next boundary.
- 2026-09-27 pickup 7 (after I-16): `180-author-credit.md`,
  `190-undo-ordenar-dibujo.md` → queued as I-18, I-19.
- 2026-09-27 pickup 8 (before I-18): `200-deploy-fastmail.md` → queued as
  I-20; `210-rings-functional-groups.md` → deferred (see Decisions needed).
- 2026-09-27 pickup 9 (after I-20): `215-rings-functional-groups-confirmed.md`
  — the re-drop of 210 with the v2 scope confirmed by the user and the §4
  decisions answered (ESO + 1º Bachillerato; systematic name first, traditional
  names under "Otras formas válidas"; benzene monosubstituted only; stereo,
  charges, salts, heterocycles, polycycles out) → queued as I-21…I-41, one
  per plan phase §3.1…§3.21.

## Next action

Poll the inbox, then run I-40b: lift `ringAcid`, `ringAldehyde`, `ringNitrile`, `ringAmide` and
the I-40a stopgap `ringAcyl` (C=O carbon bonded to a ring: `benzoil`, `ciclohexanocarbonil`) —
suffixes on the ring (`ácido ciclohexanocarboxílico`, `ácido benzoico`, `-carbaldehído`,
`benzaldehído`, `-carbonitrilo`, `benzonitrilo`, `-carboxamida`, `benzamida`, `N-fenil…`) and those
groups on a chain beside a ring (reuse I-40a's ring prefixes and ring-vs-chain count, `parent.js`).
Spec: design §13.4 rows I-40a/b/c, §13.6; split again at selection if large. Then I-40c (ring
esters, `ringEster`), then I-41. Deploying stays a manual user step.

## Decisions (user, final — 2026-09-27)

- v2 scope approved: cyclic hydrocarbons + functional groups
  (`autoclaude/processed/215-rings-functional-groups-confirmed.md`); level ESO
  + 1º Bachillerato; systematic IUPAC name first, traditional names under
  "Otras formas válidas"; benzene monosubstituted only (no o/m/p); stereo,
  charges, salts, heterocycles, polycycles out of scope.

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
  `shownMolecule()` / `isProjected()` / `refresh()` in `src/editor/editor.js`;
  toggle in `src/ui/canvasbar.js` (localStorage `organicWeb.rightAngles`).
- Deploy: `scripts/deploy.mjs` (injectable `deploy()`), tests
  `tests/unit/deploy.test.js`; docs README "Deployment", design §10.1.
- Element palette: toolbar `src/ui/toolbar.js`; DOM-free label sizing
  `src/editor/labels.js`; heteroatom hit boxes `onHeteroLabel()` in `geometry.js`.
- Ring naming: `src/naming/rings.js` (cycloalkanes I-25; substituted/unsaturated
  rings I-26, numbering via `runNumberingCascade()` in `numbering.js`); explain steps
  "Busca el anillo" / `ringNumbering` in `src/explain/explain.js`.
- Rings: pure perception/classification `src/model/rings.js`; `canonicalKey()`
  (trees + monocycles) in `graph.js`; errors `CYCLE` / `RING_SYSTEM` (`ringKind`)
  in `validate.js`; SMILES ring closures in `smiles.js`.
- Ring tool (I-27a): `ringPlan()` / `targetExists()` in `src/editor/editor.js`, polygon
  geometry in `geometry.js`, inner double-bond lines in `render.js`, "Anillos" group in
  `src/ui/toolbar.js` (`a` cycles sizes 3–8).
- Ring layout (I-27b): pure `src/layout/rings.js` (locant 1 top, clockwise; sector and
  intrusion checks), strategy in `canonical.js`, `layoutProblems()` `inside` count.
- Benzene (I-28): pure `src/naming/aromatic.js` (detection + naming); `ringReason`
  `polysubstitutedBenzene` in `validate.js`; Benceno template in the ring tool
  (`editor.js`); explain step "Reconoce el benceno"; oracle kekulization in
  `scripts/oracle/smiles-full.mjs`.
- Groups (I-29): pure `src/naming/groups.js` (detection, no overlaps) and
  `seniority.js` (principal group, suffix/prefix, `attachmentTowards()`); the
  `HETEROATOM` refusal carries `groups`; explain steps "Reconoce los grupos" …;
  snapshots `tests/fixtures/explain-group-snapshots.json`; design §13.6.
- Halogens (I-30): halogen prefixes as `substituent.halogen` (render `substituentTokens()`),
  admission in `validate.js`; tests `tests/unit/halogens.test.js`, `tests/e2e/halogens.spec.js`.
- Alcohols (I-31): principal-group chain choice and numbering in `parent.js` /
  `numbering.js`; suffix rendering and multiplier elision in `render.js`; ring closing-bond
  compound locant `1(n)`; tests `tests/unit/alcohols.test.js`, `tests/e2e/alcohols.spec.js`.
- Carbonyls (I-32): `src/naming/principal.js` (oxygen/principal kind, traditional ids);
  refusals `ringAldehyde` / `sideChainCarbonyl` / `manyAldehydes` / `acylSubstituent`
  (`validate.js`, `nameValidated()` in `index.js`); tests `tests/unit/carbonyls.test.js`,
  `tests/e2e/carbonyls.spec.js`.
- Acids (I-33): acid kind in `src/naming/principal.js`; refusals `manyAcids` / `ringAcid` /
  `carboxySubstituent`; tests `tests/unit/acids.test.js`, `tests/e2e/acids.spec.js`.
- Ethers (I-34): parent-side choice in `parent.js`, alkoxy substituents in `substituent.js`,
  refusal `symmetricEther`, N5 punctuation tie-break `compareNameKeys()` in `numbering.js`;
  tests `tests/unit/ethers.test.js`, `tests/e2e/ethers.spec.js`.
- Esters (I-35): admission and refusals `ringEster` / `esterPrefix` / `manyEsters` in
  `validate.js`; O-bound group `esterAlkylName()` in `render.js`; explain `esterSpecs()` and
  step «Separa las dos partes del éster»; tests `tests/unit/esters.test.js`, `tests/e2e/esters.spec.js`.
- Amines (I-36): amine kind in `principal.js`, `N` locants in `numbering.js` / `render.js`,
  refusals `sideChainAmine` / `substitutedPolyamine` / `symmetricAmine` in `validate.js`;
  tests `tests/unit/amines.test.js`, `tests/e2e/amines.spec.js`.
- Amides (I-37): amide kind in `principal.js` (C(=O)N one group, `N` locants from I-36),
  refusals `ringAmide` / `amidePrefix` / `manyAmides` / `substitutedPolyamide` / `imide` in
  `validate.js`; oracle `generateAmides()`; tests `tests/unit/amides.test.js`, `tests/e2e/amides.spec.js`.
- Nitriles (I-38): nitrile kind in `principal.js` (C≡N carbon chain end, N never a chain atom),
  refusals `ringNitrile` / `manyNitriles` / `cyanoPrefix`; `assertNoTripleBondLeaves` now C≡C
  only; P0-aware chain sentence `outsideUnsaturation()` in `explain.js`; oracle
  `generateNitriles()`; tests `tests/unit/nitriles.test.js`, `tests/e2e/nitriles.spec.js`.
- `ciano-` (I-39a): `outsideCarbons()` in `principal.js` (carbons never in a chain), parent
  skeleton without them in `parent.js`; refusal `carbonocyanidic`, `manyNitriles` narrowed; oracle
  `generateCyano()`; tests `tests/unit/cyano.test.js`, `tests/e2e/cyano.spec.js`.
- Acyl prefixes (I-39b): acyl branches flagged in `buildSubstituent()` (`substituent.js`), X a
  normal skeleton carbon (not in `outsideCarbons()`); endings `acylEndingTokens()` in `render.js`;
  `unnamedAcyl()` safety net (`index.js`); tests `tests/unit/acyl.test.js`, `tests/e2e/acyl.spec.js`.
- Ester prefixes (I-39c): refusals in `validate.js`, prefixes in `substituent.js` / `render.js`,
  explain step `diester`; tests `tests/unit/ester-prefixes.test.js`, `tests/e2e/ester-prefixes.spec.js`.
- Amide prefixes (I-39d): `carbamoil`/`acilamino` in `substituent.js` / `render.js`, P4 tweak in
  `numbering.js`; tests `tests/unit/amide-prefixes.test.js`, `tests/e2e/amide-prefixes.spec.js`.
- Ring prefixes (I-40a): ring vs chain principal-group count in `parent.js`, ring prefixes
  (`ciclohexil`, `fenil`, `fenoxi`, …) in `substituent.js` / `render.js`, refusals `symmetricRing` /
  `ringAcyl` (`validate.js`, `index.js`), explain step «Anillo o cadena»; tests
  `tests/unit/ring-substituents.test.js`, `tests/e2e/ring-substituents.spec.js`.
- Highlight switch: `canvasMarks()` / `makeMarksToggle()` in `src/ui/results.js`
  (localStorage `organicWeb.highlights`).

## Verification (last phase, I-40a)

- Run by the orchestrator after the review fixes: `npm test` 0 (1325 pass) · `npm run check` 0
  (121 files) · `npm run e2e` 0 (235 pass, source + dist) · `npm run oracle -- --count 1000 --seed 1`
  0 (8611 pass, 500 ring-prefix).

## Open risks / deviations

- Commits `21b918a` and `add6d93` carry a `Co-Authored-By: Claude` trailer,
  against the user's rule of no AI references in commits. Already pushed, not
  rewritten; later commits omit it. `a052801` (I-37) repeats the mistake (pushed, not
  rewritten); commits from I-38 on omit it.

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

- I-8…I-20 (v1 editor, explanations, redraw, 90° view, deploy): per-phase deviations and
  review resolutions live in `docs/progress-archive/i-8.md` … `i-20.md`. Still relevant:
  Spanish help/explanation texts not reviewed by a teacher; ~1/800 random molecules up to 40 C
  fail Ordenar dibujo checks (drawing kept, message shown); Ejemplos load leaves the view
  unrestored on undo; deploy https-only, `--dry-run` never reads the Keychain.

- I-21: element table `src/model/elements.js`; heteroatom molecules get the
  `HETEROATOM` "aún no sé nombrar" error; heteroatom labels and "carbono" wording in some
  editor refusals wait for I-23 (`docs/progress-archive/i-21.md`).

- I-22: SMILES reads/writes O, N, halogens and `[OH]`-style bracket H; the
  oracle keeps heavy atoms (`heavyAtomTree()`), generator still hydrocarbon-only
  (`docs/progress-archive/i-22.md`).

- I-23: element palette (shortcuts `c o n f l b i`); bond tools always draw
  carbons; 90° view falls back and Ordenar dibujo refuses when heteroatoms are
  present. Review should-fix (label hit boxes hid bonds) fixed with regressions;
  N–Cl at 30 units leaves ~5 units of clickable bond
  (`docs/progress-archive/i-23.md`).

- I-24: `CYCLE` (single carbocycle) and `RING_SYSTEM` (heterociclo, fusionados,
  con puente, espiro, varios anillos) scope errors, checked before `TOO_BIG` /
  `HETEROATOM`. Fused vs bridged exact only for two rings (cubane → fused);
  oracle cannot compare molecules with 2+ rings. Review's two should-fix fixed
  with regressions (`docs/progress-archive/i-24.md`).

- I-25: bare rings 3–30 C named; > 30 C → `TOO_BIG`; `CYCLE` keeps a
  `ringReason` (side chains / unsaturation / both). Closure bond chosen from
  atom ids, not drawing order. Ordenar dibujo refuses rings with a message
  until I-27 (`docs/progress-archive/i-25.md`).

- I-26: ring always the parent (design §13.5); locant omission only for a
  lone ring multiple bond or a lone substituent on a saturated ring; benzene
  still refused (`CYCLE`, `ringReason: 'benzene'`) until I-28. Review
  should-fix (option labels repeated after Z) fixed with a regression
  (`docs/progress-archive/i-26.md`).

- I-27a: ring tool (3–8, `a`); a ring hung from a ring carbon is two rings →
  `RING_SYSTEM`; ring double bonds draw the inner line toward the smallest ring.
  Review should-fix (stale hover crash) fixed with a regression
  (`docs/progress-archive/i-27a.md`).

- I-27b: rings ordered as polygons (locant 1 top, clockwise), side chains
  kept outside; seeded random test 0 failures. Chain-parent layouts still take
  branches in atom-id order (pre-existing; ties by bond order could depend on
  ids). Both review should-fix fixed (`docs/progress-archive/i-27b.md`).

- I-28: benzene monosubstituted only (polysubstituted → `CYCLE`
  `polysubstitutedBenzene`); `tolueno`/`estireno` as other valid forms (toluene
  labelled as the 2013 preferred name, from memory of P-22.1.3), no `cumeno`; ring
  buttons shrunk on wide pointer screens. Both review should-fix fixed with
  regressions (`docs/progress-archive/i-28.md`).

- I-29: detection only; heteroatom molecules still `HETEROATOM`, now with
  group steps. Review should-fix (ester/amide prefix direction) fixed with
  regressions. `oxo-`/`formil-` forms and diesters left to I-35/I-39
  (`docs/progress-archive/i-29.md`).

- I-30: alphabetical order by Spanish words (`2-metil-4-yodopentano`); locant
  omission rules from memory (P-14.3.4); review should-fix `(bromo-clorometil)` fixed,
  `2-cloroetenil` vs `2-cloroeten-1-il` declined with reasoning
  (`docs/progress-archive/i-30.md`).

- I-31: cycloalkanols and `fenol` brought forward from I-40; a ring with OH on a side
  chain is refused until I-40; `2-cloroetan-1-ol`, enols and gem-diols decided from
  memory; ring closing bond ranks as n, rendered `1(n)` only when OH locants force it.
  Review should-fix (`tetrol`, closing-bond locant) fixed (`docs/progress-archive/i-31.md`).

- I-32: cycloalkanones brought forward from I-40; CHO on rings, acyl-type branches and
  3+ CHO refused; `propanona` (design) with the 2013 PIN `propan-2-ona` as an alternative;
  `formaldehído`/`acetaldehído`/`acetona` offered; rule numbers from memory. Review
  should-fix (acyl leaked through the pin style) fixed with a regression
  (`docs/progress-archive/i-32.md`).

- I-33: open-chain acids only (ring + COOH → `ringAcid`, 3+ COOH → `manyAcids`);
  `ácido fórmico`/`acético`/`oxálico` offered; aldehyde end beside an acid is `oxo-`.
  A larger oracle run (seed 7, 1–20 C) shows 7 pre-existing aldehyde/ketone refusals in the
  'substituted' style, not wrong names (`docs/progress-archive/i-33.md`).

- I-34: ring always the parent side (no `fenoxi`); `symmetricEther` refused when both
  halves carry the principal group; functional-class names (`dietil éter`) and `anisol`
  offered, not oracle-checked; review should-fix (polyether names depended on atom IDs)
  fixed with regressions (`docs/progress-archive/i-34.md`).

- I-35: esters with one –COO– on open chains only (`ringEster`, `esterPrefix` for acid +
  ester, `manyEsters`); groups on the O-bound side named inside it (`etanoato de
  2-hidroxietilo`); `acetato`/`formiato` for bare etanoato/metanoato (retained status from
  memory). Both review should-fix (acid highlight, ethers in the O-bound group) fixed with
  regressions (`docs/progress-archive/i-35.md`).

- I-36: ring amines brought forward from I-40 (`ciclohexanamina`, `bencenamina`, `anilina`
  as alternative); `N` locants force carbon locants (`1-cloro-N-metilmetanamina`);
  substituted polyamines (N¹/N²) and symmetric amines refused; decisions from memory listed in
  `docs/progress-archive/i-36.md`. `scripts/oracle/README.md` stale since I-31.

- I-37: open-chain amides only; ring amides (incl. `N-fenil…`), amide beside acid/ester or
  two amides on separate pieces (`amidePrefix`, no multiplicative names), 3+ amides,
  N-substituted diamides and imides refused; `formamida`/`acetamida` retained status from
  memory. `scripts/oracle/README.md` still stale; seed 7 keeps 2 pre-existing carbonyl
  generator failures (`docs/progress-archive/i-37.md`).

- I-38: open-chain nitriles only; `ciano-` refused (`cyanoPrefix`, left to I-39), ring
  nitriles and 3+ nitriles refused; `metanonitrilo` (HCN) admitted; `acetonitrilo` labelled
  preferred and `-onitrilo` elision from memory (P-16.7.1). Review should-fix (dinitrile chain
  step blamed length instead of P0) fixed for nitriles, diacids and diamides with regressions
  (`docs/progress-archive/i-38.md`).

- I-39a: `ciano-` named at any depth with its carbon outside every chain; `manyNitriles` only
  for 3+ principal nitriles on one piece; NC–C(=O)X refused (`carbonocyanidic`, from memory);
  `ácido 2-cianoetanoico` keeps its locant. Review should-fix (chain step said the chain ends
  at the cyano carbon) fixed with a regression (`docs/progress-archive/i-39a.md`).

- I-39b: acyl carbon X stays a chain carbon (ketone in the chain when possible), an acyl branch
  only when the chain misses it; `acetil` retained, substituted two-carbon acyls systematic
  (`(2-cloroetanoil)`); `manyAldehydes` narrowed to 3+ principal –CHO on one piece
  (`-carbaldehído`); `acylSubstituent` only for –CO–C≡N; acyl on rings still refused (I-40);
  prefix words from memory. Review should-fix (acyl root O counted as `oxo` in the branch
  tie-break) fixed with a regression (`docs/progress-archive/i-39b.md`).

- I-39c: acid + ester named (ester C in the chain → `R-oxi…-oxo`, else `alcoxicarbonil-`;
  O-bound → `aciloxi-`, `acetiloxi`); diesters on one chain (`butanodioato de dimetilo`,
  `… de etilo y metilo`); still refused: 3+ esters, esters on separate pieces (`esterPrefix`),
  diesters needing locants (new `mixedDiester`). Those three word choices from memory
  (`docs/progress-archive/i-39c.md`).

- I-39d: amides as prefixes beside an acid/ester (`amino…oxo`, `carbamoil-`, `acilamino-`) and on
  a second carbon piece (`2-(acetilamino)etanamida`); `acilamino` chosen over `acetamido` from
  memory; chain rule P4 no longer counts groups on the suffix N; still refused: 3+ amides on one
  chain, substituted diamides, imides, rings (`docs/progress-archive/i-39d.md`).

- I-40a: parent = ring or chain by principal-group count (P-44.1.1), ring wins ties
  (P-44.1.2.2); hydrocarbons keep ring always parent. Ring prefixes incl. `(2-metilciclohexil)`,
  `(ciclohex-2-en-1-il)`, `fenoxi` (I-34's "no fenoxi" now only when the ring side holds the
  principal group). New refusals `symmetricRing` (multiplicative names) and `ringAcyl` (I-40b);
  `(fenilamino)` over `anilino`, `cloro(fenil)metanol` parenthesis convention and the status of
  `acetofenona`/`alcohol bencílico`/`bencilamina` from memory. Both review should-fix
  (`symmetricRing` atom-order dependence, tie wording in explanations) fixed with regressions
  (`docs/progress-archive/i-40a.md`).

- Bundler regex-literal detection is heuristic; duplicate `export *` names:
  first wins. See `docs/progress-archive/i-1.md`.

## Git state

- I-39d `d2574a1`, pushed. I-40a committed and pushed right after this checkpoint (see
  `git log`).
