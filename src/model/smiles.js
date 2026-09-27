/**
 * @file Tiny acyclic SMILES parser and writer for the supported elements
 * (design.md §3.1): C, O, N, F, Cl, Br, I (model/elements.js).
 *
 * Supported subset: organic-subset atoms `C O N F Cl Br I` (implicit
 * hydrogens = the element's neutral valence − Σ bond orders), bracket atoms
 * holding one of those elements and an optional hydrogen count (`[CH4]`,
 * `[OH]`, `[NH2]`, `[Cl]`), bonds `-` (explicit single, optional), `=` and
 * `#`, and parenthesised branches. A bracket atom's hydrogen count must be
 * the one the model derives (neutral atom, usual valence): `[CH2]` as a
 * terminal carbon is a radical and is refused. Everything else is rejected
 * with an explicit SmilesError: ring-closure digits (rings are phase I-24),
 * other elements, aromatic lowercase atoms (benzene is phase I-28), charges,
 * isotopes, atom classes, explicit `[H]` atoms, dots, stereo marks, dangling
 * bonds, unbalanced or empty parentheses — input is never silently dropped.
 * The parsed graph then goes through validateStructure() (validate.js), so
 * `C(C)(C)(C)(C)C` or `CO(C)C` fail with the `VALENCE` code. SMILES is
 * developer-facing (fixtures, examples), so the error messages are in English.
 *
 * Parsed atoms get coordinates (0, 0); the layout places them later.
 */

import { createMolecule, addAtom, addBond, implicitH } from './molecule.js';
import { validateStructure } from './validate.js';
import { adjacency, connectedComponents, hasCycle } from './graph.js';
import { isSupportedElement } from './elements.js';

/** Bond order by SMILES bond symbol. */
const BOND_ORDER = { '-': 1, '=': 2, '#': 3 };

/** SMILES bond symbol by order (single bonds are written implicitly). */
const ORDER_SYMBOL = { 1: '', 2: '=', 3: '#' };

/** Supported organic-subset symbols, two-letter ones first (so `Cl` is never read as `C`). */
const ORGANIC = ['Cl', 'Br', 'C', 'N', 'O', 'F', 'I'];

/** Error thrown by parseSmiles(); `code` identifies the problem, `position` is the 0-based index. */
export class SmilesError extends Error {
  /**
   * Creates a SMILES error.
   *
   * @param {string} code - Machine-readable code, e.g. `SMILES_RING`, or a validation code such as `VALENCE`.
   * @param {string} message - English description.
   * @param {number} [position] - 0-based index in the input, when relevant.
   */
  constructor(code, message, position = -1) {
    super(position >= 0 ? `${message} (at position ${position})` : message);
    this.name = 'SmilesError';
    this.code = code;
    this.position = position;
  }
} // End of class SmilesError

/**
 * Classifies a character that is not part of the supported subset and throws
 * the matching explicit error.
 *
 * @param {string} text - The whole SMILES string.
 * @param {number} i - Index of the offending character.
 * @returns {never} Always throws.
 * @throws {SmilesError} Always.
 */
function rejectCharacter(text, i) {
  const ch = text[i];
  if (/[0-9%]/.test(ch)) {
    throw new SmilesError('SMILES_RING', `ring-closure "${ch}" is not supported (acyclic molecules only)`, i);
  }
  if (ch === ']') {
    throw new SmilesError('SMILES_BRACKET', 'unbalanced "]"', i);
  }
  if (/[bcnops]/.test(ch)) {
    throw new SmilesError('SMILES_AROMATIC', `aromatic atom "${ch}" is not supported`, i);
  }
  if (/[A-Z]/.test(ch)) {
    const symbol = /[a-z]/.test(text[i + 1] || '') && text[i + 1] !== 'c' ? ch + text[i + 1] : ch;
    throw new SmilesError('SMILES_ELEMENT', `element "${symbol}" is not supported (C, O, N, F, Cl, Br, I only)`, i);
  }
  if (ch === '.') {
    throw new SmilesError('SMILES_DOT', 'disconnected fragments (".") are not supported', i);
  }
  if (ch === '/' || ch === '\\' || ch === '@') {
    throw new SmilesError('SMILES_STEREO', 'stereochemistry marks are not supported', i);
  }
  throw new SmilesError('SMILES_CHAR', `unexpected character "${ch}"`, i);
} // End of function rejectCharacter()

