/**
 * @file Spanish word tables and morphology rules for IUPAC 2013 names
 * (design.md §1.1): stems 1–30, multipliers (di/tri… and bis/tris…),
 * endings, the connecting `a`, the `en`/`ino` rules, the locant-omission
 * table, the group-name vs. prefix forms, substituent-prefix morphology
 * (`il`, `an`, retained `isopropil`/`tert-butil`, enclosing marks), common
 * group names for explanations and the prefix-style labels, and the retained
 * benzene words (`benceno`, the `fenil` prefix, the traditional names
 * `tolueno` and `estireno`, design.md §13.4 I-28), and the suffixes,
 * prefixes and family names of the characteristic groups (`-oico`, `-ol`,
 * `hidroxi`, `cloro`…, design.md §13.6), with the halogen prefixes named
 * since I-30 (`clorometano`, `2-bromo-1-cloropropano`), the alcohol suffix
 * `-ol` and prefix `hidroxi` and the retained `fenol` since I-31, and the
 * omission of their locants on one- and two-carbon, monosubstituted ring and
 * fully halogenated parents.
 *
 * Everything that depends on the language lives here; render.js only
 * assembles parts and punctuation. The exported `lexiconEs` object is the
 * interface render.js expects from any lexicon (lexicon.en.js provides the
 * same members).
 */

/** Chain stems indexed by carbon count (index 0 unused). */
const STEMS = Object.freeze([
  null, 'met', 'et', 'prop', 'but', 'pent', 'hex', 'hept', 'oct', 'non', 'dec',
  'undec', 'dodec', 'tridec', 'tetradec', 'pentadec', 'hexadec', 'heptadec', 'octadec', 'nonadec', 'icos',
  'henicos', 'docos', 'tricos', 'tetracos', 'pentacos', 'hexacos', 'heptacos', 'octacos', 'nonacos', 'triacont',
]);

/** Largest supported chain length (design.md §1.1 hard cap). */
export const MAX_STEM = 30;

/**
 * Largest supported multiplier. Independent of MAX_STEM: with the 60-carbon
 * cap a parent can carry up to 38 identical methyl groups, so multipliers
 * are composed beyond 30 (`hentriaconta`, `dotriaconta`…) up to 99.
 */
export const MAX_MULTIPLIER = 99;

/** Unit parts of composed numerical terms 31–99 (IUPAC 2013 P-14.2.1: hen, do, tri…). */
const UNIT_PARTS = Object.freeze(['', 'hen', 'do', 'tri', 'tetra', 'penta', 'hexa', 'hepta', 'octa', 'nona']);

/** Tens parts of numerical terms 30–99 (without the final a). */
const TENS_PARTS = Object.freeze({
  3: 'triacont', 4: 'tetracont', 5: 'pentacont', 6: 'hexacont', 7: 'heptacont', 8: 'octacont', 9: 'nonacont',
});

/** Simple multipliers that are not stem + `a` (index = count). */
const SMALL_MULTIPLIERS = Object.freeze(['', '', 'di', 'tri', 'tetra']);

/** Compound (parenthesised-prefix) multipliers that are not multiplier + `kis`. */
const SMALL_COMPOUND_MULTIPLIERS = Object.freeze(['', '', 'bis', 'tris']);

/**
 * Nondetachable prefix of a ring parent: `ciclo` + chain stem + ending
 * (ciclohexano; IUPAC 2013 P-22.1.1: the nondetachable prefix cyclo + the name of the unbranched saturated chain with as many carbons).
 */
export const RING_PREFIX = 'ciclo';

/**
 * Retained name of the benzene ring as a parent (IUPAC 2013 P-22.1.2:
 * `benzene` is retained; `ciclohexa-1,3,5-trieno` is not an acceptable name).
 */
export const BENZENE_NAME = 'benceno';

/**
 * Stem of the retained name `fenol` (C₆H₅–OH; IUPAC 2013 P-63.1.1.1: phenol
 * is the retained preferred name, `bencenol` is not used). The name is
 * rendered as this stem plus the alcohol suffix (`fen` + `ol`), so the `ol`
 * part can point at the OH group.
 */
export const PHENOL_STEM = 'fen';

/**
 * Traditional names of monosubstituted benzenes still retained by IUPAC 2013
 * (P-22.1.3), keyed by the id aromatic.js traditionalNameId() returns. They
 * are only listed under "Otras formas válidas" (design.md §13.1: the
 * systematic name comes first). `tolueno` is even the 2013 preferred name
 * (substitution allowed on the ring only); `estireno` is retained for general
 * nomenclature. Cumene, cymene and the like are no longer retained
 * (P-22.1.3), so `cumeno` is not offered.
 */
export const TRADITIONAL_NAMES = Object.freeze({
  toluene: 'tolueno',
  styrene: 'estireno',
  formaldehyde: 'formaldehído',
  acetaldehyde: 'acetaldehído',
  acetone: 'acetona',
  formicAcid: 'ácido fórmico',
  aceticAcid: 'ácido acético',
  oxalicAcid: 'ácido oxálico',
  formate: 'formiato',
  acetate: 'acetato',
  anisole: 'anisol',
  aniline: 'anilina',
  formamide: 'formamida',
  acetamide: 'acetamida',
  acetonitrile: 'acetonitrilo',
  acetophenone: 'acetofenona',
  benzylAlcohol: 'alcohol bencílico',
  benzylamine: 'bencilamina',
  phenylaceticAcid: 'ácido fenilacético',
  phenylacetaldehyde: 'fenilacetaldehído',
  phenylacetamide: '2-fenilacetamida',
  phenylacetonitrile: 'fenilacetonitrilo',
  phenylacetate: 'fenilacetato',
});

