---
name: Bilingual Documentation Update
applyTo:
  - "docs/**"
  - "README.md"
  - "SECURITY.md"
  - "CONTRIBUTING.md"
  - "CHANGELOG.md"
tools:
  - read_file
  - replace_string_in_file
  - multi_replace_string_in_file
  - grep_search
  - run_in_terminal
---

# Bilingual Documentation Update Skill

Use this skill whenever user-facing behavior changes and documentation needs to be updated in both English and Portuguese.

## Goal

Keep `docs/en/` and `docs/pt-BR/` synchronized, accurate, and cross-linked.

## Procedure

1. **Identify the behavior change.** Determine which docs need updating: README, security layer pages, tools page, quick reference, architecture, setup, testing, git-hooks, dependencies, or adoption guide.

2. **Update the English version first.** Make the factual changes in `docs/en/...`.

3. **Mirror the change in Portuguese.** Apply the equivalent change to `docs/pt-BR/...`, adapting only language and examples.

4. **Add links to new files.** If a new markdown file was created, link it from both `docs/en/index.md` and `docs/pt-BR/index.md`.

5. **Use the glossary for terminology.** Cross-check terms against `docs/en/glossary.md` and `docs/pt-BR/glossary.md`.

6. **Validate links:**

   ```bash
   npm run defence:check-md-links
   ```

7. **Validate structure.** Confirm `docs/en/` and `docs/pt-BR/` have the same set of files:

   ```bash
   diff <(find docs/en -type f | sed 's|docs/en/||' | sort) <(find docs/pt-BR -type f | sed 's|docs/pt-BR/||' | sort)
   ```

## Completion Criteria

- Both language versions reflect the behavior change.
- New files are linked from both index pages.
- `npm run defence:check-md-links` passes.
- File structures of `docs/en/` and `docs/pt-BR/` match.

## Output

Produce a short docs update summary:

1. Files changed.
2. Link validation result.
3. Result: "Docs update complete" or a list of remaining fixes.
