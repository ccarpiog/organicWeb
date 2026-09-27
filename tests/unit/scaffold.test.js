/**
 * @file Scaffold checks: every module of the design.md §2 layout exists,
 * imports cleanly and exports at least one function.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Modules listed in design.md §2 (ui/app.js needs a DOM, so it is only checked for existence). */
const MODULES = [
  'src/model/molecule.js',
  'src/model/validate.js',
  'src/model/smiles.js',
  'src/model/graph.js',
  'src/naming/lexicon.es.js',
  'src/naming/lexicon.en.js',
  'src/naming/parent.js',
  'src/naming/numbering.js',
  'src/naming/substituent.js',
  'src/naming/structure.js',
  'src/naming/render.js',
  'src/naming/index.js',
  'src/explain/explain.js',
  'src/editor/editor.js',
  'src/editor/history.js',
  'src/editor/geometry.js',
  'src/editor/render.js',
  'src/layout/canonical.js',
  'src/ui/examples.js',
];

test('layout files from design.md §2 exist', async () => {
  const files = [...MODULES, 'src/ui/app.js', 'index.html', 'css/app.css', 'tests/fixtures/names.tsv', 'scripts/build.mjs'];
  for (const file of files) {
    await access(path.join(ROOT, file));
  }
});

for (const file of MODULES) {
  test(`${file} imports and exports a function`, async () => {
    const mod = await import(pathToFileURL(path.join(ROOT, file)).href);
    const functions = Object.values(mod).filter((value) => typeof value === 'function');
    assert.ok(functions.length > 0, `${file} exports no function`);
  });
}
