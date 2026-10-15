/**
 * @file Interpreter of «¿Cómo se dibuja?» (design.md §15.4, §15.5.3; phases
 * R-1b, R-4a, R-4b, R-4c, R-5a1): turns the lossless syntax tree of parse.js into a
 * `NameSpec`, the language-neutral reading of the name — which chain or
 * ring, which multiple bonds, which branches on which carbons — with no atom
 * ids and no chemistry checks (ranges, valence and size are build.js's).
 * Pure, no DOM.
 *
 * Every locant position of the name is a **slot** typed by how the student
 * gave it (design.md §15.5.3 step 2):
 *
 * - `supplied` — written by the student (a number tile), also the
 *   old-style locants written before the root (`2-buteno`), which belong to
 *   the one segment without locants of their own (parse.js
 *   `legacySegment`); the name is then marked `oldStyle`; and the positions
 *   an orto/meta/para letter stands for (R-4c: `o-dimetilbenceno` 1 and 2,
 *   `p-metiltolueno` 4, `o-xileno` 1 and 2), each slot of the letter's tile
 *   with `letter` set;
 * - `implicit` — given by rule: `il` / `iliden` without a locant puts the
 *   free valence at the branch's carbon 1 (on a ring branch too:
 *   `ciclohexil`, `ciclohexiliden`), and so does `fenil` (R-4b); a retained
 *   template's groups are at the carbons it says (R-4c: `tolueno` 1,
 *   `mesitileno` 1, 3 and 5);
 * - `leftOut` — not written: a prefix or a segment without its locants.
 *   build.js needs a value for each, the *placement*, which search.js
 *   searches (R-1c).
 *
 * Each slot carries the tile range it comes from (`[from, to)`, as the
 * parser's ranges: the number tile of a supplied locant, the `il` / `iliden`
 * tile of an implicit one, the prefix or segment that lacks its locants for
 * a left-out one), its role (`carbon` for a prefix's or a free valence's
 * position, `phenylCarbon` for a prefix's position on a `fenil` branch,
 * `bond` for a multiple bond of a chain, numbered by its lower carbon,
 * `ringBond` for a multiple bond of a ring, bond n joining carbons n and 1)
 * and the domain of that role on its chain or ring, `[min, max]` inclusive,
 * from search.js slotDomain(): carbons 1…n, the carbons 2…6 of a phenyl
 * (its carbon 1 is bonded to what it hangs from), chain bonds 1…n−1 (empty
 * on a one-carbon chain), ring bonds 1…n.
 *
 * A ring (the `ciclo` tile, R-4a) is read like a chain of its carbons with
 * one more bond: the parent's `kind` and a branch's `kind` are 'ring'. The
 * benzene ring (R-4b) is six carbons whose double bonds are never numbered
 * (build.js draws them): `benceno` is a parent of kind 'benzene', `fenil` a
 * branch of kind 'phenyl', bonded by its carbon 1 by rule, whose own
 * prefixes (`(4-metilfenil)`) are numbered on it.
 *
 * A halogen (R-5a1: `fluoro`, `cloro`, `bromo`, `yodo`) is a branch of kind
 * 'halogen': one atom of its `element`, bonded by a single bond to the
 * carbon its prefix's slot gives, with no chain, free-valence slot or
 * prefixes of its own; its carbon slots are those of any prefix (a prefix's
 * role, `carbon` or `phenylCarbon`), so its left-out locants are searched
 * like a branch's.
 *
 * A retained template (R-4c, tiles.js TEMPLATES: `tolueno`, `estireno`,
 * `xileno`, `mesitileno`) is a benzene parent too, kind 'benzene', whose
 * `template` holds its own groups as PrefixSpecs (a methyl, the ethenyl of
 * `estireno`) at the carbons it places them — `xileno`'s two methyls where
 * the student says, `1,2-xileno` / `o-xileno`, or left out — so build.js and
 * search.js treat them like the student's prefixes on the ring, and the
 * student's prefixes are numbered on the same ring (`4-metiltolueno`: a
 * methyl at 1, by the template, and one at 4). The template is kept apart
 * from `prefixes` (it is not one of the student's prefixes) and named in
 * `traditional`. (design.md §15.4 sketches a ParentSpec kind per template;
 * a benzene kind with a `template` field keeps every benzene rule of R-4b
 * for them unchanged.)
 */

