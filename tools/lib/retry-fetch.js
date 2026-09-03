#!/usr/bin/env node
'use strict'

// Shared registry fetch layer with retry, gzip support, response-size limits,
// and dependency-injection hooks for tests.
//
// All defence tools should fetch registry data through fetchJson() so caching,
// compression, and transient-failure handling are applied consistently.

const https = require('node:https')
const zlib = require('node:zlib')

let httpsGetImpl = https.get
let gunzipImpl = zlib.gunzip
let setTimeoutImpl = setTimeout

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504])

function setImpls(impls) {
  if (impls.httpsGet) httpsGetImpl = impls.httpsGet
  if (impls.gunzip) gunzipImpl = impls.gunzip
  if (impls.setTimeout) setTimeoutImpl = impls.setTimeout
}

function resetImpls() {
  httpsGetImpl = https.get
  gunzipImpl = zlib.gunzip
  setTimeoutImpl = setTimeout
}

function parseRetryAfter(value, defaultMs) {
  if (!value) return defaultMs
  const seconds = Number.parseInt(value, 10)
  if (!Number.isNaN(seconds)) return seconds * 1000
  const date = Date.parse(value)
  if (!Number.isNaN(date)) return Math.max(0, date - Date.now())
  return defaultMs
}

function decompressResponse(buffer, headers) {
  const encoding = headers['content-encoding']
  if (encoding !== 'gzip') return Promise.resolve(buffer)
  return new Promise((resolve, reject) => {
    gunzipImpl(buffer, (err, result) => {
      if (err) reject(new Error(`gzip decompression failed: ${err.message}`))
      else resolve(result)
    })
  })
}

function fetchBufferOnce(url, options) {
  return new Promise((resolve, reject) => {
    const maxBytes = options.maxResponseBytes ?? Number.POSITIVE_INFINITY
    const accept = options.acceptGzip !== false ? 'gzip' : undefined
    const headers = { Accept: 'application/json' }
    if (accept) headers['Accept-Encoding'] = accept

    // 10 s is a conservative default socket timeout for registry calls.
    // Callers pass options.timeoutMs from config; this literal only applies
    // when the option is omitted.
    const req = httpsGetImpl(
      url,
      { headers, timeout: options.timeoutMs ?? 10000 },
      (res) => {
        const chunks = []
        let received = 0
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

        res.on('data', (chunk) => {
          received += chunk.length
          if (received > maxBytes) {
            res.destroy()
            safeReject(
              new Error(`response exceeds ${maxBytes} bytes limit for ${url}`),
            )
            return
          }
          chunks.push(chunk)
        })

        res.on('error', (err) => {
          safeReject(new Error(`stream error: ${err.message}`))
        })

        res.on('end', () => {
          if (res.statusCode !== 200) {
            const status = res.statusCode
            const err = new Error(`HTTP ${status}`)
            err.statusCode = status
            err.headers = res.headers
            safeReject(err)
            return
          }
          safeResolve({ buffer: Buffer.concat(chunks), headers: res.headers })
        })
      },
    )

    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout'))
    })
    req.on('error', (err) => {
      const error = new Error(`network error: ${err.message}`)
      if (err.code) error.code = err.code
      reject(error)
    })
  })
}

async function sleep(ms) {
  return new Promise((resolve) => {
    const timer = setTimeoutImpl(resolve, ms)
    if (timer && typeof timer.unref === 'function') timer.unref()
  })
}

function isNetworkError(err) {
  const code = err.code
  if (!code) return false
  return (
    code.startsWith('ECONN') ||
    code === 'ETIMEDOUT' ||
    code === 'EAI_AGAIN' ||
    code === 'ENOTFOUND'
  )
}

function isRetryableError(err) {
  if (err.statusCode !== undefined) {
    return RETRYABLE_STATUS_CODES.has(err.statusCode)
  }
  return isNetworkError(err)
}

async function fetchBuffer(url, options = {}) {
  // Defaults below define the function's safe fallback behavior when callers
  // omit retry options. Project-specific values come from config and are
  // passed by tools such as check-package-age.js and check-updates.js.
  const maxAttempts = options.retryMaxAttempts ?? 1
  const initialDelay = options.retryInitialDelayMs ?? 1000
  const multiplier = options.retryBackoffMultiplier ?? 2
  const maxDelay = options.retryMaxDelayMs ?? 30000
  const shouldRetry = options.shouldRetry ?? (() => true)

  let attempt = 0
  let delay = initialDelay

  while (true) {
    attempt++
    try {
      return await fetchBufferOnce(url, options)
    } catch (err) {
      const isLastAttempt = attempt >= maxAttempts
      const willRetry =
        !isLastAttempt && isRetryableError(err) && shouldRetry(err)

      if (!willRetry) throw err

      if (err.statusCode === 429 && err.headers?.['retry-after']) {
        delay = parseRetryAfter(err.headers['retry-after'], delay)
      }

      await sleep(delay)
      delay = Math.min(delay * multiplier, maxDelay)
    }
  }
}

async function fetchJson(url, options = {}) {
  const { buffer, headers } = await fetchBuffer(url, options)
  const decoded = await decompressResponse(buffer, headers)
  try {
    return JSON.parse(decoded)
  } catch (err) {
    throw new Error(`invalid JSON: ${err.message}`)
  }
}

module.exports = {
  fetchJson,
  fetchBuffer,
  setImpls,
  resetImpls,
  // Exported for tests.
  RETRYABLE_STATUS_CODES,
}
