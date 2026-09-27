/**
 * @file Ring parents of the naming engine (design.md §13.4 I-25, I-26):
 * names a molecule with exactly one carbocycle (3–30 ring carbons) and any
 * acyclic hydrocarbon side chains — `ciclohexano`, `ciclohexeno`,
 * `ciclohexa-1,3-dieno`, `metilciclohexano`, `3-metilciclohex-1-eno`,
 * `etenilciclohexano`, `metilidenciclohexano`.
 *
 * Ring vs chain (IUPAC 2013 P-44.1.2.2, P-52.2.8): a ring is senior to a
 * chain whatever the chain's length or unsaturation, so with one ring the
 * ring is always the parent and every side chain is a substituent prefix
 * (design.md §13.5). The old school rule "the longest chain wins over a
 * smaller ring" is not used: `decilciclopropano`, never `1-ciclopropildecano`.
 *
 * The ring comes from model/rings.js perceiveRings(): its atoms in ring
 * order and its closure bond. Side chains are named by substituent.js
 * exactly as on a chain (recursive, `-il`/`-iliden`, retained `isopropil`
 * and `tert-butil`, prefix styles).
 *
 * Numbering: every start atom and both directions are candidates (2n); each
 * candidate lists its n ring bonds in locant order, the last one joining
 * locant n back to 1 (so that bond gets locant n, the highest). They go
 * through the same cascade as chains (numbering.js runNumberingCascade()),
 * i.e. the IUPAC 2013 P-31.1.4 lowest-locant criteria in order: N1 multiple
 * bonds together (ene + yne), N2 double bonds, N3 all detachable prefixes,
 * N4 prefixes in citation order, then the presentation tie-break (smallest
 * atom-id tuple) between numberings that give the same name. A bare
 * saturated ring (a cycloalkane) needs no numbering: its perceived order is
 * kept and its trace has the RING step only.
 *
 * Pure: reads atom ids, elements and bonds only, never coordinates or the DOM.
 */

import { perceiveRings } from '../model/rings.js';
import { adjacency } from '../model/graph.js';
import { buildRingStructure, buildNameStructure } from './structure.js';
import { renderName } from './render.js';
import { candidateData, runNumberingCascade } from './numbering.js';
import { createNamingContext, collectSubstituents, groupPrefixes, PREFIX_STYLES } from './substituent.js';
import { lexiconEs } from './lexicon.es.js';

/**
 * Finds the single ring of a molecule in its perceived order (ring order
 * from perceiveRings(), closure bond last), without choosing a numbering.
 *
 * @param {object} mol - A molecule with exactly one ring.
 * @returns {object} The ring structure (structure.js RingStructure).
 * @throws {Error} When the molecule does not have exactly one ring.
 */
export function ringParent(mol) {
  const { rings } = perceiveRings(mol);
  if (rings.length !== 1) {
    throw new Error(`ringParent: expected one ring, found ${rings.length}`);
  }
  const [ring] = rings;
  const orders = ring.bonds.map((id) => mol.bonds.get(id).order);
  return buildRingStructure(ring.atoms, ring.bonds, orders);
}

/**
 * Lists the 2n numbering candidates of a ring: every start atom, walking
 * the perceived ring order ('forward') or against it ('reverse'). Each
 * candidate carries its atoms and ring bonds in locant order (bonds[k]
 * joins locants k + 1 and k + 2; the last one joins n and 1).
 *
 * @param {{atoms: number[], bonds: number[]}} ring - The ring in perceived order (bonds[i] joins atoms[i] and atoms[i + 1]).
 * @returns {{atoms: number[], bonds: number[], direction: string, key: string, chainIndex: number}[]} The candidates.
 */
export function ringCandidates(ring) {
  const n = ring.atoms.length;
  const candidates = [];
  for (let start = 0; start < n; start += 1) {
    for (const direction of ['forward', 'reverse']) {
      const step = direction === 'forward' ? 1 : -1;
      const atoms = [];
      const bonds = [];
      for (let k = 0; k < n; k += 1) {
        const i = (((start + step * k) % n) + n) % n;
        atoms.push(ring.atoms[i]);
        // Forwards the bond from position i is bonds[i]; backwards it is bonds[i - 1].
        bonds.push(direction === 'forward' ? ring.bonds[i] : ring.bonds[(i - 1 + n) % n]);
      }
      candidates.push({ atoms, bonds, direction, key: atoms.join('-'), chainIndex: 0 });
    }
  } // End of the loop over every start atom and direction
  return candidates;
} // End of function ringCandidates()

