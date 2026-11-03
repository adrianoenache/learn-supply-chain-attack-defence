#!/usr/bin/env node
'use strict'

// Tests for check-dead-code.js (Fase AI-4.2).
// Filesystem is fully injected: an in-memory fixture tree exercises the
// export/consumer graph analysis without touching the real codebase.

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, './check-dead-code.js')
const TOOLS = path.resolve(__dirname)
const PKG = path.resolve(__dirname, '../package.json')

// Fixture tree: lib/used.js is consumed three ways; lib/partly.js has one
// dead export; lib/opaque.js is required for side effects; orphan.js is
// required by nobody; cli-entry.js is only an npm script target.
// Built fresh per test — the "clean tree" test mutates the map, and a shared
// fixture would leak that mutation into later tests.
function defaultFixtures() {
  return new Map([
    [
      `${TOOLS}/lib/used.js`,
      `'use strict'\nfunction a() {}\nfunction b() {}\nfunction c() {}\nmodule.exports = {\n  a,\n  b,\n  c,\n}\n`,
    ],
    [
      `${TOOLS}/lib/partly.js`,
      `'use strict'\nfunction alive() {}\nfunction dead() {}\nmodule.exports = {\n  alive,\n  dead,\n}\n`,
    ],
    [
      `${TOOLS}/lib/opaque.js`,
      `'use strict'\nmodule.exports = {\n  init,\n}\nfunction init() {}\n`,
    ],
    [
      `${TOOLS}/orphan.js`,
      `'use strict'\nmodule.exports = {\n  lonely,\n}\nfunction lonely() {}\n`,
    ],
    [
      `${TOOLS}/cli-entry.js`,
      `'use strict'\nfunction main() {}\nif (require.main === module) main()\nmodule.exports = {\n  main,\n}\n`,
    ],
    // Test files are legitimate consumers (the DI contract): cli-entry's
    // `main` is only referenced from its test, mirroring the real codebase.
    [
      `${TOOLS}/cli-entry.test.js`,
      `'use strict'\nconst { main } = require('./cli-entry.js')\nmodule.exports = {}\n`,
    ],
    // The dominant test-harness pattern in this codebase: an alias constant
    // plus a readScriptExports() indirection. Usage falls back to
    // word-presence per export name (alpha referenced, beta not).
    [
      `${TOOLS}/lib/harnessed.js`,
      `'use strict'\nmodule.exports = {\n  alpha,\n  beta,\n}\nfunction alpha() {}\nfunction beta() {}\n`,
    ],
    // Immediate member access on the require result — the pattern that
    // produced a false positive breaking 35 tests when first missed.
    [
      `${TOOLS}/lib/inline.js`,
      `'use strict'\nmodule.exports = {\n  inlineUsed,\n  inlineDead,\n}\nfunction inlineUsed() {}\nfunction inlineDead() {}\n`,
    ],
    [
      `${TOOLS}/harnessed.test.js`,
      [
        `'use strict'`,
        `const path = require('node:path')`,
        `const SCRIPT_PATH = path.resolve(__dirname, './lib/harnessed.js')`,
        `function readScriptExports() {`,
        `  delete require.cache[require.resolve(SCRIPT_PATH)]`,
        `  return require(SCRIPT_PATH)`,
        `}`,
        `const script = readScriptExports()`,
        `script.alpha()`,
      ].join('\n'),
    ],
    [
      `${TOOLS}/consumer.js`,
      [
        `'use strict'`,
        `const path = require('node:path')`,
        `const { a, b: renamed } = require('./lib/used.js')`,
        `const usedNs = require(`,
        `  path.resolve(__dirname, './lib/used.js'),`,
        `)`,
        `const { alive } = require('./lib/partly.js')`,
        `require('./lib/opaque.js')`,
        `require('./lib/inline.js').inlineUsed()`,
        `module.exports = { run: () => usedNs.c() }`,
      ].join('\n'),
    ],
    [
      PKG,
      JSON.stringify({
        scripts: { 'defence:cli': 'node ./tools/cli-entry.js' },
      }),
    ],
  ])
}

let script
let FIXTURES
let logs
let exitCode

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

beforeEach(() => {
  script = readScriptExports()
  FIXTURES = defaultFixtures()
  logs = []
  exitCode = null
  script.setImpls({
    readFile: (p) => {
      if (!FIXTURES.has(p)) throw new Error(`unexpected read of ${p}`)
      return FIXTURES.get(p)
    },
    listFiles: () =>
      [...FIXTURES.keys()].filter((p) => p.endsWith('.js') && p !== PKG),
    exit: (code) => {
      exitCode = code
    },
    log: (...args) => logs.push(args.join(' ')),
  })
})

afterEach(() => {
  script.resetImpls()
})

