#!/usr/bin/env node
'use strict'

// Tests for check-npmrc.js (Fase L.2).
// The filesystem is injected: .npmrc content and extension-file presence are
// fixtures, so the tests never touch the real project configuration.

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, './check-npmrc.js')

// Mirrors the real project .npmrc keys (2026-11-03). Keep in sync when the
// project adopts new documented keys — the tool is the enforcement point.
const VALID_NPMRC = `
# comment line
save-exact=true
package-lock=true
registry=https://registry.npmjs.org/
fund=false
audit=true
audit-level=high
npm-audit-fix-level=high
send-metrics=false
ignore-scripts=true
engine-strict=true
min-release-age=7
fetch-retries=3
fetch-retry-mintimeout=10000
fetch-retry-maxtimeout=60000
fetch-timeout=300000
maxsockets=10
strict-ssl=true
`

let script
let logs
let errors
let exitCode
let npmrcContent
let npmrcExists
let extensionFiles

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

beforeEach(() => {
  script = readScriptExports()
  logs = []
  errors = []
  exitCode = null
  npmrcContent = VALID_NPMRC
  npmrcExists = true
  extensionFiles = []

  script.setImpls({
    readFile: () => npmrcContent,
    exists: (p) => {
      if (p.endsWith('.npmrc')) return npmrcExists
      return extensionFiles.some((f) => p.endsWith(f))
    },
    exit: (code) => {
      exitCode = code
    },
    log: (...args) => logs.push(args.join(' ')),
    error: (...args) => errors.push(args.join(' ')),
  })
})

afterEach(() => {
  script.resetImpls()
})

describe('check-npmrc parsing', () => {
  test('parseNpmrc skips comments/blank lines and normalizes array keys', () => {
    const entries = script.parseNpmrc(
      '# c\n; sc\n\nsave-exact=true\nmin-release-age-exclude[]=@scope/pkg\n',
    )
    assert.deepEqual(
      entries.map((e) => e.key),
      ['save-exact', 'min-release-age-exclude'],
    )
    assert.equal(entries[0].line, 4)
  })

  test('evaluate classifies unknown, lookahead, and forbidden keys', () => {
    const entries = script.parseNpmrc(
      'save-exact=true\nsend-metrics=false\nignore-scripts=false\n',
    )
    const { problems, lookahead } = script.evaluate(entries, [])
    assert.deepEqual(
      lookahead.map((l) => l.key),
      ['send-metrics'],
    )
    assert.equal(problems.length, 1)
    assert.ok(problems[0].reason.includes('lifecycle-script block'))
    // The lookahead registry always carries a human-readable justification.
    for (const justification of script.LOOKAHEAD_KEYS.values()) {
      assert.ok(justification.length > 20)
    }
  })
})

describe('check-npmrc validation', () => {
  test('accepts the real project configuration surface', () => {
    script.main([])
    assert.equal(exitCode, 0)
    assert.ok(logs.some((l) => l.includes('0 problem(s)')))
    // The two lookahead keys are acknowledged, not silently ignored.
    assert.ok(logs.some((l) => l.includes('npm-audit-fix-level')))
    assert.ok(logs.some((l) => l.includes('send-metrics')))
  })

  test('rejects an unknown key with an actionable message', () => {
    npmrcContent = `${VALID_NPMRC}\nsave-prefixed=true\n`
    script.main([])
    assert.equal(exitCode, 1)
    assert.ok(errors.some((e) => e.includes('save-prefixed')))
    assert.ok(errors.some((e) => e.includes('KNOWN_KEYS')))
  })

  test('rejects ignore-scripts=false (weakens Layer 6)', () => {
    npmrcContent = VALID_NPMRC.replace(
      'ignore-scripts=true',
      'ignore-scripts=false',
    )
    script.main([])
    assert.equal(exitCode, 1)
    assert.ok(errors.some((e) => e.includes('ignore-scripts=false')))
  })

  test('rejects strict-ssl=false (registry MitM)', () => {
    npmrcContent = VALID_NPMRC.replace('strict-ssl=true', 'strict-ssl=false')
    script.main([])
    assert.equal(exitCode, 1)
    assert.ok(errors.some((e) => e.includes('strict-ssl')))
  })

  test('rejects extension-file key (root-owned install-time code)', () => {
    npmrcContent = `${VALID_NPMRC}\nextension-file=.npm-extension.mjs\n`
    script.main([])
    assert.equal(exitCode, 1)
    assert.ok(errors.some((e) => e.includes('extension-file')))
  })

  test('rejects a discovered .npm-extension.mjs at the project root', () => {
    extensionFiles = ['.npm-extension.mjs']
    script.main([])
    assert.equal(exitCode, 1)
    assert.ok(errors.some((e) => e.includes('.npm-extension.mjs')))
  })

  test('rejects a discovered .npm-extension.cjs at the project root', () => {
    extensionFiles = ['.npm-extension.cjs']
    script.main([])
    assert.equal(exitCode, 1)
    assert.ok(errors.some((e) => e.includes('.npm-extension.cjs')))
  })

  test('fails when .npmrc is missing', () => {
    npmrcExists = false
    script.main([])
    assert.equal(exitCode, 1)
    assert.ok(errors.some((e) => e.includes('.npmrc not found')))
  })

  test('--format json prints a machine-readable report', () => {
    script.main(['--format', 'json'])
    assert.equal(exitCode, 0)
    const report = JSON.parse(logs.join('\n'))
    assert.equal(report.problems.length, 0)
    assert.deepEqual(report.lookahead.sort(), [
      'npm-audit-fix-level',
      'send-metrics',
    ])
  })

  test('--silent suppresses the report but still fails on problems', () => {
    npmrcContent = `${VALID_NPMRC}\nunknown-key=1\n`
    script.main(['--silent'])
    assert.equal(exitCode, 1)
    assert.equal(logs.length, 0)
  })

  test('--quiet is accepted as an alias of --silent (Phase N)', () => {
    script.main(['--quiet'])
    assert.equal(exitCode, 0)
    assert.equal(logs.length, 0, '--quiet must suppress the report')
  })
})
