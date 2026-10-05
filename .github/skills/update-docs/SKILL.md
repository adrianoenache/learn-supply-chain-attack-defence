---
name: update-docs
description: Update the bilingual documentation (docs/en and docs/pt-BR) after a user-facing behavior change. Use when a change affects commands, flags, defense layers, or documented workflows.
argument-hint: "[behavior change description]"
disable-model-invocation: true
---
# Update Documentation

Update the project's bilingual documentation after a behavior change.

## Context

- Documentation lives in `docs/en/` (English) and `docs/pt-BR/` (Portuguese).
- New markdown files must be linked from both `docs/en/index.md` and `docs/pt-BR/index.md`.
- Terminology must match `docs/en/glossary.md` and `docs/pt-BR/glossary.md`.
- Run `npm run defence:check-md-links` after any doc change.

## Behavior Change

Use the change description provided with the invocation. If none was provided,
ask the user which behavior change should be documented before proceeding.

## Task

1. Identify all docs that need updating for this change.
2. Update the English version first.
3. Mirror the change in Portuguese.
4. Add or update index links if new files are created.
5. Validate links and structure.

## Output

Provide:
1. List of files changed.
2. Summary of changes in each file.
3. Confirmation that `npm run defence:check-md-links` passes.
