# Project-Wide Instructions

These instructions apply to every chat request in this workspace. They are designed for GitHub Copilot / Kimi Code.

## Security-First Mindset

This repository teaches and applies defense-in-depth against npm supply-chain attacks. Every change must preserve or strengthen the existing security gates. Never bypass age checks, signature audits, vulnerability audits, license checks, or pre-commit hooks.

## Required Validation Commands

After editing or creating any code file, run before declaring the task complete (fix failures at the root cause):

- `npm run lint`
- `npm test`
- `npm run defence:check-md-links` (if markdown files changed)

## Dependency Policy

Never add a dependency with `npm install <pkg>` directly; always use `npm run defence:add -- pkg@x.y.z`, which enforces the age, signature, vulnerability, and license gates.

## Version Policy

Read `engines.node`/`engines.npm` from [`package.json`](../package.json) before proposing version changes; justify in a comment any version in code/tests that differs.

## Hardcoded Values

Intentional hardcoded values need an inline comment explaining why they are not configurable (see `.github/instructions/educational-code-quality.instructions.md`).

## Prevent Infinite Loops

Every repeating execution path needs a safeguard: explicit timeouts, iteration caps, or early return on repeated state.

## Context Before Action

Check the current conversation context before calling search/execution tools; avoid redundant tool calls.

## Bilingual Documentation

User-facing changes update both `docs/en/` and `docs/pt-BR/`, with terminology from the [glossary](../docs/en/glossary.md).

## No Secrets

Never generate or embed secrets, tokens, or credentials; use obviously fake, documented placeholders.

## Session Continuity and Plan Recovery

Session memory can be lost between chat sections. The authoritative plan is `.github/PLAN.md`; the session working copy lives in the harness-provided session files directory (e.g. `~/.copilot/session-state/<id>/files/plan.md` — the path varies by harness, so treat any session copy as disposable).

- Read `.github/PLAN.md` at session start and before any plan-related action; on divergence, `.github/PLAN.md` wins.
- After updating `.github/PLAN.md`, refresh the session copy and run `npm run lint`, `npm test`, and `npm run defence:check-md-links` if markdown changed.
