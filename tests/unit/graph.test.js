/**
 * @file Unit tests for src/model/graph.js: components, cycles, paths, leaves,
 * centre, the unrooted canonical tree key (design.md §3, §4.2, §8) and the
 * isomorphism between two molecules (§15.5.3).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  connectedComponents, isConnected, hasCycle, isTree, pathBetween, pathBonds, leaves,
  treeDiameterPath, longestChainLength, treeCentre, canonicalTreeKey, isomorphism,
} from '../../src/model/graph.js';
import { createMolecule, addAtom, addBond, moleculeToJSON, moleculeFromJSON, cloneMolecule } from '../../src/model/molecule.js';
import { parseSmiles } from '../../src/model/smiles.js';

/**
 * Rebuilds a molecule with shuffled atom ids and reversed bond insertion
 * order / endpoints, so only the topology is preserved.
 *
 * @param {object} mol - The source molecule.
 * @returns {object} An isomorphic molecule with different ids.
 */
function relabel(mol) {
  const data = moleculeToJSON(mol);
  const ids = data.atoms.map((t) => t.id);
  const map = new Map(ids.map((id, i) => [id, 100 + ids[(i * 7 + 3) % ids.length]]));
  data.atoms = data.atoms.map((t) => ({ ...t, id: map.get(t.id), x: Math.random(), y: Math.random() })).reverse();
  data.bonds = data.bonds.map((t) => ({ ...t, id: t.id + 50, a: map.get(t.b), b: map.get(t.a) })).reverse();
  return moleculeFromJSON(data).mol;
}

test('connected components and connectivity', () => {
  const mol = parseSmiles('CCC');
  assert.deepEqual(connectedComponents(mol), [[1, 2, 3]]);
  const lone = addAtom(mol);
  const other = addAtom(mol);
  addBond(mol, other, lone);
  assert.deepEqual(connectedComponents(mol), [[1, 2, 3], [4, 5]]);
  assert.equal(isConnected(mol), false);
  assert.equal(isConnected(createMolecule()), true);
  assert.equal(isTree(createMolecule()), false);
});

test('cycle detection', () => {
  const mol = parseSmiles('CC(C)CC');
  assert.equal(hasCycle(mol), false);
  assert.equal(isTree(mol), true);
  addBond(mol, 3, 5);
  assert.equal(hasCycle(mol), true);
  assert.equal(isTree(mol), false);
  const ring = createMolecule();
  const ids = [1, 2, 3, 4, 5, 6].map(() => addAtom(ring));
  ids.forEach((id, i) => addBond(ring, id, ids[(i + 1) % 6]));
  assert.equal(hasCycle(ring), true);
}); // End of test 'cycle detection'

test('path between two atoms of a tree, and its bonds', () => {
  const mol = parseSmiles('CC(C)CC=C'); // 1-2(-3)-4-5=6
  assert.deepEqual(pathBetween(mol, 3, 6), [3, 2, 4, 5, 6]);
  assert.deepEqual(pathBetween(mol, 1, 1), [1]);
  assert.deepEqual(pathBonds(mol, [3, 2, 4, 5, 6]), [2, 3, 4, 5]);
  assert.throws(() => pathBonds(mol, [1, 3]), /not bonded/);
  assert.equal(pathBetween(mol, 1, 99), null);
  addAtom(mol);
  assert.equal(pathBetween(mol, 1, 7), null);
});

test('leaves, diameter and centre', () => {
  assert.deepEqual(leaves(parseSmiles('C')), []);
  assert.deepEqual(leaves(parseSmiles('CC(C)(C)CC')), [1, 3, 4, 6]);
  assert.deepEqual(treeDiameterPath(createMolecule()), []);
  assert.equal(longestChainLength(parseSmiles('C')), 1);
  assert.equal(longestChainLength(parseSmiles('CC(CCCC)CC')), 7);
  assert.deepEqual(treeCentre(parseSmiles('CCCCC')), [3]);
  assert.deepEqual(treeCentre(parseSmiles('CCCC')), [2, 3]);
  assert.deepEqual(treeCentre(parseSmiles('C')), [1]);
  assert.deepEqual(treeCentre(parseSmiles('CC')), [1, 2]);
});

/** Pairs of SMILES that denote the same tree (with bond orders). */
const SAME = [
  ['CC(C)CC', 'CCC(C)C'],
  ['CC(C)CC', 'C(C)(C)CC'],
  ['CCCC', 'C(C)CC'], // bicentred
  ['C=CCC', 'CCC=C'], // bicentred, asymmetric halves
  ['CC=CC', 'C(=CC)C'],
  ['CC(C)C(C)C', 'C(C)(C)C(C)C'], // bicentred, symmetric
  ['CCC(CC)C(C)CC', 'CCC(C)C(CC)CC'],
  ['C#CC=CC', 'CC=CC#C'],
  ['CC(C)(C)C', 'C(C)(C)(C)C'],
  ['CCCCC(C(C)C)CCCC', 'CCCCC(CCCC)C(C)C'],
  ['C=C(CCC)CCC', 'CCCC(=C)CCC'],
  ['C', 'C'],
];

