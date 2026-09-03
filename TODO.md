# TODO

This file tracks the remaining work required for the project to reach a **10/10 quality score across security, code quality, performance, documentation, and AI-assisted development**, and to produce a **regenerated `PROJECT_STATUS_REPORT.md` with the maximum score in every category**.

The **release v1.0.0 is the final action** and will only happen when:

1. Every TODO item is marked complete.
2. All validation gates pass: `npm test`, `npm run lint`, `npm run defence:check-md-links`, `bash .husky/pre-commit`, `npm run test:coverage` (≥ 95%).
3. Documentation is fully synchronized between `docs/en/` and `docs/pt-BR/`.
4. `PROJECT_STATUS_REPORT.md` is regenerated and shows the maximum score in every category.

Items are prioritized with `P0` (critical/blocking for `v1.0.0`), `P1` (important for `v1.0.0`), `P2` (improvement for `v1.0.0`), and `P3` (experimental, included in `v1.0.0` only if feasible before the release gates).

Priority order: **P0 → P1 → P2 → P3**.

---

## Phase Summary

| Phase | Status | Scope |
|-------|--------|-------|
| 0 — Foundation | ✅ Done | config, CI, CONTRIBUTING |
| 1 — Critical Security | ✅ Done | TOCTOU, lockfile, install-defences checksums, hook integrity |
| 2 — Resilience / Performance | ✅ Done | registry-cache, retry-fetch, gzip, Buffer |
| 3 — CI/CD + Quality Gates | ✅ Done | secret scanner, CI `dev`, docs, expanded tests |
| 4 — Attack Surface Reduction | ✅ Done | typosquatting, provenance/SLSA, hook integrity enforcement |
| 5 — Code Quality + Tests | ✅ Done | 299 tests, native coverage, license check integrated |
| 6 — Docs + AI Core + Release Readiness | ✅ Done | reorganized docs, AI instructions, CI adjusted, release checklist |
| 7 — AI Agents / Skills / Prompts / Hooks | ✅ Done | agents, skills, prompts, hooks, self-improvement loop |
| 7.5 — P1 Technical Debt | ✅ Done | troubleshooting.md, rebuilding-lifecycle-packages.md |
| 8 — Benchmarks + Risk Scoring | 🔄 Next | perf benchmarks, package metadata risk scoring, N+1 reduction |
| 9 — Experimental Hardening | ⏳ Pending | sandbox mode, profiling dashboard |
| 10 — Release v1.0.0 | ⏳ Final | TODO.md 100%, tests green, PROJECT_STATUS_REPORT.md 10/10 |

---

## 1. Security Defenses

### 1.1 Attack Surface Reduction

- [x] **[P1]** Add typosquatting and dependency-confusion detection — new or extended tool flags packages whose names are within a configurable Levenshtein distance of existing dependencies, or private/internal names that unexpectedly exist on the public registry; documented in `docs/en/security/` and `docs/pt-BR/security/`.
  - Impact: blocks a common supply-chain attack vector at install time.
  - Depends on: central configuration system (Section 3.1).
  - Files: [tools/add-package.js](tools/add-package.js), [tools/lib/package-utils.js](tools/lib/package-utils.js), [docs/en/security/what-is-supply-chain-attack.md](docs/en/security/what-is-supply-chain-attack.md)

- [x] **[P1]** Verify npm package provenance / SLSA attestations — `add-package.js` checks whether a package version was published with `--provenance` and validates the attestation bundle when available.
  - Impact: closes the gap between signature verification and build-pipeline compromise.
  - Depends on: central configuration system (Section 3.1).
  - Files: [tools/add-package.js](tools/add-package.js), [tools/check-package-age.js](tools/check-package-age.js)

### 1.2 Installation Safety

