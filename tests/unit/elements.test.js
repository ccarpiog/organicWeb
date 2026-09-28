/**
 * @file Unit tests for the multi-element model (design.md §13.1, phase I-21):
 * neutral valences, implicit H and formulas per element, element-specific
 * valence errors, old and corrupted saves, size caps, and the "valid but not
 * nameable yet" path.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ELEMENTS, VALENCES, isSupportedElement, valenceOf } from '../../src/model/elements.js';
import {
  createMolecule, addAtom, addBond, implicitH, formula, formulaUnicode, moleculeToJSON, moleculeFromJSON, cloneMolecule,
} from '../../src/model/molecule.js';
import {
  validateStructure, validateForNaming, isNotNameableYet, valenceMessage, MESSAGES, TOO_MANY_ATOMS_MESSAGE,
  MAX_CARBONS, MAX_HEAVY_ATOMS, MAX_CHAIN,
} from '../../src/model/validate.js';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { nameMolecule } from '../../src/naming/index.js';
import { createEditorCore } from '../../src/editor/editor.js';
import { restoreDrawing, STORAGE_KEY } from '../../src/ui/autosave.js';

/**
 * Builds a molecule from a list of elements and a list of bonds (1-based
 * atom indexes), laying atoms out 40 units apart so the editor can click them.
 *
 * @param {string[]} elements - Element of each atom, in id order.
 * @param {number[][]} [bonds] - `[a, b]` or `[a, b, order]` triples.
 * @returns {object} The molecule.
 */
function build(elements, bonds = []) {
  const mol = createMolecule();
  elements.forEach((element, i) => addAtom(mol, { x: 40 * i, y: 40 * (i % 2) }, element));
  for (const [a, b, order] of bonds) {
    addBond(mol, a, b, order || 1);
  }
  return mol;
}

/**
 * A straight carbon chain of n atoms.
 *
 * @param {number} n - Number of carbons.
 * @returns {object} The molecule.
 */
function chain(n) {
  const elements = Array(n).fill('C');
  const bonds = [];
  for (let i = 1; i < n; i += 1) {
    bonds.push([i, i + 1]);
  }
  return build(elements, bonds);
}

test('one table of neutral valences: C 4, N 3, O 2, halogens 1', () => {
  assert.deepEqual(ELEMENTS, ['C', 'O', 'N', 'F', 'Cl', 'Br', 'I']);
  assert.deepEqual({ ...VALENCES }, { C: 4, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1 });
  for (const bad of ['H', 'Si', 'S', 'P', 'cl', 'CL', 'c', '', 'toString', 'constructor', null, undefined, 6, {}]) {
    assert.equal(isSupportedElement(bad), false, String(bad));
    assert.equal(valenceOf(bad), 0);
  }
  assert.throws(() => addAtom(createMolecule(), {}, 'Si'), /unsupported element/);
  assert.throws(() => addAtom(createMolecule(), {}, 'H'), /unsupported element/);
  const mol = createMolecule();
  assert.equal(mol.atoms.get(addAtom(mol)).element, 'C', 'carbon stays the default');
}); // End of test 'one table of neutral valences: C 4, N 3, O 2, halogens 1'

test('implicit hydrogens per element', () => {
  // Lone atoms: CH4, H2O, NH3, HF, HCl, HBr, HI.
  const lone = ELEMENTS.map((element) => implicitH(build([element]), 1));
  assert.deepEqual(lone, [4, 2, 3, 1, 1, 1, 1]);
  // Methanol CH3–OH, methylamine CH3–NH2, chloromethane CH3–Cl.
  assert.deepEqual([1, 2].map((id) => implicitH(build(['C', 'O'], [[1, 2]]), id)), [3, 1]);
  assert.deepEqual([1, 2].map((id) => implicitH(build(['C', 'N'], [[1, 2]]), id)), [3, 2]);
  assert.deepEqual([1, 2].map((id) => implicitH(build(['C', 'Cl'], [[1, 2]]), id)), [3, 0]);
  // Ethanal CH3–CH=O, hydrogen cyanide HC≡N, dimethyl ether, trimethylamine.
  assert.deepEqual([1, 2, 3].map((id) => implicitH(build(['C', 'C', 'O'], [[1, 2], [2, 3, 2]]), id)), [3, 1, 0]);
  assert.deepEqual([1, 2].map((id) => implicitH(build(['C', 'N'], [[1, 2, 3]]), id)), [1, 0]);
  assert.equal(implicitH(build(['C', 'O', 'C'], [[1, 2], [2, 3]]), 2), 0);
  assert.equal(implicitH(build(['N', 'C', 'C', 'C'], [[1, 2], [1, 3], [1, 4]]), 1), 0);
}); // End of test 'implicit hydrogens per element'

