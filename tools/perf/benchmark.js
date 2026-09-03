#!/usr/bin/env node
'use strict'

// Performance benchmark suite for defence tools.
//
// Measures execution time and network-call counts for tools that depend on the
// npm registry. Results can be compared against a saved baseline to detect
// regressions in CI.
//
// Usage:
//   node ./tools/perf/benchmark.js
//   node ./tools/perf/benchmark.js --tool=check-package-age
//   node ./tools/perf/benchmark.js --tool=check-updates
//   node ./tools/perf/benchmark.js --save-baseline

const fs = require('node:fs')
const path = require('node:path')

const registryCache = require(
  path.resolve(__dirname, '../lib/registry-cache.js'),
)

const BASELINE_FILE = path.resolve(__dirname, 'baselines.json')
// A regression is flagged when a metric is worse than the baseline by this
// ratio. The value is intentionally hardcoded because it defines the project's
// policy for acceptable performance drift, not a user-tunable threshold.
const REGRESSION_THRESHOLD = 0.2

// Dependency injection hooks — exposed for tests.
let fsImpl = fs
let performanceImpl = performance

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.performance) performanceImpl = impls.performance
}

function resetImpls() {
  fsImpl = fs
  performanceImpl = performance
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fsImpl.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function writeJson(filePath, data) {
  fsImpl.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function parseCliArgs(argv = process.argv.slice(2)) {
  const toolArg = argv.find((arg) => arg.startsWith('--tool='))
  const tool = toolArg?.slice('--tool='.length) ?? 'all'
  const validTools = ['all', 'check-package-age', 'check-updates']
  if (!validTools.includes(tool)) {
    throw new Error(
      `Invalid tool "${tool}". Use one of: ${validTools.join(', ')}.`,
    )
  }
  return {
    tool,
    saveBaseline: argv.includes('--save-baseline'),
  }
}

function createCountingFetch(responseFactory) {
  let callCount = 0
  async function countingFetch(url, options) {
    callCount++
    return responseFactory(url, options)
  }
  return {
    fetch: countingFetch,
    getCount: () => callCount,
    reset: () => {
      callCount = 0
    },
  }
}

function makePackageAgeResponse(url) {
  const published = new Date('2026-08-01T00:00:00.000Z').toISOString()
  const name = decodeURIComponent(url.split('/').pop())
  const version = name.startsWith('@') ? '2.5.8' : '9.1.7'
  return {
    time: { [version]: published },
    'dist-tags': { latest: version },
    versions: {
      [version]: { maintainers: [{ name: 'a' }] },
    },
  }
}

function makeUpdateCheckResponse() {
  return {
    time: { '2.6.0': '2026-08-01T00:00:00.000Z' },
    versions: {
      '2.6.0': { maintainers: [{ name: 'a' }, { name: 'b' }] },
    },
    repository: { url: 'git+https://github.com/example/pkg.git' },
  }
}

async function runCheckPackageAgeBenchmark() {
  const checkPackageAgePath = path.resolve(__dirname, '../check-package-age.js')
  // The tool reads package.json from its own directory; load it fresh so the
  // benchmark can run in isolation.
  delete require.cache[require.resolve(checkPackageAgePath)]
  const tool = require(checkPackageAgePath)

  const deps = {
    '@biomejs/biome': '2.5.8',
    husky: '9.1.7',
  }

  // Ensure the disk-backed registry cache does not hide network calls.
  registryCache.clearCache()

  const counting = createCountingFetch((url, options) =>
    makePackageAgeResponse(url, options),
  )
  registryCache.setImpls({ fetchJson: counting.fetch })
  tool.setNowImpl(() => new Date('2026-09-01T00:00:00.000Z').getTime())

  const start = performanceImpl.now()
  await tool.runForBenchmark(deps)
  const durationMs = performanceImpl.now() - start

  registryCache.resetImpls()
  tool.resetNowImpl()

  return { durationMs, networkCalls: counting.getCount() }
}

async function runCheckUpdatesBenchmark() {
  const checkUpdatesPath = path.resolve(__dirname, '../check-updates.js')
  delete require.cache[require.resolve(checkUpdatesPath)]
  const tool = require(checkUpdatesPath)

  const lockContent = JSON.stringify({
    name: 'learn-supply-chain-attack-defence',
    lockfileVersion: 3,
    packages: {},
  })
  const lockHash = require('node:crypto')
    .createHash('sha256')
    .update(lockContent)
    .digest('hex')

  const fsMock = {
    readFileSync: (filePath, _encoding) => {
      if (filePath.includes('.defence-update-check.json')) {
        const err = new Error('state not found')
        err.code = 'ENOENT'
        throw err
      }
      if (
        filePath.includes('package-lock.json') &&
        !filePath.includes('node_modules')
      ) {
        return lockContent
      }
      if (filePath.includes('node_modules/.package-lock.json')) {
        return JSON.stringify({ packageLockHash: lockHash })
      }
      throw new Error(`unexpected read: ${filePath}`)
    },
    writeFileSync: () => {},
    existsSync: () => true,
  }

  const spawnSyncMock = (_cmd, args, _opts) => {
    const key = `${_cmd} ${args.join(' ')}`
    if (key === 'npm ls --json --depth=0') {
      return { status: 0, stdout: '{}', stderr: '' }
    }
    if (key === 'npm outdated --json --min-release-age=0') {
      return {
        status: 0,
        stdout: JSON.stringify({
          pkg1: { current: '1.0.0', wanted: '2.0.0', latest: '2.0.0' },
          pkg2: { current: '1.0.0', wanted: '2.0.0', latest: '2.0.0' },
        }),
        stderr: '',
      }
    }
    return { status: 0, stdout: '', stderr: '' }
  }

  const countingRegistry = createCountingFetch(() => makeUpdateCheckResponse())
  const countingDownloads = createCountingFetch(() => ({ downloads: 1000 }))

  tool.setImpls({
    fs: fsMock,
    spawnSync: spawnSyncMock,
    fetchRegistryJson: countingRegistry.fetch,
    fetchJson: countingDownloads.fetch,
    now: () => new Date('2026-09-01T00:00:00.000Z').getTime(),
  })

  const start = performanceImpl.now()
  await tool.main(['--silent'])
  const durationMs = performanceImpl.now() - start

  tool.resetImpls()

  return {
    durationMs,
    networkCalls: countingRegistry.getCount() + countingDownloads.getCount(),
  }
}

async function runBenchmark(tool) {
  if (tool === 'check-package-age') {
    return { tool, ...(await runCheckPackageAgeBenchmark()) }
  }
  if (tool === 'check-updates') {
    return { tool, ...(await runCheckUpdatesBenchmark()) }
  }
  throw new Error(`Unknown tool: ${tool}`)
}

function loadBaselines() {
  return readJsonSafe(BASELINE_FILE) ?? {}
}

function saveBaselines(baselines) {
  writeJson(BASELINE_FILE, baselines)
}

function compareMetric(name, current, baseline) {
  if (baseline === undefined || baseline === null) {
    return { name, current, baseline, regression: false, note: 'no baseline' }
  }
  const ratio = current / baseline - 1
  const regression = ratio > REGRESSION_THRESHOLD
  return {
    name,
    current,
    baseline,
    regression,
    ratio,
    note: regression
      ? `regression of ${(ratio * 100).toFixed(1)}%`
      : `${(ratio * 100).toFixed(1)}% change`,
  }
}

function compareToBaseline(result, baseline) {
  const toolBaseline = baseline[result.tool] ?? {}
  const duration = compareMetric(
    'durationMs',
    result.durationMs,
    toolBaseline.durationMs,
  )
  const network = compareMetric(
    'networkCalls',
    result.networkCalls,
    toolBaseline.networkCalls,
  )
  const regressions = [duration, network].filter((m) => m.regression)
  return {
    tool: result.tool,
    duration,
    network,
    passed: regressions.length === 0,
  }
}

async function main(argv = process.argv.slice(2)) {
  const { tool, saveBaseline } = parseCliArgs(argv)
  const tools = tool === 'all' ? ['check-package-age', 'check-updates'] : [tool]
  const baselines = loadBaselines()
  const results = []

  for (const t of tools) {
    const result = await runBenchmark(t)
    results.push(result)

    if (saveBaseline) {
      baselines[t] = {
        durationMs: result.durationMs,
        networkCalls: result.networkCalls,
      }
    }
  }

  if (saveBaseline) {
    saveBaselines(baselines)
    console.log('Saved baselines:')
  } else {
    console.log('Benchmark results:')
  }

  let allPassed = true
  for (const result of results) {
    console.log(`\n  ${result.tool}:`)
    console.log(`    durationMs: ${result.durationMs.toFixed(2)}`)
    console.log(`    networkCalls: ${result.networkCalls}`)

    if (!saveBaseline) {
      const comparison = compareToBaseline(result, baselines)
      console.log(`    duration: ${comparison.duration.note}`)
      console.log(`    network: ${comparison.network.note}`)
      if (!comparison.passed) {
        allPassed = false
      }
    }
  }

  if (saveBaseline) {
    return 0
  }
  return allPassed ? 0 : 1
}

if (require.main === module) {
  main().then(
    (code) => process.exit(code),
    (err) => {
      console.error(`Benchmark failed: ${err.message}`)
      process.exit(1)
    },
  )
}

module.exports = {
  main,
  runBenchmark,
  compareToBaseline,
  loadBaselines,
  saveBaselines,
  setImpls,
  resetImpls,
  REGRESSION_THRESHOLD,
}
