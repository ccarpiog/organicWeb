/**
 * @file Unit tests for the retained phenol templates of «¿Cómo se dibuja?»
 * (src/reverse/, design.md §13.6, §14.4, §14.5, §15.5.3, §15.7, §15.8 R-5a;
 * phase I-51a3a, R-5a3a): the «Nombres tradicionales» tiles `cresol`,
 * `pirocatecol`, `catecol`, `resorcinol`, `hidroquinona` through the parser
 * (the tree; TEMPLATE_LOCANTS — a letter or numbers on a diol, numbers on
 * `cresol` —, POSITIONAL with the OH groups counted, TILE_ORDER, with their
 * tile ranges), the assembler and the tokenizer, interpret.js (the OH groups
 * as the suffix placed by the word, `cresol`'s methyl at its letter's
 * locant), build.js, search.js (the left-out letter of `cresol`, filled as a
 * letter) and readName(): every form the forward engine lists read as
 * `alternative` with the engine's own label, the molecule compared by
 * aromatic key with a SMILES; the engine's own list checked (no numeric
 * `cresol`, which the reverse engine refuses); `cresol` without its letter;
 * substituted templates read as `otherName` with the SUBSTITUTED_TEMPLATE
 * diagnosis (from `benceno`, or from `fenol` for `cresol`), and an extra OH
 * written `hidroxi` on one with HYDROXY_PREFIX (R-5a3b); the fixture names;
 * the ordered drawing;
 * a seeded no-crash property; time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName, VERDICT_TEXTS, substitutedLead } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, checkSpec, specAtoms, specCarbons } from '../../src/reverse/build.js';
import { searchStructures, slotGroups, filledTree, SEARCH_BUDGET } from '../../src/reverse/search.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { TILES, withArticle } from '../../src/reverse/tiles.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { traditionalLabel } from '../../src/naming/lexicon.es.js';
import { seq, readFixtures, isAlcohol, PHENOL_TEMPLATE_WORDS } from './reverse-words.js';

/** Time budget of one representative readName() call, in milliseconds (design.md §15.7; phones are slower). */
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

/**
 * Every retained phenol form the forward engine gives (aromatic.js
 * retainedPolyIds() and retainedDigroupIds(); design.md §14.5): [tile words,
 * the text, the engine's name, its TRADITIONAL_LABELS id, SMILES].
 */
const ALTERNATIVES = [
  ['o cresol', 'o-cresol', '2-metilfenol', 'oCresol', 'OC1=CC=CC=C1C'],
  ['m cresol', 'm-cresol', '3-metilfenol', 'mCresol', 'OC1=CC(C)=CC=C1'],
  ['p cresol', 'p-cresol', '4-metilfenol', 'pCresol', 'OC1=CC=C(C)C=C1'],
  ['pirocatecol', 'pirocatecol', 'benceno-1,2-diol', 'pyrocatechol', 'OC1=CC=CC=C1O'],
  ['catecol', 'catecol', 'benceno-1,2-diol', 'catechol', 'OC1=CC=CC=C1O'],
  ['resorcinol', 'resorcinol', 'benceno-1,3-diol', 'resorcinol', 'OC1=CC=CC(O)=C1'],
  ['hidroquinona', 'hidroquinona', 'benceno-1,4-diol', 'hydroquinone', 'OC1=CC=C(O)C=C1'],
];

/**
 * The message of a `cresol` with prefixes of the student's beside a letter or numbers (review of I-51a3a): neither can
 * mend it, so it points at the systematic name from `fenol`.
 */
const SUBSTITUTED_CRESOL = 'El nombre «cresol» no admite más sustituyentes, ni con números ni con letras: escribe el nombre a '
  + 'partir de «fenol», con el grupo OH en el carbono 1 y números para todos los demás grupos (2-cloro-4-metilfenol).';

test('parse (R-5a3a): a retained phenol is a template parent; `cresol` keeps its letter', () => {
  // 0:catecol
  let { tree } = read('catecol');
  assert.deepEqual([tree.parent.chain, tree.parent.legacy, tree.parent.letter, tree.parent.suffix],
    [{ type: 'template', tile: 0, range: [0, 1] }, [], null, null]);
  // 0:p 1:cresol
  ({ tree } = read('p cresol'));
  assert.deepEqual([tree.parent.legacy, tree.parent.letter, tree.parent.chain.tile, tree.parent.range], [[], 0, 1, [0, 2]]);
  // 0:4 1:cloro 2:catecol — a prefix on a retained phenol, numbered on its ring.
  ({ tree } = read('4 cloro catecol'));
  assert.deepEqual([tree.items[0].locants, tree.items[0].substituent.type, tree.parent.chain.type], [[0], 'halogen', 'template']);
  for (const words of ['cresol', 'o cresol', 'm cresol', 'p cresol', 'pirocatecol', 'catecol', 'resorcinol', 'hidroquinona',
    '4 cloro catecol', '2 met il hidroquinona', 'tetra met il cresol']) {
    assert.deepEqual(errorsOf(words), [], words);
  }
}); // End of test 'parse (R-5a3a): a retained phenol is a template parent…'

