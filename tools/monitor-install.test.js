#!/usr/bin/env node
'use strict'

const { describe, it, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

const monitorInstall = require('./monitor-install.js')
const processMonitor = require('./lib/process-monitor.js')

function makeMockFs() {
  return {
    existsSync: () => false,
    mkdirSync: () => {},
    writeFileSync: () => {},
  }
}

function makeMockConsole() {
  return {
    logs: [],
    errors: [],
    log(...args) {
      this.logs.push(args.join(' '))
    },
    error(...args) {
      this.errors.push(args.join(' '))
    },
  }
}

function makeMockProcess(exitFn) {
  return {
    argv: ['node', 'monitor-install.js'],
    env: {},
    cwd: () => '/project',
    pid: 123,
    exit: exitFn,
  }
}

function makeMockPerformance() {
  let now = 1000
  return {
    now: () => {
      now += 50
      return now
    },
  }
}

function makeMockSpawnSync(events = []) {
  return (_bin, _args, _options) => {
    for (const event of events) {
      processMonitor.getEvents().push(event)
    }
    return { status: 0, signal: null }
  }
}

describe('monitor-install', () => {
  beforeEach(() => {
    monitorInstall.resetImpls()
    processMonitor.resetImpls()
    processMonitor.clearEvents()
  })

  afterEach(() => {
    processMonitor.stopMonitoring()
    monitorInstall.resetImpls()
    processMonitor.resetImpls()
    processMonitor.clearEvents()
  })

  it('exits 1 when command is missing', () => {
    let exitCode = null
    const proc = makeMockProcess((code) => {
      exitCode = code
    })
    const consoleImpl = makeMockConsole()
    monitorInstall.setImpls({ process: proc, console: consoleImpl })
    monitorInstall.main([])
    assert.equal(exitCode, 1)
    assert.ok(consoleImpl.errors.some((e) => e.includes('missing command')))
  })

  it('exits 1 when command is not npm', () => {
    let exitCode = null
    const proc = makeMockProcess((code) => {
      exitCode = code
    })
    const consoleImpl = makeMockConsole()
    monitorInstall.setImpls({ process: proc, console: consoleImpl })
    monitorInstall.main(['yarn', 'install'])
    assert.equal(exitCode, 1)
    assert.ok(consoleImpl.errors.some((e) => e.includes('Only npm')))
  })

  it('exits 1 when npm subcommand is not allowed', () => {
    let exitCode = null
    const proc = makeMockProcess((code) => {
      exitCode = code
    })
    const consoleImpl = makeMockConsole()
    monitorInstall.setImpls({ process: proc, console: consoleImpl })
    monitorInstall.main(['npm', 'publish'])
    assert.equal(exitCode, 1)
    assert.ok(
      consoleImpl.errors.some((e) => e.includes('install/ci/add/rebuild')),
    )
  })

  it('runs npm install and writes a markdown report', () => {
    let exitCode = null
    const proc = makeMockProcess((code) => {
      exitCode = code
    })
    const consoleImpl = makeMockConsole()
    const fsImpl = makeMockFs()
    const spawnSyncImpl = makeMockSpawnSync()
    monitorInstall.setImpls({
      process: proc,
      console: consoleImpl,
      fs: fsImpl,
      spawnSync: spawnSyncImpl,
      performance: makeMockPerformance(),
    })

    monitorInstall.main(['npm', 'install', '--save-exact', 'lodash@4.17.21'])
    assert.equal(exitCode, 0)
    // Phase N: the confirmation line is now a standardized pass item.
    assert.ok(consoleImpl.logs.some((l) => l.includes('report written to')))
    assert.ok(consoleImpl.logs.some((l) => l.includes('── Summary')))
  })

  it('--quiet is accepted as an alias of --silent (Phase N)', () => {
    let exitCode = null
    const proc = makeMockProcess((code) => {
      exitCode = code
    })
    const consoleImpl = makeMockConsole()
    monitorInstall.setImpls({
      process: proc,
      console: consoleImpl,
      fs: makeMockFs(),
      spawnSync: makeMockSpawnSync(),
      performance: makeMockPerformance(),
    })

    monitorInstall.main(['npm', 'install', '--quiet'])
    assert.equal(exitCode, 0)
    // The 'Monitoring:' start marker prints even in quiet mode (documented
    // --silent behavior predates Phase N); the report confirmation and the
    // summary are suppressed.
    assert.ok(!consoleImpl.logs.some((l) => l.includes('report written to')))
    assert.ok(!consoleImpl.logs.some((l) => l.includes('── Summary')))
  })

  it('runs npm install and writes a json report', () => {
    let exitCode = null
    const proc = makeMockProcess((code) => {
      exitCode = code
    })
    const consoleImpl = makeMockConsole()
    const fsImpl = makeMockFs()
    const spawnSyncImpl = makeMockSpawnSync()
    monitorInstall.setImpls({
      process: proc,
      console: consoleImpl,
      fs: fsImpl,
      spawnSync: spawnSyncImpl,
      performance: makeMockPerformance(),
    })

    monitorInstall.main([
      '--format=json',
      'npm',
      'install',
      '--save-exact',
      'lodash@4.17.21',
    ])
    assert.equal(exitCode, 0)
  })

  it('exits 1 with --fail-on-lifecycle when lifecycle events are present', () => {
    let exitCode = null
    const proc = makeMockProcess((code) => {
      exitCode = code
    })
    const consoleImpl = makeMockConsole()
    const fsImpl = makeMockFs()
    const mockProcessMonitor = {
      events: [],
      started: false,
      startMonitoring() {
        this.started = true
      },
      stopMonitoring() {
        this.started = false
      },
      getEvents() {
        return this.events
      },
      clearEvents() {
        this.events = []
      },
    }
    const spawnSyncImpl = (_bin, _args, _options) => {
      mockProcessMonitor.events.push({
        id: 1,
        command: 'node',
        args: ['postinstall.js'],
        labels: ['lifecycle'],
        exitCode: 0,
        durationMs: 10,
      })
      return { status: 0, signal: null }
    }
    monitorInstall.setImpls({
      process: proc,
      console: consoleImpl,
      fs: fsImpl,
      spawnSync: spawnSyncImpl,
      performance: makeMockPerformance(),
      processMonitor: mockProcessMonitor,
    })

    monitorInstall.main(['--fail-on-lifecycle', 'npm', 'install'])
    assert.equal(exitCode, 1)
  })

  it('parseCliArgs extracts options and command args', () => {
    const options = monitorInstall.parseCliArgs([
      '--output=report.md',
      '--format=json',
      '--silent',
      '--fail-on-lifecycle',
      'npm',
      'install',
      'lodash',
    ])
    assert.equal(options.output, 'report.md')
    assert.equal(options.format, 'json')
    assert.equal(options.silent, true)
    assert.equal(options.failOnLifecycle, true)
    assert.deepEqual(options.commandArgs, ['npm', 'install', 'lodash'])
  })

  it('validateCommand accepts npm install', () => {
    const result = monitorInstall.validateCommand(['npm', 'install'])
    assert.equal(result.valid, true)
  })

  it('validateCommand accepts npm ci', () => {
    const result = monitorInstall.validateCommand(['npm', 'ci'])
    assert.equal(result.valid, true)
  })

  it('validateCommand rejects non-npm command', () => {
    const result = monitorInstall.validateCommand(['yarn', 'install'])
    assert.equal(result.valid, false)
  })
})
