#!/usr/bin/env bash
# enforce-shell-script-standards.sh — Reminds AI agents to review shell scripts
# against project standards after edits or creation. Reads the Copilot
# postToolUse input JSON from stdin and writes additionalContext.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT=$(cat)

TOOL_NAME=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" toolName)

if [ "$TOOL_NAME" != "edit" ] && [ "$TOOL_NAME" != "create" ]; then
  echo '{}'
  exit 0
fi

FILE_PATH=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" filePath)
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" file_path)
fi
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" path)
fi

if printf '%s' "$FILE_PATH" | grep -qE '(\.sh|^\.husky/pre-commit|^\.husky/post-merge)$'; then
  MESSAGE="You edited or created a shell script. Review it with .github/skills/shell-script-review/SKILL.md: ensure #!/usr/bin/env bash, set -euo pipefail, quoted variables, JSON handling via Node.js helpers, and run bash -n on the file. If the file is .husky/pre-commit, also sync hashes via .github/skills/pre-commit-hash-sync/SKILL.md."
  node -e "console.log(JSON.stringify({ additionalContext: process.argv[1] }))" "$MESSAGE"
else
  echo '{}'
fi
