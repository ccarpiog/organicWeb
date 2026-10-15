/**
 * @file Unit tests for the retained amine names of «¿Cómo se dibuja?»
 * (src/reverse/, design.md §13.4 I-36, I-40a, §14.4, §14.5 I-43a, §15.5.3,
 * §15.7, §15.8 R-6c; phase I-52c3, R-6c3): the «Nombres tradicionales» tiles
 * `anilina` (benzene with its NH₂ at carbon 1, with prefixes on the ring and,
 * written `N`, on the nitrogen: `N-metilanilina`, `N,4-dimetilanilina`,
 * `4-cloroanilina`, and the orto/meta/para forms the engine writes,
 * `p-cloroanilina`, `N-etil-p-metilanilina`, `p-bromo-N,N-dimetilanilina`,
 * never `N,p-`) and `bencilamina` (fenilmetanamina, bare only) through the
 * parser (TEMPLATE_LOCANTS, POSITIONAL — an `N` beside a letter, a letter on
 * `bencenamina` —, TILE_ORDER, ACID_WORD, ESTER_SUFFIX, each with its tile
 * range and message), the assembler and the tokenizer, interpret.js (the
 * nitrogen as the placed suffix, the `N` slots), build.js (the groups on the
 * nitrogen, LOCANT_RANGE and VALENCE messages), search.js and readName():
 * every form the forward engine lists read as `alternative` with its own
 * label and the molecule compared by aromatic key with a SMILES; a prefix on
 * `bencilamina` as `otherName` with SUBSTITUTED_TEMPLATE, the prefixes the
 * engine writes on `anilina` judged by the other rules; the amine's own
 * mistakes on a template, deliberate nulls of diagnose.js «Amines» until
 * phase I-52c4, each with its category read independently; the tooltips;
 * the fixture names; a closed loop over the engine's retained amine names
 * with each locant list removed, and over the generators' ones; the mutation
 * sweeps; the ordered drawing; random and partial names; time budgets.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName, VERDICT_TEXTS } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { assemble } from '../../src/reverse/assemble.js';
import { interpret } from '../../src/reverse/interpret.js';
import { build } from '../../src/reverse/build.js';
import { searchStructures } from '../../src/reverse/search.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { STEP_FALLBACKS, diagnosisExplanation } from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { verdictLayout } from '../../src/ui/draw-name.js';
import { TILE_HINTS } from '../../src/ui/name-builder.js';
import {
  TILES, TEMPLATES, withArticle, templateAdmits, isAmineTemplate, isNitrileTemplate, isAcidTemplate, isEsterTemplate,
  isCarbonylTemplate, parentWordName, N_VALUE,
} from '../../src/reverse/tiles.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { aromaticKey } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { traditionalLabel, styleLabel } from '../../src/naming/lexicon.es.js';
import {
  generateAmines, generateRingPrincipalBenzenes, generateRingPolysuffixBenzenes, generateRingSubstituents,
} from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, isAmine, isAmineMolecule, isAmineTemplateName, AMINE_TEMPLATE_WORDS } from './reverse-words.js';

/** Time budget of one representative readName() call, in milliseconds (design.md §15.7; phones are slower). */
const PER_NAME_BUDGET_MS = 250;

/**
 * The tile ids of a name: space-separated tile words (reverse-words.js) when
 * every word is a tile, else a name text read by the tokenizer.
 *
 * @param {string} name - Tile words or a name.
 * @returns {string[]} The tile ids.
 */
function idsOf(name) {
  let ids = null;
  try {
    ids = seq(name);
  } catch (err) {
    ids = tokenize(name); // A name text: `N,4-dimetilanilina`.
  }
  assert.ok(ids, `no tiles for ${name}`);
  return ids;
} // End of function idsOf()

/**
 * The errors of a parse of tile words as `CODE[from,to)` strings.
 *
 * @param {string} words - Space-separated tile words (reverse-words.js).
 * @returns {string[]} The errors.
 */
function errorsOf(words) {
  return parse(seq(words)).errors.map((e) => `${e.code}[${e.from},${e.to})`);
}

/**
 * The first parse error's message.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {string} The message.
 */
function messageOf(words) {
  return parse(seq(words)).errors[0].message;
}

/**
 * The NameSpec of error-free tile words.
 *
 * @param {string} words - Space-separated tile words.
 * @returns {object} The NameSpec.
 */
function specOf(words) {
  const { tree, errors } = parse(seq(words));
  assert.deepEqual(errors, [], words);
  return interpret(tree);
}

/**
 * The aromatic-equivalence key of a SMILES molecule.
 *
 * @param {string} smiles - A SMILES (Kekulé form).
 * @returns {string} aromaticKey() of its graph.
 */
function keyOf(smiles) {
  return aromaticKey(parseSmiles(smiles));
}

/**
 * Every retained amine form the forward engine gives (aromatic.js
 * traditionalNameId(), positionalParts(); principal.js
 * carbonylTraditionalId()): [tile words, the text, the engine's name, its
 * label, SMILES].
 */
