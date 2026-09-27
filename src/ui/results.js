/**
 * @file Results panel (design.md §9): the "¿Cómo se llama?" button, the
 * coloured name, "Otras formas válidas", friendly Spanish errors and the
 * "Ver paso a paso" stepper (Anterior / Siguiente, progress dots) whose
 * steps drive the canvas highlights and locant labels.
 *
 * A chemical edit clears the result (a stale name must never show); a
 * coordinate-only edit keeps it, and the highlights follow the moved atoms.
 * The DOM is built with createElement/textContent only (never innerHTML
 * with text), so no name or message can inject markup.
 */

import { nameMolecule } from '../naming/index.js';
import { explain, parseMarkup, GLOSSARY } from '../explain/explain.js';

/** Extra hints shown under an error message, by error code. */
export const ERROR_HINTS = Object.freeze({
  EMPTY: 'Usa las herramientas de la izquierda para dibujar carbonos y enlaces.',
  CYCLE: 'Borra un enlace del anillo para abrir la cadena.',
  DISCONNECTED: 'Une las piezas con un enlace o borra las que sobran.',
});

/** Hint shown when there is no result. */
const IDLE_HINT = 'Dibuja una molécula en el lienzo y pulsa «¿Cómo se llama?».';

/**
 * Creates an element with a class and optional text.
 *
 * @param {Document} doc - The document.
 * @param {string} tag - Tag name.
 * @param {string} [className] - Class attribute.
 * @param {string} [text] - Text content.
 * @returns {HTMLElement} The element.
 */
function make(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text !== undefined) {
    node.textContent = text;
  }
  return node;
}

/**
 * Renders a paragraph with glossary terms as focusable, underlined spans
 * whose definition shows as a tooltip.
 *
 * @param {Document} doc - The document.
 * @param {string} text - Paragraph with `[[shown|key]]` marks.
 * @param {string} [tag] - Element to create (default 'p').
 * @returns {HTMLElement} The paragraph.
 */
export function renderMarkup(doc, text, tag = 'p') {
  const node = doc.createElement(tag);
  for (const segment of parseMarkup(text)) {
    if (segment.term && GLOSSARY[segment.term]) {
      const term = make(doc, 'span', 'term', segment.text);
      term.tabIndex = 0;
      term.dataset.tip = GLOSSARY[segment.term];
      term.setAttribute('aria-description', GLOSSARY[segment.term]);
      node.appendChild(term);
    } else {
      node.appendChild(doc.createTextNode(segment.text));
    }
  }
  return node;
} // End of function renderMarkup()

/**
 * Renders a name as coloured parts (one span per part kind).
 *
 * @param {Document} doc - The document.
 * @param {{text: string, kind: string}[]} parts - Name parts.
 * @param {string} className - Class of the container.
 * @returns {HTMLElement} The container; its text content is the whole name.
 */
export function renderName(doc, parts, className) {
  const node = make(doc, 'span', className);
  for (const part of parts) {
    node.appendChild(make(doc, 'span', `part part-${part.kind}`, part.text));
  }
  return node;
}

/**
 * Renders the side-by-side comparison of numbering options: one column per
 * option, one row per rule, each loser's first point of difference with the
 * winner in bold (`row.marks`) and the winning cells marked.
 *
 * @param {Document} doc - The document.
 * @param {{labels: string[], rows: object[]}} compare - The step's compare data.
 * @returns {HTMLTableElement} The table.
 */
function renderCompare(doc, compare) {
  const table = make(doc, 'table', 'compare');
  const head = table.createTHead().insertRow();
  head.appendChild(make(doc, 'th', '', 'Regla'));
  for (const label of compare.labels) {
    head.appendChild(make(doc, 'th', '', `Opción ${label}`));
  }
  const body = table.createTBody();
  for (const row of compare.rows) {
    const tr = body.insertRow();
    const th = make(doc, 'th', '', row.label);
    th.scope = 'row';
    tr.appendChild(th);
    row.lists.forEach((list, i) => {
      const td = tr.insertCell();
      if (!list) {
        td.textContent = '—';
        return;
      }
      if (row.winners.includes(i)) {
        td.className = 'is-winner';
      }
      if (list.length === 0) {
        td.textContent = 'ninguno';
      }
      list.forEach((value, k) => {
        if (k > 0) {
          td.appendChild(doc.createTextNode(', '));
        }
        td.appendChild((row.marks[i] || []).includes(k) ? make(doc, 'strong', 'diff', String(value)) : doc.createTextNode(String(value)));
      });
    });
  } // End of the loop over the comparison rows
  return table;
} // End of function renderCompare()

