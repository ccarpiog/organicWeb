/**
 * @file English word tables for IUPAC 2013 names, used only by the OPSIN
 * oracle (design.md §8): OPSIN reads English names, so the oracle renders
 * the same language-neutral name structure with this lexicon instead of
 * lexicon.es.js. It is never imported by the app (src/ui/), so English never
 * reaches the Spanish UI.
 *
 * The exported `lexiconEn` object has the same members as `lexiconEs`
 * (the interface render.js expects). Numerical terms (multipliers, the
 * connecting `a`, the locant-omission table) are language-independent and
 * are shared with the Spanish lexicon; only words differ: `meth`/`eth`
 * stems, `-ane`/`-ene`/`-yne` endings, `-yl`/`-ylidene` free valences and
 * the retained `isopropyl`, `isopropylidene`, `tert-butyl`, `phenyl`
 * prefixes, `benzene` and the traditional `toluene` and `styrene`, and the
 * characteristic-group suffixes and prefixes (`-oic acid`, `-ol`, `hydroxy`,
 * `chloro`…, design.md §13.6).
 */

import {
  MAX_STEM,
  CONNECTING_VOWEL,
  SEGMENT_ORDER,
  ENCLOSING_MARKS,
  multiplier,
  compoundMultiplier,
  needsConnectingVowel,
  omitsLocants,
  ringOmitsLocants,
} from './lexicon.es.js';

/** Chain stems indexed by carbon count (index 0 unused). */
const STEMS = Object.freeze([
  null, 'meth', 'eth', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec',
  'undec', 'dodec', 'tridec', 'tetradec', 'pentadec', 'hexadec', 'heptadec', 'octadec', 'nonadec', 'icos',
  'henicos', 'docos', 'tricos', 'tetracos', 'pentacos', 'hexacos', 'heptacos', 'octacos', 'nonacos', 'triacont',
]);

/**
 * Nondetachable prefix of a ring parent: `cyclo` + chain stem + ending
 * (cyclohexane; IUPAC 2013 P-22.1.1: the nondetachable prefix cyclo + the name of the unbranched saturated chain with as many carbons).
 */
export const RING_PREFIX = 'cyclo';

/** Retained name of the benzene ring as a parent (IUPAC 2013 P-22.1.2). */
export const BENZENE_NAME = 'benzene';

/** Traditional names of monosubstituted benzenes retained by IUPAC 2013 (P-22.1.3; see lexicon.es.js). */
export const TRADITIONAL_NAMES = Object.freeze({ toluene: 'toluene', styrene: 'styrene' });

/** Endings of the parent name. */
export const ENDINGS = Object.freeze({ saturated: 'ane', double: 'ene', triple: 'yne' });

/** Suffixes of a substituent prefix by the order of its attachment bond (IUPAC 2013 P-29.2). */
export const FREE_VALENCE_SUFFIXES = Object.freeze({ 1: 'yl', 2: 'ylidene' });

/** Infix between the stem and a cited free-valence locant of a saturated group (`propan-2-yl`). */
export const SATURATED_INFIX = 'an';

/** Retained substituent prefixes, keyed by the retained-name id stored in the structure. */
export const RETAINED_PREFIXES = Object.freeze({
  isopropyl: Object.freeze({ italic: '', text: 'isopropyl' }),
  isopropylidene: Object.freeze({ italic: '', text: 'isopropylidene' }),
  'tert-butyl': Object.freeze({ italic: 'tert-', text: 'butyl' }),
  phenyl: Object.freeze({ italic: '', text: 'phenyl' }),
});

/** Common (non-preferred) group names, keyed by the `commonName` id of a substituent structure. */
export const COMMON_GROUP_NAMES = Object.freeze({
  vinyl: 'vinyl',
  allyl: 'allyl',
  isobutyl: 'isobutyl',
  'sec-butyl': 'sec-butyl',
  isopropyl: 'isopropyl',
  'tert-butyl': 'tert-butyl',
  vinylidene: 'vinylidene',
  allylidene: 'allylidene',
  isobutylidene: 'isobutylidene',
  'sec-butylidene': 'sec-butylidene',
  isopropylidene: 'isopropylidene',
});

/** Labels of the prefix styles (English, developer-facing only). */
export const STYLE_LABELS = Object.freeze({
  isopropil: 'accepted name with isopropyl',
  pin: 'IUPAC 2013 preferred name',
  substituted: 'classic substitutive name',
});

/**
 * Returns the English stem for a chain of the given length.
 *
 * @param {number} length - Number of carbon atoms (1–30).
 * @returns {string} The stem, e.g. 'meth' for 1, 'but' for 4.
 * @throws {RangeError} When the length is out of range.
 */
