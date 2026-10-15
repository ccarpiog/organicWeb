/**
 * @file Assembler of «¿Cómo se dibuja?» (design.md §15.4, §15.5.2; phases
 * R-1a, R-4a, R-4b, R-4c, R-5a1, R-5a2, R-5b, R-5b2, R-5c1): turns the lossless syntax tree of parse.js into
 * the name text and one span per piece of text. Pure, no DOM.
 *
 * The text comes from the tree — the student's own tiles, multipliers,
 * order and locants — never from the naming engine's grouping or rendering
 * (that would silently repair a wrong multiplier, order or locant). Only the
 * automatic rules of design.md §15.5.2 are applied, decided by each tile's
 * syntactic role and the piece that follows it, as render.js does:
 *
 * 1. a comma between consecutive locants, a hyphen between a locant and a
 *    word or an enclosing mark (none after an opening mark: `(2,2-…`);
 * 2. the connecting `a` after a root whose first unsaturation segment
 *    carries a multiplier (`buta-1,3-dieno`, but `hex-1-en-3,5-diino`;
 *    lexicon needsConnectingVowel());
 * 3. `eno` → `en` and `ino` → `in` before another segment or a free-valence
 *    suffix (`pent-1-en-4-ino`, `prop-2-en-1-il`, `prop-2-in-1-iliden`);
 * 4. `ano` → `an` before a free-valence suffix (`propan-2-il`), and the
 *    automatic `an` (lexicon SATURATED_INFIX) when the student cites the
 *    free-valence locant of a saturated branch without the `ano` tile; and
 *    its suffix half (R-5a2, render.js suffixWords() / renderEnding()): a
 *    suffix multiplier first loses its final `a` before a vowel-initial
 *    suffix (`tetra` + `ol` → `tetrol`, `penta` → `pentol`; `di`, `tri`
 *    unchanged), and only then does the parent's last ending — `ano`, the
 *    last `eno` / `ino`, or the word `benceno` — lose its final `o` when what
 *    follows (multiplier and suffix) starts with a vowel: `propan-2-ol`,
 *    `etanol`, `prop-2-en-1-ol`, `bencenol`, but `butano-1,4-diol`,
 *    `but-2-eno-1,4-diol`, `butano-1,2,3,4-tetrol`, `benceno-1,2-diol`,
 *    `bencenohexol`;
 * 5. enclosing marks as render.js needsEnclosure() / enclosureLevel(): a
 *    branch is enclosed when it has prefixes of its own, an unsaturated
 *    chain of three or more carbons, or a cited locant (`(propan-2-il)`,
 *    `(prop-2-en-1-il)`, `(2,2-dimetilpropil)`), never a retained word
 *    (`isopropil`, `tert-butil`); ( ) then [ ] then { } outwards; the
 *    student's multiplier kept as chosen (`di(propan-2-il)`,
 *    `bis(1-metiletil)`, even a wrong `bis(propan-2-il)`); a hyphen between
 *    a multiplier and an italic descriptor (`di-tert-butil`). The "crowded"
 *    case of render.js enclosedInName() — prefixes written without locants
 *    beside other prefixes, where a ring prefix after the first one is
 *    enclosed (`cloro(fenil)metanol`, `metil(ciclohexil)metano`) — is
 *    read on the student's tree: two or more prefixes at one level (the
 *    name, or a compound branch) and none of them with locants
 *    (crowdedLevel()). Its alkoxy half (R-5b): an alkoxy prefix of a crowded
 *    level is enclosed wherever it stands, first too (`cloro(metoxi)metano`,
 *    `dicloro(metoxi)metano`, `difluorodi(metoxi)metano`,
 *    `(metoxi)yodometano`; render.js enclosedInName() checks the alkoxy
 *    before the ring, so a crowded `(fenoxi)` too);
 * 6. the alkoxy contraction (R-5b, design.md §15.5.2 item 6; render.js
 *    alkoxyTokens() and isContractedAlkoxy()): the `oxi` tile after a branch
 *    replaces its `il` — the `il` tile then writes nothing (an empty span)
 *    and a retained word loses its `il` (`isopropil` → `isoprop`) — when the
 *    branch is a saturated chain of one to MAX_CONTRACTED_ALKOXY carbons
 *    bonded by its carbon 1 and citing no locant (`metoxi`, `etoxi`,
 *    `propoxi`, `butoxi`, also with prefixes of its own inside a compound
 *    branch: `(2-metilpropoxi)`, `(1-metiletoxi)`, `(2-cloroetoxi)`) or a
 *    retained word (`isopropoxi`, `tert-butoxi`, `fenoxi`, `(4-metilfenoxi)`);
 *    any other branch keeps its `il` before `oxi` and the alkoxy prefix is
 *    enclosed (render.js needsEnclosure(): `(pentiloxi)`, `(propan-2-iloxi)`,
 *    `(butan-2-iloxi)`, `(eteniloxi)`, `(prop-2-en-1-iloxi)`,
 *    `(ciclohexiloxi)`). Such an alkoxy prefix, and one with prefixes of its
 *    own, is compound (render.js isCompoundPrefix(): `bis(pentiloxi)`; also
 *    `bis-tert-butoxi`, isCompoundAlkoxy()), the other contracted ones
 *    simple (`dimetoxi`, `diisopropoxi`); the student's multiplier stays as
 *    chosen, with the hyphen of rule 5 before `tert-`. As with a chain's `il`, a cited locant
 *    (`prop 1 il oxi`) keeps the `il`: `(propan-1-iloxi)`, never a locant run
 *    into `oxi`.
 *
 * 7. an ether's functional-class name (R-5b2, design.md §2): its groups are
 *    separate words, a space between them and before the class word `éter`
 *    (`etil metil éter`, `dietil éter`, `di-tert-butil éter` with rule 5's
 *    hyphen); each group is enclosed as rule 5 encloses a prefix by itself
 *    (isEnclosed(): `(2-cloroetil) metil éter`, `bis(2-cloroetil) éter`,
 *    `metil (propan-2-il) éter`), never for standing beside the other group
 *    (no crowded level: the groups are words of their own). The engine's
 *    own class names (simple groups) are never enclosed.
 *
 * A ring (R-4a) is a chain with its `ciclo` tile before the root, and takes
 * the same rules: `ciclohexa-1,3-dieno` (rule 2), `ciclooct-1-en-3-ino` and
 * `(ciclohex-2-en-1-il)` (rule 3), `ciclohexil`, `ciclohexiliden` and an
 * unsaturated ring branch always enclosed (rule 5, render.js needsEnclosure(),
 * a ring having at least three carbons).
 *
 * The benzene words (R-4b) take no automatic text of their own: `benceno` is
 * the parent's whole stem, written after the prefixes (`1,2-dimetilbenceno`);
 * `fenil` is a simple branch never enclosed alone (`fenilmetano`,
 * `difenilmetano`), enclosed as a ring prefix after the first of a crowded
 * level (`metil(fenil)metano`, rule 5), and a compound branch with prefixes
 * of its own is enclosed like any other (`(4-metilfenil)`,
 * `[4-(propan-2-il)fenil]`; render.js isSubstitutedPhenyl()).
 *
 * The halogens (R-5a1: `fluoro`, `cloro`, `bromo`, `yodo`) are simple
 * prefixes with no automatic text of their own, never enclosed (render.js
 * needsEnclosure()), also when crowded (render.js encloses only alkoxy and
 * ring prefixes there: `bromoclorofluoroyodometano`, `(clorofluorometil)`);
 * the student's order, multipliers and locants stay as written
 * (`2-bromo-1-cloropropano`, `hexacloroetano`, `(2-cloroetil)`). So is
 * `hidroxi` (R-5a2: `(hidroximetil)`, `(4-hidroxifenil)`).
 *
 * The alcohol suffix (R-5a2) follows the parent's ending with its locants
 * (rule 1: `butano-1,4-diol`), its multiplier and `ol` (rule 4 above); the
 * `fenol` tile is one whole word, like `benceno`. The suffixes of the
 * aldehydes and ketones (R-5c1) take rule 4 as `ol` does, by the first
 * letter of multiplier + suffix (render.js suffixWords()): `butanal`,
 * `but-2-enal`, `prop-2-inal`, `pentan-2-ona`, `ciclohexanona`,
 * `ciclohex-2-en-1-ona`, but `butanodial`, `pentano-2,4-diona`,
 * `ciclohexano-1,4-diona`; `carbaldehído` starts with a consonant, so the
 * ending keeps its `o` (`ciclohexanocarbaldehído`,
 * `ciclohex-2-eno-1-carbaldehído`, `bencenocarbaldehído`,
 * `benceno-1,4-dicarbaldehído`); `al` never has locants on a chain
 * (parse.js). `benzaldehído` is one whole word like `fenol`, and `oxo` a
 * one-atom prefix like `hidroxi`, never enclosed by itself (`4-oxopentanal`,
 * `(2-oxoetil)`); `formil` a retained word like `isopropil`. The closing-bond locant
 * `1(n)` (R-5a2) is written with the ring's own size, `1(6)` on a ring of six
 * (structure.js locantText(): `ciclohex-1(6)-eno-1,2,4-triol`), and
 * punctuated as any locant (`ciclopropa-1,1(3),2-trieno`); out of place it
 * keeps the tile's text, `1(n)`.
 *
 * The retained templates (R-4c: `tolueno`, `estireno`, `xileno`,
 * `mesitileno`) are whole words like `benceno`, the positions of `xileno`'s
 * methyls written before it as locants (`1,2-xileno`, rule 1). An
 * orto/meta/para letter is written where its tile stands and punctuated as
 * a locant (render.js positionalParts() gives it the part kind 'locant'):
 * `o-xileno`, `o-dimetilbenceno`, `p-di-tert-butilbenceno`; a prefix with a
 * letter counts as one with locants for the crowded case.
 *
 * Rule 5 reads "a cited locant" for render.js's "free-valence locant above
 * 1 or unsaturation in a chain of three or more carbons": on every name the
 * engine writes the two coincide (it cites those locants exactly then), and
 * a student's `prop ano 1 il` or `et 1 eno 1 il` reads `(propan-1-il)`,
 * `(et-1-en-1-il)` instead of running its locants into the next word.
 *
 * Spans: `{tile, from, to, kind}` cover the text from start to end in order
 * (`text.slice(from, to)` is the piece); `tile` is the tile's index in the
 * sequence, or null for automatic text (punctuation, the connecting `a`,
 * the automatic `an`, the marks of an enclosed simple branch). Every tile
 * has exactly one span; the controls of a compound branch that needs no
 * marks get an empty one. `kind` follows render.js parts: 'locant',
 * 'multiplier', 'stem', 'ending' in the parent and before a prefix,
 * 'prefix' inside a branch, 'punct' for punctuation, marks and the spaces of
 * a class name (R-5b2), 'ending' for its class word `éter`. The opening
 * mark of an unfinished compound branch has `pending: true` (shown faintly,
 * design.md §15.2).
 */

