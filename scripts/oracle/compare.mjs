/**
 * @file Oracle comparison (design.md §8): the English rendering of a name
 * structure, and the check that OPSIN's structure for that name is the
 * original molecule — same canonical structure key over every heavy atom
 * (graph.js canonicalKey(): the unrooted tree key, the monocycle key for
 * one ring, or, since I-40d, the key of two separate rings; elements, bond orders and ring closures, so same-formula
 * isomers such as ethanol and dimethyl ether, or cyclohexane and hex-1-ene,
 * stay distinct) and same molecular formula. The formula is never the only
 * check: two structures pass only when their keys are equal. OPSIN SMILES
 * that cannot be read is an adapter failure, a category apart from naming
 * mismatches. A benzene ring may come back in the other Kekulé drawing
 * (double bonds swapped) — the same molecule — so every drawing of the
 * original is accepted (kekuleKeys(), design.md §13.4 I-28). Development
 * only, never bundled.
 */

import { canonicalKey, cyclomaticNumber } from '../../src/model/graph.js';
import { formula, cloneMolecule } from '../../src/model/molecule.js';
import { perceiveRings } from '../../src/model/rings.js';
import { isBenzeneRing } from '../../src/model/validate.js';
import { renderName } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { heavyAtomTree } from './smiles-full.mjs';

/**
 * Renders a name structure in English (the same structure the Spanish name
 * comes from; never a translation of the Spanish string).
 *
 * @param {object} structure - The name structure (naming/structure.js NameStructure).
 * @returns {string} The English name.
 */
export function englishName(structure) {
  return renderName(structure, lexiconEn).name;
}

/**
 * Canonical keys of every Kekulé drawing of a molecule: its own key, plus,
 * for each benzene ring, the keys of the copies with its ring bond orders
 * swapped (1 ↔ 2), in every combination. Any other molecule has one key.
 *
 * @param {object} mol - A molecule with at most one ring, or two separate rings (I-40d).
 * @returns {string[]} The keys.
 */
export function kekuleKeys(mol) {
  const benzenes = perceiveRings(mol).rings.filter((ring) => isBenzeneRing(mol, ring));
  const keys = [];
  // Every combination of swapped benzene rings (two rings on either side of an ester since I-40d).
  for (let mask = 0; mask < 2 ** benzenes.length; mask += 1) {
    const copy = cloneMolecule(mol);
    benzenes.forEach((ring, i) => {
      if (mask & (2 ** i)) {
        for (const id of ring.bonds) {
          const bond = copy.bonds.get(id);
          bond.order = 3 - bond.order;
        }
      }
    });
    keys.push(canonicalKey(copy));
  }
  return keys;
}

/**
 * Compares the original molecule with OPSIN's SMILES for its name.
 *
 * @param {object} mol - The original molecule.
 * @param {string} opsinSmiles - OPSIN's output ('' when OPSIN could not parse the name).
 * @returns {{status: 'passed'|'failed'|'adapter', reason: string|null}} `failed` means the name does not denote the molecule (or OPSIN rejected it); `adapter` means OPSIN's SMILES could not be read.
 */
export function compareWithOpsin(mol, opsinSmiles) {
  if (!opsinSmiles) {
    return { status: 'failed', reason: 'OPSIN could not parse the name' };
  }
  let tree;
  try {
    tree = heavyAtomTree(opsinSmiles);
  } catch (err) {
    // Any exception here is the adapter's (unsupported syntax), never the name's.
    return { status: 'adapter', reason: `unreadable OPSIN SMILES: ${err.message}` };
  }
  const expectedFormula = formula(mol);
  if (tree.formula !== expectedFormula) {
    return { status: 'failed', reason: `formula ${tree.formula} differs from ${expectedFormula}` };
  }
  if (tree.problem) {
    return { status: 'failed', reason: tree.problem };
  }
  const rings = cyclomaticNumber(tree.mol);
  const expectedRings = cyclomaticNumber(mol);
  if (rings !== expectedRings) {
    return { status: 'failed', reason: `OPSIN's structure has ${rings} ring(s), the original ${expectedRings}` };
  }
  if (rings > 2) {
    // No structural key for larger polycycles yet: never fall back to the formula alone.
    return { status: 'failed', reason: 'polycyclic structures cannot be compared yet' };
  }
  let key;
  try {
    key = canonicalKey(tree.mol);
  } catch (err) {
    // Two fused (or otherwise joined) rings where the original has two separate ones: no key, never a pass.
    return { status: 'failed', reason: `OPSIN's structure cannot be compared: ${err.message}` };
  }
  if (!kekuleKeys(mol).includes(key)) {
    return { status: 'failed', reason: 'different structure (canonical keys over elements, bond orders and rings differ)' };
  }
  return { status: 'passed', reason: null };
} // End of function compareWithOpsin()
