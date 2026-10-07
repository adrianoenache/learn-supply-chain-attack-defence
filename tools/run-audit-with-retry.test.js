#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const toolPath = path.resolve(__dirname, './run-audit-with-retry.js')

function loadTool() {
  // Force a fresh require so monkey-patching runAudit does not leak across tests.
  delete require.cache[toolPath]
  return require(toolPath)
}

describe('run-audit-with-retry', () => {
  beforeEach(() => {
    // Each test supplies its own mocked runAudit via monkey-patching.
  })

  test('returns 0 when audit passes on first attempt', () => {
    const tool = loadTool()
    tool.sleepSync = () => {}
    tool.runAudit = () => ({ status: 0, stdout: 'ok', stderr: '' })
    assert.equal(tool.main(), 0)
    tool.resetImpl()
  })

  test('retries on transient timeout error and returns 0 when audit passes', () => {
    const tool = loadTool()
    tool.sleepSync = () => {}
    let attempts = 0
    tool.runAudit = () => {
      attempts++
      if (attempts === 1) {
        return {
          status: 1,
          stdout: '',
          stderr:
            'npm warn audit network timeout at: https://registry.npmjs.org',
        }
      }
      return { status: 0, stdout: 'ok', stderr: '' }
    }
    assert.equal(tool.main(), 0)
    assert.equal(attempts, 2)
    tool.resetImpl()
  })

  test('fails immediately on vulnerability finding without retry', () => {
    const tool = loadTool()
    tool.sleepSync = () => {}
    let attempts = 0
    tool.runAudit = () => {
      attempts++
      return {
        status: 1,
        stdout: 'found 1 high severity vulnerability',
        stderr: '',
      }
    }
    assert.equal(tool.main(), 1)
    assert.equal(attempts, 1)
    tool.resetImpl()
  })

  test('gives up after MAX_ATTEMPTS transient failures', () => {
    const tool = loadTool()
    tool.sleepSync = () => {}
    let attempts = 0
    tool.runAudit = () => {
      attempts++
      return {
        status: 1,
        stdout: '',
        stderr: 'npm warn audit endpoint returned an error',
      }
    }
    assert.equal(tool.main(), 1)
    assert.equal(attempts, tool.MAX_ATTEMPTS)
    tool.resetImpl()
  })

  test('isTransientError returns false for vulnerability output', () => {
    const tool = loadTool()
    assert.equal(
      tool.isTransientError(
        { status: 1, stdout: 'found high severity vulnerability', stderr: '' },
        1,
      ),
      false,
    )
  })

  test('isTransientError returns true for network timeout', () => {
    const tool = loadTool()
    assert.equal(
      tool.isTransientError(
        {
          status: 1,
          stdout: '',
          stderr:
            'npm warn audit network timeout at: https://registry.npmjs.org',
        },
        1,
      ),
      true,
    )
  })

  test('default sleepSync actually waits (covers the real implementation)', () => {
    // The default sleep is intentionally synchronous (Atomics.wait). The
    // 10 ms value is the smallest delay that stays measurable without
    // flakiness on fast machines; it exists only to prove the call blocks.
    const mod = loadTool()
    const started = Date.now()
    mod.sleepSync(10)
    assert.ok(Date.now() - started >= 5)
  })

  test('main forwards audit stdout/stderr before deciding', () => {
    const mod = loadTool()
    const written = { out: [], err: [] }
    const originalOut = process.stdout.write.bind(process.stdout)
    const originalErr = process.stderr.write.bind(process.stderr)
    process.stdout.write = (chunk) => (written.out.push(chunk), true)
    process.stderr.write = (chunk) => (written.err.push(chunk), true)
    mod.runAudit = () => ({
      status: 0,
      stdout: 'audit-ok-out',
      stderr: 'audit-ok-err',
    })
    try {
      assert.equal(mod.main([]), 0)
      assert.ok(written.out.includes('audit-ok-out'))
      assert.ok(written.err.includes('audit-ok-err'))
    } finally {
      process.stdout.write = originalOut
      process.stderr.write = originalErr
    }
  })

  test('main uses custom CLI args instead of the defaults', () => {
    const mod = loadTool()
    const seen = []
    mod.runAudit = (args) => {
      seen.push(args)
      return { status: 0, stdout: '', stderr: '' }
    }
    assert.equal(mod.main(['--audit-level=moderate']), 0)
    assert.deepEqual(seen[0], ['--audit-level=moderate'])
  })
})
