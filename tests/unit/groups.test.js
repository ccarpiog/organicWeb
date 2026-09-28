/**
 * @file Unit tests for characteristic-group detection (src/naming/groups.js),
 * seniority and the suffix/prefix choice (src/naming/seniority.js), the
 * group lexicon entries, and the group steps of a HETEROATOM refusal
 * (design.md §13.4 I-29). Snapshots of those steps live in
 * tests/fixtures/explain-group-snapshots.json (`UPDATE_SNAPSHOTS=1 npm test`).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSmiles } from '../../src/model/smiles.js';
import { moleculeToJSON, moleculeFromJSON } from '../../src/model/molecule.js';
import { detectGroups, GROUP_KINDS, SUFFIX_KINDS } from '../../src/naming/groups.js';
import { SENIORITY, PREFIX_ONLY, principalKind, classifyGroups, analyzeGroups, seniorityRank } from '../../src/naming/seniority.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { nameMolecule } from '../../src/naming/index.js';
import { explain, parseMarkup, plainText, GLOSSARY, STEP_TITLES } from '../../src/explain/explain.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SNAPSHOTS = path.join(ROOT, 'tests', 'fixtures', 'explain-group-snapshots.json');

/**
 * Kinds of the groups of a SMILES, in detection order.
 *
 * @param {string} smiles - The molecule.
 * @returns {string[]} Group kinds.
 */
function kinds(smiles) {
  return detectGroups(parseSmiles(smiles)).map((g) => g.kind);
}

/**
 * The only group of a SMILES (fails when there is not exactly one).
 *
 * @param {string} smiles - The molecule.
 * @returns {object} The group record.
 */
function only(smiles) {
  const groups = detectGroups(parseSmiles(smiles));
  assert.equal(groups.length, 1, `${smiles}: one group`);
  return groups[0];
}

/**
 * Rebuilds a molecule with permuted atom ids and reversed bond order and
 * endpoints, and returns the id map.
 *
 * @param {object} mol - The source molecule.
 * @param {number} seed - Permutation seed.
 * @returns {{mol: object, back: Map<number, number>, bondBack: function(number): number}} The relabelled molecule and maps back to the original ids.
 */
function relabel(mol, seed) {
  const data = moleculeToJSON(mol);
  const ids = data.atoms.map((t) => t.id);
  const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
  let step = 5;
  while (gcd(step, ids.length) !== 1) {
    step += 1;
  }
  const map = new Map(ids.map((id, i) => [id, 100 + ids[(i * step + seed) % ids.length]]));
  data.atoms = data.atoms.map((t) => ({ ...t, id: map.get(t.id) })).reverse();
  data.bonds = data.bonds.map((t) => ({ ...t, id: t.id + 50, a: map.get(t.b), b: map.get(t.a) })).reverse();
  const back = new Map([...map].map(([from, to]) => [to, from]));
  return { mol: moleculeFromJSON(data).mol, back, bondBack: (id) => id - 50 };
}

/**
 * Describes groups with ids mapped back, in a canonical order, for comparing
 * a molecule with a relabelled copy.
 *
 * @param {object[]} groups - Group records.
 * @param {function(number): number} atom - Atom-id map.
 * @param {function(number): number} bond - Bond-id map.
 * @returns {string[]} Sorted JSON descriptions.
 */
function canonical(groups, atom, bond) {
  const sort = (list) => [...list].sort((p, q) => p - q);
  return groups.map((g) => JSON.stringify({
    ...g,
    atoms: sort(g.atoms.map(atom)),
    bonds: sort(g.bonds.map(bond)),
    carbon: g.carbon === null ? null : atom(g.carbon),
    attachedTo: sort(g.attachedTo.map(atom)),
    roles: Object.fromEntries(Object.entries(g.roles).map(([k, v]) => [k, atom(v)]).sort()),
  })).sort();
}

