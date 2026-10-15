/**
 * @file Unit tests for the acid diagnoses of «¿Cómo se dibuja?»
 * (src/reverse/diagnose.js header «Acids», design.md §13.4 I-33, I-40a,
 * I-40b, §15.8 R-5d; phase I-51d3, R-5d3): one case per acid mistake that
 * phases I-51d1 and I-51d2 left as a deliberate null — a –COOH written as two
 * groups on one carbon (ACID_GROUP), a junior group as the suffix beside the
 * –COOH (CARBONYL_SENIORITY, with KETONE_NOT_ALDEHYDE for an `al` a branch
 * makes a ketone's), the –COOH's carbon on the other side of the parent
 * (ACID_CARBON), a principal –COOH written `carboxi` (CARBONYL_PREFIX), the
 * ring against a chain decided by the –COOH groups (CARBONYL_PARENT),
 * another chain with more –COOH groups (MORE_CARBONYL_GROUPS, P0, and its
 * ether side), the –COOH groups numbered otherwise (N0, RING_NUMBERING) and
 * the suffix's needless locants (NEEDLESS_LOCANTS) — each with its code,
 * trace rule, message and the step «Ver el paso» opens; the student's chain
 * beside the parent, the focus and the tiles; the explanation step each opens
 * says the rule; two sweeps over the acid fixture names (every `carboxílico`
 * rewritten as `carboxi` prefixes, every `oico` as `al` and a `hidroxi` on
 * its carbon); review of I-51d3: every –COOH of the molecule checked, a
 * split one outside the engine's suffix too (the repro
 * `1-hidroxi-2-(4-carboxiciclohexil)etanal` and its variants, a sweep over
 * the acid fixture names with every `carboxi` and every `carboxílico`
 * written `(hidroxioxometil)`: ACID_GROUP, never an aldehyde, a ketone or an
 * alcohol); MISSING_LOCANTS with the –COOH groups' words; the one null
 * left (a student's acid suffix beside another principal group, never built:
 * a made-up naming); controls; the drafts.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import {
  OICO_ID, CARBOXYLIC_ID, CARBOXY_ID, AL_ID, HYDROXY_ID, OXO_ID, tileId,
} from '../../src/reverse/tiles.js';
import {
  diagnose, diagnosisNaming, diagnosisExplanation, DIAGNOSES, DIAGNOSIS_CODES, DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES, STEP_FALLBACKS,
} from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { diagnosisLegend } from '../../src/ui/draw-name.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { seq, readFixtures, isAcid, isAcidName, isAcidTemplateName } from './reverse-words.js';

/** The codes only an acid gives (diagnose.js header «Acids»). */
const ACID_CODES = Object.freeze(['ACID_GROUP', 'ACID_CARBON']);

