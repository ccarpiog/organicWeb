/**
 * @file Results panel (design.md §9): the "¿Cómo se llama?" button, the
 * coloured name, "Otras formas válidas", friendly Spanish errors and the
 * "Ver paso a paso" stepper (Anterior / Siguiente, progress dots) whose
 * steps drive the canvas highlights and locant labels, and "Ordenar dibujo"
 * (design.md §7): the hint offering it after naming and arrange(), which
 * applies the canonical layout as one animated, undoable coordinate edit.
 * While the drawing shows exactly that layout, the parent chain stays
 * highlighted in every step and its locants are shown from the numbering
 * step on (option views of a step are shown as they are). While the 90°
 * drawing is shown (design.md §6.3) the hint is hidden and arrange() is
 * refused with a message (the change would be invisible there); the
 * highlights follow the projected drawing. A named ring (a single
 * carbocycle) is ordered too (I-27b): its hint asks about the ring, and the
 * ordered drawing keeps the ring (closure bond included) highlighted and,
 * when its numbering step uses numbers, its locants shown.
 *
 * The "Resaltar en el dibujo" switch (one inside the stepper, one under the
 * name while the stepper is closed; both share one state) hides or shows
 * every canvas mark of the result — highlights and locant numbers, in the
 * normal and the 90° view, including the ordered drawing's parent chain —
 * without touching the stepper, which keeps advancing its text. The choice
 * is remembered through `options.initialMarks` / `options.onMarksChange`.
 *
 * A chemical edit clears the result (a stale name must never show); a
 * coordinate-only edit keeps it, and the highlights follow the moved atoms.
 * The name and the text of the current step are announced to screen
 * readers through the page's `#announcer` live region.
 *
 * «Dibujar» of the «¿Cómo se dibuja?» dialog (design.md §15.2, phase R-2b)
 * enters through showVerdict(), once the molecule of the student's name is
 * on the canvas: the loaded molecule is named, the canonical layout it was
 * loaded with becomes the ordered drawing (parent highlighted with its
 * locants, no redraw hint), and the verdict block (src/ui/draw-name.js
 * verdictBlock(): the student's name, readName()'s message and notes)
 * shows above «Se llama:». It goes with the rest of the result: a chemical
 * edit (Deshacer of the load included) clears it, a coordinate-only edit
 * keeps it.
 *
 * An `otherName` verdict with a diagnosis (design.md §15.8 R-3, phase I-49b;
 * src/reverse/diagnose.js) adds to that block the diagnosis's message (and,
 * when the student wrote the branches in another prefix style, the name in
 * that style: draw-name.js verdictEntries()), a legend of the canvas marks
 * and a «Ver el paso» button. The stepper — «Ver paso a paso» as well as
 * «Ver el paso» — then shows diagnosisExplanation()'s steps: the
 * explanation of the naming in the student's prefix style, which the
 * diagnosis compared with (never the default-style explanation, which may
 * number the chain as the student did); for the default style they are the
 * usual steps. «Se llama:», «Otras formas válidas» and «Ordenar dibujo»
 * keep the app's default naming; the ordered drawing's persistent parent
 * and locants follow the explained naming, so they agree with the steps.
 * «Ver el paso» opens the stepper at the diagnosis's step and moves the
 * focus to its title. While the verdict is on show, the student's chain is
 * highlighted in every view (stepper closed or open, not an option view) as
 * the striped `student` style under the parent (render.js HIGHLIGHT_STYLES),
 * through the same canvas marks — so it follows the 90° view, moved atoms
 * and the «Resaltar en el dibujo» switch (the legend hides with the marks)
 * — and it goes with the verdict.
 *
 * A HETEROATOM refusal (design.md §13.4 I-29) shows its message and, under
 * it, a stepper with the group steps (Reconoce los grupos, Elige el
 * principal, Sufijo o prefijo, the refusal); nothing is highlighted while
 * that stepper is closed.
 *
 * The DOM is built with createElement/textContent only (never innerHTML
 * with text), so no name or message can inject markup.
 */

import { nameMolecule } from '../naming/index.js';
import { explain, parseMarkup, plainText, GLOSSARY } from '../explain/explain.js';
import { canonicalLayout, layoutProblems } from '../layout/canonical.js';
import { diagnosisExplanation } from '../reverse/diagnose.js';
import { verdictBlock, STUDENT_LABEL, DIAGNOSIS_STEP_LABEL, LEGEND_TEXTS } from './draw-name.js';

