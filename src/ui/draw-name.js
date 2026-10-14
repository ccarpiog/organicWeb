/**
 * @file «Dibujar» of the «¿Cómo se dibuja?» dialog (design.md §15.2; phase
 * R-2b): what the app does with a name readName() understands
 * (src/reverse/index.js: a `correct`, `alternative`, `missingLocants` or
 * `otherName` verdict, which carries one molecule to draw). DOM-free: the
 * editor, the results panel and the dialog are injected, so the order of
 * the steps is unit-tested on its own.
 *
 * 1. The canonical layout of the verdict's molecule («Ordenar dibujo»,
 *    canonicalLayout()) is computed and checked with layoutProblems()
 *    **before** the canvas is touched (design.md §15.9 trap 2). A layout
 *    that cannot be made, or that has crossing bonds or crowded atoms,
 *    keeps the dialog open with CANNOT_DRAW under the name line.
 * 2. editor.loadMolecule() replaces the drawing as one undoable edit (it
 *    keeps the atom ids, so the verdict's ids stay valid, trap 4); its
 *    outcome is checked (a refusal is shown in the dialog, the canvas is
 *    untouched). Being an edit, it clears any result on show, and the
 *    autosave stores the new molecule (trap 5).
 * 3. With its `center` option the same edit fits the view to the drawing as
 *    displayed, so the 90° view preference is kept, and the change of view
 *    belongs to the edit: Deshacer shows the old drawing in its old view
 *    (zoom and pan), Rehacer the new one centred again.
 * 4. The results panel names the loaded molecule, registers the layout as
 *    the ordered drawing and shows the verdict block above «Se llama:»
 *    (results.js showVerdict(), which builds the block with verdictBlock()).
 * 5. The dialog closes (the focus goes back to its launcher).
 *
 * The verdict texts are readName()'s own (design.md §15.3 drafts, pending
 * teacher review): this module only arranges them.
 *
 * The diagnosis of an `otherName` verdict (design.md §15.8 R-3, phase
 * I-49b; src/reverse/diagnose.js) goes between the verdict's two sentences
 * («…pero se llama «X».» · the diagnosis · «Pulsa «Ver paso a paso»…»).
 * Two decisions, both in verdictEntries():
 *
 * - **The student's prefix style.** A diagnosis compares the name with the
 *   engine's naming in the student's own prefix style (`propan-2-il`
 *   rather than `isopropil`), and the stepper explains that naming
 *   (diagnosisExplanation()), so that a NUMBERING diagnosis is not
 *   contradicted by a default-style numbering. «Se llama:» always keeps the
 *   app's default name; when the explained name differs, one more line
 *   (styleLine(), before the diagnosis) gives the name in the student's style
 *   with its label and says the stepper uses it.
 * - **The old style.** An `OLD_STYLE` diagnosis says what the old-style note
 *   says, and more (where the numbers go now), so the note is left out
 *   then; beside any other diagnosis (or none) the note stays.
 *
 * The canvas side (the student's chain striped beside the parent, its legend,
 * «Ver el paso») is results.js showVerdict()'s.
 */

import { canonicalLayout, layoutProblems } from '../layout/canonical.js';
import { VERDICT_TEXTS } from '../reverse/index.js';
import { isSuccess, verdictFeedback } from './name-builder-state.js';

/** Dialog message when the molecule of an understood name cannot be drawn clearly (design.md §15.2). */
export const CANNOT_DRAW = 'He entendido el nombre, pero no consigo dibujar esta molécula sin que se crucen enlaces.';

/** Label of the student's own name in the verdict block (draft pending teacher review). */
export const STUDENT_LABEL = 'Tu nombre:';

/** Label of the button that opens the stepper at the diagnosis's step (design.md §15.8 R-3; draft). */
export const DIAGNOSIS_STEP_LABEL = 'Ver el paso';

/**
 * The line telling, when the stepper explains the name in the student's
 * prefix style, which name that is (drafts pending teacher review).
 *
 * @param {string} name - The name in the student's style.
 * @param {string|null} label - Its label among «Otras formas válidas», or null.
 * @returns {string} The Spanish line.
 */
export function styleLine(name, label) {
  return `Con las ramas escritas como en tu nombre, se escribe «${name}»${label ? ` (${label})` : ''}. `
    + 'El paso a paso usa ese nombre.';
}

/**
 * Accessible name of the legend of the two chains on the canvas, and its
 * entries (drafts pending teacher review); a ring (phase I-50d) is named as
 * such: the parent ring is still the «cadena principal», as the
 * explanation calls it, and the student's ring is «tu anillo».
 */
export const LEGEND_TEXTS = Object.freeze({
  label: 'Qué se ve en el dibujo',
  parent: 'Cadena principal',
  parentRing: 'Cadena principal (el anillo)',
  student: 'Tu cadena',
  same: 'Tu cadena (es la misma)',
  studentRing: 'Tu anillo',
  sameRing: 'Tu anillo (es el mismo)',
});

