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
  undeca, dodeca… for simple prefixes; bis, tris, tetrakis, pentakis… for
  compound (parenthesised) prefixes.
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
  contains an isopropyl group, the result also lists the name in the other
  two accepted styles, each labelled:
  - `5-(propan-2-il)nonano` — "nombre preferido por la IUPAC (2013)";
  - `5-(1-metiletil)nonano` — "forma sistemática clásica".
  Changing the prefix changes its alphabetical position (`i` vs `p` vs `m`),
  which can change the citation order **and** the N4 numbering decision, so
  each alternative is produced by re-running prefix sorting and N4 (§4.4)
  under that style — never by substituting text in the main name. The
  engine takes a `prefixStyle` option: `'isopropil'` (default), `'pin'`,
  `'substituted'`.
- **Locant omission** is an explicit rule table, never inferred from "only
  one structural possibility":
  - Unsubstituted parents with omitted locants: `metano`, `etano`, `eteno`,
    `etino`, `propeno`, `propino`, `propadieno`.
  - Everything else keeps all locants: `2-metilpropano`,
    `2-metilprop-1-eno`, `but-1-eno`, `2,2-dimetilpropano`.
  - Substituent prefixes: `metil`, `etil`, `etenil`, `etinil`, `metiliden`,
    `etiliden` carry no internal locant; longer ones always do
    (`prop-2-en-1-il`, `propan-2-il`), except the named group `isopropil`.
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
  model/smiles.js       tiny acyclic C-only SMILES parser/writer
  model/graph.js        connectivity, cycle detection, paths, canonical tree key
  naming/lexicon.es.js  Spanish word tables (stems, multipliers, endings, retained prefixes)
  naming/lexicon.en.js  English tables — used only by the oracle (§8)
  naming/parent.js      parent-chain candidates and selection cascade
  naming/numbering.js   locant-list comparison, numbering cascade
  naming/substituent.js recursive substituent naming
  naming/structure.js   the language-neutral "name structure" (§4.7)
  naming/render.js      name structure + lexicon → string and coloured parts
  naming/index.js       nameMolecule(mol) → result (§4.1)
  explain/explain.js    trace → ordered Spanish steps with highlight data
  editor/editor.js      SVG sketcher: tools, pointer handling, transactions
  editor/history.js     undo/redo of transactions
  editor/geometry.js    placement angles, snapping, bond length
  editor/render.js      SVG rendering (skeletal and condensed modes)
  layout/canonical.js   redraw: main chain horizontal zigzag, branches placed
  ui/app.js             wires editor, name button, results panel, stepper
  ui/examples.js        example gallery
