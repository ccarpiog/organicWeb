/**
 * @file Unit tests for phase I-44, benzenes with several identical
 * principal groups on the ring (design.md §14; src/model/validate.js
 * ringPrincipalGroups(), src/naming/render.js renderRingParent(),
 * src/naming/aromatic.js retainedDigroupIds(), src/explain/explain.js):
 * the systematic name with locants and multiplier (`3-etilbenceno-1,2-diol`,
 * `benceno-1,4-diamina`, `ácido benceno-1,3-dicarboxílico`,
 * `benceno-1,4-dicarbaldehído`, `benceno-1,3,5-tricarbonitrilo`,
 * `benceno-1,4-dicarboxamida`), the retained names under Otras formas
 * (pirocatecol / catecol / resorcinol / hidroquinona unsubstituted only, the
 * ftálico family also substituted) present and absent, no anilina for a
 * diamine and no duplicated systematic form, Kekulé and atom-id invariance,
 * the plural explanations, the refusals that stay (groups on the N of a
 * diamine or diamide, esters, ketones, groups on a side chain), Ordenar
 * dibujo and the 90° view.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import {
  validateForNaming, SUBSTITUTED_BENZENE_POLYAMINE_MESSAGE, SUBSTITUTED_BENZENE_POLYAMIDE_MESSAGE,
  SUBSTITUTED_POLYAMIDE_MESSAGE, SUBSTITUTED_BENZENE_ESTER_MESSAGE,
} from '../../src/model/validate.js';
import { perceiveRings } from '../../src/model/rings.js';
import { nameMolecule } from '../../src/naming/index.js';
import { traditionalNameId, retainedDigroupIds } from '../../src/naming/aromatic.js';
import { explain, plainText } from '../../src/explain/explain.js';
import { canArrange } from '../../src/ui/results.js';
import { projectRightAngles } from '../../src/ui/canvasbar.js';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom } from '../../scripts/oracle/generate.mjs';

/**
 * Names a SMILES string or a molecule and checks that it succeeded.
 *
 * @param {string|object} input - The molecule, as SMILES or as a molecule object.
 * @param {string} [prefixStyle] - Prefix style.
 * @returns {object} The naming result.
 */
function named(input, prefixStyle) {
  const mol = typeof input === 'string' ? parseSmiles(input) : input;
  const result = nameMolecule(mol, prefixStyle ? { prefixStyle } : {});
  assert.equal(result.ok, true, `${input}: ${JSON.stringify(result.error)}`);
  return result;
}

/**
 * The other Kekulé drawing of a molecule with one benzene ring: every ring
 * bond order swapped (1 ↔ 2).
 *
 * @param {string} smiles - The molecule.
 * @returns {object} The molecule with the double bonds on the other three sides.
 */
