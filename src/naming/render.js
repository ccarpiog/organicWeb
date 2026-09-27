/**
 * @file Renders a language-neutral name structure (design.md §4.7) into a
 * name string and its coloured parts, using a lexicon (lexicon.es.js by
 * default). Words come only from the lexicon; this module adds punctuation
 * (`-` between numbers and letters, `,` between numbers) and attaches the
 * atom/bond references to every part. Substituent prefixes are rendered
 * recursively (nested prefixes, unsaturation, free-valence locant, retained
 * prefixes, enclosing marks, bis/tris). The principal characteristic
 * groups (design.md §13.4 I-31: OH; I-32: the C=O of aldehydes and
 * ketones) follow the parent's ending as a suffix with their locants and
 * multiplier (`propan-2-ol`, `butano-1,4-diol`, `pentano-2,4-diona`; an
 * aldehyde's locants are never cited: `propanal`, `butanodial`; nor are a
 * carboxylic acid's, I-33, whose name also starts with the lexicon's class
 * word: `ácido propanoico`, `ácido butanodioico`); the
 * final vowel of the ending is elided before a vowel (`an` + `ol`) and kept
 * before a consonant (`ano` + `diol`), IUPAC 2013 P-16.7.1. No name is ever
 * produced by substring translation.
 */

import { lexiconEs } from './lexicon.es.js';
import { siteLocantText } from './structure.js';

/**
 * Creates one name part.
 *
 * @param {string} text - The text.
 * @param {string} kind - locant|multiplier|prefix|stem|ending|punct.
 * @param {number[]} [atoms] - Referenced atom ids.
 * @param {number[]} [bonds] - Referenced bond ids.
 * @returns {{text: string, kind: string, atoms: number[], bonds: number[]}} The part.
 */
function part(text, kind, atoms = [], bonds = []) {
  return { text, kind, atoms: [...atoms], bonds: [...bonds] };
}

/**
 * Renders the locant list of an unsaturation segment: `1`, `,`, `3`.
 *
 * @param {{locant: number, bond: number, atoms: number[]}[]} sites - The segment's sites (ascending).
 * @returns {object[]} Locant and comma parts.
 */
function locantParts(sites) {
  const parts = [];
  sites.forEach((site, i) => {
    if (i > 0) {
      parts.push(part(',', 'punct'));
    }
    parts.push(part(siteLocantText(site), 'locant', site.atoms, [site.bond]));
  });
  return parts;
}

/**
 * Renders a numbered chain as a parent name: stem + connecting vowel +
 * unsaturation segments with locants + ending + suffix (design.md §4.7).
 *
 * @param {object} chain - The chain structure (structure.js ChainStructure).
 * @param {object} lexicon - The lexicon.
 * @param {boolean} hasPrefixes - Whether prefixes precede the parent or a suffix follows it (disables locant omission).
 * @param {object|null} [suffix] - The suffix groups (structure.js SuffixStructure), or null.
 * @param {boolean} [omitSuffixLocants] - Leave out the suffix locants (`etanol`, `metanol`). An aldehyde or acid suffix on a chain never cites them, whatever this says: its carbon is always a chain end, locant 1 (IUPAC 2013 P-14.3.4.1: `propanal`, `2-metilpropanal`, `butanodial`, `ácido propanoico`).
 * @returns {object[]} The parts.
 */
export function renderParent(chain, lexicon, hasPrefixes, suffix = null, omitSuffixLocants = false) {
  const omitSuffix = omitSuffixLocants || Boolean(suffix && (suffix.kind === 'aldehyde' || suffix.kind === 'acid'));
  return [
    part(lexicon.stem(chain.length), 'stem', chain.atoms),
    ...renderEnding(chain, lexicon, lexicon.omitsLocants(chain, hasPrefixes || Boolean(suffix)), suffix, omitSuffix),
  ];
}

/**
 * The words of a suffix: its multiplier (`di`, `tri`; '' for one group), the
 * suffix itself (`ol`) and whether the parent ending loses its final vowel
 * before them (only before a vowel: `propan-2-ol`, but `butano-1,4-diol`;
 * IUPAC 2013 P-16.7.1). A multiplier's final `a` is elided before a suffix
 * that starts with a vowel (P-16.7.1(c)): `tetr` + `ol`, `pent` + `ol`
 * (`butano-1,2,3,4-tetrol`); `di`, `tri` are unchanged. Only suffix
 * multipliers do this; prefix multipliers keep their `a` (`tetrametil`).
 *
 * @param {{kind: string, locants: object[]}} suffix - The suffix structure.
 * @param {object} lexicon - The lexicon.
 * @returns {{multiplier: string, word: string, elides: boolean}} The pieces.
 */
