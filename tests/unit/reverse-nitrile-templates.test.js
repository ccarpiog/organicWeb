/**
 * @file Unit tests for the retained nitrile names of «¿Cómo se dibuja?»
 * (src/reverse/, design.md §13.4 I-38, I-40c, §14.5, §15.5.3, §15.7, §15.8
 * R-6b; phase I-52b2, R-6b2): the «Nombres tradicionales» tiles
 * `acetonitrilo`, `fenilacetonitrilo` and `ftalonitrilo` (the engine writes
 * no `isoftalonitrilo` or `tereftalonitrilo`) through the parser
 * (TEMPLATE_LOCANTS, POSITIONAL, TILE_ORDER, and the pairing errors ACID_WORD
 * and ESTER_SUFFIX, each with its message and tile range), the assembler and
 * the tokenizer, interpret.js (the chain templates as an open chain with
 * their –C≡N placed at carbon 1, `ftalonitrilo` as benzene with two –C≡N
 * outside the ring), build.js (LOCANT_RANGE and VALENCE messages), search.js
 * and readName(): every form the forward engine lists read as `alternative`
 * with the engine's own label and the molecule compared by aromatic key with
 * a SMILES; the substituted forms the engine writes itself
 * (`4-metilftalonitrilo`, `2-(4-metilfenil)acetonitrilo`) read as
 * alternatives, any other prefix as `otherName` with the SUBSTITUTED_TEMPLATE
 * diagnosis, the prefixes the engine admits judged by the other rules
 * (RING_NUMBERING, BRANCH_RING_NUMBERING, the NEEDLESS_LOCANTS of
 * `2-fenilacetonitrilo`); the nitrile's own mistakes on a template, each with
 * its category read independently — another –C≡N written `ciano` (`count`,
 * CARBONYL_PREFIX), the word beside a senior group (`seniority`,
 * CARBONYL_SENIORITY) —, deliberate nulls of diagnose.js «Nitriles» until
 * phase I-52b3, now each with its code, message and step; the tooltips; the fixture names;
 * a closed loop over the engine's retained nitrile names with each locant
 * list removed, and over the generators' ones; the diagnosis sweeps over the
 * retained names (fixture and generated), apart from those of phase R-6b1
 * (reverse-nitriles.test.js); the ordered drawing; random and partial names;
 * time budgets.
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
import {
  TILES, TEMPLATES, withArticle, templateAdmits, isNitrileTemplate, isAcidTemplate, isEsterTemplate, isCarbonylTemplate,
  parentWordName,
} from '../../src/reverse/tiles.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { traditionalLabel } from '../../src/naming/lexicon.es.js';
import {
  generateNitriles, generateCyano, generateRingNitrilesAmides, generateRingOutsideBenzenes, generateRingPolysuffixBenzenes,
  generateSubstitutedPhenyls, generateSubstitutedBenzoyls, generateAcyl,
} from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, isNitrile, isNitrileMolecule, isNitrileTemplateName, NITRILE_TEMPLATE_WORDS } from './reverse-words.js';

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
    ids = tokenize(name); // A name text: `2-(4-metilfenil)acetonitrilo`.
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
 * The nitrogens of a molecule's –C≡N groups a verdict's suffix places (the
 * suffixAtoms whose attachment is a nitrogen).
 *
 * @param {object} verdict - A drawn readName() verdict.
 * @returns {object[]} The suffix entries.
 */
function nitrileSuffixAtoms(verdict) {
  return (verdict.suffixAtoms || []).filter((g) => verdict.molecule.atoms.get(g.attachment).element === 'N');
}

/**
 * Every retained nitrile form the forward engine gives (principal.js
 * carbonylTraditionalId(), aromatic.js retainedDigroupIds()): [tile words,
 * the text, the engine's name, its TRADITIONAL_LABELS id, SMILES].
 */
const ALTERNATIVES = [
  ['acetonitrilo', 'acetonitrilo', 'etanonitrilo', 'acetonitrile', 'CC#N'],
  ['fenilacetonitrilo', 'fenilacetonitrilo', '2-feniletanonitrilo', 'phenylacetonitrile', 'N#CCC1=CC=CC=C1'],
  ['ftalonitrilo', 'ftalonitrilo', 'benceno-1,2-dicarbonitrilo', 'phthalonitrile', 'N#CC1=CC=CC=C1C#N'],
  // The substituted forms the engine writes itself: `ftalonitrilo` with ring prefixes, `acetonitrilo` with a substituted phenyl.
  ['4 met il ftalonitrilo', '4-metilftalonitrilo', '4-metilbenceno-1,2-dicarbonitrilo', 'phthalonitrile', 'CC1=CC=C(C#N)C(C#N)=C1'],
  ['3 met il ftalonitrilo', '3-metilftalonitrilo', '3-metilbenceno-1,2-dicarbonitrilo', 'phthalonitrile', 'CC1=CC=CC(C#N)=C1C#N'],
  ['4 bromo 5 cloro ftalonitrilo', '4-bromo-5-cloroftalonitrilo', '4-bromo-5-clorobenceno-1,2-dicarbonitrilo', 'phthalonitrile',
    'BrC1=CC(C#N)=C(C#N)C=C1Cl'],
  ['2 START 4 met il fenil END acetonitrilo', '2-(4-metilfenil)acetonitrilo', '2-(4-metilfenil)etanonitrilo', 'arylacetonitrile',
    'N#CCC1=CC=C(C)C=C1'],
  ['2 START 3 cloro fenil END acetonitrilo', '2-(3-clorofenil)acetonitrilo', '2-(3-clorofenil)etanonitrilo', 'arylacetonitrile',
    'N#CCC1=CC=CC(Cl)=C1'],
];

// ---------------------------------------------------------------------------
// Tiles, parser, assembler and tokenizer.
// ---------------------------------------------------------------------------

