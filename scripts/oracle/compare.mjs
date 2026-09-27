/**
 * @file Oracle comparison (design.md §8): the English rendering of a name
 * structure, and the check that OPSIN's structure for that name is the
 * original molecule — same unrooted canonical tree key (carbon skeleton and
 * bond orders) and same molecular formula. Development only, never bundled.
 */

import { canonicalTreeKey } from '../../src/model/graph.js';
import { formula } from '../../src/model/molecule.js';
import { renderName } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { hydrocarbonTree } from './smiles-full.mjs';

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
    tree = hydrocarbonTree(opsinSmiles);
  } catch (err) {
    return { status: 'adapter', reason: `unreadable OPSIN SMILES: ${err.message}` };
  }
  const expectedFormula = formula(mol);
  if (tree.formula !== expectedFormula) {
    return { status: 'failed', reason: `formula ${tree.formula} differs from ${expectedFormula}` };
  }
  if (tree.problem) {
    return { status: 'failed', reason: tree.problem };
  }
  if (canonicalTreeKey(tree.mol) !== canonicalTreeKey(mol)) {
    return { status: 'failed', reason: 'different structure (canonical tree keys differ)' };
  }
  return { status: 'passed', reason: null };
} // End of function compareWithOpsin()
