# Camada de Defesa 6 — `.npmrc` Endurecido

O arquivo `.npmrc` configura o npm com defaults mais seguros. Ele se aplica a todo comando npm executado no projeto.

## Arquivo

[.npmrc](../../../.npmrc)

## Principais Configurações

- `audit=true` — sempre executar audit após instalação.
- `fund=false` — ocultar mensagens de funding para manter a saída focada.
- `package-lock=true` — gerar lock file.
- `save-exact=true` — salvar versões exatas em vez de ranges frouxos.
- `engine-strict=true` — exigir os requisitos de engine Node/npm.
- `min-release-age=7` — exigir que pacotes tenham pelo menos 7 dias quando suportado.
- `ignore-scripts=true` — não executar scripts de lifecycle durante a instalação, reduzindo o risco de malware no momento da instalação.
- `fetch-retries=3`, `fetch-retry-mintimeout=10000`, `fetch-retry-maxtimeout=60000`, `fetch-timeout=300000` — repetir requisições com falha ao registry com backoff exponencial limitado, reduzindo flakiness do CI causada por timeouts transitórios do `npm audit`.
- `maxsockets=10` — limitar conexões simultâneas com o registry para tornar o comportamento de rede mais previsível em runners compartilhados de CI.
- `strict-ssl=true` — sempre verificar certificados TLS, prevenindo ataques de downgrade / MitM.
- Dependências opcionais não são mais omitidas globalmente, permitindo que os pacotes de CLI nativa do Biome sejam instalados. Elas continuam sujeitas às verificações de `min-release-age` e audit.

## Impacto

Mesmo que um desenvolvedor execute um comando npm simples por engano, o `.npmrc` reduz a superfície de dano ao desabilitar scripts, exigir versões exatas e requerer compatibilidade de engines.
