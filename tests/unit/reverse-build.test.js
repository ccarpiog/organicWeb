/**
 * @file Unit tests for the interpreter and the builder of «¿Cómo se
 * dibuja?» (src/reverse/interpret.js, src/reverse/build.js; design.md
 * §15.4, §15.5.3, §15.6, phase R-1b): the NameSpec with its typed slots
 * (supplied, implicit, left out; old-style locants), the molecule built
 * from it, and one test per structural error code with its tile range —
 * on the parent and inside branches; rings (R-4a): the ring NameSpec, its
 * closing bond, the errors worded for a ring and the ring limit; benzene
 * (R-4b): the `benceno` and `fenil` NameSpecs, the Kekulé ring built, the
 * phenyl's carbon 1, the errors worded for benzene and the ring limit.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import {
  build, checkSpec, specCarbons, specRings, ringRefusal, attachmentOrder, ownPrefixAtoms, BUILD_ERROR_CODES, MAX_KEYED_RINGS,
} from '../../src/reverse/build.js';
import { slotGroups } from '../../src/reverse/search.js';
import { readName } from '../../src/reverse/index.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { canonicalKey, aromaticKey } from '../../src/model/graph.js';
import { MAX_CARBONS, MESSAGES, RING_SYSTEM_MESSAGES } from '../../src/model/validate.js';
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
  assert.deepEqual(spec.parent, { kind: 'chain', length: 5, double: [], triple: [], template: null, tiles: [5, 7] });
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

test('ownPrefixAtoms(): a compound branch\'s own branches, cut from its atoms in creation order, at every depth', () => {
  const names = [
    '5 5 bis START 2 2 di met il prop il END non ano',
    '8 START 2 prop ano 2 iliden hex il END pentadec ano',
    '7 START 2 START 2 met il prop il END prop il END tridec ano',
    '5 START 2 met il 2 START met ano 1 il END prop il END non ano',
  ];
  for (const words of names) {
    const spec = specOf(words);
    const { molecule, prefixAtoms } = build(spec);
    let seen = 0;
    /**
     * Checks the own branches of one branch occurrence, then theirs: each slice joins the rest of the molecule by one
     * bond, to the carbon of the branch's own chain its locant names, and has as many carbons as its branch.
     *
     * @param {object} sub - The branch's SubstituentSpec.
     * @param {number[]} atoms - Its atoms in creation order.
     * @returns {void}
     */
    const check = (sub, atoms) => {
      ownPrefixAtoms(sub, atoms).forEach((slices, k) => {
        const prefix = sub.prefixes[k];
        slices.forEach((slice, occurrence) => {
          seen += 1;
          const inside = new Set(slice);
          const out = [...molecule.bonds.values()].filter((b) => inside.has(b.a) !== inside.has(b.b));
          assert.equal(out.length, 1, `${words}: one bond leaves the branch`);
          const outer = inside.has(out[0].a) ? out[0].b : out[0].a;
          assert.equal(outer, atoms[prefix.slots[occurrence].value - 1], `${words}: hangs from its locant's carbon`);
          check(prefix.substituent, slice);
        });
      });
    }; // End of function check()
    prefixAtoms.forEach((o) => check(spec.prefixes[o.prefix].substituent, o.atoms));
    assert.ok(seen > 0, `${words}: no own branches`);
  } // End of the loop over the names
}); // End of test 'ownPrefixAtoms(): a compound branch's own branches, cut from its atoms in creation order, at every depth'

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

