/**
 * @file Interpreter of «¿Cómo se dibuja?» (design.md §15.4, §15.5.3; phase
 * R-1b): turns the lossless syntax tree of parse.js into a `NameSpec`, the
 * language-neutral reading of the name — which chain, which multiple bonds,
 * which branches on which carbons — with no atom ids and no chemistry
 * checks (ranges, valence and size are build.js's). Pure, no DOM.
 *
 * Every locant position of the name is a **slot** typed by how the student
 * gave it (design.md §15.5.3 step 2):
 *
 * - `supplied` — written by the student (a number tile), also the
 *   old-style locants written before the root (`2-buteno`), which belong to
 *   the one segment without locants of their own (parse.js
 *   `legacySegment`); the name is then marked `oldStyle`;
 * - `implicit` — given by rule: `il` / `iliden` without a locant puts the
 *   free valence at the branch's carbon 1;
 * - `leftOut` — not written: a prefix or a segment without its locants.
 *   build.js needs a value for each, the *placement*, which search.js
 *   searches (R-1c).
 *
 * Each slot carries the tile range it comes from (`[from, to)`, as the
 * parser's ranges: the number tile of a supplied locant, the `il` / `iliden`
 * tile of an implicit one, the prefix or segment that lacks its locants for
 * a left-out one), its role (`carbon` for a prefix's or a free valence's
 * position, `bond` for a multiple bond, numbered by its lower carbon) and
 * the domain of that role on its chain, `[min, max]` inclusive, from
 * search.js slotDomain(): carbons 1…n, chain bonds 1…n−1 (empty on a
 * one-carbon chain).
 */

import { slotDomain } from './search.js';

/**
 * A locant position (design.md §15.4).
 *
 * @typedef {object} Slot
 * @property {'supplied'|'implicit'|'leftOut'} kind - How the student gave it.
 * @property {number} [value] - The locant (supplied and implicit slots only).
 * @property {'carbon'|'bond'} role - What the locant numbers.
 * @property {[number, number]} domain - Values the role allows on its chain, `[min, max]` inclusive (min > max when none).
 * @property {[number, number]} tiles - Tile range `[from, to)` it comes from.
 */

/**
 * A group of identical prefixes: `2,3-dimetil` is one PrefixSpec with two
 * slots.
 *
 * @typedef {object} PrefixSpec
 * @property {Slot[]} slots - One carbon slot per occurrence, in the student's order.
 * @property {{count: number, compound: boolean}} multiplier - The student's multiplier (count 1 without one; `compound` for bis, tris…).
 * @property {SubstituentSpec} substituent - The branch, shared by every occurrence.
 * @property {[number, number]} tiles - Tile range of the whole prefix.
 */

/**
 * A branch: a chain with its free valence (and, for a compound branch,
 * its own prefixes) or a retained word (isopropil, isopropiliden,
 * tert-butil; build.js knows their atoms).
 *
 * @typedef {object} SubstituentSpec
 * @property {'chain'|'retained'} kind - A numbered chain or a retained word.
 * @property {number|null} length - Carbons of the chain (null for a retained word).
 * @property {{slot: Slot, order: 1|2}|null} freeValence - Where the branch attaches and with which bond order (`il` 1, `iliden` 2); null for a retained word.
 * @property {Slot[]} double - Double-bond slots of the branch's chain.
 * @property {Slot[]} triple - Triple-bond slots of the branch's chain.
 * @property {PrefixSpec[]} prefixes - Prefixes of a compound branch, numbered on its own chain.
 * @property {string|null} retained - Retained-name id (lexicon RETAINED_PREFIXES key), or null.
 * @property {{text: string, tiles: [number, number]}|null} word - The retained word as on its tile and its tile range (for messages), or null.
 * @property {boolean} compound - Written as a compound branch (START … END).
 * @property {[number, number]} tiles - Tile range of the branch.
 */

/**
 * The parent chain.
 *
 * @typedef {object} ParentSpec
 * @property {'chain'} kind - Only open chains in R-1.
 * @property {number} length - Carbons.
 * @property {Slot[]} double - Double-bond slots.
 * @property {Slot[]} triple - Triple-bond slots.
 * @property {[number, number]} tiles - Tile range of the parent (old-style locants included).
 */

