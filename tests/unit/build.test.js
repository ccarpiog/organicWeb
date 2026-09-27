/**
 * @file Packaging smoke tests for scripts/build.mjs: the single-file build has
 * no local src/href left, and the module bundler preserves ES module semantics
 * for the syntax subset the project uses.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { buildHtml, bundleModules, findLocalReferences, isLocalUrl, maskSource } from '../../scripts/build.mjs';

/**
 * Creates a temporary directory populated with the given files.
 *
 * @param {Record<string, string>} files - Relative path → content.
 * @returns {Promise<string>} The directory path.
 */
async function makeTree(files) {
  const dir = await mkdtemp(path.join(tmpdir(), 'organicweb-build-'));
  for (const [name, content] of Object.entries(files)) {
    const full = path.join(dir, name);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, content, 'utf8');
  }
  return dir;
}

/**
 * Builds a minimal fake DOM with the pieces the app shell touches.
 *
 * @returns {{document: object, nameButton: {disabled: boolean}}} The fake document.
 */
function fakeDocument() {
  const nameButton = { disabled: false };
  const document = {
    readyState: 'complete',
    documentElement: { dataset: {} },
    getElementById: (id) => (id === 'name-button' ? nameButton : null),
  };
  return { document, nameButton };
}

test('isLocalUrl distinguishes local files from other URLs', () => {
  assert.equal(isLocalUrl('css/app.css'), true);
  assert.equal(isLocalUrl('/src/ui/app.js'), true);
  assert.equal(isLocalUrl('./a.js'), true);
  assert.equal(isLocalUrl('data:,'), false);
  assert.equal(isLocalUrl('https://example.org/x.js'), false);
  assert.equal(isLocalUrl('//cdn.example.org/x.js'), false);
  assert.equal(isLocalUrl('#top'), false);
});

