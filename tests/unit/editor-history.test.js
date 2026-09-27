/**
 * @file Unit tests for src/editor/history.js and the DOM-free editor core
 * (src/editor/editor.js): every gesture type commits one undoable
 * transaction, undo/redo restore it exactly, cancel restores the starting
 * state, and refused edits leave the molecule untouched (design.md §6.1).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistory } from '../../src/editor/history.js';
import { createEditorCore, EDIT_MESSAGES } from '../../src/editor/editor.js';
import { bondOrderSum } from '../../src/model/molecule.js';
import { angleBetween, toDegrees, normalizeAngle, BOND_LENGTH, ATOM_HIT_RADIUS, distance } from '../../src/editor/geometry.js';

/**
 * Summary of a molecule for assertions: atom ids and bonds as "a-b:order".
 *
 * @param {object} editor - The editor core.
 * @returns {{atoms: number[], bonds: string[]}} The summary.
 */
function shape(editor) {
  const json = editor.getMoleculeJSON();
  return { atoms: json.atoms.map((a) => a.id), bonds: json.bonds.map((b) => `${b.a}-${b.b}:${b.order}`) };
}

/**
 * Clicks at a point (press and release without moving).
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
 * Clicks on an atom.
 *
 * @param {object} editor - The editor core.
 * @param {number} id - Atom id.
 * @returns {object|null} The outcome.
 */
function clickAtom(editor, id) {
  const atom = editor.peekMolecule().atoms.get(id);
  return clickAt(editor, { x: atom.x, y: atom.y });
}

/**
 * Clicks on the midpoint of a bond.
 *
 * @param {object} editor - The editor core.
 * @param {number} id - Bond id.
 * @returns {object|null} The outcome.
 */
