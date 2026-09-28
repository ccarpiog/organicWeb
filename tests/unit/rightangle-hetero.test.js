/**
 * @file Unit tests for the 90° view with heteroatoms (design.md §6.3,
 * §13.4 I-41a): src/layout/rightangle.js over representative named acyclic
 * molecules of every functional family (every atom placed, parent chain on
 * one horizontal line with locant 1 on the left, no overlapping labels or
 * crossing bonds, determinism, chain ends continuing the line), the
 * `HO` / `H₂N` labels of rightAngleLabel() (src/editor/render.js), the
 * projector and notes of src/ui/canvasbar.js, and a sweep over the fixture
 * molecules and the oracle generators of every family.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON } from '../../src/model/molecule.js';
import { hasCycle } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { rightAngleLayout, rightAngleProblems, gridSteps } from '../../src/layout/rightangle.js';
import { projectRightAngles, rightAngleNote, FALLBACK_NOTES } from '../../src/ui/canvasbar.js';
import { atomLabel, labelSize, rightAngleLabel } from '../../src/editor/render.js';
import * as generators from '../../scripts/oracle/generate.mjs';

/**
 * Independent checks of a 90° drawing (written apart from
 * rightAngleProblems(), which must agree): every atom placed, axis-aligned
 * bonds, disjoint label boxes, and no bond touching another atom's label.
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
    const s = labelSize(atomLabel(mol, id));
    return { x1: p.x - s.width / 2, x2: p.x + s.width / 2, y1: p.y - s.height / 2, y2: p.y + s.height / 2 };
  };
  const ids = [...mol.atoms.keys()];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const p = box(ids[i]);
      const q = box(ids[j]);
      assert.ok(p.x2 <= q.x1 || q.x2 <= p.x1 || p.y2 <= q.y1 || q.y2 <= p.y1, `${tag}: labels ${ids[i]}/${ids[j]} apart`);
    }
  }
  for (const bond of mol.bonds.values()) {
    const p = pos.get(bond.a);
    const q = pos.get(bond.b);
    assert.ok(Math.abs(p.x - q.x) < 1e-6 || Math.abs(p.y - q.y) < 1e-6, `${tag}: bond ${bond.id} axis-aligned`);
    for (const id of ids) {
      if (id !== bond.a && id !== bond.b) {
        const b = box(id);
        const clear = Math.max(p.x, q.x) < b.x1 || Math.min(p.x, q.x) > b.x2 || Math.max(p.y, q.y) < b.y1 || Math.min(p.y, q.y) > b.y2;
        assert.ok(clear, `${tag}: bond ${bond.id} misses the label of ${id}`);
      }
    }
  } // End of the loop over the bonds
  assert.deepEqual(rightAngleProblems(mol, pos), [], `${tag}: rightAngleProblems() agrees`);
} // End of function checkDrawing()

/**
 * Names and projects a SMILES, checking the drawing and its parent chain line.
 *
 * @param {string} smiles - The molecule.
 * @returns {{mol: object, result: object, pos: Map<number, {x: number, y: number}>}} The pieces.
 */
function projectChecked(smiles) {
  const mol = parseSmiles(smiles);
  const result = nameMolecule(mol);
  assert.ok(result.ok, `${smiles} names`);
  const out = rightAngleLayout(mol, result);
  assert.ok(out.ok, `${smiles} projects (${out.reason})`);
  checkDrawing(mol, out.positions, smiles);
  const chain = result.parent.atoms.map((id) => out.positions.get(id));
  assert.ok(chain.every((p) => Math.abs(p.y - chain[0].y) < 1e-6), `${smiles}: chain on one line`);
  chain.slice(1).forEach((p, i) => assert.ok(p.x > chain[i].x, `${smiles}: locant ${i + 2} right of locant ${i + 1}`));
  return { mol, result, pos: out.positions };
}

/**
 * Grid cell of an atom relative to another, in whole column/row steps.
 *
 * @param {object} mol - The molecule.
 * @param {Map<number, {x: number, y: number}>} pos - The projected positions.
 * @param {number} id - The atom.
 * @param {number} origin - The reference atom.
 * @returns {[number, number]} Columns right and rows down of the reference.
 */
function cell(mol, pos, id, origin) {
  const step = gridSteps(mol);
  return [Math.round((pos.get(id).x - pos.get(origin).x) / step.col), Math.round((pos.get(id).y - pos.get(origin).y) / step.row)];
}

