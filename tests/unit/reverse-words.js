/**
 * @file Test helper for the «¿Cómo se dibuja?» modules (src/reverse/):
 * writes a tile sequence as the words on the tiles, `2 3 di met il pent
 * ano`, with `START` / `END` for the compound-branch controls, and reads
 * the open-chain, `ciclo` and benzene hydrocarbon rows of
 * tests/fixtures/names.tsv (the benzene ones with the retained templates
 * and the orto/meta/para forms, R-4c).
 * Not a test file itself (the test glob only runs `*.test.js`).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TILES, START_ID, END_ID } from '../../src/reverse/tiles.js';
import { RING_PREFIX, BENZENE_NAME, RETAINED_PREFIXES } from '../../src/naming/lexicon.es.js';

/** The fixture table (design.md §4.8). */
const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'names.tsv');

/**
 * Tells whether a fixture SMILES is an open-chain hydrocarbon: only
 * aliphatic carbons, double and triple bonds and branches — no ring-closure
 * digit, aromatic atom, bracket atom or other element.
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True for an open-chain hydrocarbon.
 */
export function isOpenChainHydrocarbon(smiles) {
  return /^[C=#()]+$/.test(smiles);
}

/**
 * Tells whether a fixture SMILES is a monocyclic hydrocarbon: aliphatic
 * carbons, double and triple bonds, branches and one ring closure (the
 * digit 1, opened and closed once) — no aromatic atom, bracket atom or
 * other element. Benzene rows pass too (they are written in Kekulé form):
 * the names decide, see isCycloName().
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True for a monocyclic hydrocarbon.
 */
export function isMonocyclicHydrocarbon(smiles) {
  return /^[C=#()1]+$/.test(smiles) && smiles.split('1').length === 3;
}

/**
 * Tells whether a name is written with the syntax of phase R-4a: a `ciclo`
 * name (its parent or a branch a `ciclo` ring), letters without accents,
 * digits, hyphens, commas and enclosing marks only, and no compound locant
 * of a ring's closing bond (`1(3)`, the locant control of R-5a). Benzene
 * and `fenil` names (R-4b) have no `ciclo`.
 *
 * @param {string} name - A name.
 * @returns {boolean} True when R-4a reads it.
 */
export function isCycloName(name) {
  return name.includes(RING_PREFIX) && /^[a-z0-9,()[\]{}-]+$/.test(name) && !/\d\(\d/.test(name);
}

/** The words of the retained templates (R-4c): `tolueno`, `estireno`, `xileno`, `mesitileno`. */
const TEMPLATE_WORDS = TILES.filter((tile) => tile.kind === 'template').map((tile) => tile.text);

/**
 * Tells whether a name is written with the syntax of phases R-4b and R-4c: a
 * `benceno`, `fenil` or retained-template name (letters without accents,
 * digits, hyphens, commas and enclosing marks only), the old orto/meta/para
 * forms included — `1,2-dimetilbenceno`, `(4-metilfenil)metano`, `tolueno`,
 * `1,2-xileno`, `o-xileno`, `mesitileno`, `o-dimetilbenceno`.
 *
 * @param {string} name - A name.
 * @returns {boolean} True when R-4b / R-4c read it.
 */
export function isBenzeneName(name) {
  const phenyl = `${RETAINED_PREFIXES.phenyl.italic}${RETAINED_PREFIXES.phenyl.text}`;
  return [BENZENE_NAME, phenyl, ...TEMPLATE_WORDS].some((word) => name.includes(word)) && /^[a-z0-9,()[\]{}-]+$/.test(name);
}

/**
 * Tells whether a name uses the tiles of phase R-4c: a retained template or
 * an orto/meta/para letter.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for `tolueno`, `1,2-xileno`, `o-dimetilbenceno`…
 */
export function isTemplateName(name) {
  return TEMPLATE_WORDS.some((word) => name.includes(word)) || /^[omp]-/.test(name);
}

/**
 * Reads the fixture rows (design.md §4.8): SMILES, name and the
 * alternatives column (`style=name` pairs separated by `;`), with the `#`
 * line of the section each row is in.
 *
 * @returns {Promise<{line: number, smiles: string, names: string[], section: string}[]>} The rows.
 */
export async function readFixtures() {
  const lines = (await readFile(FIXTURES, 'utf8')).split('\n');
  const rows = [];
  let section = '';
  lines.slice(1).forEach((text, i) => {
    if (text.startsWith('#')) {
      section = text;
      return;
    }
    if (text.trim() === '') {
      return;
    }
    const [smiles, name, , , alternatives = ''] = text.split('\t');
    const others = alternatives.split(';').filter(Boolean).map((pair) => pair.slice(pair.indexOf('=') + 1));
    rows.push({ line: i + 2, smiles, names: [name, ...others], section });
  });
  return rows;
} // End of function readFixtures()

/** Tile ids by the text on the tile (every tile text is unique). */
const BY_TEXT = new Map(TILES.filter((tile) => tile.kind !== 'start' && tile.kind !== 'end').map((tile) => [tile.text, tile.id]));
BY_TEXT.set('START', START_ID);
BY_TEXT.set('END', END_ID);

/**
 * Turns space-separated tile words into tile ids.
 *
 * @param {string} words - E.g. '4 prop ano 2 il hept ano'.
 * @returns {string[]} The tile ids.
 * @throws {Error} For a word that is no tile.
 */
export function seq(words) {
  return words.split(/\s+/).filter(Boolean).map((word) => {
    const id = BY_TEXT.get(word);
    if (!id) {
      throw new Error(`seq: no tile reads «${word}»`);
    }
    return id;
  });
}

/**
 * Collects the tile indices a syntax tree refers to, in the order the
 * fields are visited (tile order for a lossless tree).
 *
 * @param {object} node - A node of a parse() tree.
 * @returns {number[]} The indices.
 */
export function leafIndices(node) {
  const out = [];
  /**
   * Visits one node.
   *
   * @param {object|null} n - The node.
   * @returns {void}
   */
  const visit = (n) => {
    if (!n) {
      return;
    }
    switch (n.type) {
      case 'name':
        n.items.forEach(visit);
        visit(n.parent);
        n.trailing.forEach(visit);
        break;
      case 'parent':
        out.push(...n.legacy, ...(n.letter === null ? [] : [n.letter]), ...(n.legacyMultiplier === null ? [] : [n.legacyMultiplier]));
        visit(n.chain);
        break;
      case 'prefix':
        out.push(...n.locants, ...(n.letter === null ? [] : [n.letter]), ...(n.multiplier === null ? [] : [n.multiplier]));
        visit(n.substituent);
        break;
      case 'branch':
        out.push(n.start);
        n.items.forEach(visit);
        visit(n.chain);
        if (n.end !== null) {
          out.push(n.end);
        }
        break;
      case 'chain':
        out.push(...(n.ring === null ? [] : [n.ring]), ...(n.root === null ? [] : [n.root]), ...(n.ano === null ? [] : [n.ano]));
        n.segments.forEach((s) => out.push(...s.locants, ...(s.multiplier === null ? [] : [s.multiplier]), s.ending));
        out.push(...n.fvLocants, ...(n.fv === null ? [] : [n.fv]));
        break;
      default: // 'retained', 'benzene', 'template', 'stray'
        out.push(n.tile);
    }
  }; // End of function visit()
  visit(node);
  return out;
} // End of function leafIndices()
