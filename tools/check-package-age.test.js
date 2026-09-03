'use strict'

// Tests for check-package-age.js and add-package.js.
// Uses node:test + node:assert + node:child_process (native modules, Node.js >= 18) — zero extra dependencies.
//
// Run:
//   npm test
//   node --test tools/check-package-age.test.js

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const SCRIPT_PATH = path.resolve(__dirname, './check-package-age.js')

// Imports the exported functions — the `require.main === module` guard in both files
// ensures main() is not executed when imported via require().
const {
  resolveExactVersion,
  fetchPackageAge,
  runWithConcurrencyLimit,
  main,
  buildDeps,
} = require(path.resolve(__dirname, './check-package-age.js'))
const { setImpls: setRegistryImpls, resetImpls: resetRegistryImpls } = require(
  path.resolve(__dirname, './lib/registry-cache.js'),
)
const { parsePackageArg, VALID_PKG_SPECIFIER_RE } = require(
  path.resolve(__dirname, './lib/package-utils.js'),
)
const {
  validateArgs,
  main: addPackageMain,
  setSpawnSyncImpl,
  resetSpawnSyncImpl,
  setFetchRegistryJsonImpl,
  resetFetchRegistryJsonImpl,
  setFsImpl,
  resetFsImpl,
} = require(path.resolve(__dirname, './add-package.js'))

// ---------------------------------------------------------------------------
// resolveExactVersion
// ---------------------------------------------------------------------------

describe('resolveExactVersion', () => {
  // Exact versions should be returned unchanged.
  test('returns exact version without range operators', () => {
    assert.equal(resolveExactVersion('1.0.0'), '1.0.0')
    assert.equal(resolveExactVersion('4.17.21'), '4.17.21')
    assert.equal(resolveExactVersion('0.0.1'), '0.0.1')
  })

  test('returns exact version with pre-release tag', () => {
    assert.equal(resolveExactVersion('1.0.0-beta.1'), '1.0.0-beta.1')
    assert.equal(resolveExactVersion('2.0.0-rc.3'), '2.0.0-rc.3')
  })

  test('returns exact version with build metadata', () => {
    assert.equal(resolveExactVersion('1.0.0+build.123'), '1.0.0+build.123')
  })

  // Range operators should be removed, exposing the underlying exact version.
  test('removes ^ operator and returns exact version', () => {
    assert.equal(resolveExactVersion('^1.0.0'), '1.0.0')
    assert.equal(resolveExactVersion('^4.17.21'), '4.17.21')
  })

  test('removes ~ operator and returns exact version', () => {
    assert.equal(resolveExactVersion('~2.0.1'), '2.0.1')
    assert.equal(resolveExactVersion('~1.2.3'), '1.2.3')
  })

  test('removes >= and <= operators and returns exact version', () => {
    assert.equal(resolveExactVersion('>=1.0.0'), '1.0.0')
    assert.equal(resolveExactVersion('<=3.0.0'), '3.0.0')
  })

  // Values that cannot resolve to an exact version should return null.
  test('returns null for "latest"', () => {
    assert.equal(resolveExactVersion('latest'), null)
  })

  test('returns null for "next"', () => {
    assert.equal(resolveExactVersion('next'), null)
  })

  test('returns null for wildcard *', () => {
    assert.equal(resolveExactVersion('*'), null)
  })

  test('returns null for version with x wildcard', () => {
    assert.equal(resolveExactVersion('1.x'), null)
    assert.equal(resolveExactVersion('x.x.x'), null)
  })

  test('returns null for composite range with space', () => {
    assert.equal(resolveExactVersion('>=1.0.0 <2.0.0'), null)
    assert.equal(resolveExactVersion('1.2 - 2.0'), null)
  })

  test('returns null for empty string', () => {
    assert.equal(resolveExactVersion(''), null)
  })
})

// ---------------------------------------------------------------------------
// VALID_PKG_SPECIFIER_RE
// ---------------------------------------------------------------------------

