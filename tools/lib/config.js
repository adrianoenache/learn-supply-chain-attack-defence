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

function resolveNpmrcMinReleaseAge(pkgRoot) {
  try {
    const npmrcPath = path.resolve(pkgRoot, '.npmrc')
    const content = fs.readFileSync(npmrcPath, 'utf8')
    const match = content.match(/^min-release-age\s*=\s*(\d+)/m)
    return match ? Number.parseInt(match[1], 10) : null
  } catch {
    return null
  }
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
    },
    e2e: {
      cacheTtlHours: Number.parseInt(process.env.E2E_CACHE_TTL_HOURS, 10) || 24,
      defaultTimeoutMs: pkg.e2e?.defaultTimeoutMs ?? 30000,
    },
    huskyPreCommitHash: pkg.huskyPreCommitHash ?? null,
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
