#!/usr/bin/env node
'use strict'

// Validates external URLs referenced by the repository.
// Scans markdown, JSON, YAML, JavaScript, and shell files for http(s) URLs and
// verifies they are reachable. Uses GET with a small response-size limit and
// the shared retry-fetch layer. Supports caching and a known-dead-urls
// allow-list.
//
// Usage:
//   node ./tools/check-external-urls.js
//   npm run defence:check-external-urls
//   npm run defence:check-external-urls -- --force

const fs = require('node:fs')
const path = require('node:path')
const crypto = require('node:crypto')

const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))
const { fetchBuffer } = require(path.resolve(__dirname, './lib/retry-fetch.js'))
const { withProfile } = require(path.resolve(__dirname, './lib/profiler.js'))

const config = loadConfig()

const urlConfig = config.checkExternalUrls ?? {}
const IGNORED_DIRS = new Set(
  urlConfig.ignoredDirs ?? [
    'node_modules',
    '.git',
    'coverage',
    '.cache',
    'tmp',
  ],
)
const IGNORED_FILES = new Set(
  urlConfig.ignoredFiles ?? [
    '.external-urls-cache.json',
    '.defence-profile.json',
  ],
)
const CACHE_FILE =
  urlConfig.cacheFile ??
  path.resolve(process.cwd(), '.external-urls-cache.json')
const CACHE_TTL_MS = (urlConfig.cacheTtlHours ?? 24) * 60 * 60 * 1000
// 15 s is conservative for reachability checks: some cloud landing pages
// (e.g., Azure, GitHub docs) can take longer than 10 s to start responding
// under load, while still being valid URLs.
const TIMEOUT_MS = urlConfig.timeoutMs ?? 15000
const RETRY_MAX_ATTEMPTS = urlConfig.retryMaxAttempts ?? 2
const RETRY_INITIAL_DELAY_MS = urlConfig.retryInitialDelayMs ?? 500
const RETRY_BACKOFF_MULTIPLIER = urlConfig.retryBackoffMultiplier ?? 2
const RETRY_MAX_DELAY_MS = urlConfig.retryMaxDelayMs ?? 5000
const CONCURRENCY = urlConfig.concurrency ?? 10

const URL_RE =
  /https?:\/\/[a-zA-Z0-9][-a-zA-Z0-9]*(\.[a-zA-Z0-9][-a-zA-Z0-9]*)+(:\d+)?(\/[^\s"'`<>\]}]*)?/gi
const ILLUSTRATIVE_MARKERS = [
  'illustrative',
  'example',
  'exemplo',
  'fictional',
  'not real',
  'não são reais',
]

// Dependency injection hooks — exposed for tests.
let fsImpl = fs
let fetchBufferImpl = fetchBuffer
let nowImpl = () => Date.now()
let exitImpl = process.exit

function setImpls(impls) {
  if (impls.fs) fsImpl = impls.fs
  if (impls.fetchBuffer) fetchBufferImpl = impls.fetchBuffer
  if (impls.now) nowImpl = impls.now
  if (impls.exit) exitImpl = impls.exit
}

function resetImpls() {
  fsImpl = fs
  fetchBufferImpl = fetchBuffer
  nowImpl = () => Date.now()
  exitImpl = process.exit
}

function findFiles(dir, extensions) {
  const results = []
  for (const entry of fsImpl.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue
      results.push(...findFiles(path.join(dir, entry.name), extensions))
    } else if (
      !IGNORED_FILES.has(entry.name) &&
      extensions.some((ext) => entry.name.endsWith(ext))
    ) {
      results.push(path.join(dir, entry.name))
    }
  }
  return results
}

function _hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex')
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
  if (!entry.checkedAt || entry.statusCode === undefined) return false
  const ageMs = nowImpl() - new Date(entry.checkedAt).getTime()
  return ageMs >= 0 && ageMs < CACHE_TTL_MS
}

