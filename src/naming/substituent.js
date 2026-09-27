/**
 * @file Substituents of a chain and their recursive naming (design.md
 * §4.5–4.6).
 *
 * For each chain atom, each neighbour outside the chain roots a substituent
 * subtree. The attachment atom and the attachment bond order are recorded as
 * data. Each substituent also gets a canonical identity key (equal keys are
 * grouped under one prefix: `dimetil`, `di(propan-2-il)`, `bis(2-metilpropil)`).
 *
 * The substituent's own chain is chosen among the paths of the subtree that
 * **contain the attachment atom** (not necessarily as an endpoint, which is
 * what yields `propan-2-il`), by: P1 longest; P2 most multiple bonds; P3 most
 * double bonds; then the numbering cascade of numbering.js with the free
 * valence first: FV lowest free-valence locant, N1, N2, P4 most
 * substituents, N3, N4, N5, tie-break. Its own substituents are named the
 * same way, recursively.
 *
 * Prefix styles (design.md §1.1): 'isopropil' (default) cites –CH(CH₃)₂ as
 * the retained `isopropil`; 'pin' uses the 2013 preferred prefixes
 * (`propan-2-il`); 'substituted' names every group from a chain that starts
 * at the attachment atom (free valence at 1: `1-metiletil`,
 * `1,1-dimetiletil`). `tert-butil` is retained in 'isopropil' and 'pin'.
 *
 * Doubly-attached substituents (design.md §4.6), at any depth, are named the
 * same way with the free valence of order 2 (`-iliden`: `metiliden`,
 * `propan-2-iliden`, `1-metilidenbutil` nested); =C(CH₃)₂ is the retained
 * `isopropiliden` in the 'isopropil' style. The connecting double bond is
 * never part of a chain, so it counts in no P2/P3/N1/N2 comparison; the
 * group is one prefix at one locant (P4, N3, N4).
 *
 * Halogen atoms (design.md §13.4 I-30) are substituents too, at any depth:
 * a halogen bonded to a chain atom is one prefix (`fluoro`, `cloro`,
 * `bromo`, `yodo`: a SubstituentStructure with `halogen` set and no chain),
 * alphabetised with the others (Spanish order: bromo < cloro < etil <
 * fluoro < metil < yodo) and counted by P4, N3 and N4 like any prefix; it is
 * never part of a chain (`(clorometil)`, `2-cloroetil`).
 *
 * OH groups (design.md §13.4 I-31) on the parent are its principal groups,
 * cited as the `-ol` suffix (suffixSites()), never as substituents
 * (collectSubstituents() leaves them out); an OH on a substituent chain is a
 * simple prefix of that group, `hidroxi` (hydroxySubstituent():
 * `(hidroximetil)`, `(2-hidroxietil)`), alphabetised under h. Substituent
 * chains, like the parent, run over carbons only.
 *
 * Aldehydes and ketones (design.md §13.4 I-32) follow the same scheme with
 * the principal kind of the molecule (principal.js: aldehído > cetona >
 * alcohol): the oxygen groups of that kind on the parent are the suffix
 * (`-al`, `-ona`, `-ol`; suffixSites()), every other oxygen is a simple
 * prefix, on the parent or inside a branch — `oxo` for a C=O
 * (oxoSubstituent(): `4-oxopentanal`, `(2-oxopropil)`), `hidroxi` for an OH
 * (`4-hidroxibutan-2-ona`). The C=O carbon itself is always a chain atom;
 * when it is the attachment atom of a branch (an acyl group, `1-oxoetil`
 * for acetilo), hasAcylPrefix() finds it and the engine refuses the name.
 * Pure: topology only.
 */

import { adjacency, rootedTreeKey } from '../model/graph.js';
import { isHalogen } from '../model/elements.js';
import { buildChainStructure } from './structure.js';
import { numberParent, compareCitationKeys } from './numbering.js';
import { citationKey, prefixNameKey } from './render.js';
import { lexiconEs } from './lexicon.es.js';
import { principalKindOf, isPrincipalOxygen, isSuffixOxygen } from './principal.js';

