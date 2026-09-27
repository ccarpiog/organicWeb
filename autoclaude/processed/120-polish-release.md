# Phase 120 — Polish and release build

Spec: `docs/design.md` §9 (Ayuda, accessibility, theming), §1
(distribution), §10.

## Task
- Ayuda dialog (how to draw, short, inline SVG illustrations) and glossary
  tooltips finished.
- Accessibility: keyboard-reachable controls, visible focus, ARIA labels,
  name and step text announced (aria-live).
- Responsive check at phone width (no horizontal scroll, bottom toolbar) and
  tablet touch.
- `npm run build` → `dist/index.html` fully self-contained; e2e suite also
  runs against the built file.
- README (English): features, how to use, rules followed (IUPAC 2013),
  development, oracle, known limitations and future work (§12).

## Acceptance criteria
- `npm test`, `npm run check`, `npm run e2e` (source and dist), `npm run
  build` exit 0.
- Final acceptance e2e: from an empty page, draw `4-etenilheptano` with the
  editor, name it, step through the explanation, redraw — all in the built
  file opened via `file://`.
