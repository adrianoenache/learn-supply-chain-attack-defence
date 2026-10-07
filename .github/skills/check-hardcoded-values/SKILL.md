---
name: check-hardcoded-values
description: Audit a file for hardcoded values that should be configurable or need inline justification. Use when reviewing code or tests for unexplained literals, magic numbers, or hardcoded thresholds.
argument-hint: "[file path or code snippet]"
disable-model-invocation: true
---
# Check Hardcoded Values

Audit the provided file for hardcoded values that should be configurable or need inline justification.

## Context

Project rule (canonical text in `.github/copilot-instructions.md`, examples in
`.github/instructions/educational-code-quality.instructions.md`): every
intentional hardcoded value in code must be accompanied by an inline comment
explaining why that specific value remains hardcoded and is not configurable.

## File to Audit

Use the file path or code snippet provided with the invocation. If none was
provided, ask the user which file or snippet to audit before proceeding.

## Task

1. List every hardcoded literal, number, string, or regex in the file.
2. For each one, decide if it should be:
   - Centralized in `tools/lib/config.js` or `package.json`.
   - Kept as-is with an inline justification comment.
3. Do not change version numbers to hardcoded values; read `engines` from `package.json`.

## Output

Provide a table with columns: `Value`, `Location`, `Recommendation` (`centralize`, `justify`, or `ok`), and `Suggested action`.
