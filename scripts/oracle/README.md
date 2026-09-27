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
npm run oracle -- --count 1000 --seed 1      # 1000 random molecules + 500 monocycles + 100 benzenes + 500 halogen derivatives + 11 cycloalkanes, 4–14 C
npm run oracle -- --count 3000 --seed 6 --min 10 --max 30
```

Options: `--count N` (default 1000), `--seed S` (default 1), `--min`/`--max`
carbon count (default 4–14), `--jar path`, `--java path`, `--log path`.

Output: `passed: … failed: … skipped: … adapter failures: …`.

- Without Java or the jar every molecule is **skipped** (never passed) and
  the exit status is 0.
- Exit status 1 on any failure; failures are written to
  `scripts/oracle/logs/failures-seed-S.log` (gitignored) with the seed,
  SMILES, Spanish and English names, the OPSIN version, OPSIN's output and
  its diagnostics.

## How it works

1. `generate.mjs` draws distinct (by canonical tree key) random acyclic
   hydrocarbons from a seed (mulberry32), within the naming size caps;
   `generateMonocycles()` draws half as many distinct (by canonical key)
   random monocycles — a ring of 3–10 carbons with random side chains and
   random double/triple bonds in the ring and the chains (benzene rings
   drawn by chance are named too); `generateBenzenes()` draws a tenth as
   many benzene derivatives — benzene, then a Kekulé hexagon in either
   drawing with one random side chain; `generateHalogenated()` draws half as
   many halogen derivatives — a random acyclic hydrocarbon (from 1 C, so
   halomethanes and haloethanes too), monocycle or benzene whose hydrogens are
   replaced at random by F, Cl, Br or I (`halogenate()`), kept when valid for
   naming; and `generateCycloalkanes()` adds one
   cycloalkane per ring size in the carbon range (3–30 at most):
   `cyclopropane` … `cyclotriacontane`.
2. Each molecule is named in every prefix style (`isopropil`, `pin`,
   `substituted`), plus its traditional name when it has one (`toluene`,
   `styrene`); the same name structures are rendered in English with
   `src/naming/lexicon.en.js` (`compare.mjs`).
3. `opsin.mjs` sends all English names to OPSIN in one batch (`-osmi`).
4. `smiles-full.mjs` (a fuller SMILES parser: bracket atoms, explicit H,
   rings, aromatic atoms — kekulized by `kekulize()` —, charges) turns OPSIN's SMILES into a
   hydrogen-suppressed model molecule that keeps every heavy atom with its
   element (`heavyAtomTree()`), plus a Hill formula counted from the SMILES.
   Rings are kept. Structures the model cannot hold (unsupported elements,
   charged atoms, several fragments, radicals) are naming failures.
5. A molecule passes when, for every style, the number of rings, the
   canonical key (`canonicalKey()` in `src/model/graph.js`: the tree key, or
   the monocycle key for one ring; elements, bond orders and ring closures,
   so ethanol and dimethyl ether, or cyclohexane and hex-1-ene, differ; a
   benzene ring matches in either Kekulé drawing, `kekuleKeys()`) and
   the formula match the original — never the formula alone; polycycles
   fail until they have a key. OPSIN SMILES that the parser cannot read is an
   **adapter failure**, counted apart from naming failures.

Besides hydrocarbons, the generator draws halogen derivatives (named since
I-30); oxygen and nitrogen compounds are not generated because the engine
does not name them yet, although the comparison already handles them. Only
single carbocycles are generated (polycycles are not named). The English
names keep the Spanish citation order of the prefixes (`2-methyl-4-iodopentane`
for `2-metil-4-yodopentano`); OPSIN reads them regardless.

A round trip proves that a name denotes the right structure, not that the
parent choice, numbering or spelling are the preferred ones; the fixtures
(`tests/fixtures/names.tsv`) remain the authority for those.

`tests/unit/oracle.test.js` runs a 200-molecule round trip when Java and the
jar are present (skipped otherwise); `tests/unit/invariance.test.js` checks
that renumbering atoms and shuffling bonds never changes a name.
