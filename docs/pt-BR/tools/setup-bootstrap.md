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

```text
Nenhum package-lock.json encontrado. Executando primeira instalação controlada.
✅ Instalação concluída.
Revise o package-lock.json e faça commit dele antes de prosseguir.
```

## Camada de defesa relacionada

- Parte do fluxo de [configuração segura](../setup.md).
