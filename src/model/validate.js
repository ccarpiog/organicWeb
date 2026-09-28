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
 *   only elements the engine can name yet (carbon, halogens bonded to a
 *   carbon — design.md §13.4 I-30 —, OH groups on a carbon, I-31, the
 *   C=O of aldehydes and ketones, I-32, carboxyl groups –C(=O)OH, I-33,
 *   and ether oxygens C–O–C, I-34; on a molecule with a ring, only OH
 *   groups on ring carbons and ketone C=O whose carbon is a ring atom, no
 *   acid; on a chain, at most two aldehydes and at most two acids), and
 *   longest carbon chain ≤ 30 (for a ring: every side chain ≤ 30; with
 *   ethers, the longest chain on either side of each O).
 *
 * Two kinds of failure are kept apart (design.md §13.1): an invalid structure
 * (INVALID, VALENCE — the drawing itself is wrong) and a valid molecule the
 * engine cannot name (CYCLE, RING_SYSTEM, HETEROATOM — see isNotNameableYet()).
 * Halogens bonded to a carbon are named since I-30, OH groups on a carbon
 * (alcohols, phenol) since I-31, aldehydes and ketones since I-32,
 * carboxylic acids since I-33, ethers since I-34; any other heteroatom (N,
 * an O of an ester or anhydride, a peroxide, a halogen on a heteroatom or
 * on a C=O carbon…) still
 * gets HETEROATOM, and so do an alcohol or ketone with a ring whose OH or
 * C=O is on a side chain, any aldehyde or acid with a ring, and a chain
 * with more than two aldehydes or more than two acids.
 *
 * Errors are `{code, message}` objects with the Spanish messages of the §3.2
 * table; some carry extra data (`detail` in English for developers, `atoms`
 * for highlighting). This module never reads coordinates or the DOM.
 */

import {
  isConnected, hasCycle, longestChainLength, adjacency, carbonSkeleton, connectedComponents,
} from './graph.js';
import { classifyRings } from './rings.js';
import { isSupportedElement, valenceOf, isHalogen, ELEMENT_NAMES_ES } from './elements.js';

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
    + 'Aún no sé nombrar este tipo de compuestos: de momento solo nombro hidrocarburos, '
    + 'derivados halogenados (con flúor, cloro, bromo o yodo unidos a un carbono), '
    + 'alcoholes (con grupos –OH unidos a un carbono), '
    + 'aldehídos y cetonas (con un oxígeno unido a un carbono por un enlace doble, C=O), '
    + 'ácidos carboxílicos (con el grupo –COOH) '
    + 'y éteres (con un oxígeno unido a dos carbonos, C–O–C).',
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

/**
 * HETEROATOM message for a molecule with a ring and an OH group on a side
 * chain (design.md §13.4 I-31): the chain would be the parent (it carries
 * the principal group, IUPAC 2013 P-44.1.1) and the ring a substituent
 * (`ciclohexil`, `fenil`), which the app cannot name yet (I-40).
 */
export const SIDE_CHAIN_ALCOHOL_MESSAGE = 'Esta molécula tiene un anillo y un grupo –OH en una de sus ramas. '
  + 'De momento solo sé nombrar los alcoholes con anillo cuando el –OH está unido directamente al anillo '
  + '(como el ciclohexanol o el fenol).';

/**
 * HETEROATOM message for a molecule with a ring and an aldehyde (design.md
 * §13.4 I-32): a –CHO carbon can never be a ring atom, so the group is
 * either bonded to the ring, named with the suffix `-carbaldehído`
 * (`ciclohexanocarbaldehído`), or on a side chain, which then carries the
 * principal group; both wait for I-40.
 */
export const RING_ALDEHYDE_MESSAGE = 'Esta molécula tiene un anillo y un grupo –CHO (un aldehído). '
  + 'Cuando el –CHO va unido a un anillo, el nombre acaba en «-carbaldehído» (como el ciclohexanocarbaldehído), '
  + 'y eso aún no sé nombrarlo. De momento, con anillo solo sé nombrar las cetonas cuyo C=O forma parte del anillo '
  + '(como la ciclohexanona).';

/**
 * HETEROATOM message for a molecule with a ring and a ketone C=O on a side
 * chain (design.md §13.4 I-32): the chain would carry the principal group
 * and be the parent, the ring a substituent (I-40).
 */
