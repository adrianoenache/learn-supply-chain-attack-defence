# Learn Supply Chain Attack Defence

A hands-on project for learning how to defend Node.js/npm projects against supply-chain attacks.

> 🛡️ **Defense in depth**: package-age checks, signature verification, vulnerability audits, deterministic installs, pre-commit hooks, and hardened npm configuration.

## Quick Start

```bash
git clone git@github.com:adrianoenache/learn-supply-chain-attack-defence.git
cd learn-supply-chain-attack-defence
npm run setup
```

## Documentation

- 🇺🇸 [English](docs/en/index.md)
- 🇧🇷 [Português (BR)](docs/pt-BR/index.md)

## Security Layers at a Glance

| Layer | Protection | Trigger |
|---|---|---|
| 1 | [Package age check](docs/en/security/defense-layer-1-package-age.md) | `npm run setup`, `npm run add`, `npm run npm-reinstall` |
| 2 | [Signature verification](docs/en/security/defense-layer-2-signatures.md) | `npm run setup`, `npm run add`, pre-commit hook |
| 3 | [Vulnerability audit](docs/en/security/defense-layer-3-vulnerabilities.md) | `npm run setup`, `npm run add`, pre-commit hook |
| 4 | [Deterministic install](docs/en/security/defense-layer-4-deterministic-install.md) | `npm ci` in `setup` / `npm-reinstall` |
| 5 | [Pre-commit hook](docs/en/security/defense-layer-5-precommit-hook.md) | Every `git commit` |
| 6 | [Hardened `.npmrc`](docs/en/security/defense-layer-6-npmrc-config.md) | Every npm command |

## License

[MIT](LICENSE)
