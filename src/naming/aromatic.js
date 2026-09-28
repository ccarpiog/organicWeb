/**
 * @file Benzene and its monosubstituted hydrocarbon derivatives (design.md
 * §13.4 I-28): `benceno`, `metilbenceno`, `etilbenceno`, `etenilbenceno`,
 * `etinilbenceno`, `isopropilbenceno` …, plus the `fenil` prefix (C₆H₅–) for
 * later phases.
 *
 * What counts as benzene: exactly one six-membered carbocycle whose ring
 * bonds alternate double and single — a Kekulé structure, where every ring
 * atom is in exactly one ring double bond (model/validate.js
 * isBenzeneRing()). Aromaticity is never inferred from anything else:
 * cyclobutadiene, cyclooctatetraene, cyclohexadienes or exocyclic double
 * bonds are named by rings.js as cycloalkenes. The two Kekulé drawings of
 * one molecule (double bonds swapped) are the same molecule, and nothing
 * here depends on which one was drawn: the name only uses the ring, not the
 * position of its double bonds.
 *
 * Naming (IUPAC 2013): the benzene ring is the parent whatever the side
 * chain (P-44.1.2.2, P-52.2.8: a ring is senior to a chain), and its name is
 * the retained `benceno` (P-22.1.2; `ciclohexa-1,3,5-trieno` is not
 * acceptable). A single substituent is cited without locant (P-14.3.4.2(c):
 * all ring positions are equivalent), with the recursive prefixes and the
 * prefix styles of substituent.js, so an isopropyl group gives
 * `isopropilbenceno` with `(propan-2-il)benceno` and `(1-metiletil)benceno`
 * as alternatives. Two or more substituents never reach this module: they
 * are refused by validateForNaming() (`CYCLE`, `ringReason`
 * 'polysubstitutedBenzene'; no orto/meta/para, design.md §13.1). The old
 * school form with the ring as a `fenil` prefix on a chain (`feniletano`) is
 * not preferred and never produced.
 *
 * An OH on the ring (the only substituent) makes a phenol (design.md §13.4
 * I-31): its structure is the benzene parent with an `-ol` suffix, rendered
 * as the retained preferred name `fenol` (IUPAC 2013 P-63.1.1.1; the
 * systematic `bencenol` is not used). Substituted phenols have two ring
 * substituents and are refused like any polysubstituted benzene.
 *
 * An amine N on the ring (design.md §13.4 I-36) is the `-amina` suffix:
 * `bencenamina`, with the groups on the N as `N` prefixes
 * (`N-metilbencenamina`, `N,N-dimetilbencenamina`; they are on the N, not
 * on the ring, so the benzene keeps one substituent). IUPAC 2013 retains
 * `aniline` as the preferred name (P-62.2.1.1.1); like `tolueno` it is
 * offered as an alternative (`anilina`, `N-metilanilina`).
 *
 * A –COOH or –CHO on the ring (design.md §13.4 I-40b) is the ring's suffix
 * group with its carbon outside the ring, rendered as the retained
 * preferred `ácido benzoico` / `benzaldehído` (render.js; the systematic
 * `ácido bencenocarboxílico` / `bencenocarbaldehído` are alternatives,
 * naming/index.js).
 *
 * Traditional names retained by IUPAC 2013 for monosubstituted benzenes
 * (P-22.1.3) — `tolueno` (even the preferred IUPAC name) and `estireno`
 * (general nomenclature) — are offered as alternatives only (design.md
 * §13.1: systematic name first). `cumeno` is not: cumene is no longer
 * retained in the 2013 recommendations. `anisol` is offered for
 * metoxibenceno (an ether, design.md §13.4 I-34).
 *
 * The ring numbering (locant order of the parent, used by Ordenar dibujo) is
 * chosen by the ring cascade of rings.js numberRing(): the substituted atom
 * gets locant 1 and the ring double bonds 1, 3, 5. The name cites none of
 * these locants, so the trace holds the RING step only.
 *
 * Pure: reads atom ids, elements and bonds only, never coordinates or the DOM.
 */

