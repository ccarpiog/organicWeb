# Extend scope: cyclic hydrocarbons and functional groups (v2 plan)

User request: be able to name **hidrocarburos cíclicos** and compounds with
**grupos funcionales** (alcohol, éter, aldehído, cetona, ácido, éster, amina,
amida, nitrilo, derivados halogenados…). This lifts the v1 scope limit in
CLAUDE.md ("acyclic hydrocarbons only") — update CLAUDE.md and design.md
accordingly when the first phase lands.

How to take this item:
- It is a large multi-phase plan (below, drafted with a Codex review of the
  codebase). Copy it into `docs/design.md` as a new section plus rows in the
  phase table, and queue the phases in order after the remaining work. Split
  or merge phases as needed to fit one session each.
- Phases 1–4 (multi-element model, SMILES/oracle, element palette, ring
  infrastructure) do not depend on the open decisions in §4 and can start
  right away.
- Until the user answers §4, use these defaults and record them in
  design.md as provisional: level ESO + 1º Bachillerato; systematic IUPAC
  name shown first, traditional names (acetona, ácido acético, tolueno…)
  listed under "Otras formas válidas" like `isopropil` today; benzene with
  monosubstituted derivatives only, no orto/meta/para labels; stereo
  (E/Z, cis/trans, R/S), charges, salts, heterocycles and polycycles out of
  scope.
- Every phase must keep all existing hydrocarbon behaviour and tests green.

## 1. Model and data changes needed first

- Extend the existing `Atom.element` to C, O, N, F, Cl, Br, I. Centralise
  neutral valences (4, 2, 3, 1) and compute implicit H per element.
  Distinguish "invalid structure" from "valid but not nameable yet".
- Keep JSON, autosave, undo and IDs backward compatible. Separate limits on
  carbons, total atoms and size of the parent.
- **Ring perception**, not just detection: members, closure bonds, cyclic
  components and attachment points. Start with a single carbocycle; refuse
  fused, bridged, spiro and heterocyclic systems with explicit messages.
- Extend `NameStructure` and the trace with parent kind, functional groups,
  principal group, suffixes, prefixes and locants on heteroatoms. The engine
  stays pure; the explanation is derived only from the result.

## 2. Existing assumptions that break

- `parent.js` enumerates leaf-to-leaf paths: fails on rings and must be
  restricted to the relevant carbon skeleton for functional compounds.
- "Longest chain first" can no longer universally precede principal-group
  selection.
- Substituents are no longer always hydrocarbon subtrees; the ban on triple
  bonds outside the chain no longer holds universally (nitriles).
- `buildChainStructure()` requires n−1 bonds; a ring also needs the closure.
- SMILES, valence messages and labels assume carbon. The model's formula
  already uses Hill order but its H count assumes valence 4.
- Tree keys include elements but do not support cycles. The OPSIN adapter
  parses broad syntax and then reduces it to a carbon tree.
- The 90° view and "Ordenar dibujo" assume branched chains; they need
  specific strategies and a safe fallback to the normal drawing.
- The explanation rebuilds counts from hydrocarbon structures: it must
  receive composition and groups from the engine.

## 3. Proposed phases

Conventions: **N** = `src/naming/`, **E** = `src/explain/explain.js`. Every
phase keeps everything before it working; unsupported combinations return a
clear Spanish error. Common validation per phase: justified fixtures,
negative cases, invariance under IDs/order/coordinates, explanation
snapshots, relevant editor tests; `npm test`, `npm run check`, e2e on dev
server and `file://`. OPSIN (when available) checks structure through the
English lexicon; it never certifies IUPAC preference or Spanish spelling.

1. **Multi-element model** — `model/molecule.js`, `validate.js`, autosave,
   contracts. Neutral valences; element-specific errors; new nomenclature
   still blocked. Tests: H counts, formulas, restoring old saves, corruption;
   never accept charges or radicals by accident.
2. **Multi-element SMILES and oracle** — `model/smiles.js`,
   `scripts/oracle/{smiles-full,compare,generate}.mjs`. O/N/halogens, keep
   all heavy atoms; no visible change. Tests: round trips, same-formula
   isomers, explicit H; tell adapter failures apart.
3. **Element palette** — `editor/{editor,render,geometry}.js`,
   `ui/toolbar.js`, Ayuda. Select, place and change C/O/N/F/Cl/Br/I;
   heteroatoms always labelled; draw C=O and C≡N with the existing bond
   tools. Tests: valence, keyboard/touch, one transaction per gesture; avoid
   accidental element changes.
4. **Ring infrastructure** — new `model/rings.js`, `graph.js`, SMILES,
   oracle. Ring closures in SMILES; structural identity for monocycles;
   scope messages. Tests: rotations, invalid closures, polycycles; no
   infinite recursion, no formula-only comparisons.
