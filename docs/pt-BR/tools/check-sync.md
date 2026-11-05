# check-sync

`check-sync.js` verifica se o `node_modules` corresponde ao estado descrito no `package-lock.json`. Ele detecta drift causado por edições manuais ou instalações parciais.

## O que faz

- Lê o `package-lock.json` e percorre o `node_modules`.
- Compara versões instaladas, pacotes ausentes e pacotes extranhos.
- Recomenda `npm ci` quando estiver fora de sincronia.
- Pode sair sem imprimir quando `--quiet` é usado (`--silent` permanece como alias).
- Termina com o sumário estruturado compartilhado (convenções de saída da Fase N).

Implementado em [tools/check-sync.js](../../../tools/check-sync.js). A lógica compartilhada está em [tools/lib/sync-check.js](../../../tools/lib/sync-check.js).

## Uso

```bash
# Verificar status de sincronização
npm run defence:sync-check

# Imprimir o comando de correção recomendado (npm ci) — nunca o executa
npm run defence:sync-check -- --fix

# Modo quiet (apenas código de saída, sem output)
npm run defence:sync-check -- --quiet
```

`--silent` permanece como alias de compatibilidade de `--quiet`.

## Exemplo de saída

```text
  ✓ OK   node_modules is in sync with package-lock.json

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
```

Ou quando estiver fora de sincronia:

```text
  ✗ FAIL node_modules is out of sync with package-lock.json
  Reason: extraneous package left-pad@1.3.0
  Run the following command to synchronize:
    npm ci

── Summary ───────────────────────────────────────────
  ✓ OK   0 passed
  ✗ FAIL 1 failed
  Next: npm ci
```

(A saída da ferramenta é em inglês.)

## Camada de defesa relacionada

- [Camada de Defesa 4 — Instalação determinística](../security/defense-layer-4-deterministic-install.md)
