# Polysubstituted benzenes (user-confirmed scope, 2026-10-13)

User request (2026-10-13): name benzenes with **more than one substituent**.
The user's screenshot shows an ethyl and two OH groups on adjacent carbons
(`CCC1=C(O)C(O)=CC=C1`). Today the app refuses it with "Este benceno tiene 3
sustituyentes…"; the expected name is `3-etilbenceno-1,2-diol`.

This item lifts the §13.1 decision "Benzene: monosubstituted derivatives only;
no orto/meta/para" and the matching CLAUDE.md scope line. The user's
decisions below are **final**; record them in design.md (new §14, plus a
pointer from §13.1):

- **All polysubstituted benzenes** (2–6 occupied positions) within the
  existing v2 families.
- **Name policy unchanged.** The current per-parent policy extends as is:
  - `metilbenceno` first, `tolueno` under Otras formas.
  - `fenol` first.
  - `bencenamina` first, `anilina` under Otras formas.
  - `ácido benzoico` / `benzaldehído` / `benzonitrilo` / `benzamida` first,
    with the systematic `benceno…` form under Otras formas.
  - Do not change any existing output.
- **orto/meta/para only under "Otras formas válidas"**, never first. When it
  appears, it gets its own label, e.g. "forma antigua con orto/meta/para;
  hoy se recomienda el número (1,2 / 1,3 / 1,4)". Do not say "desde 2013".
- **Traditional disubstituted names under "Otras formas válidas"**, only
  where IUPAC 2013 admits them (table below).
- Still out of scope:
  - stereo, charges, salts, heterocycles;
  - polycycles (naphthalene, biphenyl);
  - more than two separate rings;
  - nitro and sulfur groups.

## Normative basis (IUPAC 2013 Blue Book, iupac.qmul.ac.uk, checked)

Reviewed by Codex; corrections are already merged into this text.

**Numbering (P-14.4)**, criteria in this order:

- **(c)** principal characteristic groups (suffixes) and free valences.
- **(e)** hydro/ene/yne. **Never for benzene**: its Kekulé double bonds are
  not cited and must not steer numbering.
- **(f)** all detachable prefixes together, lowest set at the first point
  of difference.
- **(g)** lowest available locant (after the earlier ties) to the prefix
  cited first in the name. Use Spanish alphabetical order: `yodo` sorts
  under y, so `1-metil-2-yodobenceno`. English rendering only translates the
  Spanish-numbered structure.

**Locant omission (P-14.3.4).**

- A single substituent on benzene takes no locant (as today).
- With two or more substituents every prefix locant is cited.
- Complete substitution by one identical prefix also omits locants:
  `hexaclorobenceno` and `hexametilbenceno` (not halogen-only).
  `ringOmitsLocants` (lexicon.es.js ~355) currently returns early for
  benzene, before that check.
- Retained parents with a built-in group keep that group at an implicit 1
  and cite only the prefixes: `4-metilfenol`, `2-cloroanilina`,
  `ácido 4-metilbenzoico`, `4-clorobenzaldehído`, `3-metilbenzonitrilo`,
  `4-metilbenzamida`.
- Systematic suffix forms do cite the 1: `4-metilbencen-1-amina`,
  `ácido 4-metilbenceno-1-carboxílico`. A bare monosubstituted
  `bencenamina` omits it, as today.

**orto/meta/para (P-14.3.1).** "No longer recommended"; numeric locants
must be used in substitutive names. Exceptions in general nomenclature only:
o/m/p-xileno, o/m/p-cresol (and o/m/p-tolil).

**Italic locants (P-14.3.5).** Italic letter locants are lower than
numerals and cited first: `N,4-dimetilanilina` (italic *N*).

**Spanish elision** (as for cycloalkanes): `benceno-1,2-diol`,
`benceno-1,4-diamina`, `bencen-1-amina`,
`ácido benceno-1,3-dicarboxílico`.

**Identical principal groups.** Two or more identical principal groups on
the ring always get the systematic name: `benceno-1,2-diol` (never
"2-hidroxifenol"). Junior groups become prefixes:

- `ácido 4-hidroxibenzoico`
- `4-aminofenol`
- `ácido 4-formilbenzoico`
- `3-cianobenzamida`

### Retained names (status → app behaviour)