test('TEMPLATE_LOCANTS (R-5a3a): the diols place their OH groups; `cresol` takes a letter, never numbers', () => {
  const diol = (word, where) => `«${word}» ya dice dónde van sus dos grupos OH, en los carbonos ${where}: no lleva números ni letras `
    + 'propios.';
  const cresol = 'Con «cresol» no van números: una letra dice dónde está su metilo respecto al grupo OH (o-cresol, m-cresol o '
    + 'p-cresol).';
  const cases = [
    ['o catecol', [0, 1], diol('catecol', '1 y 2')],
    ['1 2 pirocatecol', [0, 2], diol('pirocatecol', '1 y 2')],
    ['m resorcinol', [0, 1], diol('resorcinol', '1 y 3')],
    ['1 4 hidroquinona', [0, 2], diol('hidroquinona', '1 y 4')],
    ['2 met il p hidroquinona', [3, 4], diol('hidroquinona', '1 y 4')],
    ['4 cresol', [0, 1], cresol],
    ['1 2 cresol', [0, 2], cresol],
    // Numbers and a letter: only the numbers are wrong (no POSITIONAL «no las dos cosas», as for `xileno`).
    ['2 o cresol', [0, 1], cresol],
    // With prefixes of the student's no letter would do either (review): the name from `fenol`.
    ['2 cloro 4 cresol', [2, 3], SUBSTITUTED_CRESOL],
  ];
  for (const [words, [from, to], message] of cases) {
    const errors = read(words).errors.filter((e) => e.code === 'TEMPLATE_LOCANTS');
    assert.equal(errors.length, 1, `${words}: ${errorsOf(words).join(' ')}`);
    assert.deepEqual([errors[0].from, errors[0].to, errors[0].message], [from, to, message], words);
  }
  assert.deepEqual(errorsOf('2 o cresol'), ['TEMPLATE_LOCANTS[0,1)']);
}); // End of test 'TEMPLATE_LOCANTS (R-5a3a)…'

test('TILE_ORDER (R-5a3a): a multiplier, a compound branch or a suffix is no place for a retained phenol', () => {
  assert.deepEqual(errorsOf('di catecol'), ['TILE_ORDER[0,1)']);
  assert.equal(read('di catecol').errors[0].message, 'Esta ficha no puede ir aquí: «di», «tri»… van delante de una rama (dimetil), '
    + 'no delante de «catecol».');
  // Inside a compound branch: as for `fenol`, the ring is `fenil` with `hidroxi`.
  assert.deepEqual(errorsOf('START resorcinol END met ano'), ['TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']);
  assert.equal(read('START resorcinol END met ano').errors[0].message, 'Esta ficha no puede ir aquí: «resorcinol» es el nombre de '
    + 'toda la molécula y va al final; dentro de una rama, el anillo es «fenil» y cada grupo OH se escribe «hidroxi», como en '
    + '(4-hidroxifenil).');
  // A hydrocarbon template keeps its hint.
  assert.match(read('START xileno END met ano').errors[0].message, /el anillo es «fenil», como en \(4-metilfenil\)\.$/);
  // The word places its OH groups: no `ol` after it.
  assert.deepEqual(errorsOf('catecol ol'), ['TILE_ORDER[1,2)']);
  // A letter before a stem other than a template or prefix: it says where letters go, `cresol` included.
  assert.match(read('o benceno').errors[0].message, /o delante de «xileno» o «cresol» \(p-xileno, p-cresol\)\.$/);
}); // End of test 'TILE_ORDER (R-5a3a)…'

/** Refused letter forms (design.md §14.4): [tile words, error range, start of the message]. */
const REFUSED_LETTERS = [
  // Three positions: a prefix beside `cresol`'s letter, or a lettered prefix on a retained phenol (its OH groups count).
  ['2 cloro p cresol', [2, 3], SUBSTITUTED_CRESOL],
  ['p met il cresol', [0, 1], SUBSTITUTED_CRESOL],
  ['p met il catecol', [0, 1], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre pone tres '
    + '(contando los dos grupos OH del catecol)'],
  ['o cloro resorcinol', [0, 1], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre pone tres '
    + '(contando los dos grupos OH del resorcinol)'],
  ['p di cloro hidroquinona', [0, 1], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre pone '
    + 'cuatro (contando los dos grupos OH de la hidroquinona)'],
];

