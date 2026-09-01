#!/usr/bin/env node
'use strict'

const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const {
  scanFile,
  scanFiles,
  readIgnoreFile,
  buildIgnoreRegex,
  setFsImpl,
  resetFsImpl,
} = require(path.resolve(__dirname, './check-secrets.js'))

function makeMockFs(files) {
  return {
    readFileSync: (p) => {
      const key = path.resolve(p)
      if (files.has(key)) {
        const content = files.get(key)
        if (content === undefined) {
          throw new Error(`ENOENT: ${p}`)
        }
        return content
      }
      throw new Error(`ENOENT: ${p}`)
    },
    statSync: (p) => {
      const key = path.resolve(p)
      if (files.has(key) && files.get(key) !== undefined) {
        return {
          isFile: () => true,
          isDirectory: () => false,
        }
      }
      throw new Error(`ENOENT: ${p}`)
    },
  }
}

describe('check-secrets', () => {
  beforeEach(() => {
    resetFsImpl()
  })

  afterEach(() => {
    resetFsImpl()
  })

  function withMockFile(content, testFn) {
    const filePath = '/tmp/check-secrets-test.txt'
    setFsImpl(makeMockFs(new Map([[path.resolve(filePath), content]])))
    return testFn(filePath)
  }

  test('detects AWS access key', () => {
    const findings = withMockFile('key = AKIAIOSFODNN7EXAMPLE\n', (filePath) =>
      scanFile(filePath, null),
    )
    assert.equal(findings.length, 1)
    assert.equal(findings[0].pattern, 'AWS access key ID')
  })

  test('detects GitHub personal access token', () => {
    const findings = withMockFile(
      'token = ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n',
      (filePath) => scanFile(filePath, null),
    )
    assert.equal(findings.length, 1)
    assert.equal(findings[0].pattern, 'GitHub personal access token')
  })

  test('detects npm token', () => {
    const findings = withMockFile(
      'token = npm_0123456789abcdef0123456789abcdef0123\n',
      (filePath) => scanFile(filePath, null),
    )
    assert.equal(findings.length, 1)
    assert.equal(findings[0].pattern, 'npm access token')
  })

  test('detects private key block', () => {
    const findings = withMockFile(
      '-----BEGIN RSA PRIVATE KEY-----\n',
      (filePath) => scanFile(filePath, null),
    )
    assert.equal(findings.length, 1)
    assert.equal(findings[0].pattern, 'private key block')
  })

  test('detects URL with embedded credentials', () => {
    const findings = withMockFile(
      'url = https://user:pass@example.com/repo.git\n',
      (filePath) => scanFile(filePath, null),
    )
    assert.equal(findings.length, 1)
    assert.equal(findings[0].pattern, 'URL with embedded credentials')
  })

  test('ignores benign content', () => {
    const findings = withMockFile(
      'hello world\nthis is a normal line\n',
      (filePath) => scanFile(filePath, null),
    )
    assert.equal(findings.length, 0)
  })

  test('skips binary files', () => {
    const findings = withMockFile(
      Buffer.from([0x00, 0x01, 0x02, 0x03]),
      (filePath) => scanFile(filePath, null),
    )
    assert.equal(findings.length, 0)
  })

  test('scanFiles only processes existing files', () => {
    setFsImpl(
      makeMockFs(
        new Map([
          [path.resolve('/tmp/aws.txt'), 'AKIAIOSFODNN7EXAMPLE'],
          [path.resolve('/tmp/missing.txt'), undefined],
        ]),
      ),
    )
    const findings = scanFiles(['/tmp/aws.txt', '/tmp/missing.txt'], null)
    assert.equal(findings.length, 1)
    assert.equal(findings[0].pattern, 'AWS access key ID')
  })

  test('readIgnoreFile parses patterns and comments', () => {
    setFsImpl(
      makeMockFs(
        new Map([
          [
            path.resolve('/tmp/.check-secrets-ignore'),
            '# ignore test fixtures\nAKIAIOSFODNN7EXAMPLE\n\nghp_ignored\n',
          ],
        ]),
      ),
    )
    const patterns = readIgnoreFile('/tmp/.check-secrets-ignore')
    assert.deepEqual(patterns, ['AKIAIOSFODNN7EXAMPLE', 'ghp_ignored'])
  })

  test('buildIgnoreRegex matches ignore patterns', () => {
    const regex = buildIgnoreRegex(['AKIAIOSFODNN7EXAMPLE'])
    assert.ok(regex.test('AKIAIOSFODNN7EXAMPLE'))
    assert.ok(!regex.test('AKIAIOSFODNN7EXAMPLX'))
  })

  test('ignored patterns suppress findings on matching lines', () => {
    const content = 'key = AKIAIOSFODNN7EXAMPLE # example key'
    setFsImpl(
      makeMockFs(new Map([[path.resolve('/tmp/ignored.txt'), content]])),
    )
    const findings = scanFiles(['/tmp/ignored.txt'], /AKIAIOSFODNN7EXAMPLE/)
    assert.equal(findings.length, 0)
  })

  test('reports line numbers', () => {
    const lines = ['line 1', 'key = AKIAIOSFODNN7EXAMPLE']
    const filePath = '/tmp/check-secrets-lines.txt'
    setFsImpl(makeMockFs(new Map([[path.resolve(filePath), lines.join('\n')]])))
    const findings = scanFiles([filePath], null)
    assert.equal(findings.length, 1)
    assert.equal(findings[0].line, 2)
  })

  test('handles zero-length matches safely', () => {
    const filePath = '/tmp/check-secrets-empty.txt'
    setFsImpl(makeMockFs(new Map([[path.resolve(filePath), 'hello world']])))
    const findings = scanFiles([filePath], null)
    assert.equal(findings.length, 0)
  })
})
