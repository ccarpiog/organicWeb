/**
 * @file Molecule graph: atoms, bonds, valence, implicit hydrogens, formula and
 * JSON serialisation (design.md §3.1).
 *
 * A molecule is a plain object `{ atoms, bonds, nextAtomId, nextBondId }`:
 * - `atoms: Map<number, Atom>` with `Atom = { id, element: 'C', x, y }`;
 * - `bonds: Map<number, Bond>` with `Bond = { id, a, b, order: 1|2|3 }`;
 * - ids are positive integers handed out by incrementing counters and never
 *   reused, so they stay stable across undo/redo and redraw.
 *
 * Coordinates (`x`, `y`) exist only for the editor and the layout; nothing in
 * this module's graph logic reads them. This module never touches the DOM.
 *
 * Mutators enforce referential integrity (endpoints exist, no self-bonds, no
 * duplicate bonds, orders 1–3) by throwing, but deliberately do NOT enforce
 * valence: the editor applies a transaction and then runs `validate()`
 * (validate.js), which reports `VALENCE` in friendly Spanish.
 */

import { validateStructure, validationError, isId, isCounter, describeValue, MAX_ID } from './validate.js';

/** Current JSON format version written by moleculeToJSON(). */
export const JSON_VERSION = 1;

/** Maximum number of bonds a carbon may have (sum of bond orders). */
export const CARBON_VALENCE = 4;

/** Unicode subscript digits, indexed by digit value. */
const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

/**
 * Creates an empty molecule graph.
 *
 * @returns {{atoms: Map<number, object>, bonds: Map<number, object>, nextAtomId: number, nextBondId: number}} A new, empty molecule.
 */
export function createMolecule() {
  return { atoms: new Map(), bonds: new Map(), nextAtomId: 1, nextBondId: 1 };
}

/**
 * Tells whether a molecule has no atoms.
 *
 * @param {object} mol - The molecule.
 * @returns {boolean} True when the molecule is empty.
 */
export function isEmpty(mol) {
  return mol.atoms.size === 0;
}

/**
 * Hands out the next id from a counter, refusing ids that are unsafe, beyond
 * MAX_ID or already in use (the counter is only advanced on success).
 *
 * @param {object} mol - The molecule (mutated: the counter advances).
 * @param {'nextAtomId'|'nextBondId'} counter - Counter property name.
 * @param {Map} used - The map whose keys are the ids in use.
 * @param {string} caller - Caller name for the error message.
 * @returns {number} The new id.
 * @throws {Error} If the counter is invalid, exhausted or points at an occupied id.
 */
function takeId(mol, counter, used, caller) {
  const id = mol[counter];
  if (!isId(id)) {
    throw new Error(`${caller}: id counter ${describeValue(id)} is invalid or exhausted (max ${MAX_ID})`);
  }
  if (used.has(id)) {
    throw new Error(`${caller}: id ${id} is already in use`);
  }
  mol[counter] = id + 1;
  return id;
}

/**
 * Adds a carbon atom.
 *
 * @param {object} mol - The molecule (mutated).
 * @param {{x?: number, y?: number}} [position] - Optional editor coordinates (default 0, 0).
 * @returns {number} The new atom id.
 * @throws {Error} If the id counter is exhausted or points at an occupied id.
 */
export function addAtom(mol, position = {}) {
  const id = takeId(mol, 'nextAtomId', mol.atoms, 'addAtom');
  const x = Number.isFinite(position.x) ? position.x : 0;
  const y = Number.isFinite(position.y) ? position.y : 0;
  mol.atoms.set(id, { id, element: 'C', x, y });
  return id;
}

/**
 * Removes an atom and every bond attached to it.
 *
 * @param {object} mol - The molecule (mutated).
 * @param {number} atomId - The atom to remove.
 * @returns {number[]} Ids of the bonds removed with the atom.
 * @throws {Error} If the atom does not exist.
 */
