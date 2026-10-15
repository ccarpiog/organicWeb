/**
 * @file Unit tests for the alcohol diagnoses of «¿Cómo se dibuja?»
 * (src/reverse/diagnose.js header «Alcohols», design.md §13.4 I-40a, §13.6,
 * §15.8 R-5a; phase I-51a3b, R-5a3b): one case per alcohol mistake that
 * phases I-51a2 and I-51a3a left as a deliberate null — the OH numbered
 * otherwise (N0: NUMBERING, RING_NUMBERING, and CHAIN_LOCANTS for a whole
 * chain), an OH of the suffix written `hidroxi` on the parent
 * (HYDROXY_PREFIX, also on a retained phenol), another chain with more OH
 * groups (MORE_HYDROXY_GROUPS, P0; also before BRANCH_AT_END for a chain
 * with a branch on its end that P0 drops however lengthened, I-51a3b
 * review), the ring against a chain decided by the
 * OH groups, both ways (HYDROXY_PARENT, never RING_IS_PARENT's «un anillo
 * manda siempre»), old-style and needless suffix locants (OLD_STYLE,
 * NEEDLESS_LOCANTS) and `bencenol` (PHENOL) — each with its code, trace
 * rule, message and the step «Ver el paso» opens; the student's chain beside
 * the parent, the focus and the tiles; the explanation step each opens says
 * the rule; a sweep over the alcohol fixture names (every suffix rewritten
 * as `hidroxi` prefixes, every suffix's locants moved to the old style);
 * correct names without a diagnosis; the drafts.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { HYDROXY_ID } from '../../src/reverse/tiles.js';
import {
  diagnosisNaming, diagnosisExplanation, DIAGNOSES, DIAGNOSIS_CODES, DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES, STEP_FALLBACKS,
} from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { diagnosisLegend } from '../../src/ui/draw-name.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { readFixtures, isAlcohol, isAlcoholName } from './reverse-words.js';

/** The codes only an alcohol gives (diagnose.js header «Alcohols»). */
const ALCOHOL_CODES = Object.freeze(['HYDROXY_PREFIX', 'HYDROXY_PARENT', 'MORE_HYDROXY_GROUPS', 'PHENOL']);

/**
 * Reads a name text (the tokenizer gives its tiles).
 *
 * @param {string} name - A name.
 * @returns {object} The verdict.
 */
function read(name) {
  const ids = tokenize(name);
  assert.ok(ids, `no tiles for ${name}`);
  return readName(ids);
}

/**
 * Sorts numbers ascending (a bond's two atoms, a chain's atoms).
 *
 * @param {number[]} pair - The numbers.
 * @returns {number[]} A sorted copy.
 */
function sorted(pair) {
  return [...pair].sort((p, q) => p - q);
}

/**
 * Asserts the invariants of a diagnosed `otherName` verdict of an alcohol: a
 * known code with its rule; a Spanish message with every blank filled; a
 * JSON-safe object; atom and bond ids of the verdict's molecule; the
 * student's chain — or ring, its closing bond last — a path of bonds; the
 * app's parent the naming's (in the diagnosis's style); a step that
 * diagnosisExplanation() resolves and opens.
 *
 * @param {object} verdict - An `otherName` verdict with a diagnosis.
 * @param {string} label - Assertion label.
 * @returns {object} The explanation step «Ver el paso» opens.
 */
