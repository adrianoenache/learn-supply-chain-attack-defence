# TODO

This file tracks the remaining work required for the project to reach a 10/10 quality score and an official release. No item here is optional — all must be completed before `v1.0.0` is tagged.

## Future Enhancements

### High Value

#### Security

- [ ] **Add typosquatting and dependency-confusion detection**
  Implement a new tool or extend `add-package.js` / `check-package-age.js` to:
  - Compute Levenshtein distance between new package names and the top-N most-downloaded npm packages.
  - Flag private/internal package names that suddenly appear on the public registry.
  - Document the detection in `docs/en/security/` and `docs/pt-BR/security/`.
  Files: [tools/add-package.js](tools/add-package.js), [tools/lib/package-utils.js](tools/lib/package-utils.js), [docs/en/security/what-is-supply-chain-attack.md](docs/en/security/what-is-supply-chain-attack.md)

- [ ] **Verify npm package provenance / SLSA attestations**
  Extend `add-package.js` or `check-package-age.js` to check whether a package version was published with `--provenance` and validate the attestation bundle when available. This closes the gap between signature verification and build-pipeline compromise.
  Files: [tools/add-package.js](tools/add-package.js), [tools/check-package-age.js](tools/check-package-age.js)

- [ ] **Close TOCTOU window between age check and install**
  After `npm install` in `add-package.js`, re-fetch the package's publish metadata and ensure the installed tarball matches the version that passed the age check. Consider pinning tarball integrity before install.
  Files: [tools/add-package.js](tools/add-package.js)

- [ ] **Add CI/CD pipeline (GitHub Actions)**
  Create `.github/workflows/ci.yml` that runs `npm test`, `npm run lint`, `npm run defence:check-md-links`, `npm run defence:license-check:fail`, and the pre-commit steps on every PR/push. This guarantees the gates are not bypassed locally.
  Files: new `.github/workflows/ci.yml`, [CONTRIBUTING.md](CONTRIBUTING.md)

- [ ] **Add secrets scanning and SBOM generation**
  - Integrate a lightweight secret scanner (e.g., `git-secrets` or a custom native script) into the pre-commit hook.
  - Add a script to generate an SBOM (CycloneDX/SPDX) from `package-lock.json` for auditability.
  Files: new tool under `tools/`, [.husky/pre-commit](.husky/pre-commit)

#### Performance

- [ ] **Implement persistent registry-response cache**
  Reuse the caching logic already present in `tools/e2e/helpers/registry-cache.js` in production code. Cache `registry.npmjs.org` responses with a configurable TTL so `check-package-age.js`, `check-updates.js`, and `add-package.js` avoid redundant network calls.
  Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js), new `tools/lib/registry-cache.js`

- [ ] **Optimize registry payload size**
  - Add `Accept-Encoding: gzip` to all `https.get` calls.
  - Evaluate switching to smaller registry endpoints or using the abbreviated packument where the `time` field is not required.
  - Replace string concatenation with `Buffer` accumulation for response bodies.
  Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js)

- [ ] **Add retry with exponential backoff and rate-limit handling**
  Handle `429 Too Many Requests`, `503 Service Unavailable`, and transient network errors with a bounded backoff. Respect `Retry-After` headers when present.
  Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js)

### Medium Value

#### Security

- [ ] **Add lockfile integrity self-check**
  Create a script that verifies every entry in `package-lock.json` has an `integrity` field and that the hash algorithm is SHA-512 or stronger. Fail if any entry is missing integrity.
  Files: new `tools/check-lockfile-integrity.js`

- [ ] **Validate install-defences file integrity**
  Compute SHA-256 checksums of all files copied by `install-defences.js` and verify them before copying, preventing propagation of tampered tooling.
  Files: [tools/install-defences.js](tools/install-defences.js)

- [ ] **Enforce git-hook integrity check**
  Add a pre-commit or setup-time verification that `.husky/pre-commit` matches a known hash, alerting developers if the hook was modified outside the normal workflow.
  Files: [tools/setup-bootstrap.js](tools/setup-bootstrap.js), [tools/check-sync.js](tools/check-sync.js)

- [ ] **Add package metadata risk scoring**
  Extend `check-updates.js` to fetch and display:
  - Deprecation status.
  - Maintainer count and recent changes.
  - Weekly download count relative to peer packages.
  - Number of versions published in the last 30 days.
  Incorporate these signals into the existing confidence score.
  Files: [tools/check-updates.js](tools/check-updates.js)

#### Performance

- [ ] **Reduce N+1 registry queries in update check**
  Investigate bulk/batch fetching strategies for `check-updates.js` to reduce the number of `https.get` calls (e.g., caching packuments across runs, parallelizing only up to the concurrency limit).
  Files: [tools/check-updates.js](tools/check-updates.js)

- [ ] **Optimize check-md-links with incremental cache**
  Cache the last-checked timestamp and result per file so repeated runs only re-check changed markdown files.
  Files: [tools/check-md-links.js](tools/check-md-links.js)

