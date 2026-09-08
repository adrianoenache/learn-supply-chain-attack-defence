#!/usr/bin/env bash
# subagent-invocation.sh — Validates runSubagent calls against the
# subagent-invocation skill. Emits educational, warning, or blocking context.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT=$(cat)

TOOL_NAME=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" toolName)
if [ "$TOOL_NAME" != "runSubagent" ]; then
  echo '{}'
  exit 0
fi

AGENT_NAME=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" agentName)
PROMPT=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" prompt)

if [ -z "$AGENT_NAME" ] || [ -z "$PROMPT" ]; then
  echo '{}'
  exit 0
fi

AGENT_FILE="$SCRIPT_DIR/../../agents/${AGENT_NAME}.agent.md"
LEVEL="educational"

# Determine intervention level for runSubagent calls.
# 1. Missing agent file -> block.
# 2. High-risk prompt and agent lacks run_in_terminal -> block.
# 3. High-risk prompt and agent has run_in_terminal -> warning.
# 4. Prompt mentions tool verification -> educational.
# 5. Otherwise -> warning.

LEVEL="educational"

if [ ! -f "$AGENT_FILE" ]; then
  LEVEL="block"
  REASON="Agent '$AGENT_NAME' not found in .github/agents/."
elif printf '%s' "$PROMPT" | grep -qiE '\brm +-rf\b|\bnpm +install\b|\bnpm +-i\b|\.npmrc|\.husky/pre-commit|modify.*hook|delete.*hook'; then
  if ! grep -qE '^[[:space:]]*-[[:space:]]*run_in_terminal[[:space:]]*$' "$AGENT_FILE"; then
    LEVEL="block"
    REASON="High-risk task but agent '$AGENT_NAME' does not declare run_in_terminal."
  else
    LEVEL="warning"
  fi
elif ! printf '%s' "$PROMPT" | grep -qiE 'check.*tool|verify.*tool|tool.*check|tool.*verify|subagent-invocation'; then
  LEVEL="warning"
fi

if [ "$LEVEL" = "block" ]; then
  MESSAGE="⛔ Blocked: $REASON Follow .github/skills/subagent-invocation/SKILL.md: choose the correct agent, verify its declared tools, and rephrase the request."
elif [ "$LEVEL" = "warning" ]; then
  MESSAGE="⚠️  runSubagent to '$AGENT_NAME' detected without an explicit tool check. Before delegating, verify the agent's tools in .github/agents/${AGENT_NAME}.agent.md and consult .github/skills/subagent-invocation/SKILL.md."
else
  MESSAGE="✅ runSubagent to '$AGENT_NAME' with tool verification acknowledged. Remember the post-delegation checklist in .github/skills/subagent-invocation/SKILL.md."
fi

node -e "console.log(JSON.stringify({ additionalContext: process.argv[1] }))" "$MESSAGE"
