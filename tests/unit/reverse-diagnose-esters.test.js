/**
 * @file Unit tests for the ester diagnoses of «¿Cómo se dibuja?»
 * (src/reverse/diagnose.js header «Esters», design.md §13.4 I-35, I-39c,
 * I-40d, I-45c, §15.8 R-6a; phase I-52a3a, R-6a3a): one case per mistake of
 * the principal –COO– group that phases I-52a1, I-52a2a and I-52a2b left as a
 * deliberate null — a –COO– written as two groups on one carbon
 * (ESTER_GROUP), a junior group as the suffix beside the –COO–, or an ester's
 * suffix beside an acid's –COOH (CARBONYL_SENIORITY, with KETONE_NOT_ALDEHYDE
 * for an `al` a branch makes a ketone's), the –COO–'s carbon on the other
 * side of the parent (ESTER_CARBON), a principal –COO– written as an ester
 * prefix (CARBONYL_PREFIX), the ring against a chain decided by the –COO–
 * groups (CARBONYL_PARENT), another chain with more –COO– groups
 * (MORE_CARBONYL_GROUPS, P0, and its ether side), an alkoxycarbonyl prefix
 * whose C=O carbon the engine takes into the chain beside an acid
 * (ESTER_IN_CHAIN), the –COO– groups numbered otherwise (N0, RING_NUMBERING)
 * and the suffix's needless locants (NEEDLESS_LOCANTS) — each with its code,
 * trace rule, message and the step «Ver el paso» opens; the student's chain
 * beside the parent, the focus and the tiles; the explanation step each opens
 * says the rule; two sweeps over the ester fixture names (every single `oato`
 * written as `oxo` and an alkoxy prefix on carbon 1, every single
 * `carboxilato` and `benzoato` as an alkoxycarbonyl prefix); MISSING_LOCANTS
 * with the –COO– groups' words; controls; the drafts. Phase I-52a3b
 * (R-6a3b): the former deliberate nulls — the O-bound side (a retained ester
 * word with the group in another style, ESTER_TRADITIONAL; a group's ring
 * numbering, chain, needless locants or other words, BRANCH_RING_NUMBERING,
 * ESTER_ALKYL_CHAIN, NEEDLESS_LOCANTS, ESTER_ALKYL_NAME; the side's order,
 * grouping and multiplier, ALPHABETICAL_ORDER, UNGROUPED, MULTIPLIER_KIND),
 * an ester prefix's own words (ESTER_PREFIX_NAME, ACYL_NAME) and an ester
 * written as an ether class name (ESTER_CLASS_NAME) — each with its code,
 * message, the step «Ver el paso» opens, its tiles and the student's chain.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { esterGroupsOf } from '../../src/reverse/assemble.js';
import {
  OATO_ID, CARBOXYLATE_ID, BENZOATE_ID, BENZENE_ID, ESTER_ALKYL_ID, ALKOXY_ID, OXO_ID, RING_CARBONYL_ID, START_ID, END_ID, tileById,
  tileId,
} from '../../src/reverse/tiles.js';
import {
  diagnose, diagnosisNaming, diagnosisExplanation, DIAGNOSES, DIAGNOSIS_CODES, DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES, STEP_FALLBACKS,
} from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { diagnosisLegend } from '../../src/ui/draw-name.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { seq, readFixtures, isEster, isEsterName, isEsterTemplateName } from './reverse-words.js';

/** The codes only an ester gives (diagnose.js header «Esters»). */
const ESTER_CODES = Object.freeze(['ESTER_GROUP', 'ESTER_CARBON', 'ESTER_IN_CHAIN']);

/**
 * The codes of phase I-52a3b only an ester gives (diagnose.js «Esters»: an ether class name whose oxygen is an ester's, a
 * retained ester word's O-bound side, an ester prefix's kind, an O-bound group's chain or words), in DIAGNOSES order.
 */
const SIDE_CODES = Object.freeze(['ESTER_CLASS_NAME', 'ESTER_TRADITIONAL', 'ESTER_PREFIX_NAME', 'ESTER_ALKYL_CHAIN', 'ESTER_ALKYL_NAME']);

/** The codes whose message holds for the O-bound side, with its own words (`oBound`; phase I-52a3b). */
const OBOUND_SHARED_CODES = Object.freeze(['BRANCH_RING_NUMBERING', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND',
  'NEEDLESS_LOCANTS']);

