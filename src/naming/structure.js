/**
 * @file Contracts of the naming engine: the result of nameMolecule() (design.md
 * §4.1), the trace step shape, and the language-neutral name structure
 * (§4.7), plus the builders that assemble a structure from a numbered chain.
 *
 * The name structure holds data only (lengths, locants, atom and bond ids);
 * never words. A lexicon (lexicon.es.js, later lexicon.en.js) and render.js
 * turn it into text, so the same structure can be rendered in any language.
 * Later phases extend these shapes (nested substituents, `-iliden`, prefix
 * styles); they must add fields, not redesign existing ones.
 */

/**
 * One multiple bond of a chain, located by the lower locant of its two atoms.
 *
 * @typedef {object} UnsaturationSite
 * @property {number} locant - Lower locant of the bond's two atoms (1-based).
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
 */

/**
 * The language-neutral description of one substituent prefix.
 * Retained names (`isopropil`, `tert-butil`) are flagged by `retained`, never
 * encoded as text.
 *
 * @typedef {object} SubstituentStructure
 * @property {ChainStructure} chain - The substituent's own numbered chain.
 * @property {PrefixGroup[]} prefixes - Its own grouped prefixes, in citation order.
 * @property {{locant: number, order: number}} freeValence - Locant and order of the free valence.
 * @property {string|null} [retained] - Retained-name id, e.g. 'isopropyl', 'tert-butyl'.
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
 * The language-neutral name structure (design.md §4.7).
 *
 * @typedef {object} NameStructure
 * @property {ChainStructure} parent - The numbered parent chain.
 * @property {PrefixGroup[]} prefixes - Grouped substituent prefixes in citation order (empty for an unbranched molecule).
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
 */

/**
 * One rule application recorded in the trace (design.md §4.1). `values[i]`
 * is the compared datum of `candidatesBefore[i]`: a count (P1–P4), a
 * sorted locant list (N1–N3), a list of locant lists in citation order (N4),
 * or the atom-id tuple (tie-break).
 *
 * @typedef {object} TraceStep
 * @property {string} rule - Rule id: 'P1'…'P4', 'N1'…'N4', 'TIE'.
 * @property {TraceCandidate[]} candidatesBefore - Candidates entering the rule.
 * @property {Array<number|number[]|number[][]>} values - Compared values, aligned with candidatesBefore.
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
 * @property {{style: string, label: string, name: string, parts: NamePart[]}[]} alternatives - Other prefix styles (empty without an isopropyl group).
 */

/**
 * Failed naming result.
 *
 * @typedef {object} NamingFailure
 * @property {false} ok - Always false.
 * @property {{code: string, message: string}} error - Error code and Spanish message.
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
 * Assembles the language-neutral name structure.
 *
 * @param {{parent: ChainStructure, prefixes?: PrefixGroup[]}} parts - The numbered parent and its grouped prefixes (citation order).
 * @returns {NameStructure} The name structure.
 */
export function buildNameStructure(parts) {
  return { parent: parts.parent, prefixes: parts.prefixes ? [...parts.prefixes] : [] };
}
