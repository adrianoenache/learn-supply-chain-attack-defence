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
const { EventEmitter } = require('node:events')

const SCRIPT_PATH = path.resolve(__dirname, 'check-updates.js')

function readScriptExports() {
  // Load module fresh for each test by clearing require cache.
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
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

function makeMockHttpsGet(registryResponses) {
  return function mockHttpsGet(url, _opts, cb) {
    const name = decodeURIComponent(
      url.replace('https://registry.npmjs.org/', ''),
    )
    const response = registryResponses[name] ?? { statusCode: 404, body: '{}' }

    const res = new EventEmitter()
    res.statusCode = response.statusCode ?? 200

    process.nextTick(() => {
      cb(res)
      if (response.error) {
        res.emit('error', response.error)
      } else {
        res.emit('data', response.body)
        res.emit('end')
      }
    })

    const req = new EventEmitter()
    req.destroy = () => {}
    return req
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

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--force'])
      assert.equal(code, 0)
      assert.equal(calls.length, 1)
      assert.equal(calls[0].cmd, 'npm')
      assert.deepEqual(calls[0].args, ['ls', '--json', '--depth=0'])
      assert.ok(logs.some((line) => line.includes('out of sync')))
      assert.ok(logs.some((line) => line.includes('npm ci')))
    } finally {
      console.log = originalLog
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
        'npm outdated --json': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      httpsGet: makeMockHttpsGet({
        biome: {
          statusCode: 200,
          body: JSON.stringify({
            time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/biomejs/biome.git' },
          }),
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
        'npm outdated --json': {
          status: 0,
          stdout: JSON.stringify({
            husky: { current: '9.1.7', wanted: '9.1.7', latest: '9.2.0' },
          }),
        },
      }),
      httpsGet: makeMockHttpsGet({
        husky: {
          statusCode: 200,
          body: JSON.stringify({
            time: { '9.2.0': '2026-08-17T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/typicode/husky.git' },
          }),
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
      assert.deepEqual(calls[0].args, ['outdated', '--json'])
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
        'npm outdated --json': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      httpsGet: makeMockHttpsGet({
        biome: {
          statusCode: 200,
          body: JSON.stringify({
            time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/biomejs/biome.git' },
          }),
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
        'npm outdated --json': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      httpsGet: makeMockHttpsGet({
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
        'npm outdated --json': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      httpsGet: makeMockHttpsGet({
        biome: {
          statusCode: 200,
          body: JSON.stringify({
            time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/biomejs/biome.git' },
          }),
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
        'npm outdated --json': {
          status: 0,
          stdout: JSON.stringify({
            biome: { current: '2.5.8', wanted: '2.6.0', latest: '2.6.0' },
          }),
        },
      }),
      httpsGet: makeMockHttpsGet({
        biome: {
          statusCode: 200,
          body: JSON.stringify({
            time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
            repository: { url: 'git+https://github.com/biomejs/biome.git' },
          }),
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

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--offline'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
      assert.ok(logs.some((line) => line.includes('offline')))
      assert.ok(logs.some((line) => line.includes('no cached scan')))
    } finally {
      console.log = originalLog
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

    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    try {
      const code = await mod.main(['--offline'])
      assert.equal(code, 0)
      assert.equal(calls.length, 0)
      assert.ok(logs.some((line) => line.includes('offline')))
      assert.ok(logs.some((line) => line.includes('stale')))
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })
})
