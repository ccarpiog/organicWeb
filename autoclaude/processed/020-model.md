# Phase 020 — Molecule model, validation, SMILES subset

Spec: `docs/design.md` §3 (all), §4.2 note on trees, §8 (canonical tree key).

## Task
- `src/model/molecule.js`: atoms/bonds maps, stable integer ids, add/remove
  atom and bond, set bond order, implicit H, formula (Hill order, Unicode
  subscripts helper for display), neighbours, JSON round-trip.
- `src/model/validate.js`: every check of §3.2, returning `{code, message}`
  with the Spanish messages from the table. Split into structural checks
  (always) and naming checks (non-empty, connected, acyclic, size caps).
- `src/model/graph.js`: connected components, cycle detection, path between
  two atoms in a tree, leaves, and an **unrooted canonical tree key** (atoms +
  bond orders; AHU-style centre-rooted encoding) used by tests and the oracle.
- `src/model/smiles.js`: parser for `C`, `=`, `#`, parentheses; explicit
  errors for ring digits, other elements, aromatics, brackets, dangling bonds.
  Writer for debugging.

## Acceptance criteria
- Unit tests cover every validation code, JSON round-trip (including corrupt
  input → error, not crash), SMILES parse errors, and canonical key equality
  for the same tree written as different SMILES (`CC(C)CC` vs `CCC(C)C`) and
  inequality when a bond order differs.
- `npm test` and `npm run check` exit 0.
