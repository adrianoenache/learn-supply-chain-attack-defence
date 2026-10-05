# Command Verification Checklist

This checklist documents the **command contract** of every `defence:*` script in
`package.json`: purpose, flags, silent/format modes, exit codes, test file, and
observations. Use it when verifying a script's behavior (see the
`script-contract-verification` skill) or when adding a new script.

## Entry template

Each tool is documented with the following fields:

- **Purpose** — what the script does and why it exists.
- **Scripts** — the `defence:*` aliases that invoke it.
- **Flags** — every supported CLI flag and positional argument, with defaults.
- **Silent/format modes** — behavior of `--silent` and `--format` when supported.
- **Exit codes** — `0` for success/no-issues, `1` for failure/issues.
- **Tests** — the file covering the contract.
- **Notes** — side effects, state files, and security caveats.

Verification procedure for any entry: run the script with `--dry-run` (or its
read-only default), confirm the exit code matches the table below, and compare
behavior with the header comment in the tool file.

## Category summary

| Category | Scripts |
|---|---|
| Setup & Bootstrap | `defence:bootstrap`, `defence:check-engines`, `defence:install-monitored`, `defence:reinstall` |
| Dependency Management | `defence:add`, `defence:update`, `defence:update:interactive`, `defence:update:interactive:dry-run`, `defence:update-check`, `defence:update-check:force`, `defence:update-check:json`, `defence:update-check:offline`, `defence:analyze-lifecycle-scripts` |
| Auditing & Verification | `defence:pkg-age-check`, `defence:audit`, `defence:license-check`, `defence:license-check:fail`, `defence:license-check:json`, `defence:trust-report`, `defence:trust-report:json`, `defence:trust-report:fail`, `defence:check-lockfile-integrity`, `defence:check-hooks`, `defence:check-secrets`, `defence:generate-sbom` |
| State & Synchronization | `defence:sync-check`, `defence:sync-check:fix`, `defence:verify-defences`, `defence:verify-defences:fix`, `defence:update-badge`, `defence:update-badge:dry-run` |
| Documentation & Compliance | `defence:check-md-links`, `defence:check-external-urls`, `defence:check-external-urls:force` |
| Performance & Monitoring | `defence:perf`, `defence:perf:baseline`, `defence:perf:check-package-age`, `defence:perf:check-updates` |
| Miscellaneous | `defence:pre-commit` |

---

## Setup & Bootstrap

### setup-bootstrap.js

- **Purpose:** one-command bootstrap for new contributors (`npm ci` + defense gates).
- **Scripts:** `defence:bootstrap`
- **Flags:** none.
- **Silent/format modes:** not supported.
- **Exit codes:** `0` success; `1` when any bootstrap step fails.
- **Tests:** `tools/setup-bootstrap.test.js`
- **Notes:** runs `npm ci` (lifecycle scripts disabled by `.npmrc`); safe to re-run.
- **Docs:** [tools/setup-bootstrap.md](tools/setup-bootstrap.md)

### check-engines.js

- **Purpose:** verifies the running Node.js/npm versions satisfy `engines` in `package.json`.
- **Scripts:** `defence:check-engines`
- **Flags:** none.
- **Silent/format modes:** not supported.
- **Exit codes:** `0` engines satisfied; `1` mismatch or unreadable `package.json`.
- **Tests:** `tools/check-engines.test.js`
- **Notes:** read-only; used by `defence:reinstall` and CI.
- **Docs:** [tools/check-engines.md](tools/check-engines.md)

### monitor-install.js

- **Purpose:** wraps dependency installation with lifecycle-script monitoring and a report.
- **Scripts:** `defence:install-monitored`
- **Flags:** `--format=<table|json>`, `--output=<path>` (report destination).
- **Silent/format modes:** `--format=json` switches the report to JSON.
- **Exit codes:** `0` clean install; `1` install failed or suspicious activity detected.
- **Tests:** `tools/monitor-install.test.js`
- **Notes:** performs a real install — do not run in a dry-run expectation; use `defence:add` for new packages instead.
- **Docs:** [tools/monitor-install.md](tools/monitor-install.md)

### defence:reinstall (composite)

