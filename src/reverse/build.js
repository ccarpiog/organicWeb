/**
 * @file Builder of «¿Cómo se dibuja?» (design.md §15.4, §15.6; phase R-1b):
 * a NameSpec (interpret.js) and one placement — a value for each left-out
 * slot — become a molecule (model/molecule.js), or a structural error with
 * the offending tiles. Pure, no DOM; atoms are created without meaningful
 * coordinates (the UI lays the molecule out, design.md §15.2).
 *
 * The molecule is the student's reading, numbered as the student numbered
 * it: `studentParent` lists the parent's atoms in the student's locant
 * order, and `prefixAtoms` the atoms of each prefix occurrence (for the
 * highlights and the diagnosis of later phases).
 *
 * Structural errors (design.md §15.6; Spanish drafts pending teacher
 * review), each `{code, message, tiles: [from, to)}`, checked in this order:
 *
 * 1. In tile order: a retained word given prefixes of its own inside a
 *    compound branch (`TILE_ORDER`, it has no numbering); a locant beyond
 *    its chain (`LOCANT_RANGE`; the chain of the prefix, the branch's own
 *    chain inside a branch, the branch for its free-valence locant); a
 *    multiple bond from the last carbon (`BOND_RANGE`, also any multiple
 *    bond on a one-carbon chain); two multiple bonds on one bond
 *    (`SAME_BOND`). An `iliden` is the double bond to the carbon it hangs
 *    from, so it counts in the valence below.
 * 2. `TOO_BIG`, the engine's caps (model/validate.js) checked before
 *    building and naming: more than MAX_CARBONS carbons (counted on the
 *    NameSpec), then, once built, a chain longer than MAX_CHAIN.
 * 3. `VALENCE`: a carbon with more than four bonds; the tiles are those of
 *    the locant (or `il` / `iliden`) whose bond takes it over four, adding
 *    the bonds in tile order.
 *
 * checkSpec() runs step 1 and the carbon count without a placement, so a
 * name with left-out locants still gets its definite errors before the
 * left-out slots are filled (directPlacement(), R-1b; the search of R-1c).
 */

import { createMolecule, addAtom, addBond, setBondOrder, bondOrderSum, CARBON_VALENCE } from '../model/molecule.js';
import { MAX_CARBONS, MAX_CHAIN, MESSAGES as VALIDATION_MESSAGES, longestCarbonChain } from '../model/validate.js';

/** The structural error codes of design.md §15.6 (TILE_ORDER reused for a retained word with prefixes). */
export const BUILD_ERROR_CODES = Object.freeze(['TILE_ORDER', 'LOCANT_RANGE', 'BOND_RANGE', 'SAME_BOND', 'VALENCE', 'TOO_BIG']);

/**
 * Atoms of the retained branch words (design.md §4.5), numbered as their
 * systematic names: isopropil = propan-2-il, isopropiliden =
 * propan-2-iliden, tert-butil = 2-metilpropan-2-il. `attach` is the carbon
 * with the free valence, `order` its bond order, `methyls` the carbons that
 * carry one more methyl.
 */
const RETAINED_TEMPLATES = Object.freeze({
  isopropyl: Object.freeze({ length: 3, attach: 2, order: 1, methyls: Object.freeze([]) }),
  isopropylidene: Object.freeze({ length: 3, attach: 2, order: 2, methyls: Object.freeze([]) }),
  'tert-butyl': Object.freeze({ length: 3, attach: 2, order: 1, methyls: Object.freeze([2]) }),
});

/** Spanish words of the bond orders in the messages. */
const BOND_WORDS = Object.freeze({ 2: 'doble', 3: 'triple' });

/**
 * A structural error.
 *
 * @param {string} code - Error code.
 * @param {string} message - Spanish message.
 * @param {[number, number]} tiles - Tile range `[from, to)`.
 * @returns {{code: string, message: string, tiles: [number, number]}} The error.
 */
function buildError(code, message, tiles) {
  return { code, message, tiles: [tiles[0], tiles[1]] };
}

/**
 * «1 carbono», «5 carbonos».
 *
 * @param {number} n - A count.
 * @returns {string} The count with its noun.
 */
