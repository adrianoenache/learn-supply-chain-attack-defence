#!/usr/bin/env node
'use strict'

// Native Node.js process monitor for child_process invocations.
//
// Hooks spawn/spawnSync/exec/execSync in the current process and records every
// subprocess that is created while monitoring is active. This is intentionally
// lightweight and dependency-free: it does not use kernel-level tracing such as
// strace or dtruss, and it does not restrict execution. It only observes.
//
// Usage:
//   const { startMonitoring, stopMonitoring, getEvents, clearEvents } = require('./lib/process-monitor.js')
//   startMonitoring()
//   spawnSync('npm', ['install'])
//   const report = buildReport(getEvents())
//   stopMonitoring()

const { spawn, spawnSync, exec, execSync } = require('node:child_process')
const { performance } = require('node:perf_hooks')

// ---------------------------------------------------------------------------
// Dependency injection hooks — exposed for tests.
// ---------------------------------------------------------------------------

let childProcessImpl = { spawn, spawnSync, exec, execSync }
let processImpl = process
let performanceImpl = performance

function setImpls(impls) {
  if (impls.childProcess) childProcessImpl = impls.childProcess
  if (impls.process) processImpl = impls.process
  if (impls.performance) performanceImpl = impls.performance
}

function resetImpls() {
  childProcessImpl = { spawn, spawnSync, exec, execSync }
  processImpl = process
  performanceImpl = performance
}

// ---------------------------------------------------------------------------
// Internal state.
// ---------------------------------------------------------------------------

let isMonitoring = false
let events = []
let nextEventId = 1

// Keep references to the original methods so we can restore them.
let originalSpawn = null
let originalSpawnSync = null
let originalExec = null
let originalExecSync = null

const LIFECYCLE_EVENTS = new Set([
  'preinstall',
  'install',
  'postinstall',
  'prepare',
  'prepublish',
  'prepublishOnly',
  'publish',
  'postpublish',
  'prerestart',
  'restart',
  'postrestart',
  'prestart',
  'start',
  'poststart',
  'prestop',
  'stop',
  'poststop',
  'pretest',
  'test',
  'posttest',
  'preuninstall',
  'uninstall',
  'postuninstall',
  'preversion',
  'version',
  'postversion',
])

// Commands commonly used to run shell interpreters.
const SHELLS = new Set([
  'sh',
  'bash',
  'zsh',
  'dash',
  'ksh',
  'csh',
  'tcsh',
  'fish',
  'cmd',
  'cmd.exe',
  'powershell',
  'powershell.exe',
  'pwsh',
  'pwsh.exe',
])

// Commands that indicate outbound network activity.
const NETWORK_COMMANDS = new Set([
  'curl',
  'wget',
  'fetch',
  'node',
  'python',
  'python3',
  'ruby',
  'perl',
])

// Commands that change file permissions or ownership.
const PERMISSION_COMMANDS = new Set([
  'chmod',
  'chown',
  'chgrp',
  'setfacl',
  'sudo',
  'doas',
  'su',
])

// Commands that write to disk beyond ordinary build output.
const FS_WRITE_COMMANDS = new Set([
  'rm',
  'mv',
  'cp',
  'mkdir',
  'rmdir',
  'touch',
  'dd',
  'mkfs',
])

// Commands that compile native addons.
const NATIVE_BUILD_COMMANDS = new Set([
  'node-gyp',
  'make',
  'cmake',
  'gcc',
  'g++',
  'clang',
  'clang++',
  'python',
  'python3',
])

function basename(command) {
  if (typeof command !== 'string' || command.length === 0) return ''
  // Strip a trailing path and an extension for Windows-style commands.
  const withoutPath = command.replace(/\\/g, '/').split('/').pop() ?? ''
  return withoutPath.replace(/\.exe$/i, '').toLowerCase()
}

function getLifecycleEvent(env) {
  if (!env || typeof env !== 'object') return null
  const value = env.npm_lifecycle_event
  return typeof value === 'string' && value.length > 0 ? value : null
}

function getPackageName(env) {
  if (!env || typeof env !== 'object') return null
  const value = env.npm_package_name
  return typeof value === 'string' && value.length > 0 ? value : null
}

function classifyCommand(command, args, env) {
  const labels = new Set()
  const base = basename(command)

  const lifecycleEvent = getLifecycleEvent(env)
  if (lifecycleEvent && LIFECYCLE_EVENTS.has(lifecycleEvent)) {
    labels.add('lifecycle')
  }

  if (SHELLS.has(base)) {
    labels.add('shell')
  }

  if (NETWORK_COMMANDS.has(base)) {
    const script = args.join(' ').toLowerCase()
    if (
      script.includes('http') ||
      script.includes('https') ||
      script.includes('require(') ||
      script.includes('import(') ||
      script.includes('fetch(')
    ) {
      labels.add('network')
    }
  }

  if (PERMISSION_COMMANDS.has(base)) {
    labels.add('permission')
  }

  if (FS_WRITE_COMMANDS.has(base)) {
    labels.add('filesystem-write')
  }

  if (NATIVE_BUILD_COMMANDS.has(base)) {
    labels.add('native-build')
  }

  if (labels.size === 0) {
    labels.add('unknown')
  }

  return Array.from(labels)
}

