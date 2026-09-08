#!/usr/bin/env bash
# inject-context.sh — Injects project context at session start.
# Reads the Copilot sessionStart input JSON from stdin and writes additionalContext.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CONTEXT=""

if [ -f "$REPO_ROOT/package.json" ]; then
  ENGINES=$(node -e "const p=require('$REPO_ROOT/package.json'); console.log(JSON.stringify(p.engines||{}))" 2>/dev/null || true)
  if [ -n "$ENGINES" ] && [ "$ENGINES" != "{}" ]; then
    CONTEXT="${CONTEXT}Project engines: $ENGINES\n"
  fi
fi

if [ -f "$REPO_ROOT/TODO.md" ]; then
  OPEN=$(grep -cE '^\s*- \[ \]' "$REPO_ROOT/TODO.md" || true)
  CONTEXT="${CONTEXT}Open TODO items: $OPEN\n"
fi

if [ -f "$REPO_ROOT/.defence-manifest.json" ]; then
  MANIFEST_COUNT=$(grep -c '"hash"' "$REPO_ROOT/.defence-manifest.json" || true)
  CONTEXT="${CONTEXT}Defence manifest entries: $MANIFEST_COUNT\n"
fi

if [ -n "$CONTEXT" ]; then
  # Use Node.js for robust JSON escaping instead of shell sed.
  ESCAPED=$(printf '%s' "$CONTEXT" | node -e 'const s=require("fs").readFileSync(0,"utf8"); console.log(JSON.stringify(s).slice(1,-1))')
  echo "{\"additionalContext\":\"$ESCAPED\"}"
else
  echo '{}'
fi
