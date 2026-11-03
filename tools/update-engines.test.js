#!/usr/bin/env node
'use strict'

// Tests for update-engines.js (Fase L.1).
// Network and filesystem are injected: dist index fixtures replace the
// nodejs.org fetch, and readFile/writeFile are captured in memory so the
// surgical edits can be asserted byte-for-byte.

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, './update-engines.js')

// Minimal dist index fixture, newest first (as nodejs.org serves it).
// The versions are intentionally fictional-but-plausible so the tests do
// not couple to the real release calendar.
const DIST_INDEX = [
  { version: 'v26.13.0', lts: 'Lithium', npm: '11.20.0' },
  { version: 'v26.12.1', lts: false, npm: '11.19.2' },
  { version: 'v24.22.2', lts: 'Krypton', npm: '11.19.1' },
  { version: 'v24.22.1', lts: 'Krypton', npm: '11.19.0' },
  { version: 'v24.19.0', lts: 'Krypton', npm: '11.17.0' },
  { version: 'v22.23.4', lts: 'Jod', npm: '10.9.7' },
]

const PKG_FIXTURE = `{
  "name": "fixture",
  "engines": {
    "node": ">=24.19.0",
    "npm": ">=11.17.0"
  },
  "keywords": ["keep", "compact", "arrays"]
}
`

const LOCK_FIXTURE = `{
  "name": "fixture",
  "packages": {
    "": {
      "name": "fixture",
      "engines": {
        "node": ">=24.19.0",
        "npm": ">=11.17.0"
      }
    },
    "node_modules/some-dep": {
      "version": "1.0.0",
      "engines": {
        "node": ">=24.19.0"
      }
    }
  }
}
`

let script
let files
let written
let logs
let errors
let exitCode
let fetchError = null

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

beforeEach(() => {
  script = readScriptExports()
  files = new Map([
    [path.resolve(__dirname, '../package.json'), PKG_FIXTURE],
    [path.resolve(__dirname, '../package-lock.json'), LOCK_FIXTURE],
    [path.resolve(__dirname, '../.nvmrc'), '24.19.0\n'],
  ])
  written = new Map()
  logs = []
  errors = []
  exitCode = null
  fetchError = null

  script.setImpls({
    fetchJson: async () => {
      if (fetchError) throw fetchError
      return DIST_INDEX
    },
    readFile: (p) => {
      if (!files.has(p)) throw new Error(`unexpected read of ${p}`)
      return files.get(p)
    },
    writeFile: (p, c) => written.set(p, c),
    exit: (code) => {
      exitCode = code
    },
    log: (...args) => logs.push(args.join(' ')),
    error: (...args) => errors.push(args.join(' ')),
  })
})

afterEach(() => {
  script.resetImpls()
})

describe('update-engines CLI parsing', () => {
  test('defaults to report mode', () => {
    const args = script.parseCliArgs([])
    assert.equal(args.mode, 'report')
    assert.equal(args.format, 'text')
  })

  test('rejects conflicting modes', () => {
    assert.throws(() => script.parseCliArgs(['--update', '--upgrade']))
    assert.throws(() => script.parseCliArgs(['--update', '--to', '26.13.0']))
  })

  test('rejects --to without a version', () => {
    assert.throws(() => script.parseCliArgs(['--to']))
  })
})

describe('update-engines target resolution', () => {
  test('computeTargets finds latest in-major and latest LTS with bundled npm', () => {
    const { latestInMajor, latestLts } = script.computeTargets(
      DIST_INDEX,
      '24.19.0',
    )
    assert.equal(latestInMajor.version, '24.22.2')
    assert.equal(latestInMajor.npm, '11.19.1')
    assert.equal(latestLts.version, '26.13.0')
    assert.equal(latestLts.npm, '11.20.0')
    assert.equal(latestLts.lts, 'Lithium')
  })

  test('report mode prints availability and exits 0', async () => {
    await script.main([])
    assert.equal(exitCode, 0)
    assert.ok(
      logs.some((l) => l.includes('24.22.2') && l.includes('AVAILABLE')),
    )
    assert.ok(logs.some((l) => l.includes('26.13.0') && l.includes('Lithium')))
  })

  test('report mode --format json prints machine-readable report', async () => {
    await script.main(['--format', 'json'])
    assert.equal(exitCode, 0)
    const report = JSON.parse(logs.join('\n'))
    assert.equal(report.current.node, '24.19.0')
    assert.equal(report.update.version, '24.22.2')
    assert.equal(report.upgrade.version, '26.13.0')
  })

  test('--silent suppresses the human report', async () => {
    await script.main(['--silent'])
    assert.equal(exitCode, 0)
    assert.equal(logs.length, 0)
  })
})

