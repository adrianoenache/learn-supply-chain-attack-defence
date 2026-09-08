# check-secrets

`check-secrets.js` varre arquivos em busca de possíveis segredos antes que sejam commitados. Ele usa expressões regulares determinísticas em vez de serviços de varredura de terceiros.

## O que faz

- Aceita uma lista de caminhos de arquivo como argumentos, tipicamente provenientes de `git diff --cached --name-only`.
- Varre padrões correspondentes a chaves AWS, tokens GitHub, tokens npm e outros formatos comuns de segredo.
- Relata os achados com caminho do arquivo, número da linha e padrão correspondido.

Implementado em [tools/check-secrets.js](../../../tools/check-secrets.js).

## Uso

```bash
# Verificar arquivos staged
npm run defence:check-secrets

# Verificar arquivos específicos
npm run defence:check-secrets -- src/config.js tests/fixture.env
```

## Exemplo de saída

```text
Possível segredo em src/config.js:3
  Padrão: ID de chave de acesso AWS
```

## Camada de defesa relacionada

- Parte do pipeline de pre-commit.
- Suporta a [Camada de Defesa 5 — Hook de pre-commit](../security/defense-layer-5-precommit-hook.md).
