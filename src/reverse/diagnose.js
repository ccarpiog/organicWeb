/**
 * @file Diagnosis of «¿Cómo se dibuja?» (design.md §15.3 `otherName`, §15.4,
 * §15.8 R-3; phase I-49a): for an `otherName` verdict of readName() — the
 * student's name describes one molecule, which the app names otherwise —
 * the student's **main mistake**, one diagnosis: the first rule of the list
 * below that applies. Pure, no DOM; open-chain hydrocarbons. A name with a
 * ring (`ciclo`, phase R-4a: a ring parent or a ring branch at any depth),
 * or whose molecule the engine names on a ring, gets no diagnosis yet (null:
 * the verdict stands alone); the ring messages arrive in phase I-50c.
 *
 * The rules, in order (first match wins):
 *
 * 1. `BRANCH_AT_END` — a branch on an end carbon lengthens the chain
 *    (`metiletano`, `1-metilpropano`);
 * 2. `LONGER_CHAIN` — a longer chain exists (`2-etilbutano`);
 * 3. the engine's trace rule at which the student's chain was dropped among
 *    the chains as long as the parent: `MORE_MULTIPLE_BONDS` (P2),
 *    `MORE_DOUBLE_BONDS` (P3), `MORE_SUBSTITUENTS` (P4), `CHAIN_LOCANTS`
 *    (N1–N4: another chain gives lower locants) or `CHAIN_ALPHABETICAL`
 *    (N5);
 * 4. `NUMBERING` — the student's chain is the parent (or one that gives the
 *    same name) but numbered from the other end (`4-metilpentano`,
 *    `hex-4-eno`), with the trace rule (N1–N5) that decided;
 * 5. `ALPHABETICAL_ORDER` — prefixes not in alphabetical order (di/tri…
 *    multipliers and `tert-` ignored);
 * 6. `UNGROUPED` — identical branches not grouped (`2-metil-3-metil…`);
 * 7. `MULTIPLIER_KIND` — di vs bis;
 * 8. `LOCANT_ORDER` — locants not ascending (`3,2-dimetil…`);
 * 9. `NEEDLESS_LOCANTS` (`prop-1-eno`, `(propan-1-il)`) or
 *    `MISSING_LOCANTS` (left-out locants the name needs);
 * 10. `SEGMENT_ORDER` — `eno` after `ino` (`pent-4-in-1-eno`);
 * 11. `OLD_STYLE` — old-style locants before the root (`2-buteno`).
 *
 * **Chain rules agree with the engine by construction**: rules 1–4 never
 * compare chains themselves; they follow the student's chain (studentParent,
 * in the student's locant order) through the naming result's own trace
 * (design.md §4.1, §4.3–4.4): a chain missing from the P1 candidates is not
 * a leaf-to-leaf path, so a branch sits on one of its ends (rule 1); the
 * first step whose survivors no longer hold the chain names the rule that
 * dropped it (P1 → rule 2; P2, P3, P4, N1–N5 → rule 3); otherwise the first
 * numbering step that drops the student's direction while the chain stays
 * gives rule 4. A chain or direction that reaches the presentation
 * tie-break (TIE) gives the same name as the parent, so it is no mistake.
 * The counts and locants quoted are the trace's own values.
 *
 * **The student's prefix style** (design.md §1.1: `isopropil`, `pin`,
 * `substituted`): the citation order, hence N4, N5 and sometimes the parent
 * itself, depends on the words of the prefixes (`4-isopropil-6-metilnonano`
 * but `4-metil-6-(propan-2-il)nonano`). When the engine gives the molecule
 * names in other styles, the style is recognised **through the structure
 * of the student's branches**, never their spelling: every branch the
 * student wrote, at every depth, is found on the molecule and named there
 * by the engine in each style offered (substituent.js nameSubstituent());
 * the style in which the most of the student's branches have the engine's
 * shape (a retained word, or the length of the branch's own chain, where
 * its free valence sits and the shapes of its own branches — locants,
 * multipliers and `an` left out, so the form mistakes the later rules name
 * do not hide the style: `(1-metiletan-1-il)` is the `substituted` style's
 * `1-metiletil`) is chosen, the default on a tie. The molecule is then
 * named in that style by the engine (nameMolecule() `prefixStyle`); its
 * trace, parent and name are the ones every rule compares with and quotes,
 * and its explanation is the one the diagnosis's `step` belongs to
 * (diagnosisNaming(), diagnosisExplanation()).
 *
 * Rules 5–11 read the student's tiles (the lossless parse tree and its
 * NameSpec) and compare them with the naming rules the engine applies:
 * citation keys compared with numbering.js compareCitationKeys() (built
 * from the student's own words, so a name in any prefix style is judged in
 * its own words), identical branches by their structural key at every
 * depth (graph.js rootedBranchKey() of the first occurrence on the
 * molecule, with the bond order that attaches it: `metil` and
 * `(metan-1-il)` are one branch, inside a compound branch too; build.js
 * ownPrefixAtoms() finds a compound branch's own branches), di vs bis as
 * render.js isCompoundPrefix() decides for hydrocarbon branches (bis for a
 * branch with prefixes of its own), the omitted locants by the lexicon's
 * own omission rules (omitsLocants(), chainOmitsPrefixLocants()) and the
 * engine's short branch forms (`propil`, `etenil`: render.js
 * substituentTokens()). The right forms quoted are assembled from the
 * student's tree (assemble.js), never retyped; rule 6's grouped form takes
 * the short form of a branch written with needless locants
 * (`2,2-dimetil`, not `2,2-di(metan-1-il)`).
 *
 * Rules that cannot occur, or occur only beside an earlier one, for an
 * open-chain hydrocarbon `otherName` (tested as they behave):
 *
 * - a wrong multiplier count (`2,3-trimetil`) or a locant past the chain is
 *   `invalid` (parse.js LOCANT_COUNT, build.js LOCANT_RANGE), never
 *   `otherName`;
 * - needless *prefix* locants (`1-…metano`): the engine omits prefix
 *   locants only on a one- or two-carbon parent, where every carbon is an
 *   end, so rule 1 always comes first;
 * - `MISSING_LOCANTS` alone gives `missingLocants`, not `otherName`: it is
 *   the diagnosis only beside a later mistake (`butineno` → but-1-en-3-ino,
 *   whose `ino` before `eno` is rule 10);
 * - `NUMBERING` at N5: N5 never decides between the two directions of one
 *   chain (equal locants in citation order give the same name), only
 *   between chains (`CHAIN_ALPHABETICAL`).
 *
 * No rule covers (the diagnosis is null; the verdict stands alone): a
 * branch named in a prefix style the engine does not offer for the molecule
 * (`4-(1,1-dimetiletil)heptano`: the other styles are offered only beside an
 * isopropyl group, design.md §1.1), and a branch whose own chain or
 * numbering is not the engine's (`5-(butan-3-il)nonano`,
 * `7-[2-(2-metilpropil)propil]tridecano`).
 *
 * A name with left-out locants (`metiletano`) is read through one placement
 * (readName() draws the first); every placement of the drawn structure is a
 * reading of the same name, so diagnose() tries the readings it is given and
 * keeps the most charitable diagnosis, the one of the latest rule (`butineno`
 * read as `but-3-in-1-eno` would be a numbering mistake, read as
 * `but-1-in-3-eno` it numbers like the engine and misses its locants).
 *
 * The result is a plain JSON-safe object (Diagnosis) carrying what the
 * results panel needs (phase I-49b): the code, the Spanish message, the
 * explanation step to open (`step`: the `id` of a step of
 * src/explain/explain.js explain() for the naming in the diagnosis's
 * `style` — `chain`, `tiebreak`, `numbering`, `substituents`, `order` or
 * `assemble`; diagnosisExplanation() builds those steps and finds it, with
 * the fallbacks of diagnosisStepIndex()), the student's chain and the
 * parent (atom and bond ids of the verdict's molecule, each in its own
 * locant order), the atoms the message is about and the student's tiles it
 * is about. The explanation must be that of the naming in the diagnosis's
 * style, not the verdict's own (default-style) naming: for
 * `6-metil-4-(propan-2-il)nonano` the default style numbers the chain as
 * the student did, and its numbering step would contradict the diagnosis.
 *
 * Every Spanish string is a draft pending teacher review (design.md §15,
 * last paragraph): all of them live in DIAGNOSIS_TEXTS, and DIAGNOSES gives
 * example data for each code so the wording can be listed (R-7). Later
 * family phases (R-4…R-6d) add their codes to DIAGNOSES / DIAGNOSIS_TEXTS
 * and their checks to FORM_RULES (or new trace rules to the chain walk).
 */

