# Camada de Defesa 5 — Hook de Pré-commit

O Husky executa um hook de pré-commit a cada `git commit`. Ele roda as mesmas verificações usadas no setup e na adição de dependências, mais uma verificação transitiva de idade dos pacotes. Também atualiza o badge de contagem de testes no `README.md` para mantê-lo sincronizado com a suite de testes.

## Arquivo do Hook

[.husky/pre-commit](../../../.husky/pre-commit)

```bash
# Husky pre-commit hook: runs lint, refreshes the test badge, runs the project
# pre-commit script (signatures + CVE audit), and a transitive package-age check
# to catch manual edits to package.json/package-lock.json.
npm run lint
npm run defence:update-badge && git add README.md
npm run defence:pre-commit
npm run defence:pkg-age-check -- --transitive
```

## Por Que Transitivo?

O `npm install` pode alterar dependências aninhadas que não estão listadas em `package.json`. A verificação transitiva de idade garante que essas mudanças também sejam validadas antes de serem commitadas.

## Ignorando o Hook

Use `--no-verify` apenas em branches locais descartáveis. Nunca use para commits que serão compartilhados ou mergeados.
