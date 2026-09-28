/**
 * @file Unit tests for the OPSIN oracle tooling (design.md §8) and the
 * English lexicon: English rendering of name structures, the dev-only
 * fuller SMILES parser, the structure comparison, the seeded generator, the
 * "skipped, never passed" behaviour without the jar, a small real OPSIN run
 * when Java and the pinned jar are available, and the rule that the English
 * lexicon never reaches the app.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { canonicalTreeKey, canonicalKey, cyclomaticNumber } from '../../src/model/graph.js';
import { validateForNaming } from '../../src/model/validate.js';
import { nameMolecule, amineClassName } from '../../src/naming/index.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { lexiconEn, stem } from '../../src/naming/lexicon.en.js';
import { parseFullSmiles, heavyAtomTree, OracleSmilesError } from '../../scripts/oracle/smiles-full.mjs';
import { englishName, compareWithOpsin, kekuleKeys } from '../../scripts/oracle/compare.mjs';
import {
  generateMolecules, generateMonocycles, generateBenzenes, generateHalogenated, halogenate, seededRandom,
  generateAmines, aminate,
} from '../../scripts/oracle/generate.mjs';
import { perceiveRings } from '../../src/model/rings.js';
import { isBenzeneRing, amineNitrogens } from '../../src/model/validate.js';
import { formula } from '../../src/model/molecule.js';
import { checkAvailability } from '../../scripts/oracle/opsin.mjs';
import { main, parseArgs, evaluate, buildCases } from '../../scripts/oracle/run.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * English name of a SMILES in one prefix style.
 *
 * @param {string} smiles - The SMILES.
 * @param {string} [prefixStyle] - Prefix style (default 'isopropil').
 * @returns {string} The English name.
 */
function english(smiles, prefixStyle = 'isopropil') {
  const result = nameMolecule(parseSmiles(smiles), { prefixStyle });
  assert.equal(result.ok, true);
  return englishName(result.structure);
}

test('the English lexicon has the same members as the Spanish one', () => {
  assert.deepEqual(Object.keys(lexiconEn).sort(), Object.keys(lexiconEs).sort());
  assert.equal(lexiconEn.language, 'en');
  assert.equal(stem(1), 'meth');
  assert.equal(stem(2), 'eth');
  assert.equal(stem(30), 'triacont');
  assert.throws(() => stem(31), RangeError);
  assert.equal(lexiconEn.alkylPrefix(1, 2), 'methylidene');
});

test('English rendering of the same name structure', () => {
  const cases = [
    ['C', 'methane'], ['C=C', 'ethene'], ['C#CC', 'propyne'], ['C=C=C', 'propadiene'],
    ['C=CC=C', 'buta-1,3-diene'], ['C#CC=CC', 'pent-3-en-1-yne'], ['C=CC=CC#C', 'hexa-1,3-dien-5-yne'],
    ['C=CC#CC#C', 'hex-1-en-3,5-diyne'], ['CC(C)C', '2-methylpropane'],
    ['C=CC(CCC)CCC', '4-ethenylheptane'], ['C#CC(CCC)CCC', '4-ethynylheptane'],
    ['C=CCC(CCCC)CCCC', '5-(prop-2-en-1-yl)nonane'], ['CCC(=C)CCC', '3-methylidenehexane'],
    ['CCCC(=CC)CCC', '4-ethylideneheptane'], ['CCCCC(C(C)C)CCCC', '5-isopropylnonane'],
    ['CCCC(=C(C)C)CCC', '4-isopropylideneheptane'], ['CCCC(=C=C)CCC', '4-ethenylideneheptane'],
    ['CCCCC(C(C)(C)C)CCCC', '5-tert-butylnonane'],
  ];
  for (const [smiles, name] of cases) {
    assert.equal(english(smiles), name, smiles);
  }
  assert.equal(english('CCCCC(C(C)C)CCCC', 'pin'), '5-(propan-2-yl)nonane');
  assert.equal(english('CCCCC(C(C)C)CCCC', 'substituted'), '5-(1-methylethyl)nonane');
}); // End of test 'English rendering of the same name structure'

