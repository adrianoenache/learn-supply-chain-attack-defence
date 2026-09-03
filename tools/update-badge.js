#!/usr/bin/env node
'use strict'

// Updates the test-count badge in README.md to match the number of test()
// calls found in tools/*.test.js and tools/lib/*.test.js. Intended to run
// before each commit so the badge stays in sync with the test suite without
// relying on CI/CD.
//
// Usage:
//   npm run defence:update-badge              — update README.md badge
//   npm run defence:update-badge -- --dry-run — print the new badge without writing

const fs = require('node:fs')
const path = require('node:path')
const { globSync } = require('node:fs')

const README_PATH = path.resolve(__dirname, '../README.md')
const TEST_GLOBS = [
  path.resolve(__dirname, '*.test.js'),
  path.resolve(__dirname, 'lib', '*.test.js'),
]
const BADGE_RE =
  /!\[Tests\]\(https:\/\/img\.shields\.io\/badge\/Tests-\d+%2F\d+%20passing-[a-zA-Z]+\)/

// ---------------------------------------------------------------------------
// Dependency injection hooks — exposed for tests.
// ---------------------------------------------------------------------------

let fsImpl = fs
let globSyncImpl = globSync
let exitImpl = process.exit
let readmePathImpl = README_PATH

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.globSync) globSyncImpl = impls.globSync
  if (impls.exit) exitImpl = impls.exit
  if (impls.readmePath) readmePathImpl = impls.readmePath
}

function resetImpls() {
  fsImpl = fs
  globSyncImpl = globSync
  exitImpl = process.exit
  readmePathImpl = README_PATH
}

// ---------------------------------------------------------------------------
// CLI argument parsing.
// ---------------------------------------------------------------------------

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    isDryRun: argv.includes('--dry-run'),
  }
}

// ---------------------------------------------------------------------------
// Test counting.
// ---------------------------------------------------------------------------

function countTestsInFile(filePath) {
  const content = fsImpl.readFileSync(filePath, 'utf8')
  const lines = content.split(/\r?\n/)
  let count = 0
  let inBlockComment = false

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (line === '') continue

    // Track simple block comments. Nested block comments are not supported
    // because they are extremely rare in this codebase.
    if (inBlockComment) {
      if (line.includes('*/')) inBlockComment = false
      continue
    }
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlockComment = true
      continue
    }
    if (line.startsWith('//')) continue

    // Count top-level test( calls that start a statement (after optional
    // indentation). This matches the way the native node:test runner is used
    // in this project, both inside and outside describe() blocks, while
    // ignoring regex.test(...) method calls and casual references in comments.
    if (/^\s*test\(/.test(line)) {
      count++
    }
  }

  return count
}

function countAllTests(testFiles) {
  return testFiles.reduce((sum, file) => sum + countTestsInFile(file), 0)
}

// ---------------------------------------------------------------------------
// Badge generation and update.
// ---------------------------------------------------------------------------

function buildBadgeLine(count) {
  const encoded = `${count}%2F${count}%20passing`
  return `![Tests](https://img.shields.io/badge/Tests-${encoded}-brightgreen)`
}

function updateBadgeLine(readmeContent, newBadgeLine) {
  if (!BADGE_RE.test(readmeContent)) {
    throw new Error('Could not find the test badge line in README.md.')
  }
  return readmeContent.replace(BADGE_RE, newBadgeLine)
}

function resolveTestFiles() {
  return TEST_GLOBS.flatMap((g) => globSyncImpl(g)).sort()
}

// ---------------------------------------------------------------------------
// Main entry point.
// ---------------------------------------------------------------------------

function main(argv = process.argv.slice(2)) {
  const { isDryRun } = parseCliArgs(argv)

  try {
    const testFiles = resolveTestFiles()
    if (testFiles.length === 0) {
      throw new Error(
        `No test files found for patterns ${TEST_GLOBS.join(', ')}.`,
      )
    }

    const count = countAllTests(testFiles)
    const badgeLine = buildBadgeLine(count)

    if (isDryRun) {
      console.log(`[dry-run] Test badge would be: ${badgeLine}`)
      return 0
    }

    const readmeContent = fsImpl.readFileSync(readmePathImpl, 'utf8')
    const updatedContent = updateBadgeLine(readmeContent, badgeLine)

    if (updatedContent === readmeContent) {
      console.log(
        `Test badge is already up to date (${count}/${count} passing).`,
      )
      return 0
    }

    fsImpl.writeFileSync(readmePathImpl, updatedContent, 'utf8')
    console.log(`Updated README.md test badge to ${count}/${count} passing.`)
    return 0
  } catch (err) {
    console.error(`update-badge failed: ${err.message}`)
    exitImpl(1)
    return 1
  }
}

if (require.main === module) {
  const code = main()
  exitImpl(code)
}

module.exports = {
  main,
  countTestsInFile,
  countAllTests,
  buildBadgeLine,
  updateBadgeLine,
  parseCliArgs,
  setImpls,
  resetImpls,
}
