/**
 * @file Unit tests for the naming engine: every fixture row (unbranched,
 * branched, `-iliden`), P and N trace steps, name parts with prefixes, error
 * results, a seeded property test over random molecules, and the
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
import { numberParent, compareCitationKeys } from '../../src/naming/numbering.js';
import { substituentChainCandidates, nameSubstituent } from '../../src/naming/substituent.js';
import { citationKey } from '../../src/naming/render.js';
import { commonGroupName } from '../../src/naming/lexicon.es.js';
import { bundleModules } from '../../scripts/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures', 'names.tsv');
/** Marker of a fixture row left for a later phase (none may remain after phase I-6). */
const PENDING = /^pending\((I-\d+)\)/;
/** Minimum number of fixture rows (design.md §4.8, phase I-6). */
const MIN_FIXTURE_ROWS = 150;

/**
 * Reads the fixture table (design.md §4.8). Lines starting with `#` are
 * section headings; the first line is the column header.
 *
 * A row whose `rule_tested` starts with `pending(I-n)` was future work; since
 * phase I-6 every valid molecule is named, so no such row may remain.
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

test('fixture set: at least 150 rows, each with a rule and a non-empty justification, none pending', () => {
  assert.ok(fixtureRows.length >= MIN_FIXTURE_ROWS, `only ${fixtureRows.length} fixture rows`);
  for (const row of fixtureRows) {
    assert.ok(row.rule.trim().length > 0, `line ${row.line} has no rule`);
    assert.ok(row.justification.trim().length > 0, `line ${row.line} has no justification`);
    assert.equal(row.pending, null, `line ${row.line} is still pending (${row.pending})`);
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

test('all acceptance names of phase I-6 are covered by fixtures', () => {
  const bySmiles = new Map(fixtureRows.map((row) => [row.smiles, row]));
  const expect = [
    ['CCC(=C)CCC', '3-metilidenhexano', ''],
    ['CCCC(=CC)CCC', '4-etilidenheptano', ''],
    ['C=C(CCC)CCC', '4-metilidenheptano', ''],
    ['CCCCC(=C(C)C)CCCC', '5-isopropilidennonano', 'pin=5-(propan-2-iliden)nonano;substituted=5-(1-metiletiliden)nonano'],
    ['CCCCCCC(CC(=C)CCC)CCCCCC', '7-(2-metilidenpentil)tridecano', ''],
  ];
  for (const [smiles, name, alternatives] of expect) {
    assert.ok(bySmiles.has(smiles), `missing fixture ${smiles}`);
    assert.equal(bySmiles.get(smiles).name, name);
    assert.equal(bySmiles.get(smiles).alternatives, alternatives);
  }
  assert.ok(fixtureRows.some((row) => row.alternatives.includes('1-metilidenbutil')), 'a nested -iliden alternative');
  // Every mandatory row of design.md §4.8.
  const mandatory = [
    ['C=CC', 'propeno'], ['CC(C)C', '2-metilpropano'], ['C=CC(CCC)CCC', '4-etenilheptano'],
    ['C#CC(CCC)CCC', '4-etinilheptano'], ['C=CCC(CCCC)CCCC', '5-(prop-2-en-1-il)nonano'],
    ['CCC(=C)CCC', '3-metilidenhexano'], ['CCCC(=CC)CCC', '4-etilidenheptano'],
    ['CCCCC(C(C)C)CCCC', '5-isopropilnonano'], ['CCCC(C)CC(C(C)C)CCC', '4-isopropil-6-metilnonano'],
    ['CCC(C(C)C)CC', '3-etil-2-metilpentano'], ['CCC(CC)C(C)CC', '3-etil-4-metilhexano'],
    ['CC(C)(C)C', '2,2-dimetilpropano'], ['C=CC=C', 'buta-1,3-dieno'], ['C=C=CC', 'buta-1,2-dieno'],
    ['C#CC=CC', 'pent-3-en-1-ino'], ['C=CC=CC#C', 'hexa-1,3-dien-5-ino'], ['C=CC#CC#C', 'hex-1-en-3,5-diino'],
  ];
  for (const [smiles, name] of mandatory) {
    assert.equal(bySmiles.get(smiles)?.name, name, `mandatory row ${smiles}`);
  }
});

test('all acceptance names of phase I-5 are covered by fixtures', () => {
  const named = fixtureRows.filter((row) => !row.pending);
  const bySmiles = new Map(named.map((row) => [row.smiles, row]));
  const expect = [
    ['C=CC(CCC)CCC', '4-etenilheptano', ''],
    ['C#CC(CCC)CCC', '4-etinilheptano', ''],
    ['C=CCC(CCCC)CCCC', '5-(prop-2-en-1-il)nonano', ''],
    ['CCCCC(C(C)C)CCCC', '5-isopropilnonano', 'pin=5-(propan-2-il)nonano;substituted=5-(1-metiletil)nonano'],
    ['CCCC(C)CC(C(C)C)CCC', '4-isopropil-6-metilnonano', 'pin=4-metil-6-(propan-2-il)nonano;substituted=4-metil-6-(1-metiletil)nonano'],
    ['C=CCC(C=C(C)C)CCCCC', '4-(2-metilprop-1-en-1-il)non-1-eno', ''],
  ];
  for (const [smiles, name, alternatives] of expect) {
    assert.ok(bySmiles.has(smiles), `missing fixture ${smiles}`);
    assert.equal(bySmiles.get(smiles).name, name);
    assert.equal(bySmiles.get(smiles).alternatives, alternatives);
  }
  const names = named.map((row) => row.name);
  assert.ok(names.some((n) => n.includes('diisopropil')), 'a diisopropil row');
  assert.ok(named.some((row) => row.alternatives.includes('di(propan-2-il)')), 'a di(propan-2-il) alternative (P-16.9)');
  assert.ok(names.some((n) => n.includes('tert-butil')), 'a tert-butil row');
  assert.ok(names.includes('6-(2,2-dimetilpropil)-7-etildodecano'), 'compound prefix alphabetised under its inner multiplier');
  assert.equal(fixtureRows.filter((row) => row.pending === 'I-5').length, 0, 'no pending(I-5) rows remain');
  const section = named.filter((row) => row.line > named.find((r) => r.smiles === 'C=CC(CCC)CCC').line);
  assert.ok(section.length >= 18, `only ${section.length} I-5 rows`);
});

test('prefixStyle option: each style re-runs citation order and N4', () => {
  const mol = parseSmiles('CCCC(C)CC(C(C)C)CCC');
  const main = nameMolecule(mol);
  const pin = nameMolecule(mol, { prefixStyle: 'pin' });
  const substituted = nameMolecule(mol, { prefixStyle: 'substituted' });
  assert.equal(main.name, '4-isopropil-6-metilnonano');
  assert.equal(pin.name, '4-metil-6-(propan-2-il)nonano');
  assert.equal(substituted.name, '4-metil-6-(1-metiletil)nonano');
  assert.deepEqual(pin.alternatives.map((a) => a.style), ['isopropil', 'substituted']);
  assert.equal(pin.alternatives[0].name, main.name);
  assert.deepEqual(main.alternatives.map((a) => a.label), ['nombre preferido por la IUPAC (2013)', 'forma sistemática clásica']);
  // The locant 4 refers to a different chain atom in each style: numbering was re-run.
  const isoAtoms = main.parts[0].atoms;
  const pinAtoms = main.alternatives[0].parts[0].atoms;
  assert.equal(main.parts[0].text, '4');
  assert.equal(main.alternatives[0].parts[0].text, '4');
  assert.notDeepEqual(isoAtoms, pinAtoms);
  assert.deepEqual(main.alternatives[0].parts.map((p) => p.text).join(''), pin.name);
  const n4 = pin.trace.find((step) => step.rule === 'N4');
  assert.ok(n4, 'pin style decides by N4');
  assert.equal(nameMolecule(mol, { prefixStyle: 'nope' }).error.code, 'INTERNAL');
  // No isopropyl group: no alternatives, even with a tert-butyl group.
  assert.deepEqual(nameMolecule(parseSmiles('CCCCC(C(C)(C)C)CCCC')).alternatives, []);
  assert.equal(nameMolecule(parseSmiles('CCCCC(C(C)(C)C)CCCC'), { prefixStyle: 'substituted' }).name, '5-(1,1-dimetiletil)nonano');
});

test('enclosed prefixes: parts, parentheses, di for simple and bis for compound', () => {
  const result = nameMolecule(parseSmiles('CCCCC(C(C)C)(C(C)C)CCCC'), { prefixStyle: 'pin' });
  assert.deepEqual(result.parts.map((p) => [p.text, p.kind]), [
    ['5', 'locant'], [',', 'punct'], ['5', 'locant'], ['-', 'punct'], ['di', 'multiplier'], ['(', 'punct'],
    ['propan-2-il', 'prefix'], [')', 'punct'], ['non', 'stem'], ['ano', 'ending'],
  ]);
  assert.equal(result.parts[6].atoms.length, 6);
  assert.equal(nameMolecule(parseSmiles('CCCCC(C(C)C)(C(C)C)CCCC'), { prefixStyle: 'substituted' }).name, '5,5-bis(1-metiletil)nonano');
  assert.equal(nameMolecule(parseSmiles('CCCCC(CC(C)C)(CC(C)C)CCCC')).name, '5,5-bis(2-metilpropil)nonano');
  assert.equal(nameMolecule(parseSmiles('CCCCCC(CCC=C)(CCC=C)CCCCC')).name, '6,6-di(but-3-en-1-il)undecano');
  const nested = nameMolecule(parseSmiles('CCCCCCC(CC(C(C)C)CCC)CCCCCC'), { prefixStyle: 'pin' });
  assert.equal(nested.name, '7-[2-(propan-2-il)pentil]tridecano');
  assert.deepEqual(nested.parts.filter((p) => p.kind === 'punct').map((p) => p.text), ['-', '[', ']']);
});

test('substituent structures: chain, free valence, retained and common names', () => {
  const vinyl = nameMolecule(parseSmiles('C=CC(CCC)CCC')).structure.prefixes[0].substituent;
  assert.equal(vinyl.chain.length, 2);
  assert.deepEqual(vinyl.freeValence, { locant: 1, order: 1 });
  assert.equal(vinyl.commonName, 'vinyl');
  assert.equal(commonGroupName(vinyl.commonName), 'vinilo');
  const commons = [
    ['C=CCC(CCCC)CCCC', 'allyl', 'alilo'],
    ['CCCCC(CC(C)C)CCCC', 'isobutyl', 'isobutilo'],
    ['CCCCC(C(C)CC)CCCC', 'sec-butyl', 'sec-butilo'],
  ];
  for (const [smiles, id, word] of commons) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(result.structure.prefixes[0].substituent.commonName, id);
    assert.ok(!result.name.includes(word.slice(0, -1)), `${word} never in the name`);
  }
  const iso = nameMolecule(parseSmiles('CCCCC(C(C)C)CCCC'));
  assert.equal(iso.structure.prefixes[0].substituent.retained, 'isopropyl');
  const pin = nameMolecule(parseSmiles('CCCCC(C(C)C)CCCC'), { prefixStyle: 'pin' }).structure.prefixes[0].substituent;
  assert.equal(pin.retained, null);
  assert.equal(pin.commonName, 'isopropyl');
  assert.deepEqual(pin.freeValence, { locant: 2, order: 1 });
  assert.equal(pin.chain.length, 3);
  const sub = nameMolecule(parseSmiles('CCCCC(C(C)C)CCCC'), { prefixStyle: 'substituted' }).structure.prefixes[0].substituent;
  assert.deepEqual(sub.freeValence, { locant: 1, order: 1 });
  assert.equal(sub.chain.length, 2);
  assert.equal(sub.prefixes.length, 1);
  // Doubly attached groups: free valence of order 2.
  const mol = parseSmiles('CCC(=C)CCC');
  const methylidene = nameSubstituent(mol, 3, 4);
  assert.deepEqual(methylidene.freeValence, { locant: 1, order: 2 });
  assert.equal(methylidene.chain.length, 1);
  assert.equal(nameSubstituent(mol, 1, 6), null); // not bonded
  const ylidene = (smiles, style) => nameMolecule(parseSmiles(smiles), { prefixStyle: style }).structure.prefixes[0].substituent;
  assert.equal(ylidene('CCCCC(=C(C)C)CCCC').retained, 'isopropylidene');
  assert.equal(ylidene('CCCCC(=C(C)C)CCCC', 'pin').retained, null);
  assert.equal(ylidene('CCCCC(=C(C)C)CCCC', 'pin').commonName, 'isopropylidene');
  assert.equal(ylidene('CCCCC(=C=C)CCCC').commonName, 'vinylidene');
  assert.equal(ylidene('CCCCC(=CC=C)CCCC').commonName, 'allylidene');
  assert.equal(ylidene('CCCCCC(=C(C)CC)CCCCC').commonName, 'sec-butylidene');
  assert.equal(commonGroupName('isopropylidene'), 'isopropilideno');
  assert.equal(commonGroupName('vinylidene'), 'vinilideno');
});

test('substituent chain candidates contain the attachment atom', () => {
  const mol = parseSmiles('CC(C)CC'); // attach at atom 2 seen from atom 4: arms to 1 and 3
  const adj = adjacency(mol);
  const all = substituentChainCandidates(adj, 4, 2, false).map((c) => c.join('-')).sort();
  assert.deepEqual(all, ['1-2-3', '2-1', '2-3']);
  const arms = substituentChainCandidates(adj, 4, 2, true).map((c) => c.join('-')).sort();
  assert.deepEqual(arms, ['2-1', '2-3']);
  assert.deepEqual(substituentChainCandidates(adj, 4, 5, false), [[5]]);
});

test('citation keys: complete prefix name, inner multipliers kept, tert- ignored', () => {
  const key = (smiles, style) => citationKey(nameMolecule(parseSmiles(smiles), { prefixStyle: style }).structure.prefixes[0].substituent);
  assert.deepEqual(key('CCCCC(CC(C)(C)C)CCCC'), { alpha: 'dimetilpropil', numeric: [2, 2], italic: '' });
  assert.deepEqual(key('CCCCC(C(C)(C)C)CCCC'), { alpha: 'butil', numeric: [], italic: 'tert-' });
  assert.deepEqual(key('CCCCC(C(C)C)CCCC', 'pin'), { alpha: 'propanil', numeric: [2], italic: '' });
  assert.ok(compareCitationKeys({ alpha: 'butil', numeric: [] }, { alpha: 'butil', numeric: [], italic: 'tert-' }) < 0);
  assert.ok(compareCitationKeys({ alpha: 'metilbutil', numeric: [1] }, { alpha: 'metilbutil', numeric: [2] }) < 0);
  assert.ok(compareCitationKeys({ alpha: 'metil', numeric: [] }, { alpha: 'metiletil', numeric: [1] }) < 0);
});

test('N5 compares complete names, all letters before locants', () => {
  const result = nameMolecule(parseSmiles('CCCCCCCCC(CC(C)CCCCC)CC(CC(C)CC)CCCCC'));
  assert.equal(result.name, '6-(2-metilbutil)-8-(2-metilheptil)hexadecano');
  const n5 = result.trace.find((step) => step.rule === 'N5');
  assert.ok(n5, 'decided by N5');
  assert.equal(n5.survivors.length, 1);
});

test('-iliden groups are named at any depth, in every style', () => {
  const nested = nameMolecule(parseSmiles('CCCC(C(CCCCC)CCCCC)C(C=C)=CC'));
  assert.equal(nested.name, '6-(3-etilidenhept-1-en-4-il)undecano');
  // Substituted style: only arms from the free valence; N1 [2] picks the but-2-en arm over [3].
  const arms = nameMolecule(parseSmiles('CCCC(C(CCCCC)CCCCC)C(C=C)=CC'), { prefixStyle: 'substituted' });
  assert.equal(arms.name, '6-(2-etenil-1-propilbut-2-en-1-il)undecano');
  // The substituted alternative that needs a nested -iliden group (omitted before phase I-6).
  const mol = parseSmiles('CCCCCC(C(C)C)C(C(=C)CCC)CCCCC');
  const result = nameMolecule(mol);
  assert.equal(result.name, '6-isopropil-7-(pent-1-en-2-il)dodecano');
  assert.deepEqual(result.alternatives.map(({ style, name }) => [style, name]), [
    ['pin', '6-(pent-1-en-2-il)-7-(propan-2-il)dodecano'],
    ['substituted', '6-(1-metiletil)-7-(1-metilidenbutil)dodecano'],
  ]);
  const substituted = nameMolecule(mol, { prefixStyle: 'substituted' });
  assert.equal(substituted.name, '6-(1-metiletil)-7-(1-metilidenbutil)dodecano');
  assert.deepEqual(substituted.alternatives.map((a) => a.style), ['isopropil', 'pin']);
});

test('-iliden parts: the connecting bond is highlighted with the prefix and never in the parent', () => {
  const mol = parseSmiles('CCC(=C)CCC');
  const result = nameMolecule(mol);
  assert.deepEqual(result.parts.map((p) => [p.text, p.kind]), [
    ['3', 'locant'], ['-', 'punct'], ['metiliden', 'prefix'], ['hex', 'stem'], ['ano', 'ending'],
  ]);
  const connecting = [...mol.bonds.values()].find((b) => b.order === 2).id;
  assert.deepEqual(result.parts[2].bonds, [connecting]);
  assert.deepEqual(result.parts[2].atoms, [4]);
  assert.ok(!result.parent.bonds.includes(connecting));
  assert.deepEqual(result.structure.parent.double, []);
  assert.deepEqual(result.structure.prefixes[0].locants.map((l) => [l.locant, l.order]), [[3, 2]]);
  // P2/P3 ignore the connecting bond; P4 counts the group once.
  const p4 = nameMolecule(parseSmiles('CC(C)C(=C)C(C)C')).trace.find((step) => step.rule === 'P4');
  assert.deepEqual(p4.values, [3, 3, 3, 3]); // two methyls + one metiliden on every 5-C chain
  const selection = nameMolecule(parseSmiles('CCC(=C)C(CC)CC'));
  const p2 = selection.trace.find((step) => step.rule === 'P2');
  assert.deepEqual(p2.values, [0, 0]);
});

test('N5: when N4 ties but the names differ, the earlier prefixes win', () => {
  const mol = parseSmiles('CC(C)C');
  const chains = [[1, 2, 3], [1, 2, 4]];
  const prefixesOf = (chain) => (chain[2] === 3
    ? [{ atom: 2, key: 'x', citation: { alpha: 'propil', numeric: [] } }]
    : [{ atom: 2, key: 'y', citation: { alpha: 'etil', numeric: [] } }]);
  const result = numberParent(mol, chains, prefixesOf);
  const n5 = result.trace.find((step) => step.rule === 'N5');
  assert.ok(n5, 'N5 applied');
  assert.equal(result.chainIndex, 1);
  assert.equal(result.trace.at(-1).rule, 'TIE');
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
  // Prefix locants in citation order (etil, then metil), flattened.
  assert.deepEqual(n4.values, [[4, 5], [5, 4]]);
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

test('invalid input returns an error result', () => {
  assert.equal(nameMolecule(createMolecule()).error.code, 'EMPTY');
  assert.equal(nameMolecule(null).error.code, 'INVALID');
});

test('more than 30 identical prefixes use composed multipliers', () => {
  const big = nameMolecule(parseSmiles(`C${'C(C)(C)'.repeat(16)}C`)); // 50 C, 32 methyls
  assert.equal(big.ok, true, JSON.stringify(big.error));
  assert.match(big.name, /-dotriacontametiloctadecano$/);
  const biggest = nameMolecule(parseSmiles(`C${'C(C)(C)'.repeat(19)}C`)); // 59 C, 38 methyls
  assert.equal(biggest.ok, true, JSON.stringify(biggest.error));
  assert.match(biggest.name, /^2,2,3,3,.*,20,20-octatriacontametilhenicosano$/);
});

/**
 * Builds a random valid acyclic hydrocarbon (seeded, deterministic): each new
 * atom bonds to an earlier one with room for the bond (25 % double, 7 %
 * triple bonds when possible).
 *
 * @param {function(): number} random - Seeded generator in [0, 1).
 * @param {number} size - Number of carbon atoms.
 * @returns {object} The molecule.
 */
