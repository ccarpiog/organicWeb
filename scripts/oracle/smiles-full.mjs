/**
 * @file Development-only, fuller SMILES parser for OPSIN output (design.md
 * §8). Unlike src/model/smiles.js (small acyclic subset), it reads the
 * general syntax OPSIN may emit: organic-subset and aromatic atoms, bracket
 * atoms (isotope, element, chirality, hydrogen count, charge, atom class),
 * bond symbols `- = # $ : / \`, branches, ring closures (`1`, `%12`) and
 * dots. The result is a plain graph; heavyAtomTree() then turns it into a
 * hydrogen-suppressed model molecule keeping every heavy atom and its element,
 * plus the formula counted from the SMILES itself (implicit and explicit
 * hydrogens).
 *
 * Syntax outside this grammar raises an OracleSmilesError: an adapter
 * failure, never a naming failure. Never bundled.
 */

import { createMolecule, addAtom, addBond, hillFormula } from '../../src/model/molecule.js';
import { isSupportedElement, valenceOf } from '../../src/model/elements.js';
import { isConnected } from '../../src/model/graph.js';

/** Error for SMILES syntax the adapter does not understand. */
export class OracleSmilesError extends Error {
  /**
   * Creates an adapter error.
   *
   * @param {string} message - English description.
   * @param {number} position - 0-based index in the input.
   */
  constructor(message, position) {
    super(`${message} (at position ${position})`);
    this.name = 'OracleSmilesError';
    this.position = position;
  }
}

/** Organic-subset symbols, two-letter ones first. */
const ORGANIC = ['Cl', 'Br', 'B', 'C', 'N', 'O', 'P', 'S', 'F', 'I'];

/** Aromatic organic-subset symbols. */
const AROMATIC = ['b', 'c', 'n', 'o', 'p', 's'];

/** Default valences of the organic subset, used for implicit hydrogens. */
const VALENCES = { B: [3], C: [4], N: [3, 5], O: [2], P: [3, 5], S: [2, 4, 6], F: [1], Cl: [1], Br: [1], I: [1] };

/** Bond order by bond symbol (`:` aromatic is 1.5; `/` `\` are single bonds). */
const BOND_SYMBOLS = { '-': 1, '=': 2, '#': 3, $: 4, ':': 1.5, '/': 1, '\\': 1 };

/**
 * Parses a bracket atom starting at `text[i] === '['`.
 *
 * @param {string} text - The SMILES string.
 * @param {number} i - Index of the opening bracket.
 * @returns {{atom: object, end: number}} The atom and the index of the closing bracket.
 * @throws {OracleSmilesError} On malformed bracket contents.
 */
function parseBracket(text, i) {
  const close = text.indexOf(']', i);
  if (close < 0) {
    throw new OracleSmilesError('unclosed bracket atom', i);
  }
  const body = text.slice(i + 1, close);
  const match = /^(\d+)?([A-Z][a-z]?|se|as|[bcnops*])(@@?(?:TH[12]|AL[12]|SP[1-3]|TB\d{1,2}|OH\d{1,2})?)?(H\d*)?([+-]+\d*)?(:\d+)?$/.exec(body);
  if (!match) {
    throw new OracleSmilesError(`unsupported bracket atom [${body}]`, i);
  }
  const [, , symbol, , hPart, chargePart] = match;
  const aromatic = /^[a-z]/.test(symbol);
  let charge = 0;
  if (chargePart) {
    const sign = chargePart[0] === '+' ? 1 : -1;
    const digits = chargePart.replace(/[+-]/g, '');
    charge = sign * (digits ? Number(digits) : chargePart.length);
  }
  const element = aromatic ? symbol[0].toUpperCase() + symbol.slice(1) : symbol;
  return {
    atom: { element, aromatic, bracket: true, hCount: hPart ? Number(hPart.slice(1) || 1) : 0, charge },
    end: close,
  };
} // End of function parseBracket()

