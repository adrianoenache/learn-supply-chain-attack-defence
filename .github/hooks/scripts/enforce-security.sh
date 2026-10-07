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

deny() {
  local reason="$1"
  # Audit trail (Fase AI-2.7.2): every blocked call is appended to a local
  # JSONL log (gitignored) so false positives and real bypass attempts can be
  # reviewed periodically. The log never leaves the machine and stores only
  # a short prefix of the attempted command.
  local log_file="$SCRIPT_DIR/security-blocks.log"
  local snippet
  snippet=$(printf '%s' "$DECODED" | head -c 200)
  node -e "
    const fs = require('node:fs');
    const entry = { at: new Date().toISOString(), tool: process.argv[1], reason: process.argv[2], snippet: process.argv[3] };
    fs.appendFileSync(process.argv[4], JSON.stringify(entry) + '\n');
  " "$TOOL_NAME" "$reason" "$snippet" "$log_file" || true
  node -e "console.log(JSON.stringify({ permissionDecision: 'deny', permissionDecisionReason: process.argv[1] }))" "$reason"
  exit 0
}

if printf '%s' "$DECODED" | grep -qiE 'npm install[[:space:]]+(--save|-S|--save-dev|-D)?[[:space:]]*[^[:space:]]+'; then
  deny "Use \`npm run defence:add -- pkg@version\` instead of \`npm install\`. Direct installs bypass age, signature, vulnerability, and license checks."
fi

if printf '%s' "$DECODED" | grep -qiE '(remove|delete|disable)[[:space:]]+ignore-scripts'; then
  deny "Removing \`ignore-scripts=true\` weakens Layer 6 protection. If you need lifecycle scripts for a specific package, follow the safe rebuild procedure documented in the security layers."
fi

if printf '%s' "$DECODED" | grep -qiE '(bypass|skip|disable|remove)[[:space:]]+(age check|signature|audit|license check|hook integrity|pre-commit)'; then
  deny "Bypassing security gates requires documented maintainer approval. Explain why the gate cannot be satisfied."
fi

echo '{}'
