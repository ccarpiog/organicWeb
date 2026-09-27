/**
 * @file Parent-chain candidates and the direction-independent part of the
 * selection cascade (design.md §4.2–4.3).
 *
 * Candidates are the paths between every pair of leaf carbons (a path that
 * ends at a non-leaf could be extended, so it is never maximal — extending
 * it never loses a principal group either). They are compared,
 * direction-independently, by:
 *
 *   P0 most principal characteristic groups (the groups of the principal
 *      oxygen kind on chain carbons: OH groups cited as `-ol`, I-31, the
 *      C=O of aldehydes and ketones cited as `-al` / `-ona`, I-32, or the
 *      –COOH of acids cited as `ácido …oico`, each counted once, I-33;
 *      IUPAC 2013 P-44.1.1, design.md §13.4) — only when the molecule has
 *      such groups, and then always recorded;
 *   P1 longest chain (carbon count);
 *   P2 most multiple bonds lying within the chain;
 *   P3 most double bonds within the chain.
 *
 * P1 is always recorded (after P0, over the chains P0 kept); P2–P3 only
 * while more than one chain remains (the cascade stops when one chain is
 * left). P4 (most substituents) comes after
 * the unsaturation locants N1/N2, so it lives in numbering.js. The
 * leaf-to-leaf restriction is for the parent only, never for substituents.
 * Paths run over the carbon skeleton only: a halogen (design.md §13.4 I-30)
 * is never a chain atom, only a substituent, so it counts in P4 like any
 * other prefix (chainCounts() on the whole graph); nor is any oxygen: one
 * of the principal kind is counted by P0, any other (a non-principal OH or
 * C=O, cited `hidroxi-` / `oxo-`) is a prefix counted by P4. A C=O carbon
 * is a skeleton carbon like any other (an aldehyde or carboxyl carbon is
 * always a leaf, so it can end a chain; a ketone carbon has two carbon
 * neighbours), and
 * the C=O bond is never a chain bond, so it counts in no P2/P3 comparison
 * (design.md §13.6 "Where X belongs").
 * Pure: reads topology only.
 */

import { adjacency, leaves, carbonSkeleton } from '../model/graph.js';
import { principalKindOf, isPrincipalOxygen, isSuffixOxygen } from './principal.js';

/**
 * Orients a chain so that it starts at the end with the smaller atom id.
 * This orientation identifies a chain independently of its direction.
 *
 * @param {number[]} atoms - Chain atom ids (either end first).
 * @returns {number[]} A new array starting at the smaller end id.
 */
export function orientChain(atoms) {
  return atoms[0] <= atoms[atoms.length - 1] ? [...atoms] : [...atoms].reverse();
}

/**
 * Stable, direction-independent key of a chain.
 *
 * @param {number[]} atoms - Chain atom ids (either end first).
 * @returns {string} The key, e.g. '1-2-4-5'.
 */
export function chainKey(atoms) {
  return orientChain(atoms).join('-');
}

/**
 * Runs a breadth-first search from `from`; following the parent map from any
 * atom back to `from` gives the (unique, in a tree) path between them.
 *
 * @param {Map<number, {atom: number}[]>} adj - Adjacency map (graph.js).
 * @param {number} from - Start atom id.
 * @returns {Map<number, number|null>} BFS parent of every atom (the root maps to null).
 */