import { ENDINGS, ENCLOSING_MARKS, CONNECTING_VOWEL, SATURATED_INFIX, FREE_VALENCE_SUFFIXES } from '../naming/lexicon.es.js';
import { isAtomGroup, closingText } from './tiles.js';

/**
 * Longest alkyl chain whose alkoxy prefix is contracted (rule 6, R-5b:
 * `butoxi`, but `pentiloxi`; IUPAC 2013 P-63.2.2.2). The same value as
 * render.js MAX_CONTRACTED_ALKOXY (the tests check it), kept here because the
 * assembler never imports the engine's rendering (design.md §15.4).
 */
export const MAX_CONTRACTED_ALKOXY = 4;

/** The free-valence suffix an alkoxy contraction drops (`met` + `il` → `met` + `oxi`; R-5b). */
const IL = FREE_VALENCE_SUFFIXES[1];

/**
 * The node of a substituent that carries the alkoxy ending `oxi` (R-5b):
 * the chain or retained node itself, or the own chain of a compound branch
 * (`START 2 met il prop il oxi END`); null for any other substituent.
 *
 * @param {object|null} node - A substituent node (parse.js chain, retained, halogen, hydroxy or branch), or null.
 * @returns {object|null} The chain or retained node with `oxi`, or null.
 */
