/**
 * @file Search of the left-out locants of «¿Cómo se dibuja?» (design.md
 * §15.4, §15.5.3 steps 2–4; phases R-1c, R-4a, R-4b, R-4c). Pure, no DOM, no
 * coordinates.
 *
 * A name may leave out locants (`metilpropano`, `buteno`): interpret.js
 * types those slots `leftOut`, and this module finds every **placement** —
 * one value per left-out slot — that gives a valid molecule, merges the
 * placements that give the same structure, and names each structure once.
 *
 * - **Domains by role** (§15.5.3 step 2): each slot's role gives its values
 *   on the chain or ring it numbers (ROLE_DOMAINS: carbons 1…n, the carbons
 *   2…6 of a phenyl's own prefixes, chain bonds 1…n−1, ring bonds 1…n —
 *   bond n joins carbon n to carbon 1). interpret.js asks slotDomain() for
 *   every slot, so later families add their roles (inner carbons of a
 *   ketone, `N`) here only. A benzene ring (`benceno`, `fenil`; R-4b) has no
 *   bond slots: its carbons each already use three bonds (two in the ring,
 *   one of them double), so one single-bond branch fits on each. A retained
 *   template (R-4c) is that ring with its own groups (build.js
 *   templateGroups()), modelled like prefixes on it: the groups it places by
 *   rule fill their carbons (`tolueno`: carbon 1), so the student's prefixes
 *   are searched on the others, numbered from the template's group; the two
 *   methyls of `xileno` without locants or letter are one group of left-out
 *   slots like those of `dimetilbenceno`, so `xileno` is three structures,
 *   filled as `1,2-` / `1,3-` / `1,4-xileno`.
 * - **Multisets** (step 3): the slots of one multiplied prefix or one
 *   multiplied segment are identical occurrences, so only their sorted
 *   value lists are enumerated (combinations with repetition for carbons,
 *   without repetition for multiple bonds: two cannot share a bond), never
 *   their permutations.
 * - **Incremental pruning** (step 3): each value is checked as it is
 *   placed — within the slot's domain, the carbon's remaining valence, the
 *   bond still free — and a group stops as soon as the carbons (or bonds)
 *   from the current value on cannot hold the slots it still has to place.
 *   The pruning is exact for the chemistry build.js checks (ranges,
 *   SAME_BOND, VALENCE); only a parent lengthened past MAX_CHAIN (TOO_BIG)
 *   is left to build().
 * - **Structural merge** (step 4): each placement is built and keyed with
 *   the aromatic-equivalence key (model/graph.js aromaticKey(), R-4b: the
 *   canonicalKey() of a view where both Kekulé drawings of a benzene ring
 *   read alike, so `1,2-` and `1,6-dimetilbenceno`, built with the double
 *   bonds of the ring fixed on bonds 1, 3, 5, are one structure; for a
 *   molecule without a benzene ring it is canonicalKey() itself); placements
 *   with one key are one structure (symmetric placements such as `1-` /
 *   `3-metilpropano`, or the six of `metilciclohexano`), in the order they
 *   are first found. Never merged by the engine's name. A name with more
 *   rings than canonicalKey() keys (build.js ringRefusal()) is not searched:
 *   status `none` with the engine's refusal (readName() answers `outOfScope`
 *   before searching).
 * - **Naming cache** (step 4): each distinct structure is named once (a
 *   Map by structural key, which callers may share); an engine refusal is
 *   cached and returned like a name, and readName() keeps refused
 *   structures apart from the named ones. Each entry keeps, beside the
 *   naming, a private copy of the graph that was named: the naming's atom
 *   and bond ids refer to that graph only, not to other placements of the
 *   structure (nor to another search's builds), so readName() draws it.
 * - **Budget** (step 3): at most `placements` valid placements built, at
 *   most `namings` calls to the namer, at most `ms` milliseconds (the clock
 *   is injectable), checked during the enumeration, before each naming and
 *   once more after the last one. Running out gives the status `budget` —
 *   readName()'s `incomplete` —, never a claim of ambiguity or uniqueness.
 *   The result's `deadline` lets readName() hold the same time limit
 *   through its own comparisons.
 *
 * When no placement is valid, the search says why (status `none` with a
 * structural error, design.md §15.6 shape `{code, message, tiles}`): the
 * error of the supplied locants alone when they already overload a carbon
 * (build.js's own VALENCE error); SAME_BOND when a chain has more multiple
 * bonds than bonds; else VALENCE «no caben» over the tiles of the left-out
 * slots, or the first build error (TOO_BIG). Spanish messages are drafts
 * pending teacher review.
 *
 * filledTree() writes a placement's values into the student's syntax tree
 * as number tiles, so that assemble.js gives the student's own name with its
 * locants filled in (§15.5.3 step 6), never the engine's rendering.
 */

