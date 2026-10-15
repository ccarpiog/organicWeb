/**
 * @file Unit tests for the amines' functional-class names in «¿Cómo se
 * dibuja?» (src/reverse/, design.md §2 — the forward engine's alkylamine
 * names, naming/index.js amineClassName() —, §13.4 I-36, §15.3, §15.5, §15.8
 * R-6c; phase I-52c3, R-6c3): `metilamina`, `dimetilamina`, `trimetilamina`,
 * `etildimetilamina`, `di-tert-butilamina`, built from the groups on the
 * nitrogen and the «Grupos» row's `amina` tile, which right after the groups
 * is the class word (no tile of its own). Parser (the class-word parent,
 * every error with its tile range and message), assembler (rule 13: one word,
 * rule 5's hyphen before `tert-`, each group enclosed as a prefix by itself;
 * every engine class name assembled exactly), tokenizer (round trip; texts no
 * tiles write), interpreter and builder (the nitrogen as the parent, its
 * groups, VALENCE on a fourth), search (left-out locants inside a group),
 * readName() verdicts of every §15.3 kind with the molecule each describes
 * (compared by aromatic key with a SMILES), the class name's own mistakes —
 * deliberate nulls of diagnose.js «Amines» until phase I-52c4, each with its
 * category read independently —, the fixture round trip, the closed loop
 * over the oracle's amine generators, the mutation sweeps, the ordered
 * drawing, the dialog's tooltip, a property test and a time budget.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName, VERDICT_TEXTS } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble, isClassName, isAmineClassName, itemText } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms, specCarbons } from '../../src/reverse/build.js';
import { searchStructures } from '../../src/reverse/search.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { AMINA_ID, isAmineClassWord, tileById } from '../../src/reverse/tiles.js';
import { verdictLayout, verdictBlock } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { GROUP_SUFFIXES, styleLabel, multiplier } from '../../src/naming/lexicon.es.js';
import {
  generateAmines, generateRingPrincipalBenzenes, generateRingPolysuffixBenzenes, generateRingSubstituents,
} from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, isAmine, isAmineMolecule, isAmineClassName as isClassText } from './reverse-words.js';

/** Time budget of one representative class-name readName() call, in milliseconds. */
const PER_NAME_BUDGET_MS = 250;

/** The label of the engine's alkylamine alternative (lexicon styleLabel()). */
const CLASS_LABEL = styleLabel('amineClass');

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
    ids = tokenize(name); // A name text: `di-tert-butilamina`.
  }
  assert.ok(ids, `no tiles for ${name}`);
  return ids;
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
 * The errors of a parse of tile words as `CODE[from,to)` strings.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string[]} The errors.
 */
function errorsOf(words) {
  return parse(seq(words)).errors.map((e) => `${e.code}[${e.from},${e.to})`);
}

/**
 * The first parse error's message.
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
 * The engine's alkylamine name of a SMILES molecule (its `amineClass`
 * alternative), or null.
 *
 * @param {string} smiles - A SMILES.
 * @returns {string|null} The name.
 */
function engineClassName(smiles) {
  const alt = nameMolecule(parseSmiles(smiles)).alternatives.find((a) => a.style === 'amineClass');
  return alt ? alt.name : null;
}

/**
 * The words of a group of a class name's tree as the student wrote them:
 * the group's text without its multiplier and its outer marks.
 *
 * @param {object} tree - A parse() tree of a class name.
 * @param {object} item - One of its groups (a prefix node).
 * @returns {string} The words.
 */
function groupWords(tree, item) {
  const words = itemText(tree, { ...item, locants: [], letter: null, multiplier: null });
  return /^[([{].*[)\]}]$/.test(words) ? words.slice(1, -1) : words;
}

/**
 * The category of an amine class name's own mistake (the deliberate nulls
 * of diagnose.js «Amines», phase I-52c4), read from the student's tree and
 * the engine's naming, independently of diagnose.js: `none` (the engine
 * gives the molecule no class name), `words` (the student's group words are
 * not the engine's), `multiplier` (a repeated group written twice, or with
 * `bis`, `tris`), `order` (the groups out of the engine's order).
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {'none'|'words'|'multiplier'|'order'} The category.
 */
