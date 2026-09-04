# Lifecycle Script Analysis

The `defence:analyze-lifecycle-scripts` command performs a **static, read-only analysis** of the lifecycle scripts declared by an npm package version before any code is installed. It fetches the package manifest from the registry, extracts scripts such as `preinstall`, `install`, `postinstall`, `prepare`, and `prepublish`, and flags common patterns that increase supply-chain risk.

## Why it matters

Lifecycle scripts run automatically during `npm install` unless they are blocked. This project already blocks them with `ignore-scripts=true` in `.npmrc`, which is the primary defense. The analyzer adds two things on top of that block:

1. **Visibility**: it tells you what *would* run if scripts were enabled, so you can decide whether a package is worth a manual `npm rebuild` step.
2. **Fail-fast gate**: it can abort `npm run defence:add` before installation when a package declares high-risk scripts such as outbound network calls, shell execution, or dynamic code evaluation.

## What is checked

The analyzer looks for patterns such as:

| Risk pattern | Severity | Example indicator |
| --- | --- | --- |
| Spawns a child process | high | `child_process`, `exec`, `spawn` |
| Dynamic code evaluation | high | `eval`, `Function(...)`, `new Function` |
| Outbound network request | high | `fetch(`, `https.get(`, `axios` |
| Filesystem write | medium | `fs.writeFileSync`, `writeFile` |
| Reads environment variables | medium | `process.env` |
| Changes permissions | high | `chmod`, `chown` |
| Compiles a native addon | medium | `node-gyp`, `prebuild-install` |
| Potentially obfuscated payload | medium | `atob`, `btoa`, long Base64 literals |

Patterns are matched with regular expressions. The analyzer is **not** a sandbox and cannot prove that a script is malicious; it only highlights behavior that is unusual for an install step and deserves review.

## Usage

```bash
# Default table report
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5

# JSON output for CI or further processing
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5 --format=json

# Exit non-zero on high-risk findings
npm run defence:analyze-lifecycle-scripts -- --pkg=sharp@0.33.5 --fail
```

You can also run the underlying module directly:

```bash
node ./tools/analyze-lifecycle-scripts.js --pkg=sharp@0.33.5
```

## Integration with `defence:add`

`tools/add-package.js` runs the analysis automatically after the provenance check and before `npm install`. The behavior is controlled by the `lifecycleScriptAnalysis` field in `package.json`:

```json
{
  "lifecycleScriptAnalysis": {
    "enabled": true,
    "failOn": "high"
  }
}
```

- `enabled` — set to `false` to skip the analysis entirely.
- `failOn` — abort installation when the package reaches this risk level. Allowed values: `high`, `medium`, `low`, `none`. The default is `high`.

When the analysis blocks an installation, you will see output similar to:

```text
Analyzing lifecycle scripts for risky-pkg@1.0.0...
  Found 1 lifecycle script(s)
  1 risky pattern(s) detected (risk level: high)
    [HIGH] postinstall: makes an outbound network request

Lifecycle script analysis FAILED for risky-pkg@1.0.0: risk level is high.
Installation aborted — review the package scripts or adjust lifecycleScriptAnalysis.failOn.
```

## Relationship to other defenses

- **Layer 6 — Hardened `.npmrc`**: `ignore-scripts=true` is the primary protection. The analyzer is a visibility layer on top of it.
- **Layer 11 — Provenance**: provenance tells you *who* built the package; lifecycle analysis tells you *what* the package tries to do at install time.
- **Rebuilding lifecycle-script packages**: when you deliberately install a package with safe lifecycle scripts that need to run (for example `esbuild` or `sharp`), follow the [rebuilding guide](rebuilding-lifecycle-packages.md).

## Limitations

- The analyzer only inspects the **direct package** being added. Transitive dependencies are not scanned in this first version.
- Regular-expression analysis can miss obfuscated code and may produce false positives. It is a triage tool, not a substitute for manual review.
- Native addons are flagged as medium risk because they compile platform-specific code, even though many popular packages do this legitimately.
