# Plano de Ação — Fase C.4: `.npmrc` Hardening

> **Authoritative plan.** This file is the source of truth for the current
> project plan. AI assistants must read it at the start of every session or
> when the user asks to resume/review the plan. Do not rely on session memory.
>
> Last updated: 2026-09-04 (Fase C.4 `.npmrc` hardening)

## Contexto

A Fase C.3 (process monitoring) foi concluída, validada com 432/432 testes passando e pushada para `origin/dev`. As próximas fases pendentes no roadmap de conclusão do projeto são:

- **C.4** — `.npmrc` hardening (P1)
- **D** — Otimização de CI/CD (P1)
- **E** — Expansão da documentação (P1)

Esta fase foca em revisar, fortalecer e documentar as configurações do `.npmrc` — a base da Camada 6 de defesa (`Hardened .npmrc`).

**O release v1.0.0 foi removido do escopo imediato.** Ele será planejado e executado apenas quando o projeto estiver de fato concluído, como ação futura.

## Decisões confirmadas para a Fase C.4

- Manter todas as 16 configurações existentes do `.npmrc`; elas já cobrem pinning, registry fixo, SSL, ignore-scripts, engine-strict, idade mínima, resiliência de rede e audit.
- Adicionar `npm-audit-fix-level=high` para que `npm audit fix` só aplique correções de alta/crítica, alinhado ao `audit-level=high` já configurado.
- Adicionar `send-metrics=false` para opt-out explícito de telemetria do npm.
- **Não** adicionar `prefer-online=true` nesta fase; documentar a opção e o trade-off de performance.
- Não alterar scripts de CI/CD nesta fase (ficam para Fase D).
- Criar documentação bilíngue dedicada explicando cada configuração, impacto de segurança e cenários especiais.

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

### C.3 Process monitoring — P1

**Decisões**

- Escopo: monitorar todos os lugares que executam `npm install` / `npm ci` nas ferramentas do projeto (`tools/add-package.js`, `tools/setup-bootstrap.js`) e oferecer um CLI standalone (`defence:install-monitored`).
- Implementação: Node.js puro, sem dependências externas. Hook em `child_process.spawn` / `spawnSync` / `exec` / `execSync` no processo que inicia o npm.
- Saída: relatório Markdown (`lifecycle-monitor-report.md`) + resumo no stdout; `--format=json` suportado.
- Flags de risco: lifecycle scripts (`preinstall`, `install`, `postinstall`, `prepare`), execução de shell, chamadas de rede, escrita em disco, mudanças de permissão, compilação nativa.

**Fase C.3.1 — Biblioteca de monitoramento compartilhada**

- Criar `tools/lib/process-monitor.js` e `tools/lib/process-monitor.test.js`.
- Implementar hook de `child_process` para capturar: timestamp, comando, argumentos (truncados), cwd, pid, ppid, exit code/sinal, duração, `npm_lifecycle_event`, `npm_package_name`.
- Usar `process.on('spawn')` quando disponível (Node >= 22) com monkey-patch fallback.
- Exportar `startMonitoring()`, `stopMonitoring()`, `getEvents()`, `clearEvents()` e hooks de DI (`setImpls` / `resetImpls`).
- Classificar eventos em labels: `lifecycle`, `shell`, `network`, `filesystem-write`, `permission`, `native-build`, `unknown`.

**Fase C.3.2 — Formatador de relatório**

- Criar `tools/lib/install-monitor-report.js` e testes.
- Gerar Markdown com: comando monitorado, timestamp, duração, total de eventos, exit code, tabela de eventos, resumo de risco e recomendações.
- Gerar JSON estruturado com `summary` e `events`.

**Fase C.3.3 — CLI standalone**

- Criar `tools/monitor-install.js` e `tools/monitor-install.test.js`.
- CLI: `npm run defence:install-monitored -- npm install <args...>`.
- Args: `--output=path`, `--format=markdown|json`, `--silent`, `--fail-on-lifecycle`.
- Validar que o comando é `npm install` ou `npm ci`; rejeitar outros.
- Sair com o exit code do comando monitorado (ou 1 se `--fail-on-lifecycle` e houver eventos de lifecycle).

**Fase C.3.4 — Integração em `add-package.js`**

- Substituir a chamada `spawnSyncImpl('npm', ['install', ...])` por wrapper monitorado.
- Gerar e salvar relatório após a instalação.
- Adicionar hooks de DI para testes.
- Atualizar `tools/add-package.test.js`.

**Fase C.3.5 — Integração em `setup-bootstrap.js`**

- Reusar o wrapper monitorado para `npm install --ignore-scripts --save-exact`.
- Salvar relatório em `lifecycle-monitor-report.md`.
- Atualizar `tools/setup-bootstrap.test.js`.

