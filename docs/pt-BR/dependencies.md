# Adicionando Dependências

Novas dependências devem ser adicionadas pelo script controlado `npm run defence:add` em vez de `npm install`.

## Por Que Usar um Script?

`npm install` pode atualizar silenciosamente dependências transitivas e ignorar o gate de idade dos pacotes. O script `defence:add` envolve o processo com as mesmas defesas usadas no setup.

## Uso

```bash
# Adicionar uma dependência de runtime
npm run defence:add -- lodash@4.17.21

# Adicionar uma dependência de desenvolvimento
npm run defence:add -- --dev alguma-ferramenta-dev@1.0.0

# Adicionar uma dependência peer
npm run defence:add -- --peer some-pkg@1.0.0

# Simular a operação sem alterar arquivos
npm run defence:add -- lodash@4.17.21 --dry-run
```

## O Que o Script Verifica

1. Faz o parse do especificador do pacote e rejeita metacaracteres de shell.
2. Verifica se o pacote solicitado tem pelo menos 7 dias de idade.
3. Verifica provenance npm / atestação SLSA quando configurado.
4. Executa detecção de typosquatting/confusão de dependências contra nomes existentes.
5. Executa análise estática dos lifecycle scripts do pacote (dry-run pré-install).
6. Fixa a integridade do tarball a partir do manifesto do registry (proteção TOCTOU — os metadados são re-verificados após a instalação).
7. Instala a dependência (`npm install <pkg> --save-prod|save-dev|save-peer`).
8. Executa `npm audit signatures`.
9. Executa `npm audit --audit-level=high`.
10. Executa uma verificação transitiva de idade dos pacotes.
11. Executa uma verificação transitiva de licenças das dependências (`npm run defence:license-check:fail`).

## Atualizando Dependências Existentes

Para atualizar dependências já declaradas no `package.json`, use o script de atualização controlada:

```bash
npm run defence:update
```

Ele prefere a maior **versão intermediária elegível por idade** descoberta pelo `defence:update-check` em vez de pular cegamente para a `latest` (que pode ainda estar em quarentena), aplica com instalação fixada `--save-exact --ignore-scripts` e depois reexecuta a verificação transitiva de idade, a verificação de assinaturas, o audit de vulnerabilidades e a checagem de licenças. Respeita as mesmas restrições do `.npmrc` usadas no restante do projeto.

## Edições Manuais

Evite editar `package.json` ou `package-lock.json` manualmente. Se fizer isso, o hook de pré-commit ainda executará a verificação transitiva de idade, mas corrigir falhas é mais difícil do que passar pelos scripts `defence:add` ou `defence:update`.
