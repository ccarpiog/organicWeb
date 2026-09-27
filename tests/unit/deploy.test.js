/**
 * @file Unit tests for scripts/deploy.mjs. Every side effect (git, npm, the
 * build, the Keychain and the network) is injected as a fake: these tests
 * never contact Fastmail, never read the Keychain and never spawn a process.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULTS,
  UsageError,
  buildAuthHeader,
  configFromEnv,
  deploy,
  main,
  parseArgs,
} from '../../scripts/deploy.mjs';

const SECRET = 'fake-app-password-9f3k';
const BODY = Buffer.from('<!doctype html><title>t</title>', 'utf8');
const NO_FLAGS = { dryRun: false, force: false, skipChecks: false };

/**
 * Creates a fake set of deploy() dependencies that records every call.
 *
 * @param {object} [overrides] - Behaviour tweaks.
 * @param {string} [overrides.gitStatus] - Output of `git status --porcelain`.
 * @param {Record<string, number>} [overrides.npmStatus] - Exit status per npm command line.
 * @param {number} [overrides.httpStatus] - Status returned by the fake fetch.
 * @returns {{deps: object, calls: object}} The dependencies and the call log.
 */
function makeDeps({ gitStatus = '', npmStatus = {}, httpStatus = 201 } = {}) {
  const calls = { commands: [], fetches: [], passwordReads: [], builds: 0, logs: [] };
  const deps = {
    runCommand: async (command, args) => {
      calls.commands.push([command, ...args].join(' '));
      if (command === 'git') {
        return { status: 0, stdout: gitStatus };
      }
      return { status: npmStatus[args.join(' ')] ?? 0, stdout: '' };
    },
    readPassword: async (query) => {
      calls.passwordReads.push(query);
      return SECRET;
    },
    fetch: async (url, init) => {
      calls.fetches.push({ url, init });
      return { ok: httpStatus >= 200 && httpStatus < 300, status: httpStatus, statusText: 'X' };
    },
    build: async () => {
      calls.builds += 1;
      return '/tmp/organicweb/dist/index.html';
    },
    readFile: async () => BODY,
    log: (message) => calls.logs.push(message),
  };
  return { deps, calls };
} // End of function makeDeps()

/**
 * Runs deploy() with the default configuration and fake dependencies,
 * capturing either the result or the thrown error.
 *
 * @param {object} options - Parsed flags.
 * @param {object} [fakeOptions] - Passed to makeDeps().
 * @returns {Promise<{result?: object, error?: Error, calls: object}>} Outcome and call log.
 */
async function run(options, fakeOptions) {
  const { deps, calls } = makeDeps(fakeOptions);
  try {
    const result = await deploy({ options: { ...NO_FLAGS, ...options }, config: configFromEnv({}), deps });
    return { result, calls };
  } catch (error) {
    return { error, calls };
  }
}

/**
 * Asserts that the secret password appears in no log line and no error message.
 *
 * @param {{error?: Error, calls: object}} outcome - Result of run().
 * @returns {void}
 */
function assertNoSecret(outcome) {
  const text = [...outcome.calls.logs, outcome.error?.message ?? ''].join('\n');
  assert.ok(!text.includes(SECRET), 'password leaked into the output');
  const encoded = Buffer.from(SECRET).toString('base64');
  assert.ok(!text.includes(encoded.slice(0, 8)), 'encoded password leaked into the output');
}

test('parseArgs: defaults, every flag, and unknown flags', () => {
  assert.deepEqual(parseArgs([]), { dryRun: false, force: false, skipChecks: false, help: false });
  assert.deepEqual(parseArgs(['--dry-run', '--force', '--skip-checks']), {
    dryRun: true, force: true, skipChecks: true, help: false,
  });
  assert.equal(parseArgs(['-h']).help, true);
  assert.equal(parseArgs(['--help']).help, true);
  assert.throws(() => parseArgs(['--dryrun']), UsageError);
  assert.throws(() => parseArgs(['extra']), /Unknown argument: extra/);
});

test('configFromEnv: defaults and overrides', () => {
  assert.deepEqual(configFromEnv({}), {
    user: 'carlos@carpio.cc',
    url: 'https://myfiles.fastmail.com/OrganicWeb/index.html',
    keychainService: 'fastmail-webdav',
  });
  assert.deepEqual(configFromEnv({
    FASTMAIL_USER: 'a@b.c',
    FASTMAIL_WEBDAV_URL: 'https://example.invalid/x.html',
    FASTMAIL_KEYCHAIN_SERVICE: 'svc',
  }), { user: 'a@b.c', url: 'https://example.invalid/x.html', keychainService: 'svc' });
  assert.equal(configFromEnv({ FASTMAIL_USER: '' }).user, DEFAULTS.user);
});

test('buildAuthHeader: Basic base64(user:password)', () => {
  assert.equal(buildAuthHeader('u', 'p'), `Basic ${Buffer.from('u:p').toString('base64')}`);
});

