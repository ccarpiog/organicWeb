/**
 * @file Unit tests for the retained templates and the orto/meta/para letters
 * of «¿Cómo se dibuja?» (src/reverse/, design.md §14.4, §14.5, §15.5.3,
 * §15.7, §15.8 R-4; phase I-50c, R-4c): the tiles `tolueno`, `estireno`,
 * `xileno`, `mesitileno` and `o`, `m`, `p` through the parser (the tree and
 * the errors TEMPLATE_LOCANTS, POSITIONAL, LOCANT_COUNT, TILE_ORDER with their
 * tile ranges), the assembler, interpret.js, build.js and search.js (the
 * template's groups on the ring, the left-out positions of `xileno`), and
 * readName(): every form the engine gives read as `alternative` with the
 * engine's own label, the molecule compared by aromatic key; the o/m/p rules
 * of §14.4 (allowed and refused cases); substituted templates, which the
 * engine never writes, read as `otherName` / `ambiguous`; left-out locants on
 * a template; mutations; the ordered drawing; the diagnosis (I-50d); time budgets.
 * The fixture round trip and the closed loop over these names are in
 * reverse-benzene.test.js and reverse-tokenize.test.js.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName, VERDICT_TEXTS } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, checkSpec, specCarbons, templateGroups } from '../../src/reverse/build.js';
import { searchStructures, slotGroups, filledTree, SEARCH_BUDGET } from '../../src/reverse/search.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { RING_SYSTEM_MESSAGES } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { styleLabel, traditionalLabel } from '../../src/naming/lexicon.es.js';
import { seq } from './reverse-words.js';

/** Time budget of one representative template readName() call, in milliseconds (design.md §15.7; phones are slower). */
const PER_NAME_BUDGET_MS = 250;

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
 * The NameSpec of error-free tile words.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {object} The NameSpec.
 */
function specOf(words) {
  const { tree, errors } = read(words);
  assert.deepEqual(errors, [], words);
  return interpret(tree);
}

/**
 * The aromatic-equivalence key of a SMILES molecule.
 *
 * @param {string} smiles - A SMILES (Kekulé form).
 * @returns {string} aromaticKey() of its graph.
 */
function keyOf(smiles) {
  return aromaticKey(parseSmiles(smiles));
}

/**
 * The `otherName` message (design.md §15.3).
 *
 * @param {string} name - The engine's name.
 * @returns {string} The message.
 */
function otherNameMessage(name) {
  return `Esta es la molécula que describe tu nombre, pero se llama «${name}». Pulsa «Ver paso a paso» para ver por qué.`;
}

test('parse (R-4c): a template is the parent node; `xileno` keeps its locants or letter; a letter stays on its prefix', () => {
  // 0:tolueno
  let { tree } = read('tolueno');
  assert.deepEqual([tree.parent.chain, tree.parent.legacy, tree.parent.letter], [{ type: 'template', tile: 0, range: [0, 1] }, [], null]);
  // 0:1 1:2 2:xileno
  ({ tree } = read('1 2 xileno'));
  assert.deepEqual([tree.parent.legacy, tree.parent.letter, tree.parent.chain.tile, tree.parent.range], [[0, 1], null, 2, [0, 3]]);
  // 0:o 1:xileno
  ({ tree } = read('o xileno'));
  assert.deepEqual([tree.parent.legacy, tree.parent.letter, tree.parent.chain.tile], [[], 0, 1]);
  // 0:p 1:di 2:met 3:il 4:benceno — the letter belongs to the prefix, before its multiplier.
  ({ tree } = read('p di met il benceno'));
  assert.deepEqual([tree.items[0].locants, tree.items[0].letter, tree.items[0].multiplier, tree.parent.chain.type], [[], 0, 1, 'benzene']);
  // 0:4 1:met 2:il 3:tolueno — a prefix on a template, numbered on its ring.
  ({ tree } = read('4 met il tolueno'));
  assert.deepEqual([tree.items[0].locants, tree.items[0].letter, tree.parent.chain.type], [[0], null, 'template']);
}); // End of test 'parse (R-4c): a template is the parent node…'

