/**
 * @file Unit tests for the amide diagnoses of «¿Cómo se dibuja?»
 * (src/reverse/diagnose.js header «Amides», design.md §13.4 I-37, I-39d,
 * I-40c, §14 I-43b, I-44, §15.8 R-6d; phase I-52d4, R-6d4): one case per
 * mistake of the amide that phases I-52d1, I-52d2 and I-52d3 (and I-52c4a's
 * `1-aminobutanal`) left as a deliberate null — an amide written as two groups
 * on one carbon (AMIDE_GROUP, ESTER_GROUP's twin), a junior group as the
 * suffix beside the amide or a student's amide suffix beside an acid or an
 * ester (CARBONYL_SENIORITY with the seniority ácido > éster > amida >
 * nitrilo > aldehído > cetona > alcohol > amina), an `al` a branch makes a
 * ketone's (KETONE_NOT_ALDEHYDE), the amide's carbon on the other side of the
 * parent (AMIDE_CARBON, NITRILE_CARBON's twin), a principal amide written
 * `carbamoil` or as an acylamino prefix (CARBONYL_PREFIX), the ring against a
 * chain decided by the amide groups (CARBONYL_PARENT; also a tie on benzene,
 * whose trace has no `RINGCHAIN` step: review of I-52d4), another chain with
 * more amide groups (MORE_CARBONYL_GROUPS, P0, also told from an ether
 * oxygen, ETHER_SIDE), a carbamoyl prefix on an end whose C=O carbon the
 * chain takes in (AMIDE_IN_CHAIN, ESTER_IN_CHAIN's twin), an amide prefix's
 * own words (AMIDE_PREFIX_NAME, ESTER_PREFIX_NAME's twin, also on an ester's
 * O-bound side), the amide groups numbered otherwise (RING_NUMBERING at N0)
 * and the suffix's needless locants (NEEDLESS_LOCANTS) — each with its code,
 * trace rule, message and the step «Ver el paso» opens; the student's chain
 * beside the parent, the focus and the tiles; the explanation step each opens
 * says the rule; two sweeps over the amide fixture names (every `amida`
 * written as `amino` + `oxo` prefixes: AMIDE_GROUP; every `carboxamida` or
 * `benzamida` written as a `carbamoil` prefix: CARBONYL_PREFIX), the same
 * molecule and the engine's name quoted; MISSING_LOCANTS with the amide
 * groups' words; the «Amides» nulls left (a retained word's prefix style, the
 * pinned open question; an outside suffix after a chain beside another
 * group's chain, a cross-family gap); controls; the drafts.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { parse } from '../../src/reverse/parse.js';
import { interpret } from '../../src/reverse/interpret.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import {
  AMIDA_ID, CARBOXAMIDE_ID, BENZAMIDE_ID, BENZENE_ID, AMINO_ID, OXO_ID, CARBAMOYL_ID, NITROGEN_ID, tileId,
} from '../../src/reverse/tiles.js';
import {
  diagnose, diagnosisNaming, diagnosisExplanation, DIAGNOSES, DIAGNOSIS_CODES, DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES, STEP_FALLBACKS,
} from '../../src/reverse/diagnose.js';
import { explain } from '../../src/explain/explain.js';
import { diagnosisLegend } from '../../src/ui/draw-name.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { SENIORITY } from '../../src/naming/seniority.js';
import { seq, readFixtures, isAmide, isR6d1AmideName } from './reverse-words.js';

/** The codes only an amide gives (diagnose.js header «Amides»). */
const AMIDE_CODES = Object.freeze(['AMIDE_GROUP', 'AMIDE_CARBON', 'AMIDE_IN_CHAIN', 'AMIDE_PREFIX_NAME']);

