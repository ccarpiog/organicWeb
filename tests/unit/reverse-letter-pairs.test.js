/**
 * @file Unit tests for the orto/meta/para letter of two different prefixes
 * on plain `benceno` in «¿Cómo se dibuja?» (design.md §14.4, §15; phase
 * I-54b, the name → drawing half of
 * `autoclaude/processed/240-omp-two-different-groups.md`; the forward engine
 * writes these forms since I-54a): the parser accepts one letter before the
 * first of two prefixes cited once (parse.js benzenePair(), pairLetter()),
 * the interpreter places the first prefix at 1 and the second at the
 * letter's locant, the assembler writes the two prefixes crowded as the
 * engine does (`p-metil(metoxi)benceno`); the round trip over every such
 * form the fixtures list (`positional=` with two different prefixes), the
 * tiles a student builds, and the mutations with their verdicts — the
 * letter before the second prefix, two letters, a letter beside numbers
 * (POSITIONAL, each with its own message), three positions, a letter on
 * `tolueno` or `anisol`, the prefixes out of alphabetical order
 * (ALPHABETICAL_ORDER worded for the letter, never LETTER_LOCANTS) and the
 * name with neither letter nor numbers (the search's verdict, unchanged).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readName } from '../../src/reverse/index.js';
import { parse, benzenePair, pairLetter } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { hasTwoDifferentPrefixes } from '../../src/naming/aromatic.js';
import { styleLabel } from '../../src/naming/lexicon.es.js';
import { seq } from './reverse-words.js';

/** The fixture table (design.md §4.8). */
const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'names.tsv');

/**
 * The `positional=` forms of two different prefixes on `benceno` the
 * fixtures list since I-54a: one each for `1-bromo-3-clorobenceno`,
 * `1-bromo-2-clorobenceno`, `1-metil-2-yodobenceno`,
 * `1-metil-4-metoxibenceno`, `1-cloro-3-etilbenceno`,
 * `1-(clorometil)-4-metilbenceno`, `1-etoxi-4-metilbenceno`,
 * `1-cloro-4-(clorometil)benceno`, `1-cloro-4-metilbenceno` and
 * `1-tert-butil-4-metilbenceno`; three (one per prefix style) for
 * `1-isopropil-4-metilbenceno` and `1-cloro-3-isopropilbenceno`.
 */
const EXPECTED_FIXTURE_FORMS = 16;

/** The messages of the POSITIONAL errors of two prefixes on `benceno` (parse.js POSITIONAL_MESSAGES, I-54b). */
const MESSAGES = Object.freeze({
  place: 'Con dos grupos distintos en el benceno, la letra va al principio del nombre, delante del primer grupo, que va en el '
    + 'carbono 1: la letra dice dónde está el segundo (m-cloroetilbenceno).',
  twice: 'Con dos grupos distintos en el benceno se escribe una sola letra, al principio del nombre: el primer grupo va en el '
    + 'carbono 1 y la letra dice dónde está el segundo (m-cloroetilbenceno).',
  mixed: 'Escribe los números de los dos grupos (1-cloro-3-etilbenceno) o una sola letra al principio del nombre '
    + '(m-cloroetilbenceno), no las dos cosas.',
});

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
 * The `positional=` alternatives of the fixture rows, with the row's SMILES,
 * systematic name and line.
 *
 * @returns {Promise<{line: number, smiles: string, main: string, form: string}[]>} The forms, in file order.
 */
async function positionalForms() {
  const lines = (await readFile(FIXTURES, 'utf8')).split('\n');
  const forms = [];
  lines.forEach((text, i) => {
    if (i === 0 || text.startsWith('#') || text.trim() === '') {
      return;
    }
    const [smiles, main, , , alternatives = ''] = text.split('\t');
    for (const pair of alternatives.split(';').filter((p) => p.startsWith('positional='))) {
      forms.push({ line: i + 1, smiles, main, form: pair.slice(pair.indexOf('=') + 1) });
    }
  });
  return forms;
} // End of function positionalForms()

