# Plano de Ação — Conclusão do projeto (release adiado para o futuro)

> **Authoritative plan.** This file is the source of truth for the current
> project plan. AI assistants must read it at the start of every session or
> when the user asks to resume/review the plan. Do not rely on session memory.
>
> Last updated: 2026-09-04 (trust score dashboard planning)

## Estado atual (2026-09-04)

O projeto `learn-supply-chain-attack-defence` está na **fase final de conclusão**. Todas as 12 camadas de defesa estão implementadas e testadas (360/360 testes passando). O mecanismo de adoção cross-project (`install-defences.js`) foi atualizado, o bug de formatação Mermaid foi corrigido, a CI foi alinhada com o pre-commit (`npm run defence:audit`) e o pre-install dry-run de lifecycle scripts foi implementado e integrado ao `defence:add`.

**Sandbox mode foi descartado** por violar critérios de portabilidade, educação prática e ausência de dependências pesadas. A Fase 9 foi repriorizada para alternativas compatíveis: pre-install dry-run (P0) ✅ concluído, trust score dashboard (P1) em planejamento, process monitoring (P1) e hardening no `.npmrc` (P1/P2).

**O próximo passo imediato** é implementar o trust score dashboard (Fase C.2).

**O release v1.0.0 foi removido do escopo imediato.** Ele será planejado e executado apenas quando o projeto estiver de fato concluído, como ação futura.

## Decisões do usuário

- O projeto só será considerado concluído quando **todas as pendências** estiverem resolvidas.
- **O release v1.0.0 não faz mais parte do escopo imediato**; será planejado e executado como ação futura, após a conclusão do projeto.
- `run-audit-with-retry.js` precisa ser **revisado e verificado** quanto à correta integração.
- **Sandbox mode foi descartado** como opção para conclusão do projeto (viola critérios de portabilidade, educação prática e ausência de dependências pesadas).
- Fase 9 será **repriorizada** para alternativas compatíveis:
  - **P0**: Pre-install dry-run (análise estática de lifecycle scripts).
  - **P1**: Trust score dashboard; process monitoring de lifecycle scripts; revisão e documentação de hardening no `.npmrc`.
- **CI/CD será otimizada**: cache de `node_modules` via artifact, proteção de `main` (push apenas em `dev`), separação de lint/format, upload de SBOM como artifact.
- **Documentação será expandida**: CI/CD overview, git workflow/branch protection, SBOM/compliance, performance tuning.
- **`PROJECT_STATUS_REPORT.md` atual (9,1/10, 154 testes, 2026-08-20) será mantido como referência**; a nona análise de status será etapa pré-release no futuro.
- Validação ao vivo dos gates deve ser executada.

## Pendências confirmadas

### P0 — Bloqueantes para conclusão do projeto

1. **`tools/install-defences.js` desatualizado** ✅ Corrigido
   - `FILES_TO_COPY` e `SCRIPTS_TO_ADD` atualizados com todos os arquivos/scripts atuais.
   - Script `setup` do target agora usa `npm run defence:check-engines`.
   - `.defence-manifest.json` regenerado com 55 arquivos.

1. **`tools/install-defences.test.js` desatualizado** ✅ Corrigido
   - Assertions atualizados para cobrir todos os arquivos e scripts copiados.

1. **Inconsistência de audit entre pre-commit e CI** ✅ Corrigido
   - CI agora usa `npm run defence:audit` no job `defence-gates`, alinhado com o pre-commit local.

1. **Bug de formatação Mermaid** ✅ Corrigido
   - Blocos `flowchart TD` em `docs/en/security/index.md` e `docs/pt-BR/security/index.md` agora fecham corretamente.
   - `npm run defence:check-md-links` passou.

### P1 — Importantes para conclusão do projeto

1. **`docs/en/adopting-in-other-projects.md` e `docs/pt-BR/adopting-in-other-projects.md` desatualizados** ✅ Corrigido
   - Listas atualizadas para refletir o novo `FILES_TO_COPY` e `SCRIPTS_TO_ADD` por categoria.

1. **`docs/en/testing.md` e `docs/pt-BR/testing.md`** ✅ Corrigido
   - Seção "What Is Covered" / "O Que Está Coberto" expandida com as novas suítes de teste.

1. **`TODO.md` confuso** ✅ Corrigido
   - Reorganizado em seções claras: Open Items (P0/P1/P3/Future), Phase Summary, e completed historical sections.
   - Release v1.0.0 movido para ação futura.

