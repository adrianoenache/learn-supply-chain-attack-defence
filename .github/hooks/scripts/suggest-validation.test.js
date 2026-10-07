#!/usr/bin/env node
'use strict'

// Tests for suggest-validation.sh behavior.
// Subprocess tests are used because the script is a thin orchestration layer
// over parse-hook-input.js and shell decisions.

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const { execSync } = require('node:child_process')
const path = require('node:path')

const SCRIPT = path.resolve(__dirname, './suggest-validation.sh')

function runWithInput(input) {
  return execSync(`bash "${SCRIPT}"`, {
    input,
    encoding: 'utf8',
    timeout: 5000,
  }).trim()
}

describe('suggest-validation.sh', () => {
  test('suggests lint for tools/*.js edits', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: 'tools/check-updates.js',
    })
    const output = JSON.parse(runWithInput(input))
    assert.ok(output.additionalContext.includes('npm run lint'))
  })

  test('suggests npm test for tools test files', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: 'tools/check-updates.test.js',
    })
    const output = JSON.parse(runWithInput(input))
    assert.ok(output.additionalContext.includes('npm test'))
  })

  test('suggests npm test for .github test files (sanity suites live there)', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: '.github/skills/skills.sanity.test.js',
    })
    const output = JSON.parse(runWithInput(input))
    assert.ok(output.additionalContext.includes('npm test'))
  })

  test('suggests md-links check for docs edits', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: 'docs/en/tools.md',
    })
    const output = JSON.parse(runWithInput(input))
    assert.ok(output.additionalContext.includes('defence:check-md-links'))
  })

  test('suggests CLI contract verification for top-level tools scripts', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: 'tools/add-package.js',
    })
    const output = JSON.parse(runWithInput(input))
    assert.ok(output.additionalContext.includes('CLI contract'))
  })

  test('never hardcodes a test count (the badge is generated, not static)', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: 'tools/check-updates.test.js',
    })
    const output = JSON.parse(runWithInput(input))
    // Regression guard: a literal "N/N expected" message goes stale on every
    // test addition, so the script must not embed one.
    assert.ok(!/\d+\/\d+ expected/.test(output.additionalContext))
  })

  test('returns empty object for unrelated paths', () => {
    const input = JSON.stringify({
      toolName: 'edit',
      filePath: '.gitignore',
    })
    assert.equal(runWithInput(input), '{}')
  })

  test('returns empty object for non-edit tool use', () => {
    const input = JSON.stringify({
      toolName: 'read_file',
      filePath: 'tools/check-updates.js',
    })
    assert.equal(runWithInput(input), '{}')
  })
})
