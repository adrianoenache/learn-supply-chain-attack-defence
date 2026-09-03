# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.0   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security issue in this project, please report it responsibly.

1. **Do not open a public issue.** Instead, send an email to the repository owner with enough details to reproduce the problem.
2. Include the steps to reproduce, affected files, and, if possible, a suggested fix.
3. Allow up to **7 business days** for an initial response.

After the vulnerability is confirmed and a fix is released, a public advisory will be published in the [CHANGELOG](CHANGELOG.md).

## Security Design

This project applies defense in depth against npm supply-chain attacks through twelve complementary layers, organized into three adoption groups:

### Core — Minimum Necessary

- **Package age check** — blocks newly published packages.
- **Signature verification** — verifies registry signatures.
- **Vulnerability audit** — fails on high or critical CVEs.
- **Deterministic install** — installs from a verified lock file.
- **Pre-commit hook** — runs security gates on every commit.
- **Hardened `.npmrc`** — disables lifecycle scripts and enforces safe defaults.

### Recommended — Production & Team Use

- **Lint / format gate** — keeps code quality consistent.
- **Update availability check** — surfaces eligible and quarantined updates.
- **License check** — blocks incompatible dependency licenses.
- **Pre-commit hook integrity** — detects tampering with the hook file.

### Advanced / Desirable — Compliance & Mature Security

- **Typosquatting & dependency confusion detection** — flags suspiciously similar package names.
- **Provenance & SLSA attestation** — verifies build provenance when available.

### Supporting Capabilities

- **SBOM generation** — produces a CycloneDX 1.4 JSON inventory.
- **Adoption integrity verification** — verifies files copied into other projects.

See the [security documentation](docs/en/security/index.md) for the full threat model and implementation details.