export function suffixWords(suffix, lexicon) {
  const word = lexicon.groupSuffix(suffix.kind);
  const full = lexicon.multiplier(suffix.locants.length);
  const mult = full.endsWith('a') && /^[aeiou]/.test(word) ? full.slice(0, -1) : full;
  return { multiplier: mult, word, elides: /^[aeiou]/.test(`${mult}${word}`) };
}

/**
 * The atoms and bonds of the suffix groups: each carrying atom and its
 * heteroatom with their bond, plus the OH oxygen of a –COOH and its bond
 * (SuffixLocant `hydroxyAtom`, design.md §13.4 I-33).
 *
 * @param {{locants: object[]}} suffix - The suffix structure.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
export function suffixGroupIds(suffix) {
  const atoms = suffix.locants.flatMap((site) => [site.atom, site.attachAtom, ...(site.hydroxyAtom === undefined ? [] : [site.hydroxyAtom])]);
  const bonds = suffix.locants.flatMap((site) => [site.bond, ...(site.hydroxyBond === undefined ? [] : [site.hydroxyBond])]);
  return { atoms, bonds };
}

/**
 * Renders a suffix after the parent's ending: hyphen, locants and hyphen
 * (unless omitted), multiplier and suffix word: `-2-ol`, `-1,4-diol`, `ol`.
 * Locants refer to the carrying carbon and the OH; the suffix word to every
 * group (both oxygens of a –COOH).
 *
 * @param {{kind: string, locants: object[]}} suffix - The suffix structure.
 * @param {object} lexicon - The lexicon.
 * @param {boolean} omit - Leave out the locants.
 * @returns {object[]} The parts.
 */
function renderSuffix(suffix, lexicon, omit) {
  const parts = [];
  const { atoms, bonds } = suffixGroupIds(suffix);
  if (!omit) {
    parts.push(part('-', 'punct'));
    suffix.locants.forEach((site, i) => {
      if (i > 0) {
        parts.push(part(',', 'punct'));
      }
      parts.push(part(String(site.locant), 'locant', [site.atom, site.attachAtom], [site.bond]));
    });
    parts.push(part('-', 'punct'));
  }
  const { multiplier: mult, word } = suffixWords(suffix, lexicon);
  if (mult) {
    parts.push(part(mult, 'multiplier', atoms, bonds));
  }
  parts.push(part(word, 'ending', atoms, bonds));
  return parts;
} // End of function renderSuffix()

/**
 * Renders what follows the stem of a parent chain or ring: the connecting
 * vowel, the unsaturation segments with their locants (unless omitted) and
 * multipliers, the ending (`ano`; `a-1,3-dieno`; `-3-en-1-ino`) and the
 * suffix groups, before which the ending's final vowel is elided when the
 * suffix starts with a vowel (`an-2-ol`, `-2-en-1-ol`, but `ano-1,2-diol`).
 *
 * @param {object} parent - The chain or ring structure.
 * @param {object} lexicon - The lexicon.
 * @param {boolean} omit - Whether the unsaturation locants are omitted.
 * @param {object|null} [suffix] - The suffix groups (structure.js SuffixStructure), or null.
 * @param {boolean} [omitSuffixLocants] - Whether the suffix locants are omitted.
 * @returns {object[]} The parts.
 */
