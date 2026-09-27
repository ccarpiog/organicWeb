/**
 * @file Fast static checks (`npm run check`), zero dependencies:
 *   1. `node --check` (syntax) on every .js/.mjs file under src/, tests/,
 *      scripts/ and the repository root;
 *   2. no `alert`/`confirm`/`prompt` calls in app code (src/ and index.html),
 *      since the project only uses in-page dialogs.
 * Exits with status 1 and a list of problems if anything fails.
 */

import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP_DIRS = new Set(['node_modules', 'vendor', 'dist', 'test-results', 'playwright-report', '.git']);
const BLOCKING_DIALOG = /(?<![\w$.])(?:(?:window|globalThis|self)\.)?(alert|confirm|prompt)\s*\(/;

/**
 * Recursively lists files with the given extensions, skipping generated and
 * third-party directories.
 *
 * @param {string} dir - Absolute directory to scan.
 * @param {string[]} extensions - Extensions to keep, e.g. ['.js', '.mjs'].
 * @param {boolean} [recursive] - Whether to descend into subdirectories.
 * @returns {Promise<string[]>} Absolute file paths.
 */
async function listFiles(dir, extensions, recursive = true) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive && !SKIP_DIRS.has(entry.name)) {
        files.push(...(await listFiles(full, extensions)));
      }
    } else if (extensions.includes(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
} // End of function listFiles()

/**
 * Runs every check and reports the problems found.
 *
 * @returns {Promise<void>}
 */
async function main() {
  const problems = [];
  const jsExtensions = ['.js', '.mjs'];
  const jsFiles = [
    ...(await listFiles(ROOT, jsExtensions, false)),
    ...(await listFiles(path.join(ROOT, 'src'), jsExtensions)),
    ...(await listFiles(path.join(ROOT, 'tests'), jsExtensions)),
    ...(await listFiles(path.join(ROOT, 'scripts'), jsExtensions)),
  ];

  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
    if (result.status !== 0) {
      problems.push(`Syntax error in ${path.relative(ROOT, file)}:\n${result.stderr.trim()}`);
    }
  }

  const appFiles = [...(await listFiles(path.join(ROOT, 'src'), jsExtensions)), path.join(ROOT, 'index.html')];
  for (const file of appFiles) {
    const lines = (await readFile(file, 'utf8')).split('\n');
    lines.forEach((line, index) => {
      if (BLOCKING_DIALOG.test(line)) {
        problems.push(`${path.relative(ROOT, file)}:${index + 1}: use an in-page dialog, not alert/confirm/prompt`);
      }
    });
  }

  if (problems.length > 0) {
    console.error(problems.join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log(`check: ${jsFiles.length} JavaScript files OK, no blocking dialogs.`);
} // End of function main()

await main();
