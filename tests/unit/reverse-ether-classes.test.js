/**
 * @file Unit tests for the ether functional-class names in «¿Cómo se
 * dibuja?» (src/reverse/, design.md §2 — the forward engine's class-name
 * rule —, §15.3, §15.5, §15.8 R-5b; phase I-51b2, R-5b2): the `éter` tile of
 * the «Grupos» row ends a name whose two groups are bonded to the ether
 * oxygen (`etil metil éter`, `dietil éter`, `tert-butil metil éter`,
 * `butil tert-butil éter`). Parser (the class-word parent, every error with
 * its tile range and message), assembler (rule 7: the automatic spaces, each
 * group enclosed as a prefix by itself; every engine class name assembled
 * exactly), tokenizer (round trip; texts no tiles write), interpreter and
 * builder (the oxygen as the parent, its two groups), search (left-out
 * locants inside a group), readName() verdicts of every §15.3 kind with the
 * molecule each describes (compared by aromatic key with a SMILES), the
 * ordered drawing, the dialog's tooltip, a property test and a time budget.
 * The fixture round trip and the closed loop over the class names are in
 * reverse-ethers.test.js; their diagnosis in reverse-diagnose-ethers.test.js.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble, isClassName } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms, specCarbons } from '../../src/reverse/build.js';
import { searchStructures } from '../../src/reverse/search.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { ETHER_CLASS_ID, ETHER_CLASS_GROUPS, tileById } from '../../src/reverse/tiles.js';
import { verdictLayout, verdictBlock } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { ETHER_CLASS_WORD, styleLabel } from '../../src/naming/lexicon.es.js';
import { seq } from './reverse-words.js';

/** Time budget of one representative class-name readName() call, in milliseconds. */
const PER_NAME_BUDGET_MS = 250;

/** The label of the engine's functional-class alternative (lexicon styleLabel()). */
const CLASS_LABEL = styleLabel('functionalClass');

/**
 * The tile ids of a name: space-separated tile words when every word is a
 * tile (reverse-words.js seq()), else the name read by the tokenizer.
 *
 * @param {string} name - Tile words or a name.
 * @returns {string[]} The tile ids.
 */
function idsOf(name) {
  try {
    return seq(name);
  } catch (err) {
    const ids = tokenize(name);
    assert.ok(ids, `no tiles for ${name}`);
    return ids;
  }
} // End of function idsOf()

/**
 * Reads a name (tile words or text).
 *
 * @param {string} name - Tile words or a name.
 * @param {object} [options] - readName() options.
 * @returns {object} The verdict.
 */
function read(name, options) {
  return readName(idsOf(name), options);
}

/**
 * The errors of a parse as `CODE[from,to)` strings.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string[]} The errors.
 */
function errorsOf(words) {
  return parse(seq(words)).errors.map((e) => `${e.code}[${e.from},${e.to})`);
}

/**
 * The first error message of a parse.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string} The message.
 */
function messageOf(words) {
  return parse(seq(words)).errors[0].message;
}

/**
 * The assembled text of tile words.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string} The text.
 */