test('o/m/p letters (R-5a3a, design.md §14.4): on `cresol` its OH and methyl are the two positions; more are refused', () => {
  for (const words of ['o cresol', 'm cresol', 'p cresol']) {
    assert.deepEqual(errorsOf(words), [], words);
  }
  for (const [words, [from, to], message] of REFUSED_LETTERS) {
    const error = read(words).errors.find((e) => e.code === 'POSITIONAL');
    assert.ok(error, `${words}: ${errorsOf(words).join(' ')}`);
    assert.deepEqual([error.from, error.to], [from, to], words);
    assert.ok(error.message.startsWith(message), `${words}: ${error.message}`);
  }
}); // End of test 'o/m/p letters (R-5a3a…'

test('assemble and tokenize (R-5a3a): whole words, the letter punctuated as a locant; every name reads back', () => {
  const cases = [
    ['cresol', 'cresol'], ['o cresol', 'o-cresol'], ['p cresol', 'p-cresol'], ['pirocatecol', 'pirocatecol'], ['catecol', 'catecol'],
    ['resorcinol', 'resorcinol'], ['hidroquinona', 'hidroquinona'], ['4 cloro catecol', '4-clorocatecol'],
    ['2 met il hidroquinona', '2-metilhidroquinona'], ['tetra cloro hidroquinona', 'tetraclorohidroquinona'],
    ['5 bromo resorcinol', '5-bromoresorcinol'], ['tetra met il cresol', 'tetrametilcresol'],
    // Wrong sequences still assemble, every tile kept.
    ['4 cresol', '4-cresol'], ['o catecol', 'o-catecol'], ['di catecol', 'dicatecol'], ['2 o cresol', '2,o-cresol'],
  ];
  for (const [words, text] of cases) {
    assert.equal(assemble(read(words).tree).text, text, words);
  }
  for (const [words, text] of cases.slice(0, 12)) {
    assert.deepEqual(tokenize(text), seq(words), `${text}: the tiles read back`);
  }
  const { spans, text } = assemble(read('p cresol').tree);
  assert.deepEqual(spans.map((s) => [text.slice(s.from, s.to), s.tile, s.kind]), [['p', 0, 'locant'], ['-', null, 'punct'],
    ['cresol', 1, 'stem']]);
  // Read only with errors: no tiles.
  for (const name of ['4-cresol', 'o-catecol', 'catecolol']) {
    assert.equal(tokenize(name), null, name);
  }
}); // End of test 'assemble and tokenize (R-5a3a)…'

test('interpret (R-5a3a): the OH groups are the suffix placed by the word; `cresol`\'s methyl at its letter\'s locant', () => {
  // `catecol`: a benzene parent, no carbon group, two implicit OH slots at 1 and 2 on the template tile.
  let spec = specOf('catecol');
  assert.equal(spec.parent.kind, 'benzene');
  assert.deepEqual(spec.traditional, { value: 'catechol', tiles: [0, 1] });
  assert.deepEqual(spec.parent.template.groups, []);
  assert.deepEqual([spec.suffix.kind, spec.suffix.phenol, spec.suffix.multiplier, spec.suffix.word, spec.suffix.tiles],
    ['alcohol', true, { count: 2, compound: false }, { text: 'catecol', tiles: [0, 1] }, [0, 1]]);
  assert.deepEqual(spec.suffix.slots, [{ kind: 'implicit', value: 1, role: 'carbon', domain: [1, 6], tiles: [0, 1] },
    { kind: 'implicit', value: 2, role: 'carbon', domain: [1, 6], tiles: [0, 1] }]);
  assert.deepEqual([spec.prefixes, spec.leftOut, spec.oldStyle], [[], [], false]);
  assert.deepEqual(specOf('resorcinol').suffix.slots.map((slot) => slot.value), [1, 3]);
  assert.deepEqual(specOf('hidroquinona').suffix.slots.map((slot) => slot.value), [1, 4]);
  assert.deepEqual(specOf('pirocatecol').traditional.value, 'pyrocatechol');
  // `p-cresol`: the OH at 1 (implicit), the methyl at 4 (the letter's locant; carbon 1 is the OH's).
  spec = specOf('p cresol');
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value, slot.tiles]), [['implicit', 1, [1, 2]]]);
  const [methyl] = spec.parent.template.groups;
  assert.deepEqual(methyl.slots.map((slot) => [slot.kind, slot.value, slot.letter, slot.tiles]), [['supplied', 4, true, [0, 1]]]);
  assert.deepEqual([methyl.substituent.kind, methyl.substituent.length], ['chain', 1]);
  assert.deepEqual(specOf('o cresol').parent.template.groups[0].slots.map((slot) => slot.value), [2]);
  // `cresol` alone: its methyl is one left-out slot on the template tile.
  spec = specOf('cresol');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.kind, slot.role, slot.domain, slot.tiles]), [['leftOut', 'carbon', [1, 6], [0, 1]]]);
  // A student's prefix is numbered on the same ring.
  assert.deepEqual(specOf('4 cloro catecol').prefixes[0].slots.map((slot) => slot.value), [4]);
}); // End of test 'interpret (R-5a3a)…'