describe('update-engines apply modes', () => {
  test('--update applies the latest in-major target surgically', async () => {
    await script.main(['--update'])
    assert.equal(exitCode, 0)

    const pkg = written.get(path.resolve(__dirname, '../package.json'))
    assert.ok(pkg.includes('"node": ">=24.22.2"'))
    assert.ok(pkg.includes('"npm": ">=11.19.1"'))
    // Formatting preservation: the compact array npm would otherwise expand
    // must stay byte-identical (lesson from npm rewriting JSON on install).
    assert.ok(pkg.includes('"keywords": ["keep", "compact", "arrays"]'))

    const lock = written.get(path.resolve(__dirname, '../package-lock.json'))
    assert.ok(lock.includes('"node": ">=24.22.2"'))
    // The dependency entry keeps its own floor — only the root is edited.
    const depEntry = lock.slice(lock.indexOf('node_modules/some-dep'))
    assert.ok(depEntry.includes('"node": ">=24.19.0"'))

    assert.equal(written.get(path.resolve(__dirname, '../.nvmrc')), '24.22.2\n')
    assert.ok(logs.some((l) => l.includes('nvm install 24.22.2')))
  })

  test('--upgrade applies the latest LTS major', async () => {
    await script.main(['--upgrade'])
    assert.equal(exitCode, 0)
    const pkg = written.get(path.resolve(__dirname, '../package.json'))
    assert.ok(pkg.includes('"node": ">=26.13.0"'))
    assert.ok(pkg.includes('"npm": ">=11.20.0"'))
  })

  test('--to applies an explicit published version', async () => {
    await script.main(['--to', '24.22.1'])
    assert.equal(exitCode, 0)
    const pkg = written.get(path.resolve(__dirname, '../package.json'))
    assert.ok(pkg.includes('"node": ">=24.22.1"'))
    assert.ok(pkg.includes('"npm": ">=11.19.0"'))
  })

  test('--to refuses a version absent from the dist index (CI would fail)', async () => {
    await script.main(['--to', '99.0.0'])
    assert.equal(exitCode, 1)
    assert.ok(errors.some((e) => e.includes('99.0.0')))
    assert.ok(errors.some((e) => e.includes('setup-node')))
    assert.equal(written.size, 0)
  })

  test('refuses downgrades', async () => {
    await script.main(['--to', '22.23.4'])
    assert.equal(exitCode, 1)
    assert.ok(errors.some((e) => e.includes('downgrade')))
    assert.equal(written.size, 0)
  })

  test('no-ops when already up to date', async () => {
    files.set(
      path.resolve(__dirname, '../package.json'),
      PKG_FIXTURE.replace('24.19.0', '24.22.2').replace('11.17.0', '11.19.1'),
    )
    await script.main(['--update'])
    assert.equal(exitCode, 0)
    assert.ok(logs.some((l) => l.includes('nothing to do')))
    assert.equal(written.size, 0)
  })

  test('--dry-run writes nothing', async () => {
    await script.main(['--update', '--dry-run'])
    assert.equal(exitCode, 0)
    assert.equal(written.size, 0)
    assert.ok(logs.some((l) => l.includes('[dry-run]')))
  })

  test('network failure exits 1 with an actionable message', async () => {
    fetchError = new Error('getaddrinfo ENOTFOUND nodejs.org')
    await script.main([])
    assert.equal(exitCode, 1)
    assert.ok(errors.some((e) => e.includes('actions/setup-node')))
  })
})

describe('update-engines surgical editors', () => {
  test('editPackageJson fails loudly when the engines block is missing', () => {
    assert.throws(() =>
      script.editPackageJson('{"name": "x"}', '1.2.3', '4.5.6'),
    )
  })

  test('editLockfile fails loudly when the root entry is missing', () => {
    assert.throws(() =>
      script.editLockfile('{"packages": {}}', '1.2.3', '4.5.6'),
    )
  })
})
