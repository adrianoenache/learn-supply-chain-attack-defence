# check-npmrc

`check-npmrc.js` valida a superfície de configuração do npm (chaves do `.npmrc` e arquivos de extensão executados em install-time) para que drift de configuração não enfraqueça silenciosamente — nem finja fortalecer — as defesas de cadeia de suprimentos.

## O que faz

- Rejeita **chaves desconhecidas**: npm ≥ 11.2 apenas avisa sobre elas ("Unknown project config") e o npm v12 pode falhar de forma fatal (`strict-npmrc`). Uma chave com typo hoje é uma instalação quebrada — ou uma falsa sensação de segurança — amanhã.
- Reconhece uma **allow-list lookahead** explícita: chaves mantidas intencionalmente para versões futuras do npm, cada uma com justificativa documentada (atualmente `npm-audit-fix-level` e `send-metrics`).
- Rejeita **valores defensivos enfraquecidos**: `ignore-scripts=false`, `strict-ssl=false`, `engine-strict=false`, `dangerously-allow-all-scripts=true`.
- Rejeita o **mecanismo de extensão do npm v12**: a chave `extension-file` e os arquivos auto-descobertos `.npm-extension.mjs`/`.npm-extension.cjs` executam código root-owned durante o install, invisíveis para detectores de lifecycle scripts. `ignore-scripts=true` implica `ignore-extension`; esta checagem torna a proteção explícita em vez de implícita.

Implementado em [tools/check-npmrc.js](../../../tools/check-npmrc.js). Roda no pre-commit e no job `defence-gates` do CI.

## Uso

```bash
npm run defence:check-npmrc                    # relatório legível
node ./tools/check-npmrc.js --quiet            # apenas exit code + problemas (--silent permanece como alias)
node ./tools/check-npmrc.js --format json      # relatório legível por máquina
```

## Exemplo de saída

```text
npm configuration surface: 17 key(s) checked, 2 lookahead (documented), 0 problem(s).
  ○ SKIP npm-audit-fix-level — Restricts npm audit fix to high/critical fixes once npm supports it...
  ○ SKIP send-metrics — Explicit telemetry opt-out kept for future npm releases...

── Summary ───────────────────────────────────────────
  ✓ OK   15 passed
  ○ SKIP 2 skipped
```

## Códigos de saída

- `0` — superfície de configuração válida.
- `1` — chave desconhecida/insegura, arquivo de extensão proibido ou `.npmrc` ausente.

## Adicionando uma nova chave

Ao adotar uma nova chave documentada do npm, adicione-a a `KNOWN_KEYS` em [tools/check-npmrc.js](../../../tools/check-npmrc.js). Ao manter intencionalmente uma chave ainda não reconhecida, registre-a em `LOOKAHEAD_KEYS` com justificativa e documente no [guia de hardening do `.npmrc`](../npmrc-hardening.md).

## Camada de defesa relacionada

- [Camada de Defesa 6 — configuração .npmrc](../security/defense-layer-6-npmrc-config.md)