/**
 * Tells whether a parent selection of a diagnosis is a ring: as many bonds
 * as atoms (the closing bond is listed too), where a chain has one bond
 * fewer.
 *
 * @param {{atoms: number[], bonds: number[]}|null} ids - The selection.
 * @returns {boolean} True for a ring.
 */
function isRingSelection(ids) {
  return Boolean(ids) && ids.atoms.length >= 3 && ids.bonds.length === ids.atoms.length;
}

/**
 * The legend of the canvas marks of a diagnosis: the parent (solid) and the
 * student's chain (striped), the latter said to be the same chain when both
 * have the same atoms and bonds (in any order: a numbering mistake). A ring
 * is named as a ring (LEGEND_TEXTS): the app's ring beside the student's
 * chain (`1-(4-metilfenil)propano`), or the same ring numbered otherwise.
 * Pure.
 *
 * @param {{student: {atoms: number[], bonds: number[]}, parent: {atoms: number[], bonds: number[]}}|null} diagnosis -
 *   A diagnosis (diagnose.js), or null.
 * @returns {{style: 'parent'|'student', text: string}[]|null} The entries, or null without a diagnosis or a student chain.
 */
export function diagnosisLegend(diagnosis) {
  if (!diagnosis || !diagnosis.student || diagnosis.student.atoms.length === 0) {
    return null;
  }
  /**
   * Tells whether two id lists hold the same ids, in any order.
   *
   * @param {number[]} a - Ids.
   * @param {number[]} b - Ids.
   * @returns {boolean} True for the same set.
   */
  const sameSet = (a, b) => a.length === b.length && a.every((id) => b.includes(id));
  const { student, parent } = diagnosis;
  const same = Boolean(parent) && sameSet(student.atoms, parent.atoms) && sameSet(student.bonds, parent.bonds);
  const ring = isRingSelection(student);
  let studentText = ring ? LEGEND_TEXTS.studentRing : LEGEND_TEXTS.student;
  if (same) {
    studentText = ring ? LEGEND_TEXTS.sameRing : LEGEND_TEXTS.same;
  }
  return [
    { style: 'parent', text: isRingSelection(parent) ? LEGEND_TEXTS.parentRing : LEGEND_TEXTS.parent },
    { style: 'student', text: studentText },
  ];
} // End of function diagnosisLegend()

/**
 * Tone of the verdict block by verdict kind: `correct` for a name the app
 * accepts, `almost` for left-out locants, `other` for another name.
 */
export const VERDICT_TONES = Object.freeze({
  correct: 'correct',
  alternative: 'correct',
  missingLocants: 'almost',
  otherName: 'other',
});

/**
 * The centre of a drawing's bounding box, where the new drawing is placed
 * (so Deshacer shows the old drawing near the same view); the origin for
 * an empty canvas.
 *
 * @param {{atoms: Map<number, {x: number, y: number}>}|null} mol - The molecule on the canvas.
 * @returns {{x: number, y: number}} The centre.
 */
export function drawingCentre(mol) {
  const atoms = mol && mol.atoms ? [...mol.atoms.values()] : [];
  if (atoms.length === 0) {
    return { x: 0, y: 0 };
  }
  const xs = atoms.map((a) => a.x);
  const ys = atoms.map((a) => a.y);
  return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
}

/**
 * The ordered drawing of a verdict's molecule: its canonical layout
 * («Ordenar dibujo», design.md §7) centred on a point, or null when the
 * verdict has nothing to draw, the layout cannot be made, or it has
 * problems (layoutProblems(): crossing bonds, atoms too close together).
 *
 * @param {{draw?: boolean, molecule?: object|null, naming?: object|null}} verdict - A readName() verdict.
 * @param {{x: number, y: number}} [center] - Where the drawing is centred (default the origin).
 * @returns {object|null} A copy of the molecule with the layout's coordinates (same ids), or null.
 */
export function verdictLayout(verdict, center = { x: 0, y: 0 }) {
  if (!verdict || !verdict.draw || !verdict.molecule || !verdict.naming || !verdict.naming.ok) {
    return null;
  }
  let laid;
  try {
    laid = canonicalLayout(verdict.molecule, verdict.naming, { center });
  } catch {
    return null; // A molecule the canonical layout does not handle: treated like a layout with problems.
  }
  return layoutProblems(laid).ok ? laid : null;
} // End of function verdictLayout()

/**
 * The student's name as coloured parts (the assembler's spans, as on the
 * dialog's name line), or the whole text as one part when the spans do not
 * give the text back.
 *
 * @param {{text: string, spans?: {from: number, to: number, kind: string}[]}} verdict - A readName() verdict.
 * @returns {{text: string, kind: string}[]} The parts; their texts join into the name.
 */
export function studentParts(verdict) {
  const text = verdict.text || '';
  const parts = (verdict.spans || [])
    .map((span) => ({ text: text.slice(span.from, span.to), kind: span.kind }))
    .filter((part) => part.text !== '');
  return parts.map((part) => part.text).join('') === text ? parts : [{ text, kind: 'stem' }];
}

