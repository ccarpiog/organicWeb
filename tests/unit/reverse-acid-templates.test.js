/**
 * @file Unit tests for the retained acid names of «¿Cómo se dibuja?»
 * (src/reverse/, design.md §13.4 I-33, I-40b, §14.5, §15.5.3, §15.7, §15.8
 * R-5d; phase I-51d2, R-5d2): the «Nombres tradicionales» tiles `fórmico`,
 * `acético`, `oxálico`, `fenilacético`, `ftálico`, `isoftálico` and
 * `tereftálico`, written after the class word `ácido`, through the parser
 * (ACID_WORD both ways, TEMPLATE_LOCANTS, POSITIONAL, TILE_ORDER with their
 * messages and tile ranges), the assembler and the tokenizer, interpret.js
 * (the chain templates as an open chain with their –COOH as a placed suffix,
 * the ftálicos as benzene with two –COOH outside the ring), build.js
 * (LOCANT_RANGE and VALENCE messages), search.js and readName(): every form
 * the forward engine lists read as `alternative` with the engine's own label
 * and the molecule compared by aromatic key with a SMILES; the substituted
 * forms the engine writes itself (`ácido 4-metilftálico`, `ácido
 * 2-(3-metilfenil)acético`) read as alternatives, the others as `otherName`
 * with the SUBSTITUTED_TEMPLATE diagnosis (the chain wording, the template
 * quoted with its class word), or `invalid` where they cannot go; the
 * prefixes the engine admits judged by the other rules (RING_NUMBERING,
 * BRANCH_RING_NUMBERING, the NEEDLESS_LOCANTS of `ácido 2-fenilacético`);
 * the acid's own mistakes on a template, deliberate nulls until phase I-51d3
 * (ACID_CARBON, CARBONYL_PREFIX); the tooltips; the fixture
 * names; a closed loop over the engine's retained acid names with each
 * locant list removed; the ordered drawing; time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName, VERDICT_TEXTS } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { searchStructures } from '../../src/reverse/search.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { TILES, withArticle, templateAdmits, isAcidTemplate, isCarbonylTemplate, parentWordName } from '../../src/reverse/tiles.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { traditionalLabel } from '../../src/naming/lexicon.es.js';
import { seq, readFixtures, isAcid, ACID_TEMPLATE_WORDS, isAcidTemplateName } from './reverse-words.js';

/** Time budget of one representative readName() call, in milliseconds (design.md §15.7; phones are slower). */
const PER_NAME_BUDGET_MS = 250;

/**
 * The tile ids of a name: space-separated tile words (reverse-words.js) when
 * every word is a tile, else a name text read by the tokenizer.
 *
 * @param {string} name - Tile words or a name.
 * @returns {string[]} The tile ids.
 */
function idsOf(name) {
  let ids = null;
  try {
    ids = seq(name);
  } catch (err) {
    ids = tokenize(name); // A name text: `ácido 2-(3-metilfenil)acético`.
  }
  assert.ok(ids, `no tiles for ${name}`);
  return ids;
} // End of function idsOf()

/**
 * The errors of a parse of tile words as `CODE[from,to)` strings.
 *
 * @param {string} words - Space-separated tile words (reverse-words.js).
 * @returns {string[]} The errors.
 */
function errorsOf(words) {
  return parse(seq(words)).errors.map((e) => `${e.code}[${e.from},${e.to})`);
}

/**
 * The NameSpec of error-free tile words.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {object} The NameSpec.
 */