/** The codes an amide shares with the other families, their words keyed by the amide group (diagnose.js «Amides»). */
const SHARED_CODES = Object.freeze(['CARBONYL_SENIORITY', 'KETONE_NOT_ALDEHYDE', 'CARBONYL_PREFIX', 'CARBONYL_PARENT',
  'MORE_CARBONYL_GROUPS', 'ETHER_SIDE', 'RING_NUMBERING', 'NEEDLESS_LOCANTS']);

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
 * Asserts the invariants of a diagnosed `otherName` verdict of an amide's own
 * mistake: a known code with its rule (ETHER_SIDE keeps the rule of the draft
 * it replaces); a Spanish message with every blank filled that, beside an
 * amide principal, never speaks of «grupo(s) –OH», –COOH, –COO– or of an
 * aldehyde's –CHO but where a junior group is named (CARBONYL_SENIORITY,
 * KETONE_NOT_ALDEHYDE); a JSON-safe object; atom and bond ids of the
 * verdict's molecule; the student's chain — or ring, its closing bond last — a
 * path of bonds; the app's parent the naming's (in the diagnosis's style); a
 * step that diagnosisExplanation() resolves and opens.
 *
 * @param {object} verdict - An `otherName` verdict with a diagnosis.
 * @param {string} label - Assertion label.
 * @returns {object} The explanation step «Ver el paso» opens.
 */
function assertAmideDiagnosis(verdict, label) {
  const d = verdict.diagnosis;
  const engine = verdict.naming.structure.suffix.kind;
  assert.equal(verdict.kind, 'otherName', label);
  assert.ok(d, `${label}: no diagnosis`);
  assert.ok(DIAGNOSES[d.code], `${label}: ${d.code}`);
  if (d.code !== 'ETHER_SIDE') {
    assert.equal(d.rule, DIAGNOSES[d.code].rule, label);
  }
  assert.ok(d.message.length > 0 && !/undefined|null|NaN|\[object/.test(d.message), `${label}: ${d.message}`);
  if (engine === 'amide' && !['CARBONYL_SENIORITY', 'KETONE_NOT_ALDEHYDE'].includes(d.code)) {
    assert.doesNotMatch(d.message, /–OH|–CHO|–COOH|–COO–|–C≡N/, `${label}: ${d.message}`);
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
} // End of function assertAmideDiagnosis()

/** How the engine writes its amide groups, by suffix. */
const WRITTEN = (ending) => `con la terminación «-${ending}», al final del nombre`;

/** How the engine writes one amide group on benzene. */
const BENZAMIDE = 'con «benzamida» (el benceno con un grupo amida)';

/** The first sentence of AMIDE_GROUP. */
const SPLIT = 'Un C=O y un nitrógeno en el mismo carbono no son dos grupos distintos: juntos forman un solo grupo, el grupo amida (su '
  + 'C=O no es un aldehído ni una cetona, ni su nitrógeno una amina). ';

/** The seniority sentence CARBONYL_SENIORITY starts with beside an amide: the whole order. */
const SENIORITY_FIRST = 'Cuando hay grupos distintos, solo uno es el grupo principal, y se elige por este orden: ácido > éster > '
  + 'amida > nitrilo > aldehído > cetona > alcohol > amina. Aquí manda ';

/** How the engine writes a junior amide whose C=O carbon is a carbon of its chain. */
const CHAIN_AMIDE = 'con dos prefijos con el mismo número: «oxo» para su C=O y «amino» para su nitrógeno, con los grupos unidos a él';

/** AMIDE_CARBON's rules, on a chain and beside a ring. */
const ON_CHAIN = 'La terminación «-carboxamida» solo se usa cuando el grupo amida está unido a un anillo. En una cadena, el carbono del '
  + 'grupo amida es un carbono más de la cadena principal, siempre en un extremo, y el grupo se nombra ';
const ON_RING = 'Cuando el grupo amida está unido a un anillo, su carbono no forma parte del anillo ni es una cadena aparte: la cadena '
  + 'principal es el anillo, y el grupo se nombra ';

/** The ring-or-chain rule as the CARBONYL_PARENT message states it for the amide groups, before the counts. */
const RING_OR_CHAIN = 'La cadena principal es la que lleva más grupos amida, sea el anillo o una cadena abierta; solo si empatan '
  + 'manda el anillo. Aquí ';

/** RING_NUMBERING at N0 for the amide groups. */
const N0 = 'los grupos amida (el grupo principal) tienen que llevar los números más bajos';

/** AMIDE_PREFIX_NAME `inChain`, before the chain it names. */
const COUNTS = 'El carbono del C=O de un grupo amida cuenta como un carbono más para la cadena ';

/** AMIDE_PREFIX_NAME `inChain`, after the chain it names, before the student's words. */
const PASSES = ', que se elige con las reglas de siempre: aquí esa cadena pasa por él, así que la amida no forma una rama aparte, ';

/** AMIDE_PREFIX_NAME `carbamoyl`, before what it adds. */
const CARBAMOYL = 'Un grupo amida unido por el carbono de su C=O, cuando ese carbono no es de una cadena, se nombra con un solo prefijo '
  + 'que lo incluye todo, «carbamoil»: el C=O con su nitrógeno';

/**
 * One case per amide mistake (the former deliberate nulls of I-52d1, I-52d2,
 * I-52d3 and I-52c4a, then the variants): [name or tile words, code, trace
 * rule, the step «Ver el paso» opens, message].
 */
const CASES = [
  // 1. An amide written as two groups on one carbon: on the student's chain (with groups on its nitrogen), on a parent-level prefix.
  ['1-aminobutanal', 'AMIDE_GROUP', null, 'group', `${SPLIT}El grupo amida es el grupo principal: se nombra ${WRITTEN('amida')}. `
    + 'Se escribe «butanamida».'],
  ['1-amino-1-oxobutano', 'AMIDE_GROUP', null, 'group', `${SPLIT}El grupo amida es el grupo principal: se nombra ${WRITTEN('amida')}. `
    + 'Se escribe «butanamida».'],
  ['1-(metilamino)butanal', 'AMIDE_GROUP', null, 'group', `${SPLIT}El grupo amida es el grupo principal: se nombra `
    + `${WRITTEN('amida')}. El otro grupo unido al nitrógeno va delante, con la letra «N» en vez de un número. Se escribe `
    + '«N-metilbutanamida».'],
  ['1-(dimetilamino)propanal', 'AMIDE_GROUP', null, 'group', `${SPLIT}El grupo amida es el grupo principal: se nombra `
    + `${WRITTEN('amida')}. Los otros grupos unidos al nitrógeno van delante, con la letra «N» en vez de un número. Se escribe `
    + '«N,N-dimetilpropanamida».'],
  ['4-amino-4-oxobutanamida', 'AMIDE_GROUP', null, 'group', `${SPLIT}Los grupos amida son el grupo principal: los de la cadena `
    + `principal se nombran todos juntos ${WRITTEN('diamida')}. Se escribe «butanodiamida».`],
  ['(aminooxometil)benceno', 'AMIDE_GROUP', null, 'group', `${SPLIT}El grupo amida es el grupo principal: se nombra ${BENZAMIDE}. Se `
    + 'escribe «benzamida».'],
  ['(aminooxometil)ciclohexano', 'AMIDE_GROUP', null, 'group', `${SPLIT}El grupo amida es el grupo principal: se nombra `
    + `${WRITTEN('carboxamida')}. Se escribe «ciclohexanocarboxamida».`],
  // 2. A junior group as the suffix beside the amide: the whole order, how the amide is written, the junior group's prefix.
  ['2-carbamoilbutanonitrilo', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se `
    + `nombra ${WRITTEN('amida')}; el –C≡N del nitrilo va delante, con el prefijo «ciano», que incluye su carbono: ese carbono no se `
    + 'cuenta en la cadena principal. Se escribe «2-cianobutanamida».'],
  ['4-carbamoilbutan-2-ona', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se `
    + `nombra ${WRITTEN('amida')}; el C=O de la cetona va delante, con el prefijo «oxo». Se escribe «4-oxopentanamida».`],
  ['3-carbamoilpropanal', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se nombra `
    + `${WRITTEN('amida')}; el –CHO del aldehído va delante, con el prefijo «oxo». Se escribe «4-oxobutanamida».`],
  ['2-(acetilamino)etan-1-ol', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se `
    + `nombra ${WRITTEN('amida')}; el –OH va delante, en los prefijos. Se escribe «N-(2-hidroxietil)etanamida».`],
  ['4-carbamoilfenol', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se nombra `
    + `${BENZAMIDE}; el –OH va delante, con el prefijo «hidroxi». Se escribe «4-hidroxibenzamida».`],
  ['4-carbamoilbenzaldehído', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}la amida (un C=O unido a un nitrógeno), que se `
    + `nombra ${BENZAMIDE}; el –CHO del aldehído va delante, con el prefijo «formil». Se escribe «4-formilbenzamida».`],
  // 3. A student's amide suffix beside an acid or an ester: `oxo` and `amino` on a chain carbon, `carbamoil`, an acylamino prefix,
  // in the name of the group bonded to the other oxygen.
  ['4-carboxibutanamida', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el ácido (–COOH), que se nombra con la palabra `
    + `«ácido» al principio del nombre y la terminación «-oico» al final; el grupo amida va delante, ${CHAIN_AMIDE}. Se escribe «ácido `
    + '5-amino-5-oxopentanoico».'],
  ['4-carboxi-N-metilbutanamida', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el ácido (–COOH), que se nombra con la `
    + `palabra «ácido» al principio del nombre y la terminación «-oico» al final; el grupo amida va delante, ${CHAIN_AMIDE}. Se escribe `
    + '«ácido 5-(metilamino)-5-oxopentanoico».'],
  ['4-carboxibenzamida', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el ácido (–COOH), que se nombra con «ácido benzoico» `
    + '(el benceno con un grupo –COOH); el grupo amida va delante, con el prefijo «carbamoil». Se escribe «ácido 4-carbamoilbenzoico».'],
  ['N-(carboximetil)etanamida', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el ácido (–COOH), que se nombra con la palabra `
    + '«ácido» al principio del nombre y la terminación «-oico» al final; el grupo amida va delante, con el prefijo «acetilamino». Se '
    + 'escribe «ácido 2-(acetilamino)etanoico».'],
  ['3-(metoxicarbonil)propanamida', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el éster (–COO–), que se nombra con la `
    + 'terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo»; el grupo amida va delante, '
    + `${CHAIN_AMIDE}. Se escribe «4-amino-4-oxobutanoato de metilo».`],
  ['2-(acetiloxi)etanamida', 'CARBONYL_SENIORITY', null, 'group', `${SENIORITY_FIRST}el éster (–COO–), que se nombra con la terminación `
    + '«-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo»; el grupo amida va en el nombre del grupo unido al '
    + `otro oxígeno, ${CHAIN_AMIDE}. Se escribe «etanoato de 2-amino-2-oxoetilo».`],
  // 4. An `al` a branch makes a ketone's, beside the amide.
  ['1-carbamoilbutanal', 'KETONE_NOT_ALDEHYDE', null, 'group', 'El grupo –CHO de un aldehído va en un extremo de la cadena: su carbono '
    + 'solo puede unirse a un carbono más. Aquí la rama «carbamoil» está en el carbono 1, que así queda unido a dos carbonos: su C=O es '
    + 'el de una cetona, no el de un aldehído. Se escribe «2-oxopentanamida».'],
  // 5. The amide's carbon on the other side of the parent: `carboxamida` after a chain, the amide's carbon as the student's chain.
  ['propano-1-carboxamida', 'AMIDE_CARBON', null, 'group', `${ON_CHAIN}${WRITTEN('amida')}. Se escribe «butanamida».`],
  ['butano-1,4-dicarboxamida', 'AMIDE_CARBON', null, 'group', `${ON_CHAIN}${WRITTEN('diamida')}. Se escribe «hexanodiamida».`],
  ['1-ciclohexilmetanamida', 'AMIDE_CARBON', null, 'group', `${ON_RING}${WRITTEN('carboxamida')}. Se escribe `
    + '«ciclohexanocarboxamida».'],
  ['1-fenilmetanamida', 'AMIDE_CARBON', null, 'group', `${ON_RING}${BENZAMIDE}. Se escribe «benzamida».`],
  ['N-metil-1-fenilmetanamida', 'AMIDE_CARBON', null, 'group', `${ON_RING}${BENZAMIDE}. Se escribe «N-metilbenzamida».`],
  // 6. A principal amide written `carbamoil` (its carbon joining the chain; with groups on its nitrogen) or as an acylamino prefix.
  ['carbamoilciclohexano', 'CARBONYL_PREFIX', null, 'group', `El grupo amida es el grupo principal: se nombra ${WRITTEN('carboxamida')}, `
    + 'no con el prefijo «carbamoil». Se escribe «ciclohexanocarboxamida».'],
  ['carbamoilbenceno', 'CARBONYL_PREFIX', null, 'group', `El grupo amida es el grupo principal: se nombra ${BENZAMIDE}, no con el `
    + 'prefijo «carbamoil». Se escribe «benzamida».'],
  ['4-carbamoiltolueno', 'CARBONYL_PREFIX', null, 'group', `El grupo amida es el grupo principal: se nombra ${BENZAMIDE}, no con el `
    + 'prefijo «carbamoil». Se escribe «4-metilbenzamida».'],
  ['1-carbamoilpropano', 'CARBONYL_PREFIX', null, 'group', `El grupo amida es el grupo principal: se nombra ${WRITTEN('amida')}, no `
    + 'con el prefijo «carbamoil». Su carbono entra en la cadena principal. Se escribe «butanamida».'],
  ['4-carbamoilbutanamida', 'CARBONYL_PREFIX', null, 'group', 'Los grupos amida son el grupo principal: los de la cadena principal se '
    + `nombran todos juntos ${WRITTEN('diamida')}, no con el prefijo «carbamoil». Su carbono entra en la cadena principal. Se escribe `
    + '«pentanodiamida».'],
  ['1,3-dicarbamoilciclohexano', 'CARBONYL_PREFIX', null, 'group', 'Los grupos amida son el grupo principal: los unidos al anillo se '
    + `nombran todos juntos ${WRITTEN('dicarboxamida')}, no con el prefijo «carbamoil». Se escribe «ciclohexano-1,3-dicarboxamida».`],
  ['(metilcarbamoil)ciclohexano', 'CARBONYL_PREFIX', null, 'group', 'El grupo amida es el grupo principal: se nombra '
    + `${WRITTEN('carboxamida')}, no con el prefijo «metilcarbamoil». El otro grupo unido al nitrógeno va delante, con la letra «N» en `
    + 'vez de un número. Se escribe «N-metilciclohexanocarboxamida».'],
  ['2-(acetilamino)propano', 'CARBONYL_PREFIX', null, 'group', `El grupo amida es el grupo principal: se nombra ${WRITTEN('amida')}, no `
    + 'con el prefijo «acetilamino». Tu cadena es el sustituyente «isopropil», que va unido al nitrógeno y se escribe con la letra «N» '
    + 'delante. Se escribe «N-isopropiletanamida».'],
  ['(acetilamino)benceno', 'CARBONYL_PREFIX', null, 'group', `El grupo amida es el grupo principal: se nombra ${WRITTEN('amida')}, no `
    + 'con el prefijo «acetilamino». Tu anillo es el sustituyente «fenil», que va unido al nitrógeno y se escribe con la letra «N» '
    + 'delante. Se escribe «N-feniletanamida».'],
  ['(benzoilamino)metano', 'CARBONYL_PREFIX', null, 'group', `El grupo amida es el grupo principal: se nombra ${BENZAMIDE}, no con el `
    + 'prefijo «benzoilamino». Tu cadena es el sustituyente «metil», que va unido al nitrógeno y se escribe con la letra «N» delante. Se '
    + 'escribe «N-metilbenzamida».'],
  // 7. The ring or a chain, decided by the amide groups: the chain with more, a tie (the ring), the ring with the only one.
  ['(carbamoilmetil)benceno', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo no lleva ninguno y la mejor `
    + 'cadena, uno, así que gana la cadena y el anillo va en una rama: «2-feniletanamida».'],
  ['(2-carbamoiletil)ciclohexano', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo no lleva ninguno y la mejor `
    + 'cadena, uno, así que gana la cadena y el anillo va en una rama: «3-ciclohexilpropanamida».'],
  ['2-(4-carbamoilciclohexil)etanamida', 'CARBONYL_PARENT', 'RINGCHAIN', 'ringChain', `${RING_OR_CHAIN}el anillo y la mejor cadena `
    + 'llevan uno cada uno, así que gana el anillo: «4-(2-amino-2-oxoetil)ciclohexano-1-carboxamida».'],
  ['(4-carbamoilfenil)metano', 'CARBONYL_PARENT', 'RING', 'benzene', `${RING_OR_CHAIN}el anillo lleva uno y las cadenas no llevan `
    + 'ninguno, así que gana el anillo: «4-metilbenzamida».'],
  // 8. Another chain with more amide groups (P0), also a chain with none; and told from the ether oxygen.
  ['3-(carbamoilmetil)pentano', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos amida (1; la tuya tiene 0). '
    + 'La cadena principal es la que lleva más grupos amida, aunque no sea la más larga.'],
  ['2-(carbamoilmetil)butanamida', 'MORE_CARBONYL_GROUPS', 'P0', 'groupChain', 'Hay otra cadena con más grupos amida (2; la tuya tiene '
    + '1). La cadena principal es la que lleva más grupos amida, aunque no sea la más larga.'],
  ['(2-amino-2-oxoetoxi)metano', 'ETHER_SIDE', 'P0', 'ether', 'El oxígeno del éter (–O–) corta la molécula en dos lados, y la cadena '
    + 'principal no puede pasar por él: se busca en uno de los dos lados, con las reglas de siempre. Aquí la cadena principal está en '
    + 'el otro lado del oxígeno, no en el de tu cadena: primero cuenta el grupo principal, y en ese lado hay un grupo amida y en tu '
    + 'cadena, ninguno. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: «2-metoxietanamida».'],
  // 9. A carbamoyl prefix on an end beside an acid or an ester, its C=O carbon the chain's (groups on its nitrogen too).
  ['ácido 3-carbamoilpropanoico', 'AMIDE_IN_CHAIN', 'P1', 'groupChain', 'El prefijo «carbamoil» está en el extremo de la cadena, y el '
    + 'carbono de su C=O la alarga: la cadena principal tiene 4 carbonos. Con ese carbono en la cadena, la amida ya no se nombra '
    + `«carbamoil», sino ${CHAIN_AMIDE}. Se escribe «ácido 4-amino-4-oxobutanoico».`],
  ['ácido 3-(metilcarbamoil)propanoico', 'AMIDE_IN_CHAIN', 'P1', 'groupChain', 'El prefijo «metilcarbamoil» está en el extremo de la '
    + 'cadena, y el carbono de su C=O la alarga: la cadena principal tiene 4 carbonos. Con ese carbono en la cadena, la amida ya no se '
    + `nombra «metilcarbamoil», sino ${CHAIN_AMIDE}. Se escribe «ácido 4-(metilamino)-4-oxobutanoico».`],
  ['3-carbamoilpropanoato de metilo', 'AMIDE_IN_CHAIN', 'P1', 'groupChain', 'El prefijo «carbamoil» está en el extremo de la cadena, y '
    + 'el carbono de su C=O la alarga: la cadena principal tiene 4 carbonos. Con ese carbono en la cadena, la amida ya no se nombra '
    + `«carbamoil», sino ${CHAIN_AMIDE}. Se escribe «4-amino-4-oxobutanoato de metilo».`],
  // 10. An amide prefix's own words: taken into a branch's chain, the engine's `carbamoil` written as another kind of branch.
  ['ácido 2-(carbamoilmetil)butanodioico', 'AMIDE_PREFIX_NAME', null, 'substituents', `${COUNTS}de la rama${PASSES}«carbamoil», sino `
    + `que se nombra ${CHAIN_AMIDE}. Se escribe «2-amino-2-oxoetil», no «carbamoilmetil».`],
  ['ácido 2-(aminooxometil)butanodioico', 'AMIDE_PREFIX_NAME', null, 'substituents', `${CARBAMOYL}; su C=O no se nombra con «oxo». Se `
    + 'escribe «carbamoil», no «aminooxometil».'],
  ['ácido 2-[(metilamino)oxometil]butanodioico', 'AMIDE_PREFIX_NAME', null, 'substituents', `${CARBAMOYL}, con los grupos unidos al `
    + 'nitrógeno delante, sin números; su C=O no se nombra con «oxo». Se escribe «metilcarbamoil», no «(metilamino)oxometil».'],
  // … and inside an ester's O-bound group: its own chain, a branch's, the engine's `carbamoil`.
  ['etanoato de 2-carbamoiletilo', 'AMIDE_PREFIX_NAME', null, 'ester', `${COUNTS}del grupo unido al oxígeno${PASSES}«carbamoil», sino `
    + `que se nombra ${CHAIN_AMIDE}. Se escribe «3-amino-3-oxopropilo», no «2-carbamoiletilo».`],
  ['etanoato de 3-(carbamoilmetil)heptilo', 'AMIDE_PREFIX_NAME', null, 'ester', `${COUNTS}de la rama${PASSES}«carbamoil», sino que se `
    + `nombra ${CHAIN_AMIDE}. Se escribe «3-(2-amino-2-oxoetil)heptilo», no «3-(carbamoilmetil)heptilo».`],
  ['etanoato de 3-(aminooxometil)heptilo', 'AMIDE_PREFIX_NAME', null, 'ester', `${CARBAMOYL}; su C=O no se nombra con «oxo». Se escribe `
    + '«3-carbamoilheptilo», no «3-(aminooxometil)heptilo».'],
  // 11. The amide groups numbered otherwise (N0): a ring, benzene, one group whose 1 the engine leaves out.
  ['ciclohexano-1,5-dicarboxamida', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en '
    + `otro carbono o contando hacia el otro lado: ${N0} (3 en vez de 5).`],
  ['benceno-1,5-dicarboxamida', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en otro '
    + `carbono o contando hacia el otro lado: ${N0} (3 en vez de 5).`],
  ['ciclohexano-2-carboxamida', 'RING_NUMBERING', 'N0', 'ringNumbering', 'Hay que numerar el anillo de otra manera, empezando en otro '
    + `carbono o contando hacia el otro lado: ${N0} (1 en vez de 2). En «ciclohexanocarboxamida» ese número ni siquiera se escribe.`],
  // 12. Needless suffix locants: the amide group's words; beside an `N` too.
  ['ciclohexano-1-carboxamida', 'NEEDLESS_LOCANTS', null, 'ringNumbering', 'En «ciclohexanocarboxamida» no se escriben números: solo hay '
    + 'una manera de colocar el grupo amida.'],
  ['benceno-1-carboxamida', 'NEEDLESS_LOCANTS', null, 'assemble', 'En «benzamida» no se escriben números: solo hay una manera de '
    + 'colocar el grupo amida.'],
  ['N-metilciclohexano-1-carboxamida', 'NEEDLESS_LOCANTS', null, 'ringNumbering', 'En «N-metilciclohexanocarboxamida» no se escriben '
    + 'números: solo hay una manera de colocar el grupo amida.'],
];

test('one case per amide mistake: the code, its trace rule, the step «Ver el paso» opens and the message', () => {
  const seen = new Set();
  for (const [name, code, traceRule, opened, message] of CASES) {
    const verdict = read(name);
    const step = assertAmideDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.deepEqual([d.code, d.traceRule], [code, traceRule], `${name}: ${d.message}`);
    assert.equal(step.id, opened, `${name}: the step «Ver el paso» opens`);
    assert.equal(d.message, message, name);
    // Every name a message quotes is the engine's, in the diagnosis's style (or a part of it, a branch's or a group's words).
    const engine = diagnosisNaming(verdict).name;
    for (const [, quoted] of d.message.matchAll(/Se escribe «([^»]+)»/g)) {
      assert.ok(engine.includes(quoted), `${name}: «${quoted}» in «${engine}»`);
    }
    seen.add(code);
  } // End of the loop over the cases
  assert.deepEqual([...AMIDE_CODES, ...SHARED_CODES].filter((code) => !seen.has(code)), [], 'every amide code has a case');
}); // End of test 'one case per amide mistake…'

test('a tie on benzene: the counts are the engine\'s even without a `RINGCHAIN` step (review of phase I-52d4)', () => {
  // The benzene pipeline writes no `RINGCHAIN` step, even when a chain on the benzamide's nitrogen carries an amide group as
  // the ring does: the message once said «el anillo lleva uno y las cadenas no llevan ninguno», false of the student's chain.
  const TIE = `${RING_OR_CHAIN}el anillo y la mejor cadena llevan uno cada uno, así que gana el anillo: `;
  for (const [name, engine] of [['2-(benzoilamino)etanamida', 'N-(2-amino-2-oxoetil)benzamida'],
    ['2-[benzoil(metil)amino]etanamida', 'N-(2-amino-2-oxoetil)-N-metilbenzamida']]) {
    const verdict = read(name);
    const step = assertAmideDiagnosis(verdict, name);
    const d = verdict.diagnosis;
    assert.ok(!verdict.naming.trace.some((s) => s.rule === 'RINGCHAIN'), `${name}: no RINGCHAIN step in the engine's trace`);
    assert.deepEqual([verdict.name, d.code, d.traceRule, step.id], [engine, 'CARBONYL_PARENT', 'RING', 'benzene'], name);
    assert.equal(d.message, `${TIE}«${engine}».`, name);
  } // End of the loop over the benzamide ties
  // The same molecule on a cyclohexane, whose trace has the step, says the same.
  const twin = read('2-[(ciclohexanocarbonil)amino]etanamida');
  assert.deepEqual([twin.diagnosis.code, twin.diagnosis.traceRule, twin.diagnosis.step], ['CARBONYL_PARENT', 'RINGCHAIN', 'ringChain']);
  assert.equal(twin.diagnosis.message, `${TIE}«N-(2-amino-2-oxoetil)ciclohexanocarboxamida».`);
}); // End of test 'a tie on benzene…'

test('the student\'s chain beside the parent, what the message is about and its tiles', () => {
  // AMIDE_GROUP: the split amide's carbon, =O and nitrogen with their bonds; the tiles of the student's prefix that holds them.
  const split = read('1-aminobutanal');
  const site = split.naming.structure.suffix.locants[0];
  assert.deepEqual(sorted(split.diagnosis.focus.atoms), sorted([site.atom, site.attachAtom, site.amideNitrogen]));
  assert.deepEqual(sorted(split.diagnosis.focus.bonds), sorted([site.bond, site.amideBond]));
  assert.deepEqual(split.diagnosis.tiles, [0, 2], '«1», «amino»');
  assert.deepEqual(split.diagnosis.student, split.studentParent);
  // AMIDE_CARBON beside a ring: the amide's carbon was the student's whole chain; the stripe and legend name the ring.
  const carbon = read('1-ciclohexilmetanamida');
  assert.deepEqual([carbon.diagnosis.student.atoms.length, carbon.diagnosis.parent.atoms.length], [1, 6]);
  assert.deepEqual(diagnosisLegend(carbon.diagnosis).map((e) => e.text), ['Cadena principal (el anillo)', 'Tu cadena']);
  assert.deepEqual(carbon.diagnosis.tiles, [6, 7], '«amida»');
  // CARBONYL_PREFIX for an acylamino prefix: its occurrence (the nitrogen, the acyl group); the student's chain on that nitrogen.
  const prefix = read('2-(acetilamino)propano');
  const amino = prefix.prefixAtoms[0];
  assert.deepEqual(prefix.diagnosis.focus, { atoms: amino.atoms, bonds: [amino.bond, ...amino.bonds] });
  assert.ok(!prefix.diagnosis.parent.atoms.some((id) => prefix.diagnosis.student.atoms.includes(id)), 'the parent across the nitrogen');
  // AMIDE_IN_CHAIN: the carbamoyl prefix (its carbon, =O and nitrogen); the student's three carbons beside the app's four.
  const chain = read('ácido 3-carbamoilpropanoico');
  const end = chain.prefixAtoms[0];
  assert.deepEqual(chain.diagnosis.focus, { atoms: end.atoms, bonds: [end.bond, ...end.bonds] });
  assert.deepEqual([chain.diagnosis.student.atoms.length, chain.diagnosis.parent.atoms.length], [3, 4]);
  assert.ok(chain.diagnosis.parent.atoms.includes(end.attachment), 'the C=O carbon in the parent');
  // AMIDE_PREFIX_NAME: the inner branch's tiles and atoms; the student's chain is the parent.
  const words = read('ácido 2-(carbamoilmetil)butanodioico');
  assert.deepEqual(words.diagnosis.tiles, [3, 4], '«carbamoil»');
  assert.deepEqual(words.diagnosis.student.atoms, words.diagnosis.parent.atoms);
  // CARBONYL_SENIORITY with the junior amide: the student's amide group (its carbon, =O and nitrogen); the suffix's tiles.
  const senior = read('4-carboxibutanamida');
  const group = senior.suffixAtoms[0];
  assert.deepEqual(senior.diagnosis.focus, { atoms: [group.parentAtom, group.attachment], bonds: [group.bond] });
  assert.deepEqual(senior.diagnosis.tiles, [4, 5], '«amida»');
}); // End of test 'the student's chain beside the parent…'

test('the step «Ver el paso» opens explains the amide rule the message states', () => {
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
  assert.match(opened('1-aminobutanal'), /El C=O y el nitrógeno forman un solo grupo/);
  assert.match(opened('propano-1-carboxamida'), /Ese carbono es un carbono más de la cadena: se cuenta al buscarla/);
  assert.match(opened('1-fenilmetanamida'), /Su carbono no forma parte del anillo .* «benzamida»/);
  assert.match(opened('2-carbamoilbutanonitrilo'), /ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina/);
  assert.match(opened('4-carboxibutanamida'), /su C=O se nombra con «oxo-», y su nitrógeno, junto con los grupos unidos a él, con el/);
  assert.match(opened('2-(acetilamino)propano'), /con la letra «N» en vez de un número/);
  assert.match(opened('(carbamoilmetil)benceno'), /grupos amida/);
  assert.match(opened('ácido 3-carbamoilpropanoico'), /El carbono de la amida que se nombra con «4-amino» y «4-oxo» sí forma parte/);
  assert.match(opened('ácido 2-(carbamoilmetil)butanodioico'), /es el carbono de una amida: su C=O se nombra «oxo» y su nitrógeno/);
  assert.match(opened('ácido 2-(aminooxometil)butanodioico'), /«carbamoil» es el grupo –CO–NH₂ entero, el C=O con su nitrógeno/);
  assert.match(opened('etanoato de 2-carbamoiletilo'), /«3-amino-3-oxopropilo»/);
  assert.match(opened('ciclohexano-1,5-dicarboxamida'), /grupos amida \(el \[\[grupo principal\]\]\) deben tener los/);
}); // End of test 'the step «Ver el paso» opens explains…'

/**
 * The tile ids of an amide name with its `amida` suffix rewritten as `amino`
 * and `oxo` prefixes on the same carbons (`butanamida` → `1-amino-1-oxobutano`,
 * `butanodiamida` → `1,4-diamino-1,4-dioxobutano`; the locants the reading
 * places); null for a name with a group on the nitrogen (`N`), an old-style
 * locant or no `amida` suffix.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asSplitAmide(ids) {
  const { tree } = parse(ids);
  const { suffix } = tree.parent;
  if (!suffix || ids[suffix.range[1] - 1] !== AMIDA_ID || ids.includes(NITROGEN_ID) || tree.parent.legacy.length > 0
    || tree.parent.legacySuffix) {
    return null;
  }
  const locants = readName(ids).suffixAtoms.map((g) => g.locant).sort((p, q) => p - q).map((value) => tileId('num', value));
  const mult = suffix.multiplier === null ? [] : [ids[suffix.multiplier]];
  return [...locants, ...mult, AMINO_ID, ...locants, ...mult, OXO_ID, ...ids.slice(0, suffix.range[0]), ...ids.slice(suffix.range[1])];
} // End of function asSplitAmide()

/**
 * The tile ids of an amide name with its `carboxamida` suffix or its
 * `benzamida` word rewritten as `carbamoil` prefixes on the ring
 * (`ciclohexanocarboxamida` → `carbamoilciclohexano`, `4-metilbenzamida` →
 * `1-carbamoil-4-metilbenceno`); null for a name with a group on the nitrogen,
 * an o/m/p letter (two different prefixes on `benceno` take numbers), or
 * neither.
 *
 * @param {string[]} ids - The name's tile ids.
 * @returns {string[]|null} The rewritten ids.
 */
function asCarbamoyl(ids) {
  const { tree } = parse(ids);
  if (ids.includes(NITROGEN_ID) || tree.items.some((item) => item.letter !== null)) {
    return null;
  }
  const { suffix } = tree.parent;
  if (suffix && ids[suffix.range[1] - 1] === CARBOXAMIDE_ID) {
    const lead = ids.slice(suffix.range[0], suffix.range[1] - 1); // Its locants and multiplier.
    return [...lead, CARBAMOYL_ID, ...ids.slice(0, suffix.range[0]), ...ids.slice(suffix.range[1])];
  }
  const at = ids.indexOf(BENZAMIDE_ID);
  if (at < 0) {
    return null;
  }
  const bare = ids.filter((id) => id !== BENZAMIDE_ID).length === 0;
  return [...(bare ? [] : [tileId('num', 1)]), CARBAMOYL_ID, ...ids.slice(0, at), BENZENE_ID, ...ids.slice(at + 1)];
} // End of function asCarbamoyl()

/**
 * How many amide fixture names (of phase R-6d1, without `N` or an o/m/p letter) the two rewritings above apply to: 22 with an
 * `amida` suffix, 15 with `carboxamida` or `benzamida`.
 */
const SWEEP_COUNTS = Object.freeze({ split: 22, carbamoyl: 15 });

test('two sweeps over the amide fixture names: `amida` as `amino` + `oxo` is AMIDE_GROUP, a ring\'s amide as `carbamoil` CARBONYL_PREFIX', async () => {
  const names = (await readFixtures()).filter((row) => isAmide(row.smiles)).flatMap((row) => row.names).filter(isR6d1AmideName);
  const counts = { split: 0, carbamoyl: 0 };
  for (const name of names) {
    const ids = tokenize(name);
    for (const [kind, mutated, code, phrase] of [['split', asSplitAmide(ids), 'AMIDE_GROUP', SPLIT.trim()],
      ['carbamoyl', asCarbamoyl(ids), 'CARBONYL_PREFIX', 'no con el prefijo «carbamoil»']]) {
      if (!mutated) {
        continue;
      }
      counts[kind] += 1;
      const verdict = readName(mutated);
      const label = `${name} → ${verdict.text}`;
      assert.equal(verdict.kind, 'otherName', `${label}: ${verdict.message}`);
      assert.equal(verdict.name, readName(ids).name, `${label}: the same molecule`);
      assertAmideDiagnosis(verdict, label);
      assert.equal(verdict.diagnosis.code, code, `${label}: ${verdict.diagnosis.message}`);
      // The name quoted is the engine's in the student's prefix style.
      assert.ok(verdict.diagnosis.message.endsWith(`«${diagnosisNaming(verdict).name}».`), `${label}: ${verdict.diagnosis.message}`);
      assert.ok(verdict.diagnosis.message.includes(phrase), `${label}: ${verdict.diagnosis.message}`);
    } // End of the loop over the two rewritings
  } // End of the loop over the names
  assert.deepEqual(counts, { ...SWEEP_COUNTS });
}); // End of test 'two sweeps over the amide fixture names…'

test('MISSING_LOCANTS names the amide groups when the suffix\'s locant is the one missing (diagnose() on its own)', () => {
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
  assert.equal(read('2-clorociclohexanocarboxamida').kind, 'missingLocants');
  const d = direct('2-clorociclohexanocarboxamida');
  assert.deepEqual([d.code, d.tiles], ['MISSING_LOCANTS', [5, 6]], 'the «carboxamida» tile, whose locant is missing');
  assert.equal(d.message, 'Faltan números: hay que decir en qué carbono va cada rama, cada enlace doble o triple y cada grupo amida, '
    + 'como en «2-clorociclohexano-1-carboxamida».');
}); // End of test 'MISSING_LOCANTS names the amide groups…'

test('the «Amides» nulls left: a retained word\'s prefix style (a pinned open question), an outside suffix after a chain beside another chain', () => {
  // A prefix in a style the engine never writes beside a retained amide word (the engine writes `isopropil` there): the
  // cross-family open question (reverse-amide-templates.test.js pins all four).
  const style = read('N-(propan-2-il)acetamida');
  assert.deepEqual([style.kind, style.name, style.diagnosis], ['otherName', 'N-isopropiletanamida', null]);
  // `carboxamida` after a chain whose amide group is not the engine's suffix group, the engine's parent another group's chain
  // across a nitrogen or an oxygen: no rule covers it (AMIDE_CARBON speaks of the engine's own amide groups only), as for the
  // acid, nitrile and aldehyde twins across an ether oxygen — a cross-family gap, not an amide's own null.
  for (const [name, engine] of [['N-(2-amino-2-oxoetil)metano-1-carboxamida', '2-(acetilamino)etanamida'],
    ['(3-amino-3-oxopropoxi)metano-1-carboxamida', '3-(2-amino-2-oxoetoxi)propanamida'],
    ['ácido (2-carboxietoxi)metano-1-carboxílico', 'ácido 3-(carboximetoxi)propanoico'],
    ['(3-cianopropoxi)metano-1-carbonitrilo', '4-(cianometoxi)butanonitrilo']]) {
    const verdict = read(name);
    assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis], ['otherName', engine, null], name);
  }
  // Its `carboxamida` beside the engine's own amide group is AMIDE_CARBON.
  assert.equal(read('N-(2-amino-2-oxoetil)etano-1-carboxamida').diagnosis.code, 'AMIDE_CARBON');
}); // End of test 'the «Amides» nulls left…'

