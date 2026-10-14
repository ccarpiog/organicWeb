/**
 * @file Tile catalogue of «¿Cómo se dibuja?» (design.md §15.4, §15.5.1;
 * phase R-1a): the pieces a student picks to build a name — numbers,
 * multipliers, word roots, endings, branch words and the two compound-branch
 * controls. Pure data, no DOM.
 *
 * Every Spanish text comes from the naming lexicon (lexicon.es.js: stem(),
 * multiplier(), compoundMultiplier(), ENDINGS, FREE_VALENCE_SUFFIXES,
 * RETAINED_PREFIXES, ENCLOSING_MARKS), never retyped here; numbers are
 * digits. Tile ids are language-neutral (`root-4`, `ending-double`,
 * `retained-tert-butyl`), so a sequence of ids survives a change of wording.
 *
 * A tile is `{id, kind, value, row, text, more}`:
 * - `kind` — 'num' (a locant 1–30), 'mult' (di…triaconta), 'cmult'
 *   (bis, tris, tetrakis…), 'root' (met…triacont, 1–30 carbons), 'ending'
 *   (ano / eno / ino; value 'saturated' | 'double' | 'triple', the ENDINGS
 *   keys), 'freeValence' (il / iliden; value 1 | 2, the attachment bond
 *   order), 'retained' (isopropil, isopropiliden, tert-butil; value the
 *   RETAINED_PREFIXES id, with `italic` the descriptor ignored in
 *   alphabetical order), 'start' / 'end' (the controls «empieza rama
 *   compuesta» / «acaba rama»; their text is the plain enclosing mark, the
 *   assembler picks the real one);
 * - `row` — the tile row of the dialog (design.md §15.2): 'numbers',
 *   'multipliers', 'roots', 'endings', 'branches';
 * - `more` — the tile sits behind the row's «más» button (numbers 13–30,
 *   multipliers from hepta / heptakis, roots from undec).
 */

import {
  MAX_STEM, stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, RETAINED_PREFIXES, ENCLOSING_MARKS,
} from '../naming/lexicon.es.js';

/** Largest locant tile (the longest supported chain, design.md §1.1). */
export const MAX_NUM = MAX_STEM;

/** Largest multiplier tile (`triaconta`, `triacontakis`; design.md §15.5.1). */
export const MAX_MULT = MAX_STEM;

/** Last number shown before «más» (design.md §15.2: 1–12, then 13–30). */
const NUM_VISIBLE = 12;

/** Last multiplier shown before «más» (design.md §15.2: di…hexa, then hepta…triaconta). */
const MULT_VISIBLE = 6;

/** Last root shown before «más» (design.md §15.2: met…dec, then undec…triacont). */
const ROOT_VISIBLE = 10;

/** Retained branch words offered in R-1 (design.md §15.5.1); `phenyl` arrives with the rings (R-4). */
const RETAINED_IDS = Object.freeze(['isopropyl', 'isopropylidene', 'tert-butyl']);

/** Id of the «empieza rama compuesta» control. */
export const START_ID = 'branch-start';

/** Id of the «acaba rama» control. */
export const END_ID = 'branch-end';

/**
 * Creates one frozen tile.
 *
 * @param {string} id - Language-neutral id.
 * @param {string} kind - Tile kind (see the file header).
 * @param {number|string|null} value - The tile's meaning.
 * @param {string} row - Dialog row id.
 * @param {string} text - The Spanish text, from the lexicon.
 * @param {boolean} [more] - Behind the row's «más» button (default false).
 * @param {object} [extra] - Extra fields (`italic` for a retained branch).
 * @returns {Readonly<object>} The tile.
 */
function makeTile(id, kind, value, row, text, more = false, extra = {}) {
  return Object.freeze({ id, kind, value, row, text, more, ...extra });
}

/**
 * Builds the whole catalogue in dialog order: numbers, multipliers (simple,
 * then compound), roots, endings, branch words and controls.
 *
 * @returns {Readonly<object>[]} The tiles.
 */
function buildCatalogue() {
  const tiles = [];
  for (let n = 1; n <= MAX_NUM; n += 1) {
    tiles.push(makeTile(`num-${n}`, 'num', n, 'numbers', String(n), n > NUM_VISIBLE));
  }
  for (let n = 2; n <= MAX_MULT; n += 1) {
    tiles.push(makeTile(`mult-${n}`, 'mult', n, 'multipliers', multiplier(n), n > MULT_VISIBLE));
  }
  for (let n = 2; n <= MAX_MULT; n += 1) {
    tiles.push(makeTile(`cmult-${n}`, 'cmult', n, 'multipliers', compoundMultiplier(n), n > MULT_VISIBLE));
  }
  for (let n = 1; n <= MAX_STEM; n += 1) {
    tiles.push(makeTile(`root-${n}`, 'root', n, 'roots', stem(n), n > ROOT_VISIBLE));
  }
  for (const key of ['saturated', 'double', 'triple']) {
    tiles.push(makeTile(`ending-${key}`, 'ending', key, 'endings', ENDINGS[key]));
  }
  for (const order of [1, 2]) {
    tiles.push(makeTile(`fv-${order}`, 'freeValence', order, 'branches', FREE_VALENCE_SUFFIXES[order]));
  }
  for (const id of RETAINED_IDS) {
    const { italic, text } = RETAINED_PREFIXES[id];
    tiles.push(makeTile(`retained-${id}`, 'retained', id, 'branches', `${italic}${text}`, false, { italic }));
  }
  const [open, close] = ENCLOSING_MARKS[0];
  tiles.push(makeTile(START_ID, 'start', null, 'branches', open));
  tiles.push(makeTile(END_ID, 'end', null, 'branches', close));
  return tiles;
} // End of function buildCatalogue()

/** Every tile, in dialog order. */
export const TILES = Object.freeze(buildCatalogue());

/** The tiles keyed by id. */
const BY_ID = new Map(TILES.map((tile) => [tile.id, tile]));

/**
 * Returns the tile with an id.
 *
 * @param {string} id - A tile id.
 * @returns {Readonly<object>} The tile.
 * @throws {Error} For an unknown id.
 */
export function tileById(id) {
  const tile = BY_ID.get(id);
  if (!tile) {
    throw new Error(`tileById: unknown tile ${id}`);
  }
  return tile;
}

/**
 * Returns the id of the tile of a kind with a value: `tileId('root', 4)` →
 * 'root-4', `tileId('ending', 'double')` → 'ending-double', `tileId('start')`.
 *
 * @param {string} kind - Tile kind.
 * @param {number|string|null} [value] - Tile value (none for 'start' / 'end').
 * @returns {string} The id.
 * @throws {Error} When no tile has that kind and value.
 */
export function tileId(kind, value = null) {
  const tile = TILES.find((t) => t.kind === kind && t.value === value);
  if (!tile) {
    throw new Error(`tileId: no ${kind} tile with value ${value}`);
  }
  return tile.id;
}

/**
 * Turns a tile sequence given as ids or tiles into tiles.
 *
 * @param {(string|object)[]} sequence - Tile ids or catalogue tiles.
 * @returns {Readonly<object>[]} The tiles.
 * @throws {Error} For an unknown id.
 */
export function toTiles(sequence) {
  return sequence.map((item) => (typeof item === 'string' ? tileById(item) : tileById(item.id)));
}
