/**
 * @file Unit tests for the ether diagnoses of «¿Cómo se dibuja?»
 * (src/reverse/diagnose.js header «Ethers»; design.md §15.3 `otherName`,
 * §15.8 R-5b; phase I-51b2, R-5b2): ETHER_SIDE — the student's chain on the
 * other side of an ether oxygen from the engine's parent, told from the
 * oxygen for every parent-choice rule (the ring, the OH groups, the length,
 * the multiple bonds, the substituents, the locants) —, ALKOXY_MULTIPLIER —
 * `di` before an alkoxy prefix the engine multiplies with `bis` for its form
 * (`di(pentiloxi)`, `di(propan-2-iloxi)`, `di-tert-butoxi`) —, and the
 * functional-class names: CLASS_NAME_NONE, CLASS_GROUP_WORDS, CLASS_ORDER,
 * CLASS_DI. One case per message (code, rule, trace rule, the step «Ver el
 * paso» opens, the message, the tiles), the focus and the canvas legend,
 * negatives (the same mistakes on one side of the oxygen keep their own
 * messages; correct names have no diagnosis), the deliberate null
 * (`di-tert-butil éter`), a class name whose oxygen is an ester's (phase
 * I-52a3b: ESTER_CLASS_NAME), the drafts' examples, and a property sweep:
 * ETHER_SIDE exactly when the student's chain and the parent lie on two
 * sides of an ether oxygen. Review of phase I-51b2: every class-name
 * diagnosis opens the class-name step (CLASS_NAME_STEP), whose text agrees
 * with its message (the form of the class name, the substitutive name it
 * differs from, the groups and name recommended, or why this ether has no
 * class name) and whose marks are the two groups and the oxygen; and
 * ETHER_SIDE says the student's chain «forma parte» of the engine's
 * substituent when it lies deeper inside it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readName } from '../../src/reverse/index.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import {
  diagnosisExplanation, diagnosisStepIndex, DIAGNOSES, DIAGNOSIS_CODES, DIAGNOSIS_TEXTS, DIAGNOSIS_PHRASES, STEP_FALLBACKS,
  CLASS_NAME_STEP, CLASS_NAME_STEP_TEXTS,
} from '../../src/reverse/diagnose.js';
import { explain, plainText, parseMarkup, GLOSSARY } from '../../src/explain/explain.js';
import { diagnosisLegend, LEGEND_TEXTS } from '../../src/ui/draw-name.js';
import { adjacency } from '../../src/model/graph.js';
import { seq } from './reverse-words.js';

/** The ether codes of phase I-51b2, in DIAGNOSES order. */
const ETHER_CODES = Object.freeze(['ETHER_SIDE', 'CLASS_NAME_NONE', 'CLASS_GROUP_WORDS', 'CLASS_ORDER', 'CLASS_DI', 'ALKOXY_MULTIPLIER']);

/** The start of every ETHER_SIDE message (draft pending teacher review). */
const SIDE_LEAD = 'El oxígeno del éter (–O–) corta la molécula en dos lados, y la cadena principal no puede pasar por él: se busca '
  + 'en uno de los dos lados, con las reglas de siempre. Aquí la cadena principal está en el otro lado del oxígeno, no en el de ';

/** The CLASS_NAME_NONE message's first sentences (draft pending teacher review). */
const NONE_LEAD = 'El nombre con «éter» (nombre de clase funcional) solo lo doy cuando el oxígeno une dos grupos sencillos: '
  + 'cadenas sin ramas unidas por su extremo (metil, etil, propil…), isopropil o tert-butil, sin enlaces dobles ni triples, sin '
  + 'anillos y sin más átomos que esos carbonos y el oxígeno. Esta molécula se nombra con un prefijo acabado en «-oxi»: ';

/**
 * The tile ids of a name: space-separated tile words when every word is a
 * tile, else the name read by the tokenizer.
 *
 * @param {string} name - Tile words or a name.
 * @returns {string[]} The tile ids.
 */
function idsOf(name) {
  try {
    return seq(name);
  } catch (err) {
    const ids = tokenize(name);
    assert.ok(ids, `no tiles for ${name}`);
    return ids;
  }
} // End of function idsOf()

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
 * The ether oxygen between two atom sets, found independently of
 * diagnose.js: when they share no atom, the oxygens with two bonds on the
 * shortest path between them (breadth-first from the first set).
 *
 * @param {object} mol - The molecule.
 * @param {number[]} from - The student's chain.
 * @param {number[]} to - The parent.
 * @returns {number[]} The ether oxygens on the path (none when the sets share an atom).
 */
function oxygensBetween(mol, from, to) {
  if (from.some((id) => to.includes(id))) {
    return [];
  }
  const adj = adjacency(mol);
  const previous = new Map(from.map((id) => [id, null]));
  const queue = [...from];
  let reached = null;
  while (queue.length > 0 && reached === null) {
    const id = queue.shift();
    for (const n of adj.get(id)) {
      if (previous.has(n.atom)) {
        continue;
      }
      previous.set(n.atom, id);
      if (to.includes(n.atom)) {
        reached = n.atom;
        break;
      }
      queue.push(n.atom);
    }
  } // End of the search
  const out = [];
  for (let id = reached === null ? null : previous.get(reached); id !== null; id = previous.get(id)) {
    if (mol.atoms.get(id).element === 'O' && adj.get(id).length === 2) {
      out.push(id);
    }
  }
  return out;
} // End of function oxygensBetween()

