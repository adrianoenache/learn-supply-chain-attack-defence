# Defense Layer 3 — Vulnerability Audit

`npm audit` scans the installed dependency tree for known security advisories.

## Command

```bash
npm audit --audit-level=high
```

## Where It Runs

- `npm run defence:bootstrap` (during first install without `package-lock.json`)
- `npm run setup`
- `npm run defence:add`
- `npm run defence:update`
- `.husky/pre-commit`

## Audit Level

The project only allows `low`, `moderate`, or `info` vulnerabilities. Any `high` or `critical` advisory causes the command to fail.

## Fixing Vulnerabilities

If `npm audit` fails:

1. Update the affected dependency to a patched version.
2. Re-run `npm run defence:add -- <pkg>@<version>`.
3. If the advisory is a false positive for your use case, explicitly document the exception rather than lowering the audit level.

