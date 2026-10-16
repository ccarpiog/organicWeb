/**
 * @file Unit tests for the ring diagnoses of «¿Cómo se dibuja?»
 * (src/reverse/diagnose.js, design.md §13.5, §14.4, §14.5, §15.8 R-4;
 * phase I-50d): one case per ring rule (RING_IS_PARENT, BENZENE_RING,
 * SUBSTITUTED_TEMPLATE, RING_NUMBERING, LETTER_LOCANTS) and per R-3 rule as
 * it applies on a ring parent, each with a near miss that must not fire;
 * the invariants of every ring diagnosis (ids of the verdict's molecule, the
 * student's chain or ring as a path of bonds, a step that resolves in
 * diagnosisExplanation(), the trace rule it follows); the cases no rule
 * covers or that cannot occur, tested as they behave; the kindest reading
 * of a left-out ring locant; the review I-50d cases (a ring numbering
 * blamed by alphabetical order only in the order of the student's own
 * words, and its explanation in that order; needless ring locants beside a
 * branch that keeps its own numbers); and sweeps of mutated ring names — the
 * `ciclo` and benzene rows of tests/fixtures/names.tsv with exact counts,
 * and the oracle's ring generators with a minimum coverage — in which every
 * `otherName` gets the diagnosis its mutation family expects.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { placementReading, searchStructures } from '../../src/reverse/search.js';
import {
  diagnose, diagnosisNaming, diagnosisExplanation, DIAGNOSES, DIAGNOSIS_CODES, DIAGNOSIS_TEXTS, STEP_FALLBACKS,
} from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { nameMolecule } from '../../src/naming/index.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { generateMonocycles, generateBenzenes } from '../../scripts/oracle/generate.mjs';
import { seq, readFixtures, isMonocyclicHydrocarbon, isCycloName, isBenzeneName } from './reverse-words.js';

/** The codes only a ring gives. */
const RING_CODES = Object.freeze(['RING_IS_PARENT', 'BENZENE_RING', 'SUBSTITUTED_TEMPLATE', 'RING_NUMBERING', 'LETTER_LOCANTS']);

/** Ring codes whose own step always exists in the explanation (no fallback needed). */
const EXACT_STEP_CODES = Object.freeze(['RING_IS_PARENT', 'BENZENE_RING', 'SUBSTITUTED_TEMPLATE', 'RING_NUMBERING']);

/**
 * The tile ids of a name: space-separated tile words (reverse-words.js), or
 * a name text read by the tokenizer.
 *
 * @param {string} name - Tile words or a name.
 * @returns {string[]} The tile ids.
 */
function idsOf(name) {
  const ids = name.includes(' ') ? seq(name) : tokenize(name);
  assert.ok(ids, `no tiles for ${name}`);
  return ids;
}

/**
 * Reads a name (tile words or text).
 *
 * @param {string} name - Tile words or a name.
 * @returns {object} The verdict.
 */
function read(name) {
  return readName(idsOf(name));
}

/**
 * Sorts two numbers ascending.
 *
 * @param {number[]} pair - Two numbers.
 * @returns {number[]} A sorted copy.
 */
function sorted(pair) {
  return [...pair].sort((p, q) => p - q);
}

/**
 * Asserts the invariants of a diagnosed `otherName` verdict whose molecule
 * the engine names on its ring: a known code with its rule; a Spanish
 * message with every blank filled; a JSON-safe object; atom and bond ids of
 * the verdict's molecule; the student's chain — or ring, its closing bond
 * last — a path of bonds; the app's parent the naming's (in the
 * diagnosis's style); a step that diagnosisExplanation() resolves and opens
 * (the ring rules' own step, never a fallback; for RING_NUMBERING a step
 * that numbers the ring the app's way); and the trace rule it follows.
 *
 * @param {object} verdict - An `otherName` verdict with a diagnosis.
 * @param {string} label - Assertion label.
 * @returns {void}
 */