describe('check-dead-code analysis', () => {
  test('reports only the truly unreferenced export', () => {
    const { deadExports, orphanFiles } = script.analyze(
      [...FIXTURES.keys()].filter((p) => p.endsWith('.js')),
    )
    assert.deepEqual(deadExports, [
      {
        file: path.join('tools', 'lib', 'partly.js'),
        exports: ['dead'],
      },
      {
        file: path.join('tools', 'lib', 'harnessed.js'),
        exports: ['beta'],
      },
      {
        file: path.join('tools', 'lib', 'inline.js'),
        exports: ['inlineDead'],
      },
    ])
    assert.deepEqual(orphanFiles, ['tools/orphan.js'])
  })

  test('namespace member access counts as usage', () => {
    const { deadExports } = script.analyze(
      [...FIXTURES.keys()].filter((p) => p.endsWith('.js')),
    )
    // used.js export `c` is only referenced as usedNs.c() — must not appear.
    assert.ok(!deadExports.some((d) => d.file.includes('used.js')))
  })

  test('opaque requires conservatively mark all exports as used', () => {
    const { deadExports } = script.analyze(
      [...FIXTURES.keys()].filter((p) => p.endsWith('.js')),
    )
    assert.ok(!deadExports.some((d) => d.file.includes('opaque.js')))
  })

  test('CLI entry points are not orphans even when never required', () => {
    const { deadExports, orphanFiles } = script.analyze(
      [...FIXTURES.keys()].filter((p) => p.endsWith('.js')),
    )
    assert.ok(!orphanFiles.includes('tools/cli-entry.js'))
    assert.ok(!deadExports.some((d) => d.file.includes('cli-entry.js')))
  })

  test('main prints an advisory report and always exits 0', () => {
    script.main([])
    assert.equal(exitCode, 0)
    assert.ok(logs.some((l) => l.includes('candidate(s)')))
    assert.ok(logs.some((l) => l.includes('advisory')))
  })

  test('clean tree reports no candidates', () => {
    FIXTURES.delete(`${TOOLS}/lib/partly.js`)
    FIXTURES.delete(`${TOOLS}/orphan.js`)
    FIXTURES.delete(`${TOOLS}/lib/harnessed.js`)
    FIXTURES.delete(`${TOOLS}/harnessed.test.js`)
    // inline.js ships a deliberately dead export; replace it with a
    // fully-consumed variant for the clean-tree scenario.
    FIXTURES.set(
      `${TOOLS}/lib/inline.js`,
      `'use strict'\nmodule.exports = {\n  inlineUsed,\n}\nfunction inlineUsed() {}\n`,
    )
    // Consumer references all three exports of used.js so nothing is dead.
    FIXTURES.set(
      `${TOOLS}/consumer.js`,
      `'use strict'\nconst usedNs = require('./lib/used.js')\nrequire('./lib/opaque.js')\nrequire('./lib/inline.js').inlineUsed()\nmodule.exports = { run: () => [usedNs.a(), usedNs.b(), usedNs.c()] }\n`,
    )
    script.main([])
    assert.equal(exitCode, 0)
    assert.ok(
      logs.some((l) => l.includes('no candidates')),
      `expected no candidates, got: ${logs.join(' | ')}`,
    )
  })

  test('--format json prints a machine-readable report', () => {
    script.main(['--format', 'json'])
    assert.equal(exitCode, 0)
    const report = JSON.parse(logs.join('\n'))
    assert.equal(report.deadExports[0].exports[0], 'dead')
    assert.deepEqual(report.orphanFiles, ['tools/orphan.js'])
  })

  test('--silent suppresses the report', () => {
    script.main(['--silent'])
    assert.equal(exitCode, 0)
    assert.equal(logs.length, 0)
  })
})

describe('check-dead-code export extraction', () => {
  test('parseCliArgs recognizes the supported flags', () => {
    assert.deepEqual(script.parseCliArgs([]), {
      isSilent: false,
      format: 'text',
    })
    assert.deepEqual(script.parseCliArgs(['--silent', '--format', 'json']), {
      isSilent: true,
      format: 'json',
    })
  })

  test('extractExports handles object shorthand, keyed, and assignments', () => {
    const names = script.extractExports(
      `'use strict'\nmodule.exports = {\n  alpha,\n  beta: runBeta,\n}\nmodule.exports.gamma = gamma\n`,
    )
    assert.deepEqual(names.sort(), ['alpha', 'beta', 'gamma'])
  })

  test('extractExports handles get/set accessors without capturing bodies', () => {
    const names = script.extractExports(
      `'use strict'\nmodule.exports = {\n  main,\n  get runAudit() {\n    return impl.runAudit\n  },\n  set runAudit(fn) {\n    impl.runAudit = fn\n  },\n}\n`,
    )
    assert.deepEqual(names.sort(), ['main', 'runAudit'])
  })
})
