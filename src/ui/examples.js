/**
 * @file Ejemplos menu (design.md §9): a gallery of molecules written as
 * SMILES, one per feature the app explains, loaded on the canvas with the
 * canonical layout of "Ordenar dibujo" (design.md §7) as one undoable edit.
 *
 * The menu labels describe what each example shows, not its name, so the
 * student still has to ask "¿Cómo se llama?". `name` is the expected name
 * (checked by the unit tests).
 */

import { parseSmiles } from '../model/smiles.js';
import { nameMolecule } from '../naming/index.js';
import { canonicalLayout } from '../layout/canonical.js';

/** The examples, in menu order. */
const EXAMPLES = Object.freeze([
  { id: 'alcano', label: 'Alcano de cadena recta', smiles: 'CCCCCC', name: 'hexano' },
  { id: 'ramificado-minimo', label: 'El alcano ramificado más pequeño', smiles: 'CC(C)C', name: '2-metilpropano' },
  { id: 'ramificado', label: 'Alcano ramificado', smiles: 'CC(C)C(C)CC', name: '2,3-dimetilpentano' },
  { id: 'muchas-ramas', label: 'Alcano con muchas ramas', smiles: 'CC(C)(C)CC(C)C', name: '2,2,4-trimetilpentano' },
  { id: 'simetrico', label: 'Molécula simétrica', smiles: 'CCC(CC)(CC)CC', name: '3,3-dietilpentano' },
  { id: 'isopropilo', label: 'Con un grupo isopropilo', smiles: 'CCCC(C(C)C)CCC', name: '4-isopropilheptano' },
  { id: 'tert-butilo', label: 'Con un grupo tert-butilo', smiles: 'CCCC(C(C)(C)C)CCCC', name: '4-tert-butiloctano' },
  { id: 'alqueno', label: 'Alqueno (un enlace doble)', smiles: 'CC=CCCC', name: 'hex-2-eno' },
  { id: 'dieno', label: 'Dieno (dos enlaces dobles)', smiles: 'C=CC=C', name: 'buta-1,3-dieno' },
  { id: 'alquino', label: 'Alquino (un enlace triple)', smiles: 'CC#CCC', name: 'pent-2-ino' },
  { id: 'alquino-ramificado', label: 'Alquino ramificado', smiles: 'CC#CC(C)C', name: '4-metilpent-2-ino' },
  { id: 'enino', label: 'Enlace doble y triple a la vez', smiles: 'C=CCC#C', name: 'pent-1-en-4-ino' },
  { id: 'rama-doble', label: 'Rama con un enlace doble', smiles: 'CCCC(C=C)CCC', name: '4-etenilheptano' },
  { id: 'rama-unida-doble', label: 'Rama unida con un enlace doble', smiles: 'CCC(=C)CCC', name: '3-metilidenhexano' },
].map((example) => Object.freeze(example)));

/**
 * Returns the list of examples.
 *
 * @returns {ReadonlyArray<{id: string, label: string, smiles: string, name: string}>} The examples, in menu order.
 */
export function listExamples() {
  return EXAMPLES;
}

/**
 * Builds an example molecule with its canonical layout.
 *
 * @param {{smiles: string}} example - One of listExamples().
 * @param {{x: number, y: number}} [center] - Where the drawing is centred (default 0, 0).
 * @returns {object} The molecule.
 * @throws {Error} When the example cannot be named (a broken example).
 */
export function exampleMolecule(example, center = { x: 0, y: 0 }) {
  const mol = parseSmiles(example.smiles);
  const result = nameMolecule(mol);
  if (!result.ok) {
    throw new Error(`example ${example.smiles} cannot be named: ${result.error.code}`);
  }
  return canonicalLayout(mol, result, { center });
}

/**
 * Builds the Ejemplos menu button and its in-page menu. Choosing an example
 * loads it (one undoable edit, which clears any shown name) and centres it.
 *
 * @param {HTMLElement} container - Where the button and menu go.
 * @param {object} editor - The editor (createEditor()).
 * @returns {{open: function(): void, close: function(boolean=): void, load: function(string): object}} Handles
 *   (`load(id)` is also used by tests).
 */
export function buildExamplesMenu(container, editor) {
  const doc = container.ownerDocument;
  const wrapper = doc.createElement('div');
  wrapper.className = 'examples';
  const button = doc.createElement('button');
  button.type = 'button';
  button.id = 'examples-button';
  button.className = 'bar-button examples-button';
  button.textContent = 'Ejemplos';
  button.setAttribute('aria-haspopup', 'menu');
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', 'examples-menu');
  const menu = doc.createElement('ul');
  menu.id = 'examples-menu';
  menu.className = 'examples-menu';
  menu.setAttribute('role', 'menu');
  menu.setAttribute('aria-label', 'Ejemplos de moléculas');
  menu.hidden = true;
  const items = listExamples().map((example) => {
    const li = doc.createElement('li');
    li.setAttribute('role', 'none');
    const item = doc.createElement('button');
    item.type = 'button';
    item.className = 'examples-item';
    item.setAttribute('role', 'menuitem');
    item.tabIndex = -1;
    item.dataset.example = example.id;
    item.textContent = example.label;
    item.addEventListener('click', () => {
      load(example.id);
      close(true);
    });
    li.appendChild(item);
    menu.appendChild(li);
    return item;
  });
  wrapper.append(button, menu);
  container.appendChild(wrapper);

  /**
   * Opens the menu and focuses its first item.
   *
   * @returns {void}
   */
  function open() {
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    items[0].focus();
  }

  /**
   * Closes the menu.
   *
   * @param {boolean} [returnFocus] - Give the focus back to the menu button.
   * @returns {void}
   */
  function close(returnFocus = false) {
    if (menu.hidden) {
      return;
    }
    menu.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus) {
      button.focus();
    }
  }

  /**
   * Loads an example on the canvas and centres the view on it.
   *
   * @param {string} id - The example id.
   * @returns {object} The editor's transaction outcome.
   * @throws {Error} For an unknown id.
   */
  function load(id) {
    const example = listExamples().find((e) => e.id === id);
    if (!example) {
      throw new Error(`unknown example ${id}`);
    }
    const outcome = editor.loadMolecule(exampleMolecule(example));
    editor.centerView();
    return outcome;
  }

  button.addEventListener('click', () => (menu.hidden ? open() : close(true)));
  menu.addEventListener('keydown', (event) => {
    const index = items.indexOf(doc.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next].focus();
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      items[event.key === 'Home' ? 0 : items.length - 1].focus();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    } else if (event.key === 'Tab') {
      close(false);
    }
    // Menu keys must not reach the editor's shortcuts.
    event.stopPropagation();
  }); // End of the menu keyboard handler
  doc.addEventListener('pointerdown', (event) => {
    if (!wrapper.contains(event.target)) {
      close(false);
    }
  });
  return { open, close, load };
} // End of function buildExamplesMenu()
