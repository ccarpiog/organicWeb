/**
 * @file Unit tests for the amines in «¿Cómo se dibuja?» (src/reverse/,
 * design.md §15.5.2, §15.5.3, §15.7, §15.8 R-6c; phase I-52c1, R-6c1): the
 * «Grupos» row's suffix `amina` (an amine's nitrogen single-bonded to the
 * carbon its locant gives, as `ol` puts an OH) and the «Números» row's
 * locant `N` (a prefix on the principal amine's nitrogen, not on a carbon:
 * `N-metiletanamina`, `N,N-dimetilmetanamina`, mixed with numbers in
 * `N,2-dimetilpropan-1-amina`). Parser (the suffix node, `N` read wherever a
 * number is and kept to an amine's name-level prefixes, the misplaced tiles
 * with their tile ranges and hints, partial names), assembler (every form
 * checked against the forward engine's own text), tokenizer (the amides'
 * names never read; the `amino` prefixes read since phase R-6c2, `anilina`,
 * `bencilamina` and the class names since phase R-6c3), interpreter (the `N`
 * slots and their domain),
 * builder (the nitrogen and its groups, VALENCE on a third group, the caps),
 * search (left-out locants, `N` included: missingLocants, ambiguous,
 * incomplete), readName() verdicts with the molecule each describes
 * (compared by aromatic key with a SMILES), out-of-scope amines (the
 * engine's `substitutedPolyamine`, a halogen on the nitrogen, two rings),
 * mutations and their diagnosis (the rules that hold for an amine name; the
 * amine's own mistakes deliberate nulls of diagnose.js «Amines», each with
 * its category read independently), the fixture round trip over every row
 * with an amine nitrogen of tests/fixtures/names.tsv and the closed loop
 * over the oracle's amine generators (pure imports, no Java) — their amino
 * names read too since phase R-6c2, their `anilina` and class names since
 * phase R-6c3 —, the diagnosis sweeps with exact counts (over the R-6c1
 * names: the amino names are swept in reverse-amino.test.js, the retained
 * amine names and the class names in reverse-amine-templates.test.js), the
 * ordered drawing, the dialog's tooltips and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build, specAtoms } from '../../src/reverse/build.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { slotGroups } from '../../src/reverse/search.js';
import { AMINA_ID, NITROGEN_ID, N_VALUE } from '../../src/reverse/tiles.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  generateAmines, generateRingPrincipalBenzenes, generateRingPolysuffixBenzenes, generateRingSubstituents,
} from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, isAmine, isAmineMolecule, isAmineName, isAminoName, isAmideName, LATER_AMINE_WORDS, AMINE_CLASS_NAME,
  isAmineTemplateName, isAmineClassName,
} from './reverse-words.js';

/**
 * Fixture rows with an amine nitrogen (isAmine(): an N single-bonded to one
 * to three carbons, none a C=O carbon): 90, of which 87 the tiles read (I-36
 * 54, I-38 2, I-39a 2, I-39d 1, I-40a 8, I-40b 1, I-43a 10, I-43b 4, I-44 3,
 * I-45a 2); until phase R-6c2 54 (I-36 39, I-40a 5, I-43a 7, I-44 2, I-45a
 * 1), the 33 rows with only `amino` names read since then; phase R-6c3
 * reads more of their names (`anilina`, the class names) but no new row. The
 * other 3 rows' names are the amides' (R-6d: `3-amino-N-metilpropanamida`).
 */
const EXPECTED_ROWS = Object.freeze({
  total: 90, read: 87, i36: 54, i38: 2, i39a: 2, i39d: 1, i40a: 8, i40b: 1, i43a: 10, i43b: 4, i44: 3, i45a: 2,
});

/**
 * Their names and alternatives: 135 the tiles write, read back — the 60 of
 * phase R-6c1, since phase R-6c2 42 with an amino prefix (swept in
 * reverse-amino.test.js) and since phase R-6c3 16 with a retained amine word
 * (15 with `anilina`, `bencilamina`) and 17 class names (`metilamina`…;
 * both swept in reverse-amine-templates.test.js) —; 3 left for later, with
 * the amides' words (R-6d), never tokenized. Until phase R-6c3 36 were left
 * (15 with `anilina`, 18 class names with `bencilamina`), until phase R-6c2
 * 78 (45 with `amino`).
 */
const EXPECTED_NAMES = Object.freeze({ read: 135, r6c1: 60, amino: 42, templates: 16, classNames: 17, later: 3, amides: 3 });

/**
 * Tells whether a name is one of phase R-6c1's (the suffix `amina` and `N`
 * only): no amino prefix (R-6c2), retained amine word or class name (R-6c3),
 * nor an amide's word (R-6d). The sweeps of this file stay on those names.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for an R-6c1 name.
 */
function isR6c1Name(name) {
  return isAmineName(name) && !isAminoName(name) && !isAmineTemplateName(name) && !isAmineClassName(name);
}

/** Average time budget of one readName() call over the fixture round trip, in milliseconds (phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative readName() call, in milliseconds. */
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
    ids = null; // A name text: `N-metiletanamina`.
  }
  ids = ids || tokenize(name);
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
 * The errors of a parse as `CODE[from,to)` strings.
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
 * The aromatic key of a SMILES (both Kekulé drawings of a benzene ring alike).
 *
 * @param {string} smiles - The SMILES.
 * @returns {string} The key.
 */
function keyOf(smiles) {
  return aromaticKey(parseSmiles(smiles));
}

/**
 * The engine's names of a SMILES: its name and every alternative.
 *
 * @param {string} smiles - The SMILES.
 * @returns {string[]} The names.
 */
function namesOf(smiles) {
  const naming = nameMolecule(parseSmiles(smiles));
  assert.ok(naming.ok, smiles);
  return [naming.name, ...naming.alternatives.map((alt) => alt.name)];
}

/**
 * The bonds of each nitrogen of a molecule: its neighbours' elements and
 * bond orders (`C1 C1 C1` for N,N-dimethylmethanamine's), the nitrogens
 * sorted.
 *
 * @param {object} mol - A molecule.
 * @returns {string[]} Per nitrogen, its bonds.
 */
function nitrogenBonds(mol) {
  const bonds = [...mol.bonds.values()];
  return [...mol.atoms].filter(([, atom]) => atom.element === 'N').map(([id]) => bonds
    .filter((bond) => bond.a === id || bond.b === id)
    .map((bond) => `${mol.atoms.get(bond.a === id ? bond.b : bond.a).element}${bond.order}`)
    .sort().join(' ')).sort();
}

// ---------------------------------------------------------------------------
// Parser.
// ---------------------------------------------------------------------------

test('parser (R-6c1): `amina` in the parent node; `N` among a prefix\'s locants, in the student\'s order', () => {
  const { tree, errors } = parse(seq('N 2 di met il prop ano 1 amina'));
  assert.deepEqual(errors, []);
  assert.deepEqual(tree.items.map((item) => [item.locants, item.multiplier]), [[[0, 1], 2]]);
  assert.deepEqual([tree.parent.suffix.locants, tree.parent.suffix.multiplier, tree.parent.suffix.tile], [[7], null, 8]);
  assert.equal(tree.tiles[0].id, NITROGEN_ID);
  assert.equal(tree.tiles[8].id, AMINA_ID);
  // `N` after a number is kept where the student wrote it (the diagnosis says LOCANT_ORDER).
  assert.deepEqual(parse(seq('2 N di met il prop ano 1 amina')).errors, []);
  assert.deepEqual(errorsOf('N et il N met il prop ano 1 amina'), []);
  assert.deepEqual(errorsOf('N met il benceno amina'), []);
  assert.deepEqual(errorsOf('N met il ciclo hex ano amina'), []);
  assert.deepEqual(errorsOf('but ano 1 4 di amina'), []);
  // Old style: the locant before the root belongs to the suffix (`2-propanamina`, as `2-propanol`).
  const old = parse(seq('2 prop ano amina')).tree;
  assert.deepEqual([old.parent.legacy, old.parent.legacySuffix], [[0], true]);
  // Partial names: a prefix with `N` and no parent yet has no `N` error of its own.
  assert.deepEqual(errorsOf('N met il'), ['ENDS_WITH_BRANCH[0,3)']);
  assert.deepEqual(errorsOf('N'), ['NO_PARENT[0,1)']);
}); // End of test 'parser (R-6c1): `amina`…'

