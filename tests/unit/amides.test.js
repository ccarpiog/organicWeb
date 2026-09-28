/**
 * @file Unit tests for amides (design.md §13.4 I-37): the amide group
 * –C(=O)–N is one characteristic group, never a ketone and an amine; it sits
 * below acids and esters and above aldehydes (ácido > éster > amida >
 * aldehído > cetona > alcohol > amina), is cited `-amida` with its locant
 * never written (its carbon is a chain end, carbon 1), and the groups on its
 * N are prefixes with the locant `N` (`N-metiletanamida`,
 * `N,N-dimetiletanamida`, `N-etil-N-metilpropanamida`); other groups are
 * prefixes (`4-oxopentanamida`, `3-hidroxibutanamida`, `2-aminopropanamida`);
 * `formamida` / `acetamida` under "Otras formas válidas"; the refusals
 * (`ringAmide`, `manyAmides`, `substitutedPolyamide`, `imide`; the amide
 * prefixes of `amidePrefix` are named since I-39d,
 * tests/unit/amide-prefixes.test.js); both lexicons; the explanation; id invariance and Ordenar dibujo;
 * the oracle generator. The names themselves are also checked row by row in
 * tests/fixtures/names.tsv.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles, writeSmiles } from '../../src/model/smiles.js';
import { adjacency, canonicalKey } from '../../src/model/graph.js';
import {
  validateForNaming, isAmideCarbon, amideRole, amideCarbons, imideNitrogens, isAmineNitrogen, carbonylKind,
  hasNameableHeteroatoms, MESSAGES, RING_AMIDE_MESSAGE, AMIDE_PREFIX_MESSAGE, MANY_AMIDES_MESSAGE,
  SUBSTITUTED_POLYAMIDE_MESSAGE, IMIDE_MESSAGE, SYMMETRIC_AMINE_MESSAGE,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  groupKindOf, oxygenKind, principalKindOf, isPrincipalOxygen, isSuffixOxygen, carbonylTraditionalId, NAMED_KINDS,
} from '../../src/naming/principal.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { renderName, suffixGroupIds, TERMINAL_SUFFIXES } from '../../src/naming/render.js';
import { N_LOCANT } from '../../src/naming/structure.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { lexiconEs } from '../../src/naming/lexicon.es.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom, generateAmides, amidate, randomHydrocarbon } from '../../scripts/oracle/generate.mjs';
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
 * The atom ids of a molecule with a given element, in id order.
 *
 * @param {object} mol - A molecule.
 * @param {string} element - Element symbol.
 * @returns {number[]} The ids.
 */
function idsOf(mol, element) {
  return [...mol.atoms.values()].filter((atom) => atom.element === element).map((atom) => atom.id);
}

test('validation: open-chain amides are admitted; ureas, carbamates, hydrazides and N-halo amides keep the generic refusal', () => {
  for (const smiles of ['NC=O', 'CC(N)=O', 'CC(=O)NC', 'CC(=O)N(C)C', 'NC(=O)CCC(N)=O', 'NC(=O)C(N)=O', 'C=CC(N)=O',
    'CC(=O)CCC(N)=O', 'CC(N)C(N)=O', 'CC(=O)NCCO', 'NC(=O)CCOC']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Urea, carbamate, hydrazide, N-chloro amide, a hydroxamic acid ester: not amides (another heteroatom on X or on N).
  for (const smiles of ['NC(=O)N', 'COC(N)=O', 'CC(=O)NN', 'CC(=O)NCl', 'CC(=O)NOC']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'HETEROATOM', smiles);
    assert.equal(error.message, MESSAGES.HETEROATOM, smiles);
    assert.equal(error.reason, undefined, smiles);
  }
  assert.match(MESSAGES.HETEROATOM, /, amidas \(con el grupo –CONH₂: un C=O unido a un nitrógeno\) y nitrilos/);
});