test('parse (I-54b): one letter before the first of two prefixes on plain `benceno`; benzenePair() and pairLetter()', () => {
  // 0:m 1:cloro 2:et 3:il 4:benceno
  let { tree, errors } = parse(seq('m cloro et il benceno'));
  assert.deepEqual(errors, []);
  assert.deepEqual(benzenePair(tree.tiles, tree), [tree.items[0], tree.items[1]]);
  assert.equal(pairLetter(tree.tiles, tree), 0);
  // The letter's place, a second letter or numbers: a pair, but no letter form.
  for (const words of ['cloro m et il benceno', 'm cloro m et il benceno', 'm cloro 3 et il benceno', '1 cloro 3 et il benceno',
    'cloro et il benceno']) {
    ({ tree } = parse(seq(words)));
    assert.ok(benzenePair(tree.tiles, tree), words);
    assert.equal(pairLetter(tree.tiles, tree), null, words);
  }
  // No pair: a multiplied prefix, three prefixes, a group after `benceno`, a word that places a group, a template, a chain.
  for (const words of ['p di met il benceno', 'm cloro et il met il benceno', 'p cloro met il benceno ol', 'p cloro met il fenol',
    'p cloro met il tolueno', 'cloro met il hex ano', 'p cloro tolueno']) {
    ({ tree } = parse(seq(words)));
    assert.equal(benzenePair(tree.tiles, tree), null, words);
    assert.equal(pairLetter(tree.tiles, tree), null, words);
  }
  // Identical prefixes are a pair too: the diagnosis judges them (UNGROUPED), not the parser.
  ({ tree, errors } = parse(seq('p met il met il benceno')));
  assert.deepEqual([errors, pairLetter(tree.tiles, tree)], [[], 0]);
}); // End of test 'parse (I-54b): one letter before the first of two prefixes…'

test('interpret (I-54b): the letter puts the first prefix at 1 and the second at its locant, both supplied, nothing left out', () => {
  for (const [words, second] of [['o bromo cloro benceno', 2], ['m cloro et il benceno', 3], ['p met il met il oxi benceno', 4]]) {
    const spec = interpret(parse(seq(words)).tree);
    assert.deepEqual(spec.prefixes.map((prefix) => prefix.slots.map((slot) => [slot.kind, slot.value, slot.letter, slot.tiles])),
      [[['supplied', 1, true, [0, 1]]], [['supplied', second, true, [0, 1]]]], words);
    assert.deepEqual(spec.leftOut, [], words);
  }
}); // End of test 'interpret (I-54b): the letter puts the first prefix at 1…'

test('assemble (I-54b): the two prefixes of the letter form are crowded, as the engine writes them; numbers are not', () => {
  const cases = [
    ['m cloro et il benceno', 'm-cloroetilbenceno'],
    ['p met il met il oxi benceno', 'p-metil(metoxi)benceno'],
    ['p et il oxi met il benceno', 'p-(etoxi)metilbenceno'],
    ['p met il prop ano 2 il benceno', 'p-metil(propan-2-il)benceno'],
    ['p cloro START cloro met il END benceno', 'p-cloro(clorometil)benceno'],
    ['p tert-butil met il benceno', 'p-tert-butilmetilbenceno'],
    // Not the letter form: the alkoxy prefix is not enclosed.
    ['1 met il 4 met il oxi benceno', '1-metil-4-metoxibenceno'],
    ['met il p met il oxi benceno', 'metil-p-metoxibenceno'],
  ];
  for (const [words, text] of cases) {
    assert.equal(assemble(parse(seq(words)).tree).text, text, words);
  }
}); // End of test 'assemble (I-54b): the two prefixes of the letter form are crowded…'

test('fixture round trip (I-54b): every `positional=` form of two different prefixes reads back as the engine\'s alternative', async () => {
  const forms = (await positionalForms()).filter(({ smiles }) => hasTwoDifferentPrefixes(nameMolecule(parseSmiles(smiles)).structure));
  assert.equal(forms.length, EXPECTED_FIXTURE_FORMS, forms.map((f) => f.form).join(', '));
  for (const { line, smiles, main, form } of forms) {
    const naming = nameMolecule(parseSmiles(smiles));
    const engine = naming.alternatives.find((alt) => alt.style === 'positional' && alt.name === form);
    assert.ok(engine, `names.tsv:${line}: the engine writes ${form}`);
    const ids = tokenize(form);
    assert.ok(ids, `names.tsv:${line}: no tiles for ${form}`);
    const { tree, errors } = parse(ids);
    assert.deepEqual(errors, [], form);
    assert.notEqual(pairLetter(tree.tiles, tree), null, `${form} is the letter form`);
    assert.equal(assemble(tree).text, engine.name, `names.tsv:${line}: the assembly is the engine's text`);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'alternative', `names.tsv:${line}: ${form} → ${verdict.message}`);
    assert.deepEqual([verdict.text, verdict.name, verdict.matched.name, verdict.matched.style], [form, main, form, 'positional']);
    assert.equal(verdict.matched.label, styleLabel('positional'));
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `names.tsv:${line}: ${form} builds another graph`);
    assert.ok(verdictLayout(verdict), `${form}: no ordered drawing`);
  } // End of the loop over the fixture forms
}); // End of test 'fixture round trip (I-54b): every `positional=` form of two different prefixes…'

