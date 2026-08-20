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
