# Frequently Asked Questions (FAQ)

This page answers conceptual questions about the project and its defenses. For operational problems such as failing commands or pre-commit errors, see [Troubleshooting](troubleshooting.md).

## What is defense in depth?

Defense in depth is a security strategy that uses multiple independent controls instead of relying on a single mechanism. In this project, the controls span package age, signature verification, vulnerability audits, deterministic installs, pre-commit hooks, license checks, and more. If one control misses a threat, another is likely to catch it.

## Why not run `npm install` directly?

`npm install` resolves the latest version that satisfies a range, which may be minutes old and may come from a compromised account. The `defence:add` wrapper enforces age checks, signature audits, lifecycle analysis, and transitive checks before installing, giving the community time to detect malware and giving you time to review.

See [Adding dependencies](dependencies.md).

## What does the package-age check protect against?

It rejects packages published fewer than 7 days ago. Most malicious releases are detected within hours or days, so the cooling-off period dramatically reduces the chance of installing freshly published malware.

See [Defense Layer 1 — Package age check](security/defense-layer-1-package-age.md).

## What is npm package provenance?

Provenance is verifiable metadata that links a package back to its source repository and build process, usually through SLSA attestations published by npm. It helps ensure the package you install was built from the expected source and not tampered with on a maintainer's laptop.

See [Defense Layer 11 — Provenance & SLSA attestation](security/defense-layer-11-provenance.md).

## When should I use `defence:add` versus `npm install`?

Always use `defence:add` when adding or updating a dependency in this project. It is the only supported path for installing packages. Direct `npm install` bypasses age, signature, audit, and lifecycle checks.

## How do I adopt these defenses in another project?

Use `install-defences.js` to copy the defense scripts, hooks, configuration, and manifest into the target project:

```bash
node /path/to/this/repo/tools/install-defences.js /path/to/target-project
```

Then run `npm install` in the target project, verify the hook with `bash .husky/pre-commit`, and commit the changes.

See [Adopting in other projects](adopting-in-other-projects.md).

## What licenses are allowed?

The default allow-list includes permissive licenses such as MIT, Apache-2.0, BSD-2/3-Clause, ISC, and 0BSD. Copyleft licenses (GPL, AGPL, LGPL, MPL) and UNLICENSED are prohibited by default. You can customize the lists in `package.json` under `licensesCheck`.

See [Defense Layer 9 — License check](security/defense-layer-9-license-check.md).

## Why is `.npmrc` hardened?

The root [`.npmrc`](../../.npmrc) disables unsafe lifecycle scripts by default, enables signature and integrity checks, pins provenance requirements, reduces telemetry, and strengthens TLS settings. It turns npm itself into a defense layer.

See [`.npmrc` hardening](npmrc-hardening.md) and [Defense Layer 6 — Hardened `.npmrc`](security/defense-layer-6-npmrc-config.md).

## How do I update dependencies safely?

Use the controlled wrapper:

```bash
npm run defence:update
```

For interactive approval, run:

```bash
npm run defence:update -- --interactive
```

The wrapper re-runs age, signature, audit, and license checks after the update.

## What is the pre-commit hook?

`.husky/pre-commit` runs signature, audit, update-check, and other gates before every commit. It ensures that code cannot be committed without passing the baseline defenses.

See [Defense Layer 5 — Pre-commit hook](security/defense-layer-5-precommit-hook.md).

## How do I verify that the hook has not been tampered with?

Run:

```bash
npm run defence:check-hooks
```

This compares `.husky/pre-commit` against the known SHA-256 hash stored in `package.json`.

See [Defense Layer 12 — Pre-commit hook integrity](security/defense-layer-12-hook-integrity.md).

## Where can I get help?

Open an issue with the label `question` in the repository issue tracker. Before opening, check [Troubleshooting](troubleshooting.md) and the [glossary](glossary.md).
