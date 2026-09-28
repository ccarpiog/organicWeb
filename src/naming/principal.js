/**
 * @file The oxygen groups the naming engine can name and the principal one
 * among them (design.md §13.4 I-31…I-35; IUPAC 2013 P-41).
 * Validation (model/validate.js) admits an oxygen only as an OH on a
 * carbon, as the O of an aldehyde or ketone C=O, as one of the two O of
 * a carboxyl group, as the O of an ether C–O–C, or as one of the two O of
 * an ester group, so every oxygen of a validated molecule is one of:
 *
 *   acid     – either O of X(=O)–OH, X bonded to at most one carbon
 *              (–COOH; methanoic acid has none): both oxygens belong to
 *              the one group, never to an alcohol or a ketone;
 *   ester    – either O of X(=O)–O–R, X bonded to at most one carbon
 *              (–COO–, I-35; validate.js isEsterCarbon()): the C=O oxygen
 *              and the bridge O belong to the one group, never to a
 *              ketone or an ether; R is the O-bound (alkyl) group;
 *   alcohol  – C–OH (a single bond);
 *   aldehyde – X=O with X bonded to at most one carbon (–CHO; methanal
 *              has none);
 *   ketone   – X=O with X bonded to two carbons (–CO–);
 *   ether    – C–O–C (two single bonds to carbons, I-34): never the
 *              principal group (IUPAC 2013 P-41), always an `alcoxi-`
 *              prefix (substituent.js alkoxySubstituent()).
 *
 * Validation also admits a nitrogen bonded by single bonds to one, two or
 * three carbons that are not functional carbons (validate.js
 * isAmineNitrogen(), design.md §13.4 I-36), an 'amine' (groupKindOf()):
 * the least senior kind that can be a suffix (`-amina`), else the prefix
 * `amino-`; and the amide group X(=O)–N (validate.js isAmideCarbon(),
 * I-37), whose C=O oxygen and N are both 'amide' (`-amida`; validation
 * refuses every molecule where an amide would be a prefix). The functions
 * below that speak of "oxygens" take such a nitrogen too: the N of a
 * principal amine is its suffix group's heteroatom; an amide's C=O oxygen
 * stands for its group and its N travels with it (SuffixLocant
 * `amideNitrogen`).
 *
 * Since I-38 validation also admits the N of a nitrile –C≡N (validate.js
 * isNitrileNitrogen()), kind 'nitrile' (`-nitrilo`): it stands for its
 * group like an amine's N; its carbon X is a chain end of the parent.
 * Since I-39a a nitrile that is not principal (an acid, ester or amide
 * beside it) or that lies off the parent (on a branch) is the prefix
 * `ciano-`, which includes its carbon (IUPAC 2013 P-66.5): that carbon
 * is then outside the skeleton (outsideCarbons(), the first functional
 * carbon kept out of the parent; design.md §13.6 "Where X belongs").
 *
 * The principal kind is the most senior one present (ácido > éster > amida >
 * nitrilo > aldehído > cetona > alcohol > amina, seniority.js SENIORITY; validation never
 * lets an acid, an ester, an amide or a nitrile meet): its groups on the parent are the
 * suffix (`ácido …oico`, `…oato de …ilo`, `-amida`, `-nitrilo`, `-al`, `-ona`, `-ol`, `-amina`), every other
 * group is a prefix (`oxo-`, `hidroxi-`, `amino-`, `ciano-`). The carbon X of a C=O or a COOH
 * is always a skeleton carbon (a chain or ring atom), never part of a
 * prefix by itself (design.md §13.6 "Where X belongs"). A carboxyl group
 * has two oxygens but is one suffix group: its C=O oxygen stands for it
 * (isSuffixOxygen(), SuffixLocant `attachAtom`), its OH oxygen travels with
 * it (SuffixLocant `hydroxyAtom`). An ester group likewise: its C=O oxygen
 * stands for it, its bridge O travels with it (SuffixLocant `esterOxygen`).
 *
 * Also the traditional names of the smallest carbonyl compounds, acids and
 * esters and amides that the app offers under "Otras formas válidas" (`acetona`,
 * `formaldehído`, `acetaldehído`, `ácido fórmico`, `ácido acético`,
 * `ácido oxálico`, `formiato de …`, `acetato de …`, `formamida`,
 * `acetamida`, `acetonitrilo`). Pure: reads topology only.
 */

import { seniorityRank } from './seniority.js';
import { N_LOCANT } from './structure.js';
import { isCarboxylCarbon, isEsterCarbon, isAmideCarbon, amideRole, isNitrileNitrogen, isNitrileCarbon } from '../model/validate.js';

/** Kinds of oxygen group the engine names, most senior first. */
export const OXYGEN_KINDS = Object.freeze(['acid', 'ester', 'aldehyde', 'ketone', 'alcohol']);

/** Every kind of group the engine can cite as a suffix, most senior first (the amide, I-37, after the ester; the nitrile, I-38, after the amide; the amine, I-36, last). */
export const NAMED_KINDS = Object.freeze(['acid', 'ester', 'amide', 'nitrile', 'aldehyde', 'ketone', 'alcohol', 'amine']);