/**
 * Labels shown next to each traditional name (design.md §1.1 style labels).
 * The carbonyl names (design.md §13.4 I-32; principal.js
 * carbonylTraditionalId()) are offered for the bare molecules only:
 * `formaldehído` (metanal) and `acetaldehído` (etanal) are retained by IUPAC
 * 2013 (aldehydes, P-66.6), `acetona` (propanona) is kept for general
 * nomenclature (ketones, P-64); all three are the everyday names found in
 * Spanish school books. The acid names (design.md §13.4 I-33) are offered
 * for the bare ácido metanoico, etanoico and etanodioico: IUPAC 2013
 * retains `formic acid`, `acetic acid` and `oxalic acid` as preferred
 * names (P-65.1.1.1), so they are labelled like `tolueno`; the other
 * school names (propiónico, butírico, malónico, succínico…) are not
 * offered, to keep the list small. The esters of formic and acetic acid
 * (design.md §13.4 I-35) keep those acid names too: `formiato` and
 * `acetato` replace a bare `metanoato` / `etanoato` (`acetato de etilo`,
 * `formiato de metilo`; IUPAC 2013 P-65.6.3.2 methyl acetate), labelled
 * like the acids; no other ester name (propionato, butirato…) is offered.
 * `anisol` (design.md §13.4 I-34) is
 * offered for the bare metoxibenceno: IUPAC 2013 retains `anisole` (the
 * app says only that it is accepted, the exact status being from memory).
 * `anilina` (design.md §13.4 I-36) replaces `bencenamina`, also after
 * groups on its nitrogen (`N-metilanilina`): IUPAC 2013 retains `aniline`
 * as the preferred name (P-62.2.1.1.1), so it is labelled like `tolueno`.
 * `formamida` and `acetamida` (design.md §13.4 I-37) replace a bare
 * `metanamida` / `etanamida`, also after groups on the N
 * (`N,N-dimetilformamida`, `N-metilacetamida`): IUPAC 2013 retains formamide
 * and acetamide as preferred names (P-66.1.1.1.1; status from memory), so
 * they are labelled like `tolueno`; no other amide name (propionamida…).
 * `acetonitrilo` (design.md §13.4 I-38) replaces the bare `etanonitrilo`:
 * IUPAC 2013 retains acetonitrile as the preferred name (P-66.5.1.1.1;
 * status from memory), so it is labelled like `tolueno`. No other nitrile
 * name is offered (`formonitrilo`, `propionitrilo`, `acrilonitrilo`) and no
 * `cianuro de …` name (functional-class names of nitriles are not IUPAC
 * 2013 names; `cianuro de hidrógeno` is an inorganic name).
 * `acetofenona`, `alcohol bencílico` and `bencilamina` (design.md §13.4
 * I-40a) replace the bare 1-feniletan-1-ona, fenilmetanol and
 * fenilmetanamina: IUPAC 2013 accepts them in general nomenclature, not as
 * preferred names (status from memory), so they are labelled like
 * `acetona`; no other name built on `bencil` or `fenetil` is offered.
 * `ácido fenilacético` and `fenilacetaldehído` (design.md §13.4 I-40b)
 * replace the bare ácido 2-feniletanoico and 2-feniletanal: acetic acid and
 * acetaldehyde keep their retained names with a phenyl group on the CH₃
 * (status from memory; the app says only that they are accepted, as it
 * names `ácido 2-cloroetanoico` without `cloroacético`). Likewise (I-40c)
 * `2-fenilacetamida` and `fenilacetonitrilo` for the bare 2-feniletanamida
 * and 2-feniletanonitrilo; the amide keeps the locant 2, since its N could
 * carry the phenyl too (`N-fenilacetamida`; from memory).
 */
export const TRADITIONAL_LABELS = Object.freeze({
  toluene: 'nombre tradicional, que la IUPAC (2013) conserva como preferido',
  styrene: 'nombre tradicional, que la IUPAC (2013) acepta',
  formaldehyde: 'nombre tradicional, que la IUPAC (2013) conserva',
  acetaldehyde: 'nombre tradicional, que la IUPAC (2013) conserva',
  acetone: 'nombre tradicional, que la IUPAC (2013) acepta',
  formicAcid: 'nombre tradicional, que la IUPAC (2013) conserva como preferido',
  aceticAcid: 'nombre tradicional, que la IUPAC (2013) conserva como preferido',
  oxalicAcid: 'nombre tradicional, que la IUPAC (2013) conserva como preferido',
  formate: 'nombre tradicional, que la IUPAC (2013) conserva como preferido',
  acetate: 'nombre tradicional, que la IUPAC (2013) conserva como preferido',
  anisole: 'nombre tradicional, que la IUPAC (2013) acepta',
  aniline: 'nombre tradicional, que la IUPAC (2013) conserva como preferido',
  formamide: 'nombre tradicional, que la IUPAC (2013) conserva como preferido',
  acetamide: 'nombre tradicional, que la IUPAC (2013) conserva como preferido',
  acetonitrile: 'nombre tradicional, que la IUPAC (2013) conserva como preferido',
  acetophenone: 'nombre tradicional, que la IUPAC (2013) acepta',
  benzylAlcohol: 'nombre tradicional, que la IUPAC (2013) acepta',
  benzylamine: 'nombre tradicional, que la IUPAC (2013) acepta',
  phenylaceticAcid: 'nombre tradicional, que la IUPAC (2013) acepta',
  phenylacetaldehyde: 'nombre tradicional, que la IUPAC (2013) acepta',
  phenylacetamide: 'nombre tradicional, que la IUPAC (2013) acepta',
  phenylacetonitrile: 'nombre tradicional, que la IUPAC (2013) acepta',
  phenylacetate: 'nombre tradicional, que la IUPAC (2013) acepta',
});

/** Endings of the parent name. */
export const ENDINGS = Object.freeze({ saturated: 'ano', double: 'eno', triple: 'ino' });

/** The vowel kept after the stem when the first unsaturation segment is multiplied. */
export const CONNECTING_VOWEL = 'a';

/**
 * Order in which unsaturation segments are cited: `en` always before `ino`,
 * whatever their locants (`pent-3-en-1-ino`).
 */
export const SEGMENT_ORDER = Object.freeze(['double', 'triple']);

/**
 * Unsubstituted parents whose locants are omitted (design.md §1.1). This is
 * an explicit table, never inferred from "only one structural possibility".
 * Every other name keeps all its locants (`but-1-eno`, `2-metilprop-1-eno`).
 * `metano` and `etano` have no locants to omit and are listed for completeness.
 */
