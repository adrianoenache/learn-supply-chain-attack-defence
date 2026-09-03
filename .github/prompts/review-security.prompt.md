# Review Security

Review the following change for supply-chain security risks.

## Context

This project applies defense-in-depth to npm-based supply-chain attacks. The twelve defense layers are grouped as Core, Recommended, and Advanced. See `docs/en/security/index.md` and `docs/pt-BR/security/index.md`.

## Change to Review

```
__DESCRIBE_CHANGE_OR_PASTE_DIFF__
```

## Task

1. Identify which defense layers are affected by the change.
2. Check whether the change weakens, preserves, or strengthens each affected layer.
3. Look for secrets, unsafe installs, bypassed gates, or weakened hooks.
4. Propose concrete fixes if any risk is found.

## Constraints

- Do not suggest adding dependencies without `npm run defence:add`.
- Do not suggest bypassing age checks, signature audits, vulnerability audits, license checks, or hook integrity checks.
- If a gate must be bypassed, require explicit maintainer approval and documentation.

## Output

Provide:
1. A 1-2 sentence security impact summary.
2. Affected layers and risk level (none/low/medium/high/critical).
3. Required fixes or "Security review passed."