/**
 * Parses a SMILES string into a general graph.
 *
 * @param {string} smiles - The SMILES string.
 * @returns {{atoms: {element: string, aromatic: boolean, bracket: boolean, hCount: number|null, charge: number}[], bonds: {a: number, b: number, order: number}[]}} Atoms (hCount null = implicit, organic subset) and bonds (atom indexes).
 * @throws {OracleSmilesError} On unsupported or malformed syntax.
 */
export function parseFullSmiles(smiles) {
  const text = String(smiles).trim();
  if (text === '') {
    throw new OracleSmilesError('empty SMILES', 0);
  }
  const atoms = [];
  const bonds = [];
  const rings = new Map(); // Ring number (numeric, so `1` ≡ `%01`) → { atom, order, position }.
  const stack = [];
  let previous = null;
  let pending = null;
  /**
   * Adds an atom and bonds it to the previous one (if any).
   *
   * @param {object} atom - The atom.
   * @returns {void}
   */
  const place = (atom) => {
    atoms.push(atom);
    const index = atoms.length - 1;
    if (previous !== null) {
      const aromaticBond = atom.aromatic && atoms[previous].aromatic;
      bonds.push({ a: previous, b: index, order: pending ?? (aromaticBond ? 1.5 : 1) });
    }
    previous = index;
    pending = null;
  };
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const organic = ORGANIC.find((s) => text.startsWith(s, i));
    if (ch === '[') {
      const { atom, end } = parseBracket(text, i);
      place(atom);
      i = end;
    } else if (organic) {
      place({ element: organic, aromatic: false, bracket: false, hCount: null, charge: 0 });
      i += organic.length - 1;
    } else if (AROMATIC.includes(ch)) {
      place({ element: ch.toUpperCase(), aromatic: true, bracket: false, hCount: null, charge: 0 });
    } else if (ch in BOND_SYMBOLS) {
      if (previous === null || pending !== null) {
        throw new OracleSmilesError(`misplaced bond symbol "${ch}"`, i);
      }
      pending = BOND_SYMBOLS[ch];
    } else if (ch === '(') {
      if (previous === null) {
        throw new OracleSmilesError('branch without a preceding atom', i);
      }
      stack.push(previous);
    } else if (ch === ')') {
      if (stack.length === 0) {
        throw new OracleSmilesError('unbalanced ")"', i);
      }
      previous = stack.pop();
      pending = null;
    } else if (ch === '.') {
      previous = null;
      pending = null;
    } else if (/[0-9%]/.test(ch)) {
      if (previous === null) {
        throw new OracleSmilesError('ring closure without an atom', i);
      }
      let number;
      if (ch === '%') {
        number = text.slice(i + 1, i + 3);
        if (!/^\d\d$/.test(number)) {
          throw new OracleSmilesError('malformed %nn ring closure', i);
        }
        i += 2;
      } else {
        number = ch;
      }
      number = Number(number); // `1` and `%01` are the same ring number (OpenSMILES).
      if (rings.has(number)) {
        const open = rings.get(number);
        rings.delete(number);
        const order = pending ?? open.order ?? (atoms[open.atom].aromatic && atoms[previous].aromatic ? 1.5 : 1);
        bonds.push({ a: open.atom, b: previous, order });
      } else {
        rings.set(number, { atom: previous, order: pending, position: i });
      }
      pending = null;
    } else {
      throw new OracleSmilesError(`unexpected character "${ch}"`, i);
    }
  } // End of the loop over the SMILES characters
  if (stack.length > 0 || rings.size > 0 || pending !== null) {
    throw new OracleSmilesError('unclosed branch, ring or dangling bond', text.length);
  }
  return { atoms, bonds };
} // End of function parseFullSmiles()

/**
 * Hydrogen count of each atom: explicit for bracket atoms; for the organic
 * subset, the lowest default valence that fits the bond-order sum, minus it
 * (IUPAC/OpenSMILES rule).
 *
 * @param {{atoms: object[], bonds: object[]}} graph - Result of parseFullSmiles().
 * @returns {number[]} Hydrogens per atom index.
 */
