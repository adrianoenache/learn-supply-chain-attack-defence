# Checklist de Release

Use esta checklist antes de criar uma nova tag de release. Todos os gates abaixo também são executados no [CI](../../.github/workflows/ci.yml).

## Antes de Começar

- [ ] Confirme o escopo do release com os mantenedores.
- [ ] Garanta que o `CHANGELOG.md` tenha uma entrada para a nova versão.
- [ ] Decida se o bump será patch, minor ou major com base no [SemVer](https://semver.org/lang/pt-BR/).

## Versão e Metadados

- [ ] Atualize o `version` em `package.json` e `package-lock.json`.
- [ ] Verifique se `engines.node` e `engines.npm` ainda refletem a matriz de runtime suportada.
- [ ] Verifique se `LICENSE` e `SECURITY.md` estão atualizados.
- [ ] Verifique se `CONTRIBUTING.md` e `CODE_OF_CONDUCT.md` ainda refletem as práticas atuais.

## Gates de Qualidade (local)

Execute estes comandos localmente e confirme que passam:

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:coverage`
- [ ] `npm run defence:check-md-links`
- [ ] `npm run defence:license-check:fail`
- [ ] `npm run defence:check-engines`
- [ ] `npm run defence:sync-check`

## Gates de Segurança (local)

- [ ] `npm audit signatures`
- [ ] `npm audit --audit-level=high`
- [ ] `npm run defence:pkg-age-check -- --transitive`
- [ ] `npm run defence:check-hooks`
- [ ] `npm run defence:generate-sbom -- --output=/tmp/sbom.json`
- [ ] `npm run defence:verify-defences`

> **Nota:** `defence:verify-defences` exige que `.defence-manifest.json` esteja commitado. Se algum arquivo de defesa mudou, regenere o manifesto com a lógica do instalador antes de fazer o commit.

## Varredura de Segredos

- [ ] Execute a mesma varredura usada no CI:

  ```bash
  git ls-files -z | xargs -0 -r npm run defence:check-secrets --
  ```

## Documentação

- [ ] Atualize `docs/en/` e `docs/pt-BR/` se algum comportamento visível ao usuário mudou.
- [ ] Verifique se novos arquivos markdown estão linkados em `docs/en/index.md` e `docs/pt-BR/index.md`.
- [ ] Execute `npm run defence:check-md-links` novamente após alterações na documentação.
- [ ] Atualize o `README.md` se o resumo público mudou.

## CI / Pull Request

- [ ] Abra um pull request para `main` (ou `dev` para pré-releases).
- [ ] Confirme que todos os jobs do GitHub Actions passam, incluindo o novo job `coverage`.
- [ ] Revise os artefatos de cobertura e SBOM gerados, caso sejam publicados.

## Tag e Release

- [ ] Faça o merge do pull request de release.
- [ ] Faça pull da branch `main` atualizada localmente.
- [ ] Crie uma tag anotada:

  ```bash
  git tag -a vX.Y.Z -m "Release vX.Y.Z"
  git push origin vX.Y.Z
  ```

- [ ] Crie um GitHub Release a partir da tag.
- [ ] Copie a seção relevante do `CHANGELOG.md` para as notas de release.
- [ ] Anexe o SBOM gerado (`sbom.json`) aos assets do release.

## Verificação Pós-Release

- [ ] Clone o repositório em um diretório limpo e execute `npm run setup`.
- [ ] Verifique se `npm test` ainda passa no clone limpo.
- [ ] Verifique se `npm run defence:verify-defences` ainda passa no clone limpo.
- [ ] Feche o milestone de release, se houver.

## Matriz de Versões Node.js / npm

O projeto atualmente suporta:

| Runtime | Versão Mínima |
| --- | --- |
| Node.js | `>= 24.19.0` |
| npm | `>= 11.17.0` |

O CI executa nas versões exatas declaradas em `engines`. Ao atualizar a matriz, altere:

- `package.json` `engines`
- `.github/workflows/ci.yml` (usa `engines` dinamicamente)
- `docs/en/setup.md` e `docs/pt-BR/setup.md`
