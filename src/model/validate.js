/**
 * @file Full molecule-graph validation shared by every entry point (design.md §3.2):
 * editor transactions, JSON restoration and SMILES input.
 *
 * Two levels:
 * - validateStructure(): integrity checks that must always hold (ids unique
 *   and well-formed, supported elements only, bond endpoints exist, no
 *   self-bonds, no duplicate bonds, orders 1–3, neutral valence per element:
 *   C 4, N 3, O 2, halogens 1);
 * - validateForNaming(): the structural checks, then non-empty, connected,
 *   the ring scope (rings are classified by rings.js: a single carbocycle of
 *   at most 30 ring carbons is nameable, with or without side chains and ring
 *   multiple bonds — a benzene ring included, but only with at most one
 *   substituent (two or more: CYCLE, `ringReason` 'polysubstitutedBenzene'); a larger
 *   one gets TOO_BIG, any other ring system RING_SYSTEM with its kind), size caps (≤ 60 carbons, ≤ 80 heavy atoms),
 *   only elements the engine can name yet (carbon), and longest chain ≤ 30
 *   (for a ring: every side chain ≤ 30).
 *
 * Two kinds of failure are kept apart (design.md §13.1): an invalid structure
 * (INVALID, VALENCE — the drawing itself is wrong) and a valid molecule the
 * engine cannot name (CYCLE, RING_SYSTEM, HETEROATOM — see isNotNameableYet()).
 *
 * Errors are `{code, message}` objects with the Spanish messages of the §3.2
 * table; some carry extra data (`detail` in English for developers, `atoms`
 * for highlighting). This module never reads coordinates or the DOM.
 */

import { isConnected, hasCycle, longestChainLength, adjacency } from './graph.js';
import { classifyRings } from './rings.js';
import { isSupportedElement, valenceOf, ELEMENT_NAMES_ES } from './elements.js';

/** Maximum number of carbons in a molecule the app will name (design.md §1.1). */
export const MAX_CARBONS = 60;

/** Maximum number of heavy (non-hydrogen) atoms in a molecule the app will name (design.md §13.1). */
export const MAX_HEAVY_ATOMS = 80;

/** Maximum parent-chain length the lexicon covers (design.md §1.1). */
export const MAX_CHAIN = 30;

/** Codes of valid molecules the engine cannot name yet (as opposed to invalid structures). */
export const NOT_NAMEABLE_YET = Object.freeze(['CYCLE', 'RING_SYSTEM', 'HETEROATOM']);

/** Spanish user-facing messages by error code (design.md §3.2). */
export const MESSAGES = Object.freeze({
  EMPTY: 'Dibuja primero una molécula.',
  DISCONNECTED: 'Hay piezas sueltas: todas las partes deben estar unidas.',
  CYCLE: 'Este benceno tiene varios sustituyentes. Solo sé nombrar el benceno con un sustituyente como máximo '
    + '(como el metilbenceno): los bencenos con dos o más sustituyentes quedan fuera de lo que sé nombrar.',
  RING_SYSTEM: 'Esta molécula tiene anillos que quedan fuera de lo que sé nombrar.',
  VALENCE: 'Este carbono tendría más de 4 enlaces.',
  TOO_BIG: 'La molécula es demasiado grande (máximo 60 carbonos, cadena de 30).',
  HETEROATOM: 'Esta molécula tiene átomos que no son carbono ni hidrógeno. '
    + 'Aún no sé nombrar este tipo de compuestos: de momento solo nombro hidrocarburos.',
  INVALID: 'Los datos de la molécula están dañados. Empieza un dibujo nuevo.',
});

/**
 * RING_SYSTEM messages by ring-system kind (rings.js classifyRings()):
 * valid molecules outside the scope of the app (design.md §13.1).
 */
