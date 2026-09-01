#!/usr/bin/env node
'use strict'

// Verifies that every package entry in package-lock.json has a strong
// integrity field (SHA-512 or better). This catches tampering or incomplete
// lockfile entries before installation.
//
// Usage:
//   npm run defence:check-lockfile-integrity              — table report, exits 0
//   npm run defence:check-lockfile-integrity -- --silent  — exit only
//   npm run defence:check-lockfile-integrity -- --format=json
//   npm run defence:check-lockfile-integrity -- --format=markdown
//
// Exit codes:
//   0 — all entries have SHA-512 integrity.
//   1 — missing or weak integrity detected.

const fs = require('node:fs')
const path = require('node:path')

const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))

const config = loadConfig()

// Dependency injection hooks — exposed for tests.
let fsImpl = fs
function setFsImpl(fn) {
  fsImpl = fn
}
function resetFsImpl() {
  fsImpl = fs
}

let exitImpl = process.exit
function setExitImpl(fn) {
  exitImpl = fn
}
function resetExitImpl() {
  exitImpl = process.exit
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const isSilent = argv.includes('--silent')
  const formatArg = argv.find((arg) => arg.startsWith('--format='))
  const format = formatArg?.slice('--format='.length) ?? 'table'
  const validFormats = ['table', 'json', 'markdown']
  if (!validFormats.includes(format)) {
    throw new Error(
      `Invalid format "${format}". Use one of: ${validFormats.join(', ')}.`,
    )
  }
  return { isSilent, format }
}

function isStrongIntegrity(integrity) {
  if (typeof integrity !== 'string' || integrity.length === 0) return false
  // npm currently uses sha512 for all tarballs. Reject sha1 or unknown algorithms.
  return integrity.startsWith('sha512-')
}

function readLockfile(lockPath) {
  const content = fsImpl.readFileSync(lockPath, 'utf8')
  return JSON.parse(content)
}

function checkLockfileIntegrity(lock) {
  const packages = lock.packages || {}
  const missing = []
  const weak = []

  for (const [pkgPath, pkg] of Object.entries(packages)) {
    // The root project entry ("") does not need an integrity field.
    if (pkgPath === '') continue
    if (!pkg || typeof pkg !== 'object') continue

    const integrity = pkg.integrity
    if (integrity === undefined || integrity === null || integrity === '') {
      missing.push(pkgPath)
      continue
    }
    if (!isStrongIntegrity(integrity)) {
      weak.push({ path: pkgPath, integrity })
    }
  }

  return { missing, weak }
}

function formatTable(result) {
  const lines = []
  const total = result.missing.length + result.weak.length

  if (total === 0) {
    lines.push('✅ All lockfile entries have SHA-512 integrity.')
    return lines.join('\n')
  }

  lines.push(
    `⚠️  Found ${total} lockfile package(s) with missing or weak integrity:\n`,
  )

  if (result.missing.length > 0) {
    lines.push('Missing integrity:')
    for (const pkgPath of result.missing) {
      lines.push(`  - ${pkgPath}`)
    }
    lines.push('')
  }

  if (result.weak.length > 0) {
    lines.push('Weak integrity (SHA-1 or unknown):')
    for (const { path: pkgPath, integrity } of result.weak) {
      lines.push(`  - ${pkgPath}: ${integrity.split('-')[0]}`)
    }
    lines.push('')
  }

  lines.push('Run `npm ci` to regenerate the lockfile from trusted sources.')
  return lines.join('\n')
}

function formatJson(result) {
  return JSON.stringify(result, null, 2)
}

function formatMarkdown(result) {
  const lines = ['# Lockfile Integrity Report\n']
  const total = result.missing.length + result.weak.length

  if (total === 0) {
    lines.push('All lockfile entries have SHA-512 integrity.')
    return lines.join('\n')
  }

  lines.push(`Found ${total} package(s) with missing or weak integrity.\n`)

  if (result.missing.length > 0) {
    lines.push('## Missing integrity\n')
    lines.push('| Package |')
    lines.push('|---|')
    for (const pkgPath of result.missing) {
      lines.push(`| ${pkgPath} |`)
    }
    lines.push('')
  }

  if (result.weak.length > 0) {
    lines.push('## Weak integrity\n')
    lines.push('| Package | Algorithm |')
    lines.push('|---|---|')
    for (const { path: pkgPath, integrity } of result.weak) {
      lines.push(`| ${pkgPath} | ${integrity.split('-')[0]} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function main(argv = process.argv.slice(2)) {
  const { isSilent, format } = parseCliArgs(argv)
  const lockPath = config.paths.packageLockJson

  const lock = readLockfile(lockPath)
  const result = checkLockfileIntegrity(lock)
  const hasIssues = result.missing.length > 0 || result.weak.length > 0

  if (!isSilent) {
    let output
    switch (format) {
      case 'json':
        output = formatJson(result)
        break
      case 'markdown':
        output = formatMarkdown(result)
        break
      default:
        output = formatTable(result)
    }
    console.log(output)
  }

  if (hasIssues) {
    return exitImpl(1)
  }
  return exitImpl(0)
}

if (require.main === module) {
  try {
    main()
  } catch (err) {
    console.error(`Unexpected error: ${err.message}`)
    process.exit(1)
  }
}

module.exports = {
  parseCliArgs,
  isStrongIntegrity,
  checkLockfileIntegrity,
  readLockfile,
  main,
  setFsImpl,
  resetFsImpl,
  setExitImpl,
  resetExitImpl,
}
