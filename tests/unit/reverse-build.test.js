/**
 * @file Unit tests for the interpreter and the builder of «¿Cómo se
 * dibuja?» (src/reverse/interpret.js, src/reverse/build.js; design.md
 * §15.4, §15.5.3, §15.6, phase R-1b): the NameSpec with its typed slots
 * (supplied, implicit, left out; old-style locants), the molecule built
 * from it, and one test per structural error code with its tile range —
 * on the parent and inside branches.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, checkSpec, specCarbons, attachmentOrder, BUILD_ERROR_CODES } from '../../src/reverse/build.js';
import { slotGroups } from '../../src/reverse/search.js';
import { readName } from '../../src/reverse/index.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { canonicalKey } from '../../src/model/graph.js';
import { MAX_CARBONS, MESSAGES } from '../../src/model/validate.js';
import { seq } from './reverse-words.js';

/**
 * The NameSpec of tile words.
 *
 * @param {string} words - Space-separated tile words (reverse-words.js).
 * @returns {object} The NameSpec.
 */
function specOf(words) {
  const { tree, errors } = parse(seq(words));
  assert.deepEqual(errors, [], words);
  return interpret(tree);
}

/**
 * The structural error readName() reports for tile words.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {{code: string, message: string, from: number, to: number}} The one error.
 */
function errorOf(words) {
  const verdict = readName(seq(words));
  assert.equal(verdict.kind, 'invalid', `${words}: ${verdict.message}`);
  assert.equal(verdict.errors.length, 1, words);
  assert.equal(verdict.message, verdict.errors[0].message);
  return verdict.errors[0];
}

/**
 * Asserts the structural error of tile words.
 *
 * @param {string} words - Space-separated tile words.
 * @param {string} code - Expected code.
 * @param {[number, number]} range - Expected tile range `[from, to)`.
 * @param {string} message - Expected message.
 * @returns {void}
 */
function assertError(words, code, range, message) {
  const error = errorOf(words);
  assert.deepEqual([error.code, error.from, error.to], [code, ...range], words);
  assert.equal(error.message, message, words);
}

test('interpret: supplied and implicit slots, multipliers and the NameSpec shape of design.md §15.4', () => {
  // 0:2 1:3 2:di 3:met 4:il 5:pent 6:ano
  const spec = specOf('2 3 di met il pent ano');
  assert.deepEqual(Object.keys(spec).sort(),
    ['classWord', 'ester', 'leftOut', 'oldStyle', 'parent', 'prefixes', 'suffix', 'tiles', 'traditional']);
  assert.deepEqual([spec.suffix, spec.classWord, spec.ester, spec.traditional, spec.oldStyle], [null, null, null, null, false]);
  assert.deepEqual(spec.tiles, [0, 7]);
  assert.deepEqual(spec.parent, { kind: 'chain', length: 5, double: [], triple: [], tiles: [5, 7] });
  const [prefix] = spec.prefixes;
  assert.deepEqual(prefix.multiplier, { count: 2, compound: false });
  assert.deepEqual(prefix.tiles, [0, 5]);
  assert.deepEqual(prefix.slots, [
    { kind: 'supplied', value: 2, role: 'carbon', domain: [1, 5], tiles: [0, 1] },
    { kind: 'supplied', value: 3, role: 'carbon', domain: [1, 5], tiles: [1, 2] },
  ]);
  const { substituent } = prefix;
  assert.equal(substituent.kind, 'chain');
  assert.equal(substituent.length, 1);
  assert.equal(substituent.compound, false);
  assert.deepEqual(substituent.freeValence, { slot: { kind: 'implicit', value: 1, role: 'carbon', domain: [1, 1], tiles: [4, 5] }, order: 1 });
  assert.deepEqual(spec.leftOut, []);
}); // End of test 'interpret: supplied and implicit slots, multipliers and the NameSpec shape of design.md §15.4'

