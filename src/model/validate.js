/**
 * @file Full molecule-graph validation shared by every entry point (design.md §3.2):
 * editor transactions, JSON restoration and SMILES input.
 *
 * Two levels:
 * - validateStructure(): integrity checks that must always hold (ids unique
 *   and well-formed, bond endpoints exist, no self-bonds, no duplicate bonds,
 *   orders 1–3, carbon valence ≤ 4);
 * - validateForNaming(): the structural checks, then non-empty, connected,
 *   acyclic and size caps (≤ 60 carbons, longest chain ≤ 30).
 *
 * Errors are `{code, message}` objects with the Spanish messages of the §3.2
 * table; some carry extra data (`detail` in English for developers, `atoms`
 * for highlighting). This module never reads coordinates or the DOM.
 */

import { isConnected, hasCycle, longestChainLength } from './graph.js';

/** Maximum number of carbons in a molecule the app will name (design.md §1.1). */
export const MAX_ATOMS = 60;

/** Maximum parent-chain length the lexicon covers (design.md §1.1). */
export const MAX_CHAIN = 30;

/** Spanish user-facing messages by error code (design.md §3.2). */
export const MESSAGES = Object.freeze({
  EMPTY: 'Dibuja primero una molécula.',
  DISCONNECTED: 'Hay piezas sueltas: todas las partes deben estar unidas.',
  CYCLE: 'Has dibujado un anillo. De momento solo sé nombrar cadenas abiertas.',
  VALENCE: 'Este carbono tendría más de 4 enlaces.',
  TOO_BIG: 'La molécula es demasiado grande (máximo 60 carbonos, cadena de 30).',
  INVALID: 'Los datos de la molécula están dañados. Empieza un dibujo nuevo.',
});

/**
 * Builds a validation error.
 *
 * @param {string} code - One of the MESSAGES keys.
 * @param {object} [extra] - Extra fields, e.g. `{detail}` or `{atoms}`.
 * @returns {{code: string, message: string}} The error object.
 */
export function validationError(code, extra = {}) {
  return { code, message: MESSAGES[code], ...extra };
}

/**
 * Largest atom or bond id accepted. Far above any real drawing, and far below
 * Number.MAX_SAFE_INTEGER, so incrementing id counters can never lose precision.
 */
export const MAX_ID = 1e9;

/**
 * Tells whether a value is a valid atom or bond id: an integer in 1…MAX_ID.
 *
 * @param {*} value - The value to test.
 * @returns {boolean} True for 1, 2, 3… up to MAX_ID.
 */
export function isId(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_ID;
}

/**
 * Tells whether a value is a valid id counter (the next id to hand out): an
 * integer in 1…MAX_ID + 1. A counter of MAX_ID + 1 is exhausted.
 *
 * @param {*} value - The value to test.
 * @returns {boolean} True for a usable or exhausted counter.
 */
export function isCounter(value) {
  return Number.isSafeInteger(value) && value > 0 && value <= MAX_ID + 1;
}

/**
 * Describes an untrusted value for an English diagnostic without coercing it
 * (String() on a hostile object can throw or run arbitrary code).
 *
 * @param {*} value - Any value.
 * @returns {string} A short, safe description, e.g. `42`, `"abc"`, `an object`.
 */
export function describeValue(value) {
  if (value === null) {
    return 'null';
  }
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'undefined') {
    return `${value}`;
  }
  if (typeof value === 'string') {
    return JSON.stringify(value.length > 20 ? `${value.slice(0, 20)}…` : value);
  }
  return Array.isArray(value) ? 'an array' : `a value of type ${typeof value}`;
}

/**
 * Checks the atoms map: well-formed entries, ids unique (map key = atom id)
 * and positive integers, element carbon.
 *
 * @param {Map} atoms - The atoms map.
 * @returns {{code: string, message: string}|null} An INVALID error or null.
 */
function checkAtoms(atoms) {
  for (const [key, atom] of atoms) {
    if (atom === null || typeof atom !== 'object') {
      return validationError('INVALID', { detail: `atom entry ${describeValue(key)} is not an object` });
    }
    if (!isId(atom.id) || atom.id !== key) {
      return validationError('INVALID', { detail: `atom key ${describeValue(key)} does not match a valid id` });
    }
    if (atom.element !== 'C') {
      return validationError('INVALID', { detail: `atom ${key} has unsupported element ${describeValue(atom.element)}` });
    }
  }
  return null;
} // End of function checkAtoms()

/**
 * Checks the bonds map: ids unique and valid, endpoints exist, no self-bonds,
 * no duplicate bonds between the same pair, orders 1–3.
 *
 * @param {Map} atoms - The atoms map.
 * @param {Map} bonds - The bonds map.
 * @returns {{code: string, message: string}|null} An INVALID error or null.
 */
