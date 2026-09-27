/**
 * @file Detection of characteristic (functional) groups on the molecule graph
 * (design.md §13.4 I-29). Pure: reads atom ids, elements and bonds only,
 * never coordinates or the DOM. Detection alone never enables naming: the
 * engine still refuses every molecule with a heteroatom (`HETEROATOM`), and
 * the groups found travel with that refusal (seniority.js, index.js).
 *
 * Method. A carbon is a *functional carbon* when it has a double or triple
 * bond to a heteroatom (C=O, C=N, C≡N). The *clusters* are the connected
 * pieces of the graph made of heteroatoms and functional carbons, joined by
 * every bond that touches a heteroatom (heteroatom–heteroatom, or functional
 * carbon–heteroatom; two functional carbons bonded to each other stay apart,
 * so `O=CC=O` is two aldehydes). Each cluster is matched, as a whole,
 * against exactly one pattern, so the largest pattern always wins and no
 * atom belongs to two groups: the OH of an acid is never an alcohol, the
 * C=O of an ester, amide or acid never a ketone, the O of an ester never an
 * ether, the N of an amide never an amine. A cluster that matches no
 * pattern (O–O, N–O, N–N, a C=N imine, a halogen on a heteroatom or on a
 * carbonyl carbon, an anhydride, a carbonate, a lone H₂O or NH₃…) becomes
 * one `unsupported` record, so later phases refuse it cleanly.
 *
 * Patterns (X = the functional carbon; R = a carbon outside the group; every
 * R–X, R–O, R–N bond single, and every heteroatom listed is bonded only as
 * shown, the rest being hydrogens):
 *
 *   acid      X(=O)–OH,  X with at most one R     (ácido …-oico)
 *   ester     X(=O)–O–R, X with at most one R     (…-oato de …-ilo)
 *   amide     X(=O)–N(R)0..2, X with at most one R (…-amida)
 *   nitrile   X≡N, X with at most one R           (…-nitrilo)
 *   aldehyde  X=O, X with 0 or 1 R (so X has an H) (…-al)
 *   ketone    X=O, X with exactly 2 R             (…-ona)
 *   alcohol   R–OH (`phenol` true when R is a benzene-ring carbon)
 *   ether     R–O–R
 *   amine     N with 1–3 R and single bonds only (primary/secondary/tertiary)
 *   halide    R–F, R–Cl, R–Br, R–I
 *
 * Where the functional carbon belongs: it is part of the group (listed in
 * `atoms`, and in `carbon`), so no other group can claim it; but it is a
 * skeleton carbon too. For acyclic parents IUPAC 2013 counts it in the
 * parent chain when the group is cited as a suffix (-oico, -oato, -amida,
 * -nitrilo, -al: P-65.1.2, P-66.1.1, P-66.5.1, P-66.6.1; the ketone carbon
 * is always a chain or ring carbon), so later phases must count `carbon` as
 * a chain carbon. Only when the group hangs from a ring parent (I-40:
 * -carboxílico, -carbaldehído, -carbonitrilo) or is cited as a prefix that
 * includes it (carboxi-, formil-, ciano-) is it outside the parent.
 */

import { adjacency } from '../model/graph.js';
import { perceiveRings } from '../model/rings.js';
import { isBenzeneRing } from '../model/validate.js';

/** Every group kind, in the order records are listed (seniority, then prefix-only, then unsupported). */
export const GROUP_KINDS = Object.freeze([
  'acid', 'ester', 'amide', 'nitrile', 'aldehyde', 'ketone', 'alcohol', 'amine', 'ether', 'halide', 'unsupported',
]);

/** Kinds that can be cited as a suffix (the rest — ether, halide — are prefix-only, IUPAC 2013 P-41). */
export const SUFFIX_KINDS = Object.freeze(['acid', 'ester', 'amide', 'nitrile', 'aldehyde', 'ketone', 'alcohol', 'amine']);

/** Halogen element symbols. */
export const HALOGENS = Object.freeze(['F', 'Cl', 'Br', 'I']);

