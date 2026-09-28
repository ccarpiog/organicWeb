/**
 * @file Unit tests for the explanation layer (design.md §5): snapshot tests
 * of explain() for ~60 fixtures (tests/fixtures/explain-snapshots.json),
 * formula counts against the model for every fixture, glossary markup, the
 * outside-unsaturation sentence, the isopropyl names, locant-omission notes,
 * the numbering comparison and the purity of src/explain/.
 *
 * Regenerate the snapshots after a deliberate text change with
 * `UPDATE_SNAPSHOTS=1 npm test`, then review the diff.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseSmiles } from '../../src/model/smiles.js';
import { formula } from '../../src/model/molecule.js';
import { nameMolecule } from '../../src/naming/index.js';
import {
  explain, parseMarkup, plainText, joinY, firstDifference, atomCounts, GLOSSARY, STEP_TITLES,
} from '../../src/explain/explain.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FIXTURES = path.join(ROOT, 'tests', 'fixtures', 'names.tsv');
const SNAPSHOTS = path.join(ROOT, 'tests', 'fixtures', 'explain-snapshots.json');

/** Snapshot molecules (all rows of names.tsv), chosen to cover every kind of step. */
const SNAPSHOT_SMILES = [
  'C', // metano: one carbon, no chain step
  'CCCCCC', // hexano: linear
  'C=CC', // propeno: omitted locant
  'C=C=C', // propadieno: omitted locants
  'C=CC=C', // buta-1,3-dieno: connecting a
  'C#CC=CC', // pent-3-en-1-ino: N1, en before ino
  'CC(C)C', // 2-metilpropano: locant kept
  'CC(C)C(CC)CCC', // 3-etil-2-metilhexano: branched
  'CCC(C(C)C)CC', // 3-etil-2-metilpentano: P4 tie-break
  'CCC(CC)C(C)CC', // 3-etil-4-metilhexano: N4
  'CC(C)(C)C', // 2,2-dimetilpropano: symmetry, di
  'C=CC(CCC)CCC', // 4-etenilheptano: double bond outside the parent
  'C#CC(CCC)CCC', // 4-etinilheptano: triple bond outside the parent
  'C=CC(C#C)CCC', // 3-etinilhex-1-eno: P3 tie-break leaves the triple bond out
  'CCC(=C)CCC', // 3-metilidenhexano: iliden
  'CCCC(=CC)CCC', // 4-etilidenheptano: two-carbon iliden
  'CCCCC(C(C)C)CCCC', // 5-isopropilnonano: alternatives
  'CCCC(C)CC(C(C)C)CCC', // 4-isopropil-6-metilnonano: alternatives, order
  'CCCCC(=C(C)C)CCCC', // 5-isopropilidennonano: iliden alternatives
  'CCCCC(C(C)(C)C)CCCC', // 5-tert-butilnonano: retained tert-butil
  'CCCCC(CC(C)C)CCCC', // 5-(2-metilpropil)nonano: compound prefix, common name
  'CCCCC(CC(C)(C)C)(CC(C)(C)C)CCCC', // 5,5-bis(2,2-dimetilpropil)nonano: bis, inner multiplier
  'CCC(=C)C=C(C(C)CC)C(C(C)CC)C(=C)CC', // N1 then N4 across two chains
  'C1CC1', // ciclopropano: smallest ring, closure bond
  'C1CCCCC1', // ciclohexano: ring steps, CₙH₂ₙ
  'C1=CCCCC1', // ciclohexeno: ring ene, omitted locant, single numbering option
  'C1=CC=CCC1', // ciclohexa-1,3-dieno: ring N1 options, connecting a
  'C1#CCCCCCC1', // ciclooctino: ring yne
  'CC1CCCCC1', // metilciclohexano: one substituent, omitted locant
  'CCCCCCCCCCC1CC1', // decilciclopropano: ring vs chain, longer chain
  'C=C1CCCCC1', // metilidenciclohexano: iliden on a ring
  'CC1C=CCCC1', // 3-metilciclohex-1-eno: N1 then N3, locant 1 kept
  'CC1=CCCC1C', // 1,5-dimetilciclopent-1-eno: first point of difference
  'CCC1CCCC(C)C1', // 1-etil-3-metilciclohexano: ring N3 then N4
  'CC(C)C1CCC(C)CC1', // 1-isopropil-4-metilciclohexano: alternatives on a ring
  'C1=CC=CC=C1', // benceno: benzene step, Kekulé drawings, no numbers
  'CC1=CC=CC=C1', // metilbenceno: no locant, tolueno as a traditional name
  'CCCCCCCCCCC1=CC=CC=C1', // decilbenceno: ring senior to a longer chain
  'CC(C)C1=CC=CC=C1', // isopropilbenceno: alternatives on benzene
  'CCl', // clorometano: halogen prefix on one carbon, no locant (I-30)
  'ClC(Cl)Cl', // triclorometano: multiplier without locants
  'CCCl', // cloroetano: omitted locant on a two-carbon parent
  'ClC(Cl)(Cl)C(Cl)(Cl)Cl', // hexacloroetano: fully halogenated, no locants
  'CC(Br)CCl', // 2-bromo-1-cloropropano: N3 before alphabetical order
  'CC(Cl)CC(Br)C', // 2-bromo-4-cloropentano: N4 between halogens
  'CC(I)CC(C)C', // 2-metil-4-yodopentano: Spanish order, yodo under y
  'BrCC(C)C', // 1-bromo-2-metilpropano: halogens count in P4
  'C=CCCl', // 3-cloroprop-1-eno: double bond before the halogen
  'CCCC(CCl)CCCC', // 4-(clorometil)octano: halogen inside a substituent
  'ClC1CCCC(C)C1', // 1-cloro-3-metilciclohexano: halogen on a ring, N4
  'ClC1=CC=CC=C1', // clorobenceno: halogen on benzene
  'CO', // metanol: one-carbon alcohol, no locant (I-31)
  'CCO', // etanol: omitted locant, elided o
  'CC(O)C', // propan-2-ol: suffix locant
  'C=CCO', // prop-2-en-1-ol: N0 before N1
  'CC(O)CC(C)C', // 4-metilpentan-2-ol: N0 before N3
  'CCCCC(CO)CCC', // 2-propilhexan-1-ol: P0 beats a longer chain
  'OCCO', // etano-1,2-diol: diol, o kept before -diol
  'OCC(CO)CO', // 2-(hidroximetil)propano-1,3-diol: hidroxi- on a branch
  'ClCCO', // 2-cloroetan-1-ol: halogen + OH, locants cited
  'OC1CCCCC1', // ciclohexanol: ring, omitted locant
  'CC1CCCCC1O', // 2-metilciclohexan-1-ol: ring N0 then N3
  'OC1C=CCCC1', // ciclohex-2-en-1-ol: ring N0 then N1
  'OC1=CC=CC=C1', // fenol: retained name
  'C=O', // metanal: one-carbon aldehyde, formaldehído (I-32)
  'CC=O', // etanal: CHO carbon 1, uncited
  'CC(C)C=O', // 2-metilpropanal: N0 for the CHO, prefix locant cited
  'O=CCCC=O', // butanodial: -dial, o kept, no locants
  'C=CCC=O', // but-3-enal: N0 before N1
  'CC(C)=O', // propanona: omitted locant, propan-2-ona and acetona
  'CCC(C)=O', // butan-2-ona: ketone locant
  'CC(=O)CC(C)=O', // pentano-2,4-diona: -diona
  'CC=CC(C)=O', // pent-3-en-2-ona: C=O before the double bond
  'CC(=O)CCC=O', // 4-oxopentanal: aldehyde > ketone, oxo-
  'CC(=O)CCO', // 4-hidroxibutan-2-ona: ketone > alcohol, hidroxi-
  'CCC(C(C)=O)CC=O', // 3-etil-4-oxopentanal: oxo counts in P4
  'CC(=O)CC(CC(C)=O)CC(C)=O', // 4-(2-oxopropil)heptano-2,6-diona: oxo inside a branch
  'O=C1CCCCC1', // ciclohexanona: cycloalkanone, no locant
  'CC1CCCCC1=O', // 2-metilciclohexan-1-ona: ring N0 then N3
  'OC1CCC(=O)CC1', // 4-hidroxiciclohexan-1-ona: hidroxi- on a ring ketone
  'OC=O', // ácido metanoico: one-carbon acid, ácido fórmico (I-33)
  'CC(=O)O', // ácido etanoico: COOH carbon 1, uncited, ácido acético
  'CC(C)C(=O)O', // ácido 2-metilpropanoico: N0 for the COOH, prefix locant cited
  'OC(=O)CCC(=O)O', // ácido butanodioico: -dioico, o kept, no locants
  'C=CC(C)C(=O)O', // ácido 2-metilbut-3-enoico: N0 before N1
  'CC(O)C(=O)O', // ácido 2-hidroxipropanoico: acid > alcohol, hidroxi-
  'O=CCC(=O)O', // ácido 3-oxopropanoico: acid > aldehyde, terminal CHO as oxo-
  'CC(=O)CC(O)C(=O)O', // ácido 2-hidroxi-4-oxopentanoico: acid > ketone > alcohol
  'COC', // metoximetano: symmetric ether, both sides alike (I-34)
  'CCOC', // metoxietano: parent side by length, no locant
  'CC(C)OCCCC', // 1-isopropoxibutano: retained isopropoxi, three styles, functional-class name
  'CCOC=C', // etoxieteno: parent side by the double bond
  'ClCCOCC', // 1-cloro-2-etoxietano: parent side by the number of substituents
  'CCCCCOCCCCCC', // 1-(pentiloxi)hexano: long alkoxy, not contracted
  'COCCOC', // 1,2-dimetoxietano: two ether oxygens, one option each
  'COCCOCCC', // 1-(2-metoxietoxi)propano: an ether inside the alkoxy
  'ClCOC', // cloro(metoxi)metano: enclosed methoxy without locants
  'OCCOC', // 2-metoxietan-1-ol: parent side by the principal group
  'COCC(=O)O', // ácido 2-metoxietanoico: ether + acid
  'COC1CCCCC1', // metoxiciclohexano: the ring is the parent
  'COC1=CC=CC=C1', // metoxibenceno: anisol
  'C1CCCC1COC', // (metoximetil)ciclopentano: ether inside a branch
  'O=COC', // metanoato de metilo: one-carbon acid part, formiato (I-35)
  'CC(=O)OC', // etanoato de metilo: the two parts of an ester, acetato
  'CC(=O)OCCCCC', // etanoato de pentilo: the acid part wins over a longer O-bound group (P0)
  'CCCC(=O)OC(C)C', // butanoato de isopropilo: isopropilo, three styles
  'CC(C)C(=O)OC(C)(C)C', // 2-metilpropanoato de tert-butilo: branched on both sides
  'CC(=O)CC(=O)OCC', // 3-oxobutanoato de etilo: ester > ketone, oxo-
  'CC(=O)OCCO', // etanoato de 2-hidroxietilo: an OH on the O-bound group
  'CC(=O)OCC=C', // etanoato de prop-2-en-1-ilo: unsaturated O-bound group with locants
  'COCC(=O)OC', // 2-metoxietanoato de metilo: ether on the acid part
  'CN', // metanamina: one-carbon amine, metilamina (I-36)
  'CCN', // etanamina: omitted suffix locant
  'CC(N)C', // propan-2-amina: -amina on an inner carbon
  'NCCCCN', // butano-1,4-diamina: o kept before -diamina
  'CCNC', // N-metiletanamina: secondary amine, the longer side wins, N-locant
  'CN(C)C', // N,N-dimetilmetanamina: one-carbon sides alike, N,N-
  'CCCN(C)CC', // N-etil-N-metilpropan-1-amina: two different N-groups
  'CNCC(C)C', // N,2-dimetilpropan-1-amina: N and carbon locants in one prefix
  'NC1CCCCC1', // ciclohexanamina: ring amine, omitted locant
  'CNC1=CC=CC=C1', // N-metilbencenamina: N-metilanilina
  'NCCO', // 2-aminoetan-1-ol: alcohol > amine, amino-
  'CN(C)CCO', // 2-(dimetilamino)etan-1-ol: substituted amino prefix
  'CC(N)C(=O)O', // ácido 2-aminopropanoico: amino acid
  'CC(=O)OCCN', // etanoato de 2-aminoetilo: amino in the O-bound group
  'N#CCCC(=O)O', // ácido 3-cianopropanoico: acid > nitrile, ciano- with its carbon outside the chain (I-39a)
  'N#CCCOCC#N', // 3-(cianometoxi)propanonitrilo: a nitrile on a branch piece is ciano- (I-39a)
  'CC(=O)OCC#N', // etanoato de cianometilo: ciano- in the O-bound group (I-39a)
  'COC(=O)CCC(=O)O', // ácido 4-metoxi-4-oxobutanoico: acid > ester, the ester carbon in the chain (I-39c)
  'OC(=O)CC(C(=O)OC)CC(=O)O', // ácido 3-(metoxicarbonil)pentanodioico: alcoxicarbonil (I-39c)
  'CC(=O)OCC(=O)O', // ácido 2-(acetiloxi)etanoico: aciloxi (I-39c)
  'COC(=O)CC(=O)OCC', // propanodioato de etilo y metilo: a diester with two different groups (I-39c)
  'CNC(=O)CCC(=O)O', // ácido 4-(metilamino)-4-oxobutanoico: acid > amide, the amide carbon in the chain (I-39d)
  'OC(=O)CC(C(=O)NC)CC(=O)O', // ácido 3-(metilcarbamoil)pentanodioico: carbamoil (I-39d)
  'CC(=O)N(C)CC(=O)O', // ácido 2-[acetil(metil)amino]etanoico: acilamino (I-39d)
  'CC(=O)NCC(=O)N', // 2-(acetilamino)etanamida: two amides on different pieces, P4 (I-39d)
  'OCCC1CCCCC1', // 2-ciclohexiletan-1-ol: the chain carries the OH, the ring is a prefix (I-40a)
  'CC(=O)C1=CC=CC=C1', // 1-feniletan-1-ona: fenil prefix, acetofenona (I-40a)
  'NCC1=CC=CC=C1', // fenilmetanamina: one-carbon chain, bencilamina (I-40a)
  'OC(CO)C1CCC(O)CC1', // 1-(4-hidroxiciclohexil)etano-1,2-diol: the chain carries more OH than the ring (I-40a)
  'OCC1CCC(O)CC1', // 4-(hidroximetil)ciclohexan-1-ol: ring and chain tie, the ring wins (I-40a)
  'OCCC1C=CCCC1', // 2-(ciclohex-2-en-1-il)etan-1-ol: an unsaturated ring prefix (I-40a)
  'OCCOC1=CC=CC=C1', // 2-fenoxietan-1-ol: the ring on the other side of an ether O (I-40a)
  'OCC1CCC(O)C(O)C1', // 4-(hidroximetil)ciclohexano-1,2-diol: the ring carries more OH than the branch, no tie (I-40a review)
  'OC(=O)C1CCCCC1C', // ácido 2-metilciclohexano-1-carboxílico: the –COOH carbon outside the ring, -carboxílico (I-40b)
  'O=CC1=CC=CC=C1', // benzaldehído: retained name, bencenocarbaldehído as another form (I-40b)
  'OC(=O)C1CCCCC1C(=O)O', // ácido ciclohexano-1,2-dicarboxílico: two ring groups (I-40b)
  'OC(=O)C1CCCCC1CC(=O)O', // ácido 2-(carboximetil)ciclohexano-1-carboxílico: ring and chain tie, carboxi- (I-40b)
  'OC(=O)C(C(=O)O)C1CCC(C(=O)O)CC1', // ácido 2-(4-carboxiciclohexil)propanodioico: the ring –COOH counts for the ring, the chain wins (I-40b)
  'OC(=O)CC1=CC=CC=C1', // ácido 2-feniletanoico: acid on a side chain, ácido fenilacético (I-40b)
  'O=CC1CCCCC1CC=O', // 2-(2-oxoetil)ciclohexano-1-carbaldehído: a –CHO at the end of a branch is oxo, not a ketone (I-40b)
  'OC(=O)C(CC)C(=O)C1=CC=CC=C1', // ácido 2-benzoilbutanoico: ring acyl prefix (I-40b)
  'CC(=O)C(C(=O)C1CCCCC1C)C(C)=O', // 3-(2-metilciclohexano-1-carbonil)pentano-2,4-diona: -carbonil prefix (I-40b)
  'OC(=O)CCCC(=O)C1=CC=CC=C1', // ácido 5-fenil-5-oxopentanoico: the C=O at the chain end next to the ring is a ketone (review I-40b)
  'N#CC1CCCCC1C', // 2-metilciclohexano-1-carbonitrilo: the –C≡N carbon outside the ring, -carbonitrilo (I-40c)
  'CNC(=O)C1=CC=CC=C1', // N-metilbenzamida: retained name, the N group apart, bencenocarboxamida as another form (I-40c)
  'NC(=O)C1CCC(C(N)=O)CC1', // ciclohexano-1,4-dicarboxamida: two ring amides (I-40c)
  'CC(=O)NC1=CC=CC=C1', // N-feniletanamida: a ring on the amide N, N-fenilacetamida (I-40c)
  'N#CCC1=CC=CC=C1', // 2-feniletanonitrilo: nitrile on a side chain, fenilacetonitrilo (I-40c)
  'N#CCC1CCC(C#N)CC1', // 4-(cianometil)ciclohexano-1-carbonitrilo: ring and chain tie, ciano- on the branch (I-40c)
  'OC(=O)C1CCC(C(N)=O)CC1', // ácido 4-carbamoilciclohexano-1-carboxílico: carbamoil- on a ring below an acid (I-40c)
  'OC(=O)C1CCC(C#N)CC1', // ácido 4-cianociclohexano-1-carboxílico: ciano- on a ring below an acid (I-40c)
  'COC(=O)C1=CC=CC=C1', // benzoato de metilo: retained acid part, bencenocarboxilato as another form (I-40d)
  'COC(=O)C1CCCCC1C', // 2-metilciclohexano-1-carboxilato de metilo: the ester carbon outside the ring, -carboxilato (I-40d)
  'COC(=O)C1CCC(C(=O)OC)CC1', // ciclohexano-1,4-dicarboxilato de dimetilo: a ring diester (I-40d)
  'CC(=O)OC1=CC=CC=C1', // etanoato de fenilo: a ring as the O-bound group, acetato de fenilo (I-40d)
  'CC(=O)OC1CCCCC1C', // etanoato de 2-metilciclohexilo: a substituted ring group on the O (I-40d)
  'O=C(OC1=CC=CC=C1)C1=CC=CC=C1', // benzoato de fenilo: a ring on each side of the ester (I-40d)
  'COC(=O)CC1=CC=CC=C1', // 2-feniletanoato de metilo: ester on a side chain, fenilacetato (I-40d)
  'COC(=O)C1CCC(C(=O)O)CC1', // ácido 4-(metoxicarbonil)ciclohexano-1-carboxílico: alcoxicarbonil- on a ring below an acid (I-40d)
  'CC(=O)OC1CCC(C(=O)O)CC1', // ácido 4-(acetiloxi)ciclohexano-1-carboxílico: aciloxi- on a ring below an acid (I-40d)
];