/**
 * The text entries of a verdict block, each with its role: without a
 * diagnosis, readName()'s message and notes (the lines the dialog shows,
 * verdictFeedback()); with one (file header), the message split around it
 * — `message` («…pero se llama «X».»), `style` (the name the stepper
 * explains, when it is not «Se llama»'s), `diagnosis`, `hint` («Pulsa «Ver
 * paso a paso»…») — then the notes, the old-style note left out beside an
 * `OLD_STYLE` diagnosis. Pure.
 *
 * @param {object} verdict - A success verdict of readName().
 * @param {{naming: object}|null} explanation - diagnosisExplanation() of the verdict, or null.
 * @returns {{role: 'message'|'style'|'diagnosis'|'hint'|'note', text: string}[]} The entries, in order.
 */
export function verdictEntries(verdict, explanation) {
  const { diagnosis } = verdict;
  if (!diagnosis) {
    return verdictFeedback(verdict, 0).lines.map((text, i) => ({ role: i === 0 ? 'message' : 'note', text }));
  }
  const entries = [];
  const tail = ` ${VERDICT_TEXTS.stepByStep}`;
  const split = verdict.message.endsWith(tail);
  entries.push({ role: 'message', text: split ? verdict.message.slice(0, -tail.length) : verdict.message });
  const styled = explanation && explanation.naming && explanation.naming.ok ? explanation.naming.name : null;
  if (styled && styled !== verdict.name) {
    const alternative = (verdict.alternatives || []).find((alt) => alt.name === styled);
    entries.push({ role: 'style', text: styleLine(styled, alternative ? alternative.label : null) });
  }
  entries.push({ role: 'diagnosis', text: diagnosis.message });
  if (split) {
    entries.push({ role: 'hint', text: VERDICT_TEXTS.stepByStep });
  }
  // The OLD_STYLE diagnosis already says what the old-style note says (and where the numbers go now).
  const notes = (verdict.notes || []).filter((note) => !(diagnosis.code === 'OLD_STYLE' && note.startsWith(VERDICT_TEXTS.oldStyle)));
  entries.push(...notes.map((text) => ({ role: 'note', text })));
  return entries;
} // End of function verdictEntries()

/**
 * What the verdict block of the results panel shows (design.md §15.3): the
 * student's name, then the text entries (verdictEntries()) and, for a
 * diagnosis, the legend of the two chains on the canvas. Pure.
 *
 * @param {object} verdict - A success verdict of readName().
 * @param {{naming: object, steps: object[], index: number}|null} [explanation] - diagnosisExplanation() of a diagnosed
 *   `otherName` verdict (the explanation the stepper shows), or null.
 * @returns {{kind: string, tone: string, student: {text: string, kind: string}[], lines: string[],
 *   entries: {role: string, text: string}[], diagnosis: {code: string, legend: object[]|null}|null}} The block: `lines`
 *   are the entries' texts (announced), `diagnosis` null without one.
 */
export function verdictBlock(verdict, explanation = null) {
  const entries = verdictEntries(verdict, explanation);
  const { diagnosis } = verdict;
  return {
    kind: verdict.kind,
    tone: VERDICT_TONES[verdict.kind] || 'other',
    student: studentParts(verdict),
    lines: entries.map((entry) => entry.text),
    entries,
    diagnosis: diagnosis ? { code: diagnosis.code, legend: diagnosisLegend(diagnosis) } : null,
  };
} // End of function verdictBlock()

/**
 * «Dibujar» for a success verdict: checks the layout, loads the molecule
 * centred on the canvas as one undoable edit (molecule and view), shows the
 * verdict in the results panel and closes the dialog; any failure stays in
 * the dialog with the canvas untouched.
 *
 * @param {object} verdict - A readName() verdict.
 * @param {{editor: object, results: object|null, builder: object,
 *   layout?: function(object, {x: number, y: number}): (object|null)}} context - `editor` (peekMolecule(),
 *   loadMolecule() with `{center: true}`), `results` (showVerdict(); null without a results panel), `builder` (the
 *   dialog: showFailure(), showVerdict(), close()) and `layout` (default verdictLayout(); tests inject a failure).
 * @returns {{ok: boolean, message?: string}} The outcome: the editor's on loading, else a refusal with its message.
 */
export function drawVerdict(verdict, context) {
  const { editor, results, builder } = context;
  const layout = context.layout || verdictLayout;
  if (!isSuccess(verdict)) {
    builder.showVerdict(verdict); // Defensive: the dialog keeps failures to itself.
    return { ok: false, message: verdict ? verdict.message : '' };
  }
  const laid = layout(verdict, drawingCentre(editor.peekMolecule()));
  if (!laid) {
    builder.showFailure(CANNOT_DRAW);
    return { ok: false, message: CANNOT_DRAW };
  }
  // One undoable edit for the molecule and the centred view (Deshacer restores both).
  const outcome = editor.loadMolecule(laid, { center: true });
  if (!outcome.ok) {
    builder.showFailure(outcome.message || CANNOT_DRAW);
    return outcome;
  }
  if (results) {
    results.showVerdict(verdict, laid);
  }
  builder.close();
  return outcome;
} // End of function drawVerdict()
