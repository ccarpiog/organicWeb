/**
 * @file Renders a language-neutral name structure (design.md §4.7) into a
 * name string and its coloured parts, using a lexicon (lexicon.es.js by
 * default). Words come only from the lexicon; this module adds punctuation
 * (`-` between numbers and letters, `,` between numbers) and attaches the
 * atom/bond references to every part. No name is ever produced by
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
  const parts = [part(lexicon.stem(chain.length), 'stem', chain.atoms)];
  const segments = lexicon.segmentOrder
    .map((kind) => ({ kind, sites: chain[kind] }))
    .filter((segment) => segment.sites.length > 0);
  if (segments.length === 0) {
    parts.push(part(lexicon.endings.saturated, 'ending', [], chain.bonds));
    return parts;
  }
  if (lexicon.needsConnectingVowel(chain)) {
    parts.push(part(lexicon.connectingVowel, 'stem', chain.atoms));
  }
  const omit = lexicon.omitsLocants(chain, hasPrefixes);
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
} // End of function renderParent()

/**
 * Returns the words of a substituent prefix as cited inside a name (no
 * locants, no grouping multiplier): `metil`, `etil`, `propil`…
 * Phase I-4 supports saturated unbranched chains attached at their end;
 * phase 050 adds nested prefixes, unsaturation, retained names and
 * parentheses.
 *
 * @param {object} substituent - The substituent structure (structure.js SubstituentStructure).
 * @param {object} [lexicon] - The lexicon (default: Spanish).
 * @returns {string} The prefix words.
 * @throws {Error} For a substituent kind not rendered yet.
 */
export function substituentPrefix(substituent, lexicon = lexiconEs) {
  const { chain, prefixes, freeValence, retained } = substituent;
  const simple = prefixes.length === 0 && !retained && chain.double.length === 0 && chain.triple.length === 0
    && freeValence.locant === 1 && freeValence.order === 1;
  if (!simple) {
    throw new Error('substituentPrefix: only saturated unbranched end-attached groups are rendered yet (phase 050)');
  }
  return lexicon.alkylPrefix(chain.length, freeValence.order);
}

/**
 * Builds the alphanumerical citation key of a substituent (design.md §1.1):
 * the letters of its prefix name (lower-case, locants and punctuation left
 * out; external multipliers are never part of it) and its numeric parts
 * (none for a simple prefix). Compared with numbering.js compareCitationKeys.
 *
 * @param {object} substituent - The substituent structure.
 * @param {object} [lexicon] - The lexicon (default: Spanish).
 * @returns {{alpha: string, numeric: number[]}} The citation key.
 */
export function citationKey(substituent, lexicon = lexiconEs) {
  const words = substituentPrefix(substituent, lexicon);
  return { alpha: words.toLowerCase().replace(/[^a-z]/g, ''), numeric: [] };
}

/**
 * Renders the grouped substituent prefixes, in citation order:
 * `3-etil-2,2-dimetil` (numbers separated by commas, numbers and letters by
 * hyphens, prefixes written together with what follows).
 *
 * @param {object[]} groups - The prefix groups (structure.js PrefixGroup), in citation order.
 * @param {object} lexicon - The lexicon.
 * @returns {object[]} The parts.
 */
export function renderPrefixes(groups, lexicon) {
  const parts = [];
  groups.forEach((group, g) => {
    if (g > 0) {
      parts.push(part('-', 'punct'));
    }
    group.locants.forEach((site, i) => {
      if (i > 0) {
        parts.push(part(',', 'punct'));
      }
      parts.push(part(String(site.locant), 'locant', [site.atom, site.attachAtom], [site.bond]));
    });
    parts.push(part('-', 'punct'));
    const atoms = group.locants.flatMap((site) => site.atoms);
    const bonds = group.locants.flatMap((site) => [site.bond, ...site.bonds]);
    const mult = lexicon.multiplier(group.locants.length);
    if (mult) {
      parts.push(part(mult, 'multiplier', atoms, bonds));
    }
    parts.push(part(substituentPrefix(group.substituent, lexicon), 'prefix', atoms, bonds));
  }); // End of the loop over the prefix groups
  return parts;
} // End of function renderPrefixes()

/**
 * Renders a name structure to text and coloured parts.
 *
 * @param {object} structure - The name structure (structure.js NameStructure).
 * @param {object} [lexicon] - The lexicon to use (default: Spanish).
 * @returns {{name: string, parts: object[]}} The rendered name and its parts.
 */
export function renderName(structure, lexicon = lexiconEs) {
  const hasPrefixes = structure.prefixes.length > 0;
  const parts = [
    ...renderPrefixes(structure.prefixes, lexicon),
    ...renderParent(structure.parent, lexicon, hasPrefixes),
  ];
  return { name: parts.map((p) => p.text).join(''), parts };
}
