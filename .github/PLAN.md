# Plano de Ação — Reorganização pós-Fase D com Fase AI-0 Foundation

> **Authoritative plan.** This file is the source of truth for the current
> project plan. AI assistants must read it at the start of every session or
> when the user asks to resume/review the plan. Do not rely on session memory.
>
> Last updated: 2026-11-03

## TL;DR

Fases prévia, AI-0, Pre-Fase E, E, AI-1 (migração VS Code 1.140), F
(verificação de comandos, com `intermediateEligible` de ponta a ponta), F.4
(quarentena acionável), AI-2 (governança/ergonomia das customizações AI), G
(code review educacional + cobertura 94,70% → 95,94%), AI-3.5 (DECISIONS.md +
destilação), H (organização: Biome, helpers, CODEOWNERS, badge) e **L**
(gestão de engines: update 24.19.0 → 24.22.2 por CVEs, ferramenta
`update-engines.js`, guarda `check-npmrc`, ADRs de min-release-age e
Permission Model) concluídas. Da AI-4, o bloco AI-4.1 (commits granulares)
também está concluído.

Sequência restante (ressequenciada em 2026-11-03, decisão do mantenedor):
**AI-4.2–AI-4.4** (code review em 4 eixos + adoção VS Code 1.144) →
**I** (+ AI-3.4: mapa de arquitetura de AI) → **AI-3.3** (observabilidade
JSONL) → **J** (avaliação 10/10) → **AI-3.2** (prompt-injection/sanitização)
→ **AI-3.1** (inject-context, se a medição justificar) → **M.1** (dogfooding
do instalador no projeto irmão) → **K** (release v1.0.0, com aprovação
explícita) → **M.2/M.3** (scaffolding completo e scaffolding de infra AI —
pós-v1.0.0, alvo v1.1.0).

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

### Fase F.4 — Intermediárias elegíveis para pacotes em quarentena ✅

> **Status: concluída em 2026-10-05.** Validação manual com dados reais:
> `defence:update --dry-run` ofereceu `@biomejs/biome@2.5.14` (intermediário
> aprovado no portão de idade) mantendo `2.5.15` bloqueado; `2.5.15` jamais
> apareceu como alvo.

> **Decisão do mantenedor (2026-10-05):** estender `defence:update` para agir
> sobre pacotes em quarentena que possuem intermediárias elegíveis. Origem:
> observação de design da F.3.2 — com dados reais, `@biomejs/biome 2.5.8 →
> 2.5.15` (latest em quarentena) tinha 6 intermediárias (2.5.9–2.5.14) já
> aprovadas no portão de idade, mas inacessíveis ao update. Como as
> intermediárias passaram pelo mesmo portão de idade que qualquer pacote
> elegível, aplicá-las não enfraquece a defesa — `latest` continua bloqueado
> até completar a idade mínima.

#### F.4.1 — Hardening da descoberta em `tools/check-updates.js`

- F.4.1.1 Excluir versões **deprecated** de `intermediateEligible` (o packument traz `versions[v].deprecated`); uma versão depreciada nunca deve ser alvo recomendado — vale para pacotes elegíveis e em quarentena.
- F.4.1.2 Testes: intermediária deprecated é excluída; lista pode ficar vazia quando só há deprecated/recentes.

#### F.4.2 — Quarentena acionável em `tools/update-packages.js`

- F.4.2.1 Definir `getActionableQuarantine(state)`: entradas de `quarantine` com `reason === 'too recent'` **e** `intermediateEligible.length > 0`. Entradas com falha de lookup no registry nunca são acionáveis (não há dados confiáveis).
- F.4.2.2 Fluxo não-interativo: aplicar instalação pinada para elegíveis (alvo = maior intermediária, que inclui `latest` quando elegível) **e** para quarentena acionável (alvo = maior intermediária, sempre `< latest`); fallback para `npm update` genérico apenas quando não há nenhum dos dois.
- F.4.2.3 Fluxo interativo: perguntar primeiro os elegíveis, depois a quarentena acionável com nota explícita (`latest X ainda em quarentena; alvo intermediário Y já passou o portão de idade`).
- F.4.2.4 `saveDecisions`: registrar `target` e `source: 'eligible' | 'quarantine'` por pacote.
- F.4.2.5 Dry-run (ambos os modos): listar os dois grupos separadamente com rótulos claros.

#### F.4.3 — Testes

- F.4.3.1 `tools/check-updates.test.js`: cobertura de F.4.1.
- F.4.3.2 `tools/update-packages.test.js`: quarentena acionável aplicada no não-interativo; prompt com nota de quarentena no interativo; quarentena com falha de registry ignorada; decisões com `source`; dry-run separando os grupos.

#### F.4.4 — Documentação

- F.4.4.1 Atualizar `docs/{en,pt-BR}/tools/update-packages.md` e `docs/{en,pt-BR}/tools/check-updates.md` com o novo comportamento.
- F.4.4.2 Atualizar as entradas de `update-packages.js`/`check-updates.js` em `docs/{en,pt-BR}/command-verification-checklist.md`.
- F.4.4.3 Entrada no `CHANGELOG.md` (`[Unreleased]`).

