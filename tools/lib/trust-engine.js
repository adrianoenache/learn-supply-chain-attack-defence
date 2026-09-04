#!/usr/bin/env node
'use strict'

// Trust score engine for npm packages.
//
// Aggregates supply-chain risk signals that already exist in the codebase
// (publish age, release cadence, deprecation, maintainer count, weekly
// downloads, provenance/attestations, typosquatting, lifecycle script risk,
// and license status) into a single 0-100 trust score per package and a
// project-wide summary.
//
// Usage:
//   const { analyzePackages } = require('./lib/trust-engine.js')
//   const report = await analyzePackages(deps, context)

const path = require('node:path')

const registryCache = require(path.resolve(__dirname, './registry-cache.js'))
const retryFetch = require(path.resolve(__dirname, './retry-fetch.js'))
const provenance = require(path.resolve(__dirname, './provenance.js'))
const typosquatting = require(path.resolve(__dirname, './typosquatting.js'))
const scriptAnalyzer = require(path.resolve(__dirname, './script-analyzer.js'))

// ---------------------------------------------------------------------------
// Dependency injection hooks — exposed for tests.
// ---------------------------------------------------------------------------

let fetchRegistryJsonImpl = registryCache.fetchRegistryJson
let fetchJsonImpl = retryFetch.fetchJson
let checkProvenanceImpl = provenance.checkProvenance
let findTyposquattingConflictsImpl = typosquatting.findTyposquattingConflicts
let analyzeManifestImpl = scriptAnalyzer.analyzeManifest
let classifyLicenseImpl = null

function setImpls(impls) {
  if (impls.fetchRegistryJson) fetchRegistryJsonImpl = impls.fetchRegistryJson
  if (impls.fetchJson) fetchJsonImpl = impls.fetchJson
  if (impls.checkProvenance) checkProvenanceImpl = impls.checkProvenance
  if (impls.findTyposquattingConflicts)
    findTyposquattingConflictsImpl = impls.findTyposquattingConflicts
  if (impls.analyzeManifest) analyzeManifestImpl = impls.analyzeManifest
  if (impls.classifyLicense) classifyLicenseImpl = impls.classifyLicense
}

function resetImpls() {
  fetchRegistryJsonImpl = registryCache.fetchRegistryJson
  fetchJsonImpl = retryFetch.fetchJson
  checkProvenanceImpl = provenance.checkProvenance
  findTyposquattingConflictsImpl = typosquatting.findTyposquattingConflicts
  analyzeManifestImpl = scriptAnalyzer.analyzeManifest
  classifyLicenseImpl = null
}

// ---------------------------------------------------------------------------
// Default scoring configuration.
// ---------------------------------------------------------------------------

const DEFAULT_WEIGHTS = {
  age: 20,
  cadence: 10,
  downloads: 15,
  maintainers: 10,
  provenance: 15,
  typosquatting: 10,
  lifecycleRisk: 15,
  license: 5,
}

const DEFAULT_THRESHOLDS = {
  trustedMin: 70,
  reviewRequiredMin: 40,
}

// ---------------------------------------------------------------------------
// Signal collectors.
// ---------------------------------------------------------------------------

