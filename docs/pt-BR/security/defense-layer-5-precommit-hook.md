# Camada de Defesa 5 — Hook de Pré-commit

O Husky executa um hook de pré-commit a cada `git commit`. Ele roda as mesmas verificações usadas no setup e na adição de dependências, mais uma verificação transitiva de idade dos pacotes.

## Arquivo do Hook

[.husky/pre-commit](../../../.husky/pre-commit)

```bash
# Husky pre-commit hook: runs the project pre-commit script (signatures + CVE audit)
# and a transitive package-age check to catch manual edits to package.json/package-lock.json.
npm run pre-commit
npm run pkg-age-check -- --transitive
```

## Por Que Transitivo?

O `npm install` pode alterar dependências aninhadas que não estão listadas em `package.json`. A verificação transitiva de idade garante que essas mudanças também sejam validadas antes de serem commitadas.

## Ignorando o Hook

Use `--no-verify` apenas em branches locais descartáveis. Nunca use para commits que serão compartilhados ou mergeados.

_Sincronizado em: 2025-06-25_
