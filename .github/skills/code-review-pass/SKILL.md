---
name: code-review-pass
description: Run the project's full AI code-review pass over a change set, chaining four axes — code quality, code security, dead code removal, and related documentation review — into a single report. Use when the user asks for a complete review of a feature, PR, or file set before merge or release.
argument-hint: "[files, directory, or diff to review]"
disable-model-invocation: true
---

# Code Review Pass

Orchestrates the project's four AI code-review axes into one pass with a
single consolidated report. Each axis has a dedicated skill or tool; this
skill defines the order, the hand-offs, and the output format.

If no target was specified with the invocation, ask the user which files,
directory, or diff to review before proceeding.

## Axes and order

### 1. Code quality

Load the `educational-code-review` skill and apply it to the target files:
headers, actionable error messages, justified hardcoded values, naming, and
tests as documentation.

### 2. Code security

Load the `security-audit` skill and apply it to the target files: dependency
and install behavior, registry trust, secrets, hooks, and `.npmrc`/
`package.json` surfaces. Never weaken an existing gate as a "fix".

### 3. Dead code removal

Run the advisory scanner and triage its candidates:

```bash
npm run defence:check-dead-code
```

Triage rules (the tool is deliberately advisory — static CommonJS analysis
cannot prove unreachability):

- **Unexport, don't delete**, when the symbol is still used inside its own
  file. Deletion is only for symbols with zero internal uses.
- **Keep and add a test** when the export is a documented extension point
  (e.g. `KNOWN_KEYS`/`LOOKAHEAD_KEYS` in check-npmrc.js) or a pure helper
  worth direct coverage — tests are the executable documentation.
- **Beware dynamic consumption.** This codebase uses
  `require(...).member()` inline access, alias indirection in test harnesses
  (`SCRIPT_PATH` + `readScriptExports`), and DI contracts
  (`setImpls`/`resetImpls`). After acting on any candidate, the full
  `npm test` suite is the arbiter — it must stay green. (Lesson of
  2026-11-03: acting on an immature candidate list broke 35 tests.)
- Every removal must reference this axis in its commit and keep the suite
  green.

### 4. Related documentation review

Load the `docs-completeness` skill and apply it to the documentation related
to the target: for every code change, check that the corresponding pages in
`docs/en/` and `docs/pt-BR/` exist, are synchronized, and are linked from
the indexes; run `npm run defence:check-md-links`.

## Output format

Produce one report with a section per axis, in this order:

1. **Quality** — findings with file:line and concrete suggestion.
2. **Security** — findings with the defense layer affected.
3. **Dead code** — scanner output + triage decision per candidate
   (unexport / delete / keep-with-test / false positive and why).
4. **Documentation** — gaps in both languages and link status.

Close with a summary table: axis → findings count → action taken
(fixed / follow-up item / dismissed with reason).

## Constraints

- Do not weaken security gates or bypass checks.
- Run `npm test`, `npm run lint`, and `npm run defence:check-md-links` after
  applying any fix; all must pass.
- Follow the commit granularity rule: review fixes land in separate commits
  per intent, never mixed with the feature under review.
