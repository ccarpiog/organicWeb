/**
 * @file Application entry point: wires the editor, the toolbar, the canvas
 * bar (formula, display mode, Centrar), the autosave, the name button and the
 * results panel with the naming engine and the step-by-step explanation
 * (design.md §9, src/ui/results.js).
 *
 * For end-to-end tests the editor instance is published as `window.__editor`
 * (see the test API in src/editor/editor.js).
 */

import { listExamples } from './examples.js';
import { createEditor } from '../editor/editor.js';
import { buildToolbar } from './toolbar.js';
import { showToast, confirmDialog } from './feedback.js';
import { buildCanvasBar } from './canvasbar.js';
import { buildResults } from './results.js';
import {
  getStorage, readItem, writeItem, restoreDrawing, startAutosave, MODE_KEY,
} from './autosave.js';

/**
 * Initialises the application shell.
 *
 * @param {Document} doc - The document hosting the shell.
 * @returns {{examples: typeof listExamples, editor: object|null}} Handles for later phases.
 */
export function initApp(doc) {
  const nameButton = doc.getElementById('name-button');
  const canvas = doc.getElementById('canvas');
  let editor = null;
  if (canvas) {
    editor = createEditor(canvas, { notify: (message) => showToast(doc, message) });
    const storage = getStorage(doc.defaultView);
    const restored = restoreDrawing(editor, storage) === 'restored';
    startAutosave(editor, storage);
    const toolbar = doc.getElementById('toolbar');
    if (toolbar) {
      buildToolbar(toolbar, editor, {
        confirmClear: () => confirmDialog(doc, {
          title: '¿Borrar todo el dibujo?',
          message: 'Se borrará la molécula entera. Podrás recuperarla con «Deshacer».',
          confirmLabel: 'Borrar todo',
          cancelLabel: 'Cancelar',
        }),
      });
    }
    const canvasBar = doc.getElementById('canvas-bar');
    if (canvasBar) {
      buildCanvasBar(canvasBar, editor, {
        initialMode: readItem(storage, MODE_KEY),
        onModeChange: (mode) => writeItem(storage, MODE_KEY, mode),
      });
    }
    const results = doc.getElementById('results');
    if (results && nameButton) {
      buildResults(results, editor, nameButton);
    }
    if (restored) {
      // The saved coordinates may lie far from the fresh identity view (the
      // drawing was made after panning), so fit the restored molecule in the
      // visible canvas, like "Centrar". This changes the view only: it is
      // neither an edit nor an undo step. Done last, once the shell is laid out.
      editor.centerView();
    }
    if (doc.defaultView) {
      doc.defaultView.__editor = editor;
    }
  } // End of the editor set-up
  doc.documentElement.dataset.appReady = 'true';
  return { examples: listExamples, editor };
} // End of function initApp()

initApp(document);