function specOf(words) {
  const { tree, errors } = parse(seq(words));
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
 * Every retained acid form the forward engine gives (principal.js
 * carbonylTraditionalId(), aromatic.js retainedDigroupIds()): [tile words,
 * the text, the engine's name, its TRADITIONAL_LABELS id, SMILES].
 */
const ALTERNATIVES = [
  ['ácido fórmico', 'ácido fórmico', 'ácido metanoico', 'formicAcid', 'OC=O'],
  ['ácido acético', 'ácido acético', 'ácido etanoico', 'aceticAcid', 'CC(O)=O'],
  ['ácido oxálico', 'ácido oxálico', 'ácido etanodioico', 'oxalicAcid', 'OC(=O)C(O)=O'],
  ['ácido fenilacético', 'ácido fenilacético', 'ácido 2-feniletanoico', 'phenylaceticAcid', 'OC(=O)CC1=CC=CC=C1'],
  ['ácido ftálico', 'ácido ftálico', 'ácido benceno-1,2-dicarboxílico', 'phthalicAcid', 'OC(=O)C1=CC=CC=C1C(O)=O'],
  ['ácido isoftálico', 'ácido isoftálico', 'ácido benceno-1,3-dicarboxílico', 'isophthalicAcid', 'OC(=O)C1=CC=CC(C(O)=O)=C1'],
  ['ácido tereftálico', 'ácido tereftálico', 'ácido benceno-1,4-dicarboxílico', 'terephthalicAcid', 'OC(=O)C1=CC=C(C(O)=O)C=C1'],
  // The substituted forms the engine writes itself: a ftálico with ring prefixes, acético with a substituted phenyl.
  ['ácido 4 met il ftálico', 'ácido 4-metilftálico', 'ácido 4-metilbenceno-1,2-dicarboxílico', 'phthalicAcid',
    'CC1=CC=C(C(O)=O)C(C(O)=O)=C1'],
  ['ácido 5 cloro isoftálico', 'ácido 5-cloroisoftálico', 'ácido 5-clorobenceno-1,3-dicarboxílico', 'isophthalicAcid',
    'ClC1=CC(C(O)=O)=CC(C(O)=O)=C1'],
  ['ácido 2 START 3 met il fenil END acético', 'ácido 2-(3-metilfenil)acético', 'ácido 2-(3-metilfenil)etanoico', 'arylaceticAcid',
    'OC(=O)CC1=CC=CC(C)=C1'],
];

// ---------------------------------------------------------------------------
// Tiles, parser, assembler and tokenizer.
// ---------------------------------------------------------------------------

test('«Nombres tradicionales» (R-5d2): the seven acid tiles after the carbonyl ones, each with a tooltip; quoted with `ácido`', () => {
  const acids = TILES.filter((tile) => tile.kind === 'template' && tile.row === 'traditional').slice(18);
  assert.deepEqual(acids.map((tile) => tile.text), [...ACID_TEMPLATE_WORDS]);
  assert.deepEqual(acids.map((tile) => tile.text), ['fórmico', 'acético', 'oxálico', 'fenilacético', 'ftálico', 'isoftálico',
    'tereftálico']);
  for (const tile of acids) {
    assert.ok(TILE_HINTS[tile.id] && TILE_HINTS[tile.id].endsWith('.'), tile.id);
    assert.ok(!/undefined|null/.test(TILE_HINTS[tile.id]), tile.id);
    assert.match(TILE_HINTS[tile.id], /Va detrás de «ácido»/, tile.id);
    assert.ok(isAcidTemplate(tile.value) && !isCarbonylTemplate(tile.value), tile.id);
    assert.equal(parentWordName(tile), `ácido ${tile.text}`, tile.id);
  }
  assert.match(TILE_HINTS['template-aceticAcid'], /ácido etanoico/);
  assert.match(TILE_HINTS['template-aceticAcid'], /ácido 2-\(3-metilfenil\)acético/);
  assert.match(TILE_HINTS['template-phthalicAcid'], /ácido 4-metilftálico/);
  assert.match(TILE_HINTS['template-oxalicAcid'], /ácido etanodioico/);
  assert.deepEqual(['ácido acético', 'ácido ftálico'].map((word) => withArticle(word, 'de')), ['del ácido acético', 'del ácido ftálico']);
}); // End of test '«Nombres tradicionales» (R-5d2)…'

test('parser (R-5d2): ACID_WORD both ways, numbers or a letter on an acid template, a multiplier before it, one in a branch', () => {
  const cases = [
    // A retained acid name without `ácido`: the error on the template's tile, its example the student's own word.
    ['acético', ['ACID_WORD[0,1)'], 'El nombre de un ácido empieza por la palabra «ácido»: pon esa ficha al principio, como en ácido '
      + 'acético.'],
    ['4 met il ftálico', ['ACID_WORD[3,4)'], 'El nombre de un ácido empieza por la palabra «ácido»: pon esa ficha al principio, como '
      + 'en ácido ftálico.'],
    // `ácido` before a template that is no acid's: the error on `ácido`, with the retained acid words.
    ['ácido acetona', ['ACID_WORD[0,1)'], 'La palabra «ácido» va delante del nombre de un ácido, y «acetona» no es el nombre de un '
      + 'ácido. Los nombres tradicionales que van detrás de «ácido» son fórmico, acético, oxálico, fenilacético, ftálico, isoftálico '
      + 'y tereftálico (ácido acético).'],
    ['ácido tolueno', ['ACID_WORD[0,1)'], null],
    ['ácido ftalaldehído', ['ACID_WORD[0,1)'], null],
    ['ácido 1 acético', ['TEMPLATE_LOCANTS[1,2)'], '«ácido acético» ya dice dónde va su grupo COOH, en el carbono 1: no lleva números '
      + 'ni letras propios.'],
    ['ácido 1 2 oxálico', ['TEMPLATE_LOCANTS[1,3)'], '«ácido oxálico» ya dice dónde van sus dos grupos COOH, en los carbonos 1 y 2: '
      + 'no lleva números ni letras propios.'],
    ['ácido 1 2 fenilacético', ['TEMPLATE_LOCANTS[1,3)'], '«ácido fenilacético» ya dice dónde van su grupo COOH y su fenilo, en los '
      + 'carbonos 1 y 2: no lleva números ni letras propios.'],
    ['ácido o ftálico', ['TEMPLATE_LOCANTS[1,2)'], '«ácido ftálico» ya dice dónde van sus dos grupos COOH, en los carbonos 1 y 2: no '
      + 'lleva números ni letras propios.'],
    ['ácido p met il ftálico', ['POSITIONAL[1,2)'], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu '
      + 'nombre pone tres (contando los dos grupos COOH del ácido ftálico): escribe los números (1,2,4-trimetilbenceno).'],
    ['ácido p met il acético', ['POSITIONAL[1,2)'], 'Las letras «o», «m» y «p» (orto, meta y para) solo se usan con el benceno, para '
      + 'decir dónde están sus dos grupos (o-dimetilbenceno); aquí van números.'],
    ['ácido di acético', ['TILE_ORDER[1,2)'], 'Esta ficha no puede ir aquí: «di», «tri»… van delante de una rama (dimetil), no delante '
      + 'de «acético».'],
  ];
  for (const [words, errors, message] of cases) {
    assert.deepEqual(errorsOf(words), errors, words);
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    if (message) {
      assert.equal(verdict.message, message, words);
    }
  } // End of the loop over the cases
  // Inside a compound branch: the –COOH is written `carboxi`.
  const branch = readName(seq('ácido START acético END met ano oico'));
  assert.equal(branch.kind, 'invalid');
  assert.deepEqual(errorsOf('ácido START acético END met ano oico'), ['TILE_ORDER[2,3)', 'TILE_ORDER[3,4)']); // and its END
  assert.equal(branch.errors[0].message, 'Esta ficha no puede ir aquí: «acético» es el nombre de toda la molécula y va al final, '
    + 'detrás de «ácido»; dentro de una rama, el grupo COOH se escribe «carboxi», como en (carboximetil) o (4-carboxifenil).');
  // `ácido` after the template, or twice: its TILE_ORDER only.
  assert.deepEqual(errorsOf('ácido acético ácido'), ['TILE_ORDER[2,3)']);
  assert.deepEqual(errorsOf('acético ácido'), ['TILE_ORDER[1,2)']);
}); // End of test 'parser (R-5d2)…'

test('assembler and tokenizer (R-5d2): each template is one tile after `ácido` and its space, read back; the longest word first', () => {
  for (const [words, text] of ALTERNATIVES) {
    assert.equal(assemble(parse(idsOf(words)).tree).text, text, words);
    assert.deepEqual(tokenize(text), idsOf(words), text);
  }
  // `fenilacético` is its own tile (the longer surface form), not `fenil` + `acético`, which assemble alike.
  assert.equal(assemble(parse(seq('ácido fenil acético')).tree).text, 'ácido fenilacético');
  assert.deepEqual(tokenize('ácido fenilacético'), seq('ácido fenilacético'));
  // The prefixes join the word as the engine writes them, no vowel dropped: `ácido 4-hidroxiisoftálico`.
  assert.equal(assemble(parse(seq('ácido 4 hidroxi isoftálico')).tree).text, 'ácido 4-hidroxiisoftálico');
  for (const name of ['acético', 'fórmico', 'ácido 1-acético', 'ácido o-ftálico', 'ácido diacético', 'ácido acéticooico',
    'ácido acetona', 'ácidoacético', 'ácido acético ácido']) {
    assert.equal(tokenize(name), null, name);
  }
}); // End of test 'assembler and tokenizer (R-5d2)…'

// ---------------------------------------------------------------------------
// Interpreter, builder and search.
// ---------------------------------------------------------------------------

test('interpreter (R-5d2): a chain acid template is an open chain with its –COOH placed; a ftálico, benzene with two outside', () => {
  let spec = specOf('ácido acético');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.parent.template.value, spec.parent.template.groups],
    ['chain', 2, 'aceticAcid', []]);
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.hydroxy, spec.suffix.placed, spec.suffix.terminal],
    ['acid', false, true, true, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value]), [['implicit', 1]]);
  assert.deepEqual([spec.classWord.kind, spec.classWord.tiles, spec.traditional.value, spec.leftOut], ['acid', [0, 1], 'aceticAcid', []]);
  // The template quoted with its class word, as the messages say it.
  assert.deepEqual([spec.parent.template.word.text, spec.suffix.word.text], ['ácido acético', 'ácido acético']);
  spec = specOf('ácido fórmico');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.suffix.slots.map((slot) => slot.value)], ['chain', 1, [1]]);
  spec = specOf('ácido oxálico');
  assert.deepEqual([spec.parent.length, spec.suffix.slots.map((slot) => slot.value)], [2, [1, 2]]);
  spec = specOf('ácido fenilacético');
  const [phenyl] = spec.parent.template.groups;
  assert.deepEqual([phenyl.substituent.kind, phenyl.slots.map((slot) => slot.value), spec.suffix.slots[0].value], ['phenyl', [2], 1]);
  spec = specOf('ácido ftálico');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.suffix.kind, spec.suffix.outside, spec.suffix.hydroxy],
    ['benzene', 6, 'acid', true, true]);
  assert.deepEqual(spec.suffix.slots.map((slot) => slot.value), [1, 2]);
  // The student's prefixes are numbered on the template's parent: the chain of `acético`, the ring of `ftálico`.
  spec = specOf('ácido 2 cloro acético');
  assert.deepEqual(spec.prefixes[0].slots.map((slot) => [slot.value, slot.domain]), [[2, [1, 2]]]);
  spec = specOf('ácido met il ftálico');
  assert.deepEqual(spec.leftOut.map((slot) => slot.domain), [[1, 6]]);
}); // End of test 'interpreter (R-5d2)…'