/** The codes an acid shares with the aldehydes and ketones, their words keyed by the –COOH (diagnose.js «Acids»). */
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
 * Asserts the invariants of a diagnosed `otherName` verdict of an acid: the
 * engine's principal group a –COOH; a known code with its rule; a Spanish
 * message with every blank filled that never speaks of «grupo(s) –OH», and of
 * a –CHO or C=O only where the student's own group is one (ACID_GROUP,
 * CARBONYL_SENIORITY, KETONE_NOT_ALDEHYDE); a JSON-safe object; atom and bond
 * ids of the verdict's molecule; the student's chain — or ring, its closing
 * bond last — a path of bonds; the app's parent the naming's (in the
 * diagnosis's style); a step that diagnosisExplanation() resolves and opens.
 *
 * @param {object} verdict - An `otherName` verdict with a diagnosis.
 * @param {string} label - Assertion label.
 * @returns {object} The explanation step «Ver el paso» opens.
 */
function assertAcidDiagnosis(verdict, label) {
  const d = verdict.diagnosis;
  assert.equal(verdict.kind, 'otherName', label);
  assert.equal(verdict.naming.structure.suffix.kind, 'acid', label);
  assert.ok(d, `${label}: no diagnosis`);
  assert.ok(DIAGNOSES[d.code], `${label}: ${d.code}`);
  if (d.code !== 'ETHER_SIDE') {
    assert.equal(d.rule, DIAGNOSES[d.code].rule, label); // ETHER_SIDE keeps the rule of the draft it replaces.
  }
  assert.ok(d.message.length > 0 && !/undefined|null|NaN|\[object|grupo –OH|grupos –OH/.test(d.message), `${label}: ${d.message}`);
  if (!['ACID_GROUP', 'CARBONYL_SENIORITY', 'KETONE_NOT_ALDEHYDE'].includes(d.code)) {
    assert.doesNotMatch(d.message, /–CHO|C=O/, `${label}: ${d.message}`);
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
} // End of function assertAcidDiagnosis()

/** How the engine writes an acid's –COOH groups, by suffix: ACID_GROUP, CARBONYL_SENIORITY, ACID_CARBON, CARBONYL_PREFIX. */
const WRITTEN = (ending) => `con la palabra «ácido» al principio del nombre y la terminación «-${ending}» al final`;

/** The same for benzene with one –COOH. */
const BENZOIC = 'con «ácido benzoico» (el benceno con un grupo –COOH)';

/** The first sentence of ACID_GROUP. */
const ONE_GROUP = 'Un C=O y un –OH en el mismo carbono no son dos grupos distintos: juntos forman un solo grupo, el –COOH de los '
  + 'ácidos carboxílicos (su –OH no es un alcohol, ni su C=O un aldehído o una cetona). ';

/** ACID_GROUP for a split –COOH the engine writes as a `carboxi` prefix (review of phase I-51d3), before the ending's words. */
const NOT_ENDING = `${ONE_GROUP}Ese –COOH no da la terminación del nombre: se nombra con el prefijo «carboxi», delante. La `
  + 'terminación es para el otro grupo –COOH, que se nombra ';

/** What no message may claim when the molecule's –COOH groups were written split: an aldehyde, a ketone or an alcohol. */
const JUNIOR_CLAIM = /del aldehído|de la cetona|el –OH va|cada –OH|cada –CHO|cada C=O|una cetona, no|el de un aldehído/;

/** The seniority sentence CARBONYL_SENIORITY starts with beside an acid. */
const SENIORITY = 'Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: ácido > aldehído > cetona '
  + '> alcohol. Aquí manda el ácido (–COOH), que se nombra ';

/** The rule ACID_CARBON states on a chain. */
const ON_CHAIN = 'La terminación «-carboxílico» solo se usa cuando el grupo –COOH está unido a un anillo. En una cadena, el carbono '
  + 'del –COOH es un carbono más de la cadena principal, siempre en un extremo, y el grupo se nombra ';

/** The rule ACID_CARBON states beside a ring. */
const ON_RING = 'Cuando el grupo –COOH está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la '
  + 'cadena principal es el anillo, y el grupo se nombra ';

/** The ring-or-chain rule as the CARBONYL_PARENT message states it for the –COOH groups, before the counts. */
const RING_OR_CHAIN = 'La cadena principal es la que lleva más grupos –COOH, sea el anillo o una cadena abierta; solo si empatan manda '
  + 'el anillo. Aquí ';

/** RING_NUMBERING at N0 for the –COOH groups, before the locants. */
const N0 = 'Hay que numerar el anillo de otra manera, empezando en otro carbono o contando hacia el otro lado: los grupos –COOH (el '
  + 'grupo principal) tienen que llevar los números más bajos ';

/**
 * One case per acid mistake (the former deliberate nulls of I-51d1 and
 * I-51d2, then the variants): [name or tile words, code, trace rule, the
 * step «Ver el paso» opens, message].
 */
const CASES = [
  // 1. A –COOH written as two groups on one carbon: `al` or `ol` with `hidroxi` or `oxo`, two prefixes, a compound branch.
  ['1-hidroxipropanal', 'ACID_GROUP', null, 'group', `${ONE_GROUP}El grupo –COOH es el grupo principal: se nombra ${WRITTEN('oico')}. `
    + 'Se escribe «ácido propanoico».'],
  ['1-oxopropan-1-ol', 'ACID_GROUP', null, 'group', `${ONE_GROUP}El grupo –COOH es el grupo principal: se nombra ${WRITTEN('oico')}. `
    + 'Se escribe «ácido propanoico».'],
  ['1 hidroxi 1 oxo prop ano', 'ACID_GROUP', null, 'group', `${ONE_GROUP}El grupo –COOH es el grupo principal: se nombra `
    + `${WRITTEN('oico')}. Se escribe «ácido propanoico».`],
  ['START hidroxi oxo met il END ciclo hex ano', 'ACID_GROUP', null, 'group', `${ONE_GROUP}El grupo –COOH es el grupo principal: se `
    + `nombra ${WRITTEN('carboxílico')}. Se escribe «ácido ciclohexanocarboxílico».`],
  ['6 START hidroxi oxo met il END benzaldehído', 'ACID_GROUP', null, 'group', `${ONE_GROUP}El grupo –COOH es el grupo principal: se `
    + `nombra ${BENZOIC}. Se escribe «ácido 2-formilbenzoico».`],
  ['ácido 4-hidroxi-4-oxobutanoico', 'ACID_GROUP', null, 'group', `${ONE_GROUP}Los grupos –COOH son el grupo principal: los de la `
    + `cadena principal se nombran todos juntos ${WRITTEN('dioico')}. Se escribe «ácido butanodioico».`],
  // Review of I-51d3: a split –COOH that is not the engine's suffix group (the engine writes it `carboxi`, in a branch) — never a
  // seniority message about an aldehyde: `al` + `hidroxi`, `ol` + `oxo`, `hidroxi` + `oxo` on the student's chain beside the
  // ring's –COOH, in a branch of the ring, and a split –COOH that becomes a suffix group (on a branch carbon, on the ring).
  ['1-hidroxi-2-(4-carboxiciclohexil)etanal', 'ACID_GROUP', null, 'group', `${NOT_ENDING}${WRITTEN('carboxílico')}. Se escribe `
    + '«ácido 4-(carboximetil)ciclohexano-1-carboxílico».'],
  ['3 START 4 carboxi ciclo hex il END 1 oxo prop ano 1 ol', 'ACID_GROUP', null, 'group', `${NOT_ENDING}${WRITTEN('carboxílico')}. Se `
    + 'escribe «ácido 4-(2-carboxietil)ciclohexano-1-carboxílico».'],
  ['3 START 4 carboxi ciclo hex il END 1 hidroxi 1 oxo prop ano', 'ACID_GROUP', null, 'group', `${NOT_ENDING}`
    + `${WRITTEN('carboxílico')}. Se escribe «ácido 4-(2-carboxietil)ciclohexano-1-carboxílico».`],
  ['ácido 4-(2-hidroxi-2-oxoetil)ciclohexano-1-carboxílico', 'ACID_GROUP', null, 'group', `${NOT_ENDING}${WRITTEN('carboxílico')}. `
    + 'Se escribe «ácido 4-(carboximetil)ciclohexano-1-carboxílico».'],
  ['ácido 2-(2-hidroxi-2-oxoetil)butanoico', 'ACID_GROUP', null, 'group', `${ONE_GROUP}Los grupos –COOH son el grupo principal: los `
    + `de la cadena principal se nombran todos juntos ${WRITTEN('dioico')}. Se escribe «ácido 2-etilbutanodioico».`],
  ['ácido 2-[4-(hidroxioxometil)ciclohexil]etanoico', 'ACID_GROUP', null, 'group', `${ONE_GROUP}El grupo –COOH es el grupo `
    + `principal: se nombra ${WRITTEN('carboxílico')}. Se escribe «ácido 4-(carboximetil)ciclohexano-1-carboxílico».`],
  // 2. A junior group as the suffix beside the –COOH: the order, how the –COOH is written, the junior group's prefix.
  ['4-carboxibutan-2-ona', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}${WRITTEN('oico')}; el C=O de la cetona va delante, con `
    + 'el prefijo «oxo». Se escribe «ácido 4-oxopentanoico».'],
  ['3-carboxipropanal', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}${WRITTEN('oico')}; el –CHO del aldehído va delante, con el `
    + 'prefijo «oxo». Se escribe «ácido 4-oxobutanoico».'],
  ['4-carboxiciclohexano-1-carbaldehído', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}${WRITTEN('carboxílico')}; el –CHO del `
    + 'aldehído va delante, con el prefijo «formil». Se escribe «ácido 4-formilciclohexano-1-carboxílico».'],
  ['4-carboxibenzaldehído', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}${BENZOIC}; el –CHO del aldehído va delante, con el `
    + 'prefijo «formil». Se escribe «ácido 4-formilbenzoico».'],
  ['4-carboxifenol', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}${BENZOIC}; el –OH va delante, con el prefijo «hidroxi». Se `
    + 'escribe «ácido 4-hidroxibenzoico».'],
  ['2-carboxietan-1-ol', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY}${WRITTEN('oico')}; el –OH va delante, con el prefijo `
    + '«hidroxi». Se escribe «ácido 3-hidroxipropanoico».'],
  // An `al` a branch bonds to a second carbon is a ketone's C=O: KETONE_NOT_ALDEHYDE says so, never «el –CHO del aldehído».
  ['1-carboxibutanal', 'KETONE_NOT_ALDEHYDE', null, 'group', 'El grupo –CHO de un aldehído va en un extremo de la cadena: su carbono '
    + 'solo puede unirse a un carbono más. Aquí la rama «carboxi» está en el carbono 1, que así queda unido a dos carbonos: su C=O '
    + 'es el de una cetona, no el de un aldehído. Se escribe «ácido 2-oxopentanoico».'],
  // 3. The –COOH's carbon on the other side of the parent: `carboxílico` on a chain; the –COOH's carbon as the chain beside a ring.
  ['ácido propano-1-carboxílico', 'ACID_CARBON', null, 'group', `${ON_CHAIN}${WRITTEN('oico')}. Se escribe «ácido butanoico».`],
  ['ácido butano-1,4-dicarboxílico', 'ACID_CARBON', null, 'group', `${ON_CHAIN}${WRITTEN('dioico')}. Se escribe «ácido hexanodioico».`],
  ['ácido ciclohexilmetanoico', 'ACID_CARBON', null, 'group', `${ON_RING}${WRITTEN('carboxílico')}. Se escribe «ácido `
    + 'ciclohexanocarboxílico».'],
  ['ácido fenilmetanoico', 'ACID_CARBON', null, 'group', `${ON_RING}${BENZOIC}. Se escribe «ácido benzoico».`],
  ['ácido fenilfórmico', 'ACID_CARBON', null, 'group', `${ON_RING}${BENZOIC}. Se escribe «ácido benzoico».`],
  ['ácido (4-metilfenil)fórmico', 'ACID_CARBON', null, 'group', `${ON_RING}${BENZOIC}. Se escribe «ácido 4-metilbenzoico».`],
  // 4. A principal –COOH written `carboxi`: no suffix, or fewer –COOH groups in it; its carbon joins a chain.
  ['carboxiciclohexano', 'CARBONYL_PREFIX', null, 'group', `El grupo –COOH es el grupo principal: se nombra ${WRITTEN('carboxílico')}, `
    + 'no con el prefijo «carboxi». Se escribe «ácido ciclohexanocarboxílico».'],
  ['carboxibenceno', 'CARBONYL_PREFIX', null, 'group', `El grupo –COOH es el grupo principal: se nombra ${BENZOIC}, no con el `
    + 'prefijo «carboxi». Se escribe «ácido benzoico».'],
  ['4-carboxitolueno', 'CARBONYL_PREFIX', null, 'group', `El grupo –COOH es el grupo principal: se nombra ${BENZOIC}, no con el `
    + 'prefijo «carboxi». Se escribe «ácido 4-metilbenzoico».'],
  ['1-carboxipropano', 'CARBONYL_PREFIX', null, 'group', `El grupo –COOH es el grupo principal: se nombra ${WRITTEN('oico')}, no con `
    + 'el prefijo «carboxi». Su carbono entra en la cadena principal. Se escribe «ácido butanoico».'],
  ['dicarboximetano', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –COOH son el grupo principal: los de la cadena principal se '
    + `nombran todos juntos ${WRITTEN('dioico')}, no con el prefijo «carboxi». Su carbono entra en la cadena principal. Se escribe `
    + '«ácido propanodioico».'],
  ['ácido 3-carboxipropanoico', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –COOH son el grupo principal: los de la cadena '
    + `principal se nombran todos juntos ${WRITTEN('dioico')}, no con el prefijo «carboxi». Su carbono entra en la cadena principal. `
    + 'Se escribe «ácido butanodioico».'],
  ['ácido 2-carboxiciclohexano-1-carboxílico', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –COOH son el grupo principal: los '
    + `unidos al anillo se nombran todos juntos ${WRITTEN('dicarboxílico')}, no con el prefijo «carboxi». Se escribe «ácido `
    + 'ciclohexano-1,2-dicarboxílico».'],
  ['1,3-dicarboxiciclohexano', 'CARBONYL_PREFIX', null, 'group', 'Los grupos –COOH son el grupo principal: los unidos al anillo se '
    + `nombran todos juntos ${WRITTEN('dicarboxílico')}, no con el prefijo «carboxi». Se escribe «ácido `
    + 'ciclohexano-1,3-dicarboxílico».'],
  // 5. The ring or a chain, decided by the –COOH groups: the chain with more, a tie (the ring), every –COOH on the ring.
  ['ácido 4-(1,2-dicarboxietil)ciclohexano-1-carboxílico', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo `
    + 'lleva uno y la mejor cadena, 2, así que gana la cadena y el anillo va en una rama: «ácido '
    + '2-(4-carboxiciclohexil)butanodioico».'],
  ['ácido 2-(4-carboxiciclohexil)etanoico', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo y la mejor `
    + 'cadena llevan uno cada uno, así que gana el anillo: «ácido 4-(carboximetil)ciclohexano-1-carboxílico».'],
  ['(4-carboxifenil)metano', 'CARBONYL_PARENT', 'RING', 'benzene', `${RING_OR_CHAIN}el anillo lleva uno y las cadenas no llevan `
    + 'ninguno, así que gana el anillo: «ácido 4-metilbenzoico».'],
  ['(2-carboxietil)ciclohexano', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo no lleva ninguno y la mejor `
    + 'cadena, uno, así que gana la cadena y el anillo va en una rama: «ácido 3-ciclohexilpropanoico».'],
  // 6. Another chain with more –COOH groups (P0), also a chain with none; and told from the ether oxygen.
  ['ácido 3-(carboximetil)pentanoico', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos –COOH (2; la '
    + 'tuya tiene 1). La cadena principal es la que lleva más grupos –COOH, aunque no sea la más larga.'],
  ['3-(carboximetil)pentano', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos –COOH (1; la tuya tiene '
    + '0). La cadena principal es la que lleva más grupos –COOH, aunque no sea la más larga.'],
  ['START 2 carboxi et il oxi END met ano', 'ETHER_SIDE', 'P0', 'ether', 'El oxígeno del éter (–O–) corta la molécula en dos lados, y '
    + 'la cadena principal no puede pasar por él: se busca en uno de los dos lados, con las reglas de siempre. Aquí la cadena '
    + 'principal está en el otro lado del oxígeno, no en el de tu cadena: primero cuenta el grupo principal, y en ese lado hay un '
    + 'grupo –COOH y en tu cadena, ninguno. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: «ácido 3-metoxipropanoico».'],
  // 7. The –COOH groups numbered otherwise (N0): a ring, benzene, one –COOH whose 1 the engine does not write, beside `eno`.
  ['ácido ciclohexano-1,5-dicarboxílico', 'RING_NUMBERING', 'N0', 'ringNumbering', `${N0}(3 en vez de 5).`],
  ['ácido benceno-1,5-dicarboxílico', 'RING_NUMBERING', 'N0', 'ringNumbering', `${N0}(3 en vez de 5).`],
  ['ácido ciclohexano-2-carboxílico', 'RING_NUMBERING', 'N0', 'ringNumbering', `${N0}(1 en vez de 2). En «ácido `
    + 'ciclohexanocarboxílico» ese número ni siquiera se escribe.'],
  ['ácido 3-metilciclohex-1-eno-1,5-dicarboxílico', 'RING_NUMBERING', 'N0', 'ringNumbering', `${N0}(3 en vez de 5).`],
  // 8. Needless suffix locants: the –COOH group's words.
  ['ácido ciclohexano-1-carboxílico', 'NEEDLESS_LOCANTS', null, 'ringNumbering', 'En «ácido ciclohexanocarboxílico» no se escriben '
    + 'números: solo hay una manera de colocar el grupo –COOH.'],
  ['ácido benceno-1-carboxílico', 'NEEDLESS_LOCANTS', null, 'assemble', 'En «ácido benzoico» no se escriben números: solo hay una '
    + 'manera de colocar el grupo –COOH.'],
  // 9. Old-style suffix locants already speak of the suffix's words (phase I-51d1).
  ['ácido 1,4-ciclohexanodicarboxílico', 'OLD_STYLE', null, 'assemble', 'Has escrito los números delante de la raíz, como se hacía '
    + 'antes. Hoy van detrás, justo delante de «dicarboxílico»: «ácido ciclohexano-1,4-dicarboxílico».'],
];

test('one case per acid mistake: the code, its trace rule, the step «Ver el paso» opens and the message', () => {
  const seen = new Set();
  for (const [name, code, traceRule, opened, message] of CASES) {
    const verdict = read(name);
    const step = assertAcidDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule], [code, traceRule], `${name}: ${d.message}`);
    assert.equal(step.id, opened, `${name}: the step «Ver el paso» opens`);
    assert.equal(d.message, message, name);
    seen.add(code);
  } // End of the loop over the cases
  assert.deepEqual([...ACID_CODES, ...SHARED_CODES].filter((code) => !seen.has(code)), [], 'every acid code has a case');
}); // End of test 'one case per acid mistake…'

test('the student\'s chain beside the parent, what the message is about and its tiles', () => {
  // ACID_GROUP: the same chain; the focus is the whole –COOH (its carbon, both oxygens, their bonds); the `1-hidroxi` tiles.
  const split = read('1-hidroxipropanal');
  const cho = split.suffixAtoms[0];
  const oh = split.prefixAtoms[0];
  assert.deepEqual(sorted(split.diagnosis.focus.atoms), sorted([cho.parentAtom, cho.attachment, oh.attachment]));
  assert.deepEqual(sorted(split.diagnosis.focus.bonds), sorted([cho.bond, oh.bond]));
  assert.deepEqual(split.diagnosis.tiles, [0, 2], '«1-hidroxi»');
  assert.deepEqual(diagnosisLegend(split.diagnosis).map((e) => e.text), ['Cadena principal', 'Tu cadena (es la misma)']);
  // ACID_CARBON on a chain: the student's three carbons beside the app's four; the focus is the –COOH, its OH too; the suffix.
  const chain = read('ácido propano-1-carboxílico');
  const group = chain.suffixAtoms[0];
  const d = chain.diagnosis;
  assert.deepEqual([d.student.atoms.length, d.parent.atoms.length], [3, 4]);
  assert.ok(d.parent.atoms.includes(group.carbon), 'the –COOH\'s carbon is the parent\'s');
  assert.deepEqual(d.focus, { atoms: [group.carbon, group.attachment, group.hydroxy], bonds: [group.bond, group.hydroxyBond] });
  assert.deepEqual(d.tiles, [3, 5], '«1», «carboxílico»');
  assert.deepEqual(diagnosisLegend(d).map((e) => e.text), ['Cadena principal', 'Tu cadena']);
  // ACID_CARBON beside a ring: the –COOH's carbon was the student's whole chain; the template's tile.
  const ring = read('ácido fenilfórmico').diagnosis;
  assert.deepEqual([ring.student.atoms.length, ring.parent.atoms.length], [1, 6]);
  assert.deepEqual(ring.tiles, [2, 3], '«fórmico»');
  assert.deepEqual(diagnosisLegend(ring).map((e) => e.text), ['Cadena principal (el anillo)', 'Tu cadena']);
  // CARBONYL_PREFIX: the student's ring is the parent; the focus is the `carboxi` (its three atoms and their bonds); its tile.
  const prefix = read('carboxiciclohexano');
  assert.deepEqual(prefix.diagnosis.focus.atoms, prefix.prefixAtoms[0].atoms);
  assert.equal(prefix.diagnosis.focus.bonds.length, 3);
  assert.deepEqual(prefix.diagnosis.tiles, [0, 1], '«carboxi»');
  assert.deepEqual(diagnosisLegend(prefix.diagnosis).map((e) => e.text), ['Cadena principal (el anillo)', 'Tu anillo (es el mismo)']);
  // CARBONYL_SENIORITY: the student's ketone C=O; the suffix's tiles.
  const senior = read('4-carboxibutan-2-ona');
  assert.deepEqual(senior.diagnosis.focus, { atoms: [senior.suffixAtoms[0].parentAtom, senior.suffixAtoms[0].attachment],
    bonds: [senior.suffixAtoms[0].bond] });
  assert.deepEqual(senior.diagnosis.tiles, [4, 6], '«2», «ona»');
  // CARBONYL_PARENT: the ring beside the student's chain; the tiles of the ring branch.
  const parent = read('ácido 2-(4-carboxiciclohexil)etanoico').diagnosis;
  assert.ok(!parent.parent.atoms.some((id) => parent.student.atoms.includes(id)));
  assert.deepEqual(parent.tiles, [1, 9], '«2-(4-carboxiciclohexil)»');
  assert.deepEqual(diagnosisLegend(parent).map((e) => e.text), ['Cadena principal (el anillo)', 'Tu cadena']);
}); // End of test 'the student's chain beside the parent…'

test('the step «Ver el paso» opens explains the acid rule the message states', () => {
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
  assert.match(opened('1-hidroxipropanal'), /Los tres átomos forman un solo grupo: el –OH del –COOH no es un alcohol/);
  assert.match(opened('4-carboxibutan-2-ona'), /ácido > aldehído > cetona > alcohol\. Aquí manda el ácido/);
  assert.match(opened('ácido propano-1-carboxílico'), /siempre está en un extremo de la cadena\. Ese carbono es un carbono más de la cadena/);
  assert.match(opened('ácido ciclohexilmetanoico'), /tampoco forma una cadena aparte: el anillo es la \[\[cadena principal\]\]/);
  assert.match(opened('carboxiciclohexano'), /El grupo –COOH es el \[\[grupo principal\]\]: el nombre empieza por la palabra «ácido»/);
  assert.match(opened('ácido 2-(4-carboxiciclohexil)etanoico'), /mayor número posible de grupos –COOH\. Solo si hay empate manda el anillo/);
  assert.match(opened('ácido 3-(carboximetil)pentanoico'), /el mayor número posible de grupos –COOH/);
  assert.match(opened('ácido ciclohexano-1,5-dicarboxílico'), /los grupos –COOH \(el \[\[grupo principal\]\]\) deben tener los/);
}); // End of test 'the step «Ver el paso» opens explains…'

/**
 * The tile ids of an acid name with its `carboxílico` suffix rewritten as
 * `carboxi` prefixes before the parent, the class word `ácido` left out
 * (`ácido ciclohexano-1,4-dicarboxílico` → `1,4-dicarboxiciclohexano`, `ácido
 * 2-metilbencenocarboxílico`… the locants the reading places); null for a name
 * whose –COOH another word places (`oico`, `benzoico`, the templates).
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asCarboxyPrefixes(ids) {
  const { tree } = parse(ids);
  const { suffix } = tree.parent;
  if (!suffix || ids[suffix.range[1] - 1] !== CARBOXYLIC_ID) {
    return null;
  }
  const locants = readName(ids).suffixAtoms.map((g) => g.locant).sort((p, q) => p - q).map((value) => tileId('num', value));
  const prefix = [...locants, ...(suffix.multiplier === null ? [] : [ids[suffix.multiplier]]), CARBOXY_ID];
  const from = tree.suffixClass ? tree.suffixClass.range[1] : 0;
  return [...prefix, ...ids.slice(from, suffix.range[0]), ...ids.slice(suffix.range[1])];
} // End of function asCarboxyPrefixes()

/**
 * The tile ids of an acid name with its chain's `oico` rewritten as `al` and
 * a `hidroxi` on each –COOH's carbon, the class word `ácido` left out (`ácido
 * butanoico` → `1-hidroxibutanal`, `ácido butanodioico` →
 * `1,4-dihidroxibutanodial`): every –COOH written as two groups; null for any
 * other suffix.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asAldehydeAndHydroxy(ids) {
  const { tree } = parse(ids);
  const { suffix } = tree.parent;
  if (!suffix || ids[suffix.range[1] - 1] !== OICO_ID) {
    return null;
  }
  const locants = readName(ids).suffixAtoms.map((g) => g.locant).sort((p, q) => p - q).map((value) => tileId('num', value));
  const prefix = [...locants, ...(locants.length > 1 ? [tileId('mult', locants.length)] : []), HYDROXY_ID];
  const from = tree.suffixClass ? tree.suffixClass.range[1] : 0;
  const rest = ids.slice(from);
  rest[suffix.range[1] - 1 - from] = AL_ID;
  return [...prefix, ...rest];
} // End of function asAldehydeAndHydroxy()

/** How many acid fixture names have a `carboxílico` suffix, and how many an `oico` one (phase R-5d1's names). */
const SWEEP_COUNTS = Object.freeze({ carboxy: 32, split: 92 });

test('sweeps over the acid fixture names: `carboxílico` as `carboxi` prefixes, `oico` as `al` and `hidroxi`', async () => {
  const names = (await readFixtures()).filter((row) => isAcid(row.smiles)).flatMap((row) => row.names)
    .filter((name) => isAcidName(name) && !isAcidTemplateName(name));
  const counts = { carboxy: 0, split: 0 };
  for (const name of names) {
    const ids = tokenize(name);
    for (const [kind, rewrite, code] of [['carboxy', asCarboxyPrefixes, 'CARBONYL_PREFIX'], ['split', asAldehydeAndHydroxy, 'ACID_GROUP']]) {
      const mutated = rewrite(ids);
      if (!mutated) {
        continue;
      }
      counts[kind] += 1;
      const verdict = readName(mutated);
      const label = `${name} → ${verdict.text}`;
      assert.equal(verdict.kind, 'otherName', `${label}: ${verdict.message}`);
      assert.equal(verdict.name, readName(ids).name, `${label}: the same molecule`);
      assertAcidDiagnosis(verdict, label);
      assert.equal(verdict.diagnosis.code, code, `${label}: ${verdict.diagnosis.message}`);
      // The name quoted is the engine's in the student's prefix style.
      assert.ok(verdict.diagnosis.message.endsWith(`«${diagnosisNaming(verdict).name}».`), `${label}: ${verdict.diagnosis.message}`);
    } // End of the loop over the two rewrites
  } // End of the loop over the names
  assert.deepEqual(counts, { ...SWEEP_COUNTS });
}); // End of test 'sweeps over the acid fixture names…'

/** The tiles of `(hidroxioxometil)`: a –COOH written as a one-carbon branch with its C=O and its OH apart. */
const SPLIT = Object.freeze(['branch-start', HYDROXY_ID, OXO_ID, tileId('root', 1), tileId('freeValence', 1), 'branch-end']);

/**
 * The tile ids of an acid name with every `carboxi` prefix, at any depth,
 * written `(hidroxioxometil)` (`ácido 2-(carboximetil)ciclohexano-1-carboxílico`
 * → `ácido 2-[(hidroxioxometil)metil]ciclohexano-1-carboxílico`): a –COOH
 * the engine writes as a prefix, split; null for a name without one.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asSplitCarboxy(ids) {
  return ids.includes(CARBOXY_ID) ? ids.flatMap((id) => (id === CARBOXY_ID ? SPLIT : [id])) : null;
}

/**
 * The tile ids of an acid name with its `carboxílico` suffix rewritten as
 * `(hidroxioxometil)` prefixes before the parent, the class word left out
 * (`ácido ciclohexano-1,4-dicarboxílico` →
 * `1,4-di(hidroxioxometil)ciclohexano`): the engine's suffix –COOH groups,
 * split; null for another suffix.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asSplitCarboxylic(ids) {
  const prefixed = asCarboxyPrefixes(ids);
  return prefixed ? prefixed.flatMap((id) => (id === CARBOXY_ID ? SPLIT : [id])) : null;
}

/** How many acid fixture names have a `carboxi` prefix, and how many a `carboxílico` suffix (review of phase I-51d3). */
const SPLIT_COUNTS = Object.freeze({ prefix: 7, suffix: 32 });

test('review of I-51d3: every –COOH of the molecule is checked — split ones are ACID_GROUP, never an aldehyde, ketone or alcohol', async () => {
  const names = (await readFixtures()).filter((row) => isAcid(row.smiles)).flatMap((row) => row.names).filter(isAcidName);
  const counts = { prefix: 0, suffix: 0 };
  for (const name of names) {
    const ids = tokenize(name);
    for (const [kind, rewrite] of [['prefix', asSplitCarboxy], ['suffix', asSplitCarboxylic]]) {
      const mutated = rewrite(ids);
      if (!mutated) {
        continue;
      }
      counts[kind] += 1;
      const verdict = readName(mutated);
      const label = `${name} → ${verdict.text}`;
      assert.equal(verdict.kind, 'otherName', `${label}: ${verdict.message}`);
      assert.equal(verdict.name, readName(ids).name, `${label}: the same molecule`);
      assertAcidDiagnosis(verdict, label);
      assert.equal(verdict.diagnosis.code, 'ACID_GROUP', `${label}: ${verdict.diagnosis.message}`);
      assert.doesNotMatch(verdict.diagnosis.message, JUNIOR_CLAIM, label);
      // Every split –COOH is in the focus: its carbon and both oxygens.
      assert.equal(verdict.diagnosis.focus.atoms.length % 3, 0, label);
    } // End of the loop over the two rewrites
  } // End of the loop over the names
  assert.deepEqual(counts, { ...SPLIT_COUNTS });
  // The repro of the review: the ring's –COOH is the suffix; the other –COOH, written `al` + `hidroxi`, is in the focus.
  const repro = read('1-hidroxi-2-(4-carboxiciclohexil)etanal');
  const d = repro.diagnosis;
  assert.equal(d.code, 'ACID_GROUP');
  assert.doesNotMatch(d.message, JUNIOR_CLAIM);
  const cho = repro.suffixAtoms[0];
  assert.deepEqual(sorted(d.focus.atoms), sorted([cho.parentAtom, cho.attachment, repro.prefixAtoms[0].attachment]));
  assert.deepEqual(d.tiles, [0, 2], '«1-hidroxi»');
  // Its rendering when the split –COOH is not the suffix's, with several suffix groups.
  assert.equal(DIAGNOSIS_TEXTS.ACID_GROUP({ principal: false, count: 2, ending: 'dioico', acid: true, benzoic: false, on: 'chain',
    name: 'X' }), `${ONE_GROUP}Ese –COOH no da la terminación del nombre: se nombra con el prefijo «carboxi», delante. La terminación `
    + `es para los otros grupos –COOH, que se nombran todos juntos ${WRITTEN('dioico')}. Se escribe «X».`);
}); // End of test 'review of I-51d3: every –COOH of the molecule is checked…'

test('MISSING_LOCANTS names the –COOH groups when the suffix\'s locant is the one missing (diagnose() on its own)', () => {
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
  // Alone, a missing locant is the verdict `missingLocants`, never `otherName`; no later rule meets it on an acid.
  assert.equal(read('ácido 2-clorociclohexanocarboxílico').kind, 'missingLocants');
  const d = direct('ácido 2-clorociclohexanocarboxílico');
  assert.deepEqual([d.code, d.tiles], ['MISSING_LOCANTS', [6, 7]]);
  assert.equal(d.message, 'Faltan números: hay que decir en qué carbono va cada rama, cada enlace doble o triple y cada grupo –COOH, '
    + 'como en «ácido 2-clorociclohexano-1-carboxílico».');
  // A prefix's missing locant keeps the earlier words.
  assert.equal(direct('pentametilbenceno').message, 'Faltan números: hay que decir en qué carbono va cada rama y cada enlace doble o '
    + 'triple, como en «1,2,3,4,5-pentametilbenceno».');
}); // End of test 'MISSING_LOCANTS names the –COOH groups…'

test('the one acid null left: a student\'s acid suffix beside another principal group (never built, so a naming made up)', () => {
  // A student's acid suffix builds a –COOH, which the engine always names as the principal group (no group the app names is
  // senior to it; an ester's principal group is outside the rules): diagnose.js «Acids» keeps a null for the other case.
  const ids = tokenize('ácido propano-1-carboxílico');
  const { tree } = parse(ids);
  const verdict = readName(ids);
  const { structure } = verdict.naming;
  const madeUp = { ...verdict.naming, structure: { ...structure, suffix: { ...structure.suffix, kind: 'ketone' } } };
  assert.equal(diagnose({ tree, spec: interpret(tree) }, { ...verdict, naming: madeUp }), null);
  assert.equal(diagnose({ tree, spec: interpret(tree) }, verdict).code, 'ACID_CARBON', 'the real naming');
}); // End of test 'the one acid null left…'

test('controls: correct acid names have no diagnosis; a mistake the earlier rules name stays theirs', () => {
  for (const name of ['ácido butanoico', 'ácido butanodioico', 'ácido ciclohexanocarboxílico', 'ácido benzoico', 'ácido acético',
    'ácido 4-oxopentanoico', 'ácido 4-hidroxibenzoico', 'ácido 3-etilpentanodioico', 'ácido 4-(carboximetil)ciclohexano-1-carboxílico']) {
    const verdict = read(name);
    assert.ok(['correct', 'alternative'].includes(verdict.kind), `${name}: ${verdict.kind}`);
    assert.ok(!('diagnosis' in verdict), name);
  }
  // The rules of phases I-51d1 and I-51d2 keep their codes beside the new ones; N1–N4 after an N0 tie keep their own phrases.
  for (const [name, code] of [['ácido 4-metilbutanoico', 'BRANCH_AT_END'], ['ácido 2-etilpropanoico', 'LONGER_CHAIN'],
    ['ácido 4-metilhexanodioico', 'NUMBERING'], ['ácido 6-metilbenzoico', 'RING_NUMBERING'],
    ['ácido 5-metilciclohexano-1-carboxílico', 'RING_NUMBERING'], ['ácido 2-cloroacético', 'SUBSTITUTED_TEMPLATE'],
    ['ácido 2-fenilacético', 'NEEDLESS_LOCANTS'], ['ácido 5-metilftálico', 'RING_NUMBERING']]) {
    const verdict = read(name);
    assertAcidDiagnosis(verdict, name);
    assert.equal(verdict.diagnosis.code, code, `${name}: ${verdict.diagnosis.message}`);
  }
  assert.match(read('ácido 6-metilbenzoico').diagnosis.message, /los sustituyentes tienen que llevar los números más bajos/);
  assert.equal(read('ácido 5-metilciclohexano-1-carboxílico').diagnosis.traceRule, 'N3');
}); // End of test 'controls…'

test('the drafts of the acid rules: their place among the rules, their steps, every variant renders', () => {
  assert.deepEqual(ACID_CODES.map((code) => [DIAGNOSES[code].rule, DIAGNOSES[code].step]), [[1, 'group'], [1, 'group']]);
  // ACID_GROUP first, as acidChecks() runs first; ACID_CARBON beside ALDEHYDE_CARBON, its twin.
  assert.equal(DIAGNOSIS_CODES[0], 'ACID_GROUP');
  assert.equal(DIAGNOSIS_CODES[DIAGNOSIS_CODES.indexOf('ACID_CARBON') - 1], 'ALDEHYDE_CARBON');
  for (const code of [...ACID_CODES, ...SHARED_CODES]) {
    const text = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    assert.match(text, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(text, /undefined|null|NaN/, code);
  }
  const { ACID_GROUP, ACID_CARBON, CARBONYL_SENIORITY, CARBONYL_PREFIX, CARBONYL_PARENT, MORE_CARBONYL_GROUPS, NEEDLESS_LOCANTS }
    = DIAGNOSIS_TEXTS;
  const { ending, groupWords, carbonylN0, what } = DIAGNOSIS_PHRASES;
  assert.equal(DIAGNOSES.ACID_GROUP.example.name, 'ácido propanoico');
  assert.equal(DIAGNOSES.ACID_CARBON.example.name, 'ácido butanoico');
  // The –COOH's words, beside the C=O groups'.
  assert.deepEqual(groupWords.acid, { one: 'grupo –COOH', many: 'grupos –COOH' });
  assert.equal(carbonylN0.numberingReasons.acid, 'los grupos –COOH (el grupo principal) tienen que llevar los números más bajos');
  assert.equal(carbonylN0.lowerLocantsOf.acid, 'los grupos –COOH');
  assert.deepEqual([what.acid, what.acids], ['el grupo –COOH', 'los grupos –COOH']);
  assert.equal(DIAGNOSIS_PHRASES.acidSeniority, 'ácido > aldehído > cetona > alcohol');
  assert.equal(DIAGNOSIS_PHRASES.principal.acid, 'el ácido (–COOH)');
  // How the –COOH is written: the class word and the suffix, or `ácido benzoico`; the aldehyde and ketone wording unchanged.
  assert.equal(ending({ ending: 'dioico', benzaldehyde: false, acid: true, benzoic: false }), WRITTEN('dioico'));
  assert.equal(ending({ ending: 'carboxílico', benzaldehyde: false, acid: true, benzoic: true }), BENZOIC);
  assert.equal(ending({ ending: 'al', benzaldehyde: false }), 'con la terminación «-al», al final del nombre');
  // The variants: ACID_GROUP with several –COOH on a ring or outside it; ACID_CARBON beside benzene.
  assert.equal(ACID_GROUP({ count: 2, ending: 'dicarboxílico', acid: true, benzoic: false, on: 'outside', name: 'X' }), `${ONE_GROUP}`
    + `Los grupos –COOH son el grupo principal: los unidos al anillo se nombran todos juntos ${WRITTEN('dicarboxílico')}. Se `
    + 'escribe «X».');
  assert.equal(ACID_CARBON({ ring: true, ending: 'carboxílico', acid: true, benzoic: true, name: 'X' }), `${ON_RING}${BENZOIC}. Se `
    + 'escribe «X».');
  // The shared codes speak of the –COOH groups by their group: seniority, prefix, parent choice, P0; needless suffix locants.
  assert.equal(CARBONYL_SENIORITY({ group: 'acid', ending: 'oico', acid: true, benzoic: false, junior: 'aldehyde', count: 2,
    prefix: null, name: 'X' }), `${SENIORITY}${WRITTEN('oico')}; cada –CHO va delante, en los prefijos. Se escribe «X».`);
  assert.equal(CARBONYL_PREFIX({ group: 'acid', count: 2, ending: 'tricarboxílico', acid: true, benzoic: false, prefix: 'carboxi',
    joins: false, on: 'ring', name: 'X' }), 'Los grupos –COOH son el grupo principal: los del anillo se nombran todos juntos '
    + `${WRITTEN('tricarboxílico')}, no con el prefijo «carboxi». Se escribe «X».`);
  assert.match(CARBONYL_PARENT({ group: 'acid', ring: 2, chain: 2, chainParent: false, name: 'X' }), /^La cadena principal es la que lleva más grupos –COOH/);
  assert.match(MORE_CARBONYL_GROUPS({ group: 'acid', app: 2, student: 1 }), /^Hay otra cadena con más grupos –COOH \(2; la tuya tiene 1\)/);
  assert.equal(NEEDLESS_LOCANTS({ name: 'X', what: what.acids, kept: false }), 'En «X» no se escriben números: solo hay una manera de '
    + 'colocar los grupos –COOH.');
  assert.equal(DIAGNOSIS_TEXTS.CHAIN_LOCANTS({ rule: 'N0', group: 'acid', app: '1', student: '2' }), 'Hay otra cadena igual de larga '
    + 'que, bien numerada, da números más bajos a los grupos –COOH (1 en vez de 2): esa es la cadena principal.');
  assert.equal(DIAGNOSIS_PHRASES.etherSide({ reason: 'CARBONYL_PARENT', group: 'acid', ring: 1, chain: 1, chainParent: false }),
    'primero cuenta el grupo principal, y los dos lados llevan un grupo –COOH cada uno; en el empate, manda el anillo');
}); // End of test 'the drafts of the acid rules…'
