# Learn Supply Chain Attack Defence

> 🛡️ Defense in depth for Node.js/npm projects.

This repository is a practical learning environment for understanding and applying layered defenses against supply-chain attacks in npm-based projects.

## Documentation Index

### About This Project

- [Project overview](project-overview.md) — purpose, audience, and how to use this repository.
- [Glossary](glossary.md) — definitions of supply-chain security terms.
- [AI guidelines](ai-guidelines.md) — how this project uses GitHub Copilot / Kimi 2.7 Code.

### Getting Started

- [Getting Started](getting-started.md) — prerequisites and first setup.
- [Setup](setup.md) — how `npm run setup` works and what it protects.

### Security Layers

- [Security overview](security/index.md)
- [What is a supply chain attack?](security/what-is-supply-chain-attack.md)
- Layer 1: [Package age check](security/defense-layer-1-package-age.md)
- Layer 2: [Signature verification](security/defense-layer-2-signatures.md)
- Layer 3: [Vulnerability audit](security/defense-layer-3-vulnerabilities.md)
- Layer 4: [Deterministic install](security/defense-layer-4-deterministic-install.md)
- Layer 5: [Pre-commit hook](security/defense-layer-5-precommit-hook.md)
- Layer 6: [Hardened `.npmrc`](security/defense-layer-6-npmrc-config.md)
- Layer 7: [Lint / format gate](security/defense-layer-7-lint-format.md)
- Layer 8: [Update availability check](security/defense-layer-8-update-check.md)
- Layer 9: [License check](security/defense-layer-9-license-check.md)
- Layer 10: [Typosquatting & dependency confusion](security/defense-layer-10-typosquatting.md)
- Layer 11: [Provenance & SLSA attestation](security/defense-layer-11-provenance.md)
- Layer 12: [Pre-commit hook integrity](security/defense-layer-12-hook-integrity.md)

### Support Guides

- [Troubleshooting](troubleshooting.md) — common failures, fixes, and how to run each defense manually.
- [Lifecycle script analysis](security/lifecycle-script-analysis.md) — static, read-only scan of package lifecycle scripts before install.
- [Rebuilding lifecycle-script packages](security/rebuilding-lifecycle-packages.md) — safely rebuild native packages after `ignore-scripts`.

### Project

- [Architecture](architecture.md)
- [Tools](tools.md)
- [Quick reference](quick-reference.md)
- [GitHub Copilot & Kimi K2.7 Code](copilot.md)

### Development

- [Git hooks](git-hooks.md)
- [Adding dependencies](dependencies.md)
- [Testing](testing.md)
- [Release checklist](release-checklist.md)
- [References](references.md)
- [Adopting in other projects](adopting-in-other-projects.md)

## Other Languages

- 🇧🇷 [Português (BR)](../pt-BR/index.md)
