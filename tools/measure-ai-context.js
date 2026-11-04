#!/usr/bin/env node
'use strict'

// measure-ai-context.js — Measures the token footprint of each AI
// customization layer (Fase J, item P4; feeds PROJECT_STATUS_REPORT.md and
// the AI-3.1 measurement gate).
//
// Why it exists: context costs were previously estimated by hand. This tool
// measures bytes per layer from disk so the evaluation reports real numbers
// and future growth is visible.
//
// Usage:
//   node ./tools/measure-ai-context.js [--format json]
//
// Also measures the session-start injection (`.github/hooks/inject-context`)
// by running its script with empty input — the AI-3.1 decision baseline.

const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const REPO_ROOT = path.resolve(__dirname, '..')

// ~4 bytes per token is the standard GPT-style heuristic for English/code
// text. It is an approximation — the number exists for comparison across
// layers and over time, not for billing precision.
const BYTES_PER_TOKEN = 4

let listDirImpl = (dir) => fs.readdirSync(dir, { withFileTypes: true })
let readFileImpl = (p) => fs.readFileSync(p, 'utf8')
let execFileImpl = execFileSync
let logImpl = console.log

function setImpls(impls) {
  if (impls.listDir) listDirImpl = impls.listDir
  if (impls.readFile) readFileImpl = impls.readFile
  if (impls.execFile) execFileImpl = impls.execFile
  if (impls.log) logImpl = impls.log
}

function resetImpls() {
  listDirImpl = (dir) => fs.readdirSync(dir, { withFileTypes: true })
  readFileImpl = (p) => fs.readFileSync(p, 'utf8')
  execFileImpl = execFileSync
  logImpl = console.log
}

function dirMarkdownBytes(relativeDir, filter) {
  const absolute = path.join(REPO_ROOT, relativeDir)
  const entries = listDirImpl(absolute)
  let files = 0
  let bytes = 0
  for (const entry of entries) {
    const full = path.join(absolute, entry.name)
    if (entry.isDirectory()) {
      // One level down is enough for skills (SKILL.md per folder) and hooks
      // (scripts/). Deeper nesting is not part of the layout conventions.
      const sub = listDirImpl(full)
      for (const subEntry of sub) {
        if (subEntry.isFile() && filter(subEntry.name)) {
          files += 1
          bytes += readFileImpl(path.join(full, subEntry.name)).length
        }
      }
    } else if (entry.isFile() && filter(entry.name)) {
      files += 1
      bytes += readFileImpl(full).length
    }
  }
  return { files, bytes }
}

function collect() {
  const alwaysOn = path.join(REPO_ROOT, '.github/copilot-instructions.md')
  const alwaysOnBytes = readFileImpl(alwaysOn).length

  const instructions = dirMarkdownBytes('.github/instructions', (n) =>
    n.endsWith('.instructions.md'),
  )
  const agents = dirMarkdownBytes('.github/agents', (n) =>
    n.endsWith('.agent.md'),
  )
  const skills = dirMarkdownBytes('.github/skills', (n) => n === 'SKILL.md')
  const hooks = dirMarkdownBytes('.github/hooks', (n) => n.endsWith('.json'))

  // The sessionStart hook payload is dynamic (engines, TODO count, manifest
  // count), so it is measured by running the script once with empty input.
  // Failure is non-fatal: the layer table stays meaningful without it.
  let sessionStart = null
  try {
    const out = execFileImpl(
      'bash',
      [path.join(REPO_ROOT, '.github/hooks/scripts/inject-context.sh')],
      { input: '{}', encoding: 'utf8', timeout: 5000 },
    ).trim()
    sessionStart = { files: 0, bytes: out.length }
  } catch {
    sessionStart = null
  }

  return {
    alwaysOn: { files: 1, bytes: alwaysOnBytes },
    instructions,
    agents,
    skills,
    hooks,
    sessionStart,
  }
}

function main(argv = process.argv.slice(2)) {
  const layers = collect()
  const present = Object.values(layers).filter(Boolean)
  const total = present.reduce((sum, l) => sum + l.bytes, 0)
  const isJson =
    argv.includes('--format') && argv[argv.indexOf('--format') + 1] === 'json'

  if (isJson) {
    logImpl(
      JSON.stringify(
        {
          bytesPerTokenHeuristic: BYTES_PER_TOKEN,
          layers,
          totalBytes: total,
          approxTokens: Math.round(total / BYTES_PER_TOKEN),
        },
        null,
        2,
      ),
    )
    return 0
  }

  logImpl('AI context footprint (measured from disk):')
  logImpl('')
  for (const [name, layer] of Object.entries(layers)) {
    if (!layer) continue // sessionStart unavailable (hook failed)
    const tokens = Math.round(layer.bytes / BYTES_PER_TOKEN)
    logImpl(
      `  ${name.padEnd(14)} ${String(layer.files).padStart(3)} file(s)  ${String(layer.bytes).padStart(7)} bytes  ~${tokens} tokens`,
    )
  }
  logImpl('')
  logImpl(
    `  total          ${total} bytes  ~${Math.round(total / BYTES_PER_TOKEN)} tokens`,
  )
  logImpl('')
  logImpl('Note: only the always-on instructions ship with EVERY request;')
  logImpl('instructions/agents/skills load on demand by scope/relevance.')
  return 0
}

if (require.main === module) {
  main()
}

module.exports = { main, collect, setImpls, resetImpls, BYTES_PER_TOKEN }
