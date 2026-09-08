# update-badge

`update-badge.js` atualiza o badge de contagem de testes no `README.md`, contando chamadas `test()` em todos os arquivos `tools/*.test.js`, `tools/lib/*.test.js` e `tools/perf/*.test.js`.

## O que faz

- Conta invocações `test(...)` de nível superior, ignorando testes aninhados e comentários.
- Atualiza a string do badge em `README.md` para `Tests-N/N passing`.
- Suporta modo dry-run para verificações no CI.

Implementado em [tools/update-badge.js](../../../tools/update-badge.js).

## Uso

```bash
# Atualizar badge do README
npm run defence:update-badge

# Execução simulada
npm run defence:update-badge:dry-run
```

## Exemplo de saída

```text
Badge de testes atualizado para 441/441 em README.md
```

## Camada de defesa relacionada

- Portão de manutenção da documentação.
- Executado pelo `.husky/pre-commit` para manter o badge atualizado.
