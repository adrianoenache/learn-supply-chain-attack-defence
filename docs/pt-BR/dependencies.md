# Adicionando Dependências

Novas dependências devem ser adicionadas pelo script controlado `npm run defence:add` em vez de `npm install`.

## Por Que Usar um Script?

`npm install` pode atualizar silenciosamente dependências transitivas e ignorar o gate de idade dos pacotes. O script `defence:add` envolve o processo com as mesmas defesas usadas no setup.

## Uso

```bash
# Adicionar uma dependência de runtime
npm run defence:add -- lodash@4.17.21

# Adicionar uma dependência de desenvolvimento
npm run defence:add -- --dev eslint@9.0.0

# Adicionar uma dependência peer
npm run defence:add -- --peer some-pkg@1.0.0

# Simular a operação sem alterar arquivos
npm run defence:add -- lodash@4.17.21 --dry-run
```

## O Que o Script Verifica

1. Faz o parse do especificador do pacote e rejeita metacaracteres de shell.
2. Verifica se o pacote solicitado tem pelo menos 7 dias de idade.
3. Instala a dependência (`npm install <pkg> --save-prod|save-dev|save-peer`).
4. Executa `npm audit signatures`.
5. Executa `npm audit --audit-level=high`.
6. Executa uma verificação transitiva de idade dos pacotes.

## Edições Manuais

Evite editar `package.json` ou `package-lock.json` manualmente. Se fizer isso, o hook de pré-commit ainda executará a verificação transitiva de idade, mas corrigir falhas é mais difícil do que passar pelo script `defence:add`.

_Sincronizado em: 2026-08-18_.