test('interpret (R-4a): a ring parent and ring branches, ring bonds 1…n, `il` at carbon 1 by rule', () => {
  // 0:3 1:met 2:il 3:ciclo 4:hex 5:1 6:eno
  let spec = specOf('3 met il ciclo hex 1 eno');
  assert.deepEqual(spec.parent, {
    kind: 'ring', length: 6, double: [{ kind: 'supplied', value: 1, role: 'ringBond', domain: [1, 6], tiles: [5, 6] }], triple: [], template: null,
    tiles: [3, 7],
  });
  assert.equal(spec.prefixes[0].slots[0].domain[1], 6);
  // Left out on a ring: carbons 1…6 and ring bonds 1…6.
  spec = specOf('met il ciclo hex eno');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.role, slot.domain, slot.tiles]), [['carbon', [1, 6], [0, 2]], ['ringBond', [1, 6], [4, 5]]]);
  // `ciclohexil`: a ring branch, its free valence at carbon 1 by rule; `(ciclohex-2-en-1-il)` cites it.
  spec = specOf('ciclo hex il met ano');
  const ring = spec.prefixes[0].substituent;
  assert.deepEqual([ring.kind, ring.length, ring.freeValence.order, ring.freeValence.slot.kind, ring.freeValence.slot.value], ['ring', 6, 1, 'implicit', 1]);
  spec = specOf('2 ciclo hex 2 eno 1 il prop ano');
  const unsaturated = spec.prefixes[0].substituent;
  assert.deepEqual(unsaturated.double.map((slot) => [slot.role, slot.value, slot.domain]), [['ringBond', 2, [1, 6]]]);
  assert.deepEqual([unsaturated.freeValence.slot.kind, unsaturated.freeValence.slot.value], ['supplied', 1]);
  assert.equal(specOf('ciclo hex iliden met ano').prefixes[0].substituent.freeValence.order, 2);
  assert.equal(attachmentOrder(specOf('ciclo hex iliden met ano').prefixes[0].substituent), 2);
  // A ring as the own chain of a compound branch.
  spec = specOf('START 2 met il ciclo hex il END met ano');
  assert.deepEqual([spec.prefixes[0].substituent.kind, spec.prefixes[0].substituent.prefixes.length], ['ring', 1]);
  // Old style on a ring.
  spec = specOf('1 3 ciclo hex di eno');
  assert.equal(spec.oldStyle, true);
  assert.deepEqual(spec.parent.double.map((slot) => [slot.kind, slot.value, slot.role]), [['supplied', 1, 'ringBond'], ['supplied', 3, 'ringBond']]);
}); // End of test 'interpret (R-4a): a ring parent and ring branches…'

test('build (R-4a): the ring closed by bond n, the student\'s numbering kept, ring branches attached by their carbon 1', () => {
  // `ciclohex-6-eno`: bond 6 joins carbons 6 and 1 — the closing bond, never out of range.
  let built = build(specOf('ciclo hex 6 eno'));
  assert.ok(built.ok);
  assert.equal(canonicalKey(built.molecule), canonicalKey(parseSmiles('C1=CCCCC1')));
  const { atoms, bonds } = built.studentParent;
  assert.equal(bonds.length, 6, 'a ring has as many bonds as carbons');
  const closing = built.molecule.bonds.get(bonds[5]);
  assert.deepEqual([[closing.a, closing.b].sort((p, q) => p - q), closing.order], [[atoms[0], atoms[5]].sort((p, q) => p - q), 2]);
  // Prefixes on the student's carbons.
  built = build(specOf('1 3 di met il ciclo hex ano'));
  assert.equal(canonicalKey(built.molecule), canonicalKey(parseSmiles('CC1CC(C)CCC1')));
  assert.deepEqual(built.prefixAtoms.map((o) => [o.locant, o.parentAtom]), [[1, atoms[0]], [3, atoms[2]]]);
  // Ring branches: by a single bond (`il`) or a double one (`iliden`), on a chain parent (methane's one carbon placed).
  assert.equal(canonicalKey(build(specOf('ciclo hex il met ano'), [1]).molecule), canonicalKey(parseSmiles('CC1CCCCC1')));
  assert.equal(canonicalKey(build(specOf('ciclo hex iliden met ano'), [1]).molecule), canonicalKey(parseSmiles('C=C1CCCCC1')));
  assert.equal(canonicalKey(build(specOf('2 ciclo hex 2 eno 1 il prop ano')).molecule), canonicalKey(parseSmiles('CC(C)C1C=CCCC1')));
  assert.equal(canonicalKey(build(specOf('START 2 met il ciclo hex il END met ano'), [1]).molecule),
    canonicalKey(parseSmiles('CC1CCCCC1C')));
  assert.equal(specCarbons(specOf('START 2 met il ciclo hex il END met ano')), 8);
}); // End of test 'build (R-4a): the ring closed by bond n…'

