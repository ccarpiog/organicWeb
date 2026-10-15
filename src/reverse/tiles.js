/**
 * @file Tile catalogue of «¿Cómo se dibuja?» (design.md §15.4, §15.5.1;
 * phase R-1a): the pieces a student picks to build a name — numbers,
 * multipliers, word roots, endings, branch words and the two compound-branch
 * controls. Pure data, no DOM.
 *
 * Every Spanish text comes from the naming lexicon (lexicon.es.js: stem(),
 * multiplier(), compoundMultiplier(), ENDINGS, FREE_VALENCE_SUFFIXES,
 * RETAINED_PREFIXES, ENCLOSING_MARKS, RING_PREFIX, BENZENE_NAME,
 * TRADITIONAL_NAMES, POSITIONAL_LETTERS), never retyped here;
 * numbers are digits. Tile ids are language-neutral (`root-4`, `ending-double`,
 * `retained-tert-butyl`), so a sequence of ids survives a change of wording.
 *
 * A tile is `{id, kind, value, row, text, more}`:
 * - `kind` — 'num' (a locant 1–30), 'mult' (di…triaconta), 'cmult'
 *   (bis, tris, tetrakis…), 'root' (met…triacont, 1–30 carbons), 'ending'
 *   (ano / eno / ino; value 'saturated' | 'double' | 'triple', the ENDINGS
 *   keys), 'freeValence' (il / iliden; value 1 | 2, the attachment bond
 *   order), 'retained' (isopropil, isopropiliden, tert-butil; value the
 *   RETAINED_PREFIXES id, with `italic` the descriptor ignored in
 *   alphabetical order; also `fenil`, value 'phenyl', in the «Anillos» row
 *   from R-4b: the benzene ring as a branch, bonded by its carbon 1, which
 *   unlike the other retained words takes prefixes of its own inside a
 *   compound branch, `(4-metilfenil)`), 'start' / 'end' (the controls
 *   «empieza rama compuesta» / «acaba rama»; their text is the plain
 *   enclosing mark, the assembler picks the real one), 'ring' (the
 *   nondetachable prefix `ciclo` before a root: a ring of that many carbons,
 *   as the parent — `ciclohexano` — or a branch — `ciclohexil`; value
 *   'cyclo'), 'benzene' (the retained parent `benceno`, a whole word: the
 *   benzene ring as the parent, R-4b; value 'benzene'), 'template' (a
 *   retained benzene parent with groups of its own, R-4c: `tolueno`,
 *   `estireno`, `xileno`, `mesitileno`; value the TEMPLATES key),
 *   'positional' (the old orto/meta/para letters `o`, `m`, `p`, R-4c: the two
 *   occupied positions of a benzene ring; value the locant of the second
 *   one, 2 | 3 | 4, the POSITIONAL_LETTERS keys), 'halogen' (the halogen
 *   prefixes `fluoro`, `cloro`, `bromo`, `yodo`, R-5a1: one atom bonded to
 *   the carbon its locant says, never a chain of its own; value the element
 *   symbol, the HALOGEN_PREFIXES keys);
 * - `row` — the tile row of the dialog (design.md §15.2): 'numbers',
 *   'multipliers', 'roots', 'endings', 'branches', 'rings' («Anillos», with
 *   the letters o, m, p from R-4c), 'groups' («Grupos», R-5a1: the halogens;
 *   the alcohol tiles follow in R-5a2), 'traditional' («Nombres
 *   tradicionales», R-4c: the templates; later phases add acetona, ácido
 *   acético…);
 * - `more` — the tile sits behind the row's «más» button (numbers 13–30,
 *   multipliers from hepta / heptakis, roots from undec).
 */

import {
  MAX_STEM, stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, RETAINED_PREFIXES, ENCLOSING_MARKS,
  RING_PREFIX, BENZENE_NAME, TRADITIONAL_NAMES, POSITIONAL_LETTERS, HALOGEN_PREFIXES, groupName,
} from '../naming/lexicon.es.js';

/** Largest locant tile (the longest supported chain, design.md §1.1). */
export const MAX_NUM = MAX_STEM;

/** Largest multiplier tile (`triaconta`, `triacontakis`; design.md §15.5.1). */
export const MAX_MULT = MAX_STEM;

/** Last number shown before «más» (design.md §15.2: 1–12, then 13–30). */
const NUM_VISIBLE = 12;

/** Last multiplier shown before «más» (design.md §15.2: di…hexa, then hepta…triaconta). */
const MULT_VISIBLE = 6;

/** Last root shown before «más» (design.md §15.2: met…dec, then undec…triacont). */
const ROOT_VISIBLE = 10;

/** Retained branch words of the «Ramas» row (design.md §15.5.1); `phenyl` sits in the «Anillos» row (R-4b). */
const RETAINED_IDS = Object.freeze(['isopropyl', 'isopropylidene', 'tert-butyl']);

