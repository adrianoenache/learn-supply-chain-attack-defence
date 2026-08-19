# Setup

The `setup` npm script installs dependencies and runs every security layer in the correct order.

## What It Runs

```bash
"setup": "node --version && npm --version && npm run defence:pkg-age-check && npm ci && npm audit signatures && npm run prepare"
```

The script starts with `node --version && npm --version` so it fails early if the local environment does not satisfy the `engines` field in `package.json` (Node.js >= 24.16.0 and npm >= 11.13.0). This prevents confusing failures later in the setup flow.

1. `npm run defence:pkg-age-check` — ensure every direct dependency is at least 7 days old.
2. `npm ci` — deterministic install from `package-lock.json`.
3. `npm audit signatures` — verify registry signatures of installed packages.
4. `npm run prepare` — install Husky hooks.

The script `defence:pre-commit` (used by the Git hook) also runs `npm audit --audit-level=high` to fail on high or critical CVEs.

## First-Time Setup (No `package-lock.json`)

If the repository was just created or `package-lock.json` is missing, `npm ci` will fail. In that case, run the controlled bootstrap:

```bash
npm run defence:bootstrap
```

The bootstrap script:

1. Runs `npm install --ignore-scripts --save-exact` to generate the first lock file without executing lifecycle scripts.
2. Runs `npm run defence:pkg-age-check`.
3. Runs `npm audit signatures`.
4. Runs `npm audit --audit-level=high`.

After bootstrap, review `package.json` and `package-lock.json` and commit both. From then on, use `npm run setup` normally.

## Lint and Format

After setup, keep code quality checks in the pre-commit flow:

```bash
npm run lint      # check code with Biome
npm run lint:fix  # auto-fix Biome issues
npm run format    # format code with Biome
```

## Updating Dependencies

To update existing dependencies in a controlled way, use the dedicated script instead of `npm update` directly:

```bash
npm run defence:update
```

The `defence:update` script runs `npm update`, then re-runs the transitive package-age check, signature verification, and vulnerability audit.

## When to Run `setup`

- Right after cloning the repository.
- After pulling updates from another branch.
- As a baseline before adding or removing dependencies.

## Exit Codes

If any step fails, the script exits with a non-zero code. Fix the reported issue before continuing.