import { nameMolecule } from '../naming/index.js';
import { compareLocantLists, compareCitationKeys } from '../naming/numbering.js';
import { chainKey } from '../naming/parent.js';
import { locantText } from '../naming/structure.js';
import { PREFIX_STYLES, nameSubstituent } from '../naming/substituent.js';
import { adjacency, rootedBranchKey } from '../model/graph.js';
import {
  stem, multiplier, compoundMultiplier, ENDINGS, ENCLOSING_MARKS, RETAINED_PREFIXES, FREE_VALENCE_SUFFIXES, omitsLocants,
  chainOmitsPrefixLocants,
} from '../naming/lexicon.es.js';
import { assemble, itemText } from './assemble.js';
import { ownPrefixAtoms, specRings } from './build.js';
import { tileById, tileId, MAX_MULT } from './tiles.js';

/** Most placements of a name with left-out locants that readName() hands over as readings (the drawn one first). */
export const MAX_READINGS = 16;

/** Words quoted by the messages, from the lexicon (never retyped). */
const WORDS = Object.freeze({
  di: multiplier(2),
  tri: multiplier(3),
  bis: compoundMultiplier(2),
  tris: compoundMultiplier(3),
  eno: ENDINGS.double,
  ino: ENDINGS.triple,
  en: ENDINGS.double.slice(0, -1),
  tert: RETAINED_PREFIXES['tert-butyl'].italic,
  metil: `${stem(1)}${FREE_VALENCE_SUFFIXES[1]}`,
  etil: `${stem(2)}${FREE_VALENCE_SUFFIXES[1]}`,
});

/** Italic descriptors of the retained branch words (`tert-`), left out of alphabetical order. */
const ITALIC_DESCRIPTORS = Object.freeze([...new Set(Object.values(RETAINED_PREFIXES).map((r) => r.italic).filter(Boolean))]);

/**
 * The Spanish drafts (pending teacher review) of every diagnosis: one
 * template per code, called with the code's data, and the phrases they use.
 */
export const DIAGNOSIS_TEXTS = Object.freeze({
  BRANCH_AT_END: (d) => `La rama «${d.branch}» está en el extremo de la cadena, así que la alarga: `
    + `la cadena principal tiene ${d.length} carbonos.`,
  LONGER_CHAIN: (d) => `Hay una cadena más larga que la tuya: la tuya tiene ${d.student} carbonos y la cadena principal `
    + `tiene ${d.length}.`,
  MORE_MULTIPLE_BONDS: (d) => `Hay otra cadena igual de larga con más enlaces dobles o triples (${d.app}; la tuya tiene `
    + `${d.student}). Entre cadenas igual de largas, gana la que tiene más.`,
  MORE_DOUBLE_BONDS: (d) => `Hay otra cadena igual de larga, con los mismos enlaces múltiples, pero con más enlaces dobles `
    + `(${d.app}; la tuya tiene ${d.student}). En ese empate gana la que tiene más enlaces dobles.`,
  MORE_SUBSTITUENTS: (d) => `Hay otra cadena igual de larga con más sustituyentes (${d.app}; la tuya tiene ${d.student}). `
    + 'Entre cadenas igual de largas, gana la que tiene más ramas.',
  CHAIN_LOCANTS: (d) => `Hay otra cadena igual de larga que, bien numerada, da números más bajos a `
    + `${DIAGNOSIS_PHRASES.lowerLocantsOf[d.rule]}${difference(d)}: esa es la cadena principal.`,
  CHAIN_ALPHABETICAL: () => 'Hay otra cadena igual de larga, con los mismos números, cuyo nombre va antes por orden '
    + 'alfabético: esa es la cadena principal.',
  NUMBERING: (d) => `Hay que numerar la cadena desde el otro extremo: ${DIAGNOSIS_PHRASES.numberingReasons[d.rule]}`
    + `${difference(d)}.${d.unwritten ? ` En «${d.name}» ese número ni siquiera se escribe.` : ''}`,
  ALPHABETICAL_ORDER: (d) => `Los sustituyentes se escriben por orden alfabético: «${d.first}» va antes que «${d.second}» `
    + `(${d.why}).${d.hint ? ` ${d.hint}` : ''}`,
  UNGROUPED: (d) => `Las ramas iguales se escriben una sola vez, con ${d.compound ? `«${WORDS.bis}», «${WORDS.tris}»…`
    : `«${WORDS.di}», «${WORDS.tri}»…`} delante: «${d.right}», no «${d.student}».`,
  MULTIPLIER_KIND: (d) => (d.compound
    ? `Delante de una rama que tiene sus propias ramas se usa «${WORDS.bis}», «${WORDS.tris}»…: «${d.right}», `
      + `no «${d.student}».`
    : `«${WORDS.bis}», «${WORDS.tris}»… solo van delante de ramas que tienen sus propias ramas; aquí va `
      + `«${WORDS.di}», «${WORDS.tri}»…: «${d.right}», no «${d.student}».`),
  LOCANT_ORDER: (d) => `Los números de un mismo grupo se escriben de menor a mayor: «${d.right}», no «${d.student}».`,
  NEEDLESS_LOCANTS: (d) => (d.branch
    ? `Sobran números dentro de la rama: se escribe «${d.right}», no «${d.student}».`
    : `En «${d.name}» no se escriben números: solo hay una manera de colocar ${d.what}.`),
  MISSING_LOCANTS: (d) => `Faltan números: hay que decir en qué carbono va cada rama y cada enlace doble o triple, `
    + `como en «${d.name}».`,
  SEGMENT_ORDER: (d) => `Cuando hay enlaces dobles y triples, «${WORDS.en}» se escribe antes que «${WORDS.ino}»: `
    + `«${d.name}», no «${d.student}».`,
  OLD_STYLE: (d) => `Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de `
    + `«${WORDS.eno}» o «${WORDS.ino}»: «${d.name}».`,
});

/** The phrases the templates of DIAGNOSIS_TEXTS fill in (Spanish drafts, pending teacher review). */
export const DIAGNOSIS_PHRASES = Object.freeze({
  /** What another chain numbers lower (CHAIN_LOCANTS), by trace rule. */
  lowerLocantsOf: Object.freeze({
    N1: 'los enlaces dobles y triples',
    N2: 'los enlaces dobles',
    N3: 'los sustituyentes',
    N4: 'los sustituyentes, leídos en orden alfabético',
  }),
  /** Why the other end is right (NUMBERING), by trace rule. */
  numberingReasons: Object.freeze({
    N1: 'los enlaces dobles y triples tienen que llevar los números más bajos',
    N2: 'con los mismos números para los enlaces múltiples, los enlaces dobles tienen que llevar los más bajos',
    N3: 'los sustituyentes tienen que llevar los números más bajos',
    N4: 'con los mismos números, el sustituyente que va primero por orden alfabético tiene que llevar el más bajo',
    N5: 'con los mismos números, gana la numeración cuyo nombre va antes por orden alfabético',
  }),
  /** Why one prefix goes before another (ALPHABETICAL_ORDER). */
  why: Object.freeze({
    letters: (a, b) => `${a} antes que ${b}`,
    shorter: 'la palabra más corta va primero',
    numbers: 'con las mismas letras, va primero la del número más bajo',
  }),
  /** Hints added to ALPHABETICAL_ORDER when the student seems to have counted a multiplier or `tert-`. */
  hints: Object.freeze({
    multipliers: `Los prefijos ${WORDS.di}-, ${WORDS.tri}-… no cuentan para el orden.`,
    italic: `«${WORDS.tert}» no cuenta para el orden.`,
  }),
  /** What a parent without locants has in one place only (NEEDLESS_LOCANTS). */
  what: Object.freeze({
    double: 'el enlace doble',
    triple: 'el enlace triple',
    doubles: 'los enlaces dobles',
    triples: 'los enlaces triples',
    both: 'los enlaces dobles y triples',
    prefixes: 'los sustituyentes',
  }),
});

/**
 * Every diagnosis code, in the order of the rules (design.md §15.8 R-3):
 * its rule number (1–11), the explanation step it points at (an explain()
 * step id, design.md §5) and example data for its message (R-7 lists the
 * drafts with it). Frozen; later families add their codes.
 */
