# PROGRESS — organicWeb

Live checkpoint for the autoclaude loop. Plan: `PLAN.md` → phases are the
inbox items `autoclaude/inbox/010-*.md` … `120-*.md`, executed in filename
order, each queued as an `I-n` phase when triaged. Spec: `docs/design.md`.

## Phases

| id | title | spec | status | risk / worker | review |
|---|---|---|---|---|---|
| I-1…I-20 | v1 (scaffold, model, naming engine, oracle, editor, explanations, redraw, release) and user feedback (carbon dots, drag chain, 90° view, highlights, credit, undo fix, deploy) | `autoclaude/processed/010-*` … `200-*` | done — `docs/progress-archive/i-1.md` … `i-20.md` | routine or high / opus | Codex, all ship or fixed — `docs/reviews/I-1.md` … `I-20.md` |

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
| I-51d2 | v4 R-5d2 Retained acid templates (`fórmico`, `acético`, `oxálico`, `fenilacético`, the ftálico family), Ayuda acid line, e2e | same, "R-5d" | queued | — | — |
| I-51d3 | v4 R-5d3 Acid diagnosis messages (fill the I-51d1/d2 nulls and the carbonyl sweeps' acid nulls), e2e | same, "R-5d" | queued | — | — |
| I-52a | v4 R-6a Esters | same, "R-6a" | queued | — | — |
| I-52b | v4 R-6b Nitriles | same, "R-6b" | queued | — | — |
| I-52c | v4 R-6c Amines | same, "R-6c" | queued | — | — |
| I-52d | v4 R-6d Amides | same, "R-6d" | queued | — | — |
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

Select I-51d2 (v4 R-5d2, second of three acid sub-phases, design §15.8 row "R-5d"): the retained acid names in
«¿Cómo se dibuja?» — «Nombres tradicionales» tiles `fórmico`, `acético`, `oxálico`, `fenilacético` and the ftálico family
(`ftálico`, `isoftálico`, `tereftálico`), each with a tooltip, read after the `ácido` tile (I-51d1's `suffixClass` slot:
`ácido 2-(3-metilfenil)acético`) as the engine's alternatives, the prefixes the engine writes on them accepted and any other
prefix `otherName` with the substituted-template diagnosis; template names in the acid round trip and closed loop; the
Ayuda «Del nombre al dibujo» acid line; e2e. Pattern: I-51c3a (`docs/progress-archive/i-51c3a.md`, carbonyl templates,
`templateAdmits()` in `tiles.js`) on top of I-51d1 (`i-51d1.md`: 10 retained acid names are asserted untokenisable in
`tests/unit/reverse-acids.test.js` — they become readable). Then I-51d3: acid diagnosis messages (the «Acids» deliberate
nulls of `diagnose.js` — seniority, count, carbon, numbering, suffix — and the carbonyl sweeps' acid nulls). Spec: design
§15 + §13 (acids I-33) — read from the working-tree `docs/design.md`; never edit or commit it (see *Open risks*). Risk
high; worker opus. Commit by explicit paths.

- **Builds on** the R-1 engine (`src/reverse/`: tiles, parser, assembler, tokenizer, `interpret.js`,
  `build.js`, `search.js`, `readName()` — `docs/progress-archive/i-47a.md` … `i-47c.md`), the dialog
  and «Dibujar» (`i-48a.md`, `i-48b.md`), the diagnosis engine and panel (`i-49a.md`, `i-49b.md`),
  rings, benzene/phenyl, the aromatic key, templates and o/m/p letters (`i-50a.md` … `i-50c.md`),
  ring diagnoses (`i-50d.md`), halogens, alcohols, phenol templates and alcohol diagnoses
  (`i-51a1.md` … `i-51a3b.md`), alkoxy/phenoxy prefixes and `anisol` (`i-51b1.md`), ether class
  names and the ether diagnosis (`i-51b2.md`), carbonyl suffixes, `oxo`/`formil` and `benzaldehído`
  (`i-51c1.md`), acyl prefixes (`i-51c2.md`), carbonyl templates (`i-51c3a.md`), carbonyl diagnoses
  (`i-51c3b1.md`, `i-51c3b2.md`), acid suffixes, `ácido`, `benzoico` and `carboxi` (`i-51d1.md`); the forward naming engine already names every case
  (v2 §13, v3 §14; acids I-33, `i-33.md`).

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
  tests `tests/unit/reverse-acids.test.js`, `tests/e2e/name-builder-acids.spec.js`.

## Verification (last phases)

- Older phases: see each `docs/progress-archive/i-*.md`.
- I-51c1 … I-51c3b1: see `docs/progress-archive/i-51c1.md` … `i-51c3b1.md`.
- I-51c3b2: see `docs/progress-archive/i-51c3b2.md`.
- I-51d1 (orchestrator, after the worker): `npm test` 0 (2127 → 2146) · `npm run check` 0 (195) · `npm run build` 0 ·
  `npm run e2e -- --reporter=dot` 0 (535 → 541 passed, source + dist). Acid round trip 116 rows / 136 names; sweeps: fixture
  306 `otherName` / 145 deliberate nulls, generated 911 / 380 (all ring –COOH N0 renumberings, I-51d3's). Codex review
  ship, 0 findings (`docs/reviews/I-51d1.md`).

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
- I-51d1 (acid suffixes, `ácido`, `benzoico`, `carboxi`; `docs/progress-archive/i-51d1.md`): `ácido` is its own tree kind
  (`suffixClass`), the ether's `éter` stays `classWord`; new parse code ACID_WORD; CARBONYL_POSITION reused for –COOH
  positions (`ácido metanodioico`); the I-39c esters written `alcoxi` + `oxo` read in the acid round trip; the ether round
  trip counts a row under its header's first section id (counts unchanged); `ácido` alone → NO_PARENT with no tile
  marked. Deliberate «Acids» nulls (seniority, count, carbon, numbering, suffix) await I-51d3; until then ~40% of
  generated acid `otherName` verdicts carry no diagnosis. Ayuda has no acid line yet (I-51d2). Spanish drafts in the archive.

- **design.md §15 uncommitted (user's working tree).** The v4 plan (§15, ~370 added lines) and the
  Codex plan review `docs/reviews/v4-plan-codex.md` exist only as the user's uncommitted changes
  (the runner's preflight-dirty list, 2026-10-14). Per the autoclaude rules they are the user's:
  phases read them from disk but never edit, commit or revert them, and commit by explicit path.
  So the item's «every phase updates the Status column of §15.8» is tracked here in the phase table
  instead; once the user commits design.md, the next phase brings the §15.8 Status column up to date.
  User action wanted: commit `docs/design.md` and `docs/reviews/v4-plan-codex.md`.

- Bundler regex-literal detection is heuristic; duplicate `export *` names: first wins (`i-1.md`).

## Git state

- I-51c3b2 `bf155a4`, pushed; inbox triage (pickup 12) `2a30785`. I-51d1 committed and pushed right after this
  checkpoint (see `git log`). User's uncommitted paths, never ours to commit: `docs/design.md`,
  `docs/reviews/v4-plan-codex.md`, `.DS_Store`.
