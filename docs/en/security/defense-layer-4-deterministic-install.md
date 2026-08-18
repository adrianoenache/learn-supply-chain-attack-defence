# Defense Layer 4 — Deterministic Install

`npm ci` installs exact versions from `package-lock.json`. It never updates the lock file or resolves new ranges.

## Command

```bash
npm ci
```

## Where It Runs

- `npm run setup`
- `npm run defence:reinstall`

## Benefits

- Reproducible installs across machines and CI environments.
- Prevents accidental upgrades of transitive dependencies.
- Fails if `package.json` and `package-lock.json` are out of sync.

## When NOT to Use `npm install`

Inside this project, avoid `npm install` for routine setup. Use `npm ci` or the `npm run defence:add` / `npm run defence:reinstall` scripts.

_Last sync: 2026-08-18_.
