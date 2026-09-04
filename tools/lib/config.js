#!/usr/bin/env node
'use strict'

// Centralized configuration loader for all defence tools.
// Reads defaults from package.json and allows per-project overrides via
// an optional `.defence.config.json` file at the repository root.
//
// Design goals:
//   - Single source of truth for configurable constants.
//   - No hardcoded magic numbers in tool scripts or tests.
//   - Environment-aware (CI, local, E2E) through env vars where appropriate.
//   - Safe to import before any third-party dependencies are installed.
//
// Usage:
//   const { loadConfig } = require('./lib/config.js')
//   const config = loadConfig()
//   const minAgeDays = config.pkgAgeCheck.minAgeDays

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '../..')
const PKG_PATH = path.resolve(REPO_ROOT, 'package.json')
const OVERRIDE_PATH = path.resolve(REPO_ROOT, '.defence.config.json')

// Default license lists, kept here so package.json can omit them and still
// produce deterministic behaviour. Values in package.json take precedence.
const DEFAULT_ALLOWED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
]

const DEFAULT_PROHIBITED_LICENSES = [
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

// Default scoring weights for update confidence calculation.
const DEFAULT_SCORING_RULES = {
  agePointsMax: 40,
  agePointsStep: 10,
  agePointsStepDays: 7,
  severityPointsPatch: 30,
  severityPointsMinor: 20,
  severityPointsMajor: 0,
  cadencePenaltyMax: 30,
  cadencePenaltyUnit: 5,
  cadencePenaltyUnitDays: 2,
  deprecatedPenalty: 40,
  maintainerPenaltyThreshold: 2,
  maintainerPenalty: 10,
  downloadsPenaltyThreshold: 100,
  downloadsPenalty: 10,
  scoreRecommendedMin: 70,
  scoreReviewRequiredMin: 40,
}

// Dependency injection hooks for tests.
let fsImpl = fs
let pkgPathImpl = PKG_PATH
let overridePathImpl = OVERRIDE_PATH

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.pkgPath) pkgPathImpl = impls.pkgPath
  if (impls.overridePath) overridePathImpl = impls.overridePath
}

function resetImpls() {
  fsImpl = fs
  pkgPathImpl = PKG_PATH
  overridePathImpl = OVERRIDE_PATH
}

function readJsonSafe(filePath) {
  try {
    const content = fsImpl.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

function deepMerge(target, source) {
  const result = { ...target }
  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = result[key]
    if (
      sourceValue !== null &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue !== null &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue)
    } else {
      result[key] = sourceValue
    }
  }
  return result
}

function readNpmrc(pkgRoot) {
  try {
    const npmrcPath = path.resolve(pkgRoot, '.npmrc')
    return fsImpl.readFileSync(npmrcPath, 'utf8')
  } catch {
    return ''
  }
}

