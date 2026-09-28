/**
 * @file Unit tests for carboxylic acids and aldehydes with a ring and the
 * ring acyl prefixes (design.md §13.4 I-40b): a –COOH or –CHO bonded to a
 * ring carbon is the ring's group, cited with a suffix whose carbon is
 * outside the ring (`ácido ciclohexanocarboxílico`,
 * `ciclohexanocarbaldehído`, `ciclohexano-1,2-dicarboxílico`), the retained
 * `ácido benzoico` / `benzaldehído` on benzene (the systematic
 * `bencenocarboxílico` / `bencenocarbaldehído` as alternatives); on a side
 * chain the chain is the parent and the ring a prefix (`ácido
 * 2-feniletanoico` with `ácido fenilacético`, `3-fenilpropanal`); a –COOH
 * not in the suffix is `carboxi-` (`(carboximetil)`, `(4-carboxiciclohexil)`,
 * `(carboximetoxi)`); a C=O between the chain and the ring off the chain is
 * `benzoil` / `(ciclohexanocarbonil)` (the lifted `ringAcyl`). Covers the
 * lifted refusals (`ringAcid`, `ringAldehyde`, `ringAcyl`), the ones that
 * stay (`ringEster`, `manyAcids` and
 * `manyAldehydes` per carbon piece), the ring-or-chain count, both
 * lexicons, the explanation, atom-order invariance (refusals included),
 * Ordenar dibujo and the oracle generator. The names are also checked row
 * by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { canonicalKey } from '../../src/model/graph.js';
import { validateForNaming, MANY_ACIDS_MESSAGE, MANY_ALDEHYDES_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { ringOrChain } from '../../src/naming/parent.js';
import { ringParent } from '../../src/naming/rings.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { needsEnclosure, isCompoundPrefix, renderName } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateRingAcids } from '../../scripts/oracle/generate.mjs';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';
import { explain, plainText, atomCounts } from '../../src/explain/explain.js';

/**
 * Names a SMILES string in a prefix style (default 'isopropil').
 *
 * @param {string} smiles - The molecule.
 * @param {string} [prefixStyle] - Prefix style.
 * @returns {object} The naming result.
 */
function named(smiles, prefixStyle = PREFIX_STYLES[0]) {
  return nameMolecule(parseSmiles(smiles), { prefixStyle });
}

/**
 * The Spanish name of a SMILES string, or the refusal code and reason.
 *
 * @param {string} smiles - The molecule.
 * @returns {string} The name, or `CODE reason`.
 */
function nameOf(smiles) {
  const result = named(smiles);
  return result.ok ? result.name : `${result.error.code} ${result.error.reason || ''}`.trim();
}

/**
 * The text of one explanation step of a SMILES string, as plain text.
 *
 * @param {string} smiles - The molecule.
 * @param {string} id - The step id.
 * @returns {string} Its paragraphs, joined.
 */
function stepText(smiles, id) {
  const step = explain(named(smiles)).find((s) => s.id === id);
  return step ? step.text.map(plainText).join(' ') : '';
}

