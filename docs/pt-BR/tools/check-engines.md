# check-engines

`check-engines.js` valida se as versões ativas do Node.js e do npm satisfazem o campo `engines` do `package.json`.

## O que faz

- Lê `engines.node` e `engines.npm` do `package.json`.
- Compara com `process.version` e `npm --version`.
- Falha rapidamente com uma mensagem clara se o runtime for muito antigo.

Implementado em [tools/check-engines.js](../../../tools/check-engines.js).

## Configuração

Configure as versões mínimas no `package.json`:

```json
{
  "engines": {
    "node": ">=24.19.0",
    "npm": ">=11.17.0"
  }
}
```

## Uso

```bash
npm run defence:check-engines
```

## Exemplo de saída

```text
Node.js: v24.19.0 >= >=24.19.0 ✓
npm: 11.17.0 >= >=11.17.0 ✓
```

## Camada de defesa relacionada

- Parte do fluxo de [configuração segura](../setup.md).
