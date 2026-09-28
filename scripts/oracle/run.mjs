/**
 * @file OPSIN oracle cross-check (design.md §8). Development only, never
 * bundled.
 *
 * Generates seeded random acyclic hydrocarbons and half as many random
 * substituted or unsaturated monocycles and a tenth as many benzene
 * derivatives (benzene and monosubstituted benzenes, either Kekulé
 * drawing), half as many halogen derivatives of such molecules (F, Cl, Br,
 * I; halomethanes and haloethanes included, design.md §13.4 I-30), half as
 * many alcohols (OH groups on chains or on ring carbons, phenol, some also
 * halogenated; I-31), half as many aldehydes and ketones (C=O on chains or
 * ring carbons, some with OH groups and halogens; I-32), half as many
 * carboxylic acids (one or two –COOH at chain ends, some with C=O, OH
 * groups and halogens; I-33), half as many ethers (I-34), half as many
 * esters (one –COO– between two acyclic pieces, some with C=O, OH groups
 * and halogens; I-35) and half as many amines (primary, secondary and
 * tertiary; on chains, on ring carbons, anilines; some with –COOH, ester,
 * C=O, OH groups, ethers and halogens, cited as amino prefixes; I-36), adds
 * one cycloalkane per ring size in the carbon range, names
 * each one in every prefix style (plus its traditional name — `toluene`,
 * `styrene`, `formaldehyde`, `acetaldehyde`, `acetone`, `formic acid`,
 * `acetic acid`, `oxalic acid`, `methyl acetate`, `ethyl formate`, `aniline`,
 * `N-methylaniline`… — when it has one, the functional-class name of a simple
 * amine — `ethylmethylamine` — and the `propan-2-one` form of
 * `propanone`), renders the same name structures in English, lets OPSIN
 * turn the English names back into SMILES and checks that they denote the
 * original molecule (ring count, canonical key + formula). Prints passed / failed /
 * skipped. Without Java or the pinned jar every molecule is reported as
 * skipped (never passed) and the exit status is 0. Failures are written to a
 * log with the seed, SMILES, Spanish and English names, OPSIN version and
 * output.
 *
 * Usage:
 *   npm run oracle -- [--count 1000] [--seed 1] [--min 4] [--max 14]
 *                     [--download] [--jar path] [--java path] [--log path]
 *
 * Exit status: 0 when nothing failed (or everything was skipped), 1 on any
 * naming or adapter failure, 2 on bad arguments.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSmiles } from '../../src/model/smiles.js';
import { nameMolecule, amineClassName } from '../../src/naming/index.js';
import { PREFIX_STYLES } from '../../src/naming/substituent.js';
import { traditionalNameId } from '../../src/naming/aromatic.js';
import { carbonylTraditionalId } from '../../src/naming/principal.js';
import { renderName } from '../../src/naming/render.js';
import { lexiconEn } from '../../src/naming/lexicon.en.js';
import {
  generateMolecules, generateMonocycles, generateBenzenes, generateHalogenated, generateAlcohols, generateCarbonyls,
  generateAcids, generateEthers, generateEsters, generateAmines, generateCycloalkanes,
} from './generate.mjs';
import { OPSIN_VERSION, JAR_PATH, checkAvailability, downloadJar, runOpsin } from './opsin.mjs';
import { englishName, compareWithOpsin } from './compare.mjs';

/** Directory of this script. */
const HERE = path.dirname(fileURLToPath(import.meta.url));

/**
 * Parses the command-line options.
 *
 * @param {string[]} argv - Arguments after the script name.
 * @returns {{count: number, seed: number, min: number, max: number, download: boolean, jar: string, java: string, log: string|null}} The options.
 * @throws {Error} On an unknown option or a bad value.
 */
export function parseArgs(argv) {
  const options = { count: 1000, seed: 1, min: 4, max: 14, download: false, jar: JAR_PATH, java: 'java', log: null };
  const numeric = new Set(['count', 'seed', 'min', 'max']);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const key = arg.replace(/^--/, '');
    if (arg === '--download') {
      options.download = true;
    } else if (arg.startsWith('--') && key in options) {
      const value = argv[i + 1];
      if (value === undefined) {
        throw new Error(`missing value for ${arg}`);
      }
      if (numeric.has(key)) {
        if (!/^\d+$/.test(value)) {
          throw new Error(`${arg} needs a non-negative integer, got ${value}`);
        }
        options[key] = Number(value);
      } else {
        options[key] = value;
      }
      i += 1;
    } else {
      throw new Error(`unknown option ${arg}`);
    }
  } // End of the loop over the arguments
  if (options.min < 1 || options.max > 60 || options.min > options.max) {
    throw new Error(`bad size range ${options.min}–${options.max}`);
  }
  return options;
} // End of function parseArgs()

