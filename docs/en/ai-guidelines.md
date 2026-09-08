# AI Guidelines

This project uses GitHub Copilot with the **Kimi 2.7 Code** model as a pair-programming assistant. These guidelines explain how AI is used, how humans should supervise it, and how the project keeps AI-generated output aligned with its security goals.

## AI Files in This Repository

The following files configure how AI assistants behave when working with this codebase:

| File or Directory | Purpose |
| --- | --- |
| [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) | Always-on instructions loaded on every chat request. |
| [`.github/instructions/security.instructions.md`](../../.github/instructions/security.instructions.md) | Context for `tools/**`, `.npmrc`, and `package.json`. |
| [`.github/instructions/testing.instructions.md`](../../.github/instructions/testing.instructions.md) | Context for `tools/**/*.test.js`. |
| [`.github/instructions/shell-scripts.instructions.md`](../../.github/instructions/shell-scripts.instructions.md) | Standards for `.sh` files, Husky hooks, and hook scripts. |
| [`.github/instructions/docs.instructions.md`](../../.github/instructions/docs.instructions.md) | Context for `docs/**/*.md` and `README.md`. |
| [`.github/instructions/educational-code-quality.instructions.md`](../../.github/instructions/educational-code-quality.instructions.md) | Rules for writing code as a learning resource. |
| [`.github/instructions/file-organization.instructions.md`](../../.github/instructions/file-organization.instructions.md) | Rules for file placement and project structure. |
| [`.github/instructions/project-evaluation.instructions.md`](../../.github/instructions/project-evaluation.instructions.md) | Criteria for status reports and release readiness. |
| [`.github/agents/`](../../.github/agents/) | Specialized agents for security, quality, performance, docs, compliance, command execution, code review, repository organization, and project evaluation. |
| [`.github/skills/`](../../.github/skills/) | Reusable step-by-step procedures for security audits, dependency reviews, doc updates, releases, self-review, script contract verification, educational code review, docs completeness, and repository organization audits. |
| [`.github/prompts/`](../../.github/prompts/) | One-shot prompt templates for tests, security reviews, doc updates, hardcode audits, AI output review, code review for learning, command contract verification, architecture validation, and project status evaluation. |
| [`.github/hooks/`](../../.github/hooks/) | GitHub Copilot lifecycle hooks that block dangerous tool calls, suggest validation commands after edits, and inject project context at session start. |
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

## URL Validation

Before adding external URLs to documentation, AI customizations, or configuration files, verify they are reachable. Fictional URLs inside CLI output examples must be marked as illustrative. Intentionally kept dead URLs must be registered in `.github/known-dead-urls.md`.

Run `npm run defence:check-external-urls` after editing files that contain URLs.

## Human Review

Every AI-generated suggestion must be reviewed by a human before it is committed. Pay special attention to:

- Security thresholds and policy decisions.
- Dependency versions and license compatibility.
- Changes to `.husky/pre-commit`, `.npmrc`, or `package.json`.
- New test cases and coverage impact.

If `.husky/pre-commit` is modified, the agent must also update
`defences.huskyPreCommitHash` in `package.json` and run
`npm run defence:verify-defences:fix` before the human review.

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
| [`.github/agents/command-execution.agent.md`](../../.github/agents/command-execution.agent.md) | Safe subprocess execution, CLI argument parsing, command contracts. |
| [`.github/agents/code-review.agent.md`](../../.github/agents/code-review.agent.md) | Educational code review: clarity, headers, error messages, hardcoded values. |
| [`.github/agents/repository-organization.agent.md`](../../.github/agents/repository-organization.agent.md) | File structure, applyTo patterns, orphaned files, manifest integrity. |
| [`.github/agents/project-evaluation.agent.md`](../../.github/agents/project-evaluation.agent.md) | Release readiness, status reports, 10/10 quality score assessment. |

Reusable skills include:

| Skill | Use When |
| --- | --- |
| [`.github/skills/security-audit/SKILL.md`](../../.github/skills/security-audit/SKILL.md) | Reviewing a change against the 12 defense layers. |
| [`.github/skills/dependency-review/SKILL.md`](../../.github/skills/dependency-review/SKILL.md) | Adding or evaluating a dependency. |
| [`.github/skills/docs-update/SKILL.md`](../../.github/skills/docs-update/SKILL.md) | Updating bilingual documentation. |
| [`.github/skills/release-checklist/SKILL.md`](../../.github/skills/release-checklist/SKILL.md) | Tagging a release. |
| [`.github/skills/self-review/SKILL.md`](../../.github/skills/self-review/SKILL.md) | Reviewing a previous AI output and improving instructions. |
| [`.github/skills/script-contract-verification/SKILL.md`](../../.github/skills/script-contract-verification/SKILL.md) | Verifying a defense script's CLI contract. |
| [`.github/skills/educational-code-review/SKILL.md`](../../.github/skills/educational-code-review/SKILL.md) | Reviewing code as a learning resource. |
| [`.github/skills/docs-completeness/SKILL.md`](../../.github/skills/docs-completeness/SKILL.md) | Auditing bilingual documentation completeness. |
| [`.github/skills/repository-organization-audit/SKILL.md`](../../.github/skills/repository-organization-audit/SKILL.md) | Auditing project structure and applyTo hygiene. |
| [`.github/skills/validate-urls/SKILL.md`](../../.github/skills/validate-urls/SKILL.md) | Step-by-step procedure for verifying external URLs before committing them. |
| [`.github/skills/pre-commit-hash-sync/SKILL.md`](../../.github/skills/pre-commit-hash-sync/SKILL.md) | Keeps `.husky/pre-commit` integrity hashes in sync after hook edits. |
| [`.github/skills/shell-script-review/SKILL.md`](../../.github/skills/shell-script-review/SKILL.md) | Reviews shell scripts for shebang, safety options, quoting, and JSON handling. |
| [`.github/skills/subagent-invocation/SKILL.md`](../../.github/skills/subagent-invocation/SKILL.md) | Verifies an agent's declared tool set before delegating work via `runSubagent`. |

Prompts for one-shot tasks include:

| Prompt | Use When |
| --- | --- |
| [`.github/prompts/generate-test.prompt.md`](../../.github/prompts/generate-test.prompt.md) | Generating a test for a defense script. |
| [`.github/prompts/review-security.prompt.md`](../../.github/prompts/review-security.prompt.md) | Reviewing a change for security risks. |
| [`.github/prompts/update-docs.prompt.md`](../../.github/prompts/update-docs.prompt.md) | Updating documentation after a change. |
| [`.github/prompts/check-hardcoded-values.prompt.md`](../../.github/prompts/check-hardcoded-values.prompt.md) | Auditing hardcoded values. |
| [`.github/prompts/review-ai-output.prompt.md`](../../.github/prompts/review-ai-output.prompt.md) | Reviewing a previous AI output. |
| [`.github/prompts/code-review-for-learning.prompt.md`](../../.github/prompts/code-review-for-learning.prompt.md) | Reviewing code as a learning resource. |
| [`.github/prompts/verify-command-contract.prompt.md`](../../.github/prompts/verify-command-contract.prompt.md) | Verifying a script's command contract. |
| [`.github/prompts/validate-architecture.prompt.md`](../../.github/prompts/validate-architecture.prompt.md) | Validating a change against project architecture. |
| [`.github/prompts/project-status-evaluation.prompt.md`](../../.github/prompts/project-status-evaluation.prompt.md) | Evaluating project readiness for release. |

Lifecycle hooks follow the [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference) (`{ "version": 1, "hooks": { ... } }`) and include:

| Hook | Purpose |
| --- | --- |
| [`.github/hooks/enforce-security.json`](../../.github/hooks/enforce-security.json) | Denies dangerous `bash`/`powershell` tool calls such as direct `npm install` or removing `ignore-scripts`. |
| [`.github/hooks/auto-lint-test.json`](../../.github/hooks/auto-lint-test.json) | Suggests running lint, tests, link checks, doc-drift checks, and command-contract verification after file edits. |
| [`.github/hooks/inject-context.json`](../../.github/hooks/inject-context.json) | Injects project context (engines, TODO count, defence manifest) at session start. |
| [`.github/hooks/sync-pre-commit-hash.json`](../../.github/hooks/sync-pre-commit-hash.json) | Reminds agents to update integrity hashes after `.husky/pre-commit` edits. |
| [`.github/hooks/enforce-shell-script-standards.json`](../../.github/hooks/enforce-shell-script-standards.json) | Reminds agents to review shell scripts against project standards after edits. |

Hook implementations live in [`.github/hooks/scripts/`](../../.github/hooks/scripts/).