- [ ] **Add performance benchmarks and regression tests**
  Create a small benchmark suite that measures execution time and network call counts for `check-package-age.js` and `check-updates.js`, and fail CI on significant regression.
  Files: new `tools/perf/` directory

### Hardening & Documentation

- [ ] **Document rebuild procedure for lifecycle-script packages**
  Add a dedicated doc page explaining how to safely rebuild packages like `esbuild`, `sharp`, or `canvas` after overriding `ignore-scripts`. This is part of the defense-in-depth story because lifecycle scripts are a documented exception path.
  Files: `docs/en/security/rebuilding-lifecycle-packages.md`, `docs/pt-BR/security/rebuilding-lifecycle-packages.md`

- [ ] **Add optional sandbox wrapper for npm commands**
  Provide an experimental wrapper that runs `npm install`/`npm update` inside a restricted environment (e.g., Linux namespaces or `bubblewrap`) to limit blast radius of any malicious lifecycle script that bypasses `ignore-scripts`.
  Files: new `tools/sandboxed-install.sh`

- [ ] **Comprehensive documentation review before official release**
  Perform a full bilingual documentation review:
  - Synchronize `docs/en/` and `docs/pt-BR/`.
  - Update `docs/en/tools.md`, `docs/en/architecture.md` and equivalents with all new tools and scripts.
  - Refresh `README.md` with new scripts, badges, and setup instructions.
  - Verify all internal links with `npm run defence:check-md-links`.
  - Review `SECURITY.md`, `CONTRIBUTING.md`, and `CHANGELOG.md` for accuracy and completeness.
  Files: `docs/en/`, `docs/pt-BR/`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`

## Completed

- [x] **End-to-end tests against the real npm registry**
  Added `tools/e2e/` with an opt-in E2E suite that validates `check-package-age.js` and `add-package.js` against stable npm packages (`lodash@4.17.21`, `is-odd@3.0.1`, `semver@7.6.3`). Tests are skipped by default; run with `npm run test:e2e`. Includes a local registry-response cache in `tools/e2e/.cache/` to speed up repeated runs and strict timeouts to prevent hangs.

- [x] **Automated README badge update**
  Added `tools/update-badge.js` and `tools/update-badge.test.js` to count `test()` calls in `tools/*.test.js` and refresh the test-count badge in `README.md`. Integrated into the pre-commit hook so the badge stays synchronized automatically. New scripts: `defence:update-badge` and `defence:update-badge:dry-run`.

- [x] **Historical scan tracking**
  Extended `.defence-update-check.json` with a rolling `history` array (max 30 entries by default) stored in `tools/check-updates.js`. Enables detection of packages stuck in quarantine and unusually frequent releases using only local data.

- [x] **Confidence score for updates**
  Added `confidence` and `confidenceLabel` to eligible updates in `tools/check-updates.js`. Score combines release age, semver severity, and local release cadence into `recommended`, `review required`, or `high risk` labels. Exposed in table, JSON, and Markdown output.

- [x] **Interactive update approval**
  Added `--interactive` mode to `tools/update-packages.js` with readline prompts, timeout handling, and persistence of decisions to `.defence-update-decisions.json`. Developers can approve/reject/quit per eligible package; only approved packages are updated. New scripts: `defence:update:interactive` and `defence:update:interactive:dry-run`.

- [x] **Explanatory comment for `EventEmitter` import**
  Added a comment in `tools/check-package-age.test.js` explaining that `EventEmitter` is used to mock HTTP request/response streams in `fetchPackageAge` tests.
- [x] **Document environment version checks**
  Documented in `docs/en/setup.md`, `docs/pt-BR/setup.md`, `docs/en/quick-reference.md`, and `docs/pt-BR/quick-reference.md` that `node --version && npm --version` fails early when the environment does not match the `engines` field in `package.json`.
- [x] **Offline mode for update check**
  Added `--offline` flag to `tools/check-updates.js`, `defence:update-check:offline` script in `package.json`, and documentation in Layer 8 pages and quick references. Offline mode uses cached scans without network calls and exits 0 when no cache exists.
- [x] **GitHub issue and PR templates**
  Add `.github/ISSUE_TEMPLATE/` with bug report and feature request forms, plus `.github/pull_request_template.md` with a contribution checklist.
- [x] **Dependency license checker**
  Add `defence:license-check`, `defence:license-check:fail`, and `defence:license-check:json` scripts that scan `package-lock.json` for licenses incompatible with the project's MIT license. Includes SPDX expression handling, single-package mode, and JSON/Markdown/table formatters.
- [x] Add extra reference documentation for secret management, artifact signing, SBOM standards, and secret scanning.
- [x] Keep `references.md` as a single file instead of splitting into subpages.
- [x] Fix internal documentation in `install-defences.js` to list all copied files.
- [x] **Dependency sync check script**
  Add a dedicated `defence:sync-check` command and optional `post-merge` hook that warns when `node_modules` is out of sync with `package-lock.json` after a pull, prompting the developer to run `npm ci` before continuing.
- [x] **Update check output formatters**
  Extend `defence:update-check` with `--format=json` and `--format=markdown` so the scan result can be consumed by CI pipelines or pasted into pull requests and issues.
