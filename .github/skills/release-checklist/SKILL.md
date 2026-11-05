---
name: release-checklist
description: Execute the release checklist consistently and produce the version tag and GitHub Release notes. Use only when TODO.md has no open P0/P1 items, all tests pass, and all documentation is synchronized.
---

# Release Checklist Skill

Use this skill when the project is ready to tag a new version (`vX.Y.Z`). This is the final action, only after `TODO.md` has no open P0/P1 items, all tests pass, and all documentation is synchronized.

## Goal

Execute the release checklist consistently and produce the version tag and the GitHub Release notes.

## Procedure

Use the bundled [checklist-template.md](./checklist-template.md) as the working
artifact for the release execution: copy it, fill each item, and keep it out of
the repository (it is a scratch artifact, not a deliverable).

1. **Work in an isolated git worktree — mandatory.** Release work (version
   bump, release PR, tag) MUST NOT run in the main checkout shared with
   other sessions: a branch switch by another session mid-release corrupts
   the gates and their evidence. Create an isolated worktree (the session's
   isolation feature or `git worktree add`) and run `git fetch --all --prune`
   BEFORE cutting the release branch from `origin/dev`. Rule added on
   2026-11-05 — see `DECISIONS.md`.

2. **Confirm TODO.md is release-ready.** No open P0/P1 items should remain.

3. **Run the full local validation matrix:**

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

4. **Bump the version.** Update `version` in `package.json` and `package-lock.json`.

5. **Update `CHANGELOG.md`.** Move the `[Unreleased]` content into a new `[X.Y.Z] - YYYY-MM-DD` section.

6. **Regenerate `.defence-manifest.json`** if any defence file changed:

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

7. **Open a pull request to `main`.** Wait for all GitHub Actions jobs to pass.

8. **Merge the release PR.**

9. **Create and push the annotated tag** (example for v1.0.0):

   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

10. **Prepare the GitHub Release material** for the maintainer: the release
   notes text (the relevant `CHANGELOG.md` section) and the path of the SBOM
   asset (`/tmp/sbom.json`, regenerated from `main` after the merge). The
   maintainer publishes the GitHub Release from the tag.

11. **Post-release verification.** Clone into a fresh directory and run:

    ```bash
    npm run setup
    npm test
    npm run defence:verify-defences
    ```

## Completion Criteria

- TODO.md has no open P0/P1 items.
- All local and CI gates passed.
- Version was bumped in `package.json` and `package-lock.json`.
- `CHANGELOG.md` reflects the new release.
- The git tag `vX.Y.Z` exists and points to `main`.
- The GitHub Release notes text and SBOM asset path were delivered to the maintainer.

## Output

Produce a release summary:

1. PR and tag URLs.
2. List of gates executed and their results.
3. Result: "vX.Y.Z released" or a list of blockers.
