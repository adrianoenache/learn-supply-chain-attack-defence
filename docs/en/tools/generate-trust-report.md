# generate-trust-report

`generate-trust-report.js` aggregates existing supply-chain signals into a 0–100 trust score for each dependency and emits a readable dashboard.

## What it does

- Reads dependencies from `package-lock.json`.
- Scores each package on age, release cadence, downloads, maintainers, provenance, typosquatting risk, lifecycle risk, and license.
- Outputs table, JSON, or Markdown reports.
- Can fail when `--fail` is set and a package is below the configured minimum score.

Implemented in [tools/generate-trust-report.js](../../../tools/generate-trust-report.js). Scoring engine lives in [tools/lib/trust-engine.js](../../../tools/lib/trust-engine.js).

## Configuration

Weights and thresholds are configured in `package.json` under `trustReport`:

```json
{
  "trustReport": {
    "minScore": 60,
    "failOnMinScore": false,
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
}
```

## Usage

```bash
# Markdown report
npm run defence:trust-report

# JSON output
npm run defence:trust-report -- --format=json

# Fail if any package is below minScore
npm run defence:trust-report -- --fail

# Single package
npm run defence:trust-report -- --pkg=lodash@4.17.21
```

## Output example

```text
Package            Score  Age  Provenance  Lifecycle
lodash@4.17.21     92     ✓    ✓           low
sharp@0.33.5       71     ✓    ✗           high
```

## Related defense layer

- [Trust scoring](../trust-scoring.md)
- Aggregates signals from Layers 1–12.