/** Id of the «empieza rama compuesta» control. */
export const START_ID = 'branch-start';

/** Id of the «acaba rama» control. */
export const END_ID = 'branch-end';

/** Id of the `ciclo` tile (design.md §15.8 R-4: `ciclo` parents and ring branches). */
export const RING_ID = 'ring-cyclo';

/** Id of the `benceno` tile (design.md §15.8 R-4, phase R-4b: the benzene parent). */
export const BENZENE_ID = 'ring-benzene';

/** Id of the `fenil` tile (design.md §15.8 R-4, phase R-4b: the benzene ring as a branch). */
export const PHENYL_ID = 'retained-phenyl';

/** Ids of the orto/meta/para letters by the locant of the second occupied position (design.md §14.4; phase R-4c). */
export const POSITIONAL_IDS = Object.freeze({ 2: 'positional-ortho', 3: 'positional-meta', 4: 'positional-para' });

/**
 * Ids of the halogen tiles by element symbol (design.md §15.8 R-5a; phase
 * R-5a1), in the lexicon's HALOGEN_PREFIXES order: `fluoro`, `cloro`,
 * `bromo`, `yodo`.
 */
export const HALOGEN_IDS = Object.freeze(Object.fromEntries(
  Object.keys(HALOGEN_PREFIXES).map((element) => [element, `halogen-${element}`]),
));

/**
 * The defining group of a retained benzene template: its chain of carbons
 * bonded by carbon 1, with the double bonds of that chain by their lower
 * locant (a methyl; the ethenyl of `estireno`).
 */
const METHYL = Object.freeze({ length: 1, double: Object.freeze([]) });
const ETHENYL = Object.freeze({ length: 2, double: Object.freeze([1]) });

/**
 * The retained benzene parents of the «Nombres tradicionales» row (design.md
 * §14.5, §15.8 R-4; phase R-4c), keyed by the tile value: a benzene ring
 * with `count` identical defining groups `group`, at the ring carbons
 * `positions` — or, for `xileno`, where the student says (`1,2-xileno`, two
 * number tiles, or `o-xileno`, a letter; left out, they are searched).
 * `id` is the TRADITIONAL_NAMES id of the tile's text. The forward engine
 * gives these names for the bare molecules only (never a substituted
 * tolueno, estireno, xileno or mesitileno, aromatic.js); a student's prefixes
 * on a template are still read, numbered on its ring, the defining group at
 * the carbons the template says. Later phases add the retained parents with
 * a principal group (`fenol`, `anilina`, `ácido benzoico`…).
 */
export const TEMPLATES = Object.freeze({
  toluene: Object.freeze({ id: 'toluene', group: METHYL, count: 1, positions: Object.freeze([1]) }),
  styrene: Object.freeze({ id: 'styrene', group: ETHENYL, count: 1, positions: Object.freeze([1]) }),
  xylene: Object.freeze({ id: 'xylene12', group: METHYL, count: 2, positions: null }),
  mesitylene: Object.freeze({ id: 'mesitylene', group: METHYL, count: 3, positions: Object.freeze([1, 3, 5]) }),
});

/**
 * The name of a template's defining group as the messages say it
 * (lexicon groupName()): `metilo`, `etenilo`.
 *
 * @param {string} value - A TEMPLATES key.
 * @returns {string} The group's name.
 */
export function templateGroupWord(value) {
  const { group } = TEMPLATES[value];
  const unsaturation = group.double.length > 0 ? ENDINGS.double.slice(0, -1) : '';
  return groupName(`${stem(group.length)}${unsaturation}${FREE_VALENCE_SUFFIXES[1]}`);
}

/**
 * The text of a template tile: its TRADITIONAL_NAMES name, without the
 * locants the student writes on tiles of their own (`1,2-xileno` →
 * `xileno`).
 *
 * @param {{id: string, positions: number[]|null}} template - A TEMPLATES entry.
 * @returns {string} The word.
 */
function templateWord(template) {
  const name = TRADITIONAL_NAMES[template.id];
  return template.positions ? name : name.slice(name.indexOf('-') + 1);
}

/**
 * Creates one frozen tile.
 *
 * @param {string} id - Language-neutral id.
 * @param {string} kind - Tile kind (see the file header).
 * @param {number|string|null} value - The tile's meaning.
 * @param {string} row - Dialog row id.
 * @param {string} text - The Spanish text, from the lexicon.
 * @param {boolean} [more] - Behind the row's «más» button (default false).
 * @param {object} [extra] - Extra fields (`italic` for a retained branch).
 * @returns {Readonly<object>} The tile.
 */
function makeTile(id, kind, value, row, text, more = false, extra = {}) {
  return Object.freeze({ id, kind, value, row, text, more, ...extra });
}

