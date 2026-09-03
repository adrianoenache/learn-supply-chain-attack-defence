---
name: Release v1.0.0 Checklist
applyTo:
  - "docs/en/release-checklist.md"
  - "docs/pt-BR/release-checklist.md"
  - "package.json"
  - "package-lock.json"
  - "CHANGELOG.md"
  - ".defence-manifest.json"
tools:
  - read_file
  - grep_search
  - run_in_terminal
---

# Release v1.0.0 Checklist Skill

Use this skill when the project is ready to tag `v1.0.0`. This is the final action, only after `TODO.md` is 100% complete, all tests pass, and all documentation is synchronized.

## Goal

Execute the release checklist consistently and produce the v1.0.0 tag and GitHub Release.

## Procedure

1. **Confirm TODO.md is 100% complete.** No open P0/P1 items should remain.

2. **Run the full local validation matrix:**

   ```bash
   npm run lint
   npm test
   npm run test:coverage
   npm run defence:check-md-links
   npm run defence:license-check:fail
   npm run defence:check-engines
   npm run defence:sync-check
   npm run defence:pkg-age-check -- --transitive
   npm run defence:check-hooks
   npm run defence:generate-sbom -- --output=/tmp/sbom.json
   npm run defence:verify-defences
   bash .husky/pre-commit
   ```

3. **Bump the version.** Update `version` in `package.json` and `package-lock.json`.

4. **Update `CHANGELOG.md`.** Move the `[Unreleased]` content into a new `[1.0.0] - YYYY-MM-DD` section.

5. **Regenerate `.defence-manifest.json`** if any defence file changed:

   ```bash
   node -e "
   const { buildManifest, MANIFEST_NAME } = require('./tools/install-defences.js');
   const fs = require('node:fs');
   const path = require('node:path');
   const manifest = buildManifest('.');
   manifest.installedAt = new Date().toISOString();
   fs.writeFileSync(path.join('.', MANIFEST_NAME), JSON.stringify(manifest, null, 2) + '\n');
   console.log('Wrote', MANIFEST_NAME);
   "
   npm run defence:verify-defences
   ```

6. **Open a pull request to `main`.** Wait for all GitHub Actions jobs to pass.

7. **Merge the release PR.**

8. **Create and push the annotated tag:**

   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

9. **Create a GitHub Release** from the tag. Copy the relevant section from `CHANGELOG.md` and attach `/tmp/sbom.json`.

10. **Post-release verification.** Clone into a fresh directory and run:

    ```bash
    npm run setup
    npm test
    npm run defence:verify-defences
    ```

## Completion Criteria

- TODO.md has no open P0/P1 items.
- All local and CI gates passed.
- Version was bumped in `package.json` and `package-lock.json`.
- `CHANGELOG.md` reflects the v1.0.0 release.
- Git tag `v1.0.0` exists and points to `main`.
- GitHub Release is published with release notes and SBOM asset.

## Output

Produce a release summary:

1. PR and tag URLs.
2. List of gates executed and their results.
3. Result: "v1.0.0 released" or a list of blockers.
