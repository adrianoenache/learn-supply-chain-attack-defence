# Testing Instructions

These instructions apply when writing or modifying tests for the defense scripts.

Applies to: `tools/**/*.test.js`

## Test Framework

- Use the native Node.js test runner: `import { test } from 'node:test'`.
- Use strict assertions: `import assert from 'node:assert/strict'`.
- Do not introduce Jest, Mocha, Vitest, or other third-party test frameworks.

## Mocking

- Prefer dependency injection over monkey-patching globals.
- Use `set*Impl` / `reset*Impl` functions exposed by production modules when available.
- For subprocess behavior, inject `spawnSync` via the module's setter function and reset it after each test.

## Test Structure

- Name test files `*.test.js` and place them next to the module they cover.
- Group related tests using `describe()` when it improves readability.
- Every test that can hang must include a `timeout` option.

## Gates Must Prove They Check (Cowork Lesson 3)

Every gate (defense script that can fail a commit or CI run) must ship with
at least one test that makes it **fail on purpose** — asserting the failing
exit code or the blocked outcome, not just the happy path. A gate that can
only pass is a gate that eventually passes while checking nothing (real
incidents here: the transitive age-gate no-op, caught by the v1.0.0 release
checklist; Microsoft's `lint-size-check | tail` case).

- When adding or changing a gate, the failing-path test lands in the same
  commit.
- Prefer testing the decision boundary: feed the gate an input that must be
  rejected and assert `exit 1` / the blocking message.
- Revert-and-retest when fixing a gate: the regression test must fail
  without the fix (that is the evidence the test tests something).
- Existing gates were audited on 2026-11-12: all 12 blocking gates have
  explicit failing-path tests (see DECISIONS.md, ADR 2026-11-12).

## Coverage

- The project targets ≥ 95% line coverage using native Node.js coverage: `node --experimental-test-coverage`.
- Avoid adding external coverage tools; they may introduce license-incompatible transitive dependencies.

## Fixtures

- Keep fixtures deterministic and version-pinned.
- Document any intentionally hardcoded fixture values with an inline comment.
- Use the shared registry cache and retry-fetch layers instead of calling `https.get` directly.

## Validation

After adding or changing tests, run:

```bash
npm test
npm run test:coverage
npm run lint
```