test('builder (R-5d2): LOCANT_RANGE on a template\'s parent, VALENCE on a carbon its word fills, each on the student\'s tiles', () => {
  const cases = [
    ['ácido 3 cloro acético', 'LOCANT_RANGE', 'La cadena del ácido acético tiene 2 carbonos, del 1 al 2: no hay carbono 3.', [1, 2]],
    ['ácido 2 cloro fórmico', 'LOCANT_RANGE', 'El ácido fórmico solo tiene 1 carbono: no hay carbono 2.', [1, 2]],
    ['ácido 4 met il fenilacético', 'LOCANT_RANGE', 'La cadena del ácido fenilacético tiene 2 carbonos, del 1 al 2: no hay carbono '
      + '4. En «ácido fenilacético» el anillo no se numera: con grupos en el anillo, escribe el nombre sistemático (ácido '
      + '2-(4-metilfenil)etanoico).', [1, 2]],
    ['ácido 9 cloro ftálico', 'LOCANT_RANGE', 'El anillo del ácido ftálico tiene 6 carbonos, del 1 al 6: no hay carbono 9.', [1, 2]],
    ['ácido 1 met il acético', 'VALENCE', 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el ácido acético, ese '
      + 'carbono ya lleva un grupo COOH.', [1, 2]],
    ['ácido 2 cloro oxálico', 'VALENCE', 'El carbono 2 tendría 5 enlaces, y un carbono solo puede tener 4: en el ácido oxálico, ese '
      + 'carbono ya lleva un grupo COOH.', [1, 2]],
    ['ácido 1 met il ftálico', 'VALENCE', 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el ácido ftálico, ese '
      + 'carbono ya lleva un grupo COOH.', [1, 2]],
  ];
  for (const [words, code, message, range] of cases) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    assert.deepEqual([verdict.errors[0].code, verdict.errors[0].message], [code, message], words);
    assert.deepEqual([verdict.errors[0].from, verdict.errors[0].to], range, words);
  }
  // Every message on `4-metilfenilacético` leads to a name the app reads; a prefix on `oxálico` fits nowhere.
  assert.equal(readName(tokenize('ácido 2-(4-metilfenil)etanoico')).kind, 'correct');
  assert.equal(readName(seq('ácido cloro oxálico')).kind, 'invalid');
}); // End of test 'builder (R-5d2)…'