import { perceiveRings } from '../model/rings.js';
import { adjacency } from '../model/graph.js';
import { isBenzeneRing } from '../model/validate.js';
import { buildRingStructure, buildNameStructure, buildSuffix } from './structure.js';
import { renderName } from './render.js';
import { ringParent, numberRing } from './rings.js';
import { createNamingContext, collectSubstituents, groupPrefixes, suffixSites, PREFIX_STYLES } from './substituent.js';
import { lexiconEs } from './lexicon.es.js';

/**
 * Tells whether a molecule (with exactly one ring) is a benzene derivative:
 * its single ring is a benzene ring (isBenzeneRing(): six carbons, ring
 * bonds alternating double and single).
 *
 * @param {object} mol - A molecule accepted by validateForNaming().
 * @returns {boolean} True when the only ring is a benzene ring.
 */
export function hasBenzeneRing(mol) {
  const { rings } = perceiveRings(mol);
  return rings.length === 1 && isBenzeneRing(mol, rings[0])
    && rings[0].atoms.every((id) => mol.atoms.get(id).element === 'C');
}

/**
 * Builds the retained `fenil` substituent (C₆H₅–, a retained preferred prefix,
 * IUPAC 2013 P-29.6) from a benzene ring given in ring order,
 * starting at the atom bonded to the carrying atom. The ring is the group's
 * `chain` (a RingStructure, `retained` 'benzene'); the free valence is on
 * locant 1. No hydrocarbon name uses it (the ring is always the parent,
 * design.md §13.5); the `fenil` prefix of a chain parent carrying the
 * principal group (design.md §13.4 I-40a: `fenilmetanol`) has the same
 * shape, built by substituent.js ringSubstituent() with `ring` set.
 *
 * @param {number[]} atoms - The six ring atom ids in ring order, the attachment atom first.
 * @param {number[]} bonds - The six ring bond ids (bonds[i] joins atoms[i] and atoms[i + 1]; the last closes the ring).
 * @param {number[]} orders - The order of each ring bond (alternating 2 and 1).
 * @returns {object} The SubstituentStructure (structure.js) with `retained` 'phenyl'.
 */
export function phenylSubstituent(atoms, bonds, orders) {
  return {
    chain: { ...buildRingStructure(atoms, bonds, orders), retained: 'benzene' },
    prefixes: [],
    freeValence: { locant: 1, order: 1 },
    retained: 'phenyl',
    commonName: null,
    atoms: [...atoms],
    bonds: [...bonds],
  };
}

/**
 * Id of the traditional name retained by IUPAC 2013 (P-22.1.3) for a named
 * benzene derivative: 'aniline' for a benzene amine (design.md §13.4 I-36,
 * P-62.2.1.1.1, whatever the groups on its N), 'toluene' for a single methyl, 'styrene' for a single
 * ethenyl (vinyl) group, 'anisole' for a single methoxy group (metoxibenceno,
 * design.md §13.4 I-34; retained by IUPAC 2013 for the unsubstituted
 * molecule); null otherwise (benzene itself is already the
 * retained name; cumene is no longer retained).
 *
 * @param {object} structure - A name structure (structure.js NameStructure).
 * @returns {'aniline'|'toluene'|'styrene'|'anisole'|null} The id.
 */
export function traditionalNameId(structure) {
  if (structure.parentKind !== 'ring' || structure.parent.retained !== 'benzene') {
    return null;
  }
  if (structure.suffix && structure.suffix.kind === 'amine') {
    return 'aniline'; // Any groups are on the N (`N-metilanilina`).
  }
  if (structure.prefixes.length !== 1) {
    return null;
  }
  const [group] = structure.prefixes;
  const sub = group.substituent;
  if (group.locants.length !== 1 || sub.halogen || sub.hydroxy || sub.oxo || sub.retained || sub.prefixes.length > 0
    || sub.freeValence.order !== 1) {
    return null;
  }
  const { chain } = sub;
  if (sub.alkoxy) {
    return chain.length === 1 ? 'anisole' : null;
  }
  if (chain.length === 1) {
    return 'toluene';
  }
  if (chain.length === 2 && chain.double.length === 1 && chain.triple.length === 0) {
    return 'styrene';
  }
  return null;
} // End of function traditionalNameId()

