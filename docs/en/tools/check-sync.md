# check-sync

`check-sync.js` verifies that `node_modules` matches the state described in `package-lock.json`. It detects drift caused by manual edits or partial installs.

## What it does

- Reads `package-lock.json` and walks `node_modules`.
- Compares installed versions, missing packages, and extraneous packages.
- Recommends `npm ci` when out of sync.
- Can exit without printing when `--quiet` is set (`--silent` kept as an alias).
- Ends with the shared structured summary (Phase N output conventions).

Implemented in [tools/check-sync.js](../../../tools/check-sync.js). Shared logic lives in [tools/lib/sync-check.js](../../../tools/lib/sync-check.js).

## Usage

```bash
# Check sync status
npm run defence:sync-check

# Print the recommended fix command (npm ci) — never runs it
npm run defence:sync-check -- --fix

# Quiet mode (exit code only, no output)
npm run defence:sync-check -- --quiet
```

`--silent` is kept as a compatibility alias of `--quiet`.

## Output example

```text
  ✓ OK   node_modules is in sync with package-lock.json

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
```

Or when out of sync:

```text
  ✗ FAIL node_modules is out of sync with package-lock.json
  Reason: extraneous package left-pad@1.3.0
  Run the following command to synchronize:
    npm ci

── Summary ───────────────────────────────────────────
  ✓ OK   0 passed
  ✗ FAIL 1 failed
  Next: npm ci
```

## Related defense layer

- [Defense Layer 4 — Deterministic install](../security/defense-layer-4-deterministic-install.md)