test('each family is detected with its atoms, functional carbon and attachment', () => {
  // CC(=O)O: atoms 1 C, 2 C(=O), 3 O, 4 O.
  const acid = only('CC(=O)O');
  assert.equal(acid.kind, 'acid');
  assert.deepEqual(acid.atoms, [2, 3, 4]);
  assert.equal(acid.carbon, 2);
  assert.deepEqual(acid.attachedTo, [1]);
  assert.deepEqual(acid.roles, { carbonylOxygen: 3, hydroxyOxygen: 4, acylCarbon: 1 });
  assert.equal(acid.canBeSuffix, true);
  assert.equal(acid.bonds.length, 2);

  const ester = only('CC(=O)OC');
  assert.equal(ester.kind, 'ester');
  assert.deepEqual(ester.attachedTo, [1, 5]);
  assert.deepEqual(ester.roles, { carbonylOxygen: 3, bridgeOxygen: 4, alkylCarbon: 5, acylCarbon: 1 });
  assert.equal(only('O=COC').kind, 'ester', 'methyl formate: no acyl carbon');
  assert.equal(only('O=COC').roles.acylCarbon, undefined);

  const amide = only('CC(=O)N');
  assert.equal(amide.kind, 'amide');
  assert.equal(amide.substitution, 0);
  assert.equal(only('CC(=O)NC').substitution, 1);
  assert.equal(only('CC(=O)N(C)C').substitution, 2);

  const nitrile = only('CC#N');
  assert.equal(nitrile.kind, 'nitrile');
  assert.deepEqual(nitrile.atoms, [2, 3]);
  assert.equal(nitrile.carbon, 2);
  assert.equal(only('N#CC#N'.slice(0, 3)).kind, 'nitrile', 'HCN');

  assert.equal(only('CC=O').kind, 'aldehyde');
  assert.equal(only('C=O').kind, 'aldehyde', 'methanal');
  assert.equal(only('CC(=O)C').kind, 'ketone');
  assert.equal(only('O=C1CCCCC1').kind, 'ketone', 'cyclohexanone');

  const alcohol = only('CCO');
  assert.equal(alcohol.kind, 'alcohol');
  assert.equal(alcohol.phenol, false);
  assert.equal(alcohol.carbon, null);
  assert.deepEqual(alcohol.roles, { oxygen: 3, carbon: 2 });
  assert.equal(only('C=CO').kind, 'alcohol', 'an OH on a C=C carbon is still an alcohol');

  const ether = only('CCOC');
  assert.equal(ether.kind, 'ether');
  assert.equal(ether.canBeSuffix, false);
  assert.deepEqual(ether.attachedTo, [2, 4]);

  assert.deepEqual(['CN', 'CNC', 'CN(C)C'].map((s) => only(s).amineClass), ['primary', 'secondary', 'tertiary']);
  assert.ok(['CN', 'CNC', 'CN(C)C'].every((s) => only(s).kind === 'amine'));

  for (const [smiles, element] of [['CF', 'F'], ['CCl', 'Cl'], ['CBr', 'Br'], ['CI', 'I']]) {
    const halide = only(smiles);
    assert.equal(halide.kind, 'halide');
    assert.equal(halide.element, element);
    assert.equal(halide.canBeSuffix, false);
  }
});

test('no overlaps: the larger pattern claims its atoms', () => {
  assert.deepEqual(kinds('CC(=O)O'), ['acid'], 'acid, not alcohol + ketone/aldehyde');
  assert.deepEqual(kinds('CC(=O)OC'), ['ester'], 'ester, not ether + ketone');
  assert.deepEqual(kinds('CC(=O)NC'), ['amide'], 'amide, not amine + ketone');
  assert.deepEqual(kinds('CCC=O'), ['aldehyde'], 'terminal C=O with H');
  assert.deepEqual(kinds('CC(=O)CC'), ['ketone'], 'C=O between two carbons');
  assert.deepEqual(kinds('OC1=CC=CC=C1'), ['alcohol']);
  assert.equal(only('OC1=CC=CC=C1').phenol, true, 'phenol: OH on a benzene carbon');
  assert.equal(only('OC1=CCCCC1').phenol, false, 'a cyclohexene is not benzene');
  assert.equal(only('OCC1=CC=CC=C1').phenol, false, 'benzyl alcohol: OH not on the ring');
  assert.equal(only('OC(=O)C1=CC=CC=C1').kind, 'acid', 'benzoic acid is not a phenol');
  for (const smiles of ['CC(=O)O', 'CC(=O)OC', 'CC(=O)OCC(=O)N', 'OC(=O)CC(=O)CCO', 'NCC(O)C(=O)OC']) {
    const groups = detectGroups(parseSmiles(smiles));
    const atoms = groups.flatMap((g) => g.atoms);
    assert.equal(new Set(atoms).size, atoms.length, `${smiles}: no atom in two groups`);
    const hetero = [...parseSmiles(smiles).atoms.values()].filter((a) => a.element !== 'C').map((a) => a.id);
    assert.ok(hetero.every((id) => atoms.includes(id)), `${smiles}: every heteroatom is in a group`);
  }
});

