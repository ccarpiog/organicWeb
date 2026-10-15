/**
 * @file Unit tests for the retained ester names of «¿Cómo se dibuja?»
 * (src/reverse/, design.md §13.4 I-35, I-40d, I-45c, §15.5.3, §15.7, §15.8
 * R-6a; phase I-52a2a, R-6a2a): the «Nombres tradicionales» tiles
 * `formiato`, `acetato` and `fenilacetato`, the acid part of an ester,
 * followed by the O-bound side as after `oato` (`acetato de etilo`), through
 * the parser (ESTER_GROUPS with the template's own example, ACID_WORD and
 * ESTER_SUFFIX pairing with the retained acids, TEMPLATE_LOCANTS,
 * POSITIONAL, TILE_ORDER, each with its message and tile range), the
 * assembler and the tokenizer, interpret.js (an open chain with its –COO–
 * placed at carbon 1), build.js (LOCANT_RANGE and VALENCE messages),
 * search.js and readName(): every form the forward engine lists read as
 * `alternative` with the engine's own label and the molecule compared by
 * aromatic key with a SMILES; the substituted aryl-acetate the engine writes
 * itself (`2-(4-metilfenil)acetato de etilo`) an alternative, its left-out
 * locant searched; any other prefix `otherName` with the SUBSTITUTED_TEMPLATE
 * diagnosis, the prefixes the engine admits judged by the other rules; the
 * ester's own mistakes on a template, each with its category read
 * independently — the –COO–'s carbon on the other side of a ring, a
 * deliberate «Esters» null until phase I-52a3a, now ESTER_CARBON; the
 * O-bound side still a deliberate null of diagnose.js for phase I-52a3b;
 * the tooltips; the fixture names; a closed loop over the engine's retained
 * ester names with each locant list removed; the diagnosis sweeps over the
 * retained names (fixture and generated), apart from those of phase R-6a1
 * (reverse-esters.test.js); the ordered drawing; time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName, VERDICT_TEXTS } from '../../src/reverse/index.js';
import { parse, esterSuffixOf } from '../../src/reverse/parse.js';
import { assemble, esterGroupsOf } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import {
  TILES, TEMPLATES, withArticle, templateAdmits, isEsterTemplate, isAcidTemplate, isCarbonylTemplate, parentWordName,
  ACID_ESTER_TEMPLATES,
} from '../../src/reverse/tiles.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { traditionalLabel, ESTER_LINK } from '../../src/naming/lexicon.es.js';
import {
  generateEsters, generateEsterPrefixes, generateRingEsters, generateSubstitutedEsters,
} from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, isEster, isEsterMolecule, isEsterTemplateName, ESTER_TEMPLATE_WORDS } from './reverse-words.js';

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
    ids = tokenize(name); // A name text: `2-(4-metilfenil)acetato de etilo`.
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
 * The words after ` de ` of an ester's name (its O-bound side).
 *
 * @param {string} name - An ester's name.
 * @returns {string} The O-bound side.
 */
function sideOf(name) {
  return name.slice(name.indexOf(ESTER_LINK) + ESTER_LINK.length);
}

/**
 * Retained ester forms the forward engine gives (principal.js
 * carbonylTraditionalId(), render.js renderName() `traditional`): [tile
 * words, the text, the engine's name, its TRADITIONAL_LABELS id, SMILES].
 * The O-bound side follows as after `oato`, in the engine's default style.
 */
const ALTERNATIVES = [
  ['formiato met ilo', 'formiato de metilo', 'metanoato de metilo', 'formate', 'O=COC'],
  ['formiato et ilo', 'formiato de etilo', 'metanoato de etilo', 'formate', 'O=COCC'],
  ['formiato isopropil ilo', 'formiato de isopropilo', 'metanoato de isopropilo', 'formate', 'O=COC(C)C'],
  ['formiato fenil ilo', 'formiato de fenilo', 'metanoato de fenilo', 'formate', 'O=COC1=CC=CC=C1'],
  ['acetato et ilo', 'acetato de etilo', 'etanoato de etilo', 'acetate', 'CCOC(C)=O'],
  ['acetato met ilo', 'acetato de metilo', 'etanoato de metilo', 'acetate', 'COC(C)=O'],
  ['acetato isopropil ilo', 'acetato de isopropilo', 'etanoato de isopropilo', 'acetate', 'CC(=O)OC(C)C'],
  ['acetato tert-butil ilo', 'acetato de tert-butilo', 'etanoato de tert-butilo', 'acetate', 'CC(=O)OC(C)(C)C'],
  ['acetato but ano 2 ilo', 'acetato de butan-2-ilo', 'etanoato de butan-2-ilo', 'acetate', 'CC(=O)OC(C)CC'],
  ['acetato prop 2 eno 1 ilo', 'acetato de prop-2-en-1-ilo', 'etanoato de prop-2-en-1-ilo', 'acetate', 'CC(=O)OCC=C'],
  ['acetato 2 cloro et ilo', 'acetato de 2-cloroetilo', 'etanoato de 2-cloroetilo', 'acetate', 'CC(=O)OCCCl'],
  ['acetato fenil ilo', 'acetato de fenilo', 'etanoato de fenilo', 'acetate', 'CC(=O)OC1=CC=CC=C1'],
  ['acetato 4 met il fenil ilo', 'acetato de 4-metilfenilo', 'etanoato de 4-metilfenilo', 'acetate', 'CC(=O)OC1=CC=C(C)C=C1'],
  ['fenilacetato met ilo', 'fenilacetato de metilo', '2-feniletanoato de metilo', 'phenylacetate', 'COC(=O)CC1=CC=CC=C1'],
  ['fenilacetato fenil ilo', 'fenilacetato de fenilo', '2-feniletanoato de fenilo', 'phenylacetate', 'O=C(OC1=CC=CC=C1)CC1=CC=CC=C1'],
  // The substituted aryl-acetate the engine writes itself: a phenyl with its own prefixes on carbon 2 of `acetato`.
  ['2 START 4 met il fenil END acetato et ilo', '2-(4-metilfenil)acetato de etilo', '2-(4-metilfenil)etanoato de etilo', 'arylacetate',
    'CCOC(=O)CC1=CC=C(C)C=C1'],
  ['2 START 3 cloro fenil END acetato isopropil ilo', '2-(3-clorofenil)acetato de isopropilo',
    '2-(3-clorofenil)etanoato de isopropilo', 'arylacetate', 'CC(C)OC(=O)CC1=CC=CC(Cl)=C1'],
];

// ---------------------------------------------------------------------------
// Tiles, parser, assembler and tokenizer.
// ---------------------------------------------------------------------------

