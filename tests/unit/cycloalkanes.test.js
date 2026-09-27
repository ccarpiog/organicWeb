/**
 * @file Unit tests for phase I-25, simple cycloalkanes (design.md §13.4):
 * naming of every supported ring size in Spanish and English, the formula
 * CₙH₂ₙ, the refusals (too big, heterocycles, polycycles; substituted and
 * unsaturated rings are named since I-26, see substituted-rings.test.js), invariance under ids, insertion order, ring rotation and
 * direction, and coordinates, the explanation (closure, carbon count,
 * closure bond highlighted, no numbering), and the fallbacks of "Ordenar
 * dibujo" and the 90° view.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import { createMolecule, addAtom, addBond, formula } from '../../src/model/molecule.js';
import {
  validateForNaming, RING_SYSTEM_MESSAGES, RING_TOO_BIG_MESSAGE,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { renderName } from '../../src/naming/render.js';
import { buildRingStructure, buildNameStructure } from '../../src/naming/structure.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { explain, plainText, atomCounts } from '../../src/explain/explain.js';
import { projectRightAngles } from '../../src/ui/canvasbar.js';
import { canArrange, redrawHint } from '../../src/ui/results.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateCycloalkanes } from '../../scripts/oracle/generate.mjs';

/** Expected Spanish stems by ring size (same table as the chains). */
const STEMS_ES = [
  null, null, null, 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec',
  'undec', 'dodec', 'tridec', 'tetradec', 'pentadec', 'hexadec', 'heptadec', 'octadec', 'nonadec', 'icos',
  'henicos', 'docos', 'tricos', 'tetracos', 'pentacos', 'hexacos', 'heptacos', 'octacos', 'nonacos', 'triacont',
];

/**
 * Builds a ring of `n` carbons, adding the atoms and bonds starting at
 * position `start` and walking in the given direction.
 *
 * @param {number} n - Ring size.
 * @param {number} [start] - Ring position of the first atom added.
 * @param {boolean} [reverse] - Walk the ring the other way.
 * @returns {object} The molecule.
 */
function ring(n, start = 0, reverse = false) {
  const mol = createMolecule();
  const ids = Array.from({ length: n }, () => addAtom(mol));
  const at = (i) => ids[(((reverse ? -i : i) + start) % n + n) % n];
  for (let i = 0; i < n; i += 1) {
    addBond(mol, at(i), at(i + 1));
  }
  return mol;
}

/**
 * What must not change between copies of the same cycloalkane: the name,
 * its parts, the explanation texts and the shape of every highlight.
 *
 * @param {object} mol - A cycloalkane.
 * @returns {object} The invariant summary.
 */
function summary(mol) {
  const result = nameMolecule(mol);
  assert.equal(result.ok, true, JSON.stringify(result.error));
  return {
    name: result.name,
    parts: result.parts.map((p) => `${p.kind}:${p.text}:${p.atoms.length}:${p.bonds.length}`),
    steps: explain(result).map((step) => ({
      id: step.id,
      text: step.text.map(plainText),
      highlight: step.highlight.map((spec) => `${spec.style}:${spec.atoms.length}:${spec.bonds.length}`),
      locants: step.locants,
    })),
  };
} // End of function summary()

test('every ring size from 3 to 30 is named ciclo + stem + ano, cyclo…ane in English', () => {
  for (let n = 3; n <= 30; n += 1) {
    const mol = ring(n);
    const result = nameMolecule(mol);
    assert.equal(result.ok, true, `${n}: ${JSON.stringify(result.error)}`);
    assert.equal(result.name, `ciclo${STEMS_ES[n]}ano`);
    assert.equal(result.parts.map((p) => p.text).join(''), result.name);
    assert.equal(result.structure.parentKind, 'ring');
    assert.equal(result.structure.parent.kind, 'ring');
    assert.equal(result.structure.parent.length, n);
    assert.deepEqual(result.structure.prefixes, []);
    assert.deepEqual(result.alternatives, []);
    assert.equal(englishName(result.structure), `cyclo${lexiconEn.stem(n)}ane`);
    assert.equal(formula(mol), `C${n}H${2 * n}`);
    assert.deepEqual(atomCounts(result.structure), { carbons: n, hydrogens: 2 * n });
  } // End of the loop over the ring sizes
  assert.equal(englishName(nameMolecule(parseSmiles('C1CCCCC1')).structure), 'cyclohexane');
  assert.equal(generateCycloalkanes({ minSize: 1, maxSize: 60 }).length, 28);
}); // End of test 'every ring size from 3 to 30 is named ciclo + stem + ano, cyclo…ane in English'

