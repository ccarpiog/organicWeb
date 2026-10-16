/**
 * @file Test helper for the «¿Cómo se dibuja?» modules (src/reverse/):
 * writes a tile sequence as the words on the tiles, `2 3 di met il pent
 * ano`, with `START` / `END` for the compound-branch controls, and reads
 * the open-chain, `ciclo` and benzene hydrocarbon rows of
 * tests/fixtures/names.tsv (the benzene ones with the retained templates
 * and the orto/meta/para forms, R-4c), their halogen derivatives (R-5a1),
 * their alcohols (R-5a2; the retained phenols, R-5a3a), their ethers
 * (R-5b1: alkoxy prefixes and `anisol`) and their aldehydes and ketones
 * (R-5c1: the suffixes `al`, `ona`, `carbaldehído`, the prefixes `oxo` and
 * `formil`, `benzaldehído`; R-5c2: the acyl prefixes `acetil`, `…oil`,
 * `…carbonil`, `benzoil`) and their carboxylic acids (R-5d1: `ácido`, the
 * suffixes `oico` and `carboxílico`, `benzoico`, the prefix `carboxi`; R-5d2:
 * the retained acid names) and their esters (R-6a1: the suffixes `oato` and
 * `carboxilato`, `benzoato`, the O-bound groups ending in `ilo`; R-6a2a: the
 * retained ester names; R-6a2b: the ester prefixes, `acetiloxi`,
 * `metoxicarbonil`) and their nitriles (R-6b1: the suffixes `nitrilo` and
 * `carbonitrilo`, `benzonitrilo`, the prefix `ciano`; R-6b2: the retained
 * nitrile names) and their amines (R-6c1: the suffix `amina` and the locant
 * `N`; R-6c2: the `amino` prefixes; R-6c3: the retained `anilina` and
 * `bencilamina` and the class names, `metilamina`, `dimetilamina`) and
 * their amides (R-6d1: the suffixes `amida` and `carboxamida`, `benzamida`,
 * the locant `N` on the amide's nitrogen; isAmideName(); R-6d2: the
 * `carbamoil` and acylamino prefixes, isAmidePrefixName(); R-6d3: the
 * retained amide names `formamida`, `acetamida`, `ftalamida`,
 * isAmideTemplateName()) — an amide prefix the engine writes `amino` + `oxo`
 * reading since R-6c2. The orto/meta/para forms of two different prefixes on
 * `benceno` (forward engine since I-54a, read from I-54b) are told apart by
 * pendingLetterForms().
 * Not a test file itself (the test glob only runs `*.test.js`).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TILES, START_ID, END_ID } from '../../src/reverse/tiles.js';
import {
  RING_PREFIX, BENZENE_NAME, RETAINED_PREFIXES, TRADITIONAL_NAMES, BENZENE_DIGROUP_NAMES, ETHER_CLASS_WORD, ACETYL_PREFIX, ACYL_ENDING,
  RING_CARBONYL_ENDING, BENZOYL_PREFIX, ALKOXY_ENDING, FORMYL_PREFIX, SUFFIX_CLASS_WORDS, ESTER_LINK, GROUP_SUFFIXES, GROUP_PREFIXES,
  RING_GROUP_SUFFIXES, FREE_VALENCE_SUFFIXES, ENCLOSING_MARKS,
} from '../../src/naming/lexicon.es.js';
import { parseSmiles } from '../../src/model/smiles.js';
import { nameMolecule } from '../../src/naming/index.js';
import { hasTwoDifferentPrefixes } from '../../src/naming/aromatic.js';
import { tokenize } from '../../src/reverse/tokenize.js';
import { amineNitrogens, isAmideCarbon } from '../../src/model/validate.js';
import { adjacency } from '../../src/model/graph.js';

/** The fixture table (design.md §4.8). */
const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'fixtures', 'names.tsv');

/**
 * Tells whether a fixture SMILES is an open-chain hydrocarbon: only
 * aliphatic carbons, double and triple bonds and branches — no ring-closure
 * digit, aromatic atom, bracket atom or other element.
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True for an open-chain hydrocarbon.
 */
