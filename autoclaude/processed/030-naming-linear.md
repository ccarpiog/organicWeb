# Phase 030 — Naming engine I: contracts, lexicon, unbranched chains

Spec: `docs/design.md` §1.1, §4.1, §4.7, §4.8 (first rows).

## Task
- Define the result contract (§4.1), the trace step shape and the
  language-neutral **name structure** (§4.7) in `src/naming/structure.js`
  with JSDoc typedefs. Later phases extend, not redesign, these.
- `src/naming/lexicon.es.js`: stems 1–30, multipliers (simple and bis/tris
  series), endings, connecting-`a` rule, `en`/`ino` rules, locant-omission
  table, group-vs-prefix forms (metilo/metil).
- `src/naming/render.js`: structure → Spanish string + coloured `parts`
  (each part carries atom/bond refs).
- `src/naming/index.js`: `nameMolecule(mol)` validates, then names
  **unbranched** molecules (alkanes, alkenes, alkynes, dienes, en-ynes,
  cumulated) including numbering rules N1 and N2 from §4.4. Branched input
  returns a temporary `NOT_YET` error (removed in 040).
- Create `tests/fixtures/names.tsv` (format of §4.8) and a test that runs
  every row whose SMILES is unbranched.

## Acceptance criteria
- Fixtures pass for: C1–C30 alkanes, `eteno`, `etino`, `propeno`, `propino`,
  `propadieno`, `but-1-eno`, `but-2-eno`, `buta-1,3-dieno`, `buta-1,2-dieno`,
  `pent-3-en-1-ino` (`C#CC=CC`), `pent-1-en-4-ino`, `hexa-1,3-dien-5-ino`
  (`C=CC=CC#C`), `hex-1-en-3,5-diino` (`C=CC#CC#C`), `hexa-1,3,5-trieno`,
  `octa-1,7-diino`.
- Trace for these contains N1/N2 steps with the compared locant lists.
- No code in `src/naming/` reads coordinates or the DOM (grep-based test).
