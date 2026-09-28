/**
 * @file The oxygen groups the naming engine can name and the principal one
 * among them (design.md §13.4 I-31, I-32, I-33; IUPAC 2013 P-41).
 * Validation (model/validate.js) admits an oxygen only as an OH on a
 * carbon, as the O of an aldehyde or ketone C=O, as one of the two O of
 * a carboxyl group, or as the O of an ether C–O–C, so every oxygen of a
 * validated molecule is one of:
 *
 *   acid     – either O of X(=O)–OH, X bonded to at most one carbon
 *              (–COOH; methanoic acid has none): both oxygens belong to
 *              the one group, never to an alcohol or a ketone;
 *   alcohol  – C–OH (a single bond);
 *   aldehyde – X=O with X bonded to at most one carbon (–CHO; methanal
 *              has none);
 *   ketone   – X=O with X bonded to two carbons (–CO–);
 *   ether    – C–O–C (two single bonds to carbons, I-34): never the
 *              principal group (IUPAC 2013 P-41), always an `alcoxi-`
 *              prefix (substituent.js alkoxySubstituent()).
 *
 * The principal kind is the most senior one present (ácido > aldehído >
 * cetona > alcohol, seniority.js SENIORITY): its groups on the parent are
 * the suffix (`ácido …oico`, `-al`, `-ona`, `-ol`), every other oxygen
 * group is a prefix (`oxo-`, `hidroxi-`). The carbon X of a C=O or a COOH
 * is always a skeleton carbon (a chain or ring atom), never part of a
 * prefix by itself (design.md §13.6 "Where X belongs"). A carboxyl group
 * has two oxygens but is one suffix group: its C=O oxygen stands for it
 * (isSuffixOxygen(), SuffixLocant `attachAtom`), its OH oxygen travels with
 * it (SuffixLocant `hydroxyAtom`).
 *
 * Also the traditional names of the smallest carbonyl compounds and acids
 * that the app offers under "Otras formas válidas" (`acetona`,
 * `formaldehído`, `acetaldehído`, `ácido fórmico`, `ácido acético`,
 * `ácido oxálico`). Pure: reads topology only.
 */

import { seniorityRank } from './seniority.js';
import { isCarboxylCarbon } from '../model/validate.js';

/** Kinds of oxygen group the engine names, most senior first. */
export const OXYGEN_KINDS = Object.freeze(['acid', 'aldehyde', 'ketone', 'alcohol']);

/**
 * Kind of the group an oxygen of a validated molecule belongs to: an
 * oxygen bonded to two atoms is an 'ether' (validation admits no other
 * such oxygen); either oxygen of a carboxyl group (validate.js isCarboxylCarbon()) is 'acid';
 * any other OH (single bond to its carbon) is 'alcohol'; any other C=O is
 * 'aldehyde' when its carbon has at most one carbon neighbour (so it keeps
 * a hydrogen) and 'ketone' when it has two.
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @param {Map<number, {atom: number, order: number}[]>} adj - Its adjacency map.
 * @param {number} oxygen - An oxygen atom id.
 * @returns {'acid'|'alcohol'|'aldehyde'|'ketone'|'ether'} The kind.
 */
export function oxygenKind(mol, adj, oxygen) {
  const links = adj.get(oxygen);
  if (links.length === 2) {
    return 'ether';
  }
  const [link] = links;
  if (isCarboxylCarbon(mol, adj, link.atom)) {
    return 'acid';
  }
  if (link.order === 1) {
    return 'alcohol';
  }
  const carbons = adj.get(link.atom).filter((n) => mol.atoms.get(n.atom).element === 'C').length;
  return carbons <= 1 ? 'aldehyde' : 'ketone';
}

/**
 * The principal oxygen kind of a validated molecule: the most senior kind
 * among its oxygen groups (ácido > aldehído > cetona > alcohol), or null
 * without such a group (a hydrocarbon, a halogen derivative or an ether:
 * an ether oxygen is never principal).
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @returns {'acid'|'alcohol'|'aldehyde'|'ketone'|null} The principal kind.
 */
export function principalKindOf(mol, adj) {
  let best = null;
  for (const atom of mol.atoms.values()) {
    if (atom.element !== 'O') {
      continue;
    }
    const kind = oxygenKind(mol, adj, atom.id);
    if (kind === 'ether') {
      continue; // Always a prefix (`alcoxi-`), never the principal group.
    }
    if (best === null || seniorityRank(kind) < seniorityRank(best)) {
      best = kind;
    }
  }
  return best;
} // End of function principalKindOf()

/**
 * Tells whether an oxygen neighbour of a parent atom belongs to one of its
 * suffix groups (an oxygen of the principal kind; for an acid, both oxygens
 * of each –COOH).
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
 * Tells whether an oxygen stands for one suffix group, so that each group
 * is counted once (P0, N0, suffix sites): an oxygen of the principal kind,
 * except the OH oxygen of a –COOH, which belongs to the same group as its
 * C=O oxygen (design.md §13.4 I-33).
 *
 * @param {object} mol - A validated molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} atom - Any atom id.
 * @param {string|null} principal - The principal kind (principalKindOf()).
 * @returns {boolean} True for the one oxygen that represents a suffix group.
 */
export function isSuffixOxygen(mol, adj, atom, principal) {
  return isPrincipalOxygen(mol, adj, atom, principal) && (principal !== 'acid' || adj.get(atom)[0].order === 2);
}

/**
 * Traditional name of a small carbonyl compound or acid, as an id of the
 * lexicon tables (TRADITIONAL_NAMES): 'formaldehyde' for methanal,
 * 'acetaldehyde' for ethanal, 'acetone' for propanona, 'formicAcid' for
 * ácido metanoico, 'aceticAcid' for ácido etanoico, 'oxalicAcid' for ácido
 * etanodioico — only the bare molecules (no prefix, no multiple bond, a
 * single carbonyl group; the two carboxyl groups of oxalic acid); null
 * otherwise. IUPAC 2013 retains formaldehyde and acetaldehyde (aldehydes,
 * P-66.6), acetone for general nomenclature (ketones, P-64), and formic,
 * acetic and oxalic acid as preferred names (acids, P-65.1.1.1); the app lists them under "Otras formas válidas"
 * (design.md §13.1), never as the main name.
 *
 * @param {object} structure - A name structure (structure.js NameStructure).
 * @returns {'formaldehyde'|'acetaldehyde'|'acetone'|'formicAcid'|'aceticAcid'|'oxalicAcid'|null} The id.
 */
export function carbonylTraditionalId(structure) {
  const { parentKind, parent, prefixes, suffix } = structure;
  if (parentKind !== 'chain' || prefixes.length > 0 || !suffix
    || parent.double.length + parent.triple.length > 0) {
    return null;
  }
  if (suffix.kind === 'acid') {
    const ids = suffix.locants.length === 1 ? { 1: 'formicAcid', 2: 'aceticAcid' } : { 2: 'oxalicAcid' };
    return ids[parent.length] || null;
  }
  if (suffix.locants.length !== 1) {
    return null;
  }
  if (suffix.kind === 'aldehyde') {
    return { 1: 'formaldehyde', 2: 'acetaldehyde' }[parent.length] || null;
  }
  return suffix.kind === 'ketone' && parent.length === 3 ? 'acetone' : null;
} // End of function carbonylTraditionalId()