export function stem(length) {
  if (!Number.isInteger(length) || length < 1 || length > MAX_STEM) {
    throw new RangeError(`stem: count must be an integer from 1 to ${MAX_STEM}, got ${length}`);
  }
  return STEMS[length];
}

/**
 * Returns the ending of one unsaturation segment. The non-final `ene`
 * loses its `e` before `yne` (`hexa-1,3-dien-5-yne`).
 *
 * @param {'double'|'triple'} kind - Segment kind.
 * @param {boolean} isFinal - Whether the segment ends the name.
 * @returns {string} 'ene', 'en' or 'yne'.
 */
export function unsaturationEnding(kind, isFinal) {
  if (kind === 'triple') {
    return ENDINGS.triple;
  }
  return isFinal ? ENDINGS.double : ENDINGS.double.slice(0, -1);
}

/**
 * Returns the ending of one unsaturation segment inside a substituent
 * prefix, where it is always followed by a locant or the free-valence
 * suffix, so the final `e` is dropped: `prop-2-en-1-yl`, `ethynyl`.
 *
 * @param {'double'|'triple'} kind - Segment kind.
 * @returns {string} 'en' or 'yn'.
 */
export function substituentUnsaturationEnding(kind) {
  return (kind === 'triple' ? ENDINGS.triple : ENDINGS.double).slice(0, -1);
}

/**
 * Returns the suffix of a substituent prefix for its attachment bond order.
 *
 * @param {number} order - Attachment bond order: 1 or 2.
 * @returns {string} 'yl' or 'ylidene'.
 * @throws {RangeError} For any other order.
 */
export function freeValenceSuffix(order) {
  const suffix = FREE_VALENCE_SUFFIXES[order];
  if (!suffix) {
    throw new RangeError(`freeValenceSuffix: unsupported attachment order ${order}`);
  }
  return suffix;
}

/**
 * Returns the prefix form of an unbranched saturated alkyl group attached by
 * its end: `methyl`, `ethyl`, `propyl`… (`-ylidene` for a double attachment).
 *
 * @param {number} length - Number of carbon atoms (1–30).
 * @param {number} [order] - Attachment bond order: 1 (default) or 2.
 * @returns {string} The prefix, e.g. 'methyl', 'methylidene'.
 */
export function alkylPrefix(length, order = 1) {
  return `${stem(length)}${freeValenceSuffix(order)}`;
}

/**
 * Returns the standalone group name. English group names and prefixes
 * coincide (`methyl`), unlike Spanish (`metilo` / `metil`).
 *
 * @param {string} prefix - The prefix form.
 * @returns {string} The group name.
 */
export function groupName(prefix) {
  return prefix;
}

/**
 * Returns the prefix form of a standalone group name (identical in English).
 *
 * @param {string} name - The group name.
 * @returns {string} The prefix form.
 */
export function prefixForm(name) {
  return name;
}

/**
 * Returns a retained substituent prefix.
 *
 * @param {string} id - Retained-name id ('isopropyl', 'isopropylidene', 'tert-butyl' or 'phenyl').
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
 * Returns the common (non-preferred) name of a group.
 *
 * @param {string} id - The `commonName` id of a substituent structure.
 * @returns {string|null} The English group name, or null when unknown.
 */
export function commonGroupName(id) {
  return COMMON_GROUP_NAMES[id] || null;
}

/**
 * Returns the label of a prefix style.
 *
 * @param {string} style - 'isopropil', 'pin' or 'substituted'.
 * @returns {string} The English label.
 */
export function styleLabel(style) {
  return STYLE_LABELS[style] || style;
}

/**
 * Returns a traditional name of a monosubstituted benzene.
 *
 * @param {string} id - 'toluene' or 'styrene'.
 * @returns {string} The English name.
 * @throws {Error} For an unknown id.
 */
export function traditionalName(id) {
  const name = TRADITIONAL_NAMES[id];
  if (!name) {
    throw new Error(`traditionalName: unknown traditional name ${id}`);
  }
  return name;
}

/**
 * Returns the label of a traditional name (English, developer-facing only).
 *
 * @param {string} id - 'toluene' or 'styrene'.
 * @returns {string} The label.
 */
export function traditionalLabel(id) {
  return id === 'toluene' ? 'traditional name, IUPAC 2013 preferred' : 'traditional name';
}

/** Suffixes of the characteristic groups (see lexicon.es.js GROUP_SUFFIXES): `ethanoic acid`, `methyl ethanoate`… */
export const GROUP_SUFFIXES = Object.freeze({
  acid: 'oic acid', ester: 'oate', amide: 'amide', nitrile: 'nitrile', aldehyde: 'al', ketone: 'one', alcohol: 'ol', amine: 'amine',
});