#### F.4.5 — Validação final (mesmo padrão da F.3)

- F.4.5.1 Gates: `npm test`, `npm run lint`, `npm run format:check`, `npm run defence:check-md-links`, `npm run defence:check-external-urls`, `npm run defence:verify-defences`, `bash .husky/pre-commit`.
- F.4.5.2 Verificações manuais com dados reais: `check-updates --force` lista intermediárias; `update --dry-run` mostra a quarentena acionável de `@biomejs/biome` com alvo 2.5.14; `update --interactive --dry-run` idem; confirmar que `latest` 2.5.15 **não** é oferecido como alvo.
- F.4.5.3 Registrar resultados no PLAN/TODO e commitar.

### Fase AI-2 — Governança e ergonomia das customizações AI ✅

> **Status: concluída em 2026-10-07** (VS Code 1.141.0). Validação AI-2.8:
> `npm test` 844/844, `lint`, `format:check`, `defence:check-md-links` (178),
> `defence:check-external-urls` (100), `defence:verify-defences` (72) e
> `bash .husky/pre-commit` — todos passando.
>
> Critérios de aceite verificados: 6 skills com `context: fork` (sem efeito
> observável no 1.141 — mantido como futuramente ativável, documentado em
> `ai-lessons-learned.md`); `hooks.sanity.test.js` verde; índice de skills com
> drift check; menu `/` sem skills de background; always-on em 2.412 bytes
> (≤ 3 KB); write guard bloqueando `.env*`/`.git/`/paths externos; bloqueios
> logados em `security-blocks.log`; state files com `schemaVersion: 1`.
>
> **Decisão do mantenedor (2026-10-05): executar após a Fase F.** Itens derivados
> da avaliação da estrutura de AI pós-AI-1. Nenhum item é P0; o objetivo é
> reduzir falhas silenciosas, ruído de invocação e drift de documentação.
> **Nota:** com a criação da Fase F.4, a AI-2 executa após F.4.
> **Escopo expandido (2026-10-06, aprovado pelo mantenedor):** revisão da fase
> adicionou os blocos AI-2.6 (economia de tokens) e AI-2.7 (segurança da
> execução), e ampliou AI-2.1/AI-2.4. Medidas de base: always-on
> `copilot-instructions.md` ≈ 3,5 KB (~900 tokens por requisição);
> instructions 12 KB; agents 24 KB; skills 46 KB.

#### AI-2.1 — Skills pesadas em contexto `fork` (experimental)

- AI-2.1.1 Adicionar `context: fork` às skills que leem muitos arquivos ou produzem raciocínio intermediário irrelevante para a conversa principal: `context-recovery`, `security-audit`, `repository-organization-audit`, `project-status-evaluation`, `docs-completeness`, `validate-urls`.
- AI-2.1.2 Documentar em `docs/{en,pt-BR}/ai-guidelines.md` que `context: fork` é experimental e requer o setting `github.copilot.chat.skillTool.enabled`, com instrução de rollback (remover o campo) caso o comportamento mude.
- AI-2.1.3 Registrar a decisão e a lista de skills forkadas em `docs/{en,pt-BR}/ai-guidelines.md` para que futuras skills pesadas sigam o mesmo padrão.
- Critério de aceite: `skills.sanity.test.js` continua verde (já valida `context: fork`); skills sem `context` permanecem inline.
- **Status (2026-10-07): concluído** (commit `509454e`). Observação registrada:
  em VS Code 1.141.0, tanto o harness Copilot SDK quanto a Agents Window
  executaram a skill forkada inline/background, sem indicação visível de
  subagente — campo mantido por ser inócuo e futuramente ativável; revalidar
  após updates do VS Code (ver `ai-lessons-learned.md`).

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

#### AI-2.4 — Sanity test para hooks + escopo por glob

- AI-2.4.1 Criar `.github/hooks/hooks.sanity.test.js` validando, para cada `.github/hooks/*.json`: JSON parseável; campos obrigatórios conforme a [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference) (`version`, `hooks`); todo caminho `scripts/*.sh` referenciado existe; toda skill mencionada na mensagem do script existe em `.github/skills/`.
- AI-2.4.2 Registrar o novo teste nos scripts `test` e `test:coverage` do `package.json`.
- AI-2.4.3 **Performance:** escopar hooks de pós-edição por glob (`auto-lint-test` para `tools/**/*.js`, `validate-urls` para `docs/**` + config) para reduzir execuções desnecessárias em cada edição.
- Critério de aceite: hook quebrado ou órfão falha no `npm test` em vez de falhar silenciosamente em runtime; hooks de pós-edição só disparam em paths relevantes.

#### AI-2.5 — Índice gerado de skills

