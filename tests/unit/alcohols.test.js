/**
 * @file Unit tests for alcohols (design.md §13.4 I-31): the OH as the
 * principal characteristic group cited as the suffix `-ol` (`-diol`,
 * `-triol`), the parent chain with the most OH groups (P0, before the
 * length), the lowest locants for the OH groups (N0, before the multiple
 * bonds and the prefixes), the `hidroxi-` prefix of an OH on a branch, the
 * elided or kept final vowel of the ending, locant omission (`metanol`,
 * `etanol`, `ciclohexanol`), cycloalkanols and `fenol`, validation (alcohol
 * vs phenol vs carboxylic OH, other O and N groups still refused, an OH on
 * a ring's side chain refused with its own message), id invariance, the
 * explanation steps and the views that need a name. The names themselves
 * are checked row by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import { createMolecule, addAtom, addBond, formula } from '../../src/model/molecule.js';
import {
  validateForNaming, isHydroxyOxygen, hasNameableHeteroatoms, sideChainHydroxyls, MESSAGES,
} from '../../src/model/validate.js';
import { adjacency } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { hydroxySubstituent, nameSubstituent, suffixSites } from '../../src/naming/substituent.js';
import { citationKey, substituentPrefix, needsEnclosure, isCompoundPrefix, suffixWords } from '../../src/naming/render.js';
import { lexiconEs, chainOmitsPrefixLocants, ringOmitsLocants } from '../../src/naming/lexicon.es.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { buildSuffix } from '../../src/naming/structure.js';
import { explain, plainText, atomCounts } from '../../src/explain/explain.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateAlcohols, hydroxylate } from '../../scripts/oracle/generate.mjs';
import { writeSmiles } from '../../src/model/smiles.js';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';
import { projectRightAngles } from '../../src/ui/canvasbar.js';

/**
 * Names a SMILES string in the default style.
 *
 * @param {string} smiles - The molecule.
 * @returns {object} The naming result.
 */
function named(smiles) {
  return nameMolecule(parseSmiles(smiles));
}

/**
 * All the plain text of the explanation step with a given id.
 *
 * @param {string} smiles - The molecule.
 * @param {string} id - Step id.
 * @returns {string} The step's paragraphs joined, glossary marks removed ('' when the step is absent).
 */
function stepText(smiles, id) {
  const step = explain(named(smiles)).find((s) => s.id === id);
  return step ? step.text.map(plainText).join(' ') : '';
}

