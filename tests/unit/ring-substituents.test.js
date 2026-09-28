/**
 * @file Unit tests for rings as substituents of a chain that carries the
 * principal group (design.md §13.4 I-40a): with a ring and an OH, a ketone
 * or an amine, the parent carries the most principal groups first (IUPAC
 * 2013 P-44.1.1); a chain carrying more than the ring is the parent and
 * the ring a prefix — `ciclohexil`, `fenil`, `(2-metilciclohexil)`,
 * `(ciclohex-2-en-1-il)`, `ciclohexiliden`, `fenoxi`, `(ciclohexiloxi)`,
 * `(ciclohexilamino)` — while on a tie the ring is senior (P-44.1.2.2).
 * Covers the lifted refusals (`sideChainAlcohol`, `sideChainCarbonyl`,
 * `sideChainAmine`), the refusals that stay or are new (`symmetricRing`,
 * and the I-40c/I-40d ones; `ringAcyl` is lifted by I-40b,
 * tests/unit/ring-acids.test.js), the ring-or-chain comparison
 * (parent.js ringOrChain(), the `RINGCHAIN` trace step), the ring prefix
 * itself (substituent.js ringSubstituent(), render.js), the ring-aware
 * branch keys (graph.js rootedBranchKey()), both lexicons, the traditional
 * names, the explanation, id invariance, Ordenar dibujo and the oracle
 * generator. The names themselves are also checked row by row in
 * tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { adjacency, canonicalKey, rootedBranchKey, rootedTreeKey, cycleCore } from '../../src/model/graph.js';
import { validateForNaming, SYMMETRIC_RING_MESSAGE } from '../../src/model/validate.js';
import { perceiveRings } from '../../src/model/rings.js';
import { nameMolecule } from '../../src/naming/index.js';
import { ringOrChain } from '../../src/naming/parent.js';
import { ringParent } from '../../src/naming/rings.js';
import { PREFIX_STYLES, createNamingContext, ringSubstituent } from '../../src/naming/substituent.js';
import { needsEnclosure, isCompoundPrefix, isContractedAlkoxy, substituentPrefix } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateRingSubstituents } from '../../scripts/oracle/generate.mjs';
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

/** Molecules named since I-40a, with their Spanish and English names. */
const NAMED = [
  ['OCCC1CCCCC1', '2-ciclohexiletan-1-ol', '2-cyclohexylethan-1-ol'],
  ['CC(O)C1=CC=CC=C1', '1-feniletan-1-ol', '1-phenylethan-1-ol'],
  ['OCC1=CC=CC=C1', 'fenilmetanol', 'phenylmethanol'],
  ['CC(=O)C1=CC=CC=C1', '1-feniletan-1-ona', '1-phenylethan-1-one'],
  ['CCC(=O)C1=CC=CC=C1', '1-fenilpropan-1-ona', '1-phenylpropan-1-one'],
  ['CC(=O)C1CCCCC1', '1-ciclohexiletan-1-ona', '1-cyclohexylethan-1-one'],
  ['NCC1=CC=CC=C1', 'fenilmetanamina', 'phenylmethanamine'],
  ['NCCC1=CC=CC=C1', '2-feniletan-1-amina', '2-phenylethan-1-amine'],
  // English keeps the Spanish citation order of the structure (the oracle checks structure only).
  ['CNCC1=CC=CC=C1', '1-fenil-N-metilmetanamina', '1-phenyl-N-methylmethanamine'],
  ['OCC(C)C1CCCCC1C', '2-(2-metilciclohexil)propan-1-ol', '2-(2-methylcyclohexyl)propan-1-ol'],
  ['OCCC1C=CCCC1', '2-(ciclohex-2-en-1-il)etan-1-ol', '2-(cyclohex-2-en-1-yl)ethan-1-ol'],
  ['OCC=C1CCCCC1', '2-ciclohexilidenetan-1-ol', '2-cyclohexylideneethan-1-ol'],
  ['OC(CO)C1CCC(O)CC1', '1-(4-hidroxiciclohexil)etano-1,2-diol', '1-(4-hydroxycyclohexyl)ethane-1,2-diol'],
  ['OCC1CCC(O)CC1', '4-(hidroximetil)ciclohexan-1-ol', '4-(hydroxymethyl)cyclohexan-1-ol'],
  ['OCCOC1=CC=CC=C1', '2-fenoxietan-1-ol', '2-phenoxyethan-1-ol'],
  ['OCCOC1CCCCC1', '2-(ciclohexiloxi)etan-1-ol', '2-(cyclohexyloxy)ethan-1-ol'],
  ['OCCNC1CCCCC1', '2-(ciclohexilamino)etan-1-ol', '2-(cyclohexylamino)ethan-1-ol'],
  ['ClC(O)C1=CC=CC=C1', 'cloro(fenil)metanol', 'chloro(phenyl)methanol'],
  ['OCC1CCC(CCO)CC1', '2-[4-(hidroximetil)ciclohexil]etan-1-ol', '2-[4-(hydroxymethyl)cyclohexyl]ethan-1-ol'],
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

test('the side-chain refusals are lifted; esters with a ring are named since I-40d', () => {
  for (const smiles of ['OCC1=CC=CC=C1', 'CC(=O)C1CCCCC1', 'NCC1=CC=CC=C1', 'OCCOC1CCCCC1', 'CNCC1CCCCC1']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Aldehydes and acids with a ring are named since I-40b, nitriles and amides since I-40c, esters since I-40d.
  for (const smiles of ['O=CCC1CCCCC1', 'O=CC1=CC=CC=C1', 'OC(=O)CC1CCCCC1', 'N#CCC1CCCCC1', 'NC(=O)CC1CCCCC1']) {
    assert.equal(named(smiles).ok, true, smiles);
  }
  assert.equal(nameOf('CC(=O)OCC1CCCCC1'), 'etanoato de ciclohexilmetilo');
});

test('ring or chain: the principal groups first (P-44.1.1), the ring on a tie (P-44.1.2.2)', () => {
  const choice = (smiles) => {
    const mol = parseSmiles(smiles);
    return ringOrChain(mol, ringParent(mol));
  };
  const chain = choice('OCCC1CCCCC1');
  assert.deepEqual([chain.chainParent, chain.ringCount, chain.chainCount], [true, 0, 1]);
  assert.equal(chain.step.rule, 'RINGCHAIN');
  assert.equal(chain.step.candidatesBefore[0].key, 'ring');
  const tie = choice('OCC1CCC(O)CC1');
  assert.deepEqual([tie.chainParent, tie.ringCount, tie.chainCount], [false, 1, 1]);
  const more = choice('OC(CO)C1CCC(O)CC1');
  assert.deepEqual([more.chainParent, more.ringCount, more.chainCount], [true, 1, 2]);
  // No principal group: the ring is always the parent (design.md §13.5), no comparison.
  assert.equal(choice('CCCCCCCCCCC1CC1'), null);
  assert.equal(choice('COC1CCCCC1'), null, 'an ether is never principal');
  // An amine N on the ring and on a chain is the ring's group: no RINGCHAIN step (I-36 unchanged).
  assert.equal(named('CNC1CCCCC1').trace[0].rule, 'RING');
  assert.equal(named('OCC1CCC(O)CC1').trace[0].rule, 'RINGCHAIN');
  assert.equal(named('OCC1CCC(O)CC1').trace[1].rule, 'RING');
  assert.deepEqual(named('OCCC1CCCCC1').trace.map((s) => s.rule).slice(0, 3), ['RINGCHAIN', 'P0', 'P1']);
});

test('hydrocarbons, halogen derivatives, ethers and ring-borne groups keep the ring as the parent', () => {
  const ring = [
    ['CCCCCCCCCCC1CC1', 'decilciclopropano'],
    ['C=CC1CCCCC1', 'etenilciclohexano'],
    ['CCC1=CC=CC=C1', 'etilbenceno'],
    ['ClCCC1CCCCC1', '(2-cloroetil)ciclohexano'],
    ['COCC1CCCCC1', '(metoximetil)ciclohexano'],
    ['OC1CCC(CC)CC1', '4-etilciclohexan-1-ol'],
    ['NC1CCCCC1', 'ciclohexanamina'],
    ['CNC1=CC=CC=C1', 'N-metilbencenamina'],
    ['OCC1CCC(=O)CC1', '4-(hidroximetil)ciclohexan-1-ona'],
    ['CC(=O)C1CCC(=O)CC1', '4-acetilciclohexan-1-ona'],
    ['NCC1CCC(N)CC1', '4-(aminometil)ciclohexan-1-amina'],
  ];
  for (const [smiles, name] of ring) {
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.equal(result.structure.parentKind, 'ring', smiles);
  }
});

test('refusals: identical principal branches on a ring (multiplicative); an acyl carbon on the ring is named since I-40b', () => {
  for (const smiles of ['OCC1CCC(CO)CC1', 'OCC1(CO)CCCCC1', 'NCC1CCC(CN)CC1', 'OCOC1CCC(OCO)CC1']) {
    const result = named(smiles);
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.reason, 'symmetricRing', smiles);
    assert.equal(result.error.message, SYMMETRIC_RING_MESSAGE);
    assert.ok(result.groups, 'the refusal carries the group analysis');
  }
  assert.match(SYMMETRIC_RING_MESSAGE, /ciclohexano-1,4-diildimetanol/);
  // Different branches, or identical ones without the parent, are named.
  assert.equal(nameOf('OCC1CCC(CCO)CC1'), '2-[4-(hidroximetil)ciclohexil]etan-1-ol');
  assert.equal(nameOf('OC(CO)C1CCC(C)C(C)C1'), '1-(3,4-dimetilciclohexil)etano-1,2-diol');
  // A C=O carbon bonded to the ring as an acyl branch: `-carbonil`, `benzoil` (I-40b; `ringAcyl` lifted).
  assert.equal(nameOf('CC(=O)C(C(=O)C1CCCCC1)C(C)=O'), '3-(ciclohexanocarbonil)pentano-2,4-diona');
  assert.equal(nameOf('CC(=O)C(C(=O)C1=CC=CC=C1)C(C)=O'), '3-benzoilpentano-2,4-diona');
  assert.equal(nameOf('CC(=O)C(C(=O)CC1CCCCC1)C(C)=O'), '3-acetil-1-ciclohexilpentano-2,4-diona');
  assert.match(SYMMETRIC_RING_MESSAGE, /^Esta molécula tiene /);
  assert.match(SYMMETRIC_RING_MESSAGE, /\.$/);
});

test('the ring prefix: attachment atom 1, its own groups, enclosure, alkoxy and alphabetical order', () => {
  const mol = parseSmiles('OCC(C)C1CCCCC1C');
  const ctx = createNamingContext(mol);
  const ring = perceiveRings(mol).rings[0];
  const carrier = 3; // O1, C2, C3 (the carbon bearing the ring), C4 (its methyl), then the ring from C5.
  const attach = ring.atoms.find((id) => adjacency(mol).get(id).some((n) => n.atom === carrier));
  const sub = ringSubstituent(ctx, carrier, attach, 1);
  assert.equal(sub.ring, true);
  assert.equal(sub.chain.kind, 'ring');
  assert.equal(sub.chain.atoms[0], attach, 'the attachment atom is locant 1');
  assert.equal(sub.chain.length, 6);
  assert.equal(sub.atoms.length, 7, 'the ring and its methyl');
  assert.equal(sub.bonds.length, 7, 'six ring bonds (the closure included) and the methyl bond');
  assert.equal(substituentPrefix(sub), '2-metilciclohexil');
  assert.equal(needsEnclosure(sub), true);
  assert.equal(isCompoundPrefix(sub), true);
  const bare = named('OCCC1CCCCC1').structure.prefixes[0].substituent;
  assert.equal(needsEnclosure(bare), false);
  assert.equal(isCompoundPrefix(bare), false);
  const phenyl = named('OCC1=CC=CC=C1').structure.prefixes[0].substituent;
  assert.equal(phenyl.retained, 'phenyl');
  assert.equal(phenyl.chain.retained, 'benzene');
  // Alkoxy: phenoxy is contracted (retained), a cycloalkyl never.
  assert.equal(isContractedAlkoxy(named('OCCOC1=CC=CC=C1').structure.prefixes[0].substituent), true);
  assert.equal(isContractedAlkoxy(named('OCCOC1CC1').structure.prefixes[0].substituent), false);
  assert.equal(nameOf('OCCOC1CC1'), '2-(ciclopropiloxi)etan-1-ol');
  // Alphabetised by the whole prefix: ciclohexil < cloro, fenil < metil.
  assert.equal(nameOf('OC(Cl)CC1CCCCC1'), '2-ciclohexil-1-cloroetan-1-ol');
  assert.equal(nameOf('CC(C)C(O)C1=CC=CC=C1'), '1-fenil-2-metilpropan-1-ol');
  assert.equal(nameOf('COC(O)C1=CC=CC=C1'), 'fenil(metoxi)metanol', 'a ring prefix cited first is not enclosed');
  assert.equal(lexiconEn.retainedPrefix('phenyl').text, 'phenyl');
});

test('ring-aware branch keys: equal to the tree key without a ring, independent of ids and ring direction', () => {
  const tree = parseSmiles('CCC(C)CO');
  const adj = adjacency(tree);
  assert.equal(rootedBranchKey(tree, 3, 2, adj), rootedTreeKey(tree, 3, 2, adj));
  assert.equal(cycleCore(adj).size, 0);
  const keyOf = (smiles, from) => {
    const mol = parseSmiles(smiles);
    const a = adjacency(mol);
    return rootedBranchKey(mol, [...cycleCore(a)].find((id) => a.get(id).some((n) => n.atom === from)), from, a);
  };
  // 2-methylcyclohexyl seen from the carrier, drawn in different atom orders.
  const first = keyOf('OC1CCCCC1C', 1);
  assert.equal(keyOf('OC1C(C)CCCC1', 1), first);
  assert.notEqual(keyOf('OC1CCC(C)CC1', 1), first, '4-methyl is another group');
  assert.equal(cycleCore(adjacency(parseSmiles('CC1CC1'))).size, 3);
});

test('traditional names: acetofenona, alcohol bencílico, bencilamina — bare molecules only', () => {
  const alternatives = (smiles) => named(smiles).alternatives.map((a) => `${a.style}=${a.name}`);
  assert.deepEqual(alternatives('CC(=O)C1=CC=CC=C1'), ['traditional=acetofenona']);
  assert.deepEqual(alternatives('OCC1=CC=CC=C1'), ['traditional=alcohol bencílico']);
  assert.deepEqual(alternatives('NCC1=CC=CC=C1'), ['traditional=bencilamina']);
  for (const smiles of ['CCC(=O)C1=CC=CC=C1', 'CNCC1=CC=CC=C1', 'OCOC1=CC=CC=C1', 'OCC1CCCCC1', 'OC(Cl)C1=CC=CC=C1']) {
    assert.deepEqual(alternatives(smiles), [], smiles);
  }
  const alt = named('CC(=O)C1=CC=CC=C1').alternatives[0];
  assert.equal(alt.label, 'nombre tradicional, que la IUPAC (2013) acepta');
  assert.equal(alt.parts[0].atoms.length, 9, 'the word refers to every atom, the phenyl included');
  assert.equal(lexiconEn.traditionalName('benzylAlcohol'), 'benzyl alcohol');
});

test('the explanation: ring or chain, the ring prefix, the formula', () => {
  const steps = explain(named('OCCC1CCCCC1')).map((s) => s.id);
  assert.deepEqual(steps, ['count', 'group', 'ringChain', 'groupChain', 'numbering', 'substituents', 'assemble']);
  const choice = stepText('OCCC1CCCCC1', 'ringChain');
  assert.match(choice, /lo primero es el grupo principal/);
  assert.match(choice, /El anillo no lleva ningún grupo –OH y la mejor cadena abierta lleva un grupo –OH: gana la cadena/);
  assert.match(choice, /el anillo entero es un sustituyente: se nombra «ciclohexil»/);
  assert.match(stepText('CC(=O)C1=CC=CC=C1', 'ringChain'), /«fenil» \(el benceno como sustituyente\)/);
  assert.match(stepText('OCC1CCC(O)CC1', 'ringChain'), /hay empate, así que manda el anillo/);
  assert.match(stepText('OCC1CCC(O)CC1', 'ring'), /Como ninguna lleva más grupos principales que el anillo/);
  assert.match(stepText('OCCC1CCCCC1', 'groupChain'), /Sin contar los carbonos del anillo/);
  assert.doesNotMatch(stepText('CC(=O)C1=CC=CC=C1', 'groupChain'), /dobles enlaces de las ramas/, 'the benzene bonds are no outside unsaturation');
  const prefix = stepText('OCCC1C=CCCC1', 'substituents');
  assert.match(prefix, /es un anillo de 6 carbonos unido a la cadena principal por uno de sus carbonos/);
  assert.match(prefix, /empezando por el que está unido a la cadena principal, que es el 1/);
  assert.match(stepText('OCCOC1=CC=CC=C1', 'ether'), /«fenoxi» viene de «fenil»/);
  // H = 2C + 2 + N − 2π − 2·rings − X, the ring of the prefix counted.
  assert.deepEqual(atomCounts(named('OCCC1CCCCC1').structure), { carbons: 8, hydrogens: 16, halogens: {}, oxygens: 1 });
  assert.deepEqual(atomCounts(named('CC(=O)C1=CC=CC=C1').structure), { carbons: 8, hydrogens: 8, halogens: {}, oxygens: 1 });
  assert.deepEqual(atomCounts(named('NCC1=CC=CC=C1').structure), { carbons: 7, hydrogens: 9, halogens: {}, nitrogens: 1, oxygens: 0 });
});

test('review I-40a: symmetricRing is judged on the parent the whole cascade chooses, whatever the atom order', () => {
  // Three one-carbon OH branches: P4 picks the CH(OH)Cl chain (more substituents), so no multiplicative refusal.
  const name = '[4,4-bis(hidroximetil)ciclohexil]clorometanol';
  const random = seededRandom(61);
  for (const smiles of ['OCC1(CO)CCC(C(O)Cl)CC1', 'ClC(C1CCC(CC1)(CO)CO)O']) {
    assert.equal(nameOf(smiles), name, smiles);
    for (let k = 0; k < 12; k += 1) {
      assert.equal(nameMolecule(scrambleMolecule(parseSmiles(smiles), random)).name, name, smiles);
    }
  }
  // The parent itself among identical branches: still refused, in any atom order.
  for (const smiles of ['OCC1CCC(CO)CC1', 'OCC1(CO)CCCCC1']) {
    for (let k = 0; k < 12; k += 1) {
      assert.equal(nameMolecule(scrambleMolecule(parseSmiles(smiles), random)).error.reason, 'symmetricRing', smiles);
    }
  }
});

test('review I-40a: the ring-or-chain wording follows the counts (tie only when equal)', () => {
  const more = stepText('OCC1CCC(O)C(O)C1', 'ringChain');
  assert.match(more, /El anillo lleva 2 grupos –OH y la mejor rama solo lleva un grupo –OH: gana el anillo, porque lleva más/);
  assert.doesNotMatch(more, /empate, así que/);
  assert.match(stepText('OCC1CCC(O)CC1', 'ringChain'), /hay empate, así que manda el anillo/);
  // The ether step reads the same counts.
  assert.match(stepText('OCCOC1CCC(O)CC1', 'ether'), /llevan un grupo –OH cada uno: hay empate, y entonces manda el anillo/);
  assert.match(stepText('OCCOC1CCC(O)C(O)C1', 'ether'), /el anillo lleva 2 grupos –OH y la mejor cadena abierta solo un grupo –OH: gana el anillo/);
  assert.match(stepText('OC(CO)COC1CCC(O)CC1', 'ether'), /El anillo lleva un grupo –OH y la cadena de este lado lleva más, 2 grupos –OH/);
  assert.match(stepText('OCCOC1CCCCC1', 'ether'), /El anillo no lleva ningún grupo –OH y la cadena de este lado lleva más, un grupo –OH/);
});

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(53);
  for (const [smiles] of NAMED) {
    const reference = named(smiles);
    for (let k = 0; k < 8; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(result.name, reference.name, smiles);
      assert.deepEqual(result.alternatives.map((a) => a.name), reference.alternatives.map((a) => a.name), smiles);
      assert.equal(englishName(result.structure), englishName(reference.structure), smiles);
    }
  } // End of the loop over the molecules
});

test('Ordenar dibujo draws the ring prefix as a polygon hung from the chain', () => {
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

test('the seeded ring-prefix generator: deterministic, distinct, valid, varied', () => {
  const molecules = generateRingSubstituents({ count: 80, seed: 3 });
  assert.equal(molecules.length, 80);
  assert.deepEqual(generateRingSubstituents({ count: 80, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.equal(new Set(molecules.map(canonicalKey)).size, 80, 'distinct');
  const results = molecules.map((mol) => {
    assert.equal(validateForNaming(mol), null, writeSmiles(mol));
    return nameMolecule(mol);
  });
  assert.ok(results.every((r) => r.ok && r.trace[0].rule === 'RINGCHAIN'));
  assert.ok(results.some((r) => r.structure.parentKind === 'chain'), 'some chain parents');
  assert.ok(results.some((r) => /fenil/.test(r.name)), 'some fenil');
  assert.ok(results.some((r) => /ciclo[a-z]+il/.test(r.name)), 'some cycloalkyl');
  assert.ok(results.some((r) => r.name.endsWith('ona')), 'some ketones');
  assert.ok(results.some((r) => r.name.endsWith('amina')), 'some amines');
});
