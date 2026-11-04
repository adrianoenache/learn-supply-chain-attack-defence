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
    "huskyPreCommitHash": "<sha256-do-arquivo-.husky/pre-commit>"
  }
}
```

Após uma alteração deliberada do hook, siga a skill `pre-commit-hash-sync`: recalcule o SHA-256 do hook, atualize `defences.huskyPreCommitHash` no `package.json`, execute `npm run defence:verify-defences:fix` para atualizar o manifesto e commite os três arquivos juntos. Rodar `verify-defences:fix` sozinho não basta — ele atualiza apenas o manifesto, não o hash no `package.json`.

## Uso

```bash
npm run defence:check-hooks
```

## Exemplo de saída

```text
✅ Pre-commit hook integrity verified.
```

(A saída da ferramenta é em inglês.)

## Camada de defesa relacionada

- [Camada de Defesa 12 — Integridade do hook de pre-commit](../security/defense-layer-12-hook-integrity.md)
