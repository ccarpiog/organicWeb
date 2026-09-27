/**
 * @file Deployment (`npm run deploy`): builds dist/index.html and uploads it to
 * Fastmail Files over WebDAV with one HTTP PUT. Zero dependencies.
 *
 * Flow: refuse a dirty git tree (unless `--force`) → `npm test` and
 * `npm run check` (unless `--skip-checks`) → writeBuild() → read the password
 * from the macOS Keychain → PUT the file → report status and size. Any
 * failure, including a non-2xx response, exits with a non-zero status.
 *
 * `--dry-run` does everything except the Keychain read and the PUT, so it never
 * needs credentials and never touches the network.
 *
 * The password is read with `security find-generic-password ... -w` (it is
 * the child's stdout, never part of any argv), kept in memory only, turned into
 * a Basic Authorization header, and never logged or written anywhere.
 *
 * Environment overrides: FASTMAIL_USER, FASTMAIL_WEBDAV_URL,
 * FASTMAIL_KEYCHAIN_SERVICE (see DEFAULTS).
 *
 * The logic is exported as injectable functions (tests/unit/deploy.test.js);
 * main() only runs when this file is executed directly.
 */

import { execFile, spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeBuild, ROOT } from './build.mjs';

/** Default deployment target and credentials location. */
export const DEFAULTS = Object.freeze({
  user: 'carlos@carpio.cc',
  url: 'https://myfiles.fastmail.com/OrganicWeb/index.html',
  keychainService: 'fastmail-webdav',
});

/** Help text printed by `--help` and on a usage error. */
export const USAGE = `Usage: npm run deploy -- [options]

Builds dist/index.html and uploads it to Fastmail Files over WebDAV.

Options:
  --dry-run      do everything except reading the Keychain and uploading
  --skip-checks  do not run "npm test" and "npm run check" first
  --force        deploy even if the git working tree has uncommitted changes
  -h, --help     show this help

Environment overrides:
  FASTMAIL_USER              WebDAV user          (default ${DEFAULTS.user})
  FASTMAIL_WEBDAV_URL        destination file URL (default ${DEFAULTS.url})
  FASTMAIL_KEYCHAIN_SERVICE  Keychain service     (default ${DEFAULTS.keychainService})`;

/** Error raised for invalid command-line arguments (main() prints USAGE). */
export class UsageError extends Error {}

/**
 * Parses the command-line flags.
 *
 * @param {string[]} argv - Arguments after the script name.
 * @returns {{dryRun: boolean, force: boolean, skipChecks: boolean, help: boolean}} The options.
 * @throws {UsageError} On an unknown argument.
 */
export function parseArgs(argv) {
  const options = { dryRun: false, force: false, skipChecks: false, help: false };
  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    } else if (arg === '--skip-checks') {
      options.skipChecks = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else {
      throw new UsageError(`Unknown argument: ${arg}`);
    }
  }
  return options;
} // End of function parseArgs()

/**
 * Builds the deployment configuration from the environment, falling back to
 * DEFAULTS for unset or empty variables.
 *
 * @param {Record<string, string|undefined>} env - Usually process.env.
 * @returns {{user: string, url: string, keychainService: string}} The configuration.
 */
export function configFromEnv(env) {
  return {
    user: env.FASTMAIL_USER || DEFAULTS.user,
    url: env.FASTMAIL_WEBDAV_URL || DEFAULTS.url,
    keychainService: env.FASTMAIL_KEYCHAIN_SERVICE || DEFAULTS.keychainService,
  };
}

/**
 * Builds an HTTP Basic Authorization header value in memory.
 *
 * @param {string} user - User name.
 * @param {string} password - Password.
 * @returns {string} `Basic <base64(user:password)>`.
 */
export function buildAuthHeader(user, password) {
  return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;
}

/**
 * Runs a command. With `capture`, its stdout is collected and returned; stderr
 * is inherited. Without it, all output goes straight to the terminal.
 *
 * @param {string} command - Executable name.
 * @param {string[]} args - Arguments.
 * @param {{capture?: boolean, cwd?: string}} [options] - Options.
 * @returns {Promise<{status: number, stdout: string}>} Exit status and captured stdout.
 */
export function runCommand(command, args, { capture = false, cwd = ROOT } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', capture ? 'pipe' : 'inherit', 'inherit'] });
    let stdout = '';
    if (capture) {
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (chunk) => {
        stdout += chunk;
      });
    }
    child.on('error', reject);
    child.on('close', (status) => resolve({ status: status ?? 1, stdout }));
  });
} // End of function runCommand()

/**
 * Reads a generic password from the macOS Keychain. The password comes back
 * on the child's stdout; it never appears in any argv.
 *
 * @param {{service: string, account: string}} query - Keychain service and account.
 * @returns {Promise<string>} The password, without the trailing newline.
 */
export function readKeychainPassword({ service, account }) {
  return new Promise((resolve, reject) => {
    execFile('security', ['find-generic-password', '-s', service, '-a', account, '-w'], (error, stdout) => {
      if (error) {
        reject(new Error(`Could not read the password from the Keychain (service "${service}", account "${account}").`));
        return;
      }
      resolve(stdout.replace(/\r?\n$/, ''));
    });
  });
} // End of function readKeychainPassword()