export const SIDE_CHAIN_CARBONYL_MESSAGE = 'Esta molécula tiene un anillo y un grupo C=O en una de sus ramas. '
  + 'De momento solo sé nombrar las cetonas con anillo cuando el carbono del C=O forma parte del anillo '
  + '(como la ciclohexanona).';

/**
 * HETEROATOM message for an open chain with more than two aldehyde groups
 * (design.md §13.4 I-32): a –CHO carbon is always a chain end, and a chain
 * has only two ends, so the parent cannot carry them all; IUPAC 2013 then
 * names the groups with the suffix `-carbaldehído` on a smaller parent
 * (`propano-1,2,3-tricarbaldehído`), not supported yet.
 */
export const MANY_ALDEHYDES_MESSAGE = 'Esta molécula tiene más de dos grupos –CHO (aldehído). '
  + 'Un –CHO siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos, '
  + 'así que no puede llevarlos todos. Estos compuestos se nombran con «-carbaldehído», y eso aún no sé hacerlo.';

/**
 * HETEROATOM message for a molecule with a ring and a carboxyl group
 * (design.md §13.4 I-33): a –COOH carbon can never be a ring atom, so the
 * group is either bonded to the ring, named with the suffix
 * `-carboxílico` (`ácido ciclohexanocarboxílico`), or on a side chain,
 * which then carries the principal group; both wait for I-40.
 */
export const RING_ACID_MESSAGE = 'Esta molécula tiene un anillo y un grupo –COOH (un ácido carboxílico). '
  + 'Cuando el –COOH va unido a un anillo, el nombre acaba en «-carboxílico» (como el ácido ciclohexanocarboxílico), '
  + 'y eso aún no sé nombrarlo. De momento solo sé nombrar los ácidos de cadena abierta (como el ácido etanoico).';

/**
 * HETEROATOM message for an open chain with more than two carboxyl groups
 * (design.md §13.4 I-33): a –COOH carbon is always a chain end and the
 * chain has only two ends, so at least one –COOH would be a branch, the
 * prefix `carboxi-`, or IUPAC 2013 names every group with the suffix
 * `-carboxílico` on a smaller parent (`ácido propano-1,2,3-tricarboxílico`);
 * neither is supported yet.
 */
export const MANY_ACIDS_MESSAGE = 'Esta molécula tiene más de dos grupos –COOH (ácido). '
  + 'Un –COOH siempre está en un extremo de la cadena y la cadena principal solo tiene dos extremos, '
  + 'así que alguno quedaría en una rama. Estos compuestos se nombran con el prefijo «carboxi-» '
  + 'o con «-carboxílico», y eso aún no sé hacerlo.';

/**
 * HETEROATOM message of the naming engine (naming/index.js) when a –COOH
 * would not be part of the parent chain (design.md §13.4 I-33): it would
 * be the prefix `carboxi-`, not supported yet. Validation already refuses
 * every molecule where this can happen (MANY_ACIDS_MESSAGE,
 * RING_ACID_MESSAGE: with at most two –COOH on an open chain both are
 * chain ends of the parent), so this is a safety net that turns a broken
 * invariant into a refusal instead of a wrong name.
 */
export const CARBOXY_SUBSTITUENT_MESSAGE = 'Esta molécula tiene un grupo –COOH en una rama. '
  + 'Se nombraría con el prefijo «carboxi-», y eso aún no sé hacerlo.';

/**
 * HETEROATOM message of the naming engine (naming/index.js) when a C=O
 * carbon ends up outside the parent chain, bonded directly to it or to a
 * branch (an acyl group such as acetilo, –CO–CH₃; design.md §13.4 I-32):
 * IUPAC 2013 names it with an acyl prefix (`acetil`, `propanoil`), not
 * supported yet. A C=O farther away inside a branch is named (`oxo-`).
 */
export const ACYL_SUBSTITUENT_MESSAGE = 'Esta molécula tiene un grupo C=O en una rama, con su carbono unido directamente '
  + 'a la cadena principal (un grupo acilo, como el acetilo, –CO–CH₃). Aún no sé nombrar estas ramas.';