/** Molecules named since I-40b, with their Spanish and English names. */
const NAMED = [
  ['OC(=O)C1CCCCC1', 'ácido ciclohexanocarboxílico', 'cyclohexanecarboxylic acid'],
  ['OC(=O)C1CCCC1', 'ácido ciclopentanocarboxílico', 'cyclopentanecarboxylic acid'],
  ['OC(=O)C1=CC=CC=C1', 'ácido benzoico', 'benzoic acid'],
  ['O=CC1CCCCC1', 'ciclohexanocarbaldehído', 'cyclohexanecarbaldehyde'],
  ['O=CC1=CC=CC=C1', 'benzaldehído', 'benzaldehyde'],
  ['OC(=O)C1CCCCC1C', 'ácido 2-metilciclohexano-1-carboxílico', '2-methylcyclohexane-1-carboxylic acid'],
  ['O=CC1CCCC(Cl)C1', '3-clorociclohexano-1-carbaldehído', '3-chlorocyclohexane-1-carbaldehyde'],
  ['OC(=O)C1CCCCC1C(=O)O', 'ácido ciclohexano-1,2-dicarboxílico', 'cyclohexane-1,2-dicarboxylic acid'],
  ['OC(=O)C1(C(=O)O)CCCCC1', 'ácido ciclohexano-1,1-dicarboxílico', 'cyclohexane-1,1-dicarboxylic acid'],
  ['O=CC1CCC(C=O)CC1', 'ciclohexano-1,4-dicarbaldehído', 'cyclohexane-1,4-dicarbaldehyde'],
  ['OC(=O)C1C=CCCC1', 'ácido ciclohex-2-eno-1-carboxílico', 'cyclohex-2-ene-1-carboxylic acid'],
  ['OC(=O)C1=CCCCC1', 'ácido ciclohex-1-eno-1-carboxílico', 'cyclohex-1-ene-1-carboxylic acid'],
  ['OC(=O)CC1=CC=CC=C1', 'ácido 2-feniletanoico', '2-phenylethanoic acid'],
  ['O=CCC1CCCCC1', '2-ciclohexiletanal', '2-cyclohexylethanal'],
  ['O=CCCC1=CC=CC=C1', '3-fenilpropanal', '3-phenylpropanal'],
  ['OC(=O)C(CC)C(=O)C1=CC=CC=C1', 'ácido 2-benzoilbutanoico', '2-benzoylbutanoic acid'],
  // English keeps the Spanish citation order of the structure (the oracle checks structure only).
  ['OC(=O)CCCC(=O)C1=CC=CC=C1', 'ácido 5-fenil-5-oxopentanoico', '5-phenyl-5-oxopentanoic acid'],
  ['CC(=O)C(C(=O)C1CCCCC1)C(C)=O', '3-(ciclohexanocarbonil)pentano-2,4-diona', '3-(cyclohexanecarbonyl)pentane-2,4-dione'],
  ['CC(=O)C(C(=O)C1CCCCC1C)C(C)=O', '3-(2-metilciclohexano-1-carbonil)pentano-2,4-diona', '3-(2-methylcyclohexane-1-carbonyl)pentane-2,4-dione'],
  ['OC(=O)C(C(=O)C1C=CCCC1)CC', 'ácido 2-(ciclohex-2-eno-1-carbonil)butanoico', '2-(cyclohex-2-ene-1-carbonyl)butanoic acid'],
  ['OC(=O)C1CCC(O)CC1', 'ácido 4-hidroxiciclohexano-1-carboxílico', '4-hydroxycyclohexane-1-carboxylic acid'],
  ['OC(=O)C1CCC(=O)CC1', 'ácido 4-oxociclohexano-1-carboxílico', '4-oxocyclohexane-1-carboxylic acid'],
  ['NC1CCC(C(=O)O)CC1', 'ácido 4-aminociclohexano-1-carboxílico', '4-aminocyclohexane-1-carboxylic acid'],
  ['OCC1CCC(C(=O)O)CC1', 'ácido 4-(hidroximetil)ciclohexano-1-carboxílico', '4-(hydroxymethyl)cyclohexane-1-carboxylic acid'],
  ['CC(=O)C1CCC(C(=O)O)CC1', 'ácido 4-acetilciclohexano-1-carboxílico', '4-acetylcyclohexane-1-carboxylic acid'],
  ['OC(=O)C1CCCCC1CC(=O)O', 'ácido 2-(carboximetil)ciclohexano-1-carboxílico', '2-(carboxymethyl)cyclohexane-1-carboxylic acid'],
  ['OC(=O)C(C(=O)O)C1CCC(C(=O)O)CC1', 'ácido 2-(4-carboxiciclohexil)propanodioico', '2-(4-carboxycyclohexyl)propanedioic acid'],
  ['OC(=O)CC1CCC(C=O)CC1', 'ácido 2-(4-formilciclohexil)etanoico', '2-(4-formylcyclohexyl)ethanoic acid'],
  ['OC(=O)C1CCC(C=O)CC1', 'ácido 4-formilciclohexano-1-carboxílico', '4-formylcyclohexane-1-carboxylic acid'],
  ['O=CC1CCCCC1CC=O', '2-(2-oxoetil)ciclohexano-1-carbaldehído', '2-(2-oxoethyl)cyclohexane-1-carbaldehyde'],
  ['O=CC(C=O)C1CCC(C=O)CC1', '2-(4-formilciclohexil)propanodial', '2-(4-formylcyclohexyl)propanedial'],
  ['OC(=O)COCCC(=O)O', 'ácido 3-(carboximetoxi)propanoico', '3-(carboxymethoxy)propanoic acid'],
];

