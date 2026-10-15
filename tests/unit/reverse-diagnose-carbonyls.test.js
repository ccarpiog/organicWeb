/**
 * @file Unit tests for the aldehyde and ketone diagnoses of «¿Cómo se
 * dibuja?» (src/reverse/diagnose.js header «Aldehydes and ketones»,
 * design.md §13.4 I-32, I-40a, I-40b, §15.8 R-5c; phase I-51c3b1, R-5c3b1):
 * one case per principal-group mistake that phases I-51c1, I-51c2 and
 * I-51c3a left as a deliberate null — the student's suffix a junior group's
 * (CARBONYL_SENIORITY), an `al` on a carbon a branch makes a ketone's
 * (KETONE_NOT_ALDEHYDE), the –CHO's carbon on the other side of the parent
 * (ALDEHYDE_CARBON), the principal C=O written as a prefix (`oxo`, `formil`,
 * an acyl prefix: CARBONYL_PREFIX), the ring against a chain decided by the
 * C=O groups (CARBONYL_PARENT), another chain with more C=O groups
 * (MORE_CARBONYL_GROUPS, P0), the C=O groups numbered otherwise (N0:
 * NUMBERING, RING_NUMBERING, CHAIN_LOCANTS) and the suffix's needless
 * locants (NEEDLESS_LOCANTS) — each with its code, trace rule, message and
 * the step «Ver el paso» opens; the student's chain beside the parent, the
 * focus and the tiles; the explanation step each opens says the rule; the
 * ether side told from the C=O groups; a sweep over the carbonyl fixture
 * names (every suffix rewritten as `oxo` or `formil` prefixes); the
 * deliberate nulls left to phase I-51c3b2; controls; the drafts.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { OXO_ID, FORMYL_ID, AL_ID, ONA_ID, CARBALDEHYDE_ID, tileId } from '../../src/reverse/tiles.js';
import {
  diagnosisNaming, diagnosisExplanation, DIAGNOSES, DIAGNOSIS_CODES, DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES, STEP_FALLBACKS,
} from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { diagnosisLegend } from '../../src/ui/draw-name.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { seq, readFixtures, isCarbonyl, isCarbonylName } from './reverse-words.js';

/** The codes only an aldehyde or a ketone gives (diagnose.js header «Aldehydes and ketones»). */
const CARBONYL_CODES = Object.freeze(['CARBONYL_SENIORITY', 'KETONE_NOT_ALDEHYDE', 'ALDEHYDE_CARBON', 'CARBONYL_PREFIX',
  'CARBONYL_PARENT', 'MORE_CARBONYL_GROUPS']);

/**
 * Reads a name text (the tokenizer gives its tiles) or space-separated tile
 * words (reverse-words.js).
 *
 * @param {string} name - A name or tile words.
 * @returns {object} The verdict.
 */