**Fase C.3.6 — Configuração e scripts npm**

- Adicionar bloco `lifecycleMonitoring` em `package.json` (`enabled`, `reportFile`, `failOnLifecycle`, `maxArgsLength`).
- Mesclar defaults em `tools/lib/config.js`.
- Adicionar script: `defence:install-monitored`.
- Atualizar `tools/install-defences.js` e `tools/install-defences.test.js`.
- Regenerar `.defence-manifest.json`.

**Fase C.3.7 — Documentação**

- Criar `docs/en/lifecycle-monitoring.md` e `docs/pt-BR/lifecycle-monitoring.md`.
- Atualizar `docs/en/tools.md`, `docs/pt-BR/tools.md`, `docs/en/quick-reference.md`, `docs/pt-BR/quick-reference.md`, `docs/en/security/index.md`, `docs/pt-BR/security/index.md`, `docs/en/index.md`, `docs/pt-BR/index.md`, `README.md`.
- Atualizar `TODO.md` e `CHANGELOG.md`.

**Verificação**

- `npm test` passa (420+ testes).
- `npm run lint` limpo.
- `npm run defence:check-md-links` válido.
- `bash .husky/pre-commit` passa.
- `npm run defence:install-monitored -- npm install --dry-run` registra eventos.
- `npm run defence:add -- lodash@4.17.21 --dry-run` continua funcionando.

### Fase C.4 — `.npmrc` Hardening (em andamento)

**Decisões**

- Manter as 16 configurações existentes do `.npmrc` como base do hardening.
- Adicionar `npm-audit-fix-level=high` para alinhar `npm audit fix` ao `audit-level=high`.
- Adicionar `send-metrics=false` como opt-out explícito de telemetria.
- **Não** adicionar `prefer-online=true` nesta fase; documentar o trade-off.
- Não alterar CI/CD nesta fase (Fase D).

**Passos**

1. Atualizar `.npmrc` com as novas configurações e comentários explicativos.
2. Criar `docs/en/npmrc-hardening.md` — guia completo EN.
3. Criar `docs/pt-BR/npmrc-hardening.md` — guia completo PT-BR.
4. Atualizar `docs/en/security/defense-layer-6-npmrc-config.md` e `docs/pt-BR/security/defense-layer-6-npmrc-config.md` com links cruzados.
5. Atualizar `docs/en/index.md`, `docs/pt-BR/index.md`, `docs/en/tools.md` e `docs/pt-BR/tools.md`.
6. Garantir que `tools/install-defences.js` copie o `.npmrc` atualizado.
7. Regenerar `.defence-manifest.json`.
8. Atualizar `CHANGELOG.md` e marcar o item em `TODO.md`.
9. Documentar o status prospectivo das novas configurações e os warnings esperados do npm 11.17.0.

**Verificação**

- `npm test` (432 pass).
- `npm run lint` limpo.
- `npm run defence:check-md-links` válido.
- `npm run defence:verify-defences` passa.
- `bash .husky/pre-commit` passa.
- `npm run defence:install-monitored -- npm install --dry-run` continua funcionando (mensagens de warning do npm sobre `npm-audit-fix-level` e `send-metrics` são esperadas e não devem quebrar o fluxo).

> **Status:** implementação concluída; documentação de lookahead ajustada para esclarecer que `npm-audit-fix-level` e `send-metrics` são configurações futuras ainda não reconhecidas pelo npm 11.17.0.

### Fase D — Otimização da CI/CD

**Decisões atualizadas (actions @v7/@v8)**

