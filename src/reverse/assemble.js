/**
 * @file Assembler of «¿Cómo se dibuja?» (design.md §15.4, §15.5.2; phases
 * R-1a, R-4a): turns the lossless syntax tree of parse.js into the name text
 * and one span per piece of text. Pure, no DOM.
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
 *    free-valence locant of a saturated branch without the `ano` tile; the
 *    suffix part of the rule (`propan-2-ol`, `butano-1,4-diol`, `tetrol`)
 *    arrives with the suffixes (R-5a);
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
 *    (crowdedLevel()). Its alkoxy half (`cloro(metoxi)metano`) arrives with
 *    the alkoxy tiles (R-5b).
 *
 * A ring (R-4a) is a chain with its `ciclo` tile before the root, and takes
 * the same rules: `ciclohexa-1,3-dieno` (rule 2), `ciclooct-1-en-3-ino` and
 * `(ciclohex-2-en-1-il)` (rule 3), `ciclohexil`, `ciclohexiliden` and an
 * unsaturated ring branch always enclosed (rule 5, render.js needsEnclosure(),
 * a ring having at least three carbons).
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
 * 'prefix' inside a branch, 'punct' for punctuation and marks. The opening
 * mark of an unfinished compound branch has `pending: true` (shown faintly,
 * design.md §15.2).
 */

import { ENDINGS, ENCLOSING_MARKS, CONNECTING_VOWEL, SATURATED_INFIX } from '../naming/lexicon.es.js';

/**
 * One piece of text before the automatic punctuation is added.
 *
 * @typedef {object} Piece
 * @property {string} text - The text ('' for a compound-branch control without marks).
 * @property {number|null} tile - Index of its tile, or null for automatic text.
 * @property {string} kind - render.js part kind.
 * @property {'locant'|'word'|'mult'|'open'|'close'} role - What the punctuation rules see.
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
 * @param {'locant'|'word'|'mult'|'open'|'close'} role - Punctuation role.
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
 * (rule 5, render.js needsEnclosure()), whatever stands beside it.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain, retained or branch node.
 * @returns {boolean} True when enclosed.
 */
export function isEnclosed(tiles, node) {
  if (node.type === 'retained') {
    return false;
  }
  if (node.type === 'branch') {
    return node.items.length > 0 || (node.chain !== null && isEnclosed(tiles, node.chain));
  }
  const unsaturated = node.segments.length > 0;
  return citesLocant(node) || (unsaturated && node.root !== null && tiles[node.root].value > 2);
} // End of function isEnclosed()

/**
 * Tells whether the prefixes of one level (the name, or a compound branch)
 * are "crowded" as render.js renderPrefixes() / enclosureLevel() say: two or
 * more of them, all written without locants (a one-carbon parent or branch:
 * `metil(ciclohexil)metano`).
 *
 * @param {object[]} items - The level's prefix and stray nodes.
 * @returns {boolean} True when crowded.
 */
export function crowdedLevel(items) {
  const prefixes = items.filter((item) => item.type === 'prefix' && item.substituent);
  return prefixes.length > 1 && prefixes.every((item) => item.locants.length === 0);
}

/**
 * Tells whether the prefix at one position of a level is written between
 * enclosing marks (rule 5, render.js enclosedInName()): isEnclosed(), or a
 * ring branch after the first prefix of a crowded level (a ring prefix cited
 * first reads unambiguously). A compound branch without prefixes of its own
 * (`START ciclo hex il END`) is judged by its chain, like isEnclosed().
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
  return index > 0 && core !== null && core.type === 'chain' && core.ring !== null && crowdedLevel(items);
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
  const roles = { num: 'locant', mult: 'mult', cmult: 'mult', start: 'open', end: 'close' };
  const kinds = {
    num: 'locant', mult: 'multiplier', cmult: 'multiplier', root: 'stem', ending: 'ending', freeValence: 'ending',
    retained: 'prefix', start: 'punct', end: 'punct', ring: 'stem',
  };
  out.push(piece(tile.text, index, kinds[tile.kind], roles[tile.kind] || 'word', tile.italic ? { italic: true } : {}));
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
 * @returns {void}
 */
