# Check Hardcoded Values

Audit the provided file for hardcoded values that should be configurable or need inline justification.

## Context

Project rule: every intentional hardcoded value in code must be accompanied by an inline comment explaining why that specific value remains hardcoded and is not configurable.

Acceptable hardcodes include:
- Parser edge-case fixtures.
- Physical constants and conversion factors (e.g., `1024 * 1024`, `1000 * 60 * 60 * 24`).
- Protocol defaults with stable semantics.
- Reusable function defaults that are overridden by callers.

## File to Audit

```
__FILE_PATH_OR_CODE_SNIPPET__
```

## Task

1. List every hardcoded literal, number, string, or regex in the file.
2. For each one, decide if it should be:
   - Centralized in `tools/lib/config.js` or `package.json`.
   - Kept as-is with an inline justification comment.
3. Do not change version numbers to hardcoded values; read `engines` from `package.json`.

## Output

Provide a table with columns: `Value`, `Location`, `Recommendation` (`centralize`, `justify`, or `ok`), and `Suggested action`.
