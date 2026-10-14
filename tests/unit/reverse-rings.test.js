/**
 * @file Unit tests for rings in «¿Cómo se dibuja?» (src/reverse/, design.md
 * §15.5.3, §15.7, §15.8 R-4; phase I-50a, R-4a): `ciclo` parents and ring
 * branches read by readName() — the ring worked cases with the molecule
 * each describes (compared by structural key, never only by name), the
 * fixture round trip over every `ciclo` hydrocarbon row of
 * tests/fixtures/names.tsv with an independent graph comparison, the closed
 * loop over the oracle's ring generators (generateMonocycles(),
 * generateCycloalkanes(); pure imports, no Java) with removed-locant
 * mutations, other mutations (swapped locants, reversed numbering,
 * unsorted, ungrouped, di/bis), the rings the app cannot draw (outOfScope),
 * a diagnosis for every ring `otherName` (I-50d) while the chain diagnoses
 * stand, the ordered drawing of a ring verdict, and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName, VERDICT_TEXTS } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { SEARCH_BUDGET } from '../../src/reverse/search.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { canonicalKey } from '../../src/model/graph.js';
import { RING_SYSTEM_MESSAGES } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { generateMonocycles, generateCycloalkanes } from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, isMonocyclicHydrocarbon, isCycloName } from './reverse-words.js';

/** `ciclo` hydrocarbon fixture rows (as in reverse-tokenize.test.js). */
const EXPECTED_ROWS = 53;

/** Their names and alternatives, every one read back as correct / alternative. */
const EXPECTED_COVERED = 59;

/** Average time budget of one readName() call, in milliseconds (design.md §15.7; phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative ring readName() call, in milliseconds. */
const PER_NAME_BUDGET_MS = 250;

/**
 * Reads tile words.
 *
 * @param {string} words - Space-separated tile words (reverse-words.js).
 * @param {object} [options] - readName() options.
 * @returns {object} The verdict.
 */
function read(words, options) {
  return readName(seq(words), options);
}

/**
 * The structural key of a SMILES molecule.
 *
 * @param {string} smiles - A SMILES.
 * @returns {string} canonicalKey() of its graph.
 */
function keyOf(smiles) {
  return canonicalKey(parseSmiles(smiles));
}

/**
 * The `otherName` message (design.md §15.3).
 *
 * @param {string} name - The engine's name.
 * @returns {string} The message.
 */
function otherNameMessage(name) {
  return `Esta es la molécula que describe tu nombre, pero se llama «${name}». Pulsa «Ver paso a paso» para ver por qué.`;
}

/**
 * The ring cases of the phase (design.md §15.8 R-4), with the molecule
 * each draws: [tile words, assembled text, kind, name shown (the filled
 * name for missingLocants, else the engine's), SMILES].
 */
