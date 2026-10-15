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
 * `formil`, `benzaldehído`).
 * Not a test file itself (the test glob only runs `*.test.js`).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TILES, START_ID, END_ID } from '../../src/reverse/tiles.js';
import {
  RING_PREFIX, BENZENE_NAME, RETAINED_PREFIXES, TRADITIONAL_NAMES, BENZENE_DIGROUP_NAMES, ETHER_CLASS_WORD, ACETYL_PREFIX, ACYL_ENDING,
  RING_CARBONYL_ENDING,
} from '../../src/naming/lexicon.es.js';
import { parseSmiles } from '../../src/model/smiles.js';

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
 * Tells whether a molecule is an ether of a hydrocarbon, of one of its
 * halogen derivatives or of one of its alcohols (phase R-5b1): carbons,
 * halogens and oxygens only, every oxygen single-bonded to carbons only —
 * an OH (one carbon) or an ether oxygen (two carbons; so no C=O, ester or
 * acid) —, at least one ether oxygen. With `carbonyl` (phase R-5c1) the =O
 * of an aldehyde or a ketone is allowed too (`3-metoxipropanal`), never an
 * acid's or an ester's.
 *
 * @param {object} mol - A molecule (model/molecule.js).
 * @param {{carbonyl?: boolean}} [options] - `carbonyl`: allow aldehyde and ketone C=O groups (default false).
 * @returns {boolean} True for an ether.
 */
export function isEtherMolecule(mol, options = {}) {
  const bonds = [...mol.bonds.values()];
  let ethers = 0;
  for (const [id, atom] of mol.atoms) {
    if (!['C', 'F', 'Cl', 'Br', 'I', 'O'].includes(atom.element)) {
      return false;
    }
    if (atom.element !== 'O' || (options.carbonyl && isCarbonylOxygen(mol, bonds, id))) {
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
 * R-5b1; with `carbonyl`, R-5c1, beside an aldehyde or a ketone too); a
 * SMILES the model cannot read is not.
 *
 * @param {string} smiles - The SMILES.
 * @param {{carbonyl?: boolean}} [options] - isEtherMolecule() options.
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
 * The words of the aldehyde and ketone names the tiles of phase R-5c1 do not
 * write, from the lexicon: the acyl prefixes of phase R-5c2 (`acetil`, the
 * `oil` ending of `propanoil` and `benzoil`, the `carbonil` of
 * `ciclohexanocarbonil`) and the retained names of phase R-5c3
 * (`formaldehído`, `acetaldehído` — `fenilacetaldehído`,
 * `2-(4-metilfenil)acetaldehído` too —, `acetona`, `acetofenona`, the
 * ftalaldehídos).
 */
export const LATER_CARBONYL_WORDS = Object.freeze([
  ACETYL_PREFIX, ACYL_ENDING, RING_CARBONYL_ENDING, TRADITIONAL_NAMES.formaldehyde, TRADITIONAL_NAMES.acetaldehyde,
  TRADITIONAL_NAMES.acetone, TRADITIONAL_NAMES.acetophenone, BENZENE_DIGROUP_NAMES.phthalaldehyde,
]);

/**
 * Tells whether a name of an aldehyde or a ketone is written with the tiles
 * of phase R-5c1: none of the words left for later phases
 * (LATER_CARBONYL_WORDS; `ftalaldehído` covers `isoftalaldehído` and
 * `tereftalaldehído`).
 *
 * @param {string} name - A name.
 * @returns {boolean} True when the tiles read it.
 */
export function isCarbonylName(name) {
  return !LATER_CARBONYL_WORDS.some((word) => name.includes(word));
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
        n.items.forEach(visit);
        visit(n.parent);
        n.trailing.forEach(visit);
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
        break;
      default: // 'retained', 'halogen', 'hydroxy', 'benzene', 'template', 'stray'
        out.push(n.tile, ...(n.oxi === null || n.oxi === undefined ? [] : [n.oxi])); // `isopropoxi` (R-5b)
    }
  }; // End of function visit()
  visit(node);
  return out;
} // End of function leafIndices()
