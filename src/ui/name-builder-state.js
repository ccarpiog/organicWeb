/**
 * @file Editing state of the «¿Cómo se dibuja?» dialog (design.md §15.2;
 * phase R-2a). DOM-free, so it is unit-tested on its own; the dialog
 * (src/ui/name-builder.js) only renders it.
 *
 * The state is the student's tile sequence (tile ids of src/reverse/tiles.js),
 * a selection and the feedback of the last «Dibujar»:
 *
 * - **Selection**: the index of a selected tile, START (the insertion point
 *   before the first tile) or null (nothing selected). A tile is inserted
 *   after the selected one (at the front for START, at the end for null)
 *   and becomes the selection. «Borrar ficha» removes the selected tile
 *   (the previous one, or START, becomes the selection, so the next tile
 *   takes its place) or, with nothing selected, the last tile; at START it
 *   does nothing, like Backspace at the start of a text.
 * - **Cap**: at most MAX_TILES tiles; insert() refuses beyond it.
 * - **Feedback**: the message of the last «Dibujar» and the tiles marked
 *   wrong (the error tile ranges of an `invalid` verdict). Any edit clears
 *   it, so a stale message or mark never shows.
 *
 * view() gives what the name line shows: the assembled text and one piece
 * per span of src/reverse/assemble.js (the text comes from the parse tree,
 * never from the naming engine), with the selected, wrong and unfinished
 * (`pending`: the opening mark of an open compound branch) pieces flagged.
 *
 * Session only: nothing here is saved (design.md §15.9 trap 5).
 */

import { parse } from '../reverse/parse.js';
import { assemble } from '../reverse/assemble.js';
import { tileById } from '../reverse/tiles.js';

/** Most tiles a name may have (far above any name of the app's scope; keeps the dialog responsive). */
export const MAX_TILES = 100;

/** Selection value of the insertion point before the first tile. */
export const START = -1;

/** Verdict kinds that describe one molecule to draw (design.md §15.3); the rest are failures shown in the dialog. */
export const SUCCESS_KINDS = Object.freeze(['correct', 'alternative', 'missingLocants', 'otherName']);

/**
 * Tells whether a readName() verdict is a success (a molecule to draw).
 *
 * @param {{kind: string}|null} verdict - The verdict.
 * @returns {boolean} True for correct, alternative, missingLocants and otherName.
 */
export function isSuccess(verdict) {
  return Boolean(verdict) && SUCCESS_KINDS.includes(verdict.kind);
}

/**
 * The tile indices covered by error tile ranges (`[from, to)`, design.md
 * §15.6), clamped to the sequence; an empty range (EMPTY) marks nothing.
 *
 * @param {{from: number, to: number}[]} errors - The verdict's errors.
 * @param {number} count - Number of tiles in the sequence.
 * @returns {number[]} The indices, ascending, each once.
 */
export function errorTileIndices(errors, count) {
  const marked = new Set();
  for (const error of errors || []) {
    const from = Math.max(0, error.from);
    const to = Math.min(count, error.to);
    for (let i = from; i < to; i += 1) {
      marked.add(i);
    }
  }
  return [...marked].sort((a, b) => a - b);
} // End of function errorTileIndices()

/**
 * The feedback a verdict gives in the dialog: its message and notes, in the
 * error style with its wrong tiles marked for a failure, in the plain style
 * for a success.
 *
 * @param {{kind: string, message: string, notes?: string[], errors?: object[]}} verdict - A readName() verdict.
 * @param {number} count - Number of tiles the verdict was read from.
 * @returns {{tone: 'success'|'error', lines: string[], invalid: number[]}} The feedback.
 */
export function verdictFeedback(verdict, count) {
  const success = isSuccess(verdict);
  return {
    tone: success ? 'success' : 'error',
    lines: [verdict.message, ...(verdict.notes || [])].filter(Boolean),
    invalid: success ? [] : errorTileIndices(verdict.errors, count),
  };
}

/**
 * One piece of the name line.
 *
 * @typedef {object} NamePiece
 * @property {string} text - Its text ('' for a compound-branch control that needs no marks).
 * @property {string} kind - render.js part kind ('locant', 'multiplier', 'stem', 'ending', 'prefix', 'punct').
 * @property {number|null} tile - Index of its tile, or null for automatic text (punctuation, the connecting `a`…).
 * @property {string|null} id - Its tile id, or null.
 * @property {string|null} tileKind - Its tile's kind (tiles.js: 'num', 'root', 'start'…), or null.
 * @property {boolean} pending - The opening mark of an unfinished compound branch.
 * @property {boolean} selected - Its tile is the selection.
 * @property {boolean} invalid - Its tile is marked wrong by the last «Dibujar».
 */

/**
 * Creates the editing state of the dialog.
 *
 * @param {{cap?: number}} [options] - `cap`: most tiles allowed (default MAX_TILES).
 * @returns {object} The state: tiles(), count(), selection(), isFull(), insert(), remove(), clear(), select(),
 *   moveSelection(), view(), feedback(), setFeedback(), clearFeedback() and `cap`.
 */