test('validation: an OH on a carbon is admitted; every other O and N group keeps the refusal', () => {
  for (const smiles of ['CO', 'OCCO', 'C=CO', 'C#CO', 'ClCCO', 'OC1CCCCC1', 'OC1=CC=CC=C1', 'OC(O)C', 'FC(F)(F)CO']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Peroxides, water, an N–O bond, anhydrides, carbonates, a peracid: refused as before (aldehydes and ketones are named since
  // I-32, acids since I-33, ethers since I-34, esters since I-35, amines — `2-aminoetan-1-ol` — since I-36).
  for (const smiles of ['CC(=O)OO', 'COOC', 'CCOO', 'O', 'ONCCO', 'CC(=O)OC(C)=O', 'OCCOC(=O)OC']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'HETEROATOM', smiles);
    assert.equal(error.message, MESSAGES.HETEROATOM, smiles);
  }
  assert.match(MESSAGES.HETEROATOM, /alcoholes \(con grupos –OH unidos a un carbono\)/);
  const mol = parseSmiles('CC(=O)O');
  const adj = adjacency(mol);
  const oxygens = [...mol.atoms.values()].filter((a) => a.element === 'O').map((a) => a.id);
  assert.deepEqual(oxygens.map((id) => isHydroxyOxygen(mol, adj, id)), [false, true], 'the acid OH looks like an OH on its own…');
  assert.equal(hasNameableHeteroatoms(mol, oxygens), true, '…and the whole –COOH is admitted as an acid (I-33), never as an alcohol');
  assert.equal(hasNameableHeteroatoms(parseSmiles('ClCCO'), [1, 4]), true, 'a halogen and an OH on carbons');
});

test('alcohol vs phenol vs carboxylic OH', () => {
  assert.equal(named('CCO').name, 'etanol');
  assert.equal(named('OC1CCCCC1').name, 'ciclohexanol');
  assert.equal(named('OC1=CC=CC=C1').name, 'fenol');
  assert.equal(named('OC1C=CC=CC=1').name, 'fenol', 'the other Kekulé drawing');
  assert.equal(named('OC1=CCCCC1').name, 'ciclohex-1-en-1-ol', 'a cyclohexene is not benzene');
  const acid = named('CC(=O)O');
  assert.equal(acid.name, 'ácido etanoico', 'the OH of an acid is part of the acid, never an alcohol (I-33)');
  assert.equal(acid.structure.suffix.kind, 'acid');
  // A substituted phenol is a polysubstituted benzene; an OH on a benzene side chain is named since I-40a (the chain
  // carries the principal group, the ring is `fenil`).
  assert.equal(named('OC1=CC=C(C)C=C1').error.code, 'CYCLE');
  assert.equal(named('OCC1=CC=CC=C1').name, 'fenilmetanol');
  assert.deepEqual(sideChainHydroxyls(parseSmiles('OC1CCC(CO)CC1')), [7]);
  assert.equal(named('OC1CCC(CO)CC1').name, '4-(hidroximetil)ciclohexan-1-ol', 'one OH on the ring, one on a branch: a tie, the ring wins');
});

test('P0: the parent carries the most OH groups before being the longest (IUPAC 2013 P-44.1.1)', () => {
  const result = named('CCCCC(CO)CCC');
  assert.equal(result.name, '2-propilhexan-1-ol');
  const [p0, p1] = result.trace;
  assert.equal(p0.rule, 'P0');
  assert.equal(p1.rule, 'P1');
  assert.equal(Math.max(...p0.values), 1);
  assert.ok(p0.survivors.length < p0.candidatesBefore.length, 'P0 decided');
  assert.ok(Math.max(...p0.candidatesBefore.map((c) => c.atoms.length)) > result.parent.atoms.length, 'a longer chain lost');
  // No chain holds all three OH groups: the one left over is a hidroxi- prefix.
  const triol = named('OCC(CO)CO');
  assert.equal(triol.name, '2-(hidroximetil)propano-1,3-diol');
  assert.equal(Math.max(...triol.trace[0].values), 2);
  // Hydrocarbons and halogen derivatives have no P0 step.
  assert.equal(named('CCC(C)C').trace[0].rule, 'P1');
  assert.equal(named('CCCl').trace[0].rule, 'P1');
});

test('N0: the OH gets the lowest locant before the multiple bonds and the prefixes', () => {
  const allyl = named('C=CCO');
  assert.equal(allyl.name, 'prop-2-en-1-ol');
  const rules = allyl.trace.map((s) => s.rule);
  assert.ok(rules.indexOf('N0') >= 0 && !rules.includes('N1'), 'N0 decides, N1 never runs');
  assert.equal(named('CC(O)CC=C').name, 'pent-4-en-2-ol');
  assert.equal(named('CC(O)CC(C)C').name, '4-metilpentan-2-ol');
  assert.equal(named('C=CC(O)CC').name, 'pent-1-en-3-ol', 'N0 tie, then N1');
  assert.equal(named('ClCC(O)C').name, '1-cloropropan-2-ol', 'N0 tie, then N3');
  assert.equal(named('OCC(Cl)C(Br)CO').name, '2-bromo-3-clorobutano-1,4-diol', 'N0 and N3 tie, then N4');
  // Rings: the OH carbon is 1, then the ring double bond, then the prefixes.
  assert.equal(named('OC1C=CCCC1').name, 'ciclohex-2-en-1-ol');
  assert.equal(named('OC1C(C)CCC(C)C1').name, '2,5-dimetilciclohexan-1-ol');
  const ring = named('CC1CCCCC1O');
  assert.equal(ring.trace[0].rule, 'RING');
  assert.equal(ring.trace[1].rule, 'N0');
});

test('the suffix structure: carrying carbon, oxygen and bond per OH, ascending locants', () => {
  const mol = parseSmiles('CC(O)(O)CCO');
  const result = nameMolecule(mol);
  assert.equal(result.name, 'butano-1,3,3-triol');
  const { suffix } = result.structure;
  assert.equal(suffix.kind, 'alcohol');
  assert.deepEqual(suffix.locants.map((s) => s.locant), [1, 3, 3]);
  for (const site of suffix.locants) {
    assert.equal(mol.atoms.get(site.atom).element, 'C');
    assert.equal(mol.atoms.get(site.attachAtom).element, 'O');
    const bond = mol.bonds.get(site.bond);
    assert.deepEqual([bond.a, bond.b].sort((p, q) => p - q), [site.atom, site.attachAtom].sort((p, q) => p - q));
  }
  assert.equal(result.structure.prefixes.length, 0, 'the OH groups of the parent are not prefixes');
  assert.equal(named('CCC').structure.suffix, null);
  assert.equal(buildSuffix([], [1, 2]), null);
  const adj = adjacency(mol);
  assert.equal(suffixSites(mol, adj, result.parent.atoms).length, 3);
  // The `ol` part points at every OH; the locants at their carbon and oxygen.
  const ol = result.parts.find((p) => p.text === 'ol');
  assert.deepEqual([...ol.atoms].sort((p, q) => p - q), suffix.locants.flatMap((s) => [s.atom, s.attachAtom]).sort((p, q) => p - q));
  assert.equal(result.parts.find((p) => p.text === 'tri').kind, 'multiplier');
});

test('ending vowel: elided before -ol, kept before -diol/-triol (IUPAC 2013 P-16.7.1), in both lexicons', () => {
  const pairs = [
    ['CC(O)C', 'propan-2-ol', 'propan-2-ol'],
    ['OCCO', 'etano-1,2-diol', 'ethane-1,2-diol'],
    ['OCC(O)CO', 'propano-1,2,3-triol', 'propane-1,2,3-triol'],
    ['C=CCO', 'prop-2-en-1-ol', 'prop-2-en-1-ol'],
    ['CC(O)C#C', 'but-3-in-2-ol', 'but-3-yn-2-ol'],
    ['OCC=CCO', 'but-2-eno-1,4-diol', 'but-2-ene-1,4-diol'],
    ['OC(C=C)C=C', 'penta-1,4-dien-3-ol', 'penta-1,4-dien-3-ol'],
    ['OC1CCC(O)CC1', 'ciclohexano-1,4-diol', 'cyclohexane-1,4-diol'],
    ['OC1=CC=CC=C1', 'fenol', 'phenol'],
    ['CO', 'metanol', 'methanol'],
    ['OCC(CO)CO', '2-(hidroximetil)propano-1,3-diol', '2-(hydroxymethyl)propane-1,3-diol'],
  ];
  for (const [smiles, es, en] of pairs) {
    const result = named(smiles);
    assert.equal(result.name, es, smiles);
    assert.equal(englishName(result.structure), en, smiles);
  }
  const one = { kind: 'alcohol', locants: [{}] };
  const two = { kind: 'alcohol', locants: [{}, {}] };
  assert.deepEqual(suffixWords(one, lexiconEs), { multiplier: '', word: 'ol', elides: true });
  assert.deepEqual(suffixWords(two, lexiconEs), { multiplier: 'di', word: 'ol', elides: false });
  assert.deepEqual(suffixWords(two, lexiconEn), { multiplier: 'di', word: 'ol', elides: false });
});

test('suffix multiplier: the a of tetra, penta… is elided before -ol, never in prefixes (IUPAC 2013 P-16.7.1(c))', () => {
  const pairs = [
    ['OCC(O)C(O)CO', 'butano-1,2,3,4-tetrol', 'butane-1,2,3,4-tetrol'],
    ['OCC(O)C(O)C(O)CO', 'pentano-1,2,3,4,5-pentol', 'pentane-1,2,3,4,5-pentol'],
    ['OC(O)C(O)C(O)O', 'propano-1,1,2,3,3-pentol', 'propane-1,1,2,3,3-pentol'],
    ['OCC(O)CO', 'propano-1,2,3-triol', 'propane-1,2,3-triol'],
    ['OCCO', 'etano-1,2-diol', 'ethane-1,2-diol'],
    // Prefix multipliers keep their a: tetrametil, tetracloro.
    ['CC(C)(C)C(C)(C)C', '2,2,3,3-tetrametilbutano', '2,2,3,3-tetramethylbutane'],
    ['ClC(Cl)C(Cl)Cl', '1,1,2,2-tetracloroetano', '1,1,2,2-tetrachloroethane'],
    ['OCC(Cl)(Cl)C(Cl)(Cl)CO', '2,2,3,3-tetraclorobutano-1,4-diol', '2,2,3,3-tetrachlorobutane-1,4-diol'],
  ];
  for (const [smiles, es, en] of pairs) {
    const result = named(smiles);
    assert.equal(result.name, es, smiles);
    assert.equal(englishName(result.structure), en, smiles);
  }
  const four = { kind: 'alcohol', locants: [{}, {}, {}, {}] };
  const three = { kind: 'alcohol', locants: [{}, {}, {}] };
  assert.deepEqual(suffixWords(four, lexiconEs), { multiplier: 'tetr', word: 'ol', elides: false });
  assert.deepEqual(suffixWords(four, lexiconEn), { multiplier: 'tetr', word: 'ol', elides: false });
  assert.deepEqual(suffixWords(three, lexiconEs), { multiplier: 'tri', word: 'ol', elides: false });
  const result = named('OCC(O)C(O)CO');
  assert.equal(result.parts.find((p) => p.kind === 'multiplier').text, 'tetr');
  assert.match(stepText('OCC(O)C(O)CO', 'assemble'), /«tetra» pierde su «a» final delante de «-ol»/);
}); // End of test 'suffix multiplier elision'

test('a ring multiple bond forced onto the closure bond gets the compound locant 1(6) (IUPAC 2013 P-31.1.4.2.4)', () => {
  const pairs = [
    ['OC1C(O)CC(O)CC=1', 'ciclohex-1(6)-eno-1,2,4-triol', 'cyclohex-1(6)-ene-1,2,4-triol'],
    // Free choice: the closure bond is compared as n, so plain locants win.
    ['OC1C(O)CCCC=1', 'ciclohex-2-eno-1,2-diol', 'cyclohex-2-ene-1,2-diol'],
    ['C1=C=CCCCCCC1', 'ciclonona-1,2-dieno', 'cyclonona-1,2-diene'],
    ['OC1C=CCCC=1', 'ciclohexa-1,5-dien-1-ol', 'cyclohexa-1,5-dien-1-ol'],
    ['C1=CC=CCC1', 'ciclohexa-1,3-dieno', 'cyclohexa-1,3-diene'],
    ['ClC1C(Cl)CC(Cl)CC=1', '1,4,6-triclorociclohex-1-eno', '1,4,6-trichlorocyclohex-1-ene'],
    ['CC1C(C)CC(C)CC=1', '1,4,6-trimetilciclohex-1-eno', '1,4,6-trimethylcyclohex-1-ene'],
  ];
  for (const [smiles, es, en] of pairs) {
    const result = named(smiles);
    assert.equal(result.name, es, smiles);
    assert.equal(englishName(result.structure), en, smiles);
  }
  const result = named('OC1C(O)CC(O)CC=1');
  const [site] = result.structure.parent.double;
  assert.deepEqual([site.locant, site.closing], [1, 6]);
  // The 1(6) part refers to the closure bond and its two atoms.
  const locant = result.parts.find((p) => p.text === '1(6)');
  assert.equal(locant.kind, 'locant');
  assert.deepEqual(locant.bonds, [site.bond]);
  assert.deepEqual(locant.atoms, site.atoms);
  // N1 compares the closure bond as n: the diol's other numbering (2) beats 6.
  const diol = explain(named('OC1C(O)CCCC=1')).find((s) => s.id === 'ringNumbering');
  const n1 = diol.compare.rows.find((row) => row.rule === 'N1');
  assert.deepEqual(n1.lists, [[2], [6], null]);
  const text = stepText('OC1C(O)CC(O)CC=1', 'ringNumbering');
  assert.match(text, /entre paréntesis: «1\(6\)»/);
  assert.match(text, /cuenta como 6, el número más alto/);
  const legend = explain(result).find((s) => s.id === 'assemble').legend;
  assert.ok(legend.some((entry) => entry.text === '1(6)' && /cierra el anillo/.test(entry.meaning)));
}); // End of test 'compound locant 1(6)'

test('locant omission: one-carbon, monosubstituted two-carbon and monosubstituted saturated rings (P-14.3.4.2)', () => {
  const names = [
    ['CO', 'metanol'], ['OCO', 'metanodiol'], ['OC(Cl)(Cl)Cl', 'triclorometanol'],
    ['CCO', 'etanol'], ['C=CO', 'etenol'], ['C#CO', 'etinol'],
    ['OCCO', 'etano-1,2-diol'], ['ClCCO', '2-cloroetan-1-ol'], ['ClC=CO', '2-cloroeten-1-ol'],
    ['CCCO', 'propan-1-ol'],
    ['OC1CCCCC1', 'ciclohexanol'], ['CC1CCCCC1O', '2-metilciclohexan-1-ol'], ['OC1C=CCCC1', 'ciclohex-2-en-1-ol'],
  ];
  for (const [smiles, name] of names) {
    assert.equal(named(smiles).name, name, smiles);
  }
  const chain = (length) => ({ length, double: [], triple: [] });
  assert.equal(chainOmitsPrefixLocants(chain(1), [], 2), true);
  assert.equal(chainOmitsPrefixLocants(chain(2), [], 1), true);
  assert.equal(chainOmitsPrefixLocants(chain(2), [], 2), false);
  assert.equal(chainOmitsPrefixLocants(chain(3), [], 1), false);
  assert.equal(chainOmitsPrefixLocants(chain(2), [], 0), false);
  const ring = { kind: 'ring', length: 6, double: [], triple: [] };
  assert.deepEqual(ringOmitsLocants(ring, [], 1), { parent: false, prefixes: true });
  assert.deepEqual(ringOmitsLocants(ring, [], 2), { parent: false, prefixes: false });
  assert.deepEqual(ringOmitsLocants({ ...ring, double: [{ locant: 2 }] }, [], 1), { parent: false, prefixes: false });
  assert.deepEqual(ringOmitsLocants({ ...ring, retained: 'benzene' }, [], 1), { parent: true, prefixes: true });
});

test('hidroxi-: a simple prefix inside a branch, alphabetised under h', () => {
  const sub = hydroxySubstituent(9);
  assert.equal(substituentPrefix(sub, lexiconEs), 'hidroxi');
  assert.equal(substituentPrefix(sub, lexiconEn), 'hydroxy');
  assert.equal(needsEnclosure(sub), false);
  assert.equal(isCompoundPrefix(sub), false);
  assert.deepEqual(citationKey(sub, lexiconEs), { alpha: 'hidroxi', numeric: [], italic: '' });
  const mol = parseSmiles('CO');
  assert.deepEqual(nameSubstituent(mol, 1, 2), hydroxySubstituent(2));
  // A branch with an OH is compound: enclosed, bis when repeated, never a retained name.
  assert.equal(named('OCC(CO)(CO)CO').name, '2,2-bis(hidroximetil)propano-1,3-diol');
  assert.equal(named('OCC(O)C(CCO)CCO').name, '3-(2-hidroxietil)pentano-1,2,5-triol');
  // A longer chain with as many OH groups wins, so the OH ends up in the parent, not in a branch.
  assert.equal(named('OCC(C(C)O)CO').name, '2-(hidroximetil)butano-1,3-diol');
  assert.equal(named('OCC(C(C)(C)O)CO').name, '2-(hidroximetil)-3-metilbutano-1,3-diol', 'hidroxi (h) before metil (m)');
});

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(31);
  for (const smiles of ['CCCCC(CO)CCC', 'OCC(CO)CO', 'OCC(Cl)C(Br)CO', 'CC1CCCCC1O', 'OC1=CC=CC=C1', 'C=CCC(O)C#C']) {
    const expected = named(smiles).name;
    for (let k = 0; k < 5; k += 1) {
      assert.equal(nameMolecule(scrambleMolecule(parseSmiles(smiles), random)).name, expected, smiles);
    }
  }
});