/** Representative named acyclic molecules of every family (design.md §13). */
const FAMILIES = [
  ['CC(Cl)CO', '2-cloropropan-1-ol'],
  ['ClC(Br)(I)F', 'bromoclorofluoroyodometano'],
  ['CC(Cl)(Cl)Cl', '1,1,1-tricloroetano'],
  ['CO', 'metanol'],
  ['OCC(O)CO', 'propano-1,2,3-triol'],
  ['CCC=O', 'propanal'],
  ['CC(=O)CC', 'butan-2-ona'],
  ['CC(C)C(=O)O', 'ácido 2-metilpropanoico'],
  ['OC(=O)CCC(=O)O', 'ácido butanodioico'],
  ['CCOCC', 'etoxietano'],
  ['CC(=O)OC', 'etanoato de metilo'],
  ['CCC(=O)OCC(C)C', 'propanoato de 2-metilpropilo'],
  ['CCN(C)CC', 'N-etil-N-metiletanamina'],
  ['NCCC(=O)O', 'ácido 3-aminopropanoico'],
  ['CNC(C)=O', 'N-metiletanamida'],
  ['CC(=O)N(C)C', 'N,N-dimetiletanamida'],
  ['CCCC#N', 'butanonitrilo'],
  ['N#CCC#N', 'propanodinitrilo'],
  ['CC(O)C(N)C(=O)O', 'ácido 2-amino-3-hidroxibutanoico'],
  ['FC(F)(F)C(=O)OCC', '2,2,2-trifluoroetanoato de etilo'],
];

test('every family: named acyclic heteroatom molecules are drawn cleanly with the chain horizontal', () => {
  for (const [smiles, name] of FAMILIES) {
    const { result } = projectChecked(smiles);
    assert.equal(result.name, name, smiles);
  }
});

test('the projection is deterministic and never mutates the molecule', () => {
  for (const [smiles] of FAMILIES) {
    const mol = parseSmiles(smiles);
    const before = JSON.stringify(moleculeToJSON(mol));
    const first = rightAngleLayout(mol, nameMolecule(mol));
    const second = rightAngleLayout(mol, nameMolecule(mol));
    assert.deepEqual([...second.positions], [...first.positions], smiles);
    assert.equal(JSON.stringify(moleculeToJSON(mol)), before, smiles);
  }
});

test('chain ends continue the line: nitrile N, then a single-bonded heteroatom, then =O', () => {
  // butanonitrilo: N≡C–CH₂–CH₂–CH₃, the N one column left of C1.
  let { mol, result, pos } = projectChecked('CCCC#N');
  assert.deepEqual(cell(mol, pos, 5, result.parent.atoms[0]), [-1, 0]);
  // propanodinitrilo: both ends continue the line.
  ({ mol, result, pos } = projectChecked('N#CCC#N'));
  assert.deepEqual(cell(mol, pos, 1, result.parent.atoms[0]), [-1, 0]);
  assert.deepEqual(cell(mol, pos, 5, result.parent.atoms.at(-1)), [1, 0]);
  // Acid: HO continues the line, =O hangs vertically.
  ({ mol, result, pos } = projectChecked('CC(C)C(=O)O'));
  assert.deepEqual(cell(mol, pos, 6, 4), [-1, 0]);
  assert.equal(cell(mol, pos, 5, 4)[0], 0);
  // Ester: CH₃–O–C(=O)–CH₃, the O-bound methyl continuing from the O.
  ({ mol, result, pos } = projectChecked('CC(=O)OC'));
  assert.deepEqual(cell(mol, pos, 4, 2), [-1, 0]);
  assert.deepEqual(cell(mol, pos, 5, 2), [-2, 0]);
  assert.equal(cell(mol, pos, 3, 2)[0], 0);
  // Aldehyde: a lone =O continues the line (O=CH–).
  ({ mol, result, pos } = projectChecked('CCC=O'));
  assert.deepEqual(cell(mol, pos, 4, 3), [-1, 0]);
  // Methanol and a methane derivative: all four directions around one carbon.
  ({ mol, result, pos } = projectChecked('CO'));
  assert.deepEqual(cell(mol, pos, 2, 1), [1, 0]);
  ({ mol, result, pos } = projectChecked('ClC(Br)(I)F'));
  const around = [1, 3, 4, 5].map((id) => cell(mol, pos, id, 2).join(',')).sort();
  assert.deepEqual(around, ['-1,0', '0,-1', '0,1', '1,0']);
  // A heteroatom in the middle of the chain still hangs vertically.
  ({ mol, result, pos } = projectChecked('CC(Cl)CO'));
  assert.equal(cell(mol, pos, 3, 2)[0], 0);
}); // End of test 'chain ends continue the line…'