function read(name) {
  const ids = tokenize(name) || seq(name);
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
 * Asserts the invariants of a diagnosed `otherName` verdict of an aldehyde or
 * a ketone: a known code with its rule; a Spanish message with every blank
 * filled, which speaks of OH groups only when an OH is the student's junior
 * group (CARBONYL_SENIORITY, «el –OH»); a JSON-safe object; atom and bond ids
 * of the verdict's molecule; the student's chain — or ring, its closing bond
 * last — a path of bonds; the app's parent the naming's (in the diagnosis's
 * style); a step that diagnosisExplanation() resolves and opens.
 *
 * @param {object} verdict - An `otherName` verdict with a diagnosis.
 * @param {string} label - Assertion label.
 * @returns {object} The explanation step «Ver el paso» opens.
 */
function assertCarbonylDiagnosis(verdict, label) {
  const d = verdict.diagnosis;
  assert.equal(verdict.kind, 'otherName', label);
  assert.ok(d, `${label}: no diagnosis`);
  assert.ok(DIAGNOSES[d.code], `${label}: ${d.code}`);
  if (d.code !== 'ETHER_SIDE') {
    assert.equal(d.rule, DIAGNOSES[d.code].rule, label); // ETHER_SIDE keeps the rule of the draft it replaces.
  }
  assert.ok(d.message.length > 0 && !/undefined|null|NaN|\[object|grupo –OH|grupos –OH/.test(d.message), `${label}: ${d.message}`);
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
} // End of function assertCarbonylDiagnosis()

/** The seniority sentence CARBONYL_SENIORITY starts with. */
const SENIORITY = 'Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: aldehído > cetona > '
  + 'alcohol. Aquí manda ';

/** The first sentence of KETONE_NOT_ALDEHYDE. */
const ALDEHYDE_END = 'El grupo –CHO de un aldehído va en un extremo de la cadena: su carbono solo puede unirse a un carbono más. Aquí ';

/** The ring-or-chain rule as the CARBONYL_PARENT message states it, before the counts. */
const RING_OR_CHAIN = (groups) => `La cadena principal es la que lleva más ${groups}, sea el anillo o una cadena abierta; solo si `
  + 'empatan manda el anillo. Aquí ';

/**
 * One case per aldehyde or ketone mistake (the former deliberate nulls of
 * I-51c1, I-51c2 and I-51c3a): [name, code, trace rule, the step «Ver el
 * paso» opens, message].
 */
const CASES = [
  // 1. The student's suffix is a junior group's: the order, the principal group and how it is written.
  ['5-oxopentan-2-ona', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}el aldehído (–CHO), que se nombra con la terminación `
    + '«-al», al final del nombre; el C=O de la cetona va delante, con el prefijo «oxo». Se escribe «4-oxopentanal».'],
  ['4-oxopentan-2-ol', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}la cetona (C=O), que se nombra con la terminación «-ona», `
    + 'al final del nombre; el –OH va delante, con el prefijo «hidroxi». Se escribe «4-hidroxipentan-2-ona».'],
  ['4-formilfenol', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}el aldehído (–CHO), que se nombra con «benzaldehído» (el `
    + 'benceno con un grupo –CHO); el –OH va delante, con el prefijo «hidroxi». Se escribe «4-hidroxibenzaldehído».'],
  // The ketone's carbon lands in an acyl branch of the engine's chain: no `oxo` to name.
  ['3-formilhexan-2-ona', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}el aldehído (–CHO), que se nombra con la terminación `
    + '«-al», al final del nombre; el C=O de la cetona va delante, en los prefijos. Se escribe «2-acetilpentanal».'],
  // 2. `al` on a carbon a branch bonds to a second carbon: a ketone.
  ['1-metilpropanal', 'KETONE_NOT_ALDEHYDE', null, 'group', `${ALDEHYDE_END}la rama «metil» está en el carbono 1, que así queda `
    + 'unido a dos carbonos: su C=O es el de una cetona, no el de un aldehído. Se escribe «butan-2-ona».'],
  ['1-acetilhexanal', 'KETONE_NOT_ALDEHYDE', null, 'group', `${ALDEHYDE_END}la rama «acetil» está en el carbono 1, que así queda `
    + 'unido a dos carbonos: su C=O es el de una cetona, no el de un aldehído. Se escribe «octano-2,3-diona».'],
  ['1-metilbutanodial', 'KETONE_NOT_ALDEHYDE', null, 'group', `${ALDEHYDE_END}la rama «metil» está en el carbono 1, que así queda `
    + 'unido a dos carbonos: su C=O es el de una cetona, no el de un aldehído. Se escribe «4-oxopentanal».'],
  ['1-(4-metilfenil)acetaldehído', 'KETONE_NOT_ALDEHYDE', null, 'group', `${ALDEHYDE_END}la rama «4-metilfenil» está en el carbono `
    + '1, que así queda unido a dos carbonos: su C=O es el de una cetona, no el de un aldehído. Se escribe '
    + '«1-(4-metilfenil)etan-1-ona».'],
  // 3. The –CHO's carbon on the other side of the parent: `carbaldehído` on a chain; the –CHO's carbon as the chain beside a ring.
  ['butano-1-carbaldehído', 'ALDEHYDE_CARBON', null, 'group', 'La terminación «-carbaldehído» solo se usa cuando el grupo –CHO '
    + 'está unido a un anillo. En una cadena, el carbono del –CHO es un carbono más de la cadena principal, siempre en un extremo, '
    + 'y el grupo se nombra con la terminación «-al», al final del nombre. Se escribe «pentanal».'],
  ['butano-1,4-dicarbaldehído', 'ALDEHYDE_CARBON', null, 'group', 'La terminación «-carbaldehído» solo se usa cuando el grupo –CHO '
    + 'está unido a un anillo. En una cadena, el carbono del –CHO es un carbono más de la cadena principal, siempre en un extremo, '
    + 'y el grupo se nombra con la terminación «-dial», al final del nombre. Se escribe «hexanodial».'],
  ['ciclohexilformaldehído', 'ALDEHYDE_CARBON', null, 'group', 'Cuando el grupo –CHO está unido a un anillo, su carbono no forma '
    + 'parte del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra con la terminación '
    + '«-carbaldehído», al final del nombre. Se escribe «ciclohexanocarbaldehído».'],
  ['ciclohexilmetanal', 'ALDEHYDE_CARBON', null, 'group', 'Cuando el grupo –CHO está unido a un anillo, su carbono no forma parte '
    + 'del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra con la terminación '
    + '«-carbaldehído», al final del nombre. Se escribe «ciclohexanocarbaldehído».'],
  ['fenilformaldehído', 'ALDEHYDE_CARBON', null, 'group', 'Cuando el grupo –CHO está unido a un anillo, su carbono no forma parte '
    + 'del anillo ni es una cadena aparte: la cadena principal es el anillo, y el grupo se nombra con «benzaldehído» (el benceno '
    + 'con un grupo –CHO). Se escribe «benzaldehído».'],
  // 4. The principal C=O written as a prefix of the student's parent: `oxo`, `formil`, an acyl prefix (whose carbon joins the chain).
  ['2-oxopropano', 'CARBONYL_PREFIX', null, 'group', 'El grupo C=O es el grupo principal: se nombra con la terminación «-ona», al '
    + 'final del nombre, no con el prefijo «oxo». Se escribe «propanona».'],
  ['oxociclohexano', 'CARBONYL_PREFIX', null, 'group', 'El grupo C=O es el grupo principal: se nombra con la terminación «-ona», al '
    + 'final del nombre, no con el prefijo «oxo». Se escribe «ciclohexanona».'],
  ['formilciclohexano', 'CARBONYL_PREFIX', null, 'group', 'El grupo –CHO es el grupo principal: se nombra con la terminación '
    + '«-carbaldehído», al final del nombre, no con el prefijo «formil». Se escribe «ciclohexanocarbaldehído».'],
  ['formilbenceno', 'CARBONYL_PREFIX', null, 'group', 'El grupo –CHO es el grupo principal: se nombra con «benzaldehído» (el '
    + 'benceno con un grupo –CHO), no con el prefijo «formil». Se escribe «benzaldehído».'],
  ['5-oxopentanal', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –CHO son el grupo principal: los de la cadena principal se '
    + 'nombran todos juntos con la terminación «-dial», al final del nombre, no con el prefijo «oxo». Se escribe «pentanodial».'],
  ['oxoacetaldehído', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –CHO son el grupo principal: los de la cadena principal se '
    + 'nombran todos juntos con la terminación «-dial», al final del nombre, no con el prefijo «oxo». Se escribe «etanodial».'],
  ['4-oxociclohexan-1-ona', 'CARBONYL_PREFIX', null, 'group', 'Los grupos C=O son el grupo principal: los del anillo se nombran '
    + 'todos juntos con la terminación «-diona», al final del nombre, no con el prefijo «oxo». Se escribe «ciclohexano-1,4-diona».'],
  ['1,3-diformilciclohexano', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –CHO son el grupo principal: los unidos al anillo se '
    + 'nombran todos juntos con la terminación «-dicarbaldehído», al final del nombre, no con el prefijo «formil». Se escribe '
    + '«ciclohexano-1,3-dicarbaldehído».'],
  ['2-formilbutano', 'CARBONYL_PREFIX', null, 'group', 'El grupo –CHO es el grupo principal: se nombra con la terminación «-al», al '
    + 'final del nombre, no con el prefijo «formil». Su carbono entra en la cadena principal. Se escribe «2-metilbutanal».'],
  ['acetilbenceno', 'CARBONYL_PREFIX', null, 'group', 'El grupo C=O es el grupo principal: se nombra con la terminación «-ona», al '
    + 'final del nombre, no dentro del prefijo «acetil». Su carbono entra en la cadena principal, y el anillo pasa a ser una rama. '
    + 'Se escribe «1-feniletan-1-ona».'],
  ['butanoilciclohexano', 'CARBONYL_PREFIX', null, 'group', 'El grupo C=O es el grupo principal: se nombra con la terminación '
    + '«-ona», al final del nombre, no dentro del prefijo «butanoil». Su carbono entra en la cadena principal, y el anillo pasa a '
    + 'ser una rama. Se escribe «1-ciclohexilbutan-1-ona».'],
  ['4-acetiltolueno', 'CARBONYL_PREFIX', null, 'group', 'El grupo C=O es el grupo principal: se nombra con la terminación «-ona», '
    + 'al final del nombre, no dentro del prefijo «acetil». Su carbono entra en la cadena principal, y el anillo pasa a ser una '
    + 'rama. Se escribe «1-(4-metilfenil)etan-1-ona».'],
  ['2-acetilpentano', 'CARBONYL_PREFIX', null, 'group', 'El grupo C=O es el grupo principal: se nombra con la terminación «-ona», '
    + 'al final del nombre, no dentro del prefijo «acetil». Su carbono entra en la cadena principal. Se escribe '
    + '«3-metilhexan-2-ona».'],
  ['1-acetilpentano-2,4-diona', 'CARBONYL_PREFIX', null, 'group', 'Los grupos C=O son el grupo principal: los de la cadena '
    + 'principal se nombran todos juntos con la terminación «-triona», al final del nombre, no dentro del prefijo «acetil». Su '
    + 'carbono entra en la cadena principal. Se escribe «heptano-2,4,6-triona».'],
  // 5. The ring or a chain, decided by the C=O groups: a tie (the ring), every C=O on the ring, the chain.
  ['1-(2-oxociclohexil)propan-2-ona', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN('grupos C=O')}el anillo y la `
    + 'mejor cadena llevan uno cada uno, así que gana el anillo: «2-(2-oxopropil)ciclohexan-1-ona».'],
  ['(4-formilfenil)metano', 'CARBONYL_PARENT', 'RING', 'benzene', `${RING_OR_CHAIN('grupos –CHO')}el anillo lleva uno y las cadenas `
    + 'no llevan ninguno, así que gana el anillo: «4-metilbenzaldehído».'],
  ['(2-oxoetil)ciclohexano', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN('grupos –CHO')}el anillo no lleva `
    + 'ninguno y la mejor cadena, uno, así que gana la cadena y el anillo va en una rama: «2-ciclohexiletanal».'],
  // 6. Another chain with more C=O groups (P0), also a chain with no C=O at all.
  ['3-(2-oxopropil)hexan-2-ona', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos C=O (2; la tuya tiene '
    + '1). La cadena principal es la que lleva más grupos C=O, aunque no sea la más larga.'],
  ['2-(2-oxoetil)propanal', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos –CHO (2; la tuya tiene 1). '
    + 'La cadena principal es la que lleva más grupos –CHO, aunque no sea la más larga.'],
  ['3-(2-oxoetil)pentano', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos –CHO (1; la tuya tiene 0). '
    + 'La cadena principal es la que lleva más grupos –CHO, aunque no sea la más larga.'],
  ['(4-acetilfenil)metano', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos C=O (1; la tuya tiene 0). '
    + 'La cadena principal es la que lleva más grupos C=O, aunque no sea la más larga.'],
  // 7. The C=O groups numbered otherwise (N0): the chain, the ring, benzene, a whole chain.
  ['pentan-4-ona', 'NUMBERING', 'N0', 'numbering', 'Hay que numerar la cadena desde el otro extremo: los grupos C=O (el grupo '
    + 'principal) tienen que llevar los números más bajos (2 en vez de 4).'],
  ['hexano-3,5-diona', 'NUMBERING', 'N0', 'numbering', 'Hay que numerar la cadena desde el otro extremo: los grupos C=O (el grupo '
    + 'principal) tienen que llevar los números más bajos (2 en vez de 3).'],
  ['ciclohexan-3-ona', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en otro '
    + 'carbono o contando hacia el otro lado: los grupos C=O (el grupo principal) tienen que llevar los números más bajos (1 en vez '
    + 'de 3). En «ciclohexanona» ese número ni siquiera se escribe.'],
  ['benceno-1,5-dicarbaldehído', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en '
    + 'otro carbono o contando hacia el otro lado: los grupos –CHO (el grupo principal) tienen que llevar los números más bajos (3 '
    + 'en vez de 5).'],
  ['5-acetilciclohexan-2-ona', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en '
    + 'otro carbono o contando hacia el otro lado: los grupos C=O (el grupo principal) tienen que llevar los números más bajos (1 '
    + 'en vez de 2).'],
  ['4-propanoilheptano-2,6-diona', 'CHAIN_LOCANTS', 'N0', 'numbering', 'Hay otra cadena igual de larga que, bien numerada, da '
    + 'números más bajos a los grupos C=O (5 en vez de 6): esa es la cadena principal.'],
  // 8. Needless suffix locants: the C=O group's words.
  ['ciclohexan-1-ona', 'NEEDLESS_LOCANTS', null, 'ringNumbering', 'En «ciclohexanona» no se escriben números: solo hay una manera '
    + 'de colocar el grupo C=O.'],
  ['ciclohexano-1-carbaldehído', 'NEEDLESS_LOCANTS', null, 'ringNumbering', 'En «ciclohexanocarbaldehído» no se escriben números: '
    + 'solo hay una manera de colocar el grupo –CHO.'],
  // 9. Old-style suffix locants already speak of the suffix's words (phase I-51c1).
  ['2-pentanona', 'OLD_STYLE', null, 'assemble', 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van detrás, '
    + 'justo delante de «ona»: «pentan-2-ona».'],
  ['2,4-pentanodiona', 'OLD_STYLE', null, 'assemble', 'Has escrito los números delante de la raíz, como se hacía antes. Hoy van '
    + 'detrás, justo delante de «diona»: «pentano-2,4-diona».'],
];

test('one case per aldehyde or ketone mistake: the code, its trace rule, the step «Ver el paso» opens and the message', () => {
  const seen = new Set();
  for (const [name, code, traceRule, opened, message] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.text, name, name);
    // An OH the student wrote as the suffix is named by CARBONYL_SENIORITY as «el –OH», never «grupo –OH».
    const step = assertCarbonylDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule], [code, traceRule], `${name}: ${d.message}`);
    assert.equal(step.id, opened, `${name}: the step «Ver el paso» opens`);
    assert.equal(d.message, message, name);
    seen.add(code);
  } // End of the loop over the cases
  assert.deepEqual(CARBONYL_CODES.filter((code) => !seen.has(code)), [], 'every carbonyl code has a case');
}); // End of test 'one case per aldehyde or ketone mistake…'

