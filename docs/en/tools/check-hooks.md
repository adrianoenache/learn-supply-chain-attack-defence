# check-hooks

`check-hooks.js` verifies that `.husky/pre-commit` matches the SHA-256 hash stored in `package.json`. It detects accidental or malicious modifications to the commit gate.

## What it does

- Reads the configured `huskyPreCommitHash` from `package.json`.
- Computes the SHA-256 hash of `.husky/pre-commit`.
- Reports whether they match and exits non-zero on mismatch.

Implemented in [tools/check-hooks.js](../../../tools/check-hooks.js).

## Configuration

Store the expected hash in `package.json`:

```json
{
  "defences": {
    "huskyPreCommitHash": "d1856544ae825229b0098409dac911aa10e766a34fdeb6274f7eef0d4cc2e281"
  }
}
```

After a deliberate hook change, update the hash with:

```bash
npm run defence:verify-defences:fix
```

## Usage

```bash
npm run defence:check-hooks
```

## Output example

```text
✅ .husky/pre-commit hash matches package.json.
```

## Related defense layer

- [Defense Layer 12 — Pre-commit hook integrity](../security/defense-layer-12-hook-integrity.md)