function classCategory(ids, verdict) {
  const offered = verdict.naming.alternatives.find((alt) => alt.style === 'amineClass');
  if (!offered) {
    return 'none';
  }
  const { tree } = parse(ids);
  const words = tree.items.flatMap((item) => Array.from({ length: item.multiplier === null ? 1 : tree.tiles[item.multiplier].value },
    () => groupWords(tree, item)));
  const letters = (w) => w.replace(/^tert-/, '');
  const sorted = [...words].sort((x, y) => (letters(x) === letters(y) ? x.length - y.length : letters(x).localeCompare(letters(y))));
  const distinct = [...new Set(sorted)];
  const rebuilt = distinct.map((w) => {
    const n = sorted.filter((v) => v === w).length;
    const mult = n > 1 ? multiplier(n) : '';
    return mult && w.startsWith('tert-') ? `${mult}-${w}` : `${mult}${w}`;
  }).join('') + GROUP_SUFFIXES.amine;
  if (rebuilt !== offered.name) {
    return 'words';
  }
  const repeated = tree.items.some((item) => item.multiplier !== null && tree.tiles[item.multiplier].kind === 'cmult')
    || new Set(tree.items.map((item) => groupWords(tree, item))).size < tree.items.length;
  return repeated ? 'multiplier' : 'order';
} // End of function classCategory()

// ---------------------------------------------------------------------------
// Parser, assembler, tokenizer.
// ---------------------------------------------------------------------------

test('parse (R-6c3): the `amina` tile right after the groups is the class word; the name-level prefixes are its groups', () => {
  const { tree, errors } = parse(seq('et il di met il amina'));
  assert.deepEqual(errors, []);
  assert.deepEqual([tree.parent.chain, tree.parent.suffix, tree.items.length], [{ type: 'classWord', tile: 5, range: [5, 6] }, null, 2]);
  assert.ok(isClassName(tree) && isAmineClassName(tree));
  assert.ok(isAmineClassWord(tileById(AMINA_ID)));
  // The same tile after a parent's ending is the suffix (R-6c1); alone, it is out of place.
  const suffix = parse(seq('et ano amina')).tree;
  assert.deepEqual([suffix.parent.chain.type, suffix.parent.suffix.tile, isAmineClassName(suffix)], ['chain', 2, false]);
  assert.deepEqual(errorsOf('amina'), ['TILE_ORDER[0,1)', 'NO_PARENT[0,1)']);
  // An ether's class name keeps its word: no amine there.
  const ether = parse(seq('et il met il éter')).tree;
  assert.ok(isClassName(ether) && !isAmineClassName(ether));
  // Groups of every kind a carbon branch has: a ring, `fenil`, `isopropil`, `tert-butil`, a compound branch.
  for (const words of ['ciclo hex il amina', 'fenil met il amina', 'isopropil amina', 'di tert-butil amina', 'START 2 cloro et il END amina',
    'tetra met il amina', 'bis met il amina']) {
    assert.deepEqual(errorsOf(words), [], words);
  }
}); // End of test 'parse (R-6c3): the `amina` tile…'

test('parse (R-6c3): class-name errors, each with its tile range and message (drafts pending teacher review)', () => {
  const cases = [
    // A locant, `N` or a letter on a group, or before the class word.
    ['2 met il amina', 'TILE_ORDER[0,1)'], ['N met il amina', 'TILE_ORDER[0,1)'], ['o met il amina', 'TILE_ORDER[0,1)'],
    ['met il 2 amina', 'TILE_ORDER[2,3)'], ['met il N amina', 'TILE_ORDER[2,3)'],
    // A multiplier before `amina`; tiles after it.
    ['met il di amina', 'TILE_ORDER[2,3)'], ['met il amina met', 'TILE_ORDER[3,4)'], ['met il amina et ano', 'TILE_ORDER[3,5)'],
    // No carbon group bonded by a single bond: a one-atom group, an alkoxy group, `ciano`, `carboxi`, `amino`, an acyl group, `iliden`.
    ['cloro met il amina', 'TILE_ORDER[0,1)'], ['hidroxi met il amina', 'TILE_ORDER[0,1)'], ['met il oxi met il amina', 'TILE_ORDER[2,3)'],
    ['ciano met il amina', 'TILE_ORDER[0,1)'], ['carboxi met il amina', 'TILE_ORDER[0,1)'], ['amino met il amina', 'TILE_ORDER[0,1)'],
    ['acetil met il amina', 'TILE_ORDER[0,1)'], ['formil met il amina', 'TILE_ORDER[0,1)'], ['prop ano oil met il amina', 'TILE_ORDER[2,3)'],
    ['met iliden amina', 'TILE_ORDER[1,2)'], ['isopropiliden amina', 'TILE_ORDER[0,1)'],
    // `N` inside a compound group: no `N` in a class name.
    ['START N met il et il END amina', 'TILE_ORDER[1,2)'],
  ];
  for (const [words, error] of cases) {
    assert.deepEqual(errorsOf(words), [error], words);
  }
  const lead = 'Esta ficha no puede ir aquí: ';
  const locant = `${lead}en un nombre como «dimetilamina» no hay cadena principal que numerar: los grupos unidos al nitrógeno van `
    + 'delante de «amina», sin números ni «N» (etilmetilamina).';
  assert.equal(messageOf('N met il amina'), locant);
  assert.equal(messageOf('met il 2 amina'), locant);
  assert.equal(messageOf('met il di amina'), `${lead}«di», «tri»… van delante del grupo que se repite: di, met, il y amina dan `
    + 'dimetilamina.');
  assert.equal(messageOf('met il amina met'), `${lead}el nombre termina con «amina»; los grupos unidos al nitrógeno van delante `
    + '(etilmetilamina).');
  assert.equal(messageOf('cloro met il amina'), `${lead}«cloro» no va en un nombre como «metilamina»: delante de «amina» solo van los `
    + 'grupos de carbonos unidos al nitrógeno, acabados en «il» (etilmetilamina).');
  assert.equal(messageOf('met il oxi met il amina'), `${lead}«oxi» no va en un nombre como «metilamina»: delante de «amina» solo van `
    + 'los grupos de carbonos unidos al nitrógeno, acabados en «il» (etilmetilamina).');
  assert.equal(messageOf('acetil met il amina'), `${lead}«acetil» no va unido al nitrógeno de una amina: un grupo C=O unido al `
    + 'nitrógeno no forma una amina, sino una amida.');
  assert.equal(messageOf('met iliden amina'), `${lead}en un nombre como «metilamina», cada grupo se une al nitrógeno por un enlace `
    + 'sencillo, así que acaba en «il» (etilmetilamina), no en «iliden».');
}); // End of test 'parse (R-6c3): class-name errors…'

