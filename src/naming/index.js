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
 * one carbocycle, which is the parent (ring vs chain, IUPAC 2013
 * P-44.1.2.2) unless a chain carries more principal groups (P-44.1.1,
 * design.md §13.4 I-40a: parent.js ringOrChain(); the chain pipeline then
 * names it with the ring as a `ciclohexil` / `fenil` prefix,
 * `2-ciclohexiletan-1-ol`, `1-feniletan-1-ona`, `fenilmetanamina`, and a
 * `RINGCHAIN` trace step first; a ring with two identical such branches is
 * refused, `symmetricRing`, multiplicative names); rings.js names it with its side chains as substituents
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
 * parent (or to a branch chain) as the attachment atom of a branch is an
 * acyl group, cited with an acyl prefix (design.md §13.4 I-39b: `formil`,
 * `acetil`, `propanoil`, `(2-metilpropanoil)`: `3-acetilpentano-2,4-diona`,
 * `ácido 3-formilpentanodioico`); only a one-carbon acyl carrying a `ciano`
 * (–CO–C≡N) is refused with `HETEROATOM` `acylSubstituent`, checked on
 * every emitted style.
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
 * the acid is `oxo-`). Validation refuses more than two –COOH on one carbon
 * piece (`manyAcids`); a –COOH on another piece is the prefix `carboxi-`
 * (I-40b: `ácido 3-(carboximetoxi)propanoico`), and one cited neither way is
 * refused here as a safety net (`carboxySubstituent`). With a ring
 * (I-40b), a –COOH or –CHO bonded to a ring carbon is the ring's group:
 * `ácido ciclohexanocarboxílico`, `ciclohexano-1,2-dicarboxílico`,
 * `ciclohexanocarbaldehído`, the retained `ácido benzoico` / `benzaldehído`
 * (with `ácido bencenocarboxílico` / `bencenocarbaldehído` as
 * alternatives, benzeneSystematicAlternative()); on a side chain the chain
 * may be the parent (`ácido 2-feniletanoico`, with `ácido fenilacético`);
 * a C=O carbon bonded to the ring off the chain is `benzoil` /
 * `(ciclohexanocarbonil)` (render.js ringCarbonylTokens()). The traditional `ácido fórmico`, `ácido acético`
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
 * Esters (design.md §13.4 I-35) come after acids (ácido > éster >
 * aldehído…): the –COO–
 * carbon is a chain end of the parent like an acid's, locant 1, never
 * cited, suffix `-oato`; the group on the far side of the bridge O is named
 * like an alkoxy group's alkyl (substituent.js esterAlkyl()) and cited as
 * its own word, after `de` in Spanish and first in English (render.js
 * assembleEster()): `etanoato de metilo` / `methyl ethanoate`,
 * `butanoato de isopropilo` (with `propan-2-ilo` and `1-metiletilo` in the
 * other styles), `2-metilpropanoato de tert-butilo`, `3-oxobutanoato de
 * etilo`, `etanoato de 2-hidroxietilo`. A bare metanoato or etanoato also
 * gets `formiato de …` / `acetato de …`. A diester (I-39c) whose two
 * –COO– lie on one carbon piece has both carbons as the parent's ends
 * (`butanodioato de dimetilo`, `propanodioato de etilo y metilo`;
 * structure `esters`, render.js assembleEster()). Beside an acid an ester
 * is a prefix (I-39c): its carbon stays a chain carbon with `alcoxi` and
 * `oxo` prefixes when the chain reaches it (`ácido 4-metoxi-4-oxobutanoico`),
 * else it is `alcoxicarbonil` (`ácido 3-(metoxicarbonil)pentanodioico`);
 * bonded through its O it is `aciloxi` (`ácido 2-(acetiloxi)etanoico`;
 * substituent.js esterAttachment()). Validation refuses more than two
 * esters (`manyEsters`), two on different carbon pieces without an acid
 * (`esterPrefix`), a mixed diester that would need locants for its groups
 * (`mixedDiester`) and any ester with a ring (`ringEster`); an ester left
 * out of the suffix without an acid is refused here as a safety net
 * (`esterPrefix`).
 *
 * Amines (design.md §13.4 I-36) are the least senior group (… alcohol >
 * amina): the N is never a chain atom (like an ether O, it splits the
 * carbon skeleton), each N of a principal amine bonded to the parent is one
 * `-amina` suffix group, and the other groups on that N are prefixes with
 * the locant `N` (substituent.js nitrogenSubstituents()): `metanamina`,
 * `propan-2-amina`, `butano-1,4-diamina`, `N-metiletanamina`,
 * `N,N-dimetilmetanamina`, `N-etil-N-metilpropan-1-amina`,
 * `ciclohexanamina`, `bencenamina` (with `anilina`). The parent is the
 * chain with the most amine groups, then the longest… as for any principal
 * group (IUPAC 2013 P-44.1.1, P-62.2.2: the senior chain carries the suffix,
 * the others become N-substituents). Below a more senior group the amine
 * is the prefix `amino` (`2-aminoetan-1-ol`, `ácido 2-aminopropanoico`,
 * `2-(dimetilamino)etan-1-ol`). Refused here: a parent with two or more
 * amine groups where some N carries other groups (`substitutedPolyamine`,
 * N¹/N² locants) and a non-principal amine N joining identical parts that
 * each carry the principal group (`symmetricAmine`, multiplicative names).
 * A simple amine (one N, simple alkyl groups) also gets its traditional
 * name (`metilamina`, `dimetilamina`, `trimetilamina`, `etilmetilamina`;
 * amineClassAlternative()).
 *
 * Amides (design.md §13.4 I-37) sit between esters and aldehydes (ácido >
 * éster > amida > aldehído…): the –CONH₂ carbon is a chain end of the
 * parent like an acid's, locant 1, never cited, suffix `-amida`; the C=O
 * and the N are one group (never a ketone and an amine), and the groups on
 * the N are prefixes with the locant `N`, as for amines
 * (substituent.js nitrogenSubstituents()): `metanamida`, `etanamida`,
 * `2-metilpropanamida`, `prop-2-enamida`, `butanodiamida`,
 * `N-metiletanamida`, `N,N-dimetiletanamida`, `N-etil-N-metilpropanamida`,
 * `4-oxopentanamida`, `2-aminopropanamida`. Beside an acid or an ester,
 * or on another carbon piece, an amide is a prefix (I-39d): `amino` +
 * `oxo` on its carbon when the chain reaches it (`ácido
 * 4-amino-4-oxobutanoico`), else `carbamoil` (`ácido
 * 3-(metilcarbamoil)pentanodioico`), or `acilamino` bonded through its N
 * (`ácido 2-(acetilamino)etanoico`, `2-(acetilamino)etanamida`; P4 counts
 * only the prefixes on the chain, numbering.js). Validation refuses
 * amides with a ring (`ringAmide`), more than two on one carbon piece
 * with the amide principal (`manyAmides`), diamides with groups on an N
 * (`substitutedPolyamide`) and imides (`imide`); an amide cited neither as
 * a suffix nor as a prefix is refused here as a safety net (`amidePrefix`,
 * amidePrefixCount()). The bare (or
 * N-substituted) metanamida and etanamida also get `formamida` /
 * `acetamida` (`N,N-dimetilformamida`).
 *
 * Nitriles (design.md §13.4 I-38) sit between amides and aldehydes (…
 * amida > nitrilo > aldehído…): the –C≡N carbon is a chain end of the
 * parent like an acid's, locant 1, never cited, suffix `-nitrilo`; the N
 * is never a chain atom and the C≡N is never an `-ino` unsaturation:
 * `metanonitrilo`, `etanonitrilo`, `2-metilpropanonitrilo`,
 * `prop-2-enonitrilo`, `butanodinitrilo`, `4-oxopentanonitrilo`,
 * `2-aminopropanonitrilo`. Validation refuses nitriles with a ring
 * (`ringNitrile`) and more than two on one carbon piece when the nitrile
 * is principal (`manyNitriles`). The bare etanonitrilo also gets
 * `acetonitrilo`. A nitrile that is not principal (an acid, ester or amide
 * beside it) or that lies on a branch (I-39a) is the prefix `ciano-`,
 * whose carbon is outside the chain (principal.js outsideCarbons(),
 * substituent.js cyanoSubstituent()): `ácido 3-cianopropanoico`,
 * `2-cianoetanoato de metilo`, `3-cianopropanamida`, `etanoato de
 * cianometilo`, `3-(cianometoxi)propanonitrilo`. Validation refuses a
 * nitrile bonded to the carbon of an acid, ester or amide
 * (`carbonocyanidic`); a nitrile cited neither as a suffix nor as `ciano`
 * is refused here as a safety net (`cyanoPrefix`).
 *
 * Any other heteroatom (an N of an imide or imine, an O of an anhydride or carbonate, a peroxide) is
 * still refused (`HETEROATOM`), but the refusal carries `groups`: its
 * characteristic groups (groups.js), the principal group and the
 * suffix/prefix classification (seniority.js, design.md §13.4 I-29).
 * Successful results never have `groups`.
 */