function assertRingDiagnosis(verdict, label) {
  const d = verdict.diagnosis;
  assert.equal(verdict.kind, 'otherName', label);
  assert.ok(d, `${label}: no diagnosis`);
  assert.ok(DIAGNOSES[d.code], `${label}: ${d.code}`);
  assert.equal(d.rule, DIAGNOSES[d.code].rule, label);
  assert.ok(d.message.length > 0 && !/undefined|null|NaN|\[object/.test(d.message), `${label}: ${d.message}`);
  assert.deepEqual(JSON.parse(JSON.stringify(d)), d, `${label}: JSON-safe`);
  assert.ok(PREFIX_STYLES.includes(d.style), label);
  const { molecule } = verdict;
  const naming = diagnosisNaming(verdict);
  assert.equal(naming.structure.parentKind, 'ring', `${label}: the app's parent is the ring`);
  for (const ids of [d.student, d.parent, d.focus]) {
    ids.atoms.forEach((id) => assert.ok(molecule.atoms.has(id), `${label}: atom ${id}`));
    ids.bonds.forEach((id) => assert.ok(molecule.bonds.has(id), `${label}: bond ${id}`));
  }
  const n = d.student.atoms.length;
  assert.ok(d.student.bonds.length === n - 1 || d.student.bonds.length === n, `${label}: a chain or a ring`);
  d.student.bonds.forEach((id, i) => {
    const bond = molecule.bonds.get(id);
    assert.deepEqual(sorted([bond.a, bond.b]), sorted([d.student.atoms[i], d.student.atoms[(i + 1) % n]]), `${label}: bond ${id}`);
  });
  assert.deepEqual(d.parent, naming.parent, `${label}: the app's parent`);
  if (d.tiles) {
    assert.ok(d.tiles[0] >= 0 && d.tiles[0] < d.tiles[1], `${label}: tiles ${d.tiles}`);
  }
  // The step resolves in the explanation of the naming the diagnosis compared with.
  const opened = diagnosisExplanation(verdict, explain);
  assert.deepEqual(opened.naming, naming, `${label}: the explanation's naming`);
  const resolved = [d.step, ...STEP_FALLBACKS[d.step]].find((id) => opened.steps.some((step) => step.id === id));
  assert.ok(resolved, `${label}: no step «${d.step}» in ${opened.steps.map((s) => s.id)}`);
  assert.equal(opened.steps[opened.index].id, resolved, label);
  if (EXACT_STEP_CODES.includes(d.code)) {
    assert.equal(resolved, d.step, `${label}: the ring rule's own step`);
  }
  assertTraceRule(d, naming, opened.steps[opened.index], label);
} // End of function assertRingDiagnosis()

/**
 * Asserts the trace rule a ring diagnosis follows: `RING` for
 * RING_IS_PARENT (the student's chain, apart from the ring, is a branch of
 * it), the ring numbering rule that drops the student's start and direction
 * for RING_NUMBERING (and the step opened numbers the ring the app's way),
 * none for the others.
 *
 * @param {object} d - The diagnosis.
 * @param {object} naming - The naming it compared with.
 * @param {object} opened - The explanation step opened.
 * @param {string} label - Assertion label.
 * @returns {void}
 */
function assertTraceRule(d, naming, opened, label) {
  if (d.code === 'RING_IS_PARENT') {
    assert.equal(d.traceRule, 'RING', label);
    assert.ok(naming.trace.some((step) => step.rule === 'RING'), label);
    assert.equal(d.student.bonds.length, d.student.atoms.length - 1, `${label}: the student's parent is a chain`);
    assert.ok(!d.student.atoms.some((id) => d.parent.atoms.includes(id)), `${label}: the chain is outside the ring`);
    return;
  }
  if (d.code !== 'RING_NUMBERING') {
    assert.equal(d.traceRule, null, label);
    return;
  }
  assert.equal(d.student.bonds.length, d.student.atoms.length, `${label}: the student's ring`);
  assert.notDeepEqual(d.student.atoms, d.parent.atoms, label);
  const directed = d.student.atoms.join('-');
  const step = naming.trace.find((s) => s.rule === d.traceRule);
  assert.ok(step.candidatesBefore.some((c) => c.direction && c.key === directed), label);
  assert.ok(!step.survivors.some((c) => c.direction && c.key === directed), `${label}: ${d.traceRule} keeps the numbering`);
  (opened.locants || []).forEach(([atom, k]) => assert.equal(atom, d.parent.atoms[k - 1], `${label}: locant ${k}`));
} // End of function assertTraceRule()

/**
 * One case per ring rule and per R-3 rule as it applies on a ring: the name,
 * the code, the trace rule, the step opened by «Ver el paso» and the
 * message; then a near miss — a name close to it on which that rule must
 * not fire — and what it gives instead (a verdict kind, or another code).
 */
const CASES = [
  ['1-(4-metilfenil)propano', 'RING_IS_PARENT', 'RING', 'benzene',
    'El anillo es la cadena principal: un anillo manda siempre sobre una cadena abierta, aunque la cadena sea más larga. '
    + 'Tu cadena de 3 carbonos va en una rama del anillo: «1-metil-4-propilbenceno».',
    '1-metil-4-propilbenceno', 'correct'],
  ['1-ciclohexilhexano', 'RING_IS_PARENT', 'RING', 'ring',
    'El anillo es la cadena principal: un anillo manda siempre sobre una cadena abierta, aunque la cadena sea más larga. '
    + 'Tu cadena de 6 carbonos va en una rama del anillo: «hexilciclohexano».',
    '(hexan-1-il)ciclohexano', 'NEEDLESS_LOCANTS'],
  ['ciclohexilmetano', 'RING_IS_PARENT', 'RING', 'ring',
    'El anillo es la cadena principal: un anillo manda siempre sobre una cadena abierta, aunque la cadena sea más larga. '
    + 'Tu cadena de 1 carbono va en una rama del anillo: «metilciclohexano».',
    'metilciclohexano', 'correct'],
  ['1,4-dimetilciclohexa-1,3,5-trieno', 'BENZENE_RING', null, 'benzene',
    'Un anillo de 6 carbonos con tres enlaces dobles alternados, uno sí y uno no, es el benceno, y tiene nombre propio: '
    + '«benceno». Se escribe «1,4-dimetilbenceno».',
    'ciclohexa-2,4-dieno', 'RING_NUMBERING'],
  ['ciclohexa-1,3,5-trieno', 'BENZENE_RING', null, 'benzene',
    'Un anillo de 6 carbonos con tres enlaces dobles alternados, uno sí y uno no, es el benceno, y tiene nombre propio: '
    + '«benceno».',
    'ciclohexa-1,3-dieno', 'correct'],
  ['4-metiltolueno', 'SUBSTITUTED_TEMPLATE', null, 'benzene',
    'El nombre tradicional «tolueno» no admite más sustituyentes: con más ramas en el anillo, la molécula se nombra a partir de '
    + '«benceno», con todas las ramas delante: «1,4-dimetilbenceno».',
    '1,6-xileno', 'RING_NUMBERING'],
  ['p-metiltolueno', 'SUBSTITUTED_TEMPLATE', null, 'benzene',
    'El nombre tradicional «tolueno» no admite más sustituyentes: con más ramas en el anillo, la molécula se nombra a partir de '
    + '«benceno», con todas las ramas delante: «1,4-dimetilbenceno».',
    'p-xileno', 'alternative'],
  ['4-metil-1,2-xileno', 'SUBSTITUTED_TEMPLATE', null, 'benzene',
    'El nombre tradicional «xileno» no admite más sustituyentes: con más ramas en el anillo, la molécula se nombra a partir de '
    + '«benceno», con todas las ramas delante: «1,2,4-trimetilbenceno».',
    '1,2,4-trimetilbenceno', 'correct'],
  ['1,5-dimetilciclohexano', 'RING_NUMBERING', 'N3', 'ringNumbering',
    'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los sustituyentes '
    + 'tienen que llevar los números más bajos (3 en vez de 5).',
    '3,1-dimetilciclohexano', 'LOCANT_ORDER'],
  ['1,5-dimetilbenceno', 'RING_NUMBERING', 'N3', 'ringNumbering',
    'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los sustituyentes '
    + 'tienen que llevar los números más bajos (3 en vez de 5).',
    '1,3-dimetilbenceno', 'correct'],
  ['ciclohexa-2,4-dieno', 'RING_NUMBERING', 'N1', 'ringNumbering',
    'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los enlaces dobles y '
    + 'triples tienen que llevar los números más bajos (1 en vez de 2).',
    '1,3-ciclohexadieno', 'OLD_STYLE'],
  ['1-metil-2-etilbenceno', 'RING_NUMBERING', 'N4', 'ringNumbering',
    'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: con los mismos números, '
    + 'el sustituyente que va primero por orden alfabético tiene que llevar el más bajo (1 en vez de 2).',
    '2-metil-1-etilbenceno', 'ALPHABETICAL_ORDER'],
  ['2-metilciclohexano', 'RING_NUMBERING', 'N3', 'ringNumbering',
    'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los sustituyentes '
    + 'tienen que llevar los números más bajos (1 en vez de 2). En «metilciclohexano» ese número ni siquiera se escribe.',
    '1-metilciclohexano', 'NEEDLESS_LOCANTS'],
  ['2-metil-1-etilbenceno', 'ALPHABETICAL_ORDER', null, 'order',
    'Los sustituyentes se escriben por orden alfabético: «etil» va antes que «metil» (e antes que m).',
    '1-etil-2-metilbenceno', 'correct'],
  ['1-metil-3-metilciclohexano', 'UNGROUPED', null, 'substituents',
    'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «1,3-dimetil», no «1-metil-3-metil».',
    '1-etil-3-metilciclohexano', 'correct'],
  ['1,4-bismetilbenceno', 'MULTIPLIER_KIND', null, 'substituents',
    '«bis», «tris»… solo van delante de ramas que tienen sus propias ramas; aquí va «di», «tri»…: «1,4-dimetil», no «1,4-bismetil».',
    '1,4-dimetilbenceno', 'correct'],
  // Phase I-51b2: `di` before an alkoxy prefix the engine multiplies with `bis` for its form.
  ['1,4-di(pentiloxi)benceno', 'ALKOXY_MULTIPLIER', null, 'substituents',
    'Un prefijo «-oxi» que no se acorta, como «pentiloxi», es un prefijo compuesto (un grupo más «oxi») y va entre paréntesis; '
    + 'delante de un prefijo compuesto se usa «bis», «tris»…: «1,4-bis(pentiloxi)», no «1,4-di(pentiloxi)».',
    '1,4-bis(pentiloxi)benceno', 'correct'],
  ['3,1-dimetilciclohexano', 'LOCANT_ORDER', null, 'assemble',
    'Los números de un mismo grupo se escriben de menor a mayor: «1,3-dimetil», no «3,1-dimetil».',
    '1,3-dimetilciclohexano', 'correct'],
  ['2,1-xileno', 'LOCANT_ORDER', null, 'assemble',
    'Los números de un mismo grupo se escriben de menor a mayor: «1,2-xileno», no «2,1-xileno».',
    '1,2-xileno', 'alternative'],
  ['1-metilciclohexano', 'NEEDLESS_LOCANTS', null, 'ringNumbering',
    'En «metilciclohexano» no se escriben números: solo hay una manera de colocar el sustituyente.',
    '1,1-dimetilciclohexano', 'correct'],
  ['1-metilbenceno', 'NEEDLESS_LOCANTS', null, 'assemble',
    'En «metilbenceno» no se escriben números: solo hay una manera de colocar el sustituyente.',
    'metilbenceno', 'correct'],
  ['ciclohex-1-eno', 'NEEDLESS_LOCANTS', null, 'ringNumbering',
    'En «ciclohexeno» no se escriben números: solo hay una manera de colocar el enlace doble.',
    '3-metilciclohex-1-eno', 'correct'],
  ['1,2,3,4,5,6-hexametilbenceno', 'NEEDLESS_LOCANTS', null, 'ringNumbering',
    'En «hexametilbenceno» no se escriben números: solo hay una manera de colocar los sustituyentes.',
    '1,2,3,4,5-pentametilbenceno', 'correct'],
  ['(propan-1-il)ciclohexano', 'NEEDLESS_LOCANTS', null, 'ringNumbering',
    'Sobran números dentro de la rama: se escribe «propil», no «(propan-1-il)».',
    '(propan-2-il)ciclohexano', 'alternative'],
  ['ciclodec-5-in-1,3-dieno', 'SEGMENT_ORDER', null, 'assemble',
    'Cuando hay enlaces dobles y triples, «en» se escribe antes que «ino»: «ciclodeca-1,3-dien-5-ino», no «ciclodec-5-in-1,3-dieno».',
    'ciclodeca-1,3-dien-5-ino', 'correct'],
  ['1,3-ciclohexadieno', 'OLD_STYLE', null, 'assemble',
    'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de «eno» o «ino»: '
    + '«ciclohexa-1,3-dieno».',
    '2,4-ciclohexadieno', 'RING_NUMBERING'],
  ['p-di(propan-2-il)benceno', 'LETTER_LOCANTS', null, 'ringNumbering',
    'Las letras «o», «m» y «p» (orto, meta y para) son una forma antigua de decir dónde van dos grupos del benceno, y con estas '
    + 'ramas no se usan: se escriben los números, «1,4-di(propan-2-il)benceno».',
    'p-diisopropilbenceno', 'alternative'],
];

test('one case per ring rule and per R-3 rule on a ring: the code, its trace rule, the step opened and the message', () => {
  const seen = new Set();
  for (const [name, code, traceRule, opened, message] of CASES) {
    const verdict = read(name);
    assertRingDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule], [code, traceRule], name);
    const explanation = diagnosisExplanation(verdict, explain);
    assert.equal(explanation.steps[explanation.index].id, opened, `${name}: the step «Ver el paso» opens`);
    assert.equal(d.message, message, name);
    seen.add(code);
  } // End of the loop over the cases
  for (const code of RING_CODES) {
    assert.ok(seen.has(code), `${code} has a case`);
  }
  // Every R-3 form rule (5–11) has a ring case too; MISSING_LOCANTS cannot be the main mistake on a ring (tested below), nor
  // can the rules of an ether's class name (phase I-51b2: a class name has no parent ring). The branch-name rules of phase
  // I-51c3b2 are no R-3 rules: their cases, a ring parent's acyl branch among them, are in reverse-diagnose-carbonyls.test.js
  // (a ring branch beside a ring parent is a second ring, refused); nor is an ester's own code of phase I-52a3b (an ester prefix's
  // kind, an O-bound group's chain or words: reverse-diagnose-esters.test.js), nor an amide prefix's of phase I-52d4
  // (reverse-diagnose-amides.test.js).
  const branchNames = ['ACYL_NAME', 'ACYL_CHAIN', 'BRANCH_RING_NUMBERING', 'ESTER_PREFIX_NAME', 'ESTER_ALKYL_CHAIN',
    'ESTER_ALKYL_NAME', 'AMIDE_PREFIX_NAME'];
  const formCodes = DIAGNOSIS_CODES.filter((c) => DIAGNOSES[c].rule >= 5 && c !== 'MISSING_LOCANTS' && !c.startsWith('CLASS_')
    && !branchNames.includes(c));
  assert.deepEqual(formCodes.filter((c) => !seen.has(c)), []);
}); // End of test 'one case per ring rule and per R-3 rule on a ring…'

