# TODO

This file tracks the remaining work required for the project to be considered
**concluded**: a 10/10 quality score across security, code quality, performance,
documentation, and AI-assisted development, plus a regenerated
`PROJECT_STATUS_REPORT.md` with the maximum score in every category.

The **release v1.0.0 is a future action** that will only be planned and executed
after the project itself is fully concluded. It is not a current gate.

Items are prioritized with `P0` (critical/blocking for conclusion), `P1`
(important for conclusion), `P2` (improvement for conclusion), and `P3`
(experimental or post-conclusion).

Priority order: **P0 → P1 → P2 → P3**.

This file follows the nomenclature defined in `.github/PLAN.md`:
Fase prévia → AI-0 → E → F → G → H → I → J → K.

---

## Fase prévia — Alinhamento de nomenclatura e baseline

- [x] Unificar `TODO.md` (fases 0–11) e `PLAN.md` para Fase AI-0, E, F, G, H, I,
  J, K.
- [x] Rodar `npm test`, `npm run lint`, `npm run defence:check-md-links`,
  `bash .husky/pre-commit`, `npm run defence:verify-defences`.
- [x] Sincronizar badge de testes em `README.md` com a contagem real
  (`npm test` reporta 432/432; badge atualizado via `tools/update-badge.js`).

## Fase AI-0 — AI Customizations Foundation (P0)

- [x] Criar agentes: `command-execution`, `code-review`,
  `repository-organization`, `project-evaluation`.
- [x] Criar skills: `script-contract-verification`,
  `educational-code-review`, `docs-completeness`,
  `repository-organization-audit`.
- [x] Criar instructions: `educational-code-quality`, `file-organization`,
  `project-evaluation`.
- [x] Criar prompts: `code-review-for-learning`, `verify-command-contract`,
  `validate-architecture`, `project-status-evaluation`.
