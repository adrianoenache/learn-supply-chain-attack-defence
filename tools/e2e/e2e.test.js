'use strict'

// End-to-end tests against the real npm registry.
//
// These tests are opt-in and skipped by default because they require network
// access to registry.npmjs.org. Run them with:
//
//   npm run test:e2e
//
// or manually:
//
//   RUN_E2E_TESTS=true node --test tools/e2e/*.test.js
//
// Safety guards against infinite loops and network hangs:
// - Each test has a per-test timeout.
// - Tool invocations use spawnSync with an explicit timeout.
// - Registry requests use AbortSignal.timeout / built-in https timeout.
// - No automatic retries are performed.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const { runTool } = require(path.resolve(__dirname, './helpers/run-tool.js'))
const {
  fetchPackageDocument,
  fetchFromRegistry,
  readCache,
  writeCache,
  cachePath,
} = require(path.resolve(__dirname, './helpers/registry-cache.js'))
const { STABLE_PACKAGES } = require(
  path.resolve(__dirname, './fixtures/stable-packages.js'),
)

if (process.env.RUN_E2E_TESTS !== 'true') {
  test('E2E tests skipped by default (set RUN_E2E_TESTS=true to run)', {
    skip: true,
  }, () => {})
  process.exit(0)
}

const CHECK_PKG_AGE_SCRIPT = 'tools/check-package-age.js'
const ADD_PACKAGE_SCRIPT = 'tools/add-package.js'

// ---------------------------------------------------------------------------
// Registry cache helper
// ---------------------------------------------------------------------------

describe('registry-cache helper', { timeout: 30000 }, () => {
  const { name, version } = STABLE_PACKAGES[0]

  test('fetches a package document from the real registry', async () => {
    const doc = await fetchFromRegistry(name)
    assert.ok(doc, 'expected a package document')
    assert.ok(doc.time, 'expected document to include time field')
    assert.ok(doc.time[version], `expected publish date for ${name}@${version}`)
  })

  test('stores and reuses cached registry responses', async () => {
    // Ensure a clean state for this test.
    writeCache(name, version, { cached: false })

    if (process.env.E2E_NO_CACHE === 'true') {
      // When bypass is active readCache returns null, so read the file directly
      // to prove the entry was persisted.
      const entry = JSON.parse(
        fs.readFileSync(cachePath(name, version), 'utf8'),
      )
      assert.deepEqual(entry.data, { cached: false })
      assert.ok(entry.timestamp, 'expected cache entry to include a timestamp')
      return
    }

    const firstRead = readCache(name, version)
    assert.deepEqual(firstRead, { cached: false })

    const freshDoc = await fetchFromRegistry(name)
    writeCache(name, version, freshDoc)

    const cachedDoc = readCache(name, version)
    assert.deepEqual(cachedDoc, freshDoc)
  })

  test('fetchPackageDocument returns cached data on second call', async () => {
    const freshDoc = await fetchPackageDocument(name, version)

    if (process.env.E2E_NO_CACHE === 'true') {
      // With cache bypassed, no local entry is written.
      assert.equal(readCache(name, version), null)
      assert.ok(freshDoc.time, 'expected a fresh document from registry')
      return
    }

    const cachedDoc = readCache(name, version)
    assert.deepEqual(cachedDoc, freshDoc)
  })
})

// ---------------------------------------------------------------------------
// check-package-age.js end-to-end
// ---------------------------------------------------------------------------

describe('check-package-age end-to-end', { timeout: 30000 }, () => {
  for (const pkg of STABLE_PACKAGES) {
    test(`accepts old package ${pkg.name}@${pkg.version}`, () => {
      const result = runTool(CHECK_PKG_AGE_SCRIPT, [
        '--pkg',
        `${pkg.name}@${pkg.version}`,
      ])
      assert.equal(
        result.status,
        0,
        `expected exit 0, got ${result.status}. stderr: ${result.stderr}`,
      )
      assert.ok(
        result.stdout.includes(pkg.name) || result.stderr.includes(pkg.name),
        `expected output to mention ${pkg.name}`,
      )
    })
  }

  test('rejects a package that does not exist', () => {
    const result = runTool(CHECK_PKG_AGE_SCRIPT, [
      '--pkg',
      'this-package-should-not-exist-e2e@1.0.0',
    ])
    assert.notEqual(
      result.status,
      0,
      'expected non-zero exit for missing package',
    )
  })

  test('rejects invalid --pkg and --transitive combination', () => {
    const result = runTool(CHECK_PKG_AGE_SCRIPT, [
      '--pkg',
      'lodash@4.17.21',
      '--transitive',
    ])
    assert.notEqual(result.status, 0, 'expected non-zero exit for invalid args')
  })
})

// ---------------------------------------------------------------------------
// add-package.js end-to-end
// ---------------------------------------------------------------------------

describe('add-package end-to-end', { timeout: 30000 }, () => {
  const { name, version } = STABLE_PACKAGES[0]

  test(`dry-run accepts old package ${name}@${version}`, () => {
    const result = runTool(ADD_PACKAGE_SCRIPT, [
      `${name}@${version}`,
      '--dry-run',
    ])
    assert.equal(
      result.status,
      0,
      `expected exit 0, got ${result.status}. stderr: ${result.stderr}`,
    )
    assert.ok(
      result.stdout.includes('Dry-run'),
      'expected dry-run message in stdout',
    )
    assert.ok(
      !result.stdout.includes('Installing: npm install'),
      'dry-run should not invoke npm install',
    )
  })

  test('rejects adding a package without a version', () => {
    const result = runTool(ADD_PACKAGE_SCRIPT, ['lodash'])
    assert.notEqual(
      result.status,
      0,
      'expected non-zero exit for missing version',
    )
  })
})
