/**
 * @file Naming engine entry point: nameMolecule(mol) → result (design.md
 * §4.1). Pure: works on the graph topology only; never reads atom
 * coordinates or any browser global.
 *
 * Pipeline: validation → parent selection P1–P3 (parent.js) → substituents
 * of the remaining chains (substituent.js) → N1, N2, P4, N3, N4 and
 * tie-break (numbering.js; IUPAC 2013 compares ene/yne locants before the
 * number of substituents) → grouped prefixes in citation order → rendering
 * (render.js). Substituents other than saturated unbranched end-attached
 * chains return a `NOT_YET` error until phases 050/060 name them.
 */

import { validateForNaming } from '../model/validate.js';
import { adjacency } from '../model/graph.js';
import { selectParent } from './parent.js';
import { collectSubstituents } from './substituent.js';
import { numberParent, compareCitationKeys } from './numbering.js';
import { buildChainStructure, buildNameStructure } from './structure.js';
import { renderName, citationKey } from './render.js';
import { lexiconEs } from './lexicon.es.js';

/** Error for input the engine cannot name yet (branched, unsaturated or doubly-attached substituents). */
export const NOT_YET_ERROR = Object.freeze({
  code: 'NOT_YET',
  message: 'Todavía no sé nombrar este tipo de rama. De momento solo sé nombrar ramas sencillas como metil, etil o propil.',
});

/** Error for an unexpected engine failure (a bug); nameMolecule never throws. */
export const INTERNAL_ERROR = Object.freeze({
  code: 'INTERNAL',
  message: 'Algo ha fallado al nombrar esta molécula. Prueba a dibujarla de nuevo.',
});

/**
 * Groups the substituents of the numbered parent into prefix groups, in
 * citation (alphanumerical) order, each occurrence with its locant.
 *
 * @param {object[]} substituents - Entries from collectSubstituents(), all with a structure.
 * @param {number[]} atoms - Parent atom ids in locant order.
 * @param {object} lexicon - The lexicon (citation order depends on the prefix words).
 * @returns {object[]} The prefix groups (structure.js PrefixGroup).
 */
function groupPrefixes(substituents, atoms, lexicon) {
  const locantOf = new Map(atoms.map((atom, i) => [atom, i + 1]));
  const byKey = new Map();
  for (const sub of substituents) {
    if (!byKey.has(sub.key)) {
      byKey.set(sub.key, { key: sub.key, substituent: sub.structure, locants: [], citation: citationKey(sub.structure, lexicon) });
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
 * Builds a failure result with the NOT_YET error.
 *
 * @returns {{ok: false, error: {code: string, message: string}}} The failure.
 */
function notYet() {
  return { ok: false, error: { ...NOT_YET_ERROR } };
}

/**
 * Names a molecule. Never throws: every input gets a name or a structured
 * error; an unexpected failure (a bug) becomes the `INTERNAL` error, whose
 * `detail` (English, for developers) holds the exception message.
 *
 * @param {object} mol - The molecule to name (see model/molecule.js).
 * @param {{prefixStyle?: 'isopropil'|'pin'|'substituted'}} [options] - Prefix style (used from phase 050 on).
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
 * Validates and names a molecule (the body of nameMolecule, which may throw
 * only on an internal bug).
 *
 * @param {object} mol - The molecule to name.
 * @param {object} options - Naming options (see nameMolecule).
 * @returns {object} The naming result.
 */
function nameValidated(mol, options) {
  const error = validateForNaming(mol);
  if (error) {
    return { ok: false, error };
  }
  const lexicon = lexiconEs;
  const adj = adjacency(mol);
  const selection = selectParent(mol);
  const substituentsByChain = new Map(selection.chains.map((chain) => [chain, collectSubstituents(mol, chain, adj)]));
  /**
   * Describes the prefixes of one remaining chain for numbering.
   *
   * @param {number[]} chain - A chain from selection.chains.
   * @returns {{atom: number, key: string, citation: object|null}[]} Carrying atom, identity and citation key.
   */
  const prefixesOf = (chain) => substituentsByChain.get(chain).map((sub) => ({
    atom: sub.chainAtom,
    key: sub.key,
    citation: sub.structure ? citationKey(sub.structure, lexicon) : null,
  }));
  const numbering = numberParent(mol, selection.chains, prefixesOf);
  const substituents = substituentsByChain.get(selection.chains[numbering.chainIndex]);
  if (numbering.unsupported || substituents.some((sub) => !sub.structure)) {
    return notYet();
  }
  const parent = buildChainStructure(numbering.atoms, numbering.bonds, numbering.orders);
  const prefixes = groupPrefixes(substituents, numbering.atoms, lexicon);
  const structure = buildNameStructure({ parent, prefixes });
  const { name, parts } = renderName(structure, lexicon);
  return {
    ok: true,
    name,
    parts,
    structure,
    parent: { atoms: [...parent.atoms], bonds: [...parent.bonds] },
    trace: [...selection.trace, ...numbering.trace],
    alternatives: [],
  };
} // End of function nameValidated()