test('several groups are listed in seniority order, then by atom id', () => {
  assert.deepEqual(kinds('OCCC(=O)O'), ['acid', 'alcohol']);
  assert.deepEqual(kinds('NCCO'), ['alcohol', 'amine']);
  assert.deepEqual(kinds('ClCC(=O)CC=O'), ['aldehyde', 'ketone', 'halide']);
  assert.deepEqual(kinds('OC(=O)C(=O)O'), ['acid', 'acid'], 'two acids on bonded carbons stay apart');
  assert.deepEqual(kinds('O=CC=O'), ['aldehyde', 'aldehyde']);
  assert.deepEqual(kinds('COCCOC'), ['ether', 'ether']);
  assert.deepEqual(kinds('ClC(Cl)(Cl)Cl'), ['halide', 'halide', 'halide', 'halide']);
  assert.deepEqual(kinds('N#CCC(=O)OCC'), ['ester', 'nitrile']);
  assert.deepEqual(kinds('CCCC'), [], 'a hydrocarbon has no groups');
});

test('unrecognised patterns become one unsupported record each', () => {
  const reason = (smiles) => {
    const group = only(smiles);
    assert.equal(group.kind, 'unsupported', smiles);
    assert.equal(group.canBeSuffix, false);
    return group.reason;
  };
  assert.equal(reason('COOC'), 'heteroatomBond', 'peroxide');
  assert.equal(reason('CNO'), 'heteroatomBond', 'hydroxylamine');
  assert.equal(reason('CNN'), 'heteroatomBond', 'hydrazine');
  assert.equal(reason('CNCl'), 'heteroatomBond', 'N-chloro');
  assert.equal(reason('COCl'), 'heteroatomBond', 'hypochlorite');
  assert.equal(reason('CC(=O)OO'), 'heteroatomBond', 'peracid');
  assert.equal(reason('CC=NC'), 'imine');
  assert.equal(reason('CC(=N)C'), 'imine');
  assert.equal(reason('O'), 'noCarbon');
  assert.equal(reason('N'), 'noCarbon');
  assert.equal(reason('ClCl'), 'heteroatomBond');
  assert.equal(reason('CC(=O)Cl'), 'carbonylDerivative', 'acyl chloride');
  assert.equal(reason('CC(=O)OC(=O)C'), 'carbonylDerivative', 'anhydride');
  assert.equal(reason('COC(=O)OC'), 'carbonylDerivative', 'carbonate');
  assert.equal(reason('CC(=O)NC(=O)C'), 'carbonylDerivative', 'imide');
  assert.equal(reason('C=C=O'), 'carbonylDerivative', 'ketene');
  assert.equal(reason('O=C=O'), 'carbonylDerivative', 'carbon dioxide');
  assert.equal(reason('NC(N)=O'), 'carbonylDerivative', 'urea');
  assert.equal(reason('ClC#N'), 'carbonylDerivative', 'cyanogen chloride');
  // An unsupported cluster does not hide the recognisable groups elsewhere.
  assert.deepEqual(kinds('OCCOOC'), ['alcohol', 'unsupported']);
});

test('detection is invariant under atom-id renumbering and bond order', () => {
  const molecules = [
    'OC(=O)CC(=O)CCO', 'CC(=O)OCC(=O)N', 'NCC(O)C(=O)OC', 'N#CCC(Cl)C=O', 'OC1=CC=CC=C1',
    'OC1=CC=CC=C1C', 'CCN(C)CCOCC', 'COOCC(=O)NC', 'ClCC(Br)CI',
  ];
  for (const smiles of molecules) {
    const mol = parseSmiles(smiles);
    const reference = canonical(detectGroups(mol), (id) => id, (id) => id);
    for (const seed of [1, 2, 5]) {
      const copy = relabel(mol, seed);
      const groups = detectGroups(copy.mol);
      assert.deepEqual(canonical(groups, (id) => copy.back.get(id), copy.bondBack), reference, `${smiles} (${seed})`);
      assert.deepEqual(groups.map((g) => g.kind).sort(), detectGroups(mol).map((g) => g.kind).sort());
    }
  }
});

