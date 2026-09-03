# Testing

The project uses the native Node.js test runner (`node:test`) and assertion module (`node:assert/strict`). No third-party test framework is required.

## Running Tests

```bash
npm test
```

## End-to-end Tests

The project also includes an opt-in E2E suite that validates `check-package-age.js` and `add-package.js` against stable packages on the real npm registry. These tests are skipped by default to keep the regular suite fast and offline-friendly.

```bash
npm run test:e2e
```

Registry responses are cached in `tools/e2e/.cache/` for 24 hours to speed up repeated local runs. Use `E2E_NO_CACHE=true` to force fresh network calls.

## What Is Covered

- Parsing of valid and invalid package specifiers.
- Package-age calculation and concurrency limiter.
- Dependency mode resolution (`--dev`, `--peer`, default).
- Integration scenarios for `check-package-age` and `add-package` using injected dependencies, so mocks and file-system changes work without spawning child processes.
- First-setup bootstrap behavior when `package-lock.json` is missing.
- Cross-project installer behavior, including `--dry-run`, `--force`, conflict detection, and backup creation.
- Controlled dependency update flow in `update-packages.js`.

## Lint, Format and Link Checks

The project uses Biome for linting and formatting. Run these checks before committing:

```bash
npm run lint                  # report lint and format issues
npm run lint:fix              # auto-fix safe issues
npm run format                # format all configured files
npm run defence:check-md-links  # validate local markdown links
```

## Writing New Tests

Tests live in files named `*.test.js`. Use the native runner:

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('description', () => {
  assert.equal(1 + 1, 2);
});
```

## Test Design Conventions

### Dependency Injection

Production modules expose setter functions such as `setSpawnSyncImpl`, `setImpls`, `setNowImpl`, and `resetNowImpl`. Prefer these over monkey-patching globals. This makes tests deterministic and avoids spawning real subprocesses.

```javascript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as myTool from './my-tool.js';

test('mocked subprocess', () => {
  myTool.setSpawnSyncImpl((cmd, args) => ({ status: 0, stdout: '', stderr: '' }));
  // exercise myTool
  myTool.resetSpawnSyncImpl();
});
```

### Subprocess Tests

When you need to test the CLI surface, use `spawnSync` from `node:child_process` with controlled arguments. Avoid relying on real `npm` commands in unit tests; inject the spawn implementation when the module supports it.

### Integration Tests

Cross-tool behavior is covered in `tools/integration.test.js`. These tests use a centralized mock of the HTTPS registry layer (`tools/lib/retry-fetch.js`) and in-memory file-system fixtures. Every integration test has an explicit `timeout` to prevent hangs.

### Time-Dependent Logic

For code that depends on the current date (for example, package-age calculation), use the module's `setNowImpl` / `resetNowImpl` hooks to make assertions deterministic.

## Coverage

The project targets ≥ 95% line coverage using the native Node.js coverage flag:

```bash
npm run test:coverage
```

Do not add external coverage tools such as `c8`; they can introduce transitive dependencies with incompatible licenses. Native coverage is sufficient for the current quality gates.

## Preventing Infinite Loops

Every test that could hang must specify a timeout:

```javascript
test('description', { timeout: 1000 }, () => {
  // ...
});
```

In production code, use bounded loops, explicit iteration caps, and early-exit conditions when processing external data.

## Intentional Hardcoded Values

If a test needs a hardcoded literal (for example, a parser edge-case fixture like `>=99.0.0`), add an inline comment explaining why that value remains hardcoded and is not read from configuration. This rule applies to production code and tests alike.
