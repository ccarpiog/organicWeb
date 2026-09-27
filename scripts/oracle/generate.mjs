/**
 * @file Seeded random generator of valid acyclic hydrocarbons for the OPSIN
 * oracle and the graph-invariance tests (design.md §8), of valid
 * substituted and unsaturated monocycles (design.md §13.4 I-26), of
 * benzene and monosubstituted benzenes in either Kekulé drawing (I-28),
 * plus the list of cycloalkanes in a size range. Development only,
 * never bundled. Deterministic: the same seed always yields the same
 * molecules, in the same order.
 */

import { createMolecule, addAtom, addBond, bondOrderSum, CARBON_VALENCE } from '../../src/model/molecule.js';
import { canonicalTreeKey, canonicalKey } from '../../src/model/graph.js';
import { validateForNaming, MAX_CHAIN } from '../../src/model/validate.js';

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
  raiseRandomBonds(mol, random, unsaturation);
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
 * Raises random bonds of a molecule to double or triple bonds where both
 * carbons have room (each bond tried with probability `unsaturation`).
 *
 * @param {object} mol - The molecule (mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} unsaturation - Probability of trying to raise a bond.
 * @param {object[]} [bonds] - The bonds that may be raised (default: every bond).
 * @returns {void}
 */
function raiseRandomBonds(mol, random, unsaturation, bonds = [...mol.bonds.values()]) {
  for (const bond of shuffle([...bonds], random)) {
    if (random() >= unsaturation) {
      continue;
    }
    const room = Math.min(CARBON_VALENCE - bondOrderSum(mol, bond.a), CARBON_VALENCE - bondOrderSum(mol, bond.b));
    if (room > 0) {
      bond.order += randomInt(random, 1, Math.min(room, 2));
    }
  }
}

/**
 * Builds one random monocycle: a ring of `ringSize` carbons, `extra` more
 * carbons grown as side chains (each bonded to a random carbon with a free
 * valence, favouring the last one added unless `branchiness` says
 * otherwise), then random bonds — ring or side chain — raised to double or
 * triple bonds where both carbons have room.
 *
 * @param {function(): number} random - Seeded generator.
 * @param {{ringSize: number, extra: number, unsaturation?: number, branchiness?: number}} options - Ring size, side-chain carbons, probability of raising a bond, branching probability.
 * @returns {object} The molecule (may still fail validation, e.g. a benzene ring).
 */
export function randomMonocycle(random, { ringSize, extra, unsaturation = 0.25, branchiness = 0.5 }) {
  const mol = createMolecule();
  const ring = Array.from({ length: ringSize }, () => addAtom(mol));
  ring.forEach((id, i) => addBond(mol, id, ring[(i + 1) % ringSize], 1));
  const atoms = [...ring];
  for (let i = 0; i < extra; i += 1) {
    const free = atoms.filter((id) => bondOrderSum(mol, id) < CARBON_VALENCE);
    const last = atoms[atoms.length - 1];
    const target = random() >= branchiness && free.includes(last) ? last : free[Math.floor(random() * free.length)];
    const atom = addAtom(mol);
    addBond(mol, target, atom, 1);
    atoms.push(atom);
  } // End of the loop that grows the side chains
  raiseRandomBonds(mol, random, unsaturation);
  return mol;
} // End of function randomMonocycle()

/**
 * Generates `count` distinct random monocycles (distinct by canonical key)
 * with 3–10 ring carbons and a total size in [max(minSize, 4), maxSize],
 * from a seed; most carry side chains and/or ring multiple bonds. Only
 * molecules valid for naming are kept (benzene rings and other refusals are
 * redrawn). Stops early, with fewer molecules, if too many are redrawn.
 *
 * @param {{count: number, seed: number, minSize?: number, maxSize?: number}} options - How many, the seed and the carbon range (default 4–14 C).
 * @returns {object[]} The molecules.
 */
