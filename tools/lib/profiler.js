#!/usr/bin/env node
'use strict'

// Shared profiling helpers for defence tools.
// Collects execution time, memory heap delta, and network/cache metrics,
// then writes a deterministic, diff-friendly `.defence-profile.json` file.
//
// Usage:
//   const { withProfile } = require('./lib/profiler.js')
//   const result = await withProfile('check-package-age', async (metrics) => {
//     metrics.networkCalls = 5
//     metrics.cacheHits = 3
//     return myReturnValue
//   })

const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_PROFILE_PATH = path.resolve(
  process.cwd(),
  '.defence-profile.json',
)

// Dependency injection hooks for tests.
let fsImpl = fs
let performanceImpl = performance
let processImpl = process

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.performance) performanceImpl = impls.performance
  if (impls.process) processImpl = impls.process
}

function resetImpls() {
  fsImpl = fs
  performanceImpl = performance
  processImpl = process
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fsImpl.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function writeJson(filePath, data) {
  const dir = path.dirname(filePath)
  if (!fsImpl.existsSync(dir)) {
    fsImpl.mkdirSync(dir, { recursive: true })
  }
  fsImpl.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

// Format an ISO timestamp rounded to seconds to keep the profile diff-friendly.
function formatTimestamp(date) {
  return `${date.toISOString().slice(0, 19)}Z`
}

// Measure a block of work and merge its metrics into the profile.
async function withProfile(toolName, fn, options = {}) {
  const profilePath = options.profilePath ?? DEFAULT_PROFILE_PATH
  const startTime = performanceImpl.now()
  const heapBefore = processImpl.memoryUsage().heapUsed

  const metrics = {
    networkCalls: 0,
    cacheHits: 0,
    cacheMisses: 0,
  }

  let result
  let error
  try {
    result = await fn(metrics)
  } catch (err) {
    error = err
  }

  const durationMs = performanceImpl.now() - startTime
  const heapAfter = processImpl.memoryUsage().heapUsed

  const entry = {
    timestamp: formatTimestamp(new Date()),
    durationMs: Number(durationMs.toFixed(2)),
    heapDeltaBytes: heapAfter - heapBefore,
    networkCalls: metrics.networkCalls,
    cacheHits: metrics.cacheHits,
    cacheMisses: metrics.cacheMisses,
  }

  updateProfile(profilePath, toolName, entry)

  if (error) {
    throw error
  }
  return result
}

// Merge a new entry into the existing profile, keeping one entry per tool.
function updateProfile(profilePath, toolName, entry) {
  const profile = readJsonSafe(profilePath) ?? {}
  profile[toolName] = entry
  // Sort keys deterministically so diffs are stable.
  const sorted = Object.keys(profile)
    .sort()
    .reduce((acc, key) => {
      acc[key] = profile[key]
      return acc
    }, {})
  writeJson(profilePath, sorted)
}

module.exports = {
  withProfile,
  updateProfile,
  formatTimestamp,
  setImpls,
  resetImpls,
}
