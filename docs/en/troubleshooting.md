# Troubleshooting

This guide lists the most common failures you may see when using this project's defensive tooling, why they happen, and how to fix them. Every command can also be run manually for faster iteration.

## General Diagnostic Flow

When a command fails, follow this order:

1. Read the error message carefully. Most scripts print the failing file, package, or command.
2. Run the command directly (without npm scripts) to see the raw output.
3. Check whether your environment satisfies [the engine requirements](setup.md#what-it-runs) (Node.js `>=24.19.0` and npm `>=11.17.0`).
4. Run `bash .husky/pre-commit` only after the individual command passes.

---

## Engine Check Failures

### Symptom

```text
Error: Node.js >= 24.19.0 is required (found v22.0.0)
```

### Cause

The active Node.js or npm version is lower than the versions declared in `package.json` `engines`.

### Fix

Install the required Node.js version with nvm and reinstall dependencies:

```bash
nvm install 24.19.0
nvm use 24.19.0
npm run setup
```

If you are on Windows/WSL, make sure the active WSL distribution is using the correct Node version:

```bash
node -v
npm -v
```

---

## Package Age Check Failures

### Symptom

```text
REJECT  some-package@1.0.0 — published 2026-09-01 (1.9 days ago)
Minimum age: 7 days
```

### Cause

A package is younger than the `min-release-age` value in `.npmrc` (default `7` days). This is expected behavior and blocks potentially immature or rushed releases.

### Fix

1. Wait until the package reaches the minimum age.
2. If the package was added by accident, remove it from `package.json` and run `npm run defence:update`.
3. To check the age of a single package manually:

```bash
node ./tools/check-package-age.js --pkg=some-package@1.0.0
```

For transitive dependencies, run:

```bash
npm run defence:pkg-age-check -- --transitive
```

---

## Signature Audit Failures

### Symptom

```text
npm audit signatures
failed to verify package signature
```

### Cause

A package was installed from a tarball whose registry signature does not match the current registry metadata. This can happen if the lock file was generated against a different registry, the package was republished, or a mirror is out of sync.

### Fix

1. Confirm you are using the public npm registry (or a trusted mirror) in `.npmrc`.
2. Delete `node_modules` and `package-lock.json` only if this is a fresh project; otherwise run:

```bash
npm run defence:reinstall
```

3. If a single package is affected, check its provenance:

```bash
npm view some-package@1.0.0 --json | jq '.dist.attestations'
```

---

## Vulnerability Audit Failures

### Symptom

```text
found 1 high severity vulnerability
```

### Cause

`npm audit --audit-level=high` detected a high or critical CVE in the dependency tree.

### Fix

1. Identify the affected package:

```bash
npm audit --audit-level=high
```

2. Update the dependency if a patched version is available:

```bash
npm run defence:update
```

3. If no patch exists, evaluate whether the vulnerable code path is reachable in your project. Document the risk and consider replacing the dependency.

---

## License Check Failures

### Symptom

```text
❌ some-package@2.0.0 — Proprietary
1 prohibited / 0 unknown license(s) found
```

### Cause

A dependency uses a license that is not in the allow-list configured in `package.json` (`pkgAgeCheck` / `licensesCheck`).

### Fix

1. Read the exact license expression:

```bash
npm run defence:license-check -- --pkg=some-package@2.0.0
```

2. If the license is acceptable, add it to the allow-list in `package.json` under `licensesCheck.allowed` and explain the change in the commit message.
3. If the license is not acceptable, remove the dependency.

---

## Update Check Failures

### Symptom

```text
⚠️  some-package@1.0.0 → 1.1.0 (quarantined)
```

### Cause

A newer version is available but has not yet passed the quarantine period defined in `package.json` `updateCheck.history`.

### Fix

This is informational in the pre-commit hook. To see the full update report:

```bash
npm run defence:update-check
```

To apply eligible updates only:

```bash
npm run defence:update
```

---

## Lockfile Integrity Failures

### Symptom

```text
Error: package-lock.json entry for some-package is missing integrity
```

### Cause

`package-lock.json` contains an entry without a SHA-512 `integrity` field. This can happen after manual edits or when using an older npm client.

### Fix

1. Run the integrity checker manually to see all affected packages:

```bash
npm run defence:check-lockfile-integrity
```

2. Regenerate the lock file safely:

```bash
npm run defence:bootstrap
```

3. Review the diff before committing.

---

## Pre-commit Hook Integrity Failures

### Symptom

```text
❌ Pre-commit hook hash mismatch
```

### Cause

`.husky/pre-commit` was modified and no longer matches the hash stored in `package.json` `defences.hookHash`.

### Fix

1. Do not ignore this error. It may indicate tampering or an accidental edit.
2. Compare the current file with the last known good version:

```bash
git diff HEAD -- .husky/pre-commit
```

3. If the change was intentional, update the hash in `package.json` after review:

```bash
npm run defence:check-hooks
```

4. If the change was accidental, restore the original file:

```bash
git checkout HEAD -- .husky/pre-commit
```

---

## Secret Scanner Failures

### Symptom

```text
Potential secret detected in .env.example: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Cause

`tools/check-secrets.js` found a string that looks like a secret token or credential.

### Fix

1. If the detected value is a real secret, rotate it immediately and remove it from the file and from Git history.
2. If the value is a documented placeholder, add it to `.check-secrets-ignore` with a comment explaining why it is safe to ignore. Example:

```text
# Placeholder PAT used in agent documentation, not a real secret
ghp_000000000000000000000000000000000000
```

3. Run the scanner manually to confirm the fix:

```bash
npm run defence:check-secrets
```

---

## Markdown Link Failures

### Symptom

```text
❌ docs/en/setup.md -> ./missing-file.md (404)
```

### Cause

A markdown link points to a file that does not exist or an external URL that returned an error.

### Fix

1. Run the link checker with verbose output:

```bash
npm run defence:check-md-links
```

2. Fix internal paths or remove broken external links.
3. If an external link is temporarily down but correct, consider replacing it with an archived version or documenting the temporary failure.

---

## Sync Check Failures

### Symptom

```text
node_modules is out of sync with package-lock.json
```

### Cause

`node_modules` was modified manually, a dependency was installed without updating the lock file, or a branch switch left stale packages.

### Fix

1. Run the sync check with the suggested fix:

```bash
npm run defence:sync-check -- --fix
```

2. Apply the printed command (usually `npm ci`).
3. Run `npm run setup` to verify everything is healthy.

---

## Setup Bootstrap Failures

### Symptom

```text
Error: package-lock.json is missing. Run `npm run defence:bootstrap` first.
```

### Cause

The repository has no `package-lock.json`, so `npm ci` cannot run deterministically.

### Fix

Run the controlled bootstrap, then commit the generated lock file:

```bash
npm run defence:bootstrap
```

Review `package.json` and `package-lock.json` before committing.

---

## Adoption / Install-Defences Failures

### Symptom

```text
Error: target directory is not a git repository
```

### Cause

`tools/install-defences.js` copies defenses only into existing Git repositories to preserve rollback capability.

### Fix

1. Initialize the target repository:

```bash
cd /path/to/target-project
git init
```

2. Re-run the install command:

```bash
node ./tools/install-defences.js /path/to/target-project
```

3. Verify the copied files against the manifest:

```bash
npm run defence:verify-defences
```

---

## Registry Cache Issues

### Symptom

A tool returns stale data or unexpected network errors after a registry outage.

### Cause

`tools/lib/registry-cache.js` caches registry responses on disk with a TTL. A stale cache may survive a registry incident.

### Fix

1. Force a cache refresh by deleting the cache directory. The default location is printed by the tool when `--verbose` is used.
2. To find the cache path, check `tools/lib/config.js` for the `registryCacheDir` value or the `.defence.config.json` override.
3. Re-run the failing tool and verify the output against the registry:

```bash
npm view some-package@1.0.0 --json
```

---

## Still Stuck?

If a failure does not match any entry above:

1. Run the individual command manually and capture the full output.
2. Check the [tools documentation](tools.md) for the script in question.
3. Open an issue with the output, your Node/npm versions, and the steps to reproduce.