test('build (R-5a3a): the OH groups on their carbons, the methyl of `cresol`; errors worded with the template', () => {
  for (const [words, smiles] of [['p cresol', 'OC1=CC=C(C)C=C1'], ['o cresol', 'OC1=CC=CC=C1C'], ['catecol', 'OC1=CC=CC=C1O'],
    ['resorcinol', 'OC1=CC=CC(O)=C1'], ['hidroquinona', 'OC1=CC=C(O)C=C1'], ['4 cloro catecol', 'ClC1=CC=C(O)C(O)=C1'],
    ['2 met il hidroquinona', 'CC1=C(O)C=CC(O)=C1']]) {
    const spec = specOf(words);
    const built = build(spec, []);
    assert.ok(built.ok, words);
    assert.equal(aromaticKey(built.molecule), keyOf(smiles), words);
    assert.equal(built.studentParent.atoms.length, 6, `${words}: the ring is the parent`);
    assert.equal(built.suffixAtoms.length, spec.suffix.slots.length, `${words}: one oxygen per OH`);
    assert.equal(built.prefixAtoms.length, spec.prefixes.reduce((n, p) => n + p.slots.length, 0), `${words}: only the student's prefixes`);
  }
  assert.deepEqual([specCarbons(specOf('p cresol')), specAtoms(specOf('p cresol'))], [7, 8]);
  assert.deepEqual([specCarbons(specOf('catecol')), specAtoms(specOf('catecol'))], [6, 8]);
  // A prefix on a carbon the word already filled with an OH: VALENCE on the student's locant, saying why.
  const cases = [
    ['1 cloro catecol', 'VALENCE', [0, 1], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el catecol, ese carbono '
      + 'ya lleva un grupo OH.'],
    ['3 met il resorcinol', 'VALENCE', [0, 1], 'El carbono 3 tendría 5 enlaces, y un carbono solo puede tener 4: en el resorcinol, ese '
      + 'carbono ya lleva un grupo OH.'],
    ['4 met il hidroquinona', 'VALENCE', [0, 1], 'El carbono 4 tendría 5 enlaces, y un carbono solo puede tener 4: en la hidroquinona, '
      + 'ese carbono ya lleva un grupo OH.'],
    ['7 cloro catecol', 'LOCANT_RANGE', [0, 1], 'El anillo del catecol tiene 6 carbonos, del 1 al 6: no hay carbono 7.'],
    ['7 bromo hidroquinona', 'LOCANT_RANGE', [0, 1], 'El anillo de la hidroquinona tiene 6 carbonos, del 1 al 6: no hay carbono 7.'],
  ];
  for (const [words, code, tiles, message] of cases) {
    const spec = specOf(words);
    const error = checkSpec(spec) || build(spec, []).error;
    assert.deepEqual([error.code, error.tiles, error.message], [code, tiles, message], words);
  }
  // The article of each parent word in the messages: `hidroquinona` is the one feminine word (`de la`, `en la`).
  assert.deepEqual(['tolueno', 'fenol', 'catecol', 'hidroquinona'].map((word) => [withArticle(word, 'de'), withArticle(word, 'en')]), [
    ['del tolueno', 'en el tolueno'], ['del fenol', 'en el fenol'], ['del catecol', 'en el catecol'],
    ['de la hidroquinona', 'en la hidroquinona'],
  ]);
}); // End of test 'build (R-5a3a)…'

test('search (R-5a3a): `cresol` without its letter is one left-out slot, three structures, filled with letters', () => {
  const spec = specOf('cresol');
  assert.deepEqual(slotGroups(spec).map((g) => [g.role, g.distinct, g.indices, g.tiles]), [['carbon', false, [0], [0, 1]]]);
  const result = searchStructures(spec, { namer: nameMolecule });
  assert.equal(result.status, 'complete');
  assert.deepEqual(result.structures.map((s) => s.naming.name), ['2-metilfenol', '3-metilfenol', '4-metilfenol']);
  // Carbon 1 holds the OH: the methyl never goes there; 6 and 5 merge with 2 and 3 by symmetry.
  assert.ok(result.structures.every((s) => s.placements.every(([value]) => value !== 1)));
  assert.deepEqual(result.structures.map((s) => s.placements.map(([value]) => value)), [[2, 6], [3, 5], [4]]);
  // Each placement filled with the letter of its position, the only form the engine writes (never `2-cresol`).
  const { tree } = read('cresol');
  assert.deepEqual(result.structures.map((s) => s.placements.map((p) => assemble(filledTree(tree, spec, p)).text)),
    [['o-cresol', 'o-cresol'], ['m-cresol', 'm-cresol'], ['p-cresol']]);
  // A retained diol's OH groups fill their carbons: `clorocatecol` is two structures (3 / 4), `tetraclorocatecol` one.
  assert.equal(searchStructures(specOf('cloro catecol'), { namer: nameMolecule }).structures.length, 2);
  assert.equal(searchStructures(specOf('tetra cloro catecol'), { namer: nameMolecule }).structures.length, 1);
  const full = searchStructures(specOf('penta cloro catecol'), { namer: nameMolecule });
  assert.deepEqual([full.status, full.error.code], ['none', 'VALENCE']);
}); // End of test 'search (R-5a3a)…'

