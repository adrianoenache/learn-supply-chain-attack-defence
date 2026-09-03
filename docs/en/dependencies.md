# Adding Dependencies

New dependencies must be added through the controlled `npm run defence:add` script instead of `npm install`.

## Why a Script?

`npm install` can silently upgrade transitive dependencies and bypass the package-age gate. The `defence:add` script wraps the process with the same defenses used during setup.

## Usage

```bash
# Add a runtime dependency
npm run defence:add -- lodash@4.17.21

# Add a development dependency
npm run defence:add -- --dev @biomejs/biome@2.5.8

# Add a peer dependency
npm run defence:add -- --peer some-pkg@1.0.0

# Simulate the operation without changing files
npm run defence:add -- lodash@4.17.21 --dry-run
```

## What the Script Checks

1. Parses the package specifier and rejects shell metacharacters.
2. Verifies the requested package is at least 7 days old.
3. Installs the dependency (`npm install <pkg> --save-prod|save-dev|save-peer`).
4. Runs `npm audit signatures`.
5. Runs `npm audit --audit-level=high`.
6. Runs a transitive package-age check.
7. Runs a transitive dependency license check (`npm run defence:license-check:fail`).

## Updating Existing Dependencies

To update dependencies that are already declared in `package.json`, use the controlled update script:

```bash
npm run defence:update
```

This runs `npm update` and then re-runs the package-age check (`--transitive`), signature verification, and vulnerability audit. It respects the same `.npmrc` constraints as the rest of the project.

## Manual Edits

Avoid editing `package.json` or `package-lock.json` by hand. If you do, the pre-commit hook will still run the transitive age check, but fixing failures is harder than going through the `defence:add` or `defence:update` scripts.
