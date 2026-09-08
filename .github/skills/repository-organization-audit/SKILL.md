---
name: Repository Organization Audit
applyTo:
  - "tools/**"
  - "docs/**"
  - ".github/**"
  - ".defence-manifest.json"
tools:
  - read_file
  - grep_search
  - list_dir
  - run_in_terminal
---

# Repository Organization Audit Skill

Use this skill to audit the project structure for consistency, orphaned files,
duplicated helpers, and applyTo pattern hygiene.

## Goal

Keep the repository predictable and easy to navigate as it grows.

## Procedure

1. **List the directory trees.** Use `list_dir` to inspect `tools/`, `tools/lib/`,
   `docs/en/`, `docs/pt-BR/`, and `.github/`.

2. **Check file locations.** Confirm that:
   - Tools live in `tools/`.
   - Shared helpers live in `tools/lib/`.
   - Docs live in `docs/en/` and `docs/pt-BR/`.
   - AI customizations follow the naming conventions in `.github/`.

3. **Find duplicated helpers.** Search for repeated functions across `tools/` and
   `tools/lib/` that could be extracted to a shared module (e.g., concurrency,
   formatters, CLI parsing).

4. **Detect orphaned files.** Identify files not referenced by any index, manifest,
   or documentation page.

5. **Review applyTo patterns.** Check `.github/agents/*.agent.md` and
   `.github/skills/*/SKILL.md` for overly broad globs or conflicting scopes.

6. **Verify the adoption manifest.** Run:

   ```bash
   npm run defence:verify-defences
   ```

7. **Summarize findings.** Group issues by location and severity.

## Completion Criteria

- Files are in their correct directories.
- No obvious duplicated helpers remain unextracted (or they are documented as P2/P3).
- Orphaned files are removed or referenced.
- applyTo patterns are specific and non-conflicting.
- `.defence-manifest.json` is consistent.

## Output

Produce an organization audit report:

1. Areas audited.
2. List of findings with location and severity.
3. Result: "Repository organization audit passed" or a prioritized fix list.
