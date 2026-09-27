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
import { canonicalTreeKey } from '../../src/model/graph.js';
import { validateForNaming } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { lexiconEn, stem } from '../../src/naming/lexicon.en.js';
import { parseFullSmiles, hydrocarbonTree, OracleSmilesError } from '../../scripts/oracle/smiles-full.mjs';
import { englishName, compareWithOpsin } from '../../scripts/oracle/compare.mjs';
import { generateMolecules } from '../../scripts/oracle/generate.mjs';
import { checkAvailability } from '../../scripts/oracle/opsin.mjs';
import { main, parseArgs } from '../../scripts/oracle/run.mjs';

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

test('hydrocarbonTree reduces OPSIN SMILES to a carbon tree and its formula', () => {
  const tree = hydrocarbonTree('[CH3]C([H])=C(C)C');
  assert.equal(tree.problem, null);
  assert.equal(tree.formula, 'C5H10');
  assert.equal(canonicalTreeKey(tree.mol), canonicalTreeKey(parseSmiles('CC=C(C)C')));
  assert.match(hydrocarbonTree('CCO').problem, /non-carbon/);
  assert.match(hydrocarbonTree('C1CC1').problem, /acyclic/);
  assert.match(hydrocarbonTree('c1ccccc1').problem, /aromatic/);
  assert.match(hydrocarbonTree('C[CH2]').problem, /valence/);
});

test('compareWithOpsin checks the structure and the formula', () => {
  const mol = parseSmiles('CCC(=C)CCC');
  assert.deepEqual(compareWithOpsin(mol, 'C=C(CC)CCC'), { status: 'passed', reason: null });
  assert.equal(compareWithOpsin(mol, 'CC=C(C)CCC').status, 'failed');
  assert.equal(compareWithOpsin(mol, 'CCC(C)CCC').status, 'failed');
  assert.equal(compareWithOpsin(mol, '').status, 'failed');
  assert.equal(compareWithOpsin(mol, 'CC?').status, 'adapter');
});

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
  assert.ok(lines.includes('passed: 0  failed: 0  skipped: 5  adapter failures: 0'));
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

test('real OPSIN round trip over 200 random molecules (skipped without Java or the jar)', async (t) => {
  const availability = await checkAvailability();
  if (!availability.ok) {
    t.skip(availability.reason);
    return;
  }
  const lines = [];
  t.mock.method(console, 'log', (text) => lines.push(text));
  const status = await main(['--count', '200', '--seed', '42']);
  assert.equal(status, 0, lines.join('\n'));
  assert.ok(lines.includes('passed: 200  failed: 0  skipped: 0  adapter failures: 0'), lines.join('\n'));
}); // End of test 'real OPSIN round trip over 200 random molecules'

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