/**
 * Reasons given on an `unsupported` record (English ids, for developers
 * and for choosing the explanation text):
 * - heteroatomBond: two heteroatoms bonded to each other (O–O, N–O, N–N, O–Cl…);
 * - imine: a C=N double bond;
 * - noCarbon: a heteroatom bonded to no carbon at all (H₂O, NH₃, HCl);
 * - carbonylDerivative: any other arrangement around a C=O or C≡N
 *   (acyl halide, anhydride, carbonate, imide, ketene, CO₂…).
 */
export const UNSUPPORTED_REASONS = Object.freeze(['heteroatomBond', 'imine', 'noCarbon', 'carbonylDerivative']);

/** Amine class by the number of carbons on the nitrogen (1, 2, 3). */
const AMINE_CLASSES = Object.freeze({ 1: 'primary', 2: 'secondary', 3: 'tertiary' });

/**
 * One characteristic group found on the molecule.
 *
 * @typedef {object} GroupRecord
 * @property {string} kind - One of GROUP_KINDS.
 * @property {number[]} atoms - Heavy atoms of the group, ascending: its heteroatoms plus its functional carbon (if any). Records never share atoms.
 * @property {number[]} bonds - Bonds between atoms of the group, ascending.
 * @property {number|null} carbon - The functional carbon (C of C=O or C≡N) included in the group; null for alcohol, ether, amine, halide and heteroatom-only clusters. It is also a skeleton carbon (see the file header).
 * @property {number[]} attachedTo - Carbons outside the group bonded to it, ascending (the skeleton atoms it hangs from).
 * @property {boolean} canBeSuffix - True for the SUFFIX_KINDS.
 * @property {Object<string, number>} roles - Atom id by role: `carbonylOxygen`, `hydroxyOxygen`, `bridgeOxygen`, `alkylCarbon` (ester, the R on the O side), `acylCarbon` (the R on X, when present), `oxygen`, `nitrogen`, `halogen`, `carbon` (the R carrying an OH).
 * @property {boolean} [phenol] - Alcohol only: true when the OH is on a benzene-ring carbon.
 * @property {'primary'|'secondary'|'tertiary'} [amineClass] - Amine only.
 * @property {number} [substitution] - Amide only: carbons on the nitrogen besides X (0 → -NH₂, 1 → -NHR, 2 → -NR₂).
 * @property {string} [element] - Halide only: 'F', 'Cl', 'Br' or 'I'.
 * @property {string} [reason] - Unsupported only: one of UNSUPPORTED_REASONS.
 */

/**
 * Carbons that belong to a benzene ring (a six-carbon ring whose bonds
 * alternate double and single, validate.js isBenzeneRing()).
 *
 * @param {object} mol - The molecule.
 * @returns {Set<number>} Benzene-ring carbon ids.
 */
function benzeneCarbons(mol) {
  const carbons = new Set();
  for (const ring of perceiveRings(mol).rings) {
    if (ring.atoms.every((id) => mol.atoms.get(id).element === 'C') && isBenzeneRing(mol, ring)) {
      ring.atoms.forEach((id) => carbons.add(id));
    }
  }
  return carbons;
}

/**
 * Splits the heteroatoms and functional carbons into clusters (see the file
 * header), in ascending order of their smallest atom id.
 *
 * @param {Map<number, object[]>} adj - Adjacency map (ascending ids).
 * @param {function(number): boolean} hetero - Tells whether an atom is a heteroatom.
 * @param {Set<number>} functional - The functional carbons.
 * @returns {number[][]} Clusters as ascending atom-id arrays.
 */
function clustersOf(adj, hetero, functional) {
  const member = (id) => hetero(id) || functional.has(id);
  const seen = new Set();
  const clusters = [];
  for (const start of adj.keys()) {
    if (!member(start) || seen.has(start)) {
      continue;
    }
    const cluster = [start];
    seen.add(start);
    for (let i = 0; i < cluster.length; i += 1) {
      const atom = cluster[i];
      for (const n of adj.get(atom)) {
        // Only bonds touching a heteroatom join a cluster: two functional carbons stay apart.
        if (member(n.atom) && (hetero(atom) || hetero(n.atom)) && !seen.has(n.atom)) {
          seen.add(n.atom);
          cluster.push(n.atom);
        }
      }
    } // End of the breadth-first walk over one cluster
    clusters.push(cluster.sort((p, q) => p - q));
  } // End of the loop over the cluster starts
  return clusters;
} // End of function clustersOf()