/**
 * The reading of a whole name (design.md §15.4).
 *
 * @typedef {object} NameSpec
 * @property {ParentSpec} parent - The parent chain.
 * @property {PrefixSpec[]} prefixes - The prefixes in the student's order.
 * @property {null} suffix - Principal characteristic group (from R-5a; none for hydrocarbons).
 * @property {null} classWord - `ácido`… (from R-5d; none for hydrocarbons).
 * @property {null} ester - The O-bound side of an ester (from R-6a).
 * @property {null} traditional - A traditional name tile (from R-4).
 * @property {boolean} oldStyle - Old-style locants before the root (`2-buteno`).
 * @property {[number, number]} tiles - The whole tile range.
 * @property {Slot[]} leftOut - Every left-out slot, in tile order: the placement of build.js gives one value per entry.
 */

/**
 * Creates a slot.
 *
 * @param {'supplied'|'implicit'|'leftOut'} kind - Slot kind.
 * @param {number|null} value - The locant, or null for a left-out slot.
 * @param {'carbon'|'bond'} role - What it numbers.
 * @param {number} length - Carbons of the chain it numbers.
 * @param {[number, number]} tiles - Tile range.
 * @returns {Slot} The slot.
 */
function makeSlot(kind, value, role, length, tiles) {
  const slot = { kind, role, domain: slotDomain(role, length), tiles: [tiles[0], tiles[1]] };
  if (value !== null) {
    slot.value = value;
  }
  return slot;
}

/**
 * The slots of one locant list: one supplied slot per number tile, or as
 * many left-out slots as the multiplier says when the list is missing.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {number[]} locants - Number tile indices (may be empty).
 * @param {number} count - How many slots the multiplier asks for.
 * @param {'carbon'|'bond'} role - What they number.
 * @param {number} length - Carbons of the chain they number.
 * @param {[number, number]} missing - Tile range a left-out slot points at.
 * @returns {Slot[]} The slots.
 */
function locantSlots(ctx, locants, count, role, length, missing) {
  if (locants.length > 0) {
    return locants.map((index) => makeSlot('supplied', ctx.tiles[index].value, role, length, [index, index + 1]));
  }
  const slots = Array.from({ length: count }, () => makeSlot('leftOut', null, role, length, missing));
  ctx.leftOut.push(...slots);
  return slots;
}

/**
 * The multiplier of a prefix or segment as the student wrote it.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number|null} index - Multiplier tile index, or null.
 * @returns {{count: number, compound: boolean}} Its count (1 without one) and whether it is bis, tris…
 */
function multiplierOf(tiles, index) {
  return index === null ? { count: 1, compound: false } : { count: tiles[index].value, compound: tiles[index].kind === 'cmult' };
}

/**
 * The double- and triple-bond slots of a chain's unsaturation segments, in
 * tile order; the old-style locants go to the segment they belong to.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} chain - A chain node (parse.js).
 * @param {number} length - Its carbons.
 * @param {{locants: number[], segment: number|null}} legacy - Old-style locants and their segment (none for a branch).
 * @returns {{double: Slot[], triple: Slot[]}} The slots by bond order.
 */
function segmentSlots(ctx, chain, length, legacy) {
  const out = { double: [], triple: [] };
  chain.segments.forEach((segment, i) => {
    const locants = i === legacy.segment ? legacy.locants : segment.locants;
    const { count } = multiplierOf(ctx.tiles, segment.multiplier);
    const slots = locantSlots(ctx, locants, count, 'bond', length, segment.range);
    out[ctx.tiles[segment.ending].value].push(...slots); // 'double' | 'triple' (the ENDINGS keys)
  });
  return out;
} // End of function segmentSlots()

/**
 * The SubstituentSpec of a chain branch: its prefixes (compound branch),
 * its multiple bonds, then its free valence, in tile order.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} chain - The branch's chain node (with `fv`).
 * @param {object[]} items - The prefix nodes of a compound branch (empty for a simple one).
 * @param {boolean} compound - Written between START and END.
 * @param {[number, number]} range - Tile range of the branch.
 * @returns {SubstituentSpec} The branch.
 */
function chainSubstituent(ctx, chain, items, compound, range) {
  const { tiles } = ctx;
  const length = tiles[chain.root].value;
  const prefixes = items.map((item) => prefixSpec(ctx, item, length));
  const bonds = segmentSlots(ctx, chain, length, { locants: [], segment: null });
  const fvTile = [chain.fv, chain.fv + 1];
  const slot = chain.fvLocants.length > 0
    ? makeSlot('supplied', tiles[chain.fvLocants[0]].value, 'carbon', length, [chain.fvLocants[0], chain.fvLocants[0] + 1])
    : makeSlot('implicit', 1, 'carbon', length, fvTile); // `il` without a locant: carbon 1 by rule
  return {
    kind: 'chain',
    length,
    freeValence: { slot, order: tiles[chain.fv].value },
    double: bonds.double,
    triple: bonds.triple,
    prefixes,
    retained: null,
    word: null,
    compound,
    tiles: [range[0], range[1]],
  };
} // End of function chainSubstituent()