import {
  validateForNaming, validationError, carboxylCarbons, etherOxygens, amineNitrogens, ACYL_SUBSTITUENT_MESSAGE,
  CARBOXY_SUBSTITUENT_MESSAGE, SYMMETRIC_ETHER_MESSAGE, SYMMETRIC_AMINE_MESSAGE, SUBSTITUTED_POLYAMINE_MESSAGE,
  amideCarbons, AMIDE_PREFIX_MESSAGE, nitrileCarbons, CYANO_PREFIX_MESSAGE, isAmineNitrogen, esterCarbons,
  ESTER_PREFIX_MESSAGE, SYMMETRIC_RING_MESSAGE,
} from '../model/validate.js';
import { adjacency, hasCycle, rootedBranchKey, cycleCore } from '../model/graph.js';
import { selectParent, ringOrChain } from './parent.js';
import {
  createNamingContext, collectSubstituents, groupPrefixes, nameKeyFunction, suffixSites, unnamedAcyl, PREFIX_STYLES,
  substituentSubtree, nameSubstituent, esterAlkyl, numberingPrefix,
} from './substituent.js';
import { numberParent, chainBonds } from './numbering.js';
import { buildChainStructure, buildNameStructure, buildSuffix, esterParts } from './structure.js';
import { renderName, suffixCount, suffixGroupIds, hasNitrogenLocants } from './render.js';
import { nameRingWithStyle, ringParent } from './rings.js';
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
 * Tells whether a name structure cites a retained prefix, at any depth,
 * the O-bound group of an ester included (`isopropilo`, design.md §13.4
 * I-35).
 *
 * @param {{prefixes: object[], ester?: {alkyl: object}}} structure - A name or substituent structure.
 * @param {string[]} ids - Retained-name ids, e.g. ['isopropyl', 'isopropylidene'].
 * @returns {boolean} True when some prefix (or nested prefix) is one of those retained groups.
 */
