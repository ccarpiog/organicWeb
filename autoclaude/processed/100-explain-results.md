# Phase 100 — Explanations and results panel

Spec: `docs/design.md` §5 (explanation), §9 (UI).

## Task
- `src/explain/explain.js`: result + trace → Spanish ESO-level steps
  (Cuenta los carbonos, Busca la cadena más larga with options, Desempates,
  Numera la cadena with side-by-side locant lists and first point of
  difference, Nombra los sustituyentes with common-name notes, Ordena
  alfabéticamente, Monta el nombre with coloured legend). Explicit sentence
  when an unsaturation stays outside the parent (2013 rule). Locant-omission
  notes. Glossary tooltips.
- Snapshot tests: `explain()` output for ~20 fixtures stored as JSON.
- UI: enable "¿Cómo se llama?"; results panel with coloured name, "Ver paso
  a paso" stepper (Anterior/Siguiente, dots) driving canvas highlights and
  locant labels; "Otras formas válidas" block listing `alternatives` with
  labels (design §1.1, §9); friendly errors; chemical edits clear the result,
  coordinate edits keep it.

## Acceptance criteria
- e2e: draw `3-metilhexano`-like molecule, press the button, assert the name;
  step through all steps and assert highlights change; for
  `5-isopropilnonano` assert both alternatives are listed; edit a bond and assert
  the result clears; draw a ring and assert the CYCLE message.
- Snapshot tests pass; texts reviewed for ESO-level Spanish (short
  sentences, no untranslated jargon).