function assertAlcoholDiagnosis(verdict, label) {
  const d = verdict.diagnosis;
  assert.equal(verdict.kind, 'otherName', label);
  assert.ok(d, `${label}: no diagnosis`);
  assert.ok(DIAGNOSES[d.code], `${label}: ${d.code}`);
  assert.equal(d.rule, DIAGNOSES[d.code].rule, label);
  assert.ok(d.message.length > 0 && !/undefined|null|NaN|\[object/.test(d.message), `${label}: ${d.message}`);
  assert.deepEqual(JSON.parse(JSON.stringify(d)), d, `${label}: JSON-safe`);
  assert.ok(PREFIX_STYLES.includes(d.style), label);
  const { molecule } = verdict;
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
  const naming = diagnosisNaming(verdict);
  assert.deepEqual(d.parent, naming.parent, `${label}: the app's parent`);
  if (d.tiles) {
    assert.ok(d.tiles[0] >= 0 && d.tiles[0] < d.tiles[1], `${label}: tiles ${d.tiles}`);
  }
  const opened = diagnosisExplanation(verdict, explain);
  const resolved = [d.step, ...STEP_FALLBACKS[d.step]].find((id) => opened.steps.some((step) => step.id === id));
  assert.ok(resolved, `${label}: no step «${d.step}» in ${opened.steps.map((s) => s.id)}`);
  assert.equal(opened.steps[opened.index].id, resolved, label);
  return opened.steps[opened.index];
} // End of function assertAlcoholDiagnosis()

/** The ring-or-chain rule as the HYDROXY_PARENT message states it, before the counts. */
const RING_OR_CHAIN = 'La cadena principal es la que lleva más grupos –OH, sea el anillo o una cadena abierta; solo si empatan '
  + 'manda el anillo. Aquí ';

/**
 * One case per alcohol mistake (the former deliberate nulls of I-51a2 and
 * I-51a3a): [name, code, trace rule, the step «Ver el paso» opens, message].
 */
const CASES = [
  // 1. The OH numbered from the other end (N0): the chain, the ring, benzene; a whole chain dropped at N0.
  ['butan-3-ol', 'NUMBERING', 'N0', 'numbering', 'Hay que numerar la cadena desde el otro extremo: los grupos –OH (el grupo '
    + 'principal) tienen que llevar los números más bajos (2 en vez de 3).'],
  ['ciclohexan-2-ol', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en otro carbono '
    + 'o contando hacia el otro lado: los grupos –OH (el grupo principal) tienen que llevar los números más bajos (1 en vez de 2). '
    + 'En «ciclohexanol» ese número ni siquiera se escribe.'],
  ['benceno-1,5-diol', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en otro carbono '
    + 'o contando hacia el otro lado: los grupos –OH (el grupo principal) tienen que llevar los números más bajos (3 en vez de 5).'],
  ['3-(2-hidroxietil)pentano-2,4-diol', 'CHAIN_LOCANTS', 'N0', 'numbering', 'Hay otra cadena igual de larga que, bien numerada, '
    + 'da números más bajos a los grupos –OH (1 en vez de 2): esa es la cadena principal.'],
  // 2. An OH of the suffix written `hidroxi` on the parent, also on a template and a retained phenol; another chain with more OH.
  ['2-hidroxipropano', 'HYDROXY_PREFIX', null, 'group', 'El grupo –OH es el grupo principal: se nombra con la terminación «-ol», '
    + 'al final del nombre, no con el prefijo «hidroxi». Se escribe «propan-2-ol».'],
  ['2-hidroxipropan-1-ol', 'HYDROXY_PREFIX', null, 'group', 'Los grupos –OH son el grupo principal: los de la cadena principal se '
    + 'nombran todos juntos con la terminación «-diol», al final del nombre, no con el prefijo «hidroxi». Se escribe «propano-1,2-diol».'],
  ['4-hidroxitolueno', 'HYDROXY_PREFIX', null, 'group', 'El grupo –OH es el grupo principal: se nombra con la terminación «-ol», '
    + 'al final del nombre, no con el prefijo «hidroxi». Se escribe «4-metilfenol».'],
  ['hidroxibenceno', 'HYDROXY_PREFIX', null, 'group', 'El grupo –OH es el grupo principal: se nombra con la terminación «-ol», '
    + 'al final del nombre, no con el prefijo «hidroxi». Se escribe «fenol».'],
  ['4-hidroxicatecol', 'HYDROXY_PREFIX', null, 'group', 'Los grupos –OH son el grupo principal: los del anillo se nombran todos '
    + 'juntos con la terminación «-triol», al final del nombre, no con el prefijo «hidroxi». Se escribe «benceno-1,2,4-triol».'],
  ['2-hidroxihidroquinona', 'HYDROXY_PREFIX', null, 'group', 'Los grupos –OH son el grupo principal: los del anillo se nombran todos '
    + 'juntos con la terminación «-triol», al final del nombre, no con el prefijo «hidroxi». Se escribe «benceno-1,2,4-triol».'],
  ['5-hidroxiresorcinol', 'HYDROXY_PREFIX', null, 'group', 'Los grupos –OH son el grupo principal: los del anillo se nombran todos '
    + 'juntos con la terminación «-triol», al final del nombre, no con el prefijo «hidroxi». Se escribe «benceno-1,3,5-triol».'],
  ['2-(hidroximetil)propan-1-ol', 'MORE_HYDROXY_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos –OH (2; la tuya tiene 1). '
    + 'La cadena principal es la que lleva más grupos –OH, aunque no sea la más larga.'],
  ['2-(hidroximetil)pentano', 'MORE_HYDROXY_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos –OH (1; la tuya tiene 0). '
    + 'La cadena principal es la que lleva más grupos –OH, aunque no sea la más larga.'],
  // 3. The ring or a chain, decided by the OH groups: the ring for a chain (no RINGCHAIN step: every OH on the ring; a tie; more
  // on the ring), and the reverse, a chain for the ring.
  ['(4-hidroxifenil)metano', 'HYDROXY_PARENT', 'RING', 'benzene', `${RING_OR_CHAIN}el anillo lleva uno y las cadenas no llevan `
    + 'ninguno, así que gana el anillo: «4-metilfenol».'],
  ['(4-hidroxiciclohexil)metanol', 'HYDROXY_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo y la mejor cadena llevan `
    + 'uno cada uno, así que gana el anillo: «4-(hidroximetil)ciclohexan-1-ol».'],
  ['(2,6-dihidroxiciclohexil)metanol', 'HYDROXY_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo lleva 2 y la mejor `
    + 'cadena, uno, así que gana el anillo: «2-(hidroximetil)ciclohexano-1,3-diol».'],
  ['(2-hidroxietil)ciclohexano', 'HYDROXY_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo no lleva ninguno y la mejor `
    + 'cadena, uno, así que gana la cadena y el anillo va en una rama: «2-ciclohexiletan-1-ol».'],
  ['(1-hidroxipropil)benceno', 'HYDROXY_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo no lleva ninguno y la mejor `
    + 'cadena, uno, así que gana la cadena y el anillo va en una rama: «1-fenilpropan-1-ol».'],
  ['2-(2,2-dihidroxietil)ciclohexan-1-ol', 'HYDROXY_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo lleva uno y la `
    + 'mejor cadena, 2, así que gana la cadena y el anillo va en una rama: «2-(2-hidroxiciclohexil)etano-1,1-diol».'],
  // 4. Old-style locants of the suffix (the words they now go before: `ol`, `diol`).
  ['2-propanol', 'OLD_STYLE', null, 'assemble', 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, '
    + 'justo delante de «ol»: «propan-2-ol».'],
  ['1,2-etanodiol', 'OLD_STYLE', null, 'assemble', 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van '
    + 'detrás, justo delante de «diol»: «etano-1,2-diol».'],
  ['1,2-bencenodiol', 'OLD_STYLE', null, 'assemble', 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van '
    + 'detrás, justo delante de «diol»: «benceno-1,2-diol».'],
  // 5. Needless suffix locants (no numbering step on a one-carbon parent: «Monta el nombre»; «Numera el anillo» on a ring).
  ['etan-1-ol', 'NEEDLESS_LOCANTS', null, 'numbering', 'En «etanol» no se escriben números: solo hay una manera de colocar el '
    + 'grupo –OH.'],
  ['triclorometan-1-ol', 'NEEDLESS_LOCANTS', null, 'assemble', 'En «triclorometanol» no se escriben números: solo hay una manera '
    + 'de colocar el grupo –OH.'],
  ['1,1,1-triclorometan-1-ol', 'NEEDLESS_LOCANTS', null, 'assemble', 'En «triclorometanol» no se escriben números: solo hay una '
    + 'manera de colocar los sustituyentes y el grupo –OH.'],
  ['ciclohexan-1-ol', 'NEEDLESS_LOCANTS', null, 'ringNumbering', 'En «ciclohexanol» no se escriben números: solo hay una manera '
    + 'de colocar el grupo –OH.'],
  ['(2-metilciclohexil)metan-1-ol', 'NEEDLESS_LOCANTS', null, 'assemble', 'En «(2-metilciclohexil)metanol» no se escribe el número '
    + 'que dice en qué carbono de la cadena va el grupo –OH: solo hay una manera de colocarlo. Los números de dentro de la rama sí se '
    + 'escriben.'],
  // 6. Benzene with one OH written with `benceno` and `ol`.
  ['bencenol', 'PHENOL', null, 'group', 'Un benceno con un solo grupo –OH tiene nombre propio: «fenol», no «bencenol».'],
  ['bencen-1-ol', 'PHENOL', null, 'group', 'Un benceno con un solo grupo –OH tiene nombre propio: «fenol», no «bencenol».'],
  ['4-metilbencen-1-ol', 'PHENOL', null, 'group', 'Un benceno con un solo grupo –OH tiene nombre propio: «fenol», no «bencenol». '
    + 'Se escribe «4-metilfenol».'],
];

test('one case per alcohol mistake: the code, its trace rule, the step «Ver el paso» opens and the message', () => {
  const seen = new Set();
  for (const [name, code, traceRule, opened, message] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.text, name, name);
    const step = assertAlcoholDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule], [code, traceRule], `${name}: ${d.message}`);
    assert.equal(step.id, opened, `${name}: the step «Ver el paso» opens`);
    assert.equal(d.message, message, name);
    seen.add(code);
  } // End of the loop over the cases
  assert.deepEqual(ALCOHOL_CODES.filter((code) => !seen.has(code)), [], 'every alcohol code has a case');
}); // End of test 'one case per alcohol mistake…'

