/**
 * @file «¿Cómo se dibuja?» entry point (design.md §15.3, §15.5.3; phase
 * R-1b): `readName(tiles) → verdict` for open-chain hydrocarbon names.
 * Pure, no DOM.
 *
 * Pipeline: parse (parse.js) → assemble the student's text (assemble.js,
 * from the tree, never through the engine's rendering) → NameSpec
 * (interpret.js) → definite structural errors (build.js checkSpec()) →
 * placement of the left-out locants → molecule (build.js build()) → the
 * naming engine (naming/index.js nameMolecule()) → compare the text, in
 * NFC (design.md §15.9 trap 7), with the engine's name and with every
 * alternative (trap 8).
 *
 * Verdicts (design.md §15.3; Spanish drafts pending teacher review):
 * `correct`, `alternative`, `otherName`, `outOfScope`, `invalid`, and the
 * stand-in `incomplete`: in R-1b a left-out locant is filled only when its
 * domain has one value (`eteno`, `etenil`); any other left-out locant gives
 * `incomplete`, which claims nothing about the name. Phase R-1c replaces
 * that stand-in with the search of design.md §15.5.3 steps 3–8
 * (`missingLocants`, `ambiguous`, and `incomplete` only when the search
 * budget runs out), so `metiletano` will become `otherName` (propane).
 *
 * Old-style names (`2-buteno`) are built and judged like any other and
 * carry a note with the modern writing of the student's own name
 * (`but-2-eno`).
 */

import { nameMolecule } from '../naming/index.js';
import { parse } from './parse.js';
import { assemble } from './assemble.js';
import { interpret } from './interpret.js';
import { build, checkSpec, directPlacement } from './build.js';

/** Verdict kinds of R-1b (design.md §15.3); `incomplete` is R-1b's stand-in for the left-out-locant search. */
export const VERDICT_KINDS = Object.freeze(['correct', 'alternative', 'otherName', 'outOfScope', 'invalid', 'incomplete']);

/** Alternative styles that are traditional names, announced by `correct` («También se llama…», design.md §15.1). */
const TRADITIONAL_STYLES = Object.freeze(['traditional']);

/** Fixed verdict texts (design.md §15.3 drafts, pending teacher review). */
export const VERDICT_TEXTS = Object.freeze({
  correct: '¡Correcto!',
  stepByStep: 'Pulsa «Ver paso a paso» para ver por qué.',
  incomplete: 'Faltan números: escribe en qué carbono va cada grupo.',
  outOfScope: 'Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar:',
});

/**
 * One tile range with its error (the parser's shape, design.md §15.6).
 *
 * @typedef {object} VerdictError
 * @property {string} code - Error code (parse.js ERROR_CODES or build.js BUILD_ERROR_CODES).
 * @property {string} message - Spanish message.
 * @property {number} from - First tile index.
 * @property {number} to - Tile index after the last one.
 */

/**
 * The result of readName(): one shape for every kind, so the UI phases can
 * rely on it (fields that do not apply are null or empty).
 *
 * @typedef {object} Verdict
 * @property {'correct'|'alternative'|'otherName'|'outOfScope'|'invalid'|'incomplete'} kind - The verdict.
 * @property {string} message - What the app says (Spanish), ready to show.
 * @property {string} text - The assembled name (NFC), as on the dialog's name line.
 * @property {{tile: number|null, from: number, to: number, kind: string, pending?: boolean}[]} spans - assemble() spans of `text`.
 * @property {string|null} name - The engine's name of the molecule (when named).
 * @property {{style: string, label: string, name: string, parts: object[]}[]} alternatives - The engine's alternatives (when named; else []).
 * @property {{style: string, label: string, name: string}|null} matched - The alternative equal to the text (`alternative` only).
 * @property {object|null} molecule - The molecule the name describes (model/molecule.js; atoms without meaningful
 *   coordinates), whenever it was built: correct, alternative, otherName, outOfScope.
 * @property {{atoms: number[], bonds: number[]}|null} studentParent - The parent in the student's locant order (with `molecule`).
 * @property {object[]} prefixAtoms - Atoms of each prefix occurrence (build.js build()); [] without `molecule`.
 * @property {object|null} naming - The engine's whole result (nameMolecule(); a refusal for outOfScope), when named.
 * @property {VerdictError[]} errors - `invalid`: the parser's errors, or the one structural error; else [].
 * @property {string[]} notes - Extra lines shown beside the verdict (the old-style note).
 * @property {boolean} draw - Whether the UI draws `molecule` (correct, alternative, otherName).
 */

/**
 * Compares two names as the student and the engine write them: equal in
 * Unicode NFC (design.md §15.9 trap 7: `ácido`, `éter`, `aldehído`).
 *
 * @param {string} a - A name.
 * @param {string} b - Another name.
 * @returns {boolean} True when they are the same text.
 */
export function sameName(a, b) {
  return String(a).normalize('NFC') === String(b).normalize('NFC');
}