- [x] Criar hooks: `enforce-security`, `auto-lint-test`, `inject-context`
  seguindo o schema da [GitHub Copilot hooks reference](https://docs.github.com/en/copilot/reference/hooks-reference)
  (funcionalidades de docs-drift e command-contract foram incorporadas ao `auto-lint-test`).
- [x] Revisar agentes/skills/prompts/hooks/instructions existentes para refletir
  as novas fases.
- [x] Atualizar `docs/en/ai-guidelines.md` e `docs/pt-BR/ai-guidelines.md`.

## Fase E — Documentação conceitual ✅

> Concluída em 2026-09-08 (ver PLAN.md, Fase E). Checkboxes sincronizados em 2026-10-05.

- [x] Criar `docs/{en,pt-BR}/learning-path.md`.
- [x] Criar `docs/{en,pt-BR}/faq.md`.
- [x] Criar `docs/{en,pt-BR}/tools/<tool>.md` para todas as ferramentas.
- [x] Atualizar `README.md`, `docs/{en,pt-BR}/index.md`,
  `docs/{en,pt-BR}/tools.md`.
- [x] Corrigir `CONTRIBUTING.md`: `npm run format:check` no lugar de
  `npm run format -- --check`.

## Fase F — Verificação de execução de comandos

> Detalhamento completo e decisões em `.github/PLAN.md` (F.0–F.3). Verificado em
> 2026-10-05: nenhum subitem implementado — esta é a próxima fase a executar.

- [x] **F.0** Corrigir contrato em `tools/check-updates.js`: warnings de
  sync/offline sempre visíveis mesmo com `--silent`; descobrir versões
  intermediárias elegíveis (`intermediateEligible`) entre current/wanted e
  latest; incluir o campo nos formatos table/json/markdown; cobrir com testes.
  - Concluído em 2026-10-05: warnings roteados para stderr (stdout fica limpo
    para `--format=json`); 13 novos testes; config `maxIntermediateEligible`.
- [x] **F.1** Integrar `tools/update-packages.js`: preferir a maior versão
  intermediária elegível em vez de `latest`, re-executar os portões de defesa
  após instalar; testes para intermediárias, fallback, interativo e dry-run.
  - Concluído em 2026-10-05: `resolveTargetVersion` + instalação pinada
    (`npm install --save-exact --ignore-scripts pkg@alvo`); portão de licenças
    adicionado às camadas de verificação; 7 novos testes.
- [x] **F.2** Criar `docs/{en,pt-BR}/command-verification-checklist.md`
  documentando todos os scripts `defence:*` (propósito, contrato, flags, modos
  silencioso/formato, códigos de saída, arquivo de teste) e linkar a partir de
  `docs/{en,pt-BR}/index.md` e `docs/{en,pt-BR}/tools.md`.
  - Concluído em 2026-10-05: 39 scripts em 7 categorias, links adicionados.
- [x] **F.3** Validação final: suite completa de gates + verificações manuais
  listadas no PLAN.
  - Concluído em 2026-10-05: todos os gates verdes; verificado com dados reais
    que `--silent` mantém avisos no stderr, `update-check` lista 6
    intermediárias elegíveis reais de `@biomejs/biome`, links do checklist
    resolvem e manifesto está sincronizado. Ver observação no PLAN.md sobre
    intermediárias em pacotes em quarentena.
- [x] **F.4** Intermediárias elegíveis para pacotes em quarentena (decisão do
  mantenedor, 2026-10-05; detalhamento em `.github/PLAN.md`, F.4.1–F.4.5).
  - [x] **F.4.1** Excluir versões deprecated de `intermediateEligible` em
    `tools/check-updates.js` (+ testes).
  - [x] **F.4.2** `tools/update-packages.js`: `getActionableQuarantine()`
    (somente `reason === 'too recent'` com intermediárias); aplicar alvo
    pinado também para quarentena acionável nos fluxos não-interativo e
    interativo; `source` no arquivo de decisões; dry-run com grupos separados.
  - [x] **F.4.3** Testes dos dois arquivos cobrindo os novos caminhos.
  - [x] **F.4.4** Docs bilíngues (tools pages + checklist) e CHANGELOG.
  - [x] **F.4.5** Validação final no padrão F.3 (gates + verificações manuais
    com dados reais, confirmando que `latest` em quarentena não é oferecido).
    - Concluído em 2026-10-05: 738/738 testes; caso real `@biomejs/biome`
      oferecido como `@2.5.14` (intermediário) com `2.5.15` bloqueado.

## Fase AI-2 — Governança e ergonomia das customizações AI ✅

> Detalhamento completo em `.github/PLAN.md` (AI-2.1–AI-2.8). Decisão do
> mantenedor em 2026-10-05: executar após a Fase F. Escopo expandido em
> 2026-10-06 (aprovado): novos blocos AI-2.6 (tokens) e AI-2.7 (segurança).

- [x] **AI-2.1** Adicionar `context: fork` às skills pesadas
  (`context-recovery`, `security-audit`, `repository-organization-audit`,
  `project-status-evaluation`, `docs-completeness`, `validate-urls`) e
  documentar o requisito experimental nos ai-guidelines bilíngues.
  - Concluído em 2026-10-07 (VS Code 1.141.0 com `skillTool.enabled`).
- [x] **AI-2.2** Marcar skills de conhecimento de fundo com
  `user-invocable: false` (`subagent-invocation`, `context-recovery`) e
  documentar a matriz de visibilidade (automática/manual/oculta).
  - Concluído em 2026-10-07: matriz documentada nos ai-guidelines bilíngues;
    12 automáticas, 4 manuais, 2 background.
- [x] **AI-2.3** Empacotar recursos nas skills: `release-checklist/checklist-template.md`
  e `generate-test/test-template.js`, referenciados via links relativos;
  estender `skills.sanity.test.js` para validar que recursos linkados existem.
  - Concluído em 2026-10-07: 181 testes de sanidade (18 novos de recursos);
    `file-organization.instructions.md` documenta o padrão de recursos.
- [x] **AI-2.4** Criar `.github/hooks/hooks.sanity.test.js` (JSON parseável,
  campos obrigatórios da hooks reference, scripts e skills referenciadas
  existem), registrá-lo nos scripts `test`/`test:coverage`, e escopar hooks de
  pós-edição por glob (`auto-lint-test` → `tools/**/*.js`, `validate-urls` →
  docs/config).
  - Concluído em 2026-10-07: 30 testes de sanidade de hooks + 8 testes novos
    para `suggest-validation.sh` (que não tinha cobertura); corrigida contagem
    hardcoded obsoleta "432/432 expected"; o escopo por path já existia dentro
    dos scripts (o campo `matcher` filtra por nome de ferramenta, não por path)
    e foi ampliado para cobrir testes em `.github/`.
- [x] **AI-2.5** Criar `.github/skills/scripts/generate-skills-index.js`
  gerando `.github/skills/README.md`, com teste de drift no `npm test` e link
  nos ai-guidelines bilíngues.
  - Concluído em 2026-10-07: índice com 18 skills (modo de invocação, fork,
    descrição), `--check` idempotente integrado ao sanity suite (182 testes).
- [x] **AI-2.6** Economia de tokens: compactar `copilot-instructions.md`
  (≤ 2,5 KB sem perder regras), deduplicar regras repetidas entre camadas por
  referência, guarda de tamanho nos sanity tests (SKILL.md ≤ 10 KB,
  copilot-instructions ≤ 3 KB), e corrigir o drift do session-memory path
  (instrução fala de `/memories/`; harness real usa `session-state/<id>/files/`).
  - Concluído em 2026-10-07: always-on 3,5 KB → 2,4 KB (−32%); regra de
    hardcoded values canonizada e referenciada; guardas de tamanho ativas;
    path de memória de sessão agnóstico de harness.
- [x] **AI-2.7** Segurança da execução: hook `enforce-write-paths` (bloqueio de
  escrita em `.env*`, `.git/`, fora do workspace; fricção extra para
  `.husky/`/`package.json`), log JSONL de bloqueios do `enforce-security`
  (gitignored), invariante no `agents.sanity.test.js` (agent com
  `run_in_terminal` exige `applyTo` restrito), `schemaVersion` nos state files
  `.defence-update-check.json`/`.defence-update-decisions.json` (P1), mensagens
  de bloqueio sempre indicando o caminho sancionado (APPA lite), e smoke test
  E2E do write guard (P3).
  - Concluído em 2026-10-07: 13 testes de hooks novos (incl. primeira cobertura
    do `enforce-security.sh`), 4 testes de schemaVersion, invariante de matriz
    verde; documentação do sandboxing do VS Code 1.141 como camada
    complementar.
- [x] **AI-2.8** Validação final: gates completos, `CHANGELOG.md`, checkboxes e
  `ai-lessons-learned.md` atualizados.
  - Concluído em 2026-10-07: 844/844 testes, todos os gates verdes,
    pre-commit exit 0; PLAN.md registra os critérios de aceite verificados.

## Fase AI-3 — Resiliência e observabilidade da estrutura de AI

> Definida em 2026-10-06 na revisão da AI-2. Ressequenciada em 2026-10-08
> (decisão do mantenedor) por dependência real: **AI-3.5 → H → I(+AI-3.4) →
> AI-3.3 → J → AI-3.2 → AI-3.1 → K**. Detalhamento em `.github/PLAN.md`.

- [x] **AI-3.5** (executar antes de H) Memória de decisões: criar
  `DECISIONS.md` (ADRs leves) e estender `context-recovery` com destilação de
  fim de sessão.
  - Concluído em 2026-10-08: `DECISIONS.md` criado com 7 ADRs retroativas
    (F.4, migração de skills, stderr, reparo APPA, resequenciamento AI-3,
    data-free drift check); context-recovery lê DECISIONS no início e destila
    decisões/lições/plano no fim da sessão; referência no always-on.
- [x] **AI-3.1** (última; condicionada à medição) Otimizar o hook
  `inject-context` (medir custo do session-start; cachear dados estáticos com
  invalidação por mtime).
  - Concluído em 2026-11-03 como **"não fazer" documentado (ADR)**:
    medição real — 143 bytes (~36 tokens) e ~96 ms, uma vez por sessão;
    caching por mtime economizaria ~90 ms/sessão a custo de complexidade de
    invalidação e risco de dados obsoletos. O canal `sessionStart` no
    `measure-ai-context.js` torna a evidência reproduzível.
- [x] **AI-3.2** (entre J e K) Smoke test de prompt-injection e sanitização de
  outputs em CI (fixtures com instruções maliciosas embutidas; validação de
  output de tools externas antes de admitir no contexto — segunda fase do
  monitor, APPA).
  - Concluído em 2026-11-03: `validate-external-content.js` (packument + dist
    index) conectado às 3 ferramentas que decidem com dados externos;
    autocorreção de cache envenenado; smoke suite de injeção (modelo
    comprometido → hooks negam) + guarda de frases de injeção nos arquivos
    de AI; ADR + ai-guidelines EN/PT.
- [x] **AI-3.3** (entre I e J) Observabilidade estruturada: log JSONL
  unificado de hooks, skills e bloqueios + página de docs bilíngue explicando
  a leitura.
  - Concluído em 2026-11-03: `log-hook-event.js` + `observability-summary.js`;
    9 hooks fiados; `security-blocks.log` migrado; log limitado (5.000) e
    à prova de falhas; `ai-observability.md` EN/PT; ADR registrado.
    Limitação documentada: invocações de skills pelo modelo não são
    observáveis por hooks.
- [x] **AI-3.4** (fundido à Fase I) Mapa da arquitetura de AI em
  `docs/{en,pt-BR}/architecture.md` (as 5 camadas e onde posicionar regras
  novas).

## Fase G — Code review educacional ✅

- [x] Definir padrão de header comment para `tools/*.js` e `tools/lib/*.js`.
  - Formalizado em 2026-10-07: todos os 34 arquivos de produção já seguiam o
    padrão de-facto (shebang → `'use strict'` → header de propósito); agora
    documentado no relatório da fase.
- [x] Auditar headers, mensagens de erro, hardcoded values e links a camadas de
  defesa.
  - P0: nenhum. P1: pesos/thresholds do `trust-engine.js` sem justificativa —
    corrigido inline. P2: 2 itens documentados como débito.
- [x] Gerar `docs/{en,pt-BR}/code-review-improvements.md` e aplicar melhorias
  P0/P1.
- [x] Elevar a cobertura de linhas para ≥ 95% (concluído em 2026-10-07:
  **95,94%**, era 94,70%; +14 testes nos 4 maiores hotspots; a busca por
  cobertura revelou e corrigiu um bug de produção nos wrappers `exec`/`execSync`
  de `tools/lib/process-monitor.js`, que ignoravam a implementação injetável).

## Fase H — Organização e governança ✅

> Refinada em 2026-10-08 com dados reais (ver PLAN.md). Extrair apenas
> `concurrency.js` (duplicação real); formatters/cli seriam falsa abstração —
> documentar as convenções.

- [x] **H.1** Extrair `tools/lib/concurrency.js` (`runWithConcurrencyLimit`)
  de `check-updates.js`, `check-package-age.js`, `trust-engine.js` e avaliar
  `check-external-urls.js`; testes + regenerar manifesto.
  - Concluído em 2026-10-08: helper compartilhado com 5 testes próprios;
    re-export legado e testes duplicados removidos de `check-package-age`;
    `check-external-urls.js` avaliado e mantido (usa loop sequencial, não o
    helper); docs de arquitetura bilíngues atualizadas.
- [x] **H.2** Expandir Biome para `.github/**/*.js` e corrigir o que surgir
  (13 arquivos hoje não lintados).
  - Concluído em 2026-10-08: escopo em `biome.json` + scripts `lint`/`format`
    ampliados para `tools/ .github/` (86 arquivos, +15); auto-fixes aplicados;
    correções manuais no template de teste (biome-ignore justificado) e no
    sanity suite (sem assignment-em-expressão).
- [x] **H.3** Criar `.github/CODEOWNERS` (`tools/`, `.npmrc`, `.husky/`,
  `.github/hooks/`, `.github/workflows/` → mantenedor) + documentar a exigência
  de review de code owner na branch protection.
  - Concluído em 2026-10-08: `.github/CODEOWNERS` criado cobrindo também a
    superfície de AI (`copilot-instructions`, `instructions/`, `agents/`,
    `skills/`); páginas `docs/{en,pt-BR}/repository-organization.md` criadas
    com a seção CODEOWNERS completa (o restante da página é H.5); nota da
    camada organizacional adicionada ao índice de segurança bilíngue.
    ✅ **Confirmado pelo mantenedor em 2026-10-08:** branch protection com
    "Require PR + review de Code Owner" ativa em `main` e `dev`.
- [x] **H.3.1** (evolução sugerida pelo Copilot, aceita em 2026-10-08) Habilitar
  **Required Status Checks** em `main` e `dev`: "Require status checks to pass
  before merging" com os 11 jobs de `.github/workflows/ci.yml` (`Build`,
  `Test`, `Coverage`, `Lint`, `Format`, `Documentation Links`,
  `License Check`, `Lockfile Integrity`, `Secret Scan`, `Installer Dry-Run`,
  `Defence Gates`) + "Require branches to be up to date before merging".
  Documentado em `docs/{en,pt-BR}/repository-organization.md`; a ativação é
  manual (Settings → Branches) — marcar como feito após aplicar no GitHub.
  - ✅ Concluído em 2026-10-08: confirmado pelo mantenedor nos dois branches.
