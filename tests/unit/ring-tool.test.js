/**
 * @file Unit tests for phase I-27a (design.md §6.1, §6.3, §13.4): the
 * Anillos tool of the DOM-free editor core (free, attached and fused rings,
 * regular geometry, valence and overlap refusals, one undo step, the hover
 * preview, drags, the `a` shortcut, the 90° view) and the inner stroke of
 * ring double bonds (ringBondCentres(), ringInnerSide(), bondSegments()).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMolecule, addAtom, addBond, cloneMolecule, bondBetween, moleculeToJSON,
} from '../../src/model/molecule.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { nameMolecule } from '../../src/naming/index.js';
import { canonicalLayout } from '../../src/layout/canonical.js';
import {
  BOND_LENGTH, MIN_CLEARANCE, RING_SIZES, distance, freeRingPoints, attachedRingPoints, fusedRingPoints,
} from '../../src/editor/geometry.js';
import {
  createEditorCore, shortcutFor, nextRingSize, TOOLS, EDIT_MESSAGES, DEFAULT_RING_SIZE,
} from '../../src/editor/editor.js';
import { bondSegments, ringBondCentres, ringInnerSide } from '../../src/editor/render.js';
import { projectRightAngles } from '../../src/ui/canvasbar.js';
import { listExamples, exampleMolecule } from '../../src/ui/examples.js';

const EPS = 1e-6;

/**
 * A core that records its edit events and refusals.
 *
 * @returns {{core: object, edits: object[], rejects: object[]}} The core and its logs.
 */
function recordingCore() {
  const edits = [];
  const rejects = [];
  const core = createEditorCore({ onEdit: (e) => edits.push(e), onReject: (r) => rejects.push(r) });
  return { core, edits, rejects };
}

/**
 * Clicks (press and release at the same point).
 *
 * @param {object} core - The editor core.
 * @param {{x: number, y: number}} p - Where.
 * @returns {object|null} The outcome of pointerUp().
 */
function clickAt(core, p) {
  core.pointerDown(p);
  return core.pointerUp(p);
}

/**
 * Smallest distance between two atoms of a molecule.
 *
 * @param {object} mol - The molecule.
 * @returns {number} The distance (Infinity for fewer than two atoms).
 */
function minAtomDistance(mol) {
  const atoms = [...mol.atoms.values()];
  let best = Infinity;
  for (let i = 0; i < atoms.length; i += 1) {
    for (let j = i + 1; j < atoms.length; j += 1) {
      best = Math.min(best, distance(atoms[i], atoms[j]));
    }
  }
  return best;
}

/**
 * Tells whether every bond of a molecule has the standard length.
 *
 * @param {object} mol - The molecule.
 * @returns {boolean} True when all bonds are BOND_LENGTH long.
 */
function allBondsStandard(mol) {
  return [...mol.bonds.values()].every((b) => Math.abs(distance(mol.atoms.get(b.a), mol.atoms.get(b.b)) - BOND_LENGTH) < EPS);
}

// ---------------------------------------------------------------- tool selection

test('Anillos is a tool: setRingSize() selects it, sizes 3 to 8, the `a` shortcut cycles', () => {
  assert.ok(TOOLS.includes('ring'));
  assert.deepEqual([...RING_SIZES], [3, 4, 5, 6, 7, 8]);
  const core = createEditorCore();
  assert.equal(core.getRingSize(), DEFAULT_RING_SIZE);
  core.setRingSize(5);
  assert.equal(core.getTool(), 'ring');
  assert.equal(core.getRingSize(), 5);
  core.setTool('single');
  core.setTool('ring');
  assert.equal(core.getRingSize(), 5, 'the size is kept');
  assert.throws(() => core.setRingSize(9));
  assert.throws(() => core.setRingSize(2));
  assert.deepEqual(shortcutFor({ key: 'a' }), { tool: 'ring' });
  assert.deepEqual(shortcutFor({ key: 'A' }), { tool: 'ring' });
  assert.equal(shortcutFor({ key: 'a', ctrlKey: true }), null, 'Ctrl+A stays select-all');
  assert.equal(nextRingSize(3), 4);
  assert.equal(nextRingSize(8), 3);
});