import { CARBON_VALENCE, cloneMolecule } from '../model/molecule.js';
import { aromaticKey, aromaticIsomorphism } from '../model/graph.js';
import { build, checkSpec, attachmentOrder, ringRefusal, isRing, isAromatic, templateGroups } from './build.js';
import { TILES } from './tiles.js';

/**
 * Default limits of one search (design.md §15.5.3 step 3): valid
 * placements built, namer calls (distinct structures not in the cache) and
 * elapsed milliseconds. Building and keying a placement takes ~0.03 ms and
 * a naming ~0.1–0.2 ms on a desktop; phones are several times slower.
 */
export const SEARCH_BUDGET = Object.freeze({ placements: 3000, namings: 200, ms: 1500 });

/**
 * The values each slot role allows on a chain or ring of `length` carbons,
 * as `[min, max]` inclusive (min > max when there are none): a carbon slot
 * (a prefix's position, a free valence) any carbon, a prefix's position on
 * a phenyl (R-4b) any carbon but 1, the one bonded to what the phenyl hangs
 * from, a multiple-bond slot of a chain any chain bond, numbered by its
 * lower carbon, one of a ring any ring bond, bond n being the one from
 * carbon n to carbon 1. Later families add their roles here (a ketone's
 * inner carbons, `N`).
 */
export const ROLE_DOMAINS = Object.freeze({
  carbon: (length) => [1, length],
  phenylCarbon: (length) => [2, length],
  bond: (length) => [1, length - 1],
  ringBond: (length) => [1, length],
});

/** The slot roles that place a multiple bond. */
const BOND_ROLES = Object.freeze(['bond', 'ringBond']);

/**
 * Tells whether a slot role places a multiple bond (on a chain or a ring).
 *
 * @param {string} role - Slot role.
 * @returns {boolean} True for 'bond' and 'ringBond'.
 */
export function isBondRole(role) {
  return BOND_ROLES.includes(role);
}

/** The number tiles by value, to write a placement into a tree. */
const NUM_TILES = new Map(TILES.filter((tile) => tile.kind === 'num').map((tile) => [tile.value, tile]));

/**
 * The domain of a slot role on a chain or ring (design.md §15.5.3 step 2).
 *
 * @param {string} role - Slot role (a ROLE_DOMAINS key).
 * @param {number} length - Carbons of the chain or ring the slot numbers.
 * @returns {[number, number]} `[min, max]` inclusive.
 * @throws {Error} For an unknown role.
 */
export function slotDomain(role, length) {
  const domain = ROLE_DOMAINS[role];
  if (!domain) {
    throw new Error(`slotDomain: unknown slot role ${role}`);
  }
  return domain(length);
}

/**
 * One chain or ring of the search model: the bond orders its carbons
 * already use (its own single bonds plus every supplied or implicit locant)
 * and the bonds already multiple.
 *
 * @typedef {object} ChainModel
 * @property {number} length - Carbons.
 * @property {boolean} branch - A branch's chain (for the messages).
 * @property {boolean} ring - A ring: every carbon has two ring bonds, and bond n joins carbon n to carbon 1.
 * @property {boolean} aromatic - A benzene ring (R-4b): every carbon also has its share of a ring double bond.
 * @property {number[]} used - Bond order used per carbon, indexed by locant (1…length).
 * @property {Set<number>} taken - Multiple bonds already placed, by lower locant.
 * @property {number} multiple - Multiple-bond slots of the chain, supplied and left out.
 */

/**
 * A group of identical left-out slots: those of one prefix or one segment.
 *
 * @typedef {object} SlotGroup
 * @property {'carbon'|'phenylCarbon'|'bond'|'ringBond'} role - What the slots number.
 * @property {number} chain - Index of the ChainModel they number.
 * @property {number} amount - Bond order each slot adds to a carbon (attachment order; bond order − 1 for a bond).
 * @property {boolean} distinct - Values must differ (multiple bonds).
 * @property {[number, number]} domain - The slots' domain.
 * @property {number[]} indices - Positions of the slots in `spec.leftOut`.
 * @property {[number, number]} tiles - Tile range the slots point at.
 */

