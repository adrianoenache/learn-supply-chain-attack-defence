# Adopting Defences in Other Projects

You can copy the defences from this repository into another Node.js project without publishing an npm package. The included installer copies the required files and updates the target `package.json`.

## Option A — Copy Files with the Installer

From the root of this repository, run:

```bash
node ./tools/install-defences.js /path/to/target-project
```

To preview the changes without applying them:

```bash
node ./tools/install-defences.js /path/to/target-project --dry-run
```

If a file already exists in the target project, the installer aborts. To overwrite and create backups, add `--force`:

```bash
node ./tools/install-defences.js /path/to/target-project --force
```

## What the Installer Does

1. Copies the following files into the target project:
   - `.npmrc`
   - `.husky/pre-commit`
   - `tools/check-package-age.js`
   - `tools/add-package.js`
   - `tools/lib/package-utils.js`
   - `tools/setup-bootstrap.js`
   - `tools/check-package-age.test.js`
2. Adds `defence:*` scripts to `package.json`:
   - `setup`
   - `defence:bootstrap`
   - `defence:pkg-age-check`
   - `defence:reinstall`
   - `defence:pre-commit`
   - `defence:add`
   - `test`
   - `prepare`
3. Adds `husky` to `devDependencies` if it is not already present.

Existing scripts that do not conflict are preserved. If a target script already exists with a different value, the installer aborts so nothing is overwritten silently.

## After Running the Installer

1. Run `npm install` in the target project to install husky and generate a lock file (or run `npm run defence:bootstrap` if there is no `package-lock.json`).
2. Verify the pre-commit hook: `bash .husky/pre-commit`
3. Commit `.npmrc`, `.husky/`, `tools/`, and the updated `package.json`.

## Keeping Files in Sync

Because the installer copies files, future updates to the defence scripts in this repository must be re-copied manually. Re-run the installer with `--force` to update the target project, or copy only the files that changed.

_Last sync: 2026-08-18_.
