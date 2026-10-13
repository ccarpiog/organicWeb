/**
 * @file Benzene and its derivatives (design.md §13.4 I-28, §14): `benceno`,
 * `metilbenceno`, `etilbenceno`, `etenilbenceno`, `etinilbenceno`,
 * `isopropilbenceno` …, since I-42a benzenes with two to six detachable
 * prefixes (`1,2-dimetilbenceno`, `1-bromo-3-clorobenceno`,
 * `hexametilbenceno`), plus the `fenil` prefix (C₆H₅–) for later phases.
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
 * as alternatives. Two or more substituents reach this module only when
 * every group is a detachable prefix — hydrocarbon branches, halogens,
 * alkoxy groups (design.md §14, I-42a) — or, since I-43a, beside one OH or
 * one amine group on the ring (the suffix, at locant 1); any other
 * polysubstituted benzene is refused by validateForNaming() (`CYCLE`,
 * `ringReason` 'polysubstitutedBenzene'). Then every locant is cited
 * (`1,2-dimetilbenceno`), except when all six positions hold one identical
 * prefix (`hexaclorobenceno`, lexicon ringOmitsLocants()). The old school
 * form with the ring as a `fenil` prefix on a chain (`feniletano`) is not
 * preferred and never produced.
 *
 * An OH on the ring (the only substituent) makes a phenol (design.md §13.4
 * I-31): its structure is the benzene parent with an `-ol` suffix, rendered
 * as the retained preferred name `fenol` (IUPAC 2013 P-63.1.1.1; the
 * systematic `bencenol` is not used). With other groups on the ring
 * (design.md §14, I-43a) the OH keeps the implicit 1 and only the prefixes
 * cite locants: `4-metilfenol`, `4-aminofenol` (alcohol > amine).
 *
 * An amine N on the ring (design.md §13.4 I-36) is the `-amina` suffix:
 * `bencenamina`, with the groups on the N as `N` prefixes
 * (`N-metilbencenamina`, `N,N-dimetilbencenamina`; they are on the N, not
 * on the ring, so the benzene keeps one substituent). IUPAC 2013 retains
 * `aniline` as the preferred name (P-62.2.1.1.1); like `tolueno` it is
 * offered as an alternative (`anilina`, `N-metilanilina`). Beside ring
 * prefixes (I-43a) the suffix cites its 1: `4-metilbencen-1-amina`,
 * `N,4-dimetilbencen-1-amina` (`4-metilanilina`, `N,4-dimetilanilina`).
 *
 * A –COOH or –CHO on the ring (design.md §13.4 I-40b), or an amide or a
 * –C≡N (I-40c), is the ring's suffix group with its carbon outside the
 * ring, rendered as the retained preferred `ácido benzoico` /
 * `benzaldehído` / `benzamida` / `benzonitrilo` (render.js; the systematic
 * `ácido bencenocarboxílico` / `bencenocarbaldehído` /
 * `bencenocarboxamida` / `bencenocarbonitrilo` are alternatives,
 * naming/index.js). The groups on a benzamide N are N prefixes, not ring
 * substituents (`N-metilbenzamida`: the benzene stays monosubstituted).
 *
 * Traditional names retained by IUPAC 2013 for monosubstituted benzenes
 * (P-22.1.3) — `tolueno` (even the preferred IUPAC name) and `estireno`
 * (general nomenclature) — are offered as alternatives only (design.md
 * §13.1: systematic name first). `cumeno` is not: cumene is no longer
 * retained in the 2013 recommendations. `anisol` is offered for
 * metoxibenceno (an ether, design.md §13.4 I-34). For two or more
 * substituents (design.md §14.4–§14.5): `1,2-xileno` / `o-xileno` (and the
 * 1,3 / m and 1,4 / p forms) for the bare dimethylbenzenes, `mesitileno`
 * for 1,3,5-trimetilbenceno, `o-cresol` / `m-cresol` / `p-cresol` for the
 * bare methylphenols (I-43a), and the old orto/meta/para form for two
 * identical prefixes or a retained parent plus one prefix
 * (`o-diclorobenceno`, `p-metilfenol`, `o-cloroanilina`, its own label);
 * never a substituted tolueno, xileno, cresol or anisol.
 *
 * The ring numbering (locant order of the parent, used by Ordenar dibujo) is
 * chosen by the ring cascade of rings.js numberRing(). With one substituent
 * the substituted atom gets locant 1 and the ring double bonds 1, 3, 5; the
 * name cites none of these locants, so the trace holds the RING step only.
 * With two or more occupied positions the cascade runs without N1/N2
 * (`aromatic`, design.md §14.2: the Kekulé double bonds never steer the
 * numbering, so both drawings give the same name): all prefixes together
 * (IUPAC 2013 P-14.4 (f)), then the prefix cited first in Spanish
 * alphabetical order (P-14.4 (g)), then the presentation tie-break; the
 * numbering steps follow the RING step in the trace.
 *
 * Pure: reads atom ids, elements and bonds only, never coordinates or the DOM.
 */

