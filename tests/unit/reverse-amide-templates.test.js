/**
 * @file Unit tests for the retained amide names of «¿Cómo se dibuja?»
 * (src/reverse/, design.md §13.4 I-37, I-40c, §14.5, §15.5.3, §15.7, §15.8
 * R-6d; phase I-52d3, R-6d3): the «Nombres tradicionales» tiles
 * `formamida`, `acetamida` and `ftalamida` (the engine writes no
 * `isoftalamida`, `tereftalamida` or `oxamida`, and its `2-fenilacetamida`
 * keeps the locant, so it is `2`, `fenil`, `acetamida`, no tile of its own)
 * through the parser (TEMPLATE_LOCANTS, POSITIONAL, TILE_ORDER with the
 * branch hints, the pairing errors ACID_WORD and ESTER_SUFFIX, the locant `N`
 * on the nitrogen of `formamida` and `acetamida`), the assembler and the
 * tokenizer, interpret.js (the chain templates as an open chain with their
 * –CONH₂ placed at carbon 1, `ftalamida` as benzene with two –CONH₂ outside
 * the ring, the `N` slots), build.js (the =O and the nitrogen on each group's
 * carbon, LOCANT_RANGE, VALENCE, the engine's refusal of an `N` beside two
 * amide groups), search.js and readName(): every form the forward engine
 * lists read as `alternative` with the engine's own label and the molecule
 * compared by aromatic key with a SMILES — with groups on the nitrogen
 * (`N,N-dimetilformamida`, `N-metilacetamida`, `N-fenilacetamida`), a phenyl
 * on `acetamida`'s carbon 2 (`2-fenilacetamida`, `2-(4-metilfenil)acetamida`)
 * or ring prefixes on `ftalamida` (`4-metilftalamida`) —, any other prefix as
 * `otherName` with the SUBSTITUTED_TEMPLATE diagnosis (its message saying
 * what the word admits), the prefixes the engine admits judged by the other
 * rules (RING_NUMBERING, BRANCH_RING_NUMBERING, ALPHABETICAL_ORDER,
 * UNGROUPED); the amide's own mistakes on a template, each with its category
 * read independently — another –CONH₂ written `carbamoil` (`count`), the word
 * beside a senior group (`seniority`), a ring on `formamida`'s carbon
 * (`carbon`) —, deliberate nulls of diagnose.js «Amides» until phase I-52d4
 * and diagnosed since (CARBONYL_PREFIX, CARBONYL_SENIORITY, AMIDE_CARBON),
 * and a prefix in a style the engine never writes beside the word (`style`,
 * the cross-family open question), still a pinned null; the tooltips
 * and every example this phase cites; the fixture names; a closed loop over
 * the engine's retained amide names with each locant list removed, and over
 * the generators' ones; the diagnosis sweeps over the retained names (fixture
 * and generated), apart from those of phases R-6d1 and R-6d2
 * (reverse-amides.test.js, reverse-amide-prefixes.test.js); the ordered
 * drawing; random and partial names; time budgets.
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
  TILES, TEMPLATES, withArticle, templateAdmits, isAmideTemplate, isNitrileTemplate, isAmineTemplate, isAcidTemplate,
  isEsterTemplate, isCarbonylTemplate, parentWordName, N_VALUE,
} from '../../src/reverse/tiles.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { traditionalLabel } from '../../src/naming/lexicon.es.js';
import {
  generateAmides, generateAmidePrefixes, generateRingNitrilesAmides, generateRingOutsideBenzenes, generateRingPolysuffixBenzenes,
  generateSubstitutedPhenyls, generateSubstitutedBenzoyls, generateCyano,
} from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, isAmide, isAmideMolecule, isAmideTemplateName, AMIDE_TEMPLATE_WORDS, isR6d1AmideName, isR6d2AmideName,
} from './reverse-words.js';

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
    ids = tokenize(name); // A name text: `2-(4-metilfenil)acetamida`.
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
 * The –CONH₂ groups a verdict's suffix places (the suffixAtoms with an
 * amide's nitrogen).
 *
 * @param {object} verdict - A drawn readName() verdict.
 * @returns {object[]} The suffix entries.
 */
function amideSuffixAtoms(verdict) {
  return (verdict.suffixAtoms || []).filter((g) => g.amideNitrogen !== undefined);
}

/**
 * Every retained amide form the forward engine gives (principal.js
 * carbonylTraditionalId(), aromatic.js retainedDigroupIds()), as the student
 * builds it: [tile words, the text, the engine's name, its TRADITIONAL_LABELS
 * id, SMILES].
 */
const ALTERNATIVES = [
  ['formamida', 'formamida', 'metanamida', 'formamide', 'NC=O'],
  ['acetamida', 'acetamida', 'etanamida', 'acetamide', 'CC(N)=O'],
  ['ftalamida', 'ftalamida', 'benceno-1,2-dicarboxamida', 'phthalamide', 'NC(=O)C1=CC=CC=C1C(N)=O'],
  // Groups on the nitrogen of `formamida` and `acetamida`, written `N` as on an `amida` suffix.
  ['N met il formamida', 'N-metilformamida', 'N-metilmetanamida', 'formamide', 'CNC=O'],
  ['N N di met il formamida', 'N,N-dimetilformamida', 'N,N-dimetilmetanamida', 'formamide', 'CN(C)C=O'],
  ['N met il acetamida', 'N-metilacetamida', 'N-metiletanamida', 'acetamide', 'CNC(C)=O'],
  ['N fenil acetamida', 'N-fenilacetamida', 'N-feniletanamida', 'acetamide', 'CC(=O)NC1=CC=CC=C1'],
  ['N et il N met il acetamida', 'N-etil-N-metilacetamida', 'N-etil-N-metiletanamida', 'acetamide', 'CCN(C)C(C)=O'],
  ['N START ciano met il END acetamida', 'N-(cianometil)acetamida', 'N-(cianometil)etanamida', 'acetamide', 'CC(=O)NCC#N'],
  ['N isopropil formamida', 'N-isopropilformamida', 'N-isopropilmetanamida', 'formamide', 'CC(C)NC=O'],
  // A phenyl on `acetamida`'s carbon 2 instead: bare, the engine's `2-fenilacetamida` (its locant kept), or with prefixes.
  ['2 fenil acetamida', '2-fenilacetamida', '2-feniletanamida', 'phenylacetamide', 'NC(=O)CC1=CC=CC=C1'],
  ['2 START 4 met il fenil END acetamida', '2-(4-metilfenil)acetamida', '2-(4-metilfenil)etanamida', 'arylacetamide',
    'NC(=O)CC1=CC=C(C)C=C1'],
  // Ring prefixes on `ftalamida`.
  ['4 met il ftalamida', '4-metilftalamida', '4-metilbenceno-1,2-dicarboxamida', 'phthalamide', 'CC1=CC=C(C(N)=O)C(C(N)=O)=C1'],
  ['3 4 5 6 tetra cloro ftalamida', '3,4,5,6-tetracloroftalamida', '3,4,5,6-tetraclorobenceno-1,2-dicarboxamida', 'phthalamide',
    'NC(=O)C1=C(Cl)C(Cl)=C(Cl)C(Cl)=C1C(N)=O'],
];

// ---------------------------------------------------------------------------
// Tiles, parser, assembler and tokenizer.
// ---------------------------------------------------------------------------