test('main: usage error exits 2 and --help exits 0, without side effects', async (t) => {
  const errors = [];
  const logs = [];
  t.mock.method(console, 'error', (message) => errors.push(message));
  t.mock.method(console, 'log', (message) => logs.push(message));
  assert.equal(await main(['--bogus']), 2);
  assert.match(errors.join('\n'), /Unknown argument: --bogus[\s\S]*Usage:/);
  assert.equal(await main(['--help']), 0);
  assert.match(logs.join('\n'), /Usage:/);
});

test('deploy: a dirty tree is refused before anything else runs', async () => {
  const outcome = await run({}, { gitStatus: ' M src/a.js\n' });
  assert.match(outcome.error.message, /uncommitted changes.*--force/);
  assert.deepEqual(outcome.calls.commands, ['git status --porcelain']);
  assert.equal(outcome.calls.builds, 0);
  assert.equal(outcome.calls.passwordReads.length, 0);
  assert.equal(outcome.calls.fetches.length, 0);
});

test('deploy: --force deploys a dirty tree with a warning', async () => {
  const outcome = await run({ force: true }, { gitStatus: '?? new.txt\n' });
  assert.equal(outcome.error, undefined);
  assert.equal(outcome.result.uploaded, true);
  assert.ok(outcome.calls.logs.some((line) => /dirty/.test(line)));
  assertNoSecret(outcome);
});

test('deploy: runs npm test and npm run check before building, and stops if one fails', async () => {
  const ok = await run({});
  assert.deepEqual(ok.calls.commands, ['git status --porcelain', 'npm test', 'npm run check']);
  const failed = await run({}, { npmStatus: { 'run check': 1 } });
  assert.match(failed.error.message, /npm run check.*failed/);
  assert.equal(failed.calls.builds, 0);
  assert.equal(failed.calls.fetches.length, 0);
});

test('deploy: --skip-checks skips npm test and npm run check', async () => {
  const outcome = await run({ skipChecks: true });
  assert.deepEqual(outcome.calls.commands, ['git status --porcelain']);
  assert.equal(outcome.calls.builds, 1);
  assert.equal(outcome.result.uploaded, true);
});

test('deploy: --dry-run builds but neither reads the Keychain nor uploads', async () => {
  const outcome = await run({ dryRun: true });
  assert.equal(outcome.calls.builds, 1);
  assert.equal(outcome.calls.passwordReads.length, 0);
  assert.equal(outcome.calls.fetches.length, 0);
  assert.deepEqual(outcome.result, { uploaded: false, status: null, bytes: BODY.byteLength });
  assert.ok(outcome.calls.logs.some((line) => /Dry run/.test(line)));
});

test('deploy: 2xx uploads with the right request and reports status and size', async () => {
  const outcome = await run({});
  assert.deepEqual(outcome.calls.passwordReads, [{ service: 'fastmail-webdav', account: 'carlos@carpio.cc' }]);
  assert.equal(outcome.calls.fetches.length, 1);
  const { url, init } = outcome.calls.fetches[0];
  assert.equal(url, DEFAULTS.url);
  assert.equal(init.method, 'PUT');
  assert.equal(init.headers['Content-Type'], 'text/html; charset=utf-8');
  assert.equal(init.headers.Authorization, buildAuthHeader('carlos@carpio.cc', SECRET));
  assert.equal(init.body, BODY);
  assert.deepEqual(outcome.result, { uploaded: true, status: 201, bytes: BODY.byteLength });
  const last = outcome.calls.logs.at(-1);
  assert.match(last, /HTTP 201/);
  assert.match(last, new RegExp(`${BODY.byteLength} bytes`));
  assertNoSecret(outcome);
});

test('deploy: a non-2xx response fails loudly without leaking the password', async () => {
  for (const httpStatus of [401, 403, 500]) {
    const outcome = await run({}, { httpStatus });
    assert.match(outcome.error.message, new RegExp(`HTTP ${httpStatus}`));
    assertNoSecret(outcome);
  }
});

test('deploy: a non-https upload URL is refused before any side effect', async () => {
  for (const url of ['http://myfiles.fastmail.com/OrganicWeb/index.html', 'not a url']) {
    const { deps, calls } = makeDeps();
    const config = configFromEnv({ FASTMAIL_WEBDAV_URL: url });
    await assert.rejects(deploy({ options: { ...NO_FLAGS, dryRun: false }, config, deps }), /https:\/\/|Invalid upload URL/);
    assert.deepEqual(calls.commands, []);
    assert.equal(calls.builds, 0);
    assert.equal(calls.passwordReads.length, 0);
    assert.equal(calls.fetches.length, 0);
  }
});

test('deploy: the PUT does not follow redirects, and a 3xx fails the upload', async () => {
  const ok = await run({});
  assert.equal(ok.calls.fetches[0].init.redirect, 'manual');
  const redirected = await run({}, { httpStatus: 303 });
  assert.match(redirected.error.message, /HTTP 303/);
  assert.equal(redirected.result, undefined);
});
