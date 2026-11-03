#!/usr/bin/env node
'use strict'

// log-hook-event.js — Unified observability logger for Copilot hooks (Fase
// AI-3.3).
//
// Every hook script appends one JSON object per line (JSONL) to a single
// gitignored log, so contributors can answer "how often did the defenses
// fire?" with `node .github/hooks/scripts/observability-summary.js`.
//
// Entry fields:
//   at     — ISO timestamp (added here when absent)
//   hook   — hook script name (e.g. "enforce-security")
//   event  — lifecycle event (e.g. "preToolUse", "sessionStart")
//   action — "fired" | "suggest" | "warn" | "block" (repair-oriented blocks
//            keep reason/snippet fields for the audit trail)
//   reason, snippet — optional, used by blocking hooks
//
// Usage (from a hook script):
//   printf '%s' "$json" | node "$SCRIPT_DIR/log-hook-event.js"
//
// The log file lives next to this script as observability.jsonl
// (gitignored). Override with OBS_LOG_FILE (tests). To bound growth, the
// logger keeps at most OBS_MAX_LINES entries (default 5000 — intentional
// hardcoded cap: the log is a local convenience, not an archive; oldest
// entries are dropped first). Logging never fails the caller: any write
// error is swallowed so a full/read-only disk cannot break a commit hook.

const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_LOG = path.join(__dirname, 'observability.jsonl')
// 5000 JSONL entries stay well under a megabyte of one-line events — large
// enough for months of local history, small enough to keep rewrites cheap.
const DEFAULT_MAX_LINES = 5000
const TRIM_TO = 4000

function main() {
  const logFile = process.env.OBS_LOG_FILE || DEFAULT_LOG
  const maxLines =
    Number.parseInt(process.env.OBS_MAX_LINES || '', 10) || DEFAULT_MAX_LINES

  let raw = ''
  try {
    raw = fs.readFileSync(0, 'utf8').trim()
  } catch {
    return // unreadable stdin — never fail the caller
  }
  if (!raw) return

  let entry
  try {
    entry = JSON.parse(raw)
  } catch {
    return // malformed JSON — never fail the caller
  }
  if (!entry.at) entry.at = new Date().toISOString()

  try {
    let lines = []
    if (fs.existsSync(logFile)) {
      lines = fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean)
    }
    lines.push(JSON.stringify(entry))
    if (lines.length > maxLines) {
      // Trim to the smaller of TRIM_TO and the cap, so test overrides with a
      // tiny OBS_MAX_LINES still drop the oldest entries.
      const target = Math.min(TRIM_TO, maxLines)
      lines = lines.slice(lines.length - target)
    }
    fs.writeFileSync(logFile, `${lines.join('\n')}\n`)
  } catch {
    // disk full / read-only — logging must never break the hook
  }
}

main()
