# check-secrets

`check-secrets.js` varre arquivos em busca de possíveis segredos antes que sejam commitados. Ele usa expressões regulares determinísticas em vez de serviços de varredura de terceiros.

## O que faz

- Aceita uma lista de caminhos de arquivo como argumentos, tipicamente provenientes de `git diff --cached --name-only`.
- Varre padrões correspondentes a chaves AWS, tokens GitHub, tokens npm e outros formatos comuns de segredo.
- Relata os achados com caminho do arquivo, número da linha e padrão correspondido.
- Suporta supressão de falsos positivos via `.check-secrets-ignore` (um padrão por linha, `#` para comentários).

Implementado em [tools/check-secrets.js](../../../tools/check-secrets.js).

## Uso

```bash
# Verificar arquivos staged
npm run defence:check-secrets

# Verificar arquivos específicos
npm run defence:check-secrets -- src/config.js tests/fixture.env

# Modo quiet (apenas código de saída; achados continuam visíveis)
npm run defence:check-secrets -- --quiet src/config.js
```

`--silent` permanece como alias de compatibilidade de `--quiet`.

## Exemplo de saída

```text
  ✓ OK   no secrets detected in 2 file(s)

── Summary ───────────────────────────────────────────
  ✓ OK   2 passed
```

Quando um possível segredo é encontrado:

```text
Potential secrets detected:
  ✗ FAIL src/config.js:3 — AWS access key ID: AKIA...

── Summary ───────────────────────────────────────────
  ✓ OK   0 passed
  ✗ FAIL 1 failed
  Next: review the findings above; add false positives to .check-secrets-ignore
```

(A saída da ferramenta é em inglês.)

## Camada de defesa relacionada

- Parte do pipeline de pre-commit.
- Suporta a [Camada de Defesa 5 — Hook de pre-commit](../security/defense-layer-5-precommit-hook.md).