// Fetch the full packument so we can read the `time` map and `versions` map.
// The version-specific endpoint is not used because it omits historical data.
async function fetchPackageInfo(name, options = {}) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`
  return fetchRegistryJsonImpl(name, null, {
    url,
    cacheTtlHours: options.cacheTtlHours ?? 24,
    maxResponseBytes: options.maxResponseBytes ?? 20 * 1024 * 1024,
    timeoutMs: options.timeoutMs ?? 10000,
    retryMaxAttempts: options.retryMaxAttempts ?? 3,
    retryInitialDelayMs: options.retryInitialDelayMs ?? 1000,
    retryBackoffMultiplier: options.retryBackoffMultiplier ?? 2,
    retryMaxDelayMs: options.retryMaxDelayMs ?? 30000,
    acceptGzip: true,
  })
}

// Returns age in days for the given exact version, or null if unavailable.
async function collectAge(name, version, options) {
  const info = await fetchPackageInfo(name, options)
  const published = info?.time?.[version]
  if (!published) return null
  const publishedDate = new Date(published)
  if (Number.isNaN(publishedDate.getTime())) return null
  const msPerDay = options.msPerDay ?? 1000 * 60 * 60 * 24
  return (Date.now() - publishedDate.getTime()) / msPerDay
}

// Returns weekly downloads or null on failure.
async function collectDownloads(name, options) {
  try {
    const url = `https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`
    const data = await fetchJsonImpl(url, {
      timeoutMs: options.timeoutMs ?? 10000,
      retryMaxAttempts: 1,
      acceptGzip: true,
    })
    return typeof data.downloads === 'number' ? data.downloads : null
  } catch {
    return null
  }
}

// Returns deprecation flag and maintainer count from packument data.
function collectMetadata(info, version) {
  const versionInfo = info?.versions?.[version]
  const isDeprecated =
    typeof versionInfo?.deprecated === 'string' &&
    versionInfo.deprecated.length > 0
  const maintainers = versionInfo?.maintainers ?? info?.maintainers ?? []
  return {
    isDeprecated,
    maintainerCount: Array.isArray(maintainers) ? maintainers.length : null,
  }
}

// Average days between observed releases in the update-check state file.
// Returns null when there is not enough history.
function collectCadence(name, state) {
  const history = state?.history ?? []
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
    totalDays += (appearances[i] - appearances[i - 1]) / (1000 * 60 * 60 * 24)
  }
  return totalDays / (appearances.length - 1)
}

// Returns provenance status using the existing structural validator.
async function collectProvenance(name, version, options) {
  try {
    return await checkProvenanceImpl(name, version, {
      cacheTtlHours: options.cacheTtlHours ?? 24,
      maxResponseBytes: options.maxResponseBytes ?? 20 * 1024 * 1024,
      timeoutMs: options.timeoutMs ?? 10000,
      retryMaxAttempts: options.retryMaxAttempts ?? 3,
      retryInitialDelayMs: options.retryInitialDelayMs ?? 1000,
      retryBackoffMultiplier: options.retryBackoffMultiplier ?? 2,
      retryMaxDelayMs: options.retryMaxDelayMs ?? 30000,
      acceptGzip: true,
    })
  } catch {
    return { hasProvenance: false, valid: false, reason: 'lookup failed' }
  }
}

// Returns a list of typosquatting conflicts or an empty array.
function collectTyposquatting(name, existingNames, threshold) {
  return findTyposquattingConflictsImpl(name, existingNames, threshold)
}

// Reuses the lifecycle script analyzer on the package manifest.
function collectLifecycleRisk(manifest) {
  return analyzeManifestImpl(manifest.name, manifest.version, manifest)
}

// Reads license from package-lock.json packages entry when available.
function collectLicense(name, version, lockPackages) {
  const match = lockPackages?.find(
    (pkg) => pkg.name === name && pkg.version === version,
  )
  return match?.license ?? null
}

// Lazy-loads check-licenses.js classifyLicense only when needed.
function getLicenseClassifier() {
  if (!classifyLicenseImpl) {
    const checkLicenses = require(
      path.resolve(__dirname, '../check-licenses.js'),
    )
    classifyLicenseImpl = checkLicenses.classifyLicense
  }
  return classifyLicenseImpl
}

// ---------------------------------------------------------------------------
// Signal scoring (each returns 0-1, where 1 is safest).
// ---------------------------------------------------------------------------

function scoreAge(ageDays) {
  if (ageDays === null) return 0.5
  // 7 days → ~0.23, 30 days → 1, linear afterwards.
  if (ageDays >= 30) return 1
  return Math.max(0, ageDays / 30)
}

function scoreCadence(cadenceDays) {
  if (cadenceDays === null) return 0.5
  // Releases faster than every 7 days are penalised; >= 30 days are ideal.
  if (cadenceDays < 7) return Math.max(0, cadenceDays / 7)
  if (cadenceDays >= 30) return 1
  return 0.5 + (cadenceDays - 7) / (2 * (30 - 7))
}

function scoreDownloads(downloads) {
  if (downloads === null) return 0.5
  // 100 weekly downloads is the existing project threshold.
  return Math.min(1, downloads / 100)
}

function scoreMaintainers(count) {
  if (count === null) return 0.5
  return count >= 2 ? 1 : count / 2
}

function scoreProvenance(result) {
  return result?.hasProvenance && result?.valid ? 1 : 0
}

function scoreTyposquatting(conflicts) {
  return conflicts.length === 0 ? 1 : 0
}

const RISK_LEVEL_SCORE = {
  none: 1,
  low: 0.75,
  medium: 0.4,
  high: 0,
}

function scoreLifecycleRisk(result) {
  return RISK_LEVEL_SCORE[result?.riskLevel ?? 'none'] ?? 0.5
}

function scoreLicense(licenseExpression) {
  if (licenseExpression === null) return 0.5
  const classification = getLicenseClassifier()(licenseExpression)
  if (classification.status === 'allowed') return 1
  if (classification.status === 'prohibited') return 0
  return 0.5
}

// ---------------------------------------------------------------------------
// Aggregate analysis.
// ---------------------------------------------------------------------------

async function analyzePackage(name, version, context) {
  const {
    options = {},
    existingNames = [],
    lockPackages = [],
    updateCheckState = null,
  } = context

  const info = await fetchPackageInfo(name, options)
  const ageDays = await collectAge(name, version, options)
  const downloads = await collectDownloads(name, options)
  const metadata = collectMetadata(info, version)
  const cadenceDays = collectCadence(name, updateCheckState)
  const provenanceResult = await collectProvenance(name, version, options)
  const typosquattingConflicts = collectTyposquatting(
    name,
    existingNames,
    options.typosquattingThreshold ?? 2,
  )
  const license = collectLicense(name, version, lockPackages)

  // The lifecycle analyzer expects a manifest shape with `scripts` and identity.
  const manifest = info?.versions?.[version] ?? { name, version }
  const lifecycleResult = collectLifecycleRisk(manifest)

  const signals = {
    age: { raw: ageDays, score: scoreAge(ageDays) },
    cadence: { raw: cadenceDays, score: scoreCadence(cadenceDays) },
    downloads: { raw: downloads, score: scoreDownloads(downloads) },
    maintainers: {
      raw: metadata.maintainerCount,
      score: scoreMaintainers(metadata.maintainerCount),
    },
    provenance: {
      raw: provenanceResult,
      score: scoreProvenance(provenanceResult),
    },
    typosquatting: {
      raw: typosquattingConflicts,
      score: scoreTyposquatting(typosquattingConflicts),
    },
    lifecycleRisk: {
      raw: lifecycleResult,
      score: scoreLifecycleRisk(lifecycleResult),
    },
    license: { raw: license, score: scoreLicense(license) },
  }

  const weights = { ...DEFAULT_WEIGHTS, ...(options.scoringWeights ?? {}) }
  const score = calculateTrustScore(signals, weights)
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(options.thresholds ?? {}) }

  return {
    name,
    version,
    score,
    label: classifyScore(score, thresholds),
    signals,
    metadata: {
      isDeprecated: metadata.isDeprecated,
    },
  }
}

function calculateTrustScore(signals, weights) {
  let totalWeight = 0
  let weightedScore = 0
  for (const key of Object.keys(weights)) {
    const signal = signals[key]
    if (!signal) continue
    totalWeight += weights[key]
    weightedScore += signal.score * weights[key]
  }
  if (totalWeight === 0) return 0
  // Scores are normalized to 0-1; convert to 0-100 for readability.
  return Math.round((weightedScore / totalWeight) * 100)
}

function classifyScore(score, thresholds) {
  if (score >= thresholds.trustedMin) return 'trusted'
  if (score >= thresholds.reviewRequiredMin) return 'review required'
  return 'high risk'
}

// Runs tasks with a concurrency limit (same shape as check-package-age.js).
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

async function analyzePackages(packages, context) {
  const limit = context.options?.concurrency ?? 10
  const tasks = packages.map(([name, version]) => async () => {
    try {
      return await analyzePackage(name, version, context)
    } catch (err) {
      return {
        name,
        version,
        score: 0,
        label: 'high risk',
        signals: {},
        metadata: { isDeprecated: false },
        error: err.message,
      }
    }
  })

  const results = await runWithConcurrencyLimit(tasks, limit)
  const items = results.map((r) =>
    r.status === 'fulfilled' ? r.value : r.reason,
  )

  const scores = items.map((item) => item.score)
  const average =
    scores.length === 0
      ? 0
      : Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

  return {
    summary: {
      totalPackages: items.length,
      averageScore: average,
      lowestScore: scores.length === 0 ? 0 : Math.min(...scores),
      highestScore: scores.length === 0 ? 0 : Math.max(...scores),
      distribution: countByLabel(items),
    },
    packages: items,
  }
}

function countByLabel(items) {
  const counts = { trusted: 0, 'review required': 0, 'high risk': 0 }
  for (const item of items) {
    counts[item.label] = (counts[item.label] ?? 0) + 1
  }
  return counts
}

// ---------------------------------------------------------------------------
// Report formatters.
// ---------------------------------------------------------------------------

function buildTableReport(report) {
  const { summary, packages } = report
  const rows = packages.map((pkg) => {
    const signals = formatSignalFlags(pkg.signals)
    return `| ${pkg.name.padEnd(30)} | ${pkg.version.padEnd(12)} | ${String(pkg.score).padStart(3)} | ${pkg.label.padEnd(15)} | ${signals.padEnd(30)} |`
  })

  const header =
    '| PACKAGE                        | VERSION      | SCORE | LABEL           | SIGNALS                        |'
  const separator =
    '|--------------------------------|--------------|-------|-----------------|--------------------------------|'

  return [
    header,
    separator,
    ...rows,
    '',
    `Average score: ${summary.averageScore}  Lowest: ${summary.lowestScore}  Highest: ${summary.highestScore}`,
    `Distribution: trusted ${summary.distribution.trusted}, review required ${summary.distribution['review required']}, high risk ${summary.distribution['high risk']}`,
  ].join('\n')
}

function formatSignalFlags(signals) {
  const flags = []
  if (signals.age?.score < 0.5) flags.push('young')
  if (signals.cadence?.score < 0.5) flags.push('fast-cadence')
  if (signals.downloads?.score < 1) flags.push('low-downloads')
  if (signals.maintainers?.score < 1) flags.push('few-maintainers')
  if (signals.provenance?.score < 1) flags.push('no-provenance')
  if (signals.typosquatting?.score < 1) flags.push('typosquatting')
  if (signals.lifecycleRisk?.score < 0.75) flags.push('lifecycle-risk')
  if (signals.license?.score < 1) flags.push('license')
  if (Object.keys(signals).length === 0) flags.push('error')
  return flags.join(', ') || 'none'
}

function buildMarkdownReport(report, generatedAt = new Date().toISOString()) {
  const { summary, packages } = report
  const lines = [
    '# Trust Score Report',
    '',
    `*Generated at ${generatedAt}*`,
    '',
    '## Summary',
    '',
    `- Total packages: ${summary.totalPackages}`,
    `- Average score: ${summary.averageScore}`,
    `- Lowest score: ${summary.lowestScore}`,
    `- Highest score: ${summary.highestScore}`,
    `- Distribution: trusted ${summary.distribution.trusted}, review required ${summary.distribution['review required']}, high risk ${summary.distribution['high risk']}`,
    '',
    '## Packages',
    '',
    '| Package | Version | Score | Label |',
    '|---|---|---|---|',
  ]

  for (const pkg of packages) {
    lines.push(`| ${pkg.name} | ${pkg.version} | ${pkg.score} | ${pkg.label} |`)
  }

  lines.push('', '## Details', '')
  for (const pkg of packages) {
    lines.push(`### ${pkg.name}@${pkg.version}`)
    lines.push('')
    lines.push(`- **Score:** ${pkg.score} (${pkg.label})`)
    lines.push(`- **Deprecated:** ${pkg.metadata.isDeprecated ? 'yes' : 'no'}`)
    if (pkg.error) {
      lines.push(`- **Error:** ${pkg.error}`)
    }
    lines.push('')
    lines.push('| Signal | Raw | Score |')
    lines.push('|---|---|---|')
    for (const [key, signal] of Object.entries(pkg.signals)) {
      const raw = formatRawSignal(key, signal.raw)
      lines.push(`| ${key} | ${raw} | ${signal.score.toFixed(2)} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function formatRawSignal(key, raw) {
  if (raw === null || raw === undefined) return 'n/a'
  if (key === 'age')
    return typeof raw === 'number' ? `${Math.round(raw)} days` : String(raw)
  if (key === 'cadence')
    return typeof raw === 'number' ? `${Math.round(raw)} days` : String(raw)
  if (key === 'downloads')
    return typeof raw === 'number' ? raw.toLocaleString() : String(raw)
  if (key === 'maintainers')
    return typeof raw === 'number' ? String(raw) : 'n/a'
  if (key === 'provenance') return raw?.hasProvenance ? 'yes' : 'no'
  if (key === 'typosquatting')
    return Array.isArray(raw) && raw.length > 0
      ? raw.map((c) => c.existing).join(', ')
      : 'none'
  if (key === 'lifecycleRisk') return raw?.riskLevel ?? 'n/a'
  if (key === 'license') return raw ?? 'unknown'
  return String(raw)
}

function buildJsonReport(report, generatedAt = new Date().toISOString()) {
  return JSON.stringify({ ...report, generatedAt }, null, 2)
}

module.exports = {
  DEFAULT_WEIGHTS,
  DEFAULT_THRESHOLDS,
  setImpls,
  resetImpls,
  collectAge,
  collectDownloads,
  collectMetadata,
  collectCadence,
  collectProvenance,
  collectTyposquatting,
  collectLifecycleRisk,
  collectLicense,
  scoreAge,
  scoreCadence,
  scoreDownloads,
  scoreMaintainers,
  scoreProvenance,
  scoreTyposquatting,
  scoreLifecycleRisk,
  scoreLicense,
  analyzePackage,
  analyzePackages,
  calculateTrustScore,
  classifyScore,
  buildTableReport,
  buildMarkdownReport,
  buildJsonReport,
}
