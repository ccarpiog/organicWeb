/**
 * @file Naming engine entry point: nameMolecule(mol) → result (design.md
 * §4.1). Pure: works on the graph topology only; never reads atom
 * coordinates or any browser global.
 *
 * Pipeline: validation → parent selection P1–P3 (parent.js) → substituents
 * of the remaining chains, named recursively (substituent.js) → N1, N2, P4,
 * N3, N4, N5 and tie-break (numbering.js; IUPAC 2013 compares ene/yne
 * locants before the number of substituents) → grouped prefixes in citation
 * order → rendering (render.js).
 *
 * The prefix style (design.md §1.1) changes prefix names, hence citation
 * order and N4; each style is a full re-run of prefix naming and numbering,
 * never a text substitution. When the molecule contains an isopropyl or
 * isopropylidene group, `alternatives` holds the names in the other two
 * styles. Doubly-attached (`-iliden`) substituents are named at any depth
 * (design.md §4.6): every valid acyclic hydrocarbon within the size caps
 * gets a name. A molecule with a ring that passes validation has exactly
 * one carbocycle, which is always the parent (ring vs chain, IUPAC 2013
 * P-44.1.2.2); rings.js names it with its side chains as substituents
 * (`ciclohexano`, `metilciclohexano`, `3-metilciclohex-1-eno`, design.md
 * §13.4 I-25, I-26), under the same prefix styles and alternatives. A
 * benzene ring (six carbons, alternating double and single ring bonds; at
 * most one substituent, validation refuses more) is named by aromatic.js:
 * `benceno`, `metilbenceno`, `isopropilbenceno` (I-28), with the traditional
 * `tolueno` / `estireno` as an extra alternative.
 *
 * Halogen derivatives (design.md §13.4 I-30) go through the same
 * pipelines: a halogen bonded to a carbon is a substituent prefix
 * (`fluoro`, `cloro`, `bromo`, `yodo`; substituent.js), never a chain atom
 * (parent.js works on the carbon skeleton): `clorometano`,
 * `2-bromo-1-cloropropano`, `clorociclohexano`, `clorobenceno`.
 *
 * Alcohols (design.md §13.4 I-31): an OH on a carbon is the principal
 * characteristic group, cited as the `-ol` suffix (`structure.suffix`): the
 * parent chain carries the most OH groups (P0, before the length; parent.js)
 * and they get the lowest locants (N0, before the multiple bonds;
 * numbering.js) — `etanol`, `propan-2-ol`, `butano-1,4-diol`,
 * `prop-2-en-1-ol`; an OH left on a branch is the `hidroxi` prefix of that
 * branch (`2-(hidroximetil)propano-1,3-diol`). On a ring the OH groups must
 * be on ring carbons (validation): `ciclohexanol`, `2-metilciclohexan-1-ol`,
 * and on benzene the retained `fenol`.
 *
 * Aldehydes and ketones (design.md §13.4 I-32) go through the same
 * machinery with the C=O as the principal group when present (aldehído >
 * cetona > alcohol, principal.js): `etanal`, `butanodial`, `propanona`,
 * `pentano-2,4-diona`, `4-oxopentanal`, `4-hidroxibutan-2-ona`,
 * `ciclohexanona`. The C=O carbon is a chain (or ring) carbon; an
 * aldehyde's locant is never cited. A C=O carbon that ends up bonded to the
 * parent as a branch (an acyl group, `acetil`) is refused with
 * `HETEROATOM` `acylSubstituent`, decided on the default-style name.
 * `propanona` also gets `propan-2-ona` (the IUPAC 2013 form) and the
 * traditional names `acetona`, `formaldehído`, `acetaldehído` are offered
 * for the bare molecules.
 *
 * Carboxylic acids (design.md §13.4 I-33) are the most senior group (ácido
 * > aldehído > cetona > alcohol): the –COOH carbon is a chain carbon, a
 * chain end, locant 1, never cited, and the name starts with the class word
 * `ácido`: `ácido etanoico`, `ácido 2-metilpropanoico`, `ácido
 * but-2-enoico`, `ácido butanodioico`, `ácido 4-oxopentanoico`, `ácido
 * 2-hidroxipropanoico`, `ácido 3-oxopropanoico` (an aldehyde end beside
 * the acid is `oxo-`). Validation refuses more than two –COOH (`manyAcids`)
 * and any acid with a ring (`ringAcid`); a –COOH left out of the suffix (a
 * `carboxi-` branch) is refused here as a safety net
 * (`carboxySubstituent`). The traditional `ácido fórmico`, `ácido acético`
 * and `ácido oxálico` are offered for the bare molecules.
 *
 * Ethers (design.md §13.4 I-34) are never a suffix: the O is not a chain
 * atom, so it splits the carbon skeleton into one piece per side, the
 * parent is chosen among the chains of every piece with the usual rules
 * (parent.js: the principal groups first, then the length…), and the O
 * with the other side is an alkoxy prefix (substituent.js):
 * `metoximetano`, `metoxietano`, `1-metoxipropano`, `2-metoxietan-1-ol`,
 * `ácido 2-metoxietanoico`, `4-metoxibutan-2-ona`, `metoxiciclohexano`,
 * `metoxibenceno` (with `anisol`), `1-isopropoxibutano` (with
 * `1-(propan-2-iloxi)butano` and `1-(1-metiletoxi)butano`). An ether R–O–R′
 * whose R and R′ are simple alkyl groups also gets its functional-class
 * name (`etil metil éter`, `dietil éter`; etherClassAlternative()). An
 * ether whose two identical halves each carry the principal group
 * (`HOCH₂CH₂OCH₂CH₂OH`) is refused (`symmetricEther`): IUPAC 2013 names it
 * with multiplicative nomenclature (`oxidi-`), not supported.
 *
 * Any other heteroatom (N, an O of an ester or anhydride, a peroxide) is
 * still refused (`HETEROATOM`), but the refusal carries `groups`: its
 * characteristic groups (groups.js), the principal group and the
 * suffix/prefix classification (seniority.js, design.md §13.4 I-29).
 * Successful results never have `groups`.
 */

