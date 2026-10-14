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
| I-40b | v2.20b Acids and aldehydes with a ring, ring acyl prefixes (split from I-40) | same, §3.20 | done — `docs/progress-archive/i-40b.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-40b.md` |
| I-40c | v2.20c Nitriles and amides with a ring (split from I-40) | same, §3.20 | done — `docs/progress-archive/i-40c.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-40c.md` |
| I-40d | v2.20d Ring esters (split from I-40) | same, §3.20 | done — `docs/progress-archive/i-40d.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-40d.md` |
| I-41a | v2.21a 90° view for acyclic heteroatom molecules (split from I-41) | same, §3.21 | done — `docs/progress-archive/i-41a.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-41a.md` |
| I-41b | v2.21b CHO/COOH optional abbreviations (split from I-41) | same, §3.21 | done — `docs/progress-archive/i-41b.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-41b.md` |
| I-41c | v2.21c Ayuda, examples and docs wrap-up (split from I-41) | same, §3.21 | done — `docs/progress-archive/i-41c.md` | routine / opus | Codex ship, 0 findings — `docs/reviews/I-41c.md` |

| I-42a | v3 Benzene parent with prefixes: naming engine, explanation, design §14 (split from I-42) | `autoclaude/processed/220-polysubstituted-benzenes.md` "I-42" | done — `docs/progress-archive/i-42a.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-42a.md` |
| I-42b | v3 Benzene parent with prefixes: oracle `randomBenzene` 1–6 groups, e2e, Ordenar dibujo / 90° checks (split from I-42) | same, "I-42" | done — `docs/progress-archive/i-42b.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-42b.md` |
| I-43a | v3 One OH or amine on the ring, plus prefixes | same, "I-43a" | done — `docs/progress-archive/i-43a.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-43a.md` |
| I-43b | v3 One outside-carbon suffix (COOH/CHO/CN/CONH₂) on the ring, plus prefixes | same, "I-43b" | done — `docs/progress-archive/i-43b.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-43b.md` |
| I-44 | v3 Several identical principal groups on the ring | same, "I-44" | done — `docs/progress-archive/i-44.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-44.md` |
| I-45a | v3 Substituted phenyl and phenoxy as a substituent | same, "I-45a" | done — `docs/progress-archive/i-45a.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-45a.md` |
| I-45b | v3 Substituted benzoyl | same, "I-45b" | done — `docs/progress-archive/i-45b.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-45b.md` |
| I-45c | v3 Esters with substituted rings | same, "I-45c" | done — `docs/progress-archive/i-45c.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-45c.md` |
| I-46 | v3 Wrap-up (Ayuda, examples, README, CLAUDE.md scope, oracle README) | same, "I-46" | done — `docs/progress-archive/i-46.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-46.md` |

