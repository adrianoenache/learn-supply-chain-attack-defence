#!/usr/bin/env node
'use strict'

// Tests for update-badge.js.
// Uses node:test + node:assert/strict + native modules only.

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const SCRIPT_PATH = path.resolve(__dirname, 'update-badge.js')
const README_PATH = path.resolve(__dirname, '../README.md')

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

function makeMockFs(files) {
  return {
    readFileSync: (filePath, encoding) => {
      if (!(filePath in files)) {
        const err = new Error(`ENOENT: ${filePath}`)
        err.code = 'ENOENT'
        throw err
      }
      return Buffer.isBuffer(files[filePath])
        ? files[filePath].toString(encoding ?? 'utf8')
        : files[filePath]
    },
    writeFileSync: (filePath, data) => {
      files[filePath] = data
    },
  }
}

function makeMockGlob(filePaths) {
  return (pattern) => {
    const isLib =
      pattern.includes(`${path.sep}lib${path.sep}`) || pattern.includes('/lib/')
    const isPerf =
      pattern.includes(`${path.sep}perf${path.sep}`) ||
      pattern.includes('/perf/')
    return filePaths.filter((p) => {
      const hasLib =
        p.includes(`${path.sep}lib${path.sep}`) || p.includes('/lib/')
      const hasPerf =
        p.includes(`${path.sep}perf${path.sep}`) || p.includes('/perf/')
      if (isLib) return hasLib
      if (isPerf) return hasPerf
      return !hasLib && !hasPerf
    })
  }
}

describe('update-badge', () => {
  test('counts test() calls in a single file', () => {
    const mod = readScriptExports()
    const fs = makeMockFs({
      '/tools/foo.test.js': [
        "const { test } = require('node:test')",
        "test('one', () => {})",
        "test('two', () => {})",
        '// test() in comment',
      ].join('\n'),
    })
    mod.setImpls({ fs })
    try {
      assert.equal(mod.countTestsInFile('/tools/foo.test.js'), 2)
    } finally {
      mod.resetImpls()
    }
  })

  test('counts test() calls across multiple files', () => {
    const mod = readScriptExports()
    const fs = makeMockFs({
      '/tools/a.test.js': "test('a1', () => {})\ntest('a2', () => {})",
      '/tools/b.test.js': "test('b1', () => {})\n// test() ignored",
    })
    mod.setImpls({ fs })
    try {
      assert.equal(
        mod.countAllTests(['/tools/a.test.js', '/tools/b.test.js']),
        3,
      )
    } finally {
      mod.resetImpls()
    }
  })

  test('ignores test() inside block comments', () => {
    const mod = readScriptExports()
    const fs = makeMockFs({
      '/tools/block.test.js': [
        '/*',
        "test('inside block', () => {})",
        '*/',
        "test('outside', () => {})",
      ].join('\n'),
    })
    mod.setImpls({ fs })
    try {
      assert.equal(mod.countTestsInFile('/tools/block.test.js'), 1)
    } finally {
      mod.resetImpls()
    }
  })

  test('builds the expected badge line', () => {
    const mod = readScriptExports()
    assert.equal(
      mod.buildBadgeLine(42),
      '![Tests](https://img.shields.io/badge/Tests-42%2F42%20passing-brightgreen)',
    )
  })

  test('updates the badge line in README content', () => {
    const mod = readScriptExports()
    const content = [
      '# Title',
      '',
      '![Tests](https://img.shields.io/badge/Tests-1%2F1%20passing-brightgreen)',
      '',
      'Body',
    ].join('\n')
    const updated = mod.updateBadgeLine(content, mod.buildBadgeLine(42))
    assert.ok(updated.includes(mod.buildBadgeLine(42)))
    assert.ok(!updated.includes('1%2F1'))
  })

  test('throws when README has no badge line', () => {
    const mod = readScriptExports()
    assert.throws(
      () => mod.updateBadgeLine('# Title\n\nBody', mod.buildBadgeLine(42)),
      /Could not find the test badge line/,
    )
  })

  test('main updates README and reports new count', () => {
    const mod = readScriptExports()
    const files = {
      [README_PATH]: [
        '# Title',
        '',
        '![Tests](https://img.shields.io/badge/Tests-1%2F1%20passing-brightgreen)',
        '',
        'Body',
      ].join('\n'),
      '/tools/a.test.js': "test('a1', () => {})\ntest('a2', () => {})",
      '/tools/lib/b.test.js': "test('b1', () => {})",
      '/tools/perf/c.test.js': "test('c1', () => {})\ntest('c2', () => {})",
    }
    const fs = makeMockFs(files)
    const logs = []
    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    mod.setImpls({
      fs,
      globSync: makeMockGlob([
        '/tools/a.test.js',
        '/tools/lib/b.test.js',
        '/tools/perf/c.test.js',
      ]),
      exit: () => {},
      readmePath: README_PATH,
    })

    try {
      const code = mod.main([])
      assert.equal(code, 0)
      assert.ok(files[README_PATH].includes(mod.buildBadgeLine(5)))
      assert.ok(logs.some((line) => line.includes('5/5')))
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('dry-run does not write README', () => {
    const mod = readScriptExports()
    const files = {
      [README_PATH]: [
        '# Title',
        '',
        '![Tests](https://img.shields.io/badge/Tests-1%2F1%20passing-brightgreen)',
        '',
        'Body',
      ].join('\n'),
      '/tools/a.test.js': "test('a1', () => {})",
    }
    const fs = makeMockFs(files)
    const logs = []
    const originalLog = console.log
    console.log = (...args) => logs.push(args.join(' '))

    mod.setImpls({
      fs,
      globSync: makeMockGlob(['/tools/a.test.js']),
      exit: () => {},
      readmePath: README_PATH,
    })

    try {
      const code = mod.main(['--dry-run'])
      assert.equal(code, 0)
      assert.ok(files[README_PATH].includes('1%2F1'))
      assert.ok(logs.some((line) => line.includes('[dry-run]')))
    } finally {
      console.log = originalLog
      mod.resetImpls()
    }
  })

  test('main exits 1 when badge line is missing', () => {
    const mod = readScriptExports()
    const files = {
      [README_PATH]: '# Title\n\nBody',
      '/tools/a.test.js': "test('a1', () => {})",
    }
    const fs = makeMockFs(files)
    mod.setImpls({
      fs,
      globSync: makeMockGlob(['/tools/a.test.js']),
      exit: (code) => {
        throw new Error(`exit ${code}`)
      },
      readmePath: README_PATH,
    })

    try {
      assert.throws(() => mod.main([]), /exit 1/)
    } finally {
      mod.resetImpls()
    }
  })

  test('CLI exits 0 and updates badge', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH, '--dry-run'], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
  })
})