/**
 * Kind of the group an oxygen of a validated molecule belongs to: either
 * oxygen of an ester group (validate.js isEsterCarbon(): the C=O oxygen
 * and the bridge O) is 'ester'; any other oxygen bonded to two atoms is an
 * 'ether' (validation admits no other such oxygen); either oxygen of a
 * carboxyl group (validate.js isCarboxylCarbon()) is 'acid'; the C=O
 * oxygen of an amide –CONH₂ (validate.js isAmideCarbon(), I-37) is 'amide';
 * any other OH (single bond to its carbon) is 'alcohol'; any other C=O is
 * 'aldehyde' when its carbon has at most one carbon neighbour (so it keeps
 * a hydrogen) and 'ketone' when it has two.
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @param {Map<number, {atom: number, order: number}[]>} adj - Its adjacency map.
 * @param {number} oxygen - An oxygen atom id.
 * @returns {'acid'|'ester'|'amide'|'alcohol'|'aldehyde'|'ketone'|'ether'} The kind.
 */
export function oxygenKind(mol, adj, oxygen) {
  const links = adj.get(oxygen);
  if (links.length === 2) {
    return links.some((n) => isEsterCarbon(mol, adj, n.atom)) ? 'ester' : 'ether';
  }
  const [link] = links;
  if (isCarboxylCarbon(mol, adj, link.atom)) {
    return 'acid';
  }
  if (isEsterCarbon(mol, adj, link.atom)) {
    return 'ester';
  }
  if (isAmideCarbon(mol, adj, link.atom)) {
    return 'amide';
  }
  if (link.order === 1) {
    return 'alcohol';
  }
  const carbons = adj.get(link.atom).filter((n) => mol.atoms.get(n.atom).element === 'C').length;
  return carbons <= 1 ? 'aldehyde' : 'ketone';
} // End of function oxygenKind()

/**
 * Kind of the group a heteroatom of a validated molecule belongs to, for
 * the atoms that can stand for a suffix group: an oxygen's kind
 * (oxygenKind()), 'amide' for the N of an amide group (design.md §13.4
 * I-37; validate.js amideRole()), 'nitrile' for the N of a –C≡N (I-38;
 * validate.js isNitrileNitrogen()), 'amine' for any other nitrogen
 * (validation admits only amine, amide and nitrile nitrogens, I-36), null
 * for any other atom (a carbon, a halogen).
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} atom - Any atom id.
 * @returns {'acid'|'ester'|'amide'|'nitrile'|'alcohol'|'aldehyde'|'ketone'|'ether'|'amine'|null} The kind.
 */
export function groupKindOf(mol, adj, atom) {
  const element = mol.atoms.get(atom).element;
  if (element === 'N') {
    if (isNitrileNitrogen(mol, adj, atom)) {
      return 'nitrile';
    }
    return amideRole(mol, adj, atom) === null ? 'amine' : 'amide';
  }
  return element === 'O' ? oxygenKind(mol, adj, atom) : null;
}

/**
 * The principal kind of a validated molecule: the most senior kind among
 * its oxygen groups and nitrogens (ácido > éster > amida > nitrilo >
 * aldehído > cetona > alcohol > amina), or null without such a group (a hydrocarbon, a
 * halogen derivative or an ether: an ether oxygen is never principal).
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @returns {'acid'|'ester'|'amide'|'nitrile'|'alcohol'|'aldehyde'|'ketone'|'amine'|null} The principal kind.
 */