test('parser (R-6c1): `N` without `amina`, or anywhere but a name-level prefix, is TILE_ORDER with its tile range and hint', () => {
  const nitrogen = 'Esta ficha no puede ir aquí: «N» dice que un grupo va unido al nitrógeno de una amina, así que solo va en un '
    + 'nombre que acaba en «amina» (N-metiletanamina).';
  const place = 'Esta ficha no puede ir aquí: «N» va delante de una rama unida al nitrógeno de la amina, como un número más de esa '
    + 'rama (N-metiletanamina, N,2-dimetilpropan-1-amina); no va delante de la cadena principal, de «eno», «ino» o «amina», ni '
    + 'dentro de una rama compuesta.';
  const cases = [
    ['N met il et ano', ['TILE_ORDER[0,1)'], nitrogen],
    ['N met il et ano ol', ['TILE_ORDER[0,1)'], nitrogen],
    ['ácido N met il et ano oico', ['TILE_ORDER[1,2)'], nitrogen],
    ['N et ano amina', ['TILE_ORDER[0,1)'], place], // before the root (old style)
    ['et ano N amina', ['TILE_ORDER[2,3)'], place], // the suffix's locant
    ['but N eno 1 amina', ['TILE_ORDER[1,2)'], place], // a segment's
    ['START N met il et il END et ano amina', ['TILE_ORDER[1,2)'], place], // inside a compound branch
    ['prop ano N il et ano amina', ['TILE_ORDER[2,3)'], place], // a free-valence locant
  ];
  for (const [words, errors, message] of cases) {
    assert.deepEqual(errorsOf(words), errors, words);
    assert.equal(messageOf(words), message, words);
  }
  // A stray `N` after the parent keeps the parent's own TILE_ORDER, once.
  assert.deepEqual(errorsOf('et ano amina N'), ['TILE_ORDER[3,4)']);
  assert.match(messageOf('et ano amina N'), /el nombre termina con la cadena principal/);
  // `amina` out of place: its own hint; `bis` before it is the suffixes' hint.
  assert.deepEqual(errorsOf('amina et ano'), ['TILE_ORDER[0,1)']);
  assert.equal(messageOf('amina et ano'), 'Esta ficha no puede ir aquí: «amina» va al final del nombre, detrás de la terminación de la '
    + 'cadena o del anillo principal (propan-2-amina, butano-1,4-diamina, ciclohexanamina).');
  assert.match(messageOf('START amina END et ano'), /«amina» va al final del nombre/);
  assert.match(messageOf('but ano 1 4 bis amina'), /delante de «amina» va «di», «tri»…/);
  // A count that does not match: LOCANT_COUNT, `N` counted as any locant.
  assert.deepEqual(errorsOf('N bis met il et ano amina'), ['LOCANT_COUNT[0,2)']);
  assert.deepEqual(errorsOf('N N met il et ano amina'), ['LOCANT_COUNT[0,2)']);
}); // End of test 'parser (R-6c1): `N` without `amina`…'

// ---------------------------------------------------------------------------
// Assembler and tokenizer.
// ---------------------------------------------------------------------------

/** Amine forms (tile words) and a SMILES whose engine names include the assembled text. */
const FORMS = Object.freeze([
  ['met ano amina', 'CN'],
  ['et ano amina', 'CCN'],
  ['prop ano 2 amina', 'CC(C)N'],
  ['prop ano 1 amina', 'CCCN'],
  ['but ano 1 4 di amina', 'NCCCCN'],
  ['prop ano 1 2 3 tri amina', 'NCC(N)CN'],
  ['but ano 1 2 3 4 tetra amina', 'NCC(N)C(N)CN'],
  ['prop 2 eno 1 amina', 'C=CCN'],
  ['et eno amina', 'C=CN'],
  ['but 3 ino 2 amina', 'C#CC(C)N'],
  ['2 cloro et ano 1 amina', 'ClCCN'],
  ['tri cloro met ano amina', 'ClC(Cl)(Cl)N'],
  ['ciclo hex ano amina', 'NC1CCCCC1'],
  ['ciclo hex 2 eno 1 amina', 'NC1CCCC=C1'],
  ['ciclo hex ano 1 4 di amina', 'NC1CCC(N)CC1'],
  ['benceno amina', 'NC1=CC=CC=C1'],
  ['4 met il benceno 1 amina', 'CC1=CC=C(N)C=C1'],
  ['benceno 1 4 di amina', 'NC1=CC=C(N)C=C1'],
  ['N met il met ano amina', 'CNC'],
  ['N met il et ano amina', 'CNCC'],
  ['N N di met il met ano amina', 'CN(C)C'],
  ['N 2 di met il prop ano 1 amina', 'CNCC(C)C'],
  ['N et il N met il prop ano 1 amina', 'CCN(C)CCC'],
  ['1 cloro N met il met ano amina', 'ClCNC'],
  ['N met il ciclo hex ano amina', 'CNC1CCCCC1'],
  ['N met il benceno amina', 'CNC1=CC=CC=C1'],
  ['N 4 di met il benceno 1 amina', 'CNC1=CC=C(C)C=C1'],
  ['N N 2 tri met il prop ano 2 amina', 'CN(C)C(C)(C)C'],
  ['N isopropil ciclo hex ano amina', 'CC(C)NC1CCCCC1'],
  ['N prop ano 2 il ciclo hex ano amina', 'CC(C)NC1CCCCC1'],
  ['N fenil met ano amina', 'CNC1=CC=CC=C1'],
]);

test('assembler (R-6c1): every amine form is the forward engine\'s own text; the tokenizer reads it back', () => {
  const texts = [];
  for (const [words, smiles] of FORMS) {
    const assembled = text(words);
    texts.push(assembled);
    assert.ok(namesOf(smiles).includes(assembled) || words === 'N fenil met ano amina', `${words} → ${assembled}`);
    const ids = tokenize(assembled);
    assert.ok(ids, `no tiles for ${assembled}`);
    assert.equal(assemble(parse(ids).tree).text, assembled);
  }
  assert.deepEqual(texts.slice(0, 7), ['metanamina', 'etanamina', 'propan-2-amina', 'propan-1-amina', 'butano-1,4-diamina',
    'propano-1,2,3-triamina', 'butano-1,2,3,4-tetramina']);
  assert.deepEqual(texts.slice(15, 23), ['bencenamina', '4-metilbencen-1-amina', 'benceno-1,4-diamina', 'N-metilmetanamina',
    'N-metiletanamina', 'N,N-dimetilmetanamina', 'N,2-dimetilpropan-1-amina', 'N-etil-N-metilpropan-1-amina']);
  // `N-fenilmetanamina` is the engine's `N-metilbencenamina` written from the other side of the nitrogen.
  assert.equal(text('N fenil met ano amina'), 'N-fenilmetanamina');
  // The spans: `N` is a locant like the numbers, also out of place (a stray), where a stray multiplier, root or ending keeps
  // its own kind.
  const { spans } = assemble(parse(seq('N 2 di met il prop ano 1 amina')).tree);
  assert.deepEqual(spans.filter((span) => span.tile !== null).slice(0, 2).map((span) => span.kind), ['locant', 'locant']);
  const strays = assemble(parse(seq('et ano amina N di met ano')).tree).spans.filter((span) => span.tile !== null && span.tile >= 3);
  assert.deepEqual(strays.map((span) => span.kind), ['locant', 'multiplier', 'stem', 'ending']);
}); // End of test 'assembler (R-6c1)…'

