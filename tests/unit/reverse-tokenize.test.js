/**
 * @file Unit tests for the tokenizer of «¿Cómo se dibuja?»
 * (src/reverse/tokenize.js, design.md §15.4, §15.7, phases R-1a, R-4a,
 * R-4b, R-4c): the inverse of the assembler. The fixture round trips cover
 * every open-chain hydrocarbon name and alternative of
 * tests/fixtures/names.tsv, then every `ciclo` hydrocarbon one, then every
 * benzene hydrocarbon one written with `benceno` / `fenil` tiles, the
 * retained templates and the orto/meta/para letters (rows chosen by explicit
 * SMILES and name syntax checks, never by "tokenize failed"), and seeded
 * property tests read back the text of random grammatical sequences, without
 * and with rings, benzene and the templates.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { tokenize, TOKENIZE_BUDGET, TOKENIZE_MAX_LENGTH } from '../../src/reverse/tokenize.js';
import {
  stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, RING_PREFIX, BENZENE_NAME, RETAINED_PREFIXES, HALOGEN_PREFIXES,
  GROUP_PREFIXES, GROUP_SUFFIXES,
} from '../../src/naming/lexicon.es.js';
import {
  seq, readFixtures, isOpenChainHydrocarbon, isMonocyclicHydrocarbon, isCycloName, isBenzeneName, isTemplateName,
} from './reverse-words.js';
import { TILES, tileById, PHENOL_ID, CLOSING_ID } from '../../src/reverse/tiles.js';

/** Fixture rows of open-chain hydrocarbons (phase R-1a scope). */
const EXPECTED_ROWS = 176;

/** Names and alternatives of those rows. */
const EXPECTED_NAMES = 204;

/**
 * Fixture rows of `ciclo` hydrocarbons (phase R-4a scope: the sections
 * "Cycloalkanes (I-25)" and "Substituted and unsaturated monocycles
 * (I-26)", 11 + 40 rows, and the two non-aromatic rings of the benzene
 * section, `5-metilidenciclohexa-1,3-dieno` and `ciclobuta-1,3-dieno`).
 */
const EXPECTED_RING_ROWS = 53;

/** Names and alternatives of those rows (three rows have two alternatives each). */
const EXPECTED_RING_NAMES = 59;

/**
 * Fixture rows of benzene hydrocarbons (phase R-4b scope: the hydrocarbon
 * rows of the sections "Benzene and monosubstituted benzenes (I-28)", 13,
 * and "Polysubstituted benzenes with prefixes only (I-42a)", 12; of the 10
 * I-42a rows with halogens or alkoxy groups, the 8 with halogens only are
 * tokenized by reverse-halogens.test.js since I-51a1, the 2 with alkoxy
 * groups are R-5b).
 */
const EXPECTED_BENZENE_ROWS = 25;

/**
 * Their names and alternatives: 31 written with R-4b tiles (four
 * alternatives in the propan-2-il and 1-metiletil styles) and 18 with the
 * R-4c tiles, none skipped since I-50c — the retained templates (`tolueno`
 * ×2, `estireno`, the eight xylene forms, `mesitileno`) and the old o/m/p
 * forms (`o-dimetilbenceno` ×2, `m-` / `p-dimetilbenceno`,
 * `p-dietenilbenceno`, `o-diisopropilbenceno`).
 */
const EXPECTED_BENZENE_NAMES = 49;

/** Of them, the names written with R-4c tiles. */
const EXPECTED_TEMPLATE_NAMES = 18;

/**
 * Reads a tile sequence back as text.
 *
 * @param {string[]} ids - Tile ids.
 * @returns {{text: string, errors: object[]}} The assembled text and the parse errors.
 */
function readBack(ids) {
  const { tree, errors } = parse(ids);
  return { text: assemble(tree).text, errors };
}

