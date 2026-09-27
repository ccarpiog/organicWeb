/**
 * @file Unit tests for the ring strategy of "Ordenar dibujo"
 * (src/layout/rings.js through canonicalLayout(), design.md §7, I-27b):
 * a named single carbocycle becomes a regular polygon with locant 1 at the
 * top vertex and the numbering running clockwise on screen (y down), its
 * side chains leave outwards and the drawing is clear (no two atoms closer
 * than half a bond length, no crossings), deterministic and independent of
 * atom ids, insertion order and input coordinates.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON } from '../../src/model/molecule.js';
import { nameMolecule } from '../../src/naming/index.js';
import { canonicalLayout, closestApproach, layoutProblems } from '../../src/layout/canonical.js';
import { isSingleRing, ringBranchAngles, ringRadius, RING_START_ANGLE, RING_DIRECTION } from '../../src/layout/rings.js';
import { BOND_LENGTH } from '../../src/editor/geometry.js';
import { scrambleMolecule, seededRandom } from '../../scripts/oracle/generate.mjs';

/**
 * Topology of a molecule (ids, elements, bonds, orders) as a string.
 *
 * @param {object} mol - The molecule.
 * @returns {string} The topology key.
 */
function topology(mol) {
  const json = moleculeToJSON(mol);
  return JSON.stringify([json.atoms.map((a) => [a.id, a.element]), json.bonds, json.nextAtomId, json.nextBondId]);
}

/**
 * Shape of a drawing up to translation: every atom position relative to the
 * centre of the ring atoms, rounded and sorted, plus every bond as its two
 * end positions and its order (so `=CH2` and `–CH3` swapping places shows).
 *
 * @param {object} mol - The laid-out molecule.
 * @param {number[]} ring - Ring atoms.
 * @returns {string[]} The sorted rounded positions and bonds.
 */
function shape(mol, ring) {
  const cx = ring.reduce((s, id) => s + mol.atoms.get(id).x, 0) / ring.length;
  const cy = ring.reduce((s, id) => s + mol.atoms.get(id).y, 0) / ring.length;
  const round = (v) => (Math.round(v * 1e3) / 1e3 + 0).toFixed(3); // `+ 0` turns −0 into 0.
  const at = (id) => `${round(mol.atoms.get(id).x - cx)},${round(mol.atoms.get(id).y - cy)}`;
  const atoms = [...mol.atoms.keys()].map(at).sort();
  const bonds = [...mol.bonds.values()].map((b) => `${[at(b.a), at(b.b)].sort().join('|')}#${b.order}`).sort();
  return [...atoms, ...bonds];
}

/**
 * Tells whether a point lies strictly inside a convex polygon given in
 * order (on the inner side of every edge, with a small tolerance).
 *
 * @param {{x: number, y: number}} p - The point.
 * @param {Array<{x: number, y: number}>} polygon - Convex polygon vertices in order.
 * @returns {boolean} True when inside.
 */
function insideConvex(p, polygon) {
  const signs = polygon.map((a, i) => {
    const b = polygon[(i + 1) % polygon.length];
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  });
  return signs.every((s) => s > 1e-6) || signs.every((s) => s < -1e-6);
}

/**
 * Asserts that nothing but the ring is drawn inside the ring polygon: no
 * side-chain atom inside it, and no side-chain bond entering it (checked at
 * points along the bond, which also catches a bond pointing inwards from a
 * ring atom or passing through the ring).
 *
 * @param {object} out - The laid-out molecule.
 * @param {number[]} ring - Ring atoms in ring order.
 * @param {string} label - Text for failure messages.
 * @returns {void}
 */
function assertRingInteriorEmpty(out, ring, label) {
  const polygon = ring.map((id) => out.atoms.get(id));
  const inRing = new Set(ring);
  for (const atom of out.atoms.values()) {
    assert.ok(inRing.has(atom.id) || !insideConvex(atom, polygon), `${label}: atom ${atom.id} is inside the ring`);
  }
  for (const bond of out.bonds.values()) {
    if (inRing.has(bond.a) && inRing.has(bond.b)) {
      continue;
    }
    const a = out.atoms.get(bond.a);
    const b = out.atoms.get(bond.b);
    for (let t = 1; t < 10; t += 1) {
      const p = { x: a.x + ((b.x - a.x) * t) / 10, y: a.y + ((b.y - a.y) * t) / 10 };
      assert.ok(!insideConvex(p, polygon), `${label}: bond ${bond.id} enters the ring`);
    }
  }
} // End of function assertRingInteriorEmpty()