test('readName (R-5a3a): every retained phenol form the engine gives is an alternative, with the engine\'s own label', () => {
  for (const [words, text, name, id, smiles] of ALTERNATIVES) {
    const verdict = readName(seq(words));
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, 'alternative', `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.deepEqual([verdict.matched.name, verdict.matched.style, verdict.matched.label], [text, 'traditional', traditionalLabel(id)]);
    assert.equal(verdict.message, `${VERDICT_TEXTS.correct} «${text}» es una forma válida (${traditionalLabel(id)}). `
      + `El nombre que doy primero es «${name}».`);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    assert.deepEqual([verdict.draw, verdict.errors, verdict.suffixAtoms.length], [true, [], name.endsWith('diol') ? 2 : 1]);
    assert.deepEqual(tokenize(text), seq(words), `${text}: the tiles read back`);
  } // End of the loop over the alternatives
  assert.match(readName(seq('catecol')).matched.label, /acepta pirocatecol/);
}); // End of test 'readName (R-5a3a): every retained phenol form the engine gives is an alternative…'

test('the forward engine lists exactly these forms: the reverse verdicts agree with it; no numeric cresol (refused)', () => {
  for (const [, text, name, , smiles] of ALTERNATIVES) {
    const naming = nameMolecule(parseSmiles(smiles));
    assert.equal(naming.name, name);
    assert.ok(naming.alternatives.some((alt) => alt.name === text && alt.style === 'traditional'), `${smiles}: ${text}`);
  }
  // The engine writes the cresols with their letter only; `2-cresol`… are no names of it, and the reverse engine refuses them.
  for (const [locant, smiles] of [[2, 'OC1=CC=CC=C1C'], [3, 'OC1=CC(C)=CC=C1'], [4, 'OC1=CC=C(C)C=C1']]) {
    const names = nameMolecule(parseSmiles(smiles)).alternatives.map((alt) => alt.name);
    assert.ok(!names.some((alt) => /^\d.*cresol$/.test(alt)), names.join(', '));
    const verdict = readName(seq(`${locant} cresol`));
    assert.deepEqual([verdict.kind, verdict.errors[0].code, verdict.draw], ['invalid', 'TEMPLATE_LOCANTS', false]);
  }
  // A substituted cresol or diol has no traditional name in the engine (design.md §14.5).
  for (const smiles of ['ClC1=CC=C(O)C(O)=C1', 'CC1=C(O)C=CC(O)=C1', 'OC1=C(Cl)C=C(C)C=C1']) {
    assert.ok(nameMolecule(parseSmiles(smiles)).alternatives.every((alt) => alt.style !== 'traditional'), smiles);
  }
}); // End of test 'the forward engine lists exactly these forms…'

test('readName (R-5a3a): the systematic name is `correct` and announces the retained names', () => {
  const also = (id, word) => ` También se llama «${word}» (${traditionalLabel(id)}).`;
  assert.equal(readName(tokenize('benceno-1,2-diol')).message, `${VERDICT_TEXTS.correct}${also('pyrocatechol', 'pirocatecol')}`
    + `${also('catechol', 'catecol')}`);
  assert.equal(readName(tokenize('benceno-1,3-diol')).message, `${VERDICT_TEXTS.correct}${also('resorcinol', 'resorcinol')}`);
  assert.equal(readName(tokenize('3-metilfenol')).message, `${VERDICT_TEXTS.correct}${also('mCresol', 'm-cresol')}`);
}); // End of test 'readName (R-5a3a): the systematic name is `correct`…'

test('readName (R-5a3a): `cresol` without its letter — the letter is missing, the three cresols listed', () => {
  const verdict = readName(seq('cresol'));
  assert.equal(verdict.kind, 'ambiguous');
  assert.equal(verdict.message, 'Falta la letra: puede ser o-cresol, m-cresol o p-cresol.');
  assert.ok(verdict.message.startsWith(VERDICT_TEXTS.ambiguousLetter));
  assert.deepEqual(verdict.candidates.map((c) => [c.text, c.name]), [['o-cresol', '2-metilfenol'], ['m-cresol', '3-metilfenol'],
    ['p-cresol', '4-metilfenol']]);
  assert.deepEqual(verdict.candidates.map((c) => aromaticKey(c.molecule)),
    [keyOf('OC1=CC=CC=C1C'), keyOf('OC1=CC(C)=CC=C1'), keyOf('OC1=CC=C(C)C=C1')]);
  assert.deepEqual([verdict.molecule, verdict.draw], [null, false]);
  // With prefixes of the student's, no letter would do (review): the engine's names, written with numbers.
  const both = readName(seq('cloro cresol'));
  assert.equal(both.kind, 'ambiguous');
  assert.ok(both.message.startsWith(`${substitutedLead('cresol')} 2-cloro-3-metilfenol, `), both.message);
  // A diol without locants on its prefixes: numbers.
  assert.equal(readName(seq('di cloro hidroquinona')).message, 'Faltan números: puede ser 2,3-diclorobenceno-1,4-diol, '
    + '2,5-diclorobenceno-1,4-diol o 2,6-diclorobenceno-1,4-diol.');
  // Out of budget: incomplete, never a claim.
  assert.equal(readName(seq('cresol'), { budget: { placements: 1 } }).kind, 'incomplete');
}); // End of test 'readName (R-5a3a): `cresol` without its letter…'

/** Verdicts that accept a name: it is drawn, with the app's name (design.md §15.3). */
const ACCEPTED = Object.freeze(['correct', 'alternative', 'missingLocants', 'otherName']);

/**
 * The names a refused or ambiguous verdict tells the student to write: the
 * candidates an `ambiguous` message lists, or the example in brackets that
 * ends an `invalid` message (`(2-cloro-4-metilfenol).`, `(1,2,4-trimetilbenceno).`).
 *
 * @param {object} verdict - A readName() verdict.
 * @returns {string[]} The suggested names.
 */
function suggestions(verdict) {
  if (verdict.kind === 'ambiguous') {
    return verdict.candidates.map((c) => c.text).filter(Boolean);
  }
  const example = /\(([^()«»]+)\)\.$/.exec(verdict.message);
  return example ? example[1].split(/, | o /) : [];
}

test('review (I-51a3a): following the messages on a substituted cresol always reaches a name the app accepts', () => {
  // `4-clorocresol`: no «Falta la letra»; the names listed are the engine's, with numbers, and each reads as correct.
  const missing = readName(seq('4 cloro cresol'));
  assert.equal(missing.kind, 'ambiguous');
  assert.equal(missing.message, 'El nombre «cresol» no admite más sustituyentes: se escribe con números. Puede ser '
    + '4-cloro-2-metilfenol o 4-cloro-3-metilfenol.');
  assert.ok(!missing.message.startsWith(VERDICT_TEXTS.ambiguousLetter));
  // Adding a letter or a number instead: refused, both pointing at the name from `fenol`.
  for (const words of ['4 cloro o cresol', '4 cloro m cresol', '2 cloro p cresol', '4 cloro 2 cresol', 'p cloro cresol']) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.message], ['invalid', SUBSTITUTED_CRESOL], words);
  }
  // Every input of the loop, then every name its message suggests: accepted, never invalid.
  const inputs = ['4 cloro cresol', '2 cloro p cresol', '4 cloro 2 cresol', 'p cloro cresol', 'cloro cresol', 'di met il cresol',
    'tetra met il cresol', 'cresol', '4 cresol', '2 o cresol',
    // `xileno` and `mesitileno` with prefixes have no such dead end: the numbers they are told to write are accepted.
    '4 met il xileno', '4 met il o xileno', 'p cloro xileno', 'o met il mesitileno'];
  for (const words of inputs) {
    const verdict = readName(seq(words));
    if (ACCEPTED.includes(verdict.kind)) {
      continue;
    }
    const names = suggestions(verdict);
    assert.ok(names.length > 0, `${words}: ${verdict.message} suggests no name`);
    for (const name of names) {
      const ids = tokenize(name);
      assert.ok(ids, `${words} → ${name}: no tiles`);
      const next = readName(ids);
      assert.ok(ACCEPTED.includes(next.kind), `${words} → ${name}: ${next.kind}, ${next.message}`);
    }
  } // End of the loop over the inputs
  // The numbered forms the xylene and mesitylene messages ask for: drawn with the app's name.
  for (const words of ['4 met il 1 2 xileno', '2 met il mesitileno', 'met il mesitileno']) {
    assert.equal(readName(seq(words)).kind, 'otherName', words);
  }
}); // End of test 'review (I-51a3a): following the messages on a substituted cresol…'

/**
 * Substituted retained phenols, which the engine never writes (design.md
 * §14.5): [tile words, text, the engine's name, SMILES, the parent the
 * diagnosis names].
 */
const SUBSTITUTED = [
  ['4 cloro catecol', '4-clorocatecol', '4-clorobenceno-1,2-diol', 'ClC1=CC=C(O)C(O)=C1', 'benceno'],
  ['4 bromo pirocatecol', '4-bromopirocatecol', '4-bromobenceno-1,2-diol', 'BrC1=CC=C(O)C(O)=C1', 'benceno'],
  ['5 cloro resorcinol', '5-clororesorcinol', '5-clorobenceno-1,3-diol', 'ClC1=CC(O)=CC(O)=C1', 'benceno'],
  ['2 met il hidroquinona', '2-metilhidroquinona', '2-metilbenceno-1,4-diol', 'CC1=C(O)C=CC(O)=C1', 'benceno'],
  ['4 met il catecol', '4-metilcatecol', '4-metilbenceno-1,2-diol', 'CC1=CC=C(O)C(O)=C1', 'benceno'],
  // Left-out locants that one structure fills: a full ring.
  ['tetra cloro hidroquinona', 'tetraclorohidroquinona', '2,3,5,6-tetraclorobenceno-1,4-diol', 'OC1=C(Cl)C(Cl)=C(O)C(Cl)=C1Cl',
    'benceno'],
  ['tetra met il cresol', 'tetrametilcresol', '2,3,4,5,6-pentametilfenol', 'OC1=C(C)C(C)=C(C)C(C)=C1C', 'fenol'],
];

test('readName (R-5a3a): a substituted retained phenol draws its molecule, named by the app, with SUBSTITUTED_TEMPLATE', () => {
  for (const [words, text, name, smiles, parent] of SUBSTITUTED) {
    const verdict = readName(seq(words));
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, 'otherName', `${text}: ${verdict.message}`);
    assert.deepEqual([verdict.name, verdict.message], [name, otherNameMessage(name)], text);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    assert.equal(verdict.draw, true);
    const { diagnosis } = verdict;
    assert.ok(diagnosis, `${text}: no diagnosis`);
    const template = PHENOL_TEMPLATE_WORDS.find((word) => text.endsWith(word));
    assert.deepEqual([diagnosis.code, diagnosis.rule, diagnosis.step], ['SUBSTITUTED_TEMPLATE', 2, 'benzene'], text);
    assert.equal(diagnosis.message, `El nombre tradicional «${template}» no admite más sustituyentes: con más ramas en el anillo, `
      + `la molécula se nombra a partir de «${parent}», con todas las ramas delante: «${name}».`, text);
    const templateTile = seq(words).length - 1;
    assert.deepEqual(diagnosis.tiles, [templateTile, templateTile + 1], `${text}: the template's tile`);
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok(opened.index >= 0 && [diagnosis.step, ...STEP_FALLBACKS[diagnosis.step]].includes(opened.steps[opened.index].id), text);
  } // End of the loop over the substituted templates
}); // End of test 'readName (R-5a3a): a substituted retained phenol…'

