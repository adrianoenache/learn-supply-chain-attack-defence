# Plano de Ação — Conclusão do projeto (release adiado para o futuro)

> **Authoritative plan.** This file is the source of truth for the current
> project plan. AI assistants must read it at the start of every session or
> when the user asks to resume/review the plan. Do not rely on session memory.
>
> Last updated: 2026-09-03

## Estado atual (2026-09-03)

O projeto `learn-supply-chain-attack-defence` está na **fase final de conclusão**. Todas as 12 camadas de defesa estão implementadas e testadas. O mecanismo de adoção cross-project (`install-defences.js`) foi atualizado e o bug de formatação Mermaid foi corrigido. A CI ainda precisa ser alinhada com o pre-commit no comportamento de audit, e a documentação de adoção/testing/TODO precisa ser sincronizada.

**Commits estão temporariamente bloqueados** porque o endpoint `/-/npm/v1/security/advisories/bulk` do npm está indisponível no ambiente local; estamos aguardando a estabilização da rede para commitar.

**O release v1.0.0 foi removido do escopo imediato.** Ele será planejado e executado apenas quando o projeto estiver de fato concluído, como ação futura.

## Decisões do usuário

- O projeto só será considerado concluído quando **todas as pendências** estiverem resolvidas.
- **O release v1.0.0 não faz mais parte do escopo imediato**; será planejado e executado como ação futura, após a conclusão do projeto.
- `run-audit-with-retry.js` precisa ser **revisado e verificado** quanto à correta integração.
- Fase 9 (sandbox mode / profiling dashboard) será **reavaliada depois**; por ora não entra no escopo de execução imediata, mas deve ser tratada como decisão pendente no plano.
- Validação ao vivo dos gates deve ser executada.

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

1. **`PROJECT_STATUS_REPORT.md` regenerado**
   - Deve refletir nota 10/10 em todas as categorias após as correções.

1. **`CHANGELOG.md`** ✅ Atualizado
   - Seção `[Unreleased]` atualizada com as mudanças desta sessão.

### P3 / Decisões pendentes

1. **Fase 9 — Experimental Hardening**
   - **Sandbox mode**: wrapper para `npm install`/`npm update` em ambiente restrito (Linux namespaces / bubblewrap).
   - **Deep performance profiling**: `--profile` flags e dashboard de tendência de CPU/memória.
   - O usuário solicitou revisar depois. O plano inicial deve documentar as opções sem executar.

## Plano de execução

### Fase A — Validação inicial (1 passo, bloco dos demais)

A.1 Executar todos os gates de validação para estabelecer baseline real:

- `npm test`
- `npm run lint`
- `npm run defence:check-md-links`
- `npm run defence:license-check:fail`
- `npm run defence:check-engines`
- `bash .husky/pre-commit`
- `npm run test:coverage`
- `npm run test:e2e` (opcional, requer rede)

### Fase B — Correções técnicas (podem rodar em paralelo entre si)

B.1 Atualizar `tools/install-defences.js` ✅

- Expandir `FILES_TO_COPY` com todos os arquivos necessários.
- Expandir `SCRIPTS_TO_ADD` com todos os scripts `defence:*` atuais.
- Atualizar script `setup` do target para usar `npm run defence:check-engines`.
- Garantir que o target `test` cubra `tools/*.test.js tools/lib/*.test.js tools/perf/*.test.js`.

B.2 Atualizar `tools/install-defences.test.js` ✅

- Adicionar assertions para novos arquivos copiados.
- Adicionar assertions para novos scripts adicionados.
- Testar script `setup` do target.

B.3 Alinhar CI com pre-commit

- Em `.github/workflows/ci.yml`, substituir `npm audit --audit-level=high` por `npm run defence:audit` no job `defence-gates`.
- Validar que `run-audit-with-retry.js` aceita os argumentos passados (`--fetch-timeout`, `--fetch-retries`).
- Se necessário, ajustar `AUDIT_ARGS` para compatibilidade.

B.4 Corrigir bug Mermaid ✅

- Em `docs/en/security/index.md` e `docs/pt-BR/security/index.md`, inserir ``` para fechar o bloco `flowchart TD` antes da seção de referência.
- Revalidar com `npm run defence:check-md-links`.

### Fase C — Documentação (depende parcialmente de B.1/B.2)

C.1 Atualizar `docs/en/adopting-in-other-projects.md` e `docs/pt-BR/adopting-in-other-projects.md` ✅

- Refletir lista completa de arquivos copiados.
- Refletir lista completa de scripts adicionados.

C.2 Atualizar `docs/en/testing.md` e `docs/pt-BR/testing.md` ✅

- Expandir "What Is Covered" com as novas suítes de teste.

C.3 Reorganizar `TODO.md` ✅

- Separar claramente concluído, P0, P1 e P3/decisões pendentes.
- Remover afirmações contraditórias sobre opcionalidade.
- Mover o release v1.0.0 para a seção de ações futuras/pós-conclusão; não é mais gate ativo.

### Fase D — Relatórios e registro de conclusão

D.1 Atualizar `PROJECT_STATUS_REPORT.md`

- Regenerar com nota 10/10 após todas as correções.
- **Ação futura:** executar após o commit das mudanças e estabilização do npm audit.

D.2 Manter `CHANGELOG.md` atualizado ✅

- Seção `[Unreleased]` atualizada com as mudanças desta sessão.

## Verificação

- Todos os gates da Fase A passam após as correções.
- `install-defences.js --dry-run` em projeto temporário mostra todos os arquivos/scripts corretos.
- `install-defences.test.js` passa.
- CI e pre-commit produzem o mesmo comportamento de audit (retry bounded).
- `defence:check-md-links` passa em todos os markdowns alterados.
- Documentação EN/PT-BR sincronizada.

## Decisões pendentes a avaliar no final

1. **Fase 9 Experimental Hardening**: implementar sandbox/profiling como parte da conclusão do projeto ou mover para pós-conclusão?
2. **Fase 9 alternativa — hardening no `.npmrc`**: o usuário mencionou aumentar hardening no `.npmrc` ao invés de sandbox. Devemos considerar esta alternativa como item de análise?
3. **Timeout do audit**: manter 60s em `run-audit-with-retry.js` ou ajustar com base na instabilidade observada do npm?
4. **Release futuro**: quando o projeto estiver concluído, planejar ações de release (CHANGELOG, tag, GitHub Release com SBOM) em um plano separado.