- [x] **H.4** Corrigir drift do badge: `TEST_GLOBS` em `tools/update-badge.js`
  cobrindo os mesmos arquivos do script `test` (hoje 487 vs 858 reais).
  - Concluído em 2026-10-08: globs estendidos para as suítes de sanidade de
    `.github/`; badge atualizado de 487 → 859; guarda de regressão trava o
    drift comparando `TEST_GLOBS` com o script `test` do `package.json`.
- [x] **H.5** Criar `docs/{en,pt-BR}/repository-organization.md` com o estado
  final (incl. a decisão de não extrair formatters/cli).
  - Concluído em 2026-10-08: página completa com convenções de layout, seção
    "o que deliberadamente NÃO é extraído", resultados da auditoria (zero
    órfãos, applyTo higiênico) e a seção CODEOWNERS.
- [x] **H.6** Validação final + registrar no `DECISIONS.md` a decisão
  "documentar, não extrair" para formatters/cli.
  - Concluído em 2026-10-08: ADR registrado; gates verdes.
- [x] ~~Corrigir drift do badge de testes (avaliação 2026-10-07)~~ — **coberto
  por H.4** (item original da sessão de avaliação K2; resolvido com guarda de
  regressão).

## Fase L — Gestão de engines (Node.js/npm)

> Origem: release de segurança Node.js 2026-10-21 (8 CVEs, 4 High) — pin atual
> `24.19.0` antecede os fixes. Detalhes e política npm-bundled no PLAN.md.
> Executa antes da Fase I (decisão do mantenedor, 2026-11-03).

- [x] **L.0** Update imediato `24.19.0 → 24.22.2` (npm `>=11.19.1`):
  `package.json#engines` + `.nvmrc` + `nvm install/use` + gates + CI verde.
  - Executado em 2026-11-03: 23 arquivos de requisito atualizados; gates
    locais verdes sob Node 24.22.2 / npm 11.19.1; CI validada na PR.
- [x] **L.1** `tools/update-engines.js` + testes: modos update (in-major) e
  upgrade (major LTS); consulta `nodejs.org/dist/index.json`; npm = bundled;
  edição cirúrgica de `package.json`/`.nvmrc`; recusa alvo fora do dist;
  scripts `defence:engines:*` + checklist de comandos.
  - Concluído em 2026-11-03 (scripts registrados como
    `defence:update-engines[:update|:upgrade]`); 14 testes + smoke test real;
    helpers semver extraídos para `tools/lib/semver.js`.
- [x] **L.2** Higiene do `.npmrc` (remover/substituir as chaves mortas
  `npm-audit-fix-level`/`send-metrics` + guarda de chaves conhecidas) e blind
  spot `.npm-extension.mjs` (npm v12): detecção nas ferramentas + docs
  bilíngues (`ignore-scripts` ⇒ `ignore-extension`).
  - Concluído em 2026-11-03: chaves eram lookahead intencional documentado —
    mantidas por decisão do mantenedor, comentários inline alinhados. Nova
    ferramenta `check-npmrc.js` (gate no pre-commit + CI). Drift de adoção do
    instalador corrigido com teste de completude (manifesto 72 → 79).
- [x] **L.3** ADRs: formalizar a adoção já existente de `min-release-age=7`
  (com docs bilíngues do tradeoff) e avaliar o Permission Model
  (`--permission` não é sandbox de install).
  - Concluído em 2026-11-03: 2 ADRs em DECISIONS.md; fail-closed documentado
    em npmrc-hardening (EN/PT); limitação do Permission Model registrada em
    lifecycle-script-analysis (EN/PT).
- [x] **L.4** Validação final (gates + `nvm use` + CI + CHANGELOG/DECISIONS).
  - Concluído em 2026-11-03: 902/902 testes, lint 92 arquivos, 187 md,
    CI verde nas PRs da fase.

## Fase AI-4 — Processos de AI: granularidade de commits e code review

> Origem: feedback do mantenedor (commits acumulando escopo) + avaliação do
> VS Code 1.144.1 (zero deprecations; Copilot Memory cloud; Assisted
> Permissions GA; `context: fork` sem menção — re-teste empírico).
> Executa depois da L e antes da Fase I (decisão do mantenedor, 2026-11-03).

- [x] **AI-4.1** Commits granulares: regra normativa (1 commit = 1 intenção) +
  hook de advertência para staged diff grande/multidomínio + ADR.
  - Concluído em 2026-11-03: regra no always-on (2.998 bytes, dentro do
    orçamento de 3 KB) e no CONTRIBUTING; hook `warn-oversized-commit`
    (consultivo, nunca bloqueia) com 9 testes E2E em repos temporários;
    limites 8 arquivos / 400 linhas / 2 domínios (par bilíngue = 1 domínio)
    justificados em ADR.
- [x] **AI-4.2** Processo de code review em 4 eixos (qualidade, segurança,
  código morto, docs relacionadas): skill orquestradora + avaliar ferramenta
  leve de dead-code sem deps novas.
  - Concluído em 2026-11-03: skill `code-review-pass` + ferramenta consultiva
    `check-dead-code.js` (ADR: nunca gate rígido); triagem inicial com 41
    unexports + 2 deleções + 4 keeps-com-teste; baseline zero; lição
    "suíte como árbitra" registrada.