/** Prefixes of the characteristic groups when not principal (see lexicon.es.js GROUP_PREFIXES). */
export const GROUP_PREFIXES = Object.freeze({
  acid: 'carboxy', ester: 'alkoxycarbonyl', amide: 'carbamoyl', nitrile: 'cyano', aldehyde: 'oxo', ketone: 'oxo',
  alcohol: 'hydroxy', amine: 'amino', ether: 'alkoxy',
});

/** Prefix of an aldehyde whose carbon is outside the parent. */
export const FORMYL_PREFIX = 'formyl';

/** Halogen prefixes (never a suffix). */
export const HALOGEN_PREFIXES = Object.freeze({ F: 'fluoro', Cl: 'chloro', Br: 'bromo', I: 'iodo' });

/** Family names of the characteristic groups (English, developer-facing only). */
export const GROUP_FAMILY_NAMES = Object.freeze({
  acid: 'carboxylic acid',
  ester: 'ester',
  amide: 'amide',
  nitrile: 'nitrile',
  aldehyde: 'aldehyde',
  ketone: 'ketone',
  alcohol: 'alcohol',
  phenol: 'phenol',
  amine: 'amine',
  ether: 'ether',
  halide: 'halide',
  unsupported: 'unknown group',
});

/**
 * Returns the suffix of a characteristic group kind, or null for a kind that
 * is never a suffix (ether, halide).
 *
 * @param {string} kind - A group kind (groups.js GROUP_KINDS).
 * @returns {string|null} The suffix, e.g. 'ol'.
 */
export function groupSuffix(kind) {
  return Object.prototype.hasOwnProperty.call(GROUP_SUFFIXES, kind) ? GROUP_SUFFIXES[kind] : null;
}

/**
 * Prefixes of an ester or amide bonded to the parent through its O or N
 * (the acyl part hangs from the heteroatom: acetyloxy-, acetylamino-; IUPAC 2013 P-65.6.3 esters,
 * P-66.1 amides). Bonded through the carbonyl carbon they take GROUP_PREFIXES.
 */
export const HETEROATOM_BOUND_PREFIXES = Object.freeze({ ester: 'acyloxy', amide: 'acylamino' });

/**
 * Returns the prefix of a characteristic group (halides by element), or null
 * for an unsupported group. An ester or amide takes its heteroatom-bound
 * form when `attachment` is 'heteroatom' (the parent side is on its O or N),
 * else its carbonyl-bound form (GROUP_PREFIXES).
 *
 * @param {string} kind - A group kind (groups.js GROUP_KINDS).
 * @param {string} [element] - Halogen symbol, for kind 'halide'.
 * @param {'carbonyl'|'heteroatom'|null} [attachment] - Which end of an ester or amide faces the parent.
 * @returns {string|null} The prefix.
 */
export function groupPrefix(kind, element, attachment = null) {
  if (kind === 'halide') {
    return HALOGEN_PREFIXES[element] || null;
  }
  if (attachment === 'heteroatom' && Object.prototype.hasOwnProperty.call(HETEROATOM_BOUND_PREFIXES, kind)) {
    return HETEROATOM_BOUND_PREFIXES[kind];
  }
  return Object.prototype.hasOwnProperty.call(GROUP_PREFIXES, kind) ? GROUP_PREFIXES[kind] : null;
}

/**
 * Returns the family name of a characteristic group kind.
 *
 * @param {string} kind - A group kind, or 'phenol'.
 * @returns {string} The family name, e.g. 'alcohol'.
 */
export function groupFamilyName(kind) {
  return GROUP_FAMILY_NAMES[kind] || kind;
}

/** The English lexicon, as consumed by render.js (same members as lexiconEs). */
export const lexiconEn = Object.freeze({
  freeValenceSuffix,
  saturatedInfix: SATURATED_INFIX,
  enclosingMarks: ENCLOSING_MARKS,
  substituentUnsaturationEnding,
  retainedPrefix,
  commonGroupName,
  styleLabel,
  language: 'en',
  endings: ENDINGS,
  connectingVowel: CONNECTING_VOWEL,
  segmentOrder: SEGMENT_ORDER,
  stem,
  multiplier,
  compoundMultiplier,
  unsaturationEnding,
  needsConnectingVowel,
  omitsLocants,
  ringOmitsLocants,
  alkylPrefix,
  groupName,
  prefixForm,
  ringPrefix: RING_PREFIX,
  benzeneName: BENZENE_NAME,
  traditionalName,
  traditionalLabel,
  groupSuffix,
  groupPrefix,
  groupFamilyName,
  formylPrefix: FORMYL_PREFIX,
});