test('a student\'s tiles (I-54b): the letter forms the closed loop pinned until I-54b now draw, with the `alternative` verdict', () => {
  const cases = [
    ['CCC1=CC=CC(Cl)=C1', 'm cloro et il benceno', 'm-cloroetilbenceno', '1-cloro-3-etilbenceno'],
    ['CC(C)C1=CC=C(C)C=C1', 'p isopropil met il benceno', 'p-isopropilmetilbenceno', '1-isopropil-4-metilbenceno'],
    ['CC(C)C1=CC=C(C)C=C1', 'p met il prop ano 2 il benceno', 'p-metil(propan-2-il)benceno', '1-isopropil-4-metilbenceno'],
    ['ClCC1=CC=C(Cl)C=C1', 'p cloro START cloro met il END benceno', 'p-cloro(clorometil)benceno', '1-cloro-4-(clorometil)benceno'],
    ['COC1=CC=C(C)C=C1', 'p met il met il oxi benceno', 'p-metil(metoxi)benceno', '1-metil-4-metoxibenceno'],
    ['ClC1=CC=C(C)C=C1', 'p cloro met il benceno', 'p-clorometilbenceno', '1-cloro-4-metilbenceno'],
  ];
  for (const [smiles, words, text, name] of cases) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.text, verdict.name, verdict.draw], ['alternative', text, name, true], words);
    assert.equal(verdict.message, `¡Correcto! «${text}» es una forma válida (${styleLabel('positional')}). `
      + `El nombre que doy primero es «${name}».`);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), words);
    assert.deepEqual(verdict.errors, []);
  }
}); // End of test 'a student\'s tiles (I-54b)…'

test('mutations (I-54b): a letter before the second prefix, two letters, a letter beside numbers — POSITIONAL, each worded', () => {
  const cases = [
    // The letter before the second prefix.
    ['cloro m et il benceno', 'cloro-m-etilbenceno', [1, 2], MESSAGES.place],
    ['bromo o cloro benceno', 'bromo-o-clorobenceno', [1, 2], MESSAGES.place],
    // Two letters: the second is marked.
    ['m cloro m et il benceno', 'm-cloro-m-etilbenceno', [2, 3], MESSAGES.twice],
    ['m cloro p et il benceno', 'm-cloro-p-etilbenceno', [2, 3], MESSAGES.twice],
    // A letter beside numbers, on the other prefix or on the same one.
    ['m cloro 3 et il benceno', 'm-cloro-3-etilbenceno', [0, 1], MESSAGES.mixed],
    ['1 cloro m et il benceno', '1-cloro-m-etilbenceno', [2, 3], MESSAGES.mixed],
    ['1 m cloro et il benceno', '1,m-cloroetilbenceno', [0, 2], MESSAGES.mixed],
  ];
  for (const [words, text, [from, to], message] of cases) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.text, verdict.message, verdict.draw], ['invalid', text, message, false], words);
    assert.deepEqual(verdict.errors.map((e) => [e.code, e.from, e.to]), [['POSITIONAL', from, to]], words);
  }
}); // End of test 'mutations (I-54b): a letter before the second prefix…'

