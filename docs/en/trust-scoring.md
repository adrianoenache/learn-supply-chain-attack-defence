# Trust Score Dashboard

The trust score dashboard aggregates supply-chain risk signals that the project already collects into a single 0–100 score per package and a project-wide summary. It is a read-only, post-analysis visibility layer: it does not install or modify anything.

## What it measures

| Signal | Source | Safe direction |
|---|---|---|
| Publish age | Registry `time[version]` | Older releases score higher |
| Release cadence | `.defence-update-check-state.json` | Slower cadence scores higher |
| Weekly downloads | `api.npmjs.org/downloads/point/last-week` | More downloads score higher |
| Maintainer count | Registry `versions[version].maintainers` | More maintainers score higher |
| Provenance | npm attestations endpoint | Valid provenance scores higher |
| Typosquatting | Levenshtein distance vs. existing names | No conflicts score higher |
| Lifecycle script risk | Static analysis of lifecycle scripts | No risky patterns score higher |
| License | `package-lock.json` entries | Allowed licenses score higher |

## Score labels

- **trusted** — 70–100
- **review required** — 40–69
- **high risk** — 0–39

## Usage

```bash
# Default: Markdown report for all transitive dependencies
npm run defence:trust-report

# JSON output
npm run defence:trust-report -- --format=json

# Single package
npm run defence:trust-report -- --pkg=lodash@4.17.21

# Only direct dependencies
npm run defence:trust-report -- --direct

# Fail (exit code 1) if any package is below the configured minimum
npm run defence:trust-report -- --fail

# Custom output file
npm run defence:trust-report -- --output=reports/trust-report.md
```

## Configuration

Add a `trustReport` block to `package.json`:

```json
"trustReport": {
  "enabled": true,
  "failOnMinScore": false,
  "minScore": 60,
  "concurrency": 10,
  "registryTimeoutMs": 10000,
  "cacheTtlHours": 24,
  "outputFile": "trust-report.md",
  "scoringWeights": {
    "age": 20,
    "cadence": 10,
    "downloads": 15,
    "maintainers": 10,
    "provenance": 15,
    "typosquatting": 10,
    "lifecycleRisk": 15,
    "license": 5
  }
}
```

## Integration with `defence:add`

When `trustReport.enabled` is `true`, `npm run defence:add` runs the trust score check after lifecycle script analysis. Set `trustReport.failOnMinScore` to `true` to block installation when the score is below `trustReport.minScore`.

## Limitations

- Provenance verification is structural only; cryptographic signature verification is not performed.
- Cadence depends on the optional `.defence-update-check-state.json` file.
- The first version analyses dependencies from the registry; it does not fetch GitHub repository health metrics.
