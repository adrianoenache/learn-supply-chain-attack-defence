# install-defences

`install-defences.js` copies this project's supply-chain defenses into another Node.js project without publishing a package. It only reads and copies files; it never executes code from the target directory.

## What it does

- Copies `.npmrc`, Husky hooks, Biome config, tools, libraries, tests, and benchmarks.
- Adds defense-prefixed npm scripts to the target `package.json`.
- Adds `husky` and `@biomejs/biome` to devDependencies.
- Writes `.defence-manifest.json` with SHA-256 hashes of every copied file.
- Refuses to overwrite existing files unless `--force` is passed.
- Creates backups before overwriting.

Implemented in [tools/install-defences.js](../../../tools/install-defences.js).

## Usage

```bash
# Copy defenses into another project
node ./tools/install-defences.js /path/to/target-project

# Dry run
node ./tools/install-defences.js /path/to/target-project --dry-run

# Force overwrite (backup is created)
node ./tools/install-defences.js /path/to/target-project --force

# Update the local manifest in the current project
npm run defence:verify-defences:fix
```

## Output example

```text
Installing supply-chain defences into /path/to/target-project
  Copied .npmrc -> /path/to/target-project/.npmrc
  Copied tools/check-package-age.js -> /path/to/target-project/tools/check-package-age.js
  Wrote .defence-manifest.json with 71 file hash(es).
  Updated package.json with defence scripts and husky devDependency.

Done.
Next steps in the target project:
  1. Run npm install to install husky and generate the lock file.
  2. Run bash .husky/pre-commit to verify the hook.
  3. Commit .npmrc, .husky/, tools/, and package.json changes.
```

## Related defense layer

- [Adopting in other projects](../adopting-in-other-projects.md)
- [Defense Layer 5 — Pre-commit hook](../security/defense-layer-5-precommit-hook.md)