/**
 * Every class name of the brief, and the engine's other forms: [tile words,
 * SMILES]; each assembles to the engine's own `amineClass` alternative.
 */
const FORMS = [
  ['met il amina', 'CN'], ['di met il amina', 'CNC'], ['tri met il amina', 'CN(C)C'], ['et il di met il amina', 'CCN(C)C'],
  ['et il met il amina', 'CCNC'], ['et il amina', 'CCN'], ['isopropil amina', 'CC(C)N'], ['tert-butil amina', 'CC(C)(C)N'],
  ['di tert-butil amina', 'CC(C)(C)NC(C)(C)C'], ['but il tert-butil amina', 'CCCCNC(C)(C)C'], ['tri et il amina', 'CCN(CC)CC'],
  ['et il met il prop il amina', 'CCCN(C)CC'], ['di isopropil amina', 'CC(C)NC(C)C'], ['tri isopropil amina', 'CC(C)N(C(C)C)C(C)C'],
  ['tri tert-butil amina', 'CC(C)(C)N(C(C)(C)C)C(C)(C)C'], ['tert-butil met il amina', 'CC(C)(C)NC'],
  ['tert-butil isopropil met il amina', 'CN(C(C)C)C(C)(C)C'], ['dodec il amina', 'CCCCCCCCCCCCN'],
];

test('assemble (R-6c3, rule 13): every class name the engine gives is exactly its text, in one word; tokenize reads it back', () => {
  const texts = [];
  for (const [words, smiles] of FORMS) {
    const assembled = text(words);
    assert.equal(assembled, engineClassName(smiles), words);
    assert.deepEqual(tokenize(assembled), seq(words), assembled);
    texts.push(assembled);
  }
  assert.deepEqual(texts.slice(0, 4), ['metilamina', 'dimetilamina', 'trimetilamina', 'etildimetilamina']);
  // Rule 5's hyphen between a multiplier and `tert-`; none between two groups, as the engine writes them.
  assert.deepEqual([texts[8], texts[9], texts[14], texts[16]], ['di-tert-butilamina', 'butiltert-butilamina', 'tri-tert-butilamina',
    'tert-butilisopropilmetilamina']);
}); // End of test 'assemble (R-6c3, rule 13)…'

test('assemble (R-6c3): a group enclosed as a prefix by itself, never for its level; no space', () => {
  assert.equal(text('prop ano 2 il amina'), '(propan-2-il)amina');
  assert.equal(text('START 2 cloro et il END met il amina'), '(2-cloroetil)metilamina');
  assert.equal(text('met il ciclo hex il amina'), 'metilciclohexilamina');
  assert.equal(text('bis START 2 cloro et il END amina'), 'bis(2-cloroetil)amina');
  assert.equal(text('met il et eno il amina'), 'metiletenilamina');
  // Spans: the class word is an ending, as the suffix is.
  const { spans } = assemble(parse(seq('di met il amina')).tree);
  assert.deepEqual(spans.map((span) => span.kind), ['multiplier', 'prefix', 'prefix', 'ending']);
}); // End of test 'assemble (R-6c3): a group enclosed…'

