/**
 * @file Contracts of the naming engine: the result of nameMolecule() (design.md
 * §4.1), the trace step shape, and the language-neutral name structure
 * (§4.7), plus the builders that assemble a structure from a numbered chain.
 *
 * The name structure holds data only (lengths, locants, atom and bond ids);
 * never words. A lexicon (lexicon.es.js, or lexicon.en.js for the oracle) and render.js
 * turn it into text, so the same structure can be rendered in any language.
 * Later phases may extend these shapes; they must add fields, not redesign
 * existing ones.
 */

/**
 * One multiple bond of a chain, located by the lower locant of its two atoms.
 *
 * @typedef {object} UnsaturationSite
 * @property {number} locant - Lower locant of the bond's two atoms (1-based).
 * @property {number} [closing] - Only on a ring's closure bond: the higher locant of its two atoms (`n`), cited in parentheses as a compound locant, `1(6)` (IUPAC 2013 P-31.1.4.2.4).
 * @property {number} bond - Bond id.
 * @property {number[]} atoms - The bond's two atom ids, in locant order.
 */

/**
 * A numbered chain: the parent of a name, or the chain of a substituent.
 *
 * @typedef {object} ChainStructure
 * @property {number} length - Number of carbon atoms (1–30).
 * @property {number[]} atoms - Atom ids in locant order (atoms[i] has locant i + 1).
 * @property {number[]} bonds - Bond ids in locant order (bonds[i] joins locants i + 1 and i + 2).
 * @property {UnsaturationSite[]} double - Double bonds within the chain, ascending locants.
 * @property {UnsaturationSite[]} triple - Triple bonds within the chain, ascending locants.
 */

/**
 * A numbered ring: the parent of a ring name (design.md §13.4 I-25, I-26).
 * Same fields as a ChainStructure plus `kind` and `closure`, so code that
 * reads `length`, `atoms`, `bonds`, `double` and `triple` works on both;
 * the ring has as many bonds as atoms. Unsaturation sites use the lower
 * locant of the bond as in a chain; the closure bond, joining the last
 * atom (`length`) to the first, has locant 1 and `closing` = `length`: its
 * two locants differ by more than one, so IUPAC 2013 cites it as the
 * compound locant `1(6)` (ciclohex-1(6)-eno-1,2,4-triol). The numbering
 * rules compare that bond as locant n (numbering.js bondLocants()), so it
 * only happens when the principal groups (N0) force the numbering.
 *
 * @typedef {object} RingStructure
 * @property {'ring'} kind - Always 'ring'.
 * @property {number} length - Number of ring carbons (3–30).
 * @property {number[]} atoms - Atom ids in locant order (atoms[i] has locant i + 1), in ring order.
 * @property {number[]} bonds - Bond ids in ring order: bonds[i] joins atoms[i] and atoms[i + 1]; the last joins the last atom back to the first.
 * @property {number} closure - Id of the bond that closes the ring (the last of `bonds`).
 * @property {UnsaturationSite[]} double - Double bonds of the ring, ascending locants.
 * @property {UnsaturationSite[]} triple - Triple bonds of the ring, ascending locants.
 * @property {'benzene'} [retained] - Set on a benzene ring (aromatic.js, design.md §13.4 I-28): the ring is cited by its retained name `benceno`, never by `ciclo…` with locants; its double bonds (1, 3, 5) are one Kekulé drawing.
 */

/**
 * One occurrence of a substituent: its attachment to the chain that carries it.
 *
 * @typedef {object} PrefixLocant
 * @property {number} locant - Locant of the carrying chain atom.
 * @property {number} atom - Id of the carrying chain atom.
 * @property {number} attachAtom - Id of the substituent atom bonded to it.
 * @property {number} bond - Id of the connecting bond.
 * @property {number} order - Order of the connecting bond (1 → `-il`, 2 → `-iliden`).
 * @property {number[]} atoms - Atoms of this occurrence's substituent subtree (for highlighting).
 * @property {number[]} bonds - Bonds of this occurrence's subtree (not the connecting bond).
 * @property {number[]} multipleBonds - Double and triple bonds of this occurrence's subtree, ascending (not the connecting bond; for the explanation).
 */

