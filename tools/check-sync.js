#!/usr/bin/env node
'use strict'

// Standalone dependency sync check.
// Verifies whether node_modules matches package-lock.json and recommends
// running `npm ci` when it does not.
//
// Usage:
//   npm run defence:sync-check            — check sync status
//   npm run defence:sync-check -- --fix   — print the recommended fix command
//   npm run defence:sync-check -- --quiet — exit only, no output (--silent is a kept alias)
//
// Exit codes:
//   0 — node_modules is in sync with package-lock.json
//   1 — out of sync or unexpected error

const path = require('node:path')

const { isNodeModulesInSync, setImpls, resetImpls } = require(
  path.resolve(__dirname, './lib/sync-check.js'),
)
const { hasQuietFlag, supportsColor, formatItem, renderSummary } = require(
  path.resolve(__dirname, './lib/formatters.js'),
)

let exitImpl = process.exit

function setExitImpl(fn) {
  exitImpl = fn
}

function resetExitImpl() {
  exitImpl = process.exit
}

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    isFix: argv.includes('--fix'),
    isSilent: hasQuietFlag(argv),
  }
}

function main(argv = process.argv.slice(2)) {
  const { isFix, isSilent } = parseCliArgs(argv)
  const sync = isNodeModulesInSync()
  const color = supportsColor()

  if (sync.inSync) {
    if (!isSilent) {
      console.log(
        formatItem('pass', 'node_modules is in sync with package-lock.json', {
          color,
        }),
      )
      console.log(renderSummary({ passed: 1, color }))
    }
    return 0
  }

  if (!isSilent) {
    console.log(
      formatItem('fail', 'node_modules is out of sync with package-lock.json', {
        color,
      }),
    )
    if (sync.reason) console.log(`  Reason: ${sync.reason}`)
    if (isFix) {
      console.log('  Run the following command to synchronize:')
      console.log('    npm ci')
    } else {
      console.log(
        '  Run `npm run defence:sync-check -- --fix` for the recommended command.',
      )
    }
    console.log(renderSummary({ failed: 1, next: 'npm ci', color }))
  }

  return 1
}

if (require.main === module) {
  const code = main()
  exitImpl(code)
}

module.exports = { main, setImpls, resetImpls, setExitImpl, resetExitImpl }