/**
 * Lays out a ring molecule and checks every property of the ring strategy.
 *
 * @param {object} mol - A molecule whose parent is a single carbocycle.
 * @param {string} label - Text for failure messages.
 * @returns {{out: object, result: object}} The laid-out copy and the naming result.
 */
function checkRing(mol, label) {
  const before = JSON.stringify(moleculeToJSON(mol));
  const result = nameMolecule(mol);
  assert.ok(result.ok, `${label} names`);
  assert.equal(result.structure.parentKind, 'ring', `${label}: ring parent`);
  const out = canonicalLayout(mol, result);
  assert.equal(JSON.stringify(moleculeToJSON(mol)), before, `${label}: input not mutated`);
  assert.equal(topology(out), topology(mol), `${label}: ids and topology unchanged`);
  const problems = layoutProblems(out);
  assert.equal(problems.crossings, 0, `${label}: no bond crossings`);
  assert.ok(closestApproach(out) >= 0.5 * BOND_LENGTH, `${label}: clearance`);
  assert.ok(problems.ok, `${label}: layoutProblems() accepts it`);
  for (const bond of out.bonds.values()) {
    const a = out.atoms.get(bond.a);
    const b = out.atoms.get(bond.b);
    assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - BOND_LENGTH) < 1e-6, `${label}: bond ${bond.id} length`);
  }
  // Regular polygon: equal radii around the ring centre, locant 1 on top, numbering clockwise.
  const ring = result.parent.atoms;
  const n = ring.length;
  const cx = ring.reduce((s, id) => s + out.atoms.get(id).x, 0) / n;
  const cy = ring.reduce((s, id) => s + out.atoms.get(id).y, 0) / n;
  const r = ringRadius(n, BOND_LENGTH);
  ring.forEach((id, i) => {
    const p = out.atoms.get(id);
    assert.ok(Math.abs(Math.hypot(p.x - cx, p.y - cy) - r) < 1e-6, `${label}: radius of locant ${i + 1}`);
    const expected = RING_START_ANGLE + (RING_DIRECTION * 2 * Math.PI * i) / n;
    assert.ok(Math.abs(p.x - cx - r * Math.cos(expected)) < 1e-6 && Math.abs(p.y - cy - r * Math.sin(expected)) < 1e-6,
      `${label}: locant ${i + 1} at its polygon vertex`);
  });
  assertRingInteriorEmpty(out, ring, label);
  assert.equal(problems.inside, 0, `${label}: layoutProblems() finds nothing inside the ring`);
  // Side chains leave outwards: their first atom is farther from the centre than the ring.
  const inRing = new Set(ring);
  for (const bond of out.bonds.values()) {
    if (inRing.has(bond.a) !== inRing.has(bond.b)) {
      const outer = out.atoms.get(inRing.has(bond.a) ? bond.b : bond.a);
      assert.ok(Math.hypot(outer.x - cx, outer.y - cy) > r, `${label}: bond ${bond.id} points outwards`);
    }
  }
  return { out, result };
} // End of function checkRing()

test('bare rings of every size become regular polygons with locant 1 on top', () => {
  for (const n of [3, 4, 5, 6, 8, 12, 30]) {
    const { out, result } = checkRing(parseSmiles(`C1${'C'.repeat(n - 1)}1`), `C${n} ring`);
    const top = out.atoms.get(result.parent.atoms[0]);
    for (const atom of out.atoms.values()) {
      assert.ok(top.y <= atom.y + 1e-9, `C${n}: locant 1 is the top vertex`);
    }
    const second = out.atoms.get(result.parent.atoms[1]);
    assert.ok(second.x > top.x, `C${n}: the numbering runs clockwise (locant 2 to the right of 1)`);
  }
});