test('the student\'s chain beside the parent, what the message is about and its tiles', () => {
  // KETONE_NOT_ALDEHYDE: the student's three carbons beside the app's four; the focus is the C=O and the methyl; the `al` tile.
  const ketone = read('1-metilpropanal');
  const d = ketone.diagnosis;
  assert.deepEqual([d.student.atoms.length, d.parent.atoms.length], [3, 4]);
  const carbon = ketone.suffixAtoms[0];
  const branch = ketone.prefixAtoms[0];
  assert.deepEqual(sorted(d.focus.atoms), sorted([carbon.parentAtom, carbon.attachment, ...branch.atoms]));
  assert.deepEqual(sorted(d.focus.bonds), sorted([carbon.bond, branch.bond]));
  assert.deepEqual(d.tiles, [5, 6], '«al»');
  assert.deepEqual(diagnosisLegend(d).map((e) => e.text), ['Cadena principal', 'Tu cadena']);
  // CARBONYL_PREFIX: the student's chain is the parent; the focus is the `oxo` (its O and bond); its tiles.
  const prefix = read('2-oxopropano');
  const oxygen = prefix.prefixAtoms[0];
  assert.equal(prefix.molecule.atoms.get(oxygen.attachment).element, 'O');
  assert.deepEqual(prefix.diagnosis.focus, { atoms: [oxygen.attachment], bonds: [oxygen.bond] });
  assert.deepEqual(prefix.diagnosis.tiles, [0, 2], '«2-oxo»');
  assert.deepEqual(diagnosisLegend(prefix.diagnosis).map((e) => e.text), ['Cadena principal', 'Tu cadena (es la misma)']);
  // An acyl prefix on benzene: the student's ring beside the app's two-carbon chain; the focus is the acetyl, C=O included.
  const acyl = read('acetilbenceno').diagnosis;
  assert.deepEqual([acyl.student.atoms.length, acyl.student.bonds.length, acyl.parent.atoms.length], [6, 6, 2]);
  assert.equal(acyl.focus.atoms.length, 3, 'the acetyl\'s two carbons and its oxygen');
  assert.deepEqual(diagnosisLegend(acyl).map((e) => e.text), ['Cadena principal', 'Tu anillo']);
  // ALDEHYDE_CARBON: the –CHO's carbon was the student's whole chain; the app's parent is the ring; the template's tile.
  const outside = read('ciclohexilformaldehído').diagnosis;
  assert.deepEqual([outside.student.atoms.length, outside.parent.atoms.length], [1, 6]);
  assert.deepEqual(outside.tiles, [3, 4], '«formaldehído»');
  assert.deepEqual(diagnosisLegend(outside).map((e) => e.text), ['Cadena principal (el anillo)', 'Tu cadena']);
  // CARBONYL_SENIORITY: the student's ketone C=O; the suffix's tiles.
  const senior = read('5-oxopentan-2-ona');
  assert.deepEqual(senior.diagnosis.focus, { atoms: [senior.suffixAtoms[0].parentAtom, senior.suffixAtoms[0].attachment],
    bonds: [senior.suffixAtoms[0].bond] });
  assert.deepEqual(senior.diagnosis.tiles, [4, 6], '«2», «ona»');
  // CARBONYL_PARENT: the ring beside the student's chain; the tiles of the ring branch.
  const parent = read('1-(2-oxociclohexil)propan-2-ona').diagnosis;
  assert.ok(!parent.parent.atoms.some((id) => parent.student.atoms.includes(id)));
  assert.deepEqual(parent.tiles, [0, 8], '«1-(2-oxociclohexil)»');
  assert.deepEqual(diagnosisLegend(parent).map((e) => e.text), ['Cadena principal (el anillo)', 'Tu cadena']);
}); // End of test 'the student's chain beside the parent…'

