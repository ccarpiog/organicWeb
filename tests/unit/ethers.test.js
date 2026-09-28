/**
 * @file Unit tests for ethers (design.md §13.4 I-34): the ether O is never
 * a chain atom nor a suffix; it splits the carbon skeleton and the parent
 * is chosen among the chains of every side with the usual rules (the
 * principal group, a ring, the length, the multiple bonds, the number of
 * substituents; symmetric sides give the same name); the other side with
 * the O is an alkoxy prefix (`metoxi`, `etoxi`, `propoxi`, `butoxi`,
 * `isopropoxi` / `propan-2-iloxi` / `1-metiletoxi`, `tert-butoxi`,
 * `(pentiloxi)`…) ordered alphabetically with the other prefixes; locant
 * omission as for halogens; ethers with each supported group; the
 * functional-class name and `anisol` as other valid forms; the refusals
 * (esters, anhydrides, peroxides, symmetric halves with the principal
 * group, cyclic ethers); both lexicons; id invariance; formula; the
 * explanation step "Reconoce el éter"; Ordenar dibujo; the oracle
 * generator. The names themselves are checked row by row in
 * tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { formula, moleculeToJSON, moleculeFromJSON } from '../../src/model/molecule.js';
import { readFile } from 'node:fs/promises';
import { adjacency } from '../../src/model/graph.js';
import {
  validateForNaming, isEtherOxygen, etherOxygens, longestCarbonChain, MESSAGES, SYMMETRIC_ETHER_MESSAGE,
  SIDE_CHAIN_ALCOHOL_MESSAGE, RING_SYSTEM_MESSAGES,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import { oxygenKind, principalKindOf } from '../../src/naming/principal.js';
import { selectParent, leafToLeafPaths } from '../../src/naming/parent.js';
import { PREFIX_STYLES, nameSubstituent } from '../../src/naming/substituent.js';
import { substituentPrefix, isContractedAlkoxy, citationKey } from '../../src/naming/render.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { explain, plainText, atomCounts } from '../../src/explain/explain.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateEthers, etherify } from '../../scripts/oracle/generate.mjs';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';

/**
 * Names a SMILES string.
 *
 * @param {string} smiles - The molecule.
 * @param {string} [prefixStyle] - Prefix style (default 'isopropil').
 * @returns {object} The naming result.
 */
function named(smiles, prefixStyle = PREFIX_STYLES[0]) {
  return nameMolecule(parseSmiles(smiles), { prefixStyle });
}

/**
 * The explanation step with a given id.
 *
 * @param {string} smiles - The molecule.
 * @param {string} id - Step id.
 * @returns {object|undefined} The step.
 */
function step(smiles, id) {
  return explain(named(smiles)).find((s) => s.id === id);
}

/**
 * All the plain text of the explanation step with a given id.
 *
 * @param {string} smiles - The molecule.
 * @param {string} id - Step id.
 * @returns {string} The step's paragraphs joined, glossary marks removed ('' when the step is absent).
 */
function stepText(smiles, id) {
  const found = step(smiles, id);
  return found ? found.text.map(plainText).join(' ') : '';
}

test('validation: an ether C–O–C is admitted; esters, anhydrides, peroxides and O on a heteroatom keep the refusal', () => {
  for (const smiles of ['COC', 'CCOCC', 'COCCOC', 'OCCOC', 'COCC(=O)O', 'O=CCCOC', 'COC1CCCCC1', 'COC1=CC=CC=C1', 'C=COC']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Anhydride, peroxide, hydroperoxide, O–Cl, amine + ether, carbonate (esters are named since I-35).
  for (const smiles of ['CC(=O)OC(C)=O', 'COOC', 'CCOO', 'COCl', 'NCCOC', 'COC(=O)OC']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'HETEROATOM', smiles);
    assert.equal(error.message, MESSAGES.HETEROATOM, smiles);
  }
  assert.match(MESSAGES.HETEROATOM, /éteres \(con un oxígeno unido a dos carbonos, C–O–C\)/);
  // A cyclic ether is a heterocycle: out of scope, whatever the ring size.
  for (const smiles of ['C1CCOC1', 'C1CO1', 'C1CCOCC1']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'RING_SYSTEM', smiles);
    assert.equal(error.message, RING_SYSTEM_MESSAGES.heterocycle);
  }
  // Which oxygens are ether oxygens: CCOC(C)=O has atoms 1 C, 2 C, 3 O (ester O), 4 C, 5 C, 6 =O.
  const roles = (smiles) => {
    const mol = parseSmiles(smiles);
    const adj = adjacency(mol);
    return [...mol.atoms.keys()].map((id) => isEtherOxygen(mol, adj, id));
  };
  assert.deepEqual(roles('CCOC'), [false, false, true, false]);
  assert.deepEqual(roles('CCOC(C)=O'), [false, false, false, false, false, false], 'an ester O is not an ether O');
  assert.deepEqual(roles('COOC'), [false, false, false, false], 'a peroxide is not an ether');
  assert.deepEqual(etherOxygens(parseSmiles('COCCOC')), [2, 5]);
}); // End of test 'validation: an ether C–O–C is admitted; esters, anhydride…'

