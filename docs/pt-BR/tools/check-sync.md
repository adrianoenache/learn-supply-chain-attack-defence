# check-sync

`check-sync.js` verifica se o `node_modules` corresponde ao estado descrito no `package-lock.json`. Ele detecta drift causado por edições manuais ou instalações parciais.

## O que faz

- Lê o `package-lock.json` e percorre o `node_modules`.
- Compara versões instaladas, pacotes ausentes e pacotes extranhos.
- Recomenda `npm ci` quando estiver fora de sincronia.
- Pode sair sem imprimir quando `--silent` é usado.

Implementado em [tools/check-sync.js](../../../tools/check-sync.js). A lógica compartilhada está em [tools/lib/sync-check.js](../../../tools/lib/sync-check.js).

## Uso

```bash
# Verificar status de sincronização
npm run defence:sync-check

# Corrigir automaticamente executando npm ci (use com cuidado)
npm run defence:sync-check -- --fix

# Modo silencioso
npm run defence:sync-check -- --silent
```

## Exemplo de saída

```text
✅ node_modules está sincronizado com package-lock.json.
```

Ou quando estiver fora de sincronia:

```text
⚠️  node_modules está fora de sincronia com package-lock.json.
   Motivo: pacote extranho left-pad@1.3.0
   Execute o seguinte comando para sincronizar:
     npm ci
```

## Camada de defesa relacionada

- [Camada de Defesa 4 — Instalação determinística](../security/defense-layer-4-deterministic-install.md)
