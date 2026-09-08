# Code Review for Learning

Review the following code as a learning resource for supply-chain defense.

## Context

This project teaches defense-in-depth against npm supply-chain attacks. Code must be
secure, correct, and easy to understand for learners and practitioners.

## Files to Review

```
__LIST_FILES_OR_PASTE_CODE__
```

## Task

1. Check that every file has a complete header comment (purpose, usage, caveats).
2. Verify error messages are actionable and specific.
3. Audit hardcoded values for inline justification or configurability.
4. Review naming, comments, and overall clarity from a learner's perspective.
5. Check that security-layer references are used where appropriate.
6. Verify tests are readable and cover the new behavior.

## Constraints

- Do not weaken security gates or bypass checks.
- Do not suggest adding dependencies without using `npm run defence:add`.
- Every hardcoded value must either be configurable or justified with a comment.

## Output

Provide:
1. A 1-2 sentence educational impact summary.
2. A prioritized list of findings (P0/P1/P2).
3. Required fixes or "Educational code review passed."
