/**
 * @file Graph-invariance tests (design.md §8): for seeded random molecules,
 * renumbering atom ids and shuffling atom and bond insertion order (and bond
 * ends) must not change the name, in any prefix style; for benzene
 * derivatives (I-28), neither must swapping the Kekulé drawing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nameMolecule } from '../../src/naming/index.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { writeSmiles } from '../../src/model/smiles.js';
import { cloneMolecule } from '../../src/model/molecule.js';
import { perceiveRings } from '../../src/model/rings.js';
import {
  generateMolecules, generateBenzenes, scrambleMolecule, seededRandom,
} from '../../scripts/oracle/generate.mjs';

/**
 * Summarises a naming result by what must be invariant: the name, its parts'
 * texts and kinds, and the alternatives.
 *
 * @param {object} result - A naming result.
 * @returns {object} The invariant summary.
 */
function summary(result) {
  assert.equal(result.ok, true, JSON.stringify(result.error));
  return {
    name: result.name,
    parts: result.parts.map((p) => `${p.kind}:${p.text}`),
    alternatives: result.alternatives.map((alt) => `${alt.style}=${alt.name}`),
  };
}

test('scrambled copies are the same graph with other ids and insertion order', () => {
  const [mol] = generateMolecules({ count: 1, seed: 3, minSize: 12, maxSize: 12 });
  const copy = scrambleMolecule(mol, seededRandom(4));
  assert.equal(copy.atoms.size, mol.atoms.size);
  assert.equal(copy.bonds.size, mol.bonds.size);
  assert.notDeepEqual([...copy.atoms.keys()], [...mol.atoms.keys()]);
});

for (const [seed, minSize, maxSize] of [[101, 4, 14], [102, 10, 30], [103, 25, 60]]) {
  test(`names are invariant under atom renumbering and bond order shuffling (seed ${seed}, ${minSize}–${maxSize} C)`, () => {
    const random = seededRandom(seed * 7);
    const molecules = generateMolecules({ count: 150, seed, minSize, maxSize });
    assert.equal(molecules.length, 150);
    for (const mol of molecules) {
      const smiles = writeSmiles(mol);
      for (const prefixStyle of PREFIX_STYLES) {
        const expected = summary(nameMolecule(mol, { prefixStyle }));
        for (let k = 0; k < 3; k += 1) {
          const actual = summary(nameMolecule(scrambleMolecule(mol, random), { prefixStyle }));
          assert.deepEqual(actual, expected, `${smiles} (${prefixStyle})`);
        }
      }
    } // End of the loop over the random molecules
  });
} // End of the loop over the seeds and size ranges

test('benzene derivatives: names are invariant under renumbering, shuffling and the Kekulé drawing', () => {
  const random = seededRandom(2828);
  const molecules = generateBenzenes({ count: 60, seed: 104, minSize: 6, maxSize: 20 });
  assert.equal(molecules.length, 60);
  for (const mol of molecules) {
    const smiles = writeSmiles(mol);
    const swapped = cloneMolecule(mol);
    for (const id of perceiveRings(swapped).rings[0].bonds) {
      swapped.bonds.get(id).order = 3 - swapped.bonds.get(id).order;
    }
    for (const prefixStyle of PREFIX_STYLES) {
      const expected = summary(nameMolecule(mol, { prefixStyle }));
      assert.deepEqual(summary(nameMolecule(swapped, { prefixStyle })), expected, `${smiles} other Kekulé drawing (${prefixStyle})`);
      for (let k = 0; k < 3; k += 1) {
        const actual = summary(nameMolecule(scrambleMolecule(random() < 0.5 ? mol : swapped, random), { prefixStyle }));
        assert.deepEqual(actual, expected, `${smiles} (${prefixStyle})`);
      }
    }
  } // End of the loop over the benzene derivatives
});
