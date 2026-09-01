#!/usr/bin/env node
'use strict'

const { describe, test } = require('node:test')
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

describe('check-lockfile-integrity', () => {
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

    let exitCode = null
    try {
      mod.main([])
    } catch (err) {
      if (err.message.startsWith('exit:'))
        exitCode = Number(err.message.slice(5))
    }
    assert.equal(exitCode, 0)
    mod.resetFsImpl()
    mod.resetExitImpl()
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

    let exitCode = null
    try {
      mod.main([])
    } catch (err) {
      if (err.message.startsWith('exit:'))
        exitCode = Number(err.message.slice(5))
    }
    assert.equal(exitCode, 1)
    mod.resetFsImpl()
    mod.resetExitImpl()
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

    let exitCode = null
    try {
      mod.main([])
    } catch (err) {
      if (err.message.startsWith('exit:'))
        exitCode = Number(err.message.slice(5))
    }
    assert.equal(exitCode, 1)
    mod.resetFsImpl()
    mod.resetExitImpl()
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
})
