/**
 * @file Unit tests for the editor extras (design.md §6.1, §6.3): the zigzag
 * generator and the Enlace simple chain drag, carbon label text in both display modes, the view
 * arithmetic, keyboard shortcuts, chemical vs coordinate edit events, the
 * Mover marquee, the formula line and the autosave helpers.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMolecule, addAtom, addBond, moleculeToJSON } from '../../src/model/molecule.js';
import { parseSmiles } from '../../src/model/smiles.js';
import {
  BOND_LENGTH, CHAIN_STEP, LONE_LABEL_OFFSET, chainPoints, chooseChainSide, distance, angleBetween, toDegrees, normalizeAngle,
} from '../../src/editor/geometry.js';
import {
  atomLabelText, atomLabelPosition, showsCarbonDots, CARBON_DOT_RADIUS,
  carbonLabel, trimSegment, zoomView, panView, fitView, clampZoom, MIN_ZOOM, MAX_ZOOM,
  rectFromCorners, IDENTITY_VIEW,
} from '../../src/editor/render.js';
import { createEditorCore, shortcutFor, editKind, TOOLS } from '../../src/editor/editor.js';
import { formulaText } from '../../src/ui/canvasbar.js';
import {
  restoreDrawing, startAutosave, getStorage, readItem, writeItem, STORAGE_KEY,
} from '../../src/ui/autosave.js';

/**
 * Angle at `b` between a and c, in whole degrees.
 *
 * @param {{x: number, y: number}} a - First point.
 * @param {{x: number, y: number}} b - Vertex.
 * @param {{x: number, y: number}} c - Third point.
 * @returns {number} The angle.
 */
function angleAt(a, b, c) {
  let d = Math.abs(toDegrees(normalizeAngle(angleBetween(b, a) - angleBetween(b, c))));
  if (d > 180) {
    d = 360 - d;
  }
  return Math.round(d);
}

/**
 * Parses SMILES and gives the atoms distinct coordinates (atom i at
 * (100 + 40·i, 100)), so the editor accepts the molecule.
 *
 * @param {string} smiles - The SMILES.
 * @returns {object} The molecule, with coordinates.
 */
function placed(smiles) {
  const mol = parseSmiles(smiles);
  for (const atom of mol.atoms.values()) {
    atom.x = 100 + 40 * atom.id;
    atom.y = 100;
  }
  return mol;
}

/**
 * Presses, drags and releases in an editor core.
 *
 * @param {object} editor - The editor core.
 * @param {{x: number, y: number}} from - Start (drawing units).
 * @param {{x: number, y: number}} to - End (drawing units).
 * @returns {object|null} The pointerUp() outcome.
 */
function drag(editor, from, to) {
  editor.pointerDown(from);
  editor.pointerMove(to);
  return editor.pointerUp(to);
}

/**
 * A Map-backed stand-in for localStorage.
 *
 * @param {Record<string, string>} [initial] - Initial content.
 * @returns {{getItem: Function, setItem: Function, removeItem: Function, data: Map<string, string>}} The storage.
 */
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

// ---------------------------------------------------------------- chain

test('chainPoints: bond count follows the drag length projected on the snapped axis', () => {
  const start = { x: 100, y: 100 };
  for (const bonds of [1, 2, 4, 7]) {
    const result = chainPoints(start, { x: 100 + bonds * CHAIN_STEP, y: 100 });
    assert.equal(result.bonds, bonds);
    assert.equal(result.points.length, bonds + 1);
    assert.deepEqual(result.points[0], start);
  }
  // A tiny drag still makes one bond; the cap is respected.
  assert.equal(chainPoints(start, { x: 101, y: 100 }).bonds, 1);
  assert.equal(chainPoints(start, { x: 100 + 50 * CHAIN_STEP, y: 100 }, { maxBonds: 10 }).bonds, 10);
});

