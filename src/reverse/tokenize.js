/**
 * @file Tokenizer of «¿Cómo se dibuja?» (design.md §15.4; phase R-1a): the
 * inverse of the assembler, `tokenize(text) → tile ids | null`, for the
 * tests and the diagnosis (R-3). Pure, no DOM.
 *
 * A bounded depth-first search over the tiles' surface forms (each tile's
 * text, and the elided `an` / `en` / `in` of the endings), skipping the
 * automatic text of design.md §15.5.2: hyphens and commas, the connecting
 * `a`, and the marks of an enclosed simple branch. An opening mark is
 * either automatic or the START control, and its closing mark must be the
 * same choice. A sequence is kept only if it parses without errors and its
 * assembly gives the text back exactly, so every answer is checked by the
 * assembler itself; the first such sequence is returned.
 *
 * Preferences (tried first): longer surface forms (`tridec` before `tri`,
 * `iliden` before `il`), automatic marks before START / END (the controls
 * only for compound branches). The `an` of `propan-2-il` is always read as
 * the `ano` tile: the automatic `an` (assemble.js rule 4) gives the same
 * text, so a reading with it exists only when one with the tile does.
 *
 * Sound pruning, so that a dead end is seen at once instead of at the end
 * of the text: a kind-adjacency table of the grammar (design.md §15.5.1);
 * the punctuation skipped between two pieces must be exactly what the
 * assembler writes there (assemble.js separator()); an automatic enclosure
 * holds exactly one simple chain (its root first, its closing mark right
 * after `il` / `iliden`, nothing nested). A step budget bounds the search:
 * running out returns null, never a guess.
 */

import { CONNECTING_VOWEL, ENCLOSING_MARKS } from '../naming/lexicon.es.js';
import { TILES, START_ID, END_ID } from './tiles.js';
import { parse } from './parse.js';
import { assemble, separator } from './assemble.js';

/** Default bound on the search steps of one tokenize() call. */
export const TOKENIZE_BUDGET = 20000;

/**
 * Longest text tokenize() reads. Every search step consumes at least one
 * character, so this also bounds the recursion depth (a longer text, such as
 * thousands of nested brackets, would exhaust the stack). Real names are far
 * shorter.
 */
export const TOKENIZE_MAX_LENGTH = 1000;

/** Characters of the automatic punctuation between pieces. */
const PUNCTUATION = ',-';

/**
 * Grammar class of a tile for the adjacency table: NUM, MULT, CMULT, ROOT,
 * ANO (`ano`), ENE (`eno` / `ino`), FV (`il` / `iliden`), RET (a retained
 * branch word), START, END. A is the automatic connecting vowel, AUTO_OPEN
 * an automatic opening mark.
 *
 * @param {object} tile - A catalogue tile.
 * @returns {string} The class.
 */
function tileClass(tile) {
  if (tile.kind === 'ending') {
    return tile.value === 'saturated' ? 'ANO' : 'ENE';
  }
  const classes = {
    num: 'NUM', mult: 'MULT', cmult: 'CMULT', root: 'ROOT', freeValence: 'FV', retained: 'RET', start: 'START', end: 'END',
  };
  return classes[tile.kind];
}

/** Classes that may begin a name, a prefix or a compound branch. */
const PREFIX_STARTS = ['NUM', 'MULT', 'CMULT', 'ROOT', 'RET', 'START'];

/**
 * The classes that may follow each class in a valid open-chain hydrocarbon
 * name (design.md §15.5.1); BEGIN is the start of the text. An automatic
 * closing mark does not change the class.
 */
const FOLLOW = Object.freeze({
  BEGIN: new Set(PREFIX_STARTS),
  AUTO_OPEN: new Set(['ROOT']),
  NUM: new Set([...PREFIX_STARTS, 'ENE', 'FV']),
  MULT: new Set(['ROOT', 'RET', 'START', 'ENE']),
  CMULT: new Set(['ROOT', 'RET', 'START']),
  ROOT: new Set(['ANO', 'NUM', 'MULT', 'ENE', 'FV', 'A']),
  A: new Set(['NUM', 'MULT']),
  ANO: new Set(['NUM']),
  ENE: new Set(['NUM', 'MULT', 'ENE', 'FV']),
  FV: new Set([...PREFIX_STARTS, 'END']),
  RET: new Set([...PREFIX_STARTS, 'END']),
  START: new Set(PREFIX_STARTS),
  END: new Set([...PREFIX_STARTS, 'END']),
});

