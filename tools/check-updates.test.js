#!/usr/bin/env node
'use strict'

// Tests for check-updates.js.
// Uses node:test + node:assert + native modules only, matching the style of
// update-packages.test.js and check-package-age.test.js.
//
// Run:
//   npm test
//   node --test tools/check-updates.test.js

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const SCRIPT_PATH = path.resolve(__dirname, 'check-updates.js')

function readScriptExports() {
  // Load module fresh for each test by clearing require cache.
  delete require.cache[require.resolve(SCRIPT_PATH)]
  const mod = require(SCRIPT_PATH)
  // Avoid network calls to the npm downloads API during tests.
  mod.setImpls({ fetchJson: DEFAULT_MOCK_FETCH_JSON })
  return mod
}

function makeMockFs({
  state = null,
  lock = null,
  nodeModulesLock = null,
} = {}) {
  return {
    readFileSync: (filePath, _encoding) => {
      if (filePath.includes('.defence-update-check.json')) {
        if (state === null) throw new Error('state not found')
        return typeof state === 'string' ? state : JSON.stringify(state)
      }
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
    writeFileSync: () => {},
    existsSync: () => true,
  }
}

function makeMockSpawn(calls, responses) {
  return function mockSpawn(cmd, args, opts) {
    calls.push({ cmd, args, opts })
    const key = `${cmd} ${args.join(' ')}`
    const response = responses[key] ?? { status: 0, stdout: '', stderr: '' }
    return {
      status: response.status ?? 0,
      stdout: response.stdout ?? '',
      stderr: response.stderr ?? '',
      signal: response.signal ?? null,
    }
  }
}

const DEFAULT_MOCK_FETCH_JSON = async () => ({ downloads: 10000 })

function makeMockFetchRegistryJson(registryResponses) {
  return async function mockFetchRegistryJson(name, _version, _options) {
    const response = registryResponses[name] ?? {
      statusCode: 404,
      body: {},
    }
    if (response.error) throw response.error
    if (response.statusCode && response.statusCode !== 200) {
      const err = new Error(`HTTP ${response.statusCode}`)
      err.statusCode = response.statusCode
      throw err
    }
    return response.body
  }
}

describe('check-updates', () => {
  const baseTime = new Date('2026-08-19T12:00:00.000Z').getTime()

  test('recommends npm ci when node_modules is out of sync', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()

    mod.setImpls({
      fs: makeMockFs({
        state: null,
        lock: {
          name: 'learn-supply-chain-attack-defence',
          lockfileVersion: 3,
          packages: {},
        },
        nodeModulesLock: { packageLockHash: 'different-hash' },
      }),
      spawnSync: makeMockSpawn(calls, {
        'npm ls --json --depth=0': {
          status: 1,
          stdout: '',
          stderr: 'ERR!',
        },
      }),
      now: () => baseTime,
      exit: (code) => {
        throw new Error(`exit ${code}`)
      },
    })

    const originalError = console.error
    console.error = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--force'])
      assert.equal(code, 0)
      assert.equal(calls.length, 1)
      assert.equal(calls[0].cmd, 'npm')
      assert.deepEqual(calls[0].args, ['ls', '--json', '--depth=0'])
      assert.ok(logs.some((line) => line.includes('out of sync')))
      assert.ok(logs.some((line) => line.includes('npm ci')))
    } finally {
      console.error = originalError
      mod.resetImpls()
    }
  })

  test('classifies update as eligible when age >= minAgeDays', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    mod.setImpls({
      fs: makeMockFs({
        state: null,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {
        'npm outdated --json --min-release-age=0': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      fetchRegistryJson: makeMockFetchRegistryJson({
        biome: {
          statusCode: 200,
          body: {
            time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/biomejs/biome.git' },
          },
        },
      }),
      now: () => baseTime,
    })

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main([])
      assert.equal(code, 0)
      assert.ok(logs.some((line) => line.includes('Eligible for update')))
      assert.ok(logs.some((line) => line.includes('biome')))
      assert.ok(logs.some((line) => line.includes('2.5.8 → 2.6.0')))
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('classifies update as quarantine when too recent', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    mod.setImpls({
      fs: makeMockFs({
        state: null,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {
        'npm outdated --json --min-release-age=0': {
          status: 0,
          stdout: JSON.stringify({
            husky: { current: '9.1.7', wanted: '9.1.7', latest: '9.2.0' },
          }),
        },
      }),
      fetchRegistryJson: makeMockFetchRegistryJson({
        husky: {
          statusCode: 200,
          body: {
            time: { '9.2.0': '2026-08-17T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/typicode/husky.git' },
          },
        },
      }),
      now: () => baseTime,
    })

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main([])
      assert.equal(code, 0)
      assert.ok(logs.some((line) => line.includes('In quarantine')))
      assert.ok(logs.some((line) => line.includes('husky')))
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('uses cache when valid and force rescans', async () => {
    const calls = []
    const _logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    const state = {
      lastScan: new Date(baseTime - 1000).toISOString(),
      lastReminder: null,
      installedLockfileHash: lockHash,
      eligible: [
        {
          name: 'cached',
          current: '1.0.0',
          latest: '1.1.0',
          daysOld: 10,
          severity: 'minor',
          links: {},
        },
      ],
      quarantine: [],
    }

    const originalLog = console.log
    console.log = () => {}

    mod.setImpls({
      fs: makeMockFs({
        state,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {}),
      now: () => baseTime,
    })

    try {
      await mod.main([])
      assert.equal(calls.length, 0)

      await mod.main(['--force'])
      assert.ok(calls.length > 0)
      assert.equal(calls[0].cmd, 'npm')
      assert.deepEqual(calls[0].args, [
        'outdated',
        '--json',
        '--min-release-age=0',
      ])
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('cache miss when lockfile hash changes', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const newLockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: { 'node_modules/biome': { version: '2.5.8' } },
    })
    const newLockHash = require('node:crypto')
      .createHash('sha256')
      .update(newLockContent)
      .digest('hex')

    const state = {
      lastScan: new Date(baseTime - 1000).toISOString(),
      lastReminder: null,
      installedLockfileHash: 'stale-hash',
      eligible: [{ name: 'cached', current: '1.0.0', latest: '1.1.0' }],
      quarantine: [],
    }

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    mod.setImpls({
      fs: makeMockFs({
        state,
        lock: newLockContent,
        nodeModulesLock: { packageLockHash: newLockHash },
      }),
      spawnSync: makeMockSpawn(calls, {
        'npm outdated --json --min-release-age=0': {
          status: 0,
          stdout: JSON.stringify({}),
        },
      }),
      now: () => baseTime,
    })

    try {
      const code = await mod.main([])
      assert.equal(code, 0)
      assert.equal(calls.length, 1)
      assert.equal(calls[0].cmd, 'npm')
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('silent mode suppresses output but updates state', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    mod.setImpls({
      fs: makeMockFs({
        state: null,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {
        'npm outdated --json --min-release-age=0': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      fetchRegistryJson: makeMockFetchRegistryJson({
        biome: {
          statusCode: 200,
          body: {
            time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/biomejs/biome.git' },
          },
        },
      }),
      now: () => baseTime,
    })

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--silent'])
      assert.equal(code, 0)
      assert.equal(logs.length, 0)
      assert.equal(calls.length, 1)
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('registry failure moves update to quarantine', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    mod.setImpls({
      fs: makeMockFs({
        state: null,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {
        'npm outdated --json --min-release-age=0': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      fetchRegistryJson: makeMockFetchRegistryJson({
        biome: { statusCode: 500, body: '{}' },
      }),
      now: () => baseTime,
    })

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main([])
      assert.equal(code, 0)
      assert.ok(logs.some((line) => line.includes('In quarantine')))
      assert.ok(logs.some((line) => line.includes('registry lookup failed')))
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('--format=json produces valid JSON output', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    mod.setImpls({
      fs: makeMockFs({
        state: null,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {
        'npm outdated --json --min-release-age=0': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      fetchRegistryJson: makeMockFetchRegistryJson({
        biome: {
          statusCode: 200,
          body: {
            time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/biomejs/biome.git' },
          },
        },
      }),
      now: () => baseTime,
    })

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--format=json'])
      assert.equal(code, 0)
      const output = logs.join('\n')
      const parsed = JSON.parse(output)
      assert.ok(Array.isArray(parsed.eligible))
      assert.ok(Array.isArray(parsed.quarantine))
      assert.equal(parsed.eligible.length, 1)
      assert.equal(parsed.eligible[0].name, 'biome')
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('--format=markdown produces markdown report', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    mod.setImpls({
      fs: makeMockFs({
        state: null,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {
        'npm outdated --json --min-release-age=0': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      fetchRegistryJson: makeMockFetchRegistryJson({
        biome: {
          statusCode: 200,
          body: {
            time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/biomejs/biome.git' },
          },
        },
      }),
      now: () => baseTime,
    })

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--format=markdown'])
      assert.equal(code, 0)
      const output = logs.join('\n')
      assert.ok(output.includes('# Dependency Update Report'))
      assert.ok(output.includes('Eligible for update'))
      assert.ok(output.includes('| biome |'))
      assert.ok(output.includes('npm run defence:update'))
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('invalid format throws a clear error', async () => {
    const mod = readScriptExports()

    try {
      await mod.main(['--format=xml'])
      assert.fail('should have thrown')
    } catch (err) {
      assert.ok(err.message.includes('Invalid format'))
    } finally {
      mod.resetImpls()
    }
  })

  test('--offline uses cache without network or npm outdated calls', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    const state = {
      lastScan: new Date(baseTime - 1000).toISOString(),
      lastReminder: null,
      installedLockfileHash: lockHash,
      eligible: [
        {
          name: 'cached',
          current: '1.0.0',
          latest: '1.1.0',
          daysOld: 10,
          severity: 'minor',
          links: {},
        },
      ],
      quarantine: [],
    }

    mod.setImpls({
      fs: makeMockFs({
        state,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {}),
      now: () => baseTime,
    })

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--offline'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
      assert.ok(
        logs.some((line) => line.includes('cached')),
        logs.join('\n'),
      )
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('--offline with no cache warns and exits 0', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    mod.setImpls({
      fs: makeMockFs({
        state: null,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {}),
      now: () => baseTime,
    })

    const originalError = console.error
    console.error = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--offline'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
      assert.ok(logs.some((line) => line.includes('offline')))
      assert.ok(logs.some((line) => line.includes('no cached scan')))
    } finally {
      console.error = originalError
      mod.resetImpls()
    }
  })

  test('--offline with stale cache still uses it', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    const state = {
      lastScan: new Date(baseTime - 7 * 24 * 60 * 60 * 1000).toISOString(),
      lastReminder: null,
      installedLockfileHash: lockHash,
      eligible: [
        {
          name: 'stale',
          current: '1.0.0',
          latest: '1.1.0',
          daysOld: 10,
          severity: 'minor',
          links: {},
        },
      ],
      quarantine: [],
    }

    mod.setImpls({
      fs: makeMockFs({
        state,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {}),
      now: () => baseTime,
    })

    const originalError = console.error
    const originalLog = console.log
    console.error = (...args) => logs.push(args.join(' '))
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--offline'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
      assert.ok(logs.some((line) => line.includes('offline')))
      assert.ok(logs.some((line) => line.includes('stale')))
    } finally {
      console.error = originalError
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('appends scan to history and limits its size', () => {
    const mod = readScriptExports()
    const state = {
      lastScan: new Date(baseTime).toISOString(),
      installedLockfileHash: 'hash',
      eligible: [
        {
          name: 'pkg',
          current: '1.0.0',
          latest: '1.1.0',
          severity: 'minor',
          daysOld: 10,
        },
      ],
      quarantine: [],
      history: [],
    }
    for (let i = 0; i < 35; i++) {
      mod.appendHistory(state)
    }
    assert.equal(state.history.length, 30)
    assert.equal(state.history[0].eligible[0].current, '1.0.0')
  })

  test('detects package stuck in quarantine', () => {
    const mod = readScriptExports()
    const history = [
      {
        scannedAt: new Date(baseTime - 3 * 24 * 60 * 60 * 1000).toISOString(),
        eligible: [],
        quarantine: [{ name: 'stuck-pkg' }],
      },
      {
        scannedAt: new Date(baseTime - 2 * 24 * 60 * 60 * 1000).toISOString(),
        eligible: [],
        quarantine: [{ name: 'stuck-pkg' }],
      },
      {
        scannedAt: new Date(baseTime - 1 * 24 * 60 * 60 * 1000).toISOString(),
        eligible: [],
        quarantine: [{ name: 'stuck-pkg' }],
      },
    ]
    assert.equal(mod.isStuckInQuarantine(history, 'stuck-pkg'), true)
    assert.equal(mod.isStuckInQuarantine(history, 'other-pkg'), false)
  })

  test('calculates release cadence from history', () => {
    const mod = readScriptExports()
    const history = [
      {
        scannedAt: new Date(baseTime - 6 * 24 * 60 * 60 * 1000).toISOString(),
        eligible: [
          {
            name: 'freq',
            current: '1.0.0',
            latest: '1.1.0',
            severity: 'minor',
            daysOld: 10,
          },
        ],
        quarantine: [],
      },
      {
        scannedAt: new Date(baseTime - 3 * 24 * 60 * 60 * 1000).toISOString(),
        eligible: [
          {
            name: 'freq',
            current: '1.1.0',
            latest: '1.2.0',
            severity: 'minor',
            daysOld: 10,
          },
        ],
        quarantine: [],
      },
      {
        scannedAt: new Date(baseTime).toISOString(),
        eligible: [
          {
            name: 'freq',
            current: '1.2.0',
            latest: '1.3.0',
            severity: 'minor',
            daysOld: 10,
          },
        ],
        quarantine: [],
      },
    ]
    const cadence = mod.calculateReleaseCadence(history, 'freq')
    assert.equal(cadence, 3)
  })

  test('confidence score reflects age, severity and cadence', () => {
    const mod = readScriptExports()
    const history = []

    const patchOld = mod.calculateConfidence(
      { name: 'a', daysOld: 30, severity: 'patch' },
      history,
    )
    assert.equal(patchOld.label, 'recommended')
    assert.ok(patchOld.score >= 70)

    const majorRecent = mod.calculateConfidence(
      { name: 'b', daysOld: 2, severity: 'major' },
      history,
    )
    assert.equal(majorRecent.label, 'high risk')
    assert.ok(majorRecent.score < 40)

    const minorMiddle = mod.calculateConfidence(
      { name: 'c', daysOld: 14, severity: 'minor' },
      history,
    )
    assert.equal(minorMiddle.label, 'review required')
  })

  test('high release cadence penalizes confidence score', () => {
    const mod = readScriptExports()
    const history = [
      {
        scannedAt: new Date(baseTime - 2 * 24 * 60 * 60 * 1000).toISOString(),
        eligible: [
          {
            name: 'rapid',
            current: '1.0.0',
            latest: '1.1.0',
            severity: 'patch',
            daysOld: 10,
          },
        ],
        quarantine: [],
      },
      {
        scannedAt: new Date(baseTime).toISOString(),
        eligible: [
          {
            name: 'rapid',
            current: '1.1.0',
            latest: '1.2.0',
            severity: 'patch',
            daysOld: 10,
          },
        ],
        quarantine: [],
      },
    ]
    const withCadence = mod.calculateConfidence(
      { name: 'rapid', daysOld: 30, severity: 'patch' },
      history,
    )
    const withoutCadence = mod.calculateConfidence(
      { name: 'rapid', daysOld: 30, severity: 'patch' },
      [],
    )
    assert.ok(withCadence.score < withoutCadence.score)
  })

  test('includes confidence and history in json output', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    mod.setImpls({
      fs: makeMockFs({
        state: null,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {
        'npm outdated --json --min-release-age=0': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      fetchRegistryJson: makeMockFetchRegistryJson({
        biome: {
          statusCode: 200,
          body: {
            time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/biomejs/biome.git' },
          },
        },
      }),
      now: () => baseTime,
    })

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--format=json'])
      assert.equal(code, 0)
      const parsed = JSON.parse(logs.join('\n'))
      assert.ok(Array.isArray(parsed.history))
      assert.equal(parsed.history.length, 1)
      assert.ok('confidence' in parsed.eligible[0])
      assert.ok('confidenceLabel' in parsed.eligible[0])
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('CLI exits 0 in offline mode', () => {
    const result = spawnSync(
      process.execPath,
      [SCRIPT_PATH, '--offline', '--silent'],
      {
        encoding: 'utf8',
      },
    )
    assert.equal(result.status, 0)
  })

  test('deduplicates registry fetches across dependency lookups', async () => {
    const mod = readScriptExports()
    let fetchCount = 0
    const sharedRegistryBody = {
      time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
      repository: { url: 'git+https://github.com/biomejs/biome.git' },
    }

    mod.setImpls({
      fetchRegistryJson: async (_name, _version, _options) => {
        fetchCount++
        return sharedRegistryBody
      },
      now: () => baseTime,
    })

    try {
      const inMemoryCache = new Map()
      const metrics = { registryCacheHits: 0, registryCacheMisses: 0 }
      const first = await mod.fetchRegistryInfo(
        'shared-pkg',
        inMemoryCache,
        metrics,
      )
      const second = await mod.fetchRegistryInfo(
        'shared-pkg',
        inMemoryCache,
        metrics,
      )
      assert.equal(fetchCount, 1)
      assert.equal(metrics.registryCacheHits, 1)
      assert.equal(metrics.registryCacheMisses, 1)
      assert.strictEqual(first, second)
    } finally {
      mod.resetImpls()
    }
  })

  test('reports registry cache metrics in state', async () => {
    const calls = []
    const logs = []
    const mod = readScriptExports()
    const lockContent = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const lockHash = require('node:crypto')
      .createHash('sha256')
      .update(lockContent)
      .digest('hex')

    mod.setImpls({
      fs: makeMockFs({
        state: null,
        lock: lockContent,
        nodeModulesLock: { packageLockHash: lockHash },
      }),
      spawnSync: makeMockSpawn(calls, {
        'npm outdated --json --min-release-age=0': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      fetchRegistryJson: makeMockFetchRegistryJson({
        biome: {
          statusCode: 200,
          body: {
            time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/biomejs/biome.git' },
          },
        },
      }),
      now: () => baseTime,
    })

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--format=json'])
      assert.equal(code, 0)
      const parsed = JSON.parse(logs.join('\n'))
      assert.equal(parsed.metrics.registryCacheHits, 0)
      assert.equal(parsed.metrics.registryCacheMisses, 1)
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('deprecated metadata lowers confidence score', () => {
    const mod = readScriptExports()
    const withDeprecation = mod.calculateConfidence(
      {
        name: 'deprecated-pkg',
        daysOld: 30,
        severity: 'patch',
        metadata: {
          isDeprecated: true,
          maintainerCount: 5,
          weeklyDownloads: 10000,
        },
      },
      [],
    )
    const withoutDeprecation = mod.calculateConfidence(
      {
        name: 'normal-pkg',
        daysOld: 30,
        severity: 'patch',
        metadata: {
          isDeprecated: false,
          maintainerCount: 5,
          weeklyDownloads: 10000,
        },
      },
      [],
    )
    assert.ok(withDeprecation.score < withoutDeprecation.score)
  })

  test('few maintainers lowers confidence score', () => {
    const mod = readScriptExports()
    const fewMaintainers = mod.calculateConfidence(
      {
        name: 'solo-pkg',
        daysOld: 30,
        severity: 'patch',
        metadata: {
          isDeprecated: false,
          maintainerCount: 1,
          weeklyDownloads: 10000,
        },
      },
      [],
    )
    const manyMaintainers = mod.calculateConfidence(
      {
        name: 'team-pkg',
        daysOld: 30,
        severity: 'patch',
        metadata: {
          isDeprecated: false,
          maintainerCount: 5,
          weeklyDownloads: 10000,
        },
      },
      [],
    )
    assert.ok(fewMaintainers.score < manyMaintainers.score)
  })

  test('low weekly downloads lowers confidence score', () => {
    const mod = readScriptExports()
    const lowDownloads = mod.calculateConfidence(
      {
        name: 'niche-pkg',
        daysOld: 30,
        severity: 'patch',
        metadata: {
          isDeprecated: false,
          maintainerCount: 5,
          weeklyDownloads: 10,
        },
      },
      [],
    )
    const highDownloads = mod.calculateConfidence(
      {
        name: 'popular-pkg',
        daysOld: 30,
        severity: 'patch',
        metadata: {
          isDeprecated: false,
          maintainerCount: 5,
          weeklyDownloads: 100000,
        },
      },
      [],
    )
    assert.ok(lowDownloads.score < highDownloads.score)
  })

  test('classifyUpdate includes metadata in eligible entry', async () => {
    const mod = readScriptExports()
    mod.setImpls({
      fetchRegistryJson: makeMockFetchRegistryJson({
        'meta-pkg': {
          statusCode: 200,
          body: {
            time: { '2.0.0': '2026-08-01T00:00:00.000Z' },
            versions: {
              '2.0.0': {
                deprecated: 'This version is deprecated',
                maintainers: [{ name: 'solo' }],
              },
            },
            repository: { url: 'git+https://github.com/example/meta-pkg.git' },
          },
        },
      }),
      fetchJson: async () => ({ downloads: 50 }),
      now: () => baseTime,
    })

    try {
      const result = await mod.classifyUpdate(
        'meta-pkg',
        { current: '1.0.0', wanted: '2.0.0', latest: '2.0.0' },
        new Map(),
        { registryCacheHits: 0, registryCacheMisses: 0 },
      )
      assert.ok(result.eligible)
      assert.equal(result.eligible.metadata.isDeprecated, true)
      assert.equal(result.eligible.metadata.maintainerCount, 1)
      assert.equal(result.eligible.metadata.weeklyDownloads, 50)
    } finally {
      mod.resetImpls()
    }
  })

  // -------------------------------------------------------------------------
  // Fase F.0 — contract fixes: silent-mode warnings and intermediate versions.
  // -------------------------------------------------------------------------

  describe('Fase F.0 — silent mode keeps safety warnings', () => {
    const inSyncLock = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const inSyncHash = require('node:crypto')
      .createHash('sha256')
      .update(inSyncLock)
      .digest('hex')

    test('prints sync warning even when --silent is active', async () => {
      const calls = []
      const logs = []
      const mod = readScriptExports()

      mod.setImpls({
        fs: makeMockFs({
          state: null,
          lock: inSyncLock,
          nodeModulesLock: { packageLockHash: 'different-hash' },
        }),
        spawnSync: makeMockSpawn(calls, {
          'npm ls --json --depth=0': { status: 1, stdout: '', stderr: 'ERR!' },
        }),
        now: () => baseTime,
      })

      const originalError = console.error
      console.error = (...args) => logs.push(args.join(' '))

      try {
        const code = await mod.main(['--force', '--silent'])
        assert.equal(code, 0)
        assert.ok(logs.some((line) => line.includes('out of sync')))
        assert.ok(logs.some((line) => line.includes('npm ci')))
      } finally {
        console.error = originalError
        mod.resetImpls()
      }
    })

    test('prints offline notice without cache even when --silent is active', async () => {
      const calls = []
      const logs = []
      const mod = readScriptExports()

      mod.setImpls({
        fs: makeMockFs({
          state: null,
          lock: inSyncLock,
          nodeModulesLock: { packageLockHash: inSyncHash },
        }),
        spawnSync: makeMockSpawn(calls, {}),
        now: () => baseTime,
      })

      const originalError = console.error
      console.error = (...args) => logs.push(args.join(' '))

      try {
        const code = await mod.main(['--force', '--offline', '--silent'])
        assert.equal(code, 0)
        assert.ok(
          logs.some((line) =>
            line.includes('offline and no cached scan was found'),
          ),
        )
      } finally {
        console.error = originalError
        mod.resetImpls()
      }
    })

    test('prints cached-scan notice when offline with cache even with --silent', async () => {
      const calls = []
      const logs = []
      const mod = readScriptExports()
      const cachedState = {
        lastScan: new Date(baseTime - 1000).toISOString(),
        lastReminder: null,
        installedLockfileHash: inSyncHash,
        eligible: [],
        quarantine: [],
      }

      mod.setImpls({
        fs: makeMockFs({
          state: cachedState,
          lock: inSyncLock,
          nodeModulesLock: { packageLockHash: inSyncHash },
        }),
        spawnSync: makeMockSpawn(calls, {}),
        now: () => baseTime,
      })

      const originalError = console.error
      console.error = (...args) => logs.push(args.join(' '))

      try {
        const code = await mod.main(['--force', '--offline', '--silent'])
        assert.equal(code, 0)
        assert.ok(
          logs.some((line) => line.includes('using the last cached scan')),
        )
      } finally {
        console.error = originalError
        mod.resetImpls()
      }
    })
  })

  describe('Fase F.0 — intermediate eligible versions', () => {
    // Fixture timestamps relative to baseTime (2026-08-19T12:00:00Z):
    // "old" = 18+ days (> 7-day age gate), "recent" = 1 day (inside the gate).
    const OLD_RELEASE = '2026-08-01T00:00:00.000Z'
    const RECENT_RELEASE = '2026-08-18T12:00:00.000Z'

    function makePackument(times) {
      return {
        statusCode: 200,
        body: {
          time: {
            created: '2020-01-01T00:00:00.000Z',
            modified: '2026-08-18T00:00:00.000Z',
            ...times,
          },
          repository: { url: 'git+https://github.com/example/pkg.git' },
        },
      }
    }

    test('discovers intermediates that pass the age gate while latest is quarantined', async () => {
      const mod = readScriptExports()
      mod.setImpls({
        fetchRegistryJson: makeMockFetchRegistryJson({
          pkg: makePackument({
            '1.0.0': '2026-07-01T00:00:00.000Z',
            '1.1.0': OLD_RELEASE,
            '1.2.0': RECENT_RELEASE,
            '2.0.0': RECENT_RELEASE,
          }),
        }),
        now: () => baseTime,
      })

      try {
        const result = await mod.classifyUpdate(
          'pkg',
          { current: '1.0.0', wanted: '1.0.0', latest: '2.0.0' },
          new Map(),
          { registryCacheHits: 0, registryCacheMisses: 0 },
        )
        assert.ok(result.quarantine, 'latest should be in quarantine')
        assert.deepEqual(result.quarantine.intermediateEligible, ['1.1.0'])
      } finally {
        mod.resetImpls()
      }
    })

    test('includes latest in intermediateEligible when latest passes the age gate', async () => {
      const mod = readScriptExports()
      mod.setImpls({
        fetchRegistryJson: makeMockFetchRegistryJson({
          pkg: makePackument({
            '1.0.0': '2026-07-01T00:00:00.000Z',
            '1.1.0': OLD_RELEASE,
            '2.0.0': OLD_RELEASE,
          }),
        }),
        now: () => baseTime,
      })

      try {
        const result = await mod.classifyUpdate(
          'pkg',
          { current: '1.0.0', wanted: '1.0.0', latest: '2.0.0' },
          new Map(),
          { registryCacheHits: 0, registryCacheMisses: 0 },
        )
        assert.ok(result.eligible, 'latest should be eligible')
        // Sorted ascending; the last element is the recommended target.
        assert.deepEqual(result.eligible.intermediateEligible, [
          '1.1.0',
          '2.0.0',
        ])
      } finally {
        mod.resetImpls()
      }
    })

    test('excludes prereleases, metadata keys, and versions not above wanted', async () => {
      const mod = readScriptExports()
      mod.setImpls({
        fetchRegistryJson: makeMockFetchRegistryJson({
          pkg: makePackument({
            '0.9.0': OLD_RELEASE, // below wanted — excluded
            '1.0.0': OLD_RELEASE, // equal to wanted — excluded
            '1.1.0-rc.1': OLD_RELEASE, // prerelease — excluded
            '1.1.0': OLD_RELEASE,
            '2.0.0': RECENT_RELEASE,
          }),
        }),
        now: () => baseTime,
      })

      try {
        const result = await mod.classifyUpdate(
          'pkg',
          { current: '0.9.0', wanted: '1.0.0', latest: '2.0.0' },
          new Map(),
          { registryCacheHits: 0, registryCacheMisses: 0 },
        )
        assert.deepEqual(result.quarantine.intermediateEligible, ['1.1.0'])
      } finally {
        mod.resetImpls()
      }
    })

    test('returns an empty list when no intermediate passes the age gate', async () => {
      const mod = readScriptExports()
      mod.setImpls({
        fetchRegistryJson: makeMockFetchRegistryJson({
          pkg: makePackument({
            '1.0.0': OLD_RELEASE,
            '2.0.0': RECENT_RELEASE,
          }),
        }),
        now: () => baseTime,
      })

      try {
        const result = await mod.classifyUpdate(
          'pkg',
          { current: '1.0.0', wanted: '1.0.0', latest: '2.0.0' },
          new Map(),
          { registryCacheHits: 0, registryCacheMisses: 0 },
        )
        assert.deepEqual(result.quarantine.intermediateEligible, [])
      } finally {
        mod.resetImpls()
      }
    })

    test('returns an empty list when the registry lookup fails', async () => {
      const mod = readScriptExports()
      mod.setImpls({
        fetchRegistryJson: makeMockFetchRegistryJson({
          pkg: { statusCode: 404, body: {} },
        }),
        now: () => baseTime,
      })

      try {
        const result = await mod.classifyUpdate(
          'pkg',
          { current: '1.0.0', wanted: '1.0.0', latest: '2.0.0' },
          new Map(),
          { registryCacheHits: 0, registryCacheMisses: 0 },
        )
        assert.ok(result.quarantine)
        assert.deepEqual(result.quarantine.intermediateEligible, [])
      } finally {
        mod.resetImpls()
      }
    })

    test('orders versions by semver, not by string or insertion order', () => {
      const mod = readScriptExports()
      const info = {
        time: {
          '1.10.0': OLD_RELEASE,
          '1.9.0': OLD_RELEASE,
          '1.1.0': OLD_RELEASE,
          '2.0.0': OLD_RELEASE,
        },
      }
      const versions = mod.findIntermediateEligibleVersions(
        info,
        '1.0.0',
        '2.0.0',
        baseTime,
      )
      assert.deepEqual(versions, ['1.1.0', '1.9.0', '1.10.0', '2.0.0'])
    })

    test('excludes deprecated versions even when they pass the age gate', async () => {
      const mod = readScriptExports()
      mod.setImpls({
        fetchRegistryJson: makeMockFetchRegistryJson({
          pkg: {
            statusCode: 200,
            body: {
              time: {
                '1.0.0': '2026-07-01T00:00:00.000Z',
                '1.1.0': OLD_RELEASE,
                '1.2.0': OLD_RELEASE,
                '2.0.0': RECENT_RELEASE,
              },
              versions: {
                // 1.2.0 is old enough but deprecated — it must never be a
                // recommended target (Fase F.4.1).
                '1.2.0': { deprecated: 'security issue, upgrade to 2.x' },
              },
              repository: { url: 'git+https://github.com/example/pkg.git' },
            },
          },
        }),
        now: () => baseTime,
      })

      try {
        const result = await mod.classifyUpdate(
          'pkg',
          { current: '1.0.0', wanted: '1.0.0', latest: '2.0.0' },
          new Map(),
          { registryCacheHits: 0, registryCacheMisses: 0 },
        )
        assert.deepEqual(result.quarantine.intermediateEligible, ['1.1.0'])
      } finally {
        mod.resetImpls()
      }
    })

    test('returns an empty list when only deprecated intermediates exist', async () => {
      const mod = readScriptExports()
      mod.setImpls({
        fetchRegistryJson: makeMockFetchRegistryJson({
          pkg: {
            statusCode: 200,
            body: {
              time: {
                '1.0.0': '2026-07-01T00:00:00.000Z',
                '1.1.0': OLD_RELEASE,
                '2.0.0': RECENT_RELEASE,
              },
              versions: {
                '1.1.0': { deprecated: 'broken release' },
              },
              repository: { url: 'git+https://github.com/example/pkg.git' },
            },
          },
        }),
        now: () => baseTime,
      })

      try {
        const result = await mod.classifyUpdate(
          'pkg',
          { current: '1.0.0', wanted: '1.0.0', latest: '2.0.0' },
          new Map(),
          { registryCacheHits: 0, registryCacheMisses: 0 },
        )
        assert.deepEqual(result.quarantine.intermediateEligible, [])
      } finally {
        mod.resetImpls()
      }
    })
  })

  describe('Fase F.0 — intermediateEligible in report formats and state', () => {
    const OLD_RELEASE = '2026-08-01T00:00:00.000Z'
    const inSyncLock = JSON.stringify({
      name: 'learn-supply-chain-attack-defence',
      lockfileVersion: 3,
      packages: {},
    })
    const inSyncHash = require('node:crypto')
      .createHash('sha256')
      .update(inSyncLock)
      .digest('hex')

    function setupScan(mod, calls, capturedWrites) {
      const baseFs = makeMockFs({
        state: null,
        lock: inSyncLock,
        nodeModulesLock: { packageLockHash: inSyncHash },
      })
      mod.setImpls({
        fs: {
          ...baseFs,
          writeFileSync: (filePath, data) => {
            if (filePath.includes('.defence-update-check.json')) {
              capturedWrites.push(data)
            }
          },
        },
        spawnSync: makeMockSpawn(calls, {
          'npm outdated --json --min-release-age=0': {
            status: 0,
            stdout: JSON.stringify({
              pkg: { current: '1.0.0', wanted: '1.0.0', latest: '2.0.0' },
            }),
          },
        }),
        fetchRegistryJson: makeMockFetchRegistryJson({
          pkg: {
            statusCode: 200,
            body: {
              time: {
                '1.0.0': '2026-07-01T00:00:00.000Z',
                '1.1.0': OLD_RELEASE,
                '2.0.0': OLD_RELEASE,
              },
              repository: { url: 'git+https://github.com/example/pkg.git' },
            },
          },
        }),
        now: () => baseTime,
      })
    }

    test('table format lists eligible versions', async () => {
      const calls = []
      const logs = []
      const capturedWrites = []
      const mod = readScriptExports()
      setupScan(mod, calls, capturedWrites)

      const originalLog = console.log
      console.log = (...args) => logs.push(args.join(' '))

      try {
        const code = await mod.main(['--force'])
        assert.equal(code, 0)
        assert.ok(
          logs.some(
            (line) =>
              line.includes('eligible versions:') &&
              line.includes('1.1.0') &&
              line.includes('2.0.0'),
          ),
        )
      } finally {
        console.log = originalLog
        mod.resetImpls()
      }
    })

    test('json format includes intermediateEligible', async () => {
      const calls = []
      const logs = []
      const capturedWrites = []
      const mod = readScriptExports()
      setupScan(mod, calls, capturedWrites)

      const originalLog = console.log
      console.log = (...args) => logs.push(args.join(' '))

      try {
        const code = await mod.main(['--force', '--format=json'])
        assert.equal(code, 0)
        const report = JSON.parse(logs.join('\n'))
        assert.deepEqual(report.eligible[0].intermediateEligible, [
          '1.1.0',
          '2.0.0',
        ])
      } finally {
        console.log = originalLog
        mod.resetImpls()
      }
    })

    test('markdown format includes the eligible versions column', async () => {
      const calls = []
      const logs = []
      const capturedWrites = []
      const mod = readScriptExports()
      setupScan(mod, calls, capturedWrites)

      const originalLog = console.log
      console.log = (...args) => logs.push(args.join(' '))

      try {
        const code = await mod.main(['--force', '--format=markdown'])
        assert.equal(code, 0)
        const output = logs.join('\n')
        assert.ok(output.includes('Eligible versions'))
        assert.ok(output.includes('1.1.0, 2.0.0'))
      } finally {
        console.log = originalLog
        mod.resetImpls()
      }
    })

    test('persists intermediateEligible in the saved state', async () => {
      const calls = []
      const logs = []
      const capturedWrites = []
      const mod = readScriptExports()
      setupScan(mod, calls, capturedWrites)

      const originalLog = console.log
      console.log = (...args) => logs.push(args.join(' '))

      try {
        const code = await mod.main(['--force', '--silent'])
        assert.equal(code, 0)
        assert.ok(capturedWrites.length > 0, 'state should have been saved')
        const saved = JSON.parse(capturedWrites[0])
        assert.deepEqual(saved.eligible[0].intermediateEligible, [
          '1.1.0',
          '2.0.0',
        ])
      } finally {
        console.log = originalLog
        mod.resetImpls()
      }
    })
  })
})
