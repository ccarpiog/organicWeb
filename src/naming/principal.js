/**
 * @file The oxygen groups the naming engine can name and the principal one
 * among them (design.md §13.4 I-31, I-32; IUPAC 2013 P-41). Validation
 * (model/validate.js) admits an oxygen only as an OH on a carbon, or as the
 * O of an aldehyde or ketone C=O, so every oxygen of a validated molecule is
 * one of:
 *
 *   alcohol  – C–OH (a single bond);
 *   aldehyde – X=O with X bonded to at most one carbon (–CHO; methanal
 *              has none);
 *   ketone   – X=O with X bonded to two carbons (–CO–).
 *
 * The principal kind is the most senior one present (aldehído > cetona >
 * alcohol, seniority.js SENIORITY): its groups on the parent are the suffix
 * (`-al`, `-ona`, `-ol`), every other oxygen group is a prefix (`oxo-`,
 * `hidroxi-`). The carbon X of a C=O is always a skeleton carbon (a chain
 * or ring atom), never part of a prefix by itself (design.md §13.6 "Where
 * X belongs").
 *
 * Also the traditional names of the smallest carbonyl compounds that the
 * app offers under "Otras formas válidas" (`acetona`, `formaldehído`,
 * `acetaldehído`). Pure: reads topology only.
 */

import { seniorityRank } from './seniority.js';

/** Kinds of oxygen group the engine names, most senior first. */
export const OXYGEN_KINDS = Object.freeze(['aldehyde', 'ketone', 'alcohol']);

/**
 * Kind of the group an oxygen of a validated molecule belongs to: an OH
 * (single bond to its carbon) is 'alcohol'; a C=O is 'aldehyde' when its
 * carbon has at most one carbon neighbour (so it keeps a hydrogen) and
 * 'ketone' when it has two.
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @param {Map<number, {atom: number, order: number}[]>} adj - Its adjacency map.
 * @param {number} oxygen - An oxygen atom id.
 * @returns {'alcohol'|'aldehyde'|'ketone'} The kind.
 */
export function oxygenKind(mol, adj, oxygen) {
  const [link] = adj.get(oxygen);
  if (link.order === 1) {
    return 'alcohol';
  }
  const carbons = adj.get(link.atom).filter((n) => mol.atoms.get(n.atom).element === 'C').length;
  return carbons <= 1 ? 'aldehyde' : 'ketone';
}

/**
 * The principal oxygen kind of a validated molecule: the most senior kind
 * among its oxygen groups (aldehído > cetona > alcohol), or null without
 * oxygen (a hydrocarbon or a halogen derivative).
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @returns {'alcohol'|'aldehyde'|'ketone'|null} The principal kind.
 */
export function principalKindOf(mol, adj) {
  let best = null;
  for (const atom of mol.atoms.values()) {
    if (atom.element !== 'O') {
      continue;
    }
    const kind = oxygenKind(mol, adj, atom.id);
    if (best === null || seniorityRank(kind) < seniorityRank(best)) {
      best = kind;
    }
  }
  return best;
} // End of function principalKindOf()

/**
 * Tells whether an oxygen neighbour of a parent atom is one of its suffix
 * groups (an oxygen of the principal kind).
 *
 * @param {object} mol - A validated molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} atom - Any atom id.
 * @param {string|null} principal - The principal kind (principalKindOf()).
 * @returns {boolean} True for an oxygen of the principal kind.
 */
export function isPrincipalOxygen(mol, adj, atom, principal) {
  return principal !== null && mol.atoms.get(atom).element === 'O' && oxygenKind(mol, adj, atom) === principal;
}

/**
 * Traditional name of a small carbonyl compound, as an id of the lexicon
 * tables (TRADITIONAL_NAMES): 'formaldehyde' for methanal, 'acetaldehyde'
 * for ethanal, 'acetone' for propanona — only the bare molecules (no
 * prefix, no multiple bond, a single carbonyl group); null otherwise.
 * IUPAC 2013 retains formaldehyde and acetaldehyde (aldehydes, P-66.6)
 * and acetone for general nomenclature (ketones, P-64); the app lists them
 * under "Otras formas válidas" (design.md §13.1), never as the main name.
 *
 * @param {object} structure - A name structure (structure.js NameStructure).
 * @returns {'formaldehyde'|'acetaldehyde'|'acetone'|null} The id.
 */
export function carbonylTraditionalId(structure) {
  const { parentKind, parent, prefixes, suffix } = structure;
  if (parentKind !== 'chain' || prefixes.length > 0 || !suffix || suffix.locants.length !== 1
    || parent.double.length + parent.triple.length > 0) {
    return null;
  }
  if (suffix.kind === 'aldehyde') {
    return { 1: 'formaldehyde', 2: 'acetaldehyde' }[parent.length] || null;
  }
  return suffix.kind === 'ketone' && parent.length === 3 ? 'acetone' : null;
} // End of function carbonylTraditionalId()