// ---------------------------------------------------------------- free ring

test('a click on empty space draws a regular ring centred there, flat side at the bottom', () => {
  for (const n of RING_SIZES) {
    const { core, edits } = recordingCore();
    core.setRingSize(n);
    const centre = { x: 200, y: 150 };
    const outcome = clickAt(core, centre);
    assert.equal(outcome.ok, true, `${n}`);
    const mol = core.getMolecule();
    assert.equal(mol.atoms.size, n);
    assert.equal(mol.bonds.size, n);
    assert.ok([...mol.bonds.values()].every((b) => b.order === 1));
    assert.ok([...mol.atoms.values()].every((a) => a.element === 'C'));
    assert.ok(allBondsStandard(mol), `${n}: bond lengths`);
    const radii = [...mol.atoms.values()].map((a) => distance(a, centre));
    assert.ok(radii.every((r) => Math.abs(r - radii[0]) < EPS), `${n}: equidistant from the centre`);
    const lowest = Math.max(...[...mol.atoms.values()].map((a) => a.y));
    assert.equal([...mol.atoms.values()].filter((a) => Math.abs(a.y - lowest) < EPS).length, 2, `${n}: flat bottom`);
    assert.equal(edits.length, 1);
    assert.equal(edits[0].kind, 'chemical');
    assert.equal(nameMolecule(mol).name, `ciclo${['prop', 'but', 'pent', 'hex', 'hept', 'oct'][n - 3]}ano`);
    assert.equal(core.undo(), true);
    assert.equal(core.getMolecule().atoms.size, 0, 'one undo step removes the whole ring');
    assert.equal(core.canUndo(), false);
  } // End of the loop over ring sizes
});

test('a ring on empty space that would land on atoms is refused and changes nothing', () => {
  const { core, rejects } = recordingCore();
  core.setRingSize(6);
  clickAt(core, { x: 200, y: 150 });
  const before = core.getMoleculeJSON();
  const outcome = clickAt(core, { x: 200, y: 150 }); // The centre of the ring is empty space.
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, EDIT_MESSAGES.OVERLAP);
  assert.equal(rejects.at(-1).message, EDIT_MESSAGES.OVERLAP);
  assert.deepEqual(core.getMoleculeJSON(), before);
  core.undo();
  assert.equal(core.canUndo(), false, 'the refusal recorded no undo step');
});

// ---------------------------------------------------------------- ring on an atom

test('a click on an atom hangs a ring from it by a single bond (etilciclohexano)', () => {
  const { core, edits } = recordingCore();
  clickAt(core, { x: 100, y: 200 }); // Enlace simple on empty space: ethane.
  const ethane = core.getMolecule();
  assert.equal(ethane.atoms.size, 2);
  const end = ethane.atoms.get(2);
  core.setRingSize(6);
  edits.length = 0;
  const outcome = clickAt(core, { x: end.x, y: end.y });
  assert.equal(outcome.ok, true);
  const mol = core.getMolecule();
  assert.equal(mol.atoms.size, 8);
  assert.equal(mol.bonds.size, 1 + 7, 'n + 1 new bonds');
  const attaching = bondBetween(mol, 2, 3);
  assert.ok(attaching, 'the first ring atom is bonded to the clicked atom');
  assert.equal(attaching.order, 1);
  assert.ok(allBondsStandard(mol));
  assert.ok(minAtomDistance(mol) >= MIN_CLEARANCE - EPS, 'no overlaps');
  assert.equal(nameMolecule(mol).name, 'etilciclohexano');
  assert.deepEqual(edits.map((e) => e.kind), ['chemical']);
  core.undo();
  assert.deepEqual(core.getMoleculeJSON().atoms.length, 2, 'one undo step');
});