/**
 * A new chain or ring model with its own bonds: single bonds, and for a
 * benzene ring (R-4b) its Kekulé double bonds (each carbon in one).
 *
 * @param {number} length - Carbons.
 * @param {boolean} branch - A branch's chain.
 * @param {boolean} [ring] - A ring (default false).
 * @param {boolean} [aromatic] - A benzene ring (default false).
 * @returns {ChainModel} The model.
 */
function chainModel(length, branch, ring = false, aromatic = false) {
  const own = (c) => (ring ? 2 + (aromatic ? 1 : 0) : (c > 1 ? 1 : 0) + (c < length ? 1 : 0));
  const used = Array.from({ length: length + 2 }, (_, c) => (c < 1 || c > length ? 0 : own(c)));
  return { length, branch, ring, aromatic, used, taken: new Set(), multiple: 0 };
}

/**
 * The higher carbon of a bond: the next one, or carbon 1 for bond n of a ring.
 *
 * @param {ChainModel} chain - The chain or ring.
 * @param {number} value - The bond's locant.
 * @returns {number} The other carbon's locant.
 */
function otherEnd(chain, value) {
  return chain.ring && value === chain.length ? 1 : value + 1;
}

/**
 * The bonds between carbons of a chain (n − 1) or a ring (n).
 *
 * @param {ChainModel} chain - The chain or ring.
 * @returns {number} The count.
 */
function bondCount(chain) {
  return chain.ring ? chain.length : chain.length - 1;
}

/**
 * Adds a bond order to a carbon slot's value or to both carbons of a bond
 * slot's value (sign −1 takes it back).
 *
 * @param {ChainModel} chain - The chain or ring.
 * @param {'carbon'|'phenylCarbon'|'bond'|'ringBond'} role - Slot role.
 * @param {number} value - The locant.
 * @param {number} amount - Bond order per carbon.
 * @param {1|-1} sign - Add or take back.
 * @returns {void}
 */
function apply(chain, role, value, amount, sign) {
  chain.used[value] += sign * amount;
  if (isBondRole(role)) {
    chain.used[otherEnd(chain, value)] += sign * amount;
    if (sign > 0) {
      chain.taken.add(value);
    } else {
      chain.taken.delete(value);
    }
  }
} // End of function apply()

/**
 * Records the slots of one locant list on a chain: a supplied or implicit
 * slot adds its bond order now; left-out slots become one group per tile
 * range (the identical occurrences of one prefix or segment).
 *
 * @param {{chains: ChainModel[], groups: SlotGroup[], index: Map<object, number>}} model - The search model.
 * @param {object[]} slots - Slots (interpret.js).
 * @param {{role: 'carbon'|'phenylCarbon'|'bond'|'ringBond', chain: number, amount: number}} kind - What they number and add.
 * @returns {void}
 */
function addSlots(model, slots, kind) {
  const chain = model.chains[kind.chain];
  let group = null;
  for (const slot of slots) {
    if (slot.kind !== 'leftOut') {
      apply(chain, kind.role, slot.value, kind.amount, 1);
      continue;
    }
    if (!group || group.tiles[0] !== slot.tiles[0] || group.tiles[1] !== slot.tiles[1]) {
      group = { ...kind, distinct: isBondRole(kind.role), domain: slot.domain, indices: [], tiles: slot.tiles };
      model.groups.push(group);
    }
    group.indices.push(model.index.get(slot));
  } // End of the loop over the slots
} // End of function addSlots()

/**
 * Adds a chain or ring to the model with its multiple bonds and,
 * recursively, the prefixes hanging from it and their own chains (a branch
 * is modelled once: every occurrence of a multiplied prefix shares its
 * substituent).
 *
 * @param {{chains: ChainModel[], groups: SlotGroup[], index: Map<object, number>}} model - The search model.
 * @param {{kind: string, length: number, double: object[], triple: object[], prefixes: object[]}} owner - ParentSpec (with
 *   the name's prefixes), chain, ring or phenyl SubstituentSpec.
 * @param {boolean} branch - A branch's chain.
 * @returns {number} The chain's index.
 */