/** Extra hints shown under an error message, by error code. */
export const ERROR_HINTS = Object.freeze({
  EMPTY: 'Usa las herramientas de la izquierda para dibujar carbonos y enlaces.',
  DISCONNECTED: 'Une las piezas con un enlace o borra las que sobran.',
});

/** Hint shown when there is no result. */
const IDLE_HINT = 'Dibuja una molécula en el lienzo y pulsa «¿Cómo se llama?», o forma un nombre con «¿Cómo se dibuja?».';

/** Question offering the redraw after naming (design.md §7). */
export const REDRAW_HINT = '¿Quieres ver la cadena principal ordenada?';

/** Question offering the redraw after naming a ring (design.md §7). */
export const REDRAW_HINT_RING = '¿Quieres ver el anillo ordenado?';

/** Label of the redraw buttons. */
export const REDRAW_LABEL = 'Ordenar dibujo';

/** Toast shown when the drawing already has the ordered layout. */
export const ALREADY_ORDERED = 'El dibujo ya está ordenado.';

/** Toast shown when no clear ordered drawing was found (the drawing is left as it is). */
export const CANNOT_ORDER = 'No he podido ordenar esta molécula sin que se crucen enlaces. El dibujo se queda como estaba.';

/**
 * Tells whether "Ordenar dibujo" can lay out a named molecule: every
 * successful naming result can (open chains and, since I-27b, single
 * carbocycles); a molecule that cannot be named shows its naming error.
 *
 * @param {object} result - A naming result.
 * @returns {boolean} True when the canonical layout applies.
 */
export function canArrange(result) {
  return Boolean(result && result.ok && result.parent);
}

/**
 * The redraw hint for a named molecule: about the ring for a ring parent,
 * about the main chain otherwise.
 *
 * @param {object} result - A successful naming result.
 * @returns {string} The Spanish question.
 */
export function redrawHint(result) {
  return result && result.structure && result.structure.parentKind === 'ring' ? REDRAW_HINT_RING : REDRAW_HINT;
}

/** Message when "Ordenar dibujo" is asked for while the 90° drawing is shown. */
export const RIGHT_ANGLE_ORDER = 'Desactiva los ángulos rectos para ordenar el dibujo.';

/** Label of the switch that hides/shows the canvas marks. */
export const MARKS_LABEL = 'Resaltar en el dibujo';

/** Tooltip of that switch. */
export const MARKS_TITLE = 'Mostrar u ocultar los colores y los números de la explicación en el dibujo';

/**
 * What the canvas shows for a view: its highlight and locants, or nothing
 * when the marks are switched off. Pure.
 *
 * @param {{highlight?: object[], locants?: Array<[number, number]>|null}|null} view - The view to draw.
 * @param {boolean} visible - True when the marks are switched on.
 * @returns {{highlight: object[]|null, locants: Array<[number, number]>|null}} Arguments for
 *   editor.highlight() and editor.showLocants().
 */
export function canvasMarks(view, visible) {
  if (!visible || !view) {
    return { highlight: null, locants: null };
  }
  return { highlight: view.highlight || null, locants: view.locants || null };
}

/**
 * Adds the student's chain of a diagnosis to a view (phase I-49b): a
 * `student` highlight first, so the renderer draws it under the view's own
 * marks (the parent's band lies on top of the wider striped one), and the
 * diagnosis's parent when the view has no parent band of its own — the
 * ordered drawing's marks supply one only while the layout is untouched,
 * and the legend names both chains after a coordinate-only edit too.
 * Option views of a step are shown as they are. Pure.
 *
 * @param {{highlight?: object[], locants?: Array<[number, number]>|null}|null} view - The view to draw.
 * @param {{atoms: number[], bonds: number[]}|null} chain - The student's chain (diagnosis.student), or null.
 * @param {boolean} [isOption] - True for an option view.
 * @param {{atoms: number[], bonds: number[]}|null} [parent] - The diagnosis's parent chain (diagnosis.parent), or null.
 * @returns {object|null} The view with the chain, or the view unchanged.
 */
export function withStudentChain(view, chain, isOption = false, parent = null) {
  if (!view || !chain || isOption || chain.atoms.length === 0) {
    return view;
  }
  const own = view.highlight || [];
  const marks = parent && parent.atoms.length > 0 && !own.some((spec) => spec.style === 'parent')
    ? [{ atoms: [...parent.atoms], bonds: [...parent.bonds], style: 'parent' }, ...own]
    : own;
  return { ...view, highlight: [{ atoms: [...chain.atoms], bonds: [...chain.bonds], style: 'student' }, ...marks] };
}

