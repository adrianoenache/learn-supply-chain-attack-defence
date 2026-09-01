# Git Hooks

This project uses [Husky](https://typicode.github.io/husky/) to manage Git hooks. The hooks are stored in the `.husky` directory.

## Pre-commit

The pre-commit hook is defined in `.husky/pre-commit`:

```bash
# Husky pre-commit hook: scans staged files for secrets, runs lint, the project
# pre-commit script (signatures + CVE audit), and a transitive package-age check
# to catch manual edits to package.json/package-lock.json.
git diff --cached --name-only -z | xargs -0 -r npm run defence:check-secrets --
npm run lint
npm run defence:update-badge && git add README.md
npm run defence:pre-commit
npm run defence:pkg-age-check -- --transitive
```

### What It Does

1. Scans staged files for likely secrets with `npm run defence:check-secrets`. This step runs first so that sensitive values are blocked before they reach the repository.
2. Runs `npm run lint` to enforce Biome lint and format rules.
3. Runs `npm run defence:update-badge` to refresh the test-count badge in `README.md`.
4. Runs `npm run defence:pre-commit`, which executes:
   - `npm audit signatures`
   - `npm audit --audit-level=high`
5. Runs a transitive package-age check so that any manual change to `package.json` or `package-lock.json` is also validated.

### Secret Scanning

The scanner looks for common secret patterns such as AWS access keys, GitHub tokens, npm tokens, private key blocks, and URLs with embedded credentials. You can suppress false positives by adding ignore patterns to `.check-secrets-ignore` (one pattern per line, `#` for comments).

### Skipping the Hook

> ⚠️ Skipping hooks is not recommended. It defeats the purpose of the defense layers.

If you absolutely must bypass it (for example, in a throwaway local branch), use:

```bash
git commit --no-verify -m "temporary commit"
```