test('the step «Ver el paso» opens explains the aldehyde or ketone rule the message states', () => {
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
  assert.match(opened('5-oxopentan-2-ona'), /aldehído > cetona > alcohol\. Aquí manda el aldehído/);
  assert.match(opened('4-oxopentan-2-ol'), /aldehído > cetona > alcohol\. Aquí manda la cetona/);
  assert.match(opened('1-metilpropanal'), /un carbono que está entre otros dos carbonos\. Es un \[\[grupo funcional\]\]: la molécula es una cetona/);
  assert.match(opened('butano-1-carbaldehído'), /siempre está en un extremo de la cadena\. Ese carbono es un carbono más de la cadena/);
  assert.match(opened('ciclohexilformaldehído'), /tampoco forma una cadena aparte: el anillo es la \[\[cadena principal\]\]/);
  assert.match(opened('2-oxopropano'), /El grupo C=O es el \[\[grupo principal\]\]: se nombra con el \[\[sufijo\]\] «-ona»/);
  assert.match(opened('acetilbenceno'), /El carbono del C=O es un carbono más de la cadena/);
  assert.match(opened('(2-oxoetil)ciclohexano'), /mayor número posible de grupos –CHO\. Solo si hay empate manda el anillo/);
  assert.match(opened('3-(2-oxopropil)hexan-2-ona'), /el mayor número posible de grupos C=O/);
  assert.match(opened('pentan-4-ona'), /los grupos C=O \(el \[\[grupo principal\]\]\) deben tener los/);
}); // End of test 'the step «Ver el paso» opens explains…'

