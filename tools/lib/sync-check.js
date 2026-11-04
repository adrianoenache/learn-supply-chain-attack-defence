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

const LOCK_FILE = config.paths.packageLockJson
const NODE_MODULES_LOCK_FILE = config.paths.nodeModulesLockJson

let fsImpl = fs
let spawnSyncImpl = spawnSync
let pkgImpl = null

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.spawnSync) spawnSyncImpl = impls.spawnSync
  if (impls.pkg) pkgImpl = impls.pkg
}

function resetImpls() {
  fsImpl = fs
  spawnSyncImpl = spawnSync
  pkgImpl = null
}

function getPkg() {
  if (pkgImpl) return pkgImpl
  return require(path.resolve(__dirname, '../../package.json'))
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
    if (result.stderr) {
      console.error('npm ls diagnostic output:')
      console.error(result.stderr)
    }
    return {
      inSync: false,
      reason: 'node_modules appears outdated or missing',
    }
  }

  try {
    const ls = JSON.parse(result.stdout)
    const pkg = getPkg()
    const declared = {
      ...pkg.dependencies,
      ...pkg.devDependencies,
      ...pkg.peerDependencies,
      ...pkg.optionalDependencies,
    }
    // The deterministic reference is the LOCKFILE's resolved version, never
    // the package.json specifier: ranges like ^8.0.1 and git URLs are valid
    // declarations that never equal an installed version string. (Dogfooding
    // finding, Fase M.1 — the previous comparison broke adopters with ranges.)
    const lockfile = readJsonSafe(LOCK_FILE)

    for (const [name, declaredVersion] of Object.entries(declared)) {
      const installed = ls.dependencies?.[name]
      if (!installed?.version) {
        return { inSync: false, reason: `${name} is not installed` }
      }
      const expected =
        lockfile?.packages?.[`node_modules/${name}`]?.version ?? declaredVersion
      if (installed.version !== expected) {
        return {
          inSync: false,
          reason: `${name} is ${installed.version}, expected ${expected}`,
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