test('mutations (I-54b): three positions and a letter on `tolueno` or `anisol` keep their verdicts', () => {
  // Three occupied positions: never a letter (design.md §14.4).
  for (const words of ['m cloro et il met il benceno', 'm di cloro et il benceno']) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    assert.deepEqual(verdict.errors.map((e) => [e.code, e.from, e.to]), [['POSITIONAL', 0, 1]], words);
    assert.equal(verdict.message, 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu nombre pone tres: '
      + 'escribe los números (1,2,4-trimetilbenceno).', words);
  }
  // `tolueno` and `anisol` admit no prefix (design.md §14.5): no `p-clorotolueno`, no `p-metilanisol`.
  for (const [words, name, template] of [['p cloro tolueno', '1-cloro-4-metilbenceno', 'tolueno'],
    ['p met il anisol', '1-metil-4-metoxibenceno', 'anisol']]) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis.code], ['otherName', name, 'SUBSTITUTED_TEMPLATE'], words);
    assert.equal(verdict.diagnosis.message, `El nombre tradicional «${template}» no admite más sustituyentes: con más ramas en el `
      + `anillo, la molécula se nombra a partir de «benceno», con todas las ramas delante: «${name}».`, words);
  }
}); // End of test 'mutations (I-54b): three positions and a letter on `tolueno`…'

test('mutations (I-54b): prefixes out of alphabetical order are `otherName`, ALPHABETICAL_ORDER worded for the letter', () => {
  const cases = [
    ['p met il cloro benceno', 'p-metilclorobenceno', '1-cloro-4-metilbenceno', 'p', 'cloro', 'metil', 'c antes que m',
      'p-clorometilbenceno'],
    ['m et il cloro benceno', 'm-etilclorobenceno', '1-cloro-3-etilbenceno', 'm', 'cloro', 'etil', 'c antes que e',
      'm-cloroetilbenceno'],
    ['o yodo met il benceno', 'o-yodometilbenceno', '1-metil-2-yodobenceno', 'o', 'metil', 'yodo', 'm antes que y',
      'o-metilyodobenceno'],
    ['p met il et il oxi benceno', 'p-metil(etoxi)benceno', '1-etoxi-4-metilbenceno', 'p', 'etoxi', 'metil', 'e antes que m',
      'p-(etoxi)metilbenceno'],
    ['p prop ano 2 il met il benceno', 'p-(propan-2-il)metilbenceno', '1-isopropil-4-metilbenceno', 'p', 'metil', 'propan-2-il',
      'm antes que p', 'p-metil(propan-2-il)benceno'],
  ];
  for (const [words, text, name, letter, first, second, why, right] of cases) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.text, verdict.name, verdict.draw], ['otherName', text, name, true], words);
    const d = verdict.diagnosis;
    assert.equal(d.code, 'ALPHABETICAL_ORDER', `${words}: ${d.code}`);
    assert.equal(d.message, `Los sustituyentes se escriben por orden alfabético, también con la letra «${letter}» delante: «${first}» `
      + `va antes que «${second}» (${why}). Se escribe «${right}», no «${text}».`, words);
    // The right form is the engine's own letter form, in the student's prefix style.
    assert.ok(verdict.alternatives.some((alt) => alt.style === 'positional' && alt.name === right), words);
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), words);
  }
}); // End of test 'mutations (I-54b): prefixes out of alphabetical order…'

test('mutations (I-54b): every fixture letter form with its prefixes swapped is ALPHABETICAL_ORDER, never LETTER_LOCANTS', async () => {
  const forms = (await positionalForms()).filter(({ smiles }) => hasTwoDifferentPrefixes(nameMolecule(parseSmiles(smiles)).structure));
  for (const { form, main } of forms) {
    const ids = tokenize(form);
    const { tree } = parse(ids);
    const [a, b] = tree.items;
    // The two prefixes swapped, the letter kept at the start: `m-cloroetilbenceno` → `m-etilclorobenceno`.
    const swapped = [ids[a.letter], ...ids.slice(b.range[0], b.range[1]), ...ids.slice(a.letter + 1, a.range[1]),
      ...ids.slice(tree.parent.range[0])];
    const verdict = readName(swapped);
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', main], `${form} → ${verdict.text}`);
    assert.equal(verdict.diagnosis && verdict.diagnosis.code, 'ALPHABETICAL_ORDER', `${form} → ${verdict.text}`);
    assert.ok(verdict.diagnosis.message.endsWith(`Se escribe «${form}», no «${verdict.text}».`), verdict.diagnosis.message);
  }
}); // End of test 'mutations (I-54b): every fixture letter form with its prefixes swapped…'

