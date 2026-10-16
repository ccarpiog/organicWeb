# PROGRESS — organicWeb

Live checkpoint for the autoclaude loop. Plan: `PLAN.md` → phases are the
inbox items `autoclaude/inbox/010-*.md` … `120-*.md`, executed in filename
order, each queued as an `I-n` phase when triaged. Spec: `docs/design.md`.

## Phases

| id | title | spec | status | risk / worker | review |
|---|---|---|---|---|---|
| I-1…I-20 | v1 (scaffold, model, naming engine, oracle, editor, explanations, redraw, release) and user feedback (carbon dots, drag chain, 90° view, highlights, credit, undo fix, deploy) | `autoclaude/processed/010-*` … `200-*` | done — `docs/progress-archive/i-1.md` … `i-20.md` | routine or high / opus | Codex, all ship or fixed — `docs/reviews/I-1.md` … `I-20.md` |

| I-21…I-41c | v2 (multi-element model, SMILES, palette, rings, cycloalkanes, benzene, functional groups halogens…nitriles, prefixes, rings as substituents, ring esters, 90° view, abbreviations, wrap-up), splits I-27a/b, I-39a…d, I-40a…d, I-41a…c | `autoclaude/processed/215-rings-functional-groups-confirmed.md` §3.1…§3.21 | done — `docs/progress-archive/i-21.md` … `i-41c.md` | high or routine / opus | Codex, all ship or fixed (I-30: 1 declined) — `docs/reviews/I-21.md` … `I-41c.md` |

