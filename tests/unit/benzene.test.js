/**
 * @file Unit tests for phase I-28, benzene and its monosubstituted
 * hydrocarbon derivatives (design.md §13.4, §13.5; src/naming/aromatic.js):
 * both Kekulé drawings give the same name, results are independent of atom
 * ids, insertion order and coordinates, benzene is recognised only for the
 * exact six-carbon alternation, polysubstituted and ring-substituted
 * benzenes are refused, Spanish and English rendering (`benceno`,
 * `benzene`, the retained `fenil` / `phenyl` prefix), the traditional names
 * (`tolueno`, `estireno`; no `cumeno`) and the explanation step.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import { validateForNaming, isNotNameableYet, isBenzeneRing } from '../../src/model/validate.js';
import { perceiveRings } from '../../src/model/rings.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  hasBenzeneRing, phenylSubstituent, traditionalNameId, nameBenzeneWithStyle,
} from '../../src/naming/aromatic.js';
import { renderName, renderPrefixes, substituentPrefix, citationKey } from '../../src/naming/render.js';
import { lexiconEs, ringOmitsLocants } from '../../src/naming/lexicon.es.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { explain, plainText } from '../../src/explain/explain.js';
import { canArrange, redrawHint } from '../../src/ui/results.js';
import { projectRightAngles } from '../../src/ui/canvasbar.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom } from '../../scripts/oracle/generate.mjs';

/**
 * Names a SMILES string and checks that it succeeded.
 *
 * @param {string} smiles - The molecule.
 * @returns {object} The naming result.
 */
function named(smiles) {
  const result = nameMolecule(parseSmiles(smiles));
  assert.equal(result.ok, true, `${smiles}: ${JSON.stringify(result.error)}`);
  return result;
}

/**
 * What must not change between drawings of one molecule: the name, the
 * alternatives, the English name and the explanation texts.
 *
 * @param {object} result - A naming result.
 * @returns {object} The comparable summary.
 */
function summary(result) {
  return {
    name: result.name,
    alternatives: result.alternatives.map((a) => [a.style, a.name, a.label]),
    english: englishName(result.structure),
    steps: explain(result).map((s) => [s.id, s.text.map(plainText)]),
  };
}

/** The two Kekulé drawings of the same molecules, with their names. */
const KEKULE_PAIRS = [
  ['C1=CC=CC=C1', 'C1C=CC=CC=1', 'benceno'],
  ['CC1=CC=CC=C1', 'CC1C=CC=CC=1', 'metilbenceno'],
  ['CCC1=CC=CC=C1', 'CCC1C=CC=CC=1', 'etilbenceno'],
  ['C=CC1=CC=CC=C1', 'C=CC1C=CC=CC=1', 'etenilbenceno'],
  ['C#CC1=CC=CC=C1', 'C#CC1C=CC=CC=1', 'etinilbenceno'],
  ['CCCC1=CC=CC=C1', 'CCCC1C=CC=CC=1', 'propilbenceno'],
  ['CC(C)C1=CC=CC=C1', 'CC(C)C1C=CC=CC=1', 'isopropilbenceno'],
  ['CC(C)(C)C1=CC=CC=C1', 'CC(C)(C)C1C=CC=CC=1', 'tert-butilbenceno'],
  ['CC=C(C)C1=CC=CC=C1', 'CC=C(C)C1C=CC=CC=1', '(but-2-en-2-il)benceno'],
];

test('both Kekulé drawings give the same name, alternatives and explanation', () => {
  for (const [a, b, name] of KEKULE_PAIRS) {
    const first = named(a);
    const second = named(b);
    assert.equal(first.name, name, a);
    assert.deepEqual(summary(second), summary(first), `${a} vs ${b}`);
    // The drawings really differ: the same ring bond is double in one and single in the other.
    const orders = (mol) => perceiveRings(mol).rings[0].bonds.map((id) => mol.bonds.get(id).order).sort().join('');
    assert.equal(orders(parseSmiles(a)), orders(parseSmiles(b)), 'three double and three single ring bonds in each');
  }
});

