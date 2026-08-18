'use strict'

// Safe wrapper for adding dependencies to the project.
// Ensures the age check (check-package-age.js) runs BEFORE any installation,
// closing the silent bypass that happens when someone runs `npm install <pkg>`
// directly without going through the project's security flow.
//
// Usage:
//   npm run add -- <package>@<version>            — add as production dependency
//   npm run add -- <package>@<version> --dev      — add as devDependency
//   npm run add -- <package>@<version> --peer     — add as peerDependency
//   npm run add -- <package>@<version> --dry-run  — check age without installing
//
// Examples:
//   npm run add -- lodash@4.17.21
//   npm run add -- express@4.21.2
//   npm run add -- @types/node@22.15.3 --dev
//   npm run add -- react-native-svg@12.0.0 --peer
//   npm run add -- husky@9.1.7 --dry-run
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
//
// Packages with lifecycle scripts (postinstall, preinstall):
//   The project uses ignore-scripts=true in .npmrc, blocking lifecycle scripts for all
//   installed packages. Packages that need a postinstall to work (e.g. esbuild, sharp,
//   canvas) require an additional manual step:
//     npm_config_ignore_scripts=false npm rebuild <package>
//   See the "Adding New Dependencies" section in README.md for details.

const { spawnSync } = require('node:child_process')
const path = require('node:path')

// Reuses fetchPackageAge and resolveExactVersion from check-package-age.js to keep
// the verification logic centralized in one place.
// The module is imported as a whole so tests can monkey-patch its exported functions
// and the patch is visible here (Node.js caches the module object).
// Only native Node.js modules are used here, for the same reason as check-package-age.js.
const checkPackageAge = require(path.resolve(__dirname, './check-package-age.js'))
const { VALID_PKG_SPECIFIER_RE, parsePackageArg } = require(path.resolve(__dirname, './lib/package-utils.js'))

// Exposed for tests so spawnSync calls can be mocked without patching the global child_process module.
let spawnSyncImpl = spawnSync
function setSpawnSyncImpl(fn) { spawnSyncImpl = fn }
function resetSpawnSyncImpl() { spawnSyncImpl = spawnSync }

const pkg = require(path.resolve(__dirname, '../package.json'))

// Reads the same settings as check-package-age.js to keep behavior consistent.
const MIN_AGE_DAYS = (pkg.pkgAgeCheck?.minAgeDays) ?? 7

// Parses command-line arguments.
// argv format: ["<package>@<version>", "[--dev|--peer]", "[--dry-run]"]
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
    console.error('Usage: npm run add -- <package>@<version> [--dev|--peer] [--dry-run]')
    console.error('Examples:')
    console.error('  npm run add -- lodash@4.17.21')
    console.error('  npm run add -- @types/node@22.15.3 --dev')
    console.error('  npm run add -- react-native-svg@12.0.0 --peer')
    console.error('  npm run add -- express@4.21.2 --dry-run')
    process.exit(1)
  }

  if (isDev && isPeer) {
    console.error('Error: --dev and --peer are mutually exclusive.')
    console.error('Use --dev for devDependencies, --peer for peerDependencies.')
    process.exit(1)
  }

  if (!VALID_PKG_SPECIFIER_RE.test(pkgArg)) {
    console.error(`Error: invalid package specifier "${pkgArg}".`)
    console.error('Use the format: name@x.y.z or @scope/name@x.y.z (exact version required)')
    process.exit(1)
  }
}

// Returns the three values that vary by dependency type.
// Extracted from main() to reduce cognitive complexity (SonarQube: cognitive-complexity).
function getSaveMode(peer, dev) {
  if (peer) return { typeLabel: ' [peerDependency]', flagHint: ' --peer', saveFlag: '--save-peer' }
  if (dev)  return { typeLabel: ' [devDependency]',  flagHint: ' --dev',  saveFlag: '--save-dev'  }
  return          { typeLabel: '',                  flagHint: '',         saveFlag: '--save'       }
}