/**
 * The language-neutral description of one substituent prefix.
 * Retained names (`isopropil`, `tert-butil`) are flagged by `retained`, never
 * encoded as text. The chain is chosen among paths containing the attachment
 * atom; `freeValence.locant` is the attachment atom's locant in it.
 *
 * @typedef {object} SubstituentStructure
 * @property {ChainStructure|null} chain - The substituent's own numbered chain (null for a halogen).
 * @property {string} [halogen] - Set on a halogen atom cited as a prefix (design.md §13.4 I-30): 'F', 'Cl', 'Br' or 'I' (`fluoro`, `cloro`, `bromo`, `yodo`); such a substituent has no chain and no prefixes, and `atoms` is the halogen atom.
 * @property {boolean} [hydroxy] - Set on an OH group cited as a prefix (`hidroxi`, design.md §13.4 I-31): an OH on a substituent chain, never on the parent (there it is the `-ol` suffix); no chain, no prefixes, `atoms` is the oxygen atom.
 * @property {PrefixGroup[]} prefixes - Its own grouped prefixes, in citation order.
 * @property {{locant: number, order: number}} freeValence - Locant and order of the free valence (1 → `-il`, 2 → `-iliden`).
 * @property {string|null} [retained] - Retained-name id cited instead of the systematic prefix: 'isopropyl' or 'isopropylidene' (style 'isopropil' only) or 'tert-butyl' (styles 'isopropil' and 'pin'); the chain and prefixes still describe the systematic name. 'phenyl' (`fenil`, aromatic.js phenylSubstituent()) has a benzene RingStructure as its `chain`.
 * @property {string|null} [commonName] - Id of a common name for explanations only, never cited in the name: 'vinyl', 'allyl', 'isobutyl', 'sec-butyl', or 'isopropyl'/'tert-butyl' when not retained; for doubly attached groups 'vinylidene', 'allylidene', 'isobutylidene', 'sec-butylidene', or 'isopropylidene' when not retained (lexicon commonGroupName()).
 * @property {number[]} atoms - Every atom of the substituent subtree.
 * @property {number[]} bonds - Every bond of the substituent subtree (not the connecting bond).
 */

/**
 * Identical substituents grouped under one prefix, e.g. the two `metil` of
 * `2,3-dimetil`. `key` is the canonical identity of the substituent subtree
 * (built from the graph, never from an assembled name string); the
 * group's `substituent` describes its first occurrence.
 *
 * @typedef {object} PrefixGroup
 * @property {string} key - Identity of the substituent (equal keys are grouped).
 * @property {SubstituentStructure} substituent - The (shared) substituent description.
 * @property {PrefixLocant[]} locants - One entry per occurrence, ascending locants.
 */

/**
 * One principal characteristic group cited as a suffix: its carrying parent
 * atom and its heteroatom (design.md §13.4 I-31: the OH of `-ol`).
 *
 * @typedef {object} SuffixLocant
 * @property {number} locant - Locant of the carrying parent atom.
 * @property {number} atom - Id of the carrying parent atom (a carbon).
 * @property {number} attachAtom - Id of the group's heteroatom bonded to it (the O of an OH).
 * @property {number} bond - Id of the bond between them.
 */

/**
 * The principal characteristic groups of a name, cited as a suffix after the
 * parent's ending (`propan-2-ol`, `butano-1,4-diol`, `ciclohexanol`, `fenol`).
 *
 * @typedef {object} SuffixStructure
 * @property {'alcohol'} kind - Group kind (groups.js GROUP_KINDS); only alcohols are named so far.
 * @property {SuffixLocant[]} locants - One entry per group, ascending locants (a carbon with two OH appears twice).
 */

/**
 * The language-neutral name structure (design.md §4.7).
 *
 * @typedef {object} NameStructure
 * @property {'chain'|'ring'} parentKind - Kind of parent: an open chain, or a ring (`ciclo…`; always the ring when there is one, design.md §13.5).
 * @property {ChainStructure|RingStructure} parent - The numbered parent chain or ring.
 * @property {PrefixGroup[]} prefixes - Grouped substituent prefixes in citation order (empty for an unbranched molecule).
 * @property {SuffixStructure|null} suffix - The principal characteristic groups cited as a suffix (`-ol`, design.md §13.4 I-31), or null (hydrocarbons and halogen derivatives).
 */

/**
 * One coloured piece of a rendered name. `atoms`/`bonds` say what to
 * highlight when the piece is hovered or explained.
 *
 * @typedef {object} NamePart
 * @property {string} text - The text of the piece.
 * @property {'locant'|'multiplier'|'prefix'|'stem'|'ending'|'punct'} kind - Part kind (the connecting `a` is a 'stem' part).
 * @property {number[]} atoms - Atom ids the piece refers to.
 * @property {number[]} bonds - Bond ids the piece refers to.
 */

/**
 * A candidate compared by a selection or numbering rule.
 *
 * @typedef {object} TraceCandidate
 * @property {number[]} atoms - Chain atom ids, in locant order when `direction` is set.
 * @property {'forward'|'reverse'} [direction] - Numbering direction ('forward' starts at the chain end with the smaller atom id).
 * @property {string} key - Unique, stable identifier of the candidate.
 * @property {number[]} [bonds] - Chain bond ids in the order of `atoms` (added by nameMolecule() for the explanation).
 */

