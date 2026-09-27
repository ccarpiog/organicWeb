/**
 * @file Tiny zero-dependency static file server for development and e2e tests.
 * Serves the repository root. Usage: `node scripts/serve.mjs [--port 8000]`
 * (or `npm run serve`); the PORT environment variable also works.
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.tsv': 'text/tab-separated-values; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

/**
 * Reads the port from `--port N`, the PORT variable, or defaults to 8000.
 *
 * @param {string[]} argv - Command-line arguments (without node and script).
 * @returns {number} The port number.
 */
function parsePort(argv) {
  const index = argv.indexOf('--port');
  const value = index >= 0 ? argv[index + 1] : process.env.PORT;
  const port = Number.parseInt(value ?? '8000', 10);
  return Number.isInteger(port) && port > 0 ? port : 8000;
}

/**
 * Maps a request URL to a file inside ROOT, or null if it escapes the root.
 *
 * @param {string} url - The request URL path.
 * @returns {string|null} Absolute file path, or null.
 */
function resolveRequest(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return null;
  }
  const file = path.resolve(ROOT, `.${pathname}`);
  return file === ROOT || file.startsWith(ROOT + path.sep) ? file : null;
}

/**
 * Handles one HTTP request by serving a static file (index.html for directories).
 *
 * @param {import('node:http').IncomingMessage} req - The request.
 * @param {import('node:http').ServerResponse} res - The response.
 * @returns {Promise<void>}
 */
async function handleRequest(req, res) {
  let file = resolveRequest(req.url ?? '/');
  if (file === null) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if ((await stat(file)).isDirectory()) {
      file = path.join(file, 'index.html');
    }
    const body = await readFile(file);
    const type = MIME_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Not found');
  }
} // End of function handleRequest()

const port = parsePort(process.argv.slice(2));
createServer(handleRequest).listen(port, '127.0.0.1', () => {
  console.log(`Serving ${ROOT} at http://127.0.0.1:${port}/`);
});
