/**
 * @file Substituents of a chain and their recursive naming (design.md
 * §4.5–4.6).
 *
 * For each chain atom, each neighbour outside the chain roots a substituent
 * subtree. The attachment atom and the attachment bond order are recorded as
 * data. Each substituent also gets a canonical identity key (equal keys are
 * grouped under one prefix: `dimetil`, `di(propan-2-il)`, `bis(2-metilpropil)`).
 *
 * The substituent's own chain is chosen among the paths of the subtree that
 * **contain the attachment atom** (not necessarily as an endpoint, which is
 * what yields `propan-2-il`), by: P1 longest; P2 most multiple bonds; P3 most
 * double bonds; then the numbering cascade of numbering.js with the free
 * valence first: FV lowest free-valence locant, N1, N2, P4 most
 * substituents, N3, N4, N5, tie-break. Its own substituents are named the
 * same way, recursively.
 *
 * Prefix styles (design.md §1.1): 'isopropil' (default) cites –CH(CH₃)₂ as
 * the retained `isopropil`; 'pin' uses the 2013 preferred prefixes
 * (`propan-2-il`); 'substituted' names every group from a chain that starts
 * at the attachment atom (free valence at 1: `1-metiletil`,
 * `1,1-dimetiletil`). `tert-butil` is retained in 'isopropil' and 'pin'.
 *
 * Doubly-attached (`-iliden`) substituents, at any depth, are not named yet
 * (phase 060): their structure is null and the engine reports `NOT_YET`.
 * Pure: topology only.
 */

import { adjacency, rootedTreeKey } from '../model/graph.js';
import { buildChainStructure } from './structure.js';
import { numberParent, compareCitationKeys } from './numbering.js';
import { citationKey, prefixNameKey } from './render.js';
import { lexiconEs } from './lexicon.es.js';

/** Bond-order symbols that prefix a substituent identity key. */
const ATTACH_SYMBOL = { 1: '-', 2: '=', 3: '#' };

/** Prefix styles accepted by nameMolecule (design.md §1.1); the first is the default. */
export const PREFIX_STYLES = Object.freeze(['isopropil', 'pin', 'substituted']);

/**
 * Rooted canonical keys (graph.js rootedTreeKey, seen from the carrying
 * atom) of the groups that have a retained or a common name. Topology, not
 * strings of a name, identifies them.
 */
const GROUP_SHAPES = Object.freeze({
  'C(-C(),-C())': 'isopropyl',
  'C(-C(),-C(),-C())': 'tert-butyl',
  'C(=C())': 'vinyl',
  'C(-C(=C()))': 'allyl',
  'C(-C(-C(),-C()))': 'isobutyl',
  'C(-C(),-C(-C()))': 'sec-butyl',
});

/**
 * Creates the naming context shared by every substituent of one naming run
 * (one molecule, one prefix style). Named substituents are cached per
 * (carrying atom, attachment atom) pair.
 *
 * @param {object} mol - A validated acyclic hydrocarbon.
 * @param {string} [style] - Prefix style: 'isopropil' (default), 'pin' or 'substituted'.
 * @param {object} [lexicon] - The lexicon (citation order depends on the prefix words).
 * @param {Map<number, object[]>} [adj] - Adjacency map (computed when omitted).
 * @returns {{mol: object, adj: Map<number, object[]>, style: string, lexicon: object, cache: Map<string, object|null>}} The context.
 * @throws {RangeError} For an unknown style.
 */
export function createNamingContext(mol, style = PREFIX_STYLES[0], lexicon = lexiconEs, adj = adjacency(mol)) {
  if (!PREFIX_STYLES.includes(style)) {
    throw new RangeError(`unknown prefix style ${style}`);
  }
  return { mol, adj, style, lexicon, cache: new Map() };
}

/**
 * Collects the atoms and bonds of the subtree that starts at `attachAtom`
 * and leads away from `chainAtom` (the connecting bond is not included).
 *
 * @param {Map<number, {atom: number, bond: number, order: number}[]>} adj - Adjacency map (graph.js).
 * @param {number} chainAtom - The carrying chain atom.
 * @param {number} attachAtom - The substituent atom bonded to it.
 * @returns {{atoms: number[], bonds: number[]}} Atom ids (breadth-first from attachAtom) and bond ids (ascending).
 */