test('the fuller SMILES parser reads bracket atoms, rings, charges and explicit hydrogens', () => {
  const graph = parseFullSmiles('[13CH3:1][C@@H](Cl)C1=CC=CC=C1.[Na+]');
  assert.equal(graph.atoms.length, 10);
  assert.equal(graph.bonds.length, 9);
  assert.equal(graph.atoms[0].hCount, 3);
  assert.equal(graph.atoms[9].charge, 1);
  assert.equal(parseFullSmiles('c1ccccc1').bonds.filter((b) => b.order === 1.5).length, 6);
  assert.equal(parseFullSmiles('C%10CC%10').bonds.length, 3);
  for (const bad of ['C(C', 'C)C', 'C1CC', '[CH3', 'C==C', 'C?']) {
    assert.throws(() => parseFullSmiles(bad), OracleSmilesError, bad);
  }
}); // End of test 'the fuller SMILES parser reads bracket atoms, rings, charges and explicit hydrogens'

test('heavyAtomTree keeps hydrocarbons as before and counts the formula from the SMILES', () => {
  const tree = heavyAtomTree('[CH3]C([H])=C(C)C');
  assert.equal(tree.problem, null);
  assert.equal(tree.formula, 'C5H10');
  assert.equal(canonicalTreeKey(tree.mol), canonicalTreeKey(parseSmiles('CC=C(C)C')));
  // Rings are kept (compared structurally by compareWithOpsin); several fragments are a problem.
  assert.equal(heavyAtomTree('C1CC1').problem, null);
  assert.equal(heavyAtomTree('C1CC1').mol.bonds.size, 3);
  assert.match(heavyAtomTree('CC.C').problem, /fragments/);
  // Aromatic SMILES are kekulized (I-28): benzene and toluene come back as Kekulé hexagons.
  assert.equal(heavyAtomTree('c1ccccc1').problem, null);
  assert.equal(heavyAtomTree('c1ccccc1').formula, 'C6H6');
  assert.equal(heavyAtomTree('Cc1ccccc1').formula, 'C7H8');
  assert.equal([...heavyAtomTree('c1ccccc1').mol.bonds.values()].filter((b) => b.order === 2).length, 3);
  assert.match(heavyAtomTree('C[CH2]').problem, /valence/);
}); // End of test 'heavyAtomTree keeps hydrocarbons as before and counts the formula from the SMILES'

test('heavyAtomTree keeps every heavy atom and its element', () => {
  const cases = [
    ['CCO', 'C2H6O'], ['OCC', 'C2H6O'], ['C[OH]', 'CH4O'], ['[NH2]CC', 'C2H7N'], ['ClC(Br)(F)I', 'CBrClFI'], ['ClC(Br)F', 'CHBrClF'],
    ['CC(=O)O', 'C2H4O2'], ['CC#N', 'C2H3N'], ['O[H]', 'H2O'], ['[H]OC([H])([H])[H]', 'CH4O'],
  ];
  for (const [smiles, expected] of cases) {
    const tree = heavyAtomTree(smiles);
    assert.equal(tree.problem, null, smiles);
    assert.equal(tree.formula, expected, smiles);
    const heavy = parseFullSmiles(smiles).atoms.filter((a) => a.element !== 'H').length;
    assert.equal(tree.mol.atoms.size, heavy, `${smiles}: no heavy atom dropped`);
  }
  const ethanol = heavyAtomTree('CCO').mol;
  assert.deepEqual([...ethanol.atoms.values()].map((a) => a.element), ['C', 'C', 'O']);
  assert.equal(canonicalTreeKey(ethanol), canonicalTreeKey(parseSmiles('OCC')));
  assert.notEqual(canonicalTreeKey(ethanol), canonicalTreeKey(heavyAtomTree('COC').mol));
  // Structures the model cannot hold are naming problems, not adapter failures.
  assert.match(heavyAtomTree('CCS').problem, /unsupported elements: S/);
  assert.match(heavyAtomTree('CC(=O)[O-]').problem, /charged/);
  assert.match(heavyAtomTree('C[N](C)(C)(C)C').problem, /valence/);
  assert.match(heavyAtomTree('C[O]').problem, /valence/);
}); // End of test 'heavyAtomTree keeps every heavy atom and its element'

