/**
 * @file Unit tests for the parser of «¿Cómo se dibuja?» (src/reverse/parse.js,
 * design.md §15.5.1, §15.6, phase R-1a): the lossless syntax tree of the
 * grammar for open-chain hydrocarbons (the student's multipliers, order and
 * locants kept), old-style locants, and one test per syntactic error code
 * with its tile range; rings (`ciclo`, R-4a) with RING_ROOT and RING_SIZE;
 * benzene (`benceno`, `fenil`, R-4b) with BENZENE_BONDS; the retained templates and the o/m/p letters (R-4c) keep
 * their tiles in the tree (their errors, TEMPLATE_LOCANTS and POSITIONAL, are tested in reverse-templates.test.js).
 * The structural codes (LOCANT_RANGE, BOND_RANGE, SAME_BOND, VALENCE, TOO_BIG) belong to R-1b.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse, ERROR_CODES, MIN_RING, isCompleteSubstituent } from '../../src/reverse/parse.js';
import { tileById } from '../../src/reverse/tiles.js';
import { seq, leafIndices } from './reverse-words.js';

/**
 * Parses tile words.
 *
 * @param {string} words - Space-separated tile words (reverse-words.js).
 * @returns {{tree: object, errors: object[]}} The parse result.
 */
function read(words) {
  return parse(seq(words));
}

/**
 * The errors of a parse as `CODE[from,to)` strings.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string[]} The errors.
 */
function errorsOf(words) {
  return read(words).errors.map((e) => `${e.code}[${e.from},${e.to})`);
}

/**
 * The first error of a parse with the given code.
 *
 * @param {string} words - Space-separated tile words.
 * @param {string} code - Error code.
 * @returns {object} The error.
 */
function errorOf(words, code) {
  const error = read(words).errors.find((e) => e.code === code);
  assert.ok(error, `${words}: no ${code} in ${errorsOf(words).join(' ')}`);
  return error;
}

/** The §15.5.1 examples, valid and every one of them error-free. */
const EXAMPLES = [
  'hex ano',
  '2 3 di met il pent ano',
  'but 1 3 di eno',
  'hex 1 eno 3 5 di ino',
  '4 prop ano 2 il hept ano',
  '5 et eno iliden non ano',
  '5 5 bis START 2 2 di met il prop il END non ano',
  '5 5 di tert-butil non ano',
  '2 but eno',
];

/** Sequences with mistakes or unfinished, for the lossless property. */
const BROKEN = [
  'eno', '2 3 di', '2 met il', 'but', '5 START 2 met il', '1 3 hex eno ino', 'hex ano 2 met il', 'START END',
  'met il END but ano', '2 START 2 met il 3 END hex ano', 'prop ano il hex ano', 'but 1 3 di', '1 3 di but eno',
  '5 prop 1 2 il non ano', 'hex 1 eno 3 eno 5 ino', 'but 1 2 bis eno', 'il ano 2', '2 3 tri met il pent ano',
  '5 START START 2 met il prop il END', 'iliden di bis tri', '2 met il 2 but',
  // Rings (R-4a): `ciclo` without a root, a ring too small, unfinished rings.
  'ciclo', 'ciclo ano', '2 ciclo', 'ciclo ciclo hex ano', 'ciclo et ano', 'ciclo hex', 'met il ciclo', 'ciclo hex il',
  '1 3 ciclo hex', 'START ciclo hex il END', 'ciclo met il ciclo prop ano',
  // Benzene (R-4b): numbers of its own, `benceno` inside a branch or before more tiles, `fenil` alone or unclosed.
  '1 3 5 benceno', '1 3 5 tri benceno', 'benceno 1 3 5 tri eno', 'START benceno END met ano', 'benceno met il', 'di benceno',
  '2 START 2 benceno END but ano', 'fenil', 'START 4 met il fenil', 'met il benceno benceno',
  // Templates and letters (R-4c): numbers or letters out of place, a template inside a branch or before more tiles.
  '1 2 o xileno', 'o tolueno', 'di tolueno', 'o', 'o 2 met il benceno', 'START o met il fenil END met ano', 'xileno 1 2',
  'START tolueno END met ano', 'o di o met il benceno', '1 o di met il benceno', 'o hex ano', 'o benceno', 'tolueno benceno',
];

