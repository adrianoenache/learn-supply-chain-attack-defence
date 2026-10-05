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
  test('main falls back to npm update and runs all verification layers when no scan state exists', async () => {
    const calls = []
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    // Empty fs: no .defence-update-check.json, so the script falls back to
    // the generic in-range npm update.
    mod.setFsImpl(makeMockFs({}))
    try {
      const code = await mod.main()
      assert.equal(code, 0)
      assert.equal(calls.length, 5)
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
      assert.deepEqual(calls[4], {
        cmd: 'npm',
        args: ['run', 'defence:license-check:fail'],
      })
    } finally {
      mod.resetSpawnSyncImpl()
      mod.resetFsImpl()
    }
  })

  test('main throws when update command fails', async () => {
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(function failingSpawn() {
      return { status: 1, signal: null }
    })
    mod.setFsImpl(makeMockFs({}))
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
      mod.resetFsImpl()
    }
  })

  test('main dry-run skips commands and returns 0', async () => {
    const calls = []
    const mod = readScriptExports()
    mod.setSpawnSyncImpl(makeMockSpawn(calls))
    mod.setFsImpl(makeMockFs({}))
    try {
      const code = await mod.main(['--dry-run'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
    } finally {
      mod.resetSpawnSyncImpl()
      mod.resetFsImpl()
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
      assert.equal(calls.length, 5)
      // biome has no intermediateEligible in this fixture, so the pinned
      // install falls back to latest (pre-F.0 state files behave like this).
      assert.deepEqual(calls[0], {
        cmd: 'npm',
        args: ['install', '--save-exact', '--ignore-scripts', 'biome@2.6.0'],
      })
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

  // -------------------------------------------------------------------------
  // Fase F.1 — intermediateEligible-driven pinned installs.
  // -------------------------------------------------------------------------

  describe('Fase F.1 — intermediate target resolution', () => {
    const STATE_PATH = path.resolve(__dirname, '../.defence-update-check.json')
    const DECISIONS_PATH = path.resolve(
      __dirname,
      '../.defence-update-decisions.json',
    )

    function makeStateWithIntermediate() {
      return JSON.stringify({
        eligible: [
          {
            name: 'pkg',
            current: '1.0.0',
            latest: '2.0.0',
            severity: 'major',
            // latest 2.0.0 passed the age gate at scan time, so check-updates
            // included it; 1.1.0 is an intermediate stepping stone.
            intermediateEligible: ['1.1.0', '2.0.0'],
          },
        ],
      })
    }

    test('resolveTargetVersion prefers the highest eligible intermediate', () => {
      const mod = readScriptExports()
      assert.equal(
        mod.resolveTargetVersion({
          latest: '2.0.0',
          intermediateEligible: ['1.1.0', '1.2.0'],
        }),
        '1.2.0',
      )
    })

    test('resolveTargetVersion falls back to latest when the field is missing or empty', () => {
      const mod = readScriptExports()
      assert.equal(mod.resolveTargetVersion({ latest: '2.0.0' }), '2.0.0')
      assert.equal(
        mod.resolveTargetVersion({
          latest: '2.0.0',
          intermediateEligible: [],
        }),
        '2.0.0',
      )
    })

    test('non-interactive mode applies pinned installs from the scan state', async () => {
      const calls = []
      const mod = readScriptExports()
      mod.setSpawnSyncImpl(makeMockSpawn(calls))
      mod.setFsImpl(makeMockFs({ [STATE_PATH]: makeStateWithIntermediate() }))

      try {
        const code = await mod.main()
        assert.equal(code, 0)
        assert.equal(calls.length, 5)
        assert.deepEqual(calls[0], {
          cmd: 'npm',
          args: ['install', '--save-exact', '--ignore-scripts', 'pkg@2.0.0'],
        })
        // Verification layers still run after the pinned install.
        assert.deepEqual(calls[1], {
          cmd: 'npm',
          args: ['run', 'defence:pkg-age-check', '--', '--transitive'],
        })
        assert.deepEqual(calls[4], {
          cmd: 'npm',
          args: ['run', 'defence:license-check:fail'],
        })
      } finally {
        mod.resetSpawnSyncImpl()
        mod.resetFsImpl()
      }
    })

    test('non-interactive mode prefers the intermediate when latest skipped the age gate', async () => {
      const calls = []
      const mod = readScriptExports()
      mod.setSpawnSyncImpl(makeMockSpawn(calls))
      // Fixture: latest 2.0.0 was too recent at scan time; only the 1.1.0
      // intermediate passed the age gate, so it must become the target.
      mod.setFsImpl(
        makeMockFs({
          [STATE_PATH]: JSON.stringify({
            eligible: [
              {
                name: 'pkg',
                current: '1.0.0',
                latest: '2.0.0',
                severity: 'major',
                intermediateEligible: ['1.1.0'],
              },
            ],
          }),
        }),
      )

      try {
        const code = await mod.main()
        assert.equal(code, 0)
        assert.deepEqual(calls[0], {
          cmd: 'npm',
          args: ['install', '--save-exact', '--ignore-scripts', 'pkg@1.1.0'],
        })
      } finally {
        mod.resetSpawnSyncImpl()
        mod.resetFsImpl()
      }
    })

    test('non-interactive dry-run lists pinned specs when scan state exists', async () => {
      const calls = []
      const logs = []
      const mod = readScriptExports()
      mod.setSpawnSyncImpl(makeMockSpawn(calls))
      mod.setFsImpl(makeMockFs({ [STATE_PATH]: makeStateWithIntermediate() }))

      const originalLog = console.log
      console.log = (...args) => logs.push(args.join(' '))

      try {
        const code = await mod.main(['--dry-run'])
        assert.equal(code, 0)
        assert.equal(calls.length, 0)
        assert.ok(
          logs.some(
            (line) =>
              line.includes('npm install --save-exact --ignore-scripts') &&
              line.includes('pkg@2.0.0'),
          ),
        )
        assert.ok(
          logs.some((line) => line.includes('defence:license-check:fail')),
        )
      } finally {
        console.log = originalLog
        mod.resetSpawnSyncImpl()
        mod.resetFsImpl()
      }
    })

    test('interactive mode installs the intermediate target and records it in decisions', async () => {
      const calls = []
      const files = {
        [STATE_PATH]: JSON.stringify({
          eligible: [
            {
              name: 'pkg',
              current: '1.0.0',
              latest: '2.0.0',
              severity: 'major',
              intermediateEligible: ['1.1.0'],
            },
          ],
        }),
      }
      const mod = readScriptExports()
      mod.setSpawnSyncImpl(makeMockSpawn(calls))
      mod.setFsImpl(makeMockFs(files))
      mod.setReadlineImpl(makeMockReadline(['y']))

      try {
        const code = await mod.main(['--interactive'])
        assert.equal(code, 0)
        assert.deepEqual(calls[0], {
          cmd: 'npm',
          args: ['install', '--save-exact', '--ignore-scripts', 'pkg@1.1.0'],
        })
        const decisions = JSON.parse(files[DECISIONS_PATH])
        assert.equal(decisions.approved[0].target, '1.1.0')
        assert.equal(decisions.approved[0].latest, '2.0.0')
      } finally {
        mod.resetSpawnSyncImpl()
        mod.resetFsImpl()
        mod.resetReadlineImpl()
      }
    })

    test('interactive dry-run shows the intermediate target with quarantine note', async () => {
      const calls = []
      const logs = []
      const mod = readScriptExports()
      mod.setSpawnSyncImpl(makeMockSpawn(calls))
      mod.setFsImpl(
        makeMockFs({
          [STATE_PATH]: JSON.stringify({
            eligible: [
              {
                name: 'pkg',
                current: '1.0.0',
                latest: '2.0.0',
                severity: 'major',
                intermediateEligible: ['1.1.0'],
              },
            ],
          }),
        }),
      )

      const originalLog = console.log
      console.log = (...args) => logs.push(args.join(' '))

      try {
        const code = await mod.main(['--interactive', '--dry-run'])
        assert.equal(code, 0)
        assert.equal(calls.length, 0)
        assert.ok(
          logs.some(
            (line) =>
              line.includes('1.0.0 → 1.1.0') &&
              line.includes('latest 2.0.0 still in quarantine'),
          ),
        )
      } finally {
        console.log = originalLog
        mod.resetSpawnSyncImpl()
        mod.resetFsImpl()
      }
    })
  })
})
