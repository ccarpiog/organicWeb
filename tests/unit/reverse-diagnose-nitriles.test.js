/**
 * @file Unit tests for the nitrile diagnoses of «¿Cómo se dibuja?»
 * (src/reverse/diagnose.js header «Nitriles», design.md §13.4 I-38, I-39a,
 * I-40c, §15.8 R-6b; phase I-52b3, R-6b3): one case per nitrile mistake that
 * phases I-52b1 and I-52b2 left as a deliberate null — a principal –C≡N
 * written `ciano` (CARBONYL_PREFIX), a junior group as the suffix beside the
 * –C≡N (CARBONYL_SENIORITY with the seniority ácido > éster > amida > nitrilo
 * > aldehído > cetona > alcohol > amina, KETONE_NOT_ALDEHYDE for an `al` a
 * `ciano` makes a ketone's), a student's nitrile suffix beside an acid or an
 * ester (CARBONYL_SENIORITY, whose `ciano` takes the –C≡N's carbon out of the
 * chain), the –C≡N's carbon on the other side of the parent (NITRILE_CARBON,
 * the one new code), the ring against a chain decided by the –C≡N groups
 * (CARBONYL_PARENT), another chain with more –C≡N groups
 * (MORE_CARBONYL_GROUPS, P0, and its ether side), the –C≡N groups numbered
 * otherwise (N0, RING_NUMBERING) and the suffix's needless locants
 * (NEEDLESS_LOCANTS) — each with its code, trace rule, message and the step
 * «Ver el paso» opens; the student's chain beside the parent, the focus and
 * the tiles; the explanation step each opens says the rule; two sweeps over
 * the nitrile fixture names (every `carbonitrilo` and `benzonitrilo` written
 * as `ciano` prefixes, every `nitrilo` as `ciano` on the chain without the
 * –C≡N's carbon); MISSING_LOCANTS with the –C≡N groups' words; the one null
 * left (a student's nitrile suffix beside a principal group junior to it,
 * never built: a made-up naming); controls; the drafts.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { NITRILO_ID, CARBONITRILE_ID, BENZONITRILE_ID, CYANO_ID, tileId } from '../../src/reverse/tiles.js';
import {
  diagnose, diagnosisNaming, diagnosisExplanation, DIAGNOSES, DIAGNOSIS_CODES, DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES, STEP_FALLBACKS,
} from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { diagnosisLegend } from '../../src/ui/draw-name.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { SENIORITY } from '../../src/naming/seniority.js';
import { BENZENE_NAME } from '../../src/naming/lexicon.es.js';
import { seq, readFixtures, isNitrile, isNitrileName, isNitrileTemplateName } from './reverse-words.js';

/** The codes only a nitrile gives (diagnose.js header «Nitriles»). */
const NITRILE_CODES = Object.freeze(['NITRILE_CARBON']);

/** The codes a nitrile shares with the C=O groups, their words keyed by the –C≡N (diagnose.js «Nitriles»). */
const SHARED_CODES = Object.freeze(['CARBONYL_SENIORITY', 'KETONE_NOT_ALDEHYDE', 'CARBONYL_PREFIX', 'CARBONYL_PARENT',
  'MORE_CARBONYL_GROUPS']);

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
 * @param {number[]} list - The numbers.
 * @returns {number[]} A sorted copy.
 */
function sorted(list) {
  return [...list].sort((p, q) => p - q);
}

/**
 * Asserts the invariants of a diagnosed `otherName` verdict of a nitrile's
 * own mistake: the engine's principal group a –C≡N, or the student's suffix a
 * nitrile's beside the engine's acid or ester; a known code with its rule; a
 * Spanish message with every blank filled that never speaks of «grupo(s)
 * –OH», of a –CHO or C=O only where the student's own group is one
 * (CARBONYL_SENIORITY, KETONE_NOT_ALDEHYDE), and of a –COOH or –COO– only
 * beside the engine's acid or ester; a JSON-safe object; atom and bond ids of
 * the verdict's molecule; the student's chain — or ring, its closing bond
 * last — a path of bonds; the app's parent the naming's (in the diagnosis's
 * style); a step that diagnosisExplanation() resolves and opens.
 *
 * @param {object} verdict - An `otherName` verdict with a diagnosis.
 * @param {string} label - Assertion label.
 * @returns {object} The explanation step «Ver el paso» opens.
 */
