#!/usr/bin/env node
'use strict'

// Tests for enforce-security.sh behavior, including the block audit log and
// the repair-oriented message rule (Fase AI-2.7.2 / AI-2.7.5). Since Fase
// AI-3.3 the audit trail lives in the unified observability log; tests point
// OBS_LOG_FILE at a temp file so the real log is never touched.

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const SCRIPT = path.resolve(__dirname, './enforce-security.sh')

let logFile = null

function freshLog() {
  logFile = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'obs-sec-')),
    'observability.jsonl',
  )
  return logFile
}

function runWithInput(input) {
  if (!logFile) freshLog() // never let a test touch the real log
  return execSync(`bash "${SCRIPT}"`, {
    input,
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, OBS_LOG_FILE: logFile },
  }).trim()
}

function readLog() {
  if (!logFile || !fs.existsSync(logFile)) return []
  return fs
    .readFileSync(logFile, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

describe('enforce-security.sh', () => {
  test('denies direct npm install with the sanctioned alternative', () => {
    freshLog()
    const input = JSON.stringify({
      toolName: 'bash',
      toolArgs: { command: 'npm install lodash' },
    })
    const output = JSON.parse(runWithInput(input))
    assert.equal(output.permissionDecision, 'deny')
    // Repair-oriented rule: every block message names the sanctioned path.
    assert.ok(output.permissionDecisionReason.includes('defence:add'))

    const entries = readLog()
    assert.equal(entries.length, 1, 'block should be logged')
    assert.equal(entries[0].tool, 'bash')
    assert.equal(entries[0].action, 'block')
    assert.equal(entries[0].hook, 'enforce-security')
    assert.ok(entries[0].snippet.includes('lodash'))
    fs.rmSync(path.dirname(logFile), { recursive: true, force: true })
  })

  test('denies removing ignore-scripts with a pointer to the safe procedure', () => {
    const input = JSON.stringify({
      toolName: 'bash',
      toolArgs: { command: 'npm config delete ignore-scripts' },
    })
    const output = JSON.parse(runWithInput(input))
    assert.equal(output.permissionDecision, 'deny')
    assert.ok(output.permissionDecisionReason.includes('rebuild procedure'))
    fs.rmSync(path.dirname(logFile), { recursive: true, force: true })
  })

  test('denies bypassing security gates with the approval path', () => {
    const input = JSON.stringify({
      toolName: 'bash',
      toolArgs: { command: 'npm test -- bypass age check' },
    })
    const output = JSON.parse(runWithInput(input))
    assert.equal(output.permissionDecision, 'deny')
    assert.ok(output.permissionDecisionReason.includes('maintainer approval'))
    fs.rmSync(path.dirname(logFile), { recursive: true, force: true })
  })

  test('allows npm ci (the sanctioned deterministic install)', () => {
    const input = JSON.stringify({
      toolName: 'bash',
      toolArgs: { command: 'npm ci' },
    })
    assert.equal(runWithInput(input), '{}')
  })

  test('ignores non-shell tools', () => {
    const input = JSON.stringify({
      toolName: 'read_file',
      toolArgs: { path: 'package.json' },
    })
    assert.equal(runWithInput(input), '{}')
  })
})
