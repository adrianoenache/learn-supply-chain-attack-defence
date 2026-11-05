#!/usr/bin/env node
'use strict'

// Verifies that the Husky pre-commit hook matches the expected SHA-256 hash
// stored in package.json under `defences.huskyPreCommitHash`.
//
// Usage:
//   node ./tools/check-hooks.js           — verify hook integrity
//   node ./tools/check-hooks.js --quiet   — exit only, no success output (--silent is a kept alias)
//
// Exit codes:
//   0 — hook hash matches or no hash configured
//   1 — hash mismatch or hook missing

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const configModule = require(path.resolve(__dirname, './lib/config.js'))
const { hasQuietFlag, supportsColor, formatItem, renderSummary } = require(
  path.resolve(__dirname, './lib/formatters.js'),
)

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

function main(argv = process.argv.slice(2)) {
  const config = loadConfigImpl()
  const expectedHash = config.defences?.huskyPreCommitHash
  const quiet = hasQuietFlag(argv)
  const color = supportsColor()

  if (!expectedHash) {
    if (!quiet) {
      console.log(
        formatItem(
          'skip',
          'no defences.huskyPreCommitHash configured; hook integrity check skipped',
          { color },
        ),
      )
      console.log(renderSummary({ skipped: 1, color }))
    }
    return 0
  }

  if (!fsImpl.existsSync(PRE_COMMIT_PATH)) {
    console.error(
      formatItem('fail', `pre-commit hook not found at ${PRE_COMMIT_PATH}`),
    )
    if (!quiet) {
      console.log(
        renderSummary({
          failed: 1,
          next: 'restore .husky/pre-commit — see docs/en/git-hooks.md',
          color,
        }),
      )
    }
    return 1
  }

  const actualHash = sha256File(PRE_COMMIT_PATH)
  if (actualHash !== expectedHash) {
    console.error(
      formatItem(
        'fail',
        `pre-commit hook integrity check failed: expected ${expectedHash}, found ${actualHash}`,
      ),
    )
    console.error(
      '  The hook may have been modified outside the normal workflow.',
    )
    if (!quiet) {
      console.log(
        renderSummary({
          failed: 1,
          next: 'if the hook change was intentional, update defences.huskyPreCommitHash in package.json and run npm run defence:verify-defences:fix',
          color,
        }),
      )
    }
    return 1
  }

  if (!quiet) {
    console.log(
      formatItem('pass', 'pre-commit hook integrity verified', { color }),
    )
    console.log(renderSummary({ passed: 1, color }))
  }
  return 0
}

module.exports = {
  main,
  setFsImpl,
  resetFsImpl,
  setLoadConfigImpl,
}

if (require.main === module) {
  process.exit(main())
}
