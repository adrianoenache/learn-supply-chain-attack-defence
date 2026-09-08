#!/usr/bin/env bash
# sync-pre-commit-hash.sh — Reminds AI agents to keep pre-commit integrity hashes
# in sync after editing .husky/pre-commit.

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

if printf '%s' "$FILE_PATH" | grep -qE '^\.husky/pre-commit$'; then
  ESCAPED=$(printf '%s' "You edited .husky/pre-commit. Run the following before committing: 1) node -e \"const fs=require('fs'),c=require('crypto'); console.log(c.createHash('sha256').update(fs.readFileSync('.husky/pre-commit')).digest('hex'));\" to get the new hash; 2) update defences.huskyPreCommitHash in package.json; 3) run npm run defence:verify-defences:fix; 4) include .husky/pre-commit, package.json, and .defence-manifest.json in the same commit." | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')
  echo "{\"additionalContext\":\"$ESCAPED\"}"
else
  echo '{}'
fi