import {
  validateForNaming, validationError, carboxylCarbons, etherOxygens, ACYL_SUBSTITUENT_MESSAGE, CARBOXY_SUBSTITUENT_MESSAGE,
  SYMMETRIC_ETHER_MESSAGE,
} from '../model/validate.js';
import { adjacency, hasCycle, rootedTreeKey } from '../model/graph.js';
import { selectParent } from './parent.js';
import {
  createNamingContext, collectSubstituents, groupPrefixes, nameKeyFunction, suffixSites, hasAcylPrefix, PREFIX_STYLES,
  substituentSubtree, nameSubstituent,
} from './substituent.js';
import { numberParent, chainBonds } from './numbering.js';
import { buildChainStructure, buildNameStructure, buildSuffix } from './structure.js';
import { renderName, suffixCount, suffixGroupIds } from './render.js';
import { nameRingWithStyle } from './rings.js';
import { hasBenzeneRing, nameBenzeneWithStyle, traditionalAlternative } from './aromatic.js';
import { analyzeGroups } from './seniority.js';
import { lexiconEs } from './lexicon.es.js';
import { carbonylTraditionalId, principalKindOf, isPrincipalOxygen } from './principal.js';


/** Error for an unexpected engine failure (a bug); nameMolecule never throws. */
export const INTERNAL_ERROR = Object.freeze({
  code: 'INTERNAL',
  message: 'Algo ha fallado al nombrar esta molécula. Prueba a dibujarla de nuevo.',
});

/**
 * Names a molecule. Never throws: every input gets a name or a structured
 * error; an unexpected failure (a bug) becomes the `INTERNAL` error, whose
 * `detail` (English, for developers) holds the exception message.
 *
 * @param {object} mol - The molecule to name (see model/molecule.js).
 * @param {{prefixStyle?: 'isopropil'|'pin'|'substituted'}} [options] - Prefix style (default 'isopropil', design.md §1.1).
 * @returns {object} The naming result (structure.js NamingResult, design.md §4.1).
 */
export function nameMolecule(mol, options = {}) {
  try {
    return nameValidated(mol, options);
  } catch (err) {
    return { ok: false, error: { ...INTERNAL_ERROR, detail: String(err && err.message) } };
  }
}

