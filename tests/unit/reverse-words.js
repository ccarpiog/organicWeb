/**
 * @file Test helper for the «¿Cómo se dibuja?» modules (src/reverse/):
 * writes a tile sequence as the words on the tiles, `2 3 di met il pent
 * ano`, with `START` / `END` for the compound-branch controls. Not a test
 * file itself (the test glob only runs `*.test.js`).
 */

import { TILES, START_ID, END_ID } from '../../src/reverse/tiles.js';

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
        out.push(...n.legacy, ...(n.legacyMultiplier === null ? [] : [n.legacyMultiplier]));
        visit(n.chain);
        break;
      case 'prefix':
        out.push(...n.locants, ...(n.multiplier === null ? [] : [n.multiplier]));
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
        out.push(n.root, ...(n.ano === null ? [] : [n.ano]));
        n.segments.forEach((s) => out.push(...s.locants, ...(s.multiplier === null ? [] : [s.multiplier]), s.ending));
        out.push(...n.fvLocants, ...(n.fv === null ? [] : [n.fv]));
        break;
      default: // 'retained', 'stray'
        out.push(n.tile);
    }
  }; // End of function visit()
  visit(node);
  return out;
} // End of function leafIndices()
