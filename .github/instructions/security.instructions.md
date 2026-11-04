# Security Instructions

These instructions apply when working on defense scripts, npm configuration, and the project manifest.

Applies to: `tools/**`, `.npmrc`, `package.json`

## Defense-in-Depth Principles

- Never rely on a single check. Each defense layer reinforces the others.
- Prefer deterministic, auditable behavior over convenience.
- Treat the dependency tree as untrusted until verified.

## npm Commands

- Use `npm ci` for installs in CI, setup, and reproducible environments.
- Avoid `npm install` for adding dependencies; use `npm run defence:add` instead.
- Lifecycle scripts are disabled by default via `ignore-scripts=true` in `.npmrc`.

## Verification Gates

Every production dependency must pass:

1. Minimum package age check.
2. Registry signature verification (`npm audit signatures`).
3. Vulnerability audit (`npm audit --audit-level=high`).
4. License compatibility check (`defence:license-check:fail`).

## Secrets Handling

- Do not log or print registry tokens, API keys, or passwords.
- Use `tools/check-secrets.js` before committing files that may contain secrets.
- Keep `.env` files out of the repository.

## Configuration

- Read security thresholds from `tools/lib/config.js`, which loads values from `package.json` and optional `.defence.config.json`.
- Avoid introducing new hardcoded thresholds without a comment explaining why they are not configurable.

## External URL Validation

Every external URL added to documentation, AI customizations, issue templates,
or configuration files must be verified before it is committed:

- Use `fetch_webpage`, `curl -I --max-time 10`, or `npm run defence:check-external-urls`.
- Do not invent schema URLs (for example, `https://code.visualstudio.com/schemas/hooks`).
- If a URL is intentionally dead (kept as a historical record), add it to `.github/known-dead-urls.md`.
- Mark fictional/example URLs with an explicit blockquote saying they are illustrative.

## Pre-Commit Hook Integrity

The `.husky/pre-commit` hook is protected by a SHA-256 hash stored in
`package.json` under `defences.huskyPreCommitHash` and by the adoption manifest
in `.defence-manifest.json`.

If you edit `.husky/pre-commit`:

1. Recompute the SHA-256 hash of the updated hook.
2. Update `defences.huskyPreCommitHash` in `package.json` to that value.
3. Run `npm run defence:verify-defences:fix` to update `.defence-manifest.json`.
4. Commit `.husky/pre-commit`, `package.json`, and `.defence-manifest.json`
   together in the same change.
5. Run `node ./tools/check-hooks.js` to confirm integrity before committing.
