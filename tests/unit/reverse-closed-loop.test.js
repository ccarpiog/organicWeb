/**
 * @file The closed loop of «¿Cómo se dibuja?» over every molecule generator
 * of the oracle (scripts/oracle/generate.mjs, all 27) and every row of
 * tests/fixtures/names.tsv, with no family filter (design.md §15.7, §15.8
 * R-7; phase I-53a, R-7a). Each generated molecule is named by the forward
 * engine (src/naming/), and its first name and every alternative the engine
 * writes — the other prefix styles, the traditional and retained names, the
 * class names, the o/m/p letters, the IUPAC 2013 locant forms, the
 * `benceno…carboxílico` forms — is turned into tiles (tokenize()), checked
 * to assemble to the same text and read by readName(): the first name must
 * be `correct`, every other form `alternative` (matched to itself), the
 * engine's first name given back and the molecule built the generated one
 * (aromatic key, so either Kekulé drawing of a benzene). A fixture row's
 * systematic name and its listed alternatives are read the same way against
 * the row's SMILES.
 *
 * Every family of v4 is read since R-6d, so nothing waits for a later phase:
 * a name that does not read back is either a refusal (an `outOfScope`
 * verdict of the reverse engine, or a molecule the forward engine does not
 * name), counted by source and reason in REFUSED (none met: the generators
 * draw only molecules the forward engine names, and the reverse engine
 * reads every name it writes), or a pin of PINS — a form not read on
 * purpose, or a forward-engine form behind an open user question —,
 * asserted to behave exactly as pinned, as often as pinned, so a fix flips
 * it. REACH adds the molecules whose forms the open questions are about,
 * which the seeds may not draw. The family files keep their own closed
 * loops (left-out locants, their family's counters); this one has no
 * filter. Pure imports, no Java.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName, VERDICT_TEXTS } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import * as oracle from '../../scripts/oracle/generate.mjs';
import { readFixtures, seq } from './reverse-words.js';

/**
 * The generators, in the order of the oracle's file header, with their
 * options (fixed seeds 7101…7126, 1200 molecules each, the oracle's default
 * size range of 4–14 carbons; the cycloalkanes are listed, not drawn: every
 * ring size from 3 to 30) and the minimum coverage each must give
 * (molecules distinct by aromatic key, names met): exactly what the seeds
 * gave when the table was written (phase I-53a; 30 899 molecules, 37 581
 * names). More is fine (a new alternative of the engine's is read too);
 * fewer means a generator or the engine changed. The whole file runs in
 * about 41 s on the development machine.
 */
