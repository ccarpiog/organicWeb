/**
 * @file Unit tests for MULT_AS_ROOT in «¿Cómo se dibuja?» (src/reverse/parse.js;
 * phase I-55, `autoclaude/processed/250-multiplier-as-root-message.md`): a
 * multiplier tile from «¿Cuántos?» where a root from «Raíces» goes (`ciclo
 * hexa 1 eno`, `octa ano`) is the first error, marks the multiplier tile and
 * says which root the student meant; the multiplier is then read as that
 * root, so the rest of the name parses with no NO_PARENT / TILE_ORDER
 * cascade. The look-alike test comes from the lexicon (`penta` … `triaconta`,
 * the root plus the connecting `a`); after `ciclo` every multiplier of a ring
 * size counts (`tri`, `tetra` too), `di` keeps RING_ROOT. Where a chain starts
 * only a look-alike counts, and only before what follows a root (an ending, a
 * locant, `il`…); after numbers or a letter, only before a branch's ending,
 * past the chain's own endings (`6 penta 1 eno 3 il`); right after a
 * multiplier of its own, which is kept (`di hexa il éter`; review of I-55).
 * Unchanged: a real multiplier (`hexametil`), a root left out (`1 3 di eno`),
 * `ciclo di ano`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse, isLookAlikeMultiplier, ERROR_CODES } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { TILES, tileById } from '../../src/reverse/tiles.js';
import { ROWS } from '../../src/ui/name-builder.js';
import { errorTileIndices } from '../../src/ui/name-builder-state.js';
import { stem, multiplier } from '../../src/naming/lexicon.es.js';
import { seq, leafIndices } from './reverse-words.js';

/** The user's report: `4-metilciclohexa-1-eno` from the tiles `4 met il ciclo hexa 1 eno`. */
const REPORT_IDS = ['num-4', 'root-1', 'fv-1', 'ring-cyclo', 'mult-6', 'num-1', 'ending-double'];

/** The message of the report (a look-alike in a ring with an unsaturation ending). */
const REPORT_MESSAGE = '«hexa», de la fila «¿Cuántos?», dice cuántos grupos iguales hay (hexametil). La raíz de seis carbonos es '
  + '«hex», de la fila «Raíces»: ciclohex-1-eno. La «a» de ciclohexa-1,3-dieno la pone la aplicación sola delante de «di».';

/**
 * The errors of a parse as `CODE[from,to)` strings.
 *
 * @param {string|string[]} words - Space-separated tile words (reverse-words.js), or tile ids.
 * @returns {string[]} The errors.
 */
function errorsOf(words) {
  const ids = Array.isArray(words) ? words : seq(words);
  return parse(ids).errors.map((e) => `${e.code}[${e.from},${e.to})`);
}

/**
 * The MULT_AS_ROOT message the parser writes for a multiplier of `n` with an
 * example, built here from the lexicon.
 *
 * @param {number} n - The multiplier's number.
 * @param {string} example - The example after the colon.
 * @param {string} [dieno] - The `…a-1,3-dieno` of the extra sentence, when there is one.
 * @returns {string} The message.
 */
function expectedMessage(n, example, dieno) {
  const words = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];
  const count = n < words.length ? words[n] : String(n);
  const text = `«${multiplier(n)}», de la fila «¿Cuántos?», dice cuántos grupos iguales hay (${multiplier(n)}metil). La raíz de `
    + `${count} carbonos es «${stem(n)}», de la fila «Raíces»: ${example}.`;
  return dieno ? `${text} La «a» de ${dieno} la pone la aplicación sola delante de «di».` : text;
}

/**
 * Reads tile words and checks that MULT_AS_ROOT is the only error, on the
 * given tile, with the given message; returns the verdict.
 *
 * @param {string} words - Space-separated tile words.
 * @param {number} at - Index of the multiplier tile.
 * @param {string} message - The expected message.
 * @returns {object} The readName() verdict.
 */
function assertOnly(words, at, message) {
  const verdict = readName(seq(words));
  assert.equal(verdict.kind, 'invalid', words);
  assert.deepEqual(verdict.errors.map((e) => `${e.code}[${e.from},${e.to})`), [`MULT_AS_ROOT[${at},${at + 1})`], words);
  assert.equal(verdict.errors[0].message, message, words);
  assert.equal(verdict.message, message, words);
  return verdict;
}