export const LOCANT_OMISSION = Object.freeze([
  { name: 'metano', length: 1, double: [], triple: [] },
  { name: 'etano', length: 2, double: [], triple: [] },
  { name: 'eteno', length: 2, double: [1], triple: [] },
  { name: 'etino', length: 2, double: [], triple: [1] },
  { name: 'propeno', length: 3, double: [1], triple: [] },
  { name: 'propino', length: 3, double: [], triple: [1] },
  { name: 'propadieno', length: 3, double: [1, 2], triple: [] },
]);

/**
 * Checks that a count is an integer within 1…max.
 *
 * @param {number} n - The count.
 * @param {string} caller - Function name for the error message.
 * @param {number} [max] - Upper bound (default MAX_STEM).
 * @returns {void}
 * @throws {RangeError} When the count is out of range.
 */
function checkCount(n, caller, max = MAX_STEM) {
  if (!Number.isInteger(n) || n < 1 || n > max) {
    throw new RangeError(`${caller}: count must be an integer from 1 to ${max}, got ${n}`);
  }
}

/**
 * Numerical term without its final `a` for 1–99: the stem table up to 30,
 * then unit part + tens part (`hentriacont`, `dotriacont`, `tetracont`).
 *
 * @param {number} n - The number (1–99).
 * @returns {string} The numerical term, e.g. 'dotriacont' for 32.
 */
function numeralTerm(n) {
  if (n <= MAX_STEM) {
    return STEMS[n];
  }
  return UNIT_PARTS[n % 10] + TENS_PARTS[Math.floor(n / 10)];
}

/**
 * Returns the Spanish stem for a chain of the given length.
 *
 * @param {number} length - Number of carbon atoms (1–30).
 * @returns {string} The stem, e.g. 'but' for 4, 'icos' for 20.
 * @throws {RangeError} When the length is out of range.
 */
export function stem(length) {
  checkCount(length, 'stem');
  return STEMS[length];
}

/**
 * Returns the simple multiplying prefix (for simple prefixes and endings).
 * One takes no multiplier.
 *
 * @param {number} n - How many identical items (1–MAX_MULTIPLIER).
 * @returns {string} '', 'di', 'tri', 'tetra', 'penta', … 'undeca', 'icosa', 'dotriaconta'…
 * @throws {RangeError} When n is out of range.
 */
export function multiplier(n) {
  checkCount(n, 'multiplier', MAX_MULTIPLIER);
  return n < SMALL_MULTIPLIERS.length ? SMALL_MULTIPLIERS[n] : `${numeralTerm(n)}a`;
}

/**
 * Returns the multiplying prefix for compound (parenthesised) prefixes.
 *
 * @param {number} n - How many identical items (1–MAX_MULTIPLIER).
 * @returns {string} '', 'bis', 'tris', 'tetrakis', 'pentakis'…
 * @throws {RangeError} When n is out of range.
 */
export function compoundMultiplier(n) {
  checkCount(n, 'compoundMultiplier', MAX_MULTIPLIER);
  return n < SMALL_COMPOUND_MULTIPLIERS.length ? SMALL_COMPOUND_MULTIPLIERS[n] : `${multiplier(n)}kis`;
}

/**
 * Returns the ending of one unsaturation segment. The non-final `eno`
 * loses its `o` before `ino` (`hexa-1,3-dien-5-ino`).
 *
 * @param {'double'|'triple'} kind - Segment kind.
 * @param {boolean} isFinal - Whether the segment ends the name.
 * @returns {string} 'eno', 'en' or 'ino'.
 */
export function unsaturationEnding(kind, isFinal) {
  if (kind === 'triple') {
    return ENDINGS.triple;
  }
  return isFinal ? ENDINGS.double : ENDINGS.double.slice(0, -1);
}

/**
 * Tells whether the stem keeps the connecting `a`: only when the **first**
 * cited unsaturation segment is multiplied (`buta-1,3-dieno`,
 * `hexa-1,3-dien-5-ino`, but `hex-1-en-3,5-diino`, `but-1-eno`).
 *
 * @param {{double: object[], triple: object[]}} chain - The chain structure.
 * @returns {boolean} True when the connecting vowel is added.
 */
export function needsConnectingVowel(chain) {
  const first = SEGMENT_ORDER.map((kind) => chain[kind]).find((sites) => sites.length > 0);
  return Boolean(first) && first.length > 1;
}

/**
 * Looks up the locant-omission table for the unsaturation locants of a
 * parent chain. A chain of three or more carbons omits them only without
 * prefixes (`propeno`, but `2-metilprop-1-eno`, `3-cloroprop-1-eno`); a
 * one- or two-carbon parent never has a locant to cite for its multiple
 * bond, prefixes or not (`eteno`, `cloroeteno`, `1,2-dicloroeteno`,
 * `cloroetino`; only halogen derivatives put prefixes on them, design.md
 * §13.4 I-30).
 *
 * @param {{length: number, double: {locant: number}[], triple: {locant: number}[]}} chain - The parent chain structure.
 * @param {boolean} hasPrefixes - Whether the parent carries substituent prefixes.
 * @returns {boolean} True when the parent's locants are omitted.
 */
export function omitsLocants(chain, hasPrefixes) {
  if (hasPrefixes && chain.length > 2) {
    return false;
  }
  const same = (sites, locants) => sites.length === locants.length && sites.every((s, i) => s.locant === locants[i]);
  return LOCANT_OMISSION.some(
    (row) => row.length === chain.length && same(chain.double, row.double) && same(chain.triple, row.triple),
  );
}