/** Bond-order symbols that prefix a substituent identity key. */
const ATTACH_SYMBOL = { 1: '-', 2: '=', 3: '#' };

/** Prefix styles accepted by nameMolecule (design.md §1.1); the first is the default. */
export const PREFIX_STYLES = Object.freeze(['isopropil', 'pin', 'substituted']);

/**
 * Rooted canonical keys (graph.js rootedTreeKey, seen from the carrying
 * atom) of the groups that have a retained or a common name. Topology, not
 * strings of a name, identifies them.
 */
const GROUP_SHAPES = Object.freeze({
  'C(-C(),-C())': 'isopropyl',
  'C(-C(),-C(),-C())': 'tert-butyl',
  'C(=C())': 'vinyl',
  'C(-C(=C()))': 'allyl',
  'C(-C(-C(),-C()))': 'isobutyl',
  'C(-C(),-C(-C()))': 'sec-butyl',
});

/**
 * Ids of the same shapes attached by a double bond (`-ilideno` groups):
 * `isopropilideno` (retained in the 'isopropil' style), `vinilideno`
 * (=C=CH₂), `alilideno`, `isobutilideno`, `sec-butilideno` (common names,
 * explanations only). tert-butyl cannot be doubly attached.
 */
const YLIDENE_SHAPES = Object.freeze({
  isopropyl: 'isopropylidene',
  vinyl: 'vinylidene',
  allyl: 'allylidene',
  isobutyl: 'isobutylidene',
  'sec-butyl': 'sec-butylidene',
});

/**
 * Creates the naming context shared by every substituent of one naming run
 * (one molecule, one prefix style). Named substituents are cached per
 * (carrying atom, attachment atom) pair.
 *
 * @param {object} mol - A validated acyclic hydrocarbon.
 * @param {string} [style] - Prefix style: 'isopropil' (default), 'pin' or 'substituted'.
 * @param {object} [lexicon] - The lexicon (citation order depends on the prefix words).
 * @param {Map<number, object[]>} [adj] - Adjacency map (computed when omitted).
 * @returns {{mol: object, adj: Map<number, object[]>, style: string, lexicon: object, cache: Map<string, object>, principal: string|null}} The context (`principal`: the principal oxygen kind, principal.js).
 * @throws {RangeError} For an unknown style.
 */
export function createNamingContext(mol, style = PREFIX_STYLES[0], lexicon = lexiconEs, adj = adjacency(mol)) {
  if (!PREFIX_STYLES.includes(style)) {
    throw new RangeError(`unknown prefix style ${style}`);
  }
  return { mol, adj, style, lexicon, cache: new Map(), principal: principalKindOf(mol, adj) };
}

/**
 * Collects the atoms and bonds of the subtree that starts at `attachAtom`
 * and leads away from `chainAtom` (the connecting bond is not included).
 *
 * @param {Map<number, {atom: number, bond: number, order: number}[]>} adj - Adjacency map (graph.js).
 * @param {number} chainAtom - The carrying chain atom.
 * @param {number} attachAtom - The substituent atom bonded to it.
 * @returns {{atoms: number[], bonds: number[]}} Atom ids (breadth-first from attachAtom) and bond ids (ascending).
 */
export function substituentSubtree(adj, chainAtom, attachAtom) {
  const seen = new Set([chainAtom, attachAtom]);
  const atoms = [attachAtom];
  const bonds = [];
  for (let i = 0; i < atoms.length; i += 1) {
    for (const n of adj.get(atoms[i])) {
      if (!seen.has(n.atom)) {
        seen.add(n.atom);
        atoms.push(n.atom);
        bonds.push(n.bond);
      }
    }
  }
  return { atoms, bonds: bonds.sort((p, q) => p - q) };
} // End of function substituentSubtree()

