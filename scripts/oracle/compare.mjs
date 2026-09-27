/**
 * @file Oracle comparison (design.md §8): the English rendering of a name
 * structure, and the check that OPSIN's structure for that name is the
 * original molecule — same canonical structure key over every heavy atom
 * (graph.js canonicalKey(): the unrooted tree key, or the monocycle key for
 * one ring; elements, bond orders and ring closures, so same-formula
 * isomers such as ethanol and dimethyl ether, or cyclohexane and hex-1-ene,
 * stay distinct) and same molecular formula. The formula is never the only
 * check: two structures pass only when their keys are equal. OPSIN SMILES
 * that cannot be read is an adapter failure, a category apart from naming
 * mismatches. Development only, never bundled.
 */

import { canonicalKey, cyclomaticNumber } from '../../src/model/graph.js';
import { formula } from '../../src/model/molecule.js';
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
  if (rings > 1) {
    // No structural key for polycycles yet: never fall back to the formula alone.
    return { status: 'failed', reason: 'polycyclic structures cannot be compared yet' };
  }
  if (canonicalKey(tree.mol) !== canonicalKey(mol)) {
    return { status: 'failed', reason: 'different structure (canonical keys over elements, bond orders and rings differ)' };
  }
  return { status: 'passed', reason: null };
} // End of function compareWithOpsin()