test('ALDEHYDE_CARBON only for the engine\'s own –CHO groups; another –CHO on the other side is the parent choice (I-51c3b1 review)', () => {
  // [name, the engine's name, message]: the student's `al` ends a side chain while the engine's –CHO is the ring's (a tie, the
  // ring wins), and the student's ring `carbaldehído` beside a side chain with more –CHO groups (the chain wins).
  for (const [name, engine, message] of [
    ['2-(4-formilciclohexil)etanal', '4-(2-oxoetil)ciclohexano-1-carbaldehído', `${RING_OR_CHAIN('grupos –CHO')}el anillo y la `
      + 'mejor cadena llevan uno cada uno, así que gana el anillo: «4-(2-oxoetil)ciclohexano-1-carbaldehído».'],
    ['3-(4-formilciclohexil)propanal', '4-(3-oxopropil)ciclohexano-1-carbaldehído', `${RING_OR_CHAIN('grupos –CHO')}el anillo y `
      + 'la mejor cadena llevan uno cada uno, así que gana el anillo: «4-(3-oxopropil)ciclohexano-1-carbaldehído».'],
    ['4-(1,3-dioxopropan-2-il)ciclohexano-1-carbaldehído', '2-(4-formilciclohexil)propanodial', `${RING_OR_CHAIN('grupos –CHO')}`
      + 'el anillo lleva uno y la mejor cadena, 2, así que gana la cadena y el anillo va en una rama: '
      + '«2-(4-formilciclohexil)propanodial».'],
  ]) {
    const verdict = read(name);
    const step = assertCarbonylDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.equal(verdict.name, engine, name);
    assert.deepEqual([d.code, d.traceRule, step.id, d.message], ['CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', message], name);
    // The student's –CHO is not one of the engine's suffix groups.
    const carbons = diagnosisNaming(verdict).structure.suffix.locants.map((site) => (site.carbon === undefined ? site.atom : site.carbon));
    assert.ok(verdict.suffixAtoms.every((g) => !carbons.includes(g.carbon === undefined ? g.parentAtom : g.carbon)), name);
  } // End of the loop over the parent choices
  // The genuine cases, whose –CHO groups are the engine's own, keep ALDEHYDE_CARBON (with another –CHO on the ring too).
  for (const [name, engine] of [['butano-1-carbaldehído', 'pentanal'], ['ciclohexilformaldehído', 'ciclohexanocarbaldehído'],
    ['(4-formilciclohexil)metanal', 'ciclohexano-1,4-dicarbaldehído'], ['4-(3-oxopropil)butano-1-carbaldehído', 'octanodial']]) {
    const verdict = read(name);
    assertCarbonylDiagnosis(verdict, name);
    assert.deepEqual([verdict.name, verdict.diagnosis.code], [engine, 'ALDEHYDE_CARBON'], name);
    assert.ok(verdict.diagnosis.message.endsWith(`Se escribe «${engine}».`), name);
  }
}); // End of test 'ALDEHYDE_CARBON only for the engine's own –CHO groups…'