- [x] **AI-4.3** Adoção VS Code 1.144: re-teste de `context: fork`; `target`
  explícito nos `.agent.md`; política Copilot Memory × memória em arquivos;
  interação Assisted Permissions × hooks; deep links de customização (opcional).
  - Concluído em 2026-11-03: fork sem efeito observável no 1.144.1 (mantido,
    revalidar no próximo update); `target: github-copilot` nos 9 agents; seção
    "VS Code 1.144" nos ai-guidelines EN/PT; deep links adiados para a Fase M.
- [x] **AI-4.4** Validação final (gates + sanity suites + docs bilíngues).
  - Concluído em 2026-11-03: 926/926 testes, lint 94, 190 md, manifesto 81.

## Fase I — Revisão total da documentação ✅

> Refinada em 2026-10-08 com auditoria real (ver PLAN.md). README/SECURITY e
> paridade bilíngue já saudáveis; trabalho em 3 arquivos + 1 rename + seção AI.
> **Concluída em 2026-11-03.**

- [x] **I.1** `docs/{en,pt-BR}/architecture.md`: árvore completa real +
  seção "AI customization layer" (AI-3.4) com as 5 camadas e a regra de
  posicionamento de regras novas.
- [x] **I.2** `docs/{en,pt-BR}/glossary.md`: +8 termos (intermediateEligible,
  quarantine, schemaVersion, CODEOWNERS, skill, agent, hook, fork).
- [x] **I.3** `CONTRIBUTING.md`: comando de format corrigido
  (`npm run format:check`) e defence-gates alinhado ao ci.yml (incl.
  check-npmrc da L.2).
- [x] **I.4** Renomear check-links → check-md-links: **resolvido sem ação** —
  os arquivos já estavam corretos; zero referências obsoletas.
- [x] **I.5** README.md/SECURITY.md revisados: adicionadas as capacidades da
  Fase L (check-npmrc, update-engines) e a camada organizacional; índices
  EN/PT consistentes.
- [x] **I.6** Validação final: 926/926 testes, lint 94 arquivos, 190 md,
  manifesto 81, paridade bilíngue mantida.

## Fase J — Avaliação do projeto ✅

> **Concluída em 2026-11-03.** `PROJECT_STATUS_REPORT.md` regenerado com
> métricas medidas: **10/10** em todas as categorias, zero P0. A incluir o
> item opcional P4: `tools/measure-ai-context.js` criado (pegada de contexto
> AI medida, não estimada).

- [x] Coletar métricas atuais e verificar problemas do
  `PROJECT_STATUS_REPORT.md` de 2026-08-20.
- [x] Gerar novo `PROJECT_STATUS_REPORT.md` e decidir se atingiu 10/10.
- [x] Atualizar `TODO.md` com ações derivadas.
- [x] (Opcional, P4) Criar `tools/measure-ai-context.js` para medir bytes por
  camada de customização AI e incluir o custo de tokens real no status report.

## Fase K — Planejamento do release v1.0.0 ✅

- [x] Só inicia com aprovação explícita, nota 10/10 e zero itens P0.
  (Aprovada pelo mantenedor em 2026-11-04.)
- [x] Planejar tag, GitHub Release com SBOM e comunicação.
  (Executado em 2026-11-04: checklist da skill `release-checklist`, gates
  completos verdes — incluindo a captura e correção da regressão do portão
  de idade transitivo.)

## Fase M — Adoção e scaffolding

> M.1 executa antes da K (validação pré-release do instalador); M.2/M.3 são
> pós-v1.0.0, alvo v1.1.0 (decisão do mantenedor, 2026-11-03).

- [x] **M.1** Dogfooding: `install-defences.js` em
  `../setup-webpack-stylus-liquid/`; documentar gaps; iterar até instalação
  limpa; relatório bilíngue.
  - Concluído em 2026-11-03: instalação limpa, suíte adotada 549/549, 8 gaps
    corrigidos na raiz (relatório em `docs/{en,pt-BR}/dogfooding-m1-report.md`,
    ADR para deps não-registry). O projeto irmão segue na branch
    `chore/adopt-defences` para revisão do mantenedor (29 vulns a triangular).
- [ ] **M.2** (v1.1.0) `tools/create-defended-project.js`: scaffolding de
  projeto zerado com defesas completas, com opção de infra de AI incluída.
- [ ] **M.3** (v1.1.0) Scaffolding exclusivo da infra de AI (`.github/`) para
  projetos zerados ou em andamento; avaliar marketplace do VS Code 1.144 como
  canal de distribuição. Nota 1.145: a setting gerenciada `enabledPlugins`
  impede a desinstalação de plugins exigidos pela organização — reforça o
  marketplace como canal de distribuição impositiva.

## Fila operacional (ordem de execução acordada em 2026-11-05)

1. **Limpeza pós-release** do PLAN/TODO (arquivar fases concluídas).
2. **Fix do `dependabot.yml`** (remover `reviewers: []`, resolver labels).
3. **Fase N — UX de output** das ferramentas (sumário estruturado,
   formatação compartilhada, `--quiet`).
4. **Novo projeto de teste** de adoção (pequeno e saudável; idealmente já
   via M.2).

## Lembretes datados