test('«Nombres tradicionales» (R-6a2a): the three ester tiles after the acid ones, each with a tooltip; quoted as on the tile', () => {
  const esters = TILES.filter((tile) => tile.kind === 'template' && tile.row === 'traditional').slice(25);
  assert.deepEqual(esters.map((tile) => tile.text), [...ESTER_TEMPLATE_WORDS]);
  assert.deepEqual(esters.map((tile) => tile.text), ['formiato', 'acetato', 'fenilacetato']);
  assert.deepEqual(esters.map((tile) => tile.id), ['template-formate', 'template-acetate', 'template-phenylacetate']);
  for (const tile of esters) {
    assert.ok(TILE_HINTS[tile.id] && TILE_HINTS[tile.id].endsWith('.'), tile.id);
    assert.ok(!/undefined|null/.test(TILE_HINTS[tile.id]), tile.id);
    assert.match(TILE_HINTS[tile.id], /Detrás va el grupo unido al oxígeno/, tile.id);
    assert.match(TILE_HINTS[tile.id], new RegExp(`${tile.text} de metilo|${tile.text} de etilo`), tile.id);
    assert.ok(isEsterTemplate(tile.value) && !isAcidTemplate(tile.value) && !isCarbonylTemplate(tile.value), tile.id);
    assert.equal(parentWordName(tile), tile.text, tile.id);
    assert.deepEqual([TEMPLATES[tile.value].suffix.value, TEMPLATES[tile.value].suffix.positions], ['ester', [1]], tile.id);
  }
  assert.match(TILE_HINTS['template-formate'], /metanoato/);
  assert.match(TILE_HINTS['template-acetate'], /etanoato\. .*Admite un fenil en el carbono 2: 2-\(4-metilfenil\)acetato de etilo/);
  assert.match(TILE_HINTS['template-phenylacetate'], /2-feniletanoato/);
  assert.deepEqual(['acetato', 'formiato'].map((word) => withArticle(word, 'de')), ['del acetato', 'del formiato']);
  // The retained acid each retained ester word belongs to (the ESTER_SUFFIX message's twin).
  assert.deepEqual(Object.entries(ACID_ESTER_TEMPLATES).map(([acid, ester]) => [TEMPLATES[acid].id, TEMPLATES[ester].id]),
    [['formicAcid', 'formate'], ['aceticAcid', 'acetate'], ['phenylaceticAcid', 'phenylacetate']]);
}); // End of test '«Nombres tradicionales» (R-6a2a)…'

test('parser (R-6a2a): a retained ester word is the parent with one –COO–, the O-bound side after it as after `oato`', () => {
  const { tree, errors } = parse(seq('acetato isopropil ilo'));
  assert.deepEqual(errors, []);
  assert.deepEqual([tree.parent.chain.type, tree.parent.chain.tile, tree.parent.suffix], ['template', 0, null]);
  assert.deepEqual(esterSuffixOf(tree.tiles, tree.parent), { tile: 0, count: 1, word: 'acetato', template: true });
  assert.deepEqual(tree.ester.range, [1, 3]);
  assert.deepEqual(tree.ester.items[0].substituent, { type: 'retained', tile: 1, oxi: null, ilo: 2, range: [1, 3] });
  const { groups, rest } = esterGroupsOf(tree.tiles, tree.ester.items);
  assert.deepEqual([groups.length, rest.length], [1, 0]);
  // A prefix of the template's stays a name-level prefix; the O-bound group's own prefixes stay in the O-bound side.
  const aryl = parse(seq('2 START 4 met il fenil END acetato 2 cloro et ilo')).tree;
  assert.deepEqual([aryl.items.length, aryl.parent.chain.tile, aryl.ester.range], [1, 7, [8, 12]]);
}); // End of test 'parser (R-6a2a): a retained ester word…'

test('parser (R-6a2a): ESTER_GROUPS, ACID_WORD and ESTER_SUFFIX pairing, TEMPLATE_LOCANTS, misplaced tiles, with tile ranges', () => {
  const cases = [
    // No O-bound side, or not one per –COO–: the template's own ester as the example.
    ['acetato', ['ESTER_GROUPS[0,1)'], 'Detrás de «acetato» va el grupo unido al oxígeno del éster, acabado en «ilo» (la palabra «de» '
      + 'la pone la app): acetato, met e ilo dan acetato de metilo.'],
    ['fenilacetato', ['ESTER_GROUPS[0,1)'], 'Detrás de «fenilacetato» va el grupo unido al oxígeno del éster, acabado en «ilo» (la '
      + 'palabra «de» la pone la app): fenilacetato, met e ilo dan fenilacetato de metilo.'],
    ['2 START 4 met il fenil END acetato', ['ESTER_GROUPS[7,8)'], null],
    ['formiato met ilo et ilo', ['ESTER_GROUPS[0,5)'], 'Con «formiato» hay un solo grupo COO, que lleva un solo grupo unido al '
      + 'oxígeno, y tu nombre pone dos: formiato de metilo.'],
    ['acetato di met ilo', ['ESTER_GROUPS[0,4)'], 'Con «acetato» hay un solo grupo COO, que lleva un solo grupo unido al oxígeno, y '
      + 'tu nombre pone dos: acetato de metilo.'],
    // `ácido` before a retained ester word: the error on `ácido`.
    ['ácido acetato met ilo', ['ACID_WORD[0,1)'], 'La palabra «ácido» va delante del nombre de un ácido, y «acetato» es el nombre de la '
      + 'parte ácida de un éster, que se escribe sin «ácido»: acetato de metilo.'],
    ['ácido fenilacetato met ilo', ['ACID_WORD[0,1)'], 'La palabra «ácido» va delante del nombre de un ácido, y «fenilacetato» es el '
      + 'nombre de la parte ácida de un éster, que se escribe sin «ácido»: fenilacetato de metilo.'],
    ['ácido acetato', ['ACID_WORD[0,1)', 'ESTER_GROUPS[1,2)'], null],
    // An O-bound side after a retained acid: the error on the O-bound side, the acid's ester word in the message.
    ['ácido acético met ilo', ['ESTER_SUFFIX[2,4)'], 'El grupo acabado en «ilo» va unido al oxígeno de un éster, y «ácido acético» '
      + 'es el nombre de un ácido. En el éster, el ácido acético se nombra «acetato», sin la palabra «ácido»: acetato de metilo.'],
    ['ácido fórmico et ilo', ['ESTER_SUFFIX[2,4)'], 'El grupo acabado en «ilo» va unido al oxígeno de un éster, y «ácido fórmico» es '
      + 'el nombre de un ácido. En el éster, el ácido fórmico se nombra «formiato», sin la palabra «ácido»: formiato de metilo.'],
    ['ácido fenilacético met ilo', ['ESTER_SUFFIX[2,4)'], 'El grupo acabado en «ilo» va unido al oxígeno de un éster, y «ácido '
      + 'fenilacético» es el nombre de un ácido. En el éster, el ácido fenilacético se nombra «fenilacetato», sin la palabra «ácido»: '
      + 'fenilacetato de metilo.'],
    // A retained acid without a retained ester word: the general message.
    ['ácido oxálico di met ilo', ['ESTER_SUFFIX[2,5)'], 'El grupo acabado en «ilo» es el que va unido al oxígeno de un éster, detrás '
      + 'de la parte ácida, y el nombre de esa parte termina en «oato» (etanoato de metilo), en «carboxilato» '
      + '(ciclohexanocarboxilato de etilo) o en «benzoato» (benzoato de metilo).'],
    ['acético met ilo', ['ACID_WORD[0,1)', 'ESTER_SUFFIX[1,3)'], null],
    // Numbers or a letter of its own on a template that places its –COO–.
    ['1 acetato met ilo', ['TEMPLATE_LOCANTS[0,1)'], '«acetato» ya dice dónde va su grupo COO, en el carbono 1: no lleva números ni '
      + 'letras propios.'],
    ['o formiato met ilo', ['TEMPLATE_LOCANTS[0,1)'], '«formiato» ya dice dónde va su grupo COO, en el carbono 1: no lleva números ni '
      + 'letras propios.'],
    ['1 2 fenilacetato met ilo', ['TEMPLATE_LOCANTS[0,2)'], '«fenilacetato» ya dice dónde van su grupo COO y su fenilo, en los '
      + 'carbonos 1 y 2: no lleva números ni letras propios.'],
    ['p met il acetato met ilo', ['POSITIONAL[0,1)'], 'Las letras «o», «m» y «p» (orto, meta y para) solo se usan con el benceno, para '
      + 'decir dónde están sus dos grupos (o-dimetilbenceno); aquí van números.'],
    ['di acetato met ilo', ['TILE_ORDER[0,1)'], 'Esta ficha no puede ir aquí: «di», «tri»… van delante de una rama (dimetil), no '
      + 'delante de «acetato».'],
    // In the O-bound side, or after another parent: the acid part goes first.
    ['et ano oato acetato', ['TILE_ORDER[3,4)'], 'Esta ficha no puede ir aquí: «acetato» es el nombre de la parte ácida de un éster y '
      + 'va delante del grupo unido al oxígeno (acetato de metilo).'],
    ['acetato met ilo formiato', ['TILE_ORDER[3,4)'], null],
    ['acetato met il', ['TILE_ORDER[2,3)'], 'Esta ficha no puede ir aquí: el grupo unido al oxígeno de un éster acaba en «ilo», no en '
      + '«il»: met e ilo dan metilo (etanoato de metilo).'],
    ['acetato ácido', ['TILE_ORDER[1,2)'], null],
  ];
  for (const [words, errors, message] of cases) {
    assert.deepEqual(errorsOf(words), errors, words);
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    if (message) {
      assert.equal(verdict.message, message, words);
    }
  } // End of the loop over the cases
  // Inside a compound branch: the template's hint, and its END's (a branch without its own chain).
  assert.deepEqual(errorsOf('START acetato END met ano'), ['TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']);
  assert.equal(readName(seq('START acetato END met ano')).errors[0].message, 'Esta ficha no puede ir aquí: «acetato» es el nombre de la '
    + 'parte ácida de un éster y va delante del grupo unido al oxígeno (acetato de metilo).');
}); // End of test 'parser (R-6a2a): ESTER_GROUPS…'

