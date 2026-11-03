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
```

## Output example

```text
Checking publish age for 2 direct package(s) (minimum: 7 days)...

  OK       lodash@4.17.21 — published 2026-10-01 (32.5 days ago)

All packages passed the minimum age check.
```

## Related defense layer

- [Defense Layer 1 — Package age check](../security/defense-layer-1-package-age.md)

## Non-registry dependencies

Git URLs, `file:`/`link:`/`workspace:` specs, and tarball URLs cannot be age-checked against the registry — they pin by commit or path, not by publish date. The tool reports them as `SKIP` with an advisory (verify them manually) instead of failing with a registry-lookup error.