function cleanUrl(raw) {
  // Remove trailing punctuation that is almost always Markdown syntax rather
  // than part of the URL, but keep parentheses when they are balanced inside
  // the path so URLs such as Wikipedia anchors are preserved.
  let url = raw
  const openParens = (url.match(/\(/g) ?? []).length
  const closeParens = (url.match(/\)/g) ?? []).length
  if (openParens < closeParens && url.endsWith(')')) {
    url = url.slice(0, -1)
  }
  url = url.replace(/[.,;!?>)\]}+]+$/, '')
  return url
}

function extractUrls(content, filePath) {
  const urls = new Map()
  const lines = content.split('\n')
  let insideCodeBlock = false
  let codeBlockIsIllustrative = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Toggle code-block state when we hit a fence.
    if (line.trim().startsWith('```')) {
      insideCodeBlock = !insideCodeBlock
      if (insideCodeBlock) {
        // Look at the two lines immediately before the fence for illustrative
        // markers. This covers blockquotes like:
        //   > The URLs below are illustrative examples.
        //   ```text
        const context = lines.slice(Math.max(0, i - 2), i).join(' ')
        codeBlockIsIllustrative = ILLUSTRATIVE_MARKERS.some((marker) =>
          context.toLowerCase().includes(marker),
        )
      } else {
        codeBlockIsIllustrative = false
      }
      continue
    }

    for (const match of line.matchAll(URL_RE)) {
      const url = cleanUrl(match[0])

      // Skip URLs inside code blocks that were introduced as illustrative.
      if (insideCodeBlock && codeBlockIsIllustrative) continue

      if (!urls.has(url)) {
        urls.set(url, { files: new Set() })
      }
      urls.get(url).files.add(filePath)
    }
  }

  return urls
}

async function checkUrl(url) {
  try {
    await fetchBufferImpl(url, {
      timeoutMs: TIMEOUT_MS,
      retryMaxAttempts: RETRY_MAX_ATTEMPTS,
      retryInitialDelayMs: RETRY_INITIAL_DELAY_MS,
      retryBackoffMultiplier: RETRY_BACKOFF_MULTIPLIER,
      retryMaxDelayMs: RETRY_MAX_DELAY_MS,
      headers: { Accept: '*/*' },
      // HEAD is not universally supported and retry-fetch does not special-case
      // it. We limit the response size to 1 byte so large bodies are never
      // downloaded for URL reachability checks.
      maxResponseBytes: 1,
    })
    return { ok: true, statusCode: 200 }
  } catch (err) {
    // A size-limit error means the server responded; the URL is reachable.
    if (err.message?.includes('bytes limit')) {
      return { ok: true, statusCode: 200 }
    }
    // Redirects prove the host is reachable; we do not follow them because the
    // goal is reachability, not validating the final destination.
    if (
      err.statusCode !== undefined &&
      err.statusCode >= 300 &&
      err.statusCode < 400
    ) {
      return { ok: true, statusCode: err.statusCode }
    }
    if (err.statusCode !== undefined) {
      return { ok: false, statusCode: err.statusCode, error: err.message }
    }
    return { ok: false, statusCode: null, error: err.message }
  }
}