test('tokenizer (R-6c1): the amides\' names never tokenize; `amino` (R-6c2), `anilina` and the class names (R-6c3) read', () => {
  for (const name of ['etanamida', 'N-metiletanamida', 'acetamida', 'ciclohexanocarboxamida', 'benzamida', 'ácido 3-carbamoilpropanoico',
    'N-fenilacetamida', '2-(acetilamino)etan-1-ol']) {
    assert.equal(tokenize(name), null, name);
  }
  // Since phase R-6c2 the amino prefixes read (reverse-amino.test.js); since phase R-6c3 the retained amine names and the class
  // names (reverse-amine-templates.test.js).
  for (const name of ['2-aminoetan-1-ol', 'ácido 2-aminopropanoico', '2-(dimetilamino)etan-1-ol', '4-(metilamino)fenol',
    '2-[etil(metil)amino]etan-1-ol', 'etanoato de 2-aminoetilo', '2-aminopropanonitrilo', 'anilina', 'N-metilanilina',
    'N,4-dimetilanilina', '4-metilanilina', 'p-metilanilina', 'metilamina', 'dimetilamina', 'trimetilamina', 'etilmetilamina',
    'bencilamina']) {
    assert.ok(tokenize(name), name);
  }
  assert.deepEqual(LATER_AMINE_WORDS, []);
  assert.ok(AMINE_CLASS_NAME.test('etilmetilamina') && !AMINE_CLASS_NAME.test('N-metiletanamina'));
  assert.deepEqual(['etilmetilamina', 'bencilamina', 'N-metilanilina'].map(isAmineClassName), [true, false, false]);
}); // End of test 'tokenizer (R-6c1)…'

// ---------------------------------------------------------------------------
// Interpreter and builder.
// ---------------------------------------------------------------------------

test('interpreter (R-6c1): the amine SuffixSpec; `N` slots with the domain [N, n]; left-out slots that may take `N`', () => {
  const spec = specOf('N 2 di met il prop ano 1 amina');
  assert.deepEqual([spec.suffix.kind, spec.suffix.outside, spec.suffix.terminal, spec.suffix.slots.map((slot) => slot.value)],
    ['amine', false, false, [1]]);
  assert.equal(N_VALUE, 0);
  assert.deepEqual(spec.prefixes[0].slots.map((slot) => [slot.kind, slot.value, slot.domain, Boolean(slot.nitrogen)]),
    [['supplied', 0, [0, 3], true], ['supplied', 2, [1, 3], false]]);
  // Left out: a carbon branch on a one-group amine may take `N`; a halogen, an alkoxy or an acyl group may not.
  assert.deepEqual(slotGroups(specOf('met il et ano amina')).map((g) => g.domain), [[0, 2], [1, 2]]);
  assert.deepEqual(slotGroups(specOf('cloro et ano amina')).map((g) => g.domain), [[1, 2], [1, 2]]);
  assert.deepEqual(slotGroups(specOf('met il oxi et ano amina')).map((g) => g.domain), [[1, 2], [1, 2]]);
  assert.deepEqual(slotGroups(specOf('acetil et ano amina')).map((g) => g.domain), [[1, 2], [1, 2]]);
  assert.deepEqual(slotGroups(specOf('met iliden et ano amina')).map((g) => g.domain), [[1, 2], [1, 2]]);
  assert.deepEqual(slotGroups(specOf('isopropil et ano amina')).map((g) => g.domain), [[0, 2], [1, 2]]);
  assert.deepEqual(slotGroups(specOf('fenil et ano amina')).map((g) => g.domain), [[0, 2], [1, 2]]);
  // Two amine groups: the engine never names a group on one of their nitrogens (substitutedPolyamine), so `N` is not searched.
  assert.deepEqual(slotGroups(specOf('met il but ano 1 4 di amina')).map((g) => g.domain), [[1, 4]]);
  // Not an amine: no `N`.
  assert.deepEqual(slotGroups(specOf('met il et ano ol')).map((g) => g.domain), [[1, 2], [1, 2]]);
}); // End of test 'interpreter (R-6c1)…'

test('builder (R-6c1): the amine nitrogen, single-bonded; the groups written `N` on it; atoms counted for the caps', () => {
  const cases = [
    ['et ano amina', ['C1']],
    ['N met il et ano amina', ['C1 C1']],
    ['N N di met il met ano amina', ['C1 C1 C1']],
    ['N 2 di met il prop ano 1 amina', ['C1 C1']],
    ['but ano 1 4 di amina', ['C1', 'C1']],
    ['N met il benceno amina', ['C1 C1']],
  ];
  for (const [words, bonds] of cases) {
    const built = build(specOf(words), specOf(words).leftOut.map(() => 1));
    assert.ok(built.ok, words);
    assert.deepEqual(nitrogenBonds(built.molecule), bonds, words);
    assert.ok(built.suffixAtoms.every((g) => built.molecule.atoms.get(g.attachment).element === 'N'), words);
  }
  // The prefix occurrence on the nitrogen: its locant `N` (N_VALUE), bonded to the nitrogen, not to a carbon of the parent.
  const built = build(specOf('N met il et ano amina'), [1]);
  const [occurrence] = built.prefixAtoms;
  assert.deepEqual([occurrence.locant, occurrence.parentAtom], [N_VALUE, built.suffixAtoms[0].attachment]);
  assert.ok(!built.studentParent.atoms.includes(occurrence.parentAtom));
  // The heavy atoms: the nitrogen of each group.
  assert.deepEqual(['et ano amina', 'but ano 1 4 di amina', 'N N di met il met ano amina'].map((words) => specAtoms(specOf(words))),
    [3, 6, 4]);
}); // End of test 'builder (R-6c1): the amine nitrogen…'

test('builder (R-6c1): a third group on the nitrogen is VALENCE on its `N`; ranges and the carbons\' valence as usual', () => {
  const cases = [
    ['N N N tri met il et ano amina', 'VALENCE', [2, 3], 'El nitrógeno de la amina tendría 4 enlaces, y un nitrógeno solo puede tener 3.'],
    ['N met il N N di et il met ano amina', 'VALENCE', [4, 5],
      'El nitrógeno de la amina tendría 4 enlaces, y un nitrógeno solo puede tener 3.'],
    ['et ano 3 amina', 'LOCANT_RANGE', [2, 3], 'La cadena de 2 carbonos va del 1 al 2: no hay carbono 3.'],
    ['1 1 1 tri cloro et ano 1 amina', 'VALENCE', [7, 8], 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4.'],
  ];
  for (const [words, code, tiles, message] of cases) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', `${words}: ${verdict.message}`);
    assert.deepEqual([verdict.errors[0].code, [verdict.errors[0].from, verdict.errors[0].to]], [code, tiles], words);
    assert.equal(verdict.message, message, words);
  }
  // A third group left out has no room on the nitrogen: two N and a carbon.
  assert.equal(read('tri met il met ano amina').kind, 'ambiguous');
}); // End of test 'builder (R-6c1): a third group…'

// ---------------------------------------------------------------------------
// readName(): verdicts, search, out-of-scope amines.
// ---------------------------------------------------------------------------

/**
 * readName() cases: tile words or a name, the verdict, the engine's name
 * and the SMILES of the molecule drawn.
 */