export const DIAGNOSES = Object.freeze({
  BRANCH_AT_END: Object.freeze({ rule: 1, step: 'chain', example: Object.freeze({ branch: WORDS.metil, length: 4 }) }),
  LONGER_CHAIN: Object.freeze({ rule: 2, step: 'chain', example: Object.freeze({ student: 4, length: 5 }) }),
  MORE_MULTIPLE_BONDS: Object.freeze({ rule: 3, step: 'tiebreak', example: Object.freeze({ student: 0, app: 1 }) }),
  MORE_DOUBLE_BONDS: Object.freeze({ rule: 3, step: 'tiebreak', example: Object.freeze({ student: 0, app: 1 }) }),
  MORE_SUBSTITUENTS: Object.freeze({ rule: 3, step: 'tiebreak', example: Object.freeze({ student: 1, app: 2 }) }),
  CHAIN_LOCANTS: Object.freeze({ rule: 3, step: 'numbering', example: Object.freeze({ rule: 'N1', app: '1', student: '2' }) }),
  CHAIN_ALPHABETICAL: Object.freeze({ rule: 3, step: 'numbering', example: Object.freeze({}) }),
  NUMBERING: Object.freeze({
    rule: 4, step: 'numbering', example: Object.freeze({ rule: 'N3', app: '2', student: '4', unwritten: false, name: '' }),
  }),
  ALPHABETICAL_ORDER: Object.freeze({
    rule: 5,
    step: 'order',
    example: Object.freeze({
      first: WORDS.etil, second: WORDS.metil, why: DIAGNOSIS_PHRASES.why.letters(WORDS.etil[0], WORDS.metil[0]), hint: '',
    }),
  }),
  UNGROUPED: Object.freeze({
    rule: 6, step: 'substituents',
    example: Object.freeze({ compound: false, right: `2,3-${WORDS.di}${WORDS.metil}`, student: `2-${WORDS.metil}-3-${WORDS.metil}` }),
  }),
  MULTIPLIER_KIND: Object.freeze({
    rule: 7, step: 'substituents',
    example: Object.freeze({ compound: false, right: `2,3-${WORDS.di}${WORDS.metil}`, student: `2,3-${WORDS.bis}${WORDS.metil}` }),
  }),
  LOCANT_ORDER: Object.freeze({
    rule: 8, step: 'assemble',
    example: Object.freeze({ right: `2,3-${WORDS.di}${WORDS.metil}`, student: `3,2-${WORDS.di}${WORDS.metil}` }),
  }),
  NEEDLESS_LOCANTS: Object.freeze({
    rule: 9,
    step: 'numbering',
    example: Object.freeze({
      branch: false, name: `${stem(3)}${WORDS.eno}`, what: DIAGNOSIS_PHRASES.what.double, right: '', student: '',
    }),
  }),
  MISSING_LOCANTS: Object.freeze({
    rule: 9, step: 'numbering', example: Object.freeze({ name: `2-${WORDS.metil}${stem(5)}${ENDINGS.saturated}` }),
  }),
  SEGMENT_ORDER: Object.freeze({
    rule: 10,
    step: 'assemble',
    example: Object.freeze({
      name: `${stem(5)}-1-${WORDS.en}-4-${WORDS.ino}`, student: `${stem(5)}-4-${WORDS.ino.slice(0, -1)}-1-${WORDS.eno}`,
    }),
  }),
  OLD_STYLE: Object.freeze({ rule: 11, step: 'assemble', example: Object.freeze({ name: `${stem(4)}-2-${WORDS.eno}` }) }),
});

/** The diagnosis codes, in rule order. */
export const DIAGNOSIS_CODES = Object.freeze(Object.keys(DIAGNOSES));

/**
 * Explanation steps to open when a diagnosis's own step is missing from
 * the steps shown (diagnosisStepIndex()): the nearest step that still
 * explains the rule. For an open-chain hydrocarbon the step of every
 * diagnosis of the tested corpus exists, except `order` for a mistake
 * inside the one compound branch of a parent with a single prefix group
 * (explain() skips the order step then; `substituents` explains the
 * branch's prefixes, tested); the fallbacks also keep later families safe.
 */
export const STEP_FALLBACKS = Object.freeze({
  chain: Object.freeze(['groupChain', 'count']),
  tiebreak: Object.freeze(['chain', 'groupChain']),
  numbering: Object.freeze(['ringNumbering', 'assemble']),
  substituents: Object.freeze(['assemble']),
  order: Object.freeze(['substituents', 'assemble']),
  assemble: Object.freeze([]),
});

/**
 * A diagnosis (design.md §15.3 `otherName`): JSON-safe data for the
 * results panel.
 *
 * @typedef {object} Diagnosis
 * @property {string} code - A DIAGNOSES key.
 * @property {number} rule - Its rule number in design.md §15.8 R-3 (1–11).
 * @property {string|null} traceRule - The engine trace rule the diagnosis follows ('P1'…'P4', 'N1'…'N5'), or null for rules 5–11.
 * @property {string} message - The Spanish message (DIAGNOSIS_TEXTS).
 * @property {string} step - The `id` of the explain() step that explains the rule, a step of the explanation of the naming
 *   in `style` (diagnosisExplanation() builds it and finds the step; diagnosisStepIndex()).
 * @property {string} style - The prefix style compared with (substituent.js PREFIX_STYLES; the student's own), the
 *   explanation context: the trace, `parent` and `step` belong to nameMolecule(molecule, {prefixStyle: style})
 *   (diagnosisNaming(); the verdict's own naming for the default style).
 * @property {{atoms: number[], bonds: number[]}} student - The student's parent chain, in the student's locant order.
 * @property {{atoms: number[], bonds: number[]}} parent - The app's parent chain in that style (the naming's `parent`; the
 *   verdict's naming for the default style), in its locant order.
 * @property {{atoms: number[], bonds: number[]}} focus - The atoms and bonds the message is about (empty when none).
 * @property {[number, number]|null} tiles - The student's tiles the message is about, `[from, to)`, or null.
 */

/**
 * The parenthetical «(2 en vez de 4)» of a locant comparison, or nothing
 * when there are no locants to show.
 *
 * @param {{app?: string|null, student?: string|null}} d - The diagnosis data.
 * @returns {string} The text, with its leading space.
 */
function difference(d) {
  return d.app === null || d.app === undefined ? '' : ` (${d.app} en vez de ${d.student})`;
}

/**
 * A copy of an atoms-and-bonds selection.
 *
 * @param {{atoms: number[], bonds: number[]}|null|undefined} ids - The selection.
 * @returns {{atoms: number[], bonds: number[]}} The copy (empty lists for none).
 */
function idsOf(ids) {
  return { atoms: ids ? [...ids.atoms] : [], bonds: ids ? [...ids.bonds] : [] };
}

/**
 * The atoms and bonds of some prefix occurrences (build.js prefixAtoms
 * entries): each branch with the bond that joins it to the chain.
 *
 * @param {object[]} occurrences - prefixAtoms entries.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
function occurrenceIds(occurrences) {
  return {
    atoms: occurrences.flatMap((o) => o.atoms),
    bonds: occurrences.flatMap((o) => [o.bond, ...o.bonds]),
  };
}

/**
 * The text of a substituent without the enclosing marks around the whole of
 * it: `(2-metilpropil)` → `2-metilpropil`.
 *
 * @param {string} text - The text.
 * @returns {string} The text without its outer marks.
 */
function unwrap(text) {
  for (const [open, close] of ENCLOSING_MARKS) {
    if (text.length > open.length + close.length && text.startsWith(open) && text.endsWith(close)) {
      return text.slice(open.length, text.length - close.length);
    }
  }
  return text;
}

/**
 * The words of a prefix as the student wrote them, without its locants,
 * multiplier and outer enclosing marks: `metil`, `propan-2-il`,
 * `2,2-dimetilpropil`, `tert-butil`.
 *
 * @param {object} tree - The parse() tree.
 * @param {object} item - One of its prefix nodes.
 * @returns {string} The words.
 */
function wordsOf(tree, item) {
  return unwrap(itemText(tree, { ...item, locants: [], multiplier: null }));
}

/**
 * The alphanumerical citation key of a prefix written by the student
 * (design.md §1.1, render.js citationKey()): the letters of its words
 * (external multiplier, locants, punctuation and italic descriptors left
 * out; multipliers inside a compound branch kept), its numbers in order,
 * its italic descriptors. Compared with numbering.js compareCitationKeys().
 *
 * @param {string} words - wordsOf() the prefix.
 * @param {{withItalic?: boolean, lead?: string}} [options] - Count the italic descriptors as letters, or put a multiplier's letters first (the hints of ALPHABETICAL_ORDER).
 * @returns {{alpha: string, numeric: number[], italic: string}} The key.
 */
function citationKeyOf(words, options = {}) {
  let rest = words;
  let italic = '';
  if (!options.withItalic) {
    for (const descriptor of ITALIC_DESCRIPTORS) {
      if (rest.includes(descriptor)) {
        italic += descriptor;
        rest = rest.split(descriptor).join('');
      }
    }
  }
  return {
    alpha: `${options.lead || ''}${rest}`.toLowerCase().replace(/[^a-z]/g, ''),
    numeric: (rest.match(/\d+/g) || []).map(Number),
    italic,
  };
} // End of function citationKeyOf()

/**
 * Why one citation key goes before another (ALPHABETICAL_ORDER): the first
 * letters that differ, the shorter word, or the numbers.
 *
 * @param {{alpha: string}} first - The key that goes first.
 * @param {{alpha: string}} second - The key written first by the student.
 * @returns {string} The phrase.
 */
function orderReason(first, second) {
  const n = Math.min(first.alpha.length, second.alpha.length);
  for (let i = 0; i < n; i += 1) {
    if (first.alpha[i] !== second.alpha[i]) {
      return DIAGNOSIS_PHRASES.why.letters(first.alpha[i], second.alpha[i]);
    }
  }
  return first.alpha.length === second.alpha.length ? DIAGNOSIS_PHRASES.why.numbers : DIAGNOSIS_PHRASES.why.shorter;
}