export function hasRetainedPrefix(structure, ids) {
  if (esterParts(structure).some((part) => ids.includes(part.alkyl.retained) || hasRetainedPrefix(part.alkyl, ids))) {
    return true;
  }
  return structure.prefixes.some((group) => ids.includes(group.substituent.retained) || hasRetainedPrefix(group.substituent, ids));
}

/** Retained prefixes whose presence triggers the alternative names (design.md §1.1). */
const STYLE_DEPENDENT_PREFIXES = Object.freeze(['isopropyl', 'isopropylidene']);

/**
 * Names a validated molecule under one prefix style: substituents,
 * numbering, grouping and rendering.
 *
 * @param {object} mol - A validated acyclic hydrocarbon, or a halogen derivative, alcohol, aldehyde, ketone, acid, ether or ester of one.
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
  const prefixesOf = (chain) => substituentsByChain.get(chain).map(numberingPrefix);
  const nameKey = nameKeyFunction([...substituentsByChain.values()], lexiconEs);
  const suffixesOf = (chain) => suffixSites(mol, adj, chain, ctx.principal).map((site) => site.atom);
  const numbering = numberParent(mol, selection.chains, prefixesOf, { adj, nameKey, suffixesOf });
  const substituents = substituentsByChain.get(selection.chains[numbering.chainIndex]);
  const parent = buildChainStructure(numbering.atoms, numbering.bonds, numbering.orders);
  const suffix = buildSuffix(suffixSites(mol, adj, numbering.atoms, ctx.principal), numbering.atoms, ctx.principal);
  // The O-bound group of each ester (design.md §13.4 I-35, I-39c): one or two –COO– (validation), carbons on the parent.
  const esters = suffix && suffix.kind === 'ester'
    ? suffix.locants.map((site) => esterAlkyl(ctx, site.atom, site.esterOxygen))
    : [];
  const structure = buildNameStructure({
    parent,
    prefixes: groupPrefixes(substituents, numbering.atoms),
    suffix,
    ...(esters.length > 0 ? { ester: esters[0], esters } : {}),
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
  // A ring candidate (the RINGCHAIN step, design.md §13.4 I-40a) already has its ring bonds.
  const add = (candidate) => ({ ...candidate, bonds: candidate.bonds ? [...candidate.bonds] : chainBonds(adj, candidate.atoms).bonds });
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
  // With a ring, a chain carrying more principal groups than the ring is the parent (design.md §13.4 I-40a).
  const choice = cyclic ? ringOrChain(mol, ringParent(mol)) : null;
  const chainParent = !cyclic || Boolean(choice && choice.chainParent);
  const found = chainParent ? selectParent(mol) : null;
  const symmetric = chainParent
    ? symmetricEther(mol) || symmetricAmine(mol)
    : null;
  if (symmetric) {
    return withGroups({ ok: false, error: symmetric }, mol);
  }
  const benzene = !chainParent && hasBenzeneRing(mol);
  const adj = chainParent ? adjacency(mol) : null;
  const selection = cyclic && chainParent ? { ...found, trace: [choice.step, ...found.trace] } : found;
  /**
   * Names the molecule under one prefix style: benzene (aromatic.js) or
   * another ring parent (rings.js) when the ring is the parent, else the
   * chain pipeline (an acyclic molecule, or a chain carrying more
   * principal groups than the ring, whose ring is then a prefix).
   *
   * @param {string} s - Prefix style.
   * @returns {object} The naming result without `alternatives`.
   */
  const nameIn = (s) => {
    if (benzene) {
      return nameBenzeneWithStyle(mol, s);
    }
    return chainParent ? nameWithStyle(mol, adj, selection, s) : nameRingWithStyle(mol, s);
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
  // each runs its own prefix naming, so one may need a branch the others
  // avoid (an unnamed acyl, a `ciano`…).
  const acids = carboxylCarbons(mol);
  const amides = amideCarbons(mol);
  const nitriles = nitrileCarbons(mol);
  const esters = acids.length === 0 ? esterCarbons(mol) : [];
  for (const s of new Set([style, PREFIX_STYLES[0], ...others])) {
    const { structure } = named(s);
    // The parent chosen by the whole cascade (P0…P4, N-rules, tie-break), never a chain left tied before numbering (I-40a).
    const ringTwins = cyclic && chainParent ? symmetricRing(mol, named(s).parent.atoms) : null;
    if (ringTwins) {
      return withGroups({ ok: false, error: ringTwins }, mol);
    }
    // An acyl branch without an acyl prefix (–CO–C≡N) on the parent, or inside an ester's O-bound group.
    const acyl = [structure, ...esterParts(structure).map((part) => part.alkyl)].map(unnamedAcyl).find(Boolean) || null;
    if (acyl) {
      return withGroups({ ok: false, error: acylError(acyl) }, mol);
    }
    if (acids.length > 0 && suffixCount(structure) + carboxyCount(structure) !== acids.length) {
      return withGroups({ ok: false, error: carboxyError(acids) }, mol);
    }
    if (esters.length > 0 && suffixCount(structure) !== esters.length) {
      // Safety net (I-39c): without an acid every ester is a suffix group (validation, esterPlacementError()).
      return withGroups({ ok: false, error: esterPrefixError(esters) }, mol);
    }
    const amideSuffixes = structure.suffix && structure.suffix.kind === 'amide' ? suffixCount(structure) : 0;
    if (amides.length > 0 && amideSuffixes + amidePrefixCount(structure) !== amides.length) {
      // Safety net (I-39d): every amide is a suffix group or one prefix (`amino…oxo`, `carbamoil`, `acilamino`).
      return withGroups({ ok: false, error: amidePrefixError(amides) }, mol);
    }
    const nitrileSuffixes = structure.suffix && structure.suffix.kind === 'nitrile' ? suffixCount(structure) : 0;
    if (nitriles.length > 0 && nitrileSuffixes + cyanoCount(structure) !== nitriles.length) {
      return withGroups({ ok: false, error: cyanoPrefixError(nitriles) }, mol);
    }
    if (structure.suffix && structure.suffix.kind === 'amine' && suffixCount(structure) > 1 && hasNitrogenLocants(structure.prefixes)) {
      return withGroups({ ok: false, error: polyamineError(structure) }, mol);
    }
  } // End of the loop over the emitted styles
  const located = locantAlternative(main);
  if (located) {
    alternatives.push(located);
  }
  for (const other of others) {
    const result = named(other);
    alternatives.push({ style: other, label: lexiconEs.styleLabel(other), name: result.name, parts: result.parts });
  }
  const systematic = benzene ? benzeneSystematicAlternative(main) : null;
  if (systematic) {
    alternatives.push(systematic);
  }
  const traditional = benzene ? traditionalAlternative(main) : carbonylAlternative(main);
  if (traditional) {
    alternatives.push(traditional);
  }
  const functionalClass = etherClassAlternative(mol, main) || amineClassAlternative(mol, main);
  if (functionalClass) {
    alternatives.push(functionalClass);
  }
  return { ...main, alternatives };
} // End of function nameValidated()

