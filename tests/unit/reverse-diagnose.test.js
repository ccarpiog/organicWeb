/**
 * @file Unit tests for the diagnosis of «¿Cómo se dibuja?»
 * (src/reverse/diagnose.js, design.md §15.3 `otherName`, §15.7, §15.8 R-3;
 * phase I-49a): one case per diagnosis code with its message, step and
 * atoms; the invariants of every diagnosis (JSON-safe, ids of the verdict's
 * molecule, a step that exists in explain() for the naming, the trace rule
 * it follows); the drafts table; mutations of every open-chain hydrocarbon
 * fixture name (reversed numbering, swapped locants, unsorted prefixes,
 * ungrouped identical prefixes, di ↔ bis, `eno` / `ino` swapped, a branch
 * moved to an end, old style, needless locants, every other chain chosen)
 * with the expected code and a coverage count; agreement of the chain
 * diagnoses with the engine's own counts and names; the charitable reading
 * of left-out locants; the cases no rule covers; the review cases (I-49a,
 * and I-50d: alphabetical order blames a chain or numbering only in the
 * student's own words); time budgets; bundling.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, cp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import {
  diagnose, diagnosisStepIndex, diagnosisNaming, diagnosisExplanation, DIAGNOSES, DIAGNOSIS_CODES, DIAGNOSIS_TEXTS,
  DIAGNOSIS_PHRASES, STEP_FALLBACKS, MAX_READINGS,
} from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { adjacency } from '../../src/model/graph.js';
import { nameMolecule } from '../../src/naming/index.js';
import { chainCounts, chainKey } from '../../src/naming/parent.js';
import { chainBonds, compareLocantLists } from '../../src/naming/numbering.js';
import { createNamingContext, collectSubstituents, groupPrefixes, PREFIX_STYLES } from '../../src/naming/substituent.js';
import { buildChainStructure, buildNameStructure } from '../../src/naming/structure.js';
import { renderName } from '../../src/naming/render.js';
import { bundleModules } from '../../scripts/build.mjs';
import { seq, readFixtures, isOpenChainHydrocarbon } from './reverse-words.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The codes of the chain rules 1–3 (the trace rule at which the student's chain was dropped). */
const CHAIN_CODES = Object.freeze(['BRANCH_AT_END', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS',
  'CHAIN_LOCANTS', 'CHAIN_ALPHABETICAL']);

/** The codes only a ring gives (phase I-50d; their cases are in reverse-diagnose-rings.test.js). */
const RING_ONLY_CODES = Object.freeze(['RING_IS_PARENT', 'BENZENE_RING', 'SUBSTITUTED_TEMPLATE', 'RING_NUMBERING', 'LETTER_LOCANTS']);

/** The codes only an alcohol gives (phase I-51a3b; their cases are in reverse-diagnose-alcohols.test.js). */
const ALCOHOL_ONLY_CODES = Object.freeze(['HYDROXY_PREFIX', 'HYDROXY_PARENT', 'MORE_HYDROXY_GROUPS', 'PHENOL']);

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
 * The name the engine's own renderer writes for a molecule numbered along a
 * chosen chain and direction (what a student who picked that chain would
 * write): the engine's prefixes of that chain, grouped and sorted, on that
 * numbering. Test-only: the engine itself never names a chain it did not
 * choose.
 *
 * @param {object} mol - The molecule.
 * @param {number[]} atoms - The chain's atoms in locant order.
 * @returns {string} The name.
 */
function forcedName(mol, atoms) {
  const adj = adjacency(mol);
  const ctx = createNamingContext(mol, 'isopropil', undefined, adj);
  const { bonds, orders } = chainBonds(adj, atoms);
  const prefixes = groupPrefixes(collectSubstituents(mol, atoms, ctx), atoms);
  return renderName(buildNameStructure({ parent: buildChainStructure(atoms, bonds, orders), prefixes, suffix: null })).name;
}

/**
 * The naming a diagnosis compares with: the verdict's for the default
 * style, else the engine's naming in the diagnosis's style.
 *
 * @param {object} verdict - A diagnosed `otherName` verdict.
 * @returns {object} The naming.
 */
function namingOf(verdict) {
  const { style } = verdict.diagnosis;
  return style === PREFIX_STYLES[0] ? verdict.naming : nameMolecule(verdict.molecule, { prefixStyle: style });
}

/**
 * Asserts the invariants of a diagnosed `otherName` verdict: a known code
 * with its rule and step; a Spanish message with every blank filled; a
 * JSON-safe object; atom and bond ids of the verdict's molecule (the
 * student's chain a path of bonds, the parent the naming's); tiles within
 * the name; a step that exists among explain()'s steps for the naming in
 * the diagnosis's style and that diagnosisExplanation() opens (for
 * NUMBERING, a step that numbers the parent the app's way, never the
 * student's); and, for rules 1–4, the trace step it names dropping the
 * student's chain or direction.
 *
 * @param {object} verdict - An `otherName` verdict with a diagnosis.
 * @param {string} label - Assertion label.
 * @returns {void}
 */