/**
 * Locant omission for a ring parent (design.md §1.1, §13.4 I-26, I-31), an
 * explicit rule like the chain table above, never inferred from "only one
 * structural possibility":
 * - an unsubstituted monocycle with exactly one multiple bond omits its
 *   locant: `ciclohexeno`, `ciclooctino` (every lowest-locant numbering puts
 *   the bond at 1; IUPAC 2013 P-31.1.4.2.4 names these cyclohexene,
 *   cyclooctyne);
 * - a saturated monocycle with exactly one substituent — one prefix, or one
 *   suffix group (`-ol`) — omits its locant: `metilciclohexano`,
 *   `metilidenciclohexano`, `ciclohexanol` (IUPAC 2013 P-14.3.4.2(c): the
 *   locant 1 is omitted in a monosubstituted parent hydride with only one
 *   kind of substitutable hydrogen);
 * - a benzene parent (`retained` 'benzene', aromatic.js) never cites the
 *   locants of its double bonds, and a single substituent omits its locant
 *   as well: `benceno`, `metilbenceno`, `fenol` (P-14.3.4.2(c);
 *   polysubstituted benzenes are refused before naming, design.md §13.1);
 * - everything else keeps all its locants, the 1 of a ring double bond
 *   and of a suffix included: `3-metilciclohex-1-eno`, `1-metilciclohex-1-eno`,
 *   `ciclohexa-1,3-dieno`, `1,1-dimetilciclohexano`, `2-metilciclohexan-1-ol`,
 *   `ciclohex-2-en-1-ol` (as `but-1-eno` and `2-metilprop-1-eno` keep theirs).
 *
 * @param {{double: object[], triple: object[]}} ring - The ring structure.
 * @param {{locants: object[]}[]} prefixes - Its prefix groups.
 * @param {number} [suffixCount] - Number of suffix groups on the ring (`-ol`: one per OH; default 0).
 * @returns {{parent: boolean, prefixes: boolean}} Whether the ending locants and the substituent locants (prefixes and suffix) are omitted.
 */
export function ringOmitsLocants(ring, prefixes, suffixCount = 0) {
  const occurrences = prefixes.reduce((sum, group) => sum + group.locants.length, 0) + suffixCount;
  const single = occurrences === 1;
  if (ring.retained === 'benzene') {
    return { parent: true, prefixes: single };
  }
  const multiple = ring.double.length + ring.triple.length;
  return {
    parent: occurrences === 0 && multiple === 1,
    prefixes: (multiple === 0 && single) || (suffixCount === 0 && fullyHalogenated(ring, prefixes)),
  };
} // End of function ringOmitsLocants()

/**
 * Number of hydrogens of an unsubstituted parent hydride: CₙH₂ₙ₊₂ for a
 * chain, CₙH₂ₙ for a ring, two fewer per double bond and four fewer per
 * triple bond (a benzene ring: 6).
 *
 * @param {{kind?: string, length: number, double: object[], triple: object[]}} parent - The parent chain or ring structure.
 * @returns {number} The hydrogen count.
 */
export function parentHydrogens(parent) {
  const base = parent.kind === 'ring' ? 2 * parent.length : 2 * parent.length + 2;
  return base - 2 * parent.double.length - 4 * parent.triple.length;
}

/**
 * Tells whether every hydrogen of a parent is replaced by one and the same
 * halogen, and nothing else is attached (`hexacloroetano`,
 * `tetracloroeteno`, `dodecafluorociclohexano`). IUPAC 2013 (P-14.3.4)
 * omits all the substituent locants of a completely substituted parent;
 * the app applies it only when the prefixes cannot be placed in another way,
 * i.e. with a single kind of halogen (with two halogens,
 * `1,1,1-tricloro-2,2,2-trifluoroetano` and `1,1,2-tricloro-1,2,2-trifluoroetano`
 * would read alike). The unsaturation locants follow their own rules
 * (`hexaclorobuta-1,3-dieno`).
 *
 * @param {object} parent - The parent chain or ring structure.
 * @param {{substituent: {halogen?: string}, locants: object[]}[]} prefixes - Its prefix groups.
 * @returns {boolean} True for a parent completely substituted by one halogen.
 */
export function fullyHalogenated(parent, prefixes) {
  return prefixes.length === 1 && Boolean(prefixes[0].substituent && prefixes[0].substituent.halogen)
    && prefixes[0].locants.length === parentHydrogens(parent);
}

/**
 * Locant omission for the substituent prefixes and suffix groups of a chain
 * parent (design.md §1.1, §13.4 I-30, I-31), an explicit rule like the
 * tables above. Hydrocarbon chains always cite them (`2-metilpropano`); only
 * halogens and suffix groups (`-ol`) can reach the parents concerned:
 * - a one-carbon parent (IUPAC 2013 P-14.3.4.2(a), substituted mononuclear
 *   parent hydride): `clorometano`, `triclorometano`, `metanol`,
 *   `metanodiol`, `clorometanol`;
 * - a two-carbon parent with exactly one substituent, prefix or suffix
 *   (P-14.3.4.2(b), monosubstituted chain of two identical atoms):
 *   `cloroetano`, `cloroeteno`, `etanol`, `etenol` (but `1,1-dicloroetano`,
 *   `etano-1,2-diol`, `2-cloroetan-1-ol`: with two substituents every locant
 *   is cited);
 * - a parent completely substituted by one halogen (fullyHalogenated(); no
 *   suffix): `hexacloroetano`, `tetrafluoroeteno`, `octafluoropropano`;
 * - `propanona` (design.md §13.4 I-32): a bare three-carbon parent whose
 *   only substituent is one ketone suffix. The name the design and Spanish
 *   school books use; a ketone in propane can only be on carbon 2 (on
 *   carbon 1 it would be the aldehyde propanal). IUPAC 2013 writes the
 *   locant in the preferred name, `propan-2-ona`, which the app lists under
 *   "Otras formas válidas". Longer ketones keep it: `butan-2-ona`.
 * An aldehyde suffix never cites its locants on a chain, whatever this
 * says (render.js renderParent(), IUPAC 2013 P-14.3.4.1); its prefixes
 * follow this rule (`2-metilpropanal`, `2-cloroetanal`).
 *
 * @param {{length: number, double: object[], triple: object[]}} chain - The parent chain structure.
 * @param {{substituent: object, locants: object[]}[]} prefixes - Its prefix groups.
 * @param {number} [suffixCount] - Number of suffix groups on the parent (one per group; default 0).
 * @param {string|null} [suffixKind] - Kind of the suffix groups ('alcohol', 'aldehyde', 'ketone'), or null.
 * @returns {boolean} True when the prefix and suffix locants are omitted.
 */