export function generateMonocycles({ count, seed, minSize = 4, maxSize = 14 }) {
  const random = seededRandom(seed * 7919 + 26);
  const seen = new Set();
  const molecules = [];
  const low = Math.max(minSize, 4);
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50 && low <= maxSize) {
    attempts += 1;
    const size = randomInt(random, low, maxSize);
    const ringSize = randomInt(random, 3, Math.min(10, size));
    const mol = randomMonocycle(random, {
      ringSize,
      extra: size - ringSize,
      unsaturation: random() * 0.4,
      branchiness: 0.2 + random() * 0.8,
    });
    if (validateForNaming(mol)) {
      continue; // A benzene ring (not named yet) or beyond a cap.
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct monocycles
  return molecules;
} // End of function generateMonocycles()

/**
 * Builds one random benzene derivative: a Kekulé hexagon (ring bonds
 * alternating, the first one double or single per `kekule`) with, when
 * `extra` > 0, one acyclic side chain of `extra` carbons on a ring atom
 * (grown and unsaturated at random like randomHydrocarbon(); the ring bonds
 * are never changed, so the ring stays a benzene ring).
 *
 * @param {function(): number} random - Seeded generator.
 * @param {{extra: number, kekule?: 1|2, unsaturation?: number, branchiness?: number}} options - Side-chain carbons, order of the first ring bond, probability of raising a side-chain bond, branching probability.
 * @returns {object} The molecule (benzene or a monosubstituted benzene).
 */
export function randomBenzene(random, { extra, kekule = 2, unsaturation = 0.25, branchiness = 0.5 }) {
  const mol = createMolecule();
  const ring = Array.from({ length: 6 }, () => addAtom(mol));
  ring.forEach((id, i) => addBond(mol, id, ring[(i + 1) % 6], i % 2 === 0 ? kekule : 3 - kekule));
  const side = [];
  const sideBonds = [];
  for (let i = 0; i < extra; i += 1) {
    const free = side.filter((id) => bondOrderSum(mol, id) < CARBON_VALENCE);
    const last = side[side.length - 1];
    let target = ring[0];
    if (side.length > 0) {
      target = random() >= branchiness && free.includes(last) ? last : free[Math.floor(random() * free.length)];
    }
    const atom = addAtom(mol);
    const bond = addBond(mol, target, atom, 1);
    if (side.length > 0) {
      sideBonds.push(mol.bonds.get(bond));
    }
    side.push(atom);
  } // End of the loop that grows the side chain
  raiseRandomBonds(mol, random, unsaturation, sideBonds);
  return mol;
} // End of function randomBenzene()

/**
 * Generates up to `count` distinct (by canonical key) benzene derivatives
 * with a total size in [max(minSize, 6), maxSize]: benzene itself when 6 C
 * is in range, then random monosubstituted benzenes (randomBenzene(), either
 * Kekulé drawing). Only molecules valid for naming are kept.
 *
 * @param {{count: number, seed: number, minSize?: number, maxSize?: number}} options - How many, the seed and the carbon range (default 4–14 C).
 * @returns {object[]} The molecules.
 */
export function generateBenzenes({ count, seed, minSize = 4, maxSize = 14 }) {
  const random = seededRandom(seed * 6271 + 28);
  const seen = new Set();
  const molecules = [];
  const low = Math.max(minSize, 6);
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50 && low <= maxSize) {
    const size = attempts === 0 ? low : randomInt(random, low, maxSize);
    attempts += 1;
    const mol = randomBenzene(random, {
      extra: size - 6,
      kekule: random() < 0.5 ? 1 : 2,
      unsaturation: random() * 0.5,
      branchiness: 0.2 + random() * 0.8,
    });
    if (validateForNaming(mol)) {
      continue; // Beyond a cap (cannot happen within 60 C, but never feed an invalid input).
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct benzene derivatives
  return molecules;
} // End of function generateBenzenes()

/**
 * The cycloalkanes (unsubstituted saturated monocycles, design.md §13.4
 * I-25) whose ring size lies in a carbon range, smallest first: one
 * molecule per size from max(3, minSize) to min(MAX_CHAIN, maxSize). Every
 * ring size is one molecule, so they are listed rather than drawn at random.
 *
 * @param {{minSize?: number, maxSize?: number}} [options] - Carbon range (default 4–14 C, as generateMolecules()).
 * @returns {object[]} The molecules.
 */
export function generateCycloalkanes({ minSize = 4, maxSize = 14 } = {}) {
  const molecules = [];
  for (let size = Math.max(3, minSize); size <= Math.min(MAX_CHAIN, maxSize); size += 1) {
    const mol = createMolecule();
    const ids = Array.from({ length: size }, () => addAtom(mol));
    ids.forEach((id, i) => addBond(mol, id, ids[(i + 1) % size]));
    molecules.push(mol);
  }
  return molecules;
} // End of function generateCycloalkanes()

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