test('an amide is one group: its C=O is never a ketone, its N never an amine', () => {
  const mol = parseSmiles('CC(=O)NC');
  const adj = adjacency(mol);
  const [c1, c2, o, n, c3] = [...mol.atoms.keys()];
  assert.equal(isAmideCarbon(mol, adj, c2), true);
  assert.equal(isAmideCarbon(mol, adj, c1), false);
  assert.equal(amideRole(mol, adj, o), 'carbonyl');
  assert.equal(amideRole(mol, adj, n), 'nitrogen');
  assert.equal(amideRole(mol, adj, c3), null);
  assert.equal(carbonylKind(mol, adj, o), null, 'not a ketone C=O');
  assert.equal(isAmineNitrogen(mol, adj, n), false, 'not an amine N');
  assert.equal(oxygenKind(mol, adj, o), 'amide');
  assert.equal(groupKindOf(mol, adj, n), 'amide');
  assert.equal(principalKindOf(mol, adj), 'amide');
  assert.equal(isPrincipalOxygen(mol, adj, n, 'amide'), true);
  assert.equal(isSuffixOxygen(mol, adj, o, 'amide'), true, 'the C=O oxygen stands for the group');
  assert.equal(isSuffixOxygen(mol, adj, n, 'amide'), false, 'the N travels with it');
  assert.deepEqual(amideCarbons(mol), [c2]);
  assert.equal(hasNameableHeteroatoms(mol, [o, n]), true);
  // The name never contains a ketone suffix or an amine suffix.
  for (const smiles of ['CC(=O)NC', 'CCC(=O)N(C)C', 'CC(=O)NCC', 'CCCC(=O)NCCC']) {
    const result = named(smiles);
    assert.equal(result.structure.suffix.kind, 'amide', smiles);
    assert.doesNotMatch(result.name, /ona|amina|oxo|amino/, smiles);
  }
  // The suffix site carries the N; the group ids cover the C, O and N.
  const result = named('CC(=O)NC');
  const [site] = result.structure.suffix.locants;
  assert.deepEqual([site.locant, site.atom, site.attachAtom, site.amideNitrogen], [1, c2, o, n]);
  assert.deepEqual(new Set(suffixGroupIds(result.structure.suffix).atoms), new Set([c2, o, n]));
  assert.ok(TERMINAL_SUFFIXES.includes('amide'));
});

test('seniority: ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina', () => {
  // The nitrile (I-38) sits between the amide and the aldehyde.
  assert.deepEqual(NAMED_KINDS, ['acid', 'ester', 'amide', 'nitrile', 'aldehyde', 'ketone', 'alcohol', 'amine']);
  const pairs = [
    ['CC(=O)CCC(N)=O', '4-oxopentanamida'],
    ['O=CCC(N)=O', '3-oxopropanamida'],
    ['CC(O)CC(N)=O', '3-hidroxibutanamida'],
    ['CC(N)C(N)=O', '2-aminopropanamida'],
    ['NCCC(=O)NC', '3-amino-N-metilpropanamida'],
    ['NC(=O)CCOC', '3-metoxipropanamida'],
    ['ClCC(N)=O', '2-cloroetanamida'],
  ];
  for (const [smiles, name] of pairs) {
    assert.equal(nameOf(smiles), name, smiles);
  }
  // An acid or an ester outranks the amide: since I-39d the amide is a prefix (amino…oxo, carbamoil-, acilamino-).
  const senior = [
    ['NC(=O)CC(=O)O', 'ácido 3-amino-3-oxopropanoico'],
    ['NC(=O)CC(=O)OC', '3-amino-3-oxopropanoato de metilo'],
    ['CC(=O)NCC(=O)O', 'ácido 2-(acetilamino)etanoico'],
    ['CC(=O)NCC(=O)OC', '2-(acetilamino)etanoato de metilo'],
  ];
  for (const [smiles, name] of senior) {
    assert.equal(nameOf(smiles), name, smiles);
  }
});

