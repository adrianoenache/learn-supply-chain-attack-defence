#!/usr/bin/env node
'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

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

function makeMockFs(files) {
  return {
    readFileSync: (filePath) => {
      if (!(filePath in files)) {
        const err = new Error(`ENOENT: ${filePath}`)
        err.code = 'ENOENT'
        throw err
      }
      return files[filePath]
    },
    writeFileSync: (filePath, data) => {
      files[filePath] = data
    },
  }
}

function makeMockReadline(answers) {
  let index = 0
  return {
    createInterface: () => ({
      question: (_text, cb) => {
        const answer = answers[index++] ?? ''
        process.nextTick(() => cb(answer))
      },
      close: () => {},
      on: () => {},
    }),
  }
}

describe('update-packages', () => {
  test('main runs update steps in order', async () => {
    const calls = []
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    try {
      const code = await mod.main()
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

  test('main throws when update command fails', async () => {
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(function failingSpawn() {
      return { status: 1, signal: null }
    })
    try {
      let threw = false
      try {
        await mod.main()
      } catch (err) {
        threw = true
        assert.ok(err.message.includes('Update dependencies failed'))
      }
      assert.equal(threw, true)
    } finally {
      mod.resetSpawnSyncImpl()
    }
  })

  test('main dry-run skips commands and returns 0', async () => {
    const calls = []
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    try {
      const code = await mod.main(['--dry-run'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
    } finally {
      mod.resetSpawnSyncImpl()
    }
  })

  test('loadEligibleUpdates reads eligible from state file', () => {
    const mod = readScriptExports()
    const state = JSON.stringify({
      eligible: [
        { name: 'biome', current: '2.5.8', latest: '2.6.0', severity: 'minor' },
      ],
    })
    mod.setFsImpl(
      makeMockFs({
        [path.resolve(__dirname, '../.defence-update-check.json')]: state,
      }),
    )
    try {
      const eligible = mod.loadEligibleUpdates()
      assert.equal(eligible.length, 1)
      assert.equal(eligible[0].name, 'biome')
    } finally {
      mod.resetFsImpl()
    }
  })

  test('interactive dry-run lists eligible packages without commands', async () => {
    const calls = []
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    mod.setFsImpl(
      makeMockFs({
        [path.resolve(__dirname, '../.defence-update-check.json')]:
          JSON.stringify({
            eligible: [
              {
                name: 'biome',
                current: '2.5.8',
                latest: '2.6.0',
                severity: 'minor',
              },
            ],
          }),
      }),
    )
    const logs = []
    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--interactive', '--dry-run'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
      assert.ok(logs.some((line) => line.includes('biome')))
      assert.ok(logs.some((line) => line.includes('[dry-run]')))
    } finally {
      console.log = originalLog
      mod.resetSpawnSyncImpl()
      mod.resetFsImpl()
    }
  })

  test('interactive mode applies only approved packages', async () => {
    const calls = []
    const files = {
      [path.resolve(__dirname, '../.defence-update-check.json')]:
        JSON.stringify({
          eligible: [
            {
              name: 'biome',
              current: '2.5.8',
              latest: '2.6.0',
              severity: 'minor',
            },
            {
              name: 'husky',
              current: '9.1.7',
              latest: '9.2.0',
              severity: 'minor',
            },
          ],
        }),
    }
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    mod.setFsImpl(makeMockFs(files))
    mod.setReadlineImpl(makeMockReadline(['y', 'n']))

    try {
      const code = await mod.main(['--interactive'])
      assert.equal(code, 0)
      assert.equal(calls.length, 4)
      assert.deepEqual(calls[0], { cmd: 'npm', args: ['update', 'biome'] })
      assert.ok(
        files[
          path.resolve(__dirname, '../.defence-update-decisions.json')
        ].includes('biome'),
      )
      assert.ok(
        files[
          path.resolve(__dirname, '../.defence-update-decisions.json')
        ].includes('husky'),
      )
    } finally {
      mod.resetSpawnSyncImpl()
      mod.resetFsImpl()
      mod.resetReadlineImpl()
    }
  })

  test('interactive mode aborts on quit', async () => {
    const calls = []
    const files = {
      [path.resolve(__dirname, '../.defence-update-check.json')]:
        JSON.stringify({
          eligible: [
            {
              name: 'biome',
              current: '2.5.8',
              latest: '2.6.0',
              severity: 'minor',
            },
          ],
        }),
    }
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    mod.setFsImpl(makeMockFs(files))
    mod.setReadlineImpl(makeMockReadline(['q']))

    try {
      const code = await mod.main(['--interactive'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
      assert.ok(!('.defence-update-decisions.json' in files))
    } finally {
      mod.resetSpawnSyncImpl()
      mod.resetFsImpl()
      mod.resetReadlineImpl()
    }
  })

  test('interactive mode with no approvals skips update', async () => {
    const calls = []
    const files = {
      [path.resolve(__dirname, '../.defence-update-check.json')]:
        JSON.stringify({
          eligible: [
            {
              name: 'biome',
              current: '2.5.8',
              latest: '2.6.0',
              severity: 'minor',
            },
          ],
        }),
    }
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    mod.setFsImpl(makeMockFs(files))
    mod.setReadlineImpl(makeMockReadline(['n']))

    try {
      const code = await mod.main(['--interactive'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
      assert.ok(
        files[
          path.resolve(__dirname, '../.defence-update-decisions.json')
        ].includes('biome'),
      )
    } finally {
      mod.resetSpawnSyncImpl()
      mod.resetFsImpl()
      mod.resetReadlineImpl()
    }
  })

  test('interactive mode handles missing state file gracefully', async () => {
    const calls = []
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    mod.setFsImpl(makeMockFs({}))

    try {
      const code = await mod.main(['--interactive'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
    } finally {
      mod.resetSpawnSyncImpl()
      mod.resetFsImpl()
    }
  })

  test('CLI exits 0 in dry-run mode', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH, '--dry-run'], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
  })
})
