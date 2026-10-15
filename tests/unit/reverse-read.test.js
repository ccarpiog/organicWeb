/**
 * @file Unit tests for readName() of «¿Cómo se dibuja?»
 * (src/reverse/index.js, design.md §15.3, §15.5.3, §15.7, phases R-1b and
 * R-1c): the fixture round trip with an independent graph comparison, the
 * closed loop over the oracle's generated molecules, mutations of correct
 * names (removed locants included) with the molecule they describe, the
 * worked cases of §15.5.3, the verdict shape, the ambiguous message,
 * old-style names, the outOfScope and traditional-name hooks (injected
 * namer), the search budget (injected; its time limit also over steps
 * 5–8), the drawn molecule as the graph the engine named (with the
 * student's reading carried onto it), partial names, NFC comparison and
 * time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  readName, sameName, orBefore, ambiguousMessage, VERDICT_KINDS, MAX_LISTED,
} from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { SEARCH_BUDGET, searchStructures } from '../../src/reverse/search.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { canonicalKey, cyclomaticNumber } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { generateMolecules } from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, isOpenChainHydrocarbon } from './reverse-words.js';

/** Open-chain hydrocarbon fixture rows (as in reverse-tokenize.test.js). */
const EXPECTED_ROWS = 176;

/** Their names and alternatives read back as correct / alternative: every one (R-1c). */
const EXPECTED_COVERED = 204;

/** Names whose locants are left out by the engine itself, read back through the search (R-1c). */
const SEARCHED_NAMES = ['propeno', 'propino', 'propadieno'];

/** Average time budget of one readName() call, in milliseconds (design.md §15.7; phones are slower). */
const AVERAGE_BUDGET_MS = 50;

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
 * Tells whether a name's tiles leave out a locant with several possible
 * values (an explicit check on the reading, not on the verdict).
 *
 * @param {string[]} ids - Tile ids.
 * @returns {boolean} True when the search has more than one placement to try.
 */
function leavesOutLocants(ids) {
  return interpret(parse(ids).tree).leftOut.some((slot) => slot.domain[0] !== slot.domain[1]);
}