function randomTree(random, size) {
  const mol = createMolecule();
  const valence = [0];
  for (let i = 1; i <= size; i += 1) {
    addAtom(mol);
    valence.push(0);
    if (i > 1) {
      const r = random();
      let order = r < 0.25 ? 2 : r < 0.32 ? 3 : 1;
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
  } // End of the loop that adds one atom per step
  return mol;
} // End of function randomTree()

test('property: 500 random valid molecules are always named, in every style', () => {
  let seed = 12345;
  const random = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  let ylidene = 0;
  for (let t = 0; t < 500; t += 1) {
    const mol = randomTree(random, 2 + Math.floor(random() * 29));
    for (const prefixStyle of ['isopropil', 'pin', 'substituted']) {
      let result;
      assert.doesNotThrow(() => {
        result = nameMolecule(mol, { prefixStyle });
      });
      assert.equal(result.ok, true, JSON.stringify(result.error));
      assert.ok(typeof result.name === 'string' && result.name.length > 0);
      assert.equal(result.parts.map((p) => p.text).join(''), result.name);
      result.alternatives.forEach((alt) => assert.notEqual(alt.name, result.name));
      ylidene += prefixStyle === 'isopropil' && result.name.includes('iliden') ? 1 : 0;
    }
  } // End of the loop that builds and names random trees
  assert.ok(ylidene > 50, `only ${ylidene} names with an -iliden group`);
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
        "globalThis.__result = ['C=CC=CC#C', 'CCCC', 'C=C=C', 'CCCC(C)CC(C(C)C)CCC', 'CCC(=C)CCC'].map((s) => nameMolecule(parseSmiles(s)).name).join(' ');",
      ].join('\n'),
    );
    const code = await bundleModules(path.join(dir, 'entry.js'), dir);
    const context = {};
    vm.runInNewContext(code, context);
    assert.equal(context.__result, 'hexa-1,3-dien-5-ino butano propadieno 4-isopropil-6-metilnonano 3-metilidenhexano');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}); // End of test 'naming modules bundle and run in a classic script'