/**
 * One case per ether message: [name, code, rule, trace rule, message (the
 * part after SIDE_LEAD for ETHER_SIDE, after NONE_LEAD for CLASS_NAME_NONE),
 * tiles]. ETHER_SIDE opens «Reconoce el éter», ALKOXY_MULTIPLIER «Nombra los
 * sustituyentes» and the class names the step diagnosisExplanation() adds
 * after «Reconoce el éter», CLASS_NAME_STEP (review of phase I-51b2).
 */
const CASES = [
  // ETHER_SIDE, by the rule that chose the other side.
  ['etoximetano', 'ETHER_SIDE', 2, 'P1', 'tu cadena: en ese lado hay una cadena de 2 carbonos, más larga que la tuya, de 1. Tu '
    + 'cadena, con el oxígeno, es el sustituyente «metoxi»: «metoxietano».', [0, 3]],
  ['(2-metoxietoxi)metano', 'ETHER_SIDE', 2, 'P1', 'tu cadena: en ese lado hay una cadena de 2 carbonos, más larga que la '
    + 'tuya, de 1. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: «1,2-dimetoxietano».', [0, 9]],
  ['fenoxietano', 'ETHER_SIDE', 1, 'RING', 'tu cadena: en ese lado está el benceno, y un anillo manda siempre sobre una cadena '
    + 'abierta. Tu cadena, con el oxígeno, es el sustituyente «etoxi»: «etoxibenceno».', [0, 2]],
  ['(ciclohexiloxi)etano', 'ETHER_SIDE', 1, 'RING', 'tu cadena: en ese lado hay un anillo, y un anillo manda siempre sobre una '
    + 'cadena abierta. Tu cadena, con el oxígeno, es el sustituyente «etoxi»: «etoxiciclohexano».', [0, 4]],
  ['(2-hidroxietoxi)metano', 'ETHER_SIDE', 2, 'P0', 'tu cadena: primero cuenta el grupo principal, y en ese lado hay un grupo '
    + '–OH y en tu cadena, ninguno. Tu cadena, con el oxígeno, es el sustituyente «metoxi»: «2-metoxietan-1-ol».', [0, 7]],
  ['(2-hidroxietoxi)ciclohexano', 'ETHER_SIDE', 1, 'RINGCHAIN', 'tu anillo: primero cuenta el grupo principal, y en ese lado hay '
    + 'un grupo –OH y en el tuyo, ninguno. Tu anillo, con el oxígeno, es el sustituyente «ciclohexiloxi»: '
    + '«2-(ciclohexiloxi)etan-1-ol».', [0, 7]],
  ['(eteniloxi)etano', 'ETHER_SIDE', 3, 'P2', 'tu cadena: las cadenas de los dos lados empatan en longitud, y la de ese lado tiene '
    + 'más enlaces dobles o triples (1; la tuya, 0). Tu cadena, con el oxígeno, es el sustituyente «etoxi»: «etoxieteno».', [0, 4]],
  ['(eteniloxi)etino', 'ETHER_SIDE', 3, 'P3', 'tu cadena: las cadenas de los dos lados empatan en longitud y en enlaces múltiples, '
    + 'y la de ese lado tiene más enlaces dobles (1; la tuya, 0). Tu cadena, con el oxígeno, es el sustituyente «etiniloxi»: '
    + '«(etiniloxi)eteno».', [0, 4]],
  ['(clorometoxi)metano', 'ETHER_SIDE', 3, 'P4', 'tu cadena: las cadenas de los dos lados empatan en longitud y en enlaces dobles '
    + 'o triples, y la de ese lado tiene más sustituyentes (2; la tuya, 1). Tu cadena, con el oxígeno, es el sustituyente '
    + '«metoxi»: «cloro(metoxi)metano».', [0, 6]],
  ['2-propoxipropano', 'ETHER_SIDE', 3, 'N3', 'tu cadena: las cadenas de los dos lados empatan en longitud, en enlaces múltiples '
    + 'y en sustituyentes, y la de ese lado, bien numerada, da números más bajos a los sustituyentes (1 en vez de 2). Tu cadena, '
    + 'con el oxígeno, es el sustituyente «isopropoxi»: «1-isopropoxipropano».', [0, 4]],
  // ETHER_SIDE, review of phase I-51b2: the student's chain deeper inside the engine's substituent «forma parte» of it (the
  // methyl of «2-metoxietoxi»; inside «metoximetil», whose oxygen does not touch the parent; a ring inside a compound
  // substituent); the student's chain with a branch of its own, bonded to the oxygen next to the parent, is the substituent.
  ['(2-propoxietoxi)metano', 'ETHER_SIDE', 2, 'P1', 'tu cadena: en ese lado hay una cadena de 3 carbonos, más larga que la tuya, '
    + 'de 1. Tu cadena forma parte del sustituyente «2-metoxietoxi»: «1-(2-metoxietoxi)propano».', [0, 9]],
  ['(2-etilpentiloxi)metano', 'ETHER_SIDE', 2, 'P1', 'tu cadena: en ese lado hay una cadena de 6 carbonos, más larga que la tuya, '
    + 'de 1. Tu cadena forma parte del sustituyente «metoximetil»: «3-(metoximetil)hexano».', [0, 8]],
  ['[2-(2-hidroxietoxi)etoxi]ciclohexano', 'ETHER_SIDE', 1, 'RINGCHAIN', 'tu anillo: primero cuenta el grupo principal, y en ese '
    + 'lado hay un grupo –OH y en el tuyo, ninguno. Tu anillo forma parte del sustituyente «2-(ciclohexiloxi)etoxi»: '
    + '«2-[2-(ciclohexiloxi)etoxi]etan-1-ol».', [0, 13]],
  ['1-metoxi-2-propoxietano', 'ETHER_SIDE', 2, 'P1', 'tu cadena: en ese lado hay una cadena de 3 carbonos, más larga que la '
    + 'tuya, de 2. Tu cadena, con el oxígeno, es el sustituyente «2-metoxietoxi»: «1-(2-metoxietoxi)propano».', [4, 8]],
  // ALKOXY_MULTIPLIER: a prefix not shortened, in the default and the pin style; `tert-butoxi` as the engine writes it.
  ['1,6-di(pentiloxi)hexano', 'ALKOXY_MULTIPLIER', 7, null, 'Un prefijo «-oxi» que no se acorta, como «pentiloxi», es un prefijo '
    + 'compuesto (un grupo más «oxi») y va entre paréntesis; delante de un prefijo compuesto se usa «bis», «tris»…: '
    + '«1,6-bis(pentiloxi)», no «1,6-di(pentiloxi)».', [2, 3]],
  ['1,6-di(propan-2-iloxi)hexano', 'ALKOXY_MULTIPLIER', 7, null, 'Un prefijo «-oxi» que no se acorta, como «propan-2-iloxi», es un '
    + 'prefijo compuesto (un grupo más «oxi») y va entre paréntesis; delante de un prefijo compuesto se usa «bis», «tris»…: '
    + '«1,6-bis(propan-2-iloxi)», no «1,6-di(propan-2-iloxi)».', [2, 3]],
  ['1,6-di-tert-butoxihexano', 'ALKOXY_MULTIPLIER', 7, null, '«tert-butoxi» se cuenta como un prefijo compuesto, porque su forma '
    + 'sistemática, «1,1-dimetiletoxi», lleva sus propias ramas; delante va «bis», «tris»…: «1,6-bis-tert-butoxi», no '
    + '«1,6-di-tert-butoxi».', [2, 3]],
  // The functional-class names.
  ['etenil metil éter', 'CLASS_NAME_NONE', 2, null, '«metoxieteno».', [5, 6]],
  ['fenil metil éter', 'CLASS_NAME_NONE', 2, null, '«metoxibenceno».', [3, 4]],
  ['(2-cloroetil) metil éter', 'CLASS_NAME_NONE', 2, null, '«1-cloro-2-metoxietano».', [8, 9]],
  ['metil (propan-2-il) éter', 'CLASS_GROUP_WORDS', 2, null, 'En el nombre con «éter», cada grupo se nombra con su forma más '
    + 'sencilla, sin números: metil, etil, propil…, isopropil o tert-butil. Se escribe «isopropil metil éter».', [0, 6]],
  ['(1,1-dimetiletil) metil éter', 'CLASS_GROUP_WORDS', 2, null, 'En el nombre con «éter», cada grupo se nombra con su forma más '
    + 'sencilla, sin números: metil, etil, propil…, isopropil o tert-butil. Se escribe «tert-butil metil éter».', [0, 11]],
  ['metil etil éter', 'CLASS_ORDER', 5, null, 'En el nombre con «éter», los dos grupos se escriben por orden alfabético: «etil» va '
    + 'antes que «metil» (e antes que m). Se escribe «etil metil éter».', [0, 4]],
  ['metil tert-butil éter', 'CLASS_ORDER', 5, null, 'En el nombre con «éter», los dos grupos se escriben por orden alfabético: '
    + '«tert-butil» va antes que «metil» (b antes que m). «tert-» no cuenta para el orden. Se escribe «tert-butil metil éter».', [0, 3]],
  ['tert-butil butil éter', 'CLASS_ORDER', 5, null, 'En el nombre con «éter», los dos grupos se escriben por orden alfabético: '
    + '«butil» va antes que «tert-butil» (con las mismas letras, va primero el grupo sin «tert-»). Se escribe «butil tert-butil '
    + 'éter».', [0, 3]],
  ['etil etil éter', 'CLASS_DI', 6, null, 'Si los dos grupos unidos al oxígeno son iguales, su nombre se escribe una sola vez, con '
    + '«di» delante: «dietil éter», no «etil etil éter».', [0, 4]],
  ['bisisopropil éter', 'CLASS_DI', 6, null, 'Si los dos grupos unidos al oxígeno son iguales, su nombre se escribe una sola vez, '
    + 'con «di» delante: «diisopropil éter», no «bisisopropil éter».', [0, 2]],
];

