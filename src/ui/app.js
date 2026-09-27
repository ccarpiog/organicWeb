/**
 * @file Application entry point: wires the editor, the name button and the
 * results panel (design.md §9). For now it only marks the shell as ready;
 * later phases connect the editor and the naming engine.
 */

import { listExamples } from './examples.js';

/**
 * Initialises the application shell.
 *
 * @param {Document} doc - The document hosting the shell.
 * @returns {{examples: typeof listExamples}} Handles for later phases.
 */
export function initApp(doc) {
  const nameButton = doc.getElementById('name-button');
  if (nameButton) {
    // Disabled until the naming engine and the editor exist (phases 030–100).
    nameButton.disabled = true;
  }
  doc.documentElement.dataset.appReady = 'true';
  return { examples: listExamples };
}

initApp(document);