test('fixture round trip: every open-chain hydrocarbon name and alternative', async () => {
  const rows = (await readFixtures()).filter((row) => isOpenChainHydrocarbon(row.smiles));
  let covered = 0;
  for (const row of rows) {
    for (const name of row.names) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      const back = readBack(ids);
      assert.deepEqual(back.errors, [], `names.tsv:${row.line}: ${name}`);
      assert.equal(back.text, name, `names.tsv:${row.line}`);
      covered += 1;
    }
  } // End of the loop over the fixture rows
  assert.equal(rows.length, EXPECTED_ROWS);
  assert.equal(covered, EXPECTED_NAMES);
}); // End of test 'fixture round trip: every open-chain hydrocarbon name and alternative'

test('fixture round trip (R-4a): every `ciclo` hydrocarbon name and alternative', async () => {
  const rows = (await readFixtures()).filter((row) => isMonocyclicHydrocarbon(row.smiles) && row.names.every(isCycloName));
  let covered = 0;
  for (const row of rows) {
    for (const name of row.names) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      const back = readBack(ids);
      assert.deepEqual(back.errors, [], `names.tsv:${row.line}: ${name}`);
      assert.equal(back.text, name, `names.tsv:${row.line}`);
      covered += 1;
    }
  } // End of the loop over the fixture rows
  assert.equal(rows.length, EXPECTED_RING_ROWS);
  assert.equal(covered, EXPECTED_RING_NAMES);
}); // End of test 'fixture round trip (R-4a): every `ciclo` hydrocarbon name and alternative'

test('fixture round trip (R-4b, R-4c): every benzene hydrocarbon name and alternative, templates and o/m/p forms too', async () => {
  const rows = (await readFixtures()).filter((row) => isMonocyclicHydrocarbon(row.smiles) && isBenzeneName(row.names[0]));
  let covered = 0;
  let templates = 0;
  for (const row of rows) {
    for (const name of row.names) {
      assert.ok(isBenzeneName(name), `names.tsv:${row.line}: ${name}`);
      templates += isTemplateName(name) ? 1 : 0;
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      const back = readBack(ids);
      assert.deepEqual(back.errors, [], `names.tsv:${row.line}: ${name}`);
      assert.equal(back.text, name, `names.tsv:${row.line}`);
      covered += 1;
    }
  } // End of the loop over the fixture rows
  assert.equal(rows.length, EXPECTED_BENZENE_ROWS);
  assert.equal(covered, EXPECTED_BENZENE_NAMES);
  assert.equal(templates, EXPECTED_TEMPLATE_NAMES);
}); // End of test 'fixture round trip (R-4b, R-4c): every benzene hydrocarbon name and alternative…'

test('benzene forms tokenize to their tiles (R-4b): `benceno` last, `fenil` a branch word, its compound branch marked', () => {
  const examples = [
    ['benceno', 'benceno'],
    ['metilbenceno', 'met il benceno'],
    ['1,4-dimetilbenceno', '1 4 di met il benceno'],
    ['1-isopropil-4-metilbenceno', '1 isopropil 4 met il benceno'],
    ['1-metil-4-(propan-2-il)benceno', '1 met il 4 prop ano 2 il benceno'],
    ['1,2-bis(1-metiletil)benceno', '1 2 bis START 1 met il et il END benceno'],
    ['(prop-2-en-1-il)benceno', 'prop 2 eno 1 il benceno'],
    ['fenilmetano', 'fenil met ano'],
    ['difenilmetano', 'di fenil met ano'],
    ['metil(fenil)metano', 'met il fenil met ano'],
    ['(4-metilfenil)metano', 'START 4 met il fenil END met ano'],
    ['1-(2,4-dimetilfenil)propano', '1 START 2 4 di met il fenil END prop ano'],
    ['[4-(propan-2-il)fenil]metano', 'START 4 prop ano 2 il fenil END met ano'],
    ['bis(4-metilfenil)metano', 'bis START 4 met il fenil END met ano'],
    ['fenilbenceno', 'fenil benceno'],
    ['fenilciclohexano', 'fenil ciclo hex ano'],
  ];
  for (const [text, words] of examples) {
    assert.deepEqual(tokenize(text), seq(words), text);
  }
  // `benceno` takes no numbers of its own, and nothing follows it; a ring cited first is never enclosed.
  for (const text of ['1,3,5-benceno', 'benceno-1,3,5-trieno', 'bencenometano', 'fenil(metil)metano', '(fenil)metano', 'fenilo']) {
    assert.equal(tokenize(text), null, text);
  }
}); // End of test 'benzene forms tokenize to their tiles (R-4b)…'

