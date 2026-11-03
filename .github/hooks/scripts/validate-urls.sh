#!/usr/bin/env bash
# validate-urls.sh — Suggests external URL validation after edits that may
# introduce URLs. Reads the Copilot postToolUse input JSON from stdin and
# writes additionalContext.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT=$(cat)

# Unified observability (Fase AI-3.3): one JSONL entry per emitted event in
# the gitignored observability.jsonl. Logging never fails the hook.
log_event() {
  printf '%s' "$1" | node "$SCRIPT_DIR/log-hook-event.js" || true
}

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
  log_event "$(node -e "console.log(JSON.stringify({ hook: 'validate-urls', event: 'postToolUse', action: 'suggest', reason: '' + String(process.argv[1]).slice(0, 200) }))" "$MESSAGE")"
node -e "console.log(JSON.stringify({ additionalContext: process.argv[1] }))" "$MESSAGE"
else
  echo '{}'
fi
