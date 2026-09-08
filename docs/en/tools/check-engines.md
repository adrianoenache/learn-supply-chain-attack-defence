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
    "node": ">=24.19.0",
    "npm": ">=11.17.0"
  }
}
```

## Usage

```bash
npm run defence:check-engines
```

## Output example

```text
Node.js: v24.19.0 >= >=24.19.0 ✓
npm: 11.17.0 >= >=11.17.0 ✓
```

## Related defense layer

- Part of the [secure setup](../setup.md) flow.