describe('VALID_PKG_SPECIFIER_RE', () => {
  // Valid specifiers should pass the regex.
  test('accepts simple name with exact version', () => {
    assert.ok(VALID_PKG_SPECIFIER_RE.test('lodash@4.17.21'))
    assert.ok(VALID_PKG_SPECIFIER_RE.test('express@4.21.2'))
    assert.ok(VALID_PKG_SPECIFIER_RE.test('husky@9.1.7'))
  })

  test('accepts scoped package with exact version', () => {
    assert.ok(VALID_PKG_SPECIFIER_RE.test('@types/node@22.15.3'))
    assert.ok(VALID_PKG_SPECIFIER_RE.test('@org/my-pkg@1.0.0'))
  })

  test('accepts version with pre-release tag', () => {
    assert.ok(VALID_PKG_SPECIFIER_RE.test('pkg@1.0.0-beta.1'))
    assert.ok(VALID_PKG_SPECIFIER_RE.test('pkg@2.0.0-rc.3'))
  })

  test('accepts simple name without version', () => {
    // No version is accepted by the regex — the exact-version requirement is validated at a higher layer.
    assert.ok(VALID_PKG_SPECIFIER_RE.test('lodash'))
    assert.ok(VALID_PKG_SPECIFIER_RE.test('my-pkg'))
  })

  // Shell injection and invalid characters must be rejected.
  test('rejects semicolon (shell injection)', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('lodash; rm -rf /'))
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('pkg;evil'))
  })

  test('rejects ampersand (shell injection)', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('pkg&evil'))
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('pkg&&evil'))
  })

  test('rejects pipe (shell injection)', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('pkg|evil'))
  })

  test('rejects dollar sign (shell variable expansion)', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('$HOME'))
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('pkg$evil'))
  })

  test('rejects directory traversal', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('../../../etc/passwd'))
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('../../evil'))
  })

  test('rejects spaces in specifier', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('lodash 4.17.21'))
    assert.ok(!VALID_PKG_SPECIFIER_RE.test('evil pkg'))
  })

  test('rejects empty string', () => {
    assert.ok(!VALID_PKG_SPECIFIER_RE.test(''))
  })
})

// ---------------------------------------------------------------------------
// parsePackageArg
// ---------------------------------------------------------------------------

describe('parsePackageArg', () => {
  // Packages without scope.
  test('decomposes name@version correctly', () => {
    assert.deepEqual(parsePackageArg('lodash@4.17.21'), {
      name: 'lodash',
      version: '4.17.21',
    })
    assert.deepEqual(parsePackageArg('express@4.21.2'), {
      name: 'express',
      version: '4.21.2',
    })
  })

  test('returns version: null when version is omitted', () => {
    assert.deepEqual(parsePackageArg('lodash'), {
      name: 'lodash',
      version: null,
    })
  })

  test('preserves pre-release tag in version', () => {
    assert.deepEqual(parsePackageArg('pkg@1.0.0-beta.1'), {
      name: 'pkg',
      version: '1.0.0-beta.1',
    })
  })

  // Scoped packages (@org/name).
  test('decomposes @scope/name@version correctly', () => {
    assert.deepEqual(parsePackageArg('@types/node@22.15.3'), {
      name: '@types/node',
      version: '22.15.3',
    })
    assert.deepEqual(parsePackageArg('@org/my-pkg@1.0.0'), {
      name: '@org/my-pkg',
      version: '1.0.0',
    })
  })

  test('returns version: null for @scope/name without version', () => {
    assert.deepEqual(parsePackageArg('@org/pkg'), {
      name: '@org/pkg',
      version: null,
    })
    assert.deepEqual(parsePackageArg('@types/node'), {
      name: '@types/node',
      version: null,
    })
  })

  test('preserves the scope @ in the name field', () => {
    const result = parsePackageArg('@types/node@22.15.3')
    assert.ok(result.name.startsWith('@'))
    assert.equal(result.name, '@types/node')
  })
})

// ---------------------------------------------------------------------------
// runWithConcurrencyLimit
// ---------------------------------------------------------------------------

