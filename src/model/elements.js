/**
 * @file Supported chemical elements and their neutral valences (design.md §3.1,
 * §13.1). The single source of truth for "which elements may an atom be" and
 * "how many bonds (hydrogens included) does it make".
 *
 * Only neutral, non-radical atoms in their usual organic valence exist in the
 * model: C 4, N 3, O 2, halogens 1. There are no charges, radicals, isotopes
 * or explicit hydrogen counts; the hydrogens of an atom are always
 * `valence − Σ bond orders`. This module has no imports and never touches the DOM.
 */

/** Supported element symbols, in palette order (carbon first). */
export const ELEMENTS = Object.freeze(['C', 'O', 'N', 'F', 'Cl', 'Br', 'I']);

/** Neutral valence of each supported element (sum of bond orders + hydrogens). */
export const VALENCES = Object.freeze({ C: 4, N: 3, O: 2, F: 1, Cl: 1, Br: 1, I: 1 });

/** Spanish name of each element as used in user-facing messages ("Este oxígeno…"). */
export const ELEMENT_NAMES_ES = Object.freeze({
  C: 'carbono', N: 'nitrógeno', O: 'oxígeno', F: 'flúor', Cl: 'cloro', Br: 'bromo', I: 'yodo',
});

/**
 * Tells whether a value is a supported element symbol. Case-sensitive
 * (`Cl`, never `CL` or `cl`); inherited object keys such as `toString` are
 * never accepted.
 *
 * @param {*} value - The value to test.
 * @returns {boolean} True for C, O, N, F, Cl, Br or I.
 */
export function isSupportedElement(value) {
  return typeof value === 'string' && ELEMENTS.includes(value);
}

/**
 * Neutral valence of an element.
 *
 * @param {string} element - An element symbol.
 * @returns {number} The valence; 0 for an unsupported symbol (so it never gets hydrogens).
 */
export function valenceOf(element) {
  return isSupportedElement(element) ? VALENCES[element] : 0;
}

/** Halogen element symbols (monovalent; named as prefixes fluoro-, cloro-, bromo-, yodo-). */
export const HALOGEN_ELEMENTS = Object.freeze(['F', 'Cl', 'Br', 'I']);

/**
 * Tells whether a value is a halogen symbol (F, Cl, Br or I).
 *
 * @param {*} value - The value to test.
 * @returns {boolean} True for a halogen.
 */
export function isHalogen(value) {
  return typeof value === 'string' && HALOGEN_ELEMENTS.includes(value);
}