function text(words) {
  return assemble(parse(seq(words)).tree).text;
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
 * The forward engine's functional-class alternative of a SMILES molecule.
 *
 * @param {string} smiles - A SMILES.
 * @returns {string|null} The class name, or null when the engine gives none.
 */
function engineClassName(smiles) {
  const naming = nameMolecule(parseSmiles(smiles));
  assert.ok(naming.ok, smiles);
  const alt = naming.alternatives.find((a) => a.style === 'functionalClass');
  return alt ? alt.name : null;
}

// ---------------------------------------------------------------------------
// Parser.
// ---------------------------------------------------------------------------

test('parse (R-5b2): `éter` is the parent of a class name, the name-level prefixes its two groups', () => {
  const { tree, errors } = parse(seq('et il met il éter'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.parent.chain, { type: 'classWord', tile: 4, range: [4, 5] });
  assert.deepEqual(tree.parent.range, [4, 5]);
  assert.deepEqual(tree.items.map((item) => [item.type, item.substituent.type, item.range]),
    [['prefix', 'chain', [0, 2]], ['prefix', 'chain', [2, 4]]]);
  assert.equal(isClassName(tree), true);
  assert.equal(isClassName(parse(seq('met il oxi et ano')).tree), false);
  // A group may be a retained word, `fenil`, a ring, an unsaturated chain or a compound branch; `di`/`bis` count two.
  for (const words of ['di et il éter', 'bis et il éter', 'tert-butil met il éter', 'but il tert-butil éter', 'di isopropil éter',
    'fenil met il éter', 'ciclo hex il met il éter', 'et eno il met il éter', 'met il prop 2 il éter',
    'START 2 cloro et il END met il éter', 'bis START 2 cloro et il END éter', 'met il START met il oxi met il END éter']) {
    assert.deepEqual(errorsOf(words), [], words);
  }
  assert.equal(ETHER_CLASS_GROUPS, 2);
  assert.equal(tileById(ETHER_CLASS_ID).text, ETHER_CLASS_WORD);
}); // End of test 'parse (R-5b2): `éter` is the parent of a class name…'

test('parse (R-5b2): class-name errors, each with its tile range', () => {
  for (const [words, errors] of [
    ['éter', ['ETHER_GROUPS[0,1)']],
    ['met il éter', ['ETHER_GROUPS[0,3)']],
    ['tri met il éter', ['ETHER_GROUPS[0,4)']],
    ['met il et il prop il éter', ['ETHER_GROUPS[0,7)']],
    ['met éter', ['ROOT_END[0,1)', 'ETHER_GROUPS[0,2)']],
    // Locants or a letter on a group, or before `éter`; a multiplier right before `éter`.
    ['2 met il et il éter', ['TILE_ORDER[0,1)']],
    ['o met il et il éter', ['TILE_ORDER[0,1)']],
    ['1 2 di met il éter', ['TILE_ORDER[0,2)']],
    ['met il et il 2 éter', ['TILE_ORDER[4,5)']],
    ['et il di éter', ['ETHER_GROUPS[0,4)', 'TILE_ORDER[2,3)']],
    // Groups the oxygen cannot carry.
    ['cloro met il éter', ['TILE_ORDER[0,1)']],
    ['hidroxi met il éter', ['TILE_ORDER[0,1)']],
    ['met il oxi et il éter', ['TILE_ORDER[2,3)']],
    ['met iliden met il éter', ['TILE_ORDER[1,2)']],
    ['isopropiliden met il éter', ['TILE_ORDER[0,1)']],
    ['START 2 met il prop iliden END met il éter', ['TILE_ORDER[5,6)']],
    // `éter` out of place: inside a compound branch, or followed by more tiles.
    ['START et il éter END met ano', ['TILE_ORDER[3,4)', 'TILE_ORDER[4,5)']],
    ['et il met il éter et ano', ['TILE_ORDER[5,7)']],
    ['et il met il éter éter', ['TILE_ORDER[5,6)']],
    // Without `éter`, two groups are a name without its parent, as before.
    ['et il met il', ['ENDS_WITH_BRANCH[2,4)']],
  ]) {
    assert.deepEqual(errorsOf(words), errors, words);
  } // End of the loop over the error cases
}); // End of test 'parse (R-5b2): class-name errors…'

test('parse (R-5b2): the messages of the class-name errors (drafts pending teacher review)', () => {
  const both = 'por orden alfabético (etil metil éter), o uno solo con «di» delante si los dos son iguales (dietil éter).';
  assert.equal(messageOf('éter'), `Delante de «éter» van los dos grupos unidos al oxígeno, ${both}`);
  assert.equal(messageOf('met il éter'), `Un éter lleva dos grupos unidos al oxígeno y tu nombre solo pone uno: escribe dos, ${both}`);
  assert.equal(messageOf('tri met il éter'), `Un éter lleva dos grupos unidos al oxígeno y tu nombre pone tres: escribe dos, ${both}`);
  assert.equal(messageOf('2 met il et il éter'), 'Esta ficha no puede ir aquí: en un nombre con «éter» no hay cadena principal que '
    + 'numerar: los grupos no llevan números delante (etil metil éter). Si un grupo lleva sus propias ramas, va en una rama '
    + 'compuesta, con sus números dentro: (2-cloroetil) metil éter.');
  assert.equal(parse(seq('met il et il di éter')).errors[0].message, 'Esta ficha no puede ir aquí: «di» va delante del grupo que se '
    + 'repite: di, et, il y éter dan dietil éter.');
  assert.equal(messageOf('cloro met il éter'), 'Esta ficha no puede ir aquí: «cloro» no es un grupo de carbonos: en un nombre con '
    + '«éter», el oxígeno lleva dos grupos de carbonos (etil metil éter). Si un grupo lleva «cloro», va en una rama compuesta: '
    + '(2-cloroetil) metil éter.');
  assert.equal(messageOf('met il oxi et il éter'), 'Esta ficha no puede ir aquí: en un nombre con «éter», el oxígeno ya lo dice '
    + '«éter»: los grupos acaban en «il», sin «oxi» (etil metil éter).');
  assert.equal(messageOf('met iliden met il éter'), 'Esta ficha no puede ir aquí: en un éter, cada grupo se une al oxígeno por un '
    + 'enlace sencillo, así que acaba en «il» (etil metil éter), no en «iliden».');
  assert.equal(messageOf('isopropiliden met il éter'), 'Esta ficha no puede ir aquí: en un éter, cada grupo se une al oxígeno por '
    + 'un enlace sencillo, así que acaba en «il» (etil metil éter), no en «isopropiliden».');
  assert.equal(messageOf('START et il éter END met ano'), 'Esta ficha no puede ir aquí: «éter» va al final del nombre, detrás de '
    + 'los dos grupos unidos al oxígeno (etil metil éter); dentro de una rama, el oxígeno se escribe con «oxi» (metoxi).');
  assert.equal(messageOf('et il met il éter et ano'), 'Estas fichas no pueden ir aquí: el nombre termina con «éter»; los dos '
    + 'grupos unidos al oxígeno van delante (etil metil éter).');
}); // End of test 'parse (R-5b2): the messages of the class-name errors…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------

/**
 * Class names the forward engine gives (design.md §2): [tile words, SMILES];
 * each assembles to exactly the engine's functional-class alternative.
 */
const FORMS = [
  ['di met il éter', 'COC'],
  ['et il met il éter', 'CCOC'],
  ['di et il éter', 'CCOCC'],
  ['met il prop il éter', 'CCCOC'],
  ['isopropil met il éter', 'CC(C)OC'],
  ['but il met il éter', 'CCCCOC'],
  ['et il isopropil éter', 'CCOC(C)C'],
  ['but il isopropil éter', 'CC(C)OCCCC'],
  ['di isopropil éter', 'CC(C)OC(C)C'],
  ['tert-butil met il éter', 'CC(C)(C)OC'],
  ['but il tert-butil éter', 'CC(C)(C)OCCCC'],
  ['hex il pent il éter', 'CCCCCOCCCCCC'],
  ['met il triacont il éter', `${'C'.repeat(30)}OC`],
];

test('assemble (R-5b2, rule 7): every class name the engine gives is exactly its text; tokenize reads it back', () => {
  for (const [words, smiles] of FORMS) {
    const name = text(words);
    assert.equal(name, engineClassName(smiles), words);
    assert.deepEqual(tokenize(name), seq(words), name);
  }
}); // End of test 'assemble (R-5b2, rule 7): every class name the engine gives…'

test('assemble (R-5b2): one test per rule — the spaces, a group enclosed as a prefix by itself, never for its level', () => {
  // The spaces: automatic punctuation pieces between the words; `éter` an ending.
  const { spans } = assemble(parse(seq('et il met il éter')).tree);
  assert.deepEqual(spans.map((s) => [s.tile, s.kind, s.to - s.from]),
    [[0, 'prefix', 2], [1, 'prefix', 2], [null, 'punct', 1], [2, 'prefix', 3], [3, 'prefix', 2], [null, 'punct', 1], [4, 'ending', 4]]);
  for (const [words, assembled] of [
    // Rule 5's hyphen before `tert-` (the engine writes `ditert-butil éter`: an open question, tested below).
    ['di tert-butil éter', 'di-tert-butil éter'],
    // A group enclosed exactly when rule 5 encloses it as a prefix by itself.
    ['START 2 cloro et il END met il éter', '(2-cloroetil) metil éter'],
    ['bis START 2 cloro et il END éter', 'bis(2-cloroetil) éter'],
    ['met il prop 2 il éter', 'metil (propan-2-il) éter'],
    ['prop 2 eno 1 il met il éter', '(prop-2-en-1-il) metil éter'],
    ['et eno il met il éter', 'etenil metil éter'],
    // Never for its level: a ring after the first group is no crowded ring prefix (`metil(ciclohexil)metano`).
    ['met il ciclo hex il éter', 'metil ciclohexil éter'],
    ['met il fenil éter', 'metil fenil éter'],
    // A compound branch without prefixes of its own needs no marks: its controls write nothing.
    ['START met il END met il éter', 'metil metil éter'],
    // Errors still assemble.
    ['éter', 'éter'],
    ['met il éter', 'metil éter'],
    ['met il et il 2 éter', 'metil etil 2-éter'],
    ['et il met il éter et ano', 'etil metil éteretano'],
  ]) {
    assert.equal(text(words), assembled, words);
  } // End of the loop over the rule cases
  // The engine's own form of the di-tert-butyl ether lacks rule 5's hyphen (naming/index.js etherClassAlternative()).
  assert.equal(engineClassName('CC(C)(C)OC(C)(C)C'), 'ditert-butil éter');
}); // End of test 'assemble (R-5b2): one test per rule…'

test('tokenize (R-5b2): class names with their spaces read back; texts no tiles write never read', () => {
  for (const name of ['(2-cloroetil) metil éter', 'bis(2-cloroetil) éter', 'metil (propan-2-il) éter', 'di-tert-butil éter',
    'metil etil éter', 'etil etil éter', 'bisetil éter', 'fenil metil éter', 'metil (metoximetil) éter']) {
    const ids = tokenize(name);
    assert.ok(ids, name);
    assert.equal(assemble(parse(ids).tree).text, name);
  }
  assert.deepEqual(tokenize('(2-cloroetil) metil éter'), seq('START 2 cloro et il END met il éter'));
  for (const name of ['etil  metil éter', 'etilmetil éter', 'etil metil-éter', 'etil metil éter ', ' etil metil éter', 'etil (metil) éter',
    'éter etil metil', 'etil éter metil', 'ditert-butil éter', 'etil metiléter', 'etil-metil éter', '(etil metil) éter']) {
    assert.equal(tokenize(name), null, name);
  }
}); // End of test 'tokenize (R-5b2)…'

// ---------------------------------------------------------------------------
// Interpreter, builder, search.
// ---------------------------------------------------------------------------

test('interpret (R-5b2): the oxygen is the parent, each group a prefix with an implicit slot at it', () => {
  const spec = specOf('et il met il éter');
  assert.deepEqual(spec.parent, { kind: 'ether', length: 1, double: [], triple: [], template: null, tiles: [4, 5] });
  assert.deepEqual(spec.classWord, { kind: 'ether', text: ETHER_CLASS_WORD, tiles: [4, 5] });
  assert.deepEqual(spec.prefixes.map((p) => [p.slots.map((s) => [s.kind, s.value, s.role, s.domain, s.tiles]), p.multiplier,
    p.substituent.kind, p.substituent.length, p.tiles]), [
    [[['implicit', 1, 'carbon', [1, 1], [0, 2]]], { count: 1, compound: false }, 'chain', 2, [0, 2]],
    [[['implicit', 1, 'carbon', [1, 1], [2, 4]]], { count: 1, compound: false }, 'chain', 1, [2, 4]],
  ]);
  assert.deepEqual([spec.suffix, spec.ester, spec.traditional, spec.oldStyle, spec.leftOut, spec.tiles], [null, null, null, false, [], [0, 5]]);
  // `di`: one prefix, two occurrences at the oxygen; `bis` likewise, compound.
  assert.deepEqual(specOf('di et il éter').prefixes.map((p) => [p.slots.length, p.multiplier]), [[2, { count: 2, compound: false }]]);
  assert.deepEqual(specOf('bis et il éter').prefixes.map((p) => p.multiplier), [{ count: 2, compound: true }]);
  // The oxygen counts as an atom, never as a carbon.
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [3, 4]);
  assert.deepEqual([specCarbons(specOf('tert-butil met il éter')), specAtoms(specOf('tert-butil met il éter'))], [5, 6]);
  // A left-out locant inside a compound group is the group's.
  assert.deepEqual(specOf('START cloro et il END met il éter').leftOut.map((s) => [s.role, s.domain, s.tiles]),
    [['carbon', [1, 2], [1, 2]]]);
}); // End of test 'interpret (R-5b2)…'

test('build (R-5b2): one oxygen bonded to both groups; the student\'s parent is that oxygen', () => {
  for (const [words, smiles] of FORMS) {
    const built = build(specOf(words));
    assert.ok(built.ok, words);
    assert.equal(aromaticKey(built.molecule), keyOf(smiles), words);
    const [oxygen] = built.studentParent.atoms;
    assert.deepEqual([built.studentParent.atoms.length, built.studentParent.bonds, built.molecule.atoms.get(oxygen).element],
      [1, [], 'O'], words);
    assert.ok(built.prefixAtoms.every((o) => o.parentAtom === oxygen), words);
    assert.equal(built.prefixAtoms.length, 2, words);
  } // End of the loop over the forms
  // Groups of every kind: a ring, `fenil`, a compound branch, an alkoxy inside a group.
  for (const [words, smiles] of [['ciclo hex il met il éter', 'COC1CCCCC1'], ['fenil met il éter', 'COC1=CC=CC=C1'],
    ['START 2 cloro et il END met il éter', 'ClCCOC'], ['met il START met il oxi met il END éter', 'COCOC'],
    ['et eno il met il éter', 'C=COC']]) {
    const spec = specOf(words);
    // `(metoximetil)`: its methoxy's one-carbon slot is left out, with one value.
    assert.equal(aromaticKey(build(spec, spec.leftOut.map((slot) => slot.domain[0])).molecule), keyOf(smiles), words);
  }
  // Structural errors keep their codes and tiles inside a group; the caps count the groups.
  assert.deepEqual(build(specOf('START 3 cloro et il END met il éter')).error, { code: 'LOCANT_RANGE',
    message: 'La rama de 2 carbonos va del 1 al 2: no hay carbono 3.', tiles: [1, 2] });
  assert.equal(build(specOf('START 1 1 di triacont il met il END met il éter')).error.code, 'TOO_BIG');
}); // End of test 'build (R-5b2)…'

test('search (R-5b2): only the left-out locants inside a group are searched; the oxygen\'s slots are implicit', () => {
  const plain = searchStructures(specOf('et il met il éter'), { namer: nameMolecule });
  assert.deepEqual([plain.status, plain.structures.length, plain.placements], ['complete', 1, 1]);
  const left = searchStructures(specOf('START cloro et il END met il éter'), { namer: nameMolecule });
  assert.deepEqual([left.status, left.structures.length], ['complete', 2]);
  assert.deepEqual(left.structures.map((s) => s.naming.name), ['1-cloro-1-metoxietano', '1-cloro-2-metoxietano']);
}); // End of test 'search (R-5b2)…'

// ---------------------------------------------------------------------------
// readName() verdicts.
// ---------------------------------------------------------------------------

/**
 * Worked class names (design.md §15.3): [tile words or text, verdict kind,
 * the engine's name, SMILES of the molecule described or null].
 */
const CASES = [
  // The engine's alternatives (the four of the brief first).
  ['etil metil éter', 'alternative', 'metoxietano', 'CCOC'],
  ['dietil éter', 'alternative', 'etoxietano', 'CCOCC'],
  ['tert-butil metil éter', 'alternative', '2-metil-2-metoxipropano', 'CC(C)(C)OC'],
  ['butil tert-butil éter', 'alternative', '1-tert-butoxibutano', 'CC(C)(C)OCCCC'],
  ['dimetil éter', 'alternative', 'metoximetano', 'COC'],
  ['diisopropil éter', 'alternative', '2-isopropoxipropano', 'CC(C)OC(C)C'],
  ['hexil pentil éter', 'alternative', '1-(pentiloxi)hexano', 'CCCCCOCCCCCC'],
  // Valid structures the engine names otherwise: order, grouping, multiplier, words, no class name for the molecule.
  ['metil etil éter', 'otherName', 'metoxietano', 'CCOC'],
  ['etil etil éter', 'otherName', 'etoxietano', 'CCOCC'],
  ['bisetil éter', 'otherName', 'etoxietano', 'CCOCC'],
  ['metil tert-butil éter', 'otherName', '2-metil-2-metoxipropano', 'CC(C)(C)OC'],
  ['tert-butil butil éter', 'otherName', '1-tert-butoxibutano', 'CC(C)(C)OCCCC'],
  ['metil (propan-2-il) éter', 'otherName', '2-metoxipropano', 'CC(C)OC'],
  ['(1-metiletil) metil éter', 'otherName', '2-metoxipropano', 'CC(C)OC'],
  ['metil (propan-1-il) éter', 'otherName', '1-metoxipropano', 'CCCOC'],
  ['di-tert-butil éter', 'otherName', '2-tert-butoxi-2-metilpropano', 'CC(C)(C)OC(C)(C)C'],
  ['etenil metil éter', 'otherName', 'metoxieteno', 'C=COC'],
  ['ciclohexil metil éter', 'otherName', 'metoxiciclohexano', 'COC1CCCCC1'],
  ['fenil metil éter', 'otherName', 'metoxibenceno', 'COC1=CC=CC=C1'],
  ['(2-cloroetil) metil éter', 'otherName', '1-cloro-2-metoxietano', 'ClCCOC'],
  ['bis(2-cloroetil) éter', 'otherName', '1-cloro-2-(2-cloroetoxi)etano', 'ClCCOCCCl'],
  ['(2-hidroxietil) metil éter', 'otherName', '2-metoxietan-1-ol', 'OCCOC'],
  ['metil (metoximetil) éter', 'otherName', 'dimetoximetano', 'COCOC'],
  ['(butan-2-il) metil éter', 'otherName', '2-metoxibutano', 'CCC(C)OC'],
  ['(2-metilpropil) metil éter', 'otherName', '2-metil-1-metoxipropano', 'CC(C)COC'],
  // The engine refuses the molecule: two rings; identical halves that carry the principal group.
  ['difenil éter', 'outOfScope', null, null],
  ['ciclohexil fenil éter', 'outOfScope', null, null],
  ['bis(2-hidroxietil) éter', 'outOfScope', null, null],
];

test('readName (R-5b2): class names — alternative, otherName, outOfScope — with the molecule each describes', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.text, name, name);
    if (smiles) {
      assert.equal(verdict.name, engine, name);
      assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
      assert.equal(verdict.draw, true, name);
    } else {
      assert.deepEqual([verdict.draw, verdict.naming.ok], [false, false], name); // The engine's refusal, nothing drawn.
    }
    if (kind === 'alternative') {
      assert.equal(verdict.text, name);
      assert.deepEqual([verdict.matched.style, verdict.matched.label, verdict.matched.name], ['functionalClass', CLASS_LABEL, name]);
      assert.equal(verdict.message, `¡Correcto! «${name}» es una forma válida (${CLASS_LABEL}). El nombre que doy primero es «${engine}».`);
    }
  } // End of the loop over the cases
  assert.match(read('difenil éter').message, /varios anillos/);
  assert.match(read('bis(2-hidroxietil) éter').message, /dos mitades iguales unidas por un oxígeno/);
}); // End of test 'readName (R-5b2): class names…'

