#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, './add-package.js')

let captured = { logs: [], errors: [] }
let exitCode = null

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

function resetCaptured() {
  captured = { logs: [], errors: [] }
  exitCode = null
}

function captureConsole() {
  const originalLog = console.log
  const originalError = console.error
  console.log = (...args) => {
    captured.logs.push(args.join(' '))
    originalLog.apply(console, args)
  }
  console.error = (...args) => {
    captured.errors.push(args.join(' '))
    originalError.apply(console, args)
  }
  return () => {
    console.log = originalLog
    console.error = originalError
  }
}

function makeMockHttpsGet(responses) {
  return (url, _options, cb) => {
    const keyMatch = url.match(/\/([^/]+(?:%2f[^/]+)?)\/([^/]+)$/)
    const name = keyMatch ? decodeURIComponent(keyMatch[1]) : ''
    const version = keyMatch ? decodeURIComponent(keyMatch[2]) : ''
    const responseKey = `${name}@${version}`
    const response = responses[responseKey] ??
      responses[name] ?? { statusCode: 404, body: '{}' }

    const res = new EventEmitter()
    res.statusCode = response.statusCode ?? 200
    res.headers = response.headers ?? {}

    process.nextTick(() => {
      cb(res)
      if (response.error) {
        res.emit('error', response.error)
        return
      }
      const body = response.body ?? '{}'
      res.emit('data', body)
      res.emit('end')
    })

    const req = new EventEmitter()
    req.destroy = () => {}
    return req
  }
}

function makeMockFs(files) {
  return {
    readFileSync: (filePath, encoding) => {
      if (files[filePath] !== undefined) {
        if (Buffer.isBuffer(files[filePath])) return files[filePath]
        if (encoding === 'utf8') return files[filePath]
        return Buffer.from(files[filePath])
      }
      const err = new Error(`ENOENT: ${filePath}`)
      err.code = 'ENOENT'
      throw err
    },
  }
}

describe('add-package', () => {
  beforeEach(() => {
    resetCaptured()
  })

  afterEach(() => {
    const mod = readScriptExports()
    mod.resetSpawnSyncImpl()
    mod.resetHttpsGetImpl()
    mod.resetFsImpl()
  })

  test('main blocks install when tarball integrity mismatches after install (TOCTOU)', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()

    mod.setHttpsGetImpl(
      makeMockHttpsGet({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: JSON.stringify({
            dist: {
              integrity:
                'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
            },
          }),
        },
      }),
    )

    mod.setFsImpl(
      makeMockFs({
        [path.resolve(process.cwd(), 'package-lock.json')]: JSON.stringify({
          packages: {
            'node_modules/safe-pkg': {
              integrity:
                'sha512-badintegrity0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
            },
          },
        }),
      }),
    )

    const spawnCalls = []
    mod.setSpawnSyncImpl((cmd, args, _opts) => {
      spawnCalls.push({ cmd, args })
      if (cmd === 'npm' && args[0] === 'install') {
        return { status: 0 }
      }
      if (cmd === 'npm' && args[0] === 'audit') {
        return { status: 0 }
      }
      return { status: 0 }
    })

    // Patch fetchPackageAge to return a valid age without network.
    const checkPackageAge = require(
      path.resolve(__dirname, './check-package-age.js'),
    )
    const originalFetchPackageAge = checkPackageAge.fetchPackageAge
    checkPackageAge.fetchPackageAge = () =>
      Promise.resolve({
        ageDays: 30,
        published: new Date('2026-08-01T00:00:00.000Z'),
      })

    try {
      await assert.rejects(
        async () =>
          mod.main(['safe-pkg@1.0.0'], (code) => {
            exitCode = code
            throw new Error(`exit:${code}`)
          }),
        /exit:1/,
      )
      assert.equal(exitCode, 1)
      assert.ok(
        captured.errors.some((line) => line.includes('Integrity mismatch')),
      )
      assert.ok(
        spawnCalls.some(
          (call) => call.cmd === 'npm' && call.args[0] === 'install',
        ),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('main passes when installed integrity matches registry (TOCTOU protected)', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()

    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setHttpsGetImpl(
      makeMockHttpsGet({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: JSON.stringify({ dist: { integrity } }),
        },
      }),
    )

    mod.setFsImpl(
      makeMockFs({
        [path.resolve(process.cwd(), 'package-lock.json')]: JSON.stringify({
          packages: {
            'node_modules/safe-pkg': { integrity },
          },
        }),
      }),
    )

    mod.setSpawnSyncImpl((cmd, args) => {
      if (cmd === 'npm') {
        if (args[0] === 'install' || args[0] === 'audit') return { status: 0 }
        if (args[0] === 'run' && args[1] === 'defence:pkg-age-check')
          return { status: 0 }
      }
      return { status: 0 }
    })

    const checkPackageAge = require(
      path.resolve(__dirname, './check-package-age.js'),
    )
    const originalFetchPackageAge = checkPackageAge.fetchPackageAge
    checkPackageAge.fetchPackageAge = () =>
      Promise.resolve({
        ageDays: 30,
        published: new Date('2026-08-01T00:00:00.000Z'),
      })

    try {
      await assert.rejects(
        async () =>
          mod.main(['safe-pkg@1.0.0'], (code) => {
            exitCode = code
            throw new Error(`exit:${code}`)
          }),
        /exit:0/,
      )
      assert.equal(exitCode, 0)
      assert.ok(
        captured.logs.some((line) =>
          line.includes('installed integrity matches registry'),
        ),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('fetchVersionManifest returns parsed registry response', async () => {
    const mod = readScriptExports()
    mod.setHttpsGetImpl(
      makeMockHttpsGet({
        'lodash@4.17.21': {
          statusCode: 200,
          body: JSON.stringify({
            name: 'lodash',
            version: '4.17.21',
            dist: { integrity: 'sha512-abc' },
          }),
        },
      }),
    )

    const manifest = await mod.fetchVersionManifest('lodash', '4.17.21')
    assert.equal(manifest.name, 'lodash')
    assert.equal(manifest.dist.integrity, 'sha512-abc')
  })

  test('fetchVersionManifest rejects on HTTP error', async () => {
    const mod = readScriptExports()
    mod.setHttpsGetImpl(
      makeMockHttpsGet({
        'missing-pkg@1.0.0': { statusCode: 404, body: '{}' },
      }),
    )

    await assert.rejects(
      () => mod.fetchVersionManifest('missing-pkg', '1.0.0'),
      /Registry returned HTTP 404/,
    )
  })

  test('verifyInstalledIntegrity throws when lockfile integrity mismatches', async () => {
    const mod = readScriptExports()
    mod.setFsImpl(
      makeMockFs({
        [path.resolve(process.cwd(), 'package-lock.json')]: JSON.stringify({
          packages: {
            'node_modules/x': { integrity: 'sha512-a' },
          },
        }),
      }),
    )

    await assert.rejects(
      () => mod.verifyInstalledIntegrity('x', '1.0.0', 'sha512-b'),
      /Integrity mismatch/,
    )
  })
})
