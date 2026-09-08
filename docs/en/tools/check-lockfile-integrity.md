# check-lockfile-integrity

`check-lockfile-integrity.js` verifies that every entry in `package-lock.json` has a strong SHA-512 integrity field. Weak or missing integrity values are rejected.

## What it does

- Parses `package-lock.json`.
- Checks every package entry for an `integrity` field.
- Rejects `sha1` or missing integrity.
- Emits table, JSON, or Markdown reports.

Implemented in [tools/check-lockfile-integrity.js](../../../tools/check-lockfile-integrity.js).

## Usage

```bash
# Report mode
npm run defence:check-lockfile-integrity

# JSON output
npm run defence:check-lockfile-integrity -- --format=json

# Silent mode (exit code only)
npm run defence:check-lockfile-integrity -- --silent
```

## Output example

```text
✅ All lockfile entries have SHA-512 integrity.
```

## Related defense layer

- [Defense Layer 4 — Deterministic install](../security/defense-layer-4-deterministic-install.md)