function chainPieces(tiles, chain, style, out) {
  const kinds = KINDS[style];
  const hasFreeValence = chain.fv !== null;
  if (chain.ring !== null) {
    out.push(piece(tiles[chain.ring].text, chain.ring, kinds.stem, 'word')); // `ciclohexano`, `ciclohexil`
  }
  if (chain.root === null) {
    return;
  }
  out.push(piece(tiles[chain.root].text, chain.root, kinds.stem, 'word'));
  const first = chain.segments[0];
  if (first && first.multiplier !== null) {
    out.push(piece(CONNECTING_VOWEL, null, kinds.stem, 'word')); // `buta-1,3-dieno`
  }
  if (chain.ano !== null) {
    const text = hasFreeValence ? ENDINGS.saturated.slice(0, -1) : ENDINGS.saturated;
    out.push(piece(text, chain.ano, kinds.ending, 'word')); // `propan-2-il`, `hexano`
  } else if (chain.segments.length === 0 && chain.fvLocants.length > 0) {
    out.push(piece(SATURATED_INFIX, null, kinds.ending, 'word')); // `prop 2 il` → `propan-2-il`
  }
  chain.segments.forEach((segment, i) => {
    segment.locants.forEach((index) => out.push(piece(tiles[index].text, index, kinds.locant, 'locant')));
    if (segment.multiplier !== null) {
      out.push(piece(tiles[segment.multiplier].text, segment.multiplier, kinds.multiplier, 'mult'));
    }
    const text = tiles[segment.ending].text;
    const elided = i < chain.segments.length - 1 || hasFreeValence;
    out.push(piece(elided ? text.slice(0, -1) : text, segment.ending, kinds.ending, 'word'));
  });
  chain.fvLocants.forEach((index) => out.push(piece(tiles[index].text, index, kinds.locant, 'locant')));
  if (hasFreeValence) {
    out.push(piece(tiles[chain.fv].text, chain.fv, kinds.ending, 'word'));
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
 * The pieces of a simple branch without enclosing marks: a retained word
 * or a chain.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} node - A chain or retained node.
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function ownChainPieces(tiles, node, out) {
  if (node.type === 'retained') {
    const tile = tiles[node.tile];
    out.push(piece(tile.text, node.tile, 'prefix', 'word', tile.italic ? { italic: true } : {}));
  } else {
    chainPieces(tiles, node, 'prefix', out);
  }
}

/**
 * The pieces of a prefix (its locants, multiplier and substituent) or of a
 * tile out of place, at one position of its level.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object[]} items - The level's prefix and stray nodes (the name's, or a compound branch's).
 * @param {number} index - The item's position in `items`.
 * @param {boolean} nested - Inside a compound branch (its locants and multiplier are part of the branch's prefix part).
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function itemPieces(tiles, items, index, nested, out) {
  const item = items[index];
  if (item.type === 'stray') {
    strayPieces(tiles, item.tile, out);
    return;
  }
  const kinds = KINDS[nested ? 'prefix' : 'parent'];
  item.locants.forEach((i) => out.push(piece(tiles[i].text, i, kinds.locant, 'locant')));
  if (item.multiplier !== null) {
    out.push(piece(tiles[item.multiplier].text, item.multiplier, kinds.multiplier, 'mult'));
  }
  if (item.substituent) {
    substituentPieces(tiles, item.substituent, enclosedAt(tiles, items, index), out);
  }
} // End of function itemPieces()

/**
 * The pieces of the parent: old-style locants (and a multiplier out of
 * place between them and the root), then its chain.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} parent - The parent node.
 * @param {Piece[]} out - Receives the pieces.
 * @returns {void}
 */
function parentPieces(tiles, parent, out) {
  parent.legacy.forEach((index) => out.push(piece(tiles[index].text, index, 'locant', 'locant')));
  if (parent.legacyMultiplier !== null) {
    out.push(piece(tiles[parent.legacyMultiplier].text, parent.legacyMultiplier, 'multiplier', 'mult'));
  }
  chainPieces(tiles, parent.chain, 'parent', out);
}

/**
 * The automatic punctuation between two pieces (rules 1 and 5). Exported
 * for tokenize.js, which checks the punctuation it skips against it.
 *
 * @param {{role: string, italic?: boolean}|null} prev - The previous non-empty piece, or null at the start.
 * @param {{role: string, italic?: boolean}} next - The next piece.
 * @returns {string} '', ',' or '-'.
 */
export function separator(prev, next) {
  if (!prev) {
    return '';
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
  tree.items.forEach((item, i) => itemPieces(tree.tiles, tree.items, i, false, out));
  if (tree.parent) {
    parentPieces(tree.tiles, tree.parent, out);
  }
  tree.trailing.forEach((stray) => strayPieces(tree.tiles, stray.tile, out));
  return join(out);
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
