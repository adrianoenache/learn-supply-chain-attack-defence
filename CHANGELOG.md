# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