test('one case per ether message: the code, its rule and trace rule, the step «Ver el paso» opens, the message, the tiles', () => {
  const seen = new Set();
  for (const [name, code, rule, traceRule, message, tiles] of CASES) {
    const verdict = read(name);
    assert.equal(verdict.kind, 'otherName', `${name}: ${verdict.message}`);
    const d = verdict.diagnosis;
    assert.ok(d, `${name}: no diagnosis`);
    assert.deepEqual([d.code, d.rule, d.traceRule], [code, rule, traceRule], `${name}: ${d.message}`);
    const lead = { ETHER_SIDE: SIDE_LEAD, CLASS_NAME_NONE: NONE_LEAD }[code] || '';
    assert.equal(d.message, `${lead}${message}`, name);
    assert.deepEqual(d.tiles, tiles, `${name}: tiles`);
    const opened = diagnosisExplanation(verdict, explain);
    const step = { ETHER_SIDE: 'ether', ALKOXY_MULTIPLIER: 'substituents' }[code] || CLASS_NAME_STEP;
    assert.equal(opened.steps[opened.index].id, step, name);
    seen.add(code);
  } // End of the loop over the cases
  assert.deepEqual([...seen].sort(), [...ETHER_CODES].sort(), 'every ether code has a case');
}); // End of test 'one case per ether message…'