1. **`PROJECT_STATUS_REPORT.md` mantido como referência**
   - O relatório atual (9,1/10, 154 testes, 2026-08-20) não será sobrescrito agora.
   - A nona análise de status será etapa pré-release no futuro, após as novas fases.

1. **`CHANGELOG.md`** ✅ Atualizado
   - Seção `[Unreleased]` atualizada com as mudanças desta sessão.

### P3 / Decisões pendentes

1. **Fase 9 — Alternativas ao Sandbox**
   - **Sandbox mode**: descartado por violar critérios do projeto.
   - **Pre-install dry-run**: análise estática de lifecycle scripts antes de `npm install`.
   - **Trust score dashboard**: score de risco por pacote agregando signals existentes.
   - **Process monitoring**: log de lifecycle scripts executados durante instalação.
   - **Hardening no `.npmrc`**: revisão e documentação de configurações adicionais.

## Plano de execução

### Fase A — Validação inicial (baseline)

A.1 Executar todos os gates de validação para estabelecer baseline real:

- `npm test`
- `npm run lint`
- `npm run defence:check-md-links`
- `npm run defence:license-check:fail`
- `npm run defence:check-engines`
- `bash .husky/pre-commit`
- `npm run test:coverage`
- `npm run test:e2e` (opcional, requer rede)

### Fase B — Fechamento da Fase 9 de conclusão

B.1 Corrigir badge de testes (`README.md` 325 → 333)

- Atualizar `tools/update-badge.js` para incluir `tools/perf/*.test.js` no `TEST_GLOBS`.
- Atualizar `tools/update-badge.test.js` para cobrir o novo padrão.
- Re-rodar `bash .husky/pre-commit` para atualizar `README.md` e `.defence-manifest.json`.

B.2 Atualizar `TODO.md`

- Marcar como concluído o item P0 de re-run dos gates.
- Manter `PROJECT_STATUS_REPORT.md` como referência; não regenerar agora.
- Adicionar novos itens P0/P1/P2 das fases seguintes.

B.3 Commitar correções da Fase 9 de conclusão

- Incluir: `README.md`, `.defence-manifest.json`, `TODO.md`, `tools/update-badge.js`, `tools/update-badge.test.js`.
- Não incluir `PROJECT_STATUS_REPORT.md`.
- Rodar `npm test`, `npm run lint`, `npm run defence:check-md-links` antes do commit.

### Fase C — Alternativas ao Sandbox (Fase 9 repriorizada)

C.1 Pre-install dry-run — P0

- Criar `tools/lib/script-analyzer.js` para análise estática de lifecycle scripts.
- Criar `tools/analyze-lifecycle-scripts.js` como CLI.
- Integrar análise no fluxo de `defence:add` antes de `npm install`.
- Criar testes (`tools/analyze-lifecycle-scripts.test.js`, `tools/lib/script-analyzer.test.js`).
- Documentar em EN/PT-BR.

C.2 Trust score dashboard — P1

**Decisões**

- Escopo: dependências transitivas por padrão; `--direct` para análise rápida.
- Concorrência: reaproveitar `runWithConcurrencyLimit` (I/O de rede, não worker threads).
- `--fail` retorna exit code 1 quando algum pacote fica abaixo do score mínimo configurado.
- Integração em `defence:add` opcional/configurável (`trustReport.enabled` / `failOnMinScore`), executada após lifecycle script analysis.
- Formato do dashboard: Markdown apenas; HTML excluído do escopo inicial.
- Sinais: idade, cadência, depreciação, mantenedores, downloads semanais, provenance/attestations, typosquatting, risco de lifecycle scripts, licença.

**Fase C.2.1 — Motor de scoring**

- Criar `tools/lib/trust-engine.js` e `tools/lib/trust-engine.test.js`.
- Coletores de sinais (reaproveitar helpers existentes):
  - Idade: `fetchRegistryJson` + `time[version]` (`check-package-age.js`).
  - Downloads: `api.npmjs.org/downloads/point/last-week/{name}` (`check-updates.js`).
  - Metadados: `versions[version].deprecated` e `maintainers[]` (`check-updates.js`).
  - Cadência: histórico `.defence-update-check-state.json` (`check-updates.js`).
  - Provenance: `lib/provenance.js` `checkProvenance()`.
  - Typosquatting: `lib/typosquatting.js` `findTyposquattingConflicts()`.
  - Lifecycle risk: `lib/script-analyzer.js` `analyzeManifest()`.
  - Licença: `package-lock.json` (`check-licenses.js`).
