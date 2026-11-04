#!/usr/bin/env node
'use strict'

// Shared semver helpers for defence tools.
//
// Extracted from check-engines.js when update-engines.js (Fase L.1) became
// the second consumer — per the project rule, only byte-identical
// implementations used by more than one file are promoted to tools/lib/.
// These helpers intentionally cover only plain X.Y.Z versions with an
// optional pre-release suffix; they are NOT a full semver implementation
// (no range parsing, no build metadata). Engine floors and Node.js dist
// entries never use those features, so a dependency would be unjustified.

function versionToParts(version) {
  const [core] = version.split('-')
  return core.split('.').map(Number)
}

function compareVersions(a, b) {
  const partsA = versionToParts(a)
  const partsB = versionToParts(b)
  const len = Math.max(partsA.length, partsB.length)
  for (let i = 0; i < len; i += 1) {
    const pa = partsA[i] || 0
    const pb = partsB[i] || 0
    if (pa > pb) return 1
    if (pa < pb) return -1
  }
  return 0
}

module.exports = {
  compareVersions,
  versionToParts,
}
