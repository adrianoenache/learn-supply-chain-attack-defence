#!/usr/bin/env node
'use strict'

// Tests for validate-urls.sh behavior.
// Subprocess tests are used because the script is a thin orchestration layer
// over parse-hook-input.js and shell decisions.

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const { execSync } = require('node:child_process')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')

const SCRIPT = path.resolve(__dirname, './validate-urls.sh')

// Hook scripts now emit observability events; point the log at a throwaway
// file so the suite never pollutes the real (gitignored) observability.jsonl.
const OBS_LOG = path.join(
  fs.mkdtempSync(path.join(os.tmpdir(), 'obs-test-')),
  'observability.jsonl',
)

function runWithInput(input) {
  return execSync(`bash "${SCRIPT}"`, {
    input,
    encoding: 'utf8',
    timeout: 5000,
    env: { ...process.env, OBS_LOG_FILE: OBS_LOG },
  }).trim()
}

describe('validate-urls.sh', () => {
  test('suggests URL validation for docs markdown edits', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: 'docs/en/security.md',
    })
    const output = runWithInput(input)
    const parsed = JSON.parse(output)
    assert.ok(parsed.additionalContext)
    assert.ok(parsed.additionalContext.includes('defence:check-external-urls'))
  })

  test('suggests URL validation for .github file edits', () => {
    const input = JSON.stringify({
      toolName: 'create',
      filePath: '.github/skills/example/SKILL.md',
    })
    const output = runWithInput(input)
    const parsed = JSON.parse(output)
    assert.ok(parsed.additionalContext)
    assert.ok(parsed.additionalContext.includes('defence:check-external-urls'))
  })

  test('returns empty object for unrelated paths', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: 'tools/check-external-urls.js',
    })
    const output = runWithInput(input)
    assert.equal(output, '{}')
  })

  test('returns empty object for non-edit tool use', () => {
    const input = JSON.stringify({
      toolName: 'read_file',
      filePath: 'README.md',
    })
    const output = runWithInput(input)
    assert.equal(output, '{}')
  })
})
