/**
 * @file Unit tests for the canonical redraw (src/layout/canonical.js,
 * design.md §7), the Ejemplos list (src/ui/examples.js, design.md §9) and
 * the editor core's setCoordinates() transaction.
 *
 * For every fixture molecule (tests/fixtures/names.tsv), the layout keeps
 * ids and topology, puts no two atoms closer than half a bond length, draws
 * the parent chain left to right in locant order, has no bond crossings and
 * keeps linear centres straight.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON } from '../../src/model/molecule.js';
import { hasCycle } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { canonicalLayout, closestApproach, spreadInGap, layoutProblems } from '../../src/layout/canonical.js';
import { listExamples, exampleMolecule } from '../../src/ui/examples.js';
import { createEditorCore } from '../../src/editor/editor.js';
import { BOND_LENGTH, isLinearCentre } from '../../src/editor/geometry.js';
import { neighbours } from '../../src/model/molecule.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures', 'names.tsv');

/**
 * Reads the SMILES column of the fixture table (skipping the header and `#` lines).
 *
 * @returns {Promise<string[]>} The fixture SMILES.
 */
async function fixtureSmiles() {
  const lines = (await readFile(FIXTURES, 'utf8')).split('\n').slice(1);
  return lines.filter((l) => l.trim() !== '' && !l.startsWith('#')).map((l) => l.split('\t')[0]);
}

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
 * Checks every layout property of one molecule.
 *
 * @param {string} smiles - The molecule.
 * @returns {void}
 */
function checkLayout(smiles) {
  const mol = parseSmiles(smiles);
  const before = JSON.stringify(moleculeToJSON(mol));
  const result = nameMolecule(mol);
  assert.ok(result.ok, `${smiles} names`);
  const out = canonicalLayout(mol, result);
  assert.equal(JSON.stringify(moleculeToJSON(mol)), before, `${smiles}: input not mutated`);
  assert.equal(topology(out), topology(mol), `${smiles}: ids and topology unchanged`);
  for (const atom of out.atoms.values()) {
    assert.ok(Number.isFinite(atom.x) && Number.isFinite(atom.y), `${smiles}: finite coordinates`);
  }
  const closest = closestApproach(out);
  assert.ok(closest >= 0.5 * BOND_LENGTH, `${smiles}: closest atoms ${(closest / BOND_LENGTH).toFixed(2)} bond lengths apart`);
  const problems = layoutProblems(out);
  assert.equal(problems.crossings, 0, `${smiles}: no bond crossings`);
  assert.ok(problems.ok, `${smiles}: layoutProblems() accepts the layout`);
  const xs = result.parent.atoms.map((id) => out.atoms.get(id).x);
  xs.slice(1).forEach((x, i) => assert.ok(x > xs[i], `${smiles}: parent x increases at locant ${i + 2}`));
  for (const bond of out.bonds.values()) {
    const a = out.atoms.get(bond.a);
    const b = out.atoms.get(bond.b);
    assert.ok(Math.abs(Math.hypot(a.x - b.x, a.y - b.y) - BOND_LENGTH) < 1e-6, `${smiles}: bond ${bond.id} length`);
  }
  for (const atom of out.atoms.values()) {
    const around = neighbours(out, atom.id);
    if (around.length === 2 && isLinearCentre(out, atom.id)) {
      const [p, q] = around.map((n) => out.atoms.get(n.atom));
      const cross = (p.x - atom.x) * (q.y - atom.y) - (p.y - atom.y) * (q.x - atom.x);
      const dot = (p.x - atom.x) * (q.x - atom.x) + (p.y - atom.y) * (q.y - atom.y);
      assert.ok(Math.abs(cross) < 1e-6 && dot < 0, `${smiles}: linear centre ${atom.id} is straight`);
    }
  }
} // End of function checkLayout()

test('every fixture molecule gets a clear canonical layout (rings: ring-layout.test.js)', async () => {
  const all = await fixtureSmiles();
  assert.ok(all.length >= 150);
  for (const smiles of all) {
    const mol = parseSmiles(smiles);
    if (hasCycle(mol)) {
      // Rings get the polygon strategy (I-27b), checked in detail in ring-layout.test.js.
      assert.ok(layoutProblems(canonicalLayout(mol, nameMolecule(mol))).ok, smiles);
      continue;
    }
    checkLayout(smiles);
  }
});

test('densely branched and unsaturated molecules get a clear layout', () => {
  for (const smiles of [
    'CC(C)(C)C(C)(C)C(C)(C)C',
    'CCC(CC)(CC)C(CC)(CC)CC',
    'CCCCC(C(C)(C)C)(C(C)(C)C)CCCC',
    'CC(C)C(C(C)C)(C(C)C)C(C)C',
    'C=CC(=C)C(=C)C=C',
    'CC#CC(C#CC)(C#CC)C#CC',
    'C=C=CC(C=C=C)=C=C',
    'CCC(=C(C)C)C(=C(C)C)CC',
    'CC(C)(C)CC(C)(C)CC(C)(C)CC(C)(C)C',
  ]) {
    checkLayout(smiles);
  }
});

test('methane and ethane are laid out without errors', () => {
  const methane = parseSmiles('C');
  const out = canonicalLayout(methane, nameMolecule(methane), { center: { x: 5, y: 7 } });
  assert.deepEqual([out.atoms.get(1).x, out.atoms.get(1).y], [5, 7]);
  checkLayout('CC');
});