- [x] **[P0]** Close TOCTOU window between age check and install — after `npm install` in `add-package.js`, re-fetch the package's publish metadata and confirm the installed tarball matches the version that passed the age check; pin tarball integrity before install when possible.
  - Impact: prevents time-of-check/time-of-use substitution during install.
  - Depends on: registry-response cache and retry logic (Section 2.1).
  - Files: [tools/add-package.js](tools/add-package.js)

- [x] **[P1]** Add lockfile integrity self-check — new script verifies every entry in `package-lock.json` has an `integrity` field using SHA-512 or stronger, and exits non-zero on missing or weak hashes.
  - Impact: detects tampering or incomplete lockfile entries before install.
  - Depends on: none.
  - Files: [tools/check-lockfile-integrity.js](tools/check-lockfile-integrity.js)

- [x] **[P1]** Validate install-defences file integrity — `install-defences.js` now writes `.defence-manifest.json` with SHA-256 checksums of copied files; `verify-defences.js` checks the target project against the manifest.
  - Impact: prevents propagation of tampered tooling during adoption.
  - Depends on: none.
  - Files: [tools/install-defences.js](tools/install-defences.js), [tools/verify-defences.js](tools/verify-defences.js), [tools/verify-defences.test.js](tools/verify-defences.test.js)

### 1.3 Hook and Tooling Integrity

- [x] **[P1]** Enforce git-hook integrity check — add pre-commit or setup-time verification that `.husky/pre-commit` matches a known hash, failing if the hook was modified outside the normal workflow.
  - Impact: protects against hook tampering.
  - Depends on: install-defences integrity check (Section 1.2).
  - Files: [tools/setup-bootstrap.js](tools/setup-bootstrap.js), [tools/check-sync.js](tools/check-sync.js)

### 1.4 Risk Intelligence

- [ ] **[P2]** Add package metadata risk scoring — `check-updates.js` fetches and incorporates deprecation status, maintainer count, weekly downloads, and recent release cadence into the existing confidence score.
  - Impact: improves update decisions with richer risk signals.
  - Depends on: registry-response cache and retry logic (Section 2.1).
  - Files: [tools/check-updates.js](tools/check-updates.js)

---

## 8. Benchmarks and Risk Scoring

> This section was previously labeled "pós-v1.0.0". It is now part of the v1.0.0 scope because the release will only happen when every TODO item is complete.

### 8.1 Performance Benchmarks

- [ ] **[P2]** Add performance benchmarks and regression tests — create `tools/perf/` suite measuring execution time and network call counts for `check-package-age.js` and `check-updates.js`; fail CI on significant regression.
  - Impact: prevents performance degradation as features are added.
  - Depends on: registry-response cache and retry logic (Section 2.1), CI/CD pipeline (Section 5.1).
  - Files: new `tools/perf/` directory

### 8.2 Risk Scoring

- [ ] **[P2]** Add package metadata risk scoring — `check-updates.js` fetches and incorporates deprecation status, maintainer count, weekly downloads, and recent release cadence into the existing confidence score.
  - Impact: improves update decisions with richer risk signals.
  - Depends on: registry-response cache and retry logic (Section 2.1).
  - Files: [tools/check-updates.js](tools/check-updates.js)

---

## 9. Experimental Hardening

> This section was previously labeled "pós-v1.0.0". It is now part of the v1.0.0 scope because the release will only happen when every TODO item is complete.

### 9.1 Optional Sandbox Mode

- [ ] **[P3]** Add optional sandbox mode for npm commands — provide an experimental wrapper that runs `npm install`/`npm update` inside a restricted environment (e.g., Linux namespaces or `bubblewrap`) to limit blast radius of malicious lifecycle scripts.
  - Impact: defense-in-depth for environments that accept the operational overhead.
  - Depends on: none.
  - Files: new `tools/sandboxed-install.sh`

### 9.2 Deep Performance Profiling

- [ ] **[P3]** Add deep performance profiling dashboard — add `--profile` flags to all tools and a CI trend dashboard for memory and CPU usage under large dependency trees.
  - Impact: enables data-driven performance work.
  - Depends on: performance benchmarks (Section 8.1) and registry optimizations (Section 2.1).
  - Files: `tools/perf/`

