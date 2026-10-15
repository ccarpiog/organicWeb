/**
 * @file Unit tests for the retained carbonyl templates of «¿Cómo se
 * dibuja?» (src/reverse/, design.md §13.4 I-32, I-40a, I-40b, §14.5,
 * §15.5.3, §15.7, §15.8 R-5c; phase I-51c3a, R-5c3a): the «Nombres
 * tradicionales» tiles `formaldehído`, `acetaldehído`, `acetona`,
 * `acetofenona`, `fenilacetaldehído`, `ftalaldehído`, `isoftalaldehído`,
 * `tereftalaldehído` through the parser (TEMPLATE_LOCANTS, POSITIONAL,
 * TILE_ORDER with their messages), interpret.js (the chain templates as an
 * open chain with their C=O as a placed suffix, the ftalaldehídos as benzene
 * with two –CHO), build.js (LOCANT_RANGE and VALENCE messages), search.js
 * and readName(): every form the forward engine lists read as `alternative`
 * with the engine's own label and the molecule compared by aromatic key with
 * a SMILES; the substituted forms the engine writes itself
 * (`4-metilftalaldehído`, `2-(4-metilfenil)acetaldehído`) read as
 * alternatives, the others as `otherName` with the SUBSTITUTED_TEMPLATE
 * diagnosis (the chain wording without a parent), the principal C=O group's
 * codes of phase I-51c3b1 (a –CHO's carbon made a ketone's or taken out of a
 * ring, another –CHO as `oxo`), or a deliberate null left to phase I-51c3b2;
 * the tooltips; the fixture names; a closed loop over the
 * engine's template names with each locant list removed; the ordered
 * drawing; time budgets.
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
import { TILES, withArticle, templateAdmits } from '../../src/reverse/tiles.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { traditionalLabel } from '../../src/naming/lexicon.es.js';
import { seq, readFixtures, isCarbonyl, CARBONYL_TEMPLATE_WORDS, isCarbonylTemplateName } from './reverse-words.js';

/** Time budget of one representative readName() call, in milliseconds (design.md §15.7; phones are slower). */
const PER_NAME_BUDGET_MS = 250;

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
 * Every retained carbonyl form the forward engine gives (principal.js
 * carbonylTraditionalId(), aromatic.js retainedDigroupIds()): [tile words,
 * the text, the engine's name, its TRADITIONAL_LABELS id, SMILES].
 */
const ALTERNATIVES = [
  ['formaldehído', 'formaldehído', 'metanal', 'formaldehyde', 'C=O'],
  ['acetaldehído', 'acetaldehído', 'etanal', 'acetaldehyde', 'CC=O'],
  ['acetona', 'acetona', 'propanona', 'acetone', 'CC(C)=O'],
  ['acetofenona', 'acetofenona', '1-feniletan-1-ona', 'acetophenone', 'CC(=O)C1=CC=CC=C1'],
  ['fenilacetaldehído', 'fenilacetaldehído', '2-feniletanal', 'phenylacetaldehyde', 'O=CCC1=CC=CC=C1'],
  ['ftalaldehído', 'ftalaldehído', 'benceno-1,2-dicarbaldehído', 'phthalaldehyde', 'O=CC1=CC=CC=C1C=O'],
  ['isoftalaldehído', 'isoftalaldehído', 'benceno-1,3-dicarbaldehído', 'isophthalaldehyde', 'O=CC1=CC=CC(C=O)=C1'],
  ['tereftalaldehído', 'tereftalaldehído', 'benceno-1,4-dicarbaldehído', 'terephthalaldehyde', 'O=CC1=CC=C(C=O)C=C1'],
  // The substituted forms the engine writes itself: a ftalaldehído with ring prefixes, acetaldehído with a substituted phenyl.
  ['4 met il ftalaldehído', '4-metilftalaldehído', '4-metilbenceno-1,2-dicarbaldehído', 'phthalaldehyde', 'CC1=CC=C(C=O)C(C=O)=C1'],
  ['5 cloro isoftalaldehído', '5-cloroisoftalaldehído', '5-clorobenceno-1,3-dicarbaldehído', 'isophthalaldehyde',
    'ClC1=CC(C=O)=CC(C=O)=C1'],
  ['2 START 4 met il fenil END acetaldehído', '2-(4-metilfenil)acetaldehído', '2-(4-metilfenil)etanal', 'arylacetaldehyde',
    'O=CCC1=CC=C(C)C=C1'],
];

// ---------------------------------------------------------------------------
// Tiles, parser, assembler and tokenizer.
// ---------------------------------------------------------------------------

test('«Nombres tradicionales» (R-5c3a): the eight tiles after the phenols, each with a tooltip; their articles', () => {
  const carbonyls = TILES.filter((tile) => tile.kind === 'template' && tile.row === 'traditional').slice(10);
  assert.deepEqual(carbonyls.map((tile) => tile.text), [...CARBONYL_TEMPLATE_WORDS]);
  for (const tile of carbonyls) {
    assert.ok(TILE_HINTS[tile.id] && TILE_HINTS[tile.id].endsWith('.'), tile.id);
    assert.ok(!/undefined|null/.test(TILE_HINTS[tile.id]), tile.id);
  }
  assert.match(TILE_HINTS['template-acetone'], /propanona/);
  assert.match(TILE_HINTS['template-phthalaldehyde'], /4-metilftalaldehído/);
  assert.deepEqual(['acetona', 'acetofenona', 'acetaldehído', 'ftalaldehído'].map((word) => withArticle(word, 'de')),
    ['de la acetona', 'de la acetofenona', 'del acetaldehído', 'del ftalaldehído']);
}); // End of test '«Nombres tradicionales» (R-5c3a)…'

test('parser (R-5c3a): numbers or a letter on a carbonyl template, a multiplier before it, one inside a branch', () => {
  const cases = [
    ['1 acetona', ['TEMPLATE_LOCANTS[0,1)'], '«acetona» ya dice dónde va su grupo C=O, en el carbono 2: no lleva números ni letras '
      + 'propios.'],
    ['p acetofenona', ['TEMPLATE_LOCANTS[0,1)'], '«acetofenona» ya dice dónde van su grupo C=O y su fenilo, en el carbono 1: no '
      + 'lleva números ni letras propios.'],
    ['1 2 fenilacetaldehído', ['TEMPLATE_LOCANTS[0,2)'], '«fenilacetaldehído» ya dice dónde van su grupo CHO y su fenilo, en los '
      + 'carbonos 1 y 2: no lleva números ni letras propios.'],
    ['o ftalaldehído', ['TEMPLATE_LOCANTS[0,1)'], '«ftalaldehído» ya dice dónde van sus dos grupos CHO, en los carbonos 1 y 2: no '
      + 'lleva números ni letras propios.'],
    ['p met il ftalaldehído', ['POSITIONAL[0,1)'], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu '
      + 'nombre pone tres (contando los dos grupos CHO del ftalaldehído): escribe los números (1,2,4-trimetilbenceno).'],
    ['p met il acetona', ['POSITIONAL[0,1)'], 'Las letras «o», «m» y «p» (orto, meta y para) solo se usan con el benceno, para decir '
      + 'dónde están sus dos grupos (o-dimetilbenceno); aquí van números.'],
    ['di acetona', ['TILE_ORDER[0,1)'], 'Esta ficha no puede ir aquí: «di», «tri»… van delante de una rama (dimetil), no delante de '
      + '«acetona».'],
  ];
  for (const [words, errors, message] of cases) {
    assert.deepEqual(errorsOf(words), errors, words);
    assert.equal(readName(seq(words)).message, message, words);
  }
  // Inside a compound branch: the C=O is written `oxo`, the CHO `formil`.
  const branch = readName(seq('START acetona END met ano'));
  assert.equal(branch.kind, 'invalid');
  assert.equal(branch.errors[0].message, 'Esta ficha no puede ir aquí: «acetona» es el nombre de toda la molécula y va al final; '
    + 'dentro de una rama, el grupo C=O se escribe «oxo» y el grupo CHO, «formil», como en (2-oxoetil) o (4-formilfenil).');
}); // End of test 'parser (R-5c3a)…'

test('assembler and tokenizer (R-5c3a): each template is one tile, read back; the longest word first', () => {
  for (const [words, text] of ALTERNATIVES) {
    assert.equal(assemble(parse(seq(words)).tree).text, text, words);
    assert.deepEqual(tokenize(text), seq(words), text);
  }
  // `fenilacetaldehído` is its own tile (the longer surface form), not `fenil` + `acetaldehído`, which assemble alike.
  assert.equal(assemble(parse(seq('fenil acetaldehído')).tree).text, 'fenilacetaldehído');
  assert.deepEqual(tokenize('fenilacetaldehído'), seq('fenilacetaldehído'));
  for (const name of ['1-acetona', 'o-ftalaldehído', 'acetonaol', 'diacetona', '2-acetofenona']) {
    assert.equal(tokenize(name), null, name);
  }
}); // End of test 'assembler and tokenizer (R-5c3a)…'

// ---------------------------------------------------------------------------
// Interpreter, builder and search.
// ---------------------------------------------------------------------------

test('interpreter (R-5c3a): a chain template is an open chain with its C=O placed; a ftalaldehído, benzene with two –CHO', () => {
  let spec = specOf('acetona');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.parent.template.value, spec.parent.template.groups],
    ['chain', 3, 'acetone', []]);
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.placed, spec.suffix.phenol, spec.suffix.terminal],
    ['ketone', false, true, false, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value]), [['implicit', 2]]);
  assert.deepEqual([spec.traditional.value, spec.leftOut], ['acetone', []]);
  spec = specOf('acetofenona');
  assert.deepEqual([spec.parent.kind, spec.parent.length], ['chain', 2]);
  const [phenyl] = spec.parent.template.groups;
  assert.deepEqual([phenyl.substituent.kind, phenyl.substituent.retained, phenyl.slots.map((slot) => slot.value)], ['phenyl', 'phenyl', [1]]);
  assert.deepEqual(spec.suffix.slots.map((slot) => slot.value), [1]);
  spec = specOf('fenilacetaldehído');
  assert.deepEqual([spec.parent.template.groups[0].slots[0].value, spec.suffix.kind, spec.suffix.slots[0].value], [2, 'aldehyde', 1]);
  spec = specOf('ftalaldehído');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.suffix.kind, spec.suffix.outside], ['benzene', 6, 'aldehyde', true]);
  assert.deepEqual(spec.suffix.slots.map((slot) => slot.value), [1, 2]);
  // The student's prefixes are numbered on the template's parent: the chain of `acetona`, the ring of `ftalaldehído`.
  spec = specOf('1 cloro acetona');
  assert.deepEqual(spec.prefixes[0].slots.map((slot) => [slot.value, slot.domain]), [[1, [1, 3]]]);
  spec = specOf('met il ftalaldehído');
  assert.deepEqual(spec.leftOut.map((slot) => slot.domain), [[1, 6]]);
}); // End of test 'interpreter (R-5c3a)…'

