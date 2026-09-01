#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const { loadConfig, setImpls, resetImpls, DEFAULT_SCORING_RULES } = require(
  path.resolve(__dirname, './config.js'),
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

  test('loads defaults from engines and known config blocks', () => {
    setImpls({
      fs: buildFs({
        engines: { node: '>=24.19.0', npm: '>=11.17.0' },
        pkgAgeCheck: { minAgeDays: 14 },
        updateCheck: { cacheTtlHours: 12 },
        licensesCheck: { failOnUnknown: true },
      }),
    })
    const config = loadConfig()
    assert.equal(config.engines.node, '>=24.19.0')
    assert.equal(config.pkgAgeCheck.minAgeDays, 14)
    assert.equal(config.pkgAgeCheck.maxResponseMB, 20)
    assert.equal(config.updateCheck.cacheTtlHours, 12)
    assert.equal(config.updateCheck.minAgeDays, 14)
    assert.equal(config.licensesCheck.failOnUnknown, true)
    assert.equal(config.updatePackages.promptTimeoutMs, 30000)
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
})
