# Project Evaluation Instructions

These instructions apply when assessing project readiness, updating status reports,
or planning the release v1.0.0.

Applies to: `PROJECT_STATUS_REPORT.md`, `TODO.md`, `.github/PLAN.md`, `package.json`,
`CHANGELOG.md`

## Source of Truth

- Use `.github/PLAN.md` as the authoritative plan. Session memory may be lost;
  do not rely solely on `/memories/session/plan.md`.
- If the two plans diverge, `.github/PLAN.md` takes precedence.

## Metrics

- Collect real metrics before scoring:
  - `npm test` result and test count.
  - `npm run test:coverage` line coverage.
  - `npm run lint` result.
  - `npm run defence:check-md-links` result.
  - `npm run defence:verify-defences` result.

## Scoring

- A 10/10 quality score requires zero open P0 items and passing gates in every
  category (security, code quality, performance, documentation, AI-assisted development).
- Do not inflate scores; every category must have concrete evidence.

## Release Gates

- Release v1.0.0 (Fase K) only starts after:
  - A 10/10 score in `PROJECT_STATUS_REPORT.md`.
  - Zero open P0 items in `TODO.md`.
  - Explicit maintainer approval.
- The release plan must include tag creation, GitHub Release notes, and SBOM asset.

## Synchronization

- After a status analysis, update `TODO.md` with any derived actions under the
  correct phase label (AI-0, E, F, G, H, I, J, or K).
- Keep `CHANGELOG.md` `[Unreleased]` section up to date with significant changes.