function kekuleSwap(smiles) {
  const mol = parseSmiles(smiles);
  for (const id of perceiveRings(mol).rings[0].bonds) {
    const bond = mol.bonds.get(id);
    bond.order = 3 - bond.order;
  }
  return mol;
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

/**
 * The whole explanation of a SMILES string as plain text, step by step.
 *
 * @param {string} smiles - The molecule.
 * @returns {Map<string, string>} Step id → its text.
 */
function stepTexts(smiles) {
  return new Map(explain(named(smiles)).map((s) => [s.id, s.text.map(plainText).join(' ')]));
}

/** Label of the retained names IUPAC 2013 accepts for general nomenclature (design.md §14.5). */
const ACCEPTED = 'nombre tradicional, que la IUPAC (2013) acepta';

/** Expected names and every alternative (style, name), in order: the list is complete, so absent ones are asserted too. */
const CASES = [
  ['CCC1=C(O)C(O)=CC=C1', '3-etilbenceno-1,2-diol', []],
  ['OC1=CC=CC=C1O', 'benceno-1,2-diol', [['traditional', 'pirocatecol'], ['traditional', 'catecol']]],
  ['OC1=CC=CC(O)=C1', 'benceno-1,3-diol', [['traditional', 'resorcinol']]],
  ['OC1=CC=C(O)C=C1', 'benceno-1,4-diol', [['traditional', 'hidroquinona']]],
  ['CC1=CC=C(O)C(O)=C1', '4-metilbenceno-1,2-diol', []],
  ['NC1=CC=C(N)C=C1', 'benceno-1,4-diamina', []],
  ['NC1=CC=CC(N)=C1C', '2-metilbenceno-1,3-diamina', []],
  ['ClC1=CC(N)=CC=C1N', '2-clorobenceno-1,4-diamina', []],
  ['O=C(O)C1=CC(C(=O)O)=CC=C1', 'ácido benceno-1,3-dicarboxílico', [['traditional', 'ácido isoftálico']]],
  ['OC(=O)C1=CC=CC=C1C(O)=O', 'ácido benceno-1,2-dicarboxílico', [['traditional', 'ácido ftálico']]],
  ['OC(=O)C1=CC=C(C(O)=O)C=C1', 'ácido benceno-1,4-dicarboxílico', [['traditional', 'ácido tereftálico']]],
  ['CC1=CC=C(C(=O)O)C(C(=O)O)=C1', 'ácido 4-metilbenceno-1,2-dicarboxílico', [['traditional', 'ácido 4-metilftálico']]],
  ['OC(=O)C1=CC(Cl)=CC(C(O)=O)=C1', 'ácido 5-clorobenceno-1,3-dicarboxílico', [['traditional', 'ácido 5-cloroisoftálico']]],
  ['CC1=CC(C(=O)O)=CC=C1C(=O)O', 'ácido 2-metilbenceno-1,4-dicarboxílico', [['traditional', 'ácido 2-metiltereftálico']]],
  ['OC(=O)C1=CC(C(O)=O)=CC(C(O)=O)=C1', 'ácido benceno-1,3,5-tricarboxílico', []],
  ['O=CC1=CC=C(C=O)C=C1', 'benceno-1,4-dicarbaldehído', [['traditional', 'tereftalaldehído']]],
  ['O=CC1=CC=CC=C1C=O', 'benceno-1,2-dicarbaldehído', [['traditional', 'ftalaldehído']]],
  ['O=CC1=CC(C=O)=CC=C1', 'benceno-1,3-dicarbaldehído', [['traditional', 'isoftalaldehído']]],
  ['O=CC1=CC=C(C=O)C=C1Cl', '2-clorobenceno-1,4-dicarbaldehído', [['traditional', '2-clorotereftalaldehído']]],
  ['N#CC1=CC(C#N)=CC(C#N)=C1', 'benceno-1,3,5-tricarbonitrilo', []],
  ['N#CC1=CC=CC=C1C#N', 'benceno-1,2-dicarbonitrilo', [['traditional', 'ftalonitrilo']]],
  ['N#CC1=CC=C(C#N)C=C1', 'benceno-1,4-dicarbonitrilo', []],
  ['N#CC1=CC(C#N)=CC(C)=C1', '5-metilbenceno-1,3-dicarbonitrilo', []],
  ['NC(=O)C1=CC=C(C(N)=O)C=C1', 'benceno-1,4-dicarboxamida', []],
  ['NC(=O)C1=CC=CC=C1C(N)=O', 'benceno-1,2-dicarboxamida', [['traditional', 'ftalamida']]],
  ['NC1=CC(O)=CC(O)=C1', '5-aminobenceno-1,3-diol', []],
  ['OC(=O)C1=CC(O)=CC(C(O)=O)=C1', 'ácido 5-hidroxibenceno-1,3-dicarboxílico', [['traditional', 'ácido 5-hidroxiisoftálico']]],
  ['OC1=C(O)C(O)=C(O)C(O)=C1O', 'bencenohexol', []],
  ['OC(=O)C1=C(C(O)=O)C(C(O)=O)=C(C(O)=O)C(C(O)=O)=C1C(O)=O', 'ácido bencenohexacarboxílico', []],
  ['NC1=C(N)C(N)=C(N)C(N)=C1N', 'bencenohexamina', []],
  ['CC(C)C1=CC(O)=CC=C1O', '2-isopropilbenceno-1,4-diol',
    [['pin', '2-(propan-2-il)benceno-1,4-diol'], ['substituted', '2-(1-metiletil)benceno-1,4-diol']]],
];

test('several identical principal groups on the ring are named, with exactly the expected alternatives', () => {
  for (const [smiles, name, alternatives] of CASES) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.deepEqual(result.alternatives.map((a) => [a.style, a.name]), alternatives, smiles);
    for (const alt of result.alternatives) {
      // Never anilina, fenol, benzoico… for several groups, never the systematic form twice, never an o/m/p form.
      assert.doesNotMatch(alt.name, /anilina|fenol|benzoico|benzaldehído|benzonitrilo|benzamida|toluidina/, smiles);
      assert.notEqual(alt.name, result.name, smiles);
      assert.notEqual(alt.style, 'benzeneSystematic', smiles);
      assert.notEqual(alt.style, 'positional', smiles);
      if (alt.style === 'traditional' && alt.name !== 'catecol') {
        assert.equal(alt.label, ACCEPTED, smiles);
      }
    }
  }
}); // End of test 'several identical principal groups on the ring are named…'

