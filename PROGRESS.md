# PROGRESS — organicWeb

Live checkpoint for the autoclaude loop. Plan: `PLAN.md` → phases are the
inbox items `autoclaude/inbox/010-*.md` … `120-*.md`, executed in filename
order, each queued as an `I-n` phase when triaged. Spec: `docs/design.md`.

## Phases

| id | title | spec | status | risk / worker | review |
|---|---|---|---|---|---|
| I-1 | Project scaffold | `autoclaude/processed/010-scaffold.md` | done — `docs/progress-archive/i-1.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-1.md` |
| I-2 | Molecule model, validation, SMILES subset | `autoclaude/processed/020-model.md` | done — `docs/progress-archive/i-2.md` | routine / opus | Codex ship-with-fixes, fixed — `docs/reviews/I-2.md` |
| I-3 | Naming engine I: contracts, lexicon, unbranched chains | `autoclaude/processed/030-naming-linear.md` | queued | — | — |
| I-4 | Naming engine II: parent selection and numbering | `autoclaude/processed/040-naming-parent.md` | queued | — | — |
| I-5 | Naming engine III: recursive preferred substituents | `autoclaude/processed/050-naming-substituents.md` | queued | — | — |
| I-6 | Naming engine IV: iliden substituents and fixture set | `autoclaude/processed/060-naming-iliden-fixtures.md` | queued | — | — |

Remaining plan items (070–120) are still in `autoclaude/inbox/` and will be
queued as `I-7` … `I-12` at later phase boundaries.

## Inbox

- 2026-09-27 pickup 1: `010-scaffold.md`, `020-model.md`,
  `030-naming-linear.md` → queued as I-1, I-2, I-3 (in plan order).
- 2026-09-27 pickup 2 (after I-1): `040-naming-parent.md`,
  `050-naming-substituents.md`, `060-naming-iliden-fixtures.md` → queued as
  I-4, I-5, I-6.

## Next action

Poll the inbox first (phase boundary; items 070–120 remain), then execute
I-3 (naming engine I: contracts, lexicon, unbranched chains) per
`autoclaude/processed/030-naming-linear.md`.

## Key paths

- Bundler: `scripts/build.mjs` — read its header for supported module syntax
  before adding code to `src/` (no circular imports, no `import()`, no
  multi-declarator or destructuring exports, bindings copied not live).
- Tests: `tests/unit/*.test.js` (node --test), `tests/e2e/*.spec.js`.
- Model: `src/model/{molecule,graph,validate,smiles}.js` — `canonicalTreeKey`
  in graph.js; `validateStructure` / `validateForNaming` in validate.js.

## Verification (last phase, I-2)

- `npm test` 0 (62 pass) · `npm run check` 0 · `npm run build` 0 ·
  `npm run e2e` 0 (3 pass).

## Open risks / deviations

- Bundler regex-literal detection is heuristic; duplicate `export *` names:
  first wins. See `docs/progress-archive/i-1.md`.

## Git state

- I-1 commit `911eae8`, pushed to origin/main.
- I-2 committed and pushed right after this checkpoint (see `git log`).