/**
 * The modern writing of an old-style name: its old-style locants moved
 * behind the root, into the segment they belong to (`2-buteno` →
 * `but-2-eno`, `1,3-butadieno` → `buta-1,3-dieno`), assembled from the tree.
 *
 * @param {object} tree - An error-free parse() tree with old-style locants.
 * @returns {string} The text.
 */
export function modernText(tree) {
  const { parent } = tree;
  const segments = parent.chain.segments.map((segment, i) => (i === parent.legacySegment ? { ...segment, locants: parent.legacy } : segment));
  return assemble({ ...tree, parent: { ...parent, legacy: [], chain: { ...parent.chain, segments } } }).text;
}

/**
 * A verdict with every field at its empty value.
 *
 * @param {string} kind - Verdict kind.
 * @param {string} message - Spanish message.
 * @param {{text: string, spans: object[]}} assembled - The assembled name.
 * @param {object} [extra] - Fields to set.
 * @returns {Verdict} The verdict.
 */
function verdict(kind, message, assembled, extra = {}) {
  return {
    kind,
    message,
    text: assembled.text.normalize('NFC'),
    spans: assembled.spans,
    name: null,
    alternatives: [],
    matched: null,
    molecule: null,
    studentParent: null,
    prefixAtoms: [],
    naming: null,
    errors: [],
    notes: [],
    draw: false,
    ...extra,
  };
} // End of function verdict()

/**
 * The message of a named molecule: `correct` (with its traditional
 * alternatives), `alternative` (with the label and the name given first) or
 * `otherName`.
 *
 * @param {string} text - The student's text.
 * @param {object} naming - A successful nameMolecule() result.
 * @returns {{kind: string, message: string, matched: object|null}} The verdict kind, message and matched alternative.
 */
function judge(text, naming) {
  const alternatives = naming.alternatives || [];
  if (sameName(text, naming.name)) {
    const also = alternatives.filter((alt) => TRADITIONAL_STYLES.includes(alt.style))
      .map((alt) => ` También se llama «${alt.name}» (${alt.label}).`).join('');
    return { kind: 'correct', message: `${VERDICT_TEXTS.correct}${also}`, matched: null };
  }
  const matched = alternatives.find((alt) => sameName(text, alt.name));
  if (matched) {
    return {
      kind: 'alternative',
      message: `${VERDICT_TEXTS.correct} «${text}» es una forma válida (${matched.label}). El nombre que doy primero es «${naming.name}».`,
      matched: { style: matched.style, label: matched.label, name: matched.name },
    };
  }
  return {
    kind: 'otherName',
    message: `Esta es la molécula que describe tu nombre, pero se llama «${naming.name}». ${VERDICT_TEXTS.stepByStep}`,
    matched: null,
  };
} // End of function judge()

/**
 * Reads a name built from tiles and judges it (design.md §15.3, §15.5.3):
 * the molecule it describes and how the app names that molecule.
 *
 * @param {(string|object)[]} tiles - Tile ids or catalogue tiles (tiles.js), in the student's order.
 * @param {{namer?: (mol: object) => object}} [options] - `namer`: the naming function (default
 *   nameMolecule(); tests inject a refusal, since the engine names every open-chain hydrocarbon within its caps).
 * @returns {Verdict} The verdict.
 * @throws {Error} Only for an unknown tile id.
 */
export function readName(tiles, options = {}) {
  const namer = options.namer || nameMolecule;
  const { tree, errors } = parse(tiles);
  const assembled = assemble(tree);
  if (errors.length > 0) {
    return verdict('invalid', errors[0].message, assembled, { errors: errors.map((e) => ({ ...e })) });
  }
  const spec = interpret(tree);
  /**
   * The `invalid` verdict of a structural error.
   *
   * @param {{code: string, message: string, tiles: [number, number]}} error - The build error.
   * @returns {Verdict} The verdict.
   */
  const invalid = (error) => verdict('invalid', error.message, assembled, {
    errors: [{ code: error.code, message: error.message, from: error.tiles[0], to: error.tiles[1] }],
  });
  const early = checkSpec(spec);
  if (early) {
    return invalid(early);
  }
  const placement = directPlacement(spec);
  if (!placement) {
    return verdict('incomplete', VERDICT_TEXTS.incomplete, assembled);
  }
  const built = build(spec, placement);
  if (!built.ok) {
    return invalid(built.error);
  }
  const drawn = {
    molecule: built.molecule,
    studentParent: built.studentParent,
    prefixAtoms: built.prefixAtoms,
    notes: spec.oldStyle ? [`Es la forma antigua de escribirlo; hoy se escribe «${modernText(tree)}».`] : [],
  };
  const naming = namer(built.molecule);
  if (!naming.ok) {
    return verdict('outOfScope', `${VERDICT_TEXTS.outOfScope} ${naming.error.message}`, assembled, { ...drawn, naming });
  }
  const { kind, message, matched } = judge(assembled.text.normalize('NFC'), naming);
  return verdict(kind, message, assembled, {
    ...drawn, name: naming.name, alternatives: naming.alternatives || [], matched, naming, draw: true,
  });
} // End of function readName()