test('search (R-5d2): left-out locants on a template, numbered on its parent', () => {
  const structures = (words) => searchStructures(specOf(words), { namer: nameMolecule }).structures;
  // The two –COOH fill carbons 1 and 2: a methyl goes on 3 / 6 or 4 / 5, two structures.
  assert.deepEqual(structures('ácido met il ftálico').map((s) => s.naming.name),
    ['ácido 3-metilbenceno-1,2-dicarboxílico', 'ácido 4-metilbenceno-1,2-dicarboxílico']);
  assert.equal(readName(seq('ácido met il ftálico')).message, 'Faltan números: puede ser ácido 3-metilftálico o ácido '
    + '4-metilftálico.');
  // `acético`'s carbon 1 is full: a left-out prefix goes on carbon 2, one structure.
  assert.deepEqual(structures('ácido cloro acético').map((s) => s.naming.name), ['ácido 2-cloroetanoico']);
  const filled = readName(seq('ácido START 4 met il fenil END acético'));
  assert.deepEqual([filled.kind, filled.filled], ['missingLocants', 'ácido 2-(4-metilfenil)acético']);
  const full = readName(seq('ácido tetra cloro ftálico'));
  assert.deepEqual([full.kind, full.filled], ['missingLocants', 'ácido 3,4,5,6-tetracloroftálico']);
}); // End of test 'search (R-5d2)…'