/**
 * Lists the candidate chains of a substituent: paths of its subtree that
 * contain the attachment atom and cannot be extended. Each is either an arm
 * (attachment atom → a leaf) or two arms in different branches joined at the
 * attachment atom. In the 'substituted' style only arms are candidates (the
 * free valence must be at a chain end).
 *
 * @param {Map<number, object[]>} adj - Adjacency map.
 * @param {number} chainAtom - The carrying atom (outside the subtree).
 * @param {number} attachAtom - The attachment atom.
 * @param {boolean} armsOnly - Whether only arms are candidates.
 * @param {function(number): boolean} [skip] - Atoms that are never chain atoms (halogens); default none.
 * @returns {number[][]} The candidate chains as atom-id paths.
 */
export function substituentChainCandidates(adj, chainAtom, attachAtom, armsOnly, skip = () => false) {
  const parent = new Map([[attachAtom, chainAtom]]);
  const branchOf = new Map();
  const queue = [attachAtom];
  const leafAtoms = [];
  for (let i = 0; i < queue.length; i += 1) {
    const atom = queue[i];
    const children = adj.get(atom).filter((n) => n.atom !== parent.get(atom) && !skip(n.atom));
    for (const n of children) {
      parent.set(n.atom, atom);
      branchOf.set(n.atom, atom === attachAtom ? n.atom : branchOf.get(atom));
      queue.push(n.atom);
    }
    if (children.length === 0 && atom !== attachAtom) {
      leafAtoms.push(atom);
    }
  } // End of the breadth-first walk of the subtree
  if (leafAtoms.length === 0) {
    return [[attachAtom]];
  }
  const arm = (leaf) => {
    const path = [];
    for (let atom = leaf; atom !== attachAtom; atom = parent.get(atom)) {
      path.unshift(atom);
    }
    return [attachAtom, ...path];
  };
  const arms = leafAtoms.map((leaf) => ({ leaf, path: arm(leaf) }));
  const candidates = arms.map(({ path }) => path);
  if (!armsOnly) {
    for (let i = 0; i < arms.length; i += 1) {
      for (let j = i + 1; j < arms.length; j += 1) {
        if (branchOf.get(arms[i].leaf) !== branchOf.get(arms[j].leaf)) {
          candidates.push([...arms[i].path].reverse().concat(arms[j].path.slice(1)));
        }
      }
    }
  } // End of the pairing of arms from different branches
  return candidates;
} // End of function substituentChainCandidates()

/**
 * Keeps the chains with the highest value of a count (P1–P3 on substituent chains).
 *
 * @param {number[][]} chains - Candidate chains.
 * @param {function(number[]): number} count - The count of a chain.
 * @returns {number[][]} The chains with the maximum count.
 */
function keepMax(chains, count) {
  const values = chains.map(count);
  const best = Math.max(...values);
  return chains.filter((_, i) => values[i] === best);
}

/**
 * Counts the bonds along a chain whose order satisfies a test.
 *
 * @param {Map<number, object[]>} adj - Adjacency map.
 * @param {number[]} atoms - The chain.
 * @param {function(number): boolean} test - Which bond orders to count.
 * @returns {number} The count.
 */
function countBonds(adj, atoms, test) {
  let count = 0;
  for (let i = 0; i + 1 < atoms.length; i += 1) {
    const link = adj.get(atoms[i]).find((n) => n.atom === atoms[i + 1]);
    count += test(link.order) ? 1 : 0;
  }
  return count;
}

/**
 * Lists every substituent hanging from a chain (a parent chain, or the
 * chain of a substituent when `exclude` is its carrying atom), each named
 * recursively under the context's style. On a parent (`parent` true) an
 * oxygen of the principal kind (an OH of `-ol`, the C=O of `-al` / `-ona`)
 * is a suffix group (suffixSites()), not a substituent, and is left out;
 * every other oxygen is a prefix: `hidroxi` for an OH
 * (hydroxySubstituent()), `oxo` for a C=O (oxoSubstituent()).
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number[]} chainAtoms - The chain's atom ids.
 * @param {number|null} [exclude] - An atom outside the chain that is not a substituent (the carrying atom of a substituent chain).
 * @param {boolean} [parent] - True for the parent chain or ring, whose OH groups are suffixes (default false).
 * @returns {{chainAtom: number, attachAtom: number, bond: number, order: number, atoms: number[], bonds: number[], multipleBonds: number[], key: string, structure: object, citation: object}[]} One entry per substituent, in chain order then attachment-atom order.
 */