const CASES = Object.freeze([
  ['etanamina', 'correct', 'etanamina', 'CCN'],
  ['metanamina', 'correct', 'metanamina', 'CN'],
  ['propan-2-amina', 'correct', 'propan-2-amina', 'CC(C)N'],
  ['butano-1,4-diamina', 'correct', 'butano-1,4-diamina', 'NCCCCN'],
  ['ciclohexanamina', 'correct', 'ciclohexanamina', 'NC1CCCCC1'],
  ['bencenamina', 'correct', 'bencenamina', 'NC1=CC=CC=C1'],
  ['4-metilbencen-1-amina', 'correct', '4-metilbencen-1-amina', 'CC1=CC=C(N)C=C1'],
  ['N-metiletanamina', 'correct', 'N-metiletanamina', 'CNCC'],
  ['N,N-dimetilmetanamina', 'correct', 'N,N-dimetilmetanamina', 'CN(C)C'],
  ['N,2-dimetilpropan-1-amina', 'correct', 'N,2-dimetilpropan-1-amina', 'CNCC(C)C'],
  ['N-etil-N-metilpropan-1-amina', 'correct', 'N-etil-N-metilpropan-1-amina', 'CCN(C)CCC'],
  ['1-cloro-N-metilmetanamina', 'correct', '1-cloro-N-metilmetanamina', 'ClCNC'],
  ['N-metilciclohexanamina', 'correct', 'N-metilciclohexanamina', 'CNC1CCCCC1'],
  ['N-metilbencenamina', 'correct', 'N-metilbencenamina', 'CNC1=CC=CC=C1'],
  ['N,4-dimetilbencen-1-amina', 'correct', 'N,4-dimetilbencen-1-amina', 'CNC1=CC=C(C)C=C1'],
  ['N-(propan-2-il)ciclohexanamina', 'alternative', 'N-isopropilciclohexanamina', 'CC(C)NC1CCCCC1'],
  ['ciclohexilmetanamina', 'correct', 'ciclohexilmetanamina', 'NCC1CCCCC1'],
  ['2-feniletan-1-amina', 'correct', '2-feniletan-1-amina', 'NCCC1=CC=CC=C1'],
  ['2-cloroetan-1-amina', 'correct', '2-cloroetan-1-amina', 'ClCCN'],
  ['prop-2-en-1-amina', 'correct', 'prop-2-en-1-amina', 'C=CCN'],
  // Left-out locants (search.js), `N` among the places searched.
  ['met il et ano amina', 'missingLocants', 'N-metiletanamina', 'CNCC'],
  ['di met il et ano amina', 'missingLocants', 'N,N-dimetiletanamina', 'CN(C)CC'],
  ['met il met ano amina', 'missingLocants', 'N-metilmetanamina', 'CNC'],
  ['cloro N met il met ano amina', 'missingLocants', '1-cloro-N-metilmetanamina', 'ClCNC'],
  ['2 cloro et ano amina', 'missingLocants', '2-cloroetan-1-amina', 'ClCCN'],
  ['2 met il benceno amina', 'missingLocants', '2-metilbencen-1-amina', 'CC1=CC=CC=C1N'],
  // `otherName`: the molecule the name describes.
  ['etan-1-amina', 'otherName', 'etanamina', 'CCN'],
  ['bencen-1-amina', 'otherName', 'bencenamina', 'NC1=CC=CC=C1'],
  ['butan-3-amina', 'otherName', 'butan-2-amina', 'CCC(C)N'],
  ['N-etilmetanamina', 'otherName', 'N-metiletanamina', 'CNCC'],
  ['N-fenilmetanamina', 'otherName', 'N-metilbencenamina', 'CNC1=CC=CC=C1'],
  ['2-metil-N-metilpropan-1-amina', 'otherName', 'N,2-dimetilpropan-1-amina', 'CNCC(C)C'],
  ['2,N-dimetilpropan-1-amina', 'otherName', 'N,2-dimetilpropan-1-amina', 'CNCC(C)C'],
  ['N-acetiletanamina', 'otherName', 'N-etiletanamida', 'CCNC(C)=O'],
  ['N-(propan-2-il)etanamina', 'otherName', 'N-etilpropan-2-amina', 'CCNC(C)C'],
  ['2-propanamina', 'otherName', 'propan-2-amina', 'CC(C)N'],
]);