test('names are independent of atom ids, insertion order and coordinates', () => {
  const random = seededRandom(28);
  for (const [a, b] of KEKULE_PAIRS) {
    for (const smiles of [a, b]) {
      const mol = parseSmiles(smiles);
      const reference = summary(named(smiles));
      for (let k = 0; k < 5; k += 1) {
        const copy = scrambleMolecule(mol, random);
        for (const atom of copy.atoms.values()) {
          atom.x = random() * 500;
          atom.y = random() * 500;
        }
        assert.deepEqual(summary(nameMolecule(copy)), reference, `${smiles} scrambled`);
      }
    }
  }
});

test('the benzene structure: retained parent, substituted carbon 1, ring double bonds 1, 3, 5, RING trace only', () => {
  const result = named('CCC1C=CC=CC=1');
  const { parent, prefixes } = result.structure;
  assert.equal(result.structure.parentKind, 'ring');
  assert.equal(parent.retained, 'benzene');
  assert.equal(parent.length, 6);
  assert.deepEqual(parent.double.map((site) => site.locant), [1, 3, 5]);
  assert.equal(prefixes.length, 1);
  assert.equal(prefixes[0].locants[0].locant, 1);
  assert.equal(prefixes[0].locants[0].atom, parent.atoms[0]);
  assert.deepEqual(result.trace.map((step) => step.rule), ['RING']);
  assert.deepEqual(result.trace[0].values, [6]);
  assert.deepEqual(result.parts.map((p) => [p.text, p.kind]), [['etil', 'prefix'], ['benceno', 'stem']]);
  assert.deepEqual(result.parts[1].atoms, parent.atoms);
  assert.deepEqual(result.parts[1].bonds, parent.bonds);
  assert.deepEqual(ringOmitsLocants(parent, prefixes), { parent: true, prefixes: true });
  assert.deepEqual(named('C1=CC=CC=C1').parts.map((p) => p.text), ['benceno']);
});

test('aromaticity is never inferred from other alternations', () => {
  const cases = [
    ['C1=CC=C1', 'ciclobuta-1,3-dieno'],
    ['C1=CC=CC=CC=C1', 'cicloocta-1,3,5,7-tetraeno'],
    ['C1=CC=CCC1', 'ciclohexa-1,3-dieno'],
    ['C1=CCC=CC1', 'ciclohexa-1,4-dieno'],
    ['C=C1C=CC=CC1', '5-metilidenciclohexa-1,3-dieno'],
    ['C=C1C=CC(=C)C=C1', '3,6-dimetilidenciclohexa-1,4-dieno'],
    ['C1=CC=CC=CC=CC=C1', 'ciclodeca-1,3,5,7,9-pentaeno'],
  ];
  for (const [smiles, name] of cases) {
    const mol = parseSmiles(smiles);
    assert.equal(hasBenzeneRing(mol), false, smiles);
    assert.equal(isBenzeneRing(mol, perceiveRings(mol).rings[0]), false, smiles);
    const result = named(smiles);
    assert.equal(result.name, name);
    assert.equal(result.structure.parent.retained, undefined, smiles);
  }
  assert.throws(() => nameBenzeneWithStyle(parseSmiles('C1=CC=CCC1')), /no benzene ring/);
});

test('polysubstituted benzenes are refused with CYCLE; a ring in the substituent stays RING_SYSTEM', () => {
  const cases = [
    ['CC1=CC=CC=C1C', 2], // orto
    ['CC1=CC(C)=CC=C1', 2], // meta
    ['CC1=CC=C(C)C=C1', 2], // para
    ['CC1C(C)=CC=CC=1', 2], // orto, other Kekulé drawing
    ['CC1=CC(C)=CC(C)=C1', 3],
    ['CC1=C(C)C(C)=C(C)C(C)=C1C', 6],
  ];
  for (const [smiles, count] of cases) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'CYCLE', smiles);
    assert.equal(error.ringReason, 'polysubstitutedBenzene', smiles);
    assert.equal(error.substituted.length, count, smiles);
    assert.ok(error.message.startsWith(`Este benceno tiene ${count} sustituyentes.`), error.message);
    assert.match(error.message, /quedan fuera de lo que sé nombrar/);
    assert.ok(isNotNameableYet(error));
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(result.ok, false);
    assert.equal(canArrange(result), false, smiles);
  }
  for (const smiles of ['C1CC1C1=CC=CC=C1', 'C1=CC=C(C=C1)C1=CC=CC=C1', 'C1=CC=C(C=C1)CC1CCCC1']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'RING_SYSTEM', smiles);
    assert.equal(error.ringKind, 'several', smiles);
  }
  assert.equal(validateForNaming(parseSmiles('C1=CC2=CC=CC=C2C=C1')).code, 'RING_SYSTEM', 'naphthalene: fused');
  assert.equal(validateForNaming(parseSmiles('C1=CC=C(C=C1)O')).code, 'HETEROATOM', 'phenol waits for I-40');
});

