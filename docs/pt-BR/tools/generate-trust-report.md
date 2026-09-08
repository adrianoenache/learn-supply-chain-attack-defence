# generate-trust-report

`generate-trust-report.js` agrega sinais existentes de cadeia de suprimentos em uma pontuação de confiança de 0 a 100 para cada dependência e emite um dashboard legível.

## O que faz

- Lê as dependências do `package-lock.json`.
- Pontua cada pacote em idade, cadência de release, downloads, mantenedores, provenance, risco de typosquatting, risco de lifecycle e licença.
- Emite relatórios em tabela, JSON ou Markdown.
- Pode falhar quando `--fail` é usado e um pacote está abaixo da pontuação mínima configurada.

Implementado em [tools/generate-trust-report.js](../../../tools/generate-trust-report.js). O motor de pontuação está em [tools/lib/trust-engine.js](../../../tools/lib/trust-engine.js).

## Configuração

Pesos e limites são configurados no `package.json` sob `trustReport`:

```json
{
  "trustReport": {
    "minScore": 60,
    "failOnMinScore": false,
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
}
```

## Uso

```bash
# Relatório em Markdown
npm run defence:trust-report

# Saída JSON
npm run defence:trust-report -- --format=json

# Falhar se algum pacote estiver abaixo de minScore
npm run defence:trust-report -- --fail

# Pacote único
npm run defence:trust-report -- --pkg=lodash@4.17.21
```

## Exemplo de saída

```text
Pacote             Pontuação  Idade  Provenance  Lifecycle
lodash@4.17.21     92         ✓      ✓           baixo
sharp@0.33.5       71         ✓      ✗           alto
```

## Camada de defesa relacionada

- [Pontuação de confiança](../trust-scoring.md)
- Agrega sinais das Camadas 1 a 12.