export function substituentsOf(ctx, chainAtoms, exclude = null, parent = false) {
  const inChain = new Set(chainAtoms);
  const result = [];
  for (const chainAtom of chainAtoms) {
    for (const n of ctx.adj.get(chainAtom)) {
      if (inChain.has(n.atom) || n.atom === exclude) {
        continue;
      }
      const element = ctx.mol.atoms.get(n.atom).element;
      if (parent && isPrincipalOxygen(ctx.mol, ctx.adj, n.atom, ctx.principal)) {
        continue; // A suffix group of the parent (`-ol`, `-al`, `-ona`), not a prefix.
      }
      if (isHalogen(element) || element === 'O') {
        let structure = halogenSubstituent(n.atom, element);
        if (element === 'O') {
          structure = n.order === 2 ? oxoSubstituent(n.atom) : hydroxySubstituent(n.atom);
        }
        result.push({
          chainAtom,
          attachAtom: n.atom,
          bond: n.bond,
          order: n.order,
          atoms: [n.atom],
          bonds: [],
          multipleBonds: [],
          key: `${ATTACH_SYMBOL[n.order]}${element}()`,
          structure,
          citation: citationKey(structure, ctx.lexicon),
        });
        continue;
      }
      const subtree = substituentSubtree(ctx.adj, chainAtom, n.atom);
      const inSubtree = new Set(subtree.bonds);
      // Carbon–carbon multiple bonds only: a C=O inside the branch is its `oxo` prefix, not an unsaturation.
      const isCarbon = (id) => ctx.mol.atoms.get(id).element === 'C';
      const multipleBonds = [...new Set(subtree.atoms.filter(isCarbon).flatMap((atom) => ctx.adj.get(atom)
        .filter((link) => link.order > 1 && inSubtree.has(link.bond) && isCarbon(link.atom))
        .map((link) => link.bond)))].sort((p, q) => p - q);
      const structure = nameSubstituentIn(ctx, chainAtom, n.atom, n.order);
      result.push({
        chainAtom,
        attachAtom: n.atom,
        bond: n.bond,
        order: n.order,
        atoms: subtree.atoms,
        bonds: subtree.bonds,
        multipleBonds,
        key: ATTACH_SYMBOL[n.order] + rootedTreeKey(ctx.mol, n.atom, chainAtom, ctx.adj),
        structure,
        citation: citationKey(structure, ctx.lexicon),
      });
    } // End of the loop over the neighbours of one chain atom
  } // End of the loop over the chain atoms
  return result;
} // End of function substituentsOf()

/**
 * The substituent structure of a halogen atom (design.md §13.4 I-30): the
 * prefix `fluoro`, `cloro`, `bromo` or `yodo` (lexicon halogenPrefix()),
 * simple (never enclosed; `di`, `tri`… when repeated), with no chain and no
 * prefixes of its own. `freeValence` is the single bond to the carrying
 * carbon.
 *
 * @param {number} atom - The halogen atom id.
 * @param {string} element - 'F', 'Cl', 'Br' or 'I'.
 * @returns {object} The SubstituentStructure (structure.js) with `halogen` set.
 */
export function halogenSubstituent(atom, element) {
  return {
    halogen: element,
    chain: null,
    prefixes: [],
    freeValence: { locant: 1, order: 1 },
    retained: null,
    commonName: null,
    atoms: [atom],
    bonds: [],
  };
}

/**
 * The substituent structure of an OH group cited as a prefix (design.md
 * §13.4 I-31): `hidroxi` (lexicon groupPrefix('alcohol')), a simple prefix
 * like a halogen (never enclosed; `di`, `tri`… when repeated), with no chain
 * and no prefixes. Only an OH on a substituent chain is cited this way: on
 * the parent it is the principal group, cited as the `-ol` suffix.
 *
 * @param {number} atom - The oxygen atom id.
 * @returns {object} The SubstituentStructure (structure.js) with `hydroxy` set.
 */