const RING_CASES = [
  ['ciclo hex ano', 'ciclohexano', 'correct', 'ciclohexano', 'C1CCCCC1'],
  ['met il ciclo hex ano', 'metilciclohexano', 'correct', 'metilciclohexano', 'CC1CCCCC1'],
  ['1 2 di met il ciclo hex ano', '1,2-dimetilciclohexano', 'correct', '1,2-dimetilciclohexano', 'CC1CCCCC1C'],
  ['ciclo hex eno', 'ciclohexeno', 'correct', 'ciclohexeno', 'C1=CCCCC1'],
  // The engine omits the locant of the one double bond of a bare ring and offers no form with it.
  ['ciclo hex 1 eno', 'ciclohex-1-eno', 'otherName', 'ciclohexeno', 'C1=CCCCC1'],
  ['3 met il ciclo hex eno', '3-metilciclohexeno', 'missingLocants', '3-metilciclohex-1-eno', 'CC1C=CCCC1'],
  ['3 met il ciclo hex 1 eno', '3-metilciclohex-1-eno', 'correct', '3-metilciclohex-1-eno', 'CC1C=CCCC1'],
  ['1 5 di met il ciclo hex ano', '1,5-dimetilciclohexano', 'otherName', '1,3-dimetilciclohexano', 'CC1CCCC(C)C1'],
  ['ciclo hex il met ano', 'ciclohexilmetano', 'otherName', 'metilciclohexano', 'CC1CCCCC1'],
  ['ciclo hex iliden met ano', 'ciclohexilidenmetano', 'otherName', 'metilidenciclohexano', 'C=C1CCCCC1'],
  ['2 ciclo hex il prop ano', '2-ciclohexilpropano', 'otherName', 'isopropilciclohexano', 'CC(C)C1CCCCC1'],
  ['ciclo hex 2 eno 1 il met ano', '(ciclohex-2-en-1-il)metano', 'otherName', '3-metilciclohex-1-eno', 'CC1C=CCCC1'],
  ['START 2 met il ciclo hex il END met ano', '(2-metilciclohexil)metano', 'otherName', '1,2-dimetilciclohexano', 'CC1CCCCC1C'],
  // Crowded prefixes: the ring branch is enclosed whether or not START…END wraps it (review I-50a).
  ['met il ciclo hex il met ano', 'metil(ciclohexil)metano', 'otherName', 'etilciclohexano', 'CCC1CCCCC1'],
  ['met il START ciclo hex il END met ano', 'metil(ciclohexil)metano', 'otherName', 'etilciclohexano', 'CCC1CCCCC1'],
  ['dodeca met il ciclo hex ano', 'dodecametilciclohexano', 'missingLocants', '1,1,2,2,3,3,4,4,5,5,6,6-dodecametilciclohexano',
    'CC1(C)C(C)(C)C(C)(C)C(C)(C)C(C)(C)C1(C)C'],
  ['1 1 2 2 3 3 hexa met il ciclo hex ano', '1,1,2,2,3,3-hexametilciclohexano', 'correct', '1,1,2,2,3,3-hexametilciclohexano',
    'CC1(C)CCCC(C)(C)C1(C)C'],
  ['ciclo hex 1 3 di eno', 'ciclohexa-1,3-dieno', 'correct', 'ciclohexa-1,3-dieno', 'C1=CC=CCC1'],
  ['ciclo oct 1 eno 3 ino', 'ciclooct-1-en-3-ino', 'correct', 'ciclooct-1-en-3-ino', 'C1=CC#CCCCC1'],
  ['ciclo prop eno', 'ciclopropeno', 'correct', 'ciclopropeno', 'C1=CC1'],
  ['met il ciclo triacont ano', 'metilciclotriacontano', 'correct', 'metilciclotriacontano', 'CC1CCCCCCCCCCCCCCCCCCCCCCCCCCCCC1'],
  // A monosubstituted ring omits its prefix locant: left out with another list, the name is still told.
  ['but eno 3 ino 1 il ciclo prop ano', '(buten-3-in-1-il)ciclopropano', 'missingLocants', '(but-1-en-3-in-1-il)ciclopropano',
    'C1CC1C=CC#C'],
];

test('ring cases (R-4a): the verdict, the name shown and the molecule described, by structural key', () => {
  for (const [words, text, kind, name, smiles] of RING_CASES) {
    const verdict = read(words);
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, kind, `${text}: ${verdict.message}`);
    assert.equal(canonicalKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    assert.equal(verdict.draw, true);
    if (kind === 'missingLocants') {
      assert.equal(verdict.filled, name);
      assert.equal(verdict.message, `Casi: faltan los números. Se escribe «${name}».`);
    } else {
      assert.equal(verdict.name, name, text);
    }
    if (kind === 'otherName') {
      assert.equal(verdict.message, otherNameMessage(name));
    }
    if (kind === 'correct') {
      assert.equal(verdict.message, VERDICT_TEXTS.correct);
    }
  } // End of the loop over the ring cases
}); // End of test 'ring cases (R-4a): the verdict, the name shown and the molecule described, by structural key'

