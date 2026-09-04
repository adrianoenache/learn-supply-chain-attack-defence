#!/usr/bin/env node
'use strict'

// Trust score dashboard CLI.
//
// Aggregates supply-chain risk signals for the project's dependencies and
// produces a Markdown report (default), JSON, or an ASCII table.
//
// Usage:
//   npm run defence:trust-report
//   npm run defence:trust-report -- --format=json
//   npm run defence:trust-report -- --pkg=lodash@4.17.21
//   npm run defence:trust-report -- --fail

const fs = require('node:fs')
const path = require('node:path')

const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))
const { parsePackageArg } = require(
  path.resolve(__dirname, './lib/package-utils.js'),
)
const { withProfile } = require(path.resolve(__dirname, './lib/profiler.js'))
const {
  analyzePackages,
  buildTableReport,
  buildMarkdownReport,
  buildJsonReport,
} = require(path.resolve(__dirname, './lib/trust-engine.js'))

const REPO_ROOT = process.cwd()
const PACKAGE_JSON_PATH = path.resolve(REPO_ROOT, 'package.json')
const LOCKFILE_PATH = path.resolve(REPO_ROOT, 'package-lock.json')
const UPDATE_CHECK_STATE_PATH = path.resolve(
  REPO_ROOT,
  '.defence-update-check-state.json',
)

// ---------------------------------------------------------------------------
// Dependency injection hooks — exposed for tests.
// ---------------------------------------------------------------------------

let fsImpl = fs
let loadConfigImpl = loadConfig
let analyzePackagesImpl = analyzePackages
let exitImpl = process.exit
let consoleLogImpl = console.log
let consoleErrorImpl = console.error

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.loadConfig) loadConfigImpl = impls.loadConfig
  if (impls.analyzePackages) analyzePackagesImpl = impls.analyzePackages
  if (impls.exit) exitImpl = impls.exit
  if (impls.consoleLog) consoleLogImpl = impls.consoleLog
  if (impls.consoleError) consoleErrorImpl = impls.consoleError
}

function resetImpls() {
  fsImpl = fs
  loadConfigImpl = loadConfig
  analyzePackagesImpl = analyzePackages
  exitImpl = process.exit
  consoleLogImpl = console.log
  consoleErrorImpl = console.error
}

// ---------------------------------------------------------------------------
// CLI argument parsing.
// ---------------------------------------------------------------------------

function parseCliArgs(argv = process.argv.slice(2)) {
  const isTransitive = argv.includes('--transitive')
  const isDirect = argv.includes('--direct')
  const isFail = argv.includes('--fail')
  const isSilent = argv.includes('--silent')

  const formatArg = argv.find((arg) => arg.startsWith('--format='))
  const format = formatArg?.slice('--format='.length) ?? 'table'
  const validFormats = ['table', 'json', 'markdown']
  if (!validFormats.includes(format)) {
    throw new Error(
      `Invalid format "${format}". Use one of: ${validFormats.join(', ')}.`,
    )
  }

  const outputArg = argv.find((arg) => arg.startsWith('--output='))
  const outputPath = outputArg?.slice('--output='.length) ?? null

  const pkgArg = argv.find((arg) => arg.startsWith('--pkg='))
  const singlePackage = pkgArg?.slice('--pkg='.length) ?? null

  return {
    isTransitive,
    isDirect,
    isFail,
    isSilent,
    format,
    outputPath,
    singlePackage,
  }
}

// ---------------------------------------------------------------------------
// Dependency resolution.
// ---------------------------------------------------------------------------

