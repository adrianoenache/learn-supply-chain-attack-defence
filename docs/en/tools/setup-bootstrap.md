# setup-bootstrap

`setup-bootstrap.js` performs a controlled first install when `package-lock.json` is missing. It is useful for brand-new clones or projects that have not yet pinned dependencies.

## What it does

- Checks Node.js and npm engine compatibility.
- Verifies there is no existing `package-lock.json`.
- Runs `npm install --ignore-scripts --save-exact` (hardened settings, no lifecycle scripts) under the process monitor.
- Runs the package-age check, `npm audit signatures`, and `npm audit --audit-level=high`.
- Prints the install-monitoring report path and reminds the contributor to review the generated lockfile before committing.

Implemented in [tools/setup-bootstrap.js](../../../tools/setup-bootstrap.js).

## Usage

```bash
npm run defence:bootstrap
```

## Output example

Abbreviated real output (the controlled install runs with monitoring, then the age/signature/audit gates):

```text
No package-lock.json found. Running controlled first install...
This generates a lock file without executing lifecycle scripts.

First install: npm install --ignore-scripts --save-exact
...
  ✓ OK   recorded pre-commit hook hash: 3b8b…
  ✓ OK   pre-commit hook integrity verified
  ✓ OK   bootstrap complete

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
  Next: review package.json and package-lock.json, then commit both files
```

## Related defense layer

- Part of the [secure setup](../setup.md) flow.