function renderEnding(parent, lexicon, omit, suffix = null, omitSuffixLocants = false) {
  const segments = lexicon.segmentOrder
    .map((kind) => ({ kind, sites: parent[kind] }))
    .filter((segment) => segment.sites.length > 0);
  const elide = Boolean(suffix) && suffixWords(suffix, lexicon).elides;
  const tail = suffix ? renderSuffix(suffix, lexicon, omitSuffixLocants) : [];
  /**
   * The final ending, without its last vowel when the suffix elides it.
   *
   * @param {string} text - The ending (`ano`, `eno`, `ino`).
   * @returns {string} The written ending.
   */
  const finalEnding = (text) => (elide ? text.slice(0, -1) : text);
  if (segments.length === 0) {
    return [part(finalEnding(lexicon.endings.saturated), 'ending', [], parent.bonds), ...tail];
  }
  const parts = [];
  if (lexicon.needsConnectingVowel(parent)) {
    parts.push(part(lexicon.connectingVowel, 'stem', parent.atoms));
  }
  segments.forEach((segment, i) => {
    const atoms = segment.sites.flatMap((site) => site.atoms);
    const bonds = segment.sites.map((site) => site.bond);
    if (!omit) {
      parts.push(part('-', 'punct'), ...locantParts(segment.sites), part('-', 'punct'));
    }
    const mult = lexicon.multiplier(segment.sites.length);
    if (mult) {
      parts.push(part(mult, 'multiplier', atoms, bonds));
    }
    const last = i === segments.length - 1;
    const ending = lexicon.unsaturationEnding(segment.kind, last);
    parts.push(part(last ? finalEnding(ending) : ending, 'ending', atoms, bonds));
  });
  return [...parts, ...tail];
} // End of function renderEnding()

/**
 * Renders a numbered ring as a parent name (design.md §13.4 I-25, I-26):
 * the nondetachable ring prefix (`ciclo`, which refers to the ring and its
 * closure bond), the stem, then the ending exactly as for a chain —
 * connecting `a`, unsaturation locants and multipliers: `ciclohexano`,
 * `ciclohexeno`, `ciclohexa-1,3-dieno`, `ciclohex-1-eno` (after prefixes).
 * The ring locant-omission rule (lexicon ringOmitsLocants()) decides
 * whether the unsaturation locants are written. A benzene ring (`retained`
 * 'benzene', aromatic.js) is one retained word, `benceno` (IUPAC 2013
 * P-22.1.2), referring to every ring atom and bond; with an OH suffix it is
 * the retained `fenol` (P-63.1.1.1), written as the stem `fen` and the
 * suffix `ol` so that `ol` points at the OH group. The suffix groups (`-ol`)
 * follow the ending: `ciclohexanol`, `ciclohex-2-en-1-ol`.
 *
 * @param {object} ring - The ring structure (structure.js RingStructure).
 * @param {object} lexicon - The lexicon.
 * @param {object[]} prefixes - The prefix groups of the name (they change the omission rule).
 * @param {object|null} [suffix] - The suffix groups (structure.js SuffixStructure), or null.
 * @returns {object[]} The parts.
 */
export function renderRingParent(ring, lexicon, prefixes, suffix = null) {
  const suffixCount = suffix ? suffix.locants.length : 0;
  const omission = lexicon.ringOmitsLocants(ring, prefixes, suffixCount);
  if (ring.retained === 'benzene') {
    if (suffix) {
      const [site] = suffix.locants;
      return [
        part(lexicon.phenolStem, 'stem', ring.atoms, ring.bonds),
        part(lexicon.groupSuffix(suffix.kind), 'ending', [site.atom, site.attachAtom], [site.bond]),
      ];
    }
    return [part(lexicon.benzeneName, 'stem', ring.atoms, ring.bonds)];
  }
  return [
    part(lexicon.ringPrefix, 'stem', ring.atoms, [ring.closure]),
    part(lexicon.stem(ring.length), 'stem', ring.atoms),
    ...renderEnding(ring, lexicon, omission.parent, suffix, omission.prefixes),
  ];
} // End of function renderRingParent()

/**
 * Creates one token of a substituent prefix. Tokens are finer than name
 * parts: they remember whether a piece is an italic descriptor (`tert-`),
 * which alphanumerical ordering ignores.
 *
 * @param {string} text - The text.
 * @param {string} kind - locant|multiplier|prefix|stem|ending|punct|italic.
 * @returns {{text: string, kind: string}} The token.
 */
function token(text, kind) {
  return { text, kind };
}

/**
 * Tells whether a substituent prefix is enclosed in parentheses, i.e.
 * contains its own locants or its own substituents (design.md §4.5):
 * `(propan-2-il)`, `(prop-2-en-1-il)`, `(2-metilpropil)`. Unenclosed:
 * `metil`, `propil`, `etenil`, `etinil`, `metiliden`, `etiliden`,
 * `eteniliden`, `isopropil`, `isopropiliden`, `tert-butil`, the halogen
 * prefixes `fluoro`, `cloro`, `bromo`, `yodo`, `hidroxi` and `oxo`.
 * Enclosure does not decide the multiplier (see isCompoundPrefix()).
 *
 * @param {object} substituent - The substituent structure.
 * @returns {boolean} True when the prefix is enclosed.
 */