test('«Nombres tradicionales» (R-6d3): the three amide tiles after the amine ones, each with a tooltip; quoted as on the tile', () => {
  const amides = TILES.filter((tile) => tile.kind === 'template' && tile.row === 'traditional').slice(33);
  assert.deepEqual(amides.map((tile) => tile.text), [...AMIDE_TEMPLATE_WORDS]);
  assert.deepEqual(amides.map((tile) => [tile.id, tile.text]), [['template-formamide', 'formamida'], ['template-acetamide', 'acetamida'],
    ['template-phthalamide', 'ftalamida']]);
  for (const tile of amides) {
    assert.ok(TILE_HINTS[tile.id] && TILE_HINTS[tile.id].endsWith('.'), tile.id);
    assert.ok(!/undefined|null/.test(TILE_HINTS[tile.id]), tile.id);
    assert.match(TILE_HINTS[tile.id], /(?:metan|etan|benceno-1,2-dicarbox)amida/, tile.id); // Its systematic name.
    assert.ok(isAmideTemplate(tile.value) && !isNitrileTemplate(tile.value) && !isAmineTemplate(tile.value)
      && !isAcidTemplate(tile.value) && !isEsterTemplate(tile.value) && !isCarbonylTemplate(tile.value), tile.id);
    assert.equal(parentWordName(tile), tile.text, tile.id); // No class word: the name is the word.
  }
  assert.deepEqual(amides.map((tile) => [TEMPLATES[tile.value].suffix.value, TEMPLATES[tile.value].suffix.positions]),
    [['amide', [1]], ['amide', [1]], ['carboxamide', [1, 2]]]);
  assert.match(TILE_HINTS['template-formamide'], /metanamida\. Admite ramas en el nitrógeno, con «N»: N,N-dimetilformamida\./);
  assert.match(TILE_HINTS['template-acetamide'], /etanamida\. Admite ramas en el nitrógeno, con «N» \(N-metilacetamida\), o un fenil en el /);
  assert.match(TILE_HINTS['template-acetamide'], /carbono 2 \(2-fenilacetamida, 2-\(4-metilfenil\)acetamida\)\.$/);
  assert.match(TILE_HINTS['template-phthalamide'], /benceno-1,2-dicarboxamida\. Admite ramas en el anillo: 4-metilftalamida\./);
  // Feminine words, quoted with «la».
  assert.deepEqual(AMIDE_TEMPLATE_WORDS.map((word) => withArticle(word, 'de')), ['de la formamida', 'de la acetamida', 'de la ftalamida']);
  // Only the 1,2 benzene diamide has a retained name (aromatic.js), ethanediamide none, and `2-fenilacetamida` keeps its locant:
  // no `isoftalamida`, `tereftalamida`, `oxamida` or `fenilacetamida` tile (`carboxamida` is the suffix).
  assert.ok(!TILES.some((tile) => /^(?:isoftalamida|tereftalamida|oxamida|fenilacetamida)$/.test(tile.text)));
}); // End of test '«Nombres tradicionales» (R-6d3)…'

test('parser (R-6d3): numbers or a letter on an amide template, a multiplier before it, pairing errors, one in a branch', () => {
  const cases = [
    ['1 acetamida', ['TEMPLATE_LOCANTS[0,1)'], '«acetamida» ya dice dónde va su grupo amida, en el carbono 1: no lleva números ni letras '
      + 'propios.'],
    ['1 formamida', ['TEMPLATE_LOCANTS[0,1)'], '«formamida» ya dice dónde va su grupo amida, en el carbono 1: no lleva números ni '
      + 'letras propios.'],
    // An `N` alone before the word (no group after it): the template's own locants, as before `anilina` and `benzamida`.
    ['N acetamida', ['TEMPLATE_LOCANTS[0,1)'], null],
    ['o ftalamida', ['TEMPLATE_LOCANTS[0,1)'], '«ftalamida» ya dice dónde van sus dos grupos amida, en los carbonos 1 y 2: no lleva '
      + 'números ni letras propios.'],
    ['1 2 ftalamida', ['TEMPLATE_LOCANTS[0,2)'], null],
    ['p met il ftalamida', ['POSITIONAL[0,1)'], 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre '
      + 'pone tres (contando los dos grupos amida de la ftalamida): escribe los números (1,2,4-trimetilbenceno).'],
    ['p met il acetamida', ['POSITIONAL[0,1)'], 'Las letras «o», «m» y «p» (orto, meta y para) solo se usan con el benceno, para decir '
      + 'dónde están sus dos grupos (o-dimetilbenceno); aquí van números.'],
    // An `N` and a letter on one prefix: no used form, the amide's example (not the amine's).
    ['N p di met il ftalamida', ['POSITIONAL[0,2)'], '«N» y las letras «o», «m» y «p» no van juntas delante de un mismo grupo: con un '
      + 'grupo en el nitrógeno y otro en el anillo, escribe «N» para el del nitrógeno y un número para el del anillo '
      + '(N,4-dimetilbenzamida).'],
    ['di acetamida', ['TILE_ORDER[0,1)'], 'Esta ficha no puede ir aquí: «di», «tri»… van delante de una rama (dimetil), no delante de '
      + '«acetamida».'],
    // `ácido` before a retained amide word: the error on `ácido`, with the retained acid words.
    ['ácido acetamida', ['ACID_WORD[0,1)'], 'La palabra «ácido» va delante del nombre de un ácido, y «acetamida» no es el nombre de un '
      + 'ácido. Los nombres tradicionales que van detrás de «ácido» son fórmico, acético, oxálico, fenilacético, ftálico, isoftálico y '
      + 'tereftálico (ácido acético).'],
    // An O-bound side after a retained amide word: no ester suffix before it.
    ['acetamida met ilo', ['ESTER_SUFFIX[1,3)'], null],
    // A suffix after the word, which already places its –CONH₂ groups: out of place, as after any template.
    ['acetamida amida', ['TILE_ORDER[1,2)'], 'Esta ficha no puede ir aquí: el nombre termina con la cadena principal (la raíz y su '
      + 'terminación); las ramas van delante.'],
    ['ftalamida carboxamida', ['TILE_ORDER[1,2)'], null],
  ];
  for (const [words, errors, message] of cases) {
    assert.deepEqual(errorsOf(words), errors, words);
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    if (message) {
      assert.equal(verdict.message, message, words);
    }
  } // End of the loop over the cases
  // `N` on the name-level prefixes of `formamida`, `acetamida` (and `ftalamida`, the engine's refusal below): no error.
  for (const words of ['N met il acetamida', 'N N di met il formamida', 'N et il N met il acetamida', 'N met il ftalamida',
    'N 2 di met il acetamida']) {
    assert.deepEqual(errorsOf(words), [], words);
  }
  // Inside a compound branch, or in an ester's O-bound side: the amide is written as the engine writes it there.
  const lead = 'Esta ficha no puede ir aquí: ';
  const chainHint = (word) => `${lead}«${word}» es el nombre de toda la molécula y va al final; dentro de una rama, el grupo amida se `
    + 'escribe con «amino» y «oxo» en un mismo carbono de la rama, como en (2-amino-2-oxoetil), o con «carbamoil» si su carbono no es '
    + 'de la rama (ácido 2-(4-carbamoilciclohexil)etanoico).';
  assert.deepEqual(errorsOf('START acetamida END met ano'), ['TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']); // and its END
  assert.equal(readName(seq('START acetamida END met ano')).errors[0].message, chainHint('acetamida'));
  assert.equal(readName(seq('START formamida END met ano')).errors[0].message, chainHint('formamida'));
  assert.deepEqual(errorsOf('et ano oato acetamida'), ['TILE_ORDER[3,4)']);
  assert.equal(readName(seq('et ano oato acetamida')).message, chainHint('acetamida'));
  assert.equal(readName(seq('START 4 met il ftalamida END met ano')).errors.find((e) => e.from === 4).message, `${lead}«ftalamida» es `
    + 'el nombre de toda la molécula y va al final; dentro de una rama, el grupo amida se escribe «carbamoil» (ácido '
    + '2-(4-carbamoilciclohexil)etanoico), pero de momento no sé nombrar una rama con un benceno que lleve un grupo amida.');
}); // End of test 'parser (R-6d3)…'

test('assembler and tokenizer (R-6d3): each template is one tile, read back; `2-fenilacetamida` is `2`, `fenil` and `acetamida`', () => {
  for (const [words, text] of ALTERNATIVES) {
    assert.equal(assemble(parse(idsOf(words)).tree).text, text, words);
    assert.deepEqual(tokenize(text), idsOf(words), text);
  }
  assert.deepEqual(tokenize('2-fenilacetamida'), seq('2 fenil acetamida'));
  assert.deepEqual(tokenize('fenilacetamida'), seq('fenil acetamida'));
  // The prefixes join the word as the engine writes them.
  assert.equal(assemble(parse(seq('4 hidroxi ftalamida')).tree).text, '4-hidroxiftalamida');
  assert.equal(assemble(parse(seq('N START 2 hidroxi et il END acetamida')).tree).text, 'N-(2-hidroxietil)acetamida');
  for (const name of ['1-acetamida', 'o-ftalamida', 'diacetamida', 'acetamidaamida', 'ácido acetamida', 'acetamida de metilo',
    'isoftalamida', 'tereftalamida', 'oxamida', 'acetamid', 'ftalamidacarboxamida', 'formamidamida']) {
    assert.equal(tokenize(name), null, name);
  }
}); // End of test 'assembler and tokenizer (R-6d3)…'