import { slotDomain } from './search.js';
import { TEMPLATES } from './tiles.js';

/**
 * A locant position (design.md §15.4).
 *
 * @typedef {object} Slot
 * @property {'supplied'|'implicit'|'leftOut'} kind - How the student gave it.
 * @property {number} [value] - The locant (supplied and implicit slots only).
 * @property {'carbon'|'phenylCarbon'|'bond'|'ringBond'} role - What the locant numbers.
 * @property {[number, number]} domain - Values the role allows on its chain, `[min, max]` inclusive (min > max when none).
 * @property {[number, number]} tiles - Tile range `[from, to)` it comes from.
 * @property {boolean} [letter] - Given by an orto/meta/para letter (R-4c; a supplied slot).
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
 * A branch: a chain or a ring with its free valence (and, for a compound
 * branch, its own prefixes), a phenyl (`fenil`, R-4b; with prefixes of its
 * own in a compound branch), a retained word (isopropil, isopropiliden,
 * tert-butil; build.js knows their atoms) or a halogen atom (R-5a1).
 *
 * @typedef {object} SubstituentSpec
 * @property {'chain'|'ring'|'phenyl'|'retained'|'halogen'} kind - A numbered chain, a numbered ring (`ciclohexil`), a
 *   benzene ring bonded by its carbon 1 (`fenil`), a retained word or a halogen atom (`cloro`).
 * @property {number|null} length - Carbons of the chain or ring (6 for a phenyl; null for a retained word or a halogen).
 * @property {{slot: Slot, order: 1|2}|null} freeValence - Where the branch attaches and with which bond order (`il` 1, `iliden` 2;
 *   a phenyl's carbon 1, order 1); null for a retained word or a halogen (bonded by a single bond).
 * @property {Slot[]} double - Double-bond slots of the branch's chain or ring.
 * @property {Slot[]} triple - Triple-bond slots of the branch's chain or ring.
 * @property {PrefixSpec[]} prefixes - Prefixes of a compound branch, numbered on its own chain.
 * @property {string|null} retained - Retained-name id (lexicon RETAINED_PREFIXES key; 'phenyl' for a phenyl), or null.
 * @property {{text: string, tiles: [number, number]}|null} word - The retained word or the halogen as on its tile and its
 *   tile range (for messages), or null.
 * @property {string} [element] - A halogen's element symbol ('F', 'Cl', 'Br', 'I'; the tile's value), on a halogen only.
 * @property {boolean} compound - Written as a compound branch (START … END).
 * @property {[number, number]} tiles - Tile range of the branch.
 */

/**
 * The retained template of a benzene parent (R-4c).
 *
 * @typedef {object} TemplateSpec
 * @property {string} value - Its tiles.js TEMPLATES key ('toluene', 'styrene', 'xylene', 'mesitylene').
 * @property {{text: string, tiles: [number, number]}} word - The template word as on its tile and its tile range.
 * @property {PrefixSpec[]} groups - Its own groups on the ring (one PrefixSpec: `xileno`'s two methyls share one).
 */

/**
 * The parent chain or ring.
 *
 * @typedef {object} ParentSpec
 * @property {'chain'|'ring'|'benzene'} kind - An open chain, a ring (`ciclo`, R-4a) or the benzene ring (`benceno`, R-4b;
 *   also a retained template, R-4c).
 * @property {number} length - Carbons.
 * @property {Slot[]} double - Double-bond slots.
 * @property {Slot[]} triple - Triple-bond slots.
 * @property {TemplateSpec|null} template - The retained template (`tolueno`…, R-4c), or null.
 * @property {[number, number]} tiles - Tile range of the parent (old-style locants and a template's locants included).
 */

