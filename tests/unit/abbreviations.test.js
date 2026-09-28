/**
 * @file Unit tests for the optional CHO/COOH abbreviations of the 90° view
 * (design.md §6.3, §13.4 I-41b): which groups qualify (abbreviationGroups()
 * in src/editor/labels.js, with the methanal / formic acid / oxalic acid /
 * ester / amide edge cases), the abbreviated projection
 * (rightAngleLayout(…, {abbreviate: true}), projectAbbreviated()) with a
 * clean rightAngleProblems() and the widest actual label setting the grid
 * steps, the atom → label mapping covering every atom of each group, the
 * mirrored `OHC` / `HOOC` texts (rightAngleLabel()), hit-testing on the
 * label (hitTest()), and the molecule, canonical key and name left exactly
 * as they were.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON, cloneMolecule } from '../../src/model/molecule.js';
import { canonicalKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { rightAngleLayout, rightAngleProblems, gridSteps, MIN_STROKE } from '../../src/layout/rightangle.js';
import { projectRightAngles, projectAbbreviated } from '../../src/ui/canvasbar.js';
import {
  abbreviationGroups, abbreviationOf, isAbbreviatedAway, sizedLabel, ABBREVIATION_TEXTS, ABBREVIATION_DESCRIPTIONS,
} from '../../src/editor/labels.js';
import { rightAngleLabel, abbreviationParts, labelSize, RIGHT_ANGLE_PAD } from '../../src/editor/render.js';
import { hitTest } from '../../src/editor/geometry.js';

/**
 * Projects a SMILES with the abbreviations on, as the editor draws it: a
 * copy of the molecule at the projected positions carrying `abbreviations`.
 *
 * @param {string} smiles - The molecule.
 * @returns {{mol: object, out: object, shown: object}} The molecule, the projection and the drawn copy.
 */
function projected(smiles) {
  const mol = parseSmiles(smiles);
  const out = projectAbbreviated(mol);
  assert.ok(out.ok, `${smiles} projects (${out.reason})`);
  const shown = cloneMolecule(mol);
  for (const [id, p] of out.positions) {
    Object.assign(shown.atoms.get(id), p);
  }
  if (out.abbreviations) {
    shown.abbreviations = out.abbreviations;
  }
  return { mol, out, shown };
}

/**
 * The abbreviation kinds found, with their atoms, sorted for comparison.
 *
 * @param {Map<number, object>|undefined} groups - The groups.
 * @returns {string[]} `kind:carbon:atoms` strings.
 */
function kinds(groups) {
  return [...(groups || new Map()).values()].map((g) => `${g.kind}:${g.carbon}:${[...g.atoms].sort((a, b) => a - b).join(',')}`).sort();
}

test('abbreviationGroups() finds terminal CHO and COOH groups bound to a carbon', () => {
  // SMILES atom ids start at 1 in writing order.
  assert.deepEqual(kinds(abbreviationGroups(parseSmiles('CCC=O'))), ['CHO:3:3,4']); // propanal
  assert.deepEqual(kinds(abbreviationGroups(parseSmiles('CCC(=O)O'))), ['COOH:3:3,4,5']); // ácido propanoico
  assert.deepEqual(kinds(abbreviationGroups(parseSmiles('OC(=O)CCC(=O)O'))), ['COOH:2:1,2,3', 'COOH:6:6,7,8']); // butanodioico
  assert.deepEqual(kinds(abbreviationGroups(parseSmiles('CCC(C)C=O'))), ['CHO:5:5,6']); // 2-metilbutanal
  assert.deepEqual(kinds(abbreviationGroups(parseSmiles('CC(O)CC(=O)O'))), ['COOH:5:5,6,7']); // 3-hidroxibutanoico: the OH stays per atom
  // Oxalic acid and ethanedial: one label on each carbon, bound to the other.
  assert.deepEqual(kinds(abbreviationGroups(parseSmiles('OC(=O)C(=O)O'))), ['COOH:2:1,2,3', 'COOH:4:4,5,6']);
  assert.deepEqual(kinds(abbreviationGroups(parseSmiles('O=CC=O'))), ['CHO:2:1,2', 'CHO:3:3,4']);
});

test('abbreviationGroups() leaves methanal, formic acid, ketones, esters, amides and acyl halides alone', () => {
  for (const smiles of ['C=O', 'OC=O', 'CC(C)=O', 'CC(=O)OC', 'O=COC', 'CC(N)=O', 'CC(Cl)=O', 'CCO', 'CC#N', 'C']) {
    assert.equal(abbreviationGroups(parseSmiles(smiles)).size, 0, smiles);
  }
});