test('the look-alike test comes from the lexicon: penta … triaconta, never di, tri, tetra, bis… or a root', () => {
  const lookAlikes = TILES.filter(isLookAlikeMultiplier).map((tile) => tile.id);
  assert.deepEqual(lookAlikes, Array.from({ length: 26 }, (_, i) => `mult-${i + 5}`));
  for (const tile of TILES.filter(isLookAlikeMultiplier)) {
    assert.equal(tile.text, `${stem(tile.value)}a`, tile.id);
  }
  for (const id of ['mult-2', 'mult-3', 'mult-4', 'cmult-6', 'root-6', 'ring-cyclo']) {
    assert.equal(isLookAlikeMultiplier(tileById(id)), false, id);
  }
  assert.ok(ERROR_CODES.includes('MULT_AS_ROOT'));
}); // End of test 'the look-alike test comes from the lexicon…'

test('the report: `4 met il ciclo hexa 1 eno` → MULT_AS_ROOT first and alone, the `hexa` tile marked, no cascade', () => {
  const verdict = readName(REPORT_IDS);
  assert.equal(verdict.kind, 'invalid');
  assert.deepEqual(verdict.errors, [{ code: 'MULT_AS_ROOT', from: 4, to: 5, message: REPORT_MESSAGE }]);
  assert.equal(verdict.message, REPORT_MESSAGE);
  assert.equal(verdict.text, '4-metilciclohexa-1-eno'); // The name line as the student's tiles write it.
  assert.deepEqual(errorTileIndices(verdict.errors, REPORT_IDS.length), [4]); // Only `hexa` is marked, not `ciclo`.
  // Recovered: `hexa` is the ring's root, `1 eno` its ending, `4 metil` a prefix on it; the tree stays lossless.
  const { tree } = parse(REPORT_IDS);
  assert.equal(tree.items.length, 1);
  assert.deepEqual([tree.parent.chain.ring, tree.parent.chain.root, tree.parent.chain.segments.length], [3, 4, 1]);
  assert.deepEqual(leafIndices(tree), [0, 1, 2, 3, 4, 5, 6]);
  // The example is the student's own chain with the root: the fixed tiles read as the right name.
  const fixed = REPORT_IDS.map((id) => (id === 'mult-6' ? 'root-6' : id));
  const right = readName(fixed);
  assert.equal(right.kind, 'correct');
  assert.equal(right.text, '4-metilciclohex-1-eno');
}); // End of test 'the report: `4 met il ciclo hexa 1 eno`…'

test('the report: `octa ano` → MULT_AS_ROOT first and alone, `octa` marked, the example `octano`', () => {
  const ids = ['mult-8', 'ending-saturated'];
  const verdict = readName(ids);
  assert.equal(verdict.kind, 'invalid');
  const message = '«octa», de la fila «¿Cuántos?», dice cuántos grupos iguales hay (octametil). La raíz de ocho carbonos es «oct», '
    + 'de la fila «Raíces»: octano.';
  assert.deepEqual(verdict.errors, [{ code: 'MULT_AS_ROOT', from: 0, to: 1, message }]);
  assert.equal(verdict.message, message);
  assert.equal(parse(ids).tree.parent.chain.root, 0);
  assert.equal(readName(['root-8', 'ending-saturated']).kind, 'correct');
}); // End of test 'the report: `octa ano`…'

test('penta, undeca, icosa, triaconta: after `ciclo` and where a chain starts', () => {
  for (const n of [5, 11, 20, 30]) {
    const mult = multiplier(n);
    assertOnly(`ciclo ${mult} ano`, 1, expectedMessage(n, `ciclo${stem(n)}ano`));
    assertOnly(`${mult} ano`, 0, expectedMessage(n, `${stem(n)}ano`));
    // With an unsaturation ending, the sentence on the `a` the app adds (`ciclopenta-1,3-dieno`).
    assertOnly(`ciclo ${mult} 1 eno`, 1, expectedMessage(n, `ciclo${stem(n)}-1-eno`, `ciclo${stem(n)}a-1,3-dieno`));
    assertOnly(`${mult} 1 eno`, 0, expectedMessage(n, `${stem(n)}-1-eno`, `${stem(n)}a-1,3-dieno`));
    // In a prefix the example keeps the student's own ending: `undecil`.
    assertOnly(`${mult} il met ano`, 0, expectedMessage(n, `${stem(n)}il`));
  } // End of the loop over the four multipliers
  // The numbers above ten in digits, as the other messages write them.
  assert.match(expectedMessage(11, 'undecano'), /La raíz de 11 carbonos es «undec»/);
}); // End of test 'penta, undeca, icosa, triaconta…'

