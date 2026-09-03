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
   - `biome.json`
   - `tools/check-package-age.js`
   - `tools/check-package-age.test.js`
   - `tools/add-package.js`
   - `tools/check-md-links.js`
   - `tools/check-md-links.test.js`
   - `tools/lib/package-utils.js`
   - `tools/setup-bootstrap.js`
   - `tools/setup-bootstrap.test.js`
   - `tools/install-defences.js`
   - `tools/install-defences.test.js`
   - `tools/update-packages.js`
   - `tools/update-packages.test.js`
   - `tools/update-badge.js`
   - `tools/update-badge.test.js`
   - `tools/verify-defences.js`
   - `tools/verify-defences.test.js`

   Ele também escreve `.defence-manifest.json` no projeto destino com hashes SHA-256 dos arquivos copiados.
2. Adiciona scripts com prefixo `defence:*` ao `package.json`:
   - `setup`
   - `defence:bootstrap`
   - `defence:check-md-links`
   - `defence:pkg-age-check`
   - `defence:reinstall`
   - `defence:update`
   - `defence:update:interactive`
   - `defence:update:interactive:dry-run`
   - `defence:update-badge`
   - `defence:update-badge:dry-run`
   - `defence:pre-commit`
   - `defence:add`
   - `defence:verify-defences`
   - `test`
   - `lint`
   - `lint:fix`
   - `format`
   - `prepare`
3. Adiciona `husky` e `@biomejs/biome` em `devDependencies` se ainda não estiverem presentes.

Scripts existentes que não entram em conflito são preservados. Se um script de destino já existir com um valor diferente, o instalador aborta para que nada seja sobrescrito silenciosamente.

## Depois de Executar o Instalador

1. Execute `npm install` no projeto de destino para instalar o husky, o Biome e gerar o lock file.
   - Alternativamente, se não houver `package-lock.json`, execute `npm run defence:bootstrap` após a instalação.
2. Verifique o hook de pré-commit: `bash .husky/pre-commit`
3. Verifique a qualidade do código: `npm run lint`
4. Faça commit de `.npmrc`, `.husky/`, `biome.json`, `tools/`, `.defence-manifest.json` e do `package.json` atualizado.

## Mantendo os Arquivos em Sincronia

Como o instalador apenas copia arquivos, futuras atualizações dos scripts de defesa neste repositório devem ser re-copiadas manualmente. Reexecute o instalador com `--force` para atualizar o projeto de destino, ou copie apenas os arquivos que mudaram.
