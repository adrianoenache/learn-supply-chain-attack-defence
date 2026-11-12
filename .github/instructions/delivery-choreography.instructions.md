# Delivery Choreography Instructions

These instructions apply when a task produces changes that must leave the
machine — commits, branches, pushes, and pull requests.

Applies to: `PLAN.md`, `TODO.md`, `DECISIONS.md`, `CHANGELOG.md`, `tools/**`, `docs/**`, `.github/**`

## The rule

Task execution **includes delivery**. Unless the user explicitly says "don't
commit", every finished task ends with:

1. **Fetch first** — `git fetch origin --no-tags --prune` and ff-sync `dev`
   BEFORE creating any branch (stale-base PRs get blocked by the
   up-to-date rule; incident 2026-11-05).
2. **Typed branch** — Gitflow prefixes: `feat|fix|docs|chore|ci` from `dev`,
   `release/X.Y.Z` from `dev`, `hotfix/*` from `main`. Full model with
   commands and diagrams: `docs/en/git-workflow.md`.
3. **Granular commits** — 1 commit = 1 intent; gates green on each.
4. **Push + PR text** — push the branch and produce the PR body from the
   repository template, with real gate evidence (command + result). After
   pushing, **verify the branch exists on the remote**
   (`git ls-remote origin <branch>`) before handing out the compare link —
   a failed push piped through `tail` looks like success (2026-11-12
   incident: PR link delivered for a branch that was never pushed).

Never stop at "should I commit?" for routine deliverables.

## Exceptions

- Exploratory/analysis-only tasks (no file changes intended).
- The user asked for a plan or diff preview first.