/**
 * Reads the fixture table as SMILES → expected name.
 *
 * @returns {Promise<Map<string, string>>} The rows.
 */
async function readFixtures() {
  const lines = (await readFile(FIXTURES, 'utf8')).split('\n').slice(1);
  const rows = new Map();
  for (const line of lines) {
    if (line.trim() === '' || line.startsWith('#')) {
      continue;
    }
    const [smiles, name] = line.split('\t');
    rows.set(smiles, name);
  }
  return rows;
}

/**
 * Names a SMILES string and explains it.
 *
 * @param {string} smiles - The molecule.
 * @returns {{mol: object, result: object, steps: object[]}} Molecule, result and steps.
 */
function run(smiles) {
  const mol = parseSmiles(smiles);
  const result = nameMolecule(mol);
  return { mol, result, steps: explain(result) };
}

test('explain() snapshots for ~20 fixtures', async () => {
  const fixtures = await readFixtures();
  const actual = {};
  for (const smiles of SNAPSHOT_SMILES) {
    assert.ok(fixtures.has(smiles), `${smiles} must be a row of names.tsv`);
    const { result, steps } = run(smiles);
    assert.equal(result.name, fixtures.get(smiles), smiles);
    actual[smiles] = { name: result.name, steps };
  }
  if (process.env.UPDATE_SNAPSHOTS) {
    await writeFile(SNAPSHOTS, `${JSON.stringify(actual, null, 1)}\n`);
  }
  const expected = JSON.parse(await readFile(SNAPSHOTS, 'utf8'));
  assert.deepEqual(Object.keys(expected), SNAPSHOT_SMILES);
  for (const smiles of SNAPSHOT_SMILES) {
    assert.deepEqual(JSON.parse(JSON.stringify(actual[smiles])), expected[smiles], `snapshot of ${smiles}`);
  }
});

