/**
 * @file Single-file build: inlines every stylesheet and ES module referenced by
 * index.html into dist/index.html, so the app opens from file:// and can be put
 * on any static host (design.md §1, §2). Zero dependencies.
 *
 * The ES module graph is resolved from each `<script type="module" src>` entry
 * and emitted as ONE classic script: every module becomes a factory function
 * registered in dependency order (a module always runs after its imports, as
 * in native ESM). Supported syntax is the static subset this project uses:
 *
 *   import x from './a.js';            import { a, b as c } from './a.js';
 *   import * as ns from './a.js';      import x, { a } from './a.js';
 *   import './a.js';
 *   export function f() {}             export class C {}
 *   export const|let|var x = ...;      export default <expression or declaration>;
 *   export { a, b as c };              export { a as b } from './a.js';
 *   export * from './a.js';
 *
 * Import/export statements must start a line. They are found by a lexical
 * scan (maskSource()), so text inside comments, strings, template literals and
 * regex literals is never rewritten. Only relative specifiers are allowed (no
 * runtime dependencies exist). Dynamic `import()`, `import.meta`,
 * destructuring exports, exports declaring several bindings
 * (`export const a = 1, b = 2;`) and circular imports are rejected with an
 * error. Explicit exports take precedence over `export *`. Named imports are
 * bound once, after the imported module has run (not live bindings); do not
 * reassign exported `let` variables.
 *
 * Usage: `node scripts/build.mjs` (or `npm run build`).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Repository root (the parent of this script's directory). */
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const IDENT = '[A-Za-z_$][\\w$]*';

/**
 * Tells whether a URL found in an attribute points to a local file that must
 * be inlined (as opposed to data:, http:, //host, #fragment or empty).
 *
 * @param {string} url - The attribute value.
 * @returns {boolean} True when the URL is a relative or root-relative local path.
 */
export function isLocalUrl(url) {
  const value = url.trim();
  if (value === '' || value.startsWith('#') || value.startsWith('//')) {
    return false;
  }
  return !/^[a-z][a-z0-9+.-]*:/i.test(value);
}

/**
 * Reads the value of one attribute from an HTML start tag.
 *
 * @param {string} tag - The start tag text, e.g. `<link rel="stylesheet" href="a.css">`.
 * @param {string} name - The attribute name.
 * @returns {string|null} The attribute value, or null if absent.
 */
function getAttr(tag, name) {
  const match = new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  if (!match) {
    return null;
  }
  return match[1] ?? match[2] ?? match[3];
}

/**
 * Resolves an HTML-relative URL to an absolute file path inside the root.
 *
 * @param {string} url - The local URL from the page.
 * @param {string} baseDir - Directory of the HTML file.
 * @param {string} root - Root directory used for root-relative URLs.
 * @returns {string} Absolute file path.
 */
