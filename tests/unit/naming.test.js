/**
 * @file Unit tests for the naming engine (phase I-3): fixtures of unbranched
 * molecules, N1/N2 trace steps, name parts, error results, and the
 * no-coordinates / no-DOM purity rule for src/naming/.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { parseSmiles } from '../../src/model/smiles.js';
import { adjacency } from '../../src/model/graph.js';
import { createMolecule } from '../../src/model/molecule.js';
import { nameMolecule } from '../../src/naming/index.js';
import { bundleModules } from '../../scripts/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures', 'names.tsv');

/**
 * Reads the fixture table (design.md §4.8). Lines starting with `#` are
 * section headings; the first line is the column header.
 *
 * @returns {Promise<{line: number, smiles: string, name: string, rule: string, justification: string, alternatives: string}[]>} The rows.
 */
async function readFixtures() {
  const lines = (await readFile(FIXTURES, 'utf8')).split('\n');
  const rows = [];
  lines.slice(1).forEach((text, i) => {
    if (text.trim() === '' || text.startsWith('#')) {
      return;
    }
    const [smiles, name, rule, justification, alternatives = ''] = text.split('\t');
    rows.push({ line: i + 2, smiles, name, rule, justification, alternatives });
  });
  return rows;
}

/**
 * Tells whether a molecule is unbranched (no atom with more than two neighbours).
 *
 * @param {object} mol - The molecule.
 * @returns {boolean} True for an unbranched chain.
 */
function isUnbranched(mol) {
  return [...adjacency(mol).values()].every((list) => list.length <= 2);
}

const fixtureRows = await readFixtures();

test('fixture file has the §4.8 header and well-formed rows', async () => {
  const header = (await readFile(FIXTURES, 'utf8')).split('\n')[0];
  assert.equal(header, 'smiles\texpected_name\trule_tested\tjustification\talternatives');
  for (const row of fixtureRows) {
    assert.ok(row.smiles && row.name && row.rule && row.justification, `line ${row.line} is incomplete`);
  }
});

for (const row of fixtureRows) {
  const mol = parseSmiles(row.smiles);
  if (!isUnbranched(mol)) {
    continue; // Branched rows are named from phase 040 on.
  }
  test(`fixture line ${row.line}: ${row.smiles} → ${row.name}`, () => {
    const result = nameMolecule(mol);
    assert.equal(result.ok, true, JSON.stringify(result.error));
    assert.equal(result.name, row.name);
    assert.equal(result.parts.map((p) => p.text).join(''), result.name);
    assert.deepEqual(result.alternatives, []);
    assert.equal(result.parent.atoms.length, mol.atoms.size);
    if (mol.atoms.size > 1) {
      const n1 = result.trace.find((step) => step.rule === 'N1');
      assert.ok(n1, 'trace has an N1 step');
      assert.equal(n1.candidatesBefore.length, 2);
      assert.equal(n1.values.length, 2);
      n1.values.forEach((list) => assert.ok(Array.isArray(list)));
      const n2 = result.trace.find((step) => step.rule === 'N2');
      // N2 is applied exactly when N1 left both directions tied.
      assert.equal(Boolean(n2), n1.survivors.length === 2);
    }
  });
}

test('all acceptance names of phase I-3 are covered by fixtures', () => {
  const names = new Set(fixtureRows.map((row) => row.name));
  const required = [
    'metano', 'triacontano', 'eteno', 'etino', 'propeno', 'propino', 'propadieno', 'but-1-eno',
    'but-2-eno', 'buta-1,3-dieno', 'buta-1,2-dieno', 'pent-3-en-1-ino', 'pent-1-en-4-ino',
    'hexa-1,3-dien-5-ino', 'hex-1-en-3,5-diino', 'hexa-1,3,5-trieno', 'octa-1,7-diino',
  ];
  for (const name of required) {
    assert.ok(names.has(name), `missing fixture ${name}`);
  }
  const alkanes = fixtureRows.filter((row) => /^C+$/.test(row.smiles)).map((row) => row.smiles.length);
  assert.deepEqual(alkanes, Array.from({ length: 30 }, (_, i) => i + 1));
});

test('N1 and N2 steps record the compared locant lists', () => {
  const enyne = nameMolecule(parseSmiles('C#CC=CC'));
  const n1 = enyne.trace.find((step) => step.rule === 'N1');
  assert.deepEqual(n1.values, [[1, 3], [2, 4]]);
  assert.deepEqual(n1.survivors.map((c) => c.direction), ['forward']);
  assert.equal(enyne.trace.some((step) => step.rule === 'N2'), false);

  const dienyne = nameMolecule(parseSmiles('C=CC=CC#C'));
  const rules = dienyne.trace.map((step) => step.rule);
  assert.deepEqual(rules, ['P1', 'N1', 'N2']);
  assert.deepEqual(dienyne.trace[1].values, [[1, 3, 5], [1, 3, 5]]);
  assert.deepEqual(dienyne.trace[2].values, [[1, 3], [3, 5]]);
  assert.deepEqual(dienyne.parent.atoms, [1, 2, 3, 4, 5, 6]);

  const reversed = nameMolecule(parseSmiles('C#CC=CC=C'));
  assert.deepEqual(reversed.parent.atoms, [6, 5, 4, 3, 2, 1]);
  assert.equal(reversed.trace[2].survivors[0].direction, 'reverse');
});

