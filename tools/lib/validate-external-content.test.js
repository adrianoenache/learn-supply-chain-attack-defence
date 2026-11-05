#!/usr/bin/env node
'use strict'

// Tests for validate-external-content.js (Fase AI-3.2) — the output
// validation phase: external payloads must be rejected before they can drive
// security decisions.

const { describe, test } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  validatePackument,
  validatePublishDate,
  validateDistIndex,
  sanitizeDistIndex,
  FUTURE_TOLERANCE_MS,
} = require(path.resolve(__dirname, './validate-external-content.js'))

describe('validatePackument', () => {
  const valid = {
    name: 'demo',
    versions: { '1.0.0': {} },
    time: { '1.0.0': '2026-01-01T00:00:00.000Z' },
  }

  test('accepts a well-formed packument', () => {
    assert.equal(validatePackument(valid, 'demo'), true)
  })

  test('rejects a name mismatch (content confusion)', () => {
    assert.throws(() => validatePackument(valid, 'other'), /content confusion/)
  })

  test('rejects missing versions/time maps', () => {
    assert.throws(
      () => validatePackument({ name: 'x', time: {} }),
      /versions map/,
    )
    assert.throws(
      () => validatePackument({ name: 'x', versions: {} }),
      /time map/,
    )
  })

  test('rejects unparseable publish dates', () => {
    const bad = { ...valid, time: { '1.0.0': 'not-a-date' } }
    assert.throws(() => validatePackument(bad), /unparseable publish date/)
  })

  test('rejects non-object responses', () => {
    assert.throws(() => validatePackument(null), /not an object/)
    assert.throws(() => validatePackument([]), /not an object/)
  })
})

describe('validatePublishDate', () => {
  // Fixed reference clock: 2026-11-03T00:00:00Z (test fixture, not a
  // wall-clock dependency).
  const NOW = Date.parse('2026-11-03T00:00:00Z')

  test('accepts a past date and returns its timestamp', () => {
    const stamp = '2026-10-01T00:00:00.000Z'
    assert.equal(
      validatePublishDate(stamp, 'pkg@1.0.0', NOW),
      Date.parse(stamp),
    )
  })

  test('tolerates dates within the clock-skew window', () => {
    const stamp = new Date(NOW + FUTURE_TOLERANCE_MS - 1000).toISOString()
    assert.ok(validatePublishDate(stamp, 'pkg@1.0.0', NOW))
  })

  test('rejects dates beyond the skew window (manipulated payload)', () => {
    const stamp = new Date(NOW + FUTURE_TOLERANCE_MS + 60_000).toISOString()
    assert.throws(
      () => validatePublishDate(stamp, 'pkg@1.0.0', NOW),
      /in the future/,
    )
  })

  test('rejects unparseable dates', () => {
    assert.throws(
      () => validatePublishDate('garbage', 'pkg@1.0.0', NOW),
      /parse publish date/,
    )
  })
})

describe('validateDistIndex', () => {
  test('accepts real-shaped entries', () => {
    const index = [
      { version: 'v26.13.0', lts: 'Lithium', npm: '11.20.0' },
      { version: 'v26.12.1', lts: false, npm: '11.19.2' },
    ]
    assert.equal(validateDistIndex(index), true)
  })

  test('rejects malformed versions before they reach package.json', () => {
    assert.throws(
      () => validateDistIndex([{ version: 'latest', lts: false }]),
      /malformed version/,
    )
  })

  test('rejects malformed bundled npm versions', () => {
    assert.throws(
      () => validateDistIndex([{ version: 'v26.13.0', npm: 'latest' }]),
      /bundled npm/,
    )
  })

  test('rejects malformed lts fields and empty/non-array indexes', () => {
    assert.throws(
      () => validateDistIndex([{ version: 'v26.13.0', lts: 42 }]),
      /lts/,
    )
    assert.throws(() => validateDistIndex([]), /non-empty array/)
    assert.throws(() => validateDistIndex({}), /non-empty array/)
  })
})

describe('sanitizeDistIndex', () => {
  // "v27.0.0-alpha.0.0.0" is the real malformed entry observed in the
  // official dist index on 2026-11-05 that aborted the whole report run —
  // kept as a fixture so the regression stays covered.
  const MALFORMED = {
    version: 'v27.0.0-alpha.0.0.0',
    lts: false,
    npm: '12.0.0',
  }

  test('keeps valid entries and reports skipped ones with reasons', () => {
    const index = [
      { version: 'v26.13.0', lts: 'Lithium', npm: '11.20.0' },
      MALFORMED,
      { version: 'v24.22.2', lts: 'Krypton', npm: '11.19.1' },
    ]
    const { entries, skipped } = sanitizeDistIndex(index)
    assert.deepEqual(
      entries.map((e) => e.version),
      ['v26.13.0', 'v24.22.2'],
    )
    assert.equal(skipped.length, 1)
    assert.equal(skipped[0].version, 'v27.0.0-alpha.0.0.0')
    assert.match(skipped[0].reason, /malformed version/)
  })

  test('records null version for entries without a version string', () => {
    const { entries, skipped } = sanitizeDistIndex([{ lts: false }])
    assert.equal(entries.length, 0)
    assert.equal(skipped[0].version, null)
    assert.match(skipped[0].reason, /version string/)
  })

  test('still throws on structural problems (nothing to sanitize)', () => {
    assert.throws(() => sanitizeDistIndex([]), /non-empty array/)
    assert.throws(() => sanitizeDistIndex({}), /non-empty array/)
  })
})
