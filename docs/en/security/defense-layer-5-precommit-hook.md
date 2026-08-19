# Defense Layer 5 — Pre-commit Hook

Husky runs a pre-commit hook on every `git commit`. It executes the same checks used during setup and dependency addition, plus a transitive package-age check.

## Hook File

[.husky/pre-commit](../../../.husky/pre-commit)

```bash
# Husky pre-commit hook: runs the project pre-commit script (signatures + CVE audit)
# and a transitive package-age check to catch manual edits to package.json/package-lock.json.
npm run defence:pre-commit
npm run defence:pkg-age-check -- --transitive
```

## Why Transitive?

`npm install` can change nested dependencies that are not listed in `package.json`. The transitive age check ensures those changes are also vetted before they are committed.

## Bypassing the Hook

Only use `--no-verify` in throwaway local branches. Never use it for commits that will be shared or merged.