/**
 * The reading of a whole name (design.md §15.4).
 *
 * @typedef {object} NameSpec
 * @property {ParentSpec} parent - The parent chain or ring.
 * @property {PrefixSpec[]} prefixes - The prefixes in the student's order.
 * @property {null} suffix - Principal characteristic group (from R-5a; none for hydrocarbons).
 * @property {null} classWord - `ácido`… (from R-5d; none for hydrocarbons).
 * @property {null} ester - The O-bound side of an ester (from R-6a).
 * @property {{value: string, tiles: [number, number]}|null} traditional - A traditional name tile: the retained template
 *   (R-4c; its TEMPLATES key and tile range), or null.
 * @property {boolean} oldStyle - Old-style locants before the root (`2-buteno`).
 * @property {[number, number]} tiles - The whole tile range.
 * @property {Slot[]} leftOut - Every left-out slot, in tile order: the placement of build.js gives one value per entry.
 */

/**
 * Creates a slot.
 *
 * @param {'supplied'|'implicit'|'leftOut'} kind - Slot kind.
 * @param {number|null} value - The locant, or null for a left-out slot.
 * @param {'carbon'|'phenylCarbon'|'bond'|'ringBond'} role - What it numbers.
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
 * @param {'carbon'|'phenylCarbon'|'bond'|'ringBond'} role - What they number.
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
 * The slots of an orto/meta/para letter (R-4c, design.md §14.4): the ring
 * carbons 1 and the letter's locant (2 for `o`, 3 for `m`, 4 for `p`),
 * less those a template's own groups already take (`p-metiltolueno`: the
 * methyl of `tolueno` is at 1, the letter's prefix at 4). Supplied, from the
 * letter's tile; parse.js has checked that the counts agree.
 *
 * @param {{tiles: object[]}} ctx - Interpreter context.
 * @param {number} letter - The letter's tile index.
 * @param {number[]} taken - Ring carbons a template's groups take.
 * @param {'carbon'} role - What the slots number.
 * @param {number} length - Carbons of the ring.
 * @returns {Slot[]} The slots, in increasing order.
 */