test('the layout is centred where the old drawing was, or on the given point', () => {
  const mol = parseSmiles('CCCC');
  [...mol.atoms.values()].forEach((atom, i) => {
    atom.x = 100 + i * 10;
    atom.y = 200;
  });
  const out = canonicalLayout(mol, nameMolecule(mol));
  const xs = [...out.atoms.values()].map((a) => a.x);
  const ys = [...out.atoms.values()].map((a) => a.y);
  assert.ok(Math.abs((Math.min(...xs) + Math.max(...xs)) / 2 - 115) < 1e-9);
  assert.ok(Math.abs((Math.min(...ys) + Math.max(...ys)) / 2 - 200) < 1e-9);
});

test('the parent zigzag has locant 1 on the left and straight linear runs', () => {
  const mol = parseSmiles('CCC#CCC');
  const result = nameMolecule(mol);
  const out = canonicalLayout(mol, result);
  const [c1, c2, c3, c4] = result.parent.atoms.map((id) => out.atoms.get(id));
  assert.ok(c1.x < c2.x);
  assert.ok(Math.abs(c2.y - c3.y) < 1e-9 && Math.abs(c3.y - c4.y) < 1e-9, 'bonds at the triple bond are horizontal');
});

test('canonicalLayout refuses a failed or foreign naming result', () => {
  const mol = parseSmiles('CCC');
  assert.throws(() => canonicalLayout(mol, { ok: false }), /successful naming result/);
  assert.throws(() => canonicalLayout(mol, { ok: true, parent: { atoms: [99], bonds: [] } }), /does not belong/);
});

test('spreadInGap spreads new bonds inside the largest free gap', () => {
  const [up] = spreadInGap([Math.PI * (5 / 6), Math.PI / 6], 1);
  assert.ok(Math.abs(Math.sin(up) + 1) < 1e-9, 'one branch points straight up (y down)');
  const two = spreadInGap([0], 2);
  assert.equal(two.length, 2);
});

test('the Ejemplos list covers every required feature with 12–15 nameable molecules', () => {
  const examples = listExamples();
  assert.ok(examples.length >= 12 && examples.length <= 15);
  assert.equal(new Set(examples.map((e) => e.id)).size, examples.length);
  for (const example of examples) {
    assert.ok(example.label.length > 0);
    const result = nameMolecule(parseSmiles(example.smiles));
    assert.ok(result.ok, example.smiles);
    assert.equal(result.name, example.name, `${example.smiles} is named ${example.name}`);
    const mol = exampleMolecule(example);
    assert.ok(closestApproach(mol) >= 0.5 * BOND_LENGTH);
  }
  const names = examples.map((e) => e.name);
  for (const required of ['2-metilpropano', '4-etenilheptano', '3-metilidenhexano']) {
    assert.ok(names.includes(required), required);
  }
  assert.ok(names.some((n) => n.includes('isopropil')), 'an isopropil case');
  assert.ok(names.some((n) => n.includes('tert-butil')), 'a tert-butil case');
  assert.ok(names.some((n) => /-\d+(,\d+)*-dieno$/.test(n)), 'a diene');
  assert.ok(names.some((n) => /-en-\d+-ino$/.test(n)), 'an en-yne');
  assert.ok(names.some((n) => /^[a-z]+ano$/.test(n)), 'an unbranched alkane');
});

test('setCoordinates is one undoable coordinate edit', () => {
  const events = [];
  const editor = createEditorCore({ onEdit: (e) => events.push(e) });
  const mol = parseSmiles('CCCC');
  [...mol.atoms.values()].forEach((atom, i) => {
    atom.x = i * BOND_LENGTH;
  });
  assert.ok(editor.loadMolecule(mol).ok);
  const before = editor.getMoleculeJSON();
  const laid = canonicalLayout(editor.getMolecule(), nameMolecule(editor.getMolecule()));
  const outcome = editor.setCoordinates(new Map([...laid.atoms.values()].map((a) => [a.id, { x: a.x, y: a.y }])));
  assert.ok(outcome.ok && outcome.changed);
  assert.deepEqual(events.at(-1), { reason: 'edit', kind: 'coordinates' });
  assert.equal(topology(editor.getMolecule()), topology(mol));
  editor.undo();
  assert.deepEqual(editor.getMoleculeJSON(), before);
  assert.deepEqual(events.at(-1), { reason: 'undo', kind: 'coordinates' });
  assert.equal(editor.setCoordinates(new Map([[99, { x: 0, y: 0 }]])).ok, false, 'unknown atoms are refused');
});

test('layoutProblems reports crossing bonds and atoms too close together', () => {
  const mol = parseSmiles('CCCC');
  const place = [[0, 0], [40, 0], [0, 30], [40, 30]];
  place.forEach(([x, y], i) => Object.assign(mol.atoms.get(i + 1), { x, y }));
  // Bonds 1-2 and 3-4 are parallel; move atom 4 so that bond 3-4 crosses bond 1-2.
  Object.assign(mol.atoms.get(4), { x: 20, y: -20 });
  const crossed = layoutProblems(mol);
  assert.equal(crossed.crossings, 1);
  assert.equal(crossed.ok, false);
  Object.assign(mol.atoms.get(4), { x: 40, y: 5 });
  const close = layoutProblems(mol);
  assert.equal(close.crossings, 0);
  assert.equal(close.ok, false, 'atoms 2 and 4 are 5 units apart');
  const clear = canonicalLayout(mol, nameMolecule(mol));
  assert.equal(layoutProblems(clear).ok, true);
});