test('the six names of the spec and the fixture-table row', () => {
  assert.equal(named('CCC1=C(O)C(O)=CC=C1').name, '3-etilbenceno-1,2-diol');
  assert.equal(named('NC1=CC=C(N)C=C1').name, 'benceno-1,4-diamina');
  assert.equal(named('O=C(O)C1=CC(C(=O)O)=CC=C1').name, 'ácido benceno-1,3-dicarboxílico');
  assert.equal(named('O=CC1=CC=C(C=O)C=C1').name, 'benceno-1,4-dicarbaldehído');
  assert.equal(named('N#CC1=CC(C#N)=CC(C#N)=C1').name, 'benceno-1,3,5-tricarbonitrilo');
  assert.equal(named('NC(=O)C1=CC=C(C(N)=O)C=C1').name, 'benceno-1,4-dicarboxamida');
  const isophthalic = named('O=C(O)C1=CC(C(=O)O)=CC=C1');
  assert.ok(isophthalic.alternatives.some((a) => a.name === 'ácido isoftálico'));
});

test('the parts: benceno keeps its o, locants and multiplier refer to the groups, the class word leads an acid', () => {
  const diol = named('CCC1=C(O)C(O)=CC=C1');
  assert.deepEqual(diol.parts.map((p) => [p.text, p.kind]), [
    ['3', 'locant'], ['-', 'punct'], ['etil', 'prefix'], ['benceno', 'stem'], ['-', 'punct'], ['1', 'locant'],
    [',', 'punct'], ['2', 'locant'], ['-', 'punct'], ['di', 'multiplier'], ['ol', 'ending'],
  ]);
  const ring = new Set(diol.structure.parent.atoms);
  assert.ok(diol.parts.find((p) => p.text === 'benceno').atoms.every((id) => ring.has(id)));
  const oxygens = diol.parts.find((p) => p.text === 'ol').atoms.filter((id) => !ring.has(id));
  assert.equal(oxygens.length, 2, 'the suffix refers to both OH');
  const acid = named('O=C(O)C1=CC(C(=O)O)=CC=C1');
  assert.deepEqual(acid.parts.map((p) => p.text), ['ácido', ' ', 'benceno', '-', '1', ',', '3', '-', 'di', 'carboxílico']);
  // Six groups: complete substitution, no locants; `hexa` loses its a before `ol` (P-16.7.1(c)).
  assert.deepEqual(named('OC1=C(O)C(O)=C(O)C(O)=C1O').parts.map((p) => p.text), ['benceno', 'hex', 'ol']);
  // One group beside prefixes keeps the I-43 forms: `bencen-1-amina` elides the o, `fenol` keeps its implicit 1.
  assert.equal(named('NC1=CC=CC=C1C').name, '2-metilbencen-1-amina');
  assert.equal(named('OC1=CC=C(C)C=C1').name, '4-metilfenol');
});