function letterSlots(ctx, letter, taken, role, length) {
  return [1, ctx.tiles[letter].value].filter((value) => !taken.includes(value))
    .map((value) => ({ ...makeSlot('supplied', value, role, length, [letter, letter + 1]), letter: true }));
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
 * The kind of a chain node: 'ring' with its `ciclo` tile, else 'chain'.
 *
 * @param {object} chain - A chain node (parse.js).
 * @returns {'chain'|'ring'} The kind.
 */
function chainKind(chain) {
  return chain.ring === null ? 'chain' : 'ring';
}

/**
 * The double- and triple-bond slots of a chain's or ring's unsaturation
 * segments, in tile order (role `bond` on a chain, `ringBond` on a ring);
 * the old-style locants go to the segment they belong to.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} chain - A chain node (parse.js).
 * @param {number} length - Its carbons.
 * @param {{locants: number[], segment: number|null}} legacy - Old-style locants and their segment (none for a branch).
 * @returns {{double: Slot[], triple: Slot[]}} The slots by bond order.
 */
function segmentSlots(ctx, chain, length, legacy) {
  const out = { double: [], triple: [] };
  const role = chainKind(chain) === 'ring' ? 'ringBond' : 'bond';
  chain.segments.forEach((segment, i) => {
    const locants = i === legacy.segment ? legacy.locants : segment.locants;
    const { count } = multiplierOf(ctx.tiles, segment.multiplier);
    const slots = locantSlots(ctx, locants, count, role, length, segment.range);
    out[ctx.tiles[segment.ending].value].push(...slots); // 'double' | 'triple' (the ENDINGS keys)
  });
  return out;
} // End of function segmentSlots()

/**
 * The SubstituentSpec of a chain or ring branch: its prefixes (compound
 * branch), its multiple bonds, then its free valence, in tile order.
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
    kind: chainKind(chain),
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

/** Carbons of the benzene ring (`benceno`, `fenil`; R-4b). */
export const BENZENE_LENGTH = 6;

/**
 * The SubstituentSpec of a `fenil` tile (R-4b), alone or as the own chain of
 * a compound branch: the benzene ring bonded by its carbon 1 (implicit, the
 * `fenil` tile), its own prefixes numbered on it (role `phenylCarbon`:
 * carbons 2…6).
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {number} tile - The `fenil` tile index.
 * @param {object[]} items - Prefix nodes of a compound branch (empty for a bare `fenil`).
 * @param {boolean} compound - Written between START and END.
 * @param {[number, number]} range - Tile range of the branch.
 * @returns {SubstituentSpec} The branch.
 */
function phenylSubstituent(ctx, tile, items, compound, range) {
  const prefixes = items.map((item) => prefixSpec(ctx, item, BENZENE_LENGTH, 'phenylCarbon'));
  return {
    kind: 'phenyl',
    length: BENZENE_LENGTH,
    freeValence: { slot: makeSlot('implicit', 1, 'carbon', BENZENE_LENGTH, [tile, tile + 1]), order: 1 },
    double: [],
    triple: [],
    prefixes,
    retained: ctx.tiles[tile].value,
    word: { text: ctx.tiles[tile].text, tiles: [tile, tile + 1] },
    compound,
    tiles: [range[0], range[1]],
  };
} // End of function phenylSubstituent()

/**
 * The SubstituentSpec of a retained word or `fenil` (R-4b), alone or as the
 * own chain of a compound branch.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {number} tile - The retained tile index.
 * @param {object[]} items - Prefix nodes of a compound branch (empty for a bare word).
 * @param {boolean} compound - Written between START and END.
 * @param {[number, number]} range - Tile range of the branch.
 * @returns {SubstituentSpec} The branch.
 */
function wordSubstituent(ctx, tile, items, compound, range) {
  return ctx.tiles[tile].value === 'phenyl'
    ? phenylSubstituent(ctx, tile, items, compound, range)
    : retainedSubstituent(ctx, tile, items, compound, range);
}

/**
 * The SubstituentSpec of a halogen tile (R-5a1): one atom, no chain, no
 * slot or prefix of its own (parse.js never makes it a branch's own chain).
 *
 * @param {{tiles: object[]}} ctx - Interpreter context.
 * @param {number} tile - The halogen tile index.
 * @returns {SubstituentSpec} The branch.
 */
function halogenSubstituent(ctx, tile) {
  return {
    kind: 'halogen',
    length: null,
    freeValence: null,
    double: [],
    triple: [],
    prefixes: [],
    retained: null,
    word: { text: ctx.tiles[tile].text, tiles: [tile, tile + 1] },
    element: ctx.tiles[tile].value,
    compound: false,
    tiles: [tile, tile + 1],
  };
} // End of function halogenSubstituent()

/**
 * The SubstituentSpec of a prefix's substituent node.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} node - A chain, retained, halogen or branch node (parse.js).
 * @returns {SubstituentSpec} The branch.
 */
function substituentSpec(ctx, node) {
  if (node.type === 'halogen') {
    return halogenSubstituent(ctx, node.tile);
  }
  if (node.type === 'retained') {
    return wordSubstituent(ctx, node.tile, [], false, node.range);
  }
  if (node.type === 'chain') {
    return chainSubstituent(ctx, node, [], false, node.range);
  }
  const own = node.chain;
  return own.type === 'retained'
    ? wordSubstituent(ctx, own.tile, node.items, true, node.range)
    : chainSubstituent(ctx, own, node.items, true, node.range);
} // End of function substituentSpec()

/**
 * The PrefixSpec of a prefix node: its carbon slots on the chain it hangs
 * from — its locants, or the positions of its orto/meta/para letter (R-4c,
 * name level only) —, its multiplier and its substituent.
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} node - A prefix node (parse.js) with a complete substituent.
 * @param {number} length - Carbons of the chain the prefix hangs from.
 * @param {'carbon'|'phenylCarbon'} [role] - Role of its carbon slots (default 'carbon'; 'phenylCarbon' on a phenyl).
 * @param {number[]} [taken] - Ring carbons a template's own groups take (for a letter; default none).
 * @returns {PrefixSpec} The prefix.
 */
function prefixSpec(ctx, node, length, role = 'carbon', taken = []) {
  const multiplier = multiplierOf(ctx.tiles, node.multiplier);
  const slots = node.letter === null || node.letter === undefined
    ? locantSlots(ctx, node.locants, multiplier.count, role, length, node.range)
    : letterSlots(ctx, node.letter, taken, role, length);
  return { slots, multiplier, substituent: substituentSpec(ctx, node.substituent), tiles: [node.range[0], node.range[1]] };
}

/**
 * The SubstituentSpec of a template's own group (R-4c): an unbranched chain
 * bonded by its carbon 1, its double bonds at the locants the template says
 * (the ethenyl of `estireno`), every slot implicit, on the template's tile.
 *
 * @param {{length: number, double: number[]}} group - The tiles.js TEMPLATES group.
 * @param {[number, number]} tiles - The template tile's range.
 * @returns {SubstituentSpec} The branch.
 */
function templateGroupSpec(group, tiles) {
  return {
    kind: 'chain',
    length: group.length,
    freeValence: { slot: makeSlot('implicit', 1, 'carbon', group.length, tiles), order: 1 },
    double: group.double.map((value) => makeSlot('implicit', value, 'bond', group.length, tiles)),
    triple: [],
    prefixes: [],
    retained: null,
    word: null,
    compound: false,
    tiles: [tiles[0], tiles[1]],
  };
} // End of function templateGroupSpec()

/**
 * The TemplateSpec of a template parent node (R-4c): its groups at the ring
 * carbons it places them (implicit), or — `xileno` — at the two the student
 * gives: two numbers (supplied), a letter (supplied, 1 and the letter's
 * locant) or nothing (two left-out slots on the template tile, searched).
 *
 * @param {{tiles: object[], leftOut: Slot[]}} ctx - Interpreter context.
 * @param {object} parent - The parent node (parse.js), its chain a template node.
 * @returns {TemplateSpec} The template.
 */
function templateSpec(ctx, parent) {
  const { tile } = parent.chain;
  const value = ctx.tiles[tile].value;
  const template = TEMPLATES[value];
  const own = [tile, tile + 1];
  let slots;
  if (template.positions) {
    slots = template.positions.map((locant) => makeSlot('implicit', locant, 'carbon', BENZENE_LENGTH, own));
  } else if (parent.letter !== null) {
    slots = letterSlots(ctx, parent.letter, [], 'carbon', BENZENE_LENGTH);
  } else {
    slots = locantSlots(ctx, parent.legacy, template.count, 'carbon', BENZENE_LENGTH, parent.chain.range);
  }
  const group = {
    slots,
    multiplier: { count: template.count, compound: false },
    substituent: templateGroupSpec(template.group, own),
    tiles: [parent.range[0], parent.range[1]],
  };
  return { value, word: { text: ctx.tiles[tile].text, tiles: own }, groups: [group] };
} // End of function templateSpec()

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
  // `benceno` (R-4b) or a template (R-4c): no segments, no old-style locants (parse.js BENZENE_BONDS, TEMPLATE_LOCANTS).
  const benzene = chain.type === 'benzene' || chain.type === 'template';
  const length = benzene ? BENZENE_LENGTH : ctx.tiles[chain.root].value;
  const placed = chain.type === 'template' ? TEMPLATES[ctx.tiles[chain.tile].value].positions : null;
  const prefixes = tree.items.map((item) => prefixSpec(ctx, item, length, 'carbon', placed || []));
  const template = chain.type === 'template' ? templateSpec(ctx, tree.parent) : null; // After the prefixes: tile order.
  const bonds = benzene
    ? { double: [], triple: [] }
    : segmentSlots(ctx, chain, length, { locants: legacy, segment: legacy.length > 0 ? legacySegment : null });
  return {
    parent: {
      kind: benzene ? 'benzene' : chainKind(chain),
      length,
      double: bonds.double,
      triple: bonds.triple,
      template,
      tiles: [tree.parent.range[0], tree.parent.range[1]],
    },
    prefixes,
    suffix: null,
    classWord: null,
    ester: null,
    traditional: template ? { value: template.value, tiles: [template.word.tiles[0], template.word.tiles[1]] } : null,
    oldStyle: chain.type === 'chain' && legacy.length > 0,
    tiles: [0, tree.tiles.length],
    leftOut: ctx.leftOut,
  };
} // End of function interpret()