test('readName (R-6c1): verdicts and the molecule each name describes, against a SMILES', () => {
  for (const [name, kind, engine, smiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, kind, `${name}: ${verdict.message}`);
    assert.equal(verdict.name, engine, name);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${name} builds another graph`);
    assert.equal(verdict.draw, true, name);
  }
  assert.equal(read('met il et ano amina').message, 'Casi: faltan los números. Se escribe «N-metiletanamina».');
  assert.equal(read('bencenamina').message, '¡Correcto! También se llama «anilina» (nombre tradicional, que la IUPAC (2013) conserva '
    + 'como preferido).');
  // The student's reading: the amine nitrogen of each group on the student's carbon, the `N` prefix on the nitrogen.
  const verdict = read('N,2-dimetilpropan-1-amina');
  assert.deepEqual(verdict.suffixAtoms.map((g) => verdict.molecule.atoms.get(g.attachment).element), ['N']);
  assert.deepEqual(verdict.prefixAtoms.map((o) => o.locant), [0, 2]);
  assert.equal(verdict.prefixAtoms[0].parentAtom, verdict.suffixAtoms[0].attachment);
}); // End of test 'readName (R-6c1): verdicts…'

test('search (R-6c1): left-out locants, `N` included, give ambiguous lists; the budget gives incomplete; out-of-scope amines', () => {
  const ambiguous = [
    ['met il prop ano 2 amina', 'Faltan números: puede ser N-metilpropan-2-amina o 2-metilpropan-2-amina.'],
    ['but ano amina', 'Faltan números: puede ser butan-1-amina o butan-2-amina.'],
    ['N met il prop ano amina', 'Faltan números: puede ser N-metilpropan-1-amina o N-metilpropan-2-amina.'],
    ['met il ciclo hex ano amina', 'Faltan números: puede ser N-metilciclohexanamina, 1-metilciclohexan-1-amina, '
      + '2-metilciclohexan-1-amina u otras 2 moléculas.'],
    ['met il benceno amina', 'Faltan números: puede ser N-metilbencenamina, 2-metilbencen-1-amina, 3-metilbencen-1-amina u otra '
      + 'molécula.'],
    ['ciclo hex ano di amina', 'Faltan números: puede ser ciclohexano-1,1-diamina, ciclohexano-1,2-diamina, ciclohexano-1,3-diamina '
      + 'u otra molécula.'],
  ];
  for (const [words, message] of ambiguous) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message], ['ambiguous', message], words);
  }
  assert.equal(read('tetra met il hex ano amina', { budget: { placements: 1 } }).kind, 'incomplete');
  assert.equal(read('met il ciclo hex ano amina', { budget: { namings: 1 } }).kind, 'incomplete');
  // The engine's refusals: a group on one nitrogen of a diamine (substitutedPolyamine; beside a senior group too, where the
  // engine would name the molecule but the name says no nitrogen: build.js polyamineRefusal()), a halogen or an oxygen on the
  // nitrogen, two rings (RING_SYSTEM).
  const lead = 'Entiendo tu nombre, pero esa molécula queda fuera de lo que sé dibujar: ';
  for (const [words, start] of [
    ['N met il but ano 1 4 di amina', 'Esta molécula tiene varios grupos amino en la cadena principal'],
    ['N met il benceno 1 4 di amina', 'Este benceno tiene varios grupos amino unidos al anillo'],
    ['N-metil-4-oxociclohexano-1,3-diamina', 'Esta molécula tiene varios grupos amino en la cadena principal'],
    ['N-metil-3-oxopentano-1,5-diamina', 'Esta molécula tiene varios grupos amino en la cadena principal'],
    ['N-metil-4-hidroxibenceno-1,3-diamina', 'Este benceno tiene varios grupos amino unidos al anillo'],
    ['N cloro et ano amina', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['N met il oxi et ano amina', 'Esta molécula tiene átomos que no son carbono ni hidrógeno'],
    ['N fenil ciclo hex ano amina', 'Esta molécula tiene varios anillos'],
    ['N ciclo hex il benceno amina', 'Esta molécula tiene varios anillos']]) {
    const refused = read(words);
    assert.equal(refused.kind, 'outOfScope', `${words}: ${refused.message}`);
    assert.ok(refused.message.startsWith(`${lead}${start}`), refused.message);
    assert.equal(refused.draw, false);
  }
}); // End of test 'search (R-6c1)…'

// ---------------------------------------------------------------------------
// Mutations and the diagnosis.
// ---------------------------------------------------------------------------

/**
 * Mutations of amine names (design.md §15.7): tile words, the verdict and the
 * diagnosis code of a rule that holds for an amine name (the amine's own
 * mistakes are the deliberate nulls of the next test).
 */
const MUTATIONS = Object.freeze([
  ['1 met il prop ano 1 amina', 'otherName', 'BRANCH_AT_END'],
  ['2 et il prop ano 1 amina', 'otherName', 'LONGER_CHAIN'],
  ['5 met il ciclo hex ano 1 amina', 'otherName', 'RING_NUMBERING'],
  ['5 met il benceno 1 amina', 'otherName', 'RING_NUMBERING'],
  ['N met il N et il et ano amina', 'otherName', 'ALPHABETICAL_ORDER'],
  ['N met il 1 cloro met ano amina', 'otherName', 'ALPHABETICAL_ORDER'],
  ['N met il N met il et ano amina', 'otherName', 'UNGROUPED'],
  ['2 met il N met il prop ano 1 amina', 'otherName', 'UNGROUPED'],
  ['N N bis met il et ano amina', 'otherName', 'MULTIPLIER_KIND'],
  ['2 N di met il prop ano 1 amina', 'otherName', 'LOCANT_ORDER'],
  ['3 2 di met il but ano 1 amina', 'otherName', 'LOCANT_ORDER'],
  ['2 but eno 1 amina', 'otherName', 'OLD_STYLE'],
  ['2 START 5 met il fenil END et ano 1 amina', 'otherName', 'BRANCH_RING_NUMBERING'],
  ['N START 1 cloro met il END et ano amina', 'otherName', 'NEEDLESS_LOCANTS'],
  ['ciclo hex 1 3 5 tri eno amina', 'otherName', 'BENZENE_RING'],
  // Other verdicts.
  ['N met il et ano amina', 'correct', null],
  ['met il prop ano 2 amina', 'ambiguous', null],
  ['met il et ano amina', 'missingLocants', null],
]);

test('mutations (R-6c1): the expected verdict, and the diagnosis of every rule that holds for an amine name', () => {
  for (const [words, kind, code] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.kind, kind, `${words}: ${verdict.message}`);
    if (kind !== 'otherName') {
      continue;
    }
    assert.equal(verdict.diagnosis ? verdict.diagnosis.code : null, code, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(!/undefined|null|NaN|\[object|grupos? –?OH|–CHO|C=O|COOH|C≡N/.test(verdict.diagnosis.message), words);
    const opened = diagnosisExplanation(verdict, explain);
    const { step } = verdict.diagnosis;
    assert.ok(opened.index >= 0 && [step, ...STEP_FALLBACKS[step]].includes(opened.steps[opened.index].id), words);
  } // End of the loop over the mutations
  const messages = {
    '1 met il prop ano 1 amina': 'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 4 '
      + 'carbonos.',
    'N met il N met il et ano amina': 'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «N,N-dimetil», no '
      + '«N-metil-N-metil».',
    '2 N di met il prop ano 1 amina': 'Los números de un mismo grupo se escriben de menor a mayor: «N,2-dimetil», no «2,N-dimetil».',
    'N met il 1 cloro met ano amina': 'Los sustituyentes se escriben por orden alfabético: «cloro» va antes que «metil» (c antes que '
      + 'm).',
    '5 met il benceno 1 amina': 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los '
      + 'sustituyentes tienen que llevar los números más bajos (3 en vez de 5).',
  };
  for (const [words, message] of Object.entries(messages)) {
    assert.equal(read(words).diagnosis.message, message, words);
  }
  // A group on the nitrogen never lengthens the chain (it is no carbon of the chain's end): the name is the engine's.
  assert.equal(read('N met il prop ano 1 amina').kind, 'correct');
  // With the suffix's locant left out, a reading with the amine on the other end (an N0 null of rule 4) leaves the kinder reading's
  // rule (UNGROUPED, rule 6) to speak.
  assert.equal(read('N met il N met il met ano amina').diagnosis.code, 'UNGROUPED');
}); // End of test 'mutations (R-6c1)…'

/**
 * Tells whether two lists hold the same values.
 *
 * @param {number[]} a - A list.
 * @param {number[]} b - Another.
 * @returns {boolean} True for the same values, in any order.
 */
function sameSet(a, b) {
  const sorted = (list) => [...list].sort((p, q) => p - q).join();
  return sorted(a) === sorted(b);
}

/**
 * The category of an amine's own mistake, read independently of diagnose.js
 * from the engine's naming and the student's reading (diagnose.js «Amines»:
 * deliberate nulls until phase I-52c4): `seniority` — the student's suffix
 * is `amina` while the engine's principal group is another, or none
 * (`2-hidroxietan-1-amina`, `N-acetiletanamina`); `count` — another number
 * of amine groups; `side` — the student's parent is bonded to the amine's
 * nitrogen by another carbon than the engine's (`N-etilmetanamina`);
 * `numbering` — the same carbons carry the amine groups, numbered otherwise
 * (N0: `butan-3-amina`, `ciclohexano-1,5-diamina`); `suffix` — the suffix's
 * locants, which the engine leaves out (`etan-1-amina`, `bencen-1-amina`,
 * `N-metiletan-1-amina`); `parent` — the amine groups choose another parent:
 * the student's is a ring and the engine's a chain or the reverse, or no
 * chain the engine's P0 keeps contains the student's. Null when none
 * applies or neither name is an amine's.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its `otherName` verdict.
 * @returns {string|null} The category.
 */
function amineCategory(ids, verdict) {
  const engine = verdict.naming.structure.suffix;
  const mine = (verdict.suffixAtoms || []).filter((g) => verdict.molecule.atoms.get(g.attachment).element === 'N');
  if (!engine || engine.kind !== 'amine') {
    return mine.length > 0 ? 'seniority' : null;
  }
  if (mine.length === 0) {
    return 'seniority';
  }
  if (mine.length !== engine.locants.length) {
    return 'count';
  }
  if (!sameSet(mine.map((g) => g.parentAtom), engine.locants.map((site) => site.atom))) {
    return 'side';
  }
  if (!sameSet(mine.map((g) => g.locant), engine.locants.map((site) => site.locant))) {
    return 'numbering';
  }
  const { tree } = parse(ids);
  if (tree.parent.suffix && tree.parent.suffix.locants.length > 0) {
    const bare = assemble({ ...tree, parent: { ...tree.parent, suffix: { ...tree.parent.suffix, locants: [] } } }).text;
    if ([verdict.naming.name, ...verdict.naming.alternatives.map((alt) => alt.name)].includes(bare)) {
      return 'suffix';
    }
  }
  const chain = tree.parent.chain;
  const studentRing = chain.type === 'benzene' || (chain.type === 'chain' && chain.ring !== null);
  if (studentRing !== (verdict.naming.structure.parentKind === 'ring')) {
    return 'parent';
  }
  const student = verdict.studentParent.atoms;
  const p0 = verdict.naming.trace.find((step) => step.rule === 'P0');
  return !studentRing && p0 && !p0.survivors.some((c) => student.every((id) => c.atoms.includes(id))) ? 'parent' : null;
} // End of function amineCategory()

test('the deliberate nulls of R-6c1 (diagnose.js «Amines»): each category, read independently, gets no diagnosis', () => {
  const cases = [
    // [tile words, category]
    ['2 hidroxi et ano 1 amina', 'seniority'],
    ['3 oxo but ano 1 amina', 'seniority'],
    ['N acetil et ano amina', 'seniority'],
    ['3 ciano prop ano 1 amina', 'seniority'],
    ['N et il met ano amina', 'side'],
    ['N prop il et ano amina', 'side'],
    ['N fenil met ano amina', 'side'],
    ['N ciclo hex il et ano amina', 'side'],
    ['N START 5 met il fenil END et ano amina', 'side'], // the ring is the parent: `N-etil-3-metilbencen-1-amina`
    ['but ano 3 amina', 'numbering'],
    ['N met il prop ano 3 amina', 'numbering'],
    ['ciclo hex ano 1 5 di amina', 'numbering'],
    ['benceno 1 5 di amina', 'numbering'],
    ['et ano 1 amina', 'suffix'],
    ['benceno 1 amina', 'suffix'],
    ['ciclo hex ano 1 amina', 'suffix'],
    ['N met il et ano 1 amina', 'suffix'],
    ['2 START 2 amina et il END prop ano', null], // `amina` inside a branch: TILE_ORDER, no verdict to categorize
  ];
  for (const [words, category] of cases) {
    const ids = seq(words);
    const verdict = readName(ids);
    if (category === null) {
      assert.equal(verdict.kind, 'invalid', words);
      continue;
    }
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(amineCategory(ids, verdict), category, words);
    assert.equal(verdict.diagnosis, null, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(verdict.draw && verdict.molecule, words);
  } // End of the loop over the deliberate nulls
  // The shared rules that hold still speak beside an amine's suffix written with needless locants or numbered otherwise when theirs
  // is the earlier mistake.
  assert.equal(read('1 met il prop ano 1 amina').diagnosis.code, 'BRANCH_AT_END');
}); // End of test 'the deliberate nulls of R-6c1…'

// ---------------------------------------------------------------------------
// Fixture round trip and closed loop (design.md §15.7).
// ---------------------------------------------------------------------------

test('fixture round trip (R-6c1): every amine name the tiles write, read back; graph compared with the SMILES; later names never tokenize', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => isAmine(row.smiles));
  const counts = { read: 0, r6c1: 0, amino: 0, templates: 0, classNames: 0, later: 0, amides: 0 };
  let elapsed = 0;
  const readRows = new Set();
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      if (!isAmineName(name)) {
        counts.later += 1; // R-6d (the amides' words).
        counts.amides += isAmideName(name) ? 1 : 0;
        assert.equal(tokenize(name), null, `names.tsv:${row.line}: ${name} reads before its phase`);
        continue;
      }
      counts.amino += isAminoName(name) ? 1 : 0; // R-6c2
      counts.templates += !isAminoName(name) && isAmineTemplateName(name) ? 1 : 0; // R-6c3: `anilina`, `bencilamina`
      counts.classNames += !isAminoName(name) && isAmineClassName(name) ? 1 : 0; // R-6c3: `metilamina`…
      counts.r6c1 += isR6c1Name(name) ? 1 : 0;
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      assert.equal(assemble(parse(ids).tree).text, name, `names.tsv:${row.line}: assembly`);
      const start = performance.now();
      const verdict = readName(ids);
      elapsed += performance.now() - start;
      const isMain = name === row.names[0];
      assert.equal(verdict.kind, isMain ? 'correct' : 'alternative', `names.tsv:${row.line}: ${name} → ${verdict.message}`);
      assert.equal(verdict.text, name);
      assert.equal(verdict.name, row.names[0], `names.tsv:${row.line}`);
      assert.equal(aromaticKey(verdict.molecule), expected, `names.tsv:${row.line}: ${name} builds another graph`);
      assert.equal(verdict.draw, true);
      if (!isMain) {
        assert.equal(verdict.matched.name, name);
      }
      counts.read += 1;
      readRows.add(row);
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  /**
   * How many rows read of a fixture section.
   *
   * @param {string} id - The section's phase id (`I-36`…).
   * @returns {number} The count.
   */
  const inSection = (id) => [...readRows].filter((row) => /\((I-\d+[a-z]?)[),:]/.exec(row.section)[1] === id).length; // Its own id only.
  assert.equal(rows.length, EXPECTED_ROWS.total);
  assert.equal(readRows.size, EXPECTED_ROWS.read);
  assert.deepEqual(['I-36', 'I-38', 'I-39a', 'I-39d', 'I-40a', 'I-40b', 'I-43a', 'I-43b', 'I-44', 'I-45a'].map(inSection),
    [EXPECTED_ROWS.i36, EXPECTED_ROWS.i38, EXPECTED_ROWS.i39a, EXPECTED_ROWS.i39d, EXPECTED_ROWS.i40a, EXPECTED_ROWS.i40b,
      EXPECTED_ROWS.i43a, EXPECTED_ROWS.i43b, EXPECTED_ROWS.i44, EXPECTED_ROWS.i45a]);
  assert.deepEqual(counts, { ...EXPECTED_NAMES });
  assert.ok(elapsed / counts.read < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / counts.read).toFixed(2)} ms on average`);
}); // End of test 'fixture round trip (R-6c1)…'

