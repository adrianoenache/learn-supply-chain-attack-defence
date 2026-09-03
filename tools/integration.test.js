#!/usr/bin/env node
'use strict'

// Integration tests for the supply-chain defence toolkit.
//
// Goals:
//   1. Verify that add-package.js, check-package-age.js and check-updates.js
//      agree on package metadata (publish date, age in days, minimum age gate).
//   2. Verify that the pre-commit gate can be composed from the same tools
//      without spawning real npm installs or hitting the real registry.
//
// Safety rules:
//   - All network calls are mocked through tools/lib/registry-cache.js.
//   - All subprocess calls are mocked through the exported set*Impl helpers.
//   - Tests use explicit timeouts so a bug cannot hang the runner.
//   - The real package-lock.json and .defence-update-check.json are never
//     modified; filesystem implementations are injected in memory.

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const retryFetch = require(path.resolve(__dirname, './lib/retry-fetch.js'))

const addPackage = require(path.resolve(__dirname, './add-package.js'))
const checkPackageAge = require(
  path.resolve(__dirname, './check-package-age.js'),
)
const checkUpdates = require(path.resolve(__dirname, './check-updates.js'))
const syncCheck = require(path.resolve(__dirname, './lib/sync-check.js'))
const configLoader = require(path.resolve(__dirname, './lib/config.js'))

// ---------------------------------------------------------------------------
// Test helpers.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 1000 * 60 * 60 * 24
const NOW = new Date('2025-01-15T12:00:00.000Z').getTime()

function daysAgo(days) {
  return new Date(NOW - days * MS_PER_DAY).toISOString()
}

function buildPackument(name, versions) {
  const time = {}
  const distTags = {}
  const versionDocs = {}

  for (const [version, publishedDaysAgo] of Object.entries(versions)) {
    const published = daysAgo(publishedDaysAgo)
    time[version] = published
    versionDocs[version] = {
      name,
      version,
      dist: {
        integrity: `sha512-${Buffer.from(`${name}@${version}`).toString('base64')}`,
        tarball: `https://registry.npmjs.org/${name}/-/${name.replace('@', '')}-${version}.tgz`,
      },
    }
  }

  const sortedVersions = Object.keys(versions).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  )
  distTags.latest = sortedVersions[sortedVersions.length - 1]

  return {
    name,
    'dist-tags': distTags,
    versions: versionDocs,
    time,
  }
}

function buildVersionManifest(name, version, publishedDaysAgo) {
  return {
    name,
    version,
    dist: {
      integrity: `sha512-${Buffer.from(`${name}@${version}`).toString('base64')}`,
      tarball: `https://registry.npmjs.org/${name}/-/${name.replace('@', '')}-${version}.tgz`,
    },
    time: daysAgo(publishedDaysAgo),
  }
}

function buildLockfile(packages) {
  const lockPackages = { '': { name: 'test-project', version: '1.0.0' } }
  for (const [name, version] of Object.entries(packages)) {
    lockPackages[`node_modules/${name}`] = {
      version,
      integrity: `sha512-${Buffer.from(`${name}@${version}`).toString('base64')}`,
    }
  }
  return { lockfileVersion: 3, packages: lockPackages }
}

function makeInMemoryFs(initialFiles = {}) {
  const files = new Map(Object.entries(initialFiles))
  return {
    existsSync: (p) => files.has(p),
    readFileSync: (p, encoding) => {
      if (!files.has(p)) {
        const err = new Error(`ENOENT: ${p}`)
        err.code = 'ENOENT'
        throw err
      }
      const value = files.get(p)
      if (Buffer.isBuffer(value)) {
        return encoding ? value.toString(encoding) : value
      }
      return encoding ? value : Buffer.from(value)
    },
    writeFileSync: (p, data) => {
      files.set(p, typeof data === 'string' ? data : Buffer.from(data))
    },
    mkdirSync: () => {},
    readdirSync: () => [],
    unlinkSync: (p) => files.delete(p),
  }
}

function captureExitFn() {
  let code = null
  function exitFn(c) {
    code = c
  }
  return {
    exitFn,
    getCode: () => code,
    expect: (expected) =>
      assert.equal(
        code,
        expected,
        `expected exit code ${expected}, got ${code}`,
      ),
  }
}