tests/
  unit/*.test.js        node --test
  fixtures/names.tsv    SMILES <TAB> expected name <TAB> rule tested <TAB> justification
  e2e/*.spec.js         Playwright
scripts/
  build.mjs             inline everything into dist/index.html (no deps)
  oracle/               OPSIN cross-check tooling (§8), never bundled
docs/design.md          this file
```

`package.json` scripts: `test` (`node --test tests/unit`), `e2e`
(`playwright test`), `build` (`node scripts/build.mjs`), `serve`
(`python3 -m http.server 8000`), `check` (`node --check` on every `.js`/`.mjs`
file under `src/`, `tests/`, `scripts/`), `oracle` (§8).

---

## 3. Molecule model

### 3.1 Data

- `Molecule { atoms: Map<id, Atom>, bonds: Map<id, Bond> }`; ids are
  incrementing integers, stable across undo/redo and redraw.
- `Atom { id, element: 'C', x, y }`. Coordinates matter only to the editor
  and layout; **the naming engine must never read them.**
- `Bond { id, a, b, order: 1|2|3 }`.
- `implicitH(atom) = 4 − Σ order` (never negative: validation guarantees it).
- Derived: molecular formula `CₙHₘ`, neighbours, connected components,
  `hasCycle()`, `isEmpty()`.
- JSON serialisation (autosave, undo snapshots).
- `smiles.js`: parses `C`, `=`, `#`, parenthesised branches; rejects ring
  digits, other elements, aromatic atoms, brackets — with an explicit error,
  never by silently dropping input. The writer is for debugging and examples.
  Fixtures use SMILES, so the test suite never depends on coordinates.

### 3.2 Validation (single function, used everywhere)

`validate(mol)` checks: atom and bond ids unique; bond endpoints exist; no
self-bonds; no duplicate bonds between the same pair; orders ∈ {1,2,3};
carbon valence ≤ 4; then, for naming only: non-empty, connected, acyclic,
size caps. The same checks guard editor transactions, JSON restoration
(corrupt autosave → start empty, no crash) and SMILES input. Errors are codes
with Spanish messages:

| Code | Message |
|---|---|
| `EMPTY` | Dibuja primero una molécula. |
| `DISCONNECTED` | Hay piezas sueltas: todas las partes deben estar unidas. |
| `CYCLE` | Has dibujado un anillo. De momento solo sé nombrar cadenas abiertas. |
| `VALENCE` | Este carbono tendría más de 4 enlaces. |
| `TOO_BIG` | La molécula es demasiado grande (máximo 60 carbonos, cadena de 30). |
| `INVALID` | internal/corrupt data; generic friendly message |

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
    alternatives: [{ style, label, name, parts }] }   // §1.1; empty if no isopropyl group
| { ok: false, error: { code, message } }
```

`TraceStep = { rule, candidatesBefore, values, survivors, note? }` where each
candidate is `{ atoms, direction?, key }` and `values` are the compared data
(counts or locant lists). The explanation layer (§5) consumes only the trace
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

### 4.3 Parent selection (direction-independent)

Compare in order; stop when one chain remains:

1. **P1 Longest chain** — carbon count.
2. **P2 Most multiple bonds** — double + triple bonds **lying within** the
   chain. A double bond connecting the chain to a substituent does not count.
3. **P3 Most double bonds** — within the chain.
4. **P4 Most substituents** — number of individual substituent prefixes
   attached to the chain: two substituents on one carbon count as two; a
   doubly-attached substituent (`-iliden`) counts as one.

Remaining chains go, together with both directions of each, to §4.4.

### 4.4 Numbering (and remaining parent choice)

Every candidate is a `(chain, direction)` pair. Compare **sorted locant
lists, keeping repeated locants, term by term, numerically, at the first
point of difference — never by sums**:

5. **N1** all multiple bonds together (`eno` + `ino`); a bond's locant is the
   lower of its two atom locants.
6. **N2** double bonds.
7. **N3** all substituent prefixes together (an `-iliden` prefix contributes
   its parent attachment locant once).
8. **N4** prefixes in citation (alphanumerical) order: locants of the first
   cited prefix, then the second, … until a difference appears.
9. **Presentation tie-break** — if every chemical criterion ties, the names
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
  double bonds; most substituents; then numbering: **lowest locant for the
  free valence first**, then multiple bonds together, double bonds,
  substituent prefixes, citation order — same comparison rules as §4.4.
- Retained prefixes, encoded explicitly in the lexicon: `tert-butil`
  (C(CH₃)₃ attached at the central carbon), and — in the default
  `'isopropil'` style only — `isopropil` (CH(CH₃)₂ attached at the central
  carbon). In `'pin'` style the latter is `propan-2-il`; in `'substituted'`
  style every group is named with the free valence at 1 (`1-metiletil`).
  Nothing else is retained in v1.
- Naming: prefixes + stem + unsaturation + `il`/`iliden` with the free-valence
  locant: `propan-2-il`, `prop-2-en-1-il`, `prop-1-en-2-il`, `but-3-in-1-il`,
  `2-metilpropil`, `(2,2-dimetilpropil)`, `propan-2-iliden`. One- and
  two-carbon groups carry no locant: `metil`, `etil`, `etenil`, `etinil`,
  `metiliden`, `etiliden`. An unbranched saturated chain attached at its end
  takes the short form (`propil`, not `propan-1-il`) — confirm this against
  the PIN rules in the fixture review of phase 050 and record the source.
- Parentheses around any prefix that contains its own locants or its own
  substituents: `(propan-2-il)`, `(prop-2-en-1-il)`, `(2-metilpropil)`.
  Simple prefixes (`metil`, `etil`, `etenil`, `metiliden`, `isopropil`,
  `tert-butil`) get no parentheses.
- Identical substituents are grouped: di/tri for simple prefixes,
  bis/tris for parenthesised ones (`bis(propan-2-il)`).

### 4.6 Doubly-attached substituents (`-iliden`)

Under 2013 rules the longest chain wins even if a double bond leaves it.
`CH₂=C(CH₂CH₂CH₃)CH₂CH₂CH₃` → seven-carbon saturated parent →
**`4-metilidenheptano`**. The connecting double bond is represented on the
substituent, not counted in P2/P3/N1/N2, and its parent locant is part of the
prefix locants (N3/N4).

### 4.7 Name structure and rendering

The engine produces a **language-neutral name structure** (parent length,
unsaturation locant lists, grouped prefixes each with locants and a nested
structure). `render.js` turns it into the Spanish string and coloured parts
using `lexicon.es.js`; the oracle (§8) renders the same structure with
`lexicon.en.js`. No name is ever produced by substring translation.

Assembly order: group identical prefixes → sort alphanumerically (§1.1) →
parent = stem + connecting `a` (per §1.1) + unsaturation segments with
locants + ending → join with the punctuation rules, apply the locant-omission
table.

### 4.8 Fixtures (authority for choice rules)

`tests/fixtures/names.tsv`: `SMILES <TAB> expected name <TAB> rule tested
<TAB> justification <TAB> alternatives` (the last column: `style=name`
pairs separated by `;`, empty when there are none). At least 150 rows by the end of phase 060, grouped by
feature. **Every row is a real SMILES and a justified name**; no fragments,
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
`hexa-1,3,5-trieno`; `tert-butil` and `bis(…)` cases; alphabetisation of a
compound prefix under its inner multiplier; N4 cases; symmetric molecules.

The oracle (§8) is the second line of defence, not a replacement.

---

## 5. Explanation (Spanish, ESO level)

`explain(result)` → array of steps
`{ title, text, highlight: {atoms, bonds, style}, locants?, options? }`.
Steps, in order; a step that decided nothing is skipped (or one short line
when instructive):

1. **Cuenta los carbonos** — "Tu molécula tiene 7 carbonos y 16 hidrógenos
   (C₇H₁₆)."
2. **Busca la cadena más larga** — each longest chain shown in turn ("Opción 1
   de 3"). "La cadena más larga tiene 6 carbonos. Hay 2 cadenas de 6."
   When an unsaturation stays outside the parent, say so explicitly: "El doble
   enlace no está en la cadena principal: con las normas actuales de la IUPAC
   manda la longitud."
3. **Desempates** (multiple bonds / double bonds / substituents) — only when a
   tie existed, with counts per option.
4. **Numera la cadena** — both directions side by side with their locant lists
   and the first point of difference highlighted: "Por la izquierda: 2, 4. Por
   la derecha: 3, 5. Gana la izquierda porque 2 es menor que 3."
5. **Nombra los sustituyentes** — each highlighted with its name; compound
   ones get a nested mini-explanation; common names as notes. For an
   isopropyl group, explain the three accepted names (`isopropil`,
   `propan-2-il`, `1-metiletil`) and why each is written that way.
6. **Ordena alfabéticamente** — "etil va antes que metil (e antes que m). Los
   prefijos di-, tri- no cuentan para el orden."
7. **Monta el nombre** — built piece by piece, coloured by part kind, with a
   legend: "hex = 6 carbonos, -eno = hay un doble enlace".

Where the locant-omission table applies, a note explains it ("En «propeno» no
hace falta el número: el doble enlace solo puede estar en el carbono 1").
Glossary tooltips on underlined terms: *cadena principal*, *sustituyente
(radical)*, *localizador*, *insaturación*, *enlace doble/triple*. Tone: second
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
| **Carbono** | Click empty space → a lone carbon (this is how you draw methane). Click an atom → grow a new carbon from it at the best free angle (§6.2). |
| **Enlace simple / doble / triple** (default simple) | Click empty space → new two-carbon fragment with that bond order. Click an atom → grow a new carbon bonded with that order. Drag from an atom → new carbon in the drag direction, snapped to 30°; releasing on an existing atom bonds the two (a ring is allowed; naming refuses it). Click an existing bond → **set** it to the tool's order. |
| **Cambiar enlace** | Click a bond → cycle 1→2→3→1 (skipping orders that break valence). |
| **Cadena** | Drag from empty space or an atom: a zigzag chain grows along the drag, live counter "5 C". Release commits. |
| **Borrar** | Click atom → delete it and its bonds. Click bond → delete bond; atoms left with no bonds that were created only as its endpoints are removed too. |
| **Mover** | Drag an atom (moves it). Drag on empty space → marquee selection; then drag the selection. |
| Pan / zoom | Space+drag, middle-drag or two-finger drag pans; wheel / pinch zooms; "Centrar" button fits the molecule. |
| Buttons | Deshacer, Rehacer, Limpiar (in-page confirmation dialog, never `window.confirm`), Ordenar dibujo (§7). |

Rules: every pointer gesture commits **one** undo transaction; Esc or pointer
cancel restores the starting state. Duplicate bonds and self-bonds are
rejected; any valence violation is refused with a brief shake and a toast
("Este carbono ya tiene 4 enlaces"). After a bond-order change, linear
geometry is recomputed (triple bonds and cumulated double bonds straightened
to 180°) as part of the same transaction.

Keyboard: `c` carbono, `1/2/3` bond tools, `t` cambiar enlace, `h` cadena,
`e`/`Supr` borrar, `m` mover, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`.

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
- Display toggle **Esqueleto / Con carbonos**: the second labels each carbon
  with C + implicit H only (`CH₃`, `CH₂`, `CH`, `C`) — never `=` in labels.
- Hover highlight on atoms and bonds. Highlight API for the stepper:
  `highlight({atoms, bonds, style})` with styles
  `parent|candidate|substituent|locant`, and `showLocants(Map atomId→n)`.
- Live molecular formula under the canvas ("Fórmula: C₅H₁₂").
- Autosave to `localStorage` (every access in try/catch; restore goes
  through `validate()`).
- The editor distinguishes **chemical edits** (atoms/bonds/orders) from
  **coordinate edits** (move, redraw): only chemical edits invalidate a
  shown name.

---

## 7. Redraw ("Ordenar dibujo")

`canonicalLayout(mol, result)` → new coordinates only (ids and topology
unchanged):

- Parent as a horizontal zigzag, locant 1 on the left.
- Substituents drawn away from the parent on the zigzag's free side,
  recursively as zigzags; resolve collisions by flipping sides, then widening
  angles. Tested on densely branched examples (no two atoms closer than 0.5
  bond lengths).
- Linear centres straightened.
- Applied as **one** undoable coordinate edit, animated ~400 ms
  (`prefers-reduced-motion` respected). The naming result stays; the parent
  is highlighted persistently while the ordered drawing is shown; locant
  numbers appear next to parent atoms from the numbering step on.
- After naming, a hint offers it: "¿Quieres ver la cadena principal
  ordenada?".

---

## 8. Oracle cross-check (OPSIN) — development only

OPSIN (open-source name→structure, Java) reads English IUPAC names.

1. English names come from the **same name structure** rendered with
   `lexicon.en.js` (`met`→`meth`, `et`→`eth`, `-ano`→`-ane`, `-eno`→`-ene`,
   `-ino`→`-yne`, `-il`→`-yl`, `-iliden`→`-ylidene`, retained prefixes,
   punctuation) — never substring translation.
2. A seeded random generator produces valid acyclic hydrocarbons (4–14 C,
   random branching and unsaturation within valence).
3. name → English → OPSIN → SMILES → a **dev-only fuller SMILES parser**
   (bracket atoms, explicit H) → hydrogen-suppressed carbon tree → compare
   with the original using an unrooted canonical tree key (atoms + bond
   orders), plus a formula check. Unsupported OPSIN syntax is an adapter
   failure, not a naming failure.
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

---

## 9. UI

Layout (desktop): toolbar | canvas | results panel (right; below the canvas
on narrow screens).

- Big button **"¿Cómo se llama?"**.
- Results panel: the name (large, coloured parts); below it, when present,
  **"Otras formas válidas"** listing each alternative with its label (§1.1);
  then **"Ver paso a
  paso"**: a stepper with Anterior / Siguiente and progress dots, each step
  driving the canvas highlight.
- Errors in friendly Spanish (§3.2).
- A chemical edit clears the result (stale names must never show);
  coordinate edits do not.
- **Ejemplos** menu: 12–15 molecules from SMILES covering each feature,
  loaded with the canonical layout.
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

## 12. Future (not v1)

Rings and benzene, E/Z, quiz mode ("¿Cómo se llama?" in reverse:
name → draw it), functional groups.