function assertDiagnosis(verdict, label) {
  const d = verdict.diagnosis;
  assert.equal(verdict.kind, 'otherName', label);
  assert.ok(d, `${label}: no diagnosis`);
  assert.ok(DIAGNOSES[d.code], `${label}: ${d.code}`);
  assert.equal(d.rule, DIAGNOSES[d.code].rule, label);
  assert.equal(d.step, DIAGNOSES[d.code].step, label);
  assert.ok(d.message.length > 0 && !/undefined|null|NaN|\[object/.test(d.message), `${label}: ${d.message}`);
  assert.deepEqual(JSON.parse(JSON.stringify(d)), d, `${label}: JSON-safe`);
  assert.ok(PREFIX_STYLES.includes(d.style), label);
  const { molecule } = verdict;
  const naming = namingOf(verdict);
  for (const ids of [d.student, d.parent, d.focus]) {
    ids.atoms.forEach((id) => assert.ok(molecule.atoms.has(id), `${label}: atom ${id}`));
    ids.bonds.forEach((id) => assert.ok(molecule.bonds.has(id), `${label}: bond ${id}`));
  }
  d.student.bonds.forEach((id, i) => {
    const bond = molecule.bonds.get(id);
    assert.deepEqual([bond.a, bond.b].sort((p, q) => p - q), [d.student.atoms[i], d.student.atoms[i + 1]].sort((p, q) => p - q), label);
  });
  assert.deepEqual(d.parent, naming.parent, `${label}: the app's parent`);
  if (d.tiles) {
    assert.ok(d.tiles[0] >= 0 && d.tiles[0] < d.tiles[1], `${label}: tiles ${d.tiles}`);
  }
  // The stepper explains the naming the diagnosis compared with (its style), not always the verdict's own.
  const opened = diagnosisExplanation(verdict, explain);
  assert.deepEqual(opened.naming, naming, `${label}: the explanation's naming`);
  const { steps } = opened;
  const index = steps.findIndex((step) => step.id === d.step);
  assert.ok(index >= 0, `${label}: no step «${d.step}» in ${steps.map((s) => s.id)}`);
  assert.equal(opened.index, index, label);
  assert.equal(diagnosisStepIndex(steps, d), index, label);
  if (d.code === 'NUMBERING' && steps[index].locants) {
    // The step opened numbers the parent as the app does, never as the student did.
    steps[index].locants.forEach(([atom, n]) => assert.equal(atom, d.parent.atoms[n - 1], `${label}: locant ${n}`));
    assert.notDeepEqual(d.student.atoms, d.parent.atoms, label);
  }
  if (d.rule <= 4) {
    assert.ok(d.traceRule, label);
    const key = chainKey(d.student.atoms);
    if (d.code === 'BRANCH_AT_END') {
      const p1 = naming.trace.find((s) => s.rule === 'P1');
      assert.ok(!p1.candidatesBefore.some((c) => chainKey(c.atoms) === key), `${label}: a leaf-to-leaf chain`);
      return;
    }
    const step = naming.trace.find((s) => s.rule === d.traceRule);
    if (d.code === 'NUMBERING') {
      const directed = d.student.atoms.join('-');
      assert.ok(step.candidatesBefore.some((c) => c.direction && c.key === directed), label);
      assert.ok(!step.survivors.some((c) => c.direction && c.key === directed), `${label}: ${d.traceRule} keeps the direction`);
      assert.ok(step.survivors.some((c) => chainKey(c.atoms) === key), `${label}: ${d.traceRule} drops the chain`);
    } else {
      assert.ok(step.candidatesBefore.some((c) => chainKey(c.atoms) === key), label);
      assert.ok(!step.survivors.some((c) => chainKey(c.atoms) === key), `${label}: ${d.traceRule} keeps the chain`);
    }
  } else {
    assert.equal(d.traceRule, null, label);
  }
} // End of function assertDiagnosis()

/**
 * One case per diagnosis code (some codes several): the name, the code, the
 * trace rule, the step and the message.
 */
const CASES = [
  ['met il et ano', 'BRANCH_AT_END', 'P1', 'chain',
    'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 3 carbonos.'],
  ['1-metilpropano', 'BRANCH_AT_END', 'P1', 'chain',
    'La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene 4 carbonos.'],
  ['2-etilbutano', 'LONGER_CHAIN', 'P1', 'chain',
    'Hay una cadena más larga que la tuya: la tuya tiene 4 carbonos y la cadena principal tiene 5.'],
  ['3-etilidenpentano', 'MORE_MULTIPLE_BONDS', 'P2', 'tiebreak',
    'Hay otra cadena igual de larga con más enlaces dobles o triples (1; la tuya tiene 0). Entre cadenas igual de largas, gana la que tiene más.'],
  ['3-etenilhex-1-ino', 'MORE_DOUBLE_BONDS', 'P3', 'tiebreak',
    'Hay otra cadena igual de larga, con los mismos enlaces múltiples, pero con más enlaces dobles (1; la tuya tiene 0). '
    + 'En ese empate gana la que tiene más enlaces dobles.'],
  ['3-isopropilpentano', 'MORE_SUBSTITUENTS', 'P4', 'tiebreak',
    'Hay otra cadena igual de larga con más sustituyentes (2; la tuya tiene 1). Entre cadenas igual de largas, gana la que tiene más ramas.'],
  ['2-metil-4-(prop-2-en-1-il)non-2-eno', 'CHAIN_LOCANTS', 'N1', 'numbering',
    'Hay otra cadena igual de larga que, bien numerada, da números más bajos a los enlaces dobles y triples (1 en vez de 2): '
    + 'esa es la cadena principal.'],
  // design.md §4.4 N4: 5,6,3,7 beats 5,6,7,3.
  ['5-(butan-2-il)-6-(but-1-en-2-il)-7-metil-3-metilidennon-4-eno', 'CHAIN_LOCANTS', 'N4', 'numbering',
    'Hay otra cadena igual de larga que, bien numerada, da números más bajos a los sustituyentes, leídos en orden alfabético '
    + '(3 en vez de 7): esa es la cadena principal.'],
  // design.md §4.4 N5: `6-(2-metilbutil)-8-(2-metilheptil)hexadecano` beats this chain.
  ['6-metil-8-[2-(2-metilbutil)heptil]hexadecano', 'CHAIN_ALPHABETICAL', 'N5', 'numbering',
    'Hay otra cadena igual de larga, con los mismos números, cuyo nombre va antes por orden alfabético: esa es la cadena principal.'],
  ['4-metilpentano', 'NUMBERING', 'N3', 'numbering',
    'Hay que numerar la cadena desde el otro extremo: los sustituyentes tienen que llevar los números más bajos (2 en vez de 4).'],
  ['hex-4-eno', 'NUMBERING', 'N1', 'numbering',
    'Hay que numerar la cadena desde el otro extremo: los enlaces dobles y triples tienen que llevar los números más bajos (2 en vez de 4).'],
  ['but-3-en-1-ino', 'NUMBERING', 'N2', 'numbering',
    'Hay que numerar la cadena desde el otro extremo: con los mismos números para los enlaces múltiples, los enlaces dobles '
    + 'tienen que llevar los más bajos (1 en vez de 3).'],
  ['4-etil-3-metilhexano', 'NUMBERING', 'N4', 'numbering',
    'Hay que numerar la cadena desde el otro extremo: con los mismos números, el sustituyente que va primero por orden '
    + 'alfabético tiene que llevar el más bajo (3 en vez de 4).'],
  ['prop-2-eno', 'NUMBERING', 'N1', 'numbering',
    'Hay que numerar la cadena desde el otro extremo: los enlaces dobles y triples tienen que llevar los números más bajos '
    + '(1 en vez de 2). En «propeno» ese número ni siquiera se escribe.'],
  ['2-metil-3-etilpentano', 'ALPHABETICAL_ORDER', null, 'order',
    'Los sustituyentes se escriben por orden alfabético: «etil» va antes que «metil» (e antes que m).'],
  ['2,2-dimetil-3-etilpentano', 'ALPHABETICAL_ORDER', null, 'order',
    'Los sustituyentes se escriben por orden alfabético: «etil» va antes que «metil» (e antes que m). '
    + 'Los prefijos di-, tri-… no cuentan para el orden.'],
  ['4-isopropil-5-tert-butilnonano', 'ALPHABETICAL_ORDER', null, 'order',
    'Los sustituyentes se escriben por orden alfabético: «tert-butil» va antes que «isopropil» (b antes que i). '
    + '«tert-» no cuenta para el orden.'],
  ['2-metil-3-metilpentano', 'UNGROUPED', null, 'substituents',
    'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «2,3-dimetil», no «2-metil-3-metil».'],
  ['4-isopropil-5-(propan-2-il)octano', 'UNGROUPED', null, 'substituents',
    'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «4,5-diisopropil», no «4-isopropil-5-(propan-2-il)».'],
  ['5-(2-metil-2-metilpropil)nonano', 'UNGROUPED', null, 'substituents',
    'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «5-(2,2-dimetilpropil)», no «5-(2-metil-2-metilpropil)».'],
  ['2,3-bismetilpentano', 'MULTIPLIER_KIND', null, 'substituents',
    '«bis», «tris»… solo van delante de ramas que tienen sus propias ramas; aquí va «di», «tri»…: «2,3-dimetil», no «2,3-bismetil».'],
  ['5,5-di(2,2-dimetilpropil)nonano', 'MULTIPLIER_KIND', null, 'substituents',
    'Delante de una rama que tiene sus propias ramas se usa «bis», «tris»…: «5,5-bis(2,2-dimetilpropil)», no «5,5-di(2,2-dimetilpropil)».'],
  ['3,2-dimetilpentano', 'LOCANT_ORDER', null, 'assemble',
    'Los números de un mismo grupo se escriben de menor a mayor: «2,3-dimetil», no «3,2-dimetil».'],
  ['hexa-3,1-dieno', 'LOCANT_ORDER', null, 'assemble',
    'Los números de un mismo grupo se escriben de menor a mayor: «hexa-1,3-dieno», no «hexa-3,1-dieno».'],
  ['prop-1-eno', 'NEEDLESS_LOCANTS', null, 'numbering',
    'En «propeno» no se escriben números: solo hay una manera de colocar el enlace doble.'],
  ['propa-1,2-dieno', 'NEEDLESS_LOCANTS', null, 'numbering',
    'En «propadieno» no se escriben números: solo hay una manera de colocar los enlaces dobles.'],
  ['4-(propan-1-il)heptano', 'NEEDLESS_LOCANTS', null, 'numbering',
    'Sobran números dentro de la rama: se escribe «4-propil», no «4-(propan-1-il)».'],
  ['5 et 1 eno il non ano', 'NEEDLESS_LOCANTS', null, 'numbering',
    'Sobran números dentro de la rama: se escribe «5-etenil», no «5-(et-1-enil)».'],
  ['but ino eno', 'MISSING_LOCANTS', null, 'numbering',
    'Faltan números: hay que decir en qué carbono va cada rama y cada enlace doble o triple, como en «but-1-en-3-ino».'],
  ['pent-4-in-1-eno', 'SEGMENT_ORDER', null, 'assemble',
    'Cuando hay enlaces dobles y triples, «en» se escribe antes que «ino»: «pent-1-en-4-ino», no «pent-4-in-1-eno».'],
  ['2 but eno', 'OLD_STYLE', null, 'assemble',
    'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de «eno» o «ino»: «but-2-eno».'],
  ['2 met il 2 but eno', 'OLD_STYLE', null, 'assemble',
    'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, justo delante de «eno» o «ino»: '
    + '«2-metilbut-2-eno».'],
];

test('one case per diagnosis code: the code, its trace rule, the step and the message', () => {
  const seen = new Set();
  for (const [name, code, traceRule, step, message] of CASES) {
    const verdict = read(name);
    assertDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule, d.step], [code, traceRule, step], name);
    assert.equal(d.message, message, name);
    seen.add(code);
  } // End of the loop over the cases
  const chainCodes = DIAGNOSIS_CODES.filter((code) => !RING_ONLY_CODES.includes(code) && !ALCOHOL_ONLY_CODES.includes(code));
  assert.deepEqual([...seen].sort(), [...chainCodes].sort(), 'every code an open chain can give has a case');
}); // End of test 'one case per diagnosis code: the code, its trace rule, the step and the message'