test('the examples of the phase are named, in Spanish and in English', () => {
  for (const [smiles, spanish, english] of NAMED) {
    const result = named(smiles);
    assert.equal(result.ok, true, `${smiles}: ${JSON.stringify(result.error)}`);
    assert.equal(result.name, spanish, smiles);
    assert.equal(result.parts.map((p) => p.text).join(''), spanish, smiles);
    assert.equal(englishName(result.structure), english, smiles);
  }
});

test('the ring refusals of I-40b are lifted; esters with a ring stay refused (nitriles and amides named since I-40c)', () => {
  for (const smiles of ['OC(=O)C1CCCCC1', 'O=CC1CCCCC1', 'OC(=O)CC1CCCCC1', 'O=CCC1=CC=CC=C1', 'OC(=O)C1=CC=CC=C1']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  for (const [smiles, reason] of [
    ['COC(=O)C1CCCCC1', 'ringEster'],
    ['CC(=O)OC1=CC=CC=C1', 'ringEster'],
    // With an acid too: the ring ester decides.
    ['COC(=O)C1CCC(C(=O)O)CC1', 'ringEster'],
  ]) {
    assert.equal(nameOf(smiles), `HETEROATOM ${reason}`, smiles);
  }
  // Beside an acid a ring nitrile or amide is a prefix since I-40c (tests/unit/ring-nitriles-amides.test.js).
  assert.equal(nameOf('N#CC1CCC(C(=O)O)CC1'), 'ácido 4-cianociclohexano-1-carboxílico');
  assert.equal(nameOf('NC(=O)C1CCC(C(=O)O)CC1'), 'ácido 4-carbamoilciclohexano-1-carboxílico');
  // A benzene with a –COOH and another group is still a polysubstituted benzene.
  assert.equal(nameOf('OC(=O)C1=CC=C(C)C=C1'), 'CYCLE');
});

test('more than two –COOH or –CHO on one carbon piece: refused; on the ring or on other pieces: named', () => {
  const acids = named('OC(=O)CC(C(=O)O)C(C(=O)O)C1CCCCC1');
  assert.equal(acids.error.reason, 'manyAcids');
  assert.equal(acids.error.message, MANY_ACIDS_MESSAGE);
  assert.match(MANY_ACIDS_MESSAGE, /tricarboxílico/);
  const aldehydes = named('O=CCC(C=O)C(C=O)C1CCCCC1');
  assert.equal(aldehydes.error.reason, 'manyAldehydes');
  assert.equal(aldehydes.error.message, MANY_ALDEHYDES_MESSAGE);
  // Three groups on the ring are its suffix; two on a chain piece and one on the ring, the chain wins.
  assert.equal(nameOf('OC(=O)C1CC(C(=O)O)CC(C(=O)O)C1'), 'ácido ciclohexano-1,3,5-tricarboxílico');
  assert.equal(nameOf('OC(=O)CC(C(=O)O)C1CCC(C(=O)O)CC1'), 'ácido 2-(4-carboxiciclohexil)butanodioico');
  assert.equal(nameOf('OC(=O)COC(C(=O)O)C(=O)O'), 'ácido 2-(carboximetoxi)propanodioico');
  // Identical –CH₂COOH branches on a ring without a ring acid: multiplicative, refused (I-40a).
  assert.equal(nameOf('OC(=O)CC1CCC(CC(=O)O)CC1'), 'HETEROATOM symmetricRing');
  assert.equal(nameOf('OC(=O)C1CC(CC(=O)O)CC(CC(=O)O)C1'), 'ácido 3,5-bis(carboximetil)ciclohexano-1-carboxílico');
});

test('refusals and names never depend on atom ids or drawing order', () => {
  const random = seededRandom(97);
  const refusals = [
    'OC(=O)CC(C(=O)O)C(C(=O)O)C1CCCCC1', 'O=CCC(C=O)C(C=O)C1CCCCC1',
    'COC(=O)C1CCC(C(=O)O)CC1', 'OC(=O)CC1CCC(CC(=O)O)CC1',
  ];
  for (const smiles of refusals) {
    const reference = nameOf(smiles);
    assert.match(reference, /^HETEROATOM /, smiles);
    for (let k = 0; k < 8; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(`${result.error.code} ${result.error.reason}`, reference, smiles);
    }
  } // End of the loop over the refusals
  for (const [smiles] of NAMED) {
    const reference = named(smiles);
    for (let k = 0; k < 8; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(result.name, reference.name, smiles);
      assert.deepEqual(result.alternatives.map((a) => a.name), reference.alternatives.map((a) => a.name), smiles);
      assert.equal(englishName(result.structure), englishName(reference.structure), smiles);
    }
  } // End of the loop over the named molecules
});

test('ring or chain: a –COOH or –CHO bonded to the ring counts for the ring, never as a one-carbon chain', () => {
  const choice = (smiles) => {
    const mol = parseSmiles(smiles);
    return ringOrChain(mol, ringParent(mol));
  };
  const alone = choice('OC(=O)C1CCCCC1');
  assert.deepEqual([alone.chainParent, alone.ringCount, alone.chainCount, alone.offRing], [false, 1, 0, 0]);
  assert.equal(alone.step.candidatesBefore.length, 1, 'the –COOH carbon is not a chain candidate');
  const tie = choice('OC(=O)C1CCCCC1CC(=O)O');
  assert.deepEqual([tie.chainParent, tie.ringCount, tie.chainCount, tie.offRing], [false, 1, 1, 1]);
  const chain = choice('OC(=O)C(C(=O)O)C1CCC(C(=O)O)CC1');
  assert.deepEqual([chain.chainParent, chain.ringCount, chain.chainCount], [true, 1, 2]);
  assert.equal(choice('O=CC1CCCCC1').ringCount, 1);
  // Below an acid a ring –CHO is not principal: it counts for nothing (`formil`).
  assert.deepEqual([choice('OC(=O)CC1CCC(C=O)CC1').ringCount, choice('OC(=O)CC1CCC(C=O)CC1').chainParent], [0, true]);
  // No RINGCHAIN step without a principal group off the ring; one on a tie.
  assert.equal(named('OC(=O)C1CCCCC1').trace[0].rule, 'RING');
  assert.ok(!named('OC(=O)C1CCCCC1').trace.some((s) => s.rule === 'RINGCHAIN'));
  assert.deepEqual(named('OC(=O)C1CCCCC1CC(=O)O').trace.slice(0, 2).map((s) => s.rule), ['RINGCHAIN', 'RING']);
});

test('the suffix structure: the ring atom numbered, the group carbon outside the ring, highlighted with its group', () => {
  const result = named('OC(=O)C1CCCCC1C');
  const { suffix, parent } = result.structure;
  assert.equal(suffix.kind, 'acid');
  assert.equal(suffix.outside, true);
  const [site] = suffix.locants;
  assert.equal(site.locant, 1);
  assert.equal(site.atom, parent.atoms[0]);
  assert.ok(!parent.atoms.includes(site.carbon), 'the –COOH carbon is not a ring atom');
  const ending = result.parts.find((p) => p.text === 'carboxílico');
  assert.ok(ending.atoms.includes(site.carbon) && ending.atoms.includes(site.hydroxyAtom));
  assert.ok(ending.bonds.includes(site.carbonBond));
  // A chain acid keeps its plain suffix (no `outside`).
  assert.equal(named('OC(=O)CC1CCCCC1').structure.suffix.outside, undefined);
});

test('benzene: ácido benzoico and benzaldehído first, the systematic names and the -acético names as alternatives', () => {
  const benzoic = named('OC(=O)C1=CC=CC=C1');
  assert.deepEqual(benzoic.parts.map((p) => p.text), ['ácido', ' ', 'benz', 'oico']);
  assert.deepEqual(benzoic.alternatives.map((a) => [a.style, a.name]), [['benzeneSystematic', 'ácido bencenocarboxílico']]);
  assert.match(benzoic.alternatives[0].label, /la IUPAC \(2013\) prefiere el nombre tradicional/);
  assert.equal(renderName(benzoic.structure, lexiconEn, { systematic: true }).name, 'benzenecarboxylic acid');
  const benzaldehyde = named('O=CC1=CC=CC=C1');
  assert.deepEqual(benzaldehyde.alternatives.map((a) => a.name), ['bencenocarbaldehído']);
  assert.equal(renderName(benzaldehyde.structure, lexiconEn, { systematic: true }).name, 'benzenecarbaldehyde');
  for (const [smiles, traditional] of [['OC(=O)CC1=CC=CC=C1', 'ácido fenilacético'], ['O=CCC1=CC=CC=C1', 'fenilacetaldehído']]) {
    const result = named(smiles);
    assert.deepEqual(result.alternatives.map((a) => [a.style, a.name]), [['traditional', traditional]], smiles);
    assert.match(result.alternatives[0].label, /acepta/);
  }
  // Only the bare molecules: a substituent on the chain or a longer chain has no traditional name.
  assert.deepEqual(named('OC(=O)C(C)C1=CC=CC=C1').alternatives, []);
  assert.deepEqual(named('O=CCCC1=CC=CC=C1').alternatives, []);
  assert.deepEqual(named('OC(=O)C1CCCCC1').alternatives, []);
});

test('the ring acyl prefix: benzoil, (ciclohexanocarbonil), enclosure, multipliers, alphabetical order, styles', () => {
  const ring = named('CC(=O)C(C(=O)C1CCCCC1)C(C)=O').structure.prefixes.find((g) => g.substituent.ringCarbonyl).substituent;
  assert.equal(needsEnclosure(ring), true);
  assert.equal(isCompoundPrefix(ring), false);
  const benzoyl = named('OC(=O)C(CC)C(=O)C1=CC=CC=C1').structure.prefixes[0].substituent;
  assert.equal(benzoyl.ringCarbonyl, true);
  assert.equal(needsEnclosure(benzoyl), false);
  const substituted = named('CC(=O)C(C(=O)C1CCCCC1C)C(C)=O').structure.prefixes.find((g) => g.substituent.ringCarbonyl).substituent;
  assert.equal(isCompoundPrefix(substituted), true);
  assert.equal(nameOf('OC(=O)C(C(=O)C1C=CCCC1)CC'), 'ácido 2-(ciclohex-2-eno-1-carbonil)butanoico');
  // Alphabetised by the complete prefix: `benzoil` under b, `(2-metil…carbonil)` under m.
  assert.equal(nameOf('OC(=O)C(CC(C)C)C(=O)C1=CC=CC=C1'), 'ácido 2-benzoil-4-metilpentanoico');
  // Every style names the ring acids; isopropil only changes the prefix.
  assert.deepEqual(PREFIX_STYLES.map((style) => named('OC(=O)C1CCC(C(C)C)CC1', style).name), [
    'ácido 4-isopropilciclohexano-1-carboxílico',
    'ácido 4-(propan-2-il)ciclohexano-1-carboxílico',
    'ácido 4-(1-metiletil)ciclohexano-1-carboxílico',
  ]);
});

test('the formula counts the carbon outside the ring and every carboxi- prefix', () => {
  const counts = (smiles) => {
    const { carbons, hydrogens, oxygens } = atomCounts(named(smiles).structure);
    return [carbons, hydrogens, oxygens];
  };
  assert.deepEqual(counts('OC(=O)C1CCCCC1'), [7, 12, 2]);
  assert.deepEqual(counts('O=CC1=CC=CC=C1'), [7, 6, 1]);
  assert.deepEqual(counts('OC(=O)C1CCCCC1C(=O)O'), [8, 12, 4]);
  assert.deepEqual(counts('OC(=O)C1CCCCC1CC(=O)O'), [9, 14, 4]);
  assert.deepEqual(counts('OC(=O)C(C(=O)O)C1CCC(C(=O)O)CC1'), [10, 14, 6]);
  assert.deepEqual(counts('OC(=O)C(CC)C(=O)C1=CC=CC=C1'), [11, 12, 3]);
  assert.deepEqual(counts('OC(=O)COCCC(=O)O'), [5, 8, 5]);
});

test('the explanation: the carbon outside the ring, -carboxílico, benzoico, carboxi-, ring acyl prefixes', () => {
  const group = stepText('OC(=O)C1CCCCC1', 'group');
  assert.match(group, /El –COOH está unido directamente a un carbono del anillo\. Su carbono no forma parte del anillo/);
  assert.match(group, /termina con el sufijo «-carboxílico».*ya incluye el carbono del –COOH/);
  assert.doesNotMatch(group, /siempre está en un extremo de la cadena/);
  assert.match(stepText('OC(=O)C1CCCCC1', 'count'), /7 carbonos, 12 hidrógenos/);
  assert.match(stepText('OC(=O)C1CCCCC1', 'ring'), /El grupo –COOH unido al anillo no forma parte de él: ni su carbono ni sus oxígenos/);
  assert.match(stepText('O=CC1CCCCC1', 'ring'), /ni su carbono ni su oxígeno se cuentan/);
  assert.doesNotMatch(stepText('OC(=O)C1CCCCC1', 'ring'), /«-ol»/);
  assert.match(stepText('OC(=O)C1CCCCC1', 'ringNumbering'), /el carbono del anillo unido al –COOH es siempre el 1, así que el número no se escribe/);
  assert.match(stepText('OC(=O)C1CCCCC1C', 'ringNumbering'), /El carbono del anillo unido al grupo –COOH es el 1, y aquí ese 1 se escribe/);
  assert.match(stepText('OC(=O)C1CCCCC1C(=O)O', 'ringNumbering'), /Con varios grupos –COOH en el anillo se escriben los números/);
  const assemble = stepText('OC(=O)C1CCCCC1C', 'assemble');
  assert.match(assemble, /«-carboxílico», con el número del carbono del anillo unido al grupo justo delante/);
  assert.match(assemble, /El carbono del –COOH no tiene número: no es del anillo/);
  assert.doesNotMatch(assemble, /su carbono siempre es el 1/);
  assert.match(stepText('OC(=O)C1CCCCC1C(=O)O', 'assemble'), /Los carbonos de los –COOH no tienen número.*«-dicarboxílico» ya los incluye/);
  // Benzene: the retained names.
  assert.match(stepText('OC(=O)C1=CC=CC=C1', 'benzene'), /Un benceno con un grupo –COOH tiene nombre propio: «ácido benzoico»/);
  assert.doesNotMatch(stepText('OC(=O)C1=CC=CC=C1', 'benzene'), /fenol/);
  assert.match(stepText('OC(=O)C1=CC=CC=C1', 'group'), /«ácido bencenocarboxílico»/);
  assert.match(stepText('O=CC1=CC=CC=C1', 'assemble'), /«benz» es el anillo y «-aldehído», el grupo –CHO/);
  // Other groups on the ring: the seniority follows the acid, a ring C=O is a ketone.
  assert.match(stepText('OC(=O)C1CCC(O)CC1', 'ring'), /el ácido carboxílico va antes que el alcohol/);
  assert.match(stepText('OC(=O)C1CCC(=O)CC1', 'ring'), /Ese C=O \(una cetona\) no es el grupo principal \(el ácido carboxílico va antes que la cetona\)/);
  assert.match(stepText('OC(=O)C1CCC(=O)CC1', 'substituents'), /\(el C=O de una cetona\)/);
  assert.match(stepText('OC(=O)C1CCC(C=O)CC1', 'group'), /un grupo –CHO cuyo carbono no está en el anillo/);
  assert.match(stepText('OC(=O)C1CCC(C=O)CC1', 'substituents'), /cuyo carbono no está en el anillo: se une al anillo/);
  // Ring or chain: the ring's own –COOH counts for it; a tie keeps the ring; the other –COOH is carboxi-.
  const ringChain = stepText('OC(=O)C1CCCCC1CC(=O)O', 'ringChain');
  assert.match(ringChain, /El –COOH unido directamente al anillo cuenta como grupo del anillo/);
  assert.match(ringChain, /hay empate, así que manda el anillo/);
  assert.match(ringChain, /el grupo –COOH de la rama se nombra con el prefijo «carboxi-»/);
  assert.match(stepText('OC(=O)C1CCCCC1CC(=O)O', 'group'), /Otro grupo –COOH no está en el anillo: ese no va en el sufijo, sino delante, con el prefijo «carboxi-»/);
  assert.match(stepText('OC(=O)C1CCCCC1CC(=O)O', 'substituents'), /Es una rama con un grupo –COOH/);
  assert.match(stepText('OC(=O)C(C(=O)O)C1CCC(C(=O)O)CC1', 'ringChain'), /El anillo lleva un grupo –COOH y la mejor cadena abierta lleva 2 grupos –COOH: gana la cadena/);
  assert.match(stepText('OC(=O)C(C(=O)O)C1CCC(C(=O)O)CC1', 'substituents'), /Un grupo –COOH unido al anillo, y no a la cadena principal, no va en el sufijo: se nombra con el prefijo «carboxi-»/);
  // A –CHO at the end of a branch is an aldehyde, never «una cetona».
  const branch = stepText('O=CC1CCCCC1CC=O', 'group');
  assert.match(branch, /Otro grupo –CHO está al final de una rama, no unido directamente al anillo/);
  assert.doesNotMatch(branch, /cetona/);
  assert.doesNotMatch(stepText('O=CCOCCC=O', 'group'), /cetona/);
  // Ring acyl prefixes.
  const benzoyl = stepText('OC(=O)C(CC)C(=O)C1=CC=CC=C1', 'substituents');
  assert.match(benzoyl, /«benzoil» es el prefijo de un grupo acilo: un C=O unido a la cadena principal por su carbono y, por el otro lado, a un anillo de benceno/);
  assert.match(benzoyl, /«ácido benzoico», cambiando «-oico» por «-oil»/);
  assert.doesNotMatch(benzoyl, /grupo –CHO \(un aldehído\)/);
  const carbonyl = stepText('CC(=O)C(C(=O)C1CCCCC1C)C(C)=O', 'substituents');
  assert.match(carbonyl, /o en «-carbonil» si su C=O está unido a un anillo/);
  assert.match(carbonyl, /del «ácido 2-metilciclohexano-1-carboxílico» sale «2-metilciclohexano-1-carbonil»/);
  assert.match(carbonyl, /Es una cetona, como el grupo principal, pero su carbono no está en la cadena principal/);
});

test('review I-40b: a C=O between the chain end and a ring is a ketone, never «un grupo –CHO en el otro extremo»', () => {
  for (const [smiles, name] of [
    ['OC(=O)CCCC(=O)C1=CC=CC=C1', 'ácido 5-fenil-5-oxopentanoico'],
    ['OC(=O)CCCC(=O)C1CCCCC1', 'ácido 5-ciclohexil-5-oxopentanoico'],
    ['OC(=O)C(=O)C1=CC=CC=C1', 'ácido 2-fenil-2-oxoetanoico'],
  ]) {
    assert.equal(nameOf(smiles), name, smiles);
    const group = stepText(smiles, 'group');
    assert.match(group, /También tiene un grupo C=O entre dos carbonos \(una cetona\)/, smiles);
    assert.doesNotMatch(group, /–CHO|aldehído\)/, smiles);
    // Scrambled atom order gives the same wording.
    const random = seededRandom(11);
    for (let k = 0; k < 4; k += 1) {
      const text = explain(nameMolecule(scrambleMolecule(parseSmiles(smiles), random))).find((st) => st.id === 'group').text.map(plainText).join(' ');
      assert.equal(text, group, smiles);
    }
  } // End of the loop over the ring ketones
  // A true aldehyde at the other end, for contrast (also with a branch beside it).
  for (const smiles of ['OC(=O)CCCC=O', 'OC(=O)CCC(C)C=O']) {
    assert.match(stepText(smiles, 'group'), /También tiene un grupo –CHO en el otro extremo \(un aldehído\)/, smiles);
  }
});

