# Plano de Ação — ciclo v1.2.0 (pós-release)

> **Authoritative plan.** This file is the source of truth for the current
> project plan. AI assistants must read it at the start of every session or
> when the user asks to resume/review the plan. Do not rely on session memory.
>
> Last updated: 2026-11-12

## TL;DR

**Estado:** v1.1.1 publicada (2026-11-12). Três releases no ar (v1.0.0,
v1.1.0, v1.1.1), todas com SBOM e verificação pós-release. 12 camadas de
defesa, 1015 testes, 95,96% cobertura, 85 arquivos de defesa verificados,
zero P0/P1/P2 abertos.

**Próximo marco — Fase M (v1.2.0):** scaffolding de adoção
(M.2 completo, M.3 infra-AI + marketplace), dirigido pelo projeto de teste
**Astro 7.4** que o mantenedor está preparando. P3s restantes são
deferidos com justificativa (ver TODO.md).

**Pronto para divulgação:** o projeto está pronto desde a v1.0.0; o backlog
não é bloqueio (o que existe funciona, é verificado e se auto-corrige).
Decisão do mantenedor (2026-11-12): ampla divulgação **após a v1.2.0**.

## Fases do ciclo v1.2.0 (a detalhar quando iniciadas)

- **Fase M.2 — Scaffolding completo:** `tools/create-defended-project.js`
  cria projeto zerado com as 12 camadas (opção de incluir a infra de AI).
  Driver: o projeto de teste Astro 7.4.
- **Fase M.3 — Scaffolding de infra AI:** somente `.github/` para
  projetos existentes; avaliar o marketplace do VS Code como canal
  (sinal 1.145: `enabledPlugins` gerenciado impede desinstalação).

## Regras permanentes (valem para todo ciclo)

- **Pós-release: arquivar.** Ao fechar um release, fases concluídas viram
  uma entrada de registro no topo de `.github/plan-history.md` (padrão fixo:
  tipo · PRs · release · 2–4 linhas de "o quê e por quê"). Uma seção datada
  morre quando seu último item fecha — nunca se acumula (regra de higiene,
  ADR 2026-11-12).
- **Fonte da verdade:** este arquivo vence qualquer memória de sessão;
  divergências são resolvidas aqui antes de agir (skill `context-recovery`).
- **Gates por mudança:** `npm test`, `npm run lint`,
  `defence:check-md-links` (se markdown), pre-commit — sempre.
- **Commits granulares:** 1 commit = 1 intent; pares EN/PT juntos no mesmo
  commit; bookkeeping (PLAN/TODO/DECISIONS) separado de código.
- **Branch protection:** nada entra em `main`/`dev` sem PR verde (12 checks)
  — ver inventário exato das regras em
  `docs/{en,pt-BR}/repository-organization.md`.
- **Dependências:** somente via `defence:add` / `defence:update` — nunca
  instalação direta de pacotes fora dos gates.

## Histórico

O histórico completo de fases e releases concluídas foi movido para
[`plan-history.md`](./plan-history.md) (arquivo morto de consulta, mais
recente no topo). Detalhes operacionais em `CHANGELOG.md` e `DECISIONS.md`.