test('simple amides, diamides and unsaturated amides: the amide carbon is carbon 1, never cited', () => {
  const expected = [
    ['NC=O', 'metanamida'],
    ['CC(N)=O', 'etanamida'],
    ['CCC(N)=O', 'propanamida'],
    ['CC(C)C(N)=O', '2-metilpropanamida'],
    ['CC(C)(C)C(N)=O', '2,2-dimetilpropanamida'],
    ['CCCCC(CC)C(N)=O', '2-etilhexanamida'],
    ['NC(=O)C(N)=O', 'etanodiamida'],
    ['NC(=O)CCC(N)=O', 'butanodiamida'],
    ['NC(=O)CC(C)CC(N)=O', '3-metilpentanodiamida'],
    ['C=CC(N)=O', 'prop-2-enamida'],
    ['CC=CC(N)=O', 'but-2-enamida'],
    ['C#CC(N)=O', 'prop-2-inamida'],
  ];
  for (const [smiles, name] of expected) {
    assert.equal(nameOf(smiles), name, smiles);
  }
  const result = named('CC(C)C(N)=O');
  assert.equal(result.structure.suffix.locants[0].locant, 1);
  assert.equal(result.parent.atoms.length, 3, 'the amide carbon is counted in the chain');
  assert.ok(result.parts.filter((p) => p.kind === 'locant').every((p) => p.text !== '1'), 'its locant is never written');
});

test('N-substitution: groups on the N are prefixes with the locant N, never chain atoms', () => {
  const expected = [
    ['CC(=O)NC', 'N-metiletanamida'],
    ['CC(=O)N(C)C', 'N,N-dimetiletanamida'],
    ['CCC(=O)N(C)CC', 'N-etil-N-metilpropanamida'],
    ['CN(C)C=O', 'N,N-dimetilmetanamida'],
    ['CNC=O', 'N-metilmetanamida'],
    ['CC(C)C(=O)NC', 'N,2-dimetilpropanamida'],
    ['CCCCN(C)C(C)=O', 'N-butil-N-metiletanamida'],
    ['CCC(=O)NC(C)C', 'N-isopropilpropanamida'],
    ['CC(=O)NCCO', 'N-(2-hidroxietil)etanamida'],
    ['CCC(C)C(=O)N(CC)CC', 'N,N-dietil-2-metilbutanamida'],
    ['ClCC(=O)NC', '2-cloro-N-metiletanamida'],
  ];
  for (const [smiles, name] of expected) {
    assert.equal(nameOf(smiles), name, smiles);
  }
  // A longer group on the N does not become the parent: the parent must carry the amide (P0).
  const mol = parseSmiles('CCCCN(C)C(C)=O');
  const result = nameMolecule(mol);
  const [n] = idsOf(mol, 'N');
  assert.equal(result.parent.atoms.length, 2);
  assert.ok(result.structure.prefixes.every((g) => g.locants.every((site) => site.locant === N_LOCANT && site.atom === n)));
  assert.deepEqual(result.parts.filter((p) => p.kind === 'locant').map((p) => p.text), ['N', 'N']);
  assert.ok(result.parts.filter((p) => p.text === 'N').every((p) => p.atoms.includes(n)), 'an N locant points at the nitrogen');
  // Prefix styles apply to the groups on the N.
  assert.equal(nameOf('CCC(=O)NC(C)C'), 'N-isopropilpropanamida');
  assert.equal(named('CCC(=O)NC(C)C', 'pin').name, 'N-(propan-2-il)propanamida');
  assert.equal(named('CCC(=O)NC(C)C', 'substituted').name, 'N-(1-metiletil)propanamida');
});

