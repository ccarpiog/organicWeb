/**
 * @file Seeded random generator of valid acyclic hydrocarbons for the OPSIN
 * oracle and the graph-invariance tests (design.md §8), of valid
 * substituted and unsaturated monocycles (design.md §13.4 I-26), of
 * benzene and monosubstituted benzenes in either Kekulé drawing (I-28),
 * of halogen derivatives of all of those (I-30: F, Cl, Br, I in place of
 * random hydrogens, one- to three-carbon parents included), of alcohols
 * (I-31: OH groups in place of random hydrogens — on ring carbons only for a
 * ring —, phenol, some with halogens too), plus the list of cycloalkanes in
 * a size range. Development only,
 * never bundled. Deterministic: the same seed always yields the same
 * molecules, in the same order.
 */

import { createMolecule, addAtom, addBond, bondOrderSum, cloneMolecule, CARBON_VALENCE } from '../../src/model/molecule.js';
import { HALOGEN_ELEMENTS } from '../../src/model/elements.js';
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
 * Copies a hydrocarbon and replaces some of its hydrogens by halogens: each
 * hydrogen of each carbon becomes, with probability `rate`, a random F, Cl,
 * Br or I atom bonded to that carbon (design.md §13.4 I-30).
 *
 * @param {object} mol - A hydrocarbon (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} rate - Probability of replacing each hydrogen.
 * @returns {object} The halogenated copy (possibly without any halogen).
 */
export function halogenate(mol, random, rate) {
  const copy = cloneMolecule(mol);
  for (const id of [...copy.atoms.keys()]) {
    const free = CARBON_VALENCE - bondOrderSum(copy, id);
    for (let k = 0; k < free; k += 1) {
      if (random() < rate) {
        const element = HALOGEN_ELEMENTS[Math.floor(random() * HALOGEN_ELEMENTS.length)];
        addBond(copy, id, addAtom(copy, {}, element), 1);
      }
    }
  } // End of the loop over the carbons
  return copy;
} // End of function halogenate()

/**
 * Generates up to `count` distinct (by canonical key) halogen derivatives,
 * each with at least one halogen: random acyclic hydrocarbons of 1 carbon
 * up to `maxSize` (so halomethanes and haloethanes are drawn too), random
 * monocycles and random benzenes (at most one substituent survives
 * validation there), halogenated at random rates by halogenate(). Only
 * molecules valid for naming are kept.
 *
 * @param {{count: number, seed: number, minSize?: number, maxSize?: number}} options - How many, the seed and the carbon range (default 4–14 C; acyclic ones may be smaller).
 * @returns {object[]} The molecules.
 */