test('the student\'s chain beside the parent, what the message is about and its tiles', () => {
  // N0: the same chain, numbered the other way; no tiles.
  const numbering = read('butan-3-ol').diagnosis;
  assert.deepEqual([...numbering.student.atoms].reverse(), numbering.parent.atoms);
  assert.equal(numbering.tiles, null);
  assert.deepEqual(diagnosisLegend(numbering).map((e) => e.text), ['Cadena principal', 'Tu cadena (es la misma)']);
  // HYDROXY_PREFIX: the student's chain is the parent; the focus is the OH written `hidroxi` (its O and bond); its tiles.
  const prefix = read('2-hidroxipropano');
  const oxygen = prefix.prefixAtoms[0];
  assert.deepEqual(prefix.diagnosis.student, prefix.studentParent);
  assert.deepEqual(prefix.molecule.atoms.get(oxygen.attachment).element, 'O');
  assert.deepEqual(prefix.diagnosis.focus, { atoms: [oxygen.attachment], bonds: [oxygen.bond] });
  assert.deepEqual(prefix.diagnosis.tiles, [0, 2], '«2-hidroxi»');
  // MORE_HYDROXY_GROUPS: another chain of three carbons; the focus is the parent's part outside the student's chain.
  const more = read('2-(hidroximetil)propan-1-ol');
  const outside = more.naming.parent.atoms.filter((id) => !more.studentParent.atoms.includes(id));
  assert.equal(outside.length, 1, 'the carbon of the hidroximetil branch');
  assert.deepEqual(more.diagnosis.focus.atoms, outside);
  assert.deepEqual(diagnosisLegend(more.diagnosis).map((e) => e.text), ['Cadena principal', 'Tu cadena']);
  // HYDROXY_PARENT, the ring for a chain: the student's one-carbon chain apart from the ring; the tiles of the ring branch.
  const ring = read('(4-hidroxiciclohexil)metanol');
  const d = ring.diagnosis;
  assert.deepEqual([d.student.atoms.length, d.parent.atoms.length, d.parent.bonds.length], [1, 6, 6]);
  assert.ok(!d.parent.atoms.some((id) => d.student.atoms.includes(id)));
  assert.deepEqual(d.focus, d.parent, 'the whole ring');
  assert.deepEqual(d.tiles, [0, 7], '«(4-hidroxiciclohexil)»');
  assert.deepEqual(diagnosisLegend(d).map((e) => e.text), ['Cadena principal (el anillo)', 'Tu cadena']);
  // HYDROXY_PARENT, the reverse: the student's ring beside the two-carbon chain, the tiles of the chain branch.
  const chain = read('(2-hidroxietil)ciclohexano').diagnosis;
  assert.deepEqual([chain.student.atoms.length, chain.student.bonds.length, chain.parent.atoms.length], [6, 6, 2]);
  assert.ok(!chain.parent.atoms.some((id) => chain.student.atoms.includes(id)));
  assert.deepEqual(chain.tiles, [0, 6], '«(2-hidroxietil)»');
  assert.deepEqual(diagnosisLegend(chain).map((e) => e.text), ['Cadena principal', 'Tu anillo']);
  // PHENOL: the parent word and the suffix; OLD_STYLE: the old-style locant; NEEDLESS_LOCANTS: the suffix's locant.
  assert.deepEqual(read('4-metilbencen-1-ol').diagnosis.tiles, [3, 6], '«benceno», «1», «ol»');
  assert.deepEqual(read('2-propanol').diagnosis.tiles, [0, 1]);
  assert.deepEqual(read('etan-1-ol').diagnosis.tiles, [2, 3]);
}); // End of test 'the student's chain beside the parent…'