test('tokenize (R-6c3): class names read back; texts no tiles write never read', () => {
  for (const name of ['metilamina', 'dimetilamina', '(propan-2-il)amina', '(2-cloroetil)metilamina', 'metiletilamina', 'fenilamina',
    'ciclohexilamina', 'bis(2-cloroetil)amina']) {
    const ids = tokenize(name);
    assert.ok(ids, name);
    assert.equal(assemble(parse(ids).tree).text, name);
  }
  for (const name of ['metil amina', 'metil-amina', 'N-metilamina', '2-metilamina', '(metil)amina', 'metilaminametil', 'aminametil',
    'metildiamina']) {
    assert.equal(tokenize(name), null, name);
  }
}); // End of test 'tokenize (R-6c3)…'

test('tokenize (R-6c3, review fix): a class name with two readings is ambiguous; each tile sequence reads as its own molecule', () => {
  // Three decyl groups (the engine's class name of N(C10)3) and one tridecyl group write the same text.
  const cases = [['tri dec il amina', 'N(CCCCCCCCCC)(CCCCCCCCCC)CCCCCCCCCC'], ['tridec il amina', 'CCCCCCCCCCCCCN']];
  for (const [words, smiles] of cases) {
    assert.equal(text(words), 'tridecilamina', words);
    assert.equal(engineClassName(smiles), 'tridecilamina', smiles);
    const verdict = read(words);
    assert.equal(verdict.kind, 'alternative', `${words}: ${verdict.message}`);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${words} describes another graph`);
  } // End of the loop over the two readings
  assert.equal(tokenize('tridecilamina'), null);
  assert.deepEqual(tokenize('decilamina'), seq('dec il amina'));
}); // End of test 'tokenize (R-6c3, review fix)…'

// ---------------------------------------------------------------------------
// Interpreter, builder, search.
// ---------------------------------------------------------------------------

test('interpret (R-6c3): the nitrogen is the parent, each group a prefix with an implicit slot at it; no suffix, no `N`', () => {
  const spec = specOf('et il di met il amina');
  assert.deepEqual(spec.parent, { kind: 'amine', length: 1, double: [], triple: [], template: null, tiles: [5, 6] });
  assert.deepEqual(spec.classWord, { kind: 'amine', text: GROUP_SUFFIXES.amine, tiles: [5, 6] });
  assert.deepEqual(spec.prefixes.map((p) => [p.slots.map((s) => [s.kind, s.value, s.role, s.domain, s.tiles, Boolean(s.nitrogen)]),
    p.multiplier, p.substituent.kind, p.substituent.length, p.tiles]), [
    [[['implicit', 1, 'carbon', [1, 1], [0, 2], false]], { count: 1, compound: false }, 'chain', 2, [0, 2]],
    [[['implicit', 1, 'carbon', [1, 1], [2, 5], false], ['implicit', 1, 'carbon', [1, 1], [2, 5], false]],
      { count: 2, compound: false }, 'chain', 1, [2, 5]],
  ]);
  assert.deepEqual([spec.suffix, spec.ester, spec.traditional, spec.oldStyle, spec.leftOut, spec.tiles], [null, null, null, false, [], [0, 6]]);
  // The nitrogen counts as an atom, never as a carbon.
  assert.deepEqual([specCarbons(spec), specAtoms(spec)], [4, 5]);
  assert.deepEqual([specCarbons(specOf('tri tert-butil amina')), specAtoms(specOf('tri tert-butil amina'))], [12, 13]);
  // A left-out locant inside a compound group is the group's.
  assert.deepEqual(specOf('START cloro et il END met il amina').leftOut.map((s) => [s.role, s.domain, s.tiles]),
    [['carbon', [1, 2], [1, 2]]]);
}); // End of test 'interpret (R-6c3)…'

test('build (R-6c3): one nitrogen bonded to every group, the student\'s parent; VALENCE on a fourth group', () => {
  for (const [words, smiles] of FORMS) {
    const built = build(specOf(words));
    assert.ok(built.ok, words);
    assert.equal(aromaticKey(built.molecule), keyOf(smiles), words);
    const [nitrogen] = built.studentParent.atoms;
    assert.deepEqual([built.studentParent.atoms.length, built.studentParent.bonds, built.molecule.atoms.get(nitrogen).element],
      [1, [], 'N'], words);
    assert.ok(built.prefixAtoms.every((o) => o.parentAtom === nitrogen), words);
  } // End of the loop over the forms
  // Groups of every kind: a ring, `fenil`, a compound branch.
  for (const [words, smiles] of [['ciclo hex il met il amina', 'CNC1CCCCC1'], ['fenil amina', 'NC1=CC=CC=C1'],
    ['START 2 cloro et il END met il amina', 'ClCCNC'], ['et eno il amina', 'C=CN']]) {
    const spec = specOf(words);
    // `etenil`: its double bond's one-value slot is left out.
    assert.equal(aromaticKey(build(spec, spec.leftOut.map((slot) => slot.domain[0])).molecule), keyOf(smiles), words);
  }
  assert.deepEqual(build(specOf('tetra met il amina')).error, { code: 'VALENCE',
    message: 'El nitrógeno de la amina tendría 4 enlaces, y un nitrógeno solo puede tener 3.', tiles: [0, 3] });
  assert.deepEqual(build(specOf('di met il di et il amina')).error.tiles, [3, 6]);
  assert.deepEqual(build(specOf('START 3 cloro et il END met il amina')).error, { code: 'LOCANT_RANGE',
    message: 'La rama de 2 carbonos va del 1 al 2: no hay carbono 3.', tiles: [1, 2] });
}); // End of test 'build (R-6c3)…'

test('search (R-6c3): only the left-out locants inside a group are searched; the nitrogen\'s slots are implicit', () => {
  const plain = searchStructures(specOf('et il met il amina'), { namer: nameMolecule });
  assert.deepEqual([plain.status, plain.structures.length, plain.placements], ['complete', 1, 1]);
  const left = searchStructures(specOf('START cloro et il END met il amina'), { namer: nameMolecule });
  assert.deepEqual([left.status, left.structures.length], ['complete', 2]);
  assert.deepEqual(left.structures.map((s) => s.naming.name), ['1-cloro-N-metiletan-1-amina', '2-cloro-N-metiletan-1-amina']);
}); // End of test 'search (R-6c3)…'

// ---------------------------------------------------------------------------
// readName() verdicts, the deliberate nulls.
// ---------------------------------------------------------------------------

/**
 * Worked class names (design.md §15.3): [tile words or text, verdict kind,
 * the engine's name, SMILES of the molecule described or null].
 */
const CASES = [
  // The engine's alternatives.
  ['metilamina', 'alternative', 'metanamina', 'CN'],
  ['dimetilamina', 'alternative', 'N-metilmetanamina', 'CNC'],
  ['trimetilamina', 'alternative', 'N,N-dimetilmetanamina', 'CN(C)C'],
  ['etildimetilamina', 'alternative', 'N,N-dimetiletanamina', 'CCN(C)C'],
  ['etilmetilamina', 'alternative', 'N-metiletanamina', 'CCNC'],
  ['isopropilamina', 'alternative', 'propan-2-amina', 'CC(C)N'],
  ['di-tert-butilamina', 'alternative', 'N-tert-butil-2-metilpropan-2-amina', 'CC(C)(C)NC(C)(C)C'],
  ['butiltert-butilamina', 'alternative', 'N-tert-butilbutan-1-amina', 'CCCCNC(C)(C)C'],
  ['diisopropilamina', 'alternative', 'N-isopropilpropan-2-amina', 'CC(C)NC(C)C'],
  // Multipliers left out of the order: `dimetilpropilamina` («metil» before «propil»).
  ['dimetilpropilamina', 'alternative', 'N,N-dimetilpropan-1-amina', 'CCCN(C)C'],
  // Other class names: the molecule described, named by the app (their diagnosis a deliberate null, below).
  ['metiletilamina', 'otherName', 'N-metiletanamina', 'CCNC'],
  ['metilmetilamina', 'otherName', 'N-metilmetanamina', 'CNC'],
  ['bis met il amina', 'otherName', 'N-metilmetanamina', 'CNC'],
  ['(propan-2-il)amina', 'otherName', 'propan-2-amina', 'CC(C)N'],
  ['ciclohexilamina', 'otherName', 'ciclohexanamina', 'NC1CCCCC1'],
  ['fenilamina', 'otherName', 'bencenamina', 'NC1=CC=CC=C1'],
  ['etenilamina', 'otherName', 'etenamina', 'C=CN'],
  ['(2-cloroetil)metilamina', 'otherName', '2-cloro-N-metiletan-1-amina', 'ClCCNC'],
  ['propildimetilamina', 'otherName', 'N,N-dimetilpropan-1-amina', 'CCCN(C)C'],
  // Two rings on the nitrogen: the engine's refusal.
  ['difenilamina', 'outOfScope', null, null],
  ['ciclohexilfenilamina', 'outOfScope', null, null],
];

test('readName (R-6c3): class names — alternative, otherName, outOfScope — with the molecule each describes', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    if (kind === 'outOfScope') {
      assert.ok(verdict.message.startsWith('Entiendo tu nombre'), name);
      continue;
    }
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} describes another graph`);
    assert.equal(verdict.draw, true, name);
    if (kind === 'alternative') {
      assert.deepEqual([verdict.matched.style, verdict.matched.label, verdict.matched.name], ['amineClass', CLASS_LABEL, verdict.text]);
      assert.equal(verdict.message, `${VERDICT_TEXTS.correct} «${verdict.text}» es una forma válida (${CLASS_LABEL}). `
        + `El nombre que doy primero es «${engine}».`);
    }
  } // End of the loop over the cases
  // The substitutive names stay `correct`; as an ether's class name, the alkylamine name is not announced (index.js
  // TRADITIONAL_STYLES: `traditional` only), so `bencenamina` announces `anilina` but `metanamina` says nothing more.
  assert.equal(read('metanamina').message, VERDICT_TEXTS.correct);
}); // End of test 'readName (R-6c3): class names…'