- AI-2.5.1 Criar `.github/skills/scripts/generate-skills-index.js` que gera `.github/skills/README.md` (tabela: nome → descrição → modo de invocação: automática, manual ou oculta), espelhando o padrão de `.github/agents/README.md`.
- AI-2.5.2 Adicionar teste de drift em `skills.sanity.test.js` (ou no novo teste de índice): regenerar o conteúdo em memória e falhar se o `README.md` commitado estiver dessincronizado.
- AI-2.5.3 Linkar o índice a partir de `docs/{en,pt-BR}/ai-guidelines.md`.
- Critério de aceite: `node .github/skills/scripts/generate-skills-index.js` é idempotente; drift quebra o `npm test`.

#### AI-2.6 — Economia de tokens + correção do session-memory

- AI-2.6.1 Compactar `.github/copilot-instructions.md` (always-on) de ~3,5 KB para ≤ 2,5 KB: fundir bullets redundantes (ex.: "Prevent Infinite Loops" em uma regra única; "Session Continuity" resumido, com detalhes delegados à skill `context-recovery`), sem perder nenhuma regra normativa.
- AI-2.6.2 Deduplicar regras repetidas entre camadas: manter a regra canônica em um lugar só (copilot-instructions ou a instruction de domínio) e referenciar nas demais (ex.: regra de hardcoded values hoje aparece em 3 arquivos).
- AI-2.6.3 Adicionar guarda de tamanho em `skills.sanity.test.js` e `agents.sanity.test.js`: `SKILL.md` ≤ 10 KB e `copilot-instructions.md` ≤ 3 KB, para impedir inchamento gradual (limites intencionalmente acima do atual — o objetivo é detectar crescimento descontrolado, não otimização fina).
- AI-2.6.4 **Corrigir o drift do session-memory path (M1):** `copilot-instructions.md` referencia `/memories/session/plan.md`, mas o harness atual usa `~/.copilot/session-state/<id>/files/`. Tornar a instrução agnóstica de harness ("cópia de sessão fornecida pelo harness") e documentar o comportamento real.
- Critério de aceite: always-on reduzido sem perda de regras; guarda de tamanho verde; instrução de memória consistente com o harness real; `npm run defence:check-md-links` íntegro.

#### AI-2.7 — Segurança da execução pela AI

