# run-audit-with-retry

`run-audit-with-retry.js` wraps `npm audit` and retries on transient network errors while failing immediately on real vulnerability findings.

## What it does

- Runs `npm audit --audit-level=high` (the project's severity floor).
- Retries up to 3 times when npm exits with transient registry errors.
- Does not retry when vulnerabilities are actually reported.

Implemented in [tools/run-audit-with-retry.js](../../../tools/run-audit-with-retry.js).

## Usage

```bash
npm run defence:audit
```

## Output example

```text
found 0 vulnerabilities

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
```

(on transient registry failures, the wrapper reports `Audit attempt N/3 failed ... Retrying` and tries again with backoff; `--quiet` suppresses the forwarded npm report and the summary on success — failures always print)

## Related defense layer

- [Defense Layer 3 — Vulnerability audit](../security/defense-layer-3-vulnerabilities.md)
