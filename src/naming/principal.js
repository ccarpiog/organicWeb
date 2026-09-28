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
 * I-37), whose C=O oxygen and N are both 'amide' (`-amida`; since I-39d a
 * non-principal amide, or one on another carbon piece, is a prefix:
 * `amino…oxo`, `carbamoil-`, `acilamino-`). The functions
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
 * nitrilo > aldehído > cetona > alcohol > amina, seniority.js SENIORITY): its groups on the parent are the
 * suffix (`ácido …oico`, `…oato de …ilo`, `-amida`, `-nitrilo`, `-al`, `-ona`, `-ol`, `-amina`), every other
 * group is a prefix (`oxo-`, `hidroxi-`, `amino-`, `ciano-`; since I-39c an ester beside an acid:
 * `alcoxi` + `oxo` on its carbon, `alcoxicarbonil-`, `aciloxi-`, substituent.js esterAttachment(); since I-39d an amide
 * beside an acid or an ester, or on another carbon piece: `amino` + `oxo`, `carbamoil-`, `acilamino-`,
 * substituent.js amideAttachment()). The carbon X of a C=O or a COOH
 * is a skeleton carbon (a chain or ring atom; design.md §13.6
 * "Where X belongs"); a C=O carbon off the chain that carries it is the
 * first carbon of an acyl branch (`formil`, `acetil`, `propanoil`, I-39b;
 * `benzoil`, `(ciclohexanocarbonil)` when bonded to the ring, I-40b). The
 * exception (I-40b): a principal –COOH or –CHO bonded to a ring carbon
 * (isRingGroupCarbon()) is the ring's group, `-carboxílico` /
 * `-carbaldehído`, and its carbon is never a chain carbon; a –COOH that is
 * not a suffix group is `carboxi-`, which includes its carbon. A carboxyl group
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
import {
  isCarboxylCarbon, isEsterCarbon, isAmideCarbon, amideRole, isNitrileNitrogen, isNitrileCarbon, carbonylKind,
} from '../model/validate.js';

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
 * (substituent.js). The acyl prefixes (I-39b: `formil`, `acetil`,
 * `propanoil`) do not join it: an aldehyde or ketone carbon stays a
 * skeleton carbon, in the chain whenever the chain rules put it there
 * (`ácido 4-oxopentanoico`), and is the attachment atom of an acyl branch
 * only when the chain misses it (substituent.js `acyl`).
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
 * Kinds of principal group whose carbon X, bonded to a ring atom, a ring
 * parent cites with a suffix that includes X (design.md §13.4 I-40b,
 * I-40c): `-carboxílico`, `-carbaldehído`, `-carboxamida`, `-carbonitrilo`.
 */
export const RING_GROUP_KINDS = Object.freeze(['acid', 'aldehyde', 'amide', 'nitrile']);

/**
 * Tells whether a carbon is the carbon X of a principal group that a ring
 * parent cites with a suffix whose carbon is outside the ring (design.md
 * §13.4 I-40b, I-40c, §13.6 "Where X belongs"; IUPAC 2013 P-65.1.2,
 * P-66.6.1.1, P-66.1.1.4, P-66.5.1.1): the carbon of a –COOH
 * (`-carboxílico`, `ácido ciclohexanocarboxílico`), of a –CHO
 * (`-carbaldehído`, `ciclohexanocarbaldehído`), of an amide –CONH₂, –CONH–,
 * –CON– (`-carboxamida`, `ciclohexanocarboxamida`, I-40c) or of a –C≡N
 * (`-carbonitrilo`, `ciclohexanocarbonitrilo`, I-40c) bonded directly to a
 * ring atom, when that kind is the principal one. X is then never a
 * chain carbon: with at most one carbon neighbour, the ring atom, it would
 * be a one-carbon chain, and the ring carries its group instead
 * (parent.js ringOrChain() counts it for the ring). Such a carbon anywhere
 * else is an ordinary skeleton carbon (a nitrile carbon below a senior
 * group is outside every chain anyway, outsideCarbons()).
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} carbon - Any atom id.
 * @param {string|null} principal - The principal kind (principalKindOf()).
 * @param {Set<number>} ringAtoms - The atoms of the one ring (graph.js cycleCore()); empty for a tree.
 * @returns {boolean} True for such a carbon.
 */
export function isRingGroupCarbon(mol, adj, carbon, principal, ringAtoms) {
  if (!RING_GROUP_KINDS.includes(principal) || ringAtoms.has(carbon) || mol.atoms.get(carbon).element !== 'C'
    || !adj.get(carbon).some((n) => ringAtoms.has(n.atom))) {
    return false;
  }
  if (principal === 'acid') {
    return isCarboxylCarbon(mol, adj, carbon);
  }
  if (principal === 'amide') {
    return isAmideCarbon(mol, adj, carbon); // `-carboxamida`, `benzamida` (I-40c).
  }
  if (principal === 'nitrile') {
    return isNitrileCarbon(mol, adj, carbon); // `-carbonitrilo`, `benzonitrilo` (I-40c).
  }
  return adj.get(carbon).some((n) => carbonylKind(mol, adj, n.atom) === 'aldehyde');
} // End of function isRingGroupCarbon()