/**
 * HETEROATOM message of the naming engine (naming/index.js) for an ether
 * whose two sides are identical and each carries the principal group
 * (design.md §13.4 I-34), such as HO–CH₂–CH₂–O–CH₂–CH₂–OH: IUPAC 2013
 * names it with multiplicative nomenclature (`2,2′-oxidi(etan-1-ol)`,
 * P-15.3), not supported. The substitutive name
 * `2-(2-hidroxietoxi)etan-1-ol` would not be the preferred one.
 */
export const SYMMETRIC_ETHER_MESSAGE = 'Esta molécula tiene dos mitades iguales unidas por un oxígeno (–O–), '
  + 'y cada mitad lleva el grupo principal. La IUPAC la nombra con el prefijo «oxidi-», que junta las dos mitades '
  + '(como el 2,2′-oxidietanol), y eso aún no sé hacerlo.';

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
 * number of carbons on a path that avoids the ring atoms (halogens are not
 * chain atoms, so they are left out). Each side chain is
 * a tree hanging from one ring atom, so its longest path is found with two
 * breadth-first sweeps (farthest atom, then farthest from it).
 *
 * @param {object} mol - A connected molecule with exactly one ring (validated structure).
 * @returns {number} The longest side-chain path in atoms; 0 without side chains.
 */