export const RING_SYSTEM_MESSAGES = Object.freeze({
  heterocycle: 'Este anillo tiene átomos que no son carbono: es un heterociclo. '
    + 'Los heterociclos quedan fuera de lo que sé nombrar.',
  fused: 'Has dibujado anillos fusionados (dos anillos que comparten un enlace). '
    + 'Este tipo de moléculas queda fuera de lo que sé nombrar.',
  bridged: 'Has dibujado anillos con puente (dos anillos que comparten más de dos átomos). '
    + 'Este tipo de moléculas queda fuera de lo que sé nombrar.',
  spiro: 'Has dibujado un compuesto espiro (dos anillos que comparten un solo átomo). '
    + 'Este tipo de moléculas queda fuera de lo que sé nombrar.',
  several: 'Esta molécula tiene varios anillos. De momento solo podré nombrar moléculas con un único anillo.',
});

/** TOO_BIG message for a ring larger than the parent-size cap (MAX_CHAIN). */
export const RING_TOO_BIG_MESSAGE = 'El anillo es demasiado grande (máximo 30 carbonos en el anillo).';

/** TOO_BIG message when the heavy-atom cap (not the carbon cap) is exceeded. */
export const TOO_MANY_ATOMS_MESSAGE = 'La molécula es demasiado grande (máximo 80 átomos sin contar los hidrógenos).';

/**
 * Spanish valence message for an atom of a given element, e.g. "Este oxígeno
 * tendría más de 2 enlaces." (for carbon, exactly MESSAGES.VALENCE).
 *
 * @param {string} element - A supported element symbol.
 * @returns {string} The message.
 */
export function valenceMessage(element) {
  if (!isSupportedElement(element) || element === 'C') {
    return MESSAGES.VALENCE;
  }
  const max = valenceOf(element);
  return `Este ${ELEMENT_NAMES_ES[element]} tendría más de ${max} ${max === 1 ? 'enlace' : 'enlaces'}.`;
}

/**
 * Tells whether an error means "valid molecule, but it cannot be named yet"
 * (a ring, an atom other than carbon…) rather than "invalid structure".
 *
 * @param {{code: string}|null} error - A validation error, or null.
 * @returns {boolean} True for the not-nameable-yet codes.
 */
export function isNotNameableYet(error) {
  return Boolean(error) && NOT_NAMEABLE_YET.includes(error.code);
}

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

/** Atom fields that would describe charges, radicals or explicit hydrogens: never part of the model. */
const FORBIDDEN_ATOM_FIELDS = Object.freeze([
  'charge', 'formalCharge', 'radical', 'radicals', 'unpaired', 'hCount', 'hydrogens', 'explicitH', 'isotope',
]);

/**
 * Checks the atoms map: well-formed entries, ids unique (map key = atom id)
 * and positive integers, a supported element (elements.js), and no charge,
 * radical or explicit-hydrogen field (the model has none of those).
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
    if (!isSupportedElement(atom.element)) {
      return validationError('INVALID', { detail: `atom ${key} has unsupported element ${describeValue(atom.element)}` });
    }
    const forbidden = FORBIDDEN_ATOM_FIELDS.find((field) => Object.prototype.hasOwnProperty.call(atom, field));
    if (forbidden !== undefined) {
      return validationError('INVALID', { detail: `atom ${key} has unsupported field ${forbidden}` });
    }
  } // End of the loop over the atoms
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
 * Checks that no atom has more bonds (sum of orders) than its neutral
 * valence: C 4, N 3, O 2, halogens 1. The message names the element of the
 * lowest-id offending atom ("Este oxígeno tendría más de 2 enlaces.").
 *
 * @param {Map} atoms - The atoms map (already checked).
 * @param {Map} bonds - The bonds map (already checked).
 * @returns {{code: string, message: string, atoms: number[], element: string}|null} A VALENCE error listing the offending atoms, or null.
 */
