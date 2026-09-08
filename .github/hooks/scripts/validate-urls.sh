#!/usr/bin/env bash
# validate-urls.sh — Suggests external URL validation after edits that may
# introduce URLs. Reads the Copilot postToolUse input JSON from stdin and
# writes additionalContext.

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

MESSAGE=""

if printf '%s' "$FILE_PATH" | grep -qE '^(docs/.*|README\.md|SECURITY\.md|CONTRIBUTING\.md|CHANGELOG\.md|\.github/.*)$'; then
  MESSAGE="${MESSAGE}If you introduced or changed external URLs, run \`npm run defence:check-external-urls\` to verify they are reachable.\n"
fi

if [ -n "$MESSAGE" ]; then
  ESCAPED=$(printf '%s' "$MESSAGE" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
  echo "{\"additionalContext\":\"$ESCAPED\"}"
else
  echo '{}'
fi