test('size caps: a carbon chain never runs through the O, so each side has its own 30-carbon cap', () => {
  const side = 'C'.repeat(25);
  const mol = parseSmiles(`${side}O${side}`);
  assert.equal(longestCarbonChain(mol), 25);
  assert.equal(validateForNaming(mol), null, '50 carbons, two chains of 25: nameable');
  assert.equal(named(`${side}O${side}`).name, '1-(pentacosiloxi)pentacosano');
  const long = parseSmiles(`${'C'.repeat(31)}OC`);
  assert.equal(validateForNaming(long).code, 'TOO_BIG');
});

test('the ether O is never a chain atom: the parent is chosen among the chains of each side', () => {
  // CCCCOCCCC: two butyl sides; the parent is one butane, never a nine-atom "chain" through the O.
  const mol = parseSmiles('CCCCOCCCC');
  const paths = leafToLeafPaths(mol);
  assert.deepEqual(paths.map((p) => p.length), [4, 4]);
  assert.ok(paths.every((p) => p.every((id) => mol.atoms.get(id).element === 'C')));
  assert.equal(nameMolecule(mol).name, '1-butoxibutano');
  assert.equal(nameMolecule(mol).parent.atoms.length, 4);
  // A lone carbon on one side is a one-atom chain candidate (methoxy side).
  assert.deepEqual(leafToLeafPaths(parseSmiles('CCOC')), [[1, 2], [4]]);
  const selection = selectParent(parseSmiles('CCOC'));
  assert.deepEqual(selection.trace.map((s) => s.rule), ['P1']);
  assert.deepEqual(selection.trace[0].values, [2, 1]);
  // Generated ethers: no parent ever contains an O or joins two sides of an O.
  for (const mol2 of generateEthers({ count: 80, seed: 11 })) {
    const result = nameMolecule(mol2);
    assert.equal(result.ok, true, writeSmiles(mol2));
    assert.ok(result.parent.atoms.every((id) => mol2.atoms.get(id).element === 'C'), writeSmiles(mol2));
    const adj = adjacency(mol2);
    const inParent = new Set(result.parent.atoms);
    for (const oxygen of etherOxygens(mol2)) {
      const sides = adj.get(oxygen).filter((n) => inParent.has(n.atom));
      assert.ok(sides.length <= 1, `${writeSmiles(mol2)}: the parent touches the O on one side at most`);
    }
  } // End of the loop over the generated ethers
}); // End of test 'the ether O is never a chain atom: the parent is chosen a…'

test('oxygen kinds: an ether O is never principal', () => {
  const mol = parseSmiles('OCCOC');
  const adj = adjacency(mol);
  assert.deepEqual([1, 4].map((id) => oxygenKind(mol, adj, id)), ['alcohol', 'ether']);
  assert.equal(principalKindOf(mol, adj), 'alcohol');
  const ether = parseSmiles('COC');
  assert.equal(principalKindOf(ether, adjacency(ether)), null);
});

