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
- Dependências opcionais não são mais omitidas globalmente, permitindo que os pacotes de CLI nativa do Biome sejam instalados. Elas continuam sujeitas às verificações de `min-release-age` e audit.

## Impacto

Mesmo que um desenvolvedor execute um comando npm simples por engano, o `.npmrc` reduz a superfície de dano ao desabilitar scripts, exigir versões exatas e requerer compatibilidade de engines.