test('the atoms of a diagnosis: the student\'s chain beside the parent, and what the message is about', () => {
  // A branch on an end: the student's two-carbon chain, the app's three; the focus is the methyl and its bond.
  const end = read('met il et ano');
  const occurrence = end.prefixAtoms[0];
  assert.deepEqual(end.diagnosis.student, end.studentParent);
  assert.deepEqual(end.diagnosis.parent, end.naming.parent);
  assert.deepEqual(end.diagnosis.focus, { atoms: occurrence.atoms, bonds: [occurrence.bond, ...occurrence.bonds] });
  assert.deepEqual(end.diagnosis.tiles, [0, 2], 'the tiles of «metil»');
  // A longer chain: the focus is the parent's part outside the student's chain.
  const longer = read('2-etilbutano');
  const outside = longer.naming.parent.atoms.filter((id) => !longer.studentParent.atoms.includes(id));
  assert.deepEqual(longer.diagnosis.focus.atoms, outside);
  assert.equal(outside.length, 2, 'the ethyl the student left as a branch');
  // Numbering: the same chain, the other way round.
  const numbering = read('4-metilpentano');
  assert.deepEqual([...numbering.diagnosis.student.atoms].reverse(), numbering.diagnosis.parent.atoms);
  assert.equal(numbering.diagnosis.tiles, null);
  // A form rule at the parent level: the prefixes concerned.
  const order = read('2-metil-3-etilpentano');
  assert.deepEqual(order.diagnosis.focus.atoms.sort((p, q) => p - q), order.prefixAtoms.flatMap((o) => o.atoms).sort((p, q) => p - q));
  assert.deepEqual(order.diagnosis.tiles, [0, 6], '«2-metil-3-etil»');
  assert.deepEqual(read('2,3-bismetilpentano').diagnosis.tiles, [2, 3], 'the «bis» tile');
  assert.deepEqual(read('2 but eno').diagnosis.tiles, [0, 1], 'the old-style locant');
}); // End of test 'the atoms of a diagnosis: the student's chain beside the parent, and what the message is about'