- Modelo de score: 0–100 por pacote, labels `trusted` / `review required` / `high risk`, agregado do projeto.
- Pesos configuráveis em `trustReport.scoringWeights`.
- Exportar `setImpls()` / `resetImpls()` para testes.

**Fase C.2.2 — CLI**

- Criar `tools/generate-trust-report.js` e `tools/generate-trust-report.test.js`.
- CLI args: `--pkg=name@version`, `--transitive` (padrão), `--direct`, `--format=table|json|markdown`, `--output=path` (padrão `trust-report.md`), `--fail`, `--silent`.
- Formatos: tabela ASCII, JSON estruturado, Markdown com tabela por pacote e recomendações.
- Fluxo: carregar config, resolver dependências, coletar sinais com concorrência, computar scores, formatar e escrever saída, sair com exit code adequado.

**Fase C.2.3 — Integração em `defence:add`**

- Adicionar hooks de DI (`setTrustReportImpl` / `resetTrustReportImpl`) em `tools/add-package.js`.
- Após lifecycle script analysis, executar trust check quando `trustReport.enabled === true`.
- Abortar se `trustReport.failOnMinScore === true` e score < `trustReport.minScore`.
- Estender `tools/add-package.test.js`.

**Fase C.2.4 — Configuração e scripts npm**

- Adicionar bloco `trustReport` em `package.json` (`enabled`, `failOnMinScore`, `minScore`, `concurrency`, `registryTimeoutMs`, `cacheTtlHours`, `outputFile`, `scoringWeights`).
- Mesclar defaults em `tools/lib/config.js`.
- Adicionar scripts: `defence:trust-report`, `defence:trust-report:json`, `defence:trust-report:fail`.

**Fase C.2.5 — Installer e manifest**

- Atualizar `tools/install-defences.js`: adicionar `tools/lib/trust-engine.js` e `tools/generate-trust-report.js` em `FILES_TO_COPY`; adicionar scripts em `SCRIPTS_TO_ADD`.
- Atualizar `tools/install-defences.test.js`.
- Regenerar `.defence-manifest.json`.

**Fase C.2.6 — Documentação**

- Criar `docs/en/trust-scoring.md` e `docs/pt-BR/trust-scoring.md`.
- Atualizar `docs/en/tools.md`, `docs/pt-BR/tools.md`, `docs/en/quick-reference.md`, `docs/pt-BR/quick-reference.md`, `docs/en/security/index.md`, `docs/pt-BR/security/index.md`, `docs/en/index.md`, `docs/pt-BR/index.md`, `README.md`.
- Atualizar `TODO.md` e `CHANGELOG.md`.

**Verificação**

- `npm test` passa (360+ testes).
- `npm run lint` limpo.
- `npm run defence:check-md-links` válido.
- `bash .husky/pre-commit` passa.
- `npm run defence:trust-report` gera `trust-report.md`.
- `npm run defence:trust-report -- --pkg=lodash@4.17.21` funciona.
- `npm run defence:trust-report -- --fail` retorna exit code correto.
- `npm run defence:add -- --pkg=...` respeita `trustReport.enabled`.

C.3 Process monitoring — P1

- Criar `tools/monitor-lifecycle-scripts.js` para logar comandos spawnados durante `npm install`.
- Criar parser/relatório em `tools/lib/parse-lifecycle-log.js`.
- Opcionalmente expor como `defence:install-monitored`.
- Documentar.

C.4 Hardening no `.npmrc` — P1/P2

- Revisar configurações atuais e avaliar adições.
- Criar `docs/en/npmrc-hardening.md` e `docs/pt-BR/npmrc-hardening.md`.
- Atualizar `install-defences.js` se novas opções forem adotadas.

### Fase D — Otimização da CI/CD

D.1 Implementar cache de `node_modules`

- Usar `actions/upload-artifact` após `npm ci` e `actions/download-artifact` nos jobs dependentes.
- Garantir que o job de setup produza o artifact e os demais restaurem.

D.2 Ajustar triggers para proteger `main`

- `push` disparar CI apenas em `dev`.
- `pull_request` disparar CI para `main` e `dev`.
- Documentar branch protection em `docs/en/git-workflow.md` e `docs/pt-BR/git-workflow.md`.