test('TEMPLATE_LOCANTS: `tolueno`, `estireno` and `mesitileno` place their groups themselves (numbers or a letter on them)', () => {
  const cases = [
    ['1 tolueno', [0, 1], '«tolueno» ya dice dónde va su metilo, en el carbono 1: no lleva números ni letras propios.'],
    ['o tolueno', [0, 1], '«tolueno» ya dice dónde va su metilo, en el carbono 1: no lleva números ni letras propios.'],
    ['1 estireno', [0, 1], '«estireno» ya dice dónde va su etenilo, en el carbono 1: no lleva números ni letras propios.'],
    ['1 3 5 mesitileno', [0, 3],
      '«mesitileno» ya dice dónde van sus tres metilos, en los carbonos 1, 3 y 5: no lleva números ni letras propios.'],
    ['2 met il 1 p tolueno', [3, 5], '«tolueno» ya dice dónde va su metilo, en el carbono 1: no lleva números ni letras propios.'],
  ];
  for (const [words, [from, to], message] of cases) {
    const error = read(words).errors.find((e) => e.code === 'TEMPLATE_LOCANTS');
    assert.ok(error, `${words}: ${errorsOf(words).join(' ')}`);
    assert.deepEqual([error.from, error.to, error.message], [from, to, message], words);
  }
}); // End of test 'TEMPLATE_LOCANTS…'

test('`xileno` takes two numbers or a letter (LOCANT_COUNT); a multiplier or a compound branch is no place for a template', () => {
  for (const words of ['1 xileno', '1 2 3 xileno']) {
    const [error] = read(words).errors;
    assert.equal(error.code, 'LOCANT_COUNT', words);
    assert.equal(error.message, 'Con «xileno» van dos números, los de sus dos metilos (1,2-xileno), o una letra (o-xileno).');
  }
  assert.deepEqual(errorsOf('1 2 3 xileno'), ['LOCANT_COUNT[0,3)']);
  assert.deepEqual(errorsOf('di tolueno'), ['TILE_ORDER[0,1)']);
  assert.match(read('di tolueno').errors[0].message, /no delante de «tolueno»\.$/);
  assert.deepEqual(errorsOf('START tolueno END met ano'), ['TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']);
  assert.match(read('START xileno END met ano').errors[0].message, /«xileno» es el nombre de toda la molécula y va al final/);
  assert.deepEqual(errorsOf('xileno 1 2'), ['TILE_ORDER[1,3)']); // Nothing follows the parent.
}); // End of test '`xileno` takes two numbers or a letter…'

/**
 * The o/m/p letter forms of design.md §14.4 the parser accepts: exactly two
 * occupied ring positions, a template's own group counting as one.
 */
const ALLOWED_LETTERS = [
  'o di met il benceno', 'm di met il benceno', 'p di met il benceno', 'p di et eno il benceno', 'o di isopropil benceno',
  'o di tert-butil benceno', 'o bis START 2 met il prop il END benceno', 'o xileno', 'm xileno', 'p xileno',
  'p met il tolueno', 'o et il tolueno', 'm met il estireno',
];

