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
const MODEL_FILES = ['elements.js', 'molecule.js', 'graph.js', 'rings.js', 'validate.js', 'smiles.js'];

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
        "import { canonicalTreeKey, canonicalKey } from './model/graph.js';",
        "import { classifyRings } from './model/rings.js';",
        "import { validate } from './model/validate.js';",
        "import { formulaUnicode, moleculeToJSON, moleculeFromJSON } from './model/molecule.js';",
        "const mol = parseSmiles('CC(C)CC');",
        'const back = moleculeFromJSON(JSON.stringify(moleculeToJSON(mol)));',
        'globalThis.__result = {',
        '  formula: formulaUnicode(mol),',
        "  same: canonicalTreeKey(mol) === canonicalTreeKey(parseSmiles('CCC(C)C')),",
        '  valid: validate(mol).ok,',
        '  restored: back.ok && writeSmiles(back.mol),',
        "  ring: canonicalKey(parseSmiles('CC1CCCC1')) === canonicalKey(parseSmiles('C1CCC(C)C1')),",
        "  kind: classifyRings(parseSmiles('C1CCC2CCCCC2C1')).kind,",
        "  code: validate(parseSmiles('CC1CCCCC1')).error.code,",
        "  cycloalkane: validate(parseSmiles('C1CCCCC1')).ok,",
        '};',
      ].join('\n'),
    );
    const code = await bundleModules(path.join(dir, 'entry.js'), dir);
    const context = {};
    vm.runInNewContext(code, context);
    assert.deepEqual({ ...context.__result }, {
      formula: 'C₅H₁₂', same: true, valid: true, restored: 'CC(C)CC', ring: true, kind: 'fused', code: 'CYCLE', cycloalkane: true,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}); // End of test 'model modules bundle and run in a classic script'