/**
 * The SubstituentSpec of a retained word, alone or as the own chain of a
 * compound branch (whose prefixes build.js then refuses: a retained word
 * has no numbering of its own).
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {number} tile - The retained tile index.
 * @param {object[]} items - Prefix nodes of a compound branch (empty for a bare word).
 * @param {boolean} compound - Written between START and END.
 * @param {[number, number]} range - Tile range of the branch.
 * @returns {SubstituentSpec} The branch.
 */
function retainedSubstituent(ctx, tile, items, compound, range) {
  return {
    kind: 'retained',
    length: null,
    freeValence: null,
    double: [],
    triple: [],
    prefixes: items.map((item) => prefixSpec(ctx, item, 0)),
    retained: ctx.tiles[tile].value,
    word: { text: ctx.tiles[tile].text, tiles: [tile, tile + 1] },
    compound,
    tiles: [range[0], range[1]],
  };
} // End of function retainedSubstituent()

/**
 * The SubstituentSpec of a prefix's substituent node.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} node - A chain, retained or branch node (parse.js).
 * @returns {SubstituentSpec} The branch.
 */
function substituentSpec(ctx, node) {
  if (node.type === 'retained') {
    return retainedSubstituent(ctx, node.tile, [], false, node.range);
  }
  if (node.type === 'chain') {
    return chainSubstituent(ctx, node, [], false, node.range);
  }
  const own = node.chain;
  return own.type === 'retained'
    ? retainedSubstituent(ctx, own.tile, node.items, true, node.range)
    : chainSubstituent(ctx, own, node.items, true, node.range);
} // End of function substituentSpec()

/**
 * The PrefixSpec of a prefix node: its carbon slots on the chain it hangs
 * from, its multiplier and its substituent.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} node - A prefix node (parse.js) with a complete substituent.
 * @param {number} length - Carbons of the chain the prefix hangs from.
 * @returns {PrefixSpec} The prefix.
 */
function prefixSpec(ctx, node, length) {
  const multiplier = multiplierOf(ctx.tiles, node.multiplier);
  const slots = locantSlots(ctx, node.locants, multiplier.count, 'carbon', length, node.range);
  return { slots, multiplier, substituent: substituentSpec(ctx, node.substituent), tiles: [node.range[0], node.range[1]] };
}

/**
 * Tells whether a tree is one interpret() accepts: a parent, no tile out of
 * place, every prefix complete (what an error-free parse gives).
 *
 * @param {object} tree - A parse() tree.
 * @returns {boolean} True when it can be interpreted.
 */
function isComplete(tree) {
  return Boolean(tree.parent) && tree.trailing.length === 0
    && tree.items.every((item) => item.type === 'prefix' && Boolean(item.substituent));
}

/**
 * Reads a syntax tree as a NameSpec (design.md §15.4, §15.5.3 steps 1–2).
 *
 * @param {object} tree - The tree of a parse() without errors.
 * @returns {NameSpec} The reading of the name.
 * @throws {Error} When the tree is incomplete (the parser reported errors).
 */
export function interpret(tree) {
  if (!isComplete(tree)) {
    throw new Error('interpret: the tree is incomplete (parse() reported errors)');
  }
  const ctx = { tiles: tree.tiles, leftOut: [] };
  const { chain, legacy, legacySegment } = tree.parent;
  const length = ctx.tiles[chain.root].value;
  const prefixes = tree.items.map((item) => prefixSpec(ctx, item, length));
  const bonds = segmentSlots(ctx, chain, length, { locants: legacy, segment: legacy.length > 0 ? legacySegment : null });
  return {
    parent: { kind: 'chain', length, double: bonds.double, triple: bonds.triple, tiles: [tree.parent.range[0], tree.parent.range[1]] },
    prefixes,
    suffix: null,
    classWord: null,
    ester: null,
    traditional: null,
    oldStyle: legacy.length > 0,
    tiles: [0, tree.tiles.length],
    leftOut: ctx.leftOut,
  };
} // End of function interpret()