function bfsParents(adj, from) {
  const parent = new Map([[from, null]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i += 1) {
    for (const n of adj.get(queue[i])) {
      if (!parent.has(n.atom)) {
        parent.set(n.atom, queue[i]);
        queue.push(n.atom);
      }
    }
  }
  return parent;
}

/**
 * Enumerates every leaf-to-leaf path of the carbon skeleton of a tree
 * molecule (design.md §4.2; halogens are left out, so a carbon bearing a
 * halogen can still be a chain end). A lone carbon (methane, clorometano)
 * gives the one-atom chain.
 *
 * @param {object} mol - A validated acyclic hydrocarbon or halogen derivative (a tree).
 * @returns {number[][]} Paths, each starting at its smaller end id, ordered by key.
 */
export function leafToLeafPaths(mol) {
  const skeleton = carbonSkeleton(mol);
  const adj = adjacency(skeleton);
  if (adj.size === 1) {
    return [[adj.keys().next().value]];
  }
  const ends = leaves(skeleton);
  const paths = [];
  for (let i = 0; i < ends.length; i += 1) {
    const parent = bfsParents(adj, ends[i]);
    for (let j = i + 1; j < ends.length; j += 1) {
      const path = [];
      for (let current = ends[j]; current !== null; current = parent.get(current)) {
        path.push(current);
      }
      paths.push(orientChain(path));
    }
  }
  return paths;
} // End of function leafToLeafPaths()

/**
 * Counts, for one chain, the data compared by P0–P3 (and the substituent
 * count that numbering.js compares as P4: every neighbour outside the chain,
 * halogens included, the suffix groups not).
 *
 * @param {Map<number, {atom: number, bond: number, order: number}[]>} adj - Adjacency map.
 * @param {number[]} atoms - Chain atom ids in order.
 * @param {function(number): boolean} [isSuffixAtom] - Tells whether a neighbour is a suffix group's heteroatom (the one oxygen that stands for a group of the principal kind); default none.
 * @param {function(number): boolean} [isGroupAtom] - Tells whether a neighbour is another atom of a suffix group (the OH of a –COOH), counted neither as a suffix nor as a substituent; default none.
 * @returns {{suffixes: number, length: number, multiple: number, double: number, substituents: number}} The counts.
 */
export function chainCounts(adj, atoms, isSuffixAtom = () => false, isGroupAtom = () => false) {
  const inChain = new Set(atoms);
  let multiple = 0;
  let double = 0;
  let substituents = 0;
  let suffixes = 0;
  atoms.forEach((atom, i) => {
    for (const n of adj.get(atom)) {
      if (isSuffixAtom(n.atom)) {
        suffixes += 1;
      } else if (isGroupAtom(n.atom)) {
        continue;
      } else if (!inChain.has(n.atom)) {
        substituents += 1;
      } else if (n.atom === atoms[i + 1] && n.order >= 2) {
        multiple += 1;
        double += n.order === 2 ? 1 : 0;
      }
    }
  });
  return { suffixes, length: atoms.length, multiple, double, substituents };
} // End of function chainCounts()

/**
 * Internal invariant of design.md §4.2: no triple bond can leave a longest
 * chain (an internal attachment would exceed the valence of 4, a terminal
 * one would make the chain longer).
 *
 * @param {Map<number, {atom: number, order: number}[]>} adj - Adjacency map.
 * @param {number[]} atoms - A longest chain.
 * @returns {void}
 * @throws {Error} When a triple bond joins the chain to an atom outside it.
 */
function assertNoTripleBondLeaves(adj, atoms) {
  const inChain = new Set(atoms);
  for (const atom of atoms) {
    for (const n of adj.get(atom)) {
      if (!inChain.has(n.atom) && n.order === 3) {
        throw new Error(`selectParent: triple bond ${atom}-${n.atom} leaves a longest chain (invariant broken)`);
      }
    }
  }
}

/**
 * Copies a chain into the candidate shape stored in the trace.
 *
 * @param {number[]} atoms - Chain atom ids (oriented).
 * @returns {{atoms: number[], key: string}} The trace candidate.
 */
function traceCandidate(atoms) {
  return { atoms: [...atoms], key: atoms.join('-') };
}

/**
 * Keeps the chains with the highest count and records the rule.
 *
 * @param {string} rule - Rule id ('P1'…'P3').
 * @param {number[][]} chains - Chains entering the rule.
 * @param {number[]} values - Count of each chain (same order).
 * @returns {{step: object, survivors: number[][]}} The trace step and the surviving chains.
 */
function applyCountRule(rule, chains, values) {
  const best = Math.max(...values);
  const survivors = chains.filter((_, i) => values[i] === best);
  const step = {
    rule,
    candidatesBefore: chains.map(traceCandidate),
    values: [...values],
    survivors: survivors.map(traceCandidate),
  };
  return { step, survivors };
}

/**
 * Narrows the parent chain(s) of a molecule by P0–P3 (design.md §4.3). The
 * chains that remain tied go, with both directions of each, to numbering
 * (numbering.js: N0, N1, N2, then P4, N3, N4, §4.4). P0 (most OH groups on
 * the chain) is applied, and recorded, only when the molecule has OH groups
 * (an alcohol, design.md §13.4 I-31): IUPAC 2013 puts the principal
 * characteristic groups before the chain length (P-44.1.1), so a shorter
 * chain carrying more OH groups wins. The same holds for aldehydes and
 * ketones (I-32), whose C=O is the principal group when present (principal.js).
 *
 * @param {object} mol - A validated acyclic hydrocarbon, halogen derivative, alcohol, aldehyde or ketone.
 * @returns {{chains: number[][], trace: object[]}} The remaining chains (each starting at its smaller end id) and the P-rule trace steps.
 * @throws {Error} When the invariant "no triple bond leaves a longest chain" is broken.
 */
export function selectParent(mol) {
  const adj = adjacency(mol);
  let chains = leafToLeafPaths(mol);
  const principal = principalKindOf(mol, adj);
  const isSuffix = (id) => isSuffixOxygen(mol, adj, id, principal);
  const isGroup = (id) => isPrincipalOxygen(mol, adj, id, principal);
  const counts = new Map(chains.map((chain) => [chain.join('-'), chainCounts(adj, chain, isSuffix, isGroup)]));
  const trace = [];
  const hasPrincipal = principal !== null;
  const rules = [
    { rule: 'P0', field: 'suffixes' },
    { rule: 'P1', field: 'length' },
    { rule: 'P2', field: 'multiple' },
    { rule: 'P3', field: 'double' },
  ];
  for (const { rule, field } of rules) {
    if (rule === 'P0' && !hasPrincipal) {
      continue;
    }
    if (rule !== 'P0' && rule !== 'P1' && chains.length < 2) {
      break;
    }
    const values = chains.map((chain) => counts.get(chain.join('-'))[field]);
    const { step, survivors } = applyCountRule(rule, chains, values);
    trace.push(step);
    chains = survivors;
    if (rule === 'P1') {
      chains.forEach((chain) => assertNoTripleBondLeaves(adj, chain));
    }
  }
  return { chains: chains.map((chain) => [...chain]), trace };
} // End of function selectParent()