---

## 2. Performance & Scalability

### 2.1 Network Resilience

- [x] **[P1]** Implement persistent registry-response cache — reuse the caching logic from `tools/e2e/helpers/registry-cache.js` in production code, with configurable TTL, so `check-package-age.js`, `check-updates.js`, and `add-package.js` avoid redundant network calls.
  - Impact: reduces registry load and speeds up repeated runs.
  - Depends on: none.
  - Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js), new `tools/lib/registry-cache.js`

- [x] **[P1]** Optimize registry payload size — add `Accept-Encoding: gzip` to all registry requests, evaluate abbreviated packument endpoints where the `time` field is not required, and replace string concatenation with `Buffer` accumulation for response bodies.
  - Impact: reduces bandwidth and memory usage during registry calls.
  - Depends on: registry-response cache (Section 2.1).
  - Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js)

- [x] **[P1]** Add retry with exponential backoff and rate-limit handling — handle `429`, `503`, and transient network errors with bounded backoff, respecting `Retry-After` headers.
  - Impact: makes registry-dependent tools reliable in CI and throttled environments.
  - Depends on: registry-response cache (Section 2.1).
  - Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js)

### 2.2 Batch Processing and Caching

- [ ] **[P2]** Reduce N+1 registry queries in update check — implement packument caching across dependency lookups and enforce a bounded concurrency limit in `check-updates.js`.
  - Impact: reduces total network calls and avoids hammering the registry.
  - Depends on: registry-response cache (Section 2.1).
  - Files: [tools/check-updates.js](tools/check-updates.js)

- [x] **[P2]** Optimize check-md-links with incremental cache — added SHA-256 content-hash cache stored in `.md-links-cache.json` so repeated runs only re-check changed files. Added `--force` flag to bypass cache.
  - Impact: speeds up documentation validation in CI and pre-commit.
  - Depends on: none.
  - Files: [tools/check-md-links.js](tools/check-md-links.js), [tools/check-md-links.test.js](tools/check-md-links.test.js), [tools/lib/config.js](tools/lib/config.js), [package.json](package.json)

---

## 3. Code Quality & Configuration

### 3.1 Centralized Configuration

- [x] **[P1]** Create a centralized configuration loader — add `tools/lib/config.js` that reads defaults from `package.json` (`engines`, `pkgAgeCheck`, `updateCheck`, `licensesCheck`, `defences`) and optional `.defence.config.json` overrides; exposes values instead of hardcoded constants.
  - Impact: makes the project adoptable in other repos and testable without editing code.
  - Depends on: none.
  - Files: new `tools/lib/config.js`

- [x] **[P1]** Remove hardcoded Node.js and npm versions from tests and tools — read required versions from `package.json` `engines`; update `check-engines.js` and all tests that assert version strings.
  - Impact: eliminates a common source of stale tests and version drift.
  - Depends on: centralized configuration loader (Section 3.1).
  - Files: [tools/check-engines.js](tools/check-engines.js), [tools/check-engines.test.js](tools/check-engines.test.js)

- [x] **[P1]** Extract magic numbers from defense scripts — replace hardcoded thresholds (age limits, history sizes, confidence bands, timeouts) in `check-package-age.js`, `check-updates.js`, and `check-licenses.js` with values from the centralized config.
  - Impact: improves maintainability and allows per-project tuning.
  - Depends on: centralized configuration loader (Section 3.1).
  - Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js), [tools/check-licenses.js](tools/check-licenses.js), [tools/lib/config.js](tools/lib/config.js)

### 3.2 Test Quality and Coverage

