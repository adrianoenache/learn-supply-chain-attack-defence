#!/usr/bin/env node
'use strict'

// Validation of external content before it is trusted by defence tools
// (Fase AI-3.2 — the output-validation phase of the APPA-inspired reference
// monitor, arXiv:2607.24625).
//
// Why it exists: the age gate, the update classifier, and the engine tool all
// make security decisions from registry/dist responses. An unvalidated
// payload is an injection path into those decisions — e.g. a publish date far
// in the past would silently bypass the minimum-age gate. These validators
// reject malformed or implausible shapes BEFORE the data is used.
//
// Pure functions, no I/O: callers fetch, then validate, then use.

// A publish date slightly in the future is plausible (registry/consumer clock
// skew); a day is a generous, intentional tolerance — anything beyond it is
// treated as a manipulated payload.
const FUTURE_TOLERANCE_MS = 24 * 60 * 60 * 1000

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isValidIsoDate(value) {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

// Validates an npm registry packument (abbreviated or full document).
// Throws with an actionable message on any shape violation.
function validatePackument(info, expectedName) {
  if (!isPlainObject(info)) {
    throw new Error(
      'Registry response is not an object — refusing to trust it.',
    )
  }
  if (typeof info.name !== 'string' || info.name.length === 0) {
    throw new Error(
      'Registry response has no package name — refusing to trust it.',
    )
  }
  if (expectedName && info.name !== expectedName) {
    throw new Error(
      `Registry responded for "${info.name}" while "${expectedName}" was requested — possible content confusion.`,
    )
  }
  if (!isPlainObject(info.versions)) {
    throw new Error(
      `Registry response for ${info.name} has no versions map — refusing to trust it.`,
    )
  }
  if (!isPlainObject(info.time)) {
    throw new Error(
      `Registry response for ${info.name} has no time map — the age gate cannot work without publish dates.`,
    )
  }
  for (const [version, stamp] of Object.entries(info.time)) {
    if (!isValidIsoDate(stamp)) {
      throw new Error(
        `Registry response for ${info.name}@${version} has an unparseable publish date — refusing to trust it.`,
      )
    }
  }
  return true
}

// Validates one publish timestamp against the clock: unparseable or too far
// in the future means the response cannot drive an age decision.
function validatePublishDate(stamp, pkgLabel, now = Date.now()) {
  if (!isValidIsoDate(stamp)) {
    throw new Error(
      `Could not parse publish date for ${pkgLabel} — refusing to make an age decision on it.`,
    )
  }
  const published = Date.parse(stamp)
  if (published > now + FUTURE_TOLERANCE_MS) {
    throw new Error(
      `Publish date for ${pkgLabel} is in the future (${stamp}) — implausible registry data, refusing to make an age decision on it.`,
    )
  }
  return published
}

// Validates one entry of the official Node.js dist index.
function validateDistEntry(entry) {
  if (!isPlainObject(entry) || typeof entry.version !== 'string') {
    throw new Error(
      'Dist index entry without a version string — refusing to trust it.',
    )
  }
  if (!/^v\d+\.\d+\.\d+$/.test(entry.version)) {
    throw new Error(
      `Dist index entry has a malformed version "${entry.version}" — refusing to write it into engines.`,
    )
  }
  if (
    entry.npm !== undefined &&
    entry.npm !== null &&
    !/^\d+\.\d+\.\d+$/.test(entry.npm)
  ) {
    throw new Error(
      `Dist index entry ${entry.version} has a malformed bundled npm version — refusing to trust it.`,
    )
  }
  if (
    entry.lts !== undefined &&
    entry.lts !== false &&
    entry.lts !== null &&
    typeof entry.lts !== 'string'
  ) {
    throw new Error(
      `Dist index entry ${entry.version} has a malformed lts field — refusing to trust it.`,
    )
  }
  return true
}

function validateDistIndex(index) {
  if (!Array.isArray(index) || index.length === 0) {
    throw new Error(
      'Dist index is not a non-empty array — refusing to trust it.',
    )
  }
  for (const entry of index) validateDistEntry(entry)
  return true
}

module.exports = {
  validatePackument,
  validatePublishDate,
  validateDistEntry,
  validateDistIndex,
  FUTURE_TOLERANCE_MS,
}