function checkValence(atoms, bonds) {
  const sums = new Map();
  for (const bond of bonds.values()) {
    sums.set(bond.a, (sums.get(bond.a) || 0) + bond.order);
    sums.set(bond.b, (sums.get(bond.b) || 0) + bond.order);
  }
  const over = [...sums]
    .filter(([id, sum]) => sum > valenceOf(atoms.get(id).element))
    .map(([id]) => id)
    .sort((p, q) => p - q);
  if (over.length === 0) {
    return null;
  }
  const element = atoms.get(over[0]).element;
  return validationError('VALENCE', { message: valenceMessage(element), atoms: over, element });
} // End of function checkValence()

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
 * Tells whether a single ring is a benzene ring: six carbons whose ring
 * bonds alternate double and single (a Kekulé structure). Only this exact
 * pattern counts; aromaticity is never inferred from other alternations
 * (cycloocta-1,3,5,7-tetraeno is named normally).
 *
 * @param {object} mol - The molecule.
 * @param {{atoms: number[], bonds: number[]}} ring - The ring in ring order (perceiveRings()).
 * @returns {boolean} True for a benzene ring.
 */
export function isBenzeneRing(mol, ring) {
  if (ring.atoms.length !== 6) {
    return false;
  }
  const orders = ring.bonds.map((id) => mol.bonds.get(id).order);
  const alternates = (first) => orders.every((order, i) => order === (i % 2 === 0 ? first : 3 - first));
  return alternates(2) || alternates(1);
}

/**
 * Spanish CYCLE message for a benzene ring with `count` (≥ 2) substituents
 * (design.md §3.2, §13.1: monosubstituted benzenes only, no orto/meta/para).
 *
 * @param {number} count - Number of substituents on the ring.
 * @returns {string} The message.
 */
export function polysubstitutedBenzeneMessage(count) {
  return MESSAGES.CYCLE.replace('varios sustituyentes', `${count} sustituyentes`);
}

/**
 * The ring atoms of a single ring that carry a side chain (a bond to an atom
 * outside the ring), ascending.
 *
 * @param {object} mol - The molecule.
 * @param {{atoms: number[]}} ring - The ring (perceiveRings()).
 * @returns {number[]} The substituted ring atoms.
 */
export function substitutedRingAtoms(mol, ring) {
  const inRing = new Set(ring.atoms);
  const adj = adjacency(mol);
  return ring.atoms.filter((id) => adj.get(id).some((n) => !inRing.has(n.atom))).sort((p, q) => p - q);
}

/**
 * The scope check for a molecule with rings. A single carbocycle of at most
 * MAX_CHAIN carbons is in scope (null), with or without side chains and ring
 * multiple bonds (design.md §13.4 I-26; its side chains are checked later
 * by validateForNaming()). A benzene ring is in scope with at most one
 * substituent (I-28, named by naming/aromatic.js); with two or more it gets
 * CYCLE with `ringReason` 'polysubstitutedBenzene' (valid, but orto/meta/para
 * and polysubstituted benzenes are out of scope, design.md §13.1). A
 * benzene ring always carries at most one substituent per ring atom (each
 * ring atom already has three bonds). Otherwise: TOO_BIG for a larger ring,
 * and RING_SYSTEM with `ringKind` for a heterocycle, fused, bridged or spiro
 * system, or several rings (out of scope, design.md §13.1) — a benzene with
 * a ring in its substituent included. `atoms` lists every ring atom, for
 * highlighting.
 *
 * @param {object} mol - A structurally valid, connected molecule with at least one ring.
 * @returns {{code: string, message: string, atoms: number[]}|null} The error, or null for a nameable single carbocycle.
 */
function ringError(mol) {
  const { kind, perception } = classifyRings(mol);
  const atoms = perception.ringAtoms;
  if (kind !== 'carbocycle') {
    return validationError('RING_SYSTEM', { message: RING_SYSTEM_MESSAGES[kind], atoms, ringKind: kind });
  }
  if (atoms.length > MAX_CHAIN) {
    return validationError('TOO_BIG', { message: RING_TOO_BIG_MESSAGE, detail: `ring of ${atoms.length} carbons`, atoms });
  }
  const [ring] = perception.rings;
  if (isBenzeneRing(mol, ring)) {
    const substituted = substitutedRingAtoms(mol, ring);
    if (substituted.length > 1) {
      return validationError('CYCLE', {
        message: polysubstitutedBenzeneMessage(substituted.length),
        atoms,
        ringKind: kind,
        ringReason: 'polysubstitutedBenzene',
        substituted,
      });
    }
  }
  return null;
} // End of function ringError()