/** Refused letter forms: [tile words, error range, start of the message]. */
const REFUSED_LETTERS = [
  // Three or more occupied positions (never with three or more, §14.4), the template's groups counted.
  ['o tri met il benceno', [0, 1], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre pone tres:'],
  ['p di met il tolueno', [0, 1], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre pone tres '
    + '(contando el metilo del tolueno):'],
  ['4 met il o xileno', [3, 4], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre pone tres '
    + '(contando los dos metilos del xileno):'],
  ['o met il mesitileno', [0, 1], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre pone cuatro '
    + '(contando los tres metilos del mesitileno):'],
  ['o di met il 4 et il benceno', [0, 1], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre '
    + 'pone tres:'],
  // Two different prefixes on plain benzene (never, §14.4: `m-cloroetilbenceno`).
  ['m et il met il benceno', [0, 1], 'Con dos grupos distintos en el benceno no se usan «o», «m» ni «p»: escribe los números'],
  ['o met il START et il END benceno', [0, 1], 'Con dos grupos distintos en el benceno no se usan «o», «m» ni «p»'],
  // One occupied position only.
  ['o met il benceno', [0, 1], 'Las letras «o», «m» y «p» dicen dónde está el segundo de dos grupos del benceno; con un solo grupo'],
  // Numbers and a letter on one prefix or on `xileno`.
  ['1 2 o di met il benceno', [0, 3], 'Escribe los números (1,2-dimetilbenceno) o la letra (o-dimetilbenceno), no las dos cosas.'],
  ['1 2 o xileno', [0, 3], 'Escribe los números (1,2-xileno) o la letra (o-xileno), no las dos cosas.'],
  // Not on the parent benzene ring: another parent, a compound branch, before `benceno`.
  ['o di met il hex ano', [0, 1], 'Las letras «o», «m» y «p» (orto, meta y para) solo se usan con el benceno'],
  ['o ciclo hex ano', [0, 1], 'Las letras «o», «m» y «p» (orto, meta y para) solo se usan con el benceno'],
  ['START p met il fenil END met ano', [1, 2], 'Dentro de una rama no se usan «o», «m» ni «p»: escribe los números, como en '
    + '(4-metilfenil).'],
  ['o benceno', [0, 1], 'Las letras «o», «m» y «p» van delante de los dos grupos del benceno que sitúan'],
];

test('o/m/p letters (design.md §14.4): exactly two occupied positions; refused with three, with two different prefixes…', () => {
  for (const words of ALLOWED_LETTERS) {
    assert.deepEqual(errorsOf(words), [], words);
  }
  for (const [words, [from, to], message] of REFUSED_LETTERS) {
    const error = read(words).errors.find((e) => e.code === 'POSITIONAL');
    assert.ok(error, `${words}: ${errorsOf(words).join(' ')}`);
    assert.deepEqual([error.from, error.to], [from, to], words);
    assert.ok(error.message.startsWith(message), `${words}: ${error.message}`);
  }
  // A letter with nothing it can stand before is TILE_ORDER; with no parent at all, NO_PARENT says it first.
  assert.deepEqual(errorsOf('o 2 met il benceno'), ['TILE_ORDER[0,1)']);
  assert.deepEqual(errorsOf('o'), ['NO_PARENT[0,1)']);
}); // End of test 'o/m/p letters (design.md §14.4)…'

test('assemble (R-4c): `xileno` after its locants, letters punctuated as locants, spans of kind locant / stem', () => {
  const cases = [
    ['tolueno', 'tolueno'], ['1 2 xileno', '1,2-xileno'], ['o xileno', 'o-xileno'], ['p di met il benceno', 'p-dimetilbenceno'],
    ['p di et eno il benceno', 'p-dietenilbenceno'], ['o di tert-butil benceno', 'o-di-tert-butilbenceno'],
    ['o bis START 2 met il prop il END benceno', 'o-bis(2-metilpropil)benceno'], ['4 met il 1 2 xileno', '4-metil-1,2-xileno'],
    ['p met il tolueno', 'p-metiltolueno'], ['2 et il mesitileno', '2-etilmesitileno'],
    // Wrong sequences still assemble, every tile kept.
    ['1 2 o xileno', '1,2,o-xileno'], ['di tolueno', 'ditolueno'], ['o hex ano', 'o-hexano'],
  ];
  for (const [words, text] of cases) {
    assert.equal(assemble(read(words).tree).text, text, words);
  }
  const { spans, text } = assemble(read('o xileno').tree);
  assert.deepEqual(spans.map((s) => [text.slice(s.from, s.to), s.tile, s.kind]), [['o', 0, 'locant'], ['-', null, 'punct'], ['xileno', 1, 'stem']]);
  const prefixed = assemble(read('p di met il benceno').tree);
  assert.deepEqual(prefixed.spans.slice(0, 3).map((s) => [prefixed.text.slice(s.from, s.to), s.kind]), [['p', 'locant'], ['-', 'punct'],
    ['di', 'multiplier']]);
}); // End of test 'assemble (R-4c)…'

test('interpret (R-4c): a template is a benzene parent with its own groups; letters give supplied slots', () => {
  // `tolueno`: one methyl at carbon 1, implicit, on the template tile.
  let spec = specOf('tolueno');
  assert.equal(spec.parent.kind, 'benzene');
  assert.deepEqual(spec.traditional, { value: 'toluene', tiles: [0, 1] });
  const [methyl] = spec.parent.template.groups;
  assert.deepEqual(methyl.slots, [{ kind: 'implicit', value: 1, role: 'carbon', domain: [1, 6], tiles: [0, 1] }]);
  assert.deepEqual([methyl.substituent.kind, methyl.substituent.length, methyl.substituent.double], ['chain', 1, []]);
  assert.deepEqual([spec.prefixes, spec.leftOut, spec.oldStyle], [[], [], false]);
  // `estireno`: the ethenyl's double bond implicit at its bond 1.
  spec = specOf('estireno');
  assert.deepEqual(spec.parent.template.groups[0].substituent.double.map((slot) => [slot.kind, slot.value, slot.role]), [['implicit', 1, 'bond']]);
  // `mesitileno`: carbons 1, 3, 5.
  assert.deepEqual(specOf('mesitileno').parent.template.groups[0].slots.map((slot) => slot.value), [1, 3, 5]);
  // `1,2-xileno`: the student's numbers are supplied; not old style.
  spec = specOf('1 2 xileno');
  assert.deepEqual(spec.parent.template.groups[0].slots.map((slot) => [slot.kind, slot.value, slot.tiles]), [['supplied', 1, [0, 1]],
    ['supplied', 2, [1, 2]]]);
  assert.equal(spec.oldStyle, false);
  // `o-xileno`: 1 and 2 from the letter.
  assert.deepEqual(specOf('o xileno').parent.template.groups[0].slots.map((slot) => [slot.kind, slot.value, slot.letter, slot.tiles]),
    [['supplied', 1, true, [0, 1]], ['supplied', 2, true, [0, 1]]]);
  // `xileno`: two left-out slots on the template tile, searched like those of `dimetilbenceno`.
  spec = specOf('xileno');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.kind, slot.role, slot.domain, slot.tiles]), [['leftOut', 'carbon', [1, 6], [0, 1]],
    ['leftOut', 'carbon', [1, 6], [0, 1]]]);
  // `p-dimetilbenceno`: the letter's prefix at 1 and 4; `p-metiltolueno`: at 4 (the template's methyl is at 1).
  assert.deepEqual(specOf('p di met il benceno').prefixes[0].slots.map((slot) => [slot.value, slot.letter]), [[1, true], [4, true]]);
  assert.deepEqual(specOf('p met il tolueno').prefixes[0].slots.map((slot) => slot.value), [4]);
  assert.equal(specOf('met il benceno').parent.template, null);
}); // End of test 'interpret (R-4c)…'

