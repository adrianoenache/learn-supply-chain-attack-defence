#!/usr/bin/env node
'use strict'

// Defense Layer 6 support — npm configuration surface validation.
//
// Validates the project's `.npmrc` so that configuration drift cannot
// silently weaken (or pretend to strengthen) the supply-chain defenses:
//
//   1. Every key must be a recognized npm config key (curated list below) or
//      an explicitly registered "lookahead" key with a documented
//      justification. npm >= 11.2 only *warns* about unknown keys and npm v12
//      can hard-fail on them (strict-npmrc), so an unnoticed typo today
//      becomes a broken install tomorrow — or worse, a false sense of
//      security when the comment promises behavior npm does not implement.
//   2. Sensitive keys must keep their defensive values (e.g.
//      `ignore-scripts=false` or `strict-ssl=false` are rejected).
//   3. The npm v12 root-owned extension mechanism is flagged: an
//      `extension-file` key or an auto-discovered `.npm-extension.mjs`/`.cjs`
//      at the project root executes code during install. `ignore-scripts`
//      implies `ignore-extension`, but tooling written before the feature
//      existed does not know to look for the file — this check closes that
//      blind spot (Fase L.2).
//
// Usage:
//   node ./tools/check-npmrc.js [--silent] [--format json]
//
// Exit codes:
//   0 — configuration surface is valid.
//   1 — unknown/unsafe key, forbidden extension file, or missing .npmrc.

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const NPMRC_PATH = path.join(REPO_ROOT, '.npmrc')

// Curated subset of the npm v11/v12 documented config keys
// (https://docs.npmjs.com/cli/v12/configuring-npm/npmrc), covering the keys
// this project uses plus the security-relevant ones an adopter may plausibly
// add. Intentionally hardcoded: the list IS the policy — adding a key requires
// a deliberate edit here, which is exactly the review friction we want.
// Extend when adopting a new documented key.
const KNOWN_KEYS = new Set([
  'save-exact',
  'package-lock',
  'registry',
  'fund',
  'audit',
  'audit-level',
  'ignore-scripts',
  'engine-strict',
  'min-release-age',
  'min-release-age-exclude',
  'fetch-retries',
  'fetch-retry-mintimeout',
  'fetch-retry-maxtimeout',
  'fetch-timeout',
  'maxsockets',
  'strict-ssl',
  'provenance',
  'include-attestations',
  'sbom-format',
  'sbom-type',
  'strict-npmrc',
  'allow-scripts',
  'allow-scripts-pending',
  'allow-scripts-pin',
  'strict-allow-scripts',
  'dangerously-allow-all-scripts',
  'allow-git',
  'allow-remote',
  'allow-directory',
  'allow-file',
  'replace-registry-host',
  'omit-lockfile-registry-resolved',
  'ignore-extension',
  'extension-file',
  'ca',
  'cafile',
  'cache',
  'loglevel',
])

// Keys intentionally kept even though the pinned npm does not recognize them
// ("lookahead" strategy, documented in docs/{en,pt-BR}/npmrc-hardening.md).
// Each entry must carry the justification so future readers know the warning
// is expected. NOTE: enabling npm v12 `strict-npmrc` requires removing these.
const LOOKAHEAD_KEYS = new Map([
  [
    'npm-audit-fix-level',
    'Restricts npm audit fix to high/critical fixes once npm supports it; ignored (with a warning) by npm 11.x.',
  ],
  [
    'send-metrics',
    'Explicit telemetry opt-out kept for future npm releases; ignored (with a warning) by npm 11.x.',
  ],
])

// Keys whose defensive value must not be weakened. Value comparison is
// case-insensitive; npm treats 'false'/'0' as disabling.
const FORBIDDEN_VALUES = new Map([
  [
    'ignore-scripts',
    {
      forbidden: 'false',
      reason: 'disables the lifecycle-script block (Defense Layer 6)',
    },
  ],
  [
    'strict-ssl',
    {
      forbidden: 'false',
      reason: 'disables TLS verification, enabling registry MitM',
    },
  ],
  [
    'engine-strict',
    { forbidden: 'false', reason: 'lets installs run on unsupported runtimes' },
  ],
  [
    'dangerously-allow-all-scripts',
    { forbidden: 'true', reason: 'bypasses the entire allowScripts policy' },
  ],
])

const EXTENSION_FILES = ['.npm-extension.mjs', '.npm-extension.cjs']

let readFileImpl = (p) => fs.readFileSync(p, 'utf8')
let existsImpl = (p) => fs.existsSync(p)
let exitImpl = process.exit
let logImpl = console.log
let errorImpl = console.error

function setImpls(impls) {
  if (impls.readFile) readFileImpl = impls.readFile
  if (impls.exists) existsImpl = impls.exists
  if (impls.exit) exitImpl = impls.exit
  if (impls.log) logImpl = impls.log
  if (impls.error) errorImpl = impls.error
}

