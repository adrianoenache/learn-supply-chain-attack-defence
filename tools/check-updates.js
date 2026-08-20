#!/usr/bin/env node
'use strict'

// Defense Layer 8 — Update availability check.
// Read-only pre-commit helper that warns developers when dependency updates
// are available, classifies them by safety (eligible vs quarantine), and never
// installs anything automatically.
//
// Usage:
//   npm run defence:update-check            — run the check
//   npm run defence:update-check -- --force — ignore cache and rescan
//   npm run defence:update-check -- --silent — suppress non-error output
//   npm run defence:update-check -- --offline — rely only on local cache, no network calls
//
// Before scanning the registry, the script verifies that node_modules is in
// sync with package-lock.json. If it is not, it recommends `npm ci` first.
// This prevents a developer from acting on update alerts while still running
// stale packages (e.g. after pulling another collaborator's changes).

const fs = require('node:fs')
const https = require('node:https')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const {
  isNodeModulesInSync,
  readLockfileHash,
  setImpls: setSyncImpls,
  resetImpls: resetSyncImpls,
} = require(path.resolve(__dirname, './lib/sync-check.js'))

// Reads the project manifest. Only native modules are used so this script can
// run before any installation is complete.
const pkg = require(path.resolve(__dirname, '../package.json'))

// Configuration block, kept next to pkgAgeCheck in package.json.
const config = pkg.updateCheck ?? {}

// Minimum age for a new release to be considered safe to update to.
// Falls back to pkgAgeCheck.minAgeDays, then to the .npmrc min-release-age
// value (7 days in this project). Keeps all age-based defenses aligned.
const MIN_AGE_DAYS =
  config.minAgeDays ??
  pkg.pkgAgeCheck?.minAgeDays ??
  resolveNpmrcMinReleaseAge() ??
  7

// How often (in days) the reminder should be shown when alwaysRemind is false.
const REMIND_EVERY_DAYS = config.remindEveryDays ?? 1

// If true, the alert is shown on every run when updates exist.
const ALWAYS_REMIND = config.alwaysRemind ?? false

// Whether to include transitive dependencies in the outdated check.
const INCLUDE_TRANSITIVE = config.includeTransitive ?? false

// Network timeout for registry calls, to keep pre-commit fast.
const REGISTRY_TIMEOUT_MS = config.registryTimeoutMs ?? 10000

// How long cached results remain valid before a rescan is needed.
const CACHE_TTL_HOURS = config.cacheTtlHours ?? 24

// Maximum response size per registry call (20 MB), mirroring check-package-age.js.
const MAX_RESPONSE_BYTES = 20 * 1024 * 1024

// Maximum concurrent registry queries, mirroring check-package-age.js.
const CONCURRENCY = 10

// Historical scan tracking settings.
const HISTORY_MAX_ENTRIES = config.historyMaxEntries ?? 30
const STUCK_IN_QUARANTINE_THRESHOLD = config.stuckInQuarantineThreshold ?? 3
const HIGH_RELEASE_CADENCE_DAYS = config.highReleaseCadenceDays ?? 7

// Local state file; never committed (see .gitignore).
const STATE_FILE = path.resolve(__dirname, '../.defence-update-check.json')

// ---------------------------------------------------------------------------
// Dependency injection hooks — exposed for tests.
// ---------------------------------------------------------------------------

let fsImpl = fs
let httpsGetImpl = https.get
let spawnSyncImpl = spawnSync
let nowImpl = () => Date.now()
let exitImpl = process.exit

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.httpsGet) httpsGetImpl = impls.httpsGet
  if (impls.spawnSync) spawnSyncImpl = impls.spawnSync
  if (impls.now) nowImpl = impls.now
  if (impls.exit) exitImpl = impls.exit
  setSyncImpls({
    fs: impls.fs,
    spawnSync: impls.spawnSync,
  })
}