test('structural errors worded for rings (R-4a): range, closing bond, same bond, valence, crowded bonds', () => {
  // 0:7 1:met 2:il 3:ciclo 4:hex 5:ano
  assertError('7 met il ciclo hex ano', 'LOCANT_RANGE', [0, 1], 'El anillo de 6 carbonos va del 1 al 6: no hay carbono 7.');
  assertError('ciclo hex 7 eno', 'LOCANT_RANGE', [2, 3], 'El anillo de 6 carbonos va del 1 al 6: no hay carbono 7.');
  assertError('2 ciclo prop 4 eno 1 il but ano', 'LOCANT_RANGE', [3, 4], 'El anillo de la rama va del 1 al 3: no hay carbono 4.');
  assertError('2 ciclo prop 5 il but ano', 'LOCANT_RANGE', [3, 4], 'El anillo de la rama va del 1 al 3: no hay carbono 5.');
  assertError('3 START 4 met il ciclo prop il END hex ano', 'LOCANT_RANGE', [2, 3], 'El anillo de la rama va del 1 al 3: no hay carbono 4.');
  // The closing bond is no BOND_RANGE on a ring; it can be taken twice.
  assert.equal(readName(seq('ciclo hex 6 eno')).kind, 'otherName', 'ciclohex-6-eno is ciclohexeno numbered otherwise');
  assertError('ciclo hex 6 eno 6 ino', 'SAME_BOND', [2, 5], 'Hay dos enlaces múltiples en el mismo sitio (6).');
  assertError('ciclo prop tetra eno', 'SAME_BOND', [2, 4],
    'No caben tantos enlaces múltiples: el anillo de 3 carbonos solo tiene 3 enlaces entre carbonos.');
  // Valence: a ring carbon has two ring bonds already.
  assertError('1 1 1 tri met il ciclo hex ano', 'VALENCE', [2, 3], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4.');
  assertError('ciclo hex 1 6 di ino', 'VALENCE', [3, 4], 'El carbono 1 tendría 6 enlaces, y un carbono solo puede tener 4.');
  assertError('1 met iliden ciclo hex 1 eno', 'VALENCE', [5, 6], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4.');
  assertError('2 ciclo hex 1 eno 1 iliden prop ano', 'VALENCE', [5, 6],
    'El carbono 1 de la rama tendría 5 enlaces, y un carbono solo puede tener 4.');
  assert.equal(readName(seq('1 1 di met il ciclo hex ano')).kind, 'correct', 'two methyls fit on one ring carbon');
}); // End of test 'structural errors worded for rings (R-4a)…'

test('the ring limit (R-4a): more rings than the structural key handles, or two rings bonded atom to atom', () => {
  assert.equal(MAX_KEYED_RINGS, 2);
  assert.deepEqual([specRings(specOf('ciclo hex ano')), specRings(specOf('di ciclo hex il met ano')),
    specRings(specOf('1 2 bis START 2 met il ciclo hex il END ciclo hex ano'))], [1, 2, 3]);
  // Two rings apart (through a carbon) have a key: the engine itself refuses them.
  assert.equal(ringRefusal(specOf('di ciclo hex il met ano')), null);
  assert.equal(ringRefusal(specOf('2 START ciclo hex il met il END ciclo hex ano')), null);
  // Bonded straight to one another, or three: refused before any search, with the engine's message.
  for (const words of ['ciclo hex il ciclo hex ano', 'ciclo hex iliden ciclo hex ano', 'START ciclo prop il ciclo hex il END met ano',
    'tri ciclo hex il met ano', '1 2 di ciclo hex il ciclo hex ano']) {
    const refusal = ringRefusal(specOf(words));
    assert.deepEqual([refusal.code, refusal.message], ['RING_SYSTEM', RING_SYSTEM_MESSAGES.several], words);
  }
}); // End of test 'the ring limit (R-4a)…'

test('interpret (R-4b): `benceno` is a six-carbon parent without bond slots; `fenil` a branch bonded by its carbon 1', () => {
  // 0:1 1:4 2:di 3:met 4:il 5:benceno
  let spec = specOf('1 4 di met il benceno');
  assert.deepEqual(spec.parent, { kind: 'benzene', length: 6, double: [], triple: [], template: null, tiles: [5, 6] });
  assert.deepEqual(spec.prefixes[0].slots.map((slot) => [slot.kind, slot.value, slot.role, slot.domain]),
    [['supplied', 1, 'carbon', [1, 6]], ['supplied', 4, 'carbon', [1, 6]]]);
  assert.equal(spec.oldStyle, false);
  // Left out on benzene: any of its six carbons.
  spec = specOf('met il benceno');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.role, slot.domain, slot.tiles]), [['carbon', [1, 6], [0, 2]]]);
  // `fenil`: a phenyl at its carbon 1 by rule (the `fenil` tile), single bond, no bond slots.
  spec = specOf('fenil met ano');
  const phenyl = spec.prefixes[0].substituent;
  assert.deepEqual([phenyl.kind, phenyl.length, phenyl.retained, phenyl.double, phenyl.triple, phenyl.prefixes, phenyl.compound],
    ['phenyl', 6, 'phenyl', [], [], [], false]);
  assert.deepEqual(phenyl.freeValence, { slot: { kind: 'implicit', value: 1, role: 'carbon', domain: [1, 6], tiles: [0, 1] }, order: 1 });
  assert.equal(attachmentOrder(phenyl), 1);
  // `(4-metilfenil)`: its own prefixes on carbons 2…6 (role phenylCarbon), supplied or left out.
  // 0:START 1:4 2:met 3:il 4:fenil 5:END 6:met 7:ano
  spec = specOf('START 4 met il fenil END met ano');
  const substituted = spec.prefixes[0].substituent;
  assert.deepEqual([substituted.kind, substituted.compound, substituted.tiles, substituted.word], ['phenyl', true, [0, 6], { text: 'fenil', tiles: [4, 5] }]);
  assert.deepEqual(substituted.prefixes[0].slots.map((slot) => [slot.kind, slot.value, slot.role, slot.domain]),
    [['supplied', 4, 'phenylCarbon', [2, 6]]]);
  assert.deepEqual(specOf('START di met il fenil END met ano').leftOut.map((slot) => [slot.role, slot.domain]),
    [['carbon', [1, 1]], ['phenylCarbon', [2, 6]], ['phenylCarbon', [2, 6]]]);
  assert.deepEqual([specCarbons(specOf('START 2 4 di met il fenil END et ano')), specRings(specOf('START 2 4 di met il fenil END et ano'))],
    [10, 1]);
}); // End of test 'interpret (R-4b): `benceno` is a six-carbon parent…'