/**
 * Tells whether a name structure cites a retained prefix, at any depth.
 *
 * @param {{prefixes: object[]}} structure - A name or substituent structure.
 * @param {string[]} ids - Retained-name ids, e.g. ['isopropyl', 'isopropylidene'].
 * @returns {boolean} True when some prefix (or nested prefix) is one of those retained groups.
 */
export function hasRetainedPrefix(structure, ids) {
  return structure.prefixes.some((group) => ids.includes(group.substituent.retained) || hasRetainedPrefix(group.substituent, ids));
}

/** Retained prefixes whose presence triggers the alternative names (design.md §1.1). */
const STYLE_DEPENDENT_PREFIXES = Object.freeze(['isopropyl', 'isopropylidene']);

/**
 * Names a validated molecule under one prefix style: substituents,
 * numbering, grouping and rendering.
 *
 * @param {object} mol - A validated acyclic hydrocarbon, or a halogen derivative, alcohol, aldehyde, ketone, acid or ether of one.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {{chains: number[][], trace: object[]}} selection - Result of selectParent().
 * @param {string} style - Prefix style.
 * @returns {object} The naming result without `alternatives`.
 */
function nameWithStyle(mol, adj, selection, style) {
  const ctx = createNamingContext(mol, style, lexiconEs, adj);
  const substituentsByChain = new Map(selection.chains.map((chain) => [chain, collectSubstituents(mol, chain, ctx)]));
  /**
   * Describes the prefixes of one remaining chain for numbering.
   *
   * @param {number[]} chain - A chain from selection.chains.
   * @returns {{atom: number, key: string, citation: object|null}[]} Carrying atom, identity and citation key.
   */
  const prefixesOf = (chain) => substituentsByChain.get(chain).map((sub) => ({
    atom: sub.chainAtom,
    key: sub.key,
    citation: sub.citation,
  }));
  const nameKey = nameKeyFunction([...substituentsByChain.values()], lexiconEs);
  const suffixesOf = (chain) => suffixSites(mol, adj, chain, ctx.principal).map((site) => site.atom);
  const numbering = numberParent(mol, selection.chains, prefixesOf, { adj, nameKey, suffixesOf });
  const substituents = substituentsByChain.get(selection.chains[numbering.chainIndex]);
  const parent = buildChainStructure(numbering.atoms, numbering.bonds, numbering.orders);
  const structure = buildNameStructure({
    parent,
    prefixes: groupPrefixes(substituents, numbering.atoms),
    suffix: buildSuffix(suffixSites(mol, adj, numbering.atoms, ctx.principal), numbering.atoms, ctx.principal),
  });
  const { name, parts } = renderName(structure, lexiconEs);
  return {
    ok: true,
    name,
    parts,
    structure,
    parent: { atoms: [...parent.atoms], bonds: [...parent.bonds] },
    trace: withCandidateBonds([...selection.trace, ...numbering.trace], adj),
  };
} // End of function nameWithStyle()

/**
 * Adds to every trace candidate the ids of its chain bonds, in the order of
 * its atoms (`bonds`), so the explanation (src/explain/explain.js) can
 * highlight each compared chain without the molecule. Additive only: the
 * compared values and the chosen name are untouched.
 *
 * @param {object[]} trace - Trace steps (structure.js TraceStep).
 * @param {Map<number, object[]>} adj - Adjacency map of the molecule.
 * @returns {object[]} New trace steps whose candidates carry `bonds`.
 */
function withCandidateBonds(trace, adj) {
  const add = (candidate) => ({ ...candidate, bonds: chainBonds(adj, candidate.atoms).bonds });
  return trace.map((step) => ({
    ...step,
    candidatesBefore: step.candidatesBefore.map(add),
    survivors: step.survivors.map(add),
  }));
}

/**
 * Adds the characteristic-group analysis (seniority.js analyzeGroups(),
 * design.md §13.4 I-29) to a `HETEROATOM` refusal as `groups`, so the
 * explanation can show which groups there are, which one is principal and
 * which are suffixes or prefixes. Detection never enables naming: the
 * result stays a failure with the same error. Should detection itself fail
 * (a bug), the refusal is returned unchanged, without `groups`.
 *
 * @param {{ok: false, error: object}} failure - The HETEROATOM failure.
 * @param {object} mol - The validated-but-refused molecule.
 * @returns {object} The failure, with `groups` when detection succeeded.
 */