test('explanation: the -OH group, the principal chain, N0, locant omission and the elided o', () => {
  const ids = (smiles) => explain(named(smiles)).map((s) => s.id);
  assert.deepEqual(ids('CCO'), ['count', 'group', 'groupChain', 'numbering', 'assemble']);
  assert.deepEqual(ids('CO'), ['count', 'group', 'assemble']);
  assert.deepEqual(ids('OC1CCCCC1'), ['count', 'group', 'ring', 'ringNumbering', 'assemble']);
  assert.deepEqual(ids('OC1=CC=CC=C1'), ['count', 'group', 'benzene', 'assemble']);
  assert.deepEqual(atomCounts(named('OCC(CO)CO').structure), { carbons: 4, hydrogens: 10, halogens: {}, oxygens: 3 });
  assert.equal(formula(parseSmiles('OCC(CO)CO')), 'C4H10O3');
  assert.match(stepText('ClCCO', 'count'), /2 carbonos, 5 hidrógenos, 1 átomo de cloro y 1 átomo de oxígeno \(C₂H₅ClO\)/);
  assert.match(stepText('CCO', 'count'), /El oxígeno se ve como OH/);
  assert.match(stepText('CCO', 'group'), /la molécula es un alcohol.*sufijo «-ol»/);
  assert.match(stepText('OCCO', 'group'), /2 grupos –OH en la cadena principal, así que el sufijo dice cuántos: «-diol»/);
  assert.match(stepText('OCC(CO)CO', 'group'), /prefijo «hidroxi-»/);
  assert.match(stepText('OC1=CC=CC=C1', 'group'), /la molécula es un fenol.*«bencenol», que no se usa/);
  assert.match(stepText('ClCCO', 'group'), /Los halógenos nunca son el grupo principal/);
  assert.match(stepText('CCCCC(CO)CCC', 'groupChain'), /Hay una cadena más larga, de 8 carbonos, pero lleva menos grupos –OH/);
  const chain = explain(named('CCCCC(CO)CCC')).find((s) => s.id === 'groupChain');
  assert.equal(chain.title, 'Busca la cadena principal');
  assert.equal(chain.options[0].label, 'Más larga, con menos –OH');
  assert.match(stepText('OCC(CO)CO', 'groupChain'), /Ninguna cadena puede llevar todos los grupos –OH/);
  assert.match(stepText('CC(O)CC(C)C', 'numbering'), /Regla: los grupos –OH \(el grupo principal\) deben tener los localizadores más bajos/);
  assert.match(stepText('C=CCO', 'numbering'), /el enlace doble tendría el número 1 en vez del 2, pero manda el –OH/);
  assert.doesNotMatch(stepText('C=CC(O)CC', 'numbering'), /Fíjate/, 'N0 ties: the bonds decide');
  assert.match(stepText('CCO', 'numbering'), /En «etanol» no hace falta el número: .*el grupo –OH siempre puede quedar en el carbono 1/);
  assert.doesNotMatch(stepText('CCCO', 'numbering'), /no hay otra posibilidad/);
  assert.match(stepText('OC1CCCCC1', 'ringNumbering'), /Empieza a contar por el carbono que tiene el grupo –OH/);
  assert.match(stepText('OC1CCCCC1', 'ringNumbering'), /el número no se escribe: «ciclohexanol»/);
  assert.match(stepText('CC1CCCCC1O', 'ringNumbering'), /aquí ese 1 se escribe \(«2-metilciclohexan-1-ol»\)/);
  assert.match(stepText('OC1CCCCC1', 'ring'), /es el grupo principal y da la terminación «-ol»/);
  assert.doesNotMatch(stepText('OC1CCCCC1', 'count'), /CₙH₂ₙ/);
  assert.match(stepText('CC(O)C', 'assemble'), /La «o» final de «-ano» se quita delante de «-ol», porque empieza por vocal: «propan-2-ol»/);
  assert.match(stepText('OCCO', 'assemble'), /La «o» final de «-ano» se queda delante de «-diol», porque empieza por consonante/);
  assert.match(stepText('OCC(CO)CO', 'substituents'), /Es una rama con un grupo –OH.*prefijo «hidroxi-»/);
  const legend = explain(named('CC(O)C')).find((s) => s.id === 'assemble').legend;
  assert.deepEqual(legend.map((l) => l.text), ['prop', '-an', '2', '-ol']);
  const phenol = explain(named('OC1=CC=CC=C1')).find((s) => s.id === 'assemble').legend;
  assert.deepEqual(phenol.map((l) => l.text), ['fen', '-ol']);
  // A successful alcohol result is not a refusal: no `groups`, no group-refusal steps.
  assert.equal('groups' in named('CCO'), false);
});

