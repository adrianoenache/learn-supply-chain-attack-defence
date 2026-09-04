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
})
