# Camada de Defesa 12 — Integridade do Hook Pre-Commit

O hook `.husky/pre-commit` é um ponto de controle crítico. Se for modificado por malware ou por um contribuidor malicioso, as verificações que deveriam detectar ataques à cadeia de suprimento podem ser silenciosamente desabilitadas.

## O Que Esta Camada Verifica

Esta camada verifica se o arquivo do hook pre-commit no disco corresponde ao hash SHA-256 registrado no `package.json`. Qualquer divergência faz a verificação falhar.

## Configuração

Armazene o hash esperado em `package.json`:

```json
{
  "defences": {
    "huskyPreCommitHash": "ac5e9570c377c5e8d2c8ae8f022951c3ffb2e32eacbf26b45018cc5d946d4f50"
  }
}
```

O campo legado `huskyPreCommitHash` no nível superior também é suportado para compatibilidade retroativa.

## Implementação

Implementado em:

- [tools/check-hooks.js](../../../tools/check-hooks.js)
- [tools/setup-bootstrap.js](../../../tools/setup-bootstrap.js)
- [package.json](../../../package.json)

O `setup-bootstrap.js` instala o hook do husky e registra o hash automaticamente no primeiro bootstrap. O `check-hooks.js` recalcula o hash e o compara com o valor configurado.

## Uso

Execute a verificação manualmente:

```bash
npm run defence:check-hooks
```

Ela também é executada automaticamente pelo hook pre-commit e no CI.

## Atualizando o Hook

Quando o hook for legitimamente alterado:

1. Edite `.husky/pre-commit`.
2. Execute `node tools/setup-bootstrap.js` ou calcule o novo SHA-256 e atualize `defences.huskyPreCommitHash` no `package.json`.
3. Faça commit dos dois arquivos juntos.