test('seniority: ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina', () => {
  assert.deepEqual(SENIORITY, ['acid', 'ester', 'amide', 'nitrile', 'aldehyde', 'ketone', 'alcohol', 'amine']);
  assert.deepEqual([...SENIORITY, ...PREFIX_ONLY, 'unsupported'], GROUP_KINDS);
  assert.deepEqual(SUFFIX_KINDS, SENIORITY);
  // Every pair: the more senior kind is principal, whatever the listing order.
  for (let i = 0; i < SENIORITY.length; i += 1) {
    for (let j = i + 1; j < SENIORITY.length; j += 1) {
      const pair = [{ kind: SENIORITY[j] }, { kind: SENIORITY[i] }];
      assert.equal(principalKind(pair), SENIORITY[i], `${SENIORITY[i]} vs ${SENIORITY[j]}`);
      assert.equal(principalKind([...pair].reverse()), SENIORITY[i]);
    }
    assert.equal(principalKind([{ kind: 'ether' }, { kind: 'halide' }, { kind: SENIORITY[i] }]), SENIORITY[i]);
  }
  assert.equal(principalKind([{ kind: 'ether' }, { kind: 'halide' }]), null, 'ethers and halides are never principal');
  assert.equal(principalKind([{ kind: 'unsupported' }]), null);
  assert.equal(principalKind([]), null);
  assert.equal(seniorityRank('ether'), Infinity);
  // On real molecules.
  const principal = (smiles) => analyzeGroups(parseSmiles(smiles)).principal;
  assert.equal(principal('OCCC(=O)O'), 'acid');
  assert.equal(principal('OC(=O)CC(=O)OC'), 'acid');
  assert.equal(principal('NC(=O)CC(=O)OC'), 'ester');
  assert.equal(principal('N#CCC(N)=O'), 'amide');
  assert.equal(principal('N#CCC=O'), 'nitrile');
  assert.equal(principal('O=CCC(=O)C'), 'aldehyde');
  assert.equal(principal('OCCC(=O)C'), 'ketone');
  assert.equal(principal('NCCO'), 'alcohol');
  assert.equal(principal('NCCOC'), 'amine');
  assert.equal(principal('ClCCOC'), null);
});

test('classification: principal groups are suffixes, the others prefixes, with Spanish and English forms', () => {
  const analysis = analyzeGroups(parseSmiles('ClCC(O)CC(=O)CC(=O)O'));
  assert.equal(analysis.principal, 'acid');
  assert.equal(analysis.unsupported, false);
  const by = Object.fromEntries(analysis.items.map((g) => [g.kind, g]));
  assert.deepEqual([by.acid.role, by.acid.suffix], ['suffix', 'oico']);
  assert.deepEqual([by.ketone.role, by.ketone.prefix], ['prefix', 'oxo']);
  assert.deepEqual([by.alcohol.role, by.alcohol.prefix], ['prefix', 'hidroxi']);
  assert.deepEqual([by.halide.role, by.halide.prefix, by.halide.suffix], ['prefix', 'cloro', null]);
  const twoAlcohols = analyzeGroups(parseSmiles('OCCO'));
  assert.deepEqual(twoAlcohols.items.map((g) => g.role), ['suffix', 'suffix'], 'every group of the principal kind is a suffix');
  const odd = analyzeGroups(parseSmiles('OCCOOC'));
  assert.equal(odd.unsupported, true);
  assert.deepEqual(odd.items.map((g) => g.role), ['suffix', 'unsupported']);
  assert.equal(odd.items[1].prefix, null);
  const english = classifyGroups(detectGroups(parseSmiles('NCC(=O)O')), lexiconEn);
  assert.deepEqual(english.items.map((g) => [g.role, g.role === 'suffix' ? g.suffix : g.prefix]), [['suffix', 'oic acid'], ['prefix', 'amino']]);
});