test('interpret: multiple bonds, cited free valence, iliden and compound branches', () => {
  // 0:hex 1:1 2:eno 3:3 4:5 5:di 6:ino
  const parent = specOf('hex 1 eno 3 5 di ino').parent;
  assert.deepEqual(parent.double.map((s) => [s.value, s.role, s.domain, s.tiles]), [[1, 'bond', [1, 5], [1, 2]]]);
  assert.deepEqual(parent.triple.map((s) => s.value), [3, 5]);
  // 0:4 1:prop 2:ano 3:2 4:il 5:hept 6:ano
  const cited = specOf('4 prop ano 2 il hept ano').prefixes[0].substituent.freeValence;
  assert.deepEqual([cited.slot.kind, cited.slot.value, cited.slot.tiles, cited.order], ['supplied', 2, [3, 4], 1]);
  assert.equal(specOf('5 met iliden non ano').prefixes[0].substituent.freeValence.order, 2);
  // 0:5 1:5 2:bis 3:START 4:2 5:2 6:di 7:met 8:il 9:prop 10:il 11:END 12:non 13:ano
  const compound = specOf('5 5 bis START 2 2 di met il prop il END non ano').prefixes[0];
  assert.deepEqual(compound.multiplier, { count: 2, compound: true });
  assert.equal(compound.substituent.compound, true);
  assert.equal(compound.substituent.length, 3);
  assert.deepEqual(compound.substituent.tiles, [3, 12]);
  assert.deepEqual(compound.substituent.prefixes[0].slots.map((s) => [s.value, s.domain]), [[2, [1, 3]], [2, [1, 3]]]);
  const retained = specOf('5 5 di tert-butil non ano').prefixes[0].substituent;
  assert.deepEqual([retained.kind, retained.retained, retained.length, retained.freeValence], ['retained', 'tert-butyl', null, null]);
  assert.deepEqual(retained.word, { text: 'tert-butil', tiles: [3, 4] });
}); // End of test 'interpret: multiple bonds, cited free valence, iliden and compound branches'

test('interpret: left-out slots with their role, domain and tiles, in tile order', () => {
  // 0:di 1:met 2:il 3:pent 4:eno
  const spec = specOf('di met il pent eno');
  assert.deepEqual(spec.leftOut.map((s) => [s.kind, s.role, s.domain, s.tiles]), [
    ['leftOut', 'carbon', [1, 5], [0, 3]],
    ['leftOut', 'carbon', [1, 5], [0, 3]],
    ['leftOut', 'bond', [1, 4], [4, 5]],
  ]);
  assert.equal(spec.leftOut[0], spec.prefixes[0].slots[0], 'the same slot objects');
  assert.equal(spec.leftOut[2], spec.parent.double[0]);
  assert.deepEqual(slotGroups(spec).map((g) => [g.role, g.indices, g.tiles]), [['carbon', [0, 1], [0, 3]], ['bond', [2], [4, 5]]],
    'the two methyls are identical occurrences (search.js)');
  // 0:2 1:et 2:eno 3:il 4:prop 5:ano: the branch's double bond has one possible place.
  const etenyl = specOf('2 et eno il prop ano');
  assert.deepEqual(etenyl.leftOut.map((s) => [s.role, s.domain, s.tiles]), [['bond', [1, 1], [2, 3]]]);
  assert.deepEqual(specOf('hex ano').leftOut, []);
  assert.deepEqual(specOf('met eno').leftOut[0].domain, [1, 0], 'no bond on a one-carbon chain');
  assert.deepEqual([attachmentOrder(specOf('met il pent ano').prefixes[0].substituent),
    attachmentOrder(specOf('met iliden pent ano').prefixes[0].substituent),
    attachmentOrder(specOf('isopropiliden pent ano').prefixes[0].substituent)], [1, 2, 2]);
}); // End of test 'interpret: left-out slots with their role, domain and tiles, in tile order'

test('interpret: old-style locants belong to the one segment without locants', () => {
  // 0:2 1:but 2:eno
  const spec = specOf('2 but eno');
  assert.equal(spec.oldStyle, true);
  assert.deepEqual(spec.parent.double, [{ kind: 'supplied', value: 2, role: 'bond', domain: [1, 3], tiles: [0, 1] }]);
  // 0:1 1:3 2:but 3:di 4:eno
  assert.deepEqual(specOf('1 3 but di eno').parent.double.map((s) => [s.value, s.tiles]), [[1, [0, 1]], [3, [1, 2]]]);
  // 0:hex 1:1 2:eno 3:ino, old style 3 for the ino: 0:3 1:hex 2:1 3:eno 4:ino
  const mixed = specOf('3 hex 1 eno ino').parent;
  assert.deepEqual([mixed.double[0].value, mixed.triple[0].value, mixed.triple[0].tiles], [1, 3, [0, 1]]);
  assert.equal(specOf('but 2 eno').oldStyle, false);
}); // End of test 'interpret: old-style locants belong to the one segment without locants'

