#!/usr/bin/env node
'use strict'

// Validates local markdown links inside the repository.
// Checks that every relative markdown link points to an existing file.
// External URLs, anchors and mailto links are skipped.
//
// Uses an incremental cache keyed by file content hash so unchanged files are
// skipped on repeated runs. The cache is stored as JSON at the path configured
// in package.json (`checkMdLinks.cacheFile`) and expires after the configured
// TTL (`checkMdLinks.cacheTtlHours`).
//
// Usage:
//   node ./tools/check-md-links.js
//   npm run defence:check-md-links
//   npm run defence:check-md-links -- --force

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))

const config = loadConfig()

const LINK_RE = /\[([^\]]+)\]\(([^)]+)\)/g
const IGNORED_DIRS = new Set(config.checkMdLinks.ignoredDirs)
const CACHE_FILE = config.checkMdLinks.cacheFile
const CACHE_TTL_MS = config.checkMdLinks.cacheTtlHours * 60 * 60 * 1000

// Dependency injection hooks — exposed for tests.
let fsImpl = fs
let nowImpl = () => Date.now()

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.now) nowImpl = impls.now
}

function resetImpls() {
  fsImpl = fs
  nowImpl = () => Date.now()
}

function findMarkdownFiles(dir) {
  const results = []
  for (const entry of fsImpl.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue
      results.push(...findMarkdownFiles(path.join(dir, entry.name)))
    } else if (entry.name.endsWith('.md')) {
      results.push(path.join(dir, entry.name))
    }
  }
  return results
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
}

function readJsonSafe(filePath) {
  try {
    const content = fsImpl.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch {
    return null
  }
}

function writeJson(filePath, data) {
  fsImpl.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
}

function loadCache() {
  const cache = readJsonSafe(CACHE_FILE)
  if (!cache || typeof cache !== 'object') return {}
  return cache.entries ?? {}
}

function saveCache(entries) {
  writeJson(CACHE_FILE, {
    generatedAt: new Date(nowImpl()).toISOString(),
    entries,
  })
}

function isCacheEntryValid(entry) {
  if (!entry || typeof entry !== 'object') return false
  if (!entry.checkedAt || !entry.contentHash || !Array.isArray(entry.broken)) {
    return false
  }
  const ageMs = nowImpl() - new Date(entry.checkedAt).getTime()
  return ageMs >= 0 && ageMs < CACHE_TTL_MS
}

function checkFile(filePath) {
  const content = fsImpl.readFileSync(filePath, 'utf8')
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

    if (!fsImpl.existsSync(resolved)) {
      broken.push(target)
    }
  }

  return broken
}

function checkFileWithCache(filePath, cache, force = false) {
  const content = fsImpl.readFileSync(filePath, 'utf8')
  const contentHash = hashContent(content)
  const relativePath = path.relative(process.cwd(), filePath)
  const cached = cache[relativePath]

  if (
    !force &&
    cached?.contentHash === contentHash &&
    isCacheEntryValid(cached)
  ) {
    return { broken: cached.broken, fromCache: true }
  }

  const broken = checkFile(filePath)
  cache[relativePath] = {
    contentHash,
    checkedAt: new Date(nowImpl()).toISOString(),
    broken,
  }
  return { broken, fromCache: false }
}

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    isForce: argv.includes('--force'),
  }
}

function main(argv = process.argv.slice(2)) {
  const { isForce } = parseCliArgs(argv)
  const rootDir = process.cwd()
  const files = findMarkdownFiles(rootDir)
  let totalBroken = 0
  let checkedFromCache = 0

  const cache = loadCache()

  for (const file of files) {
    const { broken, fromCache } = checkFileWithCache(file, cache, isForce)
    if (fromCache) checkedFromCache++
    if (broken.length > 0) {
      totalBroken += broken.length
      console.error(`Broken links in ${path.relative(rootDir, file)}:`)
      for (const link of broken) {
        console.error(`  -> ${link}`)
      }
    }
  }

  saveCache(cache)

  if (totalBroken === 0) {
    console.log(
      `Checked ${files.length} markdown file(s). All local links are valid.` +
        (checkedFromCache > 0 ? ` (${checkedFromCache} from cache)` : ''),
    )
    return 0
  }

  console.error(`Found ${totalBroken} broken local link(s).`)
  return 1
}

if (require.main === module) {
  process.exit(main())
}

module.exports = {
  findMarkdownFiles,
  checkFile,
  checkFileWithCache,
  main,
  setImpls,
  resetImpls,
  hashContent,
  isCacheEntryValid,
  loadCache,
  saveCache,
}
