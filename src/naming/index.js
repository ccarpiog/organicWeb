/**
 * @file Naming engine entry point: nameMolecule(mol) → result (design.md
 * §4.1). Pure: works on the graph topology only; never reads atom
 * coordinates or any browser global.
 *
 * Pipeline: validation → parent selection P1–P3 (parent.js) → substituents
 * of the remaining chains, named recursively (substituent.js) → N1, N2, P4,
 * N3, N4, N5 and tie-break (numbering.js; IUPAC 2013 compares ene/yne
 * locants before the number of substituents) → grouped prefixes in citation
 * order → rendering (render.js).
 *
 * The prefix style (design.md §1.1) changes prefix names, hence citation
 * order and N4; each style is a full re-run of prefix naming and numbering,
 * never a text substitution. When the molecule contains an isopropyl or
 * isopropylidene group, `alternatives` holds the names in the other two
 * styles. Doubly-attached (`-iliden`) substituents are named at any depth
 * (design.md §4.6): every valid acyclic hydrocarbon within the size caps
 * gets a name. A molecule with a ring that passes validation has exactly
 * one carbocycle, which is always the parent (ring vs chain, IUPAC 2013
 * P-44.1.2.2); rings.js names it with its side chains as substituents
 * (`ciclohexano`, `metilciclohexano`, `3-metilciclohex-1-eno`, design.md
 * §13.4 I-25, I-26), under the same prefix styles and alternatives.
 */

import { validateForNaming } from '../model/validate.js';
import { adjacency, hasCycle } from '../model/graph.js';
import { selectParent } from './parent.js';
import { createNamingContext, collectSubstituents, groupPrefixes, nameKeyFunction, PREFIX_STYLES } from './substituent.js';
import { numberParent, chainBonds } from './numbering.js';
import { buildChainStructure, buildNameStructure } from './structure.js';
import { renderName } from './render.js';
import { nameRingWithStyle } from './rings.js';
import { lexiconEs } from './lexicon.es.js';

/** Error for an unexpected engine failure (a bug); nameMolecule never throws. */
export const INTERNAL_ERROR = Object.freeze({
  code: 'INTERNAL',
  message: 'Algo ha fallado al nombrar esta molécula. Prueba a dibujarla de nuevo.',
});

/**
 * Names a molecule. Never throws: every input gets a name or a structured
 * error; an unexpected failure (a bug) becomes the `INTERNAL` error, whose
 * `detail` (English, for developers) holds the exception message.
 *
 * @param {object} mol - The molecule to name (see model/molecule.js).
 * @param {{prefixStyle?: 'isopropil'|'pin'|'substituted'}} [options] - Prefix style (default 'isopropil', design.md §1.1).
 * @returns {object} The naming result (structure.js NamingResult, design.md §4.1).
 */
export function nameMolecule(mol, options = {}) {
  try {
    return nameValidated(mol, options);
  } catch (err) {
    return { ok: false, error: { ...INTERNAL_ERROR, detail: String(err && err.message) } };
  }
}

/**
 * Tells whether a name structure cites a retained prefix, at any depth.
 *
 * @param {{prefixes: object[]}} structure - A name or substituent structure.
 * @param {string[]} ids - Retained-name ids, e.g. ['isopropyl', 'isopropylidene'].
 * @returns {boolean} True when some prefix (or nested prefix) is one of those retained groups.
 */
export function hasRetainedPrefix(structure, ids) {
  return structure.prefixes.some((group) => ids.includes(group.substituent.retained) || hasRetainedPrefix(group.substituent, ids));
}

/** Retained prefixes whose presence triggers the alternative names (design.md §1.1). */
const STYLE_DEPENDENT_PREFIXES = Object.freeze(['isopropyl', 'isopropylidene']);

/**
 * Names a validated molecule under one prefix style: substituents,
 * numbering, grouping and rendering.
 *
 * @param {object} mol - A validated acyclic hydrocarbon.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {{chains: number[][], trace: object[]}} selection - Result of selectParent().
 * @param {string} style - Prefix style.
 * @returns {object} The naming result without `alternatives`.
 */
