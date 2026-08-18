# Built with GitHub Copilot and Kimi K2.7 Code

This project was developed with the assistance of **GitHub Copilot**, powered by the **Kimi K2.7 Code** model.

## What the AI Helped With

GitHub Copilot was used as a pair-programming assistant throughout the project. The AI contributed to:

- Initial project structure and scaffolding.
- Drafting the defence scripts (`check-package-age.js`, `add-package.js`, `setup-bootstrap.js`, `update-packages.js`, `install-defences.js`).
- Writing unit and integration tests with the native Node.js test runner.
- Creating multilingual documentation (`docs/en/` and `docs/pt-BR/`).
- Refactoring for testability, such as the `spawnSync` injection pattern.
- Evaluating tooling choices, including the decision to adopt Biome over ESLint.

## What Was Reviewed by a Human

Every AI-generated suggestion was reviewed, validated, and adjusted by the project author. In particular, the following decisions were made manually:

- Security thresholds (e.g., `min-release-age=7`, `audit-level=high`).
- Exact dependency versions, verified against npm publication dates.
- The choice of Biome 2.5.8 based on the project's age policy.
- The sequence of checks in each defence script.
- All architectural and threat-model documentation.

## Why Document This

Transparency about AI-assisted development matters for:

- **Trust**: readers know which parts of the codebase were generated and which were human-validated.
- **Maintenance**: future contributors can identify sections that may need extra human review.
- **Learning**: the project is educational, so showing the collaboration between human and AI is part of the learning experience.

## Recommendation

If you reuse any code from this repository, review it carefully. AI-generated code can be a powerful starting point, but it is not a substitute for human judgment, especially in security-sensitive contexts.

_Last sync: 2026-08-18_.
