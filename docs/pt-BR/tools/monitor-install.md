# monitor-install

`monitor-install.js` executa qualquer comando `npm install` ou `npm ci` sob monitoramento de processos, registrando cada subprocesso gerado durante a instalação.

## O que faz

- Valida se o comando encapsulado é um dos comandos npm permitidos (`install`, `i`, `ci`, `add`, `rebuild`).
- Intercepta `spawn`, `spawnSync`, `exec` e `execSync` para observar subprocessos.
- Classifica cada subprocesso por risco.
- Grava um relatório em Markdown ou JSON.

Implementado em [tools/monitor-install.js](../../../tools/monitor-install.js).

## Uso

```bash
# Monitorar npm ci
npm run defence:install-monitored -- npm ci

# Monitorar npm install
npm run defence:install-monitored -- npm install

# Relatório JSON
npm run defence:install-monitored -- npm ci -- --format=json

# Falhar se qualquer script de lifecycle for detectado
npm run defence:install-monitored -- npm ci -- --fail-on-lifecycle
```

## Exemplo de saída

```text
Monitored npm ci
Subprocessos: 12
Alto risco: 1 (compilação nativa)
Relatório gravado em lifecycle-monitor-report.md
```

## Camada de defesa relacionada

- [Monitoramento de processos de lifecycle](../lifecycle-monitoring.md)
- [Camada de Defesa 3 — Auditoria de vulnerabilidades](../security/defense-layer-3-vulnerabilities.md)
