# Quick Reference

A concise list of every command you need when working with this project.

## First-Time Setup

```bash
# Clone and install (requires Node.js >= 24.16.0 and npm >= 11.13.0)
git clone git@github.com:adrianoenache/learn-supply-chain-attack-defence.git
cd learn-supply-chain-attack-defence
npm run setup
```

## Daily Commands

| Command | What it does |
| --- | --- |
| `npm run setup` | Runs age check, `npm ci`, signature audit, and installs Husky hooks. |
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

## Security / Maintenance Commands

| Command | What it does |
| --- | --- |
| `npm run defence:pkg-age-check` | Checks direct dependencies against the 7-day minimum age. |
| `npm run defence:pkg-age-check -- --transitive` | Checks all resolved packages in `package-lock.json`. |
| `npm run defence:bootstrap` | First-install helper when `package-lock.json` is missing. |
| `npm run defence:reinstall` | Wipes `node_modules`, reinstalls, and re-runs all checks. |
| `npm run defence:pre-commit` | Runs signature and vulnerability audits manually. |
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
