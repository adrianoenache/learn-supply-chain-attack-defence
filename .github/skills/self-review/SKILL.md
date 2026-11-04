---
name: self-review
description: Review a previous AI output against the project's rules and decide whether instructions, agents, or the lessons-learned log need updating. Use after an AI mistake, rule violation, or skipped validation.
argument-hint: "[AI output to review]"
---

# AI Self-Review Skill

Use this skill to review a previous AI output against the project's rules and to decide whether instructions or agents need updating.

## Goal

Prevent repeated mistakes and continuously improve the AI customization files.

## Procedure

1. **Identify the rule that was violated.** Use the AI output provided with the
   invocation; if none was provided, review the most recent AI output in the
   current conversation. Compare the output against:
   - `.github/copilot-instructions.md`
   - The relevant `.github/instructions/*.md` file for the domain
     (security, testing, docs, shell scripts, educational code quality,
     file organization, project evaluation)
   - `.github/ai-lessons-learned.md` for previously logged mistakes

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
