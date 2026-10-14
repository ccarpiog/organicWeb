/**
 * @file Unit tests for readName() of «¿Cómo se dibuja?»
 * (src/reverse/index.js, design.md §15.3, §15.5.3, §15.7, phase R-1b):
 * the fixture round trip with an independent graph comparison, mutations
 * of correct names with the molecule they describe, the verdict shape,
 * old-style names, the outOfScope and traditional-name hooks (injected
 * namer), partial names, NFC comparison and a time budget.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName, sameName, VERDICT_KINDS } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { directPlacement } from '../../src/reverse/build.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { canonicalKey } from '../../src/model/graph.js';
import { seq, readFixtures, isOpenChainHydrocarbon } from './reverse-words.js';

/** Open-chain hydrocarbon fixture rows (as in reverse-tokenize.test.js). */
const EXPECTED_ROWS = 176;

/** Their names and alternatives read back as correct / alternative. */
const EXPECTED_COVERED = 201;

/** Names left out of the round trip: left-out locants with several possible values (R-1c). */
const EXPECTED_LEFT_OUT = ['propeno', 'propino', 'propadieno'];

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
 * @returns {boolean} True when R-1c's search would be needed.
 */
function needsSearch(ids) {
  return directPlacement(interpret(parse(ids).tree)) === null;
}

test('fixture round trip: every fully located open-chain hydrocarbon name and alternative, graph compared with the SMILES', async () => {
  const rows = (await readFixtures()).filter((row) => isOpenChainHydrocarbon(row.smiles));
  let covered = 0;
  let elapsed = 0;
  const leftOut = [];
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      if (needsSearch(ids)) {
        leftOut.push(name);
        assert.equal(readName(ids).kind, 'incomplete', name);
        continue;
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
  assert.deepEqual(leftOut, EXPECTED_LEFT_OUT);
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip: every fully located open-chain hydrocarbon name and alternative…'

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

test('left-out locants with several possible values give the incomplete stand-in (R-1c searches them)', () => {
  for (const words of ['met il pent ano', 'hex eno', 'met il et ano', 'prop eno', 'di met il but ano', '2 prop eno il hex ano']) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'incomplete', words);
    assert.equal(verdict.message, 'Faltan números: escribe en qué carbono va cada grupo.');
    assert.equal(verdict.molecule, null);
    assert.equal(verdict.draw, false);
    assert.deepEqual(verdict.errors, []);
  }
  // Definite errors of the supplied locants come first.
  assert.equal(read('7 met il prop eno').errors[0].code, 'LOCANT_RANGE');
}); // End of test 'left-out locants with several possible values give the incomplete stand-in (R-1c searches them)'

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
  const fields = ['kind', 'message', 'text', 'spans', 'name', 'alternatives', 'matched', 'molecule', 'studentParent', 'prefixAtoms',
    'naming', 'errors', 'notes', 'draw'];
  const verdicts = [
    read('hex ano'), read('4 prop ano 2 il hept ano'), read('4 met il pent ano'), read('met il pent ano'), read('7 met il pent ano'),
    read('2 met il'), read('hex ano', { namer: () => ({ ok: false, error: { code: 'X', message: 'm' } }) }),
  ];
  assert.deepEqual([...new Set(verdicts.map((v) => v.kind))].sort(), [...VERDICT_KINDS].sort());
  for (const verdict of verdicts) {
    assert.deepEqual(Object.keys(verdict).sort(), [...fields].sort(), verdict.kind);
    assert.equal(typeof verdict.message, 'string');
    assert.ok(verdict.message.length > 0);
    assert.ok(Array.isArray(verdict.spans) && verdict.spans.length > 0);
    assert.equal(verdict.molecule === null, verdict.studentParent === null);
    for (const error of verdict.errors) {
      assert.deepEqual(Object.keys(error).sort(), ['code', 'from', 'message', 'to']);
    }
  } // End of the loop over the verdicts
}); // End of test 'every verdict has the documented shape'