test('every fixture: steps are well-formed and the formula matches the model', async () => {
  const fixtures = await readFixtures();
  const order = Object.keys(STEP_TITLES);
  for (const smiles of fixtures.keys()) {
    const { mol, result, steps } = run(smiles);
    const { carbons, hydrogens, halogens, nitrogens = 0, oxygens } = atomCounts(result.structure);
    const count = (symbol, n) => (n === 0 ? '' : `${symbol}${n === 1 ? '' : n}`);
    const halogenPart = ['Br', 'Cl', 'F', 'I'].map((el) => count(el, halogens[el] || 0)).join('');
    // Hill order: C, H, then the halogens, N and O alphabetically.
    assert.equal(`${count('C', carbons)}${count('H', hydrogens)}${halogenPart}${count('N', nitrogens)}${count('O', oxygens)}`, formula(mol), smiles);
    assert.equal(steps[0].id, 'count');
    assert.equal(steps[steps.length - 1].id, 'assemble');
    const ids = steps.map((s) => s.id);
    assert.deepEqual([...ids].sort((a, b) => order.indexOf(a) - order.indexOf(b)), ids, `${smiles}: step order`);
    for (const step of steps) {
      assert.equal(step.title, STEP_TITLES[step.id]);
      assert.ok(step.text.length > 0, `${smiles}: ${step.id} has text`);
      const views = [step, ...(step.options || [])];
      for (const view of views) {
        for (const spec of view.highlight) {
          spec.atoms.forEach((id) => assert.ok(mol.atoms.has(id), `${smiles}: atom ${id}`));
          spec.bonds.forEach((id) => assert.ok(mol.bonds.has(id), `${smiles}: bond ${id}`));
        }
        (view.locants || []).forEach(([id]) => assert.ok(mol.atoms.has(id)));
      }
      for (const paragraph of [...step.text, ...(step.options || []).map((o) => o.text)]) {
        for (const segment of parseMarkup(paragraph)) {
          assert.ok(!segment.term || GLOSSARY[segment.term], `${smiles}: unknown glossary term ${segment.term}`);
        }
        assert.doesNotMatch(plainText(paragraph), /\[\[|\]\]|undefined|NaN|null/, `${smiles}: ${paragraph}`);
      }
    } // End of the loop over the steps
    const last = steps[steps.length - 1];
    assert.equal(last.parts.map((p) => p.text).join(''), result.name);
    assert.ok(last.text.some((t) => t.includes(`«${result.name}»`)));
  } // End of the loop over the fixtures
});

