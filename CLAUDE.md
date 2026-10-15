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
  parser, assembler and tokenizer for open-chain and `ciclo` hydrocarbon
  names, their halogen derivatives and their alcohols, and
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
  style — at its step). R-4a…R-4d (phases I-50a…I-50d) are
  done: the «Anillos» row's `ciclo` tile builds ring parents and ring
  branches (`ciclohexano`, `ciclohex-1-eno`, `ciclohexil`,
  `(ciclohex-2-en-1-il)`; ring bonds 1…n in the search), its `benceno` and
  `fenil` tiles the benzene parent with branch prefixes and phenyl
  branches, also substituted (`1,4-dimetilbenceno`, `(4-metilfenil)`; ring
  carbons 1…6, a phenyl's own prefixes on 2…6, no bond locants on
  benzene), and the aromatic-equivalence key (`graph.js` `aromaticKey()` /
  `aromaticIsomorphism()`) makes both Kekulé drawings one structure in the
  search and its graph checks; the «Nombres tradicionales» row's retained
  templates (`tiles.js` `TEMPLATES`: `tolueno`, `estireno`, `xileno`,
  `mesitileno`, a benzene parent with its own groups; `xileno` takes
  `1,2-` or a letter, left out it is searched) and the «Anillos» row's
  o/m/p letters (`o-xileno`, `o-dimetilbenceno`; `parse.js`
  `checkLetters()` refuses them with three positions, two different
  prefixes or off the parent benzene, design.md §14.4) read as the
  engine's alternatives, a substituted template as `otherName`; two rings
  bonded together or three rings `outOfScope`; the Ayuda section «Del
  nombre al dibujo» has its rings line; and `diagnose.js` names the
  ring's main mistake too (the ring is the parent of a name written on a
  chain, benzene written with `ciclo`, a substituted template, the ring
  numbered otherwise, an o/m/p letter the app does not offer, and the R-3
  form rules on a ring), shown by the same panel with the ring named in
  the legend. R-5a1 (phase I-51a1) is done: the «Grupos» row's halogen
  tiles (`fluoro`, `cloro`, `bromo`, `yodo`) read as prefixes on chains,
  rings, `benceno` and the templates and inside compound branches
  (`(2-cloroetil)`), their left-out locants searched by the carbons' free
  valence (`dodecafluorociclohexano` one placement), and the diagnosis
  reads them as substituents (alphabetical order, numbering, grouping,
  needless locants), with the Ayuda line. R-5a2 (phase I-51a2) is done:
  the «Grupos» row's `hidroxi` and `ol` tiles and the «Anillos» row's
  `fenol` and closing-bond locant `1(n)` read alcohols and phenols on
  chains, rings and `benceno` (`propan-2-ol`, `butano-1,2,3,4-tetrol`,
  `ciclohex-1(6)-eno-1,2,4-triol`, `4-metilfenol`, `p-metilfenol`,
  `2-propanol` old style), their left-out suffix locants searched, and the
  diagnosis keeps its rules where they hold for an OH. R-5a3a (phase
  I-51a3a) is done: the
  «Nombres tradicionales» row's retained phenols (`cresol` with its o/m/p
  letter only, `pirocatecol`, `catecol`, `resorcinol`, `hidroquinona`, each
  with a tooltip) read as the engine's alternatives, `cresol` without its
  letter searched («Falta la letra…»), a substituted one (`4-clorocatecol`)
  as `otherName` with the substituted-template diagnosis, and the Ayuda says
  alcohols and phenols are read, with the alcohol and phenol-template
  lines. R-5a3b (phase I-51a3b) is done, and with it R-5a: `diagnose.js`
  names an alcohol's own mistakes (header «Alcohols»: an OH of the suffix
  written `hidroxi` on the parent, the ring or chain carrying more OH
  groups, another chain with more OH groups, the OH numbered otherwise,
  old-style and needless suffix locants, `bencenol` for `fenol`), each with
  its «Ver el paso» step. R-5b1 (phase I-51b1) is done: the «Grupos» row's
  `oxi` tile, after a branch ending in `il` (a chain or ring, `isopropil`,
  `tert-butil`, `fenil`, a compound branch's own chain), reads alkoxy
  prefixes, contracted and enclosed as the engine writes them (`metoxi`,
  `isopropoxi`, `fenoxi`, `(2-metilpropoxi)`, but `(pentiloxi)`,
  `(propan-2-iloxi)`; `cloro(metoxi)metano`), on chains, rings, `benceno`,
  beside OH groups and halogens and inside compound branches, their
  left-out locants searched, and `anisol` in «Nombres tradicionales»; the
  diagnosis reads alkoxy prefixes as substituents. R-5b2 (phase I-51b2) is
  done, and with it R-5b: the «Grupos» row's `éter` tile reads ether
  functional-class names (`etil metil éter`, `dietil éter`, `tert-butil
  metil éter`; the spaces automatic, each group enclosed as a prefix by
  itself) as the engine's alternatives and any other class name as
  `otherName`, and `diagnose.js` names the ether's own mistakes (header
  «Ethers»: the parent on the other side of the oxygen, told from the
  oxygen; `di` for `bis` before an alkoxy prefix; a class name for an ether
  that has none, in other words, out of order or with a repeated group),
  each with its «Ver el paso» step. R-5c1 (phase I-51c1) is done: the
  «Grupos» row's `al` (the –CHO at the ends of a chain by rule, no locants:
  `butanal`, `butanodial`), `ona` (`pentan-2-ona`, `ciclohexanona`, old
  style `2-pentanona`), `carbaldehído` (`ciclohexano-1,4-dicarbaldehído`,
  `benceno-1,4-dicarbaldehído`), `oxo` and `formil` tiles and the
  «Anillos» row's `benzaldehído` read aldehydes and ketones on chains,
  rings and `benceno` and inside compound branches (`4-oxopentanal`,
  `(2-oxoetil)`, `(4-formilciclohexil)`), their left-out locants searched
  (`butanona` → `butan-2-ona`); a ketone's C=O on a bare end carbon is
  `invalid` (CARBONYL_POSITION), and the diagnosis keeps the rules that
  hold for a carbonyl name. R-5c2 (phase I-51c2) is done: the «Grupos» row's
  `acetil` and the acyl endings `oil` (after a chain's ending: `propanoil`,
  `(but-2-enoil)`, `(2-metilpropanoil)`) and `carbonil` (after a ring's:
  `(ciclohexanocarbonil)`, `(ciclohex-2-eno-1-carbonil)`), and the
  «Anillos» row's `benzoil` (`(4-metilbenzoil)` in a compound branch), read
  acyl prefixes on chains and rings and inside compound branches as the
  engine writes them, their left-out locants searched; an acyl on a
  hydrocarbon ring, `benceno` or a template reads as the ketone it is
  (`otherName`), and the diagnosis keeps the rules that hold for a branch.
  R-5c3a (phase I-51c3a) is done: the «Nombres
  tradicionales» row's retained carbonyl names (`formaldehído`,
  `acetaldehído`, `acetona`, `acetofenona`, `fenilacetaldehído` on an open
  chain; `ftalaldehído`, `isoftalaldehído`, `tereftalaldehído` on benzene,
  each with a tooltip) read as the engine's alternatives, also with the
  prefixes the engine writes on them (`4-metilftalaldehído`,
  `2-(4-metilfenil)acetaldehído`), any other prefix as `otherName` with the
  substituted-template diagnosis (`1-cloroacetona`), and the Ayuda has its
  aldehyde, ketone and acyl line. R-5c3b1 (phase I-51c3b1) is done:
  `diagnose.js` names the principal C=O group's own mistakes (header
  «Aldehydes and ketones», checked right after HYDROXY_PREFIX: a junior group
  as the suffix, `5-oxopentan-2-ona`, `4-oxopentan-2-ol`; `al` on a carbon a
  branch makes a ketone's, `1-metilpropanal`; the –CHO's carbon on the other
  side of the parent, `butano-1-carbaldehído`, `ciclohexilformaldehído`; the
  principal C=O written `oxo`, `formil` or an acyl prefix, `2-oxopropano`,
  `acetilbenceno`; the ring or chain the C=O groups choose; another chain
  with more C=O groups), and P0, N0 and the suffix's needless locants speak
  of «grupos –CHO» / «grupos C=O», each with its «Ver el paso» step.
  R-5c3b2 (phase I-51c3b2) is done, and with it R-5c: `diagnose.js` names a
  branch's own name before the alphabetical order (an acyl word, `etanoil`
  for `acetil`, `(1-oxopropil)` for `propanoil`; an acyl chain,
  `(3-metilpropanoil)` for `butanoil`; a ring branch numbered otherwise,
  `(6-metilbenzoil)`, `2-(5-metilfenil)acetaldehído`, an alcohol's too), the
  1 left out before `carbonil` and a locant on `fenilacetaldehído`, each
  with its «Ver el paso» step. R-5d1 (phase I-51d1) is done: the «Grupos»
  row's class word `ácido` (the first tile of an acid's name, the space
  after it automatic; ACID_WORD when it and an acid suffix do not go
  together), the suffixes `oico` (the –COOH at the ends of a chain by rule,
  no locants: `ácido butanoico`, `ácido butanodioico`) and `carboxílico`
  (`ácido ciclohexano-1,4-dicarboxílico`, `ácido
  benceno-1,3-dicarboxílico`), the prefix `carboxi` (`(carboximetil)`) and
  the «Anillos» row's `benzoico` (`ácido 4-metilbenzoico`) read acids on
  chains, rings and `benceno`, beside the earlier families' groups, their
  left-out locants searched, the engine's `manyAcids` `outOfScope`; the
  diagnosis keeps the rules that hold for an acid name. R-5d2 (phase
  I-51d2) is done: the «Nombres tradicionales» row's retained acid names
  (`fórmico`, `acético`, `oxálico`, `fenilacético`, `ftálico`, `isoftálico`,
  `tereftálico`, after `ácido`, each with a tooltip) read as the engine's
  alternatives, also with the prefixes the engine writes on them (`ácido
  4-metilftálico`, `ácido 2-(3-metilfenil)acético`), any other prefix as
  `otherName` with the substituted-template diagnosis, and the Ayuda has its
  acid line. R-5d3 (phase I-51d3) is done, and with it R-5d: `diagnose.js`
  names an acid's own mistakes (header «Acids», checked first: a –COOH
  written as two groups on one carbon, `1-hidroxipropanal`; a junior group
  as the suffix, `4-carboxibutan-2-ona`, with the seniority
  `ácido > aldehído > cetona > alcohol`; the –COOH's carbon on the other
  side of the parent, `ácido propano-1-carboxílico`, `ácido fenilfórmico`;
  the principal –COOH written `carboxi`, `carboxiciclohexano`, `ácido
  3-carboxipropanoico`; the ring or chain the –COOH groups choose; another
  chain with more –COOH groups), and N0 numbering and the suffix's needless
  locants speak of «grupos –COOH», each with its «Ver el paso» step. Next
  is R-6a (phase I-52a): esters.
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