export function removeAtom(mol, atomId) {
  if (!mol.atoms.has(atomId)) {
    throw new Error(`removeAtom: atom ${atomId} does not exist`);
  }
  const removed = [];
  for (const bond of [...mol.bonds.values()]) {
    if (bond.a === atomId || bond.b === atomId) {
      mol.bonds.delete(bond.id);
      removed.push(bond.id);
    }
  }
  mol.atoms.delete(atomId);
  return removed;
} // End of function removeAtom()

/**
 * Tells whether a value is a valid bond order (1, 2 or 3).
 *
 * @param {*} order - The value to test.
 * @returns {boolean} True for 1, 2 or 3.
 */
export function isValidOrder(order) {
  return order === 1 || order === 2 || order === 3;
}

/**
 * Finds the bond joining two atoms, if any.
 *
 * @param {object} mol - The molecule.
 * @param {number} a - First atom id.
 * @param {number} b - Second atom id.
 * @returns {object|null} The bond, or null when the atoms are not bonded.
 */
export function bondBetween(mol, a, b) {
  for (const bond of mol.bonds.values()) {
    if ((bond.a === a && bond.b === b) || (bond.a === b && bond.b === a)) {
      return bond;
    }
  }
  return null;
}

/**
 * Adds a bond between two existing atoms.
 *
 * @param {object} mol - The molecule (mutated).
 * @param {number} a - First atom id.
 * @param {number} b - Second atom id.
 * @param {number} [order] - Bond order 1, 2 or 3 (default 1).
 * @returns {number} The new bond id.
 * @throws {Error} If an atom is missing, a == b, the order is invalid, the atoms are already bonded or the id counter is unusable.
 */
export function addBond(mol, a, b, order = 1) {
  if (!mol.atoms.has(a) || !mol.atoms.has(b)) {
    throw new Error(`addBond: atom ${mol.atoms.has(a) ? b : a} does not exist`);
  }
  if (a === b) {
    throw new Error(`addBond: cannot bond atom ${a} to itself`);
  }
  if (!isValidOrder(order)) {
    throw new Error(`addBond: invalid bond order ${order}`);
  }
  if (bondBetween(mol, a, b)) {
    throw new Error(`addBond: atoms ${a} and ${b} are already bonded`);
  }
  const id = takeId(mol, 'nextBondId', mol.bonds, 'addBond');
  mol.bonds.set(id, { id, a, b, order });
  return id;
} // End of function addBond()

/**
 * Removes a bond (its atoms stay).
 *
 * @param {object} mol - The molecule (mutated).
 * @param {number} bondId - The bond to remove.
 * @returns {void}
 * @throws {Error} If the bond does not exist.
 */
export function removeBond(mol, bondId) {
  if (!mol.bonds.delete(bondId)) {
    throw new Error(`removeBond: bond ${bondId} does not exist`);
  }
}

/**
 * Sets the order of an existing bond.
 *
 * @param {object} mol - The molecule (mutated).
 * @param {number} bondId - The bond to change.
 * @param {number} order - New order 1, 2 or 3.
 * @returns {void}
 * @throws {Error} If the bond does not exist or the order is invalid.
 */
export function setBondOrder(mol, bondId, order) {
  const bond = mol.bonds.get(bondId);
  if (!bond) {
    throw new Error(`setBondOrder: bond ${bondId} does not exist`);
  }
  if (!isValidOrder(order)) {
    throw new Error(`setBondOrder: invalid bond order ${order}`);
  }
  bond.order = order;
}

/**
 * Lists the neighbours of an atom, in bond insertion order.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom.
 * @returns {{atom: number, bond: number, order: number}[]} Neighbour atom id, joining bond id and its order.
 */
export function neighbours(mol, atomId) {
  const result = [];
  for (const bond of mol.bonds.values()) {
    if (bond.a === atomId) {
      result.push({ atom: bond.b, bond: bond.id, order: bond.order });
    } else if (bond.b === atomId) {
      result.push({ atom: bond.a, bond: bond.id, order: bond.order });
    }
  }
  return result;
}

/**
 * Sums the orders of the bonds attached to an atom.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom.
 * @returns {number} The number of bonds counted with multiplicity.
 */
