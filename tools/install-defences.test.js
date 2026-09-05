#!/usr/bin/env node
'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')

const {
  parseArgs,
  main,
  updateLocalManifest,
} = require('./install-defences.js')
const SCRIPT_PATH = path.resolve(__dirname, 'install-defences.js')

function makeTempTarget(pkg = {}) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'defence-install-'))
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'target', version: '1.0.0', ...pkg }, null, 2) +
      '\n',
  )
  return tmpDir
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

describe('install-defences', () => {
  test('parseArgs extracts target, dryRun and force', () => {
    assert.deepEqual(parseArgs(['/some/path']), {
      target: '/some/path',
      dryRun: false,
      force: false,
    })
    assert.deepEqual(parseArgs(['/some/path', '--dry-run']), {
      target: '/some/path',
      dryRun: true,
      force: false,
    })
    assert.deepEqual(parseArgs(['--force', '/some/path']), {
      target: '/some/path',
      dryRun: false,
      force: true,
    })
  })

  test('main returns 1 when target is missing', () => {
    const code = main([])
    assert.equal(code, 1)
  })

  test('main returns 1 when target directory does not exist', () => {
    const code = main(['/definitely/not/a/real/path'])
    assert.equal(code, 1)
  })

  test('dry-run does not modify target', () => {
    const target = makeTempTarget()
    try {
      const before = fs.readFileSync(path.join(target, 'package.json'), 'utf8')
      const code = main([target, '--dry-run'])
      assert.equal(code, 0)
      const after = fs.readFileSync(path.join(target, 'package.json'), 'utf8')
      assert.equal(before, after)
      assert.equal(fs.existsSync(path.join(target, '.npmrc')), false)
    } finally {
      cleanup(target)
    }
  })

  test('install copies files and updates package.json', () => {
    const target = makeTempTarget()
    try {
      const code = main([target])
      assert.equal(code, 0)

      const expectedFiles = [
        '.npmrc',
        '.husky/pre-commit',
        '.husky/post-merge',
        'biome.json',
        'tools/add-package.js',
        'tools/add-package.test.js',
        'tools/analyze-lifecycle-scripts.js',
        'tools/analyze-lifecycle-scripts.test.js',
        'tools/check-engines.js',
        'tools/check-engines.test.js',
        'tools/check-hooks.js',
        'tools/check-hooks.test.js',
        'tools/check-licenses.js',
        'tools/check-licenses.test.js',
        'tools/check-lockfile-integrity.js',
        'tools/check-lockfile-integrity.test.js',
        'tools/check-md-links.js',
        'tools/check-md-links.test.js',
        'tools/check-package-age.js',
        'tools/check-package-age.test.js',
        'tools/check-secrets.js',
        'tools/check-secrets.test.js',
        'tools/check-sync.js',
        'tools/check-sync.test.js',
        'tools/check-updates.js',
        'tools/check-updates.test.js',
        'tools/generate-sbom.js',
        'tools/generate-sbom.test.js',
        'tools/generate-trust-report.js',
        'tools/generate-trust-report.test.js',
        'tools/install-defences.js',
        'tools/install-defences.test.js',
        'tools/monitor-install.js',
        'tools/monitor-install.test.js',
        'tools/integration.test.js',
        'tools/run-audit-with-retry.js',
        'tools/run-audit-with-retry.test.js',
        'tools/setup-bootstrap.js',
        'tools/setup-bootstrap.test.js',
        'tools/update-badge.js',
        'tools/update-badge.test.js',
        'tools/update-packages.js',
        'tools/update-packages.test.js',
        'tools/verify-defences.js',
        'tools/verify-defences.test.js',
        'tools/lib/config.js',
        'tools/lib/config.test.js',
        'tools/lib/package-utils.js',
        'tools/lib/profiler.js',
        'tools/lib/profiler.test.js',
        'tools/lib/provenance.js',
        'tools/lib/provenance.test.js',
        'tools/lib/registry-cache.js',
        'tools/lib/script-analyzer.js',
        'tools/lib/script-analyzer.test.js',
        'tools/lib/trust-engine.js',
        'tools/lib/trust-engine.test.js',
        'tools/lib/process-monitor.js',
        'tools/lib/process-monitor.test.js',
        'tools/lib/install-monitor-report.js',
        'tools/lib/install-monitor-report.test.js',
        'tools/lib/registry-cache.test.js',
        'tools/lib/retry-fetch.js',
        'tools/lib/retry-fetch.test.js',
        'tools/lib/sync-check.js',
        'tools/lib/typosquatting.test.js',
        'tools/perf/benchmark.js',
        'tools/perf/benchmark.test.js',
        'tools/perf/baselines.json',
      ]
      for (const relativePath of expectedFiles) {
        assert.equal(
          fs.existsSync(path.join(target, relativePath)),
          true,
          `expected ${relativePath} to be copied`,
        )
      }

      const pkg = JSON.parse(
        fs.readFileSync(path.join(target, 'package.json'), 'utf8'),
      )
      const expectedScripts = {
        setup:
          'npm run defence:check-engines && npm run defence:pkg-age-check && npm ci && npm audit signatures && npm run prepare',
        'defence:add': 'node ./tools/add-package.js',
        'defence:analyze-lifecycle-scripts':
          'node ./tools/analyze-lifecycle-scripts.js',
        'defence:install-monitored': 'node ./tools/monitor-install.js',
        'defence:trust-report': 'node ./tools/generate-trust-report.js',
        'defence:trust-report:json':
          'node ./tools/generate-trust-report.js --format=json',
        'defence:trust-report:fail':
          'node ./tools/generate-trust-report.js --fail',
        'defence:audit': 'node ./tools/run-audit-with-retry.js',
        'defence:bootstrap': 'node ./tools/setup-bootstrap.js',
        'defence:check-engines': 'node ./tools/check-engines.js',
        'defence:check-hooks': 'node ./tools/check-hooks.js',
        'defence:check-md-links': 'node ./tools/check-md-links.js',
        'defence:check-secrets': 'node ./tools/check-secrets.js',
        'defence:check-lockfile-integrity':
          'node ./tools/check-lockfile-integrity.js',
        'defence:generate-sbom': 'node ./tools/generate-sbom.js',
        'defence:license-check': 'node ./tools/check-licenses.js',
        'defence:license-check:fail': 'node ./tools/check-licenses.js --fail',
        'defence:license-check:json':
          'node ./tools/check-licenses.js --format=json',
        'defence:perf': 'node ./tools/perf/benchmark.js',
        'defence:perf:baseline':
          'node ./tools/perf/benchmark.js --save-baseline',
        'defence:pkg-age-check': 'node ./tools/check-package-age.js',
        'defence:pre-commit':
          'npm audit signatures && npm run defence:audit && npm run defence:update-check',
        'defence:sync-check': 'node ./tools/check-sync.js',
        'defence:sync-check:fix': 'node ./tools/check-sync.js --fix',
        'defence:update': 'node ./tools/update-packages.js',
        'defence:update:interactive':
          'node ./tools/update-packages.js --interactive',
        'defence:update:interactive:dry-run':
          'node ./tools/update-packages.js --interactive --dry-run',
        'defence:update-badge': 'node ./tools/update-badge.js',
        'defence:update-badge:dry-run':
          'node ./tools/update-badge.js --dry-run',
        'defence:update-check': 'node ./tools/check-updates.js',
        'defence:update-check:force': 'node ./tools/check-updates.js --force',
        'defence:update-check:json':
          'node ./tools/check-updates.js --format=json',
        'defence:update-check:offline':
          'node ./tools/check-updates.js --offline',
        'defence:verify-defences': 'node ./tools/verify-defences.js',
        'defence:verify-defences:fix':
          'node ./tools/install-defences.js --update-local-manifest',
        format: './node_modules/.bin/biome format --write tools/',
        'format:check': './node_modules/.bin/biome format tools/',
        lint: './node_modules/.bin/biome check tools/',
        'lint:fix': './node_modules/.bin/biome check --write tools/',
        prepare: 'husky',
        test: 'node --test tools/*.test.js tools/lib/*.test.js tools/perf/*.test.js',
      }
      for (const [name, value] of Object.entries(expectedScripts)) {
        assert.equal(pkg.scripts[name], value, `unexpected script ${name}`)
      }
      assert.equal(pkg.devDependencies.husky, '9.1.7')
      assert.equal(pkg.devDependencies['@biomejs/biome'], '2.5.8')
    } finally {
      cleanup(target)
    }
  })

  test('install aborts when target files exist and force is not set', () => {
    const target = makeTempTarget()
    fs.writeFileSync(path.join(target, '.npmrc'), 'existing=true\n')
    try {
      let code
      try {
        code = main([target])
      } catch (_err) {
        code = 1
      }
      assert.equal(code, 1)
    } finally {
      cleanup(target)
    }
  })

  test('install backs up and overwrites when force is set', () => {
    const target = makeTempTarget()
    fs.writeFileSync(path.join(target, '.npmrc'), 'existing=true\n')
    try {
      const code = main([target, '--force'])
      assert.equal(code, 0)
      const backups = fs
        .readdirSync(target)
        .filter((f) => f.startsWith('.npmrc.backup-'))
      assert.ok(backups.length >= 1, 'expected a backup file to be created')
      assert.ok(
        fs
          .readFileSync(path.join(target, '.npmrc'), 'utf8')
          .includes('save-exact'),
      )
    } finally {
      cleanup(target)
    }
  })

  test('install aborts on conflicting script values', () => {
    const target = makeTempTarget({
      scripts: { 'defence:add': 'something-else' },
    })
    try {
      let code
      try {
        code = main([target])
      } catch (_err) {
        code = 1
      }
      assert.equal(code, 1)
    } finally {
      cleanup(target)
    }
  })

  test('install preserves non-conflicting existing scripts', () => {
    const target = makeTempTarget({ scripts: { build: 'tsc' } })
    try {
      const code = main([target])
      assert.equal(code, 0)
      const pkg = JSON.parse(
        fs.readFileSync(path.join(target, 'package.json'), 'utf8'),
      )
      assert.equal(pkg.scripts.build, 'tsc')
      assert.equal(pkg.scripts['defence:add'], 'node ./tools/add-package.js')
    } finally {
      cleanup(target)
    }
  })

  test('CLI prints usage when called without arguments', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 1)
    assert.ok(result.stdout.includes('Usage'))
  })

  test('updateLocalManifest regenerates manifest from current source tree', () => {
    const target = makeTempTarget()
    try {
      const code = main([target])
      assert.equal(code, 0)
      const originalManifest = JSON.parse(
        fs.readFileSync(path.join(target, '.defence-manifest.json'), 'utf8'),
      )

      // Simulate a legitimate edit to a copied file.
      const filePath = path.join(target, 'tools', 'check-package-age.js')
      fs.appendFileSync(filePath, '\n')

      const manifest = updateLocalManifest(target)
      assert.ok(Array.isArray(manifest.files))
      assert.ok(manifest.files.length > 0)
      const checkPackageAgeEntry = manifest.files.find(
        (f) => f.path === 'tools/check-package-age.js',
      )
      assert.ok(checkPackageAgeEntry)
      assert.notEqual(
        checkPackageAgeEntry.hash,
        originalManifest.files.find(
          (f) => f.path === 'tools/check-package-age.js',
        ).hash,
      )
    } finally {
      cleanup(target)
    }
  })
})