/** The closed loop's generators (scripts/oracle/generate.mjs; design.md §15.7), molecules with an amine nitrogen only. */
const LOOP = Object.freeze({
  amines: Object.freeze({ count: 600, seed: 6301, maxSize: 12 }),
  principal: Object.freeze({ count: 400, seed: 6302, minSize: 6, maxSize: 12 }),
  polysuffix: Object.freeze({ count: 300, seed: 6303, minSize: 6, maxSize: 12 }),
  ringSubstituents: Object.freeze({ count: 400, seed: 6304, maxSize: 12 }),
});

/**
 * Minimum coverage of the closed loop: amine molecules (distinct by aromatic
 * key), names read back, the forms among them (names with `N`, ring and
 * benzene amines, polyamines, since phase R-6c3 the retained amine names and
 * the class names), removed-locant mutations and decisive verdicts among
 * them (three removals run out of budget, `incomplete`); and the later names
 * (the amides' words) never tokenized (the seeds give 1012, 1435, 639, 81,
 * 379, 103, 291, 22, 3227, 3224 and 15). Until phase R-6c3 the 291 names with
 * `anilina` or `bencilamina` and the 22 class names were later ones too (1122
 * names read, 442 with `N`, 328 later); until phase R-6c2 the 349 amino names
 * too (773 names read, 677 later; 2225 removals, 2223 decisive).
 */
const LOOP_MIN = Object.freeze({
  molecules: 1000, names: 1430, nitrogen: 630, ring: 78, benzene: 370, poly: 100, templates: 285, classNames: 20, removed: 3200,
  decisive: 3200, later: 15,
});

/**
 * The closed loop's molecules: those of the generators with an amine
 * nitrogen, distinct by aromatic key, that the engine names.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  const all = [...generateAmines(LOOP.amines), ...generateRingPrincipalBenzenes(LOOP.principal),
    ...generateRingPolysuffixBenzenes(LOOP.polysuffix), ...generateRingSubstituents(LOOP.ringSubstituents)];
  for (const mol of all.filter(isAmineMolecule)) {
    const key = aromaticKey(mol);
    if (!seen.has(key) && nameMolecule(mol).ok) {
      seen.add(key);
      molecules.push(mol);
    }
  }
  return molecules;
} // End of function loopMolecules()

/**
 * The locant lists of a tree a student can leave out: a prefix's (`N`
 * included), a segment's and the suffix's, at any depth — never a
 * free-valence locant.
 *
 * @param {object} tree - An error-free parse() tree.
 * @returns {number[][]} The lists of locant tile indices.
 */
function locantLists(tree) {
  const lists = [];
  /**
   * Collects the segments of a chain or ring (none for a whole word, a retained word or a one-atom group).
   *
   * @param {object} chain - A substituent or parent chain node.
   * @returns {void}
   */
  const visitChain = (chain) => (chain.segments || []).forEach((segment) => segment.locants.length > 0 && lists.push(segment.locants));
  /**
   * Collects a prefix and its substituent.
   *
   * @param {object} item - A prefix node.
   * @returns {void}
   */
  const visitItem = (item) => {
    if (item.locants.length > 0) {
      lists.push(item.locants);
    }
    const sub = item.substituent;
    if (sub.type === 'branch') {
      sub.items.forEach(visitItem);
      visitChain(sub.chain);
    } else {
      visitChain(sub);
    }
  }; // End of function visitItem()
  tree.items.forEach(visitItem);
  visitChain(tree.parent.chain);
  if (tree.parent.suffix && tree.parent.suffix.locants.length > 0) {
    lists.push(tree.parent.suffix.locants);
  }
  return lists;
} // End of function locantLists()

