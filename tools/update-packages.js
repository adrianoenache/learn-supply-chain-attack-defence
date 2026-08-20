#!/usr/bin/env node
'use strict'

// Controlled update script for existing dependencies.
// Runs `npm update` inside the security constraints defined in .npmrc
// (save-exact, ignore-scripts, min-release-age) and then re-runs every
// verification layer so updated packages are still vetted.
//
// Usage:
//   npm run defence:update
//   npm run defence:update -- --dry-run
//   npm run defence:update -- --interactive
//   npm run defence:update -- --interactive --dry-run
//
// Flow executed (non-interactive):
//   1. npm update
//   2. npm run defence:pkg-age-check -- --transitive
//   3. npm audit signatures
//   4. npm audit --audit-level=high
//
// Interactive flow:
//   1. Load eligible updates from .defence-update-check.json.
//   2. Ask y/n/q for each eligible package.
//   3. Save decisions to .defence-update-decisions.json.
//   4. Run npm update <approved> (or nothing if all rejected).
//   5. Re-run the same verification layers.

const fs = require('node:fs')
const path = require('node:path')
const readline = require('node:readline')
const { spawnSync } = require('node:child_process')

const STATE_FILE = path.resolve(__dirname, '../.defence-update-check.json')
const DECISIONS_FILE = path.resolve(
  __dirname,
  '../.defence-update-decisions.json',
)
const PROMPT_TIMEOUT_MS = 30000

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

function runUpdatePackages(packages) {
  if (packages.length === 0) return
  runCmd('Update dependencies', 'npm', ['update', ...packages])
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
    const question = `Update ${item.name} ${item.current} → ${item.latest}? (y/n/q)${label} `
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
  const decisions = {
    updatedAt: new Date().toISOString(),
    approved: approved.map((item) => ({
      name: item.name,
      current: item.current,
      latest: item.latest,
      severity: item.severity,
    })),
    rejected: rejected.map((item) => ({
      name: item.name,
      current: item.current,
      latest: item.latest,
      severity: item.severity,
    })),
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
        console.log(`  - ${item.name} ${item.current} → ${item.latest}${label}`)
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
    runUpdatePackages(approved.map((item) => item.name))
    runVerificationLayers()

    console.log('\nUpdate complete.')
    console.log(
      'Review package.json and package-lock.json, then commit both files.',
    )
    return 0
  }

  if (isDryRun) {
    console.log(
      '[dry-run] Would update dependencies with controlled npm update:',
    )
    console.log('  - npm update')
    console.log('  - npm run defence:pkg-age-check -- --transitive')
    console.log('  - npm audit signatures')
    console.log('  - npm audit --audit-level=high')
    return 0
  }

  console.log('Updating dependencies with controlled npm update...')

  runCmd('Update dependencies', 'npm', ['update'])
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
  promptForSelections,
  saveDecisions,
  setSpawnSyncImpl,
  resetSpawnSyncImpl,
  setReadlineImpl,
  resetReadlineImpl,
  setFsImpl,
  resetFsImpl,
}
