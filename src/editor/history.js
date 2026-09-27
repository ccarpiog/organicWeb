/**
 * @file Undo/redo of editor transactions (design.md §6.1).
 *
 * Each entry is one transaction (one pointer gesture or one button action)
 * stored as a pair of serialised snapshots (`moleculeToJSON()` output) taken
 * before and after it. Drawings are tiny, so whole snapshots are simpler and
 * safer than inverse operations, and restoring goes through
 * `moleculeFromJSON()`, i.e. through validation. An entry may also carry
 * the canvas view before and after it (opaque `{before, after}` data), for a
 * transaction that re-centred the canvas ("Ordenar dibujo", design.md §7):
 * undo and redo hand those views back so the drawing reappears where it was.
 * Pure: no DOM.
 */

/** Default maximum number of undoable transactions. */
export const HISTORY_LIMIT = 200;

/**
 * Creates an empty undo/redo history.
 *
 * @param {{limit?: number}} [options] - Maximum number of undo entries kept (oldest dropped first).
 * @returns {{record: Function, undo: Function, redo: Function, canUndo: Function, canRedo: Function, clear: Function, size: Function}} The history API.
 */
export function createHistory(options = {}) {
  const limit = options.limit || HISTORY_LIMIT;
  const done = [];
  const undone = [];

  /**
   * Records a committed transaction and forgets any redo entries.
   *
   * @param {object} before - Snapshot before the transaction.
   * @param {object} after - Snapshot after the transaction.
   * @param {string} [label] - Short English description, for debugging.
   * @param {{before: object, after: object}|null} [view] - Canvas views before and after it, when it changed the view.
   * @returns {void}
   */
  function record(before, after, label = '', view = null) {
    done.push(view ? { before, after, label, view } : { before, after, label });
    if (done.length > limit) {
      done.shift();
    }
    undone.length = 0;
  }

  /**
   * Steps back one transaction.
   *
   * @returns {{before: object, after: object, label: string, view?: object}|null} The entry undone (restore its `before`), or null.
   */
  function undo() {
    const entry = done.pop() || null;
    if (entry) {
      undone.push(entry);
    }
    return entry;
  }

  /**
   * Steps forward one undone transaction.
   *
   * @returns {{before: object, after: object, label: string, view?: object}|null} The entry redone (restore its `after`), or null.
   */
  function redo() {
    const entry = undone.pop() || null;
    if (entry) {
      done.push(entry);
    }
    return entry;
  }

  /**
   * Tells whether there is something to undo.
   *
   * @returns {boolean} True when undo() would change something.
   */
  function canUndo() {
    return done.length > 0;
  }

  /**
   * Tells whether there is something to redo.
   *
   * @returns {boolean} True when redo() would change something.
   */
  function canRedo() {
    return undone.length > 0;
  }

  /**
   * Forgets every entry.
   *
   * @returns {void}
   */
  function clear() {
    done.length = 0;
    undone.length = 0;
  }

  /**
   * Number of undoable transactions.
   *
   * @returns {number} The undo stack depth.
   */
  function size() {
    return done.length;
  }

  return { record, undo, redo, canUndo, canRedo, clear, size };
} // End of function createHistory()