- [ ] **2026-11-11 — Security release do Node.js** (26.x/24.x/22.x,
  severidade máxima HIGH):
  [anúncio oficial](https://nodejs.org/en/blog/vulnerability/november-2026-security-releases).
  Quando o dist index publicar a versão nova da linha 24.x: rodar
  `npm run defence:update-engines` (report), aplicar com
  `defence:update-engines:update`, abrir PR. O CI já valida as duas linhas
  (engines floor + LTS latest).

---

## P3 / Future (retidos da reorganização anterior)

- [ ] Expand E2E test fixtures (`tools/e2e/fixtures/`).
- [ ] Automate changelog generation from conventional commits or tags.
- [ ] Add optional sandbox mode for npm commands.
- [ ] Evaluate VS Code 1.145 local automations (cron + workspace custom
  agents) for recurring defence tasks — e.g., an unattended weekly
  `defence:update` scan or docs link check via the `security`/`docs` agents.
- [ ] Evaluate mixed harnesses in nested sessions (VS Code 1.145 Preview,
  `chat.agentHost.multipleChatProviders.enabled`) as a second-opinion step
  for the `code-review-pass` skill.
- [ ] Deduplicate CI runs on dev→main PRs — pushing to `dev` fires both the
  `push` run and the `pull_request` run, so release PRs show 24 checks (two
  identical sets of 12, both green on v1.0.0). Options: gate the
  `pull_request` trigger when the head branch is `dev`, or accept the noise
  as extra evidence.
- [ ] Add deep performance profiling dashboard.
- [ ] Plan and execute release v1.0.0 only after the project is fully concluded.
- [ ] Run the ninth project status analysis as a pre-release step and decide
  whether further improvements are needed before releasing.

---

## 1. Security Defenses

### 1.1 Attack Surface Reduction

- [x] **[P1]** Add typosquatting and dependency-confusion detection — new or extended tool flags packages whose names are within a configurable Levenshtein distance of existing dependencies, or private/internal names that unexpectedly exist on the public registry; documented in `docs/en/security/` and `docs/pt-BR/security/`.
  - Impact: blocks a common supply-chain attack vector at install time.
  - Depends on: central configuration system (Section 3.1).
  - Files: [tools/add-package.js](tools/add-package.js), [tools/lib/package-utils.js](tools/lib/package-utils.js), [docs/en/security/what-is-supply-chain-attack.md](docs/en/security/what-is-supply-chain-attack.md)

- [x] **[P1]** Verify npm package provenance / SLSA attestations — `add-package.js` checks whether a package version was published with `--provenance` and validates the attestation bundle when available.
  - Impact: closes the gap between signature verification and build-pipeline compromise.
  - Depends on: central configuration system (Section 3.1).
  - Files: [tools/add-package.js](tools/add-package.js), [tools/check-package-age.js](tools/check-package-age.js)

### 1.2 Installation Safety

- [x] **[P0]** Close TOCTOU window between age check and install — after `npm install` in `add-package.js`, re-fetch the package's publish metadata and confirm the installed tarball matches the version that passed the age check; pin tarball integrity before install when possible.
  - Impact: prevents time-of-check/time-of-use substitution during install.
  - Depends on: registry-response cache and retry logic (Section 2.1).
  - Files: [tools/add-package.js](tools/add-package.js)

- [x] **[P1]** Add lockfile integrity self-check — new script verifies every entry in `package-lock.json` has an `integrity` field using SHA-512 or stronger, and exits non-zero on missing or weak hashes.
  - Impact: detects tampering or incomplete lockfile entries before install.
  - Depends on: none.
  - Files: [tools/check-lockfile-integrity.js](tools/check-lockfile-integrity.js)

- [x] **[P1]** Validate install-defences file integrity — `install-defences.js` now writes `.defence-manifest.json` with SHA-256 checksums of copied files; `verify-defences.js` checks the target project against the manifest.
  - Impact: prevents propagation of tampered tooling during adoption.
  - Depends on: none.
  - Files: [tools/install-defences.js](tools/install-defences.js), [tools/verify-defences.js](tools/verify-defences.js), [tools/verify-defences.test.js](tools/verify-defences.test.js)

### 1.3 Hook and Tooling Integrity

- [x] **[P1]** Enforce git-hook integrity check — add pre-commit or setup-time verification that `.husky/pre-commit` matches a known hash, failing if the hook was modified outside the normal workflow.
  - Impact: protects against hook tampering.
  - Depends on: install-defences integrity check (Section 1.2).
  - Files: [tools/setup-bootstrap.js](tools/setup-bootstrap.js), [tools/check-sync.js](tools/check-sync.js)

### 1.4 Risk Intelligence

- [x] **[P2]** Add package metadata risk scoring — `check-updates.js` now fetches deprecation status, maintainer count, and weekly downloads and incorporates them into the confidence score alongside the existing age, severity, and cadence signals.
  - Impact: improves update decisions with richer risk signals.
  - Depends on: registry-response cache and retry logic (Section 2.1).
  - Files: [tools/check-updates.js](tools/check-updates.js), [tools/check-updates.test.js](tools/check-updates.test.js), [tools/lib/config.js](tools/lib/config.js), [docs/en/security/defense-layer-8-update-check.md](docs/en/security/defense-layer-8-update-check.md), [docs/pt-BR/security/defense-layer-8-update-check.md](docs/pt-BR/security/defense-layer-8-update-check.md)

---

## 8. Benchmarks and Risk Scoring

> This section was previously labeled "pós-v1.0.0". It is now part of the v1.0.0 scope because the release will only happen when every TODO item is complete.

### 8.1 Performance Benchmarks

- [x] **[P2]** Add performance benchmarks and regression tests — create `tools/perf/` suite measuring execution time and network call counts for `check-package-age.js` and `check-updates.js`; fail CI on significant regression.
  - Impact: prevents performance degradation as features are added.
  - Depends on: registry-response cache and retry logic (Section 2.1), CI/CD pipeline (Section 5.1).
  - Files: [tools/perf/benchmark.js](tools/perf/benchmark.js), [tools/perf/benchmark.test.js](tools/perf/benchmark.test.js), [tools/perf/baselines.json](tools/perf/baselines.json), [package.json](package.json)

### 8.2 Adoption Manifest Synchronization

- [x] **[P0]** Prevent `.defence-manifest.json` drift in CI — add `defence:verify-defences:fix` script that regenerates the manifest from the current source tree, and invoke it from `.husky/pre-commit` whenever tracked defence files change. This stops the recurring "Verify adoption manifest" failure after legitimate edits to copied tools.
  - Impact: eliminates false-positive manifest mismatches in CI and keeps the adoption manifest authoritative.
  - Depends on: install-defences file list (Section 1.2).
  - Files: [tools/install-defences.js](tools/install-defences.js), [package.json](package.json), [.husky/pre-commit](.husky/pre-commit), [.defence-manifest.json](.defence-manifest.json), [docs/en/tools.md](docs/en/tools.md), [docs/pt-BR/tools.md](docs/pt-BR/tools.md)

### 8.3 Risk Scoring

- [x] **[P2]** Add package metadata risk scoring — `check-updates.js` now fetches deprecation status, maintainer count, and weekly downloads and incorporates them into the confidence score alongside the existing age, severity, and cadence signals.
  - Impact: improves update decisions with richer risk signals.
  - Depends on: registry-response cache and retry logic (Section 2.1).
  - Files: [tools/check-updates.js](tools/check-updates.js), [tools/check-updates.test.js](tools/check-updates.test.js), [tools/lib/config.js](tools/lib/config.js), [docs/en/security/defense-layer-8-update-check.md](docs/en/security/defense-layer-8-update-check.md), [docs/pt-BR/security/defense-layer-8-update-check.md](docs/pt-BR/security/defense-layer-8-update-check.md)

---

## 9. Experimental Hardening

> This section was previously labeled "pós-v1.0.0". It is now part of the v1.0.0 scope because the release will only happen when every TODO item is complete.

### 9.1 Optional Sandbox Mode

- [ ] **[P3]** Add optional sandbox mode for npm commands — provide an experimental wrapper that runs `npm install`/`npm update` inside a restricted environment (e.g., Linux namespaces or `bubblewrap`) to limit blast radius of malicious lifecycle scripts.
  - Impact: defense-in-depth for environments that accept the operational overhead.
  - Depends on: none.
  - Files: new `tools/sandboxed-install.sh`

### 9.2 Deep Performance Profiling

- [ ] **[P3]** Add deep performance profiling dashboard — add `--profile` flags to all tools and a CI trend dashboard for memory and CPU usage under large dependency trees.
  - Impact: enables data-driven performance work.
  - Depends on: performance benchmarks (Section 8.1) and registry optimizations (Section 2.1).
  - Files: `tools/perf/`

---

## 2. Performance & Scalability

### 2.1 Network Resilience

- [x] **[P1]** Implement persistent registry-response cache — reuse the caching logic from `tools/e2e/helpers/registry-cache.js` in production code, with configurable TTL, so `check-package-age.js`, `check-updates.js`, and `add-package.js` avoid redundant network calls.
  - Impact: reduces registry load and speeds up repeated runs.
  - Depends on: none.
  - Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js), new `tools/lib/registry-cache.js`

- [x] **[P1]** Optimize registry payload size — add `Accept-Encoding: gzip` to all registry requests, evaluate abbreviated packument endpoints where the `time` field is not required, and replace string concatenation with `Buffer` accumulation for response bodies.
  - Impact: reduces bandwidth and memory usage during registry calls.
  - Depends on: registry-response cache (Section 2.1).
  - Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js)

