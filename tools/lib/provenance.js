#!/usr/bin/env node
'use strict'

// npm provenance / SLSA attestation verification helper.
// Fetches the attestation bundle from the npm registry and performs a
// structural validation. Does not perform full cryptographic verification
// of the attestation signature (that would require Sigstore libraries), but
// ensures the package publisher claims provenance and the bundle is well-formed.

const path = require('node:path')

const registryCache = require(path.resolve(__dirname, './registry-cache.js'))

let fetchRegistryJsonImpl = registryCache.fetchRegistryJson

function setFetchRegistryJsonImpl(fn) {
  fetchRegistryJsonImpl = fn
}

function resetFetchRegistryJsonImpl() {
  fetchRegistryJsonImpl = registryCache.fetchRegistryJson
}

const ATTESTATION_URL = 'https://registry.npmjs.org/-/npm/v1/attestations'

async function fetchAttestationBundle(name, version, options = {}) {
  const encodedName = encodeURIComponent(name)
  const encodedVersion = encodeURIComponent(version)
  const url = `${ATTESTATION_URL}/${encodedName}@${encodedVersion}`

  // Registry-cache options mirror those used elsewhere.
  const fetchOptions = {
    url,
    cacheTtlHours: options.cacheTtlHours ?? 24,
    maxResponseBytes: options.maxResponseBytes ?? 20 * 1024 * 1024,
    timeoutMs: options.timeoutMs ?? 10000,
    retryMaxAttempts: options.retryMaxAttempts ?? 3,
    retryInitialDelayMs: options.retryInitialDelayMs ?? 1000,
    retryBackoffMultiplier: options.retryBackoffMultiplier ?? 2,
    retryMaxDelayMs: options.retryMaxDelayMs ?? 30000,
    acceptGzip: options.acceptGzip ?? true,
  }

  try {
    return await fetchRegistryJsonImpl(name, version, fetchOptions)
  } catch (err) {
    if (err.statusCode === 404) {
      return null
    }
    throw err
  }
}

function validateAttestationBundle(bundle) {
  if (!bundle || typeof bundle !== 'object') {
    return { valid: false, reason: 'attestation bundle is not an object' }
  }

  const attestations = bundle.attestations
  if (!Array.isArray(attestations) || attestations.length === 0) {
    return {
      valid: false,
      reason: 'attestation bundle contains no attestations',
    }
  }

  for (const attestation of attestations) {
    if (!attestation || typeof attestation !== 'object') {
      return { valid: false, reason: 'attestation entry is not an object' }
    }
    if (
      typeof attestation.payloadType !== 'string' ||
      attestation.payloadType.length === 0
    ) {
      return { valid: false, reason: 'attestation missing payloadType' }
    }
    if (
      typeof attestation.payload !== 'string' ||
      attestation.payload.length === 0
    ) {
      return { valid: false, reason: 'attestation missing payload' }
    }
  }

  return { valid: true, reason: null }
}

async function checkProvenance(name, version, options = {}) {
  const bundle = await fetchAttestationBundle(name, version, options)

  if (bundle === null) {
    return {
      hasProvenance: false,
      valid: false,
      reason: 'no attestation bundle found for this version',
    }
  }

  const validation = validateAttestationBundle(bundle)
  return {
    hasProvenance: true,
    valid: validation.valid,
    reason: validation.reason,
  }
}

module.exports = {
  fetchAttestationBundle,
  validateAttestationBundle,
  checkProvenance,
  setFetchRegistryJsonImpl,
  resetFetchRegistryJsonImpl,
}