export function hydroxySubstituent(atom) {
  return {
    hydroxy: true,
    chain: null,
    prefixes: [],
    freeValence: { locant: 1, order: 1 },
    retained: null,
    commonName: null,
    atoms: [atom],
    bonds: [],
  };
} // End of function hydroxySubstituent()

/**
 * The substituent structure of a C=O oxygen cited as a prefix (design.md
 * §13.4 I-32): `oxo` (lexicon groupPrefix('ketone')), a simple prefix like
 * `hidroxi` (never enclosed; `di`, `tri`… when repeated), with no chain and
 * no prefixes; the connecting bond is the double bond of the C=O
 * (`freeValence.order` 2). Its carbon is a chain atom that carries it: a
 * ketone when the aldehyde is principal (`4-oxopentanal`), or any C=O
 * inside a branch (`(2-oxopropil)`).
 *
 * @param {number} atom - The oxygen atom id.
 * @returns {object} The SubstituentStructure (structure.js) with `oxo` set.
 */
export function oxoSubstituent(atom) {
  return {
    oxo: true,
    chain: null,
    prefixes: [],
    freeValence: { locant: 1, order: 2 },
    retained: null,
    commonName: null,
    atoms: [atom],
    bonds: [],
  };
} // End of function oxoSubstituent()

/**
 * Tells whether a name structure has an acyl branch at any depth: a branch
 * whose attachment atom carries an `oxo` prefix, i.e. a C=O carbon bonded
 * directly to the chain that carries the branch (`1-oxoetil`, acetilo).
 * IUPAC 2013 names such branches with acyl prefixes (`acetil`,
 * `propanoil`), which the app does not support yet (design.md §13.4 I-32),
 * so the engine refuses these molecules (ACYL_SUBSTITUENT_MESSAGE).
 *
 * @param {{prefixes: object[]}} structure - A name or substituent structure.
 * @returns {{atoms: number[], bonds: number[]}|null} The C=O atoms (carbon, oxygen) and bonds of the first acyl branch found, or null.
 */
export function hasAcylPrefix(structure) {
  for (const group of structure.prefixes) {
    const sub = group.substituent;
    if (!sub.chain) {
      continue;
    }
    const attach = sub.chain.atoms[sub.freeValence.locant - 1];
    for (const inner of sub.prefixes) {
      const site = inner.substituent.oxo ? inner.locants.find((l) => l.atom === attach) : null;
      if (site) {
        return { atoms: [site.atom, site.attachAtom], bonds: [site.bond] };
      }
    }
    const nested = hasAcylPrefix(sub);
    if (nested) {
      return nested;
    }
  } // End of the loop over the prefix groups
  return null;
} // End of function hasAcylPrefix()

/**
 * The suffix groups of a parent (design.md §13.4 I-31, I-32, I-33): every
 * oxygen of the principal kind bonded to one of its atoms — the OH of
 * `-ol`, or the C=O of `-al` / `-ona`, whose carbon is the parent atom; a
 * –COOH (`ácido …oico`) is one site, its C=O oxygen, carrying its OH
 * oxygen as `hydroxyAtom` / `hydroxyBond`.
 *
 * @param {object} mol - A validated molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number[]} atoms - The parent's atom ids.
 * @param {string|null} [principal] - The principal oxygen kind (default: principalKindOf() of the molecule).
 * @returns {{atom: number, attachAtom: number, bond: number, hydroxyAtom?: number, hydroxyBond?: number}[]} One site per group: carrying atom, oxygen, bond (and the OH of a –COOH); in parent-atom order.
 */
export function suffixSites(mol, adj, atoms, principal = principalKindOf(mol, adj)) {
  const sites = [];
  for (const atom of atoms) {
    for (const n of adj.get(atom)) {
      if (!isSuffixOxygen(mol, adj, n.atom, principal)) {
        continue;
      }
      const site = { atom, attachAtom: n.atom, bond: n.bond };
      if (principal === 'acid') {
        const hydroxy = adj.get(atom).find((m) => m.order === 1 && isPrincipalOxygen(mol, adj, m.atom, principal));
        site.hydroxyAtom = hydroxy.atom;
        site.hydroxyBond = hydroxy.bond;
      }
      sites.push(site);
    }
  } // End of the loop over the parent atoms
  return sites;
} // End of function suffixSites()