test('symmetric chains end with the presentation tie-break', () => {
  const result = nameMolecule(parseSmiles('CC=CC'));
  const tie = result.trace.at(-1);
  assert.equal(tie.rule, 'TIE');
  assert.equal(tie.note, 'Las dos opciones dan el mismo nombre.');
  assert.deepEqual(result.parent.atoms, [1, 2, 3, 4]);
  assert.deepEqual(nameMolecule(parseSmiles('C')).trace.map((step) => step.rule), ['P1']);
});

test('parts carry kinds and atom/bond references', () => {
  const result = nameMolecule(parseSmiles('C=CC=CC#C'));
  const simple = result.parts.map((p) => [p.text, p.kind]);
  assert.deepEqual(simple, [
    ['hex', 'stem'], ['a', 'stem'], ['-', 'punct'], ['1', 'locant'], [',', 'punct'], ['3', 'locant'],
    ['-', 'punct'], ['di', 'multiplier'], ['en', 'ending'], ['-', 'punct'], ['5', 'locant'], ['-', 'punct'],
    ['ino', 'ending'],
  ]);
  const bondOf = (a, b) => [...parseSmiles('C=CC=CC#C').bonds.values()].find((x) => x.a === a && x.b === b).id;
  assert.deepEqual(result.parts[3].atoms, [1, 2]);
  assert.deepEqual(result.parts[3].bonds, [bondOf(1, 2)]);
  assert.deepEqual(result.parts[12].bonds, [bondOf(5, 6)]);
  assert.deepEqual(result.parts[0].atoms, [1, 2, 3, 4, 5, 6]);
  const omitted = nameMolecule(parseSmiles('C=C=C')).parts.map((p) => [p.text, p.kind]);
  assert.deepEqual(omitted, [['prop', 'stem'], ['a', 'stem'], ['di', 'multiplier'], ['eno', 'ending']]);
});

test('structure is language-neutral data', () => {
  const { structure } = nameMolecule(parseSmiles('C#CC=CC'));
  assert.equal(structure.parent.length, 5);
  assert.deepEqual(structure.parent.double.map((s) => s.locant), [3]);
  assert.deepEqual(structure.parent.triple.map((s) => s.locant), [1]);
  assert.deepEqual(structure.prefixes, []);
  // No words anywhere: every leaf value of the structure is a number.
  const leaves = [];
  JSON.stringify(structure, (key, value) => {
    if (value === null || typeof value !== 'object') {
      leaves.push(value);
    }
    return value;
  });
  assert.ok(leaves.length > 0);
  assert.ok(leaves.every((value) => typeof value === 'number'), 'structure holds only numbers');
});

test('invalid and branched input returns an error result', () => {
  assert.equal(nameMolecule(createMolecule()).error.code, 'EMPTY');
  assert.equal(nameMolecule(null).error.code, 'INVALID');
  const branched = nameMolecule(parseSmiles('CC(C)C'));
  assert.equal(branched.ok, false);
  assert.equal(branched.error.code, 'NOT_YET');
  assert.ok(branched.error.message.length > 0);
});

test('naming ignores atom coordinates', () => {
  const mol = parseSmiles('C=CC#C');
  const before = nameMolecule(mol);
  for (const atom of mol.atoms.values()) {
    atom.x = Math.random() * 1000;
    atom.y = -Math.random() * 1000;
  }
  assert.deepEqual(nameMolecule(mol), before);
});

test('src/naming never reads coordinates or browser globals', async () => {
  const dir = path.join(ROOT, 'src', 'naming');
  const forbidden = [
    /\.(?:x|y)\b/, // atom.x / atom.y
    /\[\s*['"`](?:x|y)['"`]\s*\]/, // atom['x']
    /\{[^}]*\b(?:x|y)\b[^}]*\}\s*=/, // const { x, y } = atom
    /\b(?:document|window|navigator|localStorage|sessionStorage)\b/,
  ];
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.js')) {
      continue;
    }
    const lines = (await readFile(path.join(dir, file), 'utf8')).split('\n');
    lines.forEach((line, i) => {
      for (const pattern of forbidden) {
        assert.doesNotMatch(line, pattern, `src/naming/${file}:${i + 1}: ${line.trim()}`);
      }
    });
  }
}); // End of test 'src/naming never reads coordinates or browser globals'

test('naming modules bundle and run in a classic script', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'organic-naming-'));
  try {
    for (const sub of ['model', 'naming']) {
      await mkdir(path.join(dir, sub));
      for (const file of await readdir(path.join(ROOT, 'src', sub))) {
        await copyFile(path.join(ROOT, 'src', sub, file), path.join(dir, sub, file));
      }
    }
    await writeFile(
      path.join(dir, 'entry.js'),
      [
        "import { parseSmiles } from './model/smiles.js';",
        "import { nameMolecule } from './naming/index.js';",
        "globalThis.__result = ['C=CC=CC#C', 'CCCC', 'C=C=C'].map((s) => nameMolecule(parseSmiles(s)).name).join(' ');",
      ].join('\n'),
    );
    const code = await bundleModules(path.join(dir, 'entry.js'), dir);
    const context = {};
    vm.runInNewContext(code, context);
    assert.equal(context.__result, 'hexa-1,3-dien-5-ino butano propadieno');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}); // End of test 'naming modules bundle and run in a classic script'