export function createNameBuilderState(options = {}) {
  const cap = options.cap ?? MAX_TILES;
  let ids = [];
  let selection = null;
  let feedback = null;
  let assembled = null;

  /**
   * Records an edit: the assembled name is out of date and the feedback is stale.
   *
   * @returns {void}
   */
  function edited() {
    assembled = null;
    feedback = null;
  }

  /**
   * The tile ids, in order.
   *
   * @returns {string[]} A copy of the sequence.
   */
  function tiles() {
    return [...ids];
  }

  /**
   * Tells whether the cap is reached.
   *
   * @returns {boolean} True when no tile can be added.
   */
  function isFull() {
    return ids.length >= cap;
  }

  /**
   * Inserts a tile after the selection (at the front for START, at the end
   * when nothing is selected); the new tile becomes the selection.
   *
   * @param {string} id - A tile id (tiles.js).
   * @returns {boolean} False when the cap is reached (nothing changes).
   * @throws {Error} For an unknown tile id.
   */
  function insert(id) {
    tileById(id);
    if (isFull()) {
      return false;
    }
    const at = selection === null ? ids.length : selection + 1;
    ids = [...ids.slice(0, at), id, ...ids.slice(at)];
    selection = at;
    edited();
    return true;
  } // End of function insert()

  /**
   * «Borrar ficha»: removes the selected tile (the previous one, or START,
   * becomes the selection) or, with nothing selected, the last tile.
   *
   * @returns {boolean} False when nothing is removed (no tiles, or START selected).
   */
  function remove() {
    if (ids.length === 0 || selection === START) {
      return false;
    }
    const at = selection === null ? ids.length - 1 : selection;
    ids = ids.filter((_, i) => i !== at);
    if (selection !== null) {
      selection = ids.length === 0 ? null : at - 1;
    }
    edited();
    return true;
  } // End of function remove()

  /**
   * «Borrar todo»: removes every tile and the feedback.
   *
   * @returns {boolean} True when there were tiles.
   */
  function clear() {
    const had = ids.length > 0;
    ids = [];
    selection = null;
    edited();
    return had;
  }

  /**
   * Selects a tile, START or nothing; an index out of range is clamped
   * (there is no selection without tiles).
   *
   * @param {number|null} index - A tile index, START or null.
   * @returns {boolean} True when the selection changed.
   */
  function select(index) {
    const before = selection;
    if (index === null || ids.length === 0) {
      selection = null;
    } else {
      selection = Math.max(START, Math.min(ids.length - 1, Math.trunc(index)));
    }
    return selection !== before;
  }

  /**
   * Moves the selection by some steps (arrow keys); with nothing selected
   * it starts from the last tile, which the name line focuses then.
   *
   * @param {number} delta - Steps (negative: towards the start).
   * @returns {boolean} True when the selection changed.
   */
  function moveSelection(delta) {
    if (ids.length === 0) {
      return false;
    }
    const from = selection === null ? ids.length - 1 : selection;
    return select(from + delta);
  }

  /**
   * The assembled name of the current tiles, computed once per edit.
   *
   * @returns {{text: string, spans: object[]}} assemble() of the parse tree.
   */
  function currentAssembly() {
    if (!assembled) {
      assembled = assemble(parse(ids).tree);
    }
    return assembled;
  }

  /**
   * What the name line shows.
   *
   * @returns {{text: string, pieces: NamePiece[], openBranches: number[], count: number, full: boolean,
   *   selection: number|null}} The assembled text, its pieces, the tile indices of unfinished compound branches,
   *   the tile count, whether the cap is reached and the selection.
   */
  function view() {
    const { text, spans } = currentAssembly();
    const invalid = new Set(feedback ? feedback.invalid : []);
    const pieces = spans.map((span) => {
      const id = span.tile === null ? null : ids[span.tile];
      return {
        text: text.slice(span.from, span.to),
        kind: span.kind,
        tile: span.tile,
        id,
        tileKind: id === null ? null : tileById(id).kind,
        pending: Boolean(span.pending),
        selected: span.tile !== null && span.tile === selection,
        invalid: span.tile !== null && invalid.has(span.tile),
      };
    }); // End of the map over the spans
    const openBranches = spans.filter((span) => span.pending && span.tile !== null).map((span) => span.tile);
    return { text, pieces, openBranches, count: ids.length, full: isFull(), selection };
  } // End of function view()

  /**
   * Shows feedback (the message of a «Dibujar»), replacing any other.
   *
   * @param {{tone: 'success'|'error', lines: string[], invalid: number[]}} next - The feedback (verdictFeedback()).
   * @returns {void}
   */
  function setFeedback(next) {
    feedback = { tone: next.tone, lines: [...next.lines], invalid: next.invalid.filter((i) => i >= 0 && i < ids.length) };
  }

  /**
   * Removes the feedback.
   *
   * @returns {void}
   */
  function clearFeedback() {
    feedback = null;
  }

  return {
    cap,
    tiles,
    count: () => ids.length,
    selection: () => selection,
    isFull,
    insert,
    remove,
    clear,
    select,
    moveSelection,
    view,
    feedback: () => feedback,
    setFeedback,
    clearFeedback,
  };
} // End of function createNameBuilderState()