/**
 * The class-name diagnoses and what the step «Ver el paso» opens must say
 * (review of phase I-51b2): [name, code, the substitutive name the other
 * steps explain, the two groups as the step names them and the class name
 * the message recommends (null for CLASS_NAME_NONE)].
 */
const CLASS_STEP_CASES = [
  ['metil etil éter', 'CLASS_ORDER', 'metoxietano', ['etil', 'metil'], 'etil metil éter'],
  ['metil tert-butil éter', 'CLASS_ORDER', '2-metil-2-metoxipropano', ['tert-butil', 'metil'], 'tert-butil metil éter'],
  ['tert-butil butil éter', 'CLASS_ORDER', '1-tert-butoxibutano', ['butil', 'tert-butil'], 'butil tert-butil éter'],
  ['etil etil éter', 'CLASS_DI', 'etoxietano', ['etil', 'etil'], 'dietil éter'],
  ['bisisopropil éter', 'CLASS_DI', '2-isopropoxipropano', ['isopropil', 'isopropil'], 'diisopropil éter'],
  // The assembler's `di-tert-butil éter`, as the message quotes it (the engine's own form is the open question `ditert-butil`).
  ['tert-butil tert-butil éter', 'CLASS_DI', '2-tert-butoxi-2-metilpropano', ['tert-butil', 'tert-butil'], 'di-tert-butil éter'],
  ['metil (propan-2-il) éter', 'CLASS_GROUP_WORDS', '2-metoxipropano', ['isopropil', 'metil'], 'isopropil metil éter'],
  ['(1,1-dimetiletil) metil éter', 'CLASS_GROUP_WORDS', '2-metil-2-metoxipropano', ['tert-butil', 'metil'], 'tert-butil metil éter'],
  ['etenil metil éter', 'CLASS_NAME_NONE', 'metoxieteno', null, null],
  ['fenil metil éter', 'CLASS_NAME_NONE', 'metoxibenceno', null, null],
  ['(2-cloroetil) metil éter', 'CLASS_NAME_NONE', '1-cloro-2-metoxietano', null, null],
  ['(2-metoxietil) metil éter', 'CLASS_NAME_NONE', '1,2-dimetoxietano', null, null],
];