- [x] **[P1]** Add retry with exponential backoff and rate-limit handling — handle `429`, `503`, and transient network errors with bounded backoff, respecting `Retry-After` headers.
  - Impact: makes registry-dependent tools reliable in CI and throttled environments.
  - Depends on: registry-response cache (Section 2.1).
  - Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js)

### 2.2 Batch Processing and Caching

- [x] **[P2]** Reduce N+1 registry queries in update check — added per-run in-memory packument cache to `check-updates.js` so duplicate lookups within the same scan only fetch once. Bounded concurrency limit was already enforced; added registry cache hit/miss metrics to the state output.
  - Impact: reduces total network calls and avoids hammering the registry.
  - Depends on: registry-response cache (Section 2.1).
  - Files: [tools/check-updates.js](tools/check-updates.js), [tools/check-updates.test.js](tools/check-updates.test.js), [docs/en/tools.md](docs/en/tools.md), [docs/pt-BR/tools.md](docs/pt-BR/tools.md)

- [x] **[P2]** Optimize check-md-links with incremental cache — added SHA-256 content-hash cache stored in `.md-links-cache.json` so repeated runs only re-check changed files. Added `--force` flag to bypass cache.
  - Impact: speeds up documentation validation in CI and pre-commit.
  - Depends on: none.
  - Files: [tools/check-md-links.js](tools/check-md-links.js), [tools/check-md-links.test.js](tools/check-md-links.test.js), [tools/lib/config.js](tools/lib/config.js), [package.json](package.json)

---

## 3. Code Quality & Configuration

### 3.1 Centralized Configuration

- [x] **[P1]** Create a centralized configuration loader — add `tools/lib/config.js` that reads defaults from `package.json` (`engines`, `pkgAgeCheck`, `updateCheck`, `licensesCheck`, `defences`) and optional `.defence.config.json` overrides; exposes values instead of hardcoded constants.
  - Impact: makes the project adoptable in other repos and testable without editing code.
  - Depends on: none.
  - Files: new `tools/lib/config.js`

- [x] **[P1]** Remove hardcoded Node.js and npm versions from tests and tools — read required versions from `package.json` `engines`; update `check-engines.js` and all tests that assert version strings.
  - Impact: eliminates a common source of stale tests and version drift.
  - Depends on: centralized configuration loader (Section 3.1).
  - Files: [tools/check-engines.js](tools/check-engines.js), [tools/check-engines.test.js](tools/check-engines.test.js)

- [x] **[P1]** Extract magic numbers from defense scripts — replace hardcoded thresholds (age limits, history sizes, confidence bands, timeouts) in `check-package-age.js`, `check-updates.js`, and `check-licenses.js` with values from the centralized config.
  - Impact: improves maintainability and allows per-project tuning.
  - Depends on: centralized configuration loader (Section 3.1).
  - Files: [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js), [tools/check-licenses.js](tools/check-licenses.js), [tools/lib/config.js](tools/lib/config.js)

### 3.2 Test Quality and Coverage

- [x] **[P1]** Raise test coverage target to ~95% — add missing unit and CLI subprocess tests until `npm run test:coverage` reports ≥ 95% statement coverage across `tools/`.
- [x] **[P1]** Remove external coverage dependency (`c8`) and switch `test:coverage` to Node.js native `--experimental-test-coverage`. `c8@12.0.0` introduced a transitive tree (`glob`, `lru-cache`, `minimatch`, `minipass`, `path-scurry`) licensed under `BlueOak-1.0.0`, which violates the project's license policy. Native coverage keeps the same reporting capability without the external dependency surface.
- [x] **[P1]** Integrate license check into the dependency-addition pipeline — `defence:add` and the pre-commit hook now run `defence:license-check:fail` after the transitive package-age check so incompatible licenses are caught before commit.
  - Impact: increases confidence in refactors and releases.
  - Depends on: none.
  - Files: `tools/*.test.js`

> **Coverage report format decision:** The project uses Node.js native `--experimental-test-coverage`. This keeps the dependency tree clean and satisfies the ≥ 95% line-coverage target. Services like Codecov/Coveralls require `lcov.info` or JSON reports, which native coverage does not produce. The chosen approach is to stay with native coverage only (Option A). A lightweight custom converter (Option B) may be implemented in the future if Codecov/Coveralls integration becomes a concrete requirement.

- [x] **[P2]** Add error-path tests — cover corrupted `package-lock.json`, registry timeouts, invalid SLSA attestations, missing `integrity` fields, and malformed config files.
  - Impact: prevents silent failures in production.
  - Depends on: centralized configuration loader (Section 3.1).
  - Files: `tools/*.test.js`

- [x] **[P2]** Add integration tests between tools — `tools/integration.test.js` verifies that `add-package.js` → `check-package-age.js` → `check-updates.js` produce consistent metadata and that the transitive age gate composes correctly. Uses mocked registry/cache and DI hooks; every test has a timeout to prevent infinite hangs.
  - Impact: catches interface mismatches between scripts.
  - Depends on: registry-response cache (Section 2.1).
  - Files: [tools/integration.test.js](tools/integration.test.js), [tools/check-package-age.js](tools/check-package-age.js)

- [ ] **[P3]** Expand test fixtures — add fixtures for deprecated packages, yanked versions, very old packages, and packages with missing integrity.
  - Impact: enables deterministic security testing.
  - Depends on: none.
  - Files: `tools/e2e/fixtures/`

### 3.3 Hardcoded Values Cleanup

> **Rule:** intentional hardcoded values in code must always be accompanied by an inline comment explaining why that specific value remains hardcoded and is not configurable.

- [x] **[P1]** Audit and remove hardcoded Node.js/npm versions from tests — `tools/check-engines.test.js` and `tools/lib/config.test.js` now read `engines.node`/`engines.npm` from `package.json`. Remaining hardcoded boundary fixtures (e.g. `>=99.0.0`, `24.x`) have inline comments explaining they exercise parser edge cases, not project config.
  - Impact: prevents version drift between `package.json` and tests.
  - Files: [tools/check-engines.test.js](tools/check-engines.test.js), [tools/lib/config.test.js](tools/lib/config.test.js)

- [x] **[P1]** Audit and centralize remaining magic numbers — added `typosquattingCheck` block to `package.json` and `tools/lib/config.js`; `tools/add-package.js` now reads these values from config instead of hardcoding them. Remaining inline literals (e.g. `1024 * 1024`, `MS_PER_DAY`, secret-token regex lengths) have comments justifying why they stay hardcoded.
  - Impact: improves maintainability and allows other projects to adopt the toolkit without editing source code.
  - Files: [package.json](package.json), [tools/lib/config.js](tools/lib/config.js), [tools/add-package.js](tools/add-package.js), [tools/check-package-age.js](tools/check-package-age.js), [tools/check-updates.js](tools/check-updates.js), [tools/lib/provenance.js](tools/lib/provenance.js), [tools/lib/registry-cache.js](tools/lib/registry-cache.js), [tools/lib/retry-fetch.js](tools/lib/retry-fetch.js), [tools/check-secrets.js](tools/check-secrets.js)

- [x] **[P0]** Document intentional hardcodes — added a short "Hardcoded values" section to `CONTRIBUTING.md` and `docs/en/testing.md` / `docs/pt-BR/testing.md` describing the rule, and referenced it in the AI instructions.
  - Impact: makes the policy discoverable for contributors and AI assistants.
  - Depends on: Fase 6 documentation review.
  - Files: `CONTRIBUTING.md`, `docs/en/testing.md`, `docs/pt-BR/testing.md`

