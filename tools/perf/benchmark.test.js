#!/usr/bin/env node
'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  main,
  runBenchmark,
  compareToBaseline,
  loadBaselines,
  saveBaselines,
  setImpls,
  resetImpls,
} = require(path.resolve(__dirname, './benchmark.js'))

describe('perf benchmark', () => {
  test('parseCliArgs rejects invalid tool', async () => {
    await assert.rejects(async () => main(['--tool=invalid']))
  })

  test('runBenchmark returns metrics for check-package-age', async () => {
    const result = await runBenchmark('check-package-age')
    assert.equal(result.tool, 'check-package-age')
    assert.ok(typeof result.durationMs === 'number')
    assert.ok(result.durationMs >= 0)
    assert.ok(typeof result.networkCalls === 'number')
    assert.ok(result.networkCalls > 0)
  })

  test('runBenchmark returns metrics for check-updates', async () => {
    const result = await runBenchmark('check-updates')
    assert.equal(result.tool, 'check-updates')
    assert.ok(typeof result.durationMs === 'number')
    assert.ok(result.durationMs >= 0)
    assert.ok(typeof result.networkCalls === 'number')
    assert.ok(result.networkCalls > 0)
  })

  test('compareToBaseline flags regression above threshold', () => {
    const result = {
      tool: 'check-package-age',
      durationMs: 125,
      networkCalls: 5,
    }
    const baseline = {
      'check-package-age': { durationMs: 100, networkCalls: 5 },
    }
    const comparison = compareToBaseline(result, baseline)
    assert.equal(comparison.duration.regression, true)
    assert.equal(comparison.network.regression, false)
    assert.equal(comparison.passed, false)
  })

  test('compareToBaseline passes when within threshold', () => {
    const result = {
      tool: 'check-package-age',
      durationMs: 105,
      networkCalls: 5,
    }
    const baseline = {
      'check-package-age': { durationMs: 100, networkCalls: 5 },
    }
    const comparison = compareToBaseline(result, baseline)
    assert.equal(comparison.duration.regression, false)
    assert.equal(comparison.network.regression, false)
    assert.equal(comparison.passed, true)
  })

  test('compareToBaseline handles missing baseline', () => {
    const result = {
      tool: 'check-package-age',
      durationMs: 100,
      networkCalls: 5,
    }
    const comparison = compareToBaseline(result, {})
    assert.equal(comparison.duration.note, 'no baseline')
    assert.equal(comparison.network.note, 'no baseline')
    assert.equal(comparison.passed, true)
  })

  test('save and load baselines round-trip', () => {
    const baselines = {
      'check-package-age': { durationMs: 100, networkCalls: 5 },
    }
    const files = {}
    setImpls({
      fs: {
        readFileSync: (filePath, _encoding) => {
          if (files[filePath]) return files[filePath]
          const err = new Error('ENOENT')
          err.code = 'ENOENT'
          throw err
        },
        writeFileSync: (filePath, data, _encoding) => {
          files[filePath] = data
        },
      },
    })
    try {
      saveBaselines(baselines)
      const loaded = loadBaselines()
      assert.deepEqual(loaded, baselines)
    } finally {
      resetImpls()
    }
  })

  test('main saves baseline when requested', async () => {
    const files = {}
    setImpls({
      fs: {
        readFileSync: (filePath, _encoding) => {
          if (files[filePath]) return files[filePath]
          const err = new Error('ENOENT')
          err.code = 'ENOENT'
          throw err
        },
        writeFileSync: (filePath, data, _encoding) => {
          files[filePath] = data
        },
      },
      performance: { now: () => 0 },
    })
    try {
      const code = await main(['--tool=check-package-age', '--save-baseline'])
      assert.equal(code, 0)
      const saved = JSON.parse(files[path.resolve(__dirname, 'baselines.json')])
      assert.ok(saved['check-package-age'])
      assert.ok(typeof saved['check-package-age'].durationMs === 'number')
    } finally {
      resetImpls()
    }
  })
})
