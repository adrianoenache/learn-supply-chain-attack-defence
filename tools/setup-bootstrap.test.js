#!/usr/bin/env node
'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')

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
  fs.mkdirSync(path.join(tmpDir, '.husky'), { recursive: true })
  fs.writeFileSync(path.join(tmpDir, '.husky', 'pre-commit'), 'npm run lint\n')
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

function makeMockConfig(overrides = {}) {
  return {
    huskyPreCommitHash: null,
    defences: { huskyPreCommitHash: null },
    ...overrides,
  }
}

describe('setup-bootstrap', () => {
  test('main exits 0 when package-lock.json exists', async () => {
    await withTempProject(
      async () => {
        const mod = readScriptExports()
        mod.setLoadConfigImpl(() => makeMockConfig())
        try {
          const code = mod.main()
          assert.equal(code, 0)
        } finally {
          mod.resetLoadConfigImpl()
        }
      },
      { hasLock: true },
    )
  })

  test('main runs bootstrap steps when package-lock.json is missing', async () => {
    await withTempProject(async () => {
      const calls = []
      const mod = readScriptExports()
      mod.setLoadConfigImpl(() => makeMockConfig())
      mod.setSpawnSyncImpl(makeMockSpawn(calls))
      try {
        const code = mod.main()
        assert.equal(code, 0)
        assert.equal(calls.length, 5)
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
        assert.deepEqual(calls[4], {
          cmd: 'npm',
          args: ['run', 'prepare'],
        })
      } finally {
        mod.resetSpawnSyncImpl()
        mod.resetLoadConfigImpl()
      }
    })
  })

  test('main skips hook check when huskyPreCommitHash is not configured', async () => {
    await withTempProject(async () => {
      const mod = readScriptExports()
      mod.setLoadConfigImpl(() => makeMockConfig())
      mod.setSpawnSyncImpl(makeMockSpawn([]))
      try {
        const code = mod.main()
        assert.equal(code, 0)
      } finally {
        mod.resetSpawnSyncImpl()
        mod.resetLoadConfigImpl()
      }
    })
  })

  test('main records pre-commit hook hash after bootstrap', async () => {
    await withTempProject(async (tmpDir) => {
      const mod = readScriptExports()
      mod.setLoadConfigImpl(() => makeMockConfig())
      mod.setSpawnSyncImpl(makeMockSpawn([]))
      try {
        const code = mod.main()
        assert.equal(code, 0)
        const pkg = JSON.parse(
          fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf8'),
        )
        assert.ok(
          pkg.defences?.huskyPreCommitHash?.length > 0,
          'defences.huskyPreCommitHash should be recorded',
        )
        assert.equal(
          pkg.defences.huskyPreCommitHash,
          pkg.huskyPreCommitHash,
          'legacy huskyPreCommitHash should stay in sync',
        )
      } finally {
        mod.resetSpawnSyncImpl()
        mod.resetLoadConfigImpl()
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

  test('main throws when bootstrap command is killed by signal', async () => {
    await withTempProject(async () => {
      const mod = readScriptExports()
      mod.setSpawnSyncImpl(function killedSpawn() {
        return { status: null, signal: 'SIGTERM' }
      })
      try {
        let threw = false
        try {
          mod.main()
        } catch (err) {
          threw = true
          assert.ok(err.message.includes('SIGTERM'))
        }
        assert.equal(threw, true)
      } finally {
        mod.resetSpawnSyncImpl()
      }
    })
  })

  test('CLI exits 0 when lockfile exists', async () => {
    await withTempProject(
      async () => {
        const { spawnSync } = require('node:child_process')
        const result = spawnSync(process.execPath, [SCRIPT_PATH], {
          encoding: 'utf8',
          cwd: process.cwd(),
        })
        assert.equal(result.status, 0)
        assert.ok(result.stdout.includes('package-lock.json already exists'))
      },
      { hasLock: true },
    )
  })

  test('CLI exits 0 in current project', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
  })
})
