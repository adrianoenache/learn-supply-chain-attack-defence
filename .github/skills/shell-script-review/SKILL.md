---
name: Shell Script Review
applyTo:
  - ".github/hooks/scripts/**/*.sh"
  - ".husky/**"
  - "tools/**/*.sh"
tools:
  - read_file
  - grep_search
---

# Shell Script Review

Use this skill after creating or editing any shell script in the project. It
ensures scripts meet the project's safety, security, and quality standards for
bash code.

## Goal

Prevent brittle, unsafe, or silently-failing shell scripts from being committed,
especially Husky hooks and Copilot hook implementations.

## Procedure

1. **Read the script.** Open the `.sh` file you edited or created.

2. **Check the shebang.** The first line must be exactly:

   ```bash
   #!/usr/bin/env bash
   ```

3. **Check safety options.** The script must include:

   ```bash
   set -euo pipefail
   ```

   within the first few lines. If any option is intentionally omitted,
   confirm there is an inline comment explaining why.

4. **Check the header comment.** The script should explain:
   - Its purpose.
   - Inputs (stdin, arguments, files).
   - Outputs (stdout, JSON, exit codes).
   - Security considerations.

5. **Audit variable usage.**
   - Variables are quoted: `"$VAR"`, `"${VAR}"`.
   - No bare `$VAR` in contexts where word splitting or globbing would matter.
   - Secrets are not echoed or logged.

6. **Audit JSON handling.**
   - Prefer Node.js helpers (e.g., `parse-hook-input.js`) for reading JSON.
   - Prefer `JSON.stringify()` for producing JSON, not `sed` escaping.
   - If `sed` is used for JSON, flag it for future migration.

7. **Audit pipelines and error handling.**
   - Pipelines must not silently ignore failures. With `set -o pipefail`, the
     first failing command in a pipe causes the script to exit.
   - Commands expected to fail gracefully must use `|| { ... }`.
   - No `eval`, `exec` with untrusted input, or dynamic command construction
     from external data.

8. **Check permissions.** Scripts meant to be executed must be executable:

   ```bash
   chmod +x path/to/script.sh
   ```

9. **Run validation.**

   ```bash
   bash -n path/to/script.sh
   ```

   This parses the script without executing it and catches syntax errors.

10. **If the script is `.husky/pre-commit`, sync hashes.**
    Follow `.github/skills/pre-commit-hash-sync/SKILL.md`.

## Completion Criteria

- Shebang is `#!/usr/bin/env bash`.
- `set -euo pipefail` is present or explicitly justified.
- Header comment documents purpose, inputs, outputs, and security.
- Variables are quoted; secrets are not logged.
- JSON is parsed/escaped via Node.js helpers when possible.
- Pipelines respect errors (`set -o pipefail` or explicit handlers).
- `bash -n path/to/script.sh` reports no syntax errors.
- If `.husky/pre-commit` changed, integrity hashes are in sync.

## Output

Produce a short review summary:

1. Script(s) reviewed.
2. Which checks passed.
3. Any issues found and how they were fixed.
4. Result: "Shell script review passed" or a list of required fixes.