export function principalKindOf(mol, adj) {
  let best = null;
  for (const atom of mol.atoms.values()) {
    if (atom.element !== 'O' && atom.element !== 'N') {
      continue;
    }
    const kind = groupKindOf(mol, adj, atom.id);
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
 * The functional carbons X that are never skeleton carbons of the parent
 * (design.md §13.6 "Where X belongs", §13.4 I-39a): the carbon of every
 * nitrile when the nitrile is not the principal group, since the prefix
 * `ciano-` includes it (IUPAC 2013 P-66.5: `ácido 3-cianopropanoico`,
 * NC–CH₂–CH₂–COOH, has a three-carbon parent). With a principal nitrile
 * every nitrile carbon may end the parent (P0 picks the chain with the
 * most of them); one left on a branch is cited `ciano-` there
 * (substituent.js). Kept as a list of carbons, not a nitrile test, so a
 * later family whose carbon is outside the parent (acyl prefixes, I-39b)
 * can join it.
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {string|null} principal - The principal kind (principalKindOf()).
 * @returns {Set<number>} The carbon ids kept out of the parent skeleton.
 */
export function outsideCarbons(mol, adj, principal) {
  if (principal === 'nitrile') {
    return new Set();
  }
  return new Set([...mol.atoms.keys()].filter((id) => isNitrileCarbon(mol, adj, id)));
}

/**
 * Tells whether an oxygen neighbour of a parent atom belongs to one of its
 * suffix groups (an oxygen of the principal kind; for an acid, both oxygens
 * of each –COOH; for an ester, both oxygens of the –COO–; for an amide,
 * its C=O oxygen and its N, I-37; for a nitrile, the N of each –C≡N,
 * I-38), or, when the amine is principal,
 * whether the atom is an amine nitrogen (design.md §13.4 I-36).
 *
 * @param {object} mol - A validated molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} atom - Any atom id.
 * @param {string|null} principal - The principal kind (principalKindOf()).
 * @returns {boolean} True for an oxygen (or amine nitrogen) of the principal kind.
 */
export function isPrincipalOxygen(mol, adj, atom, principal) {
  return principal !== null && groupKindOf(mol, adj, atom) === principal;
}

/**
 * Tells whether an oxygen stands for one suffix group, so that each group
 * is counted once (P0, N0, suffix sites): an oxygen of the principal kind,
 * except the OH oxygen of a –COOH, the bridge O of an ester and the N of
 * an amide, which belong to the same group as its C=O oxygen (design.md
 * §13.4 I-33, I-35, I-37).
 *
 * @param {object} mol - A validated molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} atom - Any atom id.
 * @param {string|null} principal - The principal kind (principalKindOf()).
 * @returns {boolean} True for the one oxygen that represents a suffix group.
 */
export function isSuffixOxygen(mol, adj, atom, principal) {
  if (!isPrincipalOxygen(mol, adj, atom, principal)) {
    return false;
  }
  const links = adj.get(atom);
  // An amine's N, a nitrile's N, an OH, a C=O stand for their group; a –COOH, –COO– or –CONH₂ is represented by its C=O oxygen.
  return !['acid', 'ester', 'amide'].includes(principal) || (links.length === 1 && links[0].order === 2);
}

/**
 * Traditional name of a small carbonyl compound or acid, as an id of the
 * lexicon tables (TRADITIONAL_NAMES): 'formaldehyde' for methanal,
 * 'acetaldehyde' for ethanal, 'acetone' for propanona, 'formicAcid' for
 * ácido metanoico, 'aceticAcid' for ácido etanoico, 'oxalicAcid' for ácido
 * etanodioico — only the bare molecules (no prefix, no multiple bond, a
 * single carbonyl group; the two carboxyl groups of oxalic acid); null
 * otherwise. For an ester (design.md §13.4 I-35) the id names its bare
 * acid part, whatever its O-bound group: 'formate' for a metanoato
 * (`formiato de metilo`), 'acetate' for an etanoato (`acetato de etilo`).
 * For a monoamide (design.md §13.4 I-37) 'formamide' for metanamida,
 * 'acetamide' for etanamida, also when the only prefixes are groups on
 * its N (`N-metilacetamida`, `N,N-dimetilformamida`; render.js renders the
 * prefixes before the word, as for `N-metilanilina`); IUPAC 2013 retains
 * formamide and acetamide as preferred names (P-66.1.1.1.1, from memory).
 * For a nitrile (I-38) 'acetonitrile' for the bare etanonitrilo only
 * (IUPAC 2013 retains acetonitrile as the preferred name, P-66.5.1.1.1,
 * from memory; `formonitrilo` / `cianuro de hidrógeno` for HC≡N and
 * `cianuro de metilo` are not offered).
 * IUPAC 2013 retains formaldehyde and acetaldehyde (aldehydes,
 * P-66.6), acetone for general nomenclature (ketones, P-64), and formic,
 * acetic and oxalic acid as preferred names (acids, P-65.1.1.1), hence
 * formates and acetates (esters, P-65.6.3.2); the app lists them under "Otras formas válidas"
 * (design.md §13.1), never as the main name.
 *
 * @param {object} structure - A name structure (structure.js NameStructure).
 * @returns {'formaldehyde'|'acetaldehyde'|'acetone'|'formicAcid'|'aceticAcid'|'oxalicAcid'|'formate'|'acetate'|'formamide'|'acetamide'|'acetonitrile'|null} The id.
 */
export function carbonylTraditionalId(structure) {
  const { parentKind, parent, prefixes, suffix } = structure;
  if (parentKind === 'chain' && suffix && suffix.kind === 'nitrile') {
    const bare = prefixes.length === 0 && suffix.locants.length === 1 && parent.double.length + parent.triple.length === 0;
    return bare && parent.length === 2 ? 'acetonitrile' : null;
  }
  const onNitrogen = prefixes.every((group) => group.locants.every((site) => site.locant === N_LOCANT));
  if (parentKind === 'chain' && suffix && suffix.kind === 'amide' && onNitrogen && suffix.locants.length === 1
    && parent.double.length + parent.triple.length === 0) {
    return { 1: 'formamide', 2: 'acetamide' }[parent.length] || null;
  }
  if (parentKind !== 'chain' || prefixes.length > 0 || !suffix
    || parent.double.length + parent.triple.length > 0) {
    return null;
  }
  if (suffix.kind === 'ester') {
    return { 1: 'formate', 2: 'acetate' }[parent.length] || null;
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
