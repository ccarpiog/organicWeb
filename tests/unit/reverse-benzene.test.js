/**
 * @file Unit tests for benzene in «¿Cómo se dibuja?» (src/reverse/, design.md
 * §15.5.3, §15.7, §15.8 R-4, §15.9 trap 3; phase I-50b, R-4b): the
 * aromatic-equivalence key (model/graph.js aromaticKey(),
 * aromaticIsomorphism(), kekuleNeutral()) — both Kekulé drawings of every
 * benzene ring one structure, every other key unchanged —; `benceno`
 * parents with branch prefixes and `fenil` / `(4-metilfenil)` branches read
 * by readName(): the worked cases with the molecule each describes (compared
 * by aromatic key, never only by name), the fixture round trip over the
 * branch-only rows of the I-28 and I-42a benzene sections of
 * tests/fixtures/names.tsv (with their retained-template and orto/meta/para
 * alternatives since I-50c, R-4c), the closed loop over the oracle's benzene
 * generators (generateBenzenes() and randomBenzene() without halogens or
 * alkoxy groups — the halogens have their own round trip and closed loop
 * since I-51a1, reverse-halogens.test.js, the alkoxy groups since I-51b1,
 * reverse-ethers.test.js; pure imports, no Java) with
 * removed-locant mutations, other mutations with their diagnosis (I-50d),
 * the names the app cannot draw, the ordered drawing and time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName, VERDICT_TEXTS } from '../../src/reverse/index.js';
import { parse, pairLetter } from '../../src/reverse/parse.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { SEARCH_BUDGET } from '../../src/reverse/search.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { parseSmiles } from '../../src/model/smiles.js';
import {
  canonicalKey, aromaticKey, aromaticIsomorphism, isomorphism, kekuleNeutral, benzeneRingBonds, cyclomaticNumber, AROMATIC_ORDER,
} from '../../src/model/graph.js';
import { cloneMolecule } from '../../src/model/molecule.js';
import { RING_SYSTEM_MESSAGES, validateForNaming } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { generateBenzenes, randomBenzene, seededRandom, randomInt } from '../../scripts/oracle/generate.mjs';
import {
  seq, readFixtures, isMonocyclicHydrocarbon, isHalogenDerivative, isBenzeneName, isTemplateName, isEther,
} from './reverse-words.js';

/** Benzene hydrocarbon fixture rows (the I-28 and I-42a sections; as in reverse-tokenize.test.js). */
const EXPECTED_ROWS = 26;

/**
 * Their names and alternatives, every one read back as correct /
 * alternative: 32 written with the R-4b tiles, and since I-50c (R-4c) the 22
 * written with a retained template or an orto/meta/para letter (`tolueno`
 * ×2, `estireno`, the eight xylene forms, `mesitileno`, `o-` / `m-` /
 * `p-dimetilbenceno` with the second Kekulé drawing of the 1,2 row,
 * `p-dietenilbenceno`, `o-diisopropilbenceno`; since I-54b the o/m/p forms of
 * two different prefixes, `p-isopropilmetilbenceno` in its three prefix
 * styles and `p-tert-butilmetilbenceno`). None is skipped.
 */
const EXPECTED_COVERED = 54;

/** Of them, the names written with R-4c tiles. */
const EXPECTED_TEMPLATE_NAMES = 22;

/**
 * The I-42a rows with alkoxy prefixes, read back by the ether round trip
 * since I-51b1 (R-5b1, reverse-ethers.test.js; those with halogens only
 * by reverse-halogens.test.js since I-51a1, R-5a1): none is left out; three
 * since I-54a added `1-etoxi-4-metilbenceno`.
 */
const EXPECTED_ETHER_ROWS = 3;

/**
 * The I-42a rows with halogens only, read back by the halogen round trip
 * (reverse-halogens.test.js); eleven since I-54a added
 * `1-cloro-4-(clorometil)benceno`, `1-cloro-4-metilbenceno` and
 * `1-cloro-3-isopropilbenceno`.
 */
const EXPECTED_HALOGEN_ROWS = 11;

