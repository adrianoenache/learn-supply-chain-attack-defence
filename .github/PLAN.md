# Plano de Ação — Fase D: Otimização e Hardening da CI/CD

> **Authoritative plan.** This file is the source of truth for the current
> project plan. AI assistants must read it at the start of every session or
> when the user asks to resume/review the plan. Do not rely on session memory.
>
> Last updated: 2026-09-05 (correção de CI — artifact de node_modules)

## Correção urgente — Falhas no CI do GitHub Actions

### Diagnóstico

O workflow implementado na Fase D falhou nas etapas **Test**, **Coverage**, **Lint** e **Defence Gates**.

Causa raiz: `actions/upload-artifact` e `actions/download-artifact` compactam/descompactam o conteúdo em ZIP, mas o ZIP do GitHub Actions **não preserva symlinks nem permissões executáveis** do Unix. Como `node_modules/.bin/biome` é um symlink/script executável, após o download ele fica inacessível no PATH, causando `sh: 1: biome: not found`. A árvore restaurada também fica inconsistente para `npm ls`, fazendo `defence:sync-check` retornar `node_modules is out of sync` e o teste de integração `CLI exits 0 when node_modules is in sync` falhar.

### Solução recomendada

Trocar o upload direto da pasta `node_modules` por um tarball `node_modules.tar.gz` criado com `tar`, que preserva symlinks e permissões. Nos jobs dependentes, baixar e extrair o tarball antes de executar qualquer script. Como camada extra de defesa, alterar os scripts `lint`, `lint:fix` e `format` de `package.json` para invocarem `./node_modules/.bin/biome` explicitamente.

### Passos

1. ✅ **Workflow `.github/workflows/ci.yml`**
   - No job `build`, após `npm ci` e `actionlint`, criar `node_modules.tar.gz` com `tar --create --gzip --file node_modules.tar.gz node_modules/`.
   - Fazer upload de `node_modules.tar.gz` (não da pasta) como artifact `node_modules-${{ github.run_id }}`.
   - Em todos os jobs dependentes, após `actions/download-artifact`, extrair com `tar --extract --gzip --file node_modules.tar.gz`.

2. ✅ **Scripts `package.json`** (paralelo ao passo 1)
   - Alterar `lint`, `lint:fix` e `format` para usar `./node_modules/.bin/biome` em vez de `biome`.
   - Adicionar `format:check` com `./node_modules/.bin/biome format tools/` (Biome 2.x verifica por padrão; `--check` não é aceito) e usar esse script no job de formatação do CI.

3. ✅ **Installer e testes**
   - Atualizar `SCRIPTS_TO_ADD` em `tools/install-defences.js` se ele replicar esses scripts em projetos adotantes.
   - Atualizar as assertions de texto exato em `tools/install-defences.test.js`.

4. ✅ **Sync-check robusto**
   - Em `tools/lib/sync-check.js`, melhorar o fallback que chama `npm ls` para capturar `stderr` e logar no CI, facilitando diagnósticos futuros.

5. ✅ **Documentação**
   - Atualizar `docs/en/ci-cd-overview.md` e `docs/pt-BR/ci-cd-overview.md` para refletir a estratégia de tarball.
   - Adicionar item em troubleshooting sobre preservação de symlinks/permissões.

6. ✅ **Validação e commit**
   - Rodar localmente: `npm test` (432 pass), `npm run lint`, `npm run defence:check-md-links`, `bash .husky/pre-commit`, `npm run defence:verify-defences`.
   - Commitar em `dev`, push para `origin/dev` e verificar CI.
   - Atualizar `.defence-manifest.json` (via pre-commit).

### Decisões

- Manter a estratégia de cache via artifact (determinismo, auditabilidade), mas empacotar como tarball.
- Não voltar a `npm ci` em cada job para não perder a otimização da Fase D.
- Não usar `actions/cache` porque perderia o determinismo run-scoped desejado.

### Verificação

- CI verde no GitHub para todos os jobs.
- Artifact `node_modules-<run-id>` continua disponível para download.
- `defence:sync-check` retorna 0 nos jobs dependentes.
- `npm run lint` executa Biome sem `not found`.