function clickBond(editor, id) {
  const mol = editor.peekMolecule();
  const bond = mol.bonds.get(id);
  const a = mol.atoms.get(bond.a);
  const b = mol.atoms.get(bond.b);
  return clickAt(editor, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
}

/**
 * Drags from one point to another.
 *
 * @param {object} editor - The editor core.
 * @param {{x: number, y: number}} from - Start.
 * @param {{x: number, y: number}} to - End.
 * @returns {object|null} The outcome.
 */
function drag(editor, from, to) {
  editor.pointerDown(from);
  editor.pointerMove({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
  editor.pointerMove(to);
  return editor.pointerUp(to);
}

/**
 * Runs a gesture and checks that it is exactly one undo step: undo restores
 * the previous state, redo the new one.
 *
 * @param {object} editor - The editor core.
 * @param {function(): void} gesture - Performs the gesture.
 * @returns {object} The molecule JSON after the gesture.
 */
function assertOneStep(editor, gesture) {
  const before = editor.getMoleculeJSON();
  gesture();
  const after = editor.getMoleculeJSON();
  assert.notDeepEqual(after, before, 'the gesture changed nothing');
  assert.ok(editor.undo());
  assert.deepEqual(editor.getMoleculeJSON(), before);
  assert.ok(editor.redo());
  assert.deepEqual(editor.getMoleculeJSON(), after);
  return after;
}

test('history records, undoes, redoes and drops redo on a new record', () => {
  const history = createHistory({ limit: 2 });
  assert.equal(history.canUndo(), false);
  assert.equal(history.undo(), null);
  history.record('s0', 's1');
  history.record('s1', 's2');
  history.record('s2', 's3');
  assert.equal(history.size(), 2, 'oldest entry dropped beyond the limit');
  assert.equal(history.undo().before, 's2');
  assert.equal(history.canRedo(), true);
  assert.equal(history.redo().after, 's3');
  history.undo();
  history.record('s2', 'x');
  assert.equal(history.canRedo(), false);
  history.clear();
  assert.equal(history.canUndo(), false);
});

test('a redraw recorded with canvas views hands them back on undo and redo (Ordenar dibujo)', () => {
  const history = createHistory();
  history.record('s0', 's1');
  history.record('s1', 's2', 'redraw', { before: 'v0', after: 'v1' });
  assert.deepEqual(history.undo().view, { before: 'v0', after: 'v1' });
  assert.deepEqual(history.redo().view, { before: 'v0', after: 'v1' });
  history.undo();
  assert.equal(history.undo().view, undefined, 'entries without views carry none');

  const events = [];
  const editor = createEditorCore({ onChange: (e) => events.push(e) });
  clickAt(editor, { x: 0, y: 0 });
  const drawn = editor.getMoleculeJSON();
  const viewBefore = { scale: 1, x: 0, y: 0 };
  const viewAfter = { scale: 1.5, x: 40, y: -20 };
  const positions = new Map(drawn.atoms.map((a) => [a.id, { x: a.x + 100, y: a.y + 50 }]));
  assert.ok(editor.setCoordinates(positions, { view: { before: viewBefore, after: viewAfter } }).changed);
  const moved = editor.getMoleculeJSON();
  assert.deepEqual(events.at(-1), { reason: 'edit', kind: 'coordinates', view: viewAfter });
  assert.ok(editor.undo());
  assert.deepEqual(editor.getMoleculeJSON(), drawn, 'one undo brings the drawn coordinates back exactly');
  assert.deepEqual(events.at(-1), { reason: 'undo', kind: 'coordinates', view: viewBefore });
  assert.ok(editor.redo());
  assert.deepEqual(editor.getMoleculeJSON(), moved);
  assert.deepEqual(events.at(-1), { reason: 'redo', kind: 'coordinates', view: viewAfter });
  editor.undo();
  editor.undo();
  assert.deepEqual(events.at(-1), { reason: 'undo', kind: 'chemical' }, 'other edits carry no view');
});

test('Carbono: click on empty space draws methane; click on an atom grows it', () => {
  const editor = createEditorCore();
  editor.setTool('carbon');
  assertOneStep(editor, () => clickAt(editor, { x: 100, y: 100 }));
  assert.deepEqual(shape(editor), { atoms: [1], bonds: [] });
  assertOneStep(editor, () => clickAtom(editor, 1));
  assert.deepEqual(shape(editor), { atoms: [1, 2], bonds: ['1-2:1'] });
});

test('bond tools: click empty makes a fragment, click atom grows with that order', () => {
  const editor = createEditorCore();
  assert.equal(editor.getTool(), 'single');
  editor.setTool('double');
  assertOneStep(editor, () => clickAt(editor, { x: 100, y: 100 }));
  assert.deepEqual(shape(editor), { atoms: [1, 2], bonds: ['1-2:2'] });
  editor.setTool('triple');
  // Atom 1 has a double bond: a triple would exceed valence.
  const refused = clickAtom(editor, 1);
  assert.equal(refused.ok, false);
  editor.setTool('single');
  assertOneStep(editor, () => clickAtom(editor, 2));
  assert.deepEqual(shape(editor), { atoms: [1, 2, 3], bonds: ['1-2:2', '2-3:1'] });
});

test('bond tools: click on a bond sets its order; Cambiar enlace cycles skipping invalid orders', () => {
  const editor = createEditorCore();
  clickAt(editor, { x: 100, y: 100 });
  clickAtom(editor, 2);
  clickAtom(editor, 3); // butane-like chain 1-2-3-4
  editor.setTool('double');
  assertOneStep(editor, () => clickBond(editor, 2));
  assert.deepEqual(shape(editor).bonds, ['1-2:1', '2-3:2', '3-4:1']);
  // Same order again: no transaction.
  const depth = editor.canUndo();
  const outcome = clickBond(editor, 2);
  assert.equal(outcome.changed, false);
  assert.equal(editor.canUndo(), depth);

  editor.setTool('cycle');
  assertOneStep(editor, () => clickBond(editor, 2));
  assert.deepEqual(shape(editor).bonds, ['1-2:1', '2-3:3', '3-4:1']);
  // Triple bond straightened the linear centres to 180°.
  const mol = editor.peekMolecule();
  const angle = (p, c, q) => {
    const d = Math.abs(angleBetween(mol.atoms.get(c), mol.atoms.get(p)) - angleBetween(mol.atoms.get(c), mol.atoms.get(q)));
    return Math.round(toDegrees(d > Math.PI ? 2 * Math.PI - d : d));
  };
  assert.equal(angle(1, 2, 3), 180);
  assert.equal(angle(2, 3, 4), 180);
  assertOneStep(editor, () => clickBond(editor, 2));
  assert.deepEqual(shape(editor).bonds, ['1-2:1', '2-3:1', '3-4:1']);

  // 1=2 with 2 also bonded to 3 by a triple: 2 has no room; cycling 1-2 skips 2 and 3 → refused.
  editor.setTool('triple');
  clickBond(editor, 2);
  editor.setTool('cycle');
  const stuck = clickBond(editor, 1);
  assert.equal(stuck.ok, false);
  assert.equal(stuck.message, EDIT_MESSAGES.NO_ORDER);
});

test('Cambiar enlace skips an order that breaks valence (2 → 1 instead of 3)', () => {
  const editor = createEditorCore();
  clickAt(editor, { x: 100, y: 100 });
  clickAtom(editor, 2);
  clickAtom(editor, 2); // atom 2 now has three neighbours
  editor.setTool('double');
  clickBond(editor, 1); // 1=2: atom 2 is full (2 + 1 + 1)
  editor.setTool('cycle');
  clickBond(editor, 1);
  assert.equal(editor.peekMolecule().bonds.get(1).order, 1);
});

test('drag from an atom: new carbon in the 30°-snapped direction; release on an atom bonds them', () => {
  const editor = createEditorCore();
  clickAt(editor, { x: 100, y: 100 }); // atoms 1, 2
  const a1 = editor.peekMolecule().atoms.get(1);
  // 45 units of drag: one bond (a longer Enlace simple drag draws a chain, editor-extras tests).
  const after = assertOneStep(editor, () => drag(editor, a1, { x: a1.x + 5, y: a1.y + 45 }));
  const a3 = after.atoms.find((a) => a.id === 3);
  const direction = Math.round(toDegrees(normalizeAngle(angleBetween(a1, a3))));
  assert.equal(direction, 90);
  assert.ok(Math.abs(Math.hypot(a3.x - a1.x, a3.y - a1.y) - BOND_LENGTH) < 1e-9);

  // Release on atom 3 from atom 2: closes a ring (allowed while drawing).
  const a2 = editor.peekMolecule().atoms.get(2);
  assertOneStep(editor, () => drag(editor, a2, editor.peekMolecule().atoms.get(3)));
  assert.deepEqual(shape(editor).bonds, ['1-2:1', '1-3:1', '2-3:1']);
  // Duplicate bond refused.
  const dup = drag(editor, editor.peekMolecule().atoms.get(1), editor.peekMolecule().atoms.get(2));
  assert.equal(dup.ok, false);
  assert.equal(dup.message, EDIT_MESSAGES.DUPLICATE);
});

test('drag from empty space makes a two-carbon fragment; dragging back onto the start atom is a refused self-bond', () => {
  const editor = createEditorCore();
  editor.setTool('triple');
  assertOneStep(editor, () => drag(editor, { x: 50, y: 50 }, { x: 150, y: 52 }));
  assert.deepEqual(shape(editor), { atoms: [1, 2], bonds: ['1-2:3'] });
  const a1 = editor.peekMolecule().atoms.get(1);
  editor.pointerDown(a1);
  editor.pointerMove({ x: a1.x + 30, y: a1.y });
  const self = editor.pointerUp({ x: a1.x + 1, y: a1.y });
  assert.equal(self.ok, false);
  assert.equal(self.message, EDIT_MESSAGES.SELF);
});

test('Borrar: an atom with its bonds; a bond alone (its end carbons stay)', () => {
  const editor = createEditorCore();
  clickAt(editor, { x: 100, y: 100 });
  clickAtom(editor, 2);
  clickAtom(editor, 3); // 1-2-3-4
  editor.setTool('erase');
  assertOneStep(editor, () => clickAtom(editor, 4));
  assert.deepEqual(shape(editor), { atoms: [1, 2, 3], bonds: ['1-2:1', '2-3:1'] });
  assertOneStep(editor, () => clickBond(editor, 1));
  assert.deepEqual(shape(editor), { atoms: [1, 2, 3], bonds: ['2-3:1'] });
  // Ids are never reused after deletion + undo/redo.
  editor.setTool('carbon');
  clickAt(editor, { x: 400, y: 400 });
  assert.deepEqual(shape(editor).atoms, [1, 2, 3, 5]);
});

test('Borrar on a bond keeps carbons that were placed on their own', () => {
  const editor = createEditorCore();
  editor.setTool('carbon');
  clickAt(editor, { x: 100, y: 100 });
  clickAt(editor, { x: 200, y: 100 });
  editor.setTool('single');
  drag(editor, { x: 100, y: 100 }, { x: 200, y: 100 });
  assert.deepEqual(shape(editor), { atoms: [1, 2], bonds: ['1-2:1'] });
  editor.setTool('erase');
  assertOneStep(editor, () => clickBond(editor, 1));
  assert.deepEqual(shape(editor), { atoms: [1, 2], bonds: [] });
});

test('Limpiar and loadMolecule are single undoable transactions', () => {
  const editor = createEditorCore();
  clickAt(editor, { x: 100, y: 100 });
  assertOneStep(editor, () => editor.clear());
  assert.deepEqual(shape(editor), { atoms: [], bonds: [] });
  assert.equal(editor.clear().changed, false);
  editor.undo();
  const json = editor.getMoleculeJSON();
  const other = createEditorCore();
  assertOneStep(other, () => other.loadMolecule(json));
  assert.deepEqual(other.getMoleculeJSON().bonds, json.bonds);
  assert.equal(other.loadMolecule({ version: 99 }).ok, false);
});

test('cancel (Esc / pointer cancel) mid-drag restores the starting state and records nothing', () => {
  const editor = createEditorCore();
  clickAt(editor, { x: 100, y: 100 });
  const before = editor.getMoleculeJSON();
  const a1 = editor.peekMolecule().atoms.get(1);
  editor.pointerDown(a1);
  editor.pointerMove({ x: a1.x, y: a1.y + 80 });
  assert.ok(editor.getPreview(), 'a drag shows a preview');
  assert.equal(editor.cancelGesture(), true);
  assert.equal(editor.getPreview(), null);
  assert.equal(editor.pointerUp({ x: a1.x, y: a1.y + 80 }), null);
  assert.deepEqual(editor.getMoleculeJSON(), before);
  assert.equal(editor.cancelGesture(), false);
  editor.undo();
  assert.deepEqual(shape(editor), { atoms: [], bonds: [] }, 'only the first click was recorded');
});

test('a fifth bond on a carbon is refused with a Spanish message and nothing changes', () => {
  const rejections = [];
  const editor = createEditorCore({ onReject: (r) => rejections.push(r) });
  editor.setTool('carbon');
  clickAt(editor, { x: 200, y: 200 });
  for (let i = 0; i < 4; i += 1) {
    clickAtom(editor, 1);
  }
  assert.equal(bondOrderSum(editor.peekMolecule(), 1), 4);
  const before = editor.getMoleculeJSON();
  const outcome = clickAtom(editor, 1);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, 'Este carbono ya tiene 4 enlaces.');
  assert.deepEqual(outcome.atoms, [1]);
  assert.deepEqual(rejections.map((r) => r.message), ['Este carbono ya tiene 4 enlaces.']);
  assert.deepEqual(editor.getMoleculeJSON(), before);
});

test('setTool rejects unknown tools and notifies listeners', () => {
  const reasons = [];
  const editor = createEditorCore({ onChange: (e) => reasons.push(e.reason) });
  editor.setTool('erase');
  assert.throws(() => editor.setTool('lasso'), /unknown tool/);
  assert.deepEqual(reasons, ['tool']);
});

/**
 * Asserts that no two atoms of the editor's molecule are within the atom hit radius.
 *
 * @param {object} editor - The editor core.
 * @returns {void}
 */
function assertNoCoincidentAtoms(editor) {
  const atoms = editor.getMoleculeJSON().atoms;
  for (let i = 0; i < atoms.length; i += 1) {
    for (let j = i + 1; j < atoms.length; j += 1) {
      assert.ok(distance(atoms[i], atoms[j]) >= ATOM_HIT_RADIUS, `atoms ${atoms[i].id} and ${atoms[j].id} overlap`);
    }
  }
}

/**
 * Loads a molecule given as atoms `[id, x, y]` and bonds `[a, b, order]`.
 *
 * @param {object} editor - The editor core.
 * @param {number[][]} atoms - Atoms.
 * @param {number[][]} bonds - Bonds.
 * @returns {void}
 */
function load(editor, atoms, bonds) {
  editor.loadMolecule({
    version: 1,
    atoms: atoms.map(([id, x, y]) => ({ id, element: 'C', x, y })),
    bonds: bonds.map(([a, b, order], i) => ({ id: i + 1, a, b, order })),
  });
}

test('dragging past an already bonded atom never puts a new carbon on top of it', () => {
  const editor = createEditorCore();
  clickAt(editor, { x: 100, y: 100 }); // A(1)–B(2), B up-right of A
  const a = editor.peekMolecule().atoms.get(1);
  const b = editor.peekMolecule().atoms.get(2);
  // Release just beyond B, slightly off the A→B axis (not on B, and short
  // enough to be a one-bond drag): the snapped end is exactly B.
  const ux = (b.x - a.x) / BOND_LENGTH;
  const uy = (b.y - a.y) / BOND_LENGTH;
  const beyond = { x: a.x + ux * 51 - uy * 8, y: a.y + uy * 51 + ux * 8 };
  assert.ok(distance(beyond, b) > ATOM_HIT_RADIUS);
  editor.pointerDown(a);
  editor.pointerMove(beyond);
  assert.deepEqual(editor.getPreview().to, { x: b.x, y: b.y }, 'the preview points at B');
  const outcome = editor.pointerUp(beyond);
  assert.equal(outcome.ok, true);
  // A–B already exists, so a new carbon grows from A at a free angle instead.
  assert.deepEqual(shape(editor), { atoms: [1, 2, 3], bonds: ['1-2:1', '1-3:1'] });
  assertNoCoincidentAtoms(editor);
});

test('a snapped drag end on an unbonded atom joins it', () => {
  const editor = createEditorCore();
  load(editor, [[1, 0, 0], [2, 40, 0]], []);
  editor.pointerDown({ x: 0, y: 0 });
  // Off atom 2 (beyond its hit radius) but short enough to be a one-bond drag.
  editor.pointerMove({ x: 51, y: 8 });
  editor.pointerUp({ x: 51, y: 8 });
  assert.deepEqual(shape(editor), { atoms: [1, 2], bonds: ['1-2:1'] });
});

test('straightening avoids landing on an atom, and refuses when both sides would collide', () => {
  const h = 40 * Math.sin(Math.PI / 3);
  // C(1) with X(2) at 180° and Y(3) at 60°; a loose atom Z(4) sits where Y would go at 0°.
  const editor = createEditorCore();
  load(editor, [[1, 0, 0], [2, -40, 0], [3, 20, h], [4, 40, 0]], [[1, 2, 1], [1, 3, 1]]);
  editor.setTool('triple');
  assert.equal(clickBond(editor, 2).ok, true);
  const mol = editor.peekMolecule();
  const angle = Math.abs(angleBetween(mol.atoms.get(1), mol.atoms.get(2)) - angleBetween(mol.atoms.get(1), mol.atoms.get(3)));
  assert.equal(Math.round(toDegrees(angle > Math.PI ? 2 * Math.PI - angle : angle)), 180);
  assert.deepEqual(mol.atoms.get(4), { id: 4, element: 'C', x: 40, y: 0 });
  assertNoCoincidentAtoms(editor);

  // Also block X's alternative spot: no straightening is possible without overlap.
  const blocked = createEditorCore();
  load(blocked, [[1, 0, 0], [2, -40, 0], [3, 20, h], [4, 40, 0], [5, -20, -h]], [[1, 2, 1], [1, 3, 1]]);
  const before = blocked.getMoleculeJSON();
  blocked.setTool('triple');
  const outcome = clickBond(blocked, 2);
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, EDIT_MESSAGES.OVERLAP);
  assert.deepEqual(blocked.getMoleculeJSON(), before);
});
