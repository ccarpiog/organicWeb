/**
 * @file Tiny acyclic carbon-only SMILES parser and writer (design.md §3.1).
 *
 * Supported subset: aliphatic `C` atoms, bonds `-` (explicit single, optional),
 * `=` and `#`, and parenthesised branches. Everything else is rejected with an
 * explicit SmilesError (ring-closure digits, other elements, aromatic atoms,
 * bracket atoms, dots, stereo marks, dangling bonds, unbalanced or empty
 * parentheses) — input is never silently dropped. The parsed graph then goes
 * through validateStructure() (validate.js), so `C(C)(C)(C)(C)C` fails with
 * the `VALENCE` code. SMILES is developer-facing (fixtures, examples), so the
 * error messages are in English.
 *
 * Parsed atoms get coordinates (0, 0); the layout places them later.
 */

import { createMolecule, addAtom, addBond } from './molecule.js';
import { validateStructure } from './validate.js';
import { adjacency, connectedComponents, hasCycle } from './graph.js';

/** Bond order by SMILES bond symbol. */
const BOND_ORDER = { '-': 1, '=': 2, '#': 3 };

/** SMILES bond symbol by order (single bonds are written implicitly). */
const ORDER_SYMBOL = { 1: '', 2: '=', 3: '#' };

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
  if (ch === '[' || ch === ']') {
    throw new SmilesError('SMILES_BRACKET', 'bracket atoms are not supported', i);
  }
  if (/[bcnops]/.test(ch)) {
    throw new SmilesError('SMILES_AROMATIC', `aromatic atom "${ch}" is not supported`, i);
  }
  if (/[A-Z]/.test(ch)) {
    const symbol = /[a-z]/.test(text[i + 1] || '') && text[i + 1] !== 'c' ? ch + text[i + 1] : ch;
    throw new SmilesError('SMILES_ELEMENT', `element "${symbol}" is not supported (carbon only)`, i);
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
 * Parses a carbon-only acyclic SMILES string into a molecule. Atom ids follow
 * the order of the atoms in the string (1, 2, 3…).
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
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === 'C' && text[i + 1] !== 'l') {
      const atom = addAtom(mol);
      if (previous !== null) {
        addBond(mol, previous, atom, pending ? pending.order : 1);
      }
      previous = atom;
      pending = null;
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
  return mol;
} // End of function parseSmiles()

/**
 * Writes a SMILES string for a molecule (for debugging and examples). Each
 * component is written from its smallest-id leaf (or lone atom), with side
 * branches in parentheses and the last neighbour continuing the main chain;
 * components are joined with ".". Coordinates are ignored.
 *
 * @param {object} mol - The molecule; must be acyclic.
 * @returns {string} The SMILES string; empty for an empty molecule.
 * @throws {Error} If the molecule contains a cycle.
 */
export function writeSmiles(mol) {
  if (hasCycle(mol)) {
    throw new Error('writeSmiles: cyclic molecules are not supported');
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
    return `C${parts.map((p) => `(${p})`).join('')}${last === undefined ? '' : last}`;
  };
  return connectedComponents(mol)
    .map((component) => {
      const start = component.find((id) => adj.get(id).length <= 1) ?? component[0];
      return write(start, null);
    })
    .join('.');
} // End of function writeSmiles()