const ALTERNATIVES = [
  ['anilina', 'anilina', 'bencenamina', traditionalLabel('aniline'), 'NC1=CC=CC=C1'],
  ['N met il anilina', 'N-metilanilina', 'N-metilbencenamina', traditionalLabel('aniline'), 'CNC1=CC=CC=C1'],
  ['N N di met il anilina', 'N,N-dimetilanilina', 'N,N-dimetilbencenamina', traditionalLabel('aniline'), 'CN(C)C1=CC=CC=C1'],
  ['N 4 di met il anilina', 'N,4-dimetilanilina', 'N,4-dimetilbencen-1-amina', traditionalLabel('aniline'), 'CNC1=CC=C(C)C=C1'],
  ['4 cloro anilina', '4-cloroanilina', '4-clorobencen-1-amina', traditionalLabel('aniline'), 'NC1=CC=C(Cl)C=C1'],
  ['2 4 di cloro anilina', '2,4-dicloroanilina', '2,4-diclorobencen-1-amina', traditionalLabel('aniline'), 'NC1=CC=C(Cl)C=C1Cl'],
  ['N isopropil anilina', 'N-isopropilanilina', 'N-isopropilbencenamina', traditionalLabel('aniline'), 'CC(C)NC1=CC=CC=C1'],
  ['N START 2 cloro et il END anilina', 'N-(2-cloroetil)anilina', 'N-(2-cloroetil)bencenamina', traditionalLabel('aniline'),
    'ClCCNC1=CC=CC=C1'],
  ['4 met il oxi anilina', '4-metoxianilina', '4-metoxibencen-1-amina', traditionalLabel('aniline'), 'NC1=CC=C(OC)C=C1'],
  ['4 bromo N N di met il anilina', '4-bromo-N,N-dimetilanilina', '4-bromo-N,N-dimetilbencen-1-amina', traditionalLabel('aniline'),
    'CN(C)C1=CC=C(Br)C=C1'],
  // The orto/meta/para forms: one ring prefix beside the NH₂, the groups written `N` not counted.
  ['p cloro anilina', 'p-cloroanilina', '4-clorobencen-1-amina', styleLabel('positional'), 'NC1=CC=C(Cl)C=C1'],
  ['m cloro anilina', 'm-cloroanilina', '3-clorobencen-1-amina', styleLabel('positional'), 'NC1=CC=CC(Cl)=C1'],
  ['N et il p met il anilina', 'N-etil-p-metilanilina', 'N-etil-4-metilbencen-1-amina', styleLabel('positional'),
    'CCNC1=CC=C(C)C=C1'],
  ['p bromo N N di met il anilina', 'p-bromo-N,N-dimetilanilina', '4-bromo-N,N-dimetilbencen-1-amina', styleLabel('positional'),
    'CN(C)C1=CC=C(Br)C=C1'],
  ['bencilamina', 'bencilamina', 'fenilmetanamina', traditionalLabel('benzylamine'), 'NCC1=CC=CC=C1'],
];

// ---------------------------------------------------------------------------
// Tiles, parser, assembler and tokenizer.
// ---------------------------------------------------------------------------

test('«Nombres tradicionales» (R-6c3): the two amine tiles after the nitrile ones, each with a tooltip; quoted as on the tile', () => {
  const amines = TILES.filter((tile) => tile.kind === 'template' && tile.row === 'traditional').slice(31);
  assert.deepEqual(amines.map((tile) => tile.text), [...AMINE_TEMPLATE_WORDS]);
  assert.deepEqual(amines.map((tile) => [tile.id, tile.text]), [['template-aniline', 'anilina'], ['template-benzylamine', 'bencilamina']]);
  for (const tile of amines) {
    assert.ok(TILE_HINTS[tile.id] && TILE_HINTS[tile.id].endsWith('.'), tile.id);
    assert.ok(isAmineTemplate(tile.value) && !isNitrileTemplate(tile.value) && !isAcidTemplate(tile.value) && !isEsterTemplate(tile.value)
      && !isCarbonylTemplate(tile.value), tile.id);
    assert.equal(parentWordName(tile), tile.text, tile.id);
  }
  assert.equal(TILE_HINTS['template-aniline'], 'Benceno con un grupo NH₂: bencenamina. Admite ramas en el anillo y, con «N», en el '
    + 'nitrógeno: 4-cloroanilina, N-metilanilina, N,4-dimetilanilina.');
  assert.equal(TILE_HINTS['template-benzylamine'], 'Un carbono con un grupo NH₂ y un fenil: fenilmetanamina.');
  assert.deepEqual(['anilina', 'bencilamina'].map((word) => withArticle(word, 'de')), ['de la anilina', 'de la bencilamina']);
  // `anilina` takes any prefixes (as the engine writes it), `bencilamina` none.
  assert.deepEqual([TEMPLATES.aniline.substitutable, Boolean(TEMPLATES.benzylamine.substitutable)], [true, false]);
  assert.equal(templateAdmits('benzylamine', [{ slots: [{}], substituent: { kind: 'chain' } }]), false);
}); // End of test '«Nombres tradicionales» (R-6c3)…'

test('parser (R-6c3): numbers, `N` or a letter on an amine template, `N` beside a letter, pairing errors, one in a branch', () => {
  const cases = [
    ['4 anilina', ['TEMPLATE_LOCANTS[0,1)']], ['p anilina', ['TEMPLATE_LOCANTS[0,1)']], ['N anilina', ['TEMPLATE_LOCANTS[0,1)']],
    ['1 bencilamina', ['TEMPLATE_LOCANTS[0,1)']], ['di anilina', ['TILE_ORDER[0,1)']],
    // An `N` and a letter on one prefix: no used form (the engine writes `N,4-dimetilanilina`); no LOCANT_COUNT beside it.
    ['N p di met il anilina', ['POSITIONAL[0,2)']], ['N p met il anilina', ['POSITIONAL[0,2)']],
    // Without `N`, a group with no number is counted on the ring: three positions.
    ['et il p met il anilina', ['POSITIONAL[2,3)']], ['o di cloro anilina', ['POSITIONAL[0,1)']],
    // `bencilamina` is an open chain; `bencenamina` takes no letter (the engine letters `anilina` only).
    ['p met il bencilamina', ['POSITIONAL[0,1)']], ['p met il benceno amina', ['POSITIONAL[0,1)']],
    // In a branch, after `ácido`, before an O-bound group, before a suffix.
    ['START anilina END met ano', ['TILE_ORDER[1,2)', 'TILE_ORDER[2,3)']], ['START bencilamina END met ano', ['TILE_ORDER[1,2)',
      'TILE_ORDER[2,3)']],
    ['ácido anilina', ['ACID_WORD[0,1)']], ['anilina met ilo', ['ESTER_SUFFIX[1,3)']], ['anilina amina', ['TILE_ORDER[1,2)']],
    // `N` inside a compound branch of an anilina.
    ['START N met il et il END anilina', ['TILE_ORDER[1,2)']],
  ];
  for (const [words, errors] of cases) {
    assert.deepEqual(errorsOf(words), errors, words);
  }
  for (const words of ['N met il anilina', 'N N di met il anilina', 'N 4 di met il anilina', 'N et il p met il anilina',
    'p bromo N N di met il anilina', 'N met il bencilamina', '4 cloro N met il anilina']) {
    assert.deepEqual(errorsOf(words), [], words);
  }
  assert.equal(messageOf('4 anilina'), '«anilina» ya dice dónde va su grupo NH₂, en el carbono 1: no lleva números ni letras propios.');
  assert.equal(messageOf('1 bencilamina'), '«bencilamina» ya dice dónde van su grupo NH₂ y su fenilo, en el carbono 1: no lleva '
    + 'números ni letras propios.');
  assert.equal(messageOf('N p di met il anilina'), '«N» y las letras «o», «m» y «p» no van juntas delante de un mismo grupo: con un '
    + 'grupo en el nitrógeno y otro en el anillo, escribe los números (N,4-dimetilanilina).');
  assert.equal(messageOf('et il p met il anilina'), 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu '
    + 'nombre pone tres (contando el grupo NH₂ de la anilina): escribe los números (1,2,4-trimetilbenceno). Si un grupo va unido al '
    + 'nitrógeno, escribe «N» delante (N-etil-p-metilanilina).');
  assert.equal(messageOf('o di cloro anilina'), 'Las letras «o», «m» y «p» solo sirven cuando el benceno lleva dos grupos, y tu '
    + 'nombre pone tres (contando el grupo NH₂ de la anilina): escribe los números (1,2,4-trimetilbenceno).');
  assert.equal(messageOf('p met il benceno amina'), 'Con «bencenamina» no se usan «o», «m» ni «p»: escribe los números '
    + '(4-metilbencen-1-amina) o usa «anilina», de «Nombres tradicionales» (p-metilanilina).');
  assert.equal(messageOf('START anilina END met ano'), 'Esta ficha no puede ir aquí: «anilina» es el nombre de toda la molécula y va al '
    + 'final; dentro de una rama, el grupo NH₂ se escribe «amino», como en (4-aminofenil) o (aminometil).');
}); // End of test 'parser (R-6c3)…'