test('substituted and unsaturated rings get a clear, numbered drawing', () => {
  const cases = [
    ['CC1CCCCC1', 'metilciclohexano'],
    ['CCC1CCCC(C)C1', '1-etil-3-metilciclohexano'],
    ['CC1(C)CCCCC1', '1,1-dimetilciclohexano'],
    ['CCC1CC=CCC1', null],
    ['CC(C)CC(CC(C)(C)C)CC1CCCCC1', null],
    ['CCCCCCCCC1CC1', null],
    ['CC1(C)CCCC(C)(C)C1(C)C', null],
    ['CC(C)(C)C1CCCCC1C(C)(C)C', null],
    ['C1CC(CCCC)C1(CC)CCC', null],
    ['CC1=CCCCCCCCCCCCCC1', null],
    // Regression (I-27b review): the search used to turn a whole isopropyl into the octagon.
    ['C1(C(C)C)C(C(C)C)(C(C)C)CCCCCC1', '1,1,2-triisopropilciclooctano'],
  ];
  for (const [smiles, name] of cases) {
    const { result } = checkRing(parseSmiles(smiles), smiles);
    if (name) {
      assert.equal(result.name, name);
    }
  }
});

test('the drawing follows the naming result: locant 1 on the substituent, 3 clockwise from it', () => {
  const mol = parseSmiles('CCC1CCCC(C)C1');
  const { out, result } = checkRing(mol, '1-etil-3-metilciclohexano');
  assert.equal(result.name, '1-etil-3-metilciclohexano');
  const [c1, , c3] = result.parent.atoms.map((id) => out.atoms.get(id));
  const ethyl = [...out.atoms.values()].find((a) => a.id !== c1.id && Math.hypot(a.x - c1.x, a.y - c1.y) < BOND_LENGTH + 1e-6
    && !result.parent.atoms.includes(a.id));
  assert.ok(ethyl && ethyl.y < c1.y, 'the ethyl leaves locant 1 upwards');
  assert.ok(c3.x > c1.x && c3.y > c1.y, 'locant 3 is clockwise (down right) from locant 1');
});

test('two side chains on one ring atom are spread symmetrically about the exterior bisector', () => {
  const [a, b] = ringBranchAngles(0, 6, 2);
  const radial = RING_START_ANGLE;
  assert.ok(Math.abs((a + b) / 2 - radial) < 1e-9);
  const spread = Math.abs(a - radial) * (180 / Math.PI);
  assert.ok(spread >= 30 && spread <= 60, `${spread}° from the bisector`);
  for (const n of [3, 30]) {
    const [p] = ringBranchAngles(0, n, 2);
    const s = Math.abs(p - radial) * (180 / Math.PI);
    assert.ok(s >= 30 && s <= 60, `C${n}: ${s}°`);
  }
  assert.deepEqual(ringBranchAngles(2, 6, 1), [RING_START_ANGLE + (2 * Math.PI * 2) / 6]);
});

test('the ring layout is deterministic and independent of ids, insertion order and coordinates', () => {
  const random = seededRandom(2727);
  for (const smiles of ['CCC1CCCC(C)C1', 'CC(C)C1CCC(C(C)CC)CC1', 'CCC(C)C1(CC)CCC=CC1', 'CC1(C)CCCC(C)(C)C1(C)C', 'CCCCCCC1CC1C']) {
    const mol = parseSmiles(smiles);
    const result = nameMolecule(mol);
    const first = canonicalLayout(mol, result);
    const again = canonicalLayout(mol, nameMolecule(mol));
    assert.deepEqual(moleculeToJSON(again), moleculeToJSON(first), `${smiles}: deterministic`);
    const expected = shape(first, result.parent.atoms);
    for (let k = 0; k < 4; k += 1) {
      const copy = scrambleMolecule(mol, random);
      for (const atom of copy.atoms.values()) {
        atom.x = random() * 500;
        atom.y = random() * 500;
      }
      const res = nameMolecule(copy);
      assert.equal(res.name, result.name);
      assert.deepEqual(shape(canonicalLayout(copy, res), res.parent.atoms), expected, `${smiles}: same shape (copy ${k})`);
    }
  } // End of the loop over the molecules
});