/**
 * The HETEROATOM refusal of a parent with two or more amine groups where
 * some nitrogen carries other groups (design.md §13.4 I-36): IUPAC 2013
 * tells the nitrogens apart with locants N¹, N²… (`N¹-metiletano-1,2-diamina`),
 * which the app does not write. `atoms` lists the nitrogens of the suffix.
 *
 * @param {object} structure - The name structure (an amine suffix with several groups).
 * @returns {{code: string, message: string, atoms: number[], reason: string}} The error.
 */
function polyamineError(structure) {
  const atoms = structure.suffix.locants.map((site) => site.attachAtom).sort((p, q) => p - q);
  return validationError('HETEROATOM', { message: SUBSTITUTED_POLYAMINE_MESSAGE, atoms, reason: 'substitutedPolyamine' });
}

/**
 * The HETEROATOM refusal of an acyclic molecule with an amine nitrogen
 * that is not the principal group and joins two or three identical parts,
 * each carrying the principal group (design.md §13.4 I-36): for
 * HO–CH₂CH₂–NH–CH₂CH₂–OH IUPAC 2013 uses multiplicative nomenclature,
 * `2,2′-azanodiildi(etan-1-ol)` (P-15.3), which the app does not support,
 * as for ethers (symmetricEther()). Parts are identical when their rooted
 * tree keys seen from the N are equal. Null otherwise (and always when the
 * amine is principal, or without a principal group).
 *
 * @param {object} mol - A validated acyclic molecule.
 * @returns {{code: string, message: string, atoms: number[], reason: string}|null} The error, or null.
 */
