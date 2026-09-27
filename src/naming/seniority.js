/**
 * @file Seniority of characteristic groups and the suffix/prefix choice
 * (design.md §13.4 I-29; IUPAC 2013 P-41). Pure: works on the group
 * records of groups.js, never on coordinates or the DOM.
 *
 * Order of the kinds that can be a suffix, most senior first:
 * ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina
 * (P-41: acids, then anhydrides and esters, acid halides, amides, nitriles,
 * aldehydes, ketones, alcohols and phenols, amines; the classes in between
 * are out of scope). Ethers and halides are never a suffix (P-41, P-63.2.2,
 * P-61.3): they are always prefixes (`metoxi-`, `cloro-`).
 *
 * The principal group is the most senior kind present; every group of that
 * kind is cited as a suffix, every other recognised group as a prefix.
 * Unsupported groups get neither: a molecule with one cannot be named, but
 * the principal is still chosen among the recognised groups so the
 * explanation can show the reasoning.
 */

import { adjacency } from '../model/graph.js';
import { detectGroups } from './groups.js';
import { lexiconEs } from './lexicon.es.js';

/** Suffix kinds by seniority, most senior first (IUPAC 2013 P-41). */
export const SENIORITY = Object.freeze(['acid', 'ester', 'amide', 'nitrile', 'aldehyde', 'ketone', 'alcohol', 'amine']);

/** Kinds that are always prefixes, never the principal group. */
export const PREFIX_ONLY = Object.freeze(['ether', 'halide']);

/**
 * Seniority rank of a kind: 0 for the most senior (acid); Infinity for a
 * prefix-only or unsupported kind.
 *
 * @param {string} kind - A group kind.
 * @returns {number} The rank.
 */
export function seniorityRank(kind) {
  const rank = SENIORITY.indexOf(kind);
  return rank < 0 ? Infinity : rank;
}

/**
 * Chooses the principal group kind: the most senior kind among the groups.
 *
 * @param {{kind: string}[]} groups - Group records (groups.js).
 * @returns {string|null} The principal kind, or null when no group can be a suffix.
 */
export function principalKind(groups) {
  let best = null;
  for (const group of groups) {
    if (seniorityRank(group.kind) < seniorityRank(best)) {
      best = group.kind;
    }
  }
  return best;
}

/**
 * A classified group: a group record plus its role and affixes.
 *
 * @typedef {object} ClassifiedGroup
 * @property {'suffix'|'prefix'|'unsupported'} role - How the group is cited: the principal kind as a suffix, the rest as prefixes.
 * @property {string|null} suffix - The kind's suffix in the lexicon language (null when it is never a suffix).
 * @property {string|null} prefix - The kind's prefix (halides by element; null for unsupported, and for a prefix ester or amide whose attachment is undecided).
 * @property {'carbonyl'|'heteroatom'|null} [attachment] - Prefix ester or amide only: the end facing the principal group (null when undecided).
 * @property {{carbonyl: string, heteroatom: string}} [prefixes] - Prefix ester or amide only: both prefix forms.
 */

/**
 * The analysis of the characteristic groups carried by a naming result
 * (`result.groups`, design.md §4.1, §13.2).
 *
 * @typedef {object} GroupAnalysis
 * @property {object[]} items - Every group (groups.js GroupRecord plus the ClassifiedGroup fields), in groups.js order.
 * @property {string|null} principal - The principal kind, or null.
 * @property {boolean} unsupported - True when some group is not recognised.
 */

/** Kinds whose prefix depends on which end faces the parent (ester, amide). */
const ORIENTED_KINDS = Object.freeze(['ester', 'amide']);

/**
 * Tells which end of a prefix ester or amide faces the principal group:
 * the side of its carbonyl carbon (`roles.acylCarbon`) or the side of its
 * O or N (the other outside carbons). Each side is explored breadth-first
 * without crossing the group; the side that reaches an atom of a principal
 * group wins. When both or neither do (a ring through both ends, a formate
 * whose acyl side is only H, several principal groups on both sides), the
 * direction cannot be decided at this stage and null is returned.
 *
 * @param {object} group - An ester or amide record (groups.js).
 * @param {Set<number>} targets - Atoms of the principal groups.
 * @param {Map<number, object[]>} adj - Adjacency map of the molecule.
 * @returns {'carbonyl'|'heteroatom'|null} The end facing the principal group.
 */
