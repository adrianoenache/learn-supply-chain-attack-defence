# Visão Geral de Segurança

Este projeto protege a árvore de dependências usando doze camadas complementares. Cada camada endereça um vetor de ataque diferente e, juntas, tornam muito mais difícil a entrada de um pacote malicioso ou comprometido no projeto.

## Grupos de Defesa

As doze defesas estão organizadas em três grupos de adoção. Comece pelo grupo **Core** e adicione os demais conforme o projeto amadurece.

### Core — Mínimo Necessário

Essas defesas são essenciais para qualquer projeto Node.js/npm que adote este toolkit.

| Camada | Defesa | Gatilho |
| --- | --- | --- |
| 1 | [Verificação de idade dos pacotes](defense-layer-1-package-age.md) | `npm run setup`, `npm run defence:add`, `npm run defence:update`, `npm run defence:reinstall`, `npm run defence:bootstrap` |
| 2 | [Verificação de assinaturas](defense-layer-2-signatures.md) | `npm run setup`, `npm run defence:add`, `npm run defence:update`, `npm run defence:bootstrap`, hook de pré-commit |
| 3 | [Auditoria de vulnerabilidades](defense-layer-3-vulnerabilities.md) | `npm run setup`, `npm run defence:add`, `npm run defence:update`, `npm run defence:bootstrap`, hook de pré-commit |
| 4 | [Instalação determinística](defense-layer-4-deterministic-install.md) | `npm ci` no `setup` / `defence:reinstall` |
| 5 | [Hook de pré-commit](defense-layer-5-precommit-hook.md) | Todo `git commit` |
| 6 | [`.npmrc` endurecido](defense-layer-6-npmrc-config.md) | Todo comando npm |

### Recomendado — Produção e Times

Adicione essas defesas quando o projeto estiver em produção ou tiver múltiplos contribuidores.

| Camada | Defesa | Gatilho |
| --- | --- | --- |
| 7 | [Gate de lint / formatação](defense-layer-7-lint-format.md) | `npm run lint`, hook de pré-commit |
| 8 | [Verificação de atualizações disponíveis](defense-layer-8-update-check.md) | `npm run defence:update-check`, hook de pré-commit |
| 9 | [Verificação de licenças](defense-layer-9-license-check.md) | `npm run defence:license-check`, `npm run defence:add`, hook de pré-commit |
| 12 | [Integridade do hook de pré-commit](defense-layer-12-hook-integrity.md) | `npm run setup`, `npm run defence:check-hooks` |

### Avançado / Desejável — Compliance e Segurança Madura

Essas defesas oferecem garantia extra para times com requisitos de segurança mais rigorosos.

| Camada | Defesa | Gatilho |
| --- | --- | --- |
| 10 | [Typosquatting e confusão de dependências](defense-layer-10-typosquatting.md) | `npm run defence:add` |
| 11 | [Provenance e atestado SLSA](defense-layer-11-provenance.md) | `npm run defence:add` |

Além disso, o toolkit fornece capacidades de suporte que não se encaixam em uma única camada:

| Capacidade | Ferramenta | Propósito |
| --- | --- | --- |
| Geração de SBOM | `defence:generate-sbom` | CycloneDX 1.4 JSON para compliance e resposta a incidentes |
| Integridade da adoção | `defence:verify-defences` | Verificar arquivos copiados pelo `install-defences.js` |

## Guias de Suporte

Algumas escolhas defensivas exigem caminhos de exceção documentados:

- [Troubleshooting](../troubleshooting.md) — falhas comuns e como executar cada defesa manualmente.
- [Reconstrução de pacotes com lifecycle scripts](rebuilding-lifecycle-packages.md) — reconstrua pacotes nativos com segurança após `ignore-scripts`.

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

  subgraph Layer10["Camada 10: verificação de typosquatting"]
    AA[nome solicitado] --> AB{similar ao existente?}
  end

  subgraph Layer11["Camada 11: verificação de provenance"]
    AC[atestado no registry] --> AD[válido / ausente]
  end

  subgraph Layer12["Camada 12: integridade do hook"]
    AE[arquivo pre-commit] --> AF{hash corresponde?}
  end

  O --> P[Árvore de dependências segura]
  R --> P
  V --> P
  X --> P
  AB --> P
  AD --> P
  AF --> P

## Referência Completa das Camadas

1. [Verificação de idade dos pacotes](defense-layer-1-package-age.md)
2. [Verificação de assinaturas](defense-layer-2-signatures.md)
3. [Auditoria de vulnerabilidades](defense-layer-3-vulnerabilities.md)
4. [Instalação determinística](defense-layer-4-deterministic-install.md)
5. [Hook de pré-commit](defense-layer-5-precommit-hook.md)
6. [`.npmrc` endurecido](defense-layer-6-npmrc-config.md)
7. [Gate de lint / formatação](defense-layer-7-lint-format.md)
8. [Verificação de atualizações disponíveis](defense-layer-8-update-check.md)
9. [Verificação de licenças](defense-layer-9-license-check.md)
10. [Typosquatting e confusão de dependências](defense-layer-10-typosquatting.md)
11. [Provenance e atestado SLSA](defense-layer-11-provenance.md)
12. [Integridade do hook de pré-commit](defense-layer-12-hook-integrity.md)

## Modelo de Ameaça em Resumo

- **Pacote malicioso recém-publicado** → bloqueado pela verificação de idade.
- **Pacote comprometido sem assinatura válida do registry** → bloqueado pela verificação de assinaturas.
- **Pacote com vulnerabilidade conhecida** → bloqueado pelo `npm audit`.
- **Drift inesperado no lock file** → bloqueado pelo `npm ci` e pelos hooks de pré-commit.
- **Comportamento inseguro acidental do npm** → bloqueado pelo `.npmrc` endurecido.
- **Código de baixa qualidade ou inconsistente entrando no repositório** → bloqueado pelo gate de lint / formatação do Biome no hook de pré-commit.
- **Dependências ficando desatualizadas sem aviso** → destacado pela verificação de atualizações disponíveis no hook de pré-commit.
- **Incompatibilidade legal devido a licenças de dependências** → destacado pela verificação de licenças.
- **Typosquatting e confusão de dependências** → bloqueado pela verificação de typosquatting no `add-package.js`.
- **Pacotes construídos a partir de fontes não confiáveis** → destacado pela verificação de provenance.
- **Hook de pré-commit adulterado** → bloqueado pela verificação de integridade do hook.
