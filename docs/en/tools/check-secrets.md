# check-secrets

`check-secrets.js` scans files for likely secrets before they are committed. It uses deterministic regular expressions rather than third-party scanning services.

## What it does

- Accepts a list of file paths as arguments, typically from `git diff --cached --name-only`.
- Scans for patterns matching AWS keys, GitHub tokens, npm tokens, and other common secret formats.
- Reports findings with file path, line number, and matched pattern.
- Supports false-positive suppression via `.check-secrets-ignore` (one pattern per line, `#` for comments).

Implemented in [tools/check-secrets.js](../../../tools/check-secrets.js).

## Usage

```bash
# Scan staged files
npm run defence:check-secrets

# Scan specific files
npm run defence:check-secrets -- src/config.js tests/fixture.env

# Quiet mode (exit code only; findings still print)
npm run defence:check-secrets -- --quiet src/config.js
```

`--silent` is kept as a compatibility alias of `--quiet`.

## Output example

```text
  ✓ OK   no secrets detected in 2 file(s)

── Summary ───────────────────────────────────────────
  ✓ OK   2 passed
```

When a potential secret is found:

```text
Potential secrets detected:
  ✗ FAIL src/config.js:3 — AWS access key ID: AKIA...

── Summary ───────────────────────────────────────────
  ✓ OK   0 passed
  ✗ FAIL 1 failed
  Next: review the findings above; add false positives to .check-secrets-ignore
```

## Related defense layer

- Part of the pre-commit pipeline.
- Supports [Defense Layer 5 — Pre-commit hook](../security/defense-layer-5-precommit-hook.md).
