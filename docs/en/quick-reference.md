# Quick Reference

A concise list of every command you need when working with this project.

## First-Time Setup

```bash
# Clone and install (requires Node.js >= 24.19.0 and npm >= 11.17.0)
git clone git@github.com:adrianoenache/learn-supply-chain-attack-defence.git
cd learn-supply-chain-attack-defence
npm run setup
```

## Daily Commands

| Command | What it does |
| --- | --- |
| `npm run setup` | Runs engine check, age check, `npm ci`, signature audit, and installs Husky hooks. Starts with `npm run defence:check-engines` to enforce `engines` requirements. |
| `npm test` | Runs the full test suite with the native Node.js test runner. |
| `npm run lint` | Reports lint and format issues with Biome. |
| `npm run lint:fix` | Auto-fixes safe Biome issues. |
| `npm run format` | Formats all configured files with Biome. |

## Dependency Commands

| Command | What it does |
| --- | --- |
| `npm run defence:add -- pkg@x.y.z` | Adds a runtime dependency through the security gate. |
| `npm run defence:add -- --dev pkg@x.y.z` | Adds a devDependency through the security gate. |
| `npm run defence:add -- --peer pkg@x.y.z` | Adds a peerDependency through the security gate. |
| `npm run defence:add -- pkg@x.y.z --dry-run` | Simulates the age check without installing. |
| `npm run defence:update` | Updates dependencies with post-update security checks. |
| `npm run defence:update -- --dry-run` | Simulates the update flow. |
| `npm run defence:update-check` | Warns about available updates without installing them. |
| `npm run defence:update-check:force` | Ignores cache and rescans for available updates. |
| `npm run defence:update-check:json` | JSON output of available updates. |
| `npm run defence:update-check -- --format=markdown` | Markdown output of available updates. |
| `npm run defence:update-check:offline` | Uses cached scan without network calls. |
| `npm run defence:sync-check` | Verifies `node_modules` matches `package-lock.json`. |
| `npm run defence:sync-check -- --fix` | Prints the `npm ci` command when out of sync. |
| `npm run defence:license-check` | Scans dependency licenses against allow / deny lists. |
| `npm run defence:license-check:fail` | Exits 1 on prohibited or unknown licenses. |
| `npm run defence:license-check:json` | JSON output of the license scan. |
| `npm run defence:license-check -- --format=markdown` | Markdown output of the license scan. |
| `npm run defence:license-check -- --pkg=name@version` | Checks a single package's license. |

## Security / Maintenance Commands

| Command | What it does |
| --- | --- |
| `npm run defence:pkg-age-check` | Checks direct dependencies against the 7-day minimum age. |
| `npm run defence:pkg-age-check -- --transitive` | Checks all resolved packages in `package-lock.json`. |
| `npm run defence:bootstrap` | First-install helper when `package-lock.json` is missing. |
| `npm run defence:reinstall` | Wipes `node_modules`, reinstalls, and re-runs all checks. |
| `npm run defence:pre-commit` | Runs signature, vulnerability, and update-availability checks. |
| `bash .husky/pre-commit` | Runs the full pre-commit hook locally. |

## Cross-Project Adoption

```bash
# Copy defences into another project
node ./tools/install-defences.js /path/to/target-project

# Preview changes
node ./tools/install-defences.js /path/to/target-project --dry-run

# Overwrite existing files (backups are created)
node ./tools/install-defences.js /path/to/target-project --force
```
