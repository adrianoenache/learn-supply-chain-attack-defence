#!/usr/bin/env node
'use strict'

// Controlled update script for existing dependencies.
// Prefers pinned installs of the highest age-gated version discovered by
// `defence:update-check` (`intermediateEligible`) over blindly jumping to
// `latest`, and then re-runs every verification layer so updated packages
// are still vetted. All installs run with --save-exact and --ignore-scripts,
// mirroring the .npmrc hardening.
//
// Usage:
//   npm run defence:update
//   npm run defence:update -- --dry-run
//   npm run defence:update -- --interactive
//   npm run defence:update -- --interactive --dry-run
//
// Flow executed (non-interactive):
//   1. Load eligible updates from .defence-update-check.json.
//   2. npm install --save-exact --ignore-scripts <pkg>@<target> for each
//      eligible package (target = highest intermediateEligible, falling back
//      to latest); when no scan state exists, fall back to generic npm update.
//   3. npm run defence:pkg-age-check -- --transitive
//   4. npm audit signatures
//   5. npm audit --audit-level=high
//   6. npm run defence:license-check:fail
//
// Interactive flow:
//   1. Load eligible updates from .defence-update-check.json.
//   2. Ask y/n/q for each eligible package (showing the resolved target).
//   3. Save decisions to .defence-update-decisions.json.
//   4. Run the pinned install for approved packages (or nothing if all rejected).
//   5. Re-run the same verification layers.

const fs = require('node:fs')
const path = require('node:path')
const readline = require('node:readline')
const { spawnSync } = require('node:child_process')

const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))

const config = loadConfig()

const STATE_FILE = config.paths.updateCheckState
const DECISIONS_FILE = config.paths.updateDecisions
const PROMPT_TIMEOUT_MS = config.updatePackages.promptTimeoutMs

// Exposed for tests so spawnSync calls can be mocked without patching the global child_process module.
let spawnSyncImpl = spawnSync
function setSpawnSyncImpl(fn) {
  spawnSyncImpl = fn
}
function resetSpawnSyncImpl() {
  spawnSyncImpl = spawnSync
}

// Exposed for tests so readline can be mocked.
let readlineImpl = readline
function setReadlineImpl(impl) {
  readlineImpl = impl
}
function resetReadlineImpl() {
  readlineImpl = readline
}

// Exposed for tests so fs can be mocked.
let fsImpl = fs
function setFsImpl(impl) {
  fsImpl = impl
}
function resetFsImpl() {
  fsImpl = fs
}

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    isDryRun: argv.includes('--dry-run'),
    isInteractive: argv.includes('--interactive'),
  }
}

function runCmd(label, cmd, args, opts = {}) {
  console.log(`\n${label}: ${cmd} ${args.join(' ')}`)
  const result = spawnSyncImpl(cmd, args, {
    stdio: 'inherit',
    shell: false,
    ...opts,
  })
  if (result.status !== 0) {
    const reason =
      result.status === null
        ? `killed by signal ${result.signal}`
        : `exited with code ${result.status}`
    throw new Error(`${label} failed (${reason}).`)
  }
}

function runVerificationLayers() {
  runCmd('Transitive package age check', 'npm', [
    'run',
    'defence:pkg-age-check',
    '--',
    '--transitive',
  ])
  runCmd('Signature verification', 'npm', ['audit', 'signatures'])
  runCmd('Vulnerability audit', 'npm', ['audit', '--audit-level=high'])
  runCmd('License check', 'npm', ['run', 'defence:license-check:fail'])
}

// Resolves the version an eligible item should be updated to: the highest
// intermediate that already passed the age gate at scan time. check-updates
// includes `latest` in intermediateEligible when it passes the gate, so the
// fallback to `latest` only triggers for state files that predate the field.
function resolveTargetVersion(item) {
  const intermediates = Array.isArray(item.intermediateEligible)
    ? item.intermediateEligible
    : []
  return intermediates.length > 0
    ? intermediates[intermediates.length - 1]
    : item.latest
}

// Pinned install of the resolved targets. --save-exact and --ignore-scripts
// are passed explicitly (not just inherited from .npmrc) so the install keeps
// the project hardening even if a contributor's local config drifts.
function runPinnedInstalls(items) {
  const specs = items.map(
    (item) => `${item.name}@${resolveTargetVersion(item)}`,
  )
  runCmd('Install pinned updates', 'npm', [
    'install',
    '--save-exact',
    '--ignore-scripts',
    ...specs,
  ])
}