// ---------------------------------------------------------------------------
// readName(): the engine's forms, substituted templates, diagnosis.
// ---------------------------------------------------------------------------

test('readName (R-5d2): every retained acid form the engine gives is an alternative, with the engine\'s own label', () => {
  for (const [words, text, name, id, smiles] of ALTERNATIVES) {
    const verdict = readName(idsOf(words));
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, 'alternative', `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.deepEqual([verdict.matched.name, verdict.matched.style, verdict.matched.label], [text, 'traditional', traditionalLabel(id)]);
    assert.equal(verdict.message, `${VERDICT_TEXTS.correct} «${text}» es una forma válida (${traditionalLabel(id)}). `
      + `El nombre que doy primero es «${name}».`);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    assert.deepEqual([verdict.draw, verdict.errors], [true, []]);
    // One entry per –COOH, each with its OH.
    const groups = /oxálico|ftálico/.test(text) ? 2 : 1;
    assert.deepEqual([verdict.suffixAtoms.length, verdict.suffixAtoms.every((g) => g.hydroxy !== undefined)], [groups, true], text);
  } // End of the loop over the alternatives
  // `fenil` and `acético` typed as two tiles write the same text, and read as the same alternative.
  const split = readName(seq('ácido fenil acético'));
  assert.deepEqual([split.kind, split.name], ['alternative', 'ácido 2-feniletanoico']);
}); // End of test 'readName (R-5d2): every retained acid form…'

test('the forward engine lists exactly these forms; the systematic name is `correct` and announces them', () => {
  for (const [, text, name, , smiles] of ALTERNATIVES) {
    const naming = nameMolecule(parseSmiles(smiles));
    assert.equal(naming.name, name);
    assert.ok(naming.alternatives.some((alt) => alt.name === text && alt.style === 'traditional'), `${smiles}: ${text}`);
  }
  // No traditional name for a substituted fórmico, acético (but a substituted phenyl), oxálico or fenilacético.
  for (const smiles of ['ClCC(O)=O', 'CCC(O)=O', 'OC(=O)C(Cl)C1=CC=CC=C1', 'OC(=O)C(O)C(O)=O']) {
    assert.ok(nameMolecule(parseSmiles(smiles)).alternatives.every((alt) => alt.style !== 'traditional'), smiles);
  }
  const also = (id, word) => ` También se llama «${word}» (${traditionalLabel(id)}).`;
  assert.equal(readName(tokenize('ácido etanoico')).message, `${VERDICT_TEXTS.correct}${also('aceticAcid', 'ácido acético')}`);
  assert.equal(readName(tokenize('ácido benceno-1,2-dicarboxílico')).message,
    `${VERDICT_TEXTS.correct}${also('phthalicAcid', 'ácido ftálico')}`);
}); // End of test 'the forward engine lists exactly these forms…'

/**
 * Substituted acid templates the engine never writes: [tile words, the
 * text, the engine's name, SMILES, the template as the message quotes it].
 */
const SUBSTITUTED = [
  ['ácido 2 cloro acético', 'ácido 2-cloroacético', 'ácido 2-cloroetanoico', 'ClCC(O)=O', 'ácido acético'],
  ['ácido cloro acético', 'ácido cloroacético', 'ácido 2-cloroetanoico', 'ClCC(O)=O', 'ácido acético'],
  ['ácido 2 2 2 tri cloro acético', 'ácido 2,2,2-tricloroacético', 'ácido 2,2,2-tricloroetanoico', 'ClC(Cl)(Cl)C(O)=O', 'ácido acético'],
  ['ácido 2 met il acético', 'ácido 2-metilacético', 'ácido propanoico', 'CCC(O)=O', 'ácido acético'],
  ['ácido 2 hidroxi acético', 'ácido 2-hidroxiacético', 'ácido 2-hidroxietanoico', 'OCC(O)=O', 'ácido acético'],
  ['ácido met il fórmico', 'ácido metilfórmico', 'ácido etanoico', 'CC(O)=O', 'ácido fórmico'],
  ['ácido 2 cloro fenilacético', 'ácido 2-clorofenilacético', 'ácido 2-cloro-2-feniletanoico', 'OC(=O)C(Cl)C1=CC=CC=C1',
    'ácido fenilacético'],
];

test('readName (R-5d2): a substituted chain acid template draws its molecule, named by the app, with SUBSTITUTED_TEMPLATE', () => {
  for (const [words, text, name, smiles, template] of SUBSTITUTED) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, 'otherName', `${text}: ${verdict.message}`);
    assert.deepEqual([verdict.name, verdict.message], [name, otherNameMessage(name)], text);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    const { diagnosis } = verdict;
    assert.ok(diagnosis, `${text}: no diagnosis`);
    assert.deepEqual([diagnosis.code, diagnosis.rule, diagnosis.step], ['SUBSTITUTED_TEMPLATE', 2, 'groupChain'], text);
    assert.equal(diagnosis.message, `El nombre tradicional «${template}» no admite sustituyentes: con más grupos, la molécula se `
      + `nombra con su nombre sistemático: «${name}».`, text);
    assert.deepEqual(diagnosis.tiles, [ids.length - 1, ids.length], `${text}: the template's tile`);
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok(opened.index >= 0 && [diagnosis.step, ...STEP_FALLBACKS[diagnosis.step]].includes(opened.steps[opened.index].id), text);
  } // End of the loop over the substituted templates
}); // End of test 'readName (R-5d2): a substituted chain acid template…'