/** Template and letter forms of R-4c (design.md §15.8 R-4, §14.4), valid and error-free. */
const TEMPLATE_EXAMPLES = [
  'tolueno', 'estireno', 'mesitileno', 'xileno', '1 2 xileno', 'o xileno', 'p xileno', '4 met il tolueno', 'met il xileno',
  'o di met il benceno', 'p di et eno il benceno', 'o bis START 2 met il prop il END benceno', 'p met il tolueno',
  'm et il estireno', '2 et il mesitileno',
];

/** Benzene forms of R-4b (design.md §15.8 R-4), valid and error-free. */
const BENZENE_EXAMPLES = [
  'benceno', 'met il benceno', '1 2 di met il benceno', 'hexa met il benceno', '1 isopropil 4 met il benceno',
  'fenil met ano', 'di fenil met ano', 'met il fenil met ano', 'START 4 met il fenil END met ano',
  '1 START 2 4 di met il fenil END prop ano', 'START 4 prop ano 2 il fenil END met ano', 'fenil benceno', 'START fenil END met ano',
];

/** Ring forms of R-4a (design.md §15.8 R-4), valid and error-free. */
const RING_EXAMPLES = [
  'ciclo hex ano', 'ciclo prop eno', 'ciclo hex 1 3 di eno', 'ciclo oct 1 eno 3 ino', 'met il ciclo hex ano',
  '1 2 di met il ciclo pent ano', '3 met il ciclo hex 1 eno', 'ciclo hex il met ano', 'ciclo hex iliden met ano',
  '2 ciclo hex 2 eno 1 il prop ano', 'START 2 met il ciclo hex il END met ano', '1 3 ciclo hex di eno',
  '2 START ciclo hex il met il END but ano', 'di ciclo hex il met ano', 'ciclo hex ano 1 il met ano',
];

test('the §15.5.1 examples, the ring forms, the benzene forms and the template forms parse without errors', () => {
  for (const words of [...EXAMPLES, ...RING_EXAMPLES, ...BENZENE_EXAMPLES, ...TEMPLATE_EXAMPLES]) {
    assert.deepEqual(errorsOf(words), [], words);
  }
  assert.deepEqual(ERROR_CODES, ['EMPTY', 'NO_PARENT', 'ROOT_END', 'ENDS_WITH_BRANCH', 'BRANCH_OPEN', 'LOCANT_COUNT', 'LEGACY', 'TILE_ORDER',
    'RING_ROOT', 'RING_SIZE', 'BENZENE_BONDS', 'TEMPLATE_LOCANTS', 'POSITIONAL', 'ETHER_GROUPS', 'ACID_WORD', 'ESTER_GROUPS',
    'ESTER_SUFFIX']); // ESTER_GROUPS, ESTER_SUFFIX since R-6a1 (reverse-esters.test.js) // ETHER_GROUPS: R-5b2;
  // ACID_WORD: R-5d1; R-6b1 adds none (the nitriles' misplaced tiles are TILE_ORDER and TEMPLATE_LOCANTS: reverse-nitriles.test.js)
});

test('the tree is lossless: every tile exactly once, in order, also with mistakes', () => {
  for (const words of [...EXAMPLES, ...RING_EXAMPLES, ...BENZENE_EXAMPLES, ...TEMPLATE_EXAMPLES, ...BROKEN]) {
    const { tree } = read(words);
    const n = seq(words).length;
    assert.deepEqual(leafIndices(tree), Array.from({ length: n }, (_, i) => i), words);
    assert.deepEqual(tree.range, [0, n]);
  }
});

