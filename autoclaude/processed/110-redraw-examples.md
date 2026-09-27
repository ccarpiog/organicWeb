# Phase 110 — Redraw ("Ordenar dibujo") and examples

Spec: `docs/design.md` §7 (redraw), §9 (Ejemplos).

## Task
- `src/layout/canonical.js`: parent as horizontal zigzag (locant 1 left),
  substituents recursively on free sides, collision resolution (flip, then
  widen), linear centres straightened. Coordinates only; ids/topology
  unchanged.
- "Ordenar dibujo" button + post-naming hint; one undoable coordinate edit,
  ~400 ms animation respecting `prefers-reduced-motion`; name result kept;
  parent highlighted; locants shown from the numbering step on.
- Ejemplos menu with 12–15 molecules (SMILES → canonical layout) covering:
  alkane, branched alkane, alkene, diene, alkyne, en-yne, `2-metilpropano`,
  an `isopropil` case, a `tert-butil` case, `4-etenilheptano`,
  `3-metilidenhexano`, a symmetric molecule.

## Acceptance criteria
- Unit test: for every fixture molecule, canonical layout has no two atoms
  closer than 0.5 bond length and the parent atoms' x increase with locant.
- e2e: load an example, name it, press Ordenar dibujo, undo restores
  previous coordinates, name still shown.
