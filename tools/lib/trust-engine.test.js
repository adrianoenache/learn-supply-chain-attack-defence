#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, './trust-engine.js')

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

function makeMockFetchRegistryJson(responses) {
  return async (name, version, _options) => {
    const key = version ? `${name}@${version}` : name
    if (responses[key] !== undefined) return responses[key]
    if (responses[name] !== undefined) return responses[name]
    throw new Error(`Unexpected registry fetch: ${key}`)
  }
}

function makeMockFetchJson(responses) {
  return async (url) => {
    for (const [prefix, data] of Object.entries(responses)) {
      if (url.startsWith(prefix)) return data
    }
    throw new Error(`Unexpected fetch: ${url}`)
  }
}

describe('trust-engine', () => {
  let mod

  beforeEach(() => {
    mod = readScriptExports()
  })

  afterEach(() => {
    mod.resetImpls()
  })

  describe('scoreAge', () => {
    test('null returns 0.5', () => {
      assert.equal(mod.scoreAge(null), 0.5)
    })

    test('young package scores low', () => {
      assert.ok(mod.scoreAge(3) < 0.5)
    })

    test('mature package scores 1', () => {
      assert.equal(mod.scoreAge(30), 1)
      assert.equal(mod.scoreAge(60), 1)
    })
  })

  describe('scoreCadence', () => {
    test('null returns 0.5', () => {
      assert.equal(mod.scoreCadence(null), 0.5)
    })

    test('fast cadence scores low', () => {
      assert.ok(mod.scoreCadence(3) < 0.5)
    })

    test('slow cadence scores 1', () => {
      assert.equal(mod.scoreCadence(30), 1)
    })
  })

  describe('scoreDownloads', () => {
    test('null returns 0.5', () => {
      assert.equal(mod.scoreDownloads(null), 0.5)
    })

    test('below threshold scores less than 1', () => {
      assert.ok(mod.scoreDownloads(50) < 1)
      assert.ok(mod.scoreDownloads(50) > 0)
    })

    test('threshold and above scores 1', () => {
      assert.equal(mod.scoreDownloads(100), 1)
      assert.equal(mod.scoreDownloads(1000), 1)
    })
  })

  describe('scoreMaintainers', () => {
    test('null returns 0.5', () => {
      assert.equal(mod.scoreMaintainers(null), 0.5)
    })

    test('single maintainer scores 0.5', () => {
      assert.equal(mod.scoreMaintainers(1), 0.5)
    })

    test('two or more maintainers score 1', () => {
      assert.equal(mod.scoreMaintainers(2), 1)
      assert.equal(mod.scoreMaintainers(5), 1)
    })
  })

  describe('scoreProvenance', () => {
    test('valid provenance scores 1', () => {
      assert.equal(mod.scoreProvenance({ hasProvenance: true, valid: true }), 1)
    })

    test('invalid or missing provenance scores 0', () => {
      assert.equal(
        mod.scoreProvenance({ hasProvenance: true, valid: false }),
        0,
      )
      assert.equal(mod.scoreProvenance({ hasProvenance: false }), 0)
    })
  })

  describe('scoreTyposquatting', () => {
    test('no conflicts scores 1', () => {
      assert.equal(mod.scoreTyposquatting([]), 1)
    })

    test('conflicts score 0', () => {
      assert.equal(mod.scoreTyposquatting([{ existing: 'foo' }]), 0)
    })
  })

  describe('scoreLifecycleRisk', () => {
    test('none scores 1', () => {
      assert.equal(mod.scoreLifecycleRisk({ riskLevel: 'none' }), 1)
    })

    test('high scores 0', () => {
      assert.equal(mod.scoreLifecycleRisk({ riskLevel: 'high' }), 0)
    })
  })

  describe('calculateTrustScore', () => {
    test('perfect signals yield 100', () => {
      const signals = {
        age: { score: 1 },
        downloads: { score: 1 },
        maintainers: { score: 1 },
      }
      const weights = { age: 40, downloads: 30, maintainers: 30 }
      assert.equal(mod.calculateTrustScore(signals, weights), 100)
    })

    test('zero signals yield 0', () => {
      const signals = {
        age: { score: 0 },
        downloads: { score: 0 },
      }
      const weights = { age: 50, downloads: 50 }
      assert.equal(mod.calculateTrustScore(signals, weights), 0)
    })
  })

  describe('classifyScore', () => {
    const thresholds = { trustedMin: 70, reviewRequiredMin: 40 }

    test('trusted above threshold', () => {
      assert.equal(mod.classifyScore(85, thresholds), 'trusted')
    })

    test('review required in middle', () => {
      assert.equal(mod.classifyScore(55, thresholds), 'review required')
    })

    test('high risk below threshold', () => {
      assert.equal(mod.classifyScore(25, thresholds), 'high risk')
    })
  })

  describe('collectMetadata', () => {
    test('extracts deprecation and maintainer count', () => {
      const info = {
        versions: {
          '1.0.0': {
            deprecated: 'use newer version',
            maintainers: [{ name: 'a' }, { name: 'b' }],
          },
        },
      }
      const result = mod.collectMetadata(info, '1.0.0')
      assert.equal(result.isDeprecated, true)
      assert.equal(result.maintainerCount, 2)
    })
  })

  describe('collectCadence', () => {
    test('returns null with insufficient history', () => {
      const state = { history: [] }
      assert.equal(mod.collectCadence('foo', state), null)
    })

    test('computes average days between appearances', () => {
      const state = {
        history: [
          {
            scannedAt: new Date('2026-01-01').toISOString(),
            eligible: [{ name: 'foo' }],
          },
          {
            scannedAt: new Date('2026-01-11').toISOString(),
            eligible: [{ name: 'foo' }],
          },
          {
            scannedAt: new Date('2026-01-26').toISOString(),
            eligible: [{ name: 'foo' }],
          },
        ],
      }
      const cadence = mod.collectCadence('foo', state)
      assert.equal(cadence, 12.5)
    })
  })

  describe('analyzePackage', () => {
    test('returns high score for safe package', async () => {
      const info = {
        time: {
          '1.0.0': new Date(
            Date.now() - 40 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        versions: {
          '1.0.0': {
            name: 'safe-pkg',
            version: '1.0.0',
            maintainers: [{ name: 'a' }, { name: 'b' }],
            scripts: {},
          },
        },
      }

      mod.setImpls({
        fetchRegistryJson: makeMockFetchRegistryJson({ 'safe-pkg': info }),
        fetchJson: makeMockFetchJson({
          'https://api.npmjs.org/downloads/point/last-week/safe-pkg': {
            downloads: 1000,
          },
        }),
        checkProvenance: async () => ({ hasProvenance: true, valid: true }),
        findTyposquattingConflicts: () => [],
        analyzeManifest: () => ({ riskLevel: 'none', findings: [] }),
        classifyLicense: () => ({ status: 'allowed' }),
      })

      const result = await mod.analyzePackage('safe-pkg', '1.0.0', {
        options: {},
        existingNames: [],
        lockPackages: [{ name: 'safe-pkg', version: '1.0.0', license: 'MIT' }],
        updateCheckState: {
          history: [
            {
              scannedAt: new Date('2026-01-01').toISOString(),
              eligible: [{ name: 'safe-pkg' }],
            },
            {
              scannedAt: new Date('2026-02-01').toISOString(),
              eligible: [{ name: 'safe-pkg' }],
            },
          ],
        },
      })

      assert.equal(result.name, 'safe-pkg')
      assert.equal(result.version, '1.0.0')
      assert.equal(result.score, 100)
      assert.equal(result.label, 'trusted')
    })

    test('returns low score for risky package', async () => {
      const info = {
        time: {
          '1.0.0': new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        versions: {
          '1.0.0': {
            name: 'risky-pkg',
            version: '1.0.0',
            deprecated: 'abandoned',
            maintainers: [{ name: 'a' }],
            scripts: { postinstall: 'node-gyp rebuild' },
          },
        },
      }

      mod.setImpls({
        fetchRegistryJson: makeMockFetchRegistryJson({ 'risky-pkg': info }),
        fetchJson: makeMockFetchJson({
          'https://api.npmjs.org/downloads/point/last-week/risky-pkg': {
            downloads: 10,
          },
        }),
        checkProvenance: async () => ({ hasProvenance: false, valid: false }),
        findTyposquattingConflicts: () => [{ existing: 'risky-pkgg' }],
        analyzeManifest: () => ({ riskLevel: 'medium', findings: [] }),
        classifyLicense: () => ({ status: 'prohibited' }),
      })

      const result = await mod.analyzePackage('risky-pkg', '1.0.0', {
        options: {},
        existingNames: ['risky-pkgg'],
        lockPackages: [
          { name: 'risky-pkg', version: '1.0.0', license: 'GPL-3.0' },
        ],
      })

      assert.equal(result.label, 'high risk')
      assert.ok(result.score < 40)
    })
  })

  describe('analyzePackages', () => {
    test('aggregates multiple packages', async () => {
      const safeInfo = {
        time: {
          '1.0.0': new Date(
            Date.now() - 40 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
        versions: {
          '1.0.0': {
            name: 'safe-pkg',
            version: '1.0.0',
            maintainers: [{ name: 'a' }, { name: 'b' }],
            scripts: {},
          },
        },
      }

      mod.setImpls({
        fetchRegistryJson: makeMockFetchRegistryJson({ 'safe-pkg': safeInfo }),
        fetchJson: makeMockFetchJson({
          'https://api.npmjs.org/downloads/point/last-week/safe-pkg': {
            downloads: 1000,
          },
        }),
        checkProvenance: async () => ({ hasProvenance: true, valid: true }),
        findTyposquattingConflicts: () => [],
        analyzeManifest: () => ({ riskLevel: 'none', findings: [] }),
        classifyLicense: () => ({ status: 'allowed' }),
      })

      const report = await mod.analyzePackages([['safe-pkg', '1.0.0']], {
        options: { concurrency: 1 },
        existingNames: [],
        lockPackages: [{ name: 'safe-pkg', version: '1.0.0', license: 'MIT' }],
        updateCheckState: {
          history: [
            {
              scannedAt: new Date('2026-01-01').toISOString(),
              eligible: [{ name: 'safe-pkg' }],
            },
            {
              scannedAt: new Date('2026-02-01').toISOString(),
              eligible: [{ name: 'safe-pkg' }],
            },
          ],
        },
      })

      assert.equal(report.summary.totalPackages, 1)
      assert.equal(report.packages[0].score, 100)
    })
  })

  describe('formatters', () => {
    const report = {
      summary: {
        totalPackages: 1,
        averageScore: 100,
        lowestScore: 100,
        highestScore: 100,
        distribution: { trusted: 1, 'review required': 0, 'high risk': 0 },
      },
      packages: [
        {
          name: 'safe-pkg',
          version: '1.0.0',
          score: 100,
          label: 'trusted',
          signals: {
            age: { raw: 40, score: 1 },
            downloads: { raw: 1000, score: 1 },
          },
          metadata: { isDeprecated: false },
        },
      ],
    }

    test('buildTableReport includes package and summary', () => {
      const output = mod.buildTableReport(report)
      assert.ok(output.includes('safe-pkg'))
      assert.ok(output.includes('Average score: 100'))
    })

    test('buildMarkdownReport includes headings', () => {
      const output = mod.buildMarkdownReport(report, '2026-01-01T00:00:00.000Z')
      assert.ok(output.includes('# Trust Score Report'))
      assert.ok(output.includes('## Summary'))
      assert.ok(output.includes('safe-pkg'))
    })

    test('buildJsonReport returns valid JSON', () => {
      const output = mod.buildJsonReport(report, '2026-01-01T00:00:00.000Z')
      const parsed = JSON.parse(output)
      assert.equal(parsed.summary.totalPackages, 1)
      assert.equal(parsed.generatedAt, '2026-01-01T00:00:00.000Z')
    })
  })

  describe('DI hooks', () => {
    test('resetImpls restores defaults', () => {
      mod.setImpls({
        checkProvenance: async () => ({ hasProvenance: true, valid: true }),
      })
      mod.resetImpls()
      assert.equal(mod.checkProvenance, undefined)
    })
  })
})