/**
 * The explanation the stepper shows for a «Dibujar» verdict: for an
 * `otherName` verdict with a diagnosis, diagnosisExplanation() (the steps of
 * the naming in the student's prefix style and the index of the
 * diagnosis's step); null otherwise, or should it have no steps or fail (a
 * bug: the verdict, which draws the molecule and names it, never depends on
 * its diagnosis — the usual explanation is shown then).
 *
 * @param {object} verdict - A readName() verdict.
 * @param {function(object): object[]} [explainSteps] - Builds the steps of a naming (default explain()).
 * @returns {{naming: object, steps: object[], index: number}|null} The explanation, or null.
 */
export function verdictExplanation(verdict, explainSteps = explain) {
  if (!verdict || verdict.kind !== 'otherName' || !verdict.diagnosis) {
    return null;
  }
  let explanation = null;
  try {
    explanation = diagnosisExplanation(verdict, explainSteps);
  } catch {
    return null;
  }
  const usable = explanation && explanation.naming && explanation.naming.ok && explanation.steps.length > 0 && explanation.index >= 0;
  return usable ? explanation : null;
} // End of function verdictExplanation()

/**
 * Builds a "Resaltar en el dibujo" switch: a toggle button whose
 * `aria-pressed` tells whether the canvas marks are shown.
 *
 * @param {Document} doc - The document.
 * @param {string} id - Id of the button.
 * @param {boolean} on - Initial state.
 * @param {function(): void} onToggle - Called on every press (click, Enter, Space).
 * @returns {HTMLButtonElement} The button.
 */
export function makeMarksToggle(doc, id, on, onToggle) {
  const button = doc.createElement('button');
  button.type = 'button';
  button.id = id;
  button.className = 'marks-toggle';
  button.textContent = MARKS_LABEL;
  button.title = MARKS_TITLE;
  button.setAttribute('aria-pressed', String(Boolean(on)));
  button.addEventListener('click', onToggle);
  return button;
}

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

/** Margin (px) kept between a glossary tooltip and the window edges. */
const TIP_MARGIN = 8;

/** Widest a glossary tooltip gets (px); matches `.term::after` max-width (16rem). */
const TIP_MAX_WIDTH = 256;

/**
 * Horizontal shift (px) that keeps a glossary tooltip, drawn from the left
 * edge of its term, inside the window. Pure.
 *
 * @param {number} left - Left edge of the term (client px).
 * @param {number} viewportWidth - Width of the window (px).
 * @returns {{shift: number, width: number}} Shift to the left (≤ 0) and the tooltip's maximum width.
 */
export function tipPlacement(left, viewportWidth) {
  const width = Math.max(0, Math.min(TIP_MAX_WIDTH, viewportWidth - 2 * TIP_MARGIN));
  const overflow = left + width - (viewportWidth - TIP_MARGIN);
  const shift = overflow > 0 ? -Math.min(overflow, Math.max(0, left - TIP_MARGIN)) : 0;
  return { shift, width };
}

/**
 * Places the tooltip of a glossary term so that it stays inside the window
 * (on phones a term near the right edge would otherwise cause a horizontal
 * scroll).
 *
 * @param {HTMLElement} term - The `.term` span.
 * @returns {void}
 */
function placeTip(term) {
  const view = term.ownerDocument.defaultView;
  if (!view) {
    return;
  }
  // A term split over two lines anchors its tooltip to its first line box.
  const first = term.getClientRects()[0] || term.getBoundingClientRect();
  const { shift, width } = tipPlacement(first.left, view.innerWidth);
  term.style.setProperty('--tip-shift', `${shift}px`);
  term.style.setProperty('--tip-width', `${width}px`);
}

/**
 * Renders a paragraph with glossary terms as focusable, underlined spans
 * whose definition shows as a tooltip (on hover, on keyboard focus and on a
 * tap; Esc hides it).
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
      // Esc dismisses the tooltip (hover and focus alike) until a fresh
      // interaction: the pointer leaves the term, or the term is focused again.
      term.addEventListener('pointerenter', () => placeTip(term));
      term.addEventListener('pointerleave', () => term.classList.remove('tip-dismissed'));
      term.addEventListener('focus', () => {
        term.classList.remove('tip-dismissed');
        placeTip(term);
      });
      term.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          term.classList.add('tip-dismissed');
        }
      });
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
 * @param {{notify?: function(string): void, initialMarks?: boolean, onMarksChange?: function(boolean): void}} [options] -
 *   `notify(message)` shows a Spanish toast; `initialMarks` (default true) tells whether the canvas
 *   marks start switched on; `onMarksChange(on)` is called when the student flips the switch.
 * @returns {{nameCurrent: function(): object, clear: function(): void, getSteps: function(): object[],
 *   arrange: function(): object, isOrdered: function(): boolean, setMarksVisible: function(boolean): void,
 *   marksVisible: function(): boolean, showVerdict: function(object, object): object}} Handles (also used by tests).
 */
