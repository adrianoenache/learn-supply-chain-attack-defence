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

# Saída em Markdown
npm run defence:check-lockfile-integrity -- --format=markdown

# Modo quiet (apenas código de saída)
npm run defence:check-lockfile-integrity -- --quiet
```

`--silent` permanece como alias de compatibilidade de `--quiet`.

## Exemplo de saída

```text
  ✓ OK   all registry lockfile entries have SHA-512 integrity

── Summary ───────────────────────────────────────────
  ✓ OK   12 passed
```

(A saída da ferramenta é em inglês.)

## Camada de defesa relacionada

- [Camada de Defesa 4 — Instalação determinística](../security/defense-layer-4-deterministic-install.md)

## Dependências git/file

Entradas resolvidas de URLs git ou caminhos `file:`/`link:` nunca carregam hash de integridade de tarball — são fixadas por commit na URL resolvida. São reportadas numa seção informativa própria e não falham a verificação; entradas do registry ainda precisam de SHA-512.