function carbons(n) {
  return `${n} ${n === 1 ? 'carbono' : 'carbonos'}`;
}

/**
 * The LOCANT_RANGE message (design.md §15.6): «La cadena de 5 carbonos va
 * del 1 al 5: no hay carbono 7.»; «La rama…» inside a branch.
 *
 * @param {{length: number, branch: boolean}} owner - The chain numbered.
 * @param {number} value - The locant.
 * @returns {string} The message.
 */
function rangeMessage(owner, value) {
  const noun = owner.branch ? 'La rama' : 'La cadena';
  if (owner.length === 1) {
    return `${noun} de 1 carbono solo tiene el carbono 1: no hay carbono ${value}.`;
  }
  return `${noun} de ${carbons(owner.length)} va del 1 al ${owner.length}: no hay carbono ${value}.`;
}

/**
 * The value of a slot: its own, or the placement's for a left-out slot
 * (null when there is none yet).
 *
 * @param {object} slot - A Slot (interpret.js).
 * @param {Map<object, number>|null} values - Placement values by slot, or null.
 * @returns {number|null} The value.
 */
function slotValue(slot, values) {
  if (slot.kind !== 'leftOut') {
    return slot.value;
  }
  return values && values.has(slot) ? values.get(slot) : null;
}

/**
 * Checks a carbon slot against its chain.
 *
 * @param {object} slot - A carbon Slot.
 * @param {{length: number, branch: boolean}} owner - The chain it numbers.
 * @param {Map<object, number>|null} values - Placement values, or null.
 * @returns {object|null} A LOCANT_RANGE error, or null.
 */
function checkCarbon(slot, owner, values) {
  const value = slotValue(slot, values);
  if (value === null || (value >= 1 && value <= owner.length)) {
    return null;
  }
  return buildError('LOCANT_RANGE', rangeMessage(owner, value), slot.tiles);
}

/**
 * Checks the multiple-bond slots of a chain in tile order: each within the
 * chain (LOCANT_RANGE beyond its last carbon, BOND_RANGE from its last
 * carbon or on a one-carbon chain) and no bond taken twice (SAME_BOND, the
 * tiles from the first slot to the second).
 *
 * @param {{length: number, branch: boolean, double: object[], triple: object[]}} owner - The chain.
 * @param {Map<object, number>|null} values - Placement values, or null.
 * @returns {object|null} The first error, or null.
 */
function checkBonds(owner, values) {
  const slots = [...owner.double.map((slot) => ({ slot, order: 2 })), ...owner.triple.map((slot) => ({ slot, order: 3 }))]
    .sort((p, q) => p.slot.tiles[0] - q.slot.tiles[0]);
  const taken = new Map();
  for (const { slot, order } of slots) {
    const empty = slot.domain[0] > slot.domain[1];
    const value = empty && slot.kind === 'leftOut' ? 1 : slotValue(slot, values);
    if (value === null) {
      continue; // A left-out slot not placed yet.
    }
    if (value > owner.length) {
      return buildError('LOCANT_RANGE', rangeMessage(owner, value), slot.tiles);
    }
    if (value === owner.length) {
      const noun = owner.branch ? 'la rama' : 'la cadena';
      return buildError('BOND_RANGE', `El enlace ${BOND_WORDS[order]} del carbono ${value} iría al carbono ${value + 1}, `
        + `y ${noun} solo tiene ${carbons(owner.length)}.`, slot.tiles);
    }
    if (taken.has(value)) {
      const first = taken.get(value);
      return buildError('SAME_BOND', `Hay dos enlaces múltiples en el mismo sitio (${value}).`, [first.tiles[0], slot.tiles[1]]);
    }
    taken.set(value, slot);
  } // End of the loop over the bond slots
  return null;
} // End of function checkBonds()

/**
 * Checks the prefixes hanging from a chain, in tile order: each prefix's
 * carbon slots, then its substituent.
 *
 * @param {object[]} prefixes - PrefixSpecs.
 * @param {{length: number, branch: boolean}} owner - The chain they hang from.
 * @param {Map<object, number>|null} values - Placement values, or null.
 * @returns {object|null} The first error, or null.
 */
