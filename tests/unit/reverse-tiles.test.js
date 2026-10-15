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
  isCarbonylTemplate, templateSuffix, templateLength,
} from '../../src/reverse/tiles.js';
import {
  stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, RETAINED_PREFIXES, ENCLOSING_MARKS, RING_PREFIX, BENZENE_NAME,
  TRADITIONAL_NAMES, POSITIONAL_LETTERS, HALOGEN_PREFIXES, GROUP_PREFIXES, GROUP_SUFFIXES, PHENOL_STEM, BENZENE_DIGROUP_NAMES,
  ALKOXY_ENDING, ETHER_CLASS_WORD, RING_GROUP_SUFFIXES, BENZENE_GROUP_NAMES, FORMYL_PREFIX, ACETYL_PREFIX, BENZOYL_PREFIX, ACYL_ENDING,
  RING_CARBONYL_ENDING,
} from '../../src/naming/lexicon.es.js';
import { MAX_CONTRACTED_ALKOXY as RENDER_MAX_CONTRACTED_ALKOXY } from '../../src/naming/render.js';
import { MAX_CONTRACTED_ALKOXY } from '../../src/reverse/assemble.js';
import { bundleModules } from '../../scripts/build.mjs';

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
  assert.equal(count('retained'), 7); // isopropil, isopropiliden, tert-butil; fenil (R-4b); formil (R-5c1); acetil, benzoil (R-5c2)
  assert.equal(count('start'), 1);
  assert.equal(count('end'), 1);
  assert.equal(count('ring'), 1); // ciclo (R-4a)
  assert.equal(count('benzene'), 3); // benceno (R-4b), fenol (R-5a2), benzaldehído (R-5c1)
  assert.equal(count('positional'), 3); // o, m, p (R-4c)
  // tolueno, estireno, xileno, mesitileno (R-4c); anisol (R-5b); cresol…hidroquinona (R-5a3a); formaldehído…tereftalaldehído (R-5c3a)
  assert.equal(count('template'), 18);
  assert.equal(count('halogen'), 4); // fluoro, cloro, bromo, yodo (R-5a1)
  assert.equal(count('hydroxy'), 1); // hidroxi (R-5a2)
  assert.equal(count('suffix'), 4); // ol (R-5a2); al, ona, carbaldehído (R-5c1)
  assert.equal(count('carbonyl'), 1); // oxo (R-5c1)
  assert.equal(count('closing'), 1); // 1(n) (R-5a2)
  assert.equal(count('alkoxy'), 1); // oxi (R-5b)
  assert.equal(count('classWord'), 1); // éter (R-5b2)
  assert.equal(count('acyl'), 2); // oil, carbonil (R-5c2)
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
      retained: () => ({ formyl: FORMYL_PREFIX, acetyl: ACETYL_PREFIX, benzoyl: BENZOYL_PREFIX }[tile.value]
        || `${RETAINED_PREFIXES[tile.value].italic}${RETAINED_PREFIXES[tile.value].text}`),
      start: () => ENCLOSING_MARKS[0][0],
      end: () => ENCLOSING_MARKS[0][1],
      ring: () => RING_PREFIX,
      benzene: () => ({
        phenol: `${PHENOL_STEM}${GROUP_SUFFIXES.alcohol}`,
        benzaldehyde: `${BENZENE_GROUP_NAMES.aldehyde.stem}${BENZENE_GROUP_NAMES.aldehyde.ending}`, // R-5c1
      }[tile.value] || BENZENE_NAME),
      positional: () => POSITIONAL_LETTERS[tile.value],
      // `xileno`: the word of `1,2-xileno` without the locants the student writes on number tiles; `cresol` (R-5a3a) that of
      // `o-cresol` without its letter; the diols (R-5a3a) the lexicon's words of benzene with two OH groups.
      template: () => (TEMPLATES[tile.value].id
        ? TRADITIONAL_NAMES[TEMPLATES[tile.value].id].replace(/^(?:1,2|o)-/, '')
        : BENZENE_DIGROUP_NAMES[tile.value]),
      halogen: () => HALOGEN_PREFIXES[tile.value],
      hydroxy: () => GROUP_PREFIXES[tile.value],
      // `carbaldehído` (R-5c1): the suffix of a –CHO outside a ring parent.
      suffix: () => (tile.value === 'carbaldehyde' ? RING_GROUP_SUFFIXES.aldehyde : GROUP_SUFFIXES[tile.value]),
      carbonyl: () => GROUP_PREFIXES[tile.value], // `oxo` (R-5c1)
      closing: () => `1${ENCLOSING_MARKS[0][0]}n${ENCLOSING_MARKS[0][1]}`,
      alkoxy: () => ALKOXY_ENDING,
      classWord: () => ETHER_CLASS_WORD, // `éter` (R-5b2)
      acyl: () => (tile.value === 'ring' ? RING_CARBONYL_ENDING : ACYL_ENDING), // `carbonil`, `oil` (R-5c2)
    }[tile.kind]();
    assert.equal(tile.text, expected, tile.id);
  } // End of the loop over the tiles
  assert.deepEqual(TILES.filter((t) => t.kind === 'retained').map((t) => t.text), ['isopropil', 'isopropiliden', 'tert-butil', 'fenil',
    'benzoil', 'formil', 'acetil']);
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
    'acetofenona', 'fenilacetaldehído', 'ftalaldehído', 'isoftalaldehído', 'tereftalaldehído']);
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
  ]);
  assert.deepEqual(Object.keys(TEMPLATES).map(templateGroupWord), ['metilo', 'etenilo', 'metilo', 'metilo', 'grupo metoxi', 'metilo',
    null, null, null, null, null, null, null, 'fenilo', 'fenilo', null, null, null]);
  // R-5c3a: the chain templates' carbons and every template's placed principal group.
  assert.deepEqual(Object.keys(TEMPLATES).filter(isChainTemplate).map((value) => [value, templateLength(value)]), [
    ['formaldehyde', 1], ['acetaldehyde', 2], ['acetone', 3], ['acetophenone', 2], ['phenylacetaldehyde', 2]]);
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
  // R-5a1: the halogens by element symbol, in the lexicon's order.
  assert.deepEqual(Object.values(HALOGEN_IDS).map((id) => [tileById(id).text, tileById(id).value]),
    [['fluoro', 'F'], ['cloro', 'Cl'], ['bromo', 'Br'], ['yodo', 'I']]);
}); // End of test 'every tile text comes from the lexicon (numbers are digits)'

