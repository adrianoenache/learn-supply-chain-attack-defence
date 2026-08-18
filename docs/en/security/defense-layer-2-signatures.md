# Defense Layer 2 — Signature Verification

npm can verify that packages were signed by the registry. This ensures the tarball was not tampered with after publication.

## Command

```bash
npm audit signatures
```

## Where It Runs

- `npm run setup`
- `npm run add`
- `.husky/pre-commit`

## What It Checks

npm compares the registry signature and key integrity of each installed package against the metadata in `package-lock.json`. A signature failure means either the package was modified in transit or the lock file is inconsistent with the registry.

## Failure Mode

If a signature is missing or invalid, the command exits with a non-zero code and blocks the rest of the workflow.

_Last sync: 2026-08-18_