test('builder (R-5c3a): LOCANT_RANGE on a template\'s chain, VALENCE on a carbon its word fills', () => {
  const cases = [
    ['5 cloro acetona', 'LOCANT_RANGE', 'La cadena de la acetona tiene 3 carbonos, del 1 al 3: no hay carbono 5.'],
    ['2 cloro formaldehído', 'LOCANT_RANGE', 'El formaldehído solo tiene 1 carbono: no hay carbono 2.'],
    ['4 met il acetofenona', 'LOCANT_RANGE', 'La cadena de la acetofenona tiene 2 carbonos, del 1 al 2: no hay carbono 4. En '
      + '«acetofenona» el anillo no se numera: con grupos en el anillo, escribe el nombre sistemático (1-(4-metilfenil)etan-1-ona).'],
    ['4 met il fenilacetaldehído', 'LOCANT_RANGE', 'La cadena del fenilacetaldehído tiene 2 carbonos, del 1 al 2: no hay carbono 4. '
      + 'En «fenilacetaldehído» el anillo no se numera: con grupos en el anillo, escribe el nombre sistemático '
      + '(2-(4-metilfenil)etanal).'],
    ['9 cloro ftalaldehído', 'LOCANT_RANGE', 'El anillo del ftalaldehído tiene 6 carbonos, del 1 al 6: no hay carbono 9.'],
    ['2 met il acetona', 'VALENCE', 'El carbono 2 tendría 5 enlaces, y un carbono solo puede tener 4: en la acetona, ese carbono ya '
      + 'lleva un grupo C=O.'],
    ['1 met il ftalaldehído', 'VALENCE', 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el ftalaldehído, ese '
      + 'carbono ya lleva un grupo CHO.'],
  ];
  for (const [words, code, message] of cases) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    assert.deepEqual([verdict.errors[0].code, verdict.errors[0].message], [code, message], words);
    assert.deepEqual([verdict.errors[0].from, verdict.errors[0].to], [0, 1], words);
  }
  // Every message on `4-metilacetofenona` leads to a name the app reads.
  assert.equal(readName(tokenize('1-(4-metilfenil)etan-1-ona')).kind, 'correct');
  assert.equal(readName(tokenize('2-(4-metilfenil)etanal')).kind, 'correct');
}); // End of test 'builder (R-5c3a)…'

