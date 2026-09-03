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
