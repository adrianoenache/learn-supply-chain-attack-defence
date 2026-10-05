---
name: review-security
description: Review a change for npm supply-chain security risks against the project's defense layers. Use when a diff touches dependencies, install behavior, registry trust, secrets, hooks, or CI configuration.
argument-hint: "[change description or diff]"
disable-model-invocation: true
---
# Review Security

Review the change provided with the invocation for supply-chain security
risks. If no change was described, review the current uncommitted diff
(`git diff`) instead.

## Context

This project applies defense-in-depth to npm-based supply-chain attacks. The twelve defense layers are grouped as Core, Recommended, and Advanced. See `docs/en/security/index.md` and `docs/pt-BR/security/index.md`.

## Change to Review

Use the change description or diff provided with the invocation.

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