test('identical prefixes and a group after `benceno` (I-54b): UNGROUPED with the letter; the letter goes with the word', () => {
  // `p-metilmetilbenceno`: read, 1,4-dimetilbenceno, the two methyls grouped with «di».
  let verdict = readName(seq('p met il met il benceno'));
  assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis.code], ['otherName', '1,4-dimetilbenceno', 'UNGROUPED']);
  assert.equal(verdict.diagnosis.message, 'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «p-dimetil», no '
    + '«p-metilmetil».');
  // A letter on `benceno` with a group written after it: what the former «dos grupos distintos» message still refuses.
  const cases = [
    ['p cloro benceno ol', 'p-clorobencenol', 'fenol', 'p-metilfenol'],
    ['p cloro benceno carbaldehído', 'p-clorobencenocarbaldehído', 'benzaldehído', 'p-metilbenzaldehído'],
    ['ácido p cloro benceno carboxílico', 'ácido p-clorobencenocarboxílico', 'ácido benzoico', 'ácido p-metilbenzoico'],
    ['p cloro benceno carbonitrilo', 'p-clorobencenocarbonitrilo', 'benzonitrilo', 'p-metilbenzonitrilo'],
    ['p cloro benceno carboxamida', 'p-clorobencenocarboxamida', 'benzamida', 'p-metilbenzamida'],
    ['p cloro benceno carboxilato met ilo', 'p-clorobencenocarboxilato de metilo', 'benzoato', 'p-metilbenzoato de metilo'],
  ];
  for (const [words, text, word, example] of cases) {
    verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.text], ['invalid', text], words);
    const error = verdict.errors.find((e) => e.code === 'POSITIONAL');
    assert.deepEqual([error.from, error.to], words.startsWith('ácido') ? [1, 2] : [0, 1], words);
    assert.equal(error.message, 'Con un grupo escrito detrás de «benceno» no se usan «o», «m» ni «p»: escribe los números, o usa '
      + `«${word}», de la fila «Anillos», con la letra (${example}).`, words);
    // The example reads: the whole word with the letter is the engine's form.
    assert.equal(readName(tokenize(example)).kind, 'alternative', example);
  }
  // `bencenamina` keeps its own message.
  assert.match(readName(seq('p met il benceno amina')).message, /^Con «bencenamina» no se usan «o», «m» ni «p»/);
  // A terminal suffix after `benceno` (also TILE_ORDER) points at the whole word of its own group, as its TILE_ORDER hint
  // does; a group no whole word holds (`ona`) gets no word at all (I-54b review: never «fenol» by default).
  const terminal = [
    ['p cloro benceno al', 'benzaldehído', 'p-metilbenzaldehído'],
    ['p cloro benceno nitrilo', 'benzonitrilo', 'p-metilbenzonitrilo'],
    ['p cloro benceno amida', 'benzamida', 'p-metilbenzamida'],
    ['p cloro benceno oato met ilo', 'benzoato', 'p-metilbenzoato de metilo'],
    ['p cloro benceno oico', 'ácido benzoico', 'ácido p-metilbenzoico'],
  ];
  for (const [words, word, example] of terminal) {
    const { errors } = parse(seq(words));
    assert.equal(errors.find((e) => e.code === 'POSITIONAL').message, 'Con un grupo escrito detrás de «benceno» no se usan «o», '
      + `«m» ni «p»: escribe los números, o usa «${word}», de la fila «Anillos», con la letra (${example}).`, words);
    assert.ok(errors.some((e) => e.code === 'TILE_ORDER'), words);
  }
  assert.equal(readName(seq('p cloro benceno ona')).message,
    'Con un grupo escrito detrás de «benceno» no se usan «o», «m» ni «p»: escribe los números.');
}); // End of test 'identical prefixes and a group after `benceno` (I-54b)…'

test('neither letter nor numbers (I-54b): `clorometilbenceno` keeps the search\'s verdict', () => {
  const verdict = readName(seq('cloro met il benceno'));
  assert.equal(verdict.kind, 'ambiguous');
  assert.equal(verdict.message, 'Faltan números: puede ser 1-cloro-2-metilbenceno, 1-cloro-3-metilbenceno o 1-cloro-4-metilbenceno.');
  assert.deepEqual(verdict.candidates.map((c) => c.name), ['1-cloro-2-metilbenceno', '1-cloro-3-metilbenceno', '1-cloro-4-metilbenceno']);
}); // End of test 'neither letter nor numbers (I-54b)…'