test('readName() attaches the diagnosis to otherName verdicts only; null when no rule applies', () => {
  const kinds = ['hex ano', '4 prop ano 2 il hept ano', 'met il prop ano', 'met il pent ano', '7 met il pent ano', '4 met il pent ano'];
  for (const words of kinds) {
    const verdict = read(words);
    assert.equal('diagnosis' in verdict, verdict.kind === 'otherName', `${words}: ${verdict.kind}`);
  }
  // No rule covers a branch named in a style the engine does not offer for this molecule (substituted `1,1-dimetiletil`
  // without an isopropyl group, design.md §1.1), nor a branch whose own chain or numbering is not the engine's.
  for (const [name, engine] of [['4-(1,1-dimetiletil)heptano', '4-tert-butilheptano'],
    ['7-[2-(2-metilpropil)propil]tridecano', '7-(2,4-dimetilpentil)tridecano'], ['5-(butan-3-il)nonano', '5-(butan-2-il)nonano']]) {
    const verdict = read(name);
    assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis], ['otherName', engine, null], name);
  }
  // The verdict's own message is unchanged (design.md §15.3: the panel puts the diagnosis between its sentences).
  assert.equal(read('4-metilpentano').message,
    'Esta es la molécula que describe tu nombre, pero se llama «2-metilpentano». Pulsa «Ver paso a paso» para ver por qué.');
  // A diagnosis that fails (here a naming without a trace, injected) never breaks the verdict.
  const broken = readName(seq('prop ano'), { namer: () => ({ ok: true, name: 'butano', alternatives: [] }) });
  assert.deepEqual([broken.kind, broken.name, broken.diagnosis, broken.draw], ['otherName', 'butano', null, true]);
}); // End of test 'readName() attaches the diagnosis to otherName verdicts only; null when no rule applies'

test('left-out locants: every placement is a reading, and the kindest diagnosis is kept', () => {
  const ids = seq('but ino eno');
  const verdict = readName(ids);
  const { tree } = parse(ids);
  const spec = interpret(tree);
  // The drawn placement numbers the triple bond first: alone, it reads as a numbering mistake.
  assert.equal(diagnose({ tree, spec }, verdict).code, 'NUMBERING');
  // With the other placement the chain is numbered the engine's way: what is wrong is the missing locants.
  assert.equal(verdict.diagnosis.code, 'MISSING_LOCANTS');
  assert.deepEqual(verdict.diagnosis.student, verdict.naming.parent, 'the reading that numbers like the engine');
  assert.notDeepEqual(verdict.studentParent, verdict.naming.parent, 'the verdict still draws the first placement');
  // Every placement of `metiletano` puts the methyl on an end.
  assert.equal(read('met il et ano').diagnosis.code, 'BRANCH_AT_END');
  assert.equal(read('hexa met il et ano').diagnosis.code, 'BRANCH_AT_END');
  assert.equal(MAX_READINGS, 16);
  // A refused naming has no diagnosis.
  assert.equal(diagnose({ tree, spec }, { ...verdict, naming: { ok: false, error: { code: 'X', message: 'm' } } }), null);
}); // End of test 'left-out locants: every placement is a reading, and the kindest diagnosis is kept'