// ---------------------------------------------------------------------------
// Shared mock registry.
// ---------------------------------------------------------------------------

function installMockRegistry(packuments = {}) {
  const versionManifests = new Map()

  retryFetch.setImpls({
    httpsGet: (url, _options, callback) => {
      const urlString = typeof url === 'string' ? url : url.href
      const match = urlString.match(
        /^https:\/\/registry\.npmjs\.org\/([^/]+)(?:\/([^/]+))?$/,
      )
      if (!match) {
        const req = {
          on: (event, _handler) => {
            if (event === 'error') {
              setTimeout(() => _handler(new Error('unknown registry host')), 0)
            }
          },
          destroy: () => {},
        }
        return req
      }

      const encodedName = match[1]
      const version = match[2] ? decodeURIComponent(match[2]) : null
      const name = decodeURIComponent(encodedName)

      const packument = packuments[name]
      if (!packument) {
        const req = {
          on: (event, _handler) => {
            if (event === 'error') {
              setTimeout(() => {
                const err = new Error('package not found')
                err.statusCode = 404
                _handler(err)
              }, 0)
            }
          },
          destroy: () => {},
        }
        return req
      }

      const body = version
        ? buildVersionManifest(
            name,
            version,
            ageInDays(packument.time[version]),
          )
        : packument

      // Record that add-package.js requested the version manifest for integrity
      // pinning. This lets tests assert the TOCTOU pin happened.
      if (version) {
        versionManifests.set(`${name}@${version}`, body)
      }

      const payload = JSON.stringify(body)
      const buffer = Buffer.from(payload)

      const res = {
        statusCode: 200,
        headers: {},
        on: (event, handler) => {
          if (event === 'data') {
            setTimeout(() => handler(buffer), 0)
          }
          if (event === 'end') {
            setTimeout(() => handler(), 0)
          }
          if (event === 'error') {
            // No error in this mock.
          }
        },
      }

      const req = {
        on: (event, _handler) => {
          if (event === 'timeout') {
            // Never fires in the mock.
          }
          if (event === 'error') {
            // No error in this mock.
          }
        },
        destroy: () => {},
      }

      setTimeout(() => callback(res), 0)
      return req
    },
  })

  return { versionManifests }
}

function ageInDays(isoDate) {
  return Math.floor((NOW - new Date(isoDate).getTime()) / MS_PER_DAY)
}

// ---------------------------------------------------------------------------
// Test suite.
// ---------------------------------------------------------------------------

describe('integration: add-package → check-package-age metadata consistency', () => {
  const packuments = {
    'safe-pkg': buildPackument('safe-pkg', {
      '1.0.0': 10,
      '1.0.1': 2,
    }),
  }

  beforeEach(() => {
    installMockRegistry(packuments)
    checkPackageAge.setNowImpl(() => NOW)
  })

  afterEach(() => {
    retryFetch.resetImpls()
    checkPackageAge.resetNowImpl()
    addPackage.resetLoadConfigImpl()
    addPackage.resetProvenanceImpl()
    addPackage.resetTyposquattingImpl()
    addPackage.resetSpawnSyncImpl()
    addPackage.resetFetchRegistryJsonImpl()
    addPackage.resetFsImpl()
  })

  test('add-package --dry-run and check-package-age --pkg agree on age', {
    timeout: 5000,
  }, async () => {
    const config = configLoader.loadConfig()
    config.pkgAgeCheck.minAgeDays = 7
    addPackage.setLoadConfigImpl(() => config)
    addPackage.setProvenanceImpl({
      checkProvenance: async () => ({ hasProvenance: true, valid: true }),
    })
    addPackage.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: async () => [],
    })

    const addCapture = captureExitFn()
    await addPackage.main(['safe-pkg@1.0.0', '--dry-run'], addCapture.exitFn)
    addCapture.expect(0)

    const ageCapture = captureExitFn()
    await checkPackageAge.main({
      argv: ['--pkg', 'safe-pkg@1.0.0'],
      exitFn: ageCapture.exitFn,
    })
    // check-package-age.main only calls exitFn on failure; a successful run
    // returns without invoking it, so the captured code stays null.
    assert.equal(ageCapture.getCode(), null)

    // Both tools use the same registry mock, so the computed age must match
    // the value derived from the packument. The exact console output is not
    // asserted here; instead we rely on the shared registry layer and the
    // fact that both allowed the package through.
  })

  test('add-package --dry-run blocks a package younger than minAgeDays', {
    timeout: 5000,
  }, async () => {
    const config = configLoader.loadConfig()
    config.pkgAgeCheck.minAgeDays = 7
    addPackage.setLoadConfigImpl(() => config)
    addPackage.setProvenanceImpl({
      checkProvenance: async () => ({ hasProvenance: true, valid: true }),
    })
    addPackage.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: async () => [],
    })

    const capture = captureExitFn()
    await addPackage.main(['safe-pkg@1.0.1', '--dry-run'], capture.exitFn)
    capture.expect(1)
  })
})