/** Classes a valid name may end with (the parent's ending). */
const FINAL = new Set(['ANO', 'ENE']);

/** Punctuation roles of the pieces (assemble.js separator()). */
const WORD = Object.freeze({ role: 'word' });
const OPEN = Object.freeze({ role: 'open' });
const CLOSE = Object.freeze({ role: 'close' });

/**
 * The punctuation role of a tile's piece, as the assembler gives it.
 *
 * @param {object} tile - A catalogue tile.
 * @returns {{role: string, italic?: boolean}} The role.
 */
function pieceRole(tile) {
  if (tile.kind === 'num') {
    return Object.freeze({ role: 'locant' });
  }
  if (tile.kind === 'mult' || tile.kind === 'cmult') {
    return Object.freeze({ role: 'mult' });
  }
  return tile.italic ? Object.freeze({ role: 'word', italic: true }) : WORD;
}

/**
 * Builds the surface forms of the tiles (START / END excepted: they are
 * read from the enclosing marks), longest first.
 *
 * @returns {{text: string, id: string, cls: string, piece: object}[]} The surface forms.
 */
function buildSurfaces() {
  const surfaces = [];
  for (const tile of TILES) {
    const cls = tileClass(tile);
    if (cls === 'START' || cls === 'END') {
      continue;
    }
    const piece = pieceRole(tile);
    surfaces.push({ text: tile.text, id: tile.id, cls, piece });
    if (tile.kind === 'ending') {
      surfaces.push({ text: tile.text.slice(0, -1), id: tile.id, cls, piece }); // `an`, `en`, `in` (rules 3 and 4)
    }
  } // End of the loop over the tiles
  return surfaces.map((surface, i) => ({ surface, i }))
    .sort((a, b) => b.surface.text.length - a.surface.text.length || a.i - b.i)
    .map(({ surface }) => surface);
} // End of function buildSurfaces()

/** Surface forms, longest first. */
const SURFACES = Object.freeze(buildSurfaces());

/** Opening and closing characters of the enclosing marks, by level. */
const OPENERS = ENCLOSING_MARKS.map(([open]) => open);
const CLOSERS = ENCLOSING_MARKS.map(([, close]) => close);

/**
 * Tells whether a tile sequence is a valid reading of a text: it parses
 * without errors and assembles back to exactly that text.
 *
 * @param {string[]} ids - Tile ids.
 * @param {string} text - The text.
 * @returns {boolean} True when the sequence reads as the text.
 */
function readsAs(ids, text) {
  const { tree, errors } = parse(ids);
  return errors.length === 0 && assemble(tree).text === text;
}

/**
 * Finds the tiles of a name: the inverse of assemble() (design.md §15.4).
 *
 * @param {string} text - A name (compared in NFC, design.md §15.9 trap 7).
 * @param {{budget?: number}} [options] - `budget`: maximum search steps (default TOKENIZE_BUDGET).
 * @returns {string[]|null} The tile ids, or null when no sequence reads as the text within the budget
 *   (or the text is longer than TOKENIZE_MAX_LENGTH).
 */