test('review I-51b2: every class-name diagnosis opens a step on the class name that agrees with its message', () => {
  /**
   * A sorted copy of some ids.
   *
   * @param {Iterable<number>} list - The ids.
   * @returns {number[]} The ids in ascending order.
   */
  const sorted = (list) => [...list].sort((p, q) => p - q);
  for (const [name, code, substitutive, groups, className] of CLASS_STEP_CASES) {
    const verdict = read(name);
    const d = verdict.diagnosis;
    assert.deepEqual([verdict.kind, verdict.name, d.code], ['otherName', substitutive, code], name);
    const opened = diagnosisExplanation(verdict, explain);
    const step = opened.steps[opened.index];
    // The class-name step, right after «Reconoce el éter»; explain()'s own steps all stay, in their order.
    assert.deepEqual([step.id, step.title, opened.steps[opened.index - 1].id], [CLASS_NAME_STEP, 'Monta el nombre con «éter»',
      'ether'], name);
    assert.equal(step.title, CLASS_NAME_STEP_TEXTS.title);
    assert.deepEqual(opened.steps.filter((s) => s.id !== CLASS_NAME_STEP), explain(verdict.naming), name);
    const text = step.text.map(plainText);
    const all = text.join(' ');
    // The class name's form: the groups as branches, no numbers, alphabetical order without `tert-`, `di`, `éter` last.
    for (const pattern of [/se nombran como ramas/, /sin números/, /por orden alfabético/, /«tert-» no cuenta/, /con «di» delante/,
      /palabra «éter» al final|Al final va la palabra «éter»/]) {
      assert.match(all, pattern, name);
    }
    // It tells it from the substitutive name of the other steps, and «nunca va al final» is said of that name only.
    assert.ok(all.includes(`«${substitutive}»`) && all.includes('nombre sustitutivo'), `${name}: ${all}`);
    const never = all.split(/(?<=\.) /).filter((sentence) => sentence.includes('nunca va al final'));
    assert.equal(never.length, 1, name);
    assert.match(never[0], /nombre sustitutivo/, name);
    if (className) {
      // The groups and the name the step builds are the ones the message recommends.
      assert.deepEqual(d.className, { name: className, groups }, name);
      assert.ok(d.message.includes(`«${className}»`), `${name}: ${d.message}`);
      assert.ok(text[text.length - 1].endsWith(`Para esta molécula: «${className}».`), `${name}: ${text[text.length - 1]}`);
      const here = groups[0] === groups[1] ? `aquí, los dos son «${groups[0]}».` : `aquí, «${groups[0]}» y «${groups[1]}».`;
      assert.ok(text.some((t) => t.endsWith(here)), `${name}: ${here}`);
      assert.match(text[0], /^El nombre que explican los otros pasos, «.+», es el que doy primero, el nombre sustitutivo: /, name);
      assert.match(text[0], /otro nombre válido, que la IUPAC \(2013\) acepta: el nombre de clase funcional/, name);
    } else {
      // No class name for this ether: the same condition as the message, and the `-oxi` name the other steps explain.
      assert.equal(d.className, null, name);
      const only = `Ese nombre solo lo doy cuando el oxígeno une dos grupos sencillos: ${DIAGNOSIS_PHRASES.simpleGroups}.`;
      assert.ok(text.includes(only) && d.message.includes(DIAGNOSIS_PHRASES.simpleGroups), name);
      assert.equal(text[text.length - 1], 'Esta molécula no es uno de esos éteres sencillos, así que no tiene nombre con «éter»: se '
        + `nombra como en los otros pasos, con el oxígeno en un prefijo acabado en «-oxi»: «${substitutive}».`, name);
    }
    for (const paragraph of step.text) {
      parseMarkup(paragraph).filter((segment) => segment.term).forEach((segment) => assert.ok(GLOSSARY[segment.term], segment.term));
    }
    // Marks: the two groups bonded to the class name's oxygen as substituents, the oxygen and its two bonds; the whole molecule.
    const oxygen = verdict.studentParent.atoms[0];
    assert.equal(verdict.molecule.atoms.get(oxygen).element, 'O', name);
    assert.deepEqual(step.highlight.map((h) => h.style), ['substituent', 'substituent', 'candidate'], name);
    const [a, b, o] = step.highlight;
    assert.deepEqual(o, { atoms: [oxygen], bonds: o.bonds, style: 'candidate' }, name);
    assert.deepEqual(sorted(o.bonds), sorted(adjacency(verdict.molecule).get(oxygen).map((n) => n.bond)), name);
    assert.deepEqual(sorted([...a.atoms, ...b.atoms, oxygen]), sorted(verdict.molecule.atoms.keys()), name);
    assert.deepEqual(sorted([...a.bonds, ...b.bonds, ...o.bonds]), sorted(verdict.molecule.bonds.keys()), name);
    assert.equal(step.locants, null, name);
  } // End of the loop over the class-name cases
  // explain() alone has no class-name step: its fallback is «Reconoce el éter»; other diagnoses keep explain()'s steps.
  const ordered = read('metil etil éter');
  const own = explain(ordered.naming);
  assert.equal(own[diagnosisStepIndex(own, ordered.diagnosis)].id, 'ether');
  const side = read('etoximetano');
  assert.deepEqual(diagnosisExplanation(side, explain).steps, explain(side.naming));
}); // End of test 'review I-51b2: every class-name diagnosis opens a step on the class name…'