test('which side is the parent: principal group, ring, length, multiple bonds, substituents; symmetric ethers', () => {
  const cases = [
    ['OCCOCCCCC', '2-(pentiloxi)etan-1-ol', 'P0'], // the OH side, although the other side is longer
    ['CCCCCOC1CCCC1', '(pentiloxi)ciclopentano', 'RING'], // the ring, although the chain is longer
    ['CCCOC', '1-metoxipropano', 'P1'],
    ['CCOC=C', 'etoxieteno', 'P2'],
    ['ClCCOCC', '1-cloro-2-etoxietano', 'P4'],
    ['CCOCC', 'etoxietano', 'TIE'],
  ];
  for (const [smiles, name, rule] of cases) {
    const result = named(smiles);
    assert.equal(result.name, name, smiles);
    assert.ok(result.trace.some((s) => s.rule === rule), `${smiles}: ${rule} in the trace`);
  }
  assert.match(stepText('OCCOCCCCC', 'ether'), /Primero cuenta el grupo principal: el lado de la cadena principal lleva un grupo –OH y en el otro lado no hay ningún grupo –OH/);
  assert.match(stepText('CCCCCOC1CCCC1', 'ether'), /el anillo manda siempre sobre la cadena abierta/);
  assert.match(stepText('CCCOC', 'ether'), /hay una cadena de 3 carbonos; en el otro lado, la cadena más larga tiene 1 carbono\. Gana la más larga/);
  assert.match(stepText('CCOC=C', 'ether'), /igual de largas \(2 carbonos\): gana la que tiene más enlaces dobles o triples/);
  assert.match(stepText('ClCCOCC', 'ether'), /gana la que tiene más sustituyentes/);
  assert.match(stepText('CCOCC', 'ether'), /Los dos lados del oxígeno son iguales: da igual en cuál pongas la cadena principal, el nombre sale igual/);
  assert.match(stepText('COC', 'ether'), /Los dos lados del oxígeno son iguales/);
}); // End of test 'which side is the parent: principal group, ring, length,…'

test('alkoxy prefixes: contracted, retained, long and substituted forms in the three styles, both lexicons', () => {
  const forms = [
    ['CCCCOC', 'metoxi', 'methoxy'],
    ['CCCCOCC', 'etoxi', 'ethoxy'],
    ['CCCCCOCCC', 'propoxi', 'propoxy'],
    ['CCCCCCOCCCC', 'butoxi', 'butoxy'],
    ['CCCCCCCOCCCCC', 'pentiloxi', 'pentyloxy'],
    ['CCCCOC(C)C', 'isopropoxi', 'isopropoxy'],
    ['CCCCOC(C)(C)C', 'tert-butoxi', 'tert-butoxy'],
    ['CCCCCOC(C)CC', 'butan-2-iloxi', 'butan-2-yloxy'],
    ['CCCCOCC(C)C', '2-metilpropoxi', '2-methylpropoxy'],
    ['CCCCOCCCl', '2-cloroetoxi', '2-chloroethoxy'],
    ['CCCCCOC=C', 'eteniloxi', 'ethenyloxy'],
  ];
  for (const [smiles, es, en] of forms) {
    const result = named(smiles);
    const [group] = result.structure.prefixes;
    assert.equal(group.substituent.alkoxy, true, smiles);
    assert.equal(substituentPrefix(group.substituent, lexiconEs), es, smiles);
    assert.equal(substituentPrefix(group.substituent, lexiconEn), en, smiles);
  }
  assert.equal(isContractedAlkoxy(named('CCCCOCC').structure.prefixes[0].substituent), true);
  assert.equal(isContractedAlkoxy(named('CCCCCCCOCCCCC').structure.prefixes[0].substituent), false);
  // The three prefix styles of an isopropoxy group, and the English names.
  const styles = PREFIX_STYLES.map((prefixStyle) => named('CC(C)OCCCC', prefixStyle));
  assert.deepEqual(styles.map((r) => r.name), ['1-isopropoxibutano', '1-(propan-2-iloxi)butano', '1-(1-metiletoxi)butano']);
  assert.deepEqual(styles.map((r) => englishName(r.structure)), ['1-isopropoxybutane', '1-(propan-2-yloxy)butane', '1-(1-methylethoxy)butane']);
  // tert-butoxi is kept in 'pin' and becomes 1,1-dimetiletoxi in 'substituted'.
  assert.deepEqual(PREFIX_STYLES.map((prefixStyle) => named('CC(C)(C)OCCCC', prefixStyle).name),
    ['1-tert-butoxibutano', '1-tert-butoxibutano', '1-(1,1-dimetiletoxi)butano']);
  // A single substituent structure named directly from its carbon.
  const mol = parseSmiles('CCOC');
  assert.equal(substituentPrefix(nameSubstituent(mol, 2, 3), lexiconEs), 'metoxi');
  assert.equal(substituentPrefix(nameSubstituent(mol, 4, 3), lexiconEs), 'etoxi');
}); // End of test 'alkoxy prefixes: contracted, retained, long and substitut…'