function nameWithStyle(mol, adj, selection, style) {
  const ctx = createNamingContext(mol, style, lexiconEs, adj);
  const substituentsByChain = new Map(selection.chains.map((chain) => [chain, collectSubstituents(mol, chain, ctx)]));
  /**
   * Describes the prefixes of one remaining chain for numbering.
   *
   * @param {number[]} chain - A chain from selection.chains.
   * @returns {{atom: number, key: string, citation: object|null}[]} Carrying atom, identity and citation key.
   */
  const prefixesOf = (chain) => substituentsByChain.get(chain).map((sub) => ({
    atom: sub.chainAtom,
    key: sub.key,
    citation: sub.citation,
  }));
  const nameKey = nameKeyFunction([...substituentsByChain.values()], lexiconEs);
  const numbering = numberParent(mol, selection.chains, prefixesOf, { adj, nameKey });
  const substituents = substituentsByChain.get(selection.chains[numbering.chainIndex]);
  const parent = buildChainStructure(numbering.atoms, numbering.bonds, numbering.orders);
  const structure = buildNameStructure({ parent, prefixes: groupPrefixes(substituents, numbering.atoms) });
  const { name, parts } = renderName(structure, lexiconEs);
  return {
    ok: true,
    name,
    parts,
    structure,
    parent: { atoms: [...parent.atoms], bonds: [...parent.bonds] },
    trace: withCandidateBonds([...selection.trace, ...numbering.trace], adj),
  };
} // End of function nameWithStyle()

/**
 * Adds to every trace candidate the ids of its chain bonds, in the order of
 * its atoms (`bonds`), so the explanation (src/explain/explain.js) can
 * highlight each compared chain without the molecule. Additive only: the
 * compared values and the chosen name are untouched.
 *
 * @param {object[]} trace - Trace steps (structure.js TraceStep).
 * @param {Map<number, object[]>} adj - Adjacency map of the molecule.
 * @returns {object[]} New trace steps whose candidates carry `bonds`.
 */
function withCandidateBonds(trace, adj) {
  const add = (candidate) => ({ ...candidate, bonds: chainBonds(adj, candidate.atoms).bonds });
  return trace.map((step) => ({
    ...step,
    candidatesBefore: step.candidatesBefore.map(add),
    survivors: step.survivors.map(add),
  }));
}

/**
 * Validates and names a molecule (the body of nameMolecule, which may throw
 * only on an internal bug). A molecule with one ring is named by rings.js. When the default-style name contains
 * `isopropil` or `isopropiliden`, the names in the other two styles are
 * added as `alternatives`, each from its own run of prefix naming and
 * numbering (a style may need a nested `-iliden` group that the others
 * avoid: `1-metilidenbutil` vs `pent-1-en-2-il`).
 *
 * @param {object} mol - The molecule to name.
 * @param {object} options - Naming options (see nameMolecule).
 * @returns {object} The naming result.
 * @throws {RangeError} For an unknown prefix style (reported as INTERNAL).
 */
function nameValidated(mol, options) {
  const error = validateForNaming(mol);
  if (error) {
    return { ok: false, error };
  }
  const style = options.prefixStyle || PREFIX_STYLES[0];
  if (!PREFIX_STYLES.includes(style)) {
    throw new RangeError(`unknown prefix style ${style}`);
  }
  const cyclic = hasCycle(mol);
  const adj = cyclic ? null : adjacency(mol);
  const selection = cyclic ? null : selectParent(mol);
  /**
   * Names the molecule under one prefix style: the ring parent (rings.js)
   * when validation let a ring through, else the chain pipeline.
   *
   * @param {string} s - Prefix style.
   * @returns {object} The naming result without `alternatives`.
   */
  const nameIn = (s) => (cyclic ? nameRingWithStyle(mol, s) : nameWithStyle(mol, adj, selection, s));
  const main = nameIn(style);
  const byStyle = new Map([[style, main]]);
  const named = (s) => {
    if (!byStyle.has(s)) {
      byStyle.set(s, nameIn(s));
    }
    return byStyle.get(s);
  };
  const alternatives = [];
  const reference = named(PREFIX_STYLES[0]);
  if (hasRetainedPrefix(reference.structure, STYLE_DEPENDENT_PREFIXES)) {
    for (const other of PREFIX_STYLES.filter((s) => s !== style)) {
      const result = named(other);
      alternatives.push({ style: other, label: lexiconEs.styleLabel(other), name: result.name, parts: result.parts });
    }
  } // End of the alternatives for a molecule with an isopropyl or isopropylidene group
  return { ...main, alternatives };
} // End of function nameValidated()
