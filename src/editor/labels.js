/**
 * @file Atom label text and estimated size (design.md §6.3): the condensed
 * label of an atom (`CH₃`, `OH`, `NH₂`, `Cl`, `H₂O`…) and its estimated box at
 * the 14 px label font. Pure and DOM-free: render.js draws these labels and
 * geometry.js sizes the heteroatom label hit boxes from them, so a click hits
 * exactly what is drawn. Also the optional CHO/COOH abbreviations of the 90°
 * view (abbreviationGroups(), abbreviationOf()): display only, they never
 * change the molecule.
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

/**
 * Texts of the optional CHO/COOH abbreviations of the 90° view (design.md
 * §6.3), by kind: `[plain, mirrored]`. The plain text is written when the
 * group's bond comes from the left, from above or from below; the mirrored
 * one when it comes from the right, so the bond meets the C (`OHC–`, `HOOC–`).
 * Both have the same characters, so the same labelSize() box.
 */
export const ABBREVIATION_TEXTS = Object.freeze({
  CHO: Object.freeze(['CHO', 'OHC']),
  COOH: Object.freeze(['COOH', 'HOOC']),
});

/** Spanish description of each abbreviation (aria-label and tooltip of its label). */
export const ABBREVIATION_DESCRIPTIONS = Object.freeze({
  CHO: 'Grupo aldehído (–CHO): un carbono con un oxígeno unido por enlace doble y un hidrógeno',
  COOH: 'Grupo ácido (–COOH): un carbono con un oxígeno unido por enlace doble y un grupo OH',
});

/**
 * Finds the groups the 90° view may abbreviate: a terminal aldehyde group
 * (–CHO: a carbon with one =O, one H and one single bond to a carbon) and a
 * carboxylic acid group (–COOH: a carbon with one =O, one –OH and one single
 * bond to a carbon). The O atoms must be bound to that carbon only. The
 * carbon's other neighbour (the `anchor`) must be a carbon, so methanal and
 * formic acid (no other neighbour), formates, amides and anything bound
 * through O or N keep their per-atom drawing; ethanedial and oxalic acid
 * get one abbreviation on each carbon (`OHC–CHO`, `HOOC–COOH`). Pure; never
 * changes the molecule.
 *
 * @param {object} mol - The molecule.
 * @returns {Map<number, {kind: string, carbon: number, anchor: number, atoms: number[], bonds: number[]}>}
 *   Group carbon id → group: `kind` 'CHO' or 'COOH', `atoms` the carbon then its O atoms (all the atoms
 *   the label stands for), `bonds` the bonds inside the group (never drawn while abbreviated).
 */
export function abbreviationGroups(mol) {
  const groups = new Map();
  for (const atom of mol.atoms.values()) {
    if (atom.element !== 'C') {
      continue;
    }
    const links = neighbours(mol, atom.id);
    const lone = (n) => mol.atoms.get(n.atom).element === 'O' && neighbours(mol, n.atom).length === 1;
    const oxo = links.filter((n) => n.order === 2 && lone(n));
    const hydroxy = links.filter((n) => n.order === 1 && lone(n));
    const others = links.filter((n) => !lone(n));
    if (oxo.length !== 1 || hydroxy.length > 1 || others.length !== 1) {
      continue;
    }
    const anchor = others[0];
    if (anchor.order !== 1 || mol.atoms.get(anchor.atom).element !== 'C') {
      continue;
    }
    const kind = hydroxy.length === 1 ? 'COOH' : 'CHO';
    if (kind === 'CHO' && implicitH(mol, atom.id) !== 1) {
      continue;
    }
    const inside = [...oxo, ...hydroxy];
    groups.set(atom.id, {
      kind,
      carbon: atom.id,
      anchor: anchor.atom,
      atoms: [atom.id, ...inside.map((n) => n.atom)],
      bonds: inside.map((n) => n.bond),
    });
  } // End of the loop over the carbons
  return groups;
} // End of function abbreviationGroups()

/**
 * The abbreviation an atom belongs to in a drawing: the drawn molecule
 * carries its abbreviations as `mol.abbreviations` (a Map from
 * abbreviationGroups(), set only on the 90° view's display copy).
 *
 * @param {object} mol - The drawn molecule.
 * @param {number} atomId - The atom.
 * @returns {{kind: string, carbon: number, anchor: number, atoms: number[], bonds: number[]}|null} The group, or null.
 */
export function abbreviationOf(mol, atomId) {
  const groups = mol && mol.abbreviations;
  if (!groups || groups.size === 0) {
    return null;
  }
  if (groups.has(atomId)) {
    return groups.get(atomId);
  }
  for (const group of groups.values()) {
    if (group.atoms.includes(atomId)) {
      return group;
    }
  }
  return null;
} // End of function abbreviationOf()

/**
 * Tells whether an atom is drawn inside another atom's abbreviation (an O of
 * a CHO/COOH label): it gets no label, no hit circle and no bond strokes.
 *
 * @param {object} mol - The drawn molecule.
 * @param {number} atomId - The atom.
 * @returns {boolean} True for the O atoms of an abbreviated group.
 */
export function isAbbreviatedAway(mol, atomId) {
  const group = abbreviationOf(mol, atomId);
  return group !== null && group.carbon !== atomId;
}

/**
 * Label used to size an atom's box in a drawing: the abbreviation's plain
 * text for the carbon of an abbreviated group (in `groups`, default the
 * drawing's own `mol.abbreviations`), else atomLabel().
 *
 * @param {object} mol - The molecule.
 * @param {number} atomId - The atom.
 * @param {Map<number, object>|null} [groups] - Abbreviations in force (abbreviationGroups()).
 * @returns {string} The label.
 */
export function sizedLabel(mol, atomId, groups = mol.abbreviations || null) {
  const group = groups ? groups.get(atomId) : null;
  return group ? ABBREVIATION_TEXTS[group.kind][0] : atomLabel(mol, atomId);
}