test('built index.html is self-contained', async () => {
  const html = await buildHtml();
  assert.deepEqual(findLocalReferences(html), []);
  assert.doesNotMatch(html, /<link[^>]*rel=["']?stylesheet/i);
  assert.doesNotMatch(html, /<script[^>]*\ssrc=/i);
  assert.doesNotMatch(html, /type=["']?module/i);
  assert.match(html, /<style>[\s\S]*--color-bg[\s\S]*<\/style>/);
  assert.match(html, /<h1>Química orgánica<\/h1>/);
  assert.match(html, /¿Cómo se llama\?/);
});

test('the real app bundle runs as a classic script', async () => {
  const html = await buildHtml();
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  assert.equal(scripts.length, 1);
  const { document, nameButton } = fakeDocument();
  vm.runInNewContext(scripts[0], { document });
  assert.equal(document.documentElement.dataset.appReady, 'true');
  assert.equal(nameButton.disabled, true);
});

test('bundler preserves imports, exports and evaluation order', async () => {
  const dir = await makeTree({
    'entry.js': [
      "import './side.js';",
      "import def, { a, b as renamed } from './lib/a.js';",
      "import * as ns from './lib/ns.js';",
      "import anon from './lib/anon.js';",
      "import {",
      '  answer,',
      "} from './lib/multi.js';",
      'log.push(`entry:${def()}:${a}:${renamed}:${ns.x}:${ns.y}:${ns.z}:${anon}:${answer}`);',
      "log.push('<' + '/script> survives');",
    ].join('\n'),
    'side.js': "log.push('side');\n",
    'lib/a.js': [
      "import { shared } from './shared.js';",
      'export const a = 1;',
      'const bValue = 2;',
      'export { bValue as b };',
      'export default function def() {',
      '  return shared;',
      '}',
      "log.push('a');",
    ].join('\n'),
    'lib/shared.js': "export let shared = 'S';\nlog.push('shared');\n",
    'lib/ns.js': "export { a as x } from './a.js';\nexport * from './star.js';\nexport class z {}\n",
    'lib/star.js': "export const y = 'Y';\nexport default 'not re-exported';\n",
    'lib/anon.js': 'export default 40 + 2;\n',
    'lib/multi.js': 'export async function later() {}\nexport const answer = 42;\n',
  });
  try {
    const code = await bundleModules(path.join(dir, 'entry.js'), dir);
    const log = [];
    vm.runInNewContext(code, { log });
    assert.deepEqual(log.slice(0, 3), ['side', 'shared', 'a']);
    assert.equal(log[3], 'entry:S:1:2:1:Y:class z {}:42:42');
    assert.equal(log[4], '</script> survives');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}); // End of test 'bundler preserves imports, exports and evaluation order'

test('bundler rejects circular, bare and dynamic imports', async () => {
  const dir = await makeTree({
    'cycle1.js': "import { b } from './cycle2.js';\nexport const a = 1;\n",
    'cycle2.js': "import { a } from './cycle1.js';\nexport const b = 2;\n",
    'bare.js': "import x from 'some-package';\n",
    'dynamic.js': "export const load = () => import('./cycle1.js');\n",
    'destructure.js': 'export const { a, b } = { a: 1, b: 2 };\n',
  });
  try {
    await assert.rejects(bundleModules(path.join(dir, 'cycle1.js'), dir), /Circular import/);
    await assert.rejects(bundleModules(path.join(dir, 'bare.js'), dir), /only relative imports/);
    await assert.rejects(bundleModules(path.join(dir, 'dynamic.js'), dir), /dynamic import/);
    await assert.rejects(bundleModules(path.join(dir, 'destructure.js'), dir), /destructuring exports/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('buildHtml fails when a local reference cannot be inlined', async () => {
  const dir = await makeTree({
    'index.html': '<!doctype html><html><body><img src="logo.png"></body></html>',
  });
  try {
    await assert.rejects(buildHtml({ root: dir }), /local references: logo\.png/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

/**
 * Bundles a fixture graph and also imports it natively; each fixture entry
 * stores its observable values in `globalThis.__result`.
 *
 * @param {string} dir - Fixture directory.
 * @param {string} entry - Entry file name.
 * @returns {Promise<{code: string, bundled: object, native: object}>} Both results.
 */
async function bundleAndImport(dir, entry) {
  const code = await bundleModules(path.join(dir, entry), dir);
  const context = {};
  vm.runInNewContext(code, context);
  await import(pathToFileURL(path.join(dir, entry)).href);
  const native = globalThis.__result;
  delete globalThis.__result;
  return { code, bundled: context.__result, native };
}

test('bundler rejects exports that declare several bindings', async () => {
  const dir = await makeTree({
    'multi.js': 'export const a = 1, b = 2;\n',
    'multiline.js': 'export let c = 1,\n  d = 2;\n',
    'single.js': [
      'export const f = (x, y) => [x, y];',
      "export const o = { p: 1, q: 'a,b' };",
      'export const g = 1',
      'const h = 2, i = 3;',
      'globalThis.__result = { f: f(1, 2), o, g, h, i };',
    ].join('\n'),
  });
  try {
    await assert.rejects(bundleModules(path.join(dir, 'multi.js'), dir), /several bindings/);
    await assert.rejects(bundleModules(path.join(dir, 'multiline.js'), dir), /several bindings/);
    const { bundled, native } = await bundleAndImport(dir, 'single.js');
    assert.deepEqual(JSON.parse(JSON.stringify(bundled)), JSON.parse(JSON.stringify(native)));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('explicit exports win over export * (as in native ESM)', async () => {
  const dir = await makeTree({
    'base.js': "export const x = 'base';\nexport const y = 'base-y';\n",
    'mid.js': "export * from './base.js';\nexport const x = 'mid';\n",
    'mid2.js': "export * from './base.js';\nconst local = 'mid2';\nexport { local as y };\n",
    'entry.js': [
      "import * as mid from './mid.js';",
      "import * as mid2 from './mid2.js';",
      'globalThis.__result = { x: mid.x, y: mid.y, x2: mid2.x, y2: mid2.y, keys: Object.keys(mid).sort() };',
    ].join('\n'),
  });
  try {
    const { bundled, native } = await bundleAndImport(dir, 'entry.js');
    assert.deepEqual({ ...bundled, keys: [...bundled.keys] }, native);
    assert.equal(native.x, 'mid');
    assert.equal(native.y2, 'mid2');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('module syntax inside comments and literals is left untouched', async () => {
  const template = [
    'export const text = `line one',
    "import x from './nope.js';",
    "export * from './nope.js';",
    "${'nested'} and ${`inner ${1 + 1}`}`;",
  ].join('\n');
  const entry = [
    "// import gone from './nope.js';",
    '/*',
    "import alsoGone from './nope.js';",
    "export { nothing } from './nope.js';",
    '*/',
    template,
    "const single = 'import y from \"./nope.js\"';",
    'const re = /import z from/g;',
    "const ratio = 4 / 2; // import('./nope.js')",
    'globalThis.__result = { text, single, re: re.source, ratio };',
  ].join('\n');
  const dir = await makeTree({ 'entry.js': entry });
  try {
    const { code, bundled, native } = await bundleAndImport(dir, 'entry.js');
    assert.deepEqual({ ...bundled }, native);
    assert.match(native.text, /^import x from '\.\/nope\.js';$/m);
    // Comments and the template literal are copied byte-for-byte.
    assert.ok(code.includes(template.replace(/^export /, '')));
    assert.ok(code.includes("/*\nimport alsoGone from './nope.js';\nexport { nothing } from './nope.js';\n*/"));
    assert.ok(code.includes("// import gone from './nope.js';"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}); // End of test 'module syntax inside comments and literals is left untouched'

test('maskSource keeps length, newlines and quote delimiters', () => {
  const src = "a = 'x' + `y${ b /* c */ }z` / 2; // d\nr = /e[/]f/g;";
  const masked = maskSource(src);
  assert.equal(masked.length, src.length);
  // Comment and literal contents become spaces; the regex body and flags too.
  const expected = `a = ' ' + \`${' '.repeat(16)}\` / 2;${' '.repeat(5)}\nr = /${' '.repeat(7)};`;
  assert.equal(masked, expected);
});