function addChain(model, owner, branch) {
  const ring = isRing(owner.kind);
  const id = model.chains.push(chainModel(owner.length, branch, ring, isAromatic(owner.kind))) - 1;
  for (const [order, slots] of [[2, owner.double], [3, owner.triple]]) {
    model.chains[id].multiple += slots.length;
    addSlots(model, slots, { role: ring ? 'ringBond' : 'bond', chain: id, amount: order - 1 });
  }
  for (const prefix of owner.prefixes) {
    const sub = prefix.substituent;
    // `carbon`, or `phenylCarbon` on a phenyl (interpret.js gives every slot of one prefix the same role).
    addSlots(model, prefix.slots, { role: prefix.slots[0].role, chain: id, amount: attachmentOrder(sub) });
    if (sub.kind !== 'retained') {
      const own = addChain(model, sub, true);
      addSlots(model, [sub.freeValence.slot], { role: 'carbon', chain: own, amount: sub.freeValence.order });
    }
  } // End of the loop over the prefixes
  return id;
} // End of function addChain()

/**
 * The search model of a NameSpec: its chains with what the supplied and
 * implicit locants already use, and its groups of left-out slots in tile
 * order.
 *
 * @param {object} spec - A NameSpec (interpret.js).
 * @returns {{chains: ChainModel[], groups: SlotGroup[], index: Map<object, number>}} The model.
 */
function modelOf(spec) {
  const model = { chains: [], groups: [], index: new Map(spec.leftOut.map((slot, i) => [slot, i])) };
  addChain(model, { ...spec.parent, prefixes: [...spec.prefixes, ...templateGroups(spec)] }, false); // A template's groups too (R-4c).
  model.groups.sort((p, q) => p.indices[0] - q.indices[0]);
  return model;
}

/**
 * The identical-occurrence groups of a NameSpec's left-out slots, in tile
 * order (exported for the tests).
 *
 * @param {object} spec - A NameSpec.
 * @returns {{role: string, distinct: boolean, domain: [number, number], indices: number[], tiles: [number, number]}[]} The groups.
 */
export function slotGroups(spec) {
  return modelOf(spec).groups.map(({ role, distinct, domain, indices, tiles }) => ({ role, distinct, domain, indices, tiles }));
}

/**
 * Tells whether a group's next slot can take a value: room on the carbon
 * (or on both carbons of a free bond).
 *
 * @param {ChainModel} chain - The chain or ring.
 * @param {SlotGroup} group - The group.
 * @param {number} value - The candidate locant.
 * @returns {boolean} True when it fits.
 */
function fits(chain, group, value) {
  const free = (c) => CARBON_VALENCE - chain.used[c];
  if (!isBondRole(group.role)) {
    return free(value) >= group.amount;
  }
  return !chain.taken.has(value) && free(value) >= group.amount && free(otherEnd(chain, value)) >= group.amount;
}

/**
 * How many of a group's slots could still go at `from` or above, ignoring
 * the other slots still to place (an upper bound, so pruning on it is
 * sound): the free valence of each carbon divided by the order each slot
 * adds, or the free bonds with room on both carbons.
 *
 * @param {ChainModel} chain - The chain.
 * @param {SlotGroup} group - The group.
 * @param {number} from - The lowest locant left.
 * @returns {number} The room.
 */
function room(chain, group, from) {
  let total = 0;
  for (let value = from; value <= group.domain[1]; value += 1) {
    if (!isBondRole(group.role)) {
      total += Math.max(0, Math.floor((CARBON_VALENCE - chain.used[value]) / group.amount));
    } else if (fits(chain, group, value)) {
      total += 1;
    }
  }
  return total;
} // End of function room()

/**
 * Enumerates the valid placements depth first: the groups in tile order,
 * each group's values as a sorted multiset (non-decreasing for carbons,
 * increasing for bonds), checked and pruned as each value is placed.
 *
 * @param {{chains: ChainModel[], groups: SlotGroup[]}} model - The search model (its counts are restored on return).
 * @param {number} count - Left-out slots in the NameSpec.
 * @param {(values: number[]) => boolean} visit - Receives each placement (one value per `spec.leftOut` entry); false stops.
 * @param {() => boolean} tick - Called at every step; false stops (the clock).
 * @returns {boolean} False when stopped.
 */