export function buildResults(panel, editor, button, options = {}) {
  const doc = panel.ownerDocument;
  const body = panel.querySelector('.results-body') || panel.appendChild(make(doc, 'div', 'results-body'));
  let steps = [];
  let stepIndex = 0;
  let optionIndex = -1;
  let stepper = null;
  let current = null; // The successful result on show.
  let explained = null; // The naming the steps explain: `current`, or a diagnosis's naming in the student's style.
  let studentChain = null; // The student's chain of a diagnosed verdict on show ({atoms, bonds}), else null.
  let parentChain = null; // That diagnosis's parent chain ({atoms, bonds}), else null.
  let arranged = null; // Positions of the last canonical layout applied (Map id → {x, y}).
  let ordered = false; // True while the drawing shows exactly that layout.
  let lastView = null; // The step (or option) the canvas marks come from.
  let hint = null; // The redraw hint box.
  let marksOn = options.initialMarks !== false; // "Resaltar en el dibujo".
  const announcer = doc.getElementById('announcer');

  /**
   * Announces a text to screen readers through `#announcer` (a polite live
   * region). Repeating the same text still announces it.
   *
   * @param {string} text - Spanish text.
   * @returns {void}
   */
  function announce(text) {
    if (!announcer) {
      return;
    }
    // A changed text is what triggers the announcement: alternate a trailing no-break space.
    announcer.textContent = announcer.textContent === text ? `${text}\u00a0` : text;
  }

  /**
   * Plain text of the current step for screen readers: "Paso 2 de 5. Title. Paragraphs".
   *
   * @returns {string} The announcement.
   */
  function stepAnnouncement() {
    const step = steps[stepIndex];
    const text = step.text.map(plainText).join(' ');
    return `Paso ${stepIndex + 1} de ${steps.length}. ${step.title}. ${text}`.trim();
  }

  /**
   * Adds the persistent marks of the ordered drawing to a step view: the
   * parent highlight (chain, or ring with its closure bond), and its locants
   * from the numbering step on when the step shows none. A ring whose
   * numbering step shows no numbers (a bare ring) gets none. The parent is
   * that of the naming the steps explain (`explained`), so its numbers
   * agree with the numbering step.
   *
   * @param {object|null} view - The step view.
   * @param {boolean} isOption - True for an option view (shown unchanged).
   * @returns {object|null} The view to draw.
   */
  function withOrderedMarks(view, isOption) {
    if (!ordered || !current || !view || isOption) {
      return view;
    }
    const named = explained || current;
    const parent = { atoms: named.parent.atoms, bonds: named.parent.bonds, style: 'parent' };
    const highlight = view.highlight || [];
    const next = { ...view };
    if (!highlight.some((spec) => spec.style === 'parent')) {
      next.highlight = [parent, ...highlight];
    }
    const numbering = steps.findIndex((step) => step.id === 'numbering' || step.id === 'ringNumbering');
    const at = stepper && !stepper.root.hidden ? stepIndex : steps.length - 1;
    const unnumbered = numbering >= 0 && steps[numbering].id === 'ringNumbering' && !steps[numbering].locants;
    // Only a numbered parent gets persistent locants: no numbering step (benzene, I-28) means no numbers.
    if (!view.locants && numbering >= 0 && at >= numbering && !unnumbered) {
      next.locants = named.parent.atoms.map((id, i) => [id, i + 1]);
    }
    return next;
  } // End of function withOrderedMarks()

  /**
   * Applies a highlight and locant labels on the canvas.
   *
   * @param {{highlight?: object[], locants?: Array<[number, number]>|null}} view - What to show.
   * @param {boolean} [isOption] - True when the view is one of a step's options.
   * @returns {void}
   */
  function showOnCanvas(view, isOption = false) {
    lastView = { view, isOption };
    const marks = canvasMarks(withStudentChain(withOrderedMarks(view, isOption), studentChain, isOption, parentChain), marksOn);
    editor.highlight(marks.highlight);
    editor.showLocants(marks.locants);
  }

  /**
   * Switches the canvas marks on or off: updates every switch, shows or
   * hides the legend of a diagnosis's chains with the marks it describes,
   * and redraws the current view (the stepper stays where it is).
   *
   * @param {boolean} on - True to show the marks.
   * @returns {void}
   */
  function setMarksVisible(on) {
    marksOn = Boolean(on);
    for (const button of body.querySelectorAll('.marks-toggle')) {
      button.setAttribute('aria-pressed', String(marksOn));
    }
    for (const legend of body.querySelectorAll('.verdict-legend')) {
      legend.hidden = !marksOn;
    }
    if (lastView) {
      showOnCanvas(lastView.view, lastView.isOption);
    }
  }

  /**
   * Handles a press on a "Resaltar en el dibujo" switch.
   *
   * @returns {void}
   */
  function toggleMarks() {
    setMarksVisible(!marksOn);
    if (options.onMarksChange) {
      options.onMarksChange(marksOn);
    }
  }

  /**
   * Tells whether the drawing shows exactly the last canonical layout applied.
   *
   * @returns {boolean} True when every atom sits at its arranged position.
   */
  function matchesArranged() {
    if (!arranged) {
      return false;
    }
    const mol = editor.peekMolecule();
    if (mol.atoms.size !== arranged.size) {
      return false;
    }
    for (const [id, p] of arranged) {
      const atom = mol.atoms.get(id);
      if (!atom || Math.abs(atom.x - p.x) > 1e-6 || Math.abs(atom.y - p.y) > 1e-6) {
        return false;
      }
    }
    return true;
  } // End of function matchesArranged()

  /**
   * Tells whether the 90° drawing is shown.
   *
   * @returns {boolean} True while the editor shows a projection.
   */
  function isProjected() {
    return typeof editor.isProjected === 'function' && editor.isProjected();
  }

  /**
   * Updates the ordered state, the redraw hint and the canvas marks.
   *
   * @returns {void}
   */
  function syncOrdered() {
    ordered = current !== null && matchesArranged();
    if (hint) {
      hint.hidden = ordered || isProjected();
    }
    // A refusal with group steps (current null) keeps its step marks too.
    if ((current || steps.length > 0) && lastView) {
      showOnCanvas(lastView.view, lastView.isOption);
    }
  }

  /**
   * Removes the result and every canvas mark; shows the idle hint.
   *
   * @returns {void}
   */
  function clear() {
    steps = [];
    stepper = null;
    current = null;
    explained = null;
    studentChain = null;
    parentChain = null;
    arranged = null;
    ordered = false;
    hint = null;
    showOnCanvas(null);
    if (announcer) {
      announcer.textContent = ''; // No stale name for screen readers.
    }
    body.replaceChildren(make(doc, 'p', 'results-hint', IDLE_HINT));
    delete panel.dataset.state;
  }

  /**
   * Shows a naming error in friendly Spanish. A refusal that comes with
   * explanation steps (HETEROATOM with its groups, design.md §13.4 I-29)
   * also gets the "Ver paso a paso" stepper under the message.
   *
   * @param {{code: string, message: string}} error - The error.
   * @param {object[]} [errorSteps] - Explanation steps of the refusal (explain()).
   * @returns {void}
   */
  function showError(error, errorSteps = []) {
    steps = errorSteps;
    stepIndex = 0;
    optionIndex = -1;
    stepper = null;
    current = null;
    explained = null;
    studentChain = null;
    parentChain = null;
    arranged = null;
    ordered = false;
    hint = null;
    showOnCanvas(null);
    if (announcer) {
      announcer.textContent = ''; // The error box is a role="alert" region of its own.
    }
    const box = make(doc, 'div', 'results-error');
    box.setAttribute('role', 'alert');
    box.dataset.code = error.code;
    box.appendChild(make(doc, 'p', 'results-error-message', error.message));
    if (ERROR_HINTS[error.code]) {
      box.appendChild(make(doc, 'p', 'results-error-hint', ERROR_HINTS[error.code]));
    }
    body.replaceChildren(box, ...(steps.length > 0 ? stepperNodes(false) : []));
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
      // The wrapper scrolls sideways on narrow screens, never the page.
      const wrap = make(doc, 'div', 'compare-wrap');
      wrap.appendChild(renderCompare(doc, step.compare));
      content.appendChild(wrap);
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
    if (optionIndex >= 0) {
      announce(`${step.options[optionIndex].label}: ${plainText(step.options[optionIndex].text)}`);
    } else {
      announce(stepAnnouncement());
    }
    prev.disabled = stepIndex === 0;
    next.disabled = stepIndex === steps.length - 1;
    dots.forEach((dot, i) => {
      if (i === stepIndex) {
        dot.setAttribute('aria-current', 'step');
      } else {
        dot.removeAttribute('aria-current');
      }
    });
    showOnCanvas(optionIndex >= 0 ? step.options[optionIndex] : step, optionIndex >= 0);
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
    const top = make(doc, 'div', 'step-top');
    const count = make(doc, 'p', 'step-count');
    top.append(count, makeMarksToggle(doc, 'stepper-marks-toggle', marksOn, toggleMarks));
    const title = make(doc, 'h3', 'step-title');
    title.tabIndex = -1; // «Ver el paso» moves the focus here (never in the Tab order).
    header.append(top, title);
    const content = make(doc, 'div', 'step-content');
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
   * Builds the "Ver paso a paso" toggle, its controls row and the (hidden)
   * stepper for the current steps. With `withMarks`, a "Resaltar en el
   * dibujo" switch sits next to the toggle while the stepper is closed (the
   * canvas then keeps the last step's marks); without it (a refusal with
   * group steps, I-29) the closed stepper leaves the canvas unmarked.
   *
   * @param {boolean} withMarks - True for a named result.
   * @returns {HTMLElement[]} The controls row and the stepper section.
   */
  function stepperNodes(withMarks) {
    const toggle = make(doc, 'button', 'stepper-toggle', 'Ver paso a paso');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'stepper');
    const root = buildStepper();
    // While the stepper is closed the canvas keeps the whole name's marks:
    // this switch (same state as the stepper's) governs them.
    const outerMarks = withMarks ? makeMarksToggle(doc, 'result-marks-toggle', marksOn, toggleMarks) : null;
    /**
     * Opens the stepper at a step, or closes it (the canvas then keeps the
     * whole name's marks, or none for a refusal).
     *
     * @param {boolean} open - True to open.
     * @param {number} [index] - The step to open at (default the first).
     * @returns {void}
     */
    const setOpen = (open, index = 0) => {
      root.hidden = !open;
      if (outerMarks) {
        outerMarks.hidden = open;
      }
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Ocultar el paso a paso' : 'Ver paso a paso';
      if (open) {
        goTo(index);
      } else {
        showOnCanvas(withMarks ? steps[steps.length - 1] : null);
      }
    }; // End of function setOpen()
    toggle.addEventListener('click', () => setOpen(root.hidden));
    stepper.setOpen = setOpen;
    const controls = make(doc, 'div', 'result-controls');
    controls.append(toggle);
    if (outerMarks) {
      controls.append(outerMarks);
    }
    return [controls, root];
  } // End of function stepperNodes()

  /**
   * «Ver el paso»: opens the stepper (if closed) at a step and moves the
   * focus to the step's title, so the keyboard continues from there (Tab
   * reaches «Anterior» / «Siguiente») and a screen reader reads it.
   *
   * @param {number} index - The step index.
   * @returns {void}
   */
  function openStepAt(index) {
    if (!stepper) {
      return;
    }
    if (stepper.root.hidden) {
      stepper.setOpen(true, index);
    } else {
      goTo(index);
    }
    stepper.title.focus();
  } // End of function openStepAt()

  /**
   * Builds the legend of a diagnosis's canvas marks: a swatch drawn like
   * each mark (solid parent, striped student's chain) and its name. Hidden
   * while the marks are switched off.
   *
   * @param {{style: string, text: string}[]} entries - draw-name.js diagnosisLegend().
   * @returns {HTMLUListElement} The legend.
   */
  function legendNode(entries) {
    const legend = make(doc, 'ul', 'verdict-legend');
    legend.setAttribute('aria-label', LEGEND_TEXTS.label);
    legend.hidden = !marksOn;
    for (const entry of entries) {
      const item = make(doc, 'li', `verdict-legend-item verdict-legend-item--${entry.style}`);
      const swatch = make(doc, 'span', `verdict-swatch verdict-swatch--${entry.style}`);
      swatch.setAttribute('aria-hidden', 'true');
      item.append(swatch, make(doc, 'span', 'verdict-legend-text', entry.text));
      legend.appendChild(item);
    }
    return legend;
  } // End of function legendNode()

  /** Class of each verdict-block text entry, by role (draw-name.js verdictEntries()). */
  const ENTRY_CLASSES = Object.freeze({
    message: 'verdict-message',
    style: 'verdict-style',
    diagnosis: 'verdict-diagnosis',
    hint: 'verdict-hint',
    note: 'verdict-note',
  });

  /**
   * Builds the verdict block of «Dibujar» (design.md §15.3): the student's
   * name, coloured like the result name, then the text entries — the
   * verdict's message, its notes (the old-style note) and, for a diagnosis
   * (R-3), its message between the verdict's two sentences — and, for a
   * diagnosis, the legend of the two chains on the canvas and «Ver el paso».
   *
   * @param {{kind: string, tone: string, student: {text: string, kind: string}[],
   *   entries: {role: string, text: string}[], diagnosis: {code: string, legend: object[]|null}|null}} block -
   *   verdictBlock() output.
   * @param {{index: number}|null} explanation - The explanation the stepper shows (verdictExplanation()), or null.
   * @returns {HTMLElement} The block.
   */
  function verdictNode(block, explanation) {
    const section = make(doc, 'section', `verdict verdict--${block.tone}`);
    section.id = 'verdict';
    section.dataset.kind = block.kind;
    section.setAttribute('aria-label', 'Tu nombre');
    const student = make(doc, 'p', 'verdict-student');
    student.append(make(doc, 'span', 'verdict-student-label', STUDENT_LABEL), doc.createTextNode(' '),
      renderName(doc, block.student, 'verdict-student-name name-parts'));
    section.appendChild(student);
    for (const entry of block.entries) {
      const paragraph = make(doc, 'p', ENTRY_CLASSES[entry.role] || 'verdict-note', entry.text);
      if (entry.role === 'diagnosis') {
        paragraph.id = 'verdict-diagnosis';
      }
      section.appendChild(paragraph);
    }
    if (block.diagnosis) {
      section.dataset.diagnosis = block.diagnosis.code;
      const tools = make(doc, 'div', 'verdict-tools');
      if (block.diagnosis.legend) {
        tools.appendChild(legendNode(block.diagnosis.legend));
      }
      if (explanation) {
        const button = make(doc, 'button', 'verdict-step-button', DIAGNOSIS_STEP_LABEL);
        button.type = 'button';
        button.id = 'diagnosis-step-button';
        button.setAttribute('aria-controls', 'stepper');
        button.setAttribute('aria-describedby', 'verdict-diagnosis');
        button.addEventListener('click', () => openStepAt(explanation.index));
        tools.appendChild(button);
      }
      section.appendChild(tools);
    } // End of the diagnosis tools
    return section;
  } // End of function verdictNode()

  /**
   * Shows a successful result: coloured name, alternatives and the stepper
   * toggle; with a verdict («Dibujar»), its block goes first and is announced
   * with the name, and a diagnosed verdict's explanation and student's chain
   * replace the usual steps and join the canvas marks (file header).
   *
   * @param {object} result - The naming result.
   * @param {{block: object, explanation: {naming: object, steps: object[], index: number}|null,
   *   student: {atoms: number[], bonds: number[]}|null, parent?: {atoms: number[], bonds: number[]}|null}|null} [shown] -
   *   The verdict on show: its verdictBlock(), its verdictExplanation() and the student's and parent chains of its
   *   diagnosis; null for a plain result.
   * @returns {void}
   */
  function showResult(result, shown = null) {
    const block = shown ? shown.block : null;
    const explanation = shown ? shown.explanation : null;
    steps = explanation ? explanation.steps : explain(result);
    stepIndex = 0;
    optionIndex = -1;
    current = result;
    explained = explanation ? explanation.naming : result;
    studentChain = shown && shown.student ? shown.student : null;
    parentChain = studentChain && shown.parent ? shown.parent : null;
    arranged = null;
    ordered = false;
    const nodes = [];
    if (block) {
      nodes.push(verdictNode(block, explanation));
    }
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
    hint = make(doc, 'div', 'redraw-hint');
    hint.id = 'redraw-hint';
    hint.appendChild(make(doc, 'p', 'redraw-hint-text', redrawHint(result)));
    const redraw = make(doc, 'button', 'redraw-hint-button', REDRAW_LABEL);
    redraw.type = 'button';
    redraw.addEventListener('click', () => arrange());
    hint.appendChild(redraw);
    hint.hidden = isProjected();
    nodes.push(hint);
    nodes.push(...stepperNodes(true));
    body.replaceChildren(...nodes);
    panel.dataset.state = 'result';
    showOnCanvas(steps[steps.length - 1]);
    announce(block ? `${block.lines.join(' ')} Se llama: ${result.name}` : `Se llama: ${result.name}`);
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
      showError(result.error, explain(result));
    }
    return result;
  }

  /**
   * «Dibujar» (design.md §15.2): called once the molecule of a success
   * verdict is on the canvas, loaded with the canonical layout `laid`.
   * Names the loaded molecule (its ids are the verdict's), shows the result
   * with the verdict block above «Se llama:», and only then registers the
   * layout as the ordered drawing — showResult() resets it (design.md §15.9
   * trap 1) — so the parent is highlighted with its locants, as after
   * «Ordenar dibujo», and the redraw hint stays hidden. A diagnosed
   * `otherName` verdict (R-3) brings its explanation in the student's prefix
   * style (verdictExplanation(), never explain() of the verdict's own
   * naming) and its student's chain; both ids are the loaded molecule's.
   *
   * @param {object} verdict - The readName() verdict (correct, alternative, missingLocants or otherName).
   * @param {{atoms: Map<number, {id: number, x: number, y: number}>}} laid - The molecule as loaded (its layout).
   * @returns {object} The naming result of the loaded molecule.
   */
  function showVerdict(verdict, laid) {
    const result = nameMolecule(editor.getMolecule());
    if (!result.ok) {
      showError(result.error, explain(result)); // Never seen: the verdict's molecule was named by the same engine.
      return result;
    }
    const explanation = verdictExplanation(verdict);
    const diagnosis = verdict.kind === 'otherName' && verdict.diagnosis ? verdict.diagnosis : null;
    const student = diagnosis ? diagnosis.student : null;
    const parent = diagnosis ? diagnosis.parent : null;
    showResult(result, { block: verdictBlock(verdict, explanation), explanation, student, parent });
    arranged = new Map([...laid.atoms.values()].map((a) => [a.id, { x: a.x, y: a.y }]));
    syncOrdered();
    return result;
  } // End of function showVerdict()

  /**
   * "Ordenar dibujo": names the molecule first when no name is shown, then
   * applies its canonical layout (design.md §7) as one animated, undoable
   * coordinate edit. The name stays on show. A layout with crossing bonds or
   * atoms too close together (layoutProblems()) is refused with a message.
   * Chains and single carbocycles are both laid out (canonicalLayout()
   * picks the strategy); a molecule that cannot be named shows its error.
   *
   * @returns {object} The naming result on failure, else the edit outcome.
   */
  function arrange() {
    if (isProjected()) {
      if (options.notify) {
        options.notify(RIGHT_ANGLE_ORDER);
      }
      return { ok: false, message: RIGHT_ANGLE_ORDER };
    }
    if (!current) {
      const result = nameCurrent();
      if (!result.ok) {
        return result;
      }
    }
    if (!canArrange(current)) {
      return current;
    }
    const laid = canonicalLayout(editor.getMolecule(), current);
    if (!layoutProblems(laid).ok) {
      if (options.notify) {
        options.notify(CANNOT_ORDER);
      }
      return { ok: false, message: CANNOT_ORDER };
    }
    const positions = new Map([...laid.atoms.values()].map((a) => [a.id, { x: a.x, y: a.y }]));
    arranged = positions;
    // Already ordered (up to rounding): no new undo step.
    const outcome = matchesArranged() ? { ok: true, changed: false } : editor.animateCoordinates(positions, { fit: true });
    if (outcome.ok && !outcome.changed && options.notify) {
      options.notify(ALREADY_ORDERED);
    }
    syncOrdered();
    return outcome;
  } // End of function arrange()

  button.disabled = false;
  button.addEventListener('click', nameCurrent);
  if (typeof editor.onViewChange === 'function') {
    editor.onViewChange(syncOrdered);
  }
  editor.onEdit((event) => {
    if (event && event.kind === 'chemical' && panel.dataset.state) {
      clear();
    } else if (event && event.kind === 'coordinates') {
      syncOrdered();
    }
  });
  clear();
  return {
    nameCurrent,
    clear,
    getSteps: () => steps,
    arrange,
    isOrdered: () => ordered,
    setMarksVisible,
    marksVisible: () => marksOn,
    showVerdict,
  };
} // End of function buildResults()
