/**
 * @file Seeded random generator of valid acyclic hydrocarbons for the OPSIN
 * oracle and the graph-invariance tests (design.md §8), of valid
 * substituted and unsaturated monocycles (design.md §13.4 I-26), of
 * benzene and monosubstituted benzenes in either Kekulé drawing (I-28),
 * of halogen derivatives of all of those (I-30: F, Cl, Br, I in place of
 * random hydrogens, one- to three-carbon parents included), of alcohols
 * (I-31: OH groups in place of random hydrogens — on ring carbons only for a
 * ring —, phenol, some with halogens too), of aldehydes and ketones (I-32:
 * =O in place of two hydrogens of a carbon — on ring carbons only for a
 * ring —, some with OH groups and halogens too), of carboxylic acids (I-33:
 * one or two –COOH at chain ends of acyclic molecules, some with C=O, OH
 * groups and halogens too), of ethers (I-34: an O put into one or two
 * single C–C bonds outside the ring, some with OH, C=O, –COOH and
 * halogens too), of esters (I-35: one –COO– between two random acyclic
 * pieces, some with C=O, OH groups and halogens too), of amines (I-36:
 * –NH₂ in place of random hydrogens and/or an N put into C–C single bonds,
 * some N carrying small alkyl groups — primary, secondary and tertiary —;
 * on ring carbons only for a ring, anilines included; some with –COOH,
 * ester, C=O, OH groups, ether oxygens and halogens too), of amides (I-37:
 * one or two –CONH₂ at chain ends of acyclic molecules, a single one with
 * small alkyl groups on its N; some with C=O, OH groups, amines, ether
 * oxygens and halogens too), of nitriles and `ciano-` prefixes (I-38,
 * I-39a), of acyl prefixes (I-39b: `formil`, `acetil`, `propanoil`… on
 * any carbon beside any principal group; generateAcyl()), of ester
 * prefixes and diesters (I-39c: `alcoxicarbonil`, `…-oxi…-oxo`, `aciloxi`
 * beside an acid, half esters and diesters; generateEsterPrefixes()), of
 * amide prefixes (I-39d: `carbamoil`, `…-amino…-oxo`, `acilamino` beside
 * an acid, an ester or another amide; generateAmidePrefixes()), of
 * rings as prefixes of a chain carrying the principal group (I-40a: an OH,
 * a ketone or an amine on a ring's side chain, `ciclohexil`, `fenil`,
 * `fenoxi`, `(ciclohexilamino)`, and ring and chain tied;
 * generateRingSubstituents()), of ring acids, aldehydes and ring acyl
 * prefixes (I-40b: `-carboxílico`, `-carbaldehído`, `ácido benzoico`,
 * `carboxi-`, `benzoil`, `(ciclohexanocarbonil)`; generateRingAcids()), of
 * ring nitriles and amides (I-40c: `-carbonitrilo`, `-carboxamida`,
 * `benzonitrilo`, `benzamida`, `N-feniletanamida`, `ciano-` / `carbamoil-`
 * on a ring; generateRingNitrilesAmides()), of ring esters (I-40d:
 * `-carboxilato`, `benzoato`, `etanoato de fenilo`, `benzoato de fenilo`,
 * `alcoxicarbonil-` / `aciloxi-` on a ring; generateRingEsters()),
 * plus the list of cycloalkanes in a size range.
 * Development only,
 * never bundled. Deterministic: the same seed always yields the same
 * molecules, in the same order.
 */

import {
  createMolecule, addAtom, addBond, removeBond, bondOrderSum, cloneMolecule, CARBON_VALENCE,
} from '../../src/model/molecule.js';
import { perceiveRings } from '../../src/model/rings.js';
import { HALOGEN_ELEMENTS } from '../../src/model/elements.js';
import { canonicalTreeKey, canonicalKey, adjacency } from '../../src/model/graph.js';
import {
  validateForNaming, carboxylCarbons, carboxylRole, esterCarbons, etherOxygens, amineNitrogens, amideCarbons, nitrileCarbons,
  MAX_CHAIN,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';

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
 * Copies a molecule and replaces pairs of hydrogens of its carbons by a
 * double-bonded oxygen (design.md §13.4 I-32): each allowed carbon with at
 * least two hydrogens becomes, with probability `rate`, a C=O carbon (an
 * aldehyde at a chain end or on a lone carbon, a ketone between two
 * carbons; a C=O on a carbon that already has a multiple bond is a ketene
 * and fails validation later).
 *
 * @param {object} mol - A hydrocarbon (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} rate - Probability of turning each allowed carbon into a C=O.
 * @param {Set<number>|null} [only] - The carbons that may carry the =O (default: every carbon).
 * @returns {object} The copy (possibly without any C=O).
 */
export function carbonylate(mol, random, rate, only = null) {
  const copy = cloneMolecule(mol);
  for (const [id, atom] of [...copy.atoms]) {
    if (atom.element !== 'C' || (only && !only.has(id))) {
      continue;
    }
    if (CARBON_VALENCE - bondOrderSum(copy, id) >= 2 && random() < rate) {
      addBond(copy, id, addAtom(copy, {}, 'O'), 2);
    }
  } // End of the loop over the carbons
  return copy;
} // End of function carbonylate()

/**
 * Generates up to `count` distinct (by canonical key) aldehydes and ketones,
 * each with at least one C=O (design.md §13.4 I-32): random acyclic
 * hydrocarbons of 1 carbon up to `maxSize` (methanal, ethanal, propanona…
 * included) and random monocycles with the C=O on ring carbons only
 * (cycloalkanones), a share of each with OH groups (hydroxylate(); on ring
 * carbons only for a ring) and halogens (halogenate()) as well. Only
 * molecules the engine names are kept (valid for naming; acyl branches are
 * named since I-39b, generateAcyl() covers them on purpose).
 *
 * @param {{count: number, seed: number, minSize?: number, maxSize?: number}} options - How many, the seed and the carbon range (default 4–14 C; acyclic ones may be smaller).
 * @returns {object[]} The molecules.
 */
export function generateCarbonyls({ count, seed, minSize = 4, maxSize = 14 }) {
  const random = seededRandom(seed * 6151 + 32);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50) {
    attempts += 1;
    let base;
    let only = null;
    if (random() < 0.7 || maxSize < 3) {
      const size = randomInt(random, 1, maxSize);
      base = randomHydrocarbon(random, { size, unsaturation: random() * 0.4, branchiness: 0.2 + random() * 0.8 });
    } else {
      const size = randomInt(random, Math.max(minSize, 3), Math.max(maxSize, 3));
      const ringSize = randomInt(random, 3, Math.min(10, size));
      base = randomMonocycle(random, {
        ringSize, extra: size - ringSize, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8,
      });
      only = new Set([...base.atoms.keys()].slice(0, ringSize)); // randomMonocycle() adds the ring atoms first.
    } // End of the choice of the parent molecule
    let mol = carbonylate(base, random, 0.1 + random() * 0.3, only);
    if (mol.atoms.size === base.atoms.size) {
      continue; // No C=O drawn.
    }
    if (random() < 0.3) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.15, only);
    }
    if (random() < 0.25) {
      mol = halogenate(mol, random, 0.05 + random() * 0.2);
    }
    if (validateForNaming(mol) || !nameMolecule(mol).ok || carboxylCarbons(mol).length > 0) {
      // Not valid for naming (a ketene…), refused by the engine, or an acid
      // (an OH drawn on an aldehyde carbon: generateAcids() covers those).
      continue;
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct aldehydes and ketones
  return molecules;
} // End of function generateCarbonyls()

/**
 * Copies a molecule and turns some of its end carbons into carboxyl
 * carbons (design.md §13.4 I-33): each carbon with at most one carbon
 * neighbour, bonded to it by a single bond and with three hydrogens (a
 * –CH₃ end, or the lone carbon of methane), gets a double-bonded O and an
 * OH, becoming a –COOH; at most `max` of them, chosen in random order.
 *
 * @param {object} mol - A hydrocarbon (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} max - The most –COOH groups to add (1 or 2).
 * @returns {object} The copy (possibly without any –COOH).
 */
export function carboxylate(mol, random, max) {
  const copy = cloneMolecule(mol);
  const ends = [...copy.atoms.keys()].filter((id) => {
    const bonds = [...copy.bonds.values()].filter((b) => b.a === id || b.b === id);
    return bonds.length <= 1 && bonds.every((b) => b.order === 1) && CARBON_VALENCE - bondOrderSum(copy, id) >= 3;
  });
  for (const id of shuffle(ends, random).slice(0, max)) {
    addBond(copy, id, addAtom(copy, {}, 'O'), 2);
    addBond(copy, id, addAtom(copy, {}, 'O'), 1);
  }
  return copy;
} // End of function carboxylate()

/**
 * Generates up to `count` distinct (by canonical key) carboxylic acids
 * (design.md §13.4 I-33): random acyclic hydrocarbons of 1 carbon up to
 * `maxSize` (methanoic, ethanoic, ethanedioic acid… included) with one or
 * two –COOH at chain ends (carboxylate()), a share of them also with C=O
 * (carbonylate(): ketones, or an aldehyde at the other end, cited `oxo-`),
 * OH groups (hydroxylate(), `hidroxi-`) and halogens (halogenate()). Only
 * molecules the engine names in every prefix style are kept (valid for
 * naming — no ring, at most two –COOH — and not refused by the engine in
 * any style; acyl branches such as `formil` are named since I-39b).
 *
 * @param {{count: number, seed: number, minSize?: number, maxSize?: number}} options - How many, the seed and the carbon range (default up to 14 C; the minimum is ignored: small acids are the common ones).
 * @returns {object[]} The molecules.
 */