describe('runWithConcurrencyLimit', () => {
  test('resolves with [] for empty task list', async () => {
    const results = await runWithConcurrencyLimit([], 5)
    assert.deepEqual(results, [])
  })

  test('runs all tasks and returns results in allSettled format', async () => {
    const tasks = [
      () => Promise.resolve('a'),
      () => Promise.resolve('b'),
      () => Promise.resolve('c'),
    ]
    const results = await runWithConcurrencyLimit(tasks, 2)
    assert.deepEqual(results, [
      { status: 'fulfilled', value: 'a' },
      { status: 'fulfilled', value: 'b' },
      { status: 'fulfilled', value: 'c' },
    ])
  })

  test('rejected task does not stop the others', async () => {
    const tasks = [
      () => Promise.resolve('ok1'),
      () => Promise.reject(new Error('failure')),
      () => Promise.resolve('ok2'),
    ]
    const results = await runWithConcurrencyLimit(tasks, 3)
    assert.equal(results.length, 3)
    assert.equal(results[0].status, 'fulfilled')
    assert.equal(results[0].value, 'ok1')
    assert.equal(results[1].status, 'rejected')
    assert.equal(results[1].reason.message, 'failure')
    assert.equal(results[2].status, 'fulfilled')
    assert.equal(results[2].value, 'ok2')
  })

  test('keeps result order independent of completion order', async () => {
    // Task 0 uses setImmediate (slower), task 1 resolves immediately.
    // Result index must follow insertion order, not completion order.
    const results = await runWithConcurrencyLimit(
      [
        () => new Promise((res) => setImmediate(() => res('slow'))),
        () => Promise.resolve('fast'),
      ],
      2,
    )
    assert.equal(results[0].value, 'slow')
    assert.equal(results[1].value, 'fast')
  })

  test('respects the concurrency limit', async () => {
    let running = 0
    let maxRunning = 0
    const LIMIT = 3
    const tasks = Array.from(
      { length: 10 },
      () => () =>
        new Promise((resolve) => {
          running++
          if (running > maxRunning) maxRunning = running
          setImmediate(() => {
            running--
            resolve()
          })
        }),
    )
    await runWithConcurrencyLimit(tasks, LIMIT)
    assert.ok(
      maxRunning <= LIMIT,
      `Maximum concurrent was ${maxRunning}, expected <= ${LIMIT}`,
    )
  })
})

// ---------------------------------------------------------------------------
// fetchPackageAge
// ---------------------------------------------------------------------------

function registryUrlToName(url) {
  try {
    return decodeURIComponent(new URL(url).pathname.slice(1))
  } catch {
    return ''
  }
}

