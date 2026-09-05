# SBOM and Compliance

A Software Bill of Materials (SBOM) is an inventory of all components in a software product. For supply-chain security, an SBOM makes it possible to know exactly what dependencies were used to build a release and to react quickly when a vulnerability is disclosed.

## Why an SBOM matters

- **Vulnerability response:** when a package is compromised, the SBOM tells you whether the release is affected.
- **License compliance:** auditors can verify that only approved licenses are present.
- **Reproducibility:** the SBOM captures the exact versions used during a build.

## CycloneDX 1.4

This project generates SBOMs in CycloneDX 1.4 format:

```bash
npm run defence:generate-sbom
```

The output is written to `/tmp/sbom.json` and includes component metadata, dependencies, and hashes.

## Consuming `sbom.json`

Inspect the top-level metadata:

```bash
jq '.metadata' /tmp/sbom.json
```

List all package names:

```bash
jq '.components[].name' /tmp/sbom.json
```

Count components:

```bash
jq '.components | length' /tmp/sbom.json
```

### Integration examples

- **OWASP Dependency-Check:** point it at `sbom.json` as a CycloneDX input.
- **Dependency-track:** upload the SBOM to a Dependency-Track server for continuous monitoring.
- **Manual audits:** use `jq` or a text editor to review unexpected packages or license fields.

## SBOM artifact in CI

The `defence-gates` job uploads the generated SBOM as a workflow artifact:

```text
sbom-${{ github.run_id }}
```

with `retention-days: 30` and `archive: false`. Download it from the workflow run summary or with:

```bash
gh run download <run-id> -n sbom-<run-id>
```

See [ci-cd-overview.md](ci-cd-overview.md) for more on the CI workflow.

## Compliance use cases

| Scenario | How the SBOM helps |
|---|---|
| Security incident | Quickly identify affected releases and components. |
| License audit | Prove that only approved licenses are shipped. |
| Vendor review | Share the SBOM with downstream consumers. |
| Regulatory request | Provide a machine-readable inventory of third-party code. |