test('a prefix ester or amide takes the prefix of the end that faces the principal group', () => {
  const prefixGroup = (smiles, kind) => analyzeGroups(parseSmiles(smiles)).items.find((g) => g.kind === kind);
  const cases = [
    ['CC(=O)OCC(=O)O', 'ester', 'heteroatom', 'aciloxi'], // acetiloxi: bonded to the acid side through its O
    ['CCOC(=O)CC(=O)O', 'ester', 'carbonyl', 'alcoxicarbonil'], // etoxicarbonil: bonded through its carbonyl carbon
    ['O=COCC(=O)O', 'ester', 'heteroatom', 'aciloxi'], // formiloxi: a formate has no acyl carbon
    ['CC(=O)NCC(=O)O', 'amide', 'heteroatom', 'acilamino'], // acetilamino: bonded through its N
    ['NC(=O)CC(=O)O', 'amide', 'carbonyl', 'carbamoil'], // bonded through its carbonyl carbon
    ['CC(=O)NCC(=O)OC', 'amide', 'heteroatom', 'acilamino'], // the principal is an ester
  ];
  for (const [smiles, kind, attachment, prefix] of cases) {
    const group = prefixGroup(smiles, kind);
    assert.equal(group.role, 'prefix', smiles);
    assert.equal(group.attachment, attachment, smiles);
    assert.equal(group.prefix, prefix, smiles);
    const copy = relabel(parseSmiles(smiles), 2);
    const relabelled = analyzeGroups(copy.mol).items.find((g) => g.kind === kind);
    assert.deepEqual([relabelled.attachment, relabelled.prefix], [attachment, prefix], `${smiles} relabelled`);
  }
  assert.equal(analyzeGroups(parseSmiles('CC(=O)OCC(=O)O'), lexiconEn).items[1].prefix, 'acyloxy');
  // Without the molecule the end cannot be decided: no prefix, both forms offered.
  const loose = classifyGroups(detectGroups(parseSmiles('CC(=O)OCC(=O)O'))).items[1];
  assert.equal(loose.attachment, null);
  assert.equal(loose.prefix, null);
  assert.deepEqual(loose.prefixes, { carbonyl: 'alcoxicarbonil', heteroatom: 'aciloxi' });
  // Principal groups on both sides: undecided as well.
  const both = analyzeGroups(parseSmiles('OC(=O)CC(=O)OCC(=O)O')).items.find((g) => g.kind === 'ester');
  assert.deepEqual([both.attachment, both.prefix], [null, null]);
  // The explanation says which end and why, or gives both forms when undecided.
  const affixes = (smiles) => explain(nameMolecule(parseSmiles(smiles)))[2].text.map(plainText).join(' ');
  assert.match(affixes('CC(=O)OCC(=O)O'), /El éster: prefijo «aciloxi-».*por su oxígeno/);
  assert.doesNotMatch(affixes('CC(=O)OCC(=O)O'), /alcoxicarbonil/);
  assert.match(affixes('CCOC(=O)CC(=O)O'), /El éster: prefijo «alcoxicarbonil-».*por su carbono/);
  assert.match(affixes('CC(=O)NCC(=O)O'), /La amida: prefijo «acilamino-».*por su nitrógeno/);
  assert.match(affixes('NC(=O)CC(=O)O'), /La amida: prefijo «carbamoil-», porque se une al grupo principal por su carbono/);
  assert.match(affixes('OC(=O)CC(=O)OCC(=O)O'), /«alcoxicarbonil-» si se une al resto por su carbono, o «aciloxi-» si se une por el oxígeno/);
});

