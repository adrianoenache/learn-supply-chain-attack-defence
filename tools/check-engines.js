#!/usr/bin/env node
'use strict'

// Validates that the active Node.js and npm versions satisfy the `engines`
// field in package.json. Fails early with a friendly message when the local
// environment is below the minimum required versions.
//
// Usage:
//   node ./tools/check-engines.js
//
// Exit codes:
//   0 — the environment satisfies the engines field.
//   1 — Node.js or npm is below the required version.

const { spawnSync } = require('node:child_process')
const path = require('node:path')

const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))

let loadConfigImpl = loadConfig
let spawnSyncImpl = spawnSync
let exitImpl = process.exit
let logImpl = console.log
let errorImpl = console.error

function setImpls(impls) {
  if (impls.loadConfig) loadConfigImpl = impls.loadConfig
  if (impls.spawnSync) spawnSyncImpl = impls.spawnSync
  if (impls.exit) exitImpl = impls.exit
  if (impls.log) logImpl = impls.log
  if (impls.error) errorImpl = impls.error
}

function resetImpls() {
  loadConfigImpl = loadConfig
  spawnSyncImpl = spawnSync
  exitImpl = process.exit
  logImpl = console.log
  errorImpl = console.error
}

function parseVersionRange(range) {
  const match = /^(>=|>|<=|<|=|~|\^)?\s*(\d+\.\d+\.\d+(?:-[\w.]+)?)$/.exec(
    String(range).trim(),
  )
  if (!match) {
    throw new Error(`Unsupported engine range: ${range}`)
  }
  return { operator: match[1] || '>=', version: match[2] }
}

function versionToParts(version) {
  const [core] = version.split('-')
  return core.split('.').map(Number)
}

function compareVersions(a, b) {
  const partsA = versionToParts(a)
  const partsB = versionToParts(b)
  const len = Math.max(partsA.length, partsB.length)
  for (let i = 0; i < len; i += 1) {
    const pa = partsA[i] || 0
    const pb = partsB[i] || 0
    if (pa > pb) return 1
    if (pa < pb) return -1
  }
  return 0
}

function satisfies(version, range) {
  const { operator, version: target } = parseVersionRange(range)
  const cmp = compareVersions(version, target)
  switch (operator) {
    case '>=':
      return cmp >= 0
    case '>':
      return cmp > 0
    case '<=':
      return cmp <= 0
    case '<':
      return cmp < 0
    case '=':
      return cmp === 0
    case '~': {
      const [major, minor] = versionToParts(target)
      const parts = versionToParts(version)
      return parts[0] === major && parts[1] === minor && cmp >= 0
    }
    case '^': {
      const [major] = versionToParts(target)
      const parts = versionToParts(version)
      return parts[0] === major && cmp >= 0
    }
    default:
      return false
  }
}

function getNpmVersion() {
  const result = spawnSyncImpl('npm', ['--version'], {
    encoding: 'utf8',
    shell: false,
  })
  if (result.error || result.status !== 0) {
    throw new Error('Unable to determine npm version. Is npm installed?')
  }
  return result.stdout.trim()
}

function main() {
  const config = loadConfigImpl()
  const engines = config.engines || {}

  const nodeRange = engines.node
  const npmRange = engines.npm

  if (!nodeRange || !npmRange) {
    throw new Error('Missing engines.node or engines.npm in package.json.')
  }

  const nodeVersion = process.version.replace(/^v/, '')
  const npmVersion = getNpmVersion()

  logImpl(`Node.js ${nodeVersion} (required ${nodeRange})`)
  logImpl(`npm ${npmVersion} (required ${npmRange})`)

  const nodeOk = satisfies(nodeVersion, nodeRange)
  const npmOk = satisfies(npmVersion, npmRange)

  if (!nodeOk || !npmOk) {
    errorImpl(
      '\nEnvironment does not satisfy the engines field in package.json.',
    )
    if (!nodeOk) {
      errorImpl(
        `  Node.js ${nodeVersion} does not satisfy ${nodeRange}. Please upgrade Node.js.`,
      )
    }
    if (!npmOk) {
      errorImpl(
        `  npm ${npmVersion} does not satisfy ${npmRange}. Please upgrade npm.`,
      )
    }
    errorImpl(
      '\nIf you use nvm, run `nvm use` (or `nvm install`) to switch to the correct version.',
    )
    return exitImpl(1)
  }

  logImpl('Engine requirements satisfied.')
  return exitImpl(0)
}

if (require.main === module) {
  try {
    main()
  } catch (err) {
    errorImpl(`\nEngine check failed: ${err.message}`)
    process.exit(1)
  }
}

module.exports = {
  main,
  satisfies,
  setImpls,
  resetImpls,
}
