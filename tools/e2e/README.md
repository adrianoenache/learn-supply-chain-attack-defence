# End-to-end Tests

This directory contains opt-in end-to-end tests that exercise project tools against the real npm registry.

## Why Opt-in?

These tests hit `registry.npmjs.org` over the network. They are skipped by default so that regular unit-test runs and CI pipelines stay fast, deterministic, and offline-friendly.

## Running

```bash
# Run only the E2E suite
npm run test:e2e

# Same thing, manually
RUN_E2E_TESTS=true node --test tools/e2e/*.test.js

# Bypass the local registry cache and force fresh network calls
E2E_NO_CACHE=true npm run test:e2e
```

## Cache

Registry responses are cached in `tools/e2e/.cache/` for up to 24 hours. This speeds up repeated local runs. The cache directory is git-ignored and must never be committed.

- `E2E_NO_CACHE=true` — always fetch from the registry.
- `E2E_CACHE_TTL_HOURS=<number>` — change the cache TTL (default: 24).

## Safety

- Each test has a 30-second timeout.
- Tool invocations use `spawnSync` with a 30-second timeout.
- Registry requests use a 10-second `https` timeout.
- No automatic retries are performed, preventing infinite loops on network errors.

## What Is Covered

- `tools/check-package-age.js --pkg <name>@<version>` against stable packages.
- `tools/add-package.js <name>@<version> --dry-run` against stable packages.
- Failure paths for missing packages and invalid argument combinations.