export function chainOmitsPrefixLocants(chain, prefixes, suffixCount = 0, suffixKind = null) {
  const occurrences = prefixes.reduce((sum, group) => sum + group.locants.length, 0) + suffixCount;
  if (occurrences === 0) {
    return false;
  }
  const propanone = suffixKind === 'ketone' && chain.length === 3 && occurrences === 1
    && chain.double.length + chain.triple.length === 0;
  return chain.length === 1 || (chain.length === 2 && occurrences === 1) || propanone
    || (suffixCount === 0 && fullyHalogenated(chain, prefixes));
} // End of function chainOmitsPrefixLocants()

/**
 * Returns the prefix form of an unbranched saturated alkyl group attached by
 * its end: `metil`, `etil`, `propil`… (`-iliden` for a double attachment).
 *
 * @param {number} length - Number of carbon atoms (1–30).
 * @param {number} [order] - Attachment bond order: 1 (default) or 2.
 * @returns {string} The prefix, e.g. 'metil', 'metiliden'.
 */
export function alkylPrefix(length, order = 1) {
  return `${stem(length)}${order === 2 ? 'iliden' : 'il'}`;
}

/**
 * Turns a prefix into the standalone group name used when talking about the
 * group: a final `o` is added (`metil` → `metilo`, `metiliden` →
 * `metilideno`, `isopropil` → `isopropilo`).
 *
 * @param {string} prefix - The prefix form.
 * @returns {string} The group name.
 */
export function groupName(prefix) {
  return `${prefix}o`;
}

/**
 * Turns a standalone group name back into its prefix form (drops the final
 * `o`): `metilo` → `metil`.
 *
 * @param {string} name - The group name.
 * @returns {string} The prefix form.
 */
export function prefixForm(name) {
  return name.endsWith('o') ? name.slice(0, -1) : name;
}

/**
 * Suffixes of a substituent prefix by the order of its attachment bond:
 * `il` for a single bond (`propil`, `propan-2-il`), `iliden` for a double
 * bond (`metiliden`, `propan-2-iliden`) (IUPAC 2013 P-29.2).
 */
export const FREE_VALENCE_SUFFIXES = Object.freeze({ 1: 'il', 2: 'iliden' });

/**
 * Returns the suffix of a substituent prefix for its attachment bond order.
 *
 * @param {number} order - Attachment bond order: 1 or 2.
 * @returns {string} 'il' or 'iliden'.
 * @throws {RangeError} For any other order.
 */
export function freeValenceSuffix(order) {
  const suffix = FREE_VALENCE_SUFFIXES[order];
  if (!suffix) {
    throw new RangeError(`freeValenceSuffix: unsupported attachment order ${order}`);
  }
  return suffix;
}

/**
 * Ending of an alkoxy prefix (an ether, design.md §13.4 I-34): it replaces
 * the `il` of a short alkyl prefix (`metil` → `metoxi`, `isopropil` →
 * `isopropoxi`) or follows a longer one (`pentiloxi`, `propan-2-iloxi`);
 * render.js alkoxyTokens(), IUPAC 2013 P-63.2.2.2.
 */
export const ALKOXY_ENDING = 'oxi';

/** Infix between the stem and a cited free-valence locant of a saturated group (`propan-2-il`). */
export const SATURATED_INFIX = 'an';

/**
 * Retained substituent prefixes (design.md §4.5), keyed by the retained-name
 * id stored in the structure. `italic` is the descriptor ignored in
 * alphanumerical order (`tert-`); `text` is the alphabetised part.
 */
export const RETAINED_PREFIXES = Object.freeze({
  isopropyl: Object.freeze({ italic: '', text: 'isopropil' }),
  isopropylidene: Object.freeze({ italic: '', text: 'isopropiliden' }),
  'tert-butyl': Object.freeze({ italic: 'tert-', text: 'butil' }),
  phenyl: Object.freeze({ italic: '', text: 'fenil' }),
});

/**
 * Common (non-preferred) group names, keyed by the `commonName` id of a
 * substituent structure. Used only in explanations ("también se conoce como
 * vinilo"), never in a name.
 */
export const COMMON_GROUP_NAMES = Object.freeze({
  vinyl: 'vinilo',
  allyl: 'alilo',
  isobutyl: 'isobutilo',
  'sec-butyl': 'sec-butilo',
  isopropyl: 'isopropilo',
  'tert-butyl': 'tert-butilo',
  vinylidene: 'vinilideno',
  allylidene: 'alilideno',
  isobutylidene: 'isobutilideno',
  'sec-butylidene': 'sec-butilideno',
  isopropylidene: 'isopropilideno',
});

/** Enclosing marks for compound prefixes, innermost first: ( ), then [ ], then { } (IUPAC 2013 P-16.5.4). */
export const ENCLOSING_MARKS = Object.freeze([
  Object.freeze(['(', ')']),
  Object.freeze(['[', ']']),
  Object.freeze(['{', '}']),
]);

/** Labels of the prefix styles shown next to the alternative names (design.md §1.1). */
export const STYLE_LABELS = Object.freeze({
  isopropil: 'forma aceptada con isopropil',
  pin: 'nombre preferido por la IUPAC (2013)',
  substituted: 'forma sistemática clásica',
  locants: 'con el localizador, como la escribe la IUPAC (2013) en el nombre preferido',
  functionalClass: 'nombre de clase funcional (los dos grupos y la palabra «éter»), que la IUPAC (2013) acepta',
  amineClass: 'nombre tradicional (los grupos unidos al nitrógeno y la palabra «amina»), muy usado en los libros',
  benzeneSystematic: 'forma sistemática, con el nombre del anillo (benceno), que usan algunos libros; '
    + 'la IUPAC (2013) prefiere el nombre tradicional',
});

/**
 * Class word of the functional-class name of an ether (design.md §13.4
 * I-34): `etil metil éter`, `dietil éter` (IUPAC 2013 P-63.2.2.1: accepted
 * in general nomenclature; the substitutive `metoxietano` is preferred).
 */
export const ETHER_CLASS_WORD = 'éter';

/**
 * Last word of the traditional name of a simple amine (design.md §13.4
 * I-36): the groups on the nitrogen, alphabetised, then `amina`, all in one
 * word — `metilamina`, `dimetilamina`, `trimetilamina`, `etilmetilamina`
 * (naming/index.js amineClassAlternative()). The substitutive `metanamina`,
 * `N-metilmetanamina` come first (IUPAC 2013 P-62.2.1).
 */
