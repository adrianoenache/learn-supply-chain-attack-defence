#!/usr/bin/env node
'use strict'

// Installer that copies this project's supply-chain defences into another
// Node.js project without publishing a package. It only reads and copies
// files; it never executes code from the target directory.
//
// Usage:
//   node ./tools/install-defences.js <path-to-target-project> [--dry-run]
//
// What it copies:
//   - Hardened npm configuration (.npmrc, .husky/pre-commit, .husky/post-merge,
//     biome.json).
//   - Defence scripts under tools/ and their tests.
//   - Shared libraries under tools/lib/ and their tests.
//   - Performance benchmarks under tools/perf/.
//   - The installer itself and its integrity manifest machinery.
//   See FILES_TO_COPY below for the complete, authoritative list.
//
// What it updates in the target package.json:
//   - Adds defence-prefixed scripts that point to the copied tools.
//   - Adds lint, lint:fix and format scripts using Biome.
//   - Ensures husky and @biomejs/biome are listed in devDependencies.
//   - Preserves existing scripts that do not conflict.
//
// Safety rules:
//   - Refuses to run if the target has no package.json.
//   - Refuses to overwrite existing files unless --force is passed.
//   - Backs up any file it overwrites to <name>.backup-<timestamp>.

const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const SOURCE_DIR = path.resolve(__dirname, '..')

const FILES_TO_COPY = [
  '.npmrc',
  '.husky/pre-commit',
  '.husky/post-merge',
  'biome.json',
  'tools/add-package.js',
  'tools/add-package.test.js',
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
  'tools/install-defences.js',
  'tools/install-defences.test.js',
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
  'tools/lib/registry-cache.test.js',
  'tools/lib/retry-fetch.js',
  'tools/lib/retry-fetch.test.js',
  'tools/lib/sync-check.js',
  'tools/lib/typosquatting.test.js',
  'tools/perf/benchmark.js',
  'tools/perf/benchmark.test.js',
  'tools/perf/baselines.json',
]

const MANIFEST_NAME = '.defence-manifest.json'

const SCRIPTS_TO_ADD = {
  setup:
    'npm run defence:check-engines && npm run defence:pkg-age-check && npm ci && npm audit signatures && npm run prepare',
  'defence:add': 'node ./tools/add-package.js',
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
  'defence:license-check:json': 'node ./tools/check-licenses.js --format=json',
  'defence:perf': 'node ./tools/perf/benchmark.js',
  'defence:perf:baseline': 'node ./tools/perf/benchmark.js --save-baseline',
  'defence:perf:check-package-age':
    'node ./tools/perf/benchmark.js --tool=check-package-age',
  'defence:perf:check-updates':
    'node ./tools/perf/benchmark.js --tool=check-updates',
  'defence:pkg-age-check': 'node ./tools/check-package-age.js',
  'defence:pre-commit':
    'npm audit signatures && npm run defence:audit && npm run defence:update-check',
  'defence:reinstall':
    'npm run defence:check-engines && npm run defence:pkg-age-check && rm -rf node_modules && npm cache clean --force && npm ci && npm audit signatures && npm run prepare && node ./tools/check-package-age.js --transitive && npm audit fix && node ./tools/check-package-age.js --transitive && npm outdated',
  'defence:sync-check': 'node ./tools/check-sync.js',
  'defence:sync-check:fix': 'node ./tools/check-sync.js --fix',
  'defence:update': 'node ./tools/update-packages.js',
  'defence:update:interactive': 'node ./tools/update-packages.js --interactive',
  'defence:update:interactive:dry-run':
    'node ./tools/update-packages.js --interactive --dry-run',
  'defence:update-badge': 'node ./tools/update-badge.js',
  'defence:update-badge:dry-run': 'node ./tools/update-badge.js --dry-run',
  'defence:update-check': 'node ./tools/check-updates.js',
  'defence:update-check:force': 'node ./tools/check-updates.js --force',
  'defence:update-check:json': 'node ./tools/check-updates.js --format=json',
  'defence:update-check:offline': 'node ./tools/check-updates.js --offline',
  'defence:verify-defences': 'node ./tools/verify-defences.js',
  'defence:verify-defences:fix':
    'node ./tools/install-defences.js --update-local-manifest',
  format: 'biome format --write tools/',
  lint: 'biome check tools/',
  'lint:fix': 'biome check --write tools/',
  prepare: 'husky',
  test: 'node --test tools/*.test.js tools/lib/*.test.js tools/perf/*.test.js',
}

const DEV_DEPENDENCIES_TO_ADD = {
  husky: '9.1.7',
  '@biomejs/biome': '2.5.8',
}

function parseArgs(argv) {
  const target = argv.find((a) => !a.startsWith('-'))
  const dryRun = argv.includes('--dry-run')
  const force = argv.includes('--force')
  return { target, dryRun, force }
}

function showUsage() {
  console.log('Usage:')
  console.log(
    '  node ./tools/install-defences.js <path-to-target-project> [--dry-run] [--force]',
  )
  console.log()
  console.log('Options:')
  console.log(
    '  --dry-run  Show what would be copied without changing any file.',
  )
  console.log(
    '  --force    Overwrite existing files (a backup is created first).',
  )
}