// ---------------------------------------------------------------------------
// Interpreter, builder and search.
// ---------------------------------------------------------------------------

test('interpreter (R-6d3): a chain amide template is an open chain with its –CONH₂ placed; `ftalamida`, benzene with two outside', () => {
  let spec = specOf('acetamida');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.parent.template.value, spec.parent.template.groups],
    ['chain', 2, 'acetamide', []]);
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.hydroxy, spec.suffix.bridge, spec.suffix.amideNitrogen,
    spec.suffix.placed, spec.suffix.terminal], ['amide', false, false, false, true, true, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value]), [['implicit', 1]]);
  assert.deepEqual([spec.classWord, spec.ester, spec.traditional.value, spec.leftOut], [null, null, 'acetamide', []]);
  assert.deepEqual([spec.parent.template.word.text, spec.suffix.word.text], ['acetamida', 'acetamida']);
  spec = specOf('formamida');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.suffix.kind, spec.suffix.slots[0].value], ['chain', 1, 'amide', 1]);
  spec = specOf('ftalamida');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.suffix.kind, spec.suffix.outside, spec.suffix.amideNitrogen],
    ['benzene', 6, 'amide', true, true]);
  assert.deepEqual(spec.suffix.slots.map((slot) => slot.value), [1, 2]);
  // The locant `N`: the value N_VALUE, its domain widened to the nitrogen (nitrogenSlots()), as on an `amida` suffix.
  spec = specOf('N met il acetamida');
  assert.deepEqual(spec.prefixes[0].slots.map((slot) => [slot.kind, slot.value, slot.domain, slot.nitrogen]),
    [['supplied', N_VALUE, [N_VALUE, 2], true]]);
  // A left-out locant of a group the engine puts on an N: carbon 2 or `N` (carbon 1 is full); on `ftalamida`, the ring only.
  spec = specOf('met il acetamida');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.domain, Boolean(slot.nitrogen)]), [[[N_VALUE, 2], true]]);
  spec = specOf('met il ftalamida');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.domain, Boolean(slot.nitrogen)]), [[[1, 6], false]]);
  // The student's prefixes are numbered on the template's parent: the chain of `acetamida`, the ring of `ftalamida`.
  spec = specOf('2 cloro acetamida');
  assert.deepEqual(spec.prefixes[0].slots.map((slot) => [slot.value, slot.domain]), [[2, [1, 2]]]);
}); // End of test 'interpreter (R-6d3)…'

test('builder (R-6d3): each –CONH₂ an =O and a nitrogen on its carbon; LOCANT_RANGE, VALENCE, the engine\'s refusal of an `N` on two', () => {
  for (const [words, smiles, outside] of [['acetamida', 'CC(N)=O', [false]], ['N N di met il formamida', 'CN(C)C=O', [false]],
    ['ftalamida', 'NC(=O)C1=CC=CC=C1C(N)=O', [true, true]]]) {
    const verdict = readName(seq(words));
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), words);
    const groups = amideSuffixAtoms(verdict);
    assert.deepEqual(groups.map((g) => g.carbon !== undefined), outside, words);
    for (const g of groups) {
      assert.deepEqual([verdict.molecule.atoms.get(g.attachment).element, verdict.molecule.bonds.get(g.bond).order,
        verdict.molecule.atoms.get(g.amideNitrogen).element, verdict.molecule.bonds.get(g.amideBond).order], ['O', 2, 'N', 1], words);
    }
  } // End of the loop over the molecules
  const cases = [
    ['3 cloro acetamida', 'LOCANT_RANGE', 'La cadena de la acetamida tiene 2 carbonos, del 1 al 2: no hay carbono 3.'],
    ['2 cloro formamida', 'LOCANT_RANGE', 'La formamida solo tiene 1 carbono: no hay carbono 2.'],
    ['9 cloro ftalamida', 'LOCANT_RANGE', 'El anillo de la ftalamida tiene 6 carbonos, del 1 al 6: no hay carbono 9.'],
    ['1 cloro acetamida', 'VALENCE', 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en la acetamida, ese carbono ya '
      + 'lleva un grupo amida.'],
    ['1 met il ftalamida', 'VALENCE', 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en la ftalamida, ese carbono ya '
      + 'lleva un grupo amida.'],
  ];
  for (const [words, code, message] of cases) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    assert.deepEqual([verdict.errors[0].code, verdict.errors[0].message, verdict.errors[0].from, verdict.errors[0].to],
      [code, message, 0, 1], words);
  }
  // A third group on the nitrogen: VALENCE on the tile that adds it, as on an `amida` suffix.
  const third = readName(seq('N N N tri met il acetamida'));
  assert.deepEqual([third.kind, third.errors[0].code, third.errors[0].from, third.errors[0].to, third.errors[0].message],
    ['invalid', 'VALENCE', 2, 3, 'El nitrógeno de la amida tendría 4 enlaces, y un nitrógeno solo puede tener 3.']);
  // An `N` beside `ftalamida`'s two amide groups: the engine's own refusal of an N-substituted benzene diamide.
  const diamide = readName(seq('N met il ftalamida'));
  assert.equal(diamide.kind, 'outOfScope');
  assert.match(diamide.message, /varios grupos amida unidos al anillo y alguno de sus nitrógenos lleva otros grupos/);
  // An imide, a halogen on the nitrogen, two rings: the engine's refusals.
  assert.deepEqual(['N acetil acetamida', 'N cloro acetamida', 'N N di fenil acetamida', '2 2 di fenil acetamida'].map((words) =>
    readName(seq(words)).kind), ['outOfScope', 'outOfScope', 'outOfScope', 'outOfScope']);
}); // End of test 'builder (R-6d3)…'

test('search (R-6d3): left-out locants on a template, `N` among the places of a one-amide word', () => {
  const structures = (words) => searchStructures(specOf(words), { namer: nameMolecule }).structures;
  // `acetamida`'s carbon 1 is full: a left-out methyl goes on carbon 2 or on the nitrogen; only the second is an engine name there.
  assert.deepEqual(structures('met il acetamida').map((s) => s.naming.name).sort(), ['N-metiletanamida', 'propanamida']);
  let verdict = readName(seq('met il acetamida'));
  assert.deepEqual([verdict.kind, verdict.filled, verdict.name], ['missingLocants', 'N-metilacetamida', 'N-metiletanamida']);
  assert.equal(verdict.message, `Casi: faltan los números. Se escribe «N-metilacetamida» (${traditionalLabel('acetamide')}). El nombre `
    + 'que doy primero es «N-metiletanamida».');
  verdict = readName(seq('di met il formamida'));
  assert.deepEqual([verdict.kind, verdict.filled], ['missingLocants', 'N,N-dimetilformamida']);
  verdict = readName(seq('fenil formamida'));
  assert.deepEqual([verdict.kind, verdict.filled], ['missingLocants', 'N-fenilformamida']);
  // A phenyl on `acetamida` may stand on carbon 2 or on the nitrogen: both are the engine's names, so the name is ambiguous.
  assert.equal(readName(seq('fenil acetamida')).message, 'Faltan números: puede ser N-fenilacetamida o 2-fenilacetamida.');
  assert.equal(readName(seq('START 4 met il fenil END acetamida')).message, 'Faltan números: puede ser N-(4-metilfenil)acetamida o '
    + '2-(4-metilfenil)acetamida.');
  // `ftalamida`'s two –CONH₂ fill carbons 1 and 2: a methyl goes on 3 / 6 or 4 / 5, two structures; never on a nitrogen.
  assert.deepEqual(structures('met il ftalamida').map((s) => s.naming.name),
    ['3-metilbenceno-1,2-dicarboxamida', '4-metilbenceno-1,2-dicarboxamida']);
  assert.equal(readName(seq('met il ftalamida')).message, 'Faltan números: puede ser 3-metilftalamida o 4-metilftalamida.');
  verdict = readName(seq('tetra cloro ftalamida'));
  assert.deepEqual([verdict.kind, verdict.filled], ['missingLocants', '3,4,5,6-tetracloroftalamida']);
  // A halogen never stands on the nitrogen (bondsToNitrogen()): `cloroacetamida` has one structure, a chain prefix.
  assert.deepEqual(structures('cloro acetamida').map((s) => s.naming.name), ['2-cloroetanamida']);
}); // End of test 'search (R-6d3)…'