export function hydrogenCounts(graph) {
  const sums = graph.atoms.map(() => 0);
  for (const bond of graph.bonds) {
    sums[bond.a] += bond.order;
    sums[bond.b] += bond.order;
  }
  return graph.atoms.map((atom, i) => {
    if (atom.hCount !== null) {
      return atom.hCount;
    }
    const used = Math.ceil(sums[i] + (atom.aromatic ? 1 : 0));
    const valence = (VALENCES[atom.element] || [0]).find((v) => v >= used);
    return valence === undefined ? 0 : valence - used;
  });
} // End of function hydrogenCounts()

/**
 * Turns OPSIN's SMILES into a hydrogen-suppressed model molecule that keeps
 * every heavy atom with its element (C, O, N, F, Cl, Br, I), plus the Hill
 * formula counted from the SMILES itself (implicit and explicit hydrogens,
 * so it does not rely on the model's valence rule). Explicit hydrogen atoms
 * (`[H]`) are folded into their neighbour's count. Anything the model cannot
 * hold — an unsupported element, aromatic or charged atoms, a bond order
 * outside 1–3, several fragments, an atom whose valence is not its neutral
 * one (radical, carbene) — is reported as `problem`: the name then denotes
 * something else, a naming failure. Rings are kept (ring-closure bonds
 * become ordinary bonds); the comparison (compare.mjs) tells ring systems
 * apart structurally.
 *
 * @param {string} smiles - OPSIN's SMILES.
 * @returns {{mol: object|null, formula: string, problem: string|null}} The molecule (model/molecule.js), the Hill formula and the reason it is not a representable single molecule.
 * @throws {OracleSmilesError} On unsupported syntax (adapter failure).
 */
export function heavyAtomTree(smiles) {
  const graph = parseFullSmiles(smiles);
  const hydrogens = hydrogenCounts(graph);
  const heavy = graph.atoms.map((atom, i) => i).filter((i) => graph.atoms[i].element !== 'H');
  const counts = { H: graph.atoms.length - heavy.length };
  for (const i of heavy) {
    const { element } = graph.atoms[i];
    counts[element] = (counts[element] || 0) + 1;
    counts.H += hydrogens[i];
  }
  const formulaText = hillFormula(counts);
  const unsupported = [...new Set(heavy.map((i) => graph.atoms[i].element).filter((e) => !isSupportedElement(e)))];
  if (unsupported.length > 0) {
    return { mol: null, formula: formulaText, problem: `unsupported elements: ${unsupported.join(',')}` };
  }
  if (graph.atoms.some((atom) => atom.aromatic || atom.charge !== 0)) {
    return { mol: null, formula: formulaText, problem: 'aromatic or charged atoms' };
  }
  const mol = createMolecule();
  const ids = new Map(heavy.map((i) => [i, addAtom(mol, {}, graph.atoms[i].element)]));
  for (const bond of graph.bonds) {
    if (!ids.has(bond.a) || !ids.has(bond.b)) {
      continue; // Bond to an explicit hydrogen atom, already counted.
    }
    if (![1, 2, 3].includes(bond.order)) {
      return { mol: null, formula: formulaText, problem: `bond order ${bond.order}` };
    }
    addBond(mol, ids.get(bond.a), ids.get(bond.b), bond.order);
  }
  if (!isConnected(mol)) {
    return { mol: null, formula: formulaText, problem: 'not a single molecule (several fragments)' };
  }
  const odd = heavy.find((i) => {
    const bondSum = graph.bonds.filter((b) => b.a === i || b.b === i).reduce((s, b) => s + b.order, 0);
    return bondSum + hydrogens[i] !== valenceOf(graph.atoms[i].element);
  });
  const problem = odd === undefined ? null : `${graph.atoms[odd].element} with a valence other than its neutral one (radical, carbene or hypervalent)`;
  return { mol, formula: formulaText, problem };
} // End of function heavyAtomTree()