test('views that need a name: Ordenar dibujo lays out alcohols; the 90° view keeps the normal drawing', () => {
  for (const smiles of ['CO', 'OCC(O)CO', 'CCCCC(CO)CCC', 'OC1CCCCC1', 'OC1=CC=CC=C1', 'CC1CCCCC1O', 'OCC(CO)CO']) {
    const mol = parseSmiles(smiles);
    let i = 0;
    for (const atom of mol.atoms.values()) {
      atom.x = (i * 37) % 200;
      atom.y = (i * 53) % 170;
      i += 1;
    }
    const laid = canonicalLayout(mol, nameMolecule(mol));
    assert.equal(layoutProblems(laid).ok, true, smiles);
    assert.equal(laid.atoms.size, mol.atoms.size);
  }
  assert.deepEqual(projectRightAngles(parseSmiles('CCO')), { ok: false, reason: 'HETEROATOM' });
});

test('oracle generator: deterministic alcohols, all valid, OH on ring carbons only', () => {
  const first = generateAlcohols({ count: 60, seed: 3 }).map(writeSmiles);
  assert.deepEqual(generateAlcohols({ count: 60, seed: 3 }).map(writeSmiles), first);
  assert.equal(first.length, 60);
  for (const smiles of first) {
    const mol = parseSmiles(smiles);
    assert.ok([...mol.atoms.values()].some((a) => a.element === 'O'), smiles);
    assert.equal(validateForNaming(mol), null, smiles);
  }
  const ring = hydroxylate(parseSmiles('CC1CCCCC1'), seededRandom(1), 1, new Set([2]));
  assert.equal(nameMolecule(ring).name, '1-metilciclohexan-1-ol', 'only the allowed carbon gets OH groups (one H left on it)');
});

test('a molecule built atom by atom: a 30-carbon chain with an OH at each end', () => {
  const mol = createMolecule();
  let previous = addAtom(mol);
  for (let i = 1; i < 30; i += 1) {
    const next = addAtom(mol);
    addBond(mol, previous, next);
    previous = next;
  }
  addBond(mol, 1, addAtom(mol, {}, 'O'));
  addBond(mol, 30, addAtom(mol, {}, 'O'));
  assert.equal(nameMolecule(mol).name, 'triacontano-1,30-diol');
});