test('a small ring hung from a cyclohexane carbon is a ring assembly (RING_SYSTEM several, out of scope)', () => {
  const core = createEditorCore();
  core.setRingSize(6);
  clickAt(core, { x: 200, y: 200 });
  const atom = core.getMolecule().atoms.get(1);
  core.setRingSize(3);
  assert.equal(clickAt(core, { x: atom.x, y: atom.y }).ok, true);
  const mol = core.getMolecule();
  assert.equal(mol.atoms.size, 9);
  assert.ok(minAtomDistance(mol) >= MIN_CLEARANCE - EPS);
  const result = nameMolecule(mol);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'RING_SYSTEM');
  assert.equal(result.error.ringKind, 'several');
});

test('a ring on a full atom is refused with the valence message', () => {
  const { core, rejects } = recordingCore();
  const mol = createMolecule();
  const centre = addAtom(mol, { x: 200, y: 200 });
  for (const [dx, dy] of [[40, 0], [-40, 0], [0, 40], [0, -40]]) {
    addBond(mol, centre, addAtom(mol, { x: 200 + dx, y: 200 + dy }), 1);
  }
  core.loadMolecule(mol);
  const before = core.getMoleculeJSON();
  core.setRingSize(5);
  const outcome = clickAt(core, { x: 200, y: 200 });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, EDIT_MESSAGES.FULL);
  assert.equal(rejects.length, 1);
  assert.deepEqual(core.getMoleculeJSON(), before);
});

test('a ring hung from a crowded atom that has no free direction is refused as overlapping', () => {
  const core = createEditorCore();
  const mol = createMolecule();
  const c = addAtom(mol, { x: 200, y: 200 });
  const n = addAtom(mol, { x: 240, y: 200 });
  addBond(mol, c, n, 1);
  // A ring of loose carbons all around, 60 units away: no ring fits outside the bond.
  for (let k = 0; k < 24; k += 1) {
    const angle = (k * Math.PI) / 12;
    addAtom(mol, { x: 200 + 60 * Math.cos(angle), y: 200 + 60 * Math.sin(angle) });
  }
  core.loadMolecule(mol);
  const before = core.getMoleculeJSON();
  core.setRingSize(6);
  const outcome = clickAt(core, { x: 200, y: 200 });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, EDIT_MESSAGES.OVERLAP);
  assert.deepEqual(core.getMoleculeJSON(), before);
});

// ---------------------------------------------------------------- fused ring

test('a click on a bond fuses a ring on it, on the free side (RING_SYSTEM fused when named)', () => {
  const { core, edits } = recordingCore();
  core.setRingSize(6);
  const centre = { x: 200, y: 200 };
  clickAt(core, centre);
  const ring = core.getMolecule();
  const bond = ring.bonds.get(1);
  const a = ring.atoms.get(bond.a);
  const b = ring.atoms.get(bond.b);
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  core.setRingSize(5);
  edits.length = 0;
  const outcome = clickAt(core, mid);
  assert.equal(outcome.ok, true);
  const mol = core.getMolecule();
  assert.equal(mol.atoms.size, 6 + 3, 'n − 2 new atoms');
  assert.equal(mol.bonds.size, 6 + 4, 'n − 1 new bonds');
  assert.ok(allBondsStandard(mol));
  assert.ok(minAtomDistance(mol) >= MIN_CLEARANCE - EPS);
  for (const id of [7, 8, 9]) {
    assert.ok(distance(mol.atoms.get(id), centre) > distance(mid, centre), 'the new ring lies outside the first');
  }
  const result = nameMolecule(mol);
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'RING_SYSTEM');
  assert.equal(result.error.ringKind, 'fused');
  assert.deepEqual(edits.map((e) => e.kind), ['chemical']);
  core.undo();
  assert.equal(core.getMolecule().atoms.size, 6, 'one undo step');
});

test('a ring fused on a bond whose atoms are full is refused', () => {
  const core = createEditorCore();
  const mol = createMolecule();
  const a = addAtom(mol, { x: 200, y: 200 });
  const b = addAtom(mol, { x: 240, y: 200 });
  addBond(mol, a, b, 3); // Each end has 3 bonds from the triple bond…
  addBond(mol, a, addAtom(mol, { x: 160, y: 200 }), 1); // …and a has its 4th.
  core.loadMolecule(mol);
  const before = core.getMoleculeJSON();
  core.setRingSize(6);
  const outcome = clickAt(core, { x: 220, y: 200 });
  assert.equal(outcome.ok, false);
  assert.equal(outcome.message, EDIT_MESSAGES.FULL);
  assert.deepEqual(core.getMoleculeJSON(), before);
});

