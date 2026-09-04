#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const { loadConfig, setImpls, resetImpls, DEFAULT_SCORING_RULES } = require(
  path.resolve(__dirname, './config.js'),
)

const { engines: projectEngines } = require(
  path.resolve(__dirname, '../../package.json'),
)

function buildFs(pkg, override = null) {
  const files = {
    [path.resolve(__dirname, '../../package.json')]: JSON.stringify(pkg),
  }
  if (override !== null) {
    files[path.resolve(__dirname, '../../.defence.config.json')] =
      JSON.stringify(override)
  }
  return {
    readFileSync: (filePath, _encoding) => {
      if (files[filePath] !== undefined) return files[filePath]
      throw new Error(`ENOENT: ${filePath}`)
    },
  }
}

describe('config loader', () => {
  beforeEach(() => {
    resetImpls()
  })

  // Use the real project engine ranges so the config loader test validates
  // the actual package.json instead of a stale hardcoded fixture.
  const sampleNodeRange = projectEngines.node
  const sampleNpmRange = projectEngines.npm

  test('loads defaults from engines and known config blocks', () => {
    setImpls({
      fs: buildFs({
        engines: { node: sampleNodeRange, npm: sampleNpmRange },
        pkgAgeCheck: { minAgeDays: 14 },
        updateCheck: { cacheTtlHours: 12 },
        licensesCheck: { failOnUnknown: true },
      }),
    })
    const config = loadConfig()
    assert.equal(config.engines.node, sampleNodeRange)
    assert.equal(config.engines.npm, sampleNpmRange)
    assert.equal(config.pkgAgeCheck.minAgeDays, 14)
    assert.equal(config.pkgAgeCheck.maxResponseMB, 20)
    assert.equal(config.pkgAgeCheck.msPerDay, 1000 * 60 * 60 * 24)
    assert.equal(config.updateCheck.cacheTtlHours, 12)
    assert.equal(config.updateCheck.minAgeDays, 14)
    assert.equal(config.licensesCheck.failOnUnknown, true)
    assert.equal(config.updatePackages.promptTimeoutMs, 30000)
    assert.equal(config.typosquattingCheck.retryMaxAttempts, 1)
    assert.deepEqual(config.checkMdLinks.ignoredDirs, ['node_modules', '.git'])
  })

  test('uses pkgAgeCheck defaults when updateCheck omits values', () => {
    setImpls({
      fs: buildFs({
        pkgAgeCheck: { minAgeDays: 21, maxResponseMB: 50, concurrency: 5 },
      }),
    })
    const config = loadConfig()
    assert.equal(config.updateCheck.minAgeDays, 21)
    assert.equal(config.updateCheck.maxResponseMB, 50)
    assert.equal(config.updateCheck.concurrency, 5)
  })

  test('overrides defaults via .defence.config.json', () => {
    setImpls({
      fs: buildFs(
        { pkgAgeCheck: { minAgeDays: 7 } },
        {
          pkgAgeCheck: { minAgeDays: 3 },
          updatePackages: { promptTimeoutMs: 10000 },
        },
      ),
    })
    const config = loadConfig()
    assert.equal(config.pkgAgeCheck.minAgeDays, 3)
    assert.equal(config.updatePackages.promptTimeoutMs, 10000)
  })

  test('merges scoring rules deeply without losing defaults', () => {
    setImpls({
      fs: buildFs(
        {},
        { updateCheck: { scoringRules: { scoreRecommendedMin: 80 } } },
      ),
    })
    const config = loadConfig()
    assert.equal(config.updateCheck.scoringRules.scoreRecommendedMin, 80)
    assert.equal(
      config.updateCheck.scoringRules.scoreReviewRequiredMin,
      DEFAULT_SCORING_RULES.scoreReviewRequiredMin,
    )
  })

  test('exposes resolved filesystem paths', () => {
    setImpls({ fs: buildFs({}) })
    const config = loadConfig()
    assert.ok(
      config.paths.repoRoot.endsWith('learn-supply-chain-attack-defence'),
    )
    assert.ok(config.paths.packageJson.endsWith('package.json'))
    assert.ok(config.paths.packageLockJson.endsWith('package-lock.json'))
  })

  test('exposes huskyPreCommitHash when configured', () => {
    setImpls({ fs: buildFs({ huskyPreCommitHash: 'abc123' }) })
    const config = loadConfig()
    assert.equal(config.huskyPreCommitHash, 'abc123')
  })

  test('parses critical .npmrc security settings', () => {
    const npmrcContent = [
      'ignore-scripts=true',
      'min-release-age=7',
      'save-exact=true',
      'engine-strict=true',
      'fetch-retries=3',
      'fetch-retry-mintimeout=10000',
      'fetch-retry-maxtimeout=60000',
      'fetch-timeout=300000',
      'maxsockets=10',
      'strict-ssl=true',
    ].join('\n')
    const fsWithNpmrc = {
      readFileSync: (filePath, _encoding) => {
        if (filePath.endsWith('package.json')) {
          return JSON.stringify({})
        }
        if (filePath.endsWith('.npmrc')) {
          return npmrcContent
        }
        throw new Error(`ENOENT: ${filePath}`)
      },
    }
    setImpls({ fs: fsWithNpmrc })
    const config = loadConfig()
    assert.equal(config.npmrc.ignoreScripts, true)
    assert.equal(config.npmrc.minReleaseAgeDays, 7)
    assert.equal(config.npmrc.saveExact, true)
    assert.equal(config.npmrc.engineStrict, true)
    assert.equal(config.npmrc.fetchRetries, 3)
    assert.equal(config.npmrc.fetchRetryMintimeout, 10000)
    assert.equal(config.npmrc.fetchRetryMaxtimeout, 60000)
    assert.equal(config.npmrc.fetchTimeout, 300000)
    assert.equal(config.npmrc.maxsockets, 10)
    assert.equal(config.npmrc.strictSsl, true)
  })

  test('reads min-release-age from .npmrc', () => {
    const pkgPath = path.resolve(__dirname, '../../package.json')
    const npmrcPath = path.resolve(__dirname, '../../.npmrc')
    setImpls({
      fs: {
        readFileSync: (filePath) => {
          if (filePath === pkgPath) {
            return JSON.stringify({ pkgAgeCheck: {} })
          }
          if (filePath === npmrcPath) {
            return 'min-release-age=21\n'
          }
          throw new Error(`ENOENT: ${filePath}`)
        },
      },
    })
    const config = loadConfig()
    assert.equal(config.updateCheck.minAgeDays, 21)
  })

  test('merges nested config objects deeply', () => {
    setImpls({
      fs: buildFs(
        { updateCheck: { scoringRules: { agePointsMax: 50 } } },
        { updateCheck: { scoringRules: { scoreRecommendedMin: 85 } } },
      ),
    })
    const config = loadConfig()
    assert.equal(config.updateCheck.scoringRules.agePointsMax, 50)
    assert.equal(config.updateCheck.scoringRules.scoreRecommendedMin, 85)
  })
})