export function attachmentTowards(group, targets, adj) {
  const blocked = new Set(group.atoms);
  const acyl = group.roles.acylCarbon;
  /**
   * Tells whether a breadth-first walk from some start atoms, never entering
   * the group, reaches a target atom.
   *
   * @param {number[]} starts - Start atoms (outside the group).
   * @returns {boolean} True when a target is reached.
   */
  const reaches = (starts) => {
    const seen = new Set(starts);
    const queue = [...starts];
    for (let i = 0; i < queue.length; i += 1) {
      if (targets.has(queue[i])) {
        return true;
      }
      for (const n of adj.get(queue[i])) {
        if (!blocked.has(n.atom) && !seen.has(n.atom)) {
          seen.add(n.atom);
          queue.push(n.atom);
        }
      }
    }
    return false;
  };
  const viaCarbonyl = acyl !== undefined && reaches([acyl]);
  const viaHeteroatom = reaches(group.attachedTo.filter((id) => id !== acyl));
  if (viaCarbonyl === viaHeteroatom) {
    return null;
  }
  return viaCarbonyl ? 'carbonyl' : 'heteroatom';
} // End of function attachmentTowards()

/**
 * Classifies groups as suffix or prefix and attaches their affixes. With the
 * molecule, a prefix ester or amide also gets `attachment` (which end faces
 * the principal group, attachmentTowards()) and the matching prefix:
 * `alcoxicarbonil` / `carbamoil` through the carbonyl carbon, `aciloxi` /
 * `acilamino` through the O or N; when the end cannot be decided (or
 * without the molecule) `attachment` is null and `prefix` is null, and
 * `prefixes` lists both forms for the explanation.
 *
 * @param {object[]} groups - Group records (groups.js detectGroups()).
 * @param {object} [lexicon] - lexiconEs (default) or lexiconEn.
 * @param {object} [mol] - The molecule, to orient prefix esters and amides.
 * @returns {GroupAnalysis} The analysis.
 */
export function classifyGroups(groups, lexicon = lexiconEs, mol = null) {
  const principal = principalKind(groups);
  const adj = mol ? adjacency(mol) : null;
  const targets = new Set(groups.filter((g) => g.kind === principal).flatMap((g) => g.atoms));
  const items = groups.map((group) => {
    let role = 'prefix';
    if (group.kind === 'unsupported') {
      role = 'unsupported';
    } else if (group.kind === principal) {
      role = 'suffix';
    }
    const item = {
      ...group,
      role,
      suffix: lexicon.groupSuffix(group.kind),
      prefix: lexicon.groupPrefix(group.kind, group.element),
    };
    if (role === 'prefix' && ORIENTED_KINDS.includes(group.kind)) {
      const attachment = adj ? attachmentTowards(group, targets, adj) : null;
      item.attachment = attachment;
      item.prefix = attachment ? lexicon.groupPrefix(group.kind, null, attachment) : null;
      item.prefixes = {
        carbonyl: lexicon.groupPrefix(group.kind, null, 'carbonyl'),
        heteroatom: lexicon.groupPrefix(group.kind, null, 'heteroatom'),
      };
    }
    return item;
  }); // End of the classification of each group
  return { items, principal, unsupported: items.some((item) => item.role === 'unsupported') };
} // End of function classifyGroups()

/**
 * Detects and classifies the characteristic groups of a molecule.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {object} [lexicon] - lexiconEs (default) or lexiconEn.
 * @returns {GroupAnalysis} The analysis (no items for a hydrocarbon).
 */
export function analyzeGroups(mol, lexicon = lexiconEs) {
  return classifyGroups(detectGroups(mol), lexicon, mol);
}
