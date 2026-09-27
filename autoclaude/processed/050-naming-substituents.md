# Phase 050 — Naming engine III: recursive preferred substituents

Spec: `docs/design.md` §1.1 (preferred prefixes, alphanumerical order),
§4.5.

## Task
- `src/naming/substituent.js`: candidate substituent chains are paths that
  **contain the attachment atom** (not necessarily an endpoint). Criteria:
  longest; most multiple bonds; most double bonds; most substituents; lowest
  free-valence locant; then multiple bonds, double bonds, prefixes, citation
  order. Recursive for nested substituents. Attachment atom and attachment
  bond order carried as data.
- Prefix styles per design §1.1 (**user decision: `isopropil` by default**):
  `prefixStyle` option `'isopropil'` (default) | `'pin'` | `'substituted'`.
  The result's `alternatives` array holds the other two styles whenever an
  isopropyl group is present, each produced by re-running prefix sorting
  and N4 under that style (never by text substitution).
- Names (pin style): `propan-2-il`, `butan-2-il`, `2-metilpropil`, `(2,2-dimetilpropil)`,
  retained `tert-butil`, `etenil`, `etinil`, `prop-2-en-1-il`,
  `prop-1-en-2-il`, `but-3-in-1-il`… Parentheses rules and bis/tris grouping.
- Alphanumerical ordering per §1.1 (complete prefix name; inner multipliers
  count; `tert-` ignored; numeric parts compared numerically).
- **Research and record** in the fixture justification column: whether an
  unbranched saturated end-attached chain is `propil` or `propan-1-il` in
  PINs (design §4.5 expects `propil`), and the `tert-butil` retention.
- Other common names (vinilo, alilo, isobutilo, sec-butilo) exposed as
  optional `commonName` metadata for explanations, never in the name.
- Extend the fixture format with the 5th `alternatives` column (§4.8) and
  test it.

## Acceptance criteria
- Fixtures pass: `4-etenilheptano` (`C=CC(CCC)CCC`), `4-etinilheptano`
  (`C#CC(CCC)CCC`), `5-(prop-2-en-1-il)nonano` (`C=CCC(CCCC)CCCC`),
  `5-isopropilnonano` (`CCCCC(C(C)C)CCCC`) with both alternatives,
  `4-isopropil-6-metilnonano` (`CCCC(C)CC(C(C)C)CCC`) whose alternatives
  number differently (§4.8), a `diisopropil` case (and its `bis(propan-2-il)`
  alternative), a `tert-butil` case, a compound prefix alphabetised under its inner
  multiplier, plus ≥ 10 more justified rows.
- Note (I-5 review): the acceptance wording `bis(propan-2-il)` above is
  superseded by `di(propan-2-il)` per IUPAC 2013 P-16.9 (propan-2-il is a
  simple prefix, parenthesised only for its locant; bis/tris are for
  substituted prefixes such as `bis(2-metilpropil)`).
- Only doubly-attached substituents still return `NOT_YET`.