test('build (R-4b): one Kekulé drawing (double bonds 1, 3, 5), the student\'s numbering kept, the phenyl hung by its carbon 1', () => {
  let built = build(specOf('benceno'));
  assert.ok(built.ok);
  const { atoms, bonds } = built.studentParent;
  assert.deepEqual(bonds.map((id) => built.molecule.bonds.get(id).order), [2, 1, 2, 1, 2, 1]);
  assert.equal(canonicalKey(built.molecule), canonicalKey(parseSmiles('C1=CC=CC=C1')));
  // `1,2-` on a double bond, `1,6-` on a single one: two drawings of one molecule, one aromatic key.
  built = build(specOf('1 2 di met il benceno'));
  assert.deepEqual(built.prefixAtoms.map((o) => [o.locant, o.parentAtom]), [[1, atoms[0]], [2, atoms[1]]]);
  const other = build(specOf('1 6 di met il benceno'));
  assert.notEqual(canonicalKey(built.molecule), canonicalKey(other.molecule));
  assert.equal(aromaticKey(built.molecule), aromaticKey(other.molecule));
  assert.equal(aromaticKey(other.molecule), aromaticKey(parseSmiles('CC1=CC=CC=C1C')));
  // A phenyl: its carbon 1 bonded to the chain, its own prefixes on its carbons.
  built = build(specOf('START 4 met il fenil END met ano'), [1]);
  assert.equal(aromaticKey(built.molecule), aromaticKey(parseSmiles('CC1=CC=C(C)C=C1')));
  const [occurrence] = built.prefixAtoms;
  assert.equal(occurrence.atoms.length, 7, 'six ring carbons and the methyl');
  assert.equal(occurrence.attachment, occurrence.atoms[0], 'carbon 1, the first created');
  assert.deepEqual(ownPrefixAtoms(specOf('START 4 met il fenil END met ano').prefixes[0].substituent, occurrence.atoms), [[[occurrence.atoms[6]]]]);
  assert.equal(aromaticKey(build(specOf('1 START 2 4 di met il fenil END prop ano')).molecule),
    aromaticKey(parseSmiles('CCCC1=C(C)C=C(C)C=C1')));
}); // End of test 'build (R-4b): one Kekulé drawing…'