---

## Contexto

As fases C.2, C.3 e C.4 foram concluídas e validadas com 432/432 testes passando, pushadas para `origin/dev`. A próxima fase em execução no roadmap de conclusão do projeto é:

- **D** — Otimização e Hardening da CI/CD (P1)
- **E** — Expansão e sincronização da documentação (P1)

A fase D unifica otimização de performance e hardening de segurança do workflow de CI/CD: cache de `node_modules` via artifact, proteção de `main`, separação de lint/format, upload de SBOM, pin de actions por SHA, Dependabot, permissões mínimas do `GITHUB_TOKEN`, timeouts, actionlint no pre-commit e dry-run do installer no CI.

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

### Fase D — Otimização e Hardening da CI/CD

Esta fase unifica otimização de performance e hardening de segurança do workflow de CI/CD. Não haverá Fase F separada; todos os itens de CI/CD serão implementados aqui.

**Decisões confirmadas**

- Atualizar todas as actions do workflow para as versões mais recentes conforme documentação oficial: `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`.
- **Pin de actions por SHA** em vez de tags mutáveis `@v7`/`@v8`, com comentário indicando a versão semântica. Exemplo: `uses: actions/checkout@<sha> # v7`.
- Adicionar **Dependabot para GitHub Actions** em `.github/dependabot.yml` para abrir PRs automáticos de atualização dos SHAs das actions.
- Usar **artifact de `node_modules`** em vez de `actions/cache` para garantir determinismo entre jobs.
- Aplicar **permissões mínimas do `GITHUB_TOKEN`** no nível do workflow (`permissions: contents: read`, `actions: read`), ampliando apenas se necessário por job.
- Configurar **timeout explícito por job** (`timeout-minutes`) para prevenir runs presos.
- Adicionar validação local do workflow com **actionlint** no pre-commit.
- Executar **dry-run do installer** (`tools/install-defences.js --dry-run`) no CI para garantir que o manifest não divergiu da estrutura real.
- Ajustar triggers para proteger `main`: push apenas em `dev`, PR em `main` e `dev`.
- Separar jobs de `lint` e `format`.
- Fazer upload do SBOM como artifact no job `defence-gates`.

**Passos**

D.1 — Preparar pin por SHA e Dependabot

- Buscar os SHAs estáveis das actions `actions/checkout@v7`, `actions/setup-node@v7`, `actions/upload-artifact@v7`, `actions/download-artifact@v8`.
- Criar `.github/dependabot.yml` com atualização semanal de `github-actions`, prefixo de commit `chore(deps)`, revisores opcionais.
- Documentar no `docs/en/ci-cd-overview.md` e `docs/pt-BR/ci-cd-overview.md`:
  - Por que SHA é mais seguro que tag mutável.
  - Como o Dependabot mantém os SHAs atualizados.
  - Como verificar o SHA de uma action no GitHub.

D.2 — Reestruturar o workflow `.github/workflows/ci.yml`

- Declarar `permissions` no topo do workflow:
  ```yaml
  permissions:
    contents: read
    actions: read
  ```
- Adicionar `timeout-minutes: 15` em todos os jobs (ajustar conforme observação de duração real).
- Transformar o job `setup` em `build`.
- No job `build`:
  - `actions/checkout@<sha> # v7`.
  - `actions/setup-node@<sha> # v7` com `cache: 'npm'`.
  - `npm ci`.
  - Upload de `node_modules` com `actions/upload-artifact@<sha> # v7`:
    - Nome: `node_modules-${{ github.run_id }}`.
    - Path: `node_modules`.
    - `retention-days: 1`.
    - `if-no-files-found: error`.
- Nos jobs dependentes (`test`, `coverage`, `lint`, `format`, `docs`, `license`, `lockfile-integrity`, `secrets`, `defence-gates`):
  - `needs: build`.
  - `actions/checkout@<sha> # v7`.
  - `actions/setup-node@<sha> # v7` sem `cache`.
  - `actions/download-artifact@<sha> # v8` para restaurar `node_modules`.
  - Remover `npm ci` redundante.