// ---------------------------------------------------------------------------
// readName(): the engine's forms, substituted templates, diagnosis.
// ---------------------------------------------------------------------------

test('readName (R-6d3): every retained amide form the engine gives is an alternative, with the engine\'s own label', () => {
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
    // One entry per –CONH₂, each with its nitrogen.
    assert.equal(amideSuffixAtoms(verdict).length, /ftalamida/.test(text) ? 2 : 1, text);
    assert.equal(verdict.suffixAtoms.length, amideSuffixAtoms(verdict).length, text);
  } // End of the loop over the alternatives
}); // End of test 'readName (R-6d3): every retained amide form…'

test('the forward engine lists exactly these forms; the systematic name is `correct` and announces them', () => {
  for (const [, text, name, , smiles] of ALTERNATIVES) {
    const naming = nameMolecule(parseSmiles(smiles));
    assert.equal(naming.name, name);
    assert.ok(naming.alternatives.some((alt) => alt.name === text && alt.style === 'traditional'), `${smiles}: ${text}`);
  }
  // No traditional name for a substituted chain amide (but groups on the N, or a phenyl alone on acetamide's carbon 2), nor for a
  // phenyl beside a group on the N, a propanamide, an ethanediamide or the benzene 1,3- and 1,4-diamides (no `isoftalamida`,
  // `tereftalamida`, `oxamida`).
  for (const smiles of ['ClCC(N)=O', 'CCC(N)=O', 'CNC(=O)CC1=CC=CC=C1', 'NC(=O)C(N)=O', 'NC(=O)C1=CC=CC(C(N)=O)=C1',
    'NC(=O)C1=CC=C(C(N)=O)C=C1', 'NC(=O)C(Cl)C1=CC=CC=C1']) {
    assert.ok(nameMolecule(parseSmiles(smiles)).alternatives.every((alt) => alt.style !== 'traditional'), smiles);
  }
  const also = (id, word) => ` También se llama «${word}» (${traditionalLabel(id)}).`;
  assert.equal(readName(tokenize('metanamida')).message, `${VERDICT_TEXTS.correct}${also('formamide', 'formamida')}`);
  assert.equal(readName(tokenize('N,N-dimetilmetanamida')).message, `${VERDICT_TEXTS.correct}${also('formamide', 'N,N-dimetilformamida')}`);
  assert.equal(readName(tokenize('2-feniletanamida')).message, `${VERDICT_TEXTS.correct}${also('phenylacetamide', '2-fenilacetamida')}`);
  assert.equal(readName(tokenize('benceno-1,2-dicarboxamida')).message, `${VERDICT_TEXTS.correct}${also('phthalamide', 'ftalamida')}`);
}); // End of test 'the forward engine lists exactly these forms…'

/** The SUBSTITUTED_TEMPLATE message of `acetamida`, which admits groups on its nitrogen or a phenyl on its carbon 2. */
const ACETAMIDE_ADMITS = 'El nombre tradicional «acetamida» solo admite grupos en el nitrógeno, con «N» (N-metilacetamida), o solo un '
  + 'fenil en el carbono 2 (2-fenilacetamida): con otros grupos, la molécula se nombra con su nombre sistemático: ';

/**
 * Substituted amide templates the engine never writes: [tile words, the
 * text, the engine's name, SMILES, the message].
 */
const SUBSTITUTED = [
  ['2 cloro acetamida', '2-cloroacetamida', '2-cloroetanamida', 'ClCC(N)=O', `${ACETAMIDE_ADMITS}«2-cloroetanamida».`],
  ['cloro acetamida', 'cloroacetamida', '2-cloroetanamida', 'ClCC(N)=O', `${ACETAMIDE_ADMITS}«2-cloroetanamida».`],
  ['2 2 2 tri cloro acetamida', '2,2,2-tricloroacetamida', '2,2,2-tricloroetanamida', 'ClC(Cl)(Cl)C(N)=O',
    `${ACETAMIDE_ADMITS}«2,2,2-tricloroetanamida».`],
  ['2 met il acetamida', '2-metilacetamida', 'propanamida', 'CCC(N)=O', `${ACETAMIDE_ADMITS}«propanamida».`],
  ['2 hidroxi acetamida', '2-hidroxiacetamida', '2-hidroxietanamida', 'OCC(N)=O', `${ACETAMIDE_ADMITS}«2-hidroxietanamida».`],
  ['2 amino acetamida', '2-aminoacetamida', '2-aminoetanamida', 'NCC(N)=O', `${ACETAMIDE_ADMITS}«2-aminoetanamida».`],
  ['2 ciano acetamida', '2-cianoacetamida', '2-cianoetanamida', 'N#CCC(N)=O', `${ACETAMIDE_ADMITS}«2-cianoetanamida».`],
  ['2 ciclo hex il acetamida', '2-ciclohexilacetamida', '2-ciclohexiletanamida', 'NC(=O)CC1CCCCC1',
    `${ACETAMIDE_ADMITS}«2-ciclohexiletanamida».`],
  // A group on the nitrogen beside the phenyl, or beside a group on carbon 2: each admitted alone, not both.
  ['N met il 2 fenil acetamida', 'N-metil-2-fenilacetamida', '2-fenil-N-metiletanamida', 'CNC(=O)CC1=CC=CC=C1',
    `${ACETAMIDE_ADMITS}«2-fenil-N-metiletanamida».`],
  ['N met il 2 cloro acetamida', 'N-metil-2-cloroacetamida', '2-cloro-N-metiletanamida', 'CNC(=O)CCl',
    `${ACETAMIDE_ADMITS}«2-cloro-N-metiletanamida».`],
  ['1 met il formamida', '1-metilformamida', 'etanamida', 'CC(N)=O', 'El nombre tradicional «formamida» solo admite grupos en el '
    + 'nitrógeno, con «N» (N-metilformamida): con otros grupos, la molécula se nombra con su nombre sistemático: «etanamida».'],
];

test('readName (R-6d3): a substituted chain amide template draws its molecule, named by the app, with SUBSTITUTED_TEMPLATE', () => {
  for (const [words, text, name, smiles, message] of SUBSTITUTED) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, 'otherName', `${text}: ${verdict.message}`);
    assert.deepEqual([verdict.name, verdict.message], [name, otherNameMessage(name)], text);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    const { diagnosis } = verdict;
    assert.ok(diagnosis, `${text}: no diagnosis`);
    assert.deepEqual([diagnosis.code, diagnosis.rule, diagnosis.step, diagnosis.message], ['SUBSTITUTED_TEMPLATE', 2, 'groupChain',
      message], text);
    assert.deepEqual(diagnosis.tiles, [ids.length - 1, ids.length], `${text}: the template's tile`);
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok(opened.index >= 0 && [diagnosis.step, ...STEP_FALLBACKS[diagnosis.step]].includes(opened.steps[opened.index].id), text);
  } // End of the loop over the substituted templates
  // A chlorine or an OH on formamide's carbon makes a carbamoyl chloride or carbamic acid, outside the families the engine names.
  for (const words of ['1 cloro formamida', '1 cloro N N di met il formamida', '1 hidroxi formamida']) {
    assert.equal(readName(seq(words)).kind, 'outOfScope', words);
  }
}); // End of test 'readName (R-6d3): a substituted chain amide template…'

/**
 * Prefixes the engine admits on an amide template, judged by the other
 * rules (never SUBSTITUTED_TEMPLATE): [tile words, the engine's name, the
 * code, the step «Ver el paso» opens, the message].
 */
