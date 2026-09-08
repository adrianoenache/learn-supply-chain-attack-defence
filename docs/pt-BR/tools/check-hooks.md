# check-hooks

`check-hooks.js` verifica se `.husky/pre-commit` corresponde ao hash SHA-256 armazenado no `package.json`. Ele detecta modificações acidentais ou maliciosas no portão de commit.

## O que faz

- Lê o `huskyPreCommitHash` configurado no `package.json`.
- Calcula o hash SHA-256 de `.husky/pre-commit`.
- Informa se correspondem e sai com código diferente de zero em caso de divergência.

Implementado em [tools/check-hooks.js](../../../tools/check-hooks.js).

## Configuração

Armazene o hash esperado no `package.json`:

```json
{
  "defences": {
    "huskyPreCommitHash": "d1856544ae825229b0098409dac911aa10e766a34fdeb6274f7eef0d4cc2e281"
  }
}
```

Após uma alteração deliberada do hook, atualize o hash com:

```bash
npm run defence:verify-defences:fix
```

## Uso

```bash
npm run defence:check-hooks
```

## Exemplo de saída

```text
✅ O hash de .husky/pre-commit corresponde ao package.json.
```

## Camada de defesa relacionada

- [Camada de Defesa 12 — Integridade do hook de pre-commit](../security/defense-layer-12-hook-integrity.md)