test('compareWithOpsin checks the structure and the formula', () => {
  const mol = parseSmiles('CCC(=C)CCC');
  assert.deepEqual(compareWithOpsin(mol, 'C=C(CC)CCC'), { status: 'passed', reason: null });
  assert.equal(compareWithOpsin(mol, 'CC=C(C)CCC').status, 'failed');
  assert.equal(compareWithOpsin(mol, 'CCC(C)CCC').status, 'failed');
  assert.equal(compareWithOpsin(mol, '').status, 'failed');
  assert.equal(compareWithOpsin(mol, 'CC?').status, 'adapter');
});

test('compareWithOpsin compares heteroatom structures over elements', () => {
  const ethanol = parseSmiles('CCO');
  assert.deepEqual(compareWithOpsin(ethanol, 'OCC'), { status: 'passed', reason: null });
  assert.deepEqual(compareWithOpsin(ethanol, 'C([H])([H])([H])C[OH]'), { status: 'passed', reason: null });
  const ether = compareWithOpsin(ethanol, 'COC');
  assert.equal(ether.status, 'failed', 'dimethyl ether has the same formula but is not ethanol');
  assert.match(ether.reason, /canonical keys/);
  assert.equal(compareWithOpsin(parseSmiles('ClCCBr'), 'CC(Cl)Br').status, 'failed');
  assert.equal(compareWithOpsin(parseSmiles('ClCCBr'), 'BrCCCl').status, 'passed');
  assert.match(compareWithOpsin(ethanol, 'CCS').reason, /formula/);
  assert.equal(compareWithOpsin(parseSmiles('CN'), 'C[NH3+]').status, 'failed');
}); // End of test 'compareWithOpsin compares heteroatom structures over elements'

test('adapter failures are classified apart from naming failures', () => {
  const mol = parseSmiles('CCO');
  for (const unreadable of ['C[OH', 'CC(O', 'C?O', 'CO)', 'C1CO']) {
    const verdict = compareWithOpsin(mol, unreadable);
    assert.equal(verdict.status, 'adapter', unreadable);
    assert.match(verdict.reason, /unreadable OPSIN SMILES/);
  }
  const names = (english) => [{ style: 'isopropil', spanish: 'x', english, error: null }];
  const cases = [
    { mol, smiles: 'CCO', names: names('ok') },
    { mol, smiles: 'CCO', names: names('unreadable') },
    { mol, smiles: 'CCO', names: names('wrong') },
  ];
  const out = new Map([['ok', 'OCC'], ['unreadable', 'C[OH'], ['wrong', 'COC']]);
  const result = evaluate(cases, out);
  assert.equal(result.passed, 1);
  assert.equal(result.adapter.length, 1);
  assert.equal(result.adapter[0].problems[0].status, 'adapter');
  assert.equal(result.failed.length, 1);
  assert.equal(result.failed[0].problems[0].status, 'failed');
}); // End of test 'adapter failures are classified apart from naming failures'

