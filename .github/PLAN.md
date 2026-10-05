# Plano de Ação — Reorganização pós-Fase D com Fase AI-0 Foundation

> **Authoritative plan.** This file is the source of truth for the current
> project plan. AI assistants must read it at the start of every session or
> when the user asks to resume/review the plan. Do not rely on session memory.
>
> Last updated: 2026-10-05

## TL;DR

Fases prévia, AI-0, Pre-Fase E, E, AI-1 (migração VS Code 1.140) e F
(verificação de comandos, com `intermediateEligible` de ponta a ponta)
concluídas. Próxima prioridade: **Fase AI-2** (governança/ergonomia das
customizações AI: skills em fork, `user-invocable`, recursos empacotados,
sanity test de hooks e índice gerado de skills), depois G (code review
educacional), H (organização — item de lint do Biome confirmado aberto),
I (revisão de docs), J (avaliação 10/10) e só então K (release v1.0.0, com
aprovação explícita).

## Fases

### Fase prévia — Alinhamento de nomenclatura e baseline

- Unificar `TODO.md` (0–11) e `PLAN.md` para Fase AI-0, E, F, G, H, I, J, K.
- Rodar `npm test`, `npm run lint`, `npm run defence:check-md-links`, `bash .husky/pre-commit`, `npm run defence:verify-defences`.
- Sincronizar badge de testes em `README.md` com a contagem real (referências anteriores apontavam 432/432; validar contagem atual).

### Fase AI-0 — AI Customizations Foundation (P0) ✅ (prioridade zero)

- Criar agentes: `command-execution`, `code-review`, `repository-organization`, `project-evaluation`.
- Criar skills: `script-contract-verification`, `educational-code-review`, `docs-completeness`, `repository-organization-audit`.
- Criar instructions: `educational-code-quality`, `file-organization`, `project-evaluation`.
- Criar prompts: `code-review-for-learning`, `verify-command-contract`, `validate-architecture`, `project-status-evaluation`.
  - **Nota (2026-10-05):** os prompts foram convertidos em skills na Fase AI-1
    após o VS Code 1.140 remover o suporte a `.github/prompts/`.
- Criar hooks: `enforce-security`, `auto-lint-test`, `inject-context` seguindo o schema da [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference) (funcionalidades de docs-drift e command-contract foram incorporadas ao `auto-lint-test`).
- Revisar agentes/skills/prompts/hooks/instructions existentes para refletir as novas fases.
- Atualizar `docs/en/ai-guidelines.md` e `docs/pt-BR/ai-guidelines.md`.

### Pre-Fase E — Revisão de customizações AI e URLs quebradas ✅

- **Status:** AI implementation audit concluído sem problemas críticos.
- **URLs verificadas:**
  - ✅ `https://docs.github.com/en/copilot`
  - ✅ `https://code.visualstudio.com/docs`
  - ✅ `https://docs.github.com/en/copilot/reference/hooks-reference`
  - ✅ `https://github.com/adrianoenache/learn-supply-chain-attack-defence/discussions` → corrigido para issues com label `question`
  - ✅ `https://www.npmjs.com/package/@biomejs/biome/v/2.7.1` → exemplo marcado como ilustrativo
  - ✅ `https://github.com/biomejs/biome/releases/tag/cli%40v2.7.1` → exemplo marcado como ilustrativo
  - ✅ `https://www.npmjs.com/package/husky/v/9.2.0` → exemplo marcado como ilustrativo
  - ✅ `https://github.com/typicode/husky/releases/tag/v9.2.0` → exemplo marcado como ilustrativo
  - ✅ `https://code.visualstudio.com/schemas/hooks` → nota de referência morta conhecida adicionada em `ai-lessons-learned.md`
- **Nova camada de defesa contra URLs fictícias/404/inacessíveis:**
  - Skill `.github/skills/validate-urls/SKILL.md` instrui agentes a verificarem URLs externas.
  - Ferramenta `tools/check-external-urls.js` varre arquivos e valida alcançabilidade com cache, retry e allow-list.
  - Testes `tools/check-external-urls.test.js` cobrem regex, descoberta, allow-list e saída.
  - Registro `.github/known-dead-urls.md` documenta URLs intencionalmente inacessíveis.
  - Hook `.github/hooks/validate-urls.json` + script `.github/hooks/scripts/validate-urls.sh` sugerem verificação pós-edição.
  - `package.json` ganhou scripts `defence:check-external-urls` / `defence:check-external-urls:force` e config `checkExternalUrls`.
  - `.husky/pre-commit` executa `npm run defence:check-external-urls`.
  - `docs/en/ai-guidelines.md` e `docs/pt-BR/ai-guidelines.md` documentam a skill.
  - `tools/lib/retry-fetch.js` aceita `headers` customizados e timers de retry mantêm o event loop ativo.
  - `.gitignore` ignora `.external-urls-cache.json`.
