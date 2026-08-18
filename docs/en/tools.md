# Tools

This project relies on a small set of carefully chosen tools. Every tool is native to the Node.js ecosystem or written with native modules, keeping the supply-chain surface minimal.

## Runtime

### Node.js >= 24.16.0

The project targets a recent Node.js LTS line to guarantee support for:

- `node:test` and `node:assert/strict` (no third-party test framework).
- `min-release-age` enforcement in npm.
- Modern `fetch` and `AbortController` APIs if needed in the future.

### npm >= 11.13.0

npm is the package manager. The project uses it both for installation and as a security primitive through commands like `npm audit signatures` and `npm audit --audit-level=high`.

## Development Dependencies

### Husky 9.1.7

[Husky](https://typicode.github.io/husky/) manages Git hooks. It installs the `.husky/pre-commit` hook so every commit runs the project's defensive checks automatically.

**Selection criteria**:

- Widely adopted and minimal.
- Published for more than 7 days before adoption (verified by `defence:add`).
- No postinstall lifecycle scripts required in normal usage.

### Biome 2.5.8

[Biome](https://biomejs.dev/) is the project's linter and formatter. It replaces ESLint + Prettier with a single, fast toolchain.

**Selection criteria**:

- Unified linter and formatter.
- Native performance and small dependency footprint.
- Version 2.5.8 was at least 7 days old at the time of adoption (2026-08-18), satisfying `min-release-age=7`.

## Custom Scripts

All custom scripts live in `tools/` and use only native Node.js modules.

| Script | Purpose |
| --- | --- |
| `check-package-age.js` | Enforces minimum package age for direct or transitive dependencies. |
| `add-package.js` | Safely adds a dependency with age, signature, audit, and transitive checks. |
| `setup-bootstrap.js` | Performs a controlled first install when `package-lock.json` is missing. |
| `update-packages.js` | Controlled wrapper for `npm update` with post-update checks. |
| `install-defences.js` | Copies the defences into another Node.js project. |
| `lib/package-utils.js` | Shared utilities for parsing and validating package specifiers. |

## Why No Third-Party Test Framework?

The native `node:test` runner is sufficient for this project. Avoiding Jest, Mocha, or Vitest removes another dependency from the supply chain and keeps the setup reproducible with `npm ci`.

_Last sync: 2026-08-18_.
