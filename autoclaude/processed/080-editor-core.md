# Phase 080 — Editor core

Spec: `docs/design.md` §6.1 (Carbono, bond tools, Cambiar enlace, Borrar),
§6.2, §6.3, and the transaction rules in §6.1.

## Task
- `src/editor/editor.js`, `history.js`, `geometry.js`, `render.js`: SVG
  sketcher with pointer events (mouse + touch + pen). Tools: Carbono,
  Enlace simple/doble/triple (click empty, click atom, drag with 30° snap,
  release on atom to bond), click bond sets order, Cambiar enlace (cycle,
  skipping invalid orders), Borrar. Deshacer/Rehacer/Limpiar (in-page
  dialog). One gesture = one transaction; Esc cancels.
- All mutations go through the model + `validate()`: valence violations,
  duplicate and self bonds refused with shake + Spanish toast.
- Geometry: zigzag-aware placement, linear centres at 180°, overlap
  avoidance; bond-order changes re-straighten linear centres in the same
  transaction.
- Rendering: single/double/triple strokes, hover highlight, and the
  highlight API (`highlight`, `showLocants`) used later by the stepper.
- Expose a small test API on the editor instance (e.g. `getMolecule()`,
  tool selection) for tests.

## Acceptance criteria
- Unit tests for geometry (angles) and history (undo/redo of each gesture
  type, cancel restores state).
- e2e: draw butane by clicks, change a bond to double, undo, redo, erase an
  atom; assert the molecule via the test API. Drawing methane with the
  Carbono tool works. Toast appears on a 5th bond attempt.