function symmetricAmine(mol) {
  const nitrogens = amineNitrogens(mol);
  if (nitrogens.length === 0) {
    return null;
  }
  const adj = adjacency(mol);
  const principal = principalKindOf(mol, adj);
  if (principal === null || principal === 'amine') {
    return null;
  }
  for (const nitrogen of nitrogens) {
    const sides = adj.get(nitrogen).map((n) => ({ atom: n.atom, key: rootedBranchKey(mol, n.atom, nitrogen, adj) }));
    for (const side of sides) {
      const twins = sides.filter((other) => other.key === side.key);
      const carries = substituentSubtree(adj, nitrogen, side.atom).atoms.some((id) => isPrincipalOxygen(mol, adj, id, principal));
      if (twins.length > 1 && carries) {
        const atoms = [nitrogen, ...twins.flatMap((twin) => substituentSubtree(adj, nitrogen, twin.atom).atoms)].sort((p, q) => p - q);
        return validationError('HETEROATOM', { message: SYMMETRIC_AMINE_MESSAGE, atoms, reason: 'symmetricAmine' });
      }
    }
  } // End of the loop over the amine nitrogens
  return null;
} // End of function symmetricAmine()

/**
 * The traditional name of a simple amine (design.md §13.4 I-36): the
 * groups on its one nitrogen (etherSideName(): unbranched saturated alkyl
 * groups bonded by their end, or `isopropil` / `tert-butil`), in
 * alphabetical order (`tert-` and the multipliers not counted), identical
 * ones multiplied, then `amina`, all in one word — `metilamina`,
 * `dimetilamina`, `trimetilamina`, `etilmetilamina`, `etildimetilamina`,
 * `isopropilamina`, `tert-butilamina`. Spanish school books use these
 * names; IUPAC 2013 prefers the substitutive ones (`metanamina`,
 * `N-metilmetanamina`, P-62.2.1), so it is listed last under "Otras formas
 * válidas". Offered only when the molecule is that N and its groups (no
 * ring, no other heteroatom). Its one part refers to every atom and bond.
 * Null otherwise.
 *
 * @param {object} mol - The validated molecule.
 * @param {object} result - Its naming result.
 * @returns {{style: string, label: string, name: string, parts: object[]}|null} The alternative.
 */
function amineClassAlternative(mol, result) {
  const name = amineClassName(mol, result.structure);
  if (!name) {
    return null;
  }
  const parts = [{ text: name, kind: 'stem', atoms: [...mol.atoms.keys()], bonds: [...mol.bonds.keys()] }];
  return { style: 'amineClass', label: lexiconEs.styleLabel('amineClass'), name, parts };
} // End of function amineClassAlternative()

/**
 * The traditional alkylamine name of a molecule in a lexicon (design.md
 * §13.4 I-36; amineClassAlternative()): the groups on its one amine N in
 * alphabetical order (`tert-` and the multipliers ignored; on equal
 * letters the plain name first), identical ones multiplied, then the
 * lexicon's `amineClassWord` — Spanish `etilmetilamina`, English
 * `ethylmethylamine` (the oracle checks the English form). Null unless the
 * molecule is one N and simple alkyl groups (etherSideName()) on a chain
 * parent.
 *
 * @param {object} mol - The validated molecule.
 * @param {object} structure - Its name structure (any prefix style).
 * @param {object} [lexicon] - The lexicon (default: Spanish).
 * @returns {string|null} The name.
 */
