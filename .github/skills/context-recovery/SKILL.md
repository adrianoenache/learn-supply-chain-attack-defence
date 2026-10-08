---
name: context-recovery
description: Reconstruct the current project state from versioned files when a chat session starts or when resuming work after a break, crash, or loss of session memory. Reads .github/PLAN.md, TODO.md, and PROJECT_STATUS_REPORT.md before any action is proposed.
user-invocable: false
context: fork
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
4. Read `DECISIONS.md` to recover *why* past choices were made (not just what
   was done).
5. Summarize the current phase, open blockers, and next steps for the user.
6. Only then proceed with implementation.

## End-of-session distillation

When a work session ends (or the user asks to wrap up), review what happened
and persist what deserves to survive the session:

1. **Decisions** — any "we chose X over Y because Z" goes to `DECISIONS.md`
   using the ADR format defined there (date, decision, context, rejected
   alternative, consequences).
2. **Mistakes and corrections** — recurring errors or rule violations go to
   `.github/ai-lessons-learned.md` (see the `self-review` skill).
3. **Plan state** — `.github/PLAN.md` and `TODO.md` must reflect reality
   (phases completed, items checked off); refresh the session working copy.
4. **What stays in the session** — exploratory dead ends and superseded drafts
   are not recorded; only decisions, lessons, and state are.

The test of a good distillation: a future session can resume using only
`PLAN.md`, `TODO.md`, `DECISIONS.md`, and `ai-lessons-learned.md`, without
asking "why did we do it this way?"
