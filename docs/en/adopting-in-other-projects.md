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
   - `biome.json`
   - `tools/check-package-age.js`
   - `tools/add-package.js`
   - `tools/check-md-links.js`
   - `tools/check-md-links.test.js`
   - `tools/lib/package-utils.js`
   - `tools/setup-bootstrap.js`
   - `tools/setup-bootstrap.test.js`
   - `tools/check-package-age.test.js`
   - `tools/install-defences.js`
   - `tools/install-defences.test.js`
   - `tools/update-packages.js`
   - `tools/update-packages.test.js`
2. Adds `defence:*` scripts to `package.json`:
   - `setup`
   - `defence:bootstrap`
   - `defence:check-md-links`
   - `defence:pkg-age-check`
   - `defence:reinstall`
   - `defence:update`
   - `defence:pre-commit`
   - `defence:add`
   - `test`
   - `lint`
   - `lint:fix`
   - `format`
   - `prepare`
3. Adds `husky` and `@biomejs/biome` to `devDependencies` if they are not already present.

Existing scripts that do not conflict are preserved. If a target script already exists with a different value, the installer aborts so nothing is overwritten silently.

## After Running the Installer

1. Run `npm install` in the target project to install husky, Biome, and generate a lock file.
   - Alternatively, if there is no `package-lock.json`, run `npm run defence:bootstrap` after the install.
2. Verify the pre-commit hook: `bash .husky/pre-commit`
3. Verify code quality: `npm run lint`
4. Commit `.npmrc`, `.husky/`, `biome.json`, `tools/`, and the updated `package.json`.

## Keeping Files in Sync

Because the installer copies files, future updates to the defence scripts in this repository must be re-copied manually. Re-run the installer with `--force` to update the target project, or copy only the files that changed.