/**
 * Parses a bracket atom starting at `text[start] === '['`. Only an element
 * symbol followed by an optional hydrogen count is accepted; isotopes,
 * aromatic symbols, stereo marks, charges and atom classes are refused with
 * their own error codes.
 *
 * @param {string} text - The whole SMILES string.
 * @param {number} start - Index of the opening bracket.
 * @returns {{element: string, hCount: number, end: number}} The element, the declared hydrogen count and the index of the closing bracket.
 * @throws {SmilesError} On unsupported or malformed bracket contents.
 */
function parseBracketAtom(text, start) {
  const close = text.indexOf(']', start);
  if (close < 0) {
    throw new SmilesError('SMILES_BRACKET', 'unclosed bracket atom "["', start);
  }
  let i = start + 1;
  if (/[0-9]/.test(text[i] || '')) {
    throw new SmilesError('SMILES_ISOTOPE', 'isotopes are not supported', i);
  }
  const symbolMatch = /^(?:[A-Z][a-z]?|[a-z]+|\*)/.exec(text.slice(i, close));
  if (!symbolMatch) {
    throw new SmilesError('SMILES_BRACKET', `malformed bracket atom "${text.slice(start, close + 1)}"`, start);
  }
  // `[CH4]`: the hydrogen count is uppercase H, so it is never read as part of the symbol.
  const symbol = symbolMatch[0];
  if (/^[a-z]/.test(symbol)) {
    throw new SmilesError('SMILES_AROMATIC', `aromatic atom "${symbol}" is not supported`, i);
  }
  if (symbol === 'H') {
    throw new SmilesError('SMILES_HYDROGEN', 'explicit hydrogen atoms "[H]" are not supported (write [CH4], [OH]… or implicit hydrogens)', start);
  }
  if (!isSupportedElement(symbol)) {
    throw new SmilesError('SMILES_ELEMENT', `element "${symbol}" is not supported (C, O, N, F, Cl, Br, I only)`, i);
  }
  i += symbol.length;
  if (text[i] === '@') {
    throw new SmilesError('SMILES_STEREO', 'stereochemistry marks are not supported', i);
  }
  let hCount = 0;
  const hMatch = /^H(\d*)/.exec(text.slice(i, close));
  if (hMatch) {
    hCount = hMatch[1] === '' ? 1 : Number(hMatch[1]);
    i += hMatch[0].length;
  }
  if (text[i] === '+' || text[i] === '-') {
    throw new SmilesError('SMILES_CHARGE', 'charged atoms are not supported', i);
  }
  if (i !== close) {
    throw new SmilesError('SMILES_BRACKET', `unsupported bracket atom "${text.slice(start, close + 1)}" (only element and hydrogen count)`, i);
  }
  return { element: symbol, hCount, end: close };
} // End of function parseBracketAtom()

/**
 * Checks that every bracket atom declares exactly the hydrogens the model
 * derives for it (neutral valence − Σ bond orders). A different count would
 * be a radical, a carbene or a charged atom, which the model cannot hold.
 *
 * @param {object} mol - The parsed, structurally valid molecule.
 * @param {{atom: number, hCount: number, position: number}[]} brackets - The bracket atoms.
 * @returns {void}
 * @throws {SmilesError} `SMILES_HYDROGEN` on the first mismatch.
 */
function checkBracketHydrogens(mol, brackets) {
  for (const { atom, hCount, position } of brackets) {
    const expected = implicitH(mol, atom);
    if (hCount !== expected) {
      const { element } = mol.atoms.get(atom);
      throw new SmilesError(
        'SMILES_HYDROGEN',
        `bracket atom declares ${hCount} hydrogen(s) but a neutral ${element} with these bonds has ${expected} (radicals and charges are not supported)`,
        position,
      );
    }
  }
}

/**
 * Parses an acyclic SMILES string (elements C, O, N, F, Cl, Br, I) into a
 * molecule. Atom ids follow the order of the atoms in the string (1, 2, 3…).
 *
 * @param {string} smiles - The SMILES string (surrounding whitespace is ignored).
 * @returns {object} The parsed molecule (see molecule.js), structurally valid.
 * @throws {SmilesError} On any unsupported or malformed input, or a structural validation error.
 */