export function isOpenChainHydrocarbon(smiles) {
  return /^[C=#()]+$/.test(smiles);
}

/**
 * Tells whether a fixture SMILES is a monocyclic hydrocarbon: aliphatic
 * carbons, double and triple bonds, branches and one ring closure (the
 * digit 1, opened and closed once) — no aromatic atom, bracket atom or
 * other element. Benzene rows pass too (they are written in Kekulé form):
 * the names decide, see isCycloName().
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True for a monocyclic hydrocarbon.
 */
export function isMonocyclicHydrocarbon(smiles) {
  return /^[C=#()1]+$/.test(smiles) && smiles.split('1').length === 3;
}

/**
 * Tells whether a fixture SMILES is a halogen derivative of an open-chain
 * or monocyclic hydrocarbon (phase R-5a1): carbons, at least one F, Cl, Br
 * or I, double and triple bonds, branches and at most one ring closure (the
 * digit 1, opened and closed once) — no aromatic atom, bracket atom or
 * other element (no O or N).
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True for a halogen derivative.
 */
export function isHalogenDerivative(smiles) {
  const tokens = smiles.match(/Cl|Br|[CFI]|[=#()]|1/g) || [];
  return tokens.join('') === smiles && /Cl|Br|F|I/.test(smiles) && smiles.split('1').length <= 3;
}

/**
 * Tells whether a molecule is an alcohol of a hydrocarbon or of one of its
 * halogen derivatives (phase R-5a2): carbons, halogens and at least one
 * oxygen, every oxygen an OH — single-bonded to one carbon and nothing else
 * (so no C=O, ether, ester or acid) —, and no other element.
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @returns {boolean} True for an alcohol.
 */
export function isAlcoholMolecule(mol) {
  const bonds = [...mol.bonds.values()];
  let oxygens = 0;
  for (const [id, atom] of mol.atoms) {
    if (!['C', 'F', 'Cl', 'Br', 'I', 'O'].includes(atom.element)) {
      return false;
    }
    if (atom.element !== 'O') {
      continue;
    }
    oxygens += 1;
    const own = bonds.filter((bond) => bond.a === id || bond.b === id);
    const other = own.length === 1 ? (own[0].a === id ? own[0].b : own[0].a) : null;
    if (own.length !== 1 || own[0].order !== 1 || mol.atoms.get(other).element !== 'C') {
      return false;
    }
  } // End of the loop over the atoms
  return oxygens > 0;
} // End of function isAlcoholMolecule()

/**
 * Tells whether a fixture SMILES is an alcohol (isAlcoholMolecule(), phase
 * R-5a2); a SMILES the model cannot read is not.
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True for an alcohol.
 */
export function isAlcohol(smiles) {
  try {
    return isAlcoholMolecule(parseSmiles(smiles));
  } catch (err) {
    return false;
  }
}

/**
 * Tells whether an oxygen of a molecule is the =O of an aldehyde or a
 * ketone (phase R-5c1): one double bond, to a carbon bonded to no other
 * oxygen (so not an acid's or an ester's C=O).
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @param {object[]} bonds - Its bonds.
 * @param {number} id - The oxygen's atom id.
 * @returns {boolean} True for a ketone's or an aldehyde's oxygen.
 */
function isCarbonylOxygen(mol, bonds, id) {
  const own = bonds.filter((bond) => bond.a === id || bond.b === id);
  if (own.length !== 1 || own[0].order !== 2) {
    return false;
  }
  const carbon = own[0].a === id ? own[0].b : own[0].a;
  return mol.atoms.get(carbon).element === 'C' && bonds.filter((bond) => (bond.a === carbon || bond.b === carbon) && bond !== own[0])
    .every((bond) => mol.atoms.get(bond.a === carbon ? bond.b : bond.a).element !== 'O');
} // End of function isCarbonylOxygen()

/**
 * Tells whether an oxygen of a molecule is the =O of a carboxylic acid's
 * –COOH (phase R-5d1): one double bond, to a carbon whose only other oxygen
 * is an OH (one single bond; so not an ester's C=O, whose other oxygen is
 * bonded to two carbons).
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @param {object[]} bonds - Its bonds.
 * @param {number} id - The oxygen's atom id.
 * @returns {boolean} True for an acid's =O.
 */
export function isCarboxylOxygen(mol, bonds, id) {
  const own = bonds.filter((bond) => bond.a === id || bond.b === id);
  if (own.length !== 1 || own[0].order !== 2) {
    return false;
  }
  const carbon = own[0].a === id ? own[0].b : own[0].a;
  const others = bonds.filter((bond) => (bond.a === carbon || bond.b === carbon) && bond !== own[0])
    .map((bond) => (bond.a === carbon ? bond.b : bond.a)).filter((atom) => mol.atoms.get(atom).element === 'O');
  return mol.atoms.get(carbon).element === 'C' && others.length === 1
    && bonds.filter((bond) => bond.a === others[0] || bond.b === others[0]).length === 1;
} // End of function isCarboxylOxygen()

/**
 * Tells whether a molecule is an ether of a hydrocarbon, of one of its
 * halogen derivatives or of one of its alcohols (phase R-5b1): carbons,
 * halogens and oxygens only, every oxygen single-bonded to carbons only —
 * an OH (one carbon) or an ether oxygen (two carbons; so no C=O, ester or
 * acid) —, at least one ether oxygen. With `carbonyl` (phase R-5c1) the =O
 * of an aldehyde or a ketone is allowed too (`3-metoxipropanal`), never an
 * acid's or an ester's; with `acid` (phase R-5d1) the =O of a carboxylic
 * acid's –COOH too (`ácido 2-metoxietanoico`; its OH is an OH), never an
 * ester's.
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @param {{carbonyl?: boolean, acid?: boolean}} [options] - `carbonyl`: allow aldehyde and ketone C=O groups; `acid`: allow
 *   the C=O of a –COOH (default false).
 * @returns {boolean} True for an ether.
 */
export function isEtherMolecule(mol, options = {}) {
  const bonds = [...mol.bonds.values()];
  let ethers = 0;
  for (const [id, atom] of mol.atoms) {
    if (!['C', 'F', 'Cl', 'Br', 'I', 'O'].includes(atom.element)) {
      return false;
    }
    if (atom.element !== 'O' || (options.carbonyl && isCarbonylOxygen(mol, bonds, id))
      || (options.acid && isCarboxylOxygen(mol, bonds, id))) {
      continue;
    }
    const own = bonds.filter((bond) => bond.a === id || bond.b === id);
    const others = own.map((bond) => mol.atoms.get(bond.a === id ? bond.b : bond.a).element);
    if (own.some((bond) => bond.order !== 1) || others.some((element) => element !== 'C') || own.length > 2) {
      return false;
    }
    ethers += own.length === 2 ? 1 : 0;
  } // End of the loop over the atoms
  return ethers > 0;
} // End of function isEtherMolecule()

/**
 * Tells whether a fixture SMILES is an ether (isEtherMolecule(), phase
 * R-5b1; with `carbonyl`, R-5c1, beside an aldehyde or a ketone too; with
 * `acid`, R-5d1, beside a carboxylic acid too); a SMILES the model cannot
 * read is not.
 *
 * @param {string} smiles - The SMILES.
 * @param {{carbonyl?: boolean, acid?: boolean}} [options] - isEtherMolecule() options.
 * @returns {boolean} True for an ether.
 */
export function isEther(smiles, options = {}) {
  try {
    return isEtherMolecule(parseSmiles(smiles), options);
  } catch (err) {
    return false;
  }
}

/**
 * Tells whether a molecule is an aldehyde or a ketone of a hydrocarbon or of
 * one of its halogen derivatives, alcohols or ethers (phase R-5c1): carbons,
 * halogens and oxygens only, every oxygen an OH, an ether oxygen or the =O
 * of an aldehyde or a ketone (isCarbonylOxygen(): no acid, ester or other
 * C=O), at least one such =O.
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @returns {boolean} True for an aldehyde or a ketone.
 */
export function isCarbonylMolecule(mol) {
  const bonds = [...mol.bonds.values()];
  let carbonyls = 0;
  for (const [id, atom] of mol.atoms) {
    if (!['C', 'F', 'Cl', 'Br', 'I', 'O'].includes(atom.element)) {
      return false;
    }
    if (atom.element !== 'O') {
      continue;
    }
    if (isCarbonylOxygen(mol, bonds, id)) {
      carbonyls += 1;
      continue;
    }
    const own = bonds.filter((bond) => bond.a === id || bond.b === id);
    if (own.some((bond) => bond.order !== 1) || own.some((bond) => mol.atoms.get(bond.a === id ? bond.b : bond.a).element !== 'C')) {
      return false;
    }
  } // End of the loop over the atoms
  return carbonyls > 0;
} // End of function isCarbonylMolecule()

/**
 * Tells whether a fixture SMILES is an aldehyde or a ketone
 * (isCarbonylMolecule(), phase R-5c1); a SMILES the model cannot read is
 * not.
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True for an aldehyde or a ketone.
 */
export function isCarbonyl(smiles) {
  try {
    return isCarbonylMolecule(parseSmiles(smiles));
  } catch (err) {
    return false;
  }
}

/**
 * Tells whether a molecule is a carboxylic acid of the families the tiles
 * read (phase R-5d1): carbons, halogens and oxygens only, every oxygen bonded
 * to carbons only, and at least one –COOH (isCarboxylOxygen()). Its other
 * oxygens may be OH groups, ether oxygens, the C=O of an aldehyde or a
 * ketone, or an ester's (whose names the tiles write with `oxi` and `oxo`,
 * `ácido 4-metoxi-4-oxobutanoico`, or with ester prefixes, read since phase
 * R-6a2b: ESTER_PREFIX).
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @returns {boolean} True for an acid.
 */
export function isAcidMolecule(mol) {
  const bonds = [...mol.bonds.values()];
  let acids = 0;
  for (const [id, atom] of mol.atoms) {
    if (!['C', 'F', 'Cl', 'Br', 'I', 'O'].includes(atom.element)) {
      return false;
    }
    if (atom.element !== 'O') {
      continue;
    }
    const own = bonds.filter((bond) => bond.a === id || bond.b === id);
    if (own.some((bond) => mol.atoms.get(bond.a === id ? bond.b : bond.a).element !== 'C')) {
      return false;
    }
    acids += isCarboxylOxygen(mol, bonds, id) ? 1 : 0;
  } // End of the loop over the atoms
  return acids > 0;
} // End of function isAcidMolecule()

/**
 * Tells whether a fixture SMILES is a carboxylic acid (isAcidMolecule(),
 * phase R-5d1); a SMILES the model cannot read is not.
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True for an acid.
 */
export function isAcid(smiles) {
  try {
    return isAcidMolecule(parseSmiles(smiles));
  } catch (err) {
    return false;
  }
}

/** The class word of an acid's name (R-5d1), from the lexicon: `ácido`. */
export const ACID_WORD = SUFFIX_CLASS_WORDS.acid;

/**
 * The words of the acid names the tiles do not write yet: none since phase
 * R-5d2, whose «Nombres tradicionales» tiles write the retained acid names
 * (ACID_TEMPLATE_WORDS); the ester prefixes are ESTER_PREFIX.
 */
export const LATER_ACID_WORDS = Object.freeze([]);

/**
 * The words of the retained acid templates (R-5d2), from the lexicon, in the
 * order of their tiles, without the class word: `fórmico`, `acético`,
 * `oxálico`, `fenilacético`, `ftálico`, `isoftálico`, `tereftálico`.
 */
export const ACID_TEMPLATE_WORDS = Object.freeze([
  ...[TRADITIONAL_NAMES.formicAcid, TRADITIONAL_NAMES.aceticAcid, TRADITIONAL_NAMES.oxalicAcid, TRADITIONAL_NAMES.phenylaceticAcid]
    .map((name) => name.slice(`${SUFFIX_CLASS_WORDS.acid} `.length)),
  BENZENE_DIGROUP_NAMES.phthalicAcid, BENZENE_DIGROUP_NAMES.isophthalicAcid, BENZENE_DIGROUP_NAMES.terephthalicAcid,
]);

/**
 * Tells whether a name uses a retained acid template of phase R-5d2
 * (ACID_TEMPLATE_WORDS; `acético` covers `fenilacético` and `ácido
 * 2-(3-metilfenil)acético`, `ftálico` the other two).
 *
 * @param {string} name - A name.
 * @returns {boolean} True for `ácido acético`, `ácido 4-metilftálico`…
 */
export function isAcidTemplateName(name) {
  return ACID_TEMPLATE_WORDS.some((word) => name.includes(word));
}

/**
 * The ester prefixes, by their words: an `alcoxicarbonil` group
 * (`metoxicarbonil`, `[(propan-2-iloxi)carbonil]`) and an acyloxy group
 * (`acetiloxi`, `(formiloxi)`, `(propanoiloxi)`, `[(4-metilbenzoil)oxi]`,
 * `[(ciclohexanocarbonil)oxi]`). The tiles write them since phase R-6a2b;
 * the tests sweep their names apart (reverse-ester-prefixes.test.js).
 */
export const ESTER_PREFIX = new RegExp(`${ALKOXY_ENDING}\\)?${RING_CARBONYL_ENDING}|(?:${ACETYL_PREFIX}|${FORMYL_PREFIX}|${ACYL_ENDING}`
  + `|${RING_CARBONYL_ENDING})[)\\]]?${ALKOXY_ENDING}`);

/**
 * Tells whether a name of a carboxylic acid is written with the tiles of
 * phases R-5d1 and R-5d2: none of the words left for later phases
 * (LATER_ACID_WORDS, empty since R-5d2) and no ester prefix (ESTER_PREFIX,
 * read since phase R-6a2b and swept apart).
 *
 * @param {string} name - A name.
 * @returns {boolean} True when the tiles read it.
 */
export function isAcidName(name) {
  return !LATER_ACID_WORDS.some((word) => name.includes(word)) && !ESTER_PREFIX.test(name);
}

/**
 * Tells whether an oxygen of a molecule is the =O of an ester's –COO–
 * (phase R-6a1): one double bond, to a carbon whose only other oxygen is
 * bonded to two carbons (the bridge oxygen; so not an acid's OH).
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @param {object[]} bonds - Its bonds.
 * @param {number} id - The oxygen's atom id.
 * @returns {boolean} True for an ester's =O.
 */
export function isEsterOxygen(mol, bonds, id) {
  const own = bonds.filter((bond) => bond.a === id || bond.b === id);
  if (own.length !== 1 || own[0].order !== 2) {
    return false;
  }
  const carbon = own[0].a === id ? own[0].b : own[0].a;
  const others = bonds.filter((bond) => (bond.a === carbon || bond.b === carbon) && bond !== own[0])
    .map((bond) => (bond.a === carbon ? bond.b : bond.a)).filter((atom) => mol.atoms.get(atom).element === 'O');
  return mol.atoms.get(carbon).element === 'C' && others.length === 1
    && bonds.filter((bond) => bond.a === others[0] || bond.b === others[0]).length === 2;
} // End of function isEsterOxygen()

/**
 * Tells whether a molecule is an ester of the families the tiles read (phase
 * R-6a1): carbons, halogens and oxygens only, every oxygen bonded to
 * carbons only, at least one –COO– (isEsterOxygen()) and no –COOH (beside
 * an acid the ester is a prefix of the acid's name, which the acid round
 * trip reads). Its other oxygens may be OH groups, ether oxygens or the C=O
 * of an aldehyde or a ketone. With `nitrile` (phase R-6b1) the N of a –C≡N
 * is allowed too, a `ciano` prefix beside the ester (`2-cianoetanoato de
 * metilo`; isNitrileNitrogen()), never an amine's or an amide's.
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @param {{nitrile?: boolean}} [options] - `nitrile`: allow the nitrogens of –C≡N groups (default false).
 * @returns {boolean} True for an ester.
 */
export function isEsterMolecule(mol, options = {}) {
  const bonds = [...mol.bonds.values()];
  let esters = 0;
  for (const [id, atom] of mol.atoms) {
    if (atom.element === 'N' && options.nitrile && isNitrileNitrogen(mol, bonds, id)) {
      continue;
    }
    if (!['C', 'F', 'Cl', 'Br', 'I', 'O'].includes(atom.element)) {
      return false;
    }
    if (atom.element !== 'O') {
      continue;
    }
    const own = bonds.filter((bond) => bond.a === id || bond.b === id);
    if (own.some((bond) => mol.atoms.get(bond.a === id ? bond.b : bond.a).element !== 'C') || isCarboxylOxygen(mol, bonds, id)) {
      return false;
    }
    esters += isEsterOxygen(mol, bonds, id) ? 1 : 0;
  } // End of the loop over the atoms
  return esters > 0;
} // End of function isEsterMolecule()

/**
 * Tells whether a fixture SMILES is an ester (isEsterMolecule(), phase
 * R-6a1; with `nitrile`, R-6b1, beside a `ciano` prefix too); a SMILES the
 * model cannot read is not.
 *
 * @param {string} smiles - The SMILES.
 * @param {{nitrile?: boolean}} [options] - isEsterMolecule() options.
 * @returns {boolean} True for an ester.
 */
export function isEster(smiles, options = {}) {
  try {
    return isEsterMolecule(parseSmiles(smiles), options);
  } catch (err) {
    return false;
  }
}

/** The automatic words between an ester's acid part and its O-bound groups (R-6a1), from the lexicon: ` de `. */
export const ESTER_WORD = ESTER_LINK;

/**
 * The words of the ester names the tiles do not write yet: none since phase
 * R-6a2a, whose «Nombres tradicionales» tiles write the retained `formiato`
 * and `acetato` (ESTER_TEMPLATE_WORDS); the ester prefixes (ESTER_PREFIX)
 * read since phase R-6a2b, beside an acid.
 */
export const LATER_ESTER_WORDS = Object.freeze([]);

/**
 * The words of the retained ester templates (R-6a2a), from the lexicon, in
 * the order of their tiles: `formiato`, `acetato`, `fenilacetato`.
 */
export const ESTER_TEMPLATE_WORDS = Object.freeze([TRADITIONAL_NAMES.formate, TRADITIONAL_NAMES.acetate,
  TRADITIONAL_NAMES.phenylacetate]);

/**
 * Tells whether an ester's name uses a retained ester template of phase
 * R-6a2a (ESTER_TEMPLATE_WORDS before the automatic ` de `; `acetato` covers
 * `fenilacetato` and `2-(4-metilfenil)acetato`), not the words of its O-bound
 * side.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for `acetato de etilo`, `formiato de metilo`…
 */
export function isEsterTemplateName(name) {
  const at = name.indexOf(ESTER_WORD);
  return at >= 0 && ESTER_TEMPLATE_WORDS.some((word) => name.slice(0, at).endsWith(word));
}

/**
 * Tells whether a name is an ester's name the tiles of phases R-6a1 and
 * R-6a2a write: it has the automatic ` de `, none of the words left for later
 * phases (LATER_ESTER_WORDS, empty since R-6a2a) and no ester prefix
 * (ESTER_PREFIX: an acid's name since phase R-6a2b, or an ester the engine
 * refuses).
 *
 * @param {string} name - A name.
 * @returns {boolean} True when the tiles read it.
 */
export function isEsterName(name) {
  return name.includes(ESTER_WORD) && !LATER_ESTER_WORDS.some((word) => name.includes(word)) && !ESTER_PREFIX.test(name);
}

/**
 * Tells whether a nitrogen of a molecule is the N of a nitrile's –C≡N (phase
 * R-6b1): one bond, a triple one, to a carbon (so not an amine's or an
 * amide's N).
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @param {object[]} bonds - Its bonds.
 * @param {number} id - The nitrogen's atom id.
 * @returns {boolean} True for a nitrile's N.
 */
export function isNitrileNitrogen(mol, bonds, id) {
  const own = bonds.filter((bond) => bond.a === id || bond.b === id);
  return own.length === 1 && own[0].order === 3 && mol.atoms.get(own[0].a === id ? own[0].b : own[0].a).element === 'C';
}

/**
 * Tells whether a molecule is a nitrile of the families the tiles read
 * (phase R-6b1): carbons, halogens, oxygens and nitrogens only, every
 * nitrogen the N of a –C≡N (isNitrileNitrogen(): no amine or amide, phases
 * R-6c and R-6d), every oxygen bonded to carbons only (an OH, an ether, a
 * C=O, an acid's or an ester's oxygens, which the tiles write since phases
 * R-5a2…R-6a2b), at least one –C≡N — the principal group or, beside an
 * acid or an ester, the prefix `ciano`.
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @returns {boolean} True for a nitrile.
 */
export function isNitrileMolecule(mol) {
  const bonds = [...mol.bonds.values()];
  let nitriles = 0;
  for (const [id, atom] of mol.atoms) {
    if (!['C', 'F', 'Cl', 'Br', 'I', 'O', 'N'].includes(atom.element)) {
      return false;
    }
    if (atom.element === 'N') {
      if (!isNitrileNitrogen(mol, bonds, id)) {
        return false;
      }
      nitriles += 1;
      continue;
    }
    if (atom.element !== 'O') {
      continue;
    }
    const own = bonds.filter((bond) => bond.a === id || bond.b === id);
    if (own.some((bond) => mol.atoms.get(bond.a === id ? bond.b : bond.a).element !== 'C')) {
      return false;
    }
  } // End of the loop over the atoms
  return nitriles > 0;
} // End of function isNitrileMolecule()

/**
 * Tells whether a fixture SMILES is a nitrile (isNitrileMolecule(), phase
 * R-6b1); a SMILES the model cannot read is not.
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True for a nitrile.
 */
export function isNitrile(smiles) {
  try {
    return isNitrileMolecule(parseSmiles(smiles));
  } catch (err) {
    return false;
  }
}

/**
 * The words of the nitrile names the tiles do not write yet: none since phase
 * R-6b2, whose «Nombres tradicionales» tiles write the retained
 * `acetonitrilo` and `ftalonitrilo` (NITRILE_TEMPLATE_WORDS).
 */
export const LATER_NITRILE_WORDS = Object.freeze([]);

/**
 * The words of the retained nitrile templates (R-6b2), from the lexicon, in
 * the order of their tiles: `acetonitrilo`, `fenilacetonitrilo`,
 * `ftalonitrilo`.
 */
export const NITRILE_TEMPLATE_WORDS = Object.freeze([TRADITIONAL_NAMES.acetonitrile, TRADITIONAL_NAMES.phenylacetonitrile,
  BENZENE_DIGROUP_NAMES.phthalonitrile]);

/**
 * Tells whether a name uses a retained nitrile template of phase R-6b2
 * (NITRILE_TEMPLATE_WORDS; `acetonitrilo` covers `fenilacetonitrilo` and
 * `2-(4-metilfenil)acetonitrilo`, `ftalonitrilo` its substituted forms).
 *
 * @param {string} name - A name.
 * @returns {boolean} True for `acetonitrilo`, `4-metilftalonitrilo`…
 */
export function isNitrileTemplateName(name) {
  return NITRILE_TEMPLATE_WORDS.some((word) => name.includes(word));
}

/**
 * Tells whether a name of a nitrile is written with the tiles of phases
 * R-6b1 and R-6b2: none of the words left for later phases
 * (LATER_NITRILE_WORDS, empty since R-6b2).
 *
 * @param {string} name - A name.
 * @returns {boolean} True when the tiles read it.
 */
export function isNitrileName(name) {
  return !LATER_NITRILE_WORDS.some((word) => name.includes(word));
}

/**
 * The words that mark a nitrile in a name (phase R-6b1), from the lexicon:
 * the suffixes `nitrilo` and `carbonitrilo` (and so `benzonitrilo`) and the
 * prefix `ciano`.
 */
export const NITRILE_WORD = new RegExp(`${GROUP_SUFFIXES.nitrile}|${RING_GROUP_SUFFIXES.nitrile}|${GROUP_PREFIXES.nitrile}`);

/**
 * Tells whether a molecule has an amine nitrogen (phase R-6c1;
 * model/validate.js isAmineNitrogen(): a nitrogen single-bonded to one to
 * three carbons, none of them a C=O carbon — so no amide's N, no –C≡N's).
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @returns {boolean} True when it has one.
 */
export function isAmineMolecule(mol) {
  return amineNitrogens(mol).length > 0;
}

/**
 * Tells whether a fixture SMILES has an amine nitrogen (isAmineMolecule(),
 * phase R-6c1); a SMILES the model cannot read has none.
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True when it has one.
 */
export function isAmine(smiles) {
  try {
    return isAmineMolecule(parseSmiles(smiles));
  } catch (err) {
    return false;
  }
}

/**
 * Words of amine names the tiles write only in later phases: none since
 * phase R-6c3, whose «Nombres tradicionales» tiles write `anilina` (also
 * `N,4-dimetilanilina`) and `bencilamina`; until then `anilina`, and until
 * phase R-6c2 the prefix `amino` too, also inside `(metilamino)`.
 */
export const LATER_AMINE_WORDS = Object.freeze([]);

/**
 * The words of the retained amine templates (R-6c3), from the lexicon, in
 * the order of their tiles: `anilina`, `bencilamina`.
 */
export const AMINE_TEMPLATE_WORDS = Object.freeze([TRADITIONAL_NAMES.aniline, TRADITIONAL_NAMES.benzylamine]);

/**
 * Tells whether a name uses a retained amine template of phase R-6c3
 * (AMINE_TEMPLATE_WORDS: `anilina`, `N-metilanilina`, `p-cloroanilina`,
 * `bencilamina`).
 *
 * @param {string} name - A name.
 * @returns {boolean} True for a name with `anilina` or `bencilamina`.
 */
export function isAmineTemplateName(name) {
  return AMINE_TEMPLATE_WORDS.some((word) => name.includes(word));
}

/** The amino prefix (R-6c2), from the lexicon: `amino`, also in `(metilamino)`, `[etil(metil)amino]`. */
export const AMINO_WORD = GROUP_PREFIXES.amine;

/**
 * Tells whether a name has an amino prefix (R-6c2): `2-aminoetan-1-ol`,
 * `2-(dimetilamino)etan-1-ol`, `ácido 4-amino-4-oxobutanoico`.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for a name with `amino`.
 */
export function isAminoName(name) {
  return name.includes(AMINO_WORD);
}

/** The acyl words and endings (R-5c2: `acetil`, `oil`, `carbonil`, `benzoil`; R-5c1: `formil`): a group bonded by a C=O carbon. */
const ACYL_GROUP_END = new RegExp(`(?:${ACETYL_PREFIX}|${FORMYL_PREFIX}|${ACYL_ENDING}|${RING_CARBONYL_ENDING}|${BENZOYL_PREFIX})$`);

/** The enclosing marks, opening and closing, as the lexicon writes them. */
const OPENING_MARKS = ENCLOSING_MARKS.map(([open]) => open).join('');
const CLOSING_MARKS = ENCLOSING_MARKS.map(([, close]) => close).join('');

/**
 * Tells whether a name has an acylamino prefix (phase R-6d): an amino
 * prefix with a group bonded by a C=O carbon on its nitrogen — among the
 * groups written right before `amino`, each enclosed one (`[(2-metilpropanoil)
 * amino]`, `{[4-(2-metilpropil)benzoil]amino}`, `[(3-oxopropanoil)(propan-2-il)
 * amino]`) or the first, unenclosed one (`(acetilamino)`, `[acetil(metil)
 * amino]`), one whose word ends in an acyl word or ending (ACYL_GROUP_END);
 * `[(2-acetiletil)amino]` has none (its group on the nitrogen is an ethyl).
 *
 * @param {string} name - A name.
 * @returns {boolean} True for a name with an acylamino prefix.
 */
export function hasAcylamino(name) {
  for (let at = name.indexOf(GROUP_PREFIXES.amine); at >= 0; at = name.indexOf(GROUP_PREFIXES.amine, at + 1)) {
    let k = at; // Walks back over the groups written before this `amino`, last one first.
    while (k > 0 && CLOSING_MARKS.includes(name[k - 1])) {
      let depth = 0;
      let m = k - 1;
      for (; m >= 0; m -= 1) {
        depth += CLOSING_MARKS.includes(name[m]) ? 1 : 0;
        depth -= OPENING_MARKS.includes(name[m]) ? 1 : 0;
        if (depth === 0) {
          break;
        }
      } // End of the loop that finds the group's opening mark
      if (ACYL_GROUP_END.test(name.slice(m + 1, k - 1))) {
        return true; // An enclosed group bonded by a C=O carbon.
      }
      k = m;
    } // End of the loop over the enclosed groups
    const word = /[a-z]+$/.exec(name.slice(0, k));
    if (word && ACYL_GROUP_END.test(word[0])) {
      return true; // The first group, unenclosed: `acetilamino`.
    }
  } // End of the loop over the `amino` words
  return false;
} // End of function hasAcylamino()

/**
 * Tells whether a name has the words of the amides (phase R-6d): the suffix
 * `amida` (also in `carboxamida`, `benzamida`, `acetamida`), the prefix
 * `carbamoil`, or an acylamino prefix (hasAcylamino()). The tiles write the
 * suffixes since phase R-6d1, the prefixes since R-6d2
 * (isAmidePrefixName()) and the retained names since R-6d3
 * (isAmideTemplateName()). An amide prefix written `amino` + `oxo` on one
 * carbon (`ácido 4-amino-4-oxobutanoico`) has none of them: the tiles write
 * it since R-6c2.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for a name with an amide's words.
 */
export function isAmideName(name) {
  return name.includes(GROUP_SUFFIXES.amide) || name.includes(GROUP_PREFIXES.amide) || hasAcylamino(name);
}

/**
 * The words of the amide names the tiles do not write yet: none since phase
 * R-6d3, whose «Nombres tradicionales» tiles write the retained amide names
 * (AMIDE_TEMPLATE_WORDS).
 */
export const LATER_AMIDE_WORDS = Object.freeze([]);

/**
 * Tells whether a name has an amide's words the tiles write only in a later
 * phase (LATER_AMIDE_WORDS, empty since R-6d3).
 *
 * @param {string} name - A name.
 * @returns {boolean} True for a name the tiles do not write yet.
 */
export function isLaterAmideName(name) {
  return LATER_AMIDE_WORDS.some((word) => name.includes(word));
}

/**
 * The words of the retained amide templates (R-6d3), from the lexicon, in the
 * order of their tiles: `formamida`, `acetamida` (also in the engine's
 * `2-fenilacetamida` and `2-(4-metilfenil)acetamida`), `ftalamida`.
 */
export const AMIDE_TEMPLATE_WORDS = Object.freeze([TRADITIONAL_NAMES.formamide, TRADITIONAL_NAMES.acetamide,
  BENZENE_DIGROUP_NAMES.phthalamide]);

/**
 * Tells whether a name is written with a retained amide word (R-6d3:
 * AMIDE_TEMPLATE_WORDS; `N,N-dimetilformamida`, `N-metilacetamida`,
 * `2-fenilacetamida`, `4-metilftalamida`). The earlier amide phases' sweeps
 * leave these names out, so they keep their names and exact counts.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for a name with a retained amide word.
 */
export function isAmideTemplateName(name) {
  return AMIDE_TEMPLATE_WORDS.some((word) => name.includes(word));
}

/** The prefix of an amide bonded through its C=O carbon (R-6d2), from the lexicon: `carbamoil`, also in `(metilcarbamoil)`. */
export const CARBAMOYL_WORD = GROUP_PREFIXES.amide;

/**
 * Tells whether a name has an amide prefix of phase R-6d2: `carbamoil`
 * (CARBAMOYL_WORD: `ácido 3-carbamoilpentanodioico`,
 * `[etil(metil)carbamoil]`) or an acylamino prefix (hasAcylamino():
 * `(acetilamino)`, `[acetil(metil)amino]`).
 *
 * @param {string} name - A name.
 * @returns {boolean} True for a name with a carbamoyl or an acylamino prefix.
 */
export function isAmidePrefixName(name) {
  return name.includes(CARBAMOYL_WORD) || hasAcylamino(name);
}

/**
 * Tells whether a name is one of phase R-6d1's amide names: an amide's words
 * (isAmideName()) the tiles write since that phase — the suffixes `amida`,
 * `carboxamida`, `benzamida` —, none of a later phase's (R-6d2: the amide
 * prefixes, isAmidePrefixName(); R-6d3: the retained names,
 * isAmideTemplateName()). The R-6d1 sweeps keep their names and exact counts
 * so.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for an R-6d1 amide name.
 */
export function isR6d1AmideName(name) {
  return isAmideName(name) && !isAmidePrefixName(name) && !isAmideTemplateName(name);
}

/**
 * Tells whether a name is one of phase R-6d2's amide names: one with an
 * amide prefix (isAmidePrefixName(): `carbamoil`, an acylamino prefix) and no
 * word of a later phase (R-6d3: isAmideTemplateName()); swept in
 * reverse-amide-prefixes.test.js.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for an R-6d2 amide name.
 */
export function isR6d2AmideName(name) {
  return isAmidePrefixName(name) && !isAmideTemplateName(name);
}

/**
 * Tells whether a molecule has an amide group (model/validate.js
 * isAmideCarbon(): a C=O carbon single-bonded to a nitrogen) — named with
 * the amides' words (R-6d) or, as a prefix beside an acid or an ester,
 * `amino` + `oxo` (R-6c2).
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @returns {boolean} True when it has one.
 */
export function isAmideMolecule(mol) {
  const adj = adjacency(mol);
  return [...mol.atoms.keys()].some((id) => isAmideCarbon(mol, adj, id));
}

/**
 * Tells whether a fixture SMILES has an amide group (isAmideMolecule()); a
 * SMILES the model cannot read has none.
 *
 * @param {string} smiles - The SMILES.
 * @returns {boolean} True when it has one.
 */
export function isAmide(smiles) {
  try {
    return isAmideMolecule(parseSmiles(smiles));
  } catch (err) {
    return false;
  }
}

/**
 * An amine's functional-class name (phase R-6c3: `metilamina`,
 * `dimetilamina`, `etilmetilamina`, `trimetilamina`) — and the retained
 * `bencilamina`, which ends the same way: the groups on the nitrogen, ending
 * in `il`, then `amina`, in one word. No substitutive name ends that way: a
 * parent's ending before `amina` is `an`, `en`, `in` or `bencen`.
 */
export const AMINE_CLASS_NAME = new RegExp(`${FREE_VALENCE_SUFFIXES[1]}${GROUP_SUFFIXES.amine}$`);

/**
 * Tells whether a name is an amine's functional-class name (R-6c3:
 * `metilamina`, `di-tert-butilamina`; AMINE_CLASS_NAME), not the retained
 * `bencilamina`.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for a class name.
 */
export function isAmineClassName(name) {
  return AMINE_CLASS_NAME.test(name) && !isAmineTemplateName(name);
}

/**
 * Tells whether an amine's name (or an alternative) is one of the amine
 * phases' (R-6c1 and R-6c2: the amino prefixes too; R-6c3: `anilina`,
 * `bencilamina` and the class names too): no word of a later amine phase
 * (LATER_AMINE_WORDS, none since R-6c3) and no word of the amides
 * (isAmideName(): a molecule with an amine and an amide,
 * `3-amino-N-metilpropanamida`, is an amide's name, which the tiles write
 * since phase R-6d1 when it has no later amide word, isR6d1AmideName()).
 *
 * @param {string} name - The name.
 * @returns {boolean} True when it can be built from the amine tiles.
 */
export function isAmineName(name) {
  return !LATER_AMINE_WORDS.some((word) => name.includes(word)) && !isAmideName(name);
}

/**
 * The words of the aldehyde and ketone names the tiles do not write yet:
 * none since phase R-5c3a, whose «Nombres tradicionales» tiles write the
 * retained names (CARBONYL_TEMPLATE_WORDS).
 */
export const LATER_CARBONYL_WORDS = Object.freeze([]);

/**
 * Tells whether a name of an aldehyde or a ketone is written with the tiles
 * (phases R-5c1, R-5c2 and R-5c3a): none of the words left for later phases
 * (LATER_CARBONYL_WORDS, empty since R-5c3a).
 *
 * @param {string} name - A name.
 * @returns {boolean} True when the tiles read it.
 */
export function isCarbonylName(name) {
  return !LATER_CARBONYL_WORDS.some((word) => name.includes(word));
}

/**
 * The words of the retained carbonyl templates (R-5c3a), from the lexicon,
 * in the order of their tiles: `formaldehído`, `acetaldehído`, `acetona`,
 * `acetofenona`, `fenilacetaldehído`, `ftalaldehído`, `isoftalaldehído`,
 * `tereftalaldehído`.
 */
export const CARBONYL_TEMPLATE_WORDS = Object.freeze([
  TRADITIONAL_NAMES.formaldehyde, TRADITIONAL_NAMES.acetaldehyde, TRADITIONAL_NAMES.acetone, TRADITIONAL_NAMES.acetophenone,
  TRADITIONAL_NAMES.phenylacetaldehyde, BENZENE_DIGROUP_NAMES.phthalaldehyde, BENZENE_DIGROUP_NAMES.isophthalaldehyde,
  BENZENE_DIGROUP_NAMES.terephthalaldehyde,
]);

/**
 * Tells whether a name uses a retained carbonyl template of phase R-5c3a
 * (CARBONYL_TEMPLATE_WORDS; `acetaldehído` covers `fenilacetaldehído` and
 * `2-(4-metilfenil)acetaldehído`, `ftalaldehído` the other two).
 *
 * @param {string} name - A name.
 * @returns {boolean} True for `acetona`, `4-metilftalaldehído`…
 */
export function isCarbonylTemplateName(name) {
  return CARBONYL_TEMPLATE_WORDS.some((word) => name.includes(word));
}

/**
 * The words of the acyl prefixes the tiles of phase R-5c2 write, from the
 * lexicon: `acetil`, the ending `oil` (`propanoil`, `(but-2-enoil)`), the
 * ending `carbonil` (`(ciclohexanocarbonil)`) and `benzoil`.
 */
export const ACYL_WORDS = Object.freeze([ACETYL_PREFIX, ACYL_ENDING, RING_CARBONYL_ENDING, BENZOYL_PREFIX]);

/**
 * Tells whether a name has an acyl prefix of phase R-5c2 (ACYL_WORDS) —
 * also inside an ester's or an amide's prefix (`acetiloxi`, `acetilamino`),
 * which later phases read.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for a name with an acyl word.
 */
export function isAcylName(name) {
  return ACYL_WORDS.some((word) => name.includes(word));
}

/**
 * Tells whether a name is an ether's functional-class name (`dietil éter`,
 * `etil metil éter`), which the tiles write from phase R-5b2 on (I-51b2):
 * it ends in the lexicon's class word.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for a class name.
 */
export function isEtherClassName(name) {
  return name.endsWith(` ${ETHER_CLASS_WORD}`);
}

/**
 * The retained names of alcohols the tiles do not write yet: since the
 * phenol templates of R-5a3a (`o-cresol`, `pirocatecol`, `catecol`,
 * `resorcinol`, `hidroquinona`) only the class name `alcohol bencílico`,
 * from the lexicon.
 */
const LATER_ALCOHOL_WORDS = Object.freeze([TRADITIONAL_NAMES.benzylAlcohol.split(' ')[0]]);

/**
 * The words of the retained phenol templates (R-5a3a), from the lexicon:
 * `cresol`, `pirocatecol`, `catecol`, `resorcinol`, `hidroquinona`.
 */
export const PHENOL_TEMPLATE_WORDS = Object.freeze([
  TRADITIONAL_NAMES.oCresol.slice(2), BENZENE_DIGROUP_NAMES.pyrocatechol, BENZENE_DIGROUP_NAMES.catechol,
  BENZENE_DIGROUP_NAMES.resorcinol, BENZENE_DIGROUP_NAMES.hydroquinone,
]);

/**
 * Tells whether a name of an alcohol is written with the tiles of phases
 * R-5a2 and R-5a3a: none of the retained names left for later phases
 * (LATER_ALCOHOL_WORDS).
 *
 * @param {string} name - A name.
 * @returns {boolean} True when the tiles read it.
 */
export function isAlcoholName(name) {
  return !LATER_ALCOHOL_WORDS.some((word) => name.includes(word));
}

/**
 * Tells whether a name is written with the syntax of phase R-4a: a `ciclo`
 * name (its parent or a branch a `ciclo` ring), letters without accents,
 * digits, hyphens, commas and enclosing marks only, and — unless `closing`
 * — no compound locant of a ring's closing bond (`1(3)`, the `1(n)` tile of
 * R-5a2, which the mutation sweeps of the diagnosis tests do not rewrite).
 * Benzene and `fenil` names (R-4b) have no `ciclo`.
 *
 * @param {string} name - A name.
 * @param {boolean} [closing] - Accept the compound locant `1(3)` too (R-5a2; default false).
 * @returns {boolean} True when R-4a (with `closing`, R-5a2) reads it.
 */
export function isCycloName(name, closing = false) {
  return name.includes(RING_PREFIX) && /^[a-z0-9,()[\]{}-]+$/.test(name) && (closing || !/\d\(\d/.test(name));
}

/** The words of the retained templates (R-4c): `tolueno`, `estireno`, `xileno`, `mesitileno`. */
const TEMPLATE_WORDS = TILES.filter((tile) => tile.kind === 'template').map((tile) => tile.text);

/**
 * Tells whether a name is written with the syntax of phases R-4b and R-4c: a
 * `benceno`, `fenil` or retained-template name (letters without accents,
 * digits, hyphens, commas and enclosing marks only), the old orto/meta/para
 * forms included — `1,2-dimetilbenceno`, `(4-metilfenil)metano`, `tolueno`,
 * `1,2-xileno`, `o-xileno`, `mesitileno`, `o-dimetilbenceno`.
 *
 * @param {string} name - A name.
 * @returns {boolean} True when R-4b / R-4c read it.
 */
export function isBenzeneName(name) {
  const phenyl = `${RETAINED_PREFIXES.phenyl.italic}${RETAINED_PREFIXES.phenyl.text}`;
  return [BENZENE_NAME, phenyl, ...TEMPLATE_WORDS].some((word) => name.includes(word)) && /^[a-z0-9,()[\]{}-]+$/.test(name);
}

/**
 * Tells whether a name uses the tiles of phase R-4c: a retained template or
 * an orto/meta/para letter.
 *
 * @param {string} name - A name.
 * @returns {boolean} True for `tolueno`, `1,2-xileno`, `o-dimetilbenceno`…
 */
export function isTemplateName(name) {
  return TEMPLATE_WORDS.some((word) => name.includes(word)) || /^[omp]-/.test(name);
}

/**
 * The orto/meta/para forms of two different prefixes on plain `benceno`
 * that the forward engine writes since phase I-54a (design.md §14.4;
 * naming/aromatic.js hasTwoDifferentPrefixes(), positionalParts(): one per
 * prefix style, `m-cloroetilbenceno`, `p-isopropilmetilbenceno`,
 * `p-metil(propan-2-il)benceno`) and the reverse engine reads only from
 * phase I-54b: until then parse.js checkLetters() refuses an o/m/p letter
 * before two different prefixes (POSITIONAL), so no tile sequence writes
 * them (pendingLetterFormFails()). The round trips and closed loops of the
 * reverse tests count them apart, asserted to fail exactly so; phase I-54b
 * flips them (they then read as the engine's alternatives).
 *
 * @param {object|string} source - A nameMolecule() result, or a fixture SMILES (named here).
 * @returns {Set<string>} The forms (empty for any other molecule).
 */
export function pendingLetterForms(source) {
  const naming = typeof source === 'string' ? nameMolecule(parseSmiles(source)) : source;
  if (!naming.ok || !hasTwoDifferentPrefixes(naming.structure)) {
    return new Set();
  }
  return new Set(naming.alternatives.filter((alt) => alt.style === 'positional').map((alt) => alt.name));
}

/**
 * Tells whether a pending orto/meta/para form (pendingLetterForms()) fails
 * exactly as it does before phase I-54b: no tile sequence writes it
 * (tokenize() returns null, since every reading of its letter is refused).
 *
 * @param {string} name - A pending form.
 * @returns {boolean} True when it fails so.
 */
export function pendingLetterFormFails(name) {
  return tokenize(name) === null;
}

/**
 * Reads the fixture rows (design.md §4.8): SMILES, name and the
 * alternatives column (`style=name` pairs separated by `;`), with the `#`
 * line of the section each row is in.
 *
 * @returns {Promise<{line: number, smiles: string, names: string[], section: string}[]>} The rows.
 */
export async function readFixtures() {
  const lines = (await readFile(FIXTURES, 'utf8')).split('\n');
  const rows = [];
  let section = '';
  lines.slice(1).forEach((text, i) => {
    if (text.startsWith('#')) {
      section = text;
      return;
    }
    if (text.trim() === '') {
      return;
    }
    const [smiles, name, , , alternatives = ''] = text.split('\t');
    const others = alternatives.split(';').filter(Boolean).map((pair) => pair.slice(pair.indexOf('=') + 1));
    rows.push({ line: i + 2, smiles, names: [name, ...others], section });
  });
  return rows;
} // End of function readFixtures()

/** Tile ids by the text on the tile (every tile text is unique). */
const BY_TEXT = new Map(TILES.filter((tile) => tile.kind !== 'start' && tile.kind !== 'end').map((tile) => [tile.text, tile.id]));
BY_TEXT.set('START', START_ID);
BY_TEXT.set('END', END_ID);

/**
 * Turns space-separated tile words into tile ids.
 *
 * @param {string} words - E.g. '4 prop ano 2 il hept ano'.
 * @returns {string[]} The tile ids.
 * @throws {Error} For a word that is no tile.
 */
export function seq(words) {
  return words.split(/\s+/).filter(Boolean).map((word) => {
    const id = BY_TEXT.get(word);
    if (!id) {
      throw new Error(`seq: no tile reads «${word}»`);
    }
    return id;
  });
}

/**
 * Collects the tile indices a syntax tree refers to, in the order the
 * fields are visited (tile order for a lossless tree).
 *
 * @param {object} node - A node of a parse() tree.
 * @returns {number[]} The indices.
 */
export function leafIndices(node) {
  const out = [];
  /**
   * Visits one node.
   *
   * @param {object|null} n - The node.
   * @returns {void}
   */
  const visit = (n) => {
    if (!n) {
      return;
    }
    switch (n.type) {
      case 'name':
        visit(n.suffixClass); // `ácido` (R-5d1)
        n.items.forEach(visit);
        visit(n.parent);
        visit(n.ester); // An ester's O-bound side (R-6a1)
        n.trailing.forEach(visit);
        break;
      case 'ester':
        n.items.forEach(visit);
        break;
      case 'parent':
        out.push(...n.legacy, ...(n.letter === null ? [] : [n.letter]), ...(n.legacyMultiplier === null ? [] : [n.legacyMultiplier]));
        visit(n.chain);
        visit(n.suffix); // R-5a2
        break;
      case 'suffix':
        out.push(...n.locants, ...(n.multiplier === null ? [] : [n.multiplier]), n.tile);
        break;
      case 'prefix':
        out.push(...n.locants, ...(n.letter === null ? [] : [n.letter]), ...(n.multiplier === null ? [] : [n.multiplier]));
        visit(n.substituent);
        break;
      case 'branch':
        out.push(n.start);
        n.items.forEach(visit);
        visit(n.chain);
        if (n.end !== null) {
          out.push(n.end);
        }
        break;
      case 'chain':
        out.push(...(n.ring === null ? [] : [n.ring]), ...(n.root === null ? [] : [n.root]), ...(n.ano === null ? [] : [n.ano]));
        n.segments.forEach((s) => out.push(...s.locants, ...(s.multiplier === null ? [] : [s.multiplier]), s.ending));
        out.push(...n.fvLocants, ...(n.fv === null ? [] : [n.fv]), ...(n.oxi === null || n.oxi === undefined ? [] : [n.oxi])); // R-5b
        out.push(...(n.carbonil === undefined ? [] : [n.carbonil])); // `metoxicarbonil` (R-6a2b)
        break;
      default: // 'retained', 'halogen', 'hydroxy', 'benzene', 'template', 'suffixClass', 'stray'
        // `isopropoxi` (R-5b); `isopropoxicarbonil` (R-6a2b); `isopropilo` (R-6a1).
        out.push(n.tile, ...(n.oxi === null || n.oxi === undefined ? [] : [n.oxi]), ...(n.carbonil === undefined ? [] : [n.carbonil]),
          ...(n.ilo === undefined ? [] : [n.ilo]));
    }
  }; // End of function visit()
  visit(node);
  return out;
} // End of function leafIndices()
