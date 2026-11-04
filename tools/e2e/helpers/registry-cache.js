'use strict'

// Registry response cache for the E2E test suite.
// Speeds up repeated local runs and reduces dependency on the real npm registry.
//
// Cache behavior:
// - Responses are stored in tools/e2e/.cache/ using a SHA-256 key derived from
//   "name@version".
// - A cached entry is reused only while its age is below the TTL.
// - Set E2E_NO_CACHE=true to always fetch from the registry.
// - The cache directory is git-ignored and must never be committed.

const https = require('node:https')
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const { loadConfig } = require(path.resolve(__dirname, '../../lib/config.js'))

const config = loadConfig()
const e2eConfig = config.e2e

// 24 hours by default; override with E2E_CACHE_TTL_HOURS=<number>.
const TTL_MS = e2eConfig.cacheTtlHours * 60 * 60 * 1000

const CACHE_DIR = path.resolve(__dirname, '../.cache')

// Maximum response size per registry call (20 MB).
// Mirrors the cap in check-package-age.js to avoid pathological payloads.
const MAX_RESPONSE_BYTES = config.pkgAgeCheck.maxResponseMB * 1024 * 1024

// Network timeout for registry requests (10 seconds).
const REQUEST_TIMEOUT_MS = config.pkgAgeCheck.registryTimeoutMs

function cachePath(name, version) {
  const key = crypto
    .createHash('sha256')
    .update(`${name}@${version}`)
    .digest('hex')
  return path.join(CACHE_DIR, `${key}.json`)
}

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true })
  }
}

function readCache(name, version) {
  if (process.env.E2E_NO_CACHE === 'true') return null

  const file = cachePath(name, version)
  if (!fs.existsSync(file)) return null

  try {
    const entry = JSON.parse(fs.readFileSync(file, 'utf8'))
    if (!entry.timestamp || !entry.data) return null

    const ageMs = Date.now() - entry.timestamp
    if (ageMs > TTL_MS) return null

    return entry.data
  } catch {
    // Corrupted cache entry — treat as a miss.
    return null
  }
}

function writeCache(name, version, data) {
  ensureCacheDir()
  const file = cachePath(name, version)
  const entry = { timestamp: Date.now(), data }
  fs.writeFileSync(file, JSON.stringify(entry))
}

// Fetches the full package document from registry.npmjs.org.
// Returns the parsed JSON object or rejects with a descriptive error.
function fetchFromRegistry(name) {
  return new Promise((resolve, reject) => {
    let settled = false
    const safeResolve = (val) => {
      if (!settled) {
        settled = true
        resolve(val)
      }
    }
    const safeReject = (err) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    }

    const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`
    const req = https.get(
      url,
      { headers: { Accept: 'application/json' }, timeout: REQUEST_TIMEOUT_MS },
      (res) => {
        let data = ''

        res.on('data', (chunk) => {
          data += chunk
          if (Buffer.byteLength(data) > MAX_RESPONSE_BYTES) {
            res.destroy()
            safeReject(
              new Error(
                `Response for ${name} exceeds ${MAX_RESPONSE_BYTES / (1024 * 1024)} MB limit`,
              ),
            )
          }
        })

        res.on('error', (err) => {
          safeReject(new Error(`Stream error for ${name}: ${err.message}`))
        })

        res.on('end', () => {
          if (res.statusCode !== 200) {
            safeReject(
              new Error(`Registry returned HTTP ${res.statusCode} for ${name}`),
            )
            return
          }

          try {
            safeResolve(JSON.parse(data))
          } catch (err) {
            safeReject(
              new Error(`Failed to parse response for ${name}: ${err.message}`),
            )
          }
        })
      },
    )

    req.on('timeout', () => {
      req.destroy()
      safeReject(new Error(`Timeout fetching registry data for ${name}`))
    })

    req.on('error', (err) => {
      safeReject(new Error(`Network error for ${name}: ${err.message}`))
    })
  })
}

// Returns the full package document for the given package version,
// using the local cache when available and not expired.
async function fetchPackageDocument(name, version) {
  const cached = readCache(name, version)
  if (cached) return cached

  const doc = await fetchFromRegistry(name)
  writeCache(name, version, doc)
  return doc
}

module.exports = {
  fetchPackageDocument,
  fetchFromRegistry,
  readCache,
  writeCache,
  cachePath,
  CACHE_DIR,
  TTL_MS,
}
