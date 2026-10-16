# OPSIN oracle (development only)

Cross-checks the naming engine against [OPSIN](https://github.com/dan2097/opsin)
(name → structure), as described in `docs/design.md` §8. Never bundled.

## Pinned jar

| | |
|---|---|
| Version | OPSIN 2.9.0 (CLI, jar with dependencies; runs on Java 8+) |
| URL | https://github.com/dan2097/opsin/releases/download/2.9.0/opsin-cli-2.9.0-jar-with-dependencies.jar |
| SHA-256 | `c2e29326c281f87b59a05d934d8589adac6e9d17b95b984931b3e739111b360f` |
| Location | `scripts/oracle/vendor/opsin-cli-2.9.0-jar-with-dependencies.jar` (gitignored) |

The same values are constants in `opsin.mjs`. `--download` fetches the jar
and writes it only when the checksum matches; a jar with another checksum is
refused (the run is reported as skipped).

## Usage

```sh
npm run oracle -- --download                 # once: fetch the pinned jar
npm run oracle -- --count 1000 --seed 1      # the usual run (about 10 000 molecules, see below)
npm run oracle -- --count 2000 --seed 7 --min 1 --max 20
```

Options: `--count N` (default 1000), `--seed S` (default 1), `--min`/`--max`
carbon count (default 4–14), `--jar path`, `--java path`, `--log path`.

The first output line lists how many molecules of each family were drawn;
the last one is `passed: … failed: … skipped: … adapter failures: …`.

- Without Java or the jar every molecule is **skipped** (never passed) and
  the exit status is 0.
- Exit status 1 on any naming or adapter failure, 2 on bad arguments.
  Failures are written to `scripts/oracle/logs/failures-seed-S.log`
  (gitignored) with the seed, SMILES, Spanish and English names, the OPSIN
  version, OPSIN's output and its diagnostics.

## Generated families

`generate.mjs` draws distinct (by canonical key) random molecules from the
seed (mulberry32), within the naming size caps, and keeps only those the
engine can name. With `--count N`, `run.mjs` draws N acyclic hydrocarbons,
one cycloalkane per ring size in the carbon range, N/4 phenols and
benzenamines, N/4 substituted benzoic acids, benzaldehydes, benzonitriles
and benzamides, N/4 benzenes with several identical principal groups, N/4
molecules with a substituted phenyl prefix, N/8 with a substituted benzoyl
prefix, N/8 esters with a substituted benzene ring, and N/2 of every other
family:

| Generator | Family (design.md §13.4 / §14.6 phase) |
|---|---|
| `generateMolecules()` | acyclic hydrocarbons: alkanes, alkenes, alkynes, branched (v1) |
| `generateMonocycles()` | one ring of 3–10 C with side chains and ring/chain unsaturation (I-26) |
| `generateBenzenes()` | benzene and benzenes with 1–6 groups at random ring positions — hydrocarbon branches (unsaturated and branched ones too: `etenil`, `isopropil`…), halogens and alkoxy groups —, either Kekulé drawing (I-28, I-42); never filtered by a refusal, so a refused one counts as a naming failure |
| `generateRingPrincipalBenzenes()` | one OH or one amine (–NH₂, –NHR, –NRR′) on a benzene with 1–5 other groups, sometimes an OH plus an `amino-` prefix: `4-metilfenol`, `2-clorobencen-1-amina`, `4-aminofenol` (I-43a); never filtered by a refusal |
| `generateRingOutsideBenzenes()` | one –COOH, –CHO, –C≡N or amide (–CONH₂, –CONHR, –CONRR′) on a benzene with other groups, half of them with one or two junior groups on the ring as prefixes (`hidroxi`, `amino`, `formil`, `ciano`, `carbamoil`): `ácido 4-metilbenzoico`, `N-etil-4-metilbenzamida`, `ácido 4-formilbenzoico`, `3-cianobenzamida` (I-43b); never filtered by a refusal |
| `generateRingPolysuffixBenzenes()` | two to six identical OH, –NH₂, –COOH, –CHO, –C≡N or –CONH₂ groups on a benzene (no groups on the N), with random branch, halogen or alkoxy prefixes and sometimes one junior group: `3-etilbenceno-1,2-diol`, `benceno-1,4-diamina`, `ácido 5-metilbenceno-1,3-dicarboxílico`, `benceno-1,3,5-tricarbonitrilo`, `bencenohexol` (I-44); never filtered by a refusal |
| `generateCycloalkanes()` | one cycloalkane per ring size, `cyclopropane` … `cyclotriacontane` |
| `generateHalogenated()` | F, Cl, Br, I in place of random hydrogens, halomethanes included (I-30) |
| `generateAlcohols()` | OH groups on chains or ring carbons, phenol (I-31) |
| `generateCarbonyls()` | aldehydes and ketones (I-32) |
| `generateAcids()` | one or two –COOH at chain ends (I-33) |
| `generateEthers()` | an O put into one or two C–C bonds (I-34) |
| `generateEsters()` | one –COO– between two acyclic pieces (I-35) |
| `generateAmines()` | primary, secondary and tertiary amines, anilines, `amino-` prefixes (I-36) |
| `generateAmides()` | one or two –CONH₂, N-substituted (I-37) |
| `generateNitriles()` | one or two –C≡N at chain ends (I-38) |
| `generateCyano()` | a nitrile cited as `ciano-` (I-39a) |
| `generateAcyl()` | acyl prefixes: `formil`, `acetil`, `propanoil`… (I-39b) |
| `generateEsterPrefixes()` | `alcoxicarbonil`, `…-oxi…-oxo`, `aciloxi`, diesters (I-39c) |
| `generateAmidePrefixes()` | `carbamoil`, `…-amino…-oxo`, `acilamino` (I-39d) |
| `generateRingSubstituents()` | a ring as a prefix of a chain carrying the principal group: `ciclohexil`, `fenil`, `fenoxi` (I-40a) |
| `generateRingAcids()` | `-carboxílico`, `-carbaldehído`, `ácido benzoico`, `carboxi-`, `benzoil` (I-40b) |
| `generateRingNitrilesAmides()` | `-carbonitrilo`, `-carboxamida`, `benzonitrilo`, `benzamida`, `N-feniletanamida` (I-40c) |
| `generateRingEsters()` | `-carboxilato`, `benzoato`, `etanoato de fenilo`, `benzoato de fenilo` (I-40d) |
| `generateSubstitutedPhenyls()` | a benzene with 1–4 branch, halogen or alkoxy prefixes as a substituted `fenil` / `fenoxi` prefix of a chain carrying the principal group (bonded through a carbon, an ether O or an amine N, or an N-aryl amide), either Kekulé drawing: `1-(4-metilfenil)etan-1-ona`, `2-(4-metilfenoxi)etan-1-ol`, `N-(4-metilfenil)etanamida`, with the acetic forms (`2-(3-methylphenyl)acetic acid`) checked too (I-45a); keeps only molecules named with such a prefix in every style |
| `generateSubstitutedBenzoyls()` | a benzene with 1–4 branch, halogen or alkoxy prefixes as the ring of a substituted `benzoil` prefix: a C=O carbon off the parent chain, on a carbon carrying a –COOH, –CHO, amide, –C≡N or acetyl group, or on the N of an `acilamino` prefix of an acid, either Kekulé drawing: `ácido 2-(4-metilbenzoil)butanoico`, `3-(4-metilbenzoil)pentano-2,4-diona`, `ácido 2-[(4-clorobenzoil)amino]etanoico` (I-45b, N/8 molecules); keeps only molecules named with such a prefix in every style |
| `generateSubstitutedEsters()` | esters with a benzene carrying 1–4 branch, halogen or alkoxy prefixes, either Kekulé drawing: the –COO– carbon on the ring (`4-metilbenzoato de etilo`, `4-clorobenzoato de ciclohexilo`), the benzene as the O-bound group bonded through one of its carbons (`etanoato de 4-metilfenilo`, `etanoato de 2-(4-metilfenil)etilo`, with the `acetato` forms checked too), both at once — two rings split by the ester (`4-metilbenzoato de 4-clorofenilo`) — or the –COO– at the end of a side chain (`2-(4-metilfenil)etanoato de etilo`), sometimes halogenated (I-45c, N/8 molecules); keeps only valid molecules with one ester and a benzene with two or more groups, named in every style |

Most families also mix in other groups at random (OH, C=O, halogens, ethers,
amines…), so the seniority rules and the prefix forms are exercised together.
Out-of-scope structures (stereo, charges, heterocycles, fused/bridged/spiro
rings) are never generated. `randomBenzene()` with its defaults (one group)
keeps its original draws; the other families that start from it may still
add groups that make a benzene the engine refuses (an ester beside
another functional group of the ring, groups on the ring and on a side chain at
once, groups on two side chains, design.md §14), and those
families drop every refused molecule; since I-45a a substituted phenyl on a
functional chain is named, so `generateRingSubstituents()` keeps such
molecules when a halogen lands on its benzene, and since I-45c
`generateRingEsters()` keeps a halogenated benzene ester.

The seven v3 generators (design.md §14, all phases done) are
`generateBenzenes()` (I-42), `generateRingPrincipalBenzenes()` (I-43a),
`generateRingOutsideBenzenes()` (I-43b), `generateRingPolysuffixBenzenes()`
(I-44), `generateSubstitutedPhenyls()` (I-45a),
`generateSubstitutedBenzoyls()` (I-45b) and `generateSubstitutedEsters()`
(I-45c).

## How it works

1. `generate.mjs` draws the molecules (above).
2. `run.mjs` names each one in every prefix style (`isopropil`, `pin`,
   `substituted`), plus, when there is one, its traditional name (`toluene`,
   `acetic acid`, `methyl acetate`, `aniline`, `acetamide`, `acetonitrile`,
   `benzoic acid`…), its `locants` form, its systematic benzene form
   (`benzenecarboxylic acid`), the functional-class name of a simple amine
   (`ethylmethylamine`) and, for a polysubstituted benzene, its retained
   `xylene` / `mesitylene` / `cresol` name, the names of two identical
   principal groups (`hydroquinone`, `4-methylphthalic acid`, I-44) and its
   old orto/meta/para form (`o-dichlorobenzene`, `p-methylphenol`, `o-chloroaniline`;
   for two different prefixes on plain benzene, I-54a, every form listed, one
   per prefix style, each built on its style's naming: `m-chloroethylbenzene`,
   `p-isopropylmethylbenzene`, `p-methyl(propan-2-yl)benzene`;
   `polyBenzeneNames()` in `run.mjs`). The same name structures are rendered in English
   with `src/naming/lexicon.en.js` (`englishName()` in `compare.mjs`) — never
   a translation of the Spanish string.
3. `opsin.mjs` sends all English names to OPSIN in one batch (`-osmi`).
4. `smiles-full.mjs` (a fuller SMILES parser: bracket atoms, explicit H,
   rings, aromatic atoms — kekulized by `kekulize()` —, charges) turns
   OPSIN's SMILES into a hydrogen-suppressed model molecule that keeps every
   heavy atom with its element (`heavyAtomTree()`), plus a Hill formula
   counted from the SMILES. Structures the model cannot hold (unsupported
   elements, charged atoms, several fragments, radicals) are naming failures.
5. A molecule passes when, for every name, the number of rings, the
   canonical key (`canonicalKey()` in `src/model/graph.js`: the tree key, the
   monocycle key for one ring, or the key of two separate rings for a ring
   ester with a ring on each side; elements, bond orders and ring closures,
   so ethanol and dimethyl ether, or cyclohexane and hex-1-ene, differ; a
   benzene ring matches in either Kekulé drawing, `kekuleKeys()`) and the
   formula match the original — never the formula alone. OPSIN SMILES that
   the parser cannot read is an **adapter failure**, counted apart from
   naming failures.

The English names keep the Spanish citation order of the prefixes
(`2-methyl-4-iodopentane` for `2-metil-4-yodopentano`); OPSIN reads them
regardless. So does the orto/meta/para form of two different prefixes
(`p-methyl(methoxy)benzene` for `p-metil(metoxi)benceno`, where English
order would give `p-methoxymethylbenzene`).

## Known disagreements

One class of names fails on purpose, and stays a failure (the check is not
loosened: the run exits 1, the molecule counts as failed):

- **orto/meta/para form, a halogen or an alkoxy prefix before an unenclosed
  chain prefix (I-54a).** The user chose the old letter form for two
  different prefixes on plain benzene written as the engine writes
  prefixes without locants (`p-clorometilbenceno`, `m-cloroetilbenceno`,
  `p-(etoxi)metilbenceno`; design.md §14.4). OPSIN 2.9.0 reads the halogen
  or the enclosed alkoxy prefix as a substituent of the chain prefix after
  it, and the letter as nothing: `p-chloromethylbenzene` →
  `(chloromethyl)benzene`, `o-chloroethylbenzene` →
  `(2-chloroethyl)benzene`, `p-(ethoxy)methylbenzene` →
  `(ethoxymethyl)benzene`, `m-(butan-2-yloxy)ethynylbenzene` → a
  `(butan-2-yloxy)ethynyl` group. This is the ambiguity the app's
  explanation names (`m-cloroetilbenceno` can be read as
  `(cloroetil)benceno`). OPSIN reads the other letter forms as two ring
  prefixes: a hydrocarbon prefix first (`p-isopropylmethylbenzene`,
  `m-ethylmethylbenzene`), an enclosed or retained second prefix
  (`p-methyl(methoxy)benzene`, `p-chloro(chloromethyl)benzene`,
  `m-chloroisopropylbenzene`) or a halogen second (`o-methyliodobenzene`,
  `m-bromochlorobenzene`).

`run.mjs` tells these apart (`isKnownDisagreement()`) by the name and by
the outcome, never by the name alone. A failing name is known only when
all of these hold: it is an orto/meta/para form (style `positional`)
matching `KNOWN_POSITIONAL_DISAGREEMENT` (a halogen or an enclosed alkoxy
prefix, then an unenclosed chain prefix); the failure is an isomer —
OPSIN's SMILES was read and has the original's formula and ring count but
another canonical key (`compare.mjs` `DIFFERENT_STRUCTURE_REASON`); and
OPSIN's structure is the substituted-chain reading
(`isSubstitutedChainReading()`): one all-carbon benzene ring with a single
substituted ring carbon, bonded to a carbon of a side chain that carries
the halogen or the ether O. The same name with no OPSIN output, an adapter
failure, a formula or ring-count mismatch, or any other isomer (two
substituted ring carbons, no benzene ring, a side chain bonded through its
O) is an ordinary failure. After the summary `run.mjs` prints
`known disagreements (scripts/oracle/README.md): K of F failed molecules`,
and labels each such name `(known)` in the listing and `(known
disagreement, README.md)` in the log. A failure not so labelled is new.
Measured in I-54a: `--count 1000 --seed 1` 16 of 16 failed molecules,
`--count 1000 --seed 7` 13 of 13, `--count 200 --seed 42` 5 of 5 (the
round trip of `tests/unit/oracle.test.js` pins these five one by one —
molecule, names, OPSIN's SMILES and the `(known)` label — and a unit test
without Java checks that the same names with an empty, methane or
unreadable OPSIN output are not known), out of about
11 760 molecules per 1000-run; `generateBenzenes()` alone, 2000 molecules,
seed 1: 39 failed, all of this class, among 453 orto/meta/para forms.

A round trip proves that a name denotes the right structure, not that the
parent choice, numbering or spelling are the preferred ones; the fixtures
(`tests/fixtures/names.tsv`) remain the authority for those.

`tests/unit/oracle.test.js` runs a small round trip when Java and the jar are
present (skipped otherwise); `tests/unit/invariance.test.js` checks that
renumbering atoms and shuffling bonds never changes a name.