- **Arquivos alterados/criados:**
  - `.github/ISSUE_TEMPLATE/config.yml`
  - `.github/ai-lessons-learned.md`
  - `.github/hooks/validate-urls.json`
  - `.github/hooks/scripts/validate-urls.sh`
  - `.github/instructions/security.instructions.md`
  - `.github/known-dead-urls.md`
  - `.github/skills/validate-urls/SKILL.md`
  - `docs/en/ai-guidelines.md`
  - `docs/en/security/defense-layer-8-update-check.md`
  - `docs/pt-BR/ai-guidelines.md`
  - `docs/pt-BR/security/defense-layer-8-update-check.md`
  - `package.json`
  - `tools/check-external-urls.js`
  - `tools/check-external-urls.test.js`
  - `tools/lib/retry-fetch.js`
  - `.husky/pre-commit`
  - `.defence-manifest.json` (atualizado automaticamente pelo pre-commit)
- **Prevenção de falhas de commit após edição de `.husky/pre-commit`:**
  - Skill `.github/skills/pre-commit-hash-sync/SKILL.md` para sincronizar hashes.
  - Hook `.github/hooks/sync-pre-commit-hash.json` + script `.github/hooks/scripts/sync-pre-commit-hash.sh`.
  - Regra adicionada a `.github/instructions/security.instructions.md`.
  - Guias `docs/en/ai-guidelines.md` e `docs/pt-BR/ai-guidelines.md` atualizados.
  - Regressão coberta em `tools/check-hooks.test.js`.
- **Padronização e prevenção para scripts shell:**
  - Instruction `.github/instructions/shell-scripts.instructions.md` com regras de shebang, `set -euo pipefail`, headers, quoting, JSON via Node.js e integridade de hook.
  - Skill `.github/skills/shell-script-review/SKILL.md` para revisão de scripts shell.
  - Hook `.github/hooks/enforce-shell-script-standards.json` + script `.github/hooks/scripts/enforce-shell-script-standards.sh`.
  - `.husky/pre-commit` e `.husky/post-merge` agora usam `#!/usr/bin/env bash` e `set -euo pipefail`.
  - Scripts de hook migraram escaping JSON de `sed` para Node.js `JSON.stringify()`.
  - Testes `.github/hooks/scripts/enforce-shell-script-standards.test.js` e `.github/hooks/scripts/validate-urls.test.js`.
  - Guias `docs/en/ai-guidelines.md` e `docs/pt-BR/ai-guidelines.md` atualizados.
- **Validações executadas:**
  - ✅ `npm run lint` — 71 arquivos, sem erros
  - ✅ `npm test` — 440/440 passando
  - ✅ `npm run defence:check-md-links` — 128 arquivos válidos
  - ✅ `npm run defence:check-external-urls` — 95 URLs alcançáveis, 2 known-dead
  - ✅ `bash .husky/pre-commit` — passou (lint, external URLs, signatures, audit, update-check, license, verify-defences, badge)

### Fase E — Documentação conceitual ✅

- Criar `docs/{en,pt-BR}/learning-path.md`, `docs/{en,pt-BR}/faq.md`.
- Criar `docs/{en,pt-BR}/tools/<tool>.md` para todas as ferramentas.
- Atualizar `README.md`, `docs/{en,pt-BR}/index.md`, `docs/{en,pt-BR}/tools.md`.
- Corrigir `CONTRIBUTING.md`: `npm run format:check` no lugar de `npm run format -- --check`.
- **Status:** concluída em 2026-09-08. Validações: `npm test` 441/441, `npm run lint`, `npm run format:check`, `npm run defence:check-md-links`, `npm run defence:check-external-urls`, `bash .husky/pre-commit`, `npm run defence:verify-defences` passando.

### Melhoria de IA — Subagent Governance