| I-47a | v4 R-1a Tile catalogue, parser, assembler, tokenizer (open-chain hydrocarbons) | `autoclaude/processed/230-name-to-structure.md` + design §15.8 "R-1a" | done — `docs/progress-archive/i-47a.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-47a.md` |
| I-47b | v4 R-1b `interpret.js` + `build.js`, `readName()` for fully located names | same, "R-1b" | done — `docs/progress-archive/i-47b.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-47b.md` |
| I-47c | v4 R-1c Left-out locants (search, `missingLocants`/`ambiguous`/`incomplete`) | same, "R-1c" | done — `docs/progress-archive/i-47c.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-47c.md` |
| I-48a | v4 R-2a The «¿Cómo se dibuja?» dialog | same, "R-2a" | done — `docs/progress-archive/i-48a.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-48a.md` |
| I-48b | v4 R-2b «Dibujar», results entry point, Ayuda, e2e | same, "R-2b" | done — `docs/progress-archive/i-48b.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-48b.md` |
| I-49 | v4 R-3 Diagnosis for hydrocarbons | same, "R-3" | split into I-49a (engine) and I-49b (UI) | — | — |
| I-49a | v4 R-3a Diagnosis engine (`diagnose.js`) | same, "R-3" | done — `docs/progress-archive/i-49a.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-49a.md` |
| I-49b | v4 R-3b Diagnosis in the results panel (message, highlight, «Ver el paso», Ayuda, e2e) | same, "R-3" | done — `docs/progress-archive/i-49b.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-49b.md` |
| I-50 | v4 R-4 Rings and retained aromatic templates | same, "R-4" | split into I-50a, I-50b, I-50c | — | — |
| I-50a | v4 R-4a `ciclo` parents and ring branches (`ciclohexano`, `ciclohex-1-eno`, `ciclohexil`) | same, "R-4" | done — `docs/progress-archive/i-50a.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-50a.md` |
| I-50b | v4 R-4b `benceno`, `fenil`, substituted `(4-metilfenil)`, aromatic-equivalence key | same, "R-4" | done — `docs/progress-archive/i-50b.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-50b.md` |
| I-50c | v4 R-4c Retained templates (`tolueno`, `estireno`, `xileno`, `mesitileno`), o/m/p aliases, Ayuda line, e2e | same, "R-4" | done — `docs/progress-archive/i-50c.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-50c.md` |
| I-50d | v4 R-4d Ring diagnosis messages (incl. «el anillo es la cadena principal»), shown by the I-49b panel, e2e | same, "R-4" | queued | — | — |
| I-51a | v4 R-5a Halogens and alcohols | same, "R-5a" | queued | — | — |
| I-51b | v4 R-5b Ethers | same, "R-5b" | queued | — | — |
| I-51c | v4 R-5c Aldehydes and ketones | same, "R-5c" | queued | — | — |
| I-51d | v4 R-5d Acids | same, "R-5d" | queued | — | — |
| I-52a | v4 R-6a Esters | same, "R-6a" | queued | — | — |
| I-52b | v4 R-6b Nitriles | same, "R-6b" | queued | — | — |
| I-52c | v4 R-6c Amines | same, "R-6c" | queued | — | — |
| I-52d | v4 R-6d Amides | same, "R-6d" | queued | — | — |
| I-53 | v4 R-7 Wrap-up | same, "R-7" | queued | — | — |

The twelve original plan items and user-feedback items I-13…I-20 are done.
v2 plan (user-confirmed scope): I-21…I-41c all done — the plan is complete
(I-41 split into I-41a 90° view for heteroatoms, I-41b CHO/COOH abbreviations, I-41c wrap-up;
I-27 split into I-27a editor drawing and I-27b Ordenar dibujo; I-39 into I-39a `ciano-`,
I-39b acyl prefixes, I-39c ester prefixes + diesters, I-39d amide prefixes + pair matrix;
I-40 into I-40a ring prefixes on a functional chain, I-40b acids/aldehydes + ring acyl
prefixes, I-40c nitriles/amides with a ring, I-40d ring esters);
phases may be split as they are selected. The v2 plan now lives in
`docs/design.md` §13.
v3 plan (user-confirmed 2026-10-13, polysubstituted benzenes): I-42…I-46, all done, from
`autoclaude/processed/220-polysubstituted-benzenes.md`, run in table order; I-42 records the
user's decisions as `docs/design.md` §14 (pointer from §13.1).
v4 plan (user-confirmed 2026-10-14, name → drawing, «¿Cómo se dibuja?»): I-47a…I-53, one per
phase R-1a…R-7 of `docs/design.md` §15.8 (R-n ↔ I-(46+n), letters kept), run in table order and
split further if a phase does not fit one worker. Spec: `autoclaude/processed/230-name-to-structure.md`
+ design §15 (read from the working tree — see *Open risks*, «design.md §15 uncommitted»).

## Inbox

