/**
 * @file Spanish word tables and morphology rules for IUPAC 2013 names
 * (design.md §1.1): stems 1–30, multipliers (di/tri… and bis/tris…),
 * endings, the connecting `a`, the `en`/`ino` rules, the locant-omission
 * table, the group-name vs. prefix forms, substituent-prefix morphology
 * (`il`, `an`, retained `isopropil`/`tert-butil`, enclosing marks), common
 * group names for explanations and the prefix-style labels.
 *
 * Everything that depends on the language lives here; render.js only
 * assembles parts and punctuation. The exported `lexiconEs` object is the
 * interface render.js expects from any lexicon (lexicon.en.js in phase 070
 * must provide the same members).
 */

/** Chain stems indexed by carbon count (index 0 unused). */
const STEMS = Object.freeze([
  null, 'met', 'et', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec',
  'undec', 'dodec', 'tridec', 'tetradec', 'pentadec', 'hexadec', 'heptadec', 'octadec', 'nonadec', 'icos',
  'henicos', 'docos', 'tricos', 'tetracos', 'pentacos', 'hexacos', 'heptacos', 'octacos', 'nonacos', 'triacont',
]);

/** Largest supported chain length (design.md §1.1 hard cap). */
export const MAX_STEM = 30;

/**
 * Largest supported multiplier. Independent of MAX_STEM: with the 60-carbon
 * cap a parent can carry up to 38 identical methyl groups, so multipliers
 * are composed beyond 30 (`hentriaconta`, `dotriaconta`…) up to 99.
 */
export const MAX_MULTIPLIER = 99;