test('interpret refuses a tree with syntax errors', () => {
  assert.throws(() => interpret(parse(seq('2 met il')).tree), /incomplete/);
  assert.throws(() => interpret(parse([]).tree), /incomplete/);
});

test('build: the molecule of a NameSpec and a placement, numbered as the student numbered it', () => {
  const cases = [
    ['5 5 bis START 2 2 di met il prop il END non ano', [], 'CCCCC(CC(C)(C)C)(CC(C)(C)C)CCCC'],
    ['8 START 2 prop ano 2 iliden hex il END pentadec ano', [], 'CCCCCCCC(CC(=C(C)C)CCCC)CCCCCCC'],
    ['5 5 di tert-butil non ano', [], 'CCCCC(C(C)(C)C)(C(C)(C)C)CCCC'],
    ['5 isopropiliden non ano', [], 'CCCCC(=C(C)C)CCCC'],
    ['hex 1 eno 3 5 di ino', [], 'C=CC#CC#C'],
    ['met il pent ano', [2], 'CC(C)CCC'], // a placement for the left-out slot, as R-1c's search will give
    ['di met il pent eno', [2, 3, 1], 'C=C(C)C(C)CC'],
  ];
  for (const [words, placement, smiles] of cases) {
    const result = build(specOf(words), placement);
    assert.ok(result.ok, `${words}: ${result.error && result.error.message}`);
    assert.equal(canonicalKey(result.molecule), canonicalKey(parseSmiles(smiles)), words);
    for (const atom of result.molecule.atoms.values()) {
      assert.equal(atom.element, 'C');
    }
  } // End of the loop over the cases
  const { molecule, studentParent, prefixAtoms } = build(specOf('5 5 bis START 2 2 di met il prop il END non ano'));
  assert.equal(studentParent.atoms.length, 9);
  assert.deepEqual(prefixAtoms.map((p) => [p.prefix, p.occurrence, p.locant, p.atoms.length, p.bonds.length]), [[0, 0, 5, 5, 4], [0, 1, 5, 5, 4]]);
  assert.ok(prefixAtoms.every((p) => p.parentAtom === studentParent.atoms[4] && p.atoms.includes(p.attachment)));
  assert.equal(molecule.atoms.size, 19);
  assert.throws(() => build(specOf('met il pent ano')), /left-out slots/);
}); // End of test 'build: the molecule of a NameSpec and a placement, numbered as the student numbered it'

test('LOCANT_RANGE: a locant beyond its chain — the parent, a branch\'s own chain, a free valence, a bond', () => {
  assertError('7 met il pent ano', 'LOCANT_RANGE', [0, 1], 'La cadena de 5 carbonos va del 1 al 5: no hay carbono 7.');
  assertError('hex 8 eno', 'LOCANT_RANGE', [1, 2], 'La cadena de 6 carbonos va del 1 al 6: no hay carbono 8.');
  assertError('2 met il met ano', 'LOCANT_RANGE', [0, 1], 'La cadena de 1 carbono solo tiene el carbono 1: no hay carbono 2.');
  assertError('3 START 5 met il but il END hex ano', 'LOCANT_RANGE', [2, 3], 'La rama de 4 carbonos va del 1 al 4: no hay carbono 5.');
  assertError('3 prop ano 4 il hex ano', 'LOCANT_RANGE', [3, 4], 'La rama de 3 carbonos va del 1 al 3: no hay carbono 4.');
});

test('BOND_RANGE: a multiple bond from the last carbon of its chain', () => {
  assertError('hex 6 eno', 'BOND_RANGE', [1, 2], 'El enlace doble del carbono 6 iría al carbono 7, y la cadena solo tiene 6 carbonos.');
  assertError('but 1 eno 4 ino', 'BOND_RANGE', [3, 4], 'El enlace triple del carbono 4 iría al carbono 5, y la cadena solo tiene 4 carbonos.');
  assertError('3 prop 3 eno 1 il hex ano', 'BOND_RANGE', [2, 3],
    'El enlace doble del carbono 3 iría al carbono 4, y la rama solo tiene 3 carbonos.');
  assertError('met eno', 'BOND_RANGE', [1, 2], 'El enlace doble del carbono 1 iría al carbono 2, y la cadena solo tiene 1 carbono.');
  assertError('2 met eno il prop ano', 'BOND_RANGE', [2, 3],
    'El enlace doble del carbono 1 iría al carbono 2, y la rama solo tiene 1 carbono.');
}); // End of test 'BOND_RANGE: a multiple bond from the last carbon of its chain'

