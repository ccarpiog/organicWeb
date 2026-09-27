/**
 * @file Unit tests for src/model/smiles.js: supported subset, explicit errors
 * and the debugging writer.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles, SmilesError } from '../../src/model/smiles.js';
import { canonicalTreeKey } from '../../src/model/graph.js';
import { formula, createMolecule, addAtom } from '../../src/model/molecule.js';

/**
 * Lists a molecule's bonds as `[a, b, order]` triples.
 *
 * @param {object} mol - The molecule.
 * @returns {number[][]} The bonds.
 */
function bondList(mol) {
  return [...mol.bonds.values()].map((b) => [b.a, b.b, b.order]);
}

test('parses atoms, bond orders and branches', () => {
  assert.deepEqual(bondList(parseSmiles('C')), []);
  assert.deepEqual(bondList(parseSmiles('C=C')), [[1, 2, 2]]);
  assert.deepEqual(bondList(parseSmiles('C#C')), [[1, 2, 3]]);
  assert.deepEqual(bondList(parseSmiles('C-C')), [[1, 2, 1]]);
  assert.deepEqual(bondList(parseSmiles('CC(C)C')), [[1, 2, 1], [2, 3, 1], [2, 4, 1]]);
  assert.deepEqual(bondList(parseSmiles('CC(=C)C#C')), [[1, 2, 1], [2, 3, 2], [2, 4, 1], [4, 5, 3]]);
  assert.deepEqual(bondList(parseSmiles('C(C(C)C)C')), [[1, 2, 1], [2, 3, 1], [2, 4, 1], [1, 5, 1]]);
  assert.equal(parseSmiles('  CCC \n').atoms.size, 3);
  assert.deepEqual(parseSmiles('C').atoms.get(1), { id: 1, element: 'C', x: 0, y: 0 });
});

/** Invalid inputs and the error code each must produce. */
const ERRORS = [
  ['', 'SMILES_EMPTY'],
  ['   ', 'SMILES_EMPTY'],
  ['C1CCCCC1', 'SMILES_RING'],
  ['CC%10CC', 'SMILES_RING'],
  ['CCO', 'SMILES_ELEMENT'],
  ['CCl', 'SMILES_ELEMENT'],
  ['BrC', 'SMILES_ELEMENT'],
  ['CN', 'SMILES_ELEMENT'],
  ['c1ccccc1', 'SMILES_AROMATIC'],
  ['Cc', 'SMILES_AROMATIC'],
  ['[CH4]', 'SMILES_BRACKET'],
  ['C[C]', 'SMILES_BRACKET'],
  ['C=', 'SMILES_BOND'],
  ['=C', 'SMILES_BOND'],
  ['C==C', 'SMILES_BOND'],
  ['C=#C', 'SMILES_BOND'],
  ['C(C=)C', 'SMILES_BOND'],
  ['C=(C)C', 'SMILES_BOND'],
  ['CC)', 'SMILES_PAREN'],
  ['CC(C', 'SMILES_PAREN'],
  ['C()C', 'SMILES_PAREN'],
  ['(C)C', 'SMILES_PAREN'],
  ['C((C))', 'SMILES_PAREN'],
  ['C((C)C)', 'SMILES_PAREN'],
  ['CC(C)((C))C', 'SMILES_PAREN'],
  ['CC.C', 'SMILES_DOT'],
  ['C/C=C/C', 'SMILES_STEREO'],
  ['C C', 'SMILES_CHAR'],
  ['C*C', 'SMILES_CHAR'],
  ['C(C)(C)(C)(C)C', 'VALENCE'],
  ['C#C=C', 'VALENCE'],
];

test('rejects unsupported or malformed input with explicit errors', () => {
  for (const [smiles, code] of ERRORS) {
    assert.throws(
      () => parseSmiles(smiles),
      (err) => err instanceof SmilesError && err.code === code && err.message.length > 0,
      `${JSON.stringify(smiles)} should fail with ${code}`,
    );
  }
  assert.throws(() => parseSmiles(null), SmilesError);
});

test('errors report the position of the problem', () => {
  const positions = [['C1CC1', 1], ['CC=', 2], ['CCO', 2], ['CC(C', 2]];
  for (const [smiles, position] of positions) {
    assert.throws(() => parseSmiles(smiles), (err) => err.position === position);
  }
});

test('writer output parses back to the same tree', () => {
  for (const smiles of ['C', 'CC', 'C=C=C', 'CC(C)CC', 'CC(C)(C)C', 'C#CC(C=C)C(CC)C', 'CCC(=CC)CCC']) {
    const mol = parseSmiles(smiles);
    const written = writeSmiles(mol);
    const back = parseSmiles(written);
    assert.equal(canonicalTreeKey(back), canonicalTreeKey(mol), `${smiles} → ${written}`);
    assert.equal(formula(back), formula(mol));
  }
  assert.equal(writeSmiles(createMolecule()), '');
  assert.equal(writeSmiles(parseSmiles('CC(C)C=C')), 'CC(C)C=C');
  const pieces = parseSmiles('CC');
  addAtom(pieces);
  assert.equal(writeSmiles(pieces), 'CC.C');
}); // End of test 'writer output parses back to the same tree'