test('chainPoints: a 120° zigzag of fixed-length bonds, first bond up for a rightward drag', () => {
  const { points } = chainPoints({ x: 0, y: 0 }, { x: 5 * CHAIN_STEP, y: 3 });
  for (let i = 1; i < points.length; i += 1) {
    assert.ok(Math.abs(distance(points[i - 1], points[i]) - BOND_LENGTH) < 1e-9);
  }
  for (let i = 1; i < points.length - 1; i += 1) {
    assert.equal(angleAt(points[i - 1], points[i], points[i + 1]), 120);
  }
  assert.ok(points[1].y < 0, 'side 1 puts the first bond above the axis');
  assert.ok(Math.abs(points[2].y) < 1e-9, 'even atoms lie on the axis');
  const flipped = chainPoints({ x: 0, y: 0 }, { x: 5 * CHAIN_STEP, y: 3 }, { side: -1 }).points;
  assert.ok(flipped[1].y > 0);
});

test('chainPoints: the drag direction is snapped to 30°', () => {
  const { points } = chainPoints({ x: 0, y: 0 }, { x: 3 * CHAIN_STEP, y: 3 * CHAIN_STEP * 0.62 });
  const axis = toDegrees(angleBetween(points[0], points[2]));
  assert.equal(Math.round(axis), 30);
});

test('chooseChainSide grows away from the start atom\'s neighbour', () => {
  const mol = createMolecule();
  const a = addAtom(mol, { x: 0, y: 0 });
  const b = addAtom(mol, { x: 0, y: -40 });
  addBond(mol, a, b, 1);
  const pointer = { x: 4 * CHAIN_STEP, y: 0 };
  assert.equal(chooseChainSide(mol, a, { x: 0, y: 0 }, pointer), -1, 'neighbour above → zigzag starts below');
  assert.equal(chooseChainSide(mol, null, { x: 0, y: 0 }, pointer), 1);
});

test('Enlace simple drag in the core: one transaction, N new carbons, counter in the preview', () => {
  const editor = createEditorCore();
  assert.equal(editor.getTool(), 'single');
  editor.pointerDown({ x: 100, y: 100 });
  editor.pointerMove({ x: 100 + 2 * CHAIN_STEP, y: 100 });
  assert.equal(editor.getPreview().count, 3, 'the counter grows with the drag');
  editor.pointerMove({ x: 100 + 4 * CHAIN_STEP, y: 100 });
  const preview = editor.getPreview();
  assert.equal(preview.type, 'chain');
  assert.equal(preview.count, 5);
  editor.pointerUp({ x: 100 + 4 * CHAIN_STEP, y: 100 });
  assert.equal(editor.peekMolecule().atoms.size, 5);
  assert.equal(editor.peekMolecule().bonds.size, 4);
  for (const bond of editor.peekMolecule().bonds.values()) {
    assert.equal(bond.order, 1);
  }
  // From an existing atom: the counter shows the carbons added.
  const end = editor.peekMolecule().atoms.get(5);
  editor.pointerDown(end);
  editor.pointerMove({ x: end.x, y: end.y + 3 * CHAIN_STEP });
  assert.equal(editor.getPreview().count, 3);
  editor.pointerUp({ x: end.x, y: end.y + 3 * CHAIN_STEP });
  assert.equal(editor.peekMolecule().atoms.size, 8);
  // Each chain is exactly one undo step.
  editor.undo();
  assert.equal(editor.peekMolecule().atoms.size, 5);
  editor.undo();
  assert.equal(editor.peekMolecule().atoms.size, 0);
  editor.redo();
  assert.equal(editor.peekMolecule().atoms.size, 5);
}); // End of test 'Enlace simple drag in the core…'

