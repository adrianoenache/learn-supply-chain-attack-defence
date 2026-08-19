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
//   - .npmrc
//   - .husky/pre-commit
//   - biome.json
//   - tools/check-package-age.js
//   - tools/add-package.js
//   - tools/lib/package-utils.js
//   - tools/setup-bootstrap.js
//   - tools/setup-bootstrap.test.js
//   - tools/check-package-age.test.js
//   - tools/install-defences.js
//   - tools/install-defences.test.js
//   - tools/update-packages.js
//   - tools/update-packages.test.js
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

const fs = require('node:fs')
const path = require('node:path')

const SOURCE_DIR = path.resolve(__dirname, '..')

const FILES_TO_COPY = [
  '.npmrc',
  '.husky/pre-commit',
  'biome.json',
  'tools/check-package-age.js',
  'tools/add-package.js',
  'tools/check-md-links.js',
  'tools/check-md-links.test.js',
  'tools/lib/package-utils.js',
  'tools/setup-bootstrap.js',
  'tools/setup-bootstrap.test.js',
  'tools/check-package-age.test.js',
  'tools/install-defences.js',
  'tools/install-defences.test.js',
  'tools/update-packages.js',
  'tools/update-packages.test.js',
]

const SCRIPTS_TO_ADD = {
  setup:
    'node --version && npm --version && npm run defence:pkg-age-check && npm ci && npm audit signatures && npm run prepare',
  'defence:pkg-age-check': 'node ./tools/check-package-age.js',
  'defence:check-md-links': 'node ./tools/check-md-links.js',
  'defence:reinstall':
    'node --version && npm --version && npm run defence:pkg-age-check && rm -rf node_modules && npm cache clean --force && npm ci && npm audit signatures && npm run prepare && node ./tools/check-package-age.js --transitive && npm audit fix && node ./tools/check-package-age.js --transitive && npm outdated',
  'defence:pre-commit': 'npm audit signatures && npm audit --audit-level=high',
  'defence:add': 'node ./tools/add-package.js',
  'defence:bootstrap': 'node ./tools/setup-bootstrap.js',
  'defence:update': 'node ./tools/update-packages.js',
  test: 'node --test tools/*.test.js',
  lint: 'biome check tools/',
  'lint:fix': 'biome check --write tools/',
  format: 'biome format --write tools/',
  prepare: 'husky',
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

function copyFile(src, dest, force, dryRun) {
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
    console.log(`  [dry-run] Would copy ${src} -> ${dest}`)
    return
  }

  const destDir = path.dirname(dest)
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }
  fs.copyFileSync(src, dest)
  console.log(`  Copied ${src} -> ${dest}`)
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
  const code = main(process.argv.slice(2))
  process.exit(code)
}

module.exports = { parseArgs, main }