function resetImpls() {
  fsImpl = fs
  httpsGetImpl = https.get
  spawnSyncImpl = spawnSync
  nowImpl = () => Date.now()
  exitImpl = process.exit
  resetSyncImpls()
}

// ---------------------------------------------------------------------------
// CLI argument parsing.
// ---------------------------------------------------------------------------

function parseCliArgs(argv = process.argv.slice(2)) {
  const isForce = argv.includes('--force')
  const isSilent = argv.includes('--silent')
  const isOffline = argv.includes('--offline')

  const formatArg = argv.find((arg) => arg.startsWith('--format='))
  const format = formatArg?.slice('--format='.length) ?? 'table'
  const validFormats = ['table', 'json', 'markdown']
  if (!validFormats.includes(format)) {
    throw new Error(
      `Invalid format "${format}". Use one of: ${validFormats.join(', ')}.`,
    )
  }

  return { isForce, isSilent, isOffline, format }
}

// ---------------------------------------------------------------------------
// Utility helpers.
// ---------------------------------------------------------------------------

function daysBetween(a, b) {
  return (b - a) / (1000 * 60 * 60 * 24)
}

function readJsonSafe(filePath) {
  try {
    const content = fsImpl.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

function writeJson(filePath, data) {
  fsImpl.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function resolveNpmrcMinReleaseAge() {
  try {
    const npmrcPath = path.resolve(__dirname, '../.npmrc')
    const content = fs.readFileSync(npmrcPath, 'utf8')
    const match = content.match(/^min-release-age\s*=\s*(\d+)/m)
    return match ? Number.parseInt(match[1], 10) : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Outdated dependency discovery.
// ---------------------------------------------------------------------------

function runNpmOutdated() {
  const args = INCLUDE_TRANSITIVE
    ? ['outdated', '--json', '--all']
    : ['outdated', '--json']
  const result = spawnSyncImpl('npm', args, {
    encoding: 'utf8',
    shell: false,
  })

  if (result.status !== 0 && result.stderr?.includes('ERR_OUTDATED')) {
    return {}
  }

  const stdout = result.stdout?.trim()
  if (!stdout) return {}

  try {
    return JSON.parse(stdout)
  } catch {
    return {}
  }
}

function determineSeverity(current, latest) {
  const currentParts = current.split('.').map(Number)
  const latestParts = latest.split('.').map(Number)

  if (latestParts[0] !== currentParts[0]) return 'major'
  if (latestParts[1] !== currentParts[1]) return 'minor'
  return 'patch'
}

// ---------------------------------------------------------------------------
// Registry interaction.
// ---------------------------------------------------------------------------

function fetchRegistryInfo(name) {
  return new Promise((resolve, reject) => {
    let settled = false
    const safeResolve = (val) => {
      if (!settled) {
        settled = true
        resolve(val)
      }
    }
    const safeReject = (err) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    }

    const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`

    const req = httpsGetImpl(
      url,
      { headers: { Accept: 'application/json' }, timeout: REGISTRY_TIMEOUT_MS },
      (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
          if (Buffer.byteLength(data) > MAX_RESPONSE_BYTES) {
            res.destroy()
            safeReject(
              new Error(`response exceeds ${MAX_RESPONSE_BYTES} bytes`),
            )
          }
        })

        res.on('error', (err) => {
          safeReject(new Error(`stream error: ${err.message}`))
        })

        res.on('end', () => {
          if (res.statusCode !== 200) {
            safeReject(new Error(`HTTP ${res.statusCode}`))
            return
          }
          try {
            const info = JSON.parse(data)
            safeResolve(info)
          } catch (err) {
            safeReject(new Error(`invalid JSON: ${err.message}`))
          }
        })
      },
    )

    req.on('timeout', () => {
      req.destroy()
      safeReject(new Error('timeout'))
    })
    req.on('error', (err) => {
      safeReject(new Error(`network error: ${err.message}`))
    })
  })
}

function buildReleaseLinks(name, version, repositoryUrl) {
  const npmLink = `https://www.npmjs.com/package/${encodeURIComponent(name)}/v/${encodeURIComponent(version)}`
  const links = { npm: npmLink }

  if (!repositoryUrl) return links

  const match = repositoryUrl.match(/github\.com[/:]([^/]+)\/([^/\s.]+)/)
  if (!match) return links

  const [, owner, repo] = match
  const encodedVersion = encodeURIComponent(version)
  const encodedName = encodeURIComponent(name)

  // Common tag patterns in the npm ecosystem. We cannot know the exact tag
  // name used for the GitHub release, so we return the most common candidate
  // and mark the link as external / potentially-broken in the UI.
  const candidates = [
    `v${encodedVersion}`,
    encodedVersion,
    `${encodedName}@${encodedVersion}`,
    `${encodedName}@v${encodedVersion}`,
  ]

  links.release = `https://github.com/${owner}/${repo}/releases/tag/${candidates[0]}`
  links.releaseCandidates = candidates.map(
    (c) => `https://github.com/${owner}/${repo}/releases/tag/${c}`,
  )

  return links
}

async function classifyUpdate(name, data) {
  const current = data.current
  const wanted = data.wanted
  const latest = data.latest

  try {
    const info = await fetchRegistryInfo(name)
    const published = info.time?.[latest]
    if (!published) {
      throw new Error('no publish date in registry')
    }

    const publishedDate = new Date(published)
    if (Number.isNaN(publishedDate.getTime())) {
      throw new Error('unparseable publish date')
    }

    const daysOld = daysBetween(publishedDate.getTime(), nowImpl())
    const entry = {
      name,
      current,
      wanted,
      latest,
      daysOld,
      severity: determineSeverity(current, latest),
      links: buildReleaseLinks(name, latest, info.repository?.url),
    }

    if (daysOld >= MIN_AGE_DAYS) {
      return { eligible: entry, quarantine: null }
    }

    return {
      eligible: null,
      quarantine: { ...entry, reason: 'too recent' },
    }
  } catch (err) {
    return {
      eligible: null,
      quarantine: {
        name,
        current,
        wanted,
        latest,
        daysOld: null,
        severity: determineSeverity(current, latest),
        reason: `registry lookup failed: ${err.message}`,
        links: buildReleaseLinks(name, latest, null),
      },
    }
  }
}

// ---------------------------------------------------------------------------
// Concurrency helper (same shape as check-package-age.js).
// ---------------------------------------------------------------------------

function runWithConcurrencyLimit(tasks, limit) {
  return new Promise((resolve) => {
    if (tasks.length === 0) return resolve([])
    const results = new Array(tasks.length)
    let started = 0
    let completed = 0

    function runNext() {
      if (started >= tasks.length) return
      const index = started++
      Promise.resolve()
        .then(() => tasks[index]())
        .then(
          (value) => {
            results[index] = { status: 'fulfilled', value }
            onDone()
          },
          (reason) => {
            results[index] = { status: 'rejected', reason }
            onDone()
          },
        )
    }

    function onDone() {
      completed++
      if (completed === tasks.length) {
        resolve(results)
        return
      }
      runNext()
    }

    const initial = Math.min(limit, tasks.length)
    for (let i = 0; i < initial; i++) runNext()
  })
}

// ---------------------------------------------------------------------------
// Cache / reminder logic.
// ---------------------------------------------------------------------------

function loadState() {
  return readJsonSafe(STATE_FILE)
}

function saveState(state) {
  writeJson(STATE_FILE, state)
}

// ---------------------------------------------------------------------------
// Historical scan tracking.
// ---------------------------------------------------------------------------

function buildHistoryEntry(state) {
  return {
    scannedAt: state.lastScan,
    lockfileHash: state.installedLockfileHash,
    eligible: state.eligible.map((item) => ({
      name: item.name,
      current: item.current,
      latest: item.latest,
      severity: item.severity,
      daysOld: item.daysOld,
    })),
    quarantine: state.quarantine.map((item) => ({
      name: item.name,
      current: item.current,
      latest: item.latest,
      severity: item.severity,
      reason: item.reason,
    })),
  }
}

function appendHistory(state) {
  const entry = buildHistoryEntry(state)
  const history = state.history ?? []
  history.push(entry)
  while (history.length > HISTORY_MAX_ENTRIES) {
    history.shift()
  }
  state.history = history
  return state
}

function countPackageOccurrences(history, name, status) {
  return history.reduce((count, entry) => {
    const list = entry[status] ?? []
    return count + (list.some((item) => item.name === name) ? 1 : 0)
  }, 0)
}

function isStuckInQuarantine(history, name) {
  let consecutive = 0
  for (const entry of history.slice().reverse()) {
    const inQuarantine = entry.quarantine?.some((item) => item.name === name)
    const anywhere =
      inQuarantine || entry.eligible?.some((item) => item.name === name)
    if (inQuarantine) {
      consecutive++
    } else if (anywhere) {
      break
    }
  }
  return consecutive >= STUCK_IN_QUARANTINE_THRESHOLD
}

function calculateReleaseCadence(history, name) {
  const appearances = []
  for (const entry of history) {
    const found =
      entry.eligible?.find((item) => item.name === name) ??
      entry.quarantine?.find((item) => item.name === name)
    if (found) {
      appearances.push(new Date(entry.scannedAt).getTime())
    }
  }
  if (appearances.length < 2) return null
  let totalDays = 0
  for (let i = 1; i < appearances.length; i++) {
    totalDays += daysBetween(appearances[i - 1], appearances[i])
  }
  return totalDays / (appearances.length - 1)
}

// ---------------------------------------------------------------------------
// Confidence score.
// ---------------------------------------------------------------------------

function calculateConfidence(entry, history) {
  const { daysOld, severity } = entry

  // Age contributes up to 40 points. Older releases are safer.
  const agePoints = Math.min(40, Math.floor((daysOld ?? 0) / 7) * 10)

  // Semver severity contributes up to 30 points.
  const severityPoints =
    severity === 'patch' ? 30 : severity === 'minor' ? 20 : 0

  // Release cadence can reduce the score by up to 30 points.
  const cadence = calculateReleaseCadence(history, entry.name)
  let cadencePenalty = 0
  if (cadence !== null && cadence < HIGH_RELEASE_CADENCE_DAYS) {
    cadencePenalty = Math.min(
      30,
      Math.floor((HIGH_RELEASE_CADENCE_DAYS - cadence) / 2) * 5,
    )
  }

  const score = Math.max(0, agePoints + severityPoints - cadencePenalty)

  let label
  if (score >= 70) {
    label = 'recommended'
  } else if (score >= 40) {
    label = 'review required'
  } else {
    label = 'high risk'
  }

  return { score, label }
}

function enrichEligibleWithConfidence(eligible, history) {
  return eligible.map((item) => {
    const { score, label } = calculateConfidence(item, history ?? [])
    return { ...item, confidence: score, confidenceLabel: label }
  })
}

function findStuckInQuarantine(state) {
  const history = state.history ?? []
  const stuck = new Set()
  for (const item of state.quarantine) {
    if (isStuckInQuarantine(history, item.name)) {
      stuck.add(item.name)
    }
  }
  return Array.from(stuck).sort()
}

function isCacheValid(state) {
  if (!state?.lastScan) return false
  if (state.installedLockfileHash !== readLockfileHash()) return false
  const ttlMs = CACHE_TTL_HOURS * 60 * 60 * 1000
  return nowImpl() - new Date(state.lastScan).getTime() < ttlMs
}

function shouldRemind(state) {
  if (ALWAYS_REMIND) return true
  if (!state?.lastReminder) return true
  const daysSinceReminder = daysBetween(
    new Date(state.lastReminder).getTime(),
    nowImpl(),
  )
  return daysSinceReminder >= REMIND_EVERY_DAYS
}

// ---------------------------------------------------------------------------
// Output formatting.
// ---------------------------------------------------------------------------

function formatDays(daysOld) {
  if (daysOld === null || daysOld === undefined) return ''
  return `(released ${Math.floor(daysOld)} days ago)`
}

function printSyncWarning(reason) {
  console.log(
    '\n⚠️  Installed dependencies are out of sync with package-lock.json.',
  )
  if (reason) console.log(`   Reason: ${reason}`)
  console.log('   Run the following command before checking for new updates:')
  console.log('     npm ci')
  console.log()
}

function formatJsonReport(state) {
  return JSON.stringify(state, null, 2)
}

function formatMarkdownReport(state) {
  const lines = ['# Dependency Update Report\n']
  lines.push(`*Generated at ${state.lastScan}*\n`)

  if (state.eligible.length > 0) {
    lines.push('## Eligible for update\n')
    lines.push('| Package | Current | Latest | Severity | Age | Confidence |')
    lines.push('|---|---|---|---|---|---|')
    for (const item of state.eligible) {
      const age =
        item.daysOld !== null ? `${Math.floor(item.daysOld)} days` : '—'
      const confidence = `${item.confidenceLabel} (${item.confidence})`
      lines.push(
        `| ${item.name} | ${item.current} | ${item.latest} | ${item.severity} | ${age} | ${confidence} |`,
      )
    }
    lines.push('')
  }

  if (state.quarantine.length > 0) {
    lines.push('## Quarantine\n')
    lines.push('| Package | Current | Latest | Severity | Reason |')
    lines.push('|---|---|---|---|---|')
    for (const item of state.quarantine) {
      const reason = item.reason ?? formatDays(item.daysOld) ?? '—'
      lines.push(
        `| ${item.name} | ${item.current} | ${item.latest} | ${item.severity} | ${reason} |`,
      )
    }
    lines.push('')
  }

  const stuck = findStuckInQuarantine(state)
  if (stuck.length > 0) {
    lines.push('## Stuck in quarantine\n')
    lines.push(
      `These packages have been in quarantine for at least ${STUCK_IN_QUARANTINE_THRESHOLD} consecutive scans:`,
    )
    for (const name of stuck) {
      lines.push(`- ${name}`)
    }
    lines.push('')
  }

  if (state.eligible.length === 0 && state.quarantine.length === 0) {
    lines.push('No dependency updates available.\n')
  }

  lines.push('Run the command below to review and apply updates safely:')
  lines.push('```bash')
  lines.push('npm run defence:update')
  lines.push('```')
  lines.push('')

  return lines.join('\n')
}

function printReport(state, format) {
  if (format === 'json') {
    console.log(formatJsonReport(state))
    return
  }

  if (format === 'markdown') {
    console.log(formatMarkdownReport(state))
    return
  }

  // Default table format.
  const { eligible, quarantine } = state
  const hasItems = eligible.length > 0 || quarantine.length > 0
  if (!hasItems) return

  console.log('\n⚠️  Dependency updates available:')
  console.log('   (This script never modifies dependencies automatically.)')

  if (eligible.length > 0) {
    console.log(`\n   Eligible for update (age >= ${MIN_AGE_DAYS} days):`)
    for (const item of eligible) {
      console.log(
        `     ${item.name}  ${item.current} → ${item.latest} [${item.severity}] ${formatDays(item.daysOld)} — ${item.confidenceLabel} (${item.confidence})`,
      )
      if (item.links?.npm) console.log(`       npm:     ${item.links.npm}`)
      if (item.links?.release) {
        console.log(`       release: ${item.links.release}`)
      }
    }
  }

  if (quarantine.length > 0) {
    console.log(`\n   In quarantine (too recent or unsafe to update):`)
    for (const item of quarantine) {
      const suffix =
        item.daysOld !== null ? formatDays(item.daysOld) : `(${item.reason})`
      console.log(
        `     ${item.name}  ${item.current} → ${item.latest} [${item.severity}] ${suffix}`,
      )
      if (item.links?.npm) console.log(`       npm:     ${item.links.npm}`)
      if (item.links?.release) {
        console.log(`       release: ${item.links.release}`)
      }
    }
  }

  const stuck = findStuckInQuarantine(state)
  if (stuck.length > 0) {
    console.log('\n   Stuck in quarantine (review recommended):')
    for (const name of stuck) {
      console.log(`     ${name}`)
    }
  }

  console.log('\n   Run the command below to review and apply updates safely:')
  console.log('     npm run defence:update')
  console.log()
}

// ---------------------------------------------------------------------------
// Main entry point.
// ---------------------------------------------------------------------------

async function main(argv = process.argv.slice(2)) {
  const { isForce, isSilent, isOffline, format } = parseCliArgs(argv)
  const currentLockfileHash = readLockfileHash()

  // Step 1: local sync check.
  const sync = isNodeModulesInSync()
  if (!sync.inSync) {
    if (!isSilent) printSyncWarning(sync.reason)
    const state = loadState() ?? {}
    state.lastScan = new Date(nowImpl()).toISOString()
    state.installedLockfileHash = currentLockfileHash
    state.eligible = []
    state.quarantine = []
    saveState(state)
    return 0
  }

  // Step 2: load cache or rescan.
  let state = loadState()

  if (isForce || !state || !isCacheValid(state)) {
    if (isOffline) {
      if (!state) {
        if (!isSilent) {
          console.log(
            '\nℹ️  Update check is offline and no cached scan was found.',
          )
          console.log('   Connect to the network or run without --offline.')
          console.log()
        }
        return 0
      }
      // In offline mode, use the existing cache even if TTL expired.
      if (!isSilent) {
        console.log('\nℹ️  Update check is offline; using the last cached scan.')
        console.log()
      }
    } else {
      const outdated = runNpmOutdated()
      const entries = Object.entries(outdated)

      const results = await runWithConcurrencyLimit(
        entries.map(
          ([name, data]) =>
            () =>
              classifyUpdate(name, data),
        ),
        CONCURRENCY,
      )

      const eligible = []
      const quarantine = []

      for (const result of results) {
        if (result.status === 'rejected') continue
        if (result.value.eligible) eligible.push(result.value.eligible)
        if (result.value.quarantine) quarantine.push(result.value.quarantine)
      }

      state = {
        lastScan: new Date(nowImpl()).toISOString(),
        lastReminder: null,
        installedLockfileHash: currentLockfileHash,
        eligible: enrichEligibleWithConfidence(eligible, state?.history),
        quarantine,
        history: state?.history ?? [],
      }
      appendHistory(state)
      saveState(state)
    }
  }

  // Ensure cached state carries the new fields even if it predates them.
  state.history = state.history ?? []
  state.eligible = enrichEligibleWithConfidence(state.eligible, state.history)

  // Step 3: show reminder if needed.
  const hasItems = state.eligible.length > 0 || state.quarantine.length > 0
  if (hasItems || format !== 'table') {
    // JSON/Markdown formatters always produce output (unless silent).
    // Table output respects the reminder interval.
    const shouldShow =
      format !== 'table' ||
      shouldRemind(state) ||
      state.eligible.length + state.quarantine.length === 0
    if (!isSilent && shouldShow) {
      printReport(state, format)
      state.lastReminder = new Date(nowImpl()).toISOString()
      saveState(state)
    }
  }

  return 0
}

if (require.main === module) {
  main().catch((err) => {
    console.error(`\nUpdate check failed: ${err.message}`)
    exitImpl(1)
  })
}

module.exports = {
  main,
  setImpls,
  resetImpls,
  appendHistory,
  buildHistoryEntry,
  countPackageOccurrences,
  isStuckInQuarantine,
  calculateReleaseCadence,
  calculateConfidence,
  enrichEligibleWithConfidence,
  findStuckInQuarantine,
}