/**
 * One rule application recorded in the trace (design.md §4.1). `values[i]`
 * is the compared datum of `candidatesBefore[i]`: a count (P0–P4), a
 * sorted locant list (N0–N3), the prefix locants flattened in citation
 * order, not sorted (N4), a list of citation keys `{alpha, numeric, italic}`
 * (N5), or the atom-id tuple (tie-break).
 *
 * @typedef {object} TraceStep
 * @property {string} rule - Rule id: 'P0' (most principal groups, I-31), 'P1'…'P4', 'N0' (lowest locants for the principal groups, I-31), 'N1'…'N5', 'TIE', or 'RING' (a ring parent: one candidate, its size as value; ring numbering steps N0–N4/TIE may follow).
 * @property {TraceCandidate[]} candidatesBefore - Candidates entering the rule.
 * @property {Array<number|number[]|object[]>} values - Compared values, aligned with candidatesBefore.
 * @property {TraceCandidate[]} survivors - Candidates left after the rule.
 * @property {string} [note] - Extra remark (Spanish when shown to the user).
 */

/**
 * Successful naming result (design.md §4.1).
 *
 * @typedef {object} NamingSuccess
 * @property {true} ok - Always true.
 * @property {string} name - Spanish name, default prefix style.
 * @property {NamePart[]} parts - The name split into coloured parts.
 * @property {NameStructure} structure - The language-neutral structure.
 * @property {{atoms: number[], bonds: number[]}} parent - Parent atoms and bonds in locant order.
 * @property {TraceStep[]} trace - Every rule applied, in order.
 * @property {{style: string, label: string, name: string, parts: NamePart[]}[]} alternatives - The name in the other prefix styles ('isopropil', 'pin', 'substituted', in that order), each from its own run of prefix naming and N4; empty without an isopropyl or isopropylidene group. A benzene derivative with a traditional name retained by IUPAC 2013 (`tolueno`, `estireno`) gets it last, style 'traditional' (aromatic.js).
 */

/**
 * Failed naming result.
 *
 * @typedef {object} NamingFailure
 * @property {false} ok - Always false.
 * @property {{code: string, message: string}} error - Error code and Spanish message.
 * @property {object} [groups] - Only on a `HETEROATOM` refusal: the characteristic groups, the principal group and each group's role and affixes (seniority.js GroupAnalysis, design.md §13.4 I-29). Detection never turns the refusal into a name.
 */

/**
 * @typedef {NamingSuccess|NamingFailure} NamingResult
 */

/**
 * Builds the structure of a numbered chain from its atoms, bonds and bond
 * orders, all in locant order.
 *
 * @param {number[]} atoms - Atom ids in locant order.
 * @param {number[]} bonds - Bond ids in locant order (one fewer than atoms).
 * @param {number[]} orders - Order of each bond in `bonds` (1, 2 or 3).
 * @returns {ChainStructure} The chain structure.
 * @throws {Error} When the arrays have inconsistent lengths or an order is invalid.
 */
export function buildChainStructure(atoms, bonds, orders) {
  if (atoms.length < 1 || bonds.length !== atoms.length - 1 || orders.length !== bonds.length) {
    throw new Error('buildChainStructure: need n atoms, n - 1 bonds and n - 1 orders');
  }
  const double = [];
  const triple = [];
  orders.forEach((order, i) => {
    const site = { locant: i + 1, bond: bonds[i], atoms: [atoms[i], atoms[i + 1]] };
    if (order === 2) {
      double.push(site);
    } else if (order === 3) {
      triple.push(site);
    } else if (order !== 1) {
      throw new Error(`buildChainStructure: invalid bond order ${order}`);
    }
  });
  return { length: atoms.length, atoms: [...atoms], bonds: [...bonds], double, triple };
} // End of function buildChainStructure()

/**
 * Sort value of a compound locant `low(high)` (IUPAC 2013 P-31.1.4.2.4, a
 * ring's closure bond: `1(6)`), used to order the sites of a ring for
 * citation (1, 1(6), 2…); the numbering rules do not use it (they compare
 * the closure bond as n). Encoded as `low + high / 1000`, so it stays a
 * number; locantText() writes it back.
 *
 * @param {number} low - The lower (cited) locant.
 * @param {number} high - The higher locant, cited in parentheses (below 1000).
 * @returns {number} The comparable value.
 */
export function compoundLocant(low, high) {
  return low + high / 1000;
}

/**
 * Writes a locant value as it is cited: an integer as is, a compound
 * locant (compoundLocant()) as `low(high)`. Non-numbers pass through.
 *
 * @param {number|string} value - A locant value.
 * @returns {string} The text: `3`, `1(6)`.
 */
