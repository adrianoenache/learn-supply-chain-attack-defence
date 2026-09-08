# update-badge

`update-badge.js` refreshes the test-count badge in `README.md` by counting `test()` calls across all `tools/*.test.js`, `tools/lib/*.test.js`, and `tools/perf/*.test.js` files.

## What it does

- Counts top-level `test(...)` invocations, ignoring nested tests and comments.
- Updates the badge string in `README.md` to `Tests-N/N passing`.
- Supports dry-run mode for CI checks.

Implemented in [tools/update-badge.js](../../../tools/update-badge.js).

## Usage

```bash
# Update README badge
npm run defence:update-badge

# Dry run
npm run defence:update-badge:dry-run
```

## Output example

```text
Updated test badge to 441/441 in README.md
```

## Related defense layer

- Documentation maintenance gate.
- Enforced by `.husky/pre-commit` to keep the badge accurate.