/**
 * Builds the whole catalogue in dialog order: numbers, multipliers (simple,
 * then compound), roots, endings, branch words and controls, rings (`ciclo`,
 * `benceno`, `fenil`, the letters `o`, `m`, `p`), groups (the halogens
 * `fluoro`, `cloro`, `bromo`, `yodo`), traditional names (`tolueno`,
 * `estireno`, `xileno`, `mesitileno`).
 *
 * @returns {Readonly<object>[]} The tiles.
 */
function buildCatalogue() {
  const tiles = [];
  for (let n = 1; n <= MAX_NUM; n += 1) {
    tiles.push(makeTile(`num-${n}`, 'num', n, 'numbers', String(n), n > NUM_VISIBLE));
  }
  for (let n = 2; n <= MAX_MULT; n += 1) {
    tiles.push(makeTile(`mult-${n}`, 'mult', n, 'multipliers', multiplier(n), n > MULT_VISIBLE));
  }
  for (let n = 2; n <= MAX_MULT; n += 1) {
    tiles.push(makeTile(`cmult-${n}`, 'cmult', n, 'multipliers', compoundMultiplier(n), n > MULT_VISIBLE));
  }
  for (let n = 1; n <= MAX_STEM; n += 1) {
    tiles.push(makeTile(`root-${n}`, 'root', n, 'roots', stem(n), n > ROOT_VISIBLE));
  }
  for (const key of ['saturated', 'double', 'triple']) {
    tiles.push(makeTile(`ending-${key}`, 'ending', key, 'endings', ENDINGS[key]));
  }
  for (const order of [1, 2]) {
    tiles.push(makeTile(`fv-${order}`, 'freeValence', order, 'branches', FREE_VALENCE_SUFFIXES[order]));
  }
  for (const id of RETAINED_IDS) {
    const { italic, text } = RETAINED_PREFIXES[id];
    tiles.push(makeTile(`retained-${id}`, 'retained', id, 'branches', `${italic}${text}`, false, { italic }));
  }
  const [open, close] = ENCLOSING_MARKS[0];
  tiles.push(makeTile(START_ID, 'start', null, 'branches', open));
  tiles.push(makeTile(END_ID, 'end', null, 'branches', close));
  tiles.push(makeTile(RING_ID, 'ring', 'cyclo', 'rings', RING_PREFIX));
  tiles.push(makeTile(BENZENE_ID, 'benzene', 'benzene', 'rings', BENZENE_NAME));
  const phenyl = RETAINED_PREFIXES.phenyl;
  tiles.push(makeTile(PHENYL_ID, 'retained', 'phenyl', 'rings', `${phenyl.italic}${phenyl.text}`, false, { italic: phenyl.italic }));
  for (const [locant, id] of Object.entries(POSITIONAL_IDS)) {
    tiles.push(makeTile(id, 'positional', Number(locant), 'rings', POSITIONAL_LETTERS[locant]));
  }
  for (const [element, id] of Object.entries(HALOGEN_IDS)) {
    tiles.push(makeTile(id, 'halogen', element, 'groups', HALOGEN_PREFIXES[element]));
  }
  for (const [value, template] of Object.entries(TEMPLATES)) {
    tiles.push(makeTile(`template-${value}`, 'template', value, 'traditional', templateWord(template)));
  }
  return tiles;
} // End of function buildCatalogue()

/** Every tile, in dialog order. */
export const TILES = Object.freeze(buildCatalogue());

/** The tiles keyed by id. */
const BY_ID = new Map(TILES.map((tile) => [tile.id, tile]));

/**
 * Returns the tile with an id.
 *
 * @param {string} id - A tile id.
 * @returns {Readonly<object>} The tile.
 * @throws {Error} For an unknown id.
 */
export function tileById(id) {
  const tile = BY_ID.get(id);
  if (!tile) {
    throw new Error(`tileById: unknown tile ${id}`);
  }
  return tile;
}

/**
 * Returns the id of the tile of a kind with a value: `tileId('root', 4)` →
 * 'root-4', `tileId('ending', 'double')` → 'ending-double', `tileId('start')`.
 *
 * @param {string} kind - Tile kind.
 * @param {number|string|null} [value] - Tile value (none for 'start' / 'end').
 * @returns {string} The id.
 * @throws {Error} When no tile has that kind and value.
 */
export function tileId(kind, value = null) {
  const tile = TILES.find((t) => t.kind === kind && t.value === value);
  if (!tile) {
    throw new Error(`tileId: no ${kind} tile with value ${value}`);
  }
  return tile.id;
}

/**
 * Turns a tile sequence given as ids or tiles into tiles.
 *
 * @param {(string|object)[]} sequence - Tile ids or catalogue tiles.
 * @returns {Readonly<object>[]} The tiles.
 * @throws {Error} For an unknown id.
 */
export function toTiles(sequence) {
  return sequence.map((item) => (typeof item === 'string' ? tileById(item) : tileById(item.id)));
}