const ADMITTED = [
  // `ftalamida` numbered otherwise: the ring rule at N1 (the –CONH₂ groups at 1 and 2 either way).
  ['5 met il ftalamida', '4-metilbenceno-1,2-dicarboxamida', 'RING_NUMBERING', 'ringNumbering', 'Hay que numerar el anillo de otra '
    + 'manera, empezando en otro carbono o contando hacia el otro lado: los sustituyentes tienen que llevar los números más bajos '
    + '(4 en vez de 5).'],
  // The phenyl on `acetamida` numbered otherwise: «Nombra los sustituyentes» numbers it from the carbon bonded to the chain.
  ['2 START 5 met il fenil END acetamida', '2-(3-metilfenil)etanamida', 'BRANCH_RING_NUMBERING', 'substituents', 'Un anillo que va '
    + 'en una rama se numera empezando por el carbono por el que se une, que es el 1, y siguiendo en el sentido que da los números '
    + 'más bajos a sus sustituyentes: «3-metilfenil», no «5-metilfenil».'],
  // The groups on the nitrogen: the shared rules, as on an `amida` suffix.
  ['N met il N et il acetamida', 'N-etil-N-metiletanamida', 'ALPHABETICAL_ORDER', 'order', 'Los sustituyentes se escriben por orden '
    + 'alfabético: «etil» va antes que «metil» (e antes que m).'],
  ['N met il N met il acetamida', 'N,N-dimetiletanamida', 'UNGROUPED', 'substituents', 'Las ramas iguales se escriben una sola vez, '
    + 'con «di», «tri»… delante: «N,N-dimetil», no «N-metil-N-metil».'],
];

test('readName (R-6d3): prefixes the engine admits on an amide template are judged by the other rules', () => {
  for (const [words, name, code, step, message] of ADMITTED) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], words);
    assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.step, verdict.diagnosis.message], [code, step, message], words);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, step, words);
  }
  assert.equal(templateAdmits('phthalamide', specOf('5 met il ftalamida').prefixes), true);
  assert.equal(templateAdmits('acetamide', specOf('2 START 4 met il fenil END acetamida').prefixes), true);
  assert.equal(templateAdmits('acetamide', specOf('N met il N et il acetamida').prefixes), true);
  assert.equal(templateAdmits('formamide', specOf('N N di met il formamida').prefixes), true);
  assert.equal(templateAdmits('acetamide', specOf('2 cloro acetamida').prefixes), false);
  assert.equal(templateAdmits('acetamide', specOf('N met il 2 fenil acetamida').prefixes), false);
  assert.equal(templateAdmits('formamide', specOf('1 met il formamida').prefixes), false);
}); // End of test 'readName (R-6d3): prefixes the engine admits…'

/**
 * The category of an amide template's own mistake, read from the verdict
 * apart from diagnose.js (as reverse-amides.test.js amideCategory() does):
 * `seniority` — the engine's principal group is not an amide (the word beside
 * a senior group); `count` — the student's amide groups are not as many as
 * the engine's suffix cites (another one written `carbamoil`); `carbon` — the
 * amide's carbon on the other side of the parent (a ring on `formamida`'s
 * carbon: the engine's group is outside that ring, `benzamida`); `style` — the
 * engine writes a retained amide name for the molecule, the student's
 * prefixes in another style (the cross-family open question of the retained
 * words' prefix style); null otherwise.
 *
 * @param {object} verdict - An `otherName` verdict.
 * @returns {string|null} The category, or null.
 */
function templateCategory(verdict) {
  const engine = verdict.naming.structure.suffix;
  const mine = amideSuffixAtoms(verdict);
  if (!engine || engine.kind !== 'amide') {
    return mine.length > 0 ? 'seniority' : null;
  }
  if (mine.length !== engine.locants.length) {
    return 'count';
  }
  if (mine.some((g) => g.carbon !== undefined) !== Boolean(engine.outside)) {
    return 'carbon';
  }
  return verdict.naming.alternatives.some((alt) => isAmideTemplateName(alt.name)) ? 'style' : null;
} // End of function templateCategory()

/** The codes the amide's own mistakes on a template get, by category (templateCategory(); diagnose.js «Amides», phase I-52d4). */
const CATEGORY_CODES = Object.freeze({
  count: ['CARBONYL_PREFIX'],
  seniority: ['CARBONYL_SENIORITY'],
  carbon: ['AMIDE_CARBON'],
});

/** The seniority sentence CARBONYL_SENIORITY starts with beside a template's junior amide, up to «Aquí manda el ácido (–COOH)». */
const ACID_FIRST = 'Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: ácido > éster > amida > '
  + 'nitrilo > aldehído > cetona > alcohol > amina. Aquí manda el ácido (–COOH), que se nombra ';

/** How the engine writes a junior amide whose C=O carbon is a chain carbon (CARBONYL_SENIORITY, `chainAmide`). */
const IN_CHAIN = 'el grupo amida va delante, con dos prefijos con el mismo número: «oxo» para su C=O y «amino» para su nitrógeno, con '
  + 'los grupos unidos a él';

/** AMIDE_CARBON beside a ring, before how the engine writes the amide. */
const ON_RING = 'Cuando el grupo amida está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena '
  + 'principal es el anillo, y el grupo se nombra ';

/**
 * The amide's own mistakes on a template, deliberate «Amides» nulls until
 * phase I-52d4 and diagnosed since: [tile words, the engine's name, the
 * category, the code, the tiles, the message].
 */
const FORMER_NULLS = [
  ['2 carbamoil acetamida', 'propanodiamida', 'count', 'CARBONYL_PREFIX', [0, 2], 'Los grupos amida son el grupo principal: los de '
    + 'la cadena principal se nombran todos juntos con la terminación «-diamida», al final del nombre, no con el prefijo «carbamoil». '
    + 'Su carbono entra en la cadena principal. Se escribe «propanodiamida».'],
  ['1 carbamoil formamida', 'etanodiamida', 'count', 'CARBONYL_PREFIX', [0, 2], 'Los grupos amida son el grupo principal: los de la '
    + 'cadena principal se nombran todos juntos con la terminación «-diamida», al final del nombre, no con el prefijo «carbamoil». Su '
    + 'carbono entra en la cadena principal. Se escribe «etanodiamida».'],
  ['2 carbamoil 2 fenil acetamida', '2-fenilpropanodiamida', 'count', 'CARBONYL_PREFIX', [0, 2], 'Los grupos amida son el grupo '
    + 'principal: los de la cadena principal se nombran todos juntos con la terminación «-diamida», al final del nombre, no con el '
    + 'prefijo «carbamoil». Su carbono entra en la cadena principal. Se escribe «2-fenilpropanodiamida».'],
  ['4 carbamoil ftalamida', 'benceno-1,2,4-tricarboxamida', 'count', 'CARBONYL_PREFIX', [0, 2], 'Los grupos amida son el grupo '
    + 'principal: los unidos al anillo se nombran todos juntos con la terminación «-tricarboxamida», al final del nombre, no con el '
    + 'prefijo «carbamoil». Se escribe «benceno-1,2,4-tricarboxamida».'],
  ['2 carboxi acetamida', 'ácido 3-amino-3-oxopropanoico', 'seniority', 'CARBONYL_SENIORITY', [2, 3], `${ACID_FIRST}con la palabra `
    + `«ácido» al principio del nombre y la terminación «-oico» al final; ${IN_CHAIN}. Se escribe «ácido 3-amino-3-oxopropanoico».`],
  ['2 carboxi N met il acetamida', 'ácido 3-(metilamino)-3-oxopropanoico', 'seniority', 'CARBONYL_SENIORITY', [5, 6], `${ACID_FIRST}con `
    + `la palabra «ácido» al principio del nombre y la terminación «-oico» al final; ${IN_CHAIN}. Se escribe «ácido `
    + '3-(metilamino)-3-oxopropanoico».'],
  ['1 carboxi N N di met il formamida', 'ácido 2-(dimetilamino)-2-oxoetanoico', 'seniority', 'CARBONYL_SENIORITY', [7, 8],
    `${ACID_FIRST}con la palabra «ácido» al principio del nombre y la terminación «-oico» al final; ${IN_CHAIN}. Se escribe «ácido `
    + '2-(dimetilamino)-2-oxoetanoico».'],
  ['4 carboxi ftalamida', 'ácido 3,4-dicarbamoilbenzoico', 'seniority', 'CARBONYL_SENIORITY', [2, 3], `${ACID_FIRST}con «ácido `
    + 'benzoico» (el benceno con un grupo –COOH); cada grupo amida va delante, con el prefijo «carbamoil». Se escribe «ácido '
    + '3,4-dicarbamoilbenzoico».'],
  // A ring on `formamida`'s carbon: the amide's carbon outside the ring, as `1-fenilmetanamida` (R-6d1).
  ['1 fenil formamida', 'benzamida', 'carbon', 'AMIDE_CARBON', [2, 3], `${ON_RING}con «benzamida» (el benceno con un grupo amida). Se `
    + 'escribe «benzamida».'],
  ['N N di met il 1 fenil formamida', 'N,N-dimetilbenzamida', 'carbon', 'AMIDE_CARBON', [7, 8], `${ON_RING}con «benzamida» (el benceno `
    + 'con un grupo amida). Se escribe «N,N-dimetilbenzamida».'],
  ['1 ciclo hex il formamida', 'ciclohexanocarboxamida', 'carbon', 'AMIDE_CARBON', [4, 5], `${ON_RING}con la terminación `
    + '«-carboxamida», al final del nombre. Se escribe «ciclohexanocarboxamida».'],
];