test('the ether side told from the C=O groups: ETHER_SIDE for CARBONYL_PARENT and MORE_CARBONYL_GROUPS', () => {
  const side = 'El oxígeno del éter (–O–) corta la molécula en dos lados, y la cadena principal no puede pasar por él: se busca en uno '
    + 'de los dos lados, con las reglas de siempre. Aquí la cadena principal está en el otro lado del oxígeno, no en el de tu cadena: '
    + 'primero cuenta el grupo principal, y en ese lado hay un grupo C=O y ';
  for (const [name, traceRule, tail] of [
    ['(2-oxopropoxi)metano', 'P0', 'en tu cadena, ninguno. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: '
      + '«1-metoxipropan-2-ona».'],
    ['(2-oxociclohexiloxi)metano', 'RING', 'en el tuyo, ninguno. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: '
      + '«2-metoxiciclohexan-1-ona».'],
  ]) {
    const verdict = read(name);
    assertCarbonylDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule, d.step], ['ETHER_SIDE', traceRule, 'ether'], name);
    assert.equal(d.message, `${side}${tail}`, name);
  } // End of the loop over the ether sides
  // The rule number is the replaced draft's: CARBONYL_PARENT's 1, MORE_CARBONYL_GROUPS's 2.
  assert.deepEqual(['(2-oxociclohexiloxi)metano', '(2-oxopropoxi)metano'].map((name) => read(name).diagnosis.rule), [1, 2]);
  // The phrase words each principal group as the explanation does, the OH groups unchanged.
  const phrase = (reason, data) => DIAGNOSIS_PHRASES.etherSide({ reason, ...data });
  assert.equal(phrase('MORE_CARBONYL_GROUPS', { group: 'aldehyde', app: 2, student: 0, studentRing: false }),
    'primero cuenta el grupo principal, y en ese lado hay 2 grupos –CHO y en tu cadena, ninguno');
  assert.equal(phrase('CARBONYL_PARENT', { group: 'ketone', ring: 1, chain: 1, chainParent: false }),
    'primero cuenta el grupo principal, y los dos lados llevan un grupo C=O cada uno; en el empate, manda el anillo');
  assert.equal(phrase('MORE_HYDROXY_GROUPS', { app: 1, student: 0, studentRing: true }),
    'primero cuenta el grupo principal, y en ese lado hay un grupo –OH y en tu anillo, ninguno');
  assert.equal(phrase('CHAIN_LOCANTS', { rule: 'N0', group: 'ketone', app: '2', student: '3' }), 'las cadenas de los dos lados '
    + 'empatan en longitud, en enlaces múltiples y en sustituyentes, y la de ese lado, bien numerada, da números más bajos a los '
    + 'grupos C=O (2 en vez de 3)');
}); // End of test 'the ether side told from the C=O groups…'