test('fixture round trip: every open-chain hydrocarbon name and alternative, graph compared with the SMILES', async () => {
  const rows = (await readFixtures()).filter((row) => isOpenChainHydrocarbon(row.smiles));
  let covered = 0;
  let elapsed = 0;
  const searched = [];
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      if (leavesOutLocants(ids)) {
        searched.push(name);
      }
      const start = performance.now();
      const verdict = readName(ids);
      elapsed += performance.now() - start;
      const isMain = name === row.names[0];
      assert.equal(verdict.kind, isMain ? 'correct' : 'alternative', `names.tsv:${row.line}: ${name} → ${verdict.message}`);
      assert.equal(verdict.text, name);
      assert.equal(verdict.name, row.names[0], `names.tsv:${row.line}`);
      assert.equal(canonicalKey(verdict.molecule), expected, `names.tsv:${row.line}: ${name} builds another graph`);
      assert.equal(verdict.draw, true);
      if (isMain) {
        assert.equal(verdict.message, '¡Correcto!', 'no open-chain hydrocarbon has a traditional alternative');
      } else {
        assert.equal(verdict.matched.name, name);
        assert.equal(verdict.message, `¡Correcto! «${name}» es una forma válida (${verdict.matched.label}). `
          + `El nombre que doy primero es «${row.names[0]}».`);
      }
      covered += 1;
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  assert.equal(rows.length, EXPECTED_ROWS);
  assert.equal(covered, EXPECTED_COVERED);
  assert.deepEqual(searched, SEARCHED_NAMES, 'the names with left-out locants are covered too');
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip: every open-chain hydrocarbon name and alternative…'

/** The closed loop's seeded molecules (scripts/oracle/generate.mjs generateMolecules(); design.md §15.7). */
const LOOP = Object.freeze({ count: 300, seed: 4701, minSize: 2, maxSize: 14 });

/**
 * Minimum coverage of the closed loop: molecules drawn, names read back,
 * removed-locant mutations, decisive verdicts among them (the seed gives
 * 300, 316, 660 and 654; the rest end as `incomplete`).
 */
const LOOP_MIN = Object.freeze({ molecules: 300, names: 310, removed: 650, decisive: 640 });

/**
 * Tells whether a generated molecule and one of its names are within
 * R-1's supported syntax: an open-chain hydrocarbon (only carbons, no
 * ring) and a name written with letters, digits, hyphens, commas and
 * enclosing marks only (no space, no accent).
 *
 * @param {object} mol - The molecule.
 * @param {string} name - One of its names.
 * @returns {boolean} True when R-1 reads it.
 */
function inR1(mol, name) {
  return [...mol.atoms.values()].every((atom) => atom.element === 'C') && cyclomaticNumber(mol) === 0
    && /^[a-z0-9,()[\]{}-]+$/.test(name);
}

/**
 * The locant lists of a tree a student can leave out: a prefix's and a
 * segment's, at any depth — never a free-valence locant (`propan-2-il`
 * without its 2 reads `propanil`, a parse error).
 *
 * @param {object} tree - An error-free parse() tree.
 * @returns {number[][]} The lists of number tile indices.
 */
function locantLists(tree) {
  const lists = [];
  /**
   * Collects the segments of a chain.
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

test('closed loop over generateMolecules(): engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = generateMolecules(LOOP);
  const counts = { names: 0, removed: 0, decisive: 0 };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    assert.ok(naming.ok);
    const key = canonicalKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!inR1(mol, name)) {
        continue;
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
}); // End of test 'closed loop over generateMolecules(): engine name → tiles → readName() → the same graph…'

/**
 * Mutations of correct names: the verdict, the engine's name and the
 * molecule the student's name describes (by structural key).
 */
const MUTATIONS = [
  // [tile words, assembled text, kind, engine's name, SMILES of the molecule described]
  ['4 met il pent ano', '4-metilpentano', 'otherName', '2-metilpentano', 'CC(C)CCC'], // reversed numbering
  ['hex 4 eno', 'hex-4-eno', 'otherName', 'hex-2-eno', 'CC=CCCC'], // reversed numbering
  ['pent 4 eno 1 ino', 'pent-4-en-1-ino', 'otherName', 'pent-1-en-4-ino', 'C=CCC#C'], // reversed numbering
  ['2 et il 3 met il hex ano', '2-etil-3-metilhexano', 'otherName', '3,4-dimetilheptano', 'CC(CC)C(C)CCC'], // swapped locants
  ['2 met il 3 et il pent ano', '2-metil-3-etilpentano', 'otherName', '3-etil-2-metilpentano', 'CC(C)C(CC)CC'], // unsorted
  ['2 met il 3 met il pent ano', '2-metil-3-metilpentano', 'otherName', '2,3-dimetilpentano', 'CC(C)C(C)CC'], // ungrouped
  ['2 3 bis met il pent ano', '2,3-bismetilpentano', 'otherName', '2,3-dimetilpentano', 'CC(C)C(C)CC'], // bis for di
  ['5 5 di START 2 2 di met il prop il END non ano', '5,5-di(2,2-dimetilpropil)nonano', 'otherName',
    '5,5-bis(2,2-dimetilpropil)nonano', 'CCCCC(CC(C)(C)C)(CC(C)(C)C)CCCC'], // di for bis
  ['5 5 bis prop ano 2 il non ano', '5,5-bis(propan-2-il)nonano', 'otherName', '5,5-diisopropilnonano',
    'CCCCC(C(C)C)(C(C)C)CCCC'], // bis for the di of the pin form
  ['1 met il et ano', '1-metiletano', 'otherName', 'propano', 'CCC'],
  ['1 met il prop ano', '1-metilpropano', 'otherName', 'butano', 'CCCC'],
  ['2 et il but ano', '2-etilbutano', 'otherName', '3-metilpentano', 'CCC(C)CC'],
  ['met il met ano', 'metilmetano', 'otherName', 'etano', 'CC'], // a left-out locant with one possible value
  ['2 met il pent ano', '2-metilpentano', 'correct', '2-metilpentano', 'CC(C)CCC'],
  ['et eno', 'eteno', 'correct', 'eteno', 'C=C'],
  ['5 et eno iliden non ano', '5-etenilidennonano', 'correct', '5-etenilidennonano', 'CCCCC(=C=C)CCCC'],
];

test('mutations of correct names: the verdict and the molecule the name describes', () => {
  for (const [words, text, kind, name, smiles] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, kind, `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.equal(canonicalKey(verdict.molecule), keyOf(smiles), `${text} builds another graph`);
    assert.equal(verdict.draw, true);
    if (kind === 'otherName') {
      assert.equal(verdict.message, `Esta es la molécula que describe tu nombre, pero se llama «${name}». `
        + 'Pulsa «Ver paso a paso» para ver por qué.');
    }
  } // End of the loop over the mutations
}); // End of test 'mutations of correct names: the verdict and the molecule the name describes'

test('the student\'s reading: the parent in the student\'s locant order and the atoms of each prefix', () => {
  const verdict = read('4 met il pent ano');
  const { molecule, studentParent, prefixAtoms } = verdict;
  assert.equal(studentParent.atoms.length, 5);
  assert.equal(studentParent.bonds.length, 4);
  assert.equal(prefixAtoms.length, 1);
  assert.equal(prefixAtoms[0].locant, 4);
  assert.equal(prefixAtoms[0].parentAtom, studentParent.atoms[3], 'the methyl hangs from the student\'s carbon 4');
  assert.deepEqual(prefixAtoms[0].tiles, [0, 3]);
  assert.equal(prefixAtoms[0].atoms.length, 1);
  assert.equal(molecule.bonds.get(prefixAtoms[0].bond).order, 1);
  // The engine numbers the other way: its parent's carbon 2 is the student's carbon 4.
  assert.equal(verdict.naming.parent.atoms[1], studentParent.atoms[3]);
}); // End of test 'the student's reading: the parent in the student's locant order and the atoms of each prefix'

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
 * The worked cases of design.md §15.5.3 that R-1 covers (open-chain
 * hydrocarbons; the ring and group cases wait for R-4 / R-5), with the
 * molecule each draws.
 */
const WORKED = [
  // [tile words, assembled text, kind, name shown (the filled name / the engine's name), SMILES of the molecule drawn]
  ['met il prop ano', 'metilpropano', 'missingLocants', '2-metilpropano', 'CC(C)C'],
  ['2 met il prop eno', '2-metilpropeno', 'missingLocants', '2-metilprop-1-eno', 'C=C(C)C'],
  ['met il prop eno', 'metilpropeno', 'missingLocants', '2-metilprop-1-eno', 'C=C(C)C'],
  ['met il et ano', 'metiletano', 'otherName', 'propano', 'CCC'],
  ['1 met il prop ano', '1-metilpropano', 'otherName', 'butano', 'CCCC'],
  ['2 et il but ano', '2-etilbutano', 'otherName', '3-metilpentano', 'CCC(C)CC'],
  ['4 met il pent ano', '4-metilpentano', 'otherName', '2-metilpentano', 'CC(C)CCC'],
  ['hex 4 eno', 'hex-4-eno', 'otherName', 'hex-2-eno', 'CC=CCCC'],
];

test('worked cases of design.md §15.5.3: missingLocants, ambiguous and otherName', () => {
  for (const [words, text, kind, name, smiles] of WORKED) {
    const verdict = read(words);
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, kind, `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.equal(canonicalKey(verdict.molecule), keyOf(smiles), `${text} draws another graph`);
    assert.equal(verdict.draw, true);
    assert.deepEqual(verdict.candidates, []);
    assert.equal(verdict.matched, null);
    if (kind === 'missingLocants') {
      assert.equal(verdict.filled, name);
      assert.equal(verdict.message, `Casi: faltan los números. Se escribe «${name}».`);
    } else {
      assert.equal(verdict.filled, null);
      assert.equal(verdict.message, otherNameMessage(name));
    }
  } // End of the loop over the worked cases
  const buteno = read('but eno');
  assert.equal(buteno.kind, 'ambiguous');
  assert.equal(buteno.message, 'Faltan números: puede ser but-1-eno o but-2-eno.');
  assert.deepEqual(buteno.candidates.map((c) => [c.text, c.name, canonicalKey(c.molecule)]), [
    ['but-1-eno', 'but-1-eno', keyOf('C=CCC')], ['but-2-eno', 'but-2-eno', keyOf('CC=CC')],
  ]);
  assert.deepEqual([buteno.molecule, buteno.studentParent, buteno.name, buteno.naming, buteno.filled, buteno.draw],
    [null, null, null, null, null, false], 'no drawing (design.md §15.3)');
  assert.deepEqual([buteno.prefixAtoms, buteno.alternatives, buteno.errors], [[], [], []]);
}); // End of test 'worked cases of design.md §15.5.3: missingLocants, ambiguous and otherName'

test('the student\'s reading of a name with left-out locants: the placement of the filled name, else the first', () => {
  const filled = read('met il prop eno');
  assert.equal(filled.prefixAtoms[0].locant, 2, '2-metilprop-1-eno');
  assert.equal(filled.molecule.bonds.get(filled.studentParent.bonds[0]).order, 2, 'the double bond on the student\'s bond 1');
  assert.equal(filled.prefixAtoms[0].parentAtom, filled.studentParent.atoms[1]);
  const first = read('met il et ano');
  assert.equal(first.prefixAtoms[0].locant, 1, 'the first placement found, lowest locants first');
  assert.equal(first.studentParent.atoms.length, 2);
  const exact = read('prop eno');
  assert.equal(exact.kind, 'correct');
  assert.equal(exact.molecule.bonds.get(exact.studentParent.bonds[0]).order, 2, 'propeno drawn as prop-1-eno');
}); // End of test 'the student's reading of a name with left-out locants: the placement of the filled name, else the first'

/**
 * Mutations with removed locants (design.md §15.7): the verdict and what
 * it shows — the filled name and the molecule drawn, or the names listed.
 */
const REMOVED = [
  // [tile words, assembled text, kind, filled name (or the names listed), SMILES of the molecule drawn (null: no drawing)]
  ['et il pent ano', 'etilpentano', 'missingLocants', '3-etilpentano', 'CCC(CC)CC'],
  ['di met il prop ano', 'dimetilpropano', 'missingLocants', '2,2-dimetilpropano', 'CC(C)(C)C'],
  ['tri met il but ano', 'trimetilbutano', 'missingLocants', '2,2,3-trimetilbutano', 'CC(C)(C)C(C)C'],
  ['tetra met il but ano', 'tetrametilbutano', 'missingLocants', '2,2,3,3-tetrametilbutano', 'CC(C)(C)C(C)(C)C'],
  ['met il pent ano', 'metilpentano', 'ambiguous', ['2-metilpentano', '3-metilpentano'], null],
  ['2 met il hex eno', '2-metilhexeno', 'ambiguous', ['2-metilhex-1-eno', '2-metilhex-2-eno', '2-metilhex-3-eno'], null],
  ['met il but 1 eno', 'metilbut-1-eno', 'ambiguous', ['2-metilbut-1-eno', '3-metilbut-1-eno'], null],
  ['but di eno', 'butadieno', 'ambiguous', ['buta-1,2-dieno', 'buta-1,3-dieno'], null],
  ['pent 1 eno ino', 'pent-1-enino', 'ambiguous', ['pent-1-en-3-ino', 'pent-1-en-4-ino'], null],
  ['2 3 di met il but eno', '2,3-dimetilbuteno', 'ambiguous', ['2,3-dimetilbut-1-eno', '2,3-dimetilbut-2-eno'], null],
  ['met iliden prop ano', 'metilidenpropano', 'ambiguous', ['but-1-eno', '2-metilprop-1-eno'], null], // no filled name fits
  ['di met il et ano', 'dimetiletano', 'ambiguous', ['2-metilpropano', 'butano'], null], // no filled name fits
  ['et il prop ano', 'etilpropano', 'ambiguous', ['pentano', '2-metilbutano'], null], // no filled name fits
  ['4 START met il prop il END hept ano', '4-(metilpropil)heptano', 'ambiguous',
    ['3-metil-4-propilheptano', '2-metil-4-propilheptano', '4-propiloctano'], null], // inside a compound branch
  ['prop eno', 'propeno', 'correct', null, 'CC=C'], // the engine leaves it out too
  ['prop di eno', 'propadieno', 'correct', null, 'C=C=C'],
  ['hex 1 eno 3 5 di ino', 'hex-1-en-3,5-diino', 'correct', null, 'C=CC#CC#C'], // nothing removed: no search
];

test('mutations with removed locants: the verdict, the filled name and the molecule, or the names listed', () => {
  for (const [words, text, kind, shown, smiles] of REMOVED) {
    const verdict = read(words);
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, kind, `${text}: ${verdict.message}`);
    if (kind === 'ambiguous') {
      assert.deepEqual(verdict.candidates.map((c) => c.text), shown, text);
      assert.deepEqual(verdict.candidates.map((c) => c.name), shown, `${text}: every one is a name the app gives`);
      assert.equal(verdict.message, ambiguousMessage(verdict.candidates));
      assert.equal(verdict.molecule, null);
      continue;
    }
    assert.equal(verdict.filled, shown, text);
    assert.equal(canonicalKey(verdict.molecule), keyOf(smiles), `${text} draws another graph`);
    assert.equal(verdict.draw, true);
  } // End of the loop over the mutations
  // The filled text may be an alternative: the student's own style is shown, with the name given first.
  const pin = read('prop ano 2 il hept ano');
  assert.deepEqual([pin.kind, pin.filled, pin.name, pin.matched.style], ['missingLocants', '4-(propan-2-il)heptano', '4-isopropilheptano', 'pin']);
  assert.equal(pin.message, `Casi: faltan los números. Se escribe «4-(propan-2-il)heptano» (${pin.matched.label}). `
    + 'El nombre que doy primero es «4-isopropilheptano».');
  assert.equal(canonicalKey(pin.molecule), keyOf('CCCC(C(C)C)CCC'));
}); // End of test 'mutations with removed locants: the verdict, the filled name and the molecule, or the names listed'

test('the ambiguous message lists at most three names, then counts the rest; «u» before an /o/ sound', () => {
  assert.equal(MAX_LISTED, 3);
  /**
   * A candidate with a text.
   *
   * @param {string|null} text - The text shown (null: a refused structure).
   * @returns {object} The candidate.
   */
  const c = (text) => ({ text, name: text, molecule: null });
  assert.equal(ambiguousMessage([c('A'), c('B')]), 'Faltan números: puede ser A o B.');
  assert.equal(ambiguousMessage([c('A'), c('B'), c('C')]), 'Faltan números: puede ser A, B o C.');
  assert.equal(ambiguousMessage([c('A'), c('B'), c('C'), c('D')]), 'Faltan números: puede ser A, B, C u otra molécula.');
  assert.equal(ambiguousMessage([c('A'), c('B'), c('C'), c('D'), c('E')]), 'Faltan números: puede ser A, B, C u otras 2 moléculas.');
  assert.equal(ambiguousMessage([c('hept-1-eno'), c('octano')]), 'Faltan números: puede ser hept-1-eno u octano.');
  assert.equal(ambiguousMessage([c('A'), c(null)]), 'Faltan números: puede ser A u otra molécula.', 'a refusal is counted, not named');
  assert.equal(ambiguousMessage([c(null), c(null)]), 'Faltan números: tu nombre puede describir 2 moléculas distintas.');
  const cases = [['8-metilnonano', 'u'], ['11-metildodecano', 'u'], ['octano', 'u'], ['otras', 'u'], ['hoja', 'u'],
    ['1-metil', 'o'], ['110', 'o'], ['18-metil', 'o'], ['etano', 'o'], ['but-2-eno', 'o']];
  for (const [word, expected] of cases) {
    assert.equal(orBefore(word), expected, word);
  }
  const four = read('di met il pent ano');
  assert.equal(four.message, 'Faltan números: puede ser 2,2-dimetilpentano, 2,3-dimetilpentano, 2,4-dimetilpentano u otra molécula.');
  assert.equal(four.candidates.length, 4);
  assert.equal(four.candidates[3].text, '3,3-dimetilpentano', 'every candidate is kept, beyond the three listed');
  const many = read('tri met il hept ano');
  assert.equal(many.candidates.length, 16);
  assert.match(many.message, /^Faltan números: puede ser 2,2,3-trimetilheptano, 2,2,4-trimetilheptano, 2,2,5-trimetilheptano u otras 13 moléculas\.$/);
}); // End of test 'the ambiguous message lists at most three names, then counts the rest; «u» before an /o/ sound'

test('old-style names with left-out locants: the filled text keeps the old style, the note goes with every verdict', () => {
  const ambiguous = read('met il 2 but eno');
  assert.equal(ambiguous.text, 'metil-2-buteno');
  assert.equal(ambiguous.kind, 'ambiguous', 'an old-style filled text never equals a name');
  assert.deepEqual(ambiguous.candidates.map((c) => c.text), ['pent-2-eno', '2-metilbut-2-eno']);
  assert.deepEqual(ambiguous.notes, ['Es la forma antigua de escribirlo; hoy se escribe «metilbut-2-eno».']);
  const one = read('met il 1 et eno');
  assert.deepEqual([one.text, one.kind, one.name], ['metil-1-eteno', 'otherName', 'propeno']);
  assert.equal(canonicalKey(one.molecule), keyOf('CC=C'));
  assert.deepEqual(one.notes, ['Es la forma antigua de escribirlo; hoy se escribe «metilet-1-eno».']);
  const incomplete = read('met il 2 but eno', { budget: { placements: 1 } });
  assert.equal(incomplete.kind, 'incomplete');
  assert.deepEqual(incomplete.notes, ambiguous.notes);
}); // End of test 'old-style names with left-out locants: the filled text keeps the old style, the note goes with every verdict'

/**
 * A clock that advances one millisecond each time it is read.
 *
 * @returns {() => number} The clock.
 */
function steppingClock() {
  let ms = 0;
  return () => {
    ms += 1;
    return ms;
  };
}

test('incomplete: the search budget ran out (injected budget and clock), never a claim of ambiguity or uniqueness', () => {
  const budgets = [{ budget: { placements: 1 } }, { budget: { namings: 1 } }, { now: steppingClock(), budget: { ms: 2 } }];
  for (const options of budgets) {
    const verdict = read('met il pent ano', options);
    assert.equal(verdict.kind, 'incomplete', JSON.stringify(options.budget));
    assert.equal(verdict.message, 'Faltan números: escribe en qué carbono va cada grupo.');
    assert.deepEqual([verdict.molecule, verdict.name, verdict.draw, verdict.errors, verdict.candidates], [null, null, false, [], []]);
  }
  // Whatever the full search would say: missingLocants, correct.
  assert.equal(read('met il prop ano', { budget: { placements: 2 } }).kind, 'incomplete');
  assert.equal(read('prop eno', { budget: { placements: 1 } }).kind, 'incomplete');
  assert.equal(read('met il prop ano', { budget: { placements: 3 } }).kind, 'missingLocants', 'three placements are enough');
  // The default budget: too many placements.
  assert.equal(read('deca met il dec ano').kind, 'incomplete');
  // Definite errors come first.
  assert.equal(read('7 met il prop eno', { budget: { placements: 0 } }).errors[0].code, 'LOCANT_RANGE');
}); // End of test 'incomplete: the search budget ran out (injected budget and clock)…'

test('invalid when the left-out locants fit nowhere: no room, crowded bonds, a chain past the caps', () => {
  const cases = [
    // [tile words, code, tile range, message]
    ['hepta met il et ano', 'VALENCE', [0, 3], 'No caben: pongas donde pongas lo que va sin número, algún carbono tendría más de 4 enlaces.'],
    ['prop tri eno', 'SAME_BOND', [1, 3], 'No caben tantos enlaces múltiples: la cadena de 3 carbonos solo tiene 2 enlaces entre carbonos.'],
    ['2 2 2 tri met il met il prop ano', 'VALENCE', [2, 3], 'El carbono 2 tendría 5 enlaces, y un carbono solo puede tener 4.'],
    ['triacont il et ano', 'TOO_BIG', [0, 4], 'La molécula es demasiado grande (máximo 60 carbonos, cadena de 30).'],
  ];
  for (const [words, code, range, message] of cases) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', words);
    assert.deepEqual(verdict.errors, [{ code, message, from: range[0], to: range[1] }], words);
    assert.equal(verdict.message, message);
    assert.deepEqual([verdict.molecule, verdict.draw, verdict.notes], [null, false, []]);
  }
  const fits = read('hexa met il et ano');
  assert.deepEqual([fits.kind, fits.name], ['otherName', '2,2,3,3-tetrametilbutano'], 'six methyls just fit');
}); // End of test 'invalid when the left-out locants fit nowhere: no room, crowded bonds, a chain past the caps'

test('refusals are kept apart: one refused structure is outOfScope; with several, the named ones are listed', () => {
  const refusal = { ok: false, error: { code: 'X', message: 'Aún no sé nombrar este tipo de compuestos.' } };
  const all = read('met il et ano', { namer: () => refusal });
  assert.equal(all.kind, 'outOfScope');
  assert.equal(all.message, 'Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: Aún no sé nombrar este tipo de compuestos.');
  assert.equal(canonicalKey(all.molecule), keyOf('CCC'));
  assert.deepEqual([all.draw, all.name, all.naming], [false, null, refusal]);
  /**
   * The engine, refusing one structure.
   *
   * @param {string} smiles - The structure refused.
   * @returns {(mol: object) => object} The namer.
   */
  const refusing = (smiles) => (mol) => (canonicalKey(mol) === keyOf(smiles) ? refusal : nameMolecule(mol));
  const filled = read('met il prop ano', { namer: refusing('CCCC') });
  assert.deepEqual([filled.kind, filled.filled], ['missingLocants', '2-metilpropano'], 'a refused structure never matches');
  const listed = read('et il prop ano', { namer: refusing('CCCCC') });
  assert.equal(listed.kind, 'ambiguous');
  assert.deepEqual(listed.candidates.map((c) => [c.text, c.name]), [['2-metilbutano', '2-metilbutano'], [null, null]]);
  assert.equal(canonicalKey(listed.candidates[1].molecule), keyOf('CCCCC'));
  assert.equal(listed.message, 'Faltan números: puede ser 2-metilbutano u otra molécula.');
}); // End of test 'refusals are kept apart: one refused structure is outOfScope; with several, the named ones are listed'

test('the naming cache can be shared between readName() calls', () => {
  const cache = new Map();
  let calls = 0;
  /**
   * The engine, counting its calls.
   *
   * @param {object} mol - A molecule.
   * @returns {object} nameMolecule()'s result.
   */
  const namer = (mol) => {
    calls += 1;
    return nameMolecule(mol);
  };
  const first = read('met il pent ano', { namer, cache });
  assert.equal(calls, 3, 'hexano, 2-metilpentano, 3-metilpentano: each named once');
  const second = read('met il pent ano', { namer, cache });
  assert.equal(calls, 3);
  assert.deepEqual(second.candidates.map((c) => c.text), first.candidates.map((c) => c.text));
  read('2 met il pent ano', { namer, cache });
  assert.equal(calls, 3, 'a fully located name of a structure already named');
}); // End of test 'the naming cache can be shared between readName() calls'

/**
 * Every atom and bond id a naming result cites: its parent, the parts of
 * its name and of every alternative, and the trace candidates.
 *
 * @param {object} naming - A successful nameMolecule() result.
 * @returns {{atoms: Set<number>, bonds: Set<number>}} The ids.
 */
function namingIds(naming) {
  const atoms = new Set(naming.parent.atoms);
  const bonds = new Set(naming.parent.bonds);
  const parts = [...naming.parts, ...naming.alternatives.flatMap((alt) => alt.parts)];
  const candidates = naming.trace.flatMap((step) => [...step.candidatesBefore, ...step.survivors]);
  for (const item of [...parts, ...candidates]) {
    (item.atoms || []).forEach((id) => atoms.add(id));
    (item.bonds || []).forEach((id) => bonds.add(id));
  }
  return { atoms, bonds };
} // End of function namingIds()

/**
 * Asserts that a drawn verdict is one graph: every id its naming cites is
 * an atom or bond of its molecule, the naming is what the engine gives that
 * molecule, and the student's reading is a path of it with each prefix on
 * the carbon of its locant.
 *
 * @param {object} verdict - A verdict with a molecule.
 * @param {string} label - Assertion label.
 * @returns {void}
 */
function assertOneGraph(verdict, label) {
  const { molecule, naming, studentParent, prefixAtoms } = verdict;
  const ids = namingIds(naming);
  assert.ok(ids.atoms.size > 0 && ids.bonds.size > 0, label);
  ids.atoms.forEach((id) => assert.ok(molecule.atoms.has(id), `${label}: atom ${id}`));
  ids.bonds.forEach((id) => assert.ok(molecule.bonds.has(id), `${label}: bond ${id}`));
  assert.deepEqual(naming, nameMolecule(molecule), `${label}: the naming of the molecule returned`);
  /**
   * The atoms a bond of the molecule joins, sorted.
   *
   * @param {number} id - Bond id.
   * @returns {number[]} Its two atoms.
   */
  const ends = (id) => [molecule.bonds.get(id).a, molecule.bonds.get(id).b].sort((p, q) => p - q);
  studentParent.bonds.forEach((id, i) => {
    assert.deepEqual(ends(id), [studentParent.atoms[i], studentParent.atoms[i + 1]].sort((p, q) => p - q), `${label}: parent bond ${i + 1}`);
  });
  for (const occurrence of prefixAtoms) {
    assert.equal(occurrence.parentAtom, studentParent.atoms[occurrence.locant - 1], `${label}: prefix at ${occurrence.locant}`);
    assert.deepEqual(ends(occurrence.bond), [occurrence.parentAtom, occurrence.attachment].sort((p, q) => p - q), label);
    occurrence.atoms.forEach((id) => assert.ok(molecule.atoms.has(id), `${label}: prefix atom ${id}`));
    occurrence.bonds.forEach((id) => assert.ok(molecule.bonds.has(id), `${label}: prefix bond ${id}`));
  }
} // End of function assertOneGraph()

test('the drawn molecule is the graph the engine named, with the student\'s reading of the drawn placement on it', () => {
  // The filled placement is not the first found for its structure (`2-metilbut-3-ino` comes before `3-metilbut-1-ino`).
  const cases = [
    // [tile words, filled name, bond orders of the student's parent]
    ['met il but ino', '3-metilbut-1-ino', [3, 1, 1]],
    ['di met il but ino', '3,3-dimetilbut-1-ino', [3, 1, 1]],
    ['tri met il but eno', '2,3,3-trimetilbut-1-eno', [2, 1, 1]],
  ];
  for (const [words, filled, orders] of cases) {
    const shared = new Map();
    read(words, { cache: shared });
    for (const [label, verdict] of [['fresh', read(words)], ['shared cache', read(words, { cache: shared })]]) {
      assert.deepEqual([verdict.kind, verdict.filled], ['missingLocants', filled], `${words} (${label})`);
      assertOneGraph(verdict, `${words} (${label})`);
      // The filled name is the engine's, numbered one way only: the student's parent is the engine's.
      assert.deepEqual(verdict.studentParent, verdict.naming.parent, `${words} (${label})`);
      assert.deepEqual(verdict.studentParent.bonds.map((id) => verdict.molecule.bonds.get(id).order), orders, `${words} (${label})`);
    }
  } // End of the loop over the cases
  // A shared cache named the structure from another name's build: a fully located name, then left-out locants.
  const sequences = [
    ['4 met il pent ano', '2 met il pent ano', 'correct'],
    ['2 met il but 3 ino', '3 met il but 1 ino', 'correct'],
    ['2 met il but 3 ino', 'met il but ino', 'missingLocants'],
    ['2 2 di met il but 3 ino', 'di met il but ino', 'missingLocants'],
  ];
  for (const [first, then, kind] of sequences) {
    const cache = new Map();
    read(first, { cache });
    const verdict = read(then, { cache });
    assert.equal(verdict.kind, kind, `${first} → ${then}`);
    assertOneGraph(verdict, `${first} → ${then}`);
    assert.deepEqual(verdict.studentParent, verdict.naming.parent, `${first} → ${then}`);
  }
  // The verdict's molecule is its own copy: the cache's graph is never handed out.
  const cache = new Map();
  const one = read('met il but ino', { cache });
  const two = read('met il but ino', { cache });
  assert.notEqual(one.molecule, two.molecule);
  assert.deepEqual(one.molecule, two.molecule);
}); // End of test 'the drawn molecule is the graph the engine named, with the student's reading of the drawn placement on it'

/**
 * A clock that reads 0 until `still` readings have been taken, then 100.
 *
 * @param {number} still - Readings at 0.
 * @returns {{now: () => number, readings: () => number}} The clock and how often it was read.
 */
function jumpingClock(still) {
  let count = 0;
  return {
    now: () => {
      count += 1;
      return count <= still ? 0 : 100;
    },
    readings: () => count,
  };
}

test('the time limit holds after the last naming and through steps 5–8: over it, incomplete', () => {
  // The namer itself spends the time (Codex's reproduction): the search ends as budget, the verdict incomplete.
  let ms = 0;
  /**
   * The engine, taking 100 ms on the injected clock.
   *
   * @param {object} mol - A molecule.
   * @returns {object} nameMolecule()'s result.
   */
  const slow = (mol) => {
    ms = 100;
    return nameMolecule(mol);
  };
  const options = { now: () => ms, namer: slow, budget: { ms: 5 } };
  assert.equal(read('met il et ano', options).kind, 'incomplete');
  ms = 0;
  assert.equal(searchStructures(interpret(parse(seq('met il et ano')).tree), options).status, 'budget');
  ms = 0;
  assert.equal(read('met il et ano', { ...options, budget: { ms: 100 } }).kind, 'otherName', 'exactly on time');
  // The clock passes the deadline right after the search's own readings, during the filled-text comparisons and the
  // verdict selection: whatever the verdict would have been, it is incomplete.
  const cases = [
    ['met il prop ano', 'missingLocants'], ['met il but ino', 'missingLocants'], ['met il et ano', 'otherName'],
    ['met il pent ano', 'ambiguous'], ['prop eno', 'correct'],
  ];
  for (const [words, kind] of cases) {
    const searching = jumpingClock(Infinity);
    searchStructures(interpret(parse(seq(words)).tree), { namer: nameMolecule, now: searching.now, budget: { ms: 5 } });
    const clock = jumpingClock(searching.readings());
    assert.equal(read(words, { now: clock.now, budget: { ms: 5 } }).kind, 'incomplete', words);
    assert.ok(clock.readings() > searching.readings(), `${words}: steps 5–8 read the clock`);
    assert.equal(read(words, { now: jumpingClock(Infinity).now, budget: { ms: 5 } }).kind, kind, `${words}: in time`);
  }
}); // End of test 'the time limit holds after the last naming and through steps 5–8: over it, incomplete'

test('old-style names are built and drawn, with a note on the modern writing', () => {
  const cases = [
    ['2 but eno', '2-buteno', 'but-2-eno', 'but-2-eno', 'CC=CC'],
    ['1 3 but di eno', '1,3-butadieno', 'buta-1,3-dieno', 'buta-1,3-dieno', 'C=CC=C'],
    ['2 met il 2 but eno', '2-metil-2-buteno', '2-metilbut-2-eno', '2-metilbut-2-eno', 'CC(C)=CC'],
    ['3 but eno', '3-buteno', 'but-3-eno', 'but-1-eno', 'C=CCC'],
  ];
  for (const [words, text, modern, name, smiles] of cases) {
    const verdict = read(words);
    assert.equal(verdict.text, text);
    assert.equal(verdict.kind, 'otherName', text);
    assert.equal(verdict.name, name);
    assert.equal(verdict.draw, true);
    assert.equal(canonicalKey(verdict.molecule), keyOf(smiles), text);
    assert.deepEqual(verdict.notes, [`Es la forma antigua de escribirlo; hoy se escribe «${modern}».`]);
  }
  assert.deepEqual(read('but 2 eno').notes, []);
}); // End of test 'old-style names are built and drawn, with a note on the modern writing'

test('partial and ill-formed names are invalid with the parser\'s errors and tile ranges', () => {
  const cases = [
    ['', 'EMPTY'],
    ['2 met il', 'ENDS_WITH_BRANCH'],
    ['2 3 di', 'NO_PARENT'],
    ['but', 'ROOT_END'],
    ['START 2 met il prop il', 'BRANCH_OPEN'],
    ['2 3 met il pent ano', 'LOCANT_COUNT'],
    ['1 2 but eno ino', 'LEGACY'],
    ['hex ano 2', 'TILE_ORDER'],
  ];
  for (const [words, code] of cases) {
    const ids = seq(words);
    const verdict = readName(ids);
    const { errors } = parse(ids);
    assert.equal(verdict.kind, 'invalid', words);
    assert.equal(verdict.errors[0].code, code, words);
    assert.deepEqual(verdict.errors, errors, `${words}: the parser's errors, with their tile ranges`);
    assert.equal(verdict.message, errors[0].message);
    assert.equal(verdict.molecule, null);
    assert.equal(verdict.draw, false);
  } // End of the loop over the partial names
  assert.equal(read('2 met il').text, '2-metil', 'an unfinished name still assembles');
}); // End of test 'partial and ill-formed names are invalid with the parser's errors and tile ranges'

test('outOfScope: an engine refusal of the built molecule (injected namer)', () => {
  // The engine names every valid open-chain hydrocarbon within its caps (naming/index.js header; the caps are
  // checked before naming as TOO_BIG), so the refusal is injected.
  const refusal = { ok: false, error: { code: 'HETEROATOM', message: 'Aún no sé nombrar este tipo de compuestos.' } };
  const verdict = read('2 met il pent ano', { namer: () => refusal });
  assert.equal(verdict.kind, 'outOfScope');
  assert.equal(verdict.message, 'Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: '
    + 'Aún no sé nombrar este tipo de compuestos.');
  assert.equal(verdict.draw, false, 'no drawing (design.md §15.3)');
  assert.equal(canonicalKey(verdict.molecule), keyOf('CC(C)CCC'));
  assert.equal(verdict.naming, refusal);
  assert.equal(verdict.name, null);
}); // End of test 'outOfScope: an engine refusal of the built molecule (injected namer)'

test('correct names announce a traditional alternative (hook for later families, injected namer)', () => {
  const named = (alternatives) => () => ({ ok: true, name: 'propano', alternatives });
  const traditional = { style: 'traditional', label: 'nombre tradicional', name: 'X', parts: [] };
  const pin = { style: 'pin', label: 'nombre preferido por la IUPAC (2013)', name: 'Y', parts: [] };
  assert.equal(read('prop ano', { namer: named([pin, traditional]) }).message,
    '¡Correcto! También se llama «X» (nombre tradicional).');
  assert.equal(read('prop ano', { namer: named([pin]) }).message, '¡Correcto!');
  const alternative = read('prop ano', { namer: () => ({ ok: true, name: 'Z', alternatives: [pin, { ...traditional, name: 'propano' }] }) });
  assert.equal(alternative.kind, 'alternative');
  assert.equal(alternative.message, '¡Correcto! «propano» es una forma válida (nombre tradicional). El nombre que doy primero es «Z».');
}); // End of test 'correct names announce a traditional alternative (hook for later families, injected namer)'

test('names are compared in NFC, with the name and every alternative', () => {
  // Hydrocarbon tiles have no accents yet, so the NFC rule is checked on sameName(), which readName() uses.
  assert.ok(sameName('ácido etanoico', 'ácido etanoico'));
  assert.ok(sameName('éter'.normalize('NFD'), 'éter'));
  assert.ok(!sameName('etano', 'eteno'));
  assert.equal(read('hex ano').text, 'hexano'.normalize('NFC'));
  // Every alternative is compared, not only the first.
  const many = read('4 prop ano 2 il hept ano');
  assert.equal(many.kind, 'alternative');
  assert.equal(many.matched.style, 'pin');
  assert.equal(read('4 START 1 met il et il END hept ano').matched.style, 'substituted');
}); // End of test 'names are compared in NFC, with the name and every alternative'

test('every verdict has the documented shape', () => {
  const fields = ['kind', 'message', 'text', 'spans', 'name', 'alternatives', 'matched', 'filled', 'candidates', 'molecule',
    'studentParent', 'prefixAtoms', 'suffixAtoms', 'naming', 'errors', 'notes', 'draw']; // `suffixAtoms` since R-5a2.
  const verdicts = [
    read('hex ano'), read('4 prop ano 2 il hept ano'), read('met il prop ano'), read('4 met il pent ano'), read('met il pent ano'),
    read('met il pent ano', { budget: { placements: 1 } }), read('7 met il pent ano'), read('2 met il'),
    read('hex ano', { namer: () => ({ ok: false, error: { code: 'X', message: 'm' } }) }),
  ];
  assert.deepEqual([...new Set(verdicts.map((v) => v.kind))].sort(), [...VERDICT_KINDS].sort());
  for (const verdict of verdicts) {
    // An otherName verdict also carries its diagnosis (diagnose.js, R-3); no other verdict has the field.
    const expected = verdict.kind === 'otherName' ? [...fields, 'diagnosis'] : fields;
    assert.deepEqual(Object.keys(verdict).sort(), [...expected].sort(), verdict.kind);
    assert.equal(typeof verdict.message, 'string');
    assert.ok(verdict.message.length > 0);
    assert.ok(Array.isArray(verdict.spans) && verdict.spans.length > 0);
    assert.equal(verdict.molecule === null, verdict.studentParent === null);
    for (const error of verdict.errors) {
      assert.deepEqual(Object.keys(error).sort(), ['code', 'from', 'message', 'to']);
    }
    // One structure drawn (outOfScope: built, not drawn); none for ambiguous, incomplete, invalid.
    assert.equal(verdict.draw, ['correct', 'alternative', 'missingLocants', 'otherName'].includes(verdict.kind), verdict.kind);
    assert.equal(verdict.molecule !== null, verdict.draw || verdict.kind === 'outOfScope', verdict.kind);
    assert.equal(verdict.filled !== null, verdict.kind === 'missingLocants', verdict.kind);
    assert.equal(verdict.candidates.length > 1, verdict.kind === 'ambiguous', verdict.kind);
    for (const candidate of verdict.candidates) {
      assert.deepEqual(Object.keys(candidate).sort(), ['molecule', 'name', 'text']);
    }
  } // End of the loop over the verdicts
}); // End of test 'every verdict has the documented shape'

/** Representative names for the time budget: every verdict of the search, the largest worked cases, a compound branch. */
const TIMED = ['met il prop ano', 'met il prop eno', 'but eno', 'met il et ano', 'di met il pent ano', 'tri met il hept ano',
  'START met il but il END non ano', '5 5 bis START 2 2 di met il prop il END non ano', 'tetra met il but ano', 'hex 1 eno ino',
  'prop ano 2 il hept ano', 'met il 2 but eno', 'hepta met il et ano'];

/** Time budget of one representative readName() call, in milliseconds (design.md §15.7: generous, phones are slower). */
const PER_NAME_BUDGET_MS = 250;

test('time budget: each representative readName() well within budget; the search\'s own clock bounds the worst names', () => {
  TIMED.forEach((words) => read(words)); // Warm-up.
  for (const words of TIMED) {
    const start = performance.now();
    read(words);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
  }
  for (const words of ['deca met il dec ano', 'tetra met il oct di eno', 'di met il et il hex di eno']) {
    const start = performance.now();
    const verdict = read(words);
    const elapsed = performance.now() - start;
    assert.equal(verdict.kind, 'incomplete', words);
    assert.ok(elapsed < SEARCH_BUDGET.ms + PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
  }
}); // End of test 'time budget: each representative readName() well within budget…'
