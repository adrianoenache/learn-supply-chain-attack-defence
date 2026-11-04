# Dogfooding Report — Fase M.1 (2026-11-03)

Adoption of this repository's defences into the real project
[`setup-webpack-stylus-liquid`](https://github.com/adrianoenache/setup-webpack-stylus-liquid)
(webpack/babel/postcss, 766 lockfile entries, one git-URL dependency).

This is a dated record of what installing the defence toolkit into a real,
pre-existing project surfaced — and what was fixed as a result.

## What worked out of the box

- The installer refused to silently overwrite the existing `.husky/pre-commit`
  and aborted on conflicting `package.json` scripts (`setup`, `lint`) — the
  documented escape (rename the target's scripts to `setup:legacy`/
  `lint:legacy`, then `--force` with automatic backups) worked as designed.
- After adoption: `check-engines` validates against the *target's* engines,
  `check-npmrc` validates the adopted `.npmrc`, the manifest verifies all 83
  copied files, and the husky wiring worked via the documented
  `npm run prepare` step.
- The adopted `.npmrc` immediately surfaced its posture: the project carried
  **29 known vulnerabilities (2 critical, 12 high)** that the adopted
  pre-commit gate now blocks on — the defense doing its job.

## Gaps found (and fixed in this repository)

| # | Finding | Fix |
| --- | --- | --- |
| 1 | Git-URL dependencies failed the registry age check with a confusing "no publish date" error | `check-package-age.js` skips non-registry specs with an advisory (they pin by commit, not publish date) |
| 2 | The same git dependency failed lockfile integrity as "missing integrity" | `check-lockfile-integrity.js` reports git/file deps in their own informational section |
| 3 | `check-sync` compared installed versions against the `package.json` **range** (`^8.0.1`), reporting false drift | The reference is now the lockfile's resolved version |
| 4 | The installer hardcoded devDependency pins (adopters got biome 2.5.8 while the project was on 2.6.3) | Versions are read from the source `package.json` at install time |
| 5 | The installer never wrote the defence config blocks, so adopted tools ran with defaults that differ from the documented behavior (the adopted `check-md-links` suite failed in the target) | Config blocks are merged when absent; the adopter's own blocks always win |
| 6 | The adopted `check-hooks` gate could never pass: no hook hash in the target's `package.json` | The installer writes `defences.huskyPreCommitHash` for the hook present after copying |
| 7 | The installer did not touch `.gitignore`, so tool caches/state could be committed | The installer merges the defence state entries into the target `.gitignore` |
| 8 | The config test asserted this repository's directory name; the SBOM CLI test truncated stdout at 1 MB — both only break inside an adopter | Tests are now host-name-agnostic and write the SBOM to a temp file via `--output` |

## Validation after the fixes

- Adopted suite in the target project: **549/549 tests passing** (the
  `.github/` sanity suites are not adopted — they guard this repository's own
  AI surface).
- The git dependency is classified correctly by both gates.
- Real-world relevance: the toolkit's value on this codebase is immediate —
  the vulnerabilities found are exactly what the layers exist to block.

## Lessons for the toolkit

- An installer that only copies files is not enough: configuration, integrity
  hashes, and ignore rules are part of the adopted surface.
- CLI tests that run against host state double as host-health probes — useful,
  but they must not encode this repository's name or size.
- Registry-centric gates need an explicit non-registry dependency path
  (git/file/URL specs) or they punish legitimate setups with confusing errors.