/**
 * Detects the characteristic groups of a molecule, without overlaps: every
 * heteroatom belongs to exactly one record, and so does every functional
 * carbon. Records are listed in GROUP_KINDS order, then by smallest atom id.
 * A hydrocarbon gives an empty list.
 *
 * @param {object} mol - A structurally valid molecule (validate.js validateStructure()).
 * @returns {GroupRecord[]} The groups found.
 */
export function detectGroups(mol) {
  const adj = adjacency(mol);
  const element = (id) => mol.atoms.get(id).element;
  const hetero = (id) => element(id) !== 'C';
  const functional = new Set([...adj.keys()].filter((id) => !hetero(id)
    && adj.get(id).some((n) => hetero(n.atom) && n.order >= 2)));
  const ctx = { mol, adj, element, hetero, functional, benzene: null };
  const groups = clustersOf(adj, hetero, functional).map((cluster) => classifyCluster(cluster, ctx));
  const rank = (kind) => GROUP_KINDS.indexOf(kind);
  return groups.sort((p, q) => rank(p.kind) - rank(q.kind) || p.atoms[0] - q.atoms[0]);
} // End of function detectGroups()

/**
 * Builds a group record: the cluster's atoms, its inner bonds and the outside
 * carbons it is bonded to, plus the kind-specific fields.
 *
 * @param {string} kind - The group kind.
 * @param {number[]} cluster - The cluster (ascending ids).
 * @param {object} ctx - Detection context (adjacency, element tests).
 * @param {object} fields - `carbon`, `roles` and the kind-specific flags.
 * @returns {GroupRecord} The record.
 */
function makeRecord(kind, cluster, ctx, fields) {
  const inside = new Set(cluster);
  const bonds = new Set();
  const attached = new Set();
  for (const atom of cluster) {
    for (const n of ctx.adj.get(atom)) {
      if (inside.has(n.atom)) {
        bonds.add(n.bond);
      } else {
        attached.add(n.atom);
      }
    }
  }
  return {
    kind,
    atoms: [...cluster],
    bonds: [...bonds].sort((p, q) => p - q),
    carbon: fields.carbon === undefined ? null : fields.carbon,
    attachedTo: [...attached].sort((p, q) => p - q),
    canBeSuffix: SUFFIX_KINDS.includes(kind),
    roles: fields.roles || {},
    ...fields.extra,
  };
} // End of function makeRecord()

/**
 * An `unsupported` record for a cluster that matches no pattern.
 *
 * @param {number[]} cluster - The cluster.
 * @param {object} ctx - Detection context.
 * @param {string} reason - One of UNSUPPORTED_REASONS.
 * @returns {GroupRecord} The record.
 */
function unsupported(cluster, ctx, reason) {
  const carbons = cluster.filter((id) => !ctx.hetero(id));
  return makeRecord('unsupported', cluster, ctx, { carbon: carbons.length === 1 ? carbons[0] : null, extra: { reason } });
}

/**
 * Matches one cluster against the patterns of the file header.
 *
 * @param {number[]} cluster - The cluster (ascending ids).
 * @param {object} ctx - Detection context.
 * @returns {GroupRecord} The record (kind 'unsupported' when nothing matches).
 */
function classifyCluster(cluster, ctx) {
  const carbons = cluster.filter((id) => !ctx.hetero(id));
  if (carbons.length === 0) {
    return cluster.length === 1 ? classifyLoneHeteroatom(cluster[0], ctx) : unsupported(cluster, ctx, 'heteroatomBond');
  }
  if (carbons.length > 1) {
    return unsupported(cluster, ctx, 'carbonylDerivative');
  }
  return classifyFunctionalCarbon(carbons[0], cluster, ctx);
}

/**
 * Classifies a heteroatom bonded only to non-functional carbons (all by
 * single bonds, or the carbon would be functional): alcohol or phenol,
 * ether, amine, halide; bonded to no carbon at all it is unsupported.
 *
 * @param {number} atom - The heteroatom.
 * @param {object} ctx - Detection context.
 * @returns {GroupRecord} The record.
 */