test('molecular formula in Hill order with the right hydrogens', () => {
  const cases = [
    [['O'], [], 'H2O'],
    [['N'], [], 'H3N'],
    [['Cl'], [], 'ClH'], // Hill order without carbon is alphabetical
    [['I'], [], 'HI'],
    [['C', 'O'], [[1, 2]], 'CH4O'],
    [['C', 'C', 'O'], [[1, 2], [2, 3]], 'C2H6O'],
    [['C', 'O', 'C'], [[1, 2], [2, 3]], 'C2H6O'],
    [['C', 'C', 'O'], [[1, 2], [2, 3, 2]], 'C2H4O'],
    [['C', 'C', 'O', 'O'], [[1, 2], [2, 3, 2], [2, 4]], 'C2H4O2'],
    [['C', 'N'], [[1, 2]], 'CH5N'],
    [['C', 'C', 'N'], [[1, 2], [2, 3, 3]], 'C2H3N'],
    [['C', 'Cl'], [[1, 2]], 'CH3Cl'],
    [['C', 'Cl', 'Cl', 'Cl', 'Cl'], [[1, 2], [1, 3], [1, 4], [1, 5]], 'CCl4'],
    [['C', 'Br', 'Cl', 'Cl'], [[1, 2], [1, 3], [1, 4]], 'CHBrCl2'],
    [['C', 'F', 'I'], [[1, 2], [1, 3]], 'CH2FI'],
    [['C', 'C', 'Br', 'N', 'O'], [[1, 2], [1, 3], [2, 4], [2, 5]], 'C2H6BrNO'],
  ];
  for (const [elements, bonds, expected] of cases) {
    assert.equal(formula(build(elements, bonds)), expected, expected);
  }
  assert.equal(formulaUnicode(build(['C', 'C', 'O'], [[1, 2], [2, 3]])), 'C₂H₆O');
  assert.equal(formula(parseSmiles('CCCCCCC')), 'C7H16', 'hydrocarbons unchanged');
}); // End of test 'molecular formula in Hill order with the right hydrogens'

test('valence errors name the element in Spanish', () => {
  const cases = [
    // O with three bonds, O with a triple bond.
    [['O', 'C', 'C', 'C'], [[1, 2], [1, 3], [1, 4]], 'Este oxígeno tendría más de 2 enlaces.', 'O'],
    [['O', 'C'], [[1, 2, 3]], 'Este oxígeno tendría más de 2 enlaces.', 'O'],
    // N with four bonds, N with a double + two singles.
    [['N', 'C', 'C', 'C', 'C'], [[1, 2], [1, 3], [1, 4], [1, 5]], 'Este nitrógeno tendría más de 3 enlaces.', 'N'],
    [['N', 'C', 'C', 'C'], [[1, 2, 2], [1, 3], [1, 4]], 'Este nitrógeno tendría más de 3 enlaces.', 'N'],
    // Halogens with two bonds or a double bond.
    [['Cl', 'C', 'C'], [[1, 2], [1, 3]], 'Este cloro tendría más de 1 enlace.', 'Cl'],
    [['F', 'C'], [[1, 2, 2]], 'Este flúor tendría más de 1 enlace.', 'F'],
    [['Br', 'C', 'C'], [[1, 2], [1, 3]], 'Este bromo tendría más de 1 enlace.', 'Br'],
    [['I', 'C'], [[1, 2, 3]], 'Este yodo tendría más de 1 enlace.', 'I'],
    // Carbon keeps the original message.
    [['C', 'C', 'C', 'C', 'C', 'C'], [[1, 2], [1, 3], [1, 4], [1, 5], [1, 6]], MESSAGES.VALENCE, 'C'],
  ];
  for (const [elements, bonds, message, element] of cases) {
    const error = validateStructure(build(elements, bonds));
    assert.equal(error.code, 'VALENCE', message);
    assert.equal(error.message, message);
    assert.equal(error.element, element);
    assert.deepEqual(error.atoms, [1]);
    assert.equal(isNotNameableYet(error), false, 'an invalid structure, not a "not yet"');
  }
  assert.equal(valenceMessage('C'), 'Este carbono tendría más de 4 enlaces.');
  // A full but not over-bonded heteroatom is fine.
  assert.equal(validateStructure(build(['O', 'C', 'C'], [[1, 2], [1, 3]])), null);
  assert.equal(validateStructure(build(['C', 'N'], [[1, 2, 3]])), null);
  assert.equal(validateStructure(build(['C', 'I'], [[1, 2]])), null);
}); // End of test 'valence errors name the element in Spanish'

