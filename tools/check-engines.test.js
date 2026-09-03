#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const SCRIPT_PATH = path.resolve(__dirname, './check-engines.js')
const PROJECT_ROOT = path.resolve(__dirname, '..')
const { engines: projectEngines } = require(
  path.join(PROJECT_ROOT, 'package.json'),
)

let captured = { logs: [], errors: [] }
let exitCode = null

// Read project engine requirements from package.json so tests stay in sync
// with the real configuration. Hardcoded fixtures below (e.g. '>=99.0.0')
// are intentionally fixed boundary values used to exercise failure paths.
const sampleNodeRange = projectEngines.node
const sampleNpmRange = projectEngines.npm
const sampleNpmVersion = projectEngines.npm.replace(/^>=/, '')

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

function setImpls(script, impls) {
  script.setImpls({
    loadConfig:
      impls.loadConfig || (() => ({ engines: impls.pkg?.engines || {} })),
    spawnSync:
      impls.spawnSync ||
      (() => ({ status: 0, stdout: `${sampleNpmVersion}\n` })),
    exit: (code) => {
      exitCode = code
      throw new Error(`exit:${code}`)
    },
    log: (...args) => captured.logs.push(args.join(' ')),
    error: (...args) => captured.errors.push(args.join(' ')),
  })
}

function resetImpls() {
  const script = readScriptExports()
  script.resetImpls()
  captured = { logs: [], errors: [] }
  exitCode = null
}

describe('check-engines', () => {
  beforeEach(() => {
    captured = { logs: [], errors: [] }
    exitCode = null
  })

  afterEach(() => {
    resetImpls()
  })

  test('satisfies helper supports >=, >, =, <=, <, ~ and ^', () => {
    const { satisfies } = readScriptExports()
    const nodeTarget = sampleNodeRange.replace(/^>=/, '')
    const npmTarget = sampleNpmRange.replace(/^>=/, '')
    assert.equal(satisfies(nodeTarget, `>=${nodeTarget}`), true)
    assert.equal(satisfies('24.18.9', `>=${nodeTarget}`), false)
    assert.equal(satisfies('24.20.0', `>${nodeTarget}`), true)
    assert.equal(satisfies(nodeTarget, `>${nodeTarget}`), false)
    assert.equal(satisfies(npmTarget, `=${npmTarget}`), true)
    assert.equal(satisfies('11.17.1', `=${npmTarget}`), false)
    assert.equal(satisfies('11.16.0', `<=${npmTarget}`), true)
    assert.equal(satisfies('11.18.0', `<=${npmTarget}`), false)
    assert.equal(satisfies('11.16.0', `<${npmTarget}`), true)
    assert.equal(satisfies(npmTarget, `<${npmTarget}`), false)
    assert.equal(satisfies('11.17.5', `~${npmTarget}`), true)
    assert.equal(satisfies('11.18.0', `~${npmTarget}`), false)
    assert.equal(satisfies('11.17.5', `^${npmTarget}`), true)
    assert.equal(satisfies('12.0.0', `^${npmTarget}`), false)
  })

  // Intentionally hardcoded boundary values: they exercise the range parser
  // against an unsupported "x" wildcard pattern without depending on config.

  test('passes when node and npm satisfy engines', () => {
    const script = readScriptExports()
    setImpls(script, {
      pkg: {
        engines: { node: sampleNodeRange, npm: sampleNpmRange },
      },
      spawnSync: () => ({ status: 0, stdout: `${sampleNpmVersion}\n` }),
    })
    assert.throws(() => script.main(), /exit:0/)
    assert.equal(exitCode, 0)
    assert.ok(
      captured.logs.some((line) =>
        line.includes('Engine requirements satisfied.'),
      ),
    )
  })

  test('fails when node is below required version', () => {
    const script = readScriptExports()
    setImpls(script, {
      pkg: {
        engines: { node: '>=99.0.0', npm: sampleNpmRange },
      },
      spawnSync: () => ({ status: 0, stdout: `${sampleNpmVersion}\n` }),
    })
    assert.throws(() => script.main(), /exit:1/)
    assert.equal(exitCode, 1)
    assert.ok(
      captured.errors.some(
        (line) => line.includes('Node.js') && line.includes('does not satisfy'),
      ),
    )
  })

  test('fails when npm is below required version', () => {
    const script = readScriptExports()
    setImpls(script, {
      pkg: {
        engines: { node: sampleNodeRange, npm: '>=99.0.0' },
      },
      spawnSync: () => ({ status: 0, stdout: `${sampleNpmVersion}\n` }),
    })
    assert.throws(() => script.main(), /exit:1/)
    assert.equal(exitCode, 1)
    assert.ok(
      captured.errors.some(
        (line) => line.includes('npm') && line.includes('does not satisfy'),
      ),
    )
  })

  test('fails when both node and npm are below required versions', () => {
    const script = readScriptExports()
    setImpls(script, {
      pkg: {
        engines: { node: '>=99.0.0', npm: '>=99.0.0' },
      },
      spawnSync: () => ({ status: 0, stdout: `${sampleNpmVersion}\n` }),
    })
    assert.throws(() => script.main(), /exit:1/)
    assert.equal(exitCode, 1)
    assert.ok(
      captured.errors.some(
        (line) => line.includes('Node.js') && line.includes('does not satisfy'),
      ),
    )
    assert.ok(
      captured.errors.some(
        (line) => line.includes('npm') && line.includes('does not satisfy'),
      ),
    )
  })

  test('throws when engines field is missing', () => {
    const script = readScriptExports()
    setImpls(script, {
      pkg: {},
      spawnSync: () => ({ status: 0, stdout: `${sampleNpmVersion}\n` }),
    })
    assert.throws(() => script.main(), /Missing engines\.node or engines\.npm/)
  })

  test('throws when npm version cannot be determined', () => {
    const script = readScriptExports()
    setImpls(script, {
      pkg: {
        engines: { node: sampleNodeRange, npm: sampleNpmRange },
      },
      spawnSync: () => ({ status: 1, stdout: '', stderr: 'not found' }),
    })
    assert.throws(() => script.main(), /Unable to determine npm version/)
  })

  test('throws on unsupported engine range', () => {
    const { satisfies } = readScriptExports()
    // '24.x' is intentionally hardcoded: it tests wildcard rejection, not config drift.
    assert.throws(
      () => satisfies(sampleNodeRange.replace(/^>=/, ''), '24.x'),
      /Unsupported engine range/,
    )
  })

  test('CLI exits 0 when engines satisfy', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
  })
})
