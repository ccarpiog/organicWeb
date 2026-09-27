/**
 * @file Substituents of a parent chain (design.md §4.5–4.6).
 *
 * For each chain atom, each neighbour outside the chain roots a substituent
 * subtree. The attachment atom and the attachment bond order are recorded as
 * data. Each substituent also gets a canonical identity key (equal keys are
 * grouped under one prefix: `dimetil`).
 *
 * Phase I-4 names only simple substituents: saturated, unbranched chains
 * attached by a single bond at their end (`metil`, `etil`, `propil`…). For
 * any other substituent nameSubstituent() returns null and the engine reports
 * `NOT_YET`; phase 050 adds recursive naming (branched and unsaturated
 * groups), phase 060 the doubly-attached `-iliden` groups. Pure: topology only.
 */

import { adjacency, rootedTreeKey } from '../model/graph.js';
import { buildChainStructure } from './structure.js';

/** Bond-order symbols that prefix a substituent identity key. */
const ATTACH_SYMBOL = { 1: '-', 2: '=', 3: '#' };

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
 * Builds the language-neutral structure of a substituent, or null when the
 * engine cannot name it yet. Supported in this phase: a saturated,
 * unbranched chain attached by a single bond at its end; its chain is
 * numbered from the attachment atom (free valence at locant 1).
 *
 * @param {Map<number, {atom: number, bond: number, order: number}[]>} adj - Adjacency map.
 * @param {number} chainAtom - The carrying chain atom.
 * @param {number} attachAtom - The substituent atom bonded to it.
 * @returns {object|null} The SubstituentStructure (structure.js), or null when not supported yet.
 */
export function nameSubstituent(adj, chainAtom, attachAtom) {
  const link = adj.get(chainAtom).find((n) => n.atom === attachAtom);
  if (!link || link.order !== 1) {
    return null;
  }
  const atoms = [attachAtom];
  const bonds = [];
  let previous = chainAtom;
  let current = attachAtom;
  for (;;) {
    const onward = adj.get(current).filter((n) => n.atom !== previous);
    if (onward.length === 0) {
      break;
    }
    if (onward.length > 1 || onward[0].order !== 1) {
      return null; // Branched or unsaturated: named from phase 050 on.
    }
    atoms.push(onward[0].atom);
    bonds.push(onward[0].bond);
    previous = current;
    current = onward[0].atom;
  } // End of the walk along the substituent chain
  return {
    chain: buildChainStructure(atoms, bonds, bonds.map(() => 1)),
    prefixes: [],
    freeValence: { locant: 1, order: 1 },
    retained: null,
    atoms: [...atoms],
    bonds: [...bonds].sort((p, q) => p - q),
  };
} // End of function nameSubstituent()

/**
 * Lists every substituent hanging from a chain.
 *
 * @param {object} mol - A validated acyclic hydrocarbon.
 * @param {number[]} chainAtoms - The chain's atom ids.
 * @param {Map<number, object[]>} [adj] - Adjacency map (computed when omitted).
 * @returns {{chainAtom: number, attachAtom: number, bond: number, order: number, atoms: number[], bonds: number[], key: string, structure: object|null}[]} One entry per substituent, in chain order then attachment-atom order.
 */
export function collectSubstituents(mol, chainAtoms, adj = adjacency(mol)) {
  const inChain = new Set(chainAtoms);
  const result = [];
  for (const chainAtom of chainAtoms) {
    for (const n of adj.get(chainAtom)) {
      if (inChain.has(n.atom)) {
        continue;
      }
      const subtree = substituentSubtree(adj, chainAtom, n.atom);
      result.push({
        chainAtom,
        attachAtom: n.atom,
        bond: n.bond,
        order: n.order,
        atoms: subtree.atoms,
        bonds: subtree.bonds,
        key: ATTACH_SYMBOL[n.order] + rootedTreeKey(mol, n.atom, chainAtom),
        structure: nameSubstituent(adj, chainAtom, n.atom),
      });
    } // End of the loop over the neighbours of one chain atom
  } // End of the loop over the chain atoms
  return result;
} // End of function collectSubstituents()