test('template and o/m/p forms tokenize to their tiles (R-4c): the template last, its locants or letter before it', () => {
  const examples = [
    ['tolueno', 'tolueno'],
    ['estireno', 'estireno'],
    ['mesitileno', 'mesitileno'],
    ['xileno', 'xileno'],
    ['1,2-xileno', '1 2 xileno'],
    ['1,4-xileno', '1 4 xileno'],
    ['o-xileno', 'o xileno'],
    ['m-xileno', 'm xileno'],
    ['p-xileno', 'p xileno'],
    ['o-dimetilbenceno', 'o di met il benceno'],
    ['p-dietenilbenceno', 'p di et eno il benceno'],
    ['o-diisopropilbenceno', 'o di isopropil benceno'],
    ['o-di-tert-butilbenceno', 'o di tert-butil benceno'],
    ['o-bis(2-metilpropil)benceno', 'o bis START 2 met il prop il END benceno'],
    ['p-difenilbenceno', 'p di fenil benceno'],
    ['4-metiltolueno', '4 met il tolueno'],
    ['p-metiltolueno', 'p met il tolueno'],
    ['metiltolueno', 'met il tolueno'],
    ['4-metil-1,2-xileno', '4 met il 1 2 xileno'],
    ['2-etilmesitileno', '2 et il mesitileno'],
  ];
  for (const [text, words] of examples) {
    assert.deepEqual(tokenize(text), seq(words), text);
  }
  // The refused o/m/p forms, misplaced letters and numbers on a template read only with errors: never tokenized.
  for (const text of ['o-trimetilbenceno', 'o-metilbenceno', 'm-etilmetilbenceno', 'o-dimetiltolueno', '4-metil-o-xileno',
    'o-hexano', 'o-benceno', 'o-tolueno', '1-tolueno', '1,3,5-mesitileno', '1-xileno', '1,2,3-xileno', 'xileno-1,2',
    '(o-metilfenil)metano', 'tolueno-1', 'ditolueno', '(tolueno)metano', 'p-dimetil']) {
    assert.equal(tokenize(text), null, text);
  }
}); // End of test 'template and o/m/p forms tokenize to their tiles (R-4c)…'

test('ring forms tokenize to their tiles: `ciclo` before the root, automatic marks around a simple ring branch', () => {
  const examples = [
    ['ciclohexano', 'ciclo hex ano'],
    ['ciclohexa-1,3-dieno', 'ciclo hex 1 3 di eno'],
    ['ciclooct-1-en-3-ino', 'ciclo oct 1 eno 3 ino'],
    ['metilidenciclohexano', 'met iliden ciclo hex ano'],
    ['1-isopropil-4-metilciclohexano', '1 isopropil 4 met il ciclo hex ano'],
    ['1,3-ciclohexadieno', '1 3 ciclo hex di eno'],
    ['ciclohexilmetano', 'ciclo hex il met ano'],
    ['ciclohexilidenmetano', 'ciclo hex iliden met ano'],
    ['2-(ciclohex-2-en-1-il)propano', '2 ciclo hex 2 eno 1 il prop ano'],
    ['(2-metilciclohexil)metano', 'START 2 met il ciclo hex il END met ano'],
    ['metil(ciclohexil)metano', 'met il ciclo hex il met ano'],
    ['2-[metil(ciclohexil)metil]butano', '2 START met il ciclo hex il met il END but ano'],
  ];
  for (const [text, words] of examples) {
    assert.deepEqual(tokenize(text), seq(words), text);
  }
  // Without the marks of the crowded case the text does not read; with marks around both words it is one compound branch.
  assert.equal(tokenize('metilciclohexilmetano'), null);
  assert.deepEqual(tokenize('(metilciclohexil)metano'), seq('START met il ciclo hex il END met ano'));
}); // End of test 'ring forms tokenize to their tiles…'

