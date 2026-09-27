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
npm run oracle -- --count 1000 --seed 1      # 1000 molecules, 4–14 C
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
   hydrocarbons from a seed (mulberry32), within the naming size caps.
2. Each molecule is named in every prefix style (`isopropil`, `pin`,
   `substituted`); the same name structures are rendered in English with
   `src/naming/lexicon.en.js` (`compare.mjs`).
3. `opsin.mjs` sends all English names to OPSIN in one batch (`-osmi`).
4. `smiles-full.mjs` (a fuller SMILES parser: bracket atoms, explicit H,
   rings, aromatic atoms, charges) reduces OPSIN's SMILES to a
   hydrogen-suppressed carbon tree plus a formula counted from the SMILES.
5. A molecule passes when, for every style, the canonical tree key and the
   formula match the original. OPSIN SMILES that the parser cannot read is an
   **adapter failure**, not a naming failure.

A round trip proves that a name denotes the right structure, not that the
parent choice, numbering or spelling are the preferred ones; the fixtures
(`tests/fixtures/names.tsv`) remain the authority for those.

`tests/unit/oracle.test.js` runs a 200-molecule round trip when Java and the
jar are present (skipped otherwise); `tests/unit/invariance.test.js` checks
that renumbering atoms and shuffling bonds never changes a name.