test('«Nombres tradicionales» (R-6b2): the three nitrile tiles after the ester ones, each with a tooltip; quoted as on the tile', () => {
  const nitriles = TILES.filter((tile) => tile.kind === 'template' && tile.row === 'traditional').slice(28);
  assert.deepEqual(nitriles.map((tile) => tile.text), [...NITRILE_TEMPLATE_WORDS]);
  assert.deepEqual(nitriles.map((tile) => tile.text), ['acetonitrilo', 'fenilacetonitrilo', 'ftalonitrilo']);
  assert.deepEqual(nitriles.map((tile) => tile.id), ['template-acetonitrile', 'template-phenylacetonitrile', 'template-phthalonitrile']);
  for (const tile of nitriles) {
    assert.ok(TILE_HINTS[tile.id] && TILE_HINTS[tile.id].endsWith('.'), tile.id);
    assert.ok(!/undefined|null/.test(TILE_HINTS[tile.id]), tile.id);
    assert.match(TILE_HINTS[tile.id], /(?:etano|benceno-1,2-dicarbo)nitrilo/, tile.id); // Its systematic name.
    assert.ok(isNitrileTemplate(tile.value) && !isAcidTemplate(tile.value) && !isEsterTemplate(tile.value)
      && !isCarbonylTemplate(tile.value), tile.id);
    assert.equal(parentWordName(tile), tile.text, tile.id); // No class word: the name is the word.
  }
  assert.deepEqual(nitriles.map((tile) => [TEMPLATES[tile.value].suffix.value, TEMPLATES[tile.value].suffix.positions]),
    [['nitrile', [1]], ['nitrile', [1]], ['carbonitrile', [1, 2]]]);
  assert.match(TILE_HINTS['template-acetonitrile'], /etanonitrilo\. Admite un fenil en el carbono 2: 2-\(4-metilfenil\)acetonitrilo/);
  assert.match(TILE_HINTS['template-phenylacetonitrile'], /2-feniletanonitrilo/);
  assert.match(TILE_HINTS['template-phthalonitrile'], /benceno-1,2-dicarbonitrilo\. Admite ramas en el anillo: 4-metilftalonitrilo/);
  assert.deepEqual(['acetonitrilo', 'fenilacetonitrilo', 'ftalonitrilo'].map((word) => withArticle(word, 'de')),
    ['del acetonitrilo', 'del fenilacetonitrilo', 'del ftalonitrilo']);
  // Only the 1,2 benzene dinitrile has a retained name (aromatic.js): no `isoftalonitrilo` or `tereftalonitrilo` tile.
  assert.ok(!TILES.some((tile) => /isoftalonitrilo|tereftalonitrilo/.test(tile.text)));
}); // End of test '«Nombres tradicionales» (R-6b2)…'

test('parser (R-6b2): numbers or a letter on a nitrile template, a multiplier before it, pairing errors, one in a branch', () => {
  const cases = [
    ['1 acetonitrilo', ['TEMPLATE_LOCANTS[0,1)'], '«acetonitrilo» ya dice dónde va su grupo C≡N, en el carbono 1: no lleva números ni '
      + 'letras propios.'],
    ['1 2 fenilacetonitrilo', ['TEMPLATE_LOCANTS[0,2)'], '«fenilacetonitrilo» ya dice dónde van su grupo C≡N y su fenilo, en los '
      + 'carbonos 1 y 2: no lleva números ni letras propios.'],
    ['o ftalonitrilo', ['TEMPLATE_LOCANTS[0,1)'], '«ftalonitrilo» ya dice dónde van sus dos grupos C≡N, en los carbonos 1 y 2: no '
      + 'lleva números ni letras propios.'],
    ['1 2 ftalonitrilo', ['TEMPLATE_LOCANTS[0,2)'], null],
    ['p met il ftalonitrilo', ['POSITIONAL[0,1)'], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu '
      + 'nombre pone tres (contando los dos grupos C≡N del ftalonitrilo): escribe los números (1,2,4-trimetilbenceno).'],
    ['p met il acetonitrilo', ['POSITIONAL[0,1)'], 'Las letras «o», «m» y «p» (orto, meta y para) solo se usan con el benceno, para '
      + 'decir dónde están sus dos grupos (o-dimetilbenceno); aquí van números.'],
    ['di acetonitrilo', ['TILE_ORDER[0,1)'], 'Esta ficha no puede ir aquí: «di», «tri»… van delante de una rama (dimetil), no delante '
      + 'de «acetonitrilo».'],
    // `ácido` before a retained nitrile word: the error on `ácido`, with the retained acid words.
    ['ácido acetonitrilo', ['ACID_WORD[0,1)'], 'La palabra «ácido» va delante del nombre de un ácido, y «acetonitrilo» no es el nombre '
      + 'de un ácido. Los nombres tradicionales que van detrás de «ácido» son fórmico, acético, oxálico, fenilacético, ftálico, '
      + 'isoftálico y tereftálico (ácido acético).'],
    ['ácido ftalonitrilo', ['ACID_WORD[0,1)'], null],
    // An O-bound side after a retained nitrile word: no ester suffix before it.
    ['acetonitrilo met ilo', ['ESTER_SUFFIX[1,3)'], 'El grupo acabado en «ilo» es el que va unido al oxígeno de un éster, detrás de la '
      + 'parte ácida, y el nombre de esa parte termina en «oato» (etanoato de metilo), en «carboxilato» (ciclohexanocarboxilato de '
      + 'etilo) o en «benzoato» (benzoato de metilo).'],
    // A suffix after the word, which already places its –C≡N groups: out of place, as after any template.
    ['acetonitrilo nitrilo', ['TILE_ORDER[1,2)'], 'Esta ficha no puede ir aquí: el nombre termina con la cadena principal (la raíz y su '
      + 'terminación); las ramas van delante.'],
    ['ftalonitrilo carbonitrilo', ['TILE_ORDER[1,2)'], null],
    ['2 met il fenilacetonitrilo oico', ['TILE_ORDER[4,5)'], null],
  ];
  for (const [words, errors, message] of cases) {
    assert.deepEqual(errorsOf(words), errors, words);
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    if (message) {
      assert.equal(verdict.message, message, words);
    }
  } // End of the loop over the cases
  // Inside a compound branch, or in an ester's O-bound side: the –C≡N is written `ciano`.
  const hint = (word) => `Esta ficha no puede ir aquí: «${word}» es el nombre de toda la molécula y va al final; dentro de una rama, `
    + 'el grupo C≡N se escribe «ciano», como en (cianometil) o (4-cianofenil).';
  const branch = readName(seq('START acetonitrilo END met ano'));
  assert.deepEqual(errorsOf('START acetonitrilo END met ano'), ['TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']); // and its END
  assert.equal(branch.errors[0].message, hint('acetonitrilo'));
  assert.equal(readName(seq('START 4 met il ftalonitrilo END met ano')).errors.find((e) => e.from === 4).message, hint('ftalonitrilo'));
  assert.deepEqual(errorsOf('et ano oato acetonitrilo'), ['TILE_ORDER[3,4)']);
  assert.equal(readName(seq('et ano oato acetonitrilo')).message, hint('acetonitrilo'));
}); // End of test 'parser (R-6b2)…'