5. **Simple cycloalkanes** — new `N/rings.js`, `structure.js`, renderer,
   both lexicons, E. `ciclohexano`; explain the closure and carbon count;
   name hand-drawn rings. Tests: supported sizes, formulas; closure bond
   highlighted.
6. **Substituted and unsaturated rings** — `N/rings.js`, `parent.js`,
   `numbering.js`, `substituent.js`, E. Compare every start/direction;
   unsaturation and substituent locants; explicit ring-vs-chain choice
   table per the 2013 rules. Tests: symmetry, dienes, side chains; do not
   carry over old school rules automatically.
7. **Drawing and ordering rings** — editor, new `layout/rings.js`,
   `canonical.js`, `rightangle.js`. Polygon templates, inner double-bond
   lines, Ordenar dibujo by strategy; 90° view falls back to the normal
   drawing for rings. Tests: collisions, undo, locants; keep topology and
   editability.
8. **Benzene and hydrocarbon derivatives** — new `N/aromatic.js`, lexicons,
   editor, E, OPSIN adapter. Benzene, alkylbenzenes, fenilo; hexagon
   template with alternating bonds; explain equivalent Kekulé drawings.
   Tests: both Kekulé forms, substitution positions; do not infer
   aromaticity from any alternation.
9. **Functional groups and seniority** — new `N/groups.js`, `seniority.js`;
   selection, structure, E. Detect groups without overlaps; new steps
   "Reconoce los grupos", "Elige el principal", "Sufijo o prefijo". Tests:
   acid/ester/amide vs alcohol/ketone; detection does not yet enable naming.
10. **Halogen derivatives** — prefixes fluoro-, cloro-, bromo-, yodo-;
    multipliers and alphabetical order; never a suffix. Tests: several
    halogens and ties; ordering of translated prefixes.
11. **Alcohols** — `etanol`, `propan-2-ol`, diols; maximise suffix groups
    and give them lowest locants; show OH. Tests: branched and unsaturated;
    alcohol vs phenol vs carboxylic OH.
12. **Aldehydes and ketones** — `etanal`, `propanona`; aldehyde carbon in
    the chain, carbonyl highlighted; explain -al/-ona. Tests: terminal /
    internal, several carbonyls; C=O is not a hydrocarbon unsaturation.
13. **Carboxylic acids** — `ácido etanoico`, simple diacids; count the
    carboxyl carbon; COOH shown as a group. Tests: branching, numbering;
    salts and derivatives reserved.
14. **Ethers** — alkoxy nomenclature: `metoxietano`; explicit rules to pick
    the parent side; highlight both sides of the O. Tests: symmetric /
    asymmetric, branched; a carbon chain never runs through O.
15. **Esters** — `etanoato de metilo`; identify the acid part and the
    O-bound group, explained separately. Tests: branched alkyls; Spanish and
    English assemble in different orders.
16. **Amines** — simple primary/secondary/tertiary; -amina and N-/N,N-
    locants; labels NH₂/NH/N. Tests: N-substitution; exclude ammonium and
    heterocycles.
17. **Amides** — `etanamida`, simple N-substitution; C(=O)N as one unit.
    Tests: N-substituted; never classify as ketone + amine.
18. **Nitriles** — `etanonitrilo`; C of C≡N in the chain, N not counted.
    Tests: branched, simple dinitriles; remove the old assertion about
    triple bonds outside the chain.
19. **Functional combinations** — seniority among supported families:
    ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina;
    ethers/halogens as prefixes; hidroxi-, oxo-, amino-, ciano-. Tests:
    pair matrix and counter-examples; enable only covered combinations.
20. **Functions on rings** — cycloalkanols, cycloalkanones, fenol and
    selected derivatives; suffixes whose carbon is outside the ring:
    -carboxílico, -carbaldehído, -carbonitrilo. Tests: counting and
    numbering; keep the aromatic functional catalogue small.
21. **Condensed formulas and wrap-up** — render, both layouts, Ayuda,
    examples, docs. OH per atom; CHO/COOH as optional abbreviations mapped
    to all their atoms; adapt the 90° view to acyclic heteroatoms. Tests:
    selection, highlight, collisions, accessibility; abbreviations never
    change the graph.

## 4. Open decisions for the user (teacher)

- Level: ESO or 1º Bachillerato — required families, sizes, combinations;
  later nitro and sulfur compounds?
- Displayed name: acetona/propanona, ácido acético/etanoico,
  tolueno/metilbenceno — traditional vs systematic vs retained preferred.
- Benzene scope: fenol, anilina, ácido benzoico, estireno, orto/meta/para.
- Confirm exclusions: E/Z, cis/trans, R/S; initially also charges, salts,
  heterocycles and polycycles.
- Normative review: new tables and exceptions need reviewed fixtures before
  being presented as validated IUPAC 2013 coverage.
