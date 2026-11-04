# Shell Script Instructions

These instructions apply when creating or modifying shell scripts, including
Husky hooks and GitHub Copilot hook implementations.

Applies to: `.github/hooks/scripts/**/*.sh`, `.husky/**`, `tools/**/*.sh`

## Shebang and Safety Options

- Every shell script must start with `#!/usr/bin/env bash`.
- Every script must include `set -euo pipefail` near the top. If a script
  intentionally omits any of these options, include a comment explaining why.
  - `-e`: exit immediately when a command fails.
  - `-u`: treat unset variables as an error.
  - `-o pipefail`: propagate the first failing exit code through a pipeline.
- Husky hooks are especially critical; they must never fail silently or mask
  errors in intermediate pipeline stages.

## Header Comments

Every script must begin with a comment block that explains:

- What the script does.
- What input it accepts (stdin, arguments, files).
- What output it produces (stdout, JSON, exit codes).
- Security considerations (secrets, untrusted input, external commands).

## Variable Handling

- Always quote variables: `"$VAR"` or `"${VAR}"`, never bare `$VAR`.
- Use `printf '%s' "$VAR"` for safe substring operations; avoid word splitting.
- Never `echo` secrets, tokens, API keys, or other sensitive values.

## JSON Parsing and Escaping

- Prefer Node.js helpers over shell `sed`/`awk` for JSON parsing and escaping.
- Use the shared `parse-hook-input.js` helper for reading Copilot hook input.
- For producing JSON output, pipe the message through Node.js `JSON.stringify()`
  rather than hand-rolled `sed` replacements.

## Error Handling

- Do not rely on bare pipes without `set -o pipefail`.
- Use explicit `|| { ... }` handling for commands that are expected to fail
  gracefully.
- Avoid suppressing errors silently; inform the caller when something goes wrong.

## Pre-Commit Hook Integrity

If you edit `.husky/pre-commit`:

1. Recompute its SHA-256 hash.
2. Update `defences.huskyPreCommitHash` in `package.json`.
3. Run `npm run defence:verify-defences:fix` to update `.defence-manifest.json`.
4. Commit `.husky/pre-commit`, `package.json`, and `.defence-manifest.json`
   together.
5. Run `node ./tools/check-hooks.js` to verify integrity before committing.

See `.github/skills/pre-commit-hash-sync/SKILL.md` for the detailed procedure.
