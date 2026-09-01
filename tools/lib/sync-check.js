'use strict'

// Shared dependency sync-check logic.
// Determines whether node_modules matches package-lock.json.
// Used by check-updates.js (embedded pre-commit step) and check-sync.js
// (standalone command).
//
// Only native Node.js modules are used so this helper remains safe to import
// before any third-party dependencies are installed.

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const { loadConfig } = require(path.resolve(__dirname, './config.js'))

const config = loadConfig()
const pkg = require(path.resolve(__dirname, '../../package.json'))

const LOCK_FILE = config.paths.packageLockJson
const NODE_MODULES_LOCK_FILE = config.paths.nodeModulesLockJson

let fsImpl = fs
let spawnSyncImpl = spawnSync

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.spawnSync) spawnSyncImpl = impls.spawnSync
}

function resetImpls() {
  fsImpl = fs
  spawnSyncImpl = spawnSync
}

function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function readJsonSafe(filePath) {
  try {
    const content = fsImpl.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

function readLockfileHash() {
  try {
    const content = fsImpl.readFileSync(LOCK_FILE, 'utf8')
    return sha256(content)
  } catch {
    return null
  }
}

function checkNodeModulesHash() {
  const currentHash = readLockfileHash()
  if (!currentHash) {
    return { inSync: true }
  }

  const installedLock = readJsonSafe(NODE_MODULES_LOCK_FILE)
  if (installedLock?.packageLockHash === currentHash) {
    return { inSync: true }
  }

  return { inSync: false }
}

function checkInstalledVersions() {
  const result = spawnSyncImpl('npm', ['ls', '--json', '--depth=0'], {
    encoding: 'utf8',
    shell: false,
  })

  if (result.status !== 0 || !result.stdout) {
    return {
      inSync: false,
      reason: 'node_modules appears outdated or missing',
    }
  }

  try {
    const ls = JSON.parse(result.stdout)
    const declared = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    }

    for (const [name, declaredVersion] of Object.entries(declared)) {
      const installed = ls.dependencies?.[name]
      if (!installed?.version) {
        return { inSync: false, reason: `${name} is not installed` }
      }
      if (installed.version !== declaredVersion) {
        return {
          inSync: false,
          reason: `${name} is ${installed.version}, expected ${declaredVersion}`,
        }
      }
    }

    return { inSync: true }
  } catch {
    return { inSync: false, reason: 'could not verify installed packages' }
  }
}

function isNodeModulesInSync() {
  const hashCheck = checkNodeModulesHash()
  if (hashCheck.inSync) return hashCheck

  const versionCheck = checkInstalledVersions()
  return versionCheck
}

module.exports = {
  isNodeModulesInSync,
  readLockfileHash,
  setImpls,
  resetImpls,
}