test('build (R-4c): the template\'s groups on the ring, the student\'s prefixes on the same numbering; template errors worded', () => {
  for (const [words, smiles] of [['tolueno', 'CC1=CC=CC=C1'], ['estireno', 'C=CC1=CC=CC=C1'], ['mesitileno', 'CC1=CC(C)=CC(C)=C1'],
    ['o xileno', 'CC1=CC=CC=C1C'], ['1 3 xileno', 'CC1=CC(C)=CC=C1'], ['4 met il tolueno', 'CC1=CC=C(C)C=C1'],
    ['2 et il mesitileno', 'CCC1=C(C)C=C(C)C=C1C'], ['p met il estireno', 'C=CC1=CC=C(C)C=C1']]) {
    const spec = specOf(words);
    const built = build(spec, []);
    assert.ok(built.ok, words);
    assert.equal(aromaticKey(built.molecule), keyOf(smiles), words);
    assert.equal(built.studentParent.atoms.length, 6, `${words}: the ring is the parent`);
    assert.equal(built.prefixAtoms.length, spec.prefixes.reduce((n, p) => n + p.slots.length, 0), `${words}: only the student's prefixes`);
  }
  assert.equal(specCarbons(specOf('mesitileno')), 9);
  assert.equal(specCarbons(specOf('2 et il estireno')), 10);
  assert.equal(templateGroups(specOf('met il benceno')).length, 0);
  // A branch on a carbon the template already filled: VALENCE on the student's locant, saying why.
  const cases = [
    ['1 met il tolueno', 'VALENCE', [0, 1], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el tolueno, ese carbono '
      + 'ya lleva un metilo.'],
    ['3 met il mesitileno', 'VALENCE', [0, 1], 'El carbono 3 tendría 5 enlaces, y un carbono solo puede tener 4: en el mesitileno, ese '
      + 'carbono ya lleva un metilo.'],
    ['1 et il estireno', 'VALENCE', [0, 1], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el estireno, ese carbono '
      + 'ya lleva un etenilo.'],
    ['1 1 xileno', 'VALENCE', [1, 2], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4.'],
    ['7 met il tolueno', 'LOCANT_RANGE', [0, 1], 'El anillo del tolueno tiene 6 carbonos, del 1 al 6: no hay carbono 7.'],
    ['1 7 xileno', 'LOCANT_RANGE', [1, 2], 'El anillo del xileno tiene 6 carbonos, del 1 al 6: no hay carbono 7.'],
  ];
  for (const [words, code, tiles, message] of cases) {
    const spec = specOf(words);
    const error = checkSpec(spec) || build(spec, []).error;
    assert.deepEqual([error.code, error.tiles, error.message], [code, tiles, message], words);
  }
}); // End of test 'build (R-4c)…'

test('search (R-4c): the template\'s groups fill their carbons; `xileno` without positions is one group, three structures', () => {
  const namer = nameMolecule;
  // `xileno`: its two methyls are one group of identical left-out slots (combinations, never permutations).
  const xylene = specOf('xileno');
  assert.deepEqual(slotGroups(xylene).map((g) => [g.role, g.distinct, g.indices, g.tiles]), [['carbon', false, [0, 1], [0, 1]]]);
  const result = searchStructures(xylene, { namer });
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.structures.map((s) => s.naming.name), ['1,2-dimetilbenceno', '1,3-dimetilbenceno', '1,4-dimetilbenceno']);
  // Each filled with its own locants written before the template.
  const { tree } = read('xileno');
  assert.deepEqual(result.structures.map((s) => assemble(filledTree(tree, xylene, s.placements[0])).text),
    ['1,2-xileno', '1,3-xileno', '1,4-xileno']);
  // `etiltolueno`: carbon 1 holds the methyl, so the ethyl goes on 2…6 — three structures (2 / 3 / 4, by symmetry).
  const ethyl = searchStructures(specOf('et il tolueno'), { namer });
  assert.ok(ethyl.structures.every((s) => s.placements.every(([value]) => value !== 1)));
  assert.deepEqual(ethyl.structures.map((s) => s.naming.name), ['1-etil-2-metilbenceno', '1-etil-3-metilbenceno', '1-etil-4-metilbenceno']);
  // `metilmesitileno`: the free carbons 2, 4, 6 are equivalent — one structure; `hexametiltolueno` has no room.
  assert.equal(searchStructures(specOf('met il mesitileno'), { namer }).structures.length, 1);
  const full = searchStructures(specOf('hexa met il tolueno'), { namer });
  assert.deepEqual([full.status, full.error.code], ['none', 'VALENCE']);
}); // End of test 'search (R-4c)…'