test('an unsaturation outside the parent is stated explicitly (IUPAC 2013 rule)', () => {
  const chain = (smiles) => run(smiles).steps.find((s) => s.id === 'chain');
  assert.match(chain('C=CC(CCC)CCC').text.join(' '), /El \[\[doble enlace\|enlace doble\]\] no está en la cadena principal: con las normas actuales de la IUPAC \(2013\) manda la longitud/);
  assert.match(chain('C#CC(CCC)CCC').text.join(' '), /triple enlace.*no está en la cadena principal/);
  assert.match(chain('CCC(=C)CCC').text.join(' '), /manda la longitud/);
  // Equal length: the chain with the triple bond loses a tie-break, not on length.
  const lost = chain('C=CC(C#C)CCC').text.join(' ');
  assert.match(lost, /pierde en los desempates/);
  assert.doesNotMatch(lost, /manda la longitud/);
  assert.doesNotMatch(chain('CC(C)C(CC)CCC').text.join(' '), /no está en la cadena principal/);
});

test('isopropyl: the three accepted names are explained and alternatives listed', () => {
  const { steps } = run('CCCCC(C(C)C)CCCC');
  const subs = steps.find((s) => s.id === 'substituents').text.join(' ');
  for (const name of ['«isopropil»', '«propan-2-il»', '«1-metiletil»']) {
    assert.ok(subs.includes(name), name);
  }
  const assemble = steps.find((s) => s.id === 'assemble').text.join(' ');
  assert.ok(assemble.includes('«5-(propan-2-il)nonano»: nombre preferido por la IUPAC (2013).'));
  assert.ok(assemble.includes('«5-(1-metiletil)nonano»: forma sistemática clásica.'));
});

