#!/usr/bin/env node
'use strict'

// Engine lifecycle management — reports and applies Node.js/npm engine
// updates (patch/minor within the current major) and upgrades (new LTS
// major), always pinning npm to the version bundled with the Node release
// (project policy, DECISIONS.md 2026-11-03).
//
// Why it exists: a Node.js security release must translate into an engine
// bump quickly and safely. The single source of truth is the official
// https://nodejs.org/dist/index.json — the same index actions/setup-node
// downloads from, so a version present there is by definition available in
// CI. The tool refuses targets absent from the index instead of letting CI
// fail later.
//
// Usage:
//   node ./tools/update-engines.js                — report available update/upgrade
//   node ./tools/update-engines.js --update       — apply latest in-major update
//   node ./tools/update-engines.js --upgrade      — apply latest LTS major upgrade
//   node ./tools/update-engines.js --to 26.13.0   — apply an explicit target
//   Flags: --dry-run, --silent, --format json
//
// Files edited surgically (formatting preserved — npm rewrites JSON
// formatting on install, so this tool never round-trips JSON):
//   package.json#engines, package-lock.json root engines, .nvmrc
//
// After applying, the developer still must switch runtimes and re-validate:
//   nvm install <version> && nvm use && npm test
//
// Exit codes:
//   0 — report printed / target applied / already up to date.
//   1 — network failure, target missing from the dist index, downgrade
//       attempt, or a file that could not be edited safely.

const fs = require('node:fs')
const path = require('node:path')

const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))
const { fetchJson } = require(path.resolve(__dirname, './lib/retry-fetch.js'))
const { compareVersions } = require(path.resolve(__dirname, './lib/semver.js'))

const REPO_ROOT = path.resolve(__dirname, '..')
const PACKAGE_JSON = path.join(REPO_ROOT, 'package.json')
const PACKAGE_LOCK = path.join(REPO_ROOT, 'package-lock.json')
const NVMRC = path.join(REPO_ROOT, '.nvmrc')

let fetchJsonImpl = fetchJson
let readFileImpl = (p) => fs.readFileSync(p, 'utf8')
let writeFileImpl = (p, c) => fs.writeFileSync(p, c)
let exitImpl = process.exit
let logImpl = console.log
let errorImpl = console.error

function setImpls(impls) {
  if (impls.fetchJson) fetchJsonImpl = impls.fetchJson
  if (impls.readFile) readFileImpl = impls.readFile
  if (impls.writeFile) writeFileImpl = impls.writeFile
  if (impls.exit) exitImpl = impls.exit
  if (impls.log) logImpl = impls.log
  if (impls.error) errorImpl = impls.error
}

function resetImpls() {
  fetchJsonImpl = fetchJson
  readFileImpl = (p) => fs.readFileSync(p, 'utf8')
  writeFileImpl = (p, c) => fs.writeFileSync(p, c)
  exitImpl = process.exit
  logImpl = console.log
  errorImpl = console.error
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const toIndex = argv.indexOf('--to')
  const modes = ['--update', '--upgrade'].filter((f) => argv.includes(f))
  if (modes.length > 1 || (modes.length === 1 && toIndex !== -1)) {
    throw new Error(
      'Choose only one mode: --update, --upgrade, or --to <version>.',
    )
  }
  const to = toIndex !== -1 ? argv[toIndex + 1] : null
  if (toIndex !== -1 && (!to || to.startsWith('--'))) {
    throw new Error('--to requires a version, e.g. --to 26.13.0')
  }
  return {
    mode: to ? 'to' : modes.length === 1 ? modes[0].slice(2) : 'report',
    to: to ? to.replace(/^v/, '') : null,
    isDryRun: argv.includes('--dry-run'),
    isSilent: argv.includes('--silent'),
    format: argv.includes('--format')
      ? argv[argv.indexOf('--format') + 1]
      : 'text',
  }
}

function parseEngineFloor(range) {
  const match = /(\d+\.\d+\.\d+)/.exec(String(range))
  if (!match) {
    throw new Error(`Cannot parse engines floor from "${range}".`)
  }
  return match[1]
}

function normalizeEntry(entry) {
  return {
    version: entry.version.replace(/^v/, ''),
    lts: entry.lts || null,
    npm: entry.npm || null,
  }
}