test('the tree keeps the student\'s prefixes, multipliers and locants as written', () => {
  // `2,3-dimetilpentano`: one prefix, locants 2 and 3, multiplier di, parent C5 with `ano`.
  let { tree } = read('2 3 di met il pent ano');
  assert.equal(tree.items.length, 1);
  const [prefix] = tree.items;
  assert.deepEqual(prefix.locants.map((i) => tree.tiles[i].value), [2, 3]);
  assert.equal(tree.tiles[prefix.multiplier].id, 'mult-2');
  assert.equal(prefix.substituent.type, 'chain');
  assert.equal(tree.tiles[prefix.substituent.root].value, 1);
  assert.equal(tree.tiles[prefix.substituent.fv].value, 1);
  assert.equal(tree.tiles[tree.parent.chain.root].value, 5);
  assert.equal(tree.parent.chain.ano, 6);
  // Unsorted prefixes stay in the student's order; `bis` stays `bis` on a simple branch.
  ({ tree } = read('3 met il 2 et il 5 5 bis prop 2 il non ano'));
  assert.deepEqual(tree.items.map((item) => tree.tiles[item.substituent.root].text), ['met', 'et', 'prop']);
  assert.equal(tree.tiles[tree.items[2].multiplier].id, 'cmult-2');
  // A compound branch: its prefixes, its own chain (cited last) and both controls.
  ({ tree } = read('5 5 bis START 2 2 di met il prop il END non ano'));
  const branch = tree.items[0].substituent;
  assert.equal(branch.type, 'branch');
  assert.equal(branch.start, 3);
  assert.equal(branch.end, 11);
  assert.equal(branch.items.length, 1);
  assert.equal(tree.tiles[branch.chain.root].text, 'prop');
  assert.ok(isCompleteSubstituent(branch));
  // `propan-2-il`: `ano` kept as a tile, the free-valence locant 2.
  ({ tree } = read('4 prop ano 2 il hept ano'));
  const chain = tree.items[0].substituent;
  assert.equal(chain.ano, 2);
  assert.deepEqual(chain.fvLocants, [3]);
  // Unsaturation segments with their own locants and multipliers.
  ({ tree } = read('hex 1 eno 3 5 di ino'));
  assert.deepEqual(tree.parent.chain.segments.map((s) => [s.locants.length, s.multiplier, tree.tiles[s.ending].value]),
    [[1, null, 'double'], [2, 5, 'triple']]);
  // Retained words and `iliden`.
  ({ tree } = read('5 5 di tert-butil 3 isopropiliden 2 et eno iliden non ano'));
  assert.deepEqual(tree.items.map((item) => item.substituent.type), ['retained', 'retained', 'chain']);
  assert.equal(tree.tiles[tree.items[2].substituent.fv].value, 2);
}); // End of test 'the tree keeps the student's prefixes, multipliers and locants as written'

