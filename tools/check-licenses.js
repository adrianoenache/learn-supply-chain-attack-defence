#!/usr/bin/env node
'use strict'

// Dependency license checker.
// Scans installed packages (direct + transitive) from package-lock.json v3
// and warns when a license is incompatible with the project's MIT license.
// The script is read-only and never modifies dependencies.
//
// Usage:
//   npm run defence:license-check              — table report, exits 0
//   npm run defence:license-check -- --fail    — exits 1 on prohibited/unknown
//   npm run defence:license-check -- --format=json
//   npm run defence:license-check -- --format=markdown
//   npm run defence:license-check -- --silent

const fs = require('node:fs')
const path = require('node:path')

const pkg = require(path.resolve(__dirname, '../package.json'))
const config = pkg.licensesCheck ?? {}

const DEFAULT_ALLOWED = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
]

const DEFAULT_PROHIBITED = [
  'GPL-1.0',
  'GPL-2.0',
  'GPL-3.0',
  'AGPL-1.0',
  'AGPL-3.0',
  'LGPL-2.0',
  'LGPL-2.1',
  'LGPL-3.0',
  'MPL-1.0',
  'MPL-1.1',
  'MPL-2.0',
  'UNLICENSED',
]

const ALLOWED = new Set(
  (config.allowed ?? DEFAULT_ALLOWED).map(normalizeLicense),
)
const PROHIBITED = new Set(
  (config.prohibited ?? DEFAULT_PROHIBITED).map(normalizeLicense),
)
const FAIL_ON_UNKNOWN = config.failOnUnknown ?? false

// ---------------------------------------------------------------------------
// Dependency injection hooks — exposed for tests.
// ---------------------------------------------------------------------------

let fsImpl = fs
let exitImpl = process.exit

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.exit) exitImpl = impls.exit
}

function resetImpls() {
  fsImpl = fs
  exitImpl = process.exit
}

// ---------------------------------------------------------------------------
// CLI argument parsing.
// ---------------------------------------------------------------------------

function parseCliArgs(argv = process.argv.slice(2)) {
  const isFail = argv.includes('--fail')
  const isSilent = argv.includes('--silent')
  const isTransitive = argv.includes('--transitive')

  const formatArg = argv.find((arg) => arg.startsWith('--format='))
  const format = formatArg?.slice('--format='.length) ?? 'table'
  const validFormats = ['table', 'json', 'markdown']
  if (!validFormats.includes(format)) {
    throw new Error(
      `Invalid format "${format}". Use one of: ${validFormats.join(', ')}.`,
    )
  }

  const pkgArg = argv.find((arg) => arg.startsWith('--pkg='))
  const singlePackage = pkgArg?.slice('--pkg='.length) ?? null

  return { isFail, isSilent, isTransitive, format, singlePackage }
}

// ---------------------------------------------------------------------------
// License normalization and classification.
// ---------------------------------------------------------------------------

function normalizeLicense(expression) {
  return expression.toString().trim().replace(/\s+/g, ' ').toLowerCase()
}

function classifyLicense(expression) {
  if (expression === null || expression === undefined || expression === '') {
    return {
      status: FAIL_ON_UNKNOWN || false ? 'prohibited' : 'flagged',
      reason: 'missing license',
    }
  }

  const normalized = normalizeLicense(expression)

  // Handle SPDX OR expressions: allowed if any branch is allowed.
  if (normalized.includes(' or ')) {
    const branches = normalized.split(/\s+or\s+/).map((s) => s.trim())
    const statuses = branches.map((branch) => classifySingleLicense(branch))
    if (statuses.some((s) => s.status === 'prohibited')) {
      const reason = statuses.find((s) => s.reason)?.reason ?? 'prohibited'
      return { status: 'prohibited', reason }
    }
    if (statuses.some((s) => s.status === 'allowed')) {
      return { status: 'allowed', reason: normalized }
    }
    return { status: 'flagged', reason: 'unknown compound license' }
  }

  // Handle SPDX AND expressions: all branches must be allowed.
  if (normalized.includes(' and ')) {
    const branches = normalized.split(/\s+and\s+/).map((s) => s.trim())
    const statuses = branches.map((branch) => classifySingleLicense(branch))
    if (statuses.some((s) => s.status === 'prohibited')) {
      const reason = statuses.find((s) => s.reason)?.reason ?? 'prohibited'
      return { status: 'prohibited', reason }
    }
    if (statuses.every((s) => s.status === 'allowed')) {
      return { status: 'allowed', reason: normalized }
    }
    return { status: 'flagged', reason: 'unknown compound license' }
  }

  return classifySingleLicense(normalized)
}