- **Purpose:** nuclear-option reinstall when the dependency tree is suspect: engine check, age check, `rm -rf node_modules`, cache clean, `npm ci`, signatures, rebuild with approval, `audit fix`, and a final transitive age re-check.
- **Scripts:** `defence:reinstall`
- **Flags:** none (fixed pipeline).
- **Exit codes:** `0` all steps passed; `1` on the first failing step.
- **Tests:** covered indirectly by the composed tools' tests.
- **Notes:** **destructive** — wipes `node_modules` and the npm cache; never run in CI without intent.

---

## Dependency Management

### add-package.js

- **Purpose:** the only sanctioned way to add a dependency — runs age, provenance, lifecycle-script, and trust gates before installing.
- **Scripts:** `defence:add`
- **Flags:** positional `pkg@x.y.z` (exact version required); `--dry-run` (gates only, no install); `--dev`; `--peer`.
- **Silent/format modes:** not supported.
- **Exit codes:** `0` all gates passed (or dry-run passed); `1` any gate failed.
- **Tests:** `tools/add-package.test.js`, `tools/integration.test.js`
- **Notes:** modifies `package.json`/`package-lock.json` unless `--dry-run`.
- **Docs:** [tools/add-package.md](tools/add-package.md)

### check-updates.js

- **Purpose:** read-only scan for outdated dependencies; classifies eligible vs quarantine by publish age and lists `intermediateEligible` versions.
- **Scripts:** `defence:update-check`, plus `:force`, `:json`, `:offline` variants.
- **Flags:** `--force` (ignore cache), `--offline` (cache only), `--silent`, `--format=<table|json|markdown>`.
- **Silent/format modes:** `--silent` suppresses **reports only**; safety warnings (out-of-sync, offline fallback) always print to **stderr**. `--format` switches the report renderer.
- **Exit codes:** `0` in all normal paths (advisory tool, never blocks); `1` on internal error.
- **Tests:** `tools/check-updates.test.js`, `tools/integration.test.js`
- **Notes:** writes `.defence-update-check.json` state (gitignored); never installs anything.
- **Docs:** [tools/check-updates.md](tools/check-updates.md)

### update-packages.js

- **Purpose:** applies updates safely — pinned installs of the highest age-gated `intermediateEligible` target, then re-runs all verification layers.
- **Scripts:** `defence:update`, `defence:update:interactive`, `defence:update:interactive:dry-run`
- **Flags:** `--interactive` (y/n/q per package), `--dry-run`.
- **Silent/format modes:** not supported.
- **Exit codes:** `0` completed (including "nothing to do"); `1` when any install or verification command fails.
- **Tests:** `tools/update-packages.test.js`
- **Notes:** modifies dependencies unless `--dry-run`; falls back to generic `npm update` when no scan state exists; records decisions in `.defence-update-decisions.json`.
- **Docs:** [tools/update-packages.md](tools/update-packages.md)

### analyze-lifecycle-scripts.js

- **Purpose:** inspects a package (or the lockfile) for pre/post/install lifecycle scripts.
- **Scripts:** `defence:analyze-lifecycle-scripts`
- **Flags:** `--pkg=<name[@version]>`; `--fail` (exit 1 when scripts found); `--silent`; `--format=<table|json>`.
- **Silent/format modes:** `--silent` suppresses the listing; `--format=json` for machines.
- **Exit codes:** `0` no scripts (or `--fail` absent); `1` scripts found with `--fail`, or lookup error.
- **Tests:** `tools/analyze-lifecycle-scripts.test.js`
- **Docs:** [tools/analyze-lifecycle-scripts.md](tools/analyze-lifecycle-scripts.md)

---

## Auditing & Verification

### check-package-age.js

- **Purpose:** Defense Layer 1 — blocks packages published less than `minAgeDays` ago.
- **Scripts:** `defence:pkg-age-check`
- **Flags:** `--transitive` (scan the whole lockfile); `--pkg <name@version>` (single package).
- **Silent/format modes:** not supported.
- **Exit codes:** `0` all packages old enough; `1` any package below the minimum age.
- **Tests:** `tools/check-package-age.test.js`, `tools/integration.test.js`
- **Docs:** [tools/check-package-age.md](tools/check-package-age.md)

### run-audit-with-retry.js

