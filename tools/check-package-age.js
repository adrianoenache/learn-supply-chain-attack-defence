'use strict'

// Defense against "fast publish" supply-chain attacks.
// Prevents installation of packages recently published to the npm registry.
// Attacks such as event-stream (2018) and ua-parser-js (2021) involved publishing
// a malicious version and removing it before it was widely detected.
// A minimum release-age delay gives scanners and the community time to spot the threat.
//
// Usage:
//   node ./tools/check-package-age.js                        — check declared package.json dependencies (pre-install)
//   node ./tools/check-package-age.js --transitive            — check all resolved dependencies in package-lock.json (post-install)
//   node ./tools/check-package-age.js --pkg lodash@4.17.21   — check a single package with an exact version (point check)
//
// Invoked via the `pkg-age-check` script (setup, npm-reinstall pre-install),
// directly with --transitive (npm-reinstall post-install),
// and internally by add-package.js with --pkg before any installation.

const https = require('node:https')
const path = require('node:path')

const { VALID_PKG_SPECIFIER_RE, parsePackageArg } = require(
  path.resolve(__dirname, './lib/package-utils.js'),
)
const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))

// Reads the declared dependencies from the project's package.json.
// Only native modules are used here — this script must not depend on installable
// packages because it runs before installation itself.
const pkg = require(path.resolve(__dirname, '../package.json'))

const config = loadConfig()

// Minimum number of days since publication for a package to be accepted.
// Aligned with min-release-age=7 in .npmrc (npm's native defense layer).
// Configurable via package.json: "pkgAgeCheck": { "minAgeDays": 7 }
const MIN_AGE_DAYS = config.pkgAgeCheck.minAgeDays

// Maximum response size per registry call (default: 20 MB).
// Full package documents with long history can be large, but no known real package
// exceeds 20 MB. The cap protects against pathological scenarios (malformed response,
// data injection in transit, infinite chunk loops).
// Override via package.json: "pkgAgeCheck": { "minAgeDays": 7, "maxResponseMB": 50 }
const MAX_RESPONSE_BYTES = config.pkgAgeCheck.maxResponseMB * 1024 * 1024

// Maximum concurrent registry queries (default: 10).
// Avoids rate-limiting in projects with many dependencies.
// Configurable via package.json: "pkgAgeCheck": { "concurrency": 5 }
const CONCURRENCY = config.pkgAgeCheck.concurrency

// Resolves the operation mode from command-line arguments.
// Returns an object with { transitive, pkgArg } or exits on invalid input.
function resolveMode(argv) {
  const transitive = argv.includes('--transitive')
  const pkgArgIndex = argv.indexOf('--pkg')
  const pkgArg = pkgArgIndex === -1 ? null : argv[pkgArgIndex + 1]

  if (pkgArgIndex !== -1 && !pkgArg) {
    console.error(
      'Error: --pkg requires a package name with an exact version. Example: --pkg lodash@4.17.21',
    )
    process.exit(1)
  }
  if (pkgArg && transitive) {
    console.error('Error: --pkg and --transitive are mutually exclusive.')
    process.exit(1)
  }
  if (pkgArg && !VALID_PKG_SPECIFIER_RE.test(pkgArg)) {
    console.error(`Error: invalid package specifier "${pkgArg}".`)
    console.error(
      'Use the format: name@x.y.z or @scope/name@x.y.z (exact version required)',
    )
    process.exit(1)
  }

  return { transitive, pkgArg }
}