test('structural errors worded for benzene (R-4b): range, the phenyl\'s carbon 1, valence, numbers on `benceno`', () => {
  // 0:7 1:met 2:il 3:benceno
  assertError('7 met il benceno', 'LOCANT_RANGE', [0, 1], 'El benceno tiene 6 carbonos, del 1 al 6: no hay carbono 7.');
  // 0:START 1:7 2:met 3:il 4:fenil 5:END 6:met 7:ano
  assertError('START 7 met il fenil END met ano', 'LOCANT_RANGE', [1, 2], 'El anillo de la rama va del 1 al 6: no hay carbono 7.');
  assertError('START 1 met il fenil END met ano', 'LOCANT_RANGE', [1, 2],
    'En «fenil», el carbono 1 es el que se une a la cadena: las ramas del fenil van en los carbonos del 2 al 6.');
  // Valence: a benzene carbon has three bonds in the ring (one double), so room for one single-bond branch.
  assertError('1 1 di met il benceno', 'VALENCE', [1, 2], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4.');
  assertError('1 met iliden benceno', 'VALENCE', [0, 1], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4.');
  assertError('START 3 3 di met il fenil END met ano', 'VALENCE', [2, 3],
    'El carbono 3 de la rama tendría 5 enlaces, y un carbono solo puede tener 4.');
  assertError('hepta met il benceno', 'VALENCE', [0, 3],
    'No caben: pongas donde pongas lo que va sin número, algún carbono tendría más de 4 enlaces.');
  // A bond locant on benzene is a parse error (parse.js BENZENE_BONDS): no number of its own, before or after it.
  for (const words of ['1 3 5 benceno', '1 3 5 tri benceno', 'benceno 1 3 5 tri eno', 'met il 2 benceno']) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.errors.map((e) => e.code)], ['invalid', ['BENZENE_BONDS']], words);
    assert.equal(verdict.message,
      'El benceno no lleva números propios: sus enlaces dobles no se numeran. Los números van delante de cada rama (1,2-dimetilbenceno).');
  }
}); // End of test 'structural errors worded for benzene (R-4b)…'

test('the ring limit (R-4b): benzene and phenyl count as rings; two bonded atom to atom, or three, are refused', () => {
  assert.deepEqual([specRings(specOf('benceno')), specRings(specOf('fenil met ano')), specRings(specOf('di fenil met ano')),
    specRings(specOf('fenil benceno'))], [1, 1, 2, 2]);
  // Two rings apart (through a carbon) have a key: the engine itself refuses them.
  assert.equal(ringRefusal(specOf('di fenil met ano')), null);
  assert.equal(ringRefusal(specOf('START fenil met il END benceno')), null, '(fenilmetil)benceno');
  for (const words of ['fenil benceno', 'fenil met il benceno', 'fenil ciclo hex ano', 'ciclo hex il benceno', 'START fenil fenil END met ano', 'tri fenil met ano',
    'START START 4 met il fenil END fenil END met ano']) {
    const refusal = ringRefusal(specOf(words));
    assert.deepEqual([refusal.code, refusal.message], ['RING_SYSTEM', RING_SYSTEM_MESSAGES.several], words);
  }
}); // End of test 'the ring limit (R-4b)…'
