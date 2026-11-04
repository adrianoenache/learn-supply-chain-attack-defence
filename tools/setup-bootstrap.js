#!/usr/bin/env node
'use strict'

// Bootstrap helper for the very first setup of a defence-enabled project.
// The main `npm run setup` script uses `npm ci`, which fails if no
// package-lock.json exists. This helper detects that scenario and performs
// a controlled first install that still respects the project's security
// policies (ignore-scripts, save-exact, audit, min-release-age).
//
// Usage:
//   node ./tools/setup-bootstrap.js
//
// Behavior:
//   - If package-lock.json already exists, exits with code 0 and instructs
//     the user to run `npm run setup`.
//   - If package-lock.json is missing, runs a one-time bootstrap:
//       npm install --ignore-scripts --save-exact
//       npm run defence:pkg-age-check
//       npm audit signatures
//       npm audit --audit-level=high
//   - The generated lock file must be reviewed and committed.

const { spawnSync } = require('node:child_process')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { performance } = require('node:perf_hooks')

const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))
const processMonitor = require(
  path.resolve(__dirname, './lib/process-monitor.js'),
)
const installMonitorReport = require(
  path.resolve(__dirname, './lib/install-monitor-report.js'),
)

const LOCK_FILE = path.resolve(process.cwd(), 'package-lock.json')
const PRE_COMMIT_PATH = path.resolve(process.cwd(), '.husky/pre-commit')
const PACKAGE_JSON_PATH = path.resolve(process.cwd(), 'package.json')

// Dependency-injection hook for tests so loadConfig can return a controlled value.
let loadConfigImpl = loadConfig
function setLoadConfigImpl(fn) {
  loadConfigImpl = fn
}
function resetLoadConfigImpl() {
  loadConfigImpl = loadConfig
}

// Exposed for tests so spawnSync calls can be mocked without patching the global child_process module.
let spawnSyncImpl = spawnSync
function setSpawnSyncImpl(fn) {
  spawnSyncImpl = fn
}
function resetSpawnSyncImpl() {
  spawnSyncImpl = spawnSync
}