import { perceiveRings } from '../model/rings.js';
import { adjacency } from '../model/graph.js';
import { isBenzeneRing } from '../model/validate.js';
import { buildRingStructure, buildNameStructure, buildSuffix, N_LOCANT } from './structure.js';
import { renderName, carbonLocantPrefixes, suffixGroupIds } from './render.js';
import { ringParent, numberRing } from './rings.js';
import {
  createNamingContext, collectSubstituents, groupPrefixes, suffixSites, esterAlkyls, PREFIX_STYLES,
} from './substituent.js';
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
  if (structure.suffix) {
    return null; // `fenol`, `ácido benzoico`, `N-metilbenzamida` (I-40c: its `metil` is on the N, no `tolueno`).
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
 * Tells whether a prefix group is a plain methyl (no prefixes of its own,
 * not a halogen, alkoxy, hydroxy, oxo, amino or retained group, single
 * free valence): the group of `tolueno`, the xylenes, `mesitileno` and
 * the cresols.
 *
 * @param {object} group - A prefix group of a name structure.
 * @returns {boolean} True for methyl.
 */
function isPlainMethyl(group) {
  const sub = group.substituent;
  return !sub.halogen && !sub.hydroxy && !sub.oxo && !sub.retained && !sub.alkoxy && Boolean(sub.chain)
    && sub.prefixes.length === 0 && sub.freeValence.order === 1 && sub.chain.length === 1;
}

/**
 * The atoms and bonds of a benzene name: the ring, its suffix group and
 * every prefix group (the single part of a retained whole-molecule name
 * such as `mesitileno` or `p-cresol`).
 *
 * @param {object} result - A naming result with a benzene parent.
 * @returns {{atoms: number[], bonds: number[]}} The ids.
 */
function wholeMolecule(result) {
  const sites = result.structure.prefixes.flatMap((g) => g.locants);
  // The OH of `p-cresol` (I-43a) belongs to the name too.
  const group = result.structure.suffix ? suffixGroupIds(result.structure.suffix) : { atoms: [], bonds: [] };
  return {
    atoms: [...new Set([...result.parent.atoms, ...group.atoms, ...sites.flatMap((s) => s.atoms)])],
    bonds: [...result.parent.bonds, ...group.bonds, ...sites.flatMap((s) => [s.bond, ...s.bonds])],
  };
}

/**
 * Ids of the traditional names IUPAC 2013 retains for a polysubstituted
 * benzene (design.md §14.5): with prefixes only (P-22.1.3) the xylenes
 * (two methyl groups and nothing else: `1,2-xileno` and `o-xileno`, 1,3 /
 * m, 1,4 / p) and `mesitileno` (three methyl groups at 1,3,5); for a phenol
 * with one methyl group and nothing else (P-63.1.1.2, I-43a) `o-cresol`,
 * `m-cresol` or `p-cresol`. They admit no substitution, so any other group
 * gives none (never a substituted xileno, tolueno or cresol).
 *
 * @param {object} structure - A name structure (structure.js NameStructure).
 * @returns {string[]} The TRADITIONAL_NAMES ids, in display order (empty when none applies).
 */
export function retainedPolyIds(structure) {
  if (structure.parentKind !== 'ring' || structure.parent.retained !== 'benzene'
    || structure.prefixes.length !== 1 || !isPlainMethyl(structure.prefixes[0])) {
    return [];
  }
  const locants = structure.prefixes[0].locants.map((site) => site.locant);
  const { suffix } = structure;
  if (suffix) {
    // `4-metilfenol` → `p-cresol` (one OH, one methyl).
    const phenol = suffix.kind === 'alcohol' && !suffix.outside && suffix.locants.length === 1 && locants.length === 1;
    return phenol && CRESOL_IDS[locants[0]] ? [CRESOL_IDS[locants[0]]] : [];
  }
  if (locants.length === 2) {
    const second = { 2: ['xylene12', 'oXylene'], 3: ['xylene13', 'mXylene'], 4: ['xylene14', 'pXylene'] };
    return second[locants[1]] || [];
  }
  return locants.join(',') === '1,3,5' ? ['mesitylene'] : [];
} // End of function retainedPolyIds()

/** TRADITIONAL_NAMES ids of the cresols, by the locant of the methyl group of a methylphenol. */
const CRESOL_IDS = Object.freeze({ 2: 'oCresol', 3: 'mCresol', 4: 'pCresol' });

/**
 * The old orto/meta/para form of a benzene name with exactly two occupied
 * ring positions (design.md §14.4, P-14.3.1: no longer recommended, so
 * only under "Otras formas válidas" with its own label), from the parts of
 * the name it is built on, in any lexicon:
 * - two identical prefixes and nothing else: the leading `1,2-` becomes
 *   the letter, `o-diclorobenceno`, `m-dibromobenceno`,
 *   `p-dietenilbenceno`;
 * - a retained parent with its group at the implicit 1 plus one prefix
 *   (I-43a): the prefix locant becomes the letter, `p-metilfenol`,
 *   `p-aminofenol`, `o-cloroanilina` (built on the `anilina` name; the
 *   groups on the N do not count, `p-bromo-N,N-dimetilanilina`), except
 *   when one multiplied prefix is both on the N and on the ring
 *   (`N,4-dimetilanilina`: `N,p-dimetilanilina` is no used form, and OPSIN
 *   does not read it either).
 * Never for two different prefixes on plain benzene (`m-cloroetilbenceno`
 * would read like a substituted ethyl) nor for three or more positions.
 * The new locant part refers to the same atoms and bonds.
 *
 * @param {object} structure - The name structure (a benzene parent).
 * @param {object[]} parts - The parts of the name to rewrite (`fenol`, `anilina` or `benceno` form).
 * @returns {object[]|null} The parts of the old form, or null when it does not apply.
 */
export function positionalParts(structure, parts) {
  if (structure.parentKind !== 'ring' || structure.parent.retained !== 'benzene') {
    return null;
  }
  const groups = carbonLocantPrefixes(structure.prefixes);
  const { suffix } = structure;
  const copy = (p) => ({ ...p, atoms: [...p.atoms], bonds: [...p.bonds] });
  if (suffix) {
    // One group at the implicit 1 (`fenol`, `anilina`) and one ring prefix.
    if (suffix.locants.length !== 1 || groups.length !== 1 || groups[0].locants.length !== 1) {
      return null;
    }
    // A group on the N and on the ring cited together (`N,4-dimetilanilina`) gets none: `N,p-` is no used form.
    const shared = structure.prefixes.some((g) => g.locants.some((site) => site.locant === N_LOCANT)
      && g.locants.some((site) => site.locant !== N_LOCANT));
    if (shared) {
      return null;
    }
    const letter = lexiconEs.positionalLetters[groups[0].locants[0].locant];
    const ringAtoms = new Set(structure.parent.atoms);
    const text = String(groups[0].locants[0].locant);
    const at = parts.findIndex((p) => p.kind === 'locant' && p.text === text && ringAtoms.has(p.atoms[0]));
    if (!letter || at < 0 || parts.some((p, i) => i !== at && p.kind === 'locant' && /^\d/.test(p.text))) {
      return null;
    }
    return parts.map((p, i) => (i === at ? { ...copy(p), text: letter } : copy(p)));
  }
  if (structure.prefixes.length !== 1 || structure.prefixes[0].locants.length !== 2) {
    return null;
  }
  const letter = lexiconEs.positionalLetters[structure.prefixes[0].locants[1].locant];
  const dash = parts.findIndex((p) => p.kind === 'punct' && p.text === '-');
  if (!letter || dash < 1 || parts.slice(0, dash).some((p) => p.kind !== 'locant' && p.kind !== 'punct')) {
    return null;
  }
  const head = parts.slice(0, dash).filter((p) => p.kind === 'locant');
  const locant = {
    text: letter,
    kind: 'locant',
    atoms: [...new Set(head.flatMap((p) => p.atoms))],
    bonds: [...new Set(head.flatMap((p) => p.bonds))],
  };
  return [locant, ...parts.slice(dash).map(copy)];
} // End of function positionalParts()

/**
 * The old orto/meta/para form of a benzene derivative as an alternative
 * (positionalParts()), built on the main name (`o-diclorobenceno`,
 * `p-metilfenol`, `p-aminofenol`) or, for a benzene amine, on its
 * `anilina` form (`o-cloroanilina`, design.md §14.4–§14.5).
 *
 * @param {object} result - A naming result with a benzene parent.
 * @param {{parts: object[]}|null} [traditional] - The traditional alternative (traditionalAlternative()), if any.
 * @returns {{style: string, label: string, name: string, parts: object[]}|null} The alternative, or null.
 */
export function positionalAlternative(result, traditional = null) {
  const amine = result.structure.suffix && result.structure.suffix.kind === 'amine';
  const source = amine ? traditional && traditional.parts : result.parts;
  const parts = source ? positionalParts(result.structure, source) : null;
  if (!parts) {
    return null;
  }
  return {
    style: 'positional',
    label: lexiconEs.styleLabel('positional'),
    name: parts.map((p) => p.text).join(''),
    parts,
  };
} // End of function positionalAlternative()

/**
 * Every "Otras formas válidas" entry of a benzene derivative after the
 * prefix-style ones: the traditional name (traditionalAlternative():
 * `tolueno`, `anisol`, `anilina` also with ring prefixes, `4-metilanilina`),
 * the retained xileno / mesitileno / cresol names (retainedPolyIds(), one
 * part for the whole molecule) and the orto/meta/para form
 * (positionalAlternative()).
 *
 * @param {object} result - A naming result (NamingSuccess) with a benzene parent.
 * @returns {{style: string, label: string, name: string, parts: object[]}[]} The alternatives, in display order.
 */
export function benzeneAlternatives(result) {
  const single = traditionalAlternative(result);
  const { atoms, bonds } = wholeMolecule(result);
  const retained = retainedPolyIds(result.structure).map((id) => {
    const name = lexiconEs.traditionalName(id);
    return {
      style: 'traditional', label: lexiconEs.traditionalLabel(id), name, parts: [{ text: name, kind: 'stem', atoms: [...atoms], bonds: [...bonds] }],
    };
  });
  const positional = positionalAlternative(result, single);
  return [single, ...retained, positional].filter(Boolean);
} // End of function benzeneAlternatives()

/**
 * Names benzene or a substituted benzene under one prefix style. The ring
 * is the parent (`retained` 'benzene', rendered `benceno`). A single side
 * chain is the only substituent, cited without locant; a single OH is the
 * `-ol` suffix instead (`fenol`). With two or more occupied ring positions
 * (design.md §14, I-42a) every group is a detachable prefix (hydrocarbon,
 * halogen or alkoxy), except at most one OH or amine suffix group on the
 * ring (I-43a, numbered 1 first, N0; validation refuses anything else), and
 * the ring is numbered without its Kekulé double bonds (rings.js numberRing()
 * `aromatic`: P-14.4 (f) all prefixes together, then (g) the prefix cited
 * first), so both Kekulé drawings give the same name; the real bond orders
 * stay in the structure for highlighting. The trace is the RING step (the
 * ring as the only candidate, its size as the value), followed by the
 * numbering steps when two or more positions are occupied (the name then
 * cites locants, explained by explain.js).
 *
 * @param {object} mol - A molecule accepted by validateForNaming() whose only ring is a benzene ring.
 * @param {string} [style] - Prefix style (default 'isopropil', design.md §1.1).
 * @returns {object} The naming result (structure.js NamingSuccess) without `alternatives`.
 * @throws {Error} When the ring is not a benzene ring, or it carries several suffix groups, or a –COOH, –CHO, amide
 *   or –C≡N suffix group beside another substituent (safety net, out of scope).
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
  if (onRing > 1 && (sites.length > 1 || sites.some((site) => site.carbon !== undefined))) {
    // Safety net: beside other groups, validation lets through one OH or amine on the ring only (design.md §14.1, I-43a).
    throw new Error(`nameBenzeneWithStyle: ${onRing} substituents with ${sites.length} suffix groups (out of scope)`);
  }
  const polysubstituted = onRing > 1;
  const numbered = numberRing(mol, perceived, substituents, sites.map((site) => site.atom), { aromatic: polysubstituted });
  const parent = { ...numbered.parent, retained: 'benzene' };
  const suffix = buildSuffix(sites, parent.atoms, ctx.principal);
  // The O-bound group of each ring ester (design.md §13.4 I-40d): `ciclohexanocarboxilato de metilo`.
  const esters = esterAlkyls(ctx, suffix);
  const structure = buildNameStructure({
    parent,
    prefixes: groupPrefixes(substituents, parent.atoms),
    suffix,
    ...(esters.length > 0 ? { ester: esters[0], esters } : {}),
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
    }, ...(polysubstituted ? numbered.trace : [])],
  };
} // End of function nameBenzeneWithStyle()