- [x] **[P1]** Raise test coverage target to ~95% — add missing unit and CLI subprocess tests until `npm run test:coverage` reports ≥ 95% statement coverage across `tools/`.
- [x] **[P1]** Remove external coverage dependency (`c8`) and switch `test:coverage` to Node.js native `--experimental-test-coverage`. `c8@12.0.0` introduced a transitive tree (`glob`, `lru-cache`, `minimatch`, `minipass`, `path-scurry`) licensed under `BlueOak-1.0.0`, which violates the project's license policy. Native coverage keeps the same reporting capability without the external dependency surface.
- [x] **[P1]** Integrate license check into the dependency-addition pipeline — `defence:add` and the pre-commit hook now run `defence:license-check:fail` after the transitive package-age check so incompatible licenses are caught before commit.
  - Impact: increases confidence in refactors and releases.
  - Depends on: none.
  - Files: `tools/*.test.js`
> **Coverage report format decision:** The project uses Node.js native `--experimental-test-coverage`. This keeps the dependency tree clean and satisfies the ≥ 95% line-coverage target. Services like Codecov/Coveralls require `lcov.info` or JSON reports, which native coverage does not produce. The chosen approach is to stay with native coverage only (Option A). A lightweight custom converter (Option B) may be implemented in the future if Codecov/Coveralls integration becomes a concrete requirement.
- [x] **[P2]** Add error-path tests — cover corrupted `package-lock.json`, registry timeouts, invalid SLSA attestations, missing `integrity` fields, and malformed config files.
  - Impact: prevents silent failures in production.
  - Depends on: centralized configuration loader (Section 3.1).
  - Files: `tools/*.test.js`

- [x] **[P2]** Add integration tests between tools — `tools/integration.test.js` verifies that `add-package.js` → `check-package-age.js` → `check-updates.js` produce consistent metadata and that the transitive age gate composes correctly. Uses mocked registry/cache and DI hooks; every test has a timeout to prevent infinite hangs.
  - Impact: catches interface mismatches between scripts.
  - Depends on: registry-response cache (Section 2.1).
  - Files: [tools/integration.test.js](tools/integration.test.js), [tools/check-package-age.js](tools/check-package-age.js)

- [ ] **[P2]** Expand test fixtures — add fixtures for deprecated packages, yanked versions, very old packages, and packages with missing integrity.
  - Impact: enables deterministic security testing.
  - Depends on: none.
  - Files: `tools/e2e/fixtures/`

### 3.3 Hardcoded Values Cleanup

> **Rule:** intentional hardcoded values in code must always be accompanied by an inline comment explaining why that specific value remains hardcoded and is not configurable.

- [x] **[P1]** Audit and remove hardcoded Node.js/npm versions from tests — `tools/check-engines.test.js` and `tools/lib/config.test.js` now read `engines.node`/`engines.npm` from `package.json`. Remaining hardcoded boundary fixtures (e.g. `>=99.0.0`, `24.x`) have inline comments explaining they exercise parser edge cases, not project config.
  - Impact: prevents version drift between `package.json` and tests.
  - Files: [tools/check-engines.test.js](tools/check-engines.test.js), [tools/lib/config.test.js](tools/lib/config.test.js)

- [x] **[P1]** Audit and centralize remaining magic numbers — added `typosquattingCheck` block to `package.json` and `tools/lib/config.js`; `tools/add-package.js` now reads these values from config instead of hardcoding them. Remaining inline literals (e.g. `1024 * 1024`, `MS_PER_DAY`, secret-token regex lengths) have comments justifying why they stay hardcoded.
  - Impact: improves maintainability and allows other projects to adopt the toolkit without editing source code.
  - Files: [package.json](package.json), [tools/lib/config.js](tools/lib/config.js), [tools/add-package.js](tools/add-package.js), [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js), [tools/lib/provenance.js](tools/lib/provenance.js), [tools/lib/registry-cache.js](tools/lib/registry-cache.js), [tools/lib/retry-fetch.js](tools/lib/retry-fetch.js), [tools/check-secrets.js](tools/check-secrets.js)

