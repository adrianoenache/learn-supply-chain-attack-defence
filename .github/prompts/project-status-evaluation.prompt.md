# Project Status Evaluation

Evaluate the current project status against the v1.0.0 readiness criteria.

## Context

The project aims for a 10/10 quality score across security, code quality, performance,
documentation, and AI-assisted development before planning release v1.0.0. The
authoritative plan is `.github/PLAN.md`.

## Task

1. Read `.github/PLAN.md` and `TODO.md` to identify current phase and open items.
2. Collect current metrics:
   - `npm test` result and test count.
   - `npm run test:coverage` line coverage.
   - `npm run lint` result.
   - `npm run defence:check-md-links` result.
   - `npm run defence:verify-defences` result.
3. Check for open P0 items in `TODO.md`.
4. Compare the state to the previous `PROJECT_STATUS_REPORT.md` (if it exists).
5. Decide whether the project has reached 10/10 or what remains.
6. If ready, outline the release v1.0.0 plan (tag, GitHub Release, SBOM asset).

## Constraints

- Do not declare release readiness without explicit maintainer approval.
- A 10/10 score requires zero open P0 items and passing all gates.
- Update `TODO.md` with any derived actions under the correct phase label.

## Output

Provide:
1. Overall readiness verdict (ready / not ready) with evidence.
2. Current metrics summary.
3. Open blockers, if any.
4. Recommended next steps or release plan outline.