test('`tri` and `tetra` after `ciclo` name their root too (a ring of three or four); `di` keeps RING_ROOT', () => {
  assertOnly('ciclo tri ano', 1, expectedMessage(3, 'ciclopropano'));
  assertOnly('ciclo tetra il met ano', 1, expectedMessage(4, 'ciclobutil'));
  // No sentence on the `a` for them: `tri` is no `prop` + `a`.
  assertOnly('ciclo tri eno', 1, expectedMessage(3, 'ciclopropeno'));
  // `ciclo di ano`: a ring of two carbons cannot be, so the old message and its cascade stay.
  assert.deepEqual(errorsOf('ciclo di ano'), ['RING_ROOT[0,1)', 'NO_PARENT[0,3)', 'TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']);
  assert.match(readName(seq('ciclo di ano')).message, /^Después de «ciclo» va una raíz/);
  // `bis`… after `ciclo`: RING_ROOT too.
  assert.equal(errorsOf('ciclo bis ano')[0], 'RING_ROOT[0,1)');
}); // End of test '`tri` and `tetra` after `ciclo`…'

test('where a chain starts, only a look-alike counts: `tri ano`, `tetra ano` keep the multiplier hint', () => {
  for (const words of ['tri ano', 'tetra ano', 'di ano']) {
    assert.deepEqual(errorsOf(words), ['TILE_ORDER[0,1)', 'NO_PARENT[0,2)', 'TILE_ORDER[1,2)'], words);
    assert.match(readName(seq(words)).message, /^Esta ficha no puede ir aquí: «di», «tri»… van delante de una rama/, words);
  }
});

test('unchanged: a real multiplier (`hexametil`), a root left out (`1 3 di eno`), a multiplier with nothing after it', () => {
  assert.equal(readName(seq('hexa met il benceno')).kind, 'correct');
  assert.equal(readName(seq('hexa cloro benceno')).kind, 'correct');
  assert.deepEqual(errorsOf('1 2 3 4 5 6 hexa met il benceno'), []);
  assert.deepEqual(errorsOf('1 3 di eno'), ['TILE_ORDER[0,3)', 'NO_PARENT[0,4)', 'TILE_ORDER[3,4)']);
  // After numbers, a multiplier before an ending may count the numbers of a root left out (`deca-1,3,5,7,9-pentaeno`).
  assert.deepEqual(errorsOf('1 3 5 7 9 penta eno'), ['TILE_ORDER[0,6)', 'NO_PARENT[0,7)', 'TILE_ORDER[6,7)']);
  assert.deepEqual(errorsOf('2 hexa eno'), ['TILE_ORDER[0,2)', 'NO_PARENT[0,3)', 'TILE_ORDER[2,3)']);
  // Unfinished, while the student is still adding tiles: nothing follows the multiplier yet.
  assert.deepEqual(errorsOf('octa'), ['NO_PARENT[0,1)']);
  assert.deepEqual(errorsOf('2 hexa'), ['NO_PARENT[0,2)']);
  // Valid names with numbers before a look-alike multiplier, or a multiplied ending, keep reading without errors.
  for (const words of ['2 3 4 5 6 penta met il hex ano', '1 1 2 2 3 3 hexa cloro hex ano', 'but 1 3 di eno', 'hex 1 3 5 tri eno',
    'ciclo hex 1 3 di eno', 'dec 1 3 5 7 9 penta eno', 'di met il benceno', 'penta met il benceno']) {
    assert.deepEqual(errorsOf(words), [], words);
  }
}); // End of test 'unchanged: a real multiplier…'

/**
 * Reads tile words with MULT_AS_ROOT and the same words with the root tile
 * in the multiplier's place, and checks that the errors are the same but
 * for MULT_AS_ROOT: the recovered reading is the one the right tile gives.
 *
 * @param {string} words - Space-separated tile words with one multiplier taken for a root.
 * @param {number} at - Index of that multiplier.
 * @returns {{wrong: object, right: object}} The two readName() verdicts.
 */
