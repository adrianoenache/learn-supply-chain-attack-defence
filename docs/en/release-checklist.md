# Release Checklist

Use this checklist before tagging a new release. Every gate below is also enforced in [CI](../../.github/workflows/ci.yml).

## Before Starting

- [ ] **Work in an isolated git worktree** — release work must never run in the main checkout shared with other sessions (a branch switch mid-release corrupts the gates and their evidence). Create the worktree, then run `git fetch --all --prune` *before* cutting the release branch from `origin/dev`.
- [ ] Confirm the release scope with the maintainers.
- [ ] Ensure `CHANGELOG.md` has an entry for the new version.
- [ ] Decide whether this is a patch, minor, or major version bump based on [SemVer](https://semver.org/).

## Version and Metadata

- [ ] Bump `version` in `package.json` and `package-lock.json`.
- [ ] Verify `engines.node` and `engines.npm` still match the project's supported runtime matrix.
- [ ] Verify `LICENSE` and `SECURITY.md` are up to date.
- [ ] Verify `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md` still reflect current practices.

## Quality Gates (local)

Run these commands locally and confirm they pass:

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:coverage`
- [ ] `npm run defence:check-md-links`
- [ ] `npm run defence:check-external-urls`
- [ ] `npm run defence:license-check:fail`
- [ ] `npm run defence:check-engines`
- [ ] `npm run defence:sync-check`

## Security Gates (local)

- [ ] `npm audit signatures`
- [ ] `npm audit --audit-level=high`
- [ ] `npm run defence:pkg-age-check -- --transitive`
- [ ] `npm run defence:check-hooks`
- [ ] `npm run defence:check-npmrc`
- [ ] `npm run defence:generate-sbom -- --output=/tmp/sbom.json`
- [ ] `npm run defence:verify-defences`

> **Note:** `defence:verify-defences` requires `.defence-manifest.json` to be committed. If a defence file changed, regenerate the manifest with the installer logic before committing.

## Secret Scan

- [ ] Run the same scan used in CI:

  ```bash
  git ls-files -z | xargs -0 -r npm run defence:check-secrets --
  ```

## Documentation

- [ ] Update both `docs/en/` and `docs/pt-BR/` if any user-facing behavior changed.
- [ ] Verify new markdown files are linked from `docs/en/index.md` and `docs/pt-BR/index.md`.
- [ ] Run `npm run defence:check-md-links` again after doc changes.
- [ ] Update `README.md` if the public-facing summary changed.

## CI / Pull Request

- [ ] Open a pull request to `main` (or `dev` for pre-releases).
- [ ] Confirm all GitHub Actions jobs pass, including the new `coverage` job.
- [ ] Review the generated coverage report and SBOM artifacts if they are uploaded.

## Tag and Release

- [ ] Merge the release pull request.
- [ ] Pull the latest `main` branch locally.
- [ ] Create an annotated tag:

  ```bash
  git tag -a vX.Y.Z -m "Release vX.Y.Z"
  git push origin vX.Y.Z
  ```

- [ ] Create a GitHub Release from the tag.
- [ ] Copy the relevant section from `CHANGELOG.md` into the release notes.
- [ ] Attach the generated SBOM (`sbom.json`) to the release assets.

## Post-Release Verification

- [ ] Clone the repository into a fresh directory and run `npm run setup`.
- [ ] Verify `npm test` still passes in the fresh clone.
- [ ] Verify `npm run defence:verify-defences` still passes in the fresh clone.
- [ ] **Merge `main` back into `dev`** — mandatory: the release merge commit on `main` is not in `dev`'s history, and both rulesets require "branches up to date before merging", so the *next* release PR would be blocked. Do not open a `main` → `dev` PR (circular) and do not use the "Update branch" button (`dev` requires changes via PR). Use an intermediate branch cut from `dev`'s tip:

  ```bash
  git checkout -b chore/merge-back-vX.Y.Z origin/dev
  git merge --no-ff origin/main
  git push -u origin chore/merge-back-vX.Y.Z
  # open a PR chore/merge-back-vX.Y.Z -> dev and merge it
  ```

- [ ] Close the release milestone if one exists.

## Node.js / npm Version Matrix

The project currently supports:

| Runtime | Minimum Version |
| --- | --- |
| Node.js | `>= 24.22.2` |
| npm | `>= 11.19.1` |

CI runs on the exact versions declared in `engines`. When bumping the matrix, use `npm run defence:update-engines` (or its `:update`/`:upgrade` variants), which updates the files below surgically, and verify the docs:

- `package.json` `engines`
- `.github/workflows/ci.yml` (uses `engines` dynamically)
- `docs/en/setup.md` and `docs/pt-BR/setup.md`