test('English rendering for the oracle: benzene, methylbenzene, (propan-2-yl)benzene', () => {
  const english = (smiles, style) => englishName(nameMolecule(parseSmiles(smiles), { prefixStyle: style }).structure);
  assert.equal(english('C1=CC=CC=C1'), 'benzene');
  assert.equal(english('CC1=CC=CC=C1'), 'methylbenzene');
  assert.equal(english('C=CC1=CC=CC=C1'), 'ethenylbenzene');
  assert.equal(english('C#CC1=CC=CC=C1'), 'ethynylbenzene');
  assert.equal(english('CC(C)C1=CC=CC=C1'), 'isopropylbenzene');
  assert.equal(english('CC(C)C1=CC=CC=C1', 'pin'), '(propan-2-yl)benzene');
  assert.equal(english('CC(C)C1=CC=CC=C1', 'substituted'), '(1-methylethyl)benzene');
  assert.equal(lexiconEn.traditionalName('toluene'), 'toluene');
  assert.equal(lexiconEn.traditionalName('styrene'), 'styrene');
});

test('alternatives: prefix styles, then the traditional names retained by IUPAC 2013 (no cumeno)', () => {
  const alternatives = (smiles, style) => nameMolecule(parseSmiles(smiles), { prefixStyle: style }).alternatives
    .map((a) => [a.style, a.name]);
  assert.deepEqual(alternatives('CC1=CC=CC=C1'), [['traditional', 'tolueno']]);
  assert.deepEqual(alternatives('C=CC1=CC=CC=C1'), [['traditional', 'estireno']]);
  assert.deepEqual(alternatives('CC(C)C1=CC=CC=C1'), [
    ['pin', '(propan-2-il)benceno'],
    ['substituted', '(1-metiletil)benceno'],
  ]);
  assert.deepEqual(alternatives('CC(C)C1=CC=CC=C1', 'pin'), [
    ['isopropil', 'isopropilbenceno'],
    ['substituted', '(1-metiletil)benceno'],
  ]);
  assert.deepEqual(alternatives('CC1=CC=CC=C1', 'pin'), [['traditional', 'tolueno']]);
  for (const smiles of ['C1=CC=CC=C1', 'CCC1=CC=CC=C1', 'C#CC1=CC=CC=C1', 'CC=CC1=CC=CC=C1', 'C=C(C)C1=CC=CC=C1']) {
    assert.deepEqual(alternatives(smiles), [], smiles);
  }
  const toluene = named('CC1=CC=CC=C1');
  const [traditional] = toluene.alternatives;
  assert.equal(traditional.label, 'nombre tradicional, que la IUPAC (2013) conserva como preferido');
  assert.deepEqual(traditional.parts.map((p) => p.text), ['tolueno']);
  assert.equal(traditional.parts[0].atoms.length, 7);
  assert.equal(traditionalNameId(toluene.structure), 'toluene');
  assert.equal(traditionalNameId(named('CC1CCCCC1').structure), null, 'metilciclohexano is not toluene');
});

