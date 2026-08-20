# TODO

This file tracks future improvements that are **not required** for the project to reach a 10/10 quality score. They are kept here as reference for contributors who want to extend the project further.

## Future Enhancements

### High Value

_No items in this section._

### Medium Value

_No items in this section._

### Low Value / Polish

_No items in this section._

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
