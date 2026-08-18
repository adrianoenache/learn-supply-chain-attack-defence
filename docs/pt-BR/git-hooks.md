# Git Hooks

Este projeto usa [Husky](https://typicode.github.io/husky/) para gerenciar hooks do Git. Os hooks ficam no diretório `.husky`.

## Pré-commit

O hook de pré-commit está definido em `.husky/pre-commit`:

```bash
# Husky pre-commit hook: runs the project pre-commit script (signatures + CVE audit)
# and a transitive package-age check to catch manual edits to package.json/package-lock.json.
npm run pre-commit
npm run pkg-age-check -- --transitive
```

### O Que Ele Faz

1. Executa `npm run pre-commit`, que por sua vez executa:
   - `npm audit signatures`
   - `npm audit --audit-level=high`
2. Executa uma verificação transitiva de idade dos pacotes, garantindo que qualquer alteração manual em `package.json` ou `package-lock.json` também seja validada.

### Ignorar o Hook

> ⚠️ Ignorar os hooks não é recomendado. Isso anula o propósito das camadas de defesa.

Se for absolutamente necessário ignorá-lo (por exemplo, em um branch local temporário), use:

```bash
git commit --no-verify -m "commit temporário"
```

_Sincronizado em: 2026-08-18_.
