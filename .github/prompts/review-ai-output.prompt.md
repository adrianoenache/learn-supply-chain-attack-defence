# Review AI Output

Review a previous AI output against the project's rules and decide whether any instruction or agent needs updating.

## Context

The project maintains AI customization files under `.github/`:

- `.github/copilot-instructions.md` — always-on project-wide rules.
- `.github/instructions/*.md` — domain-specific instructions.
- `.github/agents/*.agent.md` — specialized agents.
- `.github/ai-lessons-learned.md` — log of recurring mistakes and corrections.

## AI Output to Review

```
__PASTE_AI_OUTPUT_HERE__
```

## Task

1. Compare the output against `.github/copilot-instructions.md` and the relevant domain instruction.
2. Identify any violated rule, skipped validation, unsynchronized docs, or weakened security gate.
3. Determine the severity (critical/high/medium/low).
4. Propose the immediate fix.
5. Decide whether a recurring issue should be added to `.github/ai-lessons-learned.md` or reflected in an instruction/agent file.

## Output

Provide:
1. Rule violated (with file reference).
2. Severity.
3. Immediate fix.
4. Instruction/agent/lesson update (if any).
5. Result: "Self-review logged and fixed" or "No issue found".
