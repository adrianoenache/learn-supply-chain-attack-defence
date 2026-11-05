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
⚠️ Lifecycle script analysis summary

Packages analyzed: 1
Packages with lifecycle scripts: 1
Overall risk level: HIGH
Findings: 2 (high: 1, medium: 1, low: 0)

<findings table>

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
```

With `--fail` on a high-risk package the exit code is 1 and the summary shows `1 failed` with a `Next:` hint. `--quiet` (alias `--silent`) suppresses the report and summary.

## Related defense layer

- [Lifecycle script analysis](../security/lifecycle-script-analysis.md)
- [Defense Layer 3 — Vulnerability audit](../security/defense-layer-3-vulnerabilities.md)
