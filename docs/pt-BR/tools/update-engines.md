# update-engines

`update-engines.js` reporta e aplica atualizações de engine Node.js/npm (patch/minor dentro do major atual) e upgrades (novo major LTS), mantendo a compatibilidade com o CI garantida por construção.

## O que faz

- Lê o piso atual em `package.json#engines`.
- Consulta o índice oficial `https://nodejs.org/dist/index.json` — o mesmo que o `actions/setup-node` usa para baixar versões, portanto uma versão presente ali está, por definição, disponível no CI.
- Reporta o update mais recente dentro do major e o upgrade LTS mais recente, cada um com a **versão do npm bundled daquele release do Node** (política do projeto: o npm sempre acompanha a versão bundled, nunca o `npm@latest`).
- Aplica o alvo de forma cirúrgica: edita apenas as linhas de engines do `package.json`, a entrada **raiz** do `package-lock.json` e o `.nvmrc`, preservando toda a demais formatação.
- Recusa alvos ausentes do índice dist (o CI falharia) e recusa downgrades.

### Entradas malformadas do dist index

O índice oficial carrega permanentemente entradas históricas malformadas (ex.: `v0.6.x` de 2011–2018 com npm bundled do tipo `1.1.0-alpha-6`) e pode publicar entradas novas inválidas (observado ao vivo: `v27.0.0-alpha.0.0.0` em 2026-11-05). A ferramenta lida assim:

- **Todo modo** pula entradas inválidas com um warning `⚠ WARN` em stderr (suprimido por `--silent`); o relatório `--format json` lista-as no campo `skipped`.
- **Modos de escrita** (`--update`/`--upgrade`/`--to`) falham em modo fail-closed apenas quando uma entrada pulada **poderia afetar a decisão de alvo** — uma versão `vX.Y.Z` bem-formada com major maior ou igual ao atual. Entradas que jamais seriam um alvo (versão malformada ou major antigo) só geram warning.
- Apenas versões semver estáveis estritas (`X.Y.Z`) podem virar candidatas a engine — pre-releases nunca entram no `package.json`.

Implementado em [tools/update-engines.js](../../../tools/update-engines.js).

## Uso

```bash
npm run defence:update-engines           # apenas relatório
npm run defence:update-engines:update    # aplica o update mais recente no major atual
npm run defence:update-engines:upgrade   # aplica o major LTS mais recente
node ./tools/update-engines.js --to 26.13.0 --dry-run
```

Flags: `--update`, `--upgrade`, `--to <versão>`, `--dry-run`, `--silent`, `--format json`.

## Exemplo de saída

```text
Node.js engine report
  current pin:           24.22.2 (npm 11.19.1)
  update (v24 line):      24.22.2 (npm 11.19.1) — up to date
  upgrade (latest LTS):  26.13.0 (npm 11.20.0, Lithium) — AVAILABLE

Apply with: --update (in-major), --upgrade (latest LTS), or --to <version>.

── Summary ───────────────────────────────────────────
  ✓ OK   1 passed
  ⚠ WARN 1 warned
  Next: npm run defence:update-engines:update (in-major) or :upgrade (latest LTS)
```

O único item `passed` é o pin atual verificado contra o dist index oficial; `warned` conta os alvos de update/upgrade disponíveis mais as entradas malformadas puladas.

## Depois de aplicar

O processo em execução ainda usa o runtime antigo. Troque de versão e revalide antes de commitar:

```bash
nvm install <versão> && nvm use
npm test && npm run lint && npm run defence:check-md-links
```

Commite `package.json`, `package-lock.json` e `.nvmrc` juntos — o CI deriva a versão do Node do `package.json` em tempo de execução.

## Configuração

Overrides opcionais no `package.json` sob `updateEngines` (URL do índice dist, timeouts, política de retry). Os defaults raramente precisam de ajuste.

## Camada de defesa relacionada

- Mantém o runtime protegido contra CVEs publicados — ver o release de segurança do Node.js de 2026-10-21 que motivou esta ferramenta.
- Complementa o [check-engines](check-engines.md), que valida o runtime local contra o piso que esta ferramenta mantém.
