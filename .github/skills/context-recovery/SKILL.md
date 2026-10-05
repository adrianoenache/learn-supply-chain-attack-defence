---
name: context-recovery
description: Reconstruct the current project state from versioned files when a chat session starts or when resuming work after a break, crash, or loss of session memory. Reads .github/PLAN.md, TODO.md, and PROJECT_STATUS_REPORT.md before any action is proposed.
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
