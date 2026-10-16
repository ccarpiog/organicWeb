/**
 * @file Unit tests for the amine diagnoses of «¿Cómo se dibuja?»
 * (src/reverse/diagnose.js header «Amines», design.md §13.4 I-36, I-40a,
 * I-43a, §15.8 R-6c; phase I-52c4a, R-6c4a): one case per mistake of the
 * principal amine group that phases I-52c1, I-52c2 and I-52c3 left as a
 * deliberate null — a junior amine beside a senior group (CARBONYL_SENIORITY
 * with the seniority ácido > éster > amida > nitrilo > aldehído > cetona >
 * alcohol > amina, the amide's nitrogen its own), a principal amine written
 * as an amino prefix, also beside `amina` or `anilina` (CARBONYL_PREFIX, the
 * groups of its nitrogen going before the name with `N`), the parent on the
 * other side of the nitrogen (AMINE_SIDE, the one new code, ETHER_SIDE's
 * twin), the ring against a chain decided by the amino groups
 * (CARBONYL_PARENT), another chain with more amino groups
 * (MORE_CARBONYL_GROUPS, P0), the amino groups numbered otherwise (N0,
 * NUMBERING and RING_NUMBERING) and the suffix's needless locants
 * (NEEDLESS_LOCANTS, beside an `N` too) — each with its code, trace rule,
 * message and the step «Ver el paso» opens; `N` no number in LOCANT_ORDER and
 * LOCANT_COUNT; the student's chain beside the parent, the focus and the
 * tiles; the explanation step each opens says the rule; an end branch of
 * the student's chain with the parent across the nitrogen (AMINE_SIDE, not
 * BRANCH_AT_END; review of I-52c4a); a sweep over the
 * amine fixture names with every `amina` written as `amino` prefixes;
 * MISSING_LOCANTS with the amino groups' words; the class names' own
 * mistakes (phase I-52c4b: CLASS_ORDER, CLASS_DI, CLASS_GROUP_WORDS and
 * CLASS_NAME_NONE with the amine's words, CARBONYL_SENIORITY for a class
 * name beside a senior group), each with its tiles and the class-name step
 * «Ver el paso» opens (AMINE_CLASS_STEP, after «Reconoce el grupo
 * funcional»), whose text agrees with the message; the «Amines» null left
 * (the templates' prefix style, a pinned open question; an amide written
 * `amino` + `al`, R-6d's null until phase I-52d4, now «Amides»' AMIDE_GROUP);
 * controls; the drafts.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { AMINA_ID, AMINO_ID, NITROGEN_ID, tileId } from '../../src/reverse/tiles.js';
import {
  diagnose, diagnosisNaming, diagnosisExplanation, DIAGNOSES, DIAGNOSIS_CODES, DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES, STEP_FALLBACKS,
  AMINE_CLASS_STEP, AMINE_CLASS_STEP_TEXTS, diagnosisStepIndex,
} from '../../src/reverse/diagnose.js';
import { explain, GLOSSARY, parseMarkup, plainText } from '../../src/explain/explain.js';
import { adjacency } from '../../src/model/graph.js';
import { diagnosisLegend } from '../../src/ui/draw-name.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { SENIORITY } from '../../src/naming/seniority.js';
import { seq, readFixtures, isAmine, isAmineName, isAminoName, isAmineTemplateName, isAmineClassName } from './reverse-words.js';

/** The codes only an amine gives (diagnose.js header «Amines»). */
const AMINE_CODES = Object.freeze(['AMINE_SIDE']);