test('rows and «más» follow design.md §15.2', () => {
  const more = (kind) => TILES.filter((tile) => tile.kind === kind && tile.more).map((tile) => tile.value);
  assert.deepEqual(more('num'), Array.from({ length: 18 }, (_, i) => i + 13)); // 13–30
  assert.equal(more('mult')[0], 7); // hepta…
  assert.equal(more('cmult')[0], 7);
  assert.equal(more('root')[0], 11); // undec…
  assert.deepEqual([...new Set(TILES.map((tile) => tile.row))],
    ['numbers', 'multipliers', 'roots', 'endings', 'branches', 'rings', 'groups', 'traditional']);
  assert.ok(TILES.filter((tile) => ['ending', 'freeValence', 'retained', 'start', 'end', 'ring', 'benzene', 'positional', 'template',
    'halogen'].includes(tile.kind)).every((tile) => !tile.more));
  assert.deepEqual(TILES.filter((tile) => tile.row === 'rings').map((tile) => tile.id),
    [RING_ID, BENZENE_ID, PHENOL_ID, BENZALDEHYDE_ID, PHENYL_ID, BENZOYL_ID, ...Object.values(POSITIONAL_IDS), CLOSING_ID],
    'R-4a: the ciclo tile; R-4b: benceno and fenil; R-4c: o, m, p; R-5a2: fenol and 1(n); R-5c1: benzaldehído; R-5c2: benzoil');
  assert.deepEqual(TILES.filter((tile) => tile.row === 'traditional').map((tile) => tile.id),
    ['template-toluene', 'template-styrene', 'template-xylene', 'template-mesitylene', 'template-anisole', 'template-cresol',
      'template-pyrocatechol', 'template-catechol', 'template-resorcinol', 'template-hydroquinone', 'template-formaldehyde',
      'template-acetaldehyde', 'template-acetone', 'template-acetophenone', 'template-phenylacetaldehyde', 'template-phthalaldehyde',
      'template-isophthalaldehyde', 'template-terephthalaldehyde'],
    'R-4c: «Nombres tradicionales»; R-5b: anisol; R-5a3a: the retained phenols; R-5c3a: the retained carbonyl names');
  assert.deepEqual(TILES.filter((tile) => tile.row === 'groups').map((tile) => tile.id),
    ['halogen-F', 'halogen-Cl', 'halogen-Br', 'halogen-I', HYDROXY_ID, OL_ID, ALKOXY_ID, ETHER_CLASS_ID, OXO_ID, FORMYL_ID, ACETYL_ID,
      ACYL_ID, RING_CARBONYL_ID, AL_ID, ONA_ID, CARBALDEHYDE_ID],
    'R-5a1: «Grupos», the halogens; R-5a2: hidroxi, ol; R-5b: oxi; R-5b2: éter; R-5c1: oxo, formil, al, ona, carbaldehído; '
      + 'R-5c2: acetil, oil, carbonil');
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
