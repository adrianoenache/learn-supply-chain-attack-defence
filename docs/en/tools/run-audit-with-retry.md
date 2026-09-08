# run-audit-with-retry

`run-audit-with-retry.js` wraps `npm audit` and retries on transient network errors while failing immediately on real vulnerability findings.

## What it does

- Runs `npm audit` with the default audit arguments.
- Retries up to 3 times when npm exits with transient registry errors.
- Does not retry when vulnerabilities are actually reported.

Implemented in [tools/run-audit-with-retry.js](../../../tools/run-audit-with-retry.js).

## Usage

```bash
npm run defence:audit
```

## Output example

```text
npm audit completed with no findings.
```

## Related defense layer

- [Defense Layer 3 — Vulnerability audit](../security/defense-layer-3-vulnerabilities.md)
