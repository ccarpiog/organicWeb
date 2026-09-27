/**
 * @file Seeded random generator of valid acyclic hydrocarbons for the OPSIN
 * oracle and the graph-invariance tests (design.md §8). Development only,
 * never bundled. Deterministic: the same seed always yields the same
 * molecules, in the same order.
 */

import { createMolecule, addAtom, addBond, bondOrderSum, CARBON_VALENCE } from '../../src/model/molecule.js';
import { canonicalTreeKey } from '../../src/model/graph.js';
import { validateForNaming } from '../../src/model/validate.js';

/**
 * Creates a seeded pseudo-random generator (mulberry32).
 *
 * @param {number} seed - Integer seed.
 * @returns {function(): number} A function returning numbers in [0, 1).
 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a random integer in [min, max].
 *
 * @param {function(): number} random - Seeded generator.
 * @param {number} min - Lower bound (inclusive).
 * @param {number} max - Upper bound (inclusive).
 * @returns {number} The integer.
 */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/**
 * Shuffles an array in place (Fisher–Yates) with a seeded generator.
 *
 * @template T
 * @param {T[]} items - The array (mutated).
 * @param {function(): number} random - Seeded generator.
 * @returns {T[]} The same array.
 */
export function shuffle(items, random) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

/**
 * Builds one random valid acyclic hydrocarbon: a random tree of `size`
 * carbons (each new carbon bonded to a random carbon with a free valence),
 * then random bonds raised to double or triple bonds where both carbons have
 * room. Branchy trees are favoured by `branchiness` (probability of
 * attaching to any atom rather than the last one added).
 *
 * @param {function(): number} random - Seeded generator.
 * @param {{size: number, unsaturation?: number, branchiness?: number}} options - Carbon count, probability of trying to raise a bond, and branching probability.
 * @returns {object} The molecule (model/molecule.js), valid for naming.
 */
export function randomHydrocarbon(random, { size, unsaturation = 0.25, branchiness = 0.5 }) {
  const mol = createMolecule();
  const atoms = [addAtom(mol)];
  for (let i = 1; i < size; i += 1) {
    const free = atoms.filter((id) => bondOrderSum(mol, id) < CARBON_VALENCE);
    const last = atoms[atoms.length - 1];
    const target = random() >= branchiness && free.includes(last) ? last : free[Math.floor(random() * free.length)];
    const atom = addAtom(mol);
    addBond(mol, target, atom, 1);
    atoms.push(atom);
  } // End of the loop that grows the random tree
  for (const bond of shuffle([...mol.bonds.values()], random)) {
    if (random() >= unsaturation) {
      continue;
    }
    const room = Math.min(CARBON_VALENCE - bondOrderSum(mol, bond.a), CARBON_VALENCE - bondOrderSum(mol, bond.b));
    if (room > 0) {
      bond.order += randomInt(random, 1, Math.min(room, 2));
    }
  } // End of the loop that raises random bonds to double or triple bonds
  return mol;
} // End of function randomHydrocarbon()

/**
 * Generates `count` distinct random acyclic hydrocarbons (distinct by
 * canonical tree key) with sizes in [minSize, maxSize], from a seed,
 * all valid for naming (molecules beyond the size caps are redrawn).
 * Stops early, with fewer molecules, if too many duplicates are drawn.
 *
 * @param {{count: number, seed: number, minSize?: number, maxSize?: number}} options - How many, the seed and the size range (default 4–14 C, design.md §8).
 * @returns {object[]} The molecules.
 */
export function generateMolecules({ count, seed, minSize = 4, maxSize = 14 }) {
  const random = seededRandom(seed);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50) {
    attempts += 1;
    const mol = randomHydrocarbon(random, {
      size: randomInt(random, minSize, maxSize),
      unsaturation: random() * 0.5,
      branchiness: 0.2 + random() * 0.8,
    });
    if (validateForNaming(mol)) {
      continue; // Beyond the size caps (chain > 30 C): not a valid input.
    }
    const key = canonicalTreeKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct molecules
  return molecules;
} // End of function generateMolecules()

/**
 * Copies a molecule with renumbered atom ids and shuffled atom and bond
 * insertion order (and randomly swapped bond ends), for graph-invariance
 * checks: the copy is the same graph, so its name must not change.
 *
 * @param {object} mol - The molecule.
 * @param {function(): number} random - Seeded generator.
 * @returns {object} The scrambled copy.
 */
export function scrambleMolecule(mol, random) {
  const copy = createMolecule();
  const oldIds = shuffle([...mol.atoms.keys()], random);
  copy.nextAtomId = randomInt(random, 1, 1000);
  copy.nextBondId = randomInt(random, 1, 1000);
  const idMap = new Map();
  for (const old of oldIds) {
    copy.nextAtomId += randomInt(random, 0, 7);
    idMap.set(old, addAtom(copy));
  }
  for (const bond of shuffle([...mol.bonds.values()], random)) {
    const ends = random() < 0.5 ? [bond.a, bond.b] : [bond.b, bond.a];
    copy.nextBondId += randomInt(random, 0, 7);
    addBond(copy, idMap.get(ends[0]), idMap.get(ends[1]), bond.order);
  }
  return copy;
} // End of function scrambleMolecule()