test('refusals: rings, amide prefixes, more than two amides, N-substituted diamides and imides', () => {
  const refusals = [
    ['NC(=O)C1CCCCC1', 'ringAmide', RING_AMIDE_MESSAGE],
    ['NC(=O)C1=CC=CC=C1', 'ringAmide', RING_AMIDE_MESSAGE],
    ['CC(=O)NC1=CC=CC=C1', 'ringAmide', RING_AMIDE_MESSAGE],
    ['CC(=O)NC1CCCCC1', 'ringAmide', RING_AMIDE_MESSAGE],
    ['NC(=O)CCC1CC1', 'ringAmide', RING_AMIDE_MESSAGE],
    // Amide prefixes are named since I-39d; two amides joined by an amine N into equal halves are multiplicative.
    ['NC(=O)CNCC(N)=O', 'symmetricAmine', SYMMETRIC_AMINE_MESSAGE],
    ['NC(=O)CC(C(N)=O)CC(N)=O', 'manyAmides', MANY_AMIDES_MESSAGE],
    ['NC(=O)CCC(=O)NCC(N)=O', 'substitutedPolyamide', SUBSTITUTED_POLYAMIDE_MESSAGE],
    ['CNC(=O)CCC(N)=O', 'substitutedPolyamide', SUBSTITUTED_POLYAMIDE_MESSAGE],
    ['CN(C)C(=O)C(=O)N(C)C', 'substitutedPolyamide', SUBSTITUTED_POLYAMIDE_MESSAGE],
    ['CC(=O)NC(C)=O', 'imide', IMIDE_MESSAGE],
    ['CC(=O)N(C)C(C)=O', 'imide', IMIDE_MESSAGE],
    ['CC(=O)NC=O', 'imide', IMIDE_MESSAGE],
  ];
  for (const [smiles, reason, message] of refusals) {
    const result = named(smiles);
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.code, 'HETEROATOM', smiles);
    assert.equal(result.error.reason, reason, smiles);
    assert.equal(result.error.message, message, smiles);
    assert.ok(result.groups, `${smiles}: the refusal carries the group analysis`);
  }
  assert.deepEqual(validateForNaming(parseSmiles('CC(=O)NC(C)=O')).imides, [4]);
  assert.deepEqual(imideNitrogens(parseSmiles('CC(=O)NC')), []);
  // Every message is Spanish, names the group and says why.
  for (const message of [RING_AMIDE_MESSAGE, AMIDE_PREFIX_MESSAGE, MANY_AMIDES_MESSAGE, SUBSTITUTED_POLYAMIDE_MESSAGE, IMIDE_MESSAGE]) {
    assert.match(message, /amida|imida/);
    assert.match(message, /sé (nombrar|hacerlo)/);
  }
  // A lactam is a heterocycle: out of scope as before.
  assert.equal(named('O=C1CCCN1').error.code, 'RING_SYSTEM');
});

test('refusals are explained in the stepper like the others', () => {
  for (const smiles of ['NC(=O)C1CCCCC1', 'NC(=O)CC(C(N)=O)CC(N)=O', 'CNC(=O)CCC(N)=O', 'CC(=O)NC(C)=O']) {
    const result = named(smiles);
    const steps = explain(result);
    assert.ok(steps.length > 0, smiles);
    const text = steps.flatMap((step) => step.text.map(plainText)).join(' ');
    assert.ok(text.includes(result.error.message), `${smiles}: the refusal message is shown`);
  }
});

test('traditional names: formamida and acetamida, also with groups on the N', () => {
  const alternatives = (smiles) => named(smiles).alternatives.map((a) => `${a.style}=${a.name}`);
  assert.deepEqual(alternatives('NC=O'), ['traditional=formamida']);
  assert.deepEqual(alternatives('CC(N)=O'), ['traditional=acetamida']);
  assert.deepEqual(alternatives('CC(=O)NC'), ['traditional=N-metilacetamida']);
  assert.deepEqual(alternatives('CN(C)C=O'), ['traditional=N,N-dimetilformamida']);
  assert.equal(named('CC(N)=O').alternatives[0].label, 'nombre tradicional, que la IUPAC (2013) conserva como preferido');
  // Not for a substituted acetyl part, a longer chain, an unsaturated or a diamide.
  for (const smiles of ['CCC(N)=O', 'ClCC(N)=O', 'NC(=O)C(N)=O', 'C=CC(N)=O', 'NCC(N)=O']) {
    assert.ok(named(smiles).alternatives.every((a) => a.style !== 'traditional'), smiles);
    assert.equal(carbonylTraditionalId(named(smiles).structure), null, smiles);
  }
  // The traditional word refers to the parent and the whole amide group; the N prefixes keep their own parts.
  const alt = named('CC(=O)NC').alternatives[0];
  assert.deepEqual(alt.parts.map((p) => p.text), ['N', '-', 'metil', 'acetamida']);
  assert.equal(alt.parts[3].atoms.length, 4, 'two carbons, the O and the N');
});