test('lexicons: suffix and prefix forms of every group kind', () => {
  const es = SENIORITY.map((kind) => lexiconEs.groupSuffix(kind));
  assert.deepEqual(es, ['oico', 'oato', 'amida', 'nitrilo', 'al', 'ona', 'ol', 'amina']);
  const en = SENIORITY.map((kind) => lexiconEn.groupSuffix(kind));
  assert.deepEqual(en, ['oic acid', 'oate', 'amide', 'nitrile', 'al', 'one', 'ol', 'amine']);
  assert.deepEqual(SENIORITY.map((kind) => lexiconEs.groupPrefix(kind)),
    ['carboxi', 'alcoxicarbonil', 'carbamoil', 'ciano', 'oxo', 'oxo', 'hidroxi', 'amino']);
  assert.deepEqual(SENIORITY.map((kind) => lexiconEn.groupPrefix(kind)),
    ['carboxy', 'alkoxycarbonyl', 'carbamoyl', 'cyano', 'oxo', 'oxo', 'hydroxy', 'amino']);
  assert.equal(lexiconEs.groupSuffix('ether'), null);
  assert.equal(lexiconEs.groupSuffix('halide'), null);
  assert.equal(lexiconEs.groupPrefix('ether'), 'alcoxi');
  assert.equal(lexiconEn.groupPrefix('ether'), 'alkoxy');
  assert.deepEqual(['F', 'Cl', 'Br', 'I'].map((e) => lexiconEs.groupPrefix('halide', e)), ['fluoro', 'cloro', 'bromo', 'yodo']);
  assert.deepEqual(['F', 'Cl', 'Br', 'I'].map((e) => lexiconEn.groupPrefix('halide', e)), ['fluoro', 'chloro', 'bromo', 'iodo']);
  assert.equal(lexiconEs.formylPrefix, 'formil');
  assert.equal(lexiconEn.formylPrefix, 'formyl');
  assert.equal(lexiconEs.groupPrefix('unsupported'), null);
  assert.deepEqual(['ester', 'amide'].map((k) => lexiconEs.groupPrefix(k, null, 'heteroatom')), ['aciloxi', 'acilamino']);
  assert.deepEqual(['ester', 'amide'].map((k) => lexiconEn.groupPrefix(k, null, 'heteroatom')), ['acyloxy', 'acylamino']);
  assert.equal(lexiconEs.groupPrefix('alcohol', null, 'heteroatom'), 'hidroxi', 'only esters and amides are oriented');
  assert.equal(lexiconEs.groupFamilyName('phenol'), 'fenol');
  assert.deepEqual(Object.keys(lexiconEs).sort(), Object.keys(lexiconEn).sort(), 'both lexicons have the same members');
});

test('a heteroatom molecule is still refused with HETEROATOM, carrying its groups', () => {
  for (const smiles of ['NCCO', 'NCC(=O)O', 'ClCCOCCOOC', 'OCC1=CC=CC=C1', 'NC1CCCCC1', 'COOC', 'O']) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.code, 'HETEROATOM', smiles);
    assert.equal(result.name, undefined);
    assert.deepEqual(result.groups, analyzeGroups(parseSmiles(smiles)), smiles);
    assert.deepEqual(JSON.parse(JSON.stringify(result.groups)), result.groups, 'JSON-serialisable');
  }
  // Hydrocarbons and other refusals carry no groups.
  assert.equal('groups' in nameMolecule(parseSmiles('CCC')), false);
  assert.equal('groups' in nameMolecule(parseSmiles('C1CC2CCC1C2')), false);
  assert.equal('groups' in nameMolecule(parseSmiles('C1CCOC1')), false, 'a heterocycle is RING_SYSTEM');
});

test('explanation of a refusal: groups, principal, suffix or prefix, then the message', () => {
  // An amine keeps the refusal (acids alone are named since I-33).
  const steps = explain(nameMolecule(parseSmiles('NCC(O)C(=O)O')));
  assert.deepEqual(steps.map((s) => s.id), ['groups', 'principal', 'affixes', 'notYet']);
  assert.deepEqual(steps.map((s) => s.title), ['Reconoce los grupos', 'Elige el principal', 'Sufijo o prefijo', 'Aún no sé nombrarla']);
  const text = (i) => steps[i].text.map(plainText).join(' ');
  assert.match(text(0), /1 ácido carboxílico/);
  assert.match(text(0), /1 alcohol/);
  assert.match(text(0), /el –OH de un ácido no cuenta como alcohol/);
  assert.match(text(1), /el grupo principal es el ácido carboxílico: en la lista va antes que el alcohol y la amina/);
  assert.match(text(2), /El ácido carboxílico: sufijo «-oico»/);
  assert.match(text(2), /El alcohol: prefijo «hidroxi-»/);
  assert.match(text(3), /Aún no sé nombrar este tipo de compuestos/);
  // Highlights: principal (parent) apart from the prefix groups (substituent).
  assert.deepEqual(steps[1].highlight.map((h) => [h.style, h.atoms.length]), [['parent', 3], ['substituent', 2]]);
  // Only ethers and halogens (named since I-34) plus an unsupported peroxide: no principal group, no suffix.
  const prefixOnly = explain(nameMolecule(parseSmiles('ClCCOCCOOC')));
  assert.match(prefixOnly[1].text.join(' '), /no hay grupo principal/);
  assert.match(prefixOnly[2].text.join(' '), /Sin grupo principal no hay \[\[sufijo\]\]/);
  // Other refusals and hydrocarbons get no group steps.
  assert.deepEqual(explain(nameMolecule(parseSmiles('C1CCOC1'))), []);
  assert.ok(explain(nameMolecule(parseSmiles('CCC'))).every((s) => !['groups', 'principal', 'affixes', 'notYet'].includes(s.id)));
});