test('search (R-5c3a): left-out locants on a template, numbered on its parent', () => {
  const structures = (words) => searchStructures(specOf(words), { namer: nameMolecule }).structures;
  // The two –CHO fill carbons 1 and 2: a methyl goes on 3 / 6 or 4 / 5, two structures.
  assert.deepEqual(structures('met il ftalaldehído').map((s) => s.naming.name),
    ['3-metilbenceno-1,2-dicarbaldehído', '4-metilbenceno-1,2-dicarbaldehído']);
  assert.equal(structures('tetra cloro ftalaldehído').length, 1);
  // `acetona`'s carbons 1 and 3 are alike: one structure.
  assert.deepEqual(structures('cloro acetona').map((s) => s.naming.name), ['1-cloropropan-2-ona']);
  assert.equal(readName(seq('met il ftalaldehído')).message, 'Faltan números: puede ser 3-metilftalaldehído o 4-metilftalaldehído.');
  const filled = readName(seq('START 4 met il fenil END acetaldehído'));
  assert.deepEqual([filled.kind, filled.filled], ['missingLocants', '2-(4-metilfenil)acetaldehído']);
  const full = readName(seq('tetra cloro ftalaldehído'));
  assert.deepEqual([full.kind, full.filled], ['missingLocants', '3,4,5,6-tetracloroftalaldehído']);
}); // End of test 'search (R-5c3a)…'