test('assembler and tokenizer (R-6b2): each template is one tile, read back; the longest word first', () => {
  for (const [words, text] of ALTERNATIVES) {
    assert.equal(assemble(parse(idsOf(words)).tree).text, text, words);
    assert.deepEqual(tokenize(text), idsOf(words), text);
  }
  // `fenilacetonitrilo` is its own tile (the longer surface form), not `fenil` + `acetonitrilo`, which assemble alike.
  assert.equal(assemble(parse(seq('fenil acetonitrilo')).tree).text, 'fenilacetonitrilo');
  assert.deepEqual(tokenize('fenilacetonitrilo'), seq('fenilacetonitrilo'));
  // The prefixes join the word as the engine writes them: `4-hidroxiftalonitrilo`, `3,4,5,6-tetracloroftalonitrilo`.
  assert.equal(assemble(parse(seq('4 hidroxi ftalonitrilo')).tree).text, '4-hidroxiftalonitrilo');
  assert.equal(assemble(parse(seq('3 4 5 6 tetra cloro ftalonitrilo')).tree).text, '3,4,5,6-tetracloroftalonitrilo');
  for (const name of ['1-acetonitrilo', 'o-ftalonitrilo', 'diacetonitrilo', 'acetonitrilonitrilo', 'ácido acetonitrilo',
    'acetonitrilo de metilo', 'isoftalonitrilo', 'tereftalonitrilo', 'acetonitril', 'ftalonitrilocarbonitrilo']) {
    assert.equal(tokenize(name), null, name);
  }
}); // End of test 'assembler and tokenizer (R-6b2)…'

// ---------------------------------------------------------------------------
// Interpreter, builder and search.
// ---------------------------------------------------------------------------

test('interpreter (R-6b2): a chain nitrile template is an open chain with its –C≡N placed; `ftalonitrilo`, benzene with two outside', () => {
  let spec = specOf('acetonitrilo');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.parent.template.value, spec.parent.template.groups],
    ['chain', 2, 'acetonitrile', []]);
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.hydroxy, spec.suffix.bridge, spec.suffix.placed,
    spec.suffix.terminal], ['nitrile', false, false, false, true, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value]), [['implicit', 1]]);
  assert.deepEqual([spec.classWord, spec.ester, spec.traditional.value, spec.leftOut], [null, null, 'acetonitrile', []]);
  assert.deepEqual([spec.parent.template.word.text, spec.suffix.word.text], ['acetonitrilo', 'acetonitrilo']);
  spec = specOf('fenilacetonitrilo');
  const [phenyl] = spec.parent.template.groups;
  assert.deepEqual([phenyl.substituent.kind, phenyl.slots.map((slot) => slot.value), spec.suffix.slots[0].value], ['phenyl', [2], 1]);
  spec = specOf('ftalonitrilo');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.suffix.kind, spec.suffix.outside, spec.suffix.hydroxy],
    ['benzene', 6, 'nitrile', true, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => slot.value), [1, 2]);
  // The student's prefixes are numbered on the template's parent: the chain of `acetonitrilo`, the ring of `ftalonitrilo`.
  spec = specOf('2 cloro acetonitrilo');
  assert.deepEqual(spec.prefixes[0].slots.map((slot) => [slot.value, slot.domain]), [[2, [1, 2]]]);
  spec = specOf('met il ftalonitrilo');
  assert.deepEqual(spec.leftOut.map((slot) => slot.domain), [[1, 6]]);
}); // End of test 'interpreter (R-6b2)…'

test('builder (R-6b2): each –C≡N a nitrogen triple-bonded to its carbon; LOCANT_RANGE and VALENCE on the student\'s tiles', () => {
  // The molecule: `acetonitrilo`'s –C≡N carbon is the chain's carbon 1; `ftalonitrilo`'s two are outside the ring.
  for (const [words, smiles] of [['acetonitrilo', 'CC#N'], ['ftalonitrilo', 'N#CC1=CC=CC=C1C#N']]) {
    const verdict = readName(seq(words));
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), words);
    const groups = nitrileSuffixAtoms(verdict);
    assert.ok(groups.every((g) => verdict.molecule.bonds.get(g.bond).order === 3), words);
    assert.deepEqual(groups.map((g) => g.carbon !== undefined), words === 'ftalonitrilo' ? [true, true] : [false], words);
  }
  const cases = [
    ['3 cloro acetonitrilo', 'LOCANT_RANGE', 'La cadena del acetonitrilo tiene 2 carbonos, del 1 al 2: no hay carbono 3.'],
    ['4 met il fenilacetonitrilo', 'LOCANT_RANGE', 'La cadena del fenilacetonitrilo tiene 2 carbonos, del 1 al 2: no hay carbono 4. '
      + 'En «fenilacetonitrilo» el anillo no se numera: con grupos en el anillo, escribe el nombre sistemático '
      + '(2-(4-metilfenil)etanonitrilo).'],
    ['9 cloro ftalonitrilo', 'LOCANT_RANGE', 'El anillo del ftalonitrilo tiene 6 carbonos, del 1 al 6: no hay carbono 9.'],
    ['1 met il acetonitrilo', 'VALENCE', 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el acetonitrilo, ese '
      + 'carbono ya lleva un grupo C≡N.'],
    ['1 met il ftalonitrilo', 'VALENCE', 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el ftalonitrilo, ese '
      + 'carbono ya lleva un grupo C≡N.'],
  ];
  for (const [words, code, message] of cases) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    assert.deepEqual([verdict.errors[0].code, verdict.errors[0].message], [code, message], words);
    assert.deepEqual([verdict.errors[0].from, verdict.errors[0].to], [0, 1], words);
  }
  // The aryl on carbon 1 of `acetonitrilo` fits nowhere: that carbon is the –C≡N's.
  const aryl = readName(seq('1 START 4 met il fenil END acetonitrilo'));
  assert.deepEqual([aryl.kind, aryl.errors[0].code, aryl.errors[0].from, aryl.errors[0].to], ['invalid', 'VALENCE', 0, 1]);
  // The message on `4-metilfenilacetonitrilo` leads to a name the app reads.
  assert.equal(readName(tokenize('2-(4-metilfenil)etanonitrilo')).kind, 'correct');
}); // End of test 'builder (R-6b2)…'

