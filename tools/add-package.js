'use strict'

// Safe wrapper for adding dependencies to the project.
// Ensures the age check (check-package-age.js) runs BEFORE any installation,
// closing the silent bypass that happens when someone runs `npm install <pkg>`
// directly without going through the project's security flow.
//
// Usage:
//   npm run defence:add -- <package>@<version>            — add as production dependency
//   npm run defence:add -- <package>@<version> --dev      — add as devDependency
//   npm run defence:add -- <package>@<version> --peer     — add as peerDependency
//   npm run defence:add -- <package>@<version> --dry-run  — check age without installing
//
// Examples:
//   npm run defence:add -- lodash@4.17.21
//   npm run defence:add -- express@4.21.2
//   npm run defence:add -- @types/node@22.15.3 --dev
//   npm run defence:add -- react-native-svg@12.0.0 --peer
//   npm run defence:add -- husky@9.1.7 --dry-run
//
// Note on peerDependencies (--peer):
//   The --save-peer flag pins the exact version in package.json (e.g. "12.0.0").
//   After installation, manually adjust to the desired range (e.g. ">=12.0.0").
//   --dev and --peer are mutually exclusive.
//
// Flow executed:
//   1. Validate the argument (name and exact version required)
//   2. Check package age via check-package-age.js --pkg (aborts if too recent)
//   3. Install with `npm install --save-exact` (skip if --dry-run)
//      The command is built as an argument array and executed with spawnSync,
//      so shell interpolation is impossible even though the input is already
//      validated by VALID_PKG_SPECIFIER_RE.
//   4. Verify cryptographic signatures with `npm audit signatures`
//   5. Audit known vulnerabilities with `npm audit --audit-level=high`
//   6. Run a transitive package-age check to catch newly pulled transitive
//      packages that are younger than the minimum age.
//
// Packages with lifecycle scripts (postinstall, preinstall):
//   The project uses ignore-scripts=true in .npmrc, blocking lifecycle scripts for all
//   installed packages. Packages that need a postinstall to work (e.g. esbuild, sharp,
//   canvas) require an additional manual step:
//     npm_config_ignore_scripts=false npm rebuild <package>
//   See the "Adding New Dependencies" section in README.md for details.

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

// Reuses fetchPackageAge and resolveExactVersion from check-package-age.js to keep
// the verification logic centralized in one place.
// The module is imported as a whole so tests can monkey-patch its exported functions
// and the patch is visible here (Node.js caches the module object).
// Only native Node.js modules are used here, for the same reason as check-package-age.js.
const checkPackageAge = require(
  path.resolve(__dirname, './check-package-age.js'),
)
const { VALID_PKG_SPECIFIER_RE, parsePackageArg } = require(
  path.resolve(__dirname, './lib/package-utils.js'),
)
const { loadConfig } = require(path.resolve(__dirname, './lib/config.js'))
const typosquatting = require(path.resolve(__dirname, './lib/typosquatting.js'))
const provenance = require(path.resolve(__dirname, './lib/provenance.js'))

// Exposed for tests so spawnSync calls can be mocked without patching the global child_process module.
let spawnSyncImpl = spawnSync
function setSpawnSyncImpl(fn) {
  spawnSyncImpl = fn
}
function resetSpawnSyncImpl() {
  spawnSyncImpl = spawnSync
}

// Exposed for tests so the registry fetch layer can be mocked.
const { fetchRegistryJson } = require(
  path.resolve(__dirname, './lib/registry-cache.js'),
)
let fetchRegistryJsonImpl = fetchRegistryJson
function setFetchRegistryJsonImpl(fn) {
  fetchRegistryJsonImpl = fn
}
function resetFetchRegistryJsonImpl() {
  fetchRegistryJsonImpl = fetchRegistryJson
}

// Exposed for tests so filesystem calls can be mocked.
let fsImpl = fs
function setFsImpl(fn) {
  fsImpl = fn
}
function resetFsImpl() {
  fsImpl = fs
}

let typosquattingImpl = typosquatting
function setTyposquattingImpl(fn) {
  typosquattingImpl = fn
}
function resetTyposquattingImpl() {
  typosquattingImpl = typosquatting
}

let provenanceImpl = provenance
function setProvenanceImpl(fn) {
  provenanceImpl = fn
}
function resetProvenanceImpl() {
  provenanceImpl = provenance
}

let loadConfigImpl = loadConfig
function setLoadConfigImpl(fn) {
  loadConfigImpl = fn
}
function resetLoadConfigImpl() {
  loadConfigImpl = loadConfig
}