// Builds the dependency map to be checked based on the operation mode.
// - transitive: reads resolved versions from package-lock.json
// - pkgArg: checks a single package specified on the CLI
// - default: merges all dependency types from package.json
function buildDeps({ transitive, pkgArg, pkg: pkgInput, lock }) {
  if (transitive) {
    // lockfileVersion 3 stores each installed package under the "node_modules/<name>" key
    // in the `packages` object. The "" key represents the root project and is filtered out.
    // The `version` field always contains the resolved exact version.
    return Object.fromEntries(
      Object.entries(lock.packages)
        .filter(([key]) => key.startsWith('node_modules/'))
        .map(([key, val]) => [key.replace(/^node_modules\//, ''), val.version]),
    )
  }

  if (pkgArg) {
    // --pkg mode: decompose "name@version" or "@scope/name@version" using the shared helper.
    // Requires an exact version so the age check operates on the specific version that
    // will be installed, not on a dist-tag.
    const { name: pkgName, version: pkgVersion } = parsePackageArg(pkgArg)
    if (!pkgVersion) {
      console.error(
        `Error: --pkg requires an exact version. Use: --pkg ${pkgName}@x.y.z`,
      )
      process.exit(1)
    }
    return { [pkgName]: pkgVersion }
  }

  return {
    ...pkgInput.dependencies,
    ...pkgInput.devDependencies,
    ...pkgInput.peerDependencies,
    ...pkgInput.optionalDependencies,
  }
}

// Removes semver range operators (`^`, `~`, `>=`, `<=`, `>`, `<`, `=`) from the start
// of a version string, returning the exact version, or null if not resolvable
// (e.g. `*`, `latest`, `x.x.x`). The registry `time` field only contains exact versions.
function resolveExactVersion(version) {
  const exact = version.replace(/^[~^>=<*\s]+/, '').trim()
  if (!exact || exact === 'latest' || exact === 'next' || /[x*]/.test(exact))
    return null
  // Remaining whitespace indicates a composite range (e.g. "1.2 - 2.0", ">=1.0.0 <2.0.0") —
  // an exact version cannot be determined without resolving the range.
  if (/\s/.test(exact)) return null
  return exact
}

// Queries the npm registry and returns the age in days of a specific package version.
//
// The root endpoint (/name) is used instead of the version endpoint (/name/version)
// because only the full package document contains the `time` map with the publication
// date of each individual version. The abbreviated packument (vnd.npm.install-v1+json)
// does not include the `time` field, so the full document is required.
function fetchPackageAge(name, version) {
  return new Promise((resolve, reject) => {
    // Guard against double resolve/reject calls: in socket error scenarios,
    // `res.on('error')` and `res.on('end')` may fire in sequence in the same tick.
    // Promises silently ignore the second call, but the flag makes it explicit.
    let settled = false
    const safeResolve = (val) => {
      if (!settled) {
        settled = true
        resolve(val)
      }
    }
    const safeReject = (err) => {
      if (!settled) {
        settled = true
        reject(err)
      }
    }

    const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`

    const req = https.get(
      url,
      {
        headers: { Accept: 'application/json' },
        timeout: config.pkgAgeCheck.registryTimeoutMs,
      },
      (res) => {
        let data = ''

        // Accumulates HTTP response chunks into a string.
        // Stops the transfer if the accumulated size exceeds MAX_RESPONSE_BYTES.
        res.on('data', (chunk) => {
          data += chunk
          if (Buffer.byteLength(data) > MAX_RESPONSE_BYTES) {
            res.destroy()
            const limitMB = MAX_RESPONSE_BYTES / (1024 * 1024)
            safeReject(
              new Error(
                `Response for ${name} exceeds ${limitMB} MB limit. ` +
                  `Set "pkgAgeCheck": { "maxResponseMB": <value> } in package.json to increase the limit.`,
              ),
            )
          }
        })

        // Mid-stream errors (connection lost after response started) fire on `res`,
        // not on `req` — they need their own handler.
        res.on('error', (err) => {
          safeReject(new Error(`Stream error for ${name}: ${err.message}`))
        })

        res.on('end', () => {
          if (res.statusCode !== 200) {
            safeReject(
              new Error(`Registry returned HTTP ${res.statusCode} for ${name}`),
            )
            return
          }

          try {
            const info = JSON.parse(data)

            // The `time` field is an object where each key is a published version
            // and the value is the ISO 8601 publication timestamp.
            // Example: { "1.0.0": "2024-01-15T10:00:00.000Z", ... }
            if (!info.time?.[version]) {
              safeReject(
                new Error(
                  `No publish date found for ${name}@${version} in registry`,
                ),
              )
              return
            }

            const published = new Date(info.time[version])

            if (Number.isNaN(published.getTime())) {
              safeReject(
                new Error(
                  `Could not parse publish date for ${name}@${version}`,
                ),
              )
              return
            }

            // Converts the difference between now and the publication date from milliseconds to days.
            const ageDays =
              (Date.now() - published.getTime()) / (1000 * 60 * 60 * 24)
            safeResolve({ name, version, ageDays, published })
          } catch (err) {
            safeReject(
              new Error(`Failed to parse response for ${name}: ${err.message}`),
            )
          }
        })
      },
    )

    req.on('timeout', () => {
      req.destroy()
      safeReject(new Error(`Timeout fetching registry data for ${name}`))
    })
    req.on('error', (err) => {
      safeReject(new Error(`Network error for ${name}: ${err.message}`))
    })
  })
}

// Runs an array of async functions with at most `limit` running concurrently.
// Each element of `tasks` is a function that returns a Promise (factory), not the Promise itself —
// this ensures the HTTP request is only started when a slot becomes available.
// Returns an array in the same shape as Promise.allSettled.
// Empty list resolves immediately with [].
function runWithConcurrencyLimit(tasks, limit) {
  return new Promise((resolve) => {
    if (tasks.length === 0) return resolve([])
    const results = new Array(tasks.length)
    let started = 0
    let completed = 0

    function runNext() {
      if (started >= tasks.length) return
      const index = started++
      Promise.resolve()
        .then(() => tasks[index]())
        .then(
          (value) => {
            results[index] = { status: 'fulfilled', value }
            onDone()
          },
          (reason) => {
            results[index] = { status: 'rejected', reason }
            onDone()
          },
        )
    }

    function onDone() {
      completed++
      if (completed === tasks.length) {
        resolve(results)
        return
      }
      runNext()
    }

    const initial = Math.min(limit, tasks.length)
    for (let i = 0; i < initial; i++) runNext()
  })
}

async function main(options = {}) {
  // In test mode, allow injecting a custom package manifest, lockfile, argv, and exit function.
  // Otherwise, fall back to the CLI environment loaded at module evaluation time.
  const exitFn = options.exitFn ?? process.exit
  const mode = options.argv
    ? resolveMode(options.argv)
    : resolveMode(process.argv.slice(2))
  const pkgInput = options.pkg ?? pkg
  const lock =
    options.lock ??
    (mode.transitive
      ? require(path.resolve(__dirname, '../package-lock.json'))
      : null)
  const deps = buildDeps({
    transitive: mode.transitive,
    pkgArg: mode.pkgArg,
    pkg: pkgInput,
    lock,
  })
  const minAgeDays = options.minAgeDays ?? MIN_AGE_DAYS

  const entries = Object.entries(deps)

  if (entries.length === 0) {
    console.log('No dependencies to check.')
    exitFn(0)
    return
  }

  const scope = mode.transitive
    ? 'transitive (package-lock.json)'
    : 'declared (package.json)'
  console.log(
    `Checking publish age for ${entries.length} ${scope} package(s) (minimum: ${minAgeDays} days)...\n`,
  )

  // Queries all packages with concurrency limited to CONCURRENCY simultaneous requests.
  // runWithConcurrencyLimit ensures all queries finish before evaluating results,
  // even if some fail — enabling a complete report.
  // Versions with range operators (^, ~, >=, etc.) are normalized to an exact version
  // before querying; unresolvable ranges (*, latest) are rejected.
  const results = await runWithConcurrencyLimit(
    entries.map(([name, rawVersion]) => () => {
      const version = resolveExactVersion(rawVersion)
      if (!version) {
        return Promise.reject(
          new Error(
            `Cannot determine exact version for ${name}@${rawVersion} — pin to an exact version to allow age check`,
          ),
        )
      }
      return fetchPackageAge(name, version)
    }),
    CONCURRENCY,
  )

  // Splits packages into two lists: blocked (too new) and lookup errors.
  // Both result in failure — a package whose age cannot be confirmed must not be installed.
  const blocked = []
  const errors = []

  results.forEach((result) => {
    if (result.status === 'rejected') {
      errors.push(result.reason.message)
      return
    }

    const { name, version, ageDays, published } = result.value
    const age = ageDays.toFixed(1)
    const publishedStr = published.toISOString().slice(0, 10)

    if (ageDays < minAgeDays) {
      blocked.push(
        `  BLOCKED  ${name}@${version} — published ${publishedStr} (${age} days ago)`,
      )
    } else {
      console.log(
        `  OK       ${name}@${version} — published ${publishedStr} (${age} days ago)`,
      )
    }
  })

  if (errors.length > 0) {
    console.error(
      '\nErrors during registry lookup (cannot confirm package age):',
    )
    errors.forEach((msg) => {
      console.error(`  ${msg}`)
    })
  }

  if (blocked.length > 0) {
    console.error(
      `\nPackage age check FAILED — ${blocked.length} package(s) below minimum age of ${minAgeDays} days:`,
    )
    blocked.forEach((msg) => {
      console.error(msg)
    })
  }

  // Exit with code 1 (failure) if any package was blocked or any registry lookup could not complete.
  // Either case prevents installation.
  if (blocked.length > 0 || errors.length > 0) {
    exitFn(1)
    return
  }

  console.log(`\nAll packages passed the minimum age check.`)
}

// Runs main() only when the script is invoked directly from the CLI.
// When imported via require() by another module (e.g. add-package.js),
// only the exports are available — main() is not called.
if (require.main === module) {
  main().catch((err) => {
    console.error(`Unexpected error: ${err.message}`)
    process.exit(1)
  })
}

// Exports utility functions for reuse by add-package.js and for testing.
// Does not affect behavior when run directly from the CLI.
module.exports = {
  fetchPackageAge,
  resolveExactVersion,
  runWithConcurrencyLimit,
  MAX_RESPONSE_BYTES,
  main,
  buildDeps,
  resolveMode,
}