test('assembler and tokenizer (R-6a2a): each template is one tile before the automatic ` de `, read back; the longest word first', () => {
  for (const [words, text] of ALTERNATIVES) {
    assert.equal(assemble(parse(idsOf(words)).tree).text, text, words);
    assert.deepEqual(tokenize(text), idsOf(words), text);
  }
  // `fenilacetato` is its own tile (the longer surface form), not `fenil` + `acetato`, which assemble alike.
  assert.equal(assemble(parse(seq('fenil acetato met ilo')).tree).text, 'fenilacetato de metilo');
  assert.deepEqual(tokenize('fenilacetato de metilo'), seq('fenilacetato met ilo'));
  // The O-bound side's own forms after a template: a multiplier the engine never writes there is kept as chosen.
  assert.equal(assemble(parse(seq('acetato START 2 cloro et ilo END')).tree).text, 'acetato de 2-cloroetilo');
  for (const name of ['acetato', 'acetato de', 'acetato metilo', 'acetatode metilo', 'acetato de metil', 'ácido acetato de metilo',
    '1-acetato de metilo', 'o-acetato de metilo', 'diacetato de metilo', 'acetato de metilo de etilo', 'metilo acetato',
    'ácido acético de metilo', 'acetato de acetato', 'formiato y metilo']) {
    assert.equal(tokenize(name), null, name);
  }
}); // End of test 'assembler and tokenizer (R-6a2a)…'

// ---------------------------------------------------------------------------
// Interpreter, builder and search.
// ---------------------------------------------------------------------------

test('interpreter (R-6a2a): a retained ester word is an open chain with its –COO– placed at carbon 1, then the O-bound side', () => {
  let spec = specOf('acetato met ilo');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.parent.template.value, spec.parent.template.groups],
    ['chain', 2, 'acetate', []]);
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.bridge, spec.suffix.hydroxy, spec.suffix.placed,
    spec.suffix.terminal], ['ester', false, true, false, true, false]);
  assert.deepEqual(spec.suffix.slots.map((slot) => [slot.kind, slot.value]), [['implicit', 1]]);
  assert.deepEqual([spec.parent.template.word.text, spec.suffix.word.text, spec.classWord, spec.traditional.value, spec.leftOut],
    ['acetato', 'acetato', null, 'acetate', []]);
  assert.deepEqual(spec.ester.groups.map((group) => [group.multiplier.count, group.substituent.length, group.substituent.oBound]),
    [[1, 1, true]]);
  spec = specOf('formiato isopropil ilo');
  assert.deepEqual([spec.parent.length, spec.suffix.slots.map((slot) => slot.value), spec.ester.groups[0].substituent.retained],
    [1, [1], 'isopropyl']);
  spec = specOf('fenilacetato met ilo');
  const [phenyl] = spec.parent.template.groups;
  assert.deepEqual([phenyl.substituent.kind, phenyl.slots.map((slot) => slot.value), spec.suffix.slots[0].value], ['phenyl', [2], 1]);
  // The student's prefixes are numbered on the template's chain; the O-bound group's on its own chain.
  spec = specOf('2 cloro acetato 2 cloro et ilo');
  assert.deepEqual(spec.prefixes[0].slots.map((slot) => [slot.value, slot.domain]), [[2, [1, 2]]]);
  spec = specOf('cloro acetato met ilo');
  assert.deepEqual(spec.leftOut.map((slot) => slot.domain), [[1, 2]]);
}); // End of test 'interpreter (R-6a2a)…'