test('the ring structure: ring order, closure bond last, every bond once', () => {
  const mol = parseSmiles('C1CCCCC1');
  const { structure, parent, trace } = nameMolecule(mol);
  const ringParent = structure.parent;
  assert.equal(ringParent.atoms.length, 6);
  assert.equal(ringParent.bonds.length, 6);
  assert.equal(ringParent.closure, ringParent.bonds[5]);
  assert.deepEqual([...ringParent.bonds].sort((a, b) => a - b), [...mol.bonds.keys()].sort((a, b) => a - b));
  ringParent.bonds.forEach((id, i) => {
    const bond = mol.bonds.get(id);
    const ends = [ringParent.atoms[i], ringParent.atoms[(i + 1) % 6]].sort((a, b) => a - b);
    assert.deepEqual([bond.a, bond.b].sort((a, b) => a - b), ends, `bond ${id} joins consecutive ring atoms`);
  });
  assert.deepEqual(parent, { atoms: ringParent.atoms, bonds: ringParent.bonds });
  assert.deepEqual(trace.map((s) => s.rule), ['RING']);
  assert.deepEqual(trace[0].values, [6]);
  // The ciclo part refers to the ring and its closure bond.
  const ciclo = nameMolecule(mol).parts[0];
  assert.equal(ciclo.text, 'ciclo');
  assert.deepEqual(ciclo.bonds, [ringParent.closure]);
}); // End of test 'the ring structure'

test('ring structures render their unsaturation (I-26)', () => {
  assert.throws(() => buildRingStructure([1, 2], [1, 2], [1, 1]), /n ≥ 3/);
  const unsaturated = buildRingStructure([1, 2, 3, 4], [1, 2, 3, 4], [2, 1, 1, 1]);
  assert.deepEqual(unsaturated.double.map((s) => [s.locant, s.atoms]), [[1, [1, 2]]]);
  const closing = buildRingStructure([1, 2, 3, 4], [1, 2, 3, 4], [1, 1, 1, 2]);
  assert.deepEqual(closing.double.map((s) => [s.locant, s.atoms]), [[4, [4, 1]]]);
  assert.equal(renderName(buildNameStructure({ parent: unsaturated })).name, 'ciclobuteno');
});

test('substituted and unsaturated rings are named since I-26 (no CYCLE refusal)', () => {
  const cases = [
    ['CC1CCCCC1', 'metilciclohexano'],
    ['C=C1CCCCC1', 'metilidenciclohexano'],
    ['C1=CCCCC1', 'ciclohexeno'],
    ['C1CCC=CC1', 'ciclohexeno'],
    ['C1=CC=CCC1', 'ciclohexa-1,3-dieno'],
    ['C1#CCCCCCC1', 'ciclooctino'],
    ['C1CCCCC#C1', 'cicloheptino'],
    ['CC1=CCCC1', '1-metilciclopent-1-eno'],
  ];
  for (const [smiles, name] of cases) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
    assert.equal(nameMolecule(parseSmiles(smiles)).name, name, smiles);
  }
}); // End of test 'substituted and unsaturated rings are named since I-26'

test('heterocycles, polycycles and rings above 30 carbons are refused; never a crash', () => {
  for (const [smiles, kind] of [
    ['C1CCOCC1', 'heterocycle'], ['C1CCNC1', 'heterocycle'], ['C1CCC2CCCCC2C1', 'fused'],
    ['C1CC2CCC1C2', 'bridged'], ['C1CCC2(C1)CCCC2', 'spiro'], ['C1CC1CCC1CC1', 'several'],
  ]) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.code, 'RING_SYSTEM', smiles);
    assert.equal(result.error.message, RING_SYSTEM_MESSAGES[kind], smiles);
  }
  const big = nameMolecule(ring(31));
  assert.equal(big.ok, false);
  assert.equal(big.error.code, 'TOO_BIG');
  assert.equal(big.error.message, RING_TOO_BIG_MESSAGE);
}); // End of test 'heterocycles, polycycles and rings above 30 carbons are refused; never a crash'

