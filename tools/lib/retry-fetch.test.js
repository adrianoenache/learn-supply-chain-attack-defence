#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')

const {
  fetchJson,
  fetchBuffer,
  setImpls,
  resetImpls,
  RETRYABLE_STATUS_CODES,
} = require('./retry-fetch.js')

function makeMockRequest() {
  const req = new EventEmitter()
  req.destroy = () => {}
  return req
}

function makeMockResponse(statusCode, body, headers = {}) {
  const res = new EventEmitter()
  res.statusCode = statusCode
  res.headers = headers
  res.destroy = () => {}
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body ?? '')
  process.nextTick(() => {
    res.emit('data', buffer)
    process.nextTick(() => res.emit('end'))
  })
  return res
}

function makeMockHttpsGet(responses) {
  let callIndex = 0
  return (_url, _options, cb) => {
    const response = responses[callIndex++] ?? {
      statusCode: 404,
      body: '{}',
    }
    const req = makeMockRequest()
    process.nextTick(() => {
      if (response.error) {
        req.emit('error', response.error)
        return
      }
      cb(makeMockResponse(response.statusCode, response.body, response.headers))
    })
    return req
  }
}

describe('retry-fetch', () => {
  beforeEach(() => {
    resetImpls()
  })

  afterEach(() => {
    resetImpls()
  })

  test('returns parsed JSON for HTTP 200', async () => {
    setImpls({
      httpsGet: makeMockHttpsGet([
        { statusCode: 200, body: JSON.stringify({ ok: true }) },
      ]),
    })
    const result = await fetchJson('https://example.com')
    assert.deepEqual(result, { ok: true })
  })

  test('retries on 429 and respects Retry-After', async () => {
    const delays = []
    setImpls({
      httpsGet: makeMockHttpsGet([
        { statusCode: 429, body: '{}', headers: { 'retry-after': '2' } },
        { statusCode: 200, body: JSON.stringify({ ok: true }) },
      ]),
      setTimeout: (fn, ms) => {
        delays.push(ms)
        return setTimeout(fn, 0)
      },
    })
    const result = await fetchJson('https://example.com', {
      retryMaxAttempts: 3,
      retryInitialDelayMs: 100,
    })
    assert.deepEqual(result, { ok: true })
    assert.deepEqual(delays, [2000])
  })

  test('retries on 503 with exponential backoff', async () => {
    const delays = []
    setImpls({
      httpsGet: makeMockHttpsGet([
        { statusCode: 503, body: '{}' },
        { statusCode: 503, body: '{}' },
        { statusCode: 200, body: JSON.stringify({ ok: true }) },
      ]),
      setTimeout: (fn, ms) => {
        delays.push(ms)
        return setTimeout(fn, 0)
      },
    })
    const result = await fetchJson('https://example.com', {
      retryMaxAttempts: 3,
      retryInitialDelayMs: 100,
      retryBackoffMultiplier: 2,
    })
    assert.deepEqual(result, { ok: true })
    assert.deepEqual(delays, [100, 200])
  })

  test('does not retry on 4xx errors', async () => {
    setImpls({
      httpsGet: makeMockHttpsGet([{ statusCode: 404, body: '{}' }]),
    })
    await assert.rejects(
      () => fetchJson('https://example.com', { retryMaxAttempts: 3 }),
      /HTTP 404/,
    )
  })

  test('retries network errors', async () => {
    const networkError = new Error('ECONNRESET')
    networkError.code = 'ECONNRESET'
    setImpls({
      httpsGet: makeMockHttpsGet([
        { error: networkError },
        { statusCode: 200, body: JSON.stringify({ ok: true }) },
      ]),
    })
    const result = await fetchJson('https://example.com', {
      retryMaxAttempts: 2,
      retryInitialDelayMs: 1,
    })
    assert.deepEqual(result, { ok: true })
  })

  test('gives up after max attempts', async () => {
    setImpls({
      httpsGet: makeMockHttpsGet([
        { statusCode: 503, body: '{}' },
        { statusCode: 503, body: '{}' },
        { statusCode: 503, body: '{}' },
      ]),
    })
    await assert.rejects(
      () =>
        fetchJson('https://example.com', {
          retryMaxAttempts: 3,
          retryInitialDelayMs: 1,
        }),
      /HTTP 503/,
    )
  })

  test('decompresses gzip response', async () => {
    const zlib = require('node:zlib')
    const body = zlib.gzipSync(JSON.stringify({ ok: true }))
    setImpls({
      httpsGet: makeMockHttpsGet([
        { statusCode: 200, body, headers: { 'content-encoding': 'gzip' } },
      ]),
    })
    const result = await fetchJson('https://example.com')
    assert.deepEqual(result, { ok: true })
  })

  test('rejects when gzip payload is invalid', async () => {
    setImpls({
      httpsGet: makeMockHttpsGet([
        {
          statusCode: 200,
          body: Buffer.from('not-gzip'),
          headers: { 'content-encoding': 'gzip' },
        },
      ]),
    })
    await assert.rejects(
      () => fetchJson('https://example.com'),
      /gzip decompression failed/,
    )
  })

  test('respects maxResponseBytes', async () => {
    setImpls({
      httpsGet: (_url, _options, cb) => {
        const res = new EventEmitter()
        res.statusCode = 200
        res.headers = {}
        res.destroy = () => {}
        process.nextTick(() => {
          cb(res)
          res.emit('data', Buffer.alloc(11, 'x'))
          process.nextTick(() => res.emit('end'))
        })
        return makeMockRequest()
      },
    })
    await assert.rejects(
      () => fetchBuffer('https://example.com', { maxResponseBytes: 10 }),
      /response exceeds 10 bytes limit/,
    )
  })

  test('rejects on request timeout', async () => {
    setImpls({
      httpsGet: (_url, _options, _cb) => {
        const req = makeMockRequest()
        process.nextTick(() => req.emit('timeout'))
        return req
      },
    })
    await assert.rejects(
      () => fetchJson('https://example.com', { retryMaxAttempts: 1 }),
      /timeout/,
    )
  })

  test('RETRYABLE_STATUS_CODES contains expected statuses', () => {
    for (const code of [429, 502, 503, 504]) {
      assert.ok(RETRYABLE_STATUS_CODES.has(code))
    }
  })

  test('acceptGzip false omits Accept-Encoding header', async () => {
    const calls = []
    setImpls({
      httpsGet: (_url, options, cb) => {
        calls.push(options.headers)
        cb(makeMockResponse(200, JSON.stringify({ ok: true })))
        return makeMockRequest()
      },
    })
    await fetchJson('https://example.com', { acceptGzip: false })
    assert.equal(calls[0]['Accept-Encoding'], undefined)
  })

  test('handles stream error during response', async () => {
    setImpls({
      httpsGet: (_url, _options, cb) => {
        const res = new EventEmitter()
        res.statusCode = 200
        res.headers = {}
        res.destroy = () => {}
        process.nextTick(() => {
          cb(res)
          res.emit('error', new Error('stream broke'))
        })
        return makeMockRequest()
      },
    })
    await assert.rejects(
      () => fetchJson('https://example.com', { retryMaxAttempts: 1 }),
      /stream error/,
    )
  })

  test('handles request error', async () => {
    setImpls({
      httpsGet: () => {
        const req = makeMockRequest()
        process.nextTick(() => {
          const err = new Error('socket hang up')
          err.code = 'ECONNRESET'
          req.emit('error', err)
        })
        return req
      },
    })
    await assert.rejects(
      () => fetchJson('https://example.com', { retryMaxAttempts: 1 }),
      /network error/,
    )
  })

  test('rejects invalid JSON', async () => {
    setImpls({
      httpsGet: makeMockHttpsGet([{ statusCode: 200, body: 'not-json' }]),
    })
    await assert.rejects(() => fetchJson('https://example.com'), /invalid JSON/)
  })
})
