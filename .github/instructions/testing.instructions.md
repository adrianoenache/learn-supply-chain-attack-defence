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