/**
 * Tells whether a branch node takes bis/tris rather than di/tri when
 * multiplied: a compound branch with prefixes of its own (render.js
 * isCompoundPrefix() for hydrocarbon branches); a retained word or a
 * plain chain, even enclosed for its own locants (`di(propan-2-il)`), is
 * simple.
 *
 * @param {object} node - A substituent node (parse.js chain, retained or branch).
 * @returns {boolean} True for bis/tris.
 */
function isCompoundNode(node) {
  return node.type === 'branch' && node.items.length > 0;
}

/**
 * How many occurrences a prefix node stands for: its multiplier, or one.
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {object} item - A prefix node.
 * @returns {number} The count.
 */
function countOf(tiles, item) {
  return item.multiplier === null ? 1 : tiles[item.multiplier].value;
}

/**
 * A tree whose tiles at some positions are replaced (the tree's nodes keep
 * pointing at the same positions): the student's name with a tile changed.
 *
 * @param {object} tree - The parse() tree.
 * @param {Map<number, object>} changes - New tile by position.
 * @returns {object} The changed tree.
 */
function withTiles(tree, changes) {
  return { ...tree, tiles: tree.tiles.map((tile, i) => (changes.has(i) ? changes.get(i) : tile)) };
}

/**
 * The changes that put a locant list in ascending order (its own number
 * tiles, reordered over the same positions).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number[]} positions - The list's tile indices.
 * @returns {Map<number, object>} New tile by position.
 */
function sortedLocants(tiles, positions) {
  const sorted = positions.map((p) => tiles[p]).sort((a, b) => a.value - b.value);
  return new Map(positions.map((p, k) => [p, sorted[k]]));
}

/**
 * Tells whether a locant list is in ascending order (repeats allowed).
 *
 * @param {object[]} tiles - The tile sequence.
 * @param {number[]} positions - The list's tile indices.
 * @returns {boolean} True when ascending.
 */
function ascending(tiles, positions) {
  return positions.every((p, k) => k === 0 || tiles[positions[k - 1]].value <= tiles[p].value);
}

/**
 * A copy of a node of the tree with one node inside it (a chain or a
 * compound branch) replaced, at any depth.
 *
 * @param {object} node - A prefix, branch, chain or retained node.
 * @param {object} target - The node to replace.
 * @param {object} replacement - Its replacement.
 * @returns {object} The copy.
 */
function replaceNode(node, target, replacement) {
  if (node === target) {
    return replacement;
  }
  if (node.type === 'prefix') {
    return { ...node, substituent: replaceNode(node.substituent, target, replacement) };
  }
  if (node.type === 'branch') {
    return {
      ...node,
      items: node.items.map((item) => replaceNode(item, target, replacement)),
      chain: node.chain && replaceNode(node.chain, target, replacement),
    };
  }
  return node;
} // End of function replaceNode()

/**
 * One list of prefixes written together: the parent's, or a compound
 * branch's own.
 *
 * @typedef {object} PrefixList
 * @property {object[]} items - The prefix nodes, in tile order.
 * @property {boolean} top - The parent's prefixes.
 * @property {object|null} owner - The compound branch node whose prefixes they are (null for the parent's).
 * @property {object|null} outer - The parent-level prefix that holds that branch (null for the parent's), quoted whole
 *   in the messages: «5-(2,2-dimetilpropil)», not «2,2-dimetil».
 */

/**
 * What every rule reads for one reading of the name (diagnose()).
 *
 * @typedef {object} ReadingContext
 * @property {object} tree - The student's parse() tree.
 * @property {object} spec - Its NameSpec (interpret.js).
 * @property {object} naming - The engine's naming in the student's prefix style (trace, parent, structure, name, parts).
 * @property {object} molecule - The verdict's molecule (the ids of every reading and of the naming).
 * @property {Map<number, object[]>} adj - Its adjacency (graph.js adjacency()).
 * @property {PrefixList[]} lists - prefixLists() of the tree.
 * @property {{chain: object, top: object|null}[]} chains - chainNodes() of the tree.
 * @property {{studentParent: {atoms: number[], bonds: number[]}, prefixAtoms: object[]}} reading - The student's reading.
 * @property {Map<object, BranchOccurrence>} occurrences - The first occurrence on the molecule of every prefix node, at
 *   every depth (branchOccurrences() `first`, for this reading).
 */

/**
 * One occurrence of a branch the student wrote, found on the molecule.
 *
 * @typedef {object} BranchOccurrence
 * @property {object} sub - The branch's SubstituentSpec (interpret.js).
 * @property {number} attachment - The atom with the free valence.
 * @property {number} parentAtom - The atom it hangs from (on the parent, or on the chain of a compound branch).
 * @property {number} order - The order of the bond between them (1 `il`, 2 `iliden`).
 */

/**
 * Where a branch whose atoms are known joins the rest of the molecule: an
 * open-chain molecule is a tree, so one bond leaves the branch.
 *
 * @param {number[]} atoms - The branch's atoms.
 * @param {Map<number, object[]>} adj - The molecule's adjacency.
 * @returns {{attachment: number, parentAtom: number, order: number}|null} The joining bond's ends and order (null: none).
 */
function joinOf(atoms, adj) {
  const inside = new Set(atoms);
  for (const id of atoms) {
    const link = adj.get(id).find((n) => !inside.has(n.atom));
    if (link) {
      return { attachment: id, parentAtom: link.atom, order: link.order };
    }
  }
  return null;
} // End of function joinOf()

/**
 * Every branch the student wrote, at every depth, found on the molecule of
 * one reading: the parent-level occurrences are the reading's
 * `prefixAtoms`; a compound branch's own branches are cut from its atoms
 * (build.js ownPrefixAtoms()) and joined by their one bond.
 *
 * @param {{tree: object, spec: object}} name - The student's tree and NameSpec.
 * @param {{prefixAtoms: object[]}} reading - The reading.
 * @param {object} molecule - The verdict's molecule.
 * @param {Map<number, object[]>} adj - Its adjacency.
 * @returns {{first: Map<object, BranchOccurrence>, all: BranchOccurrence[]}} The first occurrence of each prefix node
 *   (parse.js prefix nodes, at every depth), and every occurrence.
 */
function branchOccurrences(name, reading, molecule, adj) {
  const first = new Map();
  const all = [];
  /**
   * Records an occurrence of a prefix, then those of its branch's own prefixes.
   *
   * @param {object} node - The prefix node (parse.js).
   * @param {object} sub - Its SubstituentSpec.
   * @param {{attachment: number, parentAtom: number, order: number}} join - Where it joins.
   * @param {number[]} atoms - Its atoms in creation order.
   * @returns {void}
   */
  const record = (node, sub, join, atoms) => {
    const occurrence = { sub, ...join };
    all.push(occurrence);
    if (!first.has(node)) {
      first.set(node, occurrence);
    }
    const own = node.substituent.type === 'branch' ? node.substituent.items : [];
    ownPrefixAtoms(sub, atoms).forEach((slices, k) => {
      for (const slice of slices) {
        const nested = joinOf(slice, adj);
        if (nested && own[k]) {
          record(own[k], sub.prefixes[k].substituent, nested, slice);
        }
      }
    });
  }; // End of function record()
  for (const o of reading.prefixAtoms) {
    const join = { attachment: o.attachment, parentAtom: o.parentAtom, order: molecule.bonds.get(o.bond).order };
    record(name.tree.items[o.prefix], name.spec.prefixes[o.prefix].substituent, join, o.atoms);
  }
  return { first, all };
} // End of function branchOccurrences()

/**
 * The prefix lists of a name: the parent's prefixes, then the prefixes of
 * each compound branch, in tile order.
 *
 * @param {object} tree - The parse() tree.
 * @returns {PrefixList[]} The lists.
 */
function prefixLists(tree) {
  const lists = [{ items: tree.items, top: true, owner: null, outer: null }];
  /**
   * Collects the compound branches of some prefixes.
   *
   * @param {object[]} items - Prefix nodes.
   * @param {object|null} outer - The parent-level prefix they belong to (null at the parent level).
   * @returns {void}
   */
  const visit = (items, outer) => {
    for (const item of items) {
      if (item.substituent.type === 'branch') {
        const holder = outer || item;
        lists.push({ items: item.substituent.items, top: false, owner: item.substituent, outer: holder });
        visit(item.substituent.items, holder);
      }
    }
  };
  visit(tree.items, null);
  return lists;
} // End of function prefixLists()

