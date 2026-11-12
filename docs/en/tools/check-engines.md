# check-engines

`check-engines.js` validates that the active Node.js and npm versions satisfy the `engines` field in `package.json`.

## What it does

- Reads `engines.node` and `engines.npm` from `package.json`.
- Compares them against `process.version` and `npm --version`.
- Fails fast with a clear message if the runtime is too old.

Implemented in [tools/check-engines.js](../../../tools/check-engines.js).

## Configuration

Configure minimum versions in `package.json`:

```json
{
  "engines": {
    "node": ">=24.22.3",
    "npm": ">=11.19.1"
  }
}
```

## Usage

```bash
npm run defence:check-engines

# Quiet mode (exit code only)
npm run defence:check-engines -- --quiet
```

`--silent` is kept as a compatibility alias of `--quiet`.

## Output example

```text
  ✓ OK   Node.js 24.22.3 (required >=24.22.3)
  ✓ OK   npm 11.19.1 (required >=11.19.1)

── Summary ───────────────────────────────────────────
  ✓ OK   2 passed
```

## Related defense layer

- Part of the [secure setup](../setup.md) flow.
- Kept current by [update-engines](update-engines.md), which manages the floor this tool validates.
