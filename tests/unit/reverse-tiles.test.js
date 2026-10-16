/**
 * @file Unit tests for the tile catalogue of «¿Cómo se dibuja?»
 * (src/reverse/tiles.js, design.md §15.4, §15.5.1, phase R-1a), and the
 * rules every src/reverse/ module follows: texts from the lexicon, no
 * DOM, from the engine only what each module needs (the lexicon; the
 * molecule model and its caps for build.js, R-1b; nameMolecule() for
 * index.js; never render.js or the engine's grouping), and the bundler's
 * syntax subset (scripts/build.mjs; index.html reaches only the modules
 * the «¿Cómo se dibuja?» dialog imports, so every one is bundled here).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, mkdir, copyFile, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import {
  TILES, tileById, tileId, toTiles, START_ID, END_ID, RING_ID, BENZENE_ID, PHENYL_ID, POSITIONAL_IDS, HALOGEN_IDS, TEMPLATES,
  templateGroupWord, MAX_NUM, MAX_MULT, PHENOL_ID, CLOSING_ID, HYDROXY_ID, OL_ID, isPhenolTemplate, ALKOXY_ID, groupPlural,
  ETHER_CLASS_ID, OXO_ID, FORMYL_ID, AL_ID, ONA_ID, CARBALDEHYDE_ID, BENZALDEHYDE_ID, SUFFIX_GROUPS, GROUP_WORD_PARENTS, isAtomGroup,
  atomGroupOrder, atomGroupElement, ACETYL_ID, BENZOYL_ID, ACYL_ID, RING_CARBONYL_ID, ACYL_RETAINED, isAcylTile, isChainTemplate,
  isCarbonylTemplate, templateSuffix, templateLength, ACID_WORD_ID, OICO_ID, CARBOXYLIC_ID, BENZOIC_ID, CARBOXY_ID, isAcidSuffix,
  suffixBondAmount, parentWordName, ACID_KIND, ACID_GROUP, isAcidTemplate, OATO_ID, CARBOXYLATE_ID, BENZOATE_ID, ESTER_ALKYL_ID,
  ESTER_KIND, ESTER_GROUP, isEsterSuffix, isEsterTemplate, NITRILO_ID, CARBONITRILE_ID, BENZONITRILE_ID, CYANO_ID, NITRILE_KIND,
  NITRILE_GROUP, isNitrileSuffix, suffixElement, isNitrileTemplate, AMINA_ID, NITROGEN_ID, N_VALUE, N_TEXT, AMINE_KIND,
  isAmineSuffix, NITROGEN_VALENCE, AMINE_NITROGEN_FREE, AMINO_ID, AMINO_KIND, AMINO_ELEMENT, isAminoTile, isAmineTemplate,
  isAmineClassWord, AMINE_GROUP, AMINE_CLASS_GROUPS, templateAdmits, AMIDA_ID, CARBOXAMIDE_ID, BENZAMIDE_ID, AMIDE_KIND, AMIDE_GROUP,
  AMIDE_NITROGEN, isAmideSuffix, isNitrogenSuffix, withArticle,
} from '../../src/reverse/tiles.js';
import {
  stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, RETAINED_PREFIXES, ENCLOSING_MARKS, RING_PREFIX, BENZENE_NAME,
  TRADITIONAL_NAMES, POSITIONAL_LETTERS, HALOGEN_PREFIXES, GROUP_PREFIXES, GROUP_SUFFIXES, PHENOL_STEM, BENZENE_DIGROUP_NAMES,
  ALKOXY_ENDING, ETHER_CLASS_WORD, RING_GROUP_SUFFIXES, BENZENE_GROUP_NAMES, FORMYL_PREFIX, ACETYL_PREFIX, BENZOYL_PREFIX, ACYL_ENDING,
  RING_CARBONYL_ENDING, SUFFIX_CLASS_WORDS, ESTER_ALKYL_ENDING,
} from '../../src/naming/lexicon.es.js';
import { MAX_CONTRACTED_ALKOXY as RENDER_MAX_CONTRACTED_ALKOXY } from '../../src/naming/render.js';
import { MAX_CONTRACTED_ALKOXY } from '../../src/reverse/assemble.js';
import { bundleModules } from '../../scripts/build.mjs';
import { N_LOCANT, locantText } from '../../src/naming/structure.js';
import { VALENCES } from '../../src/model/elements.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REVERSE = path.join(ROOT, 'src', 'reverse');

/**
 * The JavaScript files of src/reverse/.
 *
 * @returns {Promise<string[]>} File names.
 */
async function reverseFiles() {
  return (await readdir(REVERSE)).filter((file) => file.endsWith('.js'));
}

test('catalogue: every tile kind of design.md §15.5.1 with its range', () => {
  const count = (kind) => TILES.filter((tile) => tile.kind === kind).length;
  assert.equal(MAX_NUM, 30);
  assert.equal(MAX_MULT, 30);
  assert.equal(count('num'), 30); // NUM 1–30
  assert.equal(count('mult'), 29); // di…triaconta
  assert.equal(count('cmult'), 29); // bis…triacontakis
  assert.equal(count('root'), 30); // met…triacont
  assert.equal(count('ending'), 3);
  assert.equal(count('freeValence'), 2);
  // isopropil, isopropiliden, tert-butil; fenil (R-4b); formil (R-5c1); acetil, benzoil (R-5c2); carboxi (R-5d1); ciano (R-6b1);
  // amino (R-6c2)
  assert.equal(count('retained'), 10);
  assert.equal(count('start'), 1);
  assert.equal(count('end'), 1);
  assert.equal(count('ring'), 1); // ciclo (R-4a)
  // benceno (R-4b), fenol (R-5a2), benzaldehído (R-5c1), benzoico (R-5d1), benzoato (R-6a1), benzonitrilo (R-6b1), benzamida (R-6d1)
  assert.equal(count('benzene'), 7);
  assert.equal(count('positional'), 3); // o, m, p (R-4c)
  // tolueno, estireno, xileno, mesitileno (R-4c); anisol (R-5b); cresol…hidroquinona (R-5a3a); formaldehído…tereftalaldehído (R-5c3a);
  // fórmico…tereftálico (R-5d2); formiato, acetato, fenilacetato (R-6a2a); acetonitrilo, fenilacetonitrilo, ftalonitrilo (R-6b2);
  // anilina, bencilamina (R-6c3)
  assert.equal(count('template'), 33);
  assert.equal(count('halogen'), 4); // fluoro, cloro, bromo, yodo (R-5a1)
  assert.equal(count('hydroxy'), 1); // hidroxi (R-5a2)
  // ol (R-5a2); al, ona, carbaldehído (R-5c1); oico, carboxílico (R-5d1); oato, carboxilato (R-6a1); nitrilo, carbonitrilo (R-6b1);
  // amina (R-6c1); amida, carboxamida (R-6d1)
  assert.equal(count('suffix'), 13);
  assert.equal(count('nitrogen'), 1); // the locant N (R-6c1)
  assert.equal(count('carbonyl'), 1); // oxo (R-5c1)
  assert.equal(count('closing'), 1); // 1(n) (R-5a2)
  assert.equal(count('alkoxy'), 1); // oxi (R-5b)
  assert.equal(count('classWord'), 1); // éter (R-5b2)
  assert.equal(count('acyl'), 2); // oil, carbonil (R-5c2)
  assert.equal(count('suffixClass'), 1); // ácido (R-5d1)
  assert.equal(count('esterAlkyl'), 1); // ilo (R-6a1)
  assert.equal(new Set(TILES.map((tile) => tile.id)).size, TILES.length, 'ids are unique');
  assert.equal(new Set(TILES.map((tile) => tile.text)).size, TILES.length, 'texts are unique');
  assert.ok(TILES.every((tile) => Object.isFrozen(tile)));
}); // End of test 'catalogue: every tile kind of design.md §15.5.1 with its range'