/**
 * The text quoted for a prefix of a list, before and after a fix: the
 * prefix itself at the parent level, else the whole parent-level prefix
 * that holds its branch (with the branch's prefixes replaced when given).
 *
 * @param {object} tree - The tree to read the tiles from (the student's, or one with tiles changed).
 * @param {PrefixList} list - The list.
 * @param {object} item - The prefix of the list quoted at the parent level.
 * @param {object[]} [items] - New prefixes for the list's branch (rule 6), or none.
 * @returns {string} The text.
 */
function quoted(tree, list, item, items = null) {
  if (!list.outer) {
    return itemText(tree, item);
  }
  return itemText(tree, items ? replaceNode(list.outer, list.owner, { ...list.owner, items }) : list.outer);
}

/**
 * The chain nodes of a name: the parent's, then every branch's, in tile
 * order, each with the parent-level prefix it belongs to (null for the
 * parent).
 *
 * @param {object} tree - The parse() tree.
 * @returns {{chain: object, top: object|null}[]} The chains.
 */
function chainNodes(tree) {
  const out = [{ chain: tree.parent.chain, top: null }];
  /**
   * Collects the chains of a substituent.
   *
   * @param {object} node - A substituent node.
   * @param {object} top - The parent-level prefix it belongs to.
   * @returns {void}
   */
  const visit = (node, top) => {
    if (node.type === 'chain') {
      out.push({ chain: node, top });
    } else if (node.type === 'branch') {
      node.items.forEach((item) => visit(item.substituent, top));
      if (node.chain) {
        visit(node.chain, top);
      }
    }
  };
  tree.items.forEach((item) => visit(item.substituent, item));
  return out;
} // End of function chainNodes()

/**
 * The tile range `[from, to)` of some tile indices.
 *
 * @param {number[]} positions - Tile indices (not empty).
 * @returns {[number, number]} The range.
 */
function rangeOf(positions) {
  return [Math.min(...positions), Math.max(...positions) + 1];
}

/**
 * The tile range `[from, to)` covering some slots (interpret.js Slot `tiles`).
 *
 * @param {{tiles: [number, number]}[]} slots - The slots (not empty).
 * @returns {[number, number]} The range.
 */
function slotRange(slots) {
  return [Math.min(...slots.map((slot) => slot.tiles[0])), Math.max(...slots.map((slot) => slot.tiles[1]))];
}

/**
 * The first difference between two locant lists, as text: the app's term
 * and the student's at the first point of difference (design.md §4.4); the
 * whole lists when one is a prefix of the other; nulls for values that are
 * not locant lists (N5 name keys).
 *
 * @param {Array<number|object>} app - The app's list.
 * @param {Array<number|object>} student - The student's list.
 * @returns {{app: string|null, student: string|null}} The terms.
 */
function firstDifference(app, student) {
  if (!Array.isArray(app) || !Array.isArray(student) || [...app, ...student].some((v) => typeof v !== 'number')) {
    return { app: null, student: null };
  }
  const n = Math.min(app.length, student.length);
  for (let i = 0; i < n; i += 1) {
    if (app[i] !== student[i]) {
      return { app: locantText(app[i]), student: locantText(student[i]) };
    }
  }
  return { app: app.map(locantText).join(','), student: student.map(locantText).join(',') };
} // End of function firstDifference()

/**
 * The value a step compared for one candidate.
 *
 * @param {object} step - A trace step.
 * @param {(candidate: object) => boolean} test - Picks the candidate.
 * @returns {*} Its value, or undefined.
 */
function valueOf(step, test) {
  const i = step.candidatesBefore.findIndex(test);
  return i < 0 ? undefined : step.values[i];
}

/**
 * The atoms and bonds of the parent that are not in the student's chain.
 *
 * @param {{atoms: number[], bonds: number[]}} parent - The app's parent.
 * @param {{atoms: number[], bonds: number[]}} student - The student's chain.
 * @returns {{atoms: number[], bonds: number[]}} The difference.
 */
function outsideStudent(parent, student) {
  const atoms = new Set(student.atoms);
  const bonds = new Set(student.bonds);
  return { atoms: parent.atoms.filter((id) => !atoms.has(id)), bonds: parent.bonds.filter((id) => !bonds.has(id)) };
}

/** The diagnosis code of a chain dropped at a trace rule (rule 3; P1 is rule 2). */
const DROPPED_AT = Object.freeze({
  P1: 'LONGER_CHAIN',
  P2: 'MORE_MULTIPLE_BONDS',
  P3: 'MORE_DOUBLE_BONDS',
  P4: 'MORE_SUBSTITUENTS',
  N1: 'CHAIN_LOCANTS',
  N2: 'CHAIN_LOCANTS',
  N3: 'CHAIN_LOCANTS',
  N4: 'CHAIN_LOCANTS',
  N5: 'CHAIN_ALPHABETICAL',
});

/**
 * Rule 1: the branch on an end carbon of the student's chain (the first in
 * tile order), which the trace shows is not a leaf-to-leaf path.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null when no branch sits on an end (never for a chain missing from P1).
 */
function branchAtEnd(ctx) {
  const { reading, tree, naming, spec } = ctx;
  const n = reading.studentParent.atoms.length;
  const end = reading.prefixAtoms.find((o) => o.locant === 1 || o.locant === n);
  if (!end) {
    return null;
  }
  return {
    code: 'BRANCH_AT_END',
    traceRule: 'P1',
    data: { branch: wordsOf(tree, tree.items[end.prefix]), length: naming.parent.atoms.length },
    focus: occurrenceIds([end]),
    tiles: end.tiles || spec.parent.tiles,
  };
} // End of function branchAtEnd()

/**
 * Rules 2 and 3: the student's chain was dropped by a trace step; the data
 * are the step's own values (the student's best one and the survivors').
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {object} step - The trace step that dropped the chain.
 * @param {(candidate: object) => boolean} sameChain - Tells the student's chain's candidates.
 * @returns {object|null} The draft, or null for a rule this phase does not know (later families).
 */
function chainDropped(ctx, step, sameChain) {
  const code = DROPPED_AT[step.rule];
  if (!code) {
    return null;
  }
  const { naming, reading, spec } = ctx;
  const winner = step.survivors[0];
  const app = valueOf(step, (c) => c.key === winner.key);
  const mine = step.candidatesBefore.map((c, i) => ({ c, v: step.values[i] })).filter(({ c }) => sameChain(c)).map(({ v }) => v);
  if (mine.length === 0) {
    return null; // Never: the caller found the chain among the step's candidates.
  }
  let data;
  if (step.rule.startsWith('P')) {
    data = { student: mine[0], app, length: naming.parent.atoms.length };
  } else {
    const best = mine.reduce((a, b) => (Array.isArray(a) && Array.isArray(b) && compareLocantLists(b, a) < 0 ? b : a));
    data = { rule: step.rule, ...firstDifference(app, best) };
  }
  return {
    code,
    traceRule: step.rule,
    data,
    focus: outsideStudent(naming.parent, reading.studentParent),
    tiles: spec.parent.tiles,
  };
} // End of function chainDropped()

/**
 * Rules 1–4 from the engine's trace (design.md §4.1): where the student's
 * chain, then its numbering direction, leave the parent choice.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null when the chain and its numbering are the engine's (or give the same name).
 */
function chainRules(ctx) {
  const { naming, reading } = ctx;
  const { trace } = naming;
  const atoms = reading.studentParent.atoms;
  const undirected = chainKey(atoms);
  const directed = atoms.join('-');
  /**
   * Tells whether a trace candidate is the student's chain (either direction).
   *
   * @param {{atoms: number[]}} c - A candidate.
   * @returns {boolean} True for the student's chain.
   */
  const sameChain = (c) => chainKey(c.atoms) === undirected;
  /**
   * Tells whether a directed trace candidate is the student's numbering.
   *
   * @param {{key: string, direction?: string}} c - A candidate.
   * @returns {boolean} True for the student's chain in the student's direction.
   */
  const isStudent = (c) => c.direction !== undefined && c.key === directed;
  const p1 = trace.find((s) => s.rule === 'P1');
  if (!p1) {
    return null; // A ring parent (later families).
  }
  if (!p1.candidatesBefore.some(sameChain)) {
    return branchAtEnd(ctx);
  }
  let direction = null;
  for (const step of trace) {
    if (step.rule === 'TIE') {
      break; // Every candidate left gives the same name.
    }
    if (!step.candidatesBefore.some(sameChain)) {
      continue;
    }
    if (!step.survivors.some(sameChain)) {
      return chainDropped(ctx, step, sameChain);
    }
    if (!direction && step.candidatesBefore.some(isStudent) && !step.survivors.some(isStudent)) {
      direction = step;
    }
  } // End of the loop over the trace steps
  if (!direction) {
    return null;
  }
  const winner = direction.survivors[0];
  const terms = firstDifference(valueOf(direction, (c) => c.key === winner.key), valueOf(direction, isStudent));
  const unwritten = !naming.parts.some((p) => p.kind === 'locant');
  return {
    code: 'NUMBERING',
    traceRule: direction.rule,
    data: { rule: direction.rule, ...terms, unwritten, name: naming.name },
    focus: idsOf(null),
    tiles: null,
  };
} // End of function chainRules()

