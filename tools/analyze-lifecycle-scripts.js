#!/usr/bin/env node
'use strict'

// CLI for static analysis of npm package lifecycle scripts.
//
// Fetches the version manifest from the registry, extracts lifecycle hooks
// (preinstall, install, postinstall, prepare, etc.) and reports risky patterns
// such as network calls, shell execution, dynamic evaluation and filesystem writes.
//
// Usage:
//   node ./tools/analyze-lifecycle-scripts.js --pkg=name@version
//   node ./tools/analyze-lifecycle-scripts.js --pkg=name@version --format=json
//   node ./tools/analyze-lifecycle-scripts.js --pkg=name@version --fail

const path = require('node:path')

const { fetchRegistryJson } = require(
  path.resolve(__dirname, './lib/registry-cache.js'),
)
const { parsePackageArg } = require(
  path.resolve(__dirname, './lib/package-utils.js'),
)
const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))
const {
  analyzeManifest,
  aggregateResults,
  buildFindingsTable,
  buildSummaryTable,
} = require(path.resolve(__dirname, './lib/script-analyzer.js'))

let fetchRegistryJsonImpl = fetchRegistryJson
let exitImpl = process.exit

function setImpls(impls) {
  if (impls.fetchRegistryJson) fetchRegistryJsonImpl = impls.fetchRegistryJson
  if (impls.exit) exitImpl = impls.exit
}

function resetImpls() {
  fetchRegistryJsonImpl = fetchRegistryJson
  exitImpl = process.exit
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const pkgArg = argv
    .find((arg) => arg.startsWith('--pkg='))
    ?.slice('--pkg='.length)
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

  return { pkgArg, isFail, isSilent, format }
}

function printUsage() {
  console.log('Usage:')
  console.log(
    '  node ./tools/analyze-lifecycle-scripts.js --pkg=name@version [--fail] [--format=table|json|markdown]',
  )
  console.log('Examples:')
  console.log('  node ./tools/analyze-lifecycle-scripts.js --pkg=sharp@0.33.5')
  console.log(
    '  node ./tools/analyze-lifecycle-scripts.js --pkg=lodash@4.17.21 --format=json',
  )
}

async function fetchVersionManifest(name, version) {
  const cfg = loadConfig()
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
  return fetchRegistryJsonImpl(name, version, {
    url,
    cacheTtlHours: cfg.updateCheck.cacheTtlHours,
    maxResponseBytes: cfg.pkgAgeCheck.maxResponseMB * 1024 * 1024,
    timeoutMs: cfg.pkgAgeCheck.registryTimeoutMs,
    retryMaxAttempts: cfg.updateCheck.retryMaxAttempts,
    retryInitialDelayMs: cfg.updateCheck.retryInitialDelayMs,
    retryBackoffMultiplier: cfg.updateCheck.retryBackoffMultiplier,
    retryMaxDelayMs: cfg.updateCheck.retryMaxDelayMs,
    acceptGzip: true,
  })
}

function formatReport(results, format) {
  if (format === 'json') {
    return JSON.stringify(
      { summary: aggregateResults(results), results },
      null,
      2,
    )
  }

  if (format === 'markdown') {
    const summary = aggregateResults(results)
    const lines = [
      '# Lifecycle script analysis report',
      '',
      `- **Packages analyzed:** ${summary.totalPackages}`,
      `- **Packages with lifecycle scripts:** ${summary.packagesWithScripts}`,
      `- **Overall risk level:** ${summary.riskLevel.toUpperCase()}`,
      `- **Findings:** ${summary.totalFindings}`,
      '',
      buildFindingsTable(results),
    ]
    return lines.join('\n')
  }

  return [buildSummaryTable(results), '', buildFindingsTable(results)].join(
    '\n',
  )
}

async function main(argv = process.argv.slice(2)) {
  const { pkgArg, isFail, isSilent, format } = parseCliArgs(argv)

  if (!pkgArg) {
    printUsage()
    exitImpl(1)
    return
  }

  const { name, version } = parsePackageArg(pkgArg)
  if (!version) {
    console.error(`Error: exact version required. Got "${pkgArg}".`)
    exitImpl(1)
    return
  }

  try {
    const manifest = await fetchVersionManifest(name, version)
    const result = analyzeManifest(name, version, manifest)
    const results = [result]

    if (!isSilent) {
      console.log(formatReport(results, format))
    }

    if (isFail && result.riskLevel === 'high') {
      exitImpl(1)
      return
    }

    exitImpl(0)
  } catch (err) {
    console.error(`Error analyzing ${pkgArg}: ${err.message}`)
    exitImpl(1)
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`Unexpected error: ${err.message}`)
    process.exit(1)
  })
}

module.exports = {
  parseCliArgs,
  fetchVersionManifest,
  formatReport,
  main,
  setImpls,
  resetImpls,
}
