# Fluxo de trabalho Git

Este projeto usa um fluxo baseado em branches que mantém a `main` sempre pronta para deploy e direciona todas as mudanças por pull requests revisadas.

## Estratégia de branches

| Branch | Objetivo |
|---|---|
| `main` | Código pronto para produção. Push direto é bloqueado. |
| `dev` | Branch de integração para a próxima release. Push é permitido, mas o CI deve passar. |
| `feature/*` ou `fix/*` | Branches de curta duração para mudanças individuais. |

Abra uma branch de feature a partir de `dev`, envie seus commits e abra um pull request de volta para `dev`. Quando a release estiver pronta, faça merge de `dev` para `main` através de um pull request.

## Proteção da branch `main`

- **Restrição de push:** código só chega à `main` por meio de um pull request.
- **Checks obrigatórios:** o workflow completo de CI definido em [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) deve passar.
- **Branch atualizada:** PRs devem ser rebased sobre a `main` ou `dev` mais recentes antes do merge.

Consulte [ci-cd-overview.md](ci-cd-overview.md) para a lista de verificações.

## Abrindo um pull request

1. Faça rebase da sua branch sobre a `dev` mais recente.
2. Execute a lista de verificação pré-PR abaixo.
3. Abra o PR contra `dev` (ou `main` para merges de release).
4. Aguarde todos os checks obrigatórios do CI ficarem verdes.

## Checklist pré-PR

```bash
npm test
npm run lint
npm run defence:check-md-links   # se arquivos markdown foram alterados
npm run defence:verify-defences
```

Certifique-se também de que o hook [`.husky/pre-commit`](../../.husky/pre-commit) foi executado com sucesso. Ele impõe o `actionlint` localmente quando o binário está instalado.

## Quando o CI falha

- Clique no check que falhou no PR para ler os logs.
- Corrija a causa raiz localmente; não ignore os checks.
- Envie a correção e aguarde o CI reexecutar.
- Se a falha for causada por um problema transitório de rede, reexecute o job específico pela interface do GitHub.
