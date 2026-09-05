# Contributing

Thank you for your interest in improving this project. This guide explains how to contribute in a way that keeps the codebase secure and consistent.

## Development Environment

- Node.js `>= 24.19.0`
- npm `>= 11.17.0`
- Git

## Workflow

1. Fork the repository and create a feature branch from `dev`.
2. Make your changes.
3. Run `npm test`, `npm run lint`, and `npm run format -- --check`. All must pass.
4. Run `bash .husky/pre-commit` to simulate the commit gate.
5. Commit using clear messages in English.
6. Open a pull request against `dev` describing what changed and why.
7. Ensure the CI pipeline is green before merging. Pull requests with failing CI checks will not be merged.

For the branch strategy, required checks, and pre-PR checklist, see [docs/en/git-workflow.md](docs/en/git-workflow.md).

## CI Pipeline

The GitHub Actions workflow in `.github/workflows/ci.yml` is documented in [docs/en/ci-cd-overview.md](docs/en/ci-cd-overview.md). It runs on pushes to `dev` and pull requests to `main` and `dev` with the following jobs:

- **build** — installs dependencies once with `npm ci`, validates the workflow with `actionlint`, and uploads `node_modules` as a run-scoped artifact.
- **test** — runs `npm test` against the downloaded artifact.
- **coverage** — measures test coverage against the downloaded artifact.
- **lint** — runs `npm run lint`.
- **format** — checks formatting with `npx biome format tools/ --check`.
- **docs** — runs `npm run defence:check-md-links`.
- **license** — runs `npm run defence:license-check:fail`.
- **lockfile-integrity** — runs `npm run defence:check-lockfile-integrity`.
- **secrets** — scans all tracked files with `npm run defence:check-secrets`.
- **install-defences-dry-run** — verifies `.defence-manifest.json` and dry-runs the installer.
- **defence-gates** — runs engine, sync, package-age, hook, signature, audit, and update checks; generates and uploads an SBOM artifact.

## Adding Dependencies

Never run `npm install <package>` directly. Always use the security wrapper:

```bash
npm run defence:add -- pkg@x.y.z
```

For dev dependencies:

```bash
npm run defence:add -- --dev pkg@x.y.z
```

See [docs/en/dependencies.md](docs/en/dependencies.md) for details.

## Documentation

- Update both `docs/en/` and `docs/pt-BR/` when changing user-facing behavior.
- Keep the README in sync with major changes.
- Run `npm run defence:check-md-links` after editing markdown files.

## Code Style

The project uses Biome for linting and formatting. Run these commands before committing:

```bash
npm run lint      # report issues
npm run lint:fix  # auto-fix safe issues
npm run format    # format files
```

## Hardcoded Values

Every intentional hardcoded value in code or tests must be accompanied by an inline comment explaining why that specific value remains hardcoded and is not configurable. Examples of acceptable hardcodes include parser edge-case fixtures, physical constants, and protocol defaults.

This rule keeps the codebase maintainable and helps both human reviewers and AI assistants understand which values should stay fixed.

## AI-Assisted Contributions

This project uses GitHub Copilot / Kimi 2.7 Code with explicit instructions in `.github/copilot-instructions.md`. When contributing with AI assistance:

- Follow the security-first mindset and do not bypass any defense gate.
- Run `npm test`, `npm run lint`, and `npm run defence:check-md-links` after AI-generated changes.
- Review AI output carefully before committing, especially changes to `.npmrc`, `.husky/pre-commit`, and `package.json`.
- See [docs/en/ai-guidelines.md](docs/en/ai-guidelines.md) for the full collaboration guidelines.

## Security

If you find a security issue, please follow the instructions in [SECURITY.md](SECURITY.md).
