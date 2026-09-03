---
name: AI Self-Review
applyTo:
  - ".github/copilot-instructions.md"
  - ".github/instructions/**"
  - ".github/agents/**"
  - ".github/skills/**"
  - ".github/prompts/**"
  - ".github/hooks/**"
  - "docs/en/ai-guidelines.md"
  - "docs/pt-BR/ai-guidelines.md"
tools:
  - read_file
  - grep_search
  - replace_string_in_file
  - multi_replace_string_in_file
---

# AI Self-Review Skill

Use this skill to review a previous AI output against the project's rules and to decide whether instructions or agents need updating.

## Goal

Prevent repeated mistakes and continuously improve the AI customization files.

## Procedure

1. **Identify the rule that was violated.** Compare the AI output against:
   - `.github/copilot-instructions.md`
   - `.github/instructions/security.instructions.md`
   - `.github/instructions/testing.instructions.md`
   - `.github/instructions/docs.instructions.md`

2. **Determine the severity.**
   - **Critical:** weakened or removed a security gate, introduced a secret, or proposed adding a dependency without the secure pipeline.
   - **High:** skipped validation commands, left docs unsynchronized, introduced unjustified hardcodes.
   - **Medium:** formatting, style, or minor inconsistency.
   - **Low:** suggestion that could be more concise.

3. **Apply the immediate fix.** Correct the output or the affected code/docs and run the required validation commands.

4. **Update the instruction or agent if the mistake is likely to recur.**
   - Add a clarifying rule to `.github/copilot-instructions.md` if it is domain-agnostic.
   - Add a rule to the relevant `.github/instructions/*.md` if it is domain-specific.
   - Update the matching `.github/agents/*.agent.md` if it concerns that agent's scope.

5. **Log the lesson.** Append a concise entry to `.github/ai-lessons-learned.md`:
   - Date.
   - Rule violated.
   - Affected file(s).
   - Correction applied.
   - Instruction/agent updated (if any).

6. **Review the log periodically.** At the end of each phase or before a release, scan
   `.github/ai-lessons-learned.md` for clusters of similar mistakes and update the top-level
   instructions accordingly.

## Completion Criteria

- The immediate issue is fixed and validated.
- The root cause is documented in `.github/ai-lessons-learned.md`.
- Recurring issues have a corresponding update in instructions or agents.

## Output

Produce a self-review summary:

1. Rule violated.
2. Severity.
3. Fix applied.
4. Instruction/agent update (if any).
5. Result: "Self-review logged and fixed" or "No issue found".