test('controls: correct amide names have no diagnosis; a mistake the earlier rules name stays theirs', () => {
  for (const name of ['butanamida', 'butanodiamida', 'N-metiletanamida', 'ciclohexanocarboxamida', 'benzamida', '4-metilbenzamida',
    'N-isopropiletanamida', '2-cianobutanamida', 'N-(2-hidroxietil)etanamida', 'ácido 4-amino-4-oxobutanoico', 'ácido 4-carbamoilbenzoico',
    'etanoato de 2-amino-2-oxoetilo', '2-(acetilamino)etanamida', '4-(2-amino-2-oxoetil)ciclohexano-1-carboxamida']) {
    const verdict = read(name);
    assert.ok(['correct', 'alternative'].includes(verdict.kind), `${name}: ${verdict.kind}`);
    assert.ok(!('diagnosis' in verdict), name);
  }
  for (const [name, code] of [['3-metilbutanamida', null], ['2-etilpropanamida', 'LONGER_CHAIN'],
    ['N-metil-N-metiletanamida', 'UNGROUPED'], ['N,N-bismetiletanamida', 'MULTIPLIER_KIND'], ['6-metilbenzamida', 'RING_NUMBERING'],
    ['2-butenamida', 'OLD_STYLE'], ['2-cloroacetamida', 'SUBSTITUTED_TEMPLATE'], ['N-etil-1-metilmetanamida', 'BRANCH_AT_END'],
    ['N-(2-amino-2-oxoetil)etanamida', 'MORE_SUBSTITUENTS'], ['N-acetiletanamina', 'CARBONYL_SENIORITY']]) {
    const verdict = read(name);
    if (code === null) {
      assert.equal(verdict.kind, 'correct', name);
      continue;
    }
    assert.equal(verdict.kind, 'otherName', `${name}: ${verdict.message}`);
    assert.equal(verdict.diagnosis.code, code, `${name}: ${verdict.diagnosis.message}`);
  }
  // A student's `amina` whose nitrogen is the amide's keeps the amine's message (phase I-52c4a), checked before the amide's.
  assert.match(read('1-oxobutan-1-amina').diagnosis.message, /el grupo amino no va aparte: su nitrógeno, con el C=O unido a él, forma/);
  // The other families' own checks keep their codes beside an amide group: an acid's –COOH written as two groups.
  assert.equal(read('4-amino-1-hidroxi-1,4-dioxobutano').diagnosis.code, 'ACID_GROUP');
}); // End of test 'controls…'