/**
 * The identity of a prefix of a list, to tell identical branches apart, at
 * every depth: the structural key of its first occurrence on the molecule
 * (graph.js rootedBranchKey(), rooted at the atom with the free valence,
 * and the order of the bond that attaches it): `isopropil` and
 * `(propan-2-il)` are the same branch, and so are `metil` and
 * `(metan-1-il)` inside `[2-metil-2-(metan-1-il)propil]`. Its words only
 * should the prefix not be found on the molecule (never for a built name).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {PrefixList} list - The prefix list.
 * @param {number} index - The prefix's index in the list.
 * @returns {string} The identity.
 */
function identityOf(ctx, list, index) {
  const item = list.items[index];
  const occurrence = ctx.occurrences.get(item);
  if (occurrence) {
    return `${occurrence.order}:${rootedBranchKey(ctx.molecule, occurrence.attachment, occurrence.parentAtom, ctx.adj)}`;
  }
  return `words:${wordsOf(ctx.tree, item)}`;
}

/**
 * The atoms of some parent-level prefixes (for `focus`): their occurrences
 * on the molecule; nothing for a list inside a compound branch.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @param {PrefixList} list - The prefix list.
 * @param {number[]} indices - The prefixes' indices in the list.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
function prefixFocus(ctx, list, indices) {
  if (!list.top) {
    return idsOf(null);
  }
  return occurrenceIds(ctx.reading.prefixAtoms.filter((o) => indices.includes(o.prefix)));
}

/**
 * Rule 5: two different branches of one list not in alphabetical order
 * (compareCitationKeys() over the student's words; identical branches are
 * rule 6's).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function alphabeticalOrder(ctx) {
  const { tree } = ctx;
  for (const list of ctx.lists) {
    const words = list.items.map((item) => wordsOf(tree, item));
    const keys = words.map((w) => citationKeyOf(w));
    const ids = list.items.map((_, i) => identityOf(ctx, list, i));
    for (let i = 0; i < list.items.length; i += 1) {
      for (let j = i + 1; j < list.items.length; j += 1) {
        if (compareCitationKeys(keys[i], keys[j]) <= 0 || ids[i] === ids[j]) {
          continue;
        }
        const [a, b] = [list.items[i], list.items[j]];
        /**
         * The multiplier text of a prefix ('' without one).
         *
         * @param {object} item - A prefix node.
         * @returns {string} The text.
         */
        const lead = (item) => (item.multiplier === null ? '' : tree.tiles[item.multiplier].text);
        let hint = '';
        if (compareCitationKeys(citationKeyOf(words[i], { lead: lead(a) }), citationKeyOf(words[j], { lead: lead(b) })) <= 0) {
          hint = DIAGNOSIS_PHRASES.hints.multipliers;
        } else if (compareCitationKeys(citationKeyOf(words[i], { withItalic: true }), citationKeyOf(words[j], { withItalic: true })) <= 0) {
          hint = DIAGNOSIS_PHRASES.hints.italic;
        }
        return {
          code: 'ALPHABETICAL_ORDER',
          data: { first: words[j], second: words[i], why: orderReason(keys[j], keys[i]), hint },
          focus: prefixFocus(ctx, list, [i, j]),
          tiles: [a.range[0], b.range[1]],
        };
      } // End of the loop over the later prefixes
    } // End of the loop over the prefixes of a list
  } // End of the loop over the prefix lists
  return null;
} // End of function alphabeticalOrder()

/**
 * Rule 6: identical branches written as separate prefixes of one list (one
 * structure, in any words: identityOf()). The right form groups them as
 * the assembler writes them: every locant in ascending order, the
 * multiplier (di… or bis… as rule 7 says), the first one's words — in the
 * engine's short form should they carry needless locants (shortForm():
 * `2,2-dimetil` for `2-(metan-1-il)-2-metil`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function ungrouped(ctx) {
  const { tree } = ctx;
  for (const list of ctx.lists) {
    const ids = list.items.map((_, i) => identityOf(ctx, list, i));
    const first = ids.findIndex((id, i) => ids.indexOf(id, i + 1) >= 0);
    if (first < 0) {
      continue;
    }
    const indices = ids.map((id, i) => (id === ids[first] ? i : -1)).filter((i) => i >= 0);
    const group = indices.map((i) => list.items[i]);
    const count = group.reduce((sum, item) => sum + countOf(tree.tiles, item), 0);
    if (count > MAX_MULT) {
      continue; // No multiplier tile so large (never within the engine's caps).
    }
    const compound = isCompoundNode(group[0].substituent);
    const locants = group.flatMap((item) => item.locants);
    const grouped = { ...tree, tiles: [...tree.tiles, tileById(tileId(compound ? 'cmult' : 'mult', count))] };
    const sorted = [...locants].sort((p, q) => tree.tiles[p].value - tree.tiles[q].value);
    const words = group[0].substituent;
    const substituent = (words.type === 'chain' && shortForm(tree, words)) || words;
    const item = { ...group[0], substituent, locants: locants.length === count ? sorted : [], multiplier: grouped.tiles.length - 1 };
    const located = group.every((g) => g.locants.length > 0);
    // At the parent level the prefixes alone («2,3-dimetil»); inside a branch, the whole parent-level prefix.
    const items = list.items.filter((_, i) => i === first || !indices.includes(i)).map((g, i) => (i === first ? item : g));
    return {
      code: 'UNGROUPED',
      data: {
        compound,
        right: list.outer ? quoted(grouped, list, item, items) : itemText(grouped, item),
        student: list.outer ? quoted(tree, list, item) : group.map((g) => itemText(tree, g)).join(located ? '-' : ''),
      },
      focus: prefixFocus(ctx, list, indices),
      tiles: [group[0].range[0], group[group.length - 1].range[1]],
    };
  } // End of the loop over the prefix lists
  return null;
} // End of function ungrouped()

/**
 * Rule 7: a multiplier of the wrong kind — di… before a branch with
 * prefixes of its own, or bis… before a simple one.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function multiplierKind(ctx) {
  const { tree } = ctx;
  for (const list of ctx.lists) {
    for (const [index, item] of list.items.entries()) {
      if (item.multiplier === null) {
        continue;
      }
      const tile = tree.tiles[item.multiplier];
      const compound = isCompoundNode(item.substituent);
      if ((tile.kind === 'cmult') === compound) {
        continue;
      }
      const swapped = withTiles(tree, new Map([[item.multiplier, tileById(tileId(compound ? 'cmult' : 'mult', tile.value))]]));
      return {
        code: 'MULTIPLIER_KIND',
        data: { compound, right: quoted(swapped, list, item), student: quoted(tree, list, item) },
        focus: prefixFocus(ctx, list, [index]),
        tiles: [item.multiplier, item.multiplier + 1],
      };
    } // End of the loop over the prefixes of a list
  } // End of the loop over the prefix lists
  return null;
} // End of function multiplierKind()

/**
 * Rule 8: a locant list not in ascending order — a prefix's (quoted alone),
 * a chain's multiple bonds or the old-style locants (quoted with the whole
 * name, or with the parent-level prefix of a branch).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function locantOrder(ctx) {
  const { tree } = ctx;
  for (const list of ctx.lists) {
    for (const [index, item] of list.items.entries()) {
      if (!ascending(tree.tiles, item.locants)) {
        const fixed = withTiles(tree, sortedLocants(tree.tiles, item.locants));
        return {
          code: 'LOCANT_ORDER',
          data: { right: quoted(fixed, list, item), student: quoted(tree, list, item) },
          focus: prefixFocus(ctx, list, [index]),
          tiles: rangeOf(item.locants),
        };
      }
    }
  } // End of the loop over the prefix lists
  const others = [
    { positions: tree.parent.legacy, top: null },
    ...ctx.chains.flatMap(({ chain, top }) => chain.segments.map((segment) => ({ positions: segment.locants, top }))),
  ];
  for (const { positions, top } of others) {
    if (!ascending(tree.tiles, positions)) {
      const fixed = withTiles(tree, sortedLocants(tree.tiles, positions));
      /**
       * The text quoted: the parent-level prefix of a branch's chain, else the whole name.
       *
       * @param {object} t - The tree (the student's or the fixed one).
       * @returns {string} The text.
       */
      const text = (t) => (top ? itemText(t, top) : assemble(t).text);
      return { code: 'LOCANT_ORDER', data: { right: text(fixed), student: text(tree) }, focus: idsOf(null), tiles: rangeOf(positions) };
    }
  } // End of the loop over the multiple-bond and old-style locant lists
  return null;
} // End of function locantOrder()

/**
 * What a parent written without locants has in one place only (the
 * NEEDLESS_LOCANTS phrase), from the engine's parent.
 *
 * @param {{double: object[], triple: object[]}} parent - The engine's parent structure.
 * @returns {string} The phrase.
 */