function checkPrefixes(prefixes, owner, values) {
  for (const prefix of prefixes) {
    for (const slot of prefix.slots) {
      const error = checkCarbon(slot, owner, values);
      if (error) {
        return error;
      }
    }
    const error = checkSubstituent(prefix.substituent, values);
    if (error) {
      return error;
    }
  } // End of the loop over the prefixes
  return null;
} // End of function checkPrefixes()

/**
 * Checks a branch in tile order: a retained word with prefixes of its own,
 * then its prefixes, multiple bonds and free-valence locant.
 *
 * @param {object} sub - A SubstituentSpec.
 * @param {Map<object, number>|null} values - Placement values, or null.
 * @returns {object|null} The first error, or null.
 */
function checkSubstituent(sub, values) {
  if (sub.kind === 'retained') {
    if (sub.prefixes.length === 0) {
      return null;
    }
    return buildError('TILE_ORDER', `Esta ficha no puede ir aquí: «${sub.word.text}» ya es una rama entera y no lleva `
      + 'números ni ramas propias.', sub.word.tiles);
  }
  const owner = { length: sub.length, branch: true, double: sub.double, triple: sub.triple };
  return checkPrefixes(sub.prefixes, owner, values) || checkBonds(owner, values)
    || checkCarbon(sub.freeValence.slot, owner, values);
} // End of function checkSubstituent()

/**
 * Carbons of a branch, its own prefixes included.
 *
 * @param {object} sub - A SubstituentSpec.
 * @returns {number} The count.
 */
function substituentCarbons(sub) {
  if (sub.kind === 'retained') {
    const template = RETAINED_TEMPLATES[sub.retained];
    return template.length + template.methyls.length;
  }
  return sub.length + prefixCarbons(sub.prefixes);
}

/**
 * Carbons of a list of prefixes, each counted as often as its multiplier says.
 *
 * @param {object[]} prefixes - PrefixSpecs.
 * @returns {number} The count.
 */
function prefixCarbons(prefixes) {
  return prefixes.reduce((sum, prefix) => sum + prefix.slots.length * substituentCarbons(prefix.substituent), 0);
}

/**
 * Carbons of the molecule a NameSpec describes (independent of the
 * locants).
 *
 * @param {object} spec - A NameSpec.
 * @returns {number} The count.
 */
export function specCarbons(spec) {
  return spec.parent.length + prefixCarbons(spec.prefixes);
}

/**
 * The structural errors that need no placement, or that a placement's
 * values give (design.md §15.6): retained words with prefixes, ranges,
 * repeated bonds (left-out slots without a value are skipped, except that
 * a multiple bond on a one-carbon chain has nowhere to go), then the
 * carbon cap.
 *
 * @param {object} spec - A NameSpec (interpret.js).
 * @param {Map<object, number>|null} [values] - Placement values by slot (none: the supplied and implicit slots only).
 * @returns {{code: string, message: string, tiles: [number, number]}|null} The first error, or null.
 */
export function checkSpec(spec, values = null) {
  const parent = { length: spec.parent.length, branch: false, double: spec.parent.double, triple: spec.parent.triple };
  const error = checkPrefixes(spec.prefixes, parent, values) || checkBonds(parent, values);
  if (error) {
    return error;
  }
  if (specCarbons(spec) > MAX_CARBONS) {
    return buildError('TOO_BIG', VALIDATION_MESSAGES.TOO_BIG, spec.tiles);
  }
  return null;
} // End of function checkSpec()

/**
 * The placement of the left-out slots that need no search (phase R-1b):
 * each slot whose domain holds exactly one value gets it (`eteno`,
 * `etenil`, `metilmetano`). R-1c replaces the null case with its search.
 *
 * @param {object} spec - A NameSpec.
 * @returns {number[]|null} One value per `spec.leftOut` entry, or null when some slot has several possible values (or none).
 */
export function directPlacement(spec) {
  const placement = [];
  for (const slot of spec.leftOut) {
    if (slot.domain[0] !== slot.domain[1]) {
      return null;
    }
    placement.push(slot.domain[0]);
  }
  return placement;
}