test('readName (R-6c3): invalid, ambiguous and incomplete class names', () => {
  const four = read('tetra met il amina');
  assert.deepEqual([four.kind, four.errors.map((e) => [e.code, e.from, e.to])], ['invalid', [['VALENCE', 0, 3]]]);
  assert.equal(read('N met il amina').kind, 'invalid');
  const left = read('START cloro et il END met il amina');
  assert.deepEqual([left.kind, left.candidates.map((c) => c.name)], ['ambiguous', ['1-cloro-N-metiletan-1-amina',
    '2-cloro-N-metiletan-1-amina']]);
  assert.equal(read('START cloro et il END met il amina', { budget: { placements: 1 } }).kind, 'incomplete');
}); // End of test 'readName (R-6c3): invalid, ambiguous and incomplete class names'

/**
 * The class name's own mistakes (deliberate «Amines» nulls until phase
 * I-52c4): [tile words or text, category].
 */
const NULLS = [
  ['metiletilamina', 'order'], ['propilmetilamina', 'order'], ['metilisopropilamina', 'order'], ['met il tert-butil amina', 'order'],
  ['metilmetilamina', 'multiplier'], ['bis met il amina', 'multiplier'], ['etilmetilmetilamina', 'multiplier'],
  ['propildimetilamina', 'order'],
  ['tris met il amina', 'multiplier'],
  ['(propan-2-il)amina', 'words'], ['(1-metiletil)amina', 'words'], ['START 2 met il prop ano 2 il END amina', 'words'],
  ['ciclohexilamina', 'none'], ['fenilamina', 'none'], ['etenilamina', 'none'], ['(2-cloroetil)metilamina', 'none'],
  ['(2-metilpropil)amina', 'none'], ['metilciclohexilamina', 'none'],
];

