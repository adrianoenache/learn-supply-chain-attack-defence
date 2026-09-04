#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')

const path = require('node:path')

const SCRIPT_PATH = path.resolve(__dirname, './generate-trust-report.js')

function readScriptExports() {
  delete require.cache[require.resolve(SCRIPT_PATH)]
  return require(SCRIPT_PATH)
}

function makeMockFs(files) {
  const writes = []
  return {
    reads: files,
    writes,
    readFileSync: (filePath) => {
      const key = Object.keys(files).find((k) => filePath.endsWith(k))
      if (!key) throw new Error(`ENOENT: ${filePath}`)
      return files[key]
    },
    writeFileSync: (filePath, content) => {
      writes.push({ filePath, content })
    },
  }
}

describe('generate-trust-report', () => {
  let mod

  beforeEach(() => {
    mod = readScriptExports()
  })

  afterEach(() => {
    mod.resetImpls()
  })

  describe('parseCliArgs', () => {
    test('defaults to table format and transitive scope', () => {
      const args = mod.parseCliArgs([])
      assert.equal(args.format, 'table')
      assert.equal(args.isTransitive, false)
      assert.equal(args.isDirect, false)
      assert.equal(args.isFail, false)
      assert.equal(args.singlePackage, null)
    })

    test('parses all flags', () => {
      const args = mod.parseCliArgs([
        '--transitive',
        '--fail',
        '--silent',
        '--format=markdown',
        '--output=report.md',
        '--pkg=lodash@4.17.21',
      ])
      assert.equal(args.isTransitive, true)
      assert.equal(args.isFail, true)
      assert.equal(args.isSilent, true)
      assert.equal(args.format, 'markdown')
      assert.equal(args.outputPath, 'report.md')
      assert.equal(args.singlePackage, 'lodash@4.17.21')
    })

    test('rejects invalid format', () => {
      assert.throws(() => mod.parseCliArgs(['--format=xml']), /Invalid format/)
    })
  })

  describe('buildDeps', () => {
    test('returns single package for --pkg', () => {
      const fsMock = makeMockFs({})
      mod.setImpls({ fs: fsMock })
      const deps = mod.buildDeps({ singlePackage: 'lodash@4.17.21' })
      assert.deepEqual(deps, [['lodash', '4.17.21']])
    })

    test('exits when --pkg lacks version', () => {
      const fsMock = makeMockFs({})
      let exited = false
      mod.setImpls({
        fs: fsMock,
        exit: (code) => {
          exited = true
          assert.equal(code, 1)
        },
      })
      mod.buildDeps({ singlePackage: 'lodash' })
      assert.equal(exited, true)
    })

    test('reads direct dependencies and resolves versions from lockfile', () => {
      const fsMock = makeMockFs({
        'package.json': JSON.stringify({
          dependencies: { lodash: '^4.17.21' },
          devDependencies: { husky: '^9.0.0' },
        }),
        'package-lock.json': JSON.stringify({
          packages: {
            'node_modules/lodash': { version: '4.17.21' },
            'node_modules/husky': { version: '9.1.7' },
          },
        }),
      })
      mod.setImpls({ fs: fsMock })
      const deps = mod.buildDeps({ isDirect: true })
      assert.deepEqual(deps.sort(), [
        ['husky', '9.1.7'],
        ['lodash', '4.17.21'],
      ])
    })

    test('reads transitive dependencies from lockfile by default', () => {
      const fsMock = makeMockFs({
        'package.json': JSON.stringify({ dependencies: {} }),
        'package-lock.json': JSON.stringify({
          packages: {
            'node_modules/lodash': { version: '4.17.21' },
            'node_modules/@biomejs/biome': { version: '2.5.8' },
          },
        }),
      })
      mod.setImpls({ fs: fsMock })
      const deps = mod.buildDeps({})
      assert.deepEqual(deps.sort(), [
        ['@biomejs/biome', '2.5.8'],
        ['lodash', '4.17.21'],
      ])
    })
  })

  describe('buildExistingNames', () => {
    test('merges declared and installed names', () => {
      const fsMock = makeMockFs({
        'package.json': JSON.stringify({
          dependencies: { lodash: '^4.17.21' },
        }),
        'package-lock.json': JSON.stringify({
          packages: {
            'node_modules/lodash': { version: '4.17.21' },
            'node_modules/husky': { version: '9.1.7' },
          },
        }),
      })
      mod.setImpls({ fs: fsMock })
      const names = mod.buildExistingNames()
      assert.deepEqual(names.sort(), ['husky', 'lodash'])
    })
  })

  describe('main', () => {
    test('prints table report and exits 0', async () => {
      const fsMock = makeMockFs({
        'package.json': JSON.stringify({ dependencies: {} }),
        'package-lock.json': JSON.stringify({
          packages: { 'node_modules/lodash': { version: '4.17.21' } },
        }),
      })
      const logs = []
      let exitCode = null

      mod.setImpls({
        fs: fsMock,
        loadConfig: () => ({ trustReport: {} }),
        analyzePackages: async () => ({
          summary: {
            totalPackages: 1,
            averageScore: 80,
            lowestScore: 80,
            highestScore: 80,
            distribution: { trusted: 1, 'review required': 0, 'high risk': 0 },
          },
          packages: [
            {
              name: 'lodash',
              version: '4.17.21',
              score: 80,
              label: 'trusted',
              signals: {},
              metadata: {},
            },
          ],
        }),
        consoleLog: (msg) => logs.push(msg),
        exit: (code) => {
          exitCode = code
        },
      })

      await mod.main([])
      assert.equal(exitCode, 0)
      assert.ok(logs.some((log) => log.includes('lodash')))
    })

    test('writes markdown report to file', async () => {
      const fsMock = makeMockFs({
        'package.json': JSON.stringify({ dependencies: {} }),
        'package-lock.json': JSON.stringify({
          packages: { 'node_modules/lodash': { version: '4.17.21' } },
        }),
      })
      let exitCode = null

      mod.setImpls({
        fs: fsMock,
        loadConfig: () => ({ trustReport: {} }),
        analyzePackages: async () => ({
          summary: {
            totalPackages: 1,
            averageScore: 80,
            lowestScore: 80,
            highestScore: 80,
            distribution: { trusted: 1, 'review required': 0, 'high risk': 0 },
          },
          packages: [],
        }),
        consoleLog: () => {},
        exit: (code) => {
          exitCode = code
        },
      })

      await mod.main(['--format=markdown', '--output=report.md'])
      assert.equal(exitCode, 0)
      assert.equal(fsMock.writes.length, 1)
      assert.ok(fsMock.writes[0].filePath.endsWith('report.md'))
      assert.ok(fsMock.writes[0].content.includes('# Trust Score Report'))
    })

    test('exits 1 with --fail when lowest score is below minimum', async () => {
      const fsMock = makeMockFs({
        'package.json': JSON.stringify({ dependencies: {} }),
        'package-lock.json': JSON.stringify({
          packages: { 'node_modules/lodash': { version: '4.17.21' } },
        }),
      })
      let exitCode = null
      const errors = []

      mod.setImpls({
        fs: fsMock,
        loadConfig: () => ({ trustReport: { minScore: 60 } }),
        analyzePackages: async () => ({
          summary: {
            totalPackages: 1,
            averageScore: 40,
            lowestScore: 40,
            highestScore: 40,
            distribution: { trusted: 0, 'review required': 0, 'high risk': 1 },
          },
          packages: [],
        }),
        consoleLog: () => {},
        consoleError: (msg) => errors.push(msg),
        exit: (code) => {
          exitCode = code
        },
      })

      await mod.main(['--fail'])
      assert.equal(exitCode, 1)
      assert.ok(errors.some((msg) => msg.includes('below 60')))
    })

    test('silent mode suppresses stdout', async () => {
      const fsMock = makeMockFs({
        'package.json': JSON.stringify({ dependencies: {} }),
        'package-lock.json': JSON.stringify({
          packages: { 'node_modules/lodash': { version: '4.17.21' } },
        }),
      })
      const logs = []
      let exitCode = null

      mod.setImpls({
        fs: fsMock,
        loadConfig: () => ({ trustReport: {} }),
        analyzePackages: async () => ({
          summary: {
            totalPackages: 1,
            averageScore: 80,
            lowestScore: 80,
            highestScore: 80,
            distribution: { trusted: 1, 'review required': 0, 'high risk': 0 },
          },
          packages: [],
        }),
        consoleLog: (msg) => logs.push(msg),
        exit: (code) => {
          exitCode = code
        },
      })

      await mod.main(['--silent'])
      assert.equal(exitCode, 0)
      assert.equal(logs.length, 0)
    })
  })
})