test('RING_IS_PARENT never speaks of an alcohol: the OH groups decide between the ring and a chain, both ways', () => {
  for (const name of ['(4-hidroxifenil)metano', '1-(4-hidroxifenil)propano', '(4-hidroxiciclohexil)metanol',
    '2-(2-hidroxiciclohexil)etan-1-ol', '(2-hidroxietil)ciclohexano', '(1-hidroxipropil)benceno', '1-(2-hidroxifenil)-2-metilpropano']) {
    const d = read(name).diagnosis;
    assert.ok(d, `${name}: no diagnosis`);
    assert.equal(d.code, 'HYDROXY_PARENT', `${name}: ${d.message}`);
    assert.doesNotMatch(d.message, /manda siempre/, name);
  }
  // A hydrocarbon keeps RING_IS_PARENT (a ring is always the parent there).
  assert.equal(read('1-(4-metilfenil)propano').diagnosis.code, 'RING_IS_PARENT');
  assert.equal(read('1-ciclohexilpropano').diagnosis.code, 'RING_IS_PARENT');
}); // End of test 'RING_IS_PARENT never speaks of an alcohol…'

test('the step «Ver el paso» opens explains the alcohol rule the message states', () => {
  /**
   * The text of the step «Ver el paso» opens for a name.
   *
   * @param {string} name - A name.
   * @returns {string} The step's paragraphs, joined.
   */
  const opened = (name) => {
    const explanation = diagnosisExplanation(read(name), explain);
    return explanation.steps[explanation.index].text.join(' ');
  };
  assert.match(opened('2-hidroxipropano'), /se nombra con el \[\[sufijo\]\] «-ol»/);
  assert.match(opened('bencenol'), /sería «bencenol», que no se usa/);
  assert.match(opened('(2-hidroxietil)ciclohexano'), /mayor número posible de grupos –OH\. Solo si hay empate manda el anillo/);
  assert.match(opened('(4-hidroxifenil)metano'), /grupo –OH: es el \[\[grupo principal\]\], así que el nombre acaba en «fenol»/);
  assert.match(opened('2-(hidroximetil)propan-1-ol'), /el mayor número posible de grupos –OH/);
  assert.match(opened('butan-3-ol'), /los grupos –OH \(el \[\[grupo principal\]\]\) deben tener los/);
  assert.match(opened('etan-1-ol'), /En «etanol» no hace falta el número/);
}); // End of test 'the step «Ver el paso» opens explains the alcohol rule…'