test('builder (R-6a2a): LOCANT_RANGE on a template\'s chain, VALENCE on the carbon its –COO– fills, each on the student\'s tiles', () => {
  const cases = [
    ['3 cloro acetato met ilo', 'LOCANT_RANGE', 'La cadena del acetato tiene 2 carbonos, del 1 al 2: no hay carbono 3.', [0, 1]],
    ['2 cloro formiato met ilo', 'LOCANT_RANGE', 'El formiato solo tiene 1 carbono: no hay carbono 2.', [0, 1]],
    ['4 met il fenilacetato met ilo', 'LOCANT_RANGE', 'La cadena del fenilacetato tiene 2 carbonos, del 1 al 2: no hay carbono 4. En '
      + '«fenilacetato» el anillo no se numera: con grupos en el anillo, escribe el nombre sistemático (2-(4-metilfenil)etanoato de '
      + 'metilo).', [0, 1]],
    ['1 met il acetato met ilo', 'VALENCE', 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el acetato, ese '
      + 'carbono ya lleva un grupo COO.', [0, 1]],
    ['1 met il fenilacetato met ilo', 'VALENCE', 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en el '
      + 'fenilacetato, ese carbono ya lleva un grupo COO.', [0, 1]],
    // The O-bound side keeps its own messages.
    ['acetato 3 cloro et ilo', 'LOCANT_RANGE', 'El grupo unido al oxígeno tiene 2 carbonos, del 1 al 2: no hay carbono 3.', [1, 2]],
  ];
  for (const [words, code, message, range] of cases) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    assert.deepEqual([verdict.errors[0].code, verdict.errors[0].message], [code, message], words);
    assert.deepEqual([verdict.errors[0].from, verdict.errors[0].to], range, words);
  }
  // The message on `4-metilfenilacetato` leads to a name the app reads.
  assert.equal(readName(tokenize('2-(4-metilfenil)etanoato de metilo')).kind, 'correct');
  // A chlorine on the formate's carbon is a carbonic acid's ester, which the engine refuses: outOfScope with its message.
  const refused = readName(seq('cloro formiato met ilo'));
  assert.equal(refused.kind, 'outOfScope');
  assert.ok(refused.message.startsWith(VERDICT_TEXTS.outOfScope));
}); // End of test 'builder (R-6a2a)…'

test('search (R-6a2a): left-out locants on a template and in its O-bound side, filled with the engine\'s retained names', () => {
  let verdict = readName(seq('START 4 met il fenil END acetato et ilo'));
  assert.deepEqual([verdict.kind, verdict.filled, verdict.matched.style], ['missingLocants', '2-(4-metilfenil)acetato de etilo',
    'traditional']);
  assert.equal(verdict.message, `${VERDICT_TEXTS.almost} Se escribe «2-(4-metilfenil)acetato de etilo» (${traditionalLabel('arylacetate')}). `
    + 'El nombre que doy primero es «2-(4-metilfenil)etanoato de etilo».');
  verdict = readName(seq('acetato cloro et ilo'));
  assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', 'Faltan números: puede ser acetato de 1-cloroetilo o acetato de '
    + '2-cloroetilo.']);
  verdict = readName(seq('acetato met il fenil ilo'));
  assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', 'Faltan números: puede ser acetato de 2-metilfenilo, acetato de '
    + '3-metilfenilo o acetato de 4-metilfenilo.']);
  // `acetato`'s carbon 1 is full: a left-out prefix goes on carbon 2, one structure.
  verdict = readName(seq('cloro acetato met ilo'));
  assert.deepEqual([verdict.kind, verdict.name], ['otherName', '2-cloroetanoato de metilo']);
}); // End of test 'search (R-6a2a)…'

// ---------------------------------------------------------------------------
// readName(): the engine's forms, substituted templates, diagnosis.
// ---------------------------------------------------------------------------

test('readName (R-6a2a): every retained ester form the engine gives is an alternative, with the engine\'s own label', () => {
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
    // One –COO– with its bridge oxygen, one O-bound group bonded to it.
    assert.deepEqual([verdict.suffixAtoms.length, verdict.suffixAtoms[0].bridge !== undefined, verdict.esterAtoms.length], [1, true, 1],
      text);
    assert.equal(verdict.esterAtoms[0].bridge, verdict.suffixAtoms[0].bridge, text);
  } // End of the loop over the alternatives
  // `fenil` and `acetato` typed as two tiles write the same text, and read as the same alternative.
  const split = readName(seq('fenil acetato met ilo'));
  assert.deepEqual([split.kind, split.name], ['alternative', '2-feniletanoato de metilo']);
}); // End of test 'readName (R-6a2a): every retained ester form…'

test('the forward engine lists exactly these forms; the systematic name is `correct` and announces them', () => {
  for (const [, text, name, , smiles] of ALTERNATIVES) {
    const naming = nameMolecule(parseSmiles(smiles));
    assert.equal(naming.name, name);
    assert.deepEqual(naming.alternatives.filter((alt) => alt.style === 'traditional').map((alt) => alt.name), [text], smiles);
  }
  // The retained word with the default O-bound style only: no `acetato de propan-2-ilo` (the engine's pin form is systematic).
  assert.ok(!nameMolecule(parseSmiles('CC(=O)OC(C)C')).alternatives.some((alt) => alt.name === 'acetato de propan-2-ilo'));
  // No retained name for a substituted formate, acetate (but a substituted phenyl) or phenylacetate, nor for a diester.
  for (const smiles of ['ClCC(=O)OC', 'CCC(=O)OC', 'COC(=O)C(Cl)C1=CC=CC=C1', 'COC(=O)C(=O)OC', 'OCC(=O)OC']) {
    assert.ok(nameMolecule(parseSmiles(smiles)).alternatives.every((alt) => alt.style !== 'traditional'), smiles);
  }
  const also = (id, word) => ` También se llama «${word}» (${traditionalLabel(id)}).`;
  assert.equal(readName(tokenize('etanoato de etilo')).message, `${VERDICT_TEXTS.correct}${also('acetate', 'acetato de etilo')}`);
  assert.equal(readName(tokenize('metanoato de metilo')).message, `${VERDICT_TEXTS.correct}${also('formate', 'formiato de metilo')}`);
  assert.equal(readName(tokenize('2-feniletanoato de metilo')).message,
    `${VERDICT_TEXTS.correct}${also('phenylacetate', 'fenilacetato de metilo')}`);
}); // End of test 'the forward engine lists exactly these forms…'

/**
 * Substituted ester templates the engine never writes: [tile words, the
 * text, the engine's name, SMILES, the template as the message quotes it].
 */
