/**
 * @file Undo/redo of editor transactions (design.md §6.1).
 *
 * Each entry is one transaction (one pointer gesture or one button action)
 * stored as a pair of serialised snapshots (`moleculeToJSON()` output) taken
 * before and after it. Drawings are tiny, so whole snapshots are simpler and
 * safer than inverse operations, and restoring goes through
 * `moleculeFromJSON()`, i.e. through validation. Pure: no DOM.
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
   * @returns {void}
   */
  function record(before, after, label = '') {
    done.push({ before, after, label });
    if (done.length > limit) {
      done.shift();
    }
    undone.length = 0;
  }

  /**
   * Steps back one transaction.
   *
   * @returns {{before: object, after: object, label: string}|null} The entry undone (restore its `before`), or null.
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
   * @returns {{before: object, after: object, label: string}|null} The entry redone (restore its `after`), or null.
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
