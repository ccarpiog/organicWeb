/**
 * @file Unit tests for the search of left-out locants of «¿Cómo se
 * dibuja?» (src/reverse/search.js, design.md §15.5.3 steps 2–4, §15.7,
 * phase R-1c): domains by role, identical occurrences as multisets,
 * incremental pruning by valence and free bonds, the merge of symmetric
 * placements by structural key, the reasons when nothing fits, the budget
 * (placements, namings, injected clock, also after the last naming), the
 * naming cache with refusals and the graph each naming refers to, and the
 * filled tree written back by the assembler; rings (R-4a): ring bonds with
 * the closing one, the ring merge and pruning, the ring limit.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { assemble } from '../../src/reverse/assemble.js';
import {
  searchStructures, slotGroups, filledTree, slotDomain, ROLE_DOMAINS, SEARCH_BUDGET,
} from '../../src/reverse/search.js';
import { nameMolecule } from '../../src/naming/index.js';
import { canonicalKey } from '../../src/model/graph.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { MESSAGES } from '../../src/model/validate.js';
import { seq } from './reverse-words.js';

/**
 * The tree and NameSpec of tile words.
 *
 * @param {string} words - Space-separated tile words (reverse-words.js).
 * @returns {{tree: object, spec: object}} The error-free tree and its reading.
 */
function read(words) {
  const { tree, errors } = parse(seq(words));
  assert.deepEqual(errors, [], words);
  return { tree, spec: interpret(tree) };
}

/**
 * Searches tile words with the real engine.
 *
 * @param {string} words - Space-separated tile words.
 * @param {object} [options] - Extra searchStructures() options.
 * @returns {object} The search result.
 */
function search(words, options = {}) {
  return searchStructures(read(words).spec, { namer: nameMolecule, ...options });
}

/**
 * Each structure's name and placements.
 *
 * @param {object} result - A complete search result.
 * @returns {[string, number[][]][]} `[name, placements]` per structure, in the order found.
 */
function summary(result) {
  return result.structures.map((s) => [s.naming.name, s.placements]);
}

test('domains by role: carbons 1…n, chain bonds 1…n−1, ring bonds 1…n; interpret.js takes them from search.js', () => {
  assert.deepEqual(Object.keys(ROLE_DOMAINS).sort(), ['bond', 'carbon', 'ringBond']);
  assert.deepEqual(slotDomain('carbon', 5), [1, 5]);
  assert.deepEqual(slotDomain('bond', 5), [1, 4]);
  assert.deepEqual(slotDomain('bond', 1), [1, 0], 'no bond on a one-carbon chain');
  assert.deepEqual(slotDomain('ringBond', 6), [1, 6], 'bond 6 of a six-carbon ring joins carbons 6 and 1');
  assert.throws(() => slotDomain('ring', 6), /unknown slot role/);
  const { spec } = read('met il hex eno');
  assert.deepEqual(spec.leftOut.map((slot) => [slot.role, slot.domain]), [['carbon', slotDomain('carbon', 6)], ['bond', slotDomain('bond', 6)]]);
  const ring = read('met il ciclo hex eno').spec;
  assert.deepEqual(ring.leftOut.map((slot) => [slot.role, slot.domain]), [['carbon', [1, 6]], ['ringBond', [1, 6]]]);
}); // End of test 'domains by role: carbons 1…n, chain bonds 1…n−1, ring bonds 1…n; interpret.js takes them from search.js'

test('identical occurrences: the slots of one prefix or one segment form a group, in tile order', () => {
  // 0:di 1:met 2:il 3:et 4:il 5:hex 6:di 7:eno
  assert.deepEqual(slotGroups(read('di met il et il hex di eno').spec), [
    { role: 'carbon', distinct: false, domain: [1, 6], indices: [0, 1], tiles: [0, 3] },
    { role: 'carbon', distinct: false, domain: [1, 6], indices: [2], tiles: [3, 5] },
    { role: 'bond', distinct: true, domain: [1, 5], indices: [3, 4], tiles: [6, 8] },
  ]);
  // A compound branch: the outer prefix first, then the branch's own prefix on its chain.
  // 0:START 1:met 2:il 3:but 4:il 5:END 6:non 7:ano
  assert.deepEqual(slotGroups(read('START met il but il END non ano').spec).map((g) => [g.domain, g.indices, g.tiles]),
    [[[1, 9], [0], [0, 6]], [[1, 4], [1], [1, 3]]]);
  assert.deepEqual(slotGroups(read('2 3 di met il pent ano').spec), [], 'no left-out slot');
}); // End of test 'identical occurrences: the slots of one prefix or one segment form a group, in tile order'