function enumerate(model, count, visit, tick) {
  const values = new Array(count);
  /**
   * Places the slots of a group from one slot on, then the next groups.
   *
   * @param {number} g - Group index.
   * @param {number} s - Slot index in the group.
   * @param {number} from - Lowest value this slot may take.
   * @returns {boolean} False when stopped.
   */
  const place = (g, s, from) => {
    if (!tick()) {
      return false;
    }
    if (g === model.groups.length) {
      return visit(values.slice());
    }
    const group = model.groups[g];
    if (s === group.indices.length) {
      return place(g + 1, 0, g + 1 < model.groups.length ? model.groups[g + 1].domain[0] : 0);
    }
    const chain = model.chains[group.chain];
    const left = group.indices.length - s;
    for (let value = from; value <= group.domain[1]; value += 1) {
      if (room(chain, group, value) < left) {
        break; // The room only shrinks as the value grows.
      }
      if (!fits(chain, group, value)) {
        continue;
      }
      apply(chain, group.role, value, group.amount, 1);
      values[group.indices[s]] = value;
      const go = place(g, s + 1, group.distinct ? value + 1 : value);
      apply(chain, group.role, value, group.amount, -1);
      if (!go) {
        return false;
      }
    } // End of the loop over the values of one slot
    return true;
  }; // End of function place()
  return place(0, 0, model.groups.length > 0 ? model.groups[0].domain[0] : 0);
} // End of function enumerate()

/**
 * A structural error (build.js shape).
 *
 * @param {string} code - Error code.
 * @param {string} message - Spanish message.
 * @param {[number, number]} tiles - Tile range `[from, to)`.
 * @returns {{code: string, message: string, tiles: [number, number]}} The error.
 */
function searchError(code, message, tiles) {
  return { code, message, tiles: [tiles[0], tiles[1]] };
}

/**
 * SAME_BOND when some chain or ring has more multiple bonds than bonds
 * (`propatrieno`, `ciclopropatetraeno`): no placement can give each its own
 * bond. The tiles are those of its first left-out bond group.
 *
 * @param {{chains: ChainModel[], groups: SlotGroup[]}} model - The search model.
 * @returns {object|null} The error, or null.
 */
function crowdedBonds(model) {
  for (const group of model.groups) {
    const chain = model.chains[group.chain];
    const count = bondCount(chain);
    if (isBondRole(group.role) && chain.multiple > count) {
      const noun = (chain.ring && 'el anillo') || (chain.branch ? 'la rama' : 'la cadena');
      const bonds = count === 1 ? '1 enlace' : `${count} enlaces`;
      return searchError('SAME_BOND', `No caben tantos enlaces múltiples: ${noun} de ${chain.length} carbonos solo tiene `
        + `${bonds} entre carbonos.`, group.tiles);
    }
  }
  return null;
} // End of function crowdedBonds()

/**
 * The placement that puts every group at its lowest values (multiple bonds
 * on the lowest free bonds), whatever the valence: its build() shows the
 * error of supplied locants that already overload a carbon.
 *
 * @param {{chains: ChainModel[], groups: SlotGroup[]}} model - The search model.
 * @param {number} count - Left-out slots.
 * @returns {number[]} One value per left-out slot.
 */
function lowestPlacement(model, count) {
  const values = new Array(count);
  for (const group of model.groups) {
    const chain = model.chains[group.chain];
    let value = group.domain[0];
    for (const index of group.indices) {
      while (group.distinct && chain.taken.has(value)) {
        value += 1;
      }
      values[index] = value;
      value += group.distinct ? 1 : 0;
    }
  } // End of the loop over the groups
  return values;
} // End of function lowestPlacement()

/**
 * The VALENCE error of a name whose left-out slots fit nowhere, over the
 * tiles of every left-out slot.
 *
 * @param {object} spec - A NameSpec.
 * @returns {{code: string, message: string, tiles: [number, number]}} The error.
 */
function noRoom(spec) {
  const slots = spec.leftOut.length > 0 ? spec.leftOut : [spec];
  const from = Math.min(...slots.map((slot) => slot.tiles[0]));
  const to = Math.max(...slots.map((slot) => slot.tiles[1]));
  return searchError('VALENCE', `No caben: pongas donde pongas lo que va sin número, algún carbono tendría más de `
    + `${CARBON_VALENCE} enlaces.`, [from, to]);
}

/**
 * One structure the name can describe: the placements that give it, the
 * build of the first one and the engine's naming (or refusal), with the
 * graph that naming refers to.
 *
 * @typedef {object} Structure
 * @property {string} key - aromaticKey() of the molecule (its canonicalKey() when it has no benzene ring).
 * @property {number[][]} placements - Its placements, in the order found (one value per `spec.leftOut` entry).
 * @property {object} built - build() of `placements[0]` (ok).
 * @property {object|null} naming - The namer's result (`ok` false for a refusal); null when the budget ran out first.
 * @property {object|null} molecule - The graph `naming` was computed on (the cache's private copy; its atom and bond
 *   ids are the ones `naming` cites): a copy of `built.molecule` when this search named the structure, else the
 *   graph of whichever build was named first under the shared cache. Read-only; null when not named.
 */