/**
 * Prefixes the engine admits on an acid template, judged by the other rules
 * (never SUBSTITUTED_TEMPLATE): [tile words, the engine's name, the code,
 * the step «Ver el paso» opens, the message].
 */
const ADMITTED = [
  // A ftálico numbered otherwise: the ring rule, as for `ácido 5-metilbenceno-1,2-dicarboxílico`.
  ['ácido 5 met il ftálico', 'ácido 4-metilbenceno-1,2-dicarboxílico', 'RING_NUMBERING', 'ringNumbering', 'Hay que numerar el '
    + 'anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los sustituyentes tienen que llevar los '
    + 'números más bajos (4 en vez de 5).'],
  // The phenyl on `acético` numbered otherwise: «Nombra los sustituyentes» numbers it from the carbon bonded to the chain.
  ['ácido 2 START 5 met il fenil END acético', 'ácido 2-(3-metilfenil)etanoico', 'BRANCH_RING_NUMBERING', 'substituents', 'Un '
    + 'anillo que va en una rama se numera empezando por el carbono por el que se une, que es el 1, y siguiendo en el sentido que '
    + 'da los números más bajos a sus sustituyentes: «3-metilfenil», no «5-metilfenil».'],
  // The locant the engine's traditional form leaves out (`ácido fenilacético`), written, as `2-fenilacetaldehído` (R-5c3b2).
  ['ácido 2 fenil acético', 'ácido 2-feniletanoico', 'NEEDLESS_LOCANTS', 'assemble', 'El nombre tradicional «ácido fenilacético» '
    + 'se escribe sin números: «ácido fenilacético», no «ácido 2-fenilacético».'],
];

test('readName (R-5d2): prefixes the engine admits on an acid template are judged by the other rules', () => {
  for (const [words, name, code, step, message] of ADMITTED) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], words);
    assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.step, verdict.diagnosis.message], [code, step, message], words);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, step, words);
  }
  assert.equal(templateAdmits('phthalicAcid', specOf('ácido 5 met il ftálico').prefixes), true);
  assert.equal(templateAdmits('aceticAcid', specOf('ácido 2 START 4 met il fenil END acético').prefixes), true);
  assert.equal(templateAdmits('aceticAcid', specOf('ácido 2 cloro acético').prefixes), false);
  assert.equal(templateAdmits('formicAcid', specOf('ácido fenil fórmico').prefixes), false);
  assert.equal(templateAdmits('phenylaceticAcid', specOf('ácido 2 cloro fenilacético').prefixes), false);
  // The forms the engine writes stay its alternatives; two phenyls make two rings, out of scope.
  for (const words of ['ácido fenilacético', 'ácido fenil acético', 'ácido 2 START 3 met il fenil END acético',
    'ácido 3 met il ftálico', 'ácido 2 met il tereftálico']) {
    assert.equal(readName(seq(words)).kind, 'alternative', words);
  }
  assert.equal(readName(seq('ácido 2 2 di fenil acético')).kind, 'outOfScope');
}); // End of test 'readName (R-5d2): prefixes the engine admits…'