test('the near misses: a name close to each case, on which its rule does not fire', () => {
  for (const [name, code, , , , near, expected] of CASES) {
    const verdict = read(near);
    const got = verdict.kind === 'otherName' ? verdict.diagnosis && verdict.diagnosis.code : verdict.kind;
    assert.equal(got, expected, `${near} (near ${name})`);
    assert.notEqual(got, code, near);
    if (verdict.kind === 'otherName') {
      assertRingDiagnosis(verdict, near);
    } else {
      assert.ok(!('diagnosis' in verdict), `${near}: only otherName has a diagnosis`);
    }
  } // End of the loop over the near misses
}); // End of test 'the near misses…'

test('the atoms and tiles of the ring rules: the ring beside the student\'s chain, the template, the letter', () => {
  // RING_IS_PARENT: the student's chain (propane) is apart from the ring, which is the focus; the tiles are the ring branch's.
  const parent = read('1-(4-metilfenil)propano');
  const d = parent.diagnosis;
  assert.deepEqual(d.student, parent.studentParent);
  assert.deepEqual(d.focus, parent.naming.parent, 'the whole ring');
  assert.deepEqual(d.tiles, [0, 7], '«1-(4-metilfenil)»');
  assert.equal(d.step, 'benzene');
  assert.equal(read('1-ciclohexilpropano').diagnosis.step, 'ring', 'a `ciclo` ring opens «Busca el anillo»');
  // SUBSTITUTED_TEMPLATE: the student's prefix on the molecule; the template's tile.
  const template = read('4-metiltolueno');
  const occurrence = template.prefixAtoms[0];
  assert.deepEqual(template.diagnosis.focus, { atoms: occurrence.atoms, bonds: [occurrence.bond, ...occurrence.bonds] });
  assert.deepEqual(template.diagnosis.tiles, [3, 4], 'the «tolueno» tile');
  // RING_NUMBERING: the same ring, numbered from another carbon; no tiles.
  const numbering = read('1,5-dimetilciclohexano').diagnosis;
  assert.notDeepEqual(numbering.student.atoms, numbering.parent.atoms);
  assert.deepEqual([...numbering.student.atoms].sort((p, q) => p - q), [...numbering.parent.atoms].sort((p, q) => p - q));
  assert.equal(numbering.tiles, null);
  // LETTER_LOCANTS: the letter tile; BENZENE_RING: the parent's tiles.
  assert.deepEqual(read('p-di(propan-2-il)benceno').diagnosis.tiles, [0, 1]);
  const benzene = read('1,4-dimetilciclohexa-1,3,5-trieno');
  assert.deepEqual(benzene.diagnosis.tiles, interpret(parse(idsOf('1,4-dimetilciclohexa-1,3,5-trieno')).tree).parent.tiles);
}); // End of test 'the atoms and tiles of the ring rules…'