function parseNpmrcInt(content, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${escapedKey}\\s*=\\s*(\\d+)`, 'm')
  const match = content.match(regex)
  return match ? Number.parseInt(match[1], 10) : null
}

function parseNpmrcBoolean(content, key) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`^${escapedKey}\\s*=\\s*(\\S+)`, 'm')
  const match = content.match(regex)
  if (!match) return null
  const value = match[1].toLowerCase()
  return value === 'true' || value === '1'
}

function resolveNpmrcMinReleaseAge(pkgRoot) {
  const content = readNpmrc(pkgRoot)
  return parseNpmrcInt(content, 'min-release-age')
}

function buildDefaults(pkg) {
  const pkgAge = pkg.pkgAgeCheck ?? {}
  const update = pkg.updateCheck ?? {}
  const licenses = pkg.licensesCheck ?? {}

  return {
    engines: pkg.engines ?? {},
    pkgAgeCheck: {
      minAgeDays: pkgAge.minAgeDays ?? 7,
      maxResponseMB: pkgAge.maxResponseMB ?? 20,
      concurrency: pkgAge.concurrency ?? 10,
      registryTimeoutMs: pkgAge.registryTimeoutMs ?? 10000,
      msPerDay: pkgAge.msPerDay ?? 1000 * 60 * 60 * 24,
    },
    updateCheck: {
      minAgeDays:
        update.minAgeDays ??
        pkgAge.minAgeDays ??
        resolveNpmrcMinReleaseAge(REPO_ROOT) ??
        7,
      remindEveryDays: update.remindEveryDays ?? 1,
      alwaysRemind: update.alwaysRemind ?? false,
      includeTransitive: update.includeTransitive ?? false,
      registryTimeoutMs: update.registryTimeoutMs ?? 10000,
      cacheTtlHours: update.cacheTtlHours ?? 24,
      historyMaxEntries: update.historyMaxEntries ?? 30,
      stuckInQuarantineThreshold: update.stuckInQuarantineThreshold ?? 3,
      highReleaseCadenceDays: update.highReleaseCadenceDays ?? 7,
      maxResponseMB: update.maxResponseMB ?? pkgAge.maxResponseMB ?? 20,
      concurrency: update.concurrency ?? pkgAge.concurrency ?? 10,
      retryMaxAttempts: update.retryMaxAttempts ?? 3,
      retryInitialDelayMs: update.retryInitialDelayMs ?? 1000,
      retryBackoffMultiplier: update.retryBackoffMultiplier ?? 2,
      retryMaxDelayMs: update.retryMaxDelayMs ?? 30000,
      scoringRules: deepMerge(DEFAULT_SCORING_RULES, update.scoringRules ?? {}),
    },
    typosquattingCheck: {
      cacheTtlHours: pkg.typosquattingCheck?.cacheTtlHours ?? 24,
      maxResponseMB: pkg.typosquattingCheck?.maxResponseMB ?? 1,
      timeoutMs: pkg.typosquattingCheck?.timeoutMs ?? 10000,
      retryMaxAttempts: pkg.typosquattingCheck?.retryMaxAttempts ?? 1,
      retryInitialDelayMs: pkg.typosquattingCheck?.retryInitialDelayMs ?? 250,
      retryBackoffMultiplier:
        pkg.typosquattingCheck?.retryBackoffMultiplier ?? 2,
      retryMaxDelayMs: pkg.typosquattingCheck?.retryMaxDelayMs ?? 1000,
    },
    licensesCheck: {
      allowed: licenses.allowed ?? DEFAULT_ALLOWED_LICENSES,
      prohibited: licenses.prohibited ?? DEFAULT_PROHIBITED_LICENSES,
      failOnUnknown: licenses.failOnUnknown ?? false,
    },
    updatePackages: {
      promptTimeoutMs: pkg.updatePackages?.promptTimeoutMs ?? 30000,
    },
    checkMdLinks: {
      ignoredDirs: pkg.checkMdLinks?.ignoredDirs ?? ['node_modules', '.git'],
      cacheTtlHours: pkg.checkMdLinks?.cacheTtlHours ?? 24,
      cacheFile:
        pkg.checkMdLinks?.cacheFile ??
        path.resolve(REPO_ROOT, '.md-links-cache.json'),
    },
    lifecycleScriptAnalysis: {
      enabled: pkg.lifecycleScriptAnalysis?.enabled ?? true,
      failOn: pkg.lifecycleScriptAnalysis?.failOn ?? 'high',
    },
    e2e: {
      cacheTtlHours: Number.parseInt(process.env.E2E_CACHE_TTL_HOURS, 10) || 24,
      defaultTimeoutMs: pkg.e2e?.defaultTimeoutMs ?? 30000,
    },
    defences: {
      typosquattingThreshold: pkg.defences?.typosquattingThreshold ?? 2,
      internalPackageNames: pkg.defences?.internalPackageNames ?? [],
      provenanceMode: pkg.defences?.provenanceMode ?? 'warn',
      huskyPreCommitHash:
        pkg.defences?.huskyPreCommitHash ?? pkg.huskyPreCommitHash ?? null,
    },
    // Kept for backwards compatibility; prefer defences.huskyPreCommitHash.
    huskyPreCommitHash:
      pkg.defences?.huskyPreCommitHash ?? pkg.huskyPreCommitHash ?? null,
    npmrc: parseNpmrcSettings(REPO_ROOT),
    paths: {
      repoRoot: REPO_ROOT,
      packageJson: PKG_PATH,
      packageLockJson: path.resolve(REPO_ROOT, 'package-lock.json'),
      nodeModulesLockJson: path.resolve(
        REPO_ROOT,
        'node_modules/.package-lock.json',
      ),
      npmrc: path.resolve(REPO_ROOT, '.npmrc'),
      updateCheckState: path.resolve(REPO_ROOT, '.defence-update-check.json'),
      updateDecisions: path.resolve(
        REPO_ROOT,
        '.defence-update-decisions.json',
      ),
    },
  }
}

function parseNpmrcSettings(pkgRoot) {
  const content = readNpmrc(pkgRoot)
  return {
    ignoreScripts: parseNpmrcBoolean(content, 'ignore-scripts'),
    minReleaseAgeDays: parseNpmrcInt(content, 'min-release-age'),
    saveExact: parseNpmrcBoolean(content, 'save-exact'),
    engineStrict: parseNpmrcBoolean(content, 'engine-strict'),
    fetchRetries: parseNpmrcInt(content, 'fetch-retries'),
    fetchRetryMintimeout: parseNpmrcInt(content, 'fetch-retry-mintimeout'),
    fetchRetryMaxtimeout: parseNpmrcInt(content, 'fetch-retry-maxtimeout'),
    fetchTimeout: parseNpmrcInt(content, 'fetch-timeout'),
    maxsockets: parseNpmrcInt(content, 'maxsockets'),
    strictSsl: parseNpmrcBoolean(content, 'strict-ssl'),
  }
}

function loadConfig() {
  const pkg = readJsonSafe(pkgPathImpl) ?? {}
  const defaults = buildDefaults(pkg)
  const override = readJsonSafe(overridePathImpl) ?? {}
  return deepMerge(defaults, override)
}

module.exports = {
  loadConfig,
  setImpls,
  resetImpls,
  // Exported for testing and internal reuse.
  DEFAULT_SCORING_RULES,
}