test('Enlace simple drag: Esc (cancelGesture) restores the start state and records nothing', () => {
  const editor = createEditorCore();
  editor.loadMolecule(placed('CC'));
  const before = editor.getMoleculeJSON();
  const edits = [];
  editor.onEdit((e) => edits.push(e));
  const start = editor.peekMolecule().atoms.get(2);
  editor.pointerDown(start);
  editor.pointerMove({ x: start.x + 5 * CHAIN_STEP, y: start.y + 60 });
  assert.equal(editor.getPreview().type, 'chain');
  assert.equal(editor.cancelGesture(), true);
  assert.equal(editor.getPreview(), null);
  assert.equal(editor.pointerUp({ x: start.x + 5 * CHAIN_STEP, y: start.y + 60 }), null);
  assert.deepEqual(editor.getMoleculeJSON(), before);
  assert.deepEqual(edits, []);
  editor.undo(); // Only the load is in the history.
  assert.equal(editor.peekMolecule().atoms.size, 0);
});

test('Enlace simple: a click and a one-bond drag keep their behaviour', () => {
  const editor = createEditorCore();
  // Click on empty space: a two-carbon fragment.
  editor.pointerDown({ x: 100, y: 100 });
  editor.pointerUp({ x: 100, y: 100 });
  assert.equal(editor.peekMolecule().atoms.size, 2);
  // Click on an atom: one more carbon.
  const a2 = editor.peekMolecule().atoms.get(2);
  editor.pointerDown(a2);
  editor.pointerUp(a2);
  assert.equal(editor.peekMolecule().atoms.size, 3);
  // A short drag from an atom: one bond, straight along the snapped direction, with a "1 C" counter.
  const a1 = editor.peekMolecule().atoms.get(1);
  editor.pointerDown(a1);
  editor.pointerMove({ x: a1.x - 2, y: a1.y + 45 });
  const preview = editor.getPreview();
  assert.equal(preview.type, 'bond');
  assert.equal(preview.count, 1);
  editor.pointerUp({ x: a1.x - 2, y: a1.y + 45 });
  const a4 = editor.peekMolecule().atoms.get(4);
  assert.equal(Math.round(toDegrees(normalizeAngle(angleBetween(a1, a4)))), 90);
  assert.ok(Math.abs(distance(a1, a4) - BOND_LENGTH) < 1e-9);
  // A short drag on empty space: a two-carbon fragment ("2 C").
  editor.pointerDown({ x: 400, y: 400 });
  editor.pointerMove({ x: 440, y: 401 });
  assert.equal(editor.getPreview().count, 2);
  editor.pointerUp({ x: 440, y: 401 });
  assert.equal(editor.peekMolecule().atoms.size, 6);
}); // End of test 'Enlace simple: a click and a one-bond drag…'

test('Enlace simple: releasing on an atom bonds to it, even after a long drag; the pressed atom is refused', () => {
  const editor = createEditorCore();
  editor.loadMolecule({
    version: 1,
    atoms: [{ id: 1, element: 'C', x: 0, y: 0 }, { id: 2, element: 'C', x: 200, y: 0 }],
    bonds: [],
  });
  const before = editor.getMoleculeJSON();
  editor.pointerDown({ x: 0, y: 0 });
  editor.pointerMove({ x: 120, y: 30 });
  assert.equal(editor.getPreview().type, 'chain', 'a long drag on empty space previews a chain');
  editor.pointerMove({ x: 202, y: 3 });
  const preview = editor.getPreview();
  assert.equal(preview.type, 'bond', 'over an atom, the preview is the single bond to it');
  assert.equal(preview.count, undefined);
  const outcome = editor.pointerUp({ x: 202, y: 3 });
  assert.equal(outcome.ok, true);
  assert.deepEqual(editor.getMoleculeJSON().bonds.map((b) => [b.a, b.b, b.order]), [[1, 2, 1]]);
  assert.equal(editor.peekMolecule().atoms.size, 2);
  editor.undo();
  assert.deepEqual(editor.getMoleculeJSON(), before);
  // Dragging back onto the pressed atom: self-bond refusal, nothing changes.
  editor.pointerDown({ x: 0, y: 0 });
  editor.pointerMove({ x: 150, y: 0 });
  const self = editor.pointerUp({ x: 1, y: 1 });
  assert.equal(self.ok, false);
  assert.equal(self.message, 'No se puede unir un átomo consigo mismo.');
  assert.deepEqual(editor.getMoleculeJSON(), before);
}); // End of test 'Enlace simple: releasing on an atom bonds to it…'