test('the abbreviated projection is clean, keeps the chain line and maps each label to all its atoms', () => {
  const cases = [
    // Locant 1 is on the left, so a group there is written mirrored (its bond comes from the right).
    { smiles: 'CCC=O', name: 'propanal', labels: { first: 'OHC' } },
    { smiles: 'CCC(=O)O', name: 'ácido propanoico', labels: { first: 'HOOC' } },
    { smiles: 'OC(=O)CCC(=O)O', name: 'ácido butanodioico', labels: { first: 'HOOC', last: 'COOH' } },
    { smiles: 'CCC(C)C=O', name: '2-metilbutanal', labels: { first: 'OHC' } },
    { smiles: 'CC(O)CC(=O)O', name: 'ácido 3-hidroxibutanoico', labels: { first: 'HOOC' } },
    { smiles: 'OC(=O)C(=O)O', name: 'ácido etanodioico', labels: { first: 'HOOC', last: 'COOH' } },
  ];
  for (const c of cases) {
    const { mol, out, shown } = projected(c.smiles);
    const result = nameMolecule(mol);
    assert.equal(result.name, c.name, c.smiles);
    assert.deepEqual(rightAngleProblems(mol, out.positions, out.abbreviations), [], `${c.smiles}: clean`);
    assert.equal(out.positions.size, mol.atoms.size, `${c.smiles}: every atom has a position`);
    // The parent chain stays on one horizontal line, locant 1 on the left.
    const chain = result.parent.atoms.map((id) => out.positions.get(id));
    assert.ok(chain.every((p) => Math.abs(p.y - chain[0].y) < 1e-6), `${c.smiles}: chain on one line`);
    chain.slice(1).forEach((p, i) => assert.ok(p.x > chain[i].x, `${c.smiles}: chain left to right`));
    for (const [end, text] of Object.entries(c.labels)) {
      const id = end === 'first' ? result.parent.atoms[0] : result.parent.atoms[result.parent.atoms.length - 1];
      assert.ok(out.abbreviations.has(id), `${c.smiles}: the ${end} chain atom is abbreviated`);
      assert.equal(rightAngleLabel(shown, id), text, `${c.smiles}: label of the ${end} chain atom`);
    }
    // Atom → label: every atom of a group maps to it, and its O atoms sit on the carbon.
    for (const group of out.abbreviations.values()) {
      for (const id of group.atoms) {
        assert.equal(abbreviationOf(shown, id), group, `${c.smiles}: atom ${id} maps to its label`);
        assert.deepEqual(out.positions.get(id), out.positions.get(group.carbon));
        assert.equal(isAbbreviatedAway(shown, id), id !== group.carbon);
      }
    }
    // Atoms outside every group are not mapped.
    for (const id of mol.atoms.keys()) {
      if (![...out.abbreviations.values()].some((g) => g.atoms.includes(id))) {
        assert.equal(abbreviationOf(shown, id), null);
      }
    }
  } // End of the loop over the cases
});

test('a CHO or COOH branch hangs at right angles as one label', () => {
  // ácido 2-formilbutanodioico: the formyl carbon (6) is a branch end.
  const { mol, out, shown } = projected('OC(=O)CC(C=O)C(=O)O');
  assert.deepEqual(kinds(out.abbreviations), ['CHO:6:6,7', 'COOH:2:1,2,3', 'COOH:8:8,9,10']);
  assert.deepEqual(rightAngleProblems(mol, out.positions, out.abbreviations), []);
  const branch = out.positions.get(6);
  const root = out.positions.get(5);
  assert.ok(Math.abs(branch.x - root.x) < 1e-6 && branch.y !== root.y, 'vertical bond to the CHO label');
  assert.equal(rightAngleLabel(shown, 6), 'CHO');
});

test('methanal and formic acid keep their per-atom 90° drawing even with the abbreviations on', () => {
  for (const smiles of ['C=O', 'OC=O']) {
    const mol = parseSmiles(smiles);
    const out = projectAbbreviated(mol);
    assert.ok(out.ok, smiles);
    assert.equal(out.abbreviations, undefined, smiles);
    assert.deepEqual(out, projectRightAngles(mol), `${smiles}: same as without abbreviations`);
  }
});

test('grid steps use the widest actual label: COOH widens the column step', () => {
  const mol = parseSmiles('CCC(=O)O');
  const groups = abbreviationGroups(mol);
  const plain = gridSteps(mol);
  const abbreviated = gridSteps(mol, groups);
  const width = labelSize('COOH').width;
  assert.equal(abbreviated.col, Math.max(plain.col, width + 2 * RIGHT_ANGLE_PAD + MIN_STROKE));
  assert.ok(abbreviated.col > plain.col);
  assert.equal(sizedLabel(mol, 3, groups), 'COOH');
  assert.equal(sizedLabel(mol, 3), 'C');
  // The projection's neighbouring labels are exactly one column step apart.
  const out = rightAngleLayout(mol, nameMolecule(mol), { abbreviate: true });
  assert.equal(Math.abs(out.positions.get(3).x - out.positions.get(2).x), abbreviated.col);
});