/**
 * Longest chain of the side chains of a single-ring molecule: the largest
 * number of atoms on a path that avoids the ring atoms. Each side chain is
 * a tree hanging from one ring atom, so its longest path is found with two
 * breadth-first sweeps (farthest atom, then farthest from it).
 *
 * @param {object} mol - A connected molecule with exactly one ring (validated structure).
 * @returns {number} The longest side-chain path in atoms; 0 without side chains.
 */
export function longestSideChain(mol) {
  const adj = adjacency(mol);
  const ringAtoms = new Set(classifyRings(mol).perception.ringAtoms);
  const seen = new Set();
  /**
   * Breadth-first distances from one side-chain atom, never entering the ring.
   *
   * @param {number} from - A side-chain atom.
   * @returns {Map<number, number>} Distance (in bonds) of every atom of its side chain.
   */
  const sweep = (from) => {
    const dist = new Map([[from, 0]]);
    const queue = [from];
    for (let i = 0; i < queue.length; i += 1) {
      for (const n of adj.get(queue[i])) {
        if (!ringAtoms.has(n.atom) && !dist.has(n.atom)) {
          dist.set(n.atom, dist.get(queue[i]) + 1);
          queue.push(n.atom);
        }
      }
    }
    return dist;
  };
  /**
   * The atom farthest from the start of a sweep.
   *
   * @param {Map<number, number>} dist - Result of sweep().
   * @returns {number} The atom id.
   */
  const farthest = (dist) => [...dist].reduce((best, entry) => (entry[1] > best[1] ? entry : best))[0];
  let longest = 0;
  for (const atom of adj.keys()) {
    if (ringAtoms.has(atom) || seen.has(atom)) {
      continue;
    }
    const first = sweep(atom);
    first.forEach((_, id) => seen.add(id));
    const second = sweep(farthest(first));
    longest = Math.max(longest, Math.max(...second.values()) + 1);
  } // End of the loop over the side chains
  return longest;
} // End of function longestSideChain()

/**
 * Structural checks plus the naming checks, in order: non-empty, connected,
 * ring scope (ringError(): a single carbocycle of at most 30 carbons
 * passes; TOO_BIG or RING_SYSTEM otherwise), carbon and heavy-atom caps,
 * carbon only (HETEROATOM: valid but not nameable yet), chain cap — the
 * longest chain of a tree, or the longest side chain of a ring (design.md
 * §3.2, §13.1). A molecule passing this is a hydrocarbon of at most 60
 * carbons that is either a tree whose longest chain has at most 30, or a
 * single carbocycle of 3 to 30 carbons whose side chains have at most 30.
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
  const cyclic = hasCycle(mol);
  if (cyclic) {
    const ring = ringError(mol);
    if (ring) {
      return ring;
    }
  }
  const carbons = [...mol.atoms.values()].filter((atom) => atom.element === 'C').length;
  if (carbons > MAX_CARBONS) {
    return validationError('TOO_BIG', { detail: `${carbons} carbons` });
  }
  if (mol.atoms.size > MAX_HEAVY_ATOMS) {
    return validationError('TOO_BIG', { message: TOO_MANY_ATOMS_MESSAGE, detail: `${mol.atoms.size} heavy atoms` });
  }
  const hetero = [...mol.atoms.values()].filter((atom) => atom.element !== 'C').map((atom) => atom.id).sort((p, q) => p - q);
  if (hetero.length > 0) {
    // A valid molecule, but the engine only names hydrocarbons so far.
    return validationError('HETEROATOM', { atoms: hetero });
  }
  const chain = cyclic ? longestSideChain(mol) : longestChainLength(mol);
  if (chain > MAX_CHAIN) {
    return validationError('TOO_BIG', { detail: `${cyclic ? 'longest side chain' : 'longest chain'} has ${chain} carbons` });
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
