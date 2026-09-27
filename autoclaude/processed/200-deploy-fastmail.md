# Deployment to Fastmail Files: `npm run deploy` + docs

The user hosts the app as a static site from Fastmail Files. It was first
published by hand (2026-09-27): the single-file build uploaded over WebDAV to
`https://myfiles.fastmail.com/OrganicWeb/index.html` (HTTP 201). Make this a
documented, repeatable deployment step.

Wanted:
- `scripts/deploy.mjs` + `"deploy"` npm script: runs the build (reuse
  `writeBuild()` from scripts/build.mjs), then PUTs `dist/index.html` to
  `https://myfiles.fastmail.com/OrganicWeb/index.html` with
  `Content-Type: text/html; charset=utf-8`, and reports the HTTP status and
  size. Fail loudly on any non-2xx.
- Credentials: WebDAV username `carlos@carpio.cc`; the password is a
  Fastmail app password (Files-only) stored in the macOS Keychain, read at
  run time with
  `security find-generic-password -s fastmail-webdav -a carlos@carpio.cc -w`.
  Never write it to disk, logs, argv of child processes visible in `ps`,
  the repo, or test fixtures (e.g. pass it to curl through `-K -` on stdin,
  or use Node's fetch with an Authorization header built in memory).
  Allow overriding user/URL/Keychain service via env vars
  (`FASTMAIL_USER`, `FASTMAIL_WEBDAV_URL`, `FASTMAIL_KEYCHAIN_SERVICE`).
- Run `npm test`, `npm run check` and the build before uploading (or a
  `--skip-checks` flag); refuse to deploy from a dirty tree unless `--force`.
- A `--dry-run` flag that does everything except the PUT.
- Unit tests for the argument/env handling with the network and Keychain
  mocked — tests must never contact Fastmail or read the Keychain.
- The autoclaude loop must NOT run the real deploy itself; deploying stays a
  manual user step.
- Document in README (a "Despliegue"/Deployment section, in English) and
  design.md: prerequisites (app password in Keychain, the command above),
  `npm run deploy`, and that making the folder a public website is a one-time
  setting in Fastmail's web UI.