test('the §15.5.1 examples tokenize to the tiles of the design', () => {
  const examples = [
    ['hexano', 'hex ano'],
    ['2,3-dimetilpentano', '2 3 di met il pent ano'],
    ['buta-1,3-dieno', 'but 1 3 di eno'],
    ['hex-1-en-3,5-diino', 'hex 1 eno 3 5 di ino'],
    ['4-(propan-2-il)heptano', '4 prop ano 2 il hept ano'],
    ['5-etenilidennonano', '5 et eno iliden non ano'],
    ['5,5-bis(2,2-dimetilpropil)nonano', '5 5 bis START 2 2 di met il prop il END non ano'],
    ['5,5-di-tert-butilnonano', '5 5 di tert-butil non ano'],
    ['2-buteno', '2 but eno'],
  ];
  for (const [name, words] of examples) {
    assert.deepEqual(tokenize(name), seq(words), name);
  }
}); // End of test 'the §15.5.1 examples tokenize to the tiles of the design'

test('tokenize prefers whole words and automatic marks for simple branches', () => {
  assert.deepEqual(tokenize('tridecano'), seq('tridec ano')); // not `tri dec ano`
  assert.deepEqual(tokenize('5-tridecilnonano'), seq('5 tridec il non ano')); // `tri dec il` needs three locants
  assert.deepEqual(tokenize('5-(prop-2-en-1-il)nonano'), seq('5 prop 2 eno 1 il non ano')); // no START / END
  assert.deepEqual(tokenize('8-[2-(propan-2-iliden)hexil]pentadecano'),
    seq('8 START 2 prop ano 2 iliden hex il END pentadec ano'));
  assert.deepEqual(tokenize('2-metil-2-buteno'), seq('2 met il 2 but eno'));
  assert.deepEqual(tokenize('1,3-butadieno'), seq('1 3 but di eno'));
  assert.deepEqual(tokenize('propadieno'), seq('prop di eno'));
}); // End of test 'tokenize prefers whole words and automatic marks for simple branches'

test('tokenize returns null outside the grammar, for texts that only read with errors, and past its budget', () => {
  // `clorometano` reads since R-5a1, `propan-2-ol` since R-5a2, `p-cresol` since R-5a3a; `cloro` alone and `(2-cloro)etano`
  // only read with errors, and so do `ol` alone, `2-ol`, `propil-2-ol`, a closing locant on a chain (`but-1(4)-eno`), a number
  // on `cresol` (`4-cresol`) and a letter on `catecol`.
  for (const text of ['', 'ácido etanoico', 'cloro', '(2-cloro)etano', '4-cresol', 'o-catecol', 'hex ano', 'HEXANO', 'ciclo',
    'cicloetano', 'ol', '2-ol', 'propil-2-ol', 'but-1(4)-eno', 'fenol-2-ol', 'propan-2-diol', 'butano-1,2-bisol']) {
    assert.equal(tokenize(text), null, text);
  }
  for (const text of ['2,3-trimetilpentano', '1,3-hexenino', 'hexano-2-metil', '2-metil', '5-(2-metilpropil', 'propil']) {
    assert.equal(tokenize(text), null, text);
  }
  assert.ok(TOKENIZE_BUDGET > 0);
  assert.equal(tokenize('5,5-bis(2,2-dimetilpropil)nonano', { budget: 5 }), null);
  const start = performance.now();
  assert.equal(tokenize(`${'('.repeat(40)}metano${')'.repeat(40)}`), null);
  assert.ok(performance.now() - start < 2000, 'the budget bounds the search');
}); // End of test 'tokenize returns null outside the grammar, for texts that only read with errors, and past its budget'