test('readName (R-6d3, R-6d4): a template whose amide groups are not the engine\'s gets the amide\'s own diagnosis, by category', () => {
  for (const [words, name, category, code, tiles, message] of FORMER_NULLS) {
    const verdict = readName(idsOf(words));
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], `${words}: ${verdict.message}`);
    assert.equal(templateCategory(verdict), category, words);
    const d = verdict.diagnosis;
    assert.ok(d, `${words}: no diagnosis`);
    assert.ok(CATEGORY_CODES[category].includes(d.code), words);
    assert.deepEqual([d.code, d.rule, d.traceRule, d.step, d.message], [code, 1, null, 'group', message], words);
    // The tiles: the `carbamoil` prefix with its locant (CARBONYL_PREFIX), or the template's word, the student's suffix.
    assert.deepEqual(d.tiles, tiles, words);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, 'group', words);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the former deliberate nulls
}); // End of test 'readName (R-6d3, R-6d4): a template whose amide groups…'

/**
 * The prefix-style nulls, still pinned (the cross-family open question of a
 * retained word's prefix style; no amide's own mistake): [a name, the
 * engine's name, the category].
 */
const NULLS = [
  // The engine writes `isopropil` beside a retained word (`N-isopropilacetamida`, `4-isopropilftalamida`).
  ['N-(propan-2-il)acetamida', 'N-isopropiletanamida', 'style'],
  ['N-(1-metiletil)formamida', 'N-isopropilmetanamida', 'style'],
  ['4-(propan-2-il)ftalamida', '4-isopropilbenceno-1,2-dicarboxamida', 'style'],
  ['2-[4-(propan-2-il)fenil]acetamida', '2-(4-isopropilfenil)etanamida', 'style'],
];

test('a prefix in a style the engine never writes beside a retained amide word: a pinned null (the open question of the style)', () => {
  for (const [words, name, category] of NULLS) {
    const verdict = readName(idsOf(words));
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], `${words}: ${verdict.message}`);
    assert.equal(templateCategory(verdict), category, words);
    assert.equal(verdict.diagnosis, null, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(verdict.draw && verdict.molecule, words);
  }
  // The engine's own prefix style beside the word reads as its alternative.
  for (const name of ['N-isopropilacetamida', '4-isopropilftalamida', '2-(4-isopropilfenil)acetamida']) {
    assert.equal(readName(tokenize(name)).kind, 'alternative', name);
  }
}); // End of test 'a prefix in a style the engine never writes…'

test('every example this phase cites (tooltips, hints, the SUBSTITUTED_TEMPLATE message, the Ayuda amide line) reads as the engine\'s', () => {
  // The retained forms: the engine's alternatives.
  for (const name of ['N,N-dimetilformamida', 'N-metilformamida', 'N-metilacetamida', '2-fenilacetamida', '2-(4-metilfenil)acetamida',
    '4-metilftalamida', 'N-fenilacetamida']) {
    assert.equal(readName(tokenize(name)).kind, 'alternative', name);
  }
  // The systematic names and the branch forms (in a complete name of the engine's): its first names.
  for (const name of ['metanamida', 'etanamida', 'benceno-1,2-dicarboxamida', 'N-(2-amino-2-oxoetil)butanamida',
    'ácido 2-(4-carbamoilciclohexil)etanoico', 'butanodiamida', 'ciclohexanocarboxamida', 'N-metiletanamida', 'N,N-dimetilbenzamida',
    'ácido 4-amino-4-oxobutanoico', 'ácido 4-carbamoilbenzoico', 'ácido 3-(metilcarbamoil)pentanodioico',
    'ácido 2-(acetilamino)etanoico', 'N,4-dimetilbenzamida']) {
    const verdict = readName(tokenize(name));
    assert.equal(verdict.kind, 'correct', `${name}: ${verdict.kind} ${verdict.message || ''}`);
  }
}); // End of test 'every example this phase cites…'

// ---------------------------------------------------------------------------
// Fixtures, closed loops, sweeps, drawing and time.
// ---------------------------------------------------------------------------

test('fixture round trip (R-6d3): every fixture name with a retained amide word reads back, graph compared with the SMILES', async () => {
  const rows = (await readFixtures()).filter((row) => isAmide(row.smiles));
  const covered = [];
  for (const row of rows) {
    for (const name of row.names.filter(isAmideTemplateName)) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      assert.equal(assemble(parse(ids).tree).text, name, `names.tsv:${row.line}: assembly`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, 'alternative', `names.tsv:${row.line}: ${verdict.message}`);
      assert.equal(verdict.name, row.names[0]);
      assert.equal(aromaticKey(verdict.molecule), keyOf(row.smiles), `names.tsv:${row.line}: ${name}`);
      assert.ok(!isR6d1AmideName(name) && !isR6d2AmideName(name), name); // Swept here, not in the earlier amide files.
      covered.push(name);
    }
  } // End of the loop over the fixture rows
  // The 15 names reverse-amides.test.js counted as later until phase I-52d3.
  assert.deepEqual(covered, ['formamida', 'acetamida', 'N-metilacetamida', 'N,N-dimetilacetamida', 'N,N-dimetilformamida',
    'N-butil-N-metilacetamida', 'N-(2-hidroxietil)acetamida', 'N-(cianometil)acetamida', 'N-fenilacetamida', 'N-ciclohexilacetamida',
    'N-fenil-N-metilacetamida', '2-fenilacetamida', 'ftalamida', 'N-(4-metilfenil)acetamida', '2-(4-metilfenil)acetamida']);
}); // End of test 'fixture round trip (R-6d3)…'

/** Molecules whose engine names include a retained amide name with locants (groups on the nitrogen, a phenyl, ring prefixes). */
const LOOP_SMILES = Object.freeze([
  'CNC=O', 'CN(C)C=O', 'CNC(C)=O', 'CCN(C)C(C)=O', 'CC(=O)NC1=CC=CC=C1', 'CC(=O)N(C)C1=CC=CC=C1', 'CC(=O)NCC#N', 'CC(=O)NCCO',
  'NC(=O)CC1=CC=CC=C1', 'NC(=O)CC1=CC=C(C)C=C1', 'CC(=O)NC1=CC=C(C)C=C1', 'CC1=CC=C(C(N)=O)C(C(N)=O)=C1',
  'NC(=O)C1=C(Cl)C(Cl)=C(Cl)C(Cl)=C1C(N)=O', 'ClC1=CC=C(C(N)=O)C(C(N)=O)=C1Br',
]);

/** The counts of the closed loop over LOOP_SMILES: names read back, locant lists removed, decisive re-readings. */
const LOOP_COUNTS = Object.freeze({ names: 14, removed: 17, decisive: 17 });

/**
 * The verdicts of those re-readings, by kind: a group the engine puts on a
 * nitrogen, left without its `N`, is the engine's name with the `N` back
 * (`metilacetamida` → «N-metilacetamida», `dimetilformamida`); a phenyl, bare
 * or substituted, may stand on `acetamida`'s carbon 2 or on its nitrogen, both
 * the engine's names (`fenilacetamida`: ambiguous); a ring prefix of
 * `ftalamida` on 3 or 4 (`metilftalamida`) or beside another one.
 */
