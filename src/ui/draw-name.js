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
 */

import { canonicalLayout, layoutProblems } from '../layout/canonical.js';
import { isSuccess, verdictFeedback } from './name-builder-state.js';

/** Dialog message when the molecule of an understood name cannot be drawn clearly (design.md §15.2). */
export const CANNOT_DRAW = 'He entendido el nombre, pero no consigo dibujar esta molécula sin que se crucen enlaces.';

/** Label of the student's own name in the verdict block (draft pending teacher review). */
export const STUDENT_LABEL = 'Tu nombre:';

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
 * What the verdict block of the results panel shows (design.md §15.3): the
 * student's name, then readName()'s message and notes (the old-style note)
 * — the same lines the dialog shows (verdictFeedback()). Pure.
 *
 * @param {object} verdict - A success verdict of readName().
 * @returns {{kind: string, tone: string, student: {text: string, kind: string}[], lines: string[]}} The block.
 */
export function verdictBlock(verdict) {
  return {
    kind: verdict.kind,
    tone: VERDICT_TONES[verdict.kind] || 'other',
    student: studentParts(verdict),
    lines: verdictFeedback(verdict, 0).lines,
  };
}

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