test('the drafts of the ring rules render from their examples; their steps have fallbacks', () => {
  for (const code of RING_CODES) {
    const text = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    assert.match(text, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(text, /undefined|null|NaN/, code);
    assert.ok(STEP_FALLBACKS[DIAGNOSES[code].step], `${code}: a known step`);
  }
  assert.deepEqual(RING_CODES.map((code) => DIAGNOSES[code].rule), [1, 2, 2, 4, 11]);
  assert.deepEqual([...STEP_FALLBACKS.ring], ['benzene', 'count']);
  assert.deepEqual([...STEP_FALLBACKS.benzene], ['ring', 'count']);
  assert.deepEqual([...STEP_FALLBACKS.ringNumbering], ['numbering', 'assemble']);
}); // End of test 'the drafts of the ring rules…'

test('cases no rule covers or that cannot occur on a ring, as they behave', () => {
  // As on a chain (I-49a): a branch of the ring whose own numbering is wrong, or written in a style not offered: null.
  // Beside an o/m/p letter too: written with numbers, the name is still not the engine's, so LETTER_LOCANTS does not fire.
  for (const [name, engine] of [['(butan-3-il)ciclohexano', '(butan-2-il)ciclohexano'], ['(1,1-dimetiletil)benceno', 'tert-butilbenceno'],
    ['p-di(butan-3-il)benceno', '1,4-di(butan-2-il)benceno']]) {
    const verdict = read(name);
    assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis], ['otherName', engine, null], name);
  }
  // A ring branch hangs from a chain parent (two rings bonded atom to atom are refused), so its own numbering mistake is
  // always preceded by RING_IS_PARENT.
  for (const name of ['1-(6-metilciclohexil)propano', '(5-metilfenil)metano']) {
    assert.equal(read(name).diagnosis.code, 'RING_IS_PARENT', name);
  }
  assert.equal(read('ciclohexilciclohexano').kind, 'outOfScope');
  // MISSING_LOCANTS alone gives missingLocants (or ambiguous), never otherName — but the rule reads the ring's omission
  // rules: on the drawn reading of `pentametilbenceno` it names the missing locants, on `hexametilbenceno` (no locants
  // by rule) nothing.
  for (const [name, kind, code] of [['pentametilbenceno', 'missingLocants', 'MISSING_LOCANTS'], ['hexametilbenceno', 'correct', null]]) {
    const ids = idsOf(name);
    const verdict = readName(ids);
    assert.equal(verdict.kind, kind, name);
    const { tree } = parse(ids);
    const result = diagnose({ tree, spec: interpret(tree) }, verdict);
    assert.equal(result && result.code, code, name);
  }
}); // End of test 'cases no rule covers or that cannot occur on a ring, as they behave'

