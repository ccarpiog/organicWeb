/**
 * @file Bar under the canvas (design.md §6.1, §6.3): the live molecular
 * formula ("Fórmula: C₅H₁₂"), the Esqueleto / Con carbonos display toggle,
 * the "Ángulos rectos (90°)" toggle (shown in Con carbonos only; the stored
 * preference survives a switch to Esqueleto), its note, and the "Centrar"
 * button.
 *
 * The 90° view is a display projection (src/layout/rightangle.js) handed to
 * the editor with setProjector(): the projection never changes the
 * molecule's coordinates, and the projected drawing stays editable (every
 * tool but Mover; "Ordenar dibujo" is off too, as its note says).
 */

import { formulaUnicode } from '../model/molecule.js';
import { DISPLAY_MODES } from '../editor/render.js';
import { nameMolecule } from '../naming/index.js';
import { rightAngleLayout } from '../layout/rightangle.js';

/** Spanish labels of the display modes. */
export const MODE_LABELS = Object.freeze({ skeletal: 'Esqueleto', condensed: 'Con carbonos' });

/** Label of the 90° view toggle. */
export const RIGHT_ANGLE_LABEL = 'Ángulos rectos (90°)';

/** Note shown while the 90° drawing is shown (Mover and Ordenar dibujo are off there). */
export const RIGHT_ANGLE_HINT = 'Puedes dibujar aquí. Para mover átomos u ordenar el dibujo, desactiva los ángulos rectos.';

/**
 * Notes shown when the 90° view falls back to the normal, editable drawing,
 * by reason (the empty canvas gets a gentle hint). `HETEROATOM` is the naming
 * engine's code for a group it cannot name yet (an imine, an anhydride…).
 */
export const FALLBACK_NOTES = Object.freeze({
  EMPTY: 'Los ángulos rectos aparecerán cuando dibujes una molécula.',
  DISCONNECTED: 'Hay piezas sueltas: se ve el dibujo normal.',
  CYCLE: 'Hay un anillo: se ve el dibujo normal.',
  RING_SYSTEM: 'Hay anillos: se ve el dibujo normal.',
  HETEROATOM: 'Todavía no sé nombrar esta molécula: se ve el dibujo normal.',
  NO_ROOM: 'Esta molécula no cabe con ángulos rectos sin cruces: se ve el dibujo normal.',
  OTHER: 'Esta molécula no se puede dibujar con ángulos rectos: se ve el dibujo normal.',
});

/**
 * The 90° projection of a molecule: names it (for its parent chain) and
 * lays it out with rightAngleLayout(). Pure (no DOM). Every named acyclic
 * molecule is projected, heteroatoms included (design.md §6.3); a molecule
 * the engine cannot name keeps the normal drawing with its error code as
 * the reason, and one with a ring gets `CYCLE` from the layout.
 *
 * @param {object} mol - The molecule.
 * @returns {{ok: true, positions: Map<number, {x: number, y: number}>}|{ok: false, reason: string}}
 *   The positions, or the reason for falling back (`EMPTY`, `DISCONNECTED`, `CYCLE`, `RING_SYSTEM`, `HETEROATOM`,
 *   `NO_ROOM`, or another naming error code).
 */
export function projectRightAngles(mol) {
  if (mol.atoms.size === 0) {
    return { ok: false, reason: 'EMPTY' };
  }
  const result = nameMolecule(mol);
  if (!result.ok) {
    return { ok: false, reason: (result.error && result.error.code) || 'OTHER' };
  }
  return rightAngleLayout(mol, result);
}

/**
 * Text of the note under the canvas while the 90° view is on: the hint
 * about Mover and Ordenar dibujo while the projection is shown, else why the
 * normal drawing is shown.
 *
 * @param {{ok: boolean, reason?: string}|null} projection - The editor's current projection.
 * @returns {string} The Spanish note.
 */
export function rightAngleNote(projection) {
  if (!projection || projection.ok) {
    return RIGHT_ANGLE_HINT;
  }
  return FALLBACK_NOTES[projection.reason] || FALLBACK_NOTES.OTHER;
}

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
 * @param {{initialMode?: string, onModeChange?: function(string): void, initialRightAngles?: boolean,
 *   onRightAnglesChange?: function(boolean): void}} [options] - Starting display mode and 90° preference,
 *   and listeners for their changes (used to remember the choices).
 * @returns {{sync: function(): void, setRightAngles: function(boolean): void}} `sync()` refreshes the
 *   formula and the note; `setRightAngles(on)` changes the 90° preference.
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

  const rightAngle = doc.createElement('button');
  rightAngle.type = 'button';
  rightAngle.className = 'bar-button right-angle-toggle';
  rightAngle.id = 'right-angle-button';
  rightAngle.textContent = RIGHT_ANGLE_LABEL;
  rightAngle.title = 'Dibujar la fórmula semidesarrollada con ángulos de 90°';
  rightAngle.addEventListener('click', () => setRightAngles(!rightAngles));
  rightAngle.addEventListener('mousedown', (event) => event.preventDefault());
  container.appendChild(rightAngle);

  const center = doc.createElement('button');
  center.type = 'button';
  center.className = 'bar-button';
  center.id = 'center-button';
  center.textContent = 'Centrar';
  center.title = 'Centrar la molécula en el lienzo';
  center.addEventListener('click', () => editor.centerView());
  center.addEventListener('mousedown', (event) => event.preventDefault());
  container.appendChild(center);

  const note = doc.createElement('p');
  note.className = 'right-angle-note';
  note.id = 'right-angle-note';
  note.setAttribute('role', 'status');
  note.hidden = true;
  container.appendChild(note);

  let mode = 'skeletal';
  let rightAngles = Boolean(options.initialRightAngles);

  /**
   * Hands the projection to the editor when the 90° view applies (Con
   * carbonos and the toggle on), removes it otherwise, and updates the toggle.
   *
   * @returns {void}
   */
  function applyRightAngles() {
    const active = mode === 'condensed' && rightAngles;
    rightAngle.hidden = mode !== 'condensed';
    rightAngle.setAttribute('aria-pressed', String(rightAngles));
    editor.setProjector(active ? projectRightAngles : null);
    sync();
  }

  /**
   * Changes the 90° preference.
   *
   * @param {boolean} on - True to turn the 90° view on.
   * @returns {void}
   */
  function setRightAngles(on) {
    rightAngles = Boolean(on);
    applyRightAngles();
    if (options.onRightAnglesChange) {
      options.onRightAnglesChange(rightAngles);
    }
  }

  /**
   * Applies a display mode and updates the toggles.
   *
   * @param {string} next - 'skeletal' or 'condensed'.
   * @returns {void}
   */
  function selectMode(next) {
    mode = next;
    editor.setDisplayMode(next);
    for (const [name, button] of modeButtons) {
      button.setAttribute('aria-pressed', String(name === next));
    }
    applyRightAngles();
    if (options.onModeChange) {
      options.onModeChange(next);
    }
  }

  /**
   * Refreshes the formula line and the 90° note.
   *
   * @returns {void}
   */
  function sync() {
    formula.textContent = formulaText(editor.peekMolecule());
    const projection = editor.getProjection();
    note.hidden = !projection;
    const text = projection ? rightAngleNote(projection) : '';
    if (note.textContent !== text) {
      note.textContent = text;
    }
  }

  selectMode(DISPLAY_MODES.includes(options.initialMode) ? options.initialMode : 'skeletal');
  editor.onChange(sync);
  sync();
  return { sync, setRightAngles };
} // End of function buildCanvasBar()