test('the seeded generator is deterministic, distinct and valid', () => {
  const a = generateMolecules({ count: 200, seed: 5 }).map(writeSmiles);
  const b = generateMolecules({ count: 200, seed: 5 }).map(writeSmiles);
  const c = generateMolecules({ count: 200, seed: 6 }).map(writeSmiles);
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, c);
  const molecules = generateMolecules({ count: 200, seed: 5 });
  assert.equal(new Set(molecules.map(canonicalTreeKey)).size, 200);
  for (const mol of molecules) {
    assert.equal(validateForNaming(mol), null);
    assert.ok(mol.atoms.size >= 4 && mol.atoms.size <= 14);
  }
  assert.ok(molecules.some((mol) => [...mol.bonds.values()].some((bond) => bond.order === 3)));
}); // End of test 'the seeded generator is deterministic, distinct and valid'

test('the seeded monocycle generator is deterministic, distinct, valid and varied (I-26)', () => {
  const a = generateMonocycles({ count: 100, seed: 5 }).map(writeSmiles);
  assert.deepEqual(a, generateMonocycles({ count: 100, seed: 5 }).map(writeSmiles));
  assert.notDeepEqual(a, generateMonocycles({ count: 100, seed: 6 }).map(writeSmiles));
  const molecules = generateMonocycles({ count: 100, seed: 5 });
  assert.equal(molecules.length, 100);
  assert.equal(new Set(molecules.map(canonicalKey)).size, 100);
  for (const mol of molecules) {
    assert.equal(validateForNaming(mol), null);
    assert.equal(cyclomaticNumber(mol), 1);
    assert.ok(mol.atoms.size >= 4 && mol.atoms.size <= 14);
  }
  const results = molecules.map((mol) => nameMolecule(mol));
  assert.ok(results.some((r) => r.structure.prefixes.length > 0), 'some carry side chains');
  assert.ok(results.some((r) => r.structure.parent.double.length > 0), 'some have ring double bonds');
  assert.ok(results.some((r) => r.structure.parent.triple.length > 0), 'some have ring triple bonds');
}); // End of test 'the seeded monocycle generator…'

