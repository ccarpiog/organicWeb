/**
 * @file Ring parents of the naming engine (design.md §13.4 I-25, I-26):
 * names a molecule with exactly one carbocycle (3–30 ring carbons) and any
 * acyclic hydrocarbon side chains — `ciclohexano`, `ciclohexeno`,
 * `ciclohexa-1,3-dieno`, `metilciclohexano`, `3-metilciclohex-1-eno`,
 * `etenilciclohexano`, `metilidenciclohexano`, and with OH groups on ring
 * carbons (design.md §13.4 I-31) `ciclohexanol`, `2-metilciclohexan-1-ol`,
 * `ciclohex-2-en-1-ol`: the OH carbon gets the lowest locant (N0); and with
 * a ketone C=O whose carbon is a ring atom (cycloalkanones, I-32, brought
 * forward from I-40) `ciclohexanona`, `2-metilciclohexan-1-ona`,
 * `3-hidroxiciclohexan-1-ona` (the ketone is principal, the OH a prefix).
 *
 * Ring vs chain (IUPAC 2013 P-44.1.2.2, P-52.2.8): a ring is senior to a
 * chain whatever the chain's length or unsaturation, so without a
 * principal group the ring is always the parent and every side chain is a
 * substituent prefix (design.md §13.5). The old school rule "the longest
 * chain wins over a smaller ring" is not used: `decilciclopropano`, never
 * `1-ciclopropildecano`. The principal groups come first (P-44.1.1): this
 * module names the molecule when the ring carries at least as many of them
 * as any chain (parent.js ringOrChain(); `4-(hidroximetil)ciclohexan-1-ol`
 * on a tie); a chain carrying more is the parent (naming/index.js, the ring
 * a `ciclohexil` prefix, design.md §13.4 I-40a).
 *
 * The ring comes from model/rings.js perceiveRings(): its atoms in ring
 * order and its closure bond. Side chains are named by substituent.js
 * exactly as on a chain (recursive, `-il`/`-iliden`, retained `isopropil`
 * and `tert-butil`, prefix styles).
 *
 * Numbering: every start atom and both directions are candidates (2n); each
 * candidate lists its n ring bonds in locant order, the last one joining
 * locant n back to 1 (that bond is compared as locant n, the highest, so it
 * is only chosen when the OH locants force it; it is then cited with the
 * compound locant `1(6)`, IUPAC 2013 P-31.1.4.2.4). They go
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
import { buildRingStructure, buildNameStructure, buildSuffix } from './structure.js';
import { renderName } from './render.js';
import { candidateData, runNumberingCascade, ringCandidates } from './numbering.js';
import {
  createNamingContext, collectSubstituents, groupPrefixes, suffixSites, numberingPrefix, PREFIX_STYLES,
} from './substituent.js';
import { lexiconEs } from './lexicon.es.js';
import { ringOrChain } from './parent.js';

// The ring numbering candidates live in numbering.js (a ring substituent, substituent.js, numbers its ring too).
export { ringCandidates } from './numbering.js';

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
 * Chooses the numbering of a ring among every start atom and both
 * directions (ringCandidates()) with the chain cascade
 * (numbering.js runNumberingCascade(): N0 suffix groups (the OH of `-ol`,
 * design.md §13.4 I-31), N1 multiple bonds, N2 double bonds, N3 prefixes,
 * N4 citation order, then the presentation tie-break).
 *
 * @param {object} mol - The molecule.
 * @param {object} perceived - The ring in perceived order (ringParent()).
 * @param {{chainAtom: number, key: string, citation: object}[]} substituents - Its substituents (substituentsOf() entries).
 * @param {number[]} [suffixAtoms] - The ring atom carrying each suffix group (one entry per OH), default none.
 * @returns {{parent: object, trace: object[]}} The numbered ring structure and the numbering trace steps (candidates with their ring bonds).
 */
export function numberRing(mol, perceived, substituents, suffixAtoms = []) {
  const prefixes = substituents.map(numberingPrefix);
  const candidates = ringCandidates(perceived);
  const data = new Map(candidates.map((c) => [
    c.key,
    candidateData(c.atoms, c.bonds, c.bonds.map((id) => mol.bonds.get(id).order), prefixes, null, suffixAtoms),
  ]));
  const { chosen, trace } = runNumberingCascade(candidates, data, {
    prefixCounts: [prefixes.length],
    hasSuffix: suffixAtoms.length > 0,
  });
  return {
    parent: buildRingStructure(chosen.atoms, data.get(chosen.key).bonds, data.get(chosen.key).orders),
    trace: trace.map((step) => withRingBonds(step, data)),
  };
} // End of function numberRing()

/**
 * Names a validated molecule with one carbocycle under one prefix style:
 * the ring is the parent (ring vs chain, see the file header), the side
 * chains are its substituents, and the ring numbering is chosen among every
 * start and direction. The trace starts with a 'RING' step (the ring as the
 * only candidate, its size as the value) followed by the numbering rules
 * that were applied (none for a bare cycloalkane); when a side chain carries
 * as many principal groups as the ring (ring and chain tie, design.md
 * §13.4 I-40a: the ring is senior, P-44.1.2.2) a `RINGCHAIN` step
 * (parent.js ringOrChain()) comes first. The oxygen groups of
 * the principal kind on ring carbons (OH, or the ketone C=O of a
 * cycloalkanone) are the `-ol` / `-ona` suffix (`structure.suffix`) and are
 * numbered first (N0); an OH beside a ring ketone is the `hidroxi` prefix.
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
  const sites = suffixSites(mol, adj, perceived.atoms, ctx.principal);
  const saturated = perceived.double.length === 0 && perceived.triple.length === 0;
  let parent = perceived;
  let numberingTrace = [];
  if (substituents.length > 0 || sites.length > 0 || !saturated) {
    const numbered = numberRing(mol, perceived, substituents, sites.map((site) => site.atom));
    parent = numbered.parent;
    numberingTrace = numbered.trace;
  }
  const structure = buildNameStructure({
    parent,
    prefixes: groupPrefixes(substituents, parent.atoms),
    suffix: buildSuffix(sites, parent.atoms, ctx.principal),
  });
  const { name, parts } = renderName(structure, lexiconEs);
  const candidate = { atoms: [...perceived.atoms], bonds: [...perceived.bonds], key: 'ring' };
  // A side chain carrying as many principal groups of its own as the ring (design.md §13.4 I-40a): the ring wins the
  // tie. An amine N bonded to the ring and to a chain (`N-metilciclohexanamina`, I-36) is the ring's group, no tie.
  const choice = ringOrChain(mol, perceived);
  const tie = choice && choice.offRing > 0 && choice.chainCount > 0 ? [choice.step] : [];
  return {
    ok: true,
    name,
    parts,
    structure,
    parent: { atoms: [...parent.atoms], bonds: [...parent.bonds] },
    trace: [...tie, {
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