- Atualizar todas as actions do workflow para as versões mais recentes conforme documentação oficial: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`.
- Nenhuma breaking change afeta o uso deste repositório (sem `registry-url`, sem `pull_request_target`, sem GHES).
- Usar artifact de `node_modules` em vez de `actions/cache` para garantir determinismo entre jobs.

D.1 Implementar cache de `node_modules`

- Transformar o job `setup` em `build`.
- No job `build`: `actions/checkout@v7`, `actions/setup-node@v7` com `cache: 'npm'`, `npm ci`, e upload do diretório `node_modules` com `actions/upload-artifact@v7`:
  - Nome: `node_modules-${{ github.run_id }}`.
  - `retention-days: 1` (suficiente para execução do workflow; reduz storage).
  - `if-no-files-found: error`.
- Nos jobs dependentes (`test`, `coverage`, `lint`, `format`, `docs`, `license`, `lockfile-integrity`, `secrets`, `defence-gates`):
  - `needs: build`.
  - `actions/checkout@v7`.
  - `actions/setup-node@v7` sem `cache` (Node/npm no PATH, sem reinstalar).
  - `actions/download-artifact@v8` para restaurar `node_modules`.
  - Remover `npm ci` redundante.

D.2 Ajustar triggers para proteger `main`

- `on.push.branches`: `[dev]` (remover `main`).
- `on.pull_request.branches`: `[main, dev]`.
- Documentar branch protection em `docs/en/git-workflow.md` e `docs/pt-BR/git-workflow.md`.

D.3 Separar lint e format

- Job `lint`: `npm run lint`.
- Job `format`: `npx biome format tools/ --check`.
- Ambos fazem download do artifact de `node_modules`.

D.4 Upload de SBOM como artifact

- No job `defence-gates`, após `npm run defence:generate-sbom -- --output=/tmp/sbom.json`, fazer upload com `actions/upload-artifact@v7`:
  - Nome: `sbom-${{ github.run_id }}`.
  - Path: `/tmp/sbom.json`.
  - `retention-days: 30`.
  - `archive: false` (mantém o JSON acessível sem unzip).
  - `if-no-files-found: error`.

### Fase E — Expansão da documentação

E.1 Criar `docs/en/ci-cd-overview.md` e `docs/pt-BR/ci-cd-overview.md`

- Visão geral do workflow, jobs, como debugar falhas, troubleshooting comum.
- Explicar o cache de `node_modules` via `actions/upload-artifact@v7` / `actions/download-artifact@v8` e por que artifact em vez de `actions/cache`.
- Explicar como baixar e inspecionar o artifact do SBOM.

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

- ✅ **Fase C.2 — Trust score dashboard** implementada e commitada.
  - Motor `tools/lib/trust-engine.js` e testes `tools/lib/trust-engine.test.js`.
  - CLI `tools/generate-trust-report.js` e testes `tools/generate-trust-report.test.js`.
  - Integração opcional em `tools/add-package.js`.
  - Configuração `trustReport` em `package.json` e `tools/lib/config.js`.
  - Scripts npm: `defence:trust-report`, `defence:trust-report:json`, `defence:trust-report:fail`.
  - Installer atualizado; `.defence-manifest.json` regenerado.
  - Documentação bilíngue e atualizações em README, índices e quick-reference.
  - Gates passaram.

- ✅ **Fase C.3 — Process monitoring** implementada e commitada.
  - Biblioteca `tools/lib/process-monitor.js` e testes.
  - Formatador `tools/lib/install-monitor-report.js` e testes.
  - CLI `tools/monitor-install.js` e testes.
  - Integração em `tools/add-package.js` e `tools/setup-bootstrap.js`.
  - Configuração `lifecycleMonitoring` em `package.json` e `tools/lib/config.js`.
  - Script `defence:install-monitored`.
  - Documentação bilíngue em `docs/en/lifecycle-monitoring.md` e `docs/pt-BR/lifecycle-monitoring.md`.
  - Gates: `npm test` (432/432), `npm run lint`, `npm run defence:check-md-links`, `npm run defence:verify-defences` — todos passaram.

- ✅ **Fase C.4 — `.npmrc` hardening** implementada e documentação de lookahead ajustada.
- ⏳ **Fase D — Otimização de CI/CD** em andamento.

## Decisões pendentes a avaliar no final

1. **Fase 9 Experimental Hardening**: sandbox foi descartado. Pre-install dry-run, trust score dashboard e process monitoring foram implementados; restricted VM permanece como ideia futura.
2. **Hardening no `.npmrc`**: em andamento — adicionar `npm-audit-fix-level=high` e `send-metrics=false`, documentar cada configuração.
3. **CI/CD**: implementar cache via artifact, proteção de `main`, separação lint/format e upload de SBOM.
4. **Documentação**: criar páginas de CI/CD overview, git workflow, SBOM/compliance, performance tuning.
5. **Status report**: manter relatório atual como referência; nova análise pré-release será feita no futuro.
6. **Release futuro**: quando o projeto estiver concluído, planejar ações de release em um plano separado.
3. **CI/CD**: implementar cache via artifact, proteção de `main`, separação lint/format e upload de SBOM.
4. **Documentação**: criar páginas de CI/CD overview, git workflow, SBOM/compliance, performance tuning e npmrc hardening.
5. **Timeout do audit**: manter 60s em `run-audit-with-retry.js` ou ajustar com base na instabilidade observada do npm?
6. **Status report**: manter relatório atual como referência; nova análise pré-release será feita no futuro.
7. **Release futuro**: quando o projeto estiver concluído, planejar ações de release (CHANGELOG, tag, GitHub Release com SBOM) em um plano separado.