// ---------------------------------------------------------------- geometry helpers

test('ring geometry helpers build regular polygons', () => {
  for (const n of RING_SIZES) {
    const free = freeRingPoints({ x: 0, y: 0 }, n);
    free.forEach((p, i) => assert.ok(Math.abs(distance(p, free[(i + 1) % n]) - BOND_LENGTH) < EPS));
    const anchor = { x: 10, y: 20 };
    const hung = attachedRingPoints(anchor, 0.3, n);
    assert.ok(Math.abs(distance(anchor, hung[0]) - BOND_LENGTH) < EPS);
    hung.forEach((p, i) => assert.ok(Math.abs(distance(p, hung[(i + 1) % n]) - BOND_LENGTH) < EPS));
    const a = { x: 0, y: 0 };
    const b = { x: 40, y: 0 };
    for (const side of [1, -1]) {
      const fused = fusedRingPoints(a, b, n, side);
      assert.equal(fused.length, n - 2);
      const cycle = [a, b, ...fused];
      cycle.forEach((p, i) => assert.ok(Math.abs(distance(p, cycle[(i + 1) % n]) - BOND_LENGTH) < EPS, `${n}/${side}`));
      // Side 1 is the left normal of a→b: (0, 40) here, i.e. y > 0.
      assert.ok(fused.every((p) => Math.sign(p.y) === side));
    }
  } // End of the loop over ring sizes
});

// ---------------------------------------------------------------- gestures, preview, 90° view

test('a drag with Anillos counts as a click where it started; Esc keeps the starting state', () => {
  const core = createEditorCore();
  core.setRingSize(4);
  core.pointerDown({ x: 100, y: 100 });
  core.pointerMove({ x: 180, y: 160 });
  assert.equal(core.cancelGesture(), true);
  assert.equal(core.getMolecule().atoms.size, 0);
  core.pointerDown({ x: 100, y: 100 });
  core.pointerMove({ x: 180, y: 160 });
  assert.equal(core.pointerUp({ x: 180, y: 160 }).ok, true);
  const mol = core.getMolecule();
  assert.equal(mol.atoms.size, 4);
  const cx = [...mol.atoms.values()].reduce((s, a) => s + a.x, 0) / 4;
  assert.ok(Math.abs(cx - 100) < EPS);
});

test('hovering with Anillos previews the ring; no preview where it would be refused', () => {
  const core = createEditorCore();
  core.setRingSize(6);
  core.pointerMove({ x: 300, y: 300 });
  const free = core.getPreview();
  assert.equal(free.type, 'ring');
  assert.equal(free.points.length, 6);
  assert.equal(free.bond, null);
  clickAt(core, { x: 300, y: 300 });
  core.pointerMove({ x: 300, y: 300 }); // The new ring's centre: a ring there would overlap.
  assert.equal(core.getPreview(), null);
  const atom = core.getMolecule().atoms.get(1);
  core.pointerMove({ x: atom.x, y: atom.y });
  const hung = core.getPreview();
  assert.equal(hung.points.length, 6);
  assert.deepEqual(hung.bond.from, { x: atom.x, y: atom.y });
  core.clearHover();
  assert.equal(core.getPreview(), null);
  core.setTool('single');
  core.pointerMove({ x: 500, y: 500 });
  assert.equal(core.getPreview(), null, 'other tools have no hover preview');
});