test('amides in both lexicons: Spanish «-amida», English «-amide», N locants', () => {
  const expected = [
    ['NC=O', 'methanamide'],
    ['CC(N)=O', 'ethanamide'],
    ['CC(C)C(N)=O', '2-methylpropanamide'],
    ['NC(=O)CCC(N)=O', 'butanediamide'],
    ['C=CC(N)=O', 'prop-2-enamide'],
    ['CC(=O)NC', 'N-methylethanamide'],
    ['CC(=O)N(C)C', 'N,N-dimethylethanamide'],
    ['CCC(=O)N(C)CC', 'N-ethyl-N-methylpropanamide'],
    ['CC(C)C(=O)NC', 'N,2-dimethylpropanamide'],
    ['CC(=O)CCC(N)=O', '4-oxopentanamide'],
    ['CC(N)C(N)=O', '2-aminopropanamide'],
  ];
  for (const [smiles, name] of expected) {
    assert.equal(englishName(named(smiles).structure), name, smiles);
  }
  assert.equal(renderName(named('CN(C)C=O').structure, lexiconEn, { traditional: 'formamide' }).name, 'N,N-dimethylformamide');
  assert.equal(renderName(named('CC(N)=O').structure, lexiconEn, { traditional: 'acetamide' }).name, 'acetamide');
  assert.equal(lexiconEs.traditionalName('acetamide'), 'acetamida');
  assert.equal(lexiconEn.traditionalName('formamide'), 'formamide');
});

test('the explanation: one amide group, carbon 1, N locants, formula', () => {
  const result = named('CC(=O)NC');
  const steps = explain(result);
  const byId = new Map(steps.map((step) => [step.id, step]));
  const group = byId.get('group').text.map(plainText).join(' ');
  assert.match(group, /–CONH–/);
  assert.match(group, /no es una cetona, ni su nitrógeno una amina/);
  assert.match(group, /«-amida»/);
  assert.match(group, /letra «N»/);
  assert.match(group, /«N-metilacetamida»/);
  const count = byId.get('count').text.map(plainText).join(' ');
  assert.match(count, /C₃H₇NO/);
  assert.match(count, /se ve como NH: lleva un hidrógeno/);
  assert.match(byId.get('numbering').text.map(plainText).join(' '), /El carbono del grupo amida siempre es el 1/);
  assert.match(byId.get('assemble').text.map(plainText).join(' '), /El grupo amida no lleva número/);
  assert.deepEqual(atomCounts(named('NC(=O)CCC(N)=O').structure), { carbons: 4, hydrogens: 8, halogens: {}, nitrogens: 2, oxygens: 2 });
  assert.deepEqual(atomCounts(named('CN(C)C=O').structure), { carbons: 3, hydrogens: 7, halogens: {}, nitrogens: 1, oxygens: 1 });
  // Every step of a range of amides renders without placeholders.
  for (const smiles of ['NC=O', 'CC(N)=O', 'CN(C)C=O', 'CC(C)C(=O)NC', 'NC(=O)CCC(N)=O', 'CC(=O)CCC(N)=O', 'NCCC(=O)NC',
    'CC(=O)NCCO', 'CCCCN(C)C(C)=O', 'C=CC(N)=O', 'NC(=O)CCOC', 'ClCC(N)=O']) {
    for (const step of explain(named(smiles))) {
      for (const paragraph of step.text) {
        assert.doesNotMatch(plainText(paragraph), /undefined|NaN|null|\[\[|\]\]/, `${smiles}: ${paragraph}`);
      }
    }
  }
  // A ketone next to the amide: explained as a prefix under the amide.
  const oxo = explain(named('CC(=O)CCC(N)=O')).find((step) => step.id === 'group').text.map(plainText).join(' ');
  assert.match(oxo, /ácido > éster > amida > aldehído > cetona > alcohol > amina/);
  assert.match(oxo, /Aquí manda la amida/);
});

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(37);
  for (const smiles of ['NC=O', 'CC(N)=O', 'CC(=O)NC', 'CN(C)C=O', 'CCC(=O)N(C)CC', 'CC(C)C(=O)NC', 'NC(=O)CCC(N)=O',
    'CC(=O)CCC(N)=O', 'NCCC(=O)NC', 'CC(=O)NCCO', 'CCC(=O)NC(C)C', 'CC(=O)NC(C)=O', 'NC(=O)C1CCCCC1']) {
    const reference = named(smiles);
    for (let k = 0; k < 8; k += 1) {
      const result = nameMolecule(scrambleMolecule(parseSmiles(smiles), random));
      assert.equal(result.ok, reference.ok, smiles);
      assert.equal(result.ok ? result.name : result.error.reason, reference.ok ? reference.name : reference.error.reason, smiles);
      assert.deepEqual((result.alternatives || []).map((a) => a.name), (reference.alternatives || []).map((a) => a.name), smiles);
      if (result.ok) {
        assert.equal(englishName(result.structure), englishName(reference.structure), smiles);
      }
    }
  } // End of the loop over the molecules
});