const GENERATORS = Object.freeze([
  ['generateMolecules', { count: 1200, seed: 7101 }, { molecules: 1200, names: 1270 }],
  ['generateMonocycles', { count: 1200, seed: 7102 }, { molecules: 1200, names: 1270 }],
  ['generateBenzenes', { count: 1200, seed: 7103 }, { molecules: 1145, names: 1319 }],
  ['generateRingPrincipalBenzenes', { count: 1200, seed: 7104 }, { molecules: 1169, names: 2144 }],
  ['generateRingOutsideBenzenes', { count: 1200, seed: 7105 }, { molecules: 1179, names: 2605 }],
  ['generateRingPolysuffixBenzenes', { count: 1200, seed: 7106 }, { molecules: 1155, names: 1465 }],
  ['generateSubstitutedPhenyls', { count: 1200, seed: 7107 }, { molecules: 1192, names: 1489 }],
  ['generateSubstitutedBenzoyls', { count: 1200, seed: 7108 }, { molecules: 1100, names: 1136 }],
  ['generateHalogenated', { count: 1200, seed: 7109 }, { molecules: 1199, names: 1209 }],
  ['generateAlcohols', { count: 1200, seed: 7110 }, { molecules: 1198, names: 1250 }],
  ['generateCarbonyls', { count: 1200, seed: 7111 }, { molecules: 1200, names: 1274 }],
  ['generateAcids', { count: 1200, seed: 7112 }, { molecules: 1200, names: 1243 }],
  ['generateEsters', { count: 1200, seed: 7113 }, { molecules: 1200, names: 1421 }],
  ['generateEthers', { count: 1200, seed: 7114 }, { molecules: 1199, names: 1254 }],
  ['generateAmines', { count: 1200, seed: 7115 }, { molecules: 1194, names: 1517 }],
  ['generateAmides', { count: 1200, seed: 7116 }, { molecules: 1200, names: 1416 }],
  ['generateNitriles', { count: 1200, seed: 7117 }, { molecules: 1200, names: 1273 }],
  ['generateCyano', { count: 1200, seed: 7118 }, { molecules: 1200, names: 1297 }],
  ['generateAcyl', { count: 1200, seed: 7119 }, { molecules: 1200, names: 1251 }],
  ['generateEsterPrefixes', { count: 1200, seed: 7120 }, { molecules: 1200, names: 1368 }],
  ['generateAmidePrefixes', { count: 1200, seed: 7121 }, { molecules: 1200, names: 1372 }],
  ['generateRingSubstituents', { count: 1200, seed: 7122 }, { molecules: 1200, names: 1231 }],
  ['generateRingAcids', { count: 1200, seed: 7123 }, { molecules: 1195, names: 1292 }],
  ['generateRingNitrilesAmides', { count: 1200, seed: 7124 }, { molecules: 1200, names: 1372 }],
  ['generateRingEsters', { count: 1200, seed: 7125 }, { molecules: 1200, names: 1472 }],
  ['generateSubstitutedEsters', { count: 1200, seed: 7126 }, { molecules: 1146, names: 2343 }],
  ['generateCycloalkanes', { minSize: 3, maxSize: 30 }, { molecules: 28, names: 28 }],
]);

/** The pin categories: why a name the forward engine writes does not read back. */
const PIN_CATEGORIES = Object.freeze({
  notRead: 'a form the reverse engine does not read on purpose',
  forwardForm: 'a forward-engine form no tiles write (open user question)',
  tokenizer: 'a tokenizer ambiguity in the forward engine\'s form (open user question)',
});

/**
 * The names the forward engine writes that do not read back: what happens
 * instead (`outcome`, as readBack() reports it), the category and the
 * reason, how many times each source meets the name (`met`, exact: a
 * generator's name, `fixtures` or `reach`), and what a student's tiles for
 * it read (`tiles`: the words, the verdict kind and text, the molecule) —
 * the closed loop's text round trip goes through the test-only tokenizer,
 * the dialog through tiles.
 */
const PINS = Object.freeze({
  'alcohol bencílico': {
    outcome: 'noTiles',
    category: PIN_CATEGORIES.notRead,
    // The engine's traditional alternative of `fenilmetanol` (I-40a): a two-word name with the class word «alcohol», for
    // which no tile and no phase of design.md §15.8 exist (phase I-52c3: «stays unread»).
    reason: 'two-word class name with «alcohol»: no tile, no v4 phase',
    met: { generateRingSubstituents: 1, fixtures: 1, reach: 1 },
    tiles: [],
  },
  'ditert-butil éter': {
    outcome: 'noTiles',
    category: PIN_CATEGORIES.forwardForm,
    // naming/index.js etherClassAlternative() writes `di` and `tert-butil` together; the tiles assemble rule 5's hyphen,
    // `di-tert-butil éter`, which reads as the same molecule with another name (open question of phase I-51b2).
    reason: 'the engine writes no hyphen after `di` before `tert-`',
    met: { reach: 1 },
    tiles: [{ smiles: 'CC(C)(C)OC(C)(C)C', words: 'di tert-butil éter', kind: 'otherName', text: 'di-tert-butil éter' }],
  },
  tridecilamina: {
    outcome: 'noTiles',
    category: PIN_CATEGORIES.tokenizer,
    // The engine's class name of N(C₁₀H₂₁)₃ (`tri dec il amina`) and of tridecan-1-amina (`tridec il amina`): tokenize()
    // returns null for a class name with two readings (phase I-52c3 review fix); each tile sequence reads its own molecule.
    // Usage writes `tris(decil)amina` for the first (open question of phase I-52c3).
    reason: 'one text, two class names: N(C₁₀H₂₁)₃ and tridecan-1-amina',
    met: { reach: 2 },
    tiles: [
      { smiles: 'CCCCCCCCCCN(CCCCCCCCCC)CCCCCCCCCC', words: 'tri dec il amina', kind: 'alternative', text: 'tridecilamina' },
      { smiles: 'CCCCCCCCCCCCCN', words: 'tridec il amina', kind: 'alternative', text: 'tridecilamina' },
    ],
  },
});

