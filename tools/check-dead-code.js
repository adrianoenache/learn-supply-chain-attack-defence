#!/usr/bin/env node
'use strict'

// Dead-code candidate finder for the defence toolset (Fase AI-4.2, review
// axis 3: dead code removal).
//
// Why it exists: dead exports accumulate silently in a teaching codebase and
// mislead learners into studying APIs nothing consumes. This tool produces a
// *candidate list* — deliberately advisory, never a hard gate — because
// static analysis of CommonJS cannot prove unreachability (DI contracts like
// setImpls/resetImpls are consumed by tests through indirection, and CLI
// entry points are invoked by npm scripts, not by require). The AI/human
// reviewer applies the final judgement; the tool removes the search cost.
//
// What it does:
//   1. Collects production files (tools/*.js, tools/lib/*.js, tools/perf/*.js,
//      excluding tests and the repo-local e2e harness).
//   2. Extracts each file's exports (module.exports object keys and
//      module.exports.<name> assignments).
//   3. Builds the consumer graph: destructured requires, namespace requires
//      with member access (ns.name), and opaque requires (side-effect or
//      fully dynamic — conservatively mark all exports as used).
//   4. Reports exports never referenced by any consumer and files never
//      required nor referenced as CLI entry points in package.json scripts.
//
// Usage:
//   node ./tools/check-dead-code.js [--silent] [--format json]
//
// Exit codes:
//   0 — always (advisory by design; see DECISIONS.md). Promotion to a hard
//       gate requires a clean baseline triage first.

const fs = require('node:fs')
const path = require('node:path')

const REPO_ROOT = path.resolve(__dirname, '..')
const TOOLS_DIR = path.resolve(__dirname)
const PACKAGE_JSON = path.join(REPO_ROOT, 'package.json')

// The e2e harness is repo-local development tooling (fixtures reference the
// local registry cache) and is excluded from adoption — same rationale as
// EXCLUDED_FROM_ADOPTION in install-defences.js.
const EXCLUDED_DIRS = new Set(['e2e'])

let readFileImpl = (p) => fs.readFileSync(p, 'utf8')
let listFilesImpl = defaultListFiles
let exitImpl = process.exit
let logImpl = console.log

function setImpls(impls) {
  if (impls.readFile) readFileImpl = impls.readFile
  if (impls.listFiles) listFilesImpl = impls.listFiles
  if (impls.exit) exitImpl = impls.exit
  if (impls.log) logImpl = impls.log
}

function resetImpls() {
  readFileImpl = (p) => fs.readFileSync(p, 'utf8')
  listFilesImpl = defaultListFiles
  exitImpl = process.exit
  logImpl = console.log
}

function defaultListFiles() {
  const result = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) walk(full)
      } else if (entry.name.endsWith('.js')) {
        result.push(full)
      }
    }
  }
  walk(TOOLS_DIR)
  return result
}

function parseCliArgs(argv = process.argv.slice(2)) {
  return {
    isSilent: argv.includes('--silent'),
    format: argv.includes('--format')
      ? argv[argv.indexOf('--format') + 1]
      : 'text',
  }
}

function isProductionFile(relativePath) {
  return !relativePath.endsWith('.test.js')
}

function extractExports(source) {
  const names = new Set()
  // Comment-only lines are stripped first: header comments that show example
  // `module.exports` snippets (like this file's own) must not be parsed.
  const code = source
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('//'))
    .join('\n')
  // module.exports = { a, b: fn, get c() {}, set c(v) {}, ... }
  // The object block ends at the closing brace at line start; accessor
  // bodies are indented, so they never terminate it early.
  const objectMatch = code.match(/module\.exports\s*=\s*\{([\s\S]*?)\n\}/)
  if (objectMatch) {
    for (const line of objectMatch[1].split('\n')) {
      // get/set accessors: the exported name follows the keyword.
      const accessor = /^\s*(?:get|set)\s+([a-zA-Z_$][\w$]*)\s*\(/.exec(line)
      if (accessor) {
        names.add(accessor[1])
        continue
      }
      // Shorthand (`a,`) or keyed (`b: fn,`) properties only — statement
      // lines inside accessor bodies (`return impl.x`) match neither.
      const prop = /^\s*([a-zA-Z_$][\w$]*)\s*[,:]/.exec(line)
      if (prop) names.add(prop[1])
    }
  }
  // module.exports.foo = ...
  for (const m of code.matchAll(/module\.exports\.([a-zA-Z_$][\w$]*)\s*=/g)) {
    names.add(m[1])
  }
  return [...names]
}

// Resolves a require specifier to an absolute file path within tools/, or
// null when it points elsewhere (node:, npm packages). Both './lib/x.js' and
// the prefix-less 'x.js' form (common in path.resolve(__dirname, 'x.js')
// aliases) are treated as relative; bare package names never end in .js.
function resolveRequire(fromFile, specifier) {
  if (!specifier.startsWith('.') && !specifier.endsWith('.js')) return null
  const resolved = path.resolve(path.dirname(fromFile), specifier)
  return resolved.endsWith('.js') ? resolved : null
}

