# analyze-lifecycle-scripts

`analyze-lifecycle-scripts.js` performs a static, read-only analysis of npm package lifecycle scripts before installation. It flags risky patterns without executing any code.

## What it does

- Fetches the package manifest from the registry.
- Extracts `scripts` entries such as `postinstall`, `preinstall`, and `prepare`.
- Classifies risk based on command patterns (network, shell, obfuscation, native compilation, etc.).
- Emits a table, JSON, or Markdown report.
- Exits non-zero when `--fail` is set and high-risk scripts are detected.

Implemented in [tools/analyze-lifecycle-scripts.js](../../../tools/analyze-lifecycle-scripts.js).

## Usage

```bash
# Analyze a specific package
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5

# JSON output for programmatic review
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5 --format=json

# Fail on high-risk scripts
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5 --fail
```

## Output example

```text
Package: sharp@0.33.5
postinstall: node (./install/libvips && node install/dll-copy)
Risk: high (native compilation, network)
```

## Related defense layer

- [Lifecycle script analysis](../security/lifecycle-script-analysis.md)
- [Defense Layer 3 — Vulnerability audit](../security/defense-layer-3-vulnerabilities.md)
