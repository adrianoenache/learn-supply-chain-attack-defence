# Code Review Improvements — Fase G

Audit date: 2026-10-07. Auditor: AI-assisted review (educational-code-review
skill conventions) over `tools/*.js` and `tools/lib/*.js` (34 production files,
excluding `*.test.js`).

## Verdict

The codebase is in better shape than the phase plan assumed. **No P0 issues.**
Every production file already has a purpose header, and error messages are
predominantly actionable (they state what failed, which resource is involved,
and the sanctioned next step). One P1 was found and fixed in this pass; two P2
items remain as documented debt.

## Header comment standard (formalized)

The de-facto standard, present in all 34 production files, is now the documented
rule:

1. `#!/usr/bin/env node` (executable tools only).
2. `'use strict'`.
3. A `//` block header covering: what the file does, why it exists, the primary
   CLI usage or entry point, and security caveats a learner should know.

Verified in this audit: `add-package.js`, `check-updates.js`, `update-packages.js`,
`lib/config.js`, `lib/trust-engine.js`, and 29 others all follow it.

## Findings

### P1 — fixed in this pass

| Finding | File | Fix |
| --- | --- | --- |
| Trust-score weights and thresholds (age 20, trustedMin 70, etc.) were hardcoded without explaining the security posture they encode. | `tools/lib/trust-engine.js` | Added inline justification: weights sum to 100 by design (score reads as a percentage), age is the strongest signal because time filters hijacked-release campaigns, and the 70/40 bands prevent a single weak strong-signal from reaching auto-trust. |

### P2 — documented debt (not blocking)

| Finding | File | Recommendation |
| --- | --- | --- |
| `add-package.js` mixes `console.error` + `process.exit(1)` with thrown errors in adjacent paths; two messages repeat the usage examples. | `tools/add-package.js` | When the file is next touched, consolidate on one exit style and extract the usage text into a single constant. |
| Several test files repeat numeric fixtures (ports, byte sizes) without per-file justification comments. | `tools/*.test.js` | Acceptable per the testing instructions (deterministic fixtures); add comments only when a fixture value is non-obvious. |

## Coverage note

Line coverage is 94.70% — just below the ≥ 95% target. The coverage item lives
in `TODO.md` under this phase (G) with the current hotspot list produced by
`npm run test:coverage`.

## Validation after this pass

- `npm test` — 844/844 passing.
- `npm run lint` / `format:check` — clean.
- `npm run defence:check-md-links` — 178 files, no broken links.