test('alphabetical order with the other prefixes (Spanish words) and locant omission', () => {
  assert.equal(named('CC(C)(C)OC').name, '2-metil-2-metoxipropano', 'metil (i) before metoxi (o)');
  assert.equal(englishName(named('CC(C)(C)OC').structure), '2-methyl-2-methoxypropane', 'English follows the Spanish citation order');
  assert.equal(named('BrCC(CCOCCCC)Cl').name, '1-bromo-4-butoxi-2-clorobutano', 'bromo < butoxi < cloro');
  assert.equal(named('CC(O)CCOC').name, '4-metoxibutan-2-ol');
  assert.ok(citationKey(named('CCCCOC(C)(C)C').structure.prefixes[0].substituent, lexiconEs).alpha.startsWith('butoxi'), 'tert- is ignored');
  // Locant omission: one-carbon parents and monosubstituted two-carbon parents omit it; the rest cite it.
  assert.equal(named('COC').name, 'metoximetano');
  assert.equal(named('CCOC').name, 'metoxietano');
  assert.equal(named('COCC=C').name, '3-metoxiprop-1-eno');
  assert.equal(named('COCCOC').name, '1,2-dimetoxietano');
  assert.equal(named('COCOC').name, 'dimetoximetano');
  assert.equal(named('ClCOC').name, 'cloro(metoxi)metano', 'an alkoxy prefix among locant-less prefixes is enclosed');
  assert.equal(englishName(named('ClCOC').structure), 'chloro(methoxy)methane');
  assert.equal(named('COC(F)OC(F)OC').name, 'fluoro[fluoro(metoxi)metoxi](metoxi)metano');
  assert.equal(named('COC1CCCCC1').name, 'metoxiciclohexano');
  assert.equal(named('COC1CCCC(C)C1').name, '1-metil-3-metoxiciclohexano');
}); // End of test 'alphabetical order with the other prefixes (Spanish words…'

test('ethers with each supported group, both lexicons', () => {
  const cases = [
    ['ClCCOCC', '1-cloro-2-etoxietano', '1-chloro-2-ethoxyethane'],
    ['OCCOC', '2-metoxietan-1-ol', '2-methoxyethan-1-ol'],
    ['O=CCCOC', '3-metoxipropanal', '3-methoxypropanal'],
    ['CC(=O)CCOC', '4-metoxibutan-2-ona', '4-methoxybutan-2-one'],
    ['COCC(=O)O', 'ácido 2-metoxietanoico', '2-methoxyethanoic acid'],
    ['OC1CCCCC1OC', '2-metoxiciclohexan-1-ol', '2-methoxycyclohexan-1-ol'],
    ['O=C1CCCCC1OC', '2-metoxiciclohexan-1-ona', '2-methoxycyclohexan-1-one'],
    ['COC1=CC=CC=C1', 'metoxibenceno', 'methoxybenzene'],
    ['COCCOCCC', '1-(2-metoxietoxi)propano', '1-(2-methoxyethoxy)propane'],
    ['C1CCCC1COC', '(metoximetil)ciclopentano', '(methoxymethyl)cyclopentane'],
  ];
  for (const [smiles, es, en] of cases) {
    const result = named(smiles);
    assert.equal(result.name, es, smiles);
    assert.equal(englishName(result.structure), en, smiles);
  }
}); // End of test 'ethers with each supported group, both lexicons'