export function alkoxyCore(node) {
  if (!node) {
    return null;
  }
  const core = node.type === 'branch' ? node.chain : node;
  return core && (core.type === 'chain' || core.type === 'retained') && core.oxi !== null && core.oxi !== undefined ? core : null;
}

/**
 * Tells whether a substituent is an alkoxy prefix (R-5b): its branch ends in
 * the `oxi` tile.
 *
 * @param {object|null} node - A substituent node, or null.
 * @returns {boolean} True for an alkoxy prefix.
 */
export function isAlkoxyNode(node) {
  return alkoxyCore(node) !== null;
}

/**
 * Tells whether an alkoxy prefix takes the short form (rule 6, R-5b;
 * render.js isContractedAlkoxy()): a retained word (`isopropoxi`,
 * `tert-butoxi`, `fenoxi`), or a saturated open chain of one to
 * MAX_CONTRACTED_ALKOXY carbons whose free valence sits at its carbon 1 by
 * rule (`il` with no locant, no `ano`): `metoxi`, `butoxi`.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} core - alkoxyCore() of the prefix.
 * @returns {boolean} True for the short form.
 */
export function isContractedCore(tiles, core) {
  if (core.type === 'retained') {
    return true;
  }
  return core.ring === null && core.root !== null && core.ano === null && core.segments.length === 0
    && core.fvLocants.length === 0 && core.fv !== null && tiles[core.fv].value === 1
    && tiles[core.root].value <= MAX_CONTRACTED_ALKOXY;
} // End of function isContractedCore()

/** The retained word whose alkoxy prefix the engine multiplies with bis… (isCompoundAlkoxy(): `bis-tert-butoxi`). */
const COMPOUND_RETAINED_ALKOXY = 'tert-butyl';

/**
 * Tells whether an alkoxy prefix is compound for its multiplier (rule 6,
 * R-5b; render.js isCompoundPrefix()) because of its form: not contracted,
 * so written as its branch + `oxi` (`bis(pentiloxi)`, `bis(propan-2-iloxi)`),
 * or `tert-butoxi`, which render.js counts as compound because the engine's
 * tert-butyl structure carries its two methyls as prefixes
 * (`1,6-bis-tert-butoxihexano`; as an alkyl prefix it stays `di-tert-butil`);
 * `isopropoxi` and `fenoxi` are simple (`diisopropoxi`, `difenoxi`). A
 * compound branch with prefixes of its own is compound anyway.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object|null} node - A substituent node, or null.
 * @returns {boolean} True for an alkoxy prefix that takes bis, tris….
 */
