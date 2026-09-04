# AI Lessons Learned

This file tracks recurring mistakes made by AI assistants in this project and the corresponding corrections or instruction updates. It feeds the continuous improvement of `.github/copilot-instructions.md`, `.github/instructions/*.md`, and `.github/agents/*.agent.md`.

## Format

Each entry must be concise and actionable:

- **Date:** YYYY-MM-DD
- **Rule violated:** Reference to the rule in `.github/copilot-instructions.md` or agent/instruction file.
- **Affected files:** Files where the mistake appeared.
- **What happened:** Short description of the incorrect output.
- **Correction applied:** How the output or code was fixed.
- **Instruction/agent updated:** File(s) changed to prevent recurrence.

---

## Entries

### 2026-09-03 — Session memory loss

- **Date:** 2026-09-03
- **Rule violated:** Context Before Action / continuity
- **Affected files:** `/memories/session/plan.md`, `.github/PLAN.md`
- **What happened:** A VS Code chat section failure cleared session memory,
  making the current plan inaccessible and forcing reconstruction from scratch.
- **Correction applied:** Created `.github/PLAN.md` as authoritative,
  versioned plan; added `/memories/` to `.gitignore`; updated
  `.github/copilot-instructions.md`; and created the
  `.github/skills/context-recovery/SKILL.md` skill.
- **Instruction/agent updated:** `.github/copilot-instructions.md`,
  `.github/skills/context-recovery/SKILL.md`

---

## Review Cadence

Review this log at the end of each phase or before tagging a release. If the same mistake appears more than once, update the top-level `.github/copilot-instructions.md` or the relevant domain-specific instruction/agent file.