function readJsonSafe(filePath) {
  try {
    const content = fsImpl.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

function readLockfilePackages(lockfilePath) {
  const lockfile = readJsonSafe(lockfilePath)
  if (!lockfile?.packages) return []

  const entries = []
  for (const [key, value] of Object.entries(lockfile.packages)) {
    if (!key.startsWith('node_modules/')) continue
    const name = key.slice(
      key.lastIndexOf('node_modules/') + 'node_modules/'.length,
    )
    entries.push({
      name,
      version: value.version ?? null,
      license: value.license ?? null,
    })
  }
  return entries
}

function buildDeps({ isDirect, singlePackage }) {
  if (singlePackage) {
    const { name, version } = parsePackageArg(singlePackage)
    if (!version) {
      consoleErrorImpl(
        `Error: --pkg requires an exact version. Use: --pkg ${name}@x.y.z`,
      )
      exitImpl(1)
    }
    return [[name, version]]
  }

  if (isDirect) {
    const pkg = readJsonSafe(PACKAGE_JSON_PATH)
    const deps = {
      ...pkg?.dependencies,
      ...pkg?.devDependencies,
      ...pkg?.peerDependencies,
      ...pkg?.optionalDependencies,
    }
    // Direct mode still needs exact versions; resolve from lockfile when possible.
    const lockPackages = readLockfilePackages(LOCKFILE_PATH)
    const resolved = new Map(lockPackages.map((p) => [p.name, p.version]))
    return Object.entries(deps)
      .map(([name, range]) => [name, resolved.get(name) ?? range])
      .filter(([, version]) => version !== undefined && version !== null)
  }

  // Default/transitive: read all installed packages from package-lock.json.
  const lockPackages = readLockfilePackages(LOCKFILE_PATH)
  return lockPackages
    .filter((p) => p.version !== null)
    .map((p) => [p.name, p.version])
}

function buildExistingNames() {
  const pkg = readJsonSafe(PACKAGE_JSON_PATH)
  const lockPackages = readLockfilePackages(LOCKFILE_PATH)
  const declared = [
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {}),
    ...Object.keys(pkg?.peerDependencies ?? {}),
    ...Object.keys(pkg?.optionalDependencies ?? {}),
  ]
  const installed = lockPackages.map((p) => p.name)
  return Array.from(new Set([...declared, ...installed]))
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------

async function main(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv)
  const config = loadConfigImpl()
  const trustConfig = config.trustReport ?? {}

  const packages = buildDeps(args)
  if (packages.length === 0) {
    if (!args.isSilent) consoleLogImpl('No packages to analyze.')
    return exitImpl(0)
  }

  const existingNames = buildExistingNames()
  const lockPackages = readLockfilePackages(LOCKFILE_PATH)
  const updateCheckState = readJsonSafe(UPDATE_CHECK_STATE_PATH)

  const options = {
    concurrency: trustConfig.concurrency ?? 10,
    registryTimeoutMs: trustConfig.registryTimeoutMs ?? 10000,
    cacheTtlHours: trustConfig.cacheTtlHours ?? 24,
    maxResponseMB: trustConfig.maxResponseMB ?? 20,
    typosquattingThreshold: config.defences?.typosquattingThreshold ?? 2,
    scoringWeights: trustConfig.scoringWeights,
    thresholds: {
      trustedMin: trustConfig.thresholds?.trustedMin ?? 70,
      reviewRequiredMin: trustConfig.thresholds?.reviewRequiredMin ?? 40,
    },
  }

  const report = await withProfile('generate-trust-report', async () =>
    analyzePackagesImpl(packages, {
      options,
      existingNames,
      lockPackages,
      updateCheckState,
    }),
  )

  const outputPath =
    args.outputPath ?? trustConfig.outputFile ?? 'trust-report.md'

  if (args.format === 'json') {
    if (!args.isSilent) consoleLogImpl(buildJsonReport(report))
  } else if (args.format === 'markdown') {
    const markdown = buildMarkdownReport(report)
    fsImpl.writeFileSync(path.resolve(REPO_ROOT, outputPath), markdown)
    if (!args.isSilent) consoleLogImpl(markdown)
  } else {
    if (!args.isSilent) consoleLogImpl(buildTableReport(report))
  }

  const minScore = trustConfig.minScore ?? 60
  if (args.isFail && report.summary.lowestScore < minScore) {
    consoleErrorImpl(
      `Trust score check failed: lowest score ${report.summary.lowestScore} is below ${minScore}.`,
    )
    return exitImpl(1)
  }

  return exitImpl(0)
}

module.exports = {
  parseCliArgs,
  buildDeps,
  buildExistingNames,
  setImpls,
  resetImpls,
  main,
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