test('review I-51b2: ETHER_SIDE tells a chain that is the whole substituent from one inside it, as «Reconoce el éter» does', () => {
  for (const [name, mine, nested, side, said] of [
    ['etoximetano', 'Tu cadena', false, 'metoxi', 'Gana la más larga, y el otro lado es el sustituyente «metoxi».'],
    ['1-metoxi-2-propoxietano', 'Tu cadena', false, '2-metoxietoxi', 'Gana la más larga, y el otro lado es el sustituyente '
      + '«2-metoxietoxi».'],
    ['(2-hidroxietoxi)ciclohexano', 'Tu anillo', false, 'ciclohexiloxi', 'el anillo, con el oxígeno, es el sustituyente '
      + '«ciclohexiloxi».'],
    ['(2-propoxietoxi)metano', 'Tu cadena', true, '2-metoxietoxi', 'Otro oxígeno entre dos carbonos está dentro de un sustituyente'],
    ['(2-etilpentiloxi)metano', 'Tu cadena', true, 'metoximetil', 'El éter está dentro de una rama: su oxígeno no toca la cadena '
      + 'principal.'],
    ['[2-(2-hidroxietoxi)etoxi]ciclohexano', 'Tu anillo', true, '2-(ciclohexiloxi)etoxi', 'Otro oxígeno entre dos carbonos está '
      + 'dentro de un sustituyente'],
  ]) {
    const verdict = read(name);
    const d = verdict.diagnosis;
    assert.equal(d.code, 'ETHER_SIDE', name);
    const holder = nested ? `${mine} forma parte del sustituyente «${side}»` : `${mine}, con el oxígeno, es el sustituyente «${side}»`;
    assert.ok(d.message.endsWith(`${holder}: «${verdict.name}».`), `${name}: ${d.message}`);
    // The student's chain lies inside that substituent; a whole one is bonded to the oxygen next to the parent.
    const oxygens = oxygensBetween(verdict.molecule, d.student.atoms, d.parent.atoms);
    const adj = adjacency(verdict.molecule);
    /**
     * Tells whether the oxygen next to the parent is bonded to an atom of a set.
     *
     * @param {number[]} atoms - The atoms.
     * @returns {boolean} True when one of them is bonded to it.
     */
    const touches = (atoms) => adj.get(oxygens[0]).some((n) => atoms.includes(n.atom));
    assert.equal(!(touches(d.student.atoms) && touches(d.parent.atoms)), nested, name);
    // «Ver el paso» opens «Reconoce el éter», which names the same substituent and, for a nested chain, the oxygen inside it.
    const opened = diagnosisExplanation(verdict, explain);
    const text = opened.steps[opened.index].text.map(plainText).join(' ');
    assert.equal(opened.steps[opened.index].id, 'ether', name);
    assert.ok(text.includes(said), `${name}: ${text}`);
    assert.ok(text.includes(`«${side}»`) || text.includes(`«(${side})»`), name);
  } // End of the loop over the cases
}); // End of test 'review I-51b2: ETHER_SIDE tells a chain…'

test('ETHER_SIDE: the oxygen in the focus, the student\'s chain striped beside the parent, the legend', () => {
  const verdict = read('etoximetano');
  const d = verdict.diagnosis;
  const oxygen = [...verdict.molecule.atoms.values()].find((atom) => atom.element === 'O').id;
  assert.ok(d.focus.atoms.includes(oxygen), 'the oxygen');
  const adj = adjacency(verdict.molecule);
  assert.ok(adj.get(oxygen).every((n) => d.focus.bonds.includes(n.bond)), 'both C–O bonds');
  assert.deepEqual(d.student, verdict.studentParent);
  assert.deepEqual(d.parent, verdict.naming.parent);
  assert.equal(d.student.atoms.filter((id) => d.parent.atoms.includes(id)).length, 0, 'two sides of the oxygen');
  assert.deepEqual(diagnosisLegend(d), [{ style: 'parent', text: LEGEND_TEXTS.parent }, { style: 'student', text: LEGEND_TEXTS.student }]);
  // The benzene ring on the other side is named as a ring; a student's ring as the student's ring.
  assert.deepEqual(diagnosisLegend(read('fenoxietano').diagnosis).map((e) => e.text), [LEGEND_TEXTS.parentRing, LEGEND_TEXTS.student]);
  assert.deepEqual(diagnosisLegend(read('(2-hidroxietoxi)ciclohexano').diagnosis).map((e) => e.text),
    [LEGEND_TEXTS.parent, LEGEND_TEXTS.studentRing]);
}); // End of test 'ETHER_SIDE: the oxygen in the focus…'

test('negatives: the same mistakes on one side of the oxygen keep their messages; correct names have no diagnosis', () => {
  for (const [name, code] of [
    ['1-metoxi-2-etilbutano', 'LONGER_CHAIN'], // The longer chain is on the student's side of the oxygen.
    ['1-metil-1-propoxietano', 'BRANCH_AT_END'], // Rule 1 first, on the wrong side too: the student's chain is no leaf-to-leaf path.
    ['2-metoxietano', 'NUMBERING'],
    ['1,2-bismetoxietano', 'MULTIPLIER_KIND'], // bis before a shortened alkoxy prefix.
    ['1,6-di(2-metilpropoxi)hexano', 'MULTIPLIER_KIND'], // A branch with prefixes of its own: rule 7's own reason holds.
  ]) {
    const verdict = read(name);
    assert.equal(verdict.kind, 'otherName', name);
    assert.ok(verdict.diagnosis, `${name}: no diagnosis`);
    assert.equal(verdict.diagnosis.code, code, `${name}: ${verdict.diagnosis.message}`);
  } // End of the loop over the negatives
  for (const name of ['metoxietano', '1,6-bis(pentiloxi)hexano', '1,6-bis(propan-2-iloxi)hexano', '1,6-bis-tert-butoxihexano',
    '1,6-dimetoxihexano', 'etil metil éter', 'dietil éter', 'tert-butil metil éter', 'butil tert-butil éter']) {
    const verdict = read(name);
    assert.ok(['correct', 'alternative'].includes(verdict.kind), `${name}: ${verdict.kind}`);
    assert.equal('diagnosis' in verdict, false, name);
  }
}); // End of test 'negatives…'