test('diagnosis (R-5a3b): an extra OH written `hidroxi` on a retained phenol is HYDROXY_PREFIX, never SUBSTITUTED_TEMPLATE', () => {
  for (const [words, name] of [['4 hidroxi catecol', 'benceno-1,2,4-triol'], ['2 hidroxi hidroquinona', 'benceno-1,2,4-triol'],
    ['5 hidroxi resorcinol', 'benceno-1,3,5-triol']]) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], words);
    assert.ok(verdict.diagnosis, `${words}: no diagnosis`);
    assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.step], ['HYDROXY_PREFIX', 'group'], words);
    assert.equal(verdict.diagnosis.message, 'Los grupos –OH son el grupo principal: los del anillo se nombran todos juntos con la '
      + `terminación «-triol», al final del nombre, no con el prefijo «hidroxi». Se escribe «${name}».`, words);
    assert.equal(verdict.draw, true);
  }
}); // End of test 'diagnosis (R-5a3b): an extra OH written `hidroxi` on a retained phenol…'

test('readName (R-5a3a): refused forms and structural errors are invalid with their tiles marked; never a crash', () => {
  for (const [words, [from, to], message] of REFUSED_LETTERS) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    assert.equal(verdict.errors[0].code, 'POSITIONAL', words);
    assert.deepEqual([verdict.errors[0].from, verdict.errors[0].to], [from, to], words);
    assert.ok(verdict.message.startsWith(message), words);
    assert.deepEqual([verdict.molecule, verdict.draw], [null, false]);
  }
  for (const [words, code] of [['o catecol', 'TEMPLATE_LOCANTS'], ['4 cresol', 'TEMPLATE_LOCANTS'], ['di resorcinol', 'TILE_ORDER'],
    ['1 cloro catecol', 'VALENCE'], ['7 cloro catecol', 'LOCANT_RANGE'], ['penta cloro catecol', 'VALENCE'],
    ['1 cloro cresol', 'VALENCE'], ['catecol ol', 'TILE_ORDER']]) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.errors[0].code, verdict.draw], ['invalid', code, false], words);
  }
  // Two rings: out of scope, as for every template.
  for (const words of ['fenil catecol', '4 fenil resorcinol']) {
    assert.equal(readName(seq(words)).kind, 'outOfScope', words);
  }
}); // End of test 'readName (R-5a3a): refused forms and structural errors are invalid…'