test('search (R-6b2): left-out locants on a template, numbered on its parent', () => {
  const structures = (words) => searchStructures(specOf(words), { namer: nameMolecule }).structures;
  // The two –C≡N fill carbons 1 and 2: a methyl goes on 3 / 6 or 4 / 5, two structures.
  assert.deepEqual(structures('met il ftalonitrilo').map((s) => s.naming.name),
    ['3-metilbenceno-1,2-dicarbonitrilo', '4-metilbenceno-1,2-dicarbonitrilo']);
  assert.equal(readName(seq('met il ftalonitrilo')).message, 'Faltan números: puede ser 3-metilftalonitrilo o 4-metilftalonitrilo.');
  // `acetonitrilo`'s carbon 1 is full: a left-out prefix goes on carbon 2, one structure.
  assert.deepEqual(structures('cloro acetonitrilo').map((s) => s.naming.name), ['2-cloroetanonitrilo']);
  const filled = readName(seq('START 4 met il fenil END acetonitrilo'));
  assert.deepEqual([filled.kind, filled.filled], ['missingLocants', '2-(4-metilfenil)acetonitrilo']);
  const full = readName(seq('tetra cloro ftalonitrilo'));
  assert.deepEqual([full.kind, full.filled], ['missingLocants', '3,4,5,6-tetracloroftalonitrilo']);
}); // End of test 'search (R-6b2)…'

// ---------------------------------------------------------------------------
// readName(): the engine's forms, substituted templates, diagnosis.
// ---------------------------------------------------------------------------

test('readName (R-6b2): every retained nitrile form the engine gives is an alternative, with the engine\'s own label', () => {
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
    // One entry per –C≡N, each a nitrogen.
    assert.equal(nitrileSuffixAtoms(verdict).length, /ftalonitrilo/.test(text) ? 2 : 1, text);
    assert.equal(verdict.suffixAtoms.length, nitrileSuffixAtoms(verdict).length, text);
  } // End of the loop over the alternatives
  // `fenil` and `acetonitrilo` typed as two tiles write the same text, and read as the same alternative.
  const split = readName(seq('fenil acetonitrilo'));
  assert.deepEqual([split.kind, split.name, split.text], ['alternative', '2-feniletanonitrilo', 'fenilacetonitrilo']);
}); // End of test 'readName (R-6b2): every retained nitrile form…'

test('the forward engine lists exactly these forms; the systematic name is `correct` and announces them', () => {
  for (const [, text, name, , smiles] of ALTERNATIVES) {
    const naming = nameMolecule(parseSmiles(smiles));
    assert.equal(naming.name, name);
    assert.ok(naming.alternatives.some((alt) => alt.name === text && alt.style === 'traditional'), `${smiles}: ${text}`);
  }
  // No traditional name for a substituted acetonitrilo (but a substituted phenyl) or fenilacetonitrilo, nor for the benzene 1,3- and
  // 1,4-dinitriles (no `isoftalonitrilo`, `tereftalonitrilo`).
  for (const smiles of ['ClCC#N', 'CCC#N', 'N#CC(Cl)C1=CC=CC=C1', 'N#CCC#N', 'N#CC1=CC=CC(C#N)=C1', 'N#CC1=CC=C(C#N)C=C1']) {
    assert.ok(nameMolecule(parseSmiles(smiles)).alternatives.every((alt) => alt.style !== 'traditional'), smiles);
  }
  const also = (id, word) => ` También se llama «${word}» (${traditionalLabel(id)}).`;
  assert.equal(readName(tokenize('etanonitrilo')).message, `${VERDICT_TEXTS.correct}${also('acetonitrile', 'acetonitrilo')}`);
  assert.equal(readName(tokenize('benceno-1,2-dicarbonitrilo')).message,
    `${VERDICT_TEXTS.correct}${also('phthalonitrile', 'ftalonitrilo')}`);
}); // End of test 'the forward engine lists exactly these forms…'

/**
 * Substituted nitrile templates the engine never writes: [tile words, the
 * text, the engine's name, SMILES, the template word].
 */
const SUBSTITUTED = [
  ['2 cloro acetonitrilo', '2-cloroacetonitrilo', '2-cloroetanonitrilo', 'ClCC#N', 'acetonitrilo'],
  ['cloro acetonitrilo', 'cloroacetonitrilo', '2-cloroetanonitrilo', 'ClCC#N', 'acetonitrilo'],
  ['2 2 2 tri cloro acetonitrilo', '2,2,2-tricloroacetonitrilo', '2,2,2-tricloroetanonitrilo', 'ClC(Cl)(Cl)C#N', 'acetonitrilo'],
  ['2 met il acetonitrilo', '2-metilacetonitrilo', 'propanonitrilo', 'CCC#N', 'acetonitrilo'],
  ['2 hidroxi acetonitrilo', '2-hidroxiacetonitrilo', '2-hidroxietanonitrilo', 'OCC#N', 'acetonitrilo'],
  ['2 ciclo hex il acetonitrilo', '2-ciclohexilacetonitrilo', '2-ciclohexiletanonitrilo', 'N#CCC1CCCCC1', 'acetonitrilo'],
  ['2 cloro fenilacetonitrilo', '2-clorofenilacetonitrilo', '2-cloro-2-feniletanonitrilo', 'N#CC(Cl)C1=CC=CC=C1',
    'fenilacetonitrilo'],
  ['met il fenilacetonitrilo', 'metilfenilacetonitrilo', '2-fenilpropanonitrilo', 'CC(C#N)C1=CC=CC=C1', 'fenilacetonitrilo'],
];

test('readName (R-6b2): a substituted chain nitrile template draws its molecule, named by the app, with SUBSTITUTED_TEMPLATE', () => {
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
}); // End of test 'readName (R-6b2): a substituted chain nitrile template…'

/**
 * Prefixes the engine admits on a nitrile template, judged by the other
 * rules (never SUBSTITUTED_TEMPLATE): [tile words, the engine's name, the
 * code, the step «Ver el paso» opens, the message].
 */
