# Plano de Ação — Reorganização pós-Fase D com Fase AI-0 Foundation

> **Authoritative plan.** This file is the source of truth for the current
> project plan. AI assistants must read it at the start of every session or
> when the user asks to resume/review the plan. Do not rely on session memory.
>
> Last updated: 2026-09-08

## TL;DR

Consolidar `PLAN.md` e `TODO.md` na nomenclatura AI-0/E–K, executar baseline real, criar customizações AI como prioridade zero, depois documentação, contratos de script, code review, organização, revisão total, avaliação de status e só então planejar release v1.0.0.

## Fases

### Fase prévia — Alinhamento de nomenclatura e baseline

- Unificar `TODO.md` (0–11) e `PLAN.md` para Fase AI-0, E, F, G, H, I, J, K.
- Rodar `npm test`, `npm run lint`, `npm run defence:check-md-links`, `bash .husky/pre-commit`, `npm run defence:verify-defences`.
- Sincronizar badge de testes em `README.md` com a contagem real (referências anteriores apontavam 432/432; validar contagem atual).

### Fase AI-0 — AI Customizations Foundation (P0) (prioridade zero)

- Criar agentes: `command-execution`, `code-review`, `repository-organization`, `project-evaluation`.
- Criar skills: `script-contract-verification`, `educational-code-review`, `docs-completeness`, `repository-organization-audit`.
- Criar instructions: `educational-code-quality`, `file-organization`, `project-evaluation`.
- Criar prompts: `code-review-for-learning`, `verify-command-contract`, `validate-architecture`, `project-status-evaluation`.
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

### Fase E — Documentação conceitual

- Criar `docs/{en,pt-BR}/learning-path.md`, `docs/{en,pt-BR}/faq.md`.
- Criar `docs/{en,pt-BR}/tools/<tool>.md` para todas as ferramentas.
- Atualizar `README.md`, `docs/{en,pt-BR}/index.md`, `docs/{en,pt-BR}/tools.md`.
- Corrigir `CONTRIBUTING.md`: `npm run format:check` no lugar de `npm run format -- --check`.

### Fase F — Verificação de execução de comandos

- Criar `docs/{en,pt-BR}/command-verification-checklist.md`.
- Corrigir `defence:update-check`: mensagem informativa quando silencioso; buscar versões intermediárias elegíveis.
- Verificar contratos dos scripts críticos e documentar no checklist.

### Fase G — Code review educacional

- Definir padrão de header comment para `tools/*.js` e `tools/lib/*.js`.
- Auditar headers, mensagens de erro, hardcoded values e links a camadas de defesa.
- Gerar `docs/{en,pt-BR}/code-review-improvements.md` e aplicar melhorias P0/P1.

### Fase H — Organização e governança

- Auditar estrutura, padrões applyTo e arquivos órfãos.
- Extrair helpers duplicados para `tools/lib/concurrency.js`, `tools/lib/formatters.js`, `tools/lib/cli.js`.
- Criar `docs/{en,pt-BR}/repository-organization.md`.

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

- `PLAN.md`, `TODO.md` — realinhar nomenclatura.
- `package.json`, `CHANGELOG.md`, `README.md` — sincronizar contadores/status.
- `tools/check-updates.js`, `tools/check-updates.test.js` — correções de contrato.
- `.github/agents/`, `.github/skills/`, `.github/instructions/`, `.github/prompts/`, `.github/hooks/` — customizações AI.
- `docs/{en,pt-BR}/tools/` — páginas individuais.
- `tools/lib/concurrency.js`, `tools/lib/formatters.js`, `tools/lib/cli.js` — helpers extraídos.
- `PROJECT_STATUS_REPORT.md` — regenerar na Fase J.

## Verificação

- Toda fase: `npm test`, `npm run lint`, `npm run defence:check-md-links`, `bash .husky/pre-commit`, `npm run defence:verify-defences` passando.
- Fase prévia: badge sincronizado com a contagem real de testes.
- AI-0: novas customizações documentadas em `ai-guidelines.md`.
- E: páginas criadas e links validados.
- F: `defence:update-check` informativo e com listagem de updates intermediários.
- G: headers completos e listas de melhorias geradas.
- H: helpers extraídos sem regressão.
- I: arquitetura e glossário atualizados.
- J: novo status report reflete estado real.
- K: só após aprovação explícita.

## Decisões confirmadas

- Manter version: `"1.0.0"` em `package.json`/`CHANGELOG.md`, mas release só na Fase K.
- Criar páginas individuais `docs/{en,pt-BR}/tools/<tool>.md` para todas as ferramentas.
- Adicionar mensagem informativa no `defence:update-check` quando silencioso.
- Buscar versões intermediárias elegíveis entre current e latest.
- Extrair helpers duplicados para `tools/lib/`.
