# From the name to the drawing — «¿Cómo se dibuja?» (user-confirmed scope, 2026-10-14)

User request (2026-10-14): the reverse of the app. The student builds a
name from **tiles** (numbers, multipliers, word roots, endings, group words
and traditional names; no free text) and the app draws the molecule, says
whether the name is the one the app gives and explains why.

The user's decisions are **final**. The full plan — behaviour, verdicts,
architecture (`src/reverse/`), grammar, automatic punctuation rules, the
`readName()` algorithm, error messages, tests, 16 phases and code traps —
is already written in **`docs/design.md` §15 (v4)**. A first draft was
reviewed by Codex against the codebase; its findings are merged into §15
and kept verbatim in `docs/reviews/v4-plan-codex.md`.

Summary of the user's decisions:

- Tiles only; no text input anywhere in the feature.
- Punctuation is automatic (hyphens, commas, spaces, enclosing marks, `de`,
  the connecting `a`, elided vowels…); the student picks the meaningful
  pieces and marks where a compound branch starts and ends.
- The drawn molecule replaces the canvas drawing as one undoable edit,
  centred, like Ejemplos; the results panel shows the verdict, the name,
  «Otras formas válidas» and the stepper.
- Traditional names are tiles too, and are suggested as alternate naming
  (a name with a traditional form gets «También se llama …»; a traditional
  name built from tiles is accepted with its label).
- Phase scope and order: design.md §15.8 (left to Claude by the user).

How to take this item:

- Queue the phases of design.md §15.8 in order (R-1a … R-7) after any
  remaining work; split a phase further if it does not fit one session.
- The first phase also adds the v4 scope line to CLAUDE.md (the feature
  and its current coverage), and every phase updates the Status column of
  §15.8.
- Every phase keeps all existing outputs, fixtures, snapshots and e2e
  green; `src/naming/` changes only by new exports.
- All new Spanish wording is the app's own phrasing and stays pending
  teacher review (§15, last paragraph).
