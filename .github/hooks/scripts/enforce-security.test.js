#!/usr/bin/env node
'use strict'

// Tests for enforce-security.sh behavior, including the block audit log and
// the repair-oriented message rule (Fase AI-2.7.2 / AI-2.7.5).

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const SCRIPT = path.resolve(__dirname, './enforce-security.sh')
const LOG_FILE = path.resolve(__dirname, './security-blocks.log')

function runWithInput(input) {
  return execSync(`bash "${SCRIPT}"`, {
    input,
    encoding: 'utf8',
    timeout: 5000,
  }).trim()
}

function readLog() {
  if (!fs.existsSync(LOG_FILE)) return []
  return fs
    .readFileSync(LOG_FILE, 'utf8')
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

describe('enforce-security.sh', () => {
  test('denies direct npm install with the sanctioned alternative', () => {
    const before = readLog().length
    const input = JSON.stringify({
      toolName: 'bash',
      toolArgs: { command: 'npm install lodash' },
    })
    const output = JSON.parse(runWithInput(input))
    assert.equal(output.permissionDecision, 'deny')
    // Repair-oriented rule: every block message names the sanctioned path.
    assert.ok(output.permissionDecisionReason.includes('defence:add'))

    const after = readLog()
    assert.equal(after.length, before + 1, 'block should be logged')
    assert.equal(after[after.length - 1].tool, 'bash')
    assert.ok(after[after.length - 1].snippet.includes('lodash'))
    fs.unlinkSync(LOG_FILE) // test cleanup: the log is local-only state
  })

  test('denies removing ignore-scripts with a pointer to the safe procedure', () => {
    const input = JSON.stringify({
      toolName: 'bash',
      toolArgs: { command: 'npm config delete ignore-scripts' },
    })
    const output = JSON.parse(runWithInput(input))
    assert.equal(output.permissionDecision, 'deny')
    assert.ok(output.permissionDecisionReason.includes('rebuild procedure'))
    fs.unlinkSync(LOG_FILE)
  })

  test('denies bypassing security gates with the approval path', () => {
    const input = JSON.stringify({
      toolName: 'bash',
      toolArgs: { command: 'npm test -- bypass age check' },
    })
    const output = JSON.parse(runWithInput(input))
    assert.equal(output.permissionDecision, 'deny')
    assert.ok(
      output.permissionDecisionReason.includes('maintainer approval'),
    )
    fs.unlinkSync(LOG_FILE)
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