test('a chain P0 drops however lengthened is MORE_HYDROXY_GROUPS, not BRANCH_AT_END (I-51a3b review)', () => {
  /**
   * The MORE_HYDROXY_GROUPS message.
   *
   * @param {number} app - The OH groups of the chains P0 keeps.
   * @param {number} student - The OH groups of the student's chain.
   * @returns {string} The message.
   */
  const more = (app, student) => `Hay otra cadena con más grupos –OH (${app}; la tuya tiene ${student}). La cadena principal es la `
    + 'que lleva más grupos –OH, aunque no sea la más larga.';
  /**
   * Tells whether a trace candidate holds every atom of the student's chain (the chain itself, or it lengthened).
   *
   * @param {{atoms: number[]}} c - A trace candidate.
   * @param {number[]} atoms - The student's chain.
   * @returns {boolean} True when the candidate contains the chain.
   */
  const contains = (c, atoms) => atoms.every((id) => c.atoms.includes(id));
  // [name, the engine's name, message]: the student's chain is no leaf-to-leaf path (a branch on an end carbon), and no
  // chain P0 keeps contains it: lengthened through its end it still carries fewer OH groups; also with a ring beside the
  // chain (RINGCHAIN).
  for (const [name, engine, message] of [
    ['1-metil-2-(hidroximetil)hexan-1-ol', '2-butilbutano-1,3-diol', more(2, 1)],
    ['1-etil-2-(hidroximetil)butan-1-ol', '2-etilpentano-1,3-diol', more(2, 1)],
    ['1-metil-2-(hidroximetil)butano', '2-etilbutan-1-ol', more(1, 0)],
    ['3-ciclohexil-1-metil-2-(hidroximetil)propan-1-ol', '2-(ciclohexilmetil)butano-1,3-diol', more(2, 1)],
  ]) {
    const verdict = read(name);
    const step = assertAlcoholDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.equal(verdict.name, engine, name);
    const p0 = diagnosisNaming(verdict).trace.find((s) => s.rule === 'P0');
    const student = sorted(d.student.atoms).join();
    assert.ok(!p0.candidatesBefore.some((c) => sorted(c.atoms).join() === student), `${name}: no leaf-to-leaf path`);
    assert.ok(!p0.survivors.some((c) => contains(c, d.student.atoms)), `${name}: dropped at P0 however lengthened`);
    assert.deepEqual([d.code, d.traceRule, d.message], ['MORE_HYDROXY_GROUPS', 'P0', message], name);
    // «Ver el paso» opens the OH-count rule the message states.
    assert.equal(step.id, 'groupChain', name);
    assert.match(step.text.join(' '), /el mayor número posible de grupos –OH/, name);
  } // End of the loop over the chains P0 drops
  assert.ok(diagnosisNaming(read('3-ciclohexil-1-metil-2-(hidroximetil)propan-1-ol')).trace.some((s) => s.rule === 'RINGCHAIN'));
  // Controls: a chain P0 keeps contains the student's, lengthened by the branch on its end (BRANCH_AT_END, P1) — with as
  // many OH groups, or with the missing OH in that branch (`1-(hidroximetil)propan-1-ol`: the molecule's one chain, which
  // the step «Ver el paso» opens shows, never «otra cadena con más grupos –OH»); as for a hydrocarbon and a halogen derivative.
  for (const [name, length] of [['1-metilpropan-2-ol', 4], ['1-etilbutan-1-ol', 6], ['1-metilbutano-1,2-diol', 5],
    ['1-(hidroximetil)propan-1-ol', 4], ['1-(hidroximetil)-2-metilpropan-1-ol', 4], ['1-metilpropano', 4],
    ['1-cloro-1-metilpropano', 4]]) {
    const verdict = read(name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule], ['BRANCH_AT_END', 'P1'], `${name}: ${d.message}`);
    assert.match(d.message, new RegExp(`la cadena principal tiene ${length} carbonos\\.$`), name);
    const p0 = diagnosisNaming(verdict).trace.find((s) => s.rule === 'P0');
    assert.ok(!p0 || p0.survivors.some((c) => contains(c, d.student.atoms)), `${name}: a chain P0 keeps contains the student's`);
  } // End of the loop over the controls
  const opened = diagnosisExplanation(read('1-(hidroximetil)propan-1-ol'), explain);
  assert.match(opened.steps[opened.index].text.join(' '), /^Todos los carbonos forman una sola cadena, sin ramas\./);
}); // End of test 'a chain P0 drops however lengthened…'

