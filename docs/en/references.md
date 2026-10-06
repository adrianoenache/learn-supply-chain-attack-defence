# References

This page collects useful links for the defenses implemented in this project and for related supply-chain security topics. The extra sections below are **reference only** — they are not part of the project's code, but they can help you decide what to implement in your own repositories.

## Project References

- [npm audit](https://docs.npmjs.com/cli/commands/npm-audit)
- [npm audit signatures](https://docs.npmjs.com/cli/commands/npm-audit#audit-signatures)
- [npm ci](https://docs.npmjs.com/cli/commands/npm-ci)
- [npm config](https://docs.npmjs.com/cli/commands/npm-config)
- [Husky](https://typicode.github.io/husky/)
- [Node.js test runner](https://nodejs.org/api/test.html)
- [OpenSSF Scorecard](https://github.com/ossf/scorecard)

## AI Agent Security

Academic and industry references relevant to the project's AI customization layer (`.github/` hooks, skills, and agents).

- [APPA: Recoverable Information-Flow Control for Real-World LLM Agents (arXiv:2607.24625)](https://arxiv.org/abs/2607.24625v2) — dual-phase reference monitor (pre-dispatch + output validation), disposable taint-confined branches, and repair-instead-of-abort recovery. Inspirou os itens AI-2.7.5 e AI-3.2 do plano.

## Extra References

### Secret Management

Tools for storing and retrieving sensitive values (API keys, tokens, database credentials) outside source code.

- [HashiCorp Vault OSS](https://www.vaultproject.io/) — Open-source secret manager. Self-hosted, free to use.
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/) — Managed secret store. Paid; approximately **US$ 0.40 per secret/month** plus **US$ 0.05 per 10,000 API calls**. Prices vary by region.
- [Azure Key Vault](https://azure.microsoft.com/en-us/products/key-vault) — Managed secret and key store. Paid; approximately **US$ 0.03 per 10,000 operations** plus storage costs for keys/certificates. Prices vary by region.
- [Google Secret Manager](https://cloud.google.com/secret-manager) — Managed secret store. Paid; approximately **US$ 0.06 per secret/month** plus **US$ 0.03 per 10,000 accesses**. Prices vary by region.

### Artifact Signing and Provenance

Tools and frameworks for verifying that a published artifact was built from a trusted source.

- [Sigstore](https://www.sigstore.dev/) — Free, open-source standard for signing and verifying software artifacts. Includes [Cosign](https://github.com/sigstore/cosign) for container signing.
- [SLSA — Supply-chain Levels for Software Artifacts](https://slsa.dev/) — Free, open framework for improving artifact integrity and supply-chain security.

### SBOM Standards

Standards for describing the components of a software bill of materials.

- [CycloneDX](https://cyclonedx.org/) — Free, open-source SBOM standard maintained by OWASP.
- [SPDX](https://spdx.dev/) — Free, open-source SBOM standard maintained by the Linux Foundation and recognized as an ISO standard.

### Secret Scanning

Tools for detecting secrets accidentally committed to source control.

- [TruffleHog](https://trufflesecurity.com/trufflehog) — Open-source secret scanner. A commercial version with extra features is also available.
- [git-secrets](https://github.com/awslabs/git-secrets) — Free, open-source tool from AWS Labs that prevents committing secrets to Git.
