# AI Guidelines

This project uses GitHub Copilot with the **Kimi 2.7 Code** model as a pair-programming assistant. These guidelines explain how AI is used, how humans should supervise it, and how the project keeps AI-generated output aligned with its security goals.

## AI Files in This Repository

The following files configure how AI assistants behave when working with this codebase:

| File | Purpose |
| --- | --- |
| [`.github/copilot-instructions.md`](../../.github/copilot-instructions.md) | Always-on instructions loaded on every chat request. |
| [`.github/instructions/security.instructions.md`](../../.github/instructions/security.instructions.md) | Context for `tools/**`, `.npmrc`, and `package.json`. |
| [`.github/instructions/testing.instructions.md`](../../.github/instructions/testing.instructions.md) | Context for `tools/**/*.test.js`. |
| [`.github/instructions/docs.instructions.md`](../../.github/instructions/docs.instructions.md) | Context for `docs/**/*.md` and `README.md`. |

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
3. If the same pattern repeats, add a short note to `.github/ai-lessons-learned.md` (created in a later phase) so future sessions start with that context.

## Why Not `docs/ai/`?

A separate `docs/ai/` directory could be mistaken for files that the AI reads during execution. The actual AI instructions live under `.github/`, where VS Code Copilot / Kimi 2.7 Code can discover them automatically. The human-readable explanation lives here, in the main documentation tree, alongside the other contributor guides.
