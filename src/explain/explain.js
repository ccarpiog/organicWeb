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
 * Step ids, in order: count, ring, chain, tiebreak, numbering,
 * ringNumbering, substituents, order, assemble. A step that decided
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
 */

import { toSubscript } from '../model/molecule.js';
import { lexiconEs, LOCANT_OMISSION } from '../naming/lexicon.es.js';
import { substituentPrefix, citationKey, needsEnclosure, isCompoundPrefix, renderPrefixes } from '../naming/render.js';

/** Glossary for the underlined terms (design.md §5): key → Spanish definition. */
export const GLOSSARY = Object.freeze({
  'cadena principal': 'La cadena de carbonos que da nombre a la molécula. Es la más larga.',
  sustituyente: 'Una rama que sale de la cadena principal, como el grupo metilo. También se llama radical.',
  localizador: 'El número que dice en qué carbono de la cadena está algo.',
  'insaturación': 'Un enlace doble o triple entre dos carbonos.',
  'enlace doble': 'Dos carbonos unidos por dos enlaces. Se dibuja con dos rayas.',
  'enlace triple': 'Dos carbonos unidos por tres enlaces. Se dibuja con tres rayas.',
  anillo: 'Una cadena de carbonos cerrada: el último carbono está unido al primero.',
  benceno: 'Un anillo de 6 carbonos con tres enlaces dobles alternados (uno sí, uno no). Es muy estable y tiene nombre propio.',
});

/** Titles of the steps (design.md §5). */
export const STEP_TITLES = Object.freeze({
  count: 'Cuenta los carbonos',
  ring: 'Busca el anillo',
  benzene: 'Reconoce el benceno',
  chain: 'Busca la cadena más larga',
  tiebreak: 'Desempates',
  numbering: 'Numera la cadena',
  ringNumbering: 'Numera el anillo',
  substituents: 'Nombra los sustituyentes',
  order: 'Ordena alfabéticamente',
  assemble: 'Monta el nombre',
});