describe('fetchPackageAge', () => {
  const noOpFs = {
    existsSync: () => false,
    mkdirSync: () => {},
    readFileSync: () => {
      throw new Error('not found')
    },
    writeFileSync: () => {},
    readdirSync: () => [],
    unlinkSync: () => {},
  }

  function mockFetchRegistryJson(responses) {
    return async (url) => {
      const name = registryUrlToName(url)
      const response = responses[name]
      if (!response) {
        const err = new Error(`HTTP 404`)
        err.statusCode = 404
        throw err
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

  test('returns { name, version, ageDays, published } for valid HTTP 200', async () => {
    const publishDate = new Date(
      Date.now() - 10 * 24 * 60 * 60 * 1000,
    ).toISOString()
    setRegistryImpls({
      fs: noOpFs,
      fetchJson: mockFetchRegistryJson({
        mypkg: { body: { time: { '1.0.0': publishDate } } },
      }),
    })
    try {
      const result = await fetchPackageAge('mypkg', '1.0.0')
      assert.equal(result.name, 'mypkg')
      assert.equal(result.version, '1.0.0')
      assert.ok(result.ageDays >= 9.9 && result.ageDays <= 10.1)
      assert.ok(result.published instanceof Date)
    } finally {
      resetRegistryImpls()
    }
  })

  test('rejects with "No publish date found" when time[version] is missing', async () => {
    setRegistryImpls({
      fs: noOpFs,
      fetchJson: mockFetchRegistryJson({
        mypkg: {
          body: { time: { '2.0.0': '2024-01-01T00:00:00.000Z' } },
        },
      }),
    })
    try {
      await assert.rejects(
        () => fetchPackageAge('mypkg', '1.0.0'),
        /No publish date found for mypkg@1\.0\.0/,
      )
    } finally {
      resetRegistryImpls()
    }
  })

  test('rejects with "Could not parse publish date" for invalid date', async () => {
    setRegistryImpls({
      fs: noOpFs,
      fetchJson: mockFetchRegistryJson({
        mypkg: { body: { time: { '1.0.0': 'not-a-date' } } },
      }),
    })
    try {
      await assert.rejects(
        () => fetchPackageAge('mypkg', '1.0.0'),
        /Could not parse publish date for mypkg@1\.0\.0/,
      )
    } finally {
      resetRegistryImpls()
    }
  })
})

// ---------------------------------------------------------------------------
// CLI — check-package-age flags
// ---------------------------------------------------------------------------

describe('CLI — check-package-age flags', () => {
  const { spawnSync } = require('node:child_process')
  const scriptPath = path.resolve(__dirname, './check-package-age.js')

  test('--pkg without value: exit 1 with error message', () => {
    const result = spawnSync(process.execPath, [scriptPath, '--pkg'], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 1)
    assert.match(
      result.stderr,
      /--pkg requires a package name with an exact version/,
    )
  })

  test('--pkg and --transitive combined: exit 1 with mutual exclusion message', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, '--pkg', 'lodash@4.17.21', '--transitive'],
      { encoding: 'utf8' },
    )
    assert.equal(result.status, 1)
    assert.match(result.stderr, /--pkg and --transitive are mutually exclusive/)
  })

  test('--pkg with invalid specifier: exit 1', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, '--pkg', 'lodash; rm -rf /'],
      { encoding: 'utf8' },
    )
    assert.equal(result.status, 1)
    assert.match(result.stderr, /invalid package specifier/)
  })
})

// ---------------------------------------------------------------------------
// CLI — add-package flags
// ---------------------------------------------------------------------------

describe('CLI — add-package flags', () => {
  const { spawnSync } = require('node:child_process')
  const scriptPath = path.resolve(__dirname, './add-package.js')

  test('missing package argument: exit 1', () => {
    const result = spawnSync(process.execPath, [scriptPath], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /missing package argument/)
  })

  test('--dev and --peer combined: exit 1 with mutual exclusion message', () => {
    const result = spawnSync(
      process.execPath,
      [scriptPath, 'lodash@4.17.21', '--dev', '--peer'],
      { encoding: 'utf8' },
    )
    assert.equal(result.status, 1)
    assert.match(result.stderr, /--dev and --peer are mutually exclusive/)
  })

  test('version omitted (name without @x.y.z): exit 1', async () => {
    const result = spawnSync(process.execPath, [scriptPath, 'lodash'], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /exact version required/)
  })

  test('invalid specifier: exit 1', () => {
    const result = spawnSync(process.execPath, [scriptPath, 'lodash; evil'], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 1)
    assert.match(result.stderr, /invalid package specifier/)
  })
})

// ---------------------------------------------------------------------------
// Integration — check-package-age dependency modes
// ---------------------------------------------------------------------------