test('the seeded halogen-derivative generator: valid, distinct, deterministic, with small parents (I-30)', () => {
  const molecules = generateHalogenated({ count: 60, seed: 3 });
  assert.equal(molecules.length, 60);
  assert.deepEqual(generateHalogenated({ count: 60, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.equal(new Set(molecules.map(canonicalKey)).size, 60, 'distinct');
  const elements = new Set();
  for (const mol of molecules) {
    assert.equal(validateForNaming(mol), null, writeSmiles(mol));
    const halogens = [...mol.atoms.values()].filter((a) => a.element !== 'C');
    assert.ok(halogens.length > 0, 'at least one halogen');
    halogens.forEach((a) => elements.add(a.element));
    assert.equal(nameMolecule(mol).ok, true, writeSmiles(mol));
  }
  assert.deepEqual([...elements].sort(), ['Br', 'Cl', 'F', 'I']);
  const carbons = (mol) => [...mol.atoms.values()].filter((a) => a.element === 'C').length;
  assert.ok(molecules.some((mol) => carbons(mol) <= 2), 'halomethanes or haloethanes are drawn');
  assert.ok(molecules.some((mol) => cyclomaticNumber(mol) === 1), 'halogenated rings are drawn');
  // halogenate() never mutates its input and keeps every carbon.
  const base = parseSmiles('CCC');
  const copy = halogenate(base, seededRandom(1), 1);
  assert.equal(writeSmiles(base), 'CCC');
  assert.equal(copy.atoms.size, 11, 'rate 1: all 8 hydrogens replaced');
  assert.match(formula(copy), /^C3(Br\d*)?(Cl\d*)?(F\d*)?(I\d*)?$/, 'no hydrogen left');
  assert.equal(nameMolecule(copy).ok, true);
}); // End of test 'the seeded halogen-derivative generator…'

test('oracle options', () => {
  assert.equal(parseArgs(['--count', '1000', '--seed', '1']).count, 1000);
  assert.equal(parseArgs([]).seed, 1);
  assert.throws(() => parseArgs(['--count', 'x']));
  assert.throws(() => parseArgs(['--bogus']));
  assert.throws(() => parseArgs(['--min', '20', '--max', '10']));
});

test('without the jar every molecule is skipped, never passed, with exit status 0', async (t) => {
  const lines = [];
  t.mock.method(console, 'log', (text) => lines.push(text));
  const status = await main(['--count', '5', '--seed', '1', '--jar', path.join(ROOT, 'scripts', 'oracle', 'vendor', 'missing.jar')]);
  assert.equal(status, 0);
  assert.ok(lines.some((line) => /^skipped: /.test(line)));
  // 5 random molecules, 3 random monocycles, 1 benzene, 3 halogen derivatives, 3 alcohols, 3 aldehydes and ketones,
  // 3 carboxylic acids, 3 ethers, 3 esters, 3 amines, 3 amides, 3 nitriles, 3 ciano- molecules, 3 acyl molecules, 3 ester-prefix molecules, 3 amide-prefix molecules, 3 ring-prefix molecules, 3 ring acids and aldehydes, 3 ring nitriles and amides, 3 ring esters and the 11 cycloalkanes of the default 4–14 C range.
  assert.ok(lines.includes('passed: 0  failed: 0  skipped: 71  adapter failures: 0'), lines.join('\n'));
  lines.length = 0;
  assert.equal(await main(['--count', '3', '--java', 'no-such-java-binary']), 0);
  assert.ok(lines.some((line) => /Java not available/.test(line)));
}); // End of test 'without the jar every molecule is skipped, never passed, with exit status 0'

test('a jar whose checksum is not the pinned one is rejected at any path', async (t) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'opsin-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const fake = path.join(dir, 'fake.jar');
  await writeFile(fake, 'not the pinned jar');
  const availability = await checkAvailability(fake);
  if (/Java not available/.test(availability.reason || '')) {
    t.skip(availability.reason);
    return;
  }
  assert.equal(availability.ok, false);
  assert.match(availability.reason, /checksum/);
}); // End of test 'a jar whose checksum is not the pinned one is rejected at any path'

test('real OPSIN round trip over 200 random molecules, 100 monocycles, 20 benzenes, 100 halogen derivatives, 100 alcohols, 100 aldehydes and ketones, 100 carboxylic acids, 100 ethers, 100 esters, 100 amines, 100 amides, 100 nitriles, 100 ciano- molecules, 100 acyl molecules, 100 ester-prefix molecules, 100 amide-prefix molecules, 100 ring-prefix molecules, 100 ring acids and aldehydes, 100 ring nitriles and amides, 100 ring esters and the cycloalkanes (skipped without Java or the jar)', async (t) => {
  const availability = await checkAvailability();
  if (!availability.ok) {
    t.skip(availability.reason);
    return;
  }
  const lines = [];
  t.mock.method(console, 'log', (text) => lines.push(text));
  const status = await main(['--count', '200', '--seed', '42']);
  assert.equal(status, 0, lines.join('\n'));
  assert.ok(lines.includes('passed: 2031  failed: 0  skipped: 0  adapter failures: 0'), lines.join('\n'));
}); // End of test 'real OPSIN round trip over 200 random molecules, 100 monocycles, 20 benzenes, 100 halogen derivatives, 100 alcohols, 100 aldehydes and ketones, 100 carboxylic acids, 100 ethers, 100 esters, 100 amines, 100 amides, 100 nitriles, 100 ciano- molecules, 100 acyl molecules, 100 ester-prefix molecules, 100 amide-prefix molecules, 100 ring-prefix molecules, 100 ring acids and aldehydes, 100 ring nitriles and amides, 100 ring esters and the cycloalkanes'

test('the English lexicon never reaches the app', async () => {
  const files = [];
  const stack = [path.join(ROOT, 'src')];
  while (stack.length > 0) {
    const dir = stack.pop();
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.name.endsWith('.js') && entry.name !== 'lexicon.en.js') {
        files.push(full);
      }
    }
  } // End of the walk over src/
  assert.ok(files.length > 10);
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    assert.doesNotMatch(source, /from\s+['"][^'"]*lexicon\.en\.js['"]/, `${path.relative(ROOT, file)} imports the English lexicon`);
  }
}); // End of test 'the English lexicon never reaches the app'