test('every tile text comes from the lexicon (numbers are digits)', () => {
  for (const tile of TILES) {
    const expected = {
      num: () => String(tile.value),
      mult: () => multiplier(tile.value),
      cmult: () => compoundMultiplier(tile.value),
      root: () => stem(tile.value),
      ending: () => ENDINGS[tile.value],
      freeValence: () => FREE_VALENCE_SUFFIXES[tile.value],
      // `formil` (R-5c1), `acetil` and `benzoil` (R-5c2): the lexicon's acyl prefixes; the other retained words,
      // RETAINED_PREFIXES.
      // `carboxi` (R-5d1): the lexicon's prefix of an acid; `ciano` (R-6b1), of a nitrile; `amino` (R-6c2), of an amine.
      retained: () => ({
        formyl: FORMYL_PREFIX, acetyl: ACETYL_PREFIX, benzoyl: BENZOYL_PREFIX, carboxy: GROUP_PREFIXES.acid, cyano: GROUP_PREFIXES.nitrile,
        [AMINO_KIND]: GROUP_PREFIXES.amine,
      }[tile.value] || `${RETAINED_PREFIXES[tile.value].italic}${RETAINED_PREFIXES[tile.value].text}`),
      start: () => ENCLOSING_MARKS[0][0],
      end: () => ENCLOSING_MARKS[0][1],
      ring: () => RING_PREFIX,
      benzene: () => ({
        phenol: `${PHENOL_STEM}${GROUP_SUFFIXES.alcohol}`,
        benzaldehyde: `${BENZENE_GROUP_NAMES.aldehyde.stem}${BENZENE_GROUP_NAMES.aldehyde.ending}`, // R-5c1
        benzoic: `${BENZENE_GROUP_NAMES.acid.stem}${BENZENE_GROUP_NAMES.acid.ending}`, // R-5d1
        benzoate: `${BENZENE_GROUP_NAMES.ester.stem}${BENZENE_GROUP_NAMES.ester.ending}`, // R-6a1
        benzonitrile: `${BENZENE_GROUP_NAMES.nitrile.stem}${BENZENE_GROUP_NAMES.nitrile.ending}`, // R-6b1
        benzamide: `${BENZENE_GROUP_NAMES.amide.stem}${BENZENE_GROUP_NAMES.amide.ending}`, // R-6d1
      }[tile.value] || BENZENE_NAME),
      positional: () => POSITIONAL_LETTERS[tile.value],
      // `xileno`: the word of `1,2-xileno` without the locants the student writes on number tiles; `cresol` (R-5a3a) that of
      // `o-cresol` without its letter; the diols (R-5a3a) the lexicon's words of benzene with two OH groups; the retained acid
      // names (R-5d2) without the class word, a tile of its own (`ácido acético` → `acético`).
      template: () => (TEMPLATES[tile.value].id
        ? TRADITIONAL_NAMES[TEMPLATES[tile.value].id].replace(/^(?:1,2|o)-/, '').replace(`${SUFFIX_CLASS_WORDS.acid} `, '')
        : BENZENE_DIGROUP_NAMES[tile.value]),
      halogen: () => HALOGEN_PREFIXES[tile.value],
      hydroxy: () => GROUP_PREFIXES[tile.value],
      // `carbaldehído` (R-5c1), `carboxílico` (R-5d1), `carboxilato` (R-6a1), `carbonitrilo` (R-6b1), `carboxamida` (R-6d1): the
      // suffixes of a –CHO, a –COOH, a –COO–, a –C≡N and a –CONH₂ outside a ring parent.
      suffix: () => ({
        carbaldehyde: RING_GROUP_SUFFIXES.aldehyde, carboxylic: RING_GROUP_SUFFIXES.acid, carboxylate: RING_GROUP_SUFFIXES.ester,
        carbonitrile: RING_GROUP_SUFFIXES.nitrile, carboxamide: RING_GROUP_SUFFIXES.amide,
      }[tile.value] || GROUP_SUFFIXES[tile.value]),
      carbonyl: () => GROUP_PREFIXES[tile.value], // `oxo` (R-5c1)
      closing: () => `1${ENCLOSING_MARKS[0][0]}n${ENCLOSING_MARKS[0][1]}`,
      nitrogen: () => locantText(N_LOCANT), // `N` (R-6c1): the engine's own text of its locant
      alkoxy: () => ALKOXY_ENDING,
      classWord: () => ETHER_CLASS_WORD, // `éter` (R-5b2)
      acyl: () => (tile.value === 'ring' ? RING_CARBONYL_ENDING : ACYL_ENDING), // `carbonil`, `oil` (R-5c2)
      suffixClass: () => SUFFIX_CLASS_WORDS[tile.value], // `ácido` (R-5d1)
      esterAlkyl: () => `${FREE_VALENCE_SUFFIXES[tile.value]}${ESTER_ALKYL_ENDING}`, // `ilo` (R-6a1)
    }[tile.kind]();
    assert.equal(tile.text, expected, tile.id);
  } // End of the loop over the tiles
  assert.deepEqual(TILES.filter((t) => t.kind === 'retained').map((t) => t.text), ['isopropil', 'isopropiliden', 'tert-butil', 'fenil',
    'benzoil', 'formil', 'acetil', 'carboxi', 'ciano', 'amino']);
  // R-6b1: the nitrile tiles, their groups (a nitrogen triple-bonded to the group's carbon), and `benzonitrilo` quoted as it is.
  assert.deepEqual([CYANO_ID, NITRILO_ID, CARBONITRILE_ID, BENZONITRILE_ID].map((id) => [tileById(id).text, tileById(id).kind,
    tileById(id).value, tileById(id).row]), [['ciano', 'retained', 'cyano', 'groups'], ['nitrilo', 'suffix', 'nitrile', 'groups'],
    ['carbonitrilo', 'suffix', 'carbonitrile', 'groups'], ['benzonitrilo', 'benzene', 'benzonitrile', 'rings']]);
  assert.deepEqual([NITRILO_ID, CARBONITRILE_ID].map((id) => SUFFIX_GROUPS[tileById(id).value]), [
    { kind: 'nitrile', outside: false, order: 3, terminal: true, element: 'N' },
    { kind: 'nitrile', outside: true, order: 3, terminal: false, element: 'N' }]);
  assert.deepEqual(['nitrile', 'carbonitrile', 'acid', 'ester'].map(isNitrileSuffix), [true, true, false, false]);
  assert.deepEqual(['nitrile', 'carbonitrile'].map((value) => suffixBondAmount(SUFFIX_GROUPS[value])), [3, 1]);
  assert.deepEqual(['nitrile', 'carbonitrile', 'alcohol', 'acid', 'ester'].map((value) => suffixElement(SUFFIX_GROUPS[value])),
    ['N', 'N', 'O', 'O', 'O']);
  assert.deepEqual([GROUP_WORD_PARENTS[tileById(BENZONITRILE_ID).value], parentWordName(tileById(BENZONITRILE_ID)), NITRILE_KIND,
    NITRILE_GROUP, tileById(CYANO_ID).italic], [{ suffix: 'carbonitrile', group: 'grupo C≡N' }, 'benzonitrilo', 'nitrile', 'grupo C≡N',
    '']);
  // R-5d1: the acid tiles, their groups, the class word and the parent word quoted with it.
  assert.deepEqual([ACID_WORD_ID, CARBOXY_ID, OICO_ID, CARBOXYLIC_ID, BENZOIC_ID].map((id) => [tileById(id).text, tileById(id).kind,
    tileById(id).value, tileById(id).row]), [['ácido', 'suffixClass', 'acid', 'groups'], ['carboxi', 'retained', 'carboxy', 'groups'],
    ['oico', 'suffix', 'acid', 'groups'], ['carboxílico', 'suffix', 'carboxylic', 'groups'], ['benzoico', 'benzene', 'benzoic', 'rings']]);
  assert.deepEqual([OICO_ID, CARBOXYLIC_ID].map((id) => SUFFIX_GROUPS[tileById(id).value]), [
    { kind: 'acid', outside: false, order: 2, terminal: true, hydroxy: true },
    { kind: 'acid', outside: true, order: 2, terminal: false, hydroxy: true }]);
  assert.deepEqual(['acid', 'carboxylic', 'aldehyde', 'alcohol'].map(isAcidSuffix), [true, true, false, false]);
  assert.deepEqual(['acid', 'carboxylic', 'aldehyde', 'ketone', 'carbaldehyde', 'alcohol'].map((value) => suffixBondAmount(SUFFIX_GROUPS[value])),
    [3, 1, 2, 2, 1, 1]);
  assert.deepEqual(GROUP_WORD_PARENTS[tileById(BENZOIC_ID).value], { suffix: 'carboxylic', group: 'grupo COOH' });
  // R-6a1: the ester tiles, their groups (the bridge oxygen beside the =O), and `benzoato` quoted as it is.
  assert.deepEqual([OATO_ID, CARBOXYLATE_ID, BENZOATE_ID, ESTER_ALKYL_ID].map((id) => [tileById(id).text, tileById(id).kind,
    tileById(id).value, tileById(id).row]), [['oato', 'suffix', 'ester', 'groups'], ['carboxilato', 'suffix', 'carboxylate', 'groups'],
    ['benzoato', 'benzene', 'benzoate', 'rings'], ['ilo', 'esterAlkyl', 1, 'groups']]);
  assert.deepEqual([OATO_ID, CARBOXYLATE_ID].map((id) => SUFFIX_GROUPS[tileById(id).value]), [
    { kind: 'ester', outside: false, order: 2, terminal: true, bridge: true },
    { kind: 'ester', outside: true, order: 2, terminal: false, bridge: true }]);
  assert.deepEqual(['ester', 'carboxylate', 'acid', 'alcohol'].map(isEsterSuffix), [true, true, false, false]);
  assert.deepEqual(['ester', 'carboxylate'].map((value) => suffixBondAmount(SUFFIX_GROUPS[value])), [3, 1]);
  assert.deepEqual([GROUP_WORD_PARENTS[tileById(BENZOATE_ID).value], parentWordName(tileById(BENZOATE_ID)), ESTER_KIND, ESTER_GROUP],
    [{ suffix: 'carboxylate', group: 'grupo COO' }, 'benzoato', 'ester', 'grupo COO']);
  assert.deepEqual([parentWordName(tileById(BENZOIC_ID)), parentWordName(tileById(BENZALDEHYDE_ID)), parentWordName(tileById(PHENOL_ID)),
    parentWordName(tileById('template-toluene'))], ['ácido benzoico', 'benzaldehído', 'fenol', 'tolueno']);
  // R-5d2: a retained acid name is quoted with its class word, as the engine writes it.
  assert.deepEqual(['template-aceticAcid', 'template-phthalicAcid', 'template-acetone'].map((id) => parentWordName(tileById(id))),
    [TRADITIONAL_NAMES.aceticAcid, `${SUFFIX_CLASS_WORDS.acid} ${BENZENE_DIGROUP_NAMES.phthalicAcid}`, 'acetona']);
  assert.deepEqual([ACID_KIND, ACID_GROUP, tileById(CARBOXY_ID).italic], ['acid', 'grupo COOH', '']);
  // R-5c2: the acyl tiles; `formil` (R-5c1) keeps its own messages.
  assert.deepEqual([ACETYL_ID, ACYL_ID, RING_CARBONYL_ID, BENZOYL_ID].map((id) => [tileById(id).text, tileById(id).kind, tileById(id).value]),
    [['acetil', 'retained', 'acetyl'], ['oil', 'acyl', 'chain'], ['carbonil', 'acyl', 'ring'], ['benzoil', 'retained', 'benzoyl']]);
  assert.deepEqual([ACETYL_ID, ACYL_ID, RING_CARBONYL_ID, BENZOYL_ID, FORMYL_ID, PHENYL_ID].map((id) => isAcylTile(tileById(id))),
    [true, true, true, true, false, false]);
  assert.deepEqual(ACYL_RETAINED, ['acetyl', 'benzoyl']);
  assert.deepEqual([tileById(ACETYL_ID).italic, tileById(BENZOYL_ID).italic], ['', '']);
  // R-5c1: the aldehyde and ketone tiles, their groups, and `oxo` as a one-atom group double-bonded to its carbon.
  assert.deepEqual([OXO_ID, FORMYL_ID, AL_ID, ONA_ID, CARBALDEHYDE_ID, BENZALDEHYDE_ID].map((id) => tileById(id).text),
    ['oxo', 'formil', 'al', 'ona', 'carbaldehído', 'benzaldehído']);
  assert.deepEqual([AL_ID, ONA_ID, CARBALDEHYDE_ID, OL_ID].map((id) => SUFFIX_GROUPS[tileById(id).value]), [
    { kind: 'aldehyde', outside: false, order: 2, terminal: true }, { kind: 'ketone', outside: false, order: 2, terminal: false },
    { kind: 'aldehyde', outside: true, order: 2, terminal: false }, { kind: 'alcohol', outside: false, order: 1, terminal: false },
  ]);
  assert.deepEqual([PHENOL_ID, BENZALDEHYDE_ID].map((id) => GROUP_WORD_PARENTS[tileById(id).value]),
    [{ suffix: 'alcohol', group: 'grupo OH' }, { suffix: 'carbaldehyde', group: 'grupo CHO' }]);
  assert.deepEqual(['halogen', 'hydroxy', 'carbonyl', 'alkoxy'].map((kind) => [isAtomGroup(kind), atomGroupOrder(kind)]),
    [[true, 1], [true, 1], [true, 2], [false, 1]]);
  assert.deepEqual([atomGroupElement('halogen', 'Cl'), atomGroupElement('hydroxy', 'alcohol'), atomGroupElement('carbonyl', 'ketone')],
    ['Cl', 'O', 'O']);
  assert.equal(tileById(FORMYL_ID).italic, '');
  assert.equal(tileById('retained-tert-butyl').italic, 'tert-');
  assert.equal(tileById('retained-isopropyl').italic, '');
  assert.equal(tileById(RING_ID).text, 'ciclo');
  assert.equal(tileById(BENZENE_ID).text, 'benceno');
  assert.deepEqual([tileById(PHENYL_ID).text, tileById(PHENYL_ID).value, tileById(PHENYL_ID).italic], ['fenil', 'phenyl', '']);
  // R-4c: the letters by the locant of the second position, the templates with their groups.
  assert.deepEqual(Object.values(POSITIONAL_IDS).map((id) => [tileById(id).text, tileById(id).value]), [['o', 2], ['m', 3], ['p', 4]]);
  assert.deepEqual(TILES.filter((t) => t.kind === 'template').map((t) => t.text), ['tolueno', 'estireno', 'xileno', 'mesitileno',
    'anisol', 'cresol', 'pirocatecol', 'catecol', 'resorcinol', 'hidroquinona', 'formaldehído', 'acetaldehído', 'acetona',
    'acetofenona', 'fenilacetaldehído', 'ftalaldehído', 'isoftalaldehído', 'tereftalaldehído', 'fórmico', 'acético', 'oxálico',
    'fenilacético', 'ftálico', 'isoftálico', 'tereftálico', 'formiato', 'acetato', 'fenilacetato', 'acetonitrilo', 'fenilacetonitrilo',
    'ftalonitrilo', 'anilina', 'bencilamina']);
  assert.deepEqual(Object.entries(TEMPLATES).map(([value, t]) => [value, t.count, t.positions, t.group && t.group.length,
    t.group && t.group.double, t.hydroxy, Boolean(t.letterOnly)]), [
    ['toluene', 1, [1], 1, [], [], false], ['styrene', 1, [1], 2, [1], [], false], ['xylene', 2, null, 1, [], [], false],
    ['mesitylene', 3, [1, 3, 5], 1, [], [], false],
    // R-5b: `anisol`, its one methoxy group (a methyl through an ether oxygen) at carbon 1.
    ['anisole', 1, [1], 1, [], [], false],
    // R-5a3a: the retained phenols, their OH groups where their word puts them; `cresol`'s methyl where its letter says.
    ['cresol', 1, null, 1, [], [1], true], ['pyrocatechol', 0, [], null, null, [1, 2], false],
    ['catechol', 0, [], null, null, [1, 2], false], ['resorcinol', 0, [], null, null, [1, 3], false],
    ['hydroquinone', 0, [], null, null, [1, 4], false],
    // R-5c3a: the retained carbonyl names, their C=O as a placed suffix (below); `acetofenona`'s and `fenilacetaldehído`'s phenyl.
    ['formaldehyde', 0, [], null, null, [], false], ['acetaldehyde', 0, [], null, null, [], false],
    ['acetone', 0, [], null, null, [], false], ['acetophenone', 1, [1], undefined, undefined, [], false],
    ['phenylacetaldehyde', 1, [2], undefined, undefined, [], false], ['phthalaldehyde', 0, [], null, null, [], false],
    ['isophthalaldehyde', 0, [], null, null, [], false], ['terephthalaldehyde', 0, [], null, null, [], false],
    // R-5d2: the retained acid names, their –COOH groups as a placed suffix (below); `fenilacético`'s phenyl.
    ['formicAcid', 0, [], null, null, [], false], ['aceticAcid', 0, [], null, null, [], false],
    ['oxalicAcid', 0, [], null, null, [], false], ['phenylaceticAcid', 1, [2], undefined, undefined, [], false],
    ['phthalicAcid', 0, [], null, null, [], false], ['isophthalicAcid', 0, [], null, null, [], false],
    ['terephthalicAcid', 0, [], null, null, [], false],
    // R-6a2a: the retained ester names, their –COO– as a placed suffix (below); `fenilacetato`'s phenyl.
    ['formate', 0, [], null, null, [], false], ['acetate', 0, [], null, null, [], false],
    ['phenylacetate', 1, [2], undefined, undefined, [], false],
    // R-6b2: the retained nitrile names, their –C≡N groups as a placed suffix (below); `fenilacetonitrilo`'s phenyl.
    ['acetonitrile', 0, [], null, null, [], false], ['phenylacetonitrile', 1, [2], undefined, undefined, [], false],
    ['phthalonitrile', 0, [], null, null, [], false],
    // R-6c3: the retained amine names, their nitrogen as a placed suffix (below); `bencilamina`'s phenyl, on its one carbon.
    ['aniline', 0, [], null, null, [], false], ['benzylamine', 1, [1], undefined, undefined, [], false],
  ]);
  assert.deepEqual(Object.keys(TEMPLATES).map(templateGroupWord), ['metilo', 'etenilo', 'metilo', 'metilo', 'grupo metoxi', 'metilo',
    null, null, null, null, null, null, null, 'fenilo', 'fenilo', null, null, null, null, null, null, 'fenilo', null, null, null, null,
    null, 'fenilo', null, 'fenilo', null, null, 'fenilo']);
  // R-5c3a: the chain templates' carbons and every template's placed principal group; R-5d2: the acid ones; R-6a2a: the ester ones;
  // R-6b2: the nitrile ones.
  assert.deepEqual(Object.keys(TEMPLATES).filter(isChainTemplate).map((value) => [value, templateLength(value)]), [
    ['formaldehyde', 1], ['acetaldehyde', 2], ['acetone', 3], ['acetophenone', 2], ['phenylacetaldehyde', 2], ['formicAcid', 1],
    ['aceticAcid', 2], ['oxalicAcid', 2], ['phenylaceticAcid', 2], ['formate', 1], ['acetate', 2], ['phenylacetate', 2],
    ['acetonitrile', 2], ['phenylacetonitrile', 2], ['benzylamine', 1]]);
  // R-6c3: the amine ones, `anilina` on benzene, `bencilamina` on its one carbon; none of another family's.
  assert.deepEqual(Object.keys(TEMPLATES).filter(isAmineTemplate).map((value) => [value, templateSuffix(value), parentWordName(
    tileById(`template-${value}`)), Boolean(TEMPLATES[value].feminine)]), [
    ['aniline', { value: 'amine', positions: [1] }, TRADITIONAL_NAMES.aniline, true],
    ['benzylamine', { value: 'amine', positions: [1] }, TRADITIONAL_NAMES.benzylamine, true]]);
  assert.ok(Object.keys(TEMPLATES).filter(isAmineTemplate).every((value) => !isAcidTemplate(value) && !isEsterTemplate(value)
    && !isCarbonylTemplate(value) && !isPhenolTemplate(value) && !isNitrileTemplate(value)));
  assert.deepEqual([templateAdmits('aniline', [{ slots: [{}], substituent: { kind: 'halogen' } }]),
    templateAdmits('benzylamine', [{ slots: [{}], substituent: { kind: 'chain' } }])], [true, false]);
  assert.deepEqual(Object.keys(TEMPLATES).filter(isNitrileTemplate).map((value) => [value, templateSuffix(value), parentWordName(
    tileById(`template-${value}`))]), [['acetonitrile', { value: 'nitrile', positions: [1] }, TRADITIONAL_NAMES.acetonitrile],
    ['phenylacetonitrile', { value: 'nitrile', positions: [1] }, TRADITIONAL_NAMES.phenylacetonitrile],
    ['phthalonitrile', { value: 'carbonitrile', positions: [1, 2] }, BENZENE_DIGROUP_NAMES.phthalonitrile]]);
  assert.ok(Object.keys(TEMPLATES).filter(isNitrileTemplate).every((value) => !isAcidTemplate(value) && !isEsterTemplate(value)
    && !isCarbonylTemplate(value) && !isPhenolTemplate(value)));
  assert.deepEqual(Object.keys(TEMPLATES).filter(isEsterTemplate).map((value) => [value, templateSuffix(value), parentWordName(
    tileById(`template-${value}`))]), [['formate', { value: 'ester', positions: [1] }, TRADITIONAL_NAMES.formate],
    ['acetate', { value: 'ester', positions: [1] }, TRADITIONAL_NAMES.acetate],
    ['phenylacetate', { value: 'ester', positions: [1] }, TRADITIONAL_NAMES.phenylacetate]]);
  assert.ok(Object.keys(TEMPLATES).filter(isEsterTemplate).every((value) => !isAcidTemplate(value) && !isCarbonylTemplate(value)));
  assert.deepEqual(Object.keys(TEMPLATES).filter(isAcidTemplate).map((value) => [value, templateSuffix(value)]), [
    ['formicAcid', { value: 'acid', positions: [1] }], ['aceticAcid', { value: 'acid', positions: [1] }],
    ['oxalicAcid', { value: 'acid', positions: [1, 2] }], ['phenylaceticAcid', { value: 'acid', positions: [1] }],
    ['phthalicAcid', { value: 'carboxylic', positions: [1, 2] }], ['isophthalicAcid', { value: 'carboxylic', positions: [1, 3] }],
    ['terephthalicAcid', { value: 'carboxylic', positions: [1, 4] }]]);
  assert.deepEqual(Object.keys(TEMPLATES).filter((value) => TEMPLATES[value].arylPrefix || TEMPLATES[value].substitutable), [
    'acetaldehyde', 'phthalaldehyde', 'isophthalaldehyde', 'terephthalaldehyde', 'aceticAcid', 'phthalicAcid', 'isophthalicAcid',
    'terephthalicAcid', 'acetate', 'acetonitrile', 'phthalonitrile', 'aniline']);
  assert.deepEqual(Object.keys(TEMPLATES).filter(isCarbonylTemplate).map((value) => [value, templateSuffix(value)]), [
    ['formaldehyde', { value: 'aldehyde', positions: [1] }], ['acetaldehyde', { value: 'aldehyde', positions: [1] }],
    ['acetone', { value: 'ketone', positions: [2] }], ['acetophenone', { value: 'ketone', positions: [1] }],
    ['phenylacetaldehyde', { value: 'aldehyde', positions: [1] }], ['phthalaldehyde', { value: 'carbaldehyde', positions: [1, 2] }],
    ['isophthalaldehyde', { value: 'carbaldehyde', positions: [1, 3] }],
    ['terephthalaldehyde', { value: 'carbaldehyde', positions: [1, 4] }]]);
  assert.deepEqual([templateSuffix('catechol'), templateSuffix('toluene'), templateLength('toluene')],
    [{ value: 'alcohol', positions: [1, 2] }, null, 6]);
  assert.deepEqual([TEMPLATES.anisole.group.alkoxy, groupPlural('metilo'), groupPlural('grupo metoxi')], [true, 'metilos',
    'grupos metoxi']);
  assert.equal(tileById('template-anisole').text, TRADITIONAL_NAMES.anisole);
  // R-5b: the alkoxy ending, and the contraction limit the assembler shares with render.js.
  assert.deepEqual([tileById(ALKOXY_ID).text, tileById(ALKOXY_ID).kind, tileById(ALKOXY_ID).row], ['oxi', 'alkoxy', 'groups']);
  // R-5b2: the class word of an ether's functional-class name, the lexicon's.
  assert.deepEqual([tileById(ETHER_CLASS_ID).text, tileById(ETHER_CLASS_ID).kind, tileById(ETHER_CLASS_ID).value,
    tileById(ETHER_CLASS_ID).row], [ETHER_CLASS_WORD, 'classWord', 'ether', 'groups']);
  assert.equal(MAX_CONTRACTED_ALKOXY, RENDER_MAX_CONTRACTED_ALKOXY);
  assert.deepEqual(Object.keys(TEMPLATES).filter(isPhenolTemplate), ['cresol', 'pyrocatechol', 'catechol', 'resorcinol', 'hydroquinone']);
  // The template words are those of the engine's own alternatives (aromatic.js), so `o-xileno` and `p-cresol` assemble to their
  // texts.
  assert.equal(`${POSITIONAL_LETTERS[2]}-${tileById('template-xylene').text}`, TRADITIONAL_NAMES.oXylene);
  assert.equal(`${POSITIONAL_LETTERS[4]}-${tileById('template-cresol').text}`, TRADITIONAL_NAMES.pCresol);
  assert.deepEqual(['pyrocatechol', 'catechol', 'resorcinol', 'hydroquinone'].map((value) => tileById(`template-${value}`).text),
    ['pyrocatechol', 'catechol', 'resorcinol', 'hydroquinone'].map((id) => BENZENE_DIGROUP_NAMES[id]));
  // R-6c1: the amine suffix, the locant `N` and the nitrogen's bonds, the engine's and the model's own.
  assert.deepEqual([tileById(AMINA_ID).text, tileById(AMINA_ID).kind, tileById(AMINA_ID).value, tileById(AMINA_ID).row],
    [GROUP_SUFFIXES.amine, 'suffix', AMINE_KIND, 'groups']);
  assert.deepEqual([N_VALUE, N_TEXT, tileById(NITROGEN_ID).kind, tileById(NITROGEN_ID).value, tileById(NITROGEN_ID).text],
    [N_LOCANT, locantText(N_LOCANT), 'nitrogen', N_LOCANT, 'N']);
  assert.deepEqual([NITROGEN_VALENCE, AMINE_NITROGEN_FREE], [VALENCES.N, VALENCES.N - 1]);
  assert.deepEqual([isAmineSuffix('amine'), isAmineSuffix('alcohol'), isAmineSuffix('nope'), suffixElement(SUFFIX_GROUPS.amine),
    suffixBondAmount(SUFFIX_GROUPS.amine)], [true, false, false, 'N', 1]);
  // R-6c2: the amino prefix, a retained word with the lexicon's prefix of an amine; its value language-neutral, its atom a nitrogen.
  assert.deepEqual([tileById(AMINO_ID).text, tileById(AMINO_ID).kind, tileById(AMINO_ID).value, tileById(AMINO_ID).row],
    [GROUP_PREFIXES.amine, 'retained', AMINO_KIND, 'groups']);
  assert.notEqual(AMINO_KIND, GROUP_PREFIXES.amine, 'the value is no Spanish word');
  assert.deepEqual([isAminoTile(tileById(AMINO_ID)), isAminoTile(tileById(CYANO_ID)), isAminoTile(tileById(AMINA_ID)), AMINO_ELEMENT],
    [true, false, false, 'N']);
  // R-6c3: `amina` is also the class word of an amine's class name (no tile of its own); the NH₂ as the messages call it.
  assert.deepEqual([isAmineClassWord(tileById(AMINA_ID)), isAmineClassWord(tileById(ETHER_CLASS_ID)), isAmineClassWord(tileById(OL_ID)),
    isAmineClassWord(tileById(AMINO_ID)), AMINE_CLASS_GROUPS, AMINE_GROUP], [true, false, false, false, VALENCES.N, 'grupo NH₂']);
  // R-6d1: the amide tiles, their groups (the amide's nitrogen beside the =O, as an acid's OH), `benzamida` quoted with «la».
  assert.deepEqual([AMIDA_ID, CARBOXAMIDE_ID, BENZAMIDE_ID].map((id) => [tileById(id).text, tileById(id).kind, tileById(id).value,
    tileById(id).row]), [[GROUP_SUFFIXES.amide, 'suffix', AMIDE_KIND, 'groups'],
    [RING_GROUP_SUFFIXES.amide, 'suffix', 'carboxamide', 'groups'], ['benzamida', 'benzene', 'benzamide', 'rings']]);
  assert.deepEqual([AMIDA_ID, CARBOXAMIDE_ID].map((id) => SUFFIX_GROUPS[tileById(id).value]), [
    { kind: 'amide', outside: false, order: 2, terminal: true, amideNitrogen: true },
    { kind: 'amide', outside: true, order: 2, terminal: false, amideNitrogen: true }]);
  assert.deepEqual(['amide', 'carboxamide', 'amine', 'nitrile'].map(isAmideSuffix), [true, true, false, false]);
  assert.deepEqual(['amide', 'carboxamide', 'amine', 'nitrile', 'alcohol'].map(isNitrogenSuffix), [true, true, true, false, false]);
  assert.deepEqual(['amide', 'carboxamide'].map((value) => [suffixBondAmount(SUFFIX_GROUPS[value]), suffixElement(SUFFIX_GROUPS[value])]),
    [[3, 'O'], [1, 'O']]);
  assert.deepEqual([GROUP_WORD_PARENTS[tileById(BENZAMIDE_ID).value], parentWordName(tileById(BENZAMIDE_ID)), AMIDE_GROUP,
    AMIDE_NITROGEN], [{ suffix: 'carboxamide', group: 'grupo amida', feminine: true }, 'benzamida', 'grupo amida',
    'nitrógeno de la amida']);
  assert.deepEqual([withArticle('benzamida', 'de'), withArticle('benzamida', 'en'), withArticle('benzonitrilo', 'de'),
    withArticle('hidroquinona')], ['de la benzamida', 'en la benzamida', 'del benzonitrilo', 'la hidroquinona']);
  // R-5a1: the halogens by element symbol, in the lexicon's order.
  assert.deepEqual(Object.values(HALOGEN_IDS).map((id) => [tileById(id).text, tileById(id).value]),
    [['fluoro', 'F'], ['cloro', 'Cl'], ['bromo', 'Br'], ['yodo', 'I']]);
}); // End of test 'every tile text comes from the lexicon (numbers are digits)'