export function longestSideChain(mol) {
  const adj = adjacency(carbonSkeleton(mol));
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
 * Tells whether every non-carbon atom of a molecule is a halogen bonded to
 * a carbon (a halogen derivative of a hydrocarbon, design.md §13.4 I-30):
 * each such halogen is a substituent prefix (fluoro-, cloro-, bromo-,
 * yodo-). A halogen bonded to another halogen (Cl–Cl), or a lone halogen
 * (HCl), is not.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {number[]} hetero - Its non-carbon atom ids.
 * @returns {boolean} True when every one of them is a halogen on a carbon.
 */
export function isHalogenDerivative(mol, hetero) {
  const adj = adjacency(mol);
  return hetero.every((id) => {
    const links = adj.get(id);
    return isHalogen(mol.atoms.get(id).element) && links.length === 1 && mol.atoms.get(links[0].atom).element === 'C';
  });
}

/**
 * Tells whether an atom is the oxygen of an OH group on a carbon (an
 * alcohol or phenol group, design.md §13.4 I-31): an oxygen with exactly
 * one bond, a single bond, to a carbon. The OH of a carboxyl group matches
 * too: it is told apart by its carbon (isCarboxylCarbon(); the naming
 * engine's principal.js oxygenKind() classifies it as 'acid').
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the O of a C–OH.
 */
export function isHydroxyOxygen(mol, adj, id) {
  const links = adj.get(id);
  return mol.atoms.get(id).element === 'O' && links.length === 1 && links[0].order === 1
    && mol.atoms.get(links[0].atom).element === 'C';
}

/**
 * Kind of the C=O an oxygen belongs to, when it is the oxygen of an
 * aldehyde or a ketone (design.md §13.4 I-32, §13.6): an oxygen with exactly
 * one bond, a double bond, to a carbon X whose other neighbours are all
 * carbons bonded by single bonds. X with at most one carbon neighbour is an
 * aldehyde (–CHO; methanal has none), with two a ketone (–CO–). Any other
 * C=O is not: an acid or ester (another O on X), an acyl halide (a halogen
 * on X), a ketene (X=C), CO₂…
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {'aldehyde'|'ketone'|null} The kind, or null when the atom is not such an oxygen.
 */
export function carbonylKind(mol, adj, id) {
  const links = adj.get(id);
  if (mol.atoms.get(id).element !== 'O' || links.length !== 1 || links[0].order !== 2) {
    return null;
  }
  const carbon = links[0].atom;
  if (mol.atoms.get(carbon).element !== 'C') {
    return null;
  }
  const others = adj.get(carbon).filter((n) => n.atom !== id);
  if (!others.every((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'C')) {
    return null;
  }
  return others.length <= 1 ? 'aldehyde' : 'ketone';
} // End of function carbonylKind()

/**
 * Tells whether a carbon is the carbon X of a carboxyl group –C(=O)OH
 * (design.md §13.4 I-33, §13.6 table: X(=O)–OH with X bonded to at most
 * one R): exactly one oxygen double-bonded to it and one OH oxygen, both
 * bonded to nothing else, and at most one other neighbour, a carbon on a
 * single bond (none for methanoic acid). An ester (the O bonded to another
 * carbon), an acyl halide, carbonic acid (two OH), a peracid… are not.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the carbon of a –COOH.
 */
export function isCarboxylCarbon(mol, adj, id) {
  if (mol.atoms.get(id).element !== 'C') {
    return false;
  }
  const links = adj.get(id);
  const lone = (n) => mol.atoms.get(n.atom).element === 'O' && adj.get(n.atom).length === 1;
  const oxo = links.filter((n) => lone(n) && n.order === 2).length;
  const hydroxy = links.filter((n) => lone(n) && n.order === 1).length;
  const others = links.filter((n) => !lone(n));
  return oxo === 1 && hydroxy === 1 && others.length <= 1
    && others.every((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'C');
} // End of function isCarboxylCarbon()

/**
 * Role of an oxygen in a carboxyl group –C(=O)OH (design.md §13.4 I-33):
 * 'carbonyl' for the O of the C=O, 'hydroxy' for the O of the OH, null
 * when the atom is not an oxygen of a carboxyl group (isCarboxylCarbon()).
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {'carbonyl'|'hydroxy'|null} The role.
 */
export function carboxylRole(mol, adj, id) {
  const links = adj.get(id);
  if (mol.atoms.get(id).element !== 'O' || links.length !== 1 || !isCarboxylCarbon(mol, adj, links[0].atom)) {
    return null;
  }
  return links[0].order === 2 ? 'carbonyl' : 'hydroxy';
}

/**
 * The carbons of the carboxyl groups of a molecule (isCarboxylCarbon()),
 * ascending.
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The carbon ids.
 */
export function carboxylCarbons(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].filter((id) => isCarboxylCarbon(mol, adj, id)).sort((p, q) => p - q);
}

/**
 * Tells whether a carbon is a functional carbon (design.md §13.6): one with
 * a double or triple bond to a heteroatom (the X of C=O, C=N, C≡N).
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for a carbon with a multiple bond to a heteroatom.
 */
export function isFunctionalCarbon(mol, adj, id) {
  return mol.atoms.get(id).element === 'C'
    && adj.get(id).some((n) => n.order > 1 && mol.atoms.get(n.atom).element !== 'C');
}

/**
 * Tells whether an atom is the oxygen of an ether C–O–C (design.md §13.4
 * I-34, §13.6 table: R–O–R): an oxygen with exactly two bonds, both single,
 * both to carbons, neither of them a functional carbon (a C=O carbon: that
 * would be an ester, `CC(=O)OC`, or an anhydride). A peroxide (O–O), an
 * O–N or O–halogen bond is not. An oxygen inside a ring never gets here:
 * the ring would be a heterocycle, refused first (RING_SYSTEM).
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number} id - An atom id.
 * @returns {boolean} True for the O of a C–O–C ether.
 */
export function isEtherOxygen(mol, adj, id) {
  const links = adj.get(id);
  return mol.atoms.get(id).element === 'O' && links.length === 2
    && links.every((n) => n.order === 1 && mol.atoms.get(n.atom).element === 'C' && !isFunctionalCarbon(mol, adj, n.atom));
}

/**
 * The ether oxygens of a molecule (isEtherOxygen()), ascending.
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The oxygen ids.
 */
export function etherOxygens(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].filter((id) => isEtherOxygen(mol, adj, id)).sort((p, q) => p - q);
}

/**
 * Longest carbon chain of an acyclic molecule: the largest number of
 * carbons on a path of its carbon skeleton. Without ethers the skeleton is
 * one tree; each ether oxygen splits it (a carbon chain never runs through
 * an O, design.md §13.4 I-34), so the longest path of every piece counts.
 *
 * @param {object} mol - A connected acyclic molecule (validated structure).
 * @returns {number} The longest chain in carbons.
 */
export function longestCarbonChain(mol) {
  const skeleton = carbonSkeleton(mol);
  let longest = 0;
  for (const component of connectedComponents(skeleton)) {
    const ids = new Set(component);
    const piece = {
      atoms: new Map([...skeleton.atoms].filter(([id]) => ids.has(id))),
      bonds: new Map([...skeleton.bonds].filter(([, bond]) => ids.has(bond.a))),
    };
    longest = Math.max(longest, longestChainLength(piece));
  }
  return longest;
} // End of function longestCarbonChain()

/**
 * Tells whether every non-carbon atom of a molecule is one the engine can
 * name: a halogen bonded to a carbon (a prefix, I-30), the oxygen of an OH
 * on a carbon (the `-ol` suffix or the `hidroxi` prefix, I-31), the
 * oxygen of an aldehyde or ketone C=O (the `-al` / `-ona` suffix or the
 * `oxo` prefix, I-32; carbonylKind()) or an oxygen of a carboxyl group
 * (the `ácido …oico` suffix, I-33; carboxylRole()) or the oxygen of an
 * ether C–O–C (an `alcoxi-` prefix, I-34; isEtherOxygen()). Any other O,
 * and every N, is not. The OH of an ester-like or otherwise unsupported C=O carbon
 * (`OC(=O)O`, a peracid) is refused through its C=O.
 *
 * @param {object} mol - A structurally valid molecule.
 * @param {number[]} hetero - Its non-carbon atom ids.
 * @returns {boolean} True when every one of them is nameable.
 */
export function hasNameableHeteroatoms(mol, hetero) {
  const adj = adjacency(mol);
  const halogens = hetero.filter((id) => isHalogen(mol.atoms.get(id).element));
  return isHalogenDerivative(mol, halogens)
    && hetero.every((id) => isHalogen(mol.atoms.get(id).element) || isHydroxyOxygen(mol, adj, id)
      || carbonylKind(mol, adj, id) !== null || carboxylRole(mol, adj, id) !== null || isEtherOxygen(mol, adj, id));
}

/**
 * The OH oxygens of a single-ring molecule whose carbon is not a ring atom
 * (an OH on a side chain), ascending. Such a molecule is refused for now
 * (SIDE_CHAIN_ALCOHOL_MESSAGE): its parent would be the chain.
 *
 * @param {object} mol - A validated single-ring molecule whose heteroatoms are nameable.
 * @returns {number[]} The side-chain OH oxygens (empty when every OH is on the ring).
 */
export function sideChainHydroxyls(mol) {
  const ringAtoms = new Set(classifyRings(mol).perception.ringAtoms);
  const adj = adjacency(mol);
  return [...mol.atoms.values()]
    .filter((atom) => isHydroxyOxygen(mol, adj, atom.id) && !ringAtoms.has(adj.get(atom.id)[0].atom))
    .map((atom) => atom.id)
    .sort((p, q) => p - q);
}

/**
 * The C=O oxygens of a single-ring molecule whose carbon is not a ring atom,
 * ascending, with their kind (design.md §13.4 I-32): every aldehyde (a
 * –CHO carbon is never a ring atom) and every ketone on a side chain. Such
 * a molecule is refused for now (RING_ALDEHYDE_MESSAGE,
 * SIDE_CHAIN_CARBONYL_MESSAGE): only cycloalkanones, whose C=O carbon is a
 * ring atom, are named.
 *
 * @param {object} mol - A validated single-ring molecule whose heteroatoms are nameable.
 * @returns {{atom: number, kind: 'aldehyde'|'ketone'}[]} The side-chain C=O oxygens.
 */
export function sideChainCarbonyls(mol) {
  const ringAtoms = new Set(classifyRings(mol).perception.ringAtoms);
  const adj = adjacency(mol);
  return [...mol.atoms.values()]
    .filter((atom) => carbonylKind(mol, adj, atom.id) !== null && !ringAtoms.has(adj.get(atom.id)[0].atom))
    .map((atom) => ({ atom: atom.id, kind: carbonylKind(mol, adj, atom.id) }))
    .sort((p, q) => p.atom - q.atom);
}

/**
 * The aldehyde oxygens of a molecule (carbonylKind() 'aldehyde'), ascending.
 *
 * @param {object} mol - A structurally valid molecule.
 * @returns {number[]} The oxygen ids.
 */
export function aldehydeOxygens(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].filter((id) => carbonylKind(mol, adj, id) === 'aldehyde').sort((p, q) => p - q);
}

