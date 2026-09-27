/**
 * @file Tiny SMILES parser and writer for the supported elements
 * (design.md §3.1): C, O, N, F, Cl, Br, I (model/elements.js), with ring
 * closures (design.md §13.2).
 *
 * Supported subset: organic-subset atoms `C O N F Cl Br I` (implicit
 * hydrogens = the element's neutral valence − Σ bond orders), bracket atoms
 * holding one of those elements and an optional hydrogen count (`[CH4]`,
 * `[OH]`, `[NH2]`, `[Cl]`), bonds `-` (explicit single, optional), `=` and
 * `#`, parenthesised branches, and ring-closure labels `1`–`9` and `%nn`
 * (`C1CCCCC1`), with an optional bond symbol on either end (`C1CC=1`,
 * `C=1CC1`). A bracket atom's hydrogen count must be
 * the one the model derives (neutral atom, usual valence): `[CH2]` as a
 * terminal carbon is a radical and is refused. Everything else is rejected
 * with an explicit SmilesError: invalid ring closures (`SMILES_RING`: a label
 * never closed, a closure to the same atom `C11`, a second bond between the
 * same pair `C1C1`, different bond orders on the two ends `C=1CC#1`, `%`
 * without two digits), other elements, aromatic lowercase atoms (benzene is written in Kekulé form, `C1=CC=CC=C1`), charges,
 * isotopes, atom classes, explicit `[H]` atoms, dots, stereo marks, dangling
 * bonds, unbalanced or empty parentheses — input is never silently dropped.
 * The parsed graph then goes through validateStructure() (validate.js), so
 * `C(C)(C)(C)(C)C` or `CO(C)C` fail with the `VALENCE` code. SMILES is
 * developer-facing (fixtures, examples), so the error messages are in English.
 *
 * Parsed atoms get coordinates (0, 0); the layout places them later. Both
 * the parser and the writer are iterative (no recursion over the graph).
 */

import { createMolecule, addAtom, addBond, bondBetween, implicitH } from './molecule.js';
import { validateStructure } from './validate.js';
import { adjacency, connectedComponents } from './graph.js';
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
 * Reads a ring-closure label at `text[i]`: one digit (`1`) or `%` followed
 * by exactly two digits (`%12`). As in OpenSMILES, the label is a ring
 * number: `1` and `%01` are the same label, so `number` is the key to match.
 *
 * @param {string} text - The whole SMILES string.
 * @param {number} i - Index of the digit or `%`.
 * @returns {{label: string, number: number, end: number}} The label as written (for messages), its ring
 *   number and the index of its last character.
 * @throws {SmilesError} `SMILES_RING` when `%` is not followed by two digits.
 */
function readRingLabel(text, i) {
  if (text[i] !== '%') {
    return { label: text[i], number: Number(text[i]), end: i };
  }
  if (!/^[0-9]{2}$/.test(text.slice(i + 1, i + 3))) {
    throw new SmilesError('SMILES_RING', 'ring-closure "%" must be followed by two digits', i);
  }
  return { label: text.slice(i, i + 3), number: Number(text.slice(i + 1, i + 3)), end: i + 2 };
}

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
 * Parses a SMILES string (elements C, O, N, F, Cl, Br, I; branches and ring
 * closures) into a molecule. Atom ids follow the order of the atoms in the
 * string (1, 2, 3…); bond ids the order in which bonds are completed (a
 * ring-closure bond when its label is closed).
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
  const openRings = new Map(); // Open ring numbers (`1` ≡ `%01`) → { label, atom, order|null, position }.
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
  /**
   * Opens or closes a ring-closure label on the previous atom. A bond symbol
   * written just before the label belongs to the closure bond; if both ends
   * carry one, they must agree.
   *
   * @param {string} label - The label as written (`'1'`, `'%12'`), for messages.
   * @param {number} number - Its ring number, the key matched against open labels.
   * @param {number} position - Index of the label in the input.
   * @returns {void}
   * @throws {SmilesError} `SMILES_RING` for a closure to the same atom, a duplicate bond or conflicting orders.
   */
  const ringClosure = (label, number, position) => {
    if (previous === null) {
      throw new SmilesError('SMILES_RING', `ring-closure "${label}" has no atom before it`, position);
    }
    const top = branches[branches.length - 1];
    if (top && mol.atoms.size === top.atomsAtOpen) {
      throw new SmilesError('SMILES_PAREN', `a branch must start with an atom, not ring-closure "${label}"`, position);
    }
    const order = pending ? pending.order : null;
    pending = null;
    const open = openRings.get(number);
    if (!open) {
      openRings.set(number, { label, atom: previous, order, position });
      return;
    }
    openRings.delete(number);
    if (open.atom === previous) {
      throw new SmilesError('SMILES_RING', `ring-closure "${label}" closes on the atom that opened it`, position);
    }
    if (bondBetween(mol, open.atom, previous)) {
      throw new SmilesError('SMILES_RING', `ring-closure "${label}" duplicates an existing bond between the same two atoms`, position);
    }
    if (open.order !== null && order !== null && open.order !== order) {
      throw new SmilesError('SMILES_RING', `ring-closure "${label}" has different bond orders on its two ends`, position);
    }
    addBond(mol, open.atom, previous, open.order ?? order ?? 1);
  }; // End of function ringClosure()
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
    } else if (/[0-9%]/.test(ch)) {
      const { label, number, end } = readRingLabel(text, i);
      ringClosure(label, number, i);
      i = end;
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
  if (openRings.size > 0) {
    const open = openRings.values().next().value;
    throw new SmilesError('SMILES_RING', `ring-closure "${open.label}" is never closed`, open.position);
  }
  const error = validateStructure(mol);
  if (error) {
    throw new SmilesError(error.code, `invalid structure: ${error.detail || error.code}`);
  }
  checkBracketHydrogens(mol, brackets);
  return mol;
} // End of function parseSmiles()

