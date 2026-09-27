/**
 * @file Naming engine entry point: nameMolecule(mol) → result (design.md
 * §4.1). Pure: works on the graph topology only; never reads atom
 * coordinates or any browser global.
 *
 * Phase I-3 names unbranched molecules (alkanes, alkenes, alkynes, polyenes,
 * en-ynes, cumulated). Branched input returns a temporary `NOT_YET` error,
 * removed in phase 040 when parent selection (parent.js) arrives.
 */

import { validateForNaming } from '../model/validate.js';
import { adjacency, leaves } from '../model/graph.js';
import { numberParent } from './numbering.js';
import { buildChainStructure, buildNameStructure } from './structure.js';
import { renderName } from './render.js';
import { lexiconEs } from './lexicon.es.js';

/** Temporary error for input the engine cannot name yet (removed in phase 040). */
export const NOT_YET_ERROR = Object.freeze({
  code: 'NOT_YET',
  message: 'Todavía no sé nombrar cadenas con ramificaciones. Prueba con una cadena sin ramas.',
});

/**
 * Returns the atoms of an unbranched molecule from one end to the other,
 * or null when some atom has more than two neighbours.
 *
 * @param {object} mol - A validated tree molecule.
 * @returns {number[]|null} The chain (starting at the smaller end id), or null if branched.
 */
function unbranchedChain(mol) {
  const adj = adjacency(mol);
  for (const list of adj.values()) {
    if (list.length > 2) {
      return null;
    }
  }
  const ends = leaves(mol);
  let current = ends.length > 0 ? ends[0] : adj.keys().next().value;
  const chain = [current];
  let previous = null;
  while (chain.length < adj.size) {
    const next = adj.get(current).find((n) => n.atom !== previous).atom;
    previous = current;
    current = next;
    chain.push(current);
  }
  return chain;
} // End of function unbranchedChain()

/**
 * Names a molecule.
 *
 * @param {object} mol - The molecule to name (see model/molecule.js).
 * @param {{prefixStyle?: 'isopropil'|'pin'|'substituted'}} [options] - Prefix style (used from phase 050 on).
 * @returns {object} The naming result (structure.js NamingResult, design.md §4.1).
 */
export function nameMolecule(mol, options = {}) {
  const error = validateForNaming(mol);
  if (error) {
    return { ok: false, error };
  }
  const chain = unbranchedChain(mol);
  if (!chain) {
    return { ok: false, error: { ...NOT_YET_ERROR } };
  }
  const p1 = { atoms: [...chain], key: chain.join('-') };
  const trace = [{ rule: 'P1', candidatesBefore: [p1], values: [chain.length], survivors: [{ ...p1, atoms: [...chain] }] }];
  const numbering = numberParent(mol, [chain]);
  trace.push(...numbering.trace);
  const parent = buildChainStructure(numbering.atoms, numbering.bonds, numbering.orders);
  const structure = buildNameStructure({ parent, prefixes: [] });
  const { name, parts } = renderName(structure, lexiconEs);
  return {
    ok: true,
    name,
    parts,
    structure,
    parent: { atoms: [...parent.atoms], bonds: [...parent.bonds] },
    trace,
    alternatives: [],
  };
} // End of function nameMolecule()
