/**
 * @file Unit tests for src/model/molecule.js: mutation, implicit H, formula,
 * neighbours and JSON round-trip (design.md §3.1).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMolecule, addAtom, removeAtom, addBond, removeBond, setBondOrder, neighbours, implicitH,
  formula, formulaUnicode, toSubscript, isEmpty, bondBetween, cloneMolecule, moleculeToJSON, moleculeFromJSON,
} from '../../src/model/molecule.js';
import { parseSmiles } from '../../src/model/smiles.js';

test('ids are stable incrementing integers, never reused', () => {
  const mol = createMolecule();
  assert.ok(isEmpty(mol));
  const a = addAtom(mol, { x: 1, y: 2 });
  const b = addAtom(mol);
  const c = addAtom(mol);
  assert.deepEqual([a, b, c], [1, 2, 3]);
  assert.deepEqual(mol.atoms.get(a), { id: 1, element: 'C', x: 1, y: 2 });
  const ab = addBond(mol, a, b);
  const bc = addBond(mol, b, c, 2);
  assert.deepEqual([ab, bc], [1, 2]);
  assert.deepEqual(removeAtom(mol, c), [bc]);
  assert.equal(addAtom(mol), 4);
  assert.equal(addBond(mol, b, 4), 3);
  removeBond(mol, ab);
  assert.equal(mol.bonds.size, 1);
  assert.equal(bondBetween(mol, a, b), null);
}); // End of test 'ids are stable incrementing integers, never reused'

test('mutators reject broken references, self-bonds, duplicates and bad orders', () => {
  const mol = createMolecule();
  const a = addAtom(mol);
  const b = addAtom(mol);
  assert.throws(() => addBond(mol, a, 99), /does not exist/);
  assert.throws(() => addBond(mol, a, a), /itself/);
  assert.throws(() => addBond(mol, a, b, 4), /invalid bond order/);
  const bond = addBond(mol, a, b);
  assert.throws(() => addBond(mol, b, a), /already bonded/);
  assert.throws(() => setBondOrder(mol, bond, 0), /invalid bond order/);
  assert.throws(() => setBondOrder(mol, 42, 2), /does not exist/);
  assert.throws(() => removeBond(mol, 42), /does not exist/);
  assert.throws(() => removeAtom(mol, 42), /does not exist/);
  setBondOrder(mol, bond, 3);
  assert.equal(mol.bonds.get(bond).order, 3);
}); // End of test 'mutators reject broken references, self-bonds, duplicates and bad orders'

test('neighbours and implicit hydrogens', () => {
  const mol = parseSmiles('C=C(C)C#C');
  assert.deepEqual(neighbours(mol, 2).map((n) => [n.atom, n.order]), [[1, 2], [3, 1], [4, 1]]);
  assert.deepEqual([...mol.atoms.keys()].map((id) => implicitH(mol, id)), [2, 0, 3, 0, 1]);
});

test('formula in Hill order, with Unicode subscripts for display', () => {
  assert.equal(formula(createMolecule()), '');
  assert.equal(formula(parseSmiles('C')), 'CH4');
  assert.equal(formula(parseSmiles('CCCCCCC')), 'C7H16');
  assert.equal(formula(parseSmiles('C#C')), 'C2H2');
  assert.equal(formula(parseSmiles('C=C=C')), 'C3H4');
  assert.equal(formulaUnicode(parseSmiles('CC(C)CCCC')), 'C₇H₁₆');
  assert.equal(toSubscript('C10H22'), 'C₁₀H₂₂');
  const mol = createMolecule();
  const a = addAtom(mol);
  mol.atoms.set(a, { ...mol.atoms.get(a), element: 'O' }); // no carbon: alphabetical
  assert.equal(formula(mol), 'H2O');
}); // End of test 'formula in Hill order, with Unicode subscripts for display'

test('clone is independent', () => {
  const mol = parseSmiles('CCC');
  const copy = cloneMolecule(mol);
  setBondOrder(copy, 1, 2);
  addAtom(copy);
  assert.equal(mol.bonds.get(1).order, 1);
  assert.equal(mol.atoms.size, 3);
  assert.equal(copy.nextAtomId, 5);
});

test('JSON round-trip preserves atoms, bonds, coordinates and id counters', () => {
  const mol = createMolecule();
  const a = addAtom(mol, { x: 10.5, y: -3 });
  const b = addAtom(mol, { x: 20, y: 4 });
  const c = addAtom(mol);
  addBond(mol, a, b, 2);
  const bc = addBond(mol, b, c);
  removeAtom(mol, addAtom(mol)); // counters ahead of the max id
  removeBond(mol, bc);
  addBond(mol, c, b, 1);
  const json = JSON.stringify(moleculeToJSON(mol));
  const result = moleculeFromJSON(json);
  assert.equal(result.ok, true);
  assert.deepEqual(moleculeToJSON(result.mol), moleculeToJSON(mol));
  assert.equal(result.mol.nextAtomId, 5);
  assert.equal(addAtom(result.mol), 5);
  assert.deepEqual(moleculeFromJSON(moleculeToJSON(createMolecule())).ok, true);
}); // End of test 'JSON round-trip preserves atoms, bonds, coordinates and id counters'

test('corrupt JSON returns an error result instead of crashing', () => {
  const good = moleculeToJSON(parseSmiles('CC=C'));
  const cases = [
    'not json {',
    'null',
    '42',
    '[]',
    { ...good, version: 99 },
    { ...good, atoms: 'x' },
    { ...good, bonds: null },
    { ...good, atoms: [null] },
    { ...good, atoms: [{ id: 'a', element: 'C', x: 0, y: 0 }] },
    { ...good, atoms: [{ id: 1.5, element: 'C', x: 0, y: 0 }] },
    { ...good, atoms: [...good.atoms, { ...good.atoms[0] }] }, // duplicate atom id
    { ...good, atoms: good.atoms.map((t) => ({ ...t, x: 'left' })) },
    { ...good, atoms: good.atoms.map((t) => ({ ...t, element: 'Si' })) },
    { ...good, bonds: [7] },
    { ...good, bonds: [...good.bonds, { ...good.bonds[0] }] }, // duplicate bond id
    { ...good, bonds: [{ id: 1, a: 1, b: 9, order: 1 }] }, // missing endpoint
    { ...good, bonds: [{ id: 1, a: 1, b: 1, order: 1 }] }, // self-bond
    { ...good, bonds: [{ id: 1, a: 1, b: 2, order: 1 }, { id: 2, a: 2, b: 1, order: 2 }] }, // duplicate pair
    { ...good, bonds: [{ id: 1, a: 1, b: 2, order: 4 }] },
    { ...good, bonds: [{ id: 1, a: 1, b: 2, order: '1' }] },
  ];
  for (const data of cases) {
    const result = moleculeFromJSON(data);
    assert.equal(result.ok, false, JSON.stringify(data));
    assert.equal(result.error.code, 'INVALID');
    assert.equal(result.error.message, 'Los datos de la molécula están dañados. Empieza un dibujo nuevo.');
    assert.equal(typeof result.error.detail, 'string');
  }
  const overValence = moleculeToJSON(parseSmiles('C(C)(C)(C)C'));
  overValence.bonds[0].order = 2;
  assert.equal(moleculeFromJSON(overValence).error.code, 'VALENCE');
}); // End of test 'corrupt JSON returns an error result instead of crashing'

test('malformed shapes and hostile values are reported as INVALID, never thrown', () => {
  const good = moleculeToJSON(parseSmiles('CC=C'));
  const hostile = { toString: null, valueOf: null };
  const throwing = Object.defineProperty({}, 'version', { get() { throw new Error('boom'); } });
  const cases = [
    '{"version":{"toString":null}}',
    '{"version":[1]}',
    { version: hostile },
    { ...good, atoms: { length: 1, 0: good.atoms[0] } },
    { ...good, atoms: [hostile] },
    { ...good, atoms: [{ ...good.atoms[0], id: hostile }] },
    { ...good, atoms: good.atoms.map((t) => ({ ...t, element: hostile })) },
    { ...good, bonds: { 0: good.bonds[0] } },
    { ...good, bonds: [{ ...good.bonds[0], order: hostile }] },
    { ...good, bonds: [{ ...good.bonds[0], a: hostile }] },
    { ...good, nextAtomId: hostile },
    throwing,
    new Proxy({}, { get() { throw new Error('trap'); } }),
  ];
  for (const data of cases) {
    const result = moleculeFromJSON(data);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'INVALID');
  }
}); // End of test 'malformed shapes and hostile values are reported as INVALID, never thrown'

test('ids and counters without headroom are rejected; mutators never reuse ids', () => {
  const good = moleculeToJSON(parseSmiles('CCC'));
  const bad = [
    { ...good, nextAtomId: Number.MAX_SAFE_INTEGER },
    { ...good, nextBondId: 1e9 + 2 },
    { ...good, nextAtomId: 2.5 },
    { ...good, nextAtomId: -1 },
    { ...good, nextBondId: '3' },
    { ...good, atoms: [...good.atoms, { id: Number.MAX_SAFE_INTEGER, element: 'C', x: 0, y: 0 }] },
    { ...good, atoms: [...good.atoms, { id: 1e9 + 1, element: 'C', x: 0, y: 0 }] },
    { ...good, bonds: [{ id: 2 ** 53, a: 1, b: 2, order: 1 }] },
  ];
  for (const data of bad) {
    const result = moleculeFromJSON(data);
    assert.equal(result.ok, false, JSON.stringify(data));
    assert.equal(result.error.code, 'INVALID');
  }
  const edge = moleculeFromJSON({ ...good, atoms: [...good.atoms, { id: 1e9, element: 'C', x: 0, y: 0 }] });
  assert.equal(edge.ok, true);
  assert.equal(edge.mol.nextAtomId, 1e9 + 1);
  assert.throws(() => addAtom(edge.mol), /exhausted/);
  assert.equal(edge.mol.atoms.size, 4);

  const mol = parseSmiles('CC');
  mol.nextAtomId = 2; // points at an occupied id
  assert.throws(() => addAtom(mol), /already in use/);
  assert.equal(mol.nextAtomId, 2);
  mol.nextBondId = 1;
  assert.throws(() => addBond(mol, 1, 2), /already|in use/);
  mol.nextAtomId = Number.MAX_SAFE_INTEGER;
  assert.throws(() => addAtom(mol), /invalid or exhausted/);
}); // End of test 'ids and counters without headroom are rejected; mutators never reuse ids'

test('JSON repairs id counters that lag behind the ids in use', () => {
  const data = moleculeToJSON(parseSmiles('CCC'));
  data.nextAtomId = 1;
  delete data.nextBondId;
  const { mol } = moleculeFromJSON(data);
  assert.equal(mol.nextAtomId, 4);
  assert.equal(mol.nextBondId, 3);
});
