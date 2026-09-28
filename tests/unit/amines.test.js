/**
 * @file Unit tests for amines (design.md §13.4 I-36): an amine nitrogen
 * (one to three single bonds to carbons that are not C=O carbons) is the
 * least senior suffix group (ácido > éster > aldehído > cetona > alcohol >
 * amina), cited `-amina` with its chain locants; the N is never a chain
 * atom, so the chains on every side of it compete for the parent and the
 * groups left on the N are prefixes with the locant `N` (`N-metiletanamina`,
 * `N,N-dimetilmetanamina`, `N,2-dimetilpropan-1-amina`); below a more
 * senior group it is the `amino-` prefix (`2-aminoetan-1-ol`,
 * `2-(dimetilamino)etan-1-ol`); ring amines and `bencenamina` (`anilina`);
 * the traditional alkylamine names; the refusals (ammonium, heterocycles,
 * amides, nitriles, imines, N–N, N–O, N-substituted polyamines, symmetric
 * amines, side-chain amines on rings); both lexicons; id invariance and
 * Ordenar dibujo. The names themselves are checked row by row in
 * tests/fixtures/names.tsv; the explanation in tests/unit/explain.test.js
 * and the oracle generator in tests/unit/oracle.test.js.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSmiles } from '../../src/model/smiles.js';
import { addAtom, addBond, createMolecule } from '../../src/model/molecule.js';
import { adjacency } from '../../src/model/graph.js';
import {
  validateForNaming, validateStructure, isAmineNitrogen, amineNitrogens, hasNameableHeteroatoms, MESSAGES,
  SIDE_CHAIN_AMINE_MESSAGE, SUBSTITUTED_POLYAMINE_MESSAGE, SYMMETRIC_AMINE_MESSAGE, RING_SYSTEM_MESSAGES,
} from '../../src/model/validate.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  groupKindOf, principalKindOf, isPrincipalOxygen, isSuffixOxygen, NAMED_KINDS,
} from '../../src/naming/principal.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { renderName, carbonLocantPrefixes, hasNitrogenLocants, citationKey } from '../../src/naming/render.js';
import { N_LOCANT, locantText, locantValue } from '../../src/naming/structure.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import { englishName } from '../../scripts/oracle/compare.mjs';
import { scrambleMolecule, seededRandom } from '../../scripts/oracle/generate.mjs';
import { canonicalLayout, layoutProblems } from '../../src/layout/canonical.js';

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

test('validation: amine nitrogens are admitted; amides, nitriles, imines, NH₃, N–N, N–O and N–halogen keep the refusal', () => {
  for (const smiles of ['CN', 'CNC', 'CN(C)C', 'NCCN', 'C=CN', 'ClCCN', 'NCCO', 'CN(C)CCO', 'CC(N)C(=O)O', 'NCC(=O)OC',
    'CC(=O)OCCN', 'COCCN', 'NCCCC=O', 'NC1CCCCC1', 'NC1=CC=CC=C1', 'CN(C)C1=CC=CC=C1', 'NC1CCCCC1O', 'OC1CCC(CN)CC1']) {
    assert.equal(validateForNaming(parseSmiles(smiles)), null, smiles);
  }
  // Amide, nitrile, imine, ammonia, hydrazine, hydroxylamine, N-chloro amine, an N on a C=O carbon of a carbamate.
  for (const smiles of ['CC(N)=O', 'CC(=O)NC', 'CC#N', 'CC=NC', 'N', 'CNN', 'CNO', 'CNCl', 'COC(N)=O']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'HETEROATOM', smiles);
    assert.equal(error.message, MESSAGES.HETEROATOM, smiles);
  }
  assert.match(MESSAGES.HETEROATOM, / y aminas \(con un nitrógeno unido a uno, dos o tres carbonos por enlaces sencillos, como el –NH₂\)\.$/);
  const mol = parseSmiles('CC(=O)NCCN');
  const adj = adjacency(mol);
  const nitrogens = [...mol.atoms.keys()].filter((id) => mol.atoms.get(id).element === 'N');
  assert.deepEqual(nitrogens.map((id) => isAmineNitrogen(mol, adj, id)), [false, true], 'an amide N is not an amine N');
  assert.deepEqual(amineNitrogens(mol), [nitrogens[1]]);
  assert.equal(hasNameableHeteroatoms(mol, [...nitrogens, 3]), false);
});

test('ammonium and heterocycles are excluded: a charge is invalid, a fourth bond is a valence error, an N in a ring is RING_SYSTEM', () => {
  // A charged N (an ammonium salt) is never part of the model.
  const charged = parseSmiles('CN');
  [...charged.atoms.values()].find((atom) => atom.element === 'N').charge = 1;
  assert.equal(validateStructure(charged).code, 'INVALID');
  assert.equal(nameMolecule(charged).ok, false);
  // A quaternary N (four carbons) would need a charge: a valence error, not a name.
  const quaternary = createMolecule();
  const n = addAtom(quaternary, {}, 'N');
  for (let k = 0; k < 4; k += 1) {
    addBond(quaternary, n, addAtom(quaternary));
  }
  const error = validateForNaming(quaternary);
  assert.equal(error.code, 'VALENCE');
  assert.equal(error.message, 'Este nitrógeno tendría más de 3 enlaces.');
  // An N inside a ring is a heterocycle, refused before the amine checks.
  for (const smiles of ['C1CCNCC1', 'C1CCNC1', 'CN1CCCC1', 'C1=CC=NC=C1']) {
    const ring = validateForNaming(parseSmiles(smiles));
    assert.equal(ring.code, 'RING_SYSTEM', smiles);
    assert.equal(ring.message, RING_SYSTEM_MESSAGES.heterocycle, smiles);
  }
});

test('refusals: side-chain amine on a ring, N-substituted polyamines, symmetric amines carrying the principal group', () => {
  // With a ring and the amine principal, every N must be on a ring carbon (fenilmetanamina waits for I-40).
  for (const smiles of ['NCC1CCCCC1', 'NCC1=CC=CC=C1', 'NC1CCC(CN)CC1', 'CNCC1CCCCC1']) {
    const error = validateForNaming(parseSmiles(smiles));
    assert.equal(error.code, 'HETEROATOM', smiles);
    assert.equal(error.reason, 'sideChainAmine', smiles);
    assert.equal(error.message, SIDE_CHAIN_AMINE_MESSAGE);
    assert.ok(error.sideChain.length >= 1);
    assert.ok(named(smiles).groups, 'the refusal carries the group analysis');
  }
  // With an OH on the ring the amine is a prefix and may sit on a branch.
  assert.equal(nameOf('OC1CCC(CN)CC1'), '4-(aminometil)ciclohexan-1-ol');
  // Several amine groups on the parent and a group on some N: N¹/N² locants, not supported.
  for (const smiles of ['NCCNC', 'CNCCNC', 'CN(C)CCN(C)C', 'NCCNCCN', 'CNCNC']) {
    const result = named(smiles);
    assert.equal(result.ok, false, smiles);
    assert.equal(result.error.reason, 'substitutedPolyamine', smiles);
    assert.equal(result.error.message, SUBSTITUTED_POLYAMINE_MESSAGE);
    assert.ok(result.error.atoms.every((id) => parseSmiles(smiles).atoms.get(id).element === 'N'));
  }
  // Diamines without N-groups are named.
  assert.equal(nameOf('NCCN'), 'etano-1,2-diamina');
  // Identical parts joined by a non-principal N, each with the principal group: multiplicative names.
  for (const smiles of ['OCCNCCO', 'OCCN(C)CCO', 'OCCN(CCO)CCO', 'O=CCNCC=O']) {
    const result = named(smiles);
    assert.equal(result.error.reason, 'symmetricAmine', smiles);
    assert.equal(result.error.message, SYMMETRIC_AMINE_MESSAGE);
  }
  // Identical parts without the principal group, or different parts, are named.
  assert.equal(nameOf('CN(C)CCO'), '2-(dimetilamino)etan-1-ol');
  assert.equal(nameOf('OCCNCCCO'), '3-[(2-hidroxietil)amino]propan-1-ol');
  // Refusal messages read as Spanish sentences for a student.
  for (const message of [SIDE_CHAIN_AMINE_MESSAGE, SUBSTITUTED_POLYAMINE_MESSAGE, SYMMETRIC_AMINE_MESSAGE]) {
    assert.match(message, /^Esta molécula tiene /);
    assert.match(message, /\.$/);
  }
});

test('principal kind: the amine is the least senior suffix group', () => {
  assert.deepEqual(NAMED_KINDS, ['acid', 'ester', 'aldehyde', 'ketone', 'alcohol', 'amine']);
  const mol = parseSmiles('NCCO');
  const adj = adjacency(mol);
  const [n, , , o] = [...mol.atoms.keys()];
  assert.equal(groupKindOf(mol, adj, n), 'amine');
  assert.equal(groupKindOf(mol, adj, o), 'alcohol');
  assert.equal(groupKindOf(mol, adj, 2), null, 'a carbon');
  assert.equal(principalKindOf(mol, adj), 'alcohol');
  assert.equal(isPrincipalOxygen(mol, adj, n, 'alcohol'), false);
  const amine = parseSmiles('CNC');
  const amineAdj = adjacency(amine);
  assert.equal(principalKindOf(amine, amineAdj), 'amine');
  assert.equal(isPrincipalOxygen(amine, amineAdj, 2, 'amine'), true);
  assert.equal(isSuffixOxygen(amine, amineAdj, 2, 'amine'), true);
  // Seniority against every oxygen group: the other group is the suffix, the amine amino-.
  const pairs = [
    ['NCCO', '2-aminoetan-1-ol'],
    ['NCCC=O', '3-aminopropanal'],
    ['NCCC(C)=O', '4-aminobutan-2-ona'],
    ['NCC(=O)O', 'ácido 2-aminoetanoico'],
    ['NCC(=O)OC', '2-aminoetanoato de metilo'],
    ['NCCOC', '2-metoxietan-1-amina'],
    ['NCCCl', '2-cloroetan-1-amina'],
  ];
  for (const [smiles, name] of pairs) {
    assert.equal(nameOf(smiles), name, smiles);
  }
});

test('N-substitution: the senior chain carries the suffix, the other groups on the N get the locant N', () => {
  const expected = [
    ['CNC', 'N-metilmetanamina'],
    ['CCNC', 'N-metiletanamina'],
    ['CCNCC', 'N-etiletanamina'],
    ['CN(C)C', 'N,N-dimetilmetanamina'],
    ['CCCN(C)CC', 'N-etil-N-metilpropan-1-amina'],
    ['CCCCNCCC', 'N-propilbutan-1-amina'],
    ['CC(C)NCCC', 'N-isopropilpropan-1-amina'],
    ['CNCC(C)C', 'N,2-dimetilpropan-1-amina'],
    ['CN(C)CC(C)C', 'N,N,2-trimetilpropan-1-amina'],
    ['ClCCNC', '2-cloro-N-metiletan-1-amina'],
    ['ClCNC', '1-cloro-N-metilmetanamina'],
    ['C=CCNC', 'N-metilprop-2-en-1-amina'],
    ['CCNC=C', 'N-etiletenamina'],
    ['CN(C)C1CCCCC1', 'N,N-dimetilciclohexanamina'],
    ['CNC1=CC=CC=C1', 'N-metilbencenamina'],
    ['CC(Cl)NC(C)Br', 'N-(1-bromoetil)-1-cloroetan-1-amina'],
  ];
  for (const [smiles, name] of expected) {
    assert.equal(nameOf(smiles), name, smiles);
  }
  // Longer side first (P1), then unsaturation (P2), then more substituents (P4): the other sides go on the N.
  assert.equal(nameOf('CCCCNC'), 'N-metilbutan-1-amina');
  assert.equal(nameOf('C=CCNCCC'), 'N-propilprop-2-en-1-amina');
  assert.equal(nameOf('ClCCNCC'), '2-cloro-N-etiletan-1-amina');
  // Structure: one suffix group whose heteroatom is the N; the N-groups have the locant N_LOCANT and the N as carrying atom.
  const result = named('CCCN(C)CC');
  const n = [...parseSmiles('CCCN(C)CC').atoms.values()].find((atom) => atom.element === 'N').id;
  assert.equal(result.structure.suffix.kind, 'amine');
  assert.deepEqual(result.structure.suffix.locants.map((site) => [site.locant, site.attachAtom]), [[1, n]]);
  assert.equal(result.parent.atoms.length, 3);
  assert.ok(result.structure.prefixes.every((group) => group.locants.every((site) => site.locant === N_LOCANT && site.atom === n)));
  assert.deepEqual(result.parts.filter((p) => p.kind === 'locant').map((p) => p.text), ['N', 'N', '1']);
  assert.ok(result.parts.filter((p) => p.text === 'N').every((p) => p.atoms.includes(n)), 'an N locant points at the nitrogen');
});

test('the N locant: cited N, compared as lower than any number, never omitted', () => {
  assert.equal(locantText(N_LOCANT), 'N');
  assert.equal(locantValue('N'), N_LOCANT);
  assert.equal(locantValue('3'), 3);
  assert.ok(N_LOCANT < 1);
  // N,2-dimetil: one group, the N locant first.
  const grouped = named('CNCC(C)C');
  const [methyl] = grouped.structure.prefixes;
  assert.deepEqual(methyl.locants.map((site) => site.locant), [N_LOCANT, 2]);
  assert.equal(hasNitrogenLocants(grouped.structure.prefixes), true);
  assert.deepEqual(carbonLocantPrefixes(grouped.structure.prefixes).map((g) => g.locants.map((s) => s.locant)), [[2]]);
  assert.equal(hasNitrogenLocants(named('CCCN').structure.prefixes), false);
  // Omission ignores the N-groups: etanamina, N-metiletanamina, ciclohexanamina, N-metilciclohexanamina.
  assert.equal(nameOf('CCNC'), 'N-metiletanamina');
  assert.equal(nameOf('CNC1CCCCC1'), 'N-metilciclohexanamina');
  assert.equal(nameOf('CNC1CCCCC1C'), 'N,2-dimetilciclohexan-1-amina');
  // The citation key of a prefix inside another sorts on its letters (dimetilamino under d).
  assert.equal(citationKey(named('CN(C)CCO').structure.prefixes[0].substituent).alpha, 'dimetilamino');
});

test('primary amines, diamines, amines on rings and benzene', () => {
  const expected = [
    ['CN', 'metanamina'],
    ['CCN', 'etanamina'],
    ['CCCN', 'propan-1-amina'],
    ['CC(N)C', 'propan-2-amina'],
    ['CC(C)(C)N', '2-metilpropan-2-amina'],
    ['NCCCCN', 'butano-1,4-diamina'],
    ['NC(CN)CN', 'propano-1,2,3-triamina'],
    ['NC(N)C', 'etano-1,1-diamina'],
    ['NCC(N)C(N)CN', 'butano-1,2,3,4-tetramina'],
    ['C=CN', 'etenamina'],
    ['NC1CCCCC1', 'ciclohexanamina'],
    ['NC1CC1', 'ciclopropanamina'],
    ['NC1CCC(N)CC1', 'ciclohexano-1,4-diamina'],
    ['NC1C=CCCC1', 'ciclohex-2-en-1-amina'],
    ['NC1=CC=CC=C1', 'bencenamina'],
  ];
  for (const [smiles, name] of expected) {
    assert.equal(nameOf(smiles), name, smiles);
  }
  // A benzene with an NH2 and another substituent is polysubstituted: refused as before.
  assert.equal(named('NC1=CC=CC=C1C').error.code, 'CYCLE');
});

test('amino prefixes: NH2, substituted amino groups, amino inside branches and inside an ester group', () => {
  const expected = [
    ['NCCO', '2-aminoetan-1-ol'],
    ['CNCCO', '2-(metilamino)etan-1-ol'],
    ['CN(C)CCO', '2-(dimetilamino)etan-1-ol'],
    ['CN(CC)CCO', '2-[etil(metil)amino]etan-1-ol'],
    ['OCC(N)CO', '2-aminopropano-1,3-diol'],
    ['NCC(O)CN', '1,3-diaminopropan-2-ol'],
    ['CNCC(O)CNC', '1,3-bis(metilamino)propan-2-ol'],
    ['CC(N)C(=O)O', 'ácido 2-aminopropanoico'],
    ['NCC(=O)OC', '2-aminoetanoato de metilo'],
    ['CC(=O)OCCN', 'etanoato de 2-aminoetilo'],
    ['CC(=O)OCCN(C)C', 'etanoato de 2-(dimetilamino)etilo'],
    ['NC1CCCCC1O', '2-aminociclohexan-1-ol'],
    ['OC1CCC(CN)CC1', '4-(aminometil)ciclohexan-1-ol'],
  ];
  for (const [smiles, name] of expected) {
    assert.equal(nameOf(smiles), name, smiles);
  }
  const amino = named('CN(CC)CCO').structure.prefixes[0].substituent;
  assert.equal(amino.amino, true);
  assert.equal(amino.chain, null);
  assert.equal(amino.atoms[0], amino.nitrogen);
  assert.deepEqual(amino.prefixes.map((g) => g.substituent.chain.length), [2, 1], 'etil, then metil');
});

test('amines in both lexicons: Spanish «-amina», English «-amine», N locants, amino prefixes', () => {
  const expected = [
    ['CN', 'methanamine'],
    ['CC(N)C', 'propan-2-amine'],
    ['NCCCCN', 'butane-1,4-diamine'],
    ['CCNC', 'N-methylethanamine'],
    ['CN(C)C', 'N,N-dimethylmethanamine'],
    ['CNCC(C)C', 'N,2-dimethylpropan-1-amine'],
    ['NC1CCCCC1', 'cyclohexanamine'],
    ['NC1=CC=CC=C1', 'benzenamine'],
    ['NCCO', '2-aminoethan-1-ol'],
    ['CN(CC)CCO', '2-[ethyl(methyl)amino]ethan-1-ol'],
    ['CC(=O)OCCN', '2-aminoethyl ethanoate'],
  ];
  for (const [smiles, name] of expected) {
    assert.equal(englishName(named(smiles).structure), name, smiles);
  }
  assert.equal(renderName(named('CNC1=CC=CC=C1').structure, lexiconEn, { traditional: 'aniline' }).name, 'N-methylaniline');
});

test('other valid forms: anilina, alkylamine names and the prefix styles on the N', () => {
  const alternatives = (smiles) => named(smiles).alternatives.map((a) => `${a.style}=${a.name}`);
  assert.deepEqual(alternatives('NC1=CC=CC=C1'), ['traditional=anilina']);
  assert.deepEqual(alternatives('CN(C)C1=CC=CC=C1'), ['traditional=N,N-dimetilanilina']);
  assert.equal(named('NC1=CC=CC=C1').alternatives[0].label, 'nombre tradicional, que la IUPAC (2013) conserva como preferido');
  assert.deepEqual(alternatives('CN'), ['amineClass=metilamina']);
  assert.deepEqual(alternatives('CN(C)C'), ['amineClass=trimetilamina']);
  assert.deepEqual(alternatives('CCN(C)C'), ['amineClass=etildimetilamina']);
  assert.deepEqual(alternatives('CC(C)(C)NC(C)(C)C'), ['amineClass=di-tert-butilamina']);
  assert.deepEqual(alternatives('CC(C)NCCC'), [
    'pin=N-(propan-2-il)propan-1-amina', 'substituted=N-(1-metiletil)propan-1-amina', 'amineClass=isopropilpropilamina',
  ]);
  // Only a lone N with simple alkyl groups gets an alkylamine name.
  for (const smiles of ['NCCN', 'NC1CCCCC1', 'NCCO', 'ClCCN', 'C=CCN', 'CC(C)CN', 'CNCC(C)C']) {
    assert.ok(named(smiles).alternatives.every((a) => a.style !== 'amineClass'), smiles);
  }
  const alt = named('CCNC').alternatives.find((a) => a.style === 'amineClass');
  assert.equal(alt.name, 'etilmetilamina');
  assert.equal(alt.parts.length, 1);
  assert.equal(alt.parts[0].atoms.length, 4);
});

test('names never depend on atom ids or drawing order', () => {
  const random = seededRandom(36);
  for (const smiles of ['CCN', 'CC(N)C', 'CNC', 'CN(C)C', 'CCCN(C)CC', 'CC(C)NCCC', 'CNCC(C)C', 'NCCCCN', 'CN(CC)CCO',
    'CC(Cl)NC(C)Br', 'NC1CCC(N)CC1', 'CN(C)C1=CC=CC=C1', 'CC(=O)OCCN(C)C', 'NCCNC', 'OCCNCCO', 'NCC1CCCCC1']) {
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

test('Ordenar dibujo lays out amines', () => {
  for (const smiles of ['CN', 'CNC', 'CN(C)C', 'CCCN(C)CC', 'CN(CC)CCO', 'NC1CCCCC1', 'CNC1=CC=CC=C1', 'CC(=O)OCCN(C)C']) {
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
