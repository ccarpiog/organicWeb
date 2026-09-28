/**
 * @file Unit tests for the element palette (design.md §6.1, §6.3, §13 I-23):
 * the element tool of the DOM-free editor core places and changes C, O, N,
 * F, Cl, Br and I atoms with one undo step per gesture and element-specific
 * valence refusals; bond tools never change an element; heteroatoms are
 * always labelled with their implicit hydrogens and hit-testable on their
 * labels; the 90° view falls back for a molecule it cannot name.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEditorCore, EDIT_MESSAGES, ELEMENT_KEYS, addedAtoms, elementChangeMessage,
} from '../../src/editor/editor.js';
import { createMolecule, addAtom, addBond, moleculeToJSON } from '../../src/model/molecule.js';
import { ELEMENTS } from '../../src/model/elements.js';
import {
  atomLabel, atomLabelText, atomLabelPosition, bondEndCuts, LABEL_GAP,
} from '../../src/editor/render.js';
import {
  hitTest, onHeteroLabel, heteroLabelBox, HETERO_LABEL_HIT_PAD, BOND_LENGTH, ATOM_HIT_RADIUS,
} from '../../src/editor/geometry.js';
import { labelSize } from '../../src/editor/labels.js';
import { projectRightAngles, rightAngleNote, FALLBACK_NOTES } from '../../src/ui/canvasbar.js';
import { nameMolecule } from '../../src/naming/index.js';

/**
 * Builds a molecule from element symbols (atoms 1…n, 40 units apart on a
 * zigzag) and bonds `[a, b, order?]`.
 *
 * @param {string[]} elements - Element of each atom.
 * @param {Array<[number, number, number?]>} [bonds] - Bonds.
 * @returns {object} The molecule.
 */
function build(elements, bonds = []) {
  const mol = createMolecule();
  elements.forEach((element, i) => addAtom(mol, { x: 40 * i, y: 20 * (i % 2) }, element));
  for (const [a, b, order] of bonds) {
    addBond(mol, a, b, order || 1);
  }
  return mol;
}

/**
 * An editor core holding a molecule, with a list of the refusals it reports.
 *
 * @param {object} [mol] - The starting molecule (empty when omitted).
 * @returns {{editor: object, rejects: object[]}} The core and its refusals.
 */
function setup(mol) {
  const rejects = [];
  const editor = createEditorCore({ onReject: (r) => rejects.push(r) });
  if (mol) {
    editor.replaceMolecule(moleculeToJSON(mol));
  }
  return { editor, rejects };
}

/**
 * Presses and releases at a point without moving (a click).
 *
 * @param {object} editor - The editor core.
 * @param {{x: number, y: number}} point - Drawing coordinates.
 * @returns {object|null} The outcome.
 */
function clickAt(editor, point) {
  editor.pointerDown(point);
  return editor.pointerUp(point);
}

/**
 * Clicks on an atom's centre.
 *
 * @param {object} editor - The editor core.
 * @param {number} id - The atom.
 * @returns {object|null} The outcome.
 */
function clickAtom(editor, id) {
  const atom = editor.peekMolecule().atoms.get(id);
  return clickAt(editor, { x: atom.x, y: atom.y });
}

/**
 * Drags from one point to another.
 *
 * @param {object} editor - The editor core.
 * @param {{x: number, y: number}} from - Press point.
 * @param {{x: number, y: number}} to - Release point.
 * @returns {object|null} The outcome.
 */
function drag(editor, from, to) {
  editor.pointerDown(from);
  editor.pointerMove(to);
  return editor.pointerUp(to);
}

/**
 * Elements of the current molecule, by atom id order.
 *
 * @param {object} editor - The editor core.
 * @returns {string[]} The element symbols.
 */
function elementsOf(editor) {
  return editor.getMoleculeJSON().atoms.map((a) => a.element);
}

// ---------------------------------------------------------------- tool state