test('the principal groups take the lowest locants first (P-14.4 (c)), then the prefixes, then alphabetical order', () => {
  const rules = (smiles) => named(smiles).trace.map((step) => step.rule);
  assert.equal(rules('CCC1=C(O)C(O)=CC=C1')[1], 'N0');
  assert.ok(!rules('CCC1=C(O)C(O)=CC=C1').some((rule) => rule === 'N1' || rule === 'N2'), 'never the Kekulé bonds');
  // {1,2} for the OH beats {1,6}; then the ethyl 3 beats 6.
  assert.equal(named('CCC1=C(O)C(O)=CC=C1').name, '3-etilbenceno-1,2-diol');
  // OH {1,3} either way; then bromo 4 / cloro 6 against cloro 4 / bromo 6: alphabetical order gives bromo the 4.
  assert.equal(named('OC1=CC(O)=C(Br)C=C1Cl').name, '4-bromo-6-clorobenceno-1,3-diol');
  // OH {1,4} rather than {1,5}: the suffix decides before the prefixes.
  assert.equal(named('CC1=C(O)C=CC(O)=C1').name, '2-metilbenceno-1,4-diol');
});

test('both Kekulé drawings and atom-id scrambles give the same name, alternatives and explanation', () => {
  const random = seededRandom(44);
  for (const [smiles, name] of CASES) {
    const first = named(smiles);
    const second = named(kekuleSwap(smiles));
    assert.equal(second.name, name, `${smiles} (other Kekulé drawing)`);
    assert.deepEqual(summary(second), summary(first), smiles);
    for (const mol of [parseSmiles(smiles), kekuleSwap(smiles)]) {
      for (let k = 0; k < 3; k += 1) {
        const copy = scrambleMolecule(mol, random);
        for (const atom of copy.atoms.values()) {
          atom.x = random() * 500;
          atom.y = random() * 500;
        }
        assert.deepEqual(summary(named(copy)), summary(first), `${smiles} scrambled`);
      }
    }
  } // End of the loop over the cases
  assert.equal(named('CCC1C(O)=C(O)C=CC=1').name, '3-etilbenceno-1,2-diol', 'the user\'s example, other drawing');
}); // End of test 'both Kekulé drawings and atom-id scrambles give…'

test('retained-name helpers: no aniline for a diamine; the diol names only unsubstituted, the ftálico family also substituted', () => {
  assert.equal(traditionalNameId(named('NC1=CC=C(N)C=C1').structure), null);
  assert.equal(traditionalNameId(named('NC1=CC=CC=C1').structure), 'aniline');
  assert.equal(traditionalNameId(named('CNC1=CC=CC=C1').structure), 'aniline');
  assert.deepEqual(retainedDigroupIds(named('OC1=CC=CC=C1O').structure), ['pyrocatechol', 'catechol']);
  assert.deepEqual(retainedDigroupIds(named('CC1=CC=C(O)C(O)=C1').structure), []);
  assert.deepEqual(retainedDigroupIds(named('CC1=CC=C(C(=O)O)C(C(=O)O)=C1').structure), ['phthalicAcid']);
  assert.deepEqual(retainedDigroupIds(named('OC(=O)C1=CC(C(O)=O)=CC(C(O)=O)=C1').structure), [], 'three groups');
  assert.deepEqual(retainedDigroupIds(named('N#CC1=CC=C(C#N)C=C1').structure), [], 'no tereftalonitrilo');
  assert.deepEqual(retainedDigroupIds(named('OC1=CC=C(C)C=C1').structure), [], 'one group');
  const catechol = named('OC1=CC=CC=C1O').alternatives.find((a) => a.name === 'catecol');
  assert.match(catechol.label, /acepta pirocatecol/);
  // The retained word refers to the ring and both groups.
  const phthalic = named('CC1=CC=C(C(=O)O)C(C(=O)O)=C1').alternatives[0];
  assert.deepEqual(phthalic.parts.map((p) => p.text), ['ácido', ' ', '4', '-', 'metil', 'ftálico']);
  assert.equal(phthalic.parts.at(-1).atoms.length, 6 + 2 * 3);
});