describe('integration: check-updates age classification', () => {
  const packuments = {
    'eligible-pkg': buildPackument('eligible-pkg', {
      '1.0.0': 30,
      '1.1.0': 10,
    }),
    'quarantine-pkg': buildPackument('quarantine-pkg', {
      '2.0.0': 30,
      '2.0.1': 2,
    }),
  }

  beforeEach(() => {
    installMockRegistry(packuments)
    syncCheck.setImpls({
      fs: makeInMemoryFs(),
      spawnSync: (cmd, args) => {
        if (cmd === 'npm' && args[0] === 'ls') {
          return {
            status: 0,
            stdout: JSON.stringify({ dependencies: {} }),
          }
        }
        return { status: 0, stdout: '{}' }
      },
      pkg: { name: 'test-project', version: '1.0.0' },
    })
  })

  afterEach(() => {
    retryFetch.resetImpls()
    checkUpdates.resetImpls()
    syncCheck.resetImpls()
  })

  test('classifies an old update as eligible and a recent update as quarantined', {
    timeout: 5000,
  }, async () => {
    const fs = makeInMemoryFs({
      [path.resolve(__dirname, '../package-lock.json')]: JSON.stringify(
        buildLockfile({}),
      ),
    })

    checkUpdates.setImpls({
      fs,
      spawnSync: (cmd, args) => {
        assert.equal(cmd, 'npm')
        if (args[0] === 'ls') {
          return { status: 0, stdout: JSON.stringify({ dependencies: {} }) }
        }
        assert.deepEqual(args.slice(0, 2), ['outdated', '--json'])
        return {
          status: 0,
          stdout: JSON.stringify({
            'eligible-pkg': {
              current: '1.0.0',
              wanted: '1.1.0',
              latest: '1.1.0',
              dependent: 'test-project',
            },
            'quarantine-pkg': {
              current: '2.0.0',
              wanted: '2.0.1',
              latest: '2.0.1',
              dependent: 'test-project',
            },
          }),
        }
      },
      now: () => NOW,
    })

    const exitCode = await checkUpdates.main(['--force', '--silent'])
    assert.equal(exitCode, 0)

    const state = JSON.parse(
      fs.readFileSync(
        path.resolve(__dirname, '../.defence-update-check.json'),
        'utf8',
      ),
    )

    const eligibleNames = state.eligible.map((e) => e.name)
    const quarantineNames = state.quarantine.map((q) => q.name)

    assert.ok(
      eligibleNames.includes('eligible-pkg'),
      `expected eligible-pkg in eligible, got ${eligibleNames.join(', ')}`,
    )
    assert.ok(
      quarantineNames.includes('quarantine-pkg'),
      `expected quarantine-pkg in quarantine, got ${quarantineNames.join(', ')}`,
    )

    const eligibleEntry = state.eligible.find((e) => e.name === 'eligible-pkg')
    assert.equal(eligibleEntry.current, '1.0.0')
    assert.equal(eligibleEntry.latest, '1.1.0')
    assert.ok(eligibleEntry.daysOld >= 7)

    const quarantineEntry = state.quarantine.find(
      (q) => q.name === 'quarantine-pkg',
    )
    assert.equal(quarantineEntry.current, '2.0.0')
    assert.equal(quarantineEntry.latest, '2.0.1')
    assert.ok(quarantineEntry.daysOld < 7)
  })

  test('offline mode reuses cached scan instead of hitting the registry', {
    timeout: 5000,
  }, async () => {
    const fs = makeInMemoryFs({
      [path.resolve(__dirname, '../package-lock.json')]: JSON.stringify(
        buildLockfile({}),
      ),
      [path.resolve(__dirname, '../.defence-update-check.json')]:
        JSON.stringify({
          lastScan: new Date(NOW).toISOString(),
          installedLockfileHash: 'abc',
          eligible: [
            {
              name: 'cached-pkg',
              current: '1.0.0',
              latest: '1.1.0',
              severity: 'minor',
              daysOld: 15,
            },
          ],
          quarantine: [],
          history: [],
        }),
    })

    checkUpdates.setImpls({
      fs,
      spawnSync: (cmd, args) => {
        if (cmd === 'npm' && args[0] === 'ls') {
          return { status: 0, stdout: JSON.stringify({ dependencies: {} }) }
        }
        throw new Error('spawnSync should not be called in offline mode')
      },
      now: () => NOW,
    })

    const exitCode = await checkUpdates.main(['--offline', '--silent'])
    assert.equal(exitCode, 0)
  })
})

