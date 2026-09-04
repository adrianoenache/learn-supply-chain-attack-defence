#!/usr/bin/env node
'use strict'

// Disk-backed registry response cache for defence tools.
//
// Cached entries are keyed by SHA-256 of "name@version" and stored as JSON under
// .cache/registry/<hash>.json. Each entry records the requested URL, ETag,
// response body (already parsed as a JSON object), timestamp, and TTL.
//
// Invalidation:
//   - Set DEFENCE_NO_CACHE=1 or pass force=true to bypass reads and skip writes.
//
// This module uses retry-fetch.js for the actual network call, so gzip, retry,
// and size limits are inherited automatically.

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const { fetchJson } = require(path.resolve(__dirname, './retry-fetch.js'))

let fsImpl = fs
let fetchJsonImpl = fetchJson
let nowImpl = Date.now

const CACHE_DIR = path.resolve(__dirname, '../..', '.cache', 'registry')

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.fetchJson) fetchJsonImpl = impls.fetchJson
  if (impls.now) nowImpl = impls.now
}

function resetImpls() {
  fsImpl = fs
  fetchJsonImpl = fetchJson
  nowImpl = Date.now
}

function isCacheDisabled() {
  return process.env.DEFENCE_NO_CACHE === '1'
}

function buildCacheKey(name, version, url) {
  return crypto
    .createHash('sha256')
    .update(`${name}@${version ?? ''}@${url ?? ''}`)
    .digest('hex')
}

function cacheEntryPath(key) {
  return path.resolve(CACHE_DIR, `${key}.json`)
}

function ensureCacheDir() {
  if (!fsImpl.existsSync(CACHE_DIR)) {
    fsImpl.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function readCacheEntry(key, ttlMs) {
  if (isCacheDisabled()) return null
  const filePath = cacheEntryPath(key)
  try {
    const raw = fsImpl.readFileSync(filePath, 'utf8')
    const entry = JSON.parse(raw)
    if (!entry || typeof entry !== 'object') return null
    const age = nowImpl() - (entry.cachedAt ?? 0)
    if (age > ttlMs) return null
    return {
      data: entry.data,
      headers: entry.headers ?? {},
      cachedAt: entry.cachedAt,
    }
  } catch {
    return null
  }
}

function writeCacheEntry(key, data, headers) {
  if (isCacheDisabled()) return
  ensureCacheDir()
  const filePath = cacheEntryPath(key)
  const entry = {
    cachedAt: nowImpl(),
    data,
    headers,
  }
  fsImpl.writeFileSync(filePath, JSON.stringify(entry))
}

function _invalidateCache(name, version, url) {
  try {
    const key = buildCacheKey(name, version, url)
    const filePath = cacheEntryPath(key)
    if (fsImpl.existsSync(filePath)) {
      fsImpl.unlinkSync(filePath)
    }
  } catch {
    // Best-effort invalidation.
  }
}

async function fetchRegistryJson(name, version, options = {}) {
  const url =
    options.url ?? `https://registry.npmjs.org/${encodeURIComponent(name)}`
  // 24 hours is a conservative default cache lifetime for immutable registry
  // packuments. Callers should pass options.cacheTtlHours to enforce project
  // policy; this literal only defines the function's fallback behavior.
  const ttlHours = options.cacheTtlHours ?? 24
  const ttlMs = ttlHours * 60 * 60 * 1000
  const force = options.force === true || isCacheDisabled()
  const key = buildCacheKey(name, version, url)

  if (!force) {
    const cached = readCacheEntry(key, ttlMs)
    if (cached) {
      cacheHits++
      if (options.onCacheHit) options.onCacheHit(name, version)
      return cached.data
    }
  }

  cacheMisses++
  if (options.onCacheMiss) options.onCacheMiss(name, version)

  const fetchOptions = {
    maxResponseBytes: options.maxResponseBytes,
    timeoutMs: options.timeoutMs,
    retryMaxAttempts: options.retryMaxAttempts,
    retryInitialDelayMs: options.retryInitialDelayMs,
    retryBackoffMultiplier: options.retryBackoffMultiplier,
    retryMaxDelayMs: options.retryMaxDelayMs,
    acceptGzip: options.acceptGzip,
  }

  const data = await fetchJsonImpl(url, fetchOptions)
  if (!force) {
    writeCacheEntry(key, data, {})
  }
  return data
}

function clearCache() {
  try {
    for (const file of fsImpl.readdirSync(CACHE_DIR)) {
      fsImpl.unlinkSync(path.resolve(CACHE_DIR, file))
    }
  } catch {
    // Best-effort cleanup (directory may not exist).
  }
}

// Returns cache statistics since the last reset. Used by the profiler to
// report network vs cache efficiency.
let cacheHits = 0
let cacheMisses = 0

function resetStats() {
  cacheHits = 0
  cacheMisses = 0
}

function getStats() {
  return { cacheHits, cacheMisses }
}

module.exports = {
  fetchRegistryJson,
  buildCacheKey,
  clearCache,
  isCacheDisabled,
  setImpls,
  resetImpls,
  resetStats,
  getStats,
}