/**
 * Every template and o/m/p form the engine gives (aromatic.js
 * benzeneAlternatives(); design.md §14.4–§14.5): [tile words, the text, the
 * engine's name, the alternative's style, SMILES].
 */
const ALTERNATIVES = [
  ['tolueno', 'tolueno', 'metilbenceno', 'traditional', 'CC1=CC=CC=C1'],
  ['estireno', 'estireno', 'etenilbenceno', 'traditional', 'C=CC1=CC=CC=C1'],
  ['mesitileno', 'mesitileno', '1,3,5-trimetilbenceno', 'traditional', 'CC1=CC(C)=CC(C)=C1'],
  ['1 2 xileno', '1,2-xileno', '1,2-dimetilbenceno', 'traditional', 'CC1=CC=CC=C1C'],
  ['1 3 xileno', '1,3-xileno', '1,3-dimetilbenceno', 'traditional', 'CC1=CC(C)=CC=C1'],
  ['1 4 xileno', '1,4-xileno', '1,4-dimetilbenceno', 'traditional', 'CC1=CC=C(C)C=C1'],
  ['o xileno', 'o-xileno', '1,2-dimetilbenceno', 'traditional', 'CC1=CC=CC=C1C'],
  ['m xileno', 'm-xileno', '1,3-dimetilbenceno', 'traditional', 'CC1=CC(C)=CC=C1'],
  ['p xileno', 'p-xileno', '1,4-dimetilbenceno', 'traditional', 'CC1=CC=C(C)C=C1'],
  ['o di met il benceno', 'o-dimetilbenceno', '1,2-dimetilbenceno', 'positional', 'CC1=CC=CC=C1C'],
  ['m di met il benceno', 'm-dimetilbenceno', '1,3-dimetilbenceno', 'positional', 'CC1=CC(C)=CC=C1'],
  ['p di met il benceno', 'p-dimetilbenceno', '1,4-dimetilbenceno', 'positional', 'CC1=CC=C(C)C=C1'],
  ['p di et eno il benceno', 'p-dietenilbenceno', '1,4-dietenilbenceno', 'positional', 'C=CC1=CC=C(C=C)C=C1'],
  ['m di et ino il benceno', 'm-dietinilbenceno', '1,3-dietinilbenceno', 'positional', 'C#CC1=CC(C#C)=CC=C1'],
  ['o di isopropil benceno', 'o-diisopropilbenceno', '1,2-diisopropilbenceno', 'positional', 'CC(C)C1=CC=CC=C1C(C)C'],
  ['o di tert-butil benceno', 'o-di-tert-butilbenceno', '1,2-di-tert-butilbenceno', 'positional', 'CC(C)(C)C1=CC=CC=C1C(C)(C)C'],
  ['o bis START 2 met il prop il END benceno', 'o-bis(2-metilpropil)benceno', '1,2-bis(2-metilpropil)benceno', 'positional',
    'CC(C)CC1=CC=CC=C1CC(C)C'],
  ['p di et il benceno', 'p-dietilbenceno', '1,4-dietilbenceno', 'positional', 'CCC1=CC=C(CC)C=C1'],
];