describe('integration: pre-commit gate composition', () => {
  const packuments = {
    'transitive-a': buildPackument('transitive-a', { '1.0.0': 14 }),
    'transitive-b': buildPackument('transitive-b', { '2.0.0': 21 }),
  }

  beforeEach(() => {
    installMockRegistry(packuments)
    checkPackageAge.setNowImpl(() => NOW)
  })

  afterEach(() => {
    retryFetch.resetImpls()
    checkPackageAge.resetNowImpl()
    addPackage.resetLoadConfigImpl()
    addPackage.resetProvenanceImpl()
    addPackage.resetTyposquattingImpl()
    addPackage.resetSpawnSyncImpl()
    addPackage.resetFetchRegistryJsonImpl()
    addPackage.resetFsImpl()
  })

  test('transitive package-age check passes for a lockfile of old packages', {
    timeout: 5000,
  }, async () => {
    const lock = buildLockfile({
      'transitive-a': '1.0.0',
      'transitive-b': '2.0.0',
    })

    const capture = captureExitFn()
    await checkPackageAge.main({
      argv: ['--transitive'],
      exitFn: capture.exitFn,
      lock,
      minAgeDays: 7,
    })
    // Success path does not invoke exitFn.
    assert.equal(capture.getCode(), null)
  })

  test('transitive package-age check fails when a resolved package is too recent', {
    timeout: 5000,
  }, async () => {
    const lock = buildLockfile({
      'transitive-a': '1.0.0',
    })

    const capture = captureExitFn()
    await checkPackageAge.main({
      argv: ['--transitive'],
      exitFn: capture.exitFn,
      lock,
      minAgeDays: 21,
    })
    capture.expect(1)
  })

  test('add-package dry-run can be composed before the transitive age gate', {
    timeout: 5000,
  }, async () => {
    const config = configLoader.loadConfig()
    config.pkgAgeCheck.minAgeDays = 7
    addPackage.setLoadConfigImpl(() => config)
    addPackage.setProvenanceImpl({
      checkProvenance: async () => ({ hasProvenance: true, valid: true }),
    })
    addPackage.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: async () => [],
    })

    const addCapture = captureExitFn()
    await addPackage.main(
      ['transitive-a@1.0.0', '--dry-run'],
      addCapture.exitFn,
    )
    addCapture.expect(0)

    const transitiveCapture = captureExitFn()
    await checkPackageAge.main({
      argv: ['--transitive'],
      exitFn: transitiveCapture.exitFn,
      lock: buildLockfile({ 'transitive-a': '1.0.0' }),
      minAgeDays: 7,
    })
    // Success path does not invoke exitFn.
    assert.equal(transitiveCapture.getCode(), null)
  })
})