/**
 * Copies a numbering trace step, giving every candidate its ring bonds in
 * the order of its atoms (`bonds`), so the explanation can highlight each
 * compared numbering without the molecule.
 *
 * @param {object} step - A trace step from runNumberingCascade().
 * @param {Map<string, {bonds: number[]}>} data - Candidate data by key.
 * @returns {object} The step with `bonds` on every candidate.
 */
function withRingBonds(step, data) {
  const add = (candidate) => ({ ...candidate, bonds: [...data.get(candidate.key).bonds] });
  return { ...step, candidatesBefore: step.candidatesBefore.map(add), survivors: step.survivors.map(add) };
}

/**
 * Names a validated molecule with one carbocycle under one prefix style:
 * the ring is the parent (ring vs chain, see the file header), the side
 * chains are its substituents, and the ring numbering is chosen among every
 * start and direction. The trace starts with a 'RING' step (the ring as the
 * only candidate, its size as the value) followed by the numbering rules
 * that were applied (none for a bare cycloalkane).
 *
 * @param {object} mol - A molecule accepted by validateForNaming() that has a ring.
 * @param {string} [style] - Prefix style (default 'isopropil', design.md §1.1).
 * @returns {object} The naming result (structure.js NamingSuccess) without `alternatives`.
 */
export function nameRingWithStyle(mol, style = PREFIX_STYLES[0]) {
  const perceived = ringParent(mol);
  const adj = adjacency(mol);
  const ctx = createNamingContext(mol, style, lexiconEs, adj);
  const substituents = collectSubstituents(mol, perceived.atoms, ctx);
  const saturated = perceived.double.length === 0 && perceived.triple.length === 0;
  let parent = perceived;
  let numberingTrace = [];
  if (substituents.length > 0 || !saturated) {
    const prefixes = substituents.map((sub) => ({ atom: sub.chainAtom, key: sub.key, citation: sub.citation }));
    const candidates = ringCandidates(perceived);
    const data = new Map(candidates.map((c) => [
      c.key,
      candidateData(c.atoms, c.bonds, c.bonds.map((id) => mol.bonds.get(id).order), prefixes),
    ]));
    const { chosen, trace } = runNumberingCascade(candidates, data, { prefixCounts: [prefixes.length] });
    parent = buildRingStructure(chosen.atoms, data.get(chosen.key).bonds, data.get(chosen.key).orders);
    numberingTrace = trace.map((step) => withRingBonds(step, data));
  } // End of the ring numbering of a substituted or unsaturated ring
  const structure = buildNameStructure({ parent, prefixes: groupPrefixes(substituents, parent.atoms) });
  const { name, parts } = renderName(structure, lexiconEs);
  const candidate = { atoms: [...perceived.atoms], bonds: [...perceived.bonds], key: 'ring' };
  return {
    ok: true,
    name,
    parts,
    structure,
    parent: { atoms: [...parent.atoms], bonds: [...parent.bonds] },
    trace: [{
      rule: 'RING',
      candidatesBefore: [candidate],
      values: [parent.length],
      survivors: [{ ...candidate, atoms: [...candidate.atoms], bonds: [...candidate.bonds] }],
    }, ...numberingTrace],
  };
} // End of function nameRingWithStyle()

/**
 * Names a validated molecule with one carbocycle in the default prefix
 * style, without alternatives (naming/index.js nameMolecule() adds them).
 *
 * @param {object} mol - A molecule accepted by validateForNaming() that has a ring.
 * @returns {object} The naming result (structure.js NamingSuccess) with no alternatives.
 */
export function nameRingMolecule(mol) {
  return { ...nameRingWithStyle(mol, PREFIX_STYLES[0]), alternatives: [] };
}