/**
 * The refusals met, by source and reason (exact): `naming: CODE` for a
 * molecule the forward engine does not name (no name to read), `readName:
 * message` for an `outOfScope` verdict of the reverse engine on a name the
 * forward engine writes. None: the generators draw only molecules the
 * forward engine names (validation and their own filters), and every
 * refusal of the reverse engine (two rings, an `N` beside two amines or
 * amides, `manyAcids`…) concerns names the forward engine never writes —
 * they are tested with students' names in the family files.
 */
const REFUSED = Object.freeze({});

/**
 * Molecules whose forms the open user questions are about, which the seeds
 * may not draw: the pinned forms, and the forward-engine forms the reverse
 * engine follows (they must keep reading back should the engine change
 * them).
 */
const REACH = Object.freeze([
  // `ditert-butil éter` (pinned): the class name of di-tert-butyl ether, open question of phase I-51b2.
  'CC(C)(C)OC(C)(C)C',
  // `tridecilamina` (pinned), open question of phase I-52c3: N(C₁₀H₂₁)₃, and tridecan-1-amina.
  'CCCCCCCCCCN(CCCCCCCCCC)CCCCCCCCCC',
  'CCCCCCCCCCCCCN',
  // `alcohol bencílico` (pinned), the alternative of `fenilmetanol`.
  'OCC1=CC=CC=C1',
  // `1,6-bis-tert-butoxihexano` (usage: `di-tert-butoxi`), open question of phase I-51b1, followed.
  'CC(C)(C)OCCCCCCOC(C)(C)C',
  // `ácido 3,3-bis-(tert-butoxicarbonil)pentanoico` (usage: `bis(`), open question of phase I-52a2b, followed.
  'CCC(C(=O)OC(C)(C)C)(C(=O)OC(C)(C)C)CC(=O)O',
  // `butiltert-butilamina` (usage: `butil(tert-butil)amina`), open question of phase I-52c3, followed.
  'CCCCNC(C)(C)C',
  // `propanodioato de etilo y isopropilo` (Spanish writes «e» before «i»), open question of phase I-52a3b, followed.
  'CCOC(=O)CC(=O)OC(C)C',
]);

/** The fixture rows and the names they list (systematic name and alternatives), exact. */
const FIXTURE_COUNTS = Object.freeze({ rows: 1048, names: 1382 });

/**
 * Reads one name back and says what happened (design.md §15.7): its tiles,
 * the text they assemble to, and readName()'s verdict, judged against the
 * molecule the name was written for.
 *
 * @param {string} name - A name the forward engine writes (its first name or an alternative) or a fixture lists.
 * @param {{first: string, key: string, isFirst: boolean}} expected - The engine's first name for the molecule, the
 *   molecule's aromatic key, and whether `name` is that first name.
 * @returns {{outcome: string|null, verdict: object|null}} `outcome` null when the name reads back; else `noTiles` (no
 *   tile sequence writes it), `assembly` (the tiles assemble to another text), `kind:<kind>` (another verdict kind),
 *   `first` (another text or first name given back), `matched` (another alternative matched) or `graph` (another molecule
 *   built); `verdict` when readName() ran.
 */
function readBack(name, expected) {
  const ids = tokenize(name);
  if (!ids) {
    return { outcome: 'noTiles', verdict: null };
  }
  if (assemble(parse(ids).tree).text !== name) {
    return { outcome: 'assembly', verdict: null };
  }
  const verdict = readName(ids);
  let outcome = null;
  if (verdict.kind !== (expected.isFirst ? 'correct' : 'alternative')) {
    outcome = `kind:${verdict.kind}`;
  } else if (verdict.text !== name || verdict.name !== expected.first) {
    outcome = 'first';
  } else if (!expected.isFirst && (!verdict.matched || verdict.matched.name !== name)) {
    outcome = 'matched';
  } else if (!verdict.draw || aromaticKey(verdict.molecule) !== expected.key) {
    outcome = 'graph';
  }
  return { outcome, verdict };
} // End of function readBack()