test('rightAngleProblems() catches an abbreviated label that is too close', () => {
  const mol = parseSmiles('CCC(=O)O');
  const groups = abbreviationGroups(mol);
  const out = rightAngleLayout(mol, nameMolecule(mol), { abbreviate: true });
  const squeezed = new Map([...out.positions].map(([id, p]) => [id, { ...p }]));
  const gap = out.positions.get(3).x - out.positions.get(2).x;
  const shift = gap - Math.sign(gap) * 40;
  for (const id of groups.get(3).atoms) {
    squeezed.get(id).x -= shift;
  }
  assert.ok(rightAngleProblems(mol, squeezed, groups).length > 0);
  // Without the groups the per-atom check sees the hidden O atoms stacked on the carbon.
  assert.ok(rightAngleProblems(mol, out.positions).length > 0);
});

test('abbreviations never change the molecule, its canonical key or its name', () => {
  for (const smiles of ['CCC=O', 'CCC(=O)O', 'OC(=O)CCC(=O)O', 'CCC(C)C=O', 'CC(O)CC(=O)O', 'OC(=O)C(=O)O']) {
    const mol = parseSmiles(smiles);
    const before = JSON.stringify(moleculeToJSON(mol));
    const key = canonicalKey(mol);
    const name = nameMolecule(mol).name;
    const plain = projectRightAngles(mol);
    projectAbbreviated(mol);
    abbreviationGroups(mol);
    assert.equal(JSON.stringify(moleculeToJSON(mol)), before, `${smiles}: molecule unchanged`);
    assert.equal(canonicalKey(mol), key, `${smiles}: canonical key unchanged`);
    assert.equal(nameMolecule(mol).name, name, `${smiles}: name unchanged`);
    // Turning the abbreviations off gives back exactly the per-atom drawing.
    assert.deepEqual(projectRightAngles(mol), plain, `${smiles}: per-atom drawing restored`);
    assert.equal(plain.abbreviations, undefined);
  }
});

test('hitTest() on an abbreviated drawing: the label stands for the carbon, its O atoms and inner bonds are never hit', () => {
  const { shown } = projected('CCC(=O)O');
  const carbon = shown.atoms.get(3);
  const size = labelSize('COOH');
  // Anywhere on the label, even over the letters of the O atoms, hits the group's carbon.
  for (const dx of [-size.width / 2 + 1, -8, 0, 8, size.width / 2 - 1]) {
    assert.deepEqual(hitTest(shown, { x: carbon.x + dx, y: carbon.y }), { type: 'atom', id: 3 }, `dx ${dx}`);
  }
  // atomsOnly (drag targets) and exclude still never return a hidden O.
  assert.deepEqual(hitTest(shown, carbon, { atomsOnly: true }), { type: 'atom', id: 3 });
  assert.equal(hitTest(shown, carbon, { atomsOnly: true, exclude: [3] }), null);
  // The bond to the label stays a bond between the labels.
  const chainCarbon = shown.atoms.get(2);
  const mid = { x: (chainCarbon.x + carbon.x) / 2, y: carbon.y };
  const hit = hitTest(shown, mid);
  assert.equal(hit.type, 'bond');
  const bond = shown.bonds.get(hit.id);
  assert.deepEqual([bond.a, bond.b].sort(), [2, 3]);
});

test('abbreviation texts, parts and Spanish descriptions', () => {
  assert.deepEqual(ABBREVIATION_TEXTS.CHO, ['CHO', 'OHC']);
  assert.deepEqual(ABBREVIATION_TEXTS.COOH, ['COOH', 'HOOC']);
  for (const [text, parts] of [['CHO', 'CH|O'], ['OHC', 'OH|C'], ['COOH', 'C|OOH'], ['HOOC', 'HOO|C']]) {
    const got = abbreviationParts(text);
    assert.equal(got.map((p) => p.text).join('|'), parts);
    assert.equal(got.map((p) => p.text).join(''), text);
    assert.deepEqual(got.map((p) => p.element).sort(), ['C', 'O']);
  }
  assert.match(ABBREVIATION_DESCRIPTIONS.CHO, /aldehído/);
  assert.match(ABBREVIATION_DESCRIPTIONS.COOH, /ácido/);
  // Same characters, same box: mirroring never changes the layout.
  assert.deepEqual(labelSize('HOOC'), labelSize('COOH'));
  assert.deepEqual(labelSize('OHC'), labelSize('CHO'));
});