test('Enlace simple drag from a full carbon is refused', () => {
  const editor = createEditorCore();
  editor.loadMolecule(placed('CC(C)(C)C'));
  const centre = editor.peekMolecule().atoms.get(2);
  const outcome = drag(editor, centre, { x: centre.x + 300, y: centre.y + 300 });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, 'Este carbono ya tiene 4 enlaces.');
  assert.equal(editor.peekMolecule().atoms.size, 5);
});

test('Enlace simple drag: a chain carbon landing on an existing atom refuses the chain', () => {
  const editor = createEditorCore();
  // A lone carbon exactly where the second chain carbon of a rightward drag from (0, 0) goes.
  editor.loadMolecule({
    version: 1,
    atoms: [{ id: 1, element: 'C', x: 2 * CHAIN_STEP, y: 0 }],
    bonds: [],
  });
  const before = editor.getMoleculeJSON();
  const outcome = drag(editor, { x: 0, y: 0 }, { x: 4 * CHAIN_STEP, y: 30 });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, 'No hay sitio: ese átomo quedaría encima de otro.');
  assert.deepEqual(editor.getMoleculeJSON(), before);
});

test('Enlace doble / triple: a long drag still makes one bond of that order', () => {
  for (const [tool, order] of [['double', 2], ['triple', 3]]) {
    const editor = createEditorCore();
    editor.setTool(tool);
    editor.pointerDown({ x: 0, y: 0 });
    editor.pointerMove({ x: 6 * CHAIN_STEP, y: 0 });
    const preview = editor.getPreview();
    assert.equal(preview.type, 'bond');
    assert.equal(preview.count, undefined);
    editor.pointerUp({ x: 6 * CHAIN_STEP, y: 0 });
    const json = editor.getMoleculeJSON();
    assert.equal(json.atoms.length, 2, tool);
    assert.deepEqual(json.bonds.map((b) => b.order), [order]);
  }
});

// ---------------------------------------------------------------- labels

test('atomLabelText: Con carbonos shows C plus implicit H, never "="', () => {
  const propene = parseSmiles('C=CC');
  assert.deepEqual([1, 2, 3].map((id) => atomLabelText(propene, id, 'condensed')), ['CH₂', 'CH', 'CH₃']);
  const neopentane = parseSmiles('CC(C)(C)C');
  assert.equal(atomLabelText(neopentane, 2, 'condensed'), 'C');
  const ethyne = parseSmiles('C#C');
  assert.deepEqual([1, 2].map((id) => atomLabelText(ethyne, id, 'condensed')), ['CH', 'CH']);
  const allene = parseSmiles('C=C=C');
  assert.equal(atomLabelText(allene, 2, 'condensed'), 'C');
  for (const mol of [propene, neopentane, ethyne, allene]) {
    for (const id of mol.atoms.keys()) {
      assert.ok(!atomLabelText(mol, id, 'condensed').includes('='));
      assert.equal(atomLabelText(mol, id, 'condensed'), carbonLabel(mol, id));
    }
  }
});

test('atomLabelText: Esqueleto labels only a lone carbon', () => {
  const mol = parseSmiles('CCC');
  assert.deepEqual([1, 2, 3].map((id) => atomLabelText(mol, id, 'skeletal')), [null, null, null]);
  assert.equal(atomLabelText(mol, 1), null, 'skeletal is the default');
  const methane = createMolecule();
  const c = addAtom(methane, { x: 0, y: 0 });
  assert.equal(atomLabelText(methane, c, 'skeletal'), 'CH₄');
  assert.equal(atomLabelText(methane, c, 'condensed'), 'CH₄');
});