function assertNitrileDiagnosis(verdict, label) {
  const d = verdict.diagnosis;
  const engine = verdict.naming.structure.suffix.kind;
  assert.equal(verdict.kind, 'otherName', label);
  assert.ok(['nitrile', 'acid', 'ester'].includes(engine), `${label}: ${engine}`);
  assert.ok(d, `${label}: no diagnosis`);
  assert.ok(DIAGNOSES[d.code], `${label}: ${d.code}`);
  if (d.code !== 'ETHER_SIDE') {
    assert.equal(d.rule, DIAGNOSES[d.code].rule, label); // ETHER_SIDE keeps the rule of the draft it replaces.
  }
  assert.ok(d.message.length > 0 && !/undefined|null|NaN|\[object|grupo –OH|grupos –OH/.test(d.message), `${label}: ${d.message}`);
  if (!['CARBONYL_SENIORITY', 'KETONE_NOT_ALDEHYDE'].includes(d.code)) {
    assert.doesNotMatch(d.message, /–CHO|C=O/, `${label}: ${d.message}`);
  }
  if (engine === 'nitrile') {
    assert.doesNotMatch(d.message, /–COOH|–COO–/, `${label}: ${d.message}`);
  }
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
} // End of function assertNitrileDiagnosis()

/** How the engine writes a nitrile's –C≡N groups, by suffix: CARBONYL_SENIORITY, NITRILE_CARBON, CARBONYL_PREFIX. */
const WRITTEN = (ending) => `con la terminación «-${ending}», al final del nombre`;

/** The same for benzene with one –C≡N. */
const BENZONITRILE = 'con «benzonitrilo» (el benceno con un grupo –C≡N)';

/** The seniority sentence CARBONYL_SENIORITY starts with beside a nitrile. */
const SENIORITY_FIRST = 'Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: ácido > éster > '
  + 'amida > nitrilo > aldehído > cetona > alcohol > amina. Aquí manda el nitrilo (–C≡N), que se nombra ';

/** The same beside an acid when the student's suffix is a nitrile's. */
const BESIDE_ACID = 'Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: ácido > nitrilo > '
  + 'aldehído > cetona > alcohol. Aquí manda el ácido (–COOH), que se nombra ';

/** The same beside an ester when the student's suffix is a nitrile's. */
const BESIDE_ESTER = 'Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: ácido > éster > '
  + 'nitrilo > aldehído > cetona > alcohol. Aquí manda el éster (–COO–), que se nombra con la terminación «-oato» y, después de '
  + '«de», el grupo unido al otro oxígeno, acabado en «-ilo»; ';

/** What CARBONYL_SENIORITY says of the `ciano` a student's nitrile suffix becomes beside a senior group, by where it goes. */
const CYANO_CARBON = (where) => `con el prefijo «ciano», que incluye su carbono: ese carbono no se cuenta en ${where}`;

/** The rule NITRILE_CARBON states on a chain. */
const ON_CHAIN = 'La terminación «-carbonitrilo» solo se usa cuando el grupo –C≡N está unido a un anillo. En una cadena, el carbono '
  + 'del –C≡N es un carbono más de la cadena principal, siempre en un extremo, y el grupo se nombra ';

/** The rule NITRILE_CARBON states beside a ring. */
const ON_RING = 'Cuando el grupo –C≡N está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la '
  + 'cadena principal es el anillo, y el grupo se nombra ';

/** The ring-or-chain rule as the CARBONYL_PARENT message states it for the –C≡N groups, before the counts. */
const RING_OR_CHAIN = 'La cadena principal es la que lleva más grupos –C≡N, sea el anillo o una cadena abierta; solo si empatan manda '
  + 'el anillo. Aquí ';

/** RING_NUMBERING at N0 for the –C≡N groups, before the locants. */
const N0 = 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los grupos –C≡N (el '
  + 'grupo principal) tienen que llevar los números más bajos ';

/**
 * One case per nitrile mistake (the former deliberate nulls of I-52b1 and
 * I-52b2, then the variants): [name or tile words, code, trace rule, the
 * step «Ver el paso» opens, message].
 */
const CASES = [
  // 1. A principal –C≡N written `ciano`: no suffix, or fewer –C≡N groups in it; its carbon joins a chain, never a ring.
  ['cianometano', 'CARBONYL_PREFIX', null, 'group', `El grupo –C≡N es el grupo principal: se nombra ${WRITTEN('nitrilo')}, no con el `
    + 'prefijo «ciano». Su carbono entra en la cadena principal. Se escribe «etanonitrilo».'],
  ['1-cianopropano', 'CARBONYL_PREFIX', null, 'group', `El grupo –C≡N es el grupo principal: se nombra ${WRITTEN('nitrilo')}, no con `
    + 'el prefijo «ciano». Su carbono entra en la cadena principal. Se escribe «butanonitrilo».'],
  ['dicianometano', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –C≡N son el grupo principal: los de la cadena principal se nombran '
    + `todos juntos ${WRITTEN('dinitrilo')}, no con el prefijo «ciano». Su carbono entra en la cadena principal. Se escribe `
    + '«propanodinitrilo».'],
  ['cianociclohexano', 'CARBONYL_PREFIX', null, 'group', `El grupo –C≡N es el grupo principal: se nombra ${WRITTEN('carbonitrilo')}, `
    + 'no con el prefijo «ciano». Se escribe «ciclohexanocarbonitrilo».'],
  ['cianobenceno', 'CARBONYL_PREFIX', null, 'group', `El grupo –C≡N es el grupo principal: se nombra ${BENZONITRILE}, no con el `
    + 'prefijo «ciano». Se escribe «benzonitrilo».'],
  ['4-cianotolueno', 'CARBONYL_PREFIX', null, 'group', `El grupo –C≡N es el grupo principal: se nombra ${BENZONITRILE}, no con el `
    + 'prefijo «ciano». Se escribe «4-metilbenzonitrilo».'],
  ['1,3-dicianociclohexano', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –C≡N son el grupo principal: los unidos al anillo se '
    + `nombran todos juntos ${WRITTEN('dicarbonitrilo')}, no con el prefijo «ciano». Se escribe «ciclohexano-1,3-dicarbonitrilo».`],
  ['4-cianobutanonitrilo', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –C≡N son el grupo principal: los de la cadena principal se '
    + `nombran todos juntos ${WRITTEN('dinitrilo')}, no con el prefijo «ciano». Su carbono entra en la cadena principal. Se escribe `
    + '«pentanodinitrilo».'],
  ['3-ciano-2-cloropropanonitrilo', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –C≡N son el grupo principal: los de la cadena '
    + `principal se nombran todos juntos ${WRITTEN('dinitrilo')}, no con el prefijo «ciano». Su carbono entra en la cadena principal. `
    + 'Se escribe «2-clorobutanodinitrilo».'],
  ['2-cianoacetonitrilo', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –C≡N son el grupo principal: los de la cadena principal se '
    + `nombran todos juntos ${WRITTEN('dinitrilo')}, no con el prefijo «ciano». Su carbono entra en la cadena principal. Se escribe `
    + '«propanodinitrilo».'],
  ['4-cianoftalonitrilo', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –C≡N son el grupo principal: los unidos al anillo se nombran '
    + `todos juntos ${WRITTEN('tricarbonitrilo')}, no con el prefijo «ciano». Se escribe «benceno-1,2,4-tricarbonitrilo».`],
  // 2. A junior group as the suffix beside the –C≡N: the order, how the –C≡N is written, the junior group's prefix.
  ['4-cianobutan-2-ona', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}${WRITTEN('nitrilo')}; el C=O de la cetona va `
    + 'delante, con el prefijo «oxo». Se escribe «4-oxopentanonitrilo».'],
  ['3-cianopropanal', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}${WRITTEN('nitrilo')}; el –CHO del aldehído va delante, `
    + 'con el prefijo «oxo». Se escribe «4-oxobutanonitrilo».'],
  ['4-cianobutan-2-ol', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}${WRITTEN('nitrilo')}; el –OH va delante, con el `
    + 'prefijo «hidroxi». Se escribe «4-hidroxipentanonitrilo».'],
  ['4-cianofenol', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}${BENZONITRILE}; el –OH va delante, con el prefijo `
    + '«hidroxi». Se escribe «4-hidroxibenzonitrilo».'],
  ['4-cianobenzaldehído', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}${BENZONITRILE}; el –CHO del aldehído va delante, `
    + 'con el prefijo «formil». Se escribe «4-formilbenzonitrilo».'],
  ['4-cianociclohexano-1-carbaldehído', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}${WRITTEN('carbonitrilo')}; el –CHO `
    + 'del aldehído va delante, con el prefijo «formil». Se escribe «4-formilciclohexano-1-carbonitrilo».'],
  // An `al` a `ciano` bonds to a second carbon is a ketone's C=O: KETONE_NOT_ALDEHYDE says so, never «el –CHO del aldehído».
  ['1-cianobutanal', 'KETONE_NOT_ALDEHYDE', null, 'group', 'El grupo –CHO de un aldehído va en un extremo de la cadena: su carbono '
    + 'solo puede unirse a un carbono más. Aquí el carbono 1 está unido a dos carbonos: su C=O es el de una cetona, no el de un '
    + 'aldehído. Se escribe «2-oxopentanonitrilo».'],
  // 3. A student's nitrile suffix beside a senior group: the `ciano` takes the –C≡N's carbon out of the chain (or off the ring).
  ['3-carboxipropanonitrilo', 'CARBONYL_SENIORITY', null, 'group', `${BESIDE_ACID}con la palabra «ácido» al principio del nombre y la `
    + `terminación «-oico» al final; el –C≡N del nitrilo va delante, ${CYANO_CARBON('la cadena principal')}. Se escribe «ácido `
    + '3-cianopropanoico».'],
  ['4-carboxiciclohexano-1-carbonitrilo', 'CARBONYL_SENIORITY', null, 'group', `${BESIDE_ACID}con la palabra «ácido» al principio del `
    + `nombre y la terminación «-carboxílico» al final; el –C≡N del nitrilo va delante, ${CYANO_CARBON('el anillo')}. Se escribe `
    + '«ácido 4-cianociclohexano-1-carboxílico».'],
  ['4-carboxibenzonitrilo', 'CARBONYL_SENIORITY', null, 'group', `${BESIDE_ACID}con «ácido benzoico» (el benceno con un grupo –COOH); `
    + `el –C≡N del nitrilo va delante, ${CYANO_CARBON('el anillo')}. Se escribe «ácido 4-cianobenzoico».`],
  ['2-carboxiacetonitrilo', 'CARBONYL_SENIORITY', null, 'group', `${BESIDE_ACID}con la palabra «ácido» al principio del nombre y la `
    + `terminación «-oico» al final; el –C≡N del nitrilo va delante, ${CYANO_CARBON('la cadena principal')}. Se escribe «ácido `
    + '2-cianoetanoico».'],
  ['4-carboxiftalonitrilo', 'CARBONYL_SENIORITY', null, 'group', `${BESIDE_ACID}con «ácido benzoico» (el benceno con un grupo –COOH); `
    + `cada –C≡N va delante, ${CYANO_CARBON('el anillo')}. Se escribe «ácido 3,4-dicianobenzoico».`],
  ['3-(metoxicarbonil)propanonitrilo', 'CARBONYL_SENIORITY', null, 'group', `${BESIDE_ESTER}el –C≡N del nitrilo va delante, `
    + `${CYANO_CARBON('la cadena principal')}. Se escribe «3-cianopropanoato de metilo».`],
  ['2-(acetiloxi)etanonitrilo', 'CARBONYL_SENIORITY', null, 'group', `${BESIDE_ESTER}el –C≡N del nitrilo va en el nombre del grupo `
    + `unido al otro oxígeno, ${CYANO_CARBON('la cadena de ese grupo')}. Se escribe «etanoato de cianometilo».`],
  // 4. The –C≡N's carbon on the other side of the parent: `carbonitrilo` on a chain; the –C≡N's carbon as the chain beside a ring.
  ['propano-1-carbonitrilo', 'NITRILE_CARBON', null, 'group', `${ON_CHAIN}${WRITTEN('nitrilo')}. Se escribe «butanonitrilo».`],
  ['butano-1,4-dicarbonitrilo', 'NITRILE_CARBON', null, 'group', `${ON_CHAIN}${WRITTEN('dinitrilo')}. Se escribe «hexanodinitrilo».`],
  ['ciclohexilmetanonitrilo', 'NITRILE_CARBON', null, 'group', `${ON_RING}${WRITTEN('carbonitrilo')}. Se escribe `
    + '«ciclohexanocarbonitrilo».'],
  ['fenilmetanonitrilo', 'NITRILE_CARBON', null, 'group', `${ON_RING}${BENZONITRILE}. Se escribe «benzonitrilo».`],
  ['(4-metilfenil)metanonitrilo', 'NITRILE_CARBON', null, 'group', `${ON_RING}${BENZONITRILE}. Se escribe «4-metilbenzonitrilo».`],
  // 5. The ring or a chain, decided by the –C≡N groups: the chain with more, a tie (the ring), every –C≡N on the ring.
  ['(2-cianoetil)ciclohexano', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo no lleva ninguno y la mejor `
    + 'cadena, uno, así que gana la cadena y el anillo va en una rama: «3-ciclohexilpropanonitrilo».'],
  ['(cianometil)benceno', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo no lleva ninguno y la mejor cadena, `
    + 'uno, así que gana la cadena y el anillo va en una rama: «2-feniletanonitrilo».'],
  ['2-(4-cianociclohexil)etanonitrilo', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo y la mejor cadena `
    + 'llevan uno cada uno, así que gana el anillo: «4-(cianometil)ciclohexano-1-carbonitrilo».'],
  ['(4-cianofenil)metano', 'CARBONYL_PARENT', 'RING', 'benzene', `${RING_OR_CHAIN}el anillo lleva uno y las cadenas no llevan `
    + 'ninguno, así que gana el anillo: «4-metilbenzonitrilo».'],
  // 6. Another chain with more –C≡N groups (P0), also a chain with none; and told from the ether oxygen.
  ['2-(cianometil)butanonitrilo', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos –C≡N (2; la tuya tiene '
    + '1). La cadena principal es la que lleva más grupos –C≡N, aunque no sea la más larga.'],
  ['3-(cianometil)pentano', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos –C≡N (1; la tuya tiene 0). '
    + 'La cadena principal es la que lleva más grupos –C≡N, aunque no sea la más larga.'],
  ['(2-cianoetoxi)metano', 'ETHER_SIDE', 'P0', 'ether', 'El oxígeno del éter (–O–) corta la molécula en dos lados, y la cadena '
    + 'principal no puede pasar por él: se busca en uno de los dos lados, con las reglas de siempre. Aquí la cadena principal está '
    + 'en el otro lado del oxígeno, no en el de tu cadena: primero cuenta el grupo principal, y en ese lado hay un grupo –C≡N y en tu '
    + 'cadena, ninguno. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: «3-metoxipropanonitrilo».'],
  // 7. The –C≡N groups numbered otherwise (N0): a ring, benzene, one –C≡N whose 1 the engine does not write, beside `eno`.
  ['ciclohexano-1,5-dicarbonitrilo', 'RING_NUMBERING', 'N0', 'ringNumbering', `${N0}(3 en vez de 5).`],
  ['benceno-1,5-dicarbonitrilo', 'RING_NUMBERING', 'N0', 'ringNumbering', `${N0}(3 en vez de 5).`],
  ['ciclohexano-2-carbonitrilo', 'RING_NUMBERING', 'N0', 'ringNumbering', `${N0}(1 en vez de 2). En «ciclohexanocarbonitrilo» ese `
    + 'número ni siquiera se escribe.'],
  ['3-metilciclohex-1-eno-1,5-dicarbonitrilo', 'RING_NUMBERING', 'N0', 'ringNumbering', `${N0}(3 en vez de 5).`],
  // 8. Needless suffix locants: the –C≡N group's words.
  ['ciclohexano-1-carbonitrilo', 'NEEDLESS_LOCANTS', null, 'ringNumbering', 'En «ciclohexanocarbonitrilo» no se escriben números: solo '
    + 'hay una manera de colocar el grupo –C≡N.'],
  ['benceno-1-carbonitrilo', 'NEEDLESS_LOCANTS', null, 'assemble', 'En «benzonitrilo» no se escriben números: solo hay una manera de '
    + 'colocar el grupo –C≡N.'],
  // 9. Old-style suffix locants already speak of the suffix's words (phase I-52b1).
  ['1,4-ciclohexanodicarbonitrilo', 'OLD_STYLE', null, 'assemble', 'Has escrito los números delante de la raíz, como se hacía antes. '
    + 'Hoy van detrás, justo delante de «dicarbonitrilo»: «ciclohexano-1,4-dicarbonitrilo».'],
];

test('one case per nitrile mistake: the code, its trace rule, the step «Ver el paso» opens and the message', () => {
  const seen = new Set();
  for (const [name, code, traceRule, opened, message] of CASES) {
    const verdict = read(name);
    const step = assertNitrileDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule], [code, traceRule], `${name}: ${d.message}`);
    assert.equal(step.id, opened, `${name}: the step «Ver el paso» opens`);
    assert.equal(d.message, message, name);
    seen.add(code);
  } // End of the loop over the cases
  assert.deepEqual([...NITRILE_CODES, ...SHARED_CODES].filter((code) => !seen.has(code)), [], 'every nitrile code has a case');
}); // End of test 'one case per nitrile mistake…'

test('the student\'s chain beside the parent, what the message is about and its tiles', () => {
  // CARBONYL_PREFIX: the student's one carbon beside the app's two; the focus is the `ciano` (its C and N, both bonds); its tile.
  const prefix = read('cianometano');
  const cyano = prefix.prefixAtoms[0];
  assert.deepEqual([prefix.diagnosis.student.atoms.length, prefix.diagnosis.parent.atoms.length], [1, 2]);
  assert.ok(prefix.diagnosis.parent.atoms.includes(cyano.attachment), 'the –C≡N\'s carbon is the parent\'s');
  assert.deepEqual(prefix.diagnosis.focus, { atoms: cyano.atoms, bonds: [cyano.bond, ...cyano.bonds] });
  assert.deepEqual(prefix.diagnosis.tiles, [0, 1], '«ciano»');
  assert.deepEqual(diagnosisLegend(prefix.diagnosis).map((e) => e.text), ['Cadena principal', 'Tu cadena']);
  // NITRILE_CARBON on a chain: the student's three carbons beside the app's four; the focus is the –C≡N; «1», «carbonitrilo».
  const chain = read('propano-1-carbonitrilo');
  const group = chain.suffixAtoms[0];
  const d = chain.diagnosis;
  assert.deepEqual([d.student.atoms.length, d.parent.atoms.length], [3, 4]);
  assert.ok(d.parent.atoms.includes(group.carbon), 'the –C≡N\'s carbon is the parent\'s');
  assert.deepEqual(d.focus, { atoms: [group.carbon, group.attachment], bonds: [group.bond] });
  assert.deepEqual(d.tiles, [2, 4], '«1», «carbonitrilo»');
  assert.deepEqual(diagnosisLegend(d).map((e) => e.text), ['Cadena principal', 'Tu cadena']);
  // NITRILE_CARBON beside a ring: the –C≡N's carbon was the student's whole chain; the suffix's tile.
  const ring = read('fenilmetanonitrilo').diagnosis;
  assert.deepEqual([ring.student.atoms.length, ring.parent.atoms.length], [1, 6]);
  assert.deepEqual(ring.tiles, [3, 4], '«nitrilo»');
  assert.deepEqual(diagnosisLegend(ring).map((e) => e.text), ['Cadena principal (el anillo)', 'Tu cadena']);
  // CARBONYL_SENIORITY beside an acid: the student's –C≡N (its carbon, the student's carbon 1, and its N); the suffix's tile.
  const senior = read('3-carboxipropanonitrilo');
  const nitrile = senior.suffixAtoms[0];
  assert.deepEqual(senior.diagnosis.focus, { atoms: [nitrile.parentAtom, nitrile.attachment], bonds: [nitrile.bond] });
  assert.ok(!senior.diagnosis.parent.atoms.includes(nitrile.parentAtom), 'the –C≡N\'s carbon leaves the chain');
  assert.deepEqual(senior.diagnosis.tiles, [4, 5], '«nitrilo»');
  // CARBONYL_PARENT: the chain beside the student's ring; the tiles of the branch that holds it.
  const parent = read('(2-cianoetil)ciclohexano').diagnosis;
  assert.ok(!parent.parent.atoms.some((id) => parent.student.atoms.includes(id)));
  assert.deepEqual(parent.tiles, [0, 6], '«(2-cianoetil)»');
  assert.deepEqual(diagnosisLegend(parent).map((e) => e.text), ['Cadena principal', 'Tu anillo']);
}); // End of test 'the student's chain beside the parent…'

test('the step «Ver el paso» opens explains the nitrile rule the message states', () => {
  /**
   * The text of the step «Ver el paso» opens for a name.
   *
   * @param {string} name - A name or tile words.
   * @returns {string} The step's paragraphs, joined.
   */
  const opened = (name) => {
    const explanation = diagnosisExplanation(read(name), explain);
    return explanation.steps[explanation.index].text.join(' ');
  };
  assert.match(opened('cianometano'), /El grupo –C≡N es el \[\[grupo principal\]\]: se nombra con el \[\[sufijo\]\] «-nitrilo»/);
  assert.match(opened('cianometano'), /Ese carbono es un carbono más de la cadena: se cuenta al buscarla y al numerarla/);
  assert.match(opened('4-cianobutan-2-ona'), /ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina\. Aquí manda el nitrilo/);
  assert.match(opened('3-carboxipropanonitrilo'), /ácido > nitrilo > aldehído > cetona > alcohol\. Aquí manda el ácido/);
  assert.match(opened('3-carboxipropanonitrilo'), /El \[\[prefijo\]\] «ciano-» incluye el carbono del –C≡N: ese carbono no se cuenta en la \[\[cadena principal\]\]/);
  assert.match(opened('propano-1-carbonitrilo'), /siempre está en un extremo de la cadena\. Ese carbono es un carbono más de la cadena/);
  assert.match(opened('ciclohexilmetanonitrilo'), /tampoco forma una cadena aparte: el anillo es la \[\[cadena principal\]\]/);
  assert.match(opened('(2-cianoetil)ciclohexano'), /mayor número posible de grupos –C≡N\. Solo si hay empate manda el anillo/);
  assert.match(opened('3-(cianometil)pentano'), /el mayor número posible de grupos –C≡N/);
  assert.match(opened('ciclohexano-1,5-dicarbonitrilo'), /los grupos –C≡N \(el \[\[grupo principal\]\]\) deben tener los/);
}); // End of test 'the step «Ver el paso» opens explains…'

/**
 * The tile ids of a nitrile name with its `carbonitrilo` suffix rewritten as
 * `ciano` prefixes before the parent (`ciclohexano-1,4-dicarbonitrilo` →
 * `1,4-dicianociclohexano`, the locants the reading places), or its
 * `benzonitrilo` as a `ciano` on carbon 1 of `benceno` (`4-metilbenzonitrilo`
 * → `1-ciano-4-metilbenceno`); null for any other name, or for one with an
 * orto/meta/para letter.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asCyanoPrefixes(ids) {
  const { tree } = parse(ids);
  if (tree.items.some((item) => item.letter !== null)) {
    return null;
  }
  const word = ids.indexOf(BENZONITRILE_ID);
  if (word >= 0) {
    return [tileId('num', 1), CYANO_ID, ...ids.slice(0, word), seq(BENZENE_NAME)[0], ...ids.slice(word + 1)];
  }
  const { suffix } = tree.parent;
  if (!suffix || ids[suffix.range[1] - 1] !== CARBONITRILE_ID) {
    return null;
  }
  const locants = readName(ids).suffixAtoms.map((g) => g.locant).sort((p, q) => p - q).map((value) => tileId('num', value));
  const prefix = [...locants, ...(suffix.multiplier === null ? [] : [ids[suffix.multiplier]]), CYANO_ID];
  return [...prefix, ...ids.slice(0, suffix.range[0]), ...ids.slice(suffix.range[1])];
} // End of function asCyanoPrefixes()

/**
 * The tile ids of a nitrile name with its chain's `nitrilo` rewritten as
 * `ciano` prefixes on the chain without the –C≡N's carbons (`butanonitrilo`
 * → `1-cianopropano`, `hexanodinitrilo` → `1,4-dicianobutano`): the chain
 * one carbon shorter for each –C≡N, every parent-level prefix and multiple
 * bond renumbered from the carbon after carbon 1; null for any other suffix,
 * a –C≡N that is the whole chain, or a name with an old-style locant.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asCyanoOnChain(ids) {
  const { tree } = parse(ids);
  const { suffix, chain } = tree.parent;
  if (!suffix || ids[suffix.range[1] - 1] !== NITRILO_ID || tree.parent.legacy.length > 0 || tree.parent.legacySuffix) {
    return null;
  }
  const n = tree.tiles[chain.root].value;
  const count = suffix.multiplier === null ? 1 : tree.tiles[suffix.multiplier].value;
  if (n - count < 1) {
    return null; // `etanodinitrilo`: the two –C≡N carbons are the whole chain.
  }
  const out = [...ids];
  out[chain.root] = tileId('root', n - count);
  const shifted = [...tree.items.flatMap((item) => item.locants), ...chain.segments.flatMap((segment) => segment.locants)];
  shifted.forEach((p) => {
    out[p] = tileId('num', tree.tiles[p].value - 1);
  });
  const ends = count === 1 ? [1] : [1, n - count];
  const prefix = [...ends.map((value) => tileId('num', value)), ...(count > 1 ? [tileId('mult', count)] : []), CYANO_ID];
  return [...prefix, ...out.slice(0, suffix.range[0]), ...out.slice(suffix.range[1])];
} // End of function asCyanoOnChain()

/** How many nitrile fixture names have a `carbonitrilo` suffix or the word `benzonitrilo`, and how many a `nitrilo` one. */
const SWEEP_COUNTS = Object.freeze({ ring: 21, chain: 23 });

test('sweeps over the nitrile fixture names: `carbonitrilo` and `benzonitrilo` as `ciano` prefixes, `nitrilo` as `ciano` on the chain', async () => {
  const names = (await readFixtures()).filter((row) => isNitrile(row.smiles)).flatMap((row) => row.names)
    .filter((name) => isNitrileName(name) && !isNitrileTemplateName(name));
  const counts = { ring: 0, chain: 0 };
  for (const name of names) {
    const ids = tokenize(name);
    for (const [kind, rewrite] of [['ring', asCyanoPrefixes], ['chain', asCyanoOnChain]]) {
      const mutated = rewrite(ids);
      if (!mutated) {
        continue;
      }
      counts[kind] += 1;
      const verdict = readName(mutated);
      const label = `${name} → ${verdict.text}`;
      assert.equal(verdict.kind, 'otherName', `${label}: ${verdict.message}`);
      assert.equal(verdict.name, readName(ids).name, `${label}: the same molecule`);
      assertNitrileDiagnosis(verdict, label);
      assert.equal(verdict.diagnosis.code, 'CARBONYL_PREFIX', `${label}: ${verdict.diagnosis.message}`);
      // The name quoted is the engine's in the student's prefix style; on a chain the `ciano` carbon joins it.
      assert.ok(verdict.diagnosis.message.endsWith(`«${diagnosisNaming(verdict).name}».`), `${label}: ${verdict.diagnosis.message}`);
      assert.equal(verdict.diagnosis.message.includes('Su carbono entra en la cadena principal.'), kind === 'chain', label);
    } // End of the loop over the two rewrites
  } // End of the loop over the names
  assert.deepEqual(counts, { ...SWEEP_COUNTS });
}); // End of test 'sweeps over the nitrile fixture names…'

test('MISSING_LOCANTS names the –C≡N groups when the suffix\'s locant is the one missing (diagnose() on its own)', () => {
  /**
   * The diagnosis diagnose() gives a verdict read from a name, whatever its kind.
   *
   * @param {string} name - A name.
   * @returns {object|null} The diagnosis.
   */
  const direct = (name) => {
    const ids = tokenize(name);
    const { tree } = parse(ids);
    return diagnose({ tree, spec: interpret(tree) }, readName(ids));
  };
  // Alone, a missing locant is the verdict `missingLocants`, never `otherName`.
  assert.equal(read('2-clorociclohexanocarbonitrilo').kind, 'missingLocants');
  const d = direct('2-clorociclohexanocarbonitrilo');
  assert.deepEqual([d.code, d.tiles], ['MISSING_LOCANTS', [5, 6]], 'the «carbonitrilo» tile, whose locant is missing');
  assert.equal(d.message, 'Faltan números: hay que decir en qué carbono va cada rama, cada enlace doble o triple y cada grupo –C≡N, '
    + 'como en «2-clorociclohexano-1-carbonitrilo».');
}); // End of test 'MISSING_LOCANTS names the –C≡N groups…'

test('the one nitrile null left: a student\'s nitrile suffix beside a principal group junior to it (never built: a naming made up)', () => {
  // A student's nitrile suffix builds a –C≡N, which the engine names as the principal group unless an acid's –COOH or an
  // ester's –COO– is there (their checks name the junior nitrile): diagnose.js «Nitriles» keeps a null for any other group.
  const ids = tokenize('propano-1-carbonitrilo');
  const { tree } = parse(ids);
  const verdict = readName(ids);
  const { structure } = verdict.naming;
  const madeUp = { ...verdict.naming, structure: { ...structure, suffix: { ...structure.suffix, kind: 'ketone' } } };
  assert.equal(diagnose({ tree, spec: interpret(tree) }, { ...verdict, naming: madeUp }), null);
  assert.equal(diagnose({ tree, spec: interpret(tree) }, verdict).code, 'NITRILE_CARBON', 'the real naming');
}); // End of test 'the one nitrile null left…'

test('controls: correct nitrile names have no diagnosis; a mistake the earlier rules name stays theirs', () => {
  for (const name of ['butanonitrilo', 'pentanodinitrilo', 'ciclohexanocarbonitrilo', 'benzonitrilo', 'acetonitrilo',
    '4-oxopentanonitrilo', '4-hidroxibenzonitrilo', 'ácido 3-cianopropanoico', '3-cianopropanoato de metilo',
    '4-(cianometil)ciclohexano-1-carbonitrilo', '2-etilbutanodinitrilo']) {
    const verdict = read(name);
    assert.ok(['correct', 'alternative'].includes(verdict.kind), `${name}: ${verdict.kind}`);
    assert.ok(!('diagnosis' in verdict), name);
  }
  // The rules of phases I-52b1 and I-52b2 keep their codes beside the new ones; N1–N4 after an N0 tie keep their own phrases.
  for (const [name, code] of [['4-metilbutanonitrilo', 'BRANCH_AT_END'], ['2-etilpropanonitrilo', 'LONGER_CHAIN'],
    ['4-metilhexanodinitrilo', 'NUMBERING'], ['6-metilbenzonitrilo', 'RING_NUMBERING'],
    ['5-metilciclohexano-1-carbonitrilo', 'RING_NUMBERING'], ['2-cloroacetonitrilo', 'SUBSTITUTED_TEMPLATE'],
    ['2-fenilacetonitrilo', 'NEEDLESS_LOCANTS'], ['5-metilftalonitrilo', 'RING_NUMBERING']]) {
    const verdict = read(name);
    assertNitrileDiagnosis(verdict, name);
    assert.equal(verdict.diagnosis.code, code, `${name}: ${verdict.diagnosis.message}`);
  }
  assert.match(read('6-metilbenzonitrilo').diagnosis.message, /los sustituyentes tienen que llevar los números más bajos/);
  assert.equal(read('5-metilciclohexano-1-carbonitrilo').diagnosis.traceRule, 'N3');
  // The acid's and the ester's own checks stay theirs beside a `ciano`: a –COOH written as two groups, ESTER_CARBON.
  assert.equal(read('3-ciano-1-hidroxipropanal').diagnosis.code, 'ACID_GROUP');
  assert.equal(read('propano-1-carboxilato de cianometilo').diagnosis.code, 'ESTER_CARBON');
}); // End of test 'controls…'

test('the drafts of the nitrile rules: their place among the rules, their steps, every variant renders', () => {
  assert.deepEqual(NITRILE_CODES.map((code) => [DIAGNOSES[code].rule, DIAGNOSES[code].step]), [[1, 'group']]);
  // NITRILE_CARBON beside ESTER_CARBON, its twin.
  assert.equal(DIAGNOSIS_CODES[DIAGNOSIS_CODES.indexOf('NITRILE_CARBON') - 1], 'ESTER_CARBON');
  for (const code of [...NITRILE_CODES, ...SHARED_CODES]) {
    const text = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    assert.match(text, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(text, /undefined|null|NaN/, code);
  }
  const { NITRILE_CARBON, CARBONYL_SENIORITY, CARBONYL_PREFIX, CARBONYL_PARENT, MORE_CARBONYL_GROUPS, NEEDLESS_LOCANTS, CHAIN_LOCANTS }
    = DIAGNOSIS_TEXTS;
  const { ending, groupWords, carbonylN0, what, principal, junior, cyanoCarbon } = DIAGNOSIS_PHRASES;
  assert.equal(DIAGNOSES.NITRILE_CARBON.example.name, 'butanonitrilo');
  assert.equal(NITRILE_CARBON(DIAGNOSES.NITRILE_CARBON.example), `${ON_CHAIN}${WRITTEN('nitrilo')}. Se escribe «butanonitrilo».`);
  // The –C≡N's words, beside the C=O groups': «grupo –C≡N», as the explanation says it (the parser and builder keep «grupo C≡N»).
  assert.deepEqual(groupWords.nitrile, { one: 'grupo –C≡N', many: 'grupos –C≡N' });
  assert.equal(carbonylN0.numberingReasons.nitrile, 'los grupos –C≡N (el grupo principal) tienen que llevar los números más bajos');
  assert.equal(carbonylN0.lowerLocantsOf.nitrile, 'los grupos –C≡N');
  assert.deepEqual([what.nitrile, what.nitriles], ['el grupo –C≡N', 'los grupos –C≡N']);
  assert.equal(principal.nitrile, 'el nitrilo (–C≡N)');
  assert.deepEqual([...junior.nitrile], ['el –C≡N del nitrilo', 'cada –C≡N']);
  assert.deepEqual(Object.keys(cyanoCarbon), ['chain', 'ring', 'oBound']);
  // The seniority beside a nitrile is naming/seniority.js's whole order, in its Spanish words; beside an acid or an ester, the
  // kinds those group steps list with a `ciano`.
  const spanish = { acid: 'ácido', ester: 'éster', amide: 'amida', nitrile: 'nitrilo', aldehyde: 'aldehído', ketone: 'cetona',
    alcohol: 'alcohol', amine: 'amina' };
  assert.equal(DIAGNOSIS_PHRASES.nitrileSeniority, SENIORITY.map((kind) => spanish[kind]).join(' > '));
  assert.deepEqual({ ...DIAGNOSIS_PHRASES.cyanoSeniority }, { acid: 'ácido > nitrilo > aldehído > cetona > alcohol',
    ester: 'ácido > éster > nitrilo > aldehído > cetona > alcohol' });
  assert.equal(DIAGNOSIS_PHRASES.seniorityOf({ group: 'nitrile', junior: 'ketone' }), DIAGNOSIS_PHRASES.nitrileSeniority);
  assert.equal(DIAGNOSIS_PHRASES.seniorityOf({ group: 'acid', junior: 'aldehyde' }), 'ácido > aldehído > cetona > alcohol',
    'beside an acid without a nitrile, unchanged');
  // How the –C≡N is written: the suffix, or `benzonitrilo`; the other groups' wording unchanged.
  assert.equal(ending({ ending: 'dinitrilo', benzaldehyde: false }), WRITTEN('dinitrilo'));
  assert.equal(ending({ ending: 'carbonitrilo', benzaldehyde: false, benzonitrile: true }), BENZONITRILE);
  assert.equal(ending({ ending: 'al', benzaldehyde: false }), 'con la terminación «-al», al final del nombre');
  // The variants: NITRILE_CARBON beside benzene; CARBONYL_SENIORITY with several junior groups, with a junior nitrile on an
  // ester's O-bound group.
  assert.equal(NITRILE_CARBON({ ring: true, ending: 'carbonitrilo', benzonitrile: true, name: 'X' }), `${ON_RING}${BENZONITRILE}. Se `
    + 'escribe «X».');
  assert.equal(CARBONYL_SENIORITY({ group: 'nitrile', ending: 'nitrilo', junior: 'ketone', count: 2, prefix: null, name: 'X' }),
    `${SENIORITY_FIRST}${WRITTEN('nitrilo')}; cada C=O de cetona va delante, en los prefijos. Se escribe «X».`);
  assert.equal(CARBONYL_SENIORITY({ group: 'ester', ending: 'oato', ester: true, groups: 1, junior: 'nitrile', count: 1,
    prefix: 'ciano', side: 'oBound', name: 'X' }), `${BESIDE_ESTER}el –C≡N del nitrilo va en el nombre del grupo unido al otro `
    + `oxígeno, ${CYANO_CARBON('la cadena de ese grupo')}. Se escribe «X».`);
  // The shared codes speak of the –C≡N groups by their group: prefix, parent choice, P0, N0; needless suffix locants.
  assert.equal(CARBONYL_PREFIX({ group: 'nitrile', count: 2, ending: 'dicarbonitrilo', prefix: 'ciano', joins: false, on: 'outside',
    name: 'X' }), `Los grupos –C≡N son el grupo principal: los unidos al anillo se nombran todos juntos ${WRITTEN('dicarbonitrilo')}, `
    + 'no con el prefijo «ciano». Se escribe «X».');
  assert.match(CARBONYL_PARENT({ group: 'nitrile', ring: 2, chain: 2, chainParent: false, name: 'X' }), /^La cadena principal es la que lleva más grupos –C≡N/);
  assert.match(MORE_CARBONYL_GROUPS({ group: 'nitrile', app: 2, student: 1 }), /^Hay otra cadena con más grupos –C≡N \(2; la tuya tiene 1\)/);
  assert.equal(NEEDLESS_LOCANTS({ name: 'X', what: what.nitriles, kept: false }), 'En «X» no se escriben números: solo hay una manera de '
    + 'colocar los grupos –C≡N.');
  assert.equal(CHAIN_LOCANTS({ rule: 'N0', group: 'nitrile', app: '1', student: '2' }), 'Hay otra cadena igual de larga que, bien '
    + 'numerada, da números más bajos a los grupos –C≡N (1 en vez de 2): esa es la cadena principal.');
  assert.equal(DIAGNOSIS_TEXTS.NUMBERING({ rule: 'N0', group: 'nitrile', app: '1', student: '4', unwritten: false }), 'Hay que '
    + 'numerar la cadena desde el otro extremo: los grupos –C≡N (el grupo principal) tienen que llevar los números más bajos (1 en '
    + 'vez de 4).');
  assert.equal(DIAGNOSIS_PHRASES.etherSide({ reason: 'CARBONYL_PARENT', group: 'nitrile', ring: 1, chain: 1, chainParent: false }),
    'primero cuenta el grupo principal, y los dos lados llevan un grupo –C≡N cada uno; en el empate, manda el anillo');
}); // End of test 'the drafts of the nitrile rules…'