test('locant omission and kept locants get a note', () => {
  const note = (smiles) => run(smiles).steps.find((s) => s.id === 'numbering').text.join(' ');
  assert.match(note('C=CC'), /En «propeno» no hace falta el número: el doble enlace solo puede estar en el carbono 1/);
  assert.match(note('C#C'), /En «etino» no hace falta el número/);
  assert.match(note('C=C=C'), /propadieno/);
  assert.match(note('CC(C)C'), /el número se escribe/);
  assert.doesNotMatch(note('CCCCCC'), /propeno/);
});

test('numbering: side-by-side lists and first point of difference', () => {
  const step = run('CCC(CC)C(C)CC').steps.find((s) => s.id === 'numbering');
  assert.deepEqual(step.compare, {
    labels: ['A', 'B'],
    rows: [{ rule: 'N4', label: 'Sustituyentes en orden alfabético', lists: [[3, 4], [4, 3]], firstDifference: 0, marks: [[0], [0]], winners: [0] }],
  });
  assert.match(step.text.join(' '), /en el primer número distinto, 3 es menor que 4/);
  assert.equal(step.options.length, 2);
  assert.notDeepEqual(step.options[0].locants, step.options[1].locants);
  assert.equal(firstDifference([[5, 6, 7, 3], [5, 6, 3, 7]]), 2);
  assert.equal(firstDifference([[2, 2], [2, 2]]), -1);
});