export function bondOrderSum(mol, atomId) {
  return neighbours(mol, atomId).reduce((sum, n) => sum + n.order, 0);
}

/**
 * Number of implicit hydrogens on a carbon: 4 − Σ bond orders. Clamped at 0
 * so an over-bonded carbon being edited never yields a negative count (a
 * validated molecule never needs the clamp).
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom.
 * @returns {number} Implicit hydrogen count.
 */
export function implicitH(mol, atomId) {
  return Math.max(0, CARBON_VALENCE - bondOrderSum(mol, atomId));
}

/**
 * Counts the atoms of each element, hydrogens included (implicit).
 *
 * @param {object} mol - The molecule.
 * @returns {Record<string, number>} Element symbol → count; `{}` for an empty molecule.
 */
export function elementCounts(mol) {
  const counts = {};
  let hydrogens = 0;
  for (const atom of mol.atoms.values()) {
    counts[atom.element] = (counts[atom.element] || 0) + 1;
    hydrogens += implicitH(mol, atom.id);
  }
  if (mol.atoms.size > 0 && hydrogens > 0) {
    counts.H = (counts.H || 0) + hydrogens;
  }
  return counts;
} // End of function elementCounts()

/**
 * Molecular formula in Hill order with ASCII digits: C first, then H, then
 * the other elements alphabetically (alphabetical throughout when there is no
 * carbon); a count of 1 is omitted. Examples: `CH4`, `C7H16`.
 *
 * @param {object} mol - The molecule.
 * @returns {string} The formula; empty string for an empty molecule.
 */
export function formula(mol) {
  const counts = elementCounts(mol);
  const symbols = Object.keys(counts);
  let ordered;
  if (counts.C) {
    const rest = symbols.filter((s) => s !== 'C' && s !== 'H').sort();
    ordered = ['C', ...(counts.H ? ['H'] : []), ...rest];
  } else {
    ordered = symbols.sort();
  }
  return ordered.map((s) => (counts[s] === 1 ? s : `${s}${counts[s]}`)).join('');
} // End of function formula()

/**
 * Converts every ASCII digit of a string to its Unicode subscript form,
 * e.g. `C7H16` → `C₇H₁₆`.
 *
 * @param {string} text - The text to convert.
 * @returns {string} The text with subscript digits.
 */
export function toSubscript(text) {
  return String(text).replace(/[0-9]/g, (d) => SUBSCRIPT_DIGITS[Number(d)]);
}

/**
 * Molecular formula for display, with Unicode subscripts (`C₇H₁₆`).
 *
 * @param {object} mol - The molecule.
 * @returns {string} The display formula; empty string for an empty molecule.
 */
export function formulaUnicode(mol) {
  return toSubscript(formula(mol));
}

/**
 * Deep-copies a molecule (atoms, bonds and id counters).
 *
 * @param {object} mol - The molecule.
 * @returns {object} An independent copy.
 */
export function cloneMolecule(mol) {
  const copy = createMolecule();
  for (const atom of mol.atoms.values()) {
    copy.atoms.set(atom.id, { ...atom });
  }
  for (const bond of mol.bonds.values()) {
    copy.bonds.set(bond.id, { ...bond });
  }
  copy.nextAtomId = mol.nextAtomId;
  copy.nextBondId = mol.nextBondId;
  return copy;
} // End of function cloneMolecule()

/**
 * Serialises a molecule to a plain JSON-compatible object (atoms and bonds
 * sorted by id).
 *
 * @param {object} mol - The molecule.
 * @returns {{version: number, nextAtomId: number, nextBondId: number, atoms: object[], bonds: object[]}} The serialised data.
 */
export function moleculeToJSON(mol) {
  const byId = (p, q) => p.id - q.id;
  return {
    version: JSON_VERSION,
    nextAtomId: mol.nextAtomId,
    nextBondId: mol.nextBondId,
    atoms: [...mol.atoms.values()].sort(byId).map((t) => ({ id: t.id, element: t.element, x: t.x, y: t.y })),
    bonds: [...mol.bonds.values()].sort(byId).map((t) => ({ id: t.id, a: t.a, b: t.b, order: t.order })),
  };
}

