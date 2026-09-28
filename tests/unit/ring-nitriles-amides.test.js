/**
 * @file Unit tests for nitriles and amides with a ring (design.md §13.4
 * I-40c): a –C≡N or an amide bonded to a ring carbon is the ring's group,
 * cited with a suffix whose carbon is outside the ring
 * (`ciclohexanocarbonitrilo`, `ciclohexanocarboxamida`,
 * `ciclohexano-1,2-dicarbonitrilo`), the retained `benzonitrilo` /
 * `benzamida` on benzene (the systematic `bencenocarbonitrilo` /
 * `bencenocarboxamida` as alternatives); the groups on the amide N take
 * the locant N (`N-metilbenzamida`, `N-metilciclohexanocarboxamida`); a
 * ring on an amide N is an N prefix (`N-feniletanamida` with
 * `N-fenilacetamida`, `N-ciclohexiletanamida`); on a side chain the chain
 * is the parent and the ring a prefix (`2-feniletanonitrilo` with
 * `fenilacetonitrilo`, `3-ciclohexilpropanamida`); below an acid the ring
 * groups are `ciano-` / `carbamoil-` (`ácido
 * 4-cianociclohexano-1-carboxílico`). Covers the lifted refusals
 * (`ringNitrile`, `ringAmide`), the ones that stay
 * (`substitutedPolyamide` on a ring, a polysubstituted benzene), the
 * ring-or-chain count, both lexicons, the explanation, atom-order
 * invariance (refusals included), Ordenar dibujo and the oracle generator.
 * The names are also checked row by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { canonicalKey } from '../../src/model/graph.js';
import { validateForNaming, SUBSTITUTED_POLYAMIDE_MESSAGE } from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { ringOrChain } from '../../src/naming/parent.js';
import { ringParent } from '../../src/naming/rings.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { N_LOCANT } from '../../src/naming/structure.js';
import { renderName } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateRingNitrilesAmides } from '../../scripts/oracle/generate.mjs';
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

/** Molecules named since I-40c, with their Spanish and English names. */
const NAMED = [
  // Suffixes on the ring.
  ['N#CC1CCCCC1', 'ciclohexanocarbonitrilo', 'cyclohexanecarbonitrile'],
  ['N#CC1=CC=CC=C1', 'benzonitrilo', 'benzonitrile'],
  ['NC(=O)C1CCCCC1', 'ciclohexanocarboxamida', 'cyclohexanecarboxamide'],
  ['NC(=O)C1=CC=CC=C1', 'benzamida', 'benzamide'],
  ['N#CC1CCCCC1C', '2-metilciclohexano-1-carbonitrilo', '2-methylcyclohexane-1-carbonitrile'],
  ['N#CC1C=CCCC1', 'ciclohex-2-eno-1-carbonitrilo', 'cyclohex-2-ene-1-carbonitrile'],
  ['NC(=O)C1CCC(Cl)CC1', '4-clorociclohexano-1-carboxamida', '4-chlorocyclohexane-1-carboxamide'],
  ['N#CC1CCCCC1C#N', 'ciclohexano-1,2-dicarbonitrilo', 'cyclohexane-1,2-dicarbonitrile'],
  ['NC(=O)C1CCC(C(N)=O)CC1', 'ciclohexano-1,4-dicarboxamida', 'cyclohexane-1,4-dicarboxamide'],
  ['N#CC1CC(C#N)CC(C#N)C1', 'ciclohexano-1,3,5-tricarbonitrilo', 'cyclohexane-1,3,5-tricarbonitrile'],
  // Groups on the amide N of a ring amide.
  ['CNC(=O)C1CCCCC1', 'N-metilciclohexanocarboxamida', 'N-methylcyclohexanecarboxamide'],
  ['CNC(=O)C1=CC=CC=C1', 'N-metilbenzamida', 'N-methylbenzamide'],
  ['CN(C)C(=O)C1=CC=CC=C1', 'N,N-dimetilbenzamida', 'N,N-dimethylbenzamide'],
  ['CCNC(=O)C1CCCCC1C', 'N-etil-2-metilciclohexano-1-carboxamida', 'N-ethyl-2-methylcyclohexane-1-carboxamide'],
  ['OCCNC(=O)C1CCCCC1', 'N-(2-hidroxietil)ciclohexanocarboxamida', 'N-(2-hydroxyethyl)cyclohexanecarboxamide'],
  // A ring on the amide N.
  ['CC(=O)NC1=CC=CC=C1', 'N-feniletanamida', 'N-phenylethanamide'],
  ['CC(=O)NC1CCCCC1', 'N-ciclohexiletanamida', 'N-cyclohexylethanamide'],
  ['CCC(=O)NC1=CC=CC=C1', 'N-fenilpropanamida', 'N-phenylpropanamide'],
  ['CC(=O)N(C)C1=CC=CC=C1', 'N-fenil-N-metiletanamida', 'N-phenyl-N-methylethanamide'],
  // The group on a chain beside a ring.
  ['N#CCC1=CC=CC=C1', '2-feniletanonitrilo', '2-phenylethanenitrile'],
  ['N#CCC1CCCCC1', '2-ciclohexiletanonitrilo', '2-cyclohexylethanenitrile'],
  ['NC(=O)CC1=CC=CC=C1', '2-feniletanamida', '2-phenylethanamide'],
  ['NC(=O)CCC1CCCCC1', '3-ciclohexilpropanamida', '3-cyclohexylpropanamide'],
  ['CNC(=O)CC1=CC=CC=C1', '2-fenil-N-metiletanamida', '2-phenyl-N-methylethanamide'],
  ['N#CCC1CCC(C#N)CC1', '4-(cianometil)ciclohexano-1-carbonitrilo', '4-(cyanomethyl)cyclohexane-1-carbonitrile'],
  // Prefix forms beside a senior group.
  ['OC(=O)C1CCC(C#N)CC1', 'ácido 4-cianociclohexano-1-carboxílico', '4-cyanocyclohexane-1-carboxylic acid'],
  ['OC(=O)C1CCC(C(N)=O)CC1', 'ácido 4-carbamoilciclohexano-1-carboxílico', '4-carbamoylcyclohexane-1-carboxylic acid'],
  ['OC(=O)C1CCC(C(=O)NC)CC1', 'ácido 4-(metilcarbamoil)ciclohexano-1-carboxílico', '4-(methylcarbamoyl)cyclohexane-1-carboxylic acid'],
  ['OC(=O)C1CCC(NC(C)=O)CC1', 'ácido 4-(acetilamino)ciclohexano-1-carboxílico', '4-(acetylamino)cyclohexane-1-carboxylic acid'],
  ['NC(=O)C1CCC(C#N)CC1', '4-cianociclohexano-1-carboxamida', '4-cyanocyclohexane-1-carboxamide'],
  ['OC(=O)C(C(=O)O)C1CCC(C#N)CC1', 'ácido 2-(4-cianociclohexil)propanodioico', '2-(4-cyanocyclohexyl)propanedioic acid'],
  ['NC(=O)CC(C(N)=O)C1CCC(C(N)=O)CC1', '2-(4-carbamoilciclohexil)butanodiamida', '2-(4-carbamoylcyclohexyl)butanediamide'],
  ['OC(=O)CNC(=O)C1=CC=CC=C1', 'ácido 2-(benzoilamino)etanoico', '2-(benzoylamino)ethanoic acid'],
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

test('the ring refusals of I-40c are lifted; N-substituted ring diamides and polysubstituted benzenes stay refused', () => {
  for (const smiles of ['N#CC1CCCCC1', 'NC(=O)C1CCCCC1', 'CC(=O)NC1=CC=CC=C1', 'N#CCC1=CC=CC=C1', 'NC(=O)C1CCC(C(=O)O)CC1']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  for (const [smiles, reason, message] of [
    // Two amides on the ring with a group on some N: N¹/N⁴ locants.
    ['CNC(=O)C1CCC(C(N)=O)CC1', 'substitutedPolyamide', SUBSTITUTED_POLYAMIDE_MESSAGE],
    ['CNC(=O)C1CCCCC1C(=O)NC', 'substitutedPolyamide', SUBSTITUTED_POLYAMIDE_MESSAGE],
  ]) {
    const result = named(smiles);
    assert.equal(`${result.error.code} ${result.error.reason}`, `HETEROATOM ${reason}`, smiles);
    assert.equal(result.error.message, message, smiles);
    assert.ok(result.groups, `${smiles}: the refusal carries the group analysis`);
  }
  // A ring diamide without groups on its N is named, and so is one amide on the ring beside a chain diamide.
  assert.equal(nameOf('NC(=O)C1CCCCC1C(N)=O'), 'ciclohexano-1,2-dicarboxamida');
  // A benzene with the group and another substituent is still a polysubstituted benzene.
  for (const smiles of ['N#CC1=CC=C(C)C=C1', 'NC(=O)C1=CC=CC=C1C', 'N#CCC1=CC=CC=C1C#N']) {
    assert.equal(nameOf(smiles), 'CYCLE', smiles);
  }
  // Three nitriles or amides on one chain piece are still refused; on the ring they are named.
  assert.equal(nameOf('N#CCC(C#N)CC#N'), 'HETEROATOM manyNitriles');
  assert.equal(nameOf('N#CCC(C#N)(CC#N)C1CCCCC1'), 'HETEROATOM manyNitriles');
});

test('refusals and names never depend on atom ids or drawing order', () => {
  const random = seededRandom(131);
  const refusals = ['CNC(=O)C1CCC(C(N)=O)CC1', 'N#CC1CCC(C(=O)OC)C(CC(=O)OC)C1', 'N#CCC(C#N)(CC#N)C1CCCCC1'];
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

test('ring or chain: a –C≡N or amide bonded to the ring counts for the ring; a ring on the amide N counts for nothing', () => {
  const choice = (smiles) => {
    const mol = parseSmiles(smiles);
    return ringOrChain(mol, ringParent(mol));
  };
  const alone = choice('N#CC1CCCCC1');
  assert.deepEqual([alone.chainParent, alone.ringCount, alone.chainCount, alone.offRing], [false, 1, 0, 0]);
  assert.equal(alone.step.candidatesBefore.length, 1, 'the –C≡N carbon is not a chain candidate');
  const amide = choice('NC(=O)C1CCCCC1');
  assert.deepEqual([amide.chainParent, amide.ringCount, amide.chainCount], [false, 1, 0]);
  const tie = choice('N#CCC1CCC(C#N)CC1');
  assert.deepEqual([tie.chainParent, tie.ringCount, tie.chainCount, tie.offRing], [false, 1, 1, 1]);
  const onNitrogen = choice('CC(=O)NC1=CC=CC=C1');
  assert.deepEqual([onNitrogen.chainParent, onNitrogen.ringCount, onNitrogen.chainCount], [true, 0, 1]);
  const chain = choice('NC(=O)CC(C(N)=O)C1CCC(C(N)=O)CC1');
  assert.deepEqual([chain.chainParent, chain.ringCount, chain.chainCount], [true, 1, 2]);
  // Below an acid a ring –C≡N is not principal: it counts for nothing (`ciano`).
  assert.equal(choice('OC(=O)CC1CCC(C#N)CC1').ringCount, 0);
});

test('the suffix structure: the ring atom numbered, the group carbon outside the ring, highlighted with its group and N', () => {
  const result = named('CNC(=O)C1CCCCC1C');
  const { suffix, parent, prefixes } = result.structure;
  assert.equal(suffix.kind, 'amide');
  assert.equal(suffix.outside, true);
  const [site] = suffix.locants;
  assert.equal(site.locant, 1);
  assert.equal(site.atom, parent.atoms[0]);
  assert.ok(!parent.atoms.includes(site.carbon), 'the amide carbon is not a ring atom');
  const ending = result.parts.find((p) => p.text === 'carboxamida');
  assert.ok(ending.atoms.includes(site.carbon) && ending.atoms.includes(site.amideNitrogen));
  assert.ok(ending.bonds.includes(site.carbonBond));
  // The N-methyl is an N prefix on the amide N outside the ring.
  const methyl = prefixes.find((g) => g.locants.some((l) => l.locant === N_LOCANT));
  assert.ok(methyl, 'an N prefix');
  assert.equal(methyl.locants[0].atom, site.amideNitrogen);
  const nitrile = named('N#CC1CCCCC1').structure.suffix;
  assert.equal(nitrile.outside, true);
  assert.equal(nitrile.locants[0].carbon !== undefined, true);
  // A chain nitrile keeps its plain suffix (no `outside`).
  assert.equal(named('N#CCC1CCCCC1').structure.suffix.outside, undefined);
});

test('benzene: benzonitrilo and benzamida first, the systematic names and the -acet- names as alternatives', () => {
  const benzonitrile = named('N#CC1=CC=CC=C1');
  assert.deepEqual(benzonitrile.parts.map((p) => p.text), ['benz', 'onitrilo']);
  assert.deepEqual(benzonitrile.alternatives.map((a) => [a.style, a.name]), [['benzeneSystematic', 'bencenocarbonitrilo']]);
  assert.match(benzonitrile.alternatives[0].label, /la IUPAC \(2013\) prefiere el nombre tradicional/);
  assert.equal(renderName(benzonitrile.structure, lexiconEn, { systematic: true }).name, 'benzenecarbonitrile');
  const benzamide = named('CNC(=O)C1=CC=CC=C1');
  assert.deepEqual(benzamide.parts.map((p) => p.text), ['N', '-', 'metil', 'benz', 'amida']);
  assert.deepEqual(benzamide.alternatives.map((a) => [a.style, a.name]), [['benzeneSystematic', 'N-metilbencenocarboxamida']],
    'no «tolueno»: the methyl is on the N');
  assert.equal(renderName(benzamide.structure, lexiconEn, { systematic: true }).name, 'N-methylbenzenecarboxamide');
  for (const [smiles, traditional, label] of [
    ['N#CCC1=CC=CC=C1', 'fenilacetonitrilo', /acepta/],
    ['NC(=O)CC1=CC=CC=C1', '2-fenilacetamida', /acepta/],
    ['CC(=O)NC1=CC=CC=C1', 'N-fenilacetamida', /conserva como preferido/],
    ['CC(=O)NC1CCCCC1', 'N-ciclohexilacetamida', /conserva como preferido/],
  ]) {
    const result = named(smiles);
    assert.deepEqual(result.alternatives.map((a) => [a.style, a.name]), [['traditional', traditional]], smiles);
    assert.match(result.alternatives[0].label, label, smiles);
  }
  // Only the bare molecules: a substituted or longer chain has no traditional name; a ring amide never has one.
  for (const smiles of ['N#CC(C)C1=CC=CC=C1', 'N#CCCC1=CC=CC=C1', 'CNC(=O)CC1=CC=CC=C1', 'CCC(=O)NC1=CC=CC=C1', 'NC(=O)C1CCCCC1']) {
    assert.deepEqual(named(smiles).alternatives, [], smiles);
  }
});

test('prefix styles and the formula: the carbon outside the ring and the N are counted', () => {
  assert.deepEqual(PREFIX_STYLES.map((style) => named('N#CC1CCC(C(C)C)CC1', style).name), [
    '4-isopropilciclohexano-1-carbonitrilo',
    '4-(propan-2-il)ciclohexano-1-carbonitrilo',
    '4-(1-metiletil)ciclohexano-1-carbonitrilo',
  ]);
  const counts = (smiles) => {
    const { carbons, hydrogens, nitrogens, oxygens } = atomCounts(named(smiles).structure);
    return [carbons, hydrogens, nitrogens, oxygens];
  };
  assert.deepEqual(counts('N#CC1CCCCC1'), [7, 11, 1, 0]);
  assert.deepEqual(counts('NC(=O)C1=CC=CC=C1'), [7, 7, 1, 1]);
  assert.deepEqual(counts('CN(C)C(=O)C1=CC=CC=C1'), [9, 11, 1, 1]);
  assert.deepEqual(counts('CC(=O)NC1=CC=CC=C1'), [8, 9, 1, 1]);
  assert.deepEqual(counts('N#CC1CCCCC1C#N'), [8, 10, 2, 0]);
  assert.deepEqual(counts('OC(=O)C1CCC(C(N)=O)CC1'), [8, 13, 1, 3]);
});

test('the explanation: the carbon outside the ring, -carbonitrilo, -carboxamida, benzamida, N groups, ciano- and carbamoil- on a ring', () => {
  const group = stepText('N#CC1CCCCC1', 'group');
  assert.match(group, /El –C≡N está unido directamente a un carbono del anillo\. Su carbono no forma parte del anillo/);
  assert.match(group, /termina con el sufijo «-carbonitrilo».*ya incluye el carbono del –C≡N/);
  assert.doesNotMatch(group, /siempre está en un extremo de la cadena|siempre es el carbono 1/);
  assert.match(stepText('N#CC1CCCCC1', 'ring'), /ni su carbono ni su nitrógeno se cuentan en el anillo/);
  assert.match(stepText('NC(=O)C1CCCCC1', 'ring'), /ni su carbono ni su oxígeno ni su nitrógeno se cuentan en el anillo/);
  assert.match(stepText('NC(=O)C1CCCCC1', 'group'), /El grupo amida está unido directamente a un carbono del anillo/);
  assert.match(stepText('N#CC1CCCCC1', 'ringNumbering'), /el carbono del anillo unido al –C≡N es siempre el 1, así que el número no se escribe/);
  const assemble = stepText('N#CC1CCCCC1C', 'assemble');
  assert.match(assemble, /«-carbonitrilo», con el número del carbono del anillo unido al grupo justo delante/);
  assert.match(assemble, /El carbono del –C≡N no tiene número: no es del anillo/);
  assert.doesNotMatch(assemble, /su carbono siempre es el 1/);
  assert.match(stepText('NC(=O)C1CCC(C(N)=O)CC1', 'assemble'), /Los carbonos de los grupos amida no tienen número.*«-dicarboxamida» ya los incluye/);
  assert.match(stepText('NC(=O)C1CCCCC1', 'assemble'), /El carbono de la amida no tiene número/);
  // Groups on the N of a ring amide.
  const nGroup = stepText('CN(C)C(=O)C1CCCCC1', 'group');
  assert.match(nGroup, /no forman parte del anillo \(el nitrógeno está fuera de él\).*con la letra «N»/);
  // Benzene: the retained names, the N groups kept apart.
  const benzene = stepText('CNC(=O)C1=CC=CC=C1', 'benzene');
  assert.match(benzene, /Un benceno con un grupo amida tiene nombre propio: «benzamida»/);
  assert.match(benzene, /El anillo sigue teniendo un solo sustituyente, el grupo amida/);
  assert.match(benzene, /Con un solo grupo amida no hace falta numerar/);
  assert.match(stepText('CNC(=O)C1=CC=CC=C1', 'group'), /«benzamida», que la IUPAC \(2013\) conserva como preferido.*«bencenocarboxamida»/);
  assert.match(stepText('CNC(=O)C1=CC=CC=C1', 'assemble'), /tiene nombre propio: «benzamida»\. No lleva números: «benz» es el anillo y «-amida», el grupo amida/);
  assert.match(stepText('N#CC1=CC=CC=C1', 'assemble'), /«benz» es el anillo y «-onitrilo», el grupo –C≡N/);
  // A ring on the amide N: the chain wins, the ring is an N prefix.
  assert.match(stepText('CC(=O)NC1=CC=CC=C1', 'ringChain'), /El anillo no lleva ningún grupo amida y la mejor cadena abierta lleva un grupo amida: gana la cadena/);
  assert.match(stepText('CC(=O)NC1=CC=CC=C1', 'substituents'), /En el nitrógeno hay un grupo fenilo: se escribe «N-fenil»/);
  assert.match(stepText('CC(=O)NC1=CC=CC=C1', 'group'), /La IUPAC \(2013\) conserva también el nombre tradicional «N-fenilacetamida»/);
  assert.match(stepText('N#CCC1=CC=CC=C1', 'group'), /La IUPAC \(2013\) acepta también el nombre tradicional «fenilacetonitrilo»/);
  // A –C≡N on a branch of a ring parent.
  const branch = stepText('N#CCC1CCC(C#N)CC1', 'group');
  assert.match(branch, /Otro –C≡N no está unido directamente al anillo, sino al final de una rama/);
  assert.match(branch, /no se cuenta en el anillo ni en ninguna rama/);
  assert.match(stepText('N#CCC1CCC(C#N)CC1', 'ringChain'), /hay empate, así que manda el anillo/);
  // ciano- and carbamoil- on a ring below an acid.
  assert.match(stepText('OC(=O)C1CCC(C#N)CC1', 'group'), /El prefijo «ciano-» incluye el carbono del –C≡N: ese carbono no se cuenta en el anillo ni se numera/);
  const carbamoyl = stepText('OC(=O)C1CCC(C(N)=O)CC1', 'group');
  assert.match(carbamoyl, /La amida tiene su carbono fuera del anillo: la amida está unida al anillo por ese carbono/);
  assert.doesNotMatch(carbamoyl, /fuera de la cadena principal|unida a la cadena/);
  assert.match(stepText('OC(=O)C1CCC(C(N)=O)CC1', 'substituents'), /Ese carbono no es del anillo, así que el prefijo lo incluye/);
  assert.match(stepText('OC(=O)C1CCC(NC(C)=O)CC1', 'group'), /La amida está unida al anillo por su nitrógeno/);
  // No placeholder text anywhere.
  for (const [smiles] of NAMED) {
    const text = explain(named(smiles)).flatMap((s) => s.text.map(plainText)).join(' ');
    assert.doesNotMatch(text, /undefined|NaN|null|\[\[/, smiles);
  }
});

test('review I-40c: the explanation cites each amide prefix in the form the name uses', () => {
  // N on the ring: acilamino, in every step.
  const nitrogen = 'NC(=O)C1CCC(NC(C)=O)CC1';
  assert.equal(nameOf(nitrogen), '4-(acetilamino)ciclohexano-1-carboxamida');
  const ringChain = stepText(nitrogen, 'ringChain');
  assert.match(ringChain, /unida al anillo por su nitrógeno, se nombra con el prefijo «acilamino-» \(aquí, «acetilamino»\)/);
  assert.doesNotMatch(ringChain, /carbamoil/);
  const group = stepText(nitrogen, 'group');
  assert.match(group, /otro grupo amida, que no está unido directamente al anillo/);
  assert.match(group, /La amida está unida al anillo por su nitrógeno/);
  assert.doesNotMatch(group, /carbamoil|separadas por un nitrógeno o un oxígeno/);
  assert.match(stepText(nitrogen, 'substituents'), /su carbono no está unido directamente al anillo, así que no puede ir en el sufijo «-carboxamida»/);
  // The amide carbon inside a branch whose chain reaches it: amino + oxo in the branch.
  const aminoOxo = 'NC(=O)C1CCC(CC(N)=O)CC1';
  assert.equal(nameOf(aminoOxo), '4-(2-amino-2-oxoetil)ciclohexano-1-carboxamida');
  const branch = stepText(aminoOxo, 'ringChain');
  assert.match(branch, /con los prefijos «amino-» y «oxo-» en el carbono de la amida \(aquí, «2-amino-2-oxoetil»\)/);
  assert.doesNotMatch(branch, /carbamoil/);
  // The C=O carbon on the ring below a chain with more amides: carbamoil on the ring prefix.
  const carbonyl = 'NC(=O)CC(C(N)=O)C1CCC(C(N)=O)CC1';
  assert.equal(nameOf(carbonyl), '2-(4-carbamoilciclohexil)butanodiamida');
  assert.match(stepText(carbonyl, 'ringChain'), /se nombra «4-carbamoilciclohexil»/);
  const chainGroup = stepText(carbonyl, 'group');
  assert.match(chainGroup, /la cadena principal no puede incluir carbonos del anillo/);
  assert.doesNotMatch(chainGroup, /separadas por un nitrógeno o un oxígeno/);
  // Every explained prefix appears in the rendered name.
  for (const smiles of [nitrogen, aminoOxo, carbonyl, 'NC(=O)CC1CCC(NC(C)=O)CC1']) {
    const { name } = named(smiles);
    const cited = [...stepText(smiles, 'ringChain').matchAll(/aquí, «([^»]+)»/g)].map((m) => m[1]);
    cited.forEach((prefix) => assert.ok(name.includes(prefix), `${smiles}: ${prefix} in ${name}`));
  }
});

test('Ordenar dibujo lays out ring nitriles and amides', () => {
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

test('the seeded ring nitrile and amide generator: deterministic, distinct, valid, varied, well explained', () => {
  const molecules = generateRingNitrilesAmides({ count: 80, seed: 3 });
  assert.equal(molecules.length, 80);
  assert.deepEqual(generateRingNitrilesAmides({ count: 80, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.equal(new Set(molecules.map(canonicalKey)).size, 80, 'distinct');
  const results = molecules.map((mol) => {
    assert.equal(validateForNaming(mol), null, writeSmiles(mol));
    return nameMolecule(mol);
  });
  assert.ok(results.every((r) => r.ok));
  assert.ok(results.some((r) => /carbonitrilo$/.test(r.name)), 'some ring nitriles');
  assert.ok(results.some((r) => /carboxamida$/.test(r.name)), 'some ring amides');
  assert.ok(results.some((r) => r.structure.parentKind === 'chain' && ['amide', 'nitrile'].includes(r.structure.suffix.kind)),
    'some chain nitriles or amides with a ring');
  assert.ok(results.some((r) => /N-(fenil|ciclo)/.test(r.name)), 'some rings on an amide N');
  assert.ok(results.some((r) => /ciano|carbamoil/.test(r.name) && r.structure.suffix.kind === 'acid'), 'some prefix forms below an acid');
  for (const result of results) {
    const text = explain(result).flatMap((s) => s.text.map(plainText)).join(' ');
    assert.doesNotMatch(text, /undefined|NaN|null|\[\[/, result.name);
  }
});
