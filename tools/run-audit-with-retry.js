#!/usr/bin/env node
'use strict'

// Wrapper around `npm audit --audit-level=high` with bounded retry on
// transient network errors. Vulnerability findings themselves are NOT retried:
// if npm audit reports a real CVE, the wrapper fails immediately.
//
// Usage:
//   node ./tools/run-audit-with-retry.js
//   npm run defence:audit

const { spawnSync } = require('node:child_process')

// Maximum number of attempts when the audit fails for network/timeout reasons.
// Hardcoded because it defines the project's resilience policy, not a tunable.
const MAX_ATTEMPTS = 3

// Fixed delay between retries in milliseconds. Kept constant (not exponential)
// because registry advisories endpoint failures are usually short-lived bursts.
const RETRY_DELAY_MS = 5000

// Default npm audit arguments. We cap each attempt at 60 seconds and disable
// npm's internal fetch retries so the wrapper owns the retry policy. The
// 60-second value is hardcoded because it is long enough for a slow registry
// response but short enough to avoid blocking a commit for minutes.
const AUDIT_ARGS = [
  '--audit-level=high',
  '--fetch-timeout=60000',
  '--fetch-retries=0',
]

// Regex patterns that identify transient network errors in npm stderr/stdout.
const TRANSIENT_ERROR_PATTERNS = [
  /network timeout/i,
  /audit endpoint returned an error/i,
  /ENETUNREACH/i,
  /ECONNREFUSED/i,
  /ECONNRESET/i,
  /ETIMEDOUT/i,
  /socket hang up/i,
  /fetch failed/i,
  /timeout/i,
]

function isTransientError(output, exitCode) {
  // npm exits 1 for both vulnerabilities and some network errors, so we
  // inspect the actual output to distinguish transient failures.
  if (exitCode === 0) return false
  const text = `${output.stdout ?? ''}\n${output.stderr ?? ''}`
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => pattern.test(text))
}

function defaultSleepSync(ms) {
  // Intentionally synchronous to keep the wrapper simple and predictable.
  // Audit is already a blocking pre-commit gate.
  // Uses Atomics.wait for a deterministic, zero-busy-wait sleep in Node.js.
  const buffer = new SharedArrayBuffer(4)
  const view = new Int32Array(buffer)
  Atomics.wait(view, 0, 0, ms)
}

function spawnAudit(args = AUDIT_ARGS) {
  return spawnSync('npm', ['audit', ...args], {
    stdio: 'pipe',
    shell: false,
    encoding: 'utf8',
  })
}

// Mutable implementation container so tests can inject mocks without
// touching private variables. main() always reads from this object.
const impl = {
  runAudit: spawnAudit,
  sleepSync: defaultSleepSync,
}

function main(argv = process.argv.slice(2)) {
  const args = argv.length > 0 ? argv : AUDIT_ARGS

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const result = impl.runAudit(args)

    // Forward npm output so the user always sees the audit result.
    if (result.stdout) process.stdout.write(result.stdout)
    if (result.stderr) process.stderr.write(result.stderr)

    if (result.status === 0) {
      return 0
    }

    if (!isTransientError(result, result.status)) {
      // Real vulnerability or unknown non-network failure — fail fast.
      return result.status ?? 1
    }

    if (attempt < MAX_ATTEMPTS) {
      console.error(
        `\nAudit attempt ${attempt}/${MAX_ATTEMPTS} failed due to network/transient error. Retrying in ${RETRY_DELAY_MS}ms...`,
      )
      impl.sleepSync(RETRY_DELAY_MS)
    } else {
      console.error(
        `\nAudit failed after ${MAX_ATTEMPTS} attempts due to persistent network/transient errors.`,
      )
    }
  }

  return 1
}

if (require.main === module) {
  process.exit(main())
}

module.exports = {
  main,
  isTransientError,
  get runAudit() {
    return impl.runAudit
  },
  set runAudit(fn) {
    impl.runAudit = fn
  },
  get sleepSync() {
    return impl.sleepSync
  },
  set sleepSync(fn) {
    impl.sleepSync = fn
  },
  resetImpl() {
    impl.runAudit = spawnAudit
    impl.sleepSync = defaultSleepSync
  },
  MAX_ATTEMPTS,
  RETRY_DELAY_MS,
}
