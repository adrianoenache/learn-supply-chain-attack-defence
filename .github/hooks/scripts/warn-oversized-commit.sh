#!/usr/bin/env bash
# warn-oversized-commit.sh — Advises splitting large or multi-domain commits.
#
# Reads the Copilot preToolUse input JSON from stdin. When the requested
# terminal command is a `git commit`, inspects the staged diff and emits an
# advisory (never a block) when it exceeds the granularity thresholds.
#
# Process rationale (Fase AI-4.1): commits that mix code, documentation, and
# plan bookkeeping are hard to review and revert. The hook warns with the
# sanctioned path (how to split); blocking is deliberately NOT used — the
# maintainer may legitimately bundle changes (e.g. mechanical version bumps
# that must touch package.json, lockfile, and docs together).
#
# Input:  JSON on stdin (toolName, toolArgs/toolInput with the command).
# Output: '{}' to proceed silently, or an additionalContext advisory.
#
# Thresholds (overridable via env, primarily so tests stay small; the
# defaults are policy and are justified in DECISIONS.md, ADR 2026-11-03):
#   WARN_COMMIT_MAX_FILES   (default 8)   — staged file count
#   WARN_COMMIT_MAX_LINES   (default 400) — added + deleted lines
#   WARN_COMMIT_MAX_DOMAINS (default 2)   — distinct path domains, where
#       docs/en and docs/pt-BR count as ONE domain (a bilingual pair is a
#       single intent per the bilingual-docs rule)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
INPUT=$(cat)

# Unified observability (Fase AI-3.3): one JSONL entry per advisory in the
# gitignored observability.jsonl. Logging never fails the hook.
log_event() {
  printf '%s' "$1" | node "$SCRIPT_DIR/log-hook-event.js" || true
}

TOOL_NAME=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" toolName)
if [ "$TOOL_NAME" != "bash" ] && [ "$TOOL_NAME" != "powershell" ]; then
  echo '{}'
  exit 0
fi

TOOL_INPUT=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" toolArgs)
RAW_INPUT=$(printf '%s' "$INPUT" | node "$SCRIPT_DIR/parse-hook-input.js" toolInput)
COMBINED="${TOOL_INPUT}${RAW_INPUT}"

# Decode basic JSON escaping so grep sees the real command.
DECODED=$(printf '%s' "$COMBINED" | sed 's/\\"/"/g; s/\\\\/\\/g')

# Only `git commit ...` invocations are relevant.
if ! printf '%s' "$DECODED" | grep -qE 'git([[:space:]]-[-A-Za-z]+)*[[:space:]]commit([[:space:]]|$)'; then
  echo '{}'
  exit 0
fi

# Outside a git work tree there is nothing to inspect — stay silent and let
# git itself report the error.
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo '{}'
  exit 0
fi

NUMSTAT=$(git diff --cached --numstat 2>/dev/null || true)

# `git commit -a`/`--all` stages tracked modifications at commit time, so the
# unstaged diff must be measured too. Matches -a, combined short flags like
# -am, and --all.
if printf '%s' "$DECODED" | grep -qE '(^|[[:space:]])(--all|-[A-Za-z]*a[A-Za-z]*)($|[[:space:]])'; then
  NUMSTAT="${NUMSTAT}
$(git diff --numstat 2>/dev/null || true)"
fi

if [ -z "$(printf '%s' "$NUMSTAT" | tr -d '[:space:]')" ]; then
  # Nothing staged — git itself reports that; there is no advice to give.
  echo '{}'
  exit 0
fi

MAX_FILES="${WARN_COMMIT_MAX_FILES:-8}"
MAX_LINES="${WARN_COMMIT_MAX_LINES:-400}"
MAX_DOMAINS="${WARN_COMMIT_MAX_DOMAINS:-2}"

# Aggregate numstat into file/line/domain counts. Domain mapping mirrors the
# intent categories of the granularity rule; docs/en and docs/pt-BR collapse
# into a single "docs" domain. Binary entries ("-") count as 0 lines.
STATS=$(printf '%s\n' "$NUMSTAT" | node -e "
  const rows = require('node:fs').readFileSync(0, 'utf8').split('\n').filter(Boolean)
  const domainOf = (p) => {
    if (p.startsWith('docs/')) return 'docs'
    if (p.startsWith('.github/')) return 'ai-customizations'
    if (p.startsWith('tools/')) return 'tools'
    if (p.startsWith('.husky/')) return 'husky'
    return 'root'
  }
  let files = 0
  let lines = 0
  const domains = new Set()
  for (const row of rows) {
    const [added, deleted, ...rest] = row.split('\t')
    const file = rest.join('\t')
    if (!file) continue
    files += 1
    lines += (Number.parseInt(added, 10) || 0) + (Number.parseInt(deleted, 10) || 0)
    domains.add(domainOf(file))
  }
  console.log(JSON.stringify({ files, lines, domains: domains.size, domainList: [...domains].join(', ') }))
")

FILES=$(printf '%s' "$STATS" | node "$SCRIPT_DIR/parse-hook-input.js" files)
LINES=$(printf '%s' "$STATS" | node "$SCRIPT_DIR/parse-hook-input.js" lines)
DOMAINS=$(printf '%s' "$STATS" | node "$SCRIPT_DIR/parse-hook-input.js" domains)
DOMAIN_LIST=$(printf '%s' "$STATS" | node "$SCRIPT_DIR/parse-hook-input.js" domainList)

if [ "$FILES" -gt "$MAX_FILES" ] || [ "$LINES" -gt "$MAX_LINES" ] || [ "$DOMAINS" -gt "$MAX_DOMAINS" ]; then
  MESSAGE="Oversized or multi-domain commit: ${FILES} files, ${LINES} changed lines across ${DOMAINS} domain(s) (${DOMAIN_LIST}); thresholds are ${MAX_FILES} files / ${MAX_LINES} lines / ${MAX_DOMAINS} domains. Rule (copilot-instructions.md): one commit = one intent — do not mix code, documentation, and plan bookkeeping. To split: 'git restore --staged .', then 'git add <paths-of-one-intent>' and commit per intent. This is advisory only; the commit is not blocked."
  log_event "$(node -e "console.log(JSON.stringify({ hook: 'warn-oversized-commit', event: 'preToolUse', action: 'warn', reason: process.argv[1] }))" "${FILES} files / ${LINES} lines / ${DOMAINS} domains (${DOMAIN_LIST})")"
  node -e "console.log(JSON.stringify({ additionalContext: process.argv[1] }))" "$MESSAGE"
  exit 0
fi

echo '{}'
