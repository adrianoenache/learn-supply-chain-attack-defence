# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Defense Layer 9 — Dependency license check:
  - New `defence:license-check`, `defence:license-check:fail`, and `defence:license-check:json` scripts.
  - Read-only scanner that parses `package-lock.json` v3 and classifies each package license as **allowed**, **prohibited**, or **flagged for review**.
  - Configurable via `licensesCheck` in `package.json` with explicit `allowed`, `prohibited`, and `failOnUnknown` fields.
  - Supports SPDX compound expressions with `OR` and `AND` operators.
  - Single-package mode via `--pkg=name@version` for quick triage.
  - Table, JSON, and Markdown output formatters.
  - Native Node.js implementation in `tools/check-licenses.js` with full test coverage in `tools/check-licenses.test.js`.
- GitHub issue and PR templates:
  - `.github/ISSUE_TEMPLATE/bug_report.yml` bug report form.
  - `.github/ISSUE_TEMPLATE/feature_request.yml` feature request form.
  - `.github/ISSUE_TEMPLATE/config.yml` redirecting security reports to `SECURITY.md` and questions to discussions.
  - `.github/pull_request_template.md` with a contribution checklist.
- Documentation for Layer 9 in English and Portuguese:
  - `docs/en/security/defense-layer-9-license-check.md`
  - `docs/pt-BR/security/defense-layer-9-license-check.md`
- Security overview, indexes, README, tools page and quick reference updated to list Layer 9 and the new license-check commands.
- README test badge updated from `83/83` to `122/122`.
- Offline mode for `defence:update-check`:
  - `--offline` flag in `tools/check-updates.js` skips `npm outdated` and registry calls; uses cached state even if TTL expired.
  - New `defence:update-check:offline` npm script.
  - Offline mode exits 0 when no cache exists to avoid breaking pre-commit without network.
  - Local `node_modules` sync check still runs in offline mode.
  - Tests in `tools/check-updates.test.js` cover offline cache usage, missing cache, and stale cache.
  - Documented offline mode in `docs/en/security/defense-layer-8-update-check.md`, `docs/pt-BR/security/defense-layer-8-update-check.md`, `docs/en/quick-reference.md`, and `docs/pt-BR/quick-reference.md`.
- Explanatory comment in `tools/check-package-age.test.js` describing the `EventEmitter` mock usage.
- Documentation for environment version checks in `docs/en/setup.md`, `docs/pt-BR/setup.md`, `docs/en/quick-reference.md`, and `docs/pt-BR/quick-reference.md`.
- Defense Layer 8 — Update availability check:
  - New `defence:update-check` and `defence:update-check:force` scripts.
  - Read-only pre-commit helper that warns about available dependency updates.
  - Classifies updates as **eligible** (old enough) or **quarantine** (too recent or registry lookup failed).
  - Local `node_modules` sync check that recommends `npm ci` when the installed tree is out of sync with `package-lock.json`.
  - Configurable via `updateCheck` in `package.json` (age, reminder interval, transitive scope, timeout, cache TTL).
  - Release links inferred from npm registry `repository.url` and best-effort GitHub tag patterns.
  - Local cache stored in `.defence-update-check.json` (git-ignored).
- New tool script `tools/check-updates.js` and its test suite `tools/check-updates.test.js`.
- Documentation for Layer 8 in English and Portuguese:
  - `docs/en/security/defense-layer-8-update-check.md`
  - `docs/pt-BR/security/defense-layer-8-update-check.md`
- Security overview, indexes, README, tools page and quick reference updated to list Layer 8.
- Dependency sync check:
  - Extracted shared sync logic into `tools/lib/sync-check.js`.
  - New standalone `tools/check-sync.js` CLI with `--silent` and `--fix` flags.
  - New `defence:sync-check` and `defence:sync-check:fix` scripts.
  - New `.husky/post-merge` hook that warns after `git pull`/`git merge` when `node_modules` is out of sync with `package-lock.json`.
  - Pre-commit hook now calls `defence:update-check`, which performs a sync check before scanning for available updates.
- Update check formatters:
  - `defence:update-check:json` script outputs valid JSON.
  - `--format=markdown` option produces a Markdown report suitable for PRs and issues.
  - Table format remains the default for interactive use.
- New and expanded test suites:
  - `tools/check-sync.test.js` covering hash, version fallback, fix command suggestion, and CLI flags.
  - `tools/check-updates.test.js` extended with formatter and sync integration tests.
- Quick reference and tools documentation updated in English and Portuguese to describe the new commands and scripts.

## [1.0.0] - 2026-08-18

- Seven defense-in-depth layers against npm supply-chain attacks:
  - Package age check (minimum 7 days).
  - Registry signature verification (`npm audit signatures`).
  - Vulnerability audit (`npm audit --audit-level=high`).
  - Deterministic install (`npm ci`).
  - Pre-commit hook with lint, signature, audit and transitive age checks.
  - Hardened `.npmrc` with `save-exact`, `ignore-scripts`, `min-release-age=7`, `engine-strict=true` and fixed registry.
  - Lint / format gate using Biome.
- Defense scripts under `tools/`:
  - `check-package-age.js` for direct and transitive package-age checks.
  - `add-package.js` as a safe wrapper for adding dependencies.
  - `setup-bootstrap.js` for controlled first installs.
  - `update-packages.js` for controlled dependency updates.
  - `install-defences.js` for copying defenses into other Node.js projects.
  - `lib/package-utils.js` for shared package specifier parsing.
- Native Node.js test suite using `node:test` and `node:assert/strict`.
- Biome 2.5.8 as unified linter and formatter, replacing ESLint + Prettier.
- Multilingual documentation (`docs/en/` and `docs/pt-BR/`) covering architecture, tools, quick reference, security layers and Copilot usage.
- `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` and this changelog.