test('the English rendering for the oracle', () => {
  const english = (smiles) => englishName(named(smiles).structure);
  assert.equal(english('CCC1=C(O)C(O)=CC=C1'), '3-ethylbenzene-1,2-diol');
  assert.equal(english('NC1=CC=C(N)C=C1'), 'benzene-1,4-diamine');
  assert.equal(english('O=C(O)C1=CC(C(=O)O)=CC=C1'), 'benzene-1,3-dicarboxylic acid');
  assert.equal(english('N#CC1=CC(C#N)=CC(C#N)=C1'), 'benzene-1,3,5-tricarbonitrile');
  assert.equal(english('OC1=C(O)C(O)=C(O)C(O)=C1O'), 'benzenehexol');
});

test('the explanation speaks in plural, numbers the groups first and never mentions the double bonds when numbering', () => {
  const diol = stepTexts('CCC1=C(O)C(O)=CC=C1');
  assert.match(diol.get('group'), /2 grupos –OH .* unidos a carbonos del benceno/);
  assert.match(diol.get('group'), /Con un solo grupo –OH el benceno se llama «fenol», pero con 2 grupos –OH se nombra siempre con «benceno» y el sufijo «-diol»/);
  assert.match(diol.get('group'), /La «o» final de «benceno» se queda, .*«benceno-1,2-diol»/);
  assert.doesNotMatch(diol.get('group'), /bencenol|nombre preferido/);
  assert.match(diol.get('benzene'), /3 sustituyentes: 2 son grupos –OH\. Son el grupo principal/);
  assert.doesNotMatch(diol.get('benzene'), /fenol/);
  assert.match(diol.get('ringNumbering'), /los grupos –OH son el grupo principal y llevan los localizadores más bajos, así que uno de ellos está siempre en el 1/);
  assert.doesNotMatch(diol.get('ringNumbering'), /enlace|doble/);
  assert.match(diol.get('assemble'), /Después va «benceno», los números de los grupos –OH \(1,2\) entre guiones y el sufijo «-diol»/);
  assert.doesNotMatch(diol.get('assemble'), /fenol|no lleva número/);
  const step = explain(named('CCC1=C(O)C(O)=CC=C1')).find((s) => s.id === 'assemble');
  assert.deepEqual(step.legend.map((entry) => entry.text), ['3', 'etil', 'benceno', '1,2', '-diol']);
  // Only the principal groups: the para sentence; the traditional name in the group step.
  const quinol = stepTexts('OC1=CC=C(O)C=C1');
  assert.match(quinol.get('ringNumbering'), /Los dos grupos –OH están en posición para \(1,4\)/);
  assert.match(quinol.get('group'), /acepta también el nombre tradicional «hidroquinona»/);
  // Amines: no anilina, the o of benceno kept.
  const diamine = stepTexts('NC1=CC=C(N)C=C1');
  assert.match(diamine.get('group'), /el nombre es «bencenamina» \(o «anilina»\), pero con 2 grupos amino/);
  assert.doesNotMatch(diamine.get('group'), /La IUPAC \(2013\) conserva también el nombre tradicional «anilina»/);
  assert.match(diamine.get('assemble'), /«benceno-1,4-diamina»/);
  // Outside-carbon groups: the suffix includes the carbons, the retained one-group name is not used.
  const acid = stepTexts('O=C(O)C1=CC(C(=O)O)=CC=C1');
  assert.match(acid.get('group'), /«ácido benzoico», pero con 2 grupos –COOH se nombra siempre con «benceno» y el sufijo «-dicarboxílico», que dice cuántos hay e incluye los carbonos de los grupos/);
  assert.match(acid.get('group'), /«ácido isoftálico»/);
  assert.match(acid.get('assemble'), /El nombre empieza por la palabra «ácido»/);
  assert.doesNotMatch(acid.get('assemble'), /benzoico/);
  const nitrile = stepTexts('N#CC1=CC(C#N)=CC(C#N)=C1');
  assert.match(nitrile.get('benzene'), /los 3 son grupos –C≡N/);
  assert.match(nitrile.get('ringNumbering'), /Solo cuentan los grupos –C≡N/);
  // Complete substitution: no numbers.
  const hexol = explain(named('OC1=C(O)C(O)=C(O)C(O)=C1O'));
  const numbering = hexol.find((s) => s.id === 'ringNumbering');
  assert.equal(numbering.locants, null);
  assert.match(numbering.text.map(plainText).join(' '), /«bencenohexol» no lleva números/);
}); // End of test 'the explanation speaks in plural…'