/** Average time budget of one readName() call, in milliseconds (design.md §15.7; phones are slower). */
const AVERAGE_BUDGET_MS = 50;

/** Time budget of one representative benzene readName() call, in milliseconds. */
const PER_NAME_BUDGET_MS = 250;

/**
 * Reads tile words.
 *
 * @param {string} words - Space-separated tile words (reverse-words.js).
 * @param {object} [options] - readName() options.
 * @returns {object} The verdict.
 */
function read(words, options) {
  return readName(seq(words), options);
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
 * The other Kekulé drawing of a molecule: every bond of its benzene rings
 * with its order swapped (double ↔ single), ids kept.
 *
 * @param {object} mol - A molecule.
 * @returns {object} The copy.
 */
function otherDrawing(mol) {
  const copy = cloneMolecule(mol);
  for (const id of benzeneRingBonds(mol)) {
    const bond = copy.bonds.get(id);
    bond.order = 3 - bond.order;
  }
  return copy;
}

/**
 * Tells whether a molecule has a structural key (canonicalKey() handles it).
 *
 * @param {object} mol - A molecule.
 * @returns {boolean} True when keyed.
 */
function keyed(mol) {
  try {
    canonicalKey(mol);
    return true;
  } catch (err) {
    return false;
  }
}

test('aromatic key: both Kekulé drawings of a benzene ring give one key and an isomorphism; canonicalKey() still tells them apart', () => {
  // `1,2-dimetilbenceno` with the methyls on a double bond, and on a single one.
  const onDouble = parseSmiles('CC1=C(C)C=CC=C1');
  const onSingle = parseSmiles('CC1=CC=CC=C1C');
  assert.notEqual(canonicalKey(onDouble), canonicalKey(onSingle));
  assert.equal(aromaticKey(onDouble), aromaticKey(onSingle));
  assert.equal(isomorphism(onDouble, onSingle), null);
  const iso = aromaticIsomorphism(onDouble, onSingle);
  assert.ok(iso);
  assert.equal(iso.atoms.size, onDouble.atoms.size);
  assert.equal(iso.bonds.size, onDouble.bonds.size);
  // Isomers stay apart; the ring bonds read `:` in the key.
  assert.notEqual(keyOf('CC1=CC=CC=C1C'), keyOf('CC1=CC(C)=CC=C1'));
  assert.notEqual(keyOf('CC1=CC=CC=C1C'), keyOf('CC1=CC=C(C)C=C1'));
  assert.equal(aromaticIsomorphism(parseSmiles('CC1=CC=CC=C1C'), parseSmiles('CC1=CC(C)=CC=C1')), null);
  assert.match(keyOf('C1=CC=CC=C1'), /^%R6:(?:C\(\):){6}$/);
  // Both rings of a two-ring ester, and a phenyl branch.
  assert.equal(keyOf('C1=CC=CC=C1OC(=O)C1C=CC=CC=1'), keyOf('C1C=CC=CC=1OC(=O)C1=CC=CC=C1'));
  assert.equal(keyOf('OCC1=C(C)C=CC=C1'), keyOf('OCC1=CC=CC=C1C'));
  // The view: aromatic bonds at AROMATIC_ORDER, the rest and every id kept; no copy without a benzene ring.
  const view = kekuleNeutral(onDouble);
  assert.notEqual(view, onDouble);
  assert.deepEqual([...view.bonds.values()].filter((b) => b.order === AROMATIC_ORDER).length, 6);
  assert.deepEqual([...view.bonds.keys()], [...onDouble.bonds.keys()]);
  assert.ok([...onDouble.bonds.values()].every((b) => b.order !== AROMATIC_ORDER), 'the molecule itself is untouched');
  const hexane = parseSmiles('C1CCCCC1');
  assert.equal(kekuleNeutral(hexane), hexane);
}); // End of test 'aromatic key: both Kekulé drawings of a benzene ring give one key…'

test('aromatic key: only six-carbon rings with alternating bonds are benzene rings; every other key is canonicalKey()', () => {
  const benzeneBonds = (smiles) => benzeneRingBonds(parseSmiles(smiles)).size;
  assert.equal(benzeneBonds('C1=CC=CC=C1'), 6);
  assert.equal(benzeneBonds('C1=CC=CC=C1OC(=O)C1=CC=CC=C1'), 12);
  for (const smiles of ['C1=CC=CC1', 'C1=CC=CCC1', 'C=C1C=CC=CC1', 'C1=CC=CC=CC=C1', 'C1=CC=C1', 'CC=CC=CC=C', 'C1CCCCC1']) {
    assert.equal(benzeneBonds(smiles), 0, smiles);
    assert.equal(aromaticKey(parseSmiles(smiles)), canonicalKey(parseSmiles(smiles)), smiles);
  }
}); // End of test 'aromatic key: only six-carbon rings with alternating bonds are benzene rings…'

test('aromatic key over every fixture molecule: no benzene ring → canonicalKey() unchanged; with one → both drawings agree', async () => {
  const counts = { plain: 0, benzene: 0, swapped: 0 };
  for (const row of await readFixtures()) {
    const mol = parseSmiles(row.smiles);
    if (!keyed(mol)) {
      continue; // Polycycles (refused by the engine) have no key either way.
    }
    if (benzeneRingBonds(mol).size === 0) {
      assert.equal(aromaticKey(mol), canonicalKey(mol), `names.tsv:${row.line}`);
      counts.plain += 1;
      continue;
    }
    const other = otherDrawing(mol);
    assert.equal(aromaticKey(other), aromaticKey(mol), `names.tsv:${row.line}`);
    const iso = aromaticIsomorphism(mol, other);
    assert.ok(iso, `names.tsv:${row.line}`);
    assert.equal(iso.bonds.size, mol.bonds.size);
    counts.benzene += 1;
    counts.swapped += canonicalKey(other) === canonicalKey(mol) ? 0 : 1;
  } // End of the loop over the fixture rows
  assert.ok(counts.plain > 600, `${counts.plain} molecules without a benzene ring`);
  assert.ok(counts.benzene > 150, `${counts.benzene} molecules with a benzene ring`);
  assert.ok(counts.swapped > 50, `${counts.swapped} of them with a canonicalKey() that tells the drawings apart`);
}); // End of test 'aromatic key over every fixture molecule…'

/**
 * The benzene cases of the phase (design.md §15.8 R-4, §15.5.3 worked
 * cases), with the molecule each draws: [tile words, assembled text, kind,
 * name shown (the filled name for missingLocants, else the engine's),
 * SMILES].
 */
const BENZENE_CASES = [
  ['benceno', 'benceno', 'correct', 'benceno', 'C1=CC=CC=C1'],
  ['met il benceno', 'metilbenceno', 'correct', 'metilbenceno', 'CC1=CC=CC=C1'],
  ['1 4 di met il benceno', '1,4-dimetilbenceno', 'correct', '1,4-dimetilbenceno', 'CC1=CC=C(C)C=C1'],
  ['1 2 di met il benceno', '1,2-dimetilbenceno', 'correct', '1,2-dimetilbenceno', 'CC1=CC=CC=C1C'],
  ['1 met il 4 prop il benceno', '1-metil-4-propilbenceno', 'correct', '1-metil-4-propilbenceno', 'CCCC1=CC=C(C)C=C1'],
  ['1 isopropil 4 met il benceno', '1-isopropil-4-metilbenceno', 'correct', '1-isopropil-4-metilbenceno', 'CC(C)C1=CC=C(C)C=C1'],
  ['1 met il 4 prop ano 2 il benceno', '1-metil-4-(propan-2-il)benceno', 'alternative', '1-isopropil-4-metilbenceno',
    'CC(C)C1=CC=C(C)C=C1'],
  ['1 3 5 tri met il benceno', '1,3,5-trimetilbenceno', 'correct', '1,3,5-trimetilbenceno', 'CC1=CC(C)=CC(C)=C1'],
  ['hexa met il benceno', 'hexametilbenceno', 'correct', 'hexametilbenceno', 'CC1=C(C)C(C)=C(C)C(C)=C1C'],
  ['et eno il benceno', 'etenilbenceno', 'correct', 'etenilbenceno', 'C=CC1=CC=CC=C1'],
  // Misnumbered: the molecule the student's numbers describe, named by the app.
  ['1 6 di met il benceno', '1,6-dimetilbenceno', 'otherName', '1,2-dimetilbenceno', 'CC1=CC=CC=C1C'],
  ['3 4 di met il benceno', '3,4-dimetilbenceno', 'otherName', '1,2-dimetilbenceno', 'CC1=CC=CC=C1C'],
  ['2 5 di met il benceno', '2,5-dimetilbenceno', 'otherName', '1,4-dimetilbenceno', 'CC1=CC=C(C)C=C1'],
  ['1 met il benceno', '1-metilbenceno', 'otherName', 'metilbenceno', 'CC1=CC=CC=C1'],
  // Left-out locants that one structure fills.
  ['et il 4 met il benceno', 'etil-4-metilbenceno', 'missingLocants', '1-etil-4-metilbenceno', 'CCC1=CC=C(C)C=C1'],
  ['penta met il benceno', 'pentametilbenceno', 'missingLocants', '1,2,3,4,5-pentametilbenceno', 'CC1=CC(C)=C(C)C(C)=C1C'],
  // A phenyl on a chain: the app names the molecule on its ring (the ring is the parent, P-44.1.2.2).
  ['fenil met ano', 'fenilmetano', 'otherName', 'metilbenceno', 'CC1=CC=CC=C1'],
  ['2 fenil prop ano', '2-fenilpropano', 'otherName', 'isopropilbenceno', 'CC(C)C1=CC=CC=C1'],
  ['met il fenil met ano', 'metil(fenil)metano', 'otherName', 'etilbenceno', 'CCC1=CC=CC=C1'],
  ['START 4 met il fenil END met ano', '(4-metilfenil)metano', 'otherName', '1,4-dimetilbenceno', 'CC1=CC=C(C)C=C1'],
  ['1 START 4 met il fenil END prop ano', '1-(4-metilfenil)propano', 'otherName', '1-metil-4-propilbenceno', 'CCCC1=CC=C(C)C=C1'],
  ['START 2 4 di met il fenil END met ano', '(2,4-dimetilfenil)metano', 'otherName', '1,2,4-trimetilbenceno', 'CC1=CC=C(C)C(C)=C1'],
  ['START 4 prop ano 2 il fenil END met ano', '[4-(propan-2-il)fenil]metano', 'otherName', '1-isopropil-4-metilbenceno',
    'CC(C)C1=CC=C(C)C=C1'],
  // The Kekulé ring written as a `ciclo` triene is benzene.
  ['ciclo hex 1 3 5 tri eno', 'ciclohexa-1,3,5-trieno', 'otherName', 'benceno', 'C1=CC=CC=C1'],
  ['met il ciclo hex 1 3 5 tri eno', 'metilciclohexa-1,3,5-trieno', 'otherName', 'metilbenceno', 'CC1=CC=CC=C1'],
];

test('benzene cases (R-4b): the verdict, the name shown and the molecule described, by aromatic key', () => {
  for (const [words, text, kind, name, smiles] of BENZENE_CASES) {
    const verdict = read(words);
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, kind, `${text}: ${verdict.message}`);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    assert.equal(verdict.draw, true);
    if (kind === 'missingLocants') {
      assert.equal(verdict.filled, name);
      assert.equal(verdict.message, `Casi: faltan los números. Se escribe «${name}».`);
    } else {
      assert.equal(verdict.name, name, text);
    }
    if (kind === 'otherName') {
      assert.equal(verdict.message, otherNameMessage(name));
      assert.ok(verdict.diagnosis && verdict.diagnosis.code, `${text}: a ring diagnosis (I-50d; its cases: reverse-diagnose-rings.test.js)`);
    }
    // The molecule drawn is the graph the engine named, with the student's reading on it.
    assert.ok(verdict.studentParent.atoms.every((id) => verdict.molecule.atoms.has(id)), text);
  } // End of the loop over the benzene cases
  // `metilbenceno` (§15.5.3 worked case): correct, with the traditional name IUPAC keeps.
  assert.equal(read('met il benceno').message,
    `${VERDICT_TEXTS.correct} También se llama «tolueno» (nombre tradicional, que la IUPAC (2013) conserva como preferido).`);
}); // End of test 'benzene cases (R-4b): the verdict, the name shown and the molecule described, by aromatic key'

