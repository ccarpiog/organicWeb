/**
 * @file «¿Cómo se dibuja?» entry point (design.md §15.3, §15.5.3; phases
 * R-1b, R-1c): `readName(tiles) → verdict` for open-chain hydrocarbon
 * names. Pure, no DOM.
 *
 * Pipeline (design.md §15.5.3):
 *
 * 1. parse (parse.js) → assemble the student's text (assemble.js, from the
 *    tree, never through the engine's rendering) → NameSpec
 *    (interpret.js) → definite structural errors (build.js checkSpec());
 * 2–4. search.js: every placement of the left-out locants (none when the
 *    name gives them all), built (build.js), merged by structural key and
 *    named once each (naming/index.js nameMolecule(), cached by key);
 * 5. **Exact**: a structure whose name or any alternative (§15.9 trap 8)
 *    equals the text, in NFC (trap 7) → `correct` / `alternative`;
 * 6. **Filled**: with left-out locants, each placement is written into the
 *    student's tree and assembled (search.js filledTree(), assemble.js);
 *    the structures whose name or an alternative equals the filled text of
 *    one of their placements → one: `missingLocants` (with that filled
 *    name), several: `ambiguous`;
 * 7. **One structure** (all placements equivalent, or no left-out locant)
 *    → `otherName`, with the student's main mistake (diagnose.js, R-3:
 *    `diagnosis`, null when no rule applies), or `outOfScope` when the
 *    engine refuses it;
 * 8. several structures, none matching → `ambiguous`, with their names.
 *
 * Verdicts (design.md §15.3; Spanish drafts pending teacher review):
 * `correct`, `alternative`, `missingLocants`, `otherName`, `ambiguous`,
 * `incomplete` (the search ran out of budget: it claims nothing about the
 * name), `outOfScope` and `invalid` (parse or structural errors, also a
 * name whose left-out locants fit nowhere). An `ambiguous` message lists at
 * most MAX_LISTED names in search order (lowest locants first) and counts
 * the rest («…, C u otras 2 moléculas»); `candidates` holds them all.
 *
 * The molecule shown is (a copy of) the graph the engine named, so every
 * atom and bond id in `naming` is one of its own; the student's reading is
 * carried onto it: for a name with left-out locants, the placement whose
 * filled text is the name matched (else the first placement found, lowest
 * locants first) is built and mapped through an isomorphism (search.js
 * placementReading()) to give `studentParent` and `prefixAtoms`.
 *
 * The search's time limit (search.js `deadline`) holds through steps 5–8
 * too: a verdict chosen after it has passed is replaced by `incomplete`.
 *
 * Old-style names (`2-buteno`) are built and judged like any other — their
 * filled text keeps the old style, so they never match a name — and every
 * verdict past the structural checks carries a note with the modern writing
 * of the student's own name (`but-2-eno`).
 */

import { nameMolecule } from '../naming/index.js';
import { parse } from './parse.js';
import { assemble } from './assemble.js';
import { interpret } from './interpret.js';
import { checkSpec } from './build.js';
import { searchStructures, filledTree, placementReading } from './search.js';
import { diagnose, MAX_READINGS } from './diagnose.js';

/** Verdict kinds (design.md §15.3), in the order of its table. */
export const VERDICT_KINDS = Object.freeze([
  'correct', 'alternative', 'missingLocants', 'otherName', 'ambiguous', 'incomplete', 'invalid', 'outOfScope',
]);

/** Names an `ambiguous` message lists before counting the rest (design.md §15.3: «at most three»). */
export const MAX_LISTED = 3;

/** Alternative styles that are traditional names, announced by `correct` («También se llama…», design.md §15.1). */
const TRADITIONAL_STYLES = Object.freeze(['traditional']);

