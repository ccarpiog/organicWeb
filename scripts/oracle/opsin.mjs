/**
 * @file OPSIN CLI adapter for the oracle (design.md §8): the pinned jar
 * (version, URL, SHA-256 — also recorded in scripts/oracle/README.md), its
 * download into the gitignored scripts/oracle/vendor/, availability checks
 * (Java, jar, checksum) and a batch run: English names in, one SMILES per
 * name out. Development only, never bundled.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Pinned OPSIN release (runs on Java 8). */
export const OPSIN_VERSION = '2.9.0';

/** Download URL of the pinned CLI jar. */
export const OPSIN_URL = `https://github.com/dan2097/opsin/releases/download/${OPSIN_VERSION}/opsin-cli-${OPSIN_VERSION}-jar-with-dependencies.jar`;

/** SHA-256 of the pinned CLI jar. */
export const OPSIN_SHA256 = 'c2e29326c281f87b59a05d934d8589adac6e9d17b95b984931b3e739111b360f';

/** Directory holding the jar (gitignored). */
export const VENDOR_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'vendor');

/** Default path of the pinned jar. */
export const JAR_PATH = path.join(VENDOR_DIR, `opsin-cli-${OPSIN_VERSION}-jar-with-dependencies.jar`);

/**
 * Computes the SHA-256 of a buffer.
 *
 * @param {Buffer} data - The bytes.
 * @returns {string} Lower-case hex digest.
 */
export function sha256(data) {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * Downloads the pinned jar into vendor/ and verifies its checksum (the file
 * is written only when the checksum matches).
 *
 * @param {string} [jarPath] - Destination (default JAR_PATH).
 * @returns {Promise<string>} The jar path.
 * @throws {Error} On a network error or a checksum mismatch.
 */
export async function downloadJar(jarPath = JAR_PATH) {
  const response = await fetch(OPSIN_URL);
  if (!response.ok) {
    throw new Error(`download failed: HTTP ${response.status} for ${OPSIN_URL}`);
  }
  const data = Buffer.from(await response.arrayBuffer());
  const digest = sha256(data);
  if (digest !== OPSIN_SHA256) {
    throw new Error(`checksum mismatch for ${OPSIN_URL}: got ${digest}, expected ${OPSIN_SHA256}`);
  }
  await mkdir(path.dirname(jarPath), { recursive: true });
  await writeFile(jarPath, data);
  return jarPath;
}

/**
 * Checks whether the oracle can run: Java on the PATH, the jar present and
 * its checksum the pinned one.
 *
 * @param {string} [jarPath] - The jar (default JAR_PATH).
 * @param {string} [java] - The Java executable (default 'java').
 * @returns {Promise<{ok: boolean, reason: string|null}>} Availability and, when unavailable, why.
 */
export async function checkAvailability(jarPath = JAR_PATH, java = 'java') {
  const probe = spawnSync(java, ['-version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    return { ok: false, reason: `Java not available (${probe.error ? probe.error.code : `exit ${probe.status}`})` };
  }
  try {
    await access(jarPath);
  } catch {
    return { ok: false, reason: `OPSIN jar not found at ${jarPath} (run: npm run oracle -- --download)` };
  }
  const digest = sha256(await readFile(jarPath));
  if (digest !== OPSIN_SHA256) {
    return { ok: false, reason: `OPSIN jar checksum ${digest} differs from the pinned ${OPSIN_SHA256}` };
  }
  return { ok: true, reason: null };
} // End of function checkAvailability()

/**
 * Runs OPSIN once over a batch of English names (one per line on stdin).
 * OPSIN writes one output line per input line, empty when it cannot parse
 * the name; its warnings go to stderr.
 *
 * @param {string[]} names - English names (no newlines).
 * @param {string} [jarPath] - The jar (default JAR_PATH).
 * @param {string} [java] - The Java executable (default 'java').
 * @returns {{smiles: string[], stderr: string}} One SMILES ('' on failure) per name, and OPSIN's stderr.
 * @throws {Error} When the process fails or the output line count does not match.
 */
export function runOpsin(names, jarPath = JAR_PATH, java = 'java') {
  const result = spawnSync(java, ['-jar', jarPath, '-osmi'], {
    input: `${names.join('\n')}\n`,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) {
    throw new Error(`OPSIN failed: ${result.error ? result.error.message : `exit ${result.status}`}\n${result.stderr}`);
  }
  const lines = result.stdout.split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  if (lines.length !== names.length) {
    throw new Error(`OPSIN returned ${lines.length} lines for ${names.length} names`);
  }
  return { smiles: lines.map((line) => line.trim()), stderr: result.stderr };
} // End of function runOpsin()