// ---------------------------------------------------------------------------
// readName(): the engine's forms, substituted templates, diagnosis nulls.
// ---------------------------------------------------------------------------

test('readName (R-5c3a): every retained carbonyl form the engine gives is an alternative, with the engine\'s own label', () => {
  for (const [words, text, name, id, smiles] of ALTERNATIVES) {
    const verdict = readName(seq(words));
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, 'alternative', `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.deepEqual([verdict.matched.name, verdict.matched.style, verdict.matched.label], [text, 'traditional', traditionalLabel(id)]);
    assert.equal(verdict.message, `${VERDICT_TEXTS.correct} «${text}» es una forma válida (${traditionalLabel(id)}). `
      + `El nombre que doy primero es «${name}».`);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    assert.deepEqual([verdict.draw, verdict.errors, verdict.suffixAtoms.length], [true, [], name.includes('dicarbaldeh') ? 2 : 1]);
  } // End of the loop over the alternatives
  // `fenil` and `acetaldehído` typed as two tiles write the same text, and read as the same alternative.
  const split = readName(seq('fenil acetaldehído'));
  assert.deepEqual([split.kind, split.name], ['alternative', '2-feniletanal']);
}); // End of test 'readName (R-5c3a): every retained carbonyl form…'

test('the forward engine lists exactly these forms; the systematic name is `correct` and announces them', () => {
  for (const [, text, name, , smiles] of ALTERNATIVES) {
    const naming = nameMolecule(parseSmiles(smiles));
    assert.equal(naming.name, name);
    assert.ok(naming.alternatives.some((alt) => alt.name === text && alt.style === 'traditional'), `${smiles}: ${text}`);
  }
  // No traditional name for a substituted acetona, acetofenona, formaldehído or a phenyl on acetona (design.md §13.4 I-32, I-40a).
  for (const smiles of ['ClCC(C)=O', 'CC(=O)C1=CC=C(C)C=C1', 'ClCC=O', 'CC(=O)CC1=CC=CC=C1', 'O=CC(Cl)C1=CC=CC=C1']) {
    assert.ok(nameMolecule(parseSmiles(smiles)).alternatives.every((alt) => alt.style !== 'traditional'), smiles);
  }
  const also = (id, word) => ` También se llama «${word}» (${traditionalLabel(id)}).`;
  assert.equal(readName(tokenize('propanona')).message, `${VERDICT_TEXTS.correct}${also('acetone', 'acetona')}`);
  assert.equal(readName(tokenize('benceno-1,2-dicarbaldehído')).message, `${VERDICT_TEXTS.correct}${also('phthalaldehyde', 'ftalaldehído')}`);
}); // End of test 'the forward engine lists exactly these forms…'

/**
 * Substituted carbonyl templates the engine never writes: [tile words, the
 * text, the engine's name, SMILES, the template word].
 */
const SUBSTITUTED = [
  ['1 cloro acetona', '1-cloroacetona', '1-cloropropan-2-ona', 'ClCC(C)=O', 'acetona'],
  ['3 cloro acetona', '3-cloroacetona', '1-cloropropan-2-ona', 'ClCC(C)=O', 'acetona'],
  ['cloro acetona', 'cloroacetona', '1-cloropropan-2-ona', 'ClCC(C)=O', 'acetona'],
  ['met il acetona', 'metilacetona', 'butan-2-ona', 'CCC(C)=O', 'acetona'],
  ['hidroxi acetona', 'hidroxiacetona', '1-hidroxipropan-2-ona', 'OCC(C)=O', 'acetona'],
  ['1 fenil acetona', '1-fenilacetona', '1-fenilpropan-2-ona', 'CC(=O)CC1=CC=CC=C1', 'acetona'],
  ['2 cloro acetaldehído', '2-cloroacetaldehído', '2-cloroetanal', 'ClCC=O', 'acetaldehído'],
  ['2 2 di cloro acetaldehído', '2,2-dicloroacetaldehído', '2,2-dicloroetanal', 'ClC(Cl)C=O', 'acetaldehído'],
  ['2 cloro acetofenona', '2-cloroacetofenona', '2-cloro-1-feniletan-1-ona', 'ClCC(=O)C1=CC=CC=C1', 'acetofenona'],
  ['2 cloro fenilacetaldehído', '2-clorofenilacetaldehído', '2-cloro-2-feniletanal', 'O=CC(Cl)C1=CC=CC=C1', 'fenilacetaldehído'],
];

test('readName (R-5c3a): a substituted chain template draws its molecule, named by the app, with SUBSTITUTED_TEMPLATE', () => {
  for (const [words, text, name, smiles, template] of SUBSTITUTED) {
    const verdict = readName(seq(words));
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, 'otherName', `${text}: ${verdict.message}`);
    assert.deepEqual([verdict.name, verdict.message], [name, otherNameMessage(name)], text);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    const { diagnosis } = verdict;
    assert.ok(diagnosis, `${text}: no diagnosis`);
    assert.deepEqual([diagnosis.code, diagnosis.rule, diagnosis.step], ['SUBSTITUTED_TEMPLATE', 2, 'groupChain'], text);
    assert.equal(diagnosis.message, `El nombre tradicional «${template}» no admite sustituyentes: con más grupos, la molécula se `
      + `nombra con su nombre sistemático: «${name}».`, text);
    const templateTile = seq(words).length - 1;
    assert.deepEqual(diagnosis.tiles, [templateTile, templateTile + 1], `${text}: the template's tile`);
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok(opened.index >= 0 && [diagnosis.step, ...STEP_FALLBACKS[diagnosis.step]].includes(opened.steps[opened.index].id), text);
  } // End of the loop over the substituted templates
}); // End of test 'readName (R-5c3a): a substituted chain template…'