/**
 * One entry of the naming cache: a naming and the graph it refers to.
 *
 * @typedef {object} CacheEntry
 * @property {object} naming - The namer's result.
 * @property {object} molecule - A private copy of the molecule named (the ids `naming` cites); never handed out.
 */

/**
 * Searches the placements of a NameSpec's left-out slots, merges them by
 * structure and names each structure once (design.md §15.5.3 steps 2–4).
 * A NameSpec without left-out slots gives its one placement `[]`.
 *
 * @param {object} spec - A NameSpec (interpret.js).
 * @param {{namer: (mol: object) => object, budget?: {placements?: number, namings?: number, ms?: number},
 *   now?: () => number, cache?: Map<string, CacheEntry>}} options - The naming function; limits (default
 *   SEARCH_BUDGET, any subset); the clock in milliseconds (default Date.now); a naming cache by structural key
 *   to share between searches (default a new one).
 * @returns {{status: 'complete'|'budget'|'none', structures: Structure[], error: object|null, placements: number,
 *   namings: number, deadline: number}} `complete`: every structure, each named, within the time limit; `budget`: a
 *   limit was reached (the structures found so far, maybe unnamed — never a verdict); `none`: no valid placement,
 *   with the structural error (or build.js ringRefusal()'s RING_SYSTEM refusal). `placements` and `namings` count the placements built and the namer calls;
 *   `deadline` is the clock reading past which the time limit is spent (the first reading plus `ms`).
 */
export function searchStructures(spec, options) {
  const budget = { ...SEARCH_BUDGET, ...(options.budget || {}) };
  const now = options.now || Date.now;
  const cache = options.cache || new Map();
  const start = now();
  const result = { status: 'complete', structures: [], error: null, placements: 0, namings: 0, deadline: start + budget.ms };
  /**
   * Ends the search as `none` with an error.
   *
   * @param {object} error - The structural error.
   * @returns {object} The result.
   */
  const none = (error) => ({ ...result, status: 'none', error });
  const early = checkSpec(spec) || ringRefusal(spec); // No placement of a name with too many rings has a key.
  if (early) {
    return none(early);
  }
  const model = modelOf(spec);
  const crowded = crowdedBonds(model);
  if (crowded) {
    return none(crowded);
  }
  if (model.chains.some((chain) => chain.used.some((used) => used > CARBON_VALENCE))) {
    const built = build(spec, lowestPlacement(model, spec.leftOut.length));
    if (!built.ok) {
      return none(built.error); // The supplied locants alone overload a carbon.
    }
  }
  /**
   * Tells whether the time budget still holds; marks the result otherwise.
   *
   * @returns {boolean} True while there is time left.
   */
  const inTime = () => {
    if (now() > result.deadline) {
      result.status = 'budget';
      return false;
    }
    return true;
  };
  const byKey = new Map();
  let firstError = null;
  /**
   * Builds one placement and files it under its structure.
   *
   * @param {number[]} values - The placement.
   * @returns {boolean} False when the placement budget is spent.
   */
  const visit = (values) => {
    if (result.placements >= budget.placements) {
      result.status = 'budget';
      return false;
    }
    result.placements += 1;
    const built = build(spec, values);
    if (!built.ok) {
      firstError = firstError || built.error; // TOO_BIG: the placement lengthens the parent past MAX_CHAIN.
      return true;
    }
    const key = aromaticKey(built.molecule); // Both Kekulé drawings of a benzene ring are one structure (R-4b).
    if (!byKey.has(key)) {
      byKey.set(key, { key, placements: [], built, naming: null, molecule: null });
      result.structures.push(byKey.get(key));
    }
    byKey.get(key).placements.push(values);
    return true;
  }; // End of function visit()
  enumerate(model, spec.leftOut.length, visit, inTime);
  if (result.status === 'budget') {
    return result;
  }
  if (result.structures.length === 0) {
    return none(firstError || noRoom(spec));
  }
  for (const structure of result.structures) {
    if (!cache.has(structure.key)) {
      if (result.namings >= budget.namings || !inTime()) {
        result.status = 'budget';
        break;
      }
      result.namings += 1;
      // The copy is taken before naming, in case the namer touches its input; the ids, which the naming cites, are kept.
      const molecule = cloneMolecule(structure.built.molecule);
      cache.set(structure.key, { naming: options.namer(structure.built.molecule), molecule });
    }
    const entry = cache.get(structure.key);
    structure.naming = entry.naming;
    structure.molecule = entry.molecule;
  } // End of the loop that names the structures
  if (result.status === 'complete') {
    inTime(); // The last naming may have spent the time left: then `budget` (inTime() marks it), never a verdict.
  }
  return result;
} // End of function searchStructures()