- No job `defence-gates`, após `npm run defence:generate-sbom -- --output=/tmp/sbom.json`:
  - Upload com `actions/upload-artifact@<sha> # v7`:
    - Nome: `sbom-${{ github.run_id }}`.
    - Path: `/tmp/sbom.json`.
    - `retention-days: 30`.
    - `archive: false`.
    - `if-no-files-found: error`.

D.3 — Ajustar triggers de evento

- `on.push.branches`: `[dev]` (remover `main`).
- `on.pull_request.branches`: `[main, dev]`.
- Documentar em `docs/en/git-workflow.md` e `docs/pt-BR/git-workflow.md`:
  - Branch protection de `main`.
  - Fluxo de trabalho via PR.
  - Checklist pré-PR (testes, lint, links, pre-commit).

D.4 — Separar lint e format

- Job `lint`: executa `npm run lint`.
- Job `format`: executa `npx biome format tools/ --check`.
- Ambos fazem download do artifact de `node_modules` e dependem de `build`.

D.5 — Adicionar actionlint ao pre-commit

- Verificar se `actionlint` está disponível no ambiente de desenvolvimento; se não, documentar como instalar.
- Adicionar ao `.husky/pre-commit` (ou script auxiliar invocado por ele) a validação:
  ```bash
  actionlint .github/workflows/*.yml
  ```
- Garantir que o pre-commit ainda funcione se `actionlint` não estiver instalado (warning, não erro) no ambiente local, mas falhe no CI.

D.6 — Adicionar job de dry-run do installer

- Criar job `install-defences-dry-run` dependente de `build`.
- Executar `node ./tools/install-defences.js --dry-run` em diretório temporário preparado pelo CI.
- Validar que a saída lista todos os arquivos e scripts esperados.
- O job falha se houver divergência entre o installer e o estado real do repositório.

D.7 — Documentação completa da Fase D

- Criar `docs/en/ci-cd-overview.md` e `docs/pt-BR/ci-cd-overview.md`:
  - Visão geral do workflow (diagrama Mermaid).
  - Descrição de cada job e sua responsabilidade.
  - Explicação do cache via artifact e por que não `actions/cache`.
  - Explicação do pin por SHA + Dependabot.
  - Explicação das permissões mínimas do `GITHUB_TOKEN`.
  - Como baixar e inspecionar o artifact do SBOM.
  - Troubleshooting comum (falha de download de artifact, timeout, divergência de manifest).
- Criar `docs/en/git-workflow.md` e `docs/pt-BR/git-workflow.md`:
  - Estratégia de branches (`main`, `dev`, feature branches).
  - Branch protection e regras de merge.
  - Como abrir um PR.
  - Checklist pré-PR.
  - O que acontece em caso de falha de CI.
- Criar `docs/en/sbom-and-compliance.md` e `docs/pt-BR/sbom-and-compliance.md`:
  - O que é SBOM.
  - Formato CycloneDX 1.4 utilizado.
  - Como consumir o `sbom.json`.
  - Exemplo de integração com ferramentas de compliance.
- Criar `docs/en/performance-tuning.md` e `docs/pt-BR/performance-tuning.md`:
  - Cache de registry, timeout, retries.
  - Como interpretar os benchmarks (`defence:perf`).
  - Como detectar e investigar regressões de performance.
- Criar/atualizar `docs/en/npmrc-hardening.md` e `docs/pt-BR/npmrc-hardening.md`:
  - Explicar cada configuração do `.npmrc`.
  - Opções adicionais consideradas (`prefer-online`, etc.).
- Atualizar `docs/en/security/defense-layer-6-npmrc-config.md` e `docs/pt-BR/security/defense-layer-6-npmrc-config.md` com links cruzados.
- Atualizar `README.md`, `docs/en/index.md`, `docs/pt-BR/index.md`, `docs/en/tools.md`, `docs/pt-BR/tools.md`, `CONTRIBUTING.md` com links para as novas páginas.

D.8 — Atualizar installer, manifest e registros

