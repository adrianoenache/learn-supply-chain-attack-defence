#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, './check-lockfile-integrity.js')

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

function makeMockFs(content) {
  return {
    readFileSync: (filePath, _encoding) => {
      if (filePath.endsWith('package-lock.json')) {
        if (Buffer.isBuffer(content)) return content
        if (typeof content === 'string') return content
        return JSON.stringify(content)
      }
      throw new Error(`ENOENT: ${filePath}`)
    },
  }
}

function captureExit() {
  let code = null
  const fn = (exitCode) => {
    code = exitCode
    return exitCode
  }
  fn.code = () => code
  return fn
}

function runMain(mod, argv) {
  const exit = captureExit()
  mod.setExitImpl(exit)
  const logs = []
  const originalLog = console.log
  console.log = (...args) => logs.push(args.join(' '))
  try {
    mod.main(argv)
  } finally {
    console.log = originalLog
    mod.resetExitImpl()
  }
  return { code: exit.code(), logs }
}

describe('check-lockfile-integrity', () => {
  beforeEach(() => {
    const mod = readScriptExports()
    mod.resetFsImpl()
    mod.resetExitImpl()
  })

  test('passes when all entries have sha512 integrity', () => {
    const mod = readScriptExports()
    mod.setFsImpl(
      makeMockFs({
        packages: {
          '': {},
          'node_modules/lodash': {
            integrity:
              'sha512-abc123def4567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234',
          },
          'node_modules/@scope/pkg': {
            integrity:
              'sha512-abc123def4567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234',
          },
        },
      }),
    )

    const { code, logs } = runMain(mod, [])
    assert.equal(code, 0)
    assert.ok(
      logs.some((line) => line.includes('All lockfile entries have SHA-512')),
    )
    mod.resetFsImpl()
  })

  test('fails when an entry is missing integrity', () => {
    const mod = readScriptExports()
    mod.setFsImpl(
      makeMockFs({
        packages: {
          '': {},
          'node_modules/lodash': { integrity: 'sha512-abc' },
          'node_modules/unsafe': {},
        },
      }),
    )

    const { code, logs } = runMain(mod, [])
    assert.equal(code, 1)
    assert.ok(logs.some((line) => line.includes('Missing integrity')))
    mod.resetFsImpl()
  })

  test('fails when an entry uses sha1 integrity', () => {
    const mod = readScriptExports()
    mod.setFsImpl(
      makeMockFs({
        packages: {
          '': {},
          'node_modules/lodash': { integrity: 'sha512-abc' },
          'node_modules/legacy': { integrity: 'sha1-deadbeef' },
        },
      }),
    )

    const { code, logs } = runMain(mod, [])
    assert.equal(code, 1)
    assert.ok(logs.some((line) => line.includes('Weak integrity')))
    mod.resetFsImpl()
  })

  test('isStrongIntegrity accepts only sha512', () => {
    const mod = readScriptExports()
    assert.equal(
      mod.isStrongIntegrity(
        'sha512-abc123def4567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234',
      ),
      true,
    )
    assert.equal(mod.isStrongIntegrity('sha1-deadbeef'), false)
    assert.equal(mod.isStrongIntegrity(''), false)
    assert.equal(mod.isStrongIntegrity(undefined), false)
    assert.equal(mod.isStrongIntegrity(null), false)
  })

  test('checkLockfileIntegrity returns missing and weak lists', () => {
    const mod = readScriptExports()
    const result = mod.checkLockfileIntegrity({
      packages: {
        '': {},
        'node_modules/a': {
          integrity:
            'sha512-abc123def4567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234',
        },
        'node_modules/b': {},
        'node_modules/c': { integrity: 'sha1-old' },
      },
    })
    assert.deepEqual(result.missing, ['node_modules/b'])
    assert.equal(result.weak.length, 1)
    assert.equal(result.weak[0].path, 'node_modules/c')
  })

  test('silent mode suppresses output', () => {
    const mod = readScriptExports()
    mod.setFsImpl(
      makeMockFs({
        packages: {
          '': {},
          'node_modules/lodash': { integrity: 'sha512-abc' },
        },
      }),
    )

    const { code, logs } = runMain(mod, ['--silent'])
    assert.equal(code, 0)
    assert.equal(logs.length, 0)
    mod.resetFsImpl()
  })

  test('json format produces valid JSON', () => {
    const mod = readScriptExports()
    mod.setFsImpl(
      makeMockFs({
        packages: {
          '': {},
          'node_modules/lodash': { integrity: 'sha512-abc' },
        },
      }),
    )

    const { code, logs } = runMain(mod, ['--format=json'])
    assert.equal(code, 0)
    const parsed = JSON.parse(logs.join('\n'))
    assert.deepEqual(parsed.missing, [])
    assert.deepEqual(parsed.weak, [])
    mod.resetFsImpl()
  })

  test('markdown format prints weak integrity report', () => {
    const mod = readScriptExports()
    mod.setFsImpl(
      makeMockFs({
        packages: {
          '': {},
          'node_modules/lodash': { integrity: 'sha512-abc' },
          'node_modules/legacy': { integrity: 'sha1-old' },
        },
      }),
    )

    const { code, logs } = runMain(mod, ['--format=markdown'])
    assert.equal(code, 1)
    assert.ok(logs.some((line) => line.includes('Lockfile Integrity Report')))
    mod.resetFsImpl()
  })

  test('markdown format prints missing integrity report', () => {
    const mod = readScriptExports()
    mod.setFsImpl(
      makeMockFs({
        packages: {
          '': {},
          'node_modules/lodash': {},
        },
      }),
    )

    const { code, logs } = runMain(mod, ['--format=markdown'])
    assert.equal(code, 1)
    const output = logs.join('\n')
    assert.ok(output.includes('Lockfile Integrity Report'))
    assert.ok(output.includes('Missing integrity'))
    mod.resetFsImpl()
  })

  test('markdown format prints success report', () => {
    const mod = readScriptExports()
    mod.setFsImpl(
      makeMockFs({
        packages: {
          '': {},
          'node_modules/lodash': { integrity: 'sha512-abc' },
        },
      }),
    )

    const { code, logs } = runMain(mod, ['--format=markdown'])
    assert.equal(code, 0)
    const output = logs.join('\n')
    assert.ok(output.includes('Lockfile Integrity Report'))
    assert.ok(output.includes('SHA-512'))
    mod.resetFsImpl()
  })

  test('parseCliArgs rejects invalid format', () => {
    const mod = readScriptExports()
    assert.throws(() => mod.parseCliArgs(['--format=xml']), /Invalid format/)
  })

  test('CLI exits 0 when lockfile is clean', () => {
    const { spawnSync } = require('node:child_process')
    const tmpDir = require('node:os').tmpdir()
    const lockPath = path.resolve(tmpDir, `clean-lock-${Date.now()}.json`)
    require('node:fs').writeFileSync(
      lockPath,
      JSON.stringify({
        packages: {
          'node_modules/lodash': {
            integrity:
              'sha512-abc123def4567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234',
          },
        },
      }),
    )
    const result = spawnSync(process.execPath, [SCRIPT_PATH, '--silent'], {
      encoding: 'utf8',
      cwd: tmpDir,
    })
    require('node:fs').unlinkSync(lockPath)
    assert.equal(result.status, 0)
  })
})
