# Testing

The project uses the native Node.js test runner (`node:test`) and assertion module (`node:assert/strict`). No third-party test framework is required.

## Running Tests

```bash
npm test
```

## What Is Covered

- Parsing of valid and invalid package specifiers.
- Package-age calculation and concurrency limiter.
- Dependency mode resolution (`--dev`, `--peer`, default).
- Integration scenarios for `check-package-age` and `add-package` using injected dependencies, so mocks and file-system changes work without spawning child processes.
- First-setup bootstrap behavior when `package-lock.json` is missing.
- Cross-project installer behavior, including `--dry-run`, `--force`, conflict detection, and backup creation.
- Controlled dependency update flow in `update-packages.js`.

## Lint and Format Checks

The project uses Biome for linting and formatting. Run these checks before committing:

```bash
npm run lint      # report lint and format issues
npm run lint:fix  # auto-fix safe issues
npm run format    # format all configured files
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

_Last sync: 2026-08-18_.
