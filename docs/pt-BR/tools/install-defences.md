# install-defences

`install-defences.js` copia as defesas de cadeia de suprimentos deste projeto para outro projeto Node.js sem publicar um pacote. Ele apenas lê e copia arquivos; nunca executa código do diretório alvo.

## O que faz

- Copia `.npmrc`, hooks Husky, configuração do Biome, ferramentas, bibliotecas, testes e benchmarks.
- Adiciona scripts npm prefixados com `defence:` ao `package.json` do projeto alvo.
- Adiciona `husky` e `@biomejs/biome` em `devDependencies`.
- Grava `.defence-manifest.json` com hashes SHA-256 de cada arquivo copiado.
- Recusa sobrescrever arquivos existentes a menos que `--force` seja passado.
- Cria backups antes de sobrescrever.

Implementado em [tools/install-defences.js](../../../tools/install-defences.js).

## Uso

```bash
# Copiar defesas para outro projeto
node ./tools/install-defences.js /caminho/para/projeto-alvo

# Execução simulada
node ./tools/install-defences.js /caminho/para/projeto-alvo --dry-run

# Forçar sobrescrita (backup é criado)
node ./tools/install-defences.js /caminho/para/projeto-alvo --force

# Atualizar o manifesto local no projeto atual
npm run defence:verify-defences:fix
```

## Exemplo de saída

```text
Installing supply-chain defences into /caminho/para/projeto-alvo
  Copied .npmrc -> /caminho/para/projeto-alvo/.npmrc
  Copied tools/check-package-age.js -> /caminho/para/projeto-alvo/tools/check-package-age.js
  Wrote .defence-manifest.json with 71 file hash(es).
  Updated package.json with defence scripts and husky devDependency.

Done.
Next steps in the target project:
  1. Run npm install to install husky and generate the lock file.
  2. Run bash .husky/pre-commit to verify the hook.
  3. Commit .npmrc, .husky/, tools/, and package.json changes.
```

## Camada de defesa relacionada

- [Adotando em outros projetos](../adopting-in-other-projects.md)
- [Camada de Defesa 5 — Hook de pre-commit](../security/defense-layer-5-precommit-hook.md)
