# Química orgánica — design and implementation plan

A browser app where a secondary-school student (ESO level, Spain) draws a
hydrocarbon and gets its IUPAC name **in Spanish**, plus a step-by-step
explanation of how the name was decided, with the molecule optionally redrawn
so the main chain is obvious.

This document is the single technical reference. Work is delivered in phases
through the autoclaude inbox (`autoclaude/inbox/NNN-*.md`); each inbox item
names the sections of this file it implements. The plan was reviewed by Codex
(`docs/reviews/plan-review-codex.md`); its findings are folded in below.

---

## 1. Product decisions (fixed)

| Topic | Decision |
|---|---|
| User-facing language | Spanish (Spain). Code, comments, docs: English. |
| Audience | ESO student. Short sentences, no jargon without a tooltip. |
| Nomenclature | **IUPAC 2013 recommendations, preferred IUPAC names (PINs)**, Spanish adaptation. Longest chain first, then unsaturation. Locants immediately before the part they refer to: `hex-2-eno`, `buta-1,3-dieno`. |
| v1 scope | **Acyclic hydrocarbons only**: alkanes, alkenes, alkynes, any branching, single/double/triple bonds, branched, unsaturated and doubly-attached (`-iliden`) substituents. |
| Out of scope v1 | Rings, benzene, heteroatoms, stereochemistry (E/Z, R/S), charges, radicals, name→structure. The editor can draw a ring; naming then says kindly that it is not supported yet. |
| v2 scope (in progress) | Rings and functional groups, level ESO + 1º Bachillerato — plan, phases I-21…I-41 and the user's final decisions in §13. Until a family's phase lands, a valid molecule of that family gets a kind "not nameable yet" message. |
| Platform | Static web app, no backend, works offline. Desktop + tablet (pointer events, touch). |
| Tech | Vanilla JavaScript ES modules, no framework, no build step for development. JSDoc on every function. Unit tests with Node's built-in runner (`node --test`), zero runtime dependencies. Playwright as a dev dependency for end-to-end tests. |
| Distribution | `npm run build` produces `dist/index.html`, one self-contained file (JS + CSS inlined) that opens from `file://` and can be put on any static host. |

### 1.1 Spelling and morphology (Spanish, IUPAC 2013)

- **Stems**: 1 met, 2 et, 3 prop, 4 but, 5 pent, 6 hex, 7 hept, 8 oct, 9 non,
  10 dec, 11 undec, 12 dodec, 13 tridec, 14 tetradec, 15 pentadec,
  16 hexadec, 17 heptadec, 18 octadec, 19 nonadec, 20 icos, 21 henicos,
  22 docos, 23 tricos, 24 tetracos, 25 pentacos, 26 hexacos, 27 heptacos,
  28 octacos, 29 nonacos, 30 triacont. Hard caps: parent chain ≤ 30 C, whole
  molecule ≤ 60 C (the editor refuses more, with a message).
- **Endings**: `-ano`, `-eno`, `-ino`. With both: `en` is always cited before
  `ino`, whatever the locants, and the non-final `eno` loses its `o`:
  `pent-3-en-1-ino`, `hexa-1,3-dien-5-ino`, `hex-1-en-3,5-diino`.
- **Connecting "a"**: keep the stem's `a` when the **first** unsaturation
  segment is multiplied: `buta-1,3-dieno`, `octa-1,7-diino`,
  `hexa-1,3-dien-5-ino`. Do **not** add it merely because a later segment is
  multiplied: `hex-1-en-3,5-diino`. Unsaturated alkanes with no multiplier:
  `but-1-eno`.
- **Multipliers**: di, tri, tetra, penta, hexa, hepta, octa, nona, deca,
  undeca, dodeca… for simple prefixes, even when parenthesised only for
  their own locants (`di(propan-2-il)`); bis, tris, tetrakis, pentakis… for
  compound (substituted) prefixes (`bis(2-metilpropil)`) (IUPAC 2013 P-16.9).
- **Group name vs. prefix**: groups named on their own take a final `o`
  (`metilo`, `etilo`, `metilideno`, `etilideno`, `isopropilo`); cited as a
  prefix inside a name they drop it (`metil`, `etil`, `metiliden`,
  `etiliden`, `isopropil`, `(propan-2-il)`). So `3-metilidenhexano`,
  `4-etilidenheptano`, `5-isopropilnonano`. Explanations use the standalone
  form when talking about the group ("el grupo metilo") and the prefix form
  when building the name.