export function isCompoundAlkoxy(tiles, node) {
  const core = alkoxyCore(node);
  if (core === null) {
    return false;
  }
  return core.type === 'retained' ? tiles[core.tile].value === COMPOUND_RETAINED_ALKOXY : !isContractedCore(tiles, core);
}

/**
 * One piece of text before the automatic punctuation is added.
 *
 * @typedef {object} Piece
 * @property {string} text - The text ('' for a compound-branch control without marks).
 * @property {number|null} tile - Index of its tile, or null for automatic text.
 * @property {string} kind - render.js part kind.
 * @property {'locant'|'word'|'mult'|'open'|'close'|'space'} role - What the punctuation rules see ('space': the
 *   automatic space between the words of a class name, R-5b2).
 * @property {boolean} [italic] - The piece starts with an italic descriptor (`tert-`).
 * @property {boolean} [pending] - Opening mark of an unfinished compound branch.
 */

/**
 * Part kinds of the parent's pieces and of the pieces inside a branch
 * (render.js renders a whole prefix as one 'prefix' part).
 */
const KINDS = Object.freeze({
  parent: Object.freeze({ stem: 'stem', ending: 'ending', locant: 'locant', multiplier: 'multiplier' }),
  prefix: Object.freeze({ stem: 'prefix', ending: 'prefix', locant: 'prefix', multiplier: 'prefix' }),
});

/**
 * Creates a piece.
 *
 * @param {string} text - The text.
 * @param {number|null} tile - Tile index, or null.
 * @param {string} kind - Part kind.
 * @param {'locant'|'word'|'mult'|'open'|'close'|'space'} role - Punctuation role.
 * @param {object} [extra] - `italic` / `pending` flags.
 * @returns {Piece} The piece.
 */
function piece(text, tile, kind, role, extra = {}) {
  return { text, tile, kind, role, ...extra };
}

/**
 * Tells whether a chain of a branch cites a locant of its own: a segment's
 * locants or the free-valence locant.
 *
 * @param {object} chain - A chain node.
 * @returns {boolean} True when a locant is cited.
 */
function citesLocant(chain) {
  return chain.fvLocants.length > 0 || chain.segments.some((segment) => segment.locants.length > 0);
}

/**
 * Tells whether a substituent is written between enclosing marks
 * (rule 5, render.js needsEnclosure()), whatever stands beside it. An
 * alkoxy prefix (rule 6, R-5b) is enclosed unless contracted:
 * `(pentiloxi)`, `(eteniloxi)`, but `metoxi`, `isopropoxi`.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, retained, halogen or branch node.
 * @returns {boolean} True when enclosed.
 */
export function isEnclosed(tiles, node) {
  if (isAtomGroup(node.type)) {
    return false;
  }
  if (node.type === 'branch') {
    return node.items.length > 0 || (node.chain !== null && isEnclosed(tiles, node.chain));
  }
  if (isAlkoxyNode(node)) {
    return !isContractedCore(tiles, node); // `(pentiloxi)`, `(propan-2-iloxi)`, `(ciclohexiloxi)` (R-5b).
  }
  if (node.type === 'retained') {
    return false;
  }
  const unsaturated = node.segments.length > 0;
  return citesLocant(node) || (unsaturated && node.root !== null && tiles[node.root].value > 2);
} // End of function isEnclosed()

/**
 * Tells whether the prefixes of one level (the name, or a compound branch)
 * are "crowded" as render.js renderPrefixes() / enclosureLevel() say: two or
 * more of them, all written without locants or a letter (a one-carbon parent
 * or branch: `metil(ciclohexil)metano`).
 *
 * @param {object[]} items - The level's prefix and stray nodes.
 * @returns {boolean} True when crowded.
 */
export function crowdedLevel(items) {
  const prefixes = items.filter((item) => item.type === 'prefix' && item.substituent);
  return prefixes.length > 1 && prefixes.every((item) => item.locants.length === 0 && item.letter === null);
}

/**
 * Tells whether the prefix at one position of a level is written between
 * enclosing marks (rule 5, render.js enclosedInName()): isEnclosed(), or,
 * on a crowded level, an alkoxy prefix wherever it stands (R-5b:
 * `cloro(metoxi)metano`) and a ring branch — `ciclo` or `fenil` — after the
 * first prefix (a ring prefix cited first reads unambiguously). A compound
 * branch without prefixes of its own (`START ciclo hex il END`) is judged by
 * its chain, like isEnclosed().
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object[]} items - The level's prefix and stray nodes.
 * @param {number} index - The position of a prefix with a substituent.
 * @returns {boolean} True when enclosed.
 */
