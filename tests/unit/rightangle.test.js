/**
 * @file Unit tests for the 90° view (design.md §6.3): the pure projection
 * src/layout/rightangle.js, its projector and note in src/ui/canvasbar.js,
 * and the `=` / `≡` strokes of src/editor/render.js.
 *
 * The reference molecule is the user's picture of 2,2,4-trimethylpentane:
 * the chain on one horizontal line, both C2 methyls vertical (one up, one
 * down), the C4 methyl vertical. A seeded sweep over random molecules checks
 * every produced drawing independently (axis-aligned bonds, no overlapping
 * labels, no bond through a label, no crossings) and reports the fallback rate.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON, createMolecule, addAtom, addBond, cloneMolecule } from '../../src/model/molecule.js';
import { nameMolecule } from '../../src/naming/index.js';
import { rightAngleLayout, rightAngleProblems, gridSteps, MIN_STROKE } from '../../src/layout/rightangle.js';
import { projectRightAngles, rightAngleNote, RIGHT_ANGLE_HINT, FALLBACK_NOTES } from '../../src/ui/canvasbar.js';
import {
  carbonLabel, labelSize, rightAngleSegments, rightAngleCut, RIGHT_ANGLE_PAD,
} from '../../src/editor/render.js';
import { generateMolecules } from '../../scripts/oracle/generate.mjs';

/**
 * Names a SMILES and lays it out at 90°.
 *
 * @param {string} smiles - The molecule.
 * @returns {{mol: object, result: object, out: object}} Molecule, naming result and layout outcome.
 */
function project(smiles) {
  const mol = parseSmiles(smiles);
  const result = nameMolecule(mol);
  assert.ok(result.ok, `${smiles} names`);
  return { mol, result, out: rightAngleLayout(mol, result) };
}

/**
 * Independent checks of a produced 90° drawing, written apart from
 * rightAngleProblems(): axis-aligned bonds, distinct label boxes, and no
 * bond segment touching a label box of another carbon.
 *
 * @param {object} mol - The molecule.
 * @param {Map<number, {x: number, y: number}>} pos - The projected positions.
 * @param {string} tag - Name for messages.
 * @returns {void}
 */
function checkDrawing(mol, pos, tag) {
  assert.equal(pos.size, mol.atoms.size, `${tag}: every atom placed`);
  const box = (id) => {
    const p = pos.get(id);
    const s = labelSize(carbonLabel(mol, id));
    return { x1: p.x - s.width / 2, x2: p.x + s.width / 2, y1: p.y - s.height / 2, y2: p.y + s.height / 2 };
  };
  const ids = [...mol.atoms.keys()];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const p = box(ids[i]);
      const q = box(ids[j]);
      const apart = p.x2 <= q.x1 || q.x2 <= p.x1 || p.y2 <= q.y1 || q.y2 <= p.y1;
      assert.ok(apart, `${tag}: labels of ${ids[i]} and ${ids[j]} do not overlap`);
    }
  }
  for (const bond of mol.bonds.values()) {
    const p = pos.get(bond.a);
    const q = pos.get(bond.b);
    assert.ok(Math.abs(p.x - q.x) < 1e-6 || Math.abs(p.y - q.y) < 1e-6, `${tag}: bond ${bond.id} axis-aligned`);
    for (const id of ids) {
      if (id === bond.a || id === bond.b) {
        continue;
      }
      const b = box(id);
      const clear = Math.max(p.x, q.x) < b.x1 || Math.min(p.x, q.x) > b.x2 || Math.max(p.y, q.y) < b.y1 || Math.min(p.y, q.y) > b.y2;
      assert.ok(clear, `${tag}: bond ${bond.id} misses the label of ${id}`);
    }
  } // End of the loop over the bonds
  assert.deepEqual(rightAngleProblems(mol, pos), [], `${tag}: rightAngleProblems() finds nothing`);
} // End of function checkDrawing()

test('reference picture: 2,2,4-trimethylpentane with the chain horizontal and the methyls vertical', () => {
  const { mol, result, out } = project('CC(C)(C)CC(C)C');
  assert.equal(result.name, '2,2,4-trimetilpentano');
  assert.ok(out.ok);
  const pos = out.positions;
  const chain = result.parent.atoms;
  const step = gridSteps(mol);
  chain.forEach((id, i) => {
    assert.equal(pos.get(id).y, pos.get(chain[0]).y, `chain atom ${i + 1} on the chain line`);
    if (i > 0) {
      assert.ok(Math.abs(pos.get(id).x - pos.get(chain[i - 1]).x - step.col) < 1e-6, `locant ${i + 1} one column right`);
    }
  });
  const branchesOf = (id) => [...mol.bonds.values()]
    .filter((b) => b.a === id || b.b === id)
    .map((b) => (b.a === id ? b.b : b.a))
    .filter((n) => !chain.includes(n));
  const c2 = chain[1];
  const c4 = chain[3];
  const up = branchesOf(c2).map((id) => pos.get(id));
  assert.equal(up.length, 2);
  assert.ok(up.every((p) => p.x === pos.get(c2).x), 'C2 methyls straight above/below C2');
  assert.deepEqual(up.map((p) => Math.sign(p.y - pos.get(c2).y)).sort(), [-1, 1], 'one methyl up, one down');
  const [m4] = branchesOf(c4).map((id) => pos.get(id));
  assert.equal(m4.x, pos.get(c4).x, 'C4 methyl straight below C4');
  assert.ok(m4.y > pos.get(c4).y, 'C4 methyl hangs down, as in the picture');
  checkDrawing(mol, pos, 'reference');
});

