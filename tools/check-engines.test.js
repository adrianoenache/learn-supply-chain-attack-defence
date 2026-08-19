#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, './check-engines.js')

let captured = { logs: [], errors: [] }
let exitCode = null
const fsState = {}
const npmVersion = '11.17.0'

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

function setImpls(impls) {
  const script = readScriptExports()
  script.setImpls({
    fs: impls.fs || {
      readFileSync: (filePath, _encoding) => {
        if (filePath.endsWith('package.json')) {
          return JSON.stringify(impls.pkg || {})
        }
        return fsState[filePath]
      },
    },
    spawnSync:
      impls.spawnSync || (() => ({ status: 0, stdout: `${npmVersion}\n` })),
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
    assert.equal(satisfies('24.19.0', '>=24.19.0'), true)
    assert.equal(satisfies('24.18.9', '>=24.19.0'), false)
    assert.equal(satisfies('24.20.0', '>24.19.0'), true)
    assert.equal(satisfies('24.19.0', '>24.19.0'), false)
    assert.equal(satisfies('11.17.0', '=11.17.0'), true)
    assert.equal(satisfies('11.17.1', '=11.17.0'), false)
    assert.equal(satisfies('11.16.0', '<=11.17.0'), true)
    assert.equal(satisfies('11.18.0', '<=11.17.0'), false)
    assert.equal(satisfies('11.16.0', '<11.17.0'), true)
    assert.equal(satisfies('11.17.0', '<11.17.0'), false)
    assert.equal(satisfies('11.17.5', '~11.17.0'), true)
    assert.equal(satisfies('11.18.0', '~11.17.0'), false)
    assert.equal(satisfies('11.17.5', '^11.17.0'), true)
    assert.equal(satisfies('12.0.0', '^11.17.0'), false)
  })

  test('passes when node and npm satisfy engines', () => {
    const script = readScriptExports()
    setImpls({
      pkg: {
        engines: { node: '>=24.19.0', npm: '>=11.17.0' },
      },
      spawnSync: () => ({ status: 0, stdout: '11.17.0\n' }),
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
    setImpls({
      pkg: {
        engines: { node: '>=99.0.0', npm: '>=11.17.0' },
      },
      spawnSync: () => ({ status: 0, stdout: '11.17.0\n' }),
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
    setImpls({
      pkg: {
        engines: { node: '>=24.19.0', npm: '>=99.0.0' },
      },
      spawnSync: () => ({ status: 0, stdout: '11.17.0\n' }),
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
    setImpls({
      pkg: {
        engines: { node: '>=99.0.0', npm: '>=99.0.0' },
      },
      spawnSync: () => ({ status: 0, stdout: '11.17.0\n' }),
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
    setImpls({
      pkg: {},
      spawnSync: () => ({ status: 0, stdout: '11.17.0\n' }),
    })
    assert.throws(() => script.main(), /Missing engines\.node or engines\.npm/)
  })

  test('throws when npm version cannot be determined', () => {
    const script = readScriptExports()
    setImpls({
      pkg: {
        engines: { node: '>=24.19.0', npm: '>=11.17.0' },
      },
      spawnSync: () => ({ status: 1, stdout: '', stderr: 'not found' }),
    })
    assert.throws(() => script.main(), /Unable to determine npm version/)
  })

  test('throws on unsupported engine range', () => {
    const { satisfies } = readScriptExports()
    assert.throws(
      () => satisfies('24.19.0', '24.x'),
      /Unsupported engine range/,
    )
  })
})
