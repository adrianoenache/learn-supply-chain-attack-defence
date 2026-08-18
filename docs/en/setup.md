# Setup

The `setup` npm script installs dependencies and runs every security layer in the correct order.

## What It Runs

```bash
"setup": "npm ci && npm audit signatures && npm audit --audit-level=high && npm run pkg-age-check"
```

1. `npm ci` — deterministic install from `package-lock.json`.
2. `npm audit signatures` — verify registry signatures of installed packages.
3. `npm audit --audit-level=high` — fail the build if any high or critical CVE is found.
4. `npm run pkg-age-check` — ensure every direct dependency is at least 7 days old.

## When to Run It

- Right after cloning the repository.
- After pulling updates from another branch.
- As a baseline before adding or removing dependencies.

## Exit Codes

If any step fails, the script exits with a non-zero code. Fix the reported issue before continuing.

_Last sync: 2025-06-25_
