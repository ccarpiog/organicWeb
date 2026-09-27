/**
 * @file Atom label text and estimated size (design.md §6.3): the condensed
 * label of an atom (`CH₃`, `OH`, `NH₂`, `Cl`, `H₂O`…) and its estimated box at
 * the 14 px label font. Pure and DOM-free: render.js draws these labels and
 * geometry.js sizes the heteroatom label hit boxes from them, so a click hits
 * exactly what is drawn.
 */

import { implicitH, neighbours, toSubscript } from '../model/molecule.js';

/**
 * Label of a lone heteroatom: its formula as written in class (`H₂O`, `NH₃`,
 * `HF`, `HCl`, `HBr`, `HI`), since `OH₂` would look odd to a student.
 */
const LONE_HETERO_LABELS = Object.freeze({ O: 'H₂O', N: 'NH₃', F: 'HF', Cl: 'HCl', Br: 'HBr', I: 'HI' });

/**
 * Condensed label of any atom: its symbol plus its implicit hydrogens
 * (`CH₃`, `CH₂`, `CH`, `C`, `CH₄`, `OH`, `O`, `NH₂`, `NH`, `N`, `Cl`…). A
 * lone heteroatom shows its formula instead (LONE_HETERO_LABELS: `H₂O`,
 * `NH₃`, `HCl`…). Never contains `=`.
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom.
 * @returns {string} The label with Unicode subscripts.
 */
export function atomLabel(mol, atomId) {
  const atom = mol.atoms.get(atomId);
  const element = atom ? atom.element : 'C';
  if (element !== 'C' && LONE_HETERO_LABELS[element] && neighbours(mol, atomId).length === 0) {
    return LONE_HETERO_LABELS[element];
  }
  const h = implicitH(mol, atomId);
  if (h === 0) {
    return element;
  }
  return h === 1 ? `${element}H` : `${element}H${toSubscript(h)}`;
} // End of function atomLabel()

/**
 * Estimated advance widths of the condensed-label characters at the 14 px
 * label font (css/app.css), in drawing units, generous so a real font never
 * draws wider. Subscript digits are narrower than capitals; the lowercase
 * letters are those of `Cl` and `Br`.
 */
const LABEL_CHAR_WIDTHS = Object.freeze({ C: 11, H: 11, O: 12, N: 11, F: 9, B: 10, I: 6, l: 5, r: 7 });

/** Estimated width of a subscript digit (and any other character) of a label. */
const LABEL_OTHER_WIDTH = 8;

/** Estimated height of a condensed label box, in drawing units. */
export const LABEL_HEIGHT = 17;

/**
 * Estimated size of a condensed label (`CH₃`, `CH₂`, `CH`, `C`, `OH`, `NH₂`…) at the
 * label font: used to space the 90° view and to stop bond strokes short of
 * the labels. Pure, so the layout can use it under Node.
 *
 * @param {string} label - The label text.
 * @returns {{width: number, height: number}} Width and height in drawing units.
 */
export function labelSize(label) {
  let width = 0;
  for (const ch of String(label)) {
    width += LABEL_CHAR_WIDTHS[ch] ?? LABEL_OTHER_WIDTH;
  }
  return { width, height: LABEL_HEIGHT };
}