const LOOP_KINDS = Object.freeze({ missingLocants: 11, ambiguous: 6 });

test('closed loop (R-6d3): engine retained amide name → tiles → readName() → the same graph, then without each locant list', () => {
  const counts = { names: 0, removed: 0, decisive: 0 };
  const kinds = {};
  for (const smiles of LOOP_SMILES) {
    const mol = parseSmiles(smiles);
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, smiles);
    const key = aromaticKey(mol);
    const names = naming.alternatives.map((alt) => alt.name).filter(isAmideTemplateName);
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
        kinds[reread.kind] = (kinds[reread.kind] || 0) + 1;
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
  assert.deepEqual(counts, LOOP_COUNTS, JSON.stringify(counts));
  assert.deepEqual(kinds, LOOP_KINDS, JSON.stringify(kinds));
}); // End of test 'closed loop (R-6d3)…'

/** The closed loop's generators (scripts/oracle/generate.mjs), the seeds of reverse-amides.test.js. */
const GENERATED = Object.freeze([
  [generateAmides, Object.freeze({ count: 600, seed: 6501, maxSize: 12 })],
  [generateAmidePrefixes, Object.freeze({ count: 300, seed: 6502, maxSize: 12 })],
  [generateRingNitrilesAmides, Object.freeze({ count: 400, seed: 6503, maxSize: 12 })],
  [generateRingOutsideBenzenes, Object.freeze({ count: 400, seed: 6504, minSize: 6, maxSize: 12 })],
  [generateRingPolysuffixBenzenes, Object.freeze({ count: 300, seed: 6505, minSize: 6, maxSize: 12 })],
  [generateSubstitutedPhenyls, Object.freeze({ count: 300, seed: 6506, maxSize: 12 })],
  [generateSubstitutedBenzoyls, Object.freeze({ count: 300, seed: 6507, maxSize: 12 })],
  [generateCyano, Object.freeze({ count: 400, seed: 6508, maxSize: 12 })],
]);

/**
 * The retained amide names of the generators' amides (distinct by aromatic
 * key, named by the engine), with each molecule's naming and key.
 *
 * @returns {{name: string, naming: object, key: string}[]} The names.
 */
function generatedTemplateNames() {
  const seen = new Set();
  const out = [];
  for (const [generate, options] of GENERATED) {
    for (const mol of generate(options).filter(isAmideMolecule)) {
      const key = aromaticKey(mol);
      const naming = seen.has(key) ? null : nameMolecule(mol);
      if (!naming || !naming.ok) {
        continue;
      }
      seen.add(key);
      naming.alternatives.map((alt) => alt.name).filter(isAmideTemplateName).forEach((name) => out.push({ name, naming, key }));
    } // End of the loop over a generator's molecules
  } // End of the loop over the generators
  return out;
} // End of function generatedTemplateNames()

/**
 * The form of a retained amide name: a bare word, `formamida` or `acetamida`
 * with groups on the nitrogen, `2-fenilacetamida`, `acetamida` after a
 * substituted phenyl, `ftalamida` with ring prefixes.
 *
 * @param {string} name - A retained amide name.
 * @returns {string} The form.
 */
function formOf(name) {
  if (AMIDE_TEMPLATE_WORDS.includes(name)) {
    return name;
  }
  if (name.endsWith(AMIDE_TEMPLATE_WORDS[2])) {
    return 'substitutedFtalamida';
  }
  if (/^(?:N[-,])/.test(name)) {
    return name.endsWith(AMIDE_TEMPLATE_WORDS[0]) ? 'nitrogenFormamida' : 'nitrogenAcetamida';
  }
  return name === '2-fenilacetamida' ? 'fenilacetamida' : 'arylAcetamida';
} // End of function formOf()

test('closed loop (R-6d3): the generators\' retained amide names read back as the engine\'s alternatives, the same graph', () => {
  const names = generatedTemplateNames();
  const forms = {};
  for (const { name, naming, key } of names) {
    const verdict = readName(idsOf(name));
    assert.equal(verdict.kind, 'alternative', `${name}: ${verdict.message}`);
    assert.equal(verdict.name, naming.name, name);
    assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
    forms[formOf(name)] = (forms[formOf(name)] || 0) + 1;
  }
  // The seeds give 120 (the names reverse-amides.test.js counted as later until phase I-52d3).
  assert.equal(names.length, 120);
  assert.deepEqual(forms, { formamida: 1, acetamida: 1, ftalamida: 1, nitrogenFormamida: 64, nitrogenAcetamida: 38, fenilacetamida: 1,
    arylAcetamida: 2, substitutedFtalamida: 12 });
}); // End of test 'closed loop (R-6d3): the generators\'…'

/**
 * The diagnosis codes an `otherName` of each mutation family may give; the
 * `carbamoyl` and `carboxy` families, the amide's own mistakes (`count`,
 * `seniority`), deliberate «Amides» nulls until phase I-52d4, take that
 * phase's codes.
 */
const FAMILY_CODES = Object.freeze({
  substituted: ['SUBSTITUTED_TEMPLATE'],
  arylReflected: ['BRANCH_RING_NUMBERING'],
  ringReflected: ['RING_NUMBERING'],
  unsorted: ['ALPHABETICAL_ORDER'],
  carbamoyl: CATEGORY_CODES.count,
  carboxy: CATEGORY_CODES.seniority,
});

/** The category of the amide's own mistakes each family of them gives (templateCategory()). */
const FAMILY_CATEGORY = Object.freeze({ carbamoyl: 'count', carboxy: 'seniority' });

/**
 * Rewrites the number locants of some prefix nodes, each list back in
 * ascending order over the same tiles (an `N` stays where it is).
 *
 * @param {string[]} out - Tile ids (changed in place).
 * @param {object[]} tiles - The parsed tiles.
 * @param {object[]} items - Prefix nodes.
 * @param {(value: number) => number} map - The new value of each locant.
 * @returns {void}
 */
function rewriteLocants(out, tiles, items, map) {
  for (const item of items.filter((it) => it.type === 'prefix')) {
    const numbers = item.locants.filter((p) => tiles[p].kind === 'num');
    const values = numbers.map((p) => map(tiles[p].value)).sort((a, b) => a - b);
    numbers.forEach((p, k) => {
      out[p] = `num-${values[k]}`;
    });
  }
} // End of function rewriteLocants()

/**
 * The mutations of one retained amide name: on a chain template, a methyl
 * added on its last carbon (`substituted`: `1-metilformamida`,
 * `2-metilacetamida`), a `carbamoil` there (`carbamoyl`, another amide
 * group) and a `carboxi` there (`carboxy`, a senior group); on `ftalamida`,
 * its prefixes numbered from the other –CONH₂ (`ringReflected`: v → 9 − v),
 * a `carbamoil` and a `carboxi` on its first free ring carbon; a substituted
 * phenyl's own numbers reflected (`arylReflected`: v → 8 − v, on carbon 2 or
 * on the nitrogen); the first two different prefixes swapped (`unsorted`).
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations (none equal to the name).
 */