function readJsonSafe(filePath) {
  try {
    const content = fsImpl.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

function loadEligibleUpdates() {
  const state = readJsonSafe(STATE_FILE)
  if (!state || !Array.isArray(state.eligible)) {
    return []
  }
  return state.eligible
}

function promptQuestion(rl, questionText) {
  return new Promise((resolve) => {
    let answered = false

    const timeout = setTimeout(() => {
      if (!answered) {
        answered = true
        console.log('\nPrompt timed out; treating as no.')
        rl.close()
        resolve('n')
      }
    }, PROMPT_TIMEOUT_MS)

    rl.question(questionText, (answer) => {
      if (!answered) {
        answered = true
        clearTimeout(timeout)
        rl.close()
        resolve(answer.trim().toLowerCase())
      }
    })

    rl.on('close', () => {
      if (!answered) {
        answered = true
        clearTimeout(timeout)
        resolve('n')
      }
    })
  })
}

async function promptForSelections(eligible) {
  const approved = []
  const rejected = []

  for (const item of eligible) {
    const label = item.confidenceLabel ? ` [${item.confidenceLabel}]` : ''
    const target = resolveTargetVersion(item)
    // When the resolved target is not latest, latest was still inside the
    // age gate at scan time — say so explicitly to inform the decision.
    const note =
      target !== item.latest
        ? ` (intermediate target; latest ${item.latest} still in quarantine)`
        : ''
    const question = `Update ${item.name} ${item.current} → ${target}${note}? (y/n/q)${label} `
    const rl = readlineImpl.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    const answer = await promptQuestion(rl, question)

    if (answer === 'q') {
      return { approved, rejected, aborted: true }
    }
    if (answer === 'y') {
      approved.push(item)
    } else {
      rejected.push(item)
    }
  }

  return { approved, rejected, aborted: false }
}

function saveDecisions(approved, rejected) {
  const toEntry = (item) => ({
    name: item.name,
    current: item.current,
    latest: item.latest,
    target: resolveTargetVersion(item),
    severity: item.severity,
  })
  const decisions = {
    updatedAt: new Date().toISOString(),
    approved: approved.map(toEntry),
    rejected: rejected.map(toEntry),
  }
  fsImpl.writeFileSync(
    DECISIONS_FILE,
    `${JSON.stringify(decisions, null, 2)}\n`,
    'utf8',
  )
}

async function main(argv = process.argv.slice(2)) {
  const { isDryRun, isInteractive } = parseCliArgs(argv)

  if (isInteractive) {
    const eligible = loadEligibleUpdates()

    if (eligible.length === 0) {
      console.log(
        'No eligible updates found. Run npm run defence:update-check first.',
      )
      return 0
    }

    if (isDryRun) {
      console.log('[dry-run] Would prompt for the following eligible updates:')
      for (const item of eligible) {
        const label = item.confidenceLabel ? ` [${item.confidenceLabel}]` : ''
        const target = resolveTargetVersion(item)
        const note =
          target !== item.latest
            ? ` (intermediate target; latest ${item.latest} still in quarantine)`
            : ''
        console.log(
          `  - ${item.name} ${item.current} → ${target}${note}${label}`,
        )
      }
      return 0
    }

    console.log('Select which eligible updates to apply:\n')
    const { approved, rejected, aborted } = await promptForSelections(eligible)

    if (aborted) {
      console.log('\nUpdate aborted. No changes were made.')
      return 0
    }

    saveDecisions(approved, rejected)

    if (approved.length === 0) {
      console.log('\nNo packages selected. No changes were made.')
      return 0
    }

    console.log(`\nApplying ${approved.length} approved update(s)...`)
    runPinnedInstalls(approved)
    runVerificationLayers()

    console.log('\nUpdate complete.')
    console.log(
      'Review package.json and package-lock.json, then commit both files.',
    )
    return 0
  }

  if (isDryRun) {
    const eligible = loadEligibleUpdates()
    console.log('[dry-run] Would update dependencies with:')
    if (eligible.length > 0) {
      const specs = eligible.map(
        (item) => `${item.name}@${resolveTargetVersion(item)}`,
      )
      console.log(
        `  - npm install --save-exact --ignore-scripts ${specs.join(' ')}`,
      )
    } else {
      console.log('  - npm update (no scan state found; in-range updates only)')
    }
    console.log('  - npm run defence:pkg-age-check -- --transitive')
    console.log('  - npm audit signatures')
    console.log('  - npm audit --audit-level=high')
    console.log('  - npm run defence:license-check:fail')
    return 0
  }

  const eligible = loadEligibleUpdates()
  if (eligible.length > 0) {
    console.log(
      `Applying ${eligible.length} eligible update(s) from the last defence:update-check scan...`,
    )
    runPinnedInstalls(eligible)
  } else {
    console.log(
      'No scanned eligible updates found; falling back to in-range npm update...',
    )
    console.log('(Run npm run defence:update-check first for pinned updates.)')
    runCmd('Update dependencies', 'npm', ['update'])
  }
  runVerificationLayers()

  console.log('\nUpdate complete.')
  console.log(
    'Review package.json and package-lock.json, then commit both files.',
  )
  return 0
}

if (require.main === module) {
  main()
    .then((code) => {
      process.exit(code)
    })
    .catch((err) => {
      console.error(`\nUpdate failed: ${err.message}`)
      process.exit(1)
    })
}

module.exports = {
  main,
  parseCliArgs,
  loadEligibleUpdates,
  resolveTargetVersion,
  promptForSelections,
  saveDecisions,
  setSpawnSyncImpl,
  resetSpawnSyncImpl,
  setReadlineImpl,
  resetReadlineImpl,
  setFsImpl,
  resetFsImpl,
}