// Distills the raw dist index into the two candidate targets. The index is
// sorted newest-first, but we compare explicitly so the logic does not
// depend on upstream ordering.
function computeTargets(distIndex, currentFloor) {
  const entries = distIndex.map(normalizeEntry)
  const currentMajor = Number(versionMajor(currentFloor))
  let latestInMajor = null
  let latestLts = null
  for (const entry of entries) {
    if (Number(versionMajor(entry.version)) === currentMajor) {
      if (
        !latestInMajor ||
        compareVersions(entry.version, latestInMajor.version) > 0
      ) {
        latestInMajor = entry
      }
    }
    if (entry.lts) {
      if (!latestLts || compareVersions(entry.version, latestLts.version) > 0) {
        latestLts = entry
      }
    }
  }
  return { latestInMajor, latestLts }
}

function versionMajor(version) {
  return version.split('.')[0]
}

function findExactVersion(distIndex, version) {
  const entry = distIndex.map(normalizeEntry).find((e) => e.version === version)
  return entry || null
}

// --- Surgical file edits ----------------------------------------------------

// Replaces the engines floors in package.json content. The patterns key on
// the exact `"node": ">=X"` / `"npm": ">=Y"` shape, which only the engines
// block uses, so the rest of the file (including compact arrays npm would
// otherwise reformat) is left byte-identical.
function editPackageJson(content, nextNode, nextNpm) {
  let updated = content
  const nodePattern = /("node":\s*">=)[0-9.]+(")/
  const npmPattern = /("npm":\s*">=)[0-9.]+(")/
  if (!nodePattern.test(updated) || !npmPattern.test(updated)) {
    throw new Error(
      'Could not locate the engines block in package.json — edit it manually.',
    )
  }
  updated = updated.replace(nodePattern, `$1${nextNode}$2`)
  updated = updated.replace(npmPattern, `$1${nextNpm}$2`)
  return updated
}

// Replaces the engines floors of the ROOT package entry in the lockfile.
// Dependency entries may carry their own engines fields, so the replacement
// is anchored to the `"packages": { "": {` window and bounded to it.
function editLockfile(content, nextNode, nextNpm) {
  const anchor = content.indexOf('"packages":')
  const rootStart = anchor === -1 ? -1 : content.indexOf('"":', anchor)
  if (rootStart === -1) {
    throw new Error(
      'Could not locate the root package entry in package-lock.json — edit it manually.',
    )
  }
  // The root entry header (name, version, dependencies, engines) fits well
  // inside this window; bounding the replacement protects dependency entries
  // that might coincidentally declare the same floor strings.
  const windowEnd = content.indexOf('"node_modules/', rootStart)
  const window = content.slice(
    rootStart,
    windowEnd === -1 ? undefined : windowEnd,
  )
  const nodePattern = /"node":\s*">=[0-9.]+"/
  const npmPattern = /"npm":\s*">=[0-9.]+"/
  if (!nodePattern.test(window) || !npmPattern.test(window)) {
    throw new Error(
      'Lockfile root engines differ from the expected shape — run `npm ci` to resync, then retry.',
    )
  }
  const editedWindow = window
    .replace(nodePattern, `"node": ">=${nextNode}"`)
    .replace(npmPattern, `"npm": ">=${nextNpm}"`)
  return (
    content.slice(0, rootStart) +
    editedWindow +
    (windowEnd === -1 ? '' : content.slice(windowEnd))
  )
}

