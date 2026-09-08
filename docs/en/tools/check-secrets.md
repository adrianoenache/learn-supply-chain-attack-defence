# check-secrets

`check-secrets.js` scans files for likely secrets before they are committed. It uses deterministic regular expressions rather than third-party scanning services.

## What it does

- Accepts a list of file paths as arguments, typically from `git diff --cached --name-only`.
- Scans for patterns matching AWS keys, GitHub tokens, npm tokens, and other common secret formats.
- Reports findings with file path, line number, and matched pattern.

Implemented in [tools/check-secrets.js](../../../tools/check-secrets.js).

## Usage

```bash
# Scan staged files
npm run defence:check-secrets

# Scan specific files
npm run defence:check-secrets -- src/config.js tests/fixture.env
```

## Output example

```text
Possible secret in src/config.js:3
  Pattern: AWS access key ID
```

## Related defense layer

- Part of the pre-commit pipeline.
- Supports [Defense Layer 5 — Pre-commit hook](../security/defense-layer-5-precommit-hook.md).
