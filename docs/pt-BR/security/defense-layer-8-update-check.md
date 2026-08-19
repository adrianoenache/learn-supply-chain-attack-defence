# Camada de Defesa 8 — Verificação de Atualizações Disponíveis

Depois que as dependências são instaladas, elas vão ficando desatualizadas ao longo do tempo. A verificação de atualizações disponíveis avisa os desenvolvedores quando novas versões existem, classifica essas versões por segurança e aponta para as notas de release — mas **nunca instala nada automaticamente**.

Esta camada é intencionalmente somente leitura. Ela transforma o hook de pré-commit em um lembrete gentil que ajuda o projeto a se manter atualizado sem o risco de upgrades desatendidos.

## O que ela faz

Quando você executa `npm run defence:update-check` (ou faz commit, o que dispara o hook de pré-commit):

1. **Verificação de sincronia local**: verifica se `node_modules` está em sincronia com `package-lock.json`.
2. **Scan de desatualizados**: executa `npm outdated --json` para descobrir atualizações disponíveis.
3. **Consulta de idade no registry**: consulta o registry do npm pela data de publicação de cada versão `latest`.
4. **Classificação**:
   - **Elegível** — a nova versão tem pelo menos `minAgeDays` de idade, então já teve tempo de ser revisada pela comunidade.
   - **Quarentena** — a nova versão é muito recente, ou a consulta ao registry falhou. Essas atualizações são mostradas apenas para fins de conscientização, ainda não sendo recomendadas.
5. **Lembrete**: imprime um aviso apenas se existirem atualizações e o intervalo de lembrete configurado já tiver passado.

Se as dependências locais estiverem desatualizadas (por exemplo, após fazer pull das alterações de um colega), o script recomenda executar `npm ci` primeiro. Isso evita que você avalie atualizações sobre uma árvore instalada desatualizada.

## Configuração

O comportamento é controlado pelo bloco `updateCheck` no `package.json`:

```json
"updateCheck": {
  "minAgeDays": 7,
  "remindEveryDays": 1,
  "alwaysRemind": false,
  "includeTransitive": false,
  "registryTimeoutMs": 10000,
  "cacheTtlHours": 24
}
```

| Campo | Padrão | Significado |
| --- | --- | --- |
| `minAgeDays` | `7` | Idade mínima da versão `latest` para ser considerada elegível. Usa `pkgAgeCheck.minAgeDays` ou `.npmrc` `min-release-age` como fallback. |
| `remindEveryDays` | `1` | Quando `alwaysRemind` é `false`, define de quanto em quanto tempo o aviso é exibido. |
| `alwaysRemind` | `false` | Se `true`, o aviso aparece sempre que houver atualizações. |
| `includeTransitive` | `false` | Se `true`, também verifica dependências transitivas. |
| `registryTimeoutMs` | `10000` | Timeout de rede para chamadas ao registry. |
| `cacheTtlHours` | `24` | Tempo de vida do cache local de resultados do scan. |

## Uso

```bash
# Verificação normal (respeita cache e configuração de lembrete)
npm run defence:update-check

# Ignora cache e executa novo scan
npm run defence:update-check:force

# Suprime a saída (útil em CI)
npm run defence:update-check -- --silent
```

## Exemplo de saída

```text
⚠️  Dependency updates available:
   (This script never modifies dependencies automatically.)

   Eligible for update (age >= 7 days):
     @biomejs/biome  2.5.8 → 2.7.1 [minor] (released 18 days ago)
       npm:     https://www.npmjs.com/package/@biomejs/biome/v/2.7.1
       release: https://github.com/biomejs/biome/releases/tag/cli%40v2.7.1

   In quarantine (too recent or unsafe to update):
     husky  9.1.7 → 9.2.0 [minor] (released 2 days ago)
       npm:     https://www.npmjs.com/package/husky/v/9.2.0
       release: https://github.com/typicode/husky/releases/tag/v9.2.0

   Run the command below to review and apply updates safely:
     npm run defence:update
```

Os links de release são fornecidos com o melhor esforço possível: eles são inferidos a partir do campo `repository.url` no documento do registry e dos padrões de tag mais comuns do GitHub. A tag exata pode ser diferente em monorepos ou em projetos que não usam a convenção `vX.Y.Z`.

## Por que somente leitura?

- **Fail-safe**: um bug na verificação não pode fazer downgrade ou upgrade silencioso de dependências.
- **Controle do desenvolvedor**: atualizações ainda exigem revisão e commit explícitos.
- **Hook rápido**: a etapa de pré-commit apenas lê dados; nunca compila ou instala pacotes.

## Implementação

Implementado em:

- [tools/check-updates.js](../../../tools/check-updates.js)
- [tools/check-updates.test.js](../../../tools/check-updates.test.js)

O estado local é armazenado em `.defence-update-check.json`, que é ignorado pelo git para que cada desenvolvedor mantenha seu próprio estado de lembrete.

## Integração com outras camadas

- Executa dentro do hook de pré-commit (Camada 5) via `npm run defence:pre-commit`.
- Respeita o mesmo valor de `minAgeDays` / `min-release-age` usado pela verificação de idade (Camada 1) e pelo `.npmrc` (Camada 6).
- Não substitui o `defence:update`; apenas recomenda executá-lo quando apropriado.