export function substituentSubtree(adj, chainAtom, attachAtom) {
  const seen = new Set([chainAtom, attachAtom]);
  const atoms = [attachAtom];
  const bonds = [];
  for (let i = 0; i < atoms.length; i += 1) {
    for (const n of adj.get(atoms[i])) {
      if (!seen.has(n.atom)) {
        seen.add(n.atom);
        atoms.push(n.atom);
        bonds.push(n.bond);
      }
    }
  }
  return { atoms, bonds: bonds.sort((p, q) => p - q) };
} // End of function substituentSubtree()

/**
 * Lists the candidate chains of a substituent: paths of its subtree that
 * contain the attachment atom and cannot be extended. Each is either an arm
 * (attachment atom → a leaf) or two arms in different branches joined at the
 * attachment atom. In the 'substituted' style only arms are candidates (the
 * free valence must be at a chain end).
 *
 * @param {Map<number, object[]>} adj - Adjacency map.
 * @param {number} chainAtom - The carrying atom (outside the subtree).
 * @param {number} attachAtom - The attachment atom.
 * @param {boolean} armsOnly - Whether only arms are candidates.
 * @returns {number[][]} The candidate chains as atom-id paths.
 */
export function substituentChainCandidates(adj, chainAtom, attachAtom, armsOnly) {
  const parent = new Map([[attachAtom, chainAtom]]);
  const branchOf = new Map();
  const queue = [attachAtom];
  const leafAtoms = [];
  for (let i = 0; i < queue.length; i += 1) {
    const atom = queue[i];
    const children = adj.get(atom).filter((n) => n.atom !== parent.get(atom));
    for (const n of children) {
      parent.set(n.atom, atom);
      branchOf.set(n.atom, atom === attachAtom ? n.atom : branchOf.get(atom));
      queue.push(n.atom);
    }
    if (children.length === 0 && atom !== attachAtom) {
      leafAtoms.push(atom);
    }
  } // End of the breadth-first walk of the subtree
  if (leafAtoms.length === 0) {
    return [[attachAtom]];
  }
  const arm = (leaf) => {
    const path = [];
    for (let atom = leaf; atom !== attachAtom; atom = parent.get(atom)) {
      path.unshift(atom);
    }
    return [attachAtom, ...path];
  };
  const arms = leafAtoms.map((leaf) => ({ leaf, path: arm(leaf) }));
  const candidates = arms.map(({ path }) => path);
  if (!armsOnly) {
    for (let i = 0; i < arms.length; i += 1) {
      for (let j = i + 1; j < arms.length; j += 1) {
        if (branchOf.get(arms[i].leaf) !== branchOf.get(arms[j].leaf)) {
          candidates.push([...arms[i].path].reverse().concat(arms[j].path.slice(1)));
        }
      }
    }
  } // End of the pairing of arms from different branches
  return candidates;
} // End of function substituentChainCandidates()

/**
 * Keeps the chains with the highest value of a count (P1–P3 on substituent chains).
 *
 * @param {number[][]} chains - Candidate chains.
 * @param {function(number[]): number} count - The count of a chain.
 * @returns {number[][]} The chains with the maximum count.
 */
function keepMax(chains, count) {
  const values = chains.map(count);
  const best = Math.max(...values);
  return chains.filter((_, i) => values[i] === best);
}

/**
 * Counts the bonds along a chain whose order satisfies a test.
 *
 * @param {Map<number, object[]>} adj - Adjacency map.
 * @param {number[]} atoms - The chain.
 * @param {function(number): boolean} test - Which bond orders to count.
 * @returns {number} The count.
 */
function countBonds(adj, atoms, test) {
  let count = 0;
  for (let i = 0; i + 1 < atoms.length; i += 1) {
    const link = adj.get(atoms[i]).find((n) => n.atom === atoms[i + 1]);
    count += test(link.order) ? 1 : 0;
  }
  return count;
}

