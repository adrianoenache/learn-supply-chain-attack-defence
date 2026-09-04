# Dashboard de Trust Score

O dashboard de trust score agrega sinais de risco da cadeia de suprimentos que o projeto já coleta em uma única pontuação de 0 a 100 por pacote e um resumo do projeto. É uma camada de visibilidade somente leitura e pós-análise: não instala nem modifica nada.

## O que ele mede

| Sinal | Fonte | Direção segura |
|---|---|---|
| Idade de publicação | Registry `time[version]` | Lançamentos mais antigos pontuam mais |
| Cadência de releases | `.defence-update-check-state.json` | Cadência mais lenta pontua mais |
| Downloads semanais | `api.npmjs.org/downloads/point/last-week` | Mais downloads pontuam mais |
| Quantidade de mantenedores | Registry `versions[version].maintainers` | Mais mantenedores pontuam mais |
| Provenance | Endpoint de attestations do npm | Provenance válida pontua mais |
| Typosquatting | Distância de Levenshtein vs. nomes existentes | Sem conflitos pontua mais |
| Risco de lifecycle scripts | Análise estática de lifecycle scripts | Sem padrões arriscados pontua mais |
| Licença | Entradas do `package-lock.json` | Licenças permitidas pontuam mais |

## Rótulos de pontuação

- **trusted** — 70–100
- **review required** — 40–69
- **high risk** — 0–39

## Uso

```bash
# Padrão: relatório Markdown para todas as dependências transitivas
npm run defence:trust-report

# Saída JSON
npm run defence:trust-report -- --format=json

# Pacote único
npm run defence:trust-report -- --pkg=lodash@4.17.21

# Apenas dependências diretas
npm run defence:trust-report -- --direct

# Falha (exit code 1) se algum pacote estiver abaixo do mínimo configurado
npm run defence:trust-report -- --fail

# Arquivo de saída personalizado
npm run defence:trust-report -- --output=reports/trust-report.md
```

## Configuração

Adicione um bloco `trustReport` ao `package.json`:

```json
"trustReport": {
  "enabled": true,
  "failOnMinScore": false,
  "minScore": 60,
  "concurrency": 10,
  "registryTimeoutMs": 10000,
  "cacheTtlHours": 24,
  "outputFile": "trust-report.md",
  "scoringWeights": {
    "age": 20,
    "cadence": 10,
    "downloads": 15,
    "maintainers": 10,
    "provenance": 15,
    "typosquatting": 10,
    "lifecycleRisk": 15,
    "license": 5
  }
}
```

## Integração com `defence:add`

Quando `trustReport.enabled` é `true`, `npm run defence:add` executa o trust score check após a análise de lifecycle scripts. Defina `trustReport.failOnMinScore` como `true` para bloquear a instalação quando a pontuação estiver abaixo de `trustReport.minScore`.

## Limitações

- A verificação de provenance é apenas estrutural; a verificação criptográfica de assinaturas não é realizada.
- A cadência depende do arquivo opcional `.defence-update-check-state.json`.
- A primeira versão analisa dependências a partir do registry; não busca métricas de saúde de repositórios GitHub.
