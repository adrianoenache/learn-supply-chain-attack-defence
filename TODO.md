# TODO

Open work for the current cycle (v1.2.0). The full history of completed
phases, releases, and decisions lives in `CHANGELOG.md`, `DECISIONS.md`, and
`.github/PLAN.md` § Histórico. **This file lists only what is open.**

Priorities: `P0` (critical/blocking) → `P1` (important) → `P2` (improvement)
→ `P3` (experimental / post-release).

**Spec de 3 campos (P0/P1):** itens P0/P1 carregam no corpo a spec mínima
antes da execução — **Faz:** o que a mudança faz · **Prova:** como sabemos
que funciona · **Não quebra:** o que deve permanecer intacto.

> **Regra de higiene (2026-11-12):** uma seção datada ("Próximos passos de
> <data>", "Fila de <data>") morre quando seu último item fecha — ela nunca
> se acumula. Itens concluídos saem do arquivo; o registro fica no
> CHANGELOG/PLAN § Histórico.

---

## Roadmap — Fase M (alvo v1.2.0)

Aguardando o projeto de teste **Astro 7.4** (em preparação pelo mantenedor).

- [ ] **M.2** `tools/create-defended-project.js`: scaffolding de projeto
  zerado com defesas completas, com opção de infra de AI incluída.
- [ ] **M.3** Scaffolding exclusivo da infra de AI (`.github/`) para projetos
  zerados ou em andamento; avaliar o marketplace do VS Code como canal de
  distribuição (sinal 1.145: `enabledPlugins` gerenciado impede
  desinstalação).

## Backlog P3

- [ ] **Changelog assistido** — gerador de *draft* a partir de conventional
  commits (`defence:changelog --draft`), nunca sobrescrita automática. O
  CHANGELOG é curado por fase; a automação só prepara o rascunho. (adiado
  2026-11-12 — esforço/valor desproporcional sozinho; revisit pós-v1.2.0)
- [ ] **Sandbox opcional para comandos npm** — wrapper experimental com
  isolamento de OS (namespaces/bubblewrap), Linux-only. **Não** Node
  `--permission` (ADR: Permission Model rejeitado como sandbox de install).
  Alto esforço/risco; candidato a fase própria. (adiado 2026-11-12)
- [ ] **Dashboard de profiling de performance** — flags `--profile` nas tools
  + tendência de CI (memória/CPU sob árvores grandes). Depende de storage de
  histórico entre runs. Valor marginal com a suíte em ~3s; candidato a fase
  própria. (adiado 2026-11-12)
- [ ] **Fixtures de teste adicionais (unitárias)** — os casos reais
  (deprecated/very-old) já estão no E2E; restam apenas os sintéticos de
  baixa prioridade (ex.: packuments com campos ausentes variados) se algum
  gate novo precisar.

---

## Concluído

Todo o histórico de itens concluídos (fases prévia→N, releases v1.0.0/v1.1.0/
v1.1.1, melhorias Cowork, P3s avaliados) está arquivado em
`.github/PLAN.md` § Histórico e detalhado em `CHANGELOG.md` e
`DECISIONS.md`. Nada operacional vive aqui.
