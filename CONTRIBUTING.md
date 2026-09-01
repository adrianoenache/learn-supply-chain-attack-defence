# Contributing

Thank you for your interest in improving this project. This guide explains how to contribute in a way that keeps the codebase secure and consistent.

## Development Environment

- Node.js `>= 24.19.0`
- npm `>= 11.17.0`
- Git

## Workflow

1. Fork the repository and create a feature branch.
2. Make your changes.
3. Run `npm test`, `npm run lint`, and `npm run format -- --check`. All must pass.
4. Run `bash .husky/pre-commit` to simulate the commit gate.
5. Commit using clear messages in English.
6. Open a pull request describing what changed and why.
7. Ensure the CI pipeline is green before merging. Pull requests with failing CI checks will not be merged.

## CI Pipeline

The GitHub Actions workflow in `.github/workflows/ci.yml` runs the following jobs on pushes and pull requests to `main` and `dev`:

- **Setup** — reads the required Node.js and npm versions from `package.json`.
- **Test** — runs `npm test`.
- **Lint & Format** — runs `npm run lint` and checks formatting with `npm run format -- --check`.
- **Documentation Links** — runs `npm run defence:check-md-links`.
- **License Check** — runs `npm run defence:license-check:fail`.
- **Lockfile Integrity** — runs `npm run defence:check-lockfile-integrity`.
- **Secret Scan** — scans all tracked files with `npm run defence:check-secrets`.
- **Defence Gates** — runs engine, sync, package-age, signature, audit, and update checks.

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

## Security

If you find a security issue, please follow the instructions in [SECURITY.md](SECURITY.md).
