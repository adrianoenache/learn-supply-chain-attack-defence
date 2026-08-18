# Adding Dependencies

New dependencies must be added through the controlled `npm run add` script instead of `npm install`.

## Why a Script?

`npm install` can silently upgrade transitive dependencies and bypass the package-age gate. The `add` script wraps the process with the same defenses used during setup.

## Usage

```bash
# Add a runtime dependency
npm run add -- lodash

# Add a development dependency
npm run add -- --dev eslint

# Add a peer dependency
npm run add -- --peer some-pkg

# Simulate the operation without changing files
npm run add -- lodash --dry-run
```

## What the Script Checks

1. Parses the package specifier and rejects shell metacharacters.
2. Verifies the requested package is at least 7 days old.
3. Installs the dependency (`npm install <pkg> --save-prod|save-dev|save-peer`).
4. Runs `npm audit signatures`.
5. Runs `npm audit --audit-level=high`.
6. Runs a transitive package-age check.

## Manual Edits

Avoid editing `package.json` or `package-lock.json` by hand. If you do, the pre-commit hook will still run the transitive age check, but fixing failures is harder than going through the `add` script.

_Last sync: 2026-08-18_.