test('readName (R-5c3a): prefixes the engine admits on a template are judged by the other rules, never SUBSTITUTED_TEMPLATE', () => {
  // A ftalaldehído numbered otherwise: the ring rule, as for `5-metilbenceno-1,2-dicarbaldehído`.
  const ring = readName(seq('5 met il ftalaldehído'));
  assert.deepEqual([ring.kind, ring.name, ring.diagnosis.code], ['otherName', '4-metilbenceno-1,2-dicarbaldehído', 'RING_NUMBERING']);
  assert.equal(templateAdmits('phthalaldehyde', specOf('5 met il ftalaldehído').prefixes), true);
  assert.equal(templateAdmits('acetaldehyde', specOf('2 START 4 met il fenil END acetaldehído').prefixes), true);
  assert.equal(templateAdmits('acetaldehyde', specOf('2 cloro acetaldehído').prefixes), false);
  assert.equal(templateAdmits('acetone', specOf('1 fenil acetona').prefixes), false);
}); // End of test 'readName (R-5c3a): prefixes the engine admits…'

/**
 * The deliberate nulls left to phase I-51c3b2 (diagnose.js «Aldehydes and
 * ketones»): [tile words, the engine's name, why no rule speaks].
 */
const NULLS = [
  // A phenyl on `acetaldehído` is admitted (the engine's `fenilacetaldehído`, `2-(aryl)acetaldehído`): the locant the engine
  // leaves out (`2-fenilacetaldehído`) or a phenyl numbered otherwise.
  ['2 fenil acetaldehído', '2-feniletanal', 'needless locant'],
  ['2 START 5 met il fenil END acetaldehído', '2-(3-metilfenil)etanal', 'phenyl numbering'],
];