> Executada como preparação para a Fase F, em 2026-09-08.

- Adicionar `create_file`, `create_directory`, `file_search`, e `list_dir` a todos os agents em `.github/agents/*.agent.md`.
- Adicionar `fetch_webpage` aos agents `security` e `compliance`.
- Expandir `.github/skills/subagent-invocation/SKILL.md` com árvore de decisão, checklists pré/pós-delegação, prompts modelo, diagrama Mermaid, protocolo de gap de tool e anti-patterns.
- Criar `.github/agents/README.md` com matriz agente-ferramenta e tarefa-tool-agente, gerada por `.github/agents/scripts/generate-capability-matrix.js`.
- Criar `.github/agents/agents.sanity.test.js` para validar frontmatter YAML e regras mínimas de tools por domínio.
- Criar `.github/ISSUE_TEMPLATE/ai-tool-gap.yml` para registrar gaps de tool como melhoria contínua.
- Criar `.github/hooks/subagent-invocation.json` + `.github/hooks/scripts/subagent-invocation.sh` para validar chamadas `runSubagent` com níveis educativo, advertência e bloqueio.
- Atualizar `docs/en/ai-guidelines.md` e `docs/pt-BR/ai-guidelines.md` com a matriz, o novo hook e a descrição expandida da skill.
- Registrar o incidente original e a expansão da governança em `.github/ai-lessons-learned.md`.
- **Status:** concluída. Validações: `npm run lint`, `npm run format:check`, `npm test` 547/547, `npm run defence:check-md-links`, `npm run defence:check-external-urls`, `npm run defence:verify-defences`, `bash .husky/pre-commit` passando.

### Fase AI-1 — Migração VS Code 1.140 (prompts → skills) ✅

> Concluída em 2026-10-05. VS Code 1.140 removeu o suporte a
> `.github/prompts/*.prompt.md` e adota a especificação Agent Skills.

- Converter os 9 prompts one-shot em skills sob demanda em `.github/skills/`
  com `disable-model-invocation: true`, `description` real (o quê + quando) e
  `argument-hint` onde aplicável; placeholders `__ESTILO_PROMPT__` substituídos
  por instruções ao agente.
- Normalizar as 14 skills legadas para a spec: `name` em kebab-case igual à
  pasta, `description` obrigatória, remoção dos campos legados `applyTo`/`tools`
  (nomes inválidos faziam o VS Code ignorar a skill silenciosamente).
- Fundir 5 pares sobrepostos (decisão do mantenedor): `review-security` →
  `security-audit`, `update-docs` → `docs-update`, `review-ai-output` →
  `self-review`, `verify-command-contract` → `script-contract-verification`,
  `code-review-for-learning` → `educational-code-review`. Total final: 18 skills.
- Criar `.github/skills/skills.sanity.test.js` (163 testes) validando cada
  frontmatter contra a spec; registrado nos scripts `test` e `test:coverage`.
- Atualizar `docs/{en,pt-BR}/ai-guidelines.md`,
  `.github/instructions/file-organization.instructions.md`,
  `.github/agents/repository-organization.agent.md`,
  `.github/skills/self-review/SKILL.md`, `TODO.md` (4.5/4.7), `CHANGELOG.md` e
  `.github/ai-lessons-learned.md`.
- **Commits:** `7c68fe2` (migração), `0a46aeb` (normalização + fusões).
- **Validações:** `npm run lint`, `npm test` 710/710,
  `npm run defence:check-md-links` (174 arquivos),
  `npm run defence:verify-defences` (72 arquivos) — todos passando.

### Fase F — Verificação de execução de comandos ✅

> **Status: concluída em 2026-10-05.** F.0–F.3 implementados e validados.
>
> **Observação de design registrada na validação F.3.2 (dados reais):** quando
> `latest` está em quarentena mas existem intermediárias elegíveis (caso real:
> `@biomejs/biome 2.5.8 → 2.5.15` com 2.5.9–2.5.14 elegíveis), o pacote permanece
> em `quarantine` e `defence:update` não o aplica — a F.1.1 cobre apenas pacotes
> `eligible`. Avaliar como follow-up (nova decisão do mantenedor) se
> `defence:update` deve oferecer/aplicar a maior intermediária elegível também
> para pacotes em quarentena, já que elas passaram pelo mesmo portão de idade.