export function generateAcids({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 7919 + 33);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50) {
    attempts += 1;
    const size = randomInt(random, 1, Math.max(1, maxSize - 1));
    const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.4, branchiness: 0.2 + random() * 0.8 });
    let mol = carboxylate(base, random, random() < 0.3 ? 2 : 1);
    if (mol.atoms.size === base.atoms.size) {
      continue; // No end carbon could take a –COOH.
    }
    const carbons = new Set([...base.atoms.keys()]);
    if (random() < 0.3) {
      mol = carbonylate(mol, random, 0.05 + random() * 0.2, carbons);
    }
    if (random() < 0.3) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.15, carbons);
    }
    if (random() < 0.25) {
      mol = halogenate(mol, random, 0.05 + random() * 0.2);
    }
    if (validateForNaming(mol) || carboxylCarbons(mol).length === 0
      || !PREFIX_STYLES.every((prefixStyle) => nameMolecule(mol, { prefixStyle }).ok)) {
      continue; // Not valid for naming, the –COOH was spoilt, or refused by the engine in some style (a –CO–C≡N…).
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct acids
  return molecules;
} // End of function generateAcids()

/**
 * Copies a molecule with a –COOH and turns it into an ester (design.md
 * §13.4 I-35): a copy of `alkyl` (a hydrocarbon) is grafted onto the OH
 * oxygen of the first carboxyl group, bonded by one of its carbons that
 * still has a hydrogen (chosen at random), so the –COOH becomes –COO–R.
 *
 * @param {object} mol - A molecule with at least one –COOH (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {object} alkyl - A hydrocarbon (not mutated): the O-bound group.
 * @returns {object} The copy (unchanged when `mol` has no –COOH or `alkyl` no carbon with a hydrogen).
 */
export function esterify(mol, random, alkyl) {
  const copy = cloneMolecule(mol);
  const adj = adjacency(copy);
  const hydroxy = [...copy.atoms.keys()].find((id) => carboxylRole(copy, adj, id) === 'hydroxy');
  const room = [...alkyl.atoms.keys()].some((id) => bondOrderSum(alkyl, id) < CARBON_VALENCE);
  if (hydroxy === undefined || !room) {
    return copy; // No –COOH, or a group with no hydrogen to spare (a fully unsaturated small ring).
  }
  const ids = new Map();
  for (const [id, atom] of alkyl.atoms) {
    ids.set(id, addAtom(copy, {}, atom.element));
  }
  for (const bond of alkyl.bonds.values()) {
    addBond(copy, ids.get(bond.a), ids.get(bond.b), bond.order);
  }
  const free = [...alkyl.atoms.keys()].filter((id) => bondOrderSum(alkyl, id) < CARBON_VALENCE);
  addBond(copy, hydroxy, ids.get(free[Math.floor(random() * free.length)]), 1);
  return copy;
} // End of function esterify()

/**
 * Generates up to `count` distinct (by canonical key) esters (design.md
 * §13.4 I-35): a random acyclic hydrocarbon of 1 carbon up to `maxSize`
 * − 2 with one –COOH at a chain end (carboxylate()), whose OH is joined to
 * a random acyclic hydrocarbon of 1 to 6 carbons (esterify(): branched,
 * unsaturated or bonded by an inner carbon), a share of them also with
 * C=O (carbonylate(): `oxo-`), OH groups (hydroxylate(): `hidroxi-`) and
 * halogens (halogenate()) on either part. Only molecules with exactly one
 * ester group that the engine names in every prefix style are kept (a C=O
 * next to the bridge O makes an anhydride, which validation refuses; acyl
 * branches are named since I-39b).
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateEsters({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 8209 + 35);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50) {
    attempts += 1;
    const size = randomInt(random, 1, Math.max(1, maxSize - 2));
    const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.4, branchiness: 0.2 + random() * 0.8 });
    const acid = carboxylate(base, random, 1);
    if (acid.atoms.size === base.atoms.size) {
      continue; // No end carbon could take a –COOH.
    }
    const alkylSize = randomInt(random, 1, Math.max(1, Math.min(6, maxSize - size)));
    const alkyl = randomHydrocarbon(random, { size: alkylSize, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8 });
    let mol = esterify(acid, random, alkyl);
    const carbons = new Set([...mol.atoms].filter(([, atom]) => atom.element === 'C').map(([id]) => id));
    if (random() < 0.25) {
      mol = carbonylate(mol, random, 0.05 + random() * 0.15, carbons);
    }
    if (random() < 0.25) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.1, carbons);
    }
    if (random() < 0.25) {
      mol = halogenate(mol, random, 0.05 + random() * 0.2);
    }
    if (validateForNaming(mol) || esterCarbons(mol).length !== 1
      || !PREFIX_STYLES.every((prefixStyle) => nameMolecule(mol, { prefixStyle }).ok)) {
      continue; // Not valid for naming (an anhydride…), or refused by the engine in some style (a –CO–C≡N…).
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct esters
  return molecules;
} // End of function generateEsters()

/**
 * Copies a molecule and puts an oxygen into some of its carbon–carbon
 * single bonds that are not ring bonds (design.md §13.4 I-34): each chosen
 * bond C–C becomes C–O–C, an ether (a C=O carbon next to the new O makes an
 * ester, which fails validation later); at most `max` bonds, chosen in
 * random order.
 *
 * @param {object} mol - A molecule (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} max - The most oxygens to insert (1 or 2).
 * @returns {object} The copy (without any new O when there is no such bond).
 */
export function etherify(mol, random, max) {
  const copy = cloneMolecule(mol);
  const ringBonds = new Set(perceiveRings(copy).rings.flatMap((ring) => ring.bonds));
  const candidates = [...copy.bonds.values()].filter((bond) => bond.order === 1 && !ringBonds.has(bond.id)
    && copy.atoms.get(bond.a).element === 'C' && copy.atoms.get(bond.b).element === 'C');
  for (const bond of shuffle(candidates, random).slice(0, max)) {
    removeBond(copy, bond.id);
    const oxygen = addAtom(copy, {}, 'O');
    addBond(copy, bond.a, oxygen, 1);
    addBond(copy, oxygen, bond.b, 1);
  }
  return copy;
} // End of function etherify()

/**
 * Generates up to `count` distinct (by canonical key) ethers (design.md
 * §13.4 I-34): random acyclic hydrocarbons of 2 carbons up to `maxSize`
 * (dimethyl ether included), random monocycles and random monosubstituted
 * benzenes, with an O put into one or two C–C single bonds outside the
 * ring (etherify()); a share of the acyclic ones also get a –COOH, C=O or
 * OH groups (on ring carbons only for a ring) and halogens. Only molecules
 * the engine names in every prefix style are kept (valid for naming — no
 * ester, no OH or C=O on a ring's side chain… — and not refused by the
 * engine: no –CO–C≡N branch, no symmetric ether with the principal group on
 * both halves).
 *
 * @param {{count: number, seed: number, minSize?: number, maxSize?: number}} options - How many, the seed and the carbon range (default 4–14 C; acyclic ones may be smaller).
 * @returns {object[]} The molecules.
 */
export function generateEthers({ count, seed, minSize = 4, maxSize = 14 }) {
  const random = seededRandom(seed * 8191 + 34);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50) {
    attempts += 1;
    const kind = random();
    let base;
    let only = null;
    if (kind < 0.65 || maxSize < 4) {
      const size = randomInt(random, 2, Math.max(2, maxSize));
      base = randomHydrocarbon(random, { size, unsaturation: random() * 0.4, branchiness: 0.2 + random() * 0.8 });
    } else if (kind < 0.85 || maxSize < 7) {
      const size = randomInt(random, Math.max(minSize, 4), Math.max(maxSize, 4));
      const ringSize = randomInt(random, 3, Math.min(10, size - 1));
      base = randomMonocycle(random, {
        ringSize, extra: size - ringSize, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8,
      });
      only = new Set([...base.atoms.keys()].slice(0, ringSize)); // randomMonocycle() adds the ring atoms first.
    } else {
      base = randomBenzene(random, { extra: randomInt(random, 1, Math.max(1, Math.min(6, maxSize - 6))), kekule: random() < 0.5 ? 1 : 2 });
    } // End of the choice of the parent molecule
    const carbons = new Set([...base.atoms.keys()]);
    const acyclic = only === null && base.atoms.size === base.bonds.size + 1;
    if (acyclic && random() < 0.15) {
      base = carboxylate(base, random, 1);
    }
    let mol = etherify(base, random, random() < 0.3 ? 2 : 1);
    if (etherOxygens(mol).length === 0) {
      continue; // No C–C single bond outside a ring.
    }
    if (acyclic && random() < 0.2) {
      mol = carbonylate(mol, random, 0.05 + random() * 0.2, carbons);
    }
    if (random() < 0.25 && !(only === null && !acyclic)) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.15, only || carbons);
    }
    if (random() < 0.25) {
      mol = halogenate(mol, random, 0.05 + random() * 0.2);
    }
    if (validateForNaming(mol) || etherOxygens(mol).length === 0
      || !PREFIX_STYLES.every((prefixStyle) => nameMolecule(mol, { prefixStyle }).ok)) {
      continue; // Not valid for naming (an ester…), or refused by the engine in some style.
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct ethers
  return molecules;
} // End of function generateEthers()

/** Valence of a neutral nitrogen (an amine N has one to three single bonds). */
const NITROGEN_VALENCE = 3;

/**
 * Copies a molecule and puts amine nitrogens into it (design.md §13.4 I-36):
 * each hydrogen-bearing allowed carbon gets, with probability `rate`, an
 * –NH₂ (a primary amine); then an N is put into up to `insert` carbon–carbon
 * single bonds that are not ring bonds, chosen in random order (C–C becomes
 * C–N–C, a secondary amine; with `only`, one end of the bond must be an
 * allowed carbon, so a ring–chain bond gives an N on the ring). Each new N
 * then gets, with probability `graft` per free valence, a random saturated
 * alkyl group of 1 to 3 carbons bonded by a random carbon (secondary or
 * tertiary amines, `N`-substituents). A C=O carbon next to a new N makes an
 * amide, which fails validation later.
 *
 * @param {object} mol - A molecule (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {{rate?: number, insert?: number, graft?: number, only?: Set<number>|null}} options - Probability of an –NH₂ per allowed carbon, most N to insert into bonds, probability of grafting an alkyl per free N valence, and the carbons an N may be bonded to (default: every carbon).
 * @returns {object} The copy (possibly without any new N).
 */