- AI-2.7.1 **Write guard:** novo hook `.github/hooks/enforce-write-paths.json` + script que bloqueia/avisa sobre escrita em paths sensíveis (`.env*`, `.npmrc` quando contém tokens, `.git/`, fora do workspace) e exige confirmação explícita para `.husky/` e `package.json` (que já têm gates próprios, mas merecem fricção extra).
- AI-2.7.2 **Auditoria de bloqueios:** o script `enforce-security.sh` passa a registrar tentativas bloqueadas em log JSONL gitignored (`.github/hooks/security-blocks.log`), criando base para revisão periódica de falsos positivos (como o commit-message bloqueado na Fase F.1) e tentativas reais de bypass.
- AI-2.7.3 **Auditoria da matriz agente×tool:** estender `agents.sanity.test.js` com o invariante de que todo agent com `run_in_terminal` declara escopo restrito em `applyTo` (não pode ser applyTo ausente/amplo), documentando a exceção se houver.
- AI-2.7.4 **Contratos de saída versionados para state files (P1):** adicionar `schemaVersion` a `.defence-update-check.json` e `.defence-update-decisions.json`, com validação na leitura (warn quando a versão do arquivo for maior que a suportada pelo leitor). Fecha a classe de bugs "ferramenta A nova lendo state de versão desconhecida" — hoje coberta por sorte de design, não por garantia.
- AI-2.7.5 **Bloqueio orientado a reparo (APPA lite):** toda mensagem de bloqueio/aviso dos hooks deve indicar o caminho sancionado (o `enforce-security` já faz isso informalmente — formalizar como regra coberta por teste, inspirado no conceito de recuperação-em-vez-de-aborto de [APPA, arXiv:2607.24625](https://arxiv.org/abs/2607.24625v2)).
- AI-2.7.6 **Smoke test E2E do write guard (P3):** teste que simula chamadas do hook com paths maliciosos fora do IDE, provando o comportamento fora do editor.
- Critério de aceite: escrita em path sensível é bloqueada/avisada; bloqueios geram entrada de log; invariante da matriz verde; state files carregam `schemaVersion` com warn em incompatibilidade; mensagens de bloqueio incluem o caminho sancionado.

#### AI-2.8 — Validação e encerramento

- AI-2.8.1 Rodar `npm test`, `npm run lint`, `npm run format:check`, `npm run defence:check-md-links`, `npm run defence:check-external-urls`, `npm run defence:verify-defences`, `bash .husky/pre-commit`.
- AI-2.8.2 Atualizar `CHANGELOG.md` (seção `[Unreleased]`), checkboxes do `TODO.md` e, se houver lições, `.github/ai-lessons-learned.md`.

### Fase AI-3 — Resiliência e observabilidade da estrutura de AI

> Escopo definido em 2026-10-06 durante a revisão da Fase AI-2; itens de maior
> complexidade/baixa urgência adiados para depois da Fase G (ou conforme
> prioridade do mantenedor).
>
> **Resequenciamento (2026-10-08, decisão do mantenedor):** em vez de uma fase
> monolítica pós-J, os itens foram distribuídos por dependência real com as
> demais fases — avaliação de "o que acelera/melhora H, I e J":
>
> | Item | Posição | Motivo |
> |---|---|---|
> | AI-3.5 DECISIONS.md + destilação | **Antes de H** (primeiro a executar) | Captura as decisões de H/I *enquanto acontecem*; depois seria reconstrução retroativa |
> | AI-3.4 Mapa da arquitetura de AI | **Fundido à Fase I** | Documentar a estrutura antes de H reorganizá-la geraria retrabalho; I já reescreve `architecture.md` |
> | AI-3.3 Observabilidade JSONL unificada | **Entre I e J** | O log consolidado alimenta a avaliação J com evidências medidas de uso/bloqueios |
> | AI-3.2 Prompt-injection + sanitização de outputs | **Entre J e K** | Endurecimento de conteúdo pré-release; não muda estrutura, docs ou métricas de H/I/J |
> | AI-3.1 Otimização do inject-context | **Última; condicionada à medição** | O hook injeta ~120 bytes hoje; só otimizar se a medição mostrar custo real — pode virar "não fazer" documentado |
>
> Sequência efetiva: **AI-3.5 → H → I(+AI-3.4) → AI-3.3 → J → AI-3.2 → AI-3.1 → K**
>
> **Atualização (2026-11-03):** as fases **L** (engines) e **AI-4** (processos
> de AI) foram inseridas **antes** da Fase I, e a **M.1** (dogfooding) antes da
> K — ver TL;DR para a sequência vigente.

- AI-3.1 **Otimização do hook `inject-context`:** medir o custo do session-start (tempo e tokens injetados); cachear dados estáticos (engines, contagens) com invalidação por mtime dos arquivos-fonte.
- AI-3.2 **Smoke test de prompt-injection e sanitização de outputs em CI:** fixtures de documentação com instruções maliciosas embutidas ("ignore previous instructions…") verificando que skills/agents mantêm o comportamento esperado; estender a skills/tools que ingerem conteúdo externo (web fetch, respostas de registry) com validação do output *antes* de admiti-lo no contexto — segunda fase do monitor de referência inspirada em [APPA, arXiv:2607.24625](https://arxiv.org/abs/2607.24625v2).
- AI-3.3 **Observabilidade estruturada:** log JSONL unificado (gitignored) de hooks disparados, skills invocadas e bloqueios, com página docs/`{en,pt-BR}` explicando como ler — material didático ("quantas vezes a defesa te protegeu") e insumo para decidir quais regras viram hook.
- AI-3.4 **Mapa da arquitetura de AI:** seção em `docs/{en,pt-BR}/architecture.md` descrevendo o modelo mental das 5 camadas (always-on → instructions → skills → agents → hooks) e onde posicionar cada tipo de regra nova.
- AI-3.5 **Memória de decisões (M2/M3):** criar `DECISIONS.md` (ADRs leves: data, decisão, motivo, alternativa rejeitada — ex.: "F.4: intermediárias aplicáveis em quarentena porque passam pelo mesmo portão de idade"); estender a skill `context-recovery` com um passo de destilação de fim de sessão (extrair para DECISIONS/lessons o que merece persistir).

### Fase G — Code review educacional ✅

> **Status: concluída em 2026-10-07.** G.1–G.3 concluídos (relatório bilíngue em
> `docs/{en,pt-BR}/code-review-improvements.md`, correção P1 aplicada no
> `trust-engine.js`) e **cobertura elevada de 94,70% para 95,94%**, acima da
> meta de ≥ 95%. A busca por cobertura encontrou e corrigiu um bug de produção
> real: os wrappers `exec`/`execSync` de `tools/lib/process-monitor.js`
> ignoravam a implementação injetável (`childProcessImpl`), quebrando o
> contrato de DI do monitor. Hotspots atacados: `update-badge.js` 83→98%,
> `process-monitor.js` 87→96%, `run-audit-with-retry.js` 86→93%,
> `check-external-urls.js` 86→95%.

### Fase H — Organização e governança ✅

> **Status: concluída em 2026-10-08.** H.1 (concurrency extraído), H.2 (Biome
> cobre `.github/**/*.js`, 86 arquivos), H.3 + H.3.1 (CODEOWNERS + status
> checks ativos em `main` e `dev`), H.4 (badge 487 → 859 com guarda de
> regressão), H.5 (página bilíngue completa), H.6 (validação + ADR).
> O fluxo de trabalho mudou para PR obrigatória (branch protection ativa).
>
> **Status (2026-10-05): parcialmente aberta.** Verificado que o Biome ainda
> cobre apenas `tools/**/*.js` e `*.js` (`files.includes` em `biome.json`;
> `biome check .github/` processa 0 arquivos). Os helpers
> `tools/lib/concurrency.js`, `formatters.js` e `cli.js` não foram extraídos.
>
> **Refinamento (2026-10-08, aprovado pelo mantenedor) com dados reais:**
> 0 arquivos órfãos em `tools/`; applyTo consistente (sem `**` amplo);
> `runWithConcurrencyLimit` idêntica em 3 arquivos + 1 variação;
> `parseCliArgs` em 12 arquivos mas com flags heterogêneas; formatters são
> específicos de domínio. Conclusão: **extrair apenas `concurrency.js`**
> (duplicação real); `formatters.js`/`cli.js` seriam falsa abstração —
> documentar as convenções em vez de extrair.
>
> Sub-itens refinados:
> - **H.1** Extrair `tools/lib/concurrency.js` de `check-updates.js`,
>   `check-package-age.js`, `trust-engine.js` (e avaliar
>   `check-external-urls.js`) + testes + manifesto.
> - **H.2** Expandir Biome para `.github/**/*.js` e corrigir o que surgir.
> - **H.3** Criar `.github/CODEOWNERS` (tools/, .npmrc, .husky/, hooks,
>   workflows → mantenedor) + documentar a exigência de review de code owner
>   na branch protection.
> - **H.4** Corrigir o drift do badge: `TEST_GLOBS` em `tools/update-badge.js`
>   deve cobrir os mesmos arquivos do script `test` (incl. `.github/**`).
> - **H.5** Criar `docs/{en,pt-BR}/repository-organization.md` com o estado
>   final (incl. a decisão de não extrair formatters/cli).
> - **H.6** Validação final (gates completos) + registrar no `DECISIONS.md` a
>   decisão "documentar, não extrair" para formatters/cli.
>
> Itens originais preservados abaixo para rastreabilidade:

- Auditar estrutura, padrões applyTo e arquivos órfãos.
- Extrair helpers duplicados para `tools/lib/concurrency.js`, `tools/lib/formatters.js`, `tools/lib/cli.js`.
- Criar `docs/{en,pt-BR}/repository-organization.md`.
- Expandir o escopo de lint/format do Biome para cobrir `.github/**/*.js` (atualmente só valida `tools/`).
- **CODEOWNERS (P2, 2026-10-06):** criar `.github/CODEOWNERS` atribuindo `tools/`, `.npmrc`, `.husky/`, `.github/hooks/` e `.github/workflows/` ao mantenedor, e habilitar "require review from code owners" na branch protection — a camada de defesa *organizacional* que complementa as 12 camadas técnicas (dogfooding da defesa humana em revisão).

### Fase L — Gestão de engines (Node.js/npm)

> **Origem (2026-11-03):** o release de segurança do Node.js de 2026-10-21
> corrigiu **8 CVEs (4 High, incl. OOB write no Brotli com potencial de RCE
> via `node:zlib`)** nas linhas 22.x/24.x/26.x; o pin atual `24.19.0`
> (2026-08-03) antecede todos esses fixes. v24.22.2 (Krypton, npm bundled
> 11.19.1) é o tip da linha v24; **v26.13.0 "Lithium"** é o novo LTS
> (2026-10-28, npm bundled 11.20.0). Fonte oficial:
> `nodejs.org/dist/index.json` — a mesma que `actions/setup-node` consome,
> portanto "existe no dist" = "disponível no CI".
>
> **Política de npm (decisão do mantenedor, 2026-11-03):** a versão do npm é
> sempre a **bundled com o release do Node.js** — nunca `npm@latest` solto.
>
> **Sequência:** executa **antes** da Fase I (remediação de CVE é forcing
> function — não pode esperar docs).

- **L.0** Update imediato `24.19.0 → 24.22.2` (npm `>=11.19.1`): editar
  `package.json#engines` e `.nvmrc`, `nvm install`/`use`, rodar gates locais e
  confirmar CI verde. Execução manual e documentada — serve como especificação
  viva para a ferramenta da L.1. **Upgrade para v26 fica para depois da L.1**
  (decisão do mantenedor: primeiro só o update v24).
  - **Status (2026-11-03): executado** — 23 arquivos de requisito atualizados
    (engines, lockfile, `.nvmrc`, badges, CONTRIBUTING, docs bilíngues);
    referências históricas preservadas. Validação local sob Node 24.22.2 /
    npm 11.19.1; CI validada na PR.
- **L.1** `tools/update-engines.js` + `update-engines.test.js`:
  - Modo *update* (patch/minor dentro do major atual) e modo *upgrade*
    (major LTS alvo), com `--dry-run`, `--format=json`, `--silent`.
  - Consulta `nodejs.org/dist/index.json` (com cache/retry via `tools/lib/`)
    para descobrir o alvo mais recente e a versão de npm bundled.
  - Atualiza `package.json#engines` e `.nvmrc` de forma cirúrgica (preservar
    formatação — lição do `npm install` que reescreve JSON).
  - Recusa alvo ausente do dist (= indisponível no CI) com mensagem acionável.
  - Registrar `defence:engines:*` no `package.json` e no checklist de comandos.
  - **Status (2026-11-03): concluído.** Modos report/`--update`/`--upgrade`/
    `--to`; recusa de downgrade e de alvo fora do dist; edição cirúrgica de
    `package.json`, lockfile (só entrada raiz) e `.nvmrc`; scripts
    `defence:update-engines[:update|:upgrade]`; 14 testes com fetch/fs
    injetados + smoke test contra o dist real. Bônus: helpers semver
    byte-idênticos extraídos para `tools/lib/semver.js` (regra do 2º
    consumidor). Smoke test real: linha v24 atualizada, upgrade v26.13.0
    Lithium corretamente detectado como disponível.
- **L.2** Higiene do `.npmrc` e blind spot `.npm-extension.mjs`:
  - **Achado de 2026-11-03:** npm ≥ 11.2 avisa `Unknown project config` para
    `npm-audit-fix-level` e `send-metrics` — chaves mortas cujos comentários
    prometem comportamento que o npm não implementa (falsa sensação de
    segurança). Remover/substituir por configuração válida e adicionar guarda
    de chaves conhecidas (sanity check; avaliar `strict-npmrc` do npm v12).
  - Auditar `analyze-lifecycle-scripts.js`/`check-secrets.js` para detectar/
    flagar `.npm-extension.mjs` (extensão root-owned do npm v12); documentar
    que `ignore-scripts` implica `ignore-extension`; atualizar a página da
    camada afetada em ambos os idiomas.
  - **Status (2026-11-03): concluído.** Investigação revelou que as chaves
    eram **lookahead intencional já documentado** (npmrc-hardening.md) —
    decisão do mantenedor: manter, alinhar os comentários inline do `.npmrc`
    (que afirmavam o comportamento como vigente) e criar a guarda. Nova
    ferramenta `tools/check-npmrc.js` (11 testes): chaves conhecidas curadas +
    registro lookahead com justificativa + valores defensivos proibidos +
    rejeição do mecanismo de extensão do npm v12 (chave `extension-file` e
    arquivos auto-descobertos). Gate real: pre-commit (hashes ressincronizados)
    + job `defence-gates` do CI. **Bug de adoção encontrado e corrigido:**
    `FILES_TO_COPY` do instalador havia driftado (faltavam concurrency.js,
    semver.js, update-engines.js, check-npmrc.js — o toolset adotado quebraria
    no `require`); corrigido + teste de completude anti-drift (todo arquivo de
    `tools/` é adotado ou explicitamente excluído) + scripts
    `defence:check-npmrc`/`defence:update-engines*` registrados para
    adotantes. Manifesto: 72 → 79 arquivos.
- **L.3** Avaliações documentadas (ADRs + docs):
  - `min-release-age=7` **já está adotado** no `.npmrc` (verificado em
    2026-11-03): falta o ADR formalizando a adoção e docs bilíngues do
    tradeoff "janela de idade × patch de segurança" (npm falha fechado:
    mantém a versão vulnerável e avisa; escape via `min-release-age-exclude`).
  - Permission Model do Node (`--permission`, estável): registrar por que
    **não** é sandbox de install para código não-confiável (docs oficiais +
    2 CVEs de bypass corrigidos em out/2026); posicioná-lo, se adotado, como
    hardening de runtime de código já vetado.
  - **Status (2026-11-03): concluído.** Dois ADRs em `DECISIONS.md`
    (min-release-age formalizado retroativamente com o comportamento
    fail-closed documentado; `--permission` rejeitado como sandbox de
    install — P3 sandbox futuro deve usar isolamento de SO). Docs:
    `npmrc-hardening.md` (tradeoff fail-closed) e
    `security/lifecycle-script-analysis.md` (limitações), ambos os idiomas.
- **L.4** Validação final: gates completos + `nvm use` limpo + CI verde +
  entradas no CHANGELOG/TODO/DECISIONS.
  - **Status (2026-11-03): concluído.** Gates locais verdes sob Node
    24.22.2 / npm 11.19.1 (902/902 testes, lint 92 arquivos, 187 md);
    CI validada nas PRs da fase.

### Fase AI-4 — Processos de AI: granularidade de commits e code review

> **Origem (2026-11-03):** feedback do mantenedor — commits de AI acumulam
> features/correções demais; faltam processos de review cobrindo qualidade,
> segurança e remoção de código morto (incl. docs relacionadas). Somado à
> avaliação do VS Code 1.144.1 (release notes lidos integralmente:
> **zero deprecations**; novidades: validação de `.agent.md` com completions de
> `model`/`tools`/`skills`, `/skills info`, Copilot Memory cloud habilitado por
> padrão, Assisted Permissions GA, marketplace Browse; `context: fork` **sem
> menção** — exige re-teste empírico; blog Agent Host indica hooks rodando em
> processo host compartilhado/remoto).
>
> **Sequência:** executa depois da L e **antes** da Fase I — AI-4.1 melhora a
> qualidade de todos os commits das fases seguintes.

- **AI-4.1** Commits granulares:
  - Regra normativa (copilot-instructions + instruction de domínio): 1 commit
    = 1 intenção; separar código/docs/plano; tamanho prático por commit;
    mensagens com escopo único.
  - Hook de advertência para staged diff grande/multidomínio (avaliar ponto de
    disparo: `preToolUse` em `git commit` vs `.husky/pre-commit`) — avisar, não
    bloquear, com o caminho sancionado (como dividir).
  - ADR registrando a regra e o threshold escolhido.
  - **Status (2026-11-03): concluído.** Regra no always-on
    (`copilot-instructions.md`, 2.998/3.072 bytes) e em `CONTRIBUTING.md`;
    hook `.github/hooks/warn-oversized-commit.json` (preToolUse,
    `bash|powershell`) medindo o staged diff no momento do `git commit` —
    consultivo por decisão (ADR): bumps mecânicos legítimos não podem ser
    bloqueados. Limites: 8 arquivos / 400 linhas / 2 domínios (par bilíngue
    conta como 1), sobregraváveis por env para testes. 9 testes E2E em repos
    git temporários.
- **AI-4.2** Processo de code review de AI em 4 eixos:
  - Qualidade de código (reusar `educational-code-review`), segurança de
    código (reusar `security-audit`), **remoção de código morto (novo)** e
    revisão da documentação relacionada aos itens revisados (reusar
    `docs-completeness`).
  - Criar skill orquestradora (ex.: `code-review-pass`) que encadeia os eixos
    e produz relatório único; avaliar ferramenta leve de dead-code sem deps
    novas (exports/CLI flags não referenciados) ou manter análise 100% agente.
  - **Status (2026-11-03): concluído.** Skill `code-review-pass` (manual,
    4 eixos, relatório único) + ferramenta `tools/check-dead-code.js`
    **consultiva** (exit 0 sempre — ADR; análise estática não prova
    inalcançabilidade com os idiomas CJS da base: DI, harnesses por alias,
    `require().member()` inline). Primeira triagem executada: 41 exports
    desexportados, 2 funções mortas deletadas, 4 exports mantidos com novos
    testes diretos; baseline zerado (915/915 testes). Incidente registrado:
    agir sobre a lista de candidatos imatura quebrou 35 testes — regra
    "a suíte é a árbitra" agora na skill e no lessons-learned.
- **AI-4.3** Adoção VS Code 1.144:
  - Re-teste empírico de `context: fork` nas 6 skills forkadas (procedimento
    da AI-2.1); atualizar `ai-lessons-learned.md` com o resultado.
  - Declarar `target` explícito nos `.agent.md` (comportamento determinístico
    de completions/validação independente do harness ativo).
  - Política Copilot Memory × memória em arquivos: DECISIONS.md/lessons/
    PLAN.md continuam sendo a fonte **versionada e auditável**; memory cloud é
    cache volátil — documentar em `ai-guidelines` (ambos idiomas).
  - Registrar a interação Assisted Permissions × nossos hooks `preToolUse`
    (nossos hooks continuam sendo a última palavra).
  - Avaliar deep links `vscode://chat-customizations/open?page=...` nos docs
    de onboarding (opcional, baixo custo).
- **AI-4.4** Validação final: gates completos + docs bilíngues + sanity suites.

### Fase I — Revisão total da documentação

> **Refinamento (2026-10-08) com auditoria real:** README, SECURITY e paridade
> bilíngue já estão saudáveis; o trabalho concentra-se em 3 arquivos + 1 rename
> + a seção de AI (AI-3.4 fundido). A pedido do mantenedor, inclui também uma
> revisão de confirmação do README/SECURITY.
>
> - **I.1** `docs/{en,pt-BR}/architecture.md`: árvore completa de `tools/lib/`
>   (faltam 5 módulos: install-monitor-report, process-monitor, profiler,
>   script-analyzer, trust-engine; e 12 testes de lib na árvore) + nova seção
>   "AI customization layer" (AI-3.4: as 5 camadas — always-on → instructions →
>   skills → agents → hooks — e onde posicionar regras novas).
> - **I.2** `docs/{en,pt-BR}/glossary.md`: adicionar 8 termos criados nas fases
>   recentes — `intermediateEligible`, `quarantine`, `schemaVersion`,
>   `CODEOWNERS`, `skill`, `agent`, `hook`, `fork`.
> - **I.3** `CONTRIBUTING.md`: corrigir o comando de format documentado
>   (`npx biome format tools/ --check` → `npm run format:check`) e alinhar a
>   tabela de jobs de CI com o `ci.yml` real (faltam installer-dry-run,
>   actionlint; nomes desatualizados).
> - **I.4** Renomear `docs/{en,pt-BR}/tools/check-links.md` →
>   `check-md-links.md` para alinhar com o script, e corrigir os links.
> - **I.5** Revisão de confirmação do `README.md` e `SECURITY.md` (leitura
>   completa para garantir que nada ficou de fora, mesmo já estando saudáveis)
>   + revisão final de consistência dos índices.
> - **I.6** Validação final (gates completos + paridade bilíngue + links).

### Fase J — Avaliação do projeto

- Coletar métricas atuais e verificar problemas do `PROJECT_STATUS_REPORT.md` de 2026-08-20.
- Gerar novo `PROJECT_STATUS_REPORT.md` e decidir se atingiu 10/10.
- Atualizar `TODO.md` com ações derivadas.
- **(Opcional, P4)** `tools/measure-ai-context.js`: medir bytes por camada de customização AI (always-on, instructions, agents, skills) para incluir o custo de tokens real — medido, não estimado — no status report.

### Fase K — Planejamento do release v1.0.0

- Só inicia com aprovação explícita, nota 10/10 e zero itens P0.
- Planejar tag, GitHub Release com SBOM e comunicação.

### Fase M — Adoção e scaffolding

> **Origem (2026-11-03, decisão do mantenedor):** levar as defesas para fora
> do próprio repositório. **M.1 executa antes da K** (valida o instalador num
> projeto real e alimenta correções pré-release); **M.2/M.3 são pós-v1.0.0**
> (alvo v1.1.0) para não inflar o escopo do release.

- **M.1** Dogfooding (pré-release): executar `install-defences.js` em
  `../setup-webpack-stylus-liquid/` (projeto real, webpack/babel/postcss),
  documentar gaps encontrados, abrir itens de correção e reexecutar até a
  instalação ficar limpa; registrar o relatório em docs bilíngues.
- **M.2** Scaffolding de projeto zerado (v1.1.0):
  `tools/create-defended-project.js` — novo projeto Node.js já com todas as
  camadas de defesa configuradas (ou pré-configuradas com prompts), incluindo
  opção de nascer com a infraestrutura de AI deste repositório.
- **M.3** Scaffolding exclusivo da infraestrutura de AI (v1.1.0): instalar
  apenas o conjunto `.github/` (instructions, agents, skills, hooks,
  sanity suites) em projeto zerado ou em andamento sem infra de AI; avaliar o
  marketplace/Browse do VS Code 1.144 como canal de distribuição.

## Arquivos críticos

- `PLAN.md`, `TODO.md` — manter nomenclatura e checkboxes sincronizados com a realidade.
- `package.json`, `CHANGELOG.md`, `README.md` — sincronizar contadores/status.
- `tools/check-updates.js`, `tools/check-updates.test.js` — correções de contrato (Fase F).
- `.github/agents/`, `.github/skills/`, `.github/instructions/`, `.github/hooks/` — customizações AI
  (`.github/prompts/` foi removido no VS Code 1.140; ver Fase AI-1).
- `.github/skills/skills.sanity.test.js` — guarda de conformidade das skills com a spec.
- `.github/hooks/hooks.sanity.test.js` — guarda de integridade dos hooks (a criar na Fase AI-2).
- `.github/hooks/enforce-write-paths.json` + script — write guard de paths sensíveis (a criar na Fase AI-2.7).
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
  conhecimento de fundo; always-on ≤ 2,5 KB sem perda de regras; escrita em
  path sensível bloqueada; bloqueios do enforce-security logados.
- E: páginas criadas e links validados.
- F: `defence:update-check` informativo e com listagem de updates intermediários.
- G: headers completos e listas de melhorias geradas.
- H: helpers extraídos sem regressão; lint/format do Biome cobrindo `.github/**/*.js`.
- L: engines no tip da linha v24 (ou v26 após upgrade); `update-engines.js`
  honra contrato de comando; `.npm-extension.mjs` detectado; ADRs de
  `min-release-age` e Permission Model registrados.
- AI-4: regra de commit granular normativa + hook de advertência ativo;
  processo de review em 4 eixos documentado; `context: fork` re-testado no
  VS Code 1.144; `target` explícito nos agents; política Copilot Memory
  documentada.
- I: arquitetura e glossário atualizados.
- J: novo status report reflete estado real.
- K: só após aprovação explícita.
- M.1: instalação no projeto irmão limpa, com relatório bilíngue.

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
  melhorias de AI não bloqueiam o trabalho de produto. Escopo expandido em
  2026-10-06 (aprovado): blocos de tokens (AI-2.6) e segurança da execução
  (AI-2.7); itens adiados agrupados na Fase AI-3 (após a Fase G).
- A versão do npm é sempre a bundled com o release do Node.js adotado — nunca
  `npm@latest` avulso (decisão do mantenedor, 2026-11-03).
- Release de segurança do Node.js é forcing function para update imediato de
  engine (patch/minor), separado do drift de rotina (2026-11-03).
- Fases L e AI-4 executam antes da Fase I; M.1 (dogfooding) antes da K;
  scaffolding M.2/M.3 fica para v1.1.0 (decisões do mantenedor, 2026-11-03).