/**
 * The tile ids of a name with the C=O groups of its suffix written as
 * prefixes in front, located where the name's own reading puts them (the
 * locants a name leaves out included): `ona` as `oxo` (`pentan-2-ona` →
 * `2-oxopentano`, `propanona` → `2-oxopropano`), `al` as `oxo` on the
 * chain's end carbons (`butanal` → `1-oxobutano`, `butanodial` →
 * `1,4-dioxobutano`), `carbaldehído` as `formil` (`ciclohexanocarbaldehído`
 * → `1-formilciclohexano`); null for a name whose C=O groups the parent's
 * word places (`benzaldehído`, the templates) or without a carbonyl suffix.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asCarbonylPrefixes(ids) {
  const { tree } = parse(ids);
  const { suffix, chain } = tree.parent;
  if (!suffix || chain.type !== 'chain') {
    return null;
  }
  const word = ids[suffix.range[1] - 1];
  if (![AL_ID, ONA_ID, CARBALDEHYDE_ID].includes(word)) {
    return null;
  }
  const locants = readName(ids).suffixAtoms.map((g) => g.locant).sort((p, q) => p - q).map((value) => tileId('num', value));
  const group = word === CARBALDEHYDE_ID ? FORMYL_ID : OXO_ID;
  const prefix = [...locants, ...(suffix.multiplier === null ? [] : [ids[suffix.multiplier]]), group];
  return [...prefix, ...ids.slice(0, suffix.range[0]), ...ids.slice(suffix.range[1])];
} // End of function asCarbonylPrefixes()

/** How many carbonyl fixture names have a suffix of `al`, `ona` or `carbaldehído` after a chain or `ciclo` ring. */
const SWEEP_COUNT = 77;

test('a sweep over the carbonyl fixture names: the suffix as `oxo` or `formil` prefixes is CARBONYL_PREFIX', async () => {
  const names = (await readFixtures()).filter((row) => isCarbonyl(row.smiles)).flatMap((row) => row.names).filter(isCarbonylName);
  let count = 0;
  for (const name of names) {
    const ids = tokenize(name);
    const mutated = asCarbonylPrefixes(ids);
    if (!mutated) {
      continue;
    }
    count += 1;
    const verdict = readName(mutated);
    const label = `${name} → ${verdict.text}`;
    assert.equal(verdict.kind, 'otherName', `${label}: ${verdict.message}`);
    assert.equal(verdict.name, readName(ids).name, `${label}: the same molecule`);
    assertCarbonylDiagnosis(verdict, label);
    assert.equal(verdict.diagnosis.code, 'CARBONYL_PREFIX', `${label}: ${verdict.diagnosis.message}`);
    // The name quoted is the engine's in the student's prefix style.
    assert.ok(verdict.diagnosis.message.endsWith(`«${diagnosisNaming(verdict).name}».`), `${label}: ${verdict.diagnosis.message}`);
  } // End of the loop over the names
  assert.equal(count, SWEEP_COUNT);
}); // End of test 'a sweep over the carbonyl fixture names…'

test('the deliberate nulls left to phase I-51c3b2: acyl words the engine does not write, a phenyl on `acetaldehído`', () => {
  for (const [words, engine] of [
    ['2 et ano oil hept ano al', '2-acetilheptanal'], // `etanoil` for `acetil`
    ['3 START 1 oxo et il END pent ano 2 4 di ona', '3-acetilpentano-2,4-diona'], // `(1-oxoetil)` for `acetil`
    ['2 START 1 oxo prop il END hept ano al', '2-propanoilheptanal'], // `(1-oxopropil)` for `propanoil`
    ['2 START 3 met il prop ano oil END hept ano al', '2-butanoilheptanal'], // the acyl's own chain
    ['2 START 2 et il prop ano oil END hept ano al', '2-(2-metilbutanoil)heptanal'],
    ['2 START 6 met il benzoil END hept ano al', '2-(2-metilbenzoil)heptanal'], // the benzoyl numbered otherwise
    ['2 START 6 met il ciclo hex ano 1 carbonil END hept ano al', '2-(2-metilciclohexano-1-carbonil)heptanal'],
    ['2 ciclo hex ano 2 carbonil hept ano al', '2-(ciclohexanocarbonil)heptanal'], // a free-valence locant other than 1
    ['2 ciclo hex 2 eno carbonil hept ano al', '2-(ciclohex-2-eno-1-carbonil)heptanal'], // the locant 1 left out
    ['2 fenil acetaldehído', '2-feniletanal'], // the locant the engine leaves out
    ['2 START 5 met il fenil END acetaldehído', '2-(3-metilfenil)etanal'], // the phenyl numbered otherwise
  ]) {
    const verdict = readName(seq(words));
    assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis], ['otherName', engine, null], words);
  }
}); // End of test 'the deliberate nulls left to phase I-51c3b2…'

test('controls: correct carbonyl names have no diagnosis; a mistake the earlier rules name stays theirs', () => {
  for (const name of ['butanal', 'pentan-2-ona', 'propanona', 'pentanodial', 'ciclohexanona', 'ciclohexanocarbaldehído',
    'benzaldehído', '4-oxopentanal', '4-hidroxipentan-2-ona', '1-feniletan-1-ona', '2-ciclohexiletanal',
    '2-(2-oxopropil)ciclohexan-1-ona', 'ciclohexano-1,4-diona', '2-oxociclohexano-1-carbaldehído']) {
    const verdict = read(name);
    assert.equal(verdict.kind, 'correct', `${name}: ${verdict.message}`);
    assert.ok(!('diagnosis' in verdict), name);
  }
  // The rules of phase I-51c1 keep their codes beside the new ones; N1–N4 after an N0 tie keep their own phrases.
  for (const [name, code] of [['1-metilpropan-1-ona', 'BRANCH_AT_END'], ['3-etilbutan-2-ona', 'LONGER_CHAIN'],
    ['4-metilpentan-3-ona', 'NUMBERING'], ['6-metilciclohexan-1-ona', 'RING_NUMBERING'], ['4-oxo-2-metilpentanal', 'ALPHABETICAL_ORDER'],
    ['pentano-4,2-diona', 'LOCANT_ORDER'], ['1-cloroacetona', 'SUBSTITUTED_TEMPLATE'], ['5-metilftalaldehído', 'RING_NUMBERING']]) {
    const verdict = read(name);
    assertCarbonylDiagnosis(verdict, name);
    assert.equal(verdict.diagnosis.code, code, `${name}: ${verdict.diagnosis.message}`);
  }
  assert.match(read('4-metilpentan-3-ona').diagnosis.message, /los sustituyentes tienen que llevar los números más bajos/);
  // An OH on the –CHO's carbon builds an acid, a later family's principal group: null.
  assert.equal(read('1 hidroxi prop ano al').diagnosis, null);
}); // End of test 'controls…'

