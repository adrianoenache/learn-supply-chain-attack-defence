#!/usr/bin/env node
'use strict'

// Controlled update script for existing dependencies.
// Runs `npm update` inside the security constraints defined in .npmrc
// (save-exact, ignore-scripts, min-release-age) and then re-runs every
// verification layer so updated packages are still vetted.
//
// Usage:
//   npm run defence:update
//   npm run defence:update -- --dry-run
//
// Flow executed:
//   1. npm update
//   2. npm run defence:pkg-age-check -- --transitive
//   3. npm audit signatures
//   4. npm audit --audit-level=high

const { spawnSync } = require('node:child_process')

// Exposed for tests so spawnSync calls can be mocked without patching the global child_process module.
let spawnSyncImpl = spawnSync
function setSpawnSyncImpl(fn) {
  spawnSyncImpl = fn
}
function resetSpawnSyncImpl() {
  spawnSyncImpl = spawnSync
}

function runCmd(label, cmd, args, opts = {}) {
  console.log(`\n${label}: ${cmd} ${args.join(' ')}`)
  const result = spawnSyncImpl(cmd, args, {
    stdio: 'inherit',
    shell: false,
    ...opts,
  })
  if (result.status !== 0) {
    const reason =
      result.status === null
        ? `killed by signal ${result.signal}`
        : `exited with code ${result.status}`
    throw new Error(`${label} failed (${reason}).`)
  }
}

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    isDryRun: argv.includes('--dry-run'),
  }
}

function main(argv = process.argv.slice(2)) {
  const { isDryRun } = parseCliArgs(argv)

  if (isDryRun) {
    console.log(
      '[dry-run] Would update dependencies with controlled npm update:',
    )
    console.log('  - npm update')
    console.log('  - npm run defence:pkg-age-check -- --transitive')
    console.log('  - npm audit signatures')
    console.log('  - npm audit --audit-level=high')
    return 0
  }

  console.log('Updating dependencies with controlled npm update...')

  runCmd('Update dependencies', 'npm', ['update'])
  runCmd('Transitive package age check', 'npm', [
    'run',
    'defence:pkg-age-check',
    '--',
    '--transitive',
  ])
  runCmd('Signature verification', 'npm', ['audit', 'signatures'])
  runCmd('Vulnerability audit', 'npm', ['audit', '--audit-level=high'])

  console.log('\nUpdate complete.')
  console.log(
    'Review package.json and package-lock.json, then commit both files.',
  )
  return 0
}

if (require.main === module) {
  try {
    const code = main()
    process.exit(code)
  } catch (err) {
    console.error(`\nUpdate failed: ${err.message}`)
    process.exit(1)
  }
}

module.exports = { main, setSpawnSyncImpl, resetSpawnSyncImpl }