test('fixture round trip (R-5a3a): every retained phenol name of tests/fixtures/names.tsv reads as an alternative of its row', async () => {
  const rows = (await readFixtures()).filter((row) => isAlcohol(row.smiles));
  let covered = 0;
  for (const row of rows) {
    for (const name of row.names.slice(1).filter((n) => PHENOL_TEMPLATE_WORDS.some((word) => n.includes(word)))) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      const verdict = readName(ids);
      assert.deepEqual([verdict.kind, verdict.name, verdict.matched.name], ['alternative', row.names[0], name], `names.tsv:${row.line}`);
      assert.equal(aromaticKey(verdict.molecule), keyOf(row.smiles), `names.tsv:${row.line}: ${name}`);
      covered += 1;
    }
  }
  // `p-cresol` twice (both Kekulé drawings), `o-cresol`, `m-cresol`, `pirocatecol`, `catecol`, `resorcinol`, `hidroquinona`.
  assert.equal(covered, 8);
}); // End of test 'fixture round trip (R-5a3a)…'

test('«Nombres tradicionales» (R-5a3a): the five tiles, each with a tooltip in the dialog', () => {
  // After `anisol` (R-5b), before the carbonyl templates (R-5c3a).
  const phenols = TILES.filter((tile) => tile.kind === 'template' && tile.row === 'traditional').slice(5, 10);
  assert.deepEqual(phenols.map((tile) => tile.text), [...PHENOL_TEMPLATE_WORDS]);
  for (const tile of phenols) {
    assert.ok(TILE_HINTS[tile.id] && TILE_HINTS[tile.id].endsWith('.'), tile.id);
  }
  assert.match(TILE_HINTS['template-cresol'], /o-cresol, m-cresol o p-cresol/);
}); // End of test '«Nombres tradicionales» (R-5a3a)…'

