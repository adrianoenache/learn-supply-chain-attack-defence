# Learn Supply Chain Attack Defence

> 🛡️ Defense in depth for Node.js/npm projects.

This repository is a practical learning environment for understanding and applying layered defenses against supply-chain attacks in npm-based projects.

## Documentation Index

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

### Development

- [Git hooks](git-hooks.md)
- [Adding dependencies](dependencies.md)
- [Testing](testing.md)
- [References](references.md)

## Other Languages

- 🇧🇷 [Português (BR)](../pt-BR/index.md)

_Last sync: 2026-08-18_