test('the drafts of the amide rules: their place among the rules, their steps, every variant renders', () => {
  assert.deepEqual(AMIDE_CODES.map((code) => [DIAGNOSES[code].rule, DIAGNOSES[code].step]),
    [[1, 'group'], [1, 'group'], [1, 'groupChain'], [5, 'substituents']]);
  // Each beside its twin: AMIDE_GROUP after ESTER_CLASS_NAME (with ESTER_GROUP), AMIDE_CARBON after NITRILE_CARBON, AMIDE_IN_CHAIN
  // after ESTER_IN_CHAIN, AMIDE_PREFIX_NAME after ESTER_PREFIX_NAME.
  const after = (code) => DIAGNOSIS_CODES[DIAGNOSIS_CODES.indexOf(code) - 1];
  assert.deepEqual(AMIDE_CODES.map(after), ['ESTER_CLASS_NAME', 'NITRILE_CARBON', 'ESTER_IN_CHAIN', 'ESTER_PREFIX_NAME']);
  for (const code of [...AMIDE_CODES, ...SHARED_CODES]) {
    const text = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    assert.match(text, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(text, /undefined|null|NaN/, code);
  }
  assert.deepEqual(AMIDE_CODES.map((code) => DIAGNOSES[code].example.name || DIAGNOSES[code].example.right), ['butanamida',
    'butanamida', 'ácido 4-amino-4-oxobutanoico', 'carbamoil']);
  const { AMIDE_GROUP, AMIDE_CARBON, AMIDE_IN_CHAIN, AMIDE_PREFIX_NAME } = DIAGNOSIS_TEXTS;
  assert.equal(AMIDE_GROUP(DIAGNOSES.AMIDE_GROUP.example), `${SPLIT}El grupo amida es el grupo principal: se nombra `
    + `${WRITTEN('amida')}. Se escribe «butanamida».`);
  assert.equal(AMIDE_CARBON(DIAGNOSES.AMIDE_CARBON.example), `${ON_CHAIN}${WRITTEN('amida')}. Se escribe «butanamida».`);
  assert.equal(AMIDE_IN_CHAIN(DIAGNOSES.AMIDE_IN_CHAIN.example), 'El prefijo «carbamoil» está en el extremo de la cadena, y el carbono '
    + 'de su C=O la alarga: la cadena principal tiene 4 carbonos. Con ese carbono en la cadena, la amida ya no se nombra «carbamoil», '
    + `sino ${CHAIN_AMIDE}. Se escribe «ácido 4-amino-4-oxobutanoico».`);
  assert.equal(AMIDE_PREFIX_NAME(DIAGNOSES.AMIDE_PREFIX_NAME.example), `${CARBAMOYL}; su C=O no se nombra con «oxo». Se escribe `
    + '«carbamoil», no «aminooxometil».');
  // The variants: AMIDE_GROUP beside a ring and with several groups; AMIDE_PREFIX_NAME `inChain` on a branch and on an O-bound group.
  assert.equal(AMIDE_GROUP({ count: 2, ending: 'dicarboxamida', on: 'outside', nitrogen: 0, name: 'X' }), `${SPLIT}Los grupos amida `
    + `son el grupo principal: los unidos al anillo se nombran todos juntos ${WRITTEN('dicarboxamida')}. Se escribe «X».`);
  assert.equal(AMIDE_CARBON({ ring: true, ending: 'carboxamida', benzamide: true, name: 'X' }), `${ON_RING}${BENZAMIDE}. Se escribe «X».`);
  for (const [oBound, chain] of [[false, 'de la rama'], [true, 'del grupo unido al oxígeno']]) {
    assert.equal(AMIDE_PREFIX_NAME({ kind: 'inChain', oBound, written: 'W', right: 'X', student: 'Y' }), `${COUNTS}${chain}${PASSES}«W», `
      + `sino que se nombra ${CHAIN_AMIDE}. Se escribe «X», no «Y».`);
  }
  const { groupWords, carbonylN0, what, principal, junior, amideSeniority, ending, chainAmide, amideWritten } = DIAGNOSIS_PHRASES;
  // The amide group's words, as the explanation says them (SUFFIX_GROUP_WORDS: «grupo amida»).
  assert.deepEqual(groupWords.amide, { one: 'grupo amida', many: 'grupos amida' });
  assert.equal(carbonylN0.numberingReasons.amide, N0);
  assert.equal(carbonylN0.lowerLocantsOf.amide, 'los grupos amida');
  assert.deepEqual([what.amide, what.amides], ['el grupo amida', 'los grupos amida']);
  assert.equal(principal.amide, 'la amida (un C=O unido a un nitrógeno)');
  assert.deepEqual([...junior.amide], ['el grupo amida', 'cada grupo amida']);
  assert.equal(chainAmide, CHAIN_AMIDE);
  assert.equal(amideWritten({ count: 1, ending: 'amida' }), `El grupo amida es el grupo principal: se nombra ${WRITTEN('amida')}.`);
  // The seniority beside an amide, principal or junior, is naming/seniority.js's whole order, in its Spanish words.
  const spanish = { acid: 'ácido', ester: 'éster', amide: 'amida', nitrile: 'nitrilo', aldehyde: 'aldehído', ketone: 'cetona',
    alcohol: 'alcohol', amine: 'amina' };
  assert.equal(amideSeniority, SENIORITY.map((kind) => spanish[kind]).join(' > '));
  for (const d of [{ group: 'amide', junior: 'nitrile' }, { group: 'amide', junior: 'alcohol' }, { group: 'acid', junior: 'amide' },
    { group: 'ester', junior: 'amide' }]) {
    assert.equal(DIAGNOSIS_PHRASES.seniorityOf(d), amideSeniority, JSON.stringify(d));
  }
  assert.equal(DIAGNOSIS_PHRASES.seniorityOf({ group: 'acid', junior: 'nitrile' }), 'ácido > nitrilo > aldehído > cetona > alcohol',
    'the nitrile beside an acid unchanged');
  // Where a junior amide goes: on the parent's chain or the O-bound group's chain, `oxo` and `amino`; else the engine's prefix.
  assert.equal(DIAGNOSIS_PHRASES.juniorPlace({ junior: 'amide', inChain: true, prefix: null, count: 1 }), `va delante, ${CHAIN_AMIDE}`);
  assert.equal(DIAGNOSIS_PHRASES.juniorPlace({ junior: 'amide', inChain: true, side: 'oBound', prefix: null, count: 1 }), 'va en el '
    + `nombre del grupo unido al otro oxígeno, ${CHAIN_AMIDE}`);
  assert.equal(DIAGNOSIS_PHRASES.juniorPlace({ junior: 'ester', inChain: true, prefix: null, count: 1 }), 'va delante, con dos prefijos '
    + 'con el mismo número: «oxo» para su C=O y uno acabado en «-oxi» para su oxígeno del medio con el grupo unido a él', 'unchanged');
  assert.equal(ending({ ending: 'carboxamida', benzamide: true }), BENZAMIDE);
  // The holder of an acylamino prefix's student chain: a chain or a ring; the amine's phrase unchanged.
  assert.equal(DIAGNOSIS_PHRASES.amineHolder({ side: 'fenil', studentRing: true }), 'Tu anillo es el sustituyente «fenil», que va '
    + 'unido al nitrógeno y se escribe con la letra «N» delante');
  assert.equal(DIAGNOSIS_PHRASES.amineHolder({ side: null }), 'Tu cadena va unida al nitrógeno, y se escribe con la letra «N» delante');
  assert.equal(DIAGNOSIS_PHRASES.amineHolder({ side: null, studentRing: true }), 'Tu anillo va unido al nitrógeno, y se escribe con la '
    + 'letra «N» delante');
  // The shared codes speak of the amide groups by their group: parent choice, P0, N0, suffix locants.
  assert.match(DIAGNOSIS_TEXTS.CARBONYL_PARENT({ group: 'amide', ring: 1, chain: 1, chainParent: false, name: 'X' }),
    /^La cadena principal es la que lleva más grupos amida/);
  assert.match(DIAGNOSIS_TEXTS.MORE_CARBONYL_GROUPS({ group: 'amide', app: 2, student: 1 }), /^Hay otra cadena con más grupos amida/);
  assert.equal(DIAGNOSIS_TEXTS.CHAIN_LOCANTS({ rule: 'N0', group: 'amide', app: '1', student: '2' }), 'Hay otra cadena igual de larga '
    + 'que, bien numerada, da números más bajos a los grupos amida (1 en vez de 2): esa es la cadena principal.');
  assert.equal(DIAGNOSIS_TEXTS.NEEDLESS_LOCANTS({ name: 'X', what: what.amides, kept: false }), 'En «X» no se escriben números: solo '
    + 'hay una manera de colocar los grupos amida.');
  assert.equal(DIAGNOSIS_PHRASES.etherSide({ reason: 'CARBONYL_PARENT', group: 'amide', ring: 1, chain: 1, chainParent: false }),
    'primero cuenta el grupo principal, y los dos lados llevan un grupo amida cada uno; en el empate, manda el anillo');
}); // End of test 'the drafts of the amide rules…'