test('rows and «más» follow design.md §15.2', () => {
  const more = (kind) => TILES.filter((tile) => tile.kind === kind && tile.more).map((tile) => tile.value);
  assert.deepEqual(more('num'), Array.from({ length: 18 }, (_, i) => i + 13)); // 13–30
  // R-6c1: the locant N right after the numbers, always shown.
  assert.deepEqual(TILES.filter((tile) => tile.row === 'numbers').slice(-1).map((tile) => [tile.id, tile.more]), [[NITROGEN_ID, false]]);
  assert.equal(more('mult')[0], 7); // hepta…
  assert.equal(more('cmult')[0], 7);
  assert.equal(more('root')[0], 11); // undec…
  assert.deepEqual([...new Set(TILES.map((tile) => tile.row))],
    ['numbers', 'multipliers', 'roots', 'endings', 'branches', 'rings', 'groups', 'traditional']);
  assert.ok(TILES.filter((tile) => ['ending', 'freeValence', 'retained', 'start', 'end', 'ring', 'benzene', 'positional', 'template',
    'halogen'].includes(tile.kind)).every((tile) => !tile.more));
  assert.deepEqual(TILES.filter((tile) => tile.row === 'rings').map((tile) => tile.id),
    [RING_ID, BENZENE_ID, PHENOL_ID, BENZALDEHYDE_ID, BENZOIC_ID, BENZOATE_ID, BENZONITRILE_ID, BENZAMIDE_ID, PHENYL_ID, BENZOYL_ID,
      ...Object.values(POSITIONAL_IDS), CLOSING_ID],
    'R-4a: the ciclo tile; R-4b: benceno and fenil; R-4c: o, m, p; R-5a2: fenol and 1(n); R-5c1: benzaldehído; R-5c2: benzoil; '
      + 'R-5d1: benzoico; R-6a1: benzoato; R-6b1: benzonitrilo; R-6d1: benzamida');
  assert.deepEqual(TILES.filter((tile) => tile.row === 'traditional').map((tile) => tile.id),
    ['template-toluene', 'template-styrene', 'template-xylene', 'template-mesitylene', 'template-anisole', 'template-cresol',
      'template-pyrocatechol', 'template-catechol', 'template-resorcinol', 'template-hydroquinone', 'template-formaldehyde',
      'template-acetaldehyde', 'template-acetone', 'template-acetophenone', 'template-phenylacetaldehyde', 'template-phthalaldehyde',
      'template-isophthalaldehyde', 'template-terephthalaldehyde', 'template-formicAcid', 'template-aceticAcid',
      'template-oxalicAcid', 'template-phenylaceticAcid', 'template-phthalicAcid', 'template-isophthalicAcid',
      'template-terephthalicAcid', 'template-formate', 'template-acetate', 'template-phenylacetate', 'template-acetonitrile',
      'template-phenylacetonitrile', 'template-phthalonitrile', 'template-aniline', 'template-benzylamine'],
    'R-4c: «Nombres tradicionales»; R-5b: anisol; R-5a3a: the retained phenols; R-5c3a: the retained carbonyl names; R-5d2: the '
      + 'retained acid names; R-6a2a: the retained ester names; R-6b2: the retained nitrile names; R-6c3: the retained amine names');
  assert.deepEqual(TILES.filter((tile) => tile.row === 'groups').map((tile) => tile.id),
    ['halogen-F', 'halogen-Cl', 'halogen-Br', 'halogen-I', HYDROXY_ID, OL_ID, ALKOXY_ID, ETHER_CLASS_ID, OXO_ID, FORMYL_ID, ACETYL_ID,
      ACYL_ID, RING_CARBONYL_ID, AL_ID, ONA_ID, CARBALDEHYDE_ID, ACID_WORD_ID, CARBOXY_ID, OICO_ID, CARBOXYLIC_ID, OATO_ID, CARBOXYLATE_ID,
      ESTER_ALKYL_ID, CYANO_ID, NITRILO_ID, CARBONITRILE_ID, AMINA_ID, AMINO_ID, AMIDA_ID, CARBOXAMIDE_ID],
    'R-5a1: «Grupos», the halogens; R-5a2: hidroxi, ol; R-5b: oxi; R-5b2: éter; R-5c1: oxo, formil, al, ona, carbaldehído; '
      + 'R-5c2: acetil, oil, carbonil; R-5d1: ácido, carboxi, oico, carboxílico; R-6a1: oato, carboxilato, ilo; R-6b1: ciano, nitrilo, '
      + 'carbonitrilo; R-6c1: amina; R-6c2: amino; R-6d1: amida, carboxamida');
  assert.deepEqual(TILES.filter((tile) => tile.row === 'branches' && tile.kind === 'retained').map((tile) => tile.value),
    ['isopropyl', 'isopropylidene', 'tert-butyl']);
});

