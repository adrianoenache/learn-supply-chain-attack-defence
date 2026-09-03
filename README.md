# Learn Supply Chain Attack Defence

![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2024.19.0-339933?logo=node.js&logoColor=white)
![npm](https://img.shields.io/badge/npm-%3E%3D%2011.17.0-CB3837?logo=npm&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)
![Tests](https://img.shields.io/badge/Tests-314%2F314%20passing-brightgreen)
![CI](https://github.com/adrianoenache/learn-supply-chain-attack-defence/actions/workflows/ci.yml/badge.svg?branch=main)

A hands-on project for learning how to defend Node.js/npm projects against supply-chain attacks.

> 🛡️ **Defense in depth**: twelve layered defenses for Node.js/npm supply chains, organized into Core, Recommended, and Advanced adoption groups.

## Quick Start

```bash
git clone git@github.com:adrianoenache/learn-supply-chain-attack-defence.git
cd learn-supply-chain-attack-defence
npm run setup
```

## Documentation

- 🇺🇸 [English](docs/en/index.md)
- 🇧🇷 [Português (BR)](docs/pt-BR/index.md)

### Quick Links

- [Project overview](docs/en/project-overview.md)
- [Architecture](docs/en/architecture.md)
- [Tools](docs/en/tools.md)
- [Quick reference](docs/en/quick-reference.md)
- [Glossary](docs/en/glossary.md)
- [AI guidelines](docs/en/ai-guidelines.md)
- [Built with GitHub Copilot & Kimi K2.7 Code](docs/en/copilot.md)

## Security Layers at a Glance

Defenses are grouped by adoption stage. See the [security overview](docs/en/security/index.md) for the full threat model.

### Core — Minimum Necessary

| Layer | Protection | Trigger |
| --- | --- | --- |
| 1 | [Package age check](docs/en/security/defense-layer-1-package-age.md) | `npm run setup`, `npm run defence:add`, `npm run defence:update`, `npm run defence:reinstall`, `npm run defence:bootstrap` |
| 2 | [Signature verification](docs/en/security/defense-layer-2-signatures.md) | `npm run setup`, `npm run defence:add`, `npm run defence:update`, `npm run defence:bootstrap`, pre-commit hook |
| 3 | [Vulnerability audit](docs/en/security/defense-layer-3-vulnerabilities.md) | `npm run setup`, `npm run defence:add`, `npm run defence:update`, `npm run defence:bootstrap`, pre-commit hook |
| 4 | [Deterministic install](docs/en/security/defense-layer-4-deterministic-install.md) | `npm ci` in `setup` / `defence:reinstall` |
| 5 | [Pre-commit hook](docs/en/security/defense-layer-5-precommit-hook.md) | Every `git commit` |
| 6 | [Hardened `.npmrc`](docs/en/security/defense-layer-6-npmrc-config.md) | Every npm command |

### Recommended — Production & Team Use

| Layer | Protection | Trigger |
| --- | --- | --- |
| 7 | [Lint / format gate](docs/en/security/defense-layer-7-lint-format.md) | `npm run lint`, `npm run lint:fix`, `npm run format` |
| 8 | [Update availability check](docs/en/security/defense-layer-8-update-check.md) | `npm run defence:update-check`, pre-commit hook |
| 9 | [License check](docs/en/security/defense-layer-9-license-check.md) | `npm run defence:license-check`, `npm run defence:add`, pre-commit hook |
| 12 | [Pre-commit hook integrity](docs/en/security/defense-layer-12-hook-integrity.md) | `npm run setup`, `npm run defence:check-hooks` |

### Advanced / Desirable — Compliance & Mature Security

| Layer | Protection | Trigger |
| --- | --- | --- |
| 10 | [Typosquatting & dependency confusion](docs/en/security/defense-layer-10-typosquatting.md) | `npm run defence:add` |
| 11 | [Provenance & SLSA attestation](docs/en/security/defense-layer-11-provenance.md) | `npm run defence:add` |

### Supporting Capabilities

| Capability | Tool | Purpose |
| --- | --- | --- |
| SBOM generation | `npm run defence:generate-sbom` | CycloneDX 1.4 JSON for compliance and incident response |
| Adoption integrity | `npm run defence:verify-defences` | Verify files copied by `install-defences.js` |

## Security

If you discover a security issue, please follow the instructions in [SECURITY.md](SECURITY.md).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow, dependency policy, and code-style guidelines.

## License

[MIT](LICENSE)
