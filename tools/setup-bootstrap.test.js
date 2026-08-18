#!/usr/bin/env node
'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const SCRIPT_PATH = path.resolve(__dirname, 'setup-bootstrap.js')

function readScriptExports() {
  // Load module fresh for each test by clearing require cache.
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

async function withTempProject(fn, { hasLock = false } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-test-'))
  const origCwd = process.cwd()
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    `${JSON.stringify({ name: 'bootstrap-test', version: '1.0.0' })}\n`,
  )
  if (hasLock) {
    fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '{}\n')
  }
  process.chdir(tmpDir)
  try {
    return await fn(tmpDir)
  } finally {
    process.chdir(origCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

function makeMockSpawn(calls) {
  return function mockSpawn(cmd, args) {
    calls.push({ cmd, args })
    return { status: 0, signal: null }
  }
}

describe('setup-bootstrap', () => {
  test('main exits 0 when package-lock.json exists', async () => {
    await withTempProject(
      async () => {
        const { main } = readScriptExports()
        const code = main()
        assert.equal(code, 0)
      },
      { hasLock: true },
    )
  })

  test('main runs bootstrap steps when package-lock.json is missing', async () => {
    await withTempProject(async () => {
      const calls = []
      const mod = readScriptExports()
      mod.setSpawnSyncImpl(makeMockSpawn(calls))
      try {
        const code = mod.main()
        assert.equal(code, 0)
        assert.equal(calls.length, 4)
        assert.deepEqual(calls[0], {
          cmd: 'npm',
          args: ['install', '--ignore-scripts', '--save-exact'],
        })
        assert.deepEqual(calls[1], {
          cmd: 'npm',
          args: ['run', 'defence:pkg-age-check'],
        })
        assert.deepEqual(calls[2], {
          cmd: 'npm',
          args: ['audit', 'signatures'],
        })
        assert.deepEqual(calls[3], {
          cmd: 'npm',
          args: ['audit', '--audit-level=high'],
        })
      } finally {
        mod.resetSpawnSyncImpl()
      }
    })
  })

  test('main throws when a bootstrap command fails', async () => {
    await withTempProject(async () => {
      const mod = readScriptExports()
      mod.setSpawnSyncImpl(function failingSpawn() {
        return { status: 1, signal: null }
      })
      try {
        let threw = false
        try {
          mod.main()
        } catch (err) {
          threw = true
          assert.ok(err.message.includes('First install failed'))
        }
        assert.equal(threw, true)
      } finally {
        mod.resetSpawnSyncImpl()
      }
    })
  })
})