export function needsEnclosure(substituent) {
  if (substituent.retained || substituent.halogen || substituent.hydroxy || substituent.oxo) {
    return false;
  }
  const { chain, prefixes, freeValence } = substituent;
  const unsaturated = chain.double.length > 0 || chain.triple.length > 0;
  return prefixes.length > 0 || (unsaturated && chain.length > 2) || (!unsaturated && freeValence.locant > 1);
}

/**
 * Tells whether a substituent prefix is compound (substituted itself:
 * `2-metilpropil`, `1-metiletil`), so identical ones are multiplied with
 * bis/tris. A simple prefix that is enclosed only because of its own
 * locants still takes di/tri: `di(propan-2-il)` (IUPAC 2013 P-16.9).
 *
 * @param {object} substituent - The substituent structure.
 * @returns {boolean} True when the prefix is compound.
 */
export function isCompoundPrefix(substituent) {
  return !substituent.retained && !substituent.halogen && !substituent.hydroxy && !substituent.oxo && substituent.prefixes.length > 0;
}

/**
 * Nesting level of the enclosing marks of a compound prefix: 0 for ( ) when
 * no nested prefix is enclosed, 1 for [ ] around a ( ) prefix, 2 for { }…
 *
 * @param {object} substituent - The substituent structure (compound).
 * @returns {number} The level.
 */
function enclosureLevel(substituent) {
  let level = 0;
  for (const group of substituent.prefixes) {
    if (needsEnclosure(group.substituent)) {
      level = Math.max(level, enclosureLevel(group.substituent) + 1);
    }
  }
  return level;
}

/**
 * Tokens of one prefix group as cited inside a name: locants, hyphen,
 * multiplier (di… for simple prefixes, even enclosed ones — `di(propan-2-il)`;
 * bis… for compound ones — `bis(2-metilpropil)`; a hyphen
 * follows it before an italic descriptor: `di-tert-butil`), enclosing marks
 * and the prefix words.
 *
 * With `omitLocants` (a prefix inside a one-carbon group, which has a
 * single position: `(clorometil)`, `(triclorometil)`, IUPAC 2013
 * P-14.3.4.2(a)) the locants and their hyphen are left out.
 *
 * @param {object} group - The prefix group (structure.js PrefixGroup).
 * @param {object} lexicon - The lexicon.
 * @param {boolean} [omitLocants] - Leave out the locants (default false).
 * @returns {{text: string, kind: string}[]} The tokens.
 */
function groupTokens(group, lexicon, omitLocants = false) {
  const tokens = [];
  if (!omitLocants) {
    group.locants.forEach((site, i) => {
      if (i > 0) {
        tokens.push(token(',', 'punct'));
      }
      tokens.push(token(String(site.locant), 'locant'));
    });
    tokens.push(token('-', 'punct'));
  }
  const words = substituentTokens(group.substituent, lexicon);
  const enclosed = needsEnclosure(group.substituent);
  const count = group.locants.length;
  const mult = isCompoundPrefix(group.substituent) ? lexicon.compoundMultiplier(count) : lexicon.multiplier(count);
  if (mult) {
    tokens.push(token(mult, 'multiplier'));
    if (words[0].kind === 'italic') {
      tokens.push(token('-', 'punct'));
    }
  }
  if (enclosed) {
    const [open, close] = lexicon.enclosingMarks[enclosureLevel(group.substituent) % lexicon.enclosingMarks.length];
    tokens.push(token(open, 'punct'), ...words, token(close, 'punct'));
  } else {
    tokens.push(...words);
  }
  return tokens;
} // End of function groupTokens()

/**
 * Tokens of a locant list followed by a hyphen: `1`, `,`, `3`, `-`.
 *
 * @param {number[]} locants - Ascending locants.
 * @returns {{text: string, kind: string}[]} The tokens.
 */