- [x] **[P0]** Document intentional hardcodes — added a short "Hardcoded values" section to `CONTRIBUTING.md` and `docs/en/testing.md` / `docs/pt-BR/testing.md` describing the rule, and referenced it in the AI instructions.
  - Impact: makes the policy discoverable for contributors and AI assistants.
  - Depends on: Fase 6 documentation review.
  - Files: `CONTRIBUTING.md`, `docs/en/testing.md`, `docs/pt-BR/testing.md`

---

## 4. AI Customization & Developer Experience

> The AI-specific customization files must live under `.github/` to be automatically discovered by VS Code Copilot / Kimi K2.7 Code. Human-readable documentation about AI collaboration lives in `docs/en/ai-guidelines.md` and `docs/pt-BR/ai-guidelines.md`, not in a separate `docs/ai/` directory.

### 4.1 Always-On Instructions (AI Core)

- [x] **[P0]** Create `.github/copilot-instructions.md` — project-wide instructions that load on every chat request, covering security-first coding, required validation commands (`npm test`, `npm run lint`, `npm run defence:check-md-links`), prevention of infinite loops, hardcode justification, and the rule of reading `package.json` `engines` before proposing version changes.
  - Impact: aligns every AI interaction with project standards.
  - Depends on: none.
  - Files: new `.github/copilot-instructions.md`

### 4.2 File- and Task-Specific Instructions (AI Core)

- [x] **[P0]** Create `.github/instructions/security.instructions.md` — loaded for `tools/**`, `.npmrc`, and `package.json`; covers defense-layer principles, `npm ci`, signature verification, license checks, and secrets handling.
  - Impact: contextual security guidance for code that touches dependencies.
  - Depends on: `.github/copilot-instructions.md` (Section 4.1).
  - Files: new `.github/instructions/security.instructions.md`

- [x] **[P0]** Create `.github/instructions/testing.instructions.md` — loaded for `tools/**/*.test.js`; covers native test runner conventions, DI mocking, subprocess tests, coverage expectations, timeouts, and fixture patterns.
  - Impact: keeps AI-generated tests consistent with project style.
  - Depends on: `.github/copilot-instructions.md` (Section 4.1).
  - Files: new `.github/instructions/testing.instructions.md`

- [x] **[P0]** Create `.github/instructions/docs.instructions.md` — loaded for `docs/**/*.md` and `README.md`; covers bilingual sync, link validation, and threat-model terminology.
  - Impact: keeps documentation accurate and consistent across languages.
  - Depends on: `.github/copilot-instructions.md` (Section 4.1).
  - Files: new `.github/instructions/docs.instructions.md`

### 4.3 Human-Readable AI Guidelines

- [x] **[P0]** Create `docs/en/ai-guidelines.md` and `docs/pt-BR/ai-guidelines.md` — explain how this project uses GitHub Copilot / Kimi 2.7 Code, which `.github/` files exist and how they work, security rules for AI interactions, and the feedback loop for improving instructions.
  - Impact: makes the AI collaboration strategy discoverable for human contributors and auditors.
  - Depends on: `.github/copilot-instructions.md` (Section 4.1).
  - Files: `docs/en/ai-guidelines.md`, `docs/pt-BR/ai-guidelines.md`

### 4.4 Custom Agents ✅

- [x] **[P2]** Create custom agents in `.github/agents/` — `security.agent.md`, `quality.agent.md`, `performance.agent.md`, `docs.agent.md`, and `compliance.agent.md`, each with restricted tools, keyword-rich `description`, and clear boundaries.
  - Impact: enables delegation of specialized review tasks to focused subagents.
  - Depends on: file-specific instructions (Section 4.2).
  - Files: `.github/agents/*.agent.md`

### 4.5 Skills and Prompts ✅