export function aminate(mol, random, { rate = 0, insert = 0, graft = 0, only = null } = {}) {
  const copy = cloneMolecule(mol);
  const allowed = (id) => copy.atoms.get(id).element === 'C' && (!only || only.has(id));
  const added = [];
  for (const id of [...copy.atoms.keys()]) {
    if (allowed(id) && bondOrderSum(copy, id) < CARBON_VALENCE && random() < rate) {
      const nitrogen = addAtom(copy, {}, 'N');
      addBond(copy, id, nitrogen, 1);
      added.push(nitrogen);
    }
  } // End of the loop that adds –NH₂ groups
  const ringBonds = new Set(perceiveRings(copy).rings.flatMap((ring) => ring.bonds));
  const candidates = [...copy.bonds.values()].filter((bond) => bond.order === 1 && !ringBonds.has(bond.id)
    && copy.atoms.get(bond.a).element === 'C' && copy.atoms.get(bond.b).element === 'C'
    && (allowed(bond.a) || allowed(bond.b)));
  for (const bond of shuffle(candidates, random).slice(0, insert)) {
    removeBond(copy, bond.id);
    const nitrogen = addAtom(copy, {}, 'N');
    addBond(copy, bond.a, nitrogen, 1);
    addBond(copy, nitrogen, bond.b, 1);
    added.push(nitrogen);
  } // End of the loop that inserts N into C–C bonds
  for (const nitrogen of added) {
    while (bondOrderSum(copy, nitrogen) < NITROGEN_VALENCE && random() < graft) {
      const alkyl = randomHydrocarbon(random, { size: randomInt(random, 1, 3), unsaturation: 0, branchiness: random() });
      const ids = new Map([...alkyl.atoms.keys()].map((id) => [id, addAtom(copy)]));
      for (const b of alkyl.bonds.values()) {
        addBond(copy, ids.get(b.a), ids.get(b.b), b.order);
      }
      const keys = [...ids.values()];
      addBond(copy, nitrogen, keys[Math.floor(random() * keys.length)], 1);
    }
  } // End of the loop that grafts alkyl groups onto the new nitrogens
  return copy;
} // End of function aminate()

/**
 * Generates up to `count` distinct (by canonical key) amines (design.md
 * §13.4 I-36): random acyclic hydrocarbons of 1 carbon up to `maxSize`
 * (methanamine… included) with one or more –NH₂ and/or an N put into one or
 * two C–C single bonds, some N carrying grafted alkyl groups (aminate():
 * primary, secondary and tertiary amines); random monocycles and benzene
 * (bare or with one side chain) with the N on a ring carbon (–NH₂ on a ring
 * carbon, or an N put into the ring–chain bond: `N`-alkyl ring amines,
 * anilines); and a share combined with a –COOH, an ester, C=O, OH groups,
 * ether oxygens and halogens (amino and substituted amino prefixes). Only
 * molecules with at least one amine N that the engine names in every prefix
 * style are kept (valid for naming — no amide, no side-chain N on a ring
 * amine… — and not refused by the engine: no substituted polyamine, no
 * symmetric amine, no –CO–C≡N branch).
 *
 * @param {{count: number, seed: number, minSize?: number, maxSize?: number}} options - How many, the seed and the carbon range (default 4–14 C; acyclic ones may be smaller).
 * @returns {object[]} The molecules.
 */
