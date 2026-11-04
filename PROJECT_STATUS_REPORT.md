# Project Status Report

## Reavaliação do projeto — 2026-11-03 (Fase J)

### Resumo executivo

**Nota geral atual: 10/10** — todas as categorias com gates verdes e evidências medidas.

Desde a última avaliação (2026-08-20: 9,1/10, 9 camadas, 154 testes) o projeto
passou por doze fases: migração VS Code 1.140 (prompts → skills), verificação
de comandos com intermediárias elegíveis, governança de AI (AI-2/AI-4), code
review educacional com cobertura ≥ 95%, organização com CODEOWNERS + branch
protection, gestão de engines (update por CVEs + ferramenta própria), guarda
da superfície npm, revisão integral da documentação (69 pares EN/PT-BR) e
observabilidade unificada dos hooks.

O problema central de 2026-08-20 — **o instalador de adoção desatualizado** —
foi resolvido na raiz: a lista de arquivos agora é protegida por um teste de
completude que falha quando qualquer arquivo de `tools/` não é adotado nem
explicitamente excluído, e o próprio drift foi corrigido (manifesto 72 → 81
arquivos).

---

### Métricas medidas (2026-11-03)

| Gate | Comando | Resultado |
| --- | --- | --- |
| Testes | `npm test` | **935/935 passando** |
| Cobertura de linhas | `npm run test:coverage` | **95,81%** (meta ≥ 95%) |
| Lint/format | `npm run lint` | 99 arquivos, sem erros |
| Links markdown | `npm run defence:check-md-links` | 194 arquivos, todos válidos |
| URLs externas | `npm run defence:check-external-urls` | todas alcançáveis (known-dead registradas) |
| Manifesto de adoção | `npm run defence:verify-defences` | 81 arquivos íntegros |
| Vulnerabilidades | `npm audit --audit-level=high` | 0 |
| Assinaturas | `npm audit signatures` | 3 pacotes verificados |
| Runtime | Node 24.22.2 / npm 11.19.1 | tip da linha v24 LTS (CVEs de out/2026 corrigidos) |
| Código morto | `npm run defence:check-dead-code` | baseline zero candidatos |
| Contexto AI (medido) | `npm run defence:measure-ai-context` | always-on 2.996 bytes (~749 tokens/req); total ~92,7 KB/~23.2k tokens sob demanda |

---

### Avaliação por categoria

| Categoria | Nota | Evidência |
| --- | --- | --- |
| **Segurança** | 10/10 | 12 camadas técnicas + camada organizacional (CODEOWNERS + branch protection em main/dev com 11 status checks obrigatórios). Guarda da superfície npm (`check-npmrc`, incl. blind spot `.npm-extension.mjs` do npm v12). ADRs documentando `min-release-age=7` (fail-closed) e a rejeição do Permission Model como sandbox. |
| **Qualidade de código** | 10/10 | 935 testes, cobertura 95,81%, lint em 99 arquivos, baseline de código morto zerado com scanner consultivo, regra de granularidade de commits com hook consultivo ativo. |
| **Performance** | 10/10 | Benchmarks com baselines (`tools/perf/`), concorrência limitada, cache de registry com TTL, retry com backoff; testes de regressão de performance no `npm test`. Dashboard de tendências segue como P3 (não é gate). |
| **Documentação** | 10/10 | Revisão integral dos 69 pares EN/PT-BR concluída em 2026-11-03 (24 corrigidos, 45 íntegros); paridade estrutural verificada; links e paths validados por gates; exemplos de saída alinhados ao formato real das ferramentas. |
| **Desenvolvimento assistido por AI** | 10/10 | 19 skills + 9 agents + 8 hooks com suítes de sanidade no `npm test`; memória versionada (PLAN/TODO/DECISIONS/lessons) com política frente ao Copilot Memory; observabilidade JSONL dos hooks; pegada de contexto medida por ferramenta. |

---

### Itens abertos (nenhum P0)

Sequência aprovada restante antes do release:

1. **AI-3.2** — smoke tests de prompt-injection e sanitização de outputs (pré-release hardening).
2. **AI-3.1** — otimização do `inject-context`, **condicionada à medição**: o hook injeta ~120 bytes por sessão; a ferramenta `measure-ai-context.js` (criada nesta fase) fornece a base — a decisão pode ser "não fazer" documentada.
3. **M.1** — dogfooding: instalar as defesas em `../setup-webpack-stylus-liquid/` e documentar gaps (valida o instalador em projeto real).
4. **K** — release v1.0.0: requer aprovação explícita do mantenedor, nota 10/10 (atingida) e zero itens P0 (atingido).

Pós-v1.0.0 (alvo v1.1.0): **M.2** (scaffolding de projeto zerado com defesas) e **M.3** (scaffolding exclusivo da infraestrutura de AI).

Backlog P3 (não bloqueia release): fixtures E2E expandidas, geração automática de changelog, sandbox opcional para comandos npm (via isolamento de SO — ver ADR sobre Permission Model), dashboard de performance.

---

### Comparação com a avaliação anterior (2026-08-20 → 2026-11-03)

| Dimensão | 2026-08-20 | 2026-11-03 |
| --- | --- | --- |
| Camadas de defesa | 9 | 12 + organizacional |
| Testes | 154 | 935 |
| Cobertura | não medida no relatório | 95,81% |
| Adoção cross-project | desatualizada (causa da nota 9,1) | protegida por teste de completude |
| Documentação | expansão inicial | bilíngue, revisada integralmente (69 pares) |
| Infraestrutura de AI | inexistente | 5 camadas governadas + observabilidade |
| CI | básico | 11 jobs, artefatos, SHA pinning, status checks obrigatórios |
| Runtime | não avaliado | LTS corrente com CVEs corrigidos + ferramenta de lifecycle |

### Conclusão

O projeto atingiu **10/10** com evidências medidas em todas as categorias e
zero itens P0 abertos. O release v1.0.0 depende apenas da conclusão da
sequência pré-release (AI-3.2, AI-3.1, M.1) e da aprovação explícita do
mantenedor, conforme os gates da Fase K.