test('tileById, tileId and toTiles', () => {
  assert.equal(tileById('root-4').text, 'but');
  assert.equal(tileId('root', 4), 'root-4');
  assert.equal(tileId('ending', 'double'), 'ending-double');
  assert.equal(tileId('freeValence', 2), 'fv-2');
  assert.equal(tileId('start'), START_ID);
  assert.equal(tileId('end'), END_ID);
  assert.equal(tileId('ring', 'cyclo'), RING_ID);
  assert.equal(tileId('benzene', 'benzene'), BENZENE_ID);
  assert.equal(tileId('retained', 'phenyl'), PHENYL_ID);
  assert.equal(tileId('positional', 4), POSITIONAL_IDS[4]);
  assert.equal(tileId('template', 'xylene'), 'template-xylene');
  assert.equal(tileId('halogen', 'Cl'), HALOGEN_IDS.Cl);
  assert.equal(tileId('benzene', 'phenol'), PHENOL_ID);
  assert.equal(tileId('hydroxy', 'alcohol'), HYDROXY_ID);
  assert.equal(tileId('suffix', 'alcohol'), OL_ID);
  assert.equal(tileId('closing'), CLOSING_ID);
  assert.equal(tileId('alkoxy', 'ether'), ALKOXY_ID);
  assert.equal(tileId('suffix', 'ketone'), ONA_ID); // R-5c1
  assert.equal(tileId('carbonyl', 'ketone'), OXO_ID);
  assert.equal(tileId('benzene', 'benzaldehyde'), BENZALDEHYDE_ID);
  assert.equal(tileId('acyl', 'chain'), ACYL_ID); // R-5c2
  assert.equal(tileId('acyl', 'ring'), RING_CARBONYL_ID);
  assert.equal(tileId('retained', 'benzoyl'), BENZOYL_ID);
  assert.equal(tileId('retained', 'acetyl'), ACETYL_ID);
  assert.equal(tileId('suffixClass', 'acid'), ACID_WORD_ID); // R-5d1
  assert.equal(tileId('suffix', 'acid'), OICO_ID);
  assert.equal(tileId('suffix', 'carboxylic'), CARBOXYLIC_ID);
  assert.equal(tileId('benzene', 'benzoic'), BENZOIC_ID);
  assert.equal(tileId('retained', 'carboxy'), CARBOXY_ID);
  assert.equal(tileId('suffix', 'ester'), OATO_ID); // R-6a1
  assert.equal(tileId('suffix', 'carboxylate'), CARBOXYLATE_ID);
  assert.equal(tileId('benzene', 'benzoate'), BENZOATE_ID);
  assert.equal(tileId('esterAlkyl', 1), ESTER_ALKYL_ID);
  assert.equal(tileId('suffix', 'nitrile'), NITRILO_ID); // R-6b1
  assert.equal(tileId('suffix', 'carbonitrile'), CARBONITRILE_ID);
  assert.equal(tileId('benzene', 'benzonitrile'), BENZONITRILE_ID);
  assert.equal(tileId('retained', 'cyano'), CYANO_ID);
  assert.equal(tileId('suffix', 'amine'), AMINA_ID); // R-6c1
  assert.equal(tileId('nitrogen', N_VALUE), NITROGEN_ID);
  assert.equal(tileId('suffix', 'amide'), AMIDA_ID); // R-6d1
  assert.equal(tileId('suffix', 'carboxamide'), CARBOXAMIDE_ID);
  assert.equal(tileId('benzene', 'benzamide'), BENZAMIDE_ID);
  assert.deepEqual(toTiles(['num-2', tileById('mult-2')]).map((tile) => tile.text), ['2', 'di']);
  assert.throws(() => tileById('root-31'), /unknown tile/);
  assert.throws(() => tileId('mult', 1), /no mult tile/);
  assert.throws(() => toTiles(['nope']), /unknown tile/);
}); // End of test 'tileById, tileId and toTiles'

