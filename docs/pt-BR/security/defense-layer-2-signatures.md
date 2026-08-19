# Camada de Defesa 2 — Verificação de Assinaturas

O npm pode verificar se os pacotes foram assinados pelo registry. Isso garante que o tarball não foi alterado após a publicação.

## Comando

```bash
npm audit signatures
```

## Onde Executa

- `npm run defence:bootstrap` (durante a primeira instalação sem `package-lock.json`)
- `npm run setup`
- `npm run defence:add`
- `npm run defence:update`
- `.husky/pre-commit`

## O Que Verifica

O npm compara a assinatura do registry e a integridade da chave de cada pacote instalado contra os metadados do `package-lock.json`. Uma falha de assinatura significa que o pacote foi modificado em trânsito ou que o lock file está inconsistente com o registry.

## Modo de Falha

Se uma assinatura estiver ausente ou inválida, o comando sai com código diferente de zero e bloqueia o restante do fluxo.