// Extracts the specifier from both require styles used in this codebase:
//   require('./lib/x.js')
//   require(path.resolve(__dirname, './lib/x.js'))   // possibly multi-line
function extractSpecifier(callText) {
  const m =
    /require\(\s*(?:path\.resolve\(\s*__dirname\s*,\s*)?['"]([^'"]+)['"]/.exec(
      callText,
    )
  return m ? m[1] : null
}

// Resolves the argument of a require(...) call: a literal (optionally wrapped
// in path.resolve(__dirname, ...)) or a declared constant alias holding one
// (the test-harness SCRIPT_PATH pattern).
function resolveSpecifier(callText, aliases) {
  const literal = extractSpecifier(callText)
  if (literal) return literal
  const identifier = /require\(\s*([a-zA-Z_$][\w$]*)\s*\)/.exec(callText)
  if (identifier && aliases.has(identifier[1]))
    return aliases.get(identifier[1])
  return null
}

// Splits consumers into per-target usage: which exports of each target file
// each other file references.
//
// Recognized consumer shapes, strongest first:
//   1. const { a, b: c } = require('<literal>' | path.resolve(__dirname, ...))
//   2. const ns = require(...) + ns.<member> accesses
//   3. require(<alias>) where the alias is a declared path.resolve constant
//      (the test harness pattern: SCRIPT_PATH + readScriptExports) — the
//      binding flows through a function, so usage falls back to word-presence
//      of each export name in the consumer file ("textual usage")
//   4. require('<unresolvable>') or bare side-effect require — opaque:
//      conservatively assume all exports are used
// The ladder deliberately prefers false negatives over false positives: a
// missed dead export costs nothing, a false positive could delete live code
// from a learning resource.
function buildUsage(allFiles) {
  // targetPath -> { destructured, namespaces, textual: Set<file>, opaque }
  const usage = new Map()
  const ensure = (target) => {
    if (!usage.has(target)) {
      usage.set(target, {
        destructured: new Set(),
        namespaces: new Map(),
        textual: new Set(),
        opaque: false,
      })
    }
    return usage.get(target)
  }

  for (const file of allFiles) {
    const source = readFileImpl(file)

    // Constant aliases: const SCRIPT_PATH = path.resolve(__dirname, './x.js')
    // First declaration wins: a real redeclaration would be a syntax error,
    // so a later match is necessarily embedded source (a string fixture) and
    // must not steal the alias (found via this tool's own test file, which
    // embeds fixture code that redeclares SCRIPT_PATH).
    const aliases = new Map()
    for (const m of source.matchAll(
      /const\s+([a-zA-Z_$][\w$]*)\s*=\s*path\.resolve\(\s*__dirname\s*,\s*['"]([^'"]+)['"]\s*\)/g,
    )) {
      if (!aliases.has(m[1])) aliases.set(m[1], m[2])
    }

    // const { a, b: c } = require(...) — destructured consumers.
    for (const m of source.matchAll(
      /const\s*\{([^}]*)\}\s*=\s*(require\([^)]*\))/gs,
    )) {
      const specifier = resolveSpecifier(m[2], aliases)
      const target = specifier && resolveRequire(file, specifier)
      if (!target) continue
      const entry = ensure(target)
      for (const part of m[1].split(',')) {
        const name = part.trim().split(':')[0].trim()
        if (name) entry.destructured.add(name)
      }
    }

    // const x = require(...) — namespace binding; track x.<member> accesses.
    for (const m of source.matchAll(
      /const\s+([a-zA-Z_$][\w$]*)\s*=\s*(require\([^)]*\))/gs,
    )) {
      const specifier = resolveSpecifier(m[2], aliases)
      const target = specifier && resolveRequire(file, specifier)
      if (!target) continue
      const entry = ensure(target)
      const varName = m[1]
      if (!entry.namespaces.has(varName))
        entry.namespaces.set(varName, new Set())
      for (const access of source.matchAll(
        new RegExp(`\\b${varName}\\.([a-zA-Z_$][\\w$]*)`, 'g'),
      )) {
        entry.namespaces.get(varName).add(access[1])
      }
    }

    // Direct member access on the require result, in any layout:
    //   require('./x.js').member(...)
    //   const x = require(\n  path.resolve(__dirname, './x.js'),\n).member(...)
    // Tracked before the remaining loop so those calls are not reclassified
    // as opaque/alias usage.
    const directAccessIndexes = new Set()
    for (const m of source.matchAll(
      /require\(\s*(?:(?:path\.resolve\(\s*__dirname\s*,\s*)?['"]([^'"]+)['"]|([a-zA-Z_$][\w$]*))[\s,)]*\)\s*(?:\?\.)?\.\s*([a-zA-Z_$][\w$]*)/gs,
    )) {
      const specifier = m[1] ?? aliases.get(m[2])
      const member = m[3]
      if (!specifier || !member) continue
      const target = resolveRequire(file, specifier)
      if (!target) continue
      ensure(target).destructured.add(member)
      directAccessIndexes.add(m.index)
    }

    // Remaining require calls: resolve via literals or declared aliases.
    // Also captures immediate member access on the require result —
    // require('./lib/x.js').member(...) — a real consumption pattern in this
    // codebase (its absence produced a false "dead export" that broke tests
    // when acted upon).
    for (const m of source.matchAll(
      /require\(\s*([a-zA-Z_$][\w$]*|(?:path\.resolve\(\s*__dirname\s*,\s*)?['"][^'"]+['"])(\)\s*(?:\?\.)?\.\s*([a-zA-Z_$][\w$]*))?/gs,
    )) {
      if (directAccessIndexes.has(m.index)) continue
      const raw = m[1]
      const viaAlias =
        !raw.startsWith("'") &&
        !raw.startsWith('"') &&
        !raw.startsWith('path.resolve')
      const specifier = viaAlias ? aliases.get(raw) : extractSpecifier(m[0])
      if (!specifier) continue
      const target = resolveRequire(file, specifier)
      if (!target) continue
      const entry = ensure(target)
      const isClassified = /const\s*(\{[^}]*\}|[a-zA-Z_$][\w$]*)\s*=\s*$/s.test(
        source.slice(0, m.index),
      )
      if (isClassified) continue
      if (m[3]) {
        // require(...) followed by .member — direct usage of that export.
        entry.destructured.add(m[3])
      } else if (viaAlias) {
        // Alias require (test harness): the binding flows through a helper
        // function, so usage falls back to word-presence per export name.
        entry.textual.add(file)
      } else {
        // Bare side-effect require of a literal: no binding exists, so
        // nothing can be proven — conservatively mark all exports used.
        entry.opaque = true
      }
    }
  }
  return usage
}

