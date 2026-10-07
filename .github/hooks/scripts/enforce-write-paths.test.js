#!/usr/bin/env node
'use strict'

// Tests for enforce-write-paths.sh behavior (Fase AI-2.7.1 / AI-2.7.6).
// Subprocess tests exercise the hook exactly as the runtime invokes it:
// JSON on stdin, decision JSON on stdout.

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const { execSync } = require('node:child_process')
const path = require('node:path')

const SCRIPT = path.resolve(__dirname, './enforce-write-paths.sh')

function runWithInput(input) {
  return execSync(`bash "${SCRIPT}"`, {
    input,
    encoding: 'utf8',
    timeout: 5000,
  }).trim()
}

describe('enforce-write-paths.sh', () => {
  test('denies writing to .env files', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: '.env.production',
    })
    const output = JSON.parse(runWithInput(input))
    assert.equal(output.permissionDecision, 'deny')
    assert.ok(output.permissionDecisionReason.includes('secrets'))
  })

  test('denies writing inside .git', () => {
    const input = JSON.stringify({
      toolName: 'write',
      filePath: '.git/config',
    })
    const output = JSON.parse(runWithInput(input))
    assert.equal(output.permissionDecision, 'deny')
    assert.ok(output.permissionDecisionReason.includes('git commands'))
  })

  test('denies paths escaping the workspace', () => {
    const input = JSON.stringify({
      toolName: 'create',
      filePath: '../outside-the-repo/evil.js',
    })
    const output = JSON.parse(runWithInput(input))
    assert.equal(output.permissionDecision, 'deny')
    assert.ok(output.permissionDecisionReason.includes('workspace'))
  })

  test('warns (not denies) when editing Husky hooks, with the hash-sync skill path', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: '.husky/pre-commit',
    })
    const output = JSON.parse(runWithInput(input))
    assert.ok(output.additionalContext.includes('pre-commit-hash-sync'))
  })

  test('warns when editing package.json', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: 'package.json',
    })
    const output = JSON.parse(runWithInput(input))
    assert.ok(output.additionalContext.includes('defence:add'))
  })

  test('allows ordinary source files', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: 'tools/check-updates.js',
    })
    assert.equal(runWithInput(input), '{}')
  })

  test('allows when the path cannot be determined', () => {
    const input = JSON.stringify({ toolName: 'edit' })
    assert.equal(runWithInput(input), '{}')
  })

  test('ignores non-writing tools', () => {
    const input = JSON.stringify({
      toolName: 'read_file',
      filePath: '.env',
    })
    assert.equal(runWithInput(input), '{}')
  })
})