test('ring cases (R-4a): left-out locants on a ring are ambiguous, listing the structures', () => {
  const dimethyl = read('di met il ciclo hex ano');
  assert.equal(dimethyl.kind, 'ambiguous');
  assert.equal(dimethyl.message,
    'Faltan números: puede ser 1,1-dimetilciclohexano, 1,2-dimetilciclohexano, 1,3-dimetilciclohexano u otra molécula.');
  assert.deepEqual(dimethyl.candidates.map((c) => [c.text, canonicalKey(c.molecule)]), [
    ['1,1-dimetilciclohexano', keyOf('CC1(C)CCCCC1')], ['1,2-dimetilciclohexano', keyOf('CC1CCCCC1C')],
    ['1,3-dimetilciclohexano', keyOf('CC1CCCC(C)C1')], ['1,4-dimetilciclohexano', keyOf('CC1CCC(C)CC1')],
  ]);
  assert.equal(dimethyl.molecule, null);
  const dienes = read('ciclo hex di eno');
  assert.equal(dienes.message, 'Faltan números: puede ser ciclohexa-1,2-dieno, ciclohexa-1,3-dieno o ciclohexa-1,4-dieno.');
  // Six methyls on six ring carbons: many structures, each named once, well within the search budget.
  const start = performance.now();
  const hexamethyl = read('hexa met il ciclo hex ano');
  const elapsed = performance.now() - start;
  assert.equal(hexamethyl.kind, 'ambiguous');
  assert.equal(hexamethyl.candidates.length, 18);
  assert.ok(hexamethyl.candidates.some((c) => c.text === '1,2,3,4,5,6-hexametilciclohexano'));
  assert.ok(elapsed < SEARCH_BUDGET.ms, `hexametilciclohexano took ${elapsed.toFixed(1)} ms`);
}); // End of test 'ring cases (R-4a): left-out locants on a ring are ambiguous, listing the structures'

test('fixture round trip (R-4a): every `ciclo` hydrocarbon name and alternative, graph compared with the SMILES', async () => {
  const rows = (await readFixtures()).filter((row) => isMonocyclicHydrocarbon(row.smiles) && row.names.every(isCycloName));
  let covered = 0;
  let elapsed = 0;
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      const start = performance.now();
      const verdict = readName(ids);
      elapsed += performance.now() - start;
      const isMain = name === row.names[0];
      assert.equal(verdict.kind, isMain ? 'correct' : 'alternative', `names.tsv:${row.line}: ${name} → ${verdict.message}`);
      assert.equal(verdict.text, name);
      assert.equal(verdict.name, row.names[0], `names.tsv:${row.line}`);
      assert.equal(canonicalKey(verdict.molecule), expected, `names.tsv:${row.line}: ${name} builds another graph`);
      assert.equal(verdict.draw, true);
      if (!isMain) {
        assert.equal(verdict.matched.name, name);
      }
      covered += 1;
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  assert.equal(rows.length, EXPECTED_ROWS);
  assert.equal(covered, EXPECTED_COVERED);
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-4a): every `ciclo` hydrocarbon name and alternative…'

/** The closed loop's seeded monocycles (scripts/oracle/generate.mjs generateMonocycles(); design.md §15.7). */
const LOOP = Object.freeze({ count: 400, seed: 4702, minSize: 3, maxSize: 14 });

/**
 * Minimum coverage of the closed loop: molecules (the seeded monocycles
 * and the 28 cycloalkanes C3–C30), names read back, removed-locant
 * mutations and decisive verdicts among them (the seed gives 428, 443,
 * 981 and 981).
 */
const LOOP_MIN = Object.freeze({ molecules: 420, names: 430, removed: 950, decisive: 930 });

/**
 * The locant lists of a tree a student can leave out: a prefix's and a
 * segment's, at any depth — never a free-valence locant.
 *
 * @param {object} tree - An error-free parse() tree.
 * @returns {number[][]} The lists of number tile indices.
 */
function locantLists(tree) {
  const lists = [];
  /**
   * Collects the segments of a chain or ring.
   *
   * @param {object} chain - A chain node.
   * @returns {void}
   */
  const visitChain = (chain) => chain.segments.forEach((segment) => segment.locants.length > 0 && lists.push(segment.locants));
  /**
   * Collects a prefix and its substituent.
   *
   * @param {object} item - A prefix node.
   * @returns {void}
   */
  const visitItem = (item) => {
    if (item.locants.length > 0) {
      lists.push(item.locants);
    }
    const sub = item.substituent;
    if (sub.type === 'chain') {
      visitChain(sub);
    } else if (sub.type === 'branch') {
      sub.items.forEach(visitItem);
      if (sub.chain.type === 'chain') {
        visitChain(sub.chain);
      }
    }
  }; // End of function visitItem()
  tree.items.forEach(visitItem);
  visitChain(tree.parent.chain);
  return lists;
} // End of function locantLists()

test('closed loop over the ring generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = [...generateMonocycles(LOOP), ...generateCycloalkanes({ minSize: 3, maxSize: 30 })];
  const counts = { names: 0, removed: 0, decisive: 0 };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    assert.ok(naming.ok);
    const key = canonicalKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!isCycloName(name)) {
        continue; // A compound locant of the closing bond (`ciclopropa-1,1(3),2-trieno`): the locant control of R-5a.
      }
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(canonicalKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      if (i > 0) {
        continue;
      }
      // Removed locants: the molecule must be the one drawn, or among those listed; never another verdict.
      for (const list of locantLists(parse(ids).tree)) {
        const reread = readName(ids.filter((_, j) => !list.includes(j)));
        counts.removed += 1;
        const where = `${name} → ${reread.text}: ${reread.kind}, ${reread.message}`;
        if (reread.kind === 'incomplete') {
          continue;
        }
        if (reread.kind === 'ambiguous') {
          assert.ok(reread.candidates.some((c) => c.text === name && canonicalKey(c.molecule) === key), where);
        } else {
          assert.ok(['missingLocants', 'correct', 'alternative'].includes(reread.kind), where);
          assert.equal(canonicalKey(reread.molecule), key, where);
          assert.equal(reread.filled, reread.kind === 'missingLocants' ? name : null, where);
        }
        counts.decisive += 1;
      } // End of the loop over the locant lists
    } // End of the loop over the names of a molecule
  } // End of the loop over the molecules
  assert.ok(molecules.length >= LOOP_MIN.molecules, `${molecules.length} molecules`);
  assert.ok(counts.names >= LOOP_MIN.names, `${counts.names} names read back`);
  assert.ok(counts.removed >= LOOP_MIN.removed, `${counts.removed} removed-locant mutations`);
  assert.ok(counts.decisive >= LOOP_MIN.decisive, `${counts.decisive} decisive verdicts`);
}); // End of test 'closed loop over the ring generators…'

