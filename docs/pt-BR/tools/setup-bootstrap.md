# setup-bootstrap

`setup-bootstrap.js` realiza uma primeira instalação controlada quando o `package-lock.json` está ausente. É útil para clones novos ou projetos que ainda não fixaram dependências.

## O que faz

- Verifica compatibilidade das versões do Node.js e npm.
- Confirma que não existe `package-lock.json`.
- Executa `npm install --ignore-scripts --save-exact` (configurações endurecidas, sem lifecycle scripts) sob o monitor de processos.
- Executa a verificação de idade, `npm audit signatures` e `npm audit --audit-level=high`.
- Imprime o caminho do relatório de monitoramento e lembra o contribuidor de revisar o lockfile gerado antes de commitar.

Implementado em [tools/setup-bootstrap.js](../../../tools/setup-bootstrap.js).

## Uso

```bash
npm run defence:bootstrap
```

## Exemplo de saída

Saída real abreviada (a instalação controlada roda com monitoramento, seguida dos gates de idade/assinatura/auditoria; a ferramenta imprime em inglês):

```text
No package-lock.json found. Running controlled first install...
This generates a lock file without executing lifecycle scripts.

First install: npm install --ignore-scripts --save-exact
...
  ✓ OK   recorded pre-commit hook hash: 3b8b…
  ✓ OK   pre-commit hook integrity verified
  ✓ OK   bootstrap complete

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
  Next: review package.json and package-lock.json, then commit both files
```

## Camada de defesa relacionada

- Parte do fluxo de [configuração segura](../setup.md).
