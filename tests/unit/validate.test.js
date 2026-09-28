/**
 * @file Unit tests for src/model/validate.js: every code of design.md §3.2.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateStructure, validateForNaming, validateMolecule, validate, MESSAGES } from '../../src/model/validate.js';
import { createMolecule, addAtom, addBond } from '../../src/model/molecule.js';
import { parseSmiles } from '../../src/model/smiles.js';

/**
 * Builds a straight chain of n carbons without going through SMILES.
 *
 * @param {number} n - Number of carbons.
 * @returns {object} The molecule.
 */
function chain(n) {
  const mol = createMolecule();
  let previous = null;
  for (let i = 0; i < n; i += 1) {
    const atom = addAtom(mol);
    if (previous !== null) {
      addBond(mol, previous, atom);
    }
    previous = atom;
  }
  return mol;
} // End of function chain()

test('exact Spanish messages from the design table', () => {
  assert.deepEqual(MESSAGES, {
    EMPTY: 'Dibuja primero una molécula.',
    DISCONNECTED: 'Hay piezas sueltas: todas las partes deben estar unidas.',
    CYCLE: 'Este benceno tiene varios sustituyentes. Solo sé nombrar el benceno con un sustituyente como máximo '
      + '(como el metilbenceno): los bencenos con dos o más sustituyentes quedan fuera de lo que sé nombrar.',
    RING_SYSTEM: 'Esta molécula tiene anillos que quedan fuera de lo que sé nombrar.',
    VALENCE: 'Este carbono tendría más de 4 enlaces.',
    TOO_BIG: 'La molécula es demasiado grande (máximo 60 carbonos, cadena de 30).',
    HETEROATOM: 'Esta molécula tiene átomos que no son carbono ni hidrógeno. '
      + 'Aún no sé nombrar este tipo de compuestos: de momento solo nombro hidrocarburos, '
      + 'derivados halogenados (con flúor, cloro, bromo o yodo unidos a un carbono), '
      + 'alcoholes (con grupos –OH unidos a un carbono), '
      + 'aldehídos y cetonas (con un oxígeno unido a un carbono por un enlace doble, C=O), '
      + 'ácidos carboxílicos (con el grupo –COOH), '
      + 'éteres (con un oxígeno unido a dos carbonos, C–O–C) '
      + 'y ésteres (con el grupo –COO– entre dos cadenas de carbonos).',
    INVALID: 'Los datos de la molécula están dañados. Empieza un dibujo nuevo.',
  });
});

test('valid molecules pass both levels', () => {
  for (const smiles of ['C', 'CC', 'C=C=C', 'C#CC(C)(C)C', 'CC(C)(C)C']) {
    const mol = parseSmiles(smiles);
    assert.equal(validateStructure(mol), null);
    assert.equal(validateForNaming(mol), null);
    assert.deepEqual(validateMolecule(mol), { ok: true });
  }
  assert.equal(validate, validateMolecule);
});

test('EMPTY', () => {
  const mol = createMolecule();
  assert.equal(validateStructure(mol), null);
  assert.deepEqual(validateForNaming(mol), { code: 'EMPTY', message: MESSAGES.EMPTY });
  assert.deepEqual(validateMolecule(mol, { forNaming: false }), { ok: true });
});

test('DISCONNECTED', () => {
  const mol = parseSmiles('CC');
  addAtom(mol);
  assert.equal(validateStructure(mol), null);
  assert.equal(validateForNaming(mol).code, 'DISCONNECTED');
  assert.equal(validateMolecule(mol).error.message, MESSAGES.DISCONNECTED);
});

test('a single carbocycle is nameable with or without side chains (no CYCLE error since I-26)', () => {
  const mol = parseSmiles('CCCC');
  addBond(mol, 1, 3);
  assert.equal(validateStructure(mol), null);
  assert.equal(validateForNaming(mol), null, 'metilciclopropano');
  const triangle = parseSmiles('CCC');
  addBond(triangle, 1, 3);
  assert.equal(validateForNaming(triangle), null, 'ciclopropano');
});