/**
 * Mutations of correct ring names: [tile words, assembled text, kind, the
 * engine's name, SMILES of the molecule described].
 */
const MUTATIONS = [
  ['1 3 di met il ciclo hex ano', '1,3-dimetilciclohexano', 'correct', '1,3-dimetilciclohexano', 'CC1CCCC(C)C1'],
  ['1 5 di met il ciclo hex ano', '1,5-dimetilciclohexano', 'otherName', '1,3-dimetilciclohexano', 'CC1CCCC(C)C1'], // reversed
  ['3 et il 1 met il ciclo hex ano', '3-etil-1-metilciclohexano', 'otherName', '1-etil-3-metilciclohexano', 'CCC1CCCC(C)C1'], // swapped
  ['1 met il 3 et il ciclo hex ano', '1-metil-3-etilciclohexano', 'otherName', '1-etil-3-metilciclohexano', 'CC1CCCC(CC)C1'], // swapped
  ['1 met il 2 met il ciclo hex ano', '1-metil-2-metilciclohexano', 'otherName', '1,2-dimetilciclohexano', 'CC1CCCCC1C'], // ungrouped
  ['1 2 bis met il ciclo hex ano', '1,2-bismetilciclohexano', 'otherName', '1,2-dimetilciclohexano', 'CC1CCCCC1C'], // bis for di
  ['4 met il 1 isopropil ciclo hex ano', '4-metil-1-isopropilciclohexano', 'otherName', '1-isopropil-4-metilciclohexano',
    'CC(C)C1CCC(C)CC1'], // unsorted
  ['3 met il ciclo hex 2 eno', '3-metilciclohex-2-eno', 'otherName', '1-metilciclohex-1-eno', 'CC1=CCCCC1'], // numbered from the methyl
  ['6 met il ciclo hex 1 eno', '6-metilciclohex-1-eno', 'otherName', '3-metilciclohex-1-eno', 'CC1C=CCCC1'], // the other direction
  ['ciclo hex 2 eno', 'ciclohex-2-eno', 'otherName', 'ciclohexeno', 'C1=CCCCC1'],
  ['1 met il ciclo hex ano', '1-metilciclohexano', 'otherName', 'metilciclohexano', 'CC1CCCCC1'], // needless locant
  ['1 3 ciclo hex di eno', '1,3-ciclohexadieno', 'otherName', 'ciclohexa-1,3-dieno', 'C1=CC=CCC1'], // old style
];