> **Decisões confirmadas em 2026-09-08:**
> - Mensagens informativas (sync warning e offline fallback) devem ser sempre exibidas em `defence:update-check`, mesmo com `--silent`.
> - `defence:update-check` deve descobrir e relatar versões intermediárias elegíveis (campo `intermediateEligible`) entre `current`/`wanted` e `latest`.
> - `defence:update` deve preferir a maior versão intermediária elegível em vez de `latest`.
> - O checklist `command-verification-checklist.md` deve documentar todos os scripts `defence:*` em `package.json`.

#### F.0 — Correção de contrato em `tools/check-updates.js`

- F.0.1 Ajustar `main()` para chamar `printSyncWarning()` independentemente de `isSilent` quando `node_modules` estiver fora de sincronia.
- F.0.2 Exibir mensagem ℹ️ de fallback offline mesmo quando `--silent` estiver ativo.
- F.0.3 Em `classifyUpdate()`, buscar no packument do registry todas as versões entre `current`/`wanted` e `latest` que tenham idade `>= MIN_AGE_DAYS`, ordenar por semver e retornar em `intermediateEligible`.
- F.0.4 Atualizar formatadores table/json/markdown para incluir `intermediateEligible`.
- F.0.5 Adicionar testes em `tools/check-updates.test.js` para: silent mantém sync/offline warnings; descoberta de intermediárias; presença nos 3 formatos; persistência no state.

#### F.1 — Integração com `tools/update-packages.js`

- F.1.1 Carregar `.defence-update-check.json` e, para cada pacote elegível, preferir a maior versão em `intermediateEligible`.
- F.1.2 Quando houver intermediárias elegíveis, aplicar `npm install <pkg>@<versão-intermediária>` em vez de `npm update` genérico, preservando `--save-exact` e `ignore-scripts`.
- F.1.3 Re-executar portões de defesa (idade, assinatura, auditoria, licença) após a instalação das versões intermediárias.
- F.1.4 Adicionar testes em `tools/update-packages.test.js` para aplicação de intermediárias, fallback para latest, modo interativo e dry-run.

#### F.2 — Command Verification Checklist

- F.2.1 Definir template: propósito, contrato, flags, modos silencioso/formato, códigos de saída, arquivo de teste, observações.
- F.2.2 Criar `docs/en/command-verification-checklist.md` cobrindo todos os scripts `defence:*` em categorias: Setup & Bootstrap, Dependency Management, Auditing & Verification, State & Synchronization, Documentation & Compliance, Performance & Monitoring, Miscellaneous.
- F.2.3 Criar `docs/pt-BR/command-verification-checklist.md` como tradução/adaptação cultural, mantendo comandos e flags inalterados.
- F.2.4 Atualizar `docs/{en,pt-BR}/index.md` e `docs/{en,pt-BR}/tools.md` com links para o checklist.

#### F.3 — Validação final

- F.3.1 Rodar `npm test`, `npm run lint`, `npm run format:check`, `npm run defence:check-md-links`, `npm run defence:check-external-urls`, `bash .husky/pre-commit`, `npm run defence:verify-defences`.
- F.3.2 Verificações manuais: `--silent` mantém avisos; `update-check` lista intermediárias; `update` aplica intermediária; links do checklist resolvem; `.defence-manifest.json` sincronizado.

### Fase AI-2 — Governança e ergonomia das customizações AI

> **Decisão do mantenedor (2026-10-05): executar após a Fase F.** Itens derivados
> da avaliação da estrutura de AI pós-AI-1. Nenhum item é P0; o objetivo é
> reduzir falhas silenciosas, ruído de invocação e drift de documentação.

#### AI-2.1 — Skills pesadas em contexto `fork` (experimental)

- AI-2.1.1 Adicionar `context: fork` às skills que leem muitos arquivos ou produzem raciocínio intermediário irrelevante para a conversa principal: `context-recovery`, `security-audit`, `repository-organization-audit`, `project-status-evaluation`.
- AI-2.1.2 Documentar em `docs/{en,pt-BR}/ai-guidelines.md` que `context: fork` é experimental e requer o setting `github.copilot.chat.skillTool.enabled`, com instrução de rollback (remover o campo) caso o comportamento mude.
- AI-2.1.3 Registrar a decisão e a lista de skills forkadas em `docs/{en,pt-BR}/ai-guidelines.md` para que futuras skills pesadas sigam o mesmo padrão.
- Critério de aceite: `skills.sanity.test.js` continua verde (já valida `context: fork`); skills sem `context` permanecem inline.

