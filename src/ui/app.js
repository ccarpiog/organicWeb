/**
 * @file Application entry point: wires the editor, the toolbar, the canvas
 * bar (formula, display mode, 90° view, Centrar), the autosave, the name button, the
 * results panel with the naming engine, the step-by-step explanation and the
 * remembered "Resaltar en el dibujo" switch
 * (design.md §9, src/ui/results.js), "Ordenar dibujo" (design.md §7), the
 * Ejemplos menu (src/ui/examples.js) and the Ayuda dialog (src/ui/help.js).
 *
 * For end-to-end tests the editor instance is published as `window.__editor`
 * (see the test API in src/editor/editor.js).
 */

import { listExamples, buildExamplesMenu } from './examples.js';
import { createEditor } from '../editor/editor.js';
import { buildToolbar } from './toolbar.js';
import { showToast, confirmDialog } from './feedback.js';
import { buildCanvasBar } from './canvasbar.js';
import { buildResults } from './results.js';
import { buildHelp } from './help.js';
import {
  getStorage, readItem, writeItem, restoreDrawing, startAutosave, MODE_KEY, RIGHT_ANGLE_KEY, MARKS_KEY,
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
    let results = null;
    const toolbar = doc.getElementById('toolbar');
    if (toolbar) {
      buildToolbar(toolbar, editor, {
        arrange: () => (results ? results.arrange() : null),
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
        initialRightAngles: readItem(storage, RIGHT_ANGLE_KEY) === 'on',
        onRightAnglesChange: (on) => writeItem(storage, RIGHT_ANGLE_KEY, on ? 'on' : 'off'),
      });
    }
    const panel = doc.getElementById('results');
    if (panel && nameButton) {
      results = buildResults(panel, editor, nameButton, {
        notify: (message) => showToast(doc, message),
        initialMarks: readItem(storage, MARKS_KEY) !== 'off',
        onMarksChange: (on) => writeItem(storage, MARKS_KEY, on ? 'on' : 'off'),
      });
    }
    const headerActions = doc.getElementById('header-actions');
    if (headerActions) {
      buildExamplesMenu(headerActions, editor);
      buildHelp(headerActions);
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
