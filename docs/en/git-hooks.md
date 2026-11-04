# Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks. The hooks are stored in the `.husky` directory.

## Pre-commit

The pre-commit hook is defined in `.husky/pre-commit`:

```bash
# Husky pre-commit hook: scans staged files for secrets, verifies hook integrity,
# validates the npm configuration surface (.npmrc keys + npm extension files),
# runs lint, refreshes the test badge, runs the project pre-commit script
# (signatures + CVE audit), a transitive package-age check, and a transitive
# license check to catch manual edits to package.json/package-lock.json.
git diff --cached --name-only -z | xargs -0 -r npm run defence:check-secrets --
npm run defence:check-hooks
npm run defence:check-npmrc
# (actionlint runs when available locally; CI enforces it)
npm run lint
npm run defence:check-external-urls
npm run defence:verify-defences:fix && git add .defence-manifest.json
npm run defence:update-badge && git add README.md
npm run defence:pre-commit
npm run defence:pkg-age-check -- --transitive
npm run defence:license-check:fail
```

> The snippet above is a readable summary; the authoritative content is the
> hook file itself, whose integrity is hash-verified by `defence:check-hooks`.

### What It Does

1. Scans staged files for likely secrets with `npm run defence:check-secrets`. This step runs first so that sensitive values are blocked before they reach the repository.
2. Runs `npm run defence:check-hooks` to verify that `.husky/pre-commit` has not been tampered with.
3. Runs `npm run defence:check-npmrc` to validate the npm configuration surface (known keys, lookahead registry, no npm-v12 extension files).
4. Runs `actionlint` on the workflows when the binary is installed locally (CI always enforces it).
5. Runs `npm run lint` to enforce Biome lint and format rules.
6. Runs `npm run defence:check-external-urls` to keep documentation links alive.
7. Runs `npm run defence:verify-defences:fix` to refresh `.defence-manifest.json` hashes and re-stages it.
8. Runs `npm run defence:update-badge` to refresh the test-count badge in `README.md` and re-stages it.
9. Runs `npm run defence:pre-commit`, which executes:
   - `npm audit signatures`
   - `npm audit --audit-level=high`
   - `npm run defence:update-check`
10. Runs a transitive package-age check so that any manual change to `package.json` or `package-lock.json` is also validated.
11. Runs a transitive license check so that incompatible licenses are caught before commit.

## Post-merge

The `.husky/post-merge` hook warns when `node_modules` is out of sync with `package-lock.json` after a `git pull` or `git merge`:

```bash
npm run defence:sync-check
```

This gives you an early signal that a fresh `npm ci` may be needed.

### Secret Scanning

The scanner looks for common secret patterns such as AWS access keys, GitHub tokens, npm tokens, private key blocks, and URLs with embedded credentials. You can suppress false positives by adding ignore patterns to `.check-secrets-ignore` (one pattern per line, `#` for comments).

### Skipping the Hook

> ⚠️ Skipping hooks is not recommended. It defeats the purpose of the defense layers.

If you absolutely must bypass it (for example, in a throwaway local branch), use:

```bash
git commit --no-verify -m "temporary commit"
```
