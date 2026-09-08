#!/usr/bin/env node
'use strict'

// Tests for enforce-shell-script-standards.sh behavior.
// We invoke the script as a subprocess with controlled stdin and verify the
// JSON output, avoiding brittle mocks of the shell internals.

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const { execSync } = require('node:child_process')
const path = require('node:path')

const SCRIPT = path.resolve(
  __dirname,
  './enforce-shell-script-standards.sh',
)

function runWithInput(input) {
  return execSync(`bash "${SCRIPT}"`, {
    input,
    encoding: 'utf8',
    timeout: 5000,
  }).trim()
}

describe('enforce-shell-script-standards.sh', () => {
  test('reminds agent when editing a .sh file', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: '.github/hooks/scripts/example.sh',
    })
    const output = runWithInput(input)
    const parsed = JSON.parse(output)
    assert.ok(parsed.additionalContext)
    assert.ok(parsed.additionalContext.includes('shell-script-review'))
    assert.ok(parsed.additionalContext.includes('set -euo pipefail'))
  })

  test('reminds agent when creating a .sh file', () => {
    const input = JSON.stringify({
      toolName: 'create',
      filePath: '.husky/pre-commit',
    })
    const output = runWithInput(input)
    const parsed = JSON.parse(output)
    assert.ok(parsed.additionalContext)
    assert.ok(parsed.additionalContext.includes('pre-commit-hash-sync'))
  })

  test('returns empty object for non-shell files', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: 'tools/check-external-urls.js',
    })
    const output = runWithInput(input)
    assert.equal(output, '{}')
  })

  test('returns empty object for unrelated tool use', () => {
    const input = JSON.stringify({
      toolName: 'read_file',
      filePath: '.github/hooks/scripts/example.sh',
    })
    const output = runWithInput(input)
    assert.equal(output, '{}')
  })

  test('parses snake_case file_path fallback', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      file_path: 'tools/example.sh',
    })
    const output = runWithInput(input)
    const parsed = JSON.parse(output)
    assert.ok(parsed.additionalContext)
  })
})