function unsaturationWhat(parent) {
  const { what } = DIAGNOSIS_PHRASES;
  if (parent.double.length > 0 && parent.triple.length > 0) {
    return what.both;
  }
  if (parent.triple.length > 0) {
    return parent.triple.length > 1 ? what.triples : what.triple;
  }
  return parent.double.length > 1 ? what.doubles : what.double;
}

/**
 * Rule 9, needless locants: locants the engine's name omits (design.md
 * §1.1: the parent's multiple bonds of `propeno`, `eteno`…, lexicon
 * omitsLocants(); the prefixes of a one- or two-carbon parent,
 * chainOmitsPrefixLocants()), or locants inside a branch that the engine's
 * short forms never write (any on a one- or two-carbon branch, `etenil`;
 * the free valence 1 of a saturated branch, `propil` — render.js
 * substituentTokens()).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function needlessLocants(ctx) {
  const { tree, spec, naming } = ctx;
  const { structure } = naming;
  /**
   * The slots the student wrote (interpret.js `supplied`).
   *
   * @param {object[]} slots - Slots.
   * @returns {object[]} The supplied ones.
   */
  const supplied = (slots) => slots.filter((slot) => slot.kind === 'supplied');
  const bondSlots = supplied([...spec.parent.double, ...spec.parent.triple]);
  const suffixCount = structure.suffix ? structure.suffix.locants.length : 0;
  if (structure.parentKind === 'chain' && bondSlots.length > 0
    && omitsLocants(structure.parent, structure.prefixes.length > 0 || suffixCount > 0)) {
    return {
      code: 'NEEDLESS_LOCANTS',
      data: { branch: false, name: naming.name, what: unsaturationWhat(structure.parent) },
      focus: idsOf(null),
      tiles: slotRange(bondSlots),
    };
  }
  const prefixSlots = supplied(spec.prefixes.flatMap((prefix) => prefix.slots));
  if (structure.parentKind === 'chain' && prefixSlots.length > 0
    && chainOmitsPrefixLocants(structure.parent, structure.prefixes, suffixCount, structure.suffix ? structure.suffix.kind : null)) {
    return {
      code: 'NEEDLESS_LOCANTS',
      data: { branch: false, name: naming.name, what: DIAGNOSIS_PHRASES.what.prefixes },
      focus: idsOf(null),
      tiles: slotRange(prefixSlots),
    };
  }
  for (const { chain, top } of ctx.chains) {
    const bare = top ? shortForm(tree, chain) : null;
    if (bare) {
      return {
        code: 'NEEDLESS_LOCANTS',
        data: { branch: true, right: itemText(tree, replaceNode(top, chain, bare)), student: itemText(tree, top) },
        focus: idsOf(null),
        tiles: rangeOf([...chain.segments.flatMap((s) => s.locants), ...chain.fvLocants]),
      };
    }
  } // End of the loop over the branch chains
  return null;
} // End of function needlessLocants()

/**
 * The engine's short form of a branch chain written with needless locants
 * (rule 9; render.js substituentTokens()): no `ano`, no free-valence
 * locant, and on a one- or two-carbon branch no locant at all
 * (`(metan-1-il)` → `metil`, `(et-1-enil)` → `etenil`); on a longer
 * saturated branch, the free valence 1 (`(propan-1-il)` → `propil`).
 *
 * @param {object} tree - The parse() tree.
 * @param {object} chain - A branch's chain node (parse.js, with `fv`).
 * @returns {object|null} The chain node in its short form, or null when it has no needless locants.
 */
function shortForm(tree, chain) {
  const length = tree.tiles[chain.root].value;
  const positions = [...chain.segments.flatMap((s) => s.locants), ...chain.fvLocants];
  const short = length <= 2 && positions.length > 0;
  const saturatedOne = length > 2 && chain.segments.length === 0 && chain.fvLocants.length === 1
    && tree.tiles[chain.fvLocants[0]].value === 1;
  if (!short && !saturatedOne) {
    return null;
  }
  const segments = short ? chain.segments.map((s) => ({ ...s, locants: [] })) : chain.segments;
  return { ...chain, ano: null, fvLocants: [], segments };
} // End of function shortForm()

/**
 * Rule 9, missing locants: a left-out locant with more than one possible
 * value (search.js domains) where the engine's name writes one — the
 * parent's multiple bonds and prefixes unless the omission rules leave
 * them out, and always inside a branch.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function missingLocants(ctx) {
  const { spec, naming } = ctx;
  const { structure } = naming;
  const suffixCount = structure.suffix ? structure.suffix.locants.length : 0;
  const chain = structure.parentKind === 'chain';
  const parentBonds = new Set([...spec.parent.double, ...spec.parent.triple]);
  const parentPrefixes = new Set(spec.prefixes.flatMap((prefix) => prefix.slots));
  const bondsOmitted = chain && omitsLocants(structure.parent, structure.prefixes.length > 0 || suffixCount > 0);
  const prefixesOmitted = chain
    && chainOmitsPrefixLocants(structure.parent, structure.prefixes, suffixCount, structure.suffix ? structure.suffix.kind : null);
  const missing = spec.leftOut.find((slot) => {
    if (slot.domain[1] <= slot.domain[0]) {
      return false; // One possible value: no name writes it (search.js filledTree()).
    }
    if (parentBonds.has(slot)) {
      return !bondsOmitted;
    }
    return parentPrefixes.has(slot) ? !prefixesOmitted : true;
  });
  if (!missing) {
    return null;
  }
  return { code: 'MISSING_LOCANTS', data: { name: naming.name }, focus: idsOf(null), tiles: [missing.tiles[0], missing.tiles[1]] };
} // End of function missingLocants()

/**
 * Rule 10: a chain whose `ino` segment is written before its `eno` segment.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function segmentOrder(ctx) {
  const { tree, naming } = ctx;
  for (const { chain } of ctx.chains) {
    const kinds = chain.segments.map((s) => tree.tiles[s.ending].value);
    if (kinds.length === 2 && kinds[0] === 'triple' && kinds[1] === 'double') {
      return {
        code: 'SEGMENT_ORDER',
        data: { name: naming.name, student: assemble(tree).text },
        focus: idsOf(null),
        tiles: [chain.segments[0].range[0], chain.segments[1].range[1]],
      };
    }
  }
  return null;
} // End of function segmentOrder()

/**
 * Rule 11: old-style locants before the parent's root (`2-buteno`).
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft, or null.
 */
function oldStyle(ctx) {
  const { spec, tree, naming } = ctx;
  if (!spec.oldStyle) {
    return null;
  }
  return { code: 'OLD_STYLE', data: { name: naming.name }, focus: idsOf(null), tiles: rangeOf(tree.parent.legacy) };
}

/**
 * The checks of rules 5–11, in order. Later families insert theirs.
 */
const FORM_RULES = Object.freeze([alphabeticalOrder, ungrouped, multiplierKind, locantOrder, needlessLocants, missingLocants,
  segmentOrder, oldStyle]);

/**
 * The first rule that applies to one reading of the name.
 *
 * @param {ReadingContext} ctx - The reading's context.
 * @returns {object|null} The draft `{code, traceRule?, data, focus, tiles}`, or null.
 */
function firstRule(ctx) {
  const chain = chainRules(ctx);
  if (chain) {
    return chain;
  }
  for (const rule of FORM_RULES) {
    const draft = rule(ctx);
    if (draft) {
      return draft;
    }
  }
  return null;
} // End of function firstRule()

/**
 * The shape of a branch chain for recognising the prefix style (file
 * header): its length, where its free valence sits counted from the nearer
 * end (a branch numbered the wrong way keeps its shape), the bond order
 * that attaches it, and the shapes of its own branches in a fixed order
 * (their locants, multipliers and order of citation left out).
 *
 * @param {number} length - Carbons of the branch's own chain.
 * @param {number} locant - Its free-valence locant.
 * @param {number} order - The attaching bond's order.
 * @param {string[]} nested - The shapes of its own branches, one per occurrence.
 * @returns {string} The shape.
 */
function chainShape(length, locant, order, nested) {
  return `C${length}:${Math.min(locant, length + 1 - locant)}:${order}(${[...nested].sort().join(',')})`;
}

/**
 * The shape of a branch as the student wrote it (a SubstituentSpec): a
 * retained word, or chainShape() of its chain. Spelling mistakes the later
 * rules name do not change it: `(1-metiletan-1-il)` and `1-metiletil` have
 * one shape.
 *
 * @param {object} sub - A SubstituentSpec (interpret.js).
 * @returns {string} The shape.
 */
function specShape(sub) {
  if (sub.kind === 'retained') {
    return `R:${sub.retained}`;
  }
  const nested = sub.prefixes.flatMap((prefix) => prefix.slots.map(() => specShape(prefix.substituent)));
  return chainShape(sub.length, sub.freeValence.slot.value, sub.freeValence.order, nested);
}