export function enclosedAt(tiles, items, index) {
  const node = items[index].substituent;
  if (isEnclosed(tiles, node)) {
    return true;
  }
  const core = node.type === 'branch' && node.items.length === 0 ? node.chain : node;
  if (core !== null && isAlkoxyNode(core)) {
    return crowdedLevel(items); // The alkoxy before the ring, as render.js enclosedInName(): a crowded `(fenoxi)` too.
  }
  return index > 0 && core !== null && isRingBranch(tiles, core) && crowdedLevel(items);
} // End of function enclosedAt()

/**
 * Tells whether a simple branch is a ring: a `ciclo` chain or `fenil` (R-4b).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain or retained node.
 * @returns {boolean} True for a ring branch.
 */
function isRingBranch(tiles, node) {
  return (node.type === 'chain' && node.ring !== null) || (node.type === 'retained' && tiles[node.tile].value === 'phenyl');
}

/**
 * Nesting level of the enclosing marks of a substituent (render.js
 * enclosureLevel()): 0 for ( ), one more than the highest enclosed prefix
 * inside it.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, retained or branch node.
 * @returns {number} The level.
 */
export function enclosureLevel(tiles, node) {
  if (node.type !== 'branch') {
    return 0;
  }
  let level = 0;
  node.items.forEach((item, i) => {
    if (item.type === 'prefix' && item.substituent && enclosedAt(tiles, node.items, i)) {
      level = Math.max(level, enclosureLevel(tiles, item.substituent) + 1);
    }
  });
  return level;
} // End of function enclosureLevel()

/**
 * The pieces of a tile out of place (TILE_ORDER): its plain text, with the
 * role its kind gives it.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number} index - The tile index.
 * @param {Piece[]} out - Receives the piece.
 * @returns {void}
 */
function strayPieces(tiles, index, out) {
  const tile = tiles[index];
  const roles = { num: 'locant', positional: 'locant', closing: 'locant', mult: 'mult', cmult: 'mult', start: 'open', end: 'close' };
  const kinds = {
    num: 'locant', positional: 'locant', closing: 'locant', mult: 'multiplier', cmult: 'multiplier', root: 'stem', ending: 'ending',
    freeValence: 'ending', retained: 'prefix', halogen: 'prefix', hydroxy: 'prefix', carbonyl: 'prefix', suffix: 'ending', start: 'punct',
    end: 'punct',
    ring: 'stem', benzene: 'stem', template: 'stem', alkoxy: 'ending', classWord: 'ending',
  };
  out.push(piece(tile.text, index, kinds[tile.kind], roles[tile.kind] || 'word', tile.italic ? { italic: true } : {}));
}

/**
 * Tells whether a text starts with a vowel (render.js suffixWords(): the
 * elisions of rule 4).
 *
 * @param {string} text - The text.
 * @returns {boolean} True before a vowel.
 */
function startsWithVowel(text) {
  return /^[aeiou]/.test(text);
}

/**
 * The text of a suffix's multiplier (R-5a2, rule 4): its tile's text, the
 * final `a` elided before a vowel-initial suffix (`tetr` + `ol`); '' without
 * one.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} suffix - A suffix node (parse.js).
 * @returns {string} The text.
 */
function suffixMultiplierText(tiles, suffix) {
  if (suffix.multiplier === null) {
    return '';
  }
  const text = tiles[suffix.multiplier].text;
  return /a$/.test(text) && startsWithVowel(tiles[suffix.tile].text) ? text.slice(0, -1) : text; // As render.js suffixWords().
}

/**
 * Tells whether a suffix makes the parent's last ending lose its final
 * vowel (R-5a2, rule 4): its multiplier and word start with a vowel
 * (`an` + `ol`, but `ano` + `diol`, `ano` + `tetrol`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object|null} suffix - A suffix node, or null.
 * @returns {boolean} True when the parent's final vowel is elided.
 */
function suffixElides(tiles, suffix) {
  return Boolean(suffix) && startsWithVowel(`${suffixMultiplierText(tiles, suffix)}${tiles[suffix.tile].text}`);
}

/**
 * The text of a locant tile: a number, or the closing-bond locant `1(n)`
 * (R-5a2) written with the size of the ring it numbers (`1(6)`), its tile's
 * text where no ring gives one.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number} index - The tile index.
 * @param {number|null} [ring] - Carbons of the ring whose bond it numbers, or null.
 * @returns {string} The text.
 */
function locantText(tiles, index, ring = null) {
  const tile = tiles[index];
  return tile.kind === 'closing' && ring !== null ? closingText(ring) : tile.text;
}