test('showsCarbonDots / atomLabelPosition: Esqueleto dots every carbon and moves a lone label below its dot', () => {
  assert.equal(showsCarbonDots('skeletal'), true);
  assert.equal(showsCarbonDots(), true, 'skeletal is the default');
  assert.equal(showsCarbonDots('condensed'), false);
  const methane = createMolecule();
  const c = addAtom(methane, { x: 10, y: 20 });
  assert.deepEqual(atomLabelPosition(methane, c, 'skeletal'), { x: 10, y: 20 + LONE_LABEL_OFFSET });
  assert.deepEqual(atomLabelPosition(methane, c, 'condensed'), { x: 10, y: 20 });
  assert.ok(LONE_LABEL_OFFSET > CARBON_DOT_RADIUS, 'the label clears the dot');
  const propane = parseSmiles('CCC');
  for (const id of propane.atoms.keys()) {
    const atom = propane.atoms.get(id);
    for (const mode of ['skeletal', 'condensed']) {
      assert.deepEqual(atomLabelPosition(propane, id, mode), { x: atom.x, y: atom.y });
    }
  }
});

test('trimSegment shortens a bond at both ends and leaves short ones alone', () => {
  const s = trimSegment({ x1: 0, y1: 0, x2: 40, y2: 0 }, 11, 11);
  assert.deepEqual(s, { x1: 11, y1: 0, x2: 29, y2: 0 });
  assert.deepEqual(trimSegment({ x1: 0, y1: 0, x2: 10, y2: 0 }, 11, 11), { x1: 0, y1: 0, x2: 10, y2: 0 });
});

// ---------------------------------------------------------------- view

