# verify-defences

`verify-defences.js` verifies that the files copied by `install-defences.js` still match the SHA-256 hashes recorded in `.defence-manifest.json`.

## What it does

- Reads `.defence-manifest.json`.
- Computes the current SHA-256 hash of every listed file.
- Reports missing, changed, or extra files.
- Supports JSON output for CI gates.

Implemented in [tools/verify-defences.js](../../../tools/verify-defences.js).

## Usage

```bash
# Verify copied files
npm run defence:verify-defences

# JSON output
npm run defence:verify-defences -- --json

# Silent mode
npm run defence:verify-defences -- --silent

# Regenerate the manifest after deliberate changes
npm run defence:verify-defences:fix
```

## Output example

```text
✅ All 71 files match .defence-manifest.json.
```

## Related defense layer

- Adoption integrity gate.
- Part of the `install-defences-dry-run` CI job.