const ADMITTED = [
  // `ftalonitrilo` numbered otherwise: the ring rule at N1 (the –C≡N groups at 1 and 2 either way), as for
  // `5-metilbenceno-1,2-dicarbonitrilo`.
  ['5 met il ftalonitrilo', '4-metilbenceno-1,2-dicarbonitrilo', 'RING_NUMBERING', 'ringNumbering', 'Hay que numerar el anillo de '
    + 'otra manera, empezando en otro carbono o contando hacia el otro lado: los sustituyentes tienen que llevar los números más bajos '
    + '(4 en vez de 5).'],
  // The phenyl on `acetonitrilo` numbered otherwise: «Nombra los sustituyentes» numbers it from the carbon bonded to the chain.
  ['2 START 5 met il fenil END acetonitrilo', '2-(3-metilfenil)etanonitrilo', 'BRANCH_RING_NUMBERING', 'substituents', 'Un anillo '
    + 'que va en una rama se numera empezando por el carbono por el que se une, que es el 1, y siguiendo en el sentido que da los '
    + 'números más bajos a sus sustituyentes: «3-metilfenil», no «5-metilfenil».'],
  // The locant the engine's traditional form leaves out (`fenilacetonitrilo`), written, as `2-fenilacetaldehído` (R-5c3b2).
  ['2 fenil acetonitrilo', '2-feniletanonitrilo', 'NEEDLESS_LOCANTS', 'assemble', 'El nombre tradicional «fenilacetonitrilo» se '
    + 'escribe sin números: «fenilacetonitrilo», no «2-fenilacetonitrilo».'],
];

test('readName (R-6b2): prefixes the engine admits on a nitrile template are judged by the other rules', () => {
  for (const [words, name, code, step, message] of ADMITTED) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], words);
    assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.step, verdict.diagnosis.message], [code, step, message], words);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, step, words);
  }
  assert.equal(templateAdmits('phthalonitrile', specOf('5 met il ftalonitrilo').prefixes), true);
  assert.equal(templateAdmits('acetonitrile', specOf('2 START 4 met il fenil END acetonitrilo').prefixes), true);
  assert.equal(templateAdmits('acetonitrile', specOf('2 cloro acetonitrilo').prefixes), false);
  assert.equal(templateAdmits('phenylacetonitrile', specOf('2 cloro fenilacetonitrilo').prefixes), false);
  // The forms the engine writes stay its alternatives; two phenyls make two rings, out of scope.
  for (const words of ['fenilacetonitrilo', 'fenil acetonitrilo', '2 START 3 met il fenil END acetonitrilo', '3 met il ftalonitrilo',
    '4 hidroxi ftalonitrilo']) {
    assert.equal(readName(seq(words)).kind, 'alternative', words);
  }
  assert.equal(readName(seq('2 2 di fenil acetonitrilo')).kind, 'outOfScope');
}); // End of test 'readName (R-6b2): prefixes the engine admits…'

/**
 * The category of a nitrile template's own mistake, read from the verdict
 * apart from diagnose.js (as reverse-nitriles.test.js nitrileCategory()
 * does; until phase I-52b3 each was a deliberate null): `seniority` — the
 * engine's principal group is not a –C≡N (the word beside a senior group);
 * `count` — the student's –C≡N groups are not as many as the engine's suffix
 * cites (another one written `ciano`); null otherwise.
 *
 * @param {object} verdict - An `otherName` verdict.
 * @returns {string|null} The category, or null.
 */
function templateCategory(verdict) {
  const engine = verdict.naming.structure.suffix;
  const mine = nitrileSuffixAtoms(verdict);
  if (!engine || engine.kind !== 'nitrile') {
    return mine.length > 0 ? 'seniority' : null;
  }
  return mine.length !== engine.locants.length ? 'count' : null;
}

/** The codes a nitrile template's own mistake gets, by category (templateCategory(); diagnose.js «Nitriles», phase I-52b3). */
const CATEGORY_CODES = Object.freeze({ count: ['CARBONYL_PREFIX'], seniority: ['CARBONYL_SENIORITY'] });

/** The seniority sentence CARBONYL_SENIORITY starts with beside an acid, when the student's suffix is a nitrile's. */
const ACID_FIRST = 'Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: ácido > nitrilo > '
  + 'aldehído > cetona > alcohol. Aquí manda el ácido (–COOH), que se nombra ';

/**
 * A nitrile template whose –C≡N groups are not the engine's: deliberate
 * nulls of diagnose.js «Nitriles» until phase I-52b3, now the nitrile's own
 * diagnosis, nitrileChecks() and acidChecks() before SUBSTITUTED_TEMPLATE —
 * another –C≡N written `ciano` beside the word (CARBONYL_PREFIX, the acids'
 * `ácido 2-carboxiacético` twin), the word beside a senior group
 * (CARBONYL_SENIORITY, the `ciano` taking the –C≡N's carbon with it):
 * [tile words, the engine's name, the category, the code, the tiles, the
 * message].
 */
const FORMER_NULLS = [
  ['2 ciano acetonitrilo', 'propanodinitrilo', 'count', 'CARBONYL_PREFIX', [0, 2], 'Los grupos –C≡N son el grupo principal: los de '
    + 'la cadena principal se nombran todos juntos con la terminación «-dinitrilo», al final del nombre, no con el prefijo «ciano». '
    + 'Su carbono entra en la cadena principal. Se escribe «propanodinitrilo».'],
  ['2 ciano fenilacetonitrilo', '2-fenilpropanodinitrilo', 'count', 'CARBONYL_PREFIX', [0, 2], 'Los grupos –C≡N son el grupo '
    + 'principal: los de la cadena principal se nombran todos juntos con la terminación «-dinitrilo», al final del nombre, no con el '
    + 'prefijo «ciano». Su carbono entra en la cadena principal. Se escribe «2-fenilpropanodinitrilo».'],
  ['4 ciano ftalonitrilo', 'benceno-1,2,4-tricarbonitrilo', 'count', 'CARBONYL_PREFIX', [0, 2], 'Los grupos –C≡N son el grupo '
    + 'principal: los unidos al anillo se nombran todos juntos con la terminación «-tricarbonitrilo», al final del nombre, no con el '
    + 'prefijo «ciano». Se escribe «benceno-1,2,4-tricarbonitrilo».'],
  ['2 carboxi acetonitrilo', 'ácido 2-cianoetanoico', 'seniority', 'CARBONYL_SENIORITY', [2, 3], `${ACID_FIRST}con la palabra «ácido» `
    + 'al principio del nombre y la terminación «-oico» al final; el –C≡N del nitrilo va delante, con el prefijo «ciano», que incluye '
    + 'su carbono: ese carbono no se cuenta en la cadena principal. Se escribe «ácido 2-cianoetanoico».'],
  ['4 carboxi ftalonitrilo', 'ácido 3,4-dicianobenzoico', 'seniority', 'CARBONYL_SENIORITY', [2, 3], `${ACID_FIRST}con «ácido `
    + 'benzoico» (el benceno con un grupo –COOH); cada –C≡N va delante, con el prefijo «ciano», que incluye su carbono: ese carbono no '
    + 'se cuenta en el anillo. Se escribe «ácido 3,4-dicianobenzoico».'],
];

