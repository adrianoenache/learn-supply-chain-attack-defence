#!/usr/bin/env node
'use strict'

// Tests for verify-defences.js.
// Uses node:test + node:assert/strict + native modules only.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const SCRIPT_PATH = path.resolve(__dirname, 'verify-defences.js')

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

function makeMockFs(files) {
  return {
    existsSync: (p) => Object.hasOwn(files, p),
    readFileSync: (p, encoding) => {
      if (!Object.hasOwn(files, p)) {
        const err = new Error(`ENOENT: ${p}`)
        err.code = 'ENOENT'
        throw err
      }
      const content = files[p]
      return encoding === 'utf8' || encoding === undefined
        ? content
        : Buffer.from(content)
    },
  }
}

function makeMockCrypto(hashes) {
  return {
    createHash: () => ({
      update: () => {},
      digest: () => hashes.shift() || 'default-hash',
    }),
  }
}

function makeExitImpl() {
  let code = null
  const fn = (c) => {
    code = c
    throw new Error(`EXIT_CALLED:${c}`)
  }
  fn.getCode = () => code
  return fn
}

describe('verify-defences', () => {
  test('verify returns ok when all hashes match', () => {
    const mod = readScriptExports()
    const cwd = '/target'
    const files = {
      [path.join(cwd, '.defence-manifest.json')]: JSON.stringify({
        version: 1,
        files: [{ path: 'tools/a.js', hash: 'abc123' }],
      }),
      [path.join(cwd, 'tools/a.js')]: 'content',
    }
    mod.setFsImpl(makeMockFs(files))
    mod.setCryptoImpl(makeMockCrypto(['abc123']))
    try {
      const result = mod.verify(cwd)
      assert.equal(result.missing.length, 0)
      assert.equal(result.changed.length, 0)
      assert.equal(result.fileCount, 1)
    } finally {
      mod.resetFsImpl()
      mod.resetCryptoImpl()
    }
  })

  test('verify reports missing files', () => {
    const mod = readScriptExports()
    const cwd = '/target'
    const files = {
      [path.join(cwd, '.defence-manifest.json')]: JSON.stringify({
        version: 1,
        files: [{ path: 'tools/missing.js', hash: 'abc123' }],
      }),
    }
    mod.setFsImpl(makeMockFs(files))
    try {
      const result = mod.verify(cwd)
      assert.deepEqual(result.missing, ['tools/missing.js'])
      assert.equal(result.changed.length, 0)
    } finally {
      mod.resetFsImpl()
    }
  })

  test('verify reports changed files', () => {
    const mod = readScriptExports()
    const cwd = '/target'
    const files = {
      [path.join(cwd, '.defence-manifest.json')]: JSON.stringify({
        version: 1,
        files: [{ path: 'tools/a.js', hash: 'expected' }],
      }),
      [path.join(cwd, 'tools/a.js')]: 'content',
    }
    mod.setFsImpl(makeMockFs(files))
    mod.setCryptoImpl(makeMockCrypto(['actual']))
    try {
      const result = mod.verify(cwd)
      assert.equal(result.missing.length, 0)
      assert.equal(result.changed.length, 1)
      assert.equal(result.changed[0].path, 'tools/a.js')
      assert.equal(result.changed[0].expected, 'expected')
      assert.equal(result.changed[0].actual, 'actual')
    } finally {
      mod.resetFsImpl()
      mod.resetCryptoImpl()
    }
  })

  test('main exits 0 when manifest matches', () => {
    const mod = readScriptExports()
    const cwd = '/target'
    const files = {
      [path.join(cwd, '.defence-manifest.json')]: JSON.stringify({
        version: 1,
        files: [{ path: 'tools/a.js', hash: 'abc123' }],
      }),
      [path.join(cwd, 'tools/a.js')]: 'content',
    }
    const exitFn = makeExitImpl()
    mod.setFsImpl(makeMockFs(files))
    mod.setCryptoImpl(makeMockCrypto(['abc123']))
    mod.setExitImpl(exitFn)
    mod.setConsoleImpl({ log: () => {}, error: () => {} })

    try {
      mod.main([], cwd)
      assert.fail('expected exit')
    } catch (err) {
      assert.ok(err.message.startsWith('EXIT_CALLED'))
      assert.equal(exitFn.getCode(), 0)
    } finally {
      mod.resetFsImpl()
      mod.resetCryptoImpl()
      mod.resetExitImpl()
      mod.resetConsoleImpl()
    }
  })

  test('main exits 1 and prints json when --json is used', () => {
    const mod = readScriptExports()
    const cwd = '/target'
    const files = {
      [path.join(cwd, '.defence-manifest.json')]: JSON.stringify({
        version: 1,
        files: [{ path: 'tools/a.js', hash: 'expected' }],
      }),
      [path.join(cwd, 'tools/a.js')]: 'content',
    }
    const exitFn = makeExitImpl()
    const logs = []
    mod.setFsImpl(makeMockFs(files))
    mod.setCryptoImpl(makeMockCrypto(['actual']))
    mod.setExitImpl(exitFn)
    mod.setConsoleImpl({ log: (line) => logs.push(line), error: () => {} })

    try {
      mod.main(['--json'], cwd)
      assert.fail('expected exit')
    } catch (_err) {
      assert.equal(exitFn.getCode(), 1)
      const parsed = JSON.parse(logs[0])
      assert.equal(parsed.ok, false)
      assert.equal(parsed.changed.length, 1)
    } finally {
      mod.resetFsImpl()
      mod.resetCryptoImpl()
      mod.resetExitImpl()
      mod.resetConsoleImpl()
    }
  })

  test('main exits 1 when manifest is missing', () => {
    const mod = readScriptExports()
    const cwd = '/target'
    const exitFn = makeExitImpl()
    mod.setFsImpl(makeMockFs({}))
    mod.setExitImpl(exitFn)
    mod.setConsoleImpl({ log: () => {}, error: () => {} })

    try {
      mod.main([], cwd)
      assert.fail('expected exit')
    } catch (_err) {
      assert.equal(exitFn.getCode(), 1)
    } finally {
      mod.resetFsImpl()
      mod.resetExitImpl()
      mod.resetConsoleImpl()
    }
  })

  test('CLI exits 1 when manifest is missing', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      encoding: 'utf8',
      cwd: '/tmp',
    })
    assert.equal(result.status, 1)
  })
})