/**
 * An empty tally of one source.
 *
 * @returns {{molecules: number, names: number, read: number, styles: object, pinned: object, refused: object,
 *   failures: string[]}} The tally: molecules and names met, names read back, names met by form (`first`, an alternative's
 *   style, `listed` for a fixture's alternative), pinned names and refusals by name or reason, unexplained failures.
 */
function newTally() {
  return { molecules: 0, names: 0, read: 0, styles: {}, pinned: {}, refused: {}, failures: [] };
}

/**
 * Adds one to a count of a map.
 *
 * @param {object} map - Counts by key (changed in place).
 * @param {string} key - The key.
 * @returns {void}
 */
function bump(map, key) {
  map[key] = (map[key] || 0) + 1;
}

/**
 * Reads back the names of one molecule into a tally: each name read
 * (readBack()), an `outOfScope` verdict counted by its reason, a pinned
 * name counted when it behaves as pinned, anything else a failure.
 *
 * @param {object} tally - newTally() (changed in place).
 * @param {string[]} names - The molecule's names, its first name first.
 * @param {string[]} styles - The form of each name (`first`, an alternative's style, `listed`).
 * @param {string} key - The molecule's aromatic key.
 * @param {string} where - Where the molecule comes from, for the failure report.
 * @returns {void}
 */
function tallyNames(tally, names, styles, key, where) {
  for (const [i, name] of names.entries()) {
    tally.names += 1;
    bump(tally.styles, styles[i]);
    const { outcome, verdict } = readBack(name, { first: names[0], key, isFirst: i === 0 });
    if (outcome === null) {
      tally.read += 1;
    } else if (outcome === 'kind:outOfScope') {
      bump(tally.refused, `readName: ${verdict.message.slice(VERDICT_TEXTS.outOfScope.length).trim()}`);
    } else if (Object.hasOwn(PINS, name) && PINS[name].outcome === outcome) {
      bump(tally.pinned, name);
    } else {
      tally.failures.push(`${where}: ${name} → ${outcome}${verdict ? ` (${verdict.kind}: ${verdict.message})` : ''}`);
    }
  } // End of the loop over the names of a molecule
} // End of function tallyNames()

/**
 * Reads back every name the forward engine writes for some molecules,
 * distinct by aromatic key, into a new tally; a molecule the engine does
 * not name is counted as a `naming:` refusal by its error code.
 *
 * @param {object[]} molecules - The molecules.
 * @param {(i: number) => string} where - Where the i-th molecule comes from, for the failure report.
 * @returns {object} The tally (newTally()).
 */
function loopMolecules(molecules, where) {
  const tally = newTally();
  const seen = new Set();
  for (const [i, mol] of molecules.entries()) {
    const key = aromaticKey(mol);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    tally.molecules += 1;
    const naming = nameMolecule(mol);
    if (!naming.ok) {
      bump(tally.refused, `naming: ${naming.error.code}`);
      continue;
    }
    const names = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    tallyNames(tally, names, ['first', ...naming.alternatives.map((alt) => alt.style)], key, where(i));
  } // End of the loop over the molecules
  return tally;
} // End of function loopMolecules()

/**
 * The pinned names one source must meet, with how often (PINS `met`).
 *
 * @param {string} source - A generator's name, `fixtures` or `reach`.
 * @returns {object} Counts by name.
 */
function pinsMet(source) {
  return Object.fromEntries(Object.entries(PINS).filter(([, pin]) => pin.met[source]).map(([name, pin]) => [name, pin.met[source]]));
}

/**
 * Checks a source's tally: no unexplained failure, the refusals of
 * REFUSED and the pins of PINS exactly, every name accounted for.
 *
 * @param {string} source - A generator's name, `fixtures` or `reach`.
 * @param {object} tally - Its tally.
 * @returns {string} The tally's report (counts, for the test's diagnostics).
 */
