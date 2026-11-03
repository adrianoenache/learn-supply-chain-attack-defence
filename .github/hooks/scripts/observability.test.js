#!/usr/bin/env node
'use strict'

// Tests for the unified observability logger and summary (Fase AI-3.3).
// Both run against a temp log file via OBS_LOG_FILE, never the real log.

const { describe, test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const LOGGER = path.resolve(__dirname, './log-hook-event.js')
const SUMMARY = path.resolve(__dirname, './observability-summary.js')

const tempFiles = []

function tempLog() {
  const file = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'obs-test-')),
    'observability.jsonl',
  )
  tempFiles.push(file)
  return file
}

afterEach(() => {
  while (tempFiles.length > 0) {
    fs.rmSync(path.dirname(tempFiles.pop()), { recursive: true, force: true })
  }
})

function logEvent(file, entry) {
  execFileSync('node', [LOGGER], {
    input: JSON.stringify(entry),
    env: { ...process.env, OBS_LOG_FILE: file },
    timeout: 10000, // cold node spawn on loaded machines
  })
}

function readLog(file) {
  return fs
    .readFileSync(file, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line))
}

describe('log-hook-event', () => {
  test('appends a JSONL entry and adds the timestamp', () => {
    const file = tempLog()
    logEvent(file, {
      hook: 'enforce-security',
      event: 'preToolUse',
      action: 'block',
    })
    const entries = readLog(file)
    assert.equal(entries.length, 1)
    assert.equal(entries[0].hook, 'enforce-security')
    assert.ok(entries[0].at)
  })

  test('swallows malformed input and never fails', () => {
    const file = tempLog()
    execFileSync('node', [LOGGER], {
      input: 'not json',
      env: { ...process.env, OBS_LOG_FILE: file },
      timeout: 10000,
    })
    assert.equal(fs.existsSync(file), false)
  })

  test('caps the log at OBS_MAX_LINES, dropping the oldest entries', () => {
    const file = tempLog()
    for (let i = 0; i < 7; i += 1) {
      logEvent(file, { hook: 'h', event: 'e', action: 'fired', seq: i })
    }
    // Re-trim with a small cap via env on a final write.
    execFileSync('node', [LOGGER], {
      input: JSON.stringify({ hook: 'h', event: 'e', action: 'fired', seq: 7 }),
      env: { ...process.env, OBS_LOG_FILE: file, OBS_MAX_LINES: '5' },
      timeout: 10000,
    })
    const entries = readLog(file)
    // 8 entries with cap 5 → trim target is min(cap, TRIM_TO) = 5; the
    // oldest entries are dropped first.
    assert.equal(entries.length, 5)
    assert.equal(entries[0].seq, 3)
    assert.equal(entries[4].seq, 7)
  })
})

describe('observability-summary', () => {
  test('reports an empty log gracefully', () => {
    const file = tempLog()
    const out = execFileSync('node', [SUMMARY], {
      env: { ...process.env, OBS_LOG_FILE: file },
      encoding: 'utf8',
      timeout: 10000,
    })
    assert.ok(out.includes('No hook events'))
  })

  test('summarizes by action and hook with the defense payoff line', () => {
    const file = tempLog()
    logEvent(file, {
      hook: 'inject-context',
      event: 'sessionStart',
      action: 'fired',
      at: '2026-11-01T10:00:00Z',
    })
    logEvent(file, {
      hook: 'enforce-security',
      event: 'preToolUse',
      action: 'block',
      reason: 'x',
      at: '2026-11-02T10:00:00Z',
    })
    logEvent(file, {
      hook: 'enforce-security',
      event: 'preToolUse',
      action: 'block',
      reason: 'y',
      at: '2026-11-03T10:00:00Z',
    })

    const out = execFileSync('node', [SUMMARY], {
      env: { ...process.env, OBS_LOG_FILE: file },
      encoding: 'utf8',
      timeout: 10000,
    })
    assert.ok(out.includes('3 event(s)'))
    assert.ok(out.includes('block: 2'))
    assert.ok(out.includes('enforce-security: 2'))
    assert.ok(out.includes('blocked 2 dangerous call(s)'))
  })

  test('--format json emits a machine-readable summary', () => {
    const file = tempLog()
    logEvent(file, { hook: 'h', event: 'e', action: 'suggest' })
    const out = execFileSync('node', [SUMMARY, '--format', 'json'], {
      env: { ...process.env, OBS_LOG_FILE: file },
      encoding: 'utf8',
      timeout: 10000,
    })
    const report = JSON.parse(out)
    assert.equal(report.total, 1)
    assert.equal(report.byHook.h, 1)
    assert.equal(report.byAction.suggest, 1)
  })
})