/** Unit parts of composed numerical terms 31–99 (IUPAC 2013 P-14.2.1: hen, do, tri…). */
const UNIT_PARTS = Object.freeze(['', 'hen', 'do', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona']);

/** Tens parts of numerical terms 30–99 (without the final a). */
const TENS_PARTS = Object.freeze({
  3: 'triacont', 4: 'tetracont', 5: 'pentacont', 6: 'hexacont', 7: 'heptacont', 8: 'octacont', 9: 'nonacont',
});

/** Simple multipliers that are not stem + `a` (index = count). */
const SMALL_MULTIPLIERS = Object.freeze(['', '', 'di', 'tri', 'tetra']);

/** Compound (parenthesised-prefix) multipliers that are not multiplier + `kis`. */
const SMALL_COMPOUND_MULTIPLIERS = Object.freeze(['', '', 'bis', 'tris']);

/** Endings of the parent name. */
export const ENDINGS = Object.freeze({ saturated: 'ano', double: 'eno', triple: 'ino' });

/** The vowel kept after the stem when the first unsaturation segment is multiplied. */
export const CONNECTING_VOWEL = 'a';

/**
 * Order in which unsaturation segments are cited: `en` always before `ino`,
 * whatever their locants (`pent-3-en-1-ino`).
 */
export const SEGMENT_ORDER = Object.freeze(['double', 'triple']);

/**
 * Unsubstituted parents whose locants are omitted (design.md §1.1). This is
 * an explicit table, never inferred from "only one structural possibility".
 * Every other name keeps all its locants (`but-1-eno`, `2-metilprop-1-eno`).
 * `metano` and `etano` have no locants to omit and are listed for completeness.
 */
export const LOCANT_OMISSION = Object.freeze([
  { name: 'metano', length: 1, double: [], triple: [] },
  { name: 'etano', length: 2, double: [], triple: [] },
  { name: 'eteno', length: 2, double: [1], triple: [] },
  { name: 'etino', length: 2, double: [], triple: [1] },
  { name: 'propeno', length: 3, double: [1], triple: [] },
  { name: 'propino', length: 3, double: [], triple: [1] },
  { name: 'propadieno', length: 3, double: [1, 2], triple: [] },
]);

/**
 * Checks that a count is an integer within 1…max.
 *
 * @param {number} n - The count.
 * @param {string} caller - Function name for the error message.
 * @param {number} [max] - Upper bound (default MAX_STEM).
 * @returns {void}
 * @throws {RangeError} When the count is out of range.
 */
function checkCount(n, caller, max = MAX_STEM) {
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new RangeError(`${caller}: count must be an integer from 1 to ${max}, got ${n}`);
  }
}

/**
 * Numerical term without its final `a` for 1–99: the stem table up to 30,
 * then unit part + tens part (`hentriacont`, `dotriacont`, `tetracont`).
 *
 * @param {number} n - The number (1–99).
 * @returns {string} The numerical term, e.g. 'dotriacont' for 32.
 */
function numeralTerm(n) {
  if (n <= MAX_STEM) {
    return STEMS[n];
  }
  return UNIT_PARTS[n % 10] + TENS_PARTS[Math.floor(n / 10)];
}

/**
 * Returns the Spanish stem for a chain of the given length.
 *
 * @param {number} length - Number of carbon atoms (1–30).
 * @returns {string} The stem, e.g. 'but' for 4, 'icos' for 20.
 * @throws {RangeError} When the length is out of range.
 */
export function stem(length) {
  checkCount(length, 'stem');
  return STEMS[length];
}

/**
 * Returns the simple multiplying prefix (for simple prefixes and endings).
 * One takes no multiplier.
 *
 * @param {number} n - How many identical items (1–MAX_MULTIPLIER).
 * @returns {string} '', 'di', 'tri', 'tetra', 'penta', … 'undeca', 'icosa', 'dotriaconta'…
 * @throws {RangeError} When n is out of range.
 */
export function multiplier(n) {
  checkCount(n, 'multiplier', MAX_MULTIPLIER);
  return n < SMALL_MULTIPLIERS.length ? SMALL_MULTIPLIERS[n] : `${numeralTerm(n)}a`;
}

/**
 * Returns the multiplying prefix for compound (parenthesised) prefixes.
 *
 * @param {number} n - How many identical items (1–MAX_MULTIPLIER).
 * @returns {string} '', 'bis', 'tris', 'tetrakis', 'pentakis'…
 * @throws {RangeError} When n is out of range.
 */
export function compoundMultiplier(n) {
  checkCount(n, 'compoundMultiplier', MAX_MULTIPLIER);
  return n < SMALL_COMPOUND_MULTIPLIERS.length ? SMALL_COMPOUND_MULTIPLIERS[n] : `${multiplier(n)}kis`;
}

/**
 * Returns the ending of one unsaturation segment. The non-final `eno`
 * loses its `o` before `ino` (`hexa-1,3-dien-5-ino`).
 *
 * @param {'double'|'triple'} kind - Segment kind.
 * @param {boolean} isFinal - Whether the segment ends the name.
 * @returns {string} 'eno', 'en' or 'ino'.
 */
export function unsaturationEnding(kind, isFinal) {
  if (kind === 'triple') {
    return ENDINGS.triple;
  }
  return isFinal ? ENDINGS.double : ENDINGS.double.slice(0, -1);
}

/**
 * Tells whether the stem keeps the connecting `a`: only when the **first**
 * cited unsaturation segment is multiplied (`buta-1,3-dieno`,
 * `hexa-1,3-dien-5-ino`, but `hex-1-en-3,5-diino`, `but-1-eno`).
 *
 * @param {{double: object[], triple: object[]}} chain - The chain structure.
 * @returns {boolean} True when the connecting vowel is added.
 */
export function needsConnectingVowel(chain) {
  const first = SEGMENT_ORDER.map((kind) => chain[kind]).find((sites) => sites.length > 0);
  return Boolean(first) && first.length > 1;
}

/**
 * Looks up the locant-omission table.
 *
 * @param {{length: number, double: {locant: number}[], triple: {locant: number}[]}} chain - The parent chain structure.
 * @param {boolean} hasPrefixes - Whether the parent carries substituent prefixes.
 * @returns {boolean} True when the parent's locants are omitted.
 */
export function omitsLocants(chain, hasPrefixes) {
  if (hasPrefixes) {
    return false;
  }
  const same = (sites, locants) => sites.length === locants.length && sites.every((s, i) => s.locant === locants[i]);
  return LOCANT_OMISSION.some(
    (row) => row.length === chain.length && same(chain.double, row.double) && same(chain.triple, row.triple),
  );
}

/**
 * Returns the prefix form of an unbranched saturated alkyl group attached by
 * its end: `metil`, `etil`, `propil`… (`-iliden` for a double attachment).
 *
 * @param {number} length - Number of carbon atoms (1–30).
 * @param {number} [order] - Attachment bond order: 1 (default) or 2.
 * @returns {string} The prefix, e.g. 'metil', 'metiliden'.
 */
export function alkylPrefix(length, order = 1) {
  return `${stem(length)}${order === 2 ? 'iliden' : 'il'}`;
}

/**
 * Turns a prefix into the standalone group name used when talking about the
 * group: a final `o` is added (`metil` → `metilo`, `metiliden` →
 * `metilideno`, `isopropil` → `isopropilo`).
 *
 * @param {string} prefix - The prefix form.
 * @returns {string} The group name.
 */
export function groupName(prefix) {
  return `${prefix}o`;
}

/**
 * Turns a standalone group name back into its prefix form (drops the final
 * `o`): `metilo` → `metil`.
 *
 * @param {string} name - The group name.
 * @returns {string} The prefix form.
 */
export function prefixForm(name) {
  return name.endsWith('o') ? name.slice(0, -1) : name;
}

/** Suffix of a singly attached substituent prefix (`propil`, `propan-2-il`). */
export const FREE_VALENCE_SUFFIX = 'il';

/** Infix between the stem and a cited free-valence locant of a saturated group (`propan-2-il`). */
export const SATURATED_INFIX = 'an';

/**
 * Retained substituent prefixes (design.md §4.5), keyed by the retained-name
 * id stored in the structure. `italic` is the descriptor ignored in
 * alphanumerical order (`tert-`); `text` is the alphabetised part.
 */
export const RETAINED_PREFIXES = Object.freeze({
  isopropyl: Object.freeze({ italic: '', text: 'isopropil' }),
  'tert-butyl': Object.freeze({ italic: 'tert-', text: 'butil' }),
});

/**
 * Common (non-preferred) group names, keyed by the `commonName` id of a
 * substituent structure. Used only in explanations ("también se conoce como
 * vinilo"), never in a name.
 */
export const COMMON_GROUP_NAMES = Object.freeze({
  vinyl: 'vinilo',
  allyl: 'alilo',
  isobutyl: 'isobutilo',
  'sec-butyl': 'sec-butilo',
  isopropyl: 'isopropilo',
  'tert-butyl': 'tert-butilo',
});

/** Enclosing marks for compound prefixes, innermost first: ( ), then [ ], then { } (IUPAC 2013 P-16.5.4). */
export const ENCLOSING_MARKS = Object.freeze([
  Object.freeze(['(', ')']),
  Object.freeze(['[', ']']),
  Object.freeze(['{', '}']),
]);

/** Labels of the prefix styles shown next to the alternative names (design.md §1.1). */
export const STYLE_LABELS = Object.freeze({
  isopropil: 'forma aceptada con isopropil',
  pin: 'nombre preferido por la IUPAC (2013)',
  substituted: 'forma sistemática clásica',
});

/**
 * Returns the ending of one unsaturation segment inside a substituent
 * prefix, where it is always followed by the free-valence locant and `il`,
 * so the final `o` is dropped: `prop-2-en-1-il`, `but-3-in-1-il`.
 *
 * @param {'double'|'triple'} kind - Segment kind.
 * @returns {string} 'en' or 'in'.
 */
export function substituentUnsaturationEnding(kind) {
  return (kind === 'triple' ? ENDINGS.triple : ENDINGS.double).slice(0, -1);
}

/**
 * Returns a retained substituent prefix.
 *
 * @param {string} id - Retained-name id ('isopropyl' or 'tert-butyl').
 * @returns {{italic: string, text: string}} The italic descriptor ('' if none) and the alphabetised text.
 * @throws {Error} For an unknown id.
 */
export function retainedPrefix(id) {
  const entry = RETAINED_PREFIXES[id];
  if (!entry) {
    throw new Error(`retainedPrefix: unknown retained prefix ${id}`);
  }
  return entry;
}

/**
 * Returns the common (non-preferred) name of a group, for explanations only.
 *
 * @param {string} id - The `commonName` id of a substituent structure.
 * @returns {string|null} The Spanish group name (`vinilo`), or null when unknown.
 */
export function commonGroupName(id) {
  return COMMON_GROUP_NAMES[id] || null;
}

/**
 * Returns the label of a prefix style.
 *
 * @param {string} style - 'isopropil', 'pin' or 'substituted'.
 * @returns {string} The Spanish label.
 */
export function styleLabel(style) {
  return STYLE_LABELS[style] || style;
}

/** The Spanish lexicon, as consumed by render.js. */
export const lexiconEs = Object.freeze({
  freeValenceSuffix: FREE_VALENCE_SUFFIX,
  saturatedInfix: SATURATED_INFIX,
  enclosingMarks: ENCLOSING_MARKS,
  substituentUnsaturationEnding,
  retainedPrefix,
  commonGroupName,
  styleLabel,
  language: 'es',
  endings: ENDINGS,
  connectingVowel: CONNECTING_VOWEL,
  segmentOrder: SEGMENT_ORDER,
  stem,
  multiplier,
  compoundMultiplier,
  unsaturationEnding,
  needsConnectingVowel,
  omitsLocants,
  alkylPrefix,
  groupName,
  prefixForm,
});
