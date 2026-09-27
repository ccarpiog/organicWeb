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
  ['CCS', 'SMILES_ELEMENT'],
  ['CP', 'SMILES_ELEMENT'],
  ['BC', 'SMILES_ELEMENT'],
  ['C[Si]', 'SMILES_ELEMENT'],
  ['[S]', 'SMILES_ELEMENT'],
  ['c1ccccc1', 'SMILES_AROMATIC'],
  ['Cc', 'SMILES_AROMATIC'],
  ['Co', 'SMILES_AROMATIC'],
  ['C[nH]C', 'SMILES_AROMATIC'],
  ['C[C]', 'SMILES_HYDROGEN'],
  ['C[CH2]', 'SMILES_HYDROGEN'],
  ['C[O]', 'SMILES_HYDROGEN'],
  ['[NH4]', 'SMILES_HYDROGEN'],
  ['[H]C', 'SMILES_HYDROGEN'],
  ['C[H]', 'SMILES_HYDROGEN'],
  ['[13CH4]', 'SMILES_ISOTOPE'],
  ['[NH4+]', 'SMILES_CHARGE'],
  ['CC(=O)[O-]', 'SMILES_CHARGE'],
  ['[Cl-]', 'SMILES_CHARGE'],
  ['C[C@H](O)N', 'SMILES_STEREO'],
  ['[CH4:1]', 'SMILES_BRACKET'],
  ['[CH4', 'SMILES_BRACKET'],
  ['C]', 'SMILES_BRACKET'],
  ['[]', 'SMILES_BRACKET'],
  ['OC1CC1', 'SMILES_RING'],
  ['CO.O', 'SMILES_DOT'],
  ['CO(C)C', 'VALENCE'],
  ['C=N#C', 'VALENCE'],
  ['CF(C)', 'VALENCE'],
  ['C=Cl', 'VALENCE'],
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
  const positions = [['C1CC1', 1], ['CC=', 2], ['CCS', 2], ['CC(C', 2], ['CC[CH2]', 2], ['C[NH4+]', 5], ['C[13CH3]', 2]];
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

test('reads and writes every supported element, keeping its identity', () => {
  const cases = [
    ['CO', 'CH4O'], ['CN', 'CH5N'], ['CF', 'CH3F'], ['CCl', 'CH3Cl'], ['CBr', 'CH3Br'], ['CI', 'CH3I'],
    ['O', 'H2O'], ['N', 'H3N'], ['C=O', 'CH2O'], ['CC#N', 'C2H3N'], ['C=NC', 'C2H5N'],
    ['ClC(Br)(F)I', 'CBrClFI'], ['OCC(N)C(=O)Cl', 'C3H6ClNO2'], ['ClCl', 'Cl2'], ['NN', 'H4N2'],
  ];
  for (const [smiles, expected] of cases) {
    const mol = parseSmiles(smiles);
    assert.equal(formula(mol), expected, smiles);
    const written = writeSmiles(mol);
    const back = parseSmiles(written);
    assert.equal(canonicalTreeKey(back), canonicalTreeKey(mol), `${smiles} → ${written}`);
    assert.deepEqual(
      [...back.atoms.values()].map((a) => a.element).sort(),
      [...mol.atoms.values()].map((a) => a.element).sort(),
      `${smiles}: elements survive the round trip`,
    );
  }
  assert.deepEqual([...parseSmiles('ClCBr').atoms.values()].map((a) => a.element), ['Cl', 'C', 'Br']);
  assert.equal(writeSmiles(parseSmiles('OCCCl')), 'OCCCl');
  assert.equal(writeSmiles(parseSmiles('CC(Cl)(Br)I')), 'CC(Cl)(Br)I');
}); // End of test 'reads and writes every supported element, keeping its identity'

test('bracket atoms with explicit hydrogens', () => {
  const same = [
    ['[CH4]', 'C'], ['[CH3][CH3]', 'CC'], ['C[OH]', 'CO'], ['[NH2]CC', 'NCC'], ['C[NH]C', 'CNC'],
    ['[OH2]', 'O'], ['[NH3]', 'N'], ['C[Cl]', 'CCl'], ['[Br]C', 'BrC'], ['C[C](C)(C)C', 'CC(C)(C)C'],
    ['[CH2]=[CH2]', 'C=C'], ['C[N](C)C', 'CN(C)C'], ['[FH]', 'F'], ['C[I]', 'CI'],
  ];
  for (const [bracketed, plain] of same) {
    const a = parseSmiles(bracketed);
    const b = parseSmiles(plain);
    assert.equal(canonicalTreeKey(a), canonicalTreeKey(b), bracketed);
    assert.equal(formula(a), formula(b), bracketed);
    assert.equal(writeSmiles(a), writeSmiles(b), `${bracketed}: the writer never needs brackets`);
  }
}); // End of test 'bracket atoms with explicit hydrogens'

test('same-formula isomers stay distinct', () => {
  const groups = [
    ['CCO', 'COC'],
    ['CCN', 'CNC'],
    ['CCCO', 'CC(C)O', 'CCOC'],
    ['ClCCBr', 'CC(Cl)Br'],
    ['CC=O', 'C=CO'],
  ];
  for (const group of groups) {
    const mols = group.map((s) => parseSmiles(s));
    assert.equal(new Set(mols.map(formula)).size, 1, `${group.join(' / ')} share a formula`);
    assert.equal(new Set(mols.map(canonicalTreeKey)).size, group.length, `${group.join(' / ')} are different structures`);
    for (const mol of mols) {
      assert.equal(canonicalTreeKey(parseSmiles(writeSmiles(mol))), canonicalTreeKey(mol));
    }
  }
  assert.equal(canonicalTreeKey(parseSmiles('OCC')), canonicalTreeKey(parseSmiles('CCO')));
}); // End of test 'same-formula isomers stay distinct'
