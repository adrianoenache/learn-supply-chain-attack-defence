# check-updates

`check-updates.js` é um auxiliar de pre-commit somente-leitura que reporta atualizações disponíveis e as classifica como elegíveis para adoção imediata ou ainda em quarentena.

## O que faz

- Lê as dependências atuais do `package.json` e `package-lock.json`.
- Busca as versões mais recentes no registro do npm.
- Dedup solicitações de registro com cache em memória de packument por execução.
- Classifica atualizações como elegíveis (já antigas o suficiente) ou em quarentena (muito recentes).
- Descobre `intermediateEligible`: versões mais novas que `wanted` e no máximo `latest` que já satisfazem o portão de idade, ordenadas de forma crescente — o último elemento é o alvo de atualização recomendado. Pré-releases, chaves de metadados do packument e **versões deprecated** são excluídas.
- Emite relatórios em tabela, JSON ou Markdown.

Implementado em [tools/check-updates.js](../../../tools/check-updates.js).

## Configuração

O comportamento é configurado no `package.json` sob `updateCheck`:

```json
{
  "updateCheck": {
    "minAgeDays": 7,
    "remindEveryDays": 1,
    "alwaysRemind": false,
    "registryTimeoutMs": 10000,
    "cacheTtlHours": 24,
    "maxIntermediateEligible": 10
  }
}
```

## Uso

```bash
# Execução padrão
npm run defence:update-check

# Forçar verificação mesmo se lembrado recentemente
npm run defence:update-check -- --force

# Modo offline
npm run defence:update-check -- --offline

# Saída JSON
npm run defence:update-check -- --format=json

# Modo silencioso (suprime relatórios)
npm run defence:update-check -- --silent
```

> `--silent` suprime relatórios, mas **mensagens de segurança são sempre exibidas**: o
> aviso de dessincronização (recomendando `npm ci`) e os avisos de fallback offline
> continuam aparecendo, porque suprimi-los silenciosamente esconderia riscos reais.

## Exemplo de saída

```text
Pacote       Atual   Mais recente  Status
lodash       4.17.20 4.17.21       elegível
sharp        0.33.4  0.33.5        em quarentena (2 dias)
```

## Camada de defesa relacionada

- [Camada de Defesa 8 — Verificação de disponibilidade de atualização](../security/defense-layer-8-update-check.md)
