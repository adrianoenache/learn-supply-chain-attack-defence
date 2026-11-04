#!/usr/bin/env node
'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const { spawnSync } = require('node:child_process')

const {
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
} = require(path.resolve(__dirname, './check-md-links.js'))
const SCRIPT_PATH = path.resolve(__dirname, 'check-md-links.js')

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'md-links-test-'))
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

describe('check-md-links', () => {
  test('findMarkdownFiles ignores node_modules and .git', () => {
    const tmpDir = makeTempDir()
    try {
      fs.mkdirSync(path.join(tmpDir, 'node_modules'))
      fs.mkdirSync(path.join(tmpDir, '.git'))
      fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# readme\n')
      fs.writeFileSync(path.join(tmpDir, 'node_modules', 'pkg.md'), '# pkg\n')

      const files = findMarkdownFiles(tmpDir)
      assert.equal(files.length, 1)
      assert.ok(files[0].endsWith('readme.md'))
    } finally {
      cleanup(tmpDir)
    }
  })

  test('checkFile returns empty array for valid local links', () => {
    const tmpDir = makeTempDir()
    try {
      fs.writeFileSync(path.join(tmpDir, 'existing.md'), '# existing\n')
      fs.writeFileSync(
        path.join(tmpDir, 'source.md'),
        '[valid link](existing.md)\n',
      )

      const broken = checkFile(path.join(tmpDir, 'source.md'))
      assert.deepEqual(broken, [])
    } finally {
      cleanup(tmpDir)
    }
  })

  test('checkFile detects broken local links', () => {
    const tmpDir = makeTempDir()
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'source.md'),
        '[broken link](missing.md)\n',
      )

      const broken = checkFile(path.join(tmpDir, 'source.md'))
      assert.deepEqual(broken, ['missing.md'])
    } finally {
      cleanup(tmpDir)
    }
  })

  test('checkFile skips external and anchor links', () => {
    const tmpDir = makeTempDir()
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'source.md'),
        '[external](https://example.com) and [anchor](#section)\n',
      )

      const broken = checkFile(path.join(tmpDir, 'source.md'))
      assert.deepEqual(broken, [])
    } finally {
      cleanup(tmpDir)
    }
  })

  test('main returns 0 when no broken links exist', async () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    try {
      fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# readme\n')
      process.chdir(tmpDir)
      const code = await main()
      assert.equal(code, 0)
    } finally {
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('main returns 1 when broken links exist', async () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    try {
      fs.writeFileSync(path.join(tmpDir, 'readme.md'), '[broken](missing.md)\n')
      process.chdir(tmpDir)
      const code = await main()
      assert.equal(code, 1)
    } finally {
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('CLI exits 0 in current project', () => {
    const result = spawnSync(process.execPath, [SCRIPT_PATH], {
      encoding: 'utf8',
    })
    assert.equal(result.status, 0)
  })

  test('hashContent produces stable SHA-256 hex', () => {
    const a = hashContent('hello')
    const b = hashContent('hello')
    const c = hashContent('world')
    assert.equal(a, b)
    assert.notEqual(a, c)
    assert.equal(a.length, 64)
  })

  test('isCacheEntryValid accepts fresh entries and rejects stale ones', () => {
    const now = Date.now()
    setImpls({ now: () => now })
    try {
      const fresh = {
        contentHash: 'abc',
        checkedAt: new Date(now).toISOString(),
        broken: [],
      }
      assert.equal(isCacheEntryValid(fresh), true)

      const stale = {
        contentHash: 'abc',
        checkedAt: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
        broken: [],
      }
      assert.equal(isCacheEntryValid(stale), false)

      const invalid = {
        contentHash: 'abc',
        checkedAt: new Date(now).toISOString(),
      }
      assert.equal(isCacheEntryValid(invalid), false)
    } finally {
      resetImpls()
    }
  })

  test('checkFileWithCache checks file and stores result', () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    const now = Date.now()
    try {
      fs.writeFileSync(path.join(tmpDir, 'existing.md'), '# existing\n')
      fs.writeFileSync(path.join(tmpDir, 'source.md'), '[valid](existing.md)\n')
      process.chdir(tmpDir)
      setImpls({ now: () => now })

      const cache = {}
      const result = checkFileWithCache(path.join(tmpDir, 'source.md'), cache)
      assert.deepEqual(result.broken, [])
      assert.equal(result.fromCache, false)
      assert.equal(Object.keys(cache).length, 1)
      assert.ok(cache['source.md'].contentHash)
      assert.deepEqual(cache['source.md'].broken, [])
    } finally {
      resetImpls()
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('checkFileWithCache returns cached result when content hash matches', () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    const now = Date.now()
    try {
      fs.writeFileSync(path.join(tmpDir, 'existing.md'), '# existing\n')
      fs.writeFileSync(path.join(tmpDir, 'source.md'), '[valid](existing.md)\n')
      process.chdir(tmpDir)
      setImpls({ now: () => now })

      const cache = {}
      checkFileWithCache(path.join(tmpDir, 'source.md'), cache)
      const second = checkFileWithCache(path.join(tmpDir, 'source.md'), cache)
      assert.equal(second.fromCache, true)
      assert.deepEqual(second.broken, [])
    } finally {
      resetImpls()
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('checkFileWithCache revalidates when content changes', () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    const now = Date.now()
    try {
      fs.writeFileSync(path.join(tmpDir, 'source.md'), '[valid](existing.md)\n')
      process.chdir(tmpDir)
      setImpls({ now: () => now })

      const cache = {}
      checkFileWithCache(path.join(tmpDir, 'source.md'), cache)

      fs.writeFileSync(path.join(tmpDir, 'source.md'), '[broken](missing.md)\n')
      const result = checkFileWithCache(path.join(tmpDir, 'source.md'), cache)
      assert.equal(result.fromCache, false)
      assert.deepEqual(result.broken, ['missing.md'])
    } finally {
      resetImpls()
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('checkFileWithCache ignores cache when force is true', () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    const now = Date.now()
    try {
      fs.writeFileSync(path.join(tmpDir, 'source.md'), '[valid](existing.md)\n')
      process.chdir(tmpDir)
      setImpls({ now: () => now })

      const cache = {}
      checkFileWithCache(path.join(tmpDir, 'source.md'), cache)
      const result = checkFileWithCache(
        path.join(tmpDir, 'source.md'),
        cache,
        true,
      )
      assert.equal(result.fromCache, false)
    } finally {
      resetImpls()
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('loadCache and saveCache round-trip through a mock fs', () => {
    const now = Date.now()
    const files = {}
    const mockFs = {
      readFileSync: (filePath, _encoding) => {
        if (files[filePath] !== undefined) return files[filePath]
        const err = new Error(`ENOENT: ${filePath}`)
        err.code = 'ENOENT'
        throw err
      },
      writeFileSync: (filePath, data, _encoding) => {
        files[filePath] = data
      },
      existsSync: () => true,
    }
    setImpls({ fs: mockFs, now: () => now })
    try {
      const cache = {
        'readme.md': {
          contentHash: 'abc',
          checkedAt: new Date(now).toISOString(),
          broken: [],
        },
      }
      saveCache(cache)
      const loaded = loadCache()
      assert.deepEqual(loaded, cache)
    } finally {
      resetImpls()
    }
  })

  test('main writes cache file and reports cache hits', async () => {
    const tmpDir = makeTempDir()
    const now = Date.now()
    const cacheFile = path.join(tmpDir, '.md-links-cache.json')
    const origCwd = process.cwd()
    try {
      fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# readme\n')
      process.chdir(tmpDir)
      setImpls({ now: () => now })

      const code = await main()
      assert.equal(code, 0)
      assert.ok(fs.existsSync(cacheFile))

      const second = await main()
      assert.equal(second, 0)
    } finally {
      resetImpls()
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })
})