function classifySingleLicense(expression) {
  const normalized = normalizeLicense(expression)

  if (PROHIBITED.has(normalized)) {
    return { status: 'prohibited', reason: normalized }
  }

  if (ALLOWED.has(normalized)) {
    return { status: 'allowed', reason: normalized }
  }

  return {
    status: FAIL_ON_UNKNOWN ? 'prohibited' : 'flagged',
    reason: 'unknown license',
  }
}

// ---------------------------------------------------------------------------
// Lockfile parsing.
// ---------------------------------------------------------------------------

function readJsonSafe(filePath) {
  try {
    const content = fsImpl.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

function resolveLockfilePath() {
  return path.resolve(process.cwd(), 'package-lock.json')
}

function readLockfilePackages(lockfilePath = resolveLockfilePath()) {
  const lockfile = readJsonSafe(lockfilePath)
  if (!lockfile?.packages) return []

  const entries = []
  for (const [key, value] of Object.entries(lockfile.packages)) {
    if (!key.startsWith('node_modules/')) continue
    const name = key.replace(/^node_modules\//, '')
    entries.push({
      name,
      version: value.version ?? null,
      license: value.license ?? null,
    })
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name))
}

function findPackageInLockfile(name, version) {
  const packages = readLockfilePackages()
  const match = packages.find(
    (pkg) => pkg.name === name && (version === null || pkg.version === version),
  )
  return match ?? null
}

// ---------------------------------------------------------------------------
// Report formatting.
// ---------------------------------------------------------------------------

function buildReport(packages) {
  const allowed = []
  const flagged = []
  const prohibited = []

  for (const pkg of packages) {
    const classification = classifyLicense(pkg.license)
    const entry = { ...pkg, ...classification }
    if (classification.status === 'allowed') allowed.push(entry)
    if (classification.status === 'flagged') flagged.push(entry)
    if (classification.status === 'prohibited') prohibited.push(entry)
  }

  return { allowed, flagged, prohibited }
}

function formatJsonReport(report) {
  return JSON.stringify(report, null, 2)
}

function formatMarkdownReport(report) {
  const lines = ['# Dependency License Report\n']

  const total =
    report.allowed.length + report.flagged.length + report.prohibited.length
  lines.push(`*Scanned ${total} package(s)*\n`)

  if (report.prohibited.length > 0) {
    lines.push('## Prohibited')
    lines.push('| Package | Version | License | Reason |')
    lines.push('|---|---|---|---|')
    for (const item of report.prohibited) {
      lines.push(
        `| ${item.name} | ${item.version ?? '—'} | ${item.license ?? '—'} | ${item.reason} |`,
      )
    }
    lines.push('')
  }

  if (report.flagged.length > 0) {
    lines.push('## Flagged for review')
    lines.push('| Package | Version | License | Reason |')
    lines.push('|---|---|---|---|')
    for (const item of report.flagged) {
      lines.push(
        `| ${item.name} | ${item.version ?? '—'} | ${item.license ?? '—'} | ${item.reason} |`,
      )
    }
    lines.push('')
  }

  if (report.allowed.length > 0) {
    lines.push('## Allowed')
    lines.push('| Package | Version | License |')
    lines.push('|---|---|---|')
    for (const item of report.allowed) {
      lines.push(
        `| ${item.name} | ${item.version ?? '—'} | ${item.license ?? '—'} |`,
      )
    }
    lines.push('')
  }

  return lines.join('\n')
}

function printReport(report, format) {
  if (format === 'json') {
    console.log(formatJsonReport(report))
    return
  }

  if (format === 'markdown') {
    console.log(formatMarkdownReport(report))
    return
  }

  const total =
    report.allowed.length + report.flagged.length + report.prohibited.length
  console.log(`\n📋 Dependency license check — ${total} package(s) scanned:`)

  if (report.prohibited.length > 0) {
    console.log(`\n   Prohibited (${report.prohibited.length}):`)
    for (const item of report.prohibited) {
      console.log(
        `     ❌ ${item.name}@${item.version ?? '?'} — ${item.license ?? 'no license'} (${item.reason})`,
      )
    }
  }

  if (report.flagged.length > 0) {
    console.log(`\n   Flagged for review (${report.flagged.length}):`)
    for (const item of report.flagged) {
      console.log(
        `     ⚠️  ${item.name}@${item.version ?? '?'} — ${item.license ?? 'no license'} (${item.reason})`,
      )
    }
  }

  if (report.allowed.length > 0) {
    console.log(`\n   Allowed (${report.allowed.length}):`)
    for (const item of report.allowed) {
      console.log(
        `     ✅ ${item.name}@${item.version ?? '?'} — ${item.license}`,
      )
    }
  }

  console.log()
}

// ---------------------------------------------------------------------------
// Main entry point.
// ---------------------------------------------------------------------------

function main(argv = process.argv.slice(2)) {
  const {
    isFail,
    isSilent,
    isTransitive: _isTransitive,
    format,
    singlePackage,
  } = parseCliArgs(argv)

  let packages
  if (singlePackage) {
    const atIndex = singlePackage.indexOf('@')
    const hasScope = singlePackage.startsWith('@')
    let name
    let version = null
    if (hasScope) {
      const withoutAt = singlePackage.slice(1)
      const innerAt = withoutAt.indexOf('@')
      if (innerAt === -1) {
        name = singlePackage
      } else {
        name = `@${withoutAt.slice(0, innerAt)}`
        version = withoutAt.slice(innerAt + 1)
      }
    } else {
      name = atIndex === -1 ? singlePackage : singlePackage.slice(0, atIndex)
      version = atIndex === -1 ? null : singlePackage.slice(atIndex + 1)
    }
    const match = findPackageInLockfile(name, version)
    if (!match) {
      if (!isSilent)
        console.error(`Package not found in lockfile: ${singlePackage}`)
      return exitImpl ? (exitImpl(1) ?? 1) : 1
    }
    packages = [match]
  } else {
    packages = readLockfilePackages()
  }

  if (packages.length === 0) {
    if (!isSilent) console.log('No packages found to scan.')
    return 0
  }

  const report = buildReport(packages)

  if (!isSilent) {
    printReport(report, format)
  }

  const hasProhibited = report.prohibited.length > 0
  const hasUnknown = report.flagged.some((item) =>
    item.reason?.startsWith('unknown'),
  )
  const hasMissing = report.flagged.some((item) =>
    item.reason?.startsWith('missing'),
  )

  if (isFail && (hasProhibited || hasUnknown || hasMissing)) {
    return 1
  }

  return 0
}

if (require.main === module) {
  try {
    const code = main()
    if (exitImpl) {
      exitImpl(code)
    } else {
      process.exit(code)
    }
  } catch (err) {
    console.error(`\nLicense check failed: ${err.message}`)
    if (exitImpl) {
      exitImpl(1)
    } else {
      process.exit(1)
    }
  }
}

module.exports = {
  main,
  parseCliArgs,
  classifyLicense,
  classifySingleLicense,
  normalizeLicense,
  readLockfilePackages,
  buildReport,
  setImpls,
  resetImpls,
}