test('readName (R-6b2, R-6b3): a template whose –C≡N groups are not the engine\'s gets the nitrile\'s own diagnosis, by category', () => {
  for (const [words, name, category, code, tiles, message] of FORMER_NULLS) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], words);
    assert.equal(templateCategory(verdict), category, words);
    const d = verdict.diagnosis;
    assert.ok(d, `${words}: no diagnosis`);
    assert.ok(CATEGORY_CODES[category].includes(d.code), words);
    assert.deepEqual([d.code, d.rule, d.traceRule, d.step, d.message], [code, 1, null, 'group', message], words);
    // The tiles: the `ciano` prefix with its locant (CARBONYL_PREFIX), or the template's word, the student's suffix (CARBONYL_SENIORITY).
    assert.deepEqual(d.tiles, tiles, words);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, 'group', words);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the former deliberate nulls
}); // End of test 'readName (R-6b2, R-6b3): a template whose –C≡N groups…'

// ---------------------------------------------------------------------------
// Fixtures, closed loops, sweeps, drawing and time.
// ---------------------------------------------------------------------------

test('fixture round trip (R-6b2): every fixture name with a retained nitrile word reads back, graph compared with the SMILES', async () => {
  const rows = (await readFixtures()).filter((row) => isNitrile(row.smiles));
  const covered = [];
  for (const row of rows) {
    for (const name of row.names.filter(isNitrileTemplateName)) {
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
  // The four names reverse-nitriles.test.js counted as later until phase I-52b2.
  assert.deepEqual(covered, ['acetonitrilo', 'fenilacetonitrilo', 'ftalonitrilo', '2-(4-metilfenil)acetonitrilo']);
}); // End of test 'fixture round trip (R-6b2)…'

/** Molecules whose engine names include a retained nitrile name, with ring prefixes or a substituted phenyl where admitted. */
const LOOP_SMILES = Object.freeze([
  'CC#N', 'N#CCC1=CC=CC=C1', 'N#CCC1=CC=C(C)C=C1', 'N#CCC1=CC=CC(Cl)=C1', 'N#CCC1=CC=C(OC)C=C1', 'N#CCC1=CC=C(Br)C=C1Cl',
  'N#CC1=CC=CC=C1C#N', 'CC1=CC=C(C#N)C(C#N)=C1', 'CC1=CC=CC(C#N)=C1C#N', 'ClC1=C(Cl)C(Cl)=C(C#N)C(C#N)=C1Cl',
  'OC1=CC=C(C#N)C(C#N)=C1', 'BrC1=CC(C#N)=C(C#N)C=C1Cl', 'CCC1=C(C)C=C(C#N)C(C#N)=C1', 'COC1=CC=C(C#N)C(C#N)=C1',
]);

test('closed loop (R-6b2): engine retained nitrile name → tiles → readName() → the same graph, then without each locant list', () => {
  const counts = { names: 0, removed: 0, decisive: 0 };
  for (const smiles of LOOP_SMILES) {
    const mol = parseSmiles(smiles);
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, smiles);
    const key = aromaticKey(mol);
    const names = naming.alternatives.map((alt) => alt.name).filter(isNitrileTemplateName);
    assert.equal(names.length, 1, `${smiles}: ${naming.name}`);
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
  assert.deepEqual(counts, { names: 14, removed: 13, decisive: 13 }, JSON.stringify(counts));
}); // End of test 'closed loop (R-6b2)…'

/** The closed loop's generators (scripts/oracle/generate.mjs), the seeds of reverse-nitriles.test.js. */
const GENERATED = Object.freeze({
  nitriles: Object.freeze({ count: 500, seed: 6201, maxSize: 12 }),
  cyano: Object.freeze({ count: 500, seed: 6202, maxSize: 12 }),
  ringNitriles: Object.freeze({ count: 400, seed: 6203, maxSize: 12 }),
  outside: Object.freeze({ count: 300, seed: 6204, minSize: 6, maxSize: 12 }),
  polysuffix: Object.freeze({ count: 300, seed: 6205, minSize: 6, maxSize: 12 }),
  phenyls: Object.freeze({ count: 300, seed: 6206, maxSize: 12 }),
  benzoyls: Object.freeze({ count: 200, seed: 6207 }),
  acyl: Object.freeze({ count: 300, seed: 6208, maxSize: 12 }),
});

/**
 * The retained nitrile names of the generators' nitriles (distinct by
 * aromatic key, named by the engine), with each molecule's naming.
 *
 * @returns {{name: string, naming: object, key: string}[]} The names.
 */
function generatedTemplateNames() {
  const seen = new Set();
  const out = [];
  const all = [...generateNitriles(GENERATED.nitriles), ...generateCyano(GENERATED.cyano),
    ...generateRingNitrilesAmides(GENERATED.ringNitriles), ...generateRingOutsideBenzenes(GENERATED.outside),
    ...generateRingPolysuffixBenzenes(GENERATED.polysuffix), ...generateSubstitutedPhenyls(GENERATED.phenyls),
    ...generateSubstitutedBenzoyls(GENERATED.benzoyls), ...generateAcyl(GENERATED.acyl)];
  for (const mol of all.filter(isNitrileMolecule)) {
    const key = aromaticKey(mol);
    const naming = nameMolecule(mol);
    if (seen.has(key) || !naming.ok) {
      continue;
    }
    seen.add(key);
    naming.alternatives.map((alt) => alt.name).filter(isNitrileTemplateName).forEach((name) => out.push({ name, naming, key }));
  }
  return out;
} // End of function generatedTemplateNames()

/**
 * The retained word of a nitrile's name: `acetonitrilo`,
 * `fenilacetonitrilo`, `ftalonitrilo`, or `arylAcetonitrilo` for an
 * `acetonitrilo` after a substituted phenyl prefix, `substitutedFtalonitrilo`
 * for a `ftalonitrilo` with prefixes.
 *
 * @param {string} name - A retained nitrile name.
 * @returns {string} The word's key.
 */
function wordOf(name) {
  if (NITRILE_TEMPLATE_WORDS.includes(name)) {
    return name;
  }
  return name.endsWith(TILES.find((tile) => tile.id === 'template-phthalonitrile').text) ? 'substitutedFtalonitrilo' : 'arylAcetonitrilo';
}

test('closed loop (R-6b2): the generators\' retained nitrile names read back as the engine\'s alternatives, the same graph', () => {
  const names = generatedTemplateNames();
  const words = {};
  for (const { name, naming, key } of names) {
    const verdict = readName(idsOf(name));
    assert.equal(verdict.kind, 'alternative', `${name}: ${verdict.message}`);
    assert.equal(verdict.name, naming.name, name);
    assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
    words[wordOf(name)] = (words[wordOf(name)] || 0) + 1;
  }
  // The seeds give 15 (the names reverse-nitriles.test.js counted as later until phase I-52b2).
  assert.deepEqual(words, { acetonitrilo: 1, fenilacetonitrilo: 1, ftalonitrilo: 1, substitutedFtalonitrilo: 4, arylAcetonitrilo: 8 });
}); // End of test 'closed loop (R-6b2): the generators\'…'

/**
 * The diagnosis codes an `otherName` of each mutation family may give; the
 * `cyano` family's, the nitrile's own mistake (`count`), deliberate
 * «Nitriles» nulls until phase I-52b3, are CARBONYL_PREFIX.
 */
const FAMILY_CODES = Object.freeze({
  substituted: ['SUBSTITUTED_TEMPLATE'],
  phenylLocant: ['NEEDLESS_LOCANTS'],
  arylReflected: ['BRANCH_RING_NUMBERING'],
  ringReflected: ['RING_NUMBERING'],
  cyano: ['CARBONYL_PREFIX'],
});

/**
 * Rewrites the locants of some prefix nodes, each list back in ascending
 * order over the same tiles.
 *
 * @param {string[]} out - Tile ids (changed in place).
 * @param {object[]} tiles - The parsed tiles.
 * @param {object[]} items - Prefix nodes.
 * @param {(value: number) => number} map - The new value of each locant.
 * @returns {void}
 */
function rewriteLocants(out, tiles, items, map) {
  for (const item of items.filter((it) => it.type === 'prefix')) {
    const values = item.locants.map((p) => map(tiles[p].value)).sort((a, b) => a - b);
    item.locants.forEach((p, k) => {
      out[p] = `num-${values[k]}`;
    });
  }
} // End of function rewriteLocants()

/**
 * The mutations of one retained nitrile name: on a chain template, a methyl
 * added on its free carbon 2 (`substituted`: `2-metilacetonitrilo`) and a
 * `ciano` there (`cyano`: `2-cianoacetonitrilo`); `fenilacetonitrilo` written
 * `2 fenil acetonitrilo` (`phenylLocant`); the substituted phenyl of an
 * aryl-acetonitrile reflected (`arylReflected`: v → 8 − v,
 * `2-(5-metilfenil)acetonitrilo`); on `ftalonitrilo`, its prefixes numbered
 * from the other –C≡N (`ringReflected`: v → 9 − v, `5-metilftalonitrilo`) and
 * a `ciano` on its first free ring carbon (`cyano`).
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations (none equal to the name).
 */
function mutationsOf(ids) {
  const { tree } = parse(ids);
  const { tiles } = tree;
  const word = tree.parent.chain.tile;
  const value = tiles[word].value;
  const out = [];
  /**
   * Records one mutation unless it changes nothing.
   *
   * @param {string} family - Its family.
   * @param {string[]} mutated - Its tile ids.
   * @returns {void}
   */
  const push = (family, mutated) => {
    if (mutated.join() !== ids.join()) {
      out.push({ family, ids: mutated });
    }
  };
  if (value === 'phthalonitrile') {
    const mutated = [...ids];
    rewriteLocants(mutated, tiles, tree.items, (v) => 9 - v);
    push('ringReflected', mutated);
    const used = new Set(tree.items.flatMap((item) => item.locants.map((p) => tiles[p].value)));
    const free = [3, 4, 5, 6].find((v) => !used.has(v));
    if (free) {
      push('cyano', [`num-${free}`, ...seq('ciano'), ...ids]);
    }
    return out;
  }
  push('substituted', [...ids.slice(0, word), 'num-2', ...seq('met il'), ...ids.slice(word)]);
  push('cyano', ['num-2', ...seq('ciano'), ...ids]);
  if (value === 'phenylacetonitrile') {
    push('phenylLocant', [...ids.slice(0, word), 'num-2', ...seq('fenil acetonitrilo'), ...ids.slice(word + 1)]);
  }
  for (const item of tree.items.filter((it) => it.type === 'prefix' && it.substituent.type === 'branch')) {
    const mutated = [...ids];
    rewriteLocants(mutated, tiles, item.substituent.items, (v) => 8 - v);
    push('arylReflected', mutated);
  }
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some retained nitrile names: every `otherName`
 * must carry a diagnosis of its family's codes whose step resolves in its
 * explanation; none is null (since phase I-52b3, diagnose.js «Nitriles»).
 * The nitrile's own mistakes among them (templateCategory()), deliberate
 * nulls until phase I-52b3, are counted by category, each with a code of its
 * category (CATEGORY_CODES).
 *
 * @param {{name: string}[]} names - Retained nitrile names.
 * @returns {{otherName: Object<string, number>, codes: Set<string>, own: Object<string, number>, unexpected: string[]}}
 *   `otherName` counts by family, the codes seen, the nitrile's own mistakes by category and the nulls.
 */
function sweep(names) {
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const codes = new Set();
  const own = {};
  const unexpected = [];
  for (const { name } of names) {
    for (const mutation of mutationsOf(idsOf(name))) {
      const verdict = readName(mutation.ids);
      if (verdict.kind !== 'otherName') {
        continue;
      }
      otherName[mutation.family] += 1;
      const label = `${name} → ${mutation.family} ${verdict.text}`;
      const d = verdict.diagnosis;
      if (!d) {
        unexpected.push(label);
        continue;
      }
      codes.add(d.code);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH|–CHO|C=O/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
      const category = templateCategory(verdict);
      if (category) {
        own[category] = (own[category] || 0) + 1;
        assert.ok(CATEGORY_CODES[category].includes(d.code), `${label}: ${category}, ${d.code}`);
      }
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, own, unexpected };
} // End of function sweep()

test('mutations of the fixture\'s retained nitrile names: a diagnosis of the family\'s codes, never null', async () => {
  const names = (await readFixtures()).filter((row) => isNitrile(row.smiles)).flatMap((row) => row.names)
    .filter(isNitrileTemplateName).map((name) => ({ name }));
  assert.equal(names.length, 4);
  const { otherName, codes, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  // A methyl on a chain template's free carbon: SUBSTITUTED_TEMPLATE; `2 fenil acetonitrilo`: NEEDLESS_LOCANTS; a `ciano` beside the
  // word: the nitrile's own mistake (`count`, a deliberate «Nitriles» null until phase I-52b3, now CARBONYL_PREFIX). The phenyl of
  // `2-(4-metilfenil)acetonitrilo` reflects onto itself, and bare `ftalonitrilo` has no prefix to renumber.
  assert.deepEqual(otherName, { substituted: 3, phenylLocant: 1, arylReflected: 0, ringReflected: 0, cyano: 4 });
  assert.deepEqual(own, { count: 4 });
  assert.deepEqual([...codes].sort(), ['CARBONYL_PREFIX', 'NEEDLESS_LOCANTS', 'SUBSTITUTED_TEMPLATE']);
}); // End of test 'mutations of the fixture\'s retained nitrile names…'

test('mutations of the generated retained nitrile names: every otherName is diagnosed, every step resolves', () => {
  const { otherName, codes, own, unexpected } = sweep(generatedTemplateNames());
  assert.deepEqual(unexpected, []);
  // The seeds give 15 names: SUBSTITUTED_TEMPLATE on every chain template, NEEDLESS_LOCANTS on `fenilacetonitrilo`,
  // BRANCH_RING_NUMBERING on a reflected aryl phenyl (7 of 8: `2-(4-etoxifenil)` reflects onto itself), RING_NUMBERING on a
  // reflected substituted ftalonitrilo, and every `ciano` beside the word the nitrile's own mistake (`count`, a deliberate
  // «Nitriles» null until phase I-52b3, now CARBONYL_PREFIX).
  assert.deepEqual(otherName, { substituted: 10, phenylLocant: 1, arylReflected: 7, ringReflected: 4, cyano: 15 });
  assert.deepEqual(own, { count: 15 });
  assert.deepEqual([...codes].sort(), ['BRANCH_RING_NUMBERING', 'CARBONYL_PREFIX', 'NEEDLESS_LOCANTS', 'RING_NUMBERING',
    'SUBSTITUTED_TEMPLATE']);
}); // End of test 'mutations of the generated retained nitrile names…'

test('«Dibujar» (R-6b2): nitrile template verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const words of ['acetonitrilo', 'fenilacetonitrilo', 'ftalonitrilo', '4 met il ftalonitrilo', '2 cloro acetonitrilo',
    '2 START 4 met il fenil END acetonitrilo', '3 4 5 6 tetra cloro ftalonitrilo', '2 ciano acetonitrilo']) {
    const verdict = readName(seq(words));
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6b2)…'

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

test('property (R-6b2): random names with a retained nitrile word — prefixes, `ácido`, tails or none — never crash', () => {
  const random = mulberry32(20261015);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const prefixes = ['', '', '2 cloro', 'cloro', '4 met il', '2 START 4 met il fenil END', 'START 3 cloro fenil END', '2 fenil', 'di',
    '1', 'o', '2 ciano', 'ácido', 'met il'];
  const words = ['acetonitrilo', 'fenilacetonitrilo', 'ftalonitrilo', 'fenil acetonitrilo'];
  const tails = ['', '', '', 'nitrilo', 'met ilo', 'oico', 'carbonitrilo', 'met il'];
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const name = [pick(prefixes), pick(words), pick(tails)].join(' ');
    const verdict = readName(seq(name), { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, name);
    }
    if (verdict.kind === 'invalid') {
      assert.ok(verdict.errors.length > 0 && verdict.errors.every((e) => e.from <= e.to && e.to <= seq(name).length), name);
      assert.ok(verdict.errors.every((e) => !/undefined|null|NaN|\[object/.test(e.message)), name);
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      assert.ok(!/undefined|null|NaN|\[object|–OH|–COOH/.test(verdict.diagnosis.message), `${name}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['alternative', 'otherName', 'missingLocants', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6b2)…'

test('partial names (R-6b2): every start of a retained nitrile name\'s tiles reads as a verdict, an error with its tiles when unfinished', () => {
  const kinds = new Set();
  for (const words of ['2 START 4 met il fenil END acetonitrilo', '4 bromo 5 cloro ftalonitrilo', '3 4 5 6 tetra cloro ftalonitrilo']) {
    const ids = seq(words);
    for (let k = 1; k <= ids.length; k += 1) {
      const verdict = readName(ids.slice(0, k));
      kinds.add(verdict.kind);
      if (verdict.kind === 'invalid') {
        assert.ok(verdict.errors.length > 0 && verdict.errors.every((e) => e.from <= e.to && e.to <= k), `${words} [${k}]`);
      }
    } // End of the loop over the starts of a name
  } // End of the loop over the names
  assert.ok(kinds.has('invalid') && kinds.has('alternative'), [...kinds].join());
}); // End of test 'partial names (R-6b2)…'

test('time (R-6b2): representative nitrile template names within the per-name budget', () => {
  const all = ['tetra cloro ftalonitrilo', 'di met il ftalonitrilo', 'START 4 met il fenil END acetonitrilo', 'cloro acetonitrilo',
    '2 START 5 met il fenil END acetonitrilo', 'met il ftalonitrilo'];
  all.forEach((words) => readName(seq(words))); // Warm-up.
  for (const words of all) {
    const start = performance.now();
    readName(seq(words));
    const elapsed = performance.now() - start;
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
  }
}); // End of test 'time (R-6b2)…'