async function main(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv)
  const config = loadConfig()
  const engineConfig = config.updateEngines

  const pkgContent = readFileImpl(PACKAGE_JSON)
  const currentNode = parseEngineFloor(JSON.parse(pkgContent).engines.node)
  const currentNpm = parseEngineFloor(JSON.parse(pkgContent).engines.npm)

  let distIndex
  try {
    distIndex = await fetchJsonImpl(engineConfig.distIndexUrl, {
      timeoutMs: engineConfig.timeoutMs,
      maxResponseBytes: engineConfig.maxResponseMB * 1024 * 1024,
      retryMaxAttempts: engineConfig.retryMaxAttempts,
      retryInitialDelayMs: engineConfig.retryInitialDelayMs,
      retryBackoffMultiplier: engineConfig.retryBackoffMultiplier,
      retryMaxDelayMs: engineConfig.retryMaxDelayMs,
    })
  } catch (err) {
    errorImpl(
      `Could not fetch ${engineConfig.distIndexUrl}: ${err.message}\n` +
        'The official index is the availability gate for CI (actions/setup-node downloads from it). ' +
        'Check the network connection and retry.',
    )
    return exitImpl(1)
  }

  const { latestInMajor, latestLts } = computeTargets(distIndex, currentNode)

  const report = {
    current: { node: currentNode, npm: currentNpm },
    update: latestInMajor && {
      available: compareVersions(latestInMajor.version, currentNode) > 0,
      version: latestInMajor.version,
      npm: latestInMajor.npm,
      lts: latestInMajor.lts,
    },
    upgrade: latestLts && {
      available: compareVersions(latestLts.version, currentNode) > 0,
      version: latestLts.version,
      npm: latestLts.npm,
      lts: latestLts.lts,
    },
  }

  if (args.format === 'json' && args.mode === 'report') {
    logImpl(JSON.stringify(report, null, 2))
    return exitImpl(0)
  }

  if (!args.isSilent && args.mode === 'report') {
    logImpl('Node.js engine report')
    logImpl(`  current pin:           ${currentNode} (npm ${currentNpm})`)
    if (report.update) {
      const status = report.update.available ? 'AVAILABLE' : 'up to date'
      logImpl(
        `  update (v${versionMajor(currentNode)} line):      ${report.update.version} (npm ${report.update.npm}) — ${status}`,
      )
    }
    if (report.upgrade) {
      const status = report.upgrade.available ? 'AVAILABLE' : 'up to date'
      logImpl(
        `  upgrade (latest LTS):  ${report.upgrade.version} (npm ${report.upgrade.npm}, ${report.upgrade.lts}) — ${status}`,
      )
    }
    logImpl('')
    logImpl(
      'Apply with: --update (in-major), --upgrade (latest LTS), or --to <version>.',
    )
  }

  if (args.mode === 'report') return exitImpl(0)

  // Resolve the target for apply modes.
  let target
  if (args.mode === 'update') target = latestInMajor
  if (args.mode === 'upgrade') target = latestLts
  if (args.mode === 'to') {
    target = findExactVersion(distIndex, args.to)
    if (!target) {
      errorImpl(
        `Node.js ${args.to} was not found in ${engineConfig.distIndexUrl}.\n` +
          'A version absent from the official index is not installable by actions/setup-node, ' +
          'so CI would fail. Pick a published version from the report (no flags).',
      )
      return exitImpl(1)
    }
  }

  if (!target) {
    errorImpl('No target could be resolved from the dist index.')
    return exitImpl(1)
  }

  if (compareVersions(target.version, currentNode) < 0) {
    errorImpl(
      `Refusing downgrade: target ${target.version} is older than the current floor ${currentNode}. ` +
        'Engine floors only move forward; edit package.json manually if a downgrade is truly intended.',
    )
    return exitImpl(1)
  }

  if (compareVersions(target.version, currentNode) === 0) {
    logImpl(`Already at ${currentNode} — nothing to do.`)
    return exitImpl(0)
  }

  if (!target.npm) {
    errorImpl(
      `The dist entry for ${target.version} does not declare a bundled npm version. ` +
        'Resolve the npm floor manually to keep the npm-bundled policy intact.',
    )
    return exitImpl(1)
  }

  const nextNode = target.version
  const nextNpm = target.npm

  if (args.isDryRun) {
    logImpl(
      `[dry-run] Would set engines to node >=${nextNode}, npm >=${nextNpm} in package.json and package-lock.json, and .nvmrc to ${nextNode}.`,
    )
    return exitImpl(0)
  }

  const lockContent = readFileImpl(PACKAGE_LOCK)
  writeFileImpl(PACKAGE_JSON, editPackageJson(pkgContent, nextNode, nextNpm))
  writeFileImpl(PACKAGE_LOCK, editLockfile(lockContent, nextNode, nextNpm))
  writeFileImpl(NVMRC, `${nextNode}\n`)

  logImpl(`Engines updated: node >=${nextNode}, npm >=${nextNpm}`)
  logImpl(`  .nvmrc -> ${nextNode}`)
  logImpl('')
  logImpl('Next steps (the current process still runs the old runtime):')
  logImpl(`  1. nvm install ${nextNode} && nvm use`)
  logImpl('  2. npm test && npm run lint && npm run defence:check-md-links')
  logImpl('  3. Commit package.json, package-lock.json, and .nvmrc together.')
  return exitImpl(0)
}

if (require.main === module) {
  main().catch((err) => {
    errorImpl(`\nupdate-engines failed: ${err.message}`)
    process.exit(1)
  })
}

module.exports = {
  main,
  parseCliArgs,
  parseEngineFloor,
  computeTargets,
  editPackageJson,
  editLockfile,
  setImpls,
  resetImpls,
}
