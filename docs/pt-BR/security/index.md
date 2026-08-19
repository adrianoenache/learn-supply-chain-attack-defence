# Visão Geral de Segurança

Este projeto protege a árvore de dependências usando nove camadas complementares. Cada camada endereça um vetor de ataque diferente e, juntas, tornam muito mais difícil a entrada de um pacote malicioso ou comprometido no projeto.

## Diagrama das Camadas de Defesa

```mermaid
flowchart TD
    subgraph Developer["Fluxo do desenvolvedor"]
        A[Adicionar dependência] --> B[tools/add-package.js]
        C[Commitar alterações] --> D[.husky/pre-commit]
        E[Clone novo] --> F[npm run setup]
        Z[Sem lock file] --> Y[npm run defence:bootstrap]
    end

    subgraph Layer1["Camada 1: idade do pacote"]
        B --> G{>= 7 dias?}
        G -->|sim| H[permitir instalação]
        G -->|não| I[rejeitar]
    end

    H --> J[npm install]

    subgraph Layer2["Camada 2: verificação de assinaturas"]
        J --> K[npm audit signatures]
        Y --> K
    end

    subgraph Layer3["Camada 3: auditoria de vulnerabilidades"]
        K --> L[npm audit --audit-level=high]
    end

    subgraph Layer4["Camada 4: instalação determinística"]
        F --> M[npm ci a partir do lock file]
        L --> M
        Y --> M
    end

    subgraph Layer5["Camada 5: hook de pré-commit"]
        D --> Q[npm run lint]
        D --> K
        D --> N[verificação transitiva de idade]
        D --> U[verificação de atualizações]
    end

    subgraph Layer6["Camada 6: configuração npm endurecida"]
        M --> O[políticas do .npmrc]
        K --> O
        L --> O
    end

    subgraph Layer7["Camada 7: gate de lint / formatação"]
        Q --> R[Biome check]
    end

    subgraph Layer8["Camada 8: verificação de atualizações disponíveis"]
        U --> V[elegível / quarentena]
    end

  subgraph Layer9["Camada 9: verificação de licenças"]
    W[ler lock file] --> X[permitida / proibida / sinalizada]
  end

  O --> P[Árvore de dependências segura]
  R --> P
  V --> P
  X --> P
1. [Verificação de idade dos pacotes](defense-layer-1-package-age.md)
2. [Verificação de assinaturas](defense-layer-2-signatures.md)
3. [Auditoria de vulnerabilidades](defense-layer-3-vulnerabilities.md)
4. [Instalação determinística](defense-layer-4-deterministic-install.md)
5. [Hook de pré-commit](defense-layer-5-precommit-hook.md)
6. [`.npmrc` endurecido](defense-layer-6-npmrc-config.md)
7. [Gate de lint / formatação](defense-layer-7-lint-format.md)
8. [Verificação de atualizações disponíveis](defense-layer-8-update-check.md)
9. [Verificação de licenças](defense-layer-9-license-check.md)

## Modelo de Ameaça em Resumo

- **Pacote malicioso recém-publicado** → bloqueado pela verificação de idade.
- **Pacote comprometido sem assinatura válida do registry** → bloqueado pela verificação de assinaturas.
- **Pacote com vulnerabilidade conhecida** → bloqueado pelo `npm audit`.
- **Drift inesperado no lock file** → bloqueado pelo `npm ci` e pelos hooks de pré-commit.
- **Comportamento inseguro acidental do npm** → bloqueado pelo `.npmrc` endurecido.
- **Código de baixa qualidade ou inconsistente entrando no repositório** → bloqueado pelo gate de lint / formatação do Biome no hook de pré-commit.
- **Dependências ficando desatualizadas sem aviso** → destacado pela verificação de atualizações disponíveis no hook de pré-commit.
- **Incompatibilidade legal devido a licenças de dependências** → destacado pela verificação de licenças.