function withGroups(failure, mol) {
  try {
    return { ...failure, groups: analyzeGroups(mol) };
  } catch (err) {
    return failure;
  }
}

/**
 * Validates and names a molecule (the body of nameMolecule, which may throw
 * only on an internal bug). A molecule with one ring is named by rings.js
 * (aromatic.js for a benzene ring, which may add a traditional name as the
 * last alternative). When the default-style name contains
 * `isopropil` or `isopropiliden`, the names in the other two styles are
 * added as `alternatives`, each from its own run of prefix naming and
 * numbering (a style may need a nested `-iliden` group that the others
 * avoid: `1-metilidenbutil` vs `pent-1-en-2-il`).
 *
 * @param {object} mol - The molecule to name.
 * @param {object} options - Naming options (see nameMolecule).
 * @returns {object} The naming result.
 * @throws {RangeError} For an unknown prefix style (reported as INTERNAL).
 */
function nameValidated(mol, options) {
  const error = validateForNaming(mol);
  if (error) {
    return error.code === 'HETEROATOM' ? withGroups({ ok: false, error }, mol) : { ok: false, error };
  }
  const style = options.prefixStyle || PREFIX_STYLES[0];
  if (!PREFIX_STYLES.includes(style)) {
    throw new RangeError(`unknown prefix style ${style}`);
  }
  const cyclic = hasCycle(mol);
  const symmetric = cyclic ? null : symmetricEther(mol);
  if (symmetric) {
    return withGroups({ ok: false, error: symmetric }, mol);
  }
  const benzene = cyclic && hasBenzeneRing(mol);
  const adj = cyclic ? null : adjacency(mol);
  const selection = cyclic ? null : selectParent(mol);
  /**
   * Names the molecule under one prefix style: benzene (aromatic.js) or
   * another ring parent (rings.js) when validation let a ring through, else
   * the chain pipeline.
   *
   * @param {string} s - Prefix style.
   * @returns {object} The naming result without `alternatives`.
   */
  const nameIn = (s) => {
    if (benzene) {
      return nameBenzeneWithStyle(mol, s);
    }
    return cyclic ? nameRingWithStyle(mol, s) : nameWithStyle(mol, adj, selection, s);
  };
  const main = nameIn(style);
  const byStyle = new Map([[style, main]]);
  const named = (s) => {
    if (!byStyle.has(s)) {
      byStyle.set(s, nameIn(s));
    }
    return byStyle.get(s);
  };
  const alternatives = [];
  const reference = named(PREFIX_STYLES[0]);
  const others = hasRetainedPrefix(reference.structure, STYLE_DEPENDENT_PREFIXES)
    ? PREFIX_STYLES.filter((s) => s !== style)
    : [];
  // Every style that is emitted (main, reference, alternatives) is checked:
  // each runs its own prefix naming, so one may need an acyl branch the
  // others avoid.
  const acids = carboxylCarbons(mol);
  for (const s of new Set([style, PREFIX_STYLES[0], ...others])) {
    const acyl = hasAcylPrefix(named(s).structure);
    if (acyl) {
      return withGroups({ ok: false, error: acylError(acyl) }, mol);
    }
    if (acids.length > 0 && suffixCount(named(s).structure) !== acids.length) {
      return withGroups({ ok: false, error: carboxyError(acids) }, mol);
    }
  }
  const located = locantAlternative(main);
  if (located) {
    alternatives.push(located);
  }
  for (const other of others) {
    const result = named(other);
    alternatives.push({ style: other, label: lexiconEs.styleLabel(other), name: result.name, parts: result.parts });
  }
  const traditional = benzene ? traditionalAlternative(main) : carbonylAlternative(main);
  if (traditional) {
    alternatives.push(traditional);
  }
  const functionalClass = etherClassAlternative(mol, main);
  if (functionalClass) {
    alternatives.push(functionalClass);
  }
  return { ...main, alternatives };
} // End of function nameValidated()

/**
 * The HETEROATOM refusal of a molecule whose default-style name has an acyl
 * branch (substituent.js hasAcylPrefix(), design.md §13.4 I-32): a C=O
 * carbon bonded directly to the chain that carries it, which IUPAC 2013
 * names with acyl prefixes (`acetil`) the app does not support yet.
 *
 * @param {{atoms: number[], bonds: number[]}} acyl - The C=O atoms of the acyl branch.
 * @returns {{code: string, message: string, atoms: number[], reason: string}} The error.
 */