/**
 * Lists every substituent hanging from a chain (a parent chain, or the
 * chain of a substituent when `exclude` is its carrying atom), each named
 * recursively under the context's style.
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number[]} chainAtoms - The chain's atom ids.
 * @param {number|null} [exclude] - An atom outside the chain that is not a substituent (the carrying atom of a substituent chain).
 * @returns {{chainAtom: number, attachAtom: number, bond: number, order: number, atoms: number[], bonds: number[], key: string, structure: object|null, citation: object|null}[]} One entry per substituent, in chain order then attachment-atom order.
 */
export function substituentsOf(ctx, chainAtoms, exclude = null) {
  const inChain = new Set(chainAtoms);
  const result = [];
  for (const chainAtom of chainAtoms) {
    for (const n of ctx.adj.get(chainAtom)) {
      if (inChain.has(n.atom) || n.atom === exclude) {
        continue;
      }
      const subtree = substituentSubtree(ctx.adj, chainAtom, n.atom);
      const structure = n.order === 1 ? nameSubstituentIn(ctx, chainAtom, n.atom) : null;
      result.push({
        chainAtom,
        attachAtom: n.atom,
        bond: n.bond,
        order: n.order,
        atoms: subtree.atoms,
        bonds: subtree.bonds,
        key: ATTACH_SYMBOL[n.order] + rootedTreeKey(ctx.mol, n.atom, chainAtom, ctx.adj),
        structure,
        citation: structure ? citationKey(structure, ctx.lexicon) : null,
      });
    } // End of the loop over the neighbours of one chain atom
  } // End of the loop over the chain atoms
  return result;
} // End of function substituentsOf()

/**
 * Builds the N5 complete-name key function for numberParent(): it renders a
 * candidate's groups (`{key, citation, locants}`, identity keys from
 * substituentsOf()) with render.js prefixNameKey().
 *
 * @param {object[][]} substituentLists - The substituentsOf() entries of every candidate chain.
 * @param {object} lexicon - The lexicon.
 * @returns {function({key: string, locants: number[]}[]): {alpha: string, numeric: number[], italic: string}} The key function.
 */
export function nameKeyFunction(substituentLists, lexicon) {
  const structureOf = new Map();
  for (const list of substituentLists) {
    for (const sub of list) {
      structureOf.set(sub.key, sub.structure);
    }
  }
  return (groups) => prefixNameKey(groups.map((g) => ({
    substituent: structureOf.get(g.key),
    locants: g.locants.map((locant) => ({ locant })),
  })), lexicon);
}

/**
 * Groups the substituents of a numbered chain into prefix groups, in
 * citation (alphanumerical) order, each occurrence with its locant.
 *
 * @param {object[]} substituents - Entries from substituentsOf(), all with a structure.
 * @param {number[]} atoms - Chain atom ids in locant order.
 * @returns {object[]} The prefix groups (structure.js PrefixGroup).
 */
export function groupPrefixes(substituents, atoms) {
  const locantOf = new Map(atoms.map((atom, i) => [atom, i + 1]));
  const byKey = new Map();
  for (const sub of substituents) {
    if (!byKey.has(sub.key)) {
      byKey.set(sub.key, { key: sub.key, substituent: sub.structure, locants: [], citation: sub.citation });
    }
    byKey.get(sub.key).locants.push({
      locant: locantOf.get(sub.chainAtom),
      atom: sub.chainAtom,
      attachAtom: sub.attachAtom,
      bond: sub.bond,
      order: sub.order,
      atoms: [...sub.atoms],
      bonds: [...sub.bonds],
    });
  }
  const groups = [...byKey.values()];
  groups.forEach((group) => group.locants.sort((p, q) => p.locant - q.locant || p.attachAtom - q.attachAtom));
  groups.sort((g, h) => compareCitationKeys(g.citation, h.citation) || (g.key < h.key ? -1 : 1));
  return groups.map(({ key, substituent, locants }) => ({ key, substituent, locants }));
} // End of function groupPrefixes()

/**
 * Names the substituent that starts at `attachAtom` (singly attached to
 * `chainAtom`) under the context's style, or returns null when it contains
 * a doubly-attached group (not named before phase 060). Results are cached
 * in the context.
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number} chainAtom - The carrying atom.
 * @param {number} attachAtom - The attachment atom.
 * @returns {object|null} The SubstituentStructure (structure.js), or null.
 */
