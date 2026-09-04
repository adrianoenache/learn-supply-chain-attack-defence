---
name: Context Recovery
applyTo:
  - ".github/PLAN.md"
  - "TODO.md"
  - "PROJECT_STATUS_REPORT.md"
tools:
  - read_file
  - grep_search
  - list_dir
---

# Context Recovery Skill

Use this skill when a chat session starts or when the user asks to resume work
after a break, crash, or loss of session memory.

## Goal

Reconstruct the current project state from versioned files before proposing any
action.

## Procedure

1. Read `.github/PLAN.md`. If it does not exist, ask the user where the plan is
   stored or offer to create it.
2. Read `TODO.md` to confirm which items are open.
3. Read `PROJECT_STATUS_REPORT.md` to understand the latest assessment.
4. Summarize the current phase, open blockers, and next steps for the user.
5. Only then proceed with implementation.