export function parseSmiles(smiles) {
  if (typeof smiles !== 'string') {
    throw new SmilesError('SMILES_EMPTY', 'SMILES must be a string');
  }
  const text = smiles.trim();
  if (text === '') {
    throw new SmilesError('SMILES_EMPTY', 'empty SMILES');
  }
  const mol = createMolecule();
  let previous = null; // Atom the next atom bonds to.
  let pending = null; // Pending bond: { order, position }.
  const branches = []; // Stack of { atom, position, atomsAtOpen }.
  const brackets = []; // Bracket atoms: { atom, hCount, position }.
  /**
   * Adds an atom and bonds it to the previous one (if any).
   *
   * @param {string} element - Element symbol.
   * @returns {number} The new atom id.
   */
  const place = (element) => {
    const atom = addAtom(mol, {}, element);
    if (previous !== null) {
      addBond(mol, previous, atom, pending ? pending.order : 1);
    }
    previous = atom;
    pending = null;
    return atom;
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const organic = ORGANIC.find((symbol) => text.startsWith(symbol, i));
    if (organic) {
      place(organic);
      i += organic.length - 1;
    } else if (ch === '[') {
      const { element, hCount, end } = parseBracketAtom(text, i);
      brackets.push({ atom: place(element), hCount, position: i });
      i = end;
    } else if (ch in BOND_ORDER) {
      if (previous === null) {
        throw new SmilesError('SMILES_BOND', `bond "${ch}" has no atom before it`, i);
      }
      if (pending) {
        throw new SmilesError('SMILES_BOND', `two bond symbols in a row ("${text[pending.position]}${ch}")`, i);
      }
      pending = { order: BOND_ORDER[ch], position: i };
    } else if (ch === '(') {
      if (previous === null) {
        throw new SmilesError('SMILES_PAREN', 'a branch must follow an atom', i);
      }
      if (pending) {
        throw new SmilesError('SMILES_BOND', 'a bond symbol must be inside the branch, after "("', pending.position);
      }
      const top = branches[branches.length - 1];
      if (top && mol.atoms.size === top.atomsAtOpen) {
        throw new SmilesError('SMILES_PAREN', 'a branch must start with an atom, not "("', i);
      }
      branches.push({ atom: previous, position: i, atomsAtOpen: mol.atoms.size });
    } else if (ch === ')') {
      const open = branches.pop();
      if (!open) {
        throw new SmilesError('SMILES_PAREN', 'unbalanced ")"', i);
      }
      if (pending) {
        throw new SmilesError('SMILES_BOND', 'dangling bond: no atom after it', pending.position);
      }
      if (mol.atoms.size === open.atomsAtOpen) {
        throw new SmilesError('SMILES_PAREN', 'empty branch "()"', open.position);
      }
      previous = open.atom;
    } else {
      rejectCharacter(text, i);
    }
  } // End of the loop over the SMILES characters
  if (pending) {
    throw new SmilesError('SMILES_BOND', 'dangling bond: no atom after it', pending.position);
  }
  if (branches.length > 0) {
    throw new SmilesError('SMILES_PAREN', 'unclosed "("', branches[branches.length - 1].position);
  }
  const error = validateStructure(mol);
  if (error) {
    throw new SmilesError(error.code, `invalid structure: ${error.detail || error.code}`);
  }
  checkBracketHydrogens(mol, brackets);
  return mol;
} // End of function parseSmiles()

/**
 * Writes a SMILES string for a molecule (for debugging, examples and the
 * oracle). Each component is written from its smallest-id leaf (or lone
 * atom), with side branches in parentheses and the last neighbour continuing
 * the main chain; components are joined with ".". Every supported element is
 * written as an organic-subset symbol (`C O N F Cl Br I`): the model's
 * hydrogens are always the neutral-valence implicit ones, so no bracket atom
 * is ever needed. Coordinates are ignored.
 *
 * @param {object} mol - The molecule; must be acyclic.
 * @returns {string} The SMILES string; empty for an empty molecule.
 * @throws {Error} If the molecule contains a cycle or an unsupported element
 *   (never written silently as C).
 */
export function writeSmiles(mol) {
  if (hasCycle(mol)) {
    throw new Error('writeSmiles: cyclic molecules are not supported');
  }
  const other = [...mol.atoms.values()].find((atom) => !isSupportedElement(atom.element));
  if (other) {
    throw new Error(`writeSmiles: element ${other.element} is not supported`);
  }
  const adj = adjacency(mol);
  /**
   * Writes the subtree rooted at an atom, coming from `parent`.
   *
   * @param {number} atom - Current atom id.
   * @param {number|null} parent - Atom we came from.
   * @returns {string} SMILES of the subtree.
   */
  const write = (atom, parent) => {
    const children = adj.get(atom).filter((n) => n.atom !== parent);
    const parts = children.map((n) => ORDER_SYMBOL[n.order] + write(n.atom, atom));
    const last = parts.pop();
    return `${mol.atoms.get(atom).element}${parts.map((p) => `(${p})`).join('')}${last === undefined ? '' : last}`;
  };
  return connectedComponents(mol)
    .map((component) => {
      const start = component.find((id) => adj.get(id).length <= 1) ?? component[0];
      return write(start, null);
    })
    .join('.');
} // End of function writeSmiles()