test('SAME_BOND: two multiple bonds on one bond, the tiles from the first to the second', () => {
  assertError('hex 2 eno 2 ino', 'SAME_BOND', [1, 4], 'Hay dos enlaces múltiples en el mismo sitio (2).');
  assertError('but 2 2 di eno', 'SAME_BOND', [1, 3], 'Hay dos enlaces múltiples en el mismo sitio (2).');
  // Left out: more multiple bonds than bonds (search.js), whatever the placement.
  assertError('et di eno', 'SAME_BOND', [1, 3], 'No caben tantos enlaces múltiples: la cadena de 2 carbonos solo tiene 1 enlace entre carbonos.');
  assertError('3 START hex 2 eno 2 ino 1 il END hept ano', 'SAME_BOND', [3, 6], 'Hay dos enlaces múltiples en el mismo sitio (2).');
});

test('VALENCE: the tiles of the bond that takes a carbon over four, on the parent and in a branch (iliden counts two)', () => {
  assertError('2 2 2 tri met il but ano', 'VALENCE', [2, 3], 'El carbono 2 tendría 5 enlaces, y un carbono solo puede tener 4.');
  assertError('prop 1 2 di ino', 'VALENCE', [2, 3], 'El carbono 2 tendría 6 enlaces, y un carbono solo puede tener 4.');
  assertError('2 met iliden prop 1 eno', 'VALENCE', [4, 5], 'El carbono 2 tendría 5 enlaces, y un carbono solo puede tener 4.');
  assertError('2 2 di met iliden prop ano', 'VALENCE', [1, 2], 'El carbono 2 tendría 6 enlaces, y un carbono solo puede tener 4.');
  assertError('2 et 1 ino iliden prop ano', 'VALENCE', [4, 5],
    'El carbono 1 de la rama tendría 5 enlaces, y un carbono solo puede tener 4.');
  assertError('3 START 2 2 2 tri met il prop il END hex ano', 'VALENCE', [4, 5],
    'El carbono 2 de la rama tendría 5 enlaces, y un carbono solo puede tener 4.');
  assert.equal(readName(seq('2 2 di met il prop ano')).kind, 'correct', 'four bonds are fine');
}); // End of test 'VALENCE: the tiles of the bond that takes a carbon over four, on the parent and in a branch…'

test('TOO_BIG: the engine\'s caps, checked before naming (carbons on the NameSpec, then the chain)', () => {
  // 0:2 1:3 2:di 3:triacont 4:il 5:triacont 6:ano: 90 carbons, never built.
  const spec = specOf('2 3 di triacont il triacont ano');
  assert.equal(specCarbons(spec), 90);
  assert.ok(specCarbons(spec) > MAX_CARBONS);
  assert.equal(checkSpec(spec).code, 'TOO_BIG');
  assertError('2 3 di triacont il triacont ano', 'TOO_BIG', [0, 7], MESSAGES.TOO_BIG);
  // 60 carbons, but a chain of 59.
  assertError('2 triacont il triacont ano', 'TOO_BIG', [0, 5], MESSAGES.TOO_BIG);
  assert.equal(readName(seq('15 15 di hept il triacont ano')).kind, 'correct', '44 carbons, a chain of 30: within the caps');
}); // End of test 'TOO_BIG: the engine's caps, checked before naming (carbons on the NameSpec, then the chain)'

test('a retained word cannot take prefixes of its own inside a compound branch (TILE_ORDER)', () => {
  // 0:3 1:START 2:2 3:met 4:il 5:isopropil 6:END 7:hex 8:ano
  assertError('3 START 2 met il isopropil END hex ano', 'TILE_ORDER', [5, 6],
    'Esta ficha no puede ir aquí: «isopropil» ya es una rama entera y no lleva números ni ramas propias.');
  assert.equal(readName(seq('4 START isopropil END hept ano')).kind, 'correct', 'marks alone are harmless: 4-isopropilheptano');
});

test('structural errors are checked in tile order, ranges before valence, every code listed', () => {
  assert.deepEqual([...BUILD_ERROR_CODES].sort(), ['BOND_RANGE', 'LOCANT_RANGE', 'SAME_BOND', 'TILE_ORDER', 'TOO_BIG', 'VALENCE']);
  assert.equal(errorOf('7 met il hex 7 eno').from, 0, 'the first offending tile');
  assert.equal(errorOf('2 2 2 tri met il but 9 eno').code, 'LOCANT_RANGE', 'a range error before a valence error');
});
