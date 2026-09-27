/**
 * @file Drawing toolbar (design.md §6.1): the element palette (C, O, N, F,
 * Cl, Br, I — the element tool), tool buttons with icons and Spanish
 * tooltips, the Anillos group (one button per ring size, 3 to 8, and one for
 * the benzene hexagon with alternating double bonds), plus Deshacer / Rehacer / Limpiar / Ordenar dibujo. Kept in sync with the editor
 * through its change notifications. While the 90° drawing is actually shown
 * (design.md §6.1, §6.3) every tool works through it except Mover, which is
 * disabled together with "Ordenar dibujo" (neither would change the
 * projected drawing).
 */

import { ELEMENTS, ELEMENT_NAMES_ES } from '../model/elements.js';
import { ELEMENT_KEYS, RING_TEMPLATES, BENZENE_TEMPLATE } from '../editor/editor.js';

/**
 * Icon of an element button: its symbol, in the toolbar's icon box.
 *
 * @param {string} symbol - The element symbol.
 * @returns {string} SVG inner markup (24×24).
 */
function elementIcon(symbol) {
  const size = symbol.length > 1 ? 13 : 15;
  return `<text x="12" y="17" text-anchor="middle" font-size="${size}" font-weight="700" fill="currentColor" stroke="none">${symbol}</text>`;
}

/**
 * Element palette buttons (design.md §6.1), in ELEMENTS order: element
 * symbol, Spanish label ("Oxígeno"), keyboard shortcut (ELEMENT_KEYS) and icon.
 */
const ELEMENT_BUTTONS = ELEMENTS.map((symbol) => {
  const name = ELEMENT_NAMES_ES[symbol];
  const key = Object.keys(ELEMENT_KEYS).find((k) => ELEMENT_KEYS[k] === symbol);
  return { element: symbol, label: name.charAt(0).toUpperCase() + name.slice(1), keys: [key.toUpperCase()], icon: elementIcon(symbol) };
});

/**
 * Icon of a ring button: a regular polygon of `n` sides with a flat bottom,
 * as the Anillos tool draws it.
 *
 * @param {number} n - Ring size.
 * @returns {string} SVG inner markup (24×24).
 */