test('old carbon-only saves restore unchanged', () => {
  // Exactly what v1 (phases I-1…I-20) wrote to localStorage for propene.
  const old = '{"version":1,"nextAtomId":4,"nextBondId":3,"atoms":[{"id":1,"element":"C","x":10,"y":20},'
    + '{"id":2,"element":"C","x":44.64,"y":0},{"id":3,"element":"C","x":79.28,"y":20}],'
    + '"bonds":[{"id":1,"a":1,"b":2,"order":2},{"id":2,"a":2,"b":3,"order":1}]}';
  const result = moleculeFromJSON(old);
  assert.equal(result.ok, true);
  assert.equal(JSON.stringify(moleculeToJSON(result.mol)), old);
  assert.equal(formula(result.mol), 'C3H6');
  assert.equal(nameMolecule(result.mol).name, 'propeno');
  // Through the autosave path too.
  const storage = new Map([[STORAGE_KEY, old]]);
  const fake = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) };
  const editor = createEditorCore();
  assert.equal(restoreDrawing(editor, fake), 'restored');
  assert.equal(JSON.stringify(editor.getMoleculeJSON()), old);
  // A save without `element` was never valid and still is not (no silent default).
  const noElement = JSON.parse(old);
  delete noElement.atoms[1].element;
  assert.equal(moleculeFromJSON(noElement).error.code, 'INVALID');
}); // End of test 'old carbon-only saves restore unchanged'

test('saves with heteroatoms round-trip through JSON, clone, autosave and undo', () => {
  const mol = build(['C', 'C', 'O', 'Cl', 'N', 'F', 'Br', 'I'], [[1, 2], [2, 3], [1, 4], [1, 5], [5, 6], [5, 7]]);
  addBond(mol, 2, addAtom(mol, { x: 400, y: 0 }, 'I'));
  const json = moleculeToJSON(mol);
  const back = moleculeFromJSON(JSON.stringify(json));
  assert.equal(back.ok, true);
  assert.deepEqual(moleculeToJSON(back.mol), json);
  assert.deepEqual(moleculeToJSON(cloneMolecule(mol)), json);

  const editor = createEditorCore();
  assert.equal(editor.replaceMolecule(json).ok, true);
  const before = editor.getMoleculeJSON();
  editor.setTool('carbon');
  const carbon = editor.peekMolecule().atoms.get(1);
  editor.pointerDown({ x: carbon.x, y: carbon.y });
  assert.equal(editor.pointerUp({ x: carbon.x, y: carbon.y }).ok, true, 'carbon 1 still has room');
  assert.notDeepEqual(editor.getMoleculeJSON(), before);
  editor.undo();
  assert.deepEqual(editor.getMoleculeJSON(), before, 'undo restores the heteroatoms');
  editor.redo();
  editor.undo();
  assert.deepEqual(editor.getMoleculeJSON(), before);
}); // End of test 'saves with heteroatoms round-trip through JSON, clone, autosave and undo'