test('benzene derivatives (I-28): generated in both Kekulé drawings, compared whatever drawing OPSIN returns', () => {
  const benzenes = generateBenzenes({ count: 20, seed: 5 });
  assert.equal(benzenes.length, 20);
  assert.deepEqual(generateBenzenes({ count: 20, seed: 5 }).map(writeSmiles), benzenes.map(writeSmiles), 'deterministic');
  assert.equal(nameMolecule(benzenes[0]).name, 'benceno', 'benzene itself comes first');
  const firstOrders = new Set();
  for (const mol of benzenes) {
    assert.equal(validateForNaming(mol), null);
    const { rings } = perceiveRings(mol);
    assert.equal(rings.length, 1);
    assert.ok(isBenzeneRing(mol, rings[0]));
    firstOrders.add(mol.bonds.get(rings[0].bonds[0]).order);
    assert.match(nameMolecule(mol).name, /benceno$/);
  }
  assert.equal(firstOrders.size, 2, 'both Kekulé drawings are generated');
  // The original in one drawing, OPSIN's SMILES in the other or aromatic: all pass.
  const toluene = parseSmiles('CC1=CC=CC=C1');
  assert.equal(kekuleKeys(toluene).length, 2);
  assert.equal(kekuleKeys(parseSmiles('C1=CC=CCC1')).length, 1, 'no swap for a cyclohexadiene');
  for (const opsin of ['CC1=CC=CC=C1', 'CC1C=CC=CC=1', 'Cc1ccccc1', 'c1ccccc1C']) {
    assert.deepEqual(compareWithOpsin(toluene, opsin), { status: 'passed', reason: null }, opsin);
    assert.deepEqual(compareWithOpsin(parseSmiles('CC1C=CC=CC=1'), opsin), { status: 'passed', reason: null }, opsin);
  }
  assert.equal(compareWithOpsin(parseSmiles('C1=CC=CC=C1'), 'c1ccccc1').status, 'passed');
  assert.equal(compareWithOpsin(toluene, 'CC1=CCCC=C1').status, 'failed', 'a cyclohexadiene is not toluene');
  assert.equal(compareWithOpsin(parseSmiles('C=CC1=CC=CC=C1'), 'C=Cc1ccccc1').status, 'passed');
  assert.equal(englishName(nameMolecule(toluene).structure), 'methylbenzene');
});