test('assembler and tokenizer (R-6c3): each template is one tile, read back with its `N` locants and letters', () => {
  for (const [words, name] of ALTERNATIVES) {
    assert.equal(assemble(parse(seq(words)).tree).text, name, words);
    assert.deepEqual(tokenize(name), seq(words), name);
  }
  // `fenil` + `metanamina` is another name (no `bencil` tile), and `bencilamina` reads as its one tile.
  assert.deepEqual(tokenize('bencilamina'), ['template-benzylamine']);
  assert.equal(tokenize('N,p-dimetilanilina'), null);
  assert.equal(tokenize('anilinamina'), null);
}); // End of test 'assembler and tokenizer (R-6c3)…'

// ---------------------------------------------------------------------------
// Interpreter, builder, search.
// ---------------------------------------------------------------------------

test('interpreter (R-6c3): the template\'s nitrogen is the placed suffix; `N` slots and the left-out slots that may take `N`', () => {
  const spec = specOf('N met il anilina');
  assert.deepEqual([spec.parent.kind, spec.parent.length, spec.parent.template.value, spec.parent.template.groups],
    ['benzene', 6, 'aniline', []]);
  assert.deepEqual([spec.suffix.kind, spec.suffix.placed, spec.suffix.slots.map((s) => [s.kind, s.value]), spec.suffix.word.text],
    ['amine', true, [['implicit', 1]], 'anilina']);
  assert.deepEqual(spec.prefixes[0].slots.map((s) => [s.kind, s.value, s.domain, s.nitrogen]), [['supplied', N_VALUE, [N_VALUE, 6], true]]);
  assert.deepEqual(spec.traditional, { value: 'aniline', tiles: [3, 4] });
  // Left out: a methyl may stand on the nitrogen, a chlorine may not.
  assert.deepEqual(specOf('met il anilina').leftOut.map((s) => [s.domain, Boolean(s.nitrogen)]), [[[N_VALUE, 6], true]]);
  assert.deepEqual(specOf('cloro anilina').leftOut.map((s) => [s.domain, Boolean(s.nitrogen)]), [[[1, 6], false]]);
  // `bencilamina`: a chain of one carbon with its phenyl and its nitrogen on it.
  const benzyl = specOf('bencilamina');
  assert.deepEqual([benzyl.parent.kind, benzyl.parent.length, benzyl.parent.template.groups.map((g) => g.substituent.kind),
    benzyl.suffix.kind, benzyl.suffix.slots.map((s) => s.value)], ['chain', 1, ['phenyl'], 'amine', [1]]);
}); // End of test 'interpreter (R-6c3)…'

test('builder (R-6c3): the groups written `N` on the nitrogen; LOCANT_RANGE and VALENCE on the student\'s tiles', () => {
  for (const [words, , , , smiles] of ALTERNATIVES) {
    const built = build(specOf(words));
    assert.ok(built.ok, words);
    assert.equal(aromaticKey(built.molecule), keyOf(smiles), words);
    assert.equal(built.suffixAtoms.length, 1, words);
    const nitrogen = built.suffixAtoms[0].attachment;
    assert.equal(built.molecule.atoms.get(nitrogen).element, 'N', words);
    built.prefixAtoms.filter((o) => o.locant === N_VALUE)
      .forEach((o) => assert.equal(o.parentAtom, nitrogen, `${words}: an \`N\` group on the nitrogen`));
    assert.ok(built.prefixAtoms.filter((o) => o.locant !== N_VALUE).every((o) => o.parentAtom !== nitrogen), words);
  } // End of the loop over the alternatives
  const cases = [
    ['N N N tri met il anilina', 'VALENCE', 'El nitrógeno de la amina tendría 4 enlaces, y un nitrógeno solo puede tener 3.', [2, 3]],
    ['7 cloro anilina', 'LOCANT_RANGE', 'El anillo de la anilina tiene 6 carbonos, del 1 al 6: no hay carbono 7.', [0, 1]],
    ['1 cloro anilina', 'VALENCE', 'El carbono 1 tendría 5 enlaces, y un carbono solo puede tener 4: en la anilina, ese carbono ya '
      + 'lleva un grupo NH₂.', [0, 1]],
    ['2 met il bencilamina', 'LOCANT_RANGE', 'La bencilamina solo tiene 1 carbono: no hay carbono 2. En «bencilamina» el anillo no se '
      + 'numera: con grupos en el anillo, escribe el nombre sistemático: «(4-metilfenil)metanamina».', [0, 1]],
  ];
  for (const [words, code, message, tiles] of cases) {
    assert.deepEqual(build(specOf(words)).error, { code, message, tiles }, words);
  }
  // The message on `2-metilbencilamina` leads to a name the app reads.
  assert.equal(readName(tokenize('(4-metilfenil)metanamina')).kind, 'correct');
}); // End of test 'builder (R-6c3)…'

