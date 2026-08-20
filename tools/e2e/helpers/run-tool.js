'use strict'

// Helper for invoking project tools from the E2E test suite.
// Uses spawnSync with an explicit timeout to prevent hanging tests when a
// script or network call misbehaves.

const { spawnSync } = require('node:child_process')
const path = require('node:path')

// Default timeout for spawned tools (30 seconds).
const DEFAULT_TIMEOUT_MS = 30000

const PROJECT_ROOT = path.resolve(__dirname, '../../..')

function runTool(scriptPath, args = [], options = {}) {
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS
  const cwd = options.cwd ?? PROJECT_ROOT
  const env = options.env ? { ...process.env, ...options.env } : process.env

  const fullPath = path.resolve(PROJECT_ROOT, scriptPath)
  const result = spawnSync('node', [fullPath, ...args], {
    cwd,
    env,
    encoding: 'utf8',
    timeout,
    killSignal: 'SIGTERM',
    shell: false,
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    timedOut: result.error?.code === 'ETIMEDOUT' || result.signal === 'SIGTERM',
  }
}

module.exports = { runTool, DEFAULT_TIMEOUT_MS, PROJECT_ROOT }