/**
 * The shape of a branch as the engine names it (a SubstituentStructure,
 * substituent.js nameSubstituent()), comparable with specShape().
 *
 * @param {object|null} structure - The engine's substituent structure.
 * @returns {string} The shape ('' for none, or for a branch the reverse parser cannot write).
 */
function structureShape(structure) {
  if (!structure) {
    return '';
  }
  if (structure.retained) {
    return `R:${structure.retained}`;
  }
  if (!structure.chain || !structure.freeValence) {
    return '';
  }
  const nested = (structure.prefixes || []).flatMap((group) => group.locants.map(() => structureShape(group.substituent)));
  return chainShape(structure.chain.length, structure.freeValence.locant, structure.freeValence.order, nested);
} // End of function structureShape()

/**
 * The naming in the student's prefix style (file header): the verdict's
 * own (the default style) unless the engine offers the molecule in other
 * styles and, in one of them, more of the student's branches (at every
 * depth, found on the molecule) have the shape the engine gives that very
 * branch (specShape() against structureShape() of nameSubstituent() in
 * that style); that style is then named by the engine. A tie keeps the
 * earlier style of PREFIX_STYLES (the default first).
 *
 * @param {object} naming - The verdict's successful naming (default style).
 * @param {object} molecule - The verdict's molecule.
 * @param {BranchOccurrence[]} occurrences - Every branch the student wrote, on the molecule (branchOccurrences() `all`).
 * @param {(mol: object, options: object) => object} namer - The naming function (nameMolecule()).
 * @returns {{style: string, naming: object}} The style and its naming.
 */
function namingInStudentStyle(naming, molecule, occurrences, namer) {
  const fallback = { style: PREFIX_STYLES[0], naming };
  const offered = new Set((naming.alternatives || []).map((alt) => alt.style));
  const styles = PREFIX_STYLES.filter((style, i) => i === 0 || offered.has(style));
  if (styles.length === 1 || occurrences.length === 0) {
    return fallback;
  }
  const shapes = occurrences.map((o) => specShape(o.sub));
  /**
   * How many of the student's branches have, in a style, the shape the engine gives them.
   *
   * @param {string} style - A prefix style.
   * @returns {number} The count.
   */
  const score = (style) => occurrences
    .filter((o, i) => structureShape(nameSubstituent(molecule, o.parentAtom, o.attachment, style)) === shapes[i]).length;
  let best = { style: styles[0], score: score(styles[0]) };
  for (const style of styles.slice(1)) {
    const value = score(style);
    if (value > best.score) {
      best = { style, score: value };
    }
  }
  if (best.style === PREFIX_STYLES[0]) {
    return fallback;
  }
  const styled = namer(molecule, { prefixStyle: best.style });
  return styled && styled.ok && styled.trace ? { style: best.style, naming: styled } : fallback;
} // End of function namingInStudentStyle()

/**
 * Names the main mistake of an `otherName` verdict (design.md §15.3, §15.8
 * R-3): the first rule of the list (file header) that applies, compared with
 * the engine's naming in the student's prefix style, on the most charitable
 * reading of the name.
 *
 * @param {{tree: object, spec: object}} name - The student's name: its error-free parse() tree and its NameSpec (interpret.js).
 * @param {{molecule: object, naming: object, studentParent: {atoms: number[], bonds: number[]}, prefixAtoms: object[]}} verdict -
 *   The `otherName` verdict (readName()): the molecule, the engine's successful naming of it, and the student's reading on it.
 * @param {{studentParent: {atoms: number[], bonds: number[]}, prefixAtoms: object[]}[]} [readings] - Other readings of the
 *   same name on the same molecule (the other placements of a name with left-out locants, search.js placementReading());
 *   the verdict's own reading is tried first, and the diagnosis of the latest rule is kept.
 * @param {(mol: object, options: object) => object} [namer] - Names the molecule in another prefix style (default nameMolecule()).
 * @returns {Diagnosis|null} The diagnosis, or null when no rule applies (or the naming is a refusal, or a ring is involved).
 */
export function diagnose(name, verdict, readings = [], namer = nameMolecule) {
  const { molecule } = verdict;
  if (!verdict.naming || !verdict.naming.ok || !verdict.studentParent) {
    return null;
  }
  if (specRings(name.spec) > 0 || (verdict.naming.structure && verdict.naming.structure.parentKind !== 'chain')) {
    return null; // Rings: no rule reads them yet (file header).
  }
  const adj = adjacency(molecule);
  const drawn = branchOccurrences(name, verdict, molecule, adj);
  const { style, naming } = namingInStudentStyle(verdict.naming, molecule, drawn.all, namer);
  const base = {
    tree: name.tree,
    spec: name.spec,
    naming,
    molecule,
    adj,
    lists: prefixLists(name.tree),
    chains: chainNodes(name.tree),
  };
  let best = null;
  for (const reading of [verdict, ...readings]) {
    const occurrences = reading === verdict ? drawn.first : branchOccurrences(name, reading, molecule, adj).first;
    const draft = firstRule({ ...base, reading, occurrences });
    if (draft && (!best || DIAGNOSES[draft.code].rule > DIAGNOSES[best.draft.code].rule)) {
      best = { draft, reading };
    }
  }
  if (!best) {
    return null;
  }
  const { draft, reading } = best;
  return {
    code: draft.code,
    rule: DIAGNOSES[draft.code].rule,
    traceRule: draft.traceRule || null,
    message: DIAGNOSIS_TEXTS[draft.code](draft.data),
    step: DIAGNOSES[draft.code].step,
    style,
    student: idsOf(reading.studentParent),
    parent: idsOf(naming.parent),
    focus: idsOf(draft.focus),
    tiles: draft.tiles ? [draft.tiles[0], draft.tiles[1]] : null,
  };
} // End of function diagnose()

/**
 * The step of an explanation to open for a diagnosis (phase I-49b, «Ver el
 * paso»): the step whose `id` is the diagnosis's `step`, else the first of
 * its STEP_FALLBACKS present, else the last step.
 *
 * @param {{id: string}[]} steps - The explanation steps: explain() of diagnosisNaming() — the naming in the diagnosis's
 *   `style`, which is not the verdict's own naming outside the default style (diagnosisExplanation() builds them).
 * @param {{step: string}} diagnosis - The diagnosis.
 * @returns {number} The step index (-1 without steps).
 */
export function diagnosisStepIndex(steps, diagnosis) {
  for (const id of [diagnosis.step, ...(STEP_FALLBACKS[diagnosis.step] || [])]) {
    const index = steps.findIndex((step) => step.id === id);
    if (index >= 0) {
      return index;
    }
  }
  return steps.length - 1;
}

/**
 * The naming a diagnosis compared with, whose trace, parent and
 * explanation it refers to: the verdict's own naming for the default
 * style, else the engine's naming of the verdict's molecule in the
 * diagnosis's `style` (the same call diagnose() made, so the same result).
 *
 * @param {{molecule: object, naming: object, diagnosis?: Diagnosis|null}} verdict - An `otherName` verdict (readName()).
 * @param {(mol: object, options: object) => object} [namer] - The naming function diagnose() was given (default nameMolecule()).
 * @returns {object|null} The naming, or null without a diagnosis.
 */
export function diagnosisNaming(verdict, namer = nameMolecule) {
  const { diagnosis } = verdict;
  if (!diagnosis) {
    return null;
  }
  return diagnosis.style === PREFIX_STYLES[0] ? verdict.naming : namer(verdict.molecule, { prefixStyle: diagnosis.style });
}

/**
 * The explanation a diagnosis opens (phase I-49b, «Ver el paso»): the
 * naming it compared with (diagnosisNaming()), that naming's explanation
 * steps and the index of the diagnosis's step among them
 * (diagnosisStepIndex()). The stepper must show these steps — not those of
 * the verdict's own naming, which in another prefix style may number the
 * chain as the student did and so contradict a NUMBERING diagnosis
 * (`6-metil-4-(propan-2-il)nonano`). The explanation is injected
 * (src/explain/explain.js explain()): src/reverse never imports it.
 *
 * @param {{molecule: object, naming: object, diagnosis?: Diagnosis|null}} verdict - An `otherName` verdict (readName()).
 * @param {(naming: object) => {id: string}[]} explainSteps - Builds the explanation steps of a naming (explain()).
 * @param {(mol: object, options: object) => object} [namer] - The naming function diagnose() was given (default nameMolecule()).
 * @returns {{naming: object, steps: object[], index: number}|null} The naming, its steps and the step to open (-1 without
 *   steps), or null without a diagnosis.
 */
export function diagnosisExplanation(verdict, explainSteps, namer = nameMolecule) {
  const naming = diagnosisNaming(verdict, namer);
  if (!naming) {
    return null;
  }
  const steps = explainSteps(naming);
  return { naming, steps, index: diagnosisStepIndex(steps, verdict.diagnosis) };
}