test('search (R-6c3): left-out locants on an amine template, the nitrogen among the places', () => {
  const names = (words) => searchStructures(specOf(words), { namer: nameMolecule }).structures.map((s) => s.naming.name);
  assert.deepEqual(names('met il anilina'), ['N-metilbencenamina', '2-metilbencen-1-amina', '3-metilbencen-1-amina',
    '4-metilbencen-1-amina']);
  assert.deepEqual(names('cloro anilina'), ['2-clorobencen-1-amina', '3-clorobencen-1-amina', '4-clorobencen-1-amina']);
  assert.deepEqual(names('met il bencilamina'), ['1-fenil-N-metilmetanamina', '1-feniletan-1-amina']);
  assert.equal(readName(seq('cloro anilina')).message, 'Faltan números: puede ser 2-cloroanilina, 3-cloroanilina o 4-cloroanilina.');
  const full = readName(seq('penta cloro anilina'));
  assert.deepEqual([full.kind, full.filled], ['missingLocants', '2,3,4,5,6-pentacloroanilina']);
}); // End of test 'search (R-6c3)…'

// ---------------------------------------------------------------------------
// readName(): the engine's forms, substituted templates, diagnosis.
// ---------------------------------------------------------------------------

test('readName (R-6c3): every retained amine form the engine gives is an alternative, with the engine\'s own label', () => {
  for (const [words, text, name, label, smiles] of ALTERNATIVES) {
    const verdict = readName(idsOf(words));
    assert.equal(verdict.text, text, words);
    assert.equal(verdict.kind, 'alternative', `${text}: ${verdict.message}`);
    assert.equal(verdict.name, name, text);
    assert.deepEqual([verdict.matched.name, verdict.matched.label], [text, label]);
    assert.equal(verdict.message, `${VERDICT_TEXTS.correct} «${text}» es una forma válida (${label}). El nombre que doy primero es `
      + `«${name}».`);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${text} describes another graph`);
    assert.deepEqual([verdict.draw, verdict.errors], [true, []]);
  } // End of the loop over the alternatives
}); // End of test 'readName (R-6c3): every retained amine form…'

test('the forward engine lists exactly these forms; the systematic name is `correct` and announces them', () => {
  for (const [, text, name, , smiles] of ALTERNATIVES) {
    const naming = nameMolecule(parseSmiles(smiles));
    assert.equal(naming.name, name);
    assert.ok(naming.alternatives.some((alt) => alt.name === text), `${smiles}: ${text}`);
  }
  // No `N,p-` form (design.md §14.4), no anilina for a diamine, no bencilamina with prefixes.
  assert.deepEqual(nameMolecule(parseSmiles('CNC1=CC=C(C)C=C1')).alternatives.map((alt) => alt.name), ['N,4-dimetilanilina']);
  for (const smiles of ['NC1=CC=C(N)C=C1', 'CNCC1=CC=CC=C1', 'NCC1=CC=C(C)C=C1']) {
    assert.ok(nameMolecule(parseSmiles(smiles)).alternatives.every((alt) => !isAmineTemplateName(alt.name)), smiles);
  }
  const also = (id, word) => ` También se llama «${word}» (${traditionalLabel(id)}).`;
  assert.equal(readName(tokenize('bencenamina')).message, `${VERDICT_TEXTS.correct}${also('aniline', 'anilina')}`);
  assert.equal(readName(tokenize('4-clorobencen-1-amina')).message, `${VERDICT_TEXTS.correct}${also('aniline', '4-cloroanilina')}`);
  assert.equal(readName(tokenize('fenilmetanamina')).message, `${VERDICT_TEXTS.correct}${also('benzylamine', 'bencilamina')}`);
}); // End of test 'the forward engine lists exactly these forms…'

/**
 * `bencilamina` with prefixes the engine never writes on it: [tile words,
 * the engine's name, SMILES].
 */
const SUBSTITUTED = [
  ['N met il bencilamina', '1-fenil-N-metilmetanamina', 'CNCC1=CC=CC=C1'],
  ['N N di met il bencilamina', '1-fenil-N,N-dimetilmetanamina', 'CN(C)CC1=CC=CC=C1'],
  ['1 cloro bencilamina', 'cloro(fenil)metanamina', 'NC(Cl)C1=CC=CC=C1'],
  ['cloro bencilamina', 'cloro(fenil)metanamina', 'NC(Cl)C1=CC=CC=C1'],
  ['1 1 di cloro bencilamina', 'dicloro(fenil)metanamina', 'NC(Cl)(Cl)C1=CC=CC=C1'],
];

test('readName (R-6c3): a substituted `bencilamina` draws its molecule, named by the app, with SUBSTITUTED_TEMPLATE', () => {
  for (const [words, name, smiles] of SUBSTITUTED) {
    const ids = seq(words);
    const verdict = readName(ids);
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(verdict.name, name, words);
    assert.equal(aromaticKey(verdict.molecule), keyOf(smiles), `${words} describes another graph`);
    const { diagnosis } = verdict;
    assert.ok(diagnosis, `${words}: no diagnosis`);
    assert.deepEqual([diagnosis.code, diagnosis.rule, diagnosis.step], ['SUBSTITUTED_TEMPLATE', 2, 'groupChain'], words);
    assert.equal(diagnosis.message, 'El nombre tradicional «bencilamina» no admite sustituyentes: con más grupos, la molécula se '
      + `nombra con su nombre sistemático: «${name}».`, words);
    assert.deepEqual(diagnosis.tiles, [ids.length - 1, ids.length], `${words}: the template's tile`);
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok(opened.index >= 0 && [diagnosis.step, ...STEP_FALLBACKS[diagnosis.step]].includes(opened.steps[opened.index].id), words);
  } // End of the loop over the substituted templates
}); // End of test 'readName (R-6c3): a substituted `bencilamina`…'