/**
 * Builds the `INVALID` error returned for corrupt serialised data.
 *
 * @param {string} detail - English description of the problem (for developers and logs).
 * @returns {{ok: false, error: {code: string, message: string, detail: string}}} The failed result.
 */
function corrupt(detail) {
  return { ok: false, error: validationError('INVALID', { detail }) };
}

/**
 * Restores a molecule from `moleculeToJSON()` output (object or JSON string).
 * Never throws (a catch-all guards the whole boundary): corrupt input yields `{ok: false, error}` with code `INVALID`
 * (or `VALENCE` when the data is well-formed but chemically impossible), so a
 * damaged autosave can simply start an empty drawing. The restored graph has
 * passed validateStructure() (validate.js).
 *
 * @param {object|string} data - Serialised molecule.
 * @returns {{ok: true, mol: object}|{ok: false, error: {code: string, message: string, detail?: string}}} The result.
 */
export function moleculeFromJSON(data) {
  try {
    return restoreMolecule(data);
  } catch (err) {
    // Anything unexpected (hostile getters, proxies…) is corrupt data, never a crash.
    return corrupt('unreadable serialised data');
  }
}

/**
 * Does the actual work of moleculeFromJSON(); may throw on hostile input,
 * which moleculeFromJSON() turns into an INVALID result.
 *
 * @param {object|string} data - Serialised molecule.
 * @returns {{ok: true, mol: object}|{ok: false, error: {code: string, message: string, detail?: string}}} The result.
 */
function restoreMolecule(data) {
  let raw = data;
  if (typeof raw === 'string') {
    try {
      raw = JSON.parse(raw);
    } catch (err) {
      return corrupt(`not valid JSON: ${err.message}`);
    }
  }
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return corrupt('data is not an object');
  }
  if (raw.version !== JSON_VERSION) {
    return corrupt(`unsupported version ${describeValue(raw.version)}`);
  }
  if (!Array.isArray(raw.atoms) || !Array.isArray(raw.bonds)) {
    return corrupt('atoms and bonds must be arrays');
  }
  const mol = createMolecule();
  let maxAtom = 0;
  for (const atom of raw.atoms) {
    if (atom === null || typeof atom !== 'object' || !isId(atom.id)) {
      return corrupt('atom without a valid id');
    }
    if (mol.atoms.has(atom.id)) {
      return corrupt(`duplicate atom id ${atom.id}`);
    }
    if (!Number.isFinite(atom.x) || !Number.isFinite(atom.y)) {
      return corrupt(`atom ${atom.id} has invalid coordinates`);
    }
    mol.atoms.set(atom.id, { id: atom.id, element: atom.element, x: atom.x, y: atom.y });
    maxAtom = Math.max(maxAtom, atom.id);
  } // End of the loop that reads the serialised atoms
  let maxBond = 0;
  for (const bond of raw.bonds) {
    if (bond === null || typeof bond !== 'object' || !isId(bond.id)) {
      return corrupt('bond without a valid id');
    }
    if (mol.bonds.has(bond.id)) {
      return corrupt(`duplicate bond id ${bond.id}`);
    }
    mol.bonds.set(bond.id, { id: bond.id, a: bond.a, b: bond.b, order: bond.order });
    maxBond = Math.max(maxBond, bond.id);
  }
  for (const name of ['nextAtomId', 'nextBondId']) {
    if (raw[name] !== undefined && !isCounter(raw[name])) {
      return corrupt(`${name} ${describeValue(raw[name])} is not a valid id counter`);
    }
  }
  // Missing or lagging counters are repaired so they exceed every id in use.
  mol.nextAtomId = Math.max(raw.nextAtomId || 1, maxAtom + 1);
  mol.nextBondId = Math.max(raw.nextBondId || 1, maxBond + 1);
  const error = validateStructure(mol);
  if (error) {
    return { ok: false, error };
  }
  return { ok: true, mol };
} // End of function restoreMolecule()
