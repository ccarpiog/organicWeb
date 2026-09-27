/**
 * @file Unit tests for the naming engine: every fixture row (unbranched and
 * branched; rows marked `pending(I-n)` must still return NOT_YET), P and N
 * trace steps, name parts with prefixes, error results, and the
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
import { createMolecule, addAtom, addBond } from '../../src/model/molecule.js';
import { nameMolecule } from '../../src/naming/index.js';
import { bundleModules } from '../../scripts/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures', 'names.tsv');
/** Marker of a fixture row that a later phase will name. */
const PENDING = /^pending\((I-\d+)\)\s/;

/**
 * Reads the fixture table (design.md §4.8). Lines starting with `#` are
 * section headings; the first line is the column header.
 *
 * A row whose `rule_tested` starts with `pending(I-n)` is future work: phase
 * I-n names it, and until then the engine must return NOT_YET for it.
 *
 * @returns {Promise<{line: number, smiles: string, name: string, rule: string, justification: string, alternatives: string, pending: string|null}[]>} The rows.
 */
async function readFixtures() {
  const lines = (await readFile(FIXTURES, 'utf8')).split('\n');
  const rows = [];
  lines.slice(1).forEach((text, i) => {
    if (text.trim() === '' || text.startsWith('#')) {
      return;
    }
    const [smiles, name, rule, justification, alternatives = ''] = text.split('\t');
    const pending = (PENDING.exec(rule) || [])[1] || null;
    rows.push({ line: i + 2, smiles, name, rule, justification, alternatives, pending });
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

/**
 * Parses the `alternatives` fixture column (`style=name` pairs separated by `;`).
 *
 * @param {string} text - The column text (may be empty).
 * @returns {{style: string, name: string}[]} The expected alternatives.
 */
function parseAlternatives(text) {
  return text.split(';').filter(Boolean).map((pair) => {
    const [style, name] = pair.split('=');
    return { style, name };
  });
}

for (const row of fixtureRows) {
  const mol = parseSmiles(row.smiles);
  if (row.pending) {
    test(`fixture line ${row.line}: ${row.smiles} is still pending (${row.pending})`, () => {
      const result = nameMolecule(mol);
      assert.equal(result.ok, false, `now named ${result.name}: remove the pending marker`);
      assert.equal(result.error.code, 'NOT_YET');
    });
    continue;
  }
  test(`fixture line ${row.line}: ${row.smiles} → ${row.name}`, () => {
    const result = nameMolecule(mol);
    assert.equal(result.ok, true, JSON.stringify(result.error));
    assert.equal(result.name, row.name);
    assert.equal(result.parts.map((p) => p.text).join(''), result.name);
    assert.deepEqual(result.alternatives.map(({ style, name }) => ({ style, name })), parseAlternatives(row.alternatives));
    const p1 = result.trace[0];
    assert.equal(p1.rule, 'P1');
    assert.equal(result.parent.atoms.length, Math.max(...p1.values));
    if (isUnbranched(mol)) {
      assert.equal(result.parent.atoms.length, mol.atoms.size);
    }
    if (mol.atoms.size > 1) {
      const n1 = result.trace.find((step) => step.rule === 'N1');
      assert.ok(n1, 'trace has an N1 step');
      assert.ok(n1.candidatesBefore.length >= 2);
      assert.equal(n1.values.length, n1.candidatesBefore.length);
      n1.values.forEach((list) => assert.ok(Array.isArray(list)));
      const n2 = result.trace.find((step) => step.rule === 'N2');
      // N2 is applied exactly when N1 left more than one candidate.
      assert.equal(Boolean(n2), n1.survivors.length > 1);
    }
  });
} // End of the loop that registers one test per fixture row

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

test('all acceptance names of phase I-4 are covered by fixtures', () => {
  const named = fixtureRows.filter((row) => !row.pending);
  const bySmiles = new Map(named.map((row) => [row.smiles, row.name]));
  assert.equal(bySmiles.get('CCC(C(C)C)CC'), '3-etil-2-metilpentano');
  assert.equal(bySmiles.get('CCC(CC)C(C)CC'), '3-etil-4-metilhexano');
  const names = new Set(named.map((row) => row.name));
  const required = [
    '2-metilpropano', '2,2-dimetilpropano', '3-etilpentano', '3-etil-2-metilhexano',
    '4-etil-2,2-dimetilhexano', '2-metilprop-1-eno', '2-metilbuta-1,3-dieno',
  ];
  for (const name of required) {
    assert.ok(names.has(name), `missing fixture ${name}`);
  }
  const branched = named.filter((row) => !isUnbranched(parseSmiles(row.smiles)));
  assert.ok(branched.length >= 19, `only ${branched.length} branched rows`);
});

test('P steps record counts and survivors', () => {
  const result = nameMolecule(parseSmiles('CCC(C(C)C)CC'));
  const rules = result.trace.map((step) => step.rule);
  // IUPAC 2013 order: unsaturation locants (N1, N2) come before P4.
  assert.deepEqual(rules, ['P1', 'P2', 'P3', 'N1', 'N2', 'P4', 'N3', 'N4', 'TIE']);
  const p1 = result.trace[0];
  const p4 = result.trace[5];
  assert.equal(p1.values.length, p1.candidatesBefore.length);
  assert.equal(p1.survivors.length, 5); // every 5-carbon chain
  assert.deepEqual([...p4.values].sort(), [1, 2, 2, 2, 2]);
  assert.equal(p4.survivors.length, 4);
  p4.candidatesBefore.forEach((c) => assert.equal(c.direction, undefined));

  const alkene = nameMolecule(parseSmiles('C=CC(CC)CC'));
  const p2 = alkene.trace.find((step) => step.rule === 'P2');
  assert.deepEqual([...p2.values].sort(), [0, 1, 1]);
  assert.equal(p2.survivors.length, 2);
  // An unbranched chain has one candidate: only P1 is recorded.
  assert.deepEqual(nameMolecule(parseSmiles('CCCC')).trace.filter((s) => s.rule[0] === 'P').map((s) => s.rule), ['P1']);
});

test('N3 and N4 steps compare locant lists term by term', () => {
  const sums = nameMolecule(parseSmiles('CC(C)CCC(C)(C)CC'));
  const n3 = sums.trace.find((step) => step.rule === 'N3');
  // Two equivalent 7-carbon chains (C1 or the methyl on C2), both directions each.
  assert.deepEqual(n3.values, [[2, 5, 5], [3, 3, 6], [2, 5, 5], [3, 3, 6]]);
  assert.equal(n3.survivors.length, 2); // equal sums (12): the first difference decides
  assert.equal(sums.name, '2,5,5-trimetilheptano');

  const n4case = nameMolecule(parseSmiles('CCCC(CC)C(C)CCC'));
  const n4 = n4case.trace.find((step) => step.rule === 'N4');
  // Groups in citation order: etil, then metil.
  assert.deepEqual(n4.values, [[[4], [5]], [[5], [4]]]);
  assert.equal(n4.survivors.length, 1);
  assert.equal(n4case.trace.at(-1).rule, 'N4');
  assert.equal(n4case.name, '4-etil-5-metiloctano');
});

test('prefix parts carry kinds and atom/bond references', () => {
  const mol = parseSmiles('CC(C)(C)CC(CC)CC');
  const result = nameMolecule(mol);
  assert.deepEqual(result.parts.map((p) => [p.text, p.kind]), [
    ['4', 'locant'], ['-', 'punct'], ['etil', 'prefix'], ['-', 'punct'],
    ['2', 'locant'], [',', 'punct'], ['2', 'locant'], ['-', 'punct'], ['di', 'multiplier'], ['metil', 'prefix'],
    ['hex', 'stem'], ['ano', 'ending'],
  ]);
  const ethyl = result.parts[2];
  assert.equal(ethyl.atoms.length, 2);
  assert.equal(ethyl.bonds.length, 2); // connecting bond + inner bond
  const dimethyl = result.parts[9];
  assert.equal(dimethyl.atoms.length, 2);
  assert.ok(result.parts[0].atoms.includes(result.parent.atoms[3]));
  const { structure } = result;
  assert.equal(structure.prefixes.length, 2);
  assert.deepEqual(structure.prefixes[1].locants.map((l) => l.locant), [2, 2]);
  assert.equal(structure.prefixes[1].substituent.chain.length, 1);
  assert.deepEqual(structure.prefixes[0].substituent.freeValence, { locant: 1, order: 1 });
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

test('invalid input and unsupported substituents return an error result', () => {
  assert.equal(nameMolecule(createMolecule()).error.code, 'EMPTY');
  assert.equal(nameMolecule(null).error.code, 'INVALID');
  for (const smiles of ['C=CC(CCC)CCC', 'CCC(=C)CCC', 'CCCCC(C(C)C)CCCC']) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.code, 'NOT_YET');
    assert.ok(result.error.message.length > 0);
  }
});

test('more than 30 identical prefixes use composed multipliers', () => {
  const big = nameMolecule(parseSmiles(`C${'C(C)(C)'.repeat(16)}C`)); // 50 C, 32 methyls
  assert.equal(big.ok, true, JSON.stringify(big.error));
  assert.match(big.name, /-dotriacontametiloctadecano$/);
  const biggest = nameMolecule(parseSmiles(`C${'C(C)(C)'.repeat(19)}C`)); // 59 C, 38 methyls
  assert.equal(biggest.ok, true, JSON.stringify(biggest.error));
  assert.match(biggest.name, /^2,2,3,3,.*,20,20-octatriacontametilhenicosano$/);
});

test('random valid trees get a name or NOT_YET, never an exception', () => {
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  let named = 0;
  for (let t = 0; t < 3000; t += 1) {
    const mol = createMolecule();
    const size = 2 + Math.floor(random() * 14);
    const valence = [0];
    for (let i = 1; i <= size; i += 1) {
      addAtom(mol);
      valence.push(0);
      if (i > 1) {
        const r = random();
        let order = r < 0.1 ? 2 : r < 0.13 ? 3 : 1;
        let free = valence.map((v, a) => a).filter((a) => a >= 1 && a < i && valence[a] + order <= 4);
        if (free.length === 0) {
          order = 1; // a leaf always has room for a single bond
          free = valence.map((v, a) => a).filter((a) => a >= 1 && a < i && valence[a] <= 3);
        }
        const other = free[Math.floor(random() * free.length)];
        addBond(mol, other, i, order);
        valence[other] += order;
        valence[i] += order;
      }
    }
    const result = nameMolecule(mol);
    assert.ok(result.ok || result.error.code === 'NOT_YET', JSON.stringify(result.error));
    named += result.ok ? 1 : 0;
  } // End of the loop that builds and names random trees
  assert.ok(named > 1000);
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