/**
 * Prefixes the engine writes on `anilina`, judged by the other rules (never
 * SUBSTITUTED_TEMPLATE): [tile words, the engine's name, the code, the
 * message].
 */
const ADMITTED = [
  ['6 met il anilina', '2-metilbencen-1-amina', 'RING_NUMBERING', 'Hay que numerar el anillo de otra manera, empezando en otro carbono '
    + 'o contando hacia el otro lado: los sustituyentes tienen que llevar los números más bajos (2 en vez de 6).'],
  ['4 6 di cloro anilina', '2,4-diclorobencen-1-amina', 'RING_NUMBERING', 'Hay que numerar el anillo de otra manera, empezando en otro '
    + 'carbono o contando hacia el otro lado: los sustituyentes tienen que llevar los números más bajos (2 en vez de 4).'],
  ['N met il 4 cloro anilina', '4-cloro-N-metilbencen-1-amina', 'ALPHABETICAL_ORDER', 'Los sustituyentes se escriben por orden '
    + 'alfabético: «cloro» va antes que «metil» (c antes que m).'],
  ['N met il N met il anilina', 'N,N-dimetilbencenamina', 'UNGROUPED', 'Las ramas iguales se escriben una sola vez, con «di», «tri»… '
    + 'delante: «N,N-dimetil», no «N-metil-N-metil».'],
  ['2 met il 6 met il anilina', '2,6-dimetilbencen-1-amina', 'UNGROUPED', 'Las ramas iguales se escriben una sola vez, con «di», '
    + '«tri»… delante: «2,6-dimetil», no «2-metil-6-metil».'],
  // A letter is no word of a prefix: «etil» before «metil», as the engine cites them (`N-etil-p-metilanilina`).
  ['p met il N et il anilina', 'N-etil-4-metilbencen-1-amina', 'ALPHABETICAL_ORDER', 'Los sustituyentes se escriben por orden '
    + 'alfabético: «etil» va antes que «metil» (e antes que m).'],
  ['N N di met il p cloro anilina', '4-cloro-N,N-dimetilbencen-1-amina', 'ALPHABETICAL_ORDER', 'Los sustituyentes se escriben por '
    + 'orden alfabético: «cloro» va antes que «metil» (c antes que m).'],
];

test('readName (R-6c3): prefixes the engine writes on `anilina` are judged by the other rules', () => {
  for (const [words, name, code, message] of ADMITTED) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name], ['otherName', name], words);
    assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.message], [code, message], words);
    const opened = diagnosisExplanation(verdict, explain);
    const { step } = verdict.diagnosis;
    assert.ok(opened.index >= 0 && [step, ...STEP_FALLBACKS[step]].includes(opened.steps[opened.index].id), words);
  }
}); // End of test 'readName (R-6c3): prefixes the engine writes on `anilina`…'

/**
 * The category of an amine template's own mistake (a deliberate null of
 * diagnose.js «Amines», phase I-52c4), read from the engine's naming,
 * independently of diagnose.js: `seniority` (the engine's principal group is
 * another: `4-hidroxianilina` → «4-aminofenol»), `count` (more amine
 * groups: `4-aminoanilina`), `side` (the engine's parent is on the other
 * side of the nitrogen: `N-etilbencilamina`), `style` (the engine writes an
 * `anilina` name for the molecule, the student's prefixes in another style:
 * the open question of the retained words' prefix style); null otherwise.
 *
 * @param {object} verdict - An `otherName` verdict of a name with `anilina` or `bencilamina`.
 * @returns {string|null} The category.
 */
function templateCategory(verdict) {
  const { suffix } = verdict.naming.structure;
  if (!suffix || suffix.kind !== 'amine') {
    return 'seniority';
  }
  if (suffix.locants.length > 1) {
    return 'count';
  }
  const own = verdict.suffixAtoms[0];
  if (!verdict.naming.parent.atoms.includes(own.parentAtom)) {
    return 'side';
  }
  return verdict.naming.alternatives.some((alt) => isAmineTemplateName(alt.name)) ? 'style' : null;
} // End of function templateCategory()

/** The amine's own mistakes on a template, deliberate «Amines» nulls (phase I-52c4): [tile words, category]. */
const NULLS = [
  ['4 hidroxi anilina', 'seniority'], ['N acetil anilina', 'seniority'], ['4 ciano anilina', 'seniority'],
  ['4 carboxi anilina', 'seniority'], ['4 amino anilina', 'count'], ['2 amino anilina', 'count'], ['N et il bencilamina', 'side'],
  ['N prop il bencilamina', 'side'],
  // The open question of the retained words' prefix style (as `4-(propan-2-il)ftalonitrilo`): the engine writes `4-isopropilanilina`.
  ['4 prop ano 2 il anilina', 'style'],
];

test('the amine\'s own mistakes on a template: deliberate «Amines» nulls (phase I-52c4), each with its category read independently', () => {
  for (const [words, category] of NULLS) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'otherName', `${words}: ${verdict.message}`);
    assert.equal(templateCategory(verdict), category, words);
    assert.equal(verdict.diagnosis, null, `${words}: ${verdict.diagnosis && verdict.diagnosis.message}`);
    assert.ok(verdict.draw && verdict.molecule, words);
  }
}); // End of test 'the amine\'s own mistakes on a template…'

// ---------------------------------------------------------------------------
// Fixtures, closed loops, sweeps, drawing and time.
// ---------------------------------------------------------------------------

