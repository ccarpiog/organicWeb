/**
 * @file Unit tests for the tile catalogue of «¿Cómo se dibuja?»
 * (src/reverse/tiles.js, design.md §15.4, §15.5.1, phase R-1a), and the
 * rules every src/reverse/ module follows: texts from the lexicon, no
 * DOM, only the lexicon imported from the naming engine, and the bundler's
 * syntax subset (scripts/build.mjs; nothing in index.html reaches these
 * modules yet, so `npm run build` alone would not exercise them).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, mkdtemp, mkdir, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { TILES, tileById, tileId, toTiles, START_ID, END_ID, MAX_NUM, MAX_MULT } from '../../src/reverse/tiles.js';
import {
  stem, multiplier, compoundMultiplier, ENDINGS, FREE_VALENCE_SUFFIXES, RETAINED_PREFIXES, ENCLOSING_MARKS,
} from '../../src/naming/lexicon.es.js';
import { bundleModules } from '../../scripts/build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REVERSE = path.join(ROOT, 'src', 'reverse');

/**
 * The JavaScript files of src/reverse/.
 *
 * @returns {Promise<string[]>} File names.
 */
async function reverseFiles() {
  return (await readdir(REVERSE)).filter((file) => file.endsWith('.js'));
}

test('catalogue: every tile kind of design.md §15.5.1 with its range', () => {
  const count = (kind) => TILES.filter((tile) => tile.kind === kind).length;
  assert.equal(MAX_NUM, 30);
  assert.equal(MAX_MULT, 30);
  assert.equal(count('num'), 30); // NUM 1–30
  assert.equal(count('mult'), 29); // di…triaconta
  assert.equal(count('cmult'), 29); // bis…triacontakis
  assert.equal(count('root'), 30); // met…triacont
  assert.equal(count('ending'), 3);
  assert.equal(count('freeValence'), 2);
  assert.equal(count('retained'), 3);
  assert.equal(count('start'), 1);
  assert.equal(count('end'), 1);
  assert.equal(new Set(TILES.map((tile) => tile.id)).size, TILES.length, 'ids are unique');
  assert.equal(new Set(TILES.map((tile) => tile.text)).size, TILES.length, 'texts are unique');
  assert.ok(TILES.every((tile) => Object.isFrozen(tile)));
}); // End of test 'catalogue: every tile kind of design.md §15.5.1 with its range'

test('every tile text comes from the lexicon (numbers are digits)', () => {
  for (const tile of TILES) {
    const expected = {
      num: () => String(tile.value),
      mult: () => multiplier(tile.value),
      cmult: () => compoundMultiplier(tile.value),
      root: () => stem(tile.value),
      ending: () => ENDINGS[tile.value],
      freeValence: () => FREE_VALENCE_SUFFIXES[tile.value],
      retained: () => `${RETAINED_PREFIXES[tile.value].italic}${RETAINED_PREFIXES[tile.value].text}`,
      start: () => ENCLOSING_MARKS[0][0],
      end: () => ENCLOSING_MARKS[0][1],
    }[tile.kind]();
    assert.equal(tile.text, expected, tile.id);
  } // End of the loop over the tiles
  assert.deepEqual(TILES.filter((t) => t.kind === 'retained').map((t) => t.text), ['isopropil', 'isopropiliden', 'tert-butil']);
  assert.equal(tileById('retained-tert-butyl').italic, 'tert-');
  assert.equal(tileById('retained-isopropyl').italic, '');
}); // End of test 'every tile text comes from the lexicon (numbers are digits)'

test('rows and «más» follow design.md §15.2', () => {
  const more = (kind) => TILES.filter((tile) => tile.kind === kind && tile.more).map((tile) => tile.value);
  assert.deepEqual(more('num'), Array.from({ length: 18 }, (_, i) => i + 13)); // 13–30
  assert.equal(more('mult')[0], 7); // hepta…
  assert.equal(more('cmult')[0], 7);
  assert.equal(more('root')[0], 11); // undec…
  assert.deepEqual([...new Set(TILES.map((tile) => tile.row))], ['numbers', 'multipliers', 'roots', 'endings', 'branches']);
  assert.ok(TILES.filter((tile) => ['ending', 'freeValence', 'retained', 'start', 'end'].includes(tile.kind)).every((tile) => !tile.more));
});