/** Heteroatom molecules whose group steps are snapshot-tested. */
const GROUP_SNAPSHOT_SMILES = [
  'NCCO', // alcohol > amine
  'OCC1=CC=CC=C1', // alcohol on the side chain of a benzene: its own message
  'NCC(=O)O', // acid (named since I-33) with an amine: the acid is not alcohol + ketone
  'COC(=O)CCC(=O)OC', // two esters (each not ether + ketone): refused as manyEsters since I-35
  'CC(=O)NC', // amide: not amine + ketone
  'NCC(O)CC(=O)CC=O', // aldehyde > ketone > alcohol > amine (the amine keeps the refusal since I-32)
  'NCC#N', // nitrile > amine
  'ClCCOCCOOC', // prefix-only groups (ether and halide, named since I-34) with an unsupported peroxide
  'BrCC(Br)CN', // two bromine atoms and an amine
  'CCOOC', // unsupported peroxide
  'CC(=O)OCC(=O)O', // ester bonded through its O: aciloxi-
  'CCOC(=O)CC(=O)O', // ester bonded through its carbonyl carbon: alcoxicarbonil-
  'CC(=O)NCC(=O)O', // amide bonded through its N: acilamino-
  'NC(=O)CC(=O)O', // amide bonded through its carbonyl carbon: carbamoil-
  'O=CC1CCCCC1', // aldehyde on a ring: -carbaldehído, refused until I-40 (I-32)
  'CC(=O)C(C(C)=O)C(C)=O', // ketone bonded to the parent as an acyl branch: refused by the engine (I-32)
];

test('explain() snapshots for heteroatom refusals', async () => {
  const actual = {};
  for (const smiles of GROUP_SNAPSHOT_SMILES) {
    const mol = parseSmiles(smiles);
    const result = nameMolecule(mol);
    const steps = explain(result);
    for (const step of steps) {
      assert.equal(step.title, STEP_TITLES[step.id]);
      for (const spec of step.highlight) {
        spec.atoms.forEach((id) => assert.ok(mol.atoms.has(id), `${smiles}: atom ${id}`));
        spec.bonds.forEach((id) => assert.ok(mol.bonds.has(id), `${smiles}: bond ${id}`));
      }
      for (const paragraph of step.text) {
        for (const segment of parseMarkup(paragraph)) {
          assert.ok(!segment.term || GLOSSARY[segment.term], `${smiles}: unknown glossary term ${segment.term}`);
        }
        assert.doesNotMatch(plainText(paragraph), /\[\[|\]\]|undefined|NaN|null/, `${smiles}: ${paragraph}`);
      }
    } // End of the loop over the steps
    actual[smiles] = { code: result.error.code, principal: result.groups.principal, steps };
  } // End of the loop over the snapshot molecules
  if (process.env.UPDATE_SNAPSHOTS) {
    await writeFile(SNAPSHOTS, `${JSON.stringify(actual, null, 1)}\n`);
  }
  const expected = JSON.parse(await readFile(SNAPSHOTS, 'utf8'));
  assert.deepEqual(Object.keys(expected), GROUP_SNAPSHOT_SMILES);
  for (const smiles of GROUP_SNAPSHOT_SMILES) {
    assert.deepEqual(JSON.parse(JSON.stringify(actual[smiles])), expected[smiles], `snapshot of ${smiles}`);
  }
});
