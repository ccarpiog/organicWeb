/**
 * @file Unit tests for editing through the 90° view (design.md §6.1, §6.3):
 * the editor core, given the projected drawing as its `display`, hit-tests
 * every gesture on the projected positions and turns it into a model edit
 * (new carbons at §6.2 model positions, loose pieces clear of the model
 * atoms), with one undo entry per gesture, Esc restore, valence refusals,
 * Mover ignored; addedAtoms() reports what the view flashes.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cloneMolecule, bondBetween } from '../../src/model/molecule.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { nameMolecule } from '../../src/naming/index.js';
import { canonicalLayout } from '../../src/layout/canonical.js';
import { BOND_LENGTH, CHAIN_STEP, MIN_CLEARANCE, ATOM_HIT_RADIUS, distance, clearance } from '../../src/editor/geometry.js';
import { createEditorCore, addedAtoms, EDIT_MESSAGES } from '../../src/editor/editor.js';
import { projectRightAngles } from '../../src/ui/canvasbar.js';

/**
 * A molecule from SMILES laid out as "Ordenar dibujo" would (model coordinates).
 *
 * @param {string} smiles - The SMILES.
 * @returns {object} The molecule with coordinates.
 */
function laidOut(smiles) {
  const mol = parseSmiles(smiles);
  return canonicalLayout(mol, nameMolecule(mol), { center: { x: 300, y: 200 } });
}

/**
 * An editor core whose display is the 90° projection of its molecule (as
 * createEditor() provides it), loaded with a molecule.
 *
 * @param {string} smiles - The starting molecule.
 * @returns {{core: object, shown: function(): object|null, rejects: object[]}} The core, the current
 *   projected drawing (null when the projection falls back) and the refusals received.
 */
function projectedEditor(smiles) {
  let cache = null;
  const rejects = [];
  /**
   * The projected drawing of the core's molecule, cached per version.
   *
   * @returns {object|null} The projected copy, or null on fallback.
   */
  function shown() {
    const mol = core.peekMolecule();
    if (!cache || cache.source !== mol) {
      const result = projectRightAngles(mol);
      let copy = null;
      if (result.ok) {
        copy = cloneMolecule(mol);
        for (const [id, p] of result.positions) {
          Object.assign(copy.atoms.get(id), { x: p.x, y: p.y });
        }
      }
      cache = { source: mol, copy };
    }
    return cache.copy;
  }
  const core = createEditorCore({ display: shown, onReject: (r) => rejects.push(r) });
  core.loadMolecule(laidOut(smiles));
  return { core, shown, rejects };
} // End of function projectedEditor()

/**
 * Projected position of an atom.
 *
 * @param {Function} shown - The projected drawing getter.
 * @param {number} id - The atom.
 * @returns {{x: number, y: number}} Its drawn position.
 */
function at(shown, id) {
  const atom = shown().atoms.get(id);
  return { x: atom.x, y: atom.y };
}

/**
 * Projected midpoint of the bond between two atoms.
 *
 * @param {Function} shown - The projected drawing getter.
 * @param {number} a - First atom.
 * @param {number} b - Second atom.
 * @returns {{x: number, y: number}} The midpoint.
 */
function mid(shown, a, b) {
  const p = at(shown, a);
  const q = at(shown, b);
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
}

/**
 * Presses, drags (in steps) and releases.
 *
 * @param {object} core - The editor core.
 * @param {{x: number, y: number}} from - Start.
 * @param {{x: number, y: number}} to - End.
 * @returns {object|null} The pointerUp() outcome.
 */
function drag(core, from, to) {
  core.pointerDown(from);
  core.pointerMove({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 });
  core.pointerMove(to);
  return core.pointerUp(to);
}

test('the fixture is meaningful: projected and model positions differ', () => {
  const { core, shown } = projectedEditor('CC(C)CC');
  assert.ok(shown(), 'the molecule is projectable');
  const far = [...core.peekMolecule().atoms.values()].filter((a) => distance(a, at(shown, a.id)) > ATOM_HIT_RADIUS);
  assert.ok(far.length >= 3, 'most carbons are drawn away from their model position');
});

test('Carbono and bond-tool clicks on a projected carbon grow it at a §6.2 model position, one undo step', () => {
  for (const tool of ['carbon', 'single', 'double']) {
    const { core, shown } = projectedEditor('CC(C)CC');
    core.setTool(tool);
    const model = core.peekMolecule().atoms.get(5);
    core.pointerDown(at(shown, 5));
    const outcome = core.pointerUp(at(shown, 5));
    assert.equal(outcome.ok, true, tool);
    const mol = core.getMolecule();
    assert.equal(mol.atoms.size, 6, `${tool}: one carbon added`);
    const bond = bondBetween(mol, 5, 6);
    assert.ok(bond, `${tool}: bonded to the clicked carbon`);
    assert.equal(bond.order, tool === 'double' ? 2 : 1);
    assert.ok(Math.abs(distance(mol.atoms.get(6), model) - BOND_LENGTH) < 1e-6, `${tool}: one bond length away in the model`);
    assert.equal(core.getMolecule().atoms.get(5).x, model.x, 'the projection never moves model atoms');
    assert.ok(shown(), 'still projectable: the 90° view re-lays it out');
    assert.equal(core.undo(), true);
    assert.equal(core.getMolecule().atoms.size, 5, 'one undo removes the whole gesture');
    assert.equal(core.canUndo(), true, 'only the load remains');
  }
});