export const AMINE_CLASS_WORD = 'amina';

/**
 * How an ester name is assembled (design.md §13.4 I-35; render.js
 * assembleEster()): in Spanish the acid part comes first (`etanoato`),
 * then ` de ` and the O-bound group as a group name, its prefix form + `o`
 * (`metilo`, `isopropilo`, `propan-2-ilo`, `2-cloroetilo`): `etanoato de
 * metilo`. English puts the group first (`methyl ethanoate`).
 */
export const ESTER_ALKYL_FIRST = false;

/** Text between the two words of an ester name (`etanoato de metilo`). */
export const ESTER_LINK = ' de ';

/** Ending added to the prefix form of an ester's O-bound group: `metil` + `o` = `metilo` (as groupName()). */
export const ESTER_ALKYL_ENDING = 'o';

/**
 * Text between the two O-bound groups of a diester whose groups differ
 * (design.md §13.4 I-39c; render.js assembleEster()): they are cited in
 * alphabetical order joined by ` y ` (`propanodioato de etilo y metilo`);
 * identical groups take a multiplier instead (`butanodioato de dimetilo`).
 */
export const ESTER_ALKYL_JOIN = ' y ';

/**
 * Last word of an ester cited as a prefix through its C=O carbon
 * (design.md §13.4 I-39c; IUPAC 2013 P-65.6.3.3, from memory): the
 * alkoxy prefix of its O-bound group, then `carbonil` —
 * `metoxicarbonil`, `(propan-2-iloxi)carbonil`. Used only when the chain
 * misses the ester carbon; otherwise the carbon is a chain carbon with
 * `alcoxi` and `oxo` prefixes (`ácido 4-metoxi-4-oxobutanoico`).
 */
export const ALKOXYCARBONYL_ENDING = 'carbonil';

/**
 * Returns the ending of one unsaturation segment inside a substituent
 * prefix, where it is always followed by the free-valence locant and `il`,
 * so the final `o` is dropped: `prop-2-en-1-il`, `but-3-in-1-il`.
 *
 * @param {'double'|'triple'} kind - Segment kind.
 * @returns {string} 'en' or 'in'.
 */
export function substituentUnsaturationEnding(kind) {
  return (kind === 'triple' ? ENDINGS.triple : ENDINGS.double).slice(0, -1);
}

/**
 * Returns a retained substituent prefix.
 *
 * @param {string} id - Retained-name id ('isopropyl', 'isopropylidene', 'tert-butyl' or 'phenyl').
 * @returns {{italic: string, text: string}} The italic descriptor ('' if none) and the alphabetised text.
 * @throws {Error} For an unknown id.
 */
export function retainedPrefix(id) {
  const entry = RETAINED_PREFIXES[id];
  if (!entry) {
    throw new Error(`retainedPrefix: unknown retained prefix ${id}`);
  }
  return entry;
}

/**
 * Returns the common (non-preferred) name of a group, for explanations only.
 *
 * @param {string} id - The `commonName` id of a substituent structure.
 * @returns {string|null} The Spanish group name (`vinilo`), or null when unknown.
 */
export function commonGroupName(id) {
  return COMMON_GROUP_NAMES[id] || null;
}

/**
 * Returns the label of a prefix style.
 *
 * @param {string} style - 'isopropil', 'pin' or 'substituted'.
 * @returns {string} The Spanish label.
 */
export function styleLabel(style) {
  return STYLE_LABELS[style] || style;
}

/**
 * Returns a traditional name (TRADITIONAL_NAMES): a monosubstituted benzene,
 * a small carbonyl compound or a small acid.
 *
 * @param {string} id - 'toluene', 'styrene', 'formaldehyde', 'acetaldehyde', 'acetone', 'formicAcid', 'aceticAcid', 'oxalicAcid', 'formate', 'acetate', 'anisole', 'aniline', 'formamide', 'acetamide', 'acetonitrile', 'acetophenone', 'benzylAlcohol', 'benzylamine', 'phenylaceticAcid', 'phenylacetaldehyde', 'phenylacetamide', 'phenylacetonitrile' or 'phenylacetate'.
 * @returns {string} The Spanish name.
 * @throws {Error} For an unknown id.
 */
export function traditionalName(id) {
  const name = TRADITIONAL_NAMES[id];
  if (!name) {
    throw new Error(`traditionalName: unknown traditional name ${id}`);
  }
  return name;
}

/**
 * Returns the label shown next to a traditional name.
 *
 * @param {string} id - A TRADITIONAL_NAMES id.
 * @returns {string} The Spanish label.
 */
export function traditionalLabel(id) {
  return TRADITIONAL_LABELS[id] || 'nombre tradicional';
}

/**
 * Suffixes of the characteristic groups that can be cited as a suffix
 * (design.md §13.4 I-29; IUPAC 2013 P-65…P-68), without the elided vowel:
 * `ácido etanoico`, `etanoato de metilo`, `etanamida`, `etanonitrilo`,
 * `etanal`, `propanona`, `etanol`, `etanamina`.
 */
export const GROUP_SUFFIXES = Object.freeze({
  acid: 'oico', ester: 'oato', amide: 'amida', nitrile: 'nitrilo', aldehyde: 'al', ketone: 'ona', alcohol: 'ol', amine: 'amina',
});

/**
 * Suffixes of a principal group whose carbon is outside a ring parent
 * (design.md §13.4 I-40b; IUPAC 2013 P-65.1.2, P-66.6.1.1): the ring name
 * keeps its final vowel and the suffix names the carbon too —
 * `ácido ciclohexanocarboxílico`, `ciclohexano-1,2-dicarboxílico`,
 * `ciclohexanocarbaldehído`, `ciclohex-2-eno-1-carbaldehído`; for amides and
 * nitriles (I-40c; P-66.1.1.4, P-66.5.1.1, from memory) `ciclohexanocarboxamida`,
 * `N-metilciclohexanocarboxamida`, `ciclohexanocarbonitrilo`,
 * `ciclohexano-1,2-dicarbonitrilo`; for esters (I-40d; P-65.6.3.2.1, from
 * memory) `ciclohexanocarboxilato de metilo`.
 */
