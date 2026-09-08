#!/usr/bin/env bash
# suggest-validation.sh — Suggests running validation commands after relevant edits.
# Reads the Copilot postToolUse input JSON from stdin and writes additionalContext.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT=$(cat)

# Extract fields safely with Node.js instead of sed to avoid JSON parsing fragility.
TOOL_NAME=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" toolName)

if [ "$TOOL_NAME" != "edit" ] && [ "$TOOL_NAME" != "create" ]; then
  echo '{}'
  exit 0
fi

# Try both camelCase and snake_case field names.
FILE_PATH=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" filePath)
if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" file_path)
fi
if [ -z "$FILE_PATH" ]; then
  # Some runtimes embed the path inside toolArgs.
  FILE_PATH=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" path)
fi

MESSAGE=""

if printf '%s' "$FILE_PATH" | grep -qE '^tools/.*\.js$'; then
  MESSAGE="${MESSAGE}Run \`npm run lint\` to verify the edited file follows Biome rules.\n"
fi

if printf '%s' "$FILE_PATH" | grep -qE '^tools/.*\.test\.js$'; then
  MESSAGE="${MESSAGE}Run \`npm test\` to confirm the new or updated tests pass (432/432 expected).\n"
fi

if printf '%s' "$FILE_PATH" | grep -qE '^(docs/.*|README\.md|SECURITY\.md|CONTRIBUTING\.md|CHANGELOG\.md)$'; then
  MESSAGE="${MESSAGE}Run \`npm run defence:check-md-links\` to validate markdown links.\n"
fi

if printf '%s' "$FILE_PATH" | grep -qE '^docs/(en|pt-BR)/.*\.md$'; then
  MESSAGE="${MESSAGE}Check that the corresponding translation in docs/(en|pt-BR) remains aligned.\n"
fi

if printf '%s' "$FILE_PATH" | grep -qE '^tools/[a-z-]+\.js$'; then
  MESSAGE="${MESSAGE}Verify the script's CLI contract (flags, exit codes, output formats, --dry-run/--silent) and update docs/en/tools.md and docs/pt-BR/tools.md if needed.\n"
fi

if printf '%s' "$FILE_PATH" | grep -qE '^package\.json$'; then
  MESSAGE="${MESSAGE}Ensure new defense scripts use the \`defence:*\` prefix and that documentation is updated.\n"
fi

if [ -n "$MESSAGE" ]; then
  node -e "console.log(JSON.stringify({ additionalContext: process.argv[1] }))" "$MESSAGE"
else
  echo '{}'
fi