test('closed loop over the amine generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, nitrogen: 0, ring: 0, benzene: 0, poly: 0, templates: 0, classNames: 0, removed: 0, decisive: 0, later: 0 };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    for (const [i, name] of all.entries()) {
      if (!isAmineName(name)) {
        counts.later += 1; // R-6d (the amides' words).
        assert.equal(tokenize(name), null, name);
        continue;
      }
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      counts.nitrogen += /(?:^|[-,])N[-,]/.test(name) ? 1 : 0;
      counts.ring += /ciclo[a-z]*amina$|ciclo[a-z-]*\d-(?:di|tri|tetr)?amina$/.test(name) ? 1 : 0;
      counts.benzene += /bencen/.test(name) ? 1 : 0;
      counts.poly += /(?:di|tri|tetr)amina$/.test(name) ? 1 : 0;
      counts.templates += isAmineTemplateName(name) ? 1 : 0; // R-6c3: `anilina`, `N,4-dimetilanilina`, `bencilamina`
      counts.classNames += isAmineClassName(name) ? 1 : 0; // R-6c3: `metilamina`, `etildimetilamina`
      if (i > 0) {
        continue;
      }
      // Removed locants: the molecule must be the one drawn, or among those listed; never another verdict.
      for (const list of locantLists(parse(ids).tree)) {
        const reread = readName(ids.filter((_, j) => !list.includes(j)));
        counts.removed += 1;
        const where = `${name} → ${reread.text}: ${reread.kind}, ${reread.message}`;
        if (reread.kind === 'incomplete') {
          continue;
        }
        if (reread.kind === 'ambiguous') {
          assert.ok(reread.candidates.some((c) => aromaticKey(c.molecule) === key), where);
        } else {
          assert.ok(['missingLocants', 'correct', 'alternative', 'otherName'].includes(reread.kind), where);
          assert.equal(aromaticKey(reread.molecule), key, where);
          if (reread.kind === 'missingLocants') {
            assert.equal(reread.filled, name, where);
          }
        }
        counts.decisive += 1;
      } // End of the loop over the locant lists
    } // End of the loop over the names of a molecule
  } // End of the loop over the molecules
  const report = JSON.stringify({ molecules: molecules.length, ...counts });
  assert.ok(molecules.length >= LOOP_MIN.molecules, report);
  for (const field of Object.keys(counts)) {
    assert.ok(counts[field] >= LOOP_MIN[field], `${field}: ${report}`);
  }
}); // End of test 'closed loop over the amine generators…'

// ---------------------------------------------------------------------------
// Diagnosis sweeps over mutations (design.md §15.7).
// ---------------------------------------------------------------------------

/**
 * The tile id of a locant.
 *
 * @param {number} n - The locant.
 * @returns {string} Its tile id.
 */
function num(n) {
  return `num-${n}`;
}

/**
 * Rewrites the carbon locants of a list in place and puts them back in
 * ascending order over the same positions; an `N` stays where it is (it
 * names the nitrogen, not a carbon, and sorts first).
 *
 * @param {string[]} out - Tile ids (changed in place).
 * @param {object[]} tiles - The parsed tiles.
 * @param {number[]} positions - The list's tile indices.
 * @param {(value: number) => number} map - The new value of each carbon locant.
 * @returns {void}
 */
function rewriteLocants(out, tiles, positions, map) {
  const carbons = positions.filter((p) => tiles[p].kind === 'num');
  const values = carbons.map((p) => map(tiles[p].value)).sort((a, b) => a - b);
  carbons.forEach((p, k) => {
    out[p] = num(values[k]);
  });
}

/**
 * Tells whether a prefix node is a group bonded through a heteroatom (a
 * halogen, `hidroxi`, `oxo`, an alkoxy prefix): moved to an end, it never
 * lengthens the chain.
 *
 * @param {object} node - A substituent node (parse.js).
 * @returns {boolean} True for such a group.
 */
function isHeteroNode(node) {
  const core = node.type === 'branch' ? node.chain : node;
  return ['halogen', 'hydroxy', 'carbonyl'].includes(node.type) || Boolean(core && core.oxi !== null && core.oxi !== undefined);
}

