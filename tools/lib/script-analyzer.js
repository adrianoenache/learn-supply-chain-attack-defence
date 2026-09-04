#!/usr/bin/env node
'use strict'

// Static analyzer for npm package lifecycle scripts.
//
// Scans the `scripts` section of a package manifest for lifecycle hooks such as
// `preinstall`, `install`, `postinstall`, `prepare`, etc., and flags common
// patterns that increase supply-chain risk (network calls, shell execution,
// dynamic code evaluation, environment exfiltration, filesystem writes outside
// the package directory, permission changes, and native-addon compilation).
//
// This is a defense-in-depth layer: the project already blocks lifecycle
// scripts via `ignore-scripts=true` in `.npmrc`, so this analyzer helps the
// contributor understand *what* would run if scripts were enabled, and decide
// whether a manual rebuild step is safe.
//
// Usage:
//   const { analyzeManifest } = require('./lib/script-analyzer.js')
//   const result = analyzeManifest('pkg', '1.0.0', manifest)

const LIFECYCLE_SCRIPT_NAMES = [
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'preprepare',
  'prepare',
  'postprepare',
]

// Risk patterns are intentionally literal and conservative. They are not a
// replacement for manual review, but they catch the most common malicious or
// high-risk behaviors seen in supply-chain incidents. Each pattern must have a
// documented `id`, `level` and human-readable `message`.
const RISK_PATTERNS = [
  {
    id: 'child-process',
    level: 'high',
    regex:
      /\b(child_process\b|exec\s*\(|execSync\s*\(|spawn\s*\(|spawnSync\s*\()/,
    message: 'spawns a child process',
  },
  {
    id: 'eval-like',
    level: 'high',
    regex: /\b(eval\b|Function\s*\(|new\s+Function\b)/,
    message: 'uses dynamic code evaluation',
  },
  {
    id: 'network-outbound',
    level: 'high',
    regex:
      /\b(fetch\s*\(|https?\.(request|get)\s*\(|axios\b|node-fetch\b|undici\b)/,
    message: 'makes an outbound network request',
  },
  {
    id: 'fs-write',
    level: 'medium',
    regex:
      /\b(fs\.\w*write\w*\s*\(|writeFileSync\s*\(|writeFile\s*\(|appendFileSync\s*\(|appendFile\s*\()/,
    message: 'writes to the filesystem',
  },
  {
    id: 'env-access',
    level: 'medium',
    regex: /\bprocess\.env\b/,
    message: 'reads environment variables',
  },
  {
    id: 'permission-change',
    level: 'high',
    regex: /\b(chmod|chown)\b\s+\S/,
    message: 'changes file permissions or ownership',
  },
  {
    id: 'native-build',
    level: 'medium',
    regex:
      /\b(node-gyp\b|node-gyp-build\b|prebuild-install\b|cmake-js\b|prebuild\b)/,
    message: 'compiles a native addon',
  },
  {
    id: 'encoded-payload',
    level: 'medium',
    regex:
      /\b(atob\b|btoa\b|Buffer\.from\s*\(\s*['"][A-Za-z0-9+/=]{40,}['"]\s*\))/,
    message: 'decodes a potentially obfuscated payload',
  },
]

const RISK_LEVEL_ORDER = { high: 3, medium: 2, low: 1, none: 0 }

function extractScripts(manifest) {
  const scripts = manifest?.scripts
  if (!scripts || typeof scripts !== 'object') {
    return {}
  }

  return LIFECYCLE_SCRIPT_NAMES.reduce((acc, scriptName) => {
    if (typeof scripts[scriptName] === 'string') {
      acc[scriptName] = scripts[scriptName]
    }
    return acc
  }, {})
}

function analyzeScript(scriptName, scriptBody, packageId) {
  const findings = []
  if (typeof scriptBody !== 'string') {
    return findings
  }

  for (const pattern of RISK_PATTERNS) {
    if (pattern.regex.test(scriptBody)) {
      findings.push({
        package: packageId,
        script: scriptName,
        level: pattern.level,
        pattern: pattern.id,
        message: pattern.message,
      })
    }
  }

  return findings
}

function analyzeManifest(name, version, manifest) {
  const packageId = `${name}@${version}`
  const scripts = extractScripts(manifest)
  const scriptEntries = Object.entries(scripts)
  const findings = []

  for (const [scriptName, scriptBody] of scriptEntries) {
    findings.push(...analyzeScript(scriptName, scriptBody, packageId))
  }

  return {
    package: packageId,
    scripts,
    findings,
    hasLifecycleScripts: scriptEntries.length > 0,
    riskLevel: computeRiskLevel(findings),
  }
}

function computeRiskLevel(findings) {
  if (findings.some((f) => f.level === 'high')) return 'high'
  if (findings.some((f) => f.level === 'medium')) return 'medium'
  return findings.length > 0 ? 'low' : 'none'
}

function compareRiskLevel(a, b) {
  return RISK_LEVEL_ORDER[a] - RISK_LEVEL_ORDER[b]
}

function aggregateResults(results) {
  const allFindings = results.flatMap((r) => r.findings)
  const maxLevel = allFindings.reduce((max, f) => {
    return compareRiskLevel(f.level, max) > 0 ? f.level : max
  }, 'none')

  return {
    totalPackages: results.length,
    packagesWithScripts: results.filter((r) => r.hasLifecycleScripts).length,
    totalFindings: allFindings.length,
    riskLevel: maxLevel,
    findingsByLevel: countByLevel(allFindings),
  }
}

function countByLevel(findings) {
  return findings.reduce(
    (acc, f) => {
      acc[f.level] = (acc[f.level] ?? 0) + 1
      return acc
    },
    { high: 0, medium: 0, low: 0 },
  )
}

function buildFindingsTable(results) {
  const allFindings = results.flatMap((r) => r.findings)
  if (allFindings.length === 0) {
    return 'No risky lifecycle-script patterns detected.'
  }

  const rows = allFindings.map(
    (f) =>
      `| ${f.level.toUpperCase().padEnd(6)} | ${f.package.padEnd(30)} | ${f.script.padEnd(12)} | ${f.message} |`,
  )

  const header =
    '| LEVEL  | PACKAGE                        | SCRIPT       | DETAIL                         |'
  const separator =
    '|--------|--------------------------------|--------------|--------------------------------|'

  return [header, separator, ...rows].join('\n')
}

function buildSummaryTable(results) {
  const summary = aggregateResults(results)
  const statusEmoji = summary.riskLevel === 'none' ? '✅' : '⚠️'

  return [
    `${statusEmoji} Lifecycle script analysis summary`,
    '',
    `Packages analyzed: ${summary.totalPackages}`,
    `Packages with lifecycle scripts: ${summary.packagesWithScripts}`,
    `Overall risk level: ${summary.riskLevel.toUpperCase()}`,
    `Findings: ${summary.totalFindings} (high: ${summary.findingsByLevel.high}, medium: ${summary.findingsByLevel.medium}, low: ${summary.findingsByLevel.low})`,
  ].join('\n')
}

module.exports = {
  LIFECYCLE_SCRIPT_NAMES,
  RISK_PATTERNS,
  extractScripts,
  analyzeScript,
  analyzeManifest,
  computeRiskLevel,
  compareRiskLevel,
  aggregateResults,
  buildFindingsTable,
  buildSummaryTable,
}
