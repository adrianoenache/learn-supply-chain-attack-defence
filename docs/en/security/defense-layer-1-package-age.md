# Defense Layer 1 — Package Age Check

The package-age check rejects packages that were published very recently. This gives the community time to spot malware before it enters the project.

## Minimum Age

The default minimum age is **7 days**.

## Implementation

Implemented in:

- [tools/check-package-age.js](../../../tools/check-package-age.js)
- [tools/add-package.js](../../../tools/add-package.js)
- [tools/update-packages.js](../../../tools/update-packages.js)
- [tools/lib/registry-cache.js](../../../tools/lib/registry-cache.js)
- [tools/lib/retry-fetch.js](../../../tools/lib/retry-fetch.js)

`check-package-age.js` reads `package.json` (direct dependencies) or `package-lock.json` (transitive dependencies) and queries the npm registry for the publish timestamp of each version. Registry requests go through the shared [`retry-fetch.js`](../../../tools/lib/retry-fetch.js) layer (gzip, response-size limits, and retry on transient failures) and are cached on disk by [`registry-cache.js`](../../../tools/lib/registry-cache.js) to avoid repeated downloads.

To bypass the registry cache while debugging, set:

```bash
DEFENCE_NO_CACHE=1 npm run defence:pkg-age-check
```

## Usage

```bash
# Direct dependencies only
npm run defence:pkg-age-check

# All dependencies, including transitive
npm run defence:pkg-age-check -- --transitive
```

## Why 7 Days?

Most malicious releases are detected within hours or days. A 7-day cooling-off period dramatically reduces the chance of installing a freshly published malicious package without significantly slowing down normal work.
