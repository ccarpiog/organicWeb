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
 * (`4-hidroxibutan-2-ona`). The C=O carbon itself is always a chain atom
 * of the parent or of a branch. When it is the attachment atom X of a
 * branch (design.md §13.4 I-39b), the branch is an acyl group: its chain
 * starts at X (locant 1, the only possible end: X has at most one other
 * carbon) and it is cited with an acyl prefix (`acyl` set on the
 * structure, render.js): `formil` (X alone), `acetil` (CH₃–CO–, retained),
 * else the chain name + `oil` (`propanoil`, `(2-metilpropanoil)`,
 * `(but-2-enoil)`). The C=O oxygen of X stays in the structure as an `oxo`
 * prefix at locant 1 (so counts and highlights see it), but the acyl
 * ending cites it: render.js citedPrefixes() leaves it out of the name.
 * A one-carbon acyl with a prefix of its own (–CO–C≡N, whose `ciano`
 * carbon is never a chain atom) has no acyl prefix here; unnamedAcyl()
 * finds it and the engine refuses the name (`acylSubstituent`).
 *
 * Ethers (design.md §13.4 I-34): an ether oxygen bonded to a chain atom
 * roots an alkoxy substituent (alkoxySubstituent()): the O plus the alkyl
 * group on its other side, named like any branch with the O as its
 * carrying atom, and cited `metoxi`, `etoxi`, `propoxi`, `butoxi`
 * (contracted, IUPAC 2013 P-63.2.2.2), `isopropoxi` / `tert-butoxi`
 * (retained, in the styles that keep `isopropil` / `tert-butil`),
 * otherwise the alkyl prefix + `oxi` (`pentiloxi`, `propan-2-iloxi`,
 * `1-metiletoxi` in the 'substituted' style; render.js). The O is never a
 * chain atom; an alkoxy group can itself carry any prefix, another alkoxy
 * included (`2-metoxietoxi`), and can sit inside a branch (`(metoximetil)`).
 *
 * Esters (design.md §13.4 I-35): the –COO– is the principal group, its C=O
 * carbon a parent atom (suffixSites() carries the bridge O), and the group
 * on the far side of the bridge O is named like an alkoxy group's alkyl
 * (esterAlkyl()), cited as its own word (`de metilo`; two of them for a
 * diester, I-39c). Beside an acid (I-39c) an ester is a prefix: its C=O
 * carbon X is an ordinary skeleton carbon, so on a chain that reaches it X
 * carries an `oxo` and an `alcoxi` prefix (substituentsOf() flags both
 * occurrences `ester`: `4-metoxi-4-oxo`); as the attachment atom of a
 * branch from a carbon X alone is an `alcoxicarbonil` group
 * (`alkoxycarbonyl` set: `metoxicarbonil`), and seen from its bridge O it
 * starts the acyl group of an `aciloxi` prefix (an alkoxy group whose
 * group is `acyl`: `acetiloxi`); esterAttachment() tells them apart.
 *
 * Amines (design.md §13.4 I-36): like an ether O, an amine N is never a
 * chain atom. When the amine is principal, each N bonded to the parent is a
 * suffix group (`-amina`, suffixSites()) and the groups on its other bonds
 * are prefixes with the locant `N` (nitrogenSubstituents(): the `metil` of
 * `N-metiletanamina`, both of `N,N-dimetilmetanamina`), named like any
 * branch whose carrying atom is the N and grouped with the other prefixes
 * (`N,2-dimetilpropan-1-amina`). Any other amine N bonded to a chain is an
 * `amino` prefix (aminoSubstituent()): the N plus its other groups, cited
 * without locants (`amino`, `(metilamino)`, `(dimetilamino)`,
 * `[etil(metil)amino]`).
 *
 * Amides (design.md §13.4 I-37): the –CONH₂ is the principal group, its C=O
 * carbon a parent atom (a chain end, like an acid's), its C=O oxygen the
 * suffix site and its N carried along (suffixSites() `amideNitrogen`); the
 * groups on the N are prefixes with the locant `N`, exactly as for a
 * principal amine (nitrogenSubstituents(): `N-metiletanamida`,
 * `N,N-dimetiletanamida`). An amide that is not principal (beside an acid
 * or an ester, or on another carbon piece, I-39d) is a prefix, like an
 * ester beside an acid: on a chain that reaches its carbon X, X carries an
 * `oxo` and an `amino` prefix (the N with its groups; substituentsOf()
 * flags both `amide`: `4-amino-4-oxo`); as the attachment atom of a branch
 * from a carbon, X alone is a `carbamoil` group (`carbamoyl` set); seen
 * from its N, X starts the acyl group of an `acilamino` prefix (an amino
 * group whose acyl group is `amideAcyl`: `acetilamino`);
 * amideAttachment() tells them apart. Only the amides whose carbon is a
 * parent atom are suffix groups (principal.js isSuffixGroupAtomOf()).
 *
 * Nitriles (design.md §13.4 I-38): a principal –C≡N on the parent has its
 * carbon as a parent atom (a chain end) and its N as the suffix site
 * (suffixSites(), like an amine's N). Any other nitrile (I-39a) is the
 * prefix `ciano` (cyanoSubstituent()): its carbon and N, a simple prefix
 * like `cloro`, bonded to the chain atom that carries it; the nitrile
 * carbon is never a chain atom of the parent (principal.js
 * outsideCarbons()) nor of a branch (buildSubstituent() skips it):
 * `ácido 3-cianopropanoico`, `3-(cianometoxi)propanonitrilo`.
 *
 * Rings as substituents (design.md §13.4 I-40a): when a chain is the
 * parent of a molecule with a ring (the chain carries more principal
 * groups than the ring, IUPAC 2013 P-44.1.1), the ring atoms are never
 * chain atoms, of the parent or of a branch (buildSubstituent() skips
 * them), and a ring atom as the attachment atom of a branch roots a ring
 * substituent (ringSubstituent()): the retained `fenil` for a benzene ring
 * (IUPAC 2013 P-29.6), else `ciclo` + stem + `il` with the attachment atom
 * as locant 1 (`ciclohexil`, `ciclopropil`, `(2-metilciclohexil)`,
 * `(4-hidroxiciclohexil)`, `(ciclohex-2-en-1-il)`, `ciclohexiliden` on a
 * double bond), its own prefixes numbered by the ring cascade. The branch
 * identity keys see the ring whole (graph.js rootedBranchKey()).
 * Pure: topology only.
 */

import { adjacency, rootedBranchKey, cycleCore } from '../model/graph.js';
import { isHalogen } from '../model/elements.js';
import { perceiveRings } from '../model/rings.js';
import { isNitrileCarbon, carbonylKind, isEsterCarbon, isAmideCarbon, isBenzeneRing } from '../model/validate.js';
import { buildChainStructure, buildRingStructure } from './structure.js';
import {
  numberParent, compareCitationKeys, ringCandidates, candidateData, runNumberingCascade,
} from './numbering.js';
import { citationKey, prefixNameKey } from './render.js';
import { lexiconEs } from './lexicon.es.js';
import { principalKindOf, isPrincipalOxygen, isSuffixOxygen, isSuffixGroupAtomOf } from './principal.js';
import { N_LOCANT } from './structure.js';

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
 * @returns {{mol: object, adj: Map<number, object[]>, style: string, lexicon: object, cache: Map<string, object>, principal: string|null, ringAtoms: Set<number>}} The context (`principal`: the principal oxygen kind, principal.js; `ringAtoms`: the atoms of the one ring, empty for a tree).
 * @throws {RangeError} For an unknown style.
 */
export function createNamingContext(mol, style = PREFIX_STYLES[0], lexicon = lexiconEs, adj = adjacency(mol)) {
  if (!PREFIX_STYLES.includes(style)) {
    throw new RangeError(`unknown prefix style ${style}`);
  }
  return {
    mol, adj, style, lexicon, cache: new Map(), principal: principalKindOf(mol, adj), ringAtoms: cycleCore(adj),
  };
}

/**
 * Collects the atoms and bonds of the subtree that starts at `attachAtom`
 * and leads away from `chainAtom` (the connecting bond is not included).
 * Every bond between two of its atoms is included, so a branch that holds
 * the ring (a ring substituent, design.md §13.4 I-40a) keeps its closure
 * bond.
 *
 * @param {Map<number, {atom: number, bond: number, order: number}[]>} adj - Adjacency map (graph.js).
 * @param {number} chainAtom - The carrying chain atom.
 * @param {number} attachAtom - The substituent atom bonded to it.
 * @returns {{atoms: number[], bonds: number[]}} Atom ids (breadth-first from attachAtom) and bond ids (ascending).
 */
export function substituentSubtree(adj, chainAtom, attachAtom) {
  const seen = new Set([chainAtom, attachAtom]);
  const atoms = [attachAtom];
  for (let i = 0; i < atoms.length; i += 1) {
    for (const n of adj.get(atoms[i])) {
      if (!seen.has(n.atom)) {
        seen.add(n.atom);
        atoms.push(n.atom);
      }
    }
  }
  const inSubtree = new Set(atoms);
  const bonds = new Set(atoms.flatMap((id) => adj.get(id).filter((n) => inSubtree.has(n.atom)).map((n) => n.bond)));
  return { atoms, bonds: [...bonds].sort((p, q) => p - q) };
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
 * @returns {{chainAtom: number, attachAtom: number, bond: number, order: number, atoms: number[], bonds: number[], multipleBonds: number[], key: string, structure: object, citation: object, etherCarbon?: number, etherBond?: number, ester?: boolean}[]} One entry per substituent, in chain order then attachment-atom order (an alkoxy entry also has the carbon on the other side of its O and that O–C bond; `ester` marks the C=O `oxo` and the bridge-O `alcoxi` of a non-principal ester whose carbon is the chain atom, design.md §13.4 I-39c).
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
      if (parent && isSuffixGroupAtomOf(ctx.mol, ctx.adj, chainAtom, n.atom, ctx.principal)) {
        continue; // A suffix group of the parent (`-ol`, `-al`, `-ona`), not a prefix.
      }
      if (isNitrileCarbon(ctx.mol, ctx.adj, n.atom)) {
        result.push(cyanoEntry(ctx, chainAtom, n));
        continue;
      }
      // The C=O and the bridge O of a non-principal ester whose carbon X is this chain atom (I-39c):
      // cited `oxo` and `alcoxi` at X's locant (`4-metoxi-4-oxobutanoico`); the entry says so (`ester`).
      // Likewise the C=O and the N of a non-principal amide (I-39d): `oxo` and `amino` (`4-amino-4-oxobutanoico`).
      let flag = element === 'O' && isEsterCarbon(ctx.mol, ctx.adj, chainAtom) ? { ester: true } : {};
      if ((element === 'O' || element === 'N') && isAmideCarbon(ctx.mol, ctx.adj, chainAtom)) {
        flag = { amide: true };
      }
      if (isHalogen(element) || (element === 'O' && ctx.adj.get(n.atom).length === 1)) {
        let structure = halogenSubstituent(n.atom, element);
        if (element === 'O') {
          structure = n.order === 2 ? oxoSubstituent(n.atom) : hydroxySubstituent(n.atom);
        }
        result.push({
          ...flag,
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
      result.push({ ...branchEntry(ctx, chainAtom, n), ...flag });
    } // End of the loop over the neighbours of one chain atom
  } // End of the loop over the chain atoms
  return result;
} // End of function substituentsOf()

/**
 * The substituentsOf() entry of a nitrile bonded to a chain atom but not
 * part of the chain (design.md §13.4 I-39a): the prefix `ciano`
 * (cyanoSubstituent()), whose atoms are the nitrile carbon and its N and
 * whose one bond is the C≡N; the connecting bond is the single bond from
 * the chain atom to the nitrile carbon. Like a halogen it has no chain, so
 * it adds no multiple bond to any chain count.
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number} chainAtom - The carrying chain atom.
 * @param {{atom: number, bond: number, order: number}} n - The link to the nitrile carbon.
 * @returns {object} The entry.
 */
function cyanoEntry(ctx, chainAtom, n) {
  const structure = cyanoSubstituent(ctx, n.atom);
  return {
    chainAtom,
    attachAtom: n.atom,
    bond: n.bond,
    order: n.order,
    atoms: [...structure.atoms],
    bonds: [...structure.bonds],
    multipleBonds: [],
    key: ATTACH_SYMBOL[n.order] + rootedBranchKey(ctx.mol, n.atom, chainAtom, ctx.adj),
    structure,
    citation: citationKey(structure, ctx.lexicon),
  };
} // End of function cyanoEntry()

/**
 * The substituent structure of a nitrile cited as a prefix (design.md
 * §13.4 I-39a): `ciano` (lexicon groupPrefix('nitrile')), a simple prefix
 * like a halogen (never enclosed; `diciano`), with no chain and no
 * prefixes. IUPAC 2013 (P-66.5) counts the nitrile carbon in the prefix,
 * never in the chain: NC–CH₂–CH₂–COOH is `ácido 3-cianopropanoico` (a
 * three-carbon parent). `atoms` are the carbon, then the N; `bonds` the
 * C≡N.
 *
 * @param {object} ctx - Naming context (createNamingContext), or any object with `mol` and `adj`.
 * @param {number} carbon - The nitrile carbon (validate.js isNitrileCarbon()).
 * @returns {object} The SubstituentStructure (structure.js) with `cyano` set.
 */
export function cyanoSubstituent(ctx, carbon) {
  const triple = ctx.adj.get(carbon).find((n) => n.order === 3);
  return {
    cyano: true,
    chain: null,
    prefixes: [],
    freeValence: { locant: 1, order: 1 },
    retained: null,
    commonName: null,
    atoms: [carbon, triple.atom],
    bonds: [triple.bond],
  };
} // End of function cyanoSubstituent()

/**
 * The substituentsOf() entry of the branch rooted at one neighbour of a
 * carrying atom (a chain atom, or the nitrogen of a principal amine):
 * the branch named recursively, its subtree, its carbon–carbon multiple
 * bonds, its identity key and citation key; an alkoxy entry also has the
 * carbon on the other side of its O and that O–C bond.
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number} chainAtom - The carrying atom.
 * @param {{atom: number, bond: number, order: number}} n - The neighbour that roots the branch.
 * @returns {object} The entry.
 */
function branchEntry(ctx, chainAtom, n) {
  const subtree = substituentSubtree(ctx.adj, chainAtom, n.atom);
  const inSubtree = new Set(subtree.bonds);
  // Carbon–carbon multiple bonds only: a C=O inside the branch is its `oxo` prefix, not an unsaturation.
  const isCarbon = (id) => ctx.mol.atoms.get(id).element === 'C';
  const multipleBonds = [...new Set(subtree.atoms.filter(isCarbon).flatMap((atom) => ctx.adj.get(atom)
    .filter((link) => link.order > 1 && inSubtree.has(link.bond) && isCarbon(link.atom))
    .map((link) => link.bond)))].sort((p, q) => p - q);
  const structure = nameSubstituentIn(ctx, chainAtom, n.atom, n.order);
  const entry = {
    chainAtom,
    attachAtom: n.atom,
    bond: n.bond,
    order: n.order,
    atoms: subtree.atoms,
    bonds: subtree.bonds,
    multipleBonds,
    key: ATTACH_SYMBOL[n.order] + rootedBranchKey(ctx.mol, n.atom, chainAtom, ctx.adj),
    structure,
    citation: citationKey(structure, ctx.lexicon),
  };
  if (structure.alkoxy) {
    // The other side of the ether O: its carbon and the O–C bond (both sides are highlighted apart).
    const far = ctx.adj.get(n.atom).find((m) => m.atom !== chainAtom);
    entry.etherCarbon = far.atom;
    entry.etherBond = far.bond;
  }
  return entry;
} // End of function branchEntry()

/**
 * The groups on the nitrogens of the principal amine groups of a parent
 * (design.md §13.4 I-36), or of its principal amide groups (I-37): for
 * each N of the principal kind bonded to a parent atom, every other
 * neighbour of that N roots a branch, named like any branch whose carrying
 * atom is the N (branchEntry()) and flagged `nitrogen`: it is cited with
 * the locant `N` (`N-metiletanamina`, `N,N-dimetilmetanamina`,
 * `N-metiletanamida`). Empty unless the amine or the amide is principal.
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number[]} chainAtoms - The parent's atom ids.
 * @returns {object[]} Entries as substituentsOf() returns them, plus `nitrogen: true`; `chainAtom` is the N.
 */
export function nitrogenSubstituents(ctx, chainAtoms) {
  if (ctx.principal !== 'amine' && ctx.principal !== 'amide') {
    return [];
  }
  const inChain = new Set(chainAtoms);
  const result = [];
  for (const chainAtom of chainAtoms) {
    for (const n of ctx.adj.get(chainAtom)) {
      if (!isSuffixGroupAtomOf(ctx.mol, ctx.adj, chainAtom, n.atom, ctx.principal) || ctx.mol.atoms.get(n.atom).element !== 'N') {
        continue;
      }
      for (const m of ctx.adj.get(n.atom)) {
        if (m.atom !== chainAtom && !inChain.has(m.atom)) {
          result.push({ ...branchEntry(ctx, n.atom, m), nitrogen: true });
        }
      }
    } // End of the loop over the neighbours of one parent atom
  } // End of the loop over the parent atoms
  return result;
} // End of function nitrogenSubstituents()

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
 * The C=O oxygen of a carbon that is an aldehyde or ketone carbon
 * (validate.js carbonylKind()), or null: when such a carbon is the
 * attachment atom of a branch, the branch is an acyl group (design.md
 * §13.4 I-39b).
 *
 * @param {object} ctx - Naming context (createNamingContext), or any object with `mol` and `adj`.
 * @param {number} carbon - A carbon atom id.
 * @returns {number|null} The oxygen id, or null.
 */
export function acylOxygenOf(ctx, carbon) {
  const link = ctx.adj.get(carbon).find((n) => carbonylKind(ctx.mol, ctx.adj, n.atom) !== null);
  return link ? link.atom : null;
}

/**
 * Finds an acyl branch that has no acyl prefix, at any depth (design.md
 * §13.4 I-39b): a one-carbon acyl group (X alone in its chain) that
 * carries a prefix of its own: a `ciano` (–CO–C≡N: the nitrile carbon is
 * never a chain atom; IUPAC 2013 names it `carbonocianidoil`, from memory,
 * ACYL_SUBSTITUENT_MESSAGE) or, since I-40a, a ring (X bonded to the ring:
 * `ciclohexanocarbonil`, `benzoil`, flagged `ring`, RING_ACYL_MESSAGE),
 * which the app does not support, so the engine refuses the molecule.
 * Every other acyl branch is named (`formil`, `acetil`, `propanoil`,
 * `(2-ciclohexiletanoil)`…).
 *
 * @param {{prefixes: object[]}} structure - A name or substituent structure.
 * @returns {{atoms: number[], bonds: number[], ring?: boolean}|null} The C=O atoms (carbon, oxygen) and bond of the first such branch (`ring` when X carries the ring), or null.
 */
export function unnamedAcyl(structure) {
  for (const group of structure.prefixes) {
    const sub = group.substituent;
    if (sub.acyl && sub.chain.length === 1 && sub.prefixes.some((inner) => !inner.substituent.oxo)) {
      const site = sub.prefixes.find((inner) => inner.substituent.oxo).locants[0];
      // A ring on X itself (design.md §13.4 I-40a): `ciclohexanocarbonil`, `benzoil` (I-40b).
      const ring = sub.prefixes.some((inner) => inner.substituent.ring);
      return { atoms: [site.atom, site.attachAtom], bonds: [site.bond], ...(ring ? { ring: true } : {}) };
    }
    const nested = unnamedAcyl(sub);
    if (nested) {
      return nested;
    }
  } // End of the loop over the prefix groups
  return null;
} // End of function unnamedAcyl()

/**
 * The suffix groups of a parent (design.md §13.4 I-31, I-32, I-33, I-35):
 * every oxygen of the principal kind bonded to one of its atoms — the OH of
 * `-ol`, or the C=O of `-al` / `-ona`, whose carbon is the parent atom; a
 * –COOH (`ácido …oico`) is one site, its C=O oxygen, carrying its OH
 * oxygen as `hydroxyAtom` / `hydroxyBond`; an ester –COO– (`…oato de
 * …ilo`) likewise, carrying its bridge O as `esterOxygen` / `esterBond`;
 * an amine (`-amina`, I-36) is one site per N (its other groups are
 * nitrogenSubstituents()); an amide –CONH₂ (`-amida`, I-37) is one site,
 * its C=O oxygen, carrying its N as `amideNitrogen` / `amideBond` (the
 * groups on that N are nitrogenSubstituents()).
 *
 * @param {object} mol - A validated molecule.
 * @param {Map<number, object[]>} adj - Its adjacency map.
 * @param {number[]} atoms - The parent's atom ids.
 * @param {string|null} [principal] - The principal oxygen kind (default: principalKindOf() of the molecule).
 * @returns {{atom: number, attachAtom: number, bond: number, hydroxyAtom?: number, hydroxyBond?: number, esterOxygen?: number, esterBond?: number, amideNitrogen?: number, amideBond?: number}[]} One site per group: carrying atom, oxygen, bond (and the OH of a –COOH, the bridge O of an ester or the N of an amide); in parent-atom order.
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
      } else if (principal === 'ester') {
        const bridge = adj.get(atom).find((m) => m.order === 1 && isPrincipalOxygen(mol, adj, m.atom, principal));
        site.esterOxygen = bridge.atom;
        site.esterBond = bridge.bond;
      } else if (principal === 'amide') {
        const nitrogen = adj.get(atom).find((m) => mol.atoms.get(m.atom).element === 'N');
        site.amideNitrogen = nitrogen.atom;
        site.amideBond = nitrogen.bond;
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
 * citation (alphanumerical) order, each occurrence with its locant (a
 * group on a principal amine's N, `nitrogen` set, gets N_LOCANT, which
 * sorts first: `N,2-dimetil`).
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
      locant: sub.nitrogen ? N_LOCANT : locantOf.get(sub.chainAtom),
      atom: sub.chainAtom,
      attachAtom: sub.attachAtom,
      bond: sub.bond,
      order: sub.order,
      atoms: [...sub.atoms],
      bonds: [...sub.bonds],
      multipleBonds: [...sub.multipleBonds],
      ...(sub.etherCarbon === undefined ? {} : { etherCarbon: sub.etherCarbon, etherBond: sub.etherBond }),
      ...(sub.ester ? { ester: true } : {}),
      ...(sub.amide ? { amide: true } : {}),
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
    const element = ctx.mol.atoms.get(attachAtom).element;
    let structure;
    if (element === 'O') {
      structure = alkoxySubstituent(ctx, chainAtom, attachAtom);
    } else if (element === 'N') {
      structure = aminoSubstituent(ctx, chainAtom, attachAtom);
    } else {
      structure = buildSubstituent(ctx, chainAtom, attachAtom, order);
    }
    ctx.cache.set(cacheKey, structure);
  }
  return ctx.cache.get(cacheKey);
} // End of function nameSubstituentIn()

/**
 * The substituent structure of an amine nitrogen cited as a prefix
 * (design.md §13.4 I-36): the N plus the groups on its other bonds, each
 * named like any branch whose carrying atom is the N and grouped as its
 * `prefixes` (in citation order). render.js cites it `amino` (an NH₂),
 * `(metilamino)`, `(dimetilamino)`, `[etil(metil)amino]`: the groups
 * without locants, then `amino` (IUPAC 2013 P-62.2.1.1.2, compound
 * prefixes). Used for every amine N bonded to a chain that is not a
 * principal-amine N of the parent: an amine below a more senior group
 * (`2-aminoetan-1-ol`, `ácido 2-aminopropanoico`) or on a branch
 * (`(aminometil)`).
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number} chainAtom - The carbon that carries the N.
 * @param {number} nitrogen - The amine nitrogen.
 * @returns {object} The SubstituentStructure (structure.js) with `amino` true and `nitrogen` its N.
 */
export function aminoSubstituent(ctx, chainAtom, nitrogen) {
  const groups = substituentsOf(ctx, [nitrogen], chainAtom);
  const subtree = substituentSubtree(ctx.adj, chainAtom, nitrogen);
  return {
    amino: true,
    nitrogen,
    chain: null,
    prefixes: groupPrefixes(groups, [nitrogen]),
    freeValence: { locant: 1, order: 1 },
    retained: null,
    commonName: null,
    atoms: subtree.atoms,
    bonds: subtree.bonds,
  };
} // End of function aminoSubstituent()

/**
 * The substituent structure of an ether oxygen seen from the chain that
 * carries it (design.md §13.4 I-34): an alkoxy group, i.e. the alkyl group
 * on the other side of the O, named like any branch whose carrying atom is
 * the O (its chain, prefixes, free valence at the carbon bonded to the O,
 * retained `isopropil` / `tert-butil` per style), with `alkoxy` set and the
 * O added to its atoms (first) and the O–C bond to its bonds. render.js
 * cites it `metoxi`, `etoxi`, `isopropoxi`, `pentiloxi`… The group is
 * never a common-name group (`isobutoxi` is not offered).
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number} chainAtom - The carbon that carries the O.
 * @param {number} oxygen - The ether oxygen.
 * @returns {object} The SubstituentStructure (structure.js) with `alkoxy` true and `oxygen` its O.
 */
export function alkoxySubstituent(ctx, chainAtom, oxygen) {
  const far = ctx.adj.get(oxygen).find((n) => n.atom !== chainAtom);
  const alkyl = nameSubstituentIn(ctx, oxygen, far.atom, 1);
  return {
    ...alkyl,
    alkoxy: true,
    oxygen,
    commonName: null,
    atoms: [oxygen, ...alkyl.atoms],
    bonds: [...alkyl.bonds, far.bond].sort((p, q) => p - q),
  };
} // End of function alkoxySubstituent()

/**
 * The O-bound group of an ester (design.md §13.4 I-35): the alkyl group on
 * the far side of the bridge O of the –COO– whose carbon is `carbon`,
 * named like any branch whose carrying atom is the O (alkoxySubstituent():
 * its chain, prefixes, free valence at the carbon bonded to the O, retained
 * `isopropil` / `tert-butil` per style). render.js cites it as a group name
 * (`metilo`, `isopropilo`, `2-cloroetilo`, `prop-2-en-1-ilo`), after the
 * acid part in Spanish (`etanoato de metilo`) and before it in English
 * (`methyl ethanoate`). The structure keeps `alkoxy` true (its `atoms`
 * start with the O, its `bonds` include the O–C bond), so counts that walk
 * substituents treat the bridge O like an ether O.
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number} carbon - The C=O carbon of the ester (a parent atom).
 * @param {number} oxygen - The bridge O.
 * @returns {{oxygen: number, bond: number, carbon: number, alkylBond: number, alkyl: object}} The bridge O, the C–O bond, the carbon bonded to the O on the other side, that O–C bond and the group (SubstituentStructure with `alkoxy` true).
 */
export function esterAlkyl(ctx, carbon, oxygen) {
  const bond = ctx.adj.get(carbon).find((n) => n.atom === oxygen).bond;
  const far = ctx.adj.get(oxygen).find((n) => n.atom !== carbon);
  return { oxygen, bond, carbon: far.atom, alkylBond: far.bond, alkyl: alkoxySubstituent(ctx, carbon, oxygen) };
} // End of function esterAlkyl()

/**
 * Builds the structure of a substituent (the body of nameSubstituentIn):
 * chooses its chain (P1–P3, then the numbering cascade with the free
 * valence first), groups its own substituents and flags retained and common
 * names, and acyl groups (`acyl`: the attachment atom is a C=O carbon,
 * design.md §13.4 I-39b; always chain carbon 1, since it has at most one
 * other carbon, so the chain is the acid chain the acyl prefix names). The connecting bond is outside the subtree, so it never counts as
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
  if (ctx.ringAtoms.has(attachAtom)) {
    return ringSubstituent(ctx, chainAtom, attachAtom, order); // `ciclohexil`, `fenil` (design.md §13.4 I-40a).
  }
  // Heteroatoms, nitrile carbons (a `ciano` prefix of the branch, I-39a) and ring atoms (a ring prefix, I-40a) are never chain atoms.
  const skip = (id) => ctx.mol.atoms.get(id).element !== 'C' || isNitrileCarbon(ctx.mol, adj, id) || ctx.ringAtoms.has(id);
  let chains = substituentChainCandidates(adj, chainAtom, attachAtom, style === 'substituted', skip);
  chains = keepMax(chains, (c) => c.length);
  chains = keepMax(chains, (c) => countBonds(adj, c, (order) => order >= 2));
  chains = keepMax(chains, (c) => countBonds(adj, c, (order) => order === 2));
  const subsByChain = new Map(chains.map((chain) => [chain, substituentsOf(ctx, chain, chainAtom)]));
  // An acyl group (design.md §13.4 I-39b): the C=O oxygen of X is cited by the acyl ending, not as a
  // prefix, so it takes no part in the choice and numbering of the acyl chain (P4, N3, N4, N5); it
  // stays in the structure's prefixes (counts, highlights) and render.js citedPrefixes() hides it.
  // An ester carbon X (I-39c) seen from its bridge O is an acyl group too (the acyl of `aciloxi`);
  // seen from a carbon it is an `alcoxicarbonil` group (X alone, its `oxo` and `alcoxi` kept as prefixes).
  const esterSide = esterAttachment(ctx, chainAtom, attachAtom);
  // An amide carbon X (I-39d) seen from its N is the acyl group of an `acilamino` prefix (`acetilamino`);
  // seen from a carbon it is a `carbamoil` group (X alone, its `oxo` and `amino` kept as prefixes).
  const amideSide = amideAttachment(ctx, chainAtom, attachAtom);
  const acylOxygen = esterSide === 'bridge' || amideSide === 'nitrogen' ? esterOxoOf(ctx, attachAtom) : acylOxygenOf(ctx, attachAtom);
  const prefixesOf = (chain) => subsByChain.get(chain)
    .filter((sub) => sub.attachAtom !== acylOxygen)
    .map((sub) => ({ atom: sub.chainAtom, key: sub.key, citation: sub.citation }));
  const nameKey = nameKeyFunction([...subsByChain.values()], ctx.lexicon);
  const numbering = numberParent(ctx.mol, chains, prefixesOf, { adj, freeValenceAtom: attachAtom, nameKey });
  const subs = subsByChain.get(chains[numbering.chainIndex]);
  const subtree = substituentSubtree(adj, chainAtom, attachAtom);
  const singleShape = GROUP_SHAPES[rootedBranchKey(ctx.mol, attachAtom, chainAtom, adj)] || null;
  const shape = order === 2 ? YLIDENE_SHAPES[singleShape] || null : singleShape;
  const retained = ((shape === 'isopropyl' || shape === 'isopropylidene') && style === 'isopropil')
    || (shape === 'tert-butyl' && style !== 'substituted')
    ? shape : null;
  // An acyl group (design.md §13.4 I-39b): X, the C=O carbon, is the attachment atom and chain carbon 1.
  const acyl = acylOxygen !== null;
  return {
    chain: buildChainStructure(numbering.atoms, numbering.bonds, numbering.orders),
    prefixes: groupPrefixes(subs, numbering.atoms),
    freeValence: { locant: numbering.atoms.indexOf(attachAtom) + 1, order },
    retained,
    commonName: retained ? null : shape,
    atoms: subtree.atoms,
    bonds: subtree.bonds,
    ...(acyl ? { acyl: true } : {}),
    ...(esterSide === 'carbon' ? { alkoxycarbonyl: true } : {}),
    ...(amideSide === 'nitrogen' ? { amideAcyl: true } : {}),
    ...(amideSide === 'carbon' ? { carbamoyl: true } : {}),
  };
} // End of function buildSubstituent()

/**
 * The substituent structure of a ring bonded to the carrying atom through
 * one of its atoms (design.md §13.4 I-40a): the ring is the group's
 * `chain` (a RingStructure), numbered from the attachment atom (locant 1,
 * the free valence) in the direction the ring cascade chooses
 * (numbering.js runNumberingCascade(): N1 multiple bonds, N2 double bonds,
 * N3 prefixes, N4 citation order, N5, then the presentation tie-break);
 * its prefixes are its other groups (substituentsOf(), the carrying atom
 * left out): `(2-metilciclohexil)`, `(4-hidroxiciclohexil)`,
 * `(2-oxociclopentil)`. A benzene ring (validate.js isBenzeneRing()) is
 * the retained `fenil` (IUPAC 2013 P-29.6; `retained` 'phenyl', its chain
 * `retained` 'benzene'); validation keeps it monosubstituted, so it has no
 * prefixes. render.js cites any other ring `ciclo` + stem + `il`
 * (`ciclohexil`, `ciclohex-2-en-1-il`; `iliden` on a double bond).
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number} chainAtom - The carrying atom (not a ring atom).
 * @param {number} attachAtom - The ring atom bonded to it.
 * @param {number} order - Order of the connecting bond (1 → `-il`, 2 → `-iliden`).
 * @returns {object} The SubstituentStructure (structure.js) with `ring` set.
 */
export function ringSubstituent(ctx, chainAtom, attachAtom, order) {
  const [ring] = perceiveRings(ctx.mol).rings;
  const candidates = ringCandidates(ring).filter((c) => c.atoms[0] === attachAtom);
  const subs = substituentsOf(ctx, ring.atoms, chainAtom);
  const prefixes = subs.map(numberingPrefix);
  const data = new Map(candidates.map((c) => [
    c.key,
    candidateData(c.atoms, c.bonds, c.bonds.map((id) => ctx.mol.bonds.get(id).order), prefixes),
  ]));
  const { chosen } = runNumberingCascade(candidates, data, {
    prefixCounts: [prefixes.length],
    nameKey: nameKeyFunction([subs], ctx.lexicon),
  });
  const { bonds, orders } = data.get(chosen.key);
  const numbered = buildRingStructure(chosen.atoms, bonds, orders);
  const benzene = isBenzeneRing(ctx.mol, ring);
  const subtree = substituentSubtree(ctx.adj, chainAtom, attachAtom);
  return {
    ring: true,
    chain: benzene ? { ...numbered, retained: 'benzene' } : numbered,
    prefixes: groupPrefixes(subs, numbered.atoms),
    freeValence: { locant: 1, order },
    retained: benzene ? 'phenyl' : null,
    commonName: null,
    atoms: subtree.atoms,
    bonds: subtree.bonds,
  };
} // End of function ringSubstituent()

/**
 * How a branch reaches an amide carbon X (design.md §13.4 I-39d):
 * 'nitrogen' when the carrying atom is X's N (X starts the acyl group of
 * an `acilamino` prefix: `acetilamino`, `formilamino`, `propanoilamino`),
 * 'carbon' when it is a carbon (X alone, with its C=O and its N, is a
 * `carbamoil` prefix: `carbamoil`, `metilcarbamoil`), null when X is not
 * an amide carbon. A principal amide on the parent is never a branch.
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number} chainAtom - The carrying atom.
 * @param {number} attachAtom - The attachment atom.
 * @returns {'nitrogen'|'carbon'|null} The side.
 */
export function amideAttachment(ctx, chainAtom, attachAtom) {
  if (!isAmideCarbon(ctx.mol, ctx.adj, attachAtom)) {
    return null;
  }
  return ctx.mol.atoms.get(chainAtom).element === 'N' ? 'nitrogen' : 'carbon';
}

/**
 * How a branch reaches an ester carbon X (design.md §13.4 I-39c): 'bridge'
 * when the carrying atom is X's bridge O (X starts the acyl group of an
 * `aciloxi` prefix: `acetiloxi`, `formiloxi`, `propanoiloxi`), 'carbon'
 * when it is a carbon (X alone, with its C=O and its O-bound group, is an
 * `alcoxicarbonil` prefix: `metoxicarbonil`), null when X is not an ester
 * carbon. Only a non-principal ester is ever a branch: validation keeps
 * every principal ester on the parent.
 *
 * @param {object} ctx - Naming context (createNamingContext).
 * @param {number} chainAtom - The carrying atom.
 * @param {number} attachAtom - The attachment atom.
 * @returns {'bridge'|'carbon'|null} The side.
 */
export function esterAttachment(ctx, chainAtom, attachAtom) {
  if (!isEsterCarbon(ctx.mol, ctx.adj, attachAtom)) {
    return null;
  }
  return ctx.mol.atoms.get(chainAtom).element === 'O' ? 'bridge' : 'carbon';
}

/**
 * The C=O oxygen of an ester carbon (validate.js isEsterCarbon()).
 *
 * @param {object} ctx - Naming context, or any object with `mol` and `adj`.
 * @param {number} carbon - An ester carbon.
 * @returns {number} The oxygen id.
 */
export function esterOxoOf(ctx, carbon) {
  return ctx.adj.get(carbon).find((n) => n.order === 2 && ctx.mol.atoms.get(n.atom).element === 'O').atom;
}

/**
 * Names one substituent on its own (a fresh context each call; use
 * substituentsOf() to name many).
 *
 * @param {object} mol - A validated acyclic hydrocarbon or halogen derivative.
 * @param {number} chainAtom - The carrying chain atom.
 * @param {number} attachAtom - The substituent atom bonded to it.
 * @param {string} [style] - Prefix style (default 'isopropil').
 * @returns {object|null} The SubstituentStructure (`-il` or `-iliden`; a halogen prefix for a halogen atom, `hidroxi` for an OH, `oxo` for a C=O oxygen, an alkoxy group for an ether oxygen, an amino group for an amine nitrogen, `ciano` for a nitrile carbon), or null when the two atoms are not bonded.
 */
export function nameSubstituent(mol, chainAtom, attachAtom, style = PREFIX_STYLES[0]) {
  const ctx = createNamingContext(mol, style);
  const link = ctx.adj.get(chainAtom).find((n) => n.atom === attachAtom);
  if (!link) {
    return null;
  }
  const element = mol.atoms.get(attachAtom).element;
  if (element === 'O' && ctx.adj.get(attachAtom).length === 1) {
    return link.order === 2 ? oxoSubstituent(attachAtom) : hydroxySubstituent(attachAtom);
  }
  if (isNitrileCarbon(mol, ctx.adj, attachAtom)) {
    return cyanoSubstituent(ctx, attachAtom);
  }
  return isHalogen(element) ? halogenSubstituent(attachAtom, element) : nameSubstituentIn(ctx, chainAtom, attachAtom, link.order);
}

/**
 * Lists every substituent hanging from a parent chain or ring, named under a
 * prefix style. The parent's groups of the principal kind are its
 * suffix (suffixSites()), so they are not listed; the groups on the N of a
 * principal amine are (nitrogenSubstituents(), flagged `nitrogen`, cited
 * with the locant `N`), after the others.
 *
 * @param {object} mol - A validated molecule.
 * @param {number[]} chainAtoms - The parent's atom ids.
 * @param {object} [ctx] - Naming context (a default-style one is created when omitted).
 * @returns {object[]} Entries as substituentsOf() returns them (the N-groups with `nitrogen: true`).
 */
export function collectSubstituents(mol, chainAtoms, ctx = createNamingContext(mol)) {
  return [...substituentsOf(ctx, chainAtoms, null, true), ...nitrogenSubstituents(ctx, chainAtoms)];
}

/**
 * The numbering description of one substituent entry (numbering.js
 * candidateData() prefixes): its carrying atom, identity key and citation
 * key, plus the fixed locant N_LOCANT for a group on a principal amine's
 * N (the same in every numbering; IUPAC 2013 compares it as lower than any
 * number).
 *
 * @param {object} sub - An entry of collectSubstituents().
 * @returns {{atom: number, key: string, citation: object, locant?: number}} The prefix description.
 */
export function numberingPrefix(sub) {
  return { atom: sub.chainAtom, key: sub.key, citation: sub.citation, ...(sub.nitrogen ? { locant: N_LOCANT } : {}) };
}
