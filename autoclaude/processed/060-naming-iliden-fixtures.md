# Phase 060 — Naming engine IV: `-iliden` substituents and fixture set

Spec: `docs/design.md` §4.6, §4.8, §1.1 (metiliden/etiliden forms).

## Task
- Substituents attached by a double bond: named `-iliden`
  (`metiliden`, `etiliden`, `propan-2-iliden`… — in the default style the doubly attached
  isopropyl analogue is `isopropiliden`, with `propan-2-iliden` and
  `1-metiletiliden` as alternatives). The connecting double bond
  is excluded from P2/P3/N1/N2 counts; its parent locant counts once in
  N3/N4; the substituent counts once in P4.
- Remove every `NOT_YET` path: any valid acyclic hydrocarbon within the size
  caps is named.
- Grow `tests/fixtures/names.tsv` to **≥ 150 rows**, each with the rule it
  tests and a justification (IUPAC 2013 rule number or worked reasoning).
  Include every mandatory row of §4.8's table.

## Acceptance criteria
- `3-metilidenhexano` (`CCC(=C)CCC`), `4-etilidenheptano` (`CCCC(=CC)CCC`),
  `4-metilidenheptano` (`C=C(CCC)CCC`) pass.
- All ≥ 150 fixtures pass; a test asserts the row count and that every row
  has a non-empty justification.
- A property test over ~500 random valid molecules: `nameMolecule` never
  throws and always returns `ok: true` with a non-empty name.