test('numbering with 3+ options: each loser is compared with the winner at its own first difference', () => {
  // A = [1, 7], B = [1, 5], C = [3, 7]: B beats A at the second number and C at the first.
  const step = run('C=CCCC(CC=C)=CCC').steps.find((s) => s.id === 'numbering');
  const text = step.text.join(' ');
  assert.doesNotMatch(text, /1 es menor que 1/);
  assert.match(text, /frente a la opción A, 5 es menor que 7/);
  assert.match(text, /frente a la opción C, 1 es menor que 3/);
  const row = step.compare.rows[0];
  assert.deepEqual(row.lists, [[1, 7], [1, 5], [3, 7]]);
  assert.deepEqual(row.winners, [1]);
  assert.deepEqual(row.marks, [[1], [0, 1], [0]]);
});

test('tie-break: every rule keeps the option labels of the chain step', () => {
  // P2 discards option 1; P3 then compares options 2 and 3 (never renamed 1 and 2).
  const { steps } = run('CCC(C#C)(C=C)CCC');
  const chain = steps.find((s) => s.id === 'chain');
  const step = steps.find((s) => s.id === 'tiebreak');
  const p3 = step.text.find((t) => t.startsWith('Si sigue el empate'));
  assert.match(p3, /opción 2: 0 enlaces dobles; opción 3: 1 enlace doble\./);
  assert.doesNotMatch(p3, /opción 1:/);
  assert.deepEqual(step.options.map((o) => o.label), chain.options.slice(0, 3).map((o) => o.label));
  assert.match(step.options[0].text, /Queda descartada/);
  assert.match(step.options[1].text, /Queda descartada/);
  assert.doesNotMatch(step.options[1].text, /Sigue en juego/);
  assert.match(step.options[2].text, /Gana/);
  assert.deepEqual(step.options.map((o) => o.highlight[0].style), ['candidate', 'candidate', 'parent']);
});