/**
 * Builds the N5 complete-name key function for numberParent(): it renders a
 * candidate's groups (`{key, citation, locants}`, identity keys from
 * substituentsOf()) with render.js prefixNameKey().
 *
 * @param {object[][]} substituentLists - The substituentsOf() entries of every candidate chain.
 * @param {object} lexicon - The lexicon.
 * @returns {function({key: string, locants: number[]}[]): {alpha: string, numeric: number[], italic: string}} The key function.
 */
export function nameKeyFunction(substituentLists, lexicon) {
  const structureOf = new Map();
  for (const list of substituentLists) {
    for (const sub of list) {
      structureOf.set(sub.key, sub.structure);
    }
  }
  return (groups) => prefixNameKey(groups.map((g) => ({
    substituent: structureOf.get(g.key),
    locants: g.locants.map((locant) => ({ locant })),
  })), lexicon);
}

/**
 * Groups the substituents of a numbered chain into prefix groups, in
 * citation (alphanumerical) order, each occurrence with its locant.
 *
 * @param {object[]} substituents - Entries from substituentsOf(), all with a structure.
 * @param {number[]} atoms - Chain atom ids in locant order.
 * @returns {object[]} The prefix groups (structure.js PrefixGroup).
 */
export function groupPrefixes(substituents, atoms) {
  const locantOf = new Map(atoms.map((atom, i) => [atom, i + 1]));
  const byKey = new Map();
  for (const sub of substituents) {
    if (!byKey.has(sub.key)) {
      byKey.set(sub.key, { key: sub.key, substituent: sub.structure, locants: [], citation: sub.citation });
    }
    byKey.get(sub.key).locants.push({
      locant: locantOf.get(sub.chainAtom),
      atom: sub.chainAtom,
      attachAtom: sub.attachAtom,
      bond: sub.bond,
      order: sub.order,
      atoms: [...sub.atoms],
      bonds: [...sub.bonds],
      multipleBonds: [...sub.multipleBonds],
    });
  }
  const groups = [...byKey.values()];
  groups.forEach((group) => group.locants.sort((p, q) => p.locant - q.locant || p.attachAtom - q.attachAtom));
  groups.sort((g, h) => compareCitationKeys(g.citation, h.citation) || (g.key < h.key ? -1 : 1));
  return groups.map(({ key, substituent, locants }) => ({ key, substituent, locants }));
} // End of function groupPrefixes()

/**
 * Names the substituent that starts at `attachAtom` (attached to `chainAtom`
 * by a bond of the given order) under the context's style. Results are
 * cached in the context.
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number} chainAtom - The carrying atom.
 * @param {number} attachAtom - The attachment atom.
 * @param {number} order - Order of the connecting bond (1 → `-il`, 2 → `-iliden`).
 * @returns {object} The SubstituentStructure (structure.js).
 */
function nameSubstituentIn(ctx, chainAtom, attachAtom, order) {
  const cacheKey = `${chainAtom}>${attachAtom}`;
  if (!ctx.cache.has(cacheKey)) {
    ctx.cache.set(cacheKey, buildSubstituent(ctx, chainAtom, attachAtom, order));
  }
  return ctx.cache.get(cacheKey);
}

/**
 * Builds the structure of a substituent (the body of nameSubstituentIn):
 * chooses its chain (P1–P3, then the numbering cascade with the free
 * valence first), groups its own substituents and flags retained and common
 * names. The connecting bond is outside the subtree, so it never counts as
 * a multiple bond of the substituent chain; its order is the order of the
 * free valence (2 → `-iliden`).
 *
 * @param {object} ctx - Naming context.
 * @param {number} chainAtom - The carrying atom.
 * @param {number} attachAtom - The attachment atom.
 * @param {number} order - Order of the connecting bond (1 or 2).
 * @returns {object} The SubstituentStructure.
 * @throws {Error} For a connecting bond of another order (a triple bond cannot leave a chain).
 */