test('Ordenar dibujo lays out amides', () => {
  for (const smiles of ['NC=O', 'CC(=O)NC', 'CN(C)C=O', 'CCC(=O)N(C)CC', 'NC(=O)CCC(N)=O', 'CC(=O)NCCO']) {
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

test('the seeded amide generator: deterministic, distinct, valid, varied', () => {
  const molecules = generateAmides({ count: 120, seed: 3 });
  assert.equal(molecules.length, 120);
  assert.deepEqual(generateAmides({ count: 120, seed: 3 }).map(writeSmiles), molecules.map(writeSmiles), 'deterministic');
  assert.notDeepEqual(generateAmides({ count: 120, seed: 4 }).map(writeSmiles), molecules.map(writeSmiles));
  assert.equal(new Set(molecules.map(canonicalKey)).size, 120, 'distinct');
  const names = [];
  for (const mol of molecules) {
    const smiles = writeSmiles(mol);
    assert.equal(validateForNaming(mol), null, smiles);
    assert.ok(amideCarbons(mol).length > 0, `${smiles}: at least one amide`);
    for (const style of PREFIX_STYLES) {
      assert.equal(nameMolecule(mol, { prefixStyle: style }).ok, true, `${smiles} (${style})`);
    }
    names.push(nameMolecule(mol).name);
  } // End of the loop over the generated amides
  assert.ok(names.some((name) => /^N-/.test(name)), 'some are N-substituted');
  assert.ok(names.some((name) => /N,N-|N-\w+-N-/.test(name)), 'some carry two groups on the N');
  assert.ok(names.some((name) => /diamida$/.test(name)), 'some are diamides');
  assert.ok(names.some((name) => /oxo|hidroxi|amino|cloro|bromo|fluoro|yodo|oxi/.test(name)), 'some combine the amide with other groups');
  // amidate() never mutates its input and adds one C=O and one N per amide.
  const base = randomHydrocarbon(seededRandom(5), { size: 4, unsaturation: 0 });
  const before = writeSmiles(base);
  const amide = amidate(base, seededRandom(2), 1);
  assert.equal(writeSmiles(base), before);
  assert.equal(amideCarbons(amide).length, 1);
  assert.equal(idsOf(amide, 'N').length, 1);
  assert.equal(idsOf(amide, 'O').length, 1);
});