function truncateArgs(args, maxLength) {
  const joined = Array.isArray(args) ? args.join(' ') : String(args)
  if (joined.length <= maxLength) return joined
  return `${joined.slice(0, maxLength)}...`
}

function createEventRecord(command, args, options) {
  const now = new Date()
  const env = options?.env ?? processImpl.env
  const cwd = options?.cwd ?? processImpl.cwd()
  const lifecycleEvent = getLifecycleEvent(env)
  const packageName = getPackageName(env)
  const labels = classifyCommand(command, args, env)

  return {
    id: nextEventId++,
    timestamp: now.toISOString(),
    command,
    args: Array.isArray(args) ? args : [args],
    argsSummary: truncateArgs(args, 200),
    cwd,
    pid: null,
    ppid: processImpl.pid,
    lifecycleEvent,
    packageName,
    labels,
    exitCode: null,
    signal: null,
    durationMs: null,
  }
}

function attachExitHandlers(child, event) {
  const startTime = performanceImpl.now()
  let finished = false

  child.on('spawn', () => {
    event.pid = child.pid ?? null
  })

  child.on('error', () => {
    if (finished) return
    finished = true
    event.durationMs = Number((performanceImpl.now() - startTime).toFixed(2))
  })

  child.on('exit', (code, signal) => {
    if (finished) return
    finished = true
    event.exitCode = code ?? null
    event.signal = signal ?? null
    event.durationMs = Number((performanceImpl.now() - startTime).toFixed(2))
  })
}

function wrapSpawn(original) {
  return function monitoredSpawn(command, args, options) {
    if (!isMonitoring) {
      return original.call(this, command, args, options)
    }

    const event = createEventRecord(command, args, options)
    events.push(event)
    const child = childProcessImpl.spawn.call(this, command, args, options)
    attachExitHandlers(child, event)
    return child
  }
}

function wrapSpawnSync(original) {
  return function monitoredSpawnSync(command, args, options) {
    if (!isMonitoring) {
      return original.call(this, command, args, options)
    }

    const event = createEventRecord(command, args, options)
    const startTime = performanceImpl.now()
    const result = childProcessImpl.spawnSync.call(this, command, args, options)
    event.pid = result?.pid ?? null
    event.exitCode = result?.status ?? null
    event.signal = result?.signal ?? null
    event.durationMs = Number((performanceImpl.now() - startTime).toFixed(2))
    events.push(event)
    return result
  }
}

function wrapExec(original) {
  return function monitoredExec(command, options, callback) {
    if (!isMonitoring) {
      return original.call(this, command, options, callback)
    }

    const event = createEventRecord(command, [], options)
    events.push(event)
    const startTime = performanceImpl.now()

    const wrappedCallback = (error, stdout, stderr) => {
      if (error) {
        event.exitCode = error.code ?? null
        event.signal = error.signal ?? null
      } else {
        event.exitCode = 0
      }
      event.durationMs = Number((performanceImpl.now() - startTime).toFixed(2))
      if (typeof callback === 'function') {
        callback(error, stdout, stderr)
      }
    }

    const child = original.call(this, command, options, wrappedCallback)
    attachExitHandlers(child, event)
    return child
  }
}

function wrapExecSync(original) {
  return function monitoredExecSync(command, options) {
    if (!isMonitoring) {
      return original.call(this, command, options)
    }

    const event = createEventRecord(command, [], options)
    const startTime = performanceImpl.now()
    let result
    try {
      result = original.call(this, command, options)
      event.exitCode = 0
    } catch (err) {
      event.exitCode = err.status ?? err.code ?? null
      event.signal = err.signal ?? null
      throw err
    } finally {
      event.durationMs = Number((performanceImpl.now() - startTime).toFixed(2))
      events.push(event)
    }
    return result
  }
}

function startMonitoring() {
  if (isMonitoring) return
  isMonitoring = true

  const cp = require('node:child_process')
  originalSpawn = cp.spawn
  originalSpawnSync = cp.spawnSync
  originalExec = cp.exec
  originalExecSync = cp.execSync

  cp.spawn = wrapSpawn(originalSpawn)
  cp.spawnSync = wrapSpawnSync(originalSpawnSync)
  cp.exec = wrapExec(originalExec)
  cp.execSync = wrapExecSync(originalExecSync)
}

function stopMonitoring() {
  if (!isMonitoring) return
  isMonitoring = false

  const cp = require('node:child_process')
  if (originalSpawn) cp.spawn = originalSpawn
  if (originalSpawnSync) cp.spawnSync = originalSpawnSync
  if (originalExec) cp.exec = originalExec
  if (originalExecSync) cp.execSync = originalExecSync

  originalSpawn = null
  originalSpawnSync = null
  originalExec = null
  originalExecSync = null
}

function getEvents() {
  return events.slice()
}

function clearEvents() {
  events = []
  nextEventId = 1
}

function isMonitoringActive() {
  return isMonitoring
}

module.exports = {
  startMonitoring,
  stopMonitoring,
  getEvents,
  clearEvents,
  isMonitoringActive,
  setImpls,
  resetImpls,
  classifyCommand,
  truncateArgs,
  LIFECYCLE_EVENTS,
}