export function tokenize(text, options = {}) {
  const target = String(text).normalize('NFC');
  if (target.length > TOKENIZE_MAX_LENGTH) {
    return null;
  }
  const budget = options.budget ?? TOKENIZE_BUDGET;
  const ids = [];
  const marks = [];
  let steps = 0;

  /**
   * Explores the readings of the text from a position.
   *
   * @param {number} pos - Position in the text.
   * @param {string} prev - Class of the previous tile, automatic letter or automatic opening mark.
   * @param {{role: string}|null} last - Punctuation role of the previous piece, null at the start.
   * @returns {boolean|null} True when found (`ids` holds it), false when not, null when the budget ran out.
   */
  function search(pos, prev, last) {
    steps += 1;
    if (steps > budget) {
      return null;
    }
    let at = pos;
    while (at < target.length && PUNCTUATION.includes(target[at])) {
      at += 1;
    }
    const skipped = target.slice(pos, at);
    /**
     * Tells whether the skipped punctuation is what the assembler writes before a piece.
     *
     * @param {{role: string, italic?: boolean}} next - The next piece's role.
     * @returns {boolean} True when it fits.
     */
    const fits = (next) => separator(last, next) === skipped;
    if (at === target.length) {
      return skipped === '' && marks.length === 0 && FINAL.has(prev) && readsAs(ids, target);
    }
    const ch = target[at];
    if (OPENERS.includes(ch)) {
      return fits(OPEN) ? searchOpening(at, prev, OPENERS.indexOf(ch)) : false;
    }
    if (CLOSERS.includes(ch)) {
      return fits(CLOSE) ? searchClosing(at, prev, CLOSERS.indexOf(ch)) : false;
    }
    const top = marks[marks.length - 1];
    if (top && top.automatic && prev === 'FV') {
      return false; // An automatic enclosure ends right after its chain's `il` / `iliden`.
    }
    const follow = FOLLOW[prev];
    for (const surface of SURFACES) {
      if (follow.has(surface.cls) && target.startsWith(surface.text, at) && fits(surface.piece)) {
        ids.push(surface.id);
        const found = search(at + surface.text.length, surface.cls, surface.piece);
        if (found !== false) {
          return found;
        }
        ids.pop();
      }
    } // End of the loop over the surface forms
    if (follow.has('A') && target.startsWith(CONNECTING_VOWEL, at) && fits(WORD)) {
      return search(at + CONNECTING_VOWEL.length, 'A', WORD);
    }
    return false;
  } // End of function search()

  /**
   * Explores an opening mark: automatic first (around one simple chain, not
   * inside another automatic enclosure), then the START control.
   *
   * @param {number} pos - Position of the mark.
   * @param {string} prev - Class before it.
   * @param {number} level - Mark level (index in ENCLOSING_MARKS).
   * @returns {boolean|null} As search().
   */
  function searchOpening(pos, prev, level) {
    const top = marks[marks.length - 1];
    if (top && top.automatic) {
      return false;
    }
    if (FOLLOW[prev].has('ROOT')) {
      marks.push({ automatic: true, level });
      const found = search(pos + 1, 'AUTO_OPEN', OPEN);
      marks.pop();
      if (found !== false) {
        return found;
      }
    }
    if (!FOLLOW[prev].has('START')) {
      return false;
    }
    marks.push({ automatic: false, level });
    ids.push(START_ID);
    const found = search(pos + 1, 'START', OPEN);
    if (found === false) {
      ids.pop();
    }
    marks.pop();
    return found;
  } // End of function searchOpening()

  /**
   * Explores a closing mark: it closes the last opening mark, of the same
   * level and the same choice (automatic, right after `il` / `iliden`; or
   * the END control).
   *
   * @param {number} pos - Position of the mark.
   * @param {string} prev - Class before it.
   * @param {number} level - Mark level.
   * @returns {boolean|null} As search().
   */
  function searchClosing(pos, prev, level) {
    const open = marks[marks.length - 1];
    if (!open || open.level !== level || (open.automatic && prev !== 'FV')) {
      return false;
    }
    marks.pop();
    let found = false;
    if (open.automatic) {
      found = search(pos + 1, prev, CLOSE);
    } else if (FOLLOW[prev].has('END')) {
      ids.push(END_ID);
      found = search(pos + 1, 'END', CLOSE);
      if (found === false) {
        ids.pop();
      }
    }
    marks.push(open);
    return found;
  } // End of function searchClosing()

  return search(0, 'BEGIN', null) === true ? [...ids] : null;
} // End of function tokenize()