/**
 * The pieces of a chain: `ciclo` for a ring, root, connecting `a` (rule 2),
 * `ano` / automatic `an` (rule 4), unsaturation segments with their locants,
 * multipliers and endings (rule 3), free-valence locant and suffix. A
 * `ciclo` without its root (RING_ROOT) is all there is.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} chain - A chain node.
 * @param {'parent'|'prefix'} style - Part kinds of the parent or of a branch.
 * @param {Piece[]} out - Receives the pieces.
 * @param {boolean} [beforeVowel] - The parent's suffix starts with a vowel: its last ending loses its `o` (rule 4, R-5a2).
 * @returns {void}
 */
function chainPieces(tiles, chain, style, out, beforeVowel = false) {
  const kinds = KINDS[style];
  const hasFreeValence = chain.fv !== null;
  if (chain.ring !== null) {
    out.push(piece(tiles[chain.ring].text, chain.ring, kinds.stem, 'word')); // `ciclohexano`, `ciclohexil`
  }
  if (chain.root === null) {
    return;
  }
  out.push(piece(tiles[chain.root].text, chain.root, kinds.stem, 'word'));
  const ring = chain.ring === null ? null : tiles[chain.root].value; // `1(n)` is written with the ring's size (R-5a2).
  const first = chain.segments[0];
  if (first && first.multiplier !== null) {
    out.push(piece(CONNECTING_VOWEL, null, kinds.stem, 'word')); // `buta-1,3-dieno`
  }
  if (chain.ano !== null) {
    const text = hasFreeValence || beforeVowel ? ENDINGS.saturated.slice(0, -1) : ENDINGS.saturated;
    out.push(piece(text, chain.ano, kinds.ending, 'word')); // `propan-2-il`, `propan-2-ol`, `hexano`, `butano-1,4-diol`
  } else if (chain.segments.length === 0 && chain.fvLocants.length > 0) {
    out.push(piece(SATURATED_INFIX, null, kinds.ending, 'word')); // `prop 2 il` → `propan-2-il`
  }
  chain.segments.forEach((segment, i) => {
    segment.locants.forEach((index) => out.push(piece(locantText(tiles, index, ring), index, kinds.locant, 'locant')));
    if (segment.multiplier !== null) {
      out.push(piece(tiles[segment.multiplier].text, segment.multiplier, kinds.multiplier, 'mult'));
    }
    const text = tiles[segment.ending].text;
    const elided = i < chain.segments.length - 1 || hasFreeValence || beforeVowel; // `prop-2-en-1-ol` (R-5a2)
    out.push(piece(elided ? text.slice(0, -1) : text, segment.ending, kinds.ending, 'word'));
  });
  chain.fvLocants.forEach((index) => out.push(piece(tiles[index].text, index, kinds.locant, 'locant')));
  const alkoxy = isAlkoxyNode(chain);
  if (hasFreeValence) {
    // Rule 6 (R-5b): `oxi` replaces the `il` of a contracted alkoxy prefix (`met` + `oxi`), whose tile then writes nothing.
    const silent = alkoxy && isContractedCore(tiles, chain);
    out.push(piece(silent ? '' : tiles[chain.fv].text, chain.fv, kinds.ending, 'word'));
  }
  if (alkoxy) {
    out.push(piece(tiles[chain.oxi].text, chain.oxi, kinds.ending, 'word')); // `metoxi`, `pentiloxi` (R-5b)
  }
} // End of function chainPieces()

/**
 * The pieces of a substituent with its enclosing marks (rule 5): the
 * controls of a compound branch carry the marks (an unfinished branch
 * always shows its opening mark), a simple branch gets automatic ones.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, retained or branch node.
 * @param {boolean} enclosed - Whether it is enclosed where it stands (enclosedAt()).
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function substituentPieces(tiles, node, enclosed, out) {
  const [open, close] = ENCLOSING_MARKS[enclosureLevel(tiles, node) % ENCLOSING_MARKS.length];
  if (node.type === 'branch') {
    const pending = node.end === null;
    out.push(piece(enclosed || pending ? open : '', node.start, 'punct', 'open', pending ? { pending: true } : {}));
    node.items.forEach((item, i) => itemPieces(tiles, node.items, i, true, out));
    if (node.chain) {
      ownChainPieces(tiles, node.chain, out); // Inside the branch's marks, never enclosed again: `(3-metilbutan-2-il)`.
    }
    if (!pending) {
      out.push(piece(enclosed ? close : '', node.end, 'punct', 'close'));
    }
    return;
  }
  if (enclosed) {
    out.push(piece(open, null, 'punct', 'open'));
  }
  ownChainPieces(tiles, node, out);
  if (enclosed) {
    out.push(piece(close, null, 'punct', 'close'));
  }
} // End of function substituentPieces()

/**
 * The pieces of a simple branch without enclosing marks: a retained word, a
 * one-atom group (a halogen, R-5a1; `hidroxi`, R-5a2) or a chain. A
 * retained word before `oxi` loses its `il` (rule 6, R-5b: `isoprop` +
 * `oxi`, `tert-but` + `oxi`, `fen` + `oxi`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, retained, halogen or hydroxy node.
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function ownChainPieces(tiles, node, out) {
  if (node.type === 'retained' || isAtomGroup(node.type)) {
    const tile = tiles[node.tile];
    const alkoxy = isAlkoxyNode(node);
    const text = alkoxy && tile.text.endsWith(IL) ? tile.text.slice(0, -IL.length) : tile.text; // As render.js alkoxyTokens().
    out.push(piece(text, node.tile, 'prefix', 'word', tile.italic ? { italic: true } : {}));
    if (alkoxy) {
      out.push(piece(tiles[node.oxi].text, node.oxi, 'prefix', 'word')); // `isopropoxi`, `fenoxi` (R-5b)
    }
  } else {
    chainPieces(tiles, node, 'prefix', out);
  }
} // End of function ownChainPieces()

/**
 * The pieces of a prefix (its locants, letter, multiplier and substituent)
 * or of a tile out of place, at one position of its level.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object[]} items - The level's prefix and stray nodes (the name's, or a compound branch's).
 * @param {number} index - The item's position in `items`.
 * @param {boolean} nested - Inside a compound branch (its locants and multiplier are part of the branch's prefix part).
 * @param {Piece[]} out - Receives the pieces.
 * @param {boolean} [classGroup] - A group of an ether's class name (R-5b2, rule 7): enclosed as a prefix by itself
 *   (isEnclosed()), never for its level (default false).
 * @returns {void}
 */