- 2026-09-27 pickups 1–8: items `010-*` … `200-*` → queued as I-1…I-20 in filename order
  (`210-rings-functional-groups.md` deferred pending the user's scope decisions).
- 2026-09-27 pickup 9 (after I-20): `215-rings-functional-groups-confirmed.md` — the re-drop of
  210 with the v2 scope and §4 decisions confirmed by the user → queued as I-21…I-41, one per
  plan phase §3.1…§3.21.
- 2026-10-13 pickup 10 (plan complete): `220-polysubstituted-benzenes.md` — user-confirmed
  scope lift (benzenes with 2–6 substituents; o/m/p only under Otras formas) → queued as
  I-42, I-43a, I-43b, I-44, I-45a, I-45b, I-45c, I-46, one per phase of the item.
- 2026-10-14 pickup 11 (plan complete): `230-name-to-structure.md` — user-confirmed v4 scope (build
  a name from tiles, the app draws it and gives a verdict; plan in design §15) → queued as
  I-47a…I-53, one per phase R-1a…R-7 of design §15.8.

## Next action

Select and run I-50d (v4 R-4d, the last part of R-4, split from I-50c on 2026-10-14): ring
diagnosis messages in `diagnose.js` (today `null` for every ring verdict — I-50a…I-50c), shown by
the I-49b panel (`results.js` `showVerdict()`: message, the student's chain beside the parent,
«Ver el paso»). Must include «el anillo es la cadena principal» (`1-(4-metilfenil)propano` →
`otherName` «1-metil-4-propilbenceno»; `ciclo` cases: a chain parent whose ring branch should be
the parent, and the reverse), and the R-3 rules as they apply on a ring (numbering from the wrong
start/direction, prefixes not alphabetical, identical prefixes not grouped, needless or missing
locants), plus the template / o-m-p cases I-50c reads as `otherName` (a substituted template such
as `4-metiltolueno` / `p-metiltolueno`) — see `docs/progress-archive/i-50c.md` for what each now
returns; e2e for one ring diagnosis. Spec: design §15.2–§15.9 (R-3 rules, the R-4 row, «each
family phase also adds … its diagnosis messages»), §14.4 — read from the working-tree
`docs/design.md`; never edit or commit it (see *Open risks*). Risk high; worker opus. Commit by
explicit paths. Then R-5a (I-51a: halogens and alcohols).

- **Builds on** the R-1 engine (`src/reverse/`: tiles, parser, assembler, tokenizer, `interpret.js`,
  `build.js`, `search.js`, `readName()` — `docs/progress-archive/i-47a.md` … `i-47c.md`), the dialog
  and «Dibujar» (`i-48a.md`, `i-48b.md`), the diagnosis engine and panel (`i-49a.md`, `i-49b.md`),
  `ciclo` rings (`i-50a.md`), benzene/phenyl and the aromatic key (`i-50b.md`), retained templates
  and o/m/p letters (`i-50c.md`); the forward naming
  engine already names every ring case (v2 §13, v3 §14).

Deploying (`npm run deploy`) stays a manual user step; Ayuda/example wording awaits teacher review
(design §14.6, §15.9).

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
- Ring acids (I-40b): `-carboxílico`/`-carbaldehído` on rings, `carboxi-`, `benzoil` /
  `(ciclohexanocarbonil)` in `principal.js` / `rings.js` / `substituent.js` / `render.js`;
  explain `acidCompanions()`; oracle `generateRingAcids()`; tests `tests/unit/ring-acids.test.js`,
  `tests/e2e/ring-acids.spec.js`.
- Ring nitriles/amides (I-40c): `-carbonitrilo`/`-carboxamida` on rings, `N-fenil…amida`, `ciano-` /
  `carbamoil-` on rings in `principal.js` / `rings.js` / `substituent.js` / `render.js`; explain
  `branchAmideHow()`; oracle `generateRingNitrilesAmides()`; tests
  `tests/unit/ring-nitriles-amides.test.js`, `tests/e2e/ring-nitriles-amides.spec.js`.
- Ring esters (I-40d): `ringEster` retired; `esterRingSplit()` / `isLactone()` in `validate.js`
  (two-ring `benzoato de fenilo`, lactone refusal), two-ring key in `graph.js`, two-part naming in
  `naming/index.js`; oracle `generateRingEsters()`; tests `tests/unit/ring-esters.test.js`,
  `tests/e2e/ring-esters.spec.js`.
- 90° heteroatoms (I-41a): heteroatom gate removed in `projectRightAngles()`
  (`src/layout/rightangle.js`), chain-end continuation into a branch, `HO`/`H₂N` labels via
  `rightAngleLabel()` in `render.js`; tests `tests/unit/rightangle-hetero.test.js`,
  `tests/e2e/right-angles-hetero.spec.js`.
- CHO/COOH abbreviations (I-41b): group detection and label geometry in `src/layout/rightangle.js`
  / `src/editor/labels.js` / `render.js`, label hit box in `geometry.js`, toggle in
  `src/ui/canvasbar.js` (localStorage `organicWeb.abbreviations`); tests
  `tests/unit/abbreviations.test.js`, `tests/e2e/abbreviations.spec.js`.
- Wrap-up (I-41c): Ayuda text in `index.html` (`src/ui/help.js`), grouped examples in
  `src/ui/examples.js` (tests in `tests/unit/layout.test.js`, `tests/e2e/redraw.spec.js`),
  oracle generators documented in `scripts/oracle/README.md`.
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
- Name → drawing (v4, I-47a…): pure `src/reverse/` — `tiles.js` (catalogue from `lexicon.es.js`),
  `parse.js` (`parse(ids)` → `{tree, errors}`), `assemble.js` (`{text, spans}`), `tokenize.js`,
  `interpret.js`, `build.js`, `search.js` (left-out placements, budget, naming cache),
  `index.js` (`readName()`); `isomorphism()` in `src/model/graph.js`; tests
  `tests/unit/reverse-*.test.js`, helper `tests/unit/reverse-words.js`; spec design §15. Dialog
  (I-48a): `src/ui/name-builder.js` + DOM-free `name-builder-state.js`, wired in `app.js`; tests
  `tests/unit/name-builder-state.test.js`, `tests/e2e/name-builder.spec.js`. «Dibujar» (I-48b):
  `src/ui/draw-name.js` (`drawVerdict()`), `showVerdict()` in `results.js`, `loadMolecule(…,
  {center: true})` in `src/editor/editor.js`; tests `tests/unit/draw-name.test.js`.
- Highlight switch: `canvasMarks()` / `makeMarksToggle()` in `src/ui/results.js`
  (localStorage `organicWeb.highlights`).
- Diagnosis (I-49a): `src/reverse/diagnose.js` (`diagnose`, `diagnosisExplanation`,
  `diagnosisStepIndex`, `DIAGNOSIS_TEXTS`); `ownPrefixAtoms()` in `src/reverse/build.js`; tests
  `tests/unit/reverse-diagnose.test.js`.
- Rings in the reverse engine (I-50a): «Anillos» row / `ciclo` tile in `src/reverse/tiles.js`, ring
  nodes through `parse`/`assemble` (`enclosedAt()` crowded rule)/`tokenize`/`interpret`/`build`/
  `search`/`index.js`; tests `tests/unit/reverse-rings.test.js`, `tests/e2e/name-builder-rings.spec.js`.
- Benzene in the reverse engine (I-50b): `benceno` / `fenil` tiles (same modules), error
  `BENZENE_BONDS`; aromatic key `kekuleNeutral()` / `aromaticKey()` / `aromaticIsomorphism()` in
  `src/model/graph.js`; tests `tests/unit/reverse-benzene.test.js`, `tests/e2e/name-builder-benzene.spec.js`.

## Verification (last phases)

- Older phases: see each `docs/progress-archive/i-*.md`.
- I-50a: `npm test` 0 (1880) · `check` 0 (170) · `build` 0 · `e2e` 0 (469); after the review fix
  the same four, same counts.
- I-50b: `npm test` 0 (1904) · `check` 0 (172) · `build` 0 · `e2e` 0 (475); one earlier full e2e
  run had a flaky dist failure in `diagnosis.spec.js` (keyboard test), 72/72 on
  `npx playwright test tests/e2e/diagnosis.spec.js --repeat-each=4`. Review ship, no fixes.
- I-50c: `npm test` 0 (1922) · `npm run check` 0 (174) · `npm run build` 0 ·
  `npm run e2e -- --reporter=dot` 0 (481, source + dist). Review ship, no fixes.

## Open risks / deviations

- I-49b decision open to the user: for a diagnosed verdict the stepper explains the naming in the
  student's prefix style, so the ordered drawing's locants follow that naming even with the stepper
  closed (`6-metil-4-(propan-2-il)nonano`: canvas numbered as `4-metil-6-(propan-2-il)nonano`, «Se
  llama» `4-isopropil-6-metilnonano`). An `OLD_STYLE` diagnosis replaces the old-style note. See
  `docs/progress-archive/i-49b.md`.

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
  fail Ordenar dibujo checks (drawing kept, message shown); deploy https-only, `--dry-run` never
  reads the Keychain. (The Ejemplos undo-view limitation was fixed in I-48b.)

- I-21…I-28 (multi-element model, SMILES, palette, ring infrastructure, cycloalkanes, substituted
  rings, ring tool, Ordenar dibujo for rings, benzene): deviations and review resolutions in
  `docs/progress-archive/i-21.md` … `i-28.md`. Still relevant: fused vs bridged exact only for two
  rings; oracle compares at most two rings (I-40d); chain-parent layouts take branches in atom-id
  order; benzene monosubstituted only; `tolueno` preferred-name status from memory.

- I-29…I-41c (functional groups, rings as substituents, ring esters, 90° view, abbreviations,
  wrap-up): deviations, decisions from memory and review resolutions in
  `docs/progress-archive/i-29.md` … `i-41c.md`. Still relevant: many retained-name statuses and
  prefix word choices rest on memory, not oracle checks (OPSIN judges structure only); seed 7 keeps
  2 pre-existing carbonyl generator failures; `cianometil` branch explained as "un grupo de 2
  carbonos"; the ring step calls an ester prefix on the ring «una rama»; Ayuda/example wording not
  teacher-reviewed.

- I-42a…I-46 (v3 polysubstituted benzenes): deviations, decisions from memory and review
  resolutions in `docs/progress-archive/i-42a.md` … `i-46.md`. Still relevant: Spanish
  alphabetical order (`1-metil-4-metoxibenceno`); N-substituted benzene diamines/diamides, junior
  groups on a substituted phenyl/benzoyl/ester ring, two rings and benzene diesters stay refused;
  retained-name and o/m/p choices (xileno/mesitileno, `catecol`, `bencenohexol`, no
  `toluoil`/`toluato`/`tolilo`/`cresilo`) rest on memory; v3 Ayuda wording pending teacher review.

- I-47a: branch enclosed whenever it shows a locant; legacy count mismatch → `LEGACY`; new
  `ROOT_END`/`TILE_ORDER`/`LOCANT_COUNT` situations; `cloro(metoxi)metano` brackets → R-4/R-5b, suffix
  half of rule 4 → R-5a; Spanish error texts are drafts. Review should-fix (tokenizer stack overflow)
  fixed with `TOKENIZE_MAX_LENGTH`; `parse`/`assemble` safe to 2000 nested branches — R-2a's dialog
  should cap the tile count (`docs/progress-archive/i-47a.md`).
- I-47b: no real open-chain `outOfScope` case, tested via an injected namer; old-style note
  rewrites the student's own name; new draft error wordings (`docs/progress-archive/i-47b.md`).
- I-47c: R-4 must make `isomorphism()` treat both Kekulé benzenes as equivalent (else
  `placementReading()` throws); unplaceable left-out locants → `invalid`; old style + left-out →
  `ambiguous`; review fixes in `docs/progress-archive/i-47c.md`.
- I-48a: added a "start of name" insertion point; tile cap 100 (`aria-disabled` tiles + message);
  success verdicts only show their message until R-2b; new Spanish drafts (row labels, placeholder,
  «Principio del nombre», «menos», cap message). Review should-fix (short-phone overflow) fixed with
  a 320×480 / 320×568 regression (`docs/progress-archive/i-48a.md`).
- I-48b: «Tu nombre: …» line added to the verdict block (not in spec); layout-failure path
  unit-tested only (no failing name found in 2 000 random molecules); new Spanish drafts («Tu
  nombre:», Ayuda «Del nombre al dibujo»). Review should-fix (undo kept the new zoom) fixed with
  view snapshots in `loadMolecule(…, {center: true})`, also used by Ejemplos
  (`docs/progress-archive/i-48b.md`).
- I-49a: R-3 split into engine (I-49a) and UI (I-49b); left-out locants → kindest of up to 16
  readings (`diagnosis.student` may differ from `studentParent`); `null` diagnosis for a branch in a
  style the engine does not offer or a branch with its own chain/numbering wrong; four rules
  documented as unable to occur as `otherName`; new Spanish drafts (`DIAGNOSIS_TEXTS`). Review
  should-fix ×3 (style by structure, nested identity, step context → `diagnosisExplanation()`)
  fixed with regressions (`docs/progress-archive/i-49a.md`).
- I-50a: R-4 split into I-50a/b/c; `ciclohex-1-eno` → `otherName` (engine has no located form);
  filled comparison also tries the parent's prefix / multiple-bond locants unwritten; keyless
  multi-ring names and all-refused structure sets → `outOfScope` before/after the search; `1(3)`
  closing-bond locants wait for R-5a; ring diagnosis `null` until I-50c; new Spanish drafts. Review
  should-fix (wrapped ring branch skipped crowded enclosure) fixed with regressions
  (`docs/progress-archive/i-50a.md`).
- I-50b: hydrocarbon `fenil` names are never the engine's (the ring is the parent), so
  `1-(4-metilfenil)propano` → `otherName`; round trip skips 18 retained/o-m-p alternatives (I-50c) and
  10 halogen/alkoxy rows (R-5a/b); new Spanish drafts incl. `BENZENE_BONDS`; e2e has load-dependent
  flakes (`diagnosis.spec.js` keyboard, `polish.spec.js` phone toolbar, dist only)
  (`docs/progress-archive/i-50b.md`).
- I-50c: R-4c split into I-50c (templates, o/m/p, Ayuda) and I-50d (ring diagnosis); templates in a
  new «Nombres tradicionales» row; a template is a benzene parent spec with a `template` field;
  substituted templates (`4-metiltolueno`) → `otherName`/`ambiguous`, not `invalid`; a letter on
  one `tolueno` prefix (`p-metiltolueno`) reads as that prefix's position; new `TEMPLATE_LOCANTS`
  error; the tile-word test skips one-letter words (the conjunction «o»); the I-50b archive's
  breakdown of the 18 skipped names was wrong (real list in `i-50c.md`); new Spanish drafts
  (`docs/progress-archive/i-50c.md`).

- **design.md §15 uncommitted (user's working tree).** The v4 plan (§15, ~370 added lines) and the
  Codex plan review `docs/reviews/v4-plan-codex.md` exist only as the user's uncommitted changes
  (the runner's preflight-dirty list, 2026-10-14). Per the autoclaude rules they are the user's:
  phases read them from disk but never edit, commit or revert them, and commit by explicit path.
  So the item's «every phase updates the Status column of §15.8» is tracked here in the phase table
  instead; once the user commits design.md, the next phase brings the §15.8 Status column up to date.
  User action wanted: commit `docs/design.md` and `docs/reviews/v4-plan-codex.md`.

- Bundler regex-literal detection is heuristic; duplicate `export *` names:
  first wins. See `docs/progress-archive/i-1.md`.

## Git state

- I-50b `80c943a`, pushed. I-50c committed and pushed right after this checkpoint (see
  `git log`). User's uncommitted paths, never ours to commit: `docs/design.md`,
  `docs/reviews/v4-plan-codex.md`, `.DS_Store`.
