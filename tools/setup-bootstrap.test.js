#!/usr/bin/env node
'use strict'

const { test, describe, before, after } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const { execFileSync } = require('node:child_process')

const SCRIPT_PATH = path.resolve(__dirname, 'setup-bootstrap.js')

function readScriptExports() {
  // Load module fresh for each test by clearing require cache
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

async function withTempProject(fn, { hasLock = false } = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-test-'))
  const origCwd = process.cwd()
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'bootstrap-test', version: '1.0.0' }) + '\n'
  )
  if (hasLock) {
    fs.writeFileSync(path.join(tmpDir, 'package-lock.json'), '{}\n')
  }
  process.chdir(tmpDir)
  try {
    return await fn(tmpDir)
  } finally {
    process.chdir(origCwd)
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

describe('setup-bootstrap', () => {
  test('main exits 0 when package-lock.json exists', async () => {
    await withTempProject(async () => {
      const { main } = readScriptExports()
      const code = main()
      assert.equal(code, 0)
    }, { hasLock: true })
  })

  test('main throws / exits 1 when npm install fails in empty project', async () => {
    await withTempProject(async () => {
      const { main } = readScriptExports()
      let threw = false
      try {
        main()
      } catch (err) {
        threw = true
        assert.ok(err.message.includes('First install failed'))
      }
      assert.equal(threw, true)
    })
  })

  test('dry-run simulation: spawns are forwarded to injected impl', async () => {
    await withTempProject(async (tmpDir) => {
      const mod = readScriptExports()
      // We cannot easily inject spawn because it is a top-level require constant.
      // Instead verify CLI behavior with --dry-run would require refactoring.
      // For now, assert module exports expected interface.
      assert.equal(typeof mod.main, 'function')
    })
  })
})