- **Substituent prefixes — user decision: `isopropil` by default.** The
  `–CH(CH₃)₂` group is cited as **`isopropil`** in the main name (a simple
  prefix: no parentheses, `di`/`tri` grouping — `2,3-diisopropil…` — and
  alphabetised under **i**, since `iso` counts). IUPAC 2013 accepts it in
  general nomenclature. Every other group uses the 2013 preferred prefix:
  `metil`, `etil`, `propil`, `butil`…; `butan-2-il` (not `sec-butil`),
  `2-metilpropil` (not `isobutil`), retained `tert-butil`, `etenil`,
  `etinil`, `prop-2-en-1-il` (not `alil`, not `prop-2-enil`),
  `prop-1-en-2-il`… Other common names (`vinilo`, `alilo`, `isobutilo`,
  `sec-butilo`) appear only in explanatory notes ("también se conoce como
  vinilo").
- **Alternative names ("Otras formas válidas").** Whenever the molecule
  contains an isopropyl group (or its doubly attached analogue, cited as
  `isopropiliden` by default, `propan-2-iliden` in PIN style and
  `1-metiletiliden` in the classic style), the result also lists the name in
  the other two accepted styles, each labelled:
  - `5-(propan-2-il)nonano` — "nombre preferido por la IUPAC (2013)";
  - `5-(1-metiletil)nonano` — "forma sistemática clásica".
  Changing the prefix changes its alphabetical position (`i` vs `p` vs `m`),
  which can change the citation order **and** the N4 numbering decision, so
  each alternative is produced by re-running prefix sorting and N4 (§4.4)
  under that style — never by substituting text in the main name. The
  engine takes a `prefixStyle` option: `'isopropil'` (default), `'pin'`,
  `'substituted'`. A benzene derivative with a traditional name that IUPAC
  2013 still retains (P-22.1.3; I-28) lists it last, style `traditional`:
  `metilbenceno` → `tolueno` ("nombre tradicional, que la IUPAC (2013)
  conserva como preferido": toluene is even the 2013 preferred name, but the
  systematic name comes first, §13.1), `etenilbenceno` → `estireno`
  ("nombre tradicional, que la IUPAC (2013) acepta"). Cumene is no longer
  retained, so `isopropilbenceno` gets no `cumeno`.
- **Locant omission** is an explicit rule table, never inferred from "only
  one structural possibility":
  - Unsubstituted parents with omitted locants: `metano`, `etano`, `eteno`,
    `etino`, `propeno`, `propino`, `propadieno`.
  - Everything else keeps all locants: `2-metilpropano`,
    `2-metilprop-1-eno`, `but-1-eno`, `2,2-dimetilpropano`.
  - Substituent prefixes: `metil`, `etil`, `etenil`, `etinil`, `metiliden`,
    `etiliden` carry no internal locant; longer ones always do
    (`prop-2-en-1-il`, `propan-2-il`), except the named group `isopropil`.
  - Ring parents (I-26, `ringOmitsLocants()` in `lexicon.es.js`, shared by
    the English lexicon): an **unsubstituted monocycle with exactly one
    multiple bond** omits its locant — `ciclohexeno`, `ciclooctino` (every
    lowest-locant numbering puts the bond at 1; IUPAC 2013 P-31.1.4.2.4
    names these cyclohexene, cyclooctyne); a **saturated monocycle with
    exactly one substituent** omits that substituent's locant —
    `metilciclohexano`, `metilidenciclohexano`, `decilciclopropano`
    (P-14.3.4.2(c): the locant 1 is omitted in a monosubstituted parent
    hydride with only one kind of substitutable hydrogen). Everything else
    keeps all its locants, the `1` of a ring double bond included, as
    `but-1-eno` does: `3-metilciclohex-1-eno`, `1-metilciclohex-1-eno`,
    `ciclohexa-1,3-dieno`, `1,1-dimetilciclohexano`. The explanation notes
    that some textbooks drop that `1` (`3-metilciclohexeno`).
  - Benzene (I-28): the ring is the retained `benceno` (never
    `ciclohexa-1,3,5-trieno`, P-22.1.2), so its double bonds are never
    cited, and a single substituent has no locant (`metilbenceno`,
    P-14.3.4.2(c)); polysubstituted benzenes are refused (§3.2).
- **Punctuation**: numbers separated by commas, numbers and letters by
  hyphens; prefixes written together with the parent
  (`3-etil-2-metilhexano`); parentheses around compound prefixes.
- **Alphanumerical order** (§4.7): by the complete substituent-prefix name,
  ignoring its attachment locants and external grouping multipliers (di,
  bis…), but keeping multiplying syllables inside a compound prefix
  (`(2,2-dimetilpropil)` sorts under **d**). Ignore `tert-` (and `sec-`), keep
  `iso`. If alphabetic parts are equal, compare the numeric parts
  numerically.

---

## 2. Repository layout

```
index.html              app shell (Spanish UI)
css/app.css             styles, light/dark via tokens
src/
  model/molecule.js     graph: atoms, bonds, valence, implicit H, formula
  model/validate.js     full graph validation (§3.2), shared by every entry point
  model/smiles.js       tiny SMILES parser/writer (C O N F Cl Br I, branches, ring closures)
  model/graph.js        connectivity, cycle detection, paths, canonical tree and monocycle keys
  model/rings.js        ring perception (members, closures, blocks, attachments) and classification
  naming/lexicon.es.js  Spanish word tables (stems, multipliers, endings, retained prefixes)
  naming/lexicon.en.js  English tables — used only by the oracle (§8)
  naming/parent.js      parent-chain candidates and selection cascade
  naming/numbering.js   locant-list comparison, numbering cascade
  naming/substituent.js recursive substituent naming
  naming/rings.js       ring parents: cycloalkanes (ciclo + stem + ano, §13.4 I-25)
  naming/aromatic.js    benzene and monosubstituted benzenes, fenil prefix (§13.4 I-28)
  naming/structure.js   the language-neutral "name structure" (§4.7)
  naming/render.js      name structure + lexicon → string and coloured parts
  naming/index.js       nameMolecule(mol) → result (§4.1)
  explain/explain.js    trace → ordered Spanish steps with highlight data
  editor/editor.js      SVG sketcher: tools, pointer handling, transactions
  editor/history.js     undo/redo of transactions
  editor/geometry.js    placement angles, snapping, bond length
  editor/render.js      SVG rendering (skeletal and condensed modes)
  layout/canonical.js   redraw: main chain horizontal zigzag, branches placed
  layout/rings.js       redraw ring strategy: regular polygon, side-chain directions (§7)
  layout/rightangle.js  90° view: display-only right-angle projection (§6.3)
  ui/app.js             wires editor, toolbar, canvas bar, autosave, results panel
  ui/results.js         name button, coloured name, alternatives, errors, stepper
  ui/examples.js        example gallery
  ui/toolbar.js         drawing toolbar (tools, Deshacer/Rehacer/Limpiar)
  ui/feedback.js        in-page toast and confirmation dialog
  ui/canvasbar.js       bar under the canvas: formula, Esqueleto/Con carbonos, Ángulos rectos (90°), Centrar
  ui/autosave.js        localStorage autosave/restore (injected storage, try/catch)
tests/
  unit/*.test.js        node --test
  fixtures/names.tsv    SMILES <TAB> expected name <TAB> rule tested <TAB> justification
  fixtures/explain-snapshots.json  explain() output for ~20 fixtures (UPDATE_SNAPSHOTS=1 regenerates)
  e2e/*.spec.js         Playwright
scripts/
  build.mjs             inline everything into dist/index.html (no deps)
  oracle/               OPSIN cross-check tooling (§8), never bundled
docs/design.md          this file
```

`package.json` scripts: `test` (`node --test "tests/unit/**/*.test.js"`),
`e2e` (`playwright test`), `build` (`node scripts/build.mjs`), `serve`
(`node scripts/serve.mjs`, zero-dependency static server on port 8000, also
used by Playwright), `check` (`scripts/check.mjs`: `node --check` on every
`.js`/`.mjs` file under the root, `src/`, `tests/`, `scripts/`, plus a scan
for `alert`/`confirm`/`prompt` in app code), `oracle` (§8).

---

## 3. Molecule model

### 3.1 Data

- `Molecule { atoms: Map<id, Atom>, bonds: Map<id, Bond> }`; ids are
  incrementing integers, stable across undo/redo and redraw.
- `Atom { id, element, x, y }` with `element` ∈ C, O, N, F, Cl, Br, I
  (`model/elements.js`, since I-21; carbon is the default). Coordinates
  matter only to the editor and layout; **the naming engine must never read
  them.**
- `Bond { id, a, b, order: 1|2|3 }`.
- Neutral valences live in ONE table (`VALENCES` in `model/elements.js`):
  C 4, N 3, O 2, F/Cl/Br/I 1. `implicitH(atom) = valence(element) − Σ order`
  (never negative: validation guarantees it). No charges, radicals, isotopes
  or explicit H counts exist in the model.
- Derived: molecular formula in Hill order (`C₂H₆O`, `CH₃Cl`; alphabetical
  when there is no carbon: `H₂O`, `ClH`), neighbours, connected components,
  `hasCycle()`, `cyclomaticNumber()`, `isEmpty()`; ring perception and
  classification in `model/rings.js` (§13.2). Structural identity:
  `canonicalKey()` in `model/graph.js` — the unrooted canonical tree key for a
  tree, the monocycle key (smallest reading over every ring rotation and
  reflection, side chains as rooted tree keys) for one ring; polycycles have
  no key yet.
- JSON serialisation (autosave, undo snapshots), unchanged format (version 1):
  old carbon-only saves restore unchanged. Restoration rejects (as `INVALID`)
  a missing or unknown element and any atom or bond field beyond
  `id, element, x, y` / `id, a, b, order` (e.g. `charge`, `radical`,
  `hCount`, `aromatic`), so charges and radicals are never accepted by
  accident.
- `smiles.js`: parses the organic-subset atoms `C O N F Cl Br I` (implicit
  H from the element table), bracket atoms with one of those elements and an
  optional H count (`[CH4]`, `[OH]`, `[NH2]`; the count must equal the one
  the model derives, else `SMILES_HYDROGEN`), `=`, `#` (and an optional
  explicit `-`), parenthesised branches, ring closures `1`–`9` and `%nn`
  with an optional bond symbol on either end (`C1CC=1`, `C=1CC1`); rejects
  invalid closures (`SMILES_RING`: unclosed label, closure to the same atom
  `C11`, a second bond between the same pair `C1C1`, different orders on the
  two ends), other elements,
  aromatic lowercase atoms, charges, isotopes, atom classes, `[H]` atoms,
  dots, stereo marks, dangling bonds and unbalanced or empty parentheses —
  with an explicit error (developer-facing, English), never by silently
  dropping input. The writer (debugging, examples, oracle) writes every
  element as an organic-subset symbol, so round trips keep element identity,
  and writes every bond outside its depth-first tree as a ring closure (bond
  symbol at the opening end, smallest free label); acyclic output is
  unchanged. Parser and writer are iterative.
  Fixtures use SMILES, so the test suite never depends on coordinates.

### 3.2 Validation (single function, used everywhere)

`validate(mol)` (`validateStructure` + `validateForNaming` in
`model/validate.js`) checks: atom and bond ids unique; bond endpoints exist; no
self-bonds; no duplicate bonds between the same pair; orders ∈ {1,2,3};
supported elements only, with no charge/radical fields; Σ order ≤ the
element's neutral valence; then, for naming only: non-empty, connected,
ring scope (a ring is classified by `model/rings.js`: a single carbocycle
with at most 30 ring carbons passes, with or without side chains and ring
multiple bonds (I-25 bare rings, I-26 substituted and unsaturated ones), a
**benzene ring** — six ring carbons with alternating double and single
bonds, named by `naming/aromatic.js` since I-28 — included, but only with at
most one substituent: two or more → `CYCLE` with `ringReason`
`polysubstitutedBenzene` (and `substituted`, the substituted ring atoms; no
orto/meta/para, §13.1); a ring above 30 carbons → `TOO_BIG`; any other ring system →
`RING_SYSTEM` with `ringKind`; all carry the ring atoms in `atoms`), size
caps (≤ 60 carbons `MAX_CARBONS`, ≤ 80 heavy atoms `MAX_HEAVY_ATOMS`, rings
included), carbon only (`HETEROATOM`, also for a heteroatom on a ring's side
chain), parent chain ≤ 30 (`MAX_CHAIN`; for a ring, every side chain ≤ 30:
`longestSideChain()`). The same checks guard editor transactions, JSON restoration
(corrupt autosave → start empty, no crash) and SMILES input.

Two kinds of naming failure are kept apart: an **invalid structure**
(`INVALID`, `VALENCE`: the drawing itself is wrong) and a **valid molecule
that cannot be named** (`CYCLE`, `RING_SYSTEM`, `HETEROATOM`; `isNotNameableYet()`).
Errors are codes with Spanish messages:

| Code | Message |
|---|---|
| `EMPTY` | Dibuja primero una molécula. |
| `DISCONNECTED` | Hay piezas sueltas: todas las partes deben estar unidas. |
| `CYCLE` | Since I-28 only a benzene ring with two or more substituents (`ringReason` `polysubstitutedBenzene`; valid, out of scope, §13.1), with the count: Este benceno tiene 2 sustituyentes. Solo sé nombrar el benceno con un sustituyente como máximo (como el metilbenceno): los bencenos con dos o más sustituyentes quedan fuera de lo que sé nombrar. (`MESSAGES.CYCLE` says «varios sustituyentes».) Benzene and monosubstituted benzenes, refused with `ringReason` `benzene` before I-28, are named; so are the substituted and unsaturated single carbocycles refused in I-24/I-25. A benzene with a ring in its substituent is `RING_SYSTEM` (`several`). |
| `RING_SYSTEM` | Out of scope (§13.1), one message per `ringKind`: `heterocycle` Este anillo tiene átomos que no son carbono: es un heterociclo. Los heterociclos quedan fuera de lo que sé nombrar. · `fused` Has dibujado anillos fusionados (dos anillos que comparten un enlace). Este tipo de moléculas queda fuera de lo que sé nombrar. · `bridged` Has dibujado anillos con puente (dos anillos que comparten más de dos átomos). … · `spiro` Has dibujado un compuesto espiro (dos anillos que comparten un solo átomo). … · `several` Esta molécula tiene varios anillos. De momento solo podré nombrar moléculas con un único anillo. (generic: Esta molécula tiene anillos que quedan fuera de lo que sé nombrar.) |
| `VALENCE` | Este carbono tendría más de 4 enlaces. — per element for the lowest-id offending atom: Este oxígeno tendría más de 2 enlaces. / Este nitrógeno tendría más de 3 enlaces. / Este cloro (flúor, bromo, yodo) tendría más de 1 enlace. (The editor's "full" refusal likewise: Este oxígeno ya tiene 2 enlaces.) |
| `TOO_BIG` | La molécula es demasiado grande (máximo 60 carbonos, cadena de 30). — also a ring side chain above 30 carbons — heavy-atom cap: La molécula es demasiado grande (máximo 80 átomos sin contar los hidrógenos). — a ring above 30 carbons: El anillo es demasiado grande (máximo 30 carbonos en el anillo). |
| `HETEROATOM` | Esta molécula tiene átomos que no son carbono ni hidrógeno. Aún no sé nombrar este tipo de compuestos: de momento solo nombro hidrocarburos. (valid, not nameable yet; `atoms` lists the heteroatoms) |
| `INVALID` | Los datos de la molécula están dañados. Empieza un dibujo nuevo. (internal/corrupt data) |

---

## 4. Naming engine

Pure functions, no DOM, no coordinates.

### 4.1 Result contract

```
nameMolecule(mol) →
  { ok: true,
    name: 'string',                 // Spanish name, default style (isopropil)
    parts: [{ text, kind, atoms, bonds }],  // kind: locant|multiplier|prefix|stem|ending|punct
    structure: NameStructure,       // language-neutral (§4.7)
    parent: { atoms: [id…] in locant order, bonds: [id…] },
    trace: [TraceStep…],
    alternatives: [{ style, label, name, parts }] }   // §1.1; empty if no isopropyl/isopropylidene group
| { ok: false, error: { code, message } }
```

`TraceStep = { rule, candidatesBefore, values, survivors, note? }` where each
candidate is `{ atoms, direction?, key, bonds }` (`bonds`: the chain's bond ids,
added by `nameMolecule()` so the explanation can highlight every compared chain)
and `values` are the compared data
(counts for P1–P4, locant lists for N1–N3, the prefix locants flattened
in citation order for N4, the citation keys for N5, the atom-id tuple for
the tie-break). A ring parent (I-25, I-26) starts with a `RING` step instead
of P1–P4 — the ring as the only candidate, its size as the value: with one
ring the ring is always the parent (§13.5) — followed, when the ring is
substituted or unsaturated, by the ring numbering rules N1–N4 and TIE over
every start atom and direction (each candidate with its n ring bonds in
`bonds`); a bare cycloalkane has the `RING` step only. Trace order: P1, P2, P3, N1, N2, P4, N3, N4, N5, TIE (N5
only when the candidates left after N4 would give different names). Rules stop at the first one that leaves
a single candidate; P1 is always recorded, and N3/N4 are skipped when no
candidate carries prefixes. The explanation layer (§5) consumes only the trace
and the result — it never re-derives chemistry.

### 4.2 Parent candidates

The validated molecule is a tree. Methane (one atom) is handled separately.
Otherwise enumerate the path between every pair of leaf carbons and keep the
longest. This is complete: a path ending at a non-leaf could be extended, so
it is not maximal. (With ≤ 60 atoms there are at most ~1 800 paths.)
**This leaf-to-leaf restriction applies to the parent only**, never to
substituents (§4.5).

Note: no triple bond can leave a longest parent (internal attachment would
exceed valence; terminal attachment would make the chain longer). Assert it.

### 4.3 Parent selection (direction-independent part)

Compare in order; stop when one chain remains:

1. **P1 Longest chain** — carbon count (IUPAC 2013 P-44.3).
2. **P2 Most multiple bonds** — double + triple bonds **lying within** the
   chain. A double bond connecting the chain to a substituent does not count
   (P-44.4.1.1).
3. **P3 Most double bonds** — within the chain (P-44.4.1.2).

Remaining chains go, together with both directions of each, to §4.4. The
IUPAC 2013 order puts the lowest locants for `eno`/`ino` (N1, N2) **before**
the number of substituent prefixes (P-45.2.1), so P4 is applied inside the
numbering cascade, after N2. Example: in `C=CCC(C=C(C)C)CCCCC` the non-1-ene
chain (one substituent) beats the non-2-ene chain (two substituents).

### 4.4 Numbering (and remaining parent choice)

Every candidate is a `(chain, direction)` pair. Compare **sorted locant
lists, keeping repeated locants, term by term, numerically, at the first
point of difference — never by sums**:

5. **N1** all multiple bonds together (`eno` + `ino`); a bond's locant is the
   lower of its two atom locants.
6. **N2** double bonds.
7. **P4 Most substituents** — chain-level count, applied to the chains
   still represented among the candidates (P-45.2.1): number of individual
   substituent prefixes attached to the chain: two substituents on one carbon
   count as two; a doubly-attached substituent (`-iliden`) counts as one.
   Skipped when all remaining candidates belong to one chain.
8. **N3** all substituent prefixes together (an `-iliden` prefix contributes
   its parent attachment locant once).
9. **N4** prefixes in citation (alphanumerical) order: all prefix locants
   written as one sequence in the order they appear in the name (not
   sorted), compared term by term at the first point of difference
   (P-31.1.4.3.4). The sequence is flat, never compared group by group:
   chains with different prefix sets must compare the same way the names
   read, e.g. `5,6-di(butan-2-il)-3,7-dimetilidennon-4-eno` (5,6,3,7) beats
   `5-(butan-2-il)-6-(but-1-en-2-il)-7-metil-3-metilidennon-4-eno` (5,6,7,3).
10. **N5** only when the survivors still give different names (different
   prefixes with the same locants, e.g. two chains each leaving a different
   group as substituent): the name that comes first in alphanumerical
   order, compared as a whole — every letter of the prefix part
   (multiplying prefixes and nested prefixes included) before any locant,
   not prefix by prefix (IUPAC 2013 P-45.5): `6-(2-metilbutil)-8-(2-metilheptil)hexadecano`
   beats `6-metil-8-[2-(2-metilbutil)heptil]hexadecano`.
11. **Presentation tie-break** — if every chemical criterion ties, the names
   are identical (symmetry). Pick the candidate with the lexicographically
   smallest ordered atom-id tuple **only to stabilise highlighting and
   redraw**; the trace records "las dos opciones dan el mismo nombre". This is
   not presented as an IUPAC rule.

All comparisons use structured keys; **never compare assembled name strings
with JavaScript string ordering.**

### 4.5 Substituents (recursive)

For each parent atom, each neighbour outside the parent roots a substituent
subtree. Record, as data, the **attachment atom** and **attachment bond order**
(1 → `-il`, 2 → `-iliden`); never infer these from strings.

Substituent chain selection:

- Candidate chains are paths within the subtree that **contain the attachment
  atom** — it need not be an endpoint (this is what yields `propan-2-il`,
  `butan-2-il`).
- Criteria in order: longest chain; most multiple bonds within it; most
  double bonds; then the §4.4 cascade with the free valence first: **FV
  lowest locant for the free valence**, N1 multiple bonds together, N2
  double bonds, P4 most substituents, N3 substituent prefixes, N4 citation
  order, N5, tie-break (`numberParent` with `freeValenceAtom`). Decision
  (phase I-5): most substituents comes after the ene/yne locants, as for
  the parent (IUPAC 2013 P-31.1.4 numbering criteria before P-45.2.1);
  FV cannot change the chain choice (every longest chain through the
  attachment atom uses the two deepest branches, so the free-valence
  locant is the same), it only fixes the direction.
- Retained prefixes, encoded explicitly in the lexicon: `tert-butil`
  (C(CH₃)₃ attached at the central carbon), and — in the default
  `'isopropil'` style only — `isopropil` (CH(CH₃)₂ attached at the central
  carbon). In `'pin'` style the latter is `propan-2-il`; in `'substituted'`
  style only chains that start at the attachment atom are candidates, so
  every group is named with the free valence at 1 (`1-metiletil`,
  `1,1-dimetiletil` for tert-butyl, `1-metiletenil`). Nothing else is
  retained in v1. Retained and common names are recognised by the rooted
  canonical key of the group (topology), never from name strings; common
  names (`vinilo`, `alilo`, `isobutilo`, `sec-butilo`) are exposed as the
  `commonName` id of the substituent structure, for explanations only.
- A style may need a nested `-iliden` group that the default style avoids
  (`substituted` gives `1-metilidenbutil` where `pin` gives
  `pent-1-en-2-il`); it is named like any other group (phase I-6).
- Naming: prefixes + stem + unsaturation + `il`/`iliden` with the free-valence
  locant: `propan-2-il`, `prop-2-en-1-il`, `prop-1-en-2-il`, `but-3-in-1-il`,
  `2-metilpropil`, `(2,2-dimetilpropil)`, `propan-2-iliden`. One- and
  two-carbon groups carry no locant: `metil`, `etil`, `etenil`, `etinil`,
  `metiliden`, `etiliden`. A saturated chain attached at its end takes the
  short form (`propil`, `2-metilpropil`, not `propan-1-il`): confirmed in
  phase I-5 against IUPAC 2013 P-29.2 (free valence at a chain end: `-ano` →
  `-il`, locant 1 implied; the `-an-n-il` form only when the free valence is
  inside the chain), recorded in the fixture justifications (`5-propilnonano`,
  `5-tert-butilnonano` for the retained `tert-butil`, P-29.6).
  Unsaturated groups always cite the free-valence locant (`prop-2-en-1-il`);
  the final `o` of `eno`/`ino` is dropped before it (`but-3-in-1-il`).
- Parentheses around any prefix that contains its own locants or its own
  substituents: `(propan-2-il)`, `(prop-2-en-1-il)`, `(2-metilpropil)`;
  nested enclosures use `( )` inside `[ ]` inside `{ }`
  (`7-[2-(propan-2-il)pentil]tridecano`, IUPAC 2013 P-16.5.4).
  Simple prefixes (`metil`, `etil`, `etenil`, `metiliden`, `isopropil`,
  `tert-butil`) get no parentheses.
- Identical substituents are grouped: di/tri for simple prefixes, also when
  they are parenthesised for their own locants (`di(propan-2-il)`); bis/tris
  for compound, i.e. substituted, prefixes (`bis(2-metilpropil)`,
  `bis(1-metiletil)`) (IUPAC 2013 P-16.9). Enclosure and multiplier are
  separate decisions. A multiplier before
  an italic descriptor takes a hyphen (`di-tert-butil`).

### 4.6 Doubly-attached substituents (`-iliden`)

Under 2013 rules the longest chain wins even if a double bond leaves it.
`CH₂=C(CH₂CH₂CH₃)CH₂CH₂CH₃` → seven-carbon saturated parent →
**`4-metilidenheptano`**. The connecting double bond is represented on the
substituent, not counted in P2/P3/N1/N2, and its parent locant is part of the
prefix locants (N3/N4).

Decisions (phase I-6): a doubly attached group is named exactly like a singly
attached one (§4.5: chain through the attachment atom, FV first) with a free
valence of order 2 (`freeValence.order`), rendered `iliden`: `metiliden`,
`etiliden`, `propiliden` (short form at a chain end), `(butan-2-iliden)`,
`eteniliden` (=C=CH₂, no locants like `etenil`), `(prop-2-en-1-iliden)`.
=C(CH₃)₂ is the retained `isopropiliden` in the default style only
(alphabetised under **i**, simple prefix: `diisopropiliden`). It applies at any
depth (`2-metilidenpentil`). A triple bond can never connect a substituent
(the carrying atom would have no room for a branch), so orders 1 and 2 are
the only ones. Common names for explanations only: `vinilideno`,
`alilideno`, `isobutilideno`, `sec-butilideno`, `isopropilideno` (when not
retained). In alphanumerical order `metil` precedes `metiliden` (shorter
first when the letters coincide), and `etenil` precedes `etiliden`.

### 4.7 Name structure and rendering

The engine produces a **language-neutral name structure** (parent kind —
`parentKind` `chain` or `ring` —, parent length, unsaturation locant lists,
grouped prefixes each with locants and a nested structure). A ring parent
(`naming/rings.js`, I-25) holds the ring atoms in ring order and its bonds
with the closure bond (from `perceiveRings()`, or from the chosen numbering
in I-26: the bond from locant n back to 1) last; it renders as the
nondetachable prefix `ciclo`/`cyclo` + stem (IUPAC 2013 P-22.1.1) + the same
ending as a chain — connecting `a`, unsaturation locants and multipliers,
`ano`/`eno`/`ino` (`ciclohexa-1,3-dieno`, `ciclooct-1-en-3-ino`) — with
prefixes in front as for chains (`1-etil-3-metilciclohexano`,
`(propan-2-il)ciclohexano`); locants are omitted only per the ring rule of
§1.1. A benzene ring (`naming/aromatic.js`, I-28) is a ring parent with
`retained: 'benzene'`, rendered as the single word `benceno`/`benzene`
(the Kekulé double bonds, at locants 1, 3, 5 of the chosen numbering, stay
in the structure but are never cited); `fenil`/`phenyl` is a retained
substituent prefix (`retained: 'phenyl'`). `render.js` turns it into the Spanish string and coloured parts
using `lexicon.es.js`; the oracle (§8) renders the same structure with
`lexicon.en.js`. No name is ever produced by substring translation.

Assembly order: group identical prefixes → sort alphanumerically (§1.1) →
parent = stem + connecting `a` (per §1.1) + unsaturation segments with
locants + ending → join with the punctuation rules, apply the locant-omission
table.

### 4.8 Fixtures (authority for choice rules)

`tests/fixtures/names.tsv`: `SMILES <TAB> expected name <TAB> rule tested
<TAB> justification <TAB> alternatives` (the last column: `style=name`
pairs separated by `;`, empty when there are none). At least 150 rows
(asserted by the test suite), grouped by feature. Every valid molecule is
named, so no row may be marked `pending(I-n)` (the test suite rejects the
marker). **Every row is a real SMILES and a justified name**; no fragments,
no open questions. Mandatory rows (from the Codex review):

| SMILES | Name | What it tests |
|---|---|---|
| `C=CC` | propeno | omitted locant in unsubstituted parent |
| `CC(C)C` | 2-metilpropano | substituent locant kept |
| `C=CC(CCC)CCC` | 4-etenilheptano | length beats a shorter unsaturated chain |
| `C#CC(CCC)CCC` | 4-etinilheptano | length beats the triple bond |
| `C=CCC(CCCC)CCCC` | 5-(prop-2-en-1-il)nonano | unsaturated substituent, explicit free-valence locant |
| `CCC(=C)CCC` | 3-metilidenhexano | `-iliden`, double bond outside parent |
| `CCCC(=CC)CCC` | 4-etilidenheptano | two-carbon `-iliden` |
| `CCCCC(C(C)C)CCCC` | 5-isopropilnonano | default style; alternatives `pin=5-(propan-2-il)nonano`, `substituted=5-(1-metiletil)nonano` |
| `CCCC(C)CC(C(C)C)CCC` | 4-isopropil-6-metilnonano | style changes N4: `pin=4-metil-6-(propan-2-il)nonano`, `substituted=4-metil-6-(1-metiletil)nonano` (i < m, but m < p and metil < metiletil) |
| `CCC(C(C)C)CC` | 3-etil-2-metilpentano | equal length: more substituents wins |
| `CCC(CC)C(C)CC` | 3-etil-4-metilhexano | equal locant sets: first cited (etil) gets lower |
| `CC(C)(C)C` | 2,2-dimetilpropano | repeated locants, symmetry |
| `C=CC=C` | buta-1,3-dieno | connecting `a` |
| `C=C=CC` | buta-1,2-dieno | cumulated double bonds |
| `C#CC=CC` | pent-3-en-1-ino | lowest multiple-bond locants beat "double bond first" |
| `C=CC=CC#C` | hexa-1,3-dien-5-ino | tie → double bonds lower; en before ino |
| `C=CC#CC#C` | hex-1-en-3,5-diino | later multiplier adds no `a` |

Plus: C1–C30 straight alkanes; `eteno`, `etino`, `propino`, `propadieno`,
`but-1-eno`, `but-2-eno`, `2-metilprop-1-eno`, `pent-1-en-4-ino`,
`hexa-1,3,5-trieno`; `tert-butil`, `di(…)` and `bis(…)` cases; alphabetisation of a
compound prefix under its inner multiplier; N4 cases; symmetric molecules;
cycloalkanes of several ring sizes (`ciclopropano` … `ciclotriacontano`, I-25);
substituted and unsaturated monocycles (I-26: symmetry, dienes, cycloalkynes,
alphabetical ties, unsaturation vs substituent locants, `-iliden`, a long
chain on a small ring, the ring locant-omission rule).

The oracle (§8) is the second line of defence, not a replacement.

---

## 5. Explanation (Spanish, ESO level)

`explain(result)` (`src/explain/explain.js`, pure) → array of steps
`{ id, title, text: [paragraph…], highlight: [{atoms, bonds, style}…],
locants: [[atomId, n]…] | null, options?, compare?, legend?, parts? }`.
`options` are `{label, text, highlight, locants}` the student can click
(each longest chain, each numbering, each substituent); `compare` is the
side-by-side table of the numbering step (`{labels, rows: [{rule, label,
lists, firstDifference, marks, winners}]}`; `marks[i]` are the positions
shown in bold: each losing list's first difference with the winning list,
and all of those points on the winning list); `legend` (`{text, kind, meaning}`) and
`parts` (the coloured name) belong to the last step. Glossary terms are
written `[[shown text|key]]` inside paragraphs (`parseMarkup()`, `GLOSSARY`).
Steps, in order; a step that decided nothing is skipped (or one short line
when instructive):

1. **Cuenta los carbonos** — "Tu molécula tiene 7 carbonos y 16 hidrógenos
   (C₇H₁₆)."
2. **Busca la cadena más larga** — each longest chain shown in turn ("Opción 1
   de 3"). "La cadena más larga tiene 6 carbonos. Hay 2 cadenas de 6."
   When an unsaturation stays outside the parent, say so explicitly: "El doble
   enlace no está en la cadena principal: con las normas actuales de la IUPAC
   manda la longitud." When an equally long chain holds it and loses a
   tie-break (P2/P3), say that instead ("…pierde en los desempates").
3. **Desempates** (multiple bonds / double bonds / substituents) — only when a
   tie existed, with counts per option.
4. **Numera la cadena** — the numberings compared by a deciding rule (N1–N5)
   side by side with their locant lists and the first point of difference
   highlighted. The engine never reads coordinates, so the options are
   labelled A, B… (each shows its numbers on the canvas) rather than "por la
   izquierda / por la derecha": "Opción A: 2, 4; opción B: 3, 5. En el primer
   número distinto, 2 es menor que 3. Gana la opción A." Numberings that give
   identical lists are merged.
5. **Nombra los sustituyentes** — each highlighted with its name; compound
   ones get a nested mini-explanation; common names as notes. For an
   isopropyl group, explain the three accepted names (`isopropil`,
   `propan-2-il`, `1-metiletil`) and why each is written that way.
6. **Ordena alfabéticamente** — "etil va antes que metil (e antes que m). Los
   prefijos di-, tri- no cuentan para el orden."
7. **Monta el nombre** — built piece by piece, coloured by part kind, with a
   legend: "hex = 6 carbonos, -eno = hay un doble enlace".

A cycloalkane (I-25) gets four steps: **Cuenta los carbonos** (plus why the
formula is CₙH₂ₙ, two hydrogens fewer than the open chain), **Busca el
anillo** (the chain closes on itself; the ring in the parent colour and the
closure bond apart; "hexano → ciclohexano"), **Numera el anillo** (all ring
carbons are equivalent: no numbers) and **Monta el nombre** (legend
`ciclo-`, stem, `-ano`; no locant labels on the canvas).

A substituted or unsaturated ring (I-26) gets **Cuenta los carbonos**,
**Busca el anillo** (as above, plus the ring-vs-chain rule of §13.5: "un
anillo manda siempre sobre una cadena abierta: el anillo es la cadena
principal…", and, when a side chain is longer than the ring, that the old
"longest chain wins" rule no longer applies), **Numera el anillo** (no ends:
every start atom and both directions; the rules in order; the options that
start with the lowest first number compared side by side like a chain's
Opción A/B — the others "pierden enseguida" — merged when equivalent and
ordered by their values, so the winner is A whatever the atom ids; one
sentence instead when a single option remains; the ring locant-omission
note), then **Nombra los sustituyentes**, **Ordena alfabéticamente** and
**Monta el nombre** as for a chain, worded for a ring ("salen del anillo",
"el nombre del anillo"). Locant labels appear on the canvas only when the
name has locants.

Benzene and a monosubstituted benzene (I-28) get **Cuenta los carbonos**,
**Reconoce el benceno** (step id `benzene`: the hexagon with three
alternating double bonds, highlighted apart from the single ring bonds,
has its own name «benceno», not «ciclohexatrieno»; the two Kekulé drawings
— double bonds on one set of sides or the other — are the same molecule
and get the same name; with a side chain, the ring is senior to the chain,
the old form with the ring as «fenilo» («feniletano») is not preferred,
and a single substituent needs no number), **Nombra los sustituyentes**
("sin número") and **Monta el nombre** (legend: prefix, `benceno`; the
traditional names under "También es correcto"). No numbering or order
step, no locant labels.

Where the locant-omission table applies, a note explains it ("En «propeno» no
hace falta el número: el doble enlace solo puede estar en el carbono 1").
Glossary tooltips on underlined terms: *cadena principal*, *sustituyente
(radical)*, *localizador*, *insaturación*, *enlace doble/triple*, *anillo* (I-25). Tone: second
person, short sentences, encouraging.

Snapshot tests: `explain()` output for ~20 fixtures stored as JSON and
compared.

---

## 6. Editor (MolView-like)

Full-size SVG canvas. Carbons are vertices, no "C" label by default (skeletal
formula). Toolbar with icons and Spanish tooltips; on narrow screens it wraps
to a bottom bar.

### 6.1 Tools

| Tool | Behaviour |
|---|---|
| **Elementos** (palette: C, O, N, F, Cl, Br, I; editor tool id `carbon`, element via `setElement()`) | Pick an element, then: click empty space → a lone atom of it (a lone carbon is how you draw methane). Click an atom of **another** element → change that atom to the picked one, as one undo step; refused in Spanish when its bonds exceed the new valence ("No se puede cambiar a oxígeno: este átomo tiene 3 enlaces y el oxígeno solo admite 2."). Click an atom of the **same** element → grow a new atom of it with a single bond at the best free angle (§6.2) — so Carbono on a carbon still grows a carbon. Drag from an atom or empty space → the one-bond drag of the bond tools (single bond): only the **new end atom** gets the picked element (its symbol shows in the preview); a start atom placed on empty space is a carbon, and releasing on an existing atom only bonds it — a drag never changes an element (a wobbly click that ends on the pressed atom is the self-bond refusal). |
| **Enlace simple / doble / triple** (default simple) | Bond tools always create **carbons** and never change an element; valence is checked per element (C 4, N 3, O 2, halogens 1), so C=O is drawn as a double bond with one end changed to O (or Enlace doble on a C–O bond) and C≡N likewise. Click empty space → new two-carbon fragment with that bond order. Click an atom → grow a new carbon bonded with that order. Drag from an atom or empty space → **one** new bond in the drag direction, snapped to 30°; releasing on an existing atom bonds the two (a ring is allowed; naming refuses it; the pressed atom itself → self-bond refusal). Click an existing bond → **set** it to the tool's order. |
| **Enlace simple: chain drag** (MolView-like) | With Enlace simple only, a drag long enough for a zigzag of two or more bonds (drag projected on the 30°-snapped axis ≥ 1.5 × `40·cos 30°`) grows a zigzag chain bond by bond along the drag (120° angles, fixed bond length, one bond per `40·cos 30°` of drag, side chosen away from the start atom's neighbours), with a live counter "5 C" = carbons the drag adds (from empty space, the whole chain; the one-bond preview shows "1 C"/"2 C" too). Release commits the whole chain as one transaction; a full start carbon refuses it ("Este carbono ya tiene 4 enlaces"), and a chain carbon landing on an existing atom refuses it (overlap message) — never a carbon on top of another. **Release on an atom:** whenever the pointer is over an existing atom, the drag is the one-bond drag above, whatever its length (the preview switches to that single bond), so "release on an atom bonds to it" keeps working; the chain never joins atoms. Doble/triple keep the one-bond drag: only the first bond of a chain could carry the order, which would be surprising. |
| **Anillos** (group of seven buttons: ring sizes 3–8 and **Benceno**; editor tool id `ring`, template via `setRingTemplate()` — a size, or `benzene` — or `setRingSize()`) | Places a regular ring of carbons joined by single bonds — or, with Benceno (I-28), a hexagon whose ring bonds alternate double and single (one Kekulé drawing; the hover preview shows the inner strokes of its three double bonds) — standard bond length (`freeRingPoints()`, `attachedRingPoints()`, `fusedRingPoints()` in `geometry.js`). Click empty space → a free ring centred at the pointer, one flat side at the bottom. Click an atom → a ring hung from it by a **single bond** (a cycloalkyl substituent), along the atom's best free direction (the §6.2 preferred angles, then the other 30° directions: the first where the whole ring fits), lying outward along it; refused with the valence message when the atom is full ("Este carbono ya tiene 4 enlaces."). Click a bond → a ring **fused** on it (sharing both atoms; the shared bond sets the side length), on the side with fewer neighbours of its two atoms, then the side with more room (`fusedRingSide()`); allowed although naming refuses fused rings (`RING_SYSTEM`); valence refusals apply. A benzene fused on a bond always gets exactly three alternating ring double bonds: on a double bond its two new bonds at the shared atoms are single (the shared bond is one of the three); on a single bond they are double, so both shared atoms need room for one; a triple bond, or a single bond without that room (e.g. the bond of a benzene drawn with it single, or an isobutane C–C), is refused: "Aquí no cabe un benceno: los átomos de este enlace no admiten los enlaces dobles alternados del benceno.". A new ring atom closer than 0.6 bond lengths to an existing atom refuses the whole ring with the overlap message; nothing changes. A drag counts as a click where it was pressed. Hovering previews the ring about to be placed (dashed, accent colour; no preview where the placement would be refused, nor over the 90° drawing). One undo step; `onEdit` kind `chemical`. In the 90° view a ring on a projected atom or bond is built on the model atoms, a free ring goes where loose pieces go (below), and the ring makes the view fall back to the normal drawing. |
| **Cambiar enlace** | Click a bond → cycle 1→2→3→1 (skipping orders that break valence, e.g. C=O → C–O; a C–Cl bond cannot change: "Este enlace no puede cambiar: sus átomos no admiten más enlaces."). |
| **Borrar** | Click atom → delete it and its bonds. Click bond → delete the bond only; both atoms stay (the model does not record how an atom was created, so an endpoint cannot be told apart from a carbon placed on its own). |
| **Mover** | Drag an atom (moves it) or a bond (moves its two atoms). Drag on empty space → marquee selection; then drag the selection (press on a selected atom, a bond between selected atoms, or inside the selection's box). Click selects an atom; click on empty space or Esc clears the selection. Dropping an atom on another is refused. Not available while the 90° drawing is shown (see below). |
| Pan / zoom | Space+drag, middle-drag or two-finger drag pans; wheel / pinch zooms; "Centrar" button fits the molecule. |
| Buttons | Deshacer, Rehacer, Limpiar (in-page confirmation dialog, never `window.confirm`), Ordenar dibujo (§7). |
| 90° view (editing) | While the "Ángulos rectos (90°)" drawing is actually shown (§6.3) every tool works on it except **Mover**. Gestures are hit-tested on the **projected** positions (hover, the pressed carbon or bond, the release target, a snapped end landing on a carbon) and previews are drawn there; each gesture becomes one ordinary model edit, after which the projection is recomputed and the carbons the gesture added (or, if none, the ends of the bond it added or changed) get a blue ring for about 1 s, since the re-layout may move things. **Mapping to the model:** a carbon grown from an existing carbon (Carbono or bond-tool click, one-bond drag to empty space, every carbon of an Enlace simple chain drag) gets its model position by the §6.2 rules — the drag direction has no meaning in the model — and a chain drag adds as many carbons as its projected length measures (the live counter); bond orders, joins (release on a carbon) and Borrar act on the hit ids; a new loose piece (click or drag on empty space) goes to the pressed points in the model (the projection is centred on the model drawing), moved down by whole bond lengths until it clears every model carbon by 0.6 bond lengths, so it is never refused for hitting an invisible atom. **Mover** and **Ordenar dibujo** are disabled there (they only change model coordinates, which the projection ignores), the `m` shortcut is ignored, and a drag with Mover still picked pans; the note under the canvas says "Puedes dibujar aquí. Para mover átomos u ordenar el dibujo, desactiva los ángulos rectos.". One undo step per gesture, Esc / pointer cancel and valence refusals work as everywhere. An edit that makes the molecule unprojectable (a loose piece, a ring…) falls back to the normal drawing (§6.3), and the first edit that makes it projectable again switches back to the 90° drawing by itself. |

Rules: every pointer gesture commits **one** undo transaction; Esc or pointer
cancel restores the starting state. Duplicate bonds ("Estos dos átomos ya
están unidos.") and self-bonds ("No se puede unir un átomo consigo mismo.")
are rejected; any valence violation is refused with a brief shake and a toast
("Este carbono ya tiene 4 enlaces", "Este oxígeno ya tiene 2 enlaces."). After a bond-order change, linear
geometry is recomputed (triple bonds and cumulated double bonds straightened
to 180°) as part of the same transaction.

The former **Cadena** tool was removed as redundant (one tool fewer for
students): the Enlace simple drag does the same, and its `h` shortcut now
selects Enlace simple, so the key still leads to chain drawing.

Keyboard: elements `c` carbono, `o` oxígeno, `n` nitrógeno, `f` flúor, `l` cloro,
`b` bromo, `i` yodo (`ELEMENT_KEYS` in `editor.js`); `1/2/3` bond tools (`h` also Enlace simple), `t` cambiar enlace,
`a` anillos (pressed again while Anillos is the tool: next template, 3→…→8→benceno→3, `nextRingTemplate()`; digits stay free because `3` is Enlace triple),
`e`/`Supr` borrar, `m` mover, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` (also
`Ctrl/Cmd+Y`). Ignored in text fields and while a dialog is open.

### 6.2 Geometry

- Fixed bond length (40 px at zoom 1).
- New-atom angle from an atom with one neighbour: ±120° from it, choosing the
  side that continues the zigzag relative to that neighbour's other
  neighbour; with two neighbours: bisector of the largest gap; three: largest
  gap. Linear centres (triple bond, or two double bonds): 180°.
- Avoid overlapping existing atoms (try alternative angles, then a small
  nudge).

### 6.3 Rendering

- Double bonds: two parallel lines, second one offset toward the inside of the
  zigzag; triple: three lines. Bond multiplicity is shown only by strokes.
  A double bond that belongs to a ring (ring bonds from `perceiveRings()`)
  draws its shorter second line toward the ring's interior: the centroid of
  the smallest ring through that bond, so in a fused system the smaller
  ring's centre (`ringBondCentres()`, `ringInnerSide()` in `render.js`); the
  zigzag rule is the fallback only when that centre lies on the bond line.
  This applies in both display modes (Con carbonos draws the same strokes,
  trimmed at the labels); the 90° view is never drawn for a ring. Triple
  bonds in rings and acyclic double bonds are unchanged.
- Display toggle **Esqueleto / Con carbonos**. **Esqueleto** (default) draws
  every carbon as a line vertex marked with a small filled dot (radius 3.5
  drawing units against 2-unit bonds, so it scales with the zoom), so a
  student can count carbons even where two bonds are nearly collinear; chain
  ends are dotted too, and a lone carbon gets its dot plus a `CH₄` label just
  below it (clicking that label acts on the carbon, in both modes). The dot is drawn above the hover, selection and stepper highlight
  discs, which stay visible around it; drag previews (bond, chain) dot their
  future carbons in the accent colour, and the redraw animation re-renders
  the dots every frame. **Con carbonos** draws no dots and labels each carbon
  with C + implicit H only (`CH₃`, `CH₂`, `CH`, `C`) — never `=` in labels.
- **Heteroatoms** (O, N, F, Cl, Br, I) are labelled in **every** mode with
  their symbol + implicit H (`OH`, `O`, `NH₂`, `NH`, `N`, `Cl`…; a lone one
  shows its formula: `H₂O`, `NH₃`, `HF`, `HCl`, `HBr`, `HI`), centred on the
  atom, coloured by element (O red, N blue, halogens green), never dotted;
  bond strokes stop `LABEL_GAP` short of them (`atomLabel()` in `labels.js`,
  `bondEndCuts()` in `render.js`). A click anywhere on the label box — sized
  to the text (`labelSize()` + 1 unit, `heteroLabelBox()`/`onHeteroLabel()` in
  `geometry.js`) — acts on the atom; off that box, a visible bond stroke wins
  over the heteroatom's hit circle, so a bond between two close labels
  (O–O, N–Cl) stays editable (`hitTest()`).
  Carbon rendering is unchanged. The 90° view and "Ordenar dibujo" need a
  name, so a heteroatom molecule (naming error `HETEROATOM`) shows the normal
  drawing ("Hay átomos que no son carbono: se ve el dibujo normal.") and
  "Ordenar dibujo" shows the "aún no sé nombrar" message instead.
- **Ángulos rectos (90°)** toggle, shown in Con carbonos only (Esqueleto
  keeps the 120° zigzag and hides it; the preference is kept and remembered
  in `localStorage` like the display mode). It draws the textbook
  semi-developed formula: the parent chain (from the naming result, as in
  §7) on one horizontal line with locant 1 on the left, branches straight up
  or down from their carbon and continuing horizontally or vertically.
  - It is a **display-only projection** (`rightAngleLayout()` in
    `src/layout/rightangle.js`, pure; handed to the editor through
    `setProjector()`): the model's coordinates never change, so turning it
    off restores the drawing exactly, and undo, autosave and "is ordered"
    are unaffected. It is recomputed whenever the molecule changes (edit,
    undo, redo, example, restore).
  - Placement on an integer grid, collision-free by construction: a branch
    leaving the chain or going straight on owns a half-plane (it may turn to
    both sides); a branch that turned owns a quadrant (it may only go on or
    turn away from the chain). Bonds are lengthened, never bent, when a
    sibling's box is in the way; the most compact choice is kept; branches
    on the same side of the chain never share a column. A single branch
    hangs down (the user's reference picture), two go up and down.
  - Uniform column step = widest label (estimated by `labelSize()`) plus
    two 4-unit gaps and a 16-unit visible stroke; row step likewise for the
    label height. Strokes stop 4 units short of the label boxes; double and
    triple bonds become two/three equal parallel strokes (`=`, `≡`),
    horizontal or vertical. Locant numbers sit up-right of their label.
  - Every drawing is checked by `rightAngleProblems()` (axis-aligned bonds,
    no overlapping labels, no bond through a label, no crossing or
    overlapping bonds). **Fallback**: an empty drawing, an unnameable
    structure (several fragments, a ring…) or no clean placement (a carbon
    with three children inside a turned branch: none in 1 200 random 1–14 C
    molecules, ≈0.3 % of 15–40 C, ≈2 % of 40–60 C) draws the normal layout (every tool, Mover and Ordenar dibujo included)
    with a short note under the canvas ("Hay piezas sueltas: se ve el dibujo
    normal."; on an empty canvas the gentle hint "Los ángulos rectos
    aparecerán cuando dibujes una molécula.").
  - The projected drawing is **editable** (§6.1 "90° view (editing)";
    `isProjected()` = a projector is set and succeeded): the editor core
    receives the projected copy as its `display` and hit-tests gestures on
    it, while every edit is made on the model; only Mover and Ordenar dibujo
    are off there. The drawing switches to the projection as soon as an edit
    makes the molecule projectable, and back to the normal drawing if an
    edit or undo makes it unprojectable. Stepper highlights and locants are
    drawn on the projected positions (unless "Resaltar en el dibujo" is off, §9).
- Hover highlight on atoms and bonds. Highlight API for the stepper:
  `highlight({atoms, bonds, style})` with styles
  `parent|candidate|substituent|locant`, and `showLocants(Map atomId→n)`.
- Live molecular formula under the canvas ("Fórmula: C₅H₁₂").
- Autosave to `localStorage` (every access in try/catch; restore goes
  through `validate()`'s structural part, `validateStructure()`, since a
  drawing in progress may be disconnected; corrupt data is removed and the
  canvas starts empty). Restore is not an undo entry. The display mode is
  remembered too.
- The editor distinguishes **chemical edits** (atoms/bonds/orders) from
  **coordinate edits** (move, redraw): only chemical edits invalidate a
  shown name. Every edit, undo, redo and restore is classified by comparing
  snapshots (`editKind()`) and reported through `onEdit({reason, kind})`.

---

## 7. Redraw ("Ordenar dibujo")

`canonicalLayout(mol, result)` → new coordinates only (ids and topology
unchanged):

- Parent by strategy (`canonical.js`): an open chain as a horizontal
  zigzag, locant 1 on the left; a named single carbocycle (I-27b,
  `layout/rings.js`; bare, substituted or unsaturated, 3–30 carbons,
  benzene included since I-28) as a
  regular polygon with the standard bond length, **locant 1 at the top
  vertex and the numbering running clockwise** on screen, in the order of
  the naming result's ring numbering. Each side chain leaves its ring atom
  outwards along the bisector of the exterior angle; two on one ring atom
  are spread symmetrically inside the free exterior angle (± a sixth of it:
  ±40° on a hexagon, ±50° on a triangle, ±32° on a 30-ring). The branches
  of a ring atom (and of every side-chain atom) are taken in canonical-key
  order, so the drawing does not depend on atom ids, insertion order or
  input coordinates. The layout only walks the tree side chains (it checks
  first that the molecule has exactly one ring and that it is the parent),
  so it never loops on a cycle.
- Substituents drawn away from the parent on the zigzag's free side (or
  outwards from the ring), recursively as zigzags, by the same code for
  chains and rings; resolve collisions by flipping sides, then widening
  angles. Tested on densely branched examples (no two atoms closer than 0.5
  bond lengths, no bond crossings). If no such layout is found, the drawing
  is left unchanged and a Spanish message says so. A press on the canvas
  during the animation only ends it.
- Linear centres straightened.
- Applied as **one** undoable coordinate edit, animated ~400 ms
  (`prefers-reduced-motion` respected); pressing it on an already ordered
  drawing adds no undo step. When the ordered drawing would not fit the
  visible canvas, the canvas is re-centred on it as part of that edit: one
  Deshacer (also during the animation) brings the previous drawing back in
  the view it had, so every carbon is where it was on screen, and Rehacer
  shows the ordered drawing re-centred again. Undone or redone while the
  90° drawing is shown, the canvas keeps the 90° drawing's view, and the
  normal drawing gets its restored view when it comes back. The naming result stays (when no name is shown,
  the toolbar button names the molecule first); the parent is highlighted
  persistently while the ordered drawing is shown (i.e. until an atom moves
  or undo restores other coordinates; for a ring: all ring atoms and bonds,
  closure bond included); locant numbers appear next to parent atoms from
  the numbering step ("Numera la cadena" / "Numera el anillo") on, except
  on a bare ring, whose numbering step uses no numbers. A step's option views (Opción A/B,
  chain candidates) are shown unchanged. "Resaltar en el dibujo" off (§9)
  hides these marks too.
- After naming, a hint offers it: "¿Quieres ver la cadena principal
  ordenada?", or for a named ring "¿Quieres ver el anillo ordenado?". A
  molecule that cannot be named (polysubstituted benzenes, ring systems,
  heteroatoms…) gets no hint and the button shows its naming error.
  Benzene and monosubstituted benzenes (I-28) are ordered by the ring
  strategy like any named single carbocycle (locant 1, the substituted
  carbon, on top); their bond orders are kept as drawn.
- While the 90° drawing is shown (§6.3) "Ordenar dibujo" and its hint are disabled (the
  change would be invisible there; the message "Desactiva los ángulos rectos
  para ordenar el dibujo." answers a call anyway). The 90° view already puts
  the parent chain on one horizontal line; turning it off shows the ordered
  or unordered model drawing as it was.

---

## 8. Oracle cross-check (OPSIN) — development only

OPSIN (open-source name→structure, Java) reads English IUPAC names.

1. English names come from the **same name structure** rendered with
   `lexicon.en.js` (`met`→`meth`, `et`→`eth`, `-ano`→`-ane`, `-eno`→`-ene`,
   `-ino`→`-yne`, `-il`→`-yl`, `-iliden`→`-ylidene`, retained prefixes,
   punctuation) — never substring translation.
2. A seeded random generator produces valid acyclic hydrocarbons (4–14 C,
   random branching and unsaturation within valence), half as many random
   monocycles (a 3–10 C ring with random side chains and ring/side-chain
   double and triple bonds, I-26), a tenth as many benzene derivatives
   (benzene, then random monosubstituted benzenes in either Kekulé drawing,
   I-28; their traditional names `toluene` / `styrene` are checked too),
   plus one cycloalkane per ring size in the carbon range (I-25).
3. name → English → OPSIN → SMILES → a **dev-only fuller SMILES parser**
   (bracket atoms, explicit H) → hydrogen-suppressed molecule keeping every
   heavy atom and its element (I-22), rings kept (I-24) → compare with the
   original using `canonicalKey()` (unrooted tree key, or the monocycle key;
   elements + bond orders + ring closures) after checking that both have the
   same number of rings, plus a formula check. Aromatic (lowercase) OPSIN
   SMILES are kekulized first, and a benzene ring matches in either Kekulé
   drawing (both keys of the original are accepted, I-28). A formula match alone never
   passes; polycycles fail until they have a key. Unsupported OPSIN syntax is an adapter failure, not a naming
   failure.
4. OPSIN runs from a **pinned** CLI jar (version + SHA-256 recorded in
   `scripts/oracle/README.md`, downloaded to `scripts/oracle/vendor/`,
   gitignored) when Java is available. The public web service is optional
   and never part of acceptance. Unavailable → the check reports **skipped**,
   never passed.
5. Failures log seed, SMILES, Spanish name, English name, OPSIN version,
   OPSIN output.

A round trip proves the name **denotes** the right structure; it does not
prove the parent choice, numbering, locant omission or Spanish spelling are
the preferred ones. Fixtures (§4.8) remain the authority for those.

Also: **graph-invariance tests** — for random molecules, renumber atom ids
and shuffle bond insertion order; the name must not change.

Decisions (phase I-7): the pinned jar is OPSIN 2.9.0 (CLI, runs on Java 8).
Every molecule is checked in all three prefix styles (`isopropil`, `pin`,
`substituted`) and passes only if all three names round-trip. Unreadable
OPSIN SMILES is counted apart as an adapter failure; failures go to
`scripts/oracle/logs/` (gitignored). The generator draws molecules distinct
by canonical tree key and within the naming size caps; `--min`/`--max` widen
the default 4–14 C range. Oracle runs over ~35 000 molecules (1–60 C) and the
176 fixtures found no structural mismatch: OPSIN confirms the structures
denoted by `isopropiliden`, `eteniliden`, `propiliden`, `tert-butil`,
`di(propan-2-il)`, `bis(1-metiletil)` and nested `-iliden` groups (not their
preference, which the fixtures carry).

---

## 9. UI

Layout (desktop): toolbar | canvas | results panel (right; below the canvas
on narrow screens).

- Big button **"¿Cómo se llama?"** (always enabled; on an empty canvas it
  answers with the `EMPTY` message).
- Results panel: the name (large, coloured parts); below it, when present,
  **"Otras formas válidas"** listing each alternative with its label (§1.1);
  then **"Ver paso a
  paso"**: a stepper with Anterior / Siguiente and progress dots, each step
  driving the canvas highlight.
- **"Resaltar en el dibujo"** switch (a toggle button with `aria-pressed`,
  on by default): hides or shows every canvas mark of the result — the
  parent / candidate / substituent / locant highlights and the locant
  numbers — in the normal and the 90° view, including the persistent parent
  highlight of the ordered drawing (§7). It sits in the stepper's header;
  while the stepper is closed (when the canvas shows the whole name's marks)
  a second switch with the same state sits next to "Ver paso a paso", so
  exactly one is visible. Flipping it never leaves or resets the stepper;
  moving to another step with the marks off keeps them off (the text still
  advances), and switching back on shows the current step's marks. The hover
  highlight is not affected. **Decision: the choice is remembered** in
  `localStorage` (`organicWeb.highlights` = `on`|`off`, every access in
  try/catch, missing means on), like the display mode and the 90° view, so a
  student who prefers the plain drawing is not asked again; the switch is
  always visible next to the text, so a forgotten "off" is easy to spot.
- Errors in friendly Spanish (§3.2), with a short hint for `EMPTY` and
  `DISCONNECTED` (`src/ui/results.js`); `CYCLE` (polysubstituted benzene), `RING_SYSTEM`
  and `TOO_BIG` have no hint.
- A chemical edit clears the result (stale names must never show);
  coordinate edits do not.
- **Ejemplos** menu: 12–15 molecules from SMILES covering each feature,
  loaded with the canonical layout (one undoable edit). Menu labels describe
  the feature ("Alcano ramificado"), not the name, so the student still asks.
- **Ayuda** dialog: how to draw, short, with small inline SVG illustrations.
- Light/dark theme following the system, colour tokens in `:root`.
- Accessibility: keyboard reachable controls, visible focus, ARIA labels on
  tools, the name and each step text available to screen readers.

---

## 10. Quality gates (every phase)

- `npm test` and `npm run check` green; e2e green from phase 100 on (editor
  phases test graph mutations through the editor's API and simple e2e
  drawing tests; name-button e2e starts in phase 100).
- JSDoc on every function; closing-brace comments for blocks > 10 lines.
- No `alert/confirm/prompt`.
- Engine code never touches coordinates or the DOM.

### 10.1 Deployment (Fastmail Files)

The app is hosted as a static site from Fastmail Files. `npm run deploy`
(`scripts/deploy.mjs`) uploads the single-file build `dist/index.html` over
WebDAV with one HTTP PUT to `https://myfiles.fastmail.com/OrganicWeb/index.html`
(`Content-Type: text/html; charset=utf-8`). Deploying is a **manual user
step**; the autoclaude loop never runs it (only `--dry-run`).

- Prerequisites (one time): a Fastmail app password restricted to **Files**,
  stored in the macOS Keychain with
  `security add-generic-password -s fastmail-webdav -a carlos@carpio.cc -w`;
  and the `OrganicWeb` folder made a public website in Fastmail's web UI
  (a one-time setting that uploads do not change).
- Flow: refuse a dirty git tree (`git status --porcelain` non-empty) unless
  `--force` → `npm test` and `npm run check` unless `--skip-checks` →
  `writeBuild()` → read the password with
  `security find-generic-password -s <service> -a <user> -w` → PUT → print
  HTTP status and byte size. Any failure or non-2xx response exits non-zero.
  Unknown flags print the usage and exit with status 2.
- `--dry-run` does everything except the Keychain read and the PUT.
  **Decision:** the dry run does not read the Keychain, so it needs no
  credentials and provably never touches the network.
- Secrets: the password is the child's stdout (never in any argv), stays in
  memory as a Basic `Authorization` header for Node's global `fetch`, and is
  never logged or written. No secret is stored in the repository. The upload
  URL must be `https://` (checked before any side effect), and the PUT does
  not follow redirects, so a 3xx fails the deploy.
- Env overrides: `FASTMAIL_USER`, `FASTMAIL_WEBDAV_URL`,
  `FASTMAIL_KEYCHAIN_SERVICE` (the Keychain account is the WebDAV user).
- Tests (`tests/unit/deploy.test.js`) inject fakes for git, npm, the build,
  the Keychain and `fetch`; they never contact Fastmail or read the Keychain.

---

## 11. Phase list (delivered as inbox items)

Zero-padded so alphabetical order = execution order.

| # | Inbox file | Content |
|---|---|---|
| 1 | `010-scaffold.md` | Layout, package.json scripts, shell page, CSS tokens, test runner, build script with a packaging smoke test, Playwright set-up. |
| 2 | `020-model.md` | §3 model, validation, graph utils, canonical tree key, SMILES subset. |
| 3 | `030-naming-linear.md` | §4.1 contracts, §4.7 structure + Spanish lexicon + renderer, unbranched chains with unsaturation, omission table, first fixtures. |
| 4 | `040-naming-parent.md` | §4.2–4.4 parent selection and numbering with simple alkyl substituents, full trace. |
| 5 | `050-naming-substituents.md` | §4.5 recursive preferred substituents, grouping, alphanumerical order. |
| 6 | `060-naming-iliden-fixtures.md` | §4.6 `-iliden`, complete assembly, fixture set to ≥ 150 reviewed rows. |
| 7 | `070-oracle.md` | §8 OPSIN cross-check + graph-invariance tests; fix what they find. |
| 8 | `080-editor-core.md` | §6.1–6.3 core tools, transactions, undo/redo, rendering. |
| 9 | `090-editor-extras.md` | Chain tool, move/marquee, pan/zoom, condensed mode, formula, autosave, keyboard, touch. |
| 10 | `100-explain-results.md` | §5 explanations + §9 results panel and stepper wired to highlights; name-button e2e. |
| 11 | `110-redraw-examples.md` | §7 redraw + Ejemplos gallery. |
| 12 | `120-polish-release.md` | Ayuda, glossary, accessibility, responsive, `dist/index.html`, README, final acceptance. |

The v1 phases above were delivered as I-1…I-20 (see the progress archive).
The v2 phases I-21…I-41 are listed in §13.4.

## 12. Future (not v1)

Rings, benzene and functional groups are now planned as v2 (§13). Still
future: E/Z, quiz mode ("¿Cómo se llama?" in reverse: name → draw it).

---

## 13. v2 — rings and functional groups

Source: inbox item `autoclaude/processed/215-rings-functional-groups-confirmed.md`
(plan drafted with a Codex review of the codebase). v2 lifts the v1 limit
"acyclic hydrocarbons only". Every v2 phase keeps all existing hydrocarbon
behaviour, fixtures, snapshots and e2e green; unsupported combinations return
a clear Spanish "not nameable yet" message, never a crash or a wrong name.

### 13.1 User decisions (FINAL, 2026-09-27)

These answer the plan's open questions and are final, not provisional:

| Topic | Decision |
|---|---|
| Level | **ESO + 1º Bachillerato** — every family in the phase list below. |
| Displayed name | **Systematic IUPAC name first** (propanona, ácido etanoico, metilbenceno). Traditional names (acetona, ácido acético, tolueno…) are listed under "Otras formas válidas", as `isopropil` is today. |
| Benzene | **Monosubstituted derivatives only**; no orto/meta/para. |
| Out of scope | Stereochemistry (E/Z, cis/trans, R/S), charges, salts, heterocycles, polycycles (fused, bridged, spiro). |

Still to review per phase: new tables and exceptions need reviewed fixtures
before being presented as validated IUPAC 2013 coverage.

### 13.2 Model and data changes

- **Multi-element atoms** (I-21, done): `Atom.element` ∈ C, O, N, F, Cl,
  Br, I; neutral valences C 4, N 3, O 2, halogens 1 in one table
  (`model/elements.js`); implicit H per element; Hill formula; JSON, autosave,
  undo and ids backward compatible; element-specific valence errors; charges,
  radicals and unknown elements rejected on restore; "invalid structure" vs
  "valid but not nameable yet" (§3.2); separate caps on carbons (60), heavy
  atoms (80) and parent size (30).
- **Ring perception** (I-24, done), not just detection: `model/rings.js`
  `perceiveRings()` gives the cyclomatic number per component, ordered ring
  members (one fundamental cycle per closure bond of a breadth-first
  spanning forest), closure bonds, ring blocks (biconnected components),
  cyclic components and attachment points; `classifyRings()` says
  `acyclic`, `carbocycle`, `heterocycle`, `fused`, `bridged` (fused when
  every branch atom of a polycyclic block is bonded to another branch atom —
  exact for bicycles, a heuristic beyond), `spiro` or `several` (ring
  assemblies, rings joined by a chain), in that precedence over every ring
  block, so mixed systems do not depend on atom ids (fused + bridged blocks
  → `bridged`; a polycyclic block plus other rings → `fused`/`bridged`).
  SMILES ring labels are ring numbers (`1` ≡ `%01`). A single carbocycle
  (3–30 C) is named by `naming/rings.js`: bare since I-25 (`ciclopropano` …
  `ciclotriacontano`), with side chains and ring multiple bonds since I-26
  (§13.5), and a benzene ring with at most one substituent by
  `naming/aromatic.js` since I-28 (two or more: `CYCLE`); every other ring
  system gets `RING_SYSTEM` with an explicit message (§3.2).
- **`NameStructure` and trace** gain parent kind (`parentKind`, since
  I-25; a `RING` trace step for a ring parent), functional groups,
  principal group, suffixes, prefixes and locants on heteroatoms. The engine
  stays pure; the explanation is derived only from the result.

### 13.3 v1 assumptions that break

- `parent.js` enumerates leaf-to-leaf paths: fails on rings and must be
  restricted to the relevant carbon skeleton for functional compounds.
- "Longest chain first" can no longer universally precede principal-group
  selection.
- Substituents are no longer always hydrocarbon subtrees; the ban on triple
  bonds outside the chain no longer holds universally (nitriles).
- `buildChainStructure()` requires n−1 bonds; a ring also needs the closure
  (rings.js gives the ordered members and the closure bond;
  `buildRingStructure()` takes n bonds, the last one closing the ring).
- "Longest chain first" (P1) does not decide between a ring and a chain: the
  ring is senior (§13.5), so a molecule with one ring never enters P1–P4.
- SMILES, valence messages and labels assume carbon (valence messages and H
  counts fixed in I-21; SMILES reads and writes O, N and halogens since I-22;
  canvas labels, the element palette and "átomo" wording in editor refusals
  since I-23, §6.1/§6.3).
- Tree keys include elements but do not support cycles; since I-24
  `canonicalKey()` adds a monocycle key (polycycles still have none), and the
  OPSIN adapter keeps rings and compares them with it.
- The 90° view and "Ordenar dibujo" assumed branched chains. Since I-27b
  "Ordenar dibujo" has a ring strategy (§7): every named single carbocycle
  is ordered as a regular polygon, and a molecule that cannot be named shows
  its naming error. The 90° view still draws the normal drawing for rings
  ("Hay un anillo…" / "Hay anillos…"); both layouts refuse any other cyclic
  molecule instead of looping.
- The explanation rebuilds counts from hydrocarbon structures: it must
  receive composition and groups from the engine.

### 13.4 Phases

Conventions: **N** = `src/naming/`, **E** = `src/explain/explain.js`.
Common validation per phase: justified fixtures, negative cases, invariance
under ids/order/coordinates, explanation snapshots, relevant editor tests;
`npm test`, `npm run check`, `npm run e2e` (dev server and `file://`). OPSIN
(when available) checks structure through the English lexicon; it never
certifies IUPAC preference or Spanish spelling.

| Id | Phase | Content | Key tests |
|---|---|---|---|
| I-21 | Multi-element model | `model/{elements,molecule,validate}.js`, autosave, contracts: neutral valences, element-specific errors; new nomenclature still blocked (`HETEROATOM`). | H counts, formulas, old saves, corruption; never accept charges or radicals. |
| I-22 | Multi-element SMILES and oracle | `model/smiles.js`, `scripts/oracle/{smiles-full,compare,generate}.mjs`: O/N/halogens, keep all heavy atoms; no visible change. | Round trips, same-formula isomers, explicit H; tell adapter failures apart. |
| I-23 | Element palette | `editor/{editor,render,geometry}.js`, `ui/toolbar.js`, Ayuda: select, place and change C/O/N/F/Cl/Br/I; heteroatoms always labelled; C=O and C≡N with the existing bond tools. | Valence, keyboard/touch, one transaction per gesture; no accidental element changes. |
| I-24 | Ring infrastructure | New `model/rings.js`, `graph.js`, SMILES, oracle: ring closures in SMILES, structural identity for monocycles, scope messages. | Rotations, invalid closures, polycycles; no infinite recursion, no formula-only comparisons. |
| I-25 | Simple cycloalkanes | New `N/rings.js`, `structure.js`, renderer, both lexicons, E: `ciclohexano`; explain the closure and carbon count. | Supported sizes, formulas; closure bond highlighted. |
| I-26 | Substituted and unsaturated rings | `N/rings.js`, `parent.js`, `numbering.js`, `substituent.js`, E: every start/direction; unsaturation and substituent locants; explicit ring-vs-chain choice per the 2013 rules. | Symmetry, dienes, side chains; old school rules not carried over automatically. |
| I-27 | Drawing and ordering rings | Split in two. **I-27a** (done): editor ring templates (Anillos tool, sizes 3–8: free, hung from an atom, fused on a bond; §6.1) and inner double-bond lines for ring bonds (§6.3). **I-27b** (done): new `layout/rings.js` and `canonical.js`: Ordenar dibujo by strategy for rings (regular polygon, locant 1 on top, numbering clockwise, side chains outwards; §7); `rightangle.js` unchanged: the 90° view keeps falling back to the normal drawing for rings. | Collisions, undo, locants; topology and editability kept. |
| I-28 | Benzene and hydrocarbon derivatives | **Done.** New `N/aromatic.js`: benzene (exactly a six-carbon ring with alternating ring bonds) named `benceno`, monosubstituted benzenes without locant (`metilbenceno`, `isopropilbenceno` with the prefix-style alternatives), traditional `tolueno` / `estireno` (P-22.1.3) as a last alternative (no `cumeno`); polysubstituted → `CYCLE` `polysubstitutedBenzene`; retained `fenil`/`phenyl` prefix (`phenylSubstituent()`, unused by hydrocarbons); both lexicons; E step "Reconoce el benceno" (Kekulé drawings, no numbers, ring senior, `fenilo` form not preferred); Benceno button in Anillos (`a` cycle); Ordenar dibujo via the ring strategy; OPSIN adapter kekulizes aromatic SMILES, accepts either Kekulé drawing and generates benzene derivatives. | Both Kekulé forms; aromaticity never inferred from any alternation. |
| I-29 | Functional groups and seniority | New `N/groups.js`, `seniority.js`; selection, structure, E: detect groups without overlaps; steps "Reconoce los grupos", "Elige el principal", "Sufijo o prefijo". | Acid/ester/amide vs alcohol/ketone; detection does not yet enable naming. |
| I-30 | Halogen derivatives | Prefixes fluoro-, cloro-, bromo-, yodo-; multipliers and alphabetical order; never a suffix. | Several halogens and ties; ordering of translated prefixes. |
| I-31 | Alcohols | `etanol`, `propan-2-ol`, diols; maximise suffix groups, lowest locants; show OH. | Branched and unsaturated; alcohol vs phenol vs carboxylic OH. |
| I-32 | Aldehydes and ketones | `etanal`, `propanona` (acetona as "Otras formas válidas"); aldehyde carbon in the chain; explain -al/-ona. | Terminal/internal, several carbonyls; C=O is not a hydrocarbon unsaturation. |
| I-33 | Carboxylic acids | `ácido etanoico` (ácido acético as alternative), simple diacids; count the carboxyl carbon; COOH as a group. | Branching, numbering; salts and derivatives excluded. |
| I-34 | Ethers | Alkoxy nomenclature `metoxietano`; explicit rules for the parent side; highlight both sides of the O. | Symmetric/asymmetric, branched; a carbon chain never runs through O. |
| I-35 | Esters | `etanoato de metilo`; acid part and O-bound group explained separately. | Branched alkyls; Spanish and English assemble in different orders. |
| I-36 | Amines | Simple primary/secondary/tertiary; -amina and N-/N,N- locants; labels NH₂/NH/N. | N-substitution; ammonium and heterocycles excluded. |
| I-37 | Amides | `etanamida`, simple N-substitution; C(=O)N as one unit. | N-substituted; never ketone + amine. |
| I-38 | Nitriles | `etanonitrilo`; C of C≡N in the chain, N not counted. | Branched, simple dinitriles; drop the old "no triple bond outside the chain" assertion. |
| I-39 | Functional combinations | Seniority ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina; ethers/halogens as prefixes; hidroxi-, oxo-, amino-, ciano-. | Pair matrix and counter-examples; only covered combinations enabled. |
| I-40 | Functions on rings | Cycloalkanols, cycloalkanones, fenol and selected monosubstituted derivatives; -carboxílico, -carbaldehído, -carbonitrilo. | Counting and numbering; small aromatic functional catalogue. |
| I-41 | Condensed formulas and wrap-up | Render, both layouts, Ayuda, examples, docs: OH per atom; CHO/COOH as optional abbreviations mapped to all their atoms; 90° view for acyclic heteroatoms. | Selection, highlight, collisions, accessibility; abbreviations never change the graph. |

### 13.5 Ring vs chain and ring numbering (I-26)

**Ring vs chain.** IUPAC 2013 chooses the parent hydride by seniority of
rings over chains (P-44.1.2.2: within the same class, rings and ring systems are senior to
chains; P-52.2.8: the ring is the parent whatever the number of atoms of the
chain). With the scope of this app (one carbocycle,
acyclic hydrocarbon side chains, no principal characteristic group) the
decision table is:

| Molecule | Parent | Example |
|---|---|---|
| No ring | The chain chosen by P1–P4 (§4.3–4.4) | `3-metilhexano` |
| One carbocycle, side chains shorter than the ring | The ring; chains are prefixes | `1-etil-3-metilciclohexano` |
| One carbocycle, a side chain longer than the ring | The ring (length does not matter) | `decilciclopropano` |
| One carbocycle, the side chain holds the unsaturation | The ring (unsaturation does not matter) | `etenilciclohexano`, `metilidenciclohexano` |
| Several rings, fused/bridged/spiro rings, heterocycles | Refused (`RING_SYSTEM`) | — |
| Benzene ring, at most one side chain (I-28) | The ring, named `benceno` (P-22.1.2); the chain is a prefix without locant, whatever its length or unsaturation — never `1-feniletano` | `benceno`, `etilbenceno`, `etenilbenceno` |
| Benzene ring, two or more side chains | Refused (`CYCLE`, `polysubstitutedBenzene`; no orto/meta/para) | — |

The school rule "the longest chain wins over a smaller ring"
(`1-ciclopropildecano`) belongs to older recommendations and is **not**
carried over; the explanation says so when a side chain is longer than the
ring. Functional groups (I-40) may later move the choice (a principal group
on a chain), which will extend this table.

**Ring numbering.** Every start atom and both directions are candidates
(2n). Each lists its ring bonds in locant order; the bond joining locant n
back to 1 gets locant n (it can only appear in a winning set when every ring
bond is multiple). The chain cascade is reused as is
(`numbering.js runNumberingCascade()`), which is the IUPAC 2013 P-31.1.4
order for this scope: N1 multiple bonds (ene + yne) together, N2 double
bonds, N3 all detachable prefixes together, N4 prefixes in citation order
(P-31.1.4.3.4); P4 and N5 never apply (one parent, the same prefixes in every
numbering); the presentation tie-break (smallest atom-id tuple) picks one of
several numberings that give the same name, so names never depend on atom
ids, bond order or coordinates. A bare cycloalkane is not numbered.
Locant omission for rings: §1.1.
