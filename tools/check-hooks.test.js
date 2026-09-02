#!/usr/bin/env node
'use strict'

const { describe, test, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const path = require('node:path')

const checkHooks = require(path.resolve(__dirname, './check-hooks.js'))

function makeMockFs(files) {
  return {
    existsSync: (p) => files[p] !== undefined,
    readFileSync: (p, encoding) => {
      if (files[p] === undefined) throw new Error(`ENOENT: ${p}`)
      const content = files[p]
      if (Buffer.isBuffer(content)) {
        return encoding === 'utf8' ? content.toString('utf8') : content
      }
      return encoding === 'utf8' ? content : Buffer.from(content)
    },
  }
}

function runMain(fsMock, config) {
  // Reset module state and re-require so fsImpl is fresh for each test.
  delete require.cache[
    require.resolve(path.resolve(__dirname, './check-hooks.js'))
  ]
  const mod = require(path.resolve(__dirname, './check-hooks.js'))
  mod.resetFsImpl()
  if (fsMock) mod.setFsImpl(fsMock)
  mod.setLoadConfigImpl(() => config)
  return mod.main.bind(mod)
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

describe('check-hooks', () => {
  afterEach(() => {
    checkHooks.resetFsImpl()
  })

  test('returns 0 when no hash is configured', () => {
    const fsMock = makeMockFs({})
    assert.equal(runMain(fsMock, { defences: {} })(), 0)
  })

  test('returns 0 when hook hash matches', () => {
    const hook = '# valid hook\n'
    const hookPath = path.resolve(process.cwd(), '.husky/pre-commit')
    const fsMock = makeMockFs({
      [hookPath]: Buffer.from(hook),
    })
    assert.equal(
      runMain(fsMock, { defences: { huskyPreCommitHash: sha256(hook) } })(),
      0,
    )
  })

  test('returns 1 when hook hash mismatches', () => {
    const hook = '# tampered hook\n'
    const hookPath = path.resolve(process.cwd(), '.husky/pre-commit')
    const fsMock = makeMockFs({
      [hookPath]: Buffer.from(hook),
    })
    assert.equal(
      runMain(fsMock, { defences: { huskyPreCommitHash: 'deadbeef' } })(),
      1,
    )
  })

  test('returns 1 when hook is missing', () => {
    const fsMock = makeMockFs({})
    assert.equal(
      runMain(fsMock, { defences: { huskyPreCommitHash: sha256('any') } })(),
      1,
    )
  })
})
