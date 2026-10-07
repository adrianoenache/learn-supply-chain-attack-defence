#!/usr/bin/env bash
# enforce-write-paths.sh — Blocks or challenges writes to sensitive paths.
#
# Reads the Copilot preToolUse input JSON from stdin and writes a permission
# decision to stdout. Applies to file-writing tools (edit/create/write).
#
# Security rationale (Defense-in-depth for AI execution, Fase AI-2.7.1):
# the model can be mistaken or prompt-injected; these paths are where a bad
# write does the most damage. Denied paths are never legitimate write targets
# for an agent. Challenged paths have their own integrity gates (hash sync,
# pre-commit) but deserve an explicit warning so the change is deliberate.
#
# Input:  JSON on stdin (toolName, toolArgs/toolInput containing a file path).
# Output: '{}' to allow, or a permissionDecision JSON to deny/warn.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT=$(cat)

TOOL_NAME=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" toolName)

case "$TOOL_NAME" in
  edit|create|write|replace_string_in_file|multi_replace_string_in_file|create_file|create_directory) ;;
  *)
    echo '{}'
    exit 0
    ;;
esac

# Try the field names different runtimes use for the target path.
FILE_PATH=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" filePath)
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" file_path)
fi
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" path)
fi
if [ -z "$FILE_PATH" ]; then
  # Path could not be determined — allow rather than block blindly.
  echo '{}'
  exit 0
fi

deny() {
  local reason="$1"
  node -e "console.log(JSON.stringify({ permissionDecision: 'deny', permissionDecisionReason: process.argv[1] }))" "$reason"
  exit 0
}

warn() {
  local message="$1"
  node -e "console.log(JSON.stringify({ additionalContext: process.argv[1] }))" "$message"
  exit 0
}

# --- Denied: never legitimate agent write targets ---------------------------

# Secrets files (.env, .env.local, .env.production, ...). An agent must never
# write credentials; placeholders belong in documentation.
if printf '%s' "$FILE_PATH" | grep -qE '(^|/)\.env($|\.)'; then
  deny "Writing to '$FILE_PATH' is blocked: .env files hold secrets and are never edited by the agent. Use documented placeholders in docs instead."
fi

# The .git directory is internal VCS state; use git commands instead.
if printf '%s' "$FILE_PATH" | grep -qE '(^|/)\.git(/|$)'; then
  deny "Writing to '$FILE_PATH' is blocked: .git internals must only change through git commands."
fi

# Paths outside the workspace (absolute paths that escape the repo root or
# home-directory traversal) are out of scope for project work.
if printf '%s' "$FILE_PATH" | grep -qE '\.\.(/|$)'; then
  deny "Writing to '$FILE_PATH' is blocked: paths escaping the workspace are out of scope. Keep edits inside the repository."
fi

# --- Challenged: allowed but deliberately frictioned ------------------------

# .husky hooks have their own integrity gate (hash sync). Warn so the agent
# follows the pre-commit-hash-sync skill instead of leaving drift behind.
if printf '%s' "$FILE_PATH" | grep -qE '^\.husky/'; then
  warn "You are editing a Husky hook ('$FILE_PATH'). Follow .github/skills/pre-commit-hash-sync/SKILL.md: recompute the SHA-256, update defences.huskyPreCommitHash in package.json, run npm run defence:verify-defences:fix, and commit all three together."
fi

# package.json drives every defense gate; warn so changes stay deliberate.
if printf '%s' "$FILE_PATH" | grep -qE '^package\.json$'; then
  warn "You are editing package.json. Do not add dependencies by hand (use npm run defence:add), keep defence:* script names stable, and remember that engines/config changes ripple into tools/lib/config.js."
fi

echo '{}'