| Name | 2013 status | App |
|---|---|---|
| fenol (P-63.1.1.1) | PIN, substitutable | parent when exactly one OH: `4-metilfenol` |
| anilina (P-62.2.1.1.1) | PIN, ring and N substitutable | one amine group directly on the ring (N-substituted still counts): `4-metilbencen-1-amina` first, `4-metilanilina` in Otras formas; `N,4-dimetil…` |
| ácido benzoico, benzaldehído, benzonitrilo, benzamida (P-65.1.1.1, P-66.6.1.2.1, P-66.5.1.2.1, P-66.1.1.1.2.1) | PIN, substitutable | parent with one such group; systematic `…benceno-1-carboxílico` etc. in Otras formas |
| tolueno; 1,2-/1,3-/1,4-xileno (P-22.1.3) | PIN, not freely substitutable | keep systematic first (`1,2-dimetilbenceno`); Otras formas: `1,2-xileno`, `o-xileno`; never a substituted tolueno/xileno |
| mesitileno (P-22.1.3) | general only, no substitution | Otras formas of `1,3,5-trimetilbenceno` |
| o/m/p-cresol; pirocatecol (catecol), resorcinol, hidroquinona (P-63.1.1.2) | general only, unsubstituted only | Otras formas of `2/3/4-metilfenol` and `benceno-1,2/1,3/1,4-diol` |
| ácido ftálico/isoftálico/tereftálico (P-65.1.1.2.1); ftal-/isoftal-/tereftalaldehído (P-66.6.2.2); ftalonitrilo (P-66.5.1.2.2); ftalamida (P-66.1.1.1.2.3) | general only, substitution allowed | Otras formas of `benceno-1,x-di…` (also `ácido 4-metilftálico`) |
| anisol (P-63.2.3) | PIN, no substitution | substituted: `1-metoxi-4-metilbenceno`, no anisol alias |
| estireno, acetofenona, alcohol bencílico, bencilamina, ácido fenilacético… | | never offered when the phenyl carries extra substituents (`principal.js carbonylTraditionalId` `phenylOnly` checks only `retained`) |

### o/m/p alias rule

The alias applies only when exactly two ring positions are occupied. Count
a retained parent's defining group as one of them; do not count
N-substitution.

- **Generated:** two identical prefixes (`o-diclorobenceno`) and retained
  parent + one prefix (`p-metilfenol`, `ácido p-metilbenzoico`,
  `o-cloroanilina`).
- **Not generated for two different prefixes on plain benzene.**
  `m-cloroetilbenceno` reads like a substituted ethyl. Instead, the
  numbering explanation says "cloro y etil están en posición meta (1,3)".
- **Kept separate from IUPAC-admitted retained names** (`p-cresol`,
  `p-xileno`): those keep the normal traditional label, while the
  positional alias gets the "forma antigua" label.
- **Never generated** with three or more occupied positions.

## Code traps (codebase survey + Codex, 2026-10-13)

1. **Kekulé-dependent numbering.** Codex reproduced this: the two drawings
   of o-xylene gave `1,6-` vs `1,2-dimetilbenceno`.
   - `numbering.js runNumberingCascade()` runs N1/N2 (multiple/double-bond
     locants) before N3.
   - `rings.js numberRing()` (~112) and `substituent.js ringSubstituent()`
     (~1092) both feed real bond orders.
   - Fix: for benzene (parent or phenyl), skip N1/N2 or feed neutral orders.
     Keep the real orders in the structure for highlighting.
   - Every phase must check invariance under the Kekulé swap and under
     atom-id scrambling.
2. **`nameBenzeneWithStyle` (aromatic.js) discards the numbering trace and
   throws for more than one substituent.** Keep the trace so the
   explanation can show the numbering.
3. **`render.js renderRingParent` benzene branch.**
   - It uses only the first suffix site: two OH give "fenol", two COOH give
     "ácido benzoico".
   - It never writes suffix locants or multipliers.
   - Retained `fenil`/`benzoil`/`fenilo`/`fenoxi` drop the phenyl's own
     prefixes.
   - `needsEnclosure`/`isCompoundPrefix` return false for retained groups.
   - `phenylSubstituent` always has `prefixes: []`.
4. **Retained-name helpers.**
   - `aromatic.js traditionalNameId()` returns `aniline` for any amine
     suffix, diamines included.
   - `index.js benzeneSystematicAlternative()` needs duplicate suppression
     when the main name is already systematic (polysuffix names).
5. **Explanation (`explain/explain.js`).**
   - `benzeneStep` always says "con un solo sustituyente no hace falta
     numerar".
   - The benzene pipeline has no `ringNumberingStep` or `orderStep`.
   - `ringNumberingChoice` and `ringOmissionNote` talk about ring double
     bonds, which they must not do for benzene.
   - `groupStep`, `amineGroupStep`, `assembleStep` and the legends assume a
     single group and no numbers.
   - `ui/results.js` shows canvas locants once a `ringNumbering` step
     exists.
6. **Refusals (`model/validate.js ringError()`).**
   - `CYCLE` / `polysubstitutedBenzene` also guards substituted phenyl on
     chains, in ester splits and in benzoyl.
   - Lift it per phase. Whatever a phase does not cover stays refused with
     an updated, accurate message, never a wrong name.
   - Keep or explicitly extend `substitutedPolyamine`,
     `substitutedPolyamide`, `mixedDiester` and `symmetricRing`.
7. **Oracle.** `scripts/oracle/generate.mjs randomBenzene` grows exactly one
   side chain, and several generators use the refusal as a filter. OPSIN
   checks structure only, never Spanish spelling or name preference.

## Phases (one session each; split further if needed)

Every phase:

- keeps all existing outputs, snapshots and e2e green;
- adds fixture rows in `tests/fixtures/names.tsv` with a justification that
  cites the rule;
