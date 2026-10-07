# AI Guidelines

This project uses GitHub Copilot with the **Kimi Code** model as a pair-programming assistant. These guidelines explain how AI is used, how humans should supervise it, and how the project keeps AI-generated output aligned with its security goals.

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
| [`.github/skills/`](../../.github/skills/) | Reusable step-by-step procedures for security audits, dependency reviews, doc updates, releases, self-review, script contract verification, educational code review, docs completeness, repository organization audits, and one-shot tasks (tests, security reviews, hardcode audits, architecture validation, and project status evaluation). |

> **VS Code 1.140:** support for `.github/prompts/*.prompt.md` was removed. The former one-shot prompts were converted into on-demand skills under `.github/skills/` with `disable-model-invocation: true`, so they run only when invoked explicitly via the `/` menu.
| [`.github/hooks/`](../../.github/hooks/) | GitHub Copilot lifecycle hooks that block dangerous tool calls, suggest validation commands after edits, and inject project context at session start. |
| [`.github/ai-lessons-learned.md`](../../.github/ai-lessons-learned.md) | Log of recurring AI mistakes and corrections used to improve instructions over time. |

These files are read by VS Code Copilot / Kimi Code when the workspace is opened. They do not change the model itself; they provide project-specific guardrails.

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

A separate `docs/ai/` directory could be mistaken for files that the AI reads during execution. The actual AI instructions live under `.github/`, where VS Code Copilot / Kimi Code can discover them automatically. The human-readable explanation lives here, in the main documentation tree, alongside the other contributor guides.

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

The [Agent Capability Matrix](../../.github/agents/README.md) lists every agent, its declared tools, and the tasks each agent can perform. Regenerate it with `node .github/agents/scripts/generate-capability-matrix.js` after editing any agent.

