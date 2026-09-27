# PROGRESS — organicWeb

Live checkpoint for the autoclaude loop. Plan: `PLAN.md` → phases are the
inbox items `autoclaude/inbox/010-*.md` … `120-*.md`, executed in filename
order, each queued as an `I-n` phase when triaged. Spec: `docs/design.md`.

## Phases

| id | title | spec | status | risk / worker | review |
|---|---|---|---|---|---|
| I-1 | Project scaffold | `autoclaude/processed/010-scaffold.md` | queued | — | — |
| I-2 | Molecule model, validation, SMILES subset | `autoclaude/processed/020-model.md` | queued | — | — |
| I-3 | Naming engine I: contracts, lexicon, unbranched chains | `autoclaude/processed/030-naming-linear.md` | queued | — | — |

Remaining plan items (040–120) are still in `autoclaude/inbox/` and will be
queued as `I-4` … `I-12` at later phase boundaries.

## Inbox

- 2026-09-27 pickup 1: `010-scaffold.md`, `020-model.md`,
  `030-naming-linear.md` → queued as I-1, I-2, I-3 (in plan order).

## Next action

Execute I-1 (project scaffold) per `autoclaude/processed/010-scaffold.md`.

## Open risks / deviations

- None yet.

## Git state

- Base: `97b4953` (design plan, rules, inbox).