- tests both Kekulé drawings and scrambled ids;
- asserts which alternatives are present **and absent**;
- adds explanation snapshots;
- runs e2e on the dev server and on `file://`;
- extends the oracle where it applies;
- updates the scope and refusal docs, plus the Ayuda out-of-scope line, as
  it goes.

### I-42 — Benzene parent with prefixes only

**Covers:** hydrocarbon, halogen and alkoxy prefixes on a benzene parent.
Expected names:

- `1,2-dimetilbenceno` (`1,2-xileno`, `o-xileno`)
- `1-bromo-3-clorobenceno`
- `4-etil-1,2-dimetilbenceno`
- `1,3,5-trimetilbenceno` (mesitileno)
- `hexaclorobenceno`, `hexametilbenceno`
- `1-metoxi-4-metilbenceno`
- `1-metil-2-yodobenceno`
- `1,4-dietenilbenceno`
- isopropyl prefix styles

**Also:**

- Kekulé-neutral numbering (trap 1).
- A benzene numbering step in the explanation: lowest locant set, then
  alphabetical order, with no mention of double bonds. Canvas locants
  appear.
- o/m/p aliases per the rule above.
- Check that Ordenar dibujo works; the 90° view still falls back.
- Oracle `randomBenzene` places 1–6 groups.

### I-43a — One OH or amine group on the ring, plus prefixes

`4-metilfenol` (`p-cresol`, `p-metilfenol`), `2-cloroanilina` forms,
`N,4-dimetilbencen-1-amina` / `N,4-dimetilanilina`, `4-aminofenol`.

### I-43b — One outside-carbon suffix on the ring, plus prefixes

`ácido 4-metilbenzoico`, `4-clorobenzaldehído`, `3-metilbenzonitrilo`,
`4-metilbenzamida`, `N-etil-4-metilbenzamida`, `ácido 4-hidroxibenzoico`,
`ácido 4-formilbenzoico`, `3-cianobenzamida`. The systematic forms with the
locant 1 go under Otras formas.

### I-44 — Several identical principal groups on the ring

`3-etilbenceno-1,2-diol` (the user's example), `benceno-1,4-diamina`,
`ácido benceno-1,3-dicarboxílico`, `benceno-1,4-dicarbaldehído`,
`benceno-1,3,5-tricarbonitrilo`, `benceno-1,4-dicarboxamida`.

- Reuse the I-43 renderer, with multipliers and locants.
- Plural explanations.
- catecol/resorcinol/hidroquinona only when unsubstituted; the ftálico
  family also when substituted.
- Fix `traditionalNameId` for diamines.

### I-45a — Substituted phenyl and phenoxy as a substituent

`1-(4-metilfenil)etan-1-ona` (no `acetofenona`),
`2-(4-clorofenil)etan-1-ol`, `ácido 2-(3-metilfenil)acético` (check the
current `fenilacético` handling), `2-(4-metilfenoxi)etan-1-ol`,
`N-(4-metilfenil)acetamida`.

- Phenyl numbering starts at the attachment atom (1), Kekulé-neutral.
- Enclosure in parentheses.
- `phenylOnly` guard.
- `bis(4-clorofenil)` needs two rings, so it stays refused.

### I-45b — Substituted benzoyl

`(4-metilbenzoil)` prefixes wherever `benzoil` is named today.

### I-45c — Esters with substituted rings

`4-metilbenzoato de etilo`, `acetato de 4-metilfenilo`,
`benzoato de 4-clorofenilo`, including the split-ring (two-ring) case.

### I-46 — Wrap-up

- Ayuda: lift "dos o más sustituyentes (orto, meta, para)" and add a short
  o/m/p note.
- Examples group «Bencenos con varios sustituyentes».
- README, CLAUDE.md scope line, design.md cleanup, oracle README.
- New wording is still pending teacher review.

## Fixtures to include (beyond the names above)

| SMILES | Expected |
|---|---|
| `CC1=C(C)C(C)=C(C)C(C)=C1C` | hexametilbenceno |
| `CCC1=CC(C)=C(C)C=C1` | 4-etil-1,2-dimetilbenceno |
| `CCC1=C(O)C(O)=CC=C1` | 3-etilbenceno-1,2-diol |
| `CNC1=CC=C(C)C=C1` | N,4-dimetilbencen-1-amina (alt. N,4-dimetilanilina) |
| `NC1=CC=C(N)C=C1` | benceno-1,4-diamina |
| `O=C(O)C1=CC(C(=O)O)=CC=C1` | ácido benceno-1,3-dicarboxílico (alt. ácido isoftálico) |
| `O=C(O)C1=CC=C(C=O)C=C1` | ácido 4-formilbenzoico |
| `N#CC1=CC(C#N)=CC(C#N)=C1` | benceno-1,3,5-tricarbonitrilo |
| `CC(=O)C1=CC=C(C)C=C1` | 1-(4-metilfenil)etan-1-ona |
| `OCCOC1=CC=C(C)C=C1` | 2-(4-metilfenoxi)etan-1-ol |
| `ClC1=CC=CC=C1Br` | 1-bromo-2-clorobenceno |
| `CC1=CC=CC=C1I` | 1-metil-2-yodobenceno |