/** The diagnosis codes an `otherName` of each mutation family may give (the trace's own rule for a new molecule). */
const FAMILY_CODES = Object.freeze({
  reversed: ['NUMBERING', 'CHAIN_LOCANTS'],
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  swapped: ['NUMBERING', 'RING_NUMBERING', 'BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS',
    'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  toEnd: ['BRANCH_AT_END', 'NUMBERING', 'LONGER_CHAIN', 'CHAIN_LOCANTS', 'MORE_SUBSTITUENTS'],
  heteroToEnd: ['NUMBERING', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING'],
});

/**
 * The mutations of one amine name: renumbered (`reversed` on a chain,
 * reflected and rotated on a ring, the suffix's locants too; an `N` stays),
 * carbon locants swapped between two single-locant prefixes, prefixes in
 * reverse order, identical prefixes written one by one, di ↔ bis, a
 * single-carbon-locant prefix moved to an end of a chain (a carbon branch:
 * BRANCH_AT_END; a halogen, `hidroxi`, `oxo` or an alkoxy prefix: another
 * molecule), a prefix's locants removed, or added (1… and 2…) where it has
 * none.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations.
 */
function mutationsOf(ids) {
  const { tree } = parse(ids);
  const { tiles, items } = tree;
  const parent = tree.parent.chain;
  const ring = parent.type === 'chain' ? parent.ring !== null : true;
  const n = (parent.type === 'chain' && tiles[parent.root].value) || 6;
  const segments = parent.type === 'chain' ? parent.segments : [];
  const suffix = tree.parent.suffix ? tree.parent.suffix.locants : [];
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
  const renumberings = ring ? [{ family: 'reflected', carbon: (v) => (v === 1 ? 1 : n + 2 - v), bond: (k) => (k === n ? 1 : n - k) }]
    : [{ family: 'reversed', carbon: (v) => n + 1 - v, bond: (k) => n - k }];
  for (let s = 1; ring && s < n; s += 1) {
    renumberings.push({ family: 'rotated', carbon: (v) => ((v - 1 + s) % n) + 1, bond: (k) => ((k - 1 + s) % n) + 1 });
  }
  for (const { family, carbon, bond } of renumberings) {
    const mutated = [...ids];
    items.forEach((item) => rewriteLocants(mutated, tiles, item.locants, carbon));
    segments.forEach((segment) => rewriteLocants(mutated, tiles, segment.locants, bond));
    rewriteLocants(mutated, tiles, suffix, carbon);
    push(family, mutated);
  }
  const carbonLocant = (item) => item.locants.length === 1 && tiles[item.locants[0]].kind === 'num';
  const single = items.filter(carbonLocant);
  single.forEach((a, i) => single.slice(i + 1).forEach((b) => {
    const swapped = [...ids];
    [swapped[a.locants[0]], swapped[b.locants[0]]] = [ids[b.locants[0]], ids[a.locants[0]]];
    push('swapped', swapped);
  }));
  if (items.length >= 2) {
    const slices = items.map((item) => ids.slice(item.range[0], item.range[1]));
    push('unsorted', [...slices.reverse().flat(), ...ids.slice(tree.parent.range[0])]);
  }
  for (const item of items) {
    if (item.multiplier !== null && item.locants.length >= 2) {
      const sub = ids.slice(item.multiplier + 1, item.range[1]);
      push('ungrouped', [...ids.slice(0, item.range[0]), ...item.locants.flatMap((p) => [ids[p], ...sub]), ...ids.slice(item.range[1])]);
    }
    if (item.multiplier !== null) {
      const tile = tiles[item.multiplier];
      const swapped = [...ids];
      swapped[item.multiplier] = tile.kind === 'mult' ? `cmult-${tile.value}` : `mult-${tile.value}`;
      push('diBis', swapped);
    }
    if (carbonLocant(item) && !ring) {
      for (const end of [1, n].filter((e) => e !== tiles[item.locants[0]].value)) {
        const moved = [...ids];
        moved[item.locants[0]] = num(end);
        push(isHeteroNode(item.substituent) ? 'heteroToEnd' : 'toEnd', moved);
      }
    }
    if (item.locants.length > 0) {
      push('removed', ids.filter((_, k) => !item.locants.includes(k)));
    } else if (item.letter === null) {
      const count = item.multiplier === null ? 1 : tiles[item.multiplier].value;
      for (const start of [1, 2].filter((s) => s + count - 1 <= n)) {
        push('added', [...ids.slice(0, item.range[0]), ...Array.from({ length: count }, (_, k) => num(start + k)), ...ids.slice(item.range[0])]);
      }
    }
  } // End of the loop over the parent-level prefixes
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some amine names: every `otherName` either
 * carries a diagnosis of its family's codes whose step resolves in its
 * explanation, or is an amine's own mistake, a deliberate null of
 * diagnose.js «Amines» (counted by category, amineCategory()); a null with
 * no category is unexpected.
 *
 * @param {string[]} names - Amine names (engine names or alternatives).
 * @returns {{otherName: Object<string, number>, codes: Set<string>, own: Object<string, number>, unexpected: string[]}}
 *   `otherName` counts by family, the codes seen, the amine's own mistakes by category and the unexpected nulls.
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
      if (!d) {
        const category = amineCategory(mutation.ids, verdict);
        if (category) {
          own[category] = (own[category] || 0) + 1;
        } else {
          unexpected.push(label);
        }
        continue;
      }
      codes.add(d.code);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object|grupos? –?OH|–CHO|C=O|COOH|C≡N/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, own, unexpected };
} // End of function sweep()

/**
 * How many mutations of the amine fixture names give `otherName`, by family,
 * and how many of them are the amine's own mistakes by category (deliberate
 * nulls until phase I-52c4): pinned by the test below.
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reversed: 17, reflected: 5, rotated: 63, swapped: 0, unsorted: 13, ungrouped: 9, diBis: 10, toEnd: 6, heteroToEnd: 0, removed: 0,
  added: 4,
});
const FIXTURE_OWN = Object.freeze({ numbering: 80 });

test('mutations of every amine fixture name: a diagnosis of the family\'s codes, or a deliberate «Amines» null', async () => {
  // The names of phase R-6c1: the amino names (R-6c2) are swept in reverse-amino.test.js, the retained amine names and the class
  // names (R-6c3) in reverse-amine-templates.test.js.
  const names = (await readFixtures()).filter((row) => isAmine(row.smiles)).flatMap((row) => row.names)
    .filter(isR6c1Name);
  assert.equal(names.length, EXPECTED_NAMES.r6c1);
  const { otherName, codes, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME });
  assert.deepEqual(own, { ...FIXTURE_OWN });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'MULTIPLIER_KIND', 'NEEDLESS_LOCANTS', 'NUMBERING',
    'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of every amine fixture name…'

test('mutations of the generated amines: every otherName is diagnosed or a deliberate «Amines» null, every step resolves', () => {
  const names = [];
  for (const mol of loopMolecules().filter((_, i) => i % 3 === 0)) { // Every generator's amines: chains, rings, benzenes.
    const naming = nameMolecule(mol);
    // The names of phase R-6c1: the amino names (R-6c2) and the R-6c3 names are swept in their own files.
    names.push(...[naming.name, ...naming.alternatives.map((alt) => alt.name)].filter(isR6c1Name));
  }
  assert.ok(names.length >= 0, `${names.length} names`);
  const { otherName, codes, own, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  assert.deepEqual([names.length, total, own], [256, 1236, { numbering: 742 }]);
  assert.deepEqual([otherName.removed, otherName.added], [0, 9]);
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'BRANCH_AT_END', 'CHAIN_LOCANTS', 'LONGER_CHAIN', 'MORE_SUBSTITUENTS',
    'MULTIPLIER_KIND', 'NEEDLESS_LOCANTS', 'NUMBERING', 'RING_NUMBERING', 'UNGROUPED']);
}); // End of test 'mutations of the generated amines…'

// ---------------------------------------------------------------------------
// The drawing, the dialog, robustness and time.
// ---------------------------------------------------------------------------

test('«Dibujar» (R-6c1): amine verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const name of ['etanamina', 'butano-1,4-diamina', 'ciclohexanamina', 'bencenamina', '4-metilbencen-1-amina', 'N-metiletanamina',
    'N,N-dimetilmetanamina', 'N,2-dimetilpropan-1-amina', 'N-etil-N-metilpropan-1-amina', 'N-metilciclohexanamina',
    'N-metilbencenamina', 'butan-3-amina', 'N-etilmetanamina', 'met il et ano amina']) {
    const verdict = read(name);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6c1)…'

test('dialog (R-6c1): the `amina` and `N` tiles have tooltips', () => {
  for (const id of [AMINA_ID, NITROGEN_ID]) {
    assert.ok(TILE_HINTS[id] && TILE_HINTS[id].endsWith('.'), id);
  }
  assert.match(TILE_HINTS[AMINA_ID], /propan-2-amina, butano-1,4-diamina, ciclohexanamina, bencenamina/);
  assert.match(TILE_HINTS[NITROGEN_ID], /N-metiletanamina; con dos ramas, N,N-dimetilmetanamina; junto a números, N,2-dimetilpropan-1-amina/);
}); // End of test 'dialog (R-6c1)…'

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

test('property (R-6c1): random amine names — any parent, `amina` with locants or none, `N` anywhere — never crash', () => {
  const random = mulberry32(20261017);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const branches = ['met il', 'et il', 'cloro', 'hidroxi', 'oxo', 'met il oxi', 'START 2 cloro et il END', 'fenil', 'ciclo hex il',
    'isopropil', 'acetil', 'ciano', 'met iliden'];
  const parents = ['met ano amina', 'et ano amina', 'but ano 1 4 di amina', 'pent ano 2 amina', 'prop 2 eno 1 amina',
    'ciclo hex ano amina', 'ciclo hex ano 1 3 di amina', 'benceno amina', 'benceno 1 amina', 'prop ano amina', 'but ano di amina',
    'et ano ol'];
  const multipliers = { 1: '', 2: 'di', 3: 'tri' };
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const prefixes = Array.from({ length: int(0, 2) }, () => {
      const count = int(1, 3);
      const located = random() < 0.7;
      const locants = located ? Array.from({ length: count }, () => (random() < 0.4 ? 'N' : String(int(1, 6)))).join(' ') : '';
      return [locants, multipliers[count], pick(branches)].join(' ');
    });
    const words = [...prefixes, pick(parents)].join(' ');
    const verdict = readName(seq(words), { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    assert.ok(!/undefined|NaN|\[object/.test(verdict.message), `${words}: ${verdict.message}`);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, words);
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      assert.ok(!/undefined|null|NaN|\[object|grupos? –?OH/.test(verdict.diagnosis.message), `${words}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['correct', 'otherName', 'ambiguous', 'invalid', 'outOfScope']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6c1): random amine names…'

test('time budget: amine readName() calls, with their diagnosis, well within budget', () => {
  const names = ['butano-1,4-diamina', 'N,2-dimetilpropan-1-amina', 'N-etil-N-metilpropan-1-amina', 'N,4-dimetilbencen-1-amina',
    'met il et ano amina', 'di met il et ano amina', 'met il prop ano 2 amina', 'met il ciclo hex ano amina', 'met il benceno amina',
    'N-etilmetanamina', 'butan-3-amina'];
  names.forEach((name) => read(name)); // Warm-up.
  for (const name of names) {
    const start = performance.now();
    const verdict = read(name);
    const ms = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', name);
    assert.ok(ms < PER_NAME_BUDGET_MS, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