- **Purpose:** wraps `npm audit --audit-level=high` with bounded retry/backoff for registry flakiness.
- **Scripts:** `defence:audit`
- **Flags:** none (retry parameters come from `retryFetch` config).
- **Exit codes:** `0` audit clean; `1` audit reports high/critical vulnerabilities after retries.
- **Tests:** `tools/run-audit-with-retry.test.js`
- **Docs:** [tools/run-audit-with-retry.md](tools/run-audit-with-retry.md)

### check-licenses.js

- **Purpose:** Defense Layer 9 — verifies dependency licenses against the allow/deny policy.
- **Scripts:** `defence:license-check`, plus `:fail` and `:json` variants.
- **Flags:** `--fail` (exit 1 on incompatible), `--transitive`, `--pkg=<name>`, `--silent`, `--format=<table|json|markdown>`.
- **Silent/format modes:** `--silent` suppresses the table; formats switch the renderer.
- **Exit codes:** `0` compatible (or `--fail` absent); `1` incompatible license with `--fail`.
- **Tests:** `tools/check-licenses.test.js`
- **Docs:** [tools/check-licenses.md](tools/check-licenses.md)

### generate-trust-report.js

- **Purpose:** composes age, maintainers, downloads, and provenance signals into a trust score per package.
- **Scripts:** `defence:trust-report`, plus `:json` and `:fail` variants.
- **Flags:** `--pkg <name@x.y.z>` (exact version required), `--direct`, `--transitive`, `--fail`, `--silent`, `--format=<table|json>`, `--output=<path>`.
- **Silent/format modes:** `--silent` suppresses the table; `--format=json` for machines.
- **Exit codes:** `0` report generated; with `--fail`, `1` when the lowest score is below the configured threshold.
- **Tests:** `tools/generate-trust-report.test.js`
- **Docs:** [tools/generate-trust-report.md](tools/generate-trust-report.md)

### check-lockfile-integrity.js

- **Purpose:** verifies `package-lock.json` integrity fields and consistency with `package.json`.
- **Scripts:** `defence:check-lockfile-integrity`
- **Flags:** `--silent`, `--format=<table|json|markdown>`.
- **Silent/format modes:** `--silent` suppresses the report; formats switch the renderer.
- **Exit codes:** `0` lockfile intact; `1` integrity problems found.
- **Tests:** `tools/check-lockfile-integrity.test.js`
- **Docs:** [tools/check-lockfile-integrity.md](tools/check-lockfile-integrity.md)

### check-hooks.js

- **Purpose:** Defense Layer 12 — verifies `.husky/pre-commit` matches the SHA-256 hash recorded in `package.json`.
- **Scripts:** `defence:check-hooks`
- **Flags:** none.
- **Exit codes:** `0` hashes match; `1` drift detected (hook tampered or hash stale).
- **Tests:** `tools/check-hooks.test.js`
- **Notes:** after intentionally editing `.husky/pre-commit`, follow the `pre-commit-hash-sync` skill.
- **Docs:** [tools/check-hooks.md](tools/check-hooks.md)

### check-secrets.js

- **Purpose:** scans files for secrets/tokens before they are committed.
- **Scripts:** `defence:check-secrets`
- **Flags:** positional file paths (used by the pre-commit hook with staged files).
- **Exit codes:** `0` no secrets found; `1` potential secret detected.
- **Tests:** `tools/check-secrets.test.js`
- **Docs:** [tools/check-secrets.md](tools/check-secrets.md)

### generate-sbom.js

- **Purpose:** generates the project SBOM (CycloneDX) for releases and audits.
- **Scripts:** `defence:generate-sbom`
- **Flags:** `--format=cyclonedx` (default), `--output=<path>`.
- **Silent/format modes:** format fixed to CycloneDX.
- **Exit codes:** `0` SBOM written; `1` generation failed.
- **Tests:** `tools/generate-sbom.test.js`
- **Docs:** [tools/generate-sbom.md](tools/generate-sbom.md)

---

## State & Synchronization

### check-sync.js