function classifyLoneHeteroatom(atom, ctx) {
  const carbons = ctx.adj.get(atom).map((n) => n.atom);
  const element = ctx.element(atom);
  if (carbons.length === 0) {
    return unsupported([atom], ctx, 'noCarbon');
  }
  if (element === 'O') {
    if (carbons.length === 1) {
      if (!ctx.benzene) {
        ctx.benzene = benzeneCarbons(ctx.mol); // Ring perception only when an OH is found.
      }
      const phenol = ctx.benzene.has(carbons[0]);
      return makeRecord('alcohol', [atom], ctx, { roles: { oxygen: atom, carbon: carbons[0] }, extra: { phenol } });
    }
    return makeRecord('ether', [atom], ctx, { roles: { oxygen: atom } });
  }
  if (element === 'N') {
    return makeRecord('amine', [atom], ctx, { roles: { nitrogen: atom }, extra: { amineClass: AMINE_CLASSES[carbons.length] } });
  }
  return makeRecord('halide', [atom], ctx, { roles: { halogen: atom }, extra: { element } });
} // End of function classifyLoneHeteroatom()

/**
 * Classifies a cluster with one functional carbon X: acid, ester, amide,
 * nitrile, aldehyde or ketone, else unsupported. Every heteroatom of the
 * cluster must be bonded to X, and X's carbon neighbours by single bonds.
 *
 * @param {number} x - The functional carbon.
 * @param {number[]} cluster - The cluster.
 * @param {object} ctx - Detection context.
 * @returns {GroupRecord} The record.
 */
function classifyFunctionalCarbon(x, cluster, ctx) {
  const neighbours = ctx.adj.get(x);
  const heteroNeighbours = neighbours.filter((n) => ctx.hetero(n.atom));
  const carbonNeighbours = neighbours.filter((n) => !ctx.hetero(n.atom));
  if (heteroNeighbours.length !== cluster.length - 1) {
    return unsupported(cluster, ctx, 'heteroatomBond'); // A heteroatom of the cluster is bonded to another heteroatom.
  }
  if (heteroNeighbours.some((n) => ctx.element(n.atom) === 'N' && n.order === 2)) {
    return unsupported(cluster, ctx, 'imine');
  }
  if (carbonNeighbours.some((n) => n.order !== 1)) {
    return unsupported(cluster, ctx, 'carbonylDerivative'); // Ketene-like C=C=O.
  }
  const acylCarbon = carbonNeighbours.length === 1 ? { acylCarbon: carbonNeighbours[0].atom } : {};
  const carbonyl = heteroNeighbours.filter((n) => ctx.element(n.atom) === 'O' && n.order === 2);
  const singles = heteroNeighbours.filter((n) => n.order === 1);
  if (heteroNeighbours.length === 1 && ctx.element(heteroNeighbours[0].atom) === 'N' && heteroNeighbours[0].order === 3) {
    return makeRecord('nitrile', cluster, ctx, { carbon: x, roles: { nitrogen: heteroNeighbours[0].atom, ...acylCarbon } });
  }
  if (carbonyl.length !== 1 || singles.length > 1 || heteroNeighbours.length !== carbonyl.length + singles.length) {
    return unsupported(cluster, ctx, 'carbonylDerivative');
  }
  const oxygen = carbonyl[0].atom;
  if (singles.length === 0) {
    const kind = carbonNeighbours.length === 2 ? 'ketone' : 'aldehyde';
    return makeRecord(kind, cluster, ctx, { carbon: x, roles: { carbonylOxygen: oxygen } });
  }
  const other = singles[0].atom;
  const beyond = ctx.adj.get(other).filter((n) => n.atom !== x).map((n) => n.atom);
  const element = ctx.element(other);
  if (element === 'O') {
    if (beyond.length === 0) {
      return makeRecord('acid', cluster, ctx, { carbon: x, roles: { carbonylOxygen: oxygen, hydroxyOxygen: other, ...acylCarbon } });
    }
    return makeRecord('ester', cluster, ctx, {
      carbon: x, roles: { carbonylOxygen: oxygen, bridgeOxygen: other, alkylCarbon: beyond[0], ...acylCarbon },
    });
  }
  if (element === 'N') {
    return makeRecord('amide', cluster, ctx, {
      carbon: x, roles: { carbonylOxygen: oxygen, nitrogen: other, ...acylCarbon }, extra: { substitution: beyond.length },
    });
  }
  return unsupported(cluster, ctx, 'carbonylDerivative'); // Acyl halide.
} // End of function classifyFunctionalCarbon()
