#!/usr/bin/env node
'use strict'

// Tests for generate-sbom.js.
// Uses node:test + node:assert/strict + native modules only.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const SCRIPT_PATH = path.resolve(__dirname, 'generate-sbom.js')

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

function makeMockFs(files) {
  return {
    existsSync: (p) => Object.hasOwn(files, p),
    readFileSync: (p, encoding) => {
      if (!Object.hasOwn(files, p)) {
        const err = new Error(`ENOENT: ${p}`)
        err.code = 'ENOENT'
        throw err
      }
      const content = files[p]
      return encoding === 'utf8' || encoding === undefined
        ? content
        : Buffer.from(content)
    },
    writeFileSync: (p, content) => {
      files[p] = content
    },
  }
}

function makeExitImpl() {
  let code = null
  const fn = (c) => {
    code = c
    throw new Error(`EXIT_CALLED:${c}`)
  }
  fn.getCode = () => code
  return fn
}

const SAMPLE_LOCK = JSON.stringify({
  name: 'demo-app',
  version: '1.0.0',
  lockfileVersion: 3,
  packages: {
    '': {
      name: 'demo-app',
      version: '1.0.0',
    },
    'node_modules/foo': {
      version: '1.2.3',
      resolved: 'https://registry.npmjs.org/foo/-/foo-1.2.3.tgz',
      integrity:
        'sha512-5eR4PRvXzJ/x6/p/z1R7tLr8q8Q0yZr5K2v5r0h8f5c3p8d5e7r4t1y2u3i4o5p6a7s8d9f0g1h2j3k4l5z6x7c8v9b0n1m2q3w4e5r6t7y8u9i0o1p2a3s4d5f6g7h8j9k0l',
    },
    'node_modules/@scope/bar': {
      version: '2.0.0',
      resolved: 'https://registry.npmjs.org/@scope/bar/-/bar-2.0.0.tgz',
      integrity: 'sha1-dB4/nETZ8tKGzMV9Jrn1hr6t1EC4=',
    },
  },
})

describe('generate-sbom', () => {
  test('generateSbom produces CycloneDX structure', () => {
    const mod = readScriptExports()
    mod.setFsImpl(makeMockFs({ '/lock.json': SAMPLE_LOCK }))
    try {
      const bom = mod.generateSbom('/lock.json')
      assert.equal(bom.bomFormat, 'CycloneDX')
      assert.equal(bom.specVersion, '1.4')
      assert.equal(bom.version, 1)
      assert.ok(bom.serialNumber.startsWith('urn:uuid:'))
      assert.equal(bom.metadata.component.name, 'demo-app')
      assert.equal(bom.metadata.component.version, '1.0.0')
      assert.equal(bom.components.length, 2)

      const foo = bom.components.find((c) => c.name === 'foo')
      assert.ok(foo)
      assert.equal(foo.version, '1.2.3')
      assert.equal(foo.purl, 'pkg:npm/foo@1.2.3')
      assert.ok(Array.isArray(foo.hashes))
      assert.equal(foo.hashes[0].alg, 'SHA-512')
      assert.ok(foo.externalReferences.some((r) => r.type === 'distribution'))

      const bar = bom.components.find((c) => c.name === '@scope/bar')
      assert.ok(bar)
      assert.equal(bar.version, '2.0.0')
      assert.equal(bar.purl, 'pkg:npm/@scope/bar@2.0.0')
      assert.equal(bar.hashes[0].alg, 'SHA-1')
    } finally {
      mod.resetFsImpl()
    }
  })

  test('parseIntegrity returns empty for missing or invalid values', () => {
    const mod = readScriptExports()
    assert.deepEqual(mod.parseIntegrity(''), [])
    assert.deepEqual(mod.parseIntegrity(null), [])
    assert.deepEqual(mod.parseIntegrity('unknown-abc123'), [])
  })

  test('parseIntegrity handles multiple spaces', () => {
    const mod = readScriptExports()
    const b64 = Buffer.from('hello', 'utf8').toString('base64')
    const hashes = mod.parseIntegrity(`sha256-${b64}`)
    assert.equal(hashes.length, 1)
    assert.equal(hashes[0].alg, 'SHA-256')
    assert.equal(hashes[0].content, '68656c6c6f')
  })

  test('packageNameFromPath extracts name', () => {
    const mod = readScriptExports()
    assert.equal(mod.packageNameFromPath('node_modules/lodash'), 'lodash')
    assert.equal(
      mod.packageNameFromPath('node_modules/@types/node'),
      '@types/node',
    )
    assert.equal(mod.packageNameFromPath(''), null)
    assert.equal(mod.packageNameFromPath('packages/foo'), null)
  })

  test('main writes SBOM to output file', () => {
    const mod = readScriptExports()
    const files = { '/lock.json': SAMPLE_LOCK }
    const exitFn = makeExitImpl()
    const logs = []

    mod.setFsImpl(makeMockFs(files))
    mod.setExitImpl(exitFn)
    mod.setConsoleImpl({ log: (line) => logs.push(line), error: () => {} })

    try {
      mod.main(['--output=/tmp/sbom.json'], '/lock.json')
      assert.fail('expected exit')
    } catch (_err) {
      assert.equal(exitFn.getCode(), 0)
      assert.ok(files['/tmp/sbom.json'])
      const bom = JSON.parse(files['/tmp/sbom.json'])
      assert.equal(bom.bomFormat, 'CycloneDX')
      assert.ok(logs.some((line) => line.includes('/tmp/sbom.json')))
    } finally {
      mod.resetFsImpl()
      mod.resetExitImpl()
      mod.resetConsoleImpl()
    }
  })

  test('main exits 1 when lockfile is malformed', () => {
    const mod = readScriptExports()
    const exitFn = makeExitImpl()
    mod.setFsImpl(makeMockFs({ '/lock.json': 'not json' }))
    mod.setExitImpl(exitFn)
    mod.setConsoleImpl({ log: () => {}, error: () => {} })

    try {
      mod.main([], '/lock.json')
      assert.fail('expected exit')
    } catch (_err) {
      assert.equal(exitFn.getCode(), 1)
    } finally {
      mod.resetFsImpl()
      mod.resetExitImpl()
      mod.resetConsoleImpl()
    }
  })

  test('CLI generates SBOM', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      encoding: 'utf8',
      maxBuffer: 1024 * 1024,
    })
    assert.equal(result.status, 0)
    const bom = JSON.parse(result.stdout)
    assert.equal(bom.bomFormat, 'CycloneDX')
    assert.ok(Array.isArray(bom.components))
  })
})