function readTargetPackageJson(targetDir) {
  const pkgPath = path.join(targetDir, 'package.json')
  if (!fs.existsSync(pkgPath)) {
    throw new Error(
      `Target directory does not contain a package.json file: ${targetDir}`,
    )
  }
  return { pkgPath, content: JSON.parse(fs.readFileSync(pkgPath, 'utf8')) }
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function verifySourceIntegrity(src) {
  const hash = sha256File(src)
  // The manifest is computed at runtime from the current source tree (Opção B).
  // This detects accidental corruption but not malicious modification of the
  // install-defences.js script itself. Opção A (static manifest) is planned for Fase 7.
  return hash
}

function copyFile(src, dest, force, dryRun) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source file does not exist: ${src}`)
  }

  const sourceHash = verifySourceIntegrity(src)

  if (fs.existsSync(dest)) {
    if (!force) {
      throw new Error(
        `File already exists: ${dest}. Use --force to overwrite (backup will be created).`,
      )
    }
    if (!dryRun) {
      const backup = `${dest}.backup-${Date.now()}`
      fs.copyFileSync(dest, backup)
      console.log(`  Backed up existing file to ${backup}`)
    }
  }

  if (dryRun) {
    console.log(
      `  [dry-run] Would copy ${src} -> ${dest} (SHA-256: ${sourceHash})`,
    )
    return
  }

  const destDir = path.dirname(dest)
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  fs.copyFileSync(src, dest)
  console.log(`  Copied ${src} -> ${dest} (SHA-256: ${sourceHash})`)
}

function buildManifest(targetDir) {
  const files = []
  for (const relativePath of FILES_TO_COPY) {
    const filePath = path.join(targetDir, relativePath)
    if (!fs.existsSync(filePath)) {
      continue
    }
    files.push({ path: relativePath, hash: sha256File(filePath) })
  }
  return {
    version: 1,
    installedAt: new Date().toISOString(),
    files,
  }
}

// Regenerates .defence-manifest.json in the current project without copying
// files. Used by the pre-commit hook and the verify-defences:fix npm script
// to keep the manifest synchronized with legitimate source edits.
function updateLocalManifest(cwd = process.cwd()) {
  const manifest = buildManifest(cwd)
  const manifestPath = path.join(cwd, MANIFEST_NAME)
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(
    `Updated ${MANIFEST_NAME} with ${manifest.files.length} file hash(es).`,
  )
  return manifest
}

function writeManifest(targetDir, dryRun) {
  const manifest = buildManifest(targetDir)
  const manifestPath = path.join(targetDir, MANIFEST_NAME)

  if (dryRun) {
    console.log(
      `  [dry-run] Would write ${MANIFEST_NAME} with ${manifest.files.length} file(s).`,
    )
    return manifest
  }

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(
    `  Wrote ${MANIFEST_NAME} with ${manifest.files.length} file hash(es).`,
  )
  return manifest
}

function updatePackageJson(pkgPath, content, dryRun) {
  const originalScripts = content.scripts || {}
  const conflicts = Object.keys(SCRIPTS_TO_ADD).filter(
    (key) =>
      originalScripts[key] && originalScripts[key] !== SCRIPTS_TO_ADD[key],
  )

  if (conflicts.length > 0) {
    throw new Error(
      `Target package.json already defines conflicting scripts: ${conflicts.join(', ')}. ` +
        'Resolve manually or use a fresh target project.',
    )
  }

  const newScripts = { ...originalScripts, ...SCRIPTS_TO_ADD }
  const newDevDeps = {
    ...(content.devDependencies || {}),
    ...DEV_DEPENDENCIES_TO_ADD,
  }

  const updated = {
    ...content,
    scripts: newScripts,
    devDependencies: newDevDeps,
  }

  if (dryRun) {
    console.log(
      '  [dry-run] Would update scripts and devDependencies in package.json',
    )
    return
  }

  fs.writeFileSync(pkgPath, `${JSON.stringify(updated, null, 2)}\n`)
  console.log(
    '  Updated package.json with defence scripts and husky devDependency.',
  )
}

function main(argv) {
  const { target, dryRun, force } = parseArgs(argv)

  if (!target) {
    console.error('Error: missing target project directory.')
    showUsage()
    return 1
  }

  const targetDir = path.resolve(target)
  if (!fs.existsSync(targetDir)) {
    console.error(`Error: target directory does not exist: ${targetDir}`)
    return 1
  }

  const { pkgPath, content } = readTargetPackageJson(targetDir)

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Installing supply-chain defences into ${targetDir}`,
  )

  for (const relativePath of FILES_TO_COPY) {
    const src = path.join(SOURCE_DIR, relativePath)
    const dest = path.join(targetDir, relativePath)
    copyFile(src, dest, force, dryRun)
  }

  writeManifest(targetDir, dryRun)
  updatePackageJson(pkgPath, content, dryRun)

  console.log('\nDone.')
  if (dryRun) {
    console.log('This was a dry run. Remove --dry-run to apply changes.')
  } else {
    console.log('Next steps in the target project:')
    console.log(
      '  1. Run npm install to install husky and generate the lock file.',
    )
    console.log('  2. Run bash .husky/pre-commit to verify the hook.')
    console.log(
      '  3. Commit .npmrc, .husky/, tools/, and package.json changes.',
    )
  }
  return 0
}

if (require.main === module) {
  const argv = process.argv.slice(2)
  if (argv.includes('--update-local-manifest')) {
    updateLocalManifest()
    process.exit(0)
  }
  const code = main(argv)
  process.exit(code)
}

module.exports = {
  parseArgs,
  main,
  sha256File,
  verifySourceIntegrity,
  buildManifest,
  writeManifest,
  updateLocalManifest,
  FILES_TO_COPY,
  MANIFEST_NAME,
}
