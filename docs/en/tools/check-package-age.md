# check-package-age

`check-package-age.js` rejects packages that were published too recently. It is the first line of defense against freshly published malware.

## What it does

- Reads direct dependencies from `package.json` or transitive dependencies from `package-lock.json`.
- Queries the npm registry for each package's publish timestamp.
- Compares the age against `pkgAgeCheck.minAgeDays`.
- Uses a disk-backed registry cache and shared retry layer to reduce registry load.

Implemented in [tools/check-package-age.js](../../../tools/check-package-age.js).

## Configuration

Minimum age is configured in `package.json`:

```json
{
  "pkgAgeCheck": {
    "minAgeDays": 7
  }
}
```

To bypass the cache while debugging:

```bash
DEFENCE_NO_CACHE=1 npm run defence:pkg-age-check
```

## Usage

```bash
# Direct dependencies only
npm run defence:pkg-age-check

# Include transitive dependencies
npm run defence:pkg-age-check -- --transitive

# Check a single package
npm run defence:pkg-age-check -- --pkg lodash@4.17.21

# Quiet mode: suppress success output, keep failures (CI)
npm run defence:pkg-age-check -- --quiet
```

`--silent` is kept as a compatibility alias of `--quiet`.

## Output example

```text
Checking publish age for 2 declared (package.json) package(s) (minimum: 7 days)...

  ✓ OK   lodash@4.17.21 — published 2026-10-01 (32.5 days ago)
  ✓ OK   husky@9.1.7 — published 2026-08-01 (94.0 days ago)

── Summary ───────────────────────────────────────────
  ✓ OK   2 passed
```

When a package is below the minimum age, the run fails and the summary points to the next step:

```text
Package age check FAILED — 1 package(s) below minimum age of 7 days:
  ✗ FAIL fresh-pkg@1.0.0 — published 2026-11-04 (1.2 days ago)

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
  ✗ FAIL 1 failed
  Next: inspect publish dates with `npm view <pkg> time` or pin an older version
```

## Related defense layer

- [Defense Layer 1 — Package age check](../security/defense-layer-1-package-age.md)

## Non-registry dependencies

Git URLs, `file:`/`link:`/`workspace:` specs, and tarball URLs hosted outside the configured registry cannot be age-checked against the registry — they pin by commit or path, not by publish date. The tool reports them as `SKIP` with an advisory (verify them manually) instead of failing with a registry-lookup error. In `--transitive` mode the lockfile's `resolved` URL is compared against the configured registry host, so registry tarballs are still checked normally.