export function amineClassName(mol, structure, lexicon = lexiconEs) {
  const others = [...mol.atoms.values()].filter((atom) => atom.element !== 'C');
  if (others.length !== 1 || others[0].element !== 'N' || structure.parentKind !== 'chain') {
    return null;
  }
  const nitrogen = others[0].id;
  const adj = adjacency(mol);
  if (!isAmineNitrogen(mol, adj, nitrogen)) {
    return null; // The N of a nitrile (I-38) or an amide: no alkylamine name.
  }
  const sides = adj.get(nitrogen).map((n) => etherSideName(nameSubstituent(mol, nitrogen, n.atom), lexicon));
  if (sides.includes(null)) {
    return null;
  }
  const letters = (name) => name.replace(/^tert-/, '');
  // Alphabetical without `tert-`; on equal letters the plain name first (`butil-tert-butil…`).
  const distinct = [...new Set(sides)].sort((x, y) => (letters(x) === letters(y) ? x.length - y.length : (letters(x) < letters(y) ? -1 : 1)));
  const words = distinct.map((side) => {
    const n = sides.filter((other) => other === side).length;
    const mult = lexicon.multiplier(n);
    return mult && side.startsWith('tert-') ? `${mult}-${side}` : `${mult}${side}`; // `di-tert-butilamina`.
  });
  return `${words.join('')}${lexicon.amineClassWord}`;
} // End of function amineClassName()

/**
 * The HETEROATOM refusal of a molecule whose name (in some emitted style)
 * has an acyl branch without an acyl prefix (substituent.js unnamedAcyl(),
 * design.md §13.4 I-32, I-39b): a one-carbon acyl group carrying a
 * `ciano`, –CO–C≡N, which IUPAC 2013 names `carbonocianidoil` (from
 * memory), not supported. A one-carbon acyl group bonded to the ring is
 * named since I-40b (`benzoil`, `(ciclohexanocarbonil)`).
 *
 * @param {{atoms: number[], bonds: number[]}} acyl - The C=O atoms of the acyl branch.
 * @returns {{code: string, message: string, atoms: number[], reason: string}} The error.
 */
function acylError(acyl) {
  return validationError('HETEROATOM', { message: ACYL_SUBSTITUENT_MESSAGE, atoms: [...acyl.atoms], reason: 'acylSubstituent' });
}

/**
 * The HETEROATOM refusal of a molecule whose name would cite a –COOH
 * neither in the parent's suffix nor as a `carboxi-` prefix (design.md
 * §13.4 I-33, I-40b). A safety net: validation (`manyAcids`) and the chain
 * machinery make it unreachable.
 *
 * @param {number[]} acids - The carboxyl carbons of the molecule.
 * @returns {{code: string, message: string, atoms: number[], reason: string}} The error.
 */
function carboxyError(acids) {
  return validationError('HETEROATOM', { message: CARBOXY_SUBSTITUENT_MESSAGE, atoms: [...acids], reason: 'carboxySubstituent' });
}

/**
 * The HETEROATOM refusal of a molecule without an acid whose name would
 * leave an ester out of the parent's suffix (an `alcoxicarbonil-` or
 * `aciloxi-` prefix beside a principal ester, design.md §13.4 I-39c). A
 * safety net: validation already refuses every molecule where this can
 * happen (`esterPrefix`, `manyEsters`).
 *
 * @param {number[]} esters - The ester carbons of the molecule.
 * @returns {{code: string, message: string, atoms: number[], reason: string}} The error.
 */
function esterPrefixError(esters) {
  return validationError('HETEROATOM', { message: ESTER_PREFIX_MESSAGE, atoms: [...esters], reason: 'esterPrefix' });
}

/**
 * The HETEROATOM refusal of a molecule whose name would leave an amide out
 * of the parent's suffix (a `carbamoil-` or `acilamino-` prefix, design.md
 * §13.4 I-37). A safety net: validation already refuses every molecule
 * where this can happen (`amidePrefix`, `manyAmides`, `ringAmide`).
 *
 * @param {number[]} amides - The amide carbons of the molecule.
 * @returns {{code: string, message: string, atoms: number[], reason: string}} The error.
 */
function amidePrefixError(amides) {
  return validationError('HETEROATOM', { message: AMIDE_PREFIX_MESSAGE, atoms: [...amides], reason: 'amidePrefix' });
}