export const RING_GROUP_SUFFIXES = Object.freeze({
  acid: 'carboxílico', ester: 'carboxilato', aldehyde: 'carbaldehído', amide: 'carboxamida', nitrile: 'carbonitrilo',
});

/**
 * Returns the suffix of a principal group whose carbon is outside a ring
 * parent (RING_GROUP_SUFFIXES), or null for another kind.
 *
 * @param {string} kind - A group kind.
 * @returns {string|null} The suffix, e.g. 'carboxílico'.
 */
export function ringGroupSuffix(kind) {
  return Object.prototype.hasOwnProperty.call(RING_GROUP_SUFFIXES, kind) ? RING_GROUP_SUFFIXES[kind] : null;
}

/**
 * Retained names of benzene with a –COOH or a –CHO (design.md §13.4
 * I-40b; IUPAC 2013 P-65.1.1.1 benzoic acid, P-66.6.1.1.1 benzaldehyde,
 * both preferred names, from memory), as a stem that refers to the ring
 * and an ending that refers to the group: `benz` + `oico` (after the class
 * word `ácido`: `ácido benzoico`), `benz` + `aldehído`. The systematic
 * `ácido bencenocarboxílico` / `bencenocarbaldehído` are offered as
 * alternatives (naming/index.js). Likewise (I-40c) `benz` + `amida`
 * (`benzamida`, `N-metilbenzamida`; P-66.1.1.1.2) and `benz` + `onitrilo`
 * (`benzonitrilo`; P-66.5.1.1.2), retained preferred names derived from
 * benzoic acid (from memory), with `bencenocarboxamida` /
 * `bencenocarbonitrilo` as alternatives; and (I-40d) `benz` + `oato`
 * (`benzoato de metilo`, the ester of the retained benzoic acid,
 * P-65.6.3.2, from memory) with `bencenocarboxilato de metilo`.
 */
export const BENZENE_GROUP_NAMES = Object.freeze({
  acid: Object.freeze({ stem: 'benz', ending: 'oico' }),
  ester: Object.freeze({ stem: 'benz', ending: 'oato' }),
  aldehyde: Object.freeze({ stem: 'benz', ending: 'aldehído' }),
  amide: Object.freeze({ stem: 'benz', ending: 'amida' }),
  nitrile: Object.freeze({ stem: 'benz', ending: 'onitrilo' }),
});

/**
 * Returns the retained name of benzene with a group of a kind
 * (BENZENE_GROUP_NAMES), or null for another kind.
 *
 * @param {string} kind - A group kind.
 * @returns {{stem: string, ending: string}|null} The stem and the ending.
 */
export function benzeneGroupName(kind) {
  return Object.prototype.hasOwnProperty.call(BENZENE_GROUP_NAMES, kind) ? BENZENE_GROUP_NAMES[kind] : null;
}

/**
 * Acyl prefix of C₆H₅–CO– (design.md §13.4 I-40b): the retained `benzoil`
 * (IUPAC 2013 P-65.1.7.2.1, from memory), from `ácido benzoico`.
 */
export const BENZOYL_PREFIX = 'benzoil';

/**
 * Ending of the acyl prefix of an acid named with `-carboxílico` (design.md
 * §13.4 I-40b; IUPAC 2013 P-65.1.7.3, from memory): the ring name, then
 * `carbonil` — `ciclohexanocarbonil`, `(2-metilciclohexano-1-carbonil)`,
 * `(ciclohex-2-eno-1-carbonil)`.
 */
export const RING_CARBONYL_ENDING = 'carbonil';

/**
 * Prefixes of the characteristic groups when they are not the principal
 * group (IUPAC 2013 P-65…P-68, P-63.2.2): `carboxi`, `alcoxicarbonil`
 * (e.g. `metoxicarbonil`), `carbamoil`, `ciano`, `oxo` (aldehyde whose
 * carbon is in the parent chain, and ketone), `hidroxi`, `amino`, `alcoxi`
 * (ether, e.g. `metoxi`). Halogens: HALOGEN_PREFIXES.
 */
export const GROUP_PREFIXES = Object.freeze({
  acid: 'carboxi', ester: 'alcoxicarbonil', amide: 'carbamoil', nitrile: 'ciano', aldehyde: 'oxo', ketone: 'oxo',
  alcohol: 'hidroxi', amine: 'amino', ether: 'alcoxi',
});

/**
 * Prefix of an aldehyde whose carbon is outside the parent (`formil`,
 * IUPAC 2013 P-66.6.1.2): the acyl prefix of HCO– (design.md §13.4
 * I-39b; retained preferred prefix, from memory, P-65.1.7.2.1).
 */
export const FORMYL_PREFIX = 'formil';

/**
 * Acyl prefix of the unsubstituted CH₃–CO– group (design.md §13.4 I-39b):
 * `acetil`, the retained preferred prefix (IUPAC 2013 P-65.1.7.2.1, from
 * memory), used instead of `etanoil`; a substituted two-carbon acyl is
 * named systematically (`(2-cloroetanoil)`), as the app names the acid
 * (`ácido 2-cloroetanoico`, never `ácido cloroacético`).
 */
export const ACETYL_PREFIX = 'acetil';

/**
 * Ending of an acyl prefix (design.md §13.4 I-39b; IUPAC 2013 P-65.1.7):
 * the acid's `-oico` becomes `-oil` (`propanoil`, `butanoil`,
 * `but-2-enoil`); render.js acylEndingTokens().
 */
export const ACYL_ENDING = 'oil';

/**
 * Halogen prefixes (IUPAC 2013 P-61.3.1; never a suffix). In Spanish names
 * they are alphabetised as written: `yodo` under y (English `iodo` goes
 * under i), design.md §1.1.
 */
export const HALOGEN_PREFIXES = Object.freeze({ F: 'fluoro', Cl: 'cloro', Br: 'bromo', I: 'yodo' });