- [x] **[P2]** Create skills in `.github/skills/` — `security-audit/SKILL.md`, `dependency-review/SKILL.md`, `docs-update/SKILL.md`, `release-checklist/SKILL.md`, and `self-review/SKILL.md`, each with step-by-step procedures and correct frontmatter.
  - Impact: packages repeatable workflows with bundled assets.
  - Depends on: custom agents (Section 4.4).
  - Files: `.github/skills/*/SKILL.md`

- [x] **[P2]** Create prompts in `.github/prompts/` — `generate-test.prompt.md`, `review-security.prompt.md`, `update-docs.prompt.md`, `check-hardcoded-values.prompt.md`, and `review-ai-output.prompt.md`, each focused on a single task.
  - Impact: gives developers reusable, one-shot task templates.
  - Depends on: file-specific instructions (Section 4.2).
  - Files: `.github/prompts/*.prompt.md`

### 4.6 Hooks ✅

- [x] **[P2]** Create lifecycle hooks in `.github/hooks/` — `enforce-security.json` (blocks dangerous commands), `auto-lint-test.json` (runs lint and tests after edits), and `inject-context.json` (loads `engines` and TODO state at session start).
  - Impact: turns guidelines into deterministic runtime enforcement.
  - Depends on: always-on instructions (Section 4.1).
  - Files: `.github/hooks/*.json`

### 4.7 Self-Improvement Loop ✅

- [x] **[P2]** Create a lightweight self-improvement mechanism for AI instructions:
  - `.github/prompts/review-ai-output.prompt.md` to review previous AI outputs against project rules.
  - `.github/skills/self-review/SKILL.md` with a step-by-step self-review procedure.
  - `.github/ai-lessons-learned.md` to log recurring AI mistakes and corrections.
  - Periodic review of `.github/copilot-instructions.md` and `.github/instructions/*.md` based on accumulated lessons.
  - Impact: prevents repeated mistakes and lets the project evolve its AI guidance over time.
  - Depends on: file-specific instructions (Section 4.2).
  - Files: `.github/prompts/review-ai-output.prompt.md`, `.github/skills/self-review/SKILL.md`, `.github/ai-lessons-learned.md`

---

## 5. CI/CD & Automation

### 5.1 Pipeline

- [x] **[P0]** Validate and finalize CI/CD pipeline via GitHub Actions — `.github/workflows/ci.yml` now includes npm cache, a dedicated `coverage` job, SBOM generation, adoption-manifest verification, and all existing gates. E2E remains opt-in via `tools/e2e/`.
  - Impact: guarantees local security gates cannot be bypassed.
  - Depends on: Fase 6 documentation and AI Core readiness.
  - Files: `.github/workflows/ci.yml`, [CONTRIBUTING.md](CONTRIBUTING.md)

- [x] **[P1]** Integrate secrets scanning into pre-commit — added a custom native secret scanner that runs in `.husky/pre-commit` and exits non-zero on likely secrets.
  - Impact: prevents accidental secret commits.
  - Depends on: CI/CD pipeline (Section 5.1) for validation.
  - Files: [tools/check-secrets.js](tools/check-secrets.js), [.husky/pre-commit](.husky/pre-commit)

- [x] **[P1]** Add SBOM generation script — new tool reads `package-lock.json` and emits CycloneDX 1.4 JSON SBOM for auditability.
  - Impact: supports compliance and incident response.
  - Depends on: none.
  - Files: [tools/generate-sbom.js](tools/generate-sbom.js), [tools/generate-sbom.test.js](tools/generate-sbom.test.js)

---

## 6. Documentation & Knowledge

### 6.1 Project Overview and Reference

- [x] **[P0]** Create project overview — added `docs/en/project-overview.md` and `docs/pt-BR/project-overview.md` explaining the project's purpose, target audience, what a supply-chain attack is, and how to use this repository for learning and adoption.
  - Impact: gives newcomers a clear entry point.
  - Depends on: none.
  - Files: `docs/en/project-overview.md`, `docs/pt-BR/project-overview.md`

