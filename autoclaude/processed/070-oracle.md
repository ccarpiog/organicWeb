# Phase 070 — OPSIN oracle and graph-invariance checks

Spec: `docs/design.md` §8 (all).

## Task
- `src/naming/lexicon.en.js` + English rendering of the same name structure.
- `scripts/oracle/`: seeded random molecule generator; pinned OPSIN CLI jar
  download (version + SHA-256 in `scripts/oracle/README.md`, jar in
  gitignored `vendor/`); dev-only fuller SMILES parser for OPSIN output;
  comparison by canonical tree key + formula; failure log with seed, SMILES,
  Spanish and English names, OPSIN version and output.
- `npm run oracle -- --count 1000 --seed 1`: prints passed / failed /
  skipped. No Java or no jar → reports skipped, exits 0, never "passed".
- Graph-invariance unit test: random molecules with shuffled atom ids and
  bond insertion order produce identical names.
- **Fix every naming bug the oracle finds**, adding each as a justified
  fixture row. If a discrepancy is a genuine disagreement about preference
  (not structure), record it in `PROGRESS.md` for the user instead.

## Acceptance criteria
- Oracle run over ≥ 1000 molecules with 0 structural mismatches (or the run
  is recorded as skipped with the reason, and the invariance tests still pass).
- `npm test` green.