Skill frontmatters follow the [Agent Skills specification](https://code.visualstudio.com/docs/agent-customization/agent-skills) (VS Code 1.140): kebab-case `name` matching the folder, a `description` stating what the skill does and when to use it, and no legacy `applyTo`/`tools` fields. The sanity suite `.github/skills/skills.sanity.test.js` runs with `npm test` and fails loudly if a skill violates the spec, since VS Code silently skips invalid skills.

### Forked skills (experimental)

Skills that read many files or produce long intermediate reasoning run in a **forked context** (`context: fork` in the frontmatter): they execute in a dedicated subagent and only their final result returns to the parent conversation, keeping the main context clean. The current forked skills are `context-recovery`, `security-audit`, `repository-organization-audit`, `project-status-evaluation`, `docs-completeness`, and `validate-urls`.

> **Experimental requirement:** forked skills need the VS Code setting
> `github.copilot.chat.skillTool.enabled` (VS Code ≥ 1.140). If the behavior of
> this experimental feature changes, the rollback is simply removing
> `context: fork` from the frontmatter — the skills work inline either way.
> Any future skill with heavy read/report workloads should follow the same
> pattern.
>
> **Observed (2026-10-07, VS Code 1.141.0):** invoking a forked skill in both
> the Copilot SDK harness and the Agents Window executed it inline/background
> with no visible subagent indication. The field is kept because it is harmless
> when unsupported and may activate in future releases; re-validate after VS
> Code updates.

### Skill visibility matrix

Each skill has exactly one invocation mode, declared in its frontmatter:

| Mode | Frontmatter | In `/` menu | Auto-loaded by the model | Skills |
| --- | --- | --- | --- | --- |
| **Automatic** (default) | neither flag | ✅ Yes | ✅ Yes, when relevant | `dependency-review`, `docs-completeness`, `docs-update`, `educational-code-review`, `pre-commit-hash-sync`, `release-checklist`, `repository-organization-audit`, `script-contract-verification`, `security-audit`, `self-review`, `shell-script-review`, `validate-urls` |
| **Manual** | `disable-model-invocation: true` | ✅ Yes | ❌ No | `check-hardcoded-values`, `generate-test`, `project-status-evaluation`, `validate-architecture` |
| **Background** | `user-invocable: false` | ❌ No | ✅ Yes, when relevant | `context-recovery`, `subagent-invocation` |

Conventions (established 2026-10-07, Phase AI-2.2):

- New skills default to **automatic** unless there is a reason to restrict them.
- Use **manual** for one-shot task skills (converted from the removed prompt
  files) whose execution should always be an explicit user decision.
- Use **background** for knowledge the model should load when relevant but that
  would only add noise to the `/` menu.

Reusable skills include:

| Skill | Use When |
| --- | --- |
| [`.github/skills/security-audit/SKILL.md`](../../.github/skills/security-audit/SKILL.md) | Reviewing a change against the 12 defense layers. |
| [`.github/skills/dependency-review/SKILL.md`](../../.github/skills/dependency-review/SKILL.md) | Adding or evaluating a dependency. |
| [`.github/skills/docs-update/SKILL.md`](../../.github/skills/docs-update/SKILL.md) | Updating bilingual documentation after a behavior change. |
| [`.github/skills/release-checklist/SKILL.md`](../../.github/skills/release-checklist/SKILL.md) | Tagging a release. |
| [`.github/skills/self-review/SKILL.md`](../../.github/skills/self-review/SKILL.md) | Reviewing a previous AI output and improving instructions. |
| [`.github/skills/script-contract-verification/SKILL.md`](../../.github/skills/script-contract-verification/SKILL.md) | Verifying a defense script's CLI contract. |
| [`.github/skills/educational-code-review/SKILL.md`](../../.github/skills/educational-code-review/SKILL.md) | Reviewing code as a learning resource. |
| [`.github/skills/docs-completeness/SKILL.md`](../../.github/skills/docs-completeness/SKILL.md) | Auditing bilingual documentation completeness. |
| [`.github/skills/repository-organization-audit/SKILL.md`](../../.github/skills/repository-organization-audit/SKILL.md) | Auditing project structure and applyTo hygiene. |
| [`.github/skills/validate-urls/SKILL.md`](../../.github/skills/validate-urls/SKILL.md) | Step-by-step procedure for verifying external URLs before committing them. |
| [`.github/skills/pre-commit-hash-sync/SKILL.md`](../../.github/skills/pre-commit-hash-sync/SKILL.md) | Keeps `.husky/pre-commit` integrity hashes in sync after hook edits. |
| [`.github/skills/shell-script-review/SKILL.md`](../../.github/skills/shell-script-review/SKILL.md) | Reviews shell scripts for shebang, safety options, quoting, and JSON handling. |
| [`.github/skills/subagent-invocation/SKILL.md`](../../.github/skills/subagent-invocation/SKILL.md) | Verifies an agent's declared tool set before delegating work via `runSubagent`. Includes a decision tree, pre/post-delegation checklists, prompt templates, anti-patterns, and recovery steps. |
| [`.github/skills/context-recovery/SKILL.md`](../../.github/skills/context-recovery/SKILL.md) | Reconstructing project state at session start or after a break. |

On-demand skills for one-shot tasks (invoked explicitly via the `/` menu, with `disable-model-invocation: true`) include:

| Skill | Use When |
| --- | --- |
| [`.github/skills/generate-test/SKILL.md`](../../.github/skills/generate-test/SKILL.md) | Generating a test for a defense script. |
| [`.github/skills/check-hardcoded-values/SKILL.md`](../../.github/skills/check-hardcoded-values/SKILL.md) | Auditing hardcoded values. |
| [`.github/skills/validate-architecture/SKILL.md`](../../.github/skills/validate-architecture/SKILL.md) | Validating a change against project architecture. |
| [`.github/skills/project-status-evaluation/SKILL.md`](../../.github/skills/project-status-evaluation/SKILL.md) | Evaluating project readiness for release. |

> After VS Code 1.140 removed prompt file support, the former one-shot prompts were converted to skills. Five of them overlapped with existing skills and were merged: `review-security` into `security-audit`, `update-docs` into `docs-update`, `review-ai-output` into `self-review`, `verify-command-contract` into `script-contract-verification`, and `code-review-for-learning` into `educational-code-review`.

Lifecycle hooks follow the [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference) (`{ "version": 1, "hooks": { ... } }`) and include:

| Hook | Purpose |
| --- | --- |
| [`.github/hooks/enforce-security.json`](../../.github/hooks/enforce-security.json) | Denies dangerous `bash`/`powershell` tool calls such as direct `npm install` or removing `ignore-scripts`. |
| [`.github/hooks/auto-lint-test.json`](../../.github/hooks/auto-lint-test.json) | Suggests running lint, tests, link checks, doc-drift checks, and command-contract verification after file edits. |
| [`.github/hooks/inject-context.json`](../../.github/hooks/inject-context.json) | Injects project context (engines, TODO count, defence manifest) at session start. |
| [`.github/hooks/sync-pre-commit-hash.json`](../../.github/hooks/sync-pre-commit-hash.json) | Reminds agents to update integrity hashes after `.husky/pre-commit` edits. |
| [`.github/hooks/enforce-shell-script-standards.json`](../../.github/hooks/enforce-shell-script-standards.json) | Reminds agents to review shell scripts against project standards after edits. |
| [`.github/hooks/subagent-invocation.json`](../../.github/hooks/subagent-invocation.json) | Validates `runSubagent` calls, emitting educational, warning, or blocking context based on the target agent's declared tools. |

Hook implementations live in [`.github/hooks/scripts/`](../../.github/hooks/scripts/).

Hook configs are validated by `.github/hooks/hooks.sanity.test.js` (registered in `npm test`): it fails loudly when a hook JSON is malformed, uses an undocumented event, references a missing script, or when a hook script mentions a skill that does not exist — the Copilot hooks loader drops malformed items silently, so these checks are the only early warning. Post-edit hooks scope their suggestions by file path inside the scripts (lint for `tools/**`, tests for any `*.test.js`, link checks for docs), keeping unrelated edits free of noise.