/**
 * Names every molecule in every prefix style and renders the English names.
 * A benzene derivative with a traditional name retained by IUPAC 2013
 * (aromatic.js traditionalNameId(): `toluene`, `styrene`) gets one more
 * entry, style 'traditional', so OPSIN checks that name too; so do the
 * small carbonyl compounds, acids and esters (principal.js
 * carbonylTraditionalId(); an ester as `methyl acetate`, render.js) and
 * the benzene amines (`aniline`, `N-methylaniline`: the groups on the N
 * kept, render.js). A simple amine's traditional alkylamine alternative
 * (`etilmetilamina`, style 'amineClass') is checked too, rendered in
 * English by naming/index.js amineClassName() with the English lexicon
 * (`ethylmethylamine`).
 *
 * @param {object[]} molecules - The molecules.
 * @returns {{mol: object, smiles: string, names: {style: string, spanish: string, english: string|null, error: string|null}[]}[]} One case per molecule.
 */
export function buildCases(molecules) {
  return molecules.map((mol) => {
    const names = [];
    for (const style of PREFIX_STYLES) {
      const result = nameMolecule(mol, { prefixStyle: style });
      if (!result.ok) {
        names.push({ style, spanish: '', english: null, error: `${result.error.code} ${result.error.detail || result.error.message}` });
        continue;
      }
      names.push({ style, spanish: result.name, english: englishName(result.structure), error: null });
      const first = style === PREFIX_STYLES[0];
      const traditional = first ? traditionalNameId(result.structure) || carbonylTraditionalId(result.structure) : null;
      if (traditional) {
        const spanish = result.alternatives.find((a) => a.style === 'traditional').name;
        // An ester keeps its O-bound group: only the acid part is traditional (`methyl acetate`, I-35);
        // an aniline keeps the groups on its N (`N-methylaniline`, I-36).
        const english = result.structure.ester || traditional === 'aniline'
          ? renderName(result.structure, lexiconEn, { traditional }).name
          : lexiconEn.traditionalName(traditional);
        names.push({ style: 'traditional', spanish, english, error: null });
      }
      const located = first ? result.alternatives.find((a) => a.style === 'locants') : null;
      if (located) {
        const english = renderName(result.structure, lexiconEn, { citeLocants: true }).name;
        names.push({ style: 'locants', spanish: located.name, english, error: null });
      }
      const amineClass = first ? result.alternatives.find((a) => a.style === 'amineClass') : null;
      if (amineClass) {
        names.push({ style: 'amineClass', spanish: amineClass.name, english: amineClassName(mol, result.structure, lexiconEn), error: null });
      }
    } // End of the loop over the prefix styles
    return { mol, smiles: writeSmiles(mol), names };
  });
} // End of function buildCases()

/**
 * Checks every case against OPSIN's output. A molecule passes when the
 * names of all its prefix styles denote it.
 *
 * @param {object[]} cases - Result of buildCases().
 * @param {Map<string, string>} opsinOut - English name → OPSIN SMILES ('' when unparsed).
 * @returns {{passed: number, failed: object[], adapter: object[]}} The pass count and the failing entries.
 */
export function evaluate(cases, opsinOut) {
  let passed = 0;
  const failed = [];
  const adapter = [];
  for (const item of cases) {
    const problems = [];
    for (const entry of item.names) {
      if (entry.error) {
        problems.push({ ...entry, status: 'failed', reason: `naming engine error: ${entry.error}`, opsin: '' });
        continue;
      }
      const opsin = opsinOut.get(entry.english) ?? '';
      const verdict = compareWithOpsin(item.mol, opsin);
      if (verdict.status !== 'passed') {
        problems.push({ ...entry, ...verdict, opsin });
      }
    } // End of the loop over the prefix styles of one molecule
    if (problems.length === 0) {
      passed += 1;
    } else if (problems.some((p) => p.status === 'failed')) {
      failed.push({ smiles: item.smiles, problems });
    } else {
      adapter.push({ smiles: item.smiles, problems });
    }
  } // End of the loop over the cases
  return { passed, failed, adapter };
} // End of function evaluate()

/**
 * Formats the failure log.
 *
 * @param {{seed: number, count: number}} options - Run options.
 * @param {object[]} entries - Failing molecules (failed and adapter).
 * @param {Map<string, string>} stderrByName - OPSIN diagnostics per English name.
 * @returns {string} The log text.
 */
function formatLog(options, entries, stderrByName) {
  const lines = [`# OPSIN oracle failures — seed ${options.seed}, count ${options.count}, OPSIN ${OPSIN_VERSION}`, ''];
  for (const entry of entries) {
    lines.push(`seed: ${options.seed}`, `smiles: ${entry.smiles}`);
    for (const p of entry.problems) {
      lines.push(
        `  style: ${p.style}  status: ${p.status}`,
        `  spanish: ${p.spanish}`,
        `  english: ${p.english}`,
        `  opsin ${OPSIN_VERSION} output: ${p.opsin || '(none)'}`,
        `  reason: ${p.reason}`,
      );
      const diag = stderrByName.get(p.english);
      if (diag) {
        lines.push(`  opsin stderr: ${diag.trim().replace(/\n/g, '\n    ')}`);
      }
    }
    lines.push('');
  } // End of the loop over the failing molecules
  return lines.join('\n');
} // End of function formatLog()

