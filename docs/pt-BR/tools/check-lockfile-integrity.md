# check-lockfile-integrity

`check-lockfile-integrity.js` verifica se cada entrada do `package-lock.json` possui um campo de integridade forte SHA-512. Valores de integridade fracos ou ausentes são rejeitados.

## O que faz

- Faz o parsing do `package-lock.json`.
- Verifica se cada entrada de pacote possui um campo `integrity`.
- Rejeita `sha1` ou integridade ausente.
- Emite relatórios em tabela, JSON ou Markdown.

Implementado em [tools/check-lockfile-integrity.js](../../../tools/check-lockfile-integrity.js).

## Uso

```bash
# Modo de relatório
npm run defence:check-lockfile-integrity

# Saída JSON
npm run defence:check-lockfile-integrity -- --format=json

# Modo silencioso (apenas código de saída)
npm run defence:check-lockfile-integrity -- --silent
```

## Exemplo de saída

```text
✅ Todas as entradas do lockfile possuem integridade SHA-512.
```

## Camada de defesa relacionada

- [Camada de Defesa 4 — Instalação determinística](../security/defense-layer-4-deterministic-install.md)
