/**
 * @file Playwright configuration: Chromium only, two projects running the
 * same specs.
 *
 * - `source`: the development page, served from the repository root by the
 *   zero-dependency static server (scripts/serve.mjs).
 * - `dist`: the single-file build `dist/index.html`, opened through a
 *   `file://` URL. The global set-up (tests/e2e/global-setup.js) rebuilds it
 *   before the run.
 *
 * Specs open the app with `page.goto('index.html')` (a relative URL), which
 * resolves against either base URL. `dist.spec.js` checks the built file
 * only. Run one project with `npm run e2e -- --project=dist` (or
 * `npm run e2e:dist` / `npm run e2e:source`).
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PORT = 4173;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST_URL = pathToFileURL(path.join(ROOT, 'dist') + path.sep).href;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.js',
  globalSetup: './tests/e2e/global-setup.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'line' : 'list',
  projects: [
    {
      name: 'source',
      testIgnore: '**/dist.spec.js',
      use: { ...devices['Desktop Chrome'], baseURL: `http://127.0.0.1:${PORT}/` },
    },
    {
      name: 'dist',
      use: { ...devices['Desktop Chrome'], baseURL: DIST_URL },
    },
  ],
  webServer: {
    command: `node scripts/serve.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
