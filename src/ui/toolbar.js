/**
 * @file Drawing toolbar (design.md §6.1): tool buttons with icons and Spanish
 * tooltips, plus Deshacer / Rehacer / Limpiar. Kept in sync with the editor
 * through its change notifications.
 */

/** Tool buttons: editor tool id, Spanish label, keyboard shortcuts (design.md §6.1), icon (SVG inner markup, 24×24). */
const TOOL_BUTTONS = [
  { tool: 'carbon', label: 'Carbono', keys: ['C'], icon: '<text x="12" y="17" text-anchor="middle" font-size="15" font-weight="700" fill="currentColor" stroke="none">C</text>' },
  { tool: 'single', label: 'Enlace simple', keys: ['1'], icon: '<line x1="4" y1="18" x2="20" y2="6"/>' },
  { tool: 'double', label: 'Enlace doble', keys: ['2'], icon: '<line x1="3" y1="15" x2="17" y2="4"/><line x1="7" y1="20" x2="21" y2="9"/>' },
  { tool: 'triple', label: 'Enlace triple', keys: ['3'], icon: '<line x1="2" y1="13" x2="15" y2="3"/><line x1="5" y1="17" x2="19" y2="7"/><line x1="9" y1="21" x2="22" y2="11"/>' },
  { tool: 'cycle', label: 'Cambiar enlace', keys: ['T'], icon: '<line x1="5" y1="19" x2="12" y2="12"/><path d="M14 5a6 6 0 1 1-2 7"/><path d="M14 2v4h4"/>' },
  { tool: 'chain', label: 'Cadena', keys: ['H'], icon: '<polyline points="2,16 7,8 12,16 17,8 22,16"/>' },
  { tool: 'erase', label: 'Borrar', keys: ['E', 'Supr'], icon: '<path d="M4 16l8-8 7 7-5 5H8z"/><line x1="10" y1="20" x2="21" y2="20"/>' },
  { tool: 'move', label: 'Mover', keys: ['M'], icon: '<path d="M12 2v20M2 12h20"/><path d="M9 5l3-3 3 3M9 19l3 3 3-3M5 9l-3 3 3 3M19 9l3 3-3 3"/>' },
];

/** Action buttons: id, Spanish label, icon. */
const ACTION_BUTTONS = [
  { action: 'undo', label: 'Deshacer', keys: ['Ctrl+Z'], icon: '<path d="M9 7H4V2"/><path d="M4 7a8 8 0 1 1 2 9"/>' },
  { action: 'redo', label: 'Rehacer', keys: ['Ctrl+Shift+Z'], icon: '<path d="M15 7h5V2"/><path d="M20 7a8 8 0 1 0-2 9"/>' },
  { action: 'clear', label: 'Limpiar', icon: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/>' },
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
 * @param {{confirmClear: function(): Promise<boolean>}} options - Asks the user before Limpiar.
 * @returns {{sync: function(): void}} `sync()` refreshes pressed/disabled states.
 */
export function buildToolbar(container, editor, options) {
  const doc = container.ownerDocument;
  const toolButtons = new Map();
  const actionButtons = new Map();
  for (const spec of TOOL_BUTTONS) {
    const button = makeButton(doc, spec);
    button.dataset.tool = spec.tool;
    button.addEventListener('click', () => editor.setTool(spec.tool));
    toolButtons.set(spec.tool, button);
    container.appendChild(button);
  }
  const separator = doc.createElement('span');
  separator.className = 'toolbar-separator';
  separator.setAttribute('role', 'separator');
  container.appendChild(separator);
  for (const spec of ACTION_BUTTONS) {
    const button = makeButton(doc, spec);
    button.dataset.action = spec.action;
    actionButtons.set(spec.action, button);
    container.appendChild(button);
  }
  actionButtons.get('undo').addEventListener('click', () => editor.undo());
  actionButtons.get('redo').addEventListener('click', () => editor.redo());
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
    for (const [tool, button] of toolButtons) {
      button.setAttribute('aria-pressed', String(editor.getTool() === tool));
    }
    actionButtons.get('undo').disabled = !editor.canUndo();
    actionButtons.get('redo').disabled = !editor.canRedo();
    actionButtons.get('clear').disabled = editor.peekMolecule().atoms.size === 0;
  }

  editor.onChange(sync);
  sync();
  return { sync };
} // End of function buildToolbar()