/**
 * The traditional-name alternative of a benzene derivative (design.md §13.1:
 * listed under "Otras formas válidas", after the prefix-style ones), or null.
 * Its one part refers to every atom and bond of the molecule; `anilina`
 * keeps the groups on its N in front (`N-metilanilina`, render.js
 * renderName() `traditional`).
 *
 * @param {object} result - A naming result (NamingSuccess) with a benzene parent.
 * @returns {{style: string, label: string, name: string, parts: object[]}|null} The alternative.
 */
export function traditionalAlternative(result) {
  const id = traditionalNameId(result.structure);
  if (!id) {
    return null;
  }
  if (id === 'aniline') {
    return { style: 'traditional', label: lexiconEs.traditionalLabel(id), ...renderName(result.structure, lexiconEs, { traditional: id }) };
  }
  const name = lexiconEs.traditionalName(id);
  const atoms = [...result.parent.atoms, ...result.structure.prefixes.flatMap((g) => g.locants.flatMap((s) => s.atoms))];
  const bonds = [...result.parent.bonds, ...result.structure.prefixes.flatMap((g) => g.locants.flatMap((s) => [s.bond, ...s.bonds]))];
  return {
    style: 'traditional',
    label: lexiconEs.traditionalLabel(id),
    name,
    parts: [{ text: name, kind: 'stem', atoms, bonds }],
  };
}

/**
 * Names benzene or a monosubstituted benzene under one prefix style. The
 * ring is the parent (`retained` 'benzene', rendered `benceno`), its single
 * side chain (if any) the only substituent, cited without locant; a single
 * OH is the `-ol` suffix instead (`fenol`). The trace
 * is the RING step alone (the ring as the only candidate, its size as the
 * value): the name has no locant, so no numbering rule is explained.
 *
 * @param {object} mol - A molecule accepted by validateForNaming() whose only ring is a benzene ring.
 * @param {string} [style] - Prefix style (default 'isopropil', design.md §1.1).
 * @returns {object} The naming result (structure.js NamingSuccess) without `alternatives`.
 * @throws {Error} When the ring is not a benzene ring or it carries more than one substituent.
 */
export function nameBenzeneWithStyle(mol, style = PREFIX_STYLES[0]) {
  if (!hasBenzeneRing(mol)) {
    throw new Error('nameBenzeneWithStyle: the molecule has no benzene ring');
  }
  const perceived = ringParent(mol);
  const adj = adjacency(mol);
  const ctx = createNamingContext(mol, style, lexiconEs, adj);
  const substituents = collectSubstituents(mol, perceived.atoms, ctx);
  const sites = suffixSites(mol, adj, perceived.atoms, ctx.principal, true);
  // Groups on an amine N (`N-metilbencenamina`) are not ring substituents.
  const onRing = substituents.filter((sub) => !sub.nitrogen).length + sites.length;
  if (onRing > 1) {
    throw new Error(`nameBenzeneWithStyle: ${onRing} substituents (polysubstituted benzenes are refused)`);
  }
  const numbered = numberRing(mol, perceived, substituents, sites.map((site) => site.atom));
  const parent = { ...numbered.parent, retained: 'benzene' };
  const structure = buildNameStructure({
    parent,
    prefixes: groupPrefixes(substituents, parent.atoms),
    suffix: buildSuffix(sites, parent.atoms, ctx.principal),
  });
  const { name, parts } = renderName(structure, lexiconEs);
  const candidate = { atoms: [...perceived.atoms], bonds: [...perceived.bonds], key: 'ring' };
  return {
    ok: true,
    name,
    parts,
    structure,
    parent: { atoms: [...parent.atoms], bonds: [...parent.bonds] },
    trace: [{
      rule: 'RING',
      candidatesBefore: [candidate],
      values: [parent.length],
      survivors: [{ ...candidate, atoms: [...candidate.atoms], bonds: [...candidate.bonds] }],
    }],
  };
} // End of function nameBenzeneWithStyle()
