# Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks. The hooks are stored in the `.husky` directory.

## Pre-commit

The pre-commit hook is defined in `.husky/pre-commit`:

```bash
# Husky pre-commit hook: runs the project pre-commit script (signatures + CVE audit)
# and a transitive package-age check to catch manual edits to package.json/package-lock.json.
npm run defence:pre-commit
npm run defence:pkg-age-check -- --transitive
```

### What It Does

1. Runs `npm run defence:pre-commit`, which executes:
   - `npm audit signatures`
   - `npm audit --audit-level=high`
2. Runs a transitive package-age check so that any manual change to `package.json` or `package-lock.json` is also validated.

### Skipping the Hook

> ⚠️ Skipping hooks is not recommended. It defeats the purpose of the defense layers.

If you absolutely must bypass it (for example, in a throwaway local branch), use:

```bash
git commit --no-verify -m "temporary commit"
```

_Last sync: 2026-08-18_.