const SUBSTITUTED = [
  ['2 cloro acetato met ilo', '2-cloroacetato de metilo', '2-cloroetanoato de metilo', 'ClCC(=O)OC', 'acetato'],
  ['cloro acetato met ilo', 'cloroacetato de metilo', '2-cloroetanoato de metilo', 'ClCC(=O)OC', 'acetato'],
  ['2 2 2 tri cloro acetato et ilo', '2,2,2-tricloroacetato de etilo', '2,2,2-tricloroetanoato de etilo', 'ClC(Cl)(Cl)C(=O)OCC',
    'acetato'],
  ['2 met il acetato et ilo', '2-metilacetato de etilo', 'propanoato de etilo', 'CCC(=O)OCC', 'acetato'],
  ['2 hidroxi acetato met ilo', '2-hidroxiacetato de metilo', '2-hidroxietanoato de metilo', 'OCC(=O)OC', 'acetato'],
  ['met il formiato met ilo', 'metilformiato de metilo', 'etanoato de metilo', 'CC(=O)OC', 'formiato'],
  ['2 cloro fenilacetato met ilo', '2-clorofenilacetato de metilo', '2-cloro-2-feniletanoato de metilo', 'COC(=O)C(Cl)C1=CC=CC=C1',
    'fenilacetato'],
  // An O-bound side in another style beside the student's prefixes: the template's mistake is still named first.
  ['2 cloro acetato prop ano 2 ilo', '2-cloroacetato de propan-2-ilo', '2-cloroetanoato de isopropilo', 'ClCC(=O)OC(C)C', 'acetato'],
  // Even when the molecule has a traditional name of its own (`acetato de isopropilo`), whose O-bound style differs.
  ['met il formiato prop ano 2 ilo', 'metilformiato de propan-2-ilo', 'etanoato de isopropilo', 'CC(=O)OC(C)C', 'formiato'],
];

test('readName (R-6a2a): a substituted ester template draws its molecule, named by the app, with SUBSTITUTED_TEMPLATE', () => {
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
    const word = parse(ids).tree.parent.chain.tile;
    assert.deepEqual(diagnosis.tiles, [word, word + 1], `${text}: the template's tile`);
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok(opened.index >= 0 && [diagnosis.step, ...STEP_FALLBACKS[diagnosis.step]].includes(opened.steps[opened.index].id), text);
  } // End of the loop over the substituted templates
}); // End of test 'readName (R-6a2a): a substituted ester template…'

/**
 * Prefixes the engine admits on an ester template, judged by the other rules
 * (never SUBSTITUTED_TEMPLATE): [tile words, the engine's name, the code,
 * the step «Ver el paso» opens, the message].
 */
const ADMITTED = [
  // The phenyl on `acetato` numbered otherwise: «Nombra los sustituyentes» numbers it from the carbon bonded to the chain.
  ['2 START 5 met il fenil END acetato et ilo', '2-(3-metilfenil)etanoato de etilo', 'BRANCH_RING_NUMBERING', 'substituents', 'Un '
    + 'anillo que va en una rama se numera empezando por el carbono por el que se une, que es el 1, y siguiendo en el sentido que '
    + 'da los números más bajos a sus sustituyentes: «3-metilfenil», no «5-metilfenil».'],
  // The locant the engine's traditional form leaves out (`fenilacetato de metilo`), written, as `ácido 2-fenilacético` (R-5d2).
  ['2 fenil acetato met ilo', '2-feniletanoato de metilo', 'NEEDLESS_LOCANTS', 'assemble', 'El nombre tradicional «fenilacetato de '
    + 'metilo» se escribe sin números: «fenilacetato de metilo», no «2-fenilacetato de metilo».'],
];

test('readName (R-6a2a): prefixes the engine admits on an ester template are judged by the other rules', () => {
  for (const [words, name, code, step, message] of ADMITTED) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], words);
    assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.step, verdict.diagnosis.message], [code, step, message], words);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, step, words);
  }
  assert.equal(templateAdmits('acetate', specOf('2 START 4 met il fenil END acetato et ilo').prefixes), true);
  assert.equal(templateAdmits('acetate', specOf('2 fenil acetato et ilo').prefixes), true);
  assert.equal(templateAdmits('acetate', specOf('2 cloro acetato et ilo').prefixes), false);
  assert.equal(templateAdmits('formate', specOf('fenil formiato met ilo').prefixes), false);
  assert.equal(templateAdmits('phenylacetate', specOf('2 cloro fenilacetato met ilo').prefixes), false);
  // Two phenyls on the acid part and none on the O-bound side make two rings on one side: out of scope.
  assert.equal(readName(seq('2 2 di fenil acetato met ilo')).kind, 'outOfScope');
}); // End of test 'readName (R-6a2a): prefixes the engine admits…'

/**
 * The category of an ester's own mistake on a retained ester name, read
 * independently of diagnose.js (file header «Esters»; `carbon` named since
 * phase I-52a3a, `oBound` for phase I-52a3b):
 * `carbon` — the student's –COO– carbon is the chain's, the engine's
 * outside a ring (`fenilformiato de metilo` → `benzoato de metilo`);
 * `oBound` — the O-bound side is not the one the engine writes with the
 * retained word (its traditional name's, when it gives one; else any of its
 * names': `acetato de propan-1-ilo`, `acetato de propan-2-ilo`); null
 * otherwise.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category, or null.
 */
function templateCategory(ids, verdict) {
  const engine = verdict.naming.structure.suffix;
  const mine = interpret(parse(ids).tree).suffix;
  if (!engine || engine.kind !== 'ester' || !mine || mine.kind !== 'ester') {
    return null;
  }
  const groups = verdict.suffixAtoms.filter((g) => g.bridge !== undefined);
  if (groups.some((g) => g.carbon !== undefined) !== Boolean(engine.outside)) {
    return 'carbon';
  }
  const traditional = verdict.naming.alternatives.filter((alt) => alt.style === 'traditional').map((alt) => alt.name);
  const names = traditional.length > 0 ? traditional : [verdict.naming.name, ...verdict.naming.alternatives.map((alt) => alt.name)];
  return names.map(sideOf).includes(sideOf(verdict.text)) ? null : 'oBound';
} // End of function templateCategory()

/**
 * Ester templates whose –COO–'s carbon the engine puts outside a ring:
 * deliberate nulls of diagnose.js «Esters» until phase I-52a3a, now
 * ESTER_CARBON — [tile words, the engine's name, the category, the `formiato` tile's range, the message].
 */
const FORMER_NULLS = [
  ['fenil formiato met ilo', 'benzoato de metilo', 'carbon', [1, 2], 'Cuando el grupo –COO– está unido a un anillo, su carbono no forma '
    + 'parte del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra con «benzoato» (el benceno '
    + 'con un grupo –COO–) y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo». Se escribe «benzoato de metilo».'],
  ['START 4 cloro fenil END formiato met ilo', '4-clorobenzoato de metilo', 'carbon', [5, 6], 'Cuando el grupo –COO– está unido a un '
    + 'anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra '
    + 'con «benzoato» (el benceno con un grupo –COO–) y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo». Se '
    + 'escribe «4-clorobenzoato de metilo».'],
];