function resolveLocal(url, baseDir, root) {
  const clean = decodeURI(url.split(/[?#]/)[0]);
  return clean.startsWith('/') ? path.join(root, clean) : path.resolve(baseDir, clean);
}

/**
 * Escapes text so it cannot close the surrounding `<script>`/`<style>` element.
 *
 * @param {string} text - Script or stylesheet source.
 * @param {string} tagName - 'script' or 'style'.
 * @returns {string} The escaped text.
 */
function escapeForTag(text, tagName) {
  return text.replace(new RegExp(`</(${tagName})`, 'gi'), (whole, name) => `<\\/${name}`);
}

/**
 * Parses the named-binding list of an import/export clause, e.g. `a, b as c`.
 *
 * @param {string} list - The text between the braces.
 * @returns {Array<{imported: string, local: string}>} The bindings.
 */
function parseNamedList(list) {
  return list
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((part) => {
      const match = new RegExp(`^(${IDENT})(?:\\s+as\\s+(${IDENT}))?$`).exec(part);
      if (!match) {
        throw new Error(`Unsupported binding "${part}"`);
      }
      return { imported: match[1], local: match[2] ?? match[1] };
    });
}

/**
 * Converts an import clause into `const` declarations reading from a module
 * namespace variable.
 *
 * @param {string} clause - The text between `import` and `from`.
 * @param {string} nsVar - Name of the variable holding the imported namespace.
 * @returns {string} JavaScript declarations.
 */
function importClauseToCode(clause, nsVar) {
  const match = new RegExp(
    `^(?:(${IDENT})\\s*(?:,\\s*)?)?(?:\\{([\\s\\S]*)\\}|\\*\\s*as\\s+(${IDENT}))?$`,
  ).exec(clause.trim());
  if (!match || (!match[1] && match[2] === undefined && !match[3])) {
    throw new Error(`Unsupported import clause "${clause.trim()}"`);
  }
  const lines = [];
  if (match[1]) {
    lines.push(`const ${match[1]} = ${nsVar}.default;`);
  }
  if (match[3]) {
    lines.push(`const ${match[3]} = ${nsVar};`);
  }
  if (match[2] !== undefined) {
    const bindings = parseNamedList(match[2]);
    if (bindings.length > 0) {
      const inner = bindings
        .map((b) => (b.imported === b.local ? b.local : `${b.imported}: ${b.local}`))
        .join(', ');
      lines.push(`const { ${inner} } = ${nsVar};`);
    }
  }
  return lines.join(' ');
}

/**
 * Resolves a module specifier relative to the importing module.
 *
 * @param {string} specifier - The specifier, e.g. './examples.js'.
 * @param {string} fromFile - Absolute path of the importing module.
 * @returns {string} Absolute path of the imported module.
 */
function resolveSpecifier(specifier, fromFile) {
  if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
    throw new Error(`${fromFile}: only relative imports are supported, got "${specifier}"`);
  }
  return path.resolve(path.dirname(fromFile), specifier);
}

/** Keywords after which a `/` starts a regular expression, not a division. */
const REGEX_AFTER_KEYWORDS = new Set([
  'return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw',
  'case', 'do', 'else', 'yield', 'await',
]);

/**
 * Lexically scans JavaScript source and returns a same-length copy in which
 * the contents of comments, string literals, template literals (including
 * their `${}` substitutions) and regular-expression literals are replaced by
 * spaces. Newlines and string/template delimiters are kept, so offsets and
 * line starts in the masked text match the original exactly. Module-syntax
 * regexes run on the masked text, so text inside comments or literals can
 * never be mistaken for an import/export statement.
 *
 * A `/` is read as a regex literal when the previous significant token is not
 * a value (identifier, number, literal, `)` or `]`), or is a keyword such as
 * `return` — the usual heuristic, good enough for this project's own code.
 *
 * @param {string} src - JavaScript source.
 * @returns {string} The masked source.
 */
export function maskSource(src) {
  const out = src.split('');
  const n = src.length;

  /**
   * Blanks out[from, to) except newlines.
   *
   * @param {number} from - First index to blank.
   * @param {number} to - Index after the last one.
   * @returns {void}
   */
  function blank(from, to) {
    for (let k = from; k < to && k < n; k += 1) {
      if (src[k] !== '\n' && src[k] !== '\r') {
        out[k] = ' ';
      }
    }
  }

  /**
   * Returns the index just after a '...' or "..." literal starting at i.
   *
   * @param {number} i - Index of the opening quote.
   * @returns {number} Index after the closing quote (or the line end if unterminated).
   */
  function skipString(i) {
    const quote = src[i];
    let k = i + 1;
    while (k < n && src[k] !== quote && src[k] !== '\n') {
      k += src[k] === '\\' ? 2 : 1;
    }
    return Math.min(k + 1, n);
  }

  /**
   * Returns the index just after a template literal starting at i.
   *
   * @param {number} i - Index of the opening backtick.
   * @returns {number} Index after the closing backtick.
   */
  function skipTemplate(i) {
    let k = i + 1;
    while (k < n) {
      if (src[k] === '\\') {
        k += 2;
      } else if (src[k] === '`') {
        return k + 1;
      } else if (src[k] === '$' && src[k + 1] === '{') {
        k = scanCode(k + 2, true);
      } else {
        k += 1;
      }
    }
    return n;
  }

  /**
   * Returns the index just after a regex literal starting at i, or -1 if the
   * slash does not open a valid single-line regex.
   *
   * @param {number} i - Index of the opening slash.
   * @returns {number} Index after the flags, or -1.
   */
  function skipRegex(i) {
    let k = i + 1;
    let inClass = false;
    while (k < n && src[k] !== '\n') {
      const c = src[k];
      if (c === '\\') {
        k += 2;
        continue;
      }
      if (c === '[') {
        inClass = true;
      } else if (c === ']') {
        inClass = false;
      } else if (c === '/' && !inClass) {
        k += 1;
        while (k < n && /[a-z]/i.test(src[k])) {
          k += 1;
        }
        return k;
      }
      k += 1;
    }
    return -1;
  } // End of function skipRegex()

  /**
   * Scans code from i, masking comments and literals. With stopAtBrace, stops
   * after the `}` that closes a template substitution.
   *
   * @param {number} start - Index to start at.
   * @param {boolean} stopAtBrace - Whether this is a `${...}` substitution.
   * @returns {number} Index where scanning stopped.
   */
  function scanCode(start, stopAtBrace) {
    let i = start;
    let depth = 0;
    let last = ''; // previous significant token: '' | 'value' | punctuator | keyword
    while (i < n) {
      const c = src[i];
      const next = src[i + 1];
      if (c === '/' && next === '/') {
        const end = src.indexOf('\n', i);
        const stop = end < 0 ? n : end;
        blank(i, stop);
        i = stop;
      } else if (c === '/' && next === '*') {
        const end = src.indexOf('*/', i + 2);
        const stop = end < 0 ? n : end + 2;
        blank(i, stop);
        i = stop;
      } else if (c === '"' || c === "'") {
        const stop = skipString(i);
        blank(i + 1, stop - 1);
        i = stop;
        last = 'value';
      } else if (c === '`') {
        const stop = skipTemplate(i);
        blank(i + 1, stop - 1);
        i = stop;
        last = 'value';
      } else if (c === '/') {
        const regexAllowed = last === '' || REGEX_AFTER_KEYWORDS.has(last) || (last.length === 1 && !')]'.includes(last));
        const stop = regexAllowed ? skipRegex(i) : -1;
        if (stop > 0) {
          blank(i + 1, stop);
          i = stop;
          last = 'value';
        } else {
          i += 1;
          last = '/';
        }
      } else if (/[\w$]/.test(c)) {
        let k = i + 1;
        while (k < n && /[\w$]/.test(src[k])) {
          k += 1;
        }
        const word = src.slice(i, k);
        last = REGEX_AFTER_KEYWORDS.has(word) ? word : 'value';
        i = k;
      } else if (/\s/.test(c)) {
        i += 1;
      } else {
        if (stopAtBrace && c === '{') {
          depth += 1;
        } else if (stopAtBrace && c === '}') {
          if (depth === 0) {
            return i + 1;
          }
          depth -= 1;
        }
        last = c;
        i += 1;
      }
    } // End of the loop over source characters
    return i;
  } // End of function scanCode()

  scanCode(0, false);
  return out.join('');
} // End of function maskSource()

/**
 * Tells whether a `const`/`let`/`var` declaration starting at `from` in the
 * masked source declares more than one binding (a comma at nesting depth 0
 * before the statement ends).
 *
 * @param {string} masked - Masked source (see maskSource()).
 * @param {number} from - Index just after the declared name.
 * @returns {boolean} True for `export const a = 1, b = 2;`.
 */
function hasMultipleDeclarators(masked, from) {
  let depth = 0;
  for (let k = from; k < masked.length; k += 1) {
    const c = masked[k];
    if ('([{'.includes(c)) {
      depth += 1;
    } else if (')]}'.includes(c)) {
      if (depth === 0) {
        return false;
      }
      depth -= 1;
    } else if (depth === 0 && c === ',') {
      return true;
    } else if (depth === 0 && c === ';') {
      return false;
    } else if (depth === 0 && c === '\n') {
      // A newline ends the statement unless the line clearly continues.
      const before = masked.slice(from, k).trimEnd().slice(-1);
      const after = masked.slice(k).trimStart()[0] ?? '';
      if (!'=+-*/%&|^?:<>,.('.includes(before || '=') && !',.?:+-*/%&|^'.includes(after || ';')) {
        return false;
      }
    }
  } // End of the loop over the declaration's characters
  return false;
} // End of function hasMultipleDeclarators()

/**
 * Rewrites one ES module's source into the body of a factory function and
 * lists its dependencies. Module declarations are located in the masked
 * source (see maskSource()), so comments and literals are left byte-for-byte
 * intact; only top-level import/export syntax is rewritten.
 *
 * @param {string} source - The module source.
 * @param {string} file - Absolute path of the module (for resolution and errors).
 * @param {(file: string) => string} idOf - Maps an absolute path to a module id.
 * @returns {{body: string, deps: string[]}} Factory body and dependency paths.
 */
export function transformModule(source, file, idOf) {
  const masked = maskSource(source);
  if (/\bimport\s*\(/.test(masked) || /\bimport\s*\.\s*meta\b/.test(masked)) {
    throw new Error(`${file}: dynamic import() and import.meta are not supported by the bundler`);
  }
  const depRefs = []; // { pos, target }
  const edits = []; // { start, end, text }
  const exportGetters = [];
  const starExports = [];
  let counter = 0;

  /**
   * Registers a dependency and returns the expression that yields its namespace.
   *
   * @param {number} pos - Offset of the statement (keeps source order).
   * @param {string} specifier - The module specifier.
   * @returns {string} JavaScript expression for the namespace object.
   */
  function depNamespace(pos, specifier) {
    const target = resolveSpecifier(specifier, file);
    depRefs.push({ pos, target });
    return `__import(${JSON.stringify(idOf(target))})`;
  }

  /**
   * Tells whether a range overlaps an edit already recorded.
   *
   * @param {number} start - Range start.
   * @param {number} end - Range end.
   * @returns {boolean} True on overlap.
   */
  function overlaps(start, end) {
    return edits.some((e) => start < e.end && end > e.start);
  }

  /**
   * Applies `handler` to every match of `pattern` in the masked source that
   * does not overlap an earlier edit. Group texts come from the masked source
   * (comments stripped) except where the handler reads `original(match, g)`.
   *
   * @param {RegExp} pattern - A global, multiline pattern with the `d` flag.
   * @param {(m: RegExpExecArray) => string} handler - Returns the replacement.
   * @returns {void}
   */
  function rewrite(pattern, handler) {
    for (const m of masked.matchAll(pattern)) {
      const start = m.index;
      const end = start + m[0].length;
      if (!overlaps(start, end)) {
        edits.push({ start, end, text: handler(m) });
      }
    }
  }

  /**
   * Reads a capture group from the ORIGINAL source (string literal contents
   * are blank in the masked copy).
   *
   * @param {RegExpExecArray} m - A match made with the `d` flag.
   * @param {number} group - Group number.
   * @returns {string} The original text of the group.
   */
  function original(m, group) {
    const [from, to] = m.indices[group];
    return source.slice(from, to);
  }

  const SPEC = `(['"])([^'"\\n]*)`;
  // import '<spec>';  (side effects only)
  rewrite(new RegExp(`^[ \\t]*import\\s*${SPEC}\\1[ \\t]*;?`, 'dgm'), (m) => {
    depNamespace(m.index, original(m, 2));
    return '';
  });
  // import <clause> from '<spec>';
  rewrite(new RegExp(`^[ \\t]*import\\s+([^'";]*?)\\s+from\\s*${SPEC}\\2[ \\t]*;?`, 'dgm'), (m) => {
    counter += 1;
    const nsVar = `__ns${counter}`;
    return `const ${nsVar} = ${depNamespace(m.index, original(m, 3))}; ${importClauseToCode(m[1], nsVar)}`;
  });
  // export * from '<spec>';
  rewrite(new RegExp(`^[ \\t]*export\\s*\\*\\s*from\\s*${SPEC}\\1[ \\t]*;?`, 'dgm'), (m) => {
    starExports.push(depNamespace(m.index, original(m, 2)));
    return '';
  });
  // export { a, b as c } from '<spec>';
  rewrite(new RegExp(`^[ \\t]*export\\s*\\{([^}]*)\\}\\s*from\\s*${SPEC}\\2[ \\t]*;?`, 'dgm'), (m) => {
    const ns = depNamespace(m.index, original(m, 3));
    for (const b of parseNamedList(m[1])) {
      exportGetters.push({ name: b.local, expr: `${ns}[${JSON.stringify(b.imported)}]` });
    }
    return '';
  });
  // export { a, b as c };
  rewrite(/^[ \t]*export\s*\{([^}]*)\}(?!\s*from\b)[ \t]*;?/dgm, (m) => {
    for (const b of parseNamedList(m[1])) {
      exportGetters.push({ name: b.local, expr: b.imported });
    }
    return '';
  });
  // export default function name / class name  → keep the declaration
  rewrite(
    new RegExp(`^([ \\t]*)export\\s+default\\s+(?=(?:async\\s+)?function\\s*\\*?\\s*(${IDENT})|class\\s+(${IDENT}))`, 'dgm'),
    (m) => {
      exportGetters.push({ name: 'default', expr: m[2] ?? m[3] });
      return m[1];
    },
  );
  // export default <expression>
  rewrite(/^([ \t]*)export\s+default\s+/dgm, (m) => {
    exportGetters.push({ name: 'default', expr: '__default' });
    return `${m[1]}const __default = `;
  });
  // export function / class / const / let / var  → keep the declaration
  rewrite(
    new RegExp(`^([ \\t]*)export\\s+(?=((?:async\\s+)?function\\s*\\*?\\s*|class\\s+|(?:const|let|var)\\s+)(\\S*))`, 'dgm'),
    (m) => {
      const ident = new RegExp(`^${IDENT}`).exec(m[3]);
      if (!ident) {
        throw new Error(`${file}: destructuring exports are not supported ("${source.slice(m.index).split('\n')[0].trim()}")`);
      }
      if (/^(?:const|let|var)\s/.test(m[2]) && hasMultipleDeclarators(masked, m.indices[3][0] + ident[0].length)) {
        throw new Error(
          `${file}: exports declaring several bindings are not supported ("${source.slice(m.index).split('\n')[0].trim()}"); use one export per declaration`,
        );
      }
      exportGetters.push({ name: ident[0], expr: ident[0] });
      return m[1];
    },
  );

  // Anything left that still looks like module syntax is unsupported.
  for (const m of masked.matchAll(/^[ \t]*(?:import|export)\b(?!\s*[.(])/gm)) {
    if (!overlaps(m.index, m.index + m[0].length)) {
      throw new Error(`${file}: unsupported module syntax: ${source.slice(m.index).split('\n')[0].trim()}`);
    }
  }

  let body = source;
  for (const e of [...edits].sort((a, b) => b.start - a.start)) {
    body = body.slice(0, e.start) + e.text + body.slice(e.end);
  }

  // Explicit exports are installed first so they win over `export *` (ESM
  // semantics); __reexportAll skips names already present.
  const header = [
    ...exportGetters.map(
      (g) => `Object.defineProperty(__exports, ${JSON.stringify(g.name)}, { enumerable: true, get: () => ${g.expr} });`,
    ),
    ...starExports.map((ns) => `__reexportAll(__exports, ${ns});`),
  ].join('\n');
  const deps = depRefs.sort((a, b) => a.pos - b.pos).map((d) => d.target);
  return { body: `${header}\n${body}`, deps };
} // End of function transformModule()

/**
 * Bundles an ES module graph into a single classic script. Modules run in
 * dependency order, and the whole bundle waits for DOMContentLoaded (like a
 * native module script, which is deferred).
 *
 * @param {string} entryFile - Absolute path of the entry module.
 * @param {string} [root] - Directory used to compute readable module ids.
 * @returns {Promise<string>} The classic-script source.
 */
export async function bundleModules(entryFile, root = ROOT) {
  const ordered = [];
  const state = new Map(); // file -> 'visiting' | 'done'

  /**
   * Maps an absolute path to a stable, root-relative module id.
   *
   * @param {string} file - Absolute module path.
   * @returns {string} The module id.
   */
  function idOf(file) {
    return path.relative(root, file).split(path.sep).join('/');
  }

  /**
   * Depth-first visit that appends modules after their dependencies.
   *
   * @param {string} file - Absolute module path.
   * @param {string[]} stack - Current import chain, for cycle messages.
   * @returns {Promise<void>}
   */
  async function visit(file, stack) {
    if (state.get(file) === 'done') {
      return;
    }
    if (state.get(file) === 'visiting') {
      const chain = [...stack, file].map(idOf).join(' -> ');
      throw new Error(`Circular import is not supported: ${chain}`);
    }
    state.set(file, 'visiting');
    const source = await readFile(file, 'utf8');
    const { body, deps } = transformModule(source, file, idOf);
    for (const dep of deps) {
      await visit(dep, [...stack, file]);
    }
    state.set(file, 'done');
    ordered.push({ id: idOf(file), body });
  } // End of function visit()

  await visit(path.resolve(entryFile), []);

  const modules = ordered
    .map(
      (m) =>
        `// ---- ${m.id} ----\n__define(${JSON.stringify(m.id)}, function (__exports, __import) {\n'use strict';\n${m.body}\n});`,
    )
    .join('\n\n');

  return `(function () {
'use strict';
const __registry = new Map();
/**
 * Runs a module factory and records its namespace object.
 *
 * @param {string} id - Module id.
 * @param {Function} factory - Module body.
 * @returns {void}
 */
function __define(id, factory) {
  const ns = Object.create(null);
  __registry.set(id, ns);
  factory(ns, __import);
}
/**
 * Returns the namespace of an already evaluated module.
 *
 * @param {string} id - Module id.
 * @returns {object} The module namespace.
 */
function __import(id) {
  if (!__registry.has(id)) {
    throw new Error('Bundled module not loaded: ' + id);
  }
  return __registry.get(id);
}
/**
 * Implements \`export * from\`: forwards every non-default export.
 *
 * @param {object} target - Namespace receiving the exports.
 * @param {object} source - Namespace providing them.
 * @returns {void}
 */
function __reexportAll(target, source) {
  for (const key of Object.keys(source)) {
    if (key !== 'default' && !(key in target)) {
      Object.defineProperty(target, key, { enumerable: true, get: () => source[key] });
    }
  }
}
/**
 * Evaluates every bundled module in dependency order.
 *
 * @returns {void}
 */
function __run() {
${modules}
}
if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', __run, { once: true });
} else {
  __run();
}
})();
`;
} // End of function bundleModules()

/**
 * Produces the self-contained HTML: stylesheets become `<style>` blocks and
 * scripts (module graphs or classic files) become inline classic scripts.
 * Fails if any local `src`/`href` is left.
 *
 * @param {object} [options] - Build options.
 * @param {string} [options.root] - Project root.
 * @param {string} [options.htmlFile] - HTML entry, relative to the root.
 * @returns {Promise<string>} The built HTML.
 */
export async function buildHtml({ root = ROOT, htmlFile = 'index.html' } = {}) {
  const htmlPath = path.resolve(root, htmlFile);
  const baseDir = path.dirname(htmlPath);
  let html = await readFile(htmlPath, 'utf8');

  // Stylesheets. Collect replacements first: String.replace cannot await.
  const linkTags = html.match(/<link\b[^>]*>/gi) ?? [];
  for (const tag of linkTags) {
    const rel = (getAttr(tag, 'rel') ?? '').toLowerCase().split(/\s+/);
    const href = getAttr(tag, 'href');
    if (!rel.includes('stylesheet') || href === null || !isLocalUrl(href)) {
      continue;
    }
    const css = await readFile(resolveLocal(href, baseDir, root), 'utf8');
    if (/@import\b/.test(css)) {
      throw new Error(`${href}: CSS @import is not supported by the build`);
    }
    html = html.replace(tag, () => `<style>\n${escapeForTag(css, 'style')}</style>`);
  }

  // Scripts with a local src.
  const scriptTags = html.match(/<script\b[^>]*\bsrc\s*=[^>]*>\s*<\/script>/gi) ?? [];
  for (const tag of scriptTags) {
    const src = getAttr(tag, 'src');
    if (src === null || !isLocalUrl(src)) {
      continue;
    }
    const file = resolveLocal(src, baseDir, root);
    const isModule = (getAttr(tag, 'type') ?? '').toLowerCase() === 'module';
    const code = isModule ? await bundleModules(file, root) : await readFile(file, 'utf8');
    html = html.replace(tag, () => `<script>\n${escapeForTag(code, 'script')}</script>`);
  }

  const leftovers = findLocalReferences(html);
  if (leftovers.length > 0) {
    throw new Error(`Build left local references: ${leftovers.join(', ')}`);
  }
  return html;
} // End of function buildHtml()

/**
 * Lists every `src=`/`href=` attribute value in HTML that points to a local file.
 *
 * @param {string} html - The HTML text.
 * @returns {string[]} The offending attribute values.
 */
export function findLocalReferences(html) {
  const found = [];
  const attrRe = /<[a-z][^>]*?\s(?:src|href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  for (const match of html.matchAll(attrRe)) {
    const value = match[1] ?? match[2] ?? match[3];
    if (isLocalUrl(value)) {
      found.push(value);
    }
  }
  return found;
}

/**
 * Builds the project and writes dist/index.html.
 *
 * @param {object} [options] - Build options.
 * @param {string} [options.root] - Project root.
 * @param {string} [options.outFile] - Output path, relative to the root.
 * @returns {Promise<string>} Absolute path of the written file.
 */
export async function writeBuild({ root = ROOT, outFile = 'dist/index.html' } = {}) {
  const html = await buildHtml({ root });
  const outPath = path.resolve(root, outFile);
  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(outPath, html, 'utf8');
  return outPath;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const outPath = await writeBuild();
  console.log(`Built ${path.relative(ROOT, outPath)}`);
}
