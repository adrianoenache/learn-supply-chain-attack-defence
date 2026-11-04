#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  fetchAttestationBundle,
  validateAttestationBundle,
  checkProvenance,
  setFetchRegistryJsonImpl,
  resetFetchRegistryJsonImpl,
} = require(path.resolve(__dirname, './provenance.js'))

function makeMockFetchRegistryJson(responses) {
  return async (name, version, options) => {
    void options
    const key = `${name}@${version}`
    const response = responses[key] ?? responses[name] ?? { statusCode: 404 }
    if (response.error) throw response.error
    if (response.statusCode && response.statusCode !== 200) {
      const err = new Error(`HTTP ${response.statusCode}`)
      err.statusCode = response.statusCode
      throw err
    }
    return response.body ?? response
  }
}

describe('provenance', () => {
  beforeEach(() => {
    resetFetchRegistryJsonImpl()
  })

  afterEach(() => {
    resetFetchRegistryJsonImpl()
  })

  test('validateAttestationBundle accepts well-formed bundle', () => {
    const bundle = {
      attestations: [
        {
          payloadType: 'application/vnd.in-toto+json',
          payload: 'aGVsbG8=',
        },
      ],
    }
    const result = validateAttestationBundle(bundle)
    assert.equal(result.valid, true)
    assert.equal(result.reason, null)
  })

  test('validateAttestationBundle rejects missing attestations', () => {
    const result = validateAttestationBundle({})
    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('no attestations'))
  })

  test('validateAttestationBundle rejects malformed attestation', () => {
    const bundle = {
      attestations: [{ payloadType: 'application/vnd.in-toto+json' }],
    }
    const result = validateAttestationBundle(bundle)
    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('payload'))
  })

  test('validateAttestationBundle rejects non-object bundle', () => {
    const result = validateAttestationBundle(null)
    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('not an object'))
  })

  test('validateAttestationBundle rejects non-object attestation entry', () => {
    const result = validateAttestationBundle({ attestations: [null] })
    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('entry is not an object'))
  })

  test('validateAttestationBundle rejects missing payloadType', () => {
    const result = validateAttestationBundle({
      attestations: [{ payload: 'aGVsbG8=' }],
    })
    assert.equal(result.valid, false)
    assert.ok(result.reason.includes('payloadType'))
  })

  test('fetchAttestationBundle returns body on 200', async () => {
    const body = { attestations: [{ payloadType: 'x', payload: 'y' }] }
    setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'safe-pkg@1.0.0': { statusCode: 200, body },
      }),
    )

    const result = await fetchAttestationBundle('safe-pkg', '1.0.0')
    assert.deepEqual(result, body)
  })

  test('fetchAttestationBundle returns null on 404', async () => {
    setFetchRegistryJsonImpl(makeMockFetchRegistryJson({}))

    const result = await fetchAttestationBundle('missing-pkg', '1.0.0')
    assert.equal(result, null)
  })

  test('fetchAttestationBundle throws on non-404 errors', async () => {
    setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'bad-pkg@1.0.0': { statusCode: 503 },
      }),
    )

    await assert.rejects(
      () => fetchAttestationBundle('bad-pkg', '1.0.0'),
      /HTTP 503/,
    )
  })

  test('checkProvenance reports valid provenance', async () => {
    const body = { attestations: [{ payloadType: 'x', payload: 'y' }] }
    setFetchRegistryJsonImpl(
      makeMockFetchRegistryJson({
        'signed-pkg@1.0.0': { statusCode: 200, body },
      }),
    )

    const result = await checkProvenance('signed-pkg', '1.0.0')
    assert.equal(result.hasProvenance, true)
    assert.equal(result.valid, true)
  })

  test('checkProvenance reports missing provenance', async () => {
    setFetchRegistryJsonImpl(makeMockFetchRegistryJson({}))

    const result = await checkProvenance('unsigned-pkg', '1.0.0')
    assert.equal(result.hasProvenance, false)
    assert.equal(result.valid, false)
  })
})
