# Histórico do Plano — learn-supply-chain-attack-defence

> **Arquivo morto de consulta.** Registro cronológico (mais recente no topo)
> das fases e releases concluídas. Não é lido em sessões normais — o plano
> vivo está em [`PLAN.md`](./PLAN.md). Detalhes operacionais completos em
> `CHANGELOG.md` e `DECISIONS.md` (ADRs).
>
> **Como adicionar uma entrada:** nova entrada **sempre no topo**, logo abaixo
> deste cabeçalho, seguindo o padrão fixo:
>
> ```
> ## <Fase ou versão> — <AAAA-MM-DD>
>
> **Tipo:** feature | patch | process | docs · **PR(s):** #N · **Release:** vX.Y.Z (se houver)
>
> <2–4 linhas: o que foi entregue e por quê — não o "como" operacional.>
> ```

---

## v1.1.1 — 2026-11-12

**Tipo:** patch · **PR:** #51 · **Release:** v1.1.1

Engine bump para Node 24.22.3 remediando o security release de 2026-11-11
(2 CVEs HIGH na linha 24.x: heap leak em HTTPS CVE-2026-123864, DoS HTTP/2
CVE-2026-123863). Primeira execução do fluxo Gitflow `release/*` em
worktree isolada. Incluiu também: adoção Gitflow documentada (PR #47),
análise do estudo Copilot Cowork + convenções derivadas (gates-prove,
spec de 3 campos, append-files), e a limpeza real do TODO/PLAN.

## Estudo de caso Microsoft Copilot Cowork — 2026-11-12

**Tipo:** process · **PR:** #50

Análise das 6 práticas do time Cowork contra a nossa infra de AI.
Convergências fortes (fronteira no host/hooks; aprendizados no repo).
Adotadas: convenção "gates provam que checaram" (P1), template de spec de
3 campos (P2), anti-conflito em append-files (P3). ADR 2026-11-12.

## v1.1.0 — 2026-11-05

**Tipo:** feature · **PRs:** #39, #40, #42 · **Release:** v1.1.0

Fase N completa (UX de output das 25 ferramentas), fix do dependabot, fix
P1 do update-engines (report tolerante a entradas malformadas do dist
index — habilitador do patch de 11/11). Lição: merge-back main→dev
obrigatório via branch intermediária.

## Fase N — UX de output — 2026-11-05

**Tipo:** feature · **PRs:** #33–#35 · **Release:** v1.1.0

Padronização da saída das 25 ferramentas: sumário estruturado, símbolos
✓/✗/⚠/○, colunas alinhadas, cores ANSI via TTY, `--quiet`. Fundação em
`tools/lib/formatters.js` (ADR 2026-11-05 emenda a de 2026-10-08).

## v1.0.0 — 2026-11-04

**Tipo:** feature (primeira release estável) · **PR:** #27 · **Release:** v1.0.0

Consolidação de todo o ciclo v1.0.0: 12 camadas de defesa, 12 ferramentas
(960 testes, 95,8% cobertura), docs bilíngues completas (197 arquivos), AI
infra (agents/skills/hooks com observabilidade). O checklist de release
capturou e corrigiu uma regressão real (portão de idade transitivo no-op).

---

## Ciclo v1.0.0 — fases fundacionais (2026-09 → 2026-11-04)

As fases abaixo construíram a base. Detalhes operacionais (checklists,
sub-itens) foram condensados; o conteúdo completo permanece no git history
e nas PRs #1–#29.

- **Fase prévia / AI-0 / Pre-E / E** — fundação: nomenclatura, primeira
  estrutura de customizações AI (agents, skills, hooks, instructions),
  documentação conceitual bilíngue.
- **Fase AI-1** — migração VS Code 1.140: prompts → skills.
- **Fase F / F.4** — verificação de execução de comandos; quarentena
  acionável de updates (intermediárias elegíveis).
- **Fase AI-2** — governança e ergonomia das customizações AI (índice de
  skills gerado, write guard, hooks sanity).
- **Fase G** — code review educacional (headers, mensagens de erro,
  hardcodes justificados); cobertura 94,7% → 95,9%.
- **Fase AI-3 (3.1–3.5)** — resiliência e observabilidade da AI:
  observabilidade JSONL unificada, hardening contra prompt-injection (APPA
  fase 2), DECISIONS.md + destilação de sessão.
- **Fase H** — organização: Biome, helpers compartilhados, CODEOWNERS,
  badge de testes.
- **Fase L** — gestão de engines: `update-engines.js`, guarda
  `check-npmrc`, política npm-bundled, ADRs (min-release-age, Permission
  Model rejeitado).
- **Fase AI-4** — processos de AI: commits granulares (hook consultivo),
  code review 4-eixos (`code-review-pass` + `check-dead-code`), adoção VS
  Code 1.144.
- **Fase I** — revisão total da documentação (architecture.md reescrito +
  camada de AI, glossário, revisão integral dos 69 pares EN/PT-BR).
- **Fase J** — avaliação do projeto: 10/10 medido, zero P0,
  `measure-ai-context.js`, PROJECT_STATUS_REPORT regenerado.
- **Fase K** — release v1.0.0 (checklist skill, gates, tag, GitHub Release
  com SBOM).
- **Fase M.1** — dogfooding do instalador num projeto real (8 gaps
  corrigidos na raiz; relatório bilíngue).
EOF
wc -l .github/plan-history.md