test('the deliberate null: `di-tert-butil éter`, which the engine writes `ditert-butil éter`', () => {
  const verdict = read('di-tert-butil éter');
  assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis], ['otherName', '2-tert-butoxi-2-metilpropano', null]);
  assert.ok(verdict.alternatives.some((alt) => alt.name === 'ditert-butil éter'), 'the engine\'s own form');
  // Written twice, the right form quoted is the assembler's, with rule 5's hyphen — never the engine's.
  assert.match(read('tert-butil tert-butil éter').diagnosis.message, /«di-tert-butil éter», no «tert-butil tert-butil éter»\.$/);
}); // End of test 'the deliberate null…'

test('a class name whose oxygen is an ester\'s (review of phase I-51c1; ESTER_CLASS_NAME since phase I-52a3b)', () => {
  /**
   * The ESTER_CLASS_NAME message for a name the engine writes (draft pending teacher review).
   *
   * @param {string} engine - The engine's name.
   * @returns {string} The message.
   */
  const message = (engine) => 'El oxígeno de tu nombre está unido a un carbono con un C=O: juntos forman un solo grupo, el –COO– de '
    + 'los ésteres, así que la molécula es un éster, no un éter, y no se nombra con «éter». El grupo –COO– es el grupo principal: '
    + 'se nombra con la terminación «-oato» y, después de «de», el grupo unido al otro oxígeno, acabado en «-ilo». Se escribe '
    + `«${engine}».`;
  for (const [name, engine, tiles] of [
    ['(1-oxoetil) metil éter', 'etanoato de metilo', [8, 9]],
    ['metil (1-oxoetil) éter', 'etanoato de metilo', [8, 9]],
    ['(1-oxopropil) metil éter', 'propanoato de metilo', [8, 9]],
  ]) {
    const verdict = read(name);
    const d = verdict.diagnosis;
    assert.deepEqual([verdict.kind, verdict.name, d.code, d.rule, d.traceRule, d.step], ['otherName', engine, 'ESTER_CLASS_NAME', 1,
      null, 'group'], name);
    assert.equal(d.message, message(engine), name);
    assert.deepEqual(d.tiles, tiles, `${name}: the «éter» tile`);
    assert.deepEqual(d.student, { atoms: [], bonds: [] }, `${name}: a class name has no chain`);
    assert.equal('className' in d, false, `${name}: no class-name step`);
    // The focus: the –COO– (its carbon, both oxygens and their two bonds); the class name's oxygen is its bridge oxygen.
    const oxygen = verdict.studentParent.atoms[0];
    assert.ok(d.focus.atoms.includes(oxygen), name);
    assert.deepEqual([d.focus.atoms.length, d.focus.bonds.length], [3, 2], name);
    // «Ver el paso» opens «Reconoce el grupo funcional», which says the molecule is an ester; no class-name step is added.
    const opened = diagnosisExplanation(verdict, explain);
    assert.equal(opened.steps[opened.index].id, 'group', name);
    assert.match(opened.steps[opened.index].text.join(' '), /la molécula es un éster/, name);
    assert.ok(!opened.steps.some((step) => step.id === CLASS_NAME_STEP), name);
  } // End of the loop over the ester class names
  // An ether beside a ketone or an OH is still an ether: its `-oxi` prefix is in the engine's name.
  for (const [name, engine] of [['(2-oxopropil) metil éter', '1-metoxipropan-2-ona'], ['(2-hidroxietil) metil éter', '2-metoxietan-1-ol']]) {
    const verdict = read(name);
    assert.deepEqual([verdict.kind, verdict.name, verdict.diagnosis.code], ['otherName', engine, 'CLASS_NAME_NONE'], name);
    assert.ok(verdict.diagnosis.message.endsWith(`«${engine}».`), name);
  } // End of the loop over the ethers with a suffix
}); // End of test 'a class name whose oxygen is an ester's'

