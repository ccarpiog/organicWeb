/**
 * @file Ring parents of the naming engine (design.md §13.4 I-25): names a
 * cycloalkane — a single saturated carbocycle without side chains —
 * `ciclo` + stem + `ano` (`ciclopropano`, `ciclohexano`).
 *
 * The ring comes from model/rings.js perceiveRings(): its atoms in ring
 * order and its closure bond (the bond outside the breadth-first spanning
 * tree), which is the last bond of the numbered ring. An unsubstituted,
 * saturated ring needs no numbering: every start and direction gives the
 * same name, so the perceived order is kept as is (it depends only on atom
 * ids, never on coordinates).
 *
 * Validation (model/validate.js validateForNaming()) lets only
 * cycloalkanes through; substituted and unsaturated rings are refused
 * there until phase I-26, which will choose the ring numbering here (every
 * start and direction) and add prefixes to the same structure.
 *
 * Pure: reads atom ids, elements and bonds only, never coordinates or the DOM.
 */

import { perceiveRings } from '../model/rings.js';
import { buildRingStructure, buildNameStructure } from './structure.js';
import { renderName } from './render.js';
import { lexiconEs } from './lexicon.es.js';

/**
 * Finds the single ring of a molecule and numbers it (ring order from
 * perceiveRings(), closure bond last).
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
 * Names a validated cycloalkane (a single saturated carbocycle without
 * side chains). The trace holds one 'RING' step: the ring as the only
 * candidate, its size as the value.
 *
 * @param {object} mol - A molecule accepted by validateForNaming() that has a ring.
 * @param {object} [lexicon] - The lexicon (default: Spanish).
 * @returns {object} The naming result (structure.js NamingSuccess) with no alternatives.
 */
export function nameRingMolecule(mol, lexicon = lexiconEs) {
  const parent = ringParent(mol);
  const structure = buildNameStructure({ parent });
  const { name, parts } = renderName(structure, lexicon);
  const candidate = { atoms: [...parent.atoms], bonds: [...parent.bonds], key: 'ring' };
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
    }],
    alternatives: [],
  };
} // End of function nameRingMolecule()