test('readName (R-4c): every template and o/m/p form the engine gives is an alternative, with the engine\'s own label', () => {
  for (const [words, text, name, style, smiles] of ALTERNATIVES) {
    const verdict = readName(seq(words));
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, 'alternative', `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.equal(verdict.matched.name, text);
    assert.equal(verdict.matched.style, style, text);
    assert.equal(verdict.message, `${VERDICT_TEXTS.correct} «${text}» es una forma válida (${verdict.matched.label}). `
      + `El nombre que doy primero es «${name}».`);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    assert.deepEqual([verdict.draw, verdict.errors], [true, []]);
    assert.deepEqual(tokenize(text), seq(words), `${text}: the tiles read back`);
  } // End of the loop over the alternatives
  // Kept apart (§14.4): `p-xileno` is a retained name with the traditional label, `p-dimetilbenceno` the old positional form.
  assert.equal(readName(seq('p xileno')).matched.label, traditionalLabel('pXylene'));
  assert.equal(readName(seq('p di met il benceno')).matched.label, styleLabel('positional'));
  assert.equal(readName(seq('tolueno')).matched.label, 'nombre tradicional, que la IUPAC (2013) conserva como preferido');
}); // End of test 'readName (R-4c): every template and o/m/p form the engine gives is an alternative…'

/**
 * Names the engine never gives — a substituted template (§14.5: never a
 * substituted tolueno, xileno or mesitileno) or a template numbered
 * otherwise —, with the molecule they describe: [tile words, text, kind,
 * the engine's name, SMILES].
 */
const OTHER_NAMES = [
  ['4 met il tolueno', '4-metiltolueno', 'otherName', '1,4-dimetilbenceno', 'CC1=CC=C(C)C=C1'],
  ['p met il tolueno', 'p-metiltolueno', 'otherName', '1,4-dimetilbenceno', 'CC1=CC=C(C)C=C1'],
  ['o et il tolueno', 'o-etiltolueno', 'otherName', '1-etil-2-metilbenceno', 'CCC1=CC=CC=C1C'],
  ['m met il estireno', 'm-metilestireno', 'otherName', '1-etenil-3-metilbenceno', 'C=CC1=CC(C)=CC=C1'],
  ['2 4 di met il tolueno', '2,4-dimetiltolueno', 'otherName', '1,2,4-trimetilbenceno', 'CC1=CC=C(C)C(C)=C1'],
  ['2 met il mesitileno', '2-metilmesitileno', 'otherName', '1,2,3,5-tetrametilbenceno', 'CC1=CC(C)=C(C)C(C)=C1'],
  ['4 met il 1 2 xileno', '4-metil-1,2-xileno', 'otherName', '1,2,4-trimetilbenceno', 'CC1=CC=C(C)C(C)=C1'],
  // Mutations of the xylene locants: reversed, not ascending, misnumbered.
  ['1 6 xileno', '1,6-xileno', 'otherName', '1,2-dimetilbenceno', 'CC1=CC=CC=C1C'],
  ['2 3 xileno', '2,3-xileno', 'otherName', '1,2-dimetilbenceno', 'CC1=CC=CC=C1C'],
  ['4 1 xileno', '4,1-xileno', 'otherName', '1,4-dimetilbenceno', 'CC1=CC=C(C)C=C1'],
  ['3 5 xileno', '3,5-xileno', 'otherName', '1,3-dimetilbenceno', 'CC1=CC(C)=CC=C1'],
  // di for bis on a letter form is another name too.
  ['p di START 2 met il prop il END benceno', 'p-di(2-metilpropil)benceno', 'otherName', '1,4-bis(2-metilpropil)benceno',
    'CC(C)CC1=CC=C(CC(C)C)C=C1'],
  // Left-out locants that one structure fills: a full ring.
  ['penta met il tolueno', 'pentametiltolueno', 'otherName', 'hexametilbenceno', 'CC1=C(C)C(C)=C(C)C(C)=C1C'],
  ['tetra met il xileno', 'tetrametilxileno', 'otherName', 'hexametilbenceno', 'CC1=C(C)C(C)=C(C)C(C)=C1C'],
  ['met il mesitileno', 'metilmesitileno', 'otherName', '1,2,3,5-tetrametilbenceno', 'CC1=CC(C)=C(C)C(C)=C1'],
];

test('readName (R-4c): a substituted or misnumbered template draws the molecule it describes, named by the app, with its diagnosis', () => {
  for (const [words, text, kind, name, smiles] of OTHER_NAMES) {
    const verdict = readName(seq(words));
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, kind, `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.equal(verdict.message, otherNameMessage(name));
    assert.ok(verdict.diagnosis && verdict.diagnosis.code, `${text}: a ring diagnosis (I-50d; its cases: reverse-diagnose-rings.test.js)`);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    assert.equal(verdict.draw, true);
  } // End of the loop over the other names
}); // End of test 'readName (R-4c): a substituted or misnumbered template…'

