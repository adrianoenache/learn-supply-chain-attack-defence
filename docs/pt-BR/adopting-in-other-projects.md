# Adotando as Defesas em Outros Projetos

Você pode copiar as defesas deste repositório para outro projeto Node.js sem publicar um pacote no npm. O instalador incluso copia os arquivos necessários e atualiza o `package.json` do projeto de destino.

## Opção A — Copiar Arquivos com o Instalador

A partir da raiz deste repositório, execute:

```bash
node ./tools/install-defences.js /caminho/do/projeto-destino
```

Para visualizar as alterações sem aplicá-las:

```bash
node ./tools/install-defences.js /caminho/do/projeto-destino --dry-run
```

Se um arquivo já existir no projeto de destino, o instalador aborta. Para sobrescrever e criar backups, adicione `--force`:

```bash
node ./tools/install-defences.js /caminho/do/projeto-destino --force
```

## O Que o Instalador Faz

1. Copia os seguintes arquivos para o projeto de destino:
   - `.npmrc`
   - `.husky/pre-commit`
   - `tools/check-package-age.js`
   - `tools/add-package.js`
   - `tools/lib/package-utils.js`
   - `tools/setup-bootstrap.js`
   - `tools/check-package-age.test.js`
2. Adiciona scripts com prefixo `defence:*` ao `package.json`:
   - `setup`
   - `defence:bootstrap`
   - `defence:pkg-age-check`
   - `defence:reinstall`
   - `defence:pre-commit`
   - `defence:add`
   - `test`
   - `prepare`
3. Adiciona `husky` em `devDependencies` se ainda não estiver presente.

Scripts existentes que não entram em conflito são preservados. Se um script de destino já existir com um valor diferente, o instalador aborta para que nada seja sobrescrito silenciosamente.

## Depois de Executar o Instalador

1. Execute `npm install` no projeto de destino para instalar o husky e gerar o lock file (ou execute `npm run defence:bootstrap` se não houver `package-lock.json`).
2. Verifique o hook de pré-commit: `bash .husky/pre-commit`
3. Faça commit de `.npmrc`, `.husky/`, `tools/` e do `package.json` atualizado.

## Mantendo os Arquivos em Sincronia

Como o instalador apenas copia arquivos, futuras atualizações dos scripts de defesa neste repositório devem ser re-copiadas manualmente. Reexecute o instalador com `--force` para atualizar o projeto de destino, ou copie apenas os arquivos que mudaram.

_Sincronizado em: 2026-08-18_.