function loadKnownDeadUrls() {
  const knownDeadPath = path.resolve(
    process.cwd(),
    '.github',
    'known-dead-urls.md',
  )
  const content = (() => {
    try {
      return fsImpl.readFileSync(knownDeadPath, 'utf8')
    } catch {
      return ''
    }
  })()

  const urls = new Set()
  for (const line of content.split('\n')) {
    const match = line.match(/`(https?:\/\/[^`]+)`/)
    if (match) urls.add(match[1])
  }
  return urls
}

async function checkUrls(urls, cache, force) {
  const pending = Array.from(urls.keys())

  async function processOne(url) {
    const cached = cache[url]
    if (!force && cached && isCacheEntryValid(cached)) {
      return { url, result: cached, fromCache: true }
    }

    const result = await checkUrl(url)
    cache[url] = {
      statusCode: result.statusCode,
      ok: result.ok,
      checkedAt: new Date(nowImpl()).toISOString(),
    }
    return { url, result, fromCache: false }
  }

  const allResults = []
  while (pending.length > 0) {
    const batch = pending.splice(0, CONCURRENCY)
    const batchResults = await Promise.all(batch.map(processOne))
    allResults.push(...batchResults)
  }
  return allResults
}

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    isForce: argv.includes('--force'),
    isSilent: argv.includes('--silent'),
  }
}

function main(argv = process.argv.slice(2)) {
  return withProfile(
    'check-external-urls',
    async (profileMetrics) => {
      const { isForce, isSilent } = parseCliArgs(argv)
      const rootDir = process.cwd()
      const extensions = ['.md', '.json', '.yml', '.yaml', '.js', '.sh']
      const files = findFiles(rootDir, extensions)

      const knownDead = loadKnownDeadUrls()
      const cache = loadCache()
      const urlIndex = new Map()

      for (const file of files) {
        const content = fsImpl.readFileSync(file, 'utf8')
        const urls = extractUrls(content, file)
        for (const [url, meta] of urls) {
          if (!urlIndex.has(url)) {
            urlIndex.set(url, { files: new Set() })
          }
          for (const f of meta.files) urlIndex.get(url).files.add(f)
        }
      }

      const results = await checkUrls(urlIndex, cache, isForce)
      const checkedCount = results.length
      let fromCache = 0
      const broken = []
      const deadButKnown = []

      for (const { url, result, fromCache: cached } of results) {
        if (cached) fromCache++
        if (!result.ok) {
          if (knownDead.has(url)) {
            deadButKnown.push({
              url,
              statusCode: result.statusCode,
              error: result.error,
            })
          } else {
            broken.push({
              url,
              statusCode: result.statusCode,
              error: result.error,
            })
          }
        }
      }

      saveCache(cache)

      profileMetrics.networkCalls = checkedCount - fromCache
      profileMetrics.cacheHits = fromCache
      profileMetrics.cacheMisses = checkedCount - fromCache

      if (!isSilent) {
        if (deadButKnown.length > 0) {
          console.log(`⚠️  ${deadButKnown.length} known-dead URL(s) skipped:`)
          for (const { url, statusCode } of deadButKnown) {
            console.log(`  ${url} (HTTP ${statusCode ?? 'error'})`)
          }
        }

        if (broken.length > 0) {
          console.error(`\n❌ Found ${broken.length} broken external URL(s):`)
          for (const { url, statusCode, error } of broken) {
            console.error(`  ${url}`)
            console.error(
              `    status: ${statusCode ?? 'network error'} | ${error}`,
            )
            const files = Array.from(urlIndex.get(url).files).map((f) =>
              path.relative(rootDir, f),
            )
            console.error(`    files:  ${files.join(', ')}`)
          }
          console.error(
            '\nFix the URLs, mark them as illustrative, or add intentional dead URLs to .github/known-dead-urls.md.',
          )
          return 1
        }

        console.log(
          `✅ Checked ${checkedCount} external URL(s). All reachable.` +
            (fromCache > 0 ? ` (${fromCache} from cache)` : ''),
        )
      }

      return broken.length > 0 ? 1 : 0
    },
    { profilePath: path.resolve(process.cwd(), '.defence-profile.json') },
  )
}

if (require.main === module) {
  main().then(
    (code) => exitImpl(code),
    (err) => {
      console.error(`Unexpected error: ${err.message}`)
      exitImpl(1)
    },
  )
}

module.exports = {
  findFiles,
  extractUrls,
  checkUrl,
  loadKnownDeadUrls,
  main,
  setImpls,
  resetImpls,
  URL_RE,
}