test('readName (R-4c): left-out locants on a template — the structures listed, `xileno` with its own forms', () => {
  const cases = [
    ['xileno', 'Faltan números: puede ser 1,2-xileno, 1,3-xileno o 1,4-xileno.', ['1,2-xileno', '1,3-xileno', '1,4-xileno']],
    ['met il tolueno', 'Faltan números: puede ser 1,2-dimetilbenceno, 1,3-dimetilbenceno o 1,4-dimetilbenceno.',
      ['1,2-dimetilbenceno', '1,3-dimetilbenceno', '1,4-dimetilbenceno']],
    ['et il tolueno', 'Faltan números: puede ser 1-etil-2-metilbenceno, 1-etil-3-metilbenceno o 1-etil-4-metilbenceno.',
      ['1-etil-2-metilbenceno', '1-etil-3-metilbenceno', '1-etil-4-metilbenceno']],
    ['met il estireno', 'Faltan números: puede ser 1-etenil-2-metilbenceno, 1-etenil-3-metilbenceno o 1-etenil-4-metilbenceno.',
      ['1-etenil-2-metilbenceno', '1-etenil-3-metilbenceno', '1-etenil-4-metilbenceno']],
    ['met il xileno', 'Faltan números: puede ser 1,2,3-trimetilbenceno, 1,2,4-trimetilbenceno o 1,3,5-trimetilbenceno.',
      ['1,2,3-trimetilbenceno', '1,2,4-trimetilbenceno', '1,3,5-trimetilbenceno']],
  ];
  for (const [words, message, texts] of cases) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'ambiguous', words);
    assert.equal(verdict.message, message, words);
    assert.deepEqual(verdict.candidates.map((c) => c.text), texts, words);
    assert.deepEqual([verdict.molecule, verdict.draw], [null, false]);
  }
  // The xylene's three molecules, by aromatic key.
  assert.deepEqual(readName(seq('xileno')).candidates.map((c) => aromaticKey(c.molecule)),
    [keyOf('CC1=CC=CC=C1C'), keyOf('CC1=CC(C)=CC=C1'), keyOf('CC1=CC=C(C)C=C1')]);
  // Out of budget: incomplete, never a claim.
  assert.equal(readName(seq('xileno'), { budget: { placements: 2 } }).kind, 'incomplete');
}); // End of test 'readName (R-4c): left-out locants on a template…'