test('Ordenar dibujo lays out ring acids, aldehydes and ring acyl prefixes', () => {
  for (const [smiles] of NAMED) {
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
});

test('the seeded ring-acid generator: deterministic, distinct, valid, varied', () => {
  const molecules = generateRingAcids({ count: 80, seed: 3 });
  assert.equal(molecules.length, 80);
  assert.deepEqual(generateRingAcids({ count: 80, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.equal(new Set(molecules.map(canonicalKey)).size, 80, 'distinct');
  const results = molecules.map((mol) => {
    assert.equal(validateForNaming(mol), null, writeSmiles(mol));
    return nameMolecule(mol);
  });
  assert.ok(results.every((r) => r.ok));
  assert.ok(results.some((r) => /carboxílico$/.test(r.name)), 'some ring acids');
  assert.ok(results.some((r) => /carbaldehído$/.test(r.name)), 'some ring aldehydes');
  assert.ok(results.some((r) => r.structure.parentKind === 'chain' && r.structure.suffix.kind === 'acid'), 'some chain acids with a ring');
  assert.ok(results.some((r) => /benzoil|carbonil/.test(r.name)), 'some ring acyl prefixes');
  assert.ok(results.some((r) => /benzoico|benzaldehído/.test(r.name)), 'some benzoic acid or benzaldehyde');
});