test('a ring is always the parent of a hydrocarbon: the reverse of RING_IS_PARENT cannot occur', () => {
  // The engine names every generated monocycle and branch-only benzene on its ring (design.md §13.5), so a student's ring
  // parent is never passed over for a chain.
  const molecules = [...generateMonocycles({ count: 150, seed: 4705, minSize: 3, maxSize: 12 }),
    ...generateBenzenes({ count: 150, seed: 4706, minSize: 6, maxSize: 12 })]
    .filter((mol) => [...mol.atoms.values()].every((atom) => atom.element === 'C'));
  assert.ok(molecules.length >= 150, `${molecules.length} molecules`);
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    assert.ok(naming.ok, naming.error && naming.error.message);
    assert.equal(naming.structure.parentKind, 'ring', naming.name);
  }
}); // End of test 'a ring is always the parent of a hydrocarbon…'

test('a left-out ring locant: the kindest reading wins, and a reading with no mistake a rule can name gives null', () => {
  const ids = idsOf('(butan-3-il)ciclohexano');
  const { tree } = parse(ids);
  const spec = interpret(tree);
  assert.equal(spec.leftOut.length, 1, 'the ring position of the branch');
  const search = searchStructures(spec, { namer: nameMolecule });
  assert.equal(search.structures.length, 1);
  const [structure] = search.structures;
  // Read with the branch on ring carbon 2, the ring numbering would be blamed; on carbon 1 no rule applies.
  const readings = structure.placements.map((p) => ({ placement: p, reading: placementReading(spec, structure, p) }));
  const verdict = readName(ids);
  const codes = readings.map(({ reading }) => {
    const draft = diagnose({ tree, spec }, { ...verdict, ...reading });
    return draft ? draft.code : null;
  });
  assert.ok(codes.includes(null) && codes.includes('RING_NUMBERING'), codes.join());
  assert.equal(verdict.diagnosis, null);
  // Every placement of `metilciclohexa-1,3,5-trieno` gives the same diagnosis.
  assert.equal(read('metilciclohexa-1,3,5-trieno').diagnosis.code, 'BENZENE_RING');
}); // End of test 'a left-out ring locant…'

/**
 * The order in which the explanation a diagnosis opens cites the student's
 * prefixes: for each prefix group of the explanation's naming, in its
 * citation order, the index of the student's parent-level prefix that is
 * that branch (a name with every locant written: the verdict's own
 * reading).
 *
 * @param {object} verdict - A diagnosed `otherName` verdict.
 * @returns {number[]} The student's prefix indices, in the explanation's citation order.
 */
function explanationOrder(verdict) {
  const { naming } = diagnosisExplanation(verdict, explain);
  const prefixOf = new Map(verdict.prefixAtoms.map((o) => [o.attachment, o.prefix]));
  return naming.structure.prefixes.map((group) => prefixOf.get(group.locants[0].attachAtom));
}

test('review I-50d: a ring numbering is blamed by alphabetical order only in the order of the student\'s own words', () => {
  // `etil` comes before `metilpropil`: the ring is numbered right for the student's own words. The engine offers only
  // `butan-2-il` for that branch, cited first, and numbers the other way: a style not offered, which no rule covers.
  // Two styles in one name likewise: `isopropil` before `metilpropil`, but `butan-2-il` before `isopropil`.
  for (const [name, engine] of [['1-etil-2-(1-metilpropil)benceno', '1-(butan-2-il)-2-etilbenceno'],
    ['1-isopropil-2-(1-metilpropil)benceno', '1-(butan-2-il)-2-isopropilbenceno']]) {
    const verdict = read(name);
    assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis], ['otherName', engine, null], name);
  }
  // The rules that read the student's own words still run: here the prefixes are out of their own alphabetical order.
  const order = read('2-(1-metilpropil)-1-etilbenceno');
  assertRingDiagnosis(order, 'out of order in the student\'s words');
  assert.equal(order.diagnosis.code, 'ALPHABETICAL_ORDER');
  assert.equal(order.diagnosis.message,
    'Los sustituyentes se escriben por orden alfabético: «etil» va antes que «1-metilpropil» (e antes que m).');
  // A numbering blamed at N4 follows the order of the student's words, and so does the explanation it opens: `metil`
  // before `propan-2-il` (the pin style, whose naming numbers the other way from the default style's), `etil` before
  // `metil`; its N4 comparison is won by the numbering that gives the first of them the 1.
  for (const [name, explained, cited] of [['2-metil-1-(propan-2-il)benceno', '1-metil-2-(propan-2-il)benceno', [0, 1]],
    ['1-metil-2-etilbenceno', '1-etil-2-metilbenceno', [1, 0]]]) {
    const verdict = read(name);
    assertRingDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule], ['RING_NUMBERING', 'N4'], name);
    assert.equal(d.message, 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: '
      + 'con los mismos números, el sustituyente que va primero por orden alfabético tiene que llevar el más bajo (1 en vez de 2).', name);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.naming.name, explained, name);
    assert.deepEqual(explanationOrder(verdict), cited, `${name}: the explanation cites the student's prefixes in their words' order`);
    const row = opened.steps[opened.index].compare.rows.find((r) => r.rule === 'N4');
    assert.deepEqual(row.winners.map((w) => row.lists[w]), [[1, 2]], name);
  } // End of the loop over the numbering cases
}); // End of test 'review I-50d: a ring numbering is blamed by alphabetical order only…'

