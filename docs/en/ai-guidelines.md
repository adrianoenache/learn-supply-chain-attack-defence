# AI Guidelines

This project uses GitHub Copilot with the **Kimi 2.7 Code** model as a pair-programming assistant. These guidelines explain how AI is used, how humans should supervise it, and how the project keeps AI-generated output aligned with its security goals.

## AI Files in This Repository

The following files configure how AI assistants behave when working with this codebase:

| File or Directory | Purpose |
| --- | --- |
| [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) | Always-on instructions loaded on every chat request. |
| [`.github/instructions/security.instructions.md`](../../.github/instructions/security.instructions.md) | Context for `tools/**`, `.npmrc`, and `package.json`. |
| [`.github/instructions/testing.instructions.md`](../../.github/instructions/testing.instructions.md) | Context for `tools/**/*.test.js`. |
| [`.github/instructions/docs.instructions.md`](../../.github/instructions/docs.instructions.md) | Context for `docs/**/*.md` and `README.md`. |
| [`.github/agents/`](../../.github/agents/) | Specialized agents for security, quality, performance, docs, and compliance reviews. |
| [`.github/skills/`](../../.github/skills/) | Reusable step-by-step procedures for security audits, dependency reviews, doc updates, releases, and self-review. |
| [`.github/prompts/`](../../.github/prompts/) | One-shot prompt templates for tests, security reviews, doc updates, hardcode audits, and AI output review. |
| [`.github/hooks/`](../../.github/hooks/) | Lifecycle hooks that warn or block high-risk requests and suggest validation commands. |
| [`.github/ai-lessons-learned.md`](../../.github/ai-lessons-learned.md) | Log of recurring AI mistakes and corrections used to improve instructions over time. |

These files are read by VS Code Copilot / Kimi 2.7 Code when the workspace is opened. They do not change the model itself; they provide project-specific guardrails.

## Security Rules for AI Interactions

When asking the AI to change code or documentation, keep the following rules in mind:

1. **Never weaken a security gate.** Do not ask the AI to skip age checks, signature audits, license checks, or pre-commit steps.
2. **Never add a dependency directly.** Always route new packages through `npm run defence:add` so the age, signature, audit, and license gates run.
3. **Always validate after changes.** After the AI edits or creates code, run:
   - `npm run lint`
   - `npm test`
   - `npm run defence:check-md-links` (for markdown changes)
4. **Prevent infinite loops.** Every AI-driven execution should have a timeout, iteration limit, or explicit stop condition.
5. **Justify hardcoded values.** If the AI leaves a literal value in code, it must add a comment explaining why that value is not configurable.
6. **Keep documentation bilingual.** When the AI changes user-facing behavior, update both `docs/en/` and `docs/pt-BR/`.

## Human Review

Every AI-generated suggestion must be reviewed by a human before it is committed. Pay special attention to:

- Security thresholds and policy decisions.
- Dependency versions and license compatibility.
- Changes to `.husky/pre-commit`, `.npmrc`, or `package.json`.
- New test cases and coverage impact.

## Feedback Loop

When the AI makes a mistake that is not caught by existing instructions:

1. Correct the mistake in the code or documentation.
2. Update `.github/copilot-instructions.md` or the relevant `.github/instructions/*.md` so the same mistake is less likely to happen again.
3. If the mistake fits a specific domain, update the matching `.github/agents/*.agent.md`.
4. If the same pattern repeats, add a short note to [`.github/ai-lessons-learned.md`](../../.github/ai-lessons-learned.md) so future sessions start with that context.
5. Review `.github/ai-lessons-learned.md` at the end of each phase or before a release to identify instruction gaps.

## Why Not `docs/ai/`?

A separate `docs/ai/` directory could be mistaken for files that the AI reads during execution. The actual AI instructions live under `.github/`, where VS Code Copilot / Kimi 2.7 Code can discover them automatically. The human-readable explanation lives here, in the main documentation tree, alongside the other contributor guides.

## Available Agents and Skills

The following specialized agents can be invoked explicitly or matched automatically based on the files being edited:

| Agent | Scope |
| --- | --- |
| [`.github/agents/security.agent.md`](../../.github/agents/security.agent.md) | Security reviews for dependencies, hooks, `.npmrc`, `package.json`, CI. |
| [`.github/agents/quality.agent.md`](../../.github/agents/quality.agent.md) | Lint, tests, coverage, hardcoded values. |
| [`.github/agents/performance.agent.md`](../../.github/agents/performance.agent.md) | Cache, retry, network usage, benchmarks. |
| [`.github/agents/docs.agent.md`](../../.github/agents/docs.agent.md) | Bilingual docs, links, glossary, markdown quality. |
| [`.github/agents/compliance.agent.md`](../../.github/agents/compliance.agent.md) | Licenses, SBOM, adoption manifest, release readiness. |

Reusable skills include:

| Skill | Use When |
| --- | --- |
| [`.github/skills/security-audit/SKILL.md`](../../.github/skills/security-audit/SKILL.md) | Reviewing a change against the 12 defense layers. |
| [`.github/skills/dependency-review/SKILL.md`](../../.github/skills/dependency-review/SKILL.md) | Adding or evaluating a dependency. |
| [`.github/skills/docs-update/SKILL.md`](../../.github/skills/docs-update/SKILL.md) | Updating bilingual documentation. |
| [`.github/skills/release-checklist/SKILL.md`](../../.github/skills/release-checklist/SKILL.md) | Tagging a release. |
| [`.github/skills/self-review/SKILL.md`](../../.github/skills/self-review/SKILL.md) | Reviewing a previous AI output and improving instructions. |
