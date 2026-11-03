# Defense Layer 5 — Pre-commit Hook

Husky runs a pre-commit hook on every `git commit`. It executes the same checks used during setup and dependency addition, plus a transitive package-age check, a transitive license check, a secrets scan, hook-integrity verification, the npm configuration surface check, external-URL validation, and the adoption-manifest and test-badge refreshes.

## Hook File

[.husky/pre-commit](../../../.husky/pre-commit)

```bash
git diff --cached --name-only -z | xargs -0 -r npm run defence:check-secrets --
npm run defence:check-hooks
npm run defence:check-npmrc
npm run lint
npm run defence:check-external-urls
npm run defence:verify-defences:fix && git add .defence-manifest.json
npm run defence:update-badge && git add README.md
npm run defence:pre-commit
npm run defence:pkg-age-check -- --transitive
npm run defence:license-check:fail
```

> Readable summary — the hash-verified hook file is authoritative. The full
> step-by-step breakdown lives in [Git hooks](../git-hooks.md).

## Why Transitive?

`npm install` can change nested dependencies that are not listed in `package.json`. The transitive age check ensures those changes are also vetted before they are committed.

## Bypassing the Hook

Only use `--no-verify` in throwaway local branches. Never use it for commits that will be shared or merged.