test('review I-50d: needless ring locants beside a branch that keeps its own numbers', () => {
  // Only the number that places the branch on the ring is left out; the numbers inside the branch stay.
  for (const [name, message, step] of [
    ['1-(butan-2-il)benceno', 'En «(butan-2-il)benceno» no se escribe el número que dice en qué carbono del anillo va el '
      + 'sustituyente: solo hay una manera de colocarlo. Los números de dentro de la rama sí se escriben.', 'assemble'],
    ['1-(butan-2-il)ciclohexano', 'En «(butan-2-il)ciclohexano» no se escribe el número que dice en qué carbono del anillo va el '
      + 'sustituyente: solo hay una manera de colocarlo. Los números de dentro de la rama sí se escriben.', 'ringNumbering'],
    ['1,2,3,4,5,6-hexa(propan-2-il)benceno', 'En «hexa(propan-2-il)benceno» no se escriben los números que dicen en qué carbonos '
      + 'del anillo van los sustituyentes: solo hay una manera de colocarlos. Los números de dentro de las ramas sí se escriben.',
    'ringNumbering'],
  ]) {
    const verdict = read(name);
    assertRingDiagnosis(verdict, name);
    assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.message], ['NEEDLESS_LOCANTS', message], name);
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, step, name);
  } // End of the loop over the cases
  // A name without any number keeps the short message (CASES: `1-metilbenceno`, `1,2,3,4,5,6-hexametilbenceno`).
  assert.equal(read('1-metilbenceno').diagnosis.message,
    'En «metilbenceno» no se escriben números: solo hay una manera de colocar el sustituyente.');
}); // End of test 'review I-50d: needless ring locants beside a branch that keeps its own numbers'

// ---------------------------------------------------------------------------
// Mutations of ring names (design.md §15.7).
// ---------------------------------------------------------------------------

/**
 * The tile id of a locant.
 *
 * @param {number} n - The locant.
 * @returns {string} Its tile id.
 */
function num(n) {
  return `num-${n}`;
}

/**
 * Rewrites the locants of a list in place and puts them back in ascending
 * order over the same positions.
 *
 * @param {string[]} out - Tile ids (changed in place).
 * @param {object[]} tiles - The parsed tiles.
 * @param {number[]} positions - The list's tile indices.
 * @param {(value: number) => number} map - The new value of each locant.
 * @returns {void}
 */
function rewriteLocants(out, tiles, positions, map) {
  const values = positions.map((p) => map(tiles[p].value)).sort((a, b) => a - b);
  positions.forEach((p, k) => {
    out[p] = num(values[k]);
  });
}

/**
 * The renumberings of a ring of n carbons: the reflection that keeps
 * carbon 1 and every rotation, each as a map of carbon locants and one of
 * bond locants (bond k joins carbons k and k + 1, bond n carbons n and 1).
 *
 * @param {number} n - Ring size.
 * @returns {{family: string, carbon: (v: number) => number, bond: (k: number) => number}[]} The renumberings.
 */
function renumberings(n) {
  const out = [{ family: 'reflected', carbon: (v) => (v === 1 ? 1 : n + 2 - v), bond: (k) => (k === n ? 1 : n - k) }];
  for (let s = 1; s < n; s += 1) {
    out.push({ family: 'rotated', carbon: (v) => ((v - 1 + s) % n) + 1, bond: (k) => ((k - 1 + s) % n) + 1 });
  }
  return out;
}

/**
 * The expected diagnosis codes of an `otherName` by mutation family.
 */
const FAMILY_CODES = Object.freeze({
  reflected: ['RING_NUMBERING'],
  rotated: ['RING_NUMBERING'],
  swapped: ['RING_NUMBERING'],
  unsorted: ['ALPHABETICAL_ORDER'],
  ungrouped: ['UNGROUPED'],
  diBis: ['MULTIPLIER_KIND'],
  removed: [],
  added: ['NEEDLESS_LOCANTS', 'RING_NUMBERING'],
  oldStyle: ['OLD_STYLE'],
  segments: ['SEGMENT_ORDER'],
  chainParent: ['RING_IS_PARENT'],
});

/**
 * The mutations of one ring name (a `ciclo`, `benceno` or template parent):
 * renumbered (reflected, rotated), locants swapped between two prefixes,
 * prefixes in reverse order, identical prefixes written one by one, di ↔
 * bis, a list's locants removed or added where the name has none (1… and
 * 2…), old-style bond locants, `eno` and `ino` the other way round, and the
 * ring and its one plain alkyl branch swapped (the chain as the parent).
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{family: string, ids: string[]}[]} The mutations.
 */