test('refusals that stay: groups on the N of a ring diamine or diamide, esters, ketones, side-chain groups', () => {
  const amine = nameMolecule(parseSmiles('CNC1=CC=C(N)C=C1'));
  assert.equal(`${amine.error.code} ${amine.error.reason}`, 'HETEROATOM substitutedPolyamine');
  assert.equal(amine.error.message, SUBSTITUTED_BENZENE_POLYAMINE_MESSAGE);
  assert.match(SUBSTITUTED_BENZENE_POLYAMINE_MESSAGE, /N¹ y N⁴/);
  const amide = nameMolecule(parseSmiles('CNC(=O)C1=CC=C(C(N)=O)C=C1'));
  assert.equal(`${amide.error.code} ${amide.error.reason}`, 'HETEROATOM substitutedPolyamide');
  assert.equal(amide.error.message, SUBSTITUTED_BENZENE_POLYAMIDE_MESSAGE);
  // On a cyclohexane the message is unchanged.
  assert.equal(nameMolecule(parseSmiles('CNC(=O)C1CCC(C(N)=O)CC1')).error.message, SUBSTITUTED_POLYAMIDE_MESSAGE);
  // An ester beside another functional group of a substituted benzene has its own message (I-45c).
  const refusals = [
    ['CCOC(=O)C1=CC=C(C(=O)OCC)C=C1', SUBSTITUTED_BENZENE_ESTER_MESSAGE],
    ['CC(=O)C1=CC(O)=CC(O)=C1', /el benceno-1,2-diol/],
    ['OCC1=CC(O)=CC(O)=C1', /el benceno-1,2-diol/],
    ['CC(=O)OC1=CC=C(O)C=C1', SUBSTITUTED_BENZENE_ESTER_MESSAGE],
  ];
  for (const [smiles, message] of refusals) {
    const result = nameMolecule(parseSmiles(smiles));
    assert.equal(`${result.error.code} ${result.error.ringReason}`, 'CYCLE polysubstitutedBenzene', smiles);
    if (typeof message === 'string') {
      assert.equal(result.error.message, message, smiles);
    } else {
      assert.match(result.error.message, message, smiles);
    }
  }
  const random = seededRandom(5);
  for (let k = 0; k < 4; k += 1) {
    const result = nameMolecule(scrambleMolecule(parseSmiles('CNC1=CC=C(N)C=C1'), random));
    assert.equal(result.error.reason, 'substitutedPolyamine');
  }
}); // End of test 'refusals that stay…'

test('Ordenar dibujo lays them out; the 90° view still falls back', () => {
  for (const [smiles] of CASES) {
    const mol = parseSmiles(smiles);
    const result = named(mol);
    assert.equal(canArrange(result), true, smiles);
    assert.ok(layoutProblems(canonicalLayout(mol, result)).ok, `${smiles}: a clean layout`);
    assert.deepEqual(projectRightAngles(mol), { ok: false, reason: 'CYCLE' }, smiles);
  }
});