function acylError(acyl) {
  return validationError('HETEROATOM', { message: ACYL_SUBSTITUENT_MESSAGE, atoms: [...acyl.atoms], reason: 'acylSubstituent' });
}

/**
 * The HETEROATOM refusal of a molecule whose name would leave a –COOH out
 * of the parent's suffix (a `carboxi-` prefix, design.md §13.4 I-33). A
 * safety net: validation already refuses every molecule where this can
 * happen (`manyAcids`, `ringAcid`).
 *
 * @param {number[]} acids - The carboxyl carbons of the molecule.
 * @returns {{code: string, message: string, atoms: number[], reason: string}} The error.
 */
function carboxyError(acids) {
  return validationError('HETEROATOM', { message: CARBOXY_SUBSTITUENT_MESSAGE, atoms: [...acids], reason: 'carboxySubstituent' });
}

/**
 * The alternative that writes the locants the main name omits, when IUPAC
 * 2013 cites them in the preferred name: `propan-2-ona` for `propanona`
 * (lexicon.es.js chainOmitsPrefixLocants(), design.md §13.4 I-32); null for
 * every other name.
 *
 * @param {object} result - The main naming result (NamingSuccess without alternatives).
 * @returns {{style: string, label: string, name: string, parts: object[]}|null} The alternative.
 */
function locantAlternative(result) {
  const { structure } = result;
  if (structure.parentKind !== 'chain' || !structure.suffix || structure.suffix.kind !== 'ketone' || structure.parent.length !== 3) {
    return null;
  }
  const cited = renderName(structure, lexiconEs, { citeLocants: true });
  return cited.name === result.name ? null : { style: 'locants', label: lexiconEs.styleLabel('locants'), ...cited };
}

/**
 * The traditional-name alternative of a small carbonyl compound or acid
 * (principal.js carbonylTraditionalId(): `formaldehído`, `acetaldehído`,
 * `acetona`, `ácido fórmico`, `ácido acético`, `ácido oxálico`),
 * listed last under "Otras formas válidas" (design.md §13.1), or null. Its
 * one part refers to every atom and bond of the molecule, like a benzene's
 * traditional name (aromatic.js traditionalAlternative()).
 *
 * @param {object} result - The main naming result.
 * @returns {{style: string, label: string, name: string, parts: object[]}|null} The alternative.
 */
function carbonylAlternative(result) {
  const id = carbonylTraditionalId(result.structure);
  if (!id) {
    return null;
  }
  const name = lexiconEs.traditionalName(id);
  const group = suffixGroupIds(result.structure.suffix);
  const atoms = [...new Set([...result.parent.atoms, ...group.atoms])];
  const bonds = [...result.parent.bonds, ...group.bonds];
  return { style: 'traditional', label: lexiconEs.traditionalLabel(id), name, parts: [{ text: name, kind: 'stem', atoms, bonds }] };
} // End of function carbonylAlternative()

/**
 * The HETEROATOM refusal of an acyclic ether whose two sides are identical
 * and carry the principal group (design.md §13.4 I-34): for
 * HO–CH₂CH₂–O–CH₂CH₂–OH IUPAC 2013 uses multiplicative nomenclature,
 * `2,2′-oxidi(etan-1-ol)` (P-15.3, P-51.3), which the app does not support;
 * the substitutive `2-(2-hidroxietoxi)etan-1-ol` would not be the preferred
 * name. Two sides are identical when their rooted tree keys, seen from the
 * O, are equal (graph.js rootedTreeKey(): elements and bond orders
 * included). Null when no ether is like that (and always without a
 * principal group: `etoxietano` is the preferred name).
 *
 * @param {object} mol - A validated acyclic molecule.
 * @returns {{code: string, message: string, atoms: number[], reason: string}|null} The error, or null.
 */
