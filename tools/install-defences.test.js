#!/usr/bin/env node
'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const { parseArgs, main } = require('./install-defences.js')

function makeTempTarget(pkg = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'defence-install-'))
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'target', version: '1.0.0', ...pkg }, null, 2) + '\n'
  )
  return tmpDir
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

describe('install-defences', () => {
  test('parseArgs extracts target, dryRun and force', () => {
    assert.deepEqual(parseArgs(['/some/path']), { target: '/some/path', dryRun: false, force: false })
    assert.deepEqual(parseArgs(['/some/path', '--dry-run']), { target: '/some/path', dryRun: true, force: false })
    assert.deepEqual(parseArgs(['--force', '/some/path']), { target: '/some/path', dryRun: false, force: true })
  })

  test('main returns 1 when target is missing', () => {
    const code = main([])
    assert.equal(code, 1)
  })

  test('main returns 1 when target directory does not exist', () => {
    const code = main(['/definitely/not/a/real/path'])
    assert.equal(code, 1)
  })

  test('dry-run does not modify target', () => {
    const target = makeTempTarget()
    try {
      const before = fs.readFileSync(path.join(target, 'package.json'), 'utf8')
      const code = main([target, '--dry-run'])
      assert.equal(code, 0)
      const after = fs.readFileSync(path.join(target, 'package.json'), 'utf8')
      assert.equal(before, after)
      assert.equal(fs.existsSync(path.join(target, '.npmrc')), false)
    } finally {
      cleanup(target)
    }
  })

  test('install copies files and updates package.json', () => {
    const target = makeTempTarget()
    try {
      const code = main([target])
      assert.equal(code, 0)

      assert.equal(fs.existsSync(path.join(target, '.npmrc')), true)
      assert.equal(fs.existsSync(path.join(target, '.husky', 'pre-commit')), true)
      assert.equal(fs.existsSync(path.join(target, 'tools', 'check-package-age.js')), true)
      assert.equal(fs.existsSync(path.join(target, 'tools', 'add-package.js')), true)
      assert.equal(fs.existsSync(path.join(target, 'tools', 'lib', 'package-utils.js')), true)
      assert.equal(fs.existsSync(path.join(target, 'tools', 'setup-bootstrap.js')), true)
      assert.equal(fs.existsSync(path.join(target, 'tools', 'check-package-age.test.js')), true)

      const pkg = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'))
      assert.equal(pkg.scripts['defence:pkg-age-check'], 'node ./tools/check-package-age.js')
      assert.equal(pkg.scripts['defence:bootstrap'], 'node ./tools/setup-bootstrap.js')
      assert.equal(pkg.devDependencies.husky, '9.1.7')
    } finally {
      cleanup(target)
    }
  })

  test('install aborts when target files exist and force is not set', () => {
    const target = makeTempTarget()
    fs.writeFileSync(path.join(target, '.npmrc'), 'existing=true\n')
    try {
      let code
      try {
        code = main([target])
      } catch (err) {
        code = 1
      }
      assert.equal(code, 1)
    } finally {
      cleanup(target)
    }
  })

  test('install backs up and overwrites when force is set', () => {
    const target = makeTempTarget()
    fs.writeFileSync(path.join(target, '.npmrc'), 'existing=true\n')
    try {
      const code = main([target, '--force'])
      assert.equal(code, 0)
      const backups = fs.readdirSync(target).filter((f) => f.startsWith('.npmrc.backup-'))
      assert.ok(backups.length >= 1, 'expected a backup file to be created')
      assert.ok(fs.readFileSync(path.join(target, '.npmrc'), 'utf8').includes('save-exact'))
    } finally {
      cleanup(target)
    }
  })

  test('install aborts on conflicting script values', () => {
    const target = makeTempTarget({ scripts: { 'defence:add': 'something-else' } })
    try {
      let code
      try {
        code = main([target])
      } catch (err) {
        code = 1
      }
      assert.equal(code, 1)
    } finally {
      cleanup(target)
    }
  })

  test('install preserves non-conflicting existing scripts', () => {
    const target = makeTempTarget({ scripts: { build: 'tsc' } })
    try {
      const code = main([target])
      assert.equal(code, 0)
      const pkg = JSON.parse(fs.readFileSync(path.join(target, 'package.json'), 'utf8'))
      assert.equal(pkg.scripts.build, 'tsc')
      assert.equal(pkg.scripts['defence:add'], 'node ./tools/add-package.js')
    } finally {
      cleanup(target)
    }
  })
})