test('benzene cases (R-4b): left-out locants on benzene list the structures, Kekulé drawings merged', () => {
  // `dimetilbenceno` (§15.5.3 worked case): three structures (1,2 / 1,3 / 1,4), not four.
  const dimethyl = read('di met il benceno');
  assert.equal(dimethyl.kind, 'ambiguous');
  assert.equal(dimethyl.message, 'Faltan números: puede ser 1,2-dimetilbenceno, 1,3-dimetilbenceno o 1,4-dimetilbenceno.');
  assert.deepEqual(dimethyl.candidates.map((c) => [c.text, aromaticKey(c.molecule)]), [
    ['1,2-dimetilbenceno', keyOf('CC1=CC=CC=C1C')], ['1,3-dimetilbenceno', keyOf('CC1=CC(C)=CC=C1')], ['1,4-dimetilbenceno', keyOf('CC1=CC=C(C)C=C1')],
  ]);
  assert.deepEqual([dimethyl.molecule, dimethyl.draw], [null, false]);
  assert.equal(read('tri met il benceno').message,
    'Faltan números: puede ser 1,2,3-trimetilbenceno, 1,2,4-trimetilbenceno o 1,3,5-trimetilbenceno.');
  // A phenyl's own left-out prefix: carbons 2…6, three structures.
  const phenyl = read('START met il fenil END met ano');
  assert.equal(phenyl.kind, 'ambiguous');
  assert.deepEqual(phenyl.candidates.map((c) => c.name), ['1,2-dimetilbenceno', '1,3-dimetilbenceno', '1,4-dimetilbenceno']);
  // Out of budget: incomplete, never a claim.
  assert.equal(read('di met il benceno', { budget: { placements: 2 } }).kind, 'incomplete');
}); // End of test 'benzene cases (R-4b): left-out locants on benzene list the structures…'

