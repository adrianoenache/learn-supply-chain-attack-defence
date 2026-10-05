# check-updates

`check-updates.js` is a read-only pre-commit helper that reports available updates and classifies them as eligible for immediate adoption or still in quarantine.

## What it does

- Reads current dependencies from `package.json` and `package-lock.json`.
- Fetches latest versions from the npm registry.
- Dedupes registry requests with an in-memory packument cache per run.
- Classifies updates as eligible (old enough) or quarantined (too recent).
- Discovers `intermediateEligible`: versions newer than `wanted` and at most `latest` that already satisfy the age gate, sorted ascending — the last element is the recommended update target. Pre-releases, packument metadata keys, and **deprecated versions** are excluded.
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
    "cacheTtlHours": 24,
    "maxIntermediateEligible": 10
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

# Silent mode (suppresses reports)
npm run defence:update-check -- --silent
```

> `--silent` suppresses reports, but **safety messages are always shown**: the
> out-of-sync warning (recommending `npm ci`) and the offline fallback notices
> still appear, because silently skipping them would hide real risk.

## Output example

```text
Package       Current   Latest   Status
lodash        4.17.20   4.17.21  eligible
sharp         0.33.4    0.33.5   quarantined (2 days old)
```

## Related defense layer

- [Defense Layer 8 — Update availability check](../security/defense-layer-8-update-check.md)