function parseCliArgs(argv) {
  return {
    pkgArg: argv.find((a) => !a.startsWith('-')),
    isDev: argv.includes('--dev'),
    isPeer: argv.includes('--peer'),
    isDryRun: argv.includes('--dry-run'),
  }
}

// Validates arguments before any network or disk operation.
// Fails with a clear usage message to guide the contributor.
// Only executed in CLI mode — does not run when imported via require().
function validateArgs(argv = process.argv.slice(2)) {
  const { pkgArg, isDev, isPeer } = parseCliArgs(argv)

  if (!pkgArg) {
    console.error('Error: missing package argument.')
    console.error(
      'Usage: npm run defence:add -- <package>@<version> [--dev|--peer] [--dry-run]',
    )
    console.error('Examples:')
    console.error('  npm run defence:add -- lodash@4.17.21')
    console.error('  npm run defence:add -- @types/node@22.15.3 --dev')
    console.error('  npm run defence:add -- react-native-svg@12.0.0 --peer')
    console.error('  npm run defence:add -- express@4.21.2 --dry-run')
    process.exit(1)
  }

  if (isDev && isPeer) {
    console.error('Error: --dev and --peer are mutually exclusive.')
    console.error('Use --dev for devDependencies, --peer for peerDependencies.')
    process.exit(1)
  }

  if (!VALID_PKG_SPECIFIER_RE.test(pkgArg)) {
    console.error(`Error: invalid package specifier "${pkgArg}".`)
    console.error(
      'Use the format: name@x.y.z or @scope/name@x.y.z (exact version required)',
    )
    process.exit(1)
  }
}

// Fetches the version manifest from the npm registry.
// Used to obtain the tarball integrity BEFORE installation so we can detect
// time-of-check/time-of-use substitution after npm install.
async function fetchVersionManifest(name, version) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
  const cfg = loadConfigImpl()
  return fetchRegistryJsonImpl(name, version, {
    url,
    cacheTtlHours: cfg.updateCheck.cacheTtlHours,
    maxResponseBytes: cfg.pkgAgeCheck.maxResponseMB * 1024 * 1024,
    timeoutMs: cfg.pkgAgeCheck.registryTimeoutMs,
    retryMaxAttempts: cfg.updateCheck.retryMaxAttempts,
    retryInitialDelayMs: cfg.updateCheck.retryInitialDelayMs,
    retryBackoffMultiplier: cfg.updateCheck.retryBackoffMultiplier,
    retryMaxDelayMs: cfg.updateCheck.retryMaxDelayMs,
    acceptGzip: true,
  })
}

// Reads the installed integrity from package-lock.json for a given package.
// The integrity is written by npm after install and represents the tarball
// that was actually placed in node_modules.
function readInstalledIntegrity(name) {
  try {
    const lockPath = path.resolve(process.cwd(), 'package-lock.json')
    const lock = JSON.parse(fsImpl.readFileSync(lockPath, 'utf8'))
    const pkgKey = `node_modules/${name}`
    return lock.packages?.[pkgKey]?.integrity ?? null
  } catch {
    return null
  }
}

// Verifies the tarball integrity installed by npm matches the integrity
// obtained from the registry before installation.
async function verifyInstalledIntegrity(name, version, expectedIntegrity) {
  if (!expectedIntegrity) {
    throw new Error(
      `No integrity found in registry manifest for ${name}@${version}`,
    )
  }

  const installedIntegrity = readInstalledIntegrity(name)
  if (!installedIntegrity) {
    throw new Error(
      `No integrity found in package-lock.json for ${name}@${version}`,
    )
  }

  if (installedIntegrity !== expectedIntegrity) {
    throw new Error(
      `Integrity mismatch for ${name}@${version}: expected ${expectedIntegrity}, found ${installedIntegrity}`,
    )
  }

  return true
}

// Checks whether a package name exists on the public npm registry.
// Used by the dependency-confusion check to detect internal package names
// that have been squatted on npm. A 404 means the name is not currently
// published; any other successful response or unexpected error is treated
// conservatively as "exists" to avoid silently allowing a confusion attack.
async function checkPublicPackageExists(name) {
  const url = `https://registry.npmjs.org/${encodeURIComponent(name)}`
  try {
    await fetchRegistryJsonImpl(name, 'latest', {
      url,
      cacheTtlHours: 24,
      maxResponseBytes: 1024 * 1024,
      timeoutMs: 10000,
      retryMaxAttempts: 1,
      retryInitialDelayMs: 250,
      retryBackoffMultiplier: 2,
      retryMaxDelayMs: 1000,
      acceptGzip: true,
    })
    return true
  } catch (err) {
    if (err.statusCode === 404) return false
    // Network or registry errors: assume it exists to stay safe.
    return true
  }
}