- Se novos arquivos de documentação forem criados e devem ser copiados por projetos adotantes, atualizar `tools/install-defences.js` (`FILES_TO_COPY`) e `tools/install-defences.test.js`.
- Regenerar `.defence-manifest.json` via `bash .husky/pre-commit`.
- Atualizar `CHANGELOG.md` com todas as mudanças da Fase D.
- Atualizar `TODO.md` marcando itens da Fase D como concluídos.

**Verificação**

- `npm test` passa (432+ testes).
- `npm run lint` limpo.
- `npm run defence:check-md-links` válido.
- `bash .husky/pre-commit` passa (incluindo actionlint, se instalado).
- `npm run defence:verify-defences` passa.
- Workflow validado sintaticamente (`actionlint .github/workflows/ci.yml`).
- Após push para `dev`, CI executa todos os jobs com sucesso.
- Artifact de `node_modules` e artifact de SBOM são gerados e podem ser baixados.
- Job `install-defences-dry-run` passa sem divergências.
- Documentação EN/PT-BR sincronizada.

### Fase E — Expansão e sincronização da documentação

A Fase E foca exclusivamente na criação e atualização de documentação. Toda a documentação técnica da CI/CD será criada na Fase D; a Fase E complementa com páginas conceituais e ajustes finais.

E.1 Criar `docs/en/learning-path.md` e `docs/pt-BR/learning-path.md`

- Roteiro sugerido para quem está aprendendo sobre defesa contra supply-chain attacks.
- Ordem de leitura das camadas de defesa e ferramentas.

E.2 Criar `docs/en/faq.md` e `docs/pt-BR/faq.md`

- Perguntas frequentes sobre adoção, erros comuns, limitações.

E.3 Atualizar todos os índices e referências

- Garantir que `README.md`, `docs/en/index.md`, `docs/pt-BR/index.md`, `docs/en/tools.md`, `docs/pt-BR/tools.md`, `CONTRIBUTING.md` e `SECURITY.md` apontem para as novas páginas criadas nas fases D e E.
- Sincronizar termos com o glossário (`docs/en/glossary.md` / `docs/pt-BR/glossary.md`).

E.4 Revisão final de documentação

- Verificar consistência bilíngue EN/PT-BR.
- Verificar links internos e externos.
- `npm run defence:check-md-links` deve passar em todo o repositório.

### Fase Pós-E — Análise pré-release e release v1.0.0 (ação futura)

Não faz parte do escopo atual. Será planejada em sessão futura quando as fases D e E estiverem concluídas.

- Análise pré-release: gerar novo status report refletindo estado 10/10 se aplicável; identificar novos pontos de melhoria.
- Release v1.0.0: planejar CHANGELOG final, tag, GitHub Release com SBOM anexado.

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
- ✅ **Fase D — Otimização e Hardening da CI/CD** implementada, validada com 432/432 testes passando, commitada e pushada para `origin/dev`.
- ⏳ **Fase E — Expansão e sincronização da documentação** é a próxima fase em execução.

## Decisões pendentes a avaliar no final

1. **Fase 9 Experimental Hardening**: sandbox foi descartado. Pre-install dry-run, trust score dashboard e process monitoring foram implementados; restricted VM permanece como ideia futura.
2. **Hardening no `.npmrc`**: concluído — `npm-audit-fix-level=high` e `send-metrics=false` adicionados e documentados como configurações prospectivas.
3. **CI/CD**: concluído — cache via artifact, proteção de `main`, separação lint/format, upload de SBOM, pin por SHA + Dependabot, permissões mínimas do `GITHUB_TOKEN`, timeouts, actionlint e dry-run do installer implementados e documentados na Fase D.
4. **Documentação técnica de CI/CD**: concluído — páginas de CI/CD overview, git workflow, SBOM/compliance, performance tuning e npmrc hardening criadas/atualizadas na Fase D.
6. **Documentação conceitual**: criar learning path e FAQ na Fase E.
7. **Timeout do audit**: manter 60s em `run-audit-with-retry.js` ou ajustar com base na instabilidade observada do npm?
8. **Status report**: manter relatório atual como referência; nova análise pré-release será planejada em sessão futura, após as fases D e E.
9. **Release futuro**: quando o projeto estiver concluído, planejar ações de release (CHANGELOG, tag, GitHub Release com SBOM) em plano separado.