test('readName (R-5b2): invalid, ambiguous and incomplete class names', () => {
  for (const [words, code] of [['éter', 'ETHER_GROUPS'], ['met il éter', 'ETHER_GROUPS'], ['cloro met il éter', 'TILE_ORDER'],
    ['START 3 cloro et il END met il éter', 'LOCANT_RANGE'], ['START di triacont il met il END met il éter', 'TOO_BIG']]) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.errors[0].code, verdict.draw], ['invalid', code, false], words);
  }
  // A left-out locant inside a group: two structures, listed by the engine's names (no class name has numbers).
  const ambiguous = read('START cloro et il END met il éter');
  assert.equal(ambiguous.kind, 'ambiguous');
  assert.equal(ambiguous.message, 'Faltan números: puede ser 1-cloro-1-metoxietano o 1-cloro-2-metoxietano.');
  assert.deepEqual(ambiguous.candidates.map((c) => aromaticKey(c.molecule)), [keyOf('CC(Cl)OC'), keyOf('ClCCOC')]);
  // A group with one place for its prefix is one structure: never `missingLocants`, the engine writes no such class name.
  assert.equal(read('START cloro met il END met il éter').kind, 'otherName');
  assert.equal(read('START cloro et il END met il éter', { budget: { placements: 1 } }).kind, 'incomplete');
}); // End of test 'readName (R-5b2): invalid, ambiguous and incomplete class names'

