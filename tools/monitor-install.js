#!/usr/bin/env node
'use strict'

// Standalone CLI to run `npm install` or `npm ci` under process monitoring.
//
// Usage:
//   npm run defence:install-monitored -- npm install <args...>
//   npm run defence:install-monitored -- npm ci
//   npm run defence:install-monitored -- npm install --save-exact lodash@4.17.21 --output=report.md
//
// The command after the script name must be `npm install` or `npm ci`.
// The monitor records every child process spawned during the install and writes
// a Markdown or JSON report.

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
const { performance } = require('node:perf_hooks')

const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))
const processMonitor = require(
  path.resolve(__dirname, './lib/process-monitor.js'),
)
const reportFormatter = require(
  path.resolve(__dirname, './lib/install-monitor-report.js'),
)

// DI hooks for tests.
let spawnSyncImpl = spawnSync
let fsImpl = fs
let processImpl = process
let performanceImpl = performance
let consoleImpl = console
let processMonitorImpl = processMonitor

function setImpls(impls) {
  if (impls.spawnSync) spawnSyncImpl = impls.spawnSync
  if (impls.fs) fsImpl = impls.fs
  if (impls.process) processImpl = impls.process
  if (impls.performance) performanceImpl = impls.performance
  if (impls.console) consoleImpl = impls.console
  if (impls.processMonitor) processMonitorImpl = impls.processMonitor
}

function resetImpls() {
  spawnSyncImpl = spawnSync
  fsImpl = fs
  processImpl = process
  performanceImpl = performance
  consoleImpl = console
  processMonitorImpl = processMonitor
}

const ALLOWED_COMMANDS = new Set(['install', 'i', 'ci', 'add', 'rebuild'])

function parseCliArgs(argv) {
  const args = argv.slice()
  const options = {
    output: null,
    format: 'markdown',
    silent: false,
    failOnLifecycle: false,
    commandArgs: [],
  }

  while (args.length > 0) {
    const arg = args[0]
    if (arg === '--output' || arg.startsWith('--output=')) {
      const value = arg.startsWith('--output=')
        ? arg.slice('--output='.length)
        : args.splice(0, 2)[1]
      options.output = value
      if (arg === '--output') args.shift()
      args.shift()
      continue
    }
    if (arg === '--format' || arg.startsWith('--format=')) {
      const value = arg.startsWith('--format=')
        ? arg.slice('--format='.length)
        : args.splice(0, 2)[1]
      options.format = value
      if (arg === '--format') args.shift()
      args.shift()
      continue
    }
    if (arg === '--silent') {
      options.silent = true
      args.shift()
      continue
    }
    if (arg === '--fail-on-lifecycle') {
      options.failOnLifecycle = true
      args.shift()
      continue
    }
    options.commandArgs.push(arg)
    args.shift()
  }

  return options
}

function validateCommand(commandArgs) {
  if (commandArgs.length < 2) {
    return { valid: false, reason: 'Missing command to monitor.' }
  }

  const [bin, subcommand] = commandArgs
  const normalizedBin = path.basename(bin).toLowerCase()
  if (normalizedBin !== 'npm' && normalizedBin !== 'npm.cmd') {
    return {
      valid: false,
      reason: `Only npm commands can be monitored, found "${bin}".`,
    }
  }

  const normalizedSub = (subcommand ?? '').toLowerCase()
  if (!ALLOWED_COMMANDS.has(normalizedSub)) {
    return {
      valid: false,
      reason: `Only npm install/ci/add/rebuild can be monitored, found "${subcommand}".`,
    }
  }

  return { valid: true }
}

function writeReport(reportPath, content) {
  const dir = path.dirname(reportPath)
  if (!fsImpl.existsSync(dir)) {
    fsImpl.mkdirSync(dir, { recursive: true })
  }
  fsImpl.writeFileSync(reportPath, content, 'utf8')
}

function main(argv = processImpl.argv.slice(2), exitFn = processImpl.exit) {
  const config = loadConfig()
  const monitoringConfig = config.lifecycleMonitoring ?? {}
  const defaultOutput =
    monitoringConfig.reportFile ??
    path.resolve(processImpl.cwd(), 'lifecycle-monitor-report.md')

  const options = parseCliArgs(argv)
  const outputPath = options.output ?? defaultOutput

  if (options.commandArgs.length === 0) {
    consoleImpl.error('Error: missing command to monitor.')
    consoleImpl.error(
      'Usage: npm run defence:install-monitored -- npm install [args...]',
    )
    consoleImpl.error('       npm run defence:install-monitored -- npm ci')
    exitFn(1)
    return
  }

  const validation = validateCommand(options.commandArgs)
  if (!validation.valid) {
    consoleImpl.error(`Error: ${validation.reason}`)
    exitFn(1)
    return
  }

  const [bin, ...binArgs] = options.commandArgs
  const monitoredCommand = `${bin} ${binArgs.join(' ')}`

  consoleImpl.log(`\nMonitoring: ${monitoredCommand}\n`)

  processMonitorImpl.startMonitoring()
  const startTime = performanceImpl.now()
  const result = spawnSyncImpl(bin, binArgs, {
    stdio: 'inherit',
    shell: false,
    env: processImpl.env,
  })
  const durationMs = performanceImpl.now() - startTime
  processMonitorImpl.stopMonitoring()

  const events = processMonitorImpl.getEvents()
  const monitoredExitCode = result?.status ?? null

  const reportContent =
    options.format === 'json'
      ? reportFormatter.buildJsonReport(
          monitoredCommand,
          events,
          monitoredExitCode,
          durationMs,
        )
      : reportFormatter.buildMarkdownReport(
          monitoredCommand,
          events,
          monitoredExitCode,
          durationMs,
        )

  writeReport(outputPath, reportContent)

  if (!options.silent) {
    consoleImpl.log(`\nReport written to: ${outputPath}`)
    const lifecycleCount = events.filter((e) =>
      e.labels.includes('lifecycle'),
    ).length
    consoleImpl.log(
      `Recorded ${events.length} event(s), ${lifecycleCount} lifecycle script(s).`,
    )
  }

  let exitCode = monitoredExitCode ?? 0
  if (
    options.failOnLifecycle &&
    events.some((e) => e.labels.includes('lifecycle'))
  ) {
    if (!options.silent) {
      consoleImpl.error(
        '\nError: lifecycle scripts were spawned and --fail-on-lifecycle is set.',
      )
    }
    exitCode = 1
  }

  processMonitorImpl.clearEvents()
  exitFn(exitCode)
}

if (require.main === module) {
  main()
}

module.exports = {
  main,
  parseCliArgs,
  validateCommand,
  setImpls,
  resetImpls,
}