test('the former deliberate «Esters» nulls of R-6a2a (diagnose.js): the –COO–\'s carbon outside a ring, ESTER_CARBON', () => {
  for (const [words, name, category, tiles, message] of FORMER_NULLS) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], `${words}: ${verdict.message}`);
    assert.equal(templateCategory(ids, verdict), category, words);
    assert.ok(verdict.diagnosis, `${words}: no diagnosis`);
    assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.message], ['ESTER_CARBON', message], words);
    const explanation = diagnosisExplanation(verdict, explain);
    assert.equal(explanation.steps[explanation.index].id, 'group', `${words}: the step «Ver el paso» opens`);
    assert.deepEqual(verdict.diagnosis.tiles, tiles, `${words}: the template's tile`);
  } // End of the loop over the former deliberate nulls
}); // End of test 'the former deliberate «Esters» nulls of R-6a2a…'

/**
 * Ester templates whose O-bound side is not the engine's: deliberate nulls of
 * diagnose.js «Esters» for phase I-52a3b — [tile words, the engine's name,
 * the category].
 */
const NULLS = [
  // The traditional word beside an O-bound group in another style than the engine writes with it.
  ['acetato prop ano 2 ilo', 'etanoato de isopropilo', 'oBound'],
  ['acetato 1 met il et ilo', 'etanoato de isopropilo', 'oBound'],
  ['formiato prop ano 2 ilo', 'metanoato de isopropilo', 'oBound'],
  // An O-bound group the engine never writes, as after `oato`.
  ['acetato prop ano 1 ilo', 'etanoato de propilo', 'oBound'],
  ['acetato 1 2 di met il prop ilo', 'etanoato de 3-metilbutan-2-ilo', 'oBound'],
  ['acetato 6 met il fenil ilo', 'etanoato de 2-metilfenilo', 'oBound'],
];

test('deliberate «Esters» nulls (diagnose.js, for I-52a3b): an ester template\'s O-bound side, with its category, drawn', () => {
  for (const [words, name, category] of NULLS) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], `${words}: ${verdict.message}`);
    assert.equal(templateCategory(ids, verdict), category, words);
    assert.equal(verdict.diagnosis, null, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the deliberate nulls
  // The engine's own retained form is no null: `acetato de isopropilo` is its alternative.
  assert.equal(readName(seq('acetato isopropil ilo')).kind, 'alternative');
  // Not an ester's own mistake, and no «Esters» category: an aryl prefix in another style than the engine's default beside the
  // retained word (the engine writes its retained names in that style only). The same null as on the retained aldehyde
  // (R-5c3a) and acid (R-5d2), shared by every retained template that takes prefixes: an open question, left as it is.
  for (const name of ['2-[4-(propan-2-il)fenil]acetato de metilo', '2-[4-(propan-2-il)fenil]acetaldehído',
    'ácido 2-[4-(propan-2-il)fenil]acético']) {
    const ids = idsOf(name);
    const verdict = readName(ids);
    assert.deepEqual([verdict.kind, verdict.diagnosis], ['otherName', null], name);
    assert.equal(templateCategory(ids, verdict), null, name);
  }
}); // End of test 'deliberate «Esters» nulls…'

// ---------------------------------------------------------------------------
// Fixtures, closed loop, sweeps, drawing and time.
// ---------------------------------------------------------------------------

/** The retained ester names of the fixtures (I-35, I-39b, I-40d, I-45c), by their word (39 in all). */
const FIXTURE_WORDS = Object.freeze({ formiato: 5, acetato: 30, fenilacetato: 3, arylAcetato: 1 });

/**
 * The retained word of an ester's name: `formiato`, `acetato`,
 * `fenilacetato`, or `arylAcetato` for an `acetato` after a substituted
 * phenyl prefix.
 *
 * @param {string} name - A retained ester name.
 * @returns {string} The word's key.
 */
function wordOf(name) {
  const acid = name.slice(0, name.indexOf(ESTER_LINK));
  return ESTER_TEMPLATE_WORDS.includes(acid) ? acid : 'arylAcetato';
}

test('fixture round trip (R-6a2a): every fixture name with a retained ester word reads back, graph compared with the SMILES', async () => {
  const rows = (await readFixtures()).filter((row) => isEster(row.smiles));
  const words = {};
  for (const row of rows) {
    for (const name of row.names.filter(isEsterTemplateName)) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      assert.equal(assemble(parse(ids).tree).text, name, `names.tsv:${row.line}: assembly`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, name === row.names[0] ? 'correct' : 'alternative', `names.tsv:${row.line}: ${verdict.message}`);
      assert.equal(verdict.name, row.names[0]);
      assert.equal(aromaticKey(verdict.molecule), keyOf(row.smiles), `names.tsv:${row.line}: ${name}`);
      words[wordOf(name)] = (words[wordOf(name)] || 0) + 1;
    }
  } // End of the loop over the fixture rows
  assert.deepEqual(words, { ...FIXTURE_WORDS });
}); // End of test 'fixture round trip (R-6a2a)…'

/** Molecules whose engine names include a retained ester name, with the O-bound groups and the aryl prefixes it admits. */
const LOOP_SMILES = Object.freeze([
  'O=COC', 'O=COCC', 'O=COC(C)C', 'O=COC1=CC=CC=C1', 'O=COC1=CC=C(C)C=C1', 'O=COCC1=CC=CC=C1', 'CC(=O)OC', 'CC(=O)OCC', 'CC(=O)OC(C)C',
  'CC(=O)OC(C)(C)C', 'CC(=O)OCC=C', 'CC(=O)OC=C', 'CC(=O)OCCCl', 'CC(=O)OC(C)CC', 'CC(=O)OC1CCCCC1', 'CC(=O)OC1CCCCC1C',
  'CC(=O)OC1=CC=CC=C1', 'CC(=O)OC1=CC=C(Cl)C=C1Cl', 'CC(=O)OCCC1=CC=C(C)C=C1', 'COC(=O)CC1=CC=CC=C1', 'O=C(OC1=CC=CC=C1)CC1=CC=CC=C1',
  'CCOC(=O)CC1=CC=C(C)C=C1', 'CCOC(=O)CC1=CC=CC(Cl)=C1', 'CC(C)OC(=O)CC1=CC=C(C)C=C1', 'COC(=O)CC1=CC=C(Br)C=C1Cl',
]);

/**
 * The locant lists of a tree a student can leave out: a name-level prefix's
 * and a compound branch's inner prefixes', and in the O-bound side its
 * groups' prefixes and segments — never a free-valence locant.
 *
 * @param {object} tree - An error-free parse() tree.
 * @returns {number[][]} The lists of number tile indices.
 */
function locantLists(tree) {
  const lists = [];
  /**
   * Collects a prefix's list and those inside it.
   *
   * @param {object} item - A prefix node.
   * @returns {void}
   */
  const visit = (item) => {
    if (item.locants.length > 0) {
      lists.push(item.locants);
    }
    const sub = item.substituent;
    if (sub.type === 'branch') {
      sub.items.forEach(visit);
    }
    (sub.segments || []).forEach((segment) => segment.locants.length > 0 && lists.push(segment.locants));
  };
  tree.items.forEach(visit);
  tree.ester.items.filter((item) => item.type === 'prefix').forEach(visit);
  return lists;
} // End of function locantLists()

