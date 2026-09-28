/**
 * @file Ejemplos menu (design.md §9): a gallery of molecules written as
 * SMILES, one per feature the app explains (grouped: open-chain
 * hydrocarbons, rings, functional groups, rings with a functional group),
 * loaded on the canvas with the canonical layout of "Ordenar dibujo"
 * (design.md §7) as one undoable edit.
 *
 * The menu labels describe what each example shows, not its name, so the
 * student still has to ask "¿Cómo se llama?". `name` is the expected name
 * (checked by the unit tests).
 */

import { parseSmiles } from '../model/smiles.js';
import { nameMolecule } from '../naming/index.js';
import { canonicalLayout } from '../layout/canonical.js';

/** Menu groups, in menu order (`group` of each example). */
const GROUPS = Object.freeze([
  { id: 'cadena', label: 'Hidrocarburos de cadena abierta' },
  { id: 'anillos', label: 'Hidrocarburos con un anillo' },
  { id: 'grupos', label: 'Grupos funcionales' },
  { id: 'anillo-grupo', label: 'Anillos con un grupo funcional' },
].map((group) => Object.freeze(group)));

/** The examples, in menu order (grouped by `group`, see GROUPS). */
const EXAMPLES = Object.freeze([
  { group: 'cadena', id: 'alcano', label: 'Alcano de cadena recta', smiles: 'CCCCCC', name: 'hexano' },
  { group: 'cadena', id: 'ramificado-minimo', label: 'El alcano ramificado más pequeño', smiles: 'CC(C)C', name: '2-metilpropano' },
  { group: 'cadena', id: 'ramificado', label: 'Alcano ramificado', smiles: 'CC(C)C(C)CC', name: '2,3-dimetilpentano' },
  { group: 'cadena', id: 'muchas-ramas', label: 'Alcano con muchas ramas', smiles: 'CC(C)(C)CC(C)C', name: '2,2,4-trimetilpentano' },
  { group: 'cadena', id: 'simetrico', label: 'Molécula simétrica', smiles: 'CCC(CC)(CC)CC', name: '3,3-dietilpentano' },
  { group: 'cadena', id: 'isopropilo', label: 'Con un grupo isopropilo', smiles: 'CCCC(C(C)C)CCC', name: '4-isopropilheptano' },
  { group: 'cadena', id: 'tert-butilo', label: 'Con un grupo tert-butilo', smiles: 'CCCC(C(C)(C)C)CCCC', name: '4-tert-butiloctano' },
  { group: 'cadena', id: 'alqueno', label: 'Alqueno (un enlace doble)', smiles: 'CC=CCCC', name: 'hex-2-eno' },
  { group: 'cadena', id: 'dieno', label: 'Dieno (dos enlaces dobles)', smiles: 'C=CC=C', name: 'buta-1,3-dieno' },
  { group: 'cadena', id: 'alquino', label: 'Alquino (un enlace triple)', smiles: 'CC#CCC', name: 'pent-2-ino' },
  { group: 'cadena', id: 'alquino-ramificado', label: 'Alquino ramificado', smiles: 'CC#CC(C)C', name: '4-metilpent-2-ino' },
  { group: 'cadena', id: 'enino', label: 'Enlace doble y triple a la vez', smiles: 'C=CCC#C', name: 'pent-1-en-4-ino' },
  { group: 'cadena', id: 'rama-doble', label: 'Rama con un enlace doble', smiles: 'CCCC(C=C)CCC', name: '4-etenilheptano' },
  { group: 'cadena', id: 'rama-unida-doble', label: 'Rama unida con un enlace doble', smiles: 'CCC(=C)CCC', name: '3-metilidenhexano' },
  { group: 'anillos', id: 'cicloalcano', label: 'Cicloalcano (un anillo)', smiles: 'C1CCCCC1', name: 'ciclohexano' },
  { group: 'anillos', id: 'cicloalqueno', label: 'Cicloalqueno (anillo con un enlace doble)', smiles: 'C1=CCCCC1', name: 'ciclohexeno' },
  { group: 'anillos', id: 'anillo-rama', label: 'Anillo con una rama', smiles: 'CC1CCCCC1', name: 'metilciclohexano' },
  { group: 'anillos', id: 'benceno', label: 'El anillo de benceno', smiles: 'C1=CC=CC=C1', name: 'benceno' },
  { group: 'anillos', id: 'benceno-rama', label: 'Benceno con una rama', smiles: 'CC1=CC=CC=C1', name: 'metilbenceno' },
  { group: 'grupos', id: 'halogenado', label: 'Derivado halogenado (con cloro)', smiles: 'CC(Cl)C', name: '2-cloropropano' },
  { group: 'grupos', id: 'alcohol', label: 'Alcohol (grupo –OH)', smiles: 'CCC(C)O', name: 'butan-2-ol' },
  { group: 'grupos', id: 'aldehido', label: 'Aldehído (grupo –CHO)', smiles: 'CCC=O', name: 'propanal' },
  { group: 'grupos', id: 'cetona', label: 'Cetona (C=O entre dos carbonos)', smiles: 'CCC(C)=O', name: 'butan-2-ona' },
  { group: 'grupos', id: 'acido', label: 'Ácido carboxílico (grupo –COOH)', smiles: 'CC(=O)O', name: 'ácido etanoico' },
  { group: 'grupos', id: 'eter', label: 'Éter (un oxígeno entre dos carbonos)', smiles: 'CCOCC', name: 'etoxietano' },
  { group: 'grupos', id: 'ester', label: 'Éster (grupo –COO–)', smiles: 'CC(=O)OCC', name: 'etanoato de etilo' },
  { group: 'grupos', id: 'amina', label: 'Amina (grupo –NH₂)', smiles: 'CCCN', name: 'propan-1-amina' },
  { group: 'grupos', id: 'amida', label: 'Amida (grupo –CONH₂)', smiles: 'CC(N)=O', name: 'etanamida' },
  { group: 'grupos', id: 'nitrilo', label: 'Nitrilo (grupo –C≡N)', smiles: 'CCC#N', name: 'propanonitrilo' },
  { group: 'anillo-grupo', id: 'anillo-alcohol', label: 'Anillo con un grupo –OH', smiles: 'OC1CCCCC1', name: 'ciclohexanol' },
  { group: 'anillo-grupo', id: 'benceno-halogeno', label: 'Benceno con un halógeno', smiles: 'ClC1=CC=CC=C1', name: 'clorobenceno' },
  { group: 'anillo-grupo', id: 'benceno-acido', label: 'Benceno con un grupo –COOH', smiles: 'OC(=O)C1=CC=CC=C1', name: 'ácido benzoico' },
].map((example) => Object.freeze(example)));