test('bond clicks act on the projected bond: set order, Cambiar enlace, Borrar', () => {
  const { core, shown } = projectedEditor('CC(C)CC');
  core.setTool('double');
  core.pointerDown(mid(shown, 4, 5));
  core.pointerUp(mid(shown, 4, 5));
  assert.equal(bondBetween(core.peekMolecule(), 4, 5).order, 2);
  core.setTool('cycle');
  core.pointerDown(mid(shown, 4, 5));
  core.pointerUp(mid(shown, 4, 5));
  assert.equal(bondBetween(core.peekMolecule(), 4, 5).order, 3);
  core.setTool('erase');
  core.pointerDown(mid(shown, 4, 5));
  core.pointerUp(mid(shown, 4, 5));
  assert.equal(bondBetween(core.peekMolecule(), 4, 5), null);
  assert.equal(core.peekMolecule().atoms.size, 5, 'erasing a bond keeps both carbons');
  assert.equal(shown(), null, 'two pieces: the view falls back to the normal drawing');
  core.undo();
  core.pointerDown(at(shown, 3));
  core.pointerUp(at(shown, 3));
  assert.equal(core.peekMolecule().atoms.has(3), false, 'Borrar on a projected carbon deletes it');
});

test('a drag between two projected carbons bonds them', () => {
  const { core, shown } = projectedEditor('CCCCC');
  core.setTool('single');
  const outcome = drag(core, at(shown, 1), at(shown, 5));
  assert.equal(outcome.ok, true);
  assert.ok(bondBetween(core.peekMolecule(), 1, 5), 'the two carbons are bonded');
  assert.equal(core.peekMolecule().atoms.size, 5, 'no new carbon');
});

test('a drag from empty space onto (or snapping onto) a projected carbon grows that carbon at §6.2', () => {
  for (const [label, offset, release] of [['target', { x: 100, y: 60 }, { x: 0, y: 0 }], ['snap', { x: 40, y: 0 }, { x: -13, y: 0 }]]) {
    const { core, shown } = projectedEditor('CC(C)CC');
    const p5 = at(shown, 5);
    assert.ok([...shown().atoms.values()].every((a) => a.x < p5.x + 20), 'fixture: C5 is the rightmost carbon');
    core.setTool('double'); // A one-bond tool: a long Enlace simple drag would be a chain.
    const model = core.getMolecule();
    const outcome = drag(core, { x: p5.x + offset.x, y: p5.y + offset.y }, { x: p5.x + release.x, y: p5.y + release.y });
    assert.equal(outcome.ok, true, label);
    const mol = core.getMolecule();
    assert.equal(mol.atoms.size, 6, `${label}: exactly one new carbon`);
    assert.equal(bondBetween(mol, 5, 6)?.order, 2, `${label}: bonded to the carbon under the release`);
    assert.ok(Math.abs(distance(mol.atoms.get(6), model.atoms.get(5)) - BOND_LENGTH) < 1e-6,
      `${label}: one bond length from C5 in the model, not at the pressed point`);
    assert.ok(shown(), `${label}: still one piece, projected`);
    core.undo();
    assert.equal(core.getMolecule().atoms.size, 5, `${label}: one undo step`);
  }
});

test('a one-bond drag to empty space grows one carbon at its §6.2 model position', () => {
  const { core, shown } = projectedEditor('CC(C)CC');
  core.setTool('triple');
  const start = at(shown, 5);
  const outcome = drag(core, start, { x: start.x + 20, y: start.y - 45 });
  assert.equal(outcome.ok, true);
  const mol = core.getMolecule();
  assert.equal(mol.atoms.size, 6);
  assert.equal(bondBetween(mol, 5, 6).order, 3);
  assert.ok(Math.abs(distance(mol.atoms.get(6), mol.atoms.get(5)) - BOND_LENGTH) < 1e-6);
});

test('the Enlace simple chain drag counts carbons on the projection and zigzags them in the model', () => {
  const { core, shown } = projectedEditor('CC(C)CC');
  core.setTool('single');
  const start = at(shown, 5);
  const end = { x: start.x + CHAIN_STEP * 4 + 5, y: start.y };
  core.pointerDown(start);
  core.pointerMove(end);
  const preview = core.getPreview();
  assert.equal(preview.type, 'chain');
  assert.equal(preview.count, 4, 'live counter: 4 C');
  assert.deepEqual(preview.points[0], start, 'the preview starts at the projected carbon');
  const outcome = core.pointerUp(end);
  assert.equal(outcome.ok, true);
  const mol = core.getMolecule();
  assert.equal(mol.atoms.size, 9, 'the four carbons of the preview');
  let previous = 5;
  for (const id of [6, 7, 8, 9]) {
    assert.ok(bondBetween(mol, previous, id), `chain bond ${previous}-${id}`);
    assert.ok(Math.abs(distance(mol.atoms.get(previous), mol.atoms.get(id)) - BOND_LENGTH) < 1e-6);
    previous = id;
  }
  assert.ok(shown(), '2-metiloctano is projected again');
  assert.equal(new Set([5, 6, 7, 8, 9].map((id) => at(shown, id).y)).size, 1, 'the new carbons extend the main chain');
  core.undo();
  assert.equal(core.getMolecule().atoms.size, 5, 'the whole chain is one undo step');
});

