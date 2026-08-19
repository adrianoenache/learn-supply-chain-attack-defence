# Defense Layer 1 — Package Age Check

The package-age check rejects packages that were published very recently. This gives the community time to spot malware before it enters the project.

## Minimum Age

The default minimum age is **7 days**.

## Implementation

Implemented in:

- [tools/check-package-age.js](../../../tools/check-package-age.js)
- [tools/add-package.js](../../../tools/add-package.js)
- [tools/update-packages.js](../../../tools/update-packages.js)

`check-package-age.js` reads `package.json` (direct dependencies) or `package-lock.json` (transitive dependencies), queries the npm registry for the publish timestamp of each version, and fails if any package is too new.

## Usage

```bash
# Direct dependencies only
npm run defence:pkg-age-check

# All dependencies, including transitive
npm run defence:pkg-age-check -- --transitive
```

## Why 7 Days?

Most malicious releases are detected within hours or days. A 7-day cooling-off period dramatically reduces the chance of installing a freshly published malicious package without significantly slowing down normal work.