test('src/reverse never retypes a tile word', async () => {
  // The one-letter words (the letters o, m, p) are left out: code uses such letters for other things (the conjunction
  // «o» of index.js orBefore()); the catalogue test checks that they come from the lexicon.
  const words = TILES.filter((tile) => /[a-z]/.test(tile.text) && tile.text.length > 1).map((tile) => tile.text);
  for (const file of await reverseFiles()) {
    // Code only: the comments may quote the words they talk about (`ano` → `an`).
    const source = (await readFile(path.join(REVERSE, file), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const word of words) {
      for (const quote of ["'", '"', '`']) {
        assert.ok(!source.includes(`${quote}${word}${quote}`), `src/reverse/${file} retypes «${word}»`);
      }
    }
  }
}); // End of test 'src/reverse never retypes a tile word'

/**
 * Engine modules each src/reverse/ file may import besides its siblings and
 * the lexicon: the molecule model and its caps to build (R-1b), the naming
 * entry point to judge, the carbon valence and the structural key to search
 * (R-1c), and for the diagnosis (R-3) the engine's own comparators, chain
 * key, locant text, prefix styles and naming, and the branch key, and the
 * principal groups' seniority (R-5c3b1, CARBONYL_SENIORITY). Never
 * render.js or the engine's grouping (design.md §15.4): the assembler works
 * from the tree alone.
 */
const ENGINE_IMPORTS = Object.freeze({
  'build.js': ['../model/molecule.js', '../model/validate.js'],
  'diagnose.js': ['../naming/index.js', '../naming/numbering.js', '../naming/parent.js', '../naming/structure.js',
    '../naming/substituent.js', '../naming/seniority.js', '../model/graph.js'],
  'index.js': ['../naming/index.js'],
  'search.js': ['../model/molecule.js', '../model/graph.js'],
});

test('src/reverse is pure and imports from the engine only what it needs', async () => {
  const forbidden = [
    /\.(?:x|y)\b/, // atom.x / atom.y
    /\b(?:document|window|navigator|localStorage|sessionStorage)\b/,
  ];
  const files = await reverseFiles();
  assert.deepEqual(files.sort(), ['assemble.js', 'build.js', 'diagnose.js', 'index.js', 'interpret.js', 'parse.js', 'search.js', 'tiles.js',
    'tokenize.js']);
  for (const file of files) {
    const lines = (await readFile(path.join(REVERSE, file), 'utf8')).split('\n');
    lines.forEach((line, i) => {
      for (const pattern of forbidden) {
        assert.doesNotMatch(line, pattern, `src/reverse/${file}:${i + 1}: ${line.trim()}`);
      }
      const from = /^\s*(?:import|export)\b.*\bfrom\s+'([^']+)'/.exec(line) || /^\s*\}\s*from\s+'([^']+)'/.exec(line);
      if (from && !(ENGINE_IMPORTS[file] || []).includes(from[1])) {
        assert.match(from[1], /^\.\/[a-z]+\.js$|^\.\.\/naming\/lexicon\.es\.js$/, `src/reverse/${file}:${i + 1} imports ${from[1]}`);
      }
    });
  } // End of the loop over the files
}); // End of test 'src/reverse is pure and imports from the engine only what it needs'

test('reverse modules bundle and run in a classic script', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'organic-reverse-'));
  try {
    await mkdir(path.join(dir, 'reverse'));
    await mkdir(path.join(dir, 'naming'));
    for (const file of await reverseFiles()) {
      await copyFile(path.join(REVERSE, file), path.join(dir, 'reverse', file));
    }
    await copyFile(path.join(ROOT, 'src', 'naming', 'lexicon.es.js'), path.join(dir, 'naming', 'lexicon.es.js'));
    await writeFile(
      path.join(dir, 'entry.js'),
      [
        "import { parse } from './reverse/parse.js';",
        "import { assemble } from './reverse/assemble.js';",
        "import { tokenize } from './reverse/tokenize.js';",
        "const names = ['5,5-bis(2,2-dimetilpropil)nonano', '8-[2-(propan-2-iliden)hexil]pentadecano', 'hex-1-en-3,5-diino', '2-buteno'];",
        'globalThis.__result = names.map((name) => assemble(parse(tokenize(name)).tree).text).join(\' \')',
        "  + ' ' + parse(['num-2']).errors[0].code;",
      ].join('\n'),
    );
    const code = await bundleModules(path.join(dir, 'entry.js'), dir);
    const context = {};
    vm.runInNewContext(code, context);
    assert.equal(context.__result,
      '5,5-bis(2,2-dimetilpropil)nonano 8-[2-(propan-2-iliden)hexil]pentadecano hex-1-en-3,5-diino 2-buteno NO_PARENT');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}); // End of test 'reverse modules bundle and run in a classic script'