/**
 * The refusal of a nameable-heteroatom molecule whose oxygen groups the
 * engine cannot place yet (design.md §13.4 I-31, I-32, I-33), or null.
 * With a ring: a carboxyl group (`ringAcid`), an aldehyde
 * (`ringAldehyde`), a ketone C=O on a side chain (`sideChainCarbonyl`) or
 * an OH on a side chain (`sideChainAlcohol`), in that order. Without a
 * ring: more than two carboxyl groups (`manyAcids`, whose third –COOH
 * would be a `carboxi-` branch), then more than two aldehyde groups
 * (`manyAldehydes`). The error lists the heteroatoms (`atoms`) and the
 * offending groups (`acids`: the carboxyl carbons; `sideChain` or
 * `aldehydes`: oxygens).
 *
 * @param {object} mol - A validated molecule whose heteroatoms are nameable.
 * @param {boolean} cyclic - Whether it has a ring.
 * @param {number[]} hetero - Its non-carbon atom ids.
 * @returns {{code: string, message: string}|null} The HETEROATOM error, or null.
 */
function oxygenPlacementError(mol, cyclic, hetero) {
  const acids = carboxylCarbons(mol);
  if (cyclic && acids.length > 0) {
    return validationError('HETEROATOM', { message: RING_ACID_MESSAGE, atoms: hetero, reason: 'ringAcid', acids });
  }
  if (acids.length > 2) {
    return validationError('HETEROATOM', { message: MANY_ACIDS_MESSAGE, atoms: hetero, reason: 'manyAcids', acids });
  }
  if (!cyclic) {
    const aldehydes = aldehydeOxygens(mol);
    return aldehydes.length > 2
      ? validationError('HETEROATOM', { message: MANY_ALDEHYDES_MESSAGE, atoms: hetero, reason: 'manyAldehydes', aldehydes })
      : null;
  }
  const carbonyls = sideChainCarbonyls(mol);
  if (carbonyls.length > 0) {
    const aldehyde = carbonyls.some((c) => c.kind === 'aldehyde');
    return validationError('HETEROATOM', {
      message: aldehyde ? RING_ALDEHYDE_MESSAGE : SIDE_CHAIN_CARBONYL_MESSAGE,
      atoms: hetero,
      reason: aldehyde ? 'ringAldehyde' : 'sideChainCarbonyl',
      sideChain: carbonyls.map((c) => c.atom),
    });
  }
  const sideChain = sideChainHydroxyls(mol);
  if (sideChain.length > 0) {
    return validationError('HETEROATOM', {
      message: SIDE_CHAIN_ALCOHOL_MESSAGE, atoms: hetero, reason: 'sideChainAlcohol', sideChain,
    });
  }
  return null;
} // End of function oxygenPlacementError()