test('the projection never mutates the molecule and keeps it centred', () => {
  const mol = parseSmiles('CC(C)(C)CC(C)C');
  const before = JSON.stringify(moleculeToJSON(mol));
  const out = rightAngleLayout(mol, nameMolecule(mol));
  assert.equal(JSON.stringify(moleculeToJSON(mol)), before);
  const xs = [...mol.atoms.values()].map((a) => a.x);
  const px = [...out.positions.values()].map((p) => p.x);
  assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - (Math.min(...px) + Math.max(...px)) / 2) < 1e-6);
  const centred = rightAngleLayout(mol, nameMolecule(mol), { center: { x: 500, y: 300 } });
  const cy = [...centred.positions.values()].map((p) => p.y);
  assert.ok(Math.abs((Math.min(...cy) + Math.max(...cy)) / 2 - 300) < 1e-6);
});

test('unsaturated chains stay on one line and keep their bond orders', () => {
  for (const smiles of ['C=CC=CC', 'C#CC(C)C=C', 'C=C=CCC(C)C#C', 'CC#CC(C)(C)C=C']) {
    const { mol, result, out } = project(smiles);
    assert.ok(out.ok, `${smiles} projects`);
    const ys = result.parent.atoms.map((id) => out.positions.get(id).y);
    assert.ok(ys.every((y) => y === ys[0]), `${smiles}: parent on one horizontal line`);
    checkDrawing(mol, out.positions, smiles);
  }
});

test('iliden branches (double bond to a substituent) hang vertically', () => {
  for (const smiles of ['CCCC(=CC)CCC', 'CCCC(=C(C)C)CCC']) {
    const { mol, result, out } = project(smiles);
    assert.match(result.name, /iliden/);
    assert.ok(out.ok);
    const double = [...mol.bonds.values()].find((b) => b.order === 2);
    const p = out.positions.get(double.a);
    const q = out.positions.get(double.b);
    assert.equal(p.x, q.x, `${smiles}: the iliden double bond is vertical`);
    checkDrawing(mol, out.positions, smiles);
  }
});

test('long and branched substituents are placed without collisions', () => {
  const cases = [
    'CCCC(C(C)(C)C)CCCC', // 4-tert-butiloctano
    'CC(C)C(C(C)C)C(CC)CCC', // isopropyl next to ethyl
    'CCCCC(CC(C)CC)C(C(C)C)CCCC',
    'CCCCCCC(C(C)(C)CC(C)(C)C)C(C(C)C)(CCCC)CCCCC',
    'CCCCCCCC(C(CC)(CC)CC)C(CCC(C)C)CCCCCC',
  ];
  for (const smiles of cases) {
    const { mol, out } = project(smiles);
    assert.ok(out.ok, `${smiles} projects`);
    checkDrawing(mol, out.positions, smiles);
  }
});

test('methane, ethane and ethyne project to a point or a line', () => {
  for (const smiles of ['C', 'CC', 'C#C']) {
    const { mol, out } = project(smiles);
    assert.ok(out.ok, smiles);
    checkDrawing(mol, out.positions, smiles);
  }
});

test('a crowded substituent that has no right-angle drawing reports NO_ROOM', () => {
  const { out } = project('CCCCCCC(C(C(C)(C)C)C(C)(C)C)CCCCCC');
  assert.deepEqual(out, { ok: false, reason: 'NO_ROOM' });
});

test('rightAngleLayout requires a successful naming result of the molecule', () => {
  const mol = parseSmiles('CCC');
  assert.throws(() => rightAngleLayout(mol, { ok: false }), /naming result/);
  assert.throws(() => rightAngleLayout(mol, { ok: true, parent: { atoms: [99] } }), /does not belong/);
});

test('rightAngleProblems() rejects a zigzag and overlapping or too short bonds', () => {
  const mol = parseSmiles('CCCC');
  const zigzag = new Map([...mol.atoms.values()].map((a, i) => [a.id, { x: i * 40, y: (i % 2) * 20 }]));
  assert.ok(rightAngleProblems(mol, zigzag).some((p) => /not axis-aligned/.test(p)));
  const cramped = new Map([...mol.atoms.values()].map((a, i) => [a.id, { x: i * 20, y: 0 }]));
  const problems = rightAngleProblems(mol, cramped);
  assert.ok(problems.some((p) => /overlap/.test(p)));
  assert.ok(problems.some((p) => /too short/.test(p)));
  const folded = new Map([...mol.atoms.values()].map((a, i) => [a.id, { x: [0, 60, 120, 60][i], y: [0, 0, 0, 0][i] }]));
  assert.ok(rightAngleProblems(mol, folded).length > 0, 'a bond folded back onto another is refused');
});

