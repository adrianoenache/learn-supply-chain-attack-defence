#!/usr/bin/env node
'use strict'

// Generates a CycloneDX 1.4 SBOM from package-lock.json.
//
// Usage:
//   node ./tools/generate-sbom.js [--output=<path>] [--format=cyclonedx]
//   npm run defence:generate-sbom

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const DEFAULT_LOCKFILE = path.resolve(__dirname, '../package-lock.json')
const DEFAULT_OUTPUT = undefined

let fsImpl = fs
let exitImpl = process.exit
let consoleImpl = console

function setFsImpl(impl) {
  fsImpl = impl
}

function resetFsImpl() {
  fsImpl = fs
}

function setExitImpl(impl) {
  exitImpl = impl
}

function resetExitImpl() {
  exitImpl = process.exit
}

function setConsoleImpl(impl) {
  consoleImpl = impl
}

function resetConsoleImpl() {
  consoleImpl = console
}

function parseIntegrity(integrity) {
  if (!integrity || typeof integrity !== 'string') {
    return []
  }
  const parts = integrity.split(/\s+/)
  const hashes = []
  for (const part of parts) {
    const idx = part.indexOf('-')
    if (idx === -1) continue
    const algName = part.slice(0, idx).toLowerCase()
    const b64 = part.slice(idx + 1)
    let alg
    switch (algName) {
      case 'sha512':
        alg = 'SHA-512'
        break
      case 'sha384':
        alg = 'SHA-384'
        break
      case 'sha256':
        alg = 'SHA-256'
        break
      case 'sha1':
        alg = 'SHA-1'
        break
      case 'md5':
        alg = 'MD5'
        break
      default:
        continue
    }
    const hex = Buffer.from(b64, 'base64').toString('hex')
    hashes.push({ alg, content: hex })
  }
  return hashes
}

function packageNameFromPath(key) {
  if (!key) return null
  const prefix = 'node_modules/'
  if (!key.startsWith(prefix)) return null
  return key.slice(prefix.length)
}

function purlFor(name, version) {
  if (name.startsWith('@')) {
    const [scope, pkgName] = name.slice(1).split('/')
    return `pkg:npm/@${encodeURIComponent(scope)}/${encodeURIComponent(pkgName)}@${encodeURIComponent(version)}`
  }
  return `pkg:npm/${encodeURIComponent(name)}@${encodeURIComponent(version)}`
}

function buildComponent(name, version, pkg) {
  const component = {
    type: 'library',
    name,
    version,
    purl: purlFor(name, version),
  }

  const hashes = parseIntegrity(pkg.integrity)
  if (hashes.length > 0) {
    component.hashes = hashes
  }

  const externalReferences = []
  if (pkg.resolved) {
    externalReferences.push({
      type: 'distribution',
      url: pkg.resolved,
    })
  }
  if (pkg.repository) {
    externalReferences.push({
      type: 'vcs',
      url:
        typeof pkg.repository === 'string'
          ? pkg.repository
          : pkg.repository.url,
    })
  }
  if (externalReferences.length > 0) {
    component.externalReferences = externalReferences
  }

  return component
}

function generateSbom(lockPath) {
  const raw = fsImpl.readFileSync(lockPath, 'utf8')
  const lock = JSON.parse(raw)
  const packages = lock.packages || {}

  const rootPkg = packages[''] || {}
  const rootName = rootPkg.name || lock.name || 'unknown'
  const rootVersion = rootPkg.version || lock.version || '0.0.0'

  const components = []
  for (const [key, pkg] of Object.entries(packages)) {
    if (key === '') continue
    const name = packageNameFromPath(key)
    const version = pkg.version
    if (!name || !version) continue
    components.push(buildComponent(name, version, pkg))
  }

  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.4',
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [
        {
          vendor: 'learn-supply-chain-attack-defence',
          name: 'generate-sbom',
          version: '1.0.0',
        },
      ],
      component: {
        type: 'application',
        name: rootName,
        version: rootVersion,
        purl: purlFor(rootName, rootVersion),
      },
    },
    components,
  }
}

function parseArgs(argv) {
  let output = DEFAULT_OUTPUT
  let format = 'cyclonedx'
  for (const arg of argv) {
    if (arg.startsWith('--output=')) {
      output = arg.slice('--output='.length)
    } else if (arg === '--format=cyclonedx') {
      format = 'cyclonedx'
    }
  }
  return { output, format }
}

function main(argv, lockPath = DEFAULT_LOCKFILE) {
  const { output } = parseArgs(argv)

  let bom
  try {
    bom = generateSbom(lockPath)
  } catch (err) {
    consoleImpl.error(`Error generating SBOM: ${err.message}`)
    return exitImpl(1)
  }

  const json = JSON.stringify(bom, null, 2)

  if (output) {
    fsImpl.writeFileSync(output, `${json}\n`)
    consoleImpl.log(`SBOM written to ${output}`)
  } else {
    consoleImpl.log(json)
  }

  return exitImpl(0)
}

if (require.main === module) {
  main(process.argv.slice(2))
}

module.exports = {
  main,
  generateSbom,
  parseIntegrity,
  packageNameFromPath,
  purlFor,
  parseArgs,
  setFsImpl,
  resetFsImpl,
  setExitImpl,
  resetExitImpl,
  setConsoleImpl,
  resetConsoleImpl,
}
