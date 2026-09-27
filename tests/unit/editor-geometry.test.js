/**
 * @file Unit tests for src/editor/geometry.js and the pure helpers of
 * src/editor/render.js: angles, 30° snapping, zigzag placement, linear
 * centres at 180°, overlap avoidance, hit-testing and bond strokes (design.md §6.2, §6.3).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { createMolecule, addAtom, addBond } from '../../src/model/molecule.js';
import {
  BOND_LENGTH, MIN_CLEARANCE, snapAngle, snapEndpoint, toDegrees, toRadians, angleBetween, normalizeAngle,
  nextAtomPosition, preferredAngles, isLinearCentre, hitTest, straightenLinearCentres, distance, clearance,
  onLoneLabel, LONE_LABEL_OFFSET, LABEL_HIT_HALF_WIDTH,
} from '../../src/editor/geometry.js';
import { bondSegments, carbonLabel, normalizeHighlight, locantPosition } from '../../src/editor/render.js';

/**
 * Angle in whole degrees, normalised to [0, 360).
 *
 * @param {number} radians - Angle.
 * @returns {number} Rounded degrees.
 */
function deg(radians) {
  return Math.round(toDegrees(normalizeAngle(radians))) % 360;
}

/**
 * Angle at `centre` between two atoms, in degrees.
 *
 * @param {object} mol - The molecule.
 * @param {number} p - First atom.
 * @param {number} centre - Vertex atom.
 * @param {number} q - Second atom.
 * @returns {number} The angle in [0, 180].
 */
function bondAngle(mol, p, centre, q) {
  const c = mol.atoms.get(centre);
  const d = Math.abs(angleBetween(c, mol.atoms.get(p)) - angleBetween(c, mol.atoms.get(q)));
  return Math.round(toDegrees(d > Math.PI ? 2 * Math.PI - d : d));
}

/**
 * Builds a chain by repeatedly growing from the last atom.
 *
 * @param {number} n - Number of carbons.
 * @param {number[]} [orders] - Order of each bond (default all single).
 * @returns {{mol: object, ids: number[]}} The molecule and its atom ids in chain order.
 */
function growChain(n, orders = []) {
  const mol = createMolecule();
  const ids = [addAtom(mol, { x: 100, y: 100 })];
  for (let i = 1; i < n; i += 1) {
    const order = orders[i - 1] || 1;
    const id = addAtom(mol, nextAtomPosition(mol, ids[i - 1], { order }));
    addBond(mol, ids[i - 1], id, order);
    ids.push(id);
  }
  return { mol, ids };
}

test('snapAngle rounds to the nearest 30°', () => {
  assert.equal(deg(snapAngle(toRadians(14))), 0);
  assert.equal(deg(snapAngle(toRadians(16))), 30);
  assert.equal(deg(snapAngle(toRadians(-44))), 330);
  assert.equal(deg(snapAngle(toRadians(-46))), 300);
  assert.equal(deg(snapAngle(toRadians(179))), 180);
  assert.equal(deg(snapAngle(toRadians(95), 45)), 90);
});

test('snapEndpoint keeps the bond length fixed and the direction snapped', () => {
  const start = { x: 10, y: 10 };
  const end = snapEndpoint(start, { x: 200, y: 110 });
  assert.ok(Math.abs(distance(start, end) - BOND_LENGTH) < 1e-9);
  assert.equal(deg(angleBetween(start, end)), 30);
  assert.equal(deg(angleBetween(start, snapEndpoint(start, { x: 10, y: -3 }))), 270);
});

test('a lone atom grows up and to the right', () => {
  const { mol, ids } = growChain(2);
  assert.equal(deg(angleBetween(mol.atoms.get(ids[0]), mol.atoms.get(ids[1]))), 330);
  assert.ok(Math.abs(distance(mol.atoms.get(ids[0]), mol.atoms.get(ids[1])) - BOND_LENGTH) < 1e-9);
});

