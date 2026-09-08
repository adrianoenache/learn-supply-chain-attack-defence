#!/usr/bin/env bash
# enforce-security.sh — Blocks dangerous commands requested via the bash tool.
# Reads the Copilot preToolUse input JSON from stdin and writes a decision to stdout.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT=$(cat)

# Extract fields safely with Node.js instead of sed to avoid JSON parsing fragility.
TOOL_NAME=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" toolName)
TOOL_INPUT=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" toolArgs)

# Some runtimes send toolArgs as a raw string; try to also extract from toolInput if present.
RAW_INPUT=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" toolInput)

COMBINED="${TOOL_INPUT}${RAW_INPUT}"

if [ "$TOOL_NAME" != "bash" ] && [ "$TOOL_NAME" != "powershell" ]; then
  echo '{}'
  exit 0
fi

# Decode basic JSON escaping so grep sees the real command.
DECODED=$(printf '%s' "$COMBINED" | sed 's/\\"/"/g; s/\\\\/\\/g')

if printf '%s' "$DECODED" | grep -qiE 'npm install[[:space:]]+(--save|-S|--save-dev|-D)?[[:space:]]*[^[:space:]]+'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Use `npm run defence:add -- pkg@version` instead of `npm install`. Direct installs bypass age, signature, vulnerability, and license checks."}'
  exit 0
fi

if printf '%s' "$DECODED" | grep -qiE '(remove|delete|disable)[[:space:]]+ignore-scripts'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Removing `ignore-scripts=true` weakens Layer 6 protection. If you need lifecycle scripts for a specific package, follow the safe rebuild procedure documented in the security layers."}'
  exit 0
fi

if printf '%s' "$DECODED" | grep -qiE '(bypass|skip|disable|remove)[[:space:]]+(age check|signature|audit|license check|hook integrity|pre-commit)'; then
  echo '{"permissionDecision":"deny","permissionDecisionReason":"Bypassing security gates requires documented maintainer approval. Explain why the gate cannot be satisfied."}'
  exit 0
fi

echo '{}'