describe('Integration — check-package-age dependency modes', () => {
  // Mocks the npm registry via the registry-cache layer so check-package-age
  // reads from local fixtures instead of the real registry. Returns a restore function.
  function mockRegistry(publishDates) {
    const cache = new Map()
    setRegistryImpls({
      fs: {
        existsSync: () => false,
        mkdirSync: () => {},
        readFileSync: () => {
          throw new Error('not found')
        },
        writeFileSync: () => {},
        readdirSync: () => [],
        unlinkSync: () => {},
      },
      fetchJson: async (url) => {
        const name = registryUrlToName(url)
        const key = name
        if (cache.has(key)) {
          return cache.get(key)
        }
        const versions = publishDates[name] || {}
        const time = Object.fromEntries(
          Object.entries(versions).map(([version, daysAgo]) => [
            version,
            new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString(),
          ]),
        )
        const data = { time }
        cache.set(key, data)
        return data
      },
    })
    return () => resetRegistryImpls()
  }

  test('default mode reads all dependency types from package.json', async () => {
    const restore = mockRegistry({
      prod: { '1.0.0': 10 },
      dev: { '2.0.0': 10 },
      peer: { '3.0.0': 10 },
      optional: { '4.0.0': 10 },
    })

    try {
      await main({
        pkg: {
          name: 'test-project',
          version: '1.0.0',
          dependencies: { prod: '1.0.0' },
          devDependencies: { dev: '2.0.0' },
          peerDependencies: { peer: '3.0.0' },
          optionalDependencies: { optional: '4.0.0' },
        },
      })
    } finally {
      restore()
    }
  })

  test('--transitive mode reads resolved versions from package-lock.json', async () => {
    const restore = mockRegistry({
      lodash: { '4.17.21': 10 },
      'is-odd': { '3.0.1': 10 },
    })

    try {
      await main({
        argv: ['--transitive'],
        pkg: { name: 'test-project', version: '1.0.0' },
        lock: {
          name: 'test-project',
          lockfileVersion: 3,
          requires: true,
          packages: {
            '': {
              name: 'test-project',
              version: '1.0.0',
              dependencies: { lodash: '4.17.21' },
            },
            'node_modules/lodash': { version: '4.17.21' },
            'node_modules/is-odd': { version: '3.0.1' },
          },
        },
      })
    } finally {
      restore()
    }
  })

  test('respects custom minAgeDays from package.json', async () => {
    const restore = mockRegistry({
      recent: { '1.0.0': 3 },
      old: { '2.0.0': 30 },
    })

    let exitCode = null
    const exitFn = (code) => {
      exitCode = code
      throw new Error('EXIT_CALLED')
    }

    try {
      await main({
        pkg: {
          name: 'test-project',
          version: '1.0.0',
          pkgAgeCheck: { minAgeDays: 5 },
          dependencies: { recent: '1.0.0', old: '2.0.0' },
        },
        exitFn,
      })
    } catch (err) {
      if (err.message !== 'EXIT_CALLED') throw err
    } finally {
      restore()
    }

    assert.equal(exitCode, 1)
  })

  test('reports registry lookup errors and exits 1', async () => {
    const restore = mockRegistry({})

    let exitCode = null
    const exitFn = (code) => {
      exitCode = code
      throw new Error('EXIT_CALLED')
    }

    try {
      await main({
        pkg: {
          name: 'test-project',
          version: '1.0.0',
          dependencies: { missing: '1.0.0' },
        },
        exitFn,
      })
    } catch (err) {
      if (err.message !== 'EXIT_CALLED') throw err
    } finally {
      restore()
    }

    assert.equal(exitCode, 1)
  })

  test('buildDeps returns merged dependency types by default', () => {
    const result = buildDeps({
      transitive: false,
      pkgArg: null,
      pkg: {
        dependencies: { a: '1.0.0' },
        devDependencies: { b: '2.0.0' },
        peerDependencies: { c: '3.0.0' },
        optionalDependencies: { d: '4.0.0' },
      },
    })
    assert.deepEqual(result, { a: '1.0.0', b: '2.0.0', c: '3.0.0', d: '4.0.0' })
  })

  test('buildDeps returns single package for --pkg mode', () => {
    const result = buildDeps({
      transitive: false,
      pkgArg: 'lodash@4.17.21',
      pkg: {},
    })
    assert.deepEqual(result, { lodash: '4.17.21' })
  })

  test('buildDeps returns lockfile packages for --transitive mode', () => {
    const result = buildDeps({
      transitive: true,
      pkgArg: null,
      pkg: {},
      lock: {
        packages: {
          '': {},
          'node_modules/lodash': { version: '4.17.21' },
          'node_modules/is-odd': { version: '3.0.1' },
          'node_modules/cliui/node_modules/string-width': { version: '4.2.3' },
          'node_modules/@scope/bar': { version: '2.0.0' },
        },
      },
    })
    assert.deepEqual(result, {
      lodash: '4.17.21',
      'is-odd': '3.0.1',
      'string-width': '4.2.3',
      '@scope/bar': '2.0.0',
    })
  })
})

// ---------------------------------------------------------------------------
// Integration — add-package flow with mocked dependencies
// ---------------------------------------------------------------------------

