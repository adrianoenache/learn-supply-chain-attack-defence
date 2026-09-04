# Tools

This project relies on a small set of carefully chosen tools. Every tool is native to the Node.js ecosystem or written with native modules, keeping the supply-chain surface minimal.

## Runtime

### Node.js >= 24.19.0

The project targets a recent Node.js LTS line to guarantee support for:

- `node:test` and `node:assert/strict` (no third-party test framework).
- `min-release-age` enforcement in npm.
- Modern `fetch` and `AbortController` APIs if needed in the future.

### npm >= 11.17.0

npm is the package manager. The project uses it both for installation and as a security primitive through commands like `npm audit signatures` and `npm audit --audit-level=high`.

## Development Dependencies

### Husky 9.1.7

[Husky](https://typicode.github.io/husky/) manages Git hooks. It installs the `.husky/pre-commit` hook so every commit runs the project's defensive checks automatically.

**Selection criteria**:

- Widely adopted and minimal.
- Published for more than 7 days before adoption (verified by `defence:add`).
- No postinstall lifecycle scripts required in normal usage.

### Biome 2.5.8

[Biome](https://biomejs.dev/) is the project's linter and formatter. It replaces ESLint + Prettier with a single, fast toolchain.

**Selection criteria**:

- Unified linter and formatter.
- Native performance and small dependency footprint.
- Version 2.5.8 was at least 7 days old at the time of adoption (2026-08-18), satisfying `min-release-age=7`.

## Custom Scripts

All custom scripts live in `tools/` and use only native Node.js modules.

| Script | Purpose |
| --- | --- |
| `check-engines.js` | Validates that the active Node.js and npm satisfy `engines` in package.json. |
| `check-package-age.js` | Enforces minimum package age for direct or transitive dependencies. |
| `add-package.js` | Safely adds a dependency with age, signature, audit, lifecycle-script analysis, and transitive checks. |
| `analyze-lifecycle-scripts.js` | Static, read-only analysis of npm package lifecycle scripts before install. |
| `lib/script-analyzer.js` | Shared lifecycle-script analysis engine used by `analyze-lifecycle-scripts.js` and `add-package.js`. |
| `setup-bootstrap.js` | Performs a controlled first install when `package-lock.json` is missing. |
| `update-packages.js` | Controlled wrapper for `npm update` with post-update checks and optional interactive approval. |
| `check-updates.js` | Read-only pre-commit helper that warns about eligible and quarantined updates. Deduplicates registry fetches per run with an in-memory packument cache and reports hit/miss metrics. |
| `check-licenses.js` | Read-only dependency license scanner with allow-list / deny-list classification. |
| `check-sync.js` | Standalone command that verifies `node_modules` matches `package-lock.json`. |
| `lib/sync-check.js` | Shared sync-check logic used by `check-updates.js` and `check-sync.js`. |
| `check-md-links.js` | Validates internal links in markdown documentation. Uses an incremental SHA-256 content-hash cache so repeated runs only re-check changed files. |
| `check-lockfile-integrity.js` | Verifies that every lockfile entry has a SHA-512 integrity field. |
| `check-hooks.js` | Verifies that `.husky/pre-commit` matches the known hash in `package.json`. |
| `check-secrets.js` | Scans files for likely secrets before they are committed. |
| `lib/registry-cache.js` | Disk-backed registry cache with TTL used by registry-dependent tools. |
| `lib/retry-fetch.js` | Shared registry fetch layer with retry, gzip, and size limits. |
| `lib/config.js` | Centralized configuration loader used across the defence tools. |
| `lib/provenance.js` | Helpers for verifying npm package provenance and SLSA attestations. |
| `update-badge.js` | Refreshes the test-count badge in `README.md` from `tools/*.test.js`. |
| `generate-sbom.js` | Generates a CycloneDX 1.4 JSON SBOM from `package-lock.json`. |
| `verify-defences.js` | Verifies files copied by `install-defences.js` against `.defence-manifest.json`. |
| `install-defences.js` | Copies the defences into another Node.js project and writes the manifest. |
| `lib/package-utils.js` | Shared utilities for parsing and validating package specifiers. |
| `lib/trust-engine.js` | Aggregates existing supply-chain signals into a 0–100 trust score per package. |
| `generate-trust-report.js` | CLI for the trust score dashboard; emits table, JSON, or Markdown reports. |
| `lib/process-monitor.js` | Native Node.js hook for `spawn`, `spawnSync`, `exec`, and `execSync` with risk classification. |
| `lib/install-monitor-report.js` | Markdown/JSON report formatter for process-monitor output. |
| `monitor-install.js` | CLI wrapper to run any `npm install`/`ci` command under process monitoring. |
| `perf/benchmark.js` | Performance benchmark suite measuring execution time and network calls for registry-dependent tools. Compares results against `tools/perf/baselines.json` to detect regressions. |

## `.npmrc` Hardening

The project keeps a hardened [.npmrc](../../.npmrc) at the root. It is copied to adopted projects by `install-defences.js`. See the [`.npmrc` hardening guide](npmrc-hardening.md) for the rationale behind each setting, options that were considered but not adopted, and guidance for private registries and emergency patches.

## Performance Benchmarks

The `tools/perf/benchmark.js` suite measures how the registry-dependent tools behave under controlled conditions:

| npm script | Purpose |
| --- | --- |
| `npm run defence:perf` | Runs the full benchmark suite and compares results to `tools/perf/baselines.json`. |
| `npm run defence:perf:baseline` | Re-saves current results as the baseline. Run this after deliberate performance improvements. |
| `npm run defence:perf:check-package-age` | Runs only the `check-package-age` benchmark. |
| `npm run defence:perf:check-updates` | Runs only the `check-updates` benchmark. |

A regression is flagged when a metric is worse than the baseline by more than 20%. Keep the baseline committed so CI can catch unintended slowdowns or extra network calls.

## Trust Score Dashboard

| npm script | Purpose |
| --- | --- |
| `npm run defence:trust-report` | Generates a Markdown trust score report for all dependencies. |
| `npm run defence:trust-report:json` | Generates JSON output for programmatic consumption. |
| `npm run defence:trust-report:fail` | Fails (exit code 1) if any package is below the configured minimum. |

See [Trust scoring](trust-scoring.md) for signal details, configuration, and integration with `defence:add`.

## Adoption Manifest

When `install-defences.js` copies defences into another project, it writes `.defence-manifest.json` with SHA-256 hashes of every copied file. The source project keeps its own manifest committed so that `npm run defence:verify-defences` can detect drift in CI.

Because legitimate edits to copied files naturally change their hashes, the pre-commit hook regenerates the manifest automatically. You can also update it manually:

| npm script | Purpose |
| --- | --- |
| `npm run defence:verify-defences` | Compares current files against `.defence-manifest.json` and reports mismatches. |
| `npm run defence:verify-defences:fix` | Recomputes hashes from the current source tree and overwrites `.defence-manifest.json`. |

Run the fix script after any deliberate change to the files listed in `install-defences.js`, then commit the updated manifest.

## Tests

| Script | Purpose |
| --- | --- |
| `integration.test.js` | Cross-tool integration tests with mocked registry and in-memory fixtures. |
| `e2e/e2e.test.js` | Opt-in end-to-end tests against the real npm registry. |

## Why No Third-Party Test Framework?

The native `node:test` runner is sufficient for this project. Avoiding Jest, Mocha, or Vitest removes another dependency from the supply chain and keeps the setup reproducible with `npm ci`.