test('growing from chain ends keeps a 120° zigzag heading right', () => {
  const { mol, ids } = growChain(6);
  for (let i = 1; i < ids.length - 1; i += 1) {
    assert.equal(bondAngle(mol, ids[i - 1], ids[i], ids[i + 1]), 120, `angle at atom ${ids[i]}`);
  }
  // Alternating up/down: consecutive bond directions are 330°, 30°, 330°, 30°...
  const directions = ids.slice(1).map((id, i) => deg(angleBetween(mol.atoms.get(ids[i]), mol.atoms.get(id))));
  assert.deepEqual(directions, [330, 30, 330, 30, 330]);
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      assert.ok(distance(mol.atoms.get(ids[i]), mol.atoms.get(ids[j])) >= MIN_CLEARANCE);
    }
  }
});

test('with two neighbours the new atom bisects the largest gap', () => {
  const mol = createMolecule();
  const c = addAtom(mol, { x: 0, y: 0 });
  const a = addAtom(mol, { x: -40, y: 0 });
  const b = addAtom(mol, { x: 0, y: -40 });
  addBond(mol, c, a);
  addBond(mol, c, b);
  // Neighbours at 180° and 270°: the largest gap (270°) is bisected at 45°.
  assert.equal(deg(preferredAngles(mol, c)[0]), 45);
  // Three neighbours: bisector of the largest remaining gap.
  const d = addAtom(mol, { x: 40, y: 0 });
  addBond(mol, c, d);
  assert.equal(deg(preferredAngles(mol, c)[0]), 90);
});

test('linear centres: triple bonds and cumulated double bonds grow at 180°', () => {
  const triple = growChain(3, [3, 1]);
  assert.ok(isLinearCentre(triple.mol, triple.ids[1]));
  assert.equal(bondAngle(triple.mol, triple.ids[0], triple.ids[1], triple.ids[2]), 180);

  const allene = growChain(3, [2, 2]);
  assert.ok(isLinearCentre(allene.mol, allene.ids[1]));
  assert.equal(bondAngle(allene.mol, allene.ids[0], allene.ids[1], allene.ids[2]), 180);

  const plain = growChain(3, [2, 1]);
  assert.ok(!isLinearCentre(plain.mol, plain.ids[1]));
  assert.equal(bondAngle(plain.mol, plain.ids[0], plain.ids[1], plain.ids[2]), 120);
  // A new triple bond from an atom makes it linear before the bond exists.
  assert.ok(isLinearCentre(plain.mol, plain.ids[2], 3));
});

test('placement avoids overlapping existing atoms', () => {
  const mol = createMolecule();
  const a = addAtom(mol, { x: 0, y: 0 });
  const b = addAtom(mol, { x: 40, y: 0 });
  addBond(mol, a, b);
  // Block the preferred zigzag spot of b (and its mirror) with loose atoms.
  const preferred = nextAtomPosition(mol, b);
  addAtom(mol, preferred);
  const next = nextAtomPosition(mol, b);
  assert.ok(clearance(mol, next, [b]) >= MIN_CLEARANCE);
  assert.ok(Math.abs(distance(mol.atoms.get(b), next) - BOND_LENGTH) < 1e-9);
});

test('a fully crowded atom still gets the roomiest (nudged) position', () => {
  const mol = createMolecule();
  const centre = addAtom(mol, { x: 0, y: 0 });
  for (let k = 0; k < 12; k += 1) {
    addAtom(mol, { x: 40 * Math.cos(toRadians(k * 30)), y: 40 * Math.sin(toRadians(k * 30)) });
  }
  const p = nextAtomPosition(mol, centre);
  assert.ok(distance(mol.atoms.get(centre), p) > BOND_LENGTH);
  assert.ok(clearance(mol, p, [centre]) > 10);
});

test('straightenLinearCentres rotates the smaller side to 180°', () => {
  const { mol, ids } = growChain(4);
  // Make bond 2–3 triple: atoms 2 and 3 become linear centres.
  const bond = [...mol.bonds.values()].find((b) => b.a === ids[1] && b.b === ids[2]);
  bond.order = 3;
  const moved = straightenLinearCentres(mol, [ids[1], ids[2]]);
  assert.ok(moved.length > 0);
  assert.equal(bondAngle(mol, ids[0], ids[1], ids[2]), 180);
  assert.equal(bondAngle(mol, ids[1], ids[2], ids[3]), 180);
  // Bond lengths are preserved by rigid rotation.
  for (const b of mol.bonds.values()) {
    assert.ok(Math.abs(distance(mol.atoms.get(b.a), mol.atoms.get(b.b)) - BOND_LENGTH) < 1e-9);
  }
  // Already straight: nothing moves.
  assert.deepEqual(straightenLinearCentres(mol, [ids[1], ids[2]]), []);
});