/**
 * Depth-first spanning tree of one component, walked iteratively in the
 * order a recursive walk would take (neighbours in ascending id order; a
 * neighbour already reached through an earlier branch is not a child).
 * Every bond outside the tree joins an atom to one of its ancestors: a ring
 * closure.
 *
 * @param {Map<number, object[]>} adj - Adjacency from graph.js adjacency().
 * @param {number} start - First atom written.
 * @returns {{children: Map<number, object[]>, closures: {bond: number, ancestor: number, descendant: number,
 *   order: number}[]}} Children of each atom (adjacency entries, in order) and the ring-closure bonds.
 */
function depthFirstTree(adj, start) {
  const children = new Map([[start, []]]);
  const closures = [];
  const treeBond = new Map([[start, null]]); // Atom → bond to its tree parent.
  const onPath = new Set([start]); // Atoms whose walk is still open (ancestors of the current atom).
  const stack = [{ atom: start, next: 0 }];
  while (stack.length > 0) {
    const frame = stack[stack.length - 1];
    const list = adj.get(frame.atom);
    if (frame.next >= list.length) {
      onPath.delete(frame.atom);
      stack.pop();
      continue;
    }
    const n = list[frame.next];
    frame.next += 1;
    if (n.bond === treeBond.get(frame.atom)) {
      continue;
    }
    if (!children.has(n.atom)) {
      children.get(frame.atom).push(n);
      children.set(n.atom, []);
      treeBond.set(n.atom, n.bond);
      onPath.add(n.atom);
      stack.push({ atom: n.atom, next: 0 });
    } else if (onPath.has(n.atom)) {
      closures.push({ bond: n.bond, ancestor: n.atom, descendant: frame.atom, order: n.order });
    }
  } // End of the depth-first walk
  return { children, closures };
} // End of function depthFirstTree()

/**
 * Writes a SMILES string for a molecule (for debugging, examples and the
 * oracle). Each component is written from its smallest-id leaf (or, with no
 * leaf, its smallest atom id), depth first, with side branches in
 * parentheses and the last neighbour continuing the main chain; every bond
 * outside that tree becomes a ring closure, labelled with the smallest free
 * digit (`1`–`9`, then `%10`…), its bond symbol written at the opening end
 * (`C=1CCCCC1`). Components are joined with ".". Every supported element is
 * written as an organic-subset symbol (`C O N F Cl Br I`): the model's
 * hydrogens are always the neutral-valence implicit ones, so no bracket atom
 * is ever needed. Acyclic molecules are written exactly as before ring
 * support. Iterative, so a long chain cannot overflow the stack. Coordinates
 * are ignored.
 *
 * @param {object} mol - The molecule.
 * @returns {string} The SMILES string; empty for an empty molecule.
 * @throws {Error} If the molecule contains an unsupported element (never
 *   written silently as C) or needs more than 99 simultaneous ring labels.
 */
export function writeSmiles(mol) {
  const other = [...mol.atoms.values()].find((atom) => !isSupportedElement(atom.element));
  if (other) {
    throw new Error(`writeSmiles: element ${other.element} is not supported`);
  }
  const adj = adjacency(mol);
  /**
   * Writes one connected component.
   *
   * @param {number[]} component - Its atom ids (ascending).
   * @returns {string} SMILES of the component.
   */
  const writeComponent = (component) => {
    const start = component.find((id) => adj.get(id).length <= 1) ?? component[0];
    const { children, closures } = depthFirstTree(adj, start);
    const opening = new Map(); // Atom → closures it opens.
    const closing = new Map(); // Atom → closures it closes.
    for (const c of closures) {
      opening.set(c.ancestor, [...(opening.get(c.ancestor) || []), c]);
      closing.set(c.descendant, [...(closing.get(c.descendant) || []), c]);
    }
    const labels = new Map(); // Closure bond id → label in use.
    const used = new Set();
    /**
     * Takes the smallest free ring label.
     *
     * @returns {string} The label, e.g. `1` or `%10`.
     */
    const takeLabel = () => {
      for (let k = 1; k <= 99; k += 1) {
        if (!used.has(k)) {
          used.add(k);
          return k < 10 ? String(k) : `%${k}`;
        }
      }
      throw new Error('writeSmiles: more than 99 open ring closures');
    };
    let text = '';
    const work = [start]; // Atom ids to write, or literal strings.
    while (work.length > 0) {
      const item = work.pop();
      if (typeof item === 'string') {
        text += item;
        continue;
      }
      text += mol.atoms.get(item).element;
      const closed = (closing.get(item) || []).map((c) => labels.get(c.bond));
      for (const c of opening.get(item) || []) {
        const label = takeLabel();
        labels.set(c.bond, label);
        text += ORDER_SYMBOL[c.order] + label;
      }
      for (const label of closed) {
        text += label;
        used.delete(label.startsWith('%') ? Number(label.slice(1)) : Number(label));
      }
      const kids = children.get(item);
      for (let k = kids.length - 1; k >= 0; k -= 1) {
        const n = kids[k];
        if (k === kids.length - 1) {
          work.push(n.atom, ORDER_SYMBOL[n.order]);
        } else {
          work.push(')', n.atom, ORDER_SYMBOL[n.order], '(');
        }
      }
    } // End of the loop writing the atoms
    return text;
  }; // End of function writeComponent()
  return connectedComponents(mol).map(writeComponent).join('.');
} // End of function writeSmiles()