test('other valid forms: the functional-class name of a simple ether and anisol', () => {
  const alternative = (smiles, style) => (named(smiles).alternatives.find((a) => a.style === style) || {}).name;
  assert.equal(alternative('COC', 'functionalClass'), 'dimetil éter');
  assert.equal(alternative('CCOC', 'functionalClass'), 'etil metil éter');
  assert.equal(alternative('CCOCC', 'functionalClass'), 'dietil éter');
  assert.equal(alternative('CC(C)(C)OC', 'functionalClass'), 'tert-butil metil éter', 'tert- does not count for the order');
  assert.equal(alternative('CC(C)(C)OCCCC', 'functionalClass'), 'butil tert-butil éter', 'equal letters: the plain name first');
  assert.equal(alternative('CC(C)OC(C)C', 'functionalClass'), 'diisopropil éter');
  for (const smiles of ['CC(C)COCC', 'COCCOC', 'OCCOC', 'ClCCOCC', 'C=COC', 'COC1CCCCC1', 'CCC(C)OCCCCCC']) {
    assert.equal(alternative(smiles, 'functionalClass'), undefined, `${smiles}: not a simple R–O–R′`);
  }
  const main = named('CCOC');
  const last = main.alternatives[main.alternatives.length - 1];
  assert.equal(last.label, lexiconEs.styleLabel('functionalClass'));
  assert.equal(last.parts.length, 1);
  assert.equal(last.parts[0].atoms.length, 4, 'refers to every atom');
  assert.equal(alternative('COC1=CC=CC=C1', 'traditional'), 'anisol');
  assert.equal(alternative('CCOC1=CC=CC=C1', 'traditional'), undefined);
  assert.equal(alternative('CC1=CC=CC=C1', 'traditional'), 'tolueno', 'a methyl is still toluene');
  assert.equal(lexiconEn.traditionalName('anisole'), 'anisole');
}); // End of test 'other valid forms: the functional-class name of a simple…'

test('refusals: symmetric halves with the principal group, a ring with the OH on the other side, esters', () => {
  for (const smiles of ['OCCOCCO', 'OC(=O)COCC(=O)O', 'CC(=O)COCC(C)=O', 'OCOCO']) {
    const result = named(smiles);
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.code, 'HETEROATOM');
    assert.equal(result.error.reason, 'symmetricEther', smiles);
    assert.equal(result.error.message, SYMMETRIC_ETHER_MESSAGE);
    assert.ok(result.groups, 'the refusal carries the group analysis');
  }
  assert.match(SYMMETRIC_ETHER_MESSAGE, /oxidi-/);
  // Different halves, or no principal group: named substitutively.
  assert.equal(named('OCCOCCCO').name, '3-(2-hidroxietoxi)propan-1-ol');
  assert.equal(named('CCOCC').name, 'etoxietano');
  // The OH on the chain side of a ring ether: the chain would be the parent (I-40).
  const ring = named('OCCOC1CCCCC1');
  assert.equal(ring.error.reason, 'sideChainAlcohol');
  assert.equal(ring.error.message, SIDE_CHAIN_ALCOHOL_MESSAGE);
  assert.equal(named('CC(=O)OC').name, 'etanoato de metilo', 'an ester O is not an ether O: esters are named since I-35');
  assert.equal(named('CC(=O)OCC(=O)OC').error.reason, 'manyEsters');
  // Two rings joined by an O: several rings, out of scope.
  assert.equal(named('C1CCCCC1OC1CCCCC1').error.code, 'RING_SYSTEM');
}); // End of test 'refusals: symmetric halves with the principal group, a ri…'

