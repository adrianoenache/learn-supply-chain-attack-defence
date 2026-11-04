# Camada de Defesa 5 — Hook de Pré-commit

O Husky executa um hook de pré-commit a cada `git commit`. Ele roda as mesmas verificações usadas no setup e na adição de dependências, mais a verificação transitiva de idade, a verificação transitiva de licenças, a varredura de segredos, a verificação de integridade do hook, a checagem da superfície de configuração do npm, a validação de URLs externas e as atualizações do manifesto de adoção e do badge de testes.

## Arquivo do Hook

[.husky/pre-commit](../../../.husky/pre-commit)

```bash
git diff --cached --name-only -z | xargs -0 -r npm run defence:check-secrets --
npm run defence:check-hooks
npm run defence:check-npmrc
npm run lint
npm run defence:check-external-urls
npm run defence:verify-defences:fix && git add .defence-manifest.json
npm run defence:update-badge && git add README.md
npm run defence:pre-commit
npm run defence:pkg-age-check -- --transitive
npm run defence:license-check:fail
```

> Resumo legível — o arquivo do hook, verificado por hash, é o autoritativo. O
> detalhamento passo a passo está em [Git hooks](../git-hooks.md).

## Por Que Transitivo?

O `npm install` pode alterar dependências aninhadas que não estão listadas em `package.json`. A verificação transitiva de idade garante que essas mudanças também sejam validadas antes de serem commitadas.

## Ignorando o Hook

Use `--no-verify` apenas em branches locais descartáveis. Nunca use para commits que serão compartilhados ou mergeados.