test('the class name\'s own mistakes: deliberate «Amines» nulls (phase I-52c4), each with its category read independently', () => {
  const seen = new Set();
  for (const [name, category] of NULLS) {
    const ids = idsOf(name);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${name}: ${verdict.message}`);
    assert.equal(classCategory(ids, verdict), category, name);
    assert.equal(verdict.diagnosis, null, `${name}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(verdict.draw && verdict.molecule, name);
    seen.add(category);
  } // End of the loop over the nulls
  assert.deepEqual([...seen].sort(), ['multiplier', 'none', 'order', 'words']);
}); // End of test 'the class name\'s own mistakes…'

// ---------------------------------------------------------------------------
// Fixture round trip, closed loop, sweeps.
// ---------------------------------------------------------------------------

test('fixture round trip (R-6c3): every class name of the fixtures reads back as the engine\'s alternative, the same graph', async () => {
  const rows = (await readFixtures()).filter((row) => isAmine(row.smiles));
  const covered = [];
  for (const row of rows) {
    for (const name of row.names.filter(isClassText)) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      assert.equal(assemble(parse(ids).tree).text, name, `names.tsv:${row.line}: assembly`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, 'alternative', `names.tsv:${row.line}: ${verdict.message}`);
      assert.equal(verdict.matched.style, 'amineClass');
      assert.equal(verdict.name, row.names[0]);
      assert.equal(aromaticKey(verdict.molecule), keyOf(row.smiles), `names.tsv:${row.line}: ${name}`);
      covered.push(name);
    }
  } // End of the loop over the fixture rows
  // The 17 names reverse-amines.test.js counted as later until phase I-52c3 (with `bencilamina`, a template).
  assert.deepEqual(covered, ['metilamina', 'etilamina', 'propilamina', 'isopropilamina', 'butilamina', 'tert-butilamina',
    'dimetilamina', 'etilmetilamina', 'dietilamina', 'trimetilamina', 'trietilamina', 'etilmetilpropilamina', 'isopropilpropilamina',
    'diisopropilamina', 'etilisopropilmetilamina', 'di-tert-butilamina', 'butiletilisopropilamina']);
}); // End of test 'fixture round trip (R-6c3)…'