/**
 * Acid templates whose –COOH groups are not the engine's: deliberate nulls
 * of diagnose.js «Acids» until phase I-51d3 (acidChecks() first), now the
 * acid's own diagnoses — `carbon`: the engine's –COOH carbon is outside a
 * ring, the student's the chain's carbon 1 (ACID_CARBON); `count`: the
 * student's word cites fewer –COOH groups than the engine's name, another
 * written `carboxi` (CARBONYL_PREFIX). [tile words, the engine's name, the
 * category, the code, the message].
 */
const FORMER_NULLS = [
  ['ácido fenil fórmico', 'ácido benzoico', 'carbon', 'ACID_CARBON', 'Cuando el grupo –COOH está unido a un anillo, su carbono no '
    + 'forma parte del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra con «ácido benzoico» '
    + '(el benceno con un grupo –COOH). Se escribe «ácido benzoico».'],
  ['ácido START 4 met il fenil END fórmico', 'ácido 4-metilbenzoico', 'carbon', 'ACID_CARBON', 'Cuando el grupo –COOH está unido '
    + 'a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se '
    + 'nombra con «ácido benzoico» (el benceno con un grupo –COOH). Se escribe «ácido 4-metilbenzoico».'],
  ['ácido 2 carboxi acético', 'ácido propanodioico', 'count', 'CARBONYL_PREFIX', 'Los grupos –COOH son el grupo principal: los de '
    + 'la cadena principal se nombran todos juntos con la palabra «ácido» al principio del nombre y la terminación «-dioico» al '
    + 'final, no con el prefijo «carboxi». Su carbono entra en la cadena principal. Se escribe «ácido propanodioico».'],
  ['ácido 4 carboxi ftálico', 'ácido benceno-1,2,4-tricarboxílico', 'count', 'CARBONYL_PREFIX', 'Los grupos –COOH son el grupo '
    + 'principal: los unidos al anillo se nombran todos juntos con la palabra «ácido» al principio del nombre y la terminación '
    + '«-tricarboxílico» al final, no con el prefijo «carboxi». Se escribe «ácido benceno-1,2,4-tricarboxílico».'],
];

test('readName (R-5d2, R-5d3): a template whose –COOH groups are not the engine\'s gets the acid\'s own diagnosis', () => {
  for (const [words, name, category, code, message] of FORMER_NULLS) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], words);
    const engine = verdict.naming.structure.suffix;
    const mine = verdict.suffixAtoms.filter((g) => g.hydroxy !== undefined);
    const why = mine.length === engine.locants.length ? 'carbon' : 'count';
    assert.equal(why, category, words);
    if (category === 'carbon') {
      assert.deepEqual([mine.some((g) => g.carbon !== undefined), Boolean(engine.outside)], [false, true], words);
    }
    const d = verdict.diagnosis;
    assert.ok(d, `${words}: no diagnosis`);
    assert.deepEqual([d.code, d.rule, d.traceRule, d.step, d.message], [code, 1, null, 'group', message], words);
    // The tiles: the template's word (ACID_CARBON, the suffix), or the `carboxi` prefix with its locant (CARBONYL_PREFIX).
    assert.deepEqual(d.tiles, code === 'ACID_CARBON' ? [ids.length - 1, ids.length] : [1, 3], words);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, 'group', words);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the former deliberate nulls
}); // End of test 'readName (R-5d2, R-5d3): a template whose –COOH groups…' 

// ---------------------------------------------------------------------------
// Fixtures, closed loop, drawing and time.
// ---------------------------------------------------------------------------

test('fixture round trip (R-5d2): every fixture name with a retained acid word reads back, graph compared with the SMILES', async () => {
  const rows = (await readFixtures()).filter((row) => isAcid(row.smiles));
  const covered = [];
  for (const row of rows) {
    for (const name of row.names.filter(isAcidTemplateName)) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      assert.equal(assemble(parse(ids).tree).text, name, `names.tsv:${row.line}: assembly`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, name === row.names[0] ? 'correct' : 'alternative', `names.tsv:${row.line}: ${verdict.message}`);
      assert.equal(verdict.name, row.names[0]);
      assert.equal(aromaticKey(verdict.molecule), keyOf(row.smiles), `names.tsv:${row.line}: ${name}`);
      covered.push(name);
    }
  } // End of the loop over the fixture rows
  assert.deepEqual(covered, ['ácido fórmico', 'ácido acético', 'ácido oxálico', 'ácido fenilacético', 'ácido isoftálico',
    'ácido ftálico', 'ácido tereftálico', 'ácido 4-metilftálico', 'ácido 5-cloroisoftálico', 'ácido 2-(3-metilfenil)acético']);
}); // End of test 'fixture round trip (R-5d2)…'