test('the drafts of the aldehyde and ketone rules: their place among the rules, their steps, every variant renders', () => {
  assert.deepEqual(CARBONYL_CODES.map((code) => [DIAGNOSES[code].rule, DIAGNOSES[code].step]),
    [[1, 'group'], [1, 'group'], [1, 'group'], [1, 'group'], [1, 'ringChain'], [2, 'groupChain']]);
  // Beside the alcohol code whose place each takes: after HYDROXY_PREFIX, HYDROXY_PARENT, MORE_HYDROXY_GROUPS.
  const after = (code) => DIAGNOSIS_CODES[DIAGNOSIS_CODES.indexOf(code) - 1];
  assert.deepEqual(CARBONYL_CODES.map(after), ['HYDROXY_PREFIX', 'CARBONYL_SENIORITY', 'KETONE_NOT_ALDEHYDE', 'ALDEHYDE_CARBON',
    'HYDROXY_PARENT', 'MORE_HYDROXY_GROUPS']);
  for (const code of CARBONYL_CODES) {
    const text = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    assert.match(text, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(text, /undefined|null|NaN|–OH/, code);
  }
  const { carbonylN0, groupWords, junior, groupsOn, ending } = DIAGNOSIS_PHRASES;
  assert.deepEqual(carbonylN0.numberingReasons, {
    aldehyde: 'los grupos –CHO (el grupo principal) tienen que llevar los números más bajos',
    ketone: 'los grupos C=O (el grupo principal) tienen que llevar los números más bajos',
  });
  assert.deepEqual(carbonylN0.lowerLocantsOf, { aldehyde: 'los grupos –CHO', ketone: 'los grupos C=O' });
  assert.deepEqual(Object.keys(groupWords), ['alcohol', 'aldehyde', 'ketone']);
  // The OH groups keep their N0 phrases (phase I-51a3b).
  assert.equal(DIAGNOSIS_TEXTS.NUMBERING({ rule: 'N0', app: '2', student: '3', unwritten: false }), 'Hay que numerar la cadena '
    + 'desde el otro extremo: los grupos –OH (el grupo principal) tienen que llevar los números más bajos (2 en vez de 3).');
  assert.equal(DIAGNOSIS_TEXTS.CHAIN_LOCANTS({ rule: 'N0', group: 'aldehyde', app: '1', student: '2' }), 'Hay otra cadena igual '
    + 'de larga que, bien numerada, da números más bajos a los grupos –CHO (1 en vez de 2): esa es la cadena principal.');
  // The variants: several junior groups, KETONE_NOT_ALDEHYDE without a branch, CARBONYL_PREFIX on a ring and outside it.
  assert.deepEqual([...junior.ketone, ...junior.alcohol], ['el C=O de la cetona', 'cada C=O de cetona', 'el –OH', 'cada –OH']);
  assert.equal(DIAGNOSIS_TEXTS.CARBONYL_SENIORITY({ group: 'ketone', ending: 'diona', benzaldehyde: false, junior: 'alcohol',
    count: 2, prefix: 'hidroxi', name: 'X' }), `${SENIORITY}la cetona (C=O), que se nombra con la terminación «-diona», al final `
    + 'del nombre; cada –OH va delante, con el prefijo «hidroxi». Se escribe «X».');
  assert.equal(DIAGNOSIS_TEXTS.KETONE_NOT_ALDEHYDE({ branch: null, locant: 1, name: 'X' }), `${ALDEHYDE_END}el carbono 1 está `
    + 'unido a dos carbonos: su C=O es el de una cetona, no el de un aldehído. Se escribe «X».');
  assert.deepEqual(Object.values(groupsOn), ['los de la cadena principal', 'los del anillo', 'los unidos al anillo']);
  assert.equal(ending({ ending: 'al', benzaldehyde: false }), 'con la terminación «-al», al final del nombre');
  assert.equal(ending({ ending: 'carbaldehído', benzaldehyde: true }), 'con «benzaldehído» (el benceno con un grupo –CHO)');
  assert.deepEqual([DIAGNOSIS_PHRASES.what.aldehyde, DIAGNOSIS_PHRASES.what.ketones], ['el grupo –CHO', 'los grupos C=O']);
}); // End of test 'the drafts of the aldehyde and ketone rules…'
