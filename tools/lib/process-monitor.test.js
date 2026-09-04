#!/usr/bin/env node
'use strict'

const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

const processMonitor = require('./process-monitor.js')

function makeMockChildProcess() {
  const spawnHandlers = {}
  let nextPid = 1000

  function createMockChild() {
    const pid = nextPid++
    const handlers = {}
    const child = {
      pid,
      on(event, fn) {
        handlers[event] = fn
        return child
      },
      emit(event, ...args) {
        if (handlers[event]) handlers[event](...args)
        return child
      },
    }
    return child
  }

  return {
    spawnHandlers,
    createMockChild,
    spawn: (_command, _args, _options) => {
      const child = createMockChild()
      // Defer spawn/exit emission so callers can attach handlers.
      process.nextTick(() => {
        child.emit('spawn')
        child.emit('exit', 0, null)
      })
      return child
    },
    spawnSync: (_command, _args, _options) => ({
      pid: nextPid++,
      status: 0,
      signal: null,
    }),
    exec: (_command, _options, callback) => {
      const child = createMockChild()
      process.nextTick(() => {
        child.emit('spawn')
        if (typeof callback === 'function') {
          callback(null, '', '')
        }
        child.emit('exit', 0, null)
      })
      return child
    },
    execSync: (_command, _options) => '',
  }
}

function makeMockProcess() {
  return {
    env: { PATH: '/bin' },
    pid: 123,
    cwd: () => '/project',
  }
}

function makeMockPerformance() {
  let now = 1000
  return {
    now: () => {
      now += 10
      return now
    },
  }
}

describe('process-monitor', () => {
  beforeEach(() => {
    processMonitor.clearEvents()
    processMonitor.resetImpls()
  })

  afterEach(() => {
    processMonitor.stopMonitoring()
    processMonitor.resetImpls()
    processMonitor.clearEvents()
  })

  it('starts and stops monitoring', () => {
    assert.equal(processMonitor.isMonitoringActive(), false)
    processMonitor.startMonitoring()
    assert.equal(processMonitor.isMonitoringActive(), true)
    processMonitor.stopMonitoring()
    assert.equal(processMonitor.isMonitoringActive(), false)
  })

  it('records spawnSync events', () => {
    const mockCp = makeMockChildProcess()
    const mockProc = makeMockProcess()
    const mockPerf = makeMockPerformance()
    processMonitor.setImpls({
      childProcess: mockCp,
      process: mockProc,
      performance: mockPerf,
    })

    processMonitor.startMonitoring()
    const cp = require('node:child_process')
    cp.spawnSync('npm', ['install'], { cwd: '/project' })
    processMonitor.stopMonitoring()

    const events = processMonitor.getEvents()
    assert.equal(events.length, 1)
    assert.equal(events[0].command, 'npm')
    assert.deepEqual(events[0].args, ['install'])
    assert.equal(events[0].pid, 1000)
    assert.equal(events[0].exitCode, 0)
    assert.ok(events[0].durationMs !== null)
  })

  it('records async spawn events', async () => {
    const mockCp = makeMockChildProcess()
    const mockProc = makeMockProcess()
    const mockPerf = makeMockPerformance()
    processMonitor.setImpls({
      childProcess: mockCp,
      process: mockProc,
      performance: mockPerf,
    })

    processMonitor.startMonitoring()
    const cp = require('node:child_process')
    const _child = cp.spawn('npm', ['install'], { cwd: '/project' })

    // Wait for deferred mock events.
    await new Promise((resolve) => setTimeout(resolve, 10))

    processMonitor.stopMonitoring()

    const events = processMonitor.getEvents()
    assert.equal(events.length, 1)
    assert.equal(events[0].command, 'npm')
    assert.equal(events[0].pid, 1000)
    assert.equal(events[0].exitCode, 0)
  })

  it('does not record events when monitoring is stopped', () => {
    const mockCp = makeMockChildProcess()
    processMonitor.setImpls({ childProcess: mockCp })

    processMonitor.startMonitoring()
    processMonitor.stopMonitoring()

    const cp = require('node:child_process')
    cp.spawnSync('npm', ['install'])

    assert.equal(processMonitor.getEvents().length, 0)
  })

  it('classifies lifecycle scripts from env', () => {
    const labels = processMonitor.classifyCommand(
      'node',
      ['scripts/postinstall.js'],
      { npm_lifecycle_event: 'postinstall' },
    )
    assert.ok(labels.includes('lifecycle'))
  })

  it('classifies shell invocations', () => {
    const labels = processMonitor.classifyCommand(
      '/bin/bash',
      ['-c', 'echo hi'],
      {},
    )
    assert.ok(labels.includes('shell'))
  })

  it('classifies network activity in node scripts', () => {
    const labels = processMonitor.classifyCommand(
      'node',
      ['-e', 'fetch("https://x")'],
      {},
    )
    assert.ok(labels.includes('network'))
  })

  it('classifies permission changes', () => {
    const labels = processMonitor.classifyCommand('chmod', ['755', 'x'], {})
    assert.ok(labels.includes('permission'))
  })

  it('classifies native builds', () => {
    const labels = processMonitor.classifyCommand('node-gyp', ['rebuild'], {})
    assert.ok(labels.includes('native-build'))
  })

  it('restores original child_process methods after stopMonitoring', () => {
    const cp = require('node:child_process')
    const original = cp.spawnSync
    processMonitor.startMonitoring()
    assert.notEqual(cp.spawnSync, original)
    processMonitor.stopMonitoring()
    assert.equal(cp.spawnSync, original)
  })
})