function checkBonds(atoms, bonds) {
  const pairs = new Set();
  for (const [key, bond] of bonds) {
    if (bond === null || typeof bond !== 'object') {
      return validationError('INVALID', { detail: `bond entry ${describeValue(key)} is not an object` });
    }
    if (!isId(bond.id) || bond.id !== key) {
      return validationError('INVALID', { detail: `bond key ${describeValue(key)} does not match a valid id` });
    }
    if (!atoms.has(bond.a) || !atoms.has(bond.b)) {
      return validationError('INVALID', { detail: `bond ${key} has a missing endpoint` });
    }
    if (bond.a === bond.b) {
      return validationError('INVALID', { detail: `bond ${key} joins atom ${bond.a} to itself` });
    }
    const pair = bond.a < bond.b ? `${bond.a}-${bond.b}` : `${bond.b}-${bond.a}`;
    if (pairs.has(pair)) {
      return validationError('INVALID', { detail: `duplicate bond between atoms ${pair}` });
    }
    pairs.add(pair);
    if (bond.order !== 1 && bond.order !== 2 && bond.order !== 3) {
      return validationError('INVALID', { detail: `bond ${key} has invalid order ${describeValue(bond.order)}` });
    }
  } // End of the loop over the bonds
  return null;
} // End of function checkBonds()

/**
 * Checks the id counters: valid counters that exceed every id in use, so the
 * next addAtom()/addBond() can never hand out an occupied id.
 *
 * @param {object} mol - The molecule (maps already checked).
 * @returns {{code: string, message: string}|null} An INVALID error or null.
 */
function checkCounters(mol) {
  const maxAtom = Math.max(0, ...mol.atoms.keys());
  const maxBond = Math.max(0, ...mol.bonds.keys());
  if (!isCounter(mol.nextAtomId) || mol.nextAtomId <= maxAtom) {
    return validationError('INVALID', { detail: `atom id counter ${describeValue(mol.nextAtomId)} is invalid` });
  }
  if (!isCounter(mol.nextBondId) || mol.nextBondId <= maxBond) {
    return validationError('INVALID', { detail: `bond id counter ${describeValue(mol.nextBondId)} is invalid` });
  }
  return null;
}

/**
 * Checks that no carbon has more than 4 bonds (sum of orders).
 *
 * @param {Map} atoms - The atoms map (already checked).
 * @param {Map} bonds - The bonds map (already checked).
 * @returns {{code: string, message: string, atoms: number[]}|null} A VALENCE error listing the offending atoms, or null.
 */
function checkValence(atoms, bonds) {
  const sums = new Map();
  for (const bond of bonds.values()) {
    sums.set(bond.a, (sums.get(bond.a) || 0) + bond.order);
    sums.set(bond.b, (sums.get(bond.b) || 0) + bond.order);
  }
  const over = [...sums].filter(([, sum]) => sum > 4).map(([id]) => id).sort((p, q) => p - q);
  return over.length > 0 ? validationError('VALENCE', { atoms: over }) : null;
}

/**
 * Structural checks that must always hold (design.md §3.2). Never throws,
 * whatever the input.
 *
 * @param {object} mol - The molecule (possibly corrupt).
 * @returns {{code: string, message: string}|null} The first error found, or null when valid.
 */
export function validateStructure(mol) {
  try {
    if (mol === null || typeof mol !== 'object' || !(mol.atoms instanceof Map) || !(mol.bonds instanceof Map)) {
      return validationError('INVALID', { detail: 'not a molecule (atoms and bonds must be Maps)' });
    }
    return (
      checkAtoms(mol.atoms) ||
      checkBonds(mol.atoms, mol.bonds) ||
      checkCounters(mol) ||
      checkValence(mol.atoms, mol.bonds)
    );
  } catch (err) {
    // Hostile input (throwing getters, proxies…): report, never crash.
    return validationError('INVALID', { detail: 'unreadable molecule data' });
  }
} // End of function validateStructure()

/**
 * Structural checks plus the naming checks, in order: non-empty, connected,
 * acyclic, size caps (design.md §3.2). A molecule passing this is a tree of
 * at most 60 carbons whose longest chain has at most 30.
 *
 * @param {object} mol - The molecule (possibly corrupt).
 * @returns {{code: string, message: string}|null} The first error found, or null when the molecule can be named.
 */
export function validateForNaming(mol) {
  const structural = validateStructure(mol);
  if (structural) {
    return structural;
  }
  if (mol.atoms.size === 0) {
    return validationError('EMPTY');
  }
  if (!isConnected(mol)) {
    return validationError('DISCONNECTED');
  }
  if (hasCycle(mol)) {
    return validationError('CYCLE');
  }
  if (mol.atoms.size > MAX_ATOMS) {
    return validationError('TOO_BIG', { detail: `${mol.atoms.size} carbons` });
  }
  const chain = longestChainLength(mol);
  if (chain > MAX_CHAIN) {
    return validationError('TOO_BIG', { detail: `longest chain has ${chain} carbons` });
  }
  return null;
} // End of function validateForNaming()

/**
 * Validates a molecule graph and wraps the outcome as a result object.
 *
 * @param {object} mol - The molecule to validate.
 * @param {{forNaming?: boolean}} [options] - `forNaming` (default true) adds the naming checks.
 * @returns {{ok: true}|{ok: false, error: {code: string, message: string}}} The validation result.
 */
export function validateMolecule(mol, options = {}) {
  const forNaming = options.forNaming !== false;
  const error = forNaming ? validateForNaming(mol) : validateStructure(mol);
  return error ? { ok: false, error } : { ok: true };
}

export { validateMolecule as validate };