test('tileById, tileId and toTiles', () => {
  assert.equal(tileById('root-4').text, 'but');
  assert.equal(tileId('root', 4), 'root-4');
  assert.equal(tileId('ending', 'double'), 'ending-double');
  assert.equal(tileId('freeValence', 2), 'fv-2');
  assert.equal(tileId('start'), START_ID);
  assert.equal(tileId('end'), END_ID);
  assert.deepEqual(toTiles(['num-2', tileById('mult-2')]).map((tile) => tile.text), ['2', 'di']);
  assert.throws(() => tileById('root-31'), /unknown tile/);
  assert.throws(() => tileId('mult', 1), /no mult tile/);
  assert.throws(() => toTiles(['nope']), /unknown tile/);
}); // End of test 'tileById, tileId and toTiles'

test('src/reverse never retypes a tile word', async () => {
  const words = TILES.filter((tile) => /[a-z]/.test(tile.text)).map((tile) => tile.text);
  for (const file of await reverseFiles()) {
    // Code only: the comments may quote the words they talk about (`ano` → `an`).
    const source = (await readFile(path.join(REVERSE, file), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    for (const word of words) {
      for (const quote of ["'", '"', '`']) {
        assert.ok(!source.includes(`${quote}${word}${quote}`), `src/reverse/${file} retypes «${word}»`);
      }
    }
  }
}); // End of test 'src/reverse never retypes a tile word'

test('src/reverse is pure and imports only the lexicon from the naming engine', async () => {
  const forbidden = [
    /\.(?:x|y)\b/, // atom.x / atom.y
    /\b(?:document|window|navigator|localStorage|sessionStorage)\b/,
  ];
  const files = await reverseFiles();
  assert.deepEqual(files.sort(), ['assemble.js', 'parse.js', 'tiles.js', 'tokenize.js']);
  for (const file of files) {
    const lines = (await readFile(path.join(REVERSE, file), 'utf8')).split('\n');
    lines.forEach((line, i) => {
      for (const pattern of forbidden) {
        assert.doesNotMatch(line, pattern, `src/reverse/${file}:${i + 1}: ${line.trim()}`);
      }
      const from = /^\s*(?:import|export)\b.*\bfrom\s+'([^']+)'/.exec(line) || /^\s*\}\s*from\s+'([^']+)'/.exec(line);
      if (from) {
        // Never render.js or the engine's grouping (design.md §15.4): the assembler works from the tree alone.
        assert.match(from[1], /^\.\/[a-z]+\.js$|^\.\.\/naming\/lexicon\.es\.js$/, `src/reverse/${file}:${i + 1} imports ${from[1]}`);
      }
    });
  }
}); // End of test 'src/reverse is pure and imports only the lexicon from the naming engine'

test('reverse modules bundle and run in a classic script', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'organic-reverse-'));
  try {
    await mkdir(path.join(dir, 'reverse'));
    await mkdir(path.join(dir, 'naming'));
    for (const file of await reverseFiles()) {
      await copyFile(path.join(REVERSE, file), path.join(dir, 'reverse', file));
    }
    await copyFile(path.join(ROOT, 'src', 'naming', 'lexicon.es.js'), path.join(dir, 'naming', 'lexicon.es.js'));
    await writeFile(
      path.join(dir, 'entry.js'),
      [
        "import { parse } from './reverse/parse.js';",
        "import { assemble } from './reverse/assemble.js';",
        "import { tokenize } from './reverse/tokenize.js';",
        "const names = ['5,5-bis(2,2-dimetilpropil)nonano', '8-[2-(propan-2-iliden)hexil]pentadecano', 'hex-1-en-3,5-diino', '2-buteno'];",
        'globalThis.__result = names.map((name) => assemble(parse(tokenize(name)).tree).text).join(\' \')',
        "  + ' ' + parse(['num-2']).errors[0].code;",
      ].join('\n'),
    );
    const code = await bundleModules(path.join(dir, 'entry.js'), dir);
    const context = {};
    vm.runInNewContext(code, context);
    assert.equal(context.__result,
      '5,5-bis(2,2-dimetilpropil)nonano 8-[2-(propan-2-iliden)hexil]pentadecano hex-1-en-3,5-diino 2-buteno NO_PARENT');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}); // End of test 'reverse modules bundle and run in a classic script'
