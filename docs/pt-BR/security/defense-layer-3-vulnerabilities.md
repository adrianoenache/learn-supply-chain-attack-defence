# Camada de Defesa 3 — Auditoria de Vulnerabilidades

O `npm audit` varre a árvore de dependências instalada em busca de advisories de segurança conhecidos.

## Comando

```bash
npm audit --audit-level=high
```

## Onde Executa

- `npm run defence:bootstrap` (durante a primeira instalação sem `package-lock.json`)
- `npm run setup`
- `npm run defence:add`
- `npm run defence:update`
- `.husky/pre-commit`

## Nível de Auditoria

O projeto permite apenas vulnerabilidades `low`, `moderate` ou `info`. Qualquer advisory `high` ou `critical` faz o comando falhar.

## Corrigindo Vulnerabilidades

Se o `npm audit` falhar:

1. Atualize a dependência afetada para uma versão corrigida.
2. Execute novamente `npm run defence:add -- <pkg>@<versão>`.
3. Se o advisory for um falso positivo para o seu caso de uso, documente explicitamente a exceção em vez de abaixar o nível de auditoria.