/** The closed loop's generators (scripts/oracle/generate.mjs), the seeds of reverse-amines.test.js. */
const GENERATED = Object.freeze({
  amines: Object.freeze({ count: 600, seed: 6301, maxSize: 12 }),
  principal: Object.freeze({ count: 400, seed: 6302, minSize: 6, maxSize: 12 }),
  polysuffix: Object.freeze({ count: 300, seed: 6303, minSize: 6, maxSize: 12 }),
  ringSubstituents: Object.freeze({ count: 400, seed: 6304, maxSize: 12 }),
});

/**
 * The class names of the generators' amines (distinct by aromatic key,
 * named by the engine), with each molecule's naming and key.
 *
 * @returns {{name: string, naming: object, key: string}[]} The names.
 */
function generatedClassNames() {
  const seen = new Set();
  const out = [];
  const all = [...generateAmines(GENERATED.amines), ...generateRingPrincipalBenzenes(GENERATED.principal),
    ...generateRingPolysuffixBenzenes(GENERATED.polysuffix), ...generateRingSubstituents(GENERATED.ringSubstituents)];
  for (const mol of all.filter(isAmineMolecule)) {
    const key = aromaticKey(mol);
    const naming = nameMolecule(mol);
    if (seen.has(key) || !naming.ok) {
      continue;
    }
    seen.add(key);
    naming.alternatives.filter((alt) => alt.style === 'amineClass').forEach((alt) => out.push({ name: alt.name, naming, key }));
  }
  return out;
} // End of function generatedClassNames()

test('closed loop (R-6c3): the generators\' class names read back as the engine\'s alternatives, the same graph', () => {
  const names = generatedClassNames();
  for (const { name, naming, key } of names) {
    assert.ok(isClassText(name), name);
    const verdict = readName(idsOf(name));
    assert.equal(verdict.kind, 'alternative', `${name}: ${verdict.message}`);
    assert.equal(verdict.name, naming.name, name);
    assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
  }
  // The seeds give 22 (reverse-amines.test.js counted them as later until phase I-52c3), groups one to three.
  assert.equal(names.length, 22);
  assert.ok(names.some(({ name }) => name.startsWith(multiplier(3))) && names.some(({ name }) => name === 'metilamina'));
}); // End of test 'closed loop (R-6c3)…'

/**
 * The mutations of one class name: the groups in the reverse order
 * (`reversed`), a multiplied group written once per occurrence (`split`) or
 * with the compound multiplier (`compound`), `isopropil` written
 * `propan-2-il` (`pin`).
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations (none equal to the name).
 */
function mutationsOf(ids) {
  const { tree } = parse(ids);
  const out = [];
  const word = ids.slice(tree.parent.range[0]);
  const groups = tree.items.map((item) => ids.slice(item.range[0], item.range[1]));
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
  if (groups.length > 1) {
    push('reversed', [...[...groups].reverse().flat(), ...word]);
  }
  tree.items.forEach((item, k) => {
    if (item.multiplier === null) {
      return;
    }
    const count = tree.tiles[item.multiplier].value;
    const bare = ids.slice(item.multiplier + 1, item.range[1]);
    const split = groups.map((g, j) => (j === k ? Array.from({ length: count }, () => bare).flat() : g)).flat();
    push('split', [...split, ...word]);
    const compound = groups.map((g, j) => (j === k ? [`cmult-${count}`, ...bare] : g)).flat();
    push('compound', [...compound, ...word]);
  });
  const isopropyl = 'retained-isopropyl';
  if (ids.includes(isopropyl)) {
    push('pin', ids.flatMap((id) => (id === isopropyl ? seq('prop ano 2 il') : [id])));
  }
  return out;
} // End of function mutationsOf()