test('fixture round trip (R-4b, R-4c): the branch-only benzene rows of I-28 and I-42a, graph compared with the SMILES', async () => {
  const fixtures = await readFixtures();
  const rows = fixtures.filter((row) => isMonocyclicHydrocarbon(row.smiles) && isBenzeneName(row.names[0]));
  let covered = 0;
  let templates = 0;
  let elapsed = 0;
  for (const row of rows) {
    const expected = keyOf(row.smiles);
    for (const name of row.names) {
      assert.ok(isBenzeneName(name), `names.tsv:${row.line}: ${name} is no benzene name`);
      templates += isTemplateName(name) ? 1 : 0;
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
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
      covered += 1;
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  assert.equal(rows.length, EXPECTED_ROWS);
  assert.equal(covered, EXPECTED_COVERED);
  assert.equal(templates, EXPECTED_TEMPLATE_NAMES);
  assert.ok(elapsed / covered < AVERAGE_BUDGET_MS, `readName() took ${(elapsed / covered).toFixed(2)} ms on average`);
  // The I-42a rows with halogens are the halogen round trip's (R-5a1), those with alkoxy prefixes the ether round trip's
  // (R-5b1): no row of the section is left out.
  const rest = fixtures.filter((row) => row.section.includes('(I-42a') && !isMonocyclicHydrocarbon(row.smiles));
  assert.equal(rest.filter((row) => isHalogenDerivative(row.smiles)).length, EXPECTED_HALOGEN_ROWS);
  const ethers = rest.filter((row) => !isHalogenDerivative(row.smiles));
  assert.equal(ethers.length, EXPECTED_ETHER_ROWS);
  assert.ok(ethers.every((row) => isEther(row.smiles)), 'every other row is an ether (reverse-ethers.test.js)');
  for (const row of ethers) {
    for (const name of row.names) {
      // `p-metil(metoxi)benceno`, `p-(etoxi)metilbenceno` (I-54a) read since I-54b.
      assert.equal(readName(tokenize(name)).kind, name === row.names[0] ? 'correct' : 'alternative', name);
    }
  }
}); // End of test 'fixture round trip (R-4b, R-4c): the branch-only benzene rows of I-28 and I-42a…'

/** The closed loop's seeded benzenes (scripts/oracle/generate.mjs generateBenzenes(); design.md §15.7). */
const LOOP = Object.freeze({ count: 400, seed: 4703, minSize: 6, maxSize: 14 });

/** Extra branch-only benzenes drawn with randomBenzene() (seed, how many, attempts). */
const EXTRA = Object.freeze({ seed: 47031, count: 300, attempts: 3000 });

/**
 * Minimum coverage of the closed loop: branch-only molecules (117 from
 * generateBenzenes(), up to 300 more from randomBenzene(), distinct by
 * aromatic key), names read back — those with a retained template or an
 * orto/meta/para letter among them, since I-50c (R-4c), and among those the
 * o/m/p forms of two different prefixes, since I-54b (parse.js
 * pairLetter()) —, removed-locant mutations and decisive verdicts among them
 * (the seeds give 411, 574, 125, 106, 968 and 968).
 */
const LOOP_MIN = Object.freeze({ molecules: 400, names: 570, templates: 120, pairs: 106, removed: 950, decisive: 940 });

/**
 * Tells whether a molecule has carbons only: a benzene with hydrocarbon
 * branches (no halogen, reverse-halogens.test.js, nor alkoxy group, R-5b).
 *
 * @param {object} mol - A molecule.
 * @returns {boolean} True for a hydrocarbon.
 */
function isHydrocarbon(mol) {
  return [...mol.atoms.values()].every((atom) => atom.element === 'C');
}

/**
 * The closed loop's molecules: the branch-only ones of generateBenzenes()
 * and more from randomBenzene() without heteroatoms, distinct by aromatic key.
 *
 * @returns {object[]} The molecules.
 */
function loopMolecules() {
  const seen = new Set();
  const molecules = [];
  /**
   * Keeps a molecule unless its structure is already in.
   *
   * @param {object} mol - A molecule.
   * @returns {void}
   */
  const keep = (mol) => {
    const key = aromaticKey(mol);
    if (!seen.has(key)) {
      seen.add(key);
      molecules.push(mol);
    }
  };
  generateBenzenes(LOOP).filter(isHydrocarbon).forEach(keep);
  const random = seededRandom(EXTRA.seed);
  for (let i = 0, kept = 0; i < EXTRA.attempts && kept < EXTRA.count; i += 1) {
    const mol = randomBenzene(random, {
      extra: randomInt(random, 0, 8),
      kekule: random() < 0.5 ? 1 : 2,
      unsaturation: random() * 0.4,
      branchiness: 0.2 + random() * 0.8,
      groups: randomInt(random, 1, 6),
    });
    if (!validateForNaming(mol)) {
      const before = molecules.length;
      keep(mol);
      kept += molecules.length - before;
    }
  } // End of the loop that draws branch-only benzenes
  return molecules;
} // End of function loopMolecules()

/**
 * The locant lists of a tree a student can leave out: a prefix's and a
 * segment's, at any depth — never a free-valence locant; `benceno` has none.
 *
 * @param {object} tree - An error-free parse() tree.
 * @returns {number[][]} The lists of number tile indices.
 */
function locantLists(tree) {
  const lists = [];
  /**
   * Collects the segments of a chain or ring (none for `benceno` or a retained word).
   *
   * @param {object} chain - A chain, benzene or retained node.
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
  return lists;
} // End of function locantLists()

test('closed loop over the benzene generators: engine name → tiles → readName() → the same graph, then without each locant list', () => {
  const molecules = loopMolecules();
  const counts = { names: 0, templates: 0, pairs: 0, removed: 0, decisive: 0 };
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, naming.ok ? '' : naming.error.message);
    const key = aromaticKey(mol);
    const all = [naming.name, ...naming.alternatives.map((alt) => alt.name)];
    assert.ok(isBenzeneName(naming.name), naming.name);
    for (const [i, name] of all.entries()) {
      assert.ok(isBenzeneName(name), name); // Retained templates and o/m/p forms too (R-4c).
      counts.templates += isTemplateName(name) ? 1 : 0;
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const { tree } = parse(ids);
      counts.pairs += pairLetter(tree.tiles, tree) === null ? 0 : 1; // Two different prefixes with one letter (I-54b).
      const verdict = readName(ids);
      assert.equal(verdict.kind, i === 0 ? 'correct' : 'alternative', `${name}: ${verdict.message}`);
      assert.equal(verdict.name, naming.name);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
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
          assert.ok(reread.candidates.some((c) => c.text === name && aromaticKey(c.molecule) === key), where);
        } else {
          assert.ok(['missingLocants', 'correct', 'alternative'].includes(reread.kind), where);
          assert.equal(aromaticKey(reread.molecule), key, where);
          assert.equal(reread.filled, reread.kind === 'missingLocants' ? name : null, where);
        }
        counts.decisive += 1;
      } // End of the loop over the locant lists
    } // End of the loop over the names of a molecule
  } // End of the loop over the molecules
  assert.ok(molecules.length >= LOOP_MIN.molecules, `${molecules.length} molecules`);
  assert.ok(counts.names >= LOOP_MIN.names, `${counts.names} names read back`);
  assert.ok(counts.templates >= LOOP_MIN.templates, `${counts.templates} template and o/m/p names read back`);
  assert.ok(counts.pairs >= LOOP_MIN.pairs, `${counts.pairs} o/m/p forms of two different prefixes read back`);
  assert.ok(counts.removed >= LOOP_MIN.removed, `${counts.removed} removed-locant mutations`);
  assert.ok(counts.decisive >= LOOP_MIN.decisive, `${counts.decisive} decisive verdicts`);
}); // End of test 'closed loop over the benzene generators…'

/**
 * Mutations of correct benzene names: [tile words, assembled text, kind, the
 * engine's name, SMILES of the molecule described].
 */
const MUTATIONS = [
  ['1 3 di met il benceno', '1,3-dimetilbenceno', 'correct', '1,3-dimetilbenceno', 'CC1=CC(C)=CC=C1'],
  ['1 5 di met il benceno', '1,5-dimetilbenceno', 'otherName', '1,3-dimetilbenceno', 'CC1=CC(C)=CC=C1'], // reversed
  ['4 1 di met il benceno', '4,1-dimetilbenceno', 'otherName', '1,4-dimetilbenceno', 'CC1=CC=C(C)C=C1'], // not ascending
  ['1 met il 3 et il benceno', '1-metil-3-etilbenceno', 'otherName', '1-etil-3-metilbenceno', 'CC1=CC(CC)=CC=C1'], // unsorted
  ['3 et il 1 met il benceno', '3-etil-1-metilbenceno', 'otherName', '1-etil-3-metilbenceno', 'CCC1=CC(C)=CC=C1'], // swapped
  ['1 met il 2 met il benceno', '1-metil-2-metilbenceno', 'otherName', '1,2-dimetilbenceno', 'CC1=CC=CC=C1C'], // ungrouped
  ['1 2 bis met il benceno', '1,2-bismetilbenceno', 'otherName', '1,2-dimetilbenceno', 'CC1=CC=CC=C1C'], // bis for di
  ['4 met il 1 isopropil benceno', '4-metil-1-isopropilbenceno', 'otherName', '1-isopropil-4-metilbenceno', 'CC(C)C1=CC=C(C)C=C1'],
  ['1 2 3 4 5 6 hexa met il benceno', '1,2,3,4,5,6-hexametilbenceno', 'otherName', 'hexametilbenceno', 'CC1=C(C)C(C)=C(C)C(C)=C1C'],
];

test('mutations of benzene names: the verdict, the molecule the name describes and its diagnosis', () => {
  for (const [words, text, kind, name, smiles] of MUTATIONS) {
    const verdict = read(words);
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, kind, `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} builds another graph`);
    if (kind === 'otherName') {
      assert.equal(verdict.message, otherNameMessage(name));
      assert.ok(verdict.diagnosis && verdict.diagnosis.code, `${text}: a ring diagnosis (I-50d; its cases: reverse-diagnose-rings.test.js)`);
    }
  } // End of the loop over the mutations
  // The chain diagnoses stand: the benzene tiles change nothing for them.
  assert.equal(read('4 met il pent ano').diagnosis.code, 'NUMBERING');
  assert.equal(read('2 but eno').diagnosis.code, 'OLD_STYLE');
}); // End of test 'mutations of benzene names…'

test('benzene names the app cannot draw or does not understand: outOfScope and invalid, never a crash', () => {
  const several = `${VERDICT_TEXTS.outOfScope} ${RING_SYSTEM_MESSAGES.several}`;
  // Two rings bonded straight together, or three: refused before any search (no structural key), nothing built.
  for (const words of ['fenil benceno', 'fenil ciclo hex ano', 'ciclo hex il benceno', 'tri fenil met ano', 'fenil met il benceno',
    '1 2 di fenil benceno']) {
    const verdict = read(words);
    assert.deepEqual([verdict.kind, verdict.message, verdict.molecule, verdict.draw], ['outOfScope', several, null, false], words);
  }
  // Two rings apart: built and named — the engine refuses the one structure.
  for (const [words, smiles] of [['di fenil met ano', 'C1=CC=CC=C1CC1=CC=CC=C1'], ['START fenil met il END benceno', 'C1=CC=CC=C1CC1=CC=CC=C1'],
    ['START ciclo hex il met il END benceno', 'C1CCCCC1CC1=CC=CC=C1']]) {
    const apart = read(words);
    assert.deepEqual([apart.kind, apart.message, apart.draw, apart.name], ['outOfScope', several, false, null], words);
    assert.equal(aromaticKey(apart.molecule), keyOf(smiles));
  }
  // Numbers of its own on `benceno`, a seventh branch, a phenyl's carbon 1: invalid, with the tiles marked.
  const cases = [
    ['1 3 5 benceno', 'BENZENE_BONDS', [0, 3]],
    ['benceno 1 3 5 tri eno', 'BENZENE_BONDS', [1, 6]],
    ['hepta met il benceno', 'VALENCE', [0, 3]],
    ['START 1 met il fenil END met ano', 'LOCANT_RANGE', [1, 2]],
    ['START benceno END met ano', 'TILE_ORDER', [1, 2]],
  ];
  for (const [words, code, [from, to]] of cases) {
    const verdict = read(words);
    assert.equal(verdict.kind, 'invalid', words);
    assert.deepEqual([verdict.errors[0].code, verdict.errors[0].from, verdict.errors[0].to], [code, from, to], words);
    assert.deepEqual([verdict.molecule, verdict.draw], [null, false]);
  }
}); // End of test 'benzene names the app cannot draw or does not understand…'

test('«Dibujar» (R-4b): a benzene verdict has an ordered drawing (canonical layout without problems)', () => {
  for (const words of ['benceno', 'met il benceno', '1 4 di met il benceno', 'hexa met il benceno', '1 met il 4 prop il benceno',
    'START 4 met il fenil END met ano', '1 START 4 met il fenil END prop ano', '1 6 di met il benceno', 'et il 4 met il benceno']) {
    const verdict = read(words);
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
    assert.equal(cyclomaticNumber(verdict.molecule), 1);
  }
}); // End of test '«Dibujar» (R-4b): a benzene verdict has an ordered drawing…'

/** Representative benzene names for the time budget. */
const TIMED = ['benceno', 'met il benceno', 'di met il benceno', 'tri met il benceno', 'tetra met il benceno', 'hexa met il benceno',
  'et il 4 met il benceno', 'di et il di met il benceno', 'START di met il fenil END met ano', 'di fenil met ano',
  'tri met il 1 et il benceno', 'START tri met il fenil END et ano'];

test('time budget: each representative benzene readName() well within budget', () => {
  TIMED.forEach((words) => read(words)); // Warm-up.
  for (const words of TIMED) {
    const start = performance.now();
    const verdict = read(words);
    const elapsed = performance.now() - start;
    assert.notEqual(verdict.kind, 'incomplete', words);
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
    assert.ok(elapsed < SEARCH_BUDGET.ms);
  }
}); // End of test 'time budget: each representative benzene readName() well within budget'
