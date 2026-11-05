# run-audit-with-retry

`run-audit-with-retry.js` encapsula o `npm audit` e faz retry em erros transitórios de rede, falhando imediatamente quando vulnerabilidades reais são reportadas.

## O que faz

- Executa `npm audit --audit-level=high` (o piso de severidade do projeto).
- Repete até 3 vezes quando o npm sai com erros transitórios de registro.
- Não repete quando vulnerabilidades são de fato reportadas.

Implementado em [tools/run-audit-with-retry.js](../../../tools/run-audit-with-retry.js).

## Uso

```bash
npm run defence:audit
```

## Exemplo de saída

```text
found 0 vulnerabilities

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
```

(em falhas transitórias de registry, o wrapper reporta `Audit attempt N/3 failed ... Retrying` e tenta novamente com backoff; a saída final é do próprio npm, em inglês; `--quiet` suprime o relatório do npm e o sumário em caso de sucesso — falhas sempre aparecem)

## Camada de defesa relacionada

- [Camada de Defesa 3 — Auditoria de vulnerabilidades](../security/defense-layer-3-vulnerabilities.md)
