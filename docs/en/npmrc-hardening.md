# `.npmrc` Hardening Guide

This document explains every `.npmrc` setting used by this project, why it was chosen, and how the configuration protects the dependency tree. It also describes options that were deliberately **not** adopted, so you can make informed decisions when adapting these rules elsewhere.

## Where the configuration lives

The source of truth is [.npmrc](../../.npmrc) in the repository root. When the project is adopted by another repository, [tools/install-defences.js](../../tools/install-defences.js) copies this file verbatim into the target project.

## Settings overview

| Category | Setting | Purpose |
| --- | --- | --- |
| Version pinning | `save-exact=true` | Pins exact versions without `^` or `~` operators. |
| Lock file | `package-lock=true` | Always generates `package-lock.json`. |
| Registry | `registry=https://registry.npmjs.org/` | Uses the official registry only. |
| Output | `fund=false` | Suppresses funding messages so security output stays readable. |
| Audit | `audit=true` | Enables automatic audit during install/fix. |
| Audit | `audit-level=high` | Fails on high/critical CVEs. |
| Audit fix | `npm-audit-fix-level=high` | Restricts `npm audit fix` to high/critical fixes. |
| Telemetry | `send-metrics=false` | Disables npm telemetry/metrics collection. |
| Lifecycle | `ignore-scripts=true` | Blocks `preinstall`, `install`, `postinstall`, `prepare`. |
| Engines | `engine-strict=true` | Enforces `engines` requirements. |
| Release age | `min-release-age=7` | Rejects packages published less than 7 days ago. |
| Network | `fetch-retries=3` | Retries failed registry requests. |
| Network | `fetch-retry-mintimeout=10000` | Minimum retry backoff. |
| Network | `fetch-retry-maxtimeout=60000` | Maximum retry backoff. |
| Network | `fetch-timeout=300000` | Total request timeout. |
| Network | `maxsockets=10` | Limits concurrent registry connections. |
| TLS | `strict-ssl=true` | Verifies TLS certificates. |

## Detailed rationale

### Version pinning and lock file

```ini
save-exact=true
package-lock=true
```

`save-exact=true` guarantees that any dependency added to `package.json` uses an exact version. This removes the ambiguity of range operators and makes the dependency tree easier to audit. `package-lock=true` ensures that `package-lock.json` is always generated, even on machines that might otherwise disable it.

### Registry and TLS

```ini
registry=https://registry.npmjs.org/
strict-ssl=true
```

Fixing the registry URL prevents a compromised DNS, proxy, or local configuration from redirecting installs to a malicious mirror. `strict-ssl=true` ensures that TLS certificates are validated, blocking downgrade and man-in-the-middle attacks.

### Lifecycle script blocking

```ini
ignore-scripts=true
```

Lifecycle scripts are the most common supply-chain attack vector during install. `ignore-scripts=true` prevents `preinstall`, `install`, `postinstall`, and `prepare` from running automatically. Packages that genuinely need a build step (for example `esbuild`, `sharp`, or `canvas`) must be rebuilt manually:

```bash
npm_config_ignore_scripts=false npm rebuild <package>
```

See [Rebuilding lifecycle-script packages](security/rebuilding-lifecycle-packages.md) for a safe workflow.

### Engine enforcement

```ini
engine-strict=true
```

Fails `npm ci` and `npm install` if the active Node.js or npm version does not satisfy the `engines` field in `package.json`. This guarantees that security features such as `min-release-age` and audit provenance are available.

### Minimum release age

```ini
min-release-age=7
```

npm itself rejects versions published less than 7 days ago. This is a second layer beyond `tools/check-package-age.js` and also affects `npm audit fix`, which may fail if a published patch is too recent. For emergency patches that cannot wait, use the commented `min-release-age-exclude[]=` option temporarily.

### Audit configuration

```ini
audit=true
audit-level=high
npm-audit-fix-level=high
```