/** Molecules whose engine names include a retained acid name, with ring prefixes or a substituted phenyl where admitted. */
const LOOP_SMILES = Object.freeze([
  'OC=O', 'CC(O)=O', 'OC(=O)C(O)=O', 'OC(=O)CC1=CC=CC=C1', 'OC(=O)CC1=CC=CC(C)=C1', 'OC(=O)CC1=CC=C(Cl)C=C1',
  'OC(=O)CC1=CC=C(OC)C=C1', 'OC(=O)C1=CC=CC=C1C(O)=O', 'OC(=O)C1=CC=CC(C(O)=O)=C1', 'OC(=O)C1=CC=C(C(O)=O)C=C1',
  'CC1=CC=C(C(O)=O)C(C(O)=O)=C1', 'CC1=CC=CC(C(O)=O)=C1C(O)=O', 'ClC1=CC(C(O)=O)=CC(C(O)=O)=C1', 'BrC1=CC(C(O)=O)=C(Cl)C=C1C(O)=O',
  'CC1=C(C(O)=O)C=CC(C(O)=O)=C1', 'CCC1=C(C(O)=O)C=CC(C(O)=O)=C1', 'OC1=CC=C(C(O)=O)C=C1C(O)=O', 'COC1=CC=C(C(O)=O)C(C(O)=O)=C1',
  'ClC1=C(Cl)C(Cl)=C(C(O)=O)C(C(O)=O)=C1Cl',
]);

test('closed loop (R-5d2): engine acid template name → tiles → readName() → the same graph, then without each locant list', () => {
  const counts = { names: 0, removed: 0, decisive: 0 };
  for (const smiles of LOOP_SMILES) {
    const mol = parseSmiles(smiles);
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, smiles);
    const key = aromaticKey(mol);
    const names = naming.alternatives.map((alt) => alt.name).filter(isAcidTemplateName);
    assert.ok(names.length > 0, `${smiles}: ${naming.name}`);
    for (const name of names) {
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, 'alternative', `${name}: ${verdict.message}`);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      const { tree } = parse(ids);
      for (const item of tree.items.filter((it) => it.type === 'prefix' && it.locants.length > 0)) {
        const reread = readName(ids.filter((_, j) => !item.locants.includes(j)));
        counts.removed += 1;
        const where = `${name} → ${reread.text}: ${reread.kind}, ${reread.message}`;
        if (reread.kind === 'ambiguous') {
          assert.ok(reread.candidates.some((c) => aromaticKey(c.molecule) === key), where);
        } else {
          assert.ok(['missingLocants', 'otherName'].includes(reread.kind), where);
          assert.equal(aromaticKey(reread.molecule), key, where);
          if (reread.kind === 'missingLocants') {
            assert.equal(reread.filled, name, where);
          }
        }
        counts.decisive += 1;
      } // End of the loop over the locant lists
    } // End of the loop over the template names of a molecule
  } // End of the loop over the molecules
  assert.deepEqual(counts, { names: 19, removed: 13, decisive: 13 }, JSON.stringify(counts));
}); // End of test 'closed loop (R-5d2)…'

test('«Dibujar» (R-5d2): acid template verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const words of ['ácido fórmico', 'ácido acético', 'ácido oxálico', 'ácido fenilacético', 'ácido ftálico', 'ácido tereftálico',
    'ácido 4 met il ftálico', 'ácido 2 cloro acético', 'ácido 2 START 3 met il fenil END acético']) {
    const verdict = readName(seq(words));
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-5d2)…'

test('time (R-5d2): representative acid template names within the per-name budget', () => {
  const all = ['ácido tetra cloro ftálico', 'ácido di met il ftálico', 'ácido START 4 met il fenil END acético', 'ácido cloro acético',
    'ácido 2 START 5 met il fenil END acético'];
  all.forEach((words) => readName(seq(words))); // Warm-up.
  for (const words of all) {
    const start = performance.now();
    readName(seq(words));
    const elapsed = performance.now() - start;
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
  }
}); // End of test 'time (R-5d2)…'