function locantTokens(locants) {
  const tokens = [];
  locants.forEach((locant, i) => {
    if (i > 0) {
      tokens.push(token(',', 'punct'));
    }
    tokens.push(token(String(locant), 'locant'));
  });
  tokens.push(token('-', 'punct'));
  return tokens;
}

/**
 * Tokens of a substituent prefix as cited inside a name, without its
 * enclosing marks and grouping multiplier (design.md §4.5): nested prefixes,
 * stem, unsaturation segments and the free valence (`il` for a single
 * attachment bond, `iliden` for a double one) — `propil`, `propan-2-il`,
 * `2-metilprop-1-en-1-il`, `etenil`, `buta-1,3-dien-1-il`, `metiliden`,
 * `propan-2-iliden`, `eteniliden` — or a retained prefix (`isopropil`,
 * `isopropiliden`, `tert-butil`, `fenil`), or a halogen prefix (`cloro`,
 * design.md §13.4 I-30), or `hidroxi` (an OH not cited as the suffix, I-31), or `oxo` (a C=O not cited as the suffix, I-32). A saturated group with the free valence at
 * locant 1 uses the short form (`propil`, `propiliden`, `2-metilpropil`);
 * one- and two-carbon groups cite no locant.
 *
 * @param {object} substituent - The substituent structure (structure.js SubstituentStructure).
 * @param {object} lexicon - The lexicon.
 * @returns {{text: string, kind: string}[]} The tokens.
 */
function substituentTokens(substituent, lexicon) {
  if (substituent.halogen) {
    return [token(lexicon.halogenPrefix(substituent.halogen), 'prefix')];
  }
  if (substituent.hydroxy) {
    return [token(lexicon.groupPrefix('alcohol'), 'prefix')];
  }
  if (substituent.oxo) {
    return [token(lexicon.groupPrefix('ketone'), 'prefix')];
  }
  if (substituent.retained) {
    const { italic, text } = lexicon.retainedPrefix(substituent.retained);
    return italic ? [token(italic, 'italic'), token(text, 'prefix')] : [token(text, 'prefix')];
  }
  const { chain, prefixes, freeValence } = substituent;
  const tokens = [];
  // A one-carbon group cites no locants, so its prefixes run together
  // (`bromoclorometil`), as in renderPrefixes.
  const omitLocants = chain.length === 1;
  prefixes.forEach((group, g) => {
    if (g > 0 && !omitLocants) {
      tokens.push(token('-', 'punct'));
    }
    tokens.push(...groupTokens(group, lexicon, omitLocants));
  });
  tokens.push(token(lexicon.stem(chain.length), 'stem'));
  const segments = lexicon.segmentOrder
    .map((kind) => ({ kind, sites: chain[kind] }))
    .filter((segment) => segment.sites.length > 0);
  const suffix = token(lexicon.freeValenceSuffix(freeValence.order), 'ending');
  if (segments.length === 0) {
    if (freeValence.locant === 1) {
      tokens.push(suffix);
    } else {
      tokens.push(token(lexicon.saturatedInfix, 'ending'), token('-', 'punct'), ...locantTokens([freeValence.locant]), suffix);
    }
    return tokens;
  }
  if (chain.length <= 2) {
    tokens.push(token(lexicon.substituentUnsaturationEnding(segments[0].kind), 'ending'), suffix);
    return tokens;
  }
  if (lexicon.needsConnectingVowel(chain)) {
    tokens.push(token(lexicon.connectingVowel, 'stem'));
  }
  for (const segment of segments) {
    tokens.push(token('-', 'punct'), ...locantTokens(segment.sites.map(siteLocantText)));
    const mult = lexicon.multiplier(segment.sites.length);
    if (mult) {
      tokens.push(token(mult, 'multiplier'));
    }
    tokens.push(token(lexicon.substituentUnsaturationEnding(segment.kind), 'ending'));
  }
  tokens.push(token('-', 'punct'), ...locantTokens([freeValence.locant]), suffix);
  return tokens;
} // End of function substituentTokens()

/**
 * Returns the words of a substituent prefix as cited inside a name, without
 * attachment locants, grouping multiplier or enclosing marks: `metil`,
 * `propan-2-il`, `2-metilprop-1-en-1-il`, `isopropil`, `tert-butil`.
 *
 * @param {object} substituent - The substituent structure (structure.js SubstituentStructure).
 * @param {object} [lexicon] - The lexicon (default: Spanish).
 * @returns {string} The prefix words.
 */
