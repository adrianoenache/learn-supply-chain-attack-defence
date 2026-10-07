# Melhorias de Code Review — Fase G

Data da auditoria: 2026-10-07. Revisor: revisão assistida por AI (convenções da
skill educational-code-review) sobre `tools/*.js` e `tools/lib/*.js` (34
arquivos de produção, excluindo `*.test.js`).

## Veredito

O código está em melhor estado do que o plano da fase presumia. **Nenhum item
P0.** Todos os arquivos de produção já possuem header de propósito, e as
mensagens de erro são predominantemente acionáveis (informam o que falhou, qual
recurso está envolvido e o próximo passo sancionado). Um P1 foi encontrado e
corrigido nesta rodada; dois itens P2 permanecem como débito documentado.

## Padrão de comentário de cabeçalho (formalizado)

O padrão de-facto, presente nos 34 arquivos de produção, agora é a regra
documentada:

1. `#!/usr/bin/env node` (somente ferramentas executáveis).
2. `'use strict'`.
3. Um bloco de cabeçalho `//` cobrindo: o que o arquivo faz, por que existe, o
   uso principal via CLI ou ponto de entrada, e ressalvas de segurança que um
   aprendiz deve conhecer.

Verificado nesta auditoria: `add-package.js`, `check-updates.js`,
`update-packages.js`, `lib/config.js`, `lib/trust-engine.js` e outros 29 seguem
o padrão.

## Achados

### P1 — corrigido nesta rodada

| Achado | Arquivo | Correção |
| --- | --- | --- |
| Pesos e thresholds do trust score (age 20, trustedMin 70 etc.) estavam hardcoded sem explicar a postura de segurança que codificam. | `tools/lib/trust-engine.js` | Adicionada justificativa inline: os pesos somam 100 por design (o score lê como porcentagem), idade é o sinal mais forte porque o tempo filtra campanhas de release sequestrada, e as faixas 70/40 impedem que um único sinal forte fraco alcance auto-confiança. |

### P2 — débito documentado (não bloqueante)

| Achado | Arquivo | Recomendação |
| --- | --- | --- |
| `add-package.js` mistura `console.error` + `process.exit(1)` com erros lançados em caminhos adjacentes; duas mensagens repetem os exemplos de uso. | `tools/add-package.js` | Na próxima alteração do arquivo, consolidar em um único estilo de saída e extrair o texto de uso para uma constante. |
| Vários arquivos de teste repetem fixtures numéricas (portas, tamanhos em bytes) sem comentário de justificativa por arquivo. | `tools/*.test.js` | Aceitável conforme as instruções de teste (fixtures determinísticas); adicionar comentários apenas quando o valor da fixture não for óbvio. |

## Nota de cobertura

A cobertura de linhas é 94,70% — logo abaixo da meta de ≥ 95%. O item de
cobertura está no `TODO.md` nesta fase (G) com a lista de hotspots produzida
por `npm run test:coverage`.

## Validação após esta rodada

- `npm test` — 844/844 passando.
- `npm run lint` / `format:check` — limpos.
- `npm run defence:check-md-links` — 178 arquivos, sem links quebrados.
