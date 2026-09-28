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
N/10 benzenes, one cycloalkane per ring size in the carbon range, and N/2 of
every other family:

| Generator | Family (design.md §13.4 phase) |
|---|---|
| `generateMolecules()` | acyclic hydrocarbons: alkanes, alkenes, alkynes, branched (v1) |
| `generateMonocycles()` | one ring of 3–10 C with side chains and ring/chain unsaturation (I-26) |
| `generateBenzenes()` | benzene and monosubstituted benzenes, either Kekulé drawing (I-28) |
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

Most families also mix in other groups at random (OH, C=O, halogens, ethers,
amines…), so the seniority rules and the prefix forms are exercised together.
Out-of-scope structures (stereo, charges, heterocycles, fused/bridged/spiro
rings, polysubstituted benzenes) are never generated.

## How it works

1. `generate.mjs` draws the molecules (above).
2. `run.mjs` names each one in every prefix style (`isopropil`, `pin`,
   `substituted`), plus, when there is one, its traditional name (`toluene`,
   `acetic acid`, `methyl acetate`, `aniline`, `acetamide`, `acetonitrile`,
   `benzoic acid`…), its `locants` form, its systematic benzene form
   (`benzenecarboxylic acid`) and the functional-class name of a simple amine
   (`ethylmethylamine`). The same name structures are rendered in English
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
regardless.

A round trip proves that a name denotes the right structure, not that the
parent choice, numbering or spelling are the preferred ones; the fixtures
(`tests/fixtures/names.tsv`) remain the authority for those.

`tests/unit/oracle.test.js` runs a small round trip when Java and the jar are
present (skipped otherwise); `tests/unit/invariance.test.js` checks that
renumbering atoms and shuffling bonds never changes a name.
