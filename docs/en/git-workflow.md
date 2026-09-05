# Git Workflow

This project uses a small, branch-based workflow that keeps `main` always deployable and routes all changes through reviewed pull requests.

## Branch strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. Direct pushes are blocked. |
| `dev` | Integration branch for the next release. Pushes are allowed, but CI must pass. |
| `feature/*` or `fix/*` | Short-lived branches for individual changes. |

Open a feature branch from `dev`, push your commits, and open a pull request back to `dev`. When the release is ready, merge `dev` into `main` through a pull request.

## Branch protection for `main`

- **Push restriction:** code reaches `main` only through a pull request.
- **Required checks:** the full CI workflow defined in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) must pass.
- **Up-to-date branch:** PRs should be rebased on the latest `main` or `dev` before merging.

See [ci-cd-overview.md](ci-cd-overview.md) for the list of checks.

## Opening a pull request

1. Rebase your branch on the latest `dev`.
2. Run the pre-PR checklist below.
3. Open the PR against `dev` (or `main` for release merges).
4. Wait for all required CI checks to turn green.

## Pre-PR checklist

```bash
npm test
npm run lint
npm run defence:check-md-links   # if markdown files changed
npm run defence:verify-defences
```

Also ensure the [`.husky/pre-commit`](../../.husky/pre-commit) hook ran successfully. It enforces `actionlint` locally when the binary is installed.

## When CI fails

- Click the failing check in the PR to read the logs.
- Fix the root cause locally; do not override checks.
- Push the fix and wait for CI to rerun.
- If a failure is caused by a transient network issue, re-run the specific failed job from the GitHub UI.