/** The codes an ester shares with the aldehydes, ketones and acids, their words keyed by the –COO– (diagnose.js «Esters»). */
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
 * Asserts the invariants of a diagnosed `otherName` verdict of an ester's own
 * mistake: the engine's principal group a –COO– (or, for the ester prefixes
 * and suffixes beside an acid, a –COOH); a known code with its rule; a Spanish
 * message with every blank filled that never speaks of «grupo(s) –OH» or of
 * a –COOH beside an ester principal group; a JSON-safe object; atom and bond
 * ids of the verdict's molecule; the student's chain — or ring, its closing
 * bond last — a path of bonds; the app's parent the naming's (in the
 * diagnosis's style); a step that diagnosisExplanation() resolves and opens.
 *
 * @param {object} verdict - An `otherName` verdict with a diagnosis.
 * @param {string} label - Assertion label.
 * @returns {object} The explanation step «Ver el paso» opens.
 */
function assertEsterDiagnosis(verdict, label) {
  const d = verdict.diagnosis;
  assert.equal(verdict.kind, 'otherName', label);
  const principal = verdict.naming.structure.suffix.kind;
  assert.ok(['ester', 'acid'].includes(principal), `${label}: ${principal}`);
  assert.ok(d, `${label}: no diagnosis`);
  assert.ok(DIAGNOSES[d.code], `${label}: ${d.code}`);
  if (d.code !== 'ETHER_SIDE') {
    assert.equal(d.rule, DIAGNOSES[d.code].rule, label); // ETHER_SIDE keeps the rule of the draft it replaces.
  }
  assert.ok(d.message.length > 0 && !/undefined|null|NaN|\[object|grupo –OH \(|grupos –OH/.test(d.message), `${label}: ${d.message}`);
  if (principal === 'ester') {
    assert.doesNotMatch(d.message, /–COOH/, `${label}: ${d.message}`);
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
} // End of function assertEsterDiagnosis()

/** How the engine writes one –COO– on a chain (ESTER_GROUP, ESTER_CARBON, CARBONYL_SENIORITY, CARBONYL_PREFIX). */
const WRITTEN = (ending) => `con la terminación «-${ending}» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo»`;

/** The same for several –COO– groups. */
const WRITTEN_MANY = (ending) => `con la terminación «-${ending}» y, después de «de», los grupos unidos a los otros oxígenos, `
  + 'acabados en «-ilo»';

/** The same for benzene with one –COO–. */
const BENZOATE = 'con «benzoato» (el benceno con un grupo –COO–) y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo»';

/** How an acid's –COOH is written (CARBONYL_SENIORITY beside an ester's suffix). */
const ACID_WRITTEN = 'con la palabra «ácido» al principio del nombre y la terminación «-oico» al final';

/** The first sentence of ESTER_GROUP. */
const ONE_GROUP = 'Un C=O y un oxígeno unido a otro grupo de carbonos, en el mismo carbono, no son dos grupos distintos: juntos forman un '
  + 'solo grupo, el –COO– de los ésteres (su C=O no es un aldehído ni una cetona, ni su oxígeno del medio un éter). ';

/** The seniority sentence CARBONYL_SENIORITY starts with beside an ester, or with an ester beside an acid. */
const SENIORITY = 'Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: ácido > éster > aldehído > '
  + 'cetona > alcohol. Aquí manda ';

/** The rule ESTER_CARBON states on a chain. */
const ON_CHAIN = 'La terminación «-carboxilato» solo se usa cuando el grupo –COO– está unido a un anillo. En una cadena, el carbono '
  + 'del –COO– es un carbono más de la cadena principal, siempre en un extremo, y el grupo se nombra ';

/** The rule ESTER_CARBON states beside a ring. */
const ON_RING = 'Cuando el grupo –COO– está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la '
  + 'cadena principal es el anillo, y el grupo se nombra ';

/** How the engine writes an ester whose C=O carbon is a parent carbon beside an acid (ESTER_IN_CHAIN, CARBONYL_SENIORITY). */
const CHAIN_ESTER = 'con dos prefijos con el mismo número: «oxo» para su C=O y uno acabado en «-oxi» para su oxígeno del medio con el '
  + 'grupo unido a él';

/** The ring-or-chain rule as the CARBONYL_PARENT message states it for the –COO– groups, before the counts. */
const RING_OR_CHAIN = 'La cadena principal es la que lleva más grupos –COO–, sea el anillo o una cadena abierta; solo si empatan manda '
  + 'el anillo. Aquí ';

/** RING_NUMBERING at N0 for the –COO– groups, before the locants. */
const N0 = 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los grupos –COO– (el '
  + 'grupo principal) tienen que llevar los números más bajos ';

/** The sentence of an acyloxy prefix's CARBONYL_PREFIX: the student's chain or ring is the O-bound group. */
const O_BOUND = (mine) => ` ${mine} va en el grupo unido al otro oxígeno, después de «de».`;

/**
 * One case per ester mistake (the former deliberate nulls of I-52a1, I-52a2a
 * and I-52a2b, by category, then the variants): [name or tile words, code,
 * trace rule, the step «Ver el paso» opens, message].
 */
const CASES = [
  // 1. `seniority`: the –COO– written as two groups on one carbon (`al`, `oxo` or `ol` beside an alkoxy prefix).
  ['1-metoxipropanal', 'ESTER_GROUP', null, 'group', `${ONE_GROUP}El grupo –COO– es el grupo principal: se nombra ${WRITTEN('oato')}. `
    + 'Se escribe «propanoato de metilo».'],
  ['1 met il oxi 1 oxo prop ano', 'ESTER_GROUP', null, 'group', `${ONE_GROUP}El grupo –COO– es el grupo principal: se nombra `
    + `${WRITTEN('oato')}. Se escribe «propanoato de metilo».`],
  ['3-metoxi-3-oxopropan-1-ol', 'ESTER_GROUP', null, 'group', `${ONE_GROUP}El grupo –COO– es el grupo principal: se nombra `
    + `${WRITTEN('oato')}. Se escribe «3-hidroxipropanoato de metilo».`],
  ['START met il oxi oxo met il END benceno', 'ESTER_GROUP', null, 'group', `${ONE_GROUP}El grupo –COO– es el grupo principal: se `
    + `nombra ${BENZOATE}. Se escribe «benzoato de metilo».`],
  ['START 2 met il oxi 2 oxo et il END ciclo hex ano', 'ESTER_GROUP', null, 'group', `${ONE_GROUP}El grupo –COO– es el grupo `
    + `principal: se nombra ${WRITTEN('oato')}. Se escribe «2-ciclohexiletanoato de metilo».`],
  // `seniority`: an ester prefix beside no group senior to an ester — the principal –COO– as the prefix, or beside a junior suffix.
  ['(acetiloxi)metano', 'CARBONYL_PREFIX', null, 'group', 'El grupo –COO– es el grupo principal: no se nombra con el prefijo '
    + `«acetiloxi», sino ${WRITTEN('oato')}.${O_BOUND('Tu cadena')} Se escribe «etanoato de metilo».`],
  ['(benzoiloxi)benceno', 'CARBONYL_PREFIX', null, 'group', 'El grupo –COO– es el grupo principal: no se nombra con el prefijo '
    + `«benzoiloxi», sino ${BENZOATE}.${O_BOUND('Tu anillo')} Se escribe «benzoato de fenilo».`],
  ['(acetiloxi)benceno', 'CARBONYL_PREFIX', null, 'group', 'El grupo –COO– es el grupo principal: no se nombra con el prefijo '
    + `«acetiloxi», sino ${WRITTEN('oato')}.${O_BOUND('Tu anillo')} Se escribe «etanoato de fenilo».`],
  ['(metoxicarbonil)benceno', 'CARBONYL_PREFIX', null, 'group', 'El grupo –COO– es el grupo principal: no se nombra con el prefijo '
    + `«metoxicarbonil», sino ${BENZOATE}. Se escribe «benzoato de metilo».`],
  ['1-(metoxicarbonil)propano', 'CARBONYL_PREFIX', null, 'group', 'El grupo –COO– es el grupo principal: no se nombra con el prefijo '
    + `«metoxicarbonil», sino ${WRITTEN('oato')}. Su carbono entra en la cadena principal. Se escribe «butanoato de metilo».`],
  ['[2-(acetiloxi)etil]benceno', 'CARBONYL_PREFIX', null, 'group', 'El grupo –COO– es el grupo principal: no se nombra con el '
    + `prefijo «acetiloxi», sino ${WRITTEN('oato')}.${O_BOUND('Tu anillo')} Se escribe «etanoato de 2-feniletilo».`],
  ['2-(acetiloxi)heptanal', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}el éster (–COO–), que se nombra ${WRITTEN('oato')}; el `
    + '–CHO del aldehído va en el nombre del grupo unido al otro oxígeno, con el prefijo «oxo». Se escribe «etanoato de '
    + '1-oxoheptan-2-ilo».'],
  ['3-(metoxicarbonil)pentan-2-ona', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}el éster (–COO–), que se nombra `
    + `${WRITTEN('oato')}; el C=O de la cetona va delante, con el prefijo «oxo». Se escribe «2-etil-3-oxobutanoato de metilo».`],
  ['2-(acetiloxi)etan-1-ol', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}el éster (–COO–), que se nombra ${WRITTEN('oato')}; el `
    + '–OH va en el nombre del grupo unido al otro oxígeno, con el prefijo «hidroxi». Se escribe «etanoato de 2-hidroxietilo».'],
  ['3-(acetiloxi)-1-metilpropanal', 'KETONE_NOT_ALDEHYDE', null, 'group', 'El grupo –CHO de un aldehído va en un extremo de la '
    + 'cadena: su carbono solo puede unirse a un carbono más. Aquí la rama «metil» está en el carbono 1, que así queda unido a dos '
    + 'carbonos: su C=O es el de una cetona, no el de un aldehído. Se escribe «etanoato de 3-oxobutilo».'],
  // `seniority`, the reverse: a student's ester suffix beside the engine's –COOH (its C=O carbon in the chain, or an acyloxy).
  ['4-carboxibutanoato de metilo', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}el ácido (–COOH), que se nombra ${ACID_WRITTEN}; `
    + `el –COO– del éster va delante, ${CHAIN_ESTER}. Se escribe «ácido 5-metoxi-5-oxopentanoico».`],
  ['etanoato de 2-carboxietilo', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}el ácido (–COOH), que se nombra ${ACID_WRITTEN}; `
    + 'el –COO– del éster va delante, con el prefijo «acetiloxi». Se escribe «ácido 3-(acetiloxi)propanoico».'],
  // 2. `count`: another number of –COO– groups — one written as two groups or as an alkoxycarbonyl prefix of the parent.
  ['4-metoxi-4-oxobutanoato de metilo', 'ESTER_GROUP', null, 'group', `${ONE_GROUP}Los grupos –COO– son el grupo principal: los de la `
    + `cadena principal se nombran todos juntos ${WRITTEN_MANY('dioato')}. Se escribe «butanodioato de dimetilo».`],
  ['2-(2-metoxi-2-oxoetil)propanoato de metilo', 'ESTER_GROUP', null, 'group', `${ONE_GROUP}Los grupos –COO– son el grupo `
    + `principal: los de la cadena principal se nombran todos juntos ${WRITTEN_MANY('dioato')}. Se escribe «2-metilbutanodioato de `
    + 'dimetilo».'],
  ['3-(metoxicarbonil)propanoato de metilo', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –COO– son el grupo principal: los de la '
    + `cadena principal no se nombran con el prefijo «metoxicarbonil», sino todos juntos ${WRITTEN_MANY('dioato')}. Su carbono entra `
    + 'en la cadena principal. Se escribe «butanodioato de dimetilo».'],
  ['1,3-bis(metoxicarbonil)ciclohexano', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –COO– son el grupo principal: los unidos al '
    + `anillo no se nombran con el prefijo «metoxicarbonil», sino todos juntos ${WRITTEN_MANY('dicarboxilato')}. Se escribe `
    + '«ciclohexano-1,3-dicarboxilato de dimetilo».'],
  // 3. `carbon`: `carboxilato` on a chain; the –COO–'s carbon as the chain beside a ring, the template `formiato` too.
  ['propano-1-carboxilato de metilo', 'ESTER_CARBON', null, 'group', `${ON_CHAIN}${WRITTEN('oato')}. Se escribe «butanoato de metilo».`],
  ['ciclohexilmetanoato de metilo', 'ESTER_CARBON', null, 'group', `${ON_RING}${WRITTEN('carboxilato')}. Se escribe `
    + '«ciclohexanocarboxilato de metilo».'],
  ['fenilmetanoato de metilo', 'ESTER_CARBON', null, 'group', `${ON_RING}${BENZOATE}. Se escribe «benzoato de metilo».`],
  ['fenilformiato de metilo', 'ESTER_CARBON', null, 'group', `${ON_RING}${BENZOATE}. Se escribe «benzoato de metilo».`],
  ['(4-clorofenil)formiato de metilo', 'ESTER_CARBON', null, 'group', `${ON_RING}${BENZOATE}. Se escribe «4-clorobenzoato de metilo».`],
  // 4. The ring or a chain decided by the –COO– groups; another chain with more (P0), told from an ether oxygen too.
  ['[(metoxicarbonil)metil]ciclohexano', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo no lleva ninguno y `
    + 'la mejor cadena, uno, así que gana la cadena y el anillo va en una rama: «2-ciclohexiletanoato de metilo».'],
  ['[4-(metoxicarbonil)fenil]metano', 'CARBONYL_PARENT', 'RING', 'benzene', `${RING_OR_CHAIN}el anillo lleva uno y las cadenas no `
    + 'llevan ninguno, así que gana el anillo: «4-metilbenzoato de metilo».'],
  ['2-[(metoxicarbonil)metil]propanoato de metilo', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos '
    + '–COO– (2; la tuya tiene 1). La cadena principal es la que lleva más grupos –COO–, aunque no sea la más larga.'],
  ['3-[(metoxicarbonil)metil]pentano', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos –COO– (1; la '
    + 'tuya tiene 0). La cadena principal es la que lleva más grupos –COO–, aunque no sea la más larga.'],
  ['[2-(metoxicarbonil)etoxi]metano', 'ETHER_SIDE', 'P0', 'ether', 'El oxígeno del éter (–O–) corta la molécula en dos lados, y la '
    + 'cadena principal no puede pasar por él: se busca en uno de los dos lados, con las reglas de siempre. Aquí la cadena principal '
    + 'está en el otro lado del oxígeno, no en el de tu cadena: primero cuenta el grupo principal, y en ese lado hay un grupo –COO– '
    + 'y en tu cadena, ninguno. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: «3-metoxipropanoato de metilo».'],
  // 5. `inChain`: an alkoxycarbonyl prefix on an end of an acid's chain, whose C=O carbon the engine takes into the chain.
  ['ácido 3-(metoxicarbonil)propanoico', 'ESTER_IN_CHAIN', 'P1', 'groupChain', 'El prefijo «metoxicarbonil» está en el extremo de la '
    + 'cadena, y el carbono de su C=O la alarga: la cadena principal tiene 4 carbonos. Con ese carbono en la cadena, el éster ya no '
    + `se nombra «metoxicarbonil», sino ${CHAIN_ESTER}. Se escribe «ácido 4-metoxi-4-oxobutanoico».`],
  ['ácido 6-(metoxicarbonil)hexanoico', 'ESTER_IN_CHAIN', 'P1', 'groupChain', 'El prefijo «metoxicarbonil» está en el extremo de la '
    + 'cadena, y el carbono de su C=O la alarga: la cadena principal tiene 7 carbonos. Con ese carbono en la cadena, el éster ya no '
    + `se nombra «metoxicarbonil», sino ${CHAIN_ESTER}. Se escribe «ácido 7-metoxi-7-oxoheptanoico».`],
  // 6. `numbering`: the –COO– groups numbered otherwise (N0), one whose 1 the engine does not write.
  ['ciclohexano-1,5-dicarboxilato de dimetilo', 'RING_NUMBERING', 'N0', 'ringNumbering', `${N0}(3 en vez de 5).`],
  ['ciclohexano-2-carboxilato de metilo', 'RING_NUMBERING', 'N0', 'ringNumbering', `${N0}(1 en vez de 2). En «ciclohexanocarboxilato `
    + 'de metilo» ese número ni siquiera se escribe.'],
  // 7. `suffix`: needless suffix locants, the –COO– group's words.
  ['ciclohexano-1-carboxilato de metilo', 'NEEDLESS_LOCANTS', null, 'ringNumbering', 'En «ciclohexanocarboxilato de metilo» no se '
    + 'escriben números: solo hay una manera de colocar el grupo –COO–.'],
  ['benceno-1-carboxilato de metilo', 'NEEDLESS_LOCANTS', null, 'assemble', 'En «benzoato de metilo» no se escriben números: solo hay '
    + 'una manera de colocar el grupo –COO–.'],
];

test('one case per ester mistake: the code, its trace rule, the step «Ver el paso» opens and the message', () => {
  const seen = new Set();
  for (const [name, code, traceRule, opened, message] of CASES) {
    const verdict = read(name);
    const step = assertEsterDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule], [code, traceRule], `${name}: ${d.message}`);
    assert.equal(step.id, opened, `${name}: the step «Ver el paso» opens`);
    assert.equal(d.message, message, name);
    seen.add(code);
  } // End of the loop over the cases
  assert.deepEqual([...ESTER_CODES, ...SHARED_CODES].filter((code) => !seen.has(code)), [], 'every ester code has a case');
}); // End of test 'one case per ester mistake…'

test('the student\'s chain beside the parent, what the message is about and its tiles', () => {
  // ESTER_GROUP: the same chain; the focus is the whole –COO– (its carbon, both oxygens, their bonds); the `1-metoxi` tiles.
  const split = read('1-metoxipropanal');
  const cho = split.suffixAtoms[0];
  const alkoxy = split.prefixAtoms[0];
  assert.deepEqual(sorted(split.diagnosis.focus.atoms), sorted([cho.parentAtom, cho.attachment, alkoxy.attachment]));
  assert.deepEqual(sorted(split.diagnosis.focus.bonds), sorted([cho.bond, alkoxy.bond]));
  assert.deepEqual(split.diagnosis.tiles, [0, 4], '«1-metoxi»');
  assert.deepEqual(diagnosisLegend(split.diagnosis).map((e) => e.text), ['Cadena principal', 'Tu cadena (es la misma)']);
  // ESTER_CARBON on a chain: the student's three carbons beside the app's four; the focus is the –COO–, its bridge oxygen too.
  const chain = read('propano-1-carboxilato de metilo');
  const group = chain.suffixAtoms[0];
  const d = chain.diagnosis;
  assert.deepEqual([d.student.atoms.length, d.parent.atoms.length], [3, 4]);
  assert.ok(d.parent.atoms.includes(group.carbon), 'the –COO–\'s carbon is the parent\'s');
  assert.deepEqual(d.focus, { atoms: [group.carbon, group.attachment, group.bridge], bonds: [group.bond, group.bridgeBond] });
  assert.deepEqual(d.tiles, [2, 4], '«1», «carboxilato»');
  assert.deepEqual(diagnosisLegend(d).map((e) => e.text), ['Cadena principal', 'Tu cadena']);
  // ESTER_CARBON beside a ring: the –COO–'s carbon was the student's whole chain; the template's tile.
  const ring = read('fenilformiato de metilo').diagnosis;
  assert.deepEqual([ring.student.atoms.length, ring.parent.atoms.length], [1, 6]);
  assert.deepEqual(ring.tiles, [1, 2], '«formiato»');
  assert.deepEqual(diagnosisLegend(ring).map((e) => e.text), ['Cadena principal (el anillo)', 'Tu cadena']);
  // CARBONYL_PREFIX with an acyloxy prefix: the student's methane is the O-bound group, the parent the acetyl's two carbons; the
  // focus is the prefix (its atoms and bonds, the one to the methane too); its tiles.
  const acyloxy = read('(acetiloxi)metano');
  const prefix = acyloxy.prefixAtoms[0];
  assert.deepEqual(sorted(acyloxy.diagnosis.focus.atoms), sorted(prefix.atoms));
  assert.deepEqual(sorted(acyloxy.diagnosis.focus.bonds), sorted([prefix.bond, ...prefix.bonds]));
  assert.deepEqual(acyloxy.diagnosis.tiles, [0, 2], '«acetil», «oxi»');
  assert.ok(!acyloxy.diagnosis.parent.atoms.some((id) => acyloxy.diagnosis.student.atoms.includes(id)), 'the other side of the oxygen');
  // A nested acyloxy prefix: its own tiles, inside the compound branch.
  assert.deepEqual(read('[2-(acetiloxi)etil]benceno').diagnosis.tiles, [1, 4], '«2», «acetil», «oxi»');
  // ESTER_IN_CHAIN: the student's three carbons inside the app's four; the focus is the alkoxycarbonyl prefix; its tiles.
  const inChain = read('ácido 3-(metoxicarbonil)propanoico');
  const end = inChain.prefixAtoms[0];
  assert.deepEqual(inChain.diagnosis.focus, { atoms: end.atoms, bonds: [end.bond, ...end.bonds] });
  assert.ok(inChain.diagnosis.student.atoms.every((id) => inChain.diagnosis.parent.atoms.includes(id)));
  assert.ok(inChain.diagnosis.parent.atoms.includes(end.attachment), 'the C=O carbon is the parent\'s');
  assert.deepEqual(inChain.diagnosis.tiles, [1, 6], '«3-(metoxicarbonil)»');
  // CARBONYL_SENIORITY: the student's ketone C=O; the suffix's tiles.
  const senior = read('3-(metoxicarbonil)pentan-2-ona');
  assert.deepEqual(senior.diagnosis.focus, { atoms: [senior.suffixAtoms[0].parentAtom, senior.suffixAtoms[0].attachment],
    bonds: [senior.suffixAtoms[0].bond] });
  assert.deepEqual(senior.diagnosis.tiles, [7, 9], '«2», «ona»');
  // CARBONYL_SENIORITY with an ester's suffix beside the –COOH: the student's –COO– with its bridge oxygen.
  const junior = read('4-carboxibutanoato de metilo');
  const coo = junior.suffixAtoms[0];
  assert.deepEqual(junior.diagnosis.focus, { atoms: [coo.parentAtom, coo.attachment, coo.bridge], bonds: [coo.bond, coo.bridgeBond] });
}); // End of test 'the student's chain beside the parent…'

test('the step «Ver el paso» opens explains the ester rule the message states', () => {
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
  assert.match(opened('1-metoxipropanal'), /Los tres átomos forman un solo grupo: el C=O del –COO– no es una cetona, ni su oxígeno del medio un éter/);
  assert.match(opened('2-(acetiloxi)heptanal'), /ácido > éster > aldehído > cetona > alcohol\. Aquí manda el éster/);
  assert.match(opened('4-carboxibutanoato de metilo'), /ácido > éster > aldehído > cetona > alcohol\. Aquí manda el ácido/);
  assert.match(opened('propano-1-carboxilato de metilo'), /siempre está en un extremo de la cadena\. Ese carbono es un carbono más de la cadena/);
  assert.match(opened('ciclohexilmetanoato de metilo'), /tampoco forma una cadena aparte: el anillo es la \[\[cadena principal\]\]/);
  assert.match(opened('(acetiloxi)metano'), /el nombre tiene dos palabras unidas por «de»/);
  assert.match(opened('[(metoxicarbonil)metil]ciclohexano'), /mayor número posible de grupos –COO–\. Solo si hay empate manda el anillo/);
  assert.match(opened('2-[(metoxicarbonil)metil]propanoato de metilo'), /el mayor número posible de grupos –COO–/);
  assert.match(opened('ácido 3-(metoxicarbonil)propanoico'), /El carbono del éster que se nombra con «4-metoxi» y «4-oxo» sí forma parte de la cadena/);
  assert.match(opened('ciclohexano-1,5-dicarboxilato de dimetilo'), /los grupos –COO– \(el \[\[grupo principal\]\]\) deben tener los/);
}); // End of test 'the step «Ver el paso» opens explains…'

/**
 * The tiles of an ester's O-bound group written as an alkoxy prefix (`met
 * ilo` → `met il oxi`, `isopropil ilo` → `isopropil oxi`, `prop ano 2 ilo` →
 * `prop ano 2 il oxi`), with `carbonil` after `oxi` for an alkoxycarbonyl
 * prefix; a group with prefixes of its own (`2 cloro et ilo`) inside a
 * compound branch (`START 2 cloro et il oxi END`).
 *
 * @param {string[]} group - The O-bound group's tile ids, its `ilo` last.
 * @param {boolean} compound - The group has prefixes of its own.
 * @param {boolean} carbonyl - An alkoxycarbonyl prefix.
 * @returns {string[]} The prefix's tile ids.
 */
function alkoxyTiles(group, compound, carbonyl) {
  const head = group.slice(0, -1);
  const retained = tileById(head[head.length - 1]).kind === 'retained'; // `isopropil`, `tert-butil`, `fenil` take `oxi` themselves.
  const tiles = [...head, ...(retained ? [] : [tileId('freeValence', 1)]), ALKOXY_ID, ...(carbonyl ? [RING_CARBONYL_ID] : [])];
  return compound ? [START_ID, ...tiles, END_ID] : tiles;
}

/**
 * The parts of an ester name with one –COO– and one O-bound group written by
 * one group of tiles (no multiplier), and no orto/meta/para letter (beside a
 * new prefix it would be refused), or null for any other name: the tree, the
 * O-bound group's tiles and whether it has prefixes of its own.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {{tree: object, group: string[], compound: boolean}|null} The parts.
 */
function oneGroupEster(ids) {
  const { tree } = parse(ids);
  if (!tree.ester || tree.items.some((item) => item.letter !== null)) {
    return null;
  }
  const { groups, rest } = esterGroupsOf(tree.tiles, tree.ester.items);
  if (groups.length !== 1 || rest.length > 0 || groups[0].end.multiplier !== null || ids[tree.ester.range[1] - 1] !== ESTER_ALKYL_ID) {
    return null;
  }
  return { tree, group: ids.slice(tree.ester.range[0], tree.ester.range[1]), compound: groups[0].items.length > 0 };
} // End of function oneGroupEster()

/**
 * The tile ids of an ester name with one `oato` written as an `oxo` and an
 * alkoxy prefix on carbon 1 of the acid part (`propanoato de metilo` →
 * `1-metoxi-1-oxopropano`, `but-2-enoato de 2-cloroetilo` →
 * `1-(2-cloroetoxi)-1-oxobut-2-eno`): the –COO– as two groups; null for any
 * other name.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asOxoAndAlkoxy(ids) {
  const parts = oneGroupEster(ids);
  if (!parts || !parts.tree.parent.suffix || ids[parts.tree.parent.suffix.range[1] - 1] !== OATO_ID) {
    return null;
  }
  const { tree, group, compound } = parts;
  const one = tileId('num', 1);
  return [one, ...alkoxyTiles(group, compound, false), one, OXO_ID, ...ids.slice(0, tree.parent.suffix.range[0]),
    ...ids.slice(tree.parent.suffix.range[1], tree.ester.range[0])];
}

/**
 * The tile ids of an ester name with one `carboxilato` or `benzoato` written
 * as an alkoxycarbonyl prefix of the ring, at the locant the reading gives
 * the –COO– (`ciclohexanocarboxilato de metilo` →
 * `1-(metoxicarbonil)ciclohexano`, `4-metilbenzoato de etilo` →
 * `1-(etoxicarbonil)-4-metilbenceno`); null for any other name.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asAlkoxycarbonyl(ids) {
  const parts = oneGroupEster(ids);
  if (!parts) {
    return null;
  }
  const { tree, group, compound } = parts;
  const { suffix } = tree.parent;
  const benzoate = ids.includes(BENZOATE_ID);
  if (!benzoate && (!suffix || ids[suffix.range[1] - 1] !== CARBOXYLATE_ID)) {
    return null;
  }
  const prefix = [tileId('num', readName(ids).suffixAtoms[0].locant), ...alkoxyTiles(group, compound, true)];
  const acidPart = benzoate ? ids.slice(0, tree.ester.range[0]).map((id) => (id === BENZOATE_ID ? BENZENE_ID : id))
    : [...ids.slice(0, suffix.range[0]), ...ids.slice(suffix.range[1], tree.ester.range[0])];
  return [...prefix, ...acidPart];
} // End of function asAlkoxycarbonyl()

/** How many ester fixture names have one `oato` and one O-bound group, and how many one `carboxilato` or `benzoato`. */
const SWEEP_COUNTS = Object.freeze({ split: 74, prefix: 46 });

test('sweeps over the ester fixture names: one `oato` as `oxo` and an alkoxy prefix, one `carboxilato` as an alkoxycarbonyl prefix', async () => {
  const names = (await readFixtures()).filter((row) => isEster(row.smiles)).flatMap((row) => row.names)
    .filter((name) => isEsterName(name) && !isEsterTemplateName(name));
  const counts = { split: 0, prefix: 0 };
  for (const name of names) {
    const ids = tokenize(name);
    for (const [kind, rewrite, code] of [['split', asOxoAndAlkoxy, 'ESTER_GROUP'], ['prefix', asAlkoxycarbonyl, 'CARBONYL_PREFIX']]) {
      const mutated = rewrite(ids);
      if (!mutated) {
        continue;
      }
      counts[kind] += 1;
      const verdict = readName(mutated);
      const label = `${name} → ${verdict.text}`;
      assert.equal(verdict.kind, 'otherName', `${label}: ${verdict.message}`);
      assert.equal(verdict.name, readName(ids).name, `${label}: the same molecule`);
      assertEsterDiagnosis(verdict, label);
      assert.equal(verdict.diagnosis.code, code, `${label}: ${verdict.diagnosis.message}`);
      // The name quoted is the engine's in the student's prefix style.
      assert.ok(verdict.diagnosis.message.endsWith(`«${diagnosisNaming(verdict).name}».`), `${label}: ${verdict.diagnosis.message}`);
    } // End of the loop over the two rewrites
  } // End of the loop over the names
  assert.deepEqual(counts, { ...SWEEP_COUNTS });
}); // End of test 'sweeps over the ester fixture names…'

test('MISSING_LOCANTS names the –COO– groups when the suffix\'s locant is the one missing (diagnose() on its own)', () => {
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
  assert.equal(read('2-clorociclohexanocarboxilato de metilo').kind, 'missingLocants');
  const d = direct('2-clorociclohexanocarboxilato de metilo');
  assert.deepEqual([d.code, d.tiles], ['MISSING_LOCANTS', [5, 6]], '«carboxilato»');
  assert.equal(d.message, 'Faltan números: hay que decir en qué carbono va cada rama, cada enlace doble o triple y cada grupo –COO–, '
    + 'como en «2-clorociclohexano-1-carboxilato de metilo».');
}); // End of test 'MISSING_LOCANTS names the –COO– groups…'

/** The start of an ESTER_ALKYL_CHAIN message on the numbering (draft pending teacher review). */
const ALKYL_NUMBERING = 'La cadena del grupo unido al oxígeno se numera para que el carbono unido al oxígeno lleve el número más bajo '
  + 'posible';

/** The start of ESTER_PREFIX_NAME for an acyloxy prefix. */
const ACYLOXY = 'Un éster (–COO–) unido por su oxígeno del medio se nombra con el prefijo «aciloxi-»: el nombre del grupo acilo, aquí ';

/** The ESTER_CLASS_NAME message before the engine's name. */
const CLASS_ESTER = 'El oxígeno de tu nombre está unido a un carbono con un C=O: juntos forman un solo grupo, el –COO– de los ésteres, así '
  + `que la molécula es un éster, no un éter, y no se nombra con «éter». El grupo –COO– es el grupo principal: se nombra ${WRITTEN('oato')}.`;

/**
 * One case per mistake of phase I-52a3b (the former deliberate nulls: the
 * O-bound side, an ester prefix's own words, an ester written as an ether
 * class name, then the variants): [name or tile words, code, rule, the step
 * «Ver el paso» opens, tiles, message].
 */
const SIDE_CASES = [
  // The O-bound side: a group's needless locants, its chain and numbering, a ring numbered otherwise, its other words.
  ['etanoato de propan-1-ilo', 'NEEDLESS_LOCANTS', 9, 'ester', [5, 6], 'Sobran números en el nombre del grupo unido al oxígeno: se '
    + 'escribe «propilo», no «propan-1-ilo».'],
  ['etanoato de 1-clorometilo', 'NEEDLESS_LOCANTS', 9, 'ester', [3, 4], 'Sobran números en el nombre del grupo unido al oxígeno: se '
    + 'escribe «clorometilo», no «1-clorometilo».'],
  ['etanoato de ciclohexan-1-ilo', 'NEEDLESS_LOCANTS', 9, 'ester', [6, 7], 'Sobran números en el nombre del grupo unido al oxígeno: '
    + 'se escribe «ciclohexilo», no «ciclohexan-1-ilo».'],
  ['etanoato de butan-3-ilo', 'ESTER_ALKYL_CHAIN', 5, 'ester', [3, 7], `${ALKYL_NUMBERING}: «butan-2-ilo», no «butan-3-ilo».`],
  ['etanoato de propan-3-ilo', 'ESTER_ALKYL_CHAIN', 5, 'ester', [3, 7], `${ALKYL_NUMBERING}: «propilo», no «propan-3-ilo». En «propilo» `
    + 'ese número ni siquiera se escribe.'],
  ['etanoato de 4-metilpentan-3-ilo', 'ESTER_ALKYL_CHAIN', 5, 'ester', [3, 10], `${ALKYL_NUMBERING}; si así empatan, en el sentido que `
    + 'da los números más bajos a sus sustituyentes: «2-metilpentan-3-ilo», no «4-metilpentan-3-ilo».'],
  ['etanoato de 1-metilpropilo', 'ESTER_ALKYL_CHAIN', 5, 'ester', [3, 8], 'La cadena del grupo unido al oxígeno es la más larga que '
    + 'pasa por el carbono unido al oxígeno: aquí tiene 4 carbonos, no 3. Se escribe «butan-2-ilo», no «1-metilpropilo».'],
  ['etanoato de 2-etenilbutilo', 'ESTER_ALKYL_CHAIN', 5, 'ester', [3, 9], 'La cadena del grupo unido al oxígeno pasa por el carbono '
    + 'unido al oxígeno y, entre las más largas, es la que tiene más enlaces dobles o triples. Se escribe «2-etilbut-3-en-1-ilo», no '
    + '«2-etenilbutilo».'],
  // Review of phase I-52a3b: two six-carbon chains with one multiple bond each; the double bond decides.
  ['etanoato de 3-etenilhex-1-in-3-ilo', 'ESTER_ALKYL_CHAIN', 5, 'ester', [3, 12], 'La cadena del grupo unido al oxígeno pasa por el '
    + 'carbono unido al oxígeno y, entre las más largas, con los mismos enlaces múltiples, gana la que tiene más enlaces dobles. Se '
    + 'escribe «3-etinilhex-1-en-3-ilo», no «3-etenilhex-1-in-3-ilo».'],
  ['etanoato de 6-metilfenilo', 'BRANCH_RING_NUMBERING', 5, 'ester', [3, 8], 'Un anillo unido al oxígeno se numera empezando por el '
    + 'carbono unido al oxígeno, que es el 1, y siguiendo en el sentido que da los números más bajos a sus sustituyentes: '
    + '«2-metilfenilo», no «6-metilfenilo».'],
  ['etanoato de 1,1-dimetiletilo', 'ESTER_ALKYL_NAME', 5, 'ester', [3, 10], 'El grupo unido al oxígeno se nombra como una rama, pero '
    + 'como palabra suelta y acabado en «-ilo»: aquí, «tert-butilo», no «1,1-dimetiletilo».'],
  ['etanoato de 4-metil-2-clorofenilo', 'ESTER_ALKYL_NAME', 5, 'ester', [3, 10], 'El grupo unido al oxígeno se nombra como una rama, '
    + 'pero como palabra suelta y acabado en «-ilo»: aquí, «2-cloro-4-metilfenilo», no «4-metil-2-clorofenilo».'],
  // The retained word with the group in another style than its traditional name's.
  ['acetato de propan-2-ilo', 'ESTER_TRADITIONAL', 2, 'assemble', [1, 5], 'El nombre tradicional «acetato» solo lo uso con el nombre '
    + 'del grupo unido al oxígeno que doy primero, «isopropilo»: «acetato de isopropilo». Con «propan-2-ilo», la primera palabra es '
    + 'la sistemática: «etanoato de propan-2-ilo».'],
  // The side's form: two groups out of order, the same group written twice, the wrong multiplier.
  ['propanodioato de metilo y etilo', 'ALPHABETICAL_ORDER', 5, 'diester', [4, 8], 'Los grupos unidos a los oxígenos se escriben por '
    + 'orden alfabético, unidos por «y»: «etilo» va antes que «metilo» (e antes que m). Se escribe «etilo y metilo», no «metilo y '
    + 'etilo».'],
  ['butanodioato de metilo y metilo', 'UNGROUPED', 6, 'diester', [4, 8], 'Los grupos iguales unidos a los oxígenos se escriben una sola '
    + 'vez, con «di», «tri»… delante: «dimetilo», no «metilo y metilo».'],
  ['propanodioato de propan-2-ilo y propan-2-ilo', 'UNGROUPED', 6, 'diester', [4, 12], 'Los grupos iguales unidos a los oxígenos se '
    + 'escriben una sola vez, con «di», «tri»… delante: «di(propan-2-ilo)», no «propan-2-ilo y propan-2-ilo».'],
  ['butanodioato de di(2-cloroetilo)', 'MULTIPLIER_KIND', 7, 'diester', [4, 5], 'Delante de un grupo que tiene sus propios '
    + 'sustituyentes se usa «bis», «tris»…: «bis(2-cloroetilo)», no «di(2-cloroetilo)».'],
  ['butanodioato de bismetilo', 'MULTIPLIER_KIND', 7, 'diester', [4, 5], '«bis», «tris»… solo van delante de grupos que tienen sus '
    + 'propios sustituyentes; aquí va «di», «tri»…: «dimetilo», no «bismetilo».'],
  // Review of phase I-52a3b: a group the engine writes otherwise keeps its own mistake, never another word's multiplier (the
  // engine's `di-tert-butilo` is no reason for `di(1,1-dimetiletilo)`); the substituted style's side, quoted as the engine writes it.
  ['propanodioato de bis(1,1-dimetiletilo)', 'ESTER_ALKYL_NAME', 5, 'diester', [4, 14], 'El grupo unido al oxígeno se nombra como '
    + 'una rama, pero como palabra suelta y acabado en «-ilo»: aquí, «tert-butilo», no «1,1-dimetiletilo».'],
  ['propanodioato de 1-metiletilo y 1-metiletilo', 'UNGROUPED', 6, 'diester', [4, 14], 'Los grupos iguales unidos a los oxígenos '
    + 'se escriben una sola vez, con «bis», «tris»… delante: «bis(1-metiletilo)», no «1-metiletilo y 1-metiletilo».'],
  ['propanodioato de di(1-metiletilo)', 'MULTIPLIER_KIND', 7, 'diester', [4, 5], 'Delante de un grupo que tiene sus propios '
    + 'sustituyentes se usa «bis», «tris»…: «bis(1-metiletilo)», no «di(1-metiletilo)».'],
  // An ester prefix written as another kind of branch, or with the general acyl word.
  ['ácido 2-(1-oxoetoxi)etanoico', 'ESTER_PREFIX_NAME', 5, 'substituents', [1, 9], `${ACYLOXY}«acetil», más «oxi», que es el oxígeno; su `
    + 'C=O no se nombra con «oxo». Se escribe «acetiloxi», no «1-oxoetoxi».'],
  ['ácido 3-[(metoxi)oxometil]pentanodioico', 'ESTER_PREFIX_NAME', 5, 'substituents', [1, 10], 'Un éster (–COO–) unido por el carbono '
    + 'de su C=O se nombra con un solo prefijo que lo incluye todo, «alcoxicarbonil-»: el nombre del grupo unido al oxígeno acabado '
    + 'en «-oxi», aquí «metoxi», más «carbonil», que es el C=O; su C=O no se nombra con «oxo». Se escribe «metoxicarbonil», no '
    + '«(metoxi)oxometil».'],
  ['ácido 2-(etanoiloxi)etanoico', 'ACYL_NAME', 5, 'substituents', [1, 6], 'El grupo acilo de 2 carbonos (CH₃–CO–) tiene nombre propio, '
    + 'que la IUPAC (2013) prefiere: «acetil», no «etanoil». Se escribe «acetiloxi», no «etanoiloxi».'],
  // An ester written as an ether class name.
  ['(1-oxoetil) metil éter', 'ESTER_CLASS_NAME', 1, 'group', [8, 9], `${CLASS_ESTER} Se escribe «etanoato de metilo».`],
];

test('one case per mistake of phase I-52a3b: the O-bound side, an ester prefix\'s own words, an ester written as an ether class name', () => {
  const seen = new Set();
  for (const [name, code, rule, opened, tiles, message] of SIDE_CASES) {
    const verdict = read(name);
    const d = verdict.diagnosis;
    assert.ok(d, `${name}: no diagnosis`);
    assert.deepEqual([d.code, d.rule, d.traceRule], [code, rule, null], `${name}: ${d.message}`);
    assert.equal(d.message, message, name);
    assert.deepEqual(d.tiles, tiles, `${name}: tiles`);
    assert.deepEqual(JSON.parse(JSON.stringify(d)), d, `${name}: JSON-safe`);
    if (code === 'ESTER_CLASS_NAME') {
      assert.deepEqual(d.student, { atoms: [], bonds: [] }, `${name}: a class name has no chain`);
    } else {
      assertEsterDiagnosis(verdict, name);
    }
    const explanation = diagnosisExplanation(verdict, explain);
    assert.equal(explanation.steps[explanation.index].id, opened, `${name}: the step «Ver el paso» opens`);
    seen.add(code);
  } // End of the loop over the cases
  assert.deepEqual([...SIDE_CODES, ...OBOUND_SHARED_CODES, 'ACYL_NAME'].filter((code) => !seen.has(code)), [], 'every code has a case');
}); // End of test 'one case per mistake of phase I-52a3b…'

test('the O-bound side: the acid part stays the student\'s chain, the focus is the O-bound groups, the step names them', () => {
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
  for (const name of ['etanoato de propan-1-ilo', 'propanodioato de metilo y etilo', 'butanodioato de metilo y metilo']) {
    const verdict = read(name);
    const d = verdict.diagnosis;
    // The acid part is the engine's parent; the focus is every O-bound group the message is about, with its bond to the oxygen.
    assert.deepEqual(d.student, d.parent, `${name}: the same chain`);
    assert.deepEqual(diagnosisLegend(d).map((e) => e.text), ['Cadena principal', 'Tu cadena (es la misma)'], name);
    const groups = verdict.esterAtoms;
    assert.deepEqual(sorted(d.focus.atoms), sorted(groups.flatMap((o) => o.atoms)), name);
    assert.deepEqual(sorted(d.focus.bonds), sorted(groups.flatMap((o) => [o.bond, ...o.bonds])), name);
  }
  // The steps: the ester's one O-bound group, «Separa las dos partes del éster»; two, «Separa las partes del diéster», which says
  // how two groups are written; the traditional pairing, «Monta el nombre», which lists both names.
  assert.match(opened('etanoato de propan-1-ilo'), /La otra parte es el grupo unido al otro lado del oxígeno.*«propilo»/);
  assert.match(opened('propanodioato de metilo y etilo'), /se escriben los dos, en orden alfabético y unidos por «y»: «etilo y metilo»/);
  assert.match(opened('butanodioato de metilo y metilo'), /se escribe su nombre una vez, con «di» delante/);
  assert.match(opened('butanodioato de di(2-cloroetilo)'), /con «bis» delante y entre paréntesis porque el grupo tiene sus propios sustituyentes/);
  assert.match(opened('etanoato de butan-3-ilo'), /El número 2 que va justo antes de «-ilo» dice por qué carbono del grupo se une al oxígeno/);
  assert.match(opened('etanoato de 6-metilfenilo'), /Sus carbonos se numeran empezando por el que está unido al oxígeno, que es el 1/);
  assert.match(opened('acetato de propan-2-ilo'), /«etanoato de propan-2-ilo».*«acetato de isopropilo»/);
  assert.match(opened('ácido 2-(1-oxoetoxi)etanoico'), /«acetiloxi» es el \[\[prefijo\]\] de un éster \(–COO–\) unido .* por su oxígeno del medio/);
  // The O-bound checks run right after the principal –COO– group's own and before the parent's rules: an acid-part mistake beside
  // an O-bound one gives way to it; with the O-bound side the engine's, the acid part's rule speaks.
  assert.equal(read('4-metilbutanoato de propan-1-ilo').diagnosis.code, 'NEEDLESS_LOCANTS');
  assert.equal(read('4-metilbutanoato de propilo').diagnosis.code, 'BRANCH_AT_END');
  // A side the engine writes in one of its styles is no mistake, whatever the acid part's style (`etilo y propan-2-ilo`).
  assert.equal(read('propanodioato de etilo y propan-2-ilo').kind, 'alternative');
  // Review of phase I-52a3b: a side quoted in the style of the student's groups opens the explanation in that style, whose diester
  // step writes the side as the message does (the substituted style's `bis(1-metiletilo)`, not the default's `diisopropilo`).
  for (const [name, style, side] of [['propanodioato de 1-metiletilo y 1-metiletilo', 'substituted', 'bis(1-metiletilo)'],
    ['propanodioato de di(1-metiletilo)', 'substituted', 'bis(1-metiletilo)'],
    ['propanodioato de propan-2-ilo y etilo', 'pin', 'etilo y propan-2-ilo']]) {
    const verdict = read(name);
    assert.equal(verdict.diagnosis.style, style, name);
    assert.deepEqual(verdict.diagnosis.parent, diagnosisNaming(verdict).parent, name);
    const text = opened(name);
    assert.ok(text.includes(`«${side}»`) && text.includes(`«propanodioato de ${side}»`), `${name}: ${text}`);
    assert.doesNotMatch(text, /diisopropilo|isopropilo/, name);
  }
  assert.match(opened('propanodioato de 1-metiletilo y 1-metiletilo'), /con «bis» delante y entre paréntesis porque el grupo tiene sus propios sustituyentes/);
}); // End of test 'the O-bound side…'

test('controls: correct ester names have no diagnosis; a mistake the earlier rules name stays theirs', () => {
  for (const name of ['etanoato de metilo', 'butanodioato de dimetilo', 'ciclohexanocarboxilato de metilo', 'benzoato de metilo',
    'acetato de etilo', '2-etil-3-oxobutanoato de metilo', 'etanoato de 2-hidroxietilo', 'ácido 4-metoxi-4-oxobutanoico',
    'ácido 3-(metoxicarbonil)pentanodioico', 'ácido 2-(acetiloxi)etanoico', '2-ciclohexiletanoato de metilo']) {
    const verdict = read(name);
    assert.ok(['correct', 'alternative'].includes(verdict.kind), `${name}: ${verdict.kind}`);
    assert.ok(!('diagnosis' in verdict), name);
  }
  // The rules of phases I-52a1…I-52a2b keep their codes beside the new ones; N1–N4 after an N0 tie keep their own phrases.
  for (const [name, code] of [['4-metilbutanoato de metilo', 'BRANCH_AT_END'], ['2-etilpropanoato de metilo', 'LONGER_CHAIN'],
    ['3-metilbutanodioato de dimetilo', 'NUMBERING'], ['6-metilbenzoato de etilo', 'RING_NUMBERING'],
    ['5-metilciclohexano-1-carboxilato de metilo', 'RING_NUMBERING'], ['2-cloroacetato de metilo', 'SUBSTITUTED_TEMPLATE'],
    ['2-fenilacetato de metilo', 'NEEDLESS_LOCANTS'], ['2-butenoato de metilo', 'OLD_STYLE']]) {
    const verdict = read(name);
    assertEsterDiagnosis(verdict, name);
    assert.equal(verdict.diagnosis.code, code, `${name}: ${verdict.diagnosis.message}`);
  }
  assert.match(read('6-metilbenzoato de etilo').diagnosis.message, /los sustituyentes tienen que llevar los números más bajos/);
  assert.equal(read('5-metilciclohexano-1-carboxilato de metilo').diagnosis.traceRule, 'N3');
  // An OH or an alkoxy group on the –CHO's carbon: the acid's and the ester's own codes.
  assert.equal(read('1-hidroxipropanal').diagnosis.code, 'ACID_GROUP');
  assert.equal(read('1-metoxipropanal').diagnosis.code, 'ESTER_GROUP');
}); // End of test 'controls…'

test('the drafts of the ester rules: their place among the rules, their steps, every variant renders', () => {
  assert.deepEqual(ESTER_CODES.map((code) => [DIAGNOSES[code].rule, DIAGNOSES[code].step]), [[1, 'group'], [1, 'group'],
    [1, 'groupChain']]);
  // Phase I-52a3b: each beside the code it parallels — ESTER_CLASS_NAME after ESTER_GROUP, ESTER_TRADITIONAL after
  // SUBSTITUTED_TEMPLATE, ESTER_PREFIX_NAME first of the branch-name rules, ESTER_ALKYL_CHAIN and ESTER_ALKYL_NAME after
  // BRANCH_RING_NUMBERING —, the O-bound side's steps the explanation's ester step (or «Monta el nombre»).
  assert.deepEqual(SIDE_CODES.map((code) => [DIAGNOSES[code].rule, DIAGNOSES[code].step]), [[1, 'group'], [2, 'assemble'],
    [5, 'substituents'], [5, 'ester'], [5, 'ester']]);
  // ESTER_GROUP right after ACID_GROUP, as esterChecks() runs with acidChecks(); ESTER_CARBON after ACID_CARBON, its twin;
  // ESTER_IN_CHAIN after BRANCH_AT_END, its twin.
  const after = (code) => DIAGNOSIS_CODES[DIAGNOSIS_CODES.indexOf(code) - 1];
  assert.deepEqual(ESTER_CODES.map(after), ['ACID_GROUP', 'ACID_CARBON', 'BRANCH_AT_END']);
  assert.deepEqual(SIDE_CODES.map(after), ['ESTER_GROUP', 'SUBSTITUTED_TEMPLATE', 'RING_NUMBERING', 'BRANCH_RING_NUMBERING',
    'ESTER_ALKYL_CHAIN']);
  assert.deepEqual([STEP_FALLBACKS.ester, STEP_FALLBACKS.diester], [['diester', 'group', 'count'], ['ester', 'group', 'count']]);
  for (const code of [...ESTER_CODES, ...SHARED_CODES, ...SIDE_CODES]) {
    const text = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    assert.match(text, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(text, /undefined|null|NaN/, code);
  }
  assert.equal(DIAGNOSES.ESTER_GROUP.example.name, 'propanoato de metilo');
  assert.equal(DIAGNOSES.ESTER_CARBON.example.name, 'butanoato de metilo');
  assert.equal(DIAGNOSES.ESTER_IN_CHAIN.example.name, 'ácido 4-metoxi-4-oxobutanoico');
  const { ESTER_GROUP, ESTER_CARBON, CARBONYL_SENIORITY, CARBONYL_PREFIX, CARBONYL_PARENT, MORE_CARBONYL_GROUPS, NEEDLESS_LOCANTS }
    = DIAGNOSIS_TEXTS;
  const { ending, groupWords, carbonylN0, what, junior, principal } = DIAGNOSIS_PHRASES;
  // The –COO–'s words, beside the C=O and –COOH groups'.
  assert.deepEqual(groupWords.ester, { one: 'grupo –COO–', many: 'grupos –COO–' });
  assert.equal(carbonylN0.numberingReasons.ester, 'los grupos –COO– (el grupo principal) tienen que llevar los números más bajos');
  assert.equal(carbonylN0.lowerLocantsOf.ester, 'los grupos –COO–');
  assert.deepEqual([what.ester, what.esters], ['el grupo –COO–', 'los grupos –COO–']);
  assert.equal(DIAGNOSIS_PHRASES.esterSeniority, 'ácido > éster > aldehído > cetona > alcohol');
  assert.equal(DIAGNOSIS_PHRASES.acidSeniority, 'ácido > aldehído > cetona > alcohol', 'an acid beside no ester keeps its phrase');
  assert.equal(principal.ester, 'el éster (–COO–)');
  assert.deepEqual([...junior.ester], ['el –COO– del éster', 'cada –COO–']);
  assert.equal(DIAGNOSIS_PHRASES.chainEster, CHAIN_ESTER);
  // How the –COO– is written: the suffix, then `de` and the O-bound groups; `benzoato`; the other families' wording unchanged.
  assert.equal(ending({ ending: 'oato', ester: true, benzoate: false, groups: 1 }), WRITTEN('oato'));
  assert.equal(ending({ ending: 'dicarboxilato', ester: true, benzoate: false, groups: 2 }), WRITTEN_MANY('dicarboxilato'));
  assert.equal(ending({ ending: 'carboxilato', ester: true, benzoate: true, groups: 1 }), BENZOATE);
  assert.equal(ending({ ending: 'oico', acid: true }), ACID_WRITTEN);
  assert.equal(ending({ ending: 'al', benzaldehyde: false }), 'con la terminación «-al», al final del nombre');
  // The variants: ESTER_GROUP with several –COO– bonded to a ring; ESTER_CARBON beside benzene.
  assert.equal(ESTER_GROUP({ count: 2, ending: 'dicarboxilato', ester: true, benzoate: false, groups: 2, on: 'outside', name: 'X' }),
    `${ONE_GROUP}Los grupos –COO– son el grupo principal: los unidos al anillo se nombran todos juntos `
    + `${WRITTEN_MANY('dicarboxilato')}. Se escribe «X».`);
  assert.equal(ESTER_CARBON({ ring: true, ending: 'carboxilato', ester: true, benzoate: true, groups: 1, name: 'X' }), `${ON_RING}`
    + `${BENZOATE}. Se escribe «X».`);
  // CARBONYL_SENIORITY: several junior groups in the prefixes or in the O-bound group's name; an ester's suffix beside an acid.
  assert.equal(CARBONYL_SENIORITY({ group: 'ester', ending: 'oato', ester: true, groups: 1, junior: 'alcohol', count: 2, prefix: null,
    name: 'X' }), `${SENIORITY}el éster (–COO–), que se nombra ${WRITTEN('oato')}; cada –OH va delante, en los prefijos. Se escribe «X».`);
  assert.equal(CARBONYL_SENIORITY({ group: 'ester', ending: 'oato', ester: true, groups: 1, junior: 'ketone', count: 1, prefix: null,
    side: 'oBound', name: 'X' }), `${SENIORITY}el éster (–COO–), que se nombra ${WRITTEN('oato')}; el C=O de la cetona va en el nombre `
    + 'del grupo unido al otro oxígeno. Se escribe «X».');
  assert.equal(CARBONYL_SENIORITY({ group: 'acid', ending: 'oico', acid: true, junior: 'ester', count: 2, prefix: null, name: 'X' }),
    `${SENIORITY}el ácido (–COOH), que se nombra ${ACID_WRITTEN}; cada –COO– va delante, en los prefijos. Se escribe «X».`);
  // CARBONYL_PREFIX for an ester: one or several, on a ring, an alkoxycarbonyl whose carbon joins the chain and a ring then a branch.
  assert.equal(CARBONYL_PREFIX({ group: 'ester', count: 2, ending: 'dicarboxilato', ester: true, groups: 2, prefix: 'metoxicarbonil',
    acyl: false, joins: false, on: 'outside', name: 'X' }), 'Los grupos –COO– son el grupo principal: los unidos al anillo no se '
    + `nombran con el prefijo «metoxicarbonil», sino todos juntos ${WRITTEN_MANY('dicarboxilato')}. Se escribe «X».`);
  assert.equal(CARBONYL_PREFIX({ group: 'ester', count: 1, ending: 'oato', ester: true, groups: 1, prefix: 'metoxicarbonil', acyl: false,
    joins: true, ringBranch: true, on: 'chain', name: 'X' }), 'El grupo –COO– es el grupo principal: no se nombra con el prefijo '
    + `«metoxicarbonil», sino ${WRITTEN('oato')}. Su carbono entra en la cadena principal, y el anillo pasa a ser una rama. Se `
    + 'escribe «X».');
  // The parent choice, P0, N0 and the suffix's needless locants speak of the –COO– groups.
  assert.match(CARBONYL_PARENT({ group: 'ester', ring: 2, chain: 2, chainParent: false, name: 'X' }), /^La cadena principal es la que lleva más grupos –COO–/);
  assert.match(MORE_CARBONYL_GROUPS({ group: 'ester', app: 2, student: 1 }), /^Hay otra cadena con más grupos –COO– \(2; la tuya tiene 1\)/);
  assert.equal(NEEDLESS_LOCANTS({ name: 'X', what: what.esters, kept: false }), 'En «X» no se escriben números: solo hay una manera de '
    + 'colocar los grupos –COO–.');
  assert.equal(DIAGNOSIS_TEXTS.CHAIN_LOCANTS({ rule: 'N0', group: 'ester', app: '1', student: '2' }), 'Hay otra cadena igual de larga '
    + 'que, bien numerada, da números más bajos a los grupos –COO– (1 en vez de 2): esa es la cadena principal.');
  assert.equal(DIAGNOSIS_TEXTS.NUMBERING({ rule: 'N0', group: 'ester', app: '1', student: '2', unwritten: false }), 'Hay que numerar '
    + 'la cadena desde el otro extremo: los grupos –COO– (el grupo principal) tienen que llevar los números más bajos (1 en vez de 2).');
  assert.equal(DIAGNOSIS_PHRASES.etherSide({ reason: 'CARBONYL_PARENT', group: 'ester', ring: 1, chain: 1, chainParent: false }),
    'primero cuenta el grupo principal, y los dos lados llevan un grupo –COO– cada uno; en el empate, manda el anillo');
  // Phase I-52a3b: the examples, and the variants no case above reaches.
  assert.equal(DIAGNOSES.ESTER_CLASS_NAME.example.name, 'etanoato de metilo');
  assert.equal(DIAGNOSIS_TEXTS.ESTER_TRADITIONAL(DIAGNOSES.ESTER_TRADITIONAL.example), 'El nombre tradicional «acetato» solo lo uso '
    + 'con el nombre del grupo unido al oxígeno que doy primero, «isopropilo»: «acetato de isopropilo». Con «propan-2-ilo», la primera '
    + 'palabra es la sistemática: «etanoato de propan-2-ilo».');
  assert.equal(DIAGNOSIS_TEXTS.ESTER_ALKYL_CHAIN({ reason: 'longer', length: 4, studentLength: 2, starts: true, right: 'X', student: 'Y' }),
    'La cadena del grupo unido al oxígeno es la más larga que empieza en el carbono unido al oxígeno: aquí tiene 4 carbonos, no 2. '
    + 'Se escribe «X», no «Y».');
  assert.equal(DIAGNOSIS_TEXTS.ESTER_ALKYL_CHAIN({ reason: 'bondsOnly', unwritten: false, right: 'X', student: 'Y' }), `${ALKYL_NUMBERING}; `
    + 'si así empatan, en el sentido que da los números más bajos a sus enlaces dobles y triples: «X», no «Y».');
  // The double-bond tie-break shares its words with MORE_DOUBLE_BONDS (review of phase I-52a3b), whose message is unchanged.
  assert.deepEqual(DIAGNOSIS_PHRASES.doubleBondTie, { tie: 'con los mismos enlaces múltiples', wins: 'gana la que tiene más enlaces dobles' });
  assert.equal(DIAGNOSIS_TEXTS.MORE_DOUBLE_BONDS({ app: 2, student: 1 }), 'Hay otra cadena igual de larga, con los mismos enlaces '
    + 'múltiples, pero con más enlaces dobles (2; la tuya tiene 1). En ese empate gana la que tiene más enlaces dobles.');
  assert.equal(DIAGNOSIS_TEXTS.ESTER_PREFIX_NAME({ kind: 'acyloxy', part: 'acetil', oxo: false, right: 'X', student: 'Y' }),
    `${ACYLOXY}«acetil», más «oxi», que es el oxígeno. Se escribe «X», no «Y».`);
  assert.equal(DIAGNOSIS_TEXTS.ESTER_CLASS_NAME({ count: 2, ending: 'dioato', ester: true, benzoate: false, groups: 2, on: 'chain',
    name: 'X' }), 'El oxígeno de tu nombre está unido a un carbono con un C=O: juntos forman un solo grupo, el –COO– de los ésteres, '
    + 'así que la molécula es un éster, no un éter, y no se nombra con «éter». Los grupos –COO– son el grupo principal: los de la '
    + `cadena principal se nombran todos juntos ${WRITTEN_MANY('dioato')}. Se escribe «X».`);
  assert.equal(DIAGNOSIS_TEXTS.UNGROUPED({ oBound: true, compound: true, halogen: false, right: 'X', student: 'Y' }), 'Los grupos iguales '
    + 'unidos a los oxígenos se escriben una sola vez, con «bis», «tris»… delante: «X», no «Y».');
  assert.equal(DIAGNOSIS_TEXTS.BRANCH_RING_NUMBERING({ oBound: true, reason: null, unwritten: true, benzene: false, right: 'X',
    student: 'Y' }), 'Un anillo unido al oxígeno se numera empezando por el carbono unido al oxígeno, que es el 1: «X», no «Y». En «X» '
    + 'ese 1 ni siquiera se escribe.');
  // The other families' wording unchanged beside the O-bound variants.
  assert.equal(DIAGNOSIS_TEXTS.ALPHABETICAL_ORDER({ first: 'etil', second: 'metil', why: 'e antes que m', hint: '' }), 'Los sustituyentes '
    + 'se escriben por orden alfabético: «etil» va antes que «metil» (e antes que m).');
  assert.equal(DIAGNOSIS_TEXTS.MULTIPLIER_KIND({ compound: true, right: 'X', student: 'Y' }), 'Delante de una rama que tiene sus propias '
    + 'ramas se usa «bis», «tris»…: «X», no «Y».');
  assert.equal(DIAGNOSIS_TEXTS.NEEDLESS_LOCANTS({ branch: true, right: 'X', student: 'Y' }), 'Sobran números dentro de la rama: se '
    + 'escribe «X», no «Y».');
}); // End of test 'the drafts of the ester rules…'