test('hitTest prefers atoms, then bonds, within their radii', () => {
  const { mol, ids } = growChain(2);
  const a = mol.atoms.get(ids[0]);
  const b = mol.atoms.get(ids[1]);
  assert.deepEqual(hitTest(mol, { x: a.x + 3, y: a.y }), { type: 'atom', id: ids[0] });
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  assert.deepEqual(hitTest(mol, mid), { type: 'bond', id: 1 });
  assert.equal(hitTest(mol, mid, { atomsOnly: true }), null);
  assert.equal(hitTest(mol, { x: a.x - 100, y: a.y }), null);
});

test('hitTest maps the CH₄ label of a lone carbon (Esqueleto: below its dot) to the carbon', () => {
  const mol = createMolecule();
  const c = addAtom(mol, { x: 100, y: 100 });
  const label = { x: 100, y: 100 + LONE_LABEL_OFFSET };
  assert.deepEqual(hitTest(mol, label), { type: 'atom', id: c });
  assert.deepEqual(hitTest(mol, { x: 100 + LABEL_HIT_HALF_WIDTH - 1, y: label.y + 5 }), { type: 'atom', id: c });
  assert.deepEqual(hitTest(mol, label, { atomsOnly: true }), { type: 'atom', id: c });
  assert.equal(hitTest(mol, label, { exclude: [c] }), null);
  assert.equal(hitTest(mol, { x: 100, y: 100 + LONE_LABEL_OFFSET + 30 }), null);
  assert.equal(hitTest(mol, { x: 100 + LABEL_HIT_HALF_WIDTH + 5, y: label.y }), null);
  // Once bonded the carbon has no label: the area below it is empty space again.
  const d = addAtom(mol, { x: 140, y: 100 });
  addBond(mol, c, d, 1);
  assert.equal(onLoneLabel(mol, mol.atoms.get(c), label), false);
  assert.equal(hitTest(mol, label), null);
});

test('bond strokes: 1, 2 or 3 lines; the second line of a double bond goes inside the zigzag', () => {
  const { mol, ids } = growChain(3, [2, 1]);
  const segments = bondSegments(mol, 1);
  assert.equal(segments.length, 2);
  // Inner line is on the same side as atom 3.
  const a = mol.atoms.get(ids[0]);
  const b = mol.atoms.get(ids[1]);
  const c = mol.atoms.get(ids[2]);
  const side = (p) => Math.sign((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
  assert.equal(side({ x: segments[1].x1, y: segments[1].y1 }), side(c));
  assert.equal(bondSegments(mol, 2).length, 1);
  mol.bonds.get(2).order = 3;
  assert.equal(bondSegments(mol, 2).length, 3);
});

test('carbon labels, highlight specs and locant positions', () => {
  const { mol, ids } = growChain(3, [2, 1]);
  assert.equal(carbonLabel(mol, ids[0]), 'CH₂');
  assert.equal(carbonLabel(mol, ids[1]), 'CH');
  assert.equal(carbonLabel(mol, ids[2]), 'CH₃');
  const lone = createMolecule();
  assert.equal(carbonLabel(lone, addAtom(lone)), 'CH₄');
  assert.deepEqual(normalizeHighlight(null), []);
  assert.deepEqual(normalizeHighlight({ atoms: [1], style: 'weird' }), [{ atoms: [1], bonds: [], style: 'parent' }]);
  const p = locantPosition(mol, ids[1]);
  assert.ok(Math.abs(distance(p, mol.atoms.get(ids[1])) - 18) < 1e-9);
});

test('the naming engine never imports the editor', async () => {
  const dir = new URL('../../src/naming/', import.meta.url);
  for (const name of await readdir(dir)) {
    const source = await readFile(new URL(name, dir), 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*editor\//, `src/naming/${name} imports the editor`);
  }
});
