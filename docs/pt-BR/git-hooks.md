# Git Hooks

Este projeto usa [Husky](https://typicode.github.io/husky/) para gerenciar hooks do Git. Os hooks ficam no diretório `.husky`.

## Pré-commit

O hook de pré-commit está definido em `.husky/pre-commit`:

```bash
# Husky pre-commit hook: scans staged files for secrets, verifies hook integrity,
# validates the npm configuration surface (.npmrc keys + npm extension files),
# runs lint, refreshes the test badge, runs the project pre-commit script
# (signatures + CVE audit), a transitive package-age check, and a transitive
# license check to catch manual edits to package.json/package-lock.json.
git diff --cached --name-only -z | xargs -0 -r npm run defence:check-secrets --
npm run defence:check-hooks
npm run defence:check-npmrc
# (actionlint roda quando disponível localmente; o CI sempre o exige)
npm run lint
npm run defence:check-external-urls
npm run defence:verify-defences:fix && git add .defence-manifest.json
npm run defence:update-badge && git add README.md
npm run defence:pre-commit
npm run defence:pkg-age-check -- --transitive
npm run defence:license-check:fail
```

> O trecho acima é um resumo legível; o conteúdo autoritativo é o próprio
> arquivo do hook, cuja integridade é verificada por hash via `defence:check-hooks`.

### O Que Ele Faz

1. Verifica se há prováveis segredos nos arquivos em stage com `npm run defence:check-secrets`. Essa etapa é executada primeiro para impedir que valores sensíveis cheguem ao repositório.
2. Executa `npm run defence:check-hooks` para verificar se `.husky/pre-commit` não foi adulterado.
3. Executa `npm run defence:check-npmrc` para validar a superfície de configuração do npm (chaves conhecidas, registro lookahead, ausência de arquivos de extensão do npm v12).
4. Executa `actionlint` nos workflows quando o binário está instalado localmente (o CI sempre o exige).
5. Executa `npm run lint` para aplicar as regras de lint e formatação do Biome.
6. Executa `npm run defence:check-external-urls` para manter os links da documentação vivos.
7. Executa `npm run defence:verify-defences:fix` para atualizar os hashes do `.defence-manifest.json` e o re-adiciona ao stage.
8. Executa `npm run defence:update-badge` para atualizar o badge de contagem de testes no `README.md` e o re-adiciona ao stage.
9. Executa `npm run defence:pre-commit`, que por sua vez executa:
   - `npm audit signatures`
   - `npm audit --audit-level=high`
   - `npm run defence:update-check`
10. Executa uma verificação transitiva de idade dos pacotes, garantindo que qualquer alteração manual em `package.json` ou `package-lock.json` também seja validada.
11. Executa uma verificação transitiva de licenças, garantindo que licenças incompatíveis sejam detectadas antes do commit.

## Pós-merge

O hook `.husky/post-merge` avisa quando `node_modules` está desatualizado em relação ao `package-lock.json` após um `git pull` ou `git merge`:

```bash
npm run defence:sync-check
```

Isso fornece um sinal antecipado de que um `npm ci` pode ser necessário.

### Verificação de Segredos

O scanner busca padrões comuns de segredos, como chaves de acesso da AWS, tokens do GitHub, tokens do npm, blocos de chaves privadas e URLs com credenciais embutidas. Você pode suprimir falsos positivos adicionando padrões de ignorar ao `.check-secrets-ignore` (um padrão por linha, `#` para comentários).

### Ignorar o Hook

> ⚠️ Ignorar os hooks não é recomendado. Isso anula o propósito das camadas de defesa.

Se for absolutamente necessário ignorá-lo (por exemplo, em um branch local temporário), use:

```bash
git commit --no-verify -m "commit temporário"
```
