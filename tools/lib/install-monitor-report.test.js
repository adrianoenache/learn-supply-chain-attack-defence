#!/usr/bin/env node
'use strict'

const { describe, it } = require('node:test')
const assert = require('node:assert/strict')

const report = require('./install-monitor-report.js')

describe('install-monitor-report', () => {
  it('builds a markdown report with summary and events', () => {
    const events = [
      {
        id: 1,
        timestamp: '2026-09-04T12:00:00.000Z',
        command: 'node',
        args: ['scripts/postinstall.js'],
        argsSummary: 'scripts/postinstall.js',
        cwd: '/project',
        pid: 100,
        ppid: 1,
        lifecycleEvent: 'postinstall',
        packageName: 'pkg',
        labels: ['lifecycle', 'network'],
        exitCode: 0,
        signal: null,
        durationMs: 150,
      },
    ]

    const md = report.buildMarkdownReport('npm install', events, 0, 1200)
    assert.ok(md.includes('# Lifecycle Process Monitor Report'))
    assert.ok(md.includes('npm install'))
    assert.ok(md.includes('postinstall'))
    assert.ok(md.includes('lifecycle'))
    assert.ok(md.includes('network'))
    assert.ok(md.includes('Lifecycle scripts were spawned'))
  })

  it('builds a markdown report with no events', () => {
    const md = report.buildMarkdownReport('npm install', [], 0, 100)
    assert.ok(md.includes('No child processes were recorded'))
    assert.ok(md.includes('No high-risk patterns detected'))
  })

  it('builds a json report', () => {
    const events = [
      {
        id: 1,
        timestamp: '2026-09-04T12:00:00.000Z',
        command: 'node',
        args: ['scripts/postinstall.js'],
        argsSummary: 'scripts/postinstall.js',
        cwd: '/project',
        pid: 100,
        ppid: 1,
        lifecycleEvent: 'postinstall',
        packageName: 'pkg',
        labels: ['lifecycle'],
        exitCode: 0,
        signal: null,
        durationMs: 150,
      },
    ]

    const json = report.buildJsonReport('npm install', events, 0, 1200)
    const parsed = JSON.parse(json)
    assert.equal(parsed.summary.totalEvents, 1)
    assert.equal(parsed.summary.lifecycleEvents, 1)
    assert.equal(parsed.events.length, 1)
  })

  it('formats durations', () => {
    assert.equal(report.formatDuration(150), '150ms')
    assert.equal(report.formatDuration(1500), '1.50s')
    assert.equal(report.formatDuration(null), '—')
  })
})
