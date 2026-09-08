# run-audit-with-retry

`run-audit-with-retry.js` encapsula o `npm audit` e faz retry em erros transitórios de rede, falhando imediatamente quando vulnerabilidades reais são reportadas.

## O que faz

- Executa `npm audit` com os argumentos padrão.
- Repete até 3 vezes quando o npm sai com erros transitórios de registro.
- Não repete quando vulnerabilidades são de fato reportadas.

Implementado em [tools/run-audit-with-retry.js](../../../tools/run-audit-with-retry.js).

## Uso

```bash
npm run defence:audit
```

## Exemplo de saída

```text
npm audit concluído sem vulnerabilidades encontradas.
```

## Camada de defesa relacionada

- [Camada de Defesa 3 — Auditoria de vulnerabilidades](../security/defense-layer-3-vulnerabilities.md)