// Returns the three values that vary by dependency type.
// Extracted from main() to reduce cognitive complexity (SonarQube: cognitive-complexity).
function getSaveMode(peer, dev) {
  if (peer)
    return {
      typeLabel: ' [peerDependency]',
      flagHint: ' --peer',
      saveFlag: '--save-peer',
    }
  if (dev)
    return {
      typeLabel: ' [devDependency]',
      flagHint: ' --dev',
      saveFlag: '--save-dev',
    }
  return { typeLabel: '', flagHint: '', saveFlag: '--save' }
}

async function main(argv = process.argv.slice(2), exitFn = process.exit) {
  const config = loadConfigImpl()
  const MIN_AGE_DAYS = config.pkgAgeCheck.minAgeDays
  const { pkgArg, isDev, isPeer, isDryRun } = parseCliArgs(argv)
  const { name, version: rawVersion } = parsePackageArg(pkgArg)

  // Requires an exact version — the contributor must explicitly decide which version is being approved.
  // This prevents the flow from automatically approving a recently published version when resolving "latest".
  if (!rawVersion) {
    console.error(
      `Error: exact version required. Use: npm run defence:add -- ${name}@x.y.z`,
    )
    exitFn(1)
    return
  }

  const { typeLabel, flagHint, saveFlag } = getSaveMode(isPeer, isDev)
  console.log(
    `\nadd-package: ${name}@${rawVersion}${typeLabel}${isDryRun ? ' [dry-run]' : ''}\n`,
  )

  // Step 0.5 — Typosquatting and dependency-confusion check.
  // Flags packages whose names are suspiciously similar to existing dependencies
  // or to configured private/internal package names that exist on the public registry.
  const existingNames = typosquattingImpl.loadExistingNames(process.cwd())
  const internalNames = config.defences?.internalPackageNames ?? []
  const threshold = config.defences?.typosquattingThreshold ?? 2
  const conflicts = await typosquattingImpl.findConflicts(name, {
    threshold,
    internalNames,
    existingNames,
    publicPackagesResolver: checkPublicPackageExists,
  })
  if (conflicts.length > 0) {
    console.error(
      `\nPotential typosquatting / dependency-confusion detected for ${name}:`,
    )
    for (const conflict of conflicts) {
      if (conflict.type === 'typosquatting') {
        console.error(
          `  - name is ${conflict.distance} edits away from existing package "${conflict.existing}"`,
        )
      } else {
        console.error(
          `  - internal package name "${conflict.name}" exists on the public registry`,
        )
      }
    }
    console.error('\nInstallation aborted — review the package name carefully.')
    exitFn(1)
    return
  }

  // Step 1 — Confirm the provided version is exact (no range operators).
  // resolveExactVersion is imported from check-package-age.js; returns null for dist-tags
  // and ranges such as "^1.0.0", "~2.0", "latest", etc.
  const exactVersion = checkPackageAge.resolveExactVersion(rawVersion)
  if (!exactVersion) {
    console.error(`Error: "${rawVersion}" is not an exact version.`)
    console.error(
      `Use a pinned version, e.g.: npm run defence:add -- ${name}@x.y.z`,
    )
    exitFn(1)
    return
  }

  // Step 2 — Check the package age before any installation.
  // fetchPackageAge is imported from check-package-age.js; queries the registry and returns
  // the number of days since publication. Aborts if the package is newer than MIN_AGE_DAYS.
  console.log(
    `Checking publish age for ${name}@${exactVersion} (minimum: ${MIN_AGE_DAYS} days)...`,
  )
  let ageResult
  try {
    ageResult = await checkPackageAge.fetchPackageAge(name, exactVersion)
  } catch (err) {
    console.error(`\nPackage age check FAILED: ${err.message}`)
    console.error('Installation aborted — package age could not be confirmed.')
    exitFn(1)
    return
  }

  const ageDays = ageResult.ageDays.toFixed(1)
  const publishedStr = ageResult.published.toISOString().slice(0, 10)

  if (ageResult.ageDays < MIN_AGE_DAYS) {
    console.error(
      `\n  BLOCKED  ${name}@${exactVersion} — published ${publishedStr} (${ageDays} days ago)`,
    )
    console.error(
      `\nPackage age check FAILED — below minimum age of ${MIN_AGE_DAYS} days.`,
    )
    console.error('Installation aborted.')
    exitFn(1)
    return
  }

  console.log(
    `  OK       ${name}@${exactVersion} — published ${publishedStr} (${ageDays} days ago)`,
  )

  // Step 2.6 — Provenance / SLSA attestation check.
  // Warns (or blocks, if configured) when the package version lacks provenance.
  const provenanceMode = config.defences?.provenanceMode ?? 'warn'
  if (provenanceMode === 'warn' || provenanceMode === 'strict') {
    try {
      const provenanceResult = await provenanceImpl.checkProvenance(
        name,
        exactVersion,
        {
          cacheTtlHours: config.updateCheck.cacheTtlHours,
          maxResponseBytes: config.pkgAgeCheck.maxResponseMB * 1024 * 1024,
          timeoutMs: config.pkgAgeCheck.registryTimeoutMs,
          retryMaxAttempts: config.updateCheck.retryMaxAttempts,
          retryInitialDelayMs: config.updateCheck.retryInitialDelayMs,
          retryBackoffMultiplier: config.updateCheck.retryBackoffMultiplier,
          retryMaxDelayMs: config.updateCheck.retryMaxDelayMs,
        },
      )
      if (!provenanceResult.hasProvenance) {
        const message = `No provenance attestation found for ${name}@${exactVersion}.`
        if (provenanceMode === 'strict') {
          console.error(`\n${message}`)
          console.error(
            'Installation aborted — strict provenance mode requires an attestation.',
          )
          exitFn(1)
          return
        }
        console.log(`\n  WARNING  ${message}`)
      } else if (!provenanceResult.valid) {
        const message = `Provenance attestation for ${name}@${exactVersion} is malformed: ${provenanceResult.reason}`
        if (provenanceMode === 'strict') {
          console.error(`\n${message}`)
          console.error(
            'Installation aborted — strict provenance mode requires a valid attestation.',
          )
          exitFn(1)
          return
        }
        console.log(`\n  WARNING  ${message}`)
      } else {
        console.log(`\n  OK       provenance attestation verified`)
      }
    } catch (err) {
      const message = `Could not verify provenance for ${name}@${exactVersion}: ${err.message}`
      if (provenanceMode === 'strict') {
        console.error(`\n${message}`)
        console.error(
          'Installation aborted — strict provenance mode requires a successful verification.',
        )
        exitFn(1)
        return
      }
      console.log(`\n  WARNING  ${message}`)
    }
  }

  // Step 2.5 — Fetch registry manifest and pin tarball integrity before install.
  // This closes the TOCTOU window: we record the expected integrity at check time
  // and re-verify it after npm install against the actual lockfile entry.
  console.log(`\nPinning tarball integrity for ${name}@${exactVersion}...`)
  let expectedIntegrity
  try {
    const manifest = await fetchVersionManifest(name, exactVersion)
    expectedIntegrity = manifest.dist?.integrity ?? null
    if (!expectedIntegrity) {
      throw new Error(
        `Registry manifest for ${name}@${exactVersion} does not contain dist.integrity`,
      )
    }
    console.log(`  OK       integrity ${expectedIntegrity}`)
  } catch (err) {
    console.error(`\nFailed to pin tarball integrity: ${err.message}`)
    console.error('Installation aborted — cannot verify package after install.')
    exitFn(1)
    return
  }

  // Step 3 — Install the package (only if not dry-run).
  // --save-exact pins the version without ^/~ operators in package.json,
  // aligned with save-exact=true in .npmrc (intentional redundancy for clarity).
  // .npmrc already sets ignore-scripts=true; the flag is not passed explicitly here
  // because npm reads it automatically from the configuration file.
  if (isDryRun) {
    console.log('\nDry-run: age check passed. Skipping installation.')
    console.log(
      `\nTo install, run: npm run defence:add -- ${pkgArg}${flagHint}`,
    )
    exitFn(0)
    return
  }

  // Build the npm install command as an array of arguments.
  // Each value is passed verbatim to the npm executable, so no shell
  // metacharacter can be interpreted even if the regex above were bypassed.
  const installArgs = [
    'install',
    saveFlag,
    '--save-exact',
    `${name}@${exactVersion}`,
  ]

  console.log(`\nInstalling: npm ${installArgs.join(' ')}`)
  try {
    // stdio: 'inherit' forwards npm stdout/stderr directly to the terminal,
    // so the contributor can see progress and error messages in real time.
    const installResult = spawnSyncImpl('npm', installArgs, {
      stdio: 'inherit',
      shell: false,
    })
    if (installResult.status !== 0) {
      throw new Error(
        `npm install exited with code ${installResult.status ?? installResult.signal}`,
      )
    }
  } catch {
    // npm already printed the error via stdio: 'inherit'; just indicate the reason for exiting.
    console.error('\nInstallation failed. See npm output above.')
    exitFn(1)
    return
  }

  // Step 4 — Verify cryptographic signatures after installation.
  // Detects package tampering in transit (MITM) or local node_modules/ substitution.
  // Complemented by Step 5, which checks known CVEs after integrity is confirmed.
  console.log('\nVerifying package signatures...')
  try {
    const signatureResult = spawnSyncImpl('npm', ['audit', 'signatures'], {
      stdio: 'inherit',
      shell: false,
    })
    if (signatureResult.status !== 0) {
      throw new Error(
        `npm audit signatures exited with code ${signatureResult.status ?? signatureResult.signal}`,
      )
    }
  } catch {
    console.error(
      '\nSignature verification failed. The installation may be compromised.',
    )
    console.error(
      'Run `npm ci` to restore a clean state from package-lock.json.',
    )
    exitFn(1)
    return
  }

  // Step 4.5 — Re-verify tarball integrity after installation.
  // Detects time-of-check/time-of-use substitution: a malicious registry or
  // MitM could serve a different tarball than the one whose integrity we pinned.
  console.log('\nRe-verifying installed tarball integrity...')
  try {
    await verifyInstalledIntegrity(name, exactVersion, expectedIntegrity)
    console.log(`  OK       installed integrity matches registry`)
  } catch (err) {
    console.error(`\nIntegrity verification FAILED: ${err.message}`)
    console.error(
      'The installed tarball may have been substituted after the age check.',
    )
    console.error(`Run \`npm uninstall ${name}\` and try again.`)
    exitFn(1)
    return
  }

  // Step 5 — Audit known vulnerabilities after installation.
  // Ensures the newly installed package does not introduce high or critical severity CVEs.
  // Runs after the signature audit to cover both vectors in the same flow.
  console.log('\nAuditing for known vulnerabilities...')
  try {
    const auditResult = spawnSyncImpl('npm', ['audit', '--audit-level=high'], {
      stdio: 'inherit',
      shell: false,
    })
    if (auditResult.status !== 0) {
      throw new Error(
        `npm audit exited with code ${auditResult.status ?? auditResult.signal}`,
      )
    }
  } catch {
    console.error(
      '\nVulnerability audit FAILED — high or critical CVE detected.',
    )
    console.error(
      'Run `npm audit` for details, or `npm audit fix` to apply automatic fixes.',
    )
    console.error(`To remove the package: npm uninstall ${name}`)
    exitFn(1)
    return
  }

  // Step 6 — Transitive package-age check.
  // Installing a direct dependency can pull new transitive versions. This check
  // ensures every resolved package (including transitive ones) still satisfies
  // the minimum age policy before the change is committed.
  console.log('\nRunning transitive package-age check...')
  try {
    const transitiveResult = spawnSyncImpl(
      'npm',
      ['run', 'defence:pkg-age-check', '--', '--transitive'],
      { stdio: 'inherit', shell: false },
    )
    if (transitiveResult.status !== 0) {
      throw new Error(
        `npm run defence:pkg-age-check -- --transitive exited with code ${transitiveResult.status ?? transitiveResult.signal}`,
      )
    }
  } catch {
    console.error(
      '\nTransitive package-age check FAILED — a dependency is younger than the minimum age.',
    )
    console.error(`To remove the package: npm uninstall ${name}`)
    exitFn(1)
    return
  }

  console.log(`\nDone. ${name}@${exactVersion} added successfully.`)
  console.log('Remember to commit both package.json and package-lock.json.')
  exitFn(0)
}

// Runs main() only when the script is invoked directly from the CLI.
// When imported via require() by tests or other modules,
// only the exports are available — main() is not called.
if (require.main === module) {
  const argv = process.argv.slice(2)
  validateArgs(argv)
  main(argv).catch((err) => {
    console.error(`Unexpected error: ${err.message}`)
    process.exit(1)
  })
}

// Exports utility functions for use by tests.
module.exports = {
  parsePackageArg,
  VALID_PKG_SPECIFIER_RE,
  validateArgs,
  main,
  setSpawnSyncImpl,
  resetSpawnSyncImpl,
  setFetchRegistryJsonImpl,
  resetFetchRegistryJsonImpl,
  setFsImpl,
  resetFsImpl,
  setTyposquattingImpl,
  resetTyposquattingImpl,
  setProvenanceImpl,
  resetProvenanceImpl,
  setLoadConfigImpl,
  resetLoadConfigImpl,
  fetchVersionManifest,
  verifyInstalledIntegrity,
}
