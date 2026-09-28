/**
 * @file Turns a naming result and its trace into ordered Spanish steps with
 * highlight data (design.md §5). Pure: no DOM, no coordinates; it reads only
 * the naming result (name, parts, structure, parent, trace, alternatives)
 * and never re-derives chemistry (which chain wins, which numbering wins):
 * every decision comes from the trace.
 *
 * Step shape (JSON-serialisable, snapshot-tested):
 *
 *   { id, title,
 *     text: [paragraph…],                     // Spanish, ESO level
 *     highlight: [{atoms, bonds, style}…],    // editor.highlight() specs
 *     locants: [[atomId, number]…] | null,    // editor.showLocants()
 *     options?: [{label, text, highlight, locants}…],  // "Opción 1 de 3"
 *     compare?: {labels, rows: [{rule, label, lists, firstDifference, marks, winners}]},
 *     legend?: [{text, kind, meaning}…],      // "Monta el nombre"
 *     parts?: NamePart[] }                    // the coloured name
 *
 * Paragraphs may contain glossary terms written `[[shown text|key]]` (or
 * `[[key]]`); `parseMarkup()` splits them and `GLOSSARY` holds the
 * definitions shown as tooltips. Names are quoted with «…».
 *
 * Step ids, in order: count, group, ester, ether, ring, benzene, chain, groupChain,
 * tiebreak, numbering, ringNumbering, substituents, order, assemble. A step that decided
 * nothing is skipped (tiebreak without a deciding rule, substituents
 * without prefixes, order with fewer than two prefix groups) or reduced to
 * one short line (numbering when the name has no locants). A chain parent
 * never gets the ring steps; a cycloalkane (`parentKind` 'ring', design.md
 * §13.4 I-25) gets count, ring, ringNumbering and assemble: the chain that
 * closes on itself (its closure bond highlighted apart), the carbon count,
 * the formula CₙH₂ₙ and why no number is needed. A substituted or
 * unsaturated ring (I-26) gets count, ring (plus the ring-vs-chain rule),
 * ringNumbering (every start and direction, options compared like a
 * chain's), substituents, order and assemble. Benzene and a monosubstituted
 * benzene (I-28, the ring's `retained` 'benzene') get count, benzene (the
 * hexagon with alternating double bonds, the two equivalent Kekulé drawings,
 * why a single substituent needs no number, the ring senior to the chain),
 * substituents and assemble: nothing to number or order.
 *
 * Halogen derivatives (design.md §13.4 I-30) get the same steps: the
 * halogen atoms (`halogen` substituents) are counted in the formula, stay
 * out of the chain, count as substituents in the tie-breaks and the
 * numbering, are named as prefixes (fluoro-, cloro-, bromo-, yodo-, never a
 * suffix) and are ordered alphabetically with the other prefixes (`yodo`
 * under y); the steps say so where a halogen is present.
 *
 * Alcohols (design.md §13.4 I-31, `structure.suffix`) get one more step
 * after count, group ("Reconoce el grupo funcional": the –OH group, the
 * principal group named with the suffix `-ol`, `fenol` on benzene, a
 * `hidroxi-` prefix for an OH left on a branch); a chain parent gets
 * groupChain ("Busca la cadena principal": the most OH groups first, then
 * the length, from the P0 and P1 trace steps) instead of chain; the
 * numbering steps explain N0 (the OH gets the lowest locant, before the
 * multiple bonds) and the omitted locants of `etanol`, `ciclohexanol`; the
 * assemble step explains `-ol`, `-diol`, `-triol` and the elided `o` of the
 * ending (`propan-2-ol` but `etano-1,2-diol`).
 *
 * Aldehydes and ketones (design.md §13.4 I-32, `structure.suffix.kind`
 * 'aldehyde' / 'ketone') get the same steps with their own words
 * (SUFFIX_GROUP_WORDS): the group step (carbonylGroupStep()) shows each
 * C=O whole (carbon and oxygen), says that its carbon is a chain or ring
 * carbon, gives `-al` / `-ona` (`-dial`, `-diona`) and, with other oxygen
 * groups, the seniority aldehído > cetona > alcohol and the `oxo-` /
 * `hidroxi-` prefixes; the count step draws a C=O as O and counts it as
 * replacing two hydrogens; the numbering step says why an aldehyde's
 * locant is never written (aldehydeNote()) and why `propanona` needs none;
 * `oxo-` and `hidroxi-` prefixes are described in the substituents step
 * and the legend.
 *
 * Carboxylic acids (design.md §13.4 I-33, `structure.suffix.kind` 'acid')
 * get the same steps: the group step (acidGroupStep()) shows each –COOH
 * whole (carbon, C=O oxygen and OH oxygen), says that its OH is not an
 * alcohol nor its C=O a ketone, that its carbon is a chain end counted in
 * the chain (locant 1), gives `ácido …oico` (`…dioico`) and, with other
 * oxygen groups, the seniority ácido > aldehído > cetona > alcohol and the
 * `oxo-` / `hidroxi-` prefixes; the numbering step says why the acid's
 * locant is never written (terminalGroupNote()); the legend and the
 * assemble step explain the word `ácido` that starts the name.
 *
 * Ethers (design.md §13.4 I-34, `alkoxy` prefixes) get one more step
 * after group, "Reconoce el éter" (etherStep()): the O between two
 * carbons highlighted apart from both sides (the parent side and the
 * alkoxy side), why the O is never in the chain nor a suffix, which side
 * holds the parent and why (read from the trace: the side with the
 * principal group, the longer chain, more multiple bonds, the ring, or
 * both sides alike), and how the prefix is formed (`met` + `oxi`,
 * `pentil` + `oxi`, `isopropoxi`); the count step draws the ether O as O
 * (no hydrogen) and the other steps describe and order the `-oxi` prefixes.
 *
 * Esters (design.md §13.4 I-35, `structure.suffix.kind` 'ester' and
 * `structure.ester`) get the acid's steps in their own words (the group
 * step esterGroupStep(): one –COO– group, its C=O not a ketone nor its
 * middle O an ether, ácido > éster > aldehído…) and one more step after
 * group, "Separa las dos partes del éster" (esterStep()): the acid part
 * (the chain with the C=O carbon as carbon 1, named like the acid with
 * `-oico` changed to `-oato`) and the O-bound group (named like a branch,
 * ending in `-ilo`), each highlighted apart and each an option; the count
 * step draws both O of the –COO– as O; the chain step says why the chain
 * never crosses the middle O; the legend and the assemble step explain the
 * Spanish order `… de …` (and the English one, group first).
 *
 * Amines (design.md §13.4 I-36, `structure.suffix.kind` 'amine') get the
 * alcohol's steps in their own words: the count step draws each N as NH₂,
 * NH or N and adds N to the formula (Hill order …, N, O); the group step
 * (amineGroupStep()) shows the N with its carbon, primary / secondary /
 * tertiary, the suffix `-amina` (`-diamina`), the N never in the chain, the
 * other groups on the N cited with the locant `N`, `bencenamina` and its
 * retained `anilina`; groupChain explains, from the trace, why the parent
 * is on its side of the N (amineSideReason()); the locant `N` (N_LOCANT) is
 * shown as `N` in comparisons, legends and sentences and never drawn as a
 * number. An amine below a more senior group is an `amino-` prefix
 * (`amino`, `(dimetilamino)`, `[etil(metil)amino]`), described in the
 * substituents step and named in the seniority sentences (… > alcohol >
 * amina).
 *
 * Amides (design.md §13.4 I-37, `structure.suffix.kind` 'amide') get the
 * acid's steps in their own words and the amine's `N` machinery: the count
 * step draws the C=O as O and the N as NH₂, NH or N and adds N to the
 * formula; the group step (amideGroupStep()) shows the C=O and the N as one
 * group (never a ketone and an amine), its carbon a chain end counted in
 * the chain (carbon 1), the suffix `-amida` (`-diamida`), the groups on the
 * N cited with the locant `N`, the seniority ácido > éster > amida >
 * aldehído… with the other groups as prefixes, and `formamida` /
 * `acetamida`; the numbering step says why the amide's locant is never
 * written (terminalGroupNote()).
 *
 * Nitriles (design.md §13.4 I-38, `structure.suffix.kind` 'nitrile') get
 * the acid's steps in their own words: the count step draws the N as N
 * (no hydrogen) and counts the C≡N as two π bonds and one N
 * (allNitrogenSentences(), atomCounts()); the group step
 * (nitrileGroupStep()) shows the –C≡N as one group whose triple bond is
 * not an alkyne's, its carbon a chain end counted in the chain (carbon 1),
 * the N outside the chain, the suffix `-nitrilo` (`-dinitrilo`), the full
 * seniority order with the other groups as prefixes, and `acetonitrilo`.
 *
 * A molecule refused with `HETEROATOM` (valid, but with atoms other than
 * carbon, design.md §13.4 I-29) carries `groups` (seniority.js
 * GroupAnalysis); it gets groups ("Reconoce los grupos": each
 * characteristic group, and why the atoms of an acid, ester or amide are not
 * counted as alcohol, ether, amine or ketone), principal ("Elige el
 * principal": the seniority order), affixes ("Sufijo o prefijo") and
 * notYet (the refusal message). Every other failure gets no steps.
 */

import { toSubscript } from '../model/molecule.js';
import { lexiconEs, LOCANT_OMISSION, fullyHalogenated } from '../naming/lexicon.es.js';
import { SENIORITY } from '../naming/seniority.js';
import { ELEMENT_NAMES_ES } from '../model/elements.js';
import {
  substituentPrefix, citationKey, needsEnclosure, isCompoundPrefix, renderPrefixes, omitsPrefixLocants,
  suffixWords, suffixCount, suffixGroupIds, isContractedAlkoxy, MAX_CONTRACTED_ALKOXY, TERMINAL_SUFFIXES,
  esterAlkylName, renderName, carbonLocantPrefixes, hasNitrogenLocants,
} from '../naming/render.js';
import { locantText, siteLocantText, N_LOCANT } from '../naming/structure.js';

/** Glossary for the underlined terms (design.md §5): key → Spanish definition. */
export const GLOSSARY = Object.freeze({
  'cadena principal': 'La cadena de carbonos que da nombre a la molécula. Es la más larga.',
  sustituyente: 'Una rama que sale de la cadena principal, como el grupo metilo, o un átomo unido a ella, como el cloro. A las ramas también se las llama radicales.',
  localizador: 'El número que dice en qué carbono de la cadena está algo.',
  'insaturación': 'Un enlace doble o triple entre dos carbonos.',
  'enlace doble': 'Dos carbonos unidos por dos enlaces. Se dibuja con dos rayas.',
  'enlace triple': 'Dos carbonos unidos por tres enlaces. Se dibuja con tres rayas.',
  anillo: 'Una cadena de carbonos cerrada: el último carbono está unido al primero.',
  benceno: 'Un anillo de 6 carbonos con tres enlaces dobles alternados (uno sí, uno no). Es muy estable y tiene nombre propio.',
  'grupo funcional': 'Un grupo de átomos (con oxígeno, nitrógeno o un halógeno) que decide cómo se comporta la molécula y cómo se llama.',
  'grupo principal': 'El grupo funcional más importante de la molécula. Da la terminación (el sufijo) del nombre.',
  sufijo: 'Una terminación que se añade al final del nombre, como «-ol» en «etanol».',
  prefijo: 'Una parte que se escribe delante del nombre, como «cloro-» en «clorometano».',
  amina: 'Una molécula con un nitrógeno unido a carbonos solo con enlaces simples. Es como el amoníaco (NH₃) con uno, dos o tres hidrógenos cambiados por grupos de carbonos.',
});

/** Titles of the steps (design.md §5). */
export const STEP_TITLES = Object.freeze({
  count: 'Cuenta los carbonos',
  group: 'Reconoce el grupo funcional',
  ester: 'Separa las dos partes del éster',
  ether: 'Reconoce el éter',
  ring: 'Busca el anillo',
  benzene: 'Reconoce el benceno',
  chain: 'Busca la cadena más larga',
  groupChain: 'Busca la cadena principal',
  tiebreak: 'Desempates',
  numbering: 'Numera la cadena',
  ringNumbering: 'Numera el anillo',
  substituents: 'Nombra los sustituyentes',
  order: 'Ordena alfabéticamente',
  assemble: 'Monta el nombre',
  groups: 'Reconoce los grupos',
  principal: 'Elige el principal',
  affixes: 'Sufijo o prefijo',
  notYet: 'Aún no sé nombrarla',
});

/** Short Spanish statement of each numbering rule, for the comparison table. */
const RULE_LABELS = Object.freeze({
  N0: 'Grupos –OH',
  N1: 'Enlaces dobles y triples',
  N2: 'Enlaces dobles',
  N3: 'Sustituyentes',
  N4: 'Sustituyentes en orden alfabético',
});

/** Letters used to label the numbering options. */
const OPTION_LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Unique spreadsheet-style label for the i-th numbering option: A…Z, AA, AB…
 * (large rings can have more than 26 options).
 *
 * @param {number} i - Zero-based option index.
 * @returns {string} The option label.
 */
function optionLabel(i) {
  let label = '';
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / OPTION_LETTERS.length)) {
    label = OPTION_LETTERS[(n - 1) % OPTION_LETTERS.length] + label;
  }
  return label;
}

/**
 * Splits a paragraph into plain text and glossary terms.
 *
 * @param {string} text - A paragraph with `[[shown|key]]` or `[[key]]` marks.
 * @returns {{text: string, term?: string}[]} Segments; `term` is a GLOSSARY key.
 */
export function parseMarkup(text) {
  const segments = [];
  const pattern = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) {
      segments.push({ text: text.slice(last, match.index) });
    }
    segments.push({ text: match[1], term: match[2] || match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ text: text.slice(last) });
  }
  return segments;
} // End of function parseMarkup()

/**
 * Removes the glossary marks of a paragraph (plain text for screen readers
 * and tests).
 *
 * @param {string} text - A paragraph with marks.
 * @returns {string} The plain text.
 */
export function plainText(text) {
  return parseMarkup(text).map((s) => s.text).join('');
}

/**
 * Joins items the Spanish way: `a`, `a y b`, `a, b y c`.
 *
 * @param {Array<string|number>} items - The items.
 * @returns {string} The joined text.
 */