function symmetricEther(mol) {
  const ethers = etherOxygens(mol);
  if (ethers.length === 0) {
    return null;
  }
  const adj = adjacency(mol);
  const principal = principalKindOf(mol, adj);
  if (principal === null) {
    return null;
  }
  for (const oxygen of ethers) {
    const [a, b] = adj.get(oxygen).map((n) => n.atom);
    if (rootedTreeKey(mol, a, oxygen, adj) !== rootedTreeKey(mol, b, oxygen, adj)) {
      continue;
    }
    const side = substituentSubtree(adj, oxygen, a).atoms;
    if (side.some((id) => isPrincipalOxygen(mol, adj, id, principal))) {
      const atoms = [oxygen, ...side, ...substituentSubtree(adj, oxygen, b).atoms].sort((p, q) => p - q);
      return validationError('HETEROATOM', { message: SYMMETRIC_ETHER_MESSAGE, atoms, reason: 'symmetricEther' });
    }
  } // End of the loop over the ether oxygens
  return null;
} // End of function symmetricEther()

/**
 * The prefix of one side of a simple ether as used in its functional-class
 * name (design.md §13.4 I-34): an unbranched saturated alkyl group bonded
 * by its end (`metil`, `etil`, `propil`…), or the retained `isopropil` /
 * `tert-butil`; null for anything else (a branched, unsaturated or
 * substituted group).
 *
 * @param {object} sub - The side named as a substituent of the O (substituent.js nameSubstituent(), default style).
 * @returns {string|null} The Spanish prefix.
 */
function etherSideName(sub) {
  if (sub.retained === 'isopropyl' || sub.retained === 'tert-butyl') {
    const { italic, text } = lexiconEs.retainedPrefix(sub.retained);
    return `${italic}${text}`;
  }
  const { chain } = sub;
  if (sub.retained || sub.prefixes.length > 0 || sub.freeValence.locant !== 1 || chain.double.length + chain.triple.length > 0) {
    return null;
  }
  return lexiconEs.alkylPrefix(chain.length);
} // End of function etherSideName()

/**
 * The functional-class alternative of a simple ether R–O–R′ (design.md
 * §13.4 I-34): the two group names in alphabetical order (`tert-` not
 * counted; on a tie the plain name first) and the word `éter` — `etil
 * metil éter`, `butil isopropil éter`, `tert-butil metil éter`, `butil
 * tert-butil éter`; `dietil éter`, `dimetil éter` when both
 * are the same. IUPAC 2013 accepts these names in general nomenclature
 * (P-63.2.2.1) and many Spanish textbooks teach them, so one is listed
 * under "Otras formas válidas" after the others (design.md §13.1: the
 * substitutive name comes first). Offered only when the molecule is one
 * ether O between two simple alkyl groups (etherSideName(): every other
 * atom a carbon, no ring, no multiple bond, no branch other than
 * isopropyl or tert-butyl). Its one part refers to every atom and bond.
 * Null otherwise.
 *
 * @param {object} mol - The validated molecule.
 * @param {object} result - Its naming result.
 * @returns {{style: string, label: string, name: string, parts: object[]}|null} The alternative.
 */
function etherClassAlternative(mol, result) {
  const oxygens = [...mol.atoms.values()].filter((atom) => atom.element !== 'C');
  if (oxygens.length !== 1 || result.structure.parentKind !== 'chain' || etherOxygens(mol).length !== 1) {
    return null;
  }
  const oxygen = oxygens[0].id;
  const adj = adjacency(mol);
  const sides = adj.get(oxygen).map((n) => etherSideName(nameSubstituent(mol, oxygen, n.atom)));
  if (sides.includes(null)) {
    return null;
  }
  const letters = (name) => name.replace(/^tert-/, '');
  // Alphabetical without `tert-`; on equal letters the plain name first (`butil tert-butil éter`).
  sides.sort((x, y) => (letters(x) === letters(y) ? x.length - y.length : (letters(x) < letters(y) ? -1 : 1)));
  const word = lexiconEs.etherClassWord;
  const name = sides[0] === sides[1] ? `${lexiconEs.multiplier(2)}${sides[0]} ${word}` : `${sides[0]} ${sides[1]} ${word}`;
  const parts = [{ text: name, kind: 'stem', atoms: [...mol.atoms.keys()], bonds: [...mol.bonds.keys()] }];
  return { style: 'functionalClass', label: lexiconEs.styleLabel('functionalClass'), name, parts };
} // End of function etherClassAlternative()