---

## 4. AI Customization & Developer Experience

> The AI-specific customization files must live under `.github/` to be automatically discovered by VS Code Copilot / Kimi Code. Human-readable documentation about AI collaboration lives in `docs/en/ai-guidelines.md` and `docs/pt-BR/ai-guidelines.md`, not in a separate `docs/ai/` directory.

### 4.1 Always-On Instructions (AI Core)

- [x] **[P0]** Create `.github/copilot-instructions.md` — project-wide instructions that load on every chat request, covering security-first coding, required validation commands (`npm test`, `npm run lint`, `npm run defence:check-md-links`), prevention of infinite loops, hardcode justification, and the rule of reading `package.json` `engines` before proposing version changes.
  - Impact: aligns every AI interaction with project standards.
  - Depends on: none.
  - Files: new `.github/copilot-instructions.md`

### 4.2 File- and Task-Specific Instructions (AI Core)

- [x] **[P0]** Create `.github/instructions/security.instructions.md` — loaded for `tools/**`, `.npmrc`, and `package.json`; covers defense-layer principles, `npm ci`, signature verification, license checks, and secrets handling.
  - Impact: contextual security guidance for code that touches dependencies.
  - Depends on: `.github/copilot-instructions.md` (Section 4.1).
  - Files: new `.github/instructions/security.instructions.md`

- [x] **[P0]** Create `.github/instructions/testing.instructions.md` — loaded for `tools/**/*.test.js`; covers native test runner conventions, DI mocking, subprocess tests, coverage expectations, timeouts, and fixture patterns.
  - Impact: keeps AI-generated tests consistent with project style.
  - Depends on: `.github/copilot-instructions.md` (Section 4.1).
  - Files: new `.github/instructions/testing.instructions.md`

- [x] **[P0]** Create `.github/instructions/docs.instructions.md` — loaded for `docs/**/*.md` and `README.md`; covers bilingual sync, link validation, and threat-model terminology.
  - Impact: keeps documentation accurate and consistent across languages.
  - Depends on: `.github/copilot-instructions.md` (Section 4.1).
  - Files: new `.github/instructions/docs.instructions.md`

### 4.3 Human-Readable AI Guidelines

- [x] **[P0]** Create `docs/en/ai-guidelines.md` and `docs/pt-BR/ai-guidelines.md` — explain how this project uses GitHub Copilot / Kimi Code, which `.github/` files exist and how they work, security rules for AI interactions, and the feedback loop for improving instructions.
  - Impact: makes the AI collaboration strategy discoverable for human contributors and auditors.
  - Depends on: `.github/copilot-instructions.md` (Section 4.1).
  - Files: `docs/en/ai-guidelines.md`, `docs/pt-BR/ai-guidelines.md`

### 4.4 Custom Agents ✅

- [x] **[P2]** Create custom agents in `.github/agents/` — `security.agent.md`, `quality.agent.md`, `performance.agent.md`, `docs.agent.md`, and `compliance.agent.md`, each with restricted tools, keyword-rich `description`, and clear boundaries.
  - Impact: enables delegation of specialized review tasks to focused subagents.
  - Depends on: file-specific instructions (Section 4.2).
  - Files: `.github/agents/*.agent.md`

### 4.5 Skills ✅

- [x] **[P2]** Create skills in `.github/skills/` — `security-audit/SKILL.md`, `dependency-review/SKILL.md`, `docs-update/SKILL.md`, `release-checklist/SKILL.md`, and `self-review/SKILL.md`, each with step-by-step procedures and correct frontmatter.
  - Impact: packages repeatable workflows with bundled assets.
  - Depends on: custom agents (Section 4.4).
  - Files: `.github/skills/*/SKILL.md`

- [x] **[P2]** Create one-shot task skills in `.github/skills/` — `generate-test`, `review-security`, `update-docs`, `check-hardcoded-values`, and `review-ai-output`, each focused on a single task and invoked explicitly via the `/` menu (`disable-model-invocation: true`).
  - Impact: gives developers reusable, one-shot task templates.
  - Depends on: file-specific instructions (Section 4.2).
  - Files: `.github/skills/*/SKILL.md`
  - Note: originally created as `.github/prompts/*.prompt.md`; converted to skills after VS Code 1.140 removed prompt file support.

### 4.6 Hooks ✅

- [x] **[P2]** Create lifecycle hooks in `.github/hooks/` — `enforce-security.json` (blocks dangerous commands), `auto-lint-test.json` (runs lint and tests after edits), and `inject-context.json` (loads `engines` and TODO state at session start).
  - Impact: turns guidelines into deterministic runtime enforcement.
  - Depends on: always-on instructions (Section 4.1).
  - Files: `.github/hooks/*.json`

### 4.7 Self-Improvement Loop ✅

- [x] **[P2]** Create a lightweight self-improvement mechanism for AI instructions:
  - `.github/skills/self-review/SKILL.md` to review previous AI outputs against project rules (absorbed the former `review-ai-output` prompt).
  - `.github/ai-lessons-learned.md` to log recurring AI mistakes and corrections.
  - Periodic review of `.github/copilot-instructions.md` and `.github/instructions/*.md` based on accumulated lessons.
  - Impact: prevents repeated mistakes and lets the project evolve its AI guidance over time.
  - Depends on: file-specific instructions (Section 4.2).
  - Files: `.github/skills/self-review/SKILL.md`, `.github/ai-lessons-learned.md`

---

## 5. CI/CD & Automation

### 5.1 Pipeline

- [x] **[P0]** Validate and finalize CI/CD pipeline via GitHub Actions — `.github/workflows/ci.yml` now includes npm cache, a dedicated `coverage` job, SBOM generation, adoption-manifest verification, and all existing gates. E2E remains opt-in via `tools/e2e/`.
  - Impact: guarantees local security gates cannot be bypassed.
  - Depends on: Fase 6 documentation and AI Core readiness.
  - Files: `.github/workflows/ci.yml`, [CONTRIBUTING.md](CONTRIBUTING.md)

- [x] **[P1]** Integrate secrets scanning into pre-commit — added a custom native secret scanner that runs in `.husky/pre-commit` and exits non-zero on likely secrets.
  - Impact: prevents accidental secret commits.
  - Depends on: CI/CD pipeline (Section 5.1) for validation.
  - Files: [tools/check-secrets.js](tools/check-secrets.js), [.husky/pre-commit](.husky/pre-commit)

- [x] **[P1]** Add SBOM generation script — new tool reads `package-lock.json` and emits CycloneDX 1.4 JSON SBOM for auditability.
  - Impact: supports compliance and incident response.
  - Depends on: none.
  - Files: [tools/generate-sbom.js](tools/generate-sbom.js), [tools/generate-sbom.test.js](tools/generate-sbom.test.js)

---

## 6. Documentation & Knowledge

### 6.1 Project Overview and Reference

- [x] **[P0]** Create project overview — added `docs/en/project-overview.md` and `docs/pt-BR/project-overview.md` explaining the project's purpose, target audience, what a supply-chain attack is, and how to use this repository for learning and adoption.
  - Impact: gives newcomers a clear entry point.
  - Depends on: none.
  - Files: `docs/en/project-overview.md`, `docs/pt-BR/project-overview.md`