/**
 * Builds the results panel and wires it to the editor and the name button.
 *
 * @param {HTMLElement} panel - The `#results` element.
 * @param {object} editor - The editor (createEditor()).
 * @param {HTMLButtonElement} button - The "¿Cómo se llama?" button.
 * @returns {{nameCurrent: function(): object, clear: function(): void, getSteps: function(): object[]}} Handles (also used by tests).
 */
export function buildResults(panel, editor, button) {
  const doc = panel.ownerDocument;
  const body = panel.querySelector('.results-body') || panel.appendChild(make(doc, 'div', 'results-body'));
  let steps = [];
  let stepIndex = 0;
  let optionIndex = -1;
  let stepper = null;

  /**
   * Applies a highlight and locant labels on the canvas.
   *
   * @param {{highlight?: object[], locants?: Array<[number, number]>|null}} view - What to show.
   * @returns {void}
   */
  function showOnCanvas(view) {
    editor.highlight(view && view.highlight ? view.highlight : null);
    editor.showLocants(view && view.locants ? view.locants : null);
  }

  /**
   * Removes the result and every canvas mark; shows the idle hint.
   *
   * @returns {void}
   */
  function clear() {
    steps = [];
    stepper = null;
    showOnCanvas(null);
    body.replaceChildren(make(doc, 'p', 'results-hint', IDLE_HINT));
    delete panel.dataset.state;
  }

  /**
   * Shows a naming error in friendly Spanish.
   *
   * @param {{code: string, message: string}} error - The error.
   * @returns {void}
   */
  function showError(error) {
    steps = [];
    stepper = null;
    showOnCanvas(null);
    const box = make(doc, 'div', 'results-error');
    box.setAttribute('role', 'alert');
    box.dataset.code = error.code;
    box.appendChild(make(doc, 'p', 'results-error-message', error.message));
    if (ERROR_HINTS[error.code]) {
      box.appendChild(make(doc, 'p', 'results-error-hint', ERROR_HINTS[error.code]));
    }
    body.replaceChildren(box);
    panel.dataset.state = 'error';
  } // End of function showError()

  /**
   * Renders the current step of the stepper and drives the canvas.
   *
   * @returns {void}
   */
  function renderStep() {
    const step = steps[stepIndex];
    const { count, title, content, prev, next, dots } = stepper;
    stepper.root.dataset.stepId = step.id;
    count.textContent = `Paso ${stepIndex + 1} de ${steps.length}`;
    title.textContent = step.title;
    content.replaceChildren();
    for (const paragraph of step.text) {
      content.appendChild(renderMarkup(doc, paragraph));
    }
    if (step.compare) {
      content.appendChild(renderCompare(doc, step.compare));
    }
    if (step.parts) {
      const name = make(doc, 'p', 'step-name');
      name.appendChild(renderName(doc, step.parts, 'name-parts'));
      content.appendChild(name);
    }
    if (step.legend) {
      const legend = make(doc, 'ul', 'legend');
      legend.setAttribute('aria-label', 'Qué significa cada parte');
      for (const entry of step.legend) {
        const item = make(doc, 'li');
        item.appendChild(make(doc, 'span', `part part-${entry.kind}`, entry.text));
        item.appendChild(doc.createTextNode(` = ${entry.meaning}`));
        legend.appendChild(item);
      }
      content.appendChild(legend);
    }
    if (step.options && step.options.length > 0) {
      const group = make(doc, 'div', 'step-options');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-label', 'Opciones');
      step.options.forEach((option, i) => {
        const b = make(doc, 'button', 'option-button', option.label);
        b.type = 'button';
        b.setAttribute('aria-pressed', String(i === optionIndex));
        b.addEventListener('click', () => {
          optionIndex = optionIndex === i ? -1 : i;
          renderStep();
          stepper.content.querySelectorAll('.option-button')[i].focus();
        });
        group.appendChild(b);
      });
      content.appendChild(group);
      if (optionIndex >= 0) {
        const detail = renderMarkup(doc, step.options[optionIndex].text);
        detail.className = 'option-text';
        content.appendChild(detail);
      }
    } // End of the step options
    prev.disabled = stepIndex === 0;
    next.disabled = stepIndex === steps.length - 1;
    dots.forEach((dot, i) => {
      if (i === stepIndex) {
        dot.setAttribute('aria-current', 'step');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
    showOnCanvas(optionIndex >= 0 ? step.options[optionIndex] : step);
  } // End of function renderStep()

  /**
   * Moves the stepper to a step.
   *
   * @param {number} index - Step index.
   * @returns {void}
   */
  function goTo(index) {
    stepIndex = Math.max(0, Math.min(steps.length - 1, index));
    optionIndex = -1;
    renderStep();
  }

  /**
   * Builds the (hidden) stepper for the current steps.
   *
   * @returns {HTMLElement} The stepper section.
   */
  function buildStepper() {
    const root = make(doc, 'section', 'stepper');
    root.id = 'stepper';
    root.setAttribute('aria-label', 'Paso a paso');
    root.hidden = true;
    const header = make(doc, 'div', 'step-header');
    const count = make(doc, 'p', 'step-count');
    const title = make(doc, 'h3', 'step-title');
    header.append(count, title);
    const content = make(doc, 'div', 'step-content');
    content.setAttribute('aria-live', 'polite');
    const nav = make(doc, 'div', 'stepper-nav');
    const prev = make(doc, 'button', 'step-button', 'Anterior');
    prev.type = 'button';
    const next = make(doc, 'button', 'step-button', 'Siguiente');
    next.type = 'button';
    const dotBox = make(doc, 'div', 'step-dots');
    const dots = steps.map((step, i) => {
      const dot = make(doc, 'button', 'step-dot');
      dot.type = 'button';
      dot.setAttribute('aria-label', `Paso ${i + 1}: ${step.title}`);
      dot.title = step.title;
      dot.addEventListener('click', () => goTo(i));
      dotBox.appendChild(dot);
      return dot;
    });
    prev.addEventListener('click', () => goTo(stepIndex - 1));
    next.addEventListener('click', () => goTo(stepIndex + 1));
    nav.append(prev, dotBox, next);
    root.append(header, nav, content);
    stepper = { root, count, title, content, prev, next, dots };
    return root;
  } // End of function buildStepper()

  /**
   * Shows a successful result: coloured name, alternatives and the stepper toggle.
   *
   * @param {object} result - The naming result.
   * @returns {void}
   */
  function showResult(result) {
    steps = explain(result);
    stepIndex = 0;
    optionIndex = -1;
    const nodes = [];
    nodes.push(make(doc, 'p', 'result-label', 'Se llama:'));
    const name = make(doc, 'p', 'result-name');
    name.id = 'result-name';
    name.appendChild(renderName(doc, result.parts, 'name-parts'));
    nodes.push(name);
    if (result.alternatives.length > 0) {
      const section = make(doc, 'section', 'alternatives');
      section.id = 'alternatives';
      section.setAttribute('aria-labelledby', 'alternatives-title');
      const heading = make(doc, 'h3', 'alternatives-title', 'Otras formas válidas');
      heading.id = 'alternatives-title';
      const list = make(doc, 'ul', 'alternatives-list');
      for (const alternative of result.alternatives) {
        const item = make(doc, 'li', 'alternative');
        item.dataset.style = alternative.style;
        item.appendChild(renderName(doc, alternative.parts, 'alternative-name name-parts'));
        item.appendChild(make(doc, 'span', 'alternative-label', alternative.label));
        list.appendChild(item);
      }
      section.append(heading, list);
      nodes.push(section);
    } // End of the alternatives block
    const toggle = make(doc, 'button', 'stepper-toggle', 'Ver paso a paso');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'stepper');
    const root = buildStepper();
    toggle.addEventListener('click', () => {
      const open = root.hidden;
      root.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Ocultar el paso a paso' : 'Ver paso a paso';
      if (open) {
        goTo(0);
      } else {
        showOnCanvas(steps[steps.length - 1]);
      }
    });
    nodes.push(toggle, root);
    body.replaceChildren(...nodes);
    panel.dataset.state = 'result';
    showOnCanvas(steps[steps.length - 1]);
  } // End of function showResult()

  /**
   * Names the molecule on the canvas and shows the result or the error.
   *
   * @returns {object} The naming result.
   */
  function nameCurrent() {
    const result = nameMolecule(editor.getMolecule());
    if (result.ok) {
      showResult(result);
    } else {
      showError(result.error);
    }
    return result;
  }

  button.disabled = false;
  button.addEventListener('click', nameCurrent);
  editor.onEdit((event) => {
    if (event && event.kind === 'chemical' && panel.dataset.state) {
      clear();
    }
  });
  clear();
  return { nameCurrent, clear, getSteps: () => steps };
} // End of function buildResults()
