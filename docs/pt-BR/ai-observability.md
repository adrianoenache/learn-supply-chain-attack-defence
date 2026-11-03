# Observabilidade de AI

Todo hook do Copilot neste repositório adiciona um objeto JSON por evento a um log local e gitignored: `.github/hooks/scripts/observability.jsonl`. Esta página explica como lê-lo — e por que ele existe.

## Por que existe

Os hooks disparam de forma invisível: um `npm install` bloqueado aqui, um aviso do write guard ali. O log torna o invisível visível, respondendo perguntas como *"quantas vezes as defesas me protegeram este mês?"* com dados em vez de impressões. Ele também alimenta decisões sobre quais regras consultivas merecem virar gates de bloqueio (avisos repetidos que nunca são atendidos são candidatos; avisos sempre corrigidos na hora também).

## Formato das entradas

Um objeto JSON por linha (JSONL). Campos:

| Campo | Significado |
| --- | --- |
| `at` | Timestamp ISO-8601 (adicionado pelo logger quando ausente) |
| `hook` | Nome do script de hook (ex.: `enforce-security`, `warn-oversized-commit`) |
| `event` | Evento de lifecycle (`sessionStart`, `preToolUse`, `postToolUse`) |
| `action` | `fired` (informacional), `suggest` (conselho emitido), `warn` (fricção deliberada), `block` (chamada negada) |
| `reason` | Por que o hook agiu (bloqueios e avisos) |
| `snippet` | Prefixo curto do comando bloqueado (só bloqueios do `enforce-security`) |

## Lendo o log

O caminho rápido — o script de resumo:

```bash
node .github/hooks/scripts/observability-summary.js
```

```text
Hook observability — 42 event(s)
  window: 2026-11-03T12:00:00.000Z → 2026-11-03T18:00:00.000Z

  By action:
    fired: 30
    suggest: 9
    block: 3

  By hook:
    inject-context: 30
    enforce-security: 3
    ...

  🛡️  The defenses blocked 3 dangerous call(s).
```

(A saída do script é em inglês.)

Legível por máquina (para suas próprias análises):

```bash
node .github/hooks/scripts/observability-summary.js --format json
```

Ou consulte o JSONL bruto com `jq`:

```bash
# todos os bloqueios, do mais antigo ao mais recente
jq -c 'select(.action == "block")' .github/hooks/scripts/observability.jsonl

# bloqueios por motivo
jq -r 'select(.action == "block") | .reason' .github/hooks/scripts/observability.jsonl | sort | uniq -c | sort -rn
```

## Propriedades

- **Somente local:** o arquivo é gitignored e nunca sai da sua máquina.
- **Limitado:** o logger mantém no máximo 5.000 entradas (as mais antigas são descartadas primeiro), então o log nunca cresce sem limite.
- **Nunca atrapalha:** erros de escrita do log são engolidos — um disco cheio não pode quebrar um hook de commit.
- **Sinal, não ruído:** os hooks registram quando agem (suggest/warn/block/fired); passagens silenciosas não são registradas. Invocações de skills pelo modelo não são observáveis por hooks e portanto não são registradas — o log cobre apenas a camada determinística.
- **Substituído:** o antigo `security-blocks.log` (só bloqueios) foi migrado para este log unificado na Fase AI-3.3.