test('repeated unsaturated substituents: each occurrence is classified on its own', () => {
  // 3,4-dietinilhept-1-eno: the ethynyl on C3 lies on the other 7-C chain
  // (lost on tie-breaks); the one on C4 lies on no 7-C chain (length).
  const text = run('C=CC(C#C)C(C#C)CCC').steps.find((s) => s.id === 'chain').text.join(' ');
  assert.doesNotMatch(text, /Hay otra cadena igual de larga que los incluye/);
  assert.match(text, /manda la longitud/);
  assert.match(text, /Uno de ellos está en otra cadena igual de larga, que pierde en los desempates; el otro no está en ninguna cadena tan larga\./);
});

test('ordering explains the first differing letter and the ignored multipliers', () => {
  const order = run('CCCC(C)CC(C(C)C)CCC').steps.find((s) => s.id === 'order').text;
  assert.ok(order.includes('«isopropil» va antes que «metil» (i va antes que m).'));
  assert.ok(order.includes('«iso» sí cuenta: «isopropil» se ordena por la i.'));
  const bis = run('CCCCC(CC(C)(C)C)(CC(C)(C)C)CCCC').steps.find((s) => s.id === 'substituents').text.join(' ');
  assert.match(bis, /«bis», «tris»/);
});

test('amines: formula with N, N locants, -amina suffix and amino prefixes (I-36)', () => {
  const step = (smiles, id) => run(smiles).steps.find((s) => s.id === id);
  const all = (s) => plainText(s.text.join(' '));
  // The formula counts the N (Hill order: C, H, N, O) and says how the N is drawn.
  assert.match(all(step('CN', 'count')), /1 carbono, 5 hidrógenos y 1 átomo de nitrógeno \(CH₅N\)/);
  assert.match(all(step('CN', 'count')), /se ve como NH₂/);
  assert.match(all(step('CCNC', 'count')), /se ve como NH: lleva un hidrógeno/);
  assert.match(all(step('CN(C)CCO', 'count')), /\(C₄H₁₁NO\)/);
  // The principal amine: -amina, primary/secondary, the N never in the chain, groups on N cited with N.
  const group = all(step('CCNC', 'group'));
  assert.match(group, /sufijo «-amina»/);
  assert.match(group, /amina secundaria/);
  assert.match(group, /con la letra «N» en vez de un número/);
  assert.match(all(step('CCNC', 'groupChain')), /Decide la longitud/);
  // A one-carbon parent with groups on its N still explains which side is the parent.
  assert.match(all(step('CN(C)C', 'groupChain')), /Los lados del nitrógeno son iguales/);
  // The locant N: shown as N in the legend, never drawn as a number, not a carbon number.
  const assemble = step('CNCC(C)C', 'assemble');
  const locant = assemble.legend.find((entry) => entry.kind === 'locant' && entry.text === 'N,2');
  assert.ok(locant, 'N,2 in the legend');
  assert.match(locant.meaning, /nitrógeno/);
  assert.ok(assemble.legend.some((entry) => entry.text === '-amina' && entry.kind === 'ending'));
  assert.match(all(assemble), /la N va primero: «N,2-dimetil»/);
  const substituents = step('CNCC(C)C', 'substituents');
  assert.match(all(substituents), /En el nitrógeno y en el carbono 2 hay 2 grupos metilo/);
  assert.deepEqual(substituents.locants.map(([, n]) => n), [2]);
  assert.match(all(step('CCNC', 'numbering')), /La «N» del nombre no es el número de un carbono/);
  // Elided o and kept o before the suffix.
  assert.match(all(step('CC(N)C', 'assemble')), /La «o» final de «-ano» se quita delante de «-amina»/);
  assert.match(all(step('NCCCCN', 'assemble')), /se queda delante de «-diamina»/);
  // Not principal: amino- and the seniority order.
  assert.match(all(step('NCCO', 'group')), /alcohol > amina/);
  assert.match(all(step('CC(N)C(=O)O', 'group')), /ácido > aldehído > cetona > alcohol > amina/);
  const amino = all(step('CN(C)CCO', 'substituents'));
  assert.match(amino, /«dimetilamino» es el prefijo de una amina/);
  assert.match(amino, /entre paréntesis/);
  // Benzene: bencenamina and the retained anilina.
  assert.match(all(step('NC1=CC=CC=C1', 'group')), /«anilina» y lo prefiere/);
  assert.match(all(step('NC1CCCCC1', 'ringNumbering')), /el número no se escribe: «ciclohexanamina»/);
});

