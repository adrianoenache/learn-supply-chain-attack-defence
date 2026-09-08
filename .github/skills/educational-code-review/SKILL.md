---
name: Educational Code Review
applyTo:
  - "tools/*.js"
  - "tools/lib/*.js"
  - "tools/**/*.test.js"
tools:
  - read_file
  - grep_search
  - replace_string_in_file
  - multi_replace_string_in_file
---

# Educational Code Review Skill

Use this skill to review code as a learning resource. The goal is clarity,
maintainability, and teaching value, not just correctness.

## Goal

Ensure code and tests are understandable by someone learning supply-chain defense.

## Procedure

1. **Read the file header.** Confirm it explains what the file does, why it exists,
   and how to use it.

2. **Check error messages.** Every error should explain:
   - What failed.
   - Which package, file, or command is involved.
   - What the user should do next.

3. **Audit hardcoded values.** For each literal threshold, timeout, or constant:
   - If it is configurable, read it from `tools/lib/config.js` or `package.json`.
   - If it is intentionally hardcoded, verify there is an inline comment explaining why.

4. **Review naming.** Variables and functions should reveal intent. Avoid single-letter
   names except in well-known contexts (e.g., loop indices).

5. **Check comments.** Security-sensitive or non-obvious steps need comments. Avoid
   comments that merely restate the code.

6. **Link to defense layers.** When a check corresponds to a documented security layer,
   add a comment or error reference (e.g., "Layer 6 — .npmrc hardening").

7. **Verify test readability.** Tests should use descriptive names, clear arrange/act/assert
   structure, and deterministic fixtures.

8. **Summarize findings.** Group issues by severity (P0 = missing header or unjustified
   hardcode; P1 = unclear error message; P2 = naming/comment improvements).

## Completion Criteria

- File headers are complete.
- Error messages are actionable.
- Hardcoded values are justified or configurable.
- Names and comments support learning.
- Security-layer references are used where appropriate.

## Output

Produce a concise review:

1. Files reviewed.
2. List of findings with severity and suggested fix.
3. Result: "Educational code review passed" or a prioritized fix list.