/**
 * Prints the summary line.
 *
 * @param {{passed: number, failed: number, skipped: number, adapter: number}} counts - The counts.
 * @returns {void}
 */
function printSummary({ passed, failed, skipped, adapter }) {
  console.log(`passed: ${passed}  failed: ${failed}  skipped: ${skipped}  adapter failures: ${adapter}`);
}

/**
 * Runs the oracle.
 *
 * @param {string[]} argv - Arguments after the script name.
 * @returns {Promise<number>} The exit status.
 */
export async function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (err) {
    console.error(`oracle: ${err.message}`);
    return 2;
  }
  if (options.download) {
    try {
      console.log(`Downloaded OPSIN ${OPSIN_VERSION} to ${await downloadJar(options.jar)}`);
    } catch (err) {
      console.error(`oracle: ${err.message}`);
    }
  }
  const random = generateMolecules({ count: options.count, seed: options.seed, minSize: options.min, maxSize: options.max });
  const monocycles = generateMonocycles({
    count: Math.ceil(options.count / 2), seed: options.seed, minSize: options.min, maxSize: options.max,
  });
  const benzenes = generateBenzenes({
    count: Math.ceil(options.count / 10), seed: options.seed, minSize: options.min, maxSize: options.max,
  });
  const halogenated = generateHalogenated({
    count: Math.ceil(options.count / 2), seed: options.seed, minSize: options.min, maxSize: options.max,
  });
  const alcohols = generateAlcohols({
    count: Math.ceil(options.count / 2), seed: options.seed, minSize: options.min, maxSize: options.max,
  });
  const carbonyls = generateCarbonyls({
    count: Math.ceil(options.count / 2), seed: options.seed, minSize: options.min, maxSize: options.max,
  });
  const acids = generateAcids({ count: Math.ceil(options.count / 2), seed: options.seed, maxSize: options.max });
  const ethers = generateEthers({
    count: Math.ceil(options.count / 2), seed: options.seed, minSize: options.min, maxSize: options.max,
  });
  const esters = generateEsters({ count: Math.ceil(options.count / 2), seed: options.seed, maxSize: options.max });
  const amines = generateAmines({
    count: Math.ceil(options.count / 2), seed: options.seed, minSize: options.min, maxSize: options.max,
  });
  const rings = generateCycloalkanes({ minSize: options.min, maxSize: options.max });
  const molecules = [
    ...random, ...monocycles, ...benzenes, ...halogenated, ...alcohols, ...carbonyls, ...acids, ...ethers, ...esters, ...amines,
    ...rings,
  ];
  console.log(`OPSIN oracle: ${random.length} molecules + ${monocycles.length} monocycles + ${benzenes.length} benzenes `
    + `+ ${halogenated.length} halogen derivatives + ${alcohols.length} alcohols + ${carbonyls.length} aldehydes and ketones `
    + `+ ${acids.length} carboxylic acids + ${ethers.length} ethers + ${esters.length} esters + ${amines.length} amines + ${rings.length} cycloalkanes, `
    + `seed ${options.seed}, ${options.min}–${options.max} C, OPSIN ${OPSIN_VERSION}`);
  const availability = await checkAvailability(options.jar, options.java);
  if (!availability.ok) {
    console.log(`skipped: ${availability.reason}`);
    printSummary({ passed: 0, failed: 0, skipped: molecules.length, adapter: 0 });
    return 0;
  }
  const cases = buildCases(molecules);
  const names = [...new Set(cases.flatMap((c) => c.names.map((n) => n.english)).filter(Boolean))];
  const { smiles } = runOpsin(names, options.jar, options.java);
  const opsinOut = new Map(names.map((name, i) => [name, smiles[i]]));
  const { passed, failed, adapter } = evaluate(cases, opsinOut);
  printSummary({ passed, failed: failed.length, skipped: 0, adapter: adapter.length });
  const entries = [...failed, ...adapter];
  if (entries.length === 0) {
    return 0;
  }
  const failingNames = [...new Set(entries.flatMap((e) => e.problems.map((p) => p.english)).filter(Boolean))];
  const stderrByName = new Map(failingNames.map((name) => [name, runOpsin([name], options.jar, options.java).stderr]));
  const logPath = options.log || path.join(HERE, 'logs', `failures-seed-${options.seed}.log`);
  await mkdir(path.dirname(logPath), { recursive: true });
  await writeFile(logPath, formatLog(options, entries, stderrByName));
  for (const entry of entries.slice(0, 20)) {
    const p = entry.problems[0];
    console.log(`  ${entry.smiles}  ${p.style}: ${p.spanish} / ${p.english} → ${p.opsin || '(none)'}  [${p.reason}]`);
  }
  console.log(`Failure log: ${logPath}`);
  return 1;
} // End of function main()

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main(process.argv.slice(2));
}
