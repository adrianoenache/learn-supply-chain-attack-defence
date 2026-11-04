# Release v1.0.0 — Execution Checklist

Fill in the date and check each item as it is completed. Copy this file to a
scratch location (or a scratch branch note) when executing a release; do not
commit the filled copy.

Release date: ____-__-__
Executor: ______________________

## 1. Preconditions

- [ ] `TODO.md` has no open P0/P1 items.
- [ ] `.github/PLAN.md` marks all pre-release phases complete.
- [ ] Explicit maintainer approval for the release was given.

## 2. Local validation matrix

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:coverage` — line coverage ≥ 95%
- [ ] `npm run defence:check-md-links`
- [ ] `npm run defence:license-check:fail`
- [ ] `npm run defence:check-engines`
- [ ] `npm run defence:sync-check`
- [ ] `npm run defence:pkg-age-check -- --transitive`
- [ ] `npm run defence:check-hooks`
- [ ] `npm run defence:generate-sbom -- --output=/tmp/sbom.json`
- [ ] `npm run defence:verify-defences`
- [ ] `bash .husky/pre-commit`

## 3. Version and changelog

- [ ] `version` bumped in `package.json` and `package-lock.json`.
- [ ] `CHANGELOG.md` `[Unreleased]` content moved to `[1.0.0] - YYYY-MM-DD`.
- [ ] `.defence-manifest.json` regenerated if any defence file changed, and
      `npm run defence:verify-defences` passes.

## 4. Pull request and merge

- [ ] Pull request from `dev` to `main` opened.
- [ ] All GitHub Actions jobs passed.
- [ ] PR merged.

## 5. Tag and GitHub Release

- [ ] `git checkout main && git pull origin main`
- [ ] `git tag -a v1.0.0 -m "Release v1.0.0"`
- [ ] `git push origin v1.0.0`
- [ ] GitHub Release created from the tag with the `CHANGELOG.md` section and
      the SBOM asset (`/tmp/sbom.json`) attached.

## 6. Post-release verification (fresh clone)

- [ ] `npm run setup`
- [ ] `npm test`
- [ ] `npm run defence:verify-defences`

## Result

- [ ] v1.0.0 released — PR: ______ Tag: ______ Release: ______
