# Learning Path

This guide is a curated path through the repository for beginners, intermediate users, and advanced practitioners. Each track builds on the previous one, moving from concepts to daily operational habits.

## Track 1 — Fundamentals

Start here if you are new to supply-chain security.

- What supply-chain attacks are and why npm is a high-value target.
- The defense-in-depth mindset: no single control is enough.
- Overview of the 12 defense layers used in this project.

See [What is a supply chain attack?](security/what-is-supply-chain-attack.md) and the [security overview](security/index.md).

**Audience:** beginner.

## Track 2 — Secure setup

Set up a safe local environment before adding code or dependencies.

- Run `npm run setup` (or `npm run defence:bootstrap`) to install defenses.
- Understand the hardening decisions in [`.npmrc`](../../.npmrc).
- Enable the pre-commit hook and verify Node/npm engine compatibility.

See [Getting started](getting-started.md), [Setup](setup.md), and [Defense Layer 6 — Hardened `.npmrc`](security/defense-layer-6-npmrc-config.md).

**Audience:** beginner, intermediate.

## Track 3 — Adding dependencies safely

Learn the secure workflow for bringing new packages into the project.

- Use the `defence:add` wrapper instead of `npm install`.
- Read the package-age check results.
- Verify signatures/provenance and inspect lifecycle scripts.

See [Adding dependencies](dependencies.md), [Defense Layer 1 — Package age check](security/defense-layer-1-package-age.md), [Defense Layer 2 — Signature verification](security/defense-layer-2-signatures.md), [Lifecycle script analysis](security/lifecycle-script-analysis.md), and [Trust scoring](trust-scoring.md).

**Audience:** intermediate.

## Track 4 — Maintenance

Keep the project healthy over time without bypassing controls.

- Run `defence:update` and `defence:update-check`.
- Review license changes before merging updates.
- Re-run age checks after any install.

See [Defense Layer 8 — Update availability check](security/defense-layer-8-update-check.md), [Defense Layer 9 — License check](security/defense-layer-9-license-check.md), and [SBOM and compliance](sbom-and-compliance.md).

**Audience:** intermediate, advanced.

## Track 5 — Operations & compliance

Integrate security outputs into review and release workflows.

- Generate an SBOM for release artifacts.
- Generate and interpret a trust report.
- Monitor installs and react to drift.

See [SBOM and compliance](sbom-and-compliance.md), [Trust scoring](trust-scoring.md), [Lifecycle process monitoring](lifecycle-monitoring.md), and [Tools](tools.md).

**Audience:** advanced.

## Practical tutorials

### Tutorial A — Add your first dependency with defense

1. Choose a well-known package, for example `lodash`.
2. Run the secure wrapper:

   ```bash
   npm run defence:add -- lodash@4.17.21
   ```

3. Review the output:
   - Age check must report the package is at least 7 days old.
   - Signature verification must pass.
   - Lifecycle script analysis must not flag high-risk patterns.
4. If all checks pass, confirm the install when prompted.
5. Inspect the changes in `package.json` and `package-lock.json` before committing.

### Tutorial B — Generate an SBOM

1. Make sure `package-lock.json` is up to date.
2. Run:

   ```bash
   npm run defence:generate-sbom
   ```

3. Open the generated `sbom.json` file and verify it lists every dependency with its SHA-512 integrity.
4. Attach the SBOM to release artifacts or store it for incident response.

See [SBOM and compliance](sbom-and-compliance.md).

### Tutorial C — Interpret a trust report

1. Run the trust score dashboard:

   ```bash
   npm run defence:trust-report
   ```

2. Look at the score breakdown per package:
   - Age, cadence, downloads, maintainers, provenance, typosquatting risk, lifecycle risk, and license.
3. Investigate any package below the configured minimum score.
4. Use the JSON output for automated gates:

   ```bash
   npm run defence:trust-report:fail
   ```

See [Trust scoring](trust-scoring.md).

## Next steps

- Browse the full [tool reference](tools.md).
- Read the [quick reference](quick-reference.md) for daily commands.
- If something fails, see [Troubleshooting](troubleshooting.md).