/**
 * The student's reading of one placement of a named structure, on the
 * graph the naming was computed on (readName()'s drawn molecule, design.md
 * §15.5.3): a copy of `structure.molecule`, and the placement's build.js
 * `studentParent` and `prefixAtoms` with every atom and bond id carried
 * through an isomorphism from the placement's build to that graph, every
 * list keeping its order (the student's locant order, each branch's own
 * build order).
 *
 * Why the molecule follows the naming, not the placement: several
 * placements (and, under a shared cache, other searches' builds) give one
 * structure, but it is named once, on one graph, and the naming cites that
 * graph's ids everywhere — `parent`, every `parts` entry, the trace
 * candidates and their `key` strings, a refusal's `atoms`. Remapping the
 * naming onto the placement's build would mean knowing every place an id
 * hides in the engine's result (some inside strings), which later families
 * keep extending; the student's reading has a small, fixed shape. Either
 * way the placement drawn keeps the student's numbering. When the graph is
 * a copy of the build itself, the ids map onto themselves (isomorphism()
 * tries equal ids first). The isomorphism is taken up to the Kekulé drawing
 * of the benzene rings (model/graph.js aromaticIsomorphism(), R-4b): two
 * placements of one structure may put the ring's double bonds on other
 * bonds relative to the branches (`1,2-` and `1,6-dimetilbenceno`), so a
 * double bond of the build may map onto a single bond of the named graph.
 *
 * @param {object} spec - The NameSpec searched.
 * @param {Structure} structure - A named structure of its search.
 * @param {number[]} placement - One of the structure's placements.
 * @returns {{molecule: object, studentParent: {atoms: number[], bonds: number[]}, prefixAtoms: object[]}} The
 *   verdict's own copy of the named graph (the cache's is never handed out) and the reading in its ids.
 * @throws {Error} When the build is not isomorphic to the named graph (never: they share a structural key).
 */
export function placementReading(spec, structure, placement) {
  const built = placement === structure.placements[0] ? structure.built : build(spec, placement);
  const iso = aromaticIsomorphism(built.molecule, structure.molecule);
  if (!iso) {
    throw new Error('placementReading: a placement is not isomorphic to the graph named for its structure');
  }
  const atom = (id) => iso.atoms.get(id);
  const bond = (id) => iso.bonds.get(id);
  return {
    molecule: cloneMolecule(structure.molecule),
    studentParent: { atoms: built.studentParent.atoms.map(atom), bonds: built.studentParent.bonds.map(bond) },
    prefixAtoms: built.prefixAtoms.map((occurrence) => ({
      ...occurrence,
      parentAtom: atom(occurrence.parentAtom),
      attachment: atom(occurrence.attachment),
      bond: bond(occurrence.bond),
      atoms: occurrence.atoms.map(atom),
      bonds: occurrence.bonds.map(bond),
    })),
  };
} // End of function placementReading()

/**
 * The ways of filling a NameSpec's left-out locants worth comparing with
 * the engine's names (design.md §15.5.3 step 6, phase R-4a): every list
 * filled first; then, when the student left them out, the name-level
 * prefix lists kept without locants (`prefixes`), the parent's
 * multiple-bond lists kept without locants (`parent`), and both. The engine
 * omits each of those two kinds of locants all together or not at all
 * (render.js renderPrefixes() / renderEnding(): `metilciclohexano`,
 * `ciclohexeno`), so a student who left out those and another list too —
 * `(buten-3-in-1-il)ciclopropano` — is still told the name
 * `(but-1-en-3-in-1-il)ciclopropano`. A branch's own locants are always
 * filled (the engine omits none with more than one possible value).
 *
 * @param {object} spec - A NameSpec.
 * @returns {{prefixes: boolean, parent: boolean}[]} The lists to keep without locants, one entry per way, every list
 *   filled first.
 */