test('replacing the molecule while hovering a bond with Anillos drops the stale hover (review I-27a)', () => {
  const edits = [];
  const previews = [];
  // Like the shell, every change redraws, i.e. reads the view state (and so the ring preview).
  const core = createEditorCore({
    onChange: () => previews.push(core.getViewState().preview),
    onEdit: (e) => edits.push(e),
  });
  core.setRingSize(6);
  const hoverBond = (id) => {
    const bond = core.getMolecule().bonds.get(id);
    const a = core.getMolecule().atoms.get(bond.a);
    const b = core.getMolecule().atoms.get(bond.b);
    core.pointerMove({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    assert.deepEqual(core.getHover(), { type: 'bond', id });
  };
  clickAt(core, { x: 300, y: 300 });
  const ring = cloneMolecule(core.getMolecule());
  assert.equal(ring.bonds.size, 6);
  const example = exampleMolecule(listExamples().find((e) => e.id === 'ramificado-minimo'), { x: 300, y: 300 });
  const replacements = [
    ['load', () => core.loadMolecule(example)],
    ['clear', () => core.clear()],
    ['restore', () => core.replaceMolecule(moleculeToJSON(example))],
  ];
  for (const [reason, replace] of replacements) {
    if (!core.getMolecule().bonds.has(5)) {
      core.loadMolecule(ring);
    }
    hoverBond(5);
    const before = edits.length;
    assert.doesNotThrow(replace, reason);
    assert.equal(edits.length, before + 1, `${reason}: onEdit fired`);
    assert.equal(core.getMolecule().bonds.has(5), false, `${reason}: bond 5 is gone`);
    assert.equal(core.getHover(), null, `${reason}: stale hover dropped`);
    assert.doesNotThrow(() => core.getViewState());
  }
  // Undo and redo replace the molecule too.
  core.loadMolecule(ring);
  core.loadMolecule(example);
  core.undo();
  hoverBond(5);
  const before = edits.length;
  assert.doesNotThrow(() => core.redo());
  assert.equal(edits.length, before + 1, 'redo: onEdit fired');
  assert.equal(core.getHover(), null);
});

test('in the 90° view the ring tool works on the model and the projection falls back', () => {
  const mol = parseSmiles('CCCC');
  const laid = canonicalLayout(mol, nameMolecule(mol), { center: { x: 300, y: 200 } });
  let cache = null;
  const core = createEditorCore({
    display: () => {
      const current = core.peekMolecule();
      if (!cache || cache.source !== current) {
        const result = projectRightAngles(current);
        let copy = null;
        if (result.ok) {
          copy = cloneMolecule(current);
          for (const [id, p] of result.positions) {
            Object.assign(copy.atoms.get(id), { x: p.x, y: p.y });
          }
        }
        cache = { source: current, copy };
      }
      return cache.copy;
    },
  });
  core.loadMolecule(laid);
  core.setRingSize(6);
  // Hover over the projected drawing: no preview (its positions are not the model's).
  core.pointerMove({ x: 0, y: 0 });
  assert.equal(core.getPreview(), null);
  // A click on the projected end carbon hangs the ring from the model atom.
  const display = cache.copy;
  assert.ok(display, 'butane is projectable');
  const end = display.atoms.get(1);
  assert.equal(clickAt(core, { x: end.x, y: end.y }).ok, true);
  const after = core.getMolecule();
  assert.equal(after.atoms.size, 10);
  assert.ok(bondBetween(after, 1, 5));
  assert.ok(minAtomDistance(after) >= MIN_CLEARANCE - EPS);
  assert.equal(nameMolecule(after).name, 'butilciclohexano');
  assert.equal(projectRightAngles(after).ok, false, 'a ring makes the molecule unprojectable');
});

// ---------------------------------------------------------------- inner double-bond strokes

/**
 * Midpoint of a stroke.
 *
 * @param {{x1: number, y1: number, x2: number, y2: number}} s - The stroke.
 * @returns {{x: number, y: number}} Its midpoint.
 */
function mid(s) {
  return { x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2 };
}

/**
 * A regular free ring of carbons, with some bonds double.
 *
 * @param {number} n - Ring size.
 * @param {number[]} doubles - Indexes of the double bonds (bond k joins atoms k and k+1).
 * @returns {{mol: object, centre: {x: number, y: number}}} The ring and its centre.
 */
function drawnRing(n, doubles) {
  const mol = createMolecule();
  const centre = { x: 100, y: 100 };
  const ids = freeRingPoints(centre, n).map((p) => addAtom(mol, p));
  ids.forEach((id, k) => addBond(mol, id, ids[(k + 1) % n], doubles.includes(k) ? 2 : 1));
  return { mol, centre };
}

test('a ring double bond draws its second stroke toward the ring centre', () => {
  // 1,2-Dimethylcyclohexene: a methyl outside each end balances the old zigzag rule.
  const { mol, centre } = drawnRing(6, [0]);
  for (const id of [1, 2]) {
    const atom = mol.atoms.get(id);
    const out = { x: atom.x + (atom.x - centre.x) * 0.9, y: atom.y + (atom.y - centre.y) * 0.9 };
    addBond(mol, id, addAtom(mol, out), 1);
  }
  const centres = ringBondCentres(mol);
  assert.equal(centres.size, 6, 'only the ring bonds');
  assert.ok(distance(centres.get(1), centre) < EPS);
  const bond = mol.bonds.get(1);
  assert.equal(bond.order, 2);
  const [main, inner] = bondSegments(mol, 1);
  assert.ok(distance(mid(inner), centre) < distance(mid(main), centre), 'inner stroke inside the ring');
  assert.equal(ringInnerSide(mol.atoms.get(bond.a), mol.atoms.get(bond.b), centre), 1);
  assert.equal(ringInnerSide(mol.atoms.get(bond.b), mol.atoms.get(bond.a), centre), -1);
  assert.equal(ringInnerSide({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }), 0);
  // The same with the precomputed centres the renderer passes.
  assert.deepEqual(bondSegments(mol, 1, centres), [main, inner]);
});

test('in a fused system a double bond takes the centre of the smaller ring', () => {
  const core = createEditorCore();
  core.setRingSize(6);
  clickAt(core, { x: 200, y: 200 });
  const six = core.getMolecule();
  const b1 = six.bonds.get(1);
  const a = six.atoms.get(b1.a);
  const b = six.atoms.get(b1.b);
  core.setRingSize(4);
  clickAt(core, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const mol = core.getMolecule();
  // Bond 1 is shared by both rings: its inner stroke goes into the 4-ring.
  mol.bonds.get(1).order = 2;
  const four = [b1.a, b1.b, 7, 8].map((id) => mol.atoms.get(id));
  const fourCentre = { x: four.reduce((s, p) => s + p.x, 0) / 4, y: four.reduce((s, p) => s + p.y, 0) / 4 };
  const centres = ringBondCentres(mol);
  assert.ok(distance(centres.get(1), fourCentre) < EPS);
  const [main, inner] = bondSegments(mol, 1);
  assert.ok(distance(mid(inner), fourCentre) < distance(mid(main), fourCentre));
});

test('acyclic and exocyclic double bonds keep the zigzag rule', () => {
  // Methylidenecyclohexane: the exocyclic C=C is not a ring bond.
  const { mol, centre } = drawnRing(6, []);
  const atom = mol.atoms.get(1);
  const outside = addAtom(mol, { x: atom.x + (atom.x - centre.x), y: atom.y + (atom.y - centre.y) });
  const exo = addBond(mol, 1, outside, 2);
  assert.equal(ringBondCentres(mol).has(exo), false);
  const strokes = bondSegments(mol, exo);
  assert.equal(strokes.length, 2);
  // Terminal double bond: two centred strokes, as before.
  const [s1, s2] = strokes;
  assert.ok(Math.abs(distance(mid(s1), atom) - distance(mid(s2), atom)) < EPS);
  // But-2-ene drawn as a zigzag: the second stroke goes to the side of the chain ends.
  const chain = createMolecule();
  const c1 = addAtom(chain, { x: 0, y: 20 });
  const c2 = addAtom(chain, { x: 35, y: 0 });
  const c3 = addAtom(chain, { x: 70, y: 20 });
  addBond(chain, c1, c2, 1);
  const db = addBond(chain, c2, c3, 2);
  assert.equal(ringBondCentres(chain).size, 0);
  const [, inner] = bondSegments(chain, db);
  const main = bondSegments(chain, db)[0];
  assert.ok(distance(mid(inner), chain.atoms.get(c1)) < distance(mid(main), chain.atoms.get(c1)));
});
