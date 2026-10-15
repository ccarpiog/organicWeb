# Key paths — v1, v2 and v3 (I-1…I-46)

Moved out of `PROGRESS.md` (size budget) at the I-52c4a checkpoint; still current.

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
- v2 functional groups (I-32…I-40d; tests `tests/unit/<family>.test.js` + `tests/e2e/<family>.spec.js`,
  details in each `docs/progress-archive/i-*.md`): kinds in `src/naming/principal.js` (carbonyl, acid,
  amine, amide, nitrile; `outsideCarbons()` for `ciano-`), refusals in `validate.js` (`ringAldehyde`,
  `sideChainCarbonyl`, `manyAcids`, `symmetricEther`, `esterPrefix`, `symmetricAmine`, `imide`,
  `manyNitriles`, `symmetricRing`, `esterRingSplit()` / `isLactone()`, …); ether parent side in
  `parent.js`, alkoxy prefixes in `substituent.js`, N5 tie-break `compareNameKeys()` in `numbering.js`;
  ester O-bound group `esterAlkylName()`, acyl endings `acylEndingTokens()`, `N` locants in `render.js`;
  ring prefixes (`ciclohexil`, `fenil`, `fenoxi`, `benzoil`, `(ciclohexanocarbonil)`) in
  `substituent.js` / `render.js`; ring suffixes (`-carboxílico`, `-carbaldehído`, `-carbonitrilo`,
  `-carboxamida`) in `rings.js`; oracle generators `generateAmides()` … `generateRingEsters()`.
- 90° heteroatoms / CHO-COOH abbreviations / v2 wrap-up (I-41a…c): `projectRightAngles()` and group
  detection in `src/layout/rightangle.js`, labels in `src/editor/labels.js` / `render.js`, toggle in
  `src/ui/canvasbar.js` (localStorage `organicWeb.abbreviations`); Ayuda in `index.html`, grouped
  examples in `src/ui/examples.js`; details in `docs/progress-archive/i-41a.md` … `i-41c.md`.
- Polysubstituted benzenes (I-42a/b): design §14; Kekulé-neutral numbering in `numbering.js` /
  `rings.js`, naming and aliases in `aromatic.js` / `index.js`, `ringOmitsLocants` in
  `lexicon.es.js`, refusal message in `validate.js`, numbering step in `explain.js`; tests
  `tests/unit/polysubstituted-benzenes.test.js`, `tests/e2e/polysubstituted-benzenes.spec.js`; oracle
  `randomBenzene` places 1–6 groups.
- Phenols/benzenamines with prefixes (I-43a): gate in `validate.js`, principal-locant-1 naming and
  cresol/anilina aliases in `aromatic.js` / `render.js`; e2e `tests/e2e/phenols-anilines.spec.js`;
  oracle `generateRingPrincipalBenzenes()`.
- Ring suffix groups with prefixes (I-43b): e2e `tests/e2e/substituted-benzoic.spec.js`; oracle
  `generateRingOutsideBenzenes()`.
- Several identical ring principal groups (I-44): gate `ringPrincipalGroups()` in `validate.js`
  (most senior ring group, one or more times); tests `tests/unit/benzene-polysuffix.test.js`,
  `tests/e2e/benzene-polysuffix.spec.js`; oracle `generateRingPolysuffixBenzenes()`.
- Substituted phenyl/phenoxy (I-45a): admission in `validate.js`, phenyl numbering in
  `substituent.js` / `render.js`; tests `tests/unit/substituted-phenyl.test.js`,
  `tests/e2e/substituted-phenyl.spec.js`; oracle `generateSubstitutedPhenyls()`.
- Substituted benzoyl (I-45b): benzoyl prefixes in `render.js` / `index.js`, explanation in
  `explain.js` (`ringCarbonylDescription`, `acylaminoDescription`); tests
  `tests/unit/substituted-benzoyl.test.js`, `tests/e2e/substituted-benzoyl.spec.js`; oracle
  `generateSubstitutedBenzoyls()`.
- Substituted-ring esters (I-45c): per-ring gate in `validate.js`, benzoate/phenyl-ester naming in
  `principal.js` / `render.js`, explain ester step; tests `tests/unit/substituted-esters.test.js`,
  `tests/e2e/substituted-esters.spec.js`; oracle `generateSubstitutedEsters()`.
- v3 wrap-up (I-46): Ayuda notes `#help-benzenes` / `#help-omp` in `index.html`, examples group
  «Bencenos con varios sustituyentes» in `src/ui/examples.js`.