test('zoomView keeps the fixed point in place and clamps the scale', () => {
  const view = { scale: 1, x: 10, y: -20 };
  const point = { x: 300, y: 200 };
  const model = { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
  const zoomed = zoomView(view, point, 2);
  assert.equal(zoomed.scale, 2);
  assert.ok(Math.abs(model.x * zoomed.scale + zoomed.x - point.x) < 1e-9);
  assert.ok(Math.abs(model.y * zoomed.scale + zoomed.y - point.y) < 1e-9);
  assert.equal(zoomView(view, point, 1000).scale, MAX_ZOOM);
  assert.equal(zoomView(view, point, 0.0001).scale, MIN_ZOOM);
  assert.equal(clampZoom(1), 1);
  assert.deepEqual(panView(view, 5, 6), { scale: 1, x: 15, y: -14 });
});

test('fitView centres the molecule in the visible rectangle', () => {
  const mol = parseSmiles('CCC');
  const coords = [[1000, 1000], [1040, 980], [1080, 1000]];
  for (const [i, [x, y]] of coords.entries()) {
    Object.assign(mol.atoms.get(i + 1), { x, y });
  }
  const rect = { x: 0, y: 0, width: 800, height: 500 };
  const view = fitView(mol, rect);
  assert.ok(view.scale > 1 && view.scale <= 1.5);
  assert.ok(Math.abs(1040 * view.scale + view.x - 400) < 1e-9);
  assert.ok(Math.abs(990 * view.scale + view.y - 250) < 1e-9);
  assert.deepEqual(fitView(createMolecule(), rect), { ...IDENTITY_VIEW });
  assert.deepEqual(rectFromCorners({ x: 5, y: 9 }, { x: 1, y: 2 }), { x: 1, y: 2, width: 4, height: 7 });
});

// ---------------------------------------------------------------- keyboard

test('shortcutFor maps the §6.1 keys', () => {
  const cases = [
    ['1', 'single'], ['2', 'double'], ['3', 'triple'], ['t', 'cycle'],
    ['h', 'single'], ['e', 'erase'], ['Delete', 'erase'], ['m', 'move'],
  ];
  for (const [key, tool] of cases) {
    assert.deepEqual(shortcutFor({ key }), { tool }, key);
    assert.ok(TOOLS.includes(tool));
  }
  const elementCases = [['c', 'C'], ['C', 'C'], ['o', 'O'], ['n', 'N'], ['f', 'F'], ['l', 'Cl'], ['b', 'Br'], ['i', 'I'], ['I', 'I']];
  for (const [key, element] of elementCases) {
    assert.deepEqual(shortcutFor({ key }), { tool: 'carbon', element }, key);
  }
  assert.deepEqual(shortcutFor({ key: 'z', ctrlKey: true }), { action: 'undo' });
  assert.deepEqual(shortcutFor({ key: 'z', metaKey: true }), { action: 'undo' });
  assert.deepEqual(shortcutFor({ key: 'Z', ctrlKey: true, shiftKey: true }), { action: 'redo' });
  assert.deepEqual(shortcutFor({ key: 'y', ctrlKey: true }), { action: 'redo' });
  assert.equal(shortcutFor({ key: 'c', ctrlKey: true }), null, 'Ctrl+C stays copy');
  assert.equal(shortcutFor({ key: 'c', altKey: true }), null);
  assert.equal(shortcutFor({ key: 'x' }), null);
  assert.equal(shortcutFor({ key: '4' }), null);
  assert.equal(shortcutFor(null), null);
});

// ---------------------------------------------------------------- edit kinds and Mover

test('editKind tells chemical from coordinate edits', () => {
  const mol = parseSmiles('CC');
  const before = moleculeToJSON(mol);
  mol.atoms.get(1).x += 10;
  const moved = moleculeToJSON(mol);
  assert.equal(editKind(before, moved), 'coordinates');
  assert.equal(editKind(before, before), 'none');
  mol.bonds.get(1).order = 2;
  assert.equal(editKind(moved, moleculeToJSON(mol)), 'chemical');
  assert.equal(editKind(before, moleculeToJSON(parseSmiles('CCC'))), 'chemical');
});

test('Mover: marquee selects without editing; dragging the selection is one coordinate edit', () => {
  const edits = [];
  const editor = createEditorCore({ onEdit: (e) => edits.push(`${e.reason}:${e.kind}`) });
  editor.loadMolecule(placed('CCC'));
  const json = editor.getMoleculeJSON();
  const coords = [[100, 100], [135, 80], [170, 100]];
  json.atoms.forEach((atom, i) => Object.assign(atom, { x: coords[i][0], y: coords[i][1] }));
  editor.replaceMolecule(json);
  edits.length = 0;
  editor.setTool('move');

  // Marquee around atoms 1 and 2 only.
  editor.pointerDown({ x: 80, y: 60 });
  editor.pointerMove({ x: 150, y: 120 });
  assert.deepEqual(editor.getViewState().marquee, { x: 80, y: 60, width: 70, height: 60 });
  assert.deepEqual([...editor.getViewState().selection].sort(), [1, 2]);
  assert.equal(editor.pointerUp({ x: 150, y: 120 }), null);
  assert.deepEqual(editor.getSelection(), [1, 2]);
  assert.deepEqual(edits, []);

  // Drag from atom 1: atoms 1 and 2 move, 3 stays.
  editor.pointerDown({ x: 100, y: 100 });
  editor.pointerMove({ x: 120, y: 130 });
  assert.equal(editor.getViewState().mol.atoms.get(2).x, 155, 'the preview shows the moved atoms');
  assert.equal(editor.peekMolecule().atoms.get(2).x, 135, 'nothing is committed mid-drag');
  const outcome = editor.pointerUp({ x: 120, y: 130 });
  assert.equal(outcome.ok, true);
  const atoms = editor.getMoleculeJSON().atoms.map((a) => [a.x, a.y]);
  assert.deepEqual(atoms, [[120, 130], [155, 110], [170, 100]]);
  assert.deepEqual(edits, ['edit:coordinates']);
  editor.undo();
  editor.redo();
  assert.deepEqual(edits, ['edit:coordinates', 'undo:coordinates', 'redo:coordinates']);

  // Dragging an unselected atom moves just it; a click on empty space clears the selection.
  editor.pointerDown({ x: 170, y: 100 });
  editor.pointerUp({ x: 170, y: 100 });
  assert.deepEqual(editor.getSelection(), [3]);
  editor.pointerDown({ x: 400, y: 400 });
  editor.pointerUp({ x: 400, y: 400 });
  assert.deepEqual(editor.getSelection(), []);
});

test('Mover refuses to drop an atom on top of another', () => {
  const editor = createEditorCore();
  editor.loadMolecule(placed('CCC'));
  editor.setTool('move');
  const a1 = editor.peekMolecule().atoms.get(1);
  const a3 = editor.peekMolecule().atoms.get(3);
  const before = editor.getMoleculeJSON();
  const outcome = drag(editor, { x: a1.x, y: a1.y }, { x: a3.x + 1, y: a3.y });
  assert.equal(outcome.ok, false);
  assert.deepEqual(editor.getMoleculeJSON(), before);
});

test('replaceMolecule validates, clears history and emits a chemical restore', () => {
  const edits = [];
  const editor = createEditorCore({ onEdit: (e) => edits.push(`${e.reason}:${e.kind}`) });
  assert.equal(editor.replaceMolecule('{broken').ok, false);
  assert.equal(editor.replaceMolecule({ version: 1, atoms: [{ id: 1, element: 'C', x: 0, y: 0 }], bonds: [{ id: 1, a: 1, b: 2, order: 1 }] }).ok, false);
  assert.equal(editor.peekMolecule().atoms.size, 0);
  assert.deepEqual(edits, []);
  assert.equal(editor.replaceMolecule(moleculeToJSON(placed('CC'))).ok, true);
  assert.equal(editor.canUndo(), false);
  assert.deepEqual(edits, ['restore:chemical']);
});

// ---------------------------------------------------------------- formula and autosave

test('formulaText', () => {
  assert.equal(formulaText(createMolecule()), 'Fórmula: —');
  assert.equal(formulaText(parseSmiles('CCCCC')), 'Fórmula: C₅H₁₂');
  assert.equal(formulaText(parseSmiles('C=CC')), 'Fórmula: C₃H₆');
});

test('autosave saves every edit, removes the key when empty and restores', () => {
  const storage = memoryStorage();
  const editor = createEditorCore();
  startAutosave(editor, storage);
  editor.loadMolecule(placed('CCC'));
  const saved = storage.getItem(STORAGE_KEY);
  assert.deepEqual(JSON.parse(saved), editor.getMoleculeJSON());
  const other = createEditorCore();
  assert.equal(restoreDrawing(other, storage), 'restored');
  assert.deepEqual(other.getMoleculeJSON(), editor.getMoleculeJSON());
  editor.clear();
  assert.equal(storage.getItem(STORAGE_KEY), null);
  assert.equal(restoreDrawing(createEditorCore(), storage), 'empty');
});

test('corrupt autosave is discarded; throwing storage never crashes', () => {
  for (const text of ['{nope', '[]', JSON.stringify({ version: 1, atoms: [{ id: 1, element: 'C', x: 'a', y: 0 }], bonds: [] })]) {
    const storage = memoryStorage({ [STORAGE_KEY]: text });
    const editor = createEditorCore();
    assert.equal(restoreDrawing(editor, storage), 'corrupt');
    assert.equal(editor.peekMolecule().atoms.size, 0);
    assert.equal(storage.getItem(STORAGE_KEY), null);
  }
  const hostile = {
    getItem() { throw new Error('denied'); },
    setItem() { throw new Error('quota'); },
    removeItem() { throw new Error('denied'); },
  };
  assert.equal(readItem(hostile, 'k'), null);
  assert.equal(writeItem(hostile, 'k', 'v'), false);
  assert.equal(writeItem(null, 'k', 'v'), false);
  const editor = createEditorCore();
  assert.equal(restoreDrawing(editor, hostile), 'empty');
  startAutosave(editor, hostile);
  assert.doesNotThrow(() => editor.loadMolecule(placed('CC')));
  assert.equal(editor.peekMolecule().atoms.size, 2);
  const win = {};
  Object.defineProperty(win, 'localStorage', { get() { throw new Error('SecurityError'); } });
  assert.equal(getStorage(win), null);
  assert.equal(getStorage(undefined), null);
});