export function substituentPrefix(substituent, lexicon = lexiconEs) {
  return substituentTokens(substituent, lexicon).map((t) => t.text).join('');
}

/**
 * Builds the alphanumerical citation key of a substituent (design.md §1.1):
 * the letters of its complete prefix name, lower-case (locants,
 * punctuation and italic descriptors such as `tert-` left out; multipliers
 * inside a compound prefix kept — `(2,2-dimetilpropil)` sorts under d;
 * external multipliers are never part of it), its locants in order of
 * citation (compared numerically when the letters tie), and its italic
 * descriptors. Compared with numbering.js compareCitationKeys.
 *
 * @param {object} substituent - The substituent structure.
 * @param {object} [lexicon] - The lexicon (default: Spanish).
 * @returns {{alpha: string, numeric: number[], italic: string}} The citation key.
 */
export function citationKey(substituent, lexicon = lexiconEs) {
  const tokens = substituentTokens(substituent, lexicon);
  const letters = tokens.filter((t) => t.kind !== 'italic' && t.kind !== 'locant').map((t) => t.text).join('');
  return {
    alpha: letters.toLowerCase().replace(/[^a-z]/g, ''),
    numeric: tokens.filter((t) => t.kind === 'locant').map((t) => Number(t.text)),
    italic: tokens.filter((t) => t.kind === 'italic').map((t) => t.text).join(''),
  };
}

/**
 * Builds the complete-name key of a list of prefix groups (N5, IUPAC 2013
 * P-45.5): every letter of the prefix part of the name as cited —
 * multiplying prefixes (di, bis…) and nested prefixes included, italic
 * descriptors left out — and then every locant in order of citation. All
 * letters are compared before any locant (numbering.js
 * compareCitationKeys).
 *
 * @param {{substituent: object, locants: {locant: number}[]}[]} groups - Prefix groups in citation order.
 * @param {object} [lexicon] - The lexicon (default: Spanish).
 * @returns {{alpha: string, numeric: number[], italic: string}} The key.
 */
export function prefixNameKey(groups, lexicon = lexiconEs) {
  const tokens = groups.flatMap((group) => groupTokens(group, lexicon));
  const letters = tokens.filter((t) => t.kind !== 'italic' && t.kind !== 'locant').map((t) => t.text).join('');
  return {
    alpha: letters.toLowerCase().replace(/[^a-z]/g, ''),
    numeric: tokens.filter((t) => t.kind === 'locant').map((t) => Number(t.text)),
    italic: tokens.filter((t) => t.kind === 'italic').map((t) => t.text).join(''),
  };
}

/**
 * Renders the grouped substituent prefixes, in citation order:
 * `3-etil-2,2-dimetil`, `4-metil-6-(propan-2-il)` (numbers separated by
 * commas, numbers and letters by hyphens, prefixes with their own locants
 * enclosed, compound prefixes multiplied with bis/tris). Each group's prefix words form one `prefix`
 * part; nested prefixes are not split further.
 *
 * With `omitLocants` (a ring with a single substituent, lexicon
 * ringOmitsLocants(); a one- or two-carbon chain or a fully halogenated
 * parent, lexicon chainOmitsPrefixLocants()) the attachment locants and
 * their hyphen are left out: `metil` in `metilciclohexano`, `tricloro` in
 * `triclorometano`.
 *
 * @param {object[]} groups - The prefix groups (structure.js PrefixGroup), in citation order.
 * @param {object} lexicon - The lexicon.
 * @param {boolean} [omitLocants] - Leave out the attachment locants (default false).
 * @returns {object[]} The parts.
 */