test('readName() bundles with the engine and runs in a classic script', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'organic-read-'));
  try {
    await cp(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });
    await writeFile(
      path.join(dir, 'entry.js'),
      [
        "import { readName } from './src/reverse/index.js';",
        "import { tokenize } from './src/reverse/tokenize.js';",
        "const names = ['5,5-bis(2,2-dimetilpropil)nonano', '4-(propan-2-il)heptano', '4-metilpentano', 'hex-6-eno', 'metilpentano',",
        "  'metilpropano', 'decametildecano', 'metilbenceno', 'dimetilbenceno', '1,6-dimetilbenceno', 'tolueno', 'o-xileno',",
        "  'xileno', 'p-metiltolueno'];",
        "globalThis.__result = names.map((name) => readName(tokenize(name)).kind).join(' ')",
        "  + ' ' + readName(tokenize('dimetilbenceno')).candidates.length;",
      ].join('\n'),
    );
    const code = await bundleModules(path.join(dir, 'entry.js'), dir);
    const context = {};
    vm.runInNewContext(code, context);
    // The aromatic key (R-4b) bundles too: three structures for `dimetilbenceno`, `1,6-` drawn as `1,2-`; and the
    // templates and letters (R-4c).
    assert.equal(context.__result, 'correct alternative otherName invalid ambiguous missingLocants incomplete correct ambiguous '
      + 'otherName alternative alternative ambiguous otherName 3');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}); // End of test 'readName() bundles with the engine and runs in a classic script'