/**
 * The number of amide groups cited as prefixes in a name structure, at
 * any depth, the O-bound group of an ester included (design.md §13.4
 * I-39d): each amide N cited as an `amino` on its own carbon (an amide
 * carbon in a chain, `4-amino-4-oxo…`, or the one carbon of a `carbamoil`
 * group; the occurrence is flagged `amide`) and each acyl group seen from
 * an amide's N (`amideAcyl`: the acyl of `acetilamino`). Every amide that
 * is not a suffix group should be one.
 *
 * @param {{prefixes: object[], ester?: {alkyl: object}}} structure - A name or substituent structure.
 * @returns {number} The count.
 */
export function amidePrefixCount(structure) {
  const own = structure.prefixes.reduce((sum, group) => {
    const sub = group.substituent;
    const here = group.locants.filter((site) => (sub.amino && site.amide) || sub.amideAcyl).length;
    return sum + here + group.locants.length * amidePrefixCount(sub);
  }, 0);
  return own + esterParts(structure).reduce((sum, part) => sum + amidePrefixCount(part.alkyl), 0);
}

/**
 * The number of `ciano` prefixes cited in a name structure, at any depth,
 * the O-bound group of an ester and the groups on an N included (design.md
 * §13.4 I-39a): every nitrile that is not a suffix group should be one.
 *
 * @param {{prefixes: object[], ester?: {alkyl: object}}} structure - A name or substituent structure.
 * @returns {number} The count.
 */
export function cyanoCount(structure) {
  const own = structure.prefixes.reduce((sum, group) => sum
    + (group.substituent.cyano ? group.locants.length : group.locants.length * cyanoCount(group.substituent)), 0);
  return own + esterParts(structure).reduce((sum, part) => sum + cyanoCount(part.alkyl), 0);
}

/**
 * The number of `carboxi` prefixes cited in a name structure, at any depth,
 * the O-bound group of an ester and the groups on an N included (design.md
 * §13.4 I-40b): every –COOH that is not a suffix group should be one.
 *
 * @param {{prefixes: object[], ester?: {alkyl: object}}} structure - A name or substituent structure.
 * @returns {number} The count.
 */
export function carboxyCount(structure) {
  const own = structure.prefixes.reduce((sum, group) => sum
    + (group.substituent.carboxy ? group.locants.length : group.locants.length * carboxyCount(group.substituent)), 0);
  return own + esterParts(structure).reduce((sum, part) => sum + carboxyCount(part.alkyl), 0);
}

/**
 * The HETEROATOM refusal of a molecule whose name neither cites a nitrile
 * as a suffix group nor as a `ciano` prefix (design.md §13.4 I-38, I-39a).
 * A safety net that validation and the chain machinery make unreachable
 * (`manyNitriles`, `ringNitrile`, `carbonocyanidic`).
 *
 * @param {number[]} nitriles - The nitrile carbons of the molecule.
 * @returns {{code: string, message: string, atoms: number[], reason: string}} The error.
 */