function ringMutations(ids) {
  const { tree } = parse(ids);
  const { tiles, items } = tree;
  const ring = tree.parent.chain;
  const n = ring.type === 'chain' ? tiles[ring.root].value : 6;
  const segments = ring.type === 'chain' ? ring.segments : [];
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
  for (const { family, carbon, bond } of renumberings(n)) {
    const mutated = [...ids];
    items.forEach((item) => rewriteLocants(mutated, tiles, item.locants, carbon));
    segments.forEach((segment) => rewriteLocants(mutated, tiles, segment.locants, bond));
    rewriteLocants(mutated, tiles, tree.parent.legacy, carbon);
    push(family, mutated);
  }
  const single = items.filter((item) => item.locants.length === 1);
  single.forEach((a, i) => single.slice(i + 1).forEach((b) => {
    const swapped = [...ids];
    [swapped[a.locants[0]], swapped[b.locants[0]]] = [ids[b.locants[0]], ids[a.locants[0]]];
    push('swapped', swapped);
  }));
  if (items.length >= 2) {
    const slices = items.map((item) => ids.slice(item.range[0], item.range[1]));
    push('unsorted', [...slices.reverse().flat(), ...ids.slice(tree.parent.range[0])]);
  }
  items.forEach((item) => prefixMutations(ids, tree, item, n).forEach(({ family, ids: mutated }) => push(family, mutated)));
  segments.forEach((segment) => segmentMutations(ids, tree, segment).forEach(({ family, ids: mutated }) => push(family, mutated)));
  if (segments.length === 2) {
    const [s0, s1] = segments;
    push('segments', [...ids.slice(0, s0.range[0]), ...ids.slice(s1.range[0], s1.range[1]), ...ids.slice(s0.range[0], s0.range[1]),
      ...ids.slice(s1.range[1])]);
  }
  const chain = chainParent(ids, tree);
  if (chain) {
    push('chainParent', chain);
  }
  return out;
} // End of function ringMutations()

/**
 * The mutations of one parent-level prefix of a ring name: ungrouped, di ↔
 * bis, its locants removed, or added (1… and 2…) where it has none.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} tree - Its parse() tree.
 * @param {object} item - The prefix node.
 * @param {number} n - Ring size.
 * @returns {{family: string, ids: string[]}[]} The mutations.
 */
function prefixMutations(ids, tree, item, n) {
  const { tiles } = tree;
  const out = [];
  if (item.multiplier !== null && item.locants.length >= 2) {
    const sub = ids.slice(item.multiplier + 1, item.range[1]);
    const split = item.locants.flatMap((p) => [ids[p], ...sub]);
    out.push({ family: 'ungrouped', ids: [...ids.slice(0, item.range[0]), ...split, ...ids.slice(item.range[1])] });
  }
  if (item.multiplier !== null) {
    const tile = tiles[item.multiplier];
    const swapped = [...ids];
    swapped[item.multiplier] = tile.kind === 'mult' ? `cmult-${tile.value}` : `mult-${tile.value}`;
    out.push({ family: 'diBis', ids: swapped });
  }
  if (item.locants.length > 0) {
    out.push({ family: 'removed', ids: ids.filter((_, k) => !item.locants.includes(k)) });
  } else if (item.letter === null) {
    const count = item.multiplier === null ? 1 : tiles[item.multiplier].value;
    for (const start of [1, 2].filter((s) => s + count - 1 <= n)) {
      const located = Array.from({ length: count }, (_, k) => num(start + k));
      out.push({ family: 'added', ids: [...ids.slice(0, item.range[0]), ...located, ...ids.slice(item.range[0])] });
    }
  }
  return out;
} // End of function prefixMutations()

/**
 * The mutations of one multiple-bond segment of a `ciclo` parent: its
 * locants removed or moved before the root (old style), or added where it
 * has none (1, 3… and 2, 4…).
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} tree - Its parse() tree.
 * @param {object} segment - The segment node.
 * @returns {{family: string, ids: string[]}[]} The mutations.
 */
function segmentMutations(ids, tree, segment) {
  const out = [];
  const root = tree.parent.range[0];
  if (segment.locants.length > 0) {
    out.push({ family: 'removed', ids: ids.filter((_, k) => !segment.locants.includes(k)) });
    const rest = ids.slice(root).filter((_, k) => !segment.locants.includes(root + k));
    out.push({ family: 'oldStyle', ids: [...ids.slice(0, root), ...segment.locants.map((p) => ids[p]), ...rest] });
    return out;
  }
  const count = segment.multiplier === null ? 1 : tree.tiles[segment.multiplier].value;
  for (const start of [1, 2]) {
    const located = Array.from({ length: count }, (_, k) => num(start + 2 * k));
    out.push({ family: 'added', ids: [...ids.slice(0, segment.range[0]), ...located, ...ids.slice(segment.range[0])] });
  }
  return out;
} // End of function segmentMutations()

/**
 * The ring and its branch swapped: a saturated `ciclo` ring or `benceno`
 * with one plain alkyl prefix (`propilciclohexano`, `etilbenceno`) written
 * as that chain with the ring as its branch at carbon 1
 * (`1-ciclohexilpropano`, `1-feniletano`). Null for any other name.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} tree - Its parse() tree.
 * @returns {string[]|null} The tile ids, or null.
 */
function chainParent(ids, tree) {
  const ring = tree.parent.chain;
  const saturatedRing = ring.type === 'chain' && ring.segments.length === 0 && ring.ano !== null;
  if (tree.items.length !== 1 || !(saturatedRing || ring.type === 'benzene')) {
    return null;
  }
  const [item] = tree.items;
  const sub = item.substituent;
  if (item.multiplier !== null || sub.type !== 'chain' || sub.ring !== null || sub.segments.length > 0 || sub.fvLocants.length > 0
    || tree.tiles[sub.fv].value !== 1) {
    return null;
  }
  const branch = ring.type === 'benzene' ? ['retained-phenyl'] : [ids[ring.ring], ids[ring.root], ids[sub.fv]];
  return [num(1), ...branch, ids[sub.root], 'ending-saturated'];
} // End of function chainParent()