/**
 * The tile ids of a name with the OH groups of its suffix written as
 * `hidroxi` prefixes in front (`propan-2-ol` → `2-hidroxipropano`,
 * `butano-1,4-diol` → `1,4-dihidroxibutano`), or null for a name whose OH
 * groups the parent's word places (`fenol`, the retained phenols).
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asHydroxyPrefixes(ids) {
  const { suffix } = parse(ids).tree.parent;
  if (!suffix) {
    return null;
  }
  const prefix = [...suffix.locants.map((p) => ids[p]), ...(suffix.multiplier === null ? [] : [ids[suffix.multiplier]]), HYDROXY_ID];
  return [...prefix, ...ids.slice(0, suffix.range[0]), ...ids.slice(suffix.range[1])];
}

/**
 * The tile ids of a name with its suffix's locants moved before the
 * parent's root, the old style (`propan-2-ol` → `2-propanol`), or null
 * when the suffix has no locants or the parent has multiple bonds (two
 * lists the old-style locants could belong to: LEGACY, `invalid`).
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asOldStyle(ids) {
  const { parent } = parse(ids).tree;
  const { suffix, chain } = parent;
  if (!suffix || suffix.locants.length === 0 || (chain.segments || []).length > 0) {
    return null;
  }
  const [first, last] = [suffix.locants[0], suffix.locants[suffix.locants.length - 1]];
  return [...ids.slice(0, parent.range[0]), ...ids.slice(first, last + 1), ...ids.slice(parent.range[0], first), ...ids.slice(last + 1)];
}

/** How many alcohol fixture names have a suffix (its OH groups rewritten as `hidroxi`), and how many have suffix locants. */
const SWEEP_COUNTS = Object.freeze({ hydroxy: 100, oldStyle: 72 });

