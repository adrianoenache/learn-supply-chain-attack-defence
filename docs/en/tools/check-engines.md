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
    "node": ">=24.22.2",
    "npm": ">=11.19.1"
  }
}
```

## Usage

```bash
npm run defence:check-engines
```

## Output example

```text
Node.js 24.22.2 (required >=24.22.2)
npm 11.19.1 (required >=11.19.1)
Engine requirements satisfied.
```

## Related defense layer

- Part of the [secure setup](../setup.md) flow.
- Kept current by [update-engines](update-engines.md), which manages the floor this tool validates.
