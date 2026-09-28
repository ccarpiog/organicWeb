/**
 * @file Unit tests for esters with a ring (design.md §13.4 I-40d): an
 * ester –COO– whose C=O carbon is bonded to a ring carbon is the ring's
 * group, cited `-carboxilato` (`ciclohexanocarboxilato de etilo`,
 * `ciclohexano-1,4-dicarboxilato de dimetilo`), with the retained
 * `benzoato` on benzene (`bencenocarboxilato` as an alternative); a ring on
 * the O side is the O-bound group, a ring group ending in `-ilo`
 * (`etanoato de fenilo` with `acetato de fenilo`, `etanoato de
 * 2-metilciclohexilo`); a ring on each side (`benzoato de fenilo`, the only
 * two-ring molecules named); a ring on a side chain of the acid part is a
 * prefix (`2-feniletanoato de metilo` with `fenilacetato de metilo`);
 * below an acid the ring esters are `alcoxicarbonil-` / `aciloxi-`
 * (`ácido 4-(metoxicarbonil)ciclohexano-1-carboxílico`). Covers the retired
 * `ringEster` refusal, the refusals that stay (lactones, mixed ring
 * diesters, three esters, a ring ester beside a chain ester, polysubstituted
 * benzenes, two rings beside an acid), both lexicons, the explanation, the
 * two-ring canonical key, atom-order invariance (refusals included),
 * Ordenar dibujo and the oracle generator. The names are also checked row
 * by row in tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { canonicalKey, ringAtomsOf, adjacency } from '../../src/model/graph.js';
import {
  validateForNaming, esterRingSplit, LACTONE_MESSAGE, MIXED_RING_DIESTER_MESSAGE, ESTER_PREFIX_MESSAGE, MANY_ESTERS_MESSAGE,
  RING_SYSTEM_MESSAGES,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { ringOrChain } from '../../src/naming/parent.js';
import { ringParent } from '../../src/naming/rings.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { renderName } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { englishName, kekuleKeys, compareWithOpsin } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateRingEsters } from '../../scripts/oracle/generate.mjs';
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
  return result.ok ? result.name : `${result.error.code} ${result.error.reason || result.error.ringReason || ''}`.trim();
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

/** Molecules named since I-40d, with their Spanish and English names. */
const NAMED = [
  // The ring on the acid side: -carboxilato, benzoato.
  ['COC(=O)C1=CC=CC=C1', 'benzoato de metilo', 'methyl benzoate'],
  ['CCOC(=O)C1CCCCC1', 'ciclohexanocarboxilato de etilo', 'ethyl cyclohexanecarboxylate'],
  ['COC(=O)C1CCCC1', 'ciclopentanocarboxilato de metilo', 'methyl cyclopentanecarboxylate'],
  ['COC(=O)C1CCCCC1C', '2-metilciclohexano-1-carboxilato de metilo', 'methyl 2-methylcyclohexane-1-carboxylate'],
  ['COC(=O)C1C=CCCC1', 'ciclohex-2-eno-1-carboxilato de metilo', 'methyl cyclohex-2-ene-1-carboxylate'],
  ['COC(=O)C1CCC(Cl)CC1', '4-clorociclohexano-1-carboxilato de metilo', 'methyl 4-chlorocyclohexane-1-carboxylate'],
  ['COC(=O)C1CCC(C(=O)OC)CC1', 'ciclohexano-1,4-dicarboxilato de dimetilo', 'dimethyl cyclohexane-1,4-dicarboxylate'],
  ['COC(=O)C1CCC(O)CC1', '4-hidroxiciclohexano-1-carboxilato de metilo', 'methyl 4-hydroxycyclohexane-1-carboxylate'],
  ['COC(=O)C1CCC(C#N)CC1', '4-cianociclohexano-1-carboxilato de metilo', 'methyl 4-cyanocyclohexane-1-carboxylate'],
  ['COC(=O)C1CCC(NC(C)=O)CC1', '4-(acetilamino)ciclohexano-1-carboxilato de metilo', 'methyl 4-(acetylamino)cyclohexane-1-carboxylate'],
  // The ring on the O side: a ring group ending in -ilo.
  ['CC(=O)OC1=CC=CC=C1', 'etanoato de fenilo', 'phenyl ethanoate'],
  ['CC(=O)OC1CCCCC1', 'etanoato de ciclohexilo', 'cyclohexyl ethanoate'],
  ['CC(=O)OC1CCCCC1C', 'etanoato de 2-metilciclohexilo', '2-methylcyclohexyl ethanoate'],
  ['CC(=O)OC1C=CCCC1', 'etanoato de ciclohex-2-en-1-ilo', 'cyclohex-2-en-1-yl ethanoate'],
  ['CC(=O)OCC1CCCCC1', 'etanoato de ciclohexilmetilo', 'cyclohexylmethyl ethanoate'],
  // A ring on each side.
  ['O=C(OC1=CC=CC=C1)C1=CC=CC=C1', 'benzoato de fenilo', 'phenyl benzoate'],
  ['O=C(OC1CCCCC1)C1=CC=CC=C1', 'benzoato de ciclohexilo', 'cyclohexyl benzoate'],
  ['O=C(OC1CCCCC1C)C1CCCCC1', 'ciclohexanocarboxilato de 2-metilciclohexilo', '2-methylcyclohexyl cyclohexanecarboxylate'],
  ['O=C(OC1=CC=CC=C1)CC1=CC=CC=C1', '2-feniletanoato de fenilo', 'phenyl 2-phenylethanoate'],
  // The ring on a side chain.
  ['COC(=O)CC1=CC=CC=C1', '2-feniletanoato de metilo', 'methyl 2-phenylethanoate'],
  ['COC(=O)CCC1CCCCC1', '3-ciclohexilpropanoato de metilo', 'methyl 3-cyclohexylpropanoate'],
  ['COC(=O)C(CC(=O)OC)C1CCCCC1', '2-ciclohexilbutanodioato de dimetilo', 'dimethyl 2-cyclohexylbutanedioate'],
  // Ester prefixes on a ring below an acid.
  ['COC(=O)C1CCC(C(=O)O)CC1', 'ácido 4-(metoxicarbonil)ciclohexano-1-carboxílico', '4-(methoxycarbonyl)cyclohexane-1-carboxylic acid'],
  ['CC(=O)OC1CCC(C(=O)O)CC1', 'ácido 4-(acetiloxi)ciclohexano-1-carboxílico', '4-(acetyloxy)cyclohexane-1-carboxylic acid'],
  ['OC(=O)CC1CCC(OC(C)=O)CC1', 'ácido 2-[4-(acetiloxi)ciclohexil]etanoico', '2-[4-(acetyloxy)cyclohexyl]ethanoic acid'],
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

test('ringEster is retired; lactones, mixed ring diesters, three esters and other placements stay refused', () => {
  for (const smiles of ['COC(=O)C1CCCCC1', 'CC(=O)OC1=CC=CC=C1', 'O=C(OC1=CC=CC=C1)C1=CC=CC=C1', 'COC(=O)CC1CCCCC1']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // A lactone: the –COO– inside the ring, a heterocycle, with its own message.
  for (const smiles of ['O=C1CCCO1', 'O=C1CCCCO1', 'CC1CC(=O)OC1']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.deepEqual([error.code, error.ringReason, error.message], ['RING_SYSTEM', 'lactone', LACTONE_MESSAGE], smiles);
  }
  assert.match(LACTONE_MESSAGE, /lactona/);
  assert.equal(validateForNaming(parseSmiles('C1CCOCC1')).message, RING_SYSTEM_MESSAGES.heterocycle, 'an ether ring is no lactone');
  // A cyclic anhydride or carbonate is no ester, so no lactone (review I-40d).
  for (const smiles of ['O=C1OC(=O)CC1', 'O=C1OCCO1', 'O=C1CCC(=O)O1']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.deepEqual([error.code, error.ringReason, error.message], ['RING_SYSTEM', undefined, RING_SYSTEM_MESSAGES.heterocycle], smiles);
  }
  for (const [smiles, reason, message] of [
    // Two ring esters with different O-bound groups: locants for the groups.
    ['CCOC(=O)C1CCCCC1C(=O)OC', 'mixedDiester', MIXED_RING_DIESTER_MESSAGE],
    ['CCOC(=O)C1CCC(C(=O)OC)CC1', 'mixedDiester', MIXED_RING_DIESTER_MESSAGE],
    // Three esters on the ring (-tricarboxilato).
    ['COC(=O)C1CC(C(=O)OC)CC(C(=O)OC)C1', 'manyEsters', MANY_ESTERS_MESSAGE],
    // A ring ester and a chain ester: the other one would be a prefix.
    ['COC(=O)C1CCC(CC(=O)OC)CC1', 'esterPrefix', ESTER_PREFIX_MESSAGE],
    ['COC(=O)C1CCC(CCC(=O)OC)CC1', 'esterPrefix', ESTER_PREFIX_MESSAGE],
    ['CC(=O)OCC(=O)OC1=CC=CC=C1', 'esterPrefix', ESTER_PREFIX_MESSAGE],
    // Identical ester branches on the ring: multiplicative (the engine's symmetricRing).
    ['COC(=O)CC1CCC(CC(=O)OC)CC1', 'symmetricRing', null],
  ]) {
    const result = named(smiles);
    assert.equal(`${result.error.code} ${result.error.reason}`, `HETEROATOM ${reason}`, smiles);
    if (message) {
      assert.equal(result.error.message, message, smiles);
    }
    assert.ok(result.groups, `${smiles}: the refusal carries the group analysis`);
  }
  assert.match(MIXED_RING_DIESTER_MESSAGE, /ciclohexano-1,2-dicarboxilato de 1-etilo y 2-metilo/);
  assert.match(ESTER_PREFIX_MESSAGE, /un oxígeno, un nitrógeno o un anillo/);
  // Benzene stays monosubstituted; two rings only with the ester between them and no acid.
  assert.equal(nameOf('COC(=O)C1=CC=C(C)C=C1'), 'CYCLE polysubstitutedBenzene');
  assert.equal(nameOf('CC(=O)OC1=CC=C(C)C=C1'), 'CYCLE polysubstitutedBenzene');
  assert.equal(nameOf('OC(=O)C1CCC(OC(=O)C2=CC=CC=C2)CC1'), 'RING_SYSTEM');
  assert.equal(nameOf('COC(=O)C1CCC(C2CCCCC2)CC1'), 'RING_SYSTEM', 'two rings on the same side of the ester');
  assert.equal(nameOf('O=C(OC1CCCCC1)C1CCC(C2CC2)CC1'), 'RING_SYSTEM', 'three rings');
  assert.match(RING_SYSTEM_MESSAGES.several, /benzoato de fenilo/);
});

test('esterRingSplit: the one ester between two rings, its O-bound group holding one ring whole', () => {
  const mol = parseSmiles('O=C(OC1CCCCC1C)C1CCCCC1');
  const split = esterRingSplit(mol);
  assert.ok(split);
  assert.equal(mol.atoms.get(split.carbon).element, 'C');
  assert.equal(mol.atoms.get(split.bridge).element, 'O');
  assert.equal(split.alkylAtoms.length, 7, 'the 2-methylcyclohexyl group');
  assert.ok(split.alkylAtoms.includes(split.far));
  for (const smiles of ['COC(=O)C1CCCCC1', 'C1CC1CC1CC1', 'COC(=O)C1CCC(C2CCCCC2)CC1', 'OC(=O)C1CCC(OC(=O)C2=CC=CC=C2)CC1']) {
    assert.equal(esterRingSplit(parseSmiles(smiles)), null, smiles);
  }
  // The ring atoms of two separate rings leave out the atoms that join them.
  assert.equal(ringAtomsOf(adjacency(parseSmiles('O=C(OC1=CC=CC=C1)C1=CC=CC=C1'))).size, 12);
  assert.equal(ringAtomsOf(adjacency(parseSmiles('CC1CCCCC1'))).size, 6);
});

test('ring or chain: an ester bonded to the ring counts for the ring; a ring on the O counts for nothing', () => {
  const choice = (smiles) => {
    const mol = parseSmiles(smiles);
    return ringOrChain(mol, ringParent(mol));
  };
  const alone = choice('COC(=O)C1CCCCC1');
  assert.deepEqual([alone.chainParent, alone.ringCount, alone.chainCount], [false, 1, 0]);
  const phenyl = choice('CC(=O)OC1=CC=CC=C1');
  assert.deepEqual([phenyl.chainParent, phenyl.ringCount, phenyl.chainCount], [true, 0, 1]);
  const side = choice('COC(=O)CC1=CC=CC=C1');
  assert.deepEqual([side.chainParent, side.ringCount, side.chainCount], [true, 0, 1]);
  // Below an acid a ring ester is not principal: it counts for nothing.
  assert.equal(choice('OC(=O)CC1CCC(C(=O)OC)CC1').ringCount, 0);
});

test('the suffix structure: the ring atom numbered, the ester carbon outside the ring, the O-bound group apart', () => {
  const result = named('COC(=O)C1CCCCC1C');
  const { suffix, parent, ester } = result.structure;
  assert.equal(suffix.kind, 'ester');
  assert.equal(suffix.outside, true);
  const [site] = suffix.locants;
  assert.equal(site.locant, 1);
  assert.equal(site.atom, parent.atoms[0]);
  assert.ok(!parent.atoms.includes(site.carbon), 'the ester carbon is not a ring atom');
  assert.equal(ester.oxygen, site.esterOxygen);
  const ending = result.parts.find((p) => p.text === 'carboxilato');
  assert.ok(ending.atoms.includes(site.carbon) && ending.atoms.includes(site.esterOxygen));
  assert.ok(ending.bonds.includes(site.carbonBond));
  // The two-ring ester: every atom id of the name is an atom of the drawing (no stand-in leaks).
  const mol = parseSmiles('O=C(OC1CCCCC1C)C1CCCCC1');
  const two = nameMolecule(mol);
  const ids = new Set(mol.atoms.keys());
  assert.ok(two.parts.every((p) => p.atoms.every((id) => ids.has(id))));
  assert.ok(two.trace.every((step) => step.candidatesBefore.every((c) => c.atoms.every((id) => ids.has(id)))));
  assert.deepEqual(two.structure.ester.alkyl.atoms.filter((id) => !ids.has(id)), []);
  assert.equal(two.structure.ester.alkyl.atoms.length, 8, 'the bridge O and the 2-methylcyclohexyl group');
});

test('benzene and traditional names: benzoato first, bencenocarboxilato, acetato, formiato and fenilacetato as alternatives', () => {
  const benzoate = named('COC(=O)C1=CC=CC=C1');
  assert.deepEqual(benzoate.parts.map((p) => p.text), ['benz', 'oato', ' de ', 'metilo']);
  assert.deepEqual(benzoate.alternatives.map((a) => [a.style, a.name]), [['benzeneSystematic', 'bencenocarboxilato de metilo']]);
  assert.match(benzoate.alternatives[0].label, /la IUPAC \(2013\) prefiere el nombre tradicional/);
  assert.equal(renderName(benzoate.structure, lexiconEn, { systematic: true }).name, 'methyl benzenecarboxylate');
  for (const [smiles, traditional, label] of [
    ['CC(=O)OC1=CC=CC=C1', 'acetato de fenilo', /conserva como preferido/],
    ['O=COC1CCCCC1', 'formiato de ciclohexilo', /conserva como preferido/],
    ['COC(=O)CC1=CC=CC=C1', 'fenilacetato de metilo', /acepta/],
    ['O=C(OC1=CC=CC=C1)CC1=CC=CC=C1', 'fenilacetato de fenilo', /acepta/],
  ]) {
    const result = named(smiles);
    assert.deepEqual(result.alternatives.map((a) => [a.style, a.name]), [['traditional', traditional]], smiles);
    assert.match(result.alternatives[0].label, label, smiles);
  }
  // The traditional word of fenilacetato refers to the phenyl too.
  const phenylacetate = named('COC(=O)CC1=CC=CC=C1').alternatives[0].parts[0];
  assert.equal(phenylacetate.atoms.length, 10, 'the chain, the –COO– and the six ring carbons');
  // No traditional name for a ring ester, a longer chain or a substituted one.
  for (const smiles of ['CCOC(=O)C1CCCCC1', 'COC(=O)CCC1=CC=CC=C1', 'COC(=O)C(C)C1=CC=CC=C1']) {
    assert.deepEqual(named(smiles).alternatives, [], smiles);
  }
});

test('prefix styles and the formula: the ester carbon outside the ring and both rings are counted', () => {
  assert.deepEqual(PREFIX_STYLES.map((style) => named('CC(C)OC(=O)C1CCCCC1', style).name), [
    'ciclohexanocarboxilato de isopropilo',
    'ciclohexanocarboxilato de propan-2-ilo',
    'ciclohexanocarboxilato de 1-metiletilo',
  ]);
  assert.deepEqual(PREFIX_STYLES.map((style) => named('CC(C)C1CCC(OC(=O)C2CCCCC2)CC1', style).name), [
    'ciclohexanocarboxilato de 4-isopropilciclohexilo',
    'ciclohexanocarboxilato de 4-(propan-2-il)ciclohexilo',
    'ciclohexanocarboxilato de 4-(1-metiletil)ciclohexilo',
  ]);
  const counts = (smiles) => {
    const { carbons, hydrogens, oxygens } = atomCounts(named(smiles).structure);
    return [carbons, hydrogens, oxygens];
  };
  assert.deepEqual(counts('COC(=O)C1=CC=CC=C1'), [8, 8, 2]);
  assert.deepEqual(counts('CC(=O)OC1CCCCC1'), [8, 14, 2]);
  assert.deepEqual(counts('O=C(OC1=CC=CC=C1)C1=CC=CC=C1'), [13, 10, 2]);
  assert.deepEqual(counts('COC(=O)C1CCC(C(=O)OC)CC1'), [10, 16, 4]);
});

test('the explanation: the two parts of a ring ester, -carboxilato, benzoato, the ring on the O, ester prefixes on a ring', () => {
  // The ring on the acid side.
  const group = stepText('COC(=O)C1CCCCC1C', 'group');
  assert.match(group, /El –COO– está unido directamente a un carbono del anillo\. Su carbono no forma parte del anillo/);
  assert.match(group, /la primera termina con el sufijo «-carboxilato».*La segunda palabra es el nombre del grupo unido al otro oxígeno/);
  assert.doesNotMatch(group, /siempre está en un extremo de la cadena|siempre es el carbono 1/);
  const ester = stepText('COC(=O)C1CCCCC1C', 'ester');
  assert.match(ester, /La parte del ácido es el anillo de 6 carbonos, con el carbono del C=O, que está fuera del anillo/);
  assert.match(ester, /«ácido 2-metilciclohexano-1-carboxílico», cambiando «-ílico» por «-ilato»: «2-metilciclohexano-1-carboxilato»/);
  const ring = stepText('COC(=O)C1CCCCC1C', 'ring');
  assert.match(ring, /^En tu molécula, 6 de los carbonos/);
  assert.match(ring, /ni su carbono ni sus oxígenos se cuentan en el anillo.*«-carboxilato»/);
  assert.match(ring, /El grupo unido al otro oxígeno del –COO– tampoco es del anillo/);
  const assemble = stepText('COC(=O)C1CCCCC1C', 'assemble');
  assert.match(assemble, /se forma como el nombre de cualquier anillo/);
  assert.match(assemble, /El carbono del –COO– no tiene número: no es del anillo/);
  assert.doesNotMatch(assemble, /su carbono siempre es el 1/);
  // Benzoato.
  assert.match(stepText('COC(=O)C1=CC=CC=C1', 'group'), /nombre propio, «benzoato» \(del «ácido benzoico»\).*«bencenocarboxilato»/);
  assert.match(stepText('COC(=O)C1=CC=CC=C1', 'ester'), /«ácido benzoico», cambiando «-oico» por «-oato»: «benzoato»/);
  assert.match(stepText('COC(=O)C1=CC=CC=C1', 'benzene'), /^En tu molécula, 6 de los carbonos.*La parte del ácido, el benceno con un grupo –COO–, tiene nombre propio: «benzoato»/);
  const benzoate = stepText('COC(=O)C1=CC=CC=C1', 'assemble');
  assert.match(benzoate, /«benz» es el anillo y «-oato», el grupo –COO–\. Después va la palabra «de» y la segunda palabra.*«metilo»/);
  // A ring diester.
  assert.match(stepText('COC(=O)C1CCC(C(=O)OC)CC1', 'diester'), /La parte del ácido es el anillo de 6 carbonos, con los carbonos de los C=O/);
  assert.match(stepText('COC(=O)C1CCC(C(=O)OC)CC1', 'group'), /«-dicarboxilato»/);
  // The ring on the O side.
  assert.match(stepText('CC(=O)OC1=CC=CC=C1', 'ester'), /«fenilo» es el benceno como grupo, unido al oxígeno por uno de sus carbonos/);
  assert.match(stepText('CC(=O)OC1CCCCC1', 'ester'), /«ciclohexilo» es el anillo de 6 carbonos como grupo/);
  assert.match(stepText('CC(=O)OC1=CC=CC=C1', 'ringChain'), /gana la cadena.*El anillo está al otro lado del oxígeno del medio del –COO–.*«fenilo»/);
  assert.match(stepText('CC(=O)OC1=CC=CC=C1', 'groupChain'), /Sin contar los carbonos del grupo unido al oxígeno del –COO–, «fenilo», que se nombra aparte/);
  assert.match(stepText('O=C(OC1=CC=CC=C1)CC1=CC=CC=C1', 'groupChain'), /prefijo «fenil».*y los del grupo unido al oxígeno del –COO–, «fenilo»/);
  assert.match(stepText('CC(=O)OC1CCCCC1C', 'ester'), /empezando por el que está unido al oxígeno, que es el 1/);
  // Ester prefixes on a ring below an acid.
  assert.match(stepText('COC(=O)C1CCC(C(=O)O)CC1', 'group'), /el éster está unido al anillo por ese carbono.*«metoxicarbonil»/);
  assert.match(stepText('CC(=O)OC1CCC(C(=O)O)CC1', 'group'), /está unido al anillo por su oxígeno del medio.*«acetiloxi»/);
  assert.doesNotMatch(stepText('CC(=O)OC1CCC(C(=O)O)CC1', 'group'), /unido a la cadena/);
  // The traditional names.
  assert.match(stepText('COC(=O)CC1=CC=CC=C1', 'assemble'), /«fenilacetato de metilo»: nombre tradicional, que la IUPAC \(2013\) acepta/);
  // No placeholder text anywhere; the ester step covers every atom and bond once.
  for (const [smiles] of NAMED) {
    const result = named(smiles);
    const steps = explain(result);
    const text = steps.flatMap((s) => s.text.map(plainText)).join(' ');
    assert.doesNotMatch(text, /undefined|NaN|null|\[\[/, smiles);
    const step = steps.find((s) => s.id === 'ester' || s.id === 'diester');
    if (step) {
      const mol = parseSmiles(smiles);
      const atoms = step.highlight.flatMap((h) => h.atoms).sort((p, q) => p - q);
      const bonds = step.highlight.flatMap((h) => h.bonds).sort((p, q) => p - q);
      assert.deepEqual(atoms, [...mol.atoms.keys()].sort((p, q) => p - q), `${smiles}: atoms`);
      assert.deepEqual(bonds, [...mol.bonds.keys()].sort((p, q) => p - q), `${smiles}: bonds`);
    }
  } // End of the loop over the named molecules
});

test('two separate rings: a canonical key independent of atom ids, both Kekulé drawings compared', () => {
  const random = seededRandom(211);
  for (const smiles of ['O=C(OC1=CC=CC=C1)C1=CC=CC=C1', 'O=C(OC1CCCCC1C)C1CCCCC1', 'O=C(OC1CCCCC1)C1CCCCC1C']) {
    const key = canonicalKey(parseSmiles(smiles));
    for (let k = 0; k < 6; k += 1) {
      assert.equal(canonicalKey(scrambleMolecule(parseSmiles(smiles), random)), key, smiles);
    }
  }
  assert.notEqual(canonicalKey(parseSmiles('O=C(OC1CCCCC1C)C1CCCCC1')), canonicalKey(parseSmiles('O=C(OC1CCCCC1)C1CCCCC1C')));
  assert.throws(() => canonicalKey(parseSmiles('C1CCC2CCCCC2C1')), /shared ring atoms/);
  assert.equal(kekuleKeys(parseSmiles('O=C(OC1=CC=CC=C1)C1=CC=CC=C1')).length, 4, 'each benzene in either drawing');
  const phenylBenzoate = parseSmiles('O=C(OC1=CC=CC=C1)C1=CC=CC=C1');
  assert.equal(compareWithOpsin(phenylBenzoate, 'O=C(OC1=CC=CC=C1)C1=CC=CC=C1').status, 'passed');
  assert.equal(compareWithOpsin(phenylBenzoate, 'O=C(OC1=CC=CC=C1)C1=CC=C2C=CC=CC2=C1').status, 'failed');
});

test('names and refusals never depend on atom ids or drawing order', () => {
  const random = seededRandom(151);
  const refusals = ['CCOC(=O)C1CCCCC1C(=O)OC', 'COC(=O)C1CCC(CC(=O)OC)CC1', 'COC(=O)C1CC(C(=O)OC)CC(C(=O)OC)C1', 'O=C1CCCCO1'];
  for (const smiles of refusals) {
    const reference = nameOf(smiles);
    assert.match(reference, /^(HETEROATOM|RING_SYSTEM) /, smiles);
    for (let k = 0; k < 8; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(`${result.error.code} ${result.error.reason || result.error.ringReason}`, reference, smiles);
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

test('Ordenar dibujo lays out ring esters, two rings included', () => {
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

test('the seeded ring ester generator: deterministic, distinct, valid, varied, well explained', () => {
  const molecules = generateRingEsters({ count: 80, seed: 3 });
  assert.equal(molecules.length, 80);
  assert.deepEqual(generateRingEsters({ count: 80, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.equal(new Set(molecules.map(canonicalKey)).size, 80, 'distinct');
  const results = molecules.map((mol) => {
    assert.equal(validateForNaming(mol), null, writeSmiles(mol));
    return nameMolecule(mol);
  });
  assert.ok(results.every((r) => r.ok));
  assert.ok(results.some((r) => /carboxilato de/.test(r.name)), 'some ring esters on the acid side');
  assert.ok(results.some((r) => /^benzoato de/.test(r.name)), 'some benzoates');
  assert.ok(results.some((r) => r.structure.parentKind === 'chain' && /(fenilo|cicl\w+ilo)$/.test(r.name)), 'some rings on the O');
  assert.ok(results.some((r) => /carboxilato de .*(fenilo|cicl\w+ilo)$|^benzoato de (fenilo|cicl)/.test(r.name)), 'some rings on both sides');
  assert.ok(results.some((r) => /carbonil|iloxi|formiloxi/.test(r.name) && r.structure.suffix.kind === 'acid'), 'some prefix forms below an acid');
  for (const result of results) {
    const text = explain(result).flatMap((s) => s.text.map(plainText)).join(' ');
    assert.doesNotMatch(text, /undefined|NaN|null|\[\[/, result.name);
  }
});