test('readName (R-5c3a): the deliberate nulls left to phase I-51c3b2', () => {
  for (const [words, name] of NULLS) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis], ['otherName', name, null], words);
  }
}); // End of test 'readName (R-5c3a): the deliberate nulls…'

/**
 * The former deliberate nulls of phase I-51c3a that concern the principal
 * C=O group, worded by phase I-51c3b1 before SUBSTITUTED_TEMPLATE (diagnose.js
 * carbonylChecks()): [tile words, the engine's name, the code].
 */
const PRINCIPAL_GROUP = [
  // The aryl on carbon 1 of `acetaldehído`: its –CHO's carbon bonded to two carbons, a ketone.
  ['1 START 4 met il fenil END acetaldehído', '1-(4-metilfenil)etan-1-ona', 'KETONE_NOT_ALDEHYDE'],
  // Another –CHO written `oxo`; the –CHO's carbon taken as the chain beside a ring.
  ['oxo acetaldehído', 'etanodial', 'CARBONYL_PREFIX'],
  ['ciclo hex il formaldehído', 'ciclohexanocarbaldehído', 'ALDEHYDE_CARBON'],
];

test('readName (R-5c3b1): a substituted template whose C=O groups are not the engine\'s has the principal group\'s code', () => {
  for (const [words, name, code] of PRINCIPAL_GROUP) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis && verdict.diagnosis.code], ['otherName', name, code], words);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, 'group', words);
  }
  assert.equal(readName(seq('ciclo hex il formaldehído')).diagnosis.tiles[0], 3, 'the template word');
}); // End of test 'readName (R-5c3b1): a substituted template…'

