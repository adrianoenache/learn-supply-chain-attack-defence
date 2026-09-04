#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  withProfile,
  updateProfile,
  formatTimestamp,
  setImpls,
  resetImpls,
} = require(path.resolve(__dirname, './profiler.js'))

function buildFs(initialFiles = {}) {
  const files = { ...initialFiles }
  return {
    readFileSync: (filePath, _encoding) => {
      if (files[filePath] !== undefined) return files[filePath]
      throw new Error(`ENOENT: ${filePath}`)
    },
    writeFileSync: (filePath, content) => {
      files[filePath] = content
    },
    existsSync: (filePath) => files[filePath] !== undefined,
    mkdirSync: (_dirPath, _options) => {},
  }
}

describe('profiler', () => {
  beforeEach(() => {
    resetImpls()
  })

  test('formatTimestamp rounds to seconds', () => {
    const ts = formatTimestamp(new Date('2026-09-03T12:34:56.789Z'))
    assert.equal(ts, '2026-09-03T12:34:56Z')
  })

  test('withProfile writes deterministic entry on success', async () => {
    const fs = buildFs()
    let now = 1000
    const performance = { now: () => (now += 100) }
    const heap = 1000
    const proc = { memoryUsage: () => ({ heapUsed: heap }) }
    setImpls({ fs, performance, process: proc })

    const writtenPath = '/tmp/.defence-profile.json'
    const result = await withProfile(
      'check-package-age',
      async (metrics) => {
        metrics.networkCalls = 2
        metrics.cacheHits = 1
        return 'ok'
      },
      { profilePath: writtenPath },
    )

    assert.equal(result, 'ok')
    const written = JSON.parse(fs.readFileSync(writtenPath, 'utf8'))
    assert.equal(written['check-package-age'].durationMs, 100)
    assert.equal(written['check-package-age'].networkCalls, 2)
    assert.equal(written['check-package-age'].cacheHits, 1)
  })

  test('withProfile still writes entry and rethrows on error', async () => {
    const fs = buildFs()
    let now = 1000
    const performance = { now: () => (now += 50) }
    const proc = { memoryUsage: () => ({ heapUsed: 2000 }) }
    setImpls({ fs, performance, process: proc })

    const writtenPath = '/tmp/.defence-profile.json'
    await assert.rejects(
      async () =>
        withProfile(
          'check-updates',
          async () => {
            throw new Error('boom')
          },
          { profilePath: writtenPath },
        ),
      /boom/,
    )

    const written = JSON.parse(fs.readFileSync(writtenPath, 'utf8'))
    assert.ok(written['check-updates'])
    assert.equal(written['check-updates'].durationMs, 50)
  })

  test('updateProfile merges multiple tools deterministically', () => {
    const fs = buildFs()
    setImpls({ fs })
    const profilePath = '/tmp/.defence-profile.json'
    updateProfile(profilePath, 'check-updates', {
      timestamp: '2026-09-03T12:00:00Z',
      durationMs: 10,
    })
    updateProfile(profilePath, 'check-package-age', {
      timestamp: '2026-09-03T12:00:01Z',
      durationMs: 20,
    })

    const written = JSON.parse(fs.readFileSync(profilePath, 'utf8'))
    const keys = Object.keys(written)
    assert.deepEqual(keys, ['check-package-age', 'check-updates'])
  })
})