export function locantText(value) {
  if (typeof value !== 'number' || Number.isInteger(value)) {
    return String(value);
  }
  const low = Math.floor(value);
  return `${low}(${Math.round((value - low) * 1000)})`;
}

/**
 * Comparable locant value of an unsaturation site: its locant, or the
 * compound locant of a ring's closure bond (`1(6)`).
 *
 * @param {{locant: number, closing?: number}} site - The site.
 * @returns {number} The value (see compoundLocant()).
 */
export function siteLocantValue(site) {
  return site.closing ? compoundLocant(site.locant, site.closing) : site.locant;
}

/**
 * Cited locant of an unsaturation site: `2`, or `1(6)` for a ring's closure bond.
 *
 * @param {{locant: number, closing?: number}} site - The site.
 * @returns {string} The text.
 */
export function siteLocantText(site) {
  return locantText(siteLocantValue(site));
}

/**
 * Builds the structure of a numbered ring from its atoms, bonds and bond
 * orders, all in ring (locant) order: bonds[i] joins atoms[i] and
 * atoms[i + 1], and the last bond closes the ring.
 *
 * @param {number[]} atoms - Atom ids in locant order (at least 3).
 * @param {number[]} bonds - Bond ids in ring order (as many as atoms; the last one is the closure).
 * @param {number[]} orders - Order of each bond in `bonds` (1, 2 or 3).
 * @returns {RingStructure} The ring structure.
 * @throws {Error} When the arrays have inconsistent lengths or an order is invalid.
 */
export function buildRingStructure(atoms, bonds, orders) {
  if (atoms.length < 3 || bonds.length !== atoms.length || orders.length !== bonds.length) {
    throw new Error('buildRingStructure: need n ≥ 3 atoms, n bonds and n orders');
  }
  const n = atoms.length;
  const double = [];
  const triple = [];
  orders.forEach((order, i) => {
    const site = i === n - 1
      ? { locant: 1, closing: n, bond: bonds[i], atoms: [atoms[i], atoms[0]] }
      : { locant: i + 1, bond: bonds[i], atoms: [atoms[i], atoms[i + 1]] };
    if (order === 2) {
      double.push(site);
    } else if (order === 3) {
      triple.push(site);
    } else if (order !== 1) {
      throw new Error(`buildRingStructure: invalid bond order ${order}`);
    }
  });
  // The closure site (1(n)) goes right after a plain locant 1: 1 < 1(n) < 2.
  const byLocant = (a, b) => siteLocantValue(a) - siteLocantValue(b);
  double.sort(byLocant);
  triple.sort(byLocant);
  return {
    kind: 'ring', length: n, atoms: [...atoms], bonds: [...bonds], closure: bonds[n - 1], double, triple,
  };
} // End of function buildRingStructure()

/**
 * Assembles the language-neutral name structure. The parent kind is taken
 * from the parent: 'ring' for a RingStructure, else 'chain'.
 *
 * @param {{parent: ChainStructure|RingStructure, prefixes?: PrefixGroup[], suffix?: SuffixStructure|null}} parts - The numbered parent, its grouped prefixes (citation order) and its suffix groups.
 * @returns {NameStructure} The name structure.
 */
export function buildNameStructure(parts) {
  return {
    parentKind: parts.parent.kind === 'ring' ? 'ring' : 'chain',
    parent: parts.parent,
    prefixes: parts.prefixes ? [...parts.prefixes] : [],
    suffix: parts.suffix && parts.suffix.locants.length > 0 ? parts.suffix : null,
  };
}

/**
 * Builds the suffix of a numbered parent from its suffix sites (the OH
 * groups on parent atoms, substituent.js suffixSites()): one SuffixLocant per
 * group, ascending locants (then oxygen id); null without sites.
 *
 * @param {{atom: number, attachAtom: number, bond: number}[]} sites - The suffix groups (carrying atom, heteroatom, bond).
 * @param {number[]} atoms - Parent atom ids in locant order.
 * @param {'alcohol'} [kind] - Group kind (default 'alcohol').
 * @returns {SuffixStructure|null} The suffix structure.
 */
export function buildSuffix(sites, atoms, kind = 'alcohol') {
  if (sites.length === 0) {
    return null;
  }
  const locantOf = new Map(atoms.map((atom, i) => [atom, i + 1]));
  const locants = sites.map((site) => ({ locant: locantOf.get(site.atom), atom: site.atom, attachAtom: site.attachAtom, bond: site.bond }));
  locants.sort((p, q) => p.locant - q.locant || p.attachAtom - q.attachAtom);
  return { kind, locants };
} // End of function buildSuffix()
