/**
 * @file Checks that the model modules respect the single-file bundler's
 * syntax subset (scripts/build.mjs) and behave the same once bundled. The
 * model is not reachable from index.html yet, so `npm run build` alone would
 * not exercise it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { bundleModules } from '../../scripts/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODEL_FILES = ['molecule.js', 'graph.js', 'validate.js', 'smiles.js'];

test('model modules bundle and run in a classic script', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'organic-model-'));
  try {
    await mkdir(path.join(dir, 'model'));
    for (const file of MODEL_FILES) {
      await copyFile(path.join(ROOT, 'src', 'model', file), path.join(dir, 'model', file));
    }
    await writeFile(
      path.join(dir, 'entry.js'),
      [
        "import { parseSmiles, writeSmiles } from './model/smiles.js';",
        "import { canonicalTreeKey } from './model/graph.js';",
        "import { validate } from './model/validate.js';",
        "import { formulaUnicode, moleculeToJSON, moleculeFromJSON } from './model/molecule.js';",
        "const mol = parseSmiles('CC(C)CC');",
        'const back = moleculeFromJSON(JSON.stringify(moleculeToJSON(mol)));',
        'globalThis.__result = {',
        '  formula: formulaUnicode(mol),',
        "  same: canonicalTreeKey(mol) === canonicalTreeKey(parseSmiles('CCC(C)C')),",
        '  valid: validate(mol).ok,',
        '  restored: back.ok && writeSmiles(back.mol),',
        '};',
      ].join('\n'),
    );
    const code = await bundleModules(path.join(dir, 'entry.js'), dir);
    const context = {};
    vm.runInNewContext(code, context);
    assert.deepEqual({ ...context.__result }, { formula: 'C₅H₁₂', same: true, valid: true, restored: 'CC(C)CC' });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}); // End of test 'model modules bundle and run in a classic script'