test('multisets: a multiplied prefix is enumerated as combinations with repetition, never as permutations', () => {
  const result = search('di met il pent ano');
  assert.equal(result.status, 'complete');
  assert.equal(result.placements, 15, 'C(5 + 2 − 1, 2) sorted pairs, not 25 ordered ones');
  const all = result.structures.flatMap((s) => s.placements);
  assert.equal(all.length, 15);
  assert.ok(all.every(([a, b]) => a <= b));
  assert.deepEqual(summary(result), [
    ['2-metilhexano', [[1, 1], [1, 4], [2, 5], [5, 5]]],
    ['3-metilhexano', [[1, 2], [1, 3], [3, 5], [4, 5]]],
    ['heptano', [[1, 5]]],
    ['2,2-dimetilpentano', [[2, 2], [4, 4]]],
    ['2,3-dimetilpentano', [[2, 3], [3, 4]]],
    ['2,4-dimetilpentano', [[2, 4]]],
    ['3,3-dimetilpentano', [[3, 3]]],
  ]);
  assert.equal(result.namings, 7, 'each structure named once');
}); // End of test 'multisets: a multiplied prefix is enumerated as combinations with repetition…'

test('multiple bonds: increasing values (two never share a bond), pruned by valence before building', () => {
  const dienes = search('hex di eno');
  assert.equal(dienes.placements, 10, 'C(5, 2): cumulated double bonds fit');
  assert.ok(dienes.structures.flatMap((s) => s.placements).every(([a, b]) => a < b));
  const diynes = search('hex di ino');
  assert.equal(diynes.placements, 6, 'two triple bonds on one carbon are pruned, never built');
  assert.deepEqual(summary(diynes), [
    ['hexa-1,3-diino', [[1, 3], [3, 5]]], ['hexa-1,4-diino', [[1, 4], [2, 5]]], ['hexa-1,5-diino', [[1, 5]]], ['hexa-2,4-diino', [[2, 4]]],
  ]);
  // The supplied double bond takes bond 1 and part of carbon 2's valence.
  assert.deepEqual(summary(search('hex 1 eno ino')).map(([name]) => name), ['hex-1-en-3-ino', 'hex-1-en-4-ino', 'hex-1-en-5-ino']);
}); // End of test 'multiple bonds: increasing values (two never share a bond), pruned by valence before building'

test('incremental pruning: a crowded prefix finds its one placement without building any other', () => {
  const full = search('hexa met il et ano');
  assert.equal(full.placements, 1);
  assert.deepEqual(summary(full), [['2,2,3,3-tetrametilbutano', [[1, 1, 1, 2, 2, 2]]]]);
  const iliden = search('met iliden prop ano');
  assert.deepEqual(summary(iliden), [['but-1-eno', [[1], [3]]], ['2-metilprop-1-eno', [[2]]]], 'an iliden takes two valences');
}); // End of test 'incremental pruning: a crowded prefix finds its one placement without building any other'

test('symmetric placements are merged by structural key, in the order first found', () => {
  const result = search('met il prop ano');
  assert.deepEqual(summary(result), [['butano', [[1], [3]]], ['2-metilpropano', [[2]]]]);
  for (const structure of result.structures) {
    assert.equal(structure.key, canonicalKey(structure.built.molecule));
    assert.equal(structure.built.ok, true);
  }
  assert.equal(result.structures[1].key, canonicalKey(parseSmiles('CC(C)C')));
  // A branch's own left-out locant is searched on the branch's chain.
  const branch = search('START met il but il END non ano');
  assert.equal(branch.structures.length, 20);
  assert.deepEqual(branch.structures[0].placements, [[1, 1], [9, 1]]);
  // No left-out slot: one placement.
  assert.deepEqual(summary(search('2 met il pent ano')), [['2-metilpentano', [[]]]]);
}); // End of test 'symmetric placements are merged by structural key, in the order first found'

