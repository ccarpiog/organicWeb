/**
 * @file Ayuda dialog (design.md §9): the header button that opens the
 * in-page `#help-dialog` (how to draw, the element palette, the Anillos ring
 * tool and the keyboard shortcuts, with small inline SVG illustrations, written in index.html) and its "Palabras clave" list, filled from the
 * explanation glossary so the definitions live in one place.
 */

import { GLOSSARY } from '../explain/explain.js';

/**
 * Fills a `<dl>` with the glossary terms and their definitions.
 *
 * @param {HTMLElement} list - The `<dl>` element.
 * @returns {void}
 */
export function fillGlossary(list) {
  const doc = list.ownerDocument;
  list.replaceChildren();
  for (const [term, definition] of Object.entries(GLOSSARY)) {
    const dt = doc.createElement('dt');
    dt.textContent = term.charAt(0).toUpperCase() + term.slice(1);
    const dd = doc.createElement('dd');
    dd.textContent = definition;
    list.append(dt, dd);
  }
}

/**
 * Builds the Ayuda button and wires it to the help dialog. Esc, the
 * "Entendido" button and a click on the backdrop close the dialog; the focus
 * then goes back to the Ayuda button.
 *
 * @param {HTMLElement} container - Where the button goes (the header actions).
 * @returns {{open: function(): void, close: function(): void}|null} Handles, or null when the
 *   page has no help dialog.
 */
export function buildHelp(container) {
  const doc = container.ownerDocument;
  const dialog = doc.getElementById('help-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') {
    return null;
  }
  const glossary = dialog.querySelector('#help-glossary');
  if (glossary) {
    fillGlossary(glossary);
  }
  const button = doc.createElement('button');
  button.type = 'button';
  button.id = 'help-button';
  button.className = 'bar-button help-button';
  button.textContent = 'Ayuda';
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', 'help-dialog');
  container.appendChild(button);

  /**
   * Opens the dialog, scrolled to the top, with the focus on its heading (the
   * "Entendido" button sits at the bottom, below the fold on phones).
   *
   * @returns {void}
   */
  function open() {
    if (dialog.open) {
      return;
    }
    dialog.showModal();
    dialog.scrollTop = 0;
    const heading = dialog.querySelector('#help-dialog-title');
    (heading || dialog).focus({ preventScroll: true });
  }

  /**
   * Closes the dialog.
   *
   * @returns {void}
   */
  function close() {
    if (dialog.open) {
      dialog.close();
    }
  }

  button.addEventListener('click', open);
  dialog.addEventListener('close', () => button.focus());
  // A click on the backdrop (outside the dialog box) closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) {
      return;
    }
    const box = dialog.getBoundingClientRect();
    const inside = event.clientX >= box.left && event.clientX <= box.right
      && event.clientY >= box.top && event.clientY <= box.bottom;
    if (!inside) {
      close();
    }
  });
  return { open, close };
} // End of function buildHelp()