function analyze(files) {
  const prodFiles = files.filter((f) =>
    isProductionFile(path.relative(REPO_ROOT, f)),
  )
  const pkg = JSON.parse(readFileImpl(PACKAGE_JSON))
  const scriptText = Object.values(pkg.scripts ?? {}).join('\n')

  const usage = buildUsage(files)
  const deadExports = []
  const orphanFiles = []

  for (const file of prodFiles) {
    const relative = path.relative(REPO_ROOT, file)
    const exports = extractExports(readFileImpl(file))
    const consumers = usage.get(file)
    const isCliEntry = scriptText.includes(relative)

    if (!consumers && !isCliEntry && exports.length > 0) {
      orphanFiles.push(relative)
      continue
    }

    const used = new Set(consumers ? consumers.destructured : [])
    if (consumers) {
      for (const members of consumers.namespaces.values()) {
        for (const member of members) used.add(member)
      }
      // Textual usage: alias-required modules whose binding flows through a
      // helper (test harness pattern) count an export as used when its name
      // appears as a word in the consumer file.
      for (const consumerFile of consumers.textual) {
        const consumerSource = readFileImpl(consumerFile)
        for (const name of exports) {
          if (new RegExp(`\\b${name}\\b`).test(consumerSource)) used.add(name)
        }
      }
    }
    const unused = consumers?.opaque
      ? []
      : exports.filter((name) => !used.has(name))
    if (unused.length > 0 && (consumers || isCliEntry)) {
      deadExports.push({ file: relative, exports: unused })
    }
  }
  return { deadExports, orphanFiles }
}

function main(argv = process.argv.slice(2)) {
  const args = parseCliArgs(argv)
  const files = listFilesImpl()
  const { deadExports, orphanFiles } = analyze(files)

  const candidateCount =
    deadExports.reduce((sum, d) => sum + d.exports.length, 0) +
    orphanFiles.length

  if (args.format === 'json') {
    logImpl(JSON.stringify({ deadExports, orphanFiles }, null, 2))
    return exitImpl(0)
  }

  if (!args.isSilent) {
    if (candidateCount === 0) {
      logImpl('Dead-code scan: no candidates found.')
    } else {
      logImpl(
        `Dead-code scan: ${candidateCount} candidate(s) — review required (advisory, never a hard gate).`,
      )
      for (const { file, exports } of deadExports) {
        logImpl(`  ${file}: unreferenced export(s): ${exports.join(', ')}`)
      }
      for (const file of orphanFiles) {
        logImpl(`  ${file}: never required and not an npm script entry point`)
      }
      logImpl(
        '  Note: DI-contract exports (setImpls/resetImpls and friends) may be consumed through indirection — confirm before removing.',
      )
    }
  }
  return exitImpl(0)
}

if (require.main === module) {
  try {
    main()
  } catch (err) {
    console.error(`\ncheck-dead-code failed: ${err.message}`)
    process.exit(1)
  }
}

module.exports = {
  main,
  parseCliArgs,
  extractExports,
  analyze,
  setImpls,
  resetImpls,
}
