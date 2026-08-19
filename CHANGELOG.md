# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

### Added (Phase 2)

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

### Added

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