test('Esc (cancelGesture) during a projected drag restores everything', () => {
  const { core, shown } = projectedEditor('CC(C)CC');
  const before = core.getMoleculeJSON();
  const start = at(shown, 1);
  core.pointerDown(start);
  core.pointerMove({ x: start.x - 150, y: start.y });
  assert.ok(core.getPreview());
  assert.equal(core.cancelGesture(), true);
  assert.equal(core.getPreview(), null);
  assert.deepEqual(core.getMoleculeJSON(), before);
});

test('valence refusals still apply on the projected drawing', () => {
  const { core, shown, rejects } = projectedEditor('CC(C)(C)CC');
  core.setTool('carbon');
  const before = core.getMoleculeJSON();
  core.pointerDown(at(shown, 2));
  const outcome = core.pointerUp(at(shown, 2));
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, EDIT_MESSAGES.FULL);
  assert.equal(rejects.length, 1);
  assert.deepEqual(core.getMoleculeJSON(), before);
  core.setTool('single');
  const start = at(shown, 2);
  drag(core, start, { x: start.x, y: start.y + CHAIN_STEP * 3 });
  assert.equal(rejects.at(-1).message, EDIT_MESSAGES.FULL, 'a chain from a full carbon is refused too');
  assert.deepEqual(core.getMoleculeJSON(), before);
});

test('a loose piece started on empty space is placed clear of the hidden model atoms', () => {
  const { core, shown } = projectedEditor('CC(C)CC');
  // A spot empty in the projection but on top of a model carbon.
  const hidden = [...core.peekMolecule().atoms.values()].find((a) =>
    [...shown().atoms.values()].every((p) => distance(p, a) > 2 * ATOM_HIT_RADIUS));
  assert.ok(hidden, 'fixture: a model carbon hidden by the projection');
  const before = cloneMolecule(core.peekMolecule());
  core.setTool('carbon');
  core.pointerDown({ x: hidden.x, y: hidden.y });
  const outcome = core.pointerUp({ x: hidden.x, y: hidden.y });
  assert.equal(outcome.ok, true, 'no "No hay sitio" refusal');
  const added = core.peekMolecule().atoms.get(6);
  assert.equal(added.x, hidden.x, 'same column as the click');
  assert.ok(clearance(before, added) >= MIN_CLEARANCE, 'moved down clear of the model atoms');
  assert.equal(shown(), null, 'a loose carbon: the view falls back');
});

test('Mover does nothing on the projected drawing', () => {
  const { core, shown } = projectedEditor('CC(C)CC');
  core.setTool('move');
  const before = core.getMoleculeJSON();
  const start = at(shown, 1);
  core.pointerDown(start);
  assert.equal(core.isGestureActive(), false);
  core.pointerMove({ x: start.x + 60, y: start.y });
  assert.equal(core.getHover(), null);
  assert.equal(core.pointerUp({ x: start.x + 60, y: start.y }), null);
  assert.deepEqual(core.getMoleculeJSON(), before);
  assert.deepEqual(core.getSelection(), []);
});

test('hover follows the projected positions', () => {
  const { core, shown } = projectedEditor('CC(C)CC');
  core.pointerMove(at(shown, 3));
  assert.deepEqual(core.getHover(), { type: 'atom', id: 3 });
  core.pointerMove(mid(shown, 2, 4));
  assert.deepEqual(core.getHover(), { type: 'bond', id: bondBetween(core.peekMolecule(), 2, 4).id });
});

test('addedAtoms() lists new carbons, or else the ends of new or re-ordered bonds', () => {
  const before = laidOut('CCC');
  const after = cloneMolecule(before);
  assert.deepEqual(addedAtoms(before, after), []);
  after.bonds.get(1).order = 2;
  assert.deepEqual(addedAtoms(before, after), [1, 2]);
  const grown = laidOut('CCCC');
  assert.deepEqual(addedAtoms(before, grown), [4], 'only the new carbon, not the one it grew from');
  const joined = cloneMolecule(grown);
  joined.bonds.set(9, { id: 9, a: 1, b: 4, order: 1 });
  assert.deepEqual(addedAtoms(grown, joined), [1, 4], 'a new bond between existing carbons: its ends');
  const erased = cloneMolecule(before);
  erased.bonds.delete(2);
  erased.atoms.delete(3);
  assert.deepEqual(addedAtoms(before, erased), []);
});