/**
 * Formats a byte count for the report.
 *
 * @param {number} bytes - Size in bytes.
 * @returns {string} E.g. `123456 bytes (120.6 KiB)`.
 */
export function formatSize(bytes) {
  return `${bytes} bytes (${(bytes / 1024).toFixed(1)} KiB)`;
}

/**
 * Runs the whole deployment with injected side effects.
 *
 * @param {object} params - Parameters.
 * @param {{dryRun: boolean, force: boolean, skipChecks: boolean}} params.options - Parsed flags.
 * @param {{user: string, url: string, keychainService: string}} params.config - Target configuration.
 * @param {object} params.deps - Side effects.
 * @param {typeof runCommand} params.deps.runCommand - Runs a command.
 * @param {typeof readKeychainPassword} params.deps.readPassword - Reads the password.
 * @param {typeof fetch} params.deps.fetch - HTTP client.
 * @param {() => Promise<string>} params.deps.build - Builds and returns the output path.
 * @param {(file: string) => Promise<Buffer>} params.deps.readFile - Reads the built file.
 * @param {(message: string) => void} params.deps.log - Progress output.
 * @returns {Promise<{uploaded: boolean, status: number|null, bytes: number}>} The outcome.
 * @throws {Error} On a non-https URL, a dirty tree, a failed check, or a
 *   non-2xx response (redirects are not followed, so a 3xx fails too).
 */
export async function deploy({ options, config, deps }) {
  const { log } = deps;

  // The Basic credential is only ever sent over TLS; checked before any side effect.
  let target;
  try {
    target = new URL(config.url);
  } catch {
    throw new Error(`Invalid upload URL "${config.url}".`);
  }
  if (target.protocol !== 'https:') {
    throw new Error(`The upload URL must use https:// (got "${config.url}").`);
  }

  const git = await deps.runCommand('git', ['status', '--porcelain'], { capture: true });
  if (git.status !== 0) {
    throw new Error('"git status --porcelain" failed; is this a git repository?');
  }
  if (git.stdout.trim() !== '') {
    if (!options.force) {
      throw new Error('The git working tree has uncommitted changes. Commit them first, or pass --force.');
    }
    log('Warning: the git working tree is dirty; deploying anyway (--force).');
  }

  if (options.skipChecks) {
    log('Skipping "npm test" and "npm run check" (--skip-checks).');
  } else {
    for (const args of [['test'], ['run', 'check']]) {
      log(`Running npm ${args.join(' ')}…`);
      const result = await deps.runCommand('npm', args);
      if (result.status !== 0) {
        throw new Error(`"npm ${args.join(' ')}" failed (exit status ${result.status}).`);
      }
    }
  }

  const outPath = await deps.build();
  const body = await deps.readFile(outPath);
  log(`Built ${path.relative(ROOT, outPath) || outPath}: ${formatSize(body.byteLength)}.`);

  if (options.dryRun) {
    log(`Dry run: would PUT it to ${config.url} as ${config.user}. Nothing uploaded.`);
    return { uploaded: false, status: null, bytes: body.byteLength };
  }

  const password = await deps.readPassword({ service: config.keychainService, account: config.user });
  if (!password) {
    throw new Error(`Empty password in the Keychain (service "${config.keychainService}").`);
  }
  log(`Uploading to ${config.url} as ${config.user}…`);
  const response = await deps.fetch(config.url, {
    method: 'PUT',
    headers: {
      Authorization: buildAuthHeader(config.user, password),
      'Content-Type': 'text/html; charset=utf-8',
    },
    body,
    // A redirect must fail the upload, not turn into a successful GET elsewhere.
    redirect: 'manual',
  });
  if (!response.ok) {
    throw new Error(`Upload failed: HTTP ${response.status} ${response.statusText || ''}`.trim());
  }
  log(`Uploaded: HTTP ${response.status} ${response.statusText || ''}`.trim() + `, ${formatSize(body.byteLength)}.`);
  return { uploaded: true, status: response.status, bytes: body.byteLength };
} // End of function deploy()

/**
 * Command-line entry point: parses flags, runs deploy() with the real side
 * effects and sets the exit status.
 *
 * @param {string[]} argv - Arguments after the script name.
 * @returns {Promise<number>} Exit status (0 success, 1 failure, 2 usage error).
 */
export async function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`${error.message}\n\n${USAGE}`);
    return 2;
  }
  if (options.help) {
    console.log(USAGE);
    return 0;
  }
  try {
    await deploy({
      options,
      config: configFromEnv(process.env),
      deps: {
        runCommand,
        readPassword: readKeychainPassword,
        fetch: globalThis.fetch,
        build: () => writeBuild(),
        readFile: (file) => readFile(file),
        log: (message) => console.log(message),
      },
    });
    return 0;
  } catch (error) {
    console.error(`Deploy failed: ${error.message}`);
    return 1;
  }
} // End of function main()

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  process.exitCode = await main(process.argv.slice(2));
}