/**
 * Returns the list of examples.
 *
 * @returns {ReadonlyArray<{group: string, id: string, label: string, smiles: string, name: string}>} The examples, in menu order.
 */
export function listExamples() {
  return EXAMPLES;
}

/**
 * Returns the menu groups.
 *
 * @returns {ReadonlyArray<{id: string, label: string}>} The groups, in menu order.
 */
export function listExampleGroups() {
  return GROUPS;
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
  const items = [];
  // One sub-list per group, labelled by its title (a menu item group).
  for (const group of listExampleGroups()) {
    const li = doc.createElement('li');
    li.setAttribute('role', 'none');
    const title = doc.createElement('span');
    title.id = `examples-group-${group.id}`;
    title.className = 'examples-group';
    title.textContent = group.label;
    const list = doc.createElement('ul');
    list.className = 'examples-group-list';
    list.setAttribute('role', 'group');
    list.setAttribute('aria-labelledby', title.id);
    for (const example of listExamples().filter((e) => e.group === group.id)) {
      const entry = doc.createElement('li');
      entry.setAttribute('role', 'none');
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
      entry.appendChild(item);
      list.appendChild(entry);
      items.push(item);
    } // End of the loop over the examples of the group
    li.append(title, list);
    menu.appendChild(li);
  } // End of the loop over the menu groups
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