test('formula and atom counts: an ether O adds an oxygen and changes no hydrogen count', () => {
  for (const smiles of ['COC', 'CCOCC', 'COCCOC', 'OCCOC', 'COCC(=O)O', 'ClCCOCC', 'COC1=CC=CC=C1', 'COCCOCCC']) {
    const mol = parseSmiles(smiles);
    const { carbons, hydrogens, oxygens, halogens } = atomCounts(nameMolecule(mol).structure);
    const hill = `C${carbons}H${hydrogens}${Object.entries(halogens).map(([el, n]) => `${el}${n === 1 ? '' : n}`).join('')}O${oxygens === 1 ? '' : oxygens}`;
    assert.equal(hill, formula(mol).replace(/^C(?=H)/, 'C1'), smiles);
  }
  assert.match(stepText('CCOC', 'count'), /3 carbonos, 8 hidrógenos y 1 átomo de oxígeno \(C₃H₈O\)/);
  assert.match(stepText('CCOC', 'count'), /El oxígeno unido a dos carbonos \(C–O–C\) también se ve como O: es el oxígeno de un éter y no lleva hidrógeno/);
  assert.match(stepText('OCCOC', 'count'), /El oxígeno del grupo –OH se ve como OH/);
});

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(34);
  const molecules = [...['COC', 'CCOCC', 'CCOC=C', 'ClCCOCC', 'COCCOC', 'CC(C)OCCCC', 'OCCOCCCO', 'COC1=CC=CC=C1', 'COC1CCCC(C)C1']
    .map(parseSmiles), ...generateEthers({ count: 40, seed: 5 })];
  for (const mol of molecules) {
    const expected = nameMolecule(mol);
    for (let k = 0; k < 4; k += 1) {
      const copy = scrambleMolecule(mol, random);
      const result = nameMolecule(copy);
      assert.equal(result.name, expected.name, writeSmiles(mol));
      assert.deepEqual(result.alternatives.map((a) => a.name), expected.alternatives.map((a) => a.name), writeSmiles(mol));
    }
  } // End of the loop over the molecules
}); // End of test 'names never depend on atom ids or drawing order'

test('explanation: "Reconoce el éter" highlights both sides of the O and explains the prefix', () => {
  const steps = explain(named('CCOC'));
  assert.deepEqual(steps.map((s) => s.id), ['count', 'ether', 'chain', 'numbering', 'substituents', 'assemble']);
  const ether = steps.find((s) => s.id === 'ether');
  assert.equal(ether.title, 'Reconoce el éter');
  // CCOC: atoms 1 C, 2 C, 3 O, 4 C; bonds 1 (C1–C2), 2 (C2–O), 3 (O–C4).
  assert.deepEqual(ether.highlight, [
    { atoms: [2, 1], bonds: [1], style: 'parent' },
    { atoms: [4], bonds: [], style: 'substituent' },
    { atoms: [3], bonds: [2, 3], style: 'candidate' },
  ]);
  const text = stepText('CCOC', 'ether');
  assert.match(text, /la molécula es un éter/);
  assert.match(text, /Un éter nunca es el grupo principal/);
  assert.match(text, /La cadena principal no puede pasar por el oxígeno/);
  assert.match(text, /met \+ oxi = metoxi/);
  assert.match(stepText('CCCCCOCCCCCC', 'ether'), /pentil \+ oxi = pentiloxi/);
  assert.match(stepText('CC(C)OCCCC', 'ether'), /«isopropoxi» viene de «isopropil».*«propan-2-iloxi».*«1-metiletoxi»/);
  assert.match(stepText('OCCOC', 'ether'), /^Además, tu molécula tiene un oxígeno unido a dos carbonos/);
  // Two ether oxygens on the parent: one option each, both highlighted in the step.
  const two = step('COCCOC', 'ether');
  assert.equal(two.options.length, 2);
  assert.deepEqual(two.options.map((o) => o.label), ['Oxígeno 1 de 2', 'Oxígeno 2 de 2']);
  assert.equal(two.highlight.filter((h) => h.style === 'candidate').length, 2);
  // An ether inside a branch or inside the alkoxy group.
  assert.match(stepText('C1CCCC1COC', 'ether'), /El éter está dentro de una rama/);
  assert.match(stepText('COCCOCCC', 'ether'), /Otro oxígeno entre dos carbonos está dentro de un sustituyente/);
  // Other steps: chain never through the O, substituents, order, legend, assembly.
  assert.match(stepText('CCOC', 'chain'), /La cadena no puede atravesar el oxígeno de un éter/);
  assert.match(stepText('CCOC', 'substituents'), /«metoxi» es el prefijo de un éter/);
  assert.match(stepText('ClCCOCC', 'order'), /«cloro» va antes que «etoxi»/);
  assert.match(stepText('CCOC', 'assemble'), /«etil metil éter»: nombre de clase funcional/);
  assert.match(stepText('ClCOC', 'substituents'), /se escribe «\(metoxi\)»/);
  const legend = step('CCOC', 'assemble').legend.find((l) => l.text === 'metoxi');
  assert.match(legend.meaning, /un éter, el oxígeno y el grupo de 1 carbono/);
  assert.match(stepText('COC1=CC=CC=C1', 'benzene'), /el éter va delante como prefijo \(«metoxi-»\)/);
  // No ether: no ether step.
  assert.equal(step('CCO', 'ether'), undefined);
}); // End of test 'explanation: "Reconoce el éter" highlights both sides of…'

