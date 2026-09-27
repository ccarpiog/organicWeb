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
 * Renders a name structure to text and coloured parts.
 *
 * @param {object} structure - The name structure (structure.js NameStructure).
 * @param {object} [lexicon] - The lexicon to use (default: Spanish).
 * @returns {{name: string, parts: object[]}} The rendered name and its parts.
 * @throws {Error} When the structure has prefixes (rendered from phase 040 on).
 */
export function renderName(structure, lexicon = lexiconEs) {
  if (structure.prefixes.length > 0) {
    throw new Error('renderName: substituent prefixes are not rendered yet (phase 040)');
  }
  const parts = renderParent(structure.parent, lexicon, false);
  return { name: parts.map((p) => p.text).join(''), parts };
}
