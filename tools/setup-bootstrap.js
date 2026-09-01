#!/usr/bin/env node
'use strict'

// Bootstrap helper for the very first setup of a defence-enabled project.
// The main `npm run setup` script uses `npm ci`, which fails if no
// package-lock.json exists. This helper detects that scenario and performs
// a controlled first install that still respects the project's security
// policies (ignore-scripts, save-exact, audit, min-release-age).
//
// Usage:
//   node ./tools/setup-bootstrap.js
//
// Behavior:
//   - If package-lock.json already exists, exits with code 0 and instructs
//     the user to run `npm run setup`.
//   - If package-lock.json is missing, runs a one-time bootstrap:
//       npm install --ignore-scripts --save-exact
//       npm run defence:pkg-age-check
//       npm audit signatures
//       npm audit --audit-level=high
//   - The generated lock file must be reviewed and committed.

const { spawnSync } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))

const LOCK_FILE = path.resolve(process.cwd(), 'package-lock.json')
const PRE_COMMIT_PATH = path.resolve(process.cwd(), '.husky/pre-commit')

// Exposed for tests so spawnSync calls can be mocked without patching the global child_process module.
let spawnSyncImpl = spawnSync
function setSpawnSyncImpl(fn) {
  spawnSyncImpl = fn
}
function resetSpawnSyncImpl() {
  spawnSyncImpl = spawnSync
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function verifyPreCommitHook() {
  const config = loadConfig()
  const expectedHash = config.huskyPreCommitHash
  if (!expectedHash) {
    console.log(
      'ℹ️  No huskyPreCommitHash configured; skipping hook integrity check.',
    )
    return true
  }

  if (!fs.existsSync(PRE_COMMIT_PATH)) {
    throw new Error(`Pre-commit hook not found at ${PRE_COMMIT_PATH}`)
  }

  const actualHash = sha256File(PRE_COMMIT_PATH)
  if (actualHash !== expectedHash) {
    throw new Error(
      `Pre-commit hook integrity check failed: expected ${expectedHash}, found ${actualHash}. ` +
        'The hook may have been modified outside the normal workflow.',
    )
  }

  console.log('✅ Pre-commit hook integrity verified.')
  return true
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

function main() {
  if (fs.existsSync(LOCK_FILE)) {
    console.log('package-lock.json already exists.')
    console.log('Run `npm run setup` instead of the bootstrap script.')
    return 0
  }

  console.log('No package-lock.json found. Running controlled first install...')
  console.log('This generates a lock file without executing lifecycle scripts.')

  runCmd(
    'First install',
    'npm',
    ['install', '--ignore-scripts', '--save-exact'],
    { env: { ...process.env, NPM_CONFIG_PACKAGE_LOCK: 'true' } },
  )

  runCmd('Package age check', 'npm', ['run', 'defence:pkg-age-check'])
  runCmd('Signature verification', 'npm', ['audit', 'signatures'])
  runCmd('Vulnerability audit', 'npm', ['audit', '--audit-level=high'])

  verifyPreCommitHook()

  console.log('\nBootstrap complete.')
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
    console.error(`\nBootstrap failed: ${err.message}`)
    process.exit(1)
  }
}

module.exports = { main, setSpawnSyncImpl, resetSpawnSyncImpl }