- [x] **[P0]** Create project glossary — added `docs/en/glossary.md` and `docs/pt-BR/glossary.md` defining supply-chain terms (TOCTOU, SLSA, provenance, typosquatting, dependency confusion, lockfile integrity, SBOM, deterministic install, lifecycle scripts, Levenshtein distance).
  - Impact: improves accessibility for learners and contributors.
  - Depends on: none.
  - Files: `docs/en/glossary.md`, `docs/pt-BR/glossary.md`

### 6.2 Security Documentation Reorganization

- [x] **[P0]** Reorganize defense layers into groups — presented the 12 layers as Core, Recommended, and Advanced in `docs/en/security/index.md`, `docs/pt-BR/security/index.md`, `README.md`, `SECURITY.md`, and the adoption guide.
  - Impact: helps teams adopt defenses gradually.
  - Depends on: none.
  - Files: `docs/en/security/index.md`, `docs/pt-BR/security/index.md`, `README.md`, `docs/en/adopting-in-other-projects.md`, `docs/pt-BR/adopting-in-other-projects.md`

### 6.3 Testing Documentation

- [x] **[P0]** Expand testing documentation — updated `docs/en/testing.md` and `docs/pt-BR/testing.md` to cover the native test runner, DI mocking, subprocess tests, integration tests, native coverage, the 95% target, and the intentional-hardcodes rule.
  - Impact: keeps AI and human contributors aligned with project conventions.
  - Depends on: none.
  - Files: `docs/en/testing.md`, `docs/pt-BR/testing.md`

### 6.4 AI Guidelines

- [x] **[P0]** Create AI guidelines — added `docs/en/ai-guidelines.md` and `docs/pt-BR/ai-guidelines.md` describing how the project uses GitHub Copilot / Kimi Code, the role of `.github/copilot-instructions.md` and `.github/instructions/*.md`, security rules for AI interactions, and the feedback loop for improving instructions. No separate `docs/ai/` directory was created.
  - Impact: makes the AI collaboration strategy discoverable for humans and auditors.
  - Depends on: `.github/copilot-instructions.md`.
  - Files: `docs/en/ai-guidelines.md`, `docs/pt-BR/ai-guidelines.md`

### 6.5 Pre-Release Review

- [x] **[P0]** Complete comprehensive documentation review before official release — verified and synchronized:
  1. `docs/en/` and `docs/pt-BR/` are structurally aligned.
  2. `docs/en/tools.md`, `docs/en/architecture.md`, and equivalents list every current script and tool.
  3. `README.md` reflects all scripts, badges, setup instructions, and defense layer groups.
  4. All internal links pass `npm run defence:check-md-links`.
  5. `SECURITY.md`, `CONTRIBUTING.md`, and `CHANGELOG.md` are accurate and complete.
  - Impact: documentation must be release-ready before `v1.0.0` is tagged.
  - Depends on: all other P0 items completed or stabilized.
  - Files: `docs/en/`, `docs/pt-BR/`, `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`

### 6.6 Additional Reference Content (P1)

- [x] **[P1]** Document rebuild procedure for lifecycle-script packages — added `docs/en/security/rebuilding-lifecycle-packages.md` and `docs/pt-BR/security/rebuilding-lifecycle-packages.md` explaining how to safely rebuild `esbuild`, `sharp`, `canvas`, etc., after overriding `ignore-scripts`.
  - Impact: closes a documented exception path in the defense-in-depth story.
  - Depends on: none.
  - Files: `docs/en/security/rebuilding-lifecycle-packages.md`, `docs/pt-BR/security/rebuilding-lifecycle-packages.md`

- [x] **[P1]** Create troubleshooting guide — added `docs/en/troubleshooting.md` and `docs/pt-BR/troubleshooting.md` with common failures, remediation steps, and how to run each defense manually.
  - Impact: reduces support burden and onboarding friction.
  - Depends on: centralized configuration loader (Section 3.1).
  - Files: `docs/en/troubleshooting.md`, `docs/pt-BR/troubleshooting.md`

---

## 10. Release & Maintenance

### 10.1 Release Readiness

- [x] **[P0]** Define versioning and release checklist — established semantic versioning, created `docs/en/release-checklist.md` and `docs/pt-BR/release-checklist.md`, and documented the supported Node.js/npm version matrix.
  - Impact: makes releases repeatable and predictable.
  - Depends on: CI/CD pipeline (Section 5.1).
  - Files: new `docs/RELEASE_CHECKLIST.md`

- [ ] **[P3]** Add changelog generation automation — script or CI step that updates `CHANGELOG.md` from conventional commits or release tags.
  - Impact: reduces manual release overhead.
  - Depends on: versioning and release checklist (Section 10.1).
  - Files: [CHANGELOG.md](CHANGELOG.md)

### 10.2 Release v1.0.0 Gates (future action)

The release v1.0.0 will be planned and executed only after the project is fully
concluded. When that time comes, the following gates must be satisfied:

- [ ] All open TODO items are marked complete.
- [ ] `npm test` passes (current count).
- [ ] `npm run test:coverage` reports ≥ 95% line coverage.
- [ ] `npm run lint` passes.
- [ ] `npm run defence:check-md-links` passes.
- [ ] `bash .husky/pre-commit` passes.
- [ ] `docs/en/` and `docs/pt-BR/` are structurally aligned and synchronized.
- [ ] `PROJECT_STATUS_REPORT.md` is regenerated and shows the maximum score in every category.
- [ ] `CHANGELOG.md` has a `[1.0.0]` entry.
- [ ] Version is bumped in `package.json` and `package-lock.json`.
- [ ] Git tag `v1.0.0` is created and pushed.
- [ ] GitHub Release is published with release notes and SBOM asset.

## Completed

### v1.0.0 Progress

- [x] **End-to-end tests against the real npm registry** — added `tools/e2e/` with an opt-in E2E suite validating `check-package-age.js` and `add-package.js` against stable npm packages. Includes local registry-response cache and strict timeouts.
- [x] **Automated README badge update** — added `tools/update-badge.js` and pre-commit integration to keep the test-count badge synchronized.
- [x] **Historical scan tracking** — added rolling `history` array to `.defence-update-check.json` for quarantine and cadence detection.
- [x] **Confidence score for updates** — added `confidence` and `confidenceLabel` to `check-updates.js` output.
- [x] **Interactive update approval** — added `--interactive` mode to `update-packages.js` with readline prompts and decision persistence.
- [x] **Offline mode for update check** — added `--offline` flag to `check-updates.js` for network-free operation.
- [x] **GitHub issue and PR templates** — added `.github/ISSUE_TEMPLATE/` and `.github/pull_request_template.md`.
- [x] **Dependency license checker** — added `defence:license-check` scripts with SPDX expression handling and multiple output formatters.
- [x] **Dependency sync check script** — added `defence:sync-check` and `post-merge` hook to warn when `node_modules` is out of sync.
- [x] **Update check output formatters** — added `--format=json` and `--format=markdown` to `defence:update-check`.
- [x] **Explanatory `EventEmitter` comment** — documented mock usage in `tools/check-package-age.test.js`.
- [x] **Environment version check docs** — documented `engines` enforcement in setup and quick-reference pages.
- [x] **Reference documentation** — added guidance on secret management, artifact signing, SBOM standards, and secret scanning while keeping `references.md` as a single file.
- [x] **install-defences documentation fix** — corrected internal file list in `tools/install-defences.js`.
- [x] **AI Core customization** — created `.github/copilot-instructions.md`, `.github/instructions/*.md`, agents, skills, prompts, hooks, and `.github/ai-lessons-learned.md`.
- [x] **Release checklist** — created bilingual `docs/en/release-checklist.md` and `docs/pt-BR/release-checklist.md`.