// ---------------------------------------------------------------------------
// Fixtures, closed loop, drawing and time.
// ---------------------------------------------------------------------------

test('fixture round trip (R-5c3a): every fixture name with a carbonyl template reads back, graph compared with the SMILES', async () => {
  const rows = (await readFixtures()).filter((row) => isCarbonyl(row.smiles));
  const covered = [];
  for (const row of rows) {
    for (const name of row.names.filter(isCarbonylTemplateName)) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, name === row.names[0] ? 'correct' : 'alternative', `names.tsv:${row.line}: ${verdict.message}`);
      assert.equal(verdict.name, row.names[0]);
      assert.equal(aromaticKey(verdict.molecule), keyOf(row.smiles), `names.tsv:${row.line}: ${name}`);
      covered.push(name);
    }
  } // End of the loop over the fixture rows
  assert.deepEqual(covered, ['formaldehído', 'acetaldehído', 'acetona', 'acetofenona', 'fenilacetaldehído', 'tereftalaldehído',
    'ftalaldehído', '2-(4-metilfenil)acetaldehído']);
}); // End of test 'fixture round trip (R-5c3a)…'

/** Molecules whose engine names include a carbonyl template, each with ring prefixes or a substituted phenyl where admitted. */
const LOOP_SMILES = Object.freeze([
  'C=O', 'CC=O', 'CC(C)=O', 'CC(=O)C1=CC=CC=C1', 'O=CCC1=CC=CC=C1', 'O=CC1=CC=CC=C1C=O', 'O=CC1=CC=CC(C=O)=C1',
  'O=CC1=CC=C(C=O)C=C1', 'CC1=CC=C(C=O)C(C=O)=C1', 'CC1=CC=CC(C=O)=C1C=O', 'ClC1=CC(C=O)=CC(C=O)=C1',
  'BrC1=CC(C=O)=C(Cl)C=C1C=O', 'CCC1=C(C=O)C=CC(C=O)=C1', 'O=CCC1=CC=C(C)C=C1', 'O=CCC1=CC=CC(Cl)=C1',
  'CC1=CC=C(C=O)C(C=O)=C1C', 'OC1=CC=C(C=O)C=C1C=O',
]);

test('closed loop (R-5c3a): engine template name → tiles → readName() → the same graph, then without each locant list', () => {
  const counts = { names: 0, removed: 0, decisive: 0 };
  for (const smiles of LOOP_SMILES) {
    const mol = parseSmiles(smiles);
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, smiles);
    const key = aromaticKey(mol);
    const names = naming.alternatives.map((alt) => alt.name).filter(isCarbonylTemplateName);
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
  assert.deepEqual(counts, { names: 17, removed: 10, decisive: 10 }, JSON.stringify(counts));
}); // End of test 'closed loop (R-5c3a)…'

test('«Dibujar» (R-5c3a): carbonyl template verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const words of ['formaldehído', 'acetona', 'acetofenona', 'fenilacetaldehído', 'ftalaldehído', 'tereftalaldehído',
    '4 met il ftalaldehído', '1 cloro acetona', '2 START 4 met il fenil END acetaldehído']) {
    const verdict = readName(seq(words));
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-5c3a)…'

test('time (R-5c3a): representative template names within the per-name budget', () => {
  for (const words of ['tetra cloro ftalaldehído', 'di met il ftalaldehído', 'START 4 met il fenil END acetaldehído', 'cloro acetona']) {
    const start = performance.now();
    readName(seq(words));
    const elapsed = performance.now() - start;
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
  }
}); // End of test 'time (R-5c3a)…'