/** The category each mutation family gives (classCategory()). */
const FAMILY_CATEGORY = Object.freeze({ reversed: 'order', split: 'multiplier', compound: 'multiplier', pin: 'words' });

/**
 * Reads every mutation of some class names: every one is `otherName` with
 * a deliberate null diagnosis (diagnose.js «Amines», phase I-52c4) whose
 * category is its family's.
 *
 * @param {string[]} names - Class names.
 * @returns {Object<string, number>} The mutations by family.
 */
function sweep(names) {
  const counts = Object.fromEntries(Object.keys(FAMILY_CATEGORY).map((family) => [family, 0]));
  for (const name of names) {
    for (const mutation of mutationsOf(idsOf(name))) {
      const verdict = readName(mutation.ids);
      const label = `${name} → ${mutation.family} ${verdict.text}`;
      assert.equal(verdict.kind, 'otherName', `${label}: ${verdict.message}`);
      assert.equal(verdict.diagnosis, null, `${label}: ${verdict.diagnosis && verdict.diagnosis.message}`);
      assert.equal(classCategory(mutation.ids, verdict), FAMILY_CATEGORY[mutation.family], label);
      counts[mutation.family] += 1;
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return counts;
} // End of function sweep()

test('mutations of the class names: otherName, a deliberate «Amines» null of the family\'s category', async () => {
  const fixture = (await readFixtures()).filter((row) => isAmine(row.smiles)).flatMap((row) => row.names).filter(isClassText);
  assert.deepEqual(sweep(fixture), { reversed: 5, split: 6, compound: 6, pin: 5 });
  assert.deepEqual(sweep(generatedClassNames().map(({ name }) => name)), { reversed: 15, split: 6, compound: 6, pin: 5 });
}); // End of test 'mutations of the class names…'

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-6c3): class-name verdicts have an ordered drawing; the verdict block shows the name in one word', () => {
  for (const name of ['metilamina', 'dimetilamina', 'trimetilamina', 'etildimetilamina', 'di-tert-butilamina', 'metiletilamina',
    'fenilamina', '(2-cloroetil)metilamina']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
    const block = verdictBlock(verdict);
    assert.equal(block.student.map((part) => part.text).join(''), name);
    assert.ok(!block.student.some((part) => part.text === ' '), name);
  }
  assert.equal(verdictBlock(read('dimetilamina')).tone, 'correct');
}); // End of test '«Dibujar» (R-6c3)…'

test('dialog (R-6c3): the `amina` tooltip also says it ends a class name', () => {
  assert.match(TILE_HINTS[AMINA_ID], /También va justo detrás de los grupos unidos al nitrógeno, sin números: met, il y amina dan metilamina; di, met, il y amina, dimetilamina\.$/);
}); // End of test 'dialog (R-6c3)…'

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

test('property (R-6c3): random class names — any groups, multipliers, locants or none, stray tiles — never crash', () => {
  const random = mulberry32(20261015);
  const pick = (list) => list[Math.floor(random() * list.length)];
  const groups = ['met il', 'et il', 'prop il', 'but il', 'isopropil', 'tert-butil', 'fenil', 'ciclo hex il', 'et eno il', 'prop 2 il',
    'START 2 cloro et il END', 'START cloro et il END', 'cloro', 'met il oxi', 'met iliden', 'acetil', 'amino', 'ciano', 'N met il',
    '2 met il', 'di met il', 'bis et il', 'tri met il', 'di tert-butil', ''];
  const tails = ['amina', 'amina', 'amina', 'amina met', '2 amina', 'di amina', 'N amina', 'éter'];
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const words = [pick(groups), pick(groups), pick(tails)].filter(Boolean).join(' ');
    const ids = seq(words);
    const verdict = readName(ids, { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, words);
    }
    if (verdict.kind === 'invalid') {
      assert.ok(verdict.errors.every((e) => e.from <= e.to && e.to <= ids.length && !/undefined|null|NaN|\[object/.test(e.message)),
        words);
    }
    if (verdict.kind === 'otherName' && isAmineClassName(parse(ids).tree)) {
      assert.equal(verdict.diagnosis, null, `${words}: a class name's mistake is a deliberate null`);
    }
  } // End of the loop over the random names
  for (const kind of ['alternative', 'otherName', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6c3): random class names…'

test('time budget: class-name readName() calls well within budget', () => {
  const names = ['metilamina', 'trimetilamina', 'di-tert-butilamina', 'tert-butilisopropilmetilamina', 'metiletilamina',
    '(2-cloroetil)metilamina', '(cloroetil)metilamina', 'bis(2-cloroetil)amina'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