function assertRecovered(words, at) {
  const ids = seq(words);
  const fixed = ids.map((id, i) => (i === at ? id.replace('mult-', 'root-') : id));
  const wrong = readName(ids);
  const right = readName(fixed);
  assert.equal(wrong.kind, 'invalid', words);
  const codes = (verdict) => (verdict.errors || []).map((e) => `${e.code}[${e.from},${e.to})`);
  assert.deepEqual(codes(wrong).filter((code) => code !== `MULT_AS_ROOT[${at},${at + 1})`), codes(right), words);
  assert.ok(codes(wrong).includes(`MULT_AS_ROOT[${at},${at + 1})`), words);
  return { wrong, right };
}

test('review of I-55: a multiplier of its own before the look-alike is kept (`di hexa il éter`), in every place', () => {
  const hexil = expectedMessage(6, 'hexil');
  for (const [words, at, kind] of [
    ['di hexa il éter', 1, 'alternative'], // `dihexil éter`
    ['2 3 di hexa il but ano', 3, 'otherName'], // a branch on a chain parent (`2,3-dihexilbutano`: a longer chain exists)
    ['di hexa il amina', 1, 'alternative'], // an amine's class name
    ['but ano di oato di hexa ilo', 5, 'correct'], // an ester's O-bound side (`dihexilo`)
    ['p di hexa il benceno', 2, 'alternative'], // after a letter and a multiplier
    ['hexa hexa il benceno', 1, 'correct'], // the first `hexa` counts the groups, the second is the root
  ]) {
    const { wrong, right } = assertRecovered(words, at);
    assert.deepEqual(wrong.errors.map((e) => e.code), ['MULT_AS_ROOT'], words); // errors[0], and no cascade
    assert.equal(wrong.message, words.endsWith('ilo') ? expectedMessage(6, 'hexilo') : hexil, words);
    assert.equal(right.kind, kind, words);
  } // End of the loop over the multiplied cases
  // The multiplier stays the prefix's: two hexyl groups on the ether's oxygen, read as the student meant them.
  const { tree } = parse(seq('di hexa il éter'));
  assert.deepEqual([tree.items.length, tree.items[0].multiplier, tree.items[0].substituent.root, tree.items[0].substituent.fv],
    [1, 0, 1, 2]);
  // A multiplier before a parent is a mistake of its own, the same as before the right root; MULT_AS_ROOT follows it.
  assertRecovered('di hexa ano', 1);
  assertRecovered('1 3 di hexa eno', 3);
  assert.deepEqual(errorsOf('di hexa ano'), ['TILE_ORDER[0,1)', 'MULT_AS_ROOT[1,2)']);
}); // End of test 'review of I-55: a multiplier of its own before the look-alike…'

test('review of I-55: after numbers, a branch\'s chain with its own endings before `il` (`6 penta 1 eno 3 il`)', () => {
  // The fixture `6-(pent-1-en-3-il)undecano`, with `penta` for `pent`.
  const { wrong, right } = assertRecovered('6 penta 1 eno 3 il undec ano', 1);
  assert.deepEqual(wrong.errors.map((e) => `${e.code}[${e.from},${e.to})`), ['MULT_AS_ROOT[1,2)']);
  assert.equal(wrong.message, expectedMessage(5, 'pent-1-en-3-il', 'penta-1,3-dieno'));
  assert.equal(right.kind, 'correct');
  assert.equal(right.text, '6-(pent-1-en-3-il)undecano');
  const prefix = parse(seq('6 penta 1 eno 3 il undec ano')).tree.items[0];
  assert.deepEqual([prefix.locants, prefix.substituent.root, prefix.substituent.segments.length, prefix.substituent.fv], [[0], 1, 1, 5]);
  // The other endings and the other branch endings.
  assertOnly('2 hexa ano oil but ano', 1, expectedMessage(6, 'hexanoil'));
  assertOnly('3 hexa 1 3 di eno 5 il non ano', 1, expectedMessage(6, 'hexa-1,3-dien-5-il', 'hexa-1,3-dieno'));
  assertRecovered('2 hexa ano il non ano', 1); // `ano` before `il` without a number: the same TILE_ORDER as with `hex`.
  // Without a branch ending after them, numbers before the multiplier still keep today's errors.
  assert.deepEqual(errorsOf('2 hexa 1 eno'), errorsOf('2 di 1 eno'));
}); // End of test 'review of I-55: after numbers, a branch's chain…'

