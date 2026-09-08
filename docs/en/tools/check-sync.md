# check-sync

`check-sync.js` verifies that `node_modules` matches the state described in `package-lock.json`. It detects drift caused by manual edits or partial installs.

## What it does

- Reads `package-lock.json` and walks `node_modules`.
- Compares installed versions, missing packages, and extraneous packages.
- Recommends `npm ci` when out of sync.
- Can exit without printing when `--silent` is set.

Implemented in [tools/check-sync.js](../../../tools/check-sync.js). Shared logic lives in [tools/lib/sync-check.js](../../../tools/lib/sync-check.js).

## Usage

```bash
# Check sync status
npm run defence:sync-check

# Auto-fix by running npm ci (use with care)
npm run defence:sync-check -- --fix

# Silent mode
npm run defence:sync-check -- --silent
```

## Output example

```text
✅ node_modules is in sync with package-lock.json.
```

Or when out of sync:

```text
⚠️  node_modules is out of sync with package-lock.json.
   Reason: extraneous package left-pad@1.3.0
   Run the following command to synchronize:
     npm ci
```

## Related defense layer

- [Defense Layer 4 — Deterministic install](../security/defense-layer-4-deterministic-install.md)
