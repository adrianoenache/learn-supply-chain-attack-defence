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

1. Copies the defence files into the target project:
   - Hardened configuration: `.npmrc`, `.husky/pre-commit`, `.husky/post-merge`,
     `biome.json`.
   - Defence scripts under `tools/`, including their tests (for example
     `add-package.js`, `check-package-age.js`, `check-licenses.js`,
     `check-updates.js`, `check-secrets.js`, `generate-sbom.js`,
     `run-audit-with-retry.js`, `update-packages.js`, `verify-defences.js`).
   - Shared libraries under `tools/lib/` (for example `config.js`,
     `registry-cache.js`, `retry-fetch.js`, `sync-check.js`).
   - Performance benchmarks under `tools/perf/`.
   - The installer itself and its test suite.

   The authoritative list is `FILES_TO_COPY` in
   [`tools/install-defences.js`](../../tools/install-defences.js).

   It also writes `.defence-manifest.json` in the target project with SHA-256
   hashes of the copied files.
2. Adds `defence:*` scripts to `package.json`. The authoritative list is
   `SCRIPTS_TO_ADD` in
   [`tools/install-defences.js`](../../tools/install-defences.js). Notable
   scripts include:
   - `setup`
   - `defence:add`, `defence:bootstrap`, `defence:update`
   - `defence:audit`, `defence:pre-commit`
   - `defence:check-engines`, `defence:check-hooks`, `defence:check-md-links`,
     `defence:check-secrets`, `defence:check-lockfile-integrity`
   - `defence:pkg-age-check`, `defence:sync-check`, `defence:update-check`
   - `defence:license-check`, `defence:generate-sbom`, `defence:verify-defences`
   - `defence:perf`
   - `test`, `lint`, `lint:fix`, `format`, `prepare`
3. Adds `husky` and `@biomejs/biome` to `devDependencies` if they are not already present.

Existing scripts that do not conflict are preserved. If a target script already exists with a different value, the installer aborts so nothing is overwritten silently.

## After Running the Installer

1. Run `npm install` in the target project to install husky, Biome, and generate a lock file.
   - Alternatively, if there is no `package-lock.json`, run `npm run defence:bootstrap` after the install.
2. Verify the pre-commit hook: `bash .husky/pre-commit`
3. Verify code quality: `npm run lint`
4. Commit `.npmrc`, `.husky/`, `biome.json`, `tools/`, `.defence-manifest.json`, and the updated `package.json`.

## Keeping Files in Sync

Because the installer copies files, future updates to the defence scripts in this repository must be re-copied manually. Re-run the installer with `--force` to update the target project, or copy only the files that changed.