/**
 * Structural checks plus the naming checks, in order: non-empty, connected,
 * ring scope (ringError(): a single carbocycle of at most 30 carbons
 * passes; TOO_BIG or RING_SYSTEM otherwise), carbon and heavy-atom caps,
 * carbon, halogens on carbon, OH groups on carbon, aldehyde or ketone
 * C=O, carboxyl groups and ether C–O–C only (HETEROATOM for any other atom: valid but
 * not nameable yet; also for an OH, a ketone C=O or any aldehyde on a ring
 * molecule outside the ring, any acid with a ring, and for more than two
 * aldehydes or acids on a chain: oxygenPlacementError()), chain cap — the
 * longest carbon chain of a tree, or the longest side chain of a ring
 * (design.md §3.2, §13.1). A molecule passing this is a hydrocarbon (or a
 * halogen derivative, alcohol, aldehyde, ketone, carboxylic acid or ether of one)
 * of at most 60 carbons that is either a tree
 * whose longest carbon chain has at most 30, or a single carbocycle of 3
 * to 30 carbons whose side chains have at most 30 carbons and carry no
 * oxygen other than ether oxygens. The engine may still refuse a C=O
 * carbon that ends up bonded to the parent as a branch
 * (ACYL_SUBSTITUENT_MESSAGE, naming/index.js) and an ether whose two
 * identical halves each carry the principal group (SYMMETRIC_ETHER_MESSAGE).
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
  if (hetero.length > 0 && !hasNameableHeteroatoms(mol, hetero)) {
    // A valid molecule, but the engine only names hydrocarbons, halogen derivatives, alcohols, aldehydes, ketones, acids and ethers so far.
    return validationError('HETEROATOM', { atoms: hetero });
  }
  const placement = hetero.length > 0 ? oxygenPlacementError(mol, cyclic, hetero) : null;
  if (placement) {
    return placement;
  }
  const chain = cyclic ? longestSideChain(mol) : longestCarbonChain(mol);
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