test('glossary markup helpers', () => {
  assert.deepEqual(parseMarkup('La [[cadena principal]] y los [[localizadores|localizador]].'), [
    { text: 'La ' },
    { text: 'cadena principal', term: 'cadena principal' },
    { text: ' y los ' },
    { text: 'localizadores', term: 'localizador' },
    { text: '.' },
  ]);
  assert.equal(plainText('Un [[enlace doble]].'), 'Un enlace doble.');
  assert.equal(joinY([2]), '2');
  assert.equal(joinY([2, 3]), '2 y 3');
  assert.equal(joinY([2, 3, 4]), '2, 3 y 4');
  for (const key of ['cadena principal', 'sustituyente', 'localizador', 'insaturación', 'enlace doble', 'enlace triple']) {
    assert.ok(GLOSSARY[key], key);
  }
});

test('a failed result has no steps', () => {
  assert.deepEqual(explain({ ok: false, error: { code: 'EMPTY', message: '' } }), []);
  assert.deepEqual(explain(null), []);
});

test('src/explain/ is pure: no DOM or browser globals, no coordinates', async () => {
  const source = await readFile(path.join(ROOT, 'src', 'explain', 'explain.js'), 'utf8');
  const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /\b(document|window|globalThis|localStorage|navigator)\b/);
  assert.doesNotMatch(code, /\.(x|y)\b/);
});