test('«Dibujar» (R-5a3a): retained phenol verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const words of ['o cresol', 'p cresol', 'pirocatecol', 'catecol', 'resorcinol', 'hidroquinona', '4 cloro catecol',
    'tetra met il cresol', 'tetra cloro hidroquinona']) {
    const verdict = readName(seq(words));
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-5a3a)…'

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

test('property (R-5a3a): random retained phenol names — prefixes with or without locants, letters anywhere — never crash', () => {
  const random = mulberry32(20261015);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['met il', 'et il', 'cloro', 'bromo', 'hidroxi', 'isopropil', 'fenil', 'START 2 cloro et il END'];
  const parents = ['cresol', 'o cresol', 'm cresol', 'p cresol', '4 cresol', 'pirocatecol', 'catecol', 'resorcinol', 'hidroquinona',
    'o catecol'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(0, 2) }, () => {
      const count = int(1, 3);
      const where = pick(['none', 'numbers', 'numbers', 'letter']);
      const locants = where === 'numbers' ? Array.from({ length: count }, () => int(1, 7)).join(' ') : '';
      return [where === 'letter' ? pick(['o', 'm', 'p']) : locants, multipliers[count], pick(branches)].join(' ');
    });
    const words = [...prefixes, pick(parents)].join(' ');
    const verdict = readName(seq(words));
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, words);
      assert.ok(verdict.suffixAtoms.length >= 1, `${words}: the OH groups are drawn`);
    } else {
      assert.equal(verdict.molecule === null || verdict.kind === 'outOfScope', true, words);
    }
  } // End of the loop over the random names
  for (const kind of ['alternative', 'otherName', 'ambiguous', 'invalid', 'outOfScope']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-5a3a): random retained phenol names…'

/** Representative names for the time budget. */
const TIMED = ['cresol', 'p cresol', 'catecol', 'hidroquinona', 'cloro cresol', 'di cloro catecol', 'tetra cloro hidroquinona',
  'tetra met il cresol', 'tri cloro cresol', 'di met il resorcinol'];

test('time budget: each representative retained phenol readName() well within budget', () => {
  TIMED.forEach((words) => readName(seq(words))); // Warm-up.
  for (const words of TIMED) {
    const start = performance.now();
    const verdict = readName(seq(words));
    const elapsed = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', words);
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
    assert.ok(elapsed < SEARCH_BUDGET.ms);
  }
}); // End of test 'time budget: each representative retained phenol readName() well within budget'