/**
 * Records that a slot adds bond order to an atom (for the VALENCE tiles).
 *
 * @param {object} state - Build state.
 * @param {number} atom - Atom id.
 * @param {[number, number]} tiles - The slot's tile range.
 * @param {number} amount - Bond order added beyond the chain's single bonds.
 * @returns {void}
 */
function contribute(state, atom, tiles, amount) {
  state.atoms.get(atom).added.push({ tiles, amount });
}

/**
 * Creates the carbons and single bonds of a chain, then its multiple bonds
 * and the prefixes hanging from it.
 *
 * @param {object} state - Build state (`mol`, `values`, `atoms` info by id).
 * @param {{length: number, double: object[], triple: object[], prefixes: object[]}} owner - ParentSpec or chain SubstituentSpec.
 * @param {boolean} branch - A branch's chain (for the messages).
 * @returns {{atoms: number[], bonds: number[]}} Its atoms and chain bonds in locant order.
 */
function buildChain(state, owner, branch) {
  const { mol, values } = state;
  const atoms = [];
  const bonds = [];
  for (let locant = 1; locant <= owner.length; locant += 1) {
    const id = addAtom(mol);
    state.atoms.set(id, { locant, branch, added: [] });
    atoms.push(id);
    if (locant > 1) {
      bonds.push(addBond(mol, atoms[locant - 2], id, 1));
    }
  }
  for (const [order, slots] of [[2, owner.double], [3, owner.triple]]) {
    for (const slot of slots) {
      const value = slotValue(slot, values);
      setBondOrder(mol, bonds[value - 1], order);
      contribute(state, atoms[value - 1], slot.tiles, order - 1);
      contribute(state, atoms[value], slot.tiles, order - 1);
    }
  }
  attachPrefixes(state, owner.prefixes || [], atoms);
  return { atoms, bonds };
} // End of function buildChain()

/**
 * Creates a branch: a retained word from its template, or a chain.
 *
 * @param {object} state - Build state.
 * @param {object} sub - A SubstituentSpec.
 * @returns {{attach: number, order: number, tiles: [number, number]}} The atom with the free valence, its bond order and the tiles that set it.
 */
function buildSubstituent(state, sub) {
  if (sub.kind === 'retained') {
    const template = RETAINED_TEMPLATES[sub.retained];
    const chain = buildChain(state, { length: template.length, double: [], triple: [] }, true);
    for (const locant of template.methyls) {
      const methyl = addAtom(state.mol);
      state.atoms.set(methyl, { locant: 1, branch: true, added: [] });
      addBond(state.mol, chain.atoms[locant - 1], methyl, 1);
      contribute(state, chain.atoms[locant - 1], sub.tiles, 1);
      contribute(state, methyl, sub.tiles, 1);
    }
    return { attach: chain.atoms[template.attach - 1], order: template.order, tiles: sub.tiles };
  }
  const chain = buildChain(state, sub, true);
  const { slot, order } = sub.freeValence;
  return { attach: chain.atoms[slotValue(slot, state.values) - 1], order, tiles: slot.tiles };
} // End of function buildSubstituent()

/**
 * Builds every occurrence of some prefixes and bonds each to its carbon
 * of a chain; at the parent level, records the atoms of each occurrence.
 *
 * @param {object} state - Build state.
 * @param {object[]} prefixes - PrefixSpecs.
 * @param {number[]} atoms - The chain's atoms in locant order.
 * @param {object[]|null} [record] - Receives one entry per occurrence (parent level only).
 * @returns {void}
 */
function attachPrefixes(state, prefixes, atoms, record = null) {
  const { mol, values } = state;
  prefixes.forEach((prefix, index) => {
    prefix.slots.forEach((slot, occurrence) => {
      const firstAtom = mol.nextAtomId;
      const firstBond = mol.nextBondId;
      const branch = buildSubstituent(state, prefix.substituent);
      const locant = slotValue(slot, values);
      const target = atoms[locant - 1];
      const bond = addBond(mol, target, branch.attach, branch.order);
      contribute(state, target, slot.tiles, branch.order);
      contribute(state, branch.attach, branch.tiles, branch.order);
      if (record) {
        record.push({
          prefix: index,
          occurrence,
          tiles: [prefix.tiles[0], prefix.tiles[1]],
          locant,
          parentAtom: target,
          attachment: branch.attach,
          bond,
          atoms: idsBetween(firstAtom, mol.nextAtomId),
          bonds: idsBetween(firstBond, mol.nextBondId).filter((id) => id !== bond),
        });
      }
    }); // End of the loop over the occurrences of a prefix
  }); // End of the loop over the prefixes
} // End of function attachPrefixes()

