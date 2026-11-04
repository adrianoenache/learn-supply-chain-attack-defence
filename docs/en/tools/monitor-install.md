# monitor-install

`monitor-install.js` runs any `npm install` or `npm ci` command under process monitoring, recording every subprocess spawned during the install.

## What it does

- Validates that the wrapped command is one of the allowed npm commands (`install`, `i`, `ci`, `add`, `rebuild`).
- Hooks `spawn`, `spawnSync`, `exec`, and `execSync` to observe subprocesses.
- Classifies each subprocess by risk.
- Writes a Markdown or JSON report.

Implemented in [tools/monitor-install.js](../../../tools/monitor-install.js).

## Usage

```bash
# Monitor npm ci
npm run defence:install-monitored -- npm ci

# Monitor npm install
npm run defence:install-monitored -- npm install

# JSON report
npm run defence:install-monitored -- npm ci -- --format=json

# Fail if any lifecycle script is detected
npm run defence:install-monitored -- npm ci -- --fail-on-lifecycle
```

## Output example

```text
Monitored npm ci
Subprocesses: 12
High-risk: 1 (native compilation)
Report written to lifecycle-monitor-report.md
```

## Related defense layer

- [Lifecycle process monitoring](../lifecycle-monitoring.md)
- [Defense Layer 3 — Vulnerability audit](../security/defense-layer-3-vulnerabilities.md)
