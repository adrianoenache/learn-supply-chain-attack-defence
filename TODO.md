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

## Fase Q — Code Quality sem ferramenta de terceiro (alvo v1.2.x)

Origem: revisão da proposta M365 Copilot (2026-11-22) + warnings do plugin
SonarQube for IDE. Decisão do mantenedor: capturar o **valor** (visibilidade
de qualidade) **sem o acoplamento** a um serviço externo — escrevemos nossos
próprios gates. Ver ADR em DECISIONS.md.

- [ ] **Q.1 (P1)** Gate de complexidade próprio `tools/check-complexity.js` —
  falha se um arquivo `tools/*.js` exceder o limite de linhas ou uma função
  exceder o limite sem comentário justificativo. Convenção "gates provam que
  checaram" (teste que o faz falhar). Zero dependências.
  - **Faz:** gate que mede tamanho de arquivo/função e falha acima do limite.
  - **Prova:** teste alimenta um arquivo/função acima do limite → exit 1;
    `npm test` e o próprio gate verdes no repo atual (limite calibrado).
  - **Não quebra:** nenhum gate existente; o novo gate entra como advisory
    até calibrar, depois CI.
- [ ] **Q.2 (P2)** Refatoração dirigida dos dois maiores módulos —
  `check-updates.js` (~970 linhas) e `add-package.js` (~939): extrair lógica
  para `tools/lib/` seguindo o padrão existente. Testes já cobrem.
- [ ] **Q.3 (P2)** Migrar `console.*` direto para `tools/lib/formatters.js`
  (Fase N) nos módulos que ainda imprimem direto (ex.: `update-packages.js`).
- [ ] **Q.4 (P3)** Adicionar eixo "complexidade/tamanho" à skill
  `code-review-pass`.

## Boas práticas Open Source (para a divulgação pós-v1.2.0)

Da proposta M365 + análise — os itens de valor real novo, não redundantes:

- [ ] **P1 — OpenSSF Scorecard** — workflow `.github/workflows/scorecard.yml`
  + badge público no README. Alto valor para a divulgação; barato. Meta
  inicial: score ≥ 7 visível.
- [ ] **P2 — AI Usage Declaration no PR template** — seção declarando uso de
  IA / revisão humana / testes adicionados (`.github/pull_request_template.md`).
  Alinhado ao tema do projeto (transparência sobre código gerado por IA).
- [ ] **P2 — Revisão VS Code 1.147** — seção curta nos ai-guidelines EN/PT:
  Send Later, Drafts, browser integration, model routers, assisted
  permissions customizáveis — todos UX do Agents window, zero impacto na
  camada de customização.
- [ ] **P3 — TokenEconomizer em references.md** — plugin de controle de
  custo black-box para coding agents (Microsoft). Complementa nossa seção
  "Eficiência de créditos". Referência EN/PT; não é dependência do repo.

## Backlog P3

- [ ] **Changelog assistido** — gerador de *draft* a partir de conventional
  commits (`defence:changelog --draft`), nunca sobrescrita automática. O
  CHANGELOG é curado por fase; a automação só prepara o rascunho. (adiado
  2026-11-12)
- [ ] **Sandbox opcional para comandos npm** — wrapper experimental com
  isolamento de OS (namespaces/bubblewrap), Linux-only. **Não** Node
  `--permission` (ADR). Alto esforço/risco; candidato a fase própria.
  (adiado 2026-11-12)
- [ ] **Dashboard de profiling de performance** — flags `--profile` nas tools
  + tendência de CI. Valor marginal com a suíte em ~3s; candidato a fase
  própria. (adiado 2026-11-12)
- [ ] **MCP / Agent security docs** — `docs/agent-security/` (boas práticas
  MCP, threat modeling, tool validation, human approval). Futuro, pós-v1.2.0.

---

## Rejeitados na revisão M365 (2026-11-22) — com justificativa

Propostos pela LLM, **não adotados** (ver ADR):

- **`.ai/` directory** — redundante e conflita: usamos `.github/` (padrão
  pós-VS Code 1.140). A LLM propôs o padrão antigo.
- **Renovate** — duplicaria o Dependabot; nosso fluxo `defence:add`/
  `defence:update` é mais rigoroso (age + signature + license + quarentena).
- **Gitleaks** — tripla redundância: já temos `check-secrets.js` + GitHub
  Secret Scanning.
- **SLSA Level 3 / Sigstore / Cosign** — over-engineering agora; só quando
  houver artefato público distribuído (binário/pacote npm publicado).
- **SonarQube Cloud como gate** — acoplamento a serviço externo; o valor
  (visibilidade de qualidade) é capturado pela Fase Q com gates próprios.

---

## Concluído

## Concluído

Todo o histórico de itens concluídos (fases prévia→N, releases v1.0.0/v1.1.0/
v1.1.1, melhorias Cowork, P3s avaliados) está arquivado em
`.github/PLAN.md` § Histórico e detalhado em `CHANGELOG.md` e
`DECISIONS.md`. Nada operacional vive aqui.
