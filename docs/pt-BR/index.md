# Learn Supply Chain Attack Defence

> 🛡️ Defesa em profundidade para projetos Node.js/npm.

Este repositório é um ambiente prático de aprendizado para entender e aplicar camadas de defesa contra ataques de supply chain em projetos baseados em npm.

## Índice da Documentação

### Primeiros Passos

- [Primeiros Passos](getting-started.md) — pré-requisitos e configuração inicial.
- [Setup](setup.md) — como funciona o `npm run setup` e o que ele protege.

### Camadas de Segurança

- [Visão geral de segurança](security/index.md)
- [O que é um ataque de supply chain?](security/what-is-supply-chain-attack.md)
- Camada 1: [Verificação de idade dos pacotes](security/defense-layer-1-package-age.md)
- Camada 2: [Verificação de assinaturas](security/defense-layer-2-signatures.md)
- Camada 3: [Auditoria de vulnerabilidades](security/defense-layer-3-vulnerabilities.md)
- Camada 4: [Instalação determinística](security/defense-layer-4-deterministic-install.md)
- Camada 5: [Hook de pré-commit](security/defense-layer-5-precommit-hook.md)
- Camada 6: [`.npmrc` endurecido](security/defense-layer-6-npmrc-config.md)

### Desenvolvimento

- [Git hooks](git-hooks.md)
- [Adicionando dependências](dependencies.md)
- [Testes](testing.md)
- [Referências](references.md)

## Outros Idiomas

- 🇺🇸 [English](../en/index.md)

_Sincronizado em: 2025-06-25_