- [x] **[P0]** Create project glossary — added `docs/en/glossary.md` and `docs/pt-BR/glossary.md` defining supply-chain terms (TOCTOU, SLSA, provenance, typosquatting, dependency confusion, lockfile integrity, SBOM, deterministic install, lifecycle scripts, Levenshtein distance).
  - Impact: improves accessibility for learners and contributors.
  - Depends on: none.
  - Files: `docs/en/glossary.md`, `docs/pt-BR/glossary.md`

### 6.2 Security Documentation Reorganization

- [x] **[P0]** Reorganize defense layers into groups — presented the 12 layers as Core, Recommended, and Advanced in `docs/en/security/index.md`, `docs/pt-BR/security/index.md`, `README.md`, `SECURITY.md`, and the adoption guide.
  - Impact: helps teams adopt defenses gradually.
  - Depends on: none.
  - Files: `docs/en/security/index.md`, `docs/pt-BR/security/index.md`, `README.md`, `docs/en/adopting-in-other-projects.md`, `docs/pt-BR/adopting-in-other-projects.md`

### 6.3 Testing Documentation

- [x] **[P0]** Expand testing documentation — updated `docs/en/testing.md` and `docs/pt-BR/testing.md` to cover the native test runner, DI mocking, subprocess tests, integration tests, native coverage, the 95% target, and the intentional-hardcodes rule.
  - Impact: keeps AI and human contributors aligned with project conventions.
  - Depends on: none.
  - Files: `docs/en/testing.md`, `docs/pt-BR/testing.md`

### 6.4 AI Guidelines

- [x] **[P0]** Create AI guidelines — added `docs/en/ai-guidelines.md` and `docs/pt-BR/ai-guidelines.md` describing how the project uses GitHub Copilot / Kimi 2.7 Code, the role of `.github/copilot-instructions.md` and `.github/instructions/*.md`, security rules for AI interactions, and the feedback loop for improving instructions. No separate `docs/ai/` directory was created.
  - Impact: makes the AI collaboration strategy discoverable for humans and auditors.
  - Depends on: `.github/copilot-instructions.md`.
  - Files: `docs/en/ai-guidelines.md`, `docs/pt-BR/ai-guidelines.md`

### 6.5 Pre-Release Review

