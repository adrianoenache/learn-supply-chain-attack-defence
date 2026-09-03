# Project-Wide Instructions

These instructions apply to every chat request in this workspace. They are designed for GitHub Copilot / Kimi 2.7 Code.

## Security-First Mindset

This repository teaches and applies defense-in-depth against npm supply-chain attacks. Every change must preserve or strengthen the existing security gates. Do not propose shortcuts that bypass age checks, signature audits, vulnerability audits, license checks, or pre-commit hooks.

## Required Validation Commands

After editing or creating any code file, run these commands before declaring the task complete:

- `npm run lint`
- `npm test`
- `npm run defence:check-md-links` (if markdown files were changed)

If any command fails, fix the underlying issue before proceeding.

## Dependency Policy

Never add a dependency by running `npm install <package>` directly. Always use the security wrapper:

```bash
npm run defence:add -- pkg@x.y.z
```

New dependencies must pass the age check, signature audit, vulnerability audit, and license check before they can be committed.

## Version Policy

Before proposing changes to Node.js or npm versions, read `engines.node` and `engines.npm` from [`package.json`](../package.json). Do not introduce version numbers in code or tests without explaining why they differ from `package.json`.

## Hardcoded Values

Every intentional hardcoded value in code or tests must be accompanied by an inline comment explaining why that specific value remains hardcoded and is not configurable. Examples of acceptable hardcodes include parser edge-case fixtures, physical constants, and protocol defaults.

## Prevent Infinite Loops

Every execution path that can repeat must have a safeguard against infinite loops:

- Use explicit `timeout` options in tests and network calls.
- Cap iteration counts in loops that process external data.
- Return early when the same state is reached twice.
- Prefer bounded recursion or iterative algorithms.

## Context Before Action

Before calling a search or execution tool, check whether the information is already available in the current conversation context. Avoid redundant tool calls.

## Bilingual Documentation

When user-facing behavior changes, update both `docs/en/` and `docs/pt-BR/`. Keep terminology consistent with the [glossary](../docs/en/glossary.md).

## No Secrets

Do not generate, embed, or suggest secrets, tokens, or credentials in source files. If the project needs a placeholder, use an obviously fake value and document it.
