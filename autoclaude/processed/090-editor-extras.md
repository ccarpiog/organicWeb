# Phase 090 — Editor extras

Spec: `docs/design.md` §6.1 (Cadena, Mover, pan/zoom, keyboard), §6.3
(display toggle, formula, autosave, chemical vs coordinate edits).

## Task
- Cadena tool with live "N C" counter.
- Mover: drag atom; marquee selection on empty space, drag selection.
- Pan (space+drag, middle drag, two-finger) and zoom (wheel, pinch);
  "Centrar".
- Toggle Esqueleto / Con carbonos (labels C + implicit H only).
- Live formula under the canvas.
- Autosave/restore via `localStorage` (try/catch; restore through
  `validate()`; corrupt data → empty canvas, no crash).
- Keyboard shortcuts of §6.1.
- Editor emits distinct events for chemical edits and coordinate edits.

## Acceptance criteria
- e2e: chain tool drag creates the expected carbon count; marquee + move
  changes coordinates but emits only a coordinate edit; reload restores the
  molecule; formula text updates; keyboard shortcuts switch tools.
- Unit tests for the chain generator and label text.