- [x] **[P0]** Complete comprehensive documentation review before official release — verified and synchronized:
  1. `docs/en/` and `docs/pt-BR/` are structurally aligned.
  2. `docs/en/tools.md`, `docs/en/architecture.md`, and equivalents list every current script and tool.
  3. `README.md` reflects all scripts, badges, setup instructions, and defense layer groups.
  4. All internal links pass `npm run defence:check-md-links`.
  5. `SECURITY.md`, `CONTRIBUTING.md`, and `CHANGELOG.md` are accurate and complete.
  - Impact: documentation must be release-ready before `v1.0.0` is tagged.
  - Depends on: all other P0 items completed or stabilized.
  - Files: `docs/en/`, `docs/pt-BR/`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`

### 6.6 Additional Reference Content (P1)

- [x] **[P1]** Document rebuild procedure for lifecycle-script packages — added `docs/en/security/rebuilding-lifecycle-packages.md` and `docs/pt-BR/security/rebuilding-lifecycle-packages.md` explaining how to safely rebuild `esbuild`, `sharp`, `canvas`, etc., after overriding `ignore-scripts`.
  - Impact: closes a documented exception path in the defense-in-depth story.
  - Depends on: none.
  - Files: `docs/en/security/rebuilding-lifecycle-packages.md`, `docs/pt-BR/security/rebuilding-lifecycle-packages.md`

- [x] **[P1]** Create troubleshooting guide — added `docs/en/troubleshooting.md` and `docs/pt-BR/troubleshooting.md` with common failures, remediation steps, and how to run each defense manually.
  - Impact: reduces support burden and onboarding friction.
  - Depends on: centralized configuration loader (Section 3.1).
  - Files: `docs/en/troubleshooting.md`, `docs/pt-BR/troubleshooting.md`

---

## 10. Release & Maintenance

### 10.1 Release Readiness

- [x] **[P0]** Define versioning and release checklist — established semantic versioning, created `docs/en/release-checklist.md` and `docs/pt-BR/release-checklist.md`, and documented the supported Node.js/npm version matrix.
  - Impact: makes releases repeatable and predictable.
  - Depends on: CI/CD pipeline (Section 5.1).
  - Files: new `docs/RELEASE_CHECKLIST.md`

- [ ] **[P2]** Add changelog generation automation — script or CI step that updates `CHANGELOG.md` from conventional commits or release tags.
  - Impact: reduces manual release overhead.
  - Depends on: versioning and release checklist (Section 10.1).
  - Files: [CHANGELOG.md](CHANGELOG.md)

### 10.2 Release v1.0.0 Gates

The release v1.0.0 is the final action and is only allowed when every gate below is satisfied.

- [ ] All TODO items in this file are marked complete.
- [ ] `npm test` passes — 299/299 (or current count).
- [ ] `npm run test:coverage` reports ≥ 95% line coverage.
- [ ] `npm run lint` passes.
- [ ] `npm run defence:check-md-links` passes.
- [ ] `bash .husky/pre-commit` passes.
- [ ] `docs/en/` and `docs/pt-BR/` are structurally aligned and synchronized.
- [ ] `PROJECT_STATUS_REPORT.md` is regenerated and shows the maximum score in every category.
- [ ] `CHANGELOG.md` has a `[1.0.0]` entry.
- [ ] Version is bumped in `package.json` and `package-lock.json`.
- [ ] Git tag `v1.0.0` is created and pushed.
- [ ] GitHub Release is published with release notes and SBOM asset.

## Completed

### v1.0.0 Progress

- [x] **End-to-end tests against the real npm registry** — added `tools/e2e/` with an opt-in E2E suite validating `check-package-age.js` and `add-package.js` against stable npm packages. Includes local registry-response cache and strict timeouts.
- [x] **Automated README badge update** — added `tools/update-badge.js` and pre-commit integration to keep the test-count badge synchronized.
- [x] **Historical scan tracking** — added rolling `history` array to `.defence-update-check.json` for quarantine and cadence detection.
- [x] **Confidence score for updates** — added `confidence` and `confidenceLabel` to `check-updates.js` output.
- [x] **Interactive update approval** — added `--interactive` mode to `update-packages.js` with readline prompts and decision persistence.
- [x] **Offline mode for update check** — added `--offline` flag to `check-updates.js` for network-free operation.
- [x] **GitHub issue and PR templates** — added `.github/ISSUE_TEMPLATE/` and `.github/pull_request_template.md`.
- [x] **Dependency license checker** — added `defence:license-check` scripts with SPDX expression handling and multiple output formatters.
- [x] **Dependency sync check script** — added `defence:sync-check` and `post-merge` hook to warn when `node_modules` is out of sync.
- [x] **Update check output formatters** — added `--format=json` and `--format=markdown` to `defence:update-check`.
- [x] **Explanatory `EventEmitter` comment** — documented mock usage in `tools/check-package-age.test.js`.
- [x] **Environment version check docs** — documented `engines` enforcement in setup and quick-reference pages.
- [x] **Reference documentation** — added guidance on secret management, artifact signing, SBOM standards, and secret scanning while keeping `references.md` as a single file.
- [x] **install-defences documentation fix** — corrected internal file list in `tools/install-defences.js`.
- [x] **AI Core customization** — created `.github/copilot-instructions.md`, `.github/instructions/*.md`, agents, skills, prompts, hooks, and `.github/ai-lessons-learned.md`.
- [x] **Release checklist** — created bilingual `docs/en/release-checklist.md` and `docs/pt-BR/release-checklist.md`.