test('nothing fits: crowded bonds, no room, supplied locants overloading a carbon, a chain past the caps', () => {
  // 0:prop 1:tri 2:eno (a stopped clock at 0: the deadline is the time budget itself)
  assert.deepEqual(search('prop tri eno', { now: () => 0 }), {
    status: 'none', structures: [], placements: 0, namings: 0, deadline: SEARCH_BUDGET.ms,
    error: { code: 'SAME_BOND', message: 'No caben tantos enlaces múltiples: la cadena de 3 carbonos solo tiene 2 enlaces entre carbonos.', tiles: [1, 3] },
  });
  assert.equal(search('et di eno').error.message, 'No caben tantos enlaces múltiples: la cadena de 2 carbonos solo tiene 1 enlace entre carbonos.');
  // 0:hepta 1:met 2:il 3:et 4:ano
  const none = search('hepta met il et ano');
  assert.deepEqual([none.status, none.placements, none.error], ['none', 0, {
    code: 'VALENCE', message: 'No caben: pongas donde pongas lo que va sin número, algún carbono tendría más de 4 enlaces.', tiles: [0, 3],
  }]);
  // 0:2 1:2 2:2 3:tri 4:met 5:il 6:met 7:il 8:prop 9:ano: the supplied 2,2,2 already overload carbon 2.
  assert.deepEqual(search('2 2 2 tri met il met il prop ano').error,
    { code: 'VALENCE', message: 'El carbono 2 tendría 5 enlaces, y un carbono solo puede tener 4.', tiles: [2, 3] });
  // A 30-carbon branch on ethane is a chain of 32 wherever it goes.
  assert.deepEqual(search('triacont il et ano').error, { code: 'TOO_BIG', message: MESSAGES.TOO_BIG, tiles: [0, 4] });
  // Only the ends lengthen the chain: those placements are dropped, the others kept.
  const capped = search('met il triacont ano');
  assert.deepEqual([capped.status, capped.placements, capped.structures.length], ['complete', 30, 14]);
  // Definite errors of the supplied locants come first.
  assert.equal(search('7 met il prop eno').error.code, 'LOCANT_RANGE');
}); // End of test 'nothing fits: crowded bonds, no room, supplied locants overloading a carbon, a chain past the caps'

test('budget: placements, namings and the injected clock end the search as budget, never as a verdict', () => {
  assert.deepEqual(SEARCH_BUDGET, { placements: 3000, namings: 200, ms: 1500 });
  assert.ok(Object.isFrozen(SEARCH_BUDGET));
  const placements = search('met il pent ano', { budget: { placements: 2 } });
  assert.deepEqual([placements.status, placements.placements, placements.namings], ['budget', 2, 0]);
  assert.equal(search('met il pent ano', { budget: { placements: 5 } }).status, 'complete', 'exactly enough');
  const namings = search('met il pent ano', { budget: { namings: 1 } });
  assert.deepEqual([namings.status, namings.namings], ['budget', 1]);
  assert.equal(namings.structures[1].naming, null, 'not named past the budget');
  // A clock that advances one millisecond per reading.
  let tick = 0;
  /**
   * The injected clock.
   *
   * @returns {number} Milliseconds.
   */
  const now = () => {
    tick += 1;
    return tick;
  };
  assert.equal(search('di met il pent ano', { now, budget: { ms: 5 } }).status, 'budget');
  tick = 0;
  assert.equal(search('met il prop ano', { now, budget: { ms: 1000 } }).status, 'complete');
  assert.equal(search('met il prop ano', { now: () => 0, budget: { ms: 0 } }).status, 'complete', 'a stopped clock never runs out');
  // The last naming spends the time left: checked once more after it, so budget, never complete.
  let clock = 0;
  /**
   * The engine, taking 100 ms on the injected clock.
   *
   * @param {object} mol - A molecule.
   * @returns {object} nameMolecule()'s result.
   */
  const slow = (mol) => {
    clock = 100;
    return nameMolecule(mol);
  };
  const late = search('met il et ano', { now: () => clock, namer: slow, budget: { ms: 5 } });
  assert.deepEqual([late.status, late.namings, late.deadline], ['budget', 1, 5]);
}); // End of test 'budget: placements, namings and the injected clock end the search as budget, never as a verdict'