test('the drafts: one entry per code in rule order, each message renders from its example, phrases for every rule', () => {
  // The ring rules of phase I-50d and the alcohol rules of phase I-51a3b stand beside the chain rules whose place they take
  // (diagnose.js headers «Rings» and «Alcohols»).
  assert.deepEqual(DIAGNOSIS_CODES, ['HYDROXY_PREFIX', 'HYDROXY_PARENT', 'BRANCH_AT_END', 'RING_IS_PARENT', 'MORE_HYDROXY_GROUPS',
    'LONGER_CHAIN', 'BENZENE_RING', 'SUBSTITUTED_TEMPLATE', 'PHENOL', 'MORE_MULTIPLE_BONDS', 'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS',
    'CHAIN_LOCANTS', 'CHAIN_ALPHABETICAL', 'NUMBERING', 'RING_NUMBERING', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND',
    'LOCANT_ORDER', 'NEEDLESS_LOCANTS', 'MISSING_LOCANTS', 'SEGMENT_ORDER', 'OLD_STYLE', 'LETTER_LOCANTS']);
  assert.deepEqual(DIAGNOSIS_CODES.map((code) => DIAGNOSES[code].rule),
    [1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 5, 6, 7, 8, 9, 9, 10, 11, 11]);
  assert.ok(Object.isFrozen(DIAGNOSES) && Object.isFrozen(DIAGNOSIS_TEXTS) && Object.isFrozen(DIAGNOSIS_PHRASES));
  for (const code of DIAGNOSIS_CODES) {
    const text = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    assert.match(text, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(text, /undefined|null|NaN/, code);
    assert.ok(STEP_FALLBACKS[DIAGNOSES[code].step], `${code}: a known step`);
  }
  // N0: an alcohol's OH groups (phase I-51a3b).
  assert.deepEqual(Object.keys(DIAGNOSIS_PHRASES.numberingReasons), ['N0', 'N1', 'N2', 'N3', 'N4', 'N5']);
  assert.deepEqual(Object.keys(DIAGNOSIS_PHRASES.lowerLocantsOf), ['N0', 'N1', 'N2', 'N3', 'N4']);
}); // End of test 'the drafts: one entry per code in rule order, each message renders from its example…'

test('diagnosisStepIndex(): the diagnosis\'s step, else its fallbacks, else the last step', () => {
  const steps = ['count', 'chain', 'numbering', 'substituents', 'assemble'].map((id) => ({ id }));
  assert.equal(diagnosisStepIndex(steps, { step: 'numbering' }), 2);
  assert.equal(diagnosisStepIndex(steps, { step: 'order' }), 3, 'no order step: the substituents');
  assert.equal(diagnosisStepIndex(steps, { step: 'tiebreak' }), 1, 'no tie-break step: the chain');
  assert.equal(diagnosisStepIndex(steps.filter((s) => s.id !== 'substituents'), { step: 'order' }), 3, 'then «Monta el nombre»');
  assert.equal(diagnosisStepIndex(steps, { step: 'unknown' }), 4);
  assert.equal(diagnosisStepIndex([], { step: 'chain' }), -1);
});

// ---------------------------------------------------------------------------
// Mutations of the fixture names (design.md §15.7).
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
 * A copy of tile ids with the locants of a list rewritten and put back in
 * ascending order over the same positions.
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
 * The mutations of one correct name, by family: each `{family, ids,
 * expect}`, `expect` the diagnosis code an `otherName` verdict must give
 * (null: any) and `others` the other verdict kinds the mutation may give.
 *
 * @param {string[]} ids - The name's tile ids.
 * @param {object} verdict - Its readName() verdict (correct or alternative).
 * @returns {{family: string, ids: string[], expect: string|null, others: string[]}[]} The mutations.
 */
function mutationsOf(ids, verdict) {
  const { tree } = parse(ids);
  const { tiles, items } = tree;
  const { chain } = tree.parent;
  const n = tiles[chain.root].value;
  const out = [];
  /**
   * Records one mutation.
   *
   * @param {string} family - Its family.
   * @param {string[]} mutated - Its tile ids.
   * @param {string|null} expect - The diagnosis code expected for an `otherName` (null: any).
   * @param {string[]} [others] - Other verdict kinds allowed.
   * @returns {void}
   */
  const push = (family, mutated, expect, others = []) => {
    out.push({ family, ids: mutated, expect, others });
  };
  // Numbering from the other end: every parent-level locant read from the far end (lists kept ascending).
  const reversed = [...ids];
  items.forEach((item) => rewriteLocants(reversed, tiles, item.locants, (v) => n + 1 - v));
  chain.segments.forEach((segment) => rewriteLocants(reversed, tiles, segment.locants, (v) => n - v));
  if (reversed.join() !== ids.join()) {
    push('reversed', reversed, 'NUMBERING', ['correct', 'alternative']);
  }
  // Locants swapped between two different prefixes: another molecule, often another chain.
  const single = items.filter((item) => item.locants.length === 1);
  single.forEach((a, i) => single.slice(i + 1).forEach((b) => {
    if (tiles[a.locants[0]].value !== tiles[b.locants[0]].value) {
      const swapped = [...ids];
      [swapped[a.locants[0]], swapped[b.locants[0]]] = [ids[b.locants[0]], ids[a.locants[0]]];
      push('swapped', swapped, null, ['correct', 'alternative', 'invalid']);
    }
  }));
  // Prefixes in reverse order.
  if (items.length >= 2) {
    const slices = items.map((item) => ids.slice(item.range[0], item.range[1]));
    push('unsorted', [...slices.reverse().flat(), ...ids.slice(tree.parent.range[0])], 'ALPHABETICAL_ORDER');
  }
  for (const item of items) {
    if (item.multiplier !== null && item.locants.length >= 2) {
      // Identical prefixes written one by one.
      const sub = ids.slice(item.multiplier + 1, item.range[1]);
      const split = item.locants.flatMap((p) => [ids[p], ...sub]);
      push('ungrouped', [...ids.slice(0, item.range[0]), ...split, ...ids.slice(item.range[1])], 'UNGROUPED');
    }
    if (item.multiplier !== null) {
      // di ↔ bis.
      const tile = tiles[item.multiplier];
      const swapped = [...ids];
      swapped[item.multiplier] = tile.kind === 'mult' ? `cmult-${tile.value}` : `mult-${tile.value}`;
      push('diBis', swapped, 'MULTIPLIER_KIND');
    }
    if (item.locants.length === 1) {
      // The branch moved to an end of the chain.
      for (const end of [1, n]) {
        if (tiles[item.locants[0]].value !== end) {
          const moved = [...ids];
          moved[item.locants[0]] = num(end);
          push('toEnd', moved, 'BRANCH_AT_END', ['invalid']);
        }
      }
    }
    const sub = item.substituent;
    const plain = sub.type === 'chain' && sub.segments.length === 0 && sub.fvLocants.length === 0 && tiles[sub.root].value >= 3;
    if (items.length === 1 && plain) {
      // `propil` → `(propan-1-il)` (the only prefix: its new words could change the alphabetical order, rule 5).
      const p = sub.fv;
      push('needless', [...ids.slice(0, p), 'ending-saturated', num(1), ...ids.slice(p)], 'NEEDLESS_LOCANTS');
    }
  } // End of the loop over the parent-level prefixes
  const segments = chain.segments;
  if (segments.length === 2) {
    // `eno` and `ino` written the other way round.
    const [s0, s1] = segments;
    push('segments', [...ids.slice(0, s0.range[0]), ...ids.slice(s1.range[0], s1.range[1]), ...ids.slice(s0.range[0], s0.range[1]),
      ...ids.slice(s1.range[1])], 'SEGMENT_ORDER');
  }
  for (const segment of segments) {
    if (segment.locants.length > 0) {
      // Old style: the locants of one segment before the root (`2-buteno`).
      const root = tree.parent.range[0];
      const rest = ids.slice(root).filter((_, k) => !segment.locants.includes(root + k));
      push('oldStyle', [...ids.slice(0, root), ...segment.locants.map((p) => ids[p]), ...rest], 'OLD_STYLE');
    }
  }
  if (segments.length > 0 && segments.every((segment) => segment.locants.length === 0)) {
    // A parent whose locants the engine omits (`propeno`), written with them.
    const located = [...ids];
    const { parent } = verdict.naming.structure;
    [...segments].reverse().forEach((segment) => {
      const sites = parent[tiles[segment.ending].value];
      located.splice(segment.range[0], 0, ...sites.map((site) => num(site.locant)));
    });
    push('needless', located, 'NEEDLESS_LOCANTS');
  }
  return out;
} // End of function mutationsOf()

/**
 * How many mutations of each family give `otherName`; every one is
 * diagnosed with its family's code (no exception: the names no rule covers
 * are tested apart, «readName() attaches the diagnosis…»).
 */
const EXPECTED_OTHER_NAME = Object.freeze({
  reversed: 81, swapped: 28, unsorted: 41, ungrouped: 41, diBis: 41, toEnd: 287, needless: 9, segments: 8, oldStyle: 61,
});

test('mutations of every open-chain hydrocarbon fixture name: the expected diagnosis, and a coverage count', async () => {
  const rows = (await readFixtures()).filter((row) => isOpenChainHydrocarbon(row.smiles));
  const counts = Object.fromEntries(Object.keys(EXPECTED_OTHER_NAME).map((family) => [family, 0]));
  const codes = {};
  for (const row of rows) {
    for (const name of row.names) {
      const ids = tokenize(name);
      for (const mutation of mutationsOf(ids, readName(ids))) {
        const verdict = readName(mutation.ids);
        const label = `${name} → ${verdict.text} (${mutation.family})`;
        if (verdict.kind !== 'otherName') {
          assert.ok(mutation.others.includes(verdict.kind), `${label}: ${verdict.kind}, ${verdict.message}`);
          continue;
        }
        counts[mutation.family] += 1;
        assertDiagnosis(verdict, label);
        if (mutation.expect) {
          assert.equal(verdict.diagnosis.code, mutation.expect, `${label}: ${verdict.diagnosis.message}`);
        }
        codes[verdict.diagnosis.code] = (codes[verdict.diagnosis.code] || 0) + 1;
      } // End of the loop over the mutations of a name
    } // End of the loop over the names of a row
  } // End of the loop over the fixture rows
  assert.deepEqual(counts, EXPECTED_OTHER_NAME, JSON.stringify(codes));
}); // End of test 'mutations of every open-chain hydrocarbon fixture name…'

/**
 * The locants of the multiple bonds along a chain (a bond numbered by its
 * lower carbon), read on the molecule: double and triple (N1) or double
 * only (N2).
 *
 * @param {object} mol - The molecule.
 * @param {number[]} atoms - The chain in locant order.
 * @param {(order: number) => boolean} test - Which bond orders count.
 * @returns {number[]} The ascending locants.
 */
function bondLocants(mol, atoms, test) {
  const { orders } = chainBonds(adjacency(mol), atoms);
  return orders.map((order, i) => (test(order) ? i + 1 : 0)).filter(Boolean);
}

/** How many forced-chain names of the fixture molecules give `otherName`, by diagnosis code. */
const EXPECTED_CHAIN_CODES = Object.freeze({
  LONGER_CHAIN: 1182, MORE_MULTIPLE_BONDS: 18, MORE_DOUBLE_BONDS: 2, MORE_SUBSTITUENTS: 18, CHAIN_LOCANTS: 6, CHAIN_ALPHABETICAL: 2,
  NUMBERING: 120,
});

test('every chain chosen, each way round: the diagnosis agrees with the engine\'s counts and names', async () => {
  const rows = (await readFixtures()).filter((row) => isOpenChainHydrocarbon(row.smiles));
  const codes = Object.fromEntries(Object.keys(EXPECTED_CHAIN_CODES).map((code) => [code, 0]));
  let tied = 0;
  for (const row of rows) {
    const mol = parseSmiles(row.smiles);
    const naming = nameMolecule(mol);
    const adj = adjacency(mol);
    const parent = chainCounts(adj, naming.parent.atoms);
    const p1 = naming.trace.find((s) => s.rule === 'P1');
    for (const candidate of p1.candidatesBefore) {
      for (const atoms of [candidate.atoms, [...candidate.atoms].reverse()]) {
        const text = forcedName(mol, atoms);
        const verdict = read(text);
        const label = `names.tsv:${row.line} ${text} → ${verdict.name}`;
        if (verdict.kind !== 'otherName') {
          assert.ok(['correct', 'alternative'].includes(verdict.kind), `${label}: ${verdict.kind}`);
          tied += 1;
          continue;
        }
        assertDiagnosis(verdict, label);
        const d = verdict.diagnosis;
        codes[d.code] += 1;
        // The engine's own counts of the chosen chain and of its parent (parent.js chainCounts()) give the first three rules.
        const mine = chainCounts(adj, atoms);
        let expected = null;
        if (mine.length < parent.length) {
          expected = 'LONGER_CHAIN';
        } else if (mine.multiple < parent.multiple) {
          expected = 'MORE_MULTIPLE_BONDS';
        } else if (mine.double < parent.double) {
          expected = 'MORE_DOUBLE_BONDS';
        }
        if (expected) {
          assert.equal(d.code, expected, `${label}: ${d.message}`);
          continue;
        }
        assert.ok(['MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'CHAIN_ALPHABETICAL', 'NUMBERING'].includes(d.code), `${label}: ${d.code}`);
        const vmol = verdict.molecule;
        const vadj = adjacency(vmol);
        if (d.code === 'MORE_SUBSTITUENTS') {
          assert.ok(chainCounts(vadj, d.student.atoms).substituents < chainCounts(vadj, d.parent.atoms).substituents, label);
        } else if (d.code === 'NUMBERING') {
          // Numbered from the other end, the student's own chain gives the app's name.
          assert.equal(forcedName(vmol, [...d.student.atoms].reverse()), verdict.name, label);
        } else if (d.code === 'CHAIN_LOCANTS' && ['N1', 'N2'].includes(d.traceRule)) {
          // The parent's multiple bonds have lower locants than the student's chain has, numbered either way.
          const test = d.traceRule === 'N1' ? (order) => order >= 2 : (order) => order === 2;
          const own = bondLocants(vmol, d.parent.atoms, test);
          for (const way of [d.student.atoms, [...d.student.atoms].reverse()]) {
            assert.ok(compareLocantLists(own, bondLocants(vmol, way, test)) < 0, label);
          }
        }
      } // End of the loop over both directions of a chain
    } // End of the loop over the chains of a molecule
  } // End of the loop over the fixture rows
  assert.deepEqual(codes, EXPECTED_CHAIN_CODES);
  assert.equal(tied, 434, 'the other names are the app\'s (a parent, or a chain that gives the same name)');
}); // End of test 'every chain chosen, each way round: the diagnosis agrees with the engine's counts and names'

/** Representative otherName names for the time budget (design.md §15.7). */
const TIMED = ['met il et ano', '2-etilbutano', '3-isopropilpentano', '6-metil-8-[2-(2-metilbutil)heptil]hexadecano', '4-metilpentano',
  '6-metil-4-(propan-2-il)nonano', '2,2-dimetil-3-etilpentano', '5-(2-metil-2-metilpropil)nonano', 'but ino eno', 'hexa met il et ano',
  '2 met il 2 but eno'];

/** Time budget of one readName() call with its diagnosis, in milliseconds (generous: phones are slower). */
const PER_NAME_BUDGET_MS = 250;

/** Average time budget of one diagnose() call over the mutation corpus, in milliseconds. */
const AVERAGE_DIAGNOSE_MS = 5;

test('time budget: readName() with its diagnosis well within budget; diagnose() itself a few milliseconds', async () => {
  TIMED.forEach((name) => read(name)); // Warm-up.
  for (const name of TIMED) {
    const start = performance.now();
    const verdict = read(name);
    const elapsed = performance.now() - start;
    assert.ok(verdict.diagnosis, name);
    assert.ok(elapsed < PER_NAME_BUDGET_MS, `${name}: ${elapsed.toFixed(1)} ms`);
  }
  const rows = (await readFixtures()).filter((row) => isOpenChainHydrocarbon(row.smiles));
  let elapsed = 0;
  let calls = 0;
  for (const row of rows) {
    const ids = tokenize(row.names[0]);
    for (const mutation of mutationsOf(ids, readName(ids))) {
      const verdict = readName(mutation.ids);
      if (verdict.kind === 'otherName') {
        const { tree } = parse(mutation.ids);
        const start = performance.now();
        diagnose({ tree, spec: interpret(tree) }, verdict);
        elapsed += performance.now() - start;
        calls += 1;
      }
    }
  } // End of the loop over the fixture rows
  assert.ok(calls > 400, `${calls} diagnoses`);
  assert.ok(elapsed / calls < AVERAGE_DIAGNOSE_MS, `diagnose() took ${(elapsed / calls).toFixed(3)} ms on average`);
}); // End of test 'time budget: readName() with its diagnosis well within budget…'

test('a name in another prefix style is judged against the engine\'s naming in that style', () => {
  // The pin style cites `metil` before `propan-2-il`, so metil takes the lower locant (design.md §1.1, §4.8 fixture).
  const pin = read('6-metil-4-(propan-2-il)nonano');
  assert.equal(pin.name, '4-isopropil-6-metilnonano', 'numbered as the default style numbers it');
  assert.deepEqual([pin.diagnosis.code, pin.diagnosis.traceRule, pin.diagnosis.style], ['NUMBERING', 'N4', 'pin']);
  assert.deepEqual(pin.diagnosis.parent, nameMolecule(pin.molecule, { prefixStyle: 'pin' }).parent);
  assert.match(pin.diagnosis.message, /\(4 en vez de 6\)\.$/);
  const substituted = read('6-metil-4-(1-metiletil)nonano');
  assert.deepEqual([substituted.diagnosis.code, substituted.diagnosis.style], ['NUMBERING', 'substituted']);
  // Branches of several styles: the default style unless more of them have another style's shape.
  assert.equal(read('4-isopropil-5-(propan-2-il)octano').diagnosis.style, 'isopropil');
  assert.equal(read('2-metil-3-metilpentano').diagnosis.style, 'isopropil', 'no other style offered');
}); // End of test 'a name in another prefix style is judged against the engine's naming in that style'

test('review I-49a: the prefix style is recognised by the branches\' structure, despite the form mistakes', () => {
  // `(1-metiletan-1-il)` is the substituted style's `1-metiletil` with needless locants: in that style the numbering is
  // right (`4-metil-6-(1-metiletil)nonano`, an alternative name), so the mistake is the locants, not the numbering.
  const verdict = read('4-metil-6-(1-metiletan-1-il)nonano');
  assertDiagnosis(verdict, 'needless locants in the substituted style');
  assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.style], ['NEEDLESS_LOCANTS', 'substituted']);
  assert.equal(verdict.diagnosis.message,
    'Sobran números dentro de la rama: se escribe «6-(1-metiletil)», no «6-(1-metiletan-1-il)».');
  assert.equal(read('4-metil-6-(1-metiletil)nonano').kind, 'alternative', 'the same name without the needless locants');
  // Numbered the other way, the name is wrong in its own style too: then NUMBERING, in that style.
  const reversed = read('6-metil-4-(1-metiletan-1-il)nonano');
  assertDiagnosis(reversed, 'reversed, substituted style');
  assert.deepEqual([reversed.diagnosis.code, reversed.diagnosis.traceRule, reversed.diagnosis.style], ['NUMBERING', 'N4', 'substituted']);
  // A spelling no style uses keeps the style its structure shows: `(propan-2-il)` is pin whatever else is written.
  assert.equal(read('6-metil-4-(propan-2-il)nonano').diagnosis.style, 'pin');
}); // End of test 'review I-49a: the prefix style is recognised by the branches' structure, despite the form mistakes'

test('review I-49a: identical branches inside a compound branch are told by their structure and bond order', () => {
  // `metil` and `(metan-1-il)` are both methyl: never an alphabetical-order mistake, in either citation order; the
  // first rule that applies is grouping (rule 6, before the needless locants of rule 9), in the engine's short form.
  for (const name of ['5-[2-metil-2-(metan-1-il)propil]nonano', '5-[2-(metan-1-il)-2-metilpropil]nonano']) {
    const verdict = read(name);
    assertDiagnosis(verdict, name);
    assert.equal(verdict.name, '5-(2,2-dimetilpropil)nonano', name);
    assert.equal(verdict.diagnosis.code, 'UNGROUPED', `${name}: ${verdict.diagnosis.message}`);
    assert.equal(verdict.diagnosis.message, 'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: '
      + `«5-(2,2-dimetilpropil)», no «${name.slice(0, name.indexOf('nonano'))}».`, name);
  }
  // At the parent level too: `(propan-1-il)` and `propil` are one branch, grouped in its short form.
  assert.equal(read('4-(propan-1-il)-5-propiloctano').diagnosis.message,
    'Las ramas iguales se escriben una sola vez, con «di», «tri»… delante: «4,5-dipropil», no «4-(propan-1-il)-5-propil».');
  // One carbon on a single bond (metil) and on a double bond (metiliden) are different branches: only the bond order
  // that attaches them tells them apart, so these two are out of alphabetical order, not ungrouped.
  const order = read('7-(3-metiliden-2-metilbutil)tridecano');
  assert.equal(order.diagnosis.code, 'ALPHABETICAL_ORDER');
  assert.equal(order.diagnosis.message,
    'Los sustituyentes se escriben por orden alfabético: «metil» va antes que «metiliden» (la palabra más corta va primero).');
  // One prefix group on the parent: explain() has no «order» step, so the fallback opens the substituents.
  const opened = diagnosisExplanation(order, explain);
  assert.deepEqual([opened.steps.some((s) => s.id === 'order'), opened.steps[opened.index].id], [false, 'substituents']);
}); // End of test 'review I-49a: identical branches inside a compound branch are told by their structure and bond order'

test('review I-49a: the step opened belongs to the explanation of the naming the diagnosis compared with', () => {
  // The pin style cites `metil` before `propan-2-il`: the numbering must be reversed. The default style numbers the
  // chain as the student did, so its explanation would endorse the numbering the diagnosis rejects.
  const verdict = read('6-metil-4-(propan-2-il)nonano');
  const d = verdict.diagnosis;
  assert.deepEqual([d.code, d.traceRule, d.step, d.style], ['NUMBERING', 'N4', 'numbering', 'pin']);
  const opened = diagnosisExplanation(verdict, explain);
  assert.equal(opened.naming.name, '4-metil-6-(propan-2-il)nonano');
  assert.deepEqual(diagnosisNaming(verdict), opened.naming);
  assert.deepEqual(opened.naming, nameMolecule(verdict.molecule, { prefixStyle: 'pin' }));
  const step = opened.steps[opened.index];
  assert.equal(step.id, 'numbering');
  // Its locants number the student's chain from the other end: the student's carbon k is the app's 10 − k.
  const n = d.student.atoms.length;
  const locants = new Map(step.locants);
  d.student.atoms.forEach((atom, k) => assert.equal(locants.get(atom), n - k, `the student's carbon ${k + 1}`));
  // Its N4 comparison is won by the numbering that gives metil the 4.
  const row = step.compare.rows.find((r) => r.rule === 'N4');
  assert.deepEqual(row.winners.map((w) => row.lists[w]), [[4, 6]]);
  // The verdict's own (default-style) explanation numbers the chain as the student did: the wrong one to open.
  const own = explain(verdict.naming);
  const ownLocants = new Map(own[diagnosisStepIndex(own, d)].locants);
  d.student.atoms.forEach((atom, k) => assert.equal(ownLocants.get(atom), k + 1));
  // The default style: the verdict's own naming; no diagnosis: nothing to open.
  const plain = read('4-metilpentano');
  assert.equal(diagnosisNaming(plain), plain.naming);
  const plainOpened = diagnosisExplanation(plain, explain);
  assert.equal(plainOpened.naming, plain.naming);
  assert.equal(plainOpened.steps[plainOpened.index].id, 'numbering');
  assert.equal(diagnosisNaming({ ...plain, diagnosis: null }), null);
  assert.equal(diagnosisExplanation({ ...plain, diagnosis: null }, explain), null);
  // The diagnosis stays JSON-safe: its context is the style, from which the helpers rebuild the naming.
  assert.deepEqual(JSON.parse(JSON.stringify(d)), d);
}); // End of test 'review I-49a: the step opened belongs to the explanation of the naming the diagnosis compared with'

test('review I-50d: on a chain too, alphabetical order blames a chain or numbering only in the student\'s own words', () => {
  // Rule 4: `etil` before `metilpropil`, so the chain is numbered right for the student's own words; the engine offers
  // only `butan-2-il` for that branch, cited first, and numbers the other way (a style not offered: null).
  const numbering = read('5-etil-7-(1-metilpropil)undecano');
  assert.deepEqual([numbering.kind, numbering.name, numbering.diagnosis], ['otherName', '5-(butan-2-il)-7-etilundecano', null]);
  // Rule 3 at N4 likewise (CASES: `5-(butan-2-il)-6-(but-1-en-2-il)-7-metil-3-metilidennon-4-eno` is CHAIN_LOCANTS): with
  // `1-metilpropil` the student's chain is cited in another order than the one the trace compared, so the chain is not
  // blamed; the rules that read the student's own words still run.
  const chain = read('5-(1-metilpropil)-6-(but-1-en-2-il)-7-metil-3-metilidennon-4-eno');
  assertDiagnosis(chain, 'rule 3 in other words');
  assert.equal(chain.name, '5,6-di(butan-2-il)-3,7-dimetilidennon-4-eno');
  assert.equal(chain.diagnosis.code, 'ALPHABETICAL_ORDER');
  assert.equal(chain.diagnosis.message,
    'Los sustituyentes se escriben por orden alfabético: «but-1-en-2-il» va antes que «1-metilpropil» (b antes que m).');
  // A numbering blamed at N4 in the student's own words stays, and the explanation it opens cites the student's prefixes
  // in the order of their words: `etil` before `metil`; `metil` before `propan-2-il` (pin style).
  for (const [name, explained, cited] of [['4-etil-3-metilhexano', '3-etil-4-metilhexano', [0, 1]],
    ['6-metil-4-(propan-2-il)nonano', '4-metil-6-(propan-2-il)nonano', [0, 1]]]) {
    const verdict = read(name);
    assertDiagnosis(verdict, name);
    assert.deepEqual([verdict.diagnosis.code, verdict.diagnosis.traceRule], ['NUMBERING', 'N4'], name);
    const { naming } = diagnosisExplanation(verdict, explain);
    assert.equal(naming.name, explained, name);
    const prefixOf = new Map(verdict.prefixAtoms.map((o) => [o.attachment, o.prefix]));
    assert.deepEqual(naming.structure.prefixes.map((group) => prefixOf.get(group.locants[0].attachAtom)), cited, name);
  } // End of the loop over the numbering cases
  // Needless parent prefix locants beside a branch that keeps its own numbers (the ring's `(butan-2-il)benceno`) cannot
  // occur on a chain: the engine leaves prefix locants out only on a one- or two-carbon parent, where any branch sits on
  // an end, so rule 1 comes first.
  for (const name of ['1-(butan-2-il)metano', '1-(butan-2-il)etano']) {
    assert.equal(read(name).diagnosis.code, 'BRANCH_AT_END', name);
  }
}); // End of test 'review I-50d: on a chain too, alphabetical order blames a chain or numbering only…'

test('readName() with its diagnosis bundles with the engine and runs in a classic script', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'organic-diagnose-'));
  try {
    await cp(path.join(ROOT, 'src'), path.join(dir, 'src'), { recursive: true });
    await writeFile(
      path.join(dir, 'entry.js'),
      [
        "import { readName } from './src/reverse/index.js';",
        "import { tokenize } from './src/reverse/tokenize.js';",
        "import { DIAGNOSIS_CODES } from './src/reverse/diagnose.js';",
        "const names = ['metiletano', '2-etilbutano', '4-metilpentano', '2-metil-3-etilpentano', '2-buteno'];",
        "globalThis.__result = names.map((name) => readName(tokenize(name)).diagnosis.code).join(' ') + ' ' + DIAGNOSIS_CODES.length;",
      ].join('\n'),
    );
    const code = await bundleModules(path.join(dir, 'entry.js'), dir);
    const context = {};
    vm.runInNewContext(code, context);
    assert.equal(context.__result, `BRANCH_AT_END LONGER_CHAIN NUMBERING ALPHABETICAL_ORDER OLD_STYLE ${DIAGNOSIS_CODES.length}`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}); // End of test 'readName() with its diagnosis bundles with the engine and runs in a classic script'
