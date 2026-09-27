/**
 * @file Playwright global set-up: rebuilds `dist/index.html` once before the
 * run, so the `dist` project always tests the current sources.
 */

import { writeBuild } from '../../scripts/build.mjs';

/**
 * Writes the single-file build.
 *
 * @returns {Promise<void>}
 */
export default async function globalSetup() {
  await writeBuild();
}