test('naming cache by structural key: shared between searches; refusals are cached and returned too', () => {
  const cache = new Map();
  let calls = 0;
  /**
   * The engine, counting its calls.
   *
   * @param {object} mol - A molecule.
   * @returns {object} nameMolecule()'s result.
   */
  const namer = (mol) => {
    calls += 1;
    return nameMolecule(mol);
  };
  const first = search('met il prop ano', { namer, cache });
  assert.deepEqual([first.namings, calls, cache.size], [2, 2, 2]);
  const second = search('met il prop ano', { namer, cache });
  assert.deepEqual([second.namings, calls], [0, 2], 'every structure from the cache');
  assert.equal(second.structures[1].naming, first.structures[1].naming);
  // Each entry keeps a private copy of the graph named, whose ids the naming cites; every search sharing it gets it.
  const entry = cache.get(first.structures[1].key);
  assert.deepEqual(Object.keys(entry).sort(), ['molecule', 'naming']);
  assert.equal(entry.naming, first.structures[1].naming);
  assert.notEqual(entry.molecule, first.structures[1].built.molecule);
  assert.deepEqual(entry.molecule, first.structures[1].built.molecule);
  assert.equal(first.structures[1].molecule, entry.molecule);
  assert.equal(second.structures[1].molecule, entry.molecule, 'the graph named first, not this search\'s build');
  assert.equal(search('2 met il prop ano', { namer, cache }).namings, 0, 'isobutane is already named');
  const refusal = { ok: false, error: { code: 'X', message: 'm' } };
  const refused = search('met il prop ano', { namer: () => refusal });
  assert.deepEqual(refused.structures.map((s) => s.naming), [refusal, refusal]);
  assert.equal(refused.status, 'complete');
}); // End of test 'naming cache by structural key: shared between searches; refusals are cached and returned too'

test('filledTree: the placement written into the student\'s tree, assembled by assemble.js', () => {
  /**
   * The student's text with a placement filled in.
   *
   * @param {string} words - Tile words.
   * @param {number[]} placement - One value per left-out slot.
   * @returns {string} The filled text.
   */
  const filled = (words, placement) => {
    const { tree, spec } = read(words);
    const count = tree.tiles.length;
    const text = assemble(filledTree(tree, spec, placement)).text;
    assert.equal(tree.tiles.length, count, 'the student\'s tree is untouched');
    return text;
  };
  assert.equal(filled('di met il pent ano', [2, 3]), '2,3-dimetilpentano');
  assert.equal(filled('di met il pent ano', [3, 3]), '3,3-dimetilpentano');
  assert.equal(filled('met il hex eno', [5, 2]), '5-metilhex-2-eno');
  assert.equal(filled('but di eno', [1, 3]), 'buta-1,3-dieno');
  assert.equal(filled('hex 1 eno ino', [3]), 'hex-1-en-3-ino');
  assert.equal(filled('START met il but il END non ano', [5, 3]), '5-(3-metilbutil)nonano');
  assert.equal(filled('prop ano 2 il hept ano', [4]), '4-(propan-2-il)heptano');
  assert.equal(filled('met il 2 but eno', [2]), '2-metil-2-buteno', 'old-style locants stay where the student put them');
  // A slot with one possible value is no missing locant: never written.
  assert.equal(filled('2 et eno il prop ano', [1]), '2-etenilpropano');
  assert.equal(filled('et eno', [1]), 'eteno');
  assert.equal(filled('met il et ino', [2, 1]), '2-metiletino');
}); // End of test 'filledTree: the placement written into the student's tree, assembled by assemble.js'

