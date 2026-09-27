# Phase 040 — Naming engine II: parent selection and numbering

Spec: `docs/design.md` §4.2, §4.3, §4.4, §4.8.

## Task
- `src/naming/parent.js`: leaf-to-leaf candidate enumeration, P1–P4 with
  trace steps (candidates before, compared values, survivors). Assert that no
  triple bond leaves the longest parent.
- `src/naming/numbering.js`: `(chain, direction)` candidates, N1–N4 with
  term-by-term numeric locant-list comparison (repeated locants kept, never
  sums), then the presentation tie-break (smallest atom-id tuple, not an
  IUPAC rule; trace note "las dos opciones dan el mismo nombre").
- Support **simple saturated unbranched substituents attached by a single
  bond at their end** (`metil`, `etil`, `propil`, `butil`…), grouping with
  di/tri, alphanumerical ordering ignoring multipliers. Everything else
  (branched/unsaturated/doubly attached substituents) returns `NOT_YET`.
- Comparisons use structured keys; never compare assembled strings.

## Acceptance criteria
- Fixtures pass (add rows with justification): `2-metilpropano`,
  `2,2-dimetilpropano`, `3-etilpentano`, `3-etil-2-metilpentano`
  (`CCC(C(C)C)CC`, more substituents wins), `3-etil-4-metilhexano`
  (`CCC(CC)C(C)CC`, N4), `3-etil-2-metilhexano`,
  `4-etil-2,2-dimetilhexano`, `2-metilprop-1-eno`, `2-metilbuta-1,3-dieno`,
  plus ≥ 10 more branched alkanes/alkenes/alkynes covering P2, P3, P4, N1–N4.
- Unit tests for the locant-list comparator (including repeated locants and
  lists of different content with equal sums).