test('readName (R-4c): refused o/m/p forms and template errors are invalid with their tiles marked; never a crash', () => {
  for (const [words, [from, to], message] of REFUSED_LETTERS) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    assert.equal(verdict.errors[0].code, 'POSITIONAL', words);
    assert.deepEqual([verdict.errors[0].from, verdict.errors[0].to], [from, to], words);
    assert.ok(verdict.message.startsWith(message), words);
    assert.deepEqual([verdict.molecule, verdict.draw], [null, false]);
  }
  for (const [words, code] of [['1 tolueno', 'TEMPLATE_LOCANTS'], ['1 xileno', 'LOCANT_COUNT'], ['di tolueno', 'TILE_ORDER'],
    ['1 met il tolueno', 'VALENCE'], ['7 met il tolueno', 'LOCANT_RANGE'], ['hexa met il tolueno', 'VALENCE'],
    ['tetra met il mesitileno', 'VALENCE']]) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.errors[0].code, verdict.draw], ['invalid', code, false], words);
  }
  // Two rings bonded together, or apart: out of scope, as for `benceno`.
  const several = `${VERDICT_TEXTS.outOfScope} ${RING_SYSTEM_MESSAGES.several}`;
  for (const words of ['fenil tolueno', 'START 4 met il fenil END tolueno', 'ciclo hex il xileno', 'START fenil met il END tolueno']) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.message, verdict.draw], ['outOfScope', several, false], words);
  }
}); // End of test 'readName (R-4c): refused o/m/p forms and template errors are invalid…'

test('readName (R-4c): `correct` for the systematic name still announces the retained names IUPAC keeps', () => {
  assert.equal(readName(seq('1 4 di met il benceno')).message, `${VERDICT_TEXTS.correct} `
    + 'También se llama «1,4-xileno» (nombre tradicional, que la IUPAC (2013) acepta). '
    + 'También se llama «p-xileno» (nombre tradicional, que la IUPAC (2013) acepta).');
  assert.equal(readName(seq('1 3 5 tri met il benceno')).message, `${VERDICT_TEXTS.correct} `
    + 'También se llama «mesitileno» (nombre tradicional, que la IUPAC (2013) acepta).');
}); // End of test 'readName (R-4c): `correct` for the systematic name still announces…'

test('«Dibujar» (R-4c): a template verdict has an ordered drawing (canonical layout without problems)', () => {
  for (const words of ['tolueno', 'estireno', 'mesitileno', 'o xileno', 'p di met il benceno', 'p met il tolueno', '4 met il 1 2 xileno',
    'penta met il tolueno', 'o bis START 2 met il prop il END benceno']) {
    const verdict = readName(seq(words));
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-4c): a template verdict has an ordered drawing…'

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

test('property (R-4c): random template names — prefixes with or without locants, letters anywhere — never crash', () => {
  const random = mulberry32(20261018);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['met il', 'et il', 'prop il', 'isopropil', 'tert-butil', 'et eno il', 'fenil', 'START 2 met il prop il END'];
  const parents = ['tolueno', 'estireno', 'xileno', '1 2 xileno', '1 3 xileno', 'o xileno', 'p xileno', 'mesitileno', 'benceno'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(0, 2) }, () => {
      const count = int(1, 3);
      const where = pick(['none', 'numbers', 'letter']);
      const locants = where === 'numbers' ? Array.from({ length: count }, () => int(1, 7)).join(' ') : '';
      return [where === 'letter' ? pick(['o', 'm', 'p']) : locants, multipliers[count], pick(branches)].join(' ');
    });
    const words = [...prefixes, pick(parents)].join(' ');
    const verdict = readName(seq(words));
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, words);
      assert.ok(aromaticKey(verdict.molecule).includes(':'), `${words}: a benzene ring is drawn`);
    } else {
      assert.equal(verdict.molecule === null || verdict.kind === 'outOfScope', true, words);
    }
  } // End of the loop over the random names
  // Every verdict kind that a template name can get shows up.
  for (const kind of ['alternative', 'otherName', 'ambiguous', 'invalid', 'outOfScope']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-4c): random template names…'

/** Representative template names for the time budget. */
const TIMED = ['tolueno', 'xileno', 'mesitileno', 'o xileno', 'p di met il benceno', 'met il tolueno', 'met il xileno',
  'tri met il tolueno', 'di met il xileno', 'tetra met il xileno', 'di et il mesitileno', 'tri met il estireno'];

test('time budget: each representative template readName() well within budget', () => {
  TIMED.forEach((words) => readName(seq(words))); // Warm-up.
  for (const words of TIMED) {
    const start = performance.now();
    const verdict = readName(seq(words));
    const elapsed = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', words);
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
    assert.ok(elapsed < SEARCH_BUDGET.ms);
  }
}); // End of test 'time budget: each representative template readName() well within budget'