/**
 * Returns the substituent prefix of a halogen atom (design.md §13.4 I-30).
 *
 * @param {string} element - 'F', 'Cl', 'Br' or 'I'.
 * @returns {string} 'fluoro', 'cloro', 'bromo' or 'yodo'.
 * @throws {Error} For another element.
 */
export function halogenPrefix(element) {
  if (!Object.prototype.hasOwnProperty.call(HALOGEN_PREFIXES, element)) {
    throw new Error(`halogenPrefix: ${element} is not a halogen`);
  }
  return HALOGEN_PREFIXES[element];
}

/** Family names of the characteristic groups, for explanations (`phenol` = an OH on a benzene ring). */
export const GROUP_FAMILY_NAMES = Object.freeze({
  acid: 'ácido carboxílico',
  ester: 'éster',
  amide: 'amida',
  nitrile: 'nitrilo',
  aldehyde: 'aldehído',
  ketone: 'cetona',
  alcohol: 'alcohol',
  phenol: 'fenol',
  amine: 'amina',
  ether: 'éter',
  halide: 'halógeno',
  unsupported: 'grupo desconocido',
});

/**
 * Returns the suffix of a characteristic group kind, or null for a kind that
 * is never a suffix (ether, halide).
 *
 * @param {string} kind - A group kind (groups.js GROUP_KINDS).
 * @returns {string|null} The suffix, e.g. 'ol'.
 */
export function groupSuffix(kind) {
  return Object.prototype.hasOwnProperty.call(GROUP_SUFFIXES, kind) ? GROUP_SUFFIXES[kind] : null;
}

/**
 * Class word written before the name when a group is the suffix (IUPAC
 * 2013 P-65.1.1, Spanish usage): `ácido` for a carboxylic acid (`ácido
 * etanoico`, `ácido butanodioico`, design.md §13.4 I-33). A diacid keeps
 * the singular word: it is one molecule.
 */
export const SUFFIX_CLASS_WORDS = Object.freeze({ acid: 'ácido' });

/**
 * Returns the class word written before a name whose suffix is of a kind
 * (SUFFIX_CLASS_WORDS), or null when the kind has none.
 *
 * @param {string} kind - A group kind (groups.js GROUP_KINDS).
 * @returns {string|null} The word, e.g. 'ácido'.
 */
export function suffixClassWord(kind) {
  return Object.prototype.hasOwnProperty.call(SUFFIX_CLASS_WORDS, kind) ? SUFFIX_CLASS_WORDS[kind] : null;
}

/**
 * Prefixes of an ester or amide bonded to the parent through its O or N
 * (the acyl part hangs from the heteroatom: acetiloxi-, acetilamino-; IUPAC 2013 P-65.6.3 esters,
 * P-66.1 amides). Bonded through the carbonyl carbon they take GROUP_PREFIXES.
 */
export const HETEROATOM_BOUND_PREFIXES = Object.freeze({ ester: 'aciloxi', amide: 'acilamino' });

/**
 * Returns the prefix of a characteristic group (halides by element), or null
 * for an unsupported group. An ester or amide takes its heteroatom-bound
 * form when `attachment` is 'heteroatom' (the parent side is on its O or N),
 * else its carbonyl-bound form (GROUP_PREFIXES).
 *
 * @param {string} kind - A group kind (groups.js GROUP_KINDS).
 * @param {string} [element] - Halogen symbol, for kind 'halide'.
 * @param {'carbonyl'|'heteroatom'|null} [attachment] - Which end of an ester or amide faces the parent.
 * @returns {string|null} The prefix.
 */
export function groupPrefix(kind, element, attachment = null) {
  if (kind === 'halide') {
    return HALOGEN_PREFIXES[element] || null;
  }
  if (attachment === 'heteroatom' && Object.prototype.hasOwnProperty.call(HETEROATOM_BOUND_PREFIXES, kind)) {
    return HETEROATOM_BOUND_PREFIXES[kind];
  }
  return Object.prototype.hasOwnProperty.call(GROUP_PREFIXES, kind) ? GROUP_PREFIXES[kind] : null;
}

/**
 * Returns the family name of a characteristic group kind.
 *
 * @param {string} kind - A group kind, or 'phenol'.
 * @returns {string} The family name, e.g. 'alcohol'.
 */
export function groupFamilyName(kind) {
  return GROUP_FAMILY_NAMES[kind] || kind;
}

/** The Spanish lexicon, as consumed by render.js. */
export const lexiconEs = Object.freeze({
  etherClassWord: ETHER_CLASS_WORD,
  amineClassWord: AMINE_CLASS_WORD,
  alkoxyEnding: ALKOXY_ENDING,
  esterAlkylFirst: ESTER_ALKYL_FIRST,
  esterLink: ESTER_LINK,
  esterAlkylEnding: ESTER_ALKYL_ENDING,
  esterAlkylJoin: ESTER_ALKYL_JOIN,
  alkoxycarbonylEnding: ALKOXYCARBONYL_ENDING,
  freeValenceSuffix,
  saturatedInfix: SATURATED_INFIX,
  enclosingMarks: ENCLOSING_MARKS,
  substituentUnsaturationEnding,
  retainedPrefix,
  commonGroupName,
  styleLabel,
  language: 'es',
  endings: ENDINGS,
  connectingVowel: CONNECTING_VOWEL,
  segmentOrder: SEGMENT_ORDER,
  stem,
  multiplier,
  compoundMultiplier,
  unsaturationEnding,
  needsConnectingVowel,
  omitsLocants,
  ringOmitsLocants,
  chainOmitsPrefixLocants,
  halogenPrefix,
  alkylPrefix,
  groupName,
  prefixForm,
  ringPrefix: RING_PREFIX,
  benzeneName: BENZENE_NAME,
  phenolStem: PHENOL_STEM,
  traditionalName,
  traditionalLabel,
  groupSuffix,
  suffixClassWord,
  groupPrefix,
  groupFamilyName,
  formylPrefix: FORMYL_PREFIX,
  acetylPrefix: ACETYL_PREFIX,
  acylEnding: ACYL_ENDING,
  ringGroupSuffix,
  benzeneGroupName,
  benzoylPrefix: BENZOYL_PREFIX,
  ringCarbonylEnding: RING_CARBONYL_ENDING,
});