test('old-style locants: leading numbers are never consumed greedily', () => {
  // `2-buteno`: the 2 belongs to the only segment without locants.
  let { tree, errors } = read('2 but eno');
  assert.deepEqual(errors, []);
  assert.equal(tree.items.length, 0);
  assert.deepEqual(tree.parent.legacy, [0]);
  assert.equal(tree.parent.legacySegment, 0);
  // `2-metil-2-buteno`: the first 2 is the prefix's, the second the parent's.
  ({ tree, errors } = read('2 met il 2 but eno'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items[0].locants, [0]);
  assert.deepEqual(tree.parent.legacy, [3]);
  // `1,3-butadieno`: two locants for the multiplied segment.
  ({ tree, errors } = read('1 3 but di eno'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.parent.legacy, [0, 1]);
  // `1-hexen-3-ino`: exactly one segment (eno) is left without locants.
  ({ tree, errors } = read('1 hex eno 3 ino'));
  assert.deepEqual(errors, []);
  assert.equal(tree.parent.legacySegment, 0);
}); // End of test 'old-style locants: leading numbers are never consumed greedily'

test('EMPTY: no tiles', () => {
  const { tree, errors } = parse([]);
  assert.deepEqual(errors.map((e) => [e.code, e.from, e.to, e.message]), [['EMPTY', 0, 0, 'Elige fichas para formar un nombre.']]);
  assert.equal(tree.parent, null);
});

test('NO_PARENT: numbers and multipliers with nothing after them, or no root at all', () => {
  const error = errorOf('2 3 di', 'NO_PARENT');
  assert.deepEqual([error.from, error.to], [0, 3]);
  assert.equal(error.message, 'Falta la cadena principal: una raíz (met, et, prop…) y su terminación (ano, eno, ino).');
  // After a complete prefix, only the tiles after it are marked.
  assert.deepEqual(errorsOf('2 met il 3'), ['NO_PARENT[3,4)']);
  assert.deepEqual(errorsOf('eno'), ['TILE_ORDER[0,1)', 'NO_PARENT[0,1)']);
});

test('ROOT_END: a root without its ending', () => {
  const error = errorOf('2 met il but', 'ROOT_END');
  assert.deepEqual([error.from, error.to], [3, 4]);
  assert.equal(error.message, 'Después de «but» va una terminación: «ano», «eno» o «ino» si es la cadena principal, o «il» si es una rama.');
  // A root followed by another prefix; a chain without `il` inside a compound branch.
  assert.deepEqual(errorsOf('hex 2 met il pent ano'), ['ROOT_END[0,1)']);
  assert.deepEqual(errorsOf('5 START 2 met il prop ano END non ano'), ['ROOT_END[5,7)', 'TILE_ORDER[7,8)']);
});

test('ENDS_WITH_BRANCH: a name that ends with a complete branch', () => {
  const error = errorOf('2 3 di met il', 'ENDS_WITH_BRANCH');
  assert.deepEqual([error.from, error.to], [0, 5]);
  assert.equal(error.message, 'El nombre acaba en una rama («metil»): falta la cadena principal detrás.');
  assert.equal(errorOf('4 prop ano 2 il', 'ENDS_WITH_BRANCH').message,
    'El nombre acaba en una rama («(propan-2-il)»): falta la cadena principal detrás.');
  assert.deepEqual(errorsOf('5 5 bis START 2 2 di met il prop il END'), ['ENDS_WITH_BRANCH[0,12)']);
});

test('BRANCH_OPEN: a compound branch never closed', () => {
  const error = errorOf('5 START 2 2 di met il prop il', 'BRANCH_OPEN');
  assert.deepEqual([error.from, error.to], [1, 9]);
  assert.equal(error.message, 'Falta cerrar la rama compuesta.');
  // Only BRANCH_OPEN: the missing parent is not reported on top of it.
  assert.deepEqual(errorsOf('5 START 2 2 di met il prop il'), ['BRANCH_OPEN[1,9)']);
  // Nested: both branches are open.
  assert.deepEqual(errorsOf('8 START 2 START 1 met il'), ['BRANCH_OPEN[1,7)', 'BRANCH_OPEN[3,7)']);
});

test('LOCANT_COUNT: locants that do not match the multiplier', () => {
  let error = errorOf('2 3 tri met il pent ano', 'LOCANT_COUNT');
  assert.deepEqual([error.from, error.to], [0, 3]);
  assert.equal(error.message, 'Has puesto 2 números (2,3), pero «tri» quiere decir tres grupos.');
  error = errorOf('2 3 met il pent ano', 'LOCANT_COUNT');
  assert.deepEqual([error.from, error.to], [0, 2]);
  assert.equal(error.message, 'Con dos números hace falta «di».');
  assert.equal(errorOf('5 5 START 2 met il prop il END non ano', 'LOCANT_COUNT').message, 'Con dos números hace falta «bis».');
  // In an unsaturation segment, and for the free-valence locant of a branch.
  error = errorOf('but 1 di eno', 'LOCANT_COUNT');
  assert.deepEqual([error.from, error.to], [1, 3]);
  assert.equal(error.message, 'Has puesto 1 número (1), pero «di» quiere decir dos enlaces dobles.');
  error = errorOf('5 prop 1 2 il non ano', 'LOCANT_COUNT');
  assert.deepEqual([error.from, error.to], [2, 4]);
  assert.equal(error.message, 'Una rama se une a la cadena por un solo carbono: delante de «il» va un solo número.');
  // Left-out locants are not a count error (R-1c).
  assert.deepEqual(errorsOf('di met il prop ano'), []);
}); // End of test 'LOCANT_COUNT: locants that do not match the multiplier'

test('LEGACY: old-style locants that cannot be allocated', () => {
  const error = errorOf('1 3 hex eno ino', 'LEGACY');
  assert.deepEqual([error.from, error.to], [0, 2]);
  assert.equal(error.message, 'Con la forma antigua no sé a qué enlace va cada número: escríbelos detrás de la raíz (hex-1-en-3-ino).');
  assert.deepEqual(errorsOf('2 but 2 eno'), ['LEGACY[0,1)']); // every segment has its locants
  assert.deepEqual(errorsOf('2 but ano'), ['LEGACY[0,1)']); // no segment at all
  assert.deepEqual(errorsOf('1 3 but eno'), ['LEGACY[0,2)']); // two numbers for one double bond
});

test('TILE_ORDER: a tile that cannot go where it is', () => {
  let error = errorOf('eno hex ano', 'TILE_ORDER');
  assert.deepEqual([error.from, error.to], [0, 1]);
  assert.equal(error.message, 'Esta ficha no puede ir aquí: «ano», «eno» e «ino» van detrás de una raíz (butano, but-2-eno).');
  // Tiles after the parent.
  error = errorOf('hex ano 2 met il', 'TILE_ORDER');
  assert.deepEqual([error.from, error.to], [2, 5]);
  assert.match(error.message, /^Estas fichas no pueden ir aquí: el nombre termina con la cadena principal/);
  // «acaba rama» with no open branch, and closing a branch that has no chain of its own.
  assert.deepEqual(errorsOf('met il END but ano'), ['TILE_ORDER[2,3)']);
  assert.deepEqual(errorsOf('2 START 2 met il END hex ano'), ['TILE_ORDER[5,6)']);
  // `ano` with `il` but no locant (`propil`), `bis` before `eno`, a third segment, a multiplier before the parent's root.
  assert.deepEqual(errorsOf('3 prop ano il hex ano'), ['TILE_ORDER[2,3)']);
  assert.deepEqual(errorsOf('but 1 2 bis eno'), ['TILE_ORDER[3,4)']);
  assert.deepEqual(errorsOf('hex 1 eno 3 eno 5 ino'), ['TILE_ORDER[5,7)']);
  assert.deepEqual(errorsOf('di but 1 eno'), ['TILE_ORDER[0,1)']);
  // Numbers before a closing control.
  assert.deepEqual(errorsOf('2 START 2 met il prop il 3 END hex ano'), ['TILE_ORDER[7,8)', 'TILE_ORDER[8,9)']);
}); // End of test 'TILE_ORDER: a tile that cannot go where it is'

test('rings (R-4a): `ciclo` before the root of the parent or of a branch, as a chain node with its ring tile', () => {
  // `ciclohexano`: the parent's chain holds `ciclo`, the root and `ano`.
  let { tree } = read('ciclo hex ano');
  assert.deepEqual([tree.parent.chain.ring, tree.parent.chain.root, tree.parent.chain.ano], [0, 1, 2]);
  assert.deepEqual(tree.parent.range, [0, 3]);
  // `ciclohexil`, `ciclohexiliden`, `(ciclohex-2-en-1-il)`: ring branches with their free valence.
  ({ tree } = read('ciclo hex il met ano'));
  assert.deepEqual([tree.items[0].substituent.ring, tree.items[0].substituent.fv], [0, 2]);
  assert.deepEqual(tree.items[0].substituent.range, [0, 3]);
  ({ tree } = read('ciclo hex iliden met ano'));
  assert.equal(tree.tiles[tree.items[0].substituent.fv].value, 2);
  ({ tree } = read('2 ciclo hex 2 eno 1 il prop ano'));
  const branch = tree.items[0].substituent;
  assert.deepEqual([branch.ring, branch.segments.length, branch.fvLocants], [1, 1, [5]]);
  // A ring as the own chain of a compound branch, and as one of its prefixes.
  ({ tree } = read('START 2 met il ciclo hex il END met ano'));
  assert.equal(tree.items[0].substituent.chain.ring, 4);
  ({ tree } = read('2 START ciclo hex il met il END but ano'));
  assert.equal(tree.items[0].substituent.items[0].substituent.ring, 2);
  // Old style on a ring: `1,3-ciclohexadieno`.
  let errors;
  ({ tree, errors } = read('1 3 ciclo hex di eno'));
  assert.deepEqual(errors, []);
  assert.deepEqual([tree.parent.legacy, tree.parent.legacySegment, tree.parent.chain.ring], [[0, 1], 0, 2]);
}); // End of test 'rings (R-4a): `ciclo` before the root of the parent or of a branch…'

test('RING_ROOT: `ciclo` without a root after it', () => {
  const error = errorOf('ciclo', 'RING_ROOT');
  assert.deepEqual([error.from, error.to], [0, 1]);
  assert.equal(error.message,
    'Después de «ciclo» va una raíz que dice cuántos carbonos tiene el anillo: ciclopropano, ciclohexano, ciclohexil…');
  // Only RING_ROOT for an unfinished ring at the end (no ROOT_END or NO_PARENT on top of it).
  assert.deepEqual(errorsOf('2 ciclo'), ['RING_ROOT[1,2)']);
  assert.deepEqual(errorsOf('met il ciclo'), ['RING_ROOT[2,3)']);
  // Before another tile: that tile is read on its own.
  assert.deepEqual(errorsOf('ciclo ciclo hex ano'), ['RING_ROOT[0,1)']);
  assert.deepEqual(errorsOf('ciclo ano'), ['RING_ROOT[0,1)', 'NO_PARENT[0,2)', 'TILE_ORDER[1,2)']);
}); // End of test 'RING_ROOT: `ciclo` without a root after it'

test('RING_SIZE: a ring needs at least three carbons', () => {
  assert.equal(MIN_RING, 3);
  const error = errorOf('ciclo et ano', 'RING_SIZE');
  assert.deepEqual([error.from, error.to], [0, 2]);
  assert.equal(error.message, 'Un anillo tiene por lo menos 3 carbonos: el más pequeño es el ciclopropano.');
  assert.deepEqual(errorsOf('ciclo met il prop ano'), ['RING_SIZE[0,2)']);
  assert.deepEqual(errorsOf('ciclo prop ano'), []);
});

test('ROOT_END on a ring: «ciclohex» needs its ending, as the main ring or as a branch', () => {
  const error = errorOf('ciclo hex', 'ROOT_END');
  assert.deepEqual([error.from, error.to], [0, 2]);
  assert.equal(error.message,
    'Después de «ciclohex» va una terminación: «ano», «eno» o «ino» si es el anillo principal, o «il» si es una rama.');
  assert.deepEqual(errorsOf('ciclo hex met il prop ano'), ['ROOT_END[0,2)']);
  assert.equal(errorOf('ciclo hex il', 'ENDS_WITH_BRANCH').message, 'El nombre acaba en una rama («ciclohexil»): falta la cadena principal detrás.');
}); // End of test 'ROOT_END on a ring…'

test('benzene (R-4b): `benceno` is the parent node, `fenil` a retained word that may own a compound branch', () => {
  // `1,2-dimetilbenceno`: one prefix, the parent a benzene node holding its one tile.
  let { tree } = read('1 2 di met il benceno');
  assert.deepEqual(tree.parent.chain, { type: 'benzene', tile: 5, range: [5, 6] });
  assert.deepEqual([tree.parent.legacy, tree.parent.legacyMultiplier, tree.parent.range], [[], null, [5, 6]]);
  assert.equal(tree.items.length, 1);
  ({ tree } = read('benceno'));
  assert.deepEqual([tree.items.length, tree.parent.chain.tile], [0, 0]);
  // `fenil`: a simple retained branch; with prefixes of its own, the own chain of a compound branch.
  ({ tree } = read('fenil met ano'));
  assert.deepEqual(tree.items[0].substituent, { type: 'retained', tile: 0, oxi: null, range: [0, 1] }); // `oxi`: R-5b
  ({ tree } = read('START 4 met il fenil END met ano'));
  const branch = tree.items[0].substituent;
  assert.deepEqual([branch.type, branch.items.length, branch.chain.type, branch.chain.tile, branch.end], ['branch', 1, 'retained', 4, 5]);
  assert.ok(isCompleteSubstituent(branch));
  // A phenyl prefix of a phenyl's branch stays a prefix of that branch.
  ({ tree } = read('START 4 prop ano 2 il fenil END met ano'));
  assert.equal(tree.items[0].substituent.items[0].substituent.type, 'chain');
}); // End of test 'benzene (R-4b): `benceno` is the parent node…'

test('BENZENE_BONDS: `benceno` takes no numbers of its own, before it or after it', () => {
  const error = errorOf('1 3 5 benceno', 'BENZENE_BONDS');
  assert.deepEqual([error.from, error.to], [0, 3]);
  assert.equal(error.message,
    'El benceno no lleva números propios: sus enlaces dobles no se numeran. Los números van delante de cada rama (1,2-dimetilbenceno).');
  assert.deepEqual(errorsOf('1 3 5 tri benceno'), ['BENZENE_BONDS[0,4)']);
  assert.deepEqual(errorsOf('di benceno'), ['BENZENE_BONDS[0,1)']);
  // After a prefix, the numbers before `benceno` belong to it: `2-metil-3-benceno`.
  assert.deepEqual(errorsOf('2 met il 3 benceno'), ['BENZENE_BONDS[3,4)']);
  // After `benceno`: numbers, multipliers and endings number its double bonds; anything else is out of place.
  assert.deepEqual(errorsOf('benceno 1 3 5 tri eno'), ['BENZENE_BONDS[1,6)']);
  assert.deepEqual(errorsOf('benceno eno'), ['BENZENE_BONDS[1,2)']);
  assert.deepEqual(errorsOf('benceno met il'), ['TILE_ORDER[1,3)']);
  // `benceno` inside a compound branch is out of place: as a branch it is `fenil`.
  const inside = errorOf('START benceno END met ano', 'TILE_ORDER');
  assert.deepEqual([inside.from, inside.to], [1, 2]);
  assert.equal(inside.message, 'Esta ficha no puede ir aquí: «benceno» es el anillo principal y va al final del nombre; como rama, '
    + 'el benceno se escribe «fenil».');
  assert.deepEqual(errorsOf('2 START 2 benceno END but ano'), ['TILE_ORDER[2,3)', 'TILE_ORDER[3,4)', 'TILE_ORDER[4,5)']);
}); // End of test 'BENZENE_BONDS: `benceno` takes no numbers of its own…'

test('errors come sorted by position', () => {
  const { errors } = read('il 2 3 tri met il but');
  assert.deepEqual(errors.map((e) => e.code), ['TILE_ORDER', 'LOCANT_COUNT', 'ROOT_END']);
  assert.ok(errors.every((e, i) => i === 0 || errors[i - 1].from <= e.from));
});

test('parse accepts tiles as well as ids, and rejects unknown ids', () => {
  assert.deepEqual(parse(seq('hex ano').map(tileById)).errors, []);
  assert.throws(() => parse(['root-6', 'nope']), /unknown tile/);
});