test('setElement picks the element tool; setTool("carbon") goes back to carbon; bad symbols throw', () => {
  const { editor } = setup();
  assert.equal(editor.getElement(), 'C');
  editor.setElement('Br');
  assert.equal(editor.getTool(), 'carbon');
  assert.equal(editor.getElement(), 'Br');
  editor.setTool('double');
  assert.equal(editor.getTool(), 'double');
  editor.setTool('carbon');
  assert.equal(editor.getElement(), 'C');
  assert.throws(() => editor.setElement('Na'), /unsupported element/);
  assert.throws(() => editor.setElement('cl'), /unsupported element/);
  assert.deepEqual(Object.values(ELEMENT_KEYS).sort(), [...ELEMENTS].sort(), 'one key per palette element');
});

// ---------------------------------------------------------------- placing

test('a click on empty space places a lone atom of each palette element, one undo step each', () => {
  const { editor } = setup();
  ELEMENTS.forEach((element, i) => {
    editor.setElement(element);
    const outcome = clickAt(editor, { x: 100 * i, y: 0 });
    assert.equal(outcome.ok, true, element);
  });
  assert.deepEqual(elementsOf(editor), [...ELEMENTS]);
  for (let i = ELEMENTS.length; i > 0; i -= 1) {
    assert.equal(editor.undo(), true);
    assert.equal(editor.getMoleculeJSON().atoms.length, i - 1);
  }
});

// ---------------------------------------------------------------- changing

test('a click on an atom of another element changes it: one chemical undo step', () => {
  const { editor } = setup(build(['C', 'C', 'C'], [[1, 2], [2, 3]]));
  const kinds = [];
  editor.onEdit((event) => kinds.push(event.kind));
  editor.setElement('O');
  const outcome = clickAtom(editor, 2);
  assert.equal(outcome.ok, true);
  assert.deepEqual(elementsOf(editor), ['C', 'O', 'C']);
  assert.equal(editor.getMoleculeJSON().bonds.length, 2, 'bonds untouched');
  assert.deepEqual(kinds, ['chemical']);
  editor.setElement('N');
  clickAtom(editor, 2);
  assert.deepEqual(elementsOf(editor), ['C', 'N', 'C']);
  assert.equal(editor.undo(), true);
  assert.deepEqual(elementsOf(editor), ['C', 'O', 'C'], 'undo restores the previous element');
  assert.equal(editor.undo(), true);
  assert.deepEqual(elementsOf(editor), ['C', 'C', 'C']);
  assert.equal(editor.redo(), true);
  assert.deepEqual(elementsOf(editor), ['C', 'O', 'C']);
  // The carbon button changes it back.
  editor.setTool('carbon');
  clickAtom(editor, 2);
  assert.deepEqual(elementsOf(editor), ['C', 'C', 'C']);
});

test('changing to an element whose valence the bonds exceed is refused in Spanish; nothing changes', () => {
  // Isobutane: the centre carbon has 3 bonds.
  const { editor, rejects } = setup(build(['C', 'C', 'C', 'C'], [[1, 2], [2, 3], [2, 4]]));
  const before = editor.getMoleculeJSON();
  editor.setElement('O');
  const outcome = clickAtom(editor, 2);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, 'No se puede cambiar a oxígeno: este átomo tiene 3 enlaces y el oxígeno solo admite 2.');
  assert.deepEqual(outcome.atoms, [2]);
  assert.equal(rejects.length, 1);
  assert.deepEqual(editor.getMoleculeJSON(), before);
  assert.equal(editor.canUndo(), false, 'a refusal records nothing');
  // N (3) fits; Cl (1) does not, even on a carbon with 2 bonds.
  editor.setElement('N');
  assert.equal(clickAtom(editor, 2).ok, true);
  const { editor: other } = setup(build(['C', 'C', 'C'], [[1, 2], [2, 3]]));
  other.setElement('Cl');
  assert.equal(clickAtom(other, 2).message, 'No se puede cambiar a cloro: este átomo tiene 2 enlaces y el cloro solo admite 1.');
  // A double bond counts twice: C=C to C=Cl is refused.
  const { editor: third } = setup(build(['C', 'C'], [[1, 2, 2]]));
  third.setElement('F');
  assert.equal(clickAtom(third, 2).ok, false);
  assert.equal(elementChangeMessage('I', 2), 'No se puede cambiar a yodo: este átomo tiene 2 enlaces y el yodo solo admite 1.');
});