function buildSubstituent(ctx, chainAtom, attachAtom, order) {
  if (order !== 1 && order !== 2) {
    throw new Error(`buildSubstituent: attachment bond of order ${order}`);
  }
  const { adj, style } = ctx;
  const skip = (id) => ctx.mol.atoms.get(id).element !== 'C';
  let chains = substituentChainCandidates(adj, chainAtom, attachAtom, style === 'substituted', skip);
  chains = keepMax(chains, (c) => c.length);
  chains = keepMax(chains, (c) => countBonds(adj, c, (order) => order >= 2));
  chains = keepMax(chains, (c) => countBonds(adj, c, (order) => order === 2));
  const subsByChain = new Map(chains.map((chain) => [chain, substituentsOf(ctx, chain, chainAtom)]));
  const prefixesOf = (chain) => subsByChain.get(chain).map((sub) => ({ atom: sub.chainAtom, key: sub.key, citation: sub.citation }));
  const nameKey = nameKeyFunction([...subsByChain.values()], ctx.lexicon);
  const numbering = numberParent(ctx.mol, chains, prefixesOf, { adj, freeValenceAtom: attachAtom, nameKey });
  const subs = subsByChain.get(chains[numbering.chainIndex]);
  const subtree = substituentSubtree(adj, chainAtom, attachAtom);
  const singleShape = GROUP_SHAPES[rootedTreeKey(ctx.mol, attachAtom, chainAtom, adj)] || null;
  const shape = order === 2 ? YLIDENE_SHAPES[singleShape] || null : singleShape;
  const retained = ((shape === 'isopropyl' || shape === 'isopropylidene') && style === 'isopropil')
    || (shape === 'tert-butyl' && style !== 'substituted')
    ? shape : null;
  return {
    chain: buildChainStructure(numbering.atoms, numbering.bonds, numbering.orders),
    prefixes: groupPrefixes(subs, numbering.atoms),
    freeValence: { locant: numbering.atoms.indexOf(attachAtom) + 1, order },
    retained,
    commonName: retained ? null : shape,
    atoms: subtree.atoms,
    bonds: subtree.bonds,
  };
} // End of function buildSubstituent()

/**
 * Names one substituent on its own (a fresh context each call; use
 * substituentsOf() to name many).
 *
 * @param {object} mol - A validated acyclic hydrocarbon or halogen derivative.
 * @param {number} chainAtom - The carrying chain atom.
 * @param {number} attachAtom - The substituent atom bonded to it.
 * @param {string} [style] - Prefix style (default 'isopropil').
 * @returns {object|null} The SubstituentStructure (`-il` or `-iliden`; a halogen prefix for a halogen atom, `hidroxi` for an OH, `oxo` for a C=O oxygen), or null when the two atoms are not bonded.
 */
export function nameSubstituent(mol, chainAtom, attachAtom, style = PREFIX_STYLES[0]) {
  const ctx = createNamingContext(mol, style);
  const link = ctx.adj.get(chainAtom).find((n) => n.atom === attachAtom);
  if (!link) {
    return null;
  }
  const element = mol.atoms.get(attachAtom).element;
  if (element === 'O') {
    return link.order === 2 ? oxoSubstituent(attachAtom) : hydroxySubstituent(attachAtom);
  }
  return isHalogen(element) ? halogenSubstituent(attachAtom, element) : nameSubstituentIn(ctx, chainAtom, attachAtom, link.order);
}

/**
 * Lists every substituent hanging from a parent chain or ring, named under a
 * prefix style. The parent's oxygen groups of the principal kind are its
 * suffix (suffixSites()), so they are not listed.
 *
 * @param {object} mol - A validated molecule.
 * @param {number[]} chainAtoms - The parent's atom ids.
 * @param {object} [ctx] - Naming context (a default-style one is created when omitted).
 * @returns {object[]} Entries as substituentsOf() returns them.
 */
export function collectSubstituents(mol, chainAtoms, ctx = createNamingContext(mol)) {
  return substituentsOf(ctx, chainAtoms, null, true);
}