#### AI-2.2 — Visibilidade no menu `/` (`user-invocable`)

- AI-2.2.1 Marcar skills de conhecimento de fundo com `user-invocable: false`: `subagent-invocation` e `context-recovery` (existem para o modelo carregar por relevância, não para invocação manual).
- AI-2.2.2 Revisar as demais 16 skills e registrar a convenção: automáticas por padrão; `disable-model-invocation: true` apenas nas ex-prompts one-shot (`generate-test`, `check-hardcoded-values`, `validate-architecture`, `project-status-evaluation`).
- AI-2.2.3 Documentar a matriz de visibilidade (automática / manual / oculta) em `docs/{en,pt-BR}/ai-guidelines.md`.
- Critério de aceite: `skills.sanity.test.js` verde com flags booleanas válidas.

#### AI-2.3 — Recursos empacotados nas skills

- AI-2.3.1 Criar `.github/skills/release-checklist/checklist-template.md` (template do checklist de release) e referenciá-lo via link relativo no `SKILL.md`.
- AI-2.3.2 Criar `.github/skills/generate-test/test-template.js` (esqueleto de teste `node:test` com DI hooks, timeouts e comentários de hardcode justificados) e referenciá-lo no `SKILL.md`.
- AI-2.3.3 Estender `.github/skills/skills.sanity.test.js` para verificar que links Markdown relativos dentro de cada `SKILL.md` apontam para arquivos existentes no diretório da skill (a spec só carrega recursos referenciados).
- Critério de aceite: recursos referenciados existem; sanity test cobre a regra.

#### AI-2.4 — Sanity test para hooks

- AI-2.4.1 Criar `.github/hooks/hooks.sanity.test.js` validando, para cada `.github/hooks/*.json`: JSON parseável; campos obrigatórios conforme a [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference) (`version`, `hooks`); todo caminho `scripts/*.sh` referenciado existe; toda skill mencionada na mensagem do script existe em `.github/skills/`.
- AI-2.4.2 Registrar o novo teste nos scripts `test` e `test:coverage` do `package.json`.
- Critério de aceite: hook quebrado ou órfão falha no `npm test` em vez de falhar silenciosamente em runtime.

#### AI-2.5 — Índice gerado de skills

- AI-2.5.1 Criar `.github/skills/scripts/generate-skills-index.js` que gera `.github/skills/README.md` (tabela: nome → descrição → modo de invocação: automática, manual ou oculta), espelhando o padrão de `.github/agents/README.md`.
- AI-2.5.2 Adicionar teste de drift em `skills.sanity.test.js` (ou no novo teste de índice): regenerar o conteúdo em memória e falhar se o `README.md` commitado estiver dessincronizado.
- AI-2.5.3 Linkar o índice a partir de `docs/{en,pt-BR}/ai-guidelines.md`.
- Critério de aceite: `node .github/skills/scripts/generate-skills-index.js` é idempotente; drift quebra o `npm test`.

#### AI-2.6 — Validação e encerramento

- AI-2.6.1 Rodar `npm test`, `npm run lint`, `npm run format:check`, `npm run defence:check-md-links`, `npm run defence:check-external-urls`, `npm run defence:verify-defences`, `bash .husky/pre-commit`.
- AI-2.6.2 Atualizar `CHANGELOG.md` (seção `[Unreleased]`), checkboxes do `TODO.md` e, se houver lições, `.github/ai-lessons-learned.md`.

### Fase G — Code review educacional

> **Status (2026-10-05): pendente.** `docs/{en,pt-BR}/code-review-improvements.md`
> não existe.

- Definir padrão de header comment para `tools/*.js` e `tools/lib/*.js`.
- Auditar headers, mensagens de erro, hardcoded values e links a camadas de defesa.
- Gerar `docs/{en,pt-BR}/code-review-improvements.md` e aplicar melhorias P0/P1.

### Fase H — Organização e governança

> **Status (2026-10-05): parcialmente aberta.** Verificado que o Biome ainda
> cobre apenas `tools/**/*.js` e `*.js` (`files.includes` em `biome.json`;
> `biome check .github/` processa 0 arquivos). Os helpers
> `tools/lib/concurrency.js`, `formatters.js` e `cli.js` não foram extraídos.