test('same result whatever the atom ids, insertion order, ring rotation, direction and coordinates', () => {
  const random = seededRandom(25);
  for (const n of [3, 4, 5, 6, 7, 12, 30]) {
    const expected = summary(ring(n));
    for (let start = 0; start < n; start += Math.max(1, Math.floor(n / 4))) {
      assert.deepEqual(summary(ring(n, start, false)), expected, `${n}, start ${start}`);
      assert.deepEqual(summary(ring(n, start, true)), expected, `${n}, start ${start}, reversed`);
    }
    for (let k = 0; k < 5; k += 1) {
      const copy = scrambleMolecule(ring(n), random);
      for (const atom of copy.atoms.values()) {
        atom.x = random() * 1000;
        atom.y = random() * 1000;
      }
      assert.deepEqual(summary(copy), expected, `${n}, scrambled copy ${k}`);
    }
  } // End of the loop over the ring sizes
}); // End of test 'same result whatever the atom ids, insertion order, ring rotation, direction and coordinates'

test('explanation: closure, carbon count, CₙH₂ₙ, closure bond highlighted, no numbering', () => {
  const mol = parseSmiles('C1CCCCC1');
  const result = nameMolecule(mol);
  const steps = explain(result);
  assert.deepEqual(steps.map((s) => s.id), ['count', 'ring', 'ringNumbering', 'assemble']);
  const [countStep, ringStep, numbering, assemble] = steps;
  assert.match(countStep.text[0], /6 carbonos y 12 hidrógenos \(C₆H₁₂\)/);
  assert.match(countStep.text.join(' '), /CₙH₂ₙ/);
  assert.match(countStep.text.join(' '), /C₆H₁₄/);
  const ringText = ringStep.text.map(plainText).join(' ');
  assert.match(ringText, /se cierra sobre sí misma/);
  assert.match(ringText, /Los 6 carbonos/);
  assert.match(ringText, /«hexano» → «ciclohexano»/);
  const closure = result.structure.parent.closure;
  const closureSpec = ringStep.highlight.find((spec) => spec.bonds.includes(closure));
  assert.equal(closureSpec.style, 'candidate');
  assert.deepEqual(closureSpec.bonds, [closure]);
  const ringSpec = ringStep.highlight.find((spec) => spec.style === 'parent');
  assert.deepEqual([...ringSpec.atoms].sort((a, b) => a - b), [...mol.atoms.keys()].sort((a, b) => a - b));
  assert.equal(ringSpec.bonds.length, 5);
  assert.ok(!ringSpec.bonds.includes(closure));
  assert.match(numbering.text.join(' '), /no hace falta numerar/);
  assert.equal(numbering.locants, null);
  assert.equal(assemble.locants, null, 'no locant labels on an unnumbered ring');
  assert.deepEqual(assemble.legend.map((l) => l.text), ['ciclo-', 'hex', '-ano']);
  assert.ok(assemble.text.some((t) => t.includes('«ciclohexano»')));
  assert.equal(steps.flatMap((s) => s.text).some((t) => /cadena principal/.test(t)), false, 'no parent-chain wording');
}); // End of test 'explanation'

test('Ordenar dibujo lays out a named ring (I-27b); the 90° view falls back', () => {
  const mol = parseSmiles('C1CCCCC1');
  const result = nameMolecule(mol);
  assert.equal(result.ok, true);
  assert.equal(canArrange(result), true);
  assert.equal(redrawHint(result), '¿Quieres ver el anillo ordenado?');
  assert.equal(redrawHint(nameMolecule(parseSmiles('CCCC'))), '¿Quieres ver la cadena principal ordenada?');
  assert.equal(canArrange(nameMolecule(parseSmiles('C1=CC=CC=C1'))), false, 'benzene is not named yet');
  assert.equal(canArrange(nameMolecule(parseSmiles('CCCC'))), true);
  assert.deepEqual(projectRightAngles(mol), { ok: false, reason: 'CYCLE' });
});