/**
 * Reads every mutation of some ring names and tallies the verdicts by
 * family: the `otherName` ones with their diagnosis code (`null` for none),
 * checking each diagnosed one against the family's expected codes.
 *
 * @param {string[]} names - Ring names (engine names or alternatives).
 * @param {(verdict: object, label: string) => void} check - Called with every diagnosed `otherName` verdict.
 * @returns {{tally: Object<string, number>, otherName: Object<string, number>, nulls: string[]}} Verdicts by
 *   `family:kind[:code]`, `otherName` counts by family, and the texts of `otherName` verdicts without a diagnosis.
 */
function sweep(names, check) {
  const tally = {};
  const otherName = Object.fromEntries(Object.keys(FAMILY_CODES).map((family) => [family, 0]));
  const nulls = [];
  for (const name of names) {
    for (const mutation of ringMutations(idsOf(name))) {
      const verdict = readName(mutation.ids);
      const code = verdict.kind === 'otherName' ? `:${verdict.diagnosis ? verdict.diagnosis.code : 'null'}` : '';
      const key = `${mutation.family}:${verdict.kind}${code}`;
      tally[key] = (tally[key] || 0) + 1;
      if (verdict.kind !== 'otherName') {
        continue;
      }
      otherName[mutation.family] += 1;
      const label = `${name} → ${mutation.family} ${verdict.text}`;
      if (!verdict.diagnosis) {
        nulls.push(label);
        continue;
      }
      assert.ok(FAMILY_CODES[mutation.family].includes(verdict.diagnosis.code), `${label}: ${verdict.diagnosis.code}`);
      check(verdict, label);
    } // End of the loop over the mutations of one name
  } // End of the loop over the names
  return { tally, otherName, nulls };
} // End of function sweep()

/**
 * How many mutations of the ring fixture names give `otherName`, by
 * family; every one is diagnosed with one of its family's codes (no null:
 * the cases no rule covers are tested apart). Removing locants never gives
 * `otherName` (only `missingLocants` or `ambiguous`).
 */
const FIXTURE_OTHER_NAME = Object.freeze({
  reflected: 26, rotated: 223, swapped: 8, unsorted: 11, ungrouped: 18, diBis: 25, removed: 0, added: 69, oldStyle: 18, segments: 1,
  chainParent: 9,
});

test('mutations of every ring fixture name: the expected diagnosis for every otherName, and a coverage count', async () => {
  const rows = (await readFixtures()).filter((row) => isMonocyclicHydrocarbon(row.smiles)
    && (row.names.every(isCycloName) || isBenzeneName(row.names[0])));
  const names = rows.flatMap((row) => row.names);
  assert.equal(names.length, 108, 'the `ciclo` and benzene rows, alternatives included');
  const { tally, otherName, nulls } = sweep(names, assertRingDiagnosis);
  assert.deepEqual(nulls, []);
  assert.deepEqual(otherName, { ...FIXTURE_OTHER_NAME }, JSON.stringify(tally));
  assert.equal(tally['removed:missingLocants'] + tally['removed:ambiguous'], 64, JSON.stringify(tally));
}); // End of test 'mutations of every ring fixture name…'

test('mutations of the generated rings (closed-loop generators): every otherName is diagnosed, every step resolves', () => {
  const molecules = [...generateMonocycles({ count: 400, seed: 4702, minSize: 3, maxSize: 14 }),
    ...generateBenzenes({ count: 400, seed: 4703, minSize: 6, maxSize: 14 })]
    .filter((mol) => [...mol.atoms.values()].every((atom) => atom.element === 'C'));
  const names = [];
  for (const mol of molecules) {
    const naming = nameMolecule(mol);
    names.push(...[naming.name, ...(naming.alternatives || []).map((alt) => alt.name)]
      .filter((name) => (isCycloName(name) || isBenzeneName(name)) && tokenize(name)));
  }
  assert.ok(names.length >= 500, `${names.length} names`);
  const codes = new Set();
  /**
   * Checks that a diagnosis's step resolves in its explanation (the full invariants are the fixture sweep's).
   *
   * @param {object} verdict - A diagnosed `otherName` verdict.
   * @param {string} label - Assertion label.
   * @returns {void}
   */
  const check = (verdict, label) => {
    codes.add(verdict.diagnosis.code);
    const opened = diagnosisExplanation(verdict, explain);
    const resolved = [verdict.diagnosis.step, ...STEP_FALLBACKS[verdict.diagnosis.step]];
    assert.ok(opened.index >= 0 && resolved.includes(opened.steps[opened.index].id), label);
  };
  const { otherName, nulls } = sweep(names, check);
  assert.deepEqual(nulls, []);
  const total = Object.values(otherName).reduce((sum, count) => sum + count, 0);
  assert.ok(total >= 3000, `${total} otherName verdicts`);
  assert.equal(otherName.removed, 0);
  assert.deepEqual([...codes].sort(), ['ALPHABETICAL_ORDER', 'MULTIPLIER_KIND', 'NEEDLESS_LOCANTS', 'OLD_STYLE', 'RING_IS_PARENT',
    'RING_NUMBERING', 'SEGMENT_ORDER', 'UNGROUPED']);
}); // End of test 'mutations of the generated rings…'

test('time budget: readName() of a ring name with its diagnosis well within budget', () => {
  for (const name of ['1-(4-metilfenil)propano', '1,5-dimetilciclohexano', 'p-metiltolueno', '1-(4-metilfenil)decano']) {
    const ids = idsOf(name);
    readName(ids);
    const start = performance.now();
    const verdict = readName(ids);
    const ms = performance.now() - start;
    assert.ok(verdict.diagnosis, name);
    assert.ok(ms < 250, `${name}: ${ms.toFixed(1)} ms`);
  }
}); // End of test 'time budget…'