function cyanoPrefixError(nitriles) {
  return validationError('HETEROATOM', { message: CYANO_PREFIX_MESSAGE, atoms: [...nitriles], reason: 'cyanoPrefix' });
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
 * traditional name (aromatic.js traditionalAlternative()). For an ester
 * (design.md §13.4 I-35) only the acid part is traditional: `formiato de
 * metilo`, `acetato de isopropilo` (render.js renderName() `traditional`);
 * for an amide (I-37) the groups on its N stay too: `N-metilacetamida`.
 *
 * @param {object} result - The main naming result.
 * @returns {{style: string, label: string, name: string, parts: object[]}|null} The alternative.
 */
function carbonylAlternative(result) {
  const id = carbonylTraditionalId(result.structure);
  if (!id) {
    return null;
  }
  if (result.structure.ester || result.structure.suffix.kind === 'amide') {
    // `acetato de etilo`, `N-metilacetamida`: the traditional word, with the O-bound group or the N groups (render.js).
    return { style: 'traditional', label: lexiconEs.traditionalLabel(id), ...renderName(result.structure, lexiconEs, { traditional: id }) };
  }
  const name = lexiconEs.traditionalName(id);
  const group = suffixGroupIds(result.structure.suffix);
  // The `fenil` group of `acetofenona`, `alcohol bencílico`, `bencilamina` (I-40a) is part of the word too.
  const sites = result.structure.prefixes.flatMap((g) => g.locants);
  const atoms = [...new Set([...result.parent.atoms, ...group.atoms, ...sites.flatMap((site) => site.atoms)])];
  const bonds = [...result.parent.bonds, ...group.bonds, ...sites.flatMap((site) => [site.bond, ...site.bonds])];
  return { style: 'traditional', label: lexiconEs.traditionalLabel(id), name, parts: [{ text: name, kind: 'stem', atoms, bonds }] };
} // End of function carbonylAlternative()

/**
 * The systematic alternative of `ácido benzoico` and `benzaldehído`
 * (design.md §13.4 I-40b): the benzene name with the `-carboxílico` /
 * `-carbaldehído` suffix, `ácido bencenocarboxílico`,
 * `bencenocarbaldehído`, which some school books use; IUPAC 2013 prefers
 * the retained names (from memory), so this one is listed under "Otras
 * formas válidas". Null for any other name.
 *
 * @param {object} result - The main naming result.
 * @returns {{style: string, label: string, name: string, parts: object[]}|null} The alternative.
 */
function benzeneSystematicAlternative(result) {
  const { structure } = result;
  if (structure.parentKind !== 'ring' || structure.parent.retained !== 'benzene' || !structure.suffix || !structure.suffix.outside) {
    return null;
  }
  const rendered = renderName(structure, lexiconEs, { systematic: true });
  return { style: 'benzeneSystematic', label: lexiconEs.styleLabel('benzeneSystematic'), ...rendered };
}

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
    if (rootedBranchKey(mol, a, oxygen, adj) !== rootedBranchKey(mol, b, oxygen, adj)) {
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
 * The HETEROATOM refusal of a ring molecule whose parent is a chain when
 * the ring carries two or more identical branches, one of which holds the
 * parent chain (design.md §13.4 I-40a): each of them carries as many
 * principal groups as the parent, and IUPAC 2013 names such a molecule
 * with multiplicative nomenclature (HOCH₂–C₆H₁₀–CH₂OH is
 * `ciclohexano-1,4-diildimetanol`, P-15.3, from memory), which the app
 * does not support, as for ethers and amines (symmetricEther(),
 * symmetricAmine()). Branches are identical when their rooted keys seen
 * from their ring atoms (graph.js rootedBranchKey()) and their connecting
 * bond orders are equal. `atoms` lists the ring and those branches.
 *
 * @param {object} mol - A validated ring molecule whose parent is a chain.
 * @param {number[]} chain - The parent chain chosen by the whole selection and numbering cascade (a naming result's `parent.atoms`), so the check never depends on atom order.
 * @returns {{code: string, message: string, atoms: number[], reason: string}|null} The error, or null.
 */
function symmetricRing(mol, chain) {
  const adj = adjacency(mol);
  const ring = cycleCore(adj);
  const branches = [...ring].flatMap((atom) => adj.get(atom)
    .filter((n) => !ring.has(n.atom))
    .map((n) => ({
      atom: n.atom,
      key: `${n.order}${rootedBranchKey(mol, n.atom, atom, adj)}`,
      atoms: substituentSubtree(adj, atom, n.atom).atoms,
    })));
  const home = branches.find((branch) => branch.atoms.includes(chain[0]));
  const twins = branches.filter((branch) => branch.key === home.key);
  if (twins.length < 2) {
    return null;
  }
  const atoms = [...ring, ...twins.flatMap((twin) => twin.atoms)].sort((p, q) => p - q);
  return validationError('HETEROATOM', { message: SYMMETRIC_RING_MESSAGE, atoms, reason: 'symmetricRing' });
} // End of function symmetricRing()

/**
 * The prefix of one side of a simple ether (or of a group on a simple
 * amine's N) as used in its functional-class or traditional name
 * (design.md §13.4 I-34, I-36): an unbranched saturated alkyl group bonded
 * by its end (`metil`, `etil`, `propil`…), or the retained `isopropil` /
 * `tert-butil`; null for anything else (a branched, unsaturated or
 * substituted group).
 *
 * @param {object} sub - The side named as a substituent of the O or N (substituent.js nameSubstituent(), default style).
 * @param {object} [lexicon] - The lexicon (default: Spanish).
 * @returns {string|null} The prefix.
 */
function etherSideName(sub, lexicon = lexiconEs) {
  if (sub.retained === 'isopropyl' || sub.retained === 'tert-butyl') {
    const { italic, text } = lexicon.retainedPrefix(sub.retained);
    return `${italic}${text}`;
  }
  const { chain } = sub;
  if (sub.retained || sub.ring || sub.prefixes.length > 0 || sub.freeValence.locant !== 1
    || chain.double.length + chain.triple.length > 0) {
    return null;
  }
  return lexicon.alkylPrefix(chain.length);
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