export function generateAmines({ count, seed, minSize = 4, maxSize = 14 }) {
  const random = seededRandom(seed * 8093 + 36);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 60) {
    attempts += 1;
    const kind = random();
    let base;
    let only = null;
    let acyclic = false;
    if (kind < 0.6 || maxSize < 3) {
      acyclic = true;
      const size = randomInt(random, 1, Math.max(1, maxSize - 1));
      base = randomHydrocarbon(random, { size, unsaturation: random() * 0.4, branchiness: 0.2 + random() * 0.8 });
    } else if (kind < 0.85 || maxSize < 6) {
      const size = randomInt(random, Math.max(minSize, 3), Math.max(maxSize - 1, 3));
      const ringSize = randomInt(random, 3, Math.min(10, size));
      base = randomMonocycle(random, {
        ringSize, extra: size - ringSize, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8,
      });
      only = new Set([...base.atoms.keys()].slice(0, ringSize)); // randomMonocycle() adds the ring atoms first.
    } else {
      const extra = random() < 0.5 ? 0 : randomInt(random, 1, Math.max(1, Math.min(4, maxSize - 7)));
      base = randomBenzene(random, { extra, kekule: random() < 0.5 ? 1 : 2, unsaturation: random() * 0.3 });
      only = new Set([...base.atoms.keys()].slice(0, 6)); // randomBenzene() adds the ring atoms first.
    } // End of the choice of the parent molecule
    const carbons = new Set([...base.atoms.keys()]);
    const extraGroup = random();
    if (acyclic && extraGroup < 0.12) {
      base = carboxylate(base, random, 1);
    } else if (acyclic && extraGroup < 0.2) {
      const acid = carboxylate(base, random, 1);
      base = esterify(acid, random, randomHydrocarbon(random, { size: randomInt(random, 1, 3), unsaturation: 0 }));
    }
    const insert = random() < 0.45 ? randomInt(random, 1, 2) : 0;
    let mol = aminate(base, random, {
      rate: insert > 0 && random() < 0.5 ? 0 : 0.05 + random() * 0.2, insert, graft: random() * 0.6, only,
    });
    if (amineNitrogens(mol).length === 0) {
      continue; // No N drawn.
    }
    if (acyclic && random() < 0.12) {
      mol = etherify(mol, random, 1);
    }
    if (acyclic && random() < 0.2) {
      mol = carbonylate(mol, random, 0.05 + random() * 0.2, carbons);
    }
    if (random() < 0.2 && (acyclic || only.size !== 6 || kind < 0.85)) {
      // OH on the chain or on ring carbons (not on a benzene: a second ring substituent is refused).
      mol = hydroxylate(mol, random, 0.05 + random() * 0.15, only || carbons);
    }
    if (random() < 0.2) {
      mol = halogenate(mol, random, 0.05 + random() * 0.15);
    }
    if (validateForNaming(mol) || amineNitrogens(mol).length === 0
      || !PREFIX_STYLES.every((prefixStyle) => nameMolecule(mol, { prefixStyle }).ok)) {
      continue; // Not valid for naming (an amide…), or refused by the engine in some style.
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct amines
  return molecules;
} // End of function generateAmines()

/**
 * Copies a hydrocarbon and turns chain ends into amide groups (design.md
 * §13.4 I-37): like carboxylate(), each carbon with at most one carbon
 * neighbour on a single bond and three hydrogens gets a double-bonded O and
 * an N (–CONH₂); at most `max` of them, chosen in random order. With a
 * single amide, its N then gets, with probability `graft` per free valence,
 * a random saturated alkyl group of 1 to 4 carbons bonded by a random
 * carbon (`N`-substituents: –CONH–R, –CON–R₂); a diamide never does
 * (validation refuses it: `substitutedPolyamide`).
 *
 * @param {object} mol - A hydrocarbon (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} max - The most amide groups to add (1 or 2).
 * @param {number} [graft] - Probability of grafting an alkyl per free N valence (default 0).
 * @returns {object} The copy (possibly without any amide).
 */
export function amidate(mol, random, max, graft = 0) {
  const copy = cloneMolecule(mol);
  const ends = [...copy.atoms.keys()].filter((id) => {
    const bonds = [...copy.bonds.values()].filter((b) => b.a === id || b.b === id);
    return bonds.length <= 1 && bonds.every((b) => b.order === 1) && CARBON_VALENCE - bondOrderSum(copy, id) >= 3;
  });
  const nitrogens = [];
  for (const id of shuffle(ends, random).slice(0, max)) {
    addBond(copy, id, addAtom(copy, {}, 'O'), 2);
    const nitrogen = addAtom(copy, {}, 'N');
    addBond(copy, id, nitrogen, 1);
    nitrogens.push(nitrogen);
  }
  if (nitrogens.length === 1) {
    const [nitrogen] = nitrogens;
    while (bondOrderSum(copy, nitrogen) < NITROGEN_VALENCE && random() < graft) {
      const alkyl = randomHydrocarbon(random, { size: randomInt(random, 1, 4), unsaturation: 0, branchiness: random() });
      const ids = new Map([...alkyl.atoms.keys()].map((id) => [id, addAtom(copy)]));
      for (const b of alkyl.bonds.values()) {
        addBond(copy, ids.get(b.a), ids.get(b.b), b.order);
      }
      const keys = [...ids.values()];
      addBond(copy, nitrogen, keys[Math.floor(random() * keys.length)], 1);
    }
  } // End of the grafting of alkyl groups onto the N of a monoamide
  return copy;
} // End of function amidate()

/**
 * Generates up to `count` distinct (by canonical key) amides (design.md
 * §13.4 I-37): random acyclic hydrocarbons of 1 carbon up to `maxSize` − 1
 * (methanamide, ethanamide, ethanediamide… included) with one or two
 * –CONH₂ at chain ends (amidate()), a single one often with alkyl groups
 * on its N (N-substituted and N,N-disubstituted amides), a share of them
 * also with C=O (carbonylate(): `oxo-`), OH groups (hydroxylate():
 * `hidroxi-`), amines (aminate(): `amino-`), an ether O (etherify():
 * `alcoxi-`) and halogens (halogenate()). Only molecules with at least one
 * amide that the engine names in every prefix style are kept (valid for
 * naming — no imide, the amides on one carbon piece… — and not refused by
 * the engine: no –CO–C≡N branch, no symmetric amine).
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateAmides({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 8111 + 37);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50) {
    attempts += 1;
    const size = randomInt(random, 1, Math.max(1, maxSize - 1));
    const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.4, branchiness: 0.2 + random() * 0.8 });
    let mol = amidate(base, random, random() < 0.25 ? 2 : 1, random() * 0.7);
    if (amideCarbons(mol).length === 0) {
      continue; // No end carbon could take an amide.
    }
    const carbons = new Set([...base.atoms.keys()]);
    if (random() < 0.2) {
      mol = carbonylate(mol, random, 0.05 + random() * 0.15, carbons);
    }
    if (random() < 0.2) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.15, carbons);
    }
    if (random() < 0.15) {
      mol = aminate(mol, random, { rate: 0.05 + random() * 0.15, graft: random() * 0.5, only: carbons });
    }
    if (random() < 0.1) {
      mol = etherify(mol, random, 1);
    }
    if (random() < 0.2) {
      mol = halogenate(mol, random, 0.05 + random() * 0.2);
    }
    if (validateForNaming(mol) || amideCarbons(mol).length === 0
      || !PREFIX_STYLES.every((prefixStyle) => nameMolecule(mol, { prefixStyle }).ok)) {
      continue; // Not valid for naming (an imide…), the amide was spoilt, or refused by the engine in some style.
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct amides
  return molecules;
} // End of function generateAmides()

/**
 * Copies a hydrocarbon and turns chain ends into nitrile groups (design.md
 * §13.4 I-38): like carboxylate(), each carbon with at most one carbon
 * neighbour on a single bond and three hydrogens (a –CH₃ end, or the lone
 * carbon of methane) gets an N on a triple bond (–C≡N); at most `max` of
 * them, chosen in random order.
 *
 * @param {object} mol - A hydrocarbon (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} max - The most nitrile groups to add (1 or 2).
 * @returns {object} The copy (possibly without any nitrile).
 */
export function nitrilate(mol, random, max) {
  const copy = cloneMolecule(mol);
  const ends = [...copy.atoms.keys()].filter((id) => {
    const bonds = [...copy.bonds.values()].filter((b) => b.a === id || b.b === id);
    return bonds.length <= 1 && bonds.every((b) => b.order === 1) && CARBON_VALENCE - bondOrderSum(copy, id) >= 3;
  });
  for (const id of shuffle(ends, random).slice(0, max)) {
    addBond(copy, id, addAtom(copy, {}, 'N'), 3);
  }
  return copy;
} // End of function nitrilate()

/**
 * Generates up to `count` distinct (by canonical key) nitriles (design.md
 * §13.4 I-38): random acyclic hydrocarbons of 1 carbon up to `maxSize` − 1
 * (metanonitrilo, etanonitrilo, etanodinitrilo… included) with one or two
 * –C≡N at chain ends (nitrilate()), a share of them also with C=O
 * (carbonylate(): `oxo-`), OH groups (hydroxylate(): `hidroxi-`), amines
 * (aminate(): `amino-`), an ether O (etherify(): `alcoxi-`) and halogens
 * (halogenate()). Only molecules with at least one nitrile that the engine
 * names in every prefix style are kept (valid for naming — the nitriles on
 * one carbon piece… — and not refused by the engine: no –CO–C≡N branch, no
 * symmetric amine or ether).
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateNitriles({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 8231 + 41);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50) {
    attempts += 1;
    const size = randomInt(random, 1, Math.max(1, maxSize - 1));
    const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.4, branchiness: 0.2 + random() * 0.8 });
    let mol = nitrilate(base, random, random() < 0.25 ? 2 : 1);
    if (nitrileCarbons(mol).length === 0) {
      continue; // No end carbon could take a nitrile.
    }
    const carbons = new Set([...base.atoms.keys()]);
    if (random() < 0.2) {
      mol = carbonylate(mol, random, 0.05 + random() * 0.15, carbons);
    }
    if (random() < 0.2) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.15, carbons);
    }
    if (random() < 0.15) {
      mol = aminate(mol, random, { rate: 0.05 + random() * 0.15, graft: random() * 0.5, only: carbons });
    }
    if (random() < 0.1) {
      mol = etherify(mol, random, 1);
    }
    if (random() < 0.2) {
      mol = halogenate(mol, random, 0.05 + random() * 0.2);
    }
    if (validateForNaming(mol) || nitrileCarbons(mol).length === 0
      || !PREFIX_STYLES.every((prefixStyle) => nameMolecule(mol, { prefixStyle }).ok)) {
      continue; // Not valid for naming, the nitrile was spoilt, or refused by the engine in some style.
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct nitriles
  return molecules;
} // End of function generateNitriles()

/**
 * Copies a molecule and bonds new nitrile groups –C≡N to some of its carbons
 * (design.md §13.4 I-39a): each hydrogen of a carbon in `only` (default:
 * every carbon) is replaced, with probability `rate`, by a new carbon
 * carrying an N on a triple bond; at least one when `rate` hits none and
 * some carbon has a hydrogen. The new nitrile carbon is outside every
 * chain: the engine cites it `ciano-` unless it can be principal.
 *
 * @param {object} mol - A molecule (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} rate - Probability of replacing each hydrogen.
 * @param {Set<number>|null} [only] - The carbons that may carry a –C≡N (default: every carbon).
 * @returns {object} The copy.
 */
export function cyanate(mol, random, rate, only = null) {
  const copy = cloneMolecule(mol);
  const sites = [];
  for (const [id, atom] of [...copy.atoms]) {
    if (atom.element !== 'C' || (only && !only.has(id))) {
      continue;
    }
    for (let k = CARBON_VALENCE - bondOrderSum(copy, id); k > 0; k -= 1) {
      sites.push(id);
    }
  } // End of the loop over the carbons
  let chosen = sites.filter(() => random() < rate);
  if (chosen.length === 0 && sites.length > 0) {
    chosen = [sites[Math.floor(random() * sites.length)]];
  }
  for (const id of chosen) {
    const carbon = addAtom(copy, {}, 'C');
    addBond(copy, id, carbon, 1);
    addBond(copy, carbon, addAtom(copy, {}, 'N'), 3);
  }
  return copy;
} // End of function cyanate()

/**
 * Generates up to `count` distinct (by canonical key) molecules with a
 * nitrile cited `ciano-` (design.md §13.4 I-39a): a random acyclic
 * hydrocarbon of 1 carbon up to `maxSize` − 3 given a principal group — a
 * –COOH (carboxylate()), an ester (carboxylate() then esterify(), the
 * O-bound group of 1 to 4 carbons), an amide (amidate(), sometimes with
 * groups on its N) or one or two nitriles at chain ends with an ether O
 * put into a C–C bond (nitrilate(), etherify(): the other piece becomes a
 * branch) — then one to three –C≡N on any carbon (cyanate(): on the
 * parent, in branches, in an ester's O-bound group or on an amide's N
 * groups), a share of them also with C=O, OH, amines and halogens. Only
 * molecules the engine names in every prefix style with some `ciano` in
 * the name are kept (valid for naming — no nitrile on an acid, ester or
 * amide carbon, at most two nitriles per carbon piece with a principal
 * nitrile — and not refused by the engine: no –CO–C≡N branch, no symmetric
 * ether or amine).
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateCyano({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 8237 + 43);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 50) {
    attempts += 1;
    const size = randomInt(random, 1, Math.max(1, maxSize - 3));
    const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8 });
    const kind = ['acid', 'ester', 'amide', 'nitrile'][Math.floor(random() * 4)];
    let mol = base;
    if (kind === 'acid') {
      mol = carboxylate(base, random, random() < 0.2 ? 2 : 1);
    } else if (kind === 'ester') {
      const alkyl = randomHydrocarbon(random, { size: randomInt(random, 1, 4), unsaturation: random() * 0.2, branchiness: random() });
      mol = esterify(carboxylate(base, random, 1), random, alkyl);
    } else if (kind === 'amide') {
      mol = amidate(base, random, random() < 0.2 ? 2 : 1, random() * 0.5);
    } else {
      mol = etherify(nitrilate(base, random, random() < 0.3 ? 2 : 1), random, 1);
    }
    if (mol.atoms.size === base.atoms.size) {
      continue; // No end carbon could take the principal group.
    }
    // The nitriles to cite `ciano-` go on any carbon, the ester's O-bound group and the amide's N groups included.
    const carbons = new Set([...mol.atoms].filter(([, atom]) => atom.element === 'C').map(([id]) => id));
    mol = cyanate(mol, random, 0.02 + random() * 0.1, carbons);
    if (random() < 0.15) {
      mol = carbonylate(mol, random, 0.05 + random() * 0.1, carbons);
    }
    if (random() < 0.15) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.1, carbons);
    }
    if (random() < 0.1) {
      mol = aminate(mol, random, { rate: 0.05 + random() * 0.1, graft: random() * 0.5, only: carbons });
    }
    if (random() < 0.15) {
      mol = halogenate(mol, random, 0.05 + random() * 0.15);
    }
    if (validateForNaming(mol)) {
      continue; // Not valid for naming (a nitrile on the acid's carbon, three nitriles on one piece…).
    }
    const names = PREFIX_STYLES.map((prefixStyle) => nameMolecule(mol, { prefixStyle }));
    if (!names.every((result) => result.ok) || !/ciano/.test(names[0].name)) {
      continue; // Refused by the engine in some style, or no nitrile cited `ciano-`.
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct ciano- molecules
  return molecules;
} // End of function generateCyano()

/**
 * Copies a molecule and bonds new acyl groups to some of its carbons
 * (design.md §13.4 I-39b): each hydrogen of a carbon in `only` (default:
 * every carbon) is replaced, with probability `rate`, by a new C=O carbon
 * X; X alone is a –CHO (`formil`), or X carries a random acyclic
 * hydrocarbon of 1 to 4 carbons bonded by a random carbon with a free
 * valence (`acetil`, `propanoil`, `2-metilpropanoil`, `but-2-enoil`…); at
 * least one when `rate` hits none and some carbon has a hydrogen.
 *
 * @param {object} mol - A molecule (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} rate - Probability of replacing each hydrogen.
 * @param {Set<number>|null} [only] - The carbons that may carry an acyl group (default: every carbon).
 * @returns {object} The copy.
 */
export function acylate(mol, random, rate, only = null) {
  const copy = cloneMolecule(mol);
  const sites = [];
  for (const [id, atom] of [...copy.atoms]) {
    if (atom.element !== 'C' || (only && !only.has(id))) {
      continue;
    }
    for (let k = CARBON_VALENCE - bondOrderSum(copy, id); k > 0; k -= 1) {
      sites.push(id);
    }
  } // End of the loop over the carbons
  let chosen = sites.filter(() => random() < rate);
  if (chosen.length === 0 && sites.length > 0) {
    chosen = [sites[Math.floor(random() * sites.length)]];
  }
  for (const id of chosen) {
    const carbon = addAtom(copy, {}, 'C');
    addBond(copy, id, carbon, 1);
    addBond(copy, carbon, addAtom(copy, {}, 'O'), 2);
    if (random() < 0.25) {
      continue; // A formyl group.
    }
    const tail = randomHydrocarbon(random, { size: randomInt(random, 1, 4), unsaturation: random() * 0.3, branchiness: random() });
    const ids = new Map([...tail.atoms.keys()].map((old) => [old, addAtom(copy)]));
    for (const b of tail.bonds.values()) {
      addBond(copy, ids.get(b.a), ids.get(b.b), b.order);
    }
    const free = [...ids.values()].filter((atom) => CARBON_VALENCE - bondOrderSum(copy, atom) >= 1);
    addBond(copy, carbon, free[Math.floor(random() * free.length)], 1);
  } // End of the loop that bonds the acyl groups
  return copy;
} // End of function acylate()

/**
 * Generates up to `count` distinct (by canonical key) molecules with an
 * acyl prefix (design.md §13.4 I-39b): a random acyclic hydrocarbon of 1
 * carbon up to `maxSize` − 4 given a principal group — a –COOH
 * (carboxylate()), an ester (carboxylate() then esterify(), the O-bound
 * group of 1 to 4 carbons), an amide (amidate()), a nitrile (nitrilate()),
 * or C=O groups (carbonylate(): aldehydes and ketones) — then one or more
 * acyl groups on any carbon (acylate(): on the parent, in branches, in an
 * ester's O-bound group or on an amide's N groups), a share of them also
 * with OH groups, amines, ether oxygens and halogens. Only molecules that
 * the engine names in every prefix style with some acyl prefix in the
 * name (`formil`, `acetil`, `…anoil`, `…enoil`, `…inoil`) are kept (valid
 * for naming and not refused by the engine: no –CO–C≡N, no symmetric ether
 * or amine…).
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateAcyl({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 8543 + 47);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 60) {
    attempts += 1;
    const size = randomInt(random, 1, Math.max(1, maxSize - 4));
    const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8 });
    const kind = ['acid', 'ester', 'amide', 'nitrile', 'carbonyl', 'carbonyl'][Math.floor(random() * 6)];
    let mol = base;
    if (kind === 'acid') {
      mol = carboxylate(base, random, random() < 0.3 ? 2 : 1);
    } else if (kind === 'ester') {
      const alkyl = randomHydrocarbon(random, { size: randomInt(random, 1, 4), unsaturation: random() * 0.2, branchiness: random() });
      mol = esterify(carboxylate(base, random, 1), random, alkyl);
    } else if (kind === 'amide') {
      mol = amidate(base, random, random() < 0.2 ? 2 : 1, random() * 0.5);
    } else if (kind === 'nitrile') {
      mol = nitrilate(base, random, random() < 0.3 ? 2 : 1);
    } else {
      mol = carbonylate(base, random, 0.1 + random() * 0.3);
    }
    if (mol.atoms.size === base.atoms.size) {
      continue; // No carbon could take the principal group.
    }
    const carbons = new Set([...mol.atoms].filter(([, atom]) => atom.element === 'C').map(([id]) => id));
    mol = acylate(mol, random, 0.02 + random() * 0.08, carbons);
    if (random() < 0.15) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.1, carbons);
    }
    if (random() < 0.1) {
      mol = aminate(mol, random, { rate: 0.05 + random() * 0.1, graft: random() * 0.5, only: carbons });
    }
    if (random() < 0.1) {
      mol = etherify(mol, random, 1);
    }
    if (random() < 0.15) {
      mol = halogenate(mol, random, 0.05 + random() * 0.15);
    }
    if (validateForNaming(mol)) {
      continue; // Not valid for naming (a ketene, three aldehydes on one piece…).
    }
    const names = PREFIX_STYLES.map((prefixStyle) => nameMolecule(mol, { prefixStyle }));
    if (!names.every((result) => result.ok) || !/formil|acetil|[aei]noil/.test(names[0].name)) {
      continue; // Refused by the engine in some style, or every C=O ended up in a chain.
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct acyl molecules
  return molecules;
} // End of function generateAcyl()

/**
 * Copies a molecule and bonds new ester groups to some of its carbons
 * (design.md §13.4 I-39c): each hydrogen of a carbon in `only` (default:
 * every carbon) is replaced, with probability `rate`, by an ester group in
 * one of its two orientations — bonded through its C=O carbon X (X, its
 * C=O and a bridge O carrying a random acyclic hydrocarbon of 1 to 4
 * carbons: `metoxicarbonil`, or `…-oxi…-oxo` when a chain reaches X) or
 * through its bridge O (O, then X with its C=O, alone or with a random
 * hydrocarbon of 1 to 4 carbons: `formiloxi`, `acetiloxi`,
 * `propanoiloxi`…); at least one when `rate` hits none and some carbon has
 * a hydrogen.
 *
 * @param {object} mol - A molecule (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} rate - Probability of replacing each hydrogen.
 * @param {Set<number>|null} [only] - The carbons that may carry an ester group (default: every carbon).
 * @returns {object} The copy.
 */
export function esterGraft(mol, random, rate, only = null) {
  const copy = cloneMolecule(mol);
  const sites = [];
  for (const [id, atom] of [...copy.atoms]) {
    if (atom.element !== 'C' || (only && !only.has(id))) {
      continue;
    }
    for (let k = CARBON_VALENCE - bondOrderSum(copy, id); k > 0; k -= 1) {
      sites.push(id);
    }
  } // End of the loop over the carbons
  let chosen = sites.filter(() => random() < rate);
  if (chosen.length === 0 && sites.length > 0) {
    chosen = [sites[Math.floor(random() * sites.length)]];
  }
  /**
   * Grafts a random hydrocarbon of 1 to 4 carbons onto an atom, bonded by one of its carbons with a free valence.
   *
   * @param {number} atom - The atom that carries it.
   * @returns {void}
   */
  const graftTail = (atom) => {
    const tail = randomHydrocarbon(random, { size: randomInt(random, 1, 4), unsaturation: random() * 0.2, branchiness: random() });
    const ids = new Map([...tail.atoms.keys()].map((old) => [old, addAtom(copy)]));
    for (const b of tail.bonds.values()) {
      addBond(copy, ids.get(b.a), ids.get(b.b), b.order);
    }
    const free = [...ids.values()].filter((id) => CARBON_VALENCE - bondOrderSum(copy, id) >= 1);
    addBond(copy, atom, free[Math.floor(random() * free.length)], 1);
  };
  for (const id of chosen) {
    if (random() < 0.5) {
      // Through the C=O carbon: C–X(=O)–O–R.
      const carbon = addAtom(copy, {}, 'C');
      addBond(copy, id, carbon, 1);
      addBond(copy, carbon, addAtom(copy, {}, 'O'), 2);
      const bridge = addAtom(copy, {}, 'O');
      addBond(copy, carbon, bridge, 1);
      graftTail(bridge);
    } else {
      // Through the bridge O: C–O–X(=O)(–R).
      const bridge = addAtom(copy, {}, 'O');
      addBond(copy, id, bridge, 1);
      const carbon = addAtom(copy, {}, 'C');
      addBond(copy, bridge, carbon, 1);
      addBond(copy, carbon, addAtom(copy, {}, 'O'), 2);
      if (random() < 0.8) {
        graftTail(carbon); // Otherwise a formate (`formiloxi`).
      }
    }
  } // End of the loop that bonds the ester groups
  return copy;
} // End of function esterGraft()

/**
 * Generates up to `count` distinct (by canonical key) molecules with ester
 * prefixes or two esters (design.md §13.4 I-39c): a random acyclic
 * hydrocarbon of 1 carbon up to `maxSize` − 4 given either one or two
 * –COOH (carboxylate()) and then ester groups on any carbon (esterGraft():
 * `alcoxicarbonil`, `…-oxi…-oxo`, `aciloxi`), or two –COOH of which one
 * (a half ester, `ácido 4-metoxi-4-oxobutanoico`) or both (a diester,
 * `butanodioato de dimetilo`, `propanodioato de etilo y metilo`) are
 * esterified (esterify(): the same group or two different ones), a share
 * of them also with C=O, OH groups and halogens. Only molecules that the
 * engine names in every prefix style are kept (valid for naming — a mixed
 * diester whose chain differs seen from its two ends, two esters on
 * different carbon pieces and a third ester are refused — and not refused
 * by the engine).
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateEsterPrefixes({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 8629 + 53);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 60) {
    attempts += 1;
    const size = randomInt(random, 1, Math.max(1, maxSize - 4));
    const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8 });
    const kind = ['prefix', 'prefix', 'half', 'diester'][Math.floor(random() * 4)];
    let mol = carboxylate(base, random, kind === 'prefix' && random() < 0.7 ? 1 : 2);
    if (mol.atoms.size === base.atoms.size) {
      continue; // No end carbon could take a –COOH.
    }
    const alkyl = () => randomHydrocarbon(random, { size: randomInt(random, 1, 4), unsaturation: random() * 0.2, branchiness: random() });
    if (kind === 'prefix') {
      mol = esterGraft(mol, random, 0.02 + random() * 0.08, new Set(base.atoms.keys()));
    } else {
      const first = alkyl();
      mol = esterify(mol, random, first);
      if (kind === 'diester') {
        mol = esterify(mol, random, random() < 0.5 ? first : alkyl());
      }
    }
    const carbons = new Set([...mol.atoms].filter(([, atom]) => atom.element === 'C').map(([id]) => id));
    if (random() < 0.15) {
      mol = carbonylate(mol, random, 0.05 + random() * 0.1, carbons);
    }
    if (random() < 0.15) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.1, carbons);
    }
    if (random() < 0.15) {
      mol = halogenate(mol, random, 0.05 + random() * 0.15);
    }
    if (validateForNaming(mol) || esterCarbons(mol).length === 0) {
      continue; // Not valid for naming (a mixed diester that needs locants, an anhydride…), or no ester left.
    }
    if (!PREFIX_STYLES.every((prefixStyle) => nameMolecule(mol, { prefixStyle }).ok)) {
      continue; // Refused by the engine in some style (a –COOH on a branch piece…).
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct ester-prefix molecules
  return molecules;
} // End of function generateEsterPrefixes()

/**
 * Copies a molecule and bonds new amide groups to some of its carbons
 * (design.md §13.4 I-39d): each hydrogen of a carbon in `only` (default:
 * every carbon) is replaced, with probability `rate`, by an amide group in
 * one of its two orientations — bonded through its C=O carbon X (X, its
 * C=O and an N carrying none, one or two random saturated hydrocarbons of
 * 1 to 3 carbons: `carbamoil`, `metilcarbamoil`, or `amino…oxo` when a
 * chain reaches X) or through its N (the N, maybe with one such group,
 * then X with its C=O, alone or with a random hydrocarbon of 1 to 4
 * carbons: `formilamino`, `acetilamino`, `[acetil(metil)amino]`…); at
 * least one when `rate` hits none and some carbon has a hydrogen.
 *
 * @param {object} mol - A molecule (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {number} rate - Probability of replacing each hydrogen.
 * @param {Set<number>|null} [only] - The carbons that may carry an amide group (default: every carbon).
 * @returns {object} The copy.
 */
export function amideGraft(mol, random, rate, only = null) {
  const copy = cloneMolecule(mol);
  const sites = [];
  for (const [id, atom] of [...copy.atoms]) {
    if (atom.element !== 'C' || (only && !only.has(id))) {
      continue;
    }
    for (let k = CARBON_VALENCE - bondOrderSum(copy, id); k > 0; k -= 1) {
      sites.push(id);
    }
  } // End of the loop over the carbons
  let chosen = sites.filter(() => random() < rate);
  if (chosen.length === 0 && sites.length > 0) {
    chosen = [sites[Math.floor(random() * sites.length)]];
  }
  /**
   * Grafts a random saturated or unsaturated hydrocarbon onto an atom, bonded by one of its carbons with a free valence.
   *
   * @param {number} atom - The atom that carries it.
   * @param {number} most - The largest carbon count.
   * @param {number} unsaturation - Unsaturation of the hydrocarbon.
   * @returns {void}
   */
  const graftTail = (atom, most, unsaturation) => {
    const tail = randomHydrocarbon(random, { size: randomInt(random, 1, most), unsaturation, branchiness: random() });
    const ids = new Map([...tail.atoms.keys()].map((old) => [old, addAtom(copy)]));
    for (const b of tail.bonds.values()) {
      addBond(copy, ids.get(b.a), ids.get(b.b), b.order);
    }
    const free = [...ids.values()].filter((id) => CARBON_VALENCE - bondOrderSum(copy, id) >= 1);
    addBond(copy, atom, free[Math.floor(random() * free.length)], 1);
  };
  for (const id of chosen) {
    const carbon = addAtom(copy, {}, 'C');
    const nitrogen = addAtom(copy, {}, 'N');
    addBond(copy, carbon, addAtom(copy, {}, 'O'), 2);
    addBond(copy, carbon, nitrogen, 1);
    if (random() < 0.5) {
      // Through the C=O carbon: C–X(=O)–N(R)0..2.
      addBond(copy, id, carbon, 1);
      for (let k = 0; k < 2 && random() < 0.4; k += 1) {
        graftTail(nitrogen, 3, 0);
      }
    } else {
      // Through the N: C–N(R?)–X(=O)(–R?).
      addBond(copy, id, nitrogen, 1);
      if (random() < 0.3) {
        graftTail(nitrogen, 3, 0);
      }
      if (random() < 0.8) {
        graftTail(carbon, 4, random() * 0.2); // Otherwise a formyl (`formilamino`).
      }
    }
  } // End of the loop that bonds the amide groups
  return copy;
} // End of function amideGraft()

/**
 * Generates up to `count` distinct (by canonical key) molecules with amide
 * prefixes (design.md §13.4 I-39d): a random acyclic hydrocarbon of 1
 * carbon up to `maxSize` − 4 given one or two –COOH (carboxylate()), a
 * –COOH turned into an ester (esterify()), or a –CONH₂ (amidate(), the
 * amide then principal), and then amide groups on its carbons
 * (amideGraft(): `carbamoil`, `amino…oxo`, `acilamino`); or one –COOH and
 * one –CONH₂ at chain ends (`ácido 4-amino-4-oxobutanoico`); a share of
 * them also with C=O, OH groups and halogens. Only molecules with an amide
 * prefix that the engine names in every prefix style are kept (valid for
 * naming — a third amide on the principal piece, a diamide with a group on
 * its N… are refused — and not refused by the engine).
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateAmidePrefixes({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 8807 + 61);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 60) {
    attempts += 1;
    const size = randomInt(random, 1, Math.max(1, maxSize - 4));
    const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8 });
    const kind = ['acid', 'acid', 'ester', 'amide', 'half'][Math.floor(random() * 5)];
    let mol;
    if (kind === 'amide') {
      mol = amidate(base, random, 1, random() * 0.5);
    } else if (kind === 'half') {
      mol = carboxylate(amidate(base, random, 1, random() * 0.5), random, 1);
    } else {
      mol = carboxylate(base, random, random() < 0.7 ? 1 : 2);
      if (kind === 'ester' && mol.atoms.size > base.atoms.size) {
        mol = esterify(mol, random, randomHydrocarbon(random, { size: randomInt(random, 1, 3), unsaturation: 0, branchiness: random() }));
      }
    }
    if (mol.atoms.size === base.atoms.size) {
      continue; // No end carbon could take the principal group.
    }
    if (kind !== 'half') {
      mol = amideGraft(mol, random, 0.02 + random() * 0.08, new Set(base.atoms.keys()));
    }
    const carbons = new Set([...mol.atoms].filter(([, atom]) => atom.element === 'C').map(([id]) => id));
    if (random() < 0.15) {
      mol = carbonylate(mol, random, 0.05 + random() * 0.1, carbons);
    }
    if (random() < 0.15) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.1, carbons);
    }
    if (random() < 0.15) {
      mol = halogenate(mol, random, 0.05 + random() * 0.15);
    }
    if (validateForNaming(mol) || amideCarbons(mol).length === 0) {
      continue; // Not valid for naming (an imide, a diamide with a group on its N…), or no amide left.
    }
    const names = PREFIX_STYLES.map((prefixStyle) => nameMolecule(mol, { prefixStyle }));
    if (!names.every((result) => result.ok) || !/carbamoil|amino/.test(names[0].name)) {
      continue; // Refused by the engine in some style, or every amide ended up as a suffix.
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct amide-prefix molecules
  return molecules;
} // End of function generateAmidePrefixes()

/**
 * Generates up to `count` distinct (by canonical key) ring molecules whose
 * side chains carry principal groups (design.md §13.4 I-40a): a random
 * monocycle (3–10 ring carbons) or a monosubstituted benzene, with OH
 * groups, ketone C=O or amine N (–NH₂, an N put into a side-chain C–C
 * bond or the ring–chain bond, some N with small alkyl groups) on
 * side-chain carbons; a share also with OH groups on ring carbons (not on
 * a benzene), an ether O in a bond outside the ring (`fenoxi`,
 * `ciclohexiloxi`) and halogens. Only molecules the engine names in every
 * prefix style with a ring-or-chain choice in the trace (a chain parent
 * with a ring prefix, or ring and chain tied) are kept.
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateRingSubstituents({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 7417 + 44);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 60) {
    attempts += 1;
    const benzene = random() < 0.4 && maxSize >= 7;
    let base;
    let ringSize = 6;
    if (benzene) {
      const extra = randomInt(random, 1, Math.max(1, Math.min(5, maxSize - 6)));
      base = randomBenzene(random, { extra, kekule: random() < 0.5 ? 1 : 2, unsaturation: random() * 0.3 });
    } else {
      const size = randomInt(random, 4, Math.max(4, maxSize));
      ringSize = randomInt(random, 3, Math.min(10, size - 1));
      base = randomMonocycle(random, {
        ringSize, extra: size - ringSize, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8,
      });
    } // End of the choice of the ring molecule
    const ids = [...base.atoms.keys()];
    const ring = new Set(ids.slice(0, ringSize)); // randomMonocycle() and randomBenzene() add the ring atoms first.
    const side = new Set(ids.filter((id) => !ring.has(id)));
    if (side.size === 0) {
      continue;
    }
    const kind = ['alcohol', 'alcohol', 'ketone', 'amine'][Math.floor(random() * 4)];
    let mol;
    if (kind === 'alcohol') {
      mol = hydroxylate(base, random, 0.1 + random() * 0.3, side);
    } else if (kind === 'ketone') {
      mol = carbonylate(base, random, 0.15 + random() * 0.3, side);
    } else {
      const insert = random() < 0.3 ? 1 : 0;
      mol = aminate(base, random, { rate: 0.1 + random() * 0.3, insert, graft: random() * 0.4, only: side });
    }
    if (mol.atoms.size === base.atoms.size) {
      continue; // No group drawn.
    }
    if (!benzene && random() < 0.25) {
      mol = hydroxylate(mol, random, 0.05 + random() * 0.15, ring);
    }
    if (random() < 0.15) {
      mol = etherify(mol, random, 1);
    }
    if (random() < 0.2) {
      mol = halogenate(mol, random, 0.05 + random() * 0.15);
    }
    if (validateForNaming(mol)) {
      continue; // Not valid for naming (a polysubstituted benzene, an ester or a nitrile with a ring…).
    }
    const results = PREFIX_STYLES.map((prefixStyle) => nameMolecule(mol, { prefixStyle }));
    if (!results.every((result) => result.ok) || !results[0].trace.some((step) => step.rule === 'RINGCHAIN')) {
      continue; // Refused by the engine in some style (symmetricRing…), or no side-chain principal group.
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct ring-prefix molecules
  return molecules;
} // End of function generateRingSubstituents()

/**
 * Copies a molecule and bonds new –COOH or –CHO groups directly to some of
 * its ring carbons (design.md §13.4 I-40b: `-carboxílico`,
 * `-carbaldehído`): up to `max` ring carbons with a hydrogen, in random
 * order, each get a new carbon X with a double-bonded O (and an OH for an
 * acid); since I-40c also amides (X with a double-bonded O and an N,
 * `-carboxamida`) and nitriles (X with an N on a triple bond,
 * `-carbonitrilo`).
 *
 * @param {object} mol - A molecule (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {'acid'|'aldehyde'|'amide'|'nitrile'} kind - Which group.
 * @param {number} max - The most groups to add.
 * @param {Set<number>} ring - The ring carbons that may carry a group.
 * @returns {object} The copy (possibly without any new group).
 */
export function ringGroupGraft(mol, random, kind, max, ring) {
  const copy = cloneMolecule(mol);
  const sites = shuffle([...ring].filter((id) => CARBON_VALENCE - bondOrderSum(copy, id) >= 1), random).slice(0, max);
  for (const id of sites) {
    const carbon = addAtom(copy, {}, 'C');
    addBond(copy, id, carbon, 1);
    if (kind === 'nitrile') {
      addBond(copy, carbon, addAtom(copy, {}, 'N'), 3);
      continue;
    }
    addBond(copy, carbon, addAtom(copy, {}, 'O'), 2);
    if (kind === 'acid') {
      addBond(copy, carbon, addAtom(copy, {}, 'O'), 1);
    } else if (kind === 'amide') {
      addBond(copy, carbon, addAtom(copy, {}, 'N'), 1);
    }
  } // End of the loop over the chosen ring carbons
  return copy;
} // End of function ringGroupGraft()

/**
 * Copies a molecule and bonds to one of its carbons (in `only`, with a
 * hydrogen) a C=O carbon X whose other side is a new ring (design.md §13.4
 * I-40b): a cycloalkane of 3 to 7 carbons, sometimes with a double bond,
 * or a benzene ring; so X is a ketone carbon between the chain and the
 * ring, cited `oxo` in the chain, or, off the chain, `benzoil` /
 * `(ciclohexanocarbonil)`.
 *
 * @param {object} mol - An acyclic molecule (not mutated).
 * @param {function(): number} random - Seeded generator.
 * @param {Set<number>} only - The carbons that may carry X.
 * @returns {object} The copy (unchanged when no carbon has room).
 */
export function ringAcylGraft(mol, random, only) {
  const copy = cloneMolecule(mol);
  const sites = [...only].filter((id) => copy.atoms.get(id).element === 'C' && CARBON_VALENCE - bondOrderSum(copy, id) >= 1);
  if (sites.length === 0) {
    return copy;
  }
  const carbon = addAtom(copy, {}, 'C');
  addBond(copy, sites[Math.floor(random() * sites.length)], carbon, 1);
  addBond(copy, carbon, addAtom(copy, {}, 'O'), 2);
  addBond(copy, carbon, addRandomRing(copy, random), 1);
  return copy;
} // End of function ringAcylGraft()

/**
 * Adds a new ring to a molecule, in place, unbonded to the rest (design.md
 * §13.4 I-40b, I-40c): a cycloalkane of 3 to 7 carbons, sometimes with a
 * double bond, or a benzene ring (40 %).
 *
 * @param {object} copy - The molecule to extend (mutated).
 * @param {function(): number} random - Seeded generator.
 * @returns {number} The id of its first ring atom, which has a hydrogen to spare.
 */
function addRandomRing(copy, random) {
  const benzene = random() < 0.4;
  const size = benzene ? 6 : randomInt(random, 3, 7);
  const ring = Array.from({ length: size }, () => addAtom(copy));
  ring.forEach((id, i) => {
    let order = 1;
    if (benzene) {
      order = i % 2 === 0 ? 2 : 1;
    } else if (i === 1 && size > 4 && random() < 0.3) {
      order = 2;
    }
    addBond(copy, id, ring[(i + 1) % size], order);
  });
  return ring[0];
} // End of function addRandomRing()

/**
 * Generates up to `count` distinct (by canonical key) molecules with a ring
 * and an acid or aldehyde, or a ring acyl prefix (design.md §13.4 I-40b):
 * a random monocycle (3–10 ring carbons) or benzene with one or two –COOH
 * or –CHO bonded to ring carbons (ringGroupGraft(): `ácido
 * ciclohexanocarboxílico`, `ciclohexano-1,2-dicarboxílico`, `ácido
 * benzoico`, `benzaldehído`; on benzene only without a side chain), or at
 * side-chain ends (`ácido 2-ciclohexiletanoico`, `3-fenilpropanal`), or
 * both (`ácido 2-(carboximetil)ciclohexano-1-carboxílico`, the ring prefix
 * `(4-carboxiciclohexil)`, `(4-formilciclohexil)`); or a random acyclic
 * acid or ketone with a C=O carbon bonded to a new ring (ringAcylGraft():
 * `benzoil`, `(ciclohexanocarbonil)`). A share also carry OH groups, ring
 * C=O, amines and halogens. Only molecules the engine names in every
 * prefix style with an acid or aldehyde principal, or a ring acyl prefix,
 * are kept.
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateRingAcids({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 9173 + 53);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 60) {
    attempts += 1;
    const kind = ['ring', 'ring', 'side', 'both', 'acyl'][Math.floor(random() * 5)];
    const group = random() < 0.6 ? 'acid' : 'aldehyde';
    let mol;
    if (kind === 'acyl') {
      const size = randomInt(random, 1, Math.max(1, maxSize - 8));
      const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.3, branchiness: 0.3 + random() * 0.7 });
      const principal = random() < 0.7 ? carboxylate(base, random, random() < 0.3 ? 2 : 1) : carbonylate(base, random, 0.3);
      mol = ringAcylGraft(principal, random, new Set(base.atoms.keys()));
    } else {
      const benzene = random() < 0.35 && maxSize >= 7;
      const plain = benzene && kind === 'ring';
      let base;
      let ringSize = 6;
      if (benzene) {
        const extra = plain ? 0 : randomInt(random, 1, Math.max(1, Math.min(5, maxSize - 7)));
        base = randomBenzene(random, { extra, kekule: random() < 0.5 ? 1 : 2, unsaturation: random() * 0.3 });
      } else {
        const size = randomInt(random, 3, Math.max(3, maxSize - 2));
        ringSize = randomInt(random, 3, Math.min(10, size));
        base = randomMonocycle(random, {
          ringSize, extra: size - ringSize, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8,
        });
      } // End of the choice of the ring molecule
      const ids = [...base.atoms.keys()];
      const ring = new Set(ids.slice(0, ringSize)); // randomMonocycle() and randomBenzene() add the ring atoms first.
      const side = new Set(ids.filter((id) => !ring.has(id)));
      mol = base;
      if (kind === 'ring' || kind === 'both') {
        mol = ringGroupGraft(mol, random, group, benzene ? 1 : (random() < 0.7 ? 1 : 2), ring);
      }
      if (kind === 'side' || kind === 'both') {
        mol = group === 'acid'
          ? carboxylate(mol, random, random() < 0.3 ? 2 : 1)
          : carbonylate(mol, random, 0.2 + random() * 0.3, side);
      }
      if (!benzene && random() < 0.2) {
        mol = random() < 0.5 ? hydroxylate(mol, random, 0.05 + random() * 0.15, ring) : carbonylate(mol, random, 0.1, ring);
      }
      if (random() < 0.1) {
        mol = aminate(mol, random, { rate: 0.1, only: benzene ? side : null });
      }
    } // End of the choice of the kind of molecule
    if (random() < 0.15) {
      mol = halogenate(mol, random, 0.05 + random() * 0.15);
    }
    if (validateForNaming(mol) || perceiveRings(mol).rings.length !== 1) {
      continue; // Not valid for naming (a polysubstituted benzene, three –COOH on one chain…), or no ring drawn.
    }
    const results = PREFIX_STYLES.map((prefixStyle) => nameMolecule(mol, { prefixStyle }));
    const [first] = results;
    const wanted = first.ok && (['acid', 'aldehyde'].includes(first.structure.suffix && first.structure.suffix.kind)
      || /benzoil|carbonil/.test(first.name));
    if (!results.every((result) => result.ok) || !wanted) {
      continue; // Refused by the engine in some style, or neither an acid, an aldehyde nor a ring acyl prefix.
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct ring-acid molecules
  return molecules;
} // End of function generateRingAcids()

/**
 * Grafts random saturated alkyl groups of 1 to 3 carbons onto a nitrogen,
 * in place (design.md §13.4 I-40c: `N-metilbenzamida`,
 * `N,N-dimetilciclohexanocarboxamida`): while the N has a free valence,
 * one more with probability `graft`.
 *
 * @param {object} copy - The molecule (mutated).
 * @param {number} nitrogen - The N atom id.
 * @param {function(): number} random - Seeded generator.
 * @param {number} graft - Probability of each further group.
 */
function alkylateNitrogen(copy, nitrogen, random, graft) {
  while (bondOrderSum(copy, nitrogen) < NITROGEN_VALENCE && random() < graft) {
    const alkyl = randomHydrocarbon(random, { size: randomInt(random, 1, 3), unsaturation: 0, branchiness: random() });
    const ids = new Map([...alkyl.atoms.keys()].map((id) => [id, addAtom(copy)]));
    for (const b of alkyl.bonds.values()) {
      addBond(copy, ids.get(b.a), ids.get(b.b), b.order);
    }
    const keys = [...ids.values()];
    addBond(copy, nitrogen, keys[Math.floor(random() * keys.length)], 1);
  }
} // End of function alkylateNitrogen()

/**
 * The N atoms of the amide groups of a molecule that have a hydrogen to
 * spare (only one carbon, the amide carbon, bonded to them).
 *
 * @param {object} mol - A molecule.
 * @returns {number[]} The N ids.
 */
function freeAmideNitrogens(mol) {
  const adj = adjacency(mol);
  return amideCarbons(mol)
    .map((carbon) => adj.get(carbon).find((n) => mol.atoms.get(n.atom).element === 'N').atom)
    .filter((nitrogen) => bondOrderSum(mol, nitrogen) < NITROGEN_VALENCE);
}

/**
 * Generates up to `count` distinct (by canonical key) molecules with a ring
 * and a nitrile or an amide (design.md §13.4 I-40c): a random monocycle
 * (3–10 ring carbons) or benzene with one or two –C≡N or –CONH₂ bonded to
 * ring carbons (ringGroupGraft(): `ciclohexanocarbonitrilo`,
 * `ciclohexano-1,2-dicarboxamida`, `benzonitrilo`, `benzamida`; on benzene
 * only without a side chain; a single amide sometimes with alkyl groups on
 * its N, `N-metilbenzamida`), or at side-chain ends (nitrilate(),
 * amidate(): `2-ciclohexiletanonitrilo`, `3-fenilpropanamida`), or both
 * (`4-(cianometil)ciclohexano-1-carbonitrilo`); an acyclic amide with a
 * new ring on its N (addRandomRing(): `N-feniletanamida`,
 * `N-ciclohexil-N-metilpropanamida`); or a ring acid beside a ring nitrile
 * or amide, cited `ciano-` / `carbamoil-` (`ácido
 * 4-cianociclohexano-1-carboxílico`). A share also carry OH groups, ring
 * C=O, amines and halogens. Only molecules with one ring and a nitrile or
 * an amide that the engine names in every prefix style are kept.
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateRingNitrilesAmides({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 9209 + 59);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 60) {
    attempts += 1;
    const kind = ['ring', 'ring', 'side', 'both', 'nitrogen', 'prefix'][Math.floor(random() * 6)];
    const group = random() < 0.5 ? 'nitrile' : 'amide';
    let mol;
    if (kind === 'nitrogen') {
      const size = randomInt(random, 1, Math.max(1, maxSize - 8));
      const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.3, branchiness: 0.3 + random() * 0.7 });
      mol = amidate(base, random, 1);
      const [nitrogen] = freeAmideNitrogens(mol);
      if (nitrogen === undefined) {
        continue; // No end carbon could take an amide.
      }
      addBond(mol, nitrogen, addRandomRing(mol, random), 1);
      alkylateNitrogen(mol, nitrogen, random, 0.3);
    } else {
      const benzene = random() < 0.35 && maxSize >= 7 && kind !== 'prefix';
      const plain = benzene && kind === 'ring';
      let base;
      let ringSize = 6;
      if (benzene) {
        const extra = plain ? 0 : randomInt(random, 1, Math.max(1, Math.min(5, maxSize - 7)));
        base = randomBenzene(random, { extra, kekule: random() < 0.5 ? 1 : 2, unsaturation: random() * 0.3 });
      } else {
        const size = randomInt(random, 3, Math.max(3, maxSize - 3));
        ringSize = randomInt(random, 3, Math.min(10, size));
        base = randomMonocycle(random, {
          ringSize, extra: size - ringSize, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8,
        });
      } // End of the choice of the ring molecule
      const ids = [...base.atoms.keys()];
      const ring = new Set(ids.slice(0, ringSize)); // randomMonocycle() and randomBenzene() add the ring atoms first.
      mol = base;
      if (kind === 'prefix') {
        mol = ringGroupGraft(mol, random, 'acid', 1, ring);
      }
      if (kind === 'ring' || kind === 'both' || kind === 'prefix') {
        mol = ringGroupGraft(mol, random, group, benzene || kind === 'prefix' || random() < 0.7 ? 1 : 2, ring);
      }
      if (kind === 'side' || kind === 'both') {
        mol = group === 'nitrile' ? nitrilate(mol, random, random() < 0.3 ? 2 : 1) : amidate(mol, random, 1);
      }
      const free = freeAmideNitrogens(mol);
      if (free.length === 1 && random() < 0.5) {
        alkylateNitrogen(mol, free[0], random, 0.6);
      }
      if (!benzene && random() < 0.2) {
        mol = random() < 0.5 ? hydroxylate(mol, random, 0.05 + random() * 0.15, ring) : carbonylate(mol, random, 0.1, ring);
      }
      if (random() < 0.1) {
        mol = aminate(mol, random, { rate: 0.1, only: benzene ? new Set(ids.filter((id) => !ring.has(id))) : null });
      }
    } // End of the choice of the kind of molecule
    if (random() < 0.15) {
      mol = halogenate(mol, random, 0.05 + random() * 0.15);
    }
    if (validateForNaming(mol) || perceiveRings(mol).rings.length !== 1
      || amideCarbons(mol).length + nitrileCarbons(mol).length === 0) {
      continue; // Not valid for naming (a polysubstituted benzene, an N-substituted ring diamide…), no ring, or no group.
    }
    if (!PREFIX_STYLES.every((prefixStyle) => nameMolecule(mol, { prefixStyle }).ok)) {
      continue; // Refused by the engine in some style (symmetricRing…).
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct ring nitrile and amide molecules
  return molecules;
} // End of function generateRingNitrilesAmides()

/**
 * A random small ring hydrocarbon for an ester's O-bound group (design.md
 * §13.4 I-40d): a benzene (40 %, bare) or a cycloalkane of 3 to 7 carbons,
 * sometimes with a double bond, with up to `extra` side-chain carbons.
 *
 * @param {function(): number} random - Seeded generator.
 * @param {number} extra - The most side-chain carbons.
 * @returns {object} The ring molecule.
 */
function randomRingGroup(random, extra) {
  if (random() < 0.4) {
    return randomBenzene(random, { extra: 0, kekule: random() < 0.5 ? 1 : 2 });
  }
  const ringSize = randomInt(random, 3, 7);
  return randomMonocycle(random, {
    ringSize, extra: randomInt(random, 0, Math.max(0, extra)), unsaturation: random() * 0.2, branchiness: random(),
  });
}

/**
 * Generates up to `count` distinct (by canonical key) ring esters (design.md
 * §13.4 I-40d): a ring on the acid side — a random monocycle (3–10 ring
 * carbons) or benzene with one or two –COOH bonded to ring carbons
 * (ringGroupGraft()) esterified by a random acyclic group or a ring group
 * (esterify(), randomRingGroup(): `ciclohexanocarboxilato de metilo`,
 * `benzoato de metilo`, `ciclohexano-1,2-dicarboxilato de dimetilo`,
 * `benzoato de fenilo`); a ring on the O side of an acyclic acid
 * (`etanoato de fenilo`, `propanoato de 2-metilciclohexilo`); an ester at
 * a side-chain end of a ring molecule (`2-feniletanoato de metilo`); or,
 * beside a ring acid, ester groups on ring carbons (esterGraft():
 * `metoxicarbonil-`, `acetiloxi-` on a ring). A share also carry OH
 * groups, ring C=O and halogens. Only molecules with a ring and an ester
 * that the engine names in every prefix style are kept.
 *
 * @param {{count: number, seed: number, maxSize?: number}} options - How many, the seed and the largest carbon count (default 14).
 * @returns {object[]} The molecules.
 */
export function generateRingEsters({ count, seed, maxSize = 14 }) {
  const random = seededRandom(seed * 9241 + 61);
  const seen = new Set();
  const molecules = [];
  let attempts = 0;
  while (molecules.length < count && attempts < count * 60) {
    attempts += 1;
    const kind = ['ring', 'ring', 'oxygen', 'side', 'prefix'][Math.floor(random() * 5)];
    /**
     * The O-bound group: a ring group (for a two-ring ester too) or a random acyclic hydrocarbon of 1 to 4 carbons.
     *
     * @param {boolean} ring - Whether it is a ring group.
     * @returns {object} The group.
     */
    const group = (ring) => (ring
      ? randomRingGroup(random, 2)
      : randomHydrocarbon(random, { size: randomInt(random, 1, 4), unsaturation: random() * 0.2, branchiness: random() }));
    let mol;
    if (kind === 'oxygen') {
      const size = randomInt(random, 1, Math.max(1, maxSize - 8));
      const base = randomHydrocarbon(random, { size, unsaturation: random() * 0.3, branchiness: 0.3 + random() * 0.7 });
      mol = esterify(carboxylate(base, random, 1), random, group(true));
    } else {
      const benzene = random() < 0.35 && maxSize >= 7 && kind !== 'prefix';
      let base;
      let ringSize = 6;
      if (benzene) {
        const extra = kind === 'side' ? randomInt(random, 1, Math.max(1, Math.min(4, maxSize - 7))) : 0;
        base = randomBenzene(random, { extra, kekule: random() < 0.5 ? 1 : 2, unsaturation: random() * 0.3 });
      } else {
        const size = randomInt(random, 3, Math.max(3, maxSize - 4));
        ringSize = randomInt(random, 3, Math.min(10, size));
        base = randomMonocycle(random, {
          ringSize, extra: size - ringSize, unsaturation: random() * 0.3, branchiness: 0.2 + random() * 0.8,
        });
      } // End of the choice of the ring molecule
      const ring = new Set([...base.atoms.keys()].slice(0, ringSize)); // Ring atoms come first.
      mol = base;
      if (kind === 'ring') {
        const two = !benzene && random() < 0.25;
        mol = ringGroupGraft(mol, random, 'acid', two ? 2 : 1, ring);
        const alkyl = group(random() < 0.3);
        mol = esterify(mol, random, alkyl);
        if (two) {
          mol = esterify(mol, random, random() < 0.7 ? alkyl : group(false));
        }
      } else if (kind === 'side') {
        mol = esterify(carboxylate(mol, random, 1), random, group(random() < 0.2));
      } else {
        mol = esterGraft(ringGroupGraft(mol, random, 'acid', 1, ring), random, 0.1, ring);
      }
      if (!benzene && random() < 0.2) {
        mol = random() < 0.5 ? hydroxylate(mol, random, 0.05 + random() * 0.15, ring) : carbonylate(mol, random, 0.1, ring);
      }
    } // End of the choice of the kind of molecule
    if (random() < 0.15) {
      mol = halogenate(mol, random, 0.05 + random() * 0.15);
    }
    if (validateForNaming(mol) || perceiveRings(mol).rings.length === 0 || esterCarbons(mol).length === 0) {
      continue; // Not valid for naming (a polysubstituted benzene, a mixed ring diester…), no ring, or no ester.
    }
    if (!PREFIX_STYLES.every((prefixStyle) => nameMolecule(mol, { prefixStyle }).ok)) {
      continue; // Refused by the engine in some style (symmetricRing…).
    }
    const key = canonicalKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  } // End of the loop that draws distinct ring esters
  return molecules;
} // End of function generateRingEsters()

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