test('corrupted saves: unknown elements, charges and radicals are never accepted', () => {
  const good = moleculeToJSON(build(['C', 'O'], [[1, 2]]));
  const withAtom = (patch) => ({ ...good, atoms: [{ ...good.atoms[0], ...patch }, good.atoms[1]] });
  const cases = [
    withAtom({ element: 'Xx' }),
    withAtom({ element: 'Si' }),
    withAtom({ element: 'H' }),
    withAtom({ element: 'cl' }),
    withAtom({ element: 'CL' }),
    withAtom({ element: '' }),
    withAtom({ element: null }),
    withAtom({ element: 6 }),
    withAtom({ element: ['C'] }),
    withAtom({ element: 'toString' }),
    withAtom({ charge: 1 }),
    withAtom({ charge: 0 }),
    withAtom({ charge: -1 }),
    withAtom({ radical: true }),
    withAtom({ radicals: 1 }),
    withAtom({ hCount: 2 }),
    withAtom({ isotope: 13 }),
    withAtom({ label: 'OH' }),
    { ...good, bonds: [{ ...good.bonds[0], aromatic: true }] },
    { ...good, bonds: [{ ...good.bonds[0], stereo: 'E' }] },
  ];
  for (const data of cases) {
    for (const input of [data, JSON.stringify(data)]) {
      const result = moleculeFromJSON(input);
      assert.equal(result.ok, false, JSON.stringify(data));
      assert.equal(result.error.code, 'INVALID');
      assert.equal(result.error.message, MESSAGES.INVALID);
    }
  }
  // An over-bonded heteroatom in a well-formed save is a VALENCE error.
  const over = moleculeToJSON(build(['C', 'O'], [[1, 2, 2]]));
  over.bonds[0].order = 3;
  assert.equal(moleculeFromJSON(over).error.code, 'VALENCE');
  // The in-memory check refuses charge or radical fields too.
  const charged = build(['C', 'N'], [[1, 2]]);
  charged.atoms.get(2).charge = 1;
  assert.equal(validateStructure(charged).code, 'INVALID');
  const radical = build(['C', 'O'], [[1, 2]]);
  radical.atoms.get(2).radical = 1;
  assert.equal(validateStructure(radical).code, 'INVALID');
  // A corrupt autosave is discarded, leaving an empty canvas.
  const storage = new Map([[STORAGE_KEY, JSON.stringify(cases[10])]]);
  const fake = { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) };
  const editor = createEditorCore();
  assert.equal(restoreDrawing(editor, fake), 'corrupt');
  assert.equal(storage.has(STORAGE_KEY), false);
  assert.equal(editor.getMoleculeJSON().atoms.length, 0);
}); // End of test 'corrupted saves: unknown elements, charges and radicals are never accepted'

test('a valid molecule with heteroatoms is "not nameable yet", never a crash or a hydrocarbon name', () => {
  const molecules = [
    build(['C', 'N', 'N'], [[1, 2], [2, 3]]), // metilhidrazina, N–N (amines such as metanamina are named since I-36)
    build(['C', 'O', 'O', 'O'], [[1, 2, 2], [1, 3], [1, 4]]), // ácido carbónico (aldehydes are named since I-32, acids since I-33, esters since I-35)
    build(['C', 'O', 'O', 'C'], [[1, 2], [2, 3], [3, 4]]), // a peroxide (ethers are named since I-34)
    build(['C', 'C', 'N'], [[1, 2], [2, 3, 3]]), // etanonitrilo
    build(['C', 'C', 'N', 'Cl'], [[1, 2], [2, 3, 3], [1, 4]]), // cloroetanonitrilo: a halogen does not lift the refusal
    build(['O']), // agua
    build(['Br', 'Br'], [[1, 2]]), // a halogen bonded to no carbon
    build(['Cl']),
  ];
  for (const mol of molecules) {
    assert.equal(validateStructure(mol), null, 'the structure itself is valid');
    const error = validateForNaming(mol);
    assert.equal(error.code, 'HETEROATOM');
    assert.equal(error.message, MESSAGES.HETEROATOM);
    assert.ok(isNotNameableYet(error));
    const result = nameMolecule(mol);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'HETEROATOM');
    assert.equal(result.name, undefined);
  }
  assert.deepEqual(validateForNaming(build(['C', 'C', 'N', 'Cl'], [[1, 2], [2, 3, 3], [1, 4]])).atoms, [3, 4]);
  // Amines are named since I-36: 2-cloroetan-1-amina.
  assert.equal(nameMolecule(build(['C', 'C', 'N', 'Cl'], [[1, 2], [2, 3], [1, 4]])).name, '2-cloroetan-1-amina');
  assert.match(MESSAGES.HETEROATOM, /Aún no sé nombrar/);
  // Rings are "not yet" too; empty, disconnected and valence problems are not.
  assert.ok(isNotNameableYet(validateForNaming(build(['C', 'C', 'O'], [[1, 2], [2, 3], [3, 1]]))));
  assert.equal(isNotNameableYet(validateForNaming(createMolecule())), false);
  assert.equal(isNotNameableYet(validateForNaming(build(['C', 'O']))), false);
  assert.equal(isNotNameableYet(null), false);
  // Hydrocarbons are still named, and so are halogen derivatives (I-30) and alcohols (I-31).
  assert.equal(nameMolecule(parseSmiles('CC(C)C')).name, '2-metilpropano');
  assert.equal(nameMolecule(build(['C', 'O'], [[1, 2]])).name, 'metanol');
  assert.equal(nameMolecule(build(['C', 'C', 'O', 'Cl'], [[1, 2], [2, 3], [1, 4]])).name, '2-cloroetan-1-ol');
  assert.equal(validateForNaming(build(['C', 'Cl', 'Cl', 'Cl', 'Cl'], [[1, 2], [1, 3], [1, 4], [1, 5]])), null);
  assert.equal(nameMolecule(build(['C', 'Cl', 'Cl', 'Cl', 'Cl'], [[1, 2], [1, 3], [1, 4], [1, 5]])).name, 'tetraclorometano');
  // The SMILES writer keeps the element (never writes a heteroatom as C).
  assert.equal(writeSmiles(build(['C', 'O'], [[1, 2]])), 'CO');
}); // End of test 'a valid molecule with heteroatoms is "not nameable yet", never a crash or a hydrocarbon name'

