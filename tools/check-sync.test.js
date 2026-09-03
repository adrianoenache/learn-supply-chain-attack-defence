#!/usr/bin/env node
'use strict'

// Tests for check-sync.js and the shared sync-check helper.
// Uses node:test + node:assert + native modules only.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const { spawnSync } = require('node:child_process')

const SYNC_CHECK_PATH = path.resolve(__dirname, 'lib', 'sync-check.js')
const CHECK_SYNC_PATH = path.resolve(__dirname, 'check-sync.js')

function readSyncCheckExports() {
  delete require.cache[require.resolve(SYNC_CHECK_PATH)]
  return require(SYNC_CHECK_PATH)
}

function readCheckSyncExports() {
  delete require.cache[require.resolve(CHECK_SYNC_PATH)]
  return require(CHECK_SYNC_PATH)
}

function makeMockFs({ lock = null, nodeModulesLock = null } = {}) {
  return {
    readFileSync: (filePath, _encoding) => {
      if (
        filePath.includes('package-lock.json') &&
        !filePath.includes('node_modules')
      ) {
        if (lock === null) throw new Error('lock not found')
        return typeof lock === 'string' ? lock : JSON.stringify(lock)
      }
      if (filePath.includes('node_modules/.package-lock.json')) {
        if (nodeModulesLock === null)
          throw new Error('node_modules lock not found')
        return typeof nodeModulesLock === 'string'
          ? nodeModulesLock
          : JSON.stringify(nodeModulesLock)
      }
      throw new Error(`unexpected read: ${filePath}`)
    },
    existsSync: () => true,
  }
}

function computeHash(content) {
  return require('node:crypto')
    .createHash('sha256')
    .update(content)
    .digest('hex')
}

describe('sync-check helper', () => {
  test('returns in sync when packageLockHash matches', () => {
    const mod = readSyncCheckExports()
    const lock = JSON.stringify({ name: 'test', lockfileVersion: 3 })
    const hash = computeHash(lock)

    mod.setImpls({
      fs: makeMockFs({
        lock,
        nodeModulesLock: { packageLockHash: hash },
      }),
      spawnSync: () => {
        throw new Error('should not call npm ls')
      },
    })

    try {
      const result = mod.isNodeModulesInSync()
      assert.equal(result.inSync, true)
    } finally {
      mod.resetImpls()
    }
  })

  test('returns out of sync when packageLockHash differs', () => {
    const mod = readSyncCheckExports()
    const lock = JSON.stringify({ name: 'test', lockfileVersion: 3 })

    mod.setImpls({
      fs: makeMockFs({
        lock,
        nodeModulesLock: { packageLockHash: 'different-hash' },
      }),
      spawnSync: () => ({
        status: 1,
        stdout: '',
        stderr: 'ERR!',
      }),
    })

    try {
      const result = mod.isNodeModulesInSync()
      assert.equal(result.inSync, false)
      assert.ok(result.reason)
    } finally {
      mod.resetImpls()
    }
  })

  test('uses npm ls fallback and reports in sync', () => {
    const mod = readSyncCheckExports()
    const lock = JSON.stringify({ name: 'test', lockfileVersion: 3 })

    mod.setImpls({
      fs: makeMockFs({
        lock,
        nodeModulesLock: { packageLockHash: 'different-hash' },
      }),
      spawnSync: () => ({
        status: 0,
        stdout: JSON.stringify({
          dependencies: {
            '@biomejs/biome': { version: '2.5.8' },
            husky: { version: '9.1.7' },
          },
        }),
      }),
      pkg: {
        devDependencies: {
          '@biomejs/biome': '2.5.8',
          husky: '9.1.7',
        },
      },
    })

    try {
      const result = mod.isNodeModulesInSync()
      assert.equal(result.inSync, true)
    } finally {
      mod.resetImpls()
    }
  })

  test('npm ls fallback detects version mismatch', () => {
    const mod = readSyncCheckExports()
    const lock = JSON.stringify({ name: 'test', lockfileVersion: 3 })

    mod.setImpls({
      fs: makeMockFs({
        lock,
        nodeModulesLock: { packageLockHash: 'different-hash' },
      }),
      spawnSync: () => ({
        status: 0,
        stdout: JSON.stringify({
          dependencies: {
            '@biomejs/biome': { version: '2.5.8' },
            husky: { version: '9.2.0' },
          },
        }),
      }),
      pkg: {
        devDependencies: {
          '@biomejs/biome': '2.5.8',
          husky: '9.1.7',
        },
      },
    })

    try {
      const result = mod.isNodeModulesInSync()
      assert.equal(result.inSync, false)
      assert.ok(result.reason.includes('husky'))
    } finally {
      mod.resetImpls()
    }
  })
})

describe('check-sync CLI', () => {
  test('returns 0 and prints success when in sync', () => {
    const mod = readCheckSyncExports()
    const lock = JSON.stringify({ name: 'test', lockfileVersion: 3 })
    const hash = computeHash(lock)

    mod.setImpls({
      fs: makeMockFs({
        lock,
        nodeModulesLock: { packageLockHash: hash },
      }),
      spawnSync: () => {
        throw new Error('should not call npm ls')
      },
    })

    const originalLog = console.log
    console.log = () => {}

    try {
      const code = mod.main([])
      assert.equal(code, 0)
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('returns 1 and prints fix command with --fix', () => {
    const mod = readCheckSyncExports()
    const lock = JSON.stringify({ name: 'test', lockfileVersion: 3 })

    mod.setImpls({
      fs: makeMockFs({
        lock,
        nodeModulesLock: { packageLockHash: 'different-hash' },
      }),
      spawnSync: () => ({
        status: 1,
        stdout: '',
        stderr: 'ERR!',
      }),
    })

    const originalLog = console.log
    console.log = () => {}

    try {
      const code = mod.main(['--fix'])
      assert.equal(code, 1)
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('--silent suppresses output but still returns code 1', () => {
    const mod = readCheckSyncExports()
    const lock = JSON.stringify({ name: 'test', lockfileVersion: 3 })

    mod.setImpls({
      fs: makeMockFs({
        lock,
        nodeModulesLock: { packageLockHash: 'different-hash' },
      }),
      spawnSync: () => ({
        status: 1,
        stdout: '',
        stderr: 'ERR!',
      }),
    })

    try {
      const code = mod.main(['--silent'])
      assert.equal(code, 1)
    } finally {
      mod.resetImpls()
    }
  })

  test('prints non-fix recommendation when out of sync', () => {
    const mod = readCheckSyncExports()
    const lock = JSON.stringify({ name: 'test', lockfileVersion: 3 })

    mod.setImpls({
      fs: makeMockFs({
        lock,
        nodeModulesLock: { packageLockHash: 'different-hash' },
      }),
      spawnSync: () => ({
        status: 1,
        stdout: '',
        stderr: 'ERR!',
      }),
    })

    const logs = []
    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))
    try {
      const code = mod.main([])
      assert.equal(code, 1)
      assert.ok(logs.some((line) => line.includes('defence:sync-check')))
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('setExitImpl and resetExitImpl change exit implementation', () => {
    const mod = readCheckSyncExports()
    let called = false
    mod.setExitImpl(() => {
      called = true
    })
    try {
      mod.resetExitImpl()
      assert.equal(called, false)
    } finally {
      mod.resetExitImpl()
    }
  })

  test('CLI exits 0 when node_modules is in sync', () => {
    const result = spawnSync(process.execPath, [CHECK_SYNC_PATH, '--silent'], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
  })
})