test('fixture round trip (R-6c3): every fixture name with a retained amine word reads back, graph compared with the SMILES', async () => {
  const rows = (await readFixtures()).filter((row) => isAmine(row.smiles));
  const covered = [];
  for (const row of rows) {
    for (const name of row.names.filter(isAmineTemplateName)) {
      const ids = tokenize(name);
      assert.ok(ids, `names.tsv:${row.line}: no tiles for ${name}`);
      assert.equal(assemble(parse(ids).tree).text, name, `names.tsv:${row.line}: assembly`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, 'alternative', `names.tsv:${row.line}: ${verdict.message}`);
      assert.equal(verdict.name, row.names[0]);
      assert.equal(aromaticKey(verdict.molecule), keyOf(row.smiles), `names.tsv:${row.line}: ${name}`);
      covered.push(name);
    }
  } // End of the loop over the fixture rows
  // The 16 names reverse-amines.test.js counted as later until phase I-52c3 (`bencilamina` with the class names).
  assert.deepEqual(covered, ['anilina', 'N-metilanilina', 'N,N-dimetilanilina', 'bencilamina', '2-cloroanilina', 'o-cloroanilina',
    '2-cloroanilina', 'o-cloroanilina', '4-metilanilina', 'p-metilanilina', 'N,4-dimetilanilina', 'N-etil-4-metilanilina',
    'N-etil-p-metilanilina', '4-bromo-N,N-dimetilanilina', 'p-bromo-N,N-dimetilanilina', '3,5-dicloroanilina']);
}); // End of test 'fixture round trip (R-6c3)…'

/** Molecules whose engine names include a retained amine name with locants (ring prefixes, groups on the nitrogen). */
const LOOP_SMILES = Object.freeze([
  'CNC1=CC=CC=C1', 'CN(C)C1=CC=CC=C1', 'CNC1=CC=C(C)C=C1', 'NC1=CC=C(Cl)C=C1', 'NC1=CC=C(Cl)C=C1Cl', 'CCNC1=CC=C(C)C=C1',
  'CN(C)C1=CC=C(Br)C=C1', 'NC1=CC(Cl)=CC(Cl)=C1', 'CCN(C)C1=CC=CC=C1', 'CNC1=CC=CC=C1C', 'NC1=C(Cl)C(Cl)=C(Cl)C(Cl)=C1Cl',
  'ClCCNC1=CC=CC=C1', 'NC1=CC=C(OC)C=C1',
]);

test('closed loop (R-6c3): engine retained amine name → tiles → readName() → the same graph, then without each locant list', () => {
  const counts = { names: 0, removed: 0, decisive: 0 };
  const kinds = {};
  for (const smiles of LOOP_SMILES) {
    const mol = parseSmiles(smiles);
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, smiles);
    const key = aromaticKey(mol);
    for (const name of naming.alternatives.map((alt) => alt.name).filter(isAmineTemplateName)) {
      const ids = tokenize(name);
      assert.ok(ids, `no tiles for ${name}`);
      const verdict = readName(ids);
      assert.equal(verdict.kind, 'alternative', `${name}: ${verdict.message}`);
      assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
      counts.names += 1;
      const { tree } = parse(ids);
      for (const item of tree.items.filter((it) => it.type === 'prefix' && it.locants.length > 0)) {
        const reread = readName(ids.filter((_, j) => !item.locants.includes(j)));
        counts.removed += 1;
        kinds[reread.kind] = (kinds[reread.kind] || 0) + 1;
        const where = `${name} → ${reread.text}: ${reread.kind}, ${reread.message}`;
        if (reread.kind === 'ambiguous') {
          assert.ok(reread.candidates.some((c) => aromaticKey(c.molecule) === key), where);
        } else if (reread.kind !== 'invalid') {
          assert.ok(['missingLocants', 'otherName'].includes(reread.kind), where);
          assert.equal(aromaticKey(reread.molecule), key, where);
          if (reread.kind === 'missingLocants') {
            assert.equal(reread.filled, name, where);
          }
        } else {
          // A letter left on another prefix counts the unlocated group on the ring (`etil-p-metilanilina`): POSITIONAL.
          assert.deepEqual(reread.errors.map((e) => e.code), ['POSITIONAL'], where);
        }
        counts.decisive += 1;
      } // End of the loop over the locant lists
    } // End of the loop over the template names of a molecule
  } // End of the loop over the molecules
  assert.deepEqual(counts, { names: 17, removed: 18, decisive: 18 }, JSON.stringify(counts));
  // Most removals leave a group that may stand on the nitrogen or on the ring: `metilanilina` is ambiguous; one is the engine's own
  // name with the numbers back (`pentacloroanilina`); the two lettered names with an `N` removed count three ring positions.
  assert.deepEqual(kinds, { ambiguous: 15, invalid: 2, missingLocants: 1 }, JSON.stringify(kinds));
}); // End of test 'closed loop (R-6c3)…'

/** The closed loop's generators (scripts/oracle/generate.mjs), the seeds of reverse-amines.test.js. */
const GENERATED = Object.freeze({
  amines: Object.freeze({ count: 600, seed: 6301, maxSize: 12 }),
  principal: Object.freeze({ count: 400, seed: 6302, minSize: 6, maxSize: 12 }),
  polysuffix: Object.freeze({ count: 300, seed: 6303, minSize: 6, maxSize: 12 }),
  ringSubstituents: Object.freeze({ count: 400, seed: 6304, maxSize: 12 }),
});

/**
 * The retained amine names of the generators' amines (distinct by aromatic
 * key, named by the engine), with each molecule's naming and key.
 *
 * @returns {{name: string, naming: object, key: string}[]} The names.
 */
function generatedTemplateNames() {
  const seen = new Set();
  const out = [];
  const all = [...generateAmines(GENERATED.amines), ...generateRingPrincipalBenzenes(GENERATED.principal),
    ...generateRingPolysuffixBenzenes(GENERATED.polysuffix), ...generateRingSubstituents(GENERATED.ringSubstituents)];
  for (const mol of all.filter(isAmineMolecule)) {
    const key = aromaticKey(mol);
    const naming = nameMolecule(mol);
    if (seen.has(key) || !naming.ok) {
      continue;
    }
    seen.add(key);
    naming.alternatives.map((alt) => alt.name).filter(isAmineTemplateName).forEach((name) => out.push({ name, naming, key }));
  }
  return out;
} // End of function generatedTemplateNames()

