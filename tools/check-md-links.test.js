#!/usr/bin/env node
'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')

const { findMarkdownFiles, checkFile, main } = require(
  path.resolve(__dirname, './check-md-links.js'),
)
const SCRIPT_PATH = path.resolve(__dirname, 'check-md-links.js')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'md-links-test-'))
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

describe('check-md-links', () => {
  test('findMarkdownFiles ignores node_modules and .git', () => {
    const tmpDir = makeTempDir()
    try {
      fs.mkdirSync(path.join(tmpDir, 'node_modules'))
      fs.mkdirSync(path.join(tmpDir, '.git'))
      fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# readme\n')
      fs.writeFileSync(path.join(tmpDir, 'node_modules', 'pkg.md'), '# pkg\n')

      const files = findMarkdownFiles(tmpDir)
      assert.equal(files.length, 1)
      assert.ok(files[0].endsWith('readme.md'))
    } finally {
      cleanup(tmpDir)
    }
  })

  test('checkFile returns empty array for valid local links', () => {
    const tmpDir = makeTempDir()
    try {
      fs.writeFileSync(path.join(tmpDir, 'existing.md'), '# existing\n')
      fs.writeFileSync(
        path.join(tmpDir, 'source.md'),
        '[valid link](existing.md)\n',
      )

      const broken = checkFile(path.join(tmpDir, 'source.md'))
      assert.deepEqual(broken, [])
    } finally {
      cleanup(tmpDir)
    }
  })

  test('checkFile detects broken local links', () => {
    const tmpDir = makeTempDir()
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'source.md'),
        '[broken link](missing.md)\n',
      )

      const broken = checkFile(path.join(tmpDir, 'source.md'))
      assert.deepEqual(broken, ['missing.md'])
    } finally {
      cleanup(tmpDir)
    }
  })

  test('checkFile skips external and anchor links', () => {
    const tmpDir = makeTempDir()
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'source.md'),
        '[external](https://example.com) and [anchor](#section)\n',
      )

      const broken = checkFile(path.join(tmpDir, 'source.md'))
      assert.deepEqual(broken, [])
    } finally {
      cleanup(tmpDir)
    }
  })

  test('main returns 0 when no broken links exist', () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    try {
      fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# readme\n')
      process.chdir(tmpDir)
      const code = main()
      assert.equal(code, 0)
    } finally {
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('main returns 1 when broken links exist', () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    try {
      fs.writeFileSync(path.join(tmpDir, 'readme.md'), '[broken](missing.md)\n')
      process.chdir(tmpDir)
      const code = main()
      assert.equal(code, 1)
    } finally {
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('CLI exits 0 in current project', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
  })
})