test('a click on an atom of the same element grows a new atom of it; a full one is refused', () => {
  const { editor } = setup();
  editor.setElement('Cl');
  clickAt(editor, { x: 0, y: 0 });
  const grown = clickAtom(editor, 1);
  assert.equal(grown.ok, true);
  assert.deepEqual(elementsOf(editor), ['Cl', 'Cl']);
  assert.equal(editor.getMoleculeJSON().bonds[0].order, 1);
  const full = clickAtom(editor, 1);
  assert.equal(full.ok, false);
  assert.equal(full.message, 'Este cloro ya tiene 1 enlace.');
  editor.setTool('carbon');
  const { editor: carbon } = setup(build(['C']));
  carbon.setTool('carbon');
  clickAtom(carbon, 1);
  assert.deepEqual(elementsOf(carbon), ['C', 'C'], 'Carbono on a carbon still grows a carbon');
});

// ---------------------------------------------------------------- dragging

test('a drag with the element tool creates its new end atom with that element', () => {
  const { editor } = setup(build(['C', 'C'], [[1, 2]]));
  editor.setElement('N');
  const start = editor.peekMolecule().atoms.get(2);
  const outcome = drag(editor, { x: start.x, y: start.y }, { x: start.x + 60, y: start.y + 5 });
  assert.equal(outcome.ok, true);
  assert.deepEqual(elementsOf(editor), ['C', 'C', 'N']);
  assert.equal(editor.getMoleculeJSON().bonds.length, 2);
  assert.equal(editor.undo(), true);
  assert.deepEqual(elementsOf(editor), ['C', 'C'], 'one undo step');
  // From empty space: a carbon at the start, the element at the end.
  editor.setElement('Br');
  drag(editor, { x: 0, y: 200 }, { x: 60, y: 200 });
  assert.deepEqual(elementsOf(editor), ['C', 'C', 'C', 'Br']);
});

test('a drag with the element tool that ends on an existing atom only bonds it: no element changes', () => {
  const { editor } = setup(build(['C', 'C', 'C'], [[1, 2]]));
  editor.setElement('O');
  const a = editor.peekMolecule().atoms.get(1);
  const c = editor.peekMolecule().atoms.get(3);
  const outcome = drag(editor, { x: a.x, y: a.y }, { x: c.x, y: c.y });
  assert.equal(outcome.ok, true);
  assert.deepEqual(elementsOf(editor), ['C', 'C', 'C']);
  assert.equal(editor.getMoleculeJSON().bonds.length, 2);
  // A wobbly press on an atom (a drag back onto itself) never changes it either.
  const b = editor.peekMolecule().atoms.get(2);
  editor.pointerDown({ x: b.x, y: b.y });
  editor.pointerMove({ x: b.x + 20, y: b.y });
  const wobble = editor.pointerUp({ x: b.x + 2, y: b.y });
  assert.equal(wobble.ok, false);
  assert.equal(wobble.message, EDIT_MESSAGES.SELF);
  assert.deepEqual(elementsOf(editor), ['C', 'C', 'C']);
});

test('the drag preview of the element tool shows the new element, and no dot on a heteroatom start', () => {
  const { editor } = setup(build(['O']));
  editor.setElement('N');
  editor.pointerDown({ x: 0, y: 0 });
  editor.pointerMove({ x: 60, y: 0 });
  const preview = editor.getPreview();
  assert.equal(preview.type, 'bond');
  assert.equal(preview.element, 'N');
  assert.equal(preview.fromDot, false);
  editor.cancelGesture();
  editor.setTool('single');
  editor.pointerDown({ x: 200, y: 0 });
  editor.pointerMove({ x: 240, y: 0 });
  assert.equal(editor.getPreview().element, undefined, 'bond tools draw carbons');
  editor.cancelGesture();
});

// ---------------------------------------------------------------- bond tools