| I-42a…I-46 | v3 polysubstituted benzenes (benzene parent with prefixes, OH/amine and outside-carbon suffixes on the ring, several identical principal groups, substituted phenyl/phenoxy/benzoyl, substituted-ring esters, wrap-up) | `autoclaude/processed/220-polysubstituted-benzenes.md` "I-42" … "I-46" | done — `docs/progress-archive/i-42a.md` … `i-46.md` | high or routine / opus | Codex, all ship or fixed — `docs/reviews/I-42a.md` … `I-46.md` |

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
| I-50d | v4 R-4d Ring diagnosis messages (incl. «el anillo es la cadena principal»), shown by the I-49b panel, e2e | same, "R-4" | done — `docs/progress-archive/i-50d.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-50d.md` |
| I-51a | v4 R-5a Halogens and alcohols | same, "R-5a" | done — split into I-51a1, I-51a2, I-51a3 | — | — |
| I-51a1 | v4 R-5a1 Halogen prefixes (`fluoro`/`cloro`/`bromo`/`yodo` tiles, «Grupos» row, search, diagnosis, Ayuda line, e2e) | same, "R-5a" | done — `docs/progress-archive/i-51a1.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-51a1.md` |
| I-51a2 | v4 R-5a2 Alcohols and phenols (`ol`, `hidroxi`, `fenol`, diol/`tetrol` morphology, the `1(6)` locant control) | same, "R-5a" | done — `docs/progress-archive/i-51a2.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-51a2.md` |
| I-51a3 | v4 R-5a3 Retained phenol templates, alcohol diagnosis, Ayuda line | same, "R-5a" | done — split into I-51a3a, I-51a3b | — | — |
| I-51a3a | v4 R-5a3a Retained phenol templates (`o/m/p-cresol`, `catecol`/`pirocatecol`, `resorcinol`, `hidroquinona`), Ayuda line, e2e | same, "R-5a" | done — `docs/progress-archive/i-51a3a.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-51a3a.md` |
| I-51a3b | v4 R-5a3b Alcohol diagnosis messages (fill the deliberate nulls of I-51a2/I-51a3a), e2e | same, "R-5a" | done — `docs/progress-archive/i-51a3b.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-51a3b.md` |
| I-51b | v4 R-5b Ethers | same, "R-5b" | done — split into I-51b1, I-51b2 | — | — |
| I-51b1 | v4 R-5b1 Alkoxy and phenoxy prefixes (`oxi` tile, automatic contraction), `anisol`, search, round trips, Ayuda line, e2e | same, "R-5b" | done — `docs/progress-archive/i-51b1.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-51b1.md` |
| I-51b2 | v4 R-5b2 Ether class names (`etil metil éter`, `dietil éter`), ether diagnosis messages (fill the I-51b1 nulls) | same, "R-5b" | done — `docs/progress-archive/i-51b2.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-51b2.md` |
| I-51c | v4 R-5c Aldehydes and ketones | same, "R-5c" | done — split into I-51c1, I-51c2, I-51c3 | — | — |
| I-51c1 | v4 R-5c1 Suffixes `al`/`ona`/`carbaldehído`, `benzaldehído`, `oxo`/`formil` prefixes, search, round trips, deliberate «Aldehydes and ketones» nulls, e2e | same, "R-5c" | done — `docs/progress-archive/i-51c1.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-51c1.md` |
| I-51c2 | v4 R-5c2 Acyl prefixes (`acetil`, `propanoil`, `benzoil`, `(4-metilbenzoil)`, `ciclohexanocarbonil`) | same, "R-5c" | done — `docs/progress-archive/i-51c2.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-51c2.md` |
| I-51c3 | v4 R-5c3 Retained carbonyl templates, aldehyde/ketone diagnosis (fill the I-51c1/c2 nulls), Ayuda line | same, "R-5c" | done — split into I-51c3a, I-51c3b | — | — |
| I-51c3a | v4 R-5c3a Retained carbonyl templates (`formaldehído` … `tereftalaldehído`), Ayuda carbonyl line, e2e | same, "R-5c" | done — `docs/progress-archive/i-51c3a.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-51c3a.md` |
| I-51c3b | v4 R-5c3b Aldehyde/ketone diagnosis messages (fill the I-51c1/c2/c3a nulls), e2e | same, "R-5c" | done — split into I-51c3b1, I-51c3b2 | — | — |
| I-51c3b1 | v4 R-5c3b1 Principal-group carbonyl diagnoses (suffix not the engine's, C=O parent, P0/N0, needless suffix locants), e2e | same, "R-5c" | done — `docs/progress-archive/i-51c3b1.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-51c3b1.md` |
| I-51c3b2 | v4 R-5c3b2 Acyl-word and `acetaldehído`-phenyl diagnoses (the last carbonyl nulls) | same, "R-5c" | done — `docs/progress-archive/i-51c3b2.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-51c3b2.md` |
| I-51d | v4 R-5d Acids | same, "R-5d" | split into I-51d1, I-51d2, I-51d3 | — | — |
| I-51d1 | v4 R-5d1 `ácido` class word, `oico` / `carboxílico` suffixes, `ácido benzoico`, `carboxi` prefix; search, round trips, deliberate «Acids» nulls, e2e | same, "R-5d" | done — `docs/progress-archive/i-51d1.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-51d1.md` |
| I-51d2 | v4 R-5d2 Retained acid templates (`fórmico`, `acético`, `oxálico`, `fenilacético`, the ftálico family), Ayuda acid line, e2e | same, "R-5d" | done — `docs/progress-archive/i-51d2.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-51d2.md` |
| I-51d3 | v4 R-5d3 Acid diagnosis messages (fill the I-51d1/d2 nulls and the carbonyl sweeps' acid nulls), e2e | same, "R-5d" | done — `docs/progress-archive/i-51d3.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-51d3.md` |
| I-52a | v4 R-6a Esters | same, "R-6a" | done — split into I-52a1, I-52a2, I-52a3 | — | — |
| I-52a1 | v4 R-6a1 Ester suffixes `oato` / `carboxilato`, `benzoato`, the O-bound side (automatic ` de ` / ` y `, `ilo`, its own multipliers); search, round trips, deliberate «Esters» nulls, e2e | same, "R-6a" | done — `docs/progress-archive/i-52a1.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-52a1.md` |
| I-52a2 | v4 R-6a2 Retained `formiato` / `acetato` (and any other retained ester name the engine writes), ester prefixes (`aciloxi`, `alcoxicarbonil`), Ayuda ester line, e2e | same, "R-6a" | split into I-52a2a, I-52a2b | — | — |
| I-52a2a | v4 R-6a2a Retained ester names (`formiato`, `acetato`, `fenilacetato`, `2-(4-metilfenil)acetato`), Ayuda ester line, e2e | same, "R-6a" | done — `docs/progress-archive/i-52a2a.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-52a2a.md` |
| I-52a2b | v4 R-6a2b Ester prefixes (`aciloxi`: `acetiloxi`…; `alcoxicarbonil`: `metoxicarbonil`…) as the engine writes them, Ayuda prefix sentence, e2e | same, "R-6a" | done — `docs/progress-archive/i-52a2b.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-52a2b.md` |
| I-52a3 | v4 R-6a3 Ester diagnosis messages (fill the I-52a1/a2 nulls, the carbonyl fixture sweep's 8 ester nulls, `1-metoxipropanal`, an ester written as an ether class name), e2e | same, "R-6a" | done — split into I-52a3a, I-52a3b | — | — |
| I-52a3a | v4 R-6a3a Principal ester group diagnoses (`seniority`, `count`, `carbon`, `numbering`, `suffix`, `inChain` nulls), e2e | same, "R-6a" | done — `docs/progress-archive/i-52a3a.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-52a3a.md` |
| I-52a3b | v4 R-6a3b O-bound side (`oBound`), ester prefix words (`words`), an ester written as an ether class name | same, "R-6a" | done — `docs/progress-archive/i-52a3b.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-52a3b.md` |
| I-52b | v4 R-6b Nitriles | same, "R-6b" | done — split into I-52b1, I-52b2, I-52b3 | — | — |
| I-52b1 | v4 R-6b1 Nitrile suffixes `nitrilo` / `carbonitrilo`, `benzonitrilo`, `ciano` prefix; search, round trips, deliberate «Nitriles» nulls, e2e | same, "R-6b" | done — `docs/progress-archive/i-52b1.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-52b1.md` |
| I-52b2 | v4 R-6b2 Retained nitrile names (`acetonitrilo`, `fenilacetonitrilo`, `2-(4-metilfenil)acetonitrilo`, `ftalonitrilo` family), Ayuda nitrile line, e2e | same, "R-6b" | done — `docs/progress-archive/i-52b2.md` | high / opus | Codex ship-with-fixes, 1 should-fix recorded as the open user question — `docs/reviews/I-52b2.md` |
| I-52b3 | v4 R-6b3 Nitrile diagnosis messages (fill the I-52b1/b2 «Nitriles» nulls), e2e | same, "R-6b" | done — `docs/progress-archive/i-52b3.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-52b3.md` |
| I-52c | v4 R-6c Amines | same, "R-6c" | done — split into I-52c1, I-52c2, I-52c3, I-52c4 | — | — |
| I-52c1 | v4 R-6c1 Amine suffix `amina` and `N` locants (`N-metiletanamina`, `N,2-dimetilpropan-1-amina`); search with N slots, round trips, closed loop, deliberate «Amines» nulls, e2e | same, "R-6c" | done — `docs/progress-archive/i-52c1.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-52c1.md` |
| I-52c2 | v4 R-6c2 Amino prefixes (`amino`, `(metilamino)`, `(dimetilamino)`, `[etil(metil)amino]`) beside senior groups, the rows waiting for them, e2e | same, "R-6c" | done — `docs/progress-archive/i-52c2.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-52c2.md` |
| I-52c3 | v4 R-6c3 `anilina` / `bencilamina` templates (`N,4-dimetilanilina`, `p-cloroanilina`, no `N,p-`), class names (`metilamina`, `dimetilamina`, `trimetilamina`), Ayuda amine line, e2e | same, "R-6c" | done — `docs/progress-archive/i-52c3.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-52c3.md` |
| I-52c4 | v4 R-6c4 Amine diagnosis messages (fill the «Amines» nulls of I-52c1…c3), e2e | same, "R-6c" | done — split into I-52c4a, I-52c4b | — | — |
| I-52c4a | v4 R-6c4a Principal amine group diagnoses (`seniority`, `count`, `side` → new AMINE_SIDE, `numbering`, `suffix`, `parent`; `N` no number in LOCANT_ORDER / LOCANT_COUNT), e2e | same, "R-6c" | done — `docs/progress-archive/i-52c4a.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-52c4a.md` |
| I-52c4b | v4 R-6c4b Amine class-name diagnoses (`order`, `multiplier`, `words`, `none`), the last template nulls, POSITIONAL on `anilina`, e2e | same, "R-6c" | done — `docs/progress-archive/i-52c4b.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-52c4b.md` |
| I-52d | v4 R-6d Amides | same, "R-6d" | split into I-52d1, I-52d2, I-52d3, I-52d4 | — | — |
| I-52d1 | v4 R-6d1 Amide suffixes `amida` / `carboxamida`, `benzamida`, `N` on the amide nitrogen (`N-metiletanamida`, `N-etil-p-metilbenzamida`); search with N slots, round trip, closed loop, deliberate «Amides» nulls, e2e | same, "R-6d" | done — `docs/progress-archive/i-52d1.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-52d1.md` |
| I-52d2 | v4 R-6d2 Amide prefixes `carbamoil` (`(metilcarbamoil)`, `[etil(metil)carbamoil]`, `bis(metilcarbamoil)`) and acylamino (`(acetilamino)`, `[acetil(metil)amino]`), the rows waiting for them, e2e | same, "R-6d" | done — `docs/progress-archive/i-52d2.md` | high / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-52d2.md` |
| I-52d3 | v4 R-6d3 Retained amide names (`formamida`, `acetamida`, `N-metilacetamida`, `2-fenilacetamida`, `ftalamida` …), Ayuda amide line, e2e | same, "R-6d" | done — `docs/progress-archive/i-52d3.md` | high / opus | Codex ship, 0 findings — `docs/reviews/I-52d3.md` |
| I-52d4 | v4 R-6d4 Amide diagnosis messages (fill the «Amides» nulls of I-52d1…d3 and the `1-aminobutanal` → «butanamida» null), e2e | same, "R-6d" | queued | — | — |
| I-53 | v4 R-7 Wrap-up | same, "R-7" | queued | — | — |
| I-54 | o/m/p letters for two different prefixes on plain `benceno`, drawing → name and name → drawing (user decision 2026-10-15, reverses design §14.4) | `autoclaude/processed/240-omp-two-different-groups.md` | queued — after I-53 (user: «after v4») | — | — |

v1 (I-1…I-12), user feedback (I-13…I-20), v2 (I-21…I-41c, plan in `docs/design.md` §13) and v3
(I-42…I-46, polysubstituted benzenes, user-confirmed 2026-10-13, design §14) are all done; phases
may be split as they are selected (splits recorded in the table).
v4 plan (user-confirmed 2026-10-14, name → drawing, «¿Cómo se dibuja?»): I-47a…I-53, one per
phase R-1a…R-7 of `docs/design.md` §15.8 (R-n ↔ I-(46+n), letters kept), run in table order and
split further if a phase does not fit one worker. Spec: `autoclaude/processed/230-name-to-structure.md`
+ design §15 (read from the working tree — see *Open risks*, «design.md §15 uncommitted»).

## Inbox

- Pickups 1–9 (2026-09-27): `010-*` … `200-*` → I-1…I-20; `215-*` (v2) → I-21…I-41. Pickup 10
  (2026-10-13): `220-*` (v3) → I-42…I-46. Pickup 11 (2026-10-14): `230-name-to-structure.md`
  (user-confirmed v4: build a name from tiles, the app draws it and judges it; design §15) →
  I-47a…I-53, one per phase R-1a…R-7 of design §15.8. Pickup 12 (2026-10-15):
  `240-omp-two-different-groups.md` (user decision: o/m/p for two different prefixes on plain `benceno`,
  both directions) → I-54, queued after I-53 as the item asks. It also asks to record the decision change
  in design.md §14.4/§14.1/§15 — design.md is the user's uncommitted file (see *Open risks*), so I-54
  must either wait for the user's commit or record the change in its archive and flag it.

## Next action

Select I-52d4 (v4 R-6d4, amide diagnoses): `diagnose.js` names an amide's own mistakes (header «Amides», `amideChecks()` /
AMIDE_NULLS after `amineChecks()`), filling every deliberate «Amides» null of I-52d1…d3 with a message and its «Ver el paso» step, in
the shared codes where they fit (as I-52b3 did for nitriles and I-52c4a for amines: CARBONYL_SENIORITY with the seniority `ácido >
éster > amida > nitrilo > aldehído > cetona > alcohol > amina`, CARBONYL_PREFIX, CARBONYL_PARENT, MORE_CARBONYL_GROUPS, N0 numbering
and the suffix's needless locants with «grupo(s) amida» words) and new codes only where none fits. The null categories to fill:
I-52d1's `seniority`, `count`, `carbon` (`propano-1-carboxamida` → «butanamida», `1-fenilformamida` → «benzamida»), `parent`,
`numbering`, `suffix`; I-52d2's `inChain` (a carbamoyl whose C=O carbon the engine takes into a chain, `ácido 3-carbamoilpropanoico`,
also on an ester's O-bound side) and `words` (the engine's carbamoyl written as another branch); I-52d3's 15 template nulls pinned in
`tests/unit/reverse-amide-templates.test.js` (`count` `2-carbamoilacetamida`, `seniority` `2-carboxiacetamida`, `carbon`
`1-fenilformamida`; the `style` null `N-(propan-2-il)acetamida` stays — open user question I-51d1…I-52a2b (1)); and the
`1-aminobutanal` → «butanamida» null left by I-52c4a. Flip the null assertions, add `tests/unit/reverse-diagnose-amides.test.js`
and an amide case in `tests/e2e/diagnosis.spec.js`. Model it on `i-52b3.md`, `i-52c4a.md`, `i-52a3a.md` and the nulls listed in
`i-52d1.md` … `i-52d3.md`; split into d4a/d4b if it does not fit one worker. Spec: design §15 — read from the working-tree
`docs/design.md`; never edit or commit it (see *Open risks*). Risk high; worker opus. Commit by explicit paths. Then I-53 (R-7
wrap-up), I-54.

- **Builds on** every v4 phase so far — the R-1 engine, dialog, «Dibujar», diagnosis engine and panel, rings, benzene,
  templates, and the halogen … retained-amide families (`docs/progress-archive/i-47a.md` … `i-52d3.md`; the "Key paths" below); the
  forward naming engine already names every case (v2 §13, v3 §14).

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
- Tests: `tests/unit/*.test.js` (node --test), `tests/e2e/*.spec.js`. Naming: `src/naming/{structure,lexicon.es,render,parent,numbering,substituent,index}.js`;
  fixtures `tests/fixtures/names.tsv` (§4.8 format, `#` section lines).
- Oracle: `npm run oracle -- --count 1000 --seed 1` (`scripts/oracle/`, OPSIN 2.9.0
  jar in gitignored `scripts/oracle/vendor/`, `--download` fetches it).
- v1…v3 paths (editor, explanation, model, help, carbon dots, layout, 90° view, deploy, palette, rings, benzene, groups,
  every v2 family, polysubstituted benzenes): `docs/progress-archive/key-paths-v1-v3.md`.
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
- Templates / o-m-p (I-50c): «Nombres tradicionales» row, `TEMPLATES` in `tiles.js`, `checkLetters()` in
  `parse.js`; tests `tests/unit/reverse-templates.test.js`, `tests/e2e/name-builder-templates.spec.js`.
- Ring diagnoses (I-50d): ring rule codes in `src/reverse/diagnose.js`, ring legend in
  `src/ui/draw-name.js`; tests `tests/unit/reverse-diagnose-rings.test.js`, ring case in
  `tests/e2e/diagnosis.spec.js`.
- Halogens in the reverse engine (I-51a1): `fluoro`/`cloro`/`bromo`/`yodo` tiles in the «Grupos» row
  (`src/reverse/tiles.js`), through the same modules; tests `tests/unit/reverse-halogens.test.js`,
  `tests/e2e/name-builder-halogens.spec.js`.
- Alcohols in the reverse engine (I-51a2): `hidroxi`/`ol` tiles («Grupos»), `fenol` and `1(n)` tiles
  («Anillos») in `tiles.js`, suffix morphology in `assemble.js`, nulls in `diagnose.js` («Alcohols»
  header); tests `tests/unit/reverse-alcohols.test.js`, `tests/e2e/name-builder-alcohols.spec.js`.
  Phenol templates (I-51a3a): `cresol`, `pirocatecol`, `catecol`, `resorcinol`, `hidroquinona` in
  `TEMPLATES` (`letterOnly` cresol); tests `tests/unit/reverse-phenol-templates.test.js`,
  `tests/e2e/name-builder-phenol-templates.spec.js`. Alcohol diagnoses (I-51a3b): codes
  HYDROXY_PREFIX / HYDROXY_PARENT / MORE_HYDROXY_GROUPS / PHENOL and N0 / suffix variants in
  `diagnose.js`; tests `tests/unit/reverse-diagnose-alcohols.test.js`, alcohol case in `diagnosis.spec.js`.
- Ethers in the reverse engine (I-51b1): `oxi` tile («Grupos», after the branch it turns into an alkoxy
  group; contraction in `assemble.js`), `anisol` in `TEMPLATES`, «Ethers» nulls in `diagnose.js`; tests
  `tests/unit/reverse-ethers.test.js`, `tests/e2e/name-builder-ethers.spec.js`. Class names and ether
  diagnoses (I-51b2): `éter` tile («Grupos», ends the name), codes ETHER_SIDE / ALKOXY_MULTIPLIER /
  CLASS_* and the diagnosis-only step `etherClass` in `diagnose.js`; tests
  `tests/unit/reverse-ether-classes.test.js`, `tests/unit/reverse-diagnose-ethers.test.js`.
- Carbonyls in the reverse engine (I-51c1): `al`/`ona`/`carbaldehído`/`oxo`/`formil` tiles («Grupos»), `benzaldehído`
  («Anillos») in `tiles.js`, error CARBONYL_POSITION, «Aldehydes and ketones» nulls in `diagnose.js`; tests
  `tests/unit/reverse-carbonyls.test.js`, `tests/e2e/name-builder-carbonyls.spec.js`. Acyl prefixes (I-51c2): `oil` /
  `carbonil` tiles («Grupos», in place of a branch's `il`), `acetil` and `benzoil` (whole words, `benzoil` with its own
  prefixes like `fenil`) in `tiles.js`; tests `tests/unit/reverse-acyls.test.js`, `tests/e2e/name-builder-acyls.spec.js`.
  Carbonyl templates (I-51c3a): `formaldehído` … `tereftalaldehído` in `TEMPLATES`, `templateAdmits()` in `tiles.js`; tests
  `tests/unit/reverse-carbonyl-templates.test.js`, `tests/e2e/name-builder-carbonyl-templates.spec.js`. Carbonyl diagnoses
  (I-51c3b1): codes CARBONYL_SENIORITY / KETONE_NOT_ALDEHYDE / ALDEHYDE_CARBON / CARBONYL_PREFIX / CARBONYL_PARENT /
  MORE_CARBONYL_GROUPS and –CHO/C=O N0 and NEEDLESS_LOCANTS phrases in `diagnose.js` (`seniorityRank()` imported from
  `naming/seniority.js`); tests `tests/unit/reverse-diagnose-carbonyls.test.js`, carbonyl case in `diagnosis.spec.js`.
  Acyl-word / branch-ring diagnoses (I-51c3b2): rule-5 codes ACYL_NAME / ACYL_CHAIN / BRANCH_RING_NUMBERING
  (`branchRingNumbering()`, `losesInOwnWords()`, `acylChainCriteria()`, `prefixWords()`) and branch MISSING_LOCANTS /
  NEEDLESS_LOCANTS variants in `diagnose.js`; tests in the same file, `reverse-acyls.test.js`, acyl case in
  `diagnosis.spec.js`.
- Acids in the reverse engine (I-51d1): `ácido` (kind `suffixClass`, first tile, automatic space), `carboxi`, `oico`,
  `carboxílico` («Grupos») and `benzoico` («Anillos») in `tiles.js`, parse code ACID_WORD, «Acids» nulls in `diagnose.js`;
  tests `tests/unit/reverse-acids.test.js`, `tests/e2e/name-builder-acids.spec.js`. Retained acids (I-51d2): `fórmico` …
  `tereftálico` in `TEMPLATES`, `isAcidTemplate()` in `tiles.js`, `checkAcidWord()` in `parse.js`; tests
  `tests/unit/reverse-acid-templates.test.js`, `tests/e2e/name-builder-acid-templates.spec.js`. Acid diagnoses (I-51d3):
  codes ACID_GROUP (`acidSplit()`, `moleculeCarboxyls()`) / ACID_CARBON and the carbonyl codes with `group` 'acid' in
  `diagnose.js`; tests `tests/unit/reverse-diagnose-acids.test.js`, acid case in `diagnosis.spec.js`.
- Esters in the reverse engine (I-52a1): `oato`, `carboxilato`, `ilo` («Grupos», `ilo` in place of a branch's `il` for the
  O-bound side; ` de ` / ` y ` automatic) and `benzoato` («Anillos») in `tiles.js`, parse codes ESTER_GROUPS / ESTER_SUFFIX,
  «Esters» nulls (`esterCategory()`) in `diagnose.js`; tests `tests/unit/reverse-esters.test.js`,
  `tests/e2e/name-builder-esters.spec.js`. Retained esters (I-52a2a): `formiato`, `acetato`, `fenilacetato` in `TEMPLATES`,
  `isEsterTemplate()` in `tiles.js`, `esterSideDiffers()` in `diagnose.js`, Ayuda `#help-name-to-drawing-esters`; tests
  `tests/unit/reverse-ester-templates.test.js`, `tests/e2e/name-builder-ester-templates.spec.js`. Ester prefixes (I-52a2b): no new
  tile — `oxi` after an acyl word/ending composes `aciloxi`, `carbonil` after `oxi` composes `alcoxicarbonil` (`parse.js`,
  `assemble.js`, `tokenize.js`), `esterPrefixWords()` and the «Esters» `inChain` / `words` / `seniority` nulls in `diagnose.js`;
  tests `tests/unit/reverse-ester-prefixes.test.js`, `tests/e2e/name-builder-ester-prefixes.spec.js`. Ester diagnoses (I-52a3a):
  ESTER joins the shared C=O codes (CARBONYL_SENIORITY / CARBONYL_PREFIX / CARBONYL_PARENT / MORE_CARBONYL_GROUPS, «grupos –COO–»
  N0 and locant phrases), new codes ESTER_GROUP / ESTER_CARBON / ESTER_IN_CHAIN, `esterChecks()` first beside the acid checks in
  `diagnose.js`; tests `tests/unit/reverse-diagnose-esters.test.js`, ester case in `diagnosis.spec.js`. O-bound / words / class-name
  diagnoses (I-52a3b): `oBoundChecks()` after `esterChecks()`, codes ESTER_TRADITIONAL / ESTER_ALKYL_CHAIN / ESTER_ALKYL_NAME /
  ESTER_PREFIX_NAME / ESTER_CLASS_NAME, `oBound` wordings of BRANCH_RING_NUMBERING / ALPHABETICAL_ORDER / UNGROUPED / MULTIPLIER_KIND /
  NEEDLESS_LOCANTS, `DIAGNOSIS_PHRASES.doubleBondTie`, the O-bound diagnosis style carried into `diagnosisExplanation()`.
- Nitriles in the reverse engine (I-52b1): `nitrilo`, `carbonitrilo` (suffixes, SUFFIX_GROUPS `element` / `suffixElement()`), `ciano`
  (retained word, RETAINED_TEMPLATES `nitrile`) in «Grupos» and `benzonitrilo` in «Anillos» (`tiles.js`), CARBONYL_POSITION worded for
  –C≡N, `nitrileChecks()` / `nitrileCategory()` «Nitriles» nulls first in `diagnose.js`, `ciano` a hetero group for rule 1; tests
  `tests/unit/reverse-nitriles.test.js`, `tests/e2e/name-builder-nitriles.spec.js`. Retained nitriles (I-52b2): `acetonitrilo`,
  `fenilacetonitrilo`, `ftalonitrilo` in `TEMPLATES` (`tiles.js`), nitrile entries in `parse.js` PLACED_GROUP_WORDS, template nulls in
  the diagnose.js «Nitriles» header, Ayuda `#help-name-to-drawing-nitriles`; tests `tests/unit/reverse-nitrile-templates.test.js`,
  `tests/e2e/name-builder-nitrile-templates.spec.js`. Nitrile diagnoses (I-52b3): new code NITRILE_CARBON (`nitrileCarbon()`,
  `groupCarbonText()`), `NAMED_GROUPS` (C=O groups + nitrile) for the shared codes' «grupo(s) –C≡N» words in `diagnose.js`; tests
  `tests/unit/reverse-diagnose-nitriles.test.js`, nitrile case in `diagnosis.spec.js`.
- Amines in the reverse engine (I-52c1): `amina` (suffix, «Grupos») and `N` (kind `nitrogen`, «Números», `N_VALUE` 0 = the engine's
  N_LOCANT) in `tiles.js`; `checkNitrogen()` in `parse.js`; `amineSlots()` (domain `[N_VALUE, n]`, one amine group only) in
  `interpret.js`; the amine nitrogen (`state.nitrogen`, NITROGEN_VALENCE) and `polyamineRefusal()` in `build.js`; «Amines» nulls in
  `diagnose.js`; tests `tests/unit/reverse-amines.test.js`, `tests/e2e/name-builder-amines.spec.js`. Amino prefixes (I-52c2): `amino`
  («Grupos», value `aminoGroup`, `AMINO_ID` / `AMINO_KIND` in `tiles.js`; the groups on its N as a compound branch's own chain,
  `START di met il amino END`), `aminoGroups()` (innermost amino list first) in `diagnose.js`; tests `tests/unit/reverse-amino.test.js`,
  `tests/e2e/name-builder-amino.spec.js`, helpers `isAminoName()` … in `reverse-words.js`. Amine templates and class names (I-52c3):
  `anilina` / `bencilamina` in `TEMPLATES`, the `amina` tile as a class word right after the groups (`isAmineClassWord()`, tokenizer
  class AMCLASS, `isAmineClassName()` in `assemble.js`; `tokenize()` returns null for a class name with two readings,
  `tridecilamina`); tests `tests/unit/reverse-amine-templates.test.js`, `reverse-amine-classes.test.js`,
  `tests/e2e/name-builder-amine-templates.spec.js`, Ayuda `#help-name-to-drawing-amines`.
  Amine diagnoses (I-52c4a): new code AMINE_SIDE (`acrossNitrogen()`, `nitrogenBetween()`, `sideDropped()` / `nitrogenSide()` for an end
  branch beside the nitrogen), the amine in the shared CARBONYL_* / N0 / locant codes («grupo(s) amino») in `diagnose.js`; tests
  `tests/unit/reverse-diagnose-amines.test.js`, amine case in `diagnosis.spec.js`.
  Amine class-name diagnoses (I-52c4b): the ether CLASS_ORDER / CLASS_DI / CLASS_GROUP_WORDS / CLASS_NAME_NONE codes with amine wording
  and the diagnosis-only step `amineClass` in `diagnose.js`; tests in `reverse-diagnose-amines.test.js`, `reverse-amine-classes.test.js`.
- Amides in the reverse engine (I-52d1): `amida` / `carboxamida` («Grupos», SUFFIX_GROUPS `amide` / `carboxamide` with
  `amideNitrogen`) and `benzamida` («Anillos», GROUP_WORD_PARENTS `benzamide`) in `tiles.js`; `checkNitrogen()` (`parse.js`) lets `N`
  onto an amide's prefixes, `nitrogenSlots()` (was `amineSlots()`, `interpret.js`), `isNitrogenSuffix()` / `polyamideRefusal()`
  (`build.js`); `amideChecks()` / AMIDE_NULLS after `amineChecks()` in `diagnose.js` («Amides» header); tests
  `tests/unit/reverse-amides.test.js` (`isR6d1AmideName()`, `amideCategory()`), `tests/e2e/name-builder-amides.spec.js`.
  Amide prefixes (I-52d2): `carbamoil` («Grupos», modelled as `amino`: the groups on its nitrogen a compound branch,
  `nitrogenGroupSubstituent()` in `interpret.js`, `carbamoylGroup()` in `build.js`), acylamino (an acyl before `amino` no longer TILE_ORDER; imides
  `outOfScope`); «Amides» `inChain` / `words` nulls (`carbamoylTakenIn()`, `carbamoylWritten()`, O-bound `oBoundAmide()`) in
  `diagnose.js`; tests `tests/unit/reverse-amide-prefixes.test.js` (`isR6d2AmideName()` in `reverse-words.js`),
  `tests/e2e/name-builder-amide-prefixes.spec.js`. Retained amides (I-52d3): `formamida`, `acetamida`, `ftalamida` in `TEMPLATES`
  (`tiles.js`), the amide wording of SUBSTITUTED_TEMPLATE and the template nulls in the «Amides» header of `diagnose.js`, Ayuda
  `#help-name-to-drawing-amides`; tests `tests/unit/reverse-amide-templates.test.js`, `tests/e2e/name-builder-amide-templates.spec.js`.

## Verification (last phases)

- Older phases: see each `docs/progress-archive/i-*.md`.
- I-51c1 … I-52d2: see `docs/progress-archive/i-51c1.md` … `i-52d2.md`.
- I-52d3 (orchestrator, after the worker): `npm test` exit 0 (2417 → 2438 pass, 0 fail) · `npm run check` exit 0 (224 files) ·
  `npm run build` exit 0 · `npm run e2e -- --reporter=dot` exit 0 (621 → 627 passed, source + dist). `git diff --stat -- src/naming
  src/explain` empty; `docs/design.md` not edited (mtime 2026-10-14). Codex ship, 0 findings (`docs/reviews/I-52d3.md`).

## Open risks / deviations

- I-49b decision open to the user: for a diagnosed verdict the stepper explains the naming in the
  student's prefix style, so the ordered drawing's locants follow that naming even with the stepper
  closed (`6-metil-4-(propan-2-il)nonano`: canvas numbered as `4-metil-6-(propan-2-il)nonano`, «Se
  llama» `4-isopropil-6-metilnonano`). An `OLD_STYLE` diagnosis replaces the old-style note. See
  `docs/progress-archive/i-49b.md`.

- Commits `21b918a`, `add6d93` and `a052801` (I-37) carry a `Co-Authored-By: Claude` trailer,
  against the user's rule; pushed, not rewritten. Commits from I-38 on omit it.

- I-5/I-6 decisions (`docs/progress-archive/i-5.md`, `i-6.md`): `di(propan-2-il)` not `bis(...)`
  for simple parenthesised prefixes; N5 whole-name alphabetical tie-break; isopropiliden,
  eteniliden, propiliden, tert-butil, nested iliden from memory — OPSIN (I-7) confirmed them
  structurally, their preference rests on fixture justifications.

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

- I-47a…I-50c (v4 engine, dialog, «Dibujar», chain diagnosis, rings, benzene, templates):
  deviations, decisions and review resolutions in `docs/progress-archive/i-47a.md` … `i-50c.md`.
  Still relevant: every v4 Spanish string is a draft pending teacher review; tile cap 100; «Tu nombre: …» verdict line not in spec; `ciclohex-1-eno` →
  `otherName`; left-out locants → kindest of up to 16 readings; e2e has load-dependent flakes
  (`diagnosis.spec.js` keyboard, `polish.spec.js` phone toolbar, dist only).
- I-50d…I-51a3b (ring diagnoses, halogens, alcohols, phenol templates, alcohol diagnoses): deliberate
  nulls, tile decisions (`fenol`, `1(n)`, no numeric cresol, a prefix on `cresol` → POSITIONAL) and
  new Spanish drafts in `docs/progress-archive/i-50d.md` … `i-51a3b.md`; no alcohol null left.
- I-51b1/I-51b2 (ethers): details and Spanish drafts in `docs/progress-archive/i-51b1.md`, `i-51b2.md`.
  Open questions for the user: (1) forward-engine bug, not fixed — `src/naming/index.js`
  `etherClassAlternative()` writes `ditert-butil éter` without the hyphen, so the student's
  `di-tert-butil éter` is `otherName` with a null diagnosis (tested); (2) the forward «Reconoce el
  éter» step says an ether «nunca va al final del nombre», true of the substitutive name only; (3) the
  forward engine writes `1,6-bis-tert-butoxihexano` where usage is `di-tert-butoxi` — followed.
- I-51c1…I-51c3b2 (carbonyl suffixes, acyl prefixes, carbonyl templates, carbonyl and acyl-word diagnoses): decisions,
  review resolutions and Spanish drafts in `docs/progress-archive/i-51c1.md` … `i-51c3b2.md`. Still relevant: an ester
  written as an ether class name gets a null (R-6a's); `cloroacetaldehído` stays `ambiguous`; BRANCH_RING_NUMBERING
  runs on any family and wins over LOCANT_ORDER; still null: a benzene written with `ciclo` in a branch, numbered as the
  engine numbers it; open wording question — the ring-numbering message quotes the engine's form of the whole prefix, so
  it may also show a style change («3-tert-butilfenil» for «5-(1,1-dimetiletil)fenil»).
- I-51d1…I-52a2b (acids, ester suffixes, retained esters, ester prefixes): decisions, deviations and Spanish drafts in
  `docs/progress-archive/i-51d1.md` … `i-52a2b.md`. Still relevant: one deliberate acid null (unbuildable); benzene diesters and
  ester prefixes on `benceno` beside an acid are engine refusals (`outOfScope`); 15 ester rows with a nitrogen wait for
  R-6b…R-6d. Open questions for the user: (1) a retained word's prefix in the IUPAC-preferred style
  (`2-[4-(propan-2-il)fenil]acetato de metilo`, `ácido 4-(propan-2-il)ftálico`, also on the retained aldehyde and, since I-52b2, the
  nitrile: `4-(propan-2-il)ftalonitrilo` — Codex's I-52b2 should-fix) gets a null no rule covers; a fix (one message for all four
  families) waits for the user's wording; (2) the
  forward engine writes `bis-(tert-butoxicarbonil)` / `bis-(tert-butoxi)` with a hyphen before the parenthesis (IUPAC usage,
  from memory: `bis(tert-butoxicarbonil)`), followed by the reverse engine — a fix means changing `src/naming/render.js`.
- I-52a3a (principal ester group diagnoses; decisions and Spanish drafts in `docs/progress-archive/i-52a3a.md`): the O-bound side is not
  compared when the student's –COO– count differs; groups inside the O-bound part are read (`etanoato de 2-carboxietilo` is no
  ACID_GROUP); an acyloxy prefix at any depth is CARBONYL_PREFIX ester. Open risk: ETHER_SIDE's `oxygenBetween()` does not tell an
  ester's bridge oxygen from an ether's (23 000 random names: no case). KETONE_NOT_ALDEHYDE beside an ester does not mention it.
- I-52a3b (O-bound side, ester prefix words, ester as ether class name; decisions, Spanish drafts and review resolutions in
  `docs/progress-archive/i-52a3b.md`): one deliberate null left — an O-bound side mixing the engine's two prefix styles, each group right
  in one (`pentanodioato de isopropilo y 4-(propan-2-il)fenilo`; 2 of ~4 800 ad hoc names, none in the sweeps); ESTER_ALKYL_NAME is the
  generic message for mistakes inside an O-bound group's own prefixes (`4-metil-2-clorofenilo`). Open question for the user: the forward
  engine always joins two O-bound groups with «y» (`etilo y isopropilo`), where Spanish writes «e» before «i» — not changed.
- I-52b1…I-52b3 (nitriles: suffixes, `benzonitrilo`, `ciano`, retained names, diagnoses; decisions and Spanish drafts in
  `docs/progress-archive/i-52b1.md` … `i-52b3.md`): `carbonitrilo` after an open chain is read and judged (`propano-1-carbonitrilo` →
  NITRILE_CARBON «butanonitrilo»); the forward engine writes no `isoftalonitrilo` / `tereftalonitrilo`, so no tiles; one deliberate
  nitrile null left (a nitrile suffix beside a junior principal group, unbuildable, pinned). For teacher review: the seniority order
  beside a nitrile names `amida` and `amina` (tiles not yet written; it matches the opened step); CARBONYL_SENIORITY beside an acid
  with a `ciano` elsewhere omits «nitrilo» from its order (pre-existing, still true). CLAUDE.md's stale R-6a1 / R-6a2b
  «deliberate «Esters» nulls» clauses (stale since I-52a3) were removed in this phase by the orchestrator.
- I-52c1…I-52c4b (amines: suffix, `N` locants, amino prefixes, `anilina` / `bencilamina`, class names, diagnoses; decisions, deliberate
  nulls, Spanish drafts and review fixes in `docs/progress-archive/i-52c1.md` … `i-52c4b.md`): `N` is locant 0 inside the engine (`N,2-`
  sorts first); a supplied `N` on a polyamine is `outOfScope`; acylamino stays TILE_ORDER until R-6d; `N-etilbencilamina` stays
  SUBSTITUTED_TEMPLATE; AMINE_SIDE reads the principal amine's nitrogen only; amine class names reuse the ether CLASS_* codes with the
  diagnosis-only step `amineClass`, a class name beside a senior group is CARBONYL_SENIORITY, CLASS_NAME_NONE also cites the engine's
  retained name («bencenamina», también «anilina»). Deliberate nulls left: `anilina` `style` (`4-(propan-2-il)anilina`, the open question
  I-51d1…I-52a2b (1)) and `amide` (`1-aminobutanal` → «butanamida», R-6d's). For teacher review: `N-cloroetanamina` gets the general
  HETEROATOM refusal; `p-metilbencenamina` the two-different-groups letter message; CARBONYL_SENIORITY beside an amine shows the whole
  order; the class names' multiplier hint says «Los prefijos di-, tri-…». Open questions for the user (forward engine, not changed):
  (1) `butiltert-butilamina` without a hyphen; (2) `tridecilamina` for N(C₁₀H₂₁)₃ is ambiguous (usage: `tris(decil)amina`); (3) announce
  the class name on a `correct` verdict (`metanamina`)? `alcohol bencílico` stays unread (no phase).
- I-52d1 (amide suffixes, `benzamida`, `N` on the amide nitrogen; decisions, deliberate nulls, Spanish drafts in
  `docs/progress-archive/i-52d1.md`): the amide nitrogen is a suffix field (`amideNitrogen`), the `N` machinery shared with amines;
  `carboxamida` after a chain is read and judged (`propano-1-carboxamida` → «butanamida», a `carbon` null); «Amides» nulls (seniority,
  count, carbon, parent, numbering, suffix) wait for I-52d4; 57 amide fixture names wait for `carbamoil` / acylamino (I-52d2) or the
  retained names (I-52d3), pinned. For teacher review: `ciclohexilmetanamida` (locant left out) reads `missingLocants`
  «N-ciclohexilmetanamida» (only the ring on the N fills to an engine name); a prefix style the engine never writes on
  `bencenocarboxamida` is a null, part of the open question I-51d1…I-52a2b (1).
- I-52d2 (`carbamoil`, acylamino; decisions, deliberate nulls, Spanish drafts and review fixes in `docs/progress-archive/i-52d2.md`):
  `carbamoil` is no hetero group for rule 1 (its carbon may lengthen a chain); a carbamoyl the engine takes into a chain is the
  `inChain` null and the engine's carbamoyl written as another branch the `words` null, both for I-52d4, also on an ester's O-bound
  side (review fix 1: `etanoato de 3-(1-carbamoilmetil)heptilo` got a NEEDLESS_LOCANTS suggestion that was itself no engine name);
  an acyl on a carbamoyl N or two acyls on an amino N (imides) `outOfScope`. Review fix 2: the `benzamida` hint no longer cites
  `(4-carbamoilfenil)` (the engine refuses a benzene with groups on the ring and a side chain); a test now reads every example this
  phase's hints and tooltips cite. Open for the user / teacher: the earlier families' hints still cite such refused forms
  (`(4-cianofenil)`, `(4-formilfenil)`, `(4-carboxifenil)`, `(4-hidroxifenil)`, templateHint()); a pre-existing R-6a3b O-bound case,
  `butanodioato de 2-metil-3-cloropropilo y metilo` → ALPHABETICAL_ORDER «metilo y 2-metil-3-cloropropilo» (engine: «3-cloro-2-metilpropilo
  y metilo»), not changed; VALENCE «nitrógeno del grupo carbamoil» and the tooltip are drafts for teacher review.
- I-52d3 (retained amides; decisions, deliberate nulls and Spanish drafts in `docs/progress-archive/i-52d3.md`): tiles `formamida`,
  `acetamida`, `ftalamida` only — the forward engine writes no `isoftalamida` / `tereftalamida` / `oxamida`, and writes
  `2-fenilacetamida` with its locant (built from `2` `fenil` `acetamida`; `fenilacetamida` left out reads `ambiguous`, C2 or N); an
  `N` on `ftalamida` `outOfScope`. For teacher review: SUBSTITUTED_TEMPLATE has an amide wording («solo admite grupos en el nitrógeno,
  con «N» (N-metilacetamida), o solo un fenil en el carbono 2 (2-fenilacetamida)…»), the tooltips and the Ayuda «Amidas» line;
  `N acetamida` gets «no lleva números ni letras propios», as `N anilina` does (calls `N` a number, pre-existing wording). 15
  template nulls pinned for I-52d4.

- **design.md §15 uncommitted (user's working tree).** The v4 plan (§15, ~370 added lines) and the
  Codex plan review `docs/reviews/v4-plan-codex.md` exist only as the user's uncommitted changes
  (the runner's preflight-dirty list, 2026-10-14). Per the autoclaude rules they are the user's:
  phases read them from disk but never edit, commit or revert them, and commit by explicit path.
  So the item's «every phase updates the Status column of §15.8» is tracked here in the phase table
  instead; once the user commits design.md, the next phase brings the §15.8 Status column up to date.
  User action wanted: commit `docs/design.md` and `docs/reviews/v4-plan-codex.md`.

- Bundler regex-literal detection is heuristic; duplicate `export *` names: first wins (`i-1.md`).

## Git state

- I-52d2 `435c77f`, pushed. I-52d3 committed and pushed right after this checkpoint (see `git log`). User's uncommitted paths,
  never ours to commit: `docs/design.md`, `docs/reviews/v4-plan-codex.md`, `.DS_Store`.