/**
 * The ids handed out between two counter values (model/molecule.js hands
 * them out in increasing order).
 *
 * @param {number} from - First id.
 * @param {number} to - Id after the last one.
 * @returns {number[]} The ids.
 */
function idsBetween(from, to) {
  return Array.from({ length: to - from }, (_, i) => from + i);
}

/**
 * Finds the carbon with more than four bonds whose excess comes first in
 * the tiles: for each over-valent atom, its added bonds are summed in tile
 * order over the chain's single bonds, and the slot that takes the sum over
 * four gives the tiles.
 *
 * @param {object} state - Build state.
 * @returns {object|null} The VALENCE error, or null.
 */
function valenceError(state) {
  let best = null;
  for (const [id, info] of state.atoms) {
    const total = bondOrderSum(state.mol, id);
    if (total <= CARBON_VALENCE) {
      continue;
    }
    const added = [...info.added].sort((p, q) => p.tiles[0] - q.tiles[0]);
    let sum = total - added.reduce((s, a) => s + a.amount, 0);
    const culprit = added.find((a) => {
      sum += a.amount;
      return sum > CARBON_VALENCE;
    }) || { tiles: state.tiles }; // Never reached: a chain's own single bonds are at most two.
    if (!best || culprit.tiles[0] < best.tiles[0]) {
      best = { tiles: culprit.tiles, total, info };
    }
  } // End of the loop over the atoms
  if (!best) {
    return null;
  }
  const where = best.info.branch ? `El carbono ${best.info.locant} de la rama` : `El carbono ${best.info.locant}`;
  return buildError('VALENCE', `${where} tendría ${best.total} enlaces, y un carbono solo puede tener ${CARBON_VALENCE}.`, best.tiles);
} // End of function valenceError()

/**
 * Builds the molecule of a NameSpec with one placement (design.md §15.4).
 *
 * @param {object} spec - A NameSpec (interpret.js).
 * @param {number[]} [placement] - One value per `spec.leftOut` entry (empty when there is none).
 * @returns {{ok: true, molecule: object, studentParent: {atoms: number[], bonds: number[]}, prefixAtoms: object[]}
 *   |{ok: false, error: {code: string, message: string, tiles: [number, number]}}} The molecule (atoms without
 *   meaningful coordinates), the parent's atoms and bonds in the student's locant order, and per prefix occurrence
 *   `{prefix, occurrence, tiles, locant, parentAtom, attachment, bond, atoms, bonds}` (the branch's atoms and inner
 *   bonds; `bond` joins `attachment` to `parentAtom`) — or the first structural error.
 * @throws {Error} When the placement does not give one value per left-out slot.
 */
export function build(spec, placement = []) {
  if (placement.length !== spec.leftOut.length) {
    throw new Error(`build: ${spec.leftOut.length} left-out slots, ${placement.length} values`);
  }
  const values = new Map(spec.leftOut.map((slot, i) => [slot, placement[i]]));
  const error = checkSpec(spec, values);
  if (error) {
    return { ok: false, error };
  }
  const state = { mol: createMolecule(), values, atoms: new Map(), tiles: spec.tiles };
  const parent = buildChain(state, { ...spec.parent, prefixes: [] }, false);
  const prefixAtoms = [];
  attachPrefixes(state, spec.prefixes, parent.atoms, prefixAtoms);
  const valence = valenceError(state);
  if (valence) {
    return { ok: false, error: valence };
  }
  if (longestCarbonChain(state.mol) > MAX_CHAIN) {
    return { ok: false, error: buildError('TOO_BIG', VALIDATION_MESSAGES.TOO_BIG, spec.tiles) };
  }
  return { ok: true, molecule: state.mol, studentParent: { atoms: parent.atoms, bonds: parent.bonds }, prefixAtoms };
} // End of function build()