/** The codes an amine shares with the other families, their words keyed by the amino group (diagnose.js «Amines»). */
const SHARED_CODES = Object.freeze(['CARBONYL_SENIORITY', 'CARBONYL_PREFIX', 'CARBONYL_PARENT', 'MORE_CARBONYL_GROUPS', 'NUMBERING',
  'RING_NUMBERING', 'NEEDLESS_LOCANTS', 'LOCANT_ORDER']);

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
 * Asserts the invariants of a diagnosed `otherName` verdict of an amine's own
 * mistake: the engine's principal group an amine, or the student's suffix an
 * amine's beside another principal group; a known code with its rule; a
 * Spanish message with every blank filled that never speaks of «grupo(s) –OH»
 * beside an amine principal; a JSON-safe object; atom and bond ids of the
 * verdict's molecule; the student's chain — or ring, its closing bond last — a
 * path of bonds; the app's parent the naming's (in the diagnosis's style); a
 * step that diagnosisExplanation() resolves and opens.
 *
 * @param {object} verdict - An `otherName` verdict with a diagnosis.
 * @param {string} label - Assertion label.
 * @returns {object} The explanation step «Ver el paso» opens.
 */
function assertAmineDiagnosis(verdict, label) {
  const d = verdict.diagnosis;
  const engine = verdict.naming.structure.suffix.kind;
  assert.equal(verdict.kind, 'otherName', label);
  assert.ok(d, `${label}: no diagnosis`);
  assert.ok(DIAGNOSES[d.code], `${label}: ${d.code}`);
  if (!['ETHER_SIDE', 'AMINE_SIDE'].includes(d.code)) {
    assert.equal(d.rule, DIAGNOSES[d.code].rule, label); // ETHER_SIDE and AMINE_SIDE keep the rule of the draft they replace.
  }
  assert.ok(d.message.length > 0 && !/undefined|null|NaN|\[object/.test(d.message), `${label}: ${d.message}`);
  if (engine === 'amine') {
    assert.doesNotMatch(d.message, /–OH|–CHO|C=O|–COOH|–COO–|–C≡N/, `${label}: ${d.message}`);
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
} // End of function assertAmineDiagnosis()

/** How the engine writes its amine groups (CARBONYL_PREFIX), by suffix. */
const WRITTEN = (ending) => `con la terminación «-${ending}», al final del nombre`;

/** The seniority sentence CARBONYL_SENIORITY starts with beside a student's junior amine: the whole order. */
const SENIORITY_FIRST = 'Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: ácido > éster > '
  + 'amida > nitrilo > aldehído > cetona > alcohol > amina. Aquí manda ';

/** What CARBONYL_SENIORITY says of the student's amine when its nitrogen is the amide's. */
const IN_AMIDE = 'el grupo amino no va aparte: su nitrógeno, con el C=O unido a él, forma la amida';

/** The first sentences of AMINE_SIDE, before the reason. */
const SIDE = 'El nitrógeno de la amina está unido a varios grupos de carbonos, y la cadena principal no puede pasar por él: es uno '
  + 'de esos grupos, y se elige con las reglas de siempre. Aquí la cadena principal está en el otro lado del nitrógeno, no en el de '
  + 'tu cadena: ';

/** Where AMINE_SIDE puts the student's chain: the substituent on the nitrogen that holds it. */
const HOLDER = (side) => `Tu cadena es el sustituyente «${side}», que va unido al nitrógeno y se escribe con la letra «N» delante: `;

/** The ring-or-chain rule as the CARBONYL_PARENT message states it for the amino groups, before the counts. */
const RING_OR_CHAIN = 'La cadena principal es la que lleva más grupos amino, sea el anillo o una cadena abierta; solo si empatan '
  + 'manda el anillo. Aquí ';

/** NUMBERING and RING_NUMBERING at N0 for the amino groups. */
const N0 = 'los grupos amino (el grupo principal) tienen que llevar los números más bajos';

/**
 * One case per amine mistake (the former deliberate nulls of I-52c1, I-52c2
 * and I-52c3, then the variants): [name or tile words, code, trace rule, the
 * step «Ver el paso» opens, message].
 */
const CASES = [
  // 1. A principal amine written as an amino prefix: no suffix, or fewer amine groups in it; the groups on its nitrogen with `N`.
  ['aminoetano', 'CARBONYL_PREFIX', null, 'group', `El grupo amino es el grupo principal: se nombra ${WRITTEN('amina')}, no con el `
    + 'prefijo «amino». Se escribe «etanamina».'],
  ['2-aminopropano', 'CARBONYL_PREFIX', null, 'group', `El grupo amino es el grupo principal: se nombra ${WRITTEN('amina')}, no con `
    + 'el prefijo «amino». Se escribe «propan-2-amina».'],
  ['(metilamino)metano', 'CARBONYL_PREFIX', null, 'group', `El grupo amino es el grupo principal: se nombra ${WRITTEN('amina')}, no `
    + 'con el prefijo «metilamino». El otro grupo unido al nitrógeno va delante, con la letra «N» en vez de un número. Se escribe '
    + '«N-metilmetanamina».'],
  ['1-(dimetilamino)propano', 'CARBONYL_PREFIX', null, 'group', `El grupo amino es el grupo principal: se nombra ${WRITTEN('amina')}, `
    + 'no con el prefijo «dimetilamino». Los otros grupos unidos al nitrógeno van delante, con la letra «N» en vez de un número. Se '
    + 'escribe «N,N-dimetilpropan-1-amina».'],
  ['aminociclohexano', 'CARBONYL_PREFIX', null, 'group', `El grupo amino es el grupo principal: se nombra ${WRITTEN('amina')}, no con `
    + 'el prefijo «amino». Se escribe «ciclohexanamina».'],
  ['aminobenceno', 'CARBONYL_PREFIX', null, 'group', `El grupo amino es el grupo principal: se nombra ${WRITTEN('amina')}, no con el `
    + 'prefijo «amino». Se escribe «bencenamina».'],
  ['4-aminotolueno', 'CARBONYL_PREFIX', null, 'group', `El grupo amino es el grupo principal: se nombra ${WRITTEN('amina')}, no con el `
    + 'prefijo «amino». Se escribe «4-metilbencen-1-amina».'],
  ['4-aminobutan-1-amina', 'CARBONYL_PREFIX', null, 'group', 'Los grupos amino son el grupo principal: los de la cadena principal se '
    + `nombran todos juntos ${WRITTEN('diamina')}, no con el prefijo «amino». Se escribe «butano-1,4-diamina».`],
  ['1,3-diaminociclohexano', 'CARBONYL_PREFIX', null, 'group', 'Los grupos amino son el grupo principal: los del anillo se nombran '
    + `todos juntos ${WRITTEN('diamina')}, no con el prefijo «amino». Se escribe «ciclohexano-1,3-diamina».`],
  ['4-aminoanilina', 'CARBONYL_PREFIX', null, 'group', 'Los grupos amino son el grupo principal: los del anillo se nombran todos '
    + `juntos ${WRITTEN('diamina')}, no con el prefijo «amino». Se escribe «benceno-1,4-diamina».`],
  // 2. A junior amine beside a senior group: the order, how that group is written, the amine's prefix (or the amide it makes).
  ['2-hidroxietan-1-amina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el alcohol (–OH), que se nombra `
    + `${WRITTEN('ol')}; el grupo amino va delante, con el prefijo «amino». Se escribe «2-aminoetan-1-ol».`],
  ['N,N-dimetil-2-hidroxietan-1-amina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el alcohol (–OH), que se nombra `
    + `${WRITTEN('ol')}; el grupo amino va delante, con el prefijo «dimetilamino». Se escribe «2-(dimetilamino)etan-1-ol».`],
  ['2-hidroxipropano-1,3-diamina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el alcohol (–OH), que se nombra `
    + `${WRITTEN('ol')}; cada grupo amino va delante, con el prefijo «amino». Se escribe «1,3-diaminopropan-2-ol».`],
  ['4-hidroxianilina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el alcohol (–OH), que se nombra con «fenol» (el `
    + 'benceno con un grupo –OH); el grupo amino va delante, con el prefijo «amino». Se escribe «4-aminofenol».'],
  ['3-oxopropan-1-amina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el aldehído (–CHO), que se nombra `
    + `${WRITTEN('al')}; el grupo amino va delante, con el prefijo «amino». Se escribe «3-aminopropanal».`],
  ['3-oxobutan-1-amina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la cetona (C=O), que se nombra ${WRITTEN('ona')}; el `
    + 'grupo amino va delante, con el prefijo «amino». Se escribe «4-aminobutan-2-ona».'],
  ['3-cianopropan-1-amina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el nitrilo (–C≡N), que se nombra `
    + `${WRITTEN('nitrilo')}; el grupo amino va delante, con el prefijo «amino». Se escribe «4-aminobutanonitrilo».`],
  ['3-carboxipropan-1-amina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el ácido (–COOH), que se nombra con la palabra `
    + '«ácido» al principio del nombre y la terminación «-oico» al final; el grupo amino va delante, con el prefijo «amino». Se '
    + 'escribe «ácido 4-aminobutanoico».'],
  ['4-carboxianilina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el ácido (–COOH), que se nombra con «ácido benzoico» `
    + '(el benceno con un grupo –COOH); el grupo amino va delante, con el prefijo «amino». Se escribe «ácido 4-aminobenzoico».'],
  ['2-(acetiloxi)etan-1-amina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el éster (–COO–), que se nombra con la `
    + 'terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo»; el grupo amino va en el nombre del '
    + 'grupo unido al otro oxígeno, con el prefijo «amino». Se escribe «etanoato de 2-aminoetilo».'],
  // The amide: its nitrogen is the student's amine's (an acyl group on it, or a C=O on its carbon).
  ['N-acetiletanamina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se nombra `
    + `${WRITTEN('amida')}; ${IN_AMIDE}. Se escribe «N-etiletanamida».`],
  ['N-acetilanilina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se nombra `
    + `${WRITTEN('amida')}; ${IN_AMIDE}. Se escribe «N-feniletanamida».`],
  ['1-oxobutan-1-amina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se nombra `
    + `${WRITTEN('amida')}; ${IN_AMIDE}. Se escribe «butanamida».`],
  ['N-benzoiletanamina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se nombra `
    + `con «benzamida» (el benceno con un grupo amida); ${IN_AMIDE}. Se escribe «N-etilbenzamida».`],
  ['4-oxobutano-1,4-diamina', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se `
    + `nombra ${WRITTEN('amida')}; cada grupo amino va delante, con el prefijo «amino», salvo el que forma la amida con el C=O unido a `
    + 'su nitrógeno. Se escribe «4-aminobutanamida».'],
  // 3. The parent on the other side of the nitrogen: a longer chain, more substituents, a ring.
  ['N-etilmetanamina', 'AMINE_SIDE', 'P1', 'groupChain', `${SIDE}en ese lado hay una cadena de 2 carbonos, más larga que la tuya, de `
    + `1. ${HOLDER('metil')}«N-metiletanamina».`],
  ['N-propiletanamina', 'AMINE_SIDE', 'P1', 'groupChain', `${SIDE}en ese lado hay una cadena de 3 carbonos, más larga que la tuya, de `
    + `2. ${HOLDER('etil')}«N-etilpropan-1-amina».`],
  ['N-(2-metilpropil)etanamina', 'AMINE_SIDE', 'P1', 'groupChain', `${SIDE}en ese lado hay una cadena de 3 carbonos, más larga que la `
    + `tuya, de 2. ${HOLDER('etil')}«N-etil-2-metilpropan-1-amina».`],
  ['N,N-dietilmetanamina', 'AMINE_SIDE', 'P1', 'groupChain', `${SIDE}en ese lado hay una cadena de 2 carbonos, más larga que la tuya, `
    + `de 1. ${HOLDER('metil')}«N-etil-N-metiletanamina».`],
  ['N-(2-cloroetil)etanamina', 'AMINE_SIDE', 'P4', 'groupChain', `${SIDE}las cadenas de los dos lados empatan en longitud y en enlaces `
    + `dobles o triples, y la de ese lado tiene más sustituyentes (1; la tuya, 0). ${HOLDER('etil')}«2-cloro-N-etiletan-1-amina».`],
  ['N-fenilmetanamina', 'AMINE_SIDE', 'RING', 'benzene', `${SIDE}en ese lado está el benceno, y un anillo manda siempre sobre una `
    + `cadena abierta. ${HOLDER('metil')}«N-metilbencenamina».`],
  ['N-ciclohexiletanamina', 'AMINE_SIDE', 'RING', 'ring', `${SIDE}en ese lado hay un anillo, y un anillo manda siempre sobre una `
    + `cadena abierta. ${HOLDER('etil')}«N-etilciclohexanamina».`],
  ['N-(5-metilfenil)etanamina', 'AMINE_SIDE', 'RING', 'benzene', `${SIDE}en ese lado está el benceno, y un anillo manda siempre sobre `
    + `una cadena abierta. ${HOLDER('etil')}«N-etil-3-metilbencen-1-amina».`],
  // 4. The ring or a chain, decided by the amino groups: the chain with more, a tie (the ring), another nitrogen chosen.
  ['(aminometil)benceno', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo no lleva ninguno y la mejor cadena, `
    + 'uno, así que gana la cadena y el anillo va en una rama: «fenilmetanamina».'],
  ['(2-aminoetil)ciclohexano', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo no lleva ninguno y la mejor `
    + 'cadena, uno, así que gana la cadena y el anillo va en una rama: «2-ciclohexiletan-1-amina».'],
  ['2-(4-aminociclohexil)etan-1-amina', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo y la mejor cadena `
    + 'llevan uno cada uno, así que gana el anillo: «4-(2-aminoetil)ciclohexan-1-amina».'],
  ['1-(4-aminociclohexil)metanamina', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo y la mejor cadena `
    + 'llevan uno cada uno, así que gana el anillo: «4-(aminometil)ciclohexan-1-amina».'],
  // 5. Another chain with more amino groups (P0), also a chain with none; and told from the ether oxygen.
  ['3-(aminometil)pentano', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos amino (1; la tuya tiene 0). La '
    + 'cadena principal es la que lleva más grupos amino, aunque no sea la más larga.'],
  ['2-(aminometil)butan-1-amina', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos amino (2; la tuya tiene '
    + '1). La cadena principal es la que lleva más grupos amino, aunque no sea la más larga.'],
  ['(2-aminoetoxi)metano', 'ETHER_SIDE', 'P0', 'ether', 'El oxígeno del éter (–O–) corta la molécula en dos lados, y la cadena '
    + 'principal no puede pasar por él: se busca en uno de los dos lados, con las reglas de siempre. Aquí la cadena principal está en '
    + 'el otro lado del oxígeno, no en el de tu cadena: primero cuenta el grupo principal, y en ese lado hay un grupo amino y en tu '
    + 'cadena, ninguno. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: «2-metoxietan-1-amina».'],
  // 6. The amino groups numbered otherwise (N0): a chain, beside an `N`, a ring, benzene, one group whose 1 the engine leaves out.
  ['butan-3-amina', 'NUMBERING', 'N0', 'numbering', `Hay que numerar la cadena desde el otro extremo: ${N0} (2 en vez de 3).`],
  ['N-metilpropan-3-amina', 'NUMBERING', 'N0', 'numbering', `Hay que numerar la cadena desde el otro extremo: ${N0} (1 en vez de 3).`],
  ['ciclohexano-1,5-diamina', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en otro '
    + `carbono o contando hacia el otro lado: ${N0} (3 en vez de 5).`],
  ['benceno-1,5-diamina', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en otro carbono '
    + `o contando hacia el otro lado: ${N0} (3 en vez de 5).`],
  ['ciclohexan-2-amina', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en otro carbono '
    + `o contando hacia el otro lado: ${N0} (1 en vez de 2). En «ciclohexanamina» ese número ni siquiera se escribe.`],
  // 7. Needless suffix locants: the amino group's words; beside an `N` only the suffix's, and why the others stay.
  ['etan-1-amina', 'NEEDLESS_LOCANTS', null, 'numbering', 'En «etanamina» no se escriben números: solo hay una manera de colocar el '
    + 'grupo amino.'],
  ['bencen-1-amina', 'NEEDLESS_LOCANTS', null, 'assemble', 'En «bencenamina» no se escriben números: solo hay una manera de colocar el '
    + 'grupo amino.'],
  ['ciclohexan-1-amina', 'NEEDLESS_LOCANTS', null, 'ringNumbering', 'En «ciclohexanamina» no se escriben números: solo hay una manera '
    + 'de colocar el grupo amino.'],
  ['N-metiletan-1-amina', 'NEEDLESS_LOCANTS', null, 'numbering', 'En «N-metiletanamina» no se escriben números: solo hay una manera de '
    + 'colocar el grupo amino.'],
  ['1-cloro-N-metilmetan-1-amina', 'NEEDLESS_LOCANTS', null, 'assemble', 'En «1-cloro-N-metilmetanamina» no se escribe el número que '
    + 'dice en qué carbono de la cadena va el grupo amino: solo hay una manera de colocarlo. Los números de los sustituyentes sí se '
    + 'escriben: cuando hay una «N», se escriben siempre, para que quede claro qué va en un carbono y qué en el nitrógeno.'],
  // 8. The letter N is no number: it goes before the numbers.
  ['2,N-dimetilpropan-1-amina', 'LOCANT_ORDER', null, 'assemble', 'Los números de un mismo grupo se escriben de menor a mayor, y la '
    + 'letra «N» va antes que los números: «N,2-dimetil», no «2,N-dimetil».'],
];

test('one case per amine mistake: the code, its trace rule, the step «Ver el paso» opens and the message', () => {
  const seen = new Set();
  for (const [name, code, traceRule, opened, message] of CASES) {
    const verdict = read(name);
    const step = assertAmineDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule], [code, traceRule], `${name}: ${d.message}`);
    assert.equal(step.id, opened, `${name}: the step «Ver el paso» opens`);
    assert.equal(d.message, message, name);
    seen.add(code);
  } // End of the loop over the cases
  assert.deepEqual([...AMINE_CODES, ...SHARED_CODES].filter((code) => !seen.has(code)), [], 'every amine code has a case');
}); // End of test 'one case per amine mistake…'

test('the student\'s chain beside the parent, what the message is about and its tiles', () => {
  // AMINE_SIDE: the student's methyl apart from the app's ethyl; the focus is the ethyl and the nitrogen with its bonds; the tiles
  // are the student's `N-etil`, which holds the app's parent.
  const side = read('N-etilmetanamina');
  const d = side.diagnosis;
  const nitrogen = side.suffixAtoms[0].attachment;
  assert.deepEqual([d.student.atoms.length, d.parent.atoms.length], [1, 2]);
  assert.ok(!d.parent.atoms.some((id) => d.student.atoms.includes(id)), 'the chains share no atom');
  assert.deepEqual(sorted(d.focus.atoms), sorted([...d.parent.atoms, nitrogen]));
  assert.equal(d.focus.bonds.length, 1 + 2, 'the ethyl\'s bond and the nitrogen\'s two');
  assert.deepEqual(d.tiles, [0, 3], '«N», «et», «il»');
  assert.equal(d.rule, DIAGNOSES.LONGER_CHAIN.rule, 'the rule of the draft it replaces');
  assert.deepEqual(diagnosisLegend(d).map((e) => e.text), ['Cadena principal', 'Tu cadena']);
  // On a ring: the legend names the ring.
  assert.deepEqual(diagnosisLegend(read('N-ciclohexiletanamina').diagnosis).map((e) => e.text),
    ['Cadena principal (el anillo)', 'Tu cadena']);
  // CARBONYL_PREFIX: the amino prefix's nitrogen; its tiles.
  const prefix = read('aminoetano');
  const amino = prefix.prefixAtoms[0];
  assert.deepEqual(prefix.diagnosis.focus, { atoms: amino.atoms, bonds: [amino.bond, ...amino.bonds] });
  assert.deepEqual(prefix.diagnosis.tiles, [0, 1], '«amino»');
  // CARBONYL_SENIORITY: the student's amine group (its carbon and nitrogen); the suffix's tiles.
  const senior = read('2-hidroxietan-1-amina');
  const group = senior.suffixAtoms[0];
  assert.deepEqual(senior.diagnosis.focus, { atoms: [group.parentAtom, group.attachment], bonds: [group.bond] });
  assert.deepEqual(senior.diagnosis.tiles, [4, 6], '«1», «amina»');
}); // End of test 'the student's chain beside the parent…'

test('the step «Ver el paso» opens explains the amine rule the message states', () => {
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
  assert.match(opened('aminoetano'), /El grupo amino es el \[\[grupo principal\]\]: se nombra con el \[\[sufijo\]\] «-amina»/);
  assert.match(opened('(metilamino)metano'), /con la letra «N» en vez de un número/);
  assert.match(opened('2-hidroxietan-1-amina'), /Aquí manda el alcohol, así que el grupo amino se nombra con el \[\[prefijo\]\] «amino-»/);
  assert.match(opened('3-cianopropan-1-amina'), /ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina/);
  assert.match(opened('N-acetiletanamina'), /El C=O y el nitrógeno forman un solo grupo/);
  assert.match(opened('N-etilmetanamina'), /Decide la longitud: .* El otro lado es el sustituyente «metil», que se escribe con la letra N/);
  assert.match(opened('N-ciclohexiletanamina'), /un anillo manda siempre sobre una cadena abierta/);
  assert.match(opened('(aminometil)benceno'), /la cadena principal tiene que llevar el mayor número posible de grupos amino/);
  assert.match(opened('3-(aminometil)pentano'), /el mayor número posible de grupos amino/);
  assert.match(opened('butan-3-amina'), /los grupos amino \(el \[\[grupo principal\]\]\) deben tener los/);
  assert.match(opened('ciclohexano-1,5-diamina'), /los grupos amino \(el \[\[grupo principal\]\]\) deben tener los/);
  assert.match(opened('1-cloro-N-metilmetan-1-amina'), /cuando hay una «N», también se escriben/);
}); // End of test 'the step «Ver el paso» opens explains…'

/** What AMINE_SIDE adds when the best chain of the student's side runs through a branch on an end of the student's chain. */
const END_BRANCH = (branch) => `La rama «${branch}» está en el extremo de tu cadena, así que la alarga: es parte de la cadena de `
  + 'tu lado. ';

test('an end branch beside the nitrogen (I-52c4a review): AMINE_SIDE when the parent is across it, else BRANCH_AT_END', () => {
  // Lengthened through its end branch, the student's chain is still the losing side: the side is the mistake, the best chain of
  // the student's side compared («la de tu lado»), never the parent's length as if the branch reached it.
  const across = [
    ['N-propil-1-metilmetanamina', 'P1', `${SIDE}en ese lado hay una cadena de 3 carbonos, más larga que la de tu lado, de 2. `
      + `${END_BRANCH('metil')}${HOLDER('etil')}«N-etilpropan-1-amina».`],
    ['N-pentil-2-metiletan-1-amina', 'P1', `${SIDE}en ese lado hay una cadena de 5 carbonos, más larga que la de tu lado, de 3. `
      + `${END_BRANCH('metil')}${HOLDER('propil')}«N-propilpentan-1-amina».`],
    ['N-(2-cloroetil)-1-metilmetanamina', 'P4', `${SIDE}las cadenas de los dos lados empatan en longitud y en enlaces dobles o `
      + `triples, y la de ese lado tiene más sustituyentes (1; la de tu lado, 0). ${END_BRANCH('metil')}${HOLDER('etil')}`
      + '«2-cloro-N-etiletan-1-amina».'],
    ['N-propil-1,1-dimetilmetanamina', 'N0', `${SIDE}las cadenas de los dos lados empatan en longitud, en enlaces múltiples y en `
      + 'sustituyentes, y la de ese lado, bien numerada, da números más bajos a los grupos amino (1 en vez de 2). '
      + `${END_BRANCH('metil')}${HOLDER('isopropil')}«N-isopropilpropan-1-amina».`],
    // A ring on the nitrogen wins before any chain rule: no side's chain compared.
    ['N-fenil-2-metiletan-1-amina', 'RING', `${SIDE}en ese lado está el benceno, y un anillo manda siempre sobre una cadena abierta. `
      + `${HOLDER('propil')}«N-propilbencenamina».`],
  ];
  for (const [name, traceRule, message] of across) {
    const verdict = read(name);
    const step = assertAmineDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule, step.id], ['AMINE_SIDE', traceRule, traceRule === 'RING' ? 'benzene' : 'groupChain'],
      `${name}: ${d.message}`);
    assert.equal(d.message, message, name);
    assert.ok(!d.parent.atoms.some((id) => d.student.atoms.includes(id)), `${name}: the parent across the nitrogen`);
    assert.ok(d.focus.atoms.includes(verdict.suffixAtoms[0].attachment), `${name}: the nitrogen in the focus`);
  } // End of the loop over the cases across the nitrogen
  // The stripe, the focus, the tiles and the step agree with the message: the student's one carbon apart from the propyl, the
  // student's `N-propil` (which holds the parent), the rule of the draft replaced, the step comparing the two sides' chains.
  const verdict = read('N-propil-1-metilmetanamina');
  const d = verdict.diagnosis;
  assert.deepEqual([d.student.atoms.length, d.parent.atoms.length], [1, 3]);
  assert.deepEqual(sorted(d.focus.atoms), sorted([...d.parent.atoms, verdict.suffixAtoms[0].attachment]));
  assert.deepEqual(d.tiles, [0, 3], '«N», «prop», «il»');
  assert.equal(d.rule, DIAGNOSES.LONGER_CHAIN.rule);
  assert.deepEqual(diagnosisLegend(d).map((e) => e.text), ['Cadena principal', 'Tu cadena']);
  const explanation = diagnosisExplanation(verdict, explain);
  assert.match(explanation.steps[explanation.index].text.join(' '), new RegExp('Decide la longitud: en el lado de la '
    + '\\[\\[cadena principal\\]\\] hay una cadena de 3 carbonos; en el otro, la más larga tiene 2 carbonos\\.'));
  // The parent on the student's side (its chain lengthened through the end reaches it), or both sides alike (TIE, no side
  // mistake): BRANCH_AT_END, whose length is the parent's.
  for (const [name, length] of [['1-metilmetanamina', 2], ['N-metil-2-metiletan-1-amina', 3], ['N-etil-2-metiletan-1-amina', 3],
    ['N-isopropil-1,1-dimetilmetanamina', 3]]) {
    const own = read(name);
    assertAmineDiagnosis(own, name);
    assert.equal(own.diagnosis.code, 'BRANCH_AT_END', `${name}: ${own.diagnosis.message}`);
    assert.equal(own.diagnosis.message, `La rama «metil» está en el extremo de la cadena, así que la alarga: la cadena principal tiene `
      + `${length} carbonos.`, name);
  } // End of the loop over the cases on the student's side
  // Without such a branch nothing is added, and ETHER_SIDE's comparison keeps «la tuya».
  assert.equal(DIAGNOSIS_PHRASES.endBranch({}), '');
  assert.equal(DIAGNOSIS_PHRASES.etherSide({ reason: 'LONGER_CHAIN', length: 3, student: 2 }), 'en ese lado hay una cadena de 3 '
    + 'carbonos, más larga que la tuya, de 2');
}); // End of test 'an end branch beside the nitrogen…'

// ---------------------------------------------------------------------------
// The class names' own mistakes (phase I-52c4b).
// ---------------------------------------------------------------------------

/** The first words of the amine class-name messages (CLASS_GROUP_WORDS, CLASS_ORDER, CLASS_DI with `amine`). */
const LIKE = 'En un nombre como «metilamina», ';

/** CLASS_NAME_NONE with `amine`, before the engine's name. */
const NONE = 'Un nombre como «etilmetilamina» (los grupos unidos al nitrógeno y la palabra «amina», todo junto) solo lo doy cuando el '
  + 'nitrógeno lleva grupos sencillos: cadenas sin ramas unidas por su extremo (metil, etil, propil…), isopropil o tert-butil, sin '
  + 'enlaces dobles ni triples, sin anillos y sin más átomos que esos carbonos y el nitrógeno. Esta molécula se nombra con la '
  + 'terminación «-amina»: ';

/** CLASS_ORDER with `amine`, before the two groups. */
const ORDER = `${LIKE}los grupos unidos al nitrógeno se escriben por orden alfabético: `;

/** CLASS_DI with `amine`, before the names. */
const DI = `${LIKE}los grupos iguales unidos al nitrógeno se escriben una sola vez, con «di» o «tri» delante`;

/** CLASS_GROUP_WORDS with `amine`, before the engine's class name. */
const WORDS_FIRST = `${LIKE}cada grupo unido al nitrógeno se nombra con su forma más sencilla, sin números: metil, etil, propil…, `
  + 'isopropil o tert-butil. Se escribe ';

/**
 * One case per class-name message (phase I-52c4b; the former deliberate
 * «Amines» nulls of I-52c3 and their variants): [name, code, rule, the step
 * «Ver el paso» opens, tiles, message].
 */
const CLASS_CASES = [
  // `order`: the groups out of alphabetical order; `tert-` or a multiplier counted (hints); the plain word first on a tie.
  ['metiletilamina', 'CLASS_ORDER', 5, AMINE_CLASS_STEP, [0, 4], `${ORDER}«etil» va antes que «metil» (e antes que m). Se escribe `
    + '«etilmetilamina».'],
  ['propilmetilamina', 'CLASS_ORDER', 5, AMINE_CLASS_STEP, [0, 4], `${ORDER}«metil» va antes que «propil» (m antes que p). Se `
    + 'escribe «metilpropilamina».'],
  ['metiltert-butilamina', 'CLASS_ORDER', 5, AMINE_CLASS_STEP, [0, 3], `${ORDER}«tert-butil» va antes que «metil» (b antes que m). `
    + '«tert-» no cuenta para el orden. Se escribe «tert-butilmetilamina».'],
  ['dimetiletilamina', 'CLASS_ORDER', 5, AMINE_CLASS_STEP, [0, 5], `${ORDER}«etil» va antes que «metil» (e antes que m). Los `
    + 'prefijos di-, tri-… no cuentan para el orden. Se escribe «etildimetilamina».'],
  ['propildimetilamina', 'CLASS_ORDER', 5, AMINE_CLASS_STEP, [0, 5], `${ORDER}«metil» va antes que «propil» (m antes que p). Se `
    + 'escribe «dimetilpropilamina».'],
  ['tert-butilbutilamina', 'CLASS_ORDER', 5, AMINE_CLASS_STEP, [0, 3], `${ORDER}«butil» va antes que «tert-butil» (con las mismas `
    + 'letras, va primero el grupo sin «tert-»). Se escribe «butiltert-butilamina».'],
  // `multiplier`: a repeated group written twice, or with `bis`, `tris`; the repeated groups' tiles.
  ['metilmetilamina', 'CLASS_DI', 6, AMINE_CLASS_STEP, [0, 4], `${DI}: «dimetilamina», no «metilmetilamina».`],
  ['bis met il amina', 'CLASS_DI', 6, AMINE_CLASS_STEP, [0, 3], `${DI} («bis», «tris»… solo van delante de grupos que tienen sus `
    + 'propios sustituyentes): «dimetilamina», no «bismetilamina».'],
  ['tris met il amina', 'CLASS_DI', 6, AMINE_CLASS_STEP, [0, 3], `${DI} («bis», «tris»… solo van delante de grupos que tienen sus `
    + 'propios sustituyentes): «trimetilamina», no «trismetilamina».'],
  ['etilmetilmetilamina', 'CLASS_DI', 6, AMINE_CLASS_STEP, [2, 6], `${DI}: «etildimetilamina», no «etilmetilmetilamina».`],
  // `words`: a group in a style the class names never use; the tiles of that group alone.
  ['(propan-2-il)amina', 'CLASS_GROUP_WORDS', 2, AMINE_CLASS_STEP, [0, 4], `${WORDS_FIRST}«isopropilamina».`],
  ['(1-metiletil)amina', 'CLASS_GROUP_WORDS', 2, AMINE_CLASS_STEP, [0, 7], `${WORDS_FIRST}«isopropilamina».`],
  ['(propan-2-il)metilamina', 'CLASS_GROUP_WORDS', 2, AMINE_CLASS_STEP, [0, 4], `${WORDS_FIRST}«isopropilmetilamina».`],
  ['START 2 met il prop ano 2 il END amina', 'CLASS_GROUP_WORDS', 2, AMINE_CLASS_STEP, [0, 9], `${WORDS_FIRST}«tert-butilamina».`],
  // `none`: an amine with no class name; the substitutive name, and the retained one when the engine gives it; the class word.
  ['ciclohexilamina', 'CLASS_NAME_NONE', 2, AMINE_CLASS_STEP, [3, 4], `${NONE}«ciclohexanamina».`],
  ['fenilamina', 'CLASS_NAME_NONE', 2, AMINE_CLASS_STEP, [1, 2], `${NONE}«bencenamina» (también vale «anilina»).`],
  ['etenilamina', 'CLASS_NAME_NONE', 2, AMINE_CLASS_STEP, [3, 4], `${NONE}«etenamina».`],
  ['(2-cloroetil)metilamina', 'CLASS_NAME_NONE', 2, AMINE_CLASS_STEP, [8, 9], `${NONE}«2-cloro-N-metiletan-1-amina».`],
  ['(2-metilpropil)amina', 'CLASS_NAME_NONE', 2, AMINE_CLASS_STEP, [7, 8], `${NONE}«2-metilpropan-1-amina».`],
  ['metilciclohexilamina', 'CLASS_NAME_NONE', 2, AMINE_CLASS_STEP, [5, 6], `${NONE}«N-metilciclohexanamina».`],
  ['fenilmetilamina', 'CLASS_NAME_NONE', 2, AMINE_CLASS_STEP, [3, 4], `${NONE}«N-metilbencenamina» (también vale «N-metilanilina»).`],
  ['(2-aminoetil)amina', 'CLASS_NAME_NONE', 2, AMINE_CLASS_STEP, [6, 7], `${NONE}«etano-1,2-diamina».`],
  // A class name beside a senior group: the amine is no principal group (CARBONYL_SENIORITY, as for a student's `amina`).
  ['(2-hidroxietil)amina', 'CARBONYL_SENIORITY', 1, 'group', [6, 7], `${SENIORITY_FIRST}el alcohol (–OH), que se nombra `
    + `${WRITTEN('ol')}; el grupo amino va delante, con el prefijo «amino». Se escribe «2-aminoetan-1-ol».`],
  ['(2-hidroxietil)metilamina', 'CARBONYL_SENIORITY', 1, 'group', [8, 9], `${SENIORITY_FIRST}el alcohol (–OH), que se nombra `
    + `${WRITTEN('ol')}; el grupo amino va delante, con el prefijo «metilamino». Se escribe «2-(metilamino)etan-1-ol».`],
  ['(4-hidroxifenil)amina', 'CARBONYL_SENIORITY', 1, 'group', [5, 6], `${SENIORITY_FIRST}el alcohol (–OH), que se nombra con «fenol» `
    + '(el benceno con un grupo –OH); el grupo amino va delante, con el prefijo «amino». Se escribe «4-aminofenol».'],
  ['(2-oxopropil)amina', 'CARBONYL_SENIORITY', 1, 'group', [6, 7], `${SENIORITY_FIRST}la cetona (C=O), que se nombra ${WRITTEN('ona')}; `
    + 'el grupo amino va delante, con el prefijo «amino». Se escribe «1-aminopropan-2-ona».'],
  ['(carboximetil)amina', 'CARBONYL_SENIORITY', 1, 'group', [5, 6], `${SENIORITY_FIRST}el ácido (–COOH), que se nombra con la `
    + 'palabra «ácido» al principio del nombre y la terminación «-oico» al final; el grupo amino va delante, con el prefijo «amino». '
    + 'Se escribe «ácido 2-aminoetanoico».'],
  ['(1-oxoetil)amina', 'CARBONYL_SENIORITY', 1, 'group', [6, 7], `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se `
    + `nombra ${WRITTEN('amida')}; ${IN_AMIDE}. Se escribe «etanamida».`],
];

test('the class names\' own mistakes (I-52c4b): the code, its rule, the step «Ver el paso» opens, the tiles and the message', () => {
  const seen = new Set();
  for (const [name, code, rule, opened, tiles, message] of CLASS_CASES) {
    const verdict = read(name);
    const step = assertAmineDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.rule, d.traceRule, d.step], [code, rule, null, opened], `${name}: ${d.message}`);
    assert.equal(step.id, opened, `${name}: the step «Ver el paso» opens`);
    assert.equal(d.message, message, name);
    assert.deepEqual(d.tiles, tiles, `${name}: tiles`);
    // A class name has no chain of its own: no stripe, no legend.
    assert.deepEqual([d.student, diagnosisLegend(d)], [{ atoms: [], bonds: [] }, null], name);
    // The focus: the groups the message is about (none for CLASS_NAME_NONE), or the amine's nitrogen and its bond.
    const occurrences = verdict.prefixAtoms.filter((o) => o.tiles[0] >= tiles[0] && o.tiles[1] <= tiles[1]);
    if (code === 'CARBONYL_SENIORITY') {
      assert.ok(d.focus.atoms.includes(verdict.studentParent.atoms[0]) && d.focus.bonds.length === 1, name);
      assert.ok(!('className' in d), name);
    } else if (code === 'CLASS_NAME_NONE') {
      assert.deepEqual(d.focus, { atoms: [], bonds: [] }, name);
    } else {
      assert.deepEqual(sorted(d.focus.atoms), sorted(occurrences.flatMap((o) => o.atoms)), name);
    }
    seen.add(code);
  } // End of the loop over the class-name cases
  assert.deepEqual([...seen].sort(), ['CARBONYL_SENIORITY', 'CLASS_DI', 'CLASS_GROUP_WORDS', 'CLASS_NAME_NONE', 'CLASS_ORDER']);
}); // End of test 'the class names\' own mistakes (I-52c4b)…'

/**
 * The class-name diagnoses and what the step «Ver el paso» opens must say
 * (phase I-52c4b): [name, code, the substitutive name the other steps
 * explain, the groups as the step names them and the class name the message
 * recommends (null for CLASS_NAME_NONE)].
 */
const CLASS_STEP_CASES = [
  ['metiletilamina', 'CLASS_ORDER', 'N-metiletanamina', ['etil', 'metil'], 'etilmetilamina'],
  ['metiltert-butilamina', 'CLASS_ORDER', 'N,2-dimetilpropan-2-amina', ['tert-butil', 'metil'], 'tert-butilmetilamina'],
  ['metilmetilamina', 'CLASS_DI', 'N-metilmetanamina', ['metil', 'metil'], 'dimetilamina'],
  ['tris met il amina', 'CLASS_DI', 'N,N-dimetilmetanamina', ['metil', 'metil', 'metil'], 'trimetilamina'],
  ['etilmetilmetilamina', 'CLASS_DI', 'N,N-dimetiletanamina', ['etil', 'metil', 'metil'], 'etildimetilamina'],
  ['(propan-2-il)amina', 'CLASS_GROUP_WORDS', 'propan-2-amina', ['isopropil'], 'isopropilamina'],
  ['(propan-2-il)metilamina', 'CLASS_GROUP_WORDS', 'N-metilpropan-2-amina', ['isopropil', 'metil'], 'isopropilmetilamina'],
  ['ciclohexilamina', 'CLASS_NAME_NONE', 'ciclohexanamina', null, null],
  ['fenilamina', 'CLASS_NAME_NONE', 'bencenamina', null, null],
  ['(2-cloroetil)metilamina', 'CLASS_NAME_NONE', '2-cloro-N-metiletan-1-amina', null, null],
];

test('the class-name step (I-52c4b): right after «Reconoce el grupo funcional», it agrees with the message; its marks', () => {
  for (const [name, code, substitutive, groups, className] of CLASS_STEP_CASES) {
    const verdict = read(name);
    const d = verdict.diagnosis;
    assert.deepEqual([verdict.kind, verdict.name, d.code], ['otherName', substitutive, code], name);
    const opened = diagnosisExplanation(verdict, explain);
    const step = opened.steps[opened.index];
    // The class-name step, right after «Reconoce el grupo funcional»; explain()'s own steps all stay, in their order.
    assert.deepEqual([step.id, step.title, opened.steps[opened.index - 1].id], [AMINE_CLASS_STEP,
      'Monta el nombre tradicional de la amina', 'group'], name);
    assert.equal(step.title, AMINE_CLASS_STEP_TEXTS.title);
    assert.deepEqual(opened.steps.filter((s) => s.id !== AMINE_CLASS_STEP), explain(verdict.naming), name);
    const text = step.text.map(plainText);
    const all = text.join(' ');
    // The class name's form: the groups as branches, no numbers, alphabetical order without `tert-`, `di` / `tri`, `amina` last.
    for (const pattern of [/se nombran como ramas/, /sin números/, /por orden alfabético/, /«tert-»/, /con «di» o «tri» delante/,
      /palabra «amina»/, /junto/]) {
      assert.match(all, pattern, name);
    }
    // It tells it from the substitutive name of the other steps.
    assert.ok(all.includes('nombre sustitutivo'), `${name}: ${all}`);
    if (className) {
      // The groups and the name the step builds are the ones the message recommends.
      assert.deepEqual(d.className, { name: className, groups }, name);
      assert.ok(d.message.includes(`«${className}»`), `${name}: ${d.message}`);
      assert.ok(all.includes(`«${substitutive}»`), name);
      assert.ok(text[text.length - 1].endsWith(`Para esta molécula: «${className}».`), `${name}: ${text[text.length - 1]}`);
      const here = `aquí, ${DIAGNOSIS_PHRASES.amineClassGroups(groups)}.`;
      assert.ok(text.some((t) => t.endsWith(here)), `${name}: ${here}`);
      assert.match(text[0], /^El nombre que explican los otros pasos, «.+», es el que doy primero, el nombre sustitutivo/, name);
    } else {
      // No class name for this amine: the same condition as the message, and the substitutive name the other steps explain.
      assert.equal(d.className, null, name);
      const only = `Ese nombre solo lo doy cuando el nitrógeno lleva grupos sencillos: ${DIAGNOSIS_PHRASES.simpleAmineGroups}.`;
      assert.ok(text.includes(only) && d.message.includes(DIAGNOSIS_PHRASES.simpleAmineGroups), name);
      const traditional = verdict.naming.alternatives.find((alt) => alt.style === 'traditional');
      assert.equal(text[text.length - 1], 'Esta molécula no es una de esas aminas sencillas, así que no tiene ese nombre: se nombra '
        + `como en los otros pasos, con la terminación «-amina»: «${substitutive}»`
        + `${traditional ? ` (también vale «${traditional.name}»)` : ''}.`, name);
    }
    for (const paragraph of step.text) {
      parseMarkup(paragraph).filter((segment) => segment.term).forEach((segment) => assert.ok(GLOSSARY[segment.term], segment.term));
    }
    // Marks: each group bonded to the class name's nitrogen as a substituent, the nitrogen and its bonds; the whole molecule.
    const nitrogen = verdict.studentParent.atoms[0];
    const adj = adjacency(verdict.molecule);
    assert.equal(verdict.molecule.atoms.get(nitrogen).element, 'N', name);
    const n = adj.get(nitrogen).length;
    assert.deepEqual(step.highlight.map((h) => h.style), [...Array(n).fill('substituent'), 'candidate'], name);
    const center = step.highlight[n];
    assert.deepEqual(center, { atoms: [nitrogen], bonds: center.bonds, style: 'candidate' }, name);
    assert.deepEqual(sorted(center.bonds), sorted(adj.get(nitrogen).map((e) => e.bond)), name);
    assert.deepEqual(sorted(step.highlight.flatMap((h) => h.atoms)), sorted([...verdict.molecule.atoms.keys()]), name);
    assert.deepEqual(sorted(step.highlight.flatMap((h) => h.bonds)), sorted([...verdict.molecule.bonds.keys()]), name);
    assert.equal(step.locants, null, name);
  } // End of the loop over the class-name step cases
  // explain() alone has no class-name step: its fallback is «Reconoce el grupo funcional»; a CARBONYL_SENIORITY on a class name
  // opens explain()'s own steps, unchanged.
  const ordered = read('metiletilamina');
  const alone = explain(ordered.naming);
  assert.equal(alone[diagnosisStepIndex(alone, ordered.diagnosis)].id, 'group');
  const senior = read('(2-hidroxietil)amina');
  assert.deepEqual(diagnosisExplanation(senior, explain).steps, explain(senior.naming));
}); // End of test 'the class-name step (I-52c4b)…'

/**
 * The tile ids of an amine name with its `amina` suffix rewritten as `amino`
 * prefixes before the parent (`butan-2-amina` → `2-aminobutano`,
 * `butano-1,4-diamina` → `1,4-diaminobutano`, `bencenamina` →
 * `1-aminobenceno`; the locants the reading places); null for a name with a
 * group on the nitrogen (`N`), an old-style locant or no `amina` suffix.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asAminoPrefixes(ids) {
  const { tree } = parse(ids);
  const { suffix } = tree.parent;
  if (!suffix || ids[suffix.range[1] - 1] !== AMINA_ID || ids.includes(NITROGEN_ID) || tree.parent.legacy.length > 0
    || tree.parent.legacySuffix) {
    return null;
  }
  const locants = readName(ids).suffixAtoms.map((g) => g.locant).sort((p, q) => p - q).map((value) => tileId('num', value));
  const prefix = [...locants, ...(suffix.multiplier === null ? [] : [ids[suffix.multiplier]]), AMINO_ID];
  return [...prefix, ...ids.slice(0, suffix.range[0]), ...ids.slice(suffix.range[1])];
} // End of function asAminoPrefixes()

/** How many amine fixture names (of phase R-6c1, without `N`) have an `amina` suffix rewritten as amino prefixes. */
const SWEEP_COUNT = 31;

test('a sweep over the amine fixture names: every `amina` written as `amino` prefixes is CARBONYL_PREFIX, the same molecule', async () => {
  const names = (await readFixtures()).filter((row) => isAmine(row.smiles)).flatMap((row) => row.names)
    .filter((name) => isAmineName(name) && !isAminoName(name) && !isAmineTemplateName(name) && !isAmineClassName(name));
  let count = 0;
  for (const name of names) {
    const ids = tokenize(name);
    const mutated = asAminoPrefixes(ids);
    if (!mutated) {
      continue;
    }
    count += 1;
    const verdict = readName(mutated);
    const label = `${name} → ${verdict.text}`;
    assert.equal(verdict.kind, 'otherName', `${label}: ${verdict.message}`);
    assert.equal(verdict.name, readName(ids).name, `${label}: the same molecule`);
    assertAmineDiagnosis(verdict, label);
    assert.equal(verdict.diagnosis.code, 'CARBONYL_PREFIX', `${label}: ${verdict.diagnosis.message}`);
    // The name quoted is the engine's in the student's prefix style.
    assert.ok(verdict.diagnosis.message.endsWith(`«${diagnosisNaming(verdict).name}».`), `${label}: ${verdict.diagnosis.message}`);
    assert.ok(verdict.diagnosis.message.includes('no con el prefijo «amino»'), `${label}: ${verdict.diagnosis.message}`);
  } // End of the loop over the names
  assert.equal(count, SWEEP_COUNT);
}); // End of test 'a sweep over the amine fixture names…'

test('MISSING_LOCANTS names the amino groups when the suffix\'s locant is the one missing (diagnose() on its own)', () => {
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
  assert.equal(read('2-clorociclohexanamina').kind, 'missingLocants');
  const d = direct('2-clorociclohexanamina');
  assert.deepEqual([d.code, d.tiles], ['MISSING_LOCANTS', [5, 6]], 'the «amina» tile, whose locant is missing');
  assert.equal(d.message, 'Faltan números: hay que decir en qué carbono va cada rama, cada enlace doble o triple y cada grupo amino, '
    + 'como en «2-clorociclohexan-1-amina».');
}); // End of test 'MISSING_LOCANTS names the amino groups…'

test('the letter N is no number: LOCANT_COUNT counts the letters N and the numbers apart', () => {
  const cases = [
    ['N di met il et ano amina', 'Has puesto 1 letra N (N), pero «di» quiere decir dos grupos.'],
    ['N bis met il et ano amina', 'Has puesto 1 letra N (N), pero «bis» quiere decir dos grupos.'],
    ['N 2 tri met il prop ano 1 amina', 'Has puesto 1 letra N y 1 número (N,2), pero «tri» quiere decir tres grupos.'],
    ['N N 2 di met il prop ano 1 amina', 'Has puesto 2 letras N y 1 número (N,N,2), pero «di» quiere decir dos grupos.'],
    ['N N met il et ano amina', 'Con dos letras N hace falta «di».'],
    ['N 2 met il prop ano 1 amina', 'Con una letra N y un número hace falta «di».'],
    // Without an N the messages are unchanged.
    ['2 di met il but ano', 'Has puesto 1 número (2), pero «di» quiere decir dos grupos.'],
    ['2 3 met il but ano', 'Con dos números hace falta «di».'],
  ];
  for (const [words, message] of cases) {
    const verdict = readName(seq(words));
    assert.equal(verdict.kind, 'invalid', words);
    assert.deepEqual(verdict.errors.map((e) => [e.code, e.message]), [['LOCANT_COUNT', message]], words);
  }
}); // End of test 'the letter N is no number…'

test('the «Amines» null left: the templates\' prefix style (a pinned open question); an amide is «Amides»\' since I-52d4', () => {
  // The class names' own mistakes are named since phase I-52c4b (above); a retained word's prefix in another style
  // (`4-(propan-2-il)anilina`, the engine's `4-isopropilanilina`) is the cross-family open question.
  const style = read('4 prop ano 2 il anilina');
  assert.equal(style.kind, 'otherName', style.message);
  assert.equal(style.diagnosis, null, style.diagnosis && style.diagnosis.message);
  // An amino prefix on the –CHO's carbon is an amide (R-6d's null until phase I-52d4): diagnose.js «Amides»' AMIDE_GROUP.
  const amide = read('1 amino but ano al');
  assert.deepEqual([amide.kind, amide.name, amide.diagnosis.code], ['otherName', 'butanamida', 'AMIDE_GROUP']);
}); // End of test 'the «Amines» null left…'

test('controls: correct amine names have no diagnosis; a mistake the earlier rules name stays theirs', () => {
  for (const name of ['etanamina', 'propan-2-amina', 'butano-1,4-diamina', 'N-metiletanamina', 'N,N-dimetilpropan-1-amina',
    'ciclohexanamina', 'bencenamina', 'N-etilciclohexanamina', '2-aminoetan-1-ol', '4-aminofenol', 'etanoato de 2-aminoetilo',
    '4-(aminometil)ciclohexan-1-amina', '2-cloro-N-etiletan-1-amina']) {
    const verdict = read(name);
    assert.ok(['correct', 'alternative'].includes(verdict.kind), `${name}: ${verdict.kind}`);
    assert.ok(!('diagnosis' in verdict), name);
  }
  for (const [name, code] of [['1-metilpropan-1-amina', 'BRANCH_AT_END'], ['2-etilpropan-1-amina', 'LONGER_CHAIN'],
    ['N-metil-N-metiletanamina', 'UNGROUPED'], ['N,N-bismetiletanamina', 'MULTIPLIER_KIND'], ['5-metilbencen-1-amina', 'RING_NUMBERING'],
    ['2-butanamina', 'OLD_STYLE'], ['N-metilbencilamina', 'SUBSTITUTED_TEMPLATE'], ['N-etilbencilamina', 'SUBSTITUTED_TEMPLATE']]) {
    const verdict = read(name);
    assert.equal(verdict.kind, 'otherName', `${name}: ${verdict.message}`);
    assert.equal(verdict.diagnosis.code, code, `${name}: ${verdict.diagnosis.message}`);
  }
  // Two sides of the nitrogen alike (TIE): no side mistake, the needless suffix locant speaks.
  assert.equal(read('N-etiletan-1-amina').diagnosis.code, 'NEEDLESS_LOCANTS');
  // With the suffix's locant left out a reading numbers the amine from the other end (NUMBERING at N0, rule 4); the kindest
  // reading's rule (UNGROUPED, rule 6) is kept.
  assert.equal(read('N met il N met il et ano amina').diagnosis.code, 'UNGROUPED');
  // The other families' own checks keep their codes beside an amine group: an acid's –COOH written as two groups.
  assert.equal(read('4-amino-1-hidroxi-1-oxobutano').diagnosis.code, 'ACID_GROUP');
}); // End of test 'controls…'

test('the drafts of the amine rules: their place among the rules, their steps, every variant renders', () => {
  assert.deepEqual(AMINE_CODES.map((code) => [DIAGNOSES[code].rule, DIAGNOSES[code].step]), [[2, 'groupChain']]);
  // AMINE_SIDE beside ETHER_SIDE, its twin.
  assert.equal(DIAGNOSIS_CODES[DIAGNOSIS_CODES.indexOf('AMINE_SIDE') - 1], 'ETHER_SIDE');
  for (const code of [...AMINE_CODES, ...SHARED_CODES]) {
    const text = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    assert.match(text, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(text, /undefined|null|NaN/, code);
  }
  assert.equal(DIAGNOSES.AMINE_SIDE.example.name, 'N-metiletanamina');
  assert.equal(DIAGNOSIS_TEXTS.AMINE_SIDE(DIAGNOSES.AMINE_SIDE.example), `${SIDE}en ese lado hay una cadena de 2 carbonos, más larga `
    + `que la tuya, de 1. ${HOLDER('metil')}«N-metiletanamina».`);
  const { groupWords, carbonylN0, what, principal, junior, amineSeniority, ending, nitrogenGroups, amineHolder } = DIAGNOSIS_PHRASES;
  // The amino group's words, as the explanation says them (SUFFIX_GROUP_WORDS: «grupo amino»).
  assert.deepEqual(groupWords.amine, { one: 'grupo amino', many: 'grupos amino' });
  assert.equal(carbonylN0.numberingReasons.amine, N0);
  assert.equal(carbonylN0.lowerLocantsOf.amine, 'los grupos amino');
  assert.deepEqual([what.amine, what.amines], ['el grupo amino', 'los grupos amino']);
  assert.deepEqual([principal.alcohol, principal.amide], ['el alcohol (–OH)', 'la amida (un C=O unido a un nitrógeno)']);
  assert.deepEqual([...junior.amine], ['el grupo amino', 'cada grupo amino']);
  // The seniority beside a junior amine is naming/seniority.js's whole order, in its Spanish words.
  const spanish = { acid: 'ácido', ester: 'éster', amide: 'amida', nitrile: 'nitrilo', aldehyde: 'aldehído', ketone: 'cetona',
    alcohol: 'alcohol', amine: 'amina' };
  assert.equal(amineSeniority, SENIORITY.map((kind) => spanish[kind]).join(' > '));
  for (const group of ['acid', 'ester', 'nitrile', 'aldehyde', 'ketone', 'alcohol', 'amide']) {
    assert.equal(DIAGNOSIS_PHRASES.seniorityOf({ group, junior: 'amine' }), amineSeniority, group);
  }
  assert.equal(DIAGNOSIS_PHRASES.seniorityOf({ group: 'ketone', junior: 'alcohol' }), 'aldehído > cetona > alcohol', 'unchanged');
  // How the senior groups are written beside a junior amine: `fenol`, `benzamida`.
  assert.equal(ending({ ending: 'ol', phenol: true }), 'con «fenol» (el benceno con un grupo –OH)');
  assert.equal(ending({ ending: 'carboxamida', benzamide: true }), 'con «benzamida» (el benceno con un grupo amida)');
  assert.equal(ending({ ending: 'amina' }), WRITTEN('amina'));
  assert.deepEqual([nitrogenGroups(1), nitrogenGroups(2)], ['El otro grupo unido al nitrógeno va delante, con la letra «N» en vez de '
    + 'un número.', 'Los otros grupos unidos al nitrógeno van delante, con la letra «N» en vez de un número.']);
  assert.equal(amineHolder({ side: null }), 'Tu cadena va unida al nitrógeno, y se escribe con la letra «N» delante');
  // The shared codes speak of the amino groups by their group: prefix, seniority, parent choice, P0, N0, suffix locants.
  assert.equal(DIAGNOSIS_TEXTS.CARBONYL_SENIORITY({ group: 'alcohol', ending: 'ol', junior: 'amine', count: 1, prefix: 'amino',
    inAmide: 0, name: 'X' }), `${SENIORITY_FIRST}el alcohol (–OH), que se nombra ${WRITTEN('ol')}; el grupo amino va delante, con el `
    + 'prefijo «amino». Se escribe «X».');
  assert.match(DIAGNOSIS_TEXTS.CARBONYL_PARENT({ group: 'amine', ring: 1, chain: 1, chainParent: false, name: 'X' }),
    /^La cadena principal es la que lleva más grupos amino/);
  assert.match(DIAGNOSIS_TEXTS.MORE_CARBONYL_GROUPS({ group: 'amine', app: 2, student: 1 }), /^Hay otra cadena con más grupos amino/);
  assert.equal(DIAGNOSIS_TEXTS.CHAIN_LOCANTS({ rule: 'N0', group: 'amine', app: '1', student: '2' }), 'Hay otra cadena igual de larga '
    + 'que, bien numerada, da números más bajos a los grupos amino (1 en vez de 2): esa es la cadena principal.');
  assert.equal(DIAGNOSIS_TEXTS.NEEDLESS_LOCANTS({ name: 'X', what: what.amines, kept: false }), 'En «X» no se escriben números: solo '
    + 'hay una manera de colocar los grupos amino.');
  assert.equal(DIAGNOSIS_TEXTS.LOCANT_ORDER({ right: '2,3', student: '3,2', nitrogen: false }), 'Los números de un mismo grupo se '
    + 'escriben de menor a mayor: «2,3», no «3,2».', 'without an N, unchanged');
  assert.equal(DIAGNOSIS_PHRASES.etherSide({ reason: 'CARBONYL_PARENT', group: 'amine', ring: 1, chain: 1, chainParent: false }),
    'primero cuenta el grupo principal, y los dos lados llevan un grupo amino cada uno; en el empate, manda el anillo');
  // The class names (phase I-52c4b): the ether's class-name codes with `amine`, which speak of the nitrogen, never of an ether.
  for (const code of ['CLASS_NAME_NONE', 'CLASS_GROUP_WORDS', 'CLASS_ORDER', 'CLASS_DI']) {
    const ether = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    const amine = DIAGNOSIS_TEXTS[code]({ ...DIAGNOSES[code].example, amine: true, name: 'X', right: 'X', student: 'Y' });
    assert.match(amine, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(amine, /undefined|null|NaN|éter|oxígeno|-oxi/, code);
    assert.match(amine, /nitrógeno/, code);
    assert.match(ether, /éter|oxígeno/, `${code}: the ether's message unchanged`);
  }
  assert.equal(DIAGNOSIS_TEXTS.CLASS_DI({ amine: true, compound: false, right: 'dimetilamina', student: 'metilmetilamina' }),
    `${DI}: «dimetilamina», no «metilmetilamina».`);
  assert.equal(DIAGNOSIS_TEXTS.CLASS_NAME_NONE({ amine: true, name: 'bencenamina', traditional: 'anilina' }),
    `${NONE}«bencenamina» (también vale «anilina»).`);
  const { amineClassGroups, simpleAmineGroups, compoundOnly } = DIAGNOSIS_PHRASES;
  assert.deepEqual([['metil'], ['metil', 'metil'], ['metil', 'metil', 'metil'], ['etil', 'metil'], ['etil', 'metil', 'metil'],
    ['etil', 'metil', 'propil']].map(amineClassGroups), ['«metil»', 'los dos son «metil»', 'los tres son «metil»',
    '«etil» y «metil»', '«etil» y dos «metil»', '«etil», «metil» y «propil»']);
  assert.ok(simpleAmineGroups.endsWith('sin más átomos que esos carbonos y el nitrógeno'));
  assert.equal(compoundOnly, ' («bis», «tris»… solo van delante de grupos que tienen sus propios sustituyentes)');
  // The class-name step: its fallback, its paragraphs render.
  assert.deepEqual([...STEP_FALLBACKS[AMINE_CLASS_STEP]], ['group', 'count']);
  const texts = AMINE_CLASS_STEP_TEXTS;
  for (const paragraph of [texts.substitutive({ substitutive: 'X' }), texts.groups({ groups: ['etil', 'metil'] }), texts.order,
    texts.di, texts.word({ name: 'X' }), texts.general, texts.generalForm, texts.only, texts.none({ substitutive: 'X' }),
    texts.none({ substitutive: 'X', traditional: 'Y' })]) {
    assert.match(paragraph, /^[«A-ZÁÉÍÓÚ].*\.$/u, paragraph);
    assert.doesNotMatch(paragraph, /undefined|null|NaN|éter|oxígeno/, paragraph);
  }
}); // End of test 'the drafts of the amine rules…'