test('branches with equal subtrees but different attachment bond orders are drawn independently of ids', () => {
  // Regression (I-27b review): `=CH2` and `–CH3` have equal rooted keys; only the attachment bond order tells
  // them apart, so without it the drawing followed atom ids.
  const random = seededRandom(2728);
  for (const smiles of ['C1CCCCC1C(=C)C', 'C=C1CCCCC1C(C)=C', 'CC(=C)C1CCC(C(C)=C)CC1']) {
    const mol = parseSmiles(smiles);
    const result = nameMolecule(mol);
    const expected = shape(checkRing(mol, smiles).out, result.parent.atoms);
    for (let k = 0; k < 8; k += 1) {
      const copy = scrambleMolecule(mol, random);
      const res = nameMolecule(copy);
      assert.equal(res.name, result.name);
      assert.deepEqual(shape(checkRing(copy, `${smiles} copy ${k}`).out, res.parent.atoms), expected, `${smiles}: same shape (copy ${k})`);
    }
  } // End of the loop over the molecules
});

test('isSingleRing accepts exactly one ring given in ring order', () => {
  const mol = parseSmiles('CC1CCCCC1');
  const ring = nameMolecule(mol).parent.atoms;
  assert.equal(isSingleRing(mol, ring), true);
  assert.equal(isSingleRing(mol, [...ring].reverse()), true);
  assert.equal(isSingleRing(mol, [ring[0], ring[2], ring[1], ...ring.slice(3)]), false, 'not in ring order');
  assert.equal(isSingleRing(mol, ring.slice(0, 5)), false, 'not closed');
  const fused = parseSmiles('C1CCC2CCCCC2C1');
  assert.equal(isSingleRing(fused, [1, 2, 3, 4, 9, 10]), false, 'two rings');
  assert.throws(() => canonicalLayout(fused, { ok: true, parent: { atoms: [1, 2, 3, 4, 9, 10], bonds: [] } }),
    /not a connected tree or a single ring/);
});

/**
 * Random side chain in SMILES (a small tree of carbons).
 *
 * @param {function(): number} random - Seeded generator.
 * @param {{n: number}} budget - Carbons still allowed (decremented).
 * @param {number} depth - Depth of this atom.
 * @returns {string} The branch SMILES.
 */
function randomBranch(random, budget, depth) {
  budget.n -= 1;
  const kids = depth > 4 || budget.n <= 0 ? 0 : random() < 0.55 ? 1 : random() < 0.3 ? 2 : 0;
  const parts = [];
  for (let k = 0; k < kids && budget.n > 0; k += 1) {
    parts.push(randomBranch(random, budget, depth + 1));
  }
  return parts.length === 0 ? 'C' : `C${parts.slice(0, -1).map((p) => `(${p})`).join('')}${parts.at(-1)}`;
}

/**
 * Random single carbocycle with side chains and the odd ring double bond, in SMILES.
 *
 * @param {function(): number} random - Seeded generator.
 * @returns {string} The SMILES.
 */
function randomRing(random) {
  const n = random() < 0.8 ? 3 + Math.floor(random() * 10) : 13 + Math.floor(random() * 18);
  const budget = { n: 4 + Math.floor(random() * 14) };
  let smiles = '';
  for (let i = 0; i < n; i += 1) {
    let atom = i === 0 || i === n - 1 ? 'C1' : 'C';
    const k = random() < 0.35 ? (random() < 0.25 ? 2 : 1) : 0;
    for (let j = 0; j < k; j += 1) {
      atom += `(${randomBranch(random, budget, 0)})`;
    }
    smiles += (i > 0 && n >= 5 && random() < 0.1 ? '=' : '') + atom;
  }
  return smiles;
} // End of function randomRing()

test('random single carbocycles with side chains always get a clear layout (seeded)', () => {
  const random = seededRandom(27);
  let laid = 0;
  for (let t = 0; t < 600; t += 1) {
    const smiles = randomRing(random);
    let mol;
    try {
      mol = parseSmiles(smiles);
    } catch {
      continue; // A double bond next to a full carbon: a valence error, not a layout case.
    }
    const result = nameMolecule(mol);
    if (!result.ok) {
      continue; // Too big, or otherwise not nameable: not a layout case.
    }
    const out = canonicalLayout(mol, result);
    assert.ok(layoutProblems(out).ok, `${smiles}: clear layout`);
    assertRingInteriorEmpty(out, result.parent.atoms, smiles);
    laid += 1;
  }
  assert.ok(laid >= 500, `${laid} random rings laid out`);
});
