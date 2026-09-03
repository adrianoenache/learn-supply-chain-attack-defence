# Defense Layer 12 — Pre-Commit Hook Integrity

The `.husky/pre-commit` hook is a critical control point. If it is modified by malware or a malicious contributor, the checks that should catch supply-chain attacks can be silently disabled.

## What This Layer Checks

This layer verifies that the pre-commit hook file on disk matches the SHA-256 hash recorded in `package.json`. Any mismatch fails the check.

## Configuration

Store the expected hash in `package.json`:

```json
{
  "defences": {
    "huskyPreCommitHash": "ed257733d0d82c772241a6f180865547fabccb03d72e0fbcfd2f3694a9311991"
  }
}
```

The legacy top-level `huskyPreCommitHash` field is also supported for backwards compatibility.

## Implementation

Implemented in:

- [tools/check-hooks.js](../../../tools/check-hooks.js)
- [tools/setup-bootstrap.js](../../../tools/setup-bootstrap.js)
- [package.json](../../../package.json)

`setup-bootstrap.js` installs the husky hook and records the hash automatically on the first bootstrap. `check-hooks.js` recomputes the hash and compares it to the configured value.

## Usage

Run the check manually:

```bash
npm run defence:check-hooks
```

It is also run automatically by the pre-commit hook and in CI.

## Updating the Hook

When the hook legitimately changes:

1. Edit `.husky/pre-commit`.
2. Run `node tools/setup-bootstrap.js` or compute the new SHA-256 and update `defences.huskyPreCommitHash` in `package.json`.
3. Commit both files together.