- **Purpose:** verifies `node_modules` matches `package-lock.json` (Layer 4 support).
- **Scripts:** `defence:sync-check`, `defence:sync-check:fix`
- **Flags:** `--fix` (runs `npm ci` to repair), `--silent`.
- **Silent/format modes:** `--silent` suppresses the success output.
- **Exit codes:** `0` in sync; `1` out of sync (without `--fix`) or repair failed.
- **Tests:** `tools/check-sync.test.js`, `tools/lib/sync-check.test.js`
- **Docs:** [tools/check-sync.md](tools/check-sync.md)

### verify-defences.js / install-defences.js

- **Purpose:** verifies that every adopted defence file matches the SHA-256 manifest (`verify-defences`); regenerates the manifest (`verify-defences:fix`); installs the defences into another project (`install-defences`).
- **Scripts:** `defence:verify-defences`, `defence:verify-defences:fix`
- **Flags:** `verify-defences`: `--json`, `-s`/`--silent`. `install-defences`: `--dry-run`, `--force`, `--update-local-manifest`, `--format=json`, `--tool=<name>`.
- **Exit codes:** `0` manifest matches / install ok; `1` drift or install failure.
- **Tests:** `tools/verify-defences.test.js`, `tools/install-defences.test.js`
- **Notes:** `verify-defences:fix` rewrites `.defence-manifest.json` — commit it together with the file changes that caused the drift.
- **Docs:** [tools/verify-defences.md](tools/verify-defences.md), [tools/install-defences.md](tools/install-defences.md)

### update-badge.js

- **Purpose:** keeps the README test badge in sync with the real `node --test` count.
- **Scripts:** `defence:update-badge`, `defence:update-badge:dry-run`
- **Flags:** `--dry-run`.
- **Exit codes:** `0` badge updated/unchanged; `1` the test run itself failed.
- **Tests:** `tools/update-badge.test.js`
- **Notes:** invoked automatically by the pre-commit hook.
- **Docs:** [tools/update-badge.md](tools/update-badge.md)

---

## Documentation & Compliance

### check-md-links.js

- **Purpose:** validates every local link in the markdown tree.
- **Scripts:** `defence:check-md-links`
- **Flags:** `--force` (ignore the result cache).
- **Exit codes:** `0` all links valid; `1` broken links found.
- **Tests:** `tools/check-md-links.test.js`
- **Notes:** uses `.md-links-cache.json` (gitignored) for speed.
- **Docs:** [tools/check-md-links.md](tools/check-md-links.md)

### check-external-urls.js

- **Purpose:** verifies that external URLs in docs, AI customizations, and config files are reachable.
- **Scripts:** `defence:check-external-urls`, `defence:check-external-urls:force`
- **Flags:** `--force` (revalidate everything), `--silent`.
- **Silent/format modes:** `--silent` suppresses per-URL progress; failures are always reported.
- **Exit codes:** `0` all URLs reachable or allow-listed; `1` unreachable URLs found.
- **Tests:** `tools/check-external-urls.test.js`
- **Notes:** known-dead URLs live in `.github/known-dead-urls.md`; cache in `.external-urls-cache.json` (gitignored).
- **Docs:** [tools/check-external-urls.md](tools/check-external-urls.md)

---

## Performance & Monitoring

### perf/benchmark.js

- **Purpose:** micro-benchmarks the defence tools (runtime, network calls, cache hits).
- **Scripts:** `defence:perf`, `defence:perf:baseline`, `defence:perf:check-package-age`, `defence:perf:check-updates`
- **Flags:** `--tool=<name>`, `--depth=<n>`, `--save-baseline`, `--silent`.
- **Silent/format modes:** `--silent` suppresses per-iteration output.
- **Exit codes:** `0` benchmark completed; `1` benchmark or baseline comparison failed.
- **Tests:** `tools/perf/*.test.js`
- **Notes:** results feed `.defence-profile.json` (gitignored); baselines are comparable across runs.

---

## Miscellaneous

### defence:pre-commit (composite)

- **Purpose:** the full pre-commit gate chain: `npm audit signatures`, `defence:audit` (with retry), `defence:update-check`.
- **Scripts:** `defence:pre-commit`
- **Flags:** none (fixed pipeline).
- **Exit codes:** `0` all gates passed; `1` on the first failing gate.
- **Tests:** covered by the composed tools' tests and the Husky hook.
- **Notes:** the actual `.husky/pre-commit` runs additional layers (lint, secrets, external URLs, license, manifest, badge).
