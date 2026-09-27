/**
 * @file Application entry point: wires the editor, the toolbar, the name
 * button and the results panel (design.md §9). The naming engine and the
 * results panel are connected in later phases.
 *
 * For end-to-end tests the editor instance is published as `window.__editor`
 * (see the test API in src/editor/editor.js).
 */

import { listExamples } from './examples.js';
import { createEditor } from '../editor/editor.js';
import { buildToolbar } from './toolbar.js';
import { showToast, confirmDialog } from './feedback.js';

/**
 * Initialises the application shell.
 *
 * @param {Document} doc - The document hosting the shell.
 * @returns {{examples: typeof listExamples, editor: object|null}} Handles for later phases.
 */
export function initApp(doc) {
  const nameButton = doc.getElementById('name-button');
  if (nameButton) {
    // Disabled until the naming engine is wired to the editor (phase 100).
    nameButton.disabled = true;
  }
  const canvas = doc.getElementById('canvas');
  let editor = null;
  if (canvas) {
    editor = createEditor(canvas, { notify: (message) => showToast(doc, message) });
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
    if (doc.defaultView) {
      doc.defaultView.__editor = editor;
    }
  } // End of the editor set-up
  doc.documentElement.dataset.appReady = 'true';
  return { examples: listExamples, editor };
} // End of function initApp()

initApp(document);
