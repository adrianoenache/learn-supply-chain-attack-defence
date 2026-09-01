#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')

const {
  fetchRegistryJson,
  buildCacheKey,
  clearCache,
  isCacheDisabled,
  setImpls,
  resetImpls,
} = require('./registry-cache.js')

describe('registry-cache', () => {
  let fsMock
  let now
  const files = new Map()

  beforeEach(() => {
    files.clear()
    now = Date.now()
    fsMock = {
      existsSync: (p) => files.has(p),
      readFileSync: (p, enc) => {
        if (!files.has(p)) throw new Error(`ENOENT: ${p}`)
        const content = files.get(p)
        if (enc === 'utf8') return content
        return Buffer.from(content)
      },
      writeFileSync: (p, data) => files.set(p, data),
      mkdirSync: (_p, _opts) => {},
      readdirSync: () =>
        Array.from(files.keys()).map((p) => p.split('/').pop()),
      unlinkSync: (p) => files.delete(p),
    }
    setImpls({ fs: fsMock, now: () => now })
  })

  afterEach(() => {
    resetImpls()
  })

  test('buildCacheKey returns stable SHA-256 hex', () => {
    const key = buildCacheKey('lodash', '4.17.21')
    const expected = crypto
      .createHash('sha256')
      .update('lodash@4.17.21')
      .digest('hex')
    assert.equal(key, expected)
  })

  test('fetchRegistryJson caches successful responses', async () => {
    const calls = []
    setImpls({
      fs: fsMock,
      now: () => now,
      fetchJson: async (_url, _opts) => {
        calls.push(1)
        return { time: { '1.0.0': new Date(now).toISOString() } }
      },
    })

    const data1 = await fetchRegistryJson('mypkg', '1.0.0', {
      cacheTtlHours: 1,
    })
    const data2 = await fetchRegistryJson('mypkg', '1.0.0', {
      cacheTtlHours: 1,
    })

    assert.deepEqual(data1, data2)
    assert.equal(calls.length, 1)
  })

  test('fetchRegistryJson refetches expired cache entries', async () => {
    const calls = []
    setImpls({
      fs: fsMock,
      now: () => now,
      fetchJson: async () => {
        calls.push(1)
        return { ok: calls.length }
      },
    })

    await fetchRegistryJson('mypkg', '1.0.0', { cacheTtlHours: 1 })
    now += 2 * 60 * 60 * 1000
    const data = await fetchRegistryJson('mypkg', '1.0.0', {
      cacheTtlHours: 1,
    })

    assert.equal(data.ok, 2)
    assert.equal(calls.length, 2)
  })

  test('force option bypasses cache', async () => {
    const calls = []
    setImpls({
      fs: fsMock,
      now: () => now,
      fetchJson: async () => {
        calls.push(1)
        return { ok: calls.length }
      },
    })

    await fetchRegistryJson('mypkg', '1.0.0', { cacheTtlHours: 1 })
    await fetchRegistryJson('mypkg', '1.0.0', {
      cacheTtlHours: 1,
      force: true,
    })

    assert.equal(calls.length, 2)
  })

  test('isCacheDisabled reflects DEFENCE_NO_CACHE', () => {
    const original = process.env.DEFENCE_NO_CACHE
    try {
      process.env.DEFENCE_NO_CACHE = '1'
      assert.equal(isCacheDisabled(), true)
      delete process.env.DEFENCE_NO_CACHE
      assert.equal(isCacheDisabled(), false)
    } finally {
      if (original === undefined) delete process.env.DEFENCE_NO_CACHE
      else process.env.DEFENCE_NO_CACHE = original
    }
  })

  test('clearCache removes all cached entries', async () => {
    const localFiles = new Map()
    const localFs = {
      ...fsMock,
      readFileSync: (p, enc) => {
        if (!localFiles.has(p)) throw new Error(`ENOENT: ${p}`)
        const content = localFiles.get(p)
        if (enc === 'utf8') return content
        return Buffer.from(content)
      },
      writeFileSync: (p, data) => localFiles.set(p, data),
      readdirSync: () =>
        Array.from(localFiles.keys()).map((p) => p.split('/').pop()),
      unlinkSync: (p) => localFiles.delete(p),
      existsSync: (p) => localFiles.has(p),
    }

    setImpls({
      fs: localFs,
      now: () => now,
      fetchJson: async () => ({ ok: true }),
    })

    await fetchRegistryJson('mypkg', '1.0.0', { cacheTtlHours: 1 })
    clearCache()

    const calls = []
    setImpls({
      fs: localFs,
      now: () => now,
      fetchJson: async () => {
        calls.push(1)
        return { ok: true }
      },
    })
    await fetchRegistryJson('mypkg', '1.0.0', { cacheTtlHours: 1 })
    assert.equal(calls.length, 1)
  })

  test('invokes cache hit/miss callbacks', async () => {
    const events = []
    setImpls({
      fs: fsMock,
      now: () => now,
      fetchJson: async () => ({ ok: true }),
    })

    await fetchRegistryJson('mypkg', '1.0.0', {
      cacheTtlHours: 1,
      onCacheHit: (name, version) => events.push(`hit:${name}@${version}`),
      onCacheMiss: (name, version) => events.push(`miss:${name}@${version}`),
    })
    assert.deepEqual(events, ['miss:mypkg@1.0.0'])

    events.length = 0
    await fetchRegistryJson('mypkg', '1.0.0', {
      cacheTtlHours: 1,
      onCacheHit: (name, version) => events.push(`hit:${name}@${version}`),
      onCacheMiss: (name, version) => events.push(`miss:${name}@${version}`),
    })
    assert.deepEqual(events, ['hit:mypkg@1.0.0'])
  })
})
