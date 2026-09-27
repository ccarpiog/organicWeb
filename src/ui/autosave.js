/**
 * @file Autosave of the drawing in `localStorage` (design.md §6.3). Every
 * storage access is wrapped in try/catch (storage may be missing, disabled,
 * full or throw on access); the saved molecule is restored through the
 * editor's replaceMolecule(), i.e. through moleculeFromJSON() and
 * validateStructure(), so corrupt data gives an empty canvas, never a crash.
 * The storage object is injected, so the module is testable under Node.
 */

/** localStorage key of the saved molecule (moleculeToJSON() output as JSON). */
export const STORAGE_KEY = 'organicWeb.molecule';

/** localStorage key of the display mode ('skeletal' | 'condensed'). */
export const MODE_KEY = 'organicWeb.displayMode';

/**
 * The page's localStorage, or null when it cannot be used (reading the
 * property itself throws in some privacy modes).
 *
 * @param {Window|null|undefined} win - The window.
 * @returns {Storage|null} The storage, or null.
 */
export function getStorage(win) {
  try {
    return (win && win.localStorage) || null;
  } catch (err) {
    return null;
  }
}

/**
 * Reads a key, swallowing storage errors.
 *
 * @param {Storage|null} storage - The storage.
 * @param {string} key - The key.
 * @returns {string|null} The stored text, or null.
 */
export function readItem(storage, key) {
  try {
    return storage ? storage.getItem(key) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Writes a key (or removes it when `value` is null), swallowing storage
 * errors such as a full quota.
 *
 * @param {Storage|null} storage - The storage.
 * @param {string} key - The key.
 * @param {string|null} value - The text to store; null removes the key.
 * @returns {boolean} True when the storage accepted the change.
 */
export function writeItem(storage, key, value) {
  try {
    if (!storage) {
      return false;
    }
    if (value === null) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, value);
    }
    return true;
  } catch (err) {
    return false;
  }
} // End of function writeItem()

/**
 * Restores the saved molecule into the editor, if any. Corrupt or invalid
 * data is discarded (the key is removed) and the canvas stays empty.
 *
 * @param {object} editor - The editor (needs replaceMolecule()).
 * @param {Storage|null} storage - The storage.
 * @returns {'restored'|'empty'|'corrupt'} What happened.
 */
export function restoreDrawing(editor, storage) {
  const text = readItem(storage, STORAGE_KEY);
  if (text === null || text === '') {
    return 'empty';
  }
  const outcome = editor.replaceMolecule(text);
  if (!outcome.ok) {
    writeItem(storage, STORAGE_KEY, null);
    return 'corrupt';
  }
  return 'restored';
} // End of function restoreDrawing()

/**
 * Keeps the storage in sync with the editor: saves after every edit of the
 * molecule (chemical or coordinate), removing the key when the drawing is empty.
 *
 * @param {object} editor - The editor (needs onEdit() and getMoleculeJSON()).
 * @param {Storage|null} storage - The storage.
 * @returns {Function} Unsubscribe function.
 */
export function startAutosave(editor, storage) {
  return editor.onEdit(() => {
    const json = editor.getMoleculeJSON();
    writeItem(storage, STORAGE_KEY, json.atoms.length > 0 ? JSON.stringify(json) : null);
  });
}
