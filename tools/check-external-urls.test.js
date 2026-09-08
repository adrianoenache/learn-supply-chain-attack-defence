#!/usr/bin/env node
'use strict'

const { test, describe } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')

const {
  findFiles,
  extractUrls,
  loadKnownDeadUrls,
  main,
  setImpls,
  resetImpls,
  URL_RE,
} = require(path.resolve(__dirname, './check-external-urls.js'))

function makeTempDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ext-url-test-'))
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true })
}

describe('check-external-urls', () => {
  test('URL_RE matches common https URLs', () => {
    const matches = Array.from(
      'See https://example.com/path?q=1'.matchAll(URL_RE),
    ).map((m) => m[0])
    assert.deepEqual(matches, ['https://example.com/path?q=1'])
  })

  test('findFiles ignores configured directories', () => {
    const tmpDir = makeTempDir()
    try {
      fs.mkdirSync(path.join(tmpDir, 'node_modules'))
      fs.writeFileSync(
        path.join(tmpDir, 'node_modules', 'a.md'),
        'https://example.com\n',
      )
      fs.writeFileSync(path.join(tmpDir, 'readme.md'), 'https://example.com\n')

      setImpls({ fs })
      const files = findFiles(tmpDir, ['.md'])
      assert.equal(files.length, 1)
      assert.ok(files[0].endsWith('readme.md'))
    } finally {
      resetImpls()
      cleanup(tmpDir)
    }
  })

  test('extractUrls skips URLs marked as illustrative', () => {
    const content = `> The URLs below are illustrative examples.
\`\`\`
https://example.com/fake
\`\`\`
See https://example.com/real for details.`

    const urls = extractUrls(content, 'doc.md')
    assert.equal(urls.has('https://example.com/fake'), false)
    assert.equal(urls.has('https://example.com/real'), true)
  })

  test('extractUrls collects URLs with file provenance', () => {
    const content =
      'Visit https://nodejs.org/api/fs.html and https://biomejs.dev/'
    const urls = extractUrls(content, 'doc.md')
    assert.equal(urls.has('https://nodejs.org/api/fs.html'), true)
    assert.equal(urls.has('https://biomejs.dev/'), true)
    assert.ok(urls.get('https://nodejs.org/api/fs.html').files.has('doc.md'))
  })

  test('loadKnownDeadUrls reads URLs from known-dead-urls.md', () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    try {
      const knownDir = path.join(tmpDir, '.github')
      const knownPath = path.join(knownDir, 'known-dead-urls.md')
      fs.mkdirSync(knownDir, { recursive: true })
      fs.writeFileSync(
        knownPath,
        '# Known-Dead URLs\n\n### `https://code.visualstudio.com/schemas/hooks`\n\n- kept as history\n',
      )

      process.chdir(tmpDir)
      setImpls({ fs })

      const dead = loadKnownDeadUrls()
      assert.ok(dead.has('https://code.visualstudio.com/schemas/hooks'))
    } finally {
      resetImpls()
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('main returns 0 when all URLs are reachable', async () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'doc.md'),
        '[ok](https://example.com)\n',
      )

      process.chdir(tmpDir)
      setImpls({
        fs,
        fetchBuffer: async () => ({ ok: true, statusCode: 200 }),
      })

      const code = await main()
      assert.equal(code, 0)
    } finally {
      resetImpls()
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('main returns 1 when a URL is broken', async () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    try {
      fs.writeFileSync(
        path.join(tmpDir, 'doc.md'),
        '[broken](https://example.com/missing)\n',
      )

      process.chdir(tmpDir)
      setImpls({
        fs,
        fetchBuffer: async () => {
          const err = new Error('HTTP 404')
          err.statusCode = 404
          throw err
        },
      })

      const code = await main()
      assert.equal(code, 1)
    } finally {
      resetImpls()
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })

  test('main returns 0 for known-dead URL', async () => {
    const tmpDir = makeTempDir()
    const origCwd = process.cwd()
    try {
      fs.mkdirSync(path.join(tmpDir, '.github'), { recursive: true })
      fs.writeFileSync(
        path.join(tmpDir, '.github', 'known-dead-urls.md'),
        '# Known-Dead URLs\n\n### `https://code.visualstudio.com/schemas/hooks`\n\n- kept\n',
      )
      fs.writeFileSync(
        path.join(tmpDir, 'doc.md'),
        'See `https://code.visualstudio.com/schemas/hooks`.\n',
      )

      process.chdir(tmpDir)
      setImpls({
        fs,
        fetchBuffer: async () => {
          const err = new Error('HTTP 404')
          err.statusCode = 404
          throw err
        },
      })

      const code = await main()
      assert.equal(code, 0)
    } finally {
      resetImpls()
      process.chdir(origCwd)
      cleanup(tmpDir)
    }
  })
})