test('tokenize never exhausts the stack: deep nesting and over-long texts return null (review I-47a)', () => {
  assert.equal(tokenize(`${'('.repeat(3000)}metano${')'.repeat(3000)}`), null);
  assert.equal(tokenize('metil'.repeat(TOKENIZE_MAX_LENGTH)), null);
  const deepest = Math.floor((TOKENIZE_MAX_LENGTH - 'metano'.length) / 2);
  assert.equal(tokenize(`${'('.repeat(deepest)}metano${')'.repeat(deepest)}`), null);
  assert.deepEqual(tokenize('metano'), seq('met ano'));
});

test('tokenize compares in NFC', () => {
  assert.deepEqual(tokenize('hexano'.normalize('NFD')), seq('hex ano'));
});

/**
 * Seeded pseudo-random generator (mulberry32).
 *
 * @param {number} seed - The seed.
 * @returns {() => number} A function returning numbers in [0, 1).
 */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generator of grammatical tile sequences (design.md §15.5.1), as tile
 * words: prefixes (simple, retained, compound up to two levels deep) with
 * locant counts that match their multipliers (or left out), and a parent
 * with `ano` or one or two segments, sometimes in the old style. With
 * `rings` (R-4a), some stems — of the parent or of a branch — are rings:
 * `ciclo` and a root of 3 to 30 carbons. With `benzene` (R-4b), some simple
 * branches are `fenil` (also as the own chain of a compound branch) and
 * some parents `benceno`. With `templates` (R-4c), some parents are retained
 * templates — `xileno` with two locants or none — and some names an
 * orto/meta/para form with exactly two occupied positions: a letter, `di` /
 * `bis` and one branch on `benceno`, a letter and one branch on `tolueno` or
 * `estireno`, or a letter on `xileno`. With `alcohols` (R-5a2), some
 * one-atom prefixes are `hidroxi`, some parents take the suffix `ol` (with
 * locants, a multiplier, or neither — always located after old-style
 * segment locants), some benzene parents are `fenol`, and some located
 * segments of a ring cite the closing-bond locant `1(n)`.
 *
 * @param {() => number} random - The random source.
 * @param {boolean} [rings] - Draw ring stems too (default false: the R-1a sequences, draw for draw).
 * @param {boolean} [benzene] - Draw `fenil` and `benceno` too (default false: the earlier sequences, draw for draw).
 * @param {boolean} [templates] - Draw the templates and the letters too (default false: the earlier sequences, draw for draw).
 * @param {boolean} [halogens] - Draw halogen prefixes too, at name level and inside compound branches (R-5a1; default
 *   false: the earlier sequences, draw for draw).
 * @param {boolean} [alcohols] - Draw `hidroxi`, the suffix `ol`, `fenol` and `1(n)` too (R-5a2; default false: the earlier
 *   sequences, draw for draw).
 * @returns {() => string[]} A function returning one sequence of tile words.
 */