test('closed loop (R-6a2a): engine retained ester name → tiles → readName() → the same graph, then without each locant list', () => {
  const counts = { names: 0, removed: 0, decisive: 0 };
  for (const smiles of LOOP_SMILES) {
    const mol = parseSmiles(smiles);
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, smiles);
    const key = aromaticKey(mol);
    const names = naming.alternatives.map((alt) => alt.name).filter(isEsterTemplateName);
    assert.equal(names.length, 1, `${smiles}: ${naming.name}`);
    for (const name of names) {
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, 'alternative', `${name}: ${verdict.message}`);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      for (const list of locantLists(parse(ids).tree)) {
        const reread = readName(ids.filter((_, j) => !list.includes(j)));
        counts.removed += 1;
        const where = `${name} → ${reread.text}: ${reread.kind}, ${reread.message}`;
        if (reread.kind === 'ambiguous') {
          assert.ok(reread.candidates.some((c) => aromaticKey(c.molecule) === key), where);
        } else {
          assert.ok(['missingLocants', 'alternative', 'otherName'].includes(reread.kind), where);
          assert.equal(aromaticKey(reread.molecule), key, where);
          if (reread.kind === 'missingLocants') {
            assert.equal(reread.filled, name, where);
          }
        }
        counts.decisive += 1;
      } // End of the loop over the locant lists
    } // End of the loop over the template names of a molecule
  } // End of the loop over the molecules
  assert.deepEqual(counts, { names: 25, removed: 16, decisive: 16 }, JSON.stringify(counts));
}); // End of test 'closed loop (R-6a2a)…'

/** The closed loop's generators (scripts/oracle/generate.mjs), the seeds of reverse-esters.test.js. */
const GENERATED = Object.freeze({
  esters: Object.freeze({ count: 500, seed: 6101, maxSize: 12 }),
  prefixes: Object.freeze({ count: 400, seed: 6102, maxSize: 12 }),
  ringEsters: Object.freeze({ count: 400, seed: 6103, maxSize: 12 }),
  substituted: Object.freeze({ count: 300, seed: 6104, maxSize: 12 }),
});

/**
 * The retained ester names of the generators' esters (distinct by aromatic
 * key, named by the engine), with each molecule's naming.
 *
 * @returns {{name: string, naming: object, key: string}[]} The names.
 */
function generatedTemplateNames() {
  const seen = new Set();
  const out = [];
  const all = [...generateEsters(GENERATED.esters), ...generateEsterPrefixes(GENERATED.prefixes),
    ...generateRingEsters(GENERATED.ringEsters), ...generateSubstitutedEsters(GENERATED.substituted)];
  for (const mol of all.filter(isEsterMolecule)) {
    const key = aromaticKey(mol);
    const naming = nameMolecule(mol);
    if (seen.has(key) || !naming.ok) {
      continue;
    }
    seen.add(key);
    naming.alternatives.map((alt) => alt.name).filter(isEsterTemplateName).forEach((name) => out.push({ name, naming, key }));
  }
  return out;
} // End of function generatedTemplateNames()

test('closed loop (R-6a2a): the generators\' retained ester names read back as the engine\'s alternatives, the same graph', () => {
  const names = generatedTemplateNames();
  const words = {};
  for (const { name, naming, key } of names) {
    const verdict = readName(idsOf(name));
    assert.equal(verdict.kind, 'alternative', `${name}: ${verdict.message}`);
    assert.equal(verdict.name, naming.name, name);
    assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
    words[wordOf(name)] = (words[wordOf(name)] || 0) + 1;
  }
  // The seeds give 187 (the names reverse-esters.test.js counted as later until phase R-6a2a).
  assert.deepEqual(words, { formiato: 96, acetato: 78, fenilacetato: 6, arylAcetato: 7 });
}); // End of test 'closed loop (R-6a2a): the generators\'…'

/** The diagnosis codes an `otherName` of each mutation family may give (none: a deliberate null). */
const FAMILY_CODES = Object.freeze({
  substituted: ['SUBSTITUTED_TEMPLATE'],
  phenylLocant: ['NEEDLESS_LOCANTS'],
  arylReflected: ['BRANCH_RING_NUMBERING'],
  oBoundStyle: [],
  oBoundReflected: [],
});

/**
 * Reflects the locants of some prefix nodes on a phenyl ring (v → 8 − v:
 * 2 ↔ 6, 3 ↔ 5), each list back in ascending order over the same tiles.
 *
 * @param {string[]} out - Tile ids (changed in place).
 * @param {object[]} tiles - The parsed tiles.
 * @param {object[]} items - Prefix nodes on the phenyl.
 * @returns {void}
 */
function reflectPhenyl(out, tiles, items) {
  for (const item of items.filter((it) => it.type === 'prefix')) {
    const values = item.locants.map((p) => 8 - tiles[p].value).sort((a, b) => a - b);
    item.locants.forEach((p, k) => {
      out[p] = `num-${values[k]}`;
    });
  }
} // End of function reflectPhenyl()

/**
 * The mutations of one retained ester name: a methyl added on the
 * template's free carbon (`substituted`: `1-metilformiato`,
 * `2-metilacetato`), `fenilacetato` written `2 fenil acetato`
 * (`phenylLocant`), the substituted phenyl of an aryl-acetate reflected
 * (`arylReflected`: `2-(5-metilfenil)acetato`), the O-bound side in another
 * of the engine's styles (`oBoundStyle`: `acetato de propan-2-ilo`), and a
 * substituted O-bound phenyl reflected (`oBoundReflected`: `acetato de
 * 6-metilfenilo`).
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} naming - The engine's naming of its molecule.
 * @returns {{family: string, ids: string[]}[]} The mutations (none equal to the name).
 */
