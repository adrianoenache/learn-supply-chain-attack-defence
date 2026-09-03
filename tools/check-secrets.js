#!/usr/bin/env node
'use strict'

// Scans files for likely secrets before they are committed.
// Uses only native Node.js modules and regex patterns; no third-party scanners.
//
// Usage:
//   node ./tools/check-secrets.js [file1 file2 ...]
//   git diff --cached --name-only | xargs node ./tools/check-secrets.js
//
// Exit codes:
//   0 — no secrets detected
//   1 — one or more potential secrets found, or invalid input

const fs = require('node:fs')
const path = require('node:path')

const DEFAULT_IGNORE_FILE = '.check-secrets-ignore'
const MIN_SECRET_LENGTH = 10

// Patterns that commonly indicate secrets. Each entry has a name and a RegExp.
// We avoid overly broad patterns to keep false positives manageable.
const PATTERNS = [
  {
    name: 'AWS access key ID',
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
  },
  {
    name: 'AWS secret access key',
    regex: /(?:AWS|aws|Aws)[^\r\n]{0,50}\b[A-Za-z0-9/+=]{40}\b/g,
  },
  {
    name: 'GitHub personal access token',
    regex: /\bghp_[A-Za-z0-9_]{36}\b/g,
  },
  {
    name: 'GitHub OAuth app token',
    regex: /\bgho_[A-Za-z0-9_]{36}\b/g,
  },
  {
    name: 'GitHub user-to-server token',
    regex: /\bghu_[A-Za-z0-9_]{36}\b/g,
  },
  {
    name: 'GitHub server-to-server token',
    regex: /\bghs_[A-Za-z0-9_]{36}\b/g,
  },
  {
    name: 'GitHub refresh token',
    regex: /\bghr_[A-Za-z0-9_]{36}\b/g,
  },
  {
    name: 'npm access token',
    regex: /\bnpm_[a-zA-Z0-9]{36}\b/g,
  },
  {
    name: 'private key block',
    regex: /-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/g,
  },
  {
    name: 'URL with embedded credentials',
    regex: /[a-z][a-z0-9+.-]*:\/\/[^\s:@]+:[^\s@]+@[a-zA-Z0-9.-]+/g,
  },
]

let fsImpl = fs

function setFsImpl(fn) {
  fsImpl = fn
}

function resetFsImpl() {
  fsImpl = fs
}

function readIgnoreFile(ignorePath) {
  try {
    const content = fsImpl.readFileSync(ignorePath, 'utf8')
    return content
      .split('\n')
      .map((line) => line.split('#')[0].trim())
      .filter((line) => line.length > 0)
  } catch {
    return []
  }
}

function buildIgnoreRegex(ignorePatterns) {
  if (ignorePatterns.length === 0) return null
  const escaped = ignorePatterns.map((p) =>
    p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
  )
  return new RegExp(`(${escaped.join('|')})`)
}

function isBinaryBuffer(buffer) {
  if (!Buffer.isBuffer(buffer)) return false
  // Treat files as binary if they contain a null byte in the first 8 KB.
  const sample = buffer.slice(0, 8192)
  for (let i = 0; i < sample.length; i++) {
    if (sample[i] === 0x00) return true
  }
  return false
}

function scanFile(filePath, ignoreRegex) {
  const findings = []
  let content
  try {
    content = fsImpl.readFileSync(filePath)
  } catch (err) {
    throw new Error(`cannot read ${filePath}: ${err.message}`)
  }

  if (isBinaryBuffer(content)) return findings

  const text = content.toString('utf8')
  const lines = text.split('\n')

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    if (ignoreRegex?.test(line)) continue

    for (const { name, regex } of PATTERNS) {
      const matches = line.matchAll(regex)
      for (const match of matches) {
        const value = match[0]
        if (value.length >= MIN_SECRET_LENGTH) {
          findings.push({
            file: filePath,
            line: lineIndex + 1,
            pattern: name,
            value,
          })
        }
      }
    }
  }

  return findings
}

function scanFiles(filePaths, ignoreRegex) {
  const findings = []
  for (const filePath of filePaths) {
    const absolute = path.resolve(filePath)
    let stat
    try {
      stat = fsImpl.statSync(absolute)
    } catch {
      continue
    }
    if (!stat || typeof stat.isFile !== 'function' || !stat.isFile()) continue
    findings.push(...scanFile(absolute, ignoreRegex))
  }
  return findings
}

function main(argv = process.argv.slice(2)) {
  if (argv.length === 0) {
    console.error('Usage: node ./tools/check-secrets.js <file1> [file2 ...]')
    return 1
  }

  const ignorePath = path.resolve(process.cwd(), DEFAULT_IGNORE_FILE)
  const ignorePatterns = readIgnoreFile(ignorePath)
  const ignoreRegex = buildIgnoreRegex(ignorePatterns)

  const findings = scanFiles(argv, ignoreRegex)

  if (findings.length === 0) {
    console.log(`No secrets detected in ${argv.length} file(s).`)
    return 0
  }

  console.error('Potential secrets detected:')
  for (const finding of findings) {
    console.error(
      `  ${finding.file}:${finding.line} — ${finding.pattern}: ${finding.value}`,
    )
  }
  console.error(
    '\nIf these are false positives, add an ignore pattern to .check-secrets-ignore',
  )
  return 1
}

module.exports = {
  scanFile,
  scanFiles,
  readIgnoreFile,
  buildIgnoreRegex,
  main,
  setFsImpl,
  resetFsImpl,
  PATTERNS,
}

if (require.main === module) {
  process.exit(main())
}