function grammarGenerator(random, rings = false, benzene = false, templates = false, halogens = false, alcohols = false) {
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const nums = (k) => Array.from({ length: k }, () => String(int(1, 30)));
  const fv = () => FREE_VALENCE_SUFFIXES[int(1, 2)];
  /**
   * The words of a stem: a root, or (with `rings`, sometimes) `ciclo` and a root of three or more carbons.
   *
   * @returns {string[]} The words.
   */
  const stemWords = () => (rings && random() < 0.4 ? [RING_PREFIX, stem(int(3, 30))] : [stem(int(1, 30))]);
  /**
   * One unsaturation segment, with or without its locants; on a ring, with
   * `alcohols`, sometimes with the closing-bond locant `1(n)` first (R-5a2).
   *
   * @param {boolean} located - Whether to cite its locants.
   * @param {boolean} [ring] - The segment's stem is a ring.
   * @returns {string[]} The words.
   */
  const segment = (located, ring = false) => {
    const k = int(1, 3);
    const locants = located ? nums(k) : [];
    if (alcohols && ring && located && random() < 0.4) {
      locants[0] = tileById(CLOSING_ID).text;
    }
    return [...locants, ...(k > 1 ? [multiplier(k)] : []), pick([ENDINGS.double, ENDINGS.triple])];
  };
  /**
   * With `alcohols` (R-5a2), the alcohol suffix after a parent's ending, or nothing.
   *
   * @param {boolean} [located] - Always cite its locants (after old-style segment locants).
   * @returns {string[]} The words.
   */
  const suffix = (located = false) => {
    if (!alcohols || random() < 0.4) {
      return [];
    }
    const k = int(1, 4);
    return [...(located || random() < 0.8 ? nums(k) : []), ...(k > 1 ? [multiplier(k)] : []), GROUP_SUFFIXES.alcohol];
  };
  /**
   * A simple branch (design.md §15.5.1 `simple`).
   *
   * @returns {string[]} The words.
   */
  const simple = () => {
    if (benzene && random() < 0.25) {
      return [`${RETAINED_PREFIXES.phenyl.italic}${RETAINED_PREFIXES.phenyl.text}`];
    }
    const form = int(0, 3);
    const root = stemWords();
    if (form === 0) {
      return [...root, fv()];
    }
    if (form === 1) {
      return [...root, ...(random() < 0.5 ? [ENDINGS.saturated] : []), ...nums(1), fv()];
    }
    if (form === 2) {
      const segments = Array.from({ length: int(1, 2) }, () => segment(random() < 0.7, root.length > 1)).flat();
      return [...root, ...segments, ...(random() < 0.6 ? nums(1) : []), fv()];
    }
    return [pick(['isopropil', 'isopropiliden', 'tert-butil'])];
  }; // End of function simple()
  /**
   * A prefix: locants (or none), multiplier, substituent.
   *
   * @param {number} depth - Nesting depth of compound branches.
   * @returns {string[]} The words.
   */
  const prefix = (depth) => {
    const k = int(1, 3);
    const branch = depth < 2 && random() < 0.3;
    const mult = k > 1 ? [pick([multiplier(k), compoundMultiplier(k)])] : [];
    const halogen = halogens && random() < 0.35; // Never a compound branch's own chain (simple() below).
    let substituent;
    if (halogen) {
      substituent = [pick([...Object.values(HALOGEN_PREFIXES), ...(alcohols ? [GROUP_PREFIXES.alcohol] : [])])];
    } else {
      substituent = branch
        ? ['START', ...Array.from({ length: int(1, 2) }, () => prefix(depth + 1)).flat(), ...simple(), 'END']
        : simple();
    }
    return [...(random() < 0.85 ? nums(k) : []), ...mult, ...substituent];
  }; // End of function prefix()
  /**
   * The parent: `ano`, or segments, sometimes with old-style locants.
   *
   * @returns {string[]} The words.
   */
  /**
   * The word of a template tile.
   *
   * @param {string} value - A tiles.js TEMPLATES key.
   * @returns {string} The word.
   */
  const templateWord = (value) => TILES.find((tile) => tile.kind === 'template' && tile.value === value).text;
  /**
   * An orto/meta/para letter, at random.
   *
   * @returns {string} The word.
   */
  const letter = () => {
    const value = int(2, 4);
    return TILES.find((tile) => tile.kind === 'positional' && tile.value === value).text;
  };
  const parent = () => {
    if (templates && random() < 0.5) {
      const value = pick(['toluene', 'styrene', 'xylene', 'mesitylene']);
      return [...(value === 'xylene' && random() < 0.7 ? nums(2) : []), templateWord(value)];
    }
    if (benzene && random() < 0.5) {
      if (alcohols && random() < 0.3) {
        return [tileById(PHENOL_ID).text];
      }
      return [BENZENE_NAME, ...suffix()];
    }
    const root = stemWords();
    const form = int(0, 2);
    if (form === 0) {
      return [...root, ENDINGS.saturated, ...suffix()];
    }
    if (form === 1) {
      return [...root, ...Array.from({ length: int(1, 2) }, () => segment(random() < 0.8, root.length > 1)).flat(), ...suffix()];
    }
    const k = int(1, 2); // old style: the locants of the only segment without them go first
    return [...nums(k), ...root, ...(k > 1 ? [multiplier(k)] : []), pick([ENDINGS.double, ENDINGS.triple]), ...suffix(true)];
  }; // End of function parent()
  /**
   * An orto/meta/para name (R-4c): two occupied positions, one of them the letter's prefix or a template's group.
   *
   * @returns {string[]} The words.
   */
  const lettered = () => {
    const form = int(0, 2);
    if (form === 0) {
      const branch = random() < 0.3 ? ['START', ...prefix(1), ...simple(), 'END'] : simple();
      return [letter(), pick([multiplier(2), compoundMultiplier(2)]), ...branch, BENZENE_NAME];
    }
    if (form === 1) {
      return [letter(), ...simple(), templateWord(pick(['toluene', 'styrene']))];
    }
    return [letter(), templateWord('xylene')];
  }; // End of function lettered()
  return () => (templates && random() < 0.25 ? lettered()
    : [...Array.from({ length: int(0, 3) }, () => prefix(0)).flat(), ...parent()]);
} // End of function grammarGenerator()

