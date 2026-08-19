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
- `min-release-age=7` — require packages to be at least 7 days old when supported.
- `ignore-scripts=true` — do not run lifecycle scripts during install, reducing the risk of install-time malware.
- Optional dependencies are no longer globally omitted so that Biome's platform-specific CLI packages can be installed. They remain subject to `min-release-age` and audit checks.

## Impact

Even if a developer runs a plain npm command by mistake, `.npmrc` reduces the damage surface by disabling scripts, enforcing exact versions, and requiring engine compatibility.
