# "Ordenar dibujo" must be undoable

User report: "Ordenar dibujo" should be undo-able — in practice the user
could not get the previous drawing back with Deshacer (button or
Ctrl/Cmd+Z) after pressing it.

design.md §7 already says it is applied as **one** undoable coordinate edit
(no undo step when the drawing is already ordered), so treat this as a bug:
- Reproduce in the real app (dev server and `dist/index.html`): draw a
  molecule by hand, name it, press "Ordenar dibujo", then Deshacer. Expected:
  the hand-drawn coordinates come back exactly, in one step, and Rehacer
  re-applies the ordered layout.
- Check the likely traps: the ~400 ms animation (undo pressed during or
  after it; the committed coordinates vs. the animated ones; reduced
  motion), the "already ordered → no undo step" check wrongly matching,
  the persistent parent highlight / naming result clearing or re-running,
  autosave restore, the Deshacer button's enabled state not updating, and
  the 90° view / "Con carbonos" mode.
- Fix the root cause and add an e2e test for draw → ordenar → deshacer →
  rehacer (both targets), plus a unit test if the bug is in the history code.