/**
 * The form of a retained amine name: the bare words, a lettered form, or an
 * `anilina` with groups on the nitrogen only, on the ring only, or both.
 *
 * @param {string} name - A retained amine name.
 * @returns {string} The form.
 */
function formOf(name) {
  if (AMINE_TEMPLATE_WORDS.includes(name)) {
    return name;
  }
  if (/(?:^|-)[omp]-/.test(name)) {
    return 'lettered';
  }
  const nitrogen = /(?:^|[-,])N[-,]/.test(name);
  const ring = /\d/.test(name.replace(/\([^()]*\)|\[[^[\]]*\]/g, ''));
  return (nitrogen && ring && 'nitrogenAndRing') || (nitrogen && 'nitrogen') || 'ring';
} // End of function formOf()

test('closed loop (R-6c3): the generators\' retained amine names read back as the engine\'s alternatives, the same graph', () => {
  const names = generatedTemplateNames();
  const forms = {};
  for (const { name, naming, key } of names) {
    const verdict = readName(idsOf(name));
    assert.equal(verdict.kind, 'alternative', `${name}: ${verdict.message}`);
    assert.equal(verdict.name, naming.name, name);
    assert.equal(aromaticKey(verdict.molecule), key, `${name} builds another graph`);
    forms[formOf(name)] = (forms[formOf(name)] || 0) + 1;
  }
  // The seeds give 291 (reverse-amines.test.js counted them as later until phase I-52c3).
  assert.equal(names.length, 291);
  assert.deepEqual(forms, { anilina: 1, bencilamina: 1, lettered: 54, nitrogen: 18, nitrogenAndRing: 145, ring: 72 });
}); // End of test 'closed loop (R-6c3): the generators\'…'

/**
 * The diagnosis codes an `otherName` of each mutation family may give, or
 * null for the amine's own mistakes (deliberate «Amines» nulls until phase
 * I-52c4, with the category FAMILY_CATEGORY gives).
 */
const FAMILY_CODES = Object.freeze({
  reflected: ['RING_NUMBERING'],
  unsorted: ['ALPHABETICAL_ORDER'],
  substituted: ['SUBSTITUTED_TEMPLATE'],
  hydroxy: null,
  amino: null,
});

/** The category of the amine's own mistakes each null family gives (templateCategory()). */
const FAMILY_CATEGORY = Object.freeze({ hydroxy: 'seniority', amino: 'count' });

/**
 * The mutations of one retained amine name: on `anilina`, its ring numbers
 * reflected (`reflected`: v → 8 − v, `6-metilanilina`), its first two
 * different prefixes swapped (`unsorted`), an OH (`hydroxy`, a senior group)
 * or an NH₂ (`amino`, a second amine group) on its first free ring carbon;
 * on `bencilamina`, a methyl on the nitrogen (`substituted`). A lettered
 * form gets no ring mutation (its letter would say three positions).
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations (none equal to the name).
 */
function mutationsOf(ids) {
  const { tree } = parse(ids);
  const { tiles } = tree;
  const out = [];
  /**
   * Records one mutation unless it changes nothing.
   *
   * @param {string} family - Its family.
   * @param {string[]} mutated - Its tile ids.
   * @returns {void}
   */
  const push = (family, mutated) => {
    if (mutated.join() !== ids.join()) {
      out.push({ family, ids: mutated });
    }
  };
  if (tiles[tree.parent.chain.tile].value === 'benzylamine') {
    push('substituted', [...seq('N met il'), ...ids]);
    return out;
  }
  const prefixes = tree.items.filter((it) => it.type === 'prefix');
  const lettered = prefixes.some((item) => item.letter !== null);
  if (!lettered) {
    const reflected = [...ids];
    for (const item of prefixes) {
      const ring = item.locants.filter((p) => tiles[p].kind === 'num');
      const values = ring.map((p) => 8 - tiles[p].value).sort((a, b) => a - b);
      ring.forEach((p, k) => {
        reflected[p] = `num-${values[k]}`;
      });
    }
    push('reflected', reflected);
    const used = new Set(prefixes.flatMap((item) => item.locants.filter((p) => tiles[p].kind === 'num').map((p) => tiles[p].value)));
    const free = [2, 3, 4, 5, 6].find((v) => !used.has(v));
    if (free) {
      push('hydroxy', [`num-${free}`, ...seq('hidroxi'), ...ids]);
      push('amino', [`num-${free}`, ...seq('amino'), ...ids]);
    }
  }
  const words = prefixes.map((item) => ids.slice(item.range[0], item.range[1]));
  const j = words.findIndex((w) => w.join() !== words[0].join());
  if (j > 0) {
    const swapped = [...words];
    [swapped[0], swapped[j]] = [swapped[j], swapped[0]];
    push('unsorted', [...swapped.flat(), ...ids.slice(tree.parent.range[0])]);
  }
  return out;
} // End of function mutationsOf()

/**
 * Reads every mutation of some retained amine names: an `otherName` of a
 * family with codes must carry a diagnosis of them whose step resolves in
 * its explanation; one of a null family a null diagnosis of its category.
 *
 * @param {string[]} names - Retained amine names.
 * @returns {{otherName: Object<string, number>, codes: Set<string>, unexpected: string[]}} `otherName` counts by family, the
 *   codes seen and the unexpected nulls.
 */
