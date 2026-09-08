# check-updates

`check-updates.js` is a read-only pre-commit helper that reports available updates and classifies them as eligible for immediate adoption or still in quarantine.

## What it does

- Reads current dependencies from `package.json` and `package-lock.json`.
- Fetches latest versions from the npm registry.
- Dedupes registry requests with an in-memory packument cache per run.
- Classifies updates as eligible (old enough) or quarantined (too recent).
- Emits table, JSON, or Markdown reports.

Implemented in [tools/check-updates.js](../../../tools/check-updates.js).

## Configuration

Behavior is configured in `package.json` under `updateCheck`:

```json
{
  "updateCheck": {
    "minAgeDays": 7,
    "remindEveryDays": 1,
    "alwaysRemind": false,
    "registryTimeoutMs": 10000,
    "cacheTtlHours": 24
  }
}
```

## Usage

```bash
# Default run
npm run defence:update-check

# Force check even if recently reminded
npm run defence:update-check -- --force

# Offline mode
npm run defence:update-check -- --offline

# JSON output
npm run defence:update-check -- --format=json
```

## Output example

```text
Package       Current   Latest   Status
lodash        4.17.20   4.17.21  eligible
sharp         0.33.4    0.33.5   quarantined (2 days old)
```

## Related defense layer

- [Defense Layer 8 — Update availability check](../security/defense-layer-8-update-check.md)