D.3 Separar lint e format

- Job `lint`: `npm run lint`.
- Job `format`: `npx biome format tools/ --check`.

D.4 Upload de SBOM como artifact

- No job `defence-gates`, após `npm run defence:generate-sbom`, fazer upload do `/tmp/sbom.json`.
- Configurar retention-days apropriado.

### Fase E — Expansão da documentação

E.1 Criar `docs/en/ci-cd-overview.md` e `docs/pt-BR/ci-cd-overview.md`

- Visão geral do workflow, jobs, como debugar falhas, troubleshooting comum.

E.2 Criar `docs/en/git-workflow.md` e `docs/pt-BR/git-workflow.md`

- Estratégia de branches, branch protection, como contribuir, checklist pré-PR.

E.3 Criar `docs/en/sbom-and-compliance.md` e `docs/pt-BR/sbom-and-compliance.md`

- O que é SBOM, formato CycloneDX 1.4, como consumir, exemplo de uso.

E.4 Criar `docs/en/performance-tuning.md` e `docs/pt-BR/performance-tuning.md`

- Cache de registry, timeout, retries, benchmarks, como interpretar regressões.

E.5 Criar `docs/en/npmrc-hardening.md` e `docs/pt-BR/npmrc-hardening.md`

- Explicar cada configuração do `.npmrc` e opções adicionais consideradas.

E.6 Atualizar índices e referências

- Atualizar `README.md`, `docs/en/index.md`, `docs/pt-BR/index.md`, `docs/en/tools.md`, `docs/pt-BR/tools.md`, `CONTRIBUTING.md` com links para as novas páginas.

### Fase F — Relatórios e registro de conclusão

F.1 Manter `CHANGELOG.md` atualizado

- Seção `[Unreleased]` atualizada com as mudanças de cada fase.

F.2 Análise pré-release (ação futura)

- Executar quando as fases C, D e E estiverem concluídas.
- Gerar novo status report (novo arquivo ou atualização controlada) refletindo estado 10/10 se aplicável.
- Identificar novos pontos de melhoria que possam adiar o release.

F.3 Release v1.0.0 (ação futura)

- Planejar e executar apenas após conclusão e aprovação do status report.

## Verificação

- Todos os gates da Fase A passam após as correções.
- `install-defences.js --dry-run` em projeto temporário mostra todos os arquivos/scripts corretos.
- `install-defences.test.js` passa.
- CI e pre-commit produzem o mesmo comportamento de audit (retry bounded).
- `defence:check-md-links` passa em todos os markdowns alterados.
- Documentação EN/PT-BR sincronizada.

## Status da implementação

- ✅ **Fase C.2 — Trust score dashboard** implementada e commitada em `42209bd`.
  - Motor `tools/lib/trust-engine.js` e testes `tools/lib/trust-engine.test.js`.
  - CLI `tools/generate-trust-report.js` e testes `tools/generate-trust-report.test.js`.
  - Integração opcional em `tools/add-package.js`.
  - Configuração `trustReport` em `package.json` e `tools/lib/config.js`.
  - Scripts npm: `defence:trust-report`, `defence:trust-report:json`, `defence:trust-report:fail`.
  - Installer atualizado; `.defence-manifest.json` regenerado com 63 arquivos.
  - Documentação bilíngue e atualizações em README, índices e quick-reference.
  - Gates: `npm test` (408/408), `npm run lint`, `npm run defence:check-md-links`, `bash .husky/pre-commit` — todos passaram.

## Decisões pendentes a avaliar no final

1. **Fase 9 Experimental Hardening**: sandbox foi descartado. Pre-install dry-run, trust score dashboard e process monitoring serão implementados; restricted VM permanece como ideia futura.
2. **Hardening no `.npmrc`**: revisar configurações adicionais e documentar cada uma.
3. **CI/CD**: implementar cache via artifact, proteção de `main`, separação lint/format e upload de SBOM.
4. **Documentação**: criar páginas de CI/CD overview, git workflow, SBOM/compliance, performance tuning e npmrc hardening.
5. **Timeout do audit**: manter 60s em `run-audit-with-retry.js` ou ajustar com base na instabilidade observada do npm?
6. **Status report**: manter relatório atual como referência; nova análise pré-release será feita no futuro.
7. **Release futuro**: quando o projeto estiver concluído, planejar ações de release (CHANGELOG, tag, GitHub Release com SBOM) em um plano separado.
