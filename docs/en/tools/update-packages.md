# update-packages

`update-packages.js` is a controlled wrapper for `npm update` that re-runs defense gates after the update.

## What it does

- Runs `npm update` for eligible packages.
- Re-runs package-age checks, signature verification, vulnerability audit, and license checks.
- Supports interactive approval of each update.
- Supports dry-run mode for safe previewing.

Implemented in [tools/update-packages.js](../../../tools/update-packages.js).

## Usage

```bash
# Non-interactive update with post-checks
npm run defence:update

# Interactive approval
npm run defence:update -- --interactive

# Dry run preview
npm run defence:update -- --interactive --dry-run
```

## Output example

```text
Eligible updates: lodash 4.17.20 -> 4.17.21
Running npm update ...
Signature check: ok
License check: ok
Age check: ok
```

## Related defense layers

- [Defense Layer 1 — Package age check](../security/defense-layer-1-package-age.md)
- [Defense Layer 2 — Signature verification](../security/defense-layer-2-signatures.md)
- [Defense Layer 3 — Vulnerability audit](../security/defense-layer-3-vulnerabilities.md)
- [Defense Layer 9 — License check](../security/defense-layer-9-license-check.md)