/** Short Spanish statement of each numbering rule, for the comparison table. */
const RULE_LABELS = Object.freeze({
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
  const list = items.map(String);
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
 * Formats a locant list for the student: `2, 4`, or `ninguno` when empty.
 *
 * @param {number[]} list - Locants.
 * @returns {string} The text.
 */
function listText(list) {
  return list.length === 0 ? 'ninguno' : list.join(', ');
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
});

/**
 * The words used for the parent of a result in sentences.
 *
 * @param {object} result - The naming result.
 * @returns {{the: string, to: string, of: string}} `la cadena principal` / `el anillo` and their forms after a, de.
 */
function parentWords(result) {
  return result.structure.parentKind === 'ring' ? PARENT_WORDS.ring : PARENT_WORDS.chain;
}

/**
 * Tells whether a result is a bare cycloalkane (a ring without prefixes or
 * ring multiple bonds, design.md §13.4 I-25), explained without numbering.
 *
 * @param {object} result - The naming result.
 * @returns {boolean} True for a cycloalkane.
 */
function isBareRing(result) {
  const { parentKind, parent, prefixes } = result.structure;
  return parentKind === 'ring' && prefixes.length === 0 && parent.double.length + parent.triple.length === 0;
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
 * Whether the ring locants of a ring result are omitted (lexicon ringOmitsLocants()).
 *
 * @param {object} result - The naming result.
 * @returns {{parent: boolean, prefixes: boolean}} Omission of the ending locants and of the prefix locants (both false for a chain).
 */
function ringOmission(result) {
  const { parentKind, parent, prefixes } = result.structure;
  return parentKind === 'ring' ? lexiconEs.ringOmitsLocants(parent, prefixes) : { parent: false, prefixes: false };
}

/**
 * Multiple-bond count of a substituent (a double bond counts 1, a triple 2),
 * nested prefixes and their connecting bonds included.
 *
 * @param {object} sub - A substituent structure.
 * @returns {number} Number of π bonds inside the group.
 */
function substituentPi(sub) {
  let pi = sub.chain.double.length + 2 * sub.chain.triple.length;
  for (const group of sub.prefixes) {
    for (const site of group.locants) {
      pi += substituentPi(group.substituent) + (site.order - 1);
    }
  }
  return pi;
}

/**
 * Counts the carbons and hydrogens of the named molecule from its structure
 * (a hydrocarbon: H = 2C + 2 − 2·π − 2·rings; one ring for a ring parent).
 *
 * @param {object} structure - The name structure.
 * @returns {{carbons: number, hydrogens: number}} The counts.
 */
export function atomCounts(structure) {
  const { parent, prefixes } = structure;
  let carbons = parent.length;
  let pi = parent.double.length + 2 * parent.triple.length;
  for (const group of prefixes) {
    for (const site of group.locants) {
      carbons += site.atoms.length;
      pi += substituentPi(group.substituent) + (site.order - 1);
    }
  }
  const rings = structure.parentKind === 'ring' ? 1 : 0;
  return { carbons, hydrogens: 2 * carbons + 2 - 2 * pi - 2 * rings };
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
 * Step 1, "Cuenta los carbonos": carbons, hydrogens and formula.
 *
 * @param {object} result - The naming result.
 * @returns {object} The step.
 */
function countStep(result) {
  const { carbons, hydrogens } = atomCounts(result.structure);
  const formula = toSubscript(`C${carbons === 1 ? '' : carbons}H${hydrogens === 1 ? '' : hydrogens}`);
  const atoms = [...result.parent.atoms, ...result.structure.prefixes.flatMap((g) => groupIds(g).atoms)];
  const bonds = [...result.parent.bonds, ...result.structure.prefixes.flatMap((g) => groupIds(g).bonds)];
  const text = [
    `Tu molécula tiene ${count(carbons, 'carbono', 'carbonos')} y ${count(hydrogens, 'hidrógeno', 'hidrógenos')} (${formula}).`,
    'En el dibujo, cada punta y cada vértice es un carbono. Los hidrógenos no se dibujan: cada carbono tiene los que necesita para llegar a 4 enlaces.',
  ];
  if (result.structure.parentKind === 'ring' && result.structure.prefixes.length === 0 && hydrogens === 2 * carbons) {
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
 * Counts the multiple bonds that stay outside the parent chain (in
 * substituents, or connecting a `-iliden` group), the groups holding them,
 * and, bond by bond (every occurrence of a repeated group on its own), how
 * many of them lie on some longest chain (a P1 survivor).
 *
 * @param {object} result - The naming result.
 * @returns {{double: number, triple: number, specs: object[], total: number, inLongest: number, oneChain: boolean}}
 *   Counts, highlight specs of those groups, the number of outside bonds, how many lie on a longest chain,
 *   and whether a single longest chain holds all of those.
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
    double += sub.chain.double.length;
    triple += sub.chain.triple.length;
    for (const group of sub.prefixes) {
      for (const site of group.locants) {
        double += site.order === 2 ? 1 : 0;
        visit(group.substituent);
      }
    }
  };
  for (const group of result.structure.prefixes) {
    const before = double + triple;
    for (const site of group.locants) {
      double += site.order === 2 ? 1 : 0;
      if (site.order === 2) {
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
  return { double, triple, specs, total: bonds.length, inLongest: onLongest.length, oneChain };
} // End of function outsideUnsaturation()

/**
 * The explicit sentence of design.md §5 when an unsaturation stays outside
 * the parent chain (IUPAC 2013: length first). Each outside bond is either
 * on another longest chain (that chain lost a tie-break) or on none (length).
 *
 * @param {{double: number, triple: number, total: number, inLongest: number, oneChain: boolean}} outside - Result of outsideUnsaturation().
 * @returns {string} The paragraph.
 */
function outsideSentence(outside) {
  const { double, triple, total, inLongest } = outside;
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
 * Step 2, "Busca la cadena más larga", from the P1 trace step.
 *
 * @param {object} result - The naming result.
 * @returns {object|null} The step, or null for methane.
 */
function chainStep(result) {
  const p1 = result.trace.find((s) => s.rule === 'P1');
  const length = result.parent.atoms.length;
  if (!p1 || length === 1) {
    return null;
  }
  const text = [];
  const step = { id: 'chain', title: STEP_TITLES.chain, text, highlight: [parentSpec(result)], locants: null };
  if (p1.candidatesBefore.length === 1) {
    text.push(`Todos los carbonos forman una sola cadena, sin ramas. Esa es la [[cadena principal]]: tiene ${length} carbonos.`);
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
  const outside = outsideUnsaturation(result);
  if (outside.double + outside.triple > 0) {
    text.push(outsideSentence(outside));
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
  const text = [
    `${prefixes.length > 0 ? `En tu molécula, ${n} de los carbonos` : `Los ${n} carbonos`} forman una cadena que se cierra sobre sí misma: el último carbono está unido al primero. Una cadena cerrada es un [[anillo]].`,
    'El enlace que cierra el anillo está marcado en otro color. Si lo quitaras, tendrías una cadena abierta.',
  ];
  if (prefixes.length > 0) {
    text.push('Las ramas que salen del anillo son cadenas abiertas. Con las normas de la IUPAC (2013), un anillo manda siempre sobre una cadena abierta: el anillo es la [[cadena principal]] y las ramas son [[sustituyentes|sustituyente]].');
    const longest = Math.max(...prefixes.flatMap((g) => g.locants.map((site) => site.atoms.length)));
    if (longest > n) {
      text.push(`Aquí una rama tiene ${longest} carbonos y el anillo solo ${n}, pero aun así manda el anillo. Antes se enseñaba que ganaba la cadena más larga; con las normas actuales ya no es así.`);
    }
    const outside = prefixes.some((g) => g.locants.some((site) => site.order === 2 || site.multipleBonds.length > 0));
    if (outside) {
      text.push('Aunque una rama tenga enlaces dobles o triples, el anillo sigue siendo la cadena principal.');
    }
  } // End of the ring-vs-chain sentences
  let naming = `Un anillo se nombra como la cadena abierta con los mismos carbonos, poniendo delante «${lexiconEs.ringPrefix}-»: ${q(open)} → ${q(ring)}.`;
  if (parent.double.length + parent.triple.length > 0) {
    naming += ' Si el anillo tiene enlaces dobles o triples, la terminación cambia como en las cadenas: «-eno», «-ino».';
  }
  text.push(naming);
  return {
    id: 'ring',
    title: STEP_TITLES.ring,
    text,
    highlight: [...ringSpecs(result), ...substituentSpecs(result)],
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
  const text = [
    `${prefixes.length > 0 ? 'En tu molécula, 6 de los carbonos' : 'Los 6 carbonos'} forman un [[anillo]] con forma de hexágono y tres [[enlaces dobles|enlace doble]] alternados: uno sí, uno no. Este anillo es el [[benceno]] y tiene nombre propio, ${q(lexiconEs.benzeneName)}. No se llama «ciclohexatrieno».`,
    'El benceno se puede dibujar de dos maneras: con los enlaces dobles en unos lados del hexágono o en los otros tres. Los dos dibujos son la misma molécula (se llaman estructuras de Kekulé): en realidad los electrones de esos enlaces dobles están repartidos por igual por todo el anillo. Por eso los dos dibujos tienen el mismo nombre.',
  ];
  if (prefixes.length > 0) {
    text.push('La rama que sale del anillo es un [[sustituyente]]. Con las normas de la IUPAC (2013), el anillo manda siempre sobre una cadena abierta: el nombre acaba en «benceno» y la rama va delante.');
    const longest = Math.max(...prefixes.flatMap((g) => g.locants.map((site) => site.atoms.length)));
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
 * @returns {string} The sentence.
 */
function singleRingOption(rule, value, ring) {
  let what = new Set(value).size === 1 ? 'por el carbono que tiene los sustituyentes' : 'por un carbono con sustituyente';
  if (value.length === 1) {
    what = 'por el carbono que tiene el sustituyente';
  }
  if (rule.rule === 'N1' || rule.rule === 'N2') {
    const kind = ring.triple.length === 0 ? 'doble' : (ring.double.length === 0 ? 'triple' : 'doble o triple');
    what = `por un carbono del enlace ${kind} y sigue por ese enlace`;
  }
  const numbers = value.length === 1 ? `sale el número ${value[0]}, el más bajo posible` : `salen los números ${listText(value)}, los más bajos posibles`;
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
  if (multiple) {
    rules.push('primero, los [[enlaces dobles|enlace doble]] y [[triples|enlace triple]] del anillo llevan los [[localizadores|localizador]] más bajos (si empatan, los dobles)');
  }
  if (prefixes.length > 0) {
    rules.push(`${multiple ? 'después' : 'primero'}, los [[sustituyentes|sustituyente]] llevan los números más bajos (si empatan, el que se escribe primero por orden alfabético)`);
  }
  text.push(`Las reglas son las mismas que en una cadena, por orden: ${joinY(rules)}.`);
  const deciding = result.trace.filter((s) => /^N[1-5]$/.test(s.rule) && decided(s));
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
      text.push(singleRingOption(first, groups[0].values[0], parent));
      if (tie) {
        text.push('Las formas de numerar que quedan dan el mismo nombre, así que da igual cuál elijas.');
      }
    } else {
      if (shown.length < first.candidatesBefore.length) {
        text.push(`Las numeraciones cuyo primer número no es ${lowest} pierden enseguida. Estas son las que quedan para comparar:`);
      }
      const comparison = compareNumberings(deciding, groups);
      text.push(...comparison.paragraphs);
      step.compare = comparison.compare;
      step.options = comparison.options;
      if (tie) {
        text.push('Las opciones que quedan dan el mismo nombre, así que da igual cuál elijas.');
      }
    } // End of the comparison of several options
  } else {
    const numbers = result.parts.filter((p) => p.kind === 'locant').map((p) => Number(p.text)).sort((a, b) => a - b);
    text.push(`Empieces por donde empieces, salen los mismos números${numbers.length > 0 ? `: ${numbers.join(', ')}` : ''}. Todas las formas dan el mismo nombre.`);
  } // End of the deciding-rules explanation
  const note = ringOmissionNote(result);
  if (note) {
    text.push(note);
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
  steps.forEach((step, k) => {
    const rule = COUNT_RULES[step.rule];
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
 * @param {string} rule - Rule id (N1…N5).
 * @param {string[]} labels - Option label of each candidate.
 * @param {Array<number[]>} lists - Compared lists (N1–N4) of each candidate.
 * @param {boolean[]} wins - Whether each candidate survived.
 * @returns {string} The paragraph.
 */
function numberingRuleText(rule, labels, lists, wins) {
  const intro = {
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
  const reason = (c) => (best[c.k] === undefined ? 'la ganadora tiene menos números' : `${best[c.k]} es menor que ${joinY(c.values)}`);
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
  if (hasLocants && parent.length <= 3) {
    return 'Aunque aquí no hay otra posibilidad, el número se escribe. La IUPAC solo lo quita en unos pocos nombres, como «propeno» o «etino».';
  }
  return null;
} // End of function omissionNote()

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
 * @returns {{labels: string[], paragraphs: string[], compare: object, options: object[]}} The pieces of the step.
 */
function compareNumberings(deciding, groups) {
  const labels = groups.map((_, i) => optionLabel(i));
  const paragraphs = [];
  const rows = [];
  for (const rule of deciding) {
    const present = groups.map((g) => rule.candidatesBefore.some((c) => c.key === g.candidate.key));
    const idx = groups.map((_, i) => i).filter((i) => present[i]);
    const lists = idx.map((i) => valueOf(rule, groups[i].candidate.key));
    const wins = idx.map((i) => rule.survivors.some((c) => c.key === groups[i].candidate.key));
    paragraphs.push(numberingRuleText(rule.rule, idx.map((i) => labels[i]), lists, wins));
    if (rule.rule !== 'N5') {
      const { marks } = pairwiseDifferences(lists, wins);
      rows.push({
        rule: rule.rule,
        label: RULE_LABELS[rule.rule],
        lists: groups.map((g, i) => (present[i] ? valueOf(rule, g.candidate.key) : null)),
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
 * Step 4, "Numera la cadena": the numbering rules N1–N5 that decided, side
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
  const hasLocants = result.parts.some((p) => p.kind === 'locant');
  if (!hasLocants) {
    text.push('Aquí no hace falta numerar: el nombre no lleva números.');
    if (note) {
      text.push(note);
    }
    return step;
  }
  text.push('Numera los carbonos de la [[cadena principal]] de un extremo al otro. Hay que elegir por qué extremo empiezas a contar.');
  const deciding = result.trace.filter((s) => /^N[1-5]$/.test(s.rule) && decided(s));
  if (deciding.length > 0) {
    // Options: the candidates entering the first deciding rule, merged when
    // every deciding rule gives them the same values (symmetric numberings).
    const groups = signatureGroups(deciding, deciding[0].candidatesBefore);
    const comparison = compareNumberings(deciding, groups);
    text.push(...comparison.paragraphs);
    if (new Set(groups.map((g) => chainIdentity(g.candidate))).size > 1) {
      text.push('Las opciones usan cadenas distintas del mismo tamaño: estas reglas también eligen la cadena principal.');
    }
    step.compare = comparison.compare;
    step.options = comparison.options;
  } else {
    const numbers = result.parts.filter((p) => p.kind === 'locant').map((p) => Number(p.text)).sort((a, b) => a - b);
    text.push(`Empieces por donde empieces, salen los mismos números: ${numbers.join(', ')}. Todas las formas dan el mismo nombre.`);
  } // End of the deciding-rules explanation
  if (deciding.length > 0 && result.trace.some((s) => s.rule === 'TIE')) {
    text.push('Las opciones que quedan dan el mismo nombre, así que da igual cuál elijas.');
  }
  if (note) {
    text.push(note);
  }
  text.push('Mira los números en el dibujo.');
  return step;
} // End of function numberingStep()

/**
 * Group name used when talking about a substituent (`metilo`,
 * `propan-2-ilo`, `isopropilo`).
 *
 * @param {object} sub - A substituent structure.
 * @returns {string} The standalone group name.
 */
function groupNameOf(sub) {
  return lexiconEs.groupName(substituentPrefix(sub, lexiconEs));
}

/**
 * Text of one prefix group as cited in the name, with its locants and
 * multiplier (`2,3-dimetil`, `5-(propan-2-il)`).
 *
 * @param {object} group - A prefix group.
 * @param {boolean} [omitLocants] - Leave out the locants (a ring with a single substituent).
 * @returns {string} The cited text.
 */
function citedGroup(group, omitLocants = false) {
  return renderPrefixes([group], lexiconEs, omitLocants).map((p) => p.text).join('');
}

/**
 * Explains why a substituent prefix is written as it is: attachment,
 * unsaturation, own locants, nested prefixes (mini-explanation), enclosing
 * marks, retained and common names.
 *
 * @param {object} sub - A substituent structure.
 * @param {{to: string}} [words] - How the parent is named (parentWords(); default: the parent chain).
 * @returns {string[]} Sentences.
 */
function describeSubstituent(sub, words = PARENT_WORDS.chain) {
  const prefix = substituentPrefix(sub, lexiconEs);
  const out = [];
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
  const n = sub.atoms.length;
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
    const inner = sub.prefixes.map((g) => {
      const places = [...new Set(g.locants.map((s) => s.locant))];
      const where = places.length === 1 ? `en el carbono ${places[0]}` : `en los carbonos ${joinY(places)}`;
      const what = q(substituentPrefix(g.substituent, lexiconEs));
      return g.locants.length === 1 ? `${what} ${where}` : `${g.locants.length} grupos ${what} ${where}`;
    });
    out.push(`Es una rama con sus propias ramas. Se nombra como una molécula pequeña: su cadena tiene ${count(chain.length, 'carbono', 'carbonos')} y se numera para que el carbono unido ${words.to} lleve el número más bajo posible. En ella hay: ${joinY(inner)}.`);
  }
  const unsaturated = chain.double.length + chain.triple.length > 0;
  if (freeValence.locant > 1 || (unsaturated && chain.length > 2)) {
    out.push(`El número ${freeValence.locant} que va justo antes de «-${lexiconEs.freeValenceSuffix(freeValence.order)}» dice por qué carbono del grupo se une ${words.to}.`);
  }
  if (needsEnclosure(sub)) {
    out.push(`Va entre paréntesis porque tiene sus propios ${sub.prefixes.length > 0 ? 'sustituyentes y números' : 'números'}.`);
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
  const omit = ringOmission(result).prefixes;
  const text = [`Las ramas que salen ${words.of} son los [[sustituyentes|sustituyente]]. Cada uno se nombra por sus carbonos y termina en «-il» (o «-iliden» si se une con un enlace doble).`];
  const options = [];
  for (const group of groups) {
    const sub = group.substituent;
    const k = group.locants.length;
    const places = [...new Set(group.locants.map((s) => s.locant))];
    const where = omit ? 'En el anillo' : (places.length === 1 ? `En el carbono ${places[0]}` : `En los carbonos ${joinY(places)}`);
    const what = k === 1 ? `hay un grupo ${groupNameOf(sub)}` : `hay ${k} grupos ${groupNameOf(sub)}`;
    let line = `${where} ${what}: se escribe ${q(citedGroup(group, omit))}${omit ? ', sin número' : ''}.`;
    if (k > 1) {
      const mult = isCompoundPrefix(sub) ? lexiconEs.compoundMultiplier(k) : lexiconEs.multiplier(k);
      line += ` «${mult}» significa ${k}; se pone un número por cada grupo, aunque se repita.`;
      if (isCompoundPrefix(sub)) {
        line += ' Con grupos que tienen sus propias ramas se usa «bis», «tris»… en vez de «di» o «tri».';
      }
    }
    const details = describeSubstituent(sub, words);
    text.push(line);
    options.push({
      label: substituentPrefix(sub, lexiconEs),
      text: [line, ...details].join(' '),
      highlight: [parentSpec(result), { ...groupIds(group), style: 'substituent' }],
      // A locant the name omits (metilciclohexano, metilbenceno) is not drawn either.
      locants: omit ? null : group.locants.map((s) => [s.atom, s.locant]),
    });
    text.push(...details);
  } // End of the loop over the prefix groups
  return {
    id: 'substituents',
    title: STEP_TITLES.substituents,
    text,
    highlight: [parentSpec(result), ...substituentSpecs(result)],
    locants: omit ? null : groups.flatMap((g) => g.locants.map((s) => [s.atom, s.locant])),
    options,
  };
} // End of function substituentsStep()

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
  if (subs.some((s) => s.retained === 'tert-butyl')) {
    text.push('«tert-» tampoco cuenta: «tert-butil» se ordena por la b.');
  }
  if (subs.some((s) => s.retained === 'isopropyl' || s.retained === 'isopropylidene')) {
    text.push('«iso» sí cuenta: «isopropil» se ordena por la i.');
  }
  if (subs.some((s) => isCompoundPrefix(s) && s.prefixes.some((g) => g.locants.length > 1))) {
    text.push('Dentro de un paréntesis todo cuenta, también di-, tri-…: «(2,2-dimetilpropil)» se ordena por la d.');
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
 * un doble enlace"), built from the structure, in writing order.
 *
 * @param {object} result - The naming result.
 * @returns {{text: string, kind: string, meaning: string}[]} Legend entries.
 */
function nameLegend(result) {
  const { parent, prefixes } = result.structure;
  const words = parentWords(result);
  const omission = ringOmission(result);
  const legend = [];
  for (const group of prefixes) {
    const sub = group.substituent;
    const k = group.locants.length;
    if (!omission.prefixes) {
      legend.push({
        text: group.locants.map((s) => s.locant).join(','),
        kind: 'locant',
        meaning: `${k === 1 ? 'carbono' : 'carbonos'} ${words.of} donde está ${q(substituentPrefix(sub, lexiconEs))}`,
      });
    }
    if (k > 1) {
      const mult = isCompoundPrefix(sub) ? lexiconEs.compoundMultiplier(k) : lexiconEs.multiplier(k);
      legend.push({ text: mult, kind: 'multiplier', meaning: `hay ${k} grupos iguales` });
    }
    legend.push({
      text: substituentPrefix(sub, lexiconEs),
      kind: 'prefix',
      meaning: `sustituyente: grupo ${groupNameOf(sub)} (${count(sub.atoms.length, 'carbono', 'carbonos')})`,
    });
  } // End of the loop over the prefix groups
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
  if (segments.length === 0) {
    legend.push({ text: `-${lexiconEs.endings.saturated}`, kind: 'ending', meaning: 'todos los enlaces son simples' });
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
        text: segment.sites.map((s) => s.locant).join(','),
        kind: 'locant',
        meaning: `dónde ${n === 1 ? `está el enlace ${word}` : `están los enlaces ${word}s`} (el carbono con el número más bajo)`,
      });
    }
    const ending = `${lexiconEs.multiplier(n)}${lexiconEs.unsaturationEnding(segment.kind, i === segments.length - 1)}`;
    legend.push({
      text: `-${ending}`,
      kind: 'ending',
      meaning: n === 1 ? `hay un enlace ${word}` : `hay ${n} enlaces ${word}s`,
    });
  });
  return legend;
} // End of function nameLegend()

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
  if (benzene) {
    text.push(prefixes.length > 0
      ? `Primero va el sustituyente, sin número, y al final ${q(lexiconEs.benzeneName)}, todo junto.`
      : `El anillo tiene nombre propio: ${q(lexiconEs.benzeneName)}. No lleva números ni terminación que añadir.`);
  } else if (prefixes.length > 0 && !ring) {
    text.push('Primero van los sustituyentes, cada uno con sus números y en orden alfabético. Al final va el nombre de la cadena principal.');
    text.push('Los números se separan entre sí con comas (2,3) y de las letras con guiones (2-metil). Los sustituyentes se escriben pegados a la cadena principal.');
  } else if (prefixes.length > 0) {
    text.push(ringOmission(result).prefixes
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
  const parent = result.structure.parent;
  if (!benzene && parent.double.length + parent.triple.length > 0) {
    text.push('La terminación dice qué enlaces hay: «-ano» si todos son simples, «-eno» si hay un [[enlace doble]], «-ino» si hay un [[enlace triple]]. Si hay los dos, «en» va antes que «ino».');
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
    highlight: [parentSpec(result), ...substituentSpecs(result)],
    // A ring whose name has no locant (ciclohexano, metilciclohexano) shows no locant labels.
    locants: ring && !hasLocants ? null : parentLocants(result),
    legend: nameLegend(result),
    parts: result.parts.map((p) => ({ text: p.text, kind: p.kind, atoms: [...p.atoms], bonds: [...p.bonds] })),
  };
} // End of function assembleStep()

/**
 * Builds the step-by-step explanation of a naming result (design.md §5).
 *
 * @param {object} result - A naming result (nameMolecule()) with its trace.
 * @returns {object[]} The ordered steps; empty for a failed result.
 */
export function explain(result) {
  if (!result || !result.ok) {
    return [];
  }
  if (isBenzene(result)) {
    return [
      countStep(result),
      benzeneStep(result),
      substituentsStep(result),
      assembleStep(result),
    ].filter(Boolean);
  }
  if (result.structure.parentKind === 'ring') {
    return [
      countStep(result),
      ringStep(result),
      ringNumberingStep(result),
      substituentsStep(result),
      orderStep(result),
      assembleStep(result),
    ].filter(Boolean);
  }
  return [
    countStep(result),
    chainStep(result),
    tiebreakStep(result),
    numberingStep(result),
    substituentsStep(result),
    orderStep(result),
    assembleStep(result),
  ].filter(Boolean);
}