function sweep(names) {
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const codes = new Set();
  const unexpected = [];
  for (const name of names) {
    for (const mutation of mutationsOf(idsOf(name))) {
      const verdict = readName(mutation.ids);
      if (verdict.kind !== 'otherName') {
        continue;
      }
      otherName[mutation.family] += 1;
      const label = `${name} → ${mutation.family} ${verdict.text}`;
      const d = verdict.diagnosis;
      if (FAMILY_CODES[mutation.family] === null) {
        assert.equal(d, null, `${label}: ${d && d.message}`);
        assert.equal(templateCategory(verdict), FAMILY_CATEGORY[mutation.family], label);
        continue;
      }
      if (!d) {
        unexpected.push(label);
        continue;
      }
      codes.add(d.code);
      assert.ok(FAMILY_CODES[mutation.family].includes(d.code), `${label}: ${d.code}, ${d.message}`);
      assert.ok(!/undefined|null|NaN|\[object/.test(d.message), `${label}: ${d.message}`);
      const opened = diagnosisExplanation(verdict, explain);
      assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { otherName, codes, unexpected };
} // End of function sweep()

test('mutations of the fixture\'s retained amine names: a diagnosis of the family\'s codes, or a deliberate «Amines» null', async () => {
  const names = (await readFixtures()).filter((row) => isAmine(row.smiles)).flatMap((row) => row.names).filter(isAmineTemplateName);
  assert.equal(names.length, 16);
  const { otherName, codes, unexpected } = sweep(names);
  assert.deepEqual(unexpected, []);
  // The ring numbering reflected: RING_NUMBERING; two different prefixes swapped: ALPHABETICAL_ORDER; `N-metilbencilamina`:
  // SUBSTITUTED_TEMPLATE; an OH beside the word (a senior group) and a second NH₂: the amine's own mistakes, deliberate nulls.
  assert.deepEqual(otherName, { reflected: 2, unsorted: 4, substituted: 1, hydroxy: 10, amino: 5 });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'RING_NUMBERING', 'SUBSTITUTED_TEMPLATE']);
}); // End of test 'mutations of the fixture\'s retained amine names…'

test('mutations of the generated retained amine names: every otherName is diagnosed or a deliberate «Amines» null', () => {
  const { otherName, codes, unexpected } = sweep(generatedTemplateNames().map(({ name }) => name));
  assert.deepEqual(unexpected, []);
  assert.deepEqual(otherName, { reflected: 195, unsorted: 225, substituted: 1, hydroxy: 211, amino: 66 });
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'RING_NUMBERING', 'SUBSTITUTED_TEMPLATE']);
}); // End of test 'mutations of the generated retained amine names…'

test('«Dibujar» (R-6c3): amine template verdicts have an ordered drawing (canonical layout without problems)', () => {
  for (const words of ['anilina', 'N met il anilina', 'N N di met il anilina', 'N 4 di met il anilina', 'p cloro anilina',
    'p bromo N N di met il anilina', 'bencilamina', 'N met il bencilamina', '4 hidroxi anilina', '6 met il anilina']) {
    const verdict = readName(seq(words));
    const laid = verdictLayout(verdict);
    assert.ok(laid, `${verdict.text}: no ordered drawing`);
    assert.deepEqual([...laid.atoms.keys()], [...verdict.molecule.atoms.keys()], 'the verdict\'s atom ids are kept');
  }
}); // End of test '«Dibujar» (R-6c3)…'

/**
 * Seeded pseudo-random generator (mulberry32).
 *
 * @param {number} seed - The seed.
 * @returns {() => number} A function returning numbers in [0, 1).
 */
function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('property (R-6c3): random names with a retained amine word — prefixes, `N`, letters, tails or none — never crash', () => {
  const random = mulberry32(20261017);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const prefixes = ['', '', '4 cloro', 'cloro', 'N met il', 'N N di met il', 'N 4 di met il', 'p met il', 'N p di met il', 'met il',
    '2 START 4 met il fenil END', 'N acetil', '4 hidroxi', '4 amino', 'N N N tri met il', '7 bromo', 'ácido', 'di', 'N'];
  const words = ['anilina', 'anilina', 'bencilamina', 'benceno amina'];
  const tails = ['', '', '', 'amina', 'met ilo', 'oico', 'met il'];
  const kinds = new Map();
  for (let i = 0; i < 300; i += 1) {
    const name = [pick(prefixes), pick(prefixes), pick(words), pick(tails)].filter(Boolean).join(' ');
    const ids = seq(name);
    const verdict = readName(ids, { budget: { ms: 200 } });
    kinds.set(verdict.kind, (kinds.get(verdict.kind) || 0) + 1);
    if (verdict.draw) {
      assert.ok(verdict.molecule && verdict.name, name);
    }
    if (verdict.kind === 'invalid') {
      assert.ok(verdict.errors.length > 0 && verdict.errors.every((e) => e.from <= e.to && e.to <= ids.length), name);
      assert.ok(verdict.errors.every((e) => !/undefined|null|NaN|\[object/.test(e.message)), name);
    }
    if (verdict.kind === 'otherName' && verdict.diagnosis) {
      assert.ok(!/undefined|null|NaN|\[object/.test(verdict.diagnosis.message), `${name}: ${verdict.diagnosis.message}`);
    }
  } // End of the loop over the random names
  for (const kind of ['alternative', 'otherName', 'invalid']) {
    assert.ok(kinds.get(kind) > 0, `no ${kind} verdict: ${JSON.stringify([...kinds])}`);
  }
}); // End of test 'property (R-6c3)…'

test('partial names (R-6c3): every start of a retained amine name\'s tiles reads as a verdict, an error with its tiles when unfinished', () => {
  const kinds = new Set();
  for (const words of ['p bromo N N di met il anilina', 'N et il p met il anilina', 'N 4 di met il anilina', 'bencilamina']) {
    const ids = seq(words);
    for (let k = 1; k <= ids.length; k += 1) {
      const verdict = readName(ids.slice(0, k));
      kinds.add(verdict.kind);
      if (verdict.kind === 'invalid') {
        assert.ok(verdict.errors.length > 0 && verdict.errors.every((e) => e.from <= e.to && e.to <= k), `${words} [${k}]`);
      }
    } // End of the loop over the starts of a name
  } // End of the loop over the names
  assert.ok(kinds.has('invalid') && kinds.has('alternative'), [...kinds].join());
}); // End of test 'partial names (R-6c3)…'

test('time (R-6c3): representative amine template names within the per-name budget', () => {
  const all = ['di met il anilina', 'tri met il anilina', 'penta cloro anilina', 'met il cloro anilina', 'N met il bencilamina',
    'p bromo N N di met il anilina', 'START cloro et il END anilina'];
  all.forEach((words) => readName(seq(words))); // Warm-up.
  for (const words of all) {
    const start = performance.now();
    readName(seq(words));
    const elapsed = performance.now() - start;
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${words}: ${elapsed.toFixed(1)} ms`);
  }
}); // End of test 'time (R-6c3)…'