test('«Dibujar» (R-5b2): class-name verdicts have an ordered drawing; the verdict block shows the name with its spaces', () => {
  for (const name of ['etil metil éter', 'dietil éter', 'tert-butil metil éter', 'butil tert-butil éter', 'metil etil éter',
    'fenil metil éter', 'bis(2-cloroetil) éter']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
    const block = verdictBlock(verdict);
    assert.equal(block.student.map((part) => part.text).join(''), name);
    assert.ok(block.student.some((part) => part.text === ' ' && part.kind === 'punct'), name);
  }
  assert.equal(verdictBlock(read('dietil éter')).tone, 'correct');
}); // End of test '«Dibujar» (R-5b2)…'

test('dialog (R-5b2): `éter` has a tooltip that says where it goes', () => {
  assert.equal(TILE_HINTS[ETHER_CLASS_ID], 'Va al final, detrás de los dos grupos unidos al oxígeno, por orden alfabético: et, '
    + 'il, met, il y éter dan etil metil éter; con dos grupos iguales, di, et, il y éter dan dietil éter.');
}); // End of test 'dialog (R-5b2)…'

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

test('property (R-5b2): random class names — any groups, multipliers, locants or none, stray tiles — never crash', () => {
  const random = mulberry32(20261016);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const groups = ['met il', 'et il', 'prop il', 'but il', 'pent il', 'isopropil', 'tert-butil', 'fenil', 'ciclo hex il', 'et eno il',
    'prop 2 il', 'START 2 cloro et il END', 'START met il oxi met il END', 'START 2 hidroxi et il END', 'cloro', 'met il oxi',
    'met iliden', 'isopropiliden', '2 met il', 'di met il', 'bis et il', 'tri met il', ''];
  const tails = ['éter', 'éter', 'éter', 'éter et ano', '2 éter', 'di éter'];
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const words = [pick(groups), pick(groups), pick(tails)].filter(Boolean).join(' ');
    const verdict = readName(seq(words), { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, words);
    } else {
      assert.equal(verdict.molecule === null || verdict.kind === 'outOfScope', true, words);
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      assert.ok(!/undefined|null|NaN|\[object/.test(verdict.diagnosis.message), `${words}: ${verdict.diagnosis.message}`);
      assert.deepEqual(verdict.diagnosis.student, { atoms: [], bonds: [] }, `${words}: a class name has no chain`);
    }
  } // End of the loop over the random names
  for (const kind of ['alternative', 'otherName', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-5b2): random class names…'

test('time budget: class-name readName() calls, with their diagnosis, well within budget', () => {
  const names = ['etil metil éter', 'dietil éter', 'tert-butil metil éter', 'butil tert-butil éter', 'metil etil éter',
    'bis(2-cloroetil) éter', '(2-cloroetil) metil éter', 'metil (propan-2-il) éter'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