test('a sweep over the alcohol fixture names: the suffix as `hidroxi` prefixes is HYDROXY_PREFIX; its locants in the old style, OLD_STYLE', async () => {
  const names = (await readFixtures()).filter((row) => isAlcohol(row.smiles)).flatMap((row) => row.names).filter(isAlcoholName);
  const counts = { hydroxy: 0, oldStyle: 0 };
  for (const name of names) {
    const ids = tokenize(name);
    for (const [kind, rewrite, code] of [['hydroxy', asHydroxyPrefixes, 'HYDROXY_PREFIX'], ['oldStyle', asOldStyle, 'OLD_STYLE']]) {
      const mutated = rewrite(ids);
      if (!mutated) {
        continue;
      }
      counts[kind] += 1;
      const verdict = readName(mutated);
      const label = `${name} → ${verdict.text}`;
      assert.equal(verdict.kind, 'otherName', `${label}: ${verdict.message}`);
      assert.equal(verdict.name, readName(ids).name, `${label}: the same molecule`);
      assertAlcoholDiagnosis(verdict, label);
      assert.equal(verdict.diagnosis.code, code, `${label}: ${verdict.diagnosis.message}`);
      // The name quoted is the engine's in the student's prefix style (`3-(propan-2-il)heptan-2-ol`, not `3-isopropil…`).
      const quoted = diagnosisNaming(verdict).name;
      assert.ok(verdict.diagnosis.message.endsWith(`«${quoted}».`), `${label}: ${verdict.diagnosis.message}`);
    } // End of the loop over the two rewritings
  } // End of the loop over the names
  assert.deepEqual(counts, { ...SWEEP_COUNTS });
}); // End of test 'a sweep over the alcohol fixture names…'

test('controls: correct alcohol names have no diagnosis; a mistake the rules above name stays theirs', () => {
  for (const name of ['propan-2-ol', 'butan-2-ol', 'etano-1,2-diol', 'fenol', '4-metilfenol', 'ciclohexanol', 'benceno-1,2,4-triol',
    '2-ciclohexiletan-1-ol', '4-(hidroximetil)ciclohexan-1-ol', '1-fenilpropan-1-ol', '2-metilpropano-1,3-diol']) {
    const verdict = read(name);
    assert.equal(verdict.kind, 'correct', `${name}: ${verdict.message}`);
    assert.ok(!('diagnosis' in verdict), name);
  }
  // The rules of phase I-51a2 keep their codes beside the new ones.
  for (const [name, code] of [['pent-4-en-3-ol', 'NUMBERING'], ['6-metilciclohexan-1-ol', 'RING_NUMBERING'],
    ['1-metilpropan-2-ol', 'BRANCH_AT_END'], ['butano-4,1-diol', 'LOCANT_ORDER'], ['1,1,1-triclorometanol', 'NEEDLESS_LOCANTS'],
    ['3-buten-2-ol', 'OLD_STYLE'], ['4-clorocatecol', 'SUBSTITUTED_TEMPLATE']]) {
    const verdict = read(name);
    assertAlcoholDiagnosis(verdict, name);
    assert.equal(verdict.diagnosis.code, code, `${name}: ${verdict.diagnosis.message}`);
  }
  // A segment's old-style locants keep «eno» o «ino».
  assert.match(read('3-buten-2-ol').diagnosis.message, /justo delante de «eno» o «ino»: «but-3-en-2-ol»\.$/);
}); // End of test 'controls…'