test('bond tools never change an element: a click on an O grows a carbon from it', () => {
  const { editor } = setup(build(['C', 'O'], [[1, 2]]));
  for (const tool of ['single', 'double', 'triple', 'cycle', 'erase']) {
    editor.setTool(tool);
    if (tool !== 'erase') {
      clickAtom(editor, 2);
    }
    assert.equal(editor.getMoleculeJSON().atoms.find((a) => a.id === 2).element, 'O', tool);
  }
  const json = editor.getMoleculeJSON();
  assert.deepEqual(json.atoms.map((a) => a.element), ['C', 'O', 'C'], 'only the single bond fitted: C-O-C');
});

test('C=O and C≡N with the existing bond tools, valence by element', () => {
  // Draw C-C, change the end to O, then Enlace doble on the bond: C=O.
  const { editor, rejects } = setup();
  editor.setTool('single');
  clickAt(editor, { x: 0, y: 0 });
  editor.setElement('O');
  clickAtom(editor, 2);
  editor.setTool('double');
  const bondAt = () => {
    const mol = editor.peekMolecule();
    const a = mol.atoms.get(1);
    const b = mol.atoms.get(2);
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  };
  assert.equal(clickAt(editor, bondAt()).ok, true);
  assert.equal(editor.getMoleculeJSON().bonds[0].order, 2);
  assert.equal(nameMolecule(editor.getMolecule()).name, 'metanal', 'a C=O is named since I-32');
  // Enlace triple on C=O: the oxygen would have 3 bonds.
  editor.setTool('triple');
  const refused = clickAt(editor, bondAt());
  assert.equal(refused.ok, false);
  assert.equal(refused.message, 'Este oxígeno ya tiene 2 enlaces.');
  // Cambiar enlace skips the triple bond: 2 → 1.
  editor.setTool('cycle');
  clickAt(editor, bondAt());
  assert.equal(editor.getMoleculeJSON().bonds[0].order, 1);
  // C≡N: a triple bond, then N on one end.
  const { editor: nitrile } = setup(build(['C', 'C'], [[1, 2, 3]]));
  nitrile.setElement('N');
  assert.equal(clickAtom(nitrile, 2).ok, true);
  assert.deepEqual(elementsOf(nitrile), ['C', 'N']);
  // …or Enlace triple on a C-N bond.
  const { editor: other } = setup(build(['C', 'N'], [[1, 2]]));
  other.setTool('triple');
  const a = other.peekMolecule().atoms.get(1);
  const b = other.peekMolecule().atoms.get(2);
  assert.equal(clickAt(other, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }).ok, true);
  assert.equal(other.getMoleculeJSON().bonds[0].order, 3);
  // C-Cl cannot change order at all.
  const { editor: halide } = setup(build(['C', 'Cl'], [[1, 2]]));
  halide.setTool('cycle');
  const p = halide.peekMolecule().atoms.get(1);
  const q = halide.peekMolecule().atoms.get(2);
  const stuck = clickAt(halide, { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
  assert.equal(stuck.message, EDIT_MESSAGES.NO_ORDER);
  assert.equal(rejects.length, 1);
});

test('refusals that may involve a heteroatom no longer say "carbono"', () => {
  for (const key of ['SELF', 'DUPLICATE', 'NO_ORDER', 'OVERLAP']) {
    assert.ok(!EDIT_MESSAGES[key].includes('carbono'), key);
    assert.ok(EDIT_MESSAGES[key].includes('átomo'), key);
  }
});

// ---------------------------------------------------------------- rendering and hit-testing

test('heteroatom labels: symbol plus implicit H in every mode; lone ones show their formula', () => {
  const ethanol = build(['C', 'C', 'O'], [[1, 2], [2, 3]]);
  const amine = build(['C', 'N'], [[1, 2]]);
  const imine = build(['C', 'N', 'C'], [[1, 2, 2], [2, 3]]);
  const acetone = build(['C', 'C', 'O', 'C'], [[1, 2], [2, 3, 2], [2, 4]]);
  const chloro = build(['C', 'Cl'], [[1, 2]]);
  for (const mode of ['skeletal', 'condensed']) {
    assert.equal(atomLabelText(ethanol, 3, mode), 'OH', mode);
    assert.equal(atomLabelText(amine, 2, mode), 'NH₂', mode);
    assert.equal(atomLabelText(imine, 2, mode), 'N', mode);
    assert.equal(atomLabelText(acetone, 3, mode), 'O', mode);
    assert.equal(atomLabelText(chloro, 2, mode), 'Cl', mode);
  }
  assert.equal(atomLabelText(build(['C', 'N', 'C'], [[1, 2], [2, 3]]), 2), 'NH');
  assert.equal(atomLabelText(ethanol, 2, 'skeletal'), null, 'carbons keep the skeletal drawing');
  assert.equal(atomLabelText(ethanol, 2, 'condensed'), 'CH₂');
  const lone = { O: 'H₂O', N: 'NH₃', F: 'HF', Cl: 'HCl', Br: 'HBr', I: 'HI', C: 'CH₄' };
  for (const [element, label] of Object.entries(lone)) {
    const mol = build([element]);
    assert.equal(atomLabel(mol, 1), label, element);
    assert.equal(atomLabelText(mol, 1, 'skeletal'), label, element);
    assert.deepEqual(atomLabelPosition(mol, 1, 'skeletal'), element === 'C' ? { x: 0, y: 16 } : { x: 0, y: 0 });
  }
});

test('bond strokes stop short of heteroatom labels in Esqueleto, of every label in Con carbonos', () => {
  const mol = build(['C', 'C', 'O'], [[1, 2], [2, 3]]);
  assert.deepEqual(bondEndCuts(mol, 1, 'skeletal'), [0, 0]);
  assert.deepEqual(bondEndCuts(mol, 2, 'skeletal'), [0, LABEL_GAP]);
  assert.deepEqual(bondEndCuts(mol, 1, 'condensed'), [LABEL_GAP, LABEL_GAP]);
});

test('hitTest: a click on a heteroatom label acts on the atom; the bond beyond it stays a bond', () => {
  const mol = createMolecule();
  const c = addAtom(mol, { x: 0, y: 0 });
  const n = addAtom(mol, { x: BOND_LENGTH, y: 0 }, 'N');
  addBond(mol, c, n, 1);
  const onLabel = { x: BOND_LENGTH + 14, y: 6 }; // Right end of "NH₂" (outside the atom's hit circle).
  assert.equal(onHeteroLabel(mol, mol.atoms.get(n), onLabel), true);
  assert.deepEqual(hitTest(mol, onLabel), { type: 'atom', id: n });
  assert.deepEqual(hitTest(mol, onLabel, { atomsOnly: true }), { type: 'atom', id: n });
  assert.equal(hitTest(mol, onLabel, { exclude: [n] }), null);
  assert.deepEqual(hitTest(mol, { x: 12 + 3, y: 0 }), { type: 'bond', id: 1 });
  assert.equal(onHeteroLabel(mol, mol.atoms.get(c), { x: 14, y: 0 }), false, 'bonded carbons have no label box');
});

test('heteroatom label hit boxes are sized to the drawn text (O < OH < NH₂)', () => {
  const mol = build(['C', 'O', 'C', 'N', 'O'], [[1, 2], [3, 4], [1, 5, 2]]);
  const box = (id) => heteroLabelBox(mol, mol.atoms.get(id));
  assert.equal(box(1), null, 'carbon has no heteroatom label box');
  assert.deepEqual(box(2), {
    halfWidth: labelSize('OH').width / 2 + HETERO_LABEL_HIT_PAD,
    halfHeight: labelSize('OH').height / 2 + HETERO_LABEL_HIT_PAD,
  });
  assert.ok(box(5).halfWidth < box(2).halfWidth, '"O" is narrower than "OH"');
  assert.ok(box(2).halfWidth < box(4).halfWidth, '"OH" is narrower than "NH₂"');
});

/**
 * Two bonded atoms `gap` units apart on a horizontal line, in an editor core.
 *
 * @param {string} first - Element of atom 1 (at x = 0).
 * @param {string} second - Element of atom 2 (at x = gap).
 * @param {number} gap - Distance between the atoms.
 * @returns {{editor: object, rejects: object[]}} The core and its refusals.
 */
function closePair(first, second, gap) {
  const mol = createMolecule();
  addAtom(mol, { x: 0, y: 0 }, first);
  addAtom(mol, { x: gap, y: 0 }, second);
  addBond(mol, 1, 2, 1);
  return setup(mol);
}

test('a bond between two close heteroatom labels stays targetable (O–O 30 units apart)', () => {
  const mid = { x: 15, y: 0 };
  let { editor } = closePair('O', 'O', 30);
  assert.deepEqual(hitTest(editor.peekMolecule(), mid), { type: 'bond', id: 1 });
  editor.setTool('double');
  clickAt(editor, mid);
  assert.deepEqual(editor.getMoleculeJSON().bonds.map((b) => b.order), [2]);
  assert.deepEqual(elementsOf(editor), ['O', 'O']);

  ({ editor } = closePair('O', 'O', 30));
  editor.setTool('erase');
  clickAt(editor, mid);
  assert.deepEqual(elementsOf(editor), ['O', 'O'], 'Borrar on the bond keeps both atoms');
  assert.equal(editor.getMoleculeJSON().bonds.length, 0);

  // The label text still stands for the atom: lower left of the first "OH".
  ({ editor } = closePair('O', 'O', 30));
  const onText = { x: -11, y: 7 };
  assert.ok(Math.hypot(onText.x, onText.y) > ATOM_HIT_RADIUS);
  editor.setTool('erase');
  clickAt(editor, onText);
  assert.deepEqual(elementsOf(editor), ['O']);
});

test('the visible stroke between "NH₂" and "Cl" 30 units apart is the bond; the Cl text is the Cl', () => {
  let { editor } = closePair('N', 'Cl', 30);
  const nEdge = heteroLabelBox(editor.peekMolecule(), editor.peekMolecule().atoms.get(1)).halfWidth;
  const clEdge = 30 - heteroLabelBox(editor.peekMolecule(), editor.peekMolecule().atoms.get(2)).halfWidth;
  assert.ok(nEdge < clEdge, 'part of the bond is visible between the labels');
  editor.setTool('erase');
  clickAt(editor, { x: (nEdge + clEdge) / 2, y: 0 });
  assert.deepEqual(elementsOf(editor), ['N', 'Cl']);
  assert.equal(editor.getMoleculeJSON().bonds.length, 0);

  ({ editor } = closePair('N', 'Cl', 30));
  const onCl = { x: 30 + 8.5, y: 9 };
  assert.ok(Math.hypot(onCl.x - 30, onCl.y) > ATOM_HIT_RADIUS);
  editor.setTool('erase');
  clickAt(editor, onCl);
  assert.deepEqual(elementsOf(editor), ['N']);
});

test('an OH close to its carbon: the bond midpoint takes the double-bond tool (C=O)', () => {
  const { editor } = closePair('C', 'O', 28);
  editor.setTool('double');
  clickAt(editor, { x: 14, y: 0 });
  assert.deepEqual(editor.getMoleculeJSON().bonds.map((b) => b.order), [2]);
  assert.deepEqual(elementsOf(editor), ['C', 'O']);
});

test('addedAtoms reports an element change (the 90° view rings it)', () => {
  const before = build(['C', 'C'], [[1, 2]]);
  const after = build(['C', 'O'], [[1, 2]]);
  assert.deepEqual(addedAtoms(before, after), [2]);
});

// ---------------------------------------------------------------- views that need a name

test('the 90° view draws named heteroatom molecules; one it cannot name falls back with a note', () => {
  const ethanol = build(['C', 'C', 'O'], [[1, 2], [2, 3]]);
  assert.equal(projectRightAngles(ethanol).ok, true);
  const water = projectRightAngles(build(['O']));
  assert.equal(water.reason, 'HETEROATOM');
  assert.equal(rightAngleNote(water), FALLBACK_NOTES.HETEROATOM);
});