test('the drafts of the ether rules: their place among the rules, their steps, every variant renders', () => {
  assert.deepEqual(DIAGNOSIS_CODES.filter((code) => ETHER_CODES.includes(code)), ETHER_CODES);
  assert.deepEqual(ETHER_CODES.map((code) => [DIAGNOSES[code].rule, DIAGNOSES[code].step]),
    [[2, 'ether'], [2, CLASS_NAME_STEP], [2, CLASS_NAME_STEP], [5, CLASS_NAME_STEP], [6, CLASS_NAME_STEP], [7, 'substituents']]);
  // Each beside the rule whose place it takes: after PHENOL (rule 2), ALPHABETICAL_ORDER, UNGROUPED, MULTIPLIER_KIND.
  const after = (code) => DIAGNOSIS_CODES[DIAGNOSIS_CODES.indexOf(code) - 1];
  assert.deepEqual(['ETHER_SIDE', 'CLASS_ORDER', 'CLASS_DI', 'ALKOXY_MULTIPLIER'].map(after),
    ['PHENOL', 'ALPHABETICAL_ORDER', 'UNGROUPED', 'MULTIPLIER_KIND']);
  for (const code of ETHER_CODES) {
    const text = DIAGNOSIS_TEXTS[code](DIAGNOSES[code].example);
    assert.match(text, /^[«¿A-ZÁÉÍÓÚ].*\.$/u, code);
    assert.doesNotMatch(text, /undefined|null|NaN/, code);
  }
  assert.deepEqual([...STEP_FALLBACKS.ether], ['chain', 'ring', 'benzene', 'count']);
  assert.deepEqual([...STEP_FALLBACKS[CLASS_NAME_STEP]], ['ether', 'chain', 'ring', 'benzene', 'count']);
  // Every reason of ETHER_SIDE renders.
  for (const reason of ['RING_IS_PARENT', 'HYDROXY_PARENT', 'MORE_HYDROXY_GROUPS', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS',
    'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'CHAIN_ALPHABETICAL']) {
    const phrase = DIAGNOSIS_PHRASES.etherSide({ reason, student: 0, app: 2, length: 3, ring: 1, chain: 1, chainParent: false,
      rule: 'N3', benzene: false, studentRing: false });
    assert.doesNotMatch(phrase, /undefined|null|NaN/, reason);
  }
  assert.equal(DIAGNOSIS_PHRASES.etherSide({ reason: 'HYDROXY_PARENT', ring: 1, chain: 1, chainParent: false }),
    'primero cuenta el grupo principal, y los dos lados llevan un grupo –OH cada uno; en el empate, manda el anillo');
  // Without the engine's prefix part (never seen), the message still says where the student's chain goes.
  assert.ok(DIAGNOSIS_TEXTS.ETHER_SIDE({ ...DIAGNOSES.ETHER_SIDE.example, side: null })
    .endsWith('Tu cadena, con el oxígeno, va en un sustituyente acabado en «-oxi»: «metoxietano».'));
  // A chain or ring deeper inside the substituent (review of phase I-51b2), with and without the engine's prefix part.
  assert.deepEqual([
    DIAGNOSIS_PHRASES.etherHolder({ studentRing: false, nested: true, side: '2-metoxietoxi' }),
    DIAGNOSIS_PHRASES.etherHolder({ studentRing: true, nested: true, side: null }),
    DIAGNOSIS_PHRASES.etherHolder({ studentRing: true, nested: false, side: 'ciclohexiloxi' }),
  ], ['Tu cadena forma parte del sustituyente «2-metoxietoxi»', 'Tu anillo forma parte de un sustituyente',
    'Tu anillo, con el oxígeno, es el sustituyente «ciclohexiloxi»']);
}); // End of test 'the drafts of the ether rules…'

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

test('property: ETHER_SIDE exactly when the student\'s chain and the parent lie on two sides of an ether oxygen', () => {
  const random = mulberry32(20261017);
  const int = (lo, hi) => lo + Math.floor(random() * (hi - lo + 1));
  const pick = (list) => list[int(0, list.length - 1)];
  const alkoxy = ['met il oxi', 'et il oxi', 'prop il oxi', 'but il oxi', 'pent il oxi', 'hex il oxi', 'isopropil oxi', 'fenil oxi',
    'ciclo hex il oxi', 'et eno il oxi', 'START 2 hidroxi et il oxi END', 'START 2 cloro et il oxi END', 'START 2 met il oxi et il oxi END'];
  const others = ['met il', 'cloro', 'hidroxi', 'et il'];
  const parents = ['met ano', 'et ano', 'prop ano', 'but ano', 'et eno', 'ciclo hex ano', 'benceno'];
  const codes = new Map();
  for (let i = 0; i < 400; i += 1) {
    const prefixes = [`${int(1, 2)} ${pick(alkoxy)}`];
    if (random() < 0.4) {
      prefixes.push(`${int(1, 2)} ${pick(others)}`);
    }
    const words = [...prefixes, pick(parents)].join(' ');
    const verdict = readName(seq(words), { budget: { ms: 300 } });
    if (verdict.kind !== 'otherName' || !verdict.diagnosis) {
      continue;
    }
    const d = verdict.diagnosis;
    codes.set(d.code, (codes.get(d.code) || 0) + 1);
    const across = oxygensBetween(verdict.molecule, d.student.atoms, d.parent.atoms).length > 0;
    if (d.code === 'ETHER_SIDE') {
      assert.ok(across, `${verdict.text}: ETHER_SIDE with the chains on one side`);
      assert.ok(d.focus.atoms.some((id) => verdict.molecule.atoms.get(id).element === 'O'), verdict.text);
    } else if (across) {
      // Across the oxygen only rule 1 keeps its own message, and the form rules of a name whose parent choice is right.
      assert.ok(!['RING_IS_PARENT', 'HYDROXY_PARENT', 'MORE_HYDROXY_GROUPS', 'LONGER_CHAIN', 'MORE_MULTIPLE_BONDS',
        'MORE_DOUBLE_BONDS', 'MORE_SUBSTITUENTS', 'CHAIN_LOCANTS', 'CHAIN_ALPHABETICAL'].includes(d.code), `${verdict.text}: ${d.code}`);
    }
    assert.doesNotMatch(d.message, /undefined|null|NaN|\[object/, verdict.text);
    const opened = diagnosisExplanation(verdict, explain);
    assert.ok(opened.index >= 0 && [d.step, ...STEP_FALLBACKS[d.step]].includes(opened.steps[opened.index].id), verdict.text);
  } // End of the loop over the random names
  assert.ok((codes.get('ETHER_SIDE') || 0) >= 20, JSON.stringify([...codes]));
}); // End of test 'property: ETHER_SIDE exactly when…'
