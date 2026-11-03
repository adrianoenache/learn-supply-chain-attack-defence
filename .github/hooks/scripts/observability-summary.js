#!/usr/bin/env node
'use strict'

// observability-summary.js — Reads the unified hook log (observability.jsonl)
// and prints how often each defense fired (Fase AI-3.3). This is the teaching
// payoff of the JSONL log: "how many times did the project protect me?"
//
// Usage:
//   node .github/hooks/scripts/observability-summary.js [--format json]
//
// Exit codes: 0 always (a missing log just means "no events yet").

const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_LOG = path.join(__dirname, 'observability.jsonl')

function summarize(entries) {
  const byHook = new Map()
  const byAction = new Map()
  let first = null
  let last = null
  for (const entry of entries) {
    const hook = entry.hook ?? 'unknown'
    const action = entry.action ?? 'fired'
    byHook.set(hook, (byHook.get(hook) ?? 0) + 1)
    byAction.set(action, (byAction.get(action) ?? 0) + 1)
    if (entry.at) {
      if (!first || entry.at < first) first = entry.at
      if (!last || entry.at > last) last = entry.at
    }
  }
  const sortDesc = (map) => [...map.entries()].sort((a, b) => b[1] - a[1])
  return {
    total: entries.length,
    byHook: sortDesc(byHook),
    byAction: sortDesc(byAction),
    first,
    last,
  }
}

function main(argv = process.argv.slice(2)) {
  const logFile = process.env.OBS_LOG_FILE || DEFAULT_LOG
  const isJson =
    argv.includes('--format') && argv[argv.indexOf('--format') + 1] === 'json'

  let entries = []
  if (fs.existsSync(logFile)) {
    entries = fs
      .readFileSync(logFile, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line)
        } catch {
          return null // tolerate a torn last line (crash mid-write)
        }
      })
      .filter(Boolean)
  }

  const summary = summarize(entries)

  if (isJson) {
    console.log(
      JSON.stringify(
        {
          ...summary,
          byHook: Object.fromEntries(summary.byHook),
          byAction: Object.fromEntries(summary.byAction),
        },
        null,
        2,
      ),
    )
    return
  }

  if (summary.total === 0) {
    console.log('No hook events logged yet. The log is written to')
    console.log('.github/hooks/scripts/observability.jsonl as hooks fire.')
    return
  }

  console.log(`Hook observability — ${summary.total} event(s)`)
  console.log(`  window: ${summary.first} → ${summary.last}`)
  console.log('')
  console.log('  By action:')
  for (const [action, count] of summary.byAction) {
    console.log(`    ${action}: ${count}`)
  }
  console.log('')
  console.log('  By hook:')
  for (const [hook, count] of summary.byHook) {
    console.log(`    ${hook}: ${count}`)
  }
  if ((summary.byAction.find(([a]) => a === 'block') ?? [null, 0])[1] > 0) {
    const blocks = summary.byAction.find(([a]) => a === 'block')[1]
    console.log('')
    console.log(`  🛡️  The defenses blocked ${blocks} dangerous call(s).`)
  }
}

main()