function mutationsOf(ids) {
  const { tree } = parse(ids);
  const { tiles } = tree;
  const word = tree.parent.chain.tile;
  const value = tiles[word].value;
  const prefixes = tree.items.filter((it) => it.type === 'prefix');
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
  if (value === 'phthalamide') {
    const mutated = [...ids];
    rewriteLocants(mutated, tiles, tree.items, (v) => 9 - v);
    push('ringReflected', mutated);
    const used = new Set(prefixes.flatMap((item) => item.locants.map((p) => tiles[p].value)));
    const free = [3, 4, 5, 6].find((v) => !used.has(v));
    if (free) {
      push('carbamoyl', [`num-${free}`, ...seq('carbamoil'), ...ids]);
      push('carboxy', [`num-${free}`, ...seq('carboxi'), ...ids]);
    }
  } else {
    const last = `num-${TEMPLATES[value].chain}`;
    push('substituted', [...ids.slice(0, word), last, ...seq('met il'), ...ids.slice(word)]);
    push('carbamoyl', [last, ...seq('carbamoil'), ...ids]);
    push('carboxy', [last, ...seq('carboxi'), ...ids]);
  }
  /**
   * Tells whether a prefix is a compound branch whose own chain is `fenil` (a chain's node has a root, no tile of its own).
   *
   * @param {object} it - A prefix node.
   * @returns {boolean} True for a substituted phenyl.
   */
  const aryl = (it) => it.substituent.type === 'branch' && it.substituent.chain && it.substituent.chain.tile !== undefined
    && tiles[it.substituent.chain.tile].value === 'phenyl';
  for (const item of prefixes.filter(aryl)) {
    const mutated = [...ids];
    rewriteLocants(mutated, tiles, item.substituent.items, (v) => 8 - v);
    push('arylReflected', mutated);
  }
  const words = prefixes.map((item) => ids.slice(item.range[0], item.range[1]));
  const j = words.findIndex((w) => w.join() !== words[0].join());
  if (j > 0) {
    const swapped = [...words];
    [swapped[0], swapped[j]] = [swapped[j], swapped[0]];
    push('unsorted', [...swapped.flat(), ...ids.slice(tree.parent.range[0])]);
  }
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some retained amide names: an `otherName` must
 * carry a diagnosis of its family's codes whose step resolves in its
 * explanation — the amide's own mistakes among them (deliberate «Amides»
 * nulls until phase I-52d4) with the category of their family, counted.
 *
 * @param {string[]} names - Retained amide names.
 * @returns {{otherName: Object<string, number>, codes: Set<string>, own: Object<string, number>, unexpected: string[]}}
 *   `otherName` counts by family, the codes seen, the amide's own mistakes by category and the unexpected nulls.
 */
function sweep(names) {
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const codes = new Set();
  const own = {};
  const unexpected = [];
  for (const name of names) {
    for (const mutation of mutationsOf(idsOf(name))) {
      const verdict = readName(mutation.ids);
      if (verdict.kind !== 'otherName') {
        continue;
      }
      otherName[mutation.family] += 1;
      const label = `${name} → ${mutation.family} ${verdict.text}`;
      const d = verdict.diagnosis;
      const category = FAMILY_CATEGORY[mutation.family];
      if (category) {
        assert.equal(templateCategory(verdict), category, label);
        own[category] = (own[category] || 0) + 1;
      }
      if (!d) {
        unexpected.push(label);
        continue;
      }
      codes.add(d.code);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|grupo –OH|grupos –OH|–CHO|–C≡N/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, own, unexpected };
} // End of function sweep()

test('mutations of the fixture\'s retained amide names: a diagnosis of the family\'s codes, never null', async () => {
  const names = (await readFixtures()).filter((row) => isAmide(row.smiles)).flatMap((row) => row.names).filter(isAmideTemplateName);
  assert.equal(names.length, 15);
  const { otherName, codes, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  // A methyl on a chain template's last carbon: SUBSTITUTED_TEMPLATE; two different groups swapped: ALPHABETICAL_ORDER; a `carbamoil`
  // or a `carboxi` beside the word: the amide's own mistakes (`count`, `seniority`: deliberate nulls until phase I-52d4, now
  // CARBONYL_PREFIX and CARBONYL_SENIORITY; a `carbamoil` beside a group on the nitrogen is the engine's refusal of an
  // N-substituted diamide, `outOfScope`, not counted). The aryl phenyls reflect onto themselves and bare `ftalamida` has no prefix
  // to renumber.
  assert.deepEqual(otherName, { substituted: 14, arylReflected: 0, ringReflected: 0, unsorted: 2, carbamoyl: 5, carboxy: 15 });
  assert.deepEqual(own, { count: 5, seniority: 15 });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'CARBONYL_PREFIX', 'CARBONYL_SENIORITY', 'SUBSTITUTED_TEMPLATE']);
}); // End of test 'mutations of the fixture\'s retained amide names…'

test('mutations of the generated retained amide names: every otherName diagnosed, every step resolves', () => {
  const { otherName, codes, own, unexpected } = sweep(generatedTemplateNames().map(({ name }) => name));
  assert.deepEqual(unexpected, []);
  // The seeds give 120 names: SUBSTITUTED_TEMPLATE on every chain template, BRANCH_RING_NUMBERING on a reflected substituted phenyl
  // (on carbon 2 or on the nitrogen), RING_NUMBERING on a reflected substituted ftalamida, ALPHABETICAL_ORDER on two different groups
  // swapped, and every `carbamoil` or `carboxi` beside the word the amide's own mistake, a deliberate null until phase I-52d4, now
  // CARBONYL_PREFIX and CARBONYL_SENIORITY.
  assert.deepEqual(otherName, { substituted: 107, arylReflected: 34, ringReflected: 10, unsorted: 38, carbamoyl: 14, carboxy: 116 });
  assert.deepEqual(own, { count: 14, seniority: 116 });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_RING_NUMBERING', 'CARBONYL_PREFIX', 'CARBONYL_SENIORITY',
    'RING_NUMBERING', 'SUBSTITUTED_TEMPLATE']);
}); // End of test 'mutations of the generated retained amide names…'

test('«Dibujar» (R-6d3): amide template verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const words of ['formamida', 'acetamida', 'ftalamida', 'N N di met il formamida', 'N fenil acetamida', '2 fenil acetamida',
    '2 START 4 met il fenil END acetamida', '4 met il ftalamida', '3 4 5 6 tetra cloro ftalamida', '2 cloro acetamida',
    '2 carbamoil acetamida']) {
    const verdict = readName(seq(words));
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6d3)…'

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

test('property (R-6d3): random names with a retained amide word — prefixes, `N`, letters, tails or none — never crash', () => {
  const random = mulberry32(20261016);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const prefixes = ['', '', '2 cloro', 'cloro', 'N met il', 'N N di met il', 'met il', '2 fenil', 'fenil', 'N fenil',
    '2 START 4 met il fenil END', '4 met il', 'p met il', 'N p di met il', 'N acetil', '2 carbamoil', '2 carboxi', 'N N N tri met il',
    '1', 'o', 'di', 'ácido', 'N'];
  const words = ['formamida', 'acetamida', 'acetamida', 'ftalamida'];
  const tails = ['', '', '', 'amida', 'met ilo', 'oico', 'carboxamida', 'met il'];
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const name = [pick(prefixes), pick(prefixes), pick(words), pick(tails)].filter(Boolean).join(' ');
    const ids = seq(name);
    const verdict = readName(ids, { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, name);
    }
    if (verdict.kind === 'invalid') {
      assert.ok(verdict.errors.length > 0 && verdict.errors.every((e) => e.from <= e.to && e.to <= ids.length), name);
      assert.ok(verdict.errors.every((e) => !/undefined|null|NaN|\[object/.test(e.message)), name);
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      // An acid's –COOH only where the acid is the principal group (R-6d4: the word beside a `carboxi`, CARBONYL_SENIORITY).
      const acid = verdict.naming.structure.suffix && verdict.naming.structure.suffix.kind === 'acid';
      assert.ok(!/undefined|null|NaN|\[object|–OH/.test(verdict.diagnosis.message), `${name}: ${verdict.diagnosis.message}`);
      assert.ok(acid || !/–COOH/.test(verdict.diagnosis.message), `${name}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['alternative', 'otherName', 'missingLocants', 'invalid', 'outOfScope']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6d3)…'

test('partial names (R-6d3): every start of a retained amide name\'s tiles reads as a verdict, an error with its tiles when unfinished', () => {
  const kinds = new Set();
  for (const words of ['N N di met il formamida', '2 START 4 met il fenil END acetamida', 'N et il N met il acetamida',
    '3 4 5 6 tetra cloro ftalamida']) {
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
}); // End of test 'partial names (R-6d3)…'

test('time (R-6d3): representative amide template names within the per-name budget', () => {
  const all = ['tetra cloro ftalamida', 'di met il ftalamida', 'START 4 met il fenil END acetamida', 'di met il acetamida',
    'tri met il acetamida', 'fenil acetamida', 'met il et il formamida', 'N START 2 cloro et il END acetamida'];
  all.forEach((words) => readName(seq(words))); // Warm-up.
  for (const words of all) {
    const start = performance.now();
    readName(seq(words));
    const elapsed = performance.now() - start;
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
  }
}); // End of test 'time (R-6d3)…'