test('canonical key is equal for the same tree written differently', () => {
  for (const [p, q] of SAME) {
    const kp = canonicalTreeKey(parseSmiles(p));
    assert.equal(kp, canonicalTreeKey(parseSmiles(q)), `${p} vs ${q}`);
    assert.equal(kp, canonicalTreeKey(relabel(parseSmiles(p))), `${p} relabelled`);
  }
  assert.equal(canonicalTreeKey(createMolecule()), '');
});

test('canonical key differs when a bond order or the topology differs', () => {
  const different = [
    ['CC(C)CC', 'CC(C)C=C'],
    ['CC(C)CC', 'CC(=C)CC'],
    ['C=CCC', 'CC=CC'],
    ['C=CC=C', 'C=C=CC'],
    ['CCCC', 'CC(C)C'],
    ['CC(C)CCC', 'CCC(C)CC'],
    ['C#CCC', 'C=CCC'],
    ['CC', 'C=C'], // bicentred, central bond order
    ['CCC(C)CCC', 'CCCCCCC'],
    ['CC(C)C(C)(C)C', 'CC(C)(C)CCC'],
  ];
  for (const [p, q] of different) {
    assert.notEqual(canonicalTreeKey(parseSmiles(p)), canonicalTreeKey(parseSmiles(q)), `${p} vs ${q}`);
  }
}); // End of test 'canonical key differs when a bond order or the topology differs'

test('canonical key is invariant for every choice of starting atom', () => {
  const mol = parseSmiles('CC(C=C)C(C#C)(CC)C(C)=CC');
  const key = canonicalTreeKey(mol);
  for (let i = 0; i < 5; i += 1) {
    assert.equal(canonicalTreeKey(relabel(mol)), key);
  }
});

test('canonical key rejects non-trees', () => {
  const ring = parseSmiles('CCC');
  addBond(ring, 1, 3);
  assert.throws(() => canonicalTreeKey(ring), /not a tree/);
  const pieces = parseSmiles('CC');
  addAtom(pieces);
  assert.throws(() => canonicalTreeKey(pieces), /not a tree/);
});

/**
 * Asserts that id maps are an isomorphism: atoms one to one with the same
 * elements, every bond onto a bond between the mapped atoms with its order.
 *
 * @param {object} from - A molecule.
 * @param {object} to - Another molecule.
 * @param {{atoms: Map<number, number>, bonds: Map<number, number>}} iso - isomorphism(from, to).
 * @returns {void}
 */
function assertIsomorphism(from, to, iso) {
  assert.equal(iso.atoms.size, from.atoms.size);
  assert.equal(new Set(iso.atoms.values()).size, to.atoms.size, 'one to one');
  for (const [id, image] of iso.atoms) {
    assert.equal(to.atoms.get(image).element, from.atoms.get(id).element);
  }
  assert.equal(new Set(iso.bonds.values()).size, to.bonds.size);
  for (const bond of from.bonds.values()) {
    const image = to.bonds.get(iso.bonds.get(bond.id));
    const sorted = (a, b) => [a, b].sort((p, q) => p - q);
    assert.deepEqual(sorted(image.a, image.b), sorted(iso.atoms.get(bond.a), iso.atoms.get(bond.b)));
    assert.equal(image.order, bond.order);
  }
} // End of function assertIsomorphism()

test('isomorphism: atom and bond id maps between molecules with one structure, null otherwise', () => {
  const smiles = ['CC(C=C)C(C#C)(CC)C(C)=CC', 'CC(C)(C)CC(C)(C)C(C)(C)CC(C)(C)C', 'CC1CCC(Cl)CC1', 'C1=CC=CC=C1CC1=CC=CC=C1', 'C'];
  for (const s of smiles) {
    const mol = parseSmiles(s);
    const other = relabel(mol);
    assertIsomorphism(mol, other, isomorphism(mol, other));
    // A copy maps onto itself: equal ids are tried first.
    const self = isomorphism(mol, cloneMolecule(mol));
    assert.ok([...self.atoms].every(([id, image]) => id === image) && [...self.bonds].every(([id, image]) => id === image), s);
  }
  // Written from either end: 2-metilbut-3-ino and 3-metilbut-1-ino.
  const one = parseSmiles('CC(C)C#C');
  const two = parseSmiles('C#CC(C)C');
  assertIsomorphism(one, two, isomorphism(one, two));
  // Not isomorphic: topology, a bond order's place, an element, the size.
  assert.equal(isomorphism(parseSmiles('CCCC'), parseSmiles('CC(C)C')), null);
  assert.equal(isomorphism(parseSmiles('C=CCC'), parseSmiles('CC=CC')), null);
  assert.equal(isomorphism(parseSmiles('CCCl'), parseSmiles('CCC')), null);
  assert.equal(isomorphism(parseSmiles('CCC'), parseSmiles('CCCC')), null);
  assert.deepEqual(isomorphism(createMolecule(), createMolecule()), { atoms: new Map(), bonds: new Map() });
}); // End of test 'isomorphism: atom and bond id maps between molecules with one structure, null otherwise'
