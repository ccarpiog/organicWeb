/**
 * @file Unit tests for the Spanish lexicon (src/naming/lexicon.es.js) and
 * the locant-list comparator (src/naming/numbering.js).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stem, multiplier, compoundMultiplier, unsaturationEnding, needsConnectingVowel, omitsLocants,
  alkylPrefix, groupName, prefixForm, substituentUnsaturationEnding, retainedPrefix, commonGroupName, styleLabel,
} from '../../src/naming/lexicon.es.js';
import { compareLocantLists } from '../../src/naming/numbering.js';

/**
 * Builds a minimal chain structure for lexicon rules.
 *
 * @param {number} length - Chain length.
 * @param {number[]} double - Double-bond locants.
 * @param {number[]} triple - Triple-bond locants.
 * @returns {object} The chain-like object.
 */
function chain(length, double, triple) {
  return { length, double: double.map((locant) => ({ locant })), triple: triple.map((locant) => ({ locant })) };
}

test('stems 1–30', () => {
  assert.equal(stem(1), 'met');
  assert.equal(stem(11), 'undec');
  assert.equal(stem(20), 'icos');
  assert.equal(stem(21), 'henicos');
  assert.equal(stem(30), 'triacont');
  assert.throws(() => stem(0), RangeError);
  assert.throws(() => stem(31), RangeError);
});

test('simple and compound multipliers', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 9, 10, 11, 12, 20].map(multiplier), [
    '', 'di', 'tri', 'tetra', 'penta', 'nona', 'deca', 'undeca', 'dodeca', 'icosa',
  ]);
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(compoundMultiplier), ['', 'bis', 'tris', 'tetrakis', 'pentakis', 'hexakis']);
});

test('multipliers above 30 are composed (independent of the 30-carbon stem cap)', () => {
  assert.deepEqual([30, 31, 32, 33, 38, 40, 41, 60, 99].map(multiplier), [
    'triaconta', 'hentriaconta', 'dotriaconta', 'tritriaconta', 'octatriaconta', 'tetraconta',
    'hentetraconta', 'hexaconta', 'nonanonaconta',
  ]);
  assert.equal(compoundMultiplier(32), 'dotriacontakis');
  assert.throws(() => multiplier(0), RangeError);
  assert.throws(() => multiplier(100), RangeError);
  assert.throws(() => stem(32), RangeError); // parent stems stay capped at 30
});

test('endings, en/ino elision and the connecting a', () => {
  assert.equal(unsaturationEnding('double', true), 'eno');
  assert.equal(unsaturationEnding('double', false), 'en');
  assert.equal(unsaturationEnding('triple', true), 'ino');
  assert.equal(needsConnectingVowel(chain(4, [1, 3], [])), true); // buta-1,3-dieno
  assert.equal(needsConnectingVowel(chain(6, [1, 3], [5])), true); // hexa-1,3-dien-5-ino
  assert.equal(needsConnectingVowel(chain(6, [1], [3, 5])), false); // hex-1-en-3,5-diino
  assert.equal(needsConnectingVowel(chain(8, [], [1, 7])), true); // octa-1,7-diino
  assert.equal(needsConnectingVowel(chain(4, [1], [])), false); // but-1-eno
  assert.equal(needsConnectingVowel(chain(4, [], [])), false); // butano
});

test('locant-omission table', () => {
  assert.equal(omitsLocants(chain(2, [1], []), false), true);
  assert.equal(omitsLocants(chain(3, [1, 2], []), false), true);
  assert.equal(omitsLocants(chain(3, [], [1]), false), true);
  assert.equal(omitsLocants(chain(4, [1], []), false), false); // but-1-eno
  assert.equal(omitsLocants(chain(3, [1], []), true), false); // 2-metilprop-1-eno
});

test('group name vs prefix forms', () => {
  assert.equal(alkylPrefix(1), 'metil');
  assert.equal(alkylPrefix(2, 2), 'etiliden');
  assert.equal(groupName('metil'), 'metilo');
  assert.equal(groupName('metiliden'), 'metilideno');
  assert.equal(groupName('isopropil'), 'isopropilo');
  assert.equal(prefixForm('etilo'), 'etil');
});

test('substituent-prefix morphology, retained and common names, style labels', () => {
  assert.equal(substituentUnsaturationEnding('double'), 'en');
  assert.equal(substituentUnsaturationEnding('triple'), 'in');
  assert.deepEqual({ ...retainedPrefix('isopropyl') }, { italic: '', text: 'isopropil' });
  assert.deepEqual({ ...retainedPrefix('tert-butyl') }, { italic: 'tert-', text: 'butil' });
  assert.throws(() => retainedPrefix('neopentyl'));
  assert.equal(commonGroupName('vinyl'), 'vinilo');
  assert.equal(commonGroupName('allyl'), 'alilo');
  assert.equal(commonGroupName('unknown'), null);
  assert.equal(styleLabel('pin'), 'nombre preferido por la IUPAC (2013)');
  assert.equal(styleLabel('substituted'), 'forma sistemática clásica');
});

test('locant lists compare term by term, never by sums', () => {
  assert.ok(compareLocantLists([1, 3], [2, 4]) < 0);
  assert.ok(compareLocantLists([1, 4], [2, 3]) < 0); // equal sums
  assert.ok(compareLocantLists([2, 3], [1, 4]) > 0);
  assert.ok(compareLocantLists([1, 1, 4], [1, 2, 2]) < 0); // repeated locants kept
  assert.equal(compareLocantLists([1, 3, 5], [1, 3, 5]), 0);
  assert.equal(compareLocantLists([], []), 0);
});