test('mutations of ring names: the verdict, the molecule the name describes and its diagnosis', () => {
  for (const [words, text, kind, name, smiles] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, kind, `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.equal(canonicalKey(verdict.molecule), keyOf(smiles), `${text} builds another graph`);
    assert.equal(verdict.draw, true);
    if (kind === 'otherName') {
      assert.equal(verdict.message, otherNameMessage(name));
      assert.ok(verdict.diagnosis && verdict.diagnosis.code, `${text}: a ring diagnosis (I-50d; its cases: reverse-diagnose-rings.test.js)`);
    }
  } // End of the loop over the mutations
  assert.deepEqual(read('1 3 ciclo hex di eno').notes, ['Es la forma antigua de escribirlo; hoy se escribe «ciclohexa-1,3-dieno».']);
  // The chain diagnoses stand: a ring tile elsewhere in the catalogue changes nothing for them.
  assert.equal(read('4 met il pent ano').diagnosis.code, 'NUMBERING');
  assert.equal(read('2 but eno').diagnosis.code, 'OLD_STYLE');
  // A ring branch on a chain: the engine names the molecule on its ring, so the ring rule says so (I-50d).
  assert.equal(read('ciclo hex il met ano').diagnosis.code, 'RING_IS_PARENT');
}); // End of test 'mutations of ring names…'

test('rings the app cannot draw: outOfScope with the engine\'s message, never a crash', () => {
  const several = `${VERDICT_TEXTS.outOfScope} ${RING_SYSTEM_MESSAGES.several}`;
  // Two rings bonded straight together, or three: refused before any search (no structural key), nothing built.
  for (const words of ['ciclo hex il ciclo hex ano', 'ciclo hex iliden ciclo hex ano', 'tri ciclo hex il met ano',
    'met il ciclo hex il ciclo hex ano', '1 2 3 tri ciclo prop il ciclo hex ano']) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message, verdict.molecule, verdict.draw], ['outOfScope', several, null, false], words);
  }
  // Two rings apart: built and named — the engine refuses the one structure.
  const apart = read('di ciclo hex il met ano');
  assert.deepEqual([apart.kind, apart.message, apart.draw, apart.name], ['outOfScope', several, false, null]);
  assert.equal(canonicalKey(apart.molecule), keyOf('C1CCCCC1CC1CCCCC1'));
  // Several structures, the engine refusing every one: outOfScope too (no list of numbers to add), nothing drawn.
  const everywhere = read('di ciclo hex il prop ano');
  assert.deepEqual([everywhere.kind, everywhere.message, everywhere.molecule, everywhere.candidates], ['outOfScope', several, null, []]);
  // An old-style note still comes with it.
  assert.deepEqual(read('1 ciclo hex il 3 ciclo hex eno').notes, ['Es la forma antigua de escribirlo; hoy se escribe «1-ciclohexilciclohex-3-eno».']);
}); // End of test 'rings the app cannot draw: outOfScope with the engine's message, never a crash'

test('«Dibujar» (R-4a): a ring verdict has an ordered drawing (canonical layout without problems)', () => {
  for (const words of ['ciclo hex ano', 'met il ciclo hex ano', '3 met il ciclo hex 1 eno', 'ciclo hex il met ano',
    'START 2 met il ciclo hex il END met ano', 'met il ciclo triacont ano', 'ciclo prop eno']) {
    const verdict = read(words);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-4a): a ring verdict has an ordered drawing…'

/** Representative ring names for the time budget. */
const TIMED = ['ciclo hex ano', 'met il ciclo hex ano', 'di met il ciclo hex ano', 'tri met il ciclo oct ano', 'ciclo hex di eno',
  'met il ciclo hex eno', 'hexa met il ciclo hex ano', 'dodeca met il ciclo hex ano', 'ciclo hex eno il met ano',
  'di ciclo hex il prop ano', 'START met il ciclo hex il END ciclo pent ano'];

test('time budget: each representative ring readName() well within budget; the search\'s own clock bounds the worst', () => {
  TIMED.forEach((words) => read(words)); // Warm-up.
  for (const words of TIMED) {
    const start = performance.now();
    read(words);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
  }
  for (const words of ['deca met il ciclo triacont ano', 'hexa met il ciclo dodec tri eno']) {
    const start = performance.now();
    const verdict = read(words);
    const elapsed = performance.now() - start;
    assert.equal(verdict.kind, 'incomplete', words);
    assert.ok(elapsed < SEARCH_BUDGET.ms + PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
  }
}); // End of test 'time budget: each representative ring readName() well within budget…'
