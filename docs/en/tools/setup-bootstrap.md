# setup-bootstrap

`setup-bootstrap.js` performs a controlled first install when `package-lock.json` is missing. It is useful for brand-new clones or projects that have not yet pinned dependencies.

## What it does

- Checks Node.js and npm engine compatibility.
- Verifies there is no existing `package-lock.json`.
- Runs `npm install` with hardened settings.
- Prompts the contributor to review the generated lockfile before committing.

Implemented in [tools/setup-bootstrap.js](../../../tools/setup-bootstrap.js).

## Usage

```bash
npm run defence:bootstrap
```

## Output example

```text
No package-lock.json found. Running controlled first install.
✅ Install completed.
Review package-lock.json and commit it before proceeding.
```

## Related defense layer

- Part of the [secure setup](../setup.md) flow.
