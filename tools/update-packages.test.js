#!/usr/bin/env node
'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, 'update-packages.js')

function readScriptExports() {
  // Load module fresh for each test by clearing require cache.
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

function makeMockSpawn(calls) {
  return function mockSpawn(cmd, args) {
    calls.push({ cmd, args })
    return { status: 0, signal: null }
  }
}

describe('update-packages', () => {
  test('main runs update steps in order', () => {
    const calls = []
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    try {
      const code = mod.main()
      assert.equal(code, 0)
      assert.equal(calls.length, 4)
      assert.deepEqual(calls[0], { cmd: 'npm', args: ['update'] })
      assert.deepEqual(calls[1], {
        cmd: 'npm',
        args: ['run', 'defence:pkg-age-check', '--', '--transitive'],
      })
      assert.deepEqual(calls[2], { cmd: 'npm', args: ['audit', 'signatures'] })
      assert.deepEqual(calls[3], {
        cmd: 'npm',
        args: ['audit', '--audit-level=high'],
      })
    } finally {
      mod.resetSpawnSyncImpl()
    }
  })

  test('main throws when update command fails', () => {
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
        assert.ok(err.message.includes('Update dependencies failed'))
      }
      assert.equal(threw, true)
    } finally {
      mod.resetSpawnSyncImpl()
    }
  })

  test('main dry-run skips commands and returns 0', () => {
    const calls = []
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    try {
      const code = mod.main(['--dry-run'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
    } finally {
      mod.resetSpawnSyncImpl()
    }
  })
})