test('the seeded amine generator: deterministic, distinct, valid, varied (I-36)', () => {
  const molecules = generateAmines({ count: 120, seed: 3 });
  assert.equal(molecules.length, 120);
  assert.deepEqual(generateAmines({ count: 120, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.notDeepEqual(generateAmines({ count: 120, seed: 4 }).map(writeSmiles), molecules.map(writeSmiles));
  assert.equal(new Set(molecules.map(canonicalKey)).size, 120, 'distinct');
  const degrees = new Set();
  let polyamines = 0;
  let withOthers = 0;
  let rings = 0;
  let benzenes = 0;
  for (const mol of molecules) {
    const smiles = writeSmiles(mol);
    assert.equal(validateForNaming(mol), null, smiles);
    const nitrogens = amineNitrogens(mol);
    assert.ok(nitrogens.length > 0, `${smiles}: at least one amine N`);
    for (const style of ['isopropil', 'pin', 'substituted']) {
      assert.equal(nameMolecule(mol, { prefixStyle: style }).ok, true, `${smiles} (${style})`);
    }
    nitrogens.forEach((n) => degrees.add([...mol.bonds.values()].filter((b) => b.a === n || b.b === n).length));
    polyamines += nitrogens.length > 1 ? 1 : 0;
    withOthers += [...mol.atoms.values()].some((a) => a.element !== 'C' && a.element !== 'N') ? 1 : 0;
    if (cyclomaticNumber(mol) === 1) {
      rings += 1;
      benzenes += /benceno|bencen/.test(nameMolecule(mol).name) ? 1 : 0;
    }
  } // End of the loop over the generated amines
  assert.deepEqual([...degrees].sort(), [1, 2, 3], 'primary, secondary and tertiary amines');
  assert.ok(polyamines > 0, 'some molecules have several amine N');
  assert.ok(withOthers > 0, 'some combine the amine with O groups or halogens');
  assert.ok(rings > 0 && benzenes > 0, 'ring amines and anilines are drawn');
  const names = molecules.map((mol) => nameMolecule(mol).name);
  assert.ok(names.some((name) => /amino/.test(name)), 'some cite the amine as an amino prefix');
  assert.ok(names.some((name) => /\(\w*amino\)|\[\w*\(\w*\)amino\]/.test(name)), 'some have substituted amino prefixes');
  assert.ok(names.some((name) => /^N/.test(name)), 'some have N-substituents');
  // aminate() never mutates its input; `only` keeps the N on the allowed carbons.
  const base = parseSmiles('CC1CCCCC1');
  const ringCarbons = new Set([...base.atoms.keys()].slice(1));
  const copy = aminate(base, seededRandom(2), { rate: 1, insert: 1, only: ringCarbons });
  assert.equal(writeSmiles(base), 'CC1CCCCC1');
  for (const n of amineNitrogens(copy)) {
    const carbons = [...copy.bonds.values()].filter((b) => b.a === n || b.b === n).map((b) => (b.a === n ? b.b : b.a));
    assert.ok(carbons.some((c) => ringCarbons.has(c)), 'every N is on a ring carbon');
  }
  assert.equal(writeSmiles(aminate(parseSmiles('CC'), seededRandom(1), { insert: 1 })), 'CNC', 'an N put into a C–C bond');
}); // End of test 'the seeded amine generator…'

test('buildCases checks aniline with the groups on its N and the functional-class amine name (I-36)', () => {
  const [aniline, methylAniline, ethylMethylAmine] = buildCases(['NC1=CC=CC=C1', 'CNC1=CC=CC=C1', 'CNCC'].map(parseSmiles));
  const entry = (item, style) => item.names.find((n) => n.style === style);
  assert.deepEqual(entry(aniline, 'traditional'), { style: 'traditional', spanish: 'anilina', english: 'aniline', error: null });
  assert.equal(entry(aniline, 'isopropil').english, 'benzenamine');
  assert.deepEqual(entry(methylAniline, 'traditional'), {
    style: 'traditional', spanish: 'N-metilanilina', english: 'N-methylaniline', error: null,
  });
  assert.deepEqual(entry(ethylMethylAmine, 'amineClass'), {
    style: 'amineClass', spanish: 'etilmetilamina', english: 'ethylmethylamine', error: null,
  });
  assert.equal(entry(ethylMethylAmine, 'isopropil').english, 'N-methylethanamine');
  // The English alkylamine names come from the same structure, rendered with the English lexicon.
  const english = (smiles) => {
    const mol = parseSmiles(smiles);
    return amineClassName(mol, nameMolecule(mol).structure, lexiconEn);
  };
  assert.equal(english('CC(C)(C)N(C)C(C)C'), 'tert-butylisopropylmethylamine');
  assert.equal(english('CN(C)C'), 'trimethylamine');
  assert.equal(english('CC(C)(C)NC(C)(C)C'), 'di-tert-butylamine');
  assert.equal(english('NCCO'), null, 'not a simple amine');
}); // End of test 'buildCases checks aniline…'