function resetImpls() {
  readFileImpl = (p) => fs.readFileSync(p, 'utf8')
  existsImpl = (p) => fs.existsSync(p)
  exitImpl = process.exit
  logImpl = console.log
  errorImpl = console.error
}

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    isSilent: argv.includes('--silent'),
    format: argv.includes('--format')
      ? argv[argv.indexOf('--format') + 1]
      : 'text',
  }
}

// Parses .npmrc content into { key, value, line } entries. Comments (#/;) and
// blank lines are skipped; array-style keys (`key[]=value`) are normalized to
// their base key for lookup.
function parseNpmrc(content) {
  const entries = []
  content.split('\n').forEach((rawLine, index) => {
    const line = rawLine.trim()
    if (!line || line.startsWith('#') || line.startsWith(';')) return
    const eq = line.indexOf('=')
    if (eq === -1) return
    const key = line.slice(0, eq).trim().replace(/\[\]$/, '')
    const value = line.slice(eq + 1).trim()
    entries.push({ key, value, line: index + 1 })
  })
  return entries
}

function evaluate(entries, extensionFilesPresent) {
  const problems = []
  const lookahead = []

  for (const { key, value, line } of entries) {
    if (LOOKAHEAD_KEYS.has(key)) {
      lookahead.push({ key, line, justification: LOOKAHEAD_KEYS.get(key) })
      continue
    }
    if (!KNOWN_KEYS.has(key)) {
      problems.push({
        line,
        key,
        reason:
          'unknown npm config key — npm only warns today and npm v12 can hard-fail (strict-npmrc). ' +
          'If the key is documented, add it to KNOWN_KEYS in tools/check-npmrc.js; if it is a ' +
          'deliberate lookahead setting, register it in LOOKAHEAD_KEYS with a justification; ' +
          'otherwise remove it.',
      })
      continue
    }
    const rule = FORBIDDEN_VALUES.get(key)
    if (rule && value.toLowerCase() === rule.forbidden) {
      problems.push({ line, key, reason: `${key}=${value} ${rule.reason}.` })
    }
    if (key === 'extension-file') {
      problems.push({
        line,
        key,
        reason:
          'extension-file points at root-owned code npm executes during install (npm v12). ' +
          'This project does not use the extension mechanism; remove the key. ' +
          'ignore-scripts=true already implies ignore-extension.',
      })
    }
  }

  for (const file of extensionFilesPresent) {
    problems.push({
      line: null,
      key: file,
      reason:
        `${file} is auto-discovered and executed by npm during install (npm v12 ` +
        'extension mechanism). Tooling that only inspects lifecycle scripts does not see it. ' +
        'Remove the file, or document an explicit justification if the mechanism is ever adopted.',
    })
  }

  return { problems, lookahead }
}

function main(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv)

  if (!existsImpl(NPMRC_PATH)) {
    errorImpl(
      '.npmrc not found at the project root. Defense Layer 6 requires it — restore it or reinstall the defences.',
    )
    return exitImpl(1)
  }

  const entries = parseNpmrc(readFileImpl(NPMRC_PATH))
  const extensionFilesPresent = EXTENSION_FILES.filter((f) =>
    existsImpl(path.join(REPO_ROOT, f)),
  )
  const { problems, lookahead } = evaluate(entries, extensionFilesPresent)

  if (args.format === 'json') {
    logImpl(
      JSON.stringify(
        {
          keysChecked: entries.length,
          lookahead: lookahead.map((l) => l.key),
          problems,
        },
        null,
        2,
      ),
    )
  } else if (!args.isSilent) {
    logImpl(
      `npm configuration surface: ${entries.length} key(s) checked, ${lookahead.length} lookahead (documented), ${problems.length} problem(s).`,
    )
    for (const item of lookahead) {
      logImpl(`  LOOKAHEAD  ${item.key} — ${item.justification}`)
    }
    for (const problem of problems) {
      const where = problem.line ? `.npmrc:${problem.line}` : 'filesystem'
      errorImpl(`  PROBLEM    ${where} [${problem.key}]: ${problem.reason}`)
    }
  }

  if (problems.length > 0) {
    errorImpl('\nnpm configuration surface check FAILED.')
    return exitImpl(1)
  }
  if (!args.isSilent && args.format !== 'json') {
    logImpl('npm configuration surface is valid.')
  }
  return exitImpl(0)
}

if (require.main === module) {
  try {
    main()
  } catch (err) {
    errorImpl(`\ncheck-npmrc failed: ${err.message}`)
    process.exit(1)
  }
}

module.exports = {
  main,
  parseNpmrc,
  evaluate,
  setImpls,
  resetImpls,
  KNOWN_KEYS,
  LOOKAHEAD_KEYS,
}
