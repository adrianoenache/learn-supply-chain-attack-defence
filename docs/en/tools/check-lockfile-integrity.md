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

# Markdown output
npm run defence:check-lockfile-integrity -- --format=markdown

# Quiet mode (exit code only)
npm run defence:check-lockfile-integrity -- --quiet
```

`--silent` is kept as a compatibility alias of `--quiet`.

## Output example

```text
  ✓ OK   all registry lockfile entries have SHA-512 integrity

── Summary ───────────────────────────────────────────
  ✓ OK   12 passed
```

## Related defense layer

- [Defense Layer 4 — Deterministic install](../security/defense-layer-4-deterministic-install.md)

## Git/file dependencies

Entries resolved from git URLs or `file:`/`link:` paths never carry a tarball integrity hash — they pin by commit in the resolved URL. They are reported in their own informational section and do not fail the check; registry entries still must carry SHA-512.