test('property: the text of random grammatical sequences tokenizes back to the same text', () => {
  const next = grammarGenerator(mulberry32(20261014));
  for (let i = 0; i < 400; i += 1) {
    const words = next().join(' ');
    const ids = seq(words);
    const original = readBack(ids);
    assert.deepEqual(original.errors, [], words);
    const spans = assemble(parse(ids).tree).spans;
    assert.deepEqual(spans.filter((s) => s.tile !== null).map((s) => s.tile), ids.map((_, j) => j), `${words}: one span per tile`);
    const found = tokenize(original.text);
    assert.ok(found, `${words} → ${original.text}: no tiles`);
    assert.equal(readBack(found).text, original.text, words);
  } // End of the loop over the random sequences
}); // End of test 'property: the text of random grammatical sequences tokenizes back to the same text'

test('property (R-4a): random grammatical sequences with rings tokenize back to the same text', () => {
  const next = grammarGenerator(mulberry32(20261015), true);
  let ringed = 0;
  for (let i = 0; i < 400; i += 1) {
    const words = next().join(' ');
    const ids = seq(words);
    const original = readBack(ids);
    assert.deepEqual(original.errors, [], words);
    ringed += words.includes(RING_PREFIX) ? 1 : 0;
    const found = tokenize(original.text);
    assert.ok(found, `${words} → ${original.text}: no tiles`);
    assert.equal(readBack(found).text, original.text, words);
  } // End of the loop over the random sequences
  assert.ok(ringed >= 200, `${ringed} sequences with a ring`);
}); // End of test 'property (R-4a): random grammatical sequences with rings tokenize back to the same text'

test('property (R-4b): random grammatical sequences with `fenil` and `benceno` tokenize back to the same text', () => {
  const next = grammarGenerator(mulberry32(20261016), true, true);
  let benzene = 0;
  for (let i = 0; i < 400; i += 1) {
    const words = next().join(' ');
    const ids = seq(words);
    const original = readBack(ids);
    assert.deepEqual(original.errors, [], words);
    benzene += /\b(?:benceno|fenil)\b/.test(words) ? 1 : 0;
    const found = tokenize(original.text);
    assert.ok(found, `${words} → ${original.text}: no tiles`);
    assert.equal(readBack(found).text, original.text, words);
  } // End of the loop over the random sequences
  assert.ok(benzene >= 200, `${benzene} sequences with benzene words`);
}); // End of test 'property (R-4b): random grammatical sequences with `fenil` and `benceno` tokenize back to the same text'