function nameSubstituentIn(ctx, chainAtom, attachAtom) {
  const cacheKey = `${chainAtom}>${attachAtom}`;
  if (!ctx.cache.has(cacheKey)) {
    ctx.cache.set(cacheKey, buildSubstituent(ctx, chainAtom, attachAtom));
  }
  return ctx.cache.get(cacheKey);
}

/**
 * Builds the structure of a singly attached substituent (the body of
 * nameSubstituentIn): chooses its chain (P1–P3, then the numbering cascade
 * with the free valence first), groups its own substituents and flags
 * retained and common names.
 *
 * @param {object} ctx - Naming context.
 * @param {number} chainAtom - The carrying atom.
 * @param {number} attachAtom - The attachment atom.
 * @returns {object|null} The SubstituentStructure, or null when a nested group cannot be named yet.
 */
function buildSubstituent(ctx, chainAtom, attachAtom) {
  const { adj, style } = ctx;
  let chains = substituentChainCandidates(adj, chainAtom, attachAtom, style === 'substituted');
  chains = keepMax(chains, (c) => c.length);
  chains = keepMax(chains, (c) => countBonds(adj, c, (order) => order >= 2));
  chains = keepMax(chains, (c) => countBonds(adj, c, (order) => order === 2));
  const subsByChain = new Map(chains.map((chain) => [chain, substituentsOf(ctx, chain, chainAtom)]));
  const prefixesOf = (chain) => subsByChain.get(chain).map((sub) => ({ atom: sub.chainAtom, key: sub.key, citation: sub.citation }));
  const nameKey = nameKeyFunction([...subsByChain.values()], ctx.lexicon);
  const numbering = numberParent(ctx.mol, chains, prefixesOf, { adj, freeValenceAtom: attachAtom, nameKey });
  const subs = subsByChain.get(chains[numbering.chainIndex]);
  if (numbering.unsupported || subs.some((sub) => !sub.structure)) {
    return null;
  }
  const subtree = substituentSubtree(adj, chainAtom, attachAtom);
  const shape = GROUP_SHAPES[rootedTreeKey(ctx.mol, attachAtom, chainAtom, adj)] || null;
  const retained = (shape === 'isopropyl' && style === 'isopropil') || (shape === 'tert-butyl' && style !== 'substituted')
    ? shape : null;
  return {
    chain: buildChainStructure(numbering.atoms, numbering.bonds, numbering.orders),
    prefixes: groupPrefixes(subs, numbering.atoms),
    freeValence: { locant: numbering.atoms.indexOf(attachAtom) + 1, order: 1 },
    retained,
    commonName: retained ? null : shape,
    atoms: subtree.atoms,
    bonds: subtree.bonds,
  };
} // End of function buildSubstituent()

/**
 * Names one substituent on its own (a fresh context each call; use
 * substituentsOf() to name many).
 *
 * @param {object} mol - A validated acyclic hydrocarbon.
 * @param {number} chainAtom - The carrying chain atom.
 * @param {number} attachAtom - The substituent atom bonded to it.
 * @param {string} [style] - Prefix style (default 'isopropil').
 * @returns {object|null} The SubstituentStructure, or null for a doubly-attached group (at any depth).
 */
export function nameSubstituent(mol, chainAtom, attachAtom, style = PREFIX_STYLES[0]) {
  const ctx = createNamingContext(mol, style);
  const link = ctx.adj.get(chainAtom).find((n) => n.atom === attachAtom);
  return link && link.order === 1 ? nameSubstituentIn(ctx, chainAtom, attachAtom) : null;
}

/**
 * Lists every substituent hanging from a parent chain, named under a prefix
 * style.
 *
 * @param {object} mol - A validated acyclic hydrocarbon.
 * @param {number[]} chainAtoms - The chain's atom ids.
 * @param {object} [ctx] - Naming context (a default-style one is created when omitted).
 * @returns {object[]} Entries as substituentsOf() returns them.
 */
export function collectSubstituents(mol, chainAtoms, ctx = createNamingContext(mol)) {
  return substituentsOf(ctx, chainAtoms, null);
}