async function main(argv = process.argv.slice(2), exitFn = process.exit) {
  const { pkgArg, isDev, isPeer, isDryRun } = parseCliArgs(argv)
  const { name, version: rawVersion } = parsePackageArg(pkgArg)

  // Requires an exact version — the contributor must explicitly decide which version is being approved.
  // This prevents the flow from automatically approving a recently published version when resolving "latest".
  if (!rawVersion) {
    console.error(`Error: exact version required. Use: npm run add -- ${name}@x.y.z`)
    exitFn(1)
    return
  }

  const { typeLabel, flagHint, saveFlag } = getSaveMode(isPeer, isDev)
  console.log(`\nadd-package: ${name}@${rawVersion}${typeLabel}${isDryRun ? ' [dry-run]' : ''}\n`)

  // Step 1 — Confirm the provided version is exact (no range operators).
  // resolveExactVersion is imported from check-package-age.js; returns null for dist-tags
  // and ranges such as "^1.0.0", "~2.0", "latest", etc.
  const exactVersion = checkPackageAge.resolveExactVersion(rawVersion)
  if (!exactVersion) {
    console.error(`Error: "${rawVersion}" is not an exact version.`)
    console.error(`Use a pinned version, e.g.: npm run add -- ${name}@x.y.z`)
    exitFn(1)
    return
  }

  // Step 2 — Check the package age before any installation.
  // fetchPackageAge is imported from check-package-age.js; queries the registry and returns
  // the number of days since publication. Aborts if the package is newer than MIN_AGE_DAYS.
  console.log(`Checking publish age for ${name}@${exactVersion} (minimum: ${MIN_AGE_DAYS} days)...`)
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
    console.error(`\n  BLOCKED  ${name}@${exactVersion} — published ${publishedStr} (${ageDays} days ago)`)
    console.error(`\nPackage age check FAILED — below minimum age of ${MIN_AGE_DAYS} days.`)
    console.error('Installation aborted.')
    exitFn(1)
    return
  }

  console.log(`  OK       ${name}@${exactVersion} — published ${publishedStr} (${ageDays} days ago)`)

  // Step 3 — Install the package (only if not dry-run).
  // --save-exact pins the version without ^/~ operators in package.json,
  // aligned with save-exact=true in .npmrc (intentional redundancy for clarity).
  // .npmrc already sets ignore-scripts=true; the flag is not passed explicitly here
  // because npm reads it automatically from the configuration file.
  if (isDryRun) {
    console.log('\nDry-run: age check passed. Skipping installation.')
    console.log(`\nTo install, run: npm run add -- ${pkgArg}${flagHint}`)
    exitFn(0)
    return
  }

  // Build the npm install command as an array of arguments.
  // Each value is passed verbatim to the npm executable, so no shell
  // metacharacter can be interpreted even if the regex above were bypassed.
  const installArgs = ['install', saveFlag, '--save-exact', `${name}@${exactVersion}`]

  console.log(`\nInstalling: npm ${installArgs.join(' ')}`)
  try {
    // stdio: 'inherit' forwards npm stdout/stderr directly to the terminal,
    // so the contributor can see progress and error messages in real time.
    const installResult = spawnSyncImpl('npm', installArgs, { stdio: 'inherit', shell: false })
    if (installResult.status !== 0) {
      throw new Error(`npm install exited with code ${installResult.status ?? installResult.signal}`)
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
    const signatureResult = spawnSyncImpl('npm', ['audit', 'signatures'], { stdio: 'inherit', shell: false })
    if (signatureResult.status !== 0) {
      throw new Error(`npm audit signatures exited with code ${signatureResult.status ?? signatureResult.signal}`)
    }
  } catch {
    console.error('\nSignature verification failed. The installation may be compromised.')
    console.error('Run `npm ci` to restore a clean state from package-lock.json.')
    exitFn(1)
    return
  }

  // Step 5 — Audit known vulnerabilities after installation.
  // Ensures the newly installed package does not introduce high or critical severity CVEs.
  // Runs after the signature audit to cover both vectors in the same flow.
  console.log('\nAuditing for known vulnerabilities...')
  try {
    const auditResult = spawnSyncImpl('npm', ['audit', '--audit-level=high'], { stdio: 'inherit', shell: false })
    if (auditResult.status !== 0) {
      throw new Error(`npm audit exited with code ${auditResult.status ?? auditResult.signal}`)
    }
  } catch {
    console.error('\nVulnerability audit FAILED — high or critical CVE detected.')
    console.error('Run `npm audit` for details, or `npm audit fix` to apply automatic fixes.')
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
}

