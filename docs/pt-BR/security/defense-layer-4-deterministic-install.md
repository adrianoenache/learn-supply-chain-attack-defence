# Camada de Defesa 4 — Instalação Determinística

O `npm ci` instala versões exatas a partir do `package-lock.json`. Ele nunca atualiza o lock file nem resolve novos ranges.

## Comando

```bash
npm ci
```

## Onde Executa

- `npm run setup`
- `npm run defence:reinstall`

## Benefícios

- Instalações reproduzíveis entre máquinas e ambientes.
- Impede upgrades acidentais de dependências transitivas.
- Falha se `package.json` e `package-lock.json` estiverem fora de sincronia.

## Quando NÃO Usar `npm install`

Dentro deste projeto, evite `npm install` para setup rotineiro. Use `npm ci` ou os scripts `npm run defence:add` / `npm run defence:reinstall`.
