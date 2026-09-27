/**
 * @file Renders a language-neutral name structure (design.md §4.7) into a
 * name string and its coloured parts, using a lexicon (lexicon.es.js by
 * default). Words come only from the lexicon; this module adds punctuation
 * (`-` between numbers and letters, `,` between numbers) and attaches the
 * atom/bond references to every part. Substituent prefixes are rendered
 * recursively (nested prefixes, unsaturation, free-valence locant, retained
 * prefixes, enclosing marks, bis/tris). No name is ever produced by
 * substring translation.
 */

import { lexiconEs } from './lexicon.es.js';

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
    parts.push(part(String(site.locant), 'locant', site.atoms, [site.bond]));
  });
  return parts;
}

/**
 * Renders a numbered chain as a parent name: stem + connecting vowel +
 * unsaturation segments with locants + ending (design.md §4.7).
 *
 * @param {object} chain - The chain structure (structure.js ChainStructure).
 * @param {object} lexicon - The lexicon.
 * @param {boolean} hasPrefixes - Whether prefixes precede the parent (disables locant omission).
 * @returns {object[]} The parts.
 */
export function renderParent(chain, lexicon, hasPrefixes) {
  return [
    part(lexicon.stem(chain.length), 'stem', chain.atoms),
    ...renderEnding(chain, lexicon, lexicon.omitsLocants(chain, hasPrefixes)),
  ];
}

/**
 * Renders what follows the stem of a parent chain or ring: the connecting
 * vowel, the unsaturation segments with their locants (unless omitted) and
 * multipliers, and the ending (`ano`; `a-1,3-dieno`; `-3-en-1-ino`).
 *
 * @param {object} parent - The chain or ring structure.
 * @param {object} lexicon - The lexicon.
 * @param {boolean} omit - Whether the unsaturation locants are omitted.
 * @returns {object[]} The parts.
 */
function renderEnding(parent, lexicon, omit) {
  const segments = lexicon.segmentOrder
    .map((kind) => ({ kind, sites: parent[kind] }))
    .filter((segment) => segment.sites.length > 0);
  if (segments.length === 0) {
    return [part(lexicon.endings.saturated, 'ending', [], parent.bonds)];
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
    parts.push(part(lexicon.unsaturationEnding(segment.kind, i === segments.length - 1), 'ending', atoms, bonds));
  });
  return parts;
} // End of function renderEnding()

/**
 * Renders a numbered ring as a parent name (design.md §13.4 I-25, I-26):
 * the nondetachable ring prefix (`ciclo`, which refers to the ring and its
 * closure bond), the stem, then the ending exactly as for a chain —
 * connecting `a`, unsaturation locants and multipliers: `ciclohexano`,
 * `ciclohexeno`, `ciclohexa-1,3-dieno`, `ciclohex-1-eno` (after prefixes).
 * The ring locant-omission rule (lexicon ringOmitsLocants()) decides
 * whether the unsaturation locants are written.
 *
 * @param {object} ring - The ring structure (structure.js RingStructure).
 * @param {object} lexicon - The lexicon.
 * @param {object[]} prefixes - The prefix groups of the name (they change the omission rule).
 * @returns {object[]} The parts.
 */
export function renderRingParent(ring, lexicon, prefixes) {
  return [
    part(lexicon.ringPrefix, 'stem', ring.atoms, [ring.closure]),
    part(lexicon.stem(ring.length), 'stem', ring.atoms),
    ...renderEnding(ring, lexicon, lexicon.ringOmitsLocants(ring, prefixes).parent),
  ];
}

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
 * `eteniliden`, `isopropil`, `isopropiliden`, `tert-butil`.
 * Enclosure does not decide the multiplier (see isCompoundPrefix()).
 *
 * @param {object} substituent - The substituent structure.
 * @returns {boolean} True when the prefix is enclosed.
 */
export function needsEnclosure(substituent) {
  if (substituent.retained) {
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
  return !substituent.retained && substituent.prefixes.length > 0;
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
 * @param {object} group - The prefix group (structure.js PrefixGroup).
 * @param {object} lexicon - The lexicon.
 * @returns {{text: string, kind: string}[]} The tokens.
 */
function groupTokens(group, lexicon) {
  const tokens = [];
  group.locants.forEach((site, i) => {
    if (i > 0) {
      tokens.push(token(',', 'punct'));
    }
    tokens.push(token(String(site.locant), 'locant'));
  });
  tokens.push(token('-', 'punct'));
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
 * `isopropiliden`, `tert-butil`). A saturated group with the free valence at
 * locant 1 uses the short form (`propil`, `propiliden`, `2-metilpropil`);
 * one- and two-carbon groups cite no locant.
 *
 * @param {object} substituent - The substituent structure (structure.js SubstituentStructure).
 * @param {object} lexicon - The lexicon.
 * @returns {{text: string, kind: string}[]} The tokens.
 */
function substituentTokens(substituent, lexicon) {
  if (substituent.retained) {
    const { italic, text } = lexicon.retainedPrefix(substituent.retained);
    return italic ? [token(italic, 'italic'), token(text, 'prefix')] : [token(text, 'prefix')];
  }
  const { chain, prefixes, freeValence } = substituent;
  const tokens = [];
  prefixes.forEach((group, g) => {
    if (g > 0) {
      tokens.push(token('-', 'punct'));
    }
    tokens.push(...groupTokens(group, lexicon));
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
    tokens.push(token('-', 'punct'), ...locantTokens(segment.sites.map((site) => site.locant)));
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
 * ringOmitsLocants()) the attachment locants and their hyphen are left out:
 * `metil` in `metilciclohexano`.
 *
 * @param {object[]} groups - The prefix groups (structure.js PrefixGroup), in citation order.
 * @param {object} lexicon - The lexicon.
 * @param {boolean} [omitLocants] - Leave out the attachment locants (default false).
 * @returns {object[]} The parts.
 */
export function renderPrefixes(groups, lexicon, omitLocants = false) {
  const parts = [];
  groups.forEach((group, g) => {
    if (g > 0) {
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
 * Renders a name structure to text and coloured parts (a chain parent, or
 * a ring parent when `parentKind` is 'ring').
 *
 * @param {object} structure - The name structure (structure.js NameStructure).
 * @param {object} [lexicon] - The lexicon to use (default: Spanish).
 * @returns {{name: string, parts: object[]}} The rendered name and its parts.
 */
export function renderName(structure, lexicon = lexiconEs) {
  const hasPrefixes = structure.prefixes.length > 0;
  const ring = structure.parentKind === 'ring';
  const parent = ring
    ? renderRingParent(structure.parent, lexicon, structure.prefixes)
    : renderParent(structure.parent, lexicon, hasPrefixes);
  const omitPrefixLocants = ring && lexicon.ringOmitsLocants(structure.parent, structure.prefixes).prefixes;
  const parts = [...renderPrefixes(structure.prefixes, lexicon, omitPrefixLocants), ...parent];
  return { name: parts.map((p) => p.text).join(''), parts };
}