test('separate caps: carbons, heavy atoms and parent chain', () => {
  assert.equal(MAX_CARBONS, 60);
  assert.equal(MAX_HEAVY_ATOMS, 80);
  assert.equal(MAX_CHAIN, 30);
  // 30 carbons + 50 chlorines = 80 heavy atoms: within the caps (a halogen derivative, named since I-30).
  const mol = chain(30);
  let added = 0;
  for (let c = 1; c <= 30 && added < 50; c += 1) {
    const room = implicitH(mol, c);
    for (let k = 0; k < room && added < 50; k += 1) {
      addBond(mol, c, addAtom(mol, {}, 'Cl'));
      added += 1;
    }
  }
  assert.equal(mol.atoms.size, 80);
  assert.equal(validateForNaming(mol), null);
  addBond(mol, 30, addAtom(mol, {}, 'Cl'));
  const tooMany = validateForNaming(mol);
  assert.equal(tooMany.code, 'TOO_BIG');
  assert.equal(tooMany.message, TOO_MANY_ATOMS_MESSAGE);
  // The carbon cap still counts carbons only, with the same message as before.
  const long = chain(30);
  for (let c = 2; c <= 29; c += 1) {
    addBond(long, c, addAtom(long));
  }
  addBond(long, 2, addAtom(long));
  addBond(long, 29, addAtom(long));
  assert.equal(long.atoms.size, 60);
  assert.equal(validateForNaming(long), null);
  addBond(long, 1, addAtom(long, {}, 'N'), 3);
  assert.equal(validateForNaming(long).code, 'HETEROATOM', '60 carbons + 1 nitrile N: carbon cap not reached');
  addBond(long, 30, addAtom(long));
  const tooBig = validateForNaming(long);
  assert.equal(tooBig.code, 'TOO_BIG');
  assert.equal(tooBig.message, MESSAGES.TOO_BIG);
}); // End of test 'separate caps: carbons, heavy atoms and parent chain'

test('editor refusals name the full heteroatom', () => {
  const editor = createEditorCore();
  editor.replaceMolecule(moleculeToJSON(build(['C', 'O', 'C', 'Cl'], [[1, 2], [2, 3], [3, 4]])));
  const before = editor.getMoleculeJSON();
  editor.setTool('single'); // A bond tool grows a carbon: never changes the clicked element.
  for (const [id, message] of [[2, 'Este oxígeno ya tiene 2 enlaces.'], [4, 'Este cloro ya tiene 1 enlace.']]) {
    const atom = editor.peekMolecule().atoms.get(id);
    editor.pointerDown({ x: atom.x, y: atom.y });
    const outcome = editor.pointerUp({ x: atom.x, y: atom.y });
    assert.equal(outcome.ok, false);
    assert.equal(outcome.message, message);
    assert.deepEqual(editor.getMoleculeJSON(), before);
  }
}); // End of test 'editor refusals name the full heteroatom'