function assertTally(source, tally) {
  const pinned = Object.values(tally.pinned).reduce((sum, n) => sum + n, 0);
  const refusedNames = Object.entries(tally.refused).filter(([reason]) => reason.startsWith('readName:'))
    .reduce((sum, [, n]) => sum + n, 0);
  const report = JSON.stringify({ source, molecules: tally.molecules, names: tally.names, read: tally.read, styles: tally.styles,
    pinned: tally.pinned, refused: tally.refused, failures: tally.failures.length });
  assert.deepEqual(tally.failures.slice(0, 10), [], `${tally.failures.length} unexplained failures: ${report}`);
  assert.deepEqual(tally.refused, REFUSED[source] || {}, report);
  assert.deepEqual(tally.pinned, pinsMet(source), report);
  assert.equal(tally.read + pinned + refusedNames, tally.names, report);
  return report;
} // End of function assertTally()

test('closed loop (R-7a): the table holds every generator of scripts/oracle/generate.mjs, the pins are well formed', () => {
  const exported = Object.keys(oracle).filter((key) => /^generate[A-Z]/.test(key) && typeof oracle[key] === 'function').sort();
  assert.equal(exported.length, 27);
  assert.deepEqual(GENERATORS.map(([name]) => name).sort(), exported);
  const sources = new Set([...exported, 'fixtures', 'reach']);
  for (const [name, pin] of Object.entries(PINS)) {
    assert.ok(Object.values(PIN_CATEGORIES).includes(pin.category), name);
    assert.ok(Object.keys(pin.met).length > 0 && Object.keys(pin.met).every((source) => sources.has(source)), name);
    assert.ok(pin.reason.length > 0, name);
  }
}); // End of test 'closed loop (R-7a): the table holds every generator…'

for (const [generator, options, floor] of GENERATORS) {
  test(`closed loop (R-7a): ${generator} — every name the engine writes reads back, the same graph`, (t) => {
    const molecules = oracle[generator](options);
    const tally = loopMolecules(molecules, (i) => `${generator} #${i}`);
    const report = assertTally(generator, tally);
    assert.ok(tally.molecules >= floor.molecules, `molecules: ${report}`);
    assert.ok(tally.names >= floor.names, `names: ${report}`);
    t.diagnostic(report);
  }); // End of test 'closed loop (R-7a): <generator>…'
} // End of the loop over the generators

test('closed loop (R-7a): every fixture row — its systematic name and listed alternatives read back, the SMILES graph', async (t) => {
  const rows = await readFixtures();
  const tally = newTally();
  for (const row of rows) {
    tally.molecules += 1;
    const styles = row.names.map((_, i) => (i === 0 ? 'first' : 'listed'));
    tallyNames(tally, row.names, styles, aromaticKey(parseSmiles(row.smiles)), `names.tsv:${row.line}`);
  }
  assert.deepEqual({ rows: tally.molecules, names: tally.names }, { ...FIXTURE_COUNTS });
  t.diagnostic(assertTally('fixtures', tally));
}); // End of test 'closed loop (R-7a): every fixture row…'

test('closed loop (R-7a): the molecules of the open questions (REACH) — their names read back or behave as pinned', (t) => {
  const tally = loopMolecules(REACH.map((smiles) => parseSmiles(smiles)), (i) => REACH[i]);
  assert.equal(tally.molecules, REACH.length);
  t.diagnostic(assertTally('reach', tally));
}); // End of test 'closed loop (R-7a): the molecules of the open questions…'

test('closed loop (R-7a): the pinned names as a student builds them from tiles', () => {
  for (const [name, pin] of Object.entries(PINS)) {
    if (pin.outcome === 'noTiles') {
      assert.equal(tokenize(name), null, name);
    }
    for (const { smiles, words, kind, text } of pin.tiles) {
      const verdict = readName(seq(words));
      assert.deepEqual([verdict.kind, verdict.text], [kind, text], `${words}: ${verdict.message}`);
      assert.equal(aromaticKey(verdict.molecule), aromaticKey(parseSmiles(smiles)), words);
    }
  } // End of the loop over the pins
}); // End of test 'closed loop (R-7a): the pinned names as a student builds them from tiles'