function itemPieces(tiles, items, index, nested, out, classGroup = false) {
  const item = items[index];
  if (item.type === 'stray') {
    strayPieces(tiles, item.tile, out);
    return;
  }
  const kinds = KINDS[nested ? 'prefix' : 'parent'];
  item.locants.forEach((i) => out.push(piece(tiles[i].text, i, kinds.locant, 'locant')));
  if (item.letter !== null) {
    out.push(piece(tiles[item.letter].text, item.letter, kinds.locant, 'locant')); // `o-dimetilbenceno`
  }
  if (item.multiplier !== null) {
    out.push(piece(tiles[item.multiplier].text, item.multiplier, kinds.multiplier, 'mult'));
  }
  if (item.substituent) {
    const enclosed = classGroup ? isEnclosed(tiles, item.substituent) : enclosedAt(tiles, items, index);
    substituentPieces(tiles, item.substituent, enclosed, out);
  }
} // End of function itemPieces()

/**
 * The pieces of the alcohol suffix (R-5a2): its locants, its multiplier (the
 * final `a` elided before `ol`, rule 4: `tetrol`) and `ol`.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} suffix - A suffix node (parse.js).
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function suffixPieces(tiles, suffix, out) {
  suffix.locants.forEach((index) => out.push(piece(tiles[index].text, index, 'locant', 'locant')));
  if (suffix.multiplier !== null) {
    out.push(piece(suffixMultiplierText(tiles, suffix), suffix.multiplier, 'multiplier', 'mult'));
  }
  out.push(piece(tiles[suffix.tile].text, suffix.tile, 'ending', 'word'));
}

/**
 * The pieces of the parent: the locants before its stem (old-style ones, or
 * the positions of `xileno`'s methyls) and a letter (`o-xileno`; out of place
 * before another stem), a multiplier out of place between them and the
 * stem, then its chain — or the `benceno` or `fenol` word (R-4b, R-5a2;
 * numbers before `benceno` are a BENZENE_BONDS error unless they are the
 * old-style locants of its suffix, kept as written), or a template word
 * (R-4c) —, then its suffix (R-5a2), before which the last ending loses its
 * `o` when the suffix starts with a vowel (rule 4: `propan-2-ol`, `bencenol`).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} parent - The parent node.
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function parentPieces(tiles, parent, out) {
  parent.legacy.forEach((index) => out.push(piece(tiles[index].text, index, 'locant', 'locant')));
  if (parent.letter !== null) {
    out.push(piece(tiles[parent.letter].text, parent.letter, 'locant', 'locant')); // `o-xileno`
  }
  if (parent.legacyMultiplier !== null) {
    out.push(piece(tiles[parent.legacyMultiplier].text, parent.legacyMultiplier, 'multiplier', 'mult'));
  }
  const { suffix } = parent;
  const beforeVowel = suffixElides(tiles, suffix);
  if (parent.chain.type === 'classWord') {
    out.push(piece(tiles[parent.chain.tile].text, parent.chain.tile, KINDS.parent.ending, 'word')); // `éter` (R-5b2)
  } else if (parent.chain.type === 'benzene' || parent.chain.type === 'template') {
    const word = tiles[parent.chain.tile].text;
    // `1,2-dimetilbenceno`, `tolueno`, `fenol`; `bencenol`, `benceno-1,2-diol` (R-5a2).
    out.push(piece(beforeVowel ? word.slice(0, -1) : word, parent.chain.tile, KINDS.parent.stem, 'word'));
  } else {
    chainPieces(tiles, parent.chain, 'parent', out, beforeVowel);
  }
  if (suffix) {
    suffixPieces(tiles, suffix, out);
  }
} // End of function parentPieces()

/**
 * The automatic punctuation between two pieces (rules 1 and 5). Exported
 * for tokenize.js, which checks the punctuation it skips against it.
 *
 * @param {{role: string, italic?: boolean}|null} prev - The previous non-empty piece, or null at the start.
 * @param {{role: string, italic?: boolean}} next - The next piece.
 * @returns {string} '', ',' or '-'.
 */