- Auditar estrutura, padrões applyTo e arquivos órfãos.
- Extrair helpers duplicados para `tools/lib/concurrency.js`, `tools/lib/formatters.js`, `tools/lib/cli.js`.
- Criar `docs/{en,pt-BR}/repository-organization.md`.
- Expandir o escopo de lint/format do Biome para cobrir `.github/**/*.js` (atualmente só valida `tools/`).

### Fase I — Revisão total da documentação

- Atualizar `docs/{en,pt-BR}/architecture.md` com todas as ferramentas e bibliotecas.
- Revisar camadas de segurança, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, glossário e consistência bilíngue.

### Fase J — Avaliação do projeto

- Coletar métricas atuais e verificar problemas do `PROJECT_STATUS_REPORT.md` de 2026-08-20.
- Gerar novo `PROJECT_STATUS_REPORT.md` e decidir se atingiu 10/10.
- Atualizar `TODO.md` com ações derivadas.

### Fase K — Planejamento do release v1.0.0

- Só inicia com aprovação explícita, nota 10/10 e zero itens P0.
- Planejar tag, GitHub Release com SBOM e comunicação.

## Arquivos críticos

- `PLAN.md`, `TODO.md` — manter nomenclatura e checkboxes sincronizados com a realidade.
- `package.json`, `CHANGELOG.md`, `README.md` — sincronizar contadores/status.
- `tools/check-updates.js`, `tools/check-updates.test.js` — correções de contrato (Fase F).
- `.github/agents/`, `.github/skills/`, `.github/instructions/`, `.github/hooks/` — customizações AI
  (`.github/prompts/` foi removido no VS Code 1.140; ver Fase AI-1).
- `.github/skills/skills.sanity.test.js` — guarda de conformidade das skills com a spec.
- `.github/hooks/hooks.sanity.test.js` — guarda de integridade dos hooks (a criar na Fase AI-2).
- `.github/skills/scripts/generate-skills-index.js` — índice gerado de skills (a criar na Fase AI-2).
- `docs/{en,pt-BR}/tools/` — páginas individuais.
- `tools/lib/concurrency.js`, `tools/lib/formatters.js`, `tools/lib/cli.js` — helpers a extrair (Fase H).
- `PROJECT_STATUS_REPORT.md` — regenerar na Fase J.

## Verificação

- Toda fase: `npm test`, `npm run lint`, `npm run defence:check-md-links`, `bash .husky/pre-commit`, `npm run defence:verify-defences` passando.
- Fase prévia: badge sincronizado com a contagem real de testes.
- AI-0: novas customizações documentadas em `ai-guidelines.md`.
- AI-1: skills válidas pela spec Agent Skills; `skills.sanity.test.js` verde;
  zero referências a `.github/prompts/` fora de notas históricas.
- AI-2: skills forkadas carregam com `context: fork`; hooks inválidos/órfãos
  falham no `npm test`; índice de skills sem drift; menu `/` sem skills de
  conhecimento de fundo.
- E: páginas criadas e links validados.
- F: `defence:update-check` informativo e com listagem de updates intermediários.
- G: headers completos e listas de melhorias geradas.
- H: helpers extraídos sem regressão; lint/format do Biome cobrindo `.github/**/*.js`.
- I: arquitetura e glossário atualizados.
- J: novo status report reflete estado real.
- K: só após aprovação explícita.

## Decisões confirmadas

- Manter version: `"1.0.0"` em `package.json`/`CHANGELOG.md`, mas release só na Fase K.
- Criar páginas individuais `docs/{en,pt-BR}/tools/<tool>.md` para todas as ferramentas.
- Adicionar mensagem informativa no `defence:update-check` quando silencioso.
- Buscar versões intermediárias elegíveis entre current e latest.
- Extrair helpers duplicados para `tools/lib/`.
- VS Code 1.140: skills seguem a spec Agent Skills (name = pasta em kebab-case,
  description obrigatória); ex-prompts one-shot usam `disable-model-invocation: true`;
  pares sobrepostos foram fundidos em vez de mantidos duplicados (2026-10-05).
- Fase AI-2 executada após a Fase F (decisão do mantenedor, 2026-10-05):
  melhorias de AI não bloqueiam o trabalho de produto.
