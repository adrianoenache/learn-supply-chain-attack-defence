# install-defences

`install-defences.js` copies this project's supply-chain defenses into another Node.js project without publishing a package. It only reads and copies files; it never executes code from the target directory.

## What it does

- Copies `.npmrc`, Husky hooks, Biome config, tools, libraries, tests, and benchmarks.
- Adds defense-prefixed npm scripts to the target `package.json` (aborts on conflicting script names — rename the target's script to `<name>:legacy` and re-run).
- Adds `husky` and `@biomejs/biome` to devDependencies, tracking this project's **current** pins at install time.
- Merges the defence configuration blocks (`pkgAgeCheck`, `updateCheck`, `licensesCheck`, …) into the target `package.json` when absent — blocks already defined by the adopter always win.
- Writes `defences.huskyPreCommitHash` for the hook present after copying, so the adopted `check-hooks` gate passes from day one.
- Merges the defence state/cache entries into the target's `.gitignore` (created when absent), so tool state is never committed.
- Writes `.defence-manifest.json` with SHA-256 hashes of every copied file.
- Refuses to overwrite existing files unless `--force` is passed.
- Creates backups before overwriting.

Implemented in [tools/install-defences.js](../../../tools/install-defences.js). The real-world adoption report lives in [Dogfooding report (Fase M.1)](../dogfooding-m1-report.md).

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
  Wrote .defence-manifest.json with <N> file hash(es).
  Updated package.json with defence scripts and husky devDependency.

Done.
Next steps in the target project:
  1. Run `npm install` to install husky and generate the lock file, then `npm run prepare` — the adopted .npmrc sets ignore-scripts=true, which also blocks the automatic prepare run that wires the git hooks.
  2. Run bash .husky/pre-commit to verify the hook.
  3. Commit .npmrc, .husky/, tools/, and package.json changes.
```

## Related defense layer

- [Adopting in other projects](../adopting-in-other-projects.md)
- [Defense Layer 5 — Pre-commit hook](../security/defense-layer-5-precommit-hook.md)
