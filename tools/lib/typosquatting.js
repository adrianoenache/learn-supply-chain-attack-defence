#!/usr/bin/env node
'use strict'

// Typosquatting and dependency-confusion detection.
// Uses only native Node.js modules and a configurable Levenshtein distance
// threshold to flag package names that are suspiciously similar to existing
// dependencies or to configured private/internal names.

const fs = require('node:fs')
const path = require('node:path')

let fsImpl = fs

function setFsImpl(fn) {
  fsImpl = fn
}

function resetFsImpl() {
  fsImpl = fs
}

// Classic dynamic-programming Levenshtein distance.
function calculateDistance(a, b) {
  const aLen = a.length
  const bLen = b.length

  if (aLen === 0) return bLen
  if (bLen === 0) return aLen

  // Keep two rows to stay O(min(a,b)) in space.
  let previous = new Uint32Array(bLen + 1)
  let current = new Uint32Array(bLen + 1)

  for (let j = 0; j <= bLen; j++) {
    previous[j] = j
  }

  for (let i = 1; i <= aLen; i++) {
    current[0] = i
    const aChar = a.charCodeAt(i - 1)
    for (let j = 1; j <= bLen; j++) {
      const cost = aChar === b.charCodeAt(j - 1) ? 0 : 1
      current[j] = Math.min(
        previous[j] + 1, // deletion
        current[j - 1] + 1, // insertion
        previous[j - 1] + cost, // substitution
      )
    }
    ;[previous, current] = [current, previous]
  }

  return previous[bLen]
}

function isSimilar(nameA, nameB, threshold) {
  if (nameA === nameB) return false // exact match is not typosquatting
  return calculateDistance(nameA, nameB) <= threshold
}

function readInstalledPackageNames(lockFilePath) {
  const names = new Set()
  try {
    const lock = JSON.parse(fsImpl.readFileSync(lockFilePath, 'utf8'))
    if (lock.packages) {
      for (const key of Object.keys(lock.packages)) {
        // keys look like "node_modules/foo" or "node_modules/@scope/foo"
        const match = key.match(/^node_modules\/(.+)$/)
        if (match) names.add(match[1])
      }
    }
    if (lock.dependencies) {
      for (const name of Object.keys(lock.dependencies)) {
        names.add(name)
      }
    }
  } catch {
    // ignore missing or malformed lockfile
  }
  return Array.from(names)
}

function readDeclaredPackageNames(packageJsonPath) {
  const names = new Set()
  try {
    const pkg = JSON.parse(fsImpl.readFileSync(packageJsonPath, 'utf8'))
    const sections = [
      pkg.dependencies,
      pkg.devDependencies,
      pkg.peerDependencies,
      pkg.optionalDependencies,
    ]
    for (const section of sections) {
      if (section) {
        for (const name of Object.keys(section)) {
          names.add(name)
        }
      }
    }
  } catch {
    // ignore missing or malformed package.json
  }
  return Array.from(names)
}

function findTyposquattingConflicts(name, existingNames, threshold) {
  const conflicts = []
  for (const existing of existingNames) {
    if (isSimilar(name, existing, threshold)) {
      conflicts.push({
        type: 'typosquatting',
        existing,
        distance: calculateDistance(name, existing),
      })
    }
  }
  return conflicts
}

async function findDependencyConfusion(
  name,
  internalNames,
  publicPackagesResolver,
) {
  if (!internalNames.includes(name)) return []
  const existsPublicly = await publicPackagesResolver(name)
  if (existsPublicly) {
    return [
      {
        type: 'dependency-confusion',
        name,
        reason: 'internal package name exists on the public registry',
      },
    ]
  }
  return []
}

async function findConflicts(name, options) {
  const {
    threshold = 2,
    internalNames = [],
    existingNames = [],
    publicPackagesResolver = () => false,
  } = options ?? {}

  const conflicts = []
  conflicts.push(...findTyposquattingConflicts(name, existingNames, threshold))
  conflicts.push(
    ...(await findDependencyConfusion(
      name,
      internalNames,
      publicPackagesResolver,
    )),
  )
  return conflicts
}

function loadExistingNames(repoRoot) {
  const packageJsonPath = path.resolve(repoRoot, 'package.json')
  const lockFilePath = path.resolve(repoRoot, 'package-lock.json')
  const declared = readDeclaredPackageNames(packageJsonPath)
  const installed = readInstalledPackageNames(lockFilePath)
  return Array.from(new Set([...declared, ...installed]))
}

function loadInternalNames(pkg) {
  const fromDefences = pkg.defences?.internalPackageNames ?? []
  const fromHusky = pkg.huskyPreCommitHash ? [] : []
  void fromHusky
  return Array.isArray(fromDefences) ? fromDefences : []
}

module.exports = {
  calculateDistance,
  isSimilar,
  findConflicts,
  findTyposquattingConflicts,
  findDependencyConfusion,
  loadExistingNames,
  loadInternalNames,
  readDeclaredPackageNames,
  readInstalledPackageNames,
  setFsImpl,
  resetFsImpl,
}
