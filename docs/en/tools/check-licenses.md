# check-licenses

`check-licenses.js` scans dependencies and classifies their licenses against an allow-list and a prohibited list. It is read-only and safe to run at any time.

## What it does

- Reads direct or transitive dependencies from `package.json` and `package-lock.json`.
- Normalizes SPDX expressions including `OR` and `AND`.
- Classifies each license as allowed, prohibited, or unknown.
- Emits table, JSON, or Markdown reports.
- Fails on prohibited or unknown licenses when `--fail` is set.

Implemented in [tools/check-licenses.js](../../../tools/check-licenses.js).

## Configuration

Lists are configured in `package.json` under `licensesCheck`:

```json
{
  "licensesCheck": {
    "allowed": ["MIT", "Apache-2.0", "BSD-2-Clause", "BSD-3-Clause", "ISC", "0BSD"],
    "prohibited": ["GPL-3.0", "AGPL-3.0"],
    "failOnUnknown": false
  }
}
```

## Usage

```bash
# Scan direct dependencies
npm run defence:license-check

# Include transitive dependencies
npm run defence:license-check -- --transitive

# Fail if prohibited or unknown licenses are found
npm run defence:license-check -- --fail

# JSON output
npm run defence:license-check -- --format=json
```

## Output example

```text
Package          License   Status
lodash@4.17.21   MIT       allowed
```

## Related defense layer

- [Defense Layer 9 — License check](../security/defense-layer-9-license-check.md)