test('VALENCE (structural, reports the offending atoms)', () => {
  const mol = parseSmiles('CC(C)(C)C');
  addBond(mol, 2, addAtom(mol));
  const error = validateStructure(mol);
  assert.equal(error.code, 'VALENCE');
  assert.equal(error.message, MESSAGES.VALENCE);
  assert.deepEqual(error.atoms, [2]);
  const double = parseSmiles('C=C');
  double.bonds.get(1).order = 3;
  addBond(double, 1, addAtom(double), 2); // 3 + 2 = 5 on atom 1
  assert.deepEqual(validateForNaming(double).atoms, [1]);
}); // End of test 'VALENCE (structural, reports the offending atoms)'

test('TOO_BIG: more than 60 carbons or a chain longer than 30', () => {
  assert.equal(validateForNaming(chain(30)), null);
  assert.equal(validateForNaming(chain(31)).code, 'TOO_BIG');
  const branched = chain(30); // 30-carbon chain + 30 methyls = 60 atoms: fine
  for (let i = 2; i <= 29; i += 1) {
    addBond(branched, i, addAtom(branched));
  }
  addBond(branched, 2, addAtom(branched));
  addBond(branched, 29, addAtom(branched));
  assert.equal(branched.atoms.size, 60);
  assert.equal(validateForNaming(branched), null);
  addBond(branched, 3, addAtom(branched));
  const error = validateForNaming(branched);
  assert.equal(error.code, 'TOO_BIG');
  assert.equal(error.message, MESSAGES.TOO_BIG);
}); // End of test 'TOO_BIG: more than 60 carbons or a chain longer than 30'

test('INVALID: ids, endpoints, self-bonds, duplicate bonds, orders, elements', () => {
  const variants = [
    null,
    {},
    { atoms: [], bonds: [] },
    (() => { const m = parseSmiles('CC'); m.atoms.set(9, m.atoms.get(1)); return m; })(), // id ≠ key (duplicate id)
    (() => { const m = parseSmiles('CC'); m.atoms.set(3, null); return m; })(),
    (() => { const m = parseSmiles('CC'); m.atoms.set(-1, { id: -1, element: 'C' }); return m; })(),
    (() => { const m = parseSmiles('CC'); m.atoms.get(2).element = 'Si'; return m; })(),
    (() => { const m = parseSmiles('CC'); m.bonds.set(5, m.bonds.get(1)); return m; })(), // bond id ≠ key
    (() => { const m = parseSmiles('CC'); m.bonds.set(2, 'bond'); return m; })(),
    (() => { const m = parseSmiles('CC'); m.bonds.get(1).b = 7; return m; })(),
    (() => { const m = parseSmiles('CC'); m.bonds.get(1).b = 1; return m; })(),
    (() => { const m = parseSmiles('CC'); m.bonds.set(2, { id: 2, a: 2, b: 1, order: 1 }); return m; })(),
    (() => { const m = parseSmiles('CC'); m.bonds.get(1).order = 0; return m; })(),
    (() => { const m = parseSmiles('CC'); m.bonds.get(1).order = 1.5; return m; })(),
    (() => { const m = parseSmiles('CC'); m.nextAtomId = 2; return m; })(), // counter not above ids
    (() => { const m = parseSmiles('CC'); m.nextBondId = Number.MAX_SAFE_INTEGER; return m; })(),
    new Proxy(parseSmiles('CC'), { get() { throw new Error('trap'); } }),
  ];
  for (const mol of variants) {
    const error = validateStructure(mol);
    assert.equal(error.code, 'INVALID');
    assert.equal(error.message, MESSAGES.INVALID);
    assert.equal(validateForNaming(mol).code, 'INVALID');
  }
}); // End of test 'INVALID: ids, endpoints, self-bonds, duplicate bonds, orders, elements'

test('structural errors take precedence over naming errors', () => {
  const mol = parseSmiles('C(C)(C)(C)C');
  addBond(mol, 1, addAtom(mol)); // atom 1 now has 5 bonds
  addAtom(mol); // and a loose piece
  assert.equal(validateForNaming(mol).code, 'VALENCE');
});
