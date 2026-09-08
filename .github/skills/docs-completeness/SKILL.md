---
name: Docs Completeness
applyTo:
  - "docs/**"
  - "README.md"
  - "CONTRIBUTING.md"
  - "SECURITY.md"
tools:
  - read_file
  - grep_search
  - run_in_terminal
---

# Docs Completeness Skill

Use this skill to verify that documentation is complete, bilingual, and internally
consistent.

## Goal

Ensure every user-facing change is discoverable in both English and Portuguese (BR).

## Procedure

1. **Identify the changed behavior.** Determine which docs need updates: index,
   tools list, security layer page, glossary, quick-reference, etc.

2. **Check `docs/en/` and `docs/pt-BR/` parity.** For every touched file in one
   language, the corresponding file in the other language must exist and have
   matching structure and headings.

3. **Validate internal links.** Run:

   ```bash
   npm run defence:check-md-links
   ```

4. **Check glossary consistency.** New or changed terms should appear in both
   `docs/en/glossary.md` and `docs/pt-BR/glossary.md`.

5. **Check script references.** Ensure npm script examples use the correct
   `defence:*` names and match `package.json`.

6. **Check quick-reference and index.** New tools or commands should be listed in
   `docs/en/quick-reference.md`, `docs/pt-BR/quick-reference.md`, and both
   `index.md` files.

7. **Summarize gaps.** Note missing pages, missing translations, stale examples,
   or broken links.

## Completion Criteria

- Both language trees are structurally aligned.
- All internal links pass `npm run defence:check-md-links`.
- New terms are in both glossaries.
- Script references match `package.json`.
- Indexes and quick-reference are up to date.

## Output

Produce a completeness report:

1. Scope of docs reviewed.
2. Missing or outdated items.
3. Result: "Docs completeness review passed" or a list of required updates.