test('grid steps fit the widest label plus a visible stroke', () => {
  const mol = parseSmiles('CCC');
  const step = gridSteps(mol);
  const widest = labelSize('CH₃').width;
  assert.ok(step.col >= widest + 2 * RIGHT_ANGLE_PAD + MIN_STROKE);
  assert.ok(labelSize('CH₃').width > labelSize('CH').width && labelSize('CH').width > labelSize('C').width);
});

test('90° strokes: = and ≡ as equal parallel lines, stopped short of the labels', () => {
  const mol = createMolecule();
  const a = addAtom(mol, { x: 0, y: 0 });
  const b = addAtom(mol, { x: 60, y: 0 });
  const c = addAtom(mol, { x: 60, y: 45 });
  const ab = addBond(mol, a, b, 3);
  const bc = addBond(mol, b, c, 1);
  const triple = rightAngleSegments(mol, ab);
  assert.equal(triple.length, 3);
  assert.deepEqual(triple.map((s) => s.y1).sort((p, q) => p - q), [-6, 0, 6]);
  for (const s of triple) {
    assert.equal(s.y1, s.y2, 'horizontal');
    assert.ok(Math.abs(s.x1 - rightAngleCut(carbonLabel(mol, a), true)) < 1e-9, 'starts after the first label');
    assert.ok(Math.abs(s.x2 - (60 - rightAngleCut(carbonLabel(mol, b), true))) < 1e-9, 'ends before the second label');
  }
  const [vertical] = rightAngleSegments(mol, bc);
  assert.equal(vertical.x1, vertical.x2);
  assert.ok(Math.abs(vertical.y1 - rightAngleCut(carbonLabel(mol, b), false)) < 1e-9);
  const copy = cloneMolecule(mol);
  copy.bonds.get(ab).order = 1;
  copy.bonds.get(bc).order = 2;
  const double = rightAngleSegments(copy, bc);
  assert.equal(double.length, 2);
  assert.deepEqual(double.map((s) => s.x1).sort((p, q) => p - q), [57, 63]);
});

test('projectRightAngles(): fallback reasons and the Spanish note', () => {
  assert.deepEqual(projectRightAngles(createMolecule()), { ok: false, reason: 'EMPTY' });
  const pieces = parseSmiles('CC');
  addAtom(pieces, { x: 200, y: 0 });
  assert.equal(projectRightAngles(pieces).reason, 'DISCONNECTED');
  const ring = parseSmiles('CCC');
  const ids = [...ring.atoms.keys()];
  addBond(ring, ids[0], ids[2], 1);
  assert.equal(projectRightAngles(ring).reason, 'CYCLE');
  assert.equal(projectRightAngles(parseSmiles('CC(C)C')).ok, true);
  assert.equal(rightAngleNote({ ok: true }), RIGHT_ANGLE_HINT);
  assert.equal(rightAngleNote({ ok: false, reason: 'NO_ROOM' }), FALLBACK_NOTES.NO_ROOM);
  assert.equal(rightAngleNote({ ok: false, reason: 'TOO_BIG' }), FALLBACK_NOTES.OTHER);
  // The projected drawing is editable: its note only mentions Mover and Ordenar dibujo.
  assert.doesNotMatch(RIGHT_ANGLE_HINT, /para editar/);
  assert.match(RIGHT_ANGLE_HINT, /mover átomos u ordenar el dibujo/);
  // A fallback leaves the drawing editable: its note never asks to turn the view off.
  for (const text of Object.values(FALLBACK_NOTES)) {
    assert.doesNotMatch(text, /Desactiva/);
  }
});

test('randomized sweep: every produced drawing is clean; fallbacks are rare', (t) => {
  const bands = [
    { minSize: 1, maxSize: 14, count: 1200, maxRate: 0.005 },
    { minSize: 15, maxSize: 40, count: 500, maxRate: 0.02 },
  ];
  const report = [];
  for (const band of bands) {
    const mols = generateMolecules({ count: band.count, seed: 150, minSize: band.minSize, maxSize: band.maxSize });
    let fallbacks = 0;
    for (const mol of mols) {
      const result = nameMolecule(mol);
      assert.ok(result.ok);
      const out = rightAngleLayout(mol, result);
      if (!out.ok) {
        fallbacks += 1;
        continue;
      }
      checkDrawing(mol, out.positions, `random ${band.minSize}-${band.maxSize}`);
    }
    const rate = fallbacks / mols.length;
    report.push(`${band.minSize}–${band.maxSize} C: ${fallbacks}/${mols.length} fallbacks`);
    assert.ok(rate <= band.maxRate, `fallback rate ${rate} within ${band.maxRate}`);
  } // End of the loop over the size bands
  t.diagnostic(report.join('; '));
});