describe('Integration — add-package flow', () => {
  function mockFetchPackageAge(ageDays) {
    const checkPackageAge = require(
      path.resolve(__dirname, './check-package-age.js'),
    )
    const original = checkPackageAge.fetchPackageAge
    checkPackageAge.fetchPackageAge = async (name, version) => ({
      name,
      version,
      ageDays,
      published: new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000),
    })
    return original
  }

  function mockFetchRegistryJsonForIntegrity(integrity) {
    return async () => ({
      dist: { integrity: integrity ?? 'sha512-abc' },
    })
  }

  function mockFsForIntegrity(integrity, pkgName = null) {
    return {
      readFileSync: (filePath, _encoding) => {
        if (filePath.endsWith('package-lock.json')) {
          return JSON.stringify({
            packages: {
              [`node_modules/${pkgName ?? (integrity ? 'lodash' : 'react-native-svg')}`]:
                {
                  integrity: integrity ?? 'sha512-abc',
                },
            },
          })
        }
        throw new Error(`ENOENT: ${filePath}`)
      },
    }
  }

  test('dry-run approves an old enough package without installing', async () => {
    const originalFetch = mockFetchPackageAge(10)
    const argv = ['lodash@4.17.21', '--dry-run']
    let exitCode = null
    const exitFn = (code) => {
      exitCode = code
      throw new Error('EXIT_CALLED')
    }

    setFetchRegistryJsonImpl(mockFetchRegistryJsonForIntegrity())
    setFsImpl(mockFsForIntegrity())

    try {
      validateArgs(argv)
      await addPackageMain(argv, exitFn)
    } catch (err) {
      if (err.message !== 'EXIT_CALLED') throw err
    } finally {
      const checkPackageAge = require(
        path.resolve(__dirname, './check-package-age.js'),
      )
      checkPackageAge.fetchPackageAge = originalFetch
      resetFetchRegistryJsonImpl()
      resetFsImpl()
    }

    assert.equal(exitCode, 0)
  })

  test('dry-run blocks a package younger than MIN_AGE_DAYS', async () => {
    const originalFetch = mockFetchPackageAge(1)
    const argv = ['recent-pkg@1.0.0', '--dry-run']
    let exitCode = null
    const exitFn = (code) => {
      exitCode = code
      throw new Error('EXIT_CALLED')
    }

    try {
      validateArgs(argv)
      await addPackageMain(argv, exitFn)
    } catch (err) {
      if (err.message !== 'EXIT_CALLED') throw err
    } finally {
      const checkPackageAge = require(
        path.resolve(__dirname, './check-package-age.js'),
      )
      checkPackageAge.fetchPackageAge = originalFetch
    }

    assert.equal(exitCode, 1)
  })

  test('installs production dependency with correct spawn arguments', async () => {
    const originalFetch = mockFetchPackageAge(10)
    setFetchRegistryJsonImpl(mockFetchRegistryJsonForIntegrity('sha512-good'))
    setFsImpl(mockFsForIntegrity('sha512-good'))
    const calls = []
    setSpawnSyncImpl((_cmd, args, _opts) => {
      calls.push(args)
      return { status: 0 }
    })

    const argv = ['lodash@4.17.21']
    let exitCode = null
    const exitFn = (code) => {
      exitCode = code
      throw new Error('EXIT_CALLED')
    }

    try {
      validateArgs(argv)
      await addPackageMain(argv, exitFn)
    } catch (err) {
      if (err.message !== 'EXIT_CALLED') throw err
    } finally {
      const checkPackageAge = require(
        path.resolve(__dirname, './check-package-age.js'),
      )
      checkPackageAge.fetchPackageAge = originalFetch
      resetSpawnSyncImpl()
      resetFetchRegistryJsonImpl()
      resetFsImpl()
    }

    assert.equal(exitCode, 0)
    assert.equal(calls.length, 4)
    assert.deepEqual(calls[0], [
      'install',
      '--save',
      '--save-exact',
      'lodash@4.17.21',
    ])
    assert.deepEqual(calls[1], ['audit', 'signatures'])
    assert.deepEqual(calls[2], ['audit', '--audit-level=high'])
    assert.deepEqual(calls[3], [
      'run',
      'defence:pkg-age-check',
      '--',
      '--transitive',
    ])
  })

  test('installs dev dependency with --save-dev flag', async () => {
    const originalFetch = mockFetchPackageAge(10)
    setFetchRegistryJsonImpl(mockFetchRegistryJsonForIntegrity())
    setFsImpl(mockFsForIntegrity(null, '@biomejs/biome'))
    const calls = []
    setSpawnSyncImpl((_cmd, args, _opts) => {
      calls.push(args)
      return { status: 0 }
    })

    const argv = ['@biomejs/biome@2.5.8', '--dev']
    let exitCode = null
    const exitFn = (code) => {
      exitCode = code
      throw new Error('EXIT_CALLED')
    }

    try {
      validateArgs(argv)
      await addPackageMain(argv, exitFn)
    } catch (err) {
      if (err.message !== 'EXIT_CALLED') throw err
    } finally {
      const checkPackageAge = require(
        path.resolve(__dirname, './check-package-age.js'),
      )
      checkPackageAge.fetchPackageAge = originalFetch
      resetSpawnSyncImpl()
      resetFetchRegistryJsonImpl()
      resetFsImpl()
    }

    assert.equal(exitCode, 0)
    assert.deepEqual(calls[0], [
      'install',
      '--save-dev',
      '--save-exact',
      '@biomejs/biome@2.5.8',
    ])
  })

  test('installs peer dependency with --save-peer flag', async () => {
    const originalFetch = mockFetchPackageAge(10)
    setFetchRegistryJsonImpl(mockFetchRegistryJsonForIntegrity())
    setFsImpl(mockFsForIntegrity(null, 'react-native-svg'))
    const calls = []
    setSpawnSyncImpl((_cmd, args, _opts) => {
      calls.push(args)
      return { status: 0 }
    })

    const argv = ['react-native-svg@12.0.0', '--peer']
    let exitCode = null
    const exitFn = (code) => {
      exitCode = code
      throw new Error('EXIT_CALLED')
    }

    try {
      validateArgs(argv)
      await addPackageMain(argv, exitFn)
    } catch (err) {
      if (err.message !== 'EXIT_CALLED') throw err
    } finally {
      const checkPackageAge = require(
        path.resolve(__dirname, './check-package-age.js'),
      )
      checkPackageAge.fetchPackageAge = originalFetch
      resetSpawnSyncImpl()
      resetFetchRegistryJsonImpl()
      resetFsImpl()
    }

    assert.equal(exitCode, 0)
    assert.deepEqual(calls[0], [
      'install',
      '--save-peer',
      '--save-exact',
      'react-native-svg@12.0.0',
    ])
  })

  test('installation failure exits with code 1', async () => {
    const originalFetch = mockFetchPackageAge(10)
    setFetchRegistryJsonImpl(mockFetchRegistryJsonForIntegrity())
    setFsImpl(mockFsForIntegrity())
    setSpawnSyncImpl((_cmd, _args, _opts) => ({ status: 1 }))

    const argv = ['lodash@4.17.21']
    let exitCode = null
    const exitFn = (code) => {
      exitCode = code
      throw new Error('EXIT_CALLED')
    }

    try {
      validateArgs(argv)
      await addPackageMain(argv, exitFn)
    } catch (err) {
      if (err.message !== 'EXIT_CALLED') throw err
    } finally {
      const checkPackageAge = require(
        path.resolve(__dirname, './check-package-age.js'),
      )
      checkPackageAge.fetchPackageAge = originalFetch
      resetSpawnSyncImpl()
      resetFetchRegistryJsonImpl()
      resetFsImpl()
    }

    assert.equal(exitCode, 1)
  })
})

describe('CLI subprocess', () => {
  test('check-package-age CLI exits 0 with no arguments', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
  })

  test('add-package CLI prints help with no arguments', () => {
    const addPackagePath = path.resolve(__dirname, './add-package.js')
    const result = spawnSync(process.execPath, [addPackagePath], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 1)
  })
})
