/**
 * @file Bar under the canvas (design.md §6.1, §6.3): the live molecular
 * formula ("Fórmula: C₅H₁₂"), the Esqueleto / Con carbonos display toggle
 * and the "Centrar" button.
 */

import { formulaUnicode } from '../model/molecule.js';
import { DISPLAY_MODES } from '../editor/render.js';

/** Spanish labels of the display modes. */
export const MODE_LABELS = Object.freeze({ skeletal: 'Esqueleto', condensed: 'Con carbonos' });

/**
 * Text of the formula line: "Fórmula: C₅H₁₂", or "Fórmula: —" for an empty drawing.
 *
 * @param {object} mol - The molecule.
 * @returns {string} The Spanish text.
 */
export function formulaText(mol) {
  return `Fórmula: ${formulaUnicode(mol) || '—'}`;
}

/**
 * Fills the canvas bar and wires it to the editor.
 *
 * @param {HTMLElement} container - The `#canvas-bar` element.
 * @param {object} editor - The editor (createEditor()).
 * @param {{initialMode?: string, onModeChange?: function(string): void}} [options] - Starting display
 *   mode and a listener for mode changes (used to remember the choice).
 * @returns {{sync: function(): void}} `sync()` refreshes the formula.
 */
export function buildCanvasBar(container, editor, options = {}) {
  const doc = container.ownerDocument;
  const formula = doc.createElement('p');
  formula.className = 'formula';
  formula.id = 'formula';
  container.appendChild(formula);

  const group = doc.createElement('div');
  group.className = 'display-toggle';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Forma de dibujar los carbonos');
  const modeButtons = new Map();
  for (const mode of DISPLAY_MODES) {
    const button = doc.createElement('button');
    button.type = 'button';
    button.className = 'bar-button';
    button.dataset.mode = mode;
    button.textContent = MODE_LABELS[mode];
    button.addEventListener('click', () => selectMode(mode));
    // Keep focus off the button on mouse clicks, so Space still pans the canvas.
    button.addEventListener('mousedown', (event) => event.preventDefault());
    modeButtons.set(mode, button);
    group.appendChild(button);
  }
  container.appendChild(group);

  const center = doc.createElement('button');
  center.type = 'button';
  center.className = 'bar-button';
  center.id = 'center-button';
  center.textContent = 'Centrar';
  center.title = 'Centrar la molécula en el lienzo';
  center.addEventListener('click', () => editor.centerView());
  center.addEventListener('mousedown', (event) => event.preventDefault());
  container.appendChild(center);

  /**
   * Applies a display mode and updates the toggle.
   *
   * @param {string} mode - 'skeletal' or 'condensed'.
   * @returns {void}
   */
  function selectMode(mode) {
    editor.setDisplayMode(mode);
    for (const [name, button] of modeButtons) {
      button.setAttribute('aria-pressed', String(name === mode));
    }
    if (options.onModeChange) {
      options.onModeChange(mode);
    }
  }

  /**
   * Refreshes the formula line.
   *
   * @returns {void}
   */
  function sync() {
    formula.textContent = formulaText(editor.peekMolecule());
  }

  selectMode(DISPLAY_MODES.includes(options.initialMode) ? options.initialMode : 'skeletal');
  editor.onChange(sync);
  sync();
  return { sync };
} // End of function buildCanvasBar()