/**
 * The carbons of a molecule that a ring parent cites with a suffix whose
 * carbon is outside the ring (isRingGroupCarbon(): `-carboxílico`,
 * `-carbaldehído`, design.md §13.4 I-40b; `-carboxamida`, `-carbonitrilo`,
 * I-40c), ascending.
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {string|null} principal - The principal kind (principalKindOf()).
 * @param {Set<number>} ringAtoms - The atoms of the one ring; empty for a tree.
 * @returns {number[]} The carbon ids.
 */
export function ringGroupCarbons(mol, adj, principal, ringAtoms) {
  return [...mol.atoms.keys()].filter((id) => isRingGroupCarbon(mol, adj, id, principal, ringAtoms)).sort((p, q) => p - q);
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
 * Tells whether a neighbour of a parent atom belongs to a suffix group
 * carried by that atom: an oxygen (or nitrogen) of the principal kind
 * (isPrincipalOxygen()), and, for a principal amide, one of the amide
 * whose carbon is that atom. Another amide's N bonded to a parent carbon
 * (design.md §13.4 I-39d: `CH₃CO–NH–` on `2-(acetilamino)etanamida`) is
 * the `acilamino` prefix, not a suffix group, nor are the groups on it
 * N-prefixes of the parent.
 *
 * @param {object} mol - A validated molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} carrier - The parent atom.
 * @param {number} atom - A neighbour of it.
 * @param {string|null} principal - The principal kind (principalKindOf()).
 * @returns {boolean} True when the neighbour is part of a suffix group of `carrier`.
 */
export function isSuffixGroupAtomOf(mol, adj, carrier, atom, principal) {
  return isPrincipalOxygen(mol, adj, atom, principal) && (principal !== 'amide' || isAmideCarbon(mol, adj, carrier));
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
 * Three benzene derivatives whose parent is a chain (design.md §13.4
 * I-40a), bare (the `fenil` group the only prefix, no N groups):
 * 'acetophenone' for 1-feniletan-1-ona, 'benzylAlcohol' for fenilmetanol,
 * 'benzylamine' for fenilmetanamina; IUPAC 2013 accepts acetophenone,
 * benzyl alcohol and benzylamine in general nomenclature, not as
 * preferred names (from memory). Likewise (design.md §13.4 I-40b)
 * 'phenylaceticAcid' for ácido 2-feniletanoico and 'phenylacetaldehyde'
 * for 2-feniletanal (acetic acid and acetaldehyde keep their retained
 * names with a phenyl on the CH₃; status from memory, offered as accepted),
 * and (I-40c) 'phenylacetamide' for 2-feniletanamida (`2-fenilacetamida`)
 * and 'phenylacetonitrile' for 2-feniletanonitrilo (`fenilacetonitrilo`);
 * a phenyl on an amide N is not one of these: `N-feniletanamida` gives
 * 'acetamide' (`N-fenilacetamida`).
 * IUPAC 2013 retains formaldehyde and acetaldehyde (aldehydes,
 * P-66.6), acetone for general nomenclature (ketones, P-64), and formic,
 * acetic and oxalic acid as preferred names (acids, P-65.1.1.1), hence
 * formates and acetates (esters, P-65.6.3.2); the app lists them under "Otras formas válidas"
 * (design.md §13.1), never as the main name.
 *
 * @param {object} structure - A name structure (structure.js NameStructure).
 * @returns {'formaldehyde'|'acetaldehyde'|'acetone'|'formicAcid'|'aceticAcid'|'oxalicAcid'|'formate'|'acetate'|'formamide'|'acetamide'|'acetonitrile'|'acetophenone'|'benzylAlcohol'|'benzylamine'|'phenylaceticAcid'|'phenylacetaldehyde'|'phenylacetamide'|'phenylacetonitrile'|null} The id.
 */
export function carbonylTraditionalId(structure) {
  const { parentKind, parent, prefixes, suffix } = structure;
  const phenylOnly = parentKind === 'chain' && suffix && suffix.locants.length === 1 && prefixes.length === 1
    && prefixes[0].locants.length === 1 && prefixes[0].locants[0].locant !== N_LOCANT
    && prefixes[0].substituent.retained === 'phenyl' && !prefixes[0].substituent.alkoxy
    && parent.double.length + parent.triple.length === 0;
  if (phenylOnly) {
    // C₆H₅–CO–CH₃, C₆H₅–CH₂OH, C₆H₅–CH₂NH₂ (design.md §13.4 I-40a); C₆H₅–CH₂–COOH, C₆H₅–CH₂–CHO (I-40b);
    // C₆H₅–CH₂–CONH₂, C₆H₅–CH₂–C≡N (I-40c). A phenyl on an amide N is `N-fenilacetamida` (below).
    const ids = {
      ketone: { 2: 'acetophenone' },
      alcohol: { 1: 'benzylAlcohol' },
      amine: { 1: 'benzylamine' },
      acid: { 2: 'phenylaceticAcid' },
      aldehyde: { 2: 'phenylacetaldehyde' },
      amide: { 2: 'phenylacetamide' },
      nitrile: { 2: 'phenylacetonitrile' },
    }[suffix.kind];
    return (ids && ids[parent.length]) || null;
  }
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
    // A monoester only: a diester (I-39c) of ethanedioic acid is no acetate.
    return suffix.locants.length === 1 ? { 1: 'formate', 2: 'acetate' }[parent.length] || null : null;
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