test('property (R-4c): random grammatical sequences with the templates and the o/m/p letters tokenize back to the same text', () => {
  const next = grammarGenerator(mulberry32(20261017), true, true, true);
  const counts = { templates: 0, letters: 0 };
  const words = (kind) => TILES.filter((tile) => tile.kind === kind).map((tile) => tile.text);
  for (let i = 0; i < 400; i += 1) {
    const list = next();
    const ids = seq(list.join(' '));
    const original = readBack(ids);
    assert.deepEqual(original.errors, [], list.join(' '));
    counts.templates += list.some((word) => words('template').includes(word)) ? 1 : 0;
    counts.letters += list.some((word) => words('positional').includes(word)) ? 1 : 0;
    const found = tokenize(original.text);
    assert.ok(found, `${list.join(' ')} → ${original.text}: no tiles`);
    assert.equal(readBack(found).text, original.text, list.join(' '));
  } // End of the loop over the random sequences
  assert.ok(counts.templates >= 150, `${counts.templates} sequences with a template`);
  assert.ok(counts.letters >= 80, `${counts.letters} sequences with a letter`);
}); // End of test 'property (R-4c): random grammatical sequences with the templates and the o/m/p letters…'

test('property (R-5a2): random grammatical sequences with alcohols tokenize back to the same text', () => {
  const next = grammarGenerator(mulberry32(20261020), true, true, true, true, true);
  const seen = { ol: 0, hidroxi: 0, fenol: 0, closing: 0 };
  const words = { ol: GROUP_SUFFIXES.alcohol, hidroxi: GROUP_PREFIXES.alcohol, fenol: tileById(PHENOL_ID).text, closing: tileById(CLOSING_ID).text };
  for (let i = 0; i < 400; i += 1) {
    const list = next();
    const ids = seq(list.join(' '));
    const original = readBack(ids);
    assert.deepEqual(original.errors, [], list.join(' '));
    Object.entries(words).forEach(([key, word]) => { seen[key] += list.includes(word) ? 1 : 0; });
    const found = tokenize(original.text);
    assert.ok(found, `${list.join(' ')} → ${original.text}: no tiles`);
    assert.equal(readBack(found).text, original.text, list.join(' '));
  } // End of the loop over the random sequences
  assert.ok(seen.ol >= 50 && seen.hidroxi >= 30 && seen.fenol >= 10 && seen.closing >= 8, JSON.stringify(seen)); // The seed gives 64, 41, 15, 10.
}); // End of test 'property (R-5a2): random grammatical sequences with alcohols tokenize back to the same text'

test('property (R-5a1): random grammatical sequences with halogen prefixes tokenize back to the same text', () => {
  const next = grammarGenerator(mulberry32(20261019), true, true, true, true);
  let halogenated = 0;
  const halogens = Object.values(HALOGEN_PREFIXES);
  for (let i = 0; i < 400; i += 1) {
    const list = next();
    const ids = seq(list.join(' '));
    const original = readBack(ids);
    assert.deepEqual(original.errors, [], list.join(' '));
    halogenated += list.some((word) => halogens.includes(word)) ? 1 : 0;
    const found = tokenize(original.text);
    assert.ok(found, `${list.join(' ')} → ${original.text}: no tiles`);
    assert.equal(readBack(found).text, original.text, list.join(' '));
  } // End of the loop over the random sequences
  assert.ok(halogenated >= 150, `${halogenated} sequences with a halogen`);
}); // End of test 'property (R-5a1): random grammatical sequences with halogen prefixes tokenize back to the same text'