export function separator(prev, next) {
  if (!prev || prev.role === 'space' || next.role === 'space') {
    return ''; // The space of a class name (R-5b2) is all there is between two of its words.
  }
  if (prev.role === 'locant') {
    return next.role === 'locant' ? ',' : '-';
  }
  if (next.role === 'locant') {
    return prev.role === 'open' ? '' : '-';
  }
  return prev.role === 'mult' && next.italic ? '-' : ''; // `di-tert-butil`
} // End of function separator()

/**
 * Joins pieces into the text and its spans, adding the automatic
 * punctuation. An empty opening control sits after the punctuation that
 * precedes the next piece, an empty closing control right after its branch.
 *
 * @param {Piece[]} pieces - The pieces in tile order.
 * @returns {{text: string, spans: {tile: number|null, from: number, to: number, kind: string, pending?: boolean}[]}} The result.
 */
function join(pieces) {
  let text = '';
  const spans = [];
  let prev = null;
  let deferred = [];
  /**
   * Appends a span for a piece at the end of the text.
   *
   * @param {Piece} p - The piece.
   * @returns {void}
   */
  const emit = (p) => {
    const span = { tile: p.tile, from: text.length, to: text.length + p.text.length, kind: p.kind };
    if (p.pending) {
      span.pending = true;
    }
    spans.push(span);
    text += p.text;
  };
  /**
   * Emits the deferred empty opening controls.
   *
   * @returns {void}
   */
  const flush = () => {
    deferred.forEach(emit);
    deferred = [];
  };
  for (const p of pieces) {
    if (p.text === '') {
      if (p.role === 'open') {
        deferred.push(p);
      } else {
        flush();
        emit(p);
      }
      continue;
    }
    const sep = separator(prev, p);
    if (sep) {
      emit(piece(sep, null, 'punct', 'word'));
    }
    flush();
    emit(p);
    prev = p;
  } // End of the loop over the pieces
  flush();
  return { text, spans };
} // End of function join()

/**
 * Assembles a syntax tree (parse.js) into the name text and its spans,
 * applying only the automatic rules of design.md §15.5.2. Incomplete and
 * wrong sequences assemble too: tiles out of place keep their plain text.
 *
 * @param {object} tree - The tree returned by parse().
 * @returns {{text: string, spans: {tile: number|null, from: number, to: number, kind: string, pending?: boolean}[]}} The text and its spans.
 */
export function assemble(tree) {
  const out = [];
  const classWord = Boolean(tree.parent) && isClassName(tree);
  tree.items.forEach((item, i) => {
    if (classWord && i > 0) {
      out.push(spacePiece()); // `etil metil éter` (rule 7, R-5b2)
    }
    itemPieces(tree.tiles, tree.items, i, false, out, classWord);
  });
  if (tree.parent) {
    if (classWord && tree.items.length > 0) {
      out.push(spacePiece());
    }
    parentPieces(tree.tiles, tree.parent, out);
  }
  tree.trailing.forEach((stray) => strayPieces(tree.tiles, stray.tile, out));
  return join(out);
} // End of function assemble()

/**
 * Tells whether a tree is an ether's functional-class name (R-5b2): its
 * parent is the class word `éter`.
 *
 * @param {object} tree - A parse() tree.
 * @returns {boolean} True for `etil metil éter`, `dietil éter`…
 */
export function isClassName(tree) {
  return Boolean(tree.parent) && tree.parent.chain.type === 'classWord';
}

/**
 * The automatic space between two words of a class name (rule 7, R-5b2).
 *
 * @returns {Piece} The piece.
 */
function spacePiece() {
  return piece(' ', null, 'punct', 'space');
}

/**
 * Text of one prefix (or tile out of place) of a tree as it reads on its
 * own, for messages: «2,3-dimetil», «5-(propan-2-il)» (never enclosed for
 * standing beside other prefixes).
 *
 * @param {object} tree - The tree returned by parse().
 * @param {object} item - One of its prefix or stray nodes.
 * @returns {string} The text.
 */
export function itemText(tree, item) {
  const out = [];
  itemPieces(tree.tiles, [item], 0, false, out);
  return join(out).text;
}