export function joinY(items) {
  const list = items.map(locantText);
  if (list.length <= 1) {
    return list.join('');
  }
  return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`;
}

/**
 * Chooses the singular or plural form.
 *
 * @param {number} n - The count.
 * @param {string} one - Singular form.
 * @param {string} many - Plural form.
 * @returns {string} `n` followed by the right form, e.g. '1 carbono', '6 carbonos'.
 */
function count(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * A locant list for the comparison table: integers stay numbers, compound
 * locants (a ring's closure bond) become their text `1(6)`.
 *
 * @param {number[]|null} list - Compared locants, or null.
 * @returns {Array<number|string>|null} The displayed list.
 */
function displayLocants(list) {
  return list && list.map((v) => (Number.isInteger(v) && v !== N_LOCANT ? v : locantText(v)));
}

/**
 * Legend addition for the locants of a segment that include a ring's
 * closure bond: what the compound locant `1(6)` means.
 *
 * @param {{locant: number, closing?: number}[]} sites - The segment's sites.
 * @returns {string} The addition, or '' without a closure bond.
 */
function closureNote(sites) {
  const site = sites.find((s) => s.closing);
  return site ? `; ${q(siteLocantText(site))} es el enlace entre el carbono 1 y el ${site.closing}, que cierra el anillo` : '';
}

/**
 * Formats a locant list for the student: `2, 4`, `1(6), 2`, or `ninguno`
 * when empty (compound locants written by structure.js locantText()).
 *
 * @param {number[]} list - Locants.
 * @returns {string} The text.
 */
function listText(list) {
  return list.length === 0 ? 'ninguno' : list.map(locantText).join(', ');
}

/**
 * Wraps a name in Spanish quotes.
 *
 * @param {string} text - The name.
 * @returns {string} `«text»`.
 */
function q(text) {
  return `«${text}»`;
}

/** How the parent is named in sentences: a chain, or a ring (Spanish contractions al/del). */
const PARENT_WORDS = Object.freeze({
  chain: Object.freeze({ the: 'la cadena principal', to: 'a la cadena principal', of: 'de la cadena principal' }),
  ring: Object.freeze({ the: 'el anillo', to: 'al anillo', of: 'del anillo' }),
  carbon: Object.freeze({ the: 'el carbono', to: 'al carbono', of: 'del carbono' }),
});

/** Words for the O that carries the alkyl group of an alkoxy prefix (design.md §13.4 I-34). */
const OXYGEN_WORDS = Object.freeze({ the: 'el oxígeno', to: 'al oxígeno', of: 'del oxígeno' });

/** Words for the N of a principal amine that carries the groups cited with the locant `N` (design.md §13.4 I-36). */
const NITROGEN_WORDS = Object.freeze({ the: 'el nitrógeno', to: 'al nitrógeno', of: 'del nitrógeno' });

/**
 * The words used for the parent of a result in sentences (a one-carbon
 * parent, as in `clorometano`, is "el carbono").
 *
 * @param {object} result - The naming result.
 * @returns {{the: string, to: string, of: string}} `la cadena principal` / `el anillo` and their forms after a, de.
 */
function parentWords(result) {
  if (result.structure.parentKind === 'ring') {
    return PARENT_WORDS.ring;
  }
  return result.structure.parent.length === 1 ? PARENT_WORDS.carbon : PARENT_WORDS.chain;
}

/**
 * Tells whether a result is a bare cycloalkane (a ring without prefixes or
 * ring multiple bonds, design.md §13.4 I-25), explained without numbering.
 *
 * @param {object} result - The naming result.
 * @returns {boolean} True for a cycloalkane.
 */
function isBareRing(result) {
  const { parentKind, parent, prefixes, suffix } = result.structure;
  return parentKind === 'ring' && prefixes.length === 0 && !suffix && parent.double.length + parent.triple.length === 0;
}

/**
 * Tells whether a result is benzene or a benzene derivative (a ring parent
 * with `retained` 'benzene', naming/aromatic.js).
 *
 * @param {object} result - The naming result.
 * @returns {boolean} True for a benzene parent.
 */
function isBenzene(result) {
  return result.structure.parentKind === 'ring' && result.structure.parent.retained === 'benzene';
}

/**
 * Whether the ring locants of a ring result are omitted (lexicon
 * ringOmitsLocants()); for a chain, `parent` is false and `prefixes` follows
 * lexicon chainOmitsPrefixLocants() (`clorometano`, `cloroetano`,
 * `hexacloroetano`, `etanol`). `prefixes` covers the suffix locants too.
 *
 * @param {object} result - The naming result.
 * @returns {{parent: boolean, prefixes: boolean}} Omission of the ring ending locants and of the prefix and suffix locants.
 */
function ringOmission(result) {
  const { parentKind, parent, prefixes } = result.structure;
  // The groups on an amine nitrogen (locant `N`) do not count, as in render.js (design.md §13.4 I-36).
  return parentKind === 'ring'
    ? lexiconEs.ringOmitsLocants(parent, carbonLocantPrefixes(prefixes), suffixCount(result.structure))
    : { parent: false, prefixes: omitsPrefixLocants(result.structure, lexiconEs) };
}

/**
 * Whether the prefix locants of a name are left out: the omission rule
 * (ringOmission()), unless some prefix is on an amine nitrogen — its `N` is
 * always written and then every carbon locant too (render.js renderName(),
 * design.md §13.4 I-36: `1-cloro-N-metilmetanamina`).
 *
 * @param {object} result - The naming result.
 * @returns {boolean} True when no prefix locant is written.
 */
function prefixLocantsOmitted(result) {
  return ringOmission(result).prefixes && !hasNitrogenLocants(result.structure.prefixes);
}

/**
 * Tells whether a prefix group is cited only on the nitrogen of a principal
 * amine (every locant `N`, design.md §13.4 I-36: `N-metil`, `N,N-dimetil`).
 *
 * @param {object} group - A prefix group.
 * @returns {boolean} True for a group only on the nitrogen.
 */
function onNitrogen(group) {
  return group.locants.every((site) => site.locant === N_LOCANT);
}

/**
 * The occurrences of prefixes on the nitrogen of a principal amine (locant
 * `N`, design.md §13.4 I-36), each with its group.
 *
 * @param {object} result - The naming result.
 * @returns {{group: object, site: object}[]} The occurrences (none without such groups).
 */
function nitrogenSites(result) {
  return result.structure.prefixes.flatMap((group) => group.locants
    .filter((site) => site.locant === N_LOCANT)
    .map((site) => ({ group, site })));
}

/**
 * Tells whether a result's principal group is an amine (design.md §13.4
 * I-36, suffix `-amina`).
 *
 * @param {object} result - The naming result.
 * @returns {boolean} True for `…amina`.
 */
function isAmine(result) {
  const { suffix } = result.structure;
  return Boolean(suffix) && suffix.kind === 'amine';
}

/**
 * Tells whether a result's principal group is an amide (design.md §13.4
 * I-37, suffix `-amida`).
 *
 * @param {object} result - The naming result.
 * @returns {boolean} True for `…amida`.
 */
function isAmide(result) {
  const { suffix } = result.structure;
  return Boolean(suffix) && suffix.kind === 'amide';
}

/**
 * Tells whether a result's principal group is a nitrile (design.md §13.4
 * I-38, suffix `-nitrilo`).
 *
 * @param {object} result - The naming result.
 * @returns {boolean} True for `…nitrilo`.
 */
function isNitrile(result) {
  const { suffix } = result.structure;
  return Boolean(suffix) && suffix.kind === 'nitrile';
}

/**
 * Number of amine nitrogens inside a substituent, nested ones included (an
 * `amino` prefix counts its own N plus those of its own groups, design.md
 * §13.4 I-36).
 *
 * @param {object} sub - A substituent structure.
 * @returns {number} The count.
 */
function aminoTotal(sub) {
  let n = sub.amino ? 1 : 0;
  for (const group of sub.prefixes) {
    n += group.locants.length * aminoTotal(group.substituent);
  }
  return n;
}

/**
 * Amine nitrogens cited as `amino-` prefixes in a name: on the parent, in
 * branches, or in an ester's O-bound group (design.md §13.4 I-36).
 *
 * @param {object} result - The naming result.
 * @returns {number} The count.
 */
function aminoPrefixCount(result) {
  const alkyl = esterGroup(result);
  return prefixSum(result, aminoTotal) + (alkyl ? aminoTotal(alkyl) : 0);
}

/**
 * Every amine or amide nitrogen of a name, classified by how many carbons
 * it is bonded to (1: –NH₂, 2: –NH–, 3: N without hydrogen): the nitrogens
 * of the suffix (their carbon plus the groups cited with `N`; an amide's N,
 * SuffixLocant `amideNitrogen`, design.md §13.4 I-37) and those of the
 * `amino` prefixes at any depth (design.md §13.4 I-36).
 *
 * @param {object} result - The naming result.
 * @returns {{1: number, 2: number, 3: number}} Nitrogens bonded to 1, 2 and 3 carbons.
 */
function nitrogenKinds(result) {
  const kinds = { 1: 0, 2: 0, 3: 0 };
  if (isAmine(result) || isAmide(result)) {
    const sites = nitrogenSites(result);
    for (const s of result.structure.suffix.locants) {
      const nitrogen = s.amideNitrogen === undefined ? s.attachAtom : s.amideNitrogen;
      kinds[1 + sites.filter(({ site }) => site.atom === nitrogen).length] += 1;
    }
  }
  /**
   * Adds the amino nitrogens of a substituent, `times` occurrences of it.
   *
   * @param {object} sub - A substituent structure.
   * @param {number} times - How many times the substituent is cited.
   * @returns {void}
   */
  const visit = (sub, times) => {
    if (sub.amino) {
      kinds[1 + sub.prefixes.reduce((sum, g) => sum + g.locants.length, 0)] += times;
    }
    for (const group of sub.prefixes) {
      visit(group.substituent, times * group.locants.length);
    }
  };
  for (const group of result.structure.prefixes) {
    visit(group.substituent, group.locants.length);
  }
  const alkyl = esterGroup(result);
  if (alkyl) {
    visit(alkyl, 1);
  }
  return kinds;
} // End of function nitrogenKinds()

/**
 * Highlight specs of the prefix groups that are or carry an `amino` prefix
 * (design.md §13.4 I-36: `amino`, `(dimetilamino)`, `(aminometil)`), as
 * substituents.
 *
 * @param {object} result - The naming result.
 * @returns {{atoms: number[], bonds: number[], style: string}[]} The specs.
 */
function aminoPrefixSpecs(result) {
  return result.structure.prefixes
    .filter((g) => aminoTotal(g.substituent) > 0)
    .map((g) => ({ ...groupIds(g), style: 'substituent' }));
}

/**
 * How the principal group of each suffix kind is called in sentences
 * (design.md §5; alcohols I-31, aldehydes and ketones I-32, acids I-33, esters I-35, amines I-36, amides I-37, nitriles I-38): `the` / `one` /
 * `many` for the group, `art` for its short form with the article, `group`
 * without article, `carbonWith` / `carbonThe` / `carbonA` for its carbon,
 * `label` for the N0 row of the comparison table, `prefix` for the prefix
 * of a group of the same kind left on a branch, `family` for the compound
 * family, `ringExample` for the ring name without locant.
 */
const SUFFIX_GROUP_WORDS = Object.freeze({
  acid: Object.freeze({
    the: 'el grupo –COOH',
    one: 'un grupo –COOH',
    many: 'grupos –COOH',
    group: 'grupo –COOH',
    art: 'el –COOH',
    short: '–COOH',
    carbonWith: 'el carbono del –COOH',
    carbonThe: 'el carbono del grupo –COOH',
    carbonA: 'un carbono de un grupo –COOH',
    label: 'Grupos –COOH',
    prefix: 'carboxi',
    family: 'ácido carboxílico',
    ringExample: '',
  }),
  ester: Object.freeze({
    the: 'el grupo –COO–',
    one: 'un grupo –COO–',
    many: 'grupos –COO–',
    group: 'grupo –COO–',
    art: 'el –COO–',
    short: '–COO–',
    carbonWith: 'el carbono del –COO–',
    carbonThe: 'el carbono del grupo –COO–',
    carbonA: 'un carbono de un grupo –COO–',
    label: 'Grupos –COO–',
    prefix: 'alcoxicarbonil',
    family: 'éster',
    ringExample: '',
  }),
  amide: Object.freeze({
    the: 'el grupo amida',
    one: 'un grupo amida',
    many: 'grupos amida',
    group: 'grupo amida',
    art: 'la amida',
    short: 'grupos amida',
    carbonWith: 'el carbono de la amida',
    carbonThe: 'el carbono del grupo amida',
    carbonA: 'un carbono de un grupo amida',
    label: 'Grupos amida',
    prefix: 'carbamoil',
    family: 'amida',
    ringExample: '',
  }),
  nitrile: Object.freeze({
    the: 'el grupo –C≡N',
    one: 'un grupo –C≡N',
    many: 'grupos –C≡N',
    group: 'grupo –C≡N',
    art: 'el –C≡N',
    short: '–C≡N',
    carbonWith: 'el carbono del –C≡N',
    carbonThe: 'el carbono del grupo –C≡N',
    carbonA: 'un carbono de un grupo –C≡N',
    label: 'Grupos –C≡N',
    prefix: 'ciano',
    family: 'nitrilo',
    ringExample: '',
  }),
  alcohol: Object.freeze({
    the: 'el grupo –OH',
    one: 'un grupo –OH',
    many: 'grupos –OH',
    group: 'grupo –OH',
    art: 'el –OH',
    short: '–OH',
    carbonWith: 'el carbono con el –OH',
    carbonThe: 'el carbono que tiene el grupo –OH',
    carbonA: 'un carbono con un grupo –OH',
    label: 'Grupos –OH',
    prefix: 'hidroxi',
    family: 'alcohol',
    ringExample: 'ciclohexanol',
  }),
  aldehyde: Object.freeze({
    the: 'el grupo –CHO',
    one: 'un grupo –CHO',
    many: 'grupos –CHO',
    group: 'grupo –CHO',
    art: 'el –CHO',
    short: '–CHO',
    carbonWith: 'el carbono del –CHO',
    carbonThe: 'el carbono del grupo –CHO',
    carbonA: 'un carbono de un grupo –CHO',
    label: 'Grupos –CHO',
    prefix: 'oxo',
    family: 'aldehído',
    ringExample: '',
  }),
  ketone: Object.freeze({
    the: 'el grupo C=O',
    one: 'un grupo C=O',
    many: 'grupos C=O',
    group: 'grupo C=O',
    art: 'el C=O',
    short: 'C=O',
    carbonWith: 'el carbono del C=O',
    carbonThe: 'el carbono del grupo C=O',
    carbonA: 'un carbono de un grupo C=O',
    label: 'Grupos C=O',
    prefix: 'oxo',
    family: 'cetona',
    ringExample: 'ciclohexanona',
  }),
  amine: Object.freeze({
    the: 'el grupo amino',
    one: 'un grupo amino',
    many: 'grupos amino',
    group: 'grupo amino',
    art: 'el grupo amino',
    short: 'grupos amino',
    carbonWith: 'el carbono unido al nitrógeno',
    carbonThe: 'el carbono unido al nitrógeno',
    carbonA: 'un carbono unido a un nitrógeno',
    label: 'Grupos amino',
    prefix: 'amino',
    family: 'amina',
    ringExample: 'ciclohexanamina',
  }),
});

/**
 * The sentence words of a result's principal group (SUFFIX_GROUP_WORDS);
 * the alcohol words when the result has no suffix.
 *
 * @param {object} result - The naming result.
 * @returns {object} The words.
 */
function groupWords(result) {
  const { suffix } = result.structure;
  return SUFFIX_GROUP_WORDS[suffix ? suffix.kind : 'alcohol'];
}

/**
 * Tells whether a result's principal group is a C=O (an aldehyde or a
 * ketone, design.md §13.4 I-32).
 *
 * @param {object} result - The naming result.
 * @returns {boolean} True for `-al` / `-ona`.
 */
function isCarbonyl(result) {
  const { suffix } = result.structure;
  return Boolean(suffix) && (suffix.kind === 'aldehyde' || suffix.kind === 'ketone');
}

/**
 * Tells whether a result's principal group is a carboxylic acid –COOH
 * (design.md §13.4 I-33).
 *
 * @param {object} result - The naming result.
 * @returns {boolean} True for `ácido …oico`.
 */
function isAcid(result) {
  const { suffix } = result.structure;
  return Boolean(suffix) && suffix.kind === 'acid';
}

/**
 * Tells whether a result's principal group is an ester –COO– (design.md
 * §13.4 I-35): its structure then has `ester`, the O-bound group.
 *
 * @param {object} result - The naming result.
 * @returns {boolean} True for `…oato de …ilo`.
 */
function isEster(result) {
  return Boolean(result.structure.ester);
}

/**
 * The O-bound group of an ester result (structure.js EsterPart `alkyl`),
 * or null for any other result.
 *
 * @param {object} result - The naming result.
 * @returns {object|null} The group's substituent structure (`alkoxy` true).
 */
function esterGroup(result) {
  return result.structure.ester ? result.structure.ester.alkyl : null;
}

/**
 * Highlight specs of the two parts of an ester and the O between them
 * (design.md §13.4 I-35): the acid part (the parent chain with its C=O
 * oxygen and every prefix occurrence on it, with its connecting bond) as
 * the parent, the O-bound group (its atoms and inner bonds) as a
 * substituent, and the middle O with its two bonds apart. Together the
 * three specs cover every atom and bond of the molecule exactly once.
 *
 * @param {object} result - An ester naming result.
 * @returns {{acid: object, bridge: object, alkyl: object}} The three specs.
 */
function esterSpecs(result) {
  const { ester, suffix, prefixes } = result.structure;
  const [site] = suffix.locants;
  const branches = prefixes.map(groupIds);
  return {
    acid: {
      atoms: [...result.parent.atoms, site.attachAtom, ...branches.flatMap((ids) => ids.atoms)],
      bonds: [...result.parent.bonds, site.bond, ...branches.flatMap((ids) => ids.bonds)],
      style: 'parent',
    },
    bridge: { atoms: [ester.oxygen], bonds: [ester.bond, ester.alkylBond], style: 'candidate' },
    alkyl: {
      atoms: ester.alkyl.atoms.filter((id) => id !== ester.oxygen),
      bonds: ester.alkyl.bonds.filter((id) => id !== ester.alkylBond),
      style: 'substituent',
    },
  };
} // End of function esterSpecs()

/**
 * Number of prefixes of one kind of atom group inside a substituent (nested
 * ones included): OH groups cited `hidroxi-` (`hydroxy`) or C=O oxygens
 * cited `oxo-` (`oxo`).
 *
 * @param {object} sub - A substituent structure.
 * @param {'hydroxy'|'oxo'} flag - Which prefix.
 * @returns {number} The count (1 for such a prefix itself).
 */
function prefixTotal(sub, flag) {
  if (sub[flag]) {
    return 1;
  }
  let n = 0;
  for (const group of sub.prefixes) {
    n += group.locants.length * prefixTotal(group.substituent, flag);
  }
  return n;
}

/**
 * Number of OH groups cited as `hidroxi-` prefixes inside a substituent
 * (nested ones included).
 *
 * @param {object} sub - A substituent structure.
 * @returns {number} The count (1 for a hydroxy prefix itself).
 */
function hydroxyTotal(sub) {
  return prefixTotal(sub, 'hydroxy');
}

/**
 * Number of C=O oxygens cited as `oxo-` prefixes inside a substituent
 * (nested ones included).
 *
 * @param {object} sub - A substituent structure.
 * @returns {number} The count (1 for an oxo prefix itself).
 */
function oxoTotal(sub) {
  return prefixTotal(sub, 'oxo');
}

/**
 * Number of ether oxygens inside a substituent, nested ones included (an
 * alkoxy prefix counts its own O plus those of its own prefixes:
 * `(2-metoxietoxi)` has 2).
 *
 * @param {object} sub - A substituent structure.
 * @returns {number} The count.
 */
function etherTotal(sub) {
  let n = sub.alkoxy ? 1 : 0;
  for (const group of sub.prefixes) {
    n += group.locants.length * etherTotal(group.substituent);
  }
  return n;
}

/**
 * Sum of a per-substituent count over every occurrence of the prefixes of a name.
 *
 * @param {object} result - The naming result.
 * @param {function(object): number} total - Count of one substituent (hydroxyTotal, oxoTotal…).
 * @returns {number} The sum.
 */
function prefixSum(result, total) {
  return result.structure.prefixes.reduce((sum, g) => sum + g.locants.length * total(g.substituent), 0);
}

/**
 * OH groups of a name: those of the suffix (`-ol`) and those cited as
 * `hidroxi-` inside a branch.
 *
 * @param {object} result - The naming result.
 * @returns {{suffix: number, branch: number}} The two counts.
 */
function hydroxylsIn(result) {
  return { suffix: suffixCount(result.structure), branch: prefixSum(result, hydroxyTotal) };
}

/**
 * Groups of the principal kind that are cited as prefixes because no chain
 * can carry them all (design.md §13.4 I-31, I-32): OH groups (`hidroxi-`)
 * for an alcohol, C=O oxygens (`oxo-`) on branches for a ketone; none for
 * an aldehyde or an acid (validation keeps every –CHO and –COOH on the
 * parent).
 *
 * @param {object} result - The naming result.
 * @returns {number} The count.
 */
function principalInBranches(result) {
  const { suffix } = result.structure;
  if (!suffix || TERMINAL_SUFFIXES.includes(suffix.kind)) {
    return 0;
  }
  if (suffix.kind === 'amine') {
    return prefixSum(result, aminoTotal); // `(aminometil)` on a diamine (design.md §13.4 I-36).
  }
  return prefixSum(result, suffix.kind === 'alcohol' ? hydroxyTotal : oxoTotal);
}

/**
 * The OH and C=O groups of a name, wherever they are cited (suffix,
 * prefixes at any depth, or an ester's O-bound group); a –COOH counts as
 * one OH and one C=O, an ester –COO– as one C=O, a nitrile –C≡N as none.
 *
 * @param {object} result - The naming result.
 * @returns {{oh: number, co: number}} The number of OH groups and of C=O groups.
 */
function oxygenGroups(result) {
  const { suffix } = result.structure;
  const n = suffixCount(result.structure);
  const alcohol = Boolean(suffix) && suffix.kind === 'alcohol';
  const acid = Boolean(suffix) && suffix.kind === 'acid';
  const amine = Boolean(suffix) && suffix.kind === 'amine';
  const nitrile = Boolean(suffix) && suffix.kind === 'nitrile';
  const alkyl = esterGroup(result);
  return {
    oh: (alcohol || acid ? n : 0) + prefixSum(result, hydroxyTotal) + (alkyl ? hydroxyTotal(alkyl) : 0),
    co: (alcohol || amine || nitrile ? 0 : n) + prefixSum(result, oxoTotal) + (alkyl ? oxoTotal(alkyl) : 0),
  };
}

/**
 * Whether the suffix locants of a name are omitted: always for an
 * aldehyde, an acid or an ester on a chain (its carbon is a chain end,
 * IUPAC 2013 P-14.3.4.1), else the prefix rule (ringOmission()).
 *
 * @param {object} result - A naming result with a suffix.
 * @returns {boolean} True when the suffix locants are not written.
 */
function suffixOmitted(result) {
  const { parentKind, suffix } = result.structure;
  return (parentKind === 'chain' && TERMINAL_SUFFIXES.includes(suffix.kind)) || ringOmission(result).prefixes;
}

/**
 * Highlight spec of the principal groups (the groups of the suffix with
 * their carbons and bonds: an OH, a C=O, or a whole –COOH with both
 * oxygens, render.js suffixGroupIds()).
 *
 * @param {object} result - A naming result with a suffix.
 * @returns {{atoms: number[], bonds: number[], style: string}} The spec.
 */
function suffixSpec(result) {
  return { ...suffixGroupIds(result.structure.suffix), style: 'parent' };
}

/**
 * Highlight specs of the prefix groups that are or carry an oxygen group
 * cited as `hidroxi-` or `oxo-` (`(hidroximetil)`, `4-oxo`), as
 * substituents; a `hidroxi-` or `oxo-` group on the parent itself also
 * shows its carbon, so a C=O is marked whole (C and O).
 *
 * @param {object} result - The naming result.
 * @returns {{atoms: number[], bonds: number[], style: string}[]} The specs.
 */
function oxygenPrefixSpecs(result) {
  return result.structure.prefixes
    .filter((g) => hydroxyTotal(g.substituent) + oxoTotal(g.substituent) > 0)
    .map((g) => {
      const ids = groupIds(g);
      const direct = g.substituent.hydroxy || g.substituent.oxo;
      return { atoms: direct ? g.locants.flatMap((site) => [site.atom, site.attachAtom]) : ids.atoms, bonds: ids.bonds, style: 'substituent' };
    });
}

/**
 * Tells whether a prefix group is an atom group cited on its own rather than
 * a branch: a halogen, `hidroxi-` or `oxo-`.
 *
 * @param {object} group - A prefix group.
 * @returns {boolean} True for a halogen, OH or C=O prefix.
 */
function isAtomPrefix(group) {
  const sub = group.substituent;
  return Boolean(sub.halogen || sub.hydroxy || sub.oxo);
}

/** Order in which halogens are listed in a formula (Hill order after C and H) and in sentences. */
const HALOGEN_ORDER = Object.freeze(['Br', 'Cl', 'F', 'I']);

/**
 * Halogen atoms of a substituent, nested ones included, by element.
 *
 * @param {object} sub - A substituent structure.
 * @param {Object<string, number>} [into] - Counts to add to (default: a new object).
 * @returns {Object<string, number>} Element symbol → number of atoms.
 */
function substituentHalogens(sub, into = {}) {
  if (sub.halogen) {
    into[sub.halogen] = (into[sub.halogen] || 0) + 1;
    return into;
  }
  for (const group of sub.prefixes) {
    for (let k = 0; k < group.locants.length; k += 1) {
      substituentHalogens(group.substituent, into);
    }
  }
  return into;
}

/**
 * Number of halogen atoms in a substituent (nested ones included).
 *
 * @param {object} sub - A substituent structure.
 * @returns {number} The count (1 for a halogen prefix itself).
 */
function halogenTotal(sub) {
  return Object.values(substituentHalogens(sub)).reduce((a, b) => a + b, 0);
}

/**
 * Number of carbons of one occurrence of a substituent (its subtree atoms
 * minus its halogen atoms, oxygens, ether oxygens included, and amine
 * nitrogens; 0 for a halogen, hydroxy, oxo or plain amino prefix).
 *
 * @param {object} sub - A substituent structure.
 * @returns {number} The carbon count.
 */
function substituentCarbons(sub) {
  return sub.atoms.length - halogenTotal(sub) - hydroxyTotal(sub) - oxoTotal(sub) - etherTotal(sub) - aminoTotal(sub);
}

/**
 * The halogen elements present in a name, at any depth, in HALOGEN_ORDER.
 *
 * @param {object} result - The naming result.
 * @returns {string[]} Element symbols, e.g. ['Br', 'Cl'].
 */
function halogensIn(result) {
  const found = {};
  for (const group of result.structure.prefixes) {
    for (let k = 0; k < group.locants.length; k += 1) {
      substituentHalogens(group.substituent, found);
    }
  }
  return HALOGEN_ORDER.filter((el) => found[el]);
}

/**
 * The halogen prefix groups cited directly on the parent.
 *
 * @param {object} result - The naming result.
 * @returns {object[]} The prefix groups whose substituent is a halogen.
 */
function halogenGroups(result) {
  return result.structure.prefixes.filter((group) => group.substituent.halogen);
}

/**
 * Spanish words for some atoms of one halogen: `1 átomo de cloro`, `3 átomos de cloro`.
 *
 * @param {number} n - How many atoms.
 * @param {string} element - Halogen symbol.
 * @returns {string} The words.
 */
function halogenAtoms(n, element) {
  return `${count(n, 'átomo', 'átomos')} de ${ELEMENT_NAMES_ES[element]}`;
}

/**
 * Multiple-bond count of a substituent (a double bond counts 1, a triple 2),
 * nested prefixes and their connecting bonds included (the C=O of an `oxo`
 * prefix counts 1: it takes the place of two hydrogens).
 *
 * @param {object} sub - A substituent structure.
 * @returns {number} Number of π bonds inside the group.
 */
function substituentPi(sub) {
  if (!sub.chain && !sub.amino) {
    return 0; // A halogen, hydroxy or oxo prefix.
  }
  // An amino prefix has no chain, only the groups on its N (design.md §13.4 I-36).
  let pi = sub.chain ? sub.chain.double.length + 2 * sub.chain.triple.length : 0;
  for (const group of sub.prefixes) {
    for (const site of group.locants) {
      pi += substituentPi(group.substituent) + (site.order - 1);
    }
  }
  return pi;
}

/**
 * Counts the carbons, hydrogens, halogen, nitrogen and oxygen atoms of the
 * named molecule from its structure (H = 2C + 2 + N − 2·π − 2·rings −
 * halogens; one
 * ring for a ring parent; each halogen takes the place of one hydrogen,
 * each OH group replaces a hydrogen by an OH, so it adds an oxygen and
 * leaves the hydrogen count unchanged, and each C=O — of the `-al` / `-ona`
 * suffix or of an `oxo-` prefix — replaces two hydrogens by one oxygen, so
 * it counts as one π bond; a –COOH is one of each: two oxygens, one π
 * bond; an ether O of an alkoxy prefix adds an oxygen between two carbons
 * and changes no hydrogen count; an ester –COO– is one C=O and, with its
 * O-bound group, an O between two carbons like an ether's, I-35; each
 * amine N — of the `-amina` suffix or of an `amino-` prefix — has three
 * bonds, so it adds one hydrogen to the count, I-36; an amide –CONH₂ is one
 * C=O, one O and one such N, I-37; a nitrile –C≡N is one N and two π
 * bonds, the triple bond taking the place of three hydrogens on its carbon
 * and the N adding one, I-38).
 *
 * @param {object} structure - The name structure.
 * @returns {{carbons: number, hydrogens: number, halogens: Object<string, number>, nitrogens?: number, oxygens: number}} The counts (halogens by element; empty for a hydrocarbon; `nitrogens` only when positive).
 */
export function atomCounts(structure) {
  const { parent, prefixes } = structure;
  let carbons = parent.length;
  let pi = parent.double.length + 2 * parent.triple.length;
  const kind = structure.suffix ? structure.suffix.kind : null;
  const amine = kind === 'amine';
  const nitrile = kind === 'nitrile';
  let oxygens = amine || nitrile ? 0 : suffixCount(structure) * (kind === 'acid' ? 2 : 1);
  let nitrogens = amine || nitrile || kind === 'amide' ? suffixCount(structure) : 0;
  if (kind && kind !== 'alcohol' && !amine) {
    // Each C=O of `-al` / `-ona` / `-oico` / `-oato` / `-amida`; each C≡N of `-nitrilo` counts two.
    pi += suffixCount(structure) * (nitrile ? 2 : 1);
  }
  const halogens = {};
  // The prefixes, then an ester's O-bound group (its bridge O counted by etherTotal(), like an ether O).
  const occurrences = prefixes.flatMap((group) => group.locants.map((site) => ({ sub: group.substituent, order: site.order })));
  if (structure.ester) {
    occurrences.push({ sub: structure.ester.alkyl, order: 1 });
  }
  for (const { sub, order } of occurrences) {
    carbons += substituentCarbons(sub);
    substituentHalogens(sub, halogens);
    oxygens += hydroxyTotal(sub) + oxoTotal(sub) + etherTotal(sub);
    nitrogens += aminoTotal(sub);
    pi += substituentPi(sub) + (order - 1);
  }
  const rings = structure.parentKind === 'ring' ? 1 : 0;
  const x = Object.values(halogens).reduce((a, b) => a + b, 0);
  const hydrogens = 2 * carbons + 2 + nitrogens - 2 * pi - 2 * rings - x;
  // `nitrogens` only when there are some, so the counts of a molecule without N keep their shape.
  return nitrogens > 0 ? { carbons, hydrogens, halogens, nitrogens, oxygens } : { carbons, hydrogens, halogens, oxygens };
} // End of function atomCounts()

/**
 * Atoms and bonds of every occurrence of a prefix group (connecting bonds included).
 *
 * @param {object} group - A prefix group.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
function groupIds(group) {
  return {
    atoms: group.locants.flatMap((site) => site.atoms),
    bonds: group.locants.flatMap((site) => [site.bond, ...site.bonds]),
  };
}

/**
 * Highlight spec of the parent chain.
 *
 * @param {object} result - The naming result.
 * @returns {{atoms: number[], bonds: number[], style: string}} The spec.
 */
function parentSpec(result) {
  return { atoms: [...result.parent.atoms], bonds: [...result.parent.bonds], style: 'parent' };
}

/**
 * Highlight specs of every substituent (one spec per group).
 *
 * @param {object} result - The naming result.
 * @returns {{atoms: number[], bonds: number[], style: string}[]} The specs.
 */
function substituentSpecs(result) {
  return result.structure.prefixes.map((group) => ({ ...groupIds(group), style: 'substituent' }));
}

/**
 * Locant labels of the chosen numbering of the parent.
 *
 * @param {object} result - The naming result.
 * @returns {Array<[number, number]>} Atom id → locant pairs.
 */
function parentLocants(result) {
  return result.parent.atoms.map((atom, i) => [atom, i + 1]);
}

/**
 * Locant labels of a directed trace candidate.
 *
 * @param {{atoms: number[]}} candidate - A trace candidate.
 * @returns {Array<[number, number]>} Atom id → locant pairs.
 */
function candidateLocants(candidate) {
  return candidate.atoms.map((atom, i) => [atom, i + 1]);
}

/**
 * Highlight spec of a trace candidate.
 *
 * @param {{atoms: number[], bonds?: number[]}} candidate - A trace candidate.
 * @param {string} style - Highlight style.
 * @returns {{atoms: number[], bonds: number[], style: string}} The spec.
 */
function candidateSpec(candidate, style) {
  return { atoms: [...candidate.atoms], bonds: [...(candidate.bonds || [])], style };
}

/**
 * Direction-independent identity of a chain (sorted atom ids).
 *
 * @param {{atoms: number[]}} candidate - A trace candidate.
 * @returns {string} The chain identity.
 */
function chainIdentity(candidate) {
  return [...candidate.atoms].sort((a, b) => a - b).join('-');
}

/**
 * Tells whether a rule removed at least one candidate.
 *
 * @param {object} step - A trace step.
 * @returns {boolean} True when the rule decided something.
 */
function decided(step) {
  return step.survivors.length < step.candidatesBefore.length;
}

/**
 * The count-step sentences on how the oxygens are drawn when the molecule
 * has ether oxygens (design.md §13.4 I-34): an OH is drawn OH, a C=O
 * oxygen O, and an ether oxygen O between two carbons, without hydrogen
 * (it takes the place of no hydrogen: it sits between two carbons).
 *
 * @param {object} result - The naming result.
 * @param {number} oh - OH groups (oxygenGroups()).
 * @param {number} co - C=O groups (oxygenGroups()).
 * @param {number} ethers - Ether oxygens.
 * @param {boolean} halogens - Whether there are halogen atoms.
 * @returns {string} The sentences, each starting with a space.
 */
function etherDrawingSentences(result, oh, co, ethers, halogens) {
  let drawing = '';
  if (oh > 0) {
    drawing += oh === 1
      ? ' El oxígeno del grupo –OH se ve como OH: es un oxígeno con su hidrógeno.'
      : ' Cada oxígeno de un grupo –OH se ve como OH: es un oxígeno con su hidrógeno.';
  }
  if (co > 0) {
    drawing += co === 1
      ? ' El oxígeno unido a un carbono con un [[enlace doble]] (C=O) se ve como O: no lleva hidrógeno.'
      : ' Cada oxígeno unido a un carbono con un [[enlace doble]] (C=O) se ve como O: no lleva hidrógeno.';
  }
  drawing += ethers === 1
    ? ' El oxígeno unido a dos carbonos (C–O–C) también se ve como O: es el oxígeno de un éter y no lleva hidrógeno.'
    : ' Cada oxígeno unido a dos carbonos (C–O–C) también se ve como O: es el oxígeno de un éter y no lleva hidrógeno.';
  drawing += ' Los hidrógenos de los carbonos no se dibujan: cada carbono tiene los que necesita para llegar a 4 enlaces';
  const single = [...(halogens ? ['halógeno'] : []), ...(oh > 0 ? ['grupo –OH'] : [])];
  if (single.length > 0) {
    drawing += `; cada ${single.join(' o ')} ocupa el sitio de un hidrógeno`;
  }
  if (co > 0) {
    drawing += '; cada oxígeno con enlace doble ocupa el sitio de dos';
  }
  drawing += ethers === 1
    ? '. El oxígeno del éter no ocupa el sitio de ningún hidrógeno: va entre dos carbonos, como un eslabón más.'
    : '. Los oxígenos de los éteres no ocupan el sitio de ningún hidrógeno: cada uno va entre dos carbonos, como un eslabón más.';
  if (isAcid(result)) {
    drawing += suffixCount(result.structure) === 1
      ? ' En el grupo –COOH están los dos: el O con enlace doble y el OH, en el mismo carbono.'
      : ' En cada grupo –COOH están los dos: el O con enlace doble y el OH, en el mismo carbono.';
  }
  return drawing + amideDrawingSentence(result);
} // End of function etherDrawingSentences()

/**
 * The count-step sentence on the amide group (design.md §13.4 I-37): its
 * C=O oxygen and its nitrogen sit on the same carbon; '' for any other
 * result.
 *
 * @param {object} result - The naming result.
 * @returns {string} The sentence, starting with a space, or ''.
 */
function amideDrawingSentence(result) {
  if (!isAmide(result)) {
    return '';
  }
  return suffixCount(result.structure) === 1
    ? ' En el grupo amida están los dos: el O con enlace doble y el nitrógeno, en el mismo carbono.'
    : ' En cada grupo amida están los dos: el O con enlace doble y el nitrógeno, en el mismo carbono.';
}

/**
 * The count-step sentences on how the oxygens of an ester are drawn
 * (design.md §13.4 I-35): the C=O oxygen of the –COO– as O, its middle O
 * as O between two carbons (no hydrogen, like an ether's), and the other
 * OH, C=O and ether oxygens, wherever they are (on the acid part or on the
 * O-bound group).
 *
 * @param {object} result - An ester naming result.
 * @param {number} oh - OH groups (oxygenGroups()).
 * @param {number} co - C=O groups, the ester's included (oxygenGroups()).
 * @param {boolean} halogens - Whether there are halogen atoms.
 * @returns {string} The sentences, each starting with a space.
 */
function esterDrawingSentences(result, oh, co, halogens) {
  const ethers = prefixSum(result, etherTotal) + etherTotal(esterGroup(result)) - 1;
  let drawing = ' En el grupo –COO– hay dos oxígenos, y los dos se ven como O, sin hidrógeno: uno está unido al carbono con un [[enlace doble]] (C=O) y el otro está entre dos carbonos, como un eslabón más.';
  if (oh > 0) {
    drawing += oh === 1
      ? ' El oxígeno del grupo –OH se ve como OH: es un oxígeno con su hidrógeno.'
      : ' Cada oxígeno de un grupo –OH se ve como OH: es un oxígeno con su hidrógeno.';
  }
  if (co > 1) {
    drawing += co === 2
      ? ' El otro oxígeno unido con un [[enlace doble]] (C=O) también se ve como O.'
      : ' Los otros oxígenos unidos con un [[enlace doble]] (C=O) también se ven como O.';
  }
  if (ethers > 0) {
    drawing += ethers === 1
      ? ' El otro oxígeno unido a dos carbonos (C–O–C, un éter) también se ve como O.'
      : ' Los otros oxígenos unidos a dos carbonos (C–O–C, éteres) también se ven como O.';
  }
  drawing += ' Los hidrógenos de los carbonos no se dibujan: cada carbono tiene los que necesita para llegar a 4 enlaces';
  const single = [...(halogens ? ['halógeno'] : []), ...(oh > 0 ? ['grupo –OH'] : [])];
  if (single.length > 0) {
    drawing += `; cada ${single.join(' o ')} ocupa el sitio de un hidrógeno`;
  }
  drawing += '; cada oxígeno con enlace doble ocupa el sitio de dos, y un oxígeno entre dos carbonos no ocupa el de ninguno.';
  return drawing;
} // End of function esterDrawingSentences()

/**
 * The count-step sentences on how the amine nitrogens are drawn (design.md
 * §13.4 I-36): an N bonded to one carbon as NH₂, to two as NH, to three as
 * N alone, like the OH label; a nitrogen makes three bonds, the ones not to
 * a carbon go to hydrogens, and it takes the place of one hydrogen on each
 * carbon it is bonded to.
 *
 * @param {{1: number, 2: number, 3: number}} kinds - Nitrogens by number of carbons (nitrogenKinds()).
 * @param {number} [others] - Other nitrogens in the molecule (a nitrile's, design.md §13.4 I-38), described apart (default 0).
 * @returns {string} The sentences, each starting with a space.
 */
function nitrogenDrawingSentences(kinds, others = 0) {
  const total = kinds[1] + kinds[2] + kinds[3] + others;
  const forms = [
    [kinds[1], 'a un solo carbono se ve como NH₂: lleva dos hidrógenos'],
    [kinds[2], 'a dos carbonos se ve como NH: lleva un hidrógeno'],
    [kinds[3], 'a tres carbonos se ve como N, sin hidrógenos'],
  ];
  let drawing = '';
  for (const [n, form] of forms) {
    if (n > 0) {
      drawing += ` ${n === 1 ? (total === 1 ? 'El nitrógeno unido' : 'Un nitrógeno unido') : 'Cada nitrógeno unido'} ${form}.`;
    }
  }
  drawing += ' Un nitrógeno forma 3 enlaces: los que no van a un carbono llevan un hidrógeno.';
  if (others > 0) {
    return `${drawing} Cada uno de estos nitrógenos ocupa el sitio de un hidrógeno en cada carbono al que se une.`;
  }
  drawing += total === 1
    ? ' El nitrógeno ocupa el sitio de un hidrógeno en cada carbono al que se une.'
    : ' Cada nitrógeno ocupa el sitio de un hidrógeno en cada carbono al que se une.';
  return drawing;
} // End of function nitrogenDrawingSentences()

/**
 * The count-step sentences on every nitrogen of a name: the N of each
 * nitrile –C≡N (design.md §13.4 I-38), drawn N (its three bonds go to its
 * carbon, so it has no hydrogen; the triple bond takes the place of three
 * hydrogens on that carbon), then the amine and amide nitrogens
 * (nitrogenDrawingSentences()); '' without nitrogens.
 *
 * @param {object} result - The naming result.
 * @returns {string} The sentences, each starting with a space.
 */
function allNitrogenSentences(result) {
  const kinds = nitrogenKinds(result);
  const amines = kinds[1] + kinds[2] + kinds[3];
  const nitriles = isNitrile(result) ? suffixCount(result.structure) : 0;
  let drawing = '';
  if (nitriles > 0) {
    drawing += nitriles === 1
      ? ' El nitrógeno unido a un carbono por un [[enlace triple]] (–C≡N) se ve como N: sus 3 enlaces van a ese carbono, así que no lleva hidrógeno. El enlace triple ocupa en el carbono el sitio de tres hidrógenos.'
      : ' Cada nitrógeno unido a un carbono por un [[enlace triple]] (–C≡N) se ve como N: sus 3 enlaces van a ese carbono, así que no lleva hidrógeno. Cada enlace triple ocupa en su carbono el sitio de tres hidrógenos.';
  }
  return amines > 0 ? drawing + nitrogenDrawingSentences(kinds, nitriles) : drawing;
} // End of function allNitrogenSentences()

/**
 * Step 1, "Cuenta los carbonos": carbons, hydrogens and formula.
 *
 * @param {object} result - The naming result.
 * @returns {object} The step.
 */
function countStep(result) {
  const { carbons, hydrogens, halogens, nitrogens = 0, oxygens } = atomCounts(result.structure);
  const present = HALOGEN_ORDER.filter((el) => halogens[el]);
  const symbol = (el, n) => `${el}${n === 1 ? '' : n}`;
  // Hill order: C, H, then the other elements alphabetically (Br, Cl, F, I, N, O).
  const formula = toSubscript(`C${carbons === 1 ? '' : carbons}${hydrogens === 0 ? '' : symbol('H', hydrogens)}${present.map((el) => symbol(el, halogens[el])).join('')}${nitrogens === 0 ? '' : symbol('N', nitrogens)}${oxygens === 0 ? '' : symbol('O', oxygens)}`);
  const atoms = [...result.parent.atoms, ...result.structure.prefixes.flatMap((g) => groupIds(g).atoms)];
  const bonds = [...result.parent.bonds, ...result.structure.prefixes.flatMap((g) => groupIds(g).bonds)];
  if (result.structure.suffix) {
    const spec = suffixSpec(result);
    atoms.push(...spec.atoms.filter((id) => !atoms.includes(id)));
    bonds.push(...spec.bonds);
  }
  if (isEster(result)) {
    const { ester } = result.structure;
    atoms.push(...ester.alkyl.atoms.filter((id) => !atoms.includes(id)));
    bonds.push(...ester.alkyl.bonds);
  }
  const text = [];
  const nitrogenWords = nitrogens === 0 ? [] : [`${count(nitrogens, 'átomo', 'átomos')} de nitrógeno`];
  if (nitrogens > 0 && oxygens === 0) {
    const hydrogenWords = hydrogens === 0 ? 'ningún hidrógeno' : count(hydrogens, 'hidrógeno', 'hidrógenos');
    const items = [count(carbons, 'carbono', 'carbonos'), hydrogenWords, ...present.map((el) => halogenAtoms(halogens[el], el)), ...nitrogenWords];
    text.push(`Tu molécula tiene ${joinY(items)} (${formula}).`);
    let drawing = 'En el dibujo, cada punta y cada vértice sin letra es un carbono.';
    if (present.length > 0) {
      drawing += ` Los átomos de ${joinY(present.map((el) => ELEMENT_NAMES_ES[el]))} se ven con su símbolo (${present.join(', ')}): son halógenos.`;
    }
    drawing += allNitrogenSentences(result);
    drawing += ' Los hidrógenos de los carbonos no se dibujan: cada carbono tiene los que necesita para llegar a 4 enlaces';
    drawing += present.length > 0 ? ', y cada halógeno ocupa el sitio de un hidrógeno.' : '.';
    text.push(drawing);
  } else if (present.length === 0 && oxygens === 0) {
    text.push(`Tu molécula tiene ${count(carbons, 'carbono', 'carbonos')} y ${count(hydrogens, 'hidrógeno', 'hidrógenos')} (${formula}).`);
    text.push('En el dibujo, cada punta y cada vértice es un carbono. Los hidrógenos no se dibujan: cada carbono tiene los que necesita para llegar a 4 enlaces.');
  } else if (oxygens === 0) {
    const hydrogenWords = hydrogens === 0 ? 'ningún hidrógeno' : count(hydrogens, 'hidrógeno', 'hidrógenos');
    const items = [count(carbons, 'carbono', 'carbonos'), hydrogenWords, ...present.map((el) => halogenAtoms(halogens[el], el))];
    text.push(`Tu molécula tiene ${joinY(items)} (${formula}).`);
    text.push(`En el dibujo, cada punta y cada vértice sin letra es un carbono. Los átomos de ${joinY(present.map((el) => ELEMENT_NAMES_ES[el]))} se ven con su símbolo (${present.join(', ')}): son halógenos. Los hidrógenos no se dibujan: cada carbono tiene los que necesita para llegar a 4 enlaces, y cada halógeno ocupa el sitio de un hidrógeno.`);
  } else {
    const hydrogenWords = hydrogens === 0 ? 'ningún hidrógeno' : count(hydrogens, 'hidrógeno', 'hidrógenos');
    const items = [count(carbons, 'carbono', 'carbonos'), hydrogenWords, ...present.map((el) => halogenAtoms(halogens[el], el)),
      ...nitrogenWords, `${count(oxygens, 'átomo', 'átomos')} de oxígeno`];
    text.push(`Tu molécula tiene ${joinY(items)} (${formula}).`);
    let drawing = 'En el dibujo, cada punta y cada vértice sin letra es un carbono.';
    if (present.length > 0) {
      drawing += ` Los átomos de ${joinY(present.map((el) => ELEMENT_NAMES_ES[el]))} se ven con su símbolo (${present.join(', ')}): son halógenos.`;
    }
    const { oh, co } = oxygenGroups(result);
    const ethers = prefixSum(result, etherTotal);
    if (isEster(result)) {
      drawing += esterDrawingSentences(result, oh, co, present.length > 0);
    } else if (ethers > 0) {
      drawing += etherDrawingSentences(result, oh, co, ethers, present.length > 0);
    } else if (co === 0) {
      drawing += oxygens === 1
        ? ' El oxígeno se ve como OH: es un oxígeno con su hidrógeno.'
        : ' Cada oxígeno se ve como OH: es un oxígeno con su hidrógeno.';
      drawing += ' Los hidrógenos de los carbonos no se dibujan: cada carbono tiene los que necesita para llegar a 4 enlaces';
      drawing += present.length > 0 ? ', y cada halógeno o grupo –OH ocupa el sitio de un hidrógeno.' : ', y cada grupo –OH ocupa el sitio de un hidrógeno.';
    } else {
      if (oh > 0) {
        drawing += oh === 1
          ? ' El oxígeno del grupo –OH se ve como OH: es un oxígeno con su hidrógeno.'
          : ' Cada oxígeno de un grupo –OH se ve como OH: es un oxígeno con su hidrógeno.';
      }
      drawing += co === 1
        ? ' El oxígeno unido a un carbono con un [[enlace doble]] (C=O) se ve como O: no lleva hidrógeno.'
        : ' Cada oxígeno unido a un carbono con un [[enlace doble]] (C=O) se ve como O: no lleva hidrógeno.';
      drawing += ' Los hidrógenos de los carbonos no se dibujan: cada carbono tiene los que necesita para llegar a 4 enlaces';
      const single = [...(present.length > 0 ? ['halógeno'] : []), ...(oh > 0 ? ['grupo –OH'] : [])];
      if (single.length > 0) {
        drawing += `; cada ${single.join(' o ')} ocupa el sitio de un hidrógeno`;
      }
      drawing += ', y cada oxígeno con enlace doble ocupa el sitio de dos.';
      if (isAcid(result)) {
        drawing += suffixCount(result.structure) === 1
          ? ' En el grupo –COOH están los dos: el O con enlace doble y el OH, en el mismo carbono.'
          : ' En cada grupo –COOH están los dos: el O con enlace doble y el OH, en el mismo carbono.';
      }
      drawing += amideDrawingSentence(result);
    } // End of the oxygen sentences
    if (nitrogens > 0) {
      drawing += allNitrogenSentences(result);
    }
    text.push(drawing);
  } // End of the count sentences
  if (result.structure.parentKind === 'ring' && result.structure.prefixes.length === 0 && !result.structure.suffix
    && hydrogens === 2 * carbons) {
    const open = toSubscript(`C${carbons}H${hydrogens + 2}`);
    text.push(`En un anillo sin ramas ni enlaces dobles, cada carbono está unido a otros dos carbonos y a 2 hidrógenos: por eso hay el doble de hidrógenos que de carbonos (CₙH₂ₙ). La cadena abierta con los mismos carbonos tiene 2 hidrógenos más (${open}), porque sus dos extremos no están unidos entre sí.`);
  }
  return {
    id: 'count',
    title: STEP_TITLES.count,
    text,
    highlight: [{ atoms, bonds, style: 'candidate' }],
    locants: null,
  };
} // End of function countStep()

/**
 * Step "Reconoce el grupo funcional" for an alcohol or phenol (design.md
 * §13.4 I-31): the –OH groups, the principal group named with the suffix
 * `-ol` (`-diol`, `-triol`), `fenol` on benzene, the `hidroxi-` prefix of an
 * OH left on a branch, and halogens as prefixes.
 *
 * @param {object} result - The naming result.
 * @returns {object|null} The step, or null without a suffix.
 */
function groupStep(result) {
  const { suffix } = result.structure;
  if (!suffix) {
    return null;
  }
  if (isAcid(result)) {
    return acidGroupStep(result);
  }
  if (isEster(result)) {
    return esterGroupStep(result);
  }
  if (isCarbonyl(result)) {
    return carbonylGroupStep(result);
  }
  if (isAmine(result)) {
    return amineGroupStep(result);
  }
  if (isAmide(result)) {
    return amideGroupStep(result);
  }
  if (isNitrile(result)) {
    return nitrileGroupStep(result);
  }
  const { suffix: n, branch } = hydroxylsIn(result);
  const total = n + branch;
  const benzene = isBenzene(result);
  const text = [];
  if (benzene) {
    text.push('Tu molécula tiene un grupo –OH (un oxígeno con su hidrógeno) unido a un carbono del [[benceno]]. Es un [[grupo funcional]]: la molécula es un fenol.');
  } else if (total === 1) {
    text.push('Tu molécula tiene un grupo –OH (un oxígeno con su hidrógeno) unido a un carbono. Es un [[grupo funcional]]: la molécula es un alcohol.');
  } else {
    text.push(`Tu molécula tiene ${total} grupos –OH (cada uno, un oxígeno con su hidrógeno) unidos a carbonos. Son [[grupos funcionales|grupo funcional]]: la molécula es un alcohol.`);
  }
  text.push(`El grupo –OH es el [[grupo principal]]: se nombra con el [[sufijo]] «-${lexiconEs.groupSuffix('alcohol')}», al final del nombre (como en «etanol»).`);
  if (n > 1) {
    const where = result.structure.parentKind === 'ring' ? 'en el anillo' : 'en la [[cadena principal]]';
    const { multiplier: mult } = suffixWords(suffix, lexiconEs);
    text.push(`Aquí hay ${n} grupos –OH ${where}, así que el sufijo dice cuántos: «-${mult}${lexiconEs.groupSuffix('alcohol')}» («di» = 2, «tri» = 3).`);
  }
  if (branch > 0) {
    text.push(branch === 1
      ? 'Un –OH queda en una rama, fuera de la cadena principal: ese no va en el sufijo, sino con el [[prefijo]] «hidroxi-» delante del nombre.'
      : `${branch} grupos –OH quedan en ramas, fuera de la cadena principal: esos no van en el sufijo, sino con el [[prefijo]] «hidroxi-» delante del nombre.`);
  }
  if (benzene) {
    text.push('Un benceno con un –OH tiene nombre propio: «fenol». La IUPAC (2013) lo conserva como nombre preferido; con las reglas generales sería «bencenol», que no se usa.');
  }
  const amines = aminoPrefixCount(result);
  if (amines > 0) {
    text.push(`También tiene ${aminoWords(amines)}. Cuando hay grupos distintos, solo uno es el [[grupo principal]], y se elige con este orden de la IUPAC (2013): alcohol > amina.`);
    text.push(`Aquí manda el alcohol, así que ${amines === 1 ? 'el grupo amino se nombra' : 'cada grupo amino se nombra'} con el [[prefijo]] «amino-», delante del nombre.`);
  }
  if (halogensIn(result).length > 0) {
    text.push('Los halógenos nunca son el grupo principal: van delante, como [[prefijos|prefijo]].');
  }
  return {
    id: 'group',
    title: STEP_TITLES.group,
    text,
    highlight: [suffixSpec(result), ...oxygenPrefixSpecs(result), ...aminoPrefixSpecs(result)],
    locants: null,
  };
} // End of function groupStep()

/**
 * Words for the amine nitrogens cited as `amino-` prefixes, for the
 * "También tiene…" sentences of the group steps (design.md §13.4 I-36).
 *
 * @param {number} n - How many (at least 1).
 * @returns {string} `un grupo amino (una amina)` or `2 grupos amino (aminas)`.
 */
function aminoWords(n) {
  return n === 1 ? 'un grupo amino (un nitrógeno unido a carbonos: una [[amina]])' : `${n} grupos amino (nitrógenos unidos a carbonos: [[aminas|amina]])`;
}

/**
 * Step "Reconoce el grupo funcional" for an amine (design.md §13.4 I-36):
 * the N with its hydrogens (–NH₂, –NH–, or N bonded to three carbons:
 * primary, secondary, tertiary), the principal group named with the suffix
 * `-amina` (`-diamina`…), the N never part of the chain, the other groups on
 * the N cited as prefixes with the locant `N`, `bencenamina` and its
 * retained name `anilina`, an amine left on a branch (`amino-`), and
 * halogens as prefixes. The N with its carbon is highlighted as the
 * principal group, the groups on the N as substituents.
 *
 * @param {object} result - A naming result whose suffix is an amine.
 * @returns {object} The step.
 */
function amineGroupStep(result) {
  const { suffix, parentKind } = result.structure;
  const n = suffix.locants.length;
  const ring = parentKind === 'ring';
  const benzene = isBenzene(result);
  const sites = nitrogenSites(result);
  const ending = lexiconEs.groupSuffix('amine');
  const text = [];
  const kinds = { 1: 'primaria', 2: 'secundaria', 3: 'terciaria' };
  const branch = principalInBranches(result);
  const found = nitrogenKinds(result);
  const primary = found[2] + found[3] === 0;
  if (n + branch > 1) {
    text.push(primary
      ? `Tu molécula tiene ${n + branch} grupos –NH₂ (cada uno, un nitrógeno con dos hidrógenos) unidos a carbonos. Son [[grupos funcionales|grupo funcional]]: la molécula es una [[amina]].`
      : `Tu molécula tiene ${n + branch} nitrógenos unidos a carbonos solo con enlaces simples. Son [[grupos funcionales|grupo funcional]]: la molécula es una [[amina]].`);
  } else {
    const carbons = 1 + sites.length;
    const on = benzene ? 'a un carbono del [[benceno]]' : 'a un carbono';
    const what = {
      1: `un grupo –NH₂: un nitrógeno con dos hidrógenos, unido ${on}`,
      2: 'un nitrógeno unido a dos carbonos y a un hidrógeno (–NH–)',
      3: 'un nitrógeno unido a tres carbonos, sin hidrógenos',
    }[carbons];
    text.push(`Tu molécula tiene ${what}. Es un [[grupo funcional]]: la molécula es una [[amina]].`);
  }
  let which = n + branch === 1 ? `Aquí es una amina ${kinds[1 + sites.length]}.` : 'Aquí todas son primarias.';
  if (n + branch > 1 && !primary) {
    which = `Aquí hay de varios tipos: ${joinY([1, 2, 3].filter((k) => found[k] > 0).map((k) => `${found[k]} ${found[k] === 1 ? kinds[k] : `${kinds[k]}s`}`))}.`;
  }
  text.push(`Una amina es como el amoníaco (NH₃) con hidrógenos cambiados por grupos de carbonos: con uno es una amina primaria; con dos, secundaria, y con tres, terciaria. ${which}`);
  text.push(`El grupo amino es el [[grupo principal]]: se nombra con el [[sufijo]] «-${ending}», al final del nombre (como en «metanamina»).`);
  if (n > 1) {
    const { multiplier: mult } = suffixWords(suffix, lexiconEs);
    text.push(`Aquí hay ${n} grupos amino ${ring ? 'en el anillo' : 'en la [[cadena principal]]'}, así que el sufijo dice cuántos: «-${mult}${ending}» («di» = 2, «tri» = 3).`);
  }
  if (ring) {
    text.push('El nitrógeno no forma parte del [[anillo]]: el anillo solo tiene carbonos. El carbono unido al nitrógeno sí es del anillo.');
  } else {
    text.push(result.structure.parent.length === 1
      ? 'El nitrógeno no forma parte de la cadena: la cadena solo tiene carbonos. Aquí la cadena es un solo carbono, el unido al nitrógeno.'
      : 'El nitrógeno no forma parte de la cadena: la cadena solo tiene carbonos. El carbono unido al nitrógeno sí es de la cadena, y su número es el del sufijo.');
  }
  if (sites.length > 0) {
    const where = ring ? 'en el anillo' : 'en la cadena principal';
    text.push(sites.length === 1
      ? `El otro grupo de carbonos unido al nitrógeno no está ${where}: es un [[sustituyente]] y se nombra delante, como las ramas, pero con la letra «N» en vez de un número (como en «N-metiletanamina»). La N dice que el grupo va unido al nitrógeno, no a un carbono.`
      : `Los otros ${sites.length} grupos de carbonos unidos al nitrógeno no están ${where}: son [[sustituyentes|sustituyente]] y se nombran delante, como las ramas, pero con la letra «N» en vez de un número (como en «N,N-dimetilmetanamina»). La N dice que el grupo va unido al nitrógeno, no a un carbono.`);
  }
  if (branch > 0) {
    text.push(branch === 1
      ? 'Un grupo amino queda en una rama, fuera de la cadena principal: ese no va en el sufijo, sino con el [[prefijo]] «amino-» delante del nombre.'
      : `${branch} grupos amino quedan en ramas, fuera de la cadena principal: esos no van en el sufijo, sino con el [[prefijo]] «amino-» delante del nombre.`);
  }
  if (benzene) {
    const traditional = (result.alternatives || []).find((a) => a.style === 'traditional');
    const aniline = lexiconEs.traditionalName('aniline');
    const here = traditional && traditional.name !== aniline ? ` (aquí, ${q(traditional.name)})` : '';
    const kept = traditional ? ` La IUPAC (2013) conserva también el nombre tradicional ${q(aniline)} y lo prefiere${here}: lo verás en «Otras formas válidas».` : '';
    text.push(`Un benceno con un grupo amino se nombra con el nombre del anillo sin su «o» final más «-${ending}»: «${lexiconEs.benzeneName.slice(0, -1)}${ending}».${kept}`);
  }
  if (halogensIn(result).length > 0) {
    text.push('Los halógenos nunca son el grupo principal: van delante, como [[prefijos|prefijo]].');
  }
  return {
    id: 'group',
    title: STEP_TITLES.group,
    text,
    highlight: [suffixSpec(result), ...sites.map(({ site }) => ({ atoms: [...site.atoms], bonds: [site.bond, ...site.bonds], style: 'substituent' })),
      ...aminoPrefixSpecs(result)],
    locants: null,
  };
} // End of function amineGroupStep()

/**
 * Step "Reconoce el grupo funcional" for an amide (design.md §13.4 I-37):
 * the –CONH₂ group (a carbon with an O on a double bond and a nitrogen; one
 * group: its C=O is not a ketone, its N not an amine), its carbon always a
 * chain end counted in the chain (carbon 1), the suffix `-amida`
 * (`-diamida`), the groups on the N cited as prefixes with the locant `N`
 * (the N never in the chain), the seniority ácido > éster > amida >
 * aldehído > cetona > alcohol > amina when other groups are present (they
 * become `oxo-`, `hidroxi-`, `amino-` prefixes), the traditional
 * `formamida` / `acetamida`, and halogens as prefixes. The group is
 * highlighted whole (carbon, O and N), the groups on the N as substituents.
 *
 * @param {object} result - A naming result whose suffix is an amide.
 * @returns {object} The step.
 */
function amideGroupStep(result) {
  const { suffix, parent } = result.structure;
  const n = suffix.locants.length;
  const ending = lexiconEs.groupSuffix('amide');
  const sites = nitrogenSites(result);
  const text = [];
  if (n === 1) {
    const what = {
      0: 'un grupo –CONH₂: un carbono con un oxígeno unido por un [[enlace doble]] y un nitrógeno con dos hidrógenos',
      1: 'un grupo –CONH–: un carbono con un oxígeno unido por un [[enlace doble]] y un nitrógeno que lleva además un grupo de carbonos y un hidrógeno',
      2: 'un grupo –CON–: un carbono con un oxígeno unido por un [[enlace doble]] y un nitrógeno que lleva además dos grupos de carbonos, sin hidrógenos',
    }[sites.length];
    text.push(`Tu molécula tiene ${what}. Es un [[grupo funcional]]: la molécula es una amida.`);
  } else {
    text.push(`Tu molécula tiene ${n} grupos –CONH₂ (cada uno, un carbono con un oxígeno unido por un [[enlace doble]] y un nitrógeno). Son [[grupos funcionales|grupo funcional]]: la molécula es una amida con ${n} grupos amida.`);
  }
  text.push('El C=O y el nitrógeno forman un solo grupo: el C=O de una amida no es una cetona, ni su nitrógeno una [[amina]].');
  if (parent.length === 1) {
    text.push('Aquí el carbono de la amida es el único carbono de la [[cadena principal]].');
  } else {
    text.push(n === 1
      ? 'El carbono de la amida solo puede unirse a un carbono más, así que siempre está en un extremo de la cadena. Ese carbono es un carbono más de la cadena: se cuenta al buscarla y al numerarla, y siempre es el carbono 1.'
      : 'El carbono de cada amida solo puede unirse a un carbono más, así que siempre está en un extremo de la cadena. Esos carbonos son carbonos de la cadena: se cuentan al buscarla y al numerarla.');
  }
  text.push(`El grupo amida es el [[grupo principal]]: se nombra con el [[sufijo]] «-${ending}», al final del nombre (como en «etanamida»).`);
  if (n > 1) {
    const { multiplier: mult } = suffixWords(suffix, lexiconEs);
    text.push(`Aquí hay ${n} grupos amida, uno en cada extremo de la cadena principal, así que el sufijo dice cuántos: «-${mult}${ending}» («di» = 2).`);
  }
  if (sites.length > 0) {
    text.push(sites.length === 1
      ? 'El grupo de carbonos unido al nitrógeno no está en la cadena principal (la cadena no puede atravesar el nitrógeno): es un [[sustituyente]] y se nombra delante, como las ramas, pero con la letra «N» en vez de un número (como en «N-metiletanamida»). La N dice que el grupo va unido al nitrógeno, no a un carbono.'
      : 'Los 2 grupos de carbonos unidos al nitrógeno no están en la cadena principal (la cadena no puede atravesar el nitrógeno): son [[sustituyentes|sustituyente]] y se nombran delante, como las ramas, pero con la letra «N» en vez de un número (como en «N,N-dimetiletanamida»). La N dice que el grupo va unido al nitrógeno, no a un carbono.');
  }
  const { aldehyde, ketone, branchCo, oh } = acidCompanions(result);
  const otherCo = ketone + branchCo;
  const others = [];
  if (aldehyde > 0) {
    others.push('un grupo –CHO en el otro extremo (un aldehído)');
  }
  if (ketone > 0) {
    others.push(ketone === 1 ? 'un grupo C=O entre dos carbonos (una cetona)' : `${ketone} grupos C=O entre dos carbonos (cetonas)`);
  }
  if (branchCo > 0) {
    others.push(branchCo === 1 ? 'un grupo C=O en una rama' : `${branchCo} grupos C=O en ramas`);
  }
  if (oh > 0) {
    others.push(oh === 1 ? 'un grupo –OH (un alcohol)' : `${oh} grupos –OH (alcohol)`);
  }
  const amines = aminoPrefixCount(result);
  if (amines > 0) {
    others.push(aminoWords(amines));
  }
  if (others.length > 0) {
    text.push(`También tiene ${joinY(others)}. Cuando hay grupos distintos, solo uno es el [[grupo principal]], y se elige con este orden de la IUPAC (2013): ácido > éster > amida > aldehído > cetona > alcohol > amina.`);
    const how = [];
    if (aldehyde + otherCo > 0) {
      how.push(aldehyde > 0
        ? 'cada C=O que no es de la amida se nombra con el [[prefijo]] «oxo-» (también el del –CHO, porque su carbono ya está en la cadena)'
        : 'cada C=O que no es de la amida se nombra con el [[prefijo]] «oxo-»');
    }
    if (oh > 0) {
      how.push(how.length > 0 ? 'cada –OH, con el [[prefijo]] «hidroxi-»' : 'cada –OH se nombra con el [[prefijo]] «hidroxi-»');
    }
    if (amines > 0) {
      how.push(how.length > 0 ? 'cada grupo amino, con el [[prefijo]] «amino-»' : 'cada grupo amino se nombra con el [[prefijo]] «amino-»');
    }
    text.push(`Aquí manda la amida, así que ${joinY(how)}, delante del nombre.`);
  } // End of the seniority sentences
  const traditional = (result.alternatives || []).find((a) => a.style === 'traditional');
  if (traditional) {
    text.push(`La IUPAC (2013) conserva también el nombre tradicional ${q(traditional.name)}: lo verás en «Otras formas válidas».`);
  }
  if (halogensIn(result).length > 0) {
    text.push('Los halógenos nunca son el grupo principal: van delante, como [[prefijos|prefijo]].');
  }
  return {
    id: 'group',
    title: STEP_TITLES.group,
    text,
    highlight: [suffixSpec(result), ...sites.map(({ site }) => ({ atoms: [...site.atoms], bonds: [site.bond, ...site.bonds], style: 'substituent' })),
      ...oxygenPrefixSpecs(result), ...aminoPrefixSpecs(result)],
    locants: null,
  };
} // End of function amideGroupStep()

/**
 * Step "Reconoce el grupo funcional" for a nitrile (design.md §13.4 I-38):
 * the –C≡N group (a carbon bonded to a nitrogen by a triple bond, never an
 * alkyne: the triple bond is not between two carbons, so it is no `-ino`),
 * its carbon always a chain end counted in the chain (carbon 1), the N
 * never in the chain, the suffix `-nitrilo` (`-dinitrilo`) after the whole
 * hydrocarbon name (its final «o» kept, the suffix starting with a
 * consonant), the seniority ácido > éster > amida > nitrilo > aldehído >
 * cetona > alcohol > amina when other groups are present (they become
 * `oxo-`, `hidroxi-`, `amino-` prefixes), the traditional `acetonitrilo`,
 * and halogens as prefixes. The group is highlighted whole (carbon and N).
 *
 * @param {object} result - A naming result whose suffix is a nitrile.
 * @returns {object} The step.
 */
function nitrileGroupStep(result) {
  const { suffix, parent } = result.structure;
  const n = suffix.locants.length;
  const ending = lexiconEs.groupSuffix('nitrile');
  const text = [];
  text.push(n === 1
    ? 'Tu molécula tiene un grupo –C≡N: un carbono unido a un nitrógeno por un [[enlace triple]]. Es un [[grupo funcional]]: la molécula es un nitrilo.'
    : `Tu molécula tiene ${n} grupos –C≡N (cada uno, un carbono unido a un nitrógeno por un [[enlace triple]]). Son [[grupos funcionales|grupo funcional]]: la molécula es un nitrilo con ${n} grupos –C≡N.`);
  text.push('Ese enlace triple no es el de un alquino: no une dos carbonos, sino un carbono y un nitrógeno. Por eso no se nombra con «-ino»: forma parte del grupo –C≡N.');
  if (parent.length === 1) {
    text.push('Aquí el carbono del –C≡N es el único carbono de la [[cadena principal]].');
  } else {
    text.push(n === 1
      ? 'El carbono del –C≡N solo puede unirse a un carbono más, así que siempre está en un extremo de la cadena. Ese carbono es un carbono más de la cadena: se cuenta al buscarla y al numerarla, y siempre es el carbono 1. El nitrógeno no forma parte de la cadena.'
      : 'El carbono de cada –C≡N solo puede unirse a un carbono más, así que siempre está en un extremo de la cadena. Esos carbonos son carbonos de la cadena: se cuentan al buscarla y al numerarla. Los nitrógenos no forman parte de la cadena.');
  }
  text.push(`El grupo –C≡N es el [[grupo principal]]: se nombra con el [[sufijo]] «-${ending}», al final del nombre (como en «etanonitrilo»).`);
  if (n > 1) {
    const { multiplier: mult } = suffixWords(suffix, lexiconEs);
    text.push(`Aquí hay ${n} grupos –C≡N, uno en cada extremo de la cadena principal, así que el sufijo dice cuántos: «-${mult}${ending}» («di» = 2).`);
  }
  const { aldehyde, ketone, branchCo, oh } = acidCompanions(result);
  const others = [];
  if (aldehyde > 0) {
    others.push('un grupo –CHO en el otro extremo (un aldehído)');
  }
  if (ketone > 0) {
    others.push(ketone === 1 ? 'un grupo C=O entre dos carbonos (una cetona)' : `${ketone} grupos C=O entre dos carbonos (cetonas)`);
  }
  if (branchCo > 0) {
    others.push(branchCo === 1 ? 'un grupo C=O en una rama' : `${branchCo} grupos C=O en ramas`);
  }
  if (oh > 0) {
    others.push(oh === 1 ? 'un grupo –OH (un alcohol)' : `${oh} grupos –OH (alcohol)`);
  }
  const amines = aminoPrefixCount(result);
  if (amines > 0) {
    others.push(aminoWords(amines));
  }
  if (others.length > 0) {
    text.push(`También tiene ${joinY(others)}. Cuando hay grupos distintos, solo uno es el [[grupo principal]], y se elige con este orden de la IUPAC (2013): ácido > éster > amida > nitrilo > aldehído > cetona > alcohol > amina.`);
    const how = [];
    if (aldehyde + ketone + branchCo > 0) {
      how.push(aldehyde > 0
        ? 'cada C=O se nombra con el [[prefijo]] «oxo-» (también el del –CHO, porque su carbono ya está en la cadena)'
        : 'cada C=O se nombra con el [[prefijo]] «oxo-»');
    }
    if (oh > 0) {
      how.push(how.length > 0 ? 'cada –OH, con el [[prefijo]] «hidroxi-»' : 'cada –OH se nombra con el [[prefijo]] «hidroxi-»');
    }
    if (amines > 0) {
      how.push(how.length > 0 ? 'cada grupo amino, con el [[prefijo]] «amino-»' : 'cada grupo amino se nombra con el [[prefijo]] «amino-»');
    }
    text.push(`Aquí manda el nitrilo, así que ${joinY(how)}, delante del nombre.`);
  } // End of the seniority sentences
  const traditional = (result.alternatives || []).find((a) => a.style === 'traditional');
  if (traditional) {
    text.push(`La IUPAC (2013) conserva también el nombre tradicional ${q(traditional.name)}: lo verás en «Otras formas válidas».`);
  }
  if (halogensIn(result).length > 0) {
    text.push('Los halógenos nunca son el grupo principal: van delante, como [[prefijos|prefijo]].');
  }
  return {
    id: 'group',
    title: STEP_TITLES.group,
    text,
    highlight: [suffixSpec(result), ...oxygenPrefixSpecs(result), ...aminoPrefixSpecs(result)],
    locants: null,
  };
} // End of function nitrileGroupStep()

/**
 * Step "Reconoce el grupo funcional" for an aldehyde or ketone (design.md
 * §13.4 I-32): the C=O group (–CHO at a chain end for an aldehyde, a C=O
 * between two carbons for a ketone), its carbon counted in the chain, the
 * suffix `-al` / `-ona` (`-dial`, `-diona`…), the seniority aldehído >
 * cetona > alcohol when other oxygen groups are present (they become the
 * prefixes `oxo-` and `hidroxi-`), a ketone left on a branch, and halogens
 * as prefixes. Each C=O is highlighted whole (carbon and oxygen).
 *
 * @param {object} result - A naming result whose suffix is an aldehyde or ketone.
 * @returns {object} The step.
 */
function carbonylGroupStep(result) {
  const { suffix, parentKind } = result.structure;
  const words = groupWords(result);
  const n = suffix.locants.length;
  const branch = principalInBranches(result);
  const total = n + branch;
  const ring = parentKind === 'ring';
  const where = ring ? 'el [[anillo]]' : 'la [[cadena principal]]';
  const ending = lexiconEs.groupSuffix(suffix.kind);
  const text = [];
  if (suffix.kind === 'aldehyde') {
    text.push(n === 1
      ? 'Tu molécula tiene un grupo –CHO: un carbono con un oxígeno unido por un [[enlace doble]] y un hidrógeno. Es un [[grupo funcional]]: la molécula es un aldehído.'
      : `Tu molécula tiene ${n} grupos –CHO (cada uno, un carbono con un oxígeno unido por un [[enlace doble]] y un hidrógeno). Son [[grupos funcionales|grupo funcional]]: la molécula es un aldehído.`);
    text.push(result.structure.parent.length === 1
      ? 'Aquí el carbono del –CHO es el único carbono de la molécula.'
      : 'El carbono del –CHO solo puede unirse a un carbono más, así que siempre está en un extremo de la cadena. Ese carbono es un carbono más de la cadena: se cuenta al buscarla y al numerarla.');
  } else {
    const on = ring ? 'a un carbono del [[anillo]]' : 'a un carbono que está entre otros dos carbonos';
    text.push(total === 1
      ? `Tu molécula tiene un grupo C=O: un oxígeno unido por un [[enlace doble]] ${on}. Es un [[grupo funcional]]: la molécula es una cetona.`
      : `Tu molécula tiene ${total} grupos C=O (cada uno, un oxígeno unido por un [[enlace doble]] ${on}). Son [[grupos funcionales|grupo funcional]]: la molécula es una cetona.`);
    text.push(`El carbono del C=O es un carbono más ${ring ? 'del anillo' : 'de la cadena'}: se cuenta al buscar${ring ? 'lo' : 'la'} y al numerar${ring ? 'lo' : 'la'}. El oxígeno no forma parte de ${ring ? 'él' : 'ella'}.`);
  } // End of the sentences on the principal group itself
  text.push(`${capitalise(words.the)} es el [[grupo principal]]: se nombra con el [[sufijo]] «-${ending}», al final del nombre (como en «${suffix.kind === 'aldehyde' ? 'etanal' : 'propanona'}»).`);
  if (n > 1) {
    const { multiplier: mult } = suffixWords(suffix, lexiconEs);
    const each = suffix.kind === 'aldehyde' ? ', uno en cada extremo de la cadena principal,' : ` en ${where},`;
    text.push(`Aquí hay ${n} ${words.many}${each} así que el sufijo dice cuántos: «-${mult}${ending}» («di» = 2, «tri» = 3).`);
  }
  if (branch > 0) {
    text.push(branch === 1
      ? 'Un C=O queda en una rama, fuera de la cadena principal: ese no va en el sufijo, sino con el [[prefijo]] «oxo-» delante del nombre.'
      : `${branch} grupos C=O quedan en ramas, fuera de la cadena principal: esos no van en el sufijo, sino con el [[prefijo]] «oxo-» delante del nombre.`);
  }
  const { oh } = oxygenGroups(result);
  const ketones = suffix.kind === 'aldehyde' ? prefixSum(result, oxoTotal) : 0;
  const others = [];
  if (ketones > 0) {
    others.push(ketones === 1 ? 'un grupo C=O entre dos carbonos (una cetona)' : `${ketones} grupos C=O entre dos carbonos (cetonas)`);
  }
  if (oh > 0) {
    others.push(oh === 1 ? 'un grupo –OH (un alcohol)' : `${oh} grupos –OH (alcohol)`);
  }
  const amines = aminoPrefixCount(result);
  if (amines > 0) {
    others.push(aminoWords(amines));
  }
  if (others.length > 0) {
    text.push(`También tiene ${joinY(others)}. Cuando hay grupos distintos, solo uno es el [[grupo principal]], y se elige con este orden de la IUPAC (2013): aldehído > cetona > alcohol${amines > 0 ? ' > amina' : ''}.`);
    const how = [];
    if (ketones > 0) {
      how.push('cada C=O de cetona se nombra con el [[prefijo]] «oxo-»');
    }
    if (oh > 0) {
      how.push(ketones > 0 ? 'cada –OH, con el [[prefijo]] «hidroxi-»' : 'cada –OH se nombra con el [[prefijo]] «hidroxi-»');
    }
    if (amines > 0) {
      how.push(how.length > 0 ? 'cada grupo amino, con el [[prefijo]] «amino-»' : 'cada grupo amino se nombra con el [[prefijo]] «amino-»');
    }
    text.push(`Aquí manda ${suffix.kind === 'aldehyde' ? 'el aldehído' : 'la cetona'}, así que ${joinY(how)}, delante del nombre.`);
  } // End of the seniority sentences
  if (halogensIn(result).length > 0) {
    text.push('Los halógenos nunca son el grupo principal: van delante, como [[prefijos|prefijo]].');
  }
  return {
    id: 'group',
    title: STEP_TITLES.group,
    text,
    highlight: [suffixSpec(result), ...oxygenPrefixSpecs(result), ...aminoPrefixSpecs(result)],
    locants: null,
  };
} // End of function carbonylGroupStep()

/**
 * The other oxygen groups of an acid, all cited as prefixes (design.md
 * §13.4 I-33): the –CHO at the other end of the parent chain (an `oxo`
 * prefix on its last carbon), the ketone C=O on the parent (`oxo` on an
 * inner carbon), the C=O inside branches (`oxo` there) and every OH
 * (`hidroxi`).
 *
 * @param {object} result - A naming result whose suffix is an acid.
 * @returns {{aldehyde: number, ketone: number, branchCo: number, oh: number}} The counts.
 */
function acidCompanions(result) {
  const { parent, prefixes } = result.structure;
  const sites = prefixes.filter((g) => g.substituent.oxo).flatMap((g) => g.locants);
  const aldehyde = sites.filter((site) => site.locant === parent.length).length;
  const ketone = sites.length - aldehyde;
  return { aldehyde, ketone, branchCo: prefixSum(result, oxoTotal) - sites.length, oh: prefixSum(result, hydroxyTotal) };
}

/**
 * The atoms and bonds of the two sides of the ether O of one alkoxy
 * occurrence (design.md §13.4 I-34): the O with its two bonds, and the
 * alkoxy side (its carbons and inner bonds, without the O and the O–C
 * bond). The other side is the parent side.
 *
 * @param {object} site - A PrefixLocant of an alkoxy prefix group (with `etherBond`).
 * @returns {{oxygen: {atoms: number[], bonds: number[]}, side: {atoms: number[], bonds: number[]}}} The ids.
 */
function etherParts(site) {
  return {
    oxygen: { atoms: [site.attachAtom], bonds: [site.bond, site.etherBond] },
    side: { atoms: site.atoms.filter((id) => id !== site.attachAtom), bonds: site.bonds.filter((id) => id !== site.etherBond) },
  };
}

/**
 * Highlight specs of one ether O and both its sides: the parent chain (or
 * ring) as the parent, the alkoxy side as a substituent, and the O with its
 * two C–O bonds apart.
 *
 * @param {object} result - The naming result.
 * @param {object} site - A PrefixLocant of an alkoxy prefix group.
 * @returns {{atoms: number[], bonds: number[], style: string}[]} The specs.
 */
function etherSpecs(result, site) {
  const { oxygen, side } = etherParts(site);
  return [parentSpec(result), { ...side, style: 'substituent' }, { ...oxygen, style: 'candidate' }];
}

/**
 * Explains, from the trace, why the parent is on its side of one ether O
 * and not on the other (design.md §13.4 I-34): the first rule after which
 * no candidate chain of the alkoxy side survives — P0 (the principal
 * groups), P1 (the length), P2/P3 (multiple bonds), a numbering rule or P4,
 * or the presentation tie-break (both sides alike: same name). A ring
 * parent is always senior to the chain on the other side (IUPAC 2013
 * P-44.1.2.2). Never re-derives chemistry: it only reads trace values.
 *
 * @param {object} result - The naming result.
 * @param {object} group - The alkoxy prefix group.
 * @param {object} site - One of its occurrences.
 * @returns {string} The sentence.
 */
function etherSideReason(result, group, site) {
  const prefix = q(substituentPrefix(group.substituent, lexiconEs));
  if (result.structure.parentKind === 'ring') {
    const ring = isBenzene(result) ? 'el [[benceno]]' : 'un [[anillo]]';
    return `Un lado del oxígeno es ${ring} y el otro, una cadena abierta: con las normas de la IUPAC (2013), el anillo manda siempre sobre la cadena abierta, así que el anillo es la [[cadena principal]] y el otro lado es el sustituyente ${prefix}.`;
  }
  const side = new Set(site.atoms);
  const inSide = (c) => c.atoms.some((id) => side.has(id));
  const words = groupWords(result);
  const length = result.parent.atoms.length;
  for (const step of result.trace) {
    const before = step.candidatesBefore.map((c, i) => ({ c, value: step.values[i] })).filter((e) => inSide(e.c));
    if (before.length === 0 || step.survivors.some(inSide)) {
      continue;
    }
    const best = (list) => Math.max(...list);
    const sideValue = best(before.map((e) => e.value));
    const winners = step.candidatesBefore.map((c, i) => ({ c, value: step.values[i] })).filter((e) => !inSide(e.c));
    if (step.rule === 'P0') {
      const own = best(winners.map((e) => e.value));
      const there = sideValue === 0 ? `no hay ningún ${words.group}` : `solo hay ${sideValue}`;
      return `Primero cuenta el [[grupo principal]]: el lado de la [[cadena principal]] lleva ${own === 1 ? words.one : `${own} ${words.many}`} y en el otro lado ${there}. Por eso la cadena principal está en este lado y el otro es el sustituyente ${prefix}.`;
    }
    if (step.rule === 'P1') {
      const tied = result.trace.some((t) => t.rule === 'P0') ? `Los dos lados llevan los mismos ${words.many}, así que decide la longitud. ` : '';
      return `${tied}En el lado de la [[cadena principal]] hay una cadena de ${count(length, 'carbono', 'carbonos')}; en el otro lado, la cadena más larga tiene ${count(sideValue, 'carbono', 'carbonos')}. Gana la más larga, y el otro lado es el sustituyente ${prefix}.`;
    }
    if (step.rule === 'P2' || step.rule === 'P3') {
      const what = step.rule === 'P2' ? 'más enlaces dobles o triples' : 'más enlaces dobles';
      return `Las cadenas de los dos lados son igual de largas (${count(length, 'carbono', 'carbonos')}): gana la que tiene ${what}. El otro lado es el sustituyente ${prefix}.`;
    }
    if (step.rule === 'TIE') {
      return `Los dos lados del oxígeno son iguales: da igual en cuál pongas la [[cadena principal]], el nombre sale igual. El otro lado es el sustituyente ${prefix}.`;
    }
    const why = step.rule === 'P4' ? 'la que tiene más [[sustituyentes|sustituyente]]' : 'la que da los números más bajos (mira el paso «Numera la cadena»)';
    return `Las cadenas de los dos lados empatan en longitud y en enlaces dobles o triples: gana ${why}. El otro lado es el sustituyente ${prefix}.`;
  } // End of the loop over the trace steps
  return `El otro lado es el sustituyente ${prefix}.`;
} // End of function etherSideReason()

/**
 * How an alkoxy prefix is formed (design.md §13.4 I-34; IUPAC 2013
 * P-63.2.2.2): the root of a short group + `oxi` (`met` + `oxi`), the
 * retained `isopropoxi` / `tert-butoxi`, or the group name + `oxi` for a
 * longer, unsaturated or not end-bonded group (`pentil` + `oxi`,
 * `propan-2-il` + `oxi`), with its parentheses.
 *
 * @param {object} sub - An alkoxy substituent structure.
 * @returns {string[]} Sentences.
 */
function alkoxyFormation(sub) {
  const prefix = substituentPrefix(sub, lexiconEs);
  const alkyl = substituentPrefix({ ...sub, alkoxy: false }, lexiconEs);
  const oxi = lexiconEs.alkoxyEnding;
  const n = substituentCarbons(sub);
  if (sub.retained === 'isopropyl') {
    return [`${q(prefix)} viene de «isopropil», un grupo de 3 carbonos unido al oxígeno por el carbono del centro: se cambia «-il» por «-${oxi}». También son correctos «propan-2-il${oxi}» (el preferido por la IUPAC) y «1-metilet${oxi}».`];
  }
  if (sub.retained === 'tert-butyl') {
    return [`${q(prefix)} viene de «tert-butil», un carbono unido al oxígeno y a tres metilos: se cambia «-il» por «-${oxi}». Su forma sistemática es «1,1-dimetilet${oxi}». «tert-» no cuenta para el orden alfabético.`];
  }
  if (isContractedAlkoxy(sub)) {
    const root = lexiconEs.stem(sub.chain.length);
    const short = `Con cadenas de 1 a ${MAX_CONTRACTED_ALKOXY} carbonos se usa esta forma corta (metoxi, etoxi, propoxi, butoxi), no ${q(`${alkyl}${oxi}`)}.`;
    if (sub.prefixes.length === 0) {
      return [`${q(prefix)} se forma con la raíz del grupo de ${count(n, 'carbono', 'carbonos')} unido al oxígeno, ${q(root)}, y la terminación «${oxi}», que es el oxígeno: ${root} + ${oxi} = ${prefix}. ${short}`];
    }
    return [`${q(prefix)} se forma como ${q(`${root}${oxi}`)} (${root} + ${oxi}: una cadena de ${count(sub.chain.length, 'carbono', 'carbonos')} unida al oxígeno, y «${oxi}», que es el oxígeno), con los sustituyentes de esa cadena delante. ${short}`];
  }
  const out = [`${q(prefix)} se forma con el nombre del grupo unido al oxígeno, ${q(alkyl)} (${count(n, 'carbono', 'carbonos')}), más «${oxi}», que es el oxígeno: ${alkyl} + ${oxi} = ${prefix}.`];
  out.push(`La forma corta (como «metoxi») solo se usa con grupos de 1 a ${MAX_CONTRACTED_ALKOXY} carbonos, sin enlaces dobles ni triples y unidos al oxígeno por su carbono 1.`);
  out.push('En el nombre va entre paréntesis, porque es un prefijo compuesto: un grupo más «oxi».');
  return out;
} // End of function alkoxyFormation()

/**
 * Step "Reconoce el éter" (design.md §13.4 I-34), for a name with at least
 * one ether oxygen (an alkoxy prefix, at any depth): the O between two
 * carbons, why it is never part of the chain nor a suffix, which side
 * holds the parent and why (etherSideReason()), and how each alkoxy prefix
 * is formed (alkoxyFormation()). Each ether O cited on the parent is
 * highlighted with both its sides (etherSpecs()); with several, one option
 * per O. Ether oxygens inside an ester's O-bound group (design.md §13.4
 * I-35: `etanoato de 2-metoxietilo`) are counted, explained and
 * highlighted too; the ester's middle O never counts as an ether.
 *
 * @param {object} result - The naming result.
 * @returns {object|null} The step, or null without ethers.
 */
function etherStep(result) {
  const alkyl = esterGroup(result);
  // The O-bound group carries `alkoxy` for the ester's middle O, which is not an ether: minus one.
  const inEster = alkyl ? etherTotal(alkyl) - 1 : 0;
  const total = prefixSum(result, etherTotal) + inEster;
  if (total === 0) {
    return null;
  }
  const groups = result.structure.prefixes.filter((g) => g.substituent.alkoxy);
  const sites = groups.flatMap((group) => group.locants.map((site) => ({ group, site })));
  const nested = total - sites.length - inEster;
  const text = [];
  const principal = Boolean(result.structure.suffix);
  if (total === 1) {
    text.push(principal
      ? 'Además, tu molécula tiene un oxígeno unido a dos carbonos (C–O–C): un éter.'
      : 'Tu molécula tiene un oxígeno unido a dos carbonos (C–O–C). Es un [[grupo funcional]]: la molécula es un éter.');
  } else {
    text.push(principal
      ? `Además, tu molécula tiene ${total} oxígenos unidos cada uno a dos carbonos (C–O–C): ${total} grupos éter.`
      : `Tu molécula tiene ${total} oxígenos unidos cada uno a dos carbonos (C–O–C): son ${total} grupos éter.`);
  }
  if (alkyl) {
    text.push('El oxígeno del medio del –COO– no cuenta: también está entre dos carbonos, pero es parte del éster.');
  }
  text.push('Un éter nunca es el [[grupo principal]] y nunca va al final del nombre: se nombra con un [[prefijo]] acabado en «-oxi» (grupo alcoxi), como «metoxi-» en «metoxietano».');
  text.push('La [[cadena principal]] no puede pasar por el oxígeno: el O corta la molécula en dos lados, cada uno con sus carbonos. La cadena principal se busca entre los carbonos de los dos lados, con las reglas de siempre; el otro lado, junto con el O, es un [[sustituyente]].');
  const options = [];
  for (const { group, site } of sites) {
    const reason = etherSideReason(result, group, site);
    const formation = alkoxyFormation(group.substituent);
    // Equal sentences (dimetoxi: the same reason and formation) are written once.
    for (const sentence of [reason, ...formation]) {
      if (!text.includes(sentence)) {
        text.push(sentence);
      }
    }
    options.push({
      label: `Oxígeno ${options.length + 1} de ${sites.length}`,
      text: [reason, ...formation].join(' '),
      highlight: etherSpecs(result, site),
      locants: null,
    });
  } // End of the loop over the ether oxygens on the parent
  if (nested > 0) {
    text.push(sites.length === 0
      ? `El éter está dentro de una rama: ${nested === 1 ? 'su oxígeno' : 'sus oxígenos'} no ${nested === 1 ? 'toca' : 'tocan'} la cadena principal. La rama se nombra como siempre y lleva el prefijo «-oxi» dentro de su nombre (como en «(metoximetil)»).`
      : `${nested === 1 ? 'Otro oxígeno entre dos carbonos está' : `Otros ${nested} oxígenos entre dos carbonos están`} dentro de un sustituyente: también se ${nested === 1 ? 'nombra' : 'nombran'} con «-oxi», dentro del nombre de ese sustituyente (como en «(2-metoxietoxi)»).`);
  }
  if (inEster > 0) {
    const name = esterAlkylName(alkyl, lexiconEs);
    text.push(inEster === 1
      ? `${sites.length + nested > 0 ? 'Otro' : 'El'} oxígeno entre dos carbonos está dentro del grupo unido al oxígeno del éster: se nombra con «-oxi» dentro del nombre de ese grupo, ${q(name)}.`
      : `${inEster} oxígenos entre dos carbonos están dentro del grupo unido al oxígeno del éster: se nombran con «-oxi» dentro del nombre de ese grupo, ${q(name)}.`);
  }
  const highlight = sites.length > 0
    ? sites.flatMap(({ site }, i) => (i === 0 ? etherSpecs(result, site) : etherSpecs(result, site).slice(1)))
    : [parentSpec(result), ...result.structure.prefixes.filter((g) => etherTotal(g.substituent) > 0).map((g) => ({ ...groupIds(g), style: 'substituent' }))];
  if (inEster > 0) {
    highlight.push(esterSpecs(result).alkyl);
  }
  const step = { id: 'ether', title: STEP_TITLES.ether, text, highlight, locants: null };
  if (sites.length > 1) {
    step.options = options;
  }
  return step;
} // End of function etherStep()

/**
 * Step "Reconoce el grupo funcional" for a carboxylic acid (design.md §13.4
 * I-33): the –COOH group (a carbon with an O on a double bond and an OH,
 * one group: its OH is not an alcohol, its C=O not a ketone), its carbon
 * always a chain end counted in the chain, the name `ácido …oico`
 * (`…dioico`), the seniority ácido > aldehído > cetona > alcohol when other
 * oxygen groups are present (they become the prefixes `oxo-` and
 * `hidroxi-`), and halogens as prefixes. Each –COOH is highlighted whole
 * (carbon and both oxygens).
 *
 * @param {object} result - A naming result whose suffix is an acid.
 * @returns {object} The step.
 */
function acidGroupStep(result) {
  const { suffix, parent } = result.structure;
  const n = suffix.locants.length;
  const ending = lexiconEs.groupSuffix('acid');
  const word = lexiconEs.suffixClassWord('acid');
  const text = [];
  text.push(n === 1
    ? 'Tu molécula tiene un grupo –COOH: un carbono con un oxígeno unido por un [[enlace doble]] y un grupo –OH, los dos en el mismo carbono. Es un [[grupo funcional]]: la molécula es un ácido carboxílico.'
    : `Tu molécula tiene ${n} grupos –COOH (cada uno, un carbono con un oxígeno unido por un [[enlace doble]] y un grupo –OH). Son [[grupos funcionales|grupo funcional]]: la molécula es un ácido carboxílico con ${n} grupos ácido.`);
  text.push('Los tres átomos forman un solo grupo: el –OH del –COOH no es un alcohol, ni su C=O una cetona.');
  if (parent.length === 1) {
    text.push('Aquí el carbono del –COOH es el único carbono de la molécula.');
  } else {
    text.push(n === 1
      ? 'El carbono del –COOH solo puede unirse a un carbono más, así que siempre está en un extremo de la cadena. Ese carbono es un carbono más de la cadena: se cuenta al buscarla y al numerarla, y siempre es el carbono 1.'
      : 'El carbono de cada –COOH solo puede unirse a un carbono más, así que siempre está en un extremo de la cadena. Esos carbonos son carbonos de la cadena: se cuentan al buscarla y al numerarla.');
  }
  text.push(`El grupo –COOH es el [[grupo principal]]: el nombre empieza por la palabra «${word}» y termina con el [[sufijo]] «-${ending}» (como en «${word} etanoico»).`);
  if (n > 1) {
    const { multiplier: mult } = suffixWords(suffix, lexiconEs);
    text.push(`Aquí hay ${n} grupos –COOH, uno en cada extremo de la cadena principal, así que el sufijo dice cuántos: «-${mult}${ending}» («di» = 2).`);
  }
  const { aldehyde, ketone, branchCo, oh } = acidCompanions(result);
  const otherCo = ketone + branchCo;
  const others = [];
  if (aldehyde > 0) {
    others.push('un grupo –CHO en el otro extremo (un aldehído)');
  }
  if (ketone > 0) {
    others.push(ketone === 1 ? 'un grupo C=O entre dos carbonos (una cetona)' : `${ketone} grupos C=O entre dos carbonos (cetonas)`);
  }
  if (branchCo > 0) {
    others.push(branchCo === 1 ? 'un grupo C=O en una rama' : `${branchCo} grupos C=O en ramas`);
  }
  if (oh > 0) {
    others.push(oh === 1 ? 'un grupo –OH (un alcohol)' : `${oh} grupos –OH (alcohol)`);
  }
  const amines = aminoPrefixCount(result);
  if (amines > 0) {
    others.push(aminoWords(amines));
  }
  if (others.length > 0) {
    text.push(`También tiene ${joinY(others)}. Cuando hay grupos distintos, solo uno es el [[grupo principal]], y se elige con este orden de la IUPAC (2013): ácido > aldehído > cetona > alcohol${amines > 0 ? ' > amina' : ''}.`);
    const how = [];
    if (aldehyde + otherCo > 0) {
      how.push(aldehyde > 0
        ? 'cada C=O que no es del ácido se nombra con el [[prefijo]] «oxo-» (también el del –CHO, porque su carbono ya está en la cadena)'
        : 'cada C=O que no es del ácido se nombra con el [[prefijo]] «oxo-»');
    }
    if (oh > 0) {
      how.push(aldehyde + otherCo > 0 ? 'cada –OH, con el [[prefijo]] «hidroxi-»' : 'cada –OH que no es del ácido se nombra con el [[prefijo]] «hidroxi-»');
    }
    if (amines > 0) {
      how.push(how.length > 0 ? 'cada grupo amino, con el [[prefijo]] «amino-»' : 'cada grupo amino se nombra con el [[prefijo]] «amino-»');
    }
    text.push(`Aquí manda el ácido, así que ${joinY(how)}, delante del nombre.`);
  } // End of the seniority sentences
  if (halogensIn(result).length > 0) {
    text.push('Los halógenos nunca son el grupo principal: van delante, como [[prefijos|prefijo]].');
  }
  return {
    id: 'group',
    title: STEP_TITLES.group,
    text,
    highlight: [suffixSpec(result), ...oxygenPrefixSpecs(result), ...aminoPrefixSpecs(result)],
    locants: null,
  };
} // End of function acidGroupStep()

/**
 * The halogen atoms of an ester's O-bound group, by element (empty for any
 * other result).
 *
 * @param {object} result - The naming result.
 * @returns {Object<string, number>} Element symbol → number of atoms.
 */
function esterGroupHalogens(result) {
  const alkyl = esterGroup(result);
  return alkyl ? substituentHalogens(alkyl) : {};
}

/**
 * Step "Reconoce el grupo funcional" for an ester (design.md §13.4 I-35):
 * the –COO– group (a carbon with an O on a double bond and a second O that
 * joins it to another group of carbons; one group: its C=O is not a ketone,
 * its middle O not an ether), its carbon always a chain end counted in the
 * chain (carbon 1), the two-word name `…oato de …ilo`, the seniority
 * ácido > éster > aldehído > cetona > alcohol when other oxygen groups are
 * present (on either part: they become `oxo-` / `hidroxi-` prefixes of
 * their own part), and halogens as prefixes. The –COO– is highlighted
 * whole (carbon and both oxygens).
 *
 * @param {object} result - An ester naming result.
 * @returns {object} The step.
 */
function esterGroupStep(result) {
  const { parent } = result.structure;
  const alkyl = esterGroup(result);
  const ending = lexiconEs.groupSuffix('ester');
  const text = [];
  text.push('Tu molécula tiene un grupo –COO–: un carbono con un oxígeno unido por un [[enlace doble]] y otro oxígeno que lo une a otro grupo de carbonos. Es un [[grupo funcional]]: la molécula es un éster.');
  text.push('Los tres átomos forman un solo grupo: el C=O del –COO– no es una cetona, ni su oxígeno del medio un éter.');
  text.push(parent.length === 1
    ? 'Aquí el carbono del C=O no tiene más carbonos a su lado: es la única cadena de su parte, de 1 carbono.'
    : 'El carbono del C=O solo puede unirse a un carbono más, así que siempre está en un extremo de la cadena. Ese carbono es un carbono más de la cadena: se cuenta al buscarla y al numerarla, y siempre es el carbono 1.');
  text.push(`El grupo –COO– es el [[grupo principal]]: el nombre tiene dos palabras unidas por «de». La primera termina con el [[sufijo]] «-${ending}» y la segunda es el nombre del grupo unido al otro oxígeno, acabado en «-ilo» (como en «etanoato de metilo»).`);
  const { aldehyde, ketone, branchCo } = acidCompanions(result);
  const otherCo = ketone + branchCo + oxoTotal(alkyl);
  const { oh } = oxygenGroups(result);
  const others = [];
  if (aldehyde > 0) {
    others.push('un grupo –CHO en el otro extremo (un aldehído)');
  }
  if (ketone > 0) {
    others.push(ketone === 1 ? 'un grupo C=O entre dos carbonos (una cetona)' : `${ketone} grupos C=O entre dos carbonos (cetonas)`);
  }
  if (otherCo - ketone > 0) {
    others.push(otherCo - ketone === 1 ? 'un grupo C=O en una rama' : `${otherCo - ketone} grupos C=O en ramas`);
  }
  if (oh > 0) {
    others.push(oh === 1 ? 'un grupo –OH (un alcohol)' : `${oh} grupos –OH (alcohol)`);
  }
  const amines = aminoPrefixCount(result);
  if (amines > 0) {
    others.push(aminoWords(amines));
  }
  if (others.length > 0) {
    text.push(`También tiene ${joinY(others)}. Cuando hay grupos distintos, solo uno es el [[grupo principal]], y se elige con este orden de la IUPAC (2013): ácido > éster > aldehído > cetona > alcohol${amines > 0 ? ' > amina' : ''}.`);
    const how = [];
    if (aldehyde + otherCo > 0) {
      how.push(aldehyde > 0
        ? 'cada C=O que no es del éster se nombra con el [[prefijo]] «oxo-» (también el del –CHO, porque su carbono ya está en la cadena)'
        : 'cada C=O que no es del éster se nombra con el [[prefijo]] «oxo-»');
    }
    if (oh > 0) {
      how.push(aldehyde + otherCo > 0 ? 'cada –OH, con el [[prefijo]] «hidroxi-»' : 'cada –OH se nombra con el [[prefijo]] «hidroxi-»');
    }
    if (amines > 0) {
      how.push(how.length > 0 ? 'cada grupo amino, con el [[prefijo]] «amino-»' : 'cada grupo amino se nombra con el [[prefijo]] «amino-»');
    }
    text.push(`Aquí manda el éster, así que ${joinY(how)}, delante del nombre de la parte en la que está.`);
  } // End of the seniority sentences
  if (halogensIn(result).length + Object.keys(esterGroupHalogens(result)).length > 0) {
    text.push('Los halógenos nunca son el grupo principal: van delante, como [[prefijos|prefijo]].');
  }
  const alkylAmino = alkyl && aminoTotal(alkyl) > 0 ? [esterSpecs(result).alkyl] : [];
  return {
    id: 'group',
    title: STEP_TITLES.group,
    text,
    highlight: [suffixSpec(result), ...oxygenPrefixSpecs(result), ...aminoPrefixSpecs(result), ...alkylAmino],
    locants: null,
  };
} // End of function esterGroupStep()

/**
 * How the O-bound group of an ester is named (design.md §13.4 I-35): the
 * retained `isopropilo` (with `propan-2-ilo` and `1-metiletilo`) and
 * `tert-butilo` (`1,1-dimetiletilo`), or, for a group with its own
 * branches, multiple bonds or a free valence not at its carbon 1, the
 * sentences of describeSubstituent() on that group seen from the O (never
 * enclosed: it is a word of its own, not a prefix).
 *
 * @param {object} alkyl - The group (structure.js EsterPart `alkyl`).
 * @returns {string[]} Sentences (none for a plain group such as `metilo`).
 */
function esterGroupFormation(alkyl) {
  const name = esterAlkylName(alkyl, lexiconEs);
  if (alkyl.retained === 'isopropyl') {
    return [`${q(name)} es un grupo de 3 carbonos unido al oxígeno por el carbono del centro. También son correctos «propan-2-ilo» (el preferido por la IUPAC) y «1-metiletilo».`];
  }
  if (alkyl.retained === 'tert-butyl') {
    return [`${q(name)} es un carbono unido al oxígeno y a tres metilos; su nombre sistemático es «1,1-dimetiletilo».`];
  }
  const group = { ...alkyl, alkoxy: false };
  const { chain } = group;
  if (group.retained || (group.prefixes.length === 0 && chain.double.length + chain.triple.length === 0 && group.freeValence.locant === 1)) {
    return [];
  }
  // The first sentence (`«x» es un grupo de n carbonos`) is said by esterStep(); a word of its own has no
  // parentheses, and its free valence is written `-ilo`.
  return describeSubstituent(group, OXYGEN_WORDS, 'ester').slice(1)
    .filter((sentence) => !sentence.startsWith('Va entre paréntesis'))
    .map((sentence) => sentence.replace(`«-${lexiconEs.freeValenceSuffix(1)}»`, `«-${lexiconEs.freeValenceSuffix(1)}${lexiconEs.esterAlkylEnding}»`));
} // End of function esterGroupFormation()

/**
 * Step "Separa las dos partes del éster" (design.md §13.4 I-35): the middle
 * O of the –COO– splits the molecule; the acid part (the chain with the C=O
 * carbon as carbon 1, named like its acid with `-oico` changed to `-oato`)
 * and the O-bound group (named like a branch, as a word of its own ending
 * in `-ilo`) are explained and highlighted apart, one option each; then
 * the Spanish order `… de …`.
 *
 * @param {object} result - The naming result.
 * @returns {object|null} The step, or null for a result that is not an ester.
 */
function esterStep(result) {
  if (!isEster(result)) {
    return null;
  }
  const { structure } = result;
  const { parent, ester } = structure;
  const specs = esterSpecs(result);
  const acidPart = renderName({ ...structure, ester: undefined }, lexiconEs).name;
  const acidName = renderName({ ...structure, ester: undefined, suffix: { ...structure.suffix, kind: 'acid' } }, lexiconEs).name;
  const alkylName = esterAlkylName(ester.alkyl, lexiconEs);
  const n = substituentCarbons(ester.alkyl);
  const text = ['El oxígeno del medio del –COO– está entre dos carbonos y separa la molécula en dos partes. Cada parte se nombra por separado, y el nombre del éster junta los dos nombres.'];
  const acid = parent.length === 1
    ? `La parte del ácido es el carbono del C=O, que aquí va solo (1 carbono, «${lexiconEs.stem(1)}»). Se nombra como el ácido del que viene, ${q(acidName)}, cambiando «-oico» por «-oato»: ${q(acidPart)}.`
    : `La parte del ácido es la [[cadena principal]], la que lleva el carbono del C=O. Ese carbono es el carbono 1 de la cadena y se cuenta con los demás: la cadena tiene ${count(parent.length, 'carbono', 'carbonos')}. Se nombra como el ácido del que viene, ${q(acidName)}, cambiando «-oico» por «-oato»: ${q(acidPart)}.`;
  const formation = esterGroupFormation(ester.alkyl);
  const alkyl = [`La otra parte es el grupo unido al otro lado del oxígeno, de ${count(n, 'carbono', 'carbonos')}. Se nombra como una rama, pero como palabra suelta y acabado en «-ilo» (metilo, etilo, propilo…): ${q(alkylName)}.`, ...formation];
  text.push(acid, ...alkyl);
  text.push('El oxígeno del medio no se nombra aparte: es parte del grupo –COO–, que ya dice «-oato». Tampoco es de ninguna cadena: la [[cadena principal]] no puede atravesarlo.');
  text.push(`En español se escribe primero la parte del ácido, luego «de» y al final el grupo: ${q(result.name)}.`);
  return {
    id: 'ester',
    title: STEP_TITLES.ester,
    text,
    highlight: [specs.acid, specs.alkyl, specs.bridge],
    locants: null,
    options: [
      { label: 'Parte del ácido', text: acid, highlight: [specs.acid], locants: null },
      { label: 'Grupo unido al oxígeno', text: alkyl.join(' '), highlight: [specs.alkyl, specs.bridge], locants: null },
    ],
  };
} // End of function esterStep()

/**
 * Counts the multiple bonds that stay outside the parent chain (in
 * substituents, or connecting a `-iliden` group), the groups holding them,
 * and, bond by bond (every occurrence of a repeated group on its own), how
 * many of them lie on some longest chain (a P1 survivor).
 *
 * @param {object} result - The naming result.
 * @returns {{double: number, triple: number, specs: object[], total: number, inLongest: number, oneChain: boolean, byGroups: number}}
 *   Counts, highlight specs of those groups, the number of outside bonds, how many lie on a longest chain,
 *   whether a single longest chain holds all of those, and how many of the others lie only on chains that
 *   P0 dropped for carrying fewer principal groups (so the principal group, not the length, left them out).
 */
function outsideUnsaturation(result) {
  let double = 0;
  let triple = 0;
  const specs = [];
  const bonds = [];
  /**
   * Adds the double and triple bonds inside a substituent (nested ones included).
   *
   * @param {object} sub - A substituent structure.
   * @returns {void}
   */
  const visit = (sub) => {
    if (!sub.chain && !sub.amino) {
      return; // A halogen, hydroxy or oxo prefix.
    }
    if (sub.chain) {
      double += sub.chain.double.length;
      triple += sub.chain.triple.length;
    }
    for (const group of sub.prefixes) {
      for (const site of group.locants) {
        double += site.order === 2 && !group.substituent.oxo ? 1 : 0;
        visit(group.substituent);
      }
    }
  };
  for (const group of result.structure.prefixes) {
    const before = double + triple;
    for (const site of group.locants) {
      // The C=O of an `oxo-` prefix is not a carbon–carbon unsaturation.
      const ylidene = site.order === 2 && !group.substituent.oxo;
      double += ylidene ? 1 : 0;
      if (ylidene) {
        bonds.push(site.bond);
      }
      bonds.push(...site.multipleBonds);
      visit(group.substituent);
    }
    if (double + triple > before) {
      specs.push({ ...groupIds(group), style: 'candidate' });
    }
  } // End of the loop over the prefix groups
  const p1 = result.trace.find((s) => s.rule === 'P1');
  const chains = (p1 ? p1.survivors : []).map((c) => new Set(c.bonds || []));
  const onLongest = bonds.filter((id) => chains.some((chain) => chain.has(id)));
  const oneChain = onLongest.length > 0 && chains.some((chain) => onLongest.every((id) => chain.has(id)));
  // A bond on no longest chain was left out by P0 (fewer principal groups) when every chain holding it lost at P0,
  // else by the length (P1): IUPAC 2013 P-44.1.1 puts the principal groups before the length.
  const p0 = result.trace.find((s) => s.rule === 'P0');
  const keptByP0 = (p0 ? p0.survivors : []).map((c) => new Set(c.bonds || []));
  const lostAtP0 = p0 ? p0.candidatesBefore.filter((c) => !p0.survivors.some((kept) => kept.key === c.key))
    .map((c) => new Set(c.bonds || [])) : [];
  const byGroups = bonds.filter((id) => !onLongest.includes(id) && !keptByP0.some((chain) => chain.has(id))
    && lostAtP0.some((chain) => chain.has(id))).length;
  return { double, triple, specs, total: bonds.length, inLongest: onLongest.length, oneChain, byGroups };
} // End of function outsideUnsaturation()

/**
 * The explicit sentence of design.md §5 when an unsaturation stays outside
 * the parent chain (IUPAC 2013: length first). Each outside bond is either
 * on another longest chain (that chain lost a tie-break) or on none (length).
 *
 * @param {{double: number, triple: number, total: number, inLongest: number, oneChain: boolean, byGroups: number}} outside - Result of outsideUnsaturation().
 * @param {object} [words] - The principal group's words (groupWords()); needed when `byGroups` > 0.
 * @returns {string} The paragraph.
 */
function outsideSentence(outside, words = null) {
  const { double, triple, total, inLongest, byGroups = 0 } = outside;
  let what;
  if (double > 0 && triple > 0) {
    what = 'Los enlaces dobles y triples de las ramas no están';
  } else if (double > 0) {
    what = double === 1 ? 'El [[doble enlace|enlace doble]] no está' : `Los ${double} [[dobles enlaces|enlace doble]] de las ramas no están`;
  } else {
    what = triple === 1 ? 'El [[triple enlace|enlace triple]] no está' : `Los ${triple} [[triples enlaces|enlace triple]] de las ramas no están`;
  }
  if (inLongest === total && total > 0) {
    const lost = outside.oneChain
      ? `Hay otra cadena igual de larga que ${total === 1 ? 'lo' : 'los'} incluye, pero pierde en los desempates.`
      : 'Cada uno está en otra cadena igual de larga, pero esas cadenas pierden en los desempates.';
    return `${what} en la cadena principal. ${lost}`;
  }
  if (byGroups > 0 && words) {
    // Left out by the principal groups (P0), not by the length (design.md §13.4 I-38 review).
    const groups = `${what} en la cadena principal: ${byGroups === total ? (total === 1 ? 'la cadena que lo incluye' : 'las cadenas que los incluyen') : 'alguno está en una cadena que'} lleva${byGroups === total && total > 1 ? 'n' : ''} menos ${words.many}. Con las normas de la IUPAC (2013), la cadena principal tiene que llevar el mayor número posible de ${words.many}, aunque sea más corta o deje fuera una [[insaturación]].`;
    if (byGroups === total) {
      return groups;
    }
    const rest = total - byGroups;
    return `${groups} ${rest === 1 ? 'Otro queda fuera' : `Otros ${rest} quedan fuera`} por otra razón: entre las cadenas que llevan más ${words.many}, manda la longitud y luego los desempates.`;
  }
  const length = `${what} en la cadena principal: con las normas actuales de la IUPAC (2013) manda la longitud. Primero se busca la cadena más larga, aunque deje fuera una [[insaturación]].`;
  if (inLongest === 0) {
    return length;
  }
  const rest = total - inLongest;
  const lost = inLongest === 1
    ? 'Uno de ellos está en otra cadena igual de larga, que pierde en los desempates'
    : `${inLongest} de ellos están en cadenas igual de largas que pierden en los desempates`;
  const out = rest === 1
    ? 'el otro no está en ninguna cadena tan larga'
    : `los otros ${rest} no están en ninguna cadena tan larga`;
  return `${length} ${lost}; ${out}.`;
} // End of function outsideSentence()

/**
 * Sentences of "Busca la cadena principal" for an alcohol, aldehyde or
 * ketone (design.md §13.4 I-31, I-32), from the P0 and P1 trace steps: the
 * chain must carry the most principal groups (IUPAC 2013 P-44.1.1), and
 * only then is it the longest; a longer chain with fewer of them is shown
 * as an option.
 *
 * @param {object} result - The naming result.
 * @param {object} p0 - The P0 trace step.
 * @param {object} p1 - The P1 trace step.
 * @param {object} step - The step being built (its `text` and `options` are filled in).
 * @returns {void}
 */
function groupChainSentences(result, p0, p1, step) {
  const { text } = step;
  const words = groupWords(result);
  const length = result.parent.atoms.length;
  const most = Math.max(...p0.values);
  const oh = most === 1 ? words.the : `los ${most} ${words.many}`;
  const carry = result.structure.suffix.kind === 'alcohol' || isAmine(result) ? 'llevar unidos' : 'llevar';
  text.push(`La [[cadena principal]] tiene que ${carry} el mayor número posible de ${words.many}, porque ${words.art} es el [[grupo principal]]. Solo después se mira la longitud: entre las cadenas que llevan más ${words.many}, gana la más larga.`);
  if (isAmine(result)) {
    text.push('El carbono unido al nitrógeno es un carbono más de la cadena; el nitrógeno no: la cadena solo tiene carbonos y no puede atravesar el nitrógeno.');
  } else if (isCarbonyl(result)) {
    text.push('El carbono de cada C=O forma parte de la cadena: se cuenta como los demás carbonos. El oxígeno no forma parte de ella.');
  } else if (isAcid(result)) {
    text.push('El carbono de cada –COOH forma parte de la cadena, en un extremo: se cuenta como los demás carbonos. Sus dos oxígenos no forman parte de ella.');
  } else if (isEster(result)) {
    text.push('El carbono del –COO– forma parte de la cadena, en un extremo: se cuenta como los demás carbonos. Sus dos oxígenos no forman parte de ella, y la cadena no puede atravesar el oxígeno del medio: los carbonos del otro lado forman el grupo que se nombra aparte, con «-ilo».');
  } else if (isAmide(result)) {
    text.push(nitrogenSites(result).length > 0
      ? 'El carbono de la amida forma parte de la cadena, en un extremo: se cuenta como los demás carbonos. Su oxígeno y su nitrógeno no forman parte de ella, y la cadena no puede atravesar el nitrógeno: los grupos de carbonos unidos al nitrógeno se nombran aparte, con la letra «N».'
      : 'El carbono de cada grupo amida forma parte de la cadena, en un extremo: se cuenta como los demás carbonos. Su oxígeno y su nitrógeno no forman parte de ella.');
  } else if (isNitrile(result)) {
    text.push('El carbono de cada –C≡N forma parte de la cadena, en un extremo: se cuenta como los demás carbonos. Su nitrógeno no forma parte de ella.');
  }
  if (decided(p0)) {
    const lengths = p0.candidatesBefore.map((c) => c.atoms.length);
    const longest = Math.max(...lengths);
    if (longest > length) {
      text.push(`Hay una cadena más larga, de ${longest} carbonos, pero lleva menos ${words.many}: con las normas de la IUPAC (2013), el grupo principal manda antes que la longitud.`);
      const loser = p0.candidatesBefore[lengths.indexOf(longest)];
      step.options = [{
        label: `Más larga, con menos ${words.short}`,
        text: `Esta cadena tiene ${longest} carbonos, pero no lleva ${oh}. No puede ser la cadena principal.`,
        highlight: [candidateSpec(loser, 'candidate')],
        locants: null,
      }];
    } else {
      text.push(`Las cadenas que llevan menos ${words.many} quedan descartadas.`);
    }
  }
  const survivors = p1.survivors;
  const carbons = count(length, 'carbono', 'carbonos');
  if (p1.candidatesBefore.length === 1) {
    text.push(`Solo una cadena lleva ${oh}: tiene ${carbons}.`);
  } else if (length === 1) {
    // One-carbon sides of an amine N (N-metilmetanamina): the options are the sides (amineSideSentences()).
    text.push(`De las cadenas que llevan ${oh}, la más larga tiene 1 carbono: cada lado del nitrógeno tiene solo 1 carbono.`);
  } else if (survivors.length === 1) {
    text.push(`De las cadenas que llevan ${oh}, la más larga tiene ${carbons}. Solo hay una así.`);
  } else {
    text.push(`De las cadenas que llevan ${oh}, la más larga tiene ${carbons}. Hay ${survivors.length} cadenas de ${length}. Pulsa cada opción para verlas.`);
    step.options = [...(step.options || []), ...survivors.map((c, i) => ({
      label: `Opción ${i + 1} de ${survivors.length}`,
      text: `Una cadena de ${carbons} con ${oh}.`,
      highlight: [candidateSpec(c, 'candidate')],
      locants: null,
    }))];
  } // End of the longest-chain sentences
  if (principalInBranches(result) > 0) {
    text.push(`Ninguna cadena puede llevar todos los ${words.many}: el que queda en una rama se nombra con el [[prefijo]] «${words.prefix}-».`);
  }
  if (isAmine(result)) {
    amineSideSentences(result, step);
  }
} // End of function groupChainSentences()

/**
 * The atoms and bonds of one side of the nitrogen of a principal amine
 * (design.md §13.4 I-36): the N with its bonds to the parent carbon and to
 * the group, and the group cited with the locant `N`.
 *
 * @param {object} result - An amine naming result.
 * @param {object} site - A PrefixLocant with the locant `N`.
 * @returns {{atoms: number[], bonds: number[], style: string}[]} The specs: the parent, the group, the N.
 */
function nitrogenSideSpecs(result, site) {
  const own = result.structure.suffix.locants.find((s) => s.attachAtom === site.atom);
  return [
    parentSpec(result),
    { atoms: [...site.atoms], bonds: [...site.bonds], style: 'substituent' },
    { atoms: [site.atom], bonds: own ? [own.bond, site.bond] : [site.bond], style: 'candidate' },
  ];
}

/**
 * Explains, from the trace, why the parent is not on the side of one group
 * on the nitrogen of a principal amine (design.md §13.4 I-36): every side
 * carries the amine, so the first rule after which no candidate chain of
 * that side survives decides — P1 (the length), P2/P3 (multiple bonds), a
 * numbering rule, P4 (more substituents) or the presentation tie-break
 * (the sides alike: same name). Never re-derives chemistry.
 *
 * @param {object} result - An amine naming result.
 * @param {object} group - The prefix group on the nitrogen.
 * @param {object} site - Its occurrence on the nitrogen.
 * @returns {string} The sentence.
 */
function amineSideReason(result, group, site) {
  const prefix = q(substituentPrefix(group.substituent, lexiconEs));
  const after = `El otro lado es el sustituyente ${prefix}, que se escribe con la letra N delante.`;
  const side = new Set(site.atoms);
  const inSide = (c) => c.atoms.some((id) => side.has(id));
  const length = result.parent.atoms.length;
  for (const step of result.trace) {
    const before = step.candidatesBefore.map((c, i) => ({ c, value: step.values[i] })).filter((e) => inSide(e.c));
    if (before.length === 0 || step.survivors.some(inSide)) {
      continue;
    }
    if (step.rule === 'P0') {
      return `En ese lado hay cadenas que no llevan el grupo amino unido: pierden. ${after}`;
    }
    if (step.rule === 'P1') {
      const sideValue = Math.max(...before.map((e) => e.value));
      return `Decide la longitud: en el lado de la [[cadena principal]] hay una cadena de ${count(length, 'carbono', 'carbonos')}; en el otro, la más larga tiene ${count(sideValue, 'carbono', 'carbonos')}. ${after}`;
    }
    if (step.rule === 'P2' || step.rule === 'P3') {
      const what = step.rule === 'P2' ? 'más enlaces dobles o triples' : 'más enlaces dobles';
      return `Las cadenas de los lados del nitrógeno son igual de largas (${count(length, 'carbono', 'carbonos')}): gana la que tiene ${what}. ${after}`;
    }
    if (step.rule === 'P4') {
      return `Las cadenas de los lados del nitrógeno empatan en longitud: gana la que tiene más [[sustituyentes|sustituyente]] (cuentan también los grupos unidos al nitrógeno). ${after}`;
    }
    if (step.rule === 'TIE') {
      return `Los lados del nitrógeno son iguales: da igual cuál sea la [[cadena principal]], el nombre sale igual. ${after}`;
    }
    return `Las cadenas de los lados del nitrógeno empatan en longitud: gana la que da los números más bajos (mira el paso «Numera la cadena»). ${after}`;
  } // End of the loop over the trace steps
  return after;
} // End of function amineSideReason()

/**
 * The sentences and options of "Busca la cadena principal" on the sides of
 * the nitrogen of a principal amine with groups cited `N` (design.md §13.4
 * I-36): every side carries the amine, the chain cannot cross the N, and
 * why each other side lost (amineSideReason()), one option per group on
 * the N.
 *
 * @param {object} result - An amine naming result.
 * @param {object} step - The step being built (its `text` and `options` are filled in).
 * @returns {void}
 */
function amineSideSentences(result, step) {
  const sites = nitrogenSites(result);
  if (sites.length === 0) {
    return;
  }
  const { text } = step;
  text.push(`Aquí el nitrógeno está unido a ${sites.length + 1} grupos de carbonos: cada uno es un lado del nitrógeno. Todos llevan el grupo amino, porque todos están unidos al nitrógeno, así que cualquiera podría ser la [[cadena principal]]. Se elige con las reglas de siempre, y los otros lados son [[sustituyentes|sustituyente]] del nitrógeno.`);
  const options = [];
  sites.forEach(({ group, site }, i) => {
    const reason = amineSideReason(result, group, site);
    if (!text.includes(reason)) {
      text.push(reason);
    }
    options.push({
      label: `Grupo ${i + 1} de ${sites.length} en el nitrógeno`,
      text: reason,
      highlight: nitrogenSideSpecs(result, site),
      locants: null,
    });
  }); // End of the loop over the groups on the nitrogen
  step.options = [...(step.options || []), ...options];
} // End of function amineSideSentences()

/**
 * Step 2, "Busca la cadena más larga", from the P1 trace step; for an
 * alcohol, aldehyde or ketone (a P0 step in the trace) "Busca la cadena
 * principal", from P0 and P1 (groupChainSentences()).
 *
 * @param {object} result - The naming result.
 * @returns {object|null} The step, or null for a one-carbon parent.
 */
function chainStep(result) {
  const p0 = result.trace.find((s) => s.rule === 'P0');
  const p1 = result.trace.find((s) => s.rule === 'P1');
  const length = result.parent.atoms.length;
  // A one-carbon amine parent with groups on its N still has sides to choose from (N-metilmetanamina).
  if (!p1 || (length === 1 && !(p0 && isAmine(result) && nitrogenSites(result).length > 0))) {
    return null;
  }
  const text = [];
  const id = p0 ? 'groupChain' : 'chain';
  const step = { id, title: STEP_TITLES[id], text, highlight: [parentSpec(result)], locants: null };
  const all = p0 ? p0.candidatesBefore : p1.candidatesBefore;
  if (all.length === 1) {
    text.push(`Todos los carbonos forman una sola cadena, sin ramas. Esa es la [[cadena principal]]: tiene ${length} carbonos.`);
  } else if (p0) {
    groupChainSentences(result, p0, p1, step);
  } else {
    text.push('Busca la cadena de carbonos más larga: será la [[cadena principal]]. Puede ir en zigzag o doblarse; lo importante es que sea seguida.');
    const survivors = p1.survivors;
    if (survivors.length === 1) {
      text.push(`La cadena más larga tiene ${length} carbonos. Solo hay una así.`);
    } else {
      text.push(`La cadena más larga tiene ${length} carbonos. Hay ${survivors.length} cadenas de ${length}. Pulsa cada opción para verlas.`);
      step.options = survivors.map((c, i) => ({
        label: `Opción ${i + 1} de ${survivors.length}`,
        text: `Una cadena de ${length} carbonos.`,
        highlight: [candidateSpec(c, 'candidate')],
        locants: null,
      }));
    }
  } // End of the chain count sentences
  if (p0) {
    step.highlight.push(suffixSpec(result));
  }
  if (halogensIn(result).length > 0) {
    text.push('Los halógenos (flúor, cloro, bromo, yodo) nunca forman parte de la cadena: solo cuentan los carbonos. Van como [[sustituyentes|sustituyente]], con un [[prefijo]] delante del nombre.');
  }
  if (prefixSum(result, etherTotal) > 0) {
    text.push('La cadena no puede atravesar el oxígeno de un éter: solo cuentan las cadenas de carbonos seguidos, a un lado o al otro del O.');
  }
  if (prefixSum(result, aminoTotal) > 0) {
    text.push('El nitrógeno de un grupo amino no forma parte de la cadena: la cadena solo tiene carbonos seguidos y no puede atravesarlo.');
  }
  const outside = outsideUnsaturation(result);
  if (outside.double + outside.triple > 0) {
    text.push(outsideSentence(outside, result.structure.suffix ? groupWords(result) : null));
    step.options = step.options || [];
    step.options.push({
      label: 'Fuera de la cadena',
      text: 'Estas ramas tienen enlaces dobles o triples, pero no forman parte de la cadena principal.',
      highlight: [parentSpec(result), ...outside.specs],
      locants: null,
    });
  }
  return step;
} // End of function chainStep()

/**
 * Highlight specs of a ring parent: the ring atoms and bonds as the parent,
 * and its closure bond apart (the bond that closes the chain on itself).
 *
 * @param {object} result - A naming result with a ring parent.
 * @returns {{atoms: number[], bonds: number[], style: string}[]} The specs.
 */
function ringSpecs(result) {
  const { closure } = result.structure.parent;
  return [
    { atoms: [...result.parent.atoms], bonds: result.parent.bonds.filter((id) => id !== closure), style: 'parent' },
    { atoms: [], bonds: [closure], style: 'candidate' },
  ];
}

/**
 * Step 2 for a ring parent, "Busca el anillo": the chain that closes on
 * itself, its closure bond and the `ciclo-` prefix. With side chains it
 * also states the ring-vs-chain rule (IUPAC 2013 P-44.1.2.2, design.md
 * §13.5): the ring is the parent even when a side chain is longer, and the
 * side chains are substituents.
 *
 * @param {object} result - A naming result with a ring parent.
 * @returns {object} The step.
 */
function ringStep(result) {
  const { parent, prefixes } = result.structure;
  const n = parent.length;
  const open = `${lexiconEs.stem(n)}${lexiconEs.endings.saturated}`;
  const ring = `${lexiconEs.ringPrefix}${open}`;
  // Groups on the amine N and amino prefixes are not side chains of the ring (design.md §13.4 I-36).
  const branches = prefixes.filter((g) => !isAtomPrefix(g) && !g.substituent.amino && !onNitrogen(g));
  const outer = branches.length > 0 || prefixes.some((g) => substituentCarbons(g.substituent) > 0);
  const text = [
    `${outer ? `En tu molécula, ${n} de los carbonos` : `Los ${n} carbonos`} forman una cadena que se cierra sobre sí misma: el último carbono está unido al primero. Una cadena cerrada es un [[anillo]].`,
    'El enlace que cierra el anillo está marcado en otro color. Si lo quitaras, tendrías una cadena abierta.',
  ];
  if (prefixes.some((g) => g.substituent.halogen)) {
    text.push('Los átomos de halógeno unidos al anillo no forman parte de él: son [[sustituyentes|sustituyente]] y se nombran con un [[prefijo]] delante.');
  }
  if (isAmine(result)) {
    text.push(suffixCount(result.structure) === 1
      ? 'El grupo amino unido al anillo no forma parte de él (el nitrógeno nunca es del anillo ni de la cadena): es el [[grupo principal]] y da la terminación «-amina».'
      : 'Los grupos amino unidos al anillo no forman parte de él (el nitrógeno nunca es del anillo ni de la cadena): son el [[grupo principal]] y dan la terminación «-amina».');
    const onN = prefixes.filter(onNitrogen).reduce((sum, g) => sum + g.locants.length, 0);
    if (onN > 0) {
      text.push(onN === 1
        ? 'El grupo de carbonos unido al nitrógeno tampoco es del anillo. Con las normas de la IUPAC (2013), un anillo manda siempre sobre una cadena abierta: el anillo es la [[cadena principal]] y ese grupo es un [[sustituyente]] del nitrógeno, que se escribe con la letra «N».'
        : 'Los grupos de carbonos unidos al nitrógeno tampoco son del anillo. Con las normas de la IUPAC (2013), un anillo manda siempre sobre una cadena abierta: el anillo es la [[cadena principal]] y esos grupos son [[sustituyentes|sustituyente]] del nitrógeno, que se escriben con la letra «N».');
    }
  } else if (result.structure.suffix && isCarbonyl(result)) {
    text.push(suffixCount(result.structure) === 1
      ? 'El oxígeno unido al anillo con un [[enlace doble]] no forma parte de él, pero su carbono sí: el grupo C=O es el [[grupo principal]] y da la terminación «-ona».'
      : 'Los oxígenos unidos al anillo con [[enlaces dobles|enlace doble]] no forman parte de él, pero sus carbonos sí: los grupos C=O son el [[grupo principal]] y dan la terminación «-ona».');
  } else if (result.structure.suffix) {
    text.push(suffixCount(result.structure) === 1
      ? 'El grupo –OH unido al anillo no forma parte de él: es el [[grupo principal]] y da la terminación «-ol».'
      : 'Los grupos –OH unidos al anillo no forman parte de él: son el [[grupo principal]] y dan la terminación «-ol».');
  }
  const ringHydroxyls = prefixes.filter((g) => g.substituent.hydroxy).reduce((sum, g) => sum + g.locants.length, 0);
  if (ringHydroxyls > 0) {
    text.push(ringHydroxyls === 1
      ? 'El grupo –OH unido al anillo no es el [[grupo principal]] (la cetona va antes que el alcohol): se nombra con el [[prefijo]] «hidroxi-».'
      : 'Los grupos –OH unidos al anillo no son el [[grupo principal]] (la cetona va antes que el alcohol): se nombran con el [[prefijo]] «hidroxi-».');
  }
  const ringAmino = prefixes.filter((g) => g.substituent.amino).reduce((sum, g) => sum + g.locants.length, 0);
  if (ringAmino > 0 && result.structure.suffix) {
    const senior = familyWithArticle(result.structure.suffix.kind);
    text.push(ringAmino === 1
      ? `El grupo amino unido al anillo no es el [[grupo principal]] (${senior} va antes que la amina): se nombra con el [[prefijo]] «amino-».`
      : `Los grupos amino unidos al anillo no son el [[grupo principal]] (${senior} va antes que la amina): se nombran con el [[prefijo]] «amino-».`);
  }
  if (branches.length > 0) {
    text.push('Las ramas que salen del anillo son cadenas abiertas. Con las normas de la IUPAC (2013), un anillo manda siempre sobre una cadena abierta: el anillo es la [[cadena principal]] y las ramas son [[sustituyentes|sustituyente]].');
    const longest = Math.max(...branches.map((g) => substituentCarbons(g.substituent)));
    if (longest > n) {
      text.push(`Aquí una rama tiene ${longest} carbonos y el anillo solo ${n}, pero aun así manda el anillo. Antes se enseñaba que ganaba la cadena más larga; con las normas actuales ya no es así.`);
    }
    const outside = branches.some((g) => g.locants.some((site) => site.order === 2 || site.multipleBonds.length > 0));
    if (outside) {
      text.push('Aunque una rama tenga enlaces dobles o triples, el anillo sigue siendo la cadena principal.');
    }
  } // End of the ring-vs-chain sentences
  let naming = `Un anillo se nombra como la cadena abierta con los mismos carbonos, poniendo delante «${lexiconEs.ringPrefix}-»: ${q(open)} → ${q(ring)}.`;
  const highlight = [...ringSpecs(result), ...substituentSpecs(result)];
  if (result.structure.suffix) {
    highlight.push({ ...suffixSpec(result), style: 'substituent' });
  }
  if (parent.double.length + parent.triple.length > 0) {
    naming += ' Si el anillo tiene enlaces dobles o triples, la terminación cambia como en las cadenas: «-eno», «-ino».';
  }
  text.push(naming);
  return {
    id: 'ring',
    title: STEP_TITLES.ring,
    text,
    highlight,
    locants: null,
  };
} // End of function ringStep()

/**
 * Step for a benzene parent, "Reconoce el benceno" (design.md §13.4 I-28):
 * the hexagon with three alternating double bonds and its own name
 * `benceno`; the two Kekulé drawings (double bonds swapped) are the same
 * molecule, so they get the same name; with a side chain, the ring is the
 * parent (IUPAC 2013 P-44.1.2.2) and the old form with the ring as `fenil`
 * is not preferred; a single substituent needs no number. The ring and its
 * double bonds are highlighted apart.
 *
 * @param {object} result - A naming result with a benzene parent.
 * @returns {object} The step.
 */
function benzeneStep(result) {
  const { parent, prefixes } = result.structure;
  const doubles = parent.double.map((site) => site.bond);
  const halogen = prefixes.length > 0 && prefixes[0].substituent.halogen;
  const amine = isAmine(result);
  const phenol = Boolean(result.structure.suffix) && !amine;
  const text = [
    `${prefixes.length > 0 && !halogen ? 'En tu molécula, 6 de los carbonos' : 'Los 6 carbonos'} forman un [[anillo]] con forma de hexágono y tres [[enlaces dobles|enlace doble]] alternados: uno sí, uno no. Este anillo es el [[benceno]] y tiene nombre propio, ${q(lexiconEs.benzeneName)}. No se llama «ciclohexatrieno».`,
    'El benceno se puede dibujar de dos maneras: con los enlaces dobles en unos lados del hexágono o en los otros tres. Los dos dibujos son la misma molécula (se llaman estructuras de Kekulé): en realidad los electrones de esos enlaces dobles están repartidos por igual por todo el anillo. Por eso los dos dibujos tienen el mismo nombre.',
  ];
  if (amine) {
    const stem = lexiconEs.benzeneName.slice(0, -1);
    text.push(`El grupo amino unido al anillo es el [[grupo principal]]: el nombre acaba en «-amina». Se forma con el nombre del anillo sin su «o» final: ${stem} + amina = «${stem}amina».`);
    if (prefixes.length > 0) {
      text.push('Los grupos de carbonos unidos al nitrógeno no están en el anillo: van delante, con la letra «N» (como en «N-metil»). El anillo sigue teniendo un solo sustituyente, el grupo amino.');
    }
    text.push('Con un solo grupo en el anillo no hace falta numerar: todos los carbonos del benceno son iguales, así que el carbono unido al nitrógeno es siempre el 1 y el número no se escribe.');
  } else if (phenol) {
    text.push('El grupo –OH unido al anillo es el [[grupo principal]]. Un benceno con un –OH se llama «fenol»: es un nombre propio.');
    text.push('Con un solo –OH no hace falta numerar: todos los carbonos del benceno son iguales, así que el carbono del –OH es siempre el 1 y el número no se escribe.');
  } else if (prefixes.length > 0 && prefixes[0].substituent.alkoxy) {
    const prefix = substituentPrefix(prefixes[0].substituent, lexiconEs);
    text.push(`El oxígeno unido al anillo lleva al otro lado un grupo de carbonos: es un éter. El anillo manda sobre la cadena abierta, así que el nombre acaba en «benceno» y el éter va delante como [[prefijo]] (${q(`${prefix}-`)}).`);
    text.push('Con un solo sustituyente no hace falta numerar: todos los carbonos del benceno son iguales, así que el carbono que lleva el oxígeno es siempre el 1 y el número no se escribe.');
  } else if (halogen) {
    text.push(`El átomo de ${ELEMENT_NAMES_ES[halogen]} unido al anillo es un [[sustituyente]]: el nombre acaba en «benceno» y el halógeno va delante como [[prefijo]] («${lexiconEs.halogenPrefix(halogen)}-»).`);
    text.push('Con un solo sustituyente no hace falta numerar: todos los carbonos del benceno son iguales, así que el carbono que lleva el halógeno es siempre el 1 y el número no se escribe.');
  } else if (prefixes.length > 0) {
    text.push('La rama que sale del anillo es un [[sustituyente]]. Con las normas de la IUPAC (2013), el anillo manda siempre sobre una cadena abierta: el nombre acaba en «benceno» y la rama va delante.');
    const longest = Math.max(...prefixes.map((g) => substituentCarbons(g.substituent)));
    if (longest > parent.length) {
      text.push(`Aquí la rama tiene ${longest} carbonos y el anillo solo ${parent.length}, pero aun así manda el anillo.`);
    }
    text.push('Algunos libros antiguos lo hacen al revés: toman la cadena como principal y el anillo como grupo «fenilo» (por ejemplo, «feniletano» en vez de «etilbenceno»). Esa forma no es la preferida.');
    text.push('Con un solo sustituyente no hace falta numerar: todos los carbonos del benceno son iguales, así que el carbono de la rama es siempre el 1 y el número no se escribe.');
  } else {
    text.push('Sin ramas no hace falta numerar: el nombre no lleva números.');
  }
  return {
    id: 'benzene',
    title: STEP_TITLES.benzene,
    text,
    highlight: [
      { atoms: [...result.parent.atoms], bonds: result.parent.bonds.filter((id) => !doubles.includes(id)), style: 'parent' },
      { atoms: [], bonds: doubles, style: 'candidate' },
      ...substituentSpecs(result),
      ...(result.structure.suffix ? [{ ...suffixSpec(result), style: 'substituent' }] : []),
    ],
    locants: null,
  };
} // End of function benzeneStep()

/**
 * Step for a ring parent, "Numera el anillo": an unsubstituted, saturated
 * ring needs no numbers.
 *
 * @param {object} result - A naming result with a ring parent.
 * @returns {object} The step.
 */
function ringNumberingStep(result) {
  if (!isBareRing(result)) {
    return ringNumberingChoice(result);
  }
  return {
    id: 'ringNumbering',
    title: STEP_TITLES.ringNumbering,
    text: [
      'Aquí no hace falta numerar: el nombre no lleva números.',
      'En un anillo sin ramas y con todos los enlaces simples, todos los carbonos son iguales. Da igual por cuál empieces a contar y hacia qué lado sigas: no hay nada que [[localizar|localizador]].',
    ],
    highlight: [parentSpec(result)],
    locants: null,
  };
} // End of function ringNumberingStep()

/**
 * Note on the ring locant-omission rule (design.md §1.1, lexicon
 * ringOmitsLocants()), if it matters for this name.
 *
 * @param {object} result - A naming result with a ring parent.
 * @returns {string|null} The note.
 */
function ringOmissionNote(result) {
  const { parent, prefixes } = result.structure;
  const omission = ringOmission(result);
  const multiple = parent.double.length + parent.triple.length;
  const kind = parent.double.length > 0 ? 'doble' : 'triple';
  if (omission.parent) {
    return `En ${q(result.name)} no hace falta el número: el enlace ${kind} siempre queda entre los carbonos 1 y 2.`;
  }
  if (result.structure.suffix) {
    const words = groupWords(result);
    if (omission.prefixes) {
      return `Con un solo ${words.group} y nada más en el anillo, su carbono es siempre el 1, así que el número no se escribe: ${q(result.name)}.`;
    }
    return `El carbono del ${words.group} es el 1, y aquí ese 1 se escribe (${q(result.name)}): solo se quita cuando ${words.art} es lo único que hay en un anillo sin enlaces dobles ni triples, como en ${q(words.ringExample)}.`;
  }
  if (omission.prefixes && fullyHalogenated(parent, prefixes)) {
    return `Todos los hidrógenos del anillo se han cambiado por ${ELEMENT_NAMES_ES[prefixes[0].substituent.halogen]}, así que no hay que decir dónde está cada uno: ${q(result.name)} no lleva números.`;
  }
  if (omission.prefixes) {
    return `Con un solo sustituyente y sin enlaces dobles ni triples en el anillo, su carbono es siempre el 1, así que el número no se escribe: ${q(result.name)}.`;
  }
  if (multiple === 1 && prefixes.length > 0) {
    return `Aquí se escriben todos los números, también el 1 del enlace ${kind}, como en las cadenas («but-1-eno»). En algunos libros se quita ese 1.`;
  }
  return null;
} // End of function ringOmissionNote()

/**
 * Sentence for a ring numbering decided by a single option: where the 1
 * goes and why the other starts lose.
 *
 * @param {object} rule - The first deciding rule.
 * @param {number[]} value - The compared locants of the winning option.
 * @param {{double: object[], triple: object[]}} ring - The ring structure (which multiple bonds it has).
 * @param {object} [words] - The principal-group words (SUFFIX_GROUP_WORDS; default the alcohol ones).
 * @returns {string} The sentence.
 */
function singleRingOption(rule, value, ring, words = SUFFIX_GROUP_WORDS.alcohol) {
  let what = new Set(value).size === 1 ? 'por el carbono que tiene los sustituyentes' : 'por un carbono con sustituyente';
  if (value.length === 1) {
    what = 'por el carbono que tiene el sustituyente';
  }
  if (rule.rule === 'N1' || rule.rule === 'N2') {
    const kind = ring.triple.length === 0 ? 'doble' : (ring.double.length === 0 ? 'triple' : 'doble o triple');
    what = `por un carbono del enlace ${kind} y sigue por ese enlace`;
  }
  if (rule.rule === 'N0') {
    what = value.length === 1 ? `por ${words.carbonThe}` : `por ${words.carbonA}`;
  }
  const numbers = value.length === 1 ? `sale el número ${locantText(value[0])}, el más bajo posible` : `salen los números ${listText(value)}, los más bajos posibles`;
  return `Empieza a contar ${what}: así ${numbers}. Empezando en cualquier otro sitio salen números más altos.`;
} // End of function singleRingOption()

/**
 * Orders ring numbering options by their compared values, rule by rule
 * (lowest first, so the winner is option A), so the labels never depend on
 * atom ids or drawing order.
 *
 * @param {{values: Array<Array|null>}} a - First group.
 * @param {{values: Array<Array|null>}} b - Second group.
 * @returns {number} Negative when `a` goes first.
 */
function compareGroupValues(a, b) {
  for (let i = 0; i < a.values.length; i += 1) {
    const x = a.values[i];
    const y = b.values[i];
    if (x === null || y === null) {
      if (x !== y) {
        return x === null ? 1 : -1;
      }
      continue;
    }
    for (let k = 0; k < Math.min(x.length, y.length); k += 1) {
      if (x[k] !== y[k]) {
        return x[k] - y[k];
      }
    }
    if (x.length !== y.length) {
      return x.length - y.length;
    }
  } // End of the loop over the deciding rules
  return 0;
} // End of function compareGroupValues()

/**
 * "Numera el anillo" for a substituted or unsaturated ring: a ring has no
 * ends, so every start atom and both directions are compared by the same
 * lowest-locant rules as a chain (IUPAC 2013 P-31.1.4: multiple bonds, then
 * double bonds, then all prefixes, then citation order). The options shown
 * are the numberings entering the first deciding rule that start with its
 * lowest first number (the others lose at once; for N4 all are shown),
 * merged when every rule gives them the same values and ordered by those
 * values.
 *
 * @param {object} result - A naming result with a substituted or unsaturated ring parent.
 * @returns {object} The step.
 */
function ringNumberingChoice(result) {
  const { parent, prefixes } = result.structure;
  const text = ['En un anillo no hay extremos: el carbono 1 puede ser cualquiera, y desde él puedes seguir contando hacia un lado o hacia el otro. Hay que elegir dónde empiezas y hacia qué lado sigues.'];
  const step = {
    id: 'ringNumbering',
    title: STEP_TITLES.ringNumbering,
    text,
    highlight: [parentSpec(result), ...substituentSpecs(result)],
    locants: parentLocants(result),
  };
  const multiple = parent.double.length + parent.triple.length > 0;
  const rules = [];
  if (result.structure.suffix) {
    rules.push(`${groupWords(result).the} (el [[grupo principal]]) lleva el número más bajo, así que su carbono es el 1`);
  }
  if (multiple) {
    rules.push('los [[enlaces dobles|enlace doble]] y [[triples|enlace triple]] del anillo llevan los [[localizadores|localizador]] más bajos (si empatan, los dobles)');
  }
  if (carbonLocantPrefixes(prefixes).length > 0) {
    rules.push('los [[sustituyentes|sustituyente]] llevan los números más bajos (si empatan, el que se escribe primero por orden alfabético)');
  }
  const ordered = rules.map((rule, i) => `${i === 0 ? 'primero' : 'después'}, ${rule}`);
  text.push(`Las reglas son las mismas que en una cadena, por orden: ${joinY(ordered)}.`);
  const deciding = result.trace.filter((s) => /^N[0-5]$/.test(s.rule) && decided(s));
  const tie = result.trace.some((s) => s.rule === 'TIE');
  if (deciding.length > 0) {
    const first = deciding[0];
    let shown = first.candidatesBefore;
    let lowest = null;
    if (first.rule !== 'N4' && first.rule !== 'N5') {
      lowest = Math.min(...first.values.map((v) => (v.length > 0 ? v[0] : Infinity)));
      shown = first.candidatesBefore.filter((_, i) => first.values[i].length > 0 && first.values[i][0] === lowest);
    }
    const groups = signatureGroups(deciding, shown).sort(compareGroupValues);
    if (groups.length === 1) {
      text.push(singleRingOption(first, groups[0].values[0], parent, groupWords(result)));
      if (tie) {
        text.push('Las formas de numerar que quedan dan el mismo nombre, así que da igual cuál elijas.');
      }
    } else {
      if (shown.length < first.candidatesBefore.length) {
        text.push(`Las numeraciones cuyo primer número no es ${locantText(lowest)} pierden enseguida. Estas son las que quedan para comparar:`);
      }
      const comparison = compareNumberings(deciding, groups, groupWords(result));
      text.push(...comparison.paragraphs);
      step.compare = comparison.compare;
      step.options = comparison.options;
      if (tie) {
        text.push('Las opciones que quedan dan el mismo nombre, así que da igual cuál elijas.');
      }
    } // End of the comparison of several options
  } else {
    const numbers = carbonLocantTexts(result);
    text.push(`Empieces por donde empieces, salen los mismos números${numbers.length > 0 ? `: ${numbers.join(', ')}` : ''}. Todas las formas dan el mismo nombre.`);
  } // End of the deciding-rules explanation
  const note = ringOmissionNote(result);
  if (note) {
    text.push(note);
  }
  const nitrogen = nitrogenNote(result);
  if (nitrogen) {
    text.push(nitrogen);
  }
  const closure = [...parent.double, ...parent.triple].find((site) => site.closing);
  if (closure) {
    text.push(`El enlace ${parent.double.includes(closure) ? 'doble' : 'triple'} queda entre el carbono ${closure.closing} y el 1, que cierran el anillo. Su número es el más bajo de los dos, 1, pero como los números no van seguidos se escribe también el otro entre paréntesis: ${q(siteLocantText(closure))}. Solo se acepta cuando los ${groupWords(result).many} obligan: al comparar numeraciones, este enlace cuenta como ${closure.closing}, el número más alto.`);
  }
  text.push('Mira los números en el dibujo.');
  return step;
} // End of function ringNumberingChoice()

/** How each count rule of the tie-break step is explained. */
const COUNT_RULES = Object.freeze({
  P2: {
    rule: 'Gana la cadena con más enlaces dobles y triples.',
    value: (n) => count(n, 'enlace doble o triple', 'enlaces dobles o triples'),
  },
  P3: {
    rule: 'Gana la cadena con más [[enlaces dobles|enlace doble]].',
    value: (n) => count(n, 'enlace doble', 'enlaces dobles'),
  },
  P4: {
    rule: 'Gana la cadena con más [[sustituyentes|sustituyente]] (más ramas).',
    value: (n) => count(n, 'sustituyente', 'sustituyentes'),
  },
});

/** P4 as explained when the molecule has halogens: they count as substituents too. */
const P4_WITH_HALOGENS = Object.freeze({
  ...COUNT_RULES.P4,
  rule: 'Gana la cadena con más [[sustituyentes|sustituyente]]: cuentan las ramas y también los halógenos.',
});

/**
 * Step 3, "Desempates": the chain-level rules P2, P3, P4 that removed a
 * chain, with the count of each option. Every chain keeps one label across
 * all the rules (its number among the longest chains, as in the chain step),
 * and each option button tells how far that chain got.
 *
 * @param {object} result - The naming result.
 * @returns {object|null} The step, or null when no such rule decided anything.
 */
function tiebreakStep(result) {
  const steps = result.trace.filter((s) => COUNT_RULES[s.rule] && decided(s));
  if (steps.length === 0) {
    return null;
  }
  const first = steps[0];
  const p1 = result.trace.find((s) => s.rule === 'P1');
  const order = (p1 ? p1.survivors : first.candidatesBefore).map(chainIdentity);
  const numberOf = new Map(order.map((id, i) => [id, i + 1]));
  /**
   * Stable option number of a chain (its place among the longest chains).
   *
   * @param {{atoms: number[]}} c - A trace candidate.
   * @returns {number} The option number.
   */
  const labelOf = (c) => numberOf.get(chainIdentity(c));
  const text = ['Varias cadenas son igual de largas. Hay que desempatar.'];
  const halogens = halogensIn(result).length > 0;
  const oxygenPrefixes = result.structure.prefixes.some((g) => g.substituent.hydroxy || g.substituent.oxo);
  steps.forEach((step, k) => {
    let rule = step.rule === 'P4' && halogens ? P4_WITH_HALOGENS : COUNT_RULES[step.rule];
    if (step.rule === 'P4' && oxygenPrefixes) {
      rule = { ...COUNT_RULES.P4, rule: `Gana la cadena con más [[sustituyentes|sustituyente]]: cuentan las ramas${halogens ? ', los halógenos' : ''} y también los grupos que van como [[prefijo]] («hidroxi-», «oxo-»).` };
    }
    if (step.rule === 'P4' && (isAmine(result) || (isAmide(result) && nitrogenSites(result).length > 0))) {
      rule = { ...COUNT_RULES.P4, rule: `Gana la cadena con más [[sustituyentes|sustituyente]]: cuentan las ramas${halogens ? ', los halógenos' : ''} y también los grupos unidos al nitrógeno.` };
    }
    const lines = step.candidatesBefore.map((c, i) => `opción ${labelOf(c)}: ${rule.value(step.values[i])}`);
    const sentence = k > 0 ? `Si sigue el empate, ${rule.rule[0].toLowerCase()}${rule.rule.slice(1)}` : rule.rule;
    text.push(`${sentence} ${lines.join('; ')}.`);
  });
  const parent = chainIdentity(result.parent);
  const options = first.candidatesBefore.map((c) => {
    const id = chainIdentity(c);
    const counts = [];
    let out = false;
    for (const step of steps) {
      const i = step.candidatesBefore.findIndex((d) => chainIdentity(d) === id);
      if (i < 0) {
        break;
      }
      counts.push(COUNT_RULES[step.rule].value(step.values[i]));
      if (!step.survivors.some((d) => chainIdentity(d) === id)) {
        out = true;
        break;
      }
    } // End of the loop that follows one chain through the rules
    const win = !out && id === parent;
    const verdict = out ? 'Queda descartada.' : (win ? 'Gana: es la cadena principal.' : 'Empata en estos desempates.');
    return {
      label: `Opción ${labelOf(c)} de ${order.length}`,
      text: `${counts.join('; ')}. ${verdict}`,
      highlight: [candidateSpec(c, win ? 'parent' : 'candidate')],
      locants: null,
    };
  }); // End of the options of the tie-break step
  text.push('Mira la cadena ganadora en el dibujo.');
  return { id: 'tiebreak', title: STEP_TITLES.tiebreak, text, highlight: [parentSpec(result)], locants: null, options };
} // End of function tiebreakStep()

/**
 * Index of the first term where the lists stop being all equal.
 *
 * @param {number[][]} lists - Locant lists.
 * @returns {number} The index, or -1 when all lists are equal.
 */
export function firstDifference(lists) {
  const n = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < n; i += 1) {
    if (new Set(lists.map((l) => (i < l.length ? l[i] : 'x'))).size > 1) {
      return i;
    }
  }
  return -1;
}

/**
 * Pairwise comparison of every losing list with the winning list: where
 * each loser first differs from the winner, and the positions to mark in
 * bold (the loser's own point of difference; for the winners, every such
 * point).
 *
 * @param {Array<number[]>} lists - Compared lists (N1–N4), one per candidate.
 * @param {boolean[]} wins - Whether each candidate survived.
 * @returns {{differences: Array<number|null>, marks: number[][]}} `differences[i]` is the
 *   first differing index of loser `i` against the winner (null for winners); `marks[i]` the indices to bold.
 */
export function pairwiseDifferences(lists, wins) {
  const best = lists[wins.indexOf(true)];
  const differences = lists.map((list, i) => (wins[i] ? null : firstDifference([best, list])));
  const points = [...new Set(differences.filter((k) => k !== null && k >= 0))].sort((x, y) => x - y);
  const marks = lists.map((list, i) => {
    if (wins[i]) {
      return points.filter((k) => k < list.length);
    }
    return differences[i] >= 0 && differences[i] < list.length ? [differences[i]] : [];
  });
  return { differences, marks };
} // End of function pairwiseDifferences()

/**
 * Explains one numbering rule that decided something, in words. Each losing
 * option is compared with the winner at its own first point of difference.
 *
 * @param {string} rule - Rule id (N0…N5).
 * @param {string[]} labels - Option label of each candidate.
 * @param {Array<number[]>} lists - Compared lists (N0–N4) of each candidate.
 * @param {boolean[]} wins - Whether each candidate survived.
 * @param {object} [words] - The principal-group words (SUFFIX_GROUP_WORDS; default the alcohol ones), for N0.
 * @returns {string} The paragraph.
 */
function numberingRuleText(rule, labels, lists, wins, words = SUFFIX_GROUP_WORDS.alcohol) {
  const intro = {
    N0: `Regla: los ${words.many} (el [[grupo principal]]) deben tener los [[localizadores|localizador]] más bajos. Esta regla va antes que la de los enlaces dobles y triples y que la de los sustituyentes.`,
    N1: 'Regla: los [[enlaces dobles|enlace doble]] y [[triples|enlace triple]] deben tener los [[localizadores|localizador]] más bajos.',
    N2: 'Regla: si hay empate, los [[enlaces dobles|enlace doble]] se quedan con los números más bajos.',
    N3: 'Regla: los [[sustituyentes|sustituyente]] deben tener los [[localizadores|localizador]] más bajos.',
    N4: 'Regla: si hay empate, el número más bajo es para el sustituyente que se escribe primero (por orden alfabético). Los números se leen en el orden en que se escriben los sustituyentes.',
    N5: 'Regla: si todo empata, gana el nombre que va antes por orden alfabético.',
  }[rule];
  const winners = labels.filter((_, i) => wins[i]);
  if (rule === 'N5') {
    return `${intro} Gana la opción ${joinY(winners)}.`;
  }
  const values = labels.map((label, i) => `opción ${label}: ${listText(lists[i])}`).join('; ');
  const best = lists[wins.indexOf(true)];
  const { differences } = pairwiseDifferences(lists, wins);
  // Losers that first differ from the winner at the same position share one clause.
  const clauses = [];
  labels.forEach((label, i) => {
    const k = differences[i];
    if (k === null || k < 0) {
      return;
    }
    let clause = clauses.find((c) => c.k === k);
    if (!clause) {
      clause = { k, losers: [], values: [] };
      clauses.push(clause);
    }
    clause.losers.push(label);
    if (lists[i][k] !== undefined && !clause.values.includes(lists[i][k])) {
      clause.values.push(lists[i][k]);
    }
  }); // End of the grouping of the losers into clauses
  /**
   * Why the winner beats the losers of one clause.
   *
   * @param {{k: number, values: number[]}} c - A clause.
   * @returns {string} The reason.
   */
  const reason = (c) => (best[c.k] === undefined ? 'la ganadora tiene menos números' : `${locantText(best[c.k])} es menor que ${joinY(c.values)}`);
  let why = '';
  if (clauses.length === 1) {
    why = best[clauses[0].k] === undefined
      ? ' La opción con menos números gana.'
      : ` Se comparan uno a uno: en el primer número distinto, ${reason(clauses[0])}.`;
  } else if (clauses.length > 1) {
    const parts = clauses.map((c) => `frente a ${c.losers.length === 1 ? 'la opción' : 'las opciones'} ${joinY(c.losers)}, ${reason(c)}`);
    why = ` Se comparan uno a uno, hasta el primer número distinto: ${parts.join('; ')}.`;
  }
  const verdict = winners.length === 1
    ? `Gana la opción ${winners[0]}.`
    : `Empatan las opciones ${joinY(winners)}: se pasa a la regla siguiente.`;
  return `${intro} Números: ${values}.${why} ${verdict}`;
} // End of function numberingRuleText()

/**
 * Note of the locant-omission table (design.md §1.1) for the parent, if any.
 *
 * @param {object} result - The naming result.
 * @returns {string|null} The note.
 */
function omissionNote(result) {
  const { parent, prefixes } = result.structure;
  const hasLocants = result.parts.some((p) => p.kind === 'locant');
  if (lexiconEs.omitsLocants(parent, prefixes.length > 0)) {
    const row = LOCANT_OMISSION.find((r) => r.length === parent.length
      && r.double.length === parent.double.length && r.triple.length === parent.triple.length);
    if (!row || parent.double.length + parent.triple.length === 0) {
      return null;
    }
    if (row.name === 'propadieno') {
      return 'En «propadieno» no hacen falta números: los dos enlaces dobles solo pueden estar en los carbonos 1 y 2.';
    }
    const kind = parent.double.length > 0 ? 'el doble enlace' : 'el triple enlace';
    return `En ${q(row.name)} no hace falta el número: ${kind} solo puede estar en el carbono 1.`;
  }
  if (hasLocants && parent.length <= 3 && halogensIn(result).length === 0 && !result.structure.suffix) {
    return 'Aunque aquí no hay otra posibilidad, el número se escribe. La IUPAC solo lo quita en unos pocos nombres, como «propeno» o «etino».';
  }
  return null;
} // End of function omissionNote()

/**
 * Note on the omitted prefix locants of a chain parent (lexicon
 * chainOmitsPrefixLocants(): a two-carbon chain with one substituent or one
 * OH, as in `etanol`, or a parent whose every hydrogen is replaced by one
 * halogen), if it applies.
 *
 * @param {object} result - The naming result (chain parent).
 * @returns {string|null} The note.
 */
function prefixOmissionNote(result) {
  const { parent, prefixes } = result.structure;
  if (!ringOmission(result).prefixes || parent.length === 1) {
    return null;
  }
  if (!result.structure.suffix && fullyHalogenated(parent, prefixes)) {
    const element = ELEMENT_NAMES_ES[prefixes[0].substituent.halogen];
    return `En ${q(result.name)} no hacen falta números: todos los hidrógenos se han cambiado por ${element}, así que no hay que decir dónde está cada uno.`;
  }
  const { suffix } = result.structure;
  if (suffix && TERMINAL_SUFFIXES.includes(suffix.kind) && carbonLocantPrefixes(prefixes).length === 0) {
    return null; // terminalGroupNote() explains it (groups on an amide N, locant `N`, are no carbon prefixes).
  }
  if (suffix && suffix.kind === 'ketone' && parent.length === 3) {
    const cited = (result.alternatives || []).find((a) => a.style === 'locants');
    const also = cited ? ` La IUPAC (2013) sí lo escribe en el nombre preferido, ${q(cited.name)}, que también es correcto.` : '';
    return `En ${q(result.name)} no hace falta el número: en una cadena de 3 carbonos, el C=O de una cetona solo puede estar en el carbono 2 (en el 1 sería un aldehído, el propanal).${also}`;
  }
  const what = suffix ? groupWords(result).the : 'el sustituyente';
  return `En ${q(result.name)} no hace falta el número: los dos carbonos son iguales, así que ${what} siempre puede quedar en el carbono 1.`;
} // End of function prefixOmissionNote()

/**
 * Compared value of a candidate in a rule step.
 *
 * @param {object} step - A trace step.
 * @param {string} key - Candidate key.
 * @returns {Array|null} The value, or null when the candidate did not enter the rule.
 */
function valueOf(step, key) {
  const i = step.candidatesBefore.findIndex((c) => c.key === key);
  return i < 0 ? null : step.values[i];
}

/**
 * Merges candidates that every deciding rule treats alike (same compared
 * values: symmetric numberings) into one displayed option, keeping the
 * first candidate of each group, in the given order.
 *
 * @param {object[]} deciding - The numbering rules that decided something.
 * @param {object[]} candidates - The candidates to show.
 * @returns {{signature: string, values: Array<Array|null>, candidate: object}[]} The option groups.
 */
function signatureGroups(deciding, candidates) {
  const groups = [];
  for (const candidate of candidates) {
    const values = deciding.map((s) => valueOf(s, candidate.key));
    const signature = JSON.stringify(values);
    if (!groups.some((g) => g.signature === signature)) {
      groups.push({ signature, values, candidate });
    }
  }
  return groups;
}

/**
 * Explains the deciding numbering rules over the displayed options: one
 * paragraph per rule (numberingRuleText()), the side-by-side comparison
 * table and one clickable option per group (labelled A, B…).
 *
 * @param {object[]} deciding - The numbering rules that decided something.
 * @param {{candidate: object}[]} groups - The option groups (signatureGroups()), in display order.
 * @param {object} [words] - The principal-group words (SUFFIX_GROUP_WORDS; default the alcohol ones), for N0.
 * @returns {{labels: string[], paragraphs: string[], compare: object, options: object[]}} The pieces of the step.
 */
function compareNumberings(deciding, groups, words = SUFFIX_GROUP_WORDS.alcohol) {
  const labels = groups.map((_, i) => optionLabel(i));
  const paragraphs = [];
  const rows = [];
  for (const rule of deciding) {
    const present = groups.map((g) => rule.candidatesBefore.some((c) => c.key === g.candidate.key));
    const idx = groups.map((_, i) => i).filter((i) => present[i]);
    const lists = idx.map((i) => valueOf(rule, groups[i].candidate.key));
    const wins = idx.map((i) => rule.survivors.some((c) => c.key === groups[i].candidate.key));
    paragraphs.push(numberingRuleText(rule.rule, idx.map((i) => labels[i]), lists, wins, words));
    if (rule.rule !== 'N5') {
      const { marks } = pairwiseDifferences(lists, wins);
      rows.push({
        rule: rule.rule,
        label: rule.rule === 'N0' ? words.label : RULE_LABELS[rule.rule],
        lists: groups.map((g, i) => (present[i] ? displayLocants(valueOf(rule, g.candidate.key)) : null)),
        firstDifference: firstDifference(lists),
        marks: groups.map((_, i) => (present[i] ? marks[idx.indexOf(i)] : null)),
        winners: idx.filter((_, j) => wins[j]),
      });
    }
  } // End of the loop over the deciding numbering rules
  const options = groups.map((g, i) => ({
    label: `Opción ${labels[i]}`,
    text: `Numeración ${labels[i]}: mira dónde queda el 1 en el dibujo.`,
    highlight: [candidateSpec(g.candidate, 'candidate')],
    locants: candidateLocants(g.candidate),
  }));
  return { labels, paragraphs, compare: { labels, rows }, options };
} // End of function compareNumberings()

/**
 * The sentence for an alcohol, aldehyde or ketone whose principal-group
 * numbering costs the multiple bonds their lowest locants (`prop-2-en-1-ol`,
 * not `prop-1-en-3-ol`; `but-3-enal`): when N0
 * decided and counting from the other end of the same chain would give the
 * double and triple bonds lower locants (IUPAC 2013 P-31.1.4.2.4: the
 * principal group comes first).
 *
 * @param {object} result - The naming result (chain parent).
 * @param {object[]} deciding - The numbering rules that decided something.
 * @returns {string|null} The sentence, or null when it does not apply.
 */
function suffixBeatsBonds(result, deciding) {
  const { parent, suffix } = result.structure;
  if (!suffix || deciding.length === 0 || deciding[0].rule !== 'N0') {
    return null;
  }
  const own = [...parent.double, ...parent.triple].map((site) => site.locant).sort((a, b) => a - b);
  if (own.length === 0) {
    return null;
  }
  // Counting from the other end, the bond between locants L and L + 1 gets n − L.
  const other = own.map((locant) => parent.length - locant).sort((a, b) => a - b);
  const k = own.findIndex((locant, i) => locant !== other[i]);
  if (k < 0 || other[k] > own[k]) {
    return null;
  }
  let kind = 'dobles y triples';
  if (parent.triple.length === 0) {
    kind = 'dobles';
  } else if (parent.double.length === 0) {
    kind = 'triples';
  }
  const lower = own.length === 1
    ? `el enlace ${kind.slice(0, -1)} tendría el número ${other[0]} en vez del ${own[0]}`
    : `los enlaces ${kind} tendrían números más bajos (${listText(other)} en vez de ${listText(own)})`;
  return `Fíjate: empezando por el otro extremo, ${lower}, pero manda ${groupWords(result).art}, porque es el [[grupo principal]].`;
} // End of function suffixBeatsBonds()

/**
 * Step 4, "Numera la cadena": the numbering rules N0–N5 that decided, side
 * by side, with the first point of difference, or one short line when the
 * name has no locants.
 *
 * @param {object} result - The naming result.
 * @returns {object|null} The step, or null for methane.
 */
function numberingStep(result) {
  if (result.parent.atoms.length === 1) {
    return null;
  }
  const text = [];
  const step = {
    id: 'numbering',
    title: STEP_TITLES.numbering,
    text,
    highlight: [parentSpec(result), ...substituentSpecs(result)],
    locants: parentLocants(result),
  };
  const note = omissionNote(result);
  const prefixNote = prefixOmissionNote(result);
  // The `N` of a group on an amine nitrogen is not a carbon number (design.md §13.4 I-36).
  const hasLocants = carbonLocantTexts(result).length > 0;
  const aldehyde = terminalGroupNote(result);
  const nitrogen = nitrogenNote(result);
  if (!hasLocants) {
    text.push('Aquí no hace falta numerar: el nombre no lleva números.');
    if (note) {
      text.push(note);
    }
    if (prefixNote) {
      text.push(prefixNote);
    }
    if (aldehyde) {
      text.push(aldehyde);
    }
    if (nitrogen) {
      text.push(nitrogen);
    }
    return step;
  }
  text.push('Numera los carbonos de la [[cadena principal]] de un extremo al otro. Hay que elegir por qué extremo empiezas a contar.');
  if (result.structure.suffix) {
    text.push(`Lo primero es el [[grupo principal]]: ${groupWords(result).carbonWith} tiene que llevar el número más bajo posible. Después se miran los enlaces dobles y triples, y luego los sustituyentes.`);
  }
  const deciding = result.trace.filter((s) => /^N[0-5]$/.test(s.rule) && decided(s));
  if (deciding.length > 0) {
    // Options: the candidates entering the first deciding rule, merged when
    // every deciding rule gives them the same values (symmetric numberings).
    const groups = signatureGroups(deciding, deciding[0].candidatesBefore);
    const comparison = compareNumberings(deciding, groups, groupWords(result));
    text.push(...comparison.paragraphs);
    if (new Set(groups.map((g) => chainIdentity(g.candidate))).size > 1) {
      text.push('Las opciones usan cadenas distintas del mismo tamaño: estas reglas también eligen la cadena principal.');
    }
    step.compare = comparison.compare;
    step.options = comparison.options;
  } else {
    const numbers = carbonLocantTexts(result);
    text.push(`Empieces por donde empieces, salen los mismos números: ${numbers.join(', ')}. Todas las formas dan el mismo nombre.`);
  } // End of the deciding-rules explanation
  if (deciding.length > 0 && result.trace.some((s) => s.rule === 'TIE')) {
    text.push('Las opciones que quedan dan el mismo nombre, así que da igual cuál elijas.');
  }
  const beaten = suffixBeatsBonds(result, deciding);
  if (beaten) {
    text.push(beaten);
  }
  if (note) {
    text.push(note);
  }
  if (prefixNote) {
    text.push(prefixNote);
  }
  if (aldehyde) {
    text.push(aldehyde);
  }
  if (nitrogen) {
    text.push(nitrogen);
  }
  text.push('Mira los números en el dibujo.');
  return step;
} // End of function numberingStep()

/**
 * The carbon locants written in a name, lowest first (the `N` of the groups
 * on an amine nitrogen left out, design.md §13.4 I-36).
 *
 * @param {object} result - The naming result.
 * @returns {string[]} The locant texts.
 */
function carbonLocantTexts(result) {
  return result.parts.filter((p) => p.kind === 'locant' && p.text !== locantText(N_LOCANT))
    .map((p) => p.text).sort((a, b) => parseFloat(a) - parseFloat(b));
}

/**
 * Note on the locant `N` of the groups on the nitrogen of a principal amine
 * (design.md §13.4 I-36): it is not a carbon number, so it does not depend
 * on the numbering; in the comparisons it goes before every number.
 *
 * @param {object} result - The naming result.
 * @returns {string|null} The note, or null without such groups.
 */
function nitrogenNote(result) {
  if (!hasNitrogenLocants(result.structure.prefixes)) {
    return null;
  }
  const deciding = result.trace.some((s) => (s.rule === 'N3' || s.rule === 'N4') && decided(s));
  const compared = deciding ? ' Al comparar, la N va antes que cualquier número.' : '';
  return `La «N» del nombre no es el número de un carbono: dice que el grupo va unido al nitrógeno. No cambia empieces por donde empieces a contar.${compared}`;
}

/**
 * Note on the uncited locant of an aldehyde, an acid, an ester, an amide or a nitrile on a chain
 * (design.md §13.4 I-32, I-33, I-35, I-37, I-38; IUPAC 2013 P-14.3.4.1): the –CHO, –COOH, –COO–, amide or –C≡N
 * carbon is always a chain end, so it is always carbon 1 (with two, the
 * first and the last) and its number is never written.
 *
 * @param {object} result - The naming result (chain parent).
 * @returns {string|null} The note, or null when the suffix is not an aldehyde, an acid or an ester.
 */
function terminalGroupNote(result) {
  const { suffix, parent } = result.structure;
  if (!suffix || !TERMINAL_SUFFIXES.includes(suffix.kind)) {
    return null;
  }
  const words = groupWords(result);
  if (suffix.locants.length === 1) {
    const never = `-1-${lexiconEs.groupSuffix(suffix.kind)}`;
    return `El carbono del ${words.group} siempre es el 1, así que su número no se escribe: ${q(result.name)}, nunca ${q(never)}.`;
  }
  return `Los dos ${words.many} están en los extremos, en los carbonos 1 y ${parent.length}. Siempre es así, de modo que sus números no se escriben: ${q(result.name)}.`;
} // End of function terminalGroupNote()

/**
 * Group name used when talking about a substituent (`metilo`,
 * `propan-2-ilo`, `isopropilo`; an alkoxy group keeps its prefix form:
 * `metoxi`).
 *
 * @param {object} sub - A substituent structure.
 * @returns {string} The standalone group name.
 */
function groupNameOf(sub) {
  // An alkoxy or amino group is called by its prefix (`grupo metoxi`, `grupo amino`, design.md §13.4 I-34, I-36).
  return sub.alkoxy || sub.amino ? substituentPrefix(sub, lexiconEs) : lexiconEs.groupName(substituentPrefix(sub, lexiconEs));
}

/**
 * The groups on the nitrogen of an `amino` prefix in words: `un grupo
 * metilo`, `2 grupos metilo`, `un grupo etilo y un grupo metilo` (design.md
 * §13.4 I-36).
 *
 * @param {object} sub - An amino substituent structure.
 * @returns {string} The words ('' for a plain `amino`).
 */
function aminoGroupsWords(sub) {
  return joinY(sub.prefixes.map((g) => (g.locants.length === 1
    ? `un grupo ${groupNameOf(g.substituent)}`
    : `${g.locants.length} grupos ${groupNameOf(g.substituent)}`)));
}

/**
 * Explains an `amino` prefix (design.md §13.4 I-36): an amine that is not
 * the principal group; with groups on its N, how the compound prefix is
 * formed (the groups without locants, the second one enclosed, then
 * `amino`) and why it is enclosed.
 *
 * @param {object} sub - An amino substituent structure.
 * @param {{to: string}} words - How the parent is named (parentWords()).
 * @param {string|null} principal - The principal group kind of the name, or null.
 * @returns {string[]} Sentences.
 */
function aminoDescription(sub, words, principal) {
  const prefix = substituentPrefix(sub, lexiconEs);
  const reason = principal && principal !== 'amine'
    ? ` No es el [[grupo principal]]: ${familyWithArticle(principal)} va antes que la amina.`
    : '';
  if (sub.prefixes.length === 0) {
    return [`${q(prefix)} es el [[prefijo]] de un grupo –NH₂ (un nitrógeno con dos hidrógenos, una [[amina]]) unido ${words.to}.${reason}`];
  }
  const out = [`${q(prefix)} es el [[prefijo]] de una [[amina]]: un nitrógeno unido ${words.to} que lleva además ${aminoGroupsWords(sub)}.${reason}`];
  out.push(`Se nombra como una amina pequeña: primero los grupos unidos al nitrógeno, sin números (todos van en el nitrógeno), y después «${lexiconEs.groupPrefix('amine')}», todo junto: ${q(prefix)}.`);
  if (sub.prefixes.length > 1) {
    out.push('Los grupos distintos van por orden alfabético, y cada uno después del primero va entre paréntesis.');
  }
  out.push(prefix.includes('(')
    ? 'En el nombre va entre corchetes [ ], porque es un prefijo compuesto (un grupo con sus propios sustituyentes) y ya lleva paréntesis dentro.'
    : 'En el nombre va entre paréntesis, porque es un prefijo compuesto: un grupo con sus propios sustituyentes.');
  return out;
} // End of function aminoDescription()

/**
 * Text of one prefix group as cited in the name, with its locants and
 * multiplier (`2,3-dimetil`, `5-(propan-2-il)`).
 *
 * @param {object} group - A prefix group.
 * @param {boolean} [omitLocants] - Leave out the locants (a ring with a single substituent).
 * @param {boolean} [crowded] - Other prefixes are written beside it without locants (render.js enclosedInName(): `(metoxi)`).
 * @returns {string} The cited text.
 */
function citedGroup(group, omitLocants = false, crowded = false) {
  return renderPrefixes([group], lexiconEs, omitLocants, crowded).map((p) => p.text).join('');
}

/**
 * Explains why a substituent prefix is written as it is: attachment,
 * unsaturation, own locants, nested prefixes (mini-explanation), enclosing
 * marks, retained and common names.
 *
 * @param {object} sub - A substituent structure.
 * @param {{to: string}} [words] - How the parent is named (parentWords(); default: the parent chain).
 * @param {string|null} [principal] - The principal group kind of the name (its suffix kind), or null.
 * @returns {string[]} Sentences.
 */
function describeSubstituent(sub, words = PARENT_WORDS.chain, principal = null) {
  const prefix = substituentPrefix(sub, lexiconEs);
  const out = [];
  if (sub.halogen) {
    return [`${q(prefix)} es el [[prefijo]] del ${ELEMENT_NAMES_ES[sub.halogen]} (${sub.halogen}), un halógeno unido ${words.to}.`];
  }
  if (sub.hydroxy) {
    // Only when a C=O, a –COOH, a –COO–, an amide or a –C≡N is the principal group can an OH be cited on the parent itself.
    if (principal === 'ester') {
      return [`${q(prefix)} es el [[prefijo]] de un grupo –OH (alcohol) unido ${words.to}. No es el [[grupo principal]]: el éster (–COO–) va antes que el alcohol.`];
    }
    if (principal === 'amide') {
      return [`${q(prefix)} es el [[prefijo]] de un grupo –OH (alcohol) unido ${words.to}. No es el [[grupo principal]]: la amida va antes que el alcohol.`];
    }
    if (principal === 'nitrile') {
      return [`${q(prefix)} es el [[prefijo]] de un grupo –OH (alcohol) unido ${words.to}. No es el [[grupo principal]]: el nitrilo (–C≡N) va antes que el alcohol.`];
    }
    return [principal === 'acid'
      ? `${q(prefix)} es el [[prefijo]] de un grupo –OH (alcohol) unido ${words.to}. No es el [[grupo principal]]: el ácido (–COOH) va antes que el alcohol.`
      : `${q(prefix)} es el [[prefijo]] de un grupo –OH (alcohol) unido ${words.to}. No es el [[grupo principal]]: el grupo C=O va antes que el –OH.`];
  }
  if (sub.oxo) {
    // Only when an aldehyde, an acid (or an ester, amide or nitrile) is principal can a C=O be cited on the parent itself.
    if (principal === 'ester' || principal === 'amide' || principal === 'nitrile') {
      const senior = { ester: 'el éster', amide: 'la amida', nitrile: 'el nitrilo' }[principal];
      return [`${q(prefix)} es el [[prefijo]] de un oxígeno unido con un [[enlace doble]] a un carbono ${words.of} (el C=O de un aldehído o de una cetona). No es el [[grupo principal]]: ${senior} va antes que el aldehído y la cetona.`];
    }
    return [principal === 'acid'
      ? `${q(prefix)} es el [[prefijo]] de un oxígeno unido con un [[enlace doble]] a un carbono ${words.of} (el C=O de un aldehído o de una cetona). No es el [[grupo principal]]: el ácido va antes que el aldehído y la cetona.`
      : `${q(prefix)} es el [[prefijo]] de un oxígeno unido con un [[enlace doble]] a un carbono ${words.of} (el C=O de una cetona). No es el [[grupo principal]]: el aldehído va antes que la cetona.`];
  }
  if (sub.alkoxy) {
    return alkoxyDescription(sub, words, principal);
  }
  if (sub.amino) {
    return aminoDescription(sub, words, principal);
  }
  if (sub.retained === 'isopropyl') {
    out.push('Es un grupo de 3 carbonos unido por el carbono del centro. Tiene tres nombres válidos:');
    out.push('«isopropil» es el nombre tradicional, que la IUPAC acepta (es el que usamos aquí);');
    out.push('«propan-2-il» es el preferido por la IUPAC: una cadena de 3 carbonos (prop) unida por su carbono 2;');
    out.push('«1-metiletil» toma una cadena de 2 carbonos (et) unida por su carbono 1, con un metil en ese mismo carbono.');
    return [out.join(' ')];
  }
  if (sub.retained === 'isopropylidene') {
    return ['Es un grupo de 3 carbonos unido por el carbono del centro con un [[enlace doble]]. Tiene tres nombres válidos: «isopropiliden» (el tradicional, que usamos aquí), «propan-2-iliden» (el preferido por la IUPAC: cadena de 3 carbonos unida por su carbono 2) y «1-metiletiliden» (cadena de 2 carbonos con un metil en el carbono 1).'];
  }
  if (sub.retained === 'phenyl') {
    return ['«fenil» es el nombre del [[benceno]] cuando va como sustituyente: un anillo de benceno al que le falta un hidrógeno (grupo fenilo, C₆H₅–).'];
  }
  if (sub.retained === 'tert-butyl') {
    return ['«tert-butil» es un nombre tradicional que la IUPAC acepta: un carbono unido a tres metilos. Su nombre sistemático es «1,1-dimetiletil».'];
  }
  const { chain, freeValence } = sub;
  const n = substituentCarbons(sub);
  out.push(`${q(prefix)} es un grupo de ${count(n, 'carbono', 'carbonos')}.`);
  if (freeValence.order === 2) {
    out.push(`Se une ${words.to} con un [[enlace doble]]: por eso termina en «-iliden».`);
  }
  if (chain.double.length > 0) {
    out.push(`Dentro del grupo hay ${chain.double.length === 1 ? 'un [[enlace doble]]' : `${chain.double.length} [[enlaces dobles|enlace doble]]`}: por eso lleva «en».`);
  }
  if (chain.triple.length > 0) {
    out.push(`Dentro del grupo hay ${chain.triple.length === 1 ? 'un [[enlace triple]]' : `${chain.triple.length} [[enlaces triples|enlace triple]]`}: por eso lleva «in».`);
  }
  if (sub.prefixes.length > 0) {
    const one = chain.length === 1;
    const inner = sub.prefixes.map((g) => {
      const places = [...new Set(g.locants.map((s) => s.locant))];
      const where = places.length === 1 ? `en el carbono ${places[0]}` : `en los carbonos ${joinY(places)}`;
      const what = q(substituentPrefix(g.substituent, lexiconEs));
      const many = g.substituent.halogen ? 'átomos' : 'grupos';
      const text = g.locants.length === 1 ? what : `${g.locants.length} ${many} ${what}`;
      return one ? text : `${text} ${where}`;
    });
    const allHalogens = sub.prefixes.every((g) => g.substituent.halogen);
    const amino = sub.prefixes.some((g) => g.substituent.amino);
    const hydroxy = sub.prefixes.some((g) => g.substituent.hydroxy);
    const oxo = sub.prefixes.some((g) => g.substituent.oxo);
    const atomsOnly = sub.prefixes.every(isAtomPrefix);
    let kind = allHalogens ? 'Es una rama con halógenos' : 'Es una rama con sus propias ramas';
    if (hydroxy && !oxo && atomsOnly) {
      kind = hydroxyTotal(sub) === 1 ? 'Es una rama con un grupo –OH' : 'Es una rama con grupos –OH';
    } else if (oxo && !hydroxy && atomsOnly) {
      kind = oxoTotal(sub) === 1 ? 'Es una rama con un grupo C=O' : 'Es una rama con grupos C=O';
    } else if (oxo && atomsOnly) {
      kind = 'Es una rama con grupos –OH y C=O';
    } else if (amino && sub.prefixes.every((g) => g.substituent.amino)) {
      kind = aminoTotal(sub) === 1 ? 'Es una rama con un grupo amino' : 'Es una rama con grupos amino';
    }
    if (one) {
      out.push(`${kind}. Se nombra como una molécula pequeña: su cadena tiene 1 carbono, así que no hace falta ningún número. En ella hay: ${joinY(inner)}.`);
    } else {
      out.push(`${kind}. Se nombra como una molécula pequeña: su cadena tiene ${count(chain.length, 'carbono', 'carbonos')} y se numera para que el carbono unido ${words.to} lleve el número más bajo posible. En ella hay: ${joinY(inner)}.`);
    }
    if (hydroxy) {
      out.push(principal === 'alcohol' || principal === null
        ? 'Un –OH que está en una rama, y no en la cadena principal, no va en el sufijo «-ol»: se nombra con el prefijo «hidroxi-».'
        : 'Un –OH que está en una rama se nombra con el prefijo «hidroxi-».');
    }
    if (oxo) {
      out.push(principal === 'ketone'
        ? 'Un C=O que está en una rama, y no en la cadena principal, no va en el sufijo «-ona»: se nombra con el prefijo «oxo-».'
        : 'Un C=O que está en una rama se nombra con el prefijo «oxo-».');
    }
    if (amino) {
      out.push(principal === 'amine'
        ? 'Un grupo amino que está en una rama, y no en la cadena principal, no va en el sufijo «-amina»: se nombra con el prefijo «amino-».'
        : 'Un grupo amino que está en una rama se nombra con el prefijo «amino-».');
    }
  } // End of the nested prefixes
  const unsaturated = chain.double.length + chain.triple.length > 0;
  if (freeValence.locant > 1 || (unsaturated && chain.length > 2)) {
    out.push(`El número ${freeValence.locant} que va justo antes de «-${lexiconEs.freeValenceSuffix(freeValence.order)}» dice por qué carbono del grupo se une ${words.to}.`);
  }
  if (needsEnclosure(sub)) {
    let own = 'números';
    if (sub.prefixes.length > 0) {
      own = chain.length === 1 ? 'sustituyentes' : 'sustituyentes y números';
    }
    out.push(`Va entre paréntesis porque tiene sus propios ${own}.`);
  }
  if (sub.commonName) {
    const common = lexiconEs.commonGroupName(sub.commonName);
    if (common) {
      out.push(`También se conoce como ${q(common)}, pero la IUPAC prefiere ${q(groupNameOf(sub))}.`);
    }
  }
  return out;
} // End of function describeSubstituent()

/**
 * Explains an alkoxy prefix (design.md §13.4 I-34): an ether, the O plus
 * the group on its other side, never the principal group; how the prefix is
 * formed (alkoxyFormation()); and, when the group on the other side of the
 * O has its own branches, multiple bonds or locants, the description of
 * that group as a branch of the O (describeSubstituent()).
 *
 * @param {object} sub - An alkoxy substituent structure.
 * @param {{to: string}} words - How the parent is named (parentWords()).
 * @param {string|null} principal - The principal group kind of the name, or null.
 * @returns {string[]} Sentences.
 */
function alkoxyDescription(sub, words, principal) {
  const prefix = substituentPrefix(sub, lexiconEs);
  const n = substituentCarbons(sub);
  const out = [`${q(prefix)} es el [[prefijo]] de un éter: un oxígeno unido ${words.to} y, al otro lado del oxígeno, un grupo de ${count(n, 'carbono', 'carbonos')}.`];
  out.push(...alkoxyFormation(sub));
  const alkyl = { ...sub, alkoxy: false };
  const { chain } = sub;
  if (!sub.retained && (sub.prefixes.length > 0 || chain.double.length + chain.triple.length > 0 || sub.freeValence.locant > 1)) {
    const inner = describeSubstituent(alkyl, OXYGEN_WORDS, principal).slice(1);
    out.push(`El grupo unido al oxígeno, ${q(substituentPrefix(alkyl, lexiconEs))}, se nombra como cualquier rama.`, ...inner);
  }
  return out;
} // End of function alkoxyDescription()

/**
 * Step 5, "Nombra los sustituyentes": each group highlighted, with its
 * name, locants, multiplier and a mini-explanation.
 *
 * @param {object} result - The naming result.
 * @returns {object|null} The step, or null when there are no substituents.
 */
function substituentsStep(result) {
  const groups = result.structure.prefixes;
  if (groups.length === 0) {
    return null;
  }
  const words = parentWords(result);
  const omit = prefixLocantsOmitted(result);
  const halogens = halogenGroups(result);
  const branches = groups.filter((g) => !isAtomPrefix(g) && !g.substituent.alkoxy && !g.substituent.amino && !onNitrogen(g));
  const alkoxy = groups.filter((g) => g.substituent.alkoxy);
  const amino = groups.filter((g) => g.substituent.amino);
  const text = [];
  if (branches.length > 0) {
    text.push(`Las ramas que salen ${words.of} son los [[sustituyentes|sustituyente]]. Cada uno se nombra por sus carbonos y termina en «-il» (o «-iliden» si se une con un enlace doble).`);
  }
  if (hasNitrogenLocants(groups)) {
    text.push(`Los grupos de carbonos unidos al nitrógeno del grupo ${isAmide(result) ? 'amida' : 'amino'}${branches.length > 0 ? ' también' : ''} son [[sustituyentes|sustituyente]]: se nombran igual que las ramas («metil», «etil»…), pero su [[localizador]] es la letra «N», porque van unidos al nitrógeno y no a un carbono.`);
  }
  if (amino.length > 0) {
    const also = branches.length > 0 || alkoxy.length > 0 ? ' también' : '';
    const inner = amino.some((g) => g.substituent.prefixes.length > 0)
      ? ' Si el nitrógeno lleva grupos de carbonos, esos grupos se escriben delante de «amino», todo junto y entre paréntesis, como en «(dimetilamino)».'
      : '';
    text.push(`Los grupos amino unidos ${words.to} que no son el [[grupo principal]]${also} son [[sustituyentes|sustituyente]]: se nombran con el [[prefijo]] «amino-».${inner}`);
  }
  if (alkoxy.length > 0) {
    const also = branches.length > 0 ? ' también' : '';
    text.push(`Los grupos unidos ${words.to} a través de un oxígeno (–O–, un éter)${also} son [[sustituyentes|sustituyente]]: se nombran con un [[prefijo]] acabado en «-oxi» (grupos alcoxi), como «metoxi» o «etoxi».`);
  }
  if (halogens.length > 0) {
    const also = halogens.length < groups.length ? ' también' : '';
    text.push(`Los átomos de halógeno unidos ${words.to}${also} son [[sustituyentes|sustituyente]]. Se nombran con un [[prefijo]]: «fluoro-» (F), «cloro-» (Cl), «bromo-» (Br) o «yodo-» (I). Un halógeno nunca va al final del nombre: siempre es un prefijo.`);
  }
  const hydroxyOn = groups.some((g) => g.substituent.hydroxy);
  const oxoOn = groups.some((g) => g.substituent.oxo);
  if (hydroxyOn || oxoOn) {
    const kinds = [...(hydroxyOn ? ['–OH'] : []), ...(oxoOn ? ['C=O'] : [])];
    const forms = [...(hydroxyOn ? ['«hidroxi-» el –OH'] : []), ...(oxoOn ? ['«oxo-» el C=O'] : [])];
    text.push(`Los grupos ${joinY(kinds)} unidos ${words.to} que no son el [[grupo principal]] también se nombran como [[sustituyentes|sustituyente]], con un [[prefijo]]: ${joinY(forms)}.`);
  }
  let omitted = 'En el anillo';
  if (result.structure.parentKind !== 'ring') {
    omitted = result.structure.parent.length === 1 ? 'En el carbono' : 'En la cadena principal';
  }
  const options = [];
  for (const group of groups) {
    const sub = group.substituent;
    const k = group.locants.length;
    const where = omit ? omitted : placesText(group);
    let what = k === 1 ? `hay un grupo ${groupNameOf(sub)}` : `hay ${k} grupos ${groupNameOf(sub)}`;
    if (sub.amino && sub.prefixes.length > 0) {
      what = k === 1
        ? `hay un grupo amino cuyo nitrógeno lleva ${aminoGroupsWords(sub)}`
        : `hay ${k} grupos amino; cada nitrógeno lleva ${aminoGroupsWords(sub)}`;
    } else if (sub.halogen) {
      what = `hay ${k === 1 ? `un átomo de ${ELEMENT_NAMES_ES[sub.halogen]}` : halogenAtoms(k, sub.halogen)}`;
    } else if (sub.hydroxy) {
      what = k === 1 ? 'hay un grupo –OH' : `hay ${k} grupos –OH`;
    } else if (sub.oxo) {
      what = k === 1 ? 'hay un oxígeno unido con un enlace doble (C=O)' : `hay ${k} oxígenos unidos con enlaces dobles (C=O)`;
    }
    let line = `${where} ${what}: se escribe ${q(citedGroup(group, omit, omit && groups.length > 1))}${omit ? `, sin ${k === 1 ? 'número' : 'números'}` : ''}.`;
    if (k > 1) {
      const mult = isCompoundPrefix(sub) ? lexiconEs.compoundMultiplier(k) : lexiconEs.multiplier(k);
      if (omit) {
        line += ` «${mult}» significa ${k}.`;
      } else if (group.locants.some((site) => site.locant === N_LOCANT)) {
        line += ` «${mult}» significa ${k}; se pone un número o una N por cada grupo, aunque se repita.`;
      } else {
        line += ` «${mult}» significa ${k}; se pone un número por cada ${sub.halogen ? 'átomo' : 'grupo'}, aunque se repita.`;
      }
      if (isCompoundPrefix(sub)) {
        line += ' Con grupos que tienen sus propias ramas se usa «bis», «tris»… en vez de «di» o «tri».';
      }
    }
    const details = describeSubstituent(sub, onNitrogen(group) ? NITROGEN_WORDS : words, result.structure.suffix ? result.structure.suffix.kind : null);
    text.push(line);
    options.push({
      label: substituentPrefix(sub, lexiconEs),
      text: [line, ...details].join(' '),
      highlight: [parentSpec(result), { ...groupIds(group), style: 'substituent' }],
      // A locant the name omits (metilciclohexano, metilbenceno, cloroetano) is not drawn either, nor the
      // `N` of a group on an amine nitrogen (a letter, not a carbon number).
      locants: omit ? null : carbonSiteLocants(group.locants),
    });
    text.push(...details);
  } // End of the loop over the prefix groups
  return {
    id: 'substituents',
    title: STEP_TITLES.substituents,
    text,
    highlight: [parentSpec(result), ...substituentSpecs(result)],
    locants: omit ? null : groups.flatMap((g) => carbonSiteLocants(g.locants)),
    options,
  };
} // End of function substituentsStep()

/**
 * Locant labels of some prefix occurrences on the parent (atom id → locant),
 * leaving out the occurrences on an amine nitrogen (locant `N`, design.md
 * §13.4 I-36).
 *
 * @param {object[]} sites - PrefixLocants.
 * @returns {Array<[number, number]>} Atom id → locant pairs.
 */
function carbonSiteLocants(sites) {
  return sites.filter((site) => site.locant !== N_LOCANT).map((site) => [site.atom, site.locant]);
}

/**
 * Where a prefix group is, for the substituents step: `En el carbono 2`,
 * `En los carbonos 2 y 3`, `En el nitrógeno` (locant `N`, design.md §13.4
 * I-36), `En el nitrógeno y en el carbono 2`.
 *
 * @param {object} group - A prefix group.
 * @returns {string} The words, capitalised.
 */
function placesText(group) {
  const places = [...new Set(group.locants.map((s) => s.locant))];
  const carbons = places.filter((locant) => locant !== N_LOCANT);
  const onCarbons = carbons.length === 1 ? `el carbono ${carbons[0]}` : `los carbonos ${joinY(carbons)}`;
  if (carbons.length === places.length) {
    return `En ${onCarbons}`;
  }
  return carbons.length === 0 ? 'En el nitrógeno' : `En el nitrógeno y en ${onCarbons}`;
}

/**
 * Explains why one prefix is cited before the next one.
 *
 * @param {object} a - Earlier substituent structure.
 * @param {object} b - Later substituent structure.
 * @returns {string} The sentence.
 */
function orderReason(a, b) {
  const ka = citationKey(a, lexiconEs);
  const kb = citationKey(b, lexiconEs);
  const wa = q(substituentPrefix(a, lexiconEs));
  const wb = q(substituentPrefix(b, lexiconEs));
  const n = Math.min(ka.alpha.length, kb.alpha.length);
  for (let i = 0; i < n; i += 1) {
    if (ka.alpha[i] !== kb.alpha[i]) {
      if (i === 0) {
        return `${wa} va antes que ${wb} (${ka.alpha[i]} va antes que ${kb.alpha[i]}).`;
      }
      return `${wa} va antes que ${wb}: empiezan igual («${ka.alpha.slice(0, i)}»), pero luego ${ka.alpha[i]} va antes que ${kb.alpha[i]}.`;
    }
  }
  if (ka.alpha.length !== kb.alpha.length) {
    return `${wa} va antes que ${wb}: las letras coinciden y la palabra más corta va primero.`;
  }
  return `${wa} va antes que ${wb}: tienen las mismas letras y decide el número más bajo.`;
} // End of function orderReason()

/**
 * Step 6, "Ordena alfabéticamente": citation order of the prefix groups.
 *
 * @param {object} result - The naming result.
 * @returns {object|null} The step, or null with fewer than two groups.
 */
function orderStep(result) {
  const groups = result.structure.prefixes;
  if (groups.length < 2) {
    return null;
  }
  const subs = groups.map((g) => g.substituent);
  const text = [`Los sustituyentes se escriben por orden alfabético: ${joinY(subs.map((s) => q(substituentPrefix(s, lexiconEs))))}.`];
  for (let i = 0; i + 1 < subs.length; i += 1) {
    text.push(orderReason(subs[i], subs[i + 1]));
  }
  if (groups.some((g) => g.locants.length > 1)) {
    text.push('Los prefijos que dicen cuántos hay (di-, tri-, bis-…) no cuentan para el orden.');
  }
  const tert = subs.find((s) => s.retained === 'tert-butyl');
  if (tert) {
    text.push(`«tert-» tampoco cuenta: ${q(tert.alkoxy ? substituentPrefix(tert, lexiconEs) : 'tert-butil')} se ordena por la b.`);
  }
  const iso = subs.find((s) => s.retained === 'isopropyl' || s.retained === 'isopropylidene');
  if (iso) {
    text.push(`«iso» sí cuenta: ${q(iso.alkoxy ? substituentPrefix(iso, lexiconEs) : 'isopropil')} se ordena por la i.`);
  }
  if (subs.some((s) => s.alkoxy)) {
    text.push('Los prefijos de los éteres («metoxi», «etoxi»…) se ordenan junto con los demás, por su nombre completo (por ejemplo, «metil» va antes que «metoxi», porque la i va antes que la o).');
  }
  if (subs.some((s) => !s.amino && isCompoundPrefix(s) && s.prefixes.some((g) => g.locants.length > 1))) {
    text.push('Dentro de un paréntesis todo cuenta, también di-, tri-…: «(2,2-dimetilpropil)» se ordena por la d.');
  }
  for (const sub of subs.filter((s) => s.amino && s.prefixes.length > 0)) {
    const prefix = substituentPrefix(sub, lexiconEs);
    text.push(`Un prefijo de amina con grupos en su nitrógeno se ordena por su nombre completo, con di- incluido: ${q(prefix)} va por la ${citationKey(sub, lexiconEs).alpha[0]}.`);
  }
  if (hasNitrogenLocants(groups)) {
    text.push('La «N» de los grupos unidos al nitrógeno no cuenta para el orden: solo cuenta el nombre del grupo.');
  }
  const halogens = HALOGEN_ORDER.filter((el) => subs.some((s) => s.halogen === el));
  if (halogens.length > 0) {
    const letters = halogens.map((el) => {
      const prefix = lexiconEs.halogenPrefix(el);
      return `${q(prefix)} por la ${prefix[0]}`;
    });
    text.push(`Los halógenos se ordenan junto con las ramas, por su nombre en español: ${joinY(letters)}.`);
  }
  return {
    id: 'order',
    title: STEP_TITLES.order,
    text,
    highlight: substituentSpecs(result),
    locants: null,
  };
} // End of function orderStep()

/**
 * Legend of the name pieces (design.md §5: "hex = 6 carbonos, -eno = hay
 * un doble enlace"), built from the structure, in writing order (the word
 * `ácido` of an acid first, lexicon suffixClassWord()).
 *
 * @param {object} result - The naming result.
 * @returns {{text: string, kind: string, meaning: string}[]} Legend entries.
 */
function nameLegend(result) {
  const { parent, prefixes } = result.structure;
  const words = parentWords(result);
  const omission = ringOmission(result);
  const omitPrefixes = prefixLocantsOmitted(result);
  const legend = [];
  const classWord = result.structure.suffix ? lexiconEs.suffixClassWord(result.structure.suffix.kind) : null;
  if (classWord) {
    legend.push({ text: classWord, kind: 'ending', meaning: `la molécula es un ${groupWords(result).family}: su nombre empieza por esta palabra` });
  }
  for (const group of prefixes) {
    const sub = group.substituent;
    const k = group.locants.length;
    if (!omitPrefixes) {
      legend.push({
        text: group.locants.map((s) => locantText(s.locant)).join(','),
        kind: 'locant',
        meaning: prefixLocantMeaning(group, words),
      });
    }
    if (k > 1) {
      const mult = isCompoundPrefix(sub) ? lexiconEs.compoundMultiplier(k) : lexiconEs.multiplier(k);
      legend.push({ text: mult, kind: 'multiplier', meaning: sub.halogen ? `hay ${halogenAtoms(k, sub.halogen)}` : `hay ${k} grupos iguales` });
    }
    let meaning = `sustituyente: grupo ${groupNameOf(sub)} (${count(substituentCarbons(sub), 'carbono', 'carbonos')})`;
    if (sub.halogen) {
      meaning = `sustituyente: átomo de ${ELEMENT_NAMES_ES[sub.halogen]} (${sub.halogen}), un halógeno`;
    } else if (sub.hydroxy) {
      meaning = 'sustituyente: grupo –OH, que aquí no es el grupo principal';
    } else if (sub.oxo) {
      meaning = 'sustituyente: oxígeno unido con un enlace doble (C=O), que aquí no es el grupo principal';
    } else if (sub.alkoxy) {
      meaning = `sustituyente: un éter, el oxígeno y el grupo de ${count(substituentCarbons(sub), 'carbono', 'carbonos')} unido a él («-oxi»)`;
    } else if (sub.amino) {
      meaning = sub.prefixes.length === 0
        ? 'sustituyente: grupo amino (–NH₂), una amina que aquí no es el grupo principal'
        : `sustituyente: grupo amino con ${aminoGroupsWords(sub)} en su nitrógeno, una amina que aquí no es el grupo principal`;
    }
    legend.push({ text: substituentPrefix(sub, lexiconEs), kind: 'prefix', meaning });
  } // End of the loop over the prefix groups
  if (isBenzene(result) && isAmine(result)) {
    legend.push({ text: lexiconEs.benzeneName.slice(0, -1), kind: 'stem', meaning: `el anillo de benceno (sin la «o» final, delante de «-${lexiconEs.groupSuffix('amine')}»)` });
    legend.push({ text: `-${lexiconEs.groupSuffix('amine')}`, kind: 'ending', meaning: 'grupo principal: el grupo amino unido al anillo (amina)' });
    return legend;
  }
  if (isBenzene(result) && result.structure.suffix) {
    legend.push({ text: lexiconEs.phenolStem, kind: 'stem', meaning: 'el anillo de benceno («fenol» es un nombre propio)' });
    legend.push({ text: `-${lexiconEs.groupSuffix('alcohol')}`, kind: 'ending', meaning: 'grupo principal: el –OH unido al anillo' });
    return legend;
  }
  if (isBenzene(result)) {
    legend.push({ text: lexiconEs.benzeneName, kind: 'stem', meaning: 'anillo de 6 carbonos con tres enlaces dobles alternados' });
    return legend;
  }
  if (result.structure.parentKind === 'ring') {
    legend.push({ text: `${lexiconEs.ringPrefix}-`, kind: 'stem', meaning: 'la cadena se cierra: es un anillo' });
    legend.push({ text: lexiconEs.stem(parent.length), kind: 'stem', meaning: `${count(parent.length, 'carbono', 'carbonos')} en el anillo` });
  } else {
    legend.push({ text: lexiconEs.stem(parent.length), kind: 'stem', meaning: `${count(parent.length, 'carbono', 'carbonos')} en la cadena principal` });
  }
  const segments = lexiconEs.segmentOrder.map((kind) => ({ kind, sites: parent[kind] })).filter((s) => s.sites.length > 0);
  const { suffix } = result.structure;
  const elide = Boolean(suffix) && suffixWords(suffix, lexiconEs).elides;
  const elided = suffix ? ` (sin la «o» final, delante de «-${suffixWords(suffix, lexiconEs).word}»)` : '';
  if (segments.length === 0) {
    const ending = lexiconEs.endings.saturated;
    legend.push({
      text: `-${elide ? ending.slice(0, -1) : ending}`,
      kind: 'ending',
      meaning: `todos los enlaces son simples${elide ? elided : ''}`,
    });
    legend.push(...suffixLegend(result));
    return legend;
  }
  if (lexiconEs.needsConnectingVowel(parent)) {
    legend.push({ text: lexiconEs.connectingVowel, kind: 'stem', meaning: 'se añade para que suene bien antes de di-, tri-…' });
  }
  const omit = result.structure.parentKind === 'ring' ? omission.parent : lexiconEs.omitsLocants(parent, prefixes.length > 0);
  segments.forEach((segment, i) => {
    const n = segment.sites.length;
    const word = segment.kind === 'double' ? 'doble' : 'triple';
    if (!omit) {
      legend.push({
        text: segment.sites.map(siteLocantText).join(','),
        kind: 'locant',
        meaning: `dónde ${n === 1 ? `está el enlace ${word}` : `están los enlaces ${word}s`} (el carbono con el número más bajo)${closureNote(segment.sites)}`,
      });
    }
    const last = i === segments.length - 1;
    const full = `${lexiconEs.multiplier(n)}${lexiconEs.unsaturationEnding(segment.kind, last)}`;
    const cut = last && elide;
    legend.push({
      text: `-${cut ? full.slice(0, -1) : full}`,
      kind: 'ending',
      meaning: `${n === 1 ? `hay un enlace ${word}` : `hay ${n} enlaces ${word}s`}${cut ? elided : ''}`,
    });
  });
  legend.push(...suffixLegend(result));
  return legend;
} // End of function nameLegend()

/**
 * Legend meaning of the locants of one prefix group: the carbons of the
 * parent, or `N` for a group on the nitrogen of a principal amine (design.md
 * §13.4 I-36: «el grupo va unido al nitrógeno, no a un carbono»).
 *
 * @param {object} group - A prefix group.
 * @param {{of: string}} words - How the parent is named (parentWords()).
 * @returns {string} The meaning.
 */
function prefixLocantMeaning(group, words) {
  const prefix = q(substituentPrefix(group.substituent, lexiconEs));
  const onN = group.locants.filter((s) => s.locant === N_LOCANT).length;
  const carbons = group.locants.filter((s) => s.locant !== N_LOCANT).map((s) => s.locant);
  if (onN === 0 && words === PARENT_WORDS.carbon) {
    // A one-carbon parent (`1-cloro-N-metilmetanamina`): its locant is written only because of an `N`.
    return `el único carbono de la cadena principal, donde está ${prefix}`;
  }
  if (onN === 0) {
    return `${carbons.length === 1 ? 'carbono' : 'carbonos'} ${words.of} donde está ${prefix}`;
  }
  if (carbons.length === 0) {
    return onN === 1
      ? `el grupo ${prefix} va unido al nitrógeno, no a un carbono`
      : `los ${onN} grupos ${prefix} van unidos al nitrógeno, no a un carbono (una N por cada uno)`;
  }
  return `dónde está cada ${prefix}: «N» es el nitrógeno (ese grupo va unido a él, no a un carbono) y ${joinY(carbons)} ${carbons.length === 1 ? 'es el carbono' : 'son los carbonos'} ${words.of}`;
} // End of function prefixLocantMeaning()

/**
 * Legend entries of the suffix of an alcohol, aldehyde, ketone, acid or
 * ester (design.md §13.4 I-31, I-32, I-33, I-35): the locants of the
 * carbons of the principal groups (unless omitted: `etanol`,
 * `ciclohexanol`, `propanona`, every aldehyde, acid and ester on a chain)
 * and `-ol`, `-diol`, `-al`, `-dial`, `-ona`, `-diona`, `-oico`,
 * `-dioico`, `-oato`…; for an ester also `de` and its O-bound group.
 *
 * @param {object} result - The naming result.
 * @returns {{text: string, kind: string, meaning: string}[]} The entries (none without a suffix).
 */
function suffixLegend(result) {
  const { suffix } = result.structure;
  if (!suffix) {
    return [];
  }
  const words = groupWords(result);
  const n = suffix.locants.length;
  const legend = [];
  if (!suffixOmitted(result)) {
    // An acid's locants are never written on a chain (suffixOmitted()), so only –OH and C=O reach here.
    let carbons = suffix.kind === 'alcohol'
      ? `${n === 1 ? 'carbono que lleva' : 'carbonos que llevan'} el grupo –OH`
      : `${n === 1 ? 'carbono del grupo' : 'carbonos de los grupos'} C=O`;
    if (suffix.kind === 'amine') {
      carbons = n === 1 ? 'carbono unido al nitrógeno del grupo amino' : 'carbonos unidos a los nitrógenos de los grupos amino';
    }
    legend.push({ text: suffix.locants.map((s) => s.locant).join(','), kind: 'locant', meaning: carbons });
  }
  const { multiplier: mult, word } = suffixWords(suffix, lexiconEs);
  legend.push({
    text: `-${mult}${word}`,
    kind: 'ending',
    meaning: n === 1 ? `grupo principal: ${words.one} (${words.family})` : `grupo principal: ${n} ${words.many} (${words.family})`,
  });
  const alkyl = esterGroup(result);
  if (alkyl) {
    legend.push({ text: lexiconEs.esterLink.trim(), kind: 'punct', meaning: 'une las dos partes del éster: primero la del ácido y luego la del grupo unido al oxígeno' });
    legend.push({
      text: esterAlkylName(alkyl, lexiconEs),
      kind: 'prefix',
      meaning: `grupo unido al oxígeno del –COO– (${count(substituentCarbons(alkyl), 'carbono', 'carbonos')}), acabado en «-ilo»`,
    });
  }
  return legend;
} // End of function suffixLegend() // End of function suffixLegend()

/**
 * Step 7, "Monta el nombre": the pieces in writing order, the punctuation
 * rules, a coloured legend and the alternative names.
 *
 * @param {object} result - The naming result.
 * @returns {object} The step.
 */
function assembleStep(result) {
  const { prefixes } = result.structure;
  const ring = result.structure.parentKind === 'ring';
  const hasLocants = result.parts.some((p) => p.kind === 'locant');
  const text = [];
  const benzene = isBenzene(result);
  if (isEster(result)) {
    text.push('El nombre de un éster tiene dos palabras. La primera es la parte del ácido, y se forma como el nombre de cualquier cadena:');
  }
  if (benzene && isAmine(result)) {
    const stem = lexiconEs.benzeneName.slice(0, -1);
    text.push(prefixes.length > 0
      ? `Primero van los grupos unidos al nitrógeno, cada uno con su «N», y después el nombre del anillo sin su «o» final, ${q(stem)}, más la terminación «-amina», todo junto. El anillo no lleva números: solo tiene un grupo.`
      : `El nombre es el del anillo sin su «o» final, ${q(stem)}, más la terminación del grupo principal, «-amina». No lleva números: el anillo solo tiene un grupo.`);
  } else if (benzene && result.structure.suffix) {
    text.push(`El benceno con un grupo –OH tiene nombre propio: ${q(result.name)}. No lleva números: «fen» es el anillo y «-ol», el grupo –OH.`);
  } else if (benzene) {
    text.push(prefixes.length > 0
      ? `Primero va el sustituyente, sin número, y al final ${q(lexiconEs.benzeneName)}, todo junto.`
      : `El anillo tiene nombre propio: ${q(lexiconEs.benzeneName)}. No lleva números ni terminación que añadir.`);
  } else if (prefixes.length > 0 && prefixes.every(onNitrogen)) {
    // Only groups on an amine N (N-metiletanamina, N,N-dimetilciclohexanamina, design.md §13.4 I-36).
    let first = 'van los sustituyentes del nitrógeno, en orden alfabético, cada uno con su «N» y un guion';
    if (prefixes.length === 1) {
      first = prefixes[0].locants.length === 1 ? 'va el sustituyente del nitrógeno, con su «N» y un guion' : 'van los sustituyentes del nitrógeno, con sus «N» y un guion';
    }
    text.push(`Primero ${first}, y al final el nombre ${ring ? 'del anillo' : 'de la cadena principal'}, todo junto.`);
    if (ring) {
      text.push(`El nombre del anillo empieza por «${lexiconEs.ringPrefix}-», que dice que la cadena está cerrada.`);
    }
  } else if (prefixes.length > 0 && !ring && prefixLocantsOmitted(result)) {
    const one = prefixes.length === 1 && prefixes[0].locants.length === 1;
    text.push(`Primero ${prefixes.length === 1 ? 'va el sustituyente' : 'van los sustituyentes'}, sin ${one ? 'número' : 'números'}, y al final el nombre de la cadena principal, todo junto.`);
  } else if (prefixes.length > 0 && !ring) {
    text.push('Primero van los sustituyentes, cada uno con sus números y en orden alfabético. Al final va el nombre de la cadena principal.');
    text.push('Los números se separan entre sí con comas (2,3) y de las letras con guiones (2-metil). Los sustituyentes se escriben pegados a la cadena principal.');
  } else if (prefixes.length > 0) {
    text.push(prefixLocantsOmitted(result)
      ? 'Primero va el sustituyente y al final el nombre del anillo, todo junto.'
      : 'Primero van los sustituyentes, cada uno con sus números y en orden alfabético. Al final va el nombre del anillo.');
    if (hasLocants) {
      text.push('Los números se separan entre sí con comas (1,2) y de las letras con guiones (1-metil). Los sustituyentes se escriben pegados al nombre del anillo.');
    }
    text.push(`El nombre del anillo empieza por «${lexiconEs.ringPrefix}-», que dice que la cadena está cerrada.`);
  } else if (isBareRing(result)) {
    text.push(`El nombre de un anillo empieza por «${lexiconEs.ringPrefix}-», que dice que la cadena está cerrada. Luego va la raíz, que dice cuántos carbonos tiene el anillo, y la terminación «-${lexiconEs.endings.saturated}», porque todos los enlaces son simples.`);
  } else if (ring) {
    text.push(`El nombre de un anillo empieza por «${lexiconEs.ringPrefix}-», que dice que la cadena está cerrada. Luego va la raíz, que dice cuántos carbonos tiene el anillo, y la terminación.`);
  } else {
    text.push('El nombre de la cadena principal es la raíz, que dice cuántos carbonos hay, más una terminación.');
  }
  if (halogensIn(result).length > 0) {
    text.push('Los halógenos van delante como prefijos, igual que las ramas: nunca cambian la terminación del nombre.');
  }
  if (prefixes.some((g) => g.substituent.alkoxy)) {
    text.push('El éter va delante como prefijo («-oxi»), igual que las ramas: nunca cambia la terminación del nombre.');
  }
  if (prefixes.some((g) => aminoTotal(g.substituent) > 0)) {
    text.push('La amina que no es el grupo principal va delante como prefijo («amino»), igual que las ramas: no cambia la terminación del nombre.');
  }
  const nitrogen = nitrogenAssembleSentence(result);
  if (nitrogen) {
    text.push(nitrogen);
  }
  const parent = result.structure.parent;
  if (!benzene && parent.double.length + parent.triple.length > 0) {
    text.push('La terminación dice qué enlaces hay: «-ano» si todos son simples, «-eno» si hay un [[enlace doble]], «-ino» si hay un [[enlace triple]]. Si hay los dos, «en» va antes que «ino».');
  }
  if (!benzene && result.structure.suffix) {
    text.push(...suffixSentences(result));
  }
  text.push(`El nombre completo es ${q(result.name)}.`);
  const alternatives = result.alternatives || [];
  if (alternatives.length > 0) {
    text.push(alternatives.length === 1 ? 'También es correcto:' : 'También son correctos:');
    for (const alternative of alternatives) {
      text.push(`${q(alternative.name)}: ${alternative.label}.`);
    }
  }
  return {
    id: 'assemble',
    title: STEP_TITLES.assemble,
    text,
    highlight: [
      parentSpec(result), ...substituentSpecs(result), ...(result.structure.suffix ? [suffixSpec(result)] : []),
      ...(isEster(result) ? [esterSpecs(result).alkyl] : []),
    ],
    // A ring whose name has no locant (ciclohexano, metilciclohexano) shows no locant labels.
    locants: ring && !hasLocants ? null : parentLocants(result),
    legend: nameLegend(result),
    parts: result.parts.map((p) => ({ text: p.text, kind: p.kind, atoms: [...p.atoms], bonds: [...p.bonds] })),
  };
} // End of function assembleStep()

/**
 * Sentence of "Monta el nombre" on the groups on the nitrogen of a
 * principal amine (design.md §13.4 I-36): the letter `N` instead of a
 * number, one `N` per group (`N,N-dimetil`), the `N` before the numbers
 * (`N,2-dimetil`), and the carbon locants written even where the omission
 * rule would drop them (`1-cloro-N-metilmetanamina`).
 *
 * @param {object} result - The naming result.
 * @returns {string|null} The sentence, or null without groups on the nitrogen.
 */
function nitrogenAssembleSentence(result) {
  const { prefixes } = result.structure;
  if (!hasNitrogenLocants(prefixes)) {
    return null;
  }
  let sentence = 'Los grupos unidos al nitrógeno llevan la letra «N» en lugar de un número (como en «N-metil»).';
  if (prefixes.some((g) => g.locants.filter((site) => site.locant === N_LOCANT).length > 1)) {
    sentence += ' Si hay dos grupos iguales en el nitrógeno, se escribe una N por cada uno: «N,N-dimetil».';
  }
  if (prefixes.some((g) => !onNitrogen(g) && g.locants.some((site) => site.locant === N_LOCANT))) {
    sentence += ' Si un mismo grupo está en el nitrógeno y en un carbono, la N va primero: «N,2-dimetil».';
  }
  if (ringOmission(result).prefixes && carbonLocantPrefixes(prefixes).length > 0) {
    sentence += ' Sin la N, aquí no harían falta los números de los carbonos; pero cuando hay una «N», también se escriben, para que quede claro qué va en un carbono y qué en el nitrógeno.';
  }
  return sentence;
} // End of function nitrogenAssembleSentence()

/**
 * Sentences of "Monta el nombre" about the suffix of an alcohol, aldehyde,
 * ketone, acid or ester (design.md §13.4 I-31, I-32, I-33, I-35; an
 * ester's first word ends with `-oato`, then `de` and the O-bound group,
 * the English order being the reverse): `-ol` / `-al` /
 * `-ona` / `-oico` at the very end with its locants (never for an aldehyde
 * or acid on a chain), `-diol`, `-dial`, `-diona`, `-dioico`…, the word
 * `ácido` that starts an acid's name, and the final `o` of the ending,
 * dropped before a vowel (`propan-2-ol`, `propanal`, `ácido propanoico`)
 * and kept before a consonant (`etano-1,2-diol`, `pentano-2,4-diona`,
 * `ácido butanodioico`, IUPAC 2013 P-16.7.1).
 *
 * @param {object} result - A naming result with a suffix.
 * @returns {string[]} The sentences.
 */
function suffixSentences(result) {
  const { suffix, parent } = result.structure;
  const { multiplier: mult, word, elides } = suffixWords(suffix, lexiconEs);
  const omitted = suffixOmitted(result);
  const text = [];
  let where = omitted ? 'sin número' : 'con el número de su carbono justo delante';
  if (!omitted && suffix.locants.length > 1) {
    where = 'con los números de sus carbonos justo delante';
  }
  text.push(isEster(result)
    ? `La primera palabra acaba con el [[sufijo]] del grupo principal, ${q(`-${mult}${word}`)}, ${where}.`
    : `Al final va el [[sufijo]] del grupo principal, ${q(`-${mult}${word}`)}, ${where}.`);
  if (mult) {
    const full = lexiconEs.multiplier(suffix.locants.length);
    const cut = full === mult ? '' : ` (${q(full)} pierde su «a» final delante de ${q(`-${word}`)}, porque empieza por vocal)`;
    text.push(`«${mult}» quiere decir que hay ${suffix.locants.length} ${groupWords(result).many} en ${result.structure.parentKind === 'ring' ? 'el anillo' : 'la cadena principal'}${cut}.`);
  }
  if (suffix.kind === 'aldehyde' && result.structure.parentKind === 'chain') {
    text.push(suffix.locants.length === 1
      ? 'El –CHO no lleva número: su carbono siempre es el 1.'
      : 'Los –CHO no llevan número: sus carbonos siempre son los dos extremos.');
  }
  if (suffix.kind === 'ester') {
    text.push('El –COO– no lleva número: su carbono siempre es el 1.');
  }
  if (suffix.kind === 'amide') {
    text.push(suffix.locants.length === 1
      ? 'El grupo amida no lleva número: su carbono siempre es el 1.'
      : 'Los grupos amida no llevan número: sus carbonos siempre son los dos extremos.');
  }
  if (suffix.kind === 'nitrile') {
    text.push(suffix.locants.length === 1
      ? 'El –C≡N no lleva número: su carbono siempre es el 1.'
      : 'Los –C≡N no llevan número: sus carbonos siempre son los dos extremos.');
  }
  if (suffix.kind === 'amine' && !omitted) {
    text.push(suffix.locants.length === 1
      ? 'El número del sufijo es el del carbono unido al nitrógeno: el nitrógeno no tiene número en la cadena.'
      : 'Los números del sufijo son los de los carbonos unidos a los nitrógenos: los nitrógenos no tienen número en la cadena.');
  }
  if (suffix.kind === 'acid') {
    text.push(suffix.locants.length === 1
      ? 'El –COOH no lleva número: su carbono siempre es el 1.'
      : 'Los –COOH no llevan número: sus carbonos siempre son los dos extremos.');
    text.push(`Delante de todo va la palabra ${q(lexiconEs.suffixClassWord('acid'))}, separada del resto con un espacio: el nombre de un ácido carboxílico siempre empieza así.`);
  }
  const segments = lexiconEs.segmentOrder.filter((kind) => parent[kind].length > 0);
  const last = segments.length === 0
    ? lexiconEs.endings.saturated
    : lexiconEs.unsaturationEnding(segments[segments.length - 1], true);
  text.push(elides
    ? `La «o» final de «-${last}» se quita delante de «-${word}», porque empieza por vocal: ${q(result.name)}.`
    : `La «o» final de «-${last}» se queda delante de «-${mult}${word}», porque empieza por consonante: ${q(result.name)}.`);
  const alkyl = esterGroup(result);
  if (alkyl) {
    const alkylName = esterAlkylName(alkyl, lexiconEs);
    text.push(`Después va la palabra «de» y la segunda palabra, el nombre del grupo unido al oxígeno, acabado en «-ilo»: ${q(alkylName)}. En español, el nombre de un éster se monta así: primero la parte del ácido y luego, tras «de», el grupo unido al oxígeno.`);
    // A fixed example: the English lexicon is development-only and never bundled (design.md §2).
    text.push('En inglés el orden es al revés: primero el grupo y después la parte del ácido, sin «de» (el etanoato de metilo es «methyl ethanoate»).');
  }
  return text;
} // End of function suffixSentences() // End of function suffixSentences()

/** Spanish article of each group family name (`el alcohol`, `la cetona`). */
const GROUP_ARTICLES = Object.freeze({
  acid: 'el', ester: 'el', amide: 'la', nitrile: 'el', aldehyde: 'el', ketone: 'la', alcohol: 'el', phenol: 'el', amine: 'la', ether: 'el', halide: 'el',
});

/** Spanish plural of each group family name. */
const GROUP_PLURALS = Object.freeze({
  acid: 'ácidos carboxílicos',
  ester: 'ésteres',
  amide: 'amidas',
  nitrile: 'nitrilos',
  aldehyde: 'aldehídos',
  ketone: 'cetonas',
  alcohol: 'alcoholes',
  phenol: 'fenoles',
  amine: 'aminas',
  ether: 'éteres',
  halide: 'halógenos',
});

/** What each group looks like, for "Reconoce los grupos" (ESO level). */
const GROUP_DESCRIPTIONS = Object.freeze({
  acid: 'un carbono con un oxígeno unido por un [[enlace doble]] y un grupo –OH, todo junto (–COOH)',
  ester: 'un carbono con un oxígeno unido por un [[enlace doble]] y otro oxígeno que lo une a otra cadena de carbonos (–COO–)',
  amide: 'un carbono con un oxígeno unido por un [[enlace doble]] y un nitrógeno (–CONH₂, –CONH– o –CON–)',
  nitrile: 'un carbono unido a un nitrógeno por un [[enlace triple]] (–C≡N)',
  aldehyde: 'un oxígeno unido por un [[enlace doble]] a un carbono que también tiene un hidrógeno (–CHO); por eso siempre está en un extremo',
  ketone: 'un oxígeno unido por un [[enlace doble]] a un carbono que está entre otros dos carbonos (–CO–)',
  alcohol: 'un grupo –OH unido a un carbono',
  phenol: 'un grupo –OH unido a un carbono del [[benceno]]',
  amine: 'un nitrógeno unido a carbonos solo con enlaces simples (–NH₂, –NH– o –N–)',
  ether: 'un oxígeno entre dos carbonos (–O–)',
  halide: 'un halógeno unido a un carbono',
});

/** Why a group is not recognised, by groups.js UNSUPPORTED_REASONS id. */
const UNSUPPORTED_TEXTS = Object.freeze({
  heteroatomBond: 'hay átomos que no son carbono unidos entre sí (como O–O o N–O)',
  imine: 'hay un nitrógeno unido a un carbono por un [[enlace doble]] (C=N)',
  noCarbon: 'hay un átomo que no está unido a ningún carbono',
  carbonylDerivative: 'hay un carbono con un oxígeno doble o un nitrógeno triple rodeado de otros átomos de una forma que no conozco',
});

/** Example names for each suffix (the family key may be 'phenol'). */
const SUFFIX_EXAMPLES = Object.freeze({
  acid: 'y el nombre empieza por «ácido», como en «ácido etanoico»',
  ester: 'seguido de «de» y el nombre de la otra cadena acabado en «-ilo», como en «etanoato de metilo»',
  amide: 'como en «etanamida»',
  nitrile: 'como en «etanonitrilo»',
  aldehyde: 'como en «etanal»',
  ketone: 'como en «propanona»',
  alcohol: 'como en «etanol»',
  phenol: 'como en «fenol», el nombre del benceno con un –OH',
  amine: 'como en «metanamina»',
});

/** Extra remarks on some prefixes. */
const PREFIX_NOTES = Object.freeze({
  aldehyde: ` (o «${lexiconEs.formylPrefix}-» si su carbono no está en la cadena principal)`,
  ester: ' (el nombre cambia según la cadena: «metoxicarbonil-», «etoxicarbonil-»…)',
  'ester:heteroatom': ' (el nombre cambia según la cadena: «acetiloxi-», «propanoiloxi-»…)',
  'amide:heteroatom': ' (el nombre cambia según la cadena: «acetilamino-», «propanoilamino-»…)',
  ether: ' (el oxígeno con el lado que no lleva la cadena principal, acabado en «-oxi», como «metoxi-» o «etoxi-»)',
});

/**
 * Family key of a group for explanations: its kind, or 'phenol' for an OH
 * on a benzene carbon.
 *
 * @param {object} group - A classified group record.
 * @returns {string} The family key.
 */
function familyKey(group) {
  return group.phenol ? 'phenol' : group.kind;
}

/**
 * Family name of a key with its article: `el alcohol`, `la cetona`, `el cloro`.
 *
 * @param {string} key - A family key (or a halogen symbol for a halide line).
 * @returns {string} The Spanish words.
 */
function familyWithArticle(key) {
  if (ELEMENT_NAMES_ES[key]) {
    return `el ${ELEMENT_NAMES_ES[key]}`;
  }
  return `${GROUP_ARTICLES[key]} ${lexiconEs.groupFamilyName(key)}`;
}

/**
 * Capitalises the first letter of a sentence.
 *
 * @param {string} text - The text.
 * @returns {string} The text with an upper-case first letter.
 */
function capitalise(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Groups the classified groups into lines: one per family (alcohol, phenol,
 * each halogen, each unsupported reason), in the order of the records. With
 * `byAttachment`, prefix esters and amides are also split by the end that
 * faces the principal group (their prefixes differ).
 *
 * @param {object[]} items - Classified groups (result.groups.items).
 * @param {boolean} [byAttachment] - True to split esters and amides by `attachment`.
 * @returns {{key: string, items: object[]}[]} The lines, each with its groups.
 */
function groupLines(items, byAttachment = false) {
  const lines = new Map();
  for (const item of items) {
    let key = familyKey(item);
    if (item.kind === 'halide') {
      key = item.element;
    } else if (item.kind === 'unsupported') {
      key = `unsupported:${item.reason}`;
    }
    const line = byAttachment && item.prefixes ? `${key}:${item.attachment}` : key;
    if (!lines.has(line)) {
      lines.set(line, { key, items: [] });
    }
    lines.get(line).items.push(item);
  }
  return [...lines.values()];
} // End of function groupLines()

/**
 * Sentence giving the prefix of a group line for "Sufijo o prefijo". An
 * ester or amide whose facing end is undecided gets both forms, with the
 * condition for each.
 *
 * @param {string} key - The family key of the line.
 * @param {object} group - The first group of the line.
 * @returns {string} The sentence.
 */
function prefixSentence(key, group) {
  const who = capitalise(familyWithArticle(key));
  if (group.prefixes && !group.prefix) {
    const through = group.kind === 'ester' ? 'el oxígeno' : 'el nitrógeno';
    return `${who}: prefijo «${group.prefixes.carbonyl}-» si se une al resto por su carbono, o «${group.prefixes.heteroatom}-» si se une por ${through}.`;
  }
  const note = PREFIX_NOTES[group.attachment === 'heteroatom' ? `${group.kind}:heteroatom` : group.kind] || '';
  if (group.attachment === 'heteroatom') {
    const through = group.kind === 'ester' ? 'su oxígeno' : 'su nitrógeno';
    return `${who}: prefijo «${group.prefix}-»${note}, porque se une al grupo principal por ${through}.`;
  }
  if (group.attachment === 'carbonyl') {
    return `${who}: prefijo «${group.prefix}-»${note}, porque se une al grupo principal por su carbono.`;
  }
  return `${who}: prefijo «${group.prefix}-»${note}.`;
} // End of function prefixSentence()

/**
 * Highlight spec of some groups.
 *
 * @param {object[]} items - Classified groups.
 * @param {string} style - Highlight style.
 * @returns {{atoms: number[], bonds: number[], style: string}} The spec.
 */
function groupSpec(items, style) {
  return { atoms: items.flatMap((g) => g.atoms), bonds: items.flatMap((g) => g.bonds), style };
}

/**
 * Highlight of the groups by role: principal (suffix) groups as the parent,
 * the other recognised groups as substituents, unknown groups as candidates.
 * Empty specs are left out.
 *
 * @param {object[]} items - Classified groups.
 * @param {boolean} byRole - False to show every recognised group alike (as substituents).
 * @returns {object[]} Highlight specs.
 */
function groupHighlight(items, byRole) {
  const suffix = items.filter((g) => g.role === 'suffix');
  const prefix = items.filter((g) => g.role === 'prefix');
  const unknown = items.filter((g) => g.role === 'unsupported');
  const specs = byRole
    ? [groupSpec(suffix, 'parent'), groupSpec(prefix, 'substituent')]
    : [groupSpec([...suffix, ...prefix], 'substituent')];
  specs.push(groupSpec(unknown, 'candidate'));
  return specs.filter((spec) => spec.atoms.length > 0);
}

/**
 * Step "Reconoce los grupos" (design.md §13.4 I-29): every characteristic
 * group, by family, and why the atoms of an acid, ester or amide are not
 * also counted as alcohol, ether, amine or ketone.
 *
 * @param {object} result - A HETEROATOM failure with `groups`.
 * @returns {object} The step.
 */
function groupsStep(result) {
  const { items } = result.groups;
  const text = ['Además de carbono e hidrógeno, tu molécula tiene otros átomos. Con ellos se forman [[grupos funcionales|grupo funcional]]: trozos de la molécula que deciden cómo se comporta y cómo se llama.'];
  text.push(items.length === 1 ? 'He encontrado este grupo:' : 'He encontrado estos grupos:');
  for (const { key, items: list } of groupLines(items)) {
    const n = list.length;
    if (list[0].kind === 'unsupported') {
      text.push(`${count(n, 'grupo que no reconozco', 'grupos que no reconozco')}: ${UNSUPPORTED_TEXTS[list[0].reason]}.`);
    } else if (list[0].kind === 'halide') {
      text.push(`${count(n, 'átomo', 'átomos')} de ${ELEMENT_NAMES_ES[key]} (–${key}): ${GROUP_DESCRIPTIONS.halide}.`);
    } else {
      const name = n === 1 ? `1 ${lexiconEs.groupFamilyName(key)}` : `${n} ${GROUP_PLURALS[key]}`;
      text.push(`${name}: ${GROUP_DESCRIPTIONS[key]}.`);
    }
  } // End of the loop over the group lines
  const kinds = new Set(items.map((g) => g.kind));
  const whole = [];
  if (kinds.has('acid')) {
    whole.push('el –OH de un ácido no cuenta como alcohol ni su C=O como cetona');
  }
  if (kinds.has('ester')) {
    whole.push('el oxígeno del medio de un éster no cuenta como éter ni su C=O como cetona');
  }
  if (kinds.has('amide')) {
    whole.push('el nitrógeno de una amida no cuenta como amina ni su C=O como cetona');
  }
  if (kinds.has('nitrile')) {
    whole.push('el enlace triple de un nitrilo (C≡N) no es el de un alquino y su nitrógeno no cuenta como amina');
  }
  if (whole.length > 0) {
    text.push(`Cada átomo pertenece a un solo grupo: ${whole.join('; ')}. Todo junto es un único grupo.`);
  }
  if (items.some((g) => g.phenol)) {
    text.push('Un –OH en un carbono del benceno se llama fenol. Se nombra como un alcohol, con «-ol».');
  }
  return { id: 'groups', title: STEP_TITLES.groups, text, highlight: groupHighlight(items, false), locants: null };
} // End of function groupsStep()

/**
 * Step "Elige el principal": the seniority order of IUPAC 2013 and the
 * principal group it picks; ethers and halogens are never principal.
 *
 * @param {object} result - A HETEROATOM failure with `groups`.
 * @returns {object} The step.
 */
function principalStep(result) {
  const { items, principal } = result.groups;
  const order = SENIORITY.map((kind) => (kind === 'acid' ? 'ácido' : lexiconEs.groupFamilyName(kind))).join(' > ');
  const text = [];
  const prefixKinds = ['ether', 'halide'].filter((kind) => items.some((g) => g.kind === kind));
  const prefixOnly = prefixKinds.length > 0;
  const never = `${capitalise(joinY(prefixKinds.map((kind) => `los ${GROUP_PLURALS[kind]}`)))} nunca son el`;
  if (principal) {
    const chosen = items.filter((g) => g.kind === principal);
    const key = chosen.every((g) => g.phenol) ? 'phenol' : principal;
    text.push(`Cuando hay grupos distintos, solo uno es el [[grupo principal]]. Se elige con este orden de la IUPAC (2013), de más a menos importante: ${order}.`);
    const others = [...new Set(items.filter((g) => g.canBeSuffix && g.kind !== principal).map((g) => g.kind))];
    if (others.length > 0) {
      text.push(`Aquí el grupo principal es ${familyWithArticle(key)}: en la lista va antes que ${joinY(others.map(familyWithArticle))}.`);
    } else {
      text.push(`Aquí el grupo principal es ${familyWithArticle(key)}: es el único tipo de grupo que puede serlo.`);
    }
    if (chosen.length > 1) {
      text.push(`Hay ${chosen.length} grupos de este tipo: todos cuentan como principales.`);
    }
    if (prefixOnly) {
      text.push(`${never} grupo principal: siempre se nombran delante, como las ramas.`);
    }
  } else if (prefixOnly) {
    text.push(`${never} [[grupo principal]]: siempre se nombran delante, como las ramas.`);
    text.push('Tu molécula no tiene otro grupo, así que no hay grupo principal: el nombre se forma como el de un hidrocarburo, con estos grupos delante.');
  } else {
    text.push('No hay ningún grupo que yo reconozca, así que no puedo elegir el [[grupo principal]].');
  }
  if (principal && result.groups.unsupported) {
    text.push('Además hay un grupo que no reconozco: no sé dónde iría en la lista.');
  }
  return { id: 'principal', title: STEP_TITLES.principal, text, highlight: groupHighlight(items, true), locants: null };
} // End of function principalStep()

/**
 * Step "Sufijo o prefijo": the principal group gives the suffix, the other
 * groups become prefixes, with their Spanish forms.
 *
 * @param {object} result - A HETEROATOM failure with `groups`.
 * @returns {object} The step.
 */
function affixesStep(result) {
  const { items, principal } = result.groups;
  const text = [principal
    ? 'El grupo principal se nombra con un [[sufijo]], una terminación al final del nombre. Los demás grupos se nombran con un [[prefijo]] delante, igual que las ramas.'
    : 'Sin grupo principal no hay [[sufijo]]: todos los grupos se nombran con un [[prefijo]] delante, igual que las ramas.'];
  for (const { key, items: list } of groupLines(items, true)) {
    const group = list[0];
    if (group.role === 'unsupported') {
      continue;
    }
    if (group.role === 'suffix') {
      text.push(`${capitalise(familyWithArticle(key))}: sufijo «-${group.suffix}», ${SUFFIX_EXAMPLES[key]}.`);
    } else {
      text.push(prefixSentence(key, group));
    }
  } // End of the loop over the group lines
  if (result.groups.unsupported) {
    text.push('El grupo que no reconozco no tiene sufijo ni prefijo entre los que conozco.');
  }
  return { id: 'affixes', title: STEP_TITLES.affixes, text, highlight: groupHighlight(items, true), locants: null };
} // End of function affixesStep()

/**
 * Last step of a HETEROATOM refusal: the "not nameable yet" message.
 *
 * @param {object} result - A HETEROATOM failure with `groups`.
 * @returns {object} The step.
 */
function notYetStep(result) {
  const atoms = result.error.atoms || [];
  return {
    id: 'notYet',
    title: STEP_TITLES.notYet,
    text: [result.error.message],
    highlight: atoms.length > 0 ? [{ atoms: [...atoms], bonds: [], style: 'candidate' }] : [],
    locants: null,
  };
}

/**
 * Builds the step-by-step explanation of a naming result (design.md §5).
 *
 * @param {object} result - A naming result (nameMolecule()) with its trace.
 * @returns {object[]} The ordered steps; for a failed result, the group steps of a HETEROATOM refusal carrying `groups`, else none.
 */
export function explain(result) {
  if (!result || !result.ok) {
    if (result && result.error && result.error.code === 'HETEROATOM' && result.groups) {
      return [groupsStep(result), principalStep(result), affixesStep(result), notYetStep(result)];
    }
    return [];
  }
  if (isBenzene(result)) {
    return [
      countStep(result),
      groupStep(result),
      etherStep(result),
      benzeneStep(result),
      substituentsStep(result),
      assembleStep(result),
    ].filter(Boolean);
  }
  if (result.structure.parentKind === 'ring') {
    return [
      countStep(result),
      groupStep(result),
      etherStep(result),
      ringStep(result),
      ringNumberingStep(result),
      substituentsStep(result),
      orderStep(result),
      assembleStep(result),
    ].filter(Boolean);
  }
  return [
    countStep(result),
    groupStep(result),
    esterStep(result),
    etherStep(result),
    chainStep(result),
    tiebreakStep(result),
    numberingStep(result),
    substituentsStep(result),
    orderStep(result),
    assembleStep(result),
  ].filter(Boolean);
} // End of function explain()