function ringIcon(n) {
  const radius = 9;
  const start = Math.PI / 2 - Math.PI / n;
  const points = [];
  for (let k = 0; k < n; k += 1) {
    const angle = start + (k * 2 * Math.PI) / n;
    points.push(`${(12 + radius * Math.cos(angle)).toFixed(2)},${(12.5 + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return `<polygon points="${points.join(' ')}"/>`;
}

/**
 * Icon of the benzene button: the hexagon of ringIcon(6) with the inner
 * strokes of three alternating double bonds.
 *
 * @returns {string} SVG inner markup (24×24).
 */
function benzeneIcon() {
  const radius = 9;
  const inner = 5.6;
  const start = Math.PI / 2 - Math.PI / 6;
  const vertex = (k, r) => [12 + r * Math.cos(start + (k * Math.PI) / 3), 12.5 + r * Math.sin(start + (k * Math.PI) / 3)];
  const strokes = [0, 2, 4].map((k) => {
    const [x1, y1] = vertex(k, inner);
    const [x2, y2] = vertex(k + 1, inner);
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
  });
  return `${ringIcon(6)}${strokes.join('')}`;
}

/**
 * Ring buttons of the Anillos group (design.md §6.1): template (ring size
 * or 'benzene'), Spanish label ("Anillo de 6 carbonos", "Benceno"),
 * shortcut `A` (picks Anillos; pressed again, the next template: 3…8, then
 * benceno) and icon.
 */
const RING_BUTTONS = RING_TEMPLATES.map((t) => (t === BENZENE_TEMPLATE
  ? { template: t, label: 'Benceno', keys: ['A'], icon: benzeneIcon() }
  : { template: t, label: `Anillo de ${t} carbonos`, keys: ['A'], icon: ringIcon(t) }));

/** Tool buttons: editor tool id, Spanish label, keyboard shortcuts (design.md §6.1), icon (SVG inner markup, 24×24). */
const TOOL_BUTTONS = [
  { tool: 'single', label: 'Enlace simple', keys: ['1', 'H'], icon: '<line x1="4" y1="18" x2="20" y2="6"/>' },
  { tool: 'double', label: 'Enlace doble', keys: ['2'], icon: '<line x1="3" y1="15" x2="17" y2="4"/><line x1="7" y1="20" x2="21" y2="9"/>' },
  { tool: 'triple', label: 'Enlace triple', keys: ['3'], icon: '<line x1="2" y1="13" x2="15" y2="3"/><line x1="5" y1="17" x2="19" y2="7"/><line x1="9" y1="21" x2="22" y2="11"/>' },
  { tool: 'cycle', label: 'Cambiar enlace', keys: ['T'], icon: '<line x1="5" y1="19" x2="12" y2="12"/><path d="M14 5a6 6 0 1 1-2 7"/><path d="M14 2v4h4"/>' },
  { tool: 'erase', label: 'Borrar', keys: ['E', 'Supr'], icon: '<path d="M4 16l8-8 7 7-5 5H8z"/><line x1="10" y1="20" x2="21" y2="20"/>' },
  { tool: 'move', label: 'Mover', keys: ['M'], icon: '<path d="M12 2v20M2 12h20"/><path d="M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>' },
];

/** Action buttons: id, Spanish label, icon. */
const ACTION_BUTTONS = [
  { action: 'undo', label: 'Deshacer', keys: ['Ctrl+Z'], icon: '<path d="M9 7H4V2"/><path d="M4 7a8 8 0 1 1 2 9"/>' },
  { action: 'redo', label: 'Rehacer', keys: ['Ctrl+Shift+Z'], icon: '<path d="M15 7h5V2"/><path d="M20 7a8 8 0 1 0-2 9"/>' },
  { action: 'clear', label: 'Limpiar', icon: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>' },
  { action: 'arrange', label: 'Ordenar dibujo', icon: '<polyline points="2,14 7,9 12,14 17,9 22,14"/><path d="M4 20h16"/><path d="M4 4h16"/>' },
];

/**
 * Creates one toolbar button.
 *
 * @param {Document} doc - The document.
 * @param {{label: string, icon: string, keys?: string[]}} spec - Label, icon markup and shortcut keys.
 * @returns {HTMLButtonElement} The button.
 */
function makeButton(doc, spec) {
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = 'tool-button';
  const keys = spec.keys || [];
  button.title = keys.length > 0 ? `${spec.label} (${keys.join(' o ')})` : spec.label;
  button.setAttribute('aria-label', spec.label);
  if (keys.length > 0) {
    const aria = keys.map((k) => k.replace('Supr', 'Delete').replace('Ctrl', 'Control').replace(/^([A-Z])$/, (m) => m.toLowerCase()));
    button.setAttribute('aria-keyshortcuts', aria.join(' '));
  }
  // A mouse click must not leave focus on the button: Space then pans the canvas instead of pressing it.
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${spec.icon}</svg>`;
  return button;
}

/**
 * Fills the toolbar and wires it to the editor.
 *
 * @param {HTMLElement} container - The `#toolbar` element.
 * @param {object} editor - The editor (createEditor()).
 * @param {{confirmClear: function(): Promise<boolean>, arrange?: function(): void}} options - Asks the
 *   user before Limpiar; runs "Ordenar dibujo" (design.md §7).
 * @returns {{sync: function(): void}} `sync()` refreshes pressed/disabled states.
 */
export function buildToolbar(container, editor, options) {
  const doc = container.ownerDocument;
  const elementButtons = new Map();
  const toolButtons = new Map();
  const actionButtons = new Map();

  /**
   * Adds a group of buttons (a grid of two columns on wide screens).
   *
   * @param {string} className - Extra class of the group.
   * @param {string} label - Spanish accessible name of the group.
   * @returns {HTMLDivElement} The group.
   */
  function addGroup(className, label) {
    const group = doc.createElement('div');
    group.className = `tool-group ${className}`;
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', label);
    container.appendChild(group);
    return group;
  }

  /**
   * Adds a separator line between groups.
   *
   * @returns {void}
   */
  function addSeparator() {
    const separator = doc.createElement('span');
    separator.className = 'toolbar-separator';
    separator.setAttribute('role', 'separator');
    container.appendChild(separator);
  }

  const palette = addGroup('element-palette', 'Elementos');
  for (const spec of ELEMENT_BUTTONS) {
    const button = makeButton(doc, spec);
    button.classList.add('element-button');
    button.dataset.element = spec.element;
    if (spec.element === 'C') {
      button.dataset.tool = 'carbon'; // The carbon button is also "the element tool" button.
    }
    button.addEventListener('click', () => editor.setElement(spec.element));
    elementButtons.set(spec.element, button);
    palette.appendChild(button);
  }
  addSeparator();
  const tools = addGroup('tool-list', 'Herramientas');
  for (const spec of TOOL_BUTTONS) {
    const button = makeButton(doc, spec);
    button.dataset.tool = spec.tool;
    button.addEventListener('click', () => editor.setTool(spec.tool));
    toolButtons.set(spec.tool, button);
    tools.appendChild(button);
  }
  addSeparator();
  const ringButtons = new Map();
  const rings = addGroup('ring-list', 'Anillos');
  for (const spec of RING_BUTTONS) {
    const button = makeButton(doc, spec);
    button.classList.add('ring-button');
    if (spec.template === BENZENE_TEMPLATE) {
      button.dataset.ringTemplate = spec.template;
    } else {
      button.dataset.ringSize = String(spec.template);
    }
    button.addEventListener('click', () => editor.setRingTemplate(spec.template));
    ringButtons.set(spec.template, button);
    rings.appendChild(button);
  }
  addSeparator();
  const actions = addGroup('action-list', 'Acciones');
  for (const spec of ACTION_BUTTONS) {
    const button = makeButton(doc, spec);
    button.dataset.action = spec.action;
    actionButtons.set(spec.action, button);
    actions.appendChild(button);
  } // End of the loops that fill the four groups
  actionButtons.get('undo').addEventListener('click', () => editor.undo());
  actionButtons.get('redo').addEventListener('click', () => editor.redo());
  actionButtons.get('arrange').addEventListener('click', () => {
    if (options.arrange) {
      options.arrange();
    }
  });
  actionButtons.get('clear').addEventListener('click', async () => {
    if (await options.confirmClear()) {
      editor.clear();
    }
  });

  /**
   * Refreshes which tool is pressed and which actions are available.
   *
   * @returns {void}
   */
  function sync() {
    const projected = typeof editor.isProjected === 'function' && editor.isProjected();
    const elementTool = editor.getTool() === 'carbon';
    for (const [element, button] of elementButtons) {
      button.setAttribute('aria-pressed', String(elementTool && editor.getElement() === element));
    }
    const ringTool = editor.getTool() === 'ring';
    for (const [template, button] of ringButtons) {
      button.setAttribute('aria-pressed', String(ringTool && editor.getRingTemplate() === template));
    }
    for (const [tool, button] of toolButtons) {
      button.setAttribute('aria-pressed', String(editor.getTool() === tool));
      button.disabled = projected && tool === 'move';
    }
    actionButtons.get('undo').disabled = !editor.canUndo();
    actionButtons.get('redo').disabled = !editor.canRedo();
    actionButtons.get('clear').disabled = editor.peekMolecule().atoms.size === 0;
    actionButtons.get('arrange').disabled = projected || editor.peekMolecule().atoms.size === 0;
  } // End of function sync()

  editor.onChange(sync);
  if (typeof editor.onViewChange === 'function') {
    editor.onViewChange(sync);
  }
  sync();
  return { sync };
} // End of function buildToolbar()