test('fenilo: the retained C6H5– prefix renders in both lexicons', () => {
  const phenyl = phenylSubstituent([1, 2, 3, 4, 5, 6], [11, 12, 13, 14, 15, 16], [2, 1, 2, 1, 2, 1]);
  assert.equal(phenyl.retained, 'phenyl');
  assert.equal(phenyl.chain.retained, 'benzene');
  assert.equal(substituentPrefix(phenyl, lexiconEs), 'fenil');
  assert.equal(lexiconEs.groupName(substituentPrefix(phenyl, lexiconEs)), 'fenilo');
  assert.equal(substituentPrefix(phenyl, lexiconEn), 'phenyl');
  assert.deepEqual(citationKey(phenyl, lexiconEs), { alpha: 'fenil', numeric: [], italic: '' });
  const site = {
    locant: 2, atom: 20, attachAtom: 1, bond: 30, order: 1, atoms: [1, 2, 3, 4, 5, 6], bonds: [11, 12, 13, 14, 15, 16], multipleBonds: [11, 13, 15],
  };
  const text = (groups, lexicon) => renderPrefixes(groups, lexicon).map((p) => p.text).join('');
  assert.equal(text([{ key: 'ph', substituent: phenyl, locants: [site] }], lexiconEs), '2-fenil');
  assert.equal(text([{ key: 'ph', substituent: phenyl, locants: [site, { ...site, locant: 3 }] }], lexiconEs), '2,3-difenil');
  assert.equal(text([{ key: 'ph', substituent: phenyl, locants: [site] }], lexiconEn), '2-phenyl');
  // On a chain parent (not used for hydrocarbons, where the ring is always the parent). A
  // monosubstituted two-carbon parent omits the locant (IUPAC 2013 P-14.3.4.2(b), as in cloroetano).
  const structure = {
    parentKind: 'chain',
    parent: { length: 2, atoms: [20, 21], bonds: [31], double: [], triple: [] },
    prefixes: [{ key: 'ph', substituent: phenyl, locants: [{ ...site, locant: 1 }] }],
  };
  assert.equal(renderName(structure, lexiconEs).name, 'feniletano');
  assert.equal(renderName(structure, lexiconEn).name, 'phenylethane');
  const propane = { ...structure, parent: { length: 3, atoms: [20, 21, 22], bonds: [31, 32], double: [], triple: [] } };
  assert.equal(renderName(propane, lexiconEs).name, '1-fenilpropano');
});

test('the explanation recognises the benzene ring and the two Kekulé drawings', () => {
  const steps = explain(named('CC1=CC=CC=C1'));
  assert.deepEqual(steps.map((s) => s.id), ['count', 'benzene', 'substituents', 'assemble']);
  const benzene = steps[1];
  assert.equal(benzene.title, 'Reconoce el benceno');
  const text = benzene.text.map(plainText).join(' ');
  assert.match(text, /tres enlaces dobles alternados/);
  assert.match(text, /Kekulé/);
  assert.match(text, /misma molécula/);
  assert.match(text, /no hace falta numerar/);
  assert.match(text, /«fenilo».*no es la preferida/);
  assert.equal(benzene.locants, null);
  const [ring, doubles] = benzene.highlight;
  assert.equal(ring.atoms.length, 6);
  assert.equal(ring.bonds.length + doubles.bonds.length, 6);
  assert.equal(doubles.bonds.length, 3);
  const assemble = steps[steps.length - 1];
  assert.equal(assemble.locants, null);
  assert.deepEqual(assemble.legend.map((l) => l.text), ['metil', 'benceno']);
  assert.ok(assemble.text.some((t) => t.includes('«tolueno»')));
  assert.ok(steps[2].text.some((t) => t.includes('sin número')));
  assert.deepEqual(explain(named('C1=CC=CC=C1')).map((s) => s.id), ['count', 'benzene', 'assemble']);
  assert.match(explain(named('CCCCCCCCCCC1=CC=CC=C1'))[1].text.join(' '), /la rama tiene 10 carbonos y el anillo solo 6/);
});

test('Ordenar dibujo offers the ring hint for benzene; the 90° view still falls back', () => {
  const mol = parseSmiles('CC1=CC=CC=C1');
  const result = named('CC1=CC=CC=C1');
  assert.equal(canArrange(result), true);
  assert.equal(redrawHint(result), '¿Quieres ver el anillo ordenado?');
  assert.deepEqual(projectRightAngles(mol), { ok: false, reason: 'CYCLE' });
});
