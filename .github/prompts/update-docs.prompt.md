# Update Documentation

Update the project's bilingual documentation after a behavior change.

## Context

- Documentation lives in `docs/en/` (English) and `docs/pt-BR/` (Portuguese).
- New markdown files must be linked from both `docs/en/index.md` and `docs/pt-BR/index.md`.
- Terminology must match `docs/en/glossary.md` and `docs/pt-BR/glossary.md`.
- Run `npm run defence:check-md-links` after any doc change.

## Behavior Change

```
__DESCRIBE_CHANGE__
```

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