test('the drafts of the alcohol rules: their place among the rules, their steps, every variant renders', () => {
  assert.deepEqual(ALCOHOL_CODES.map((code) => [DIAGNOSES[code].rule, DIAGNOSES[code].step]),
    [[1, 'group'], [1, 'ringChain'], [2, 'groupChain'], [2, 'group']]);
  // Each beside the rule whose place it takes: before BRANCH_AT_END, after LONGER_CHAIN, after SUBSTITUTED_TEMPLATE (the
  // aldehyde and ketone codes of phase I-51c3b1 and the acid codes of phase I-51d3, beside them, left out:
  // reverse-diagnose-carbonyls.test.js, reverse-diagnose-acids.test.js).
  assert.deepEqual(DIAGNOSIS_CODES.filter((code) => !/CARBONYL|ALDEHYDE|ACID/.test(code)).slice(0, 9), ['HYDROXY_PREFIX',
    'HYDROXY_PARENT', 'BRANCH_AT_END', 'RING_IS_PARENT', 'MORE_HYDROXY_GROUPS', 'LONGER_CHAIN', 'BENZENE_RING',
    'SUBSTITUTED_TEMPLATE', 'PHENOL']);
  for (const code of ALCOHOL_CODES) {
    const text = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    assert.match(text, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(text, /undefined|null|NaN/, code);
    assert.ok(STEP_FALLBACKS[DIAGNOSES[code].step], `${code}: a known step`);
  }
  assert.deepEqual([...STEP_FALLBACKS.group], ['count']);
  assert.deepEqual([...STEP_FALLBACKS.groupChain], ['chain', 'count']);
  assert.deepEqual([...STEP_FALLBACKS.ringChain], ['ring', 'benzene', 'groupChain']);
  // The variants of the shared codes: N0 phrases, the suffix of OLD_STYLE, the OH groups of NEEDLESS_LOCANTS.
  assert.equal(DIAGNOSIS_PHRASES.numberingReasons.N0, 'los grupos –OH (el grupo principal) tienen que llevar los números más bajos');
  assert.equal(DIAGNOSIS_PHRASES.lowerLocantsOf.N0, 'los grupos –OH');
  assert.equal(DIAGNOSIS_TEXTS.OLD_STYLE({ name: 'propan-2-ol', suffix: 'ol' }), 'Has escrito los números delante de la raíz, como '
    + 'se hacía antes. Hoy van detrás, justo delante de «ol»: «propan-2-ol».');
  assert.equal(DIAGNOSIS_TEXTS.NEEDLESS_LOCANTS({ branch: false, kept: false, name: 'butano-1,4-diol', what: DIAGNOSIS_PHRASES.what.hydroxys }),
    'En «butano-1,4-diol» no se escriben números: solo hay una manera de colocar los grupos –OH.');
  // The three ways the ring and the chain compare.
  assert.equal(DIAGNOSIS_PHRASES.hydroxyChoice({ ring: 3, chain: 3, chainParent: false }),
    'el anillo y la mejor cadena llevan 3 cada uno, así que gana el anillo');
  assert.equal(DIAGNOSIS_PHRASES.hydroxyChoice({ ring: 1, chain: 0, chainParent: false }),
    'el anillo lleva uno y las cadenas no llevan ninguno, así que gana el anillo');
  assert.equal(DIAGNOSIS_PHRASES.hydroxyChoice({ ring: 0, chain: 2, chainParent: true }),
    'el anillo no lleva ninguno y la mejor cadena, 2, así que gana la cadena y el anillo va en una rama');
}); // End of test 'the drafts of the alcohol rules…'
