# Defense Layer 6 — Hardened `.npmrc`

The `.npmrc` file configures npm with safer defaults. It applies to every npm command in the project.

## File

[.npmrc](../../../.npmrc)

## Key Settings

- `audit=true` — always run an audit after install.
- `fund=false` — hide funding messages to keep output focused.
- `package-lock=true` — generate a lock file.
- `save-exact=true` — save exact versions instead of loose ranges.
- `engine-strict=true` — enforce the Node/npm engine requirements.
- `min-release-age=7` — Require packages to be at least 7 days old when supported.
- `ignore-scripts=true` — do not run lifecycle scripts during install, reducing the risk of install-time malware.
- `fetch-retries=3`, `fetch-retry-mintimeout=10000`, `fetch-retry-maxtimeout=60000`, `fetch-timeout=300000` — retry failed registry requests with bounded exponential backoff, reducing CI flakiness from transient `npm audit` timeouts.
- `maxsockets=10` — limit concurrent registry connections to make network behaviour more predictable on shared CI runners.
- `strict-ssl=true` — always verify TLS certificates, preventing downgrade / MitM attacks.
- Optional dependencies are no longer globally omitted so that Biome's platform-specific CLI packages can be installed. They remain subject to `min-release-age` and audit checks.

## Additional hardening settings

- `npm-audit-fix-level=high` — restricts `npm audit fix` to high/critical CVEs, preventing low/moderate advisories from silently changing the lock file.
- `send-metrics=false` — disables npm telemetry/metrics collection for deterministic privacy, especially useful in CI or air-gapped environments.

> **Lookahead / future-facing:** `npm-audit-fix-level` and `send-metrics` are not recognised by npm 11.17.0, which will emit "Unknown project config" warnings. They are kept in `.npmrc` so future npm versions enforce them automatically; until then the warnings are expected and harmless.

See the [`.npmrc` hardening guide](../npmrc-hardening.md) for a detailed explanation of every setting, the rationale behind each choice, options that were considered but not adopted, and guidance for private registries and emergency patches.

## Impact

Even if a developer runs a plain npm command by mistake, `.npmrc` reduces the damage surface by disabling scripts, enforcing exact versions, and requiring engine compatibility. The additional audit and telemetry settings make automated remediation and privacy behavior predictable.
