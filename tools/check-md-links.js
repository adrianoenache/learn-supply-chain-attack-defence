#!/usr/bin/env node
'use strict'

// Validates local markdown links inside the repository.
// Checks that every relative markdown link points to an existing file.
// External URLs, anchors and mailto links are skipped.
//
// Usage:
//   node ./tools/check-md-links.js
//   npm run defence:check-md-links

const fs = require('node:fs')
const path = require('node:path')

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g
const IGNORED_DIRS = new Set(['node_modules', '.git'])

function findMarkdownFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue
      results.push(...findMarkdownFiles(path.join(dir, entry.name)))
    } else if (entry.name.endsWith('.md')) {
      results.push(path.join(dir, entry.name))
    }
  }
  return results
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const baseDir = path.dirname(filePath)
  const broken = []

  for (const match of content.matchAll(LINK_RE)) {
    const target = match[2]

    if (
      target.startsWith('http://') ||
      target.startsWith('https://') ||
      target.startsWith('#') ||
      target.startsWith('mailto:')
    ) {
      continue
    }

    const targetPath = target.split('#')[0]
    const resolved = path.resolve(baseDir, targetPath)

    if (!fs.existsSync(resolved)) {
      broken.push(target)
    }
  }

  return broken
}

function main() {
  const rootDir = process.cwd()
  const files = findMarkdownFiles(rootDir)
  let totalBroken = 0

  for (const file of files) {
    const broken = checkFile(file)
    if (broken.length > 0) {
      totalBroken += broken.length
      console.error(`Broken links in ${path.relative(rootDir, file)}:`)
      for (const link of broken) {
        console.error(`  -> ${link}`)
      }
    }
  }

  if (totalBroken === 0) {
    console.log(
      `Checked ${files.length} markdown file(s). All local links are valid.`,
    )
    return 0
  }

  console.error(`Found ${totalBroken} broken local link(s).`)
  return 1
}

if (require.main === module) {
  process.exit(main())
}

module.exports = { findMarkdownFiles, checkFile, main }
