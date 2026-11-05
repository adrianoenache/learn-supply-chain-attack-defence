// lib/formatters.js — Shared terminal output primitives for defence tools.
//
// Why this file exists: Phase N (output UX) standardizes how every defence
// tool reports status. Until now each tool invented its own vocabulary —
// check-sync.js used emoji (✅/⚠️), check-package-age.js used bare words
// (OK/SKIP/BLOCKED), and most tools had no end-of-run summary. Those elements
// are byte-identical in intent across tools, so they live here per the
// extraction rule in DECISIONS.md (2026-10-08, amended 2026-11-05): extract
// only what is byte-identical in more than one file. Domain-specific report
// rendering (license tables, SBOM output) stays in each tool.
//
// What this module provides:
//   - Status symbols (✓/✗/⚠/○) and aligned labels (OK/FAIL/WARN/SKIP).
//     Plain Unicode is used instead of emoji because emoji are double-width
//     in most terminals and break column alignment.
//   - formatItem(): one aligned status line for a single checked item.
//   - formatSection(): a titled group header for grouping items.
//   - renderSummary(): the structured end-of-run block every tool prints
//     (passed/failed/warned/skipped counts + the next suggested command).
//   - hasQuietFlag(): the --quiet/--silent convention (--quiet is the
//     documented flag; --silent is kept as a compatibility alias).
//   - supportsColor()/paint(): native ANSI colors, on only for TTY output
//     and off when NO_COLOR is set (https://no-color.org) — no dependency.
//
// Security caveats: this module never inspects the content it formats;
// callers must keep secrets out of messages. Color detection reads only
// isTTY/NO_COLOR/FORCE_COLOR and writes no state.

'use strict'

// Status vocabulary. The symbol/label pairs are the single source of truth
// for every tool; tests assert on the labels (OK/FAIL/WARN/SKIP), which are
// stable ASCII and safe to grep in CI logs.
const SYMBOLS = { pass: '✓', fail: '✗', warn: '⚠', skip: '○' }
const LABELS = { pass: 'OK', fail: 'FAIL', warn: 'WARN', skip: 'SKIP' }

// Labels are padded to the longest one (FAIL/WARN/SKIP = 4 chars) so item
// messages start at the same column. 4 is a property of the vocabulary
// above, not a configurable layout knob.
const LABEL_WIDTH = 4

// ANSI SGR color codes per status: green/red/yellow/bright-black.
// Native escape sequences keep the supply-chain surface at zero new
// dependencies (project rule: no dependency for cosmetics).
const SGR_COLORS = { pass: 32, fail: 31, warn: 33, skip: 90 }

// Fixed visual width of the summary divider. Purely cosmetic — a stable
// rule width reads well in both 80-col terminals and CI logs; it is not a
// project-specific threshold, so it is not configurable.
const SUMMARY_WIDTH = 54

// --quiet is the documented flag; --silent predates it and stays as a
// compatibility alias so existing CI jobs and hooks keep working.
function hasQuietFlag(argv) {
  return argv.includes('--quiet') || argv.includes('--silent')
}

// Colors are enabled only when the stream is an interactive terminal and the
// user has not opted out. NO_COLOR (any value, per no-color.org) wins over
// everything; FORCE_COLOR (non-zero) overrides a missing TTY so CI systems
// that support ANSI can still get colored logs.
function supportsColor(stream = process.stdout, env = process.env) {
  if (env.NO_COLOR !== undefined) return false
  if (env.FORCE_COLOR !== undefined && env.FORCE_COLOR !== '0') return true
  return Boolean(stream.isTTY)
}

// Wraps text in the ANSI color for a status. When color is disabled the
// text is returned untouched, so output stays byte-identical in CI.
function paint(text, status, colorEnabled) {
  if (!colorEnabled) return text
  const code = SGR_COLORS[status]
  return `\u001B[${code}m${text}\u001B[0m`
}

// One aligned status line:
//   "  ✓ OK    lodash@4.17.21 — published 2026-10-01 (35.2 days ago)"
// indent defaults to 2; tools that nest items under a section pass 4.
function formatItem(status, message, { indent = 2, color = false } = {}) {
  const head = `${SYMBOLS[status]} ${LABELS[status].padEnd(LABEL_WIDTH)}`
  return `${' '.repeat(indent)}${paint(head, status, color)} ${message}`
}

// Section header for grouping items: "\n  Prohibited (2):"
function formatSection(title, count, { indent = 2 } = {}) {
  const suffix = count === undefined ? '' : ` (${count})`
  return `\n${' '.repeat(indent)}${title}${suffix}:`
}

// Structured end-of-run block printed by every tool in non-quiet mode:
//
//   ── Summary ────────────────────────────────────────────
//     ✓ OK    5 passed
//     ✗ FAIL  1 failed
//     Next: npm run defence:license-check
//
// Groups with a zero count are omitted, except `passed`, which is always
// shown so a total failure still reads as a complete summary. `next` is the
// single most useful follow-up command for the observed result (educational
// goal: the output teaches the workflow); pass null on success when there is
// nothing to suggest.
function renderSummary({
  passed = 0,
  failed = 0,
  warned = 0,
  skipped = 0,
  next = null,
  color = false,
} = {}) {
  const divider = `── Summary ${'─'.repeat(SUMMARY_WIDTH - '── Summary '.length)}`
  const lines = [divider]

  const groups = [
    ['pass', passed, 'passed'],
    ['fail', failed, 'failed'],
    ['warn', warned, 'warned'],
    ['skip', skipped, 'skipped'],
  ]
  for (const [status, count, word] of groups) {
    if (count === 0 && status !== 'pass') continue
    lines.push(formatItem(status, `${count} ${word}`, { indent: 2, color }))
  }

  if (next) lines.push(`  Next: ${next}`)
  return `\n${lines.join('\n')}\n`
}

module.exports = {
  SYMBOLS,
  LABELS,
  hasQuietFlag,
  supportsColor,
  paint,
  formatItem,
  formatSection,
  renderSummary,
}