test('Ordenar dibujo lays out ethers', () => {
  for (const smiles of ['COC', 'CCOC', 'COCCOC', 'CC(C)(C)OCC(C)CC', 'C1CCCCC1OC', 'COC1=CC=CC=C1', 'COCCOCCOCCOC']) {
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
}); // End of test 'Ordenar dibujo lays out ethers'

test('oracle generator: deterministic ethers, all named in every style, one or two inserted oxygens', () => {
  const first = generateEthers({ count: 60, seed: 3 }).map(writeSmiles);
  assert.deepEqual(generateEthers({ count: 60, seed: 3 }).map(writeSmiles), first);
  assert.equal(first.length, 60);
  for (const smiles of first) {
    const mol = parseSmiles(smiles);
    assert.ok(etherOxygens(mol).length >= 1, smiles);
    for (const prefixStyle of PREFIX_STYLES) {
      assert.equal(nameMolecule(mol, { prefixStyle }).ok, true, `${smiles} ${prefixStyle}`);
    }
  }
  assert.equal(nameMolecule(etherify(parseSmiles('CC'), seededRandom(1), 1)).name, 'metoximetano');
  assert.equal(writeSmiles(etherify(parseSmiles('C1CC1'), seededRandom(1), 1)), writeSmiles(parseSmiles('C1CC1')), 'ring bonds are never used');
}); // End of test 'oracle generator: deterministic ethers, all named in ever…'

/**
 * Copies a molecule with two atom ids swapped (bond endpoints included).
 *
 * @param {object} mol - The molecule.
 * @param {number} a - One atom id.
 * @param {number} b - The other atom id.
 * @returns {object} The copy.
 */
function swapIds(mol, a, b) {
  const json = moleculeToJSON(mol);
  const swap = (id) => (id === a ? b : id === b ? a : id);
  json.atoms.forEach((atom) => { atom.id = swap(atom.id); });
  json.bonds.forEach((bond) => { bond.a = swap(bond.a); bond.b = swap(bond.b); });
  const restored = moleculeFromJSON(json);
  assert.equal(restored.ok, true);
  return restored.mol;
}

test('polyethers: the parent choice never falls to atom ids (review I-34)', () => {
  const mol = parseSmiles('COCOCOCOCOC');
  const expected = nameMolecule(mol).name;
  assert.equal(expected, '(metoximetoxi)[(metoximetoxi)metoxi]metano');
  assert.equal(nameMolecule(swapIds(mol, 3, 5)).name, expected, 'swapping atoms 3 and 5');
  const random = seededRandom(77);
  for (const smiles of ['COCOCOCOCOC', 'COCOCOCOC', 'COCCOCCOCCOC', 'COC(OC)COCOCOC', 'CCOCOCOCC']) {
    const name = named(smiles).name;
    for (let k = 0; k < 30; k += 1) {
      assert.equal(nameMolecule(scrambleMolecule(parseSmiles(smiles), random)).name, name, smiles);
    }
  }
}); // End of test 'polyethers: the parent choice never falls to atom ids (review I-34)'

test('every ether fixture keeps its name under random id permutations', async () => {
  const text = await readFile(new URL('../fixtures/names.tsv', import.meta.url), 'utf8');
  const lines = text.split('\n');
  const start = lines.findIndex((line) => line.startsWith('# Ethers (I-34)'));
  const rows = lines.slice(start + 1).filter((line) => line.trim() !== '' && !line.startsWith('#')).map((line) => line.split('\t'));
  assert.ok(rows.length >= 30);
  const random = seededRandom(2024);
  for (const [smiles, name] of rows) {
    for (let k = 0; k < 10; k += 1) {
      assert.equal(nameMolecule(scrambleMolecule(parseSmiles(smiles), random)).name, name, smiles);
    }
  }
}); // End of test 'every ether fixture keeps its name under random id permutations'
