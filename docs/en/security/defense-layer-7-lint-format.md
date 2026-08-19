# Defense Layer 7 — Lint / Format Gate

Biome enforces consistent code style and catches common mistakes before they reach the repository.

## What It Checks

The project uses [Biome](https://biomejs.dev/) as both linter and formatter:

- **Formatter**: consistent indentation, quotes, semicolons and line endings.
- **Linter**: recommended rules plus strict checks for unused imports and variables.

## Where It Runs

- `npm run lint` — report issues.
- `npm run lint:fix` — auto-fix safe issues.
- `npm run format` — format all configured files.
- `.husky/pre-commit` — blocks commits that fail `npm run lint`.

## Configuration

See [biome.json](../../../biome.json) for the full configuration. Key settings:

- Single quotes and optional semicolons for JavaScript.
- 2-space indentation.
- LF line endings.
- `noUnusedImports` and `noUnusedVariables` treated as errors.

## Why It Matters

A uniform codebase reduces cognitive load, simplifies reviews, and prevents trivial bugs (e.g., unused imports, missing variables) from being committed.

