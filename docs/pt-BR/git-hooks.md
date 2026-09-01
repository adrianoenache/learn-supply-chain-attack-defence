# Git Hooks

Este projeto usa [Husky](https://typicode.github.io/husky/) para gerenciar hooks do Git. Os hooks ficam no diretório `.husky`.

## Pré-commit

O hook de pré-commit está definido em `.husky/pre-commit`:

```bash
# Husky pre-commit hook: scans staged files for secrets, runs lint, the project
# pre-commit script (signatures + CVE audit), and a transitive package-age check
# to catch manual edits to package.json/package-lock.json.
git diff --cached --name-only -z | xargs -0 -r npm run defence:check-secrets --
npm run lint
npm run defence:update-badge && git add README.md
npm run defence:pre-commit
npm run defence:pkg-age-check -- --transitive
```

### O Que Ele Faz

1. Verifica se há prováveis segredos nos arquivos em stage com `npm run defence:check-secrets`. Essa etapa é executada primeiro para impedir que valores sensíveis cheguem ao repositório.
2. Executa `npm run lint` para aplicar as regras de lint e formatação do Biome.
3. Executa `npm run defence:update-badge` para atualizar o badge de contagem de testes no `README.md`.
4. Executa `npm run defence:pre-commit`, que por sua vez executa:
   - `npm audit signatures`
   - `npm audit --audit-level=high`
5. Executa uma verificação transitiva de idade dos pacotes, garantindo que qualquer alteração manual em `package.json` ou `package-lock.json` também seja validada.

### Verificação de Segredos

O scanner busca padrões comuns de segredos, como chaves de acesso da AWS, tokens do GitHub, tokens do npm, blocos de chaves privadas e URLs com credenciais embutidas. Você pode suprimir falsos positivos adicionando padrões de ignorar ao `.check-secrets-ignore` (um padrão por linha, `#` para comentários).

### Ignorar o Hook

> ⚠️ Ignorar os hooks não é recomendado. Isso anula o propósito das camadas de defesa.

Se for absolutamente necessário ignorá-lo (por exemplo, em um branch local temporário), use:

```bash
git commit --no-verify -m "commit temporário"
```