test('a branch\'s root: alone, after its numbers, in a compound branch, in an ester\'s O-bound group, in class names', () => {
  const hexil = expectedMessage(6, 'hexil');
  assertOnly('hexa il met ano', 0, hexil);
  assertOnly('3 hexa il non ano', 1, hexil); // After the branch's numbers, before its `il`.
  assertOnly('hexa 2 il but ano', 0, expectedMessage(6, 'hexan-2-il'));
  assertOnly('START 2 met il hexa il END met ano', 4, hexil);
  assertOnly('START hexa il END met ano', 1, hexil);
  assertOnly('et ano oato hexa ilo', 3, expectedMessage(6, 'hexilo'));
  assertOnly('hexa il met il éter', 0, hexil);
  assertOnly('ácido hexa ano oico', 1, expectedMessage(6, 'hexano'));
  assertOnly('hexa ano oil oxi met ano', 0, expectedMessage(6, 'hexanoiloxi'));
  // A ring branch: `ciclo` then the multiplier.
  assertOnly('ciclo hexa il met ano', 1, expectedMessage(6, 'ciclohexil'));
  // Two multipliers read as roots: each its own error, in tile order.
  assert.deepEqual(errorsOf('N hexa il hexa ano amina'), ['MULT_AS_ROOT[1,2)', 'MULT_AS_ROOT[3,4)']);
  // First also before an error of a larger unit that holds the tile (the whole prefix, an open compound branch); an error
  // wholly before it keeps its place.
  assert.deepEqual(errorsOf('2 hexa il'), ['MULT_AS_ROOT[1,2)', 'ENDS_WITH_BRANCH[0,3)']);
  assert.deepEqual(errorsOf('2 START hexa il'), ['MULT_AS_ROOT[2,3)', 'BRANCH_OPEN[1,4)']);
  assert.deepEqual(errorsOf('2 3 hexa il non ano'), ['LOCANT_COUNT[0,2)', 'MULT_AS_ROOT[2,3)']);
}); // End of test 'a branch's root…'

test('the example: the student\'s chain, or the root with `ano` when the chain is unfinished or has another mistake', () => {
  // `ciclo hexa` alone: no ROOT_END on top (the example shows the ending), no NO_PARENT.
  assertOnly('ciclo hexa', 1, expectedMessage(6, 'ciclohexano'));
  // A locant count mistake inside the chain: the example does not repeat it, and that error follows.
  const counted = readName(seq('ciclo hexa 1 2 eno'));
  assert.deepEqual(counted.errors.map((e) => e.code), ['MULT_AS_ROOT', 'LOCANT_COUNT']);
  assert.equal(counted.message, expectedMessage(6, 'ciclohexano', 'ciclohexa-1,3-dieno'));
  // A multiplied first ending: the example is the right name, and the next sentence says where its `a` comes from.
  assertOnly('ciclo hexa 1 3 di eno', 1, expectedMessage(6, 'ciclohexa-1,3-dieno', 'ciclohexa-1,3-dieno'));
  assertOnly('hexa 1 eno 3 ino', 0, expectedMessage(6, 'hex-1-en-3-ino', 'hexa-1,3-dieno'));
  // The name line keeps the student's tiles: the `a` the app adds shows doubled after `hexa`.
  assert.equal(assemble(parse(seq('ciclo hexa 1 3 di eno')).tree).text, 'ciclohexaa-1,3-dieno');
  // A ring with `ciclo hexa` followed by a branch: the ring's root, then the name's own error.
  assert.deepEqual(errorsOf('ciclo hexa met il'), ['MULT_AS_ROOT[1,2)', 'ENDS_WITH_BRANCH[2,4)']);
}); // End of test 'the example…'

test('the message names the dialog rows by their labels', () => {
  const label = (id) => ROWS.find((row) => row.id === tileById(id).row).label;
  assert.equal(label('mult-6'), '¿Cuántos?');
  assert.equal(label('root-6'), 'Raíces');
  assert.ok(REPORT_MESSAGE.includes(`de la fila «${label('mult-6')}»`) && REPORT_MESSAGE.includes(`de la fila «${label('root-6')}»`));
});

test('the tokenizer never reads a multiplier as a root: right names keep their root tiles', () => {
  assert.deepEqual(tokenize('ciclohexa-1,3-dieno'), ['ring-cyclo', 'root-6', 'num-1', 'num-3', 'mult-2', 'ending-double']);
  assert.deepEqual(tokenize('octano'), ['root-8', 'ending-saturated']);
  assert.deepEqual(tokenize('hexametilbenceno'), ['mult-6', 'root-1', 'fv-1', 'ring-benzene']);
});