/** Fixed verdict texts (design.md §15.3 drafts, pending teacher review). */
export const VERDICT_TEXTS = Object.freeze({
  correct: '¡Correcto!',
  almost: 'Casi: faltan los números.',
  stepByStep: 'Pulsa «Ver paso a paso» para ver por qué.',
  ambiguous: 'Faltan números: puede ser',
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
 * One structure an `ambiguous` name can describe.
 *
 * @typedef {object} Candidate
 * @property {string|null} text - The form shown: the student's name with its locants filled in when that is a name
 *   of the structure (step 6), else the engine's name (step 8); null when the engine refuses the structure.
 * @property {string|null} name - The engine's name (null when refused).
 * @property {object} molecule - The structure (model/molecule.js; atoms without meaningful coordinates).
 */

/**
 * The result of readName(): one shape for every kind, so the UI phases can
 * rely on it (fields that do not apply are null or empty).
 *
 * @typedef {object} Verdict
 * @property {'correct'|'alternative'|'missingLocants'|'otherName'|'ambiguous'|'incomplete'|'invalid'|'outOfScope'} kind - The verdict.
 * @property {string} message - What the app says (Spanish), ready to show.
 * @property {string} text - The assembled name (NFC), as on the dialog's name line.
 * @property {{tile: number|null, from: number, to: number, kind: string, pending?: boolean}[]} spans - assemble() spans of `text`.
 * @property {string|null} name - The engine's name of the molecule (when one structure is named).
 * @property {{style: string, label: string, name: string, parts: object[]}[]} alternatives - The engine's alternatives (when named; else []).
 * @property {{style: string, label: string, name: string}|null} matched - The alternative equal to the text (`alternative`) or to the
 *   filled text (`missingLocants`); else null.
 * @property {string|null} filled - `missingLocants`: the student's name with its left-out locants filled in; else null.
 * @property {Candidate[]} candidates - `ambiguous`: every structure the name can describe, in search order; else [].
 * @property {object|null} molecule - The one molecule the name describes (model/molecule.js; atoms without meaningful
 *   coordinates): correct, alternative, missingLocants, otherName, outOfScope; else null.
 * @property {{atoms: number[], bonds: number[]}|null} studentParent - The parent in the student's locant order (with `molecule`).
 * @property {object[]} prefixAtoms - Atoms of each prefix occurrence (build.js build()); [] without `molecule`.
 * @property {object|null} naming - The engine's whole result (nameMolecule(); a refusal for outOfScope), when named.
 * @property {VerdictError[]} errors - `invalid`: the parser's errors, or the one structural error; else [].
 * @property {string[]} notes - Extra lines shown beside the verdict (the old-style note).
 * @property {boolean} draw - Whether the UI draws `molecule` (correct, alternative, missingLocants, otherName).
 * @property {object|null} [diagnosis] - `otherName` only (no other verdict has the field): the student's main mistake
 *   (diagnose.js Diagnosis), or null when no rule applies. `message` stays the §15.3 text; the results panel puts the
 *   diagnosis's message between its two sentences. Its `step` belongs to the explanation of the naming in its `style`
 *   (diagnose.js diagnosisExplanation()), not always to that of `naming`.
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
 * The Spanish «o» before a word, «u» when the word sounds /o/ at the start
 * (`u octano`, `u 8-metil…`, `u 11-metil…`, `u otras`).
 *
 * @param {string} next - The word that follows.
 * @returns {string} 'o' or 'u'.
 */
export function orBefore(next) {
  return /^(?:h?o|8|11(?!\d))/i.test(next) ? 'u' : 'o';
}

/**
 * The `ambiguous` message (design.md §15.3): «Faltan números: puede ser
 * but-1-eno o but-2-eno.», names unquoted as in the draft, at most
 * MAX_LISTED of them, then «u otra molécula» / «u otras N moléculas» for
 * the rest (refused structures, which have no name, are counted there
 * too).
 *
 * @param {Candidate[]} candidates - The structures, in search order.
 * @returns {string} The message.
 */
export function ambiguousMessage(candidates) {
  const texts = candidates.map((c) => c.text).filter((text) => text !== null);
  const shown = texts.slice(0, MAX_LISTED);
  const rest = candidates.length - shown.length;
  if (shown.length === 0) {
    return `Faltan números: tu nombre puede describir ${candidates.length} moléculas distintas.`;
  }
  if (rest > 0) {
    const others = rest === 1 ? 'otra molécula' : `otras ${rest} moléculas`;
    return `${VERDICT_TEXTS.ambiguous} ${shown.join(', ')} ${orBefore(others)} ${others}.`;
  }
  if (shown.length === 1) {
    return `${VERDICT_TEXTS.ambiguous} ${shown[0]}.`; // Defensive: an ambiguous verdict has several structures.
  }
  const last = shown[shown.length - 1];
  return `${VERDICT_TEXTS.ambiguous} ${shown.slice(0, -1).join(', ')} ${orBefore(last)} ${last}.`;
} // End of function ambiguousMessage()

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
    filled: null,
    candidates: [],
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
 * Which name of a successful naming a text is: the name given first, one
 * of the alternatives (every style, design.md §15.9 trap 8), or none.
 *
 * @param {object} naming - A successful nameMolecule() result.
 * @param {string} text - A name.
 * @returns {{main: boolean, alternative: object|null}|null} `main` for the name given first, else the alternative; null when neither.
 */
function nameMatch(naming, text) {
  if (sameName(text, naming.name)) {
    return { main: true, alternative: null };
  }
  const alternative = (naming.alternatives || []).find((alt) => sameName(text, alt.name));
  return alternative ? { main: false, alternative } : null;
}

/**
 * The public fields of a matched alternative.
 *
 * @param {object|null} alternative - An engine alternative, or null.
 * @returns {{style: string, label: string, name: string}|null} Its style, label and name.
 */
function matchedFields(alternative) {
  return alternative ? { style: alternative.style, label: alternative.label, name: alternative.name } : null;
}

/**
 * The fields of a verdict that draws one structure: the student's reading
 * of one placement and the engine's naming. The molecule is a copy of the
 * graph the naming was computed on, so every atom and bond id the naming
 * cites is one of its own, and the reading of the drawn placement is
 * carried onto it (search.js placementReading() explains why that way
 * round).
 *
 * @param {object} spec - The NameSpec.
 * @param {object} structure - A named search.js Structure.
 * @param {number[]} placement - One of its placements.
 * @returns {object} `molecule`, `studentParent`, `prefixAtoms`, `naming` and, when named, `name` and `alternatives`.
 */
function drawnFields(spec, structure, placement) {
  const { naming } = structure;
  return {
    ...placementReading(spec, structure, placement),
    naming,
    ...(naming.ok ? { name: naming.name, alternatives: naming.alternatives || [] } : {}),
  };
} // End of function drawnFields()

/**
 * The diagnosis of an `otherName` verdict (diagnose.js), or null should
 * the diagnosis itself fail (a bug): the verdict, which draws the molecule
 * and gives its name, never depends on it.
 *
 * @param {{tree: object, spec: object}} name - The student's tree and NameSpec.
 * @param {object} fields - drawnFields() of the drawn placement (molecule, naming, the student's reading).
 * @param {() => object[]} others - Gives the readings of the structure's other placements (left-out locants), built only here.
 * @param {(mol: object, options?: object) => object} namer - readName()'s naming function (for the student's prefix style).
 * @returns {object|null} The diagnosis, or null.
 */
function diagnoseSafely(name, fields, others, namer) {
  try {
    return diagnose(name, fields, others(), namer);
  } catch (err) {
    return null;
  }
}

/**
 * Reads a name built from tiles and judges it (design.md §15.3, §15.5.3):
 * the molecule it describes and how the app names that molecule.
 *
 * @param {(string|object)[]} tiles - Tile ids or catalogue tiles (tiles.js), in the student's order.
 * @param {{namer?: (mol: object, options?: object) => object, budget?: {placements?: number, namings?: number, ms?: number},
 *   now?: () => number, cache?: Map<string, object>}} [options] - `namer`: the naming function (default
 *   nameMolecule(); tests inject a refusal, since the engine names every open-chain hydrocarbon within its caps; the
 *   diagnosis of an `otherName` also calls it with `{prefixStyle}` for a name in another prefix style, diagnose.js);
 *   `budget`, `now`, `cache`: the search's limits, clock and naming cache (search.js searchStructures(); its time
 *   limit also bounds steps 5–8 here).
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
  const text = assembled.text.normalize('NFC');
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
  const notes = spec.oldStyle ? [`Es la forma antigua de escribirlo; hoy se escribe «${modernText(tree)}».`] : [];
  const now = options.now || Date.now;
  const search = searchStructures(spec, { namer, budget: options.budget, now, cache: options.cache });
  if (search.status === 'none') {
    return invalid(search.error);
  }
  const incomplete = verdict('incomplete', VERDICT_TEXTS.incomplete, assembled, { notes });
  if (search.status === 'budget') {
    return incomplete;
  }
  let late = false;
  /**
   * Tells whether the search's time limit has passed (design.md §15.5.3
   * step 3), and keeps saying so once it has: the filled-text comparisons
   * and the verdict selection count against the same `deadline`.
   *
   * @returns {boolean} True once the clock has read past the deadline.
   */
  const overTime = () => {
    late = late || now() > search.deadline;
    return late;
  };
  const { structures } = search;
  const named = structures.filter((s) => s.naming.ok);
  const memo = new Map();
  /**
   * The first placement of a structure whose filled text is one of its
   * names (the name given first preferred), memoised. It stops early once
   * the time limit has passed (then readName() answers `incomplete`
   * whatever it found).
   *
   * @param {object} structure - A named Structure.
   * @returns {{placement: number[], filled: string, main: boolean, alternative: object|null}|null} The match, or null.
   */
  const filledMatch = (structure) => {
    if (!memo.has(structure)) {
      let found = null;
      for (const placement of spec.leftOut.length > 0 ? structure.placements : []) {
        if (overTime()) {
          break;
        }
        const filled = assemble(filledTree(tree, spec, placement)).text.normalize('NFC');
        const match = nameMatch(structure.naming, filled);
        if (match && (!found || (match.main && !found.main))) {
          found = { placement, filled, ...match };
        }
        if (found && found.main) {
          break;
        }
      } // End of the loop over the placements of one structure
      memo.set(structure, found);
    }
    return memo.get(structure);
  }; // End of function filledMatch()
  /**
   * An `ambiguous` verdict over some candidates.
   *
   * @param {{text: string|null, structure: object}[]} list - The candidates and the form each is shown with.
   * @returns {Verdict} The verdict.
   */
  const ambiguous = (list) => {
    const candidates = list.map(({ text: shown, structure }) => ({
      text: shown, name: structure.naming.ok ? structure.naming.name : null, molecule: structure.built.molecule,
    }));
    return verdict('ambiguous', ambiguousMessage(candidates), assembled, { candidates, notes });
  };

  /**
   * Steps 5–8: the verdict over the named structures.
   *
   * @returns {Verdict} The verdict.
   */
  const judge = () => {
    // Step 5, Exact: the text is a name of a structure.
    const exact = named.filter((s) => nameMatch(s.naming, text));
    if (exact.length > 1) {
      return ambiguous(exact.map((s) => ({ text: s.naming.name, structure: s }))); // Never seen: names are unambiguous.
    }
    if (exact.length === 1) {
      const [structure] = exact;
      const match = nameMatch(structure.naming, text);
      const fields = drawnFields(spec, structure, (filledMatch(structure) || { placement: structure.placements[0] }).placement);
      if (match.main) {
        const also = (structure.naming.alternatives || []).filter((alt) => TRADITIONAL_STYLES.includes(alt.style))
          .map((alt) => ` También se llama «${alt.name}» (${alt.label}).`).join('');
        return verdict('correct', `${VERDICT_TEXTS.correct}${also}`, assembled, { ...fields, notes, draw: true });
      }
      return verdict('alternative', `${VERDICT_TEXTS.correct} «${text}» es una forma válida (${match.alternative.label}). `
        + `El nombre que doy primero es «${structure.naming.name}».`, assembled, {
        ...fields, matched: matchedFields(match.alternative), notes, draw: true,
      });
    } // End of step 5

    // Step 6, Filled: the text with its left-out locants filled in is a name of a structure.
    const filled = named.filter((s) => filledMatch(s));
    if (filled.length > 1) {
      return ambiguous(filled.map((s) => ({ text: filledMatch(s).filled, structure: s })));
    }
    if (filled.length === 1) {
      const [structure] = filled;
      const match = filledMatch(structure);
      const message = match.main
        ? `${VERDICT_TEXTS.almost} Se escribe «${match.filled}».`
        : `${VERDICT_TEXTS.almost} Se escribe «${match.filled}» (${match.alternative.label}). `
          + `El nombre que doy primero es «${structure.naming.name}».`;
      return verdict('missingLocants', message, assembled, {
        ...drawnFields(spec, structure, match.placement), matched: matchedFields(match.alternative), filled: match.filled, notes, draw: true,
      });
    } // End of step 6

    // Step 7, one structure.
    if (structures.length === 1) {
      const [structure] = structures;
      const fields = drawnFields(spec, structure, structure.placements[0]);
      if (!structure.naming.ok) {
        return verdict('outOfScope', `${VERDICT_TEXTS.outOfScope} ${structure.naming.error.message}`, assembled, { ...fields, notes });
      }
      // The other placements of left-out locants are other readings of the same name (diagnose() keeps the kindest).
      const others = spec.leftOut.length > 0 ? structure.placements.slice(1, MAX_READINGS) : [];
      const diagnosis = diagnoseSafely({ tree, spec }, fields, () => others.map((p) => placementReading(spec, structure, p)), namer);
      return verdict('otherName', `Esta es la molécula que describe tu nombre, pero se llama «${structure.naming.name}». `
        + `${VERDICT_TEXTS.stepByStep}`, assembled, { ...fields, notes, draw: true, diagnosis });
    }

    // Step 8, several structures, none matching: named ones first, refusals kept apart.
    const refused = structures.filter((s) => !s.naming.ok);
    return ambiguous([...named.map((s) => ({ text: s.naming.name, structure: s })), ...refused.map((s) => ({ text: null, structure: s }))]);
  }; // End of function judge()
  const judged = judge();
  // The search's time limit holds through steps 5–8 (the filled-text comparisons, the drawn reading): a verdict chosen
  // after it has passed is never claimed (design.md §15.5.3 step 3).
  return overTime() ? incomplete : judged;
} // End of function readName()