export function fillVariants(spec) {
  const leftOut = (slots) => slots.some((slot) => slot.kind === 'leftOut' && slot.domain[0] !== slot.domain[1]);
  const prefixes = spec.prefixes.some((prefix) => leftOut(prefix.slots));
  const parent = leftOut([...spec.parent.double, ...spec.parent.triple]);
  return [
    { prefixes: false, parent: false },
    ...(prefixes ? [{ prefixes: true, parent: false }] : []),
    ...(parent ? [{ prefixes: false, parent: true }] : []),
    ...(prefixes && parent ? [{ prefixes: true, parent: true }] : []),
  ];
} // End of function fillVariants()

/**
 * Writes a placement into the student's syntax tree: each prefix or
 * segment without locants gets number tiles with its slots' values, in
 * increasing order (design.md §15.5.3 step 6), except the lists a
 * fillVariants() entry keeps without locants. A slot whose domain holds
 * one value is not written: no name cites it (`etenil`, `etinil`, `eteno`,
 * never `et-1-enil`), so it is not a missing locant. The new tiles are
 * appended to the tree's tile list; the student's tiles are untouched. The
 * left-out lists are found by their tile range alone, which no two lists
 * share (a prefix's range ends with its branch, a segment's with its
 * ending), whatever their role (`carbon`, `phenylCarbon`, `bond`,
 * `ringBond`); `benceno` (R-4b) has no list of its own, and `xileno` (R-4c)
 * gets its methyls' positions before it (`1,2-xileno`), its list found by
 * the template tile's range. A letter is never left out.
 *
 * @param {object} tree - The error-free parse() tree the NameSpec was read from.
 * @param {object} spec - Its NameSpec.
 * @param {number[]} placement - One value per `spec.leftOut` entry.
 * @param {{prefixes?: boolean, parent?: boolean}} [keep] - Keep the name-level prefix lists (`prefixes`) or the
 *   parent's multiple-bond lists (`parent`) without locants (default: fill every list).
 * @returns {object} A tree for assemble.js.
 */
export function filledTree(tree, spec, placement, keep = {}) {
  const kept = new Set([
    ...(keep.prefixes ? spec.prefixes.flatMap((prefix) => prefix.slots) : []),
    ...(keep.parent ? [...spec.parent.double, ...spec.parent.triple] : []),
  ]);
  const byRange = new Map();
  spec.leftOut.forEach((slot, i) => {
    if (slot.domain[0] !== slot.domain[1] && !kept.has(slot)) {
      const key = `${slot.tiles[0]}:${slot.tiles[1]}`;
      byRange.set(key, [...(byRange.get(key) || []), placement[i]]);
    }
  });
  const tiles = [...tree.tiles];
  /**
   * The values of a left-out locant list as new number tiles.
   *
   * @param {[number, number]} range - The node's tile range.
   * @param {number[]} locants - The node's own locant tiles.
   * @returns {number[]} The locant tile indices.
   */
  const numbers = (range, locants) => {
    const values = locants.length === 0 ? byRange.get(`${range[0]}:${range[1]}`) : null;
    if (!values) {
      return locants;
    }
    return [...values].sort((p, q) => p - q).map((value) => tiles.push(NUM_TILES.get(value)) - 1);
  };
  /**
   * A chain node with its segments filled (ring bonds for a ring); `benceno` and a template as they are.
   *
   * @param {object} chain - A chain, benzene or template node.
   * @returns {object} The filled node.
   */
  const fillChain = (chain) => {
    if (chain.type === 'benzene' || chain.type === 'template') {
      return chain;
    }
    return { ...chain, segments: chain.segments.map((seg) => ({ ...seg, locants: numbers(seg.range, seg.locants) })) };
  };
  /**
   * A substituent node, filled.
   *
   * @param {object} node - A chain, retained or branch node.
   * @returns {object} The filled node.
   */
  const fillSubstituent = (node) => {
    if (node.type === 'chain') {
      return fillChain(node);
    }
    return node.type === 'branch' ? { ...node, items: node.items.map(fillItem), chain: node.chain && fillSubstituent(node.chain) } : node;
  };
  /**
   * A prefix node with its locants and substituent filled.
   *
   * @param {object} item - A prefix node.
   * @returns {object} The filled node.
   */
  function fillItem(item) {
    return { ...item, locants: numbers(item.range, item.locants), substituent: fillSubstituent(item.substituent) };
  }
  const items = tree.items.map(fillItem);
  const { parent } = tree;
  const legacy = parent.chain.type === 'template' ? numbers(parent.chain.range, parent.legacy) : parent.legacy;
  return { ...tree, tiles, items, parent: { ...parent, legacy, chain: fillChain(parent.chain) } };
} // End of function filledTree()