function mutationsOf(ids, naming) {
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
  const free = value === 'formate' ? 1 : 2;
  push('substituted', [...ids.slice(0, word), `num-${free}`, ...seq('met il'), ...ids.slice(word)]);
  if (value === 'phenylacetate') {
    push('phenylLocant', [...ids.slice(0, word), 'num-2', ...seq('fenil acetato'), ...ids.slice(word + 1)]);
  }
  for (const item of tree.items.filter((it) => it.type === 'prefix' && it.substituent.type === 'branch')) {
    const mutated = [...ids];
    reflectPhenyl(mutated, tiles, item.substituent.items);
    push('arylReflected', mutated);
  }
  const side = tree.ester.range[0];
  for (const other of [naming.name, ...naming.alternatives.map((alt) => alt.name)]) {
    const otherIds = tokenize(other);
    if (otherIds && sideOf(other) !== sideOf(assemble(tree).text)) {
      push('oBoundStyle', [...ids.slice(0, side), ...otherIds.slice(parse(otherIds).tree.ester.range[0])]);
    }
  }
  const { groups } = esterGroupsOf(tiles, tree.ester.items);
  const phenyl = groups.find((g) => g.end.substituent.type === 'retained' && tiles[g.end.substituent.tile].value === 'phenyl');
  if (phenyl && phenyl.items.length > 0) {
    const mutated = [...ids];
    reflectPhenyl(mutated, tiles, phenyl.items);
    push('oBoundReflected', mutated);
  }
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some retained ester names: every `otherName`
 * carries a diagnosis of its family's codes whose step resolves in its
 * explanation, or is a deliberate «Esters» null with its category
 * (templateCategory()); any other null is unexpected.
 *
 * @param {{name: string, naming: object}[]} names - Retained ester names and the engine's naming of each molecule.
 * @returns {{otherName: Object<string, number>, codes: Set<string>, nulls: Object<string, number>, unexpected: string[]}}
 *   `otherName` counts by family, the codes seen, the deliberate nulls by category and the unexpected ones.
 */
function sweep(names) {
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const codes = new Set();
  const nulls = {};
  const unexpected = [];
  for (const { name, naming } of names) {
    for (const mutation of mutationsOf(idsOf(name), naming)) {
      const verdict = readName(mutation.ids);
      if (verdict.kind !== 'otherName') {
        continue;
      }
      otherName[mutation.family] += 1;
      const label = `${name} → ${mutation.family} ${verdict.text}`;
      const d = verdict.diagnosis;
      const category = templateCategory(mutation.ids, verdict);
      if (!d) {
        if (category) {
          nulls[category] = (nulls[category] || 0) + 1;
        } else {
          unexpected.push(label);
        }
        continue;
      }
      codes.add(d.code);
      assert.equal(category, null, `${label}: ${category} diagnosed ${d.code}`);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|–OH|–CHO|–COOH|C=O/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, nulls, unexpected };
} // End of function sweep()

test('mutations of the fixture\'s retained ester names: a diagnosis of the family\'s codes, or a deliberate «Esters» null', async () => {
  const names = [];
  for (const row of (await readFixtures()).filter((r) => isEster(r.smiles))) {
    const naming = nameMolecule(parseSmiles(row.smiles));
    row.names.filter(isEsterTemplateName).forEach((name) => names.push({ name, naming }));
  }
  assert.equal(names.length, 39);
  const { otherName, codes, nulls, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  // A methyl on every template's free carbon: SUBSTITUTED_TEMPLATE; `2 fenil acetato`: NEEDLESS_LOCANTS. The O-bound side in the
  // engine's pin or substituted style (`acetato de propan-2-ilo`, `acetato de 4-(propan-2-il)fenilo`) or its phenyl reflected
  // (`acetato de 4,6-diclorofenilo`): deliberate «Esters» `oBound` nulls for phase I-52a3.
  assert.deepEqual(otherName, { substituted: 39, phenylLocant: 3, arylReflected: 0, oBoundStyle: 6, oBoundReflected: 3 });
  assert.deepEqual(nulls, { oBound: 9 }); // Every O-bound mutation: the engine never writes them beside the retained word.
  assert.deepEqual([...codes].sort(), ['NEEDLESS_LOCANTS', 'SUBSTITUTED_TEMPLATE']);
}); // End of test 'mutations of the fixture\'s retained ester names…'

test('mutations of the generated retained ester names: every otherName is diagnosed or a deliberate «Esters» null', () => {
  const { otherName, codes, nulls, unexpected } = sweep(generatedTemplateNames());
  assert.deepEqual(unexpected, []);
  // The seeds give 253 `otherName`: 199 diagnosed (187 SUBSTITUTED_TEMPLATE, 6 NEEDLESS_LOCANTS, 6 BRANCH_RING_NUMBERING on an
  // aryl-acetate's reflected phenyl) and 54 deliberate «Esters» `oBound` nulls (10 in another style, 44 a phenyl reflected).
  assert.deepEqual(otherName, { substituted: 187, phenylLocant: 6, arylReflected: 6, oBoundStyle: 10, oBoundReflected: 44 });
  assert.deepEqual(nulls, { oBound: 54 });
  assert.deepEqual([...codes].sort(), ['BRANCH_RING_NUMBERING', 'NEEDLESS_LOCANTS', 'SUBSTITUTED_TEMPLATE']);
}); // End of test 'mutations of the generated retained ester names…'

test('«Dibujar» (R-6a2a): ester template verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const words of ['formiato met ilo', 'acetato et ilo', 'acetato isopropil ilo', 'acetato fenil ilo', 'fenilacetato met ilo',
    '2 START 4 met il fenil END acetato et ilo', '2 cloro acetato met ilo', 'acetato prop ano 2 ilo']) {
    const verdict = readName(seq(words));
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6a2a)…'

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

test('property (R-6a2a): random names with a retained ester word — prefixes, `ácido`, O-bound tails or none — never crash', () => {
  const random = mulberry32(20261015);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const prefixes = ['', '', '2 cloro', 'cloro', '1 met il', '2 START 4 met il fenil END', 'START 3 cloro fenil END', '2 fenil', 'di',
    '1', 'o'];
  const words = ['formiato', 'acetato', 'fenilacetato', 'ácido acético', 'ácido acetato', 'fenil acetato'];
  const tails = ['', 'met ilo', 'et ilo', 'isopropil ilo', 'fenil ilo', 'prop ano 2 ilo', '2 cloro et ilo', 'di met ilo', 'met il',
    '4 met il fenil ilo', 'met ilo et ilo', 'acetato'];
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
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      assert.ok(!/undefined|null|NaN|\[object|–OH|–COOH/.test(verdict.diagnosis.message), `${name}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['alternative', 'otherName', 'missingLocants', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6a2a)…'

test('partial names (R-6a2a): every start of a retained ester name\'s tiles reads as a verdict, an error with its tiles when unfinished', () => {
  const kinds = new Set();
  for (const words of ['2 START 4 met il fenil END acetato et ilo', 'formiato isopropil ilo', 'fenilacetato 2 cloro et ilo',
    'acetato START 2 cloro et ilo END']) {
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
}); // End of test 'partial names (R-6a2a)…'

test('time (R-6a2a): representative ester template names within the per-name budget', () => {
  const all = ['START 4 met il fenil END acetato et ilo', 'acetato met il fenil ilo', 'cloro acetato met ilo', 'acetato cloro et ilo',
    '2 START 5 met il fenil END acetato et ilo', 'fenilacetato fenil ilo'];
  all.forEach((words) => readName(seq(words))); // Warm-up.
  for (const words of all) {
    const start = performance.now();
    readName(seq(words));
    const elapsed = performance.now() - start;
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
  }
}); // End of test 'time (R-6a2a)…'
