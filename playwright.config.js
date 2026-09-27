/**
 * @file Playwright configuration: Chromium only, serving the repository root
 * with the zero-dependency static server (scripts/serve.mjs).
 */

import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '**/*.spec.js',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${PORT}/`,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `node scripts/serve.mjs --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}/index.html`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