export function generateHalogenated({ count, seed, minSize = 4, maxSize = 14 }) {
  const random = seededRandom(seed * 4099 + 30);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50) {
    attempts += 1;
    const kind = random();
    let base;
    if (kind < 0.6 || maxSize < 4) {
      const size = randomInt(random, 1, maxSize);
      base = randomHydrocarbon(random, { size, unsaturation: random() * 0.5, branchiness: 0.2 + random() * 0.8 });
    } else if (kind < 0.9 || maxSize < 6) {
      const size = randomInt(random, Math.max(minSize, 4), maxSize);
      const ringSize = randomInt(random, 3, Math.min(10, size));
      base = randomMonocycle(random, {
        ringSize, extra: size - ringSize, unsaturation: random() * 0.4, branchiness: 0.2 + random() * 0.8,
      });
    } else {
      const size = randomInt(random, Math.max(minSize, 6), maxSize);
      base = randomBenzene(random, {
        extra: size - 6, kekule: random() < 0.5 ? 1 : 2, unsaturation: random() * 0.5, branchiness: 0.2 + random() * 0.8,
      });
    } // End of the choice of the hydrocarbon to halogenate
    const mol = halogenate(base, random, 0.05 + random() * 0.4);
    if (mol.atoms.size === base.atoms.size || validateForNaming(mol)) {
      continue; // No halogen drawn, or not valid for naming (e.g. a polysubstituted benzene).
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct halogen derivatives
  return molecules;
} // End of function generateHalogenated()

/**
 * Copies a molecule and replaces some of the hydrogens of its carbons by OH
 * groups: each hydrogen of each allowed carbon becomes, with probability
 * `rate`, an oxygen bonded to that carbon (design.md §13.4 I-31).
 *
 * @param {object} mol - A hydrocarbon or halogen derivative (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} rate - Probability of replacing each hydrogen.
 * @param {Set<number>|null} [only] - The carbons that may carry an OH (default: every carbon).
 * @returns {object} The copy (possibly without any OH).
 */
export function hydroxylate(mol, random, rate, only = null) {
  const copy = cloneMolecule(mol);
  for (const [id, atom] of [...copy.atoms]) {
    if (atom.element !== 'C' || (only && !only.has(id))) {
      continue;
    }
    const free = CARBON_VALENCE - bondOrderSum(copy, id);
    for (let k = 0; k < free; k += 1) {
      if (random() < rate) {
        addBond(copy, id, addAtom(copy, {}, 'O'), 1);
      }
    }
  } // End of the loop over the carbons
  return copy;
} // End of function hydroxylate()

/**
 * Generates up to `count` distinct (by canonical key) alcohols, each with at
 * least one OH group (design.md §13.4 I-31): random acyclic hydrocarbons of
 * 1 carbon up to `maxSize` (methanol, ethanol… included), random monocycles
 * with OH groups on ring carbons only (an OH on a side chain is refused),
 * phenol, and a share of each halogenated as well (halogenate()). Only
 * molecules valid for naming are kept.
 *
 * @param {{count: number, seed: number, minSize?: number, maxSize?: number}} options - How many, the seed and the carbon range (default 4–14 C; acyclic ones may be smaller).
 * @returns {object[]} The molecules.
 */
export function generateAlcohols({ count, seed, minSize = 4, maxSize = 14 }) {
  const random = seededRandom(seed * 5381 + 31);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50) {
    attempts += 1;
    const kind = random();
    let base;
    let only = null;
    if (kind < 0.62 || maxSize < 3) {
      const size = randomInt(random, 1, maxSize);
      base = randomHydrocarbon(random, { size, unsaturation: random() * 0.5, branchiness: 0.2 + random() * 0.8 });
    } else if (kind < 0.95 || maxSize < 6) {
      const size = randomInt(random, Math.max(minSize, 3), Math.max(maxSize, 3));
      const ringSize = randomInt(random, 3, Math.min(10, size));
      base = randomMonocycle(random, {
        ringSize, extra: size - ringSize, unsaturation: random() * 0.4, branchiness: 0.2 + random() * 0.8,
      });
      only = new Set([...base.atoms.keys()].slice(0, ringSize)); // randomMonocycle() adds the ring atoms first.
    } else {
      base = randomBenzene(random, { extra: 0, kekule: random() < 0.5 ? 1 : 2 });
    } // End of the choice of the parent molecule
    if (random() < 0.3) {
      base = halogenate(base, random, 0.05 + random() * 0.2);
    }
    const mol = hydroxylate(base, random, 0.05 + random() * 0.3, only);
    const oxygens = [...mol.atoms.values()].filter((atom) => atom.element === 'O').length;
    if (oxygens === 0 || validateForNaming(mol)) {
      continue; // No OH drawn, or not valid for naming (e.g. a polysubstituted benzene).
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct alcohols
  return molecules;
} // End of function generateAlcohols()

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
 * checks: the copy is the same graph (elements kept), so its name must not
 * change.
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
    idMap.set(old, addAtom(copy, {}, mol.atoms.get(old).element));
  }
  for (const bond of shuffle([...mol.bonds.values()], random)) {
    const ends = random() < 0.5 ? [bond.a, bond.b] : [bond.b, bond.a];
    copy.nextBondId += randomInt(random, 0, 7);
    addBond(copy, idMap.get(ends[0]), idMap.get(ends[1]), bond.order);
  }
  return copy;
} // End of function scrambleMolecule()
