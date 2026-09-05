# Ajuste de Performance

Este repositório usa configurações de cache de registro, timeouts explícitos e retries para manter as instalações rápidas e resilientes. A performance é medida com benchmarks embutidos.

## Cache de registro, timeout e retries

O comportamento de rede é configurado em dois lugares:

- `.npmrc` — configurações do cliente npm como URL do registro, caminho do cache, timeout de fetch e limites de retry.
- `tools/lib/registry-cache.js` — o helper local de cache de registro usado pelas ferramentas.

Juntos, eles reduzem requisições de rede repetidas e evitam que instalações travem quando um registro está lento.

## Executando benchmarks

Benchmark de base:

```bash
npm run defence:perf:baseline
```

Benchmark atual:

```bash
npm run defence:perf
```

## Interpretando os resultados

Compare a execução atual com a baseline. Fique atento a:

- Aumento no tempo de instalação
- Maior contagem de retries
- Mais cache misses

Uma regressão significativa geralmente indica uma mudança de rede, uma nova dependência pesada ou uma configuração incorreta de cache.

## Dicas para grandes árvores de dependências

- Mantenha `node_modules` fixado com um lockfile e instale com `npm ci`.
- Use o cache de registro local ao executar instalações repetidas.
- Execute benchmarks antes e depois de adicionar dependências grandes.
- Consulte [npmrc-hardening.md](npmrc-hardening.md) para configurações de endurecimento que também melhoram a confiabilidade.