test('rightAngleLabel(): HO and H₂N when the bond comes from the right, else atomLabel()', () => {
  const shown = (smiles) => {
    const mol = parseSmiles(smiles);
    const out = rightAngleLayout(mol, nameMolecule(mol));
    for (const [id, p] of out.positions) {
      Object.assign(mol.atoms.get(id), p);
    }
    return mol;
  };
  let mol = shown('CC(Cl)CO');
  assert.equal(rightAngleLabel(mol, 5), 'HO');
  assert.equal(rightAngleLabel(mol, 3), 'Cl');
  assert.equal(rightAngleLabel(mol, 1), 'CH₃');
  mol = shown('CCCN');
  assert.equal(rightAngleLabel(mol, 4), 'H₂N');
  mol = shown('CO');
  assert.equal(rightAngleLabel(mol, 2), 'OH', 'bond from the left: OH as usual');
  mol = shown('CC(O)C');
  assert.equal(rightAngleLabel(mol, 3), 'OH', 'a vertical bond keeps OH');
  mol = shown('CNC(C)=O');
  assert.equal(rightAngleLabel(mol, 2), 'NH', 'an NH between two carbons keeps its label');
  assert.equal(labelSize('HO').width, labelSize('OH').width);
});

test('projectRightAngles(): heteroatoms project; unnameable and ring molecules fall back with an accurate note', () => {
  assert.equal(projectRightAngles(parseSmiles('CCO')).ok, true);
  assert.equal(projectRightAngles(parseSmiles('CC(=O)OC')).ok, true);
  const imine = projectRightAngles(parseSmiles('CCC=N'));
  assert.deepEqual(imine, { ok: false, reason: 'HETEROATOM' });
  assert.equal(rightAngleNote(imine), 'Todavía no sé nombrar esta molécula: se ve el dibujo normal.');
  const ring = projectRightAngles(parseSmiles('OC1CCCCC1'));
  assert.deepEqual(ring, { ok: false, reason: 'CYCLE' });
  assert.equal(rightAngleNote(ring), 'Hay un anillo: se ve el dibujo normal.');
  assert.doesNotMatch(FALLBACK_NOTES.HETEROATOM, /no son carbono/);
});

test('sweep: every named acyclic fixture molecule with heteroatoms is drawn cleanly', () => {
  const rows = fs.readFileSync(new URL('../fixtures/names.tsv', import.meta.url), 'utf8').split('\n').slice(1);
  let count = 0;
  for (const row of rows) {
    const smiles = row.split('\t')[0];
    if (!smiles || smiles.startsWith('#')) {
      continue;
    }
    const mol = parseSmiles(smiles);
    if (hasCycle(mol) || [...mol.atoms.values()].every((a) => a.element === 'C')) {
      continue;
    }
    const result = nameMolecule(mol);
    if (!result.ok) {
      continue;
    }
    const out = rightAngleLayout(mol, result);
    assert.ok(out.ok, `${smiles} projects`);
    checkDrawing(mol, out.positions, smiles);
    count += 1;
  } // End of the loop over the fixture rows
  assert.ok(count > 400, `${count} fixture molecules checked`);
});

test('sweep: oracle generators of every family draw cleanly; fallbacks are rare', (t) => {
  const families = ['generateHalogenated', 'generateAlcohols', 'generateCarbonyls', 'generateAcids', 'generateEsters',
    'generateEthers', 'generateAmines', 'generateAmides', 'generateNitriles', 'generateCyano', 'generateAcyl',
    'generateEsterPrefixes', 'generateAmidePrefixes'];
  let total = 0;
  let fallbacks = 0;
  for (const family of families) {
    for (const mol of generators[family]({ count: 120, seed: 41 })) {
      if (hasCycle(mol)) {
        continue;
      }
      const result = nameMolecule(mol);
      if (!result.ok) {
        continue;
      }
      total += 1;
      const out = rightAngleLayout(mol, result);
      if (!out.ok) {
        assert.equal(out.reason, 'NO_ROOM');
        fallbacks += 1;
        continue;
      }
      checkDrawing(mol, out.positions, family);
    }
  } // End of the loop over the families
  t.diagnostic(`${fallbacks}/${total} fallbacks`);
  assert.ok(total > 1000, `${total} molecules checked`);
  assert.ok(fallbacks / total <= 0.005, `fallback rate ${fallbacks}/${total}`);
}); // End of test 'sweep: oracle generators…'