export function renderPrefixes(groups, lexicon, omitLocants = false) {
  const parts = [];
  groups.forEach((group, g) => {
    if (g > 0 && !omitLocants) {
      // Without locants, consecutive prefixes are written together: `clorotrifluorometano`.
      parts.push(part('-', 'punct'));
    }
    const atoms = group.locants.flatMap((site) => site.atoms);
    const bonds = group.locants.flatMap((site) => [site.bond, ...site.bonds]);
    const tokens = groupTokens(group, lexicon);
    let i = 0;
    for (const site of group.locants) {
      if (i > 0) {
        if (!omitLocants) {
          parts.push(part(',', 'punct'));
        }
        i += 1;
      }
      if (!omitLocants) {
        parts.push(part(tokens[i].text, 'locant', [site.atom, site.attachAtom], [site.bond]));
      }
      i += 1;
    }
    if (omitLocants) {
      i += 1; // Skip the hyphen after the omitted locants.
    }
    // Remaining tokens: hyphen, multiplier, enclosing marks and the prefix words (one part).
    let words = '';
    for (const t of tokens.slice(i)) {
      if (t.kind === 'punct' && words === '') {
        parts.push(part(t.text, 'punct'));
      } else if (t.kind === 'multiplier' && words === '') {
        parts.push(part(t.text, 'multiplier', atoms, bonds));
      } else {
        words += t.text;
      }
    }
    const close = needsEnclosure(group.substituent) ? words.slice(-1) : '';
    parts.push(part(close ? words.slice(0, -1) : words, 'prefix', atoms, bonds));
    if (close) {
      parts.push(part(close, 'punct'));
    }
  }); // End of the loop over the prefix groups
  return parts;
} // End of function renderPrefixes()

/**
 * Number of suffix groups of a name structure (one per OH; 0 without suffix).
 *
 * @param {{suffix?: {locants: object[]}|null}} structure - The name structure.
 * @returns {number} The count.
 */
export function suffixCount(structure) {
  return structure.suffix ? structure.suffix.locants.length : 0;
}

/**
 * Tells whether the attachment locants of a name's prefixes — and the
 * locants of its suffix groups, which follow the same rule — are omitted:
 * ring rule (lexicon ringOmitsLocants()) for a ring parent, chain rule
 * (lexicon chainOmitsPrefixLocants(): `clorometano`, `cloroetano`,
 * `hexacloroetano`, `etanol`, `metanodiol`, `propanona`) for a chain.
 *
 * @param {object} structure - The name structure (structure.js NameStructure).
 * @param {object} [lexicon] - The lexicon (default: Spanish; both share the rules).
 * @returns {boolean} True when no prefix or suffix locant is written.
 */
export function omitsPrefixLocants(structure, lexicon = lexiconEs) {
  const count = suffixCount(structure);
  return structure.parentKind === 'ring'
    ? lexicon.ringOmitsLocants(structure.parent, structure.prefixes, count).prefixes
    : lexicon.chainOmitsPrefixLocants(structure.parent, structure.prefixes, count, structure.suffix ? structure.suffix.kind : null);
}

/**
 * Renders a name structure to text and coloured parts (a chain parent, or
 * a ring parent when `parentKind` is 'ring'), with its suffix groups.
 * With `citeLocants` (a chain parent only) the prefix and suffix locants are
 * written even where the omission rule would leave them out: `propan-2-ona`,
 * the IUPAC 2013 form of `propanona` (design.md §13.4 I-32). A suffix
 * kind with a class word (lexicon suffixClassWord(): `ácido`, I-33) starts
 * the name with that word and a space, referring to the suffix groups.
 *
 * @param {object} structure - The name structure (structure.js NameStructure).
 * @param {object} [lexicon] - The lexicon to use (default: Spanish).
 * @param {{citeLocants?: boolean}} [options] - Rendering options.
 * @returns {{name: string, parts: object[]}} The rendered name and its parts.
 */
export function renderName(structure, lexicon = lexiconEs, options = {}) {
  const hasPrefixes = structure.prefixes.length > 0;
  const ring = structure.parentKind === 'ring';
  const suffix = structure.suffix || null;
  const omitPrefixLocants = !(options.citeLocants && !ring) && omitsPrefixLocants(structure, lexicon);
  const parent = ring
    ? renderRingParent(structure.parent, lexicon, structure.prefixes, suffix)
    : renderParent(structure.parent, lexicon, hasPrefixes, suffix, omitPrefixLocants);
  const classWord = suffix && lexicon.suffixClassWord ? lexicon.suffixClassWord(suffix.kind) : null;
  const lead = [];
  if (classWord) {
    const { atoms, bonds } = suffixGroupIds(suffix);
    lead.push(part(classWord, 'ending', atoms, bonds), part(' ', 'punct'));
  }
  const parts = [...lead, ...renderPrefixes(structure.prefixes, lexicon, omitPrefixLocants), ...parent];
  return { name: parts.map((p) => p.text).join(''), parts };
}
