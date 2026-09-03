#!/usr/bin/env node
'use strict'

// Verifies the integrity of files installed by install-defences.js.
// Reads .defence-manifest.json in the current project and compares the
// recorded SHA-256 hashes with the files on disk.
//
// Usage:
//   node ./tools/verify-defences.js
//   npm run defence:verify-defences

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const MANIFEST_NAME = '.defence-manifest.json'

let fsImpl = fs
let cryptoImpl = crypto
let exitImpl = process.exit
let consoleImpl = console

function setFsImpl(impl) {
  fsImpl = impl
}

function resetFsImpl() {
  fsImpl = fs
}

function setCryptoImpl(impl) {
  cryptoImpl = impl
}

function resetCryptoImpl() {
  cryptoImpl = crypto
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

function sha256File(filePath) {
  const hash = cryptoImpl.createHash('sha256')
  hash.update(fsImpl.readFileSync(filePath))
  return hash.digest('hex')
}

function loadManifest(cwd) {
  const manifestPath = path.join(cwd, MANIFEST_NAME)
  if (!fsImpl.existsSync(manifestPath)) {
    throw new Error(
      `Manifest not found: ${manifestPath}. Run install-defences first.`,
    )
  }
  const raw = fsImpl.readFileSync(manifestPath, 'utf8')
  return JSON.parse(raw)
}

function verify(cwd) {
  const manifest = loadManifest(cwd)
  const files = manifest.files || []

  const missing = []
  const changed = []

  for (const entry of files) {
    const filePath = path.join(cwd, entry.path)
    if (!fsImpl.existsSync(filePath)) {
      missing.push(entry.path)
      continue
    }
    const actual = sha256File(filePath)
    if (actual !== entry.hash) {
      changed.push({ path: entry.path, expected: entry.hash, actual })
    }
  }

  return { missing, changed, fileCount: files.length }
}

function main(argv, cwd = process.cwd()) {
  const silent = argv.includes('--silent') || argv.includes('-s')
  const json = argv.includes('--json')

  let result
  try {
    result = verify(cwd)
  } catch (err) {
    if (json) {
      consoleImpl.error(JSON.stringify({ ok: false, error: err.message }))
    } else if (!silent) {
      consoleImpl.error(`Error: ${err.message}`)
    }
    return exitImpl(1)
  }

  const ok = result.missing.length === 0 && result.changed.length === 0

  if (json) {
    consoleImpl.log(
      JSON.stringify({
        ok,
        fileCount: result.fileCount,
        missing: result.missing,
        changed: result.changed,
      }),
    )
    return exitImpl(ok ? 0 : 1)
  }

  if (!silent) {
    consoleImpl.log(`Verified ${result.fileCount} defence file(s).`)
    if (result.missing.length > 0) {
      consoleImpl.error(`Missing files:\n  ${result.missing.join('\n  ')}`)
    }
    if (result.changed.length > 0) {
      consoleImpl.error('Changed files:')
      for (const item of result.changed) {
        consoleImpl.error(
          `  ${item.path}\n    expected: ${item.expected}\n    actual:   ${item.actual}`,
        )
      }
    }
    if (ok) {
      consoleImpl.log('All defence files match the manifest.')
    }
  }

  return exitImpl(ok ? 0 : 1)
}

if (require.main === module) {
  main(process.argv.slice(2))
}

module.exports = {
  main,
  verify,
  sha256File,
  setFsImpl,
  resetFsImpl,
  setCryptoImpl,
  resetCryptoImpl,
  setExitImpl,
  resetExitImpl,
  setConsoleImpl,
  resetConsoleImpl,
}