`audit=true` runs a vulnerability audit during install. `audit-level=high` makes the command fail when high or critical CVEs are found. `npm-audit-fix-level=high` is a **lookahead setting**: it restricts `npm audit fix` so it only applies high/critical fixes, but it is not yet recognised by npm 11.17.0. The line is kept in `.npmrc` so future npm versions will enforce it automatically; until then, any `npm audit fix` command should still be reviewed manually.

### Telemetry opt-out

```ini
send-metrics=false
```

Disables npm metrics/telemetry collection. Like `npm-audit-fix-level`, this is a **lookahead setting** that is not yet recognised by npm 11.17.0. It is kept in `.npmrc` as an explicit opt-in to a deterministic privacy posture for future npm releases.

### Network resilience

```ini
fetch-retries=3
fetch-retry-mintimeout=10000
fetch-retry-maxtimeout=60000
fetch-timeout=300000
maxsockets=10
```

These settings protect the install process against transient registry failures without allowing unbounded waiting. Retries use exponential backoff between 10 and 60 seconds, with a total request timeout of 5 minutes. `maxsockets=10` limits concurrent registry connections, reducing burst load and making network behavior more predictable on shared CI runners.

## Lookahead / future-facing settings

The following settings are intentionally kept in `.npmrc` even though npm 11.17.0 does not recognise them yet. They prepare the project for future npm releases without requiring another configuration change.

| Setting | Future effect | Current behaviour |
| --- | --- | --- |
| `npm-audit-fix-level=high` | Restricts `npm audit fix` to high/critical CVEs. | Ignored by npm 11.17.0; emits a warning but causes no functional change. |
| `send-metrics=false` | Explicitly disables npm telemetry/metrics collection. | Ignored by npm 11.17.0; emits a warning but causes no functional change. |

These warnings are expected and safe. Do not remove the settings unless you prefer to adopt them only when your npm version explicitly supports them.

## Options considered but not adopted

| Option | Why it was not adopted |
| --- | --- |
| `prefer-online=true` | Forces the registry to be consulted even when a local cache entry exists. This would avoid stale cached packages, but the performance cost on every install is high and the existing retry/fetch settings already mitigate most registry failure scenarios. |
| `legacy-peer-deps=true` | Relaxes peer-dependency resolution. This project does not need it, and enabling it would hide dependency-tree conflicts. |
| `workspaces-update=false` | Not relevant for a single-package repository. |
| `git-tag-version=false` | Affects `npm version`, not install security. Kept at default. |

## Special scenarios

### Emergency patch before the age window

Use `min-release-age-exclude[]` temporarily:

```ini
min-release-age-exclude[]=@myorg/shared-utils
```

Revert the exclusion as soon as the package reaches the minimum age.

### Private or air-gapped registry

Change the registry URL and keep `strict-ssl=true`:

```ini
registry=https://registry.mycompany.com/
strict-ssl=true
```

If the registry uses an internal CA, install the CA certificate at the OS level; do not disable `strict-ssl`.

### CI without internet access

Set the project-level registry to an internal mirror and keep all other hardening settings. If the mirror is read-only, `npm audit` may need to be disabled in CI through an environment variable rather than `.npmrc`.

## Relationship to other defenses

- **Layer 1 — Package age check**: `min-release-age=7` is the npm-native enforcement; `tools/check-package-age.js` provides the project-level check and transitive scanning.
- **Layer 5 — Pre-commit hook**: the hook runs audits and age checks that assume `ignore-scripts=true` and `audit-level=high` are active.
- **Layer 6 — Hardened `.npmrc`**: this guide is the detailed reference for that layer.
- **Lifecycle script analysis**: predicts what would run if scripts were enabled; `.npmrc` blocks it.
- **Lifecycle process monitoring**: records what actually ran during install; `.npmrc` reduces the chance that unexpected scripts execute.

## References

- [npm config documentation](https://docs.npmjs.com/cli/v11/using-npm/config)
- [Defense Layer 6 — Hardened `.npmrc`](security/defense-layer-6-npmrc-config.md)
- [Rebuilding lifecycle-script packages](security/rebuilding-lifecycle-packages.md)