// Dependency-injection hooks for the process monitor and report writer.
let processMonitorImpl = processMonitor
let installMonitorReportImpl = installMonitorReport
function setProcessMonitorImpl(impl) {
  processMonitorImpl = impl
}
function resetProcessMonitorImpl() {
  processMonitorImpl = processMonitor
}
function setInstallMonitorReportImpl(impl) {
  installMonitorReportImpl = impl
}
function resetInstallMonitorReportImpl() {
  installMonitorReportImpl = installMonitorReport
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function readPackageJson() {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'))
}

function writePackageJson(pkg) {
  fs.writeFileSync(PACKAGE_JSON_PATH, `${JSON.stringify(pkg, null, 2)}\n`)
}

function recordPreCommitHash() {
  if (!fs.existsSync(PRE_COMMIT_PATH)) {
    throw new Error(
      `Cannot record pre-commit hash: hook not found at ${PRE_COMMIT_PATH}`,
    )
  }

  const hash = sha256File(PRE_COMMIT_PATH)
  const pkg = readPackageJson()
  pkg.defences = pkg.defences ?? {}
  pkg.defences.huskyPreCommitHash = hash
  // Keep legacy top-level field in sync for backwards compatibility.
  pkg.huskyPreCommitHash = hash
  writePackageJson(pkg)
  console.log(`✅ Recorded pre-commit hook hash: ${hash}`)
  return hash
}

function verifyPreCommitHook() {
  const config = loadConfigImpl()
  const expectedHash = config.huskyPreCommitHash
  if (!expectedHash) {
    console.log(
      'ℹ️  No huskyPreCommitHash configured; skipping hook integrity check.',
    )
    return true
  }

  if (!fs.existsSync(PRE_COMMIT_PATH)) {
    throw new Error(`Pre-commit hook not found at ${PRE_COMMIT_PATH}`)
  }

  const actualHash = sha256File(PRE_COMMIT_PATH)
  if (actualHash !== expectedHash) {
    throw new Error(
      `Pre-commit hook integrity check failed: expected ${expectedHash}, found ${actualHash}. ` +
        'The hook may have been modified outside the normal workflow.',
    )
  }

  console.log('✅ Pre-commit hook integrity verified.')
  return true
}

function runCmd(label, cmd, args, opts = {}) {
  console.log(`\n${label}: ${cmd} ${args.join(' ')}`)
  const result = spawnSyncImpl(cmd, args, {
    stdio: 'inherit',
    shell: false,
    ...opts,
  })
  if (result.status !== 0) {
    const reason =
      result.status === null
        ? `killed by signal ${result.signal}`
        : `exited with code ${result.status}`
    throw new Error(`${label} failed (${reason}).`)
  }
}

function main() {
  if (fs.existsSync(LOCK_FILE)) {
    console.log('package-lock.json already exists.')
    console.log('Run `npm run setup` instead of the bootstrap script.')
    return 0
  }

  console.log('No package-lock.json found. Running controlled first install...')
  console.log('This generates a lock file without executing lifecycle scripts.')

  const installArgs = ['install', '--ignore-scripts', '--save-exact']
  const installStartTime = performance.now()
  processMonitorImpl.startMonitoring()
  try {
    runCmd('First install', 'npm', installArgs, {
      env: { ...process.env, NPM_CONFIG_PACKAGE_LOCK: 'true' },
    })
  } finally {
    processMonitorImpl.stopMonitoring()
  }
  const installDurationMs = performance.now() - installStartTime

  const config = loadConfigImpl()
  const monitoringConfig = config.lifecycleMonitoring ?? {}
  if (monitoringConfig.enabled !== false) {
    const monitoredEvents = processMonitorImpl.getEvents()
    const reportPath =
      monitoringConfig.reportFile ??
      path.resolve(process.cwd(), 'lifecycle-monitor-report.md')
    const reportContent = installMonitorReportImpl.buildMarkdownReport(
      `npm ${installArgs.join(' ')}`,
      monitoredEvents,
      0,
      installDurationMs,
    )
    fs.writeFileSync(reportPath, reportContent, 'utf8')
    const lifecycleCount = monitoredEvents.filter((e) =>
      e.labels.includes('lifecycle'),
    ).length
    console.log(
      `\nInstall monitor: ${monitoredEvents.length} event(s), ${lifecycleCount} lifecycle script(s). Report: ${reportPath}`,
    )
    if (monitoringConfig.failOnLifecycle === true && lifecycleCount > 0) {
      console.error(
        '\nBootstrap aborted — lifecycle scripts were spawned and lifecycleMonitoring.failOnLifecycle is enabled.',
      )
      return 1
    }
  }
  processMonitorImpl.clearEvents()

  runCmd('Package age check', 'npm', ['run', 'defence:pkg-age-check'])
  runCmd('Signature verification', 'npm', ['audit', 'signatures'])
  runCmd('Vulnerability audit', 'npm', ['audit', '--audit-level=high'])

  // Install the husky hook after the controlled install (ignore-scripts skipped prepare).
  runCmd('Install husky hook', 'npm', ['run', 'prepare'])

  recordPreCommitHash()
  verifyPreCommitHook()

  console.log('\nBootstrap complete.')
  console.log(
    'Review package.json and package-lock.json, then commit both files.',
  )
  return 0
}

if (require.main === module) {
  try {
    const code = main()
    process.exit(code)
  } catch (err) {
    console.error(`\nBootstrap failed: ${err.message}`)
    process.exit(1)
  }
}

module.exports = {
  main,
  setSpawnSyncImpl,
  resetSpawnSyncImpl,
  setLoadConfigImpl,
  resetLoadConfigImpl,
  setProcessMonitorImpl,
  resetProcessMonitorImpl,
  setInstallMonitorReportImpl,
  resetInstallMonitorReportImpl,
}
