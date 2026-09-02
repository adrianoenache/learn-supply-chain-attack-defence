#!/usr/bin/env node
'use strict'

// Verifies that the Husky pre-commit hook matches the expected SHA-256 hash
// stored in package.json under `defences.huskyPreCommitHash`.
//
// Usage:
//   node ./tools/check-hooks.js
//
// Exit codes:
//   0 — hook hash matches or no hash configured
//   1 — hash mismatch or hook missing

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const configModule = require(path.resolve(__dirname, './lib/config.js'))

const PRE_COMMIT_PATH = path.resolve(process.cwd(), '.husky/pre-commit')

let fsImpl = fs
let loadConfigImpl = configModule.loadConfig

function setFsImpl(fn) {
  fsImpl = fn
}

function resetFsImpl() {
  fsImpl = fs
  loadConfigImpl = configModule.loadConfig
}

function setLoadConfigImpl(fn) {
  loadConfigImpl = fn
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fsImpl.readFileSync(filePath))
  return hash.digest('hex')
}

function main() {
  const config = loadConfigImpl()
  const expectedHash = config.defences?.huskyPreCommitHash

  if (!expectedHash) {
    console.log(
      'ℹ️  No defences.huskyPreCommitHash configured; skipping hook integrity check.',
    )
    return 0
  }

  if (!fsImpl.existsSync(PRE_COMMIT_PATH)) {
    console.error(`❌ Pre-commit hook not found at ${PRE_COMMIT_PATH}`)
    return 1
  }

  const actualHash = sha256File(PRE_COMMIT_PATH)
  if (actualHash !== expectedHash) {
    console.error(
      `❌ Pre-commit hook integrity check failed: expected ${expectedHash}, found ${actualHash}.`,
    )
    console.error(
      'The hook may have been modified outside the normal workflow.',
    )
    return 1
  }

  console.log('✅ Pre-commit hook integrity verified.')
  return 0
}

module.exports = {
  main,
  setFsImpl,
  resetFsImpl,
  setLoadConfigImpl,
  sha256File,
}

if (require.main === module) {
  process.exit(main())
}