test('rings (R-4a): ring bonds 1…n with the closing bond, symmetric placements merged, multisets pruned by valence', () => {
  // Every carbon and every bond of an unsubstituted ring is alike: one structure each.
  const methyl = search('met il ciclo hex ano');
  assert.deepEqual(summary(methyl), [['metilciclohexano', [[1], [2], [3], [4], [5], [6]]]]);
  const ene = search('ciclo hex eno');
  assert.deepEqual(summary(ene), [['ciclohexeno', [[1], [2], [3], [4], [5], [6]]]], 'bond 6 (6–1) is a ring bond too');
  // Two methyls on a ring: combinations with repetition (21), four structures.
  const dimethyl = search('di met il ciclo hex ano');
  assert.equal(dimethyl.placements, 21);
  assert.deepEqual(summary(dimethyl).map(([name, placements]) => [name, placements.length]), [
    ['1,1-dimetilciclohexano', 6], ['1,2-dimetilciclohexano', 6], ['1,3-dimetilciclohexano', 6], ['1,4-dimetilciclohexano', 3],
  ]);
  // Double bonds: increasing values, the closing bond included (1 and 6 are cumulated at carbon 1).
  const dienes = search('ciclo hex di eno');
  assert.equal(dienes.placements, 15, 'C(6, 2)');
  assert.deepEqual(summary(dienes).map(([name]) => name), ['ciclohexa-1,2-dieno', 'ciclohexa-1,3-dieno', 'ciclohexa-1,4-dieno']);
  assert.ok(dienes.structures[0].placements.some(([a, b]) => a === 1 && b === 6));
  // Two triple bonds never share a carbon, also across the closing bond.
  assert.ok(search('ciclo oct di ino').structures.flatMap((s) => s.placements).every(([a, b]) => b - a > 1 && !(a === 1 && b === 8)));
  // A full ring (two methyls on every carbon) has one placement, found without building any other.
  const full = search('dodeca met il ciclo hex ano');
  assert.equal(full.placements, 1);
  assert.deepEqual(summary(full), [['1,1,2,2,3,3,4,4,5,5,6,6-dodecametilciclohexano', [[1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]]]]);
  // A ring branch's own left-out bond is searched on its ring: `(ciclohexenil)metano`.
  const branch = search('ciclo hex eno il met ano');
  assert.deepEqual(summary(branch).map(([name, placements]) => [name, placements.length]),
    [['1-metilciclohex-1-eno', 2], ['3-metilciclohex-1-eno', 2], ['4-metilciclohex-1-eno', 2]]);
}); // End of test 'rings (R-4a): ring bonds 1…n with the closing bond, symmetric placements merged…'

test('rings (R-4a): crowded ring bonds, no room on a ring, and the ring limit (status none, never a crash)', () => {
  // 0:ciclo 1:prop 2:tetra 3:eno
  assert.deepEqual(search('ciclo prop tetra eno').error, {
    code: 'SAME_BOND', message: 'No caben tantos enlaces múltiples: el anillo de 3 carbonos solo tiene 3 enlaces entre carbonos.', tiles: [2, 4],
  });
  assert.equal(search('ciclo prop tri eno').status, 'complete', 'three double bonds fit on three ring bonds');
  assert.equal(search('trideca met il ciclo hex ano').error.code, 'VALENCE', 'thirteen methyls on six ring carbons');
  // Two rings bonded straight together have no structural key: refused, not searched.
  const bonded = search('ciclo hex il ciclo hex ano');
  assert.deepEqual([bonded.status, bonded.placements, bonded.error.code], ['none', 0, 'RING_SYSTEM']);
  assert.equal(search('tri ciclo hex il met ano').error.code, 'RING_SYSTEM');
}); // End of test 'rings (R-4a): crowded ring bonds, no room on a ring, and the ring limit…'

test('filledTree (R-4a): ring bonds and ring carbons written back', () => {
  /**
   * The student's text with a placement filled in.
   *
   * @param {string} words - Tile words.
   * @param {number[]} placement - One value per left-out slot.
   * @returns {string} The filled text.
   */
  const filled = (words, placement) => {
    const { tree, spec } = read(words);
    return assemble(filledTree(tree, spec, placement)).text;
  };
  assert.equal(filled('ciclo hex eno', [1]), 'ciclohex-1-eno');
  assert.equal(filled('3 met il ciclo hex eno', [1]), '3-metilciclohex-1-eno');
  assert.equal(filled('di met il ciclo hex ano', [1, 3]), '1,3-dimetilciclohexano');
  assert.equal(filled('ciclo hex di eno', [1, 3]), 'ciclohexa-1,3-dieno');
  assert.equal(filled('2 ciclo hex eno il prop ano', [2]), '2-(ciclohex-2-enil)propano');
  assert.equal(filled('met il ciclo hex il met ano', [1, 1]), 'metil(ciclohexil)metano', 'methane\'s one carbon is never written');
}); // End of test 'filledTree (R-4a): ring bonds and ring carbons written back'